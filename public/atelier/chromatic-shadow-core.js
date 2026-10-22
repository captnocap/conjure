import { apertureFloat32CPU, ELIGIBLE_IDS } from './perforated-shell-field.js';

// Frozen numeric protocol. These are not artistic controls.
export const PROTOCOL = 'atelier-chromatic-shadow-v1';
export const WIDTH = 720, HEIGHT = 720;
export const SELF_HIT_CUTOFF = 0.00015;
export const ARRAY_CAP = 128 * 1024 * 1024;
export const MAX_TRIANGLES = 100000;
export const PALETTE = Object.freeze([
  Object.freeze([238, 236, 224]), Object.freeze([210, 83, 153]),
  Object.freeze([60, 186, 192]), Object.freeze([40, 39, 58]),
]);
const DET = 1e-14, BARY = 1e-8;
const fail = message => { throw new TypeError(message); };
const numeric = (a, n, label, bound = 1e9) => {
  if (!(Array.isArray(a) || ArrayBuffer.isView(a)) || a.length !== n) fail('Invalid ' + label);
  for (const v of a) if (!Number.isFinite(v) || Math.abs(v) > bound) fail('Invalid ' + label);
};
const ordinaryBuffer = a => a.buffer instanceof ArrayBuffer;
function bytes(a, n, label) {
  if (!(a instanceof Uint8Array || a instanceof Uint8ClampedArray) || a.length !== n || !ordinaryBuffer(a)) fail('Invalid ' + label);
}
function collectBytes(value, buffers = new Set(), arrays = new Set()) {
  if (!value || typeof value !== 'object') return 0;
  if (ArrayBuffer.isView(value)) {
    if (!ordinaryBuffer(value)) fail('Shared buffers are unsupported');
    if (buffers.has(value.buffer)) return 0;
    buffers.add(value.buffer); return value.buffer.byteLength;
  }
  if (arrays.has(value)) return 0;
  arrays.add(value);
  if (Array.isArray(value)) {
    let total = value.length * 8;
    for (const child of value) total += collectBytes(child, buffers, arrays);
    return total;
  }
  let total = 0;
  for (const child of Object.values(value)) total += collectBytes(child, buffers, arrays);
  return total;
}
export function explicitInputBytes(input) { return collectBytes(input); }

function validateGeometry(snapshot, materials) {
  if (snapshot?.version !== 1 || !Array.isArray(snapshot.meshes) || snapshot.meshes.length < 1 || snapshot.meshes.length > 32) fail('Invalid original geometry snapshot');
  if (!Array.isArray(materials) || materials.length !== snapshot.meshes.length) fail('Explicit material occupancy is required for every mesh');
  let triangles = 0;
  for (let id = 0; id < snapshot.meshes.length; id++) {
    const mesh = snapshot.meshes[id], mat = materials[id];
    if (!mat || typeof mat.materialId !== 'string' || !mat.materialId.length || mat.materialId.length > 128 || typeof mat.originalCastShadow !== 'boolean') fail('Invalid material occupancy');
    if (mat.materialId === 'perforated-shell' && !ELIGIBLE_IDS.includes(id + 1)) fail('Perforated shell is only supported on the reviewed eligible objects');
    if (!mesh || !(mesh.position instanceof Float32Array) || !ordinaryBuffer(mesh.position) || !mesh.position.length || mesh.position.length % 3 || mesh.position.length > 1000000) fail('Invalid original positions');
    if (!(mesh.index === null || mesh.index instanceof Uint16Array || mesh.index instanceof Uint32Array) || (mesh.index && (!ordinaryBuffer(mesh.index) || mesh.index.length % 3 || mesh.index.length > MAX_TRIANGLES * 3))) fail('Invalid original indices');
    const length = mesh.index?.length ?? mesh.position.length / 3, range = mesh.drawRange;
    if (!range || !Number.isSafeInteger(range.start) || range.start < 0 || range.start > length || range.start % 3 || !(range.count === Infinity || (Number.isSafeInteger(range.count) && range.count >= 0 && range.count % 3 === 0 && range.start + range.count <= length))) fail('Invalid original draw range');
    if (length % 3 || !Number.isInteger(mesh.side) || mesh.side < 0 || mesh.side > 2) fail('Invalid triangle geometry');
    numeric(mesh.matrix, 16, 'model matrix', 1e6);
    if (mesh.matrix[3] !== 0 || mesh.matrix[7] !== 0 || mesh.matrix[11] !== 0 || mesh.matrix[15] !== 1) fail('Only affine original transforms are supported');
    for (const v of mesh.position) if (!Number.isFinite(v) || Math.abs(v) > 1e6) fail('Invalid original position');
    if (mesh.index) for (const v of mesh.index) if (v >= mesh.position.length / 3) fail('Original index is out of bounds');
    triangles += (range.count === Infinity ? length - range.start : range.count) / 3;
    if (triangles > MAX_TRIANGLES) fail('Original triangle cap exceeded');
  }
  if (!triangles) fail('Empty original geometry');
  return triangles;
}

