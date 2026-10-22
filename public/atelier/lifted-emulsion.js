/* Lifted emulsion: an intentionally stylized, flattened photographic membrane.
 * Source-connected shadow triangles carry image-weighted film quantity. A
 * bounded gather map displaces them; compressed overlaps increase density.
 * Only the extracted image-bearing film is transformed; the source capture and
 * scene geometry stay fixed. No decorative wrinkle strokes, new cast shadows,
 * tone inversions or chemistry are simulated.
 */

export const EMULSION_VERSION = 1;
export const LIMITS = Object.freeze({
  minSize: 32,
  maxSize: 1024,
  maxGridIntervals: 640,
  maxComponents: 32,
  maxVertices: 360000,
  maxTriangles: 120000,
  maxTriangleFootprint: 4096,
  maxRasterPixelVisits: 16000000,
  maxDisplacementFraction: 0.12,
  polygonClipEdges: 4,
});
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hash = (a, b, seed) => {
  let n = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const signedArea = (ax, ay, bx, by, cx, cy) => ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) * 0.5;

function validateFrame(f) {
  if (!Number.isInteger(f.w) || f.w < LIMITS.minSize || f.w > LIMITS.maxSize)
    throw RangeError(`Lifted emulsion supports square frames ${LIMITS.minSize}–${LIMITS.maxSize}px`);
  if (typeof f.L !== "function" || typeof f.rnd !== "function") throw TypeError("makeFrame-compatible luminance and seed required");
}

// Monotone silver-like optical density. The very light fixed scene background
// falls on pale paper; dark source tones remain dark without solarization.
export function photographicDensity(luminance) {
  return 4.15 * Math.max(0, 0.8 - clamp(luminance)) ** 1.12;
}

