import { sameDrawSurface } from "./clean-studies.js";

/**
 * Naturalist plate: a seeded, hierarchical vein graph on the original mesh samples.
 * The graph uses orthographic x/y in world units plus view depth, whose Euclidean
 * distances are invariant under camera rotation. It is a point-cloud surface
 * approximation, not an anatomical simulation or an exact triangle geodesic.
 * No new scene geometry, offscreen canvas, private renderer, or mutable frame data.
 */
const PAPER = Object.freeze([249, 245, 226]);
const MAX_NODES = 10500,
  MAX_PER_OWNER = 1600,
  NEIGHBORS = 8;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const hash = (a, b = 0, c = 0) => {
  let n =
    Math.imul((a | 0) ^ Math.imul(b | 0, 374761393), 668265263) ^
    Math.imul(c | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const freeze = (a) => Object.freeze(a);
const distance = (a, b, scale) =>
  Math.hypot((a.x - b.x) * scale, (a.y - b.y) * scale, a.z - b.z);
const ease = (t) => t * t * (3 - 2 * t);

/** Recover the capture's affine orthographic world transform from its public frame.
 * This only reconstructs the exact linear camera mapping; graph distance needs no
 * fit and remains orthographically invariant even if a synthetic frame lacks it.
 */
export function naturalistWorldTransform(f) {
  const rows = [],
    outputs = [];
  for (const v of [0.02, 0.2, 0.4, 0.6, 0.8, 0.98])
    for (const u of [0.02, 0.2, 0.4, 0.6, 0.8, 0.98]) {
      const x = Math.round(u * (f.w - 1)),
        y = Math.round(v * (f.w - 1)),
        z = f.distance(x, y),
        world = f.worldPosition(x, y);
      if ([z, ...world].every(Number.isFinite)) {
        rows.push([x + 0.5, y + 0.5, z, 1]);
        outputs.push(world);
      }
    }
  const m = Array.from({ length: 4 }, (_, i) =>
    Array.from({ length: 7 }, (_, j) =>
      rows.reduce(
        (sum, r, k) => sum + r[i] * (j < 4 ? r[j] : outputs[k][j - 4]),
        0,
      ),
    ),
  );
  for (let j = 0; j < 4; j++) {
    let pivot = j;
    for (let k = j + 1; k < 4; k++)
      if (Math.abs(m[k][j]) > Math.abs(m[pivot][j])) pivot = k;
    [m[j], m[pivot]] = [m[pivot], m[j]];
    const divisor = m[j][j];
    if (Math.abs(divisor) < 1e-10) return null;
    for (let c = j; c < 7; c++) m[j][c] /= divisor;
    for (let k = 0; k < 4; k++)
      if (k !== j) {
        const a = m[k][j];
        for (let c = j; c < 7; c++) m[k][c] -= a * m[j][c];
      }
  }
  const matrix = freeze(m.map((row) => freeze(row.slice(4))));
  return freeze({
    matrix,
    point: (x, y, z) =>
      [0, 1, 2].map(
        (c) =>
          matrix[0][c] * x + matrix[1][c] * y + matrix[2][c] * z + matrix[3][c],
      ),
  });
}
export function naturalistStrength(intensity) {
  return clamp(Number.isFinite(intensity) ? intensity : 0.6, 0.15, 0.95);
}

/** Stable thinning by original triangle-sample index; hidden anchors stay in graph. */
export function buildNaturalistGraph(f) {
  const samples = f.surfacePoints(),
    groups = new Map(),
    scale = f.pixelWorldSize,
    worldTransform = naturalistWorldTransform(f);
  if (!(scale > 0 && Number.isFinite(scale)))
    throw Error("Naturalist plate needs finite pixelWorldSize");
  for (let k = 0; k + 5 < samples.length; k += 6) {
    const [x, y, z, id, index, facing] = samples.subarray
      ? samples.subarray(k, k + 6)
      : samples.slice(k, k + 6);
    if (id <= 1 || ![x, y, z, id, index, facing].every(Number.isFinite))
      continue;
    if (!groups.has(id)) groups.set(id, []);
    groups
      .get(id)
      .push({
        x,
        y,
        z,
        id,
        index,
        facing,
        world: worldTransform ? freeze(worldTransform.point(x, y, z)) : null,
        rank: hash(index, id, f.seed),
      });
  }
  const totalWeight = [...groups.values()].reduce(
    (n, g) => n + Math.sqrt(g.length),
    0,
  );
  const owners = [],
    nodes = [],
    treeEdges = [],
    loopEdges = [];
  for (const [id, all] of groups) {
    const count = Math.min(
      all.length,
      MAX_PER_OWNER,
      Math.max(
        14,
        Math.floor((MAX_NODES * Math.sqrt(all.length)) / totalWeight),
      ),
    );
    all.sort((a, b) => a.rank - b.rank || a.index - b.index);
    const local = all.slice(0, count).sort((a, b) => a.index - b.index),
      offset = nodes.length,
      n = local.length;
    const adjacency = Array.from({ length: n }, () => []),
      nearest = [];
    for (let i = 0; i < n; i++) {
      nearest.length = 0;
      for (let j = 0; j < n; j++)
        if (j !== i) {
          const d = distance(local[i], local[j], scale);
          if (!(d > 1e-7)) continue;
          let at = nearest.length;
          while (at > 0 && nearest[at - 1].d > d) at--;
          if (at < NEIGHBORS) {
            nearest.splice(at, 0, { j, d });
            if (nearest.length > NEIGHBORS) nearest.pop();
          }
        }
      // Reject unusually long local shortcuts; this is still a sampled surface graph.
      const radius = (nearest[Math.min(2, nearest.length - 1)]?.d || 0) * 2.3;
      for (const edge of nearest) if (edge.d <= radius) adjacency[i].push(edge);
    }
    for (let i = 0; i < n; i++)
      for (const e of [...adjacency[i]]) {
        if (!adjacency[e.j].some((r) => r.j === i))
          adjacency[e.j].push({ j: i, d: e.d });
      }
    const rootOrder = local
      .map((v, i) => ({
        i,
        rank: v.world
          ? v.world[1] + hash(v.index, id, f.seed + 571) * 0.08
          : hash(v.index, id, f.seed + 571),
      }))
      .sort((a, b) => a.rank - b.rank);
    const dist = new Float64Array(n).fill(Infinity),
      parent = new Int32Array(n).fill(-1),
      order = [],
      visited = new Uint8Array(n);
    let rootAt = 0,
      component = 0;
    while (order.length < n) {
      let best = -1,
        cost = Infinity;
      for (let i = 0; i < n; i++)
        if (!visited[i] && dist[i] < cost) {
          best = i;
          cost = dist[i];
        }
      if (best < 0) {
        while (visited[rootOrder[rootAt].i]) rootAt++;
        best = rootOrder[rootAt++].i;
        dist[best] = 0;
        component++;
      }
      visited[best] = 1;
      order.push(best);
      for (const { j, d } of adjacency[best])
        if (!visited[j]) {
          const proposal =
            dist[best] +
            d * (1 + 0.24 * hash(local[best].index, local[j].index, f.seed));
          if (proposal < dist[j]) {
            dist[j] = proposal;
            parent[j] = best;
          }
        }
    }
    const mass = new Float64Array(n).fill(1),
      children = Array.from({ length: n }, () => []),
      heavy = new Int32Array(n).fill(-1);
    for (let k = order.length - 1; k >= 0; k--) {
      const i = order[k],
        p = parent[i];
      if (p >= 0) {
        mass[p] += mass[i];
        children[p].push(i);
        if (heavy[p] < 0 || mass[i] > mass[heavy[p]]) heavy[p] = i;
      }
    }
    for (let i = 0; i < n; i++) {
      const source = local[i],
        p = parent[i];
      nodes.push(
        freeze({
          ...source,
          node: offset + i,
          parent: p < 0 ? -1 : offset + p,
          mass: mass[i],
          ownerCount: n,
          rootDistance: dist[i],
          heavy: heavy[i] < 0 ? -1 : offset + heavy[i],
        }),
      );
      if (p >= 0)
        treeEdges.push(
          freeze({
            a: offset + p,
            b: offset + i,
            id,
            mass: mass[i],
            fraction: mass[i] / n,
            key: hash(source.index, id, f.seed + 118),
            length: distance(local[p], source, scale),
          }),
        );
      for (const { j, d } of adjacency[i])
        if (
          j > i &&
          parent[i] !== j &&
          parent[j] !== i &&
          Math.abs(dist[i] - dist[j]) < d * 0.64 &&
          hash(source.index, local[j].index, f.seed + 133) < 0.38
        ) {
          loopEdges.push(
            freeze({
              a: offset + i,
              b: offset + j,
              id,
              mass: Math.min(mass[i], mass[j]),
              fraction: Math.min(mass[i], mass[j]) / n,
              key: hash(source.index, local[j].index, f.seed + 199),
              length: d,
            }),
          );
        }
    }
    owners.push(
      freeze({ id, count: n, sourceCount: all.length, components: component }),
    );
  }
  return freeze({
    nodes: freeze(nodes),
    treeEdges: freeze(treeEdges),
    loopEdges: freeze(loopEdges),
    owners: freeze(owners),
    scale,
    seed: f.seed,
  });
}

/** Continuous world-coordinate pigment variation; neither screen grain nor mesh geometry. */
export function naturalistWashAt(world, id, seed) {
  const phase = hash(id, seed, 17) * Math.PI * 2,
    [x, y, z] = world;
  return clamp(
    0.48 +
      0.23 * Math.sin(x * 3.2 + y * 2.1 - z * 1.3 + phase) +
      0.18 * Math.sin(z * 6.1 - y * 1.4 + phase * 0.7),
  );
}

/** Return only short visible same-owner intervals of a sampled surface chord. */
export function naturalistVisibleIntervals(
  f,
  a,
  b,
  tolerance = 0.035,
  footprint = 0,
) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    cuts = [0, 1],
    out = [];
  if (Math.hypot(dx, dy) < 1e-7) return freeze(out);
  const surfaceIntervals = f.materialVisibility
    ? f.surfaceVisibility().intervals([a.x,a.y,a.z], [b.x,b.y,b.z], a.id, tolerance)
    : null;
  if (surfaceIntervals) {
    if (!surfaceIntervals.length) return freeze(out);
    for (const interval of surfaceIntervals) cuts.push(...interval);
  }
  // Exact pixel-cell intervals prevent thin occluders being skipped by sampling.
  for (const [origin, delta] of [
    [a.x, dx],
    [a.y, dy],
  ])
    if (Math.abs(delta) > 1e-9) {
      const lo = Math.min(origin, origin + delta),
        hi = Math.max(origin, origin + delta);
      for (let edge = Math.floor(lo) + 1; edge < hi; edge++) {
        const t = (edge - origin) / delta;
        if (t > 1e-9 && t < 1 - 1e-9) cuts.push(t);
      }
    }
  cuts.sort((x, y) => x - y);
  let run = null;
  for (let k = 0; k + 1 < cuts.length; k++) {
    const u = cuts[k],
      v = cuts[k + 1];
    if (v - u < 1e-9) continue;
    const middle = (u + v) * 0.5,
      x = a.x + dx * middle,
      y = a.y + dy * middle,
      sx = Math.floor(x),
      sy = Math.floor(y);
    const z = f.distance(sx, sy),
      zu = mix(a.z, b.z, u),
      zv = mix(a.z, b.z, v);
    let visible =
      x >= 0 &&
      y >= 0 &&
      x < f.w &&
      y < f.w &&
      f.ID(sx, sy) === a.id &&
      (!surfaceIntervals || surfaceIntervals.some(([lo,hi]) => middle >= lo && middle <= hi)) &&
      Math.max(Math.abs(z - zu), Math.abs(z - zv)) <= tolerance;
    // Conservatively erode by whole pixel cells so round caps and stroke sides
    // cannot bridge an occluder even when the centerline reaches its boundary.
    const radius = Math.ceil(footprint);
    if (visible && radius > 0) {
      const nx = f.N ? f.N(sx, sy, 0) * 2 - 1 : 0,
        ny = f.N ? f.N(sx, sy, 1) * 2 - 1 : 0,
        nz = f.N ? f.N(sx, sy, 2) * 2 - 1 : 1;
      for (let oy = -radius; oy <= radius && visible; oy++)
        for (let ox = -radius; ox <= radius; ox++) {
          const xx = sx + ox,
            yy = sy + oy,
            expected =
              Math.abs(nz) > 0.1
                ? ((nx * ox - ny * oy) * (f.pixelWorldSize || 1)) / nz
                : 0;
          if (
            xx < 0 ||
            yy < 0 ||
            xx >= f.w ||
            yy >= f.w ||
            f.ID(xx, yy) !== a.id ||
            Math.abs(f.distance(xx, yy) - z - expected) > tolerance
          ) {
            visible = false;
            break;
          }
        }
    }
    if (visible) {
      if (!run) run = [a.x + dx * u, a.y + dy * u, a.x + dx * v, a.y + dy * v];
      else {
        run[2] = a.x + dx * v;
        run[3] = a.y + dy * v;
      }
    } else if (run) {
      out.push(freeze(run));
      run = null;
    }
  }
  if (run) out.push(freeze(run));
  return freeze(out);
}

export function prepareNaturalistPlate(f) {
  const compute = () => {
    const graph = buildNaturalistGraph(f),
      veins = [];
    for (const [edges, reticulation] of [
      [graph.treeEdges, false],
      [graph.loopEdges, true],
    ]) {
      for (const edge of edges) {
        const a = graph.nodes[edge.a],
          b = graph.nodes[edge.b];
        if (a.facing < -0.08 && b.facing < -0.08) continue;
        const tolerance = Math.min(0.07, 0.017 + edge.length * 0.11);
        const before = a.parent >= 0 ? graph.nodes[a.parent] : a,
          after = b.heavy >= 0 ? graph.nodes[b.heavy] : b;
        const handles = reticulation
          ? [a, b]
          : [
              {
                x: a.x + (b.x - before.x) * 0.19,
                y: a.y + (b.y - before.y) * 0.19,
                z: a.z + (b.z - before.z) * 0.19,
              },
              {
                x: b.x - (after.x - a.x) * 0.19,
                y: b.y - (after.y - a.y) * 0.19,
                z: b.z - (after.z - a.z) * 0.19,
              },
            ];
        const count = Math.max(
            2,
            Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2.5),
          ),
          intervals = [];
        let previous = a;
        for (let step = 1; step <= count; step++) {
          const t = step / count,
            u = 1 - t,
            next = { id: edge.id };
          for (const key of ["x", "y", "z"])
            next[key] =
              u * u * u * a[key] +
              3 * u * u * t * handles[0][key] +
              3 * u * t * t * handles[1][key] +
              t * t * t * b[key];
          intervals.push(
            ...naturalistVisibleIntervals(
              f,
              previous,
              next,
              tolerance,
              (0.775 * f.w) / 720,
            ),
          );
          previous = next;
        }
        freeze(intervals);
        if (!intervals.length) continue;
        const midpoint = intervals[Math.floor(intervals.length / 2)],
          x = (midpoint[0] + midpoint[2]) * 0.5,
          y = (midpoint[1] + midpoint[3]) * 0.5;
        veins.push(
          freeze({
            ...edge,
            reticulation,
            intervals,
            color: freeze(f.B(Math.floor(x), Math.floor(y)).slice(0, 3)),
            shade: f.D(x, y),
          }),
        );
      }
    }
    // Image-local contour extraction never feeds graph construction or seed decisions.
    const contours = [];
    const boundaryConfidence = (x, y, id) => {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) count += f.ID(x + dx, y + dy) === id;
      return count >= 6;
    };
    for (let y = 1; y < f.w - 1; y++)
      for (let x = 1; x < f.w - 1; x++) {
        const id = f.ID(x, y);
        if (id <= 1) continue;
        const right = f.ID(x + 1, y),
          down = f.ID(x, y + 1);
        if (
          right !== id &&
          !sameDrawSurface(f, x, y, x + 1, y) &&
          boundaryConfidence(x, y, id) &&
          boundaryConfidence(x + 1, y, right)
        )
          contours.push(
            freeze({
              id,
              x: x + 1,
              y,
              y2: y + 1,
              x2: x + 1,
              color: freeze(f.B(x, y).slice(0, 3)),
            }),
          );
        if (
          down !== id &&
          !sameDrawSurface(f, x, y, x, y + 1) &&
          boundaryConfidence(x, y, id) &&
          boundaryConfidence(x, y + 1, down)
        )
          contours.push(
            freeze({
              id,
              x,
              y: y + 1,
              x2: x + 1,
              y2: y + 1,
              color: freeze(f.B(x, y).slice(0, 3)),
            }),
          );
        if (f.ID(x - 1, y) <= 1)
          contours.push(
            freeze({
              id,
              x,
              y,
              x2: x,
              y2: y + 1,
              color: freeze(f.B(x, y).slice(0, 3)),
            }),
          );
        if (f.ID(x, y - 1) <= 1)
          contours.push(
            freeze({
              id,
              x,
              y,
              x2: x + 1,
              y2: y,
              color: freeze(f.B(x, y).slice(0, 3)),
            }),
          );
      }
    return freeze({
      graph,
      veins: freeze(veins),
      contours: freeze(contours),
      cacheVersion: 1,
    });
  };
  return f.prepare ? f.prepare("naturalist-plate:v1", compute) : compute();
}

