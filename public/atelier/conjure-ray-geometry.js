// Geometry shared by the variable-scene ray studies. Original Atelier's frozen
// Garden solvers remain separate. No live Three.js objects cross the worker.
const MAX_TRIANGLES = 2000000;
const MAX_MESHES = 20000;
const finite = (a, n) => (Array.isArray(a) || ArrayBuffer.isView(a)) && a.length === n && Array.from(a).every(Number.isFinite);
const require = (ok, message) => { if (!ok) throw new TypeError(message); };
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function unit3(a) {
  const length = Math.hypot(...a);
  require(length > 0 && Number.isFinite(length), 'Invalid ray direction');
  return a.map(v => v / length);
}
export function transformPoint(m, x, y, z) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  require(Number.isFinite(w) && w !== 0, 'Invalid homogeneous point');
  return [0, 1, 2].map(k => (m[k] * x + m[k + 4] * y + m[k + 8] * z + m[k + 12]) / w);
}
export function invert4(a) {
  require(finite(a, 16), 'Invalid camera matrix');
  // Pivoted elimination keeps this worker core independent of the renderer.
  const rows = Array.from({ length: 4 }, (_, r) => Array.from({ length: 8 }, (_, c) => c < 4 ? a[c * 4 + r] : +(c - 4 === r)));
  for (let c = 0; c < 4; c++) {
    let pivot = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(rows[r][c]) > Math.abs(rows[pivot][c])) pivot = r;
    require(Math.abs(rows[pivot][c]) > 1e-30, 'Singular camera matrix');
    [rows[c], rows[pivot]] = [rows[pivot], rows[c]];
    const scale = rows[c][c];
    for (let k = 0; k < 8; k++) rows[c][k] /= scale;
    for (let r = 0; r < 4; r++) if (r !== c) {
      const f = rows[r][c];
      for (let k = 0; k < 8; k++) rows[r][k] -= f * rows[c][k];
    }
  }
  return Array.from({ length: 16 }, (_, i) => rows[i % 4][4 + Math.floor(i / 4)]);
}
export function multiply4(a, b) {
  return Array.from({ length: 16 }, (_, i) => {
    const r = i % 4, c = Math.floor(i / 4) * 4;
    return a[r] * b[c] + a[r + 4] * b[c + 1] + a[r + 8] * b[c + 2] + a[r + 12] * b[c + 3];
  });
}
export function cameraRays(snapshot) {
  const inverseView = invert4(snapshot.view), inverseProjection = invert4(snapshot.projection);
  const worldFromClip = multiply4(inverseView, inverseProjection);
  const near = snapshot.near ?? (snapshot.projection[14] + 1) / snapshot.projection[10];
  const far = snapshot.far ?? (snapshot.projection[14] - 1) / snapshot.projection[10];
  require(Number.isFinite(near) && Number.isFinite(far) && far > near, 'Invalid capture depth range');
  const perspective = snapshot.projection[11] !== 0;
  return {
    at(x, y) {
      const a = transformPoint(worldFromClip, x, y, -1), b = transformPoint(worldFromClip, x, y, 1);
      const difference = b.map((v, k) => v - a[k]), length = Math.hypot(...difference);
      return { origin: a, direction: difference.map(v => v / length), length };
    },
    receiver(x, y, linearDepth) {
      const z = -(near + (far - near) * linearDepth);
      const p = snapshot.projection;
      const clipZ = (p[10] * z + p[14]) / (p[11] * z + p[15]);
      return transformPoint(worldFromClip, x, y, clipZ);
    },
    near, far, perspective, worldFromClip,
  };
}