function componentsFromMask(mask, side, density, step, f) {
  const count = side * side, labels = new Int16Array(count).fill(-1), queue = new Int32Array(count), components = [];
  for (let start = 0; start < count; start++) {
    if (!mask[start] || labels[start] !== -1) continue;
    let head = 0, tail = 1;
    queue[0] = start; labels[start] = -2;
    let sumX = 0, sumY = 0, x0 = side, y0 = side, x1 = 0, y1 = 0, mass = 0;
    while (head < tail) {
      const i = queue[head++], x = i % side, y = (i / side) | 0;
      sumX += x; sumY += y; mass += density[i];
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      const add = (j) => { if (mask[j] && labels[j] === -1) { labels[j] = -2; queue[tail++] = j; } };
      if (x) add(i - 1); if (x + 1 < side) add(i + 1); if (y) add(i - side); if (y + 1 < side) add(i + side);
    }
    // Specks and threads stay attached. The minimum footprint is resolution-invariant.
    if (tail * step * step < 900 * (f.w / 720) ** 2 || components.length === LIMITS.maxComponents) continue;
    const id = components.length, cx = sumX / tail * step, cy = sumY / tail * step;
    let xx = 0, yy = 0, xy = 0;
    for (let j = 0; j < tail; j++) {
      const i = queue[j], x = (i % side) * step - cx, y = ((i / side) | 0) * step - cy;
      xx += x * x; yy += y * y; xy += x * y; labels[i] = id;
    }
    let angle = 0.5 * Math.atan2(2 * xy, xx - yy), ax = Math.cos(angle), ay = Math.sin(angle);
    if (ay < 0) { ax = -ax; ay = -ay; }
    let s0 = Infinity, s1 = -Infinity, t0 = Infinity, t1 = -Infinity;
    for (let j = 0; j < tail; j++) {
      const i = queue[j], x = (i % side) * step - cx, y = ((i / side) | 0) * step - cy;
      const s = x * ax + y * ay, t = -x * ay + y * ax;
      s0 = Math.min(s0, s); s1 = Math.max(s1, s); t0 = Math.min(t0, t); t1 = Math.max(t1, t);
    }
    const width = t1 - t0, length = s1 - s0;
    const anchorCount = 1 + Math.min(2, Math.floor(hash(id, 1001, f.seed) * 3)), anchors = [];
    const pullAngle = Math.atan2(-ax, ay) + (hash(id, 1999, f.seed) - 0.5) * 1.2;
    for (let k = 0; k < anchorCount; k++) {
      const direction = pullAngle + Math.PI + (k - (anchorCount - 1) / 2) * (1.9 + hash(id, 999, f.seed) * 0.7);
      let best = -Infinity, point = [cx, cy];
      for (let j = 0; j < tail; j++) {
        const i = queue[j], px = (i % side) * step, py = ((i / side) | 0) * step;
        const score = (px - cx) * Math.cos(direction) + (py - cy) * Math.sin(direction);
        if (score > best) { best = score; point = [px, py]; }
      }
      const toward = Math.atan2(cy - point[1], cx - point[0]), rays = [];
      const rayCount = Math.min(15, 7 + Math.floor(hash(id, k + 773, f.seed) * 9));
      for (let ray = 0; ray < rayCount; ray++) rays.push(toward + (ray / (rayCount - 1) - 0.5) * 2.7 + (hash(ray, k + id * 9, f.seed) - 0.5) * 0.19);
      anchors.push(Object.freeze({ x: point[0], y: point[1], radius: Math.max(12 * f.w / 720, Math.min(width, length) * (0.22 + hash(id, k + 553, f.seed) * 0.13)), rays: Object.freeze(rays) }));
    }
    const grabs = [];
    for (let k = 0; k < 2; k++) {
      const sample = queue[Math.floor(hash(id, 1337 + k, f.seed) * (tail - 1))], px = (sample % side) * step, py = ((sample / side) | 0) * step;
      const direction = hash(id, k + 1957, f.seed) * Math.PI * 2, radius = Math.max(15 * f.w / 720, Math.min(width, length) * 0.32);
      const toward = Math.atan2(cy - py, cx - px), rays = [];
      for (let j = 0; j < 11; j++) rays.push(toward + (j / 10 - 0.5) * Math.PI * 2 + (hash(j, id + k * 75, f.seed) - 0.5) * 0.15);
      grabs.push(Object.freeze({ x: px, y: py, radius, dx: Math.cos(direction) * radius * 1.6, dy: Math.sin(direction) * radius * 1.6, rays: Object.freeze(rays) }));
    }
    components.push(Object.freeze({ id, count: tail, cx, cy, ax, ay, s0, s1, t0, t1, width, length,
      anchors: Object.freeze(anchors),
      grabs: Object.freeze(grabs),
      pullX: Math.cos(pullAngle) * Math.min(f.w * 0.115, Math.max(width * 0.92, f.w * 0.055)),
      pullY: Math.sin(pullAngle) * Math.min(f.w * 0.115, Math.max(width * 0.92, f.w * 0.055)),
      twist: (hash(id, 859, f.seed) - 0.5) * 0.55,
      mass: mass * step * step,
    }));
  }
  return { labels, components };
}