export function naturalistVeinLevel(vein, intensity) {
  const strength = naturalistStrength(intensity),
    detail = (strength - 0.15) / 0.8;
  if (vein.reticulation) return vein.key < 0.12 + detail * 0.88 ? 3 : -1;
  if (vein.fraction >= 0.035 && vein.mass >= 10) return 0;
  if (vein.mass >= 4) return 1;
  if (vein.mass >= 1 && vein.key < 0.18 + detail * 0.82) return 2;
  return -1;
}

export function drawNaturalistPlate(p, f) {
  const strength = naturalistStrength(f.intensity),
    prepared = prepareNaturalistPlate(f);
  p.background(...PAPER);
  p.loadPixels();
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const at = (y * f.w + x) * 4,
        id = f.ID(x, y);
      if (id <= 1) continue;
      const base = f.B(x, y),
        shade = clamp(f.D(x, y)),
        normal = clamp(f.N(x, y, 2) * 2 - 1),
        world = f.worldPosition(x, y);
      const pool = naturalistWashAt(world, id, f.seed);
      // Deliberately restrained pools of transparent local pigment on cream paper.
      const wet =
        clamp(
          0.18 + 0.26 * pool + 0.35 * shade + 0.1 * (1 - normal),
          0.1,
          0.8,
        ) *
        (1 - 0.2 * f.T(x, y));
      for (let c = 0; c < 3; c++) {
        const pigment = clamp(
          base[c] * 0.79 + [8, 12, 2][c] - shade * 12,
          0,
          255,
        );
        p.pixels[at + c] = mix(PAPER[c], pigment, wet);
      }
      p.pixels[at + 3] = 255;
    }
  p.updatePixels();
  p.noFill();
  // The smaller branches are admitted by strength, without moving the graph.
  for (let pass = 3; pass >= 0; pass--)
    for (const vein of prepared.veins) {
      if (naturalistVeinLevel(vein, strength) !== pass) continue;
      const base = vein.color,
        ink = base.map((v, c) => clamp(v * 0.4 + [3, 6, 0][c], 0, 255));
      const width = [1.55, 0.78, 0.4, 0.3][pass] * (f.w / 720);
      const alpha = [224, 182, 146, 108][pass];
      p.stroke(...ink, alpha);
      p.strokeWeight(width);
      for (const line of vein.intervals) p.line(...line);
    }
  p.strokeWeight((0.7 * f.w) / 720);
  for (const edge of prepared.contours) {
    p.stroke(
      ...edge.color.map((v, c) => clamp(v * 0.44 + [17, 24, 13][c], 0, 255)),
      170,
    );
    p.line(edge.x, edge.y, edge.x2, edge.y2);
  }
}
