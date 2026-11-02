// Perspective visibility of original triangle surfaces. Reciprocal view depth
// is affine in screen space; all coverage and occlusion transitions are solved
// analytically before the drawing samples are emitted.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const transform = (m, p) => [0, 1, 2, 3].map(k => m[k] * p[0] + m[k + 4] * p[1] + m[k + 8] * p[2] + m[k + 12] * (p[3] ?? 1));
const planes = [p => p[3] + p[0], p => p[3] - p[0], p => p[3] + p[1], p => p[3] - p[1], p => p[3] + p[2], p => p[3] - p[2]];
const mix = (a, b, t) => a.map((value, k) => value + (b[k] - value) * t);
function vertex(point, view, projection, local) {
  const camera = transform(view, point), clip = transform(projection, camera);
  return { clip, depth: -camera[2] / camera[3], ...(local ? { local } : {}) };
}
function between(a, b, t) {
  return { clip: mix(a.clip, b.clip, t), depth: a.depth + (b.depth - a.depth) * t,
    ...(a.local ? { local: mix(a.local, b.local, t) } : {}) };
}
function project(vertex, size) {
  return [(vertex.clip[0] / vertex.clip[3] + 1) * size / 2,
    (1 - vertex.clip[1] / vertex.clip[3]) * size / 2, vertex.depth];
}
function clipPolygon(polygon) {
  for (const distance of planes) {
    if (!polygon.length) break;
    const output = [];
    let a = polygon.at(-1), da = distance(a.clip);
    for (const b of polygon) {
      const db = distance(b.clip);
      if ((da >= 0) !== (db >= 0)) output.push(between(a, b, da / (da - db)));
      if (db >= 0) output.push(b);
      a = b; da = db;
    }
    polygon = output;
  }
  return polygon;
}

/** Project a real world polygon only after homogeneous near/far/viewport clipping. */
export function projectClippedPolygon(points, view, projection, size) {
  return clipPolygon(points.map(point => vertex(point, view.elements || view, projection.elements || projection)))
    .map(point => project(point, size)).filter(point => point.every(Number.isFinite) && point[2] > 0);
}

export function projectClippedSegment(points, view, projection, size) {
  const [a, b] = points.map(point => vertex(point, view.elements || view, projection.elements || projection));
  let lo = 0, hi = 1;
  for (const distance of planes) {
    const da = distance(a.clip), db = distance(b.clip);
    if (da < 0 && db < 0) return null;
    if ((da >= 0) !== (db >= 0)) {
      const cut = da / (da - db);
      if (da < 0) lo = Math.max(lo, cut); else hi = Math.min(hi, cut);
    }
  }
  return hi > lo ? [project(between(a, b, lo), size), project(between(a, b, hi), size)] : null;
}

export function projectPerspectiveHatches(source, view, projection, size) {
  const points = [], offsets = [0], owners = [], families = [], pathIds = [];
  for (let path = 0; path < source.owners.length; path++) {
    let open = false;
    const finish = () => {
      if (!open) return;
      offsets.push(points.length / 3); owners.push(source.owners[path]); families.push(source.families[path]); pathIds.push(path);
      open = false;
    };
    for (let i = source.offsets[path]; i + 1 < source.offsets[path + 1]; i++) {
      const a = vertex(source.points.subarray(i * 3, i * 3 + 3), view, projection),
        b = vertex(source.points.subarray(i * 3 + 3, i * 3 + 6), view, projection);
      let lo = 0, hi = 1;
      for (const distance of planes) {
        const da = distance(a.clip), db = distance(b.clip);
        if (da < 0 && db < 0) { hi = -1; break; }
        if ((da >= 0) !== (db >= 0)) {
          const cut = da / (da - db);
          if (da < 0) lo = Math.max(lo, cut); else hi = Math.min(hi, cut);
        }
      }
      if (hi - lo <= 1e-12) { finish(); continue; }
      if (lo > 1e-12) finish();
      const start = project(between(a, b, lo), size), end = project(between(a, b, hi), size);
      if (!start.concat(end).every(Number.isFinite) || start[2] <= 0 || end[2] <= 0) { finish(); continue; }
      if (!open) { points.push(...start); open = true; }
      points.push(...end);
      if (hi < 1 - 1e-12) finish();
    }
    finish();
  }
  return { ...source, points: Float32Array.from(points), offsets: Uint32Array.from(offsets),
    owners: Uint16Array.from(owners), families: Uint8Array.from(families), pathIds: Uint32Array.from(pathIds), size, orthographic: false };
}