// Growing a raster region can produce a few triangles separated by a diagonal
// point contact. Keep one edge-connected sheet per region. Rejected slivers are
// never removed from the underlying photograph or transported as loose scraps.
function retainConnectedFilms(vertices, triangles, ids, componentCount) {
  const count = triangles.length / 3, parent = Int32Array.from({ length: count }, (_, i) => i), edgeOwner = new Map();
  const find = i => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[Math.max(a, b)] = Math.min(a, b); };
  const stride = vertices.length / 3;
  for (let i = 0; i < count; i++) {
    const a = triangles[i * 3], b = triangles[i * 3 + 1], c = triangles[i * 3 + 2];
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const key = Math.min(u, v) * stride + Math.max(u, v), previous = edgeOwner.get(key);
      if (previous === undefined) edgeOwner.set(key, i); else join(i, previous);
    }
  }
  const sizes = new Int32Array(count), largest = new Int32Array(componentCount).fill(-1);
  for (let i = 0; i < count; i++) sizes[find(i)]++;
  for (let i = 0; i < count; i++) if (sizes[i]) {
    const id = ids[triangles[i * 3]], old = largest[id];
    if (old < 0 || sizes[i] > sizes[old]) largest[id] = i;
  }
  const remap = new Int32Array(stride).fill(-1), keptVertices = [], keptIds = [], keptTriangles = [];
  for (let i = 0; i < count; i++) {
    if (find(i) !== largest[ids[triangles[i * 3]]]) continue;
    for (let k = 0; k < 3; k++) {
      const old = triangles[i * 3 + k];
      if (remap[old] < 0) {
        remap[old] = keptIds.length; keptIds.push(ids[old]);
        keptVertices.push(vertices[old * 3], vertices[old * 3 + 1], vertices[old * 3 + 2]);
      }
      keptTriangles.push(remap[old]);
    }
  }
  return { vertices: new Float32Array(keptVertices), triangles: new Uint32Array(keptTriangles), ids: new Int16Array(keptIds),
    prunedTriangles: count - keptTriangles.length / 3 };
}

export function buildEmulsion(f, budgetFallback = false) {
  validateFrame(f);
  let darkSamples = 0, samples = 0;
  for (let y = 0; y < f.w; y += 6) for (let x = 0; x < f.w; x += 6) { darkSamples += +(f.L(x, y) < 0.52); samples++; }
  const coverage = Math.max(0.02, darkSamples / samples);
  const intervals = budgetFallback
    ? Math.min(f.w, Math.floor(Math.sqrt(LIMITS.maxTriangles / 2)))
    : Math.min(LIMITS.maxGridIntervals, f.w, Math.floor(Math.sqrt(LIMITS.maxTriangles / (2 * coverage * 1.45))));
  const side = intervals + 1, step = (f.w - 1) / intervals;
  const density = new Float32Array(side * side), mask = new Uint8Array(side * side), growMask = new Uint8Array(side * side);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const i = y * side + x, l = f.L(x * step, y * step);
    if (!Number.isFinite(l)) throw TypeError("Emulsion source luminance must be finite");
    density[i] = photographicDensity(l);
    mask[i] = +(l < 0.4);
    growMask[i] = +(l < 0.52);
  }
  // A one-cell morphological opening leaves delicate stems and tiny photographic
  // marks attached instead of joining broad membranes through one-pixel bridges.
  const core = new Uint8Array(mask.length), opened = new Uint8Array(mask.length);
  for (let y = 1; y + 1 < side; y++) for (let x = 1; x + 1 < side; x++) {
    let inside = 1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) inside &= mask[(y + dy) * side + x + dx];
    core[y * side + x] = inside;
  }
  for (let y = 1; y + 1 < side; y++) for (let x = 1; x + 1 < side; x++) if (core[y * side + x])
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) opened[(y + dy) * side + x + dx] = 1;
  const { labels, components } = componentsFromMask(opened, side, density, step, f), verts = [], tris = [], componentIds = [];
  // Grow each deep-shadow donor through neighboring middle tone, stopping at
  // bright paper or another donor. This retains separate shadow-film topology
  // while opening a full pale window instead of leaving a dark photographic rim.
  const growSteps = Math.min(20, Math.ceil(14 * f.w / 720 / step));
  for (let iteration = 0; iteration < growSteps; iteration++) {
    const next = new Int16Array(labels);
    for (let y = 1; y + 1 < side; y++) for (let x = 1; x + 1 < side; x++) {
      const i = y * side + x;
      if (labels[i] >= 0 || !growMask[i]) continue;
      for (const j of [i - side, i - 1, i + 1, i + side]) if (labels[j] >= 0) { next[i] = labels[j]; break; }
    }
    labels.set(next);
  }
  // A shared lattice is retained. Triangle IDs define connectivity explicitly.
  const map = new Int32Array(side * side).fill(-1);
  const vertex = (i) => {
    if (map[i] >= 0) return map[i];
    const id = verts.length / 3;
    if (id === LIMITS.maxVertices) throw RangeError("Emulsion vertex limit exceeded before allocation");
    verts.push((i % side) * step, ((i / side) | 0) * step, density[i]);
    componentIds.push(labels[i]); map[i] = id; return id;
  };
  for (let y = 0; y < intervals; y++) for (let x = 0; x < intervals; x++) {
    const a = y * side + x, b = a + 1, c = a + side, d = c + 1;
    for (const t of [[a, b, d], [a, d, c]]) {
      const id = labels[t[0]];
      if (id >= 0 && labels[t[1]] === id && labels[t[2]] === id) {
        if (tris.length / 3 === LIMITS.maxTriangles) {
          if (budgetFallback) throw RangeError("Emulsion triangle limit exceeded before allocation");
          // A regular pre-sampler may alias detailed material imagery. Exactly
          // one retry uses an unconditional grid ceiling: even an all-dark grid
          // has <=119,072 triangles, below the fixed120,000 allocation budget.
          return buildEmulsion(f, true);
        }
        tris.push(...t.map(vertex));
      }
    }
  }
  if (verts.length / 3 > LIMITS.maxVertices || tris.length / 3 > LIMITS.maxTriangles) throw RangeError("Emulsion mesh limit exceeded");
  const { vertices, triangles, ids, prunedTriangles } = retainConnectedFilms(verts, tris, componentIds, components.length);
  let sourceQuantity = 0;
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i] * 3, b = triangles[i + 1] * 3, c = triangles[i + 2] * 3;
    sourceQuantity += Math.abs(signedArea(vertices[a], vertices[a + 1], vertices[b], vertices[b + 1], vertices[c], vertices[c + 1])) * (vertices[a + 2] + vertices[b + 2] + vertices[c + 2]) / 3;
  }
  return Object.freeze({ w: f.w, seed: f.seed, vertices, triangles, ids, components,
    stats: Object.freeze({ components: components.length, vertices: vertices.length / 3, triangles: triangles.length / 3, prunedTriangles, sourceQuantity, step, budgetFallback,
      planBytes: vertices.byteLength + triangles.byteLength + ids.byteLength }) });
}