// No source references survive this preparation. The caller owns the engine and
// can release its fixed arrays explicitly; there is no global or frame cache.
export function prepareChromaticGeometry(snapshot, materials) {
  const triangleCount = validateGeometry(snapshot, materials);
  const meshCount = materials.length;
  const hasShell = materials.some(m => m.materialId === 'perforated-shell' && m.originalCastShadow);
  const inputBytes = explicitInputBytes({ snapshot, materials });
  // Triangle A/edges, bounds, owner, local vertices if needed; binary tree upper
  // bound plus one fixed traversal stack. Account before allocating.
  const allocatedBytes = triangleCount * (9 * 8 + 6 * 8 + 4 + 4 + (hasShell ? 9 * 8 : 0)) +
    (triangleCount * 2) * (6 * 8 + 5 * 4) + 64 * 4;
  if (inputBytes + allocatedBytes >= ARRAY_CAP) fail('Explicit array cap exceeded');
  let tri = new Float64Array(triangleCount * 9), bounds = new Float64Array(triangleCount * 6),
    local = hasShell ? new Float64Array(triangleCount * 9) : null,
    owner = new Uint32Array(triangleCount), order = new Uint32Array(triangleCount),
    nodeBounds = new Float64Array(triangleCount * 2 * 6),
    nodeStart = new Int32Array(triangleCount * 2), nodeEnd = new Int32Array(triangleCount * 2),
    nodeLeft = new Int32Array(triangleCount * 2), nodeRight = new Int32Array(triangleCount * 2),
    nodeOwners = new Uint32Array(triangleCount * 2), stack = new Int32Array(64);
  const shellBits = materials.reduce((bits, m, i) => m.materialId === 'perforated-shell' && m.originalCastShadow ? (bits | (1 << i)) >>> 0 : bits, 0);
  let t = 0;
  for (let meshId = 0; meshId < snapshot.meshes.length; meshId++) {
    const mesh = snapshot.meshes[meshId], mat = materials[meshId], m = mesh.matrix,
      end = mesh.drawRange.count === Infinity ? (mesh.index?.length ?? mesh.position.length / 3) : mesh.drawRange.start + mesh.drawRange.count;
    const caster = mat.originalCastShadow && mat.materialId !== 'frosted-glass';
    for (let i = mesh.drawRange.start; i < end; i += 3, t++) {
      const at = t * 9, bt = t * 6;
      bounds[bt] = bounds[bt + 1] = bounds[bt + 2] = Infinity;
      bounds[bt + 3] = bounds[bt + 4] = bounds[bt + 5] = -Infinity;
      for (let corner = 0; corner < 3; corner++) {
        const p = (mesh.index ? mesh.index[i + corner] : i + corner) * 3,
          x = mesh.position[p], y = mesh.position[p + 1], z = mesh.position[p + 2];
        if (local) { local[at + corner * 3] = x; local[at + corner * 3 + 1] = y; local[at + corner * 3 + 2] = z; }
        for (let axis = 0; axis < 3; axis++) {
          const value = m[axis] * x + m[axis + 4] * y + m[axis + 8] * z + m[axis + 12];
          if (!Number.isFinite(value) || Math.abs(value) > 1e9) fail('World geometry exceeds supported bounds');
          tri[at + corner * 3 + axis] = value;
          bounds[bt + axis] = Math.min(bounds[bt + axis], value);
          bounds[bt + axis + 3] = Math.max(bounds[bt + axis + 3], value);
        }
      }
      for (let axis = 0; axis < 3; axis++) {
        tri[at + 3 + axis] -= tri[at + axis];
        tri[at + 6 + axis] -= tri[at + axis];
      }
      owner[t] = caster ? (1 << meshId) >>> 0 : 0;
      order[t] = t;
    }
  }
  let nodes = 0;
  function build(start, end) {
    const id = nodes++, at = id * 6;
    nodeStart[id] = start; nodeEnd[id] = end; nodeLeft[id] = nodeRight[id] = -1;
    nodeBounds[at] = nodeBounds[at + 1] = nodeBounds[at + 2] = Infinity;
    nodeBounds[at + 3] = nodeBounds[at + 4] = nodeBounds[at + 5] = -Infinity;
    for (let i = start; i < end; i++) {
      const ti = order[i], bt = ti * 6;
      nodeOwners[id] |= owner[ti];
      for (let k = 0; k < 3; k++) {
        nodeBounds[at + k] = Math.min(nodeBounds[at + k], bounds[bt + k]);
        nodeBounds[at + k + 3] = Math.max(nodeBounds[at + k + 3], bounds[bt + k + 3]);
      }
    }
    if (end - start > 8) {
      let axis = 0;
      for (let k = 1; k < 3; k++) if (nodeBounds[at + k + 3] - nodeBounds[at + k] > nodeBounds[at + axis + 3] - nodeBounds[at + axis]) axis = k;
      // A total-order median partition matches the frozen nth_element halves.
      // In-place typed-array sort allocates no explicit temporary data array.
      order.subarray(start, end).sort((a, b) => {
        const ac = (bounds[a * 6 + axis] + bounds[a * 6 + axis + 3]) * .5,
          bc = (bounds[b * 6 + axis] + bounds[b * 6 + axis + 3]) * .5;
        return ac === bc ? a - b : ac - bc;
      });
      const mid = (start + end) >>> 1;
      nodeLeft[id] = build(start, mid); nodeRight[id] = build(mid, end);
    }
    return id;
  }
  build(0, triangleCount);
  snapshot = materials = null;
  let disposed = false, triangleTests = 0, nodeVisits = 0;
  const localPoint = [0, 0, 0];
  function maskUnchecked(ox, oy, oz, dx, dy, dz) {
    let hits = 0, top = 1; stack[0] = 0;
    while (top) {
      const id = stack[--top], at = id * 6;
      nodeVisits++;
      if (!(nodeOwners[id] & ~hits)) continue;
      let near = 0, far = Infinity, accepted = true;
      for (let k = 0; k < 3; k++) {
        const o = k === 0 ? ox : k === 1 ? oy : oz, d = k === 0 ? dx : k === 1 ? dy : dz;
        // A tiny nonzero component still crosses slabs over a long ray. Treat
        // only exact zero as parallel; do not change the actual source vector.
        if (d === 0) {
          if (o < nodeBounds[at + k] || o > nodeBounds[at + k + 3]) { accepted = false; break; }
        } else {
          const a = (nodeBounds[at + k] - o) / d, b = (nodeBounds[at + k + 3] - o) / d;
          near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
          if (far < near) { accepted = false; break; }
        }
      }
      if (!accepted) continue;
      if (nodeLeft[id] >= 0) {
        if (top + 2 > 64) throw Error('Traversal stack overflow');
        stack[top++] = nodeLeft[id]; stack[top++] = nodeRight[id];
      } else {
        for (let i = nodeStart[id]; i < nodeEnd[id]; i++) {
          const ti = order[i], bit = owner[ti];
          if (!bit || (hits & bit)) continue;
          triangleTests++;
          const ta = ti * 9, ax = tri[ta], ay = tri[ta + 1], az = tri[ta + 2],
            ex = tri[ta + 3], ey = tri[ta + 4], ez = tri[ta + 5],
            fx = tri[ta + 6], fy = tri[ta + 7], fz = tri[ta + 8],
            hx = dy * fz - dz * fy, hy = dz * fx - dx * fz, hz = dx * fy - dy * fx,
            det = ex * hx + ey * hy + ez * hz;
          if (Math.abs(det) < DET) continue;
          const sx = ox - ax, sy = oy - ay, sz = oz - az,
            u = (sx * hx + sy * hy + sz * hz) / det;
          if (u < -BARY || u > 1 + BARY) continue;
          const qx = sy * ez - sz * ey, qy = sz * ex - sx * ez, qz = sx * ey - sy * ex,
            v = (dx * qx + dy * qy + dz * qz) / det;
          if (v < -BARY || u + v > 1 + BARY) continue;
          const distance = (fx * qx + fy * qy + fz * qz) / det;
          if (!(distance > SELF_HIT_CUTOFF)) continue;
          if (shellBits & bit) {
            for (let axis = 0; axis < 3; axis++) localPoint[axis] = local[ta + axis] + u * (local[ta + 3 + axis] - local[ta + axis]) + v * (local[ta + 6 + axis] - local[ta + axis]);
            if (apertureFloat32CPU(localPoint)) continue;
          }
          hits = (hits | bit) >>> 0;
        }
      }
    }
    return hits;
  }
  function assertLive() { if (disposed) throw Error('Chromatic geometry has been disposed'); }
  return Object.freeze({
    triangleCount, nodeCount: nodes, meshCount,
    // Includes all allocated capacity, including temporary bounds retained for
    // transparent accounting and the fixed local aperture scratch vector.
    explicitArrayBytes: allocatedBytes + 24,
    mask(origin, direction) {
      assertLive(); numeric(origin, 3, 'ray origin'); numeric(direction, 3, 'ray direction', 1);
      if (Math.abs(Math.hypot(...direction) - 1) > 1e-12) fail('Ray direction must be unit length');
      return maskUnchecked(...origin, ...direction);
    },
    trace(depth, identity, worldFromClip, directions) {
      assertLive();
      const count = WIDTH * HEIGHT;
      bytes(depth, count * 4, 'packed depth'); bytes(identity, count * 4, 'identity');
      validateProjection(worldFromClip); validateDirections(directions);
      if (explicitInputBytes({ depth, identity, worldFromClip, directions }) + allocatedBytes + 24 + count * 8 >= ARRAY_CAP) fail('Explicit array cap exceeded');
      for (let i = 0; i < count; i++) if (identity[4 * i] > meshCount) fail('Receiver ID is out of range');
      const key = new Uint32Array(count), fill = new Uint32Array(count), m = worldFromClip,
        kd = directions[0], fd = directions[1];
      for (let i = 0; i < count; i++) {
        if (!identity[i * 4]) continue;
        const at = i * 4, d = depth[at] / 256 + depth[at + 1] / 65536 + depth[at + 2] / 16777216 + depth[at + 3] / (255 * 16777216),
          x = 2 * ((i % WIDTH) + .5) / WIDTH - 1, y = 1 - 2 * (Math.floor(i / WIDTH) + .5) / HEIGHT, z = 2 * d - 1,
          w = m[3] * x + m[7] * y + m[11] * z + m[15],
          ox = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
          oy = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
          oz = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
        key[i] = maskUnchecked(ox, oy, oz, kd[0], kd[1], kd[2]);
        fill[i] = maskUnchecked(ox, oy, oz, fd[0], fd[1], fd[2]);
      }
      return { key, fill };
    },
    counters() { return { triangleTests, nodeVisits }; },
    dispose() { disposed = true; tri = bounds = local = owner = order = nodeBounds = nodeStart = nodeEnd = nodeLeft = nodeRight = nodeOwners = stack = null; },
  });
}