export function createPerspectiveHatchAtlas(prepared, view, projection, size, tileSize, visibility) {
  const width = Math.ceil(size / tileSize), tiles = Array.from({ length: width * width }, () => []), triangles = [];
  for (const entry of prepared) for (const face of entry.faces) {
    const camera = face.p.map(point => transform(view, point));
    const normal = [0, 1, 2].map(k => view[k] * face.normal[0] + view[k + 4] * face.normal[1] + view[k + 8] * face.normal[2]);
    const facing = -normal.reduce((sum, value, k) => sum + value * camera[0][k], 0);
    const side = visibility?.has(entry.id) ? 2 : entry.mesh.material.side;
    if ((side === 0 && facing <= 0) || (side === 1 && facing >= 0)) continue;
    const polygon = clipPolygon(face.p.map(point => vertex(point, view, projection, visibility?.has(entry.id) ? visibility.local(entry.id, point) : undefined)));
    for (let k = 1; k + 1 < polygon.length; k++) {
      const vertices = [polygon[0], polygon[k], polygon[k + 1]], [a, b, c] = vertices.map(point => project(point, size));
      const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (!Number.isFinite(den) || Math.abs(den) < 1e-12 || Math.min(a[2], b[2], c[2]) <= 0) continue;
      const triangle = [...a, ...b, ...c, 1 / den, entry.id];
      triangle.q = [1 / a[2], 1 / b[2], 1 / c[2]];
      if (vertices[0].local) triangle.local = vertices.map(point => point.local);
      const index = triangles.length; triangles.push(triangle);
      const x0 = clamp(Math.floor(Math.min(a[0], b[0], c[0]) / tileSize), 0, width - 1),
        x1 = clamp(Math.floor(Math.max(a[0], b[0], c[0]) / tileSize), 0, width - 1),
        y0 = clamp(Math.floor(Math.min(a[1], b[1], c[1]) / tileSize), 0, width - 1),
        y1 = clamp(Math.floor(Math.max(a[1], b[1], c[1]) / tileSize), 0, width - 1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[y * width + x].push(index);
    }
  }
  return { perspective: true, size, tileSize, width, tiles, triangles, ...(visibility ? { visibility } : {}) };
}
const barycentric = (t, x, y) => {
  const u = ((t[4] - t[7]) * (x - t[6]) + (t[6] - t[3]) * (y - t[7])) * t[9],
    v = ((t[7] - t[1]) * (x - t[6]) + (t[0] - t[6]) * (y - t[7])) * t[9];
  return [u, v, 1 - u - v];
};
const weighted = (values, weights) => weights.reduce((sum, value, i) => sum + value * values[i], 0);
const localAt = (t, weights) => {
  const q = weighted(t.q, weights);
  return [0, 1, 2].map(k => weights.reduce((sum, value, i) => sum + value * t.q[i] * t.local[i][k], 0) / q);
};
export function exactPerspectiveHatchVisible(atlas, x, y, z, owner, tolerance, aperture) {
  if (x < 0 || y < 0 || x >= atlas.size || y >= atlas.size || !(z > 0)) return false;
  if (atlas.visibility && !atlas.visibility.retained(owner, x, y, z)) return false;
  let front = Infinity, frontOwner = -1;
  for (const id of atlas.tiles[Math.floor(y / atlas.tileSize) * atlas.width + Math.floor(x / atlas.tileSize)]) {
    const t = atlas.triangles[id], weights = barycentric(t, x, y);
    if (weights.some(value => value < -1e-7)) continue;
    if (t.local && aperture(localAt(t, weights))) continue;
    const depth = 1 / weighted(t.q, weights);
    if (depth < front - 1e-7 || (Math.abs(depth - front) < 1e-7 && t[10] < frontOwner)) { front = depth; frontOwner = t[10]; }
  }
  return frontOwner === owner && Math.abs(front - z) < tolerance;
}

export function perspectiveHatchIntervals(atlas, a, b, owner, tolerance, aperture, apertureCuts) {
  if (!a.concat(b).every(Number.isFinite) || !(a[2] > 0 && b[2] > 0)) return [];
  const dx = b[0] - a[0], dy = b[1] - a[1], qa = 1 / a[2], qd = 1 / b[2] - qa;
  const events = [0, 1], cover = [], ids = new Set(), h = atlas.tileSize, width = atlas.width;
  if (Math.max(a[0], b[0]) < 0 || Math.max(a[1], b[1]) < 0 || Math.min(a[0], b[0]) >= atlas.size || Math.min(a[1], b[1]) >= atlas.size) return [];
  for (let y = clamp(Math.floor(Math.min(a[1], b[1]) / h), 0, width - 1); y <= clamp(Math.floor(Math.max(a[1], b[1]) / h), 0, width - 1); y++)
    for (let x = clamp(Math.floor(Math.min(a[0], b[0]) / h), 0, width - 1); x <= clamp(Math.floor(Math.max(a[0], b[0]) / h), 0, width - 1); x++)
      for (const id of atlas.tiles[y * width + x]) ids.add(id);
  const add = (t, lo, hi) => { if (Number.isFinite(t) && t > lo + 1e-10 && t < hi - 1e-10) events.push(t); };
  const linear = (base, slope, level, lo, hi) => { if (Math.abs(slope) > 1e-14) add((level - base) / slope, lo, hi); };
  // Solve 1/(x+xd*t) - 1/(y+yd*t) = level. Depth tolerance
  // transitions are quadratic, even though reciprocal depth itself is affine.
  const crossing = (x, xd, y, yd, level, lo, hi) => {
    const A = -level * xd * yd, B = yd - xd - level * (x * yd + xd * y), C = y - x - level * x * y;
    if (Math.abs(A) < 1e-24) { linear(C, B, 0, lo, hi); return; }
    const discriminant = B * B - 4 * A * C;
    if (discriminant < 0) return;
    const sqrt = Math.sqrt(discriminant), q = -.5 * (B + (B < 0 ? -sqrt : sqrt));
    if (q === 0) add(-B / (2 * A), lo, hi);
    else { add(q / A, lo, hi); add(C / q, lo, hi); }
  };
  const cutApertures = (localA, localB, q0, q1, lo, hi) => {
    for (const t of apertureCuts(localA, localB)) {
      const screen = t * q0 / (q1 * (1 - t) + t * q0);
      add(lo + (hi - lo) * screen, lo, hi);
    }
  };
  for (const id of ids) {
    const triangle = atlas.triangles[id], w = barycentric(triangle, a[0], a[1]), wb = barycentric(triangle, b[0], b[1]), dw = wb.map((value, i) => value - w[i]);
    let lo = 0, hi = 1;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(dw[i]) < 1e-15) { if (w[i] < -1e-7) hi = -1; }
      else { const cut = (-1e-7 - w[i]) / dw[i]; if (dw[i] > 0) lo = Math.max(lo, cut); else hi = Math.min(hi, cut); }
    }
    if (hi - lo < 1e-10) continue;
    const q = weighted(triangle.q, w), d = weighted(triangle.q, dw), entry = { lo, hi, q, d, owner: triangle[10], triangle, w, dw };
    cover.push(entry); events.push(lo, hi);
    crossing(q, d, qa, qd, -tolerance, lo, hi); crossing(q, d, qa, qd, tolerance, lo, hi);
    if (triangle.local) cutApertures(localAt(triangle, w.map((v, i) => v + dw[i] * lo)), localAt(triangle, w.map((v, i) => v + dw[i] * hi)), q + d * lo, q + d * hi, lo, hi);
  }
  if (atlas.visibility?.has(owner)) cutApertures(atlas.visibility.point(owner, ...a), atlas.visibility.point(owner, ...b), qa, qa + qd, 0, 1);
  linear(a[0], dx, 0, 0, 1); linear(a[0], dx, atlas.size, 0, 1);
  linear(a[1], dy, 0, 0, 1); linear(a[1], dy, atlas.size, 0, 1);
  for (let i = 0; i < cover.length; i++) for (let j = i + 1; j < cover.length; j++) {
    const x = cover[i], y = cover[j], lo = Math.max(x.lo, y.lo), hi = Math.min(x.hi, y.hi);
    if (hi <= lo) continue;
    for (const level of [-1e-7, 0, 1e-7]) crossing(x.q, x.d, y.q, y.d, level, lo, hi);
  }
  events.sort((a, b) => a - b);
  const cuts = events.filter((value, i) => !i || value - events[i - 1] > 1e-9), visible = [];
  for (let i = 1; i < cuts.length; i++) {
    const lo = cuts[i - 1], hi = cuts[i], mid = (lo + hi) / 2, x = a[0] + dx * mid, y = a[1] + dy * mid, depth = 1 / (qa + qd * mid);
    if (x < 0 || y < 0 || x >= atlas.size || y >= atlas.size || (atlas.visibility && !atlas.visibility.retained(owner, x, y, depth))) continue;
    let front = Infinity, frontOwner = -1;
    for (const c of cover) {
      if (mid < c.lo || mid > c.hi) continue;
      if (c.triangle.local && aperture(localAt(c.triangle, c.w.map((v, k) => v + c.dw[k] * mid)))) continue;
      const z = 1 / (c.q + c.d * mid);
      if (z < front - 1e-7 || (Math.abs(z - front) < 1e-7 && c.owner < frontOwner)) { front = z; frontOwner = c.owner; }
    }
    if (frontOwner !== owner || Math.abs(front - depth) > tolerance) continue;
    const last = visible.at(-1);
    if (last && Math.abs(last[1] - lo) < 1e-9) last[1] = hi; else visible.push([lo, hi]);
  }
  return visible;
}