export function prepareEmulsion(f) {
  return f.prepare(`lifted-emulsion:${EMULSION_VERSION}:${f.w}`, () => buildEmulsion(f));
}

// Boundary anchors and distributed handling points prescribe a membrane map.
// The same source lattice survives every control value. A finite-difference
// principal-stretch estimate identifies compressed neighborhoods. Only those
// neighborhoods can gather into overlapping crease fans. This is a kinematic
// model, not a mechanical equilibrium or chemical simulation.
export function deformEmulsion(plan, handling, { folds = true } = {}) {
  handling = clamp(Number.isFinite(handling) ? handling : 0);
  const out = new Float32Array(plan.vertices.length), maxMove = plan.w * LIMITS.maxDisplacementFraction;
  let maxDisplacement = 0, anchoredVertices = 0, displacementLimitedVertices = 0, boundaryClampedVertices = 0;
  for (let i = 0; i < plan.ids.length; i++) {
    const o = i * 3, x = plan.vertices[o], y = plan.vertices[o + 1], c = plan.components[plan.ids[i]];
    const base = (px, py) => {
      let free = 1;
      for (const anchor of c.anchors) {
        const d2 = (px - anchor.x) ** 2 + (py - anchor.y) ** 2;
        free *= 1 - Math.exp(-d2 / (anchor.radius * anchor.radius));
      }
      const dx = px - c.cx, dy = py - c.cy;
      let extraX = 0, extraY = 0;
      for (const grab of c.grabs) {
        const weight = Math.exp(-((px - grab.x) ** 2 + (py - grab.y) ** 2) / (grab.radius * grab.radius));
        extraX += weight * grab.dx; extraY += weight * grab.dy;
      }
      return [px + handling * free * (c.pullX + dx * 0.64 - dy * c.twist + extraX), py + handling * free * (c.pullY + dy * 0.64 + dx * c.twist + extraY), free];
    };
    const mapped = base(x, y), free = mapped[2];
    let ox = mapped[0] - x, oy = mapped[1] - y;
    if (folds && handling > 0) {
      const h = plan.w / 720, left = base(x - h, y), right = base(x + h, y), up = base(x, y - h), down = base(x, y + h);
      const a = (right[0] - left[0]) / (2 * h), b = (down[0] - up[0]) / (2 * h), cc = (right[1] - left[1]) / (2 * h), d = (down[1] - up[1]) / (2 * h);
      const trace = a * a + b * b + cc * cc + d * d, determinant = (a * d - b * cc) ** 2;
      const leastStretch = Math.sqrt(Math.max(0, (trace - Math.sqrt(Math.max(0, trace * trace - 4 * determinant))) / 2));
      const slack = clamp(1 - leastStretch);
      // Only compressed neighborhoods receive these added fine crease fans.
      // The base handling map may itself fold or overlap without the fans.
      // Rays start at retained or handling points, leaving quiet spans between.
      if (slack > 0.005) for (const anchor of [...c.anchors, ...c.grabs]) {
        const dx = x - anchor.x, dy = y - anchor.y, radius = Math.hypot(dx, dy);
        if (radius < h || radius > anchor.radius * 4) continue;
        const nx = -dy / radius, ny = dx / radius, angle = Math.atan2(dy, dx), creaseWidth = h * 0.72 + radius * 0.012;
        for (const ray of anchor.rays) {
          const difference = Math.atan2(Math.sin(angle - ray), Math.cos(angle - ray)), delta = difference * radius;
          if (Math.abs(delta) > creaseWidth * 4) continue;
          const gather = -4.6 * slack * delta * Math.exp(-0.5 * (delta / creaseWidth) ** 2) * Math.min(1, radius / anchor.radius);
          ox += nx * gather; oy += ny * gather;
        }
      }
    }
    const movement = Math.hypot(ox, oy);
    if (movement > maxMove) { ox *= maxMove / movement; oy *= maxMove / movement; displacementLimitedVertices++; }
    const tx = clamp(x + ox, 0, plan.w - 1), ty = clamp(y + oy, 0, plan.w - 1);
    if (tx !== x + ox || ty !== y + oy) boundaryClampedVertices++;
    out[o] = tx; out[o + 1] = ty; out[o + 2] = plan.vertices[o + 2];
    maxDisplacement = Math.max(maxDisplacement, Math.hypot(tx - x, ty - y));
    if (free < 0.000001) anchoredVertices++;
  }
  return { vertices: out, stats: { handling, maxDisplacement, anchoredVertices, displacementLimitedVertices, boundaryClampedVertices } };
}