function validateProjection(m) {
  numeric(m, 16, 'worldFromClip', 1e6);
  // The captured Garden is orthographic. Reject degenerate/perspective inputs
  // before unprojection so infinity cannot silently become an open route.
  if (m[3] !== 0 || m[7] !== 0 || m[11] !== 0 || Math.abs(m[15]) < 1e-12) fail('Unsupported worldFromClip');
  const determinant = m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) fail('Degenerate worldFromClip');
}
function validateDirections(directions) {
  if (!Array.isArray(directions) || directions.length !== 2) fail('Two actual source directions are required');
  for (const direction of directions) {
    numeric(direction, 3, 'source direction', 1);
    if (Math.abs(Math.hypot(...direction) - 1) > 1e-12) fail('Source directions must already be unit world vectors');
  }
}

export function colorChromaticShadows(color, key, fill) {
  const count = WIDTH * HEIGHT;
  bytes(color, count * 4, 'source color');
  if (!(key instanceof Uint32Array) || !(fill instanceof Uint32Array) || key.length !== count || fill.length !== count || !ordinaryBuffer(key) || !ordinaryBuffer(fill)) fail('Invalid visibility fields');
  const pixels = new Uint8ClampedArray(count * 4), counts = [0, 0, 0, 0];
  for (let i = 0; i < count; i++) {
    const at = i * 4, state = (key[i] !== 0 ? 1 : 0) | (fill[i] !== 0 ? 2 : 0), palette = PALETTE[state];
    counts[state]++;
    const Y = (.2126 * color[at] + .7152 * color[at + 1] + .0722 * color[at + 2]) / 255, factor = .18 + .82 * Y;
    for (let channel = 0; channel < 3; channel++) pixels[at + channel] = Math.round(palette[channel] * factor);
    pixels[at + 3] = 255;
  }
  return { pixels, counts };
}

