const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const drivePeriod = (strength) =>
  Math.round(clamp(50 - 36 * strength, 14, 50));
const random = (seed, a, b) => {
  let v =
    Math.imul((a | 0) + 31 * seed, 374761393) ^
    Math.imul((b | 0) + 971, 668265263);
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
};
// Unit-spaced, pinned-rim projected membranes. Each object is independent even
// where silhouettes overlap; display visibility is applied after the solve.
export function membraneGraph(masks, seed = 2401) {
  if (!Number.isSafeInteger(seed)) throw Error("Invalid membrane seed");
  const ordered = masks.slice().sort((a, b) => a.id - b.id),
    nodes = [],
    grids = new Map();
  for (const { id, resolution: n, mask } of ordered) {
    if (
      !Number.isInteger(id) ||
      id < 1 ||
      id > 65535 ||
      !Number.isInteger(n) ||
      n < 2 ||
      n > 128 ||
      mask.length !== n * n ||
      grids.has(id)
    )
      throw Error("Invalid membrane mask");
    const index = new Int32Array(n * n).fill(-1);
    for (let i = 0; i < mask.length; i++)
      if (mask[i]) {
        index[i] = nodes.length;
        nodes.push([id, n, i % n, Math.floor(i / n)]);
      }
    grids.set(id, { resolution: n, index });
  }
  if (nodes.length > 16384) throw Error("Membrane cell budget exceeded");
  const count = nodes.length,
    adj = new Int32Array(count * 4).fill(-1),
    ids = new Uint16Array(count),
    x = new Uint16Array(count),
    y = new Uint16Array(count),
    resolution = new Uint16Array(count);
  for (let i = 0; i < count; i++) {
    const [id, n, xx, yy] = nodes[i],
      index = grids.get(id).index;
    ids[i] = id;
    x[i] = xx;
    y[i] = yy;
    resolution[i] = n;
    const cells = [
      xx > 0 ? yy * n + xx - 1 : -1,
      xx < n - 1 ? yy * n + xx + 1 : -1,
      yy > 0 ? (yy - 1) * n + xx : -1,
      yy < n - 1 ? (yy + 1) * n + xx : -1,
    ];
    for (let k = 0; k < 4; k++)
      if (cells[k] >= 0) adj[i * 4 + k] = index[cells[k]];
  }
  const labels = new Int32Array(count).fill(-1),
    queue = new Int32Array(count),
    components = [],
    componentKeys = [],
    forcing = new Float64Array(count);
  for (let first = 0; first < count; first++)
    if (labels[first] < 0) {
      const component = components.length,
        members = [];
      let head = 0,
        tail = 1,
        minX = x[first],
        maxX = x[first],
        minY = y[first],
        maxY = y[first];
      queue[0] = first;
      labels[first] = component;
      while (head < tail) {
        const i = queue[head++];
        members.push(i);
        minX = Math.min(minX, x[i]);
        maxX = Math.max(maxX, x[i]);
        minY = Math.min(minY, y[i]);
        maxY = Math.max(maxY, y[i]);
        for (let k = 0; k < 4; k++) {
          const j = adj[i * 4 + k];
          if (j >= 0 && labels[j] < 0) {
            labels[j] = component;
            queue[tail++] = j;
          }
        }
      }
      // Component-relative seed avoids dependencies on unrelated object insertion.
      let shapeKey = 0;
      for (const i of members)
        shapeKey ^= Math.imul(
          (x[i] - minX + 1) * 257 + y[i] - minY + 1,
          2654435761,
        );
      const tx =
          minX +
          (maxX - minX) * (0.28 + 0.4 * random(seed, ids[first], shapeKey * 2)),
        ty =
          minY +
          (maxY - minY) *
            (0.28 + 0.4 * random(seed, ids[first], shapeKey * 2 + 1));
      let center = first,
        best = Infinity;
      for (const i of members) {
        const d = (x[i] - tx) ** 2 + (y[i] - ty) ** 2;
        if (d < best) {
          best = d;
          center = i;
        }
      }
      for (const i of members)
        forcing[i] = Math.exp(
          -((x[i] - x[center]) ** 2 + (y[i] - y[center]) ** 2) /
            (2 * 1.35 ** 2),
        );
      components.push(Int32Array.from(members));
      componentKeys.push(shapeKey);
    }
  return {
    count,
    adj,
    ids,
    x,
    y,
    resolution,
    grids,
    labels,
    components,
    componentKeys,
    forcing,
  };
}
export function membraneResponse(
  graph,
  strength,
  {
    settle = 2048,
    cycles = 4,
    c2 = 0.2025,
    damping = 0.04,
    forceScale = 0.025,
    forcing = graph.forcing,
  } = {},
) {
  if (
    !Number.isFinite(strength) ||
    c2 <= 0 ||
    c2 >= 0.5 ||
    damping <= 0 ||
    !Number.isFinite(c2 + damping + forceScale) ||
    !Number.isInteger(settle) ||
    settle < 0 ||
    !Number.isInteger(cycles) ||
    cycles < 1 ||
    forcing.length !== graph.count ||
    Array.from(forcing).some((v) => !Number.isFinite(v))
  )
    throw Error("Invalid wave integration settings");
  const n = graph.count,
    period = drivePeriod(strength),
    cos = new Float64Array(period),
    sin = new Float64Array(period),
    real = new Float64Array(n),
    imaginary = new Float64Array(n),
    energy = new Float64Array(n),
    samples = cycles * period;
  for (let i = 0; i < period; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / period);
    sin[i] = Math.sin((2 * Math.PI * i) / period);
  }
  let previous = new Float64Array(n),
    current = new Float64Array(n),
    next = new Float64Array(n);
  const b = damping / 2,
    den = 1 + b;
  for (let step = 0; step < settle + samples; step++) {
    const drive = forceScale * cos[step % period];
    for (let i = 0; i < n; i++) {
      let lap = 4 * current[i];
      for (let k = 0; k < 4; k++) {
        const j = graph.adj[i * 4 + k];
        if (j >= 0) lap -= current[j];
      }
      next[i] =
        (2 * current[i] -
          (1 - b) * previous[i] -
          c2 * lap +
          forcing[i] * drive) /
        den;
    }
    [previous, current, next] = [current, next, previous];
    if (step >= settle) {
      const phase = (step + 1) % period;
      for (let i = 0; i < n; i++) {
        real[i] += (current[i] * cos[phase] * 2) / samples;
        imaginary[i] += (current[i] * sin[phase] * 2) / samples;
      }
    }
  }
  const omega = (2 * Math.PI) / period,
    eigenShift = 4 * Math.sin(omega / 2) ** 2,
    loss = damping * Math.sin(omega);
  let error = 0,
    source = 0;
  for (let i = 0; i < n; i++) {
    energy[i] = (real[i] ** 2 + imaginary[i] ** 2) * 0.5;
    let lr = 4 * real[i],
      li = 4 * imaginary[i];
    for (let k = 0; k < 4; k++) {
      const j = graph.adj[i * 4 + k];
      if (j >= 0) {
        lr -= real[j];
        li -= imaginary[j];
      }
    }
    const rr =
        c2 * lr -
        eigenShift * real[i] +
        loss * imaginary[i] -
        forceScale * forcing[i],
      ri = loss * real[i] - c2 * li + eigenShift * imaginary[i];
    error += rr * rr + ri * ri;
    source += (forceScale * forcing[i]) ** 2;
  }
  let inputPower = 0,
    dissipatedPower = 0;
  for (let i = 0; i < n; i++) {
    inputPower +=
      0.5 * forceScale * forcing[i] * imaginary[i] * Math.sin(omega);
    dissipatedPower += damping * Math.sin(omega) ** 2 * energy[i];
  }
  return {
    energy,
    meanSquareDisplacement: energy,
    real,
    imaginary,
    period,
    steps: settle + samples,
    residual: source ? Math.sqrt(error / source) : Math.sqrt(error),
    inputPower,
    dissipatedPower,
    powerResidual:
      Math.abs(inputPower - dissipatedPower) / (Math.abs(inputPower) || 1),
    c2,
    damping,
  };
}
export function sandMobility(graph, energy, { floor = 0.005 } = {}) {
  if (
    !Number.isFinite(floor) ||
    floor <= 0 ||
    floor > 1 ||
    energy.length !== graph.count ||
    Array.from(energy).some((v) => !Number.isFinite(v) || v < 0)
  )
    throw Error("Invalid mobility input");
  const mobility = new Float64Array(graph.count);
  for (const members of graph.components) {
    const sorted = Array.from(members, (i) => energy[i]).sort((a, b) => a - b),
      p90 =
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
    for (const i of members)
      mobility[i] =
        p90 > 1e-24 ? floor + (1 - floor) * clamp(energy[i] / p90) : 0;
  }
  return mobility;
}
// Departure-rate master equation: Laplacian(D*rho), not Fick's D*grad(rho).
export function transportSand(
  graph,
  mobility,
  { steps = 384, alpha = 0.2, initial } = {},
) {
  if (
    !Number.isInteger(steps) ||
    steps < 0 ||
    alpha < 0 ||
    alpha > 0.25 ||
    !Number.isFinite(alpha) ||
    mobility.length !== graph.count ||
    Array.from(mobility).some((d) => !Number.isFinite(d) || d < 0 || d > 1)
  )
    throw Error("Invalid sand transport settings");
  let density = initial
      ? Float64Array.from(initial)
      : new Float64Array(graph.count).fill(1),
    next = new Float64Array(graph.count);
  if (
    density.length !== graph.count ||
    Array.from(density).some((v) => !Number.isFinite(v) || v < 0)
  )
    throw Error("Invalid initial sand density");
  for (let step = 0; step < steps; step++) {
    next.set(density);
    for (let i = 0; i < graph.count; i++)
      for (let k = 0; k < 4; k++) {
        const j = graph.adj[i * 4 + k];
        if (j <= i) continue;
        const flux =
          alpha * (mobility[j] * density[j] - mobility[i] * density[i]);
        next[i] += flux;
        next[j] -= flux;
      }
    [density, next] = [next, density];
  }
  return density;
}
// Exact stationary distribution of the same conservative departure process.
// Per-component D_i*rho_i is constant. No density is invented.
export function equilibriumSand(graph, mobility, { initial } = {}) {
  const density = initial
    ? Float64Array.from(initial)
    : new Float64Array(graph.count).fill(1);
  if (density.length !== graph.count || mobility.length !== graph.count)
    throw Error("Invalid equilibrium arrays");
  for (const members of graph.components) {
    let mass = 0,
      inverse = 0,
      active = false;
    for (const i of members) {
      if (
        !Number.isFinite(density[i]) ||
        density[i] < 0 ||
        !Number.isFinite(mobility[i]) ||
        mobility[i] < 0 ||
        mobility[i] > 1
      )
        throw Error("Invalid sand equilibrium input");
      mass += density[i];
      active ||= mobility[i] > 0;
    }
    if (!active) continue;
    for (const i of members) {
      if (mobility[i] === 0)
        throw Error("Mixed absorbing mobility requires finite transport");
      inverse += 1 / mobility[i];
    }
    for (const i of members) density[i] = mass / (inverse * mobility[i]);
  }
  return density;
}
export function settleResonantSand(graph, strength, options = {}) {
  const wave = membraneResponse(graph, strength, options),
    mobility = sandMobility(graph, wave.energy, options),
    density = options.equilibrium
      ? equilibriumSand(graph, mobility, options)
      : transportSand(graph, mobility, options);
  return { ...wave, mobility, density };
}
export function sampleMembrane(graph, field, x, y, id, size) {
  const g = graph.grids.get(id);
  if (!g) return 1;
  const n = g.resolution,
    xx = ((x + 0.5) / size) * n - 0.5,
    yy = ((y + 0.5) / size) * n - 0.5,
    ix = Math.floor(xx),
    iy = Math.floor(yy),
    fx = xx - ix,
    fy = yy - iy;
  let out = 0,
    weight = 0,
    nearest = -1,
    distance = Infinity;
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++) {
      if (ix + dx < 0 || ix + dx >= n || iy + dy < 0 || iy + dy >= n) continue;
      const node = g.index[(iy + dy) * n + ix + dx];
      if (node < 0) continue;
      const d = (dx - fx) ** 2 + (dy - fy) ** 2;
      if (d < distance) {
        distance = d;
        nearest = node;
      }
    }
  if (nearest < 0) return 1;
  const component = graph.labels[nearest];
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++) {
      if (ix + dx < 0 || ix + dx >= n || iy + dy < 0 || iy + dy >= n) continue;
      const node = g.index[(iy + dy) * n + ix + dx];
      if (node < 0 || graph.labels[node] !== component) continue;
      const a = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy);
      out += a * field[node];
      weight += a;
    }
  return weight ? out / weight : field[nearest];
}