// Conservative antialiased deposition. Each finite triangle deposits exactly
// its source-weighted quantity; subpixel/collapsed triangles use a four-pixel
// splat. This conserves the model quantity, not physical silver or optical darkness.
function pixelCoverage(a, b, c, x, y, scratch) {
  let polygon = scratch.polygonA, clipped = scratch.polygonB, n = 3;
  polygon.set([...a, ...b, ...c]);
  for (let edge = 0; edge < 4 && n; edge++) {
    const axis = edge < 2 ? 0 : 1, bound = edge === 0 ? x : edge === 1 ? x + 1 : edge === 2 ? y : y + 1;
    const sign = edge % 2 === 0 ? 1 : -1;
    let out = 0, px = polygon[(n - 1) * 2], py = polygon[(n - 1) * 2 + 1];
    let pv = (axis ? py : px) - bound, pin = pv * sign >= 0;
    for (let i = 0; i < n; i++) {
      const qx = polygon[i * 2], qy = polygon[i * 2 + 1], qv = (axis ? qy : qx) - bound, qin = qv * sign >= 0;
      if (pin !== qin) { const t = pv / (pv - qv); clipped[out * 2] = px + (qx - px) * t; clipped[out * 2 + 1] = py + (qy - py) * t; out++; }
      if (qin) { clipped[out * 2] = qx; clipped[out * 2 + 1] = qy; out++; }
      px = qx; py = qy; pv = qv; pin = qin;
    }
    n = out; const swap = polygon; polygon = clipped; clipped = swap;
  }
  let area = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) area += polygon[j * 2] * polygon[i * 2 + 1] - polygon[i * 2] * polygon[j * 2 + 1];
  return Math.abs(area) * 0.5;
}