// Topology is welded by position, not vertex index: authored hard normals/UV
// seams duplicate box/sphere vertices. Degenerate pole triangles are ignored.
function meshTopology(source, start, end) {
  const p = source.position, idx = source.index;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < p.length; k++) { min[k % 3] = Math.min(min[k % 3], p[k]); max[k % 3] = Math.max(max[k % 3], p[k]); }
  const extent = Math.max(...max.map((v, k) => v - min[k]));
  const epsilon = Math.max(extent * 1e-7, 1e-10), vertices = new Map(), ids = new Uint32Array(p.length / 3);
  for (let i = 0; i < ids.length; i++) {
    const key = [0, 1, 2].map(k => Math.round((p[i * 3 + k] - min[k]) / epsilon)).join(',');
    if (!vertices.has(key)) vertices.set(key, vertices.size);
    ids[i] = vertices.get(key);
  }
  const edges = new Map();
  let triangles = 0;
  for (let at = start; at + 2 < end; at += 3) {
    const v = [0, 1, 2].map(k => ids[idx ? idx[at + k] : at + k]);
    if (v[0] === v[1] || v[1] === v[2] || v[2] === v[0]) continue;
    triangles++;
    for (let k = 0; k < 3; k++) {
      const a = v[k], b = v[(k + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  return { closed: triangles > 0 && Array.from(edges.values()).every(n => n === 2), triangles };
}

// A multi-material object is split into capture groups for surface color, but
// its six colored faces still enclose one solid. Reunite only explicit bodyIds;
// independent meshes sharing a scene identity must keep adding independently.
function topologyBodies(snapshot) {
  const groups = new Map();
  snapshot.meshes.forEach((mesh, i) => {
    const key = typeof mesh.bodyId === 'string' ? `body:${mesh.bodyId}` : `mesh:${i}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mesh);
  });
  return { ...snapshot, meshes: Array.from(groups.values(), group => {
    if (group.length === 1) return group[0];
    let length = 0;
    const chunks = group.map(source => {
      const count = source.index?.length ?? source.position.length / 3, start = source.drawRange?.start ?? 0,
        end = Math.min(count, start + (source.drawRange?.count ?? Infinity));
      length += (end - start) * 3;
      require(Number.isInteger(length) && length >= 0 && length <= MAX_TRIANGLES * 9, 'Conjure ray triangle budget exceeded');
      return { source, start, end };
    });
    const position = new Float64Array(length);
    let cursor = 0;
    for (const { source, start, end } of chunks) for (let i = start; i < end; i++) {
      const at = (source.index ? source.index[i] : i) * 3;
      position.set(transformPoint(source.matrix, source.position[at], source.position[at + 1], source.position[at + 2]), cursor); cursor += 3;
    }
    return { ...group[0], position, index: null, drawRange: { start: 0, count: Infinity },
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], castShadow: group.some(m => m.castShadow !== false) };
  }) };
}

export function prepareConjureRayGeometry(snapshot, { topology = false } = {}) {
  require(snapshot?.version === 1 && snapshot.source === 'conjure', 'Expected a Conjure geometry snapshot');
  require(Array.isArray(snapshot.meshes) && snapshot.meshes.length <= MAX_MESHES, 'Conjure ray mesh budget exceeded');
  if (topology) snapshot = topologyBodies(snapshot);
  const meshes = [];
  let capacity = 0;
  for (const source of snapshot.meshes) {
    const p = source.position, idx = source.index;
    require((p instanceof Float32Array || p instanceof Float64Array) && p.length % 3 === 0 && p.every(Number.isFinite), 'Invalid Conjure ray positions');
    require(idx == null || ((idx instanceof Uint8Array || idx instanceof Uint16Array || idx instanceof Uint32Array) && idx.every(i => i < p.length / 3)), 'Invalid Conjure ray indices');
    require(finite(source.matrix, 16), 'Invalid Conjure model matrix');
    const length = idx?.length ?? p.length / 3, start = source.drawRange?.start ?? 0;
    const end = Math.min(length, start + (source.drawRange?.count ?? Infinity));
    require(Number.isInteger(start) && start >= 0 && start % 3 === 0 && Number.isInteger(end) && end >= start && (end - start) % 3 === 0, 'Invalid Conjure ray draw range');
    capacity += (end - start) / 3;
    require(capacity <= MAX_TRIANGLES, 'Conjure ray triangle budget exceeded (2 million)');
    meshes.push({ id: source.id, ground: typeof source.ground === 'boolean' ? source.ground : source.id === 1,
      castShadow: source.castShadow !== false, start, end,
      closed: topology ? meshTopology(source, start, end).closed : false });
  }
  let triangles = new Float64Array(capacity * 9), bounds = new Float64Array(capacity * 6),
    owners = new Uint32Array(capacity), order = new Uint32Array(capacity);
  let count = 0;
  for (let meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
    const source = snapshot.meshes[meshIndex], meta = meshes[meshIndex], p = source.position;
    meta.bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (let at = meta.start; at < meta.end; at += 3) {
      const points = [0, 1, 2].map(k => {
        const i = (source.index ? source.index[at + k] : at + k) * 3;
        return transformPoint(source.matrix, p[i], p[i + 1], p[i + 2]);
      });
      const e = points[1].map((v, k) => v - points[0][k]), f = points[2].map((v, k) => v - points[0][k]);
      const cross = [e[1] * f[2] - e[2] * f[1], e[2] * f[0] - e[0] * f[2], e[0] * f[1] - e[1] * f[0]];
      if (Math.hypot(...cross) < 1e-24) continue;
      for (const point of points) for (let k = 0; k < 3; k++) {
        meta.bounds.min[k] = Math.min(meta.bounds.min[k], point[k]);
        meta.bounds.max[k] = Math.max(meta.bounds.max[k], point[k]);
      }
      triangles.set([...points[0], ...e, ...f], count * 9);
      for (let k = 0; k < 3; k++) { bounds[count * 6 + k] = Math.min(...points.map(v => v[k])); bounds[count * 6 + k + 3] = Math.max(...points.map(v => v[k])); }
      owners[count] = meshIndex; order[count] = count; count++;
    }
  }
  const nodes = [];
  function build(start, end) {
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    let casts = false;
    for (let i = start; i < end; i++) {
      const ti = order[i]; casts ||= meshes[owners[ti]].castShadow;
      for (let k = 0; k < 3; k++) { box[k] = Math.min(box[k], bounds[ti * 6 + k]); box[k + 3] = Math.max(box[k + 3], bounds[ti * 6 + k + 3]); }
    }
    const id = nodes.length, node = { box, start, end, left: -1, right: -1, casts }; nodes.push(node);
    if (end - start > 12) {
      let axis = 0;
      for (let k = 1; k < 3; k++) if (box[k + 3] - box[k] > box[axis + 3] - box[axis]) axis = k;
      order.subarray(start, end).sort((a, b) => (bounds[a * 6 + axis] + bounds[a * 6 + axis + 3]) - (bounds[b * 6 + axis] + bounds[b * 6 + axis + 3]) || a - b);
      const mid = (start + end) >>> 1;
      node.left = build(start, mid); node.right = build(mid, end);
    }
    return id;
  }
  if (count) build(0, count);
  const stack = new Int32Array(64);
  let disposed = false;
  function trace(origin, direction, min, max, any, meshIndex) {
    require(!disposed, 'Conjure ray geometry disposed');
    const hits = any ? null : [];
    let top = 0;
    if (nodes.length) stack[top++] = 0;
    while (top) {
      const node = nodes[stack[--top]];
      if (any && !node.casts) continue;
      let near = min, far = max;
      for (let k = 0; k < 3; k++) {
        if (direction[k] === 0) { if (origin[k] < node.box[k] || origin[k] > node.box[k + 3]) { far = -Infinity; break; } }
        else {
          const a = (node.box[k] - origin[k]) / direction[k], b = (node.box[k + 3] - origin[k]) / direction[k];
          near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
        }
      }
      if (far < near) continue;
      if (node.left >= 0) { require(top + 2 <= stack.length, 'Conjure ray traversal budget exceeded'); stack[top++] = node.left; stack[top++] = node.right; continue; }
      for (let i = node.start; i < node.end; i++) {
        const ti = order[i], mesh = owners[ti];
        if (meshIndex !== undefined && mesh !== meshIndex) continue;
        if (any ? !meshes[mesh].castShadow : meshIndex === undefined && meshes[mesh].ground) continue;
        const t = ti * 9, ex = triangles[t + 3], ey = triangles[t + 4], ez = triangles[t + 5], fx = triangles[t + 6], fy = triangles[t + 7], fz = triangles[t + 8];
        const hx = direction[1] * fz - direction[2] * fy, hy = direction[2] * fx - direction[0] * fz, hz = direction[0] * fy - direction[1] * fx;
        const det = ex * hx + ey * hy + ez * hz;
        const normalLength = Math.hypot(ey * fz - ez * fy, ez * fx - ex * fz, ex * fy - ey * fx);
        if (Math.abs(det) <= normalLength * 1e-12) continue;
        const sx = origin[0] - triangles[t], sy = origin[1] - triangles[t + 1], sz = origin[2] - triangles[t + 2];
        const u = (sx * hx + sy * hy + sz * hz) / det;
        if (u < -1e-9 || u > 1 + 1e-9) continue;
        const qx = sy * ez - sz * ey, qy = sz * ex - sx * ez, qz = sx * ey - sy * ex;
        const v = (direction[0] * qx + direction[1] * qy + direction[2] * qz) / det;
        if (v < -1e-9 || u + v > 1 + 1e-9) continue;
        const distance = (fx * qx + fy * qy + fz * qz) / det;
        if (!(distance > min && distance <= max)) continue;
        if (any) return true;
        hits.push({ mesh, distance, cosine: -det / normalLength, triangle: ti });
      }
    }
    return any ? false : hits;
  }
  function queryBounds(min, max, meshIndex) {
    require(!disposed, 'Conjure ray geometry disposed');
    const output = [];
    let top = 0;
    if (nodes.length) stack[top++] = 0;
    while (top) {
      const node = nodes[stack[--top]];
      if ([0, 1, 2].some(k => node.box[k] > max[k] || node.box[k + 3] < min[k])) continue;
      if (node.left >= 0) { stack[top++] = node.left; stack[top++] = node.right; continue; }
      for (let i = node.start; i < node.end; i++) {
        const ti = order[i];
        if (meshIndex !== undefined && owners[ti] !== meshIndex) continue;
        if ([0, 1, 2].some(k => bounds[ti * 6 + k] > max[k] || bounds[ti * 6 + k + 3] < min[k])) continue;
        output.push(ti);
      }
    }
    return output;
  }
  return {
    meshes, triangleCount: count, nodeCount: nodes.length,
    explicitArrayBytes: triangles.byteLength + bounds.byteLength + owners.byteLength + order.byteLength + stack.byteLength,
    hitAny: (origin, direction, min = 0, max = Infinity) => trace(origin, direction, min, max, true),
    intersections: (origin, direction, min = -Infinity, max = Infinity, meshIndex) => trace(origin, direction, min, max, false, meshIndex),
    queryBounds,
    triangle(index) {
      require(!disposed && Number.isInteger(index) && index >= 0 && index < count, 'Invalid ray triangle');
      const at = index * 9, a = Array.from(triangles.subarray(at, at + 3));
      return [a, a.map((v, k) => v + triangles[at + 3 + k]), a.map((v, k) => v + triangles[at + 6 + k])];
    },
    dispose() { disposed = true; triangles = bounds = owners = order = null; nodes.length = 0; },
  };
}