export function renderChromaticShadows(input) {
  if (!input || input.width !== WIDTH || input.height !== HEIGHT) fail('Chromatic shadows require the frozen 720 capture');
  const { geometry, materials, depth, identity, worldFromClip, sectionRibLighting, color } = input;
  bytes(color, WIDTH * HEIGHT * 4, 'source color'); bytes(depth, color.length, 'packed depth'); bytes(identity, color.length, 'identity');
  for (let i = 3; i < color.length; i += 4) if (color[i] !== 255) fail('Source color must be opaque');
  validateProjection(worldFromClip);
  const directions = sectionRibLighting?.directional?.map(source => source.direction);
  validateDirections(directions);
  const inputBytes = explicitInputBytes(input), outputBytes = WIDTH * HEIGHT * (4 + 4 + 4) + 32;
  if (inputBytes + outputBytes >= ARRAY_CAP) fail('Explicit array cap exceeded');
  const started = performance.now(), engine = prepareChromaticGeometry(geometry, materials);
  try {
    const explicitPeakArrayBytes = inputBytes + engine.explicitArrayBytes + outputBytes;
    if (explicitPeakArrayBytes >= ARRAY_CAP) fail('Explicit array cap exceeded');
    const prepared = performance.now(), { key, fill } = engine.trace(depth, identity, worldFromClip, directions), traced = performance.now(),
      { pixels, counts } = colorChromaticShadows(color, key, fill);
    return { key, fill, pixels, counts, stats: {
      triangleCount: engine.triangleCount, nodeCount: engine.nodeCount, ...engine.counters(),
      prepareMs: prepared - started, traceMs: traced - prepared, colorMs: performance.now() - traced,
      solveMs: performance.now() - started, inputArrayBytes: inputBytes,
      geometryArrayBytes: engine.explicitArrayBytes, retainedArrayBytes: outputBytes, explicitPeakArrayBytes,
    } };
  } finally { engine.dispose(); }
}