function depositTriangle(field, w, a, b, c, mass, scratch, stats) {
  const area = signedArea(...a, ...b, ...c);
  const xmin = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), xmax = Math.min(w - 1, Math.floor(Math.max(a[0], b[0], c[0])));
  const ymin = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), ymax = Math.min(w - 1, Math.floor(Math.max(a[1], b[1], c[1])));
  const footprint = (xmax - xmin + 1) * (ymax - ymin + 1);
  if (footprint > LIMITS.maxTriangleFootprint) throw RangeError("Triangle raster footprint limit exceeded");
  stats.pixelVisits += footprint;
  if (stats.pixelVisits > LIMITS.maxRasterPixelVisits) throw RangeError("Emulsion raster work budget exceeded");
  stats.maxFootprint = Math.max(stats.maxFootprint, footprint);
  let n = 0, total = 0;
  if (Math.abs(area) > 0.000001) {
    for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) {
      const weight = pixelCoverage(a, b, c, x, y, scratch);
      if (weight) { scratch.indices[n] = y * w + x; scratch.weights[n++] = weight; total += weight; }
    }
  }
  if (total) {
    for (let i = 0; i < n; i++) field[scratch.indices[i]] += mass * scratch.weights[i] / total;
  } else {
    stats.splats++;
    const x = clamp((a[0] + b[0] + c[0]) / 3 - 0.5, 0, w - 1.00001), y = clamp((a[1] + b[1] + c[1]) / 3 - 0.5, 0, w - 1.00001);
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    field[iy * w + ix] += mass * (1 - fx) * (1 - fy);
    field[iy * w + ix + 1] += mass * fx * (1 - fy);
    field[(iy + 1) * w + ix] += mass * (1 - fx) * fy;
    field[(iy + 1) * w + ix + 1] += mass * fx * fy;
  }
  stats.deposits++;
  if (area < 0) stats.reversed++;
}

function rasterMass(plan, vertices) {
  const field = new Float32Array(plan.w * plan.w), stats = { deposits: 0, maxFootprint: 0, splats: 0, reversed: 0, pixelVisits: 0 };
  const scratch = { indices: new Int32Array(LIMITS.maxTriangleFootprint), weights: new Float32Array(LIMITS.maxTriangleFootprint), polygonA: new Float64Array(20), polygonB: new Float64Array(20) };
  const source = plan.vertices, t = plan.triangles;
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i] * 3, b = t[i + 1] * 3, c = t[i + 2] * 3;
    const sourceArea = Math.abs(signedArea(source[a], source[a + 1], source[b], source[b + 1], source[c], source[c + 1]));
    const mass = sourceArea * (source[a + 2] + source[b + 2] + source[c + 2]) / 3;
    depositTriangle(field, plan.w, [vertices[a], vertices[a + 1]], [vertices[b], vertices[b + 1]], [vertices[c], vertices[c + 1]], mass, scratch, stats);
  }
  return { field, stats };
}

// A small, conservative separable reconstruction filter removes lattice aliasing.
// This is optical reconstruction, not paper grain or simulated chemical texture.
function soften(field, w) {
  const temp = new Float32Array(field.length), out = new Float32Array(field.length);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    temp[i] = 0.5 * field[i] + 0.25 * field[y * w + Math.max(0, x - 1)] + 0.25 * field[y * w + Math.min(w - 1, x + 1)];
  }
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    out[i] = 0.5 * temp[i] + 0.25 * temp[Math.max(0, y - 1) * w + x] + 0.25 * temp[Math.min(w - 1, y + 1) * w + x];
  }
  return out;
}

export function renderEmulsion(f, plan = prepareEmulsion(f), options = {}) {
  validateFrame(f);
  if (plan.w !== f.w || plan.seed !== f.seed) throw Error("Emulsion plan/frame mismatch");
  const handling = clamp(Number.isFinite(f.intensity) ? f.intensity : 0);
  const deformation = deformEmulsion(plan, handling, options), original = rasterMass(plan, plan.vertices), moved = rasterMass(plan, deformation.vertices);
  const before = soften(original.field, f.w), after = soften(moved.field, f.w), pixels = new Uint8ClampedArray(f.w * f.w * 4);
  const paper = [247, 245, 238], silver = [28, 35, 35], transfer = 0.95 * smooth(0, 0.35, handling);
  // Image-bearing film quantity is conserved, while this illustrative material
  // response gives a detached membrane lower extinction than an attached print.
  // This is explicitly not a calibrated photochemical or silver-mass model.
  const filmExtinction = 1 - 0.52 * smooth(0, 0.5, handling);
  let transportedQuantity = 0, receivedQuantity = 0, donorFloorCorrection = 0, paleWindows = 0, expandedVeil = 0, densityEnrichmentPixels = 0, maxDensity = 0;
  for (let y = 0; y < f.w; y++) for (let x = 0; x < f.w; x++) {
    const i = y * f.w + x, photo = photographicDensity(f.L(x, y));
    // Film outside the extraction lattice remains anchored to its source pixel.
    const residual = Math.max(0, photo - transfer * before[i]);
    donorFloorCorrection += Math.max(0, transfer * before[i] - photo);
    const density = residual + transfer * after[i] * filmExtinction;
    const transmittance = Math.exp(-density);
    for (let c = 0; c < 3; c++) pixels[i * 4 + c] = silver[c] + (paper[c] - silver[c]) * transmittance;
    pixels[i * 4 + 3] = 255;
    transportedQuantity += before[i] * transfer; receivedQuantity += after[i] * transfer;
    if (before[i] > 1 && after[i] < 0.22) paleWindows++;
    if (before[i] < 0.15 && after[i] > 0.2 && after[i] < 1.2) expandedVeil++;
    if (after[i] > Math.max(2.5, before[i] * 1.6)) densityEnrichmentPixels++;
    maxDensity = Math.max(maxDensity, density);
  }
  return { pixels, plan, deformation, fields: { before, after }, stats: { ...deformation.stats, transfer, filmExtinction, transportedQuantity, receivedQuantity, donorFloorCorrection,
    quantityRelativeError: Math.abs(receivedQuantity - transportedQuantity) / Math.max(1, transportedQuantity), paleWindows, expandedVeil, densityEnrichmentPixels, maxDensity,
    raster: moved.stats } };
}

// Compatible with Atelier's supported worker-recorded p5 drawing protocol.
export function draw(p, f) {
  const { pixels } = renderEmulsion(f);
  p.loadPixels();
  p.pixels.set(pixels);
  p.updatePixels();
}

export const candidate = Object.freeze({ id: "lifted-emulsion", name: "Lifted emulsion", control: "Film handling", draw,
  mechanism: "Transported image-weighted film · anchored deformation · transmission and additive overlap",
  limitation: "Stylized flattened membrane; not a chemical simulation or a physical cloth solver." });
