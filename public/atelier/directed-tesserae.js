/* Directed tesserae: contour-row construction, not a Voronoi-cell recoloring.
 * Reference: Met 253565; Hausner, Simulating Decorative Mosaics (2001).
 * Image-space decorative assembly; does not change the captured scene geometry.
 */
import { sameDrawSurface } from "./clean-studies.js";
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export function mosaicHash(a, b, seed = 0) {
  let n =
    Math.imul(a | 0, 374761393) ^
    Math.imul(b | 0, 668265263) ^
    Math.imul(seed | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function mosaicSettings(intensity = 0.6, w = 720) {
  const strength = clamp(
      Number.isFinite(intensity) ? intensity : 0.6,
      0.15,
      0.95,
    ),
    scale = w / 720,
    pitch = Math.max(2.5, (4.7 + 6.3 * strength) * scale);
  return Object.freeze({
    strength,
    scale,
    pitch,
    gap: Math.max(0.36, 0.075 * pitch),
    bevel: Math.max(0.36, 0.073 * pitch),
    maxTiles: Math.min(60000, Math.ceil(((w * w) / (pitch * pitch)) * 2.3)),
    maxCandidates: Math.min(
      250000,
      Math.ceil(((w * w) / (pitch * pitch)) * 18),
    ),
  });
}

// Exact squared Euclidean distance transform (lower envelope of parabolas).
function edtLine(source, dest, n, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s;
    do {
      const p = v[k];
      s = (source[q] + q * q - (source[p] + p * p)) / (2 * (q - p));
      if (s <= z[k]) k--;
      else break;
    } while (k >= 0);
    if (k < 0) {
      k = 0;
      v[0] = q;
      z[0] = -Infinity;
      z[1] = Infinity;
    } else {
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    dest[q] = (q - v[k]) ** 2 + source[v[k]];
  }
}
export function boundaryDistance(labels, w, barriers = null) {
  const n = w * w,
    a = new Float32Array(n),
    b = new Float32Array(n),
    source = new Float64Array(w),
    dest = new Float64Array(w),
    v = new Int32Array(w),
    z = new Float64Array(w + 1);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        id = labels[i];
      a[i] =
        x === 0 ||
        y === 0 ||
        x === w - 1 ||
        y === w - 1 ||
        labels[i - 1] !== id ||
        labels[i + 1] !== id ||
        labels[i - w] !== id ||
        labels[i + w] !== id ||
        (barriers &&
          (barriers[i] ||
            (x > 0 && barriers[i - 1] & 1) ||
            (y > 0 && barriers[i - w] & 2)))
          ? 0
          : 1e12;
    }
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) source[x] = a[y * w + x];
    edtLine(source, dest, w, v, z);
    for (let x = 0; x < w; x++) b[y * w + x] = dest[x];
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < w; y++) source[y] = b[y * w + x];
    edtLine(source, dest, w, v, z);
    for (let y = 0; y < w; y++) a[y * w + x] = Math.sqrt(dest[y]) + 0.5;
  }
  return a;
}

function captureDomains(f) {
  const w = f.w,
    n = w * w,
    owners = new Uint16Array(n),
    labels = new Uint32Array(n),
    normals = new Float32Array(n * 3),
    depth = new Float32Array(n),
    profile = new Uint32Array(n),
    profiles = new Map(),
    barriers = new Uint8Array(n),
    pixelScale = f.pixelWorldSize || 8.2 / w;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      owners[i] = f.ID(x, y);
      let length = 0;
      for (let c = 0; c < 3; c++) {
        const value = 2 * f.N(x, y, c) - 1;
        normals[i * 3 + c] = value;
        length += value * value;
      }
      length = Math.sqrt(length) || 1;
      for (let c = 0; c < 3; c++) normals[i * 3 + c] /= length;
      depth[i] = f.distance ? f.distance(x, y) : 0;
      const key = f.materialKey ? f.materialKey(x, y) : `owner:${owners[i]}`;
      if (!profiles.has(key)) profiles.set(key, profiles.size + 1);
      profile[i] = profiles.get(key);
    }
  const joined = (i, j, dx, dy) => {
    if (profile[i] !== profile[j]) return false;
    // Coplanar, materially identical mesh ties are one visible surface. Reuse
    // the established strict color/profile/normal/plane agreement predicate.
    if (owners[i] !== owners[j])
      return sameDrawSurface(f, i % w, (i / w) | 0, j % w, (j / w) | 0);
    if (owners[i] <= 1) return true;
    let dot = 0;
    for (let c = 0; c < 3; c++) dot += normals[i * 3 + c] * normals[j * 3 + c];
    if (dot < 0.8) return false;
    if (!f.distance) return true;
    // Remove the expected local tangent-plane slope before testing depth.
    const ax = (normals[i * 3] + normals[j * 3]) * 0.5,
      ay = (normals[i * 3 + 1] + normals[j * 3 + 1]) * 0.5,
      az = (normals[i * 3 + 2] + normals[j * 3 + 2]) * 0.5,
      delta = depth[j] - depth[i];
    if (Math.abs(az) < 0.12) return Math.abs(delta) < pixelScale * 6 + 0.007;
    const expected = ((ax * dx - ay * dy) * pixelScale) / az;
    return (
      Math.abs(delta - expected) < 0.007 + (pixelScale * 0.65) / Math.abs(az)
    );
  };
  // Retain blocked native edges independently of component connectivity. An
  // occlusion seam may terminate and reconnect around its endpoint; a flood
  // label alone must never authorize a tile to cross that local seam.
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x + 1 < w && !joined(i, i + 1, 1, 0)) barriers[i] |= 1;
      if (y + 1 < w && !joined(i, i + w, 0, 1)) barriers[i] |= 2;
    }
  const queue = new Int32Array(n),
    domains = [];
  let next = 0;
  for (let start = 0; start < n; start++) {
    if (labels[start]) continue;
    const id = owners[start],
      label = ++next;
    labels[start] = label;
    let head = 0,
      tail = 1;
    queue[0] = start;
    const domain = { id, label, count: 0, minX: w, minY: w, maxX: 0, maxY: 0 },
      ownerIds = new Set();
    while (head < tail) {
      const i = queue[head++],
        x = i % w,
        y = (i / w) | 0;
      domain.count++;
      ownerIds.add(owners[i]);
      domain.minX = Math.min(domain.minX, x);
      domain.minY = Math.min(domain.minY, y);
      domain.maxX = Math.max(domain.maxX, x);
      domain.maxY = Math.max(domain.maxY, y);
      const visit = (j) => {
        if (!labels[j]) {
          labels[j] = label;
          queue[tail++] = j;
        }
      };
      if (x && !(barriers[i - 1] & 1)) visit(i - 1);
      if (x + 1 < w && !(barriers[i] & 1)) visit(i + 1);
      if (y && !(barriers[i - w] & 2)) visit(i - w);
      if (y + 1 < w && !(barriers[i] & 2)) visit(i + w);
    }
    domain.ownerIds = [...ownerIds].sort((a, b) => a - b);
    domains.push(domain);
  }
  return { owners, labels, domains, barriers };
}

// Every shared marching-square edge has an integer key; paths join without
// coordinate rounding or accidental jumps across native ownership boundaries.
function contourPaths(labels, d, w, pitch) {
  const groups = new Map(),
    start = 0.48 * pitch;
  for (let y = 0; y < w - 1; y++)
    for (let x = 0; x < w - 1; x++) {
      const i = y * w + x,
        id = labels[i];
      if (
        labels[i + 1] !== id ||
        labels[i + w] !== id ||
        labels[i + w + 1] !== id
      )
        continue;
      const ds = [d[i], d[i + 1], d[i + w + 1], d[i + w]],
        lo = Math.min(...ds),
        hi = Math.max(...ds);
      let row = Math.max(0, Math.ceil((lo - start) / pitch));
      const end = Math.floor((hi - start) / pitch);
      for (; row <= end; row++) {
        const level = start + row * pitch;
        if (level <= lo || level > hi) continue;
        const nodes = [],
          coords = [
            [x + 0.5, y + 0.5],
            [x + 1.5, y + 0.5],
            [x + 1.5, y + 1.5],
            [x + 0.5, y + 1.5],
          ],
          keys = [i * 2, (i + 1) * 2 + 1, (i + w) * 2, i * 2 + 1];
        for (let edge = 0; edge < 4; edge++) {
          const j = (edge + 1) % 4,
            a = ds[edge],
            b = ds[j];
          if (a < level === b < level) continue;
          const t = (level - a) / (b - a);
          nodes.push({
            key: keys[edge],
            x: coords[edge][0] + t * (coords[j][0] - coords[edge][0]),
            y: coords[edge][1] + t * (coords[j][1] - coords[edge][1]),
            edge,
          });
        }
        if (nodes.length !== 2 && nodes.length !== 4) continue;
        const key = id + ":" + row;
        let group = groups.get(key);
        if (!group) {
          group = { label: id, row, level, segments: [] };
          groups.set(key, group);
        }
        if (nodes.length === 2) group.segments.push(nodes);
        else if ((ds[0] + ds[1] + ds[2] + ds[3]) / 4 < level)
          group.segments.push([nodes[0], nodes[3]], [nodes[1], nodes[2]]);
        else group.segments.push([nodes[0], nodes[1]], [nodes[2], nodes[3]]);
      }
    }
  const paths = [];
  for (const group of groups.values()) {
    const nodes = new Map();
    for (let s = 0; s < group.segments.length; s++)
      for (const n of group.segments[s]) {
        let a = nodes.get(n.key);
        if (!a) {
          a = [];
          nodes.set(n.key, a);
        }
        a.push(s);
      }
    const used = new Uint8Array(group.segments.length);
    for (let seed = 0; seed < used.length; seed++) {
      if (used[seed]) continue;
      let edge = seed,
        point = group.segments[edge][0];
      const points = [];
      let closed = false;
      for (let step = 0; step <= group.segments.length; step++) {
        used[edge] = 1;
        points.push([point.x, point.y]);
        const seg = group.segments[edge],
          other = seg[0].key === point.key ? seg[1] : seg[0];
        if (other.key === points.startKey) {
          closed = true;
          break;
        }
        if (points.length === 1) points.startKey = point.key;
        const next = (nodes.get(other.key) || []).find((v) => !used[v]);
        if (next === undefined) {
          if (other.key === points.startKey) closed = true;
          else points.push([other.x, other.y]);
          break;
        }
        point = other;
        edge = next;
      }
      if (points.length > 3)
        paths.push({
          label: group.label,
          row: group.row,
          level: group.level,
          points,
          closed,
        });
    }
  }
  return paths.sort((a, b) => a.row - b.row || a.label - b.label);
}
function pathMetric(points, closed) {
  const p = points.slice();
  if (closed) p.push(p[0]);
  const lengths = new Float32Array(p.length);
  for (let i = 1; i < p.length; i++)
    lengths[i] =
      lengths[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return { p, lengths, length: lengths.at(-1), closed };
}
function atPath(path, s) {
  if (path.closed) s = ((s % path.length) + path.length) % path.length;
  else s = clamp(s, 0, path.length);
  const a = path.lengths;
  let lo = 0,
    hi = a.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (a[mid] <= s) lo = mid;
    else hi = mid;
  }
  const t = (s - a[lo]) / (a[hi] - a[lo] || 1),
    p = path.p[lo],
    q = path.p[hi];
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
}
function smoothPath(path, pitch) {
  const m = pathMetric(path.points, path.closed),
    count = Math.max(4, Math.ceil(m.length / Math.max(0.6, pitch * 0.15))),
    points = [];
  for (let k = 0; k < (path.closed ? count : count + 1); k++) {
    const s = (m.length * k) / count;
    let x = 0,
      y = 0;
    for (let j = -2; j <= 2; j++) {
      const p = atPath(m, s + j * pitch * 0.07),
        weight = j === 0 ? 3 : Math.abs(j) === 1 ? 2 : 1;
      x += p[0] * weight;
      y += p[1] * weight;
    }
    points.push([x / 9, y / 9]);
  }
  return pathMetric(points, path.closed);
}
function squareQuad(x, y, angle, width, height, jitter, seed) {
  const c = Math.cos(angle),
    s = Math.sin(angle),
    q = [];
  for (let k = 0; k < 4; k++) {
    const u =
        [-1, 1, 1, -1][k] * width * 0.5 +
        (mosaicHash(seed, k, 81) - 0.5) * jitter,
      v =
        [-1, -1, 1, 1][k] * height * 0.5 +
        (mosaicHash(seed, k, 83) - 0.5) * jitter;
    q.push([x + u * c - v * s, y + u * s + v * c]);
  }
  return q;
}
function quadInfo(q) {
  let area = 0;
  const normals = [];
  for (let k = 0; k < 4; k++) {
    const a = q[k],
      b = q[(k + 1) % 4],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      len = Math.hypot(dx, dy);
    if (len < 1e-6) return null;
    area += a[0] * b[1] - a[1] * b[0];
    normals.push([dy / len, -dx / len]);
    const c = q[(k + 2) % 4];
    if (dx * (c[1] - b[1]) - dy * (c[0] - b[0]) <= 0) return null;
  }
  if (area <= 0) return null;
  const xs = q.map((p) => p[0]),
    ys = q.map((p) => p[1]);
  return {
    q,
    normals,
    area: area * 0.5,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
// Sufficient separating-axis clearance. If any projected interval has gap g,
// the two convex tiles have at least Euclidean distance g. Conservative at tips.
export function separatedQuads(a, b, gap = 0) {
  for (const axis of [...a.normals, ...b.normals]) {
    let amin = Infinity,
      amax = -Infinity,
      bmin = Infinity,
      bmax = -Infinity;
    for (const p of a.q) {
      const v = p[0] * axis[0] + p[1] * axis[1];
      amin = Math.min(amin, v);
      amax = Math.max(amax, v);
    }
    for (const p of b.q) {
      const v = p[0] * axis[0] + p[1] * axis[1];
      bmin = Math.min(bmin, v);
      bmax = Math.max(bmax, v);
    }
    if (amax + gap <= bmin || bmax + gap <= amin) return true;
  }
  return false;
}
export function insideQuad(t, x, y) {
  for (let k = 0; k < 4; k++) {
    const a = t.q[k],
      b = t.q[(k + 1) % 4];
    if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0)
      return false;
  }
  return true;
}
function rasterTile(t, w, labels, visit) {
  const x0 = Math.max(0, Math.ceil(t.minX - 0.5)),
    x1 = Math.min(w - 1, Math.floor(t.maxX - 0.5)),
    y0 = Math.max(0, Math.ceil(t.minY - 0.5)),
    y1 = Math.min(w - 1, Math.floor(t.maxY - 0.5));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * w + x;
      if (labels[i] === t.label && insideQuad(t, x + 0.5, y + 0.5))
        visit(i, x, y);
    }
}

/** New buffers only; no mutations of the immutable capture or frame. */
export function buildDirectedTesserae(f) {
  const w = f.w,
    n = w * w,
    settings = mosaicSettings(f.intensity, w),
    { pitch, gap } = settings,
    { owners, labels, domains, barriers } = captureDomains(f),
    distance = boundaryDistance(labels, w, barriers),
    paths = contourPaths(labels, distance, w, pitch),
    tiles = [],
    cellSize = pitch * 1.8,
    grid = new Map(),
    tileAt = new Uint32Array(n);
  let candidates = 0,
    rejected = 0;
  const cells = (t) => {
    const r = [];
    for (
      let y = Math.floor((t.minY - gap) / cellSize);
      y <= Math.floor((t.maxY + gap) / cellSize);
      y++
    )
      for (
        let x = Math.floor((t.minX - gap) / cellSize);
        x <= Math.floor((t.maxX + gap) / cellSize);
        x++
      )
        r.push(x + "," + y);
    return r;
  };
  const full = () =>
    candidates >= settings.maxCandidates || tiles.length >= settings.maxTiles;
  const add = (q, label, kind, row, angle) => {
    if (full()) return false;
    candidates++;
    const t = quadInfo(q);
    if (!t) {
      rejected++;
      return false;
    }
    Object.assign(t, { label, kind, row, angle });
    const keys = cells(t),
      seen = new Set();
    for (const key of keys)
      for (const index of grid.get(key) || []) {
        if (seen.has(index)) continue;
        seen.add(index);
        if (!separatedQuads(t, tiles[index], gap)) {
          rejected++;
          return false;
        }
      }
    let count = 0,
      sx = 0,
      sy = 0,
      r = 0,
      g = 0,
      b = 0;
    const pixels = [];
    let crossesBarrier = false;
    rasterTile(t, w, labels, (i, x, y) => {
      if (
        barriers[i] & 1 &&
        labels[i + 1] === label &&
        insideQuad(t, x + 1.5, y + 0.5)
      )
        crossesBarrier = true;
      if (
        barriers[i] & 2 &&
        labels[i + w] === label &&
        insideQuad(t, x + 0.5, y + 1.5)
      )
        crossesBarrier = true;
      const c = f.C(x, y),
        base = f.B(x, y);
      r += c[0] * 0.85 + base[0] * 0.15;
      g += c[1] * 0.85 + base[1] * 0.15;
      b += c[2] * 0.85 + base[2] * 0.15;
      sx += x;
      sy += y;
      count++;
      pixels.push(i);
    });
    if (!count || crossesBarrier) {
      rejected++;
      return false;
    }
    const serial = tiles.length,
      jitter = (mosaicHash(serial, label, f.seed) - 0.5) * 12;
    t.color = [
      clamp(r / count + jitter, 0, 255),
      clamp(g / count + jitter, 0, 255),
      clamp(b / count + jitter, 0, 255),
    ];
    t.center = [sx / count, sy / count];
    t.tilt = [
      (mosaicHash(serial, 91, f.seed) - 0.5) * 0.12,
      (mosaicHash(serial, 93, f.seed) - 0.5) * 0.12,
    ];
    t.pixelCount = count;
    tiles.push(t);
    for (const i of pixels) tileAt[i] = serial + 1;
    for (const key of keys) {
      let list = grid.get(key);
      if (!list) {
        list = [];
        grid.set(key, list);
      }
      list.push(serial);
    }
    return true;
  };
  // Narrow components get priority even when they are very long. A one-pixel
  // stem has small inradius, regardless of its area or bounding-box length.
  const inradius = new Float32Array(domains.length + 1),
    thinDomain = new Uint8Array(domains.length + 1);
  for (let i = 0; i < n; i++)
    inradius[labels[i]] = Math.max(inradius[labels[i]], distance[i]);
  for (const domain of domains) {
    if (
      domain.id > 1 &&
      (inradius[domain.label] < pitch * 0.8 ||
        domain.count <= pitch * pitch * 3)
    )
      thinDomain[domain.label] = 1;
  }
  for (let i = 0; i < n && !full(); i++) {
    const label = labels[i];
    if (!thinDomain[label] || tileAt[i]) continue;
    const x = i % w,
      y = (i / w) | 0,
      radius = Math.ceil(pitch * 0.65);
    let xx = 0,
      yy = 0,
      xy = 0,
      neighbors = 0;
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        const px = x + dx,
          py = y + dy;
        if (
          px < 0 ||
          py < 0 ||
          px >= w ||
          py >= w ||
          labels[py * w + px] !== label
        )
          continue;
        xx += dx * dx;
        yy += dy * dy;
        xy += dx * dy;
        neighbors++;
      }
    const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
    add(
      squareQuad(
        x + 0.5,
        y + 0.5,
        angle,
        Math.min(pitch * 0.65, Math.max(1, neighbors / 3)),
        Math.max(0.7, Math.min(2 * distance[i] - 0.2, pitch * 0.4)),
        0,
        i,
      ),
      label,
      "thin",
      -2,
      angle,
    );
  }
  rowLoop: for (let index = 0; index < paths.length && !full(); index++) {
    const path = paths[index],
      m = smoothPath(path, pitch);
    if (m.length < pitch * 0.5) continue;
    const count = Math.max(1, Math.round(m.length / pitch)),
      step = m.length / count,
      phase = mosaicHash(index, path.label, f.seed) * step;
    for (let k = 0; k < count; k++) {
      if (full()) break rowLoop;
      const s = path.closed ? phase + k * step : step * 0.5 + k * step,
        center = atPath(m, s),
        before = atPath(m, s - pitch * 0.3),
        after = atPath(m, s + pitch * 0.3),
        angle = Math.atan2(after[1] - before[1], after[0] - before[0]);
      const seed = Math.floor(s * 17) + index * 71,
        width = (step - gap) * (0.965 + 0.045 * mosaicHash(seed, 101, f.seed)),
        height = (pitch - gap) * (0.965 + 0.04 * mosaicHash(seed, 103, f.seed));
      for (const shrink of [1, 0.88, 0.74]) {
        const q = squareQuad(
          center[0],
          center[1],
          angle,
          width * shrink,
          height * shrink,
          pitch * 0.035,
          seed + f.seed,
        );
        if (add(q, path.label, "row", path.row, angle)) {
          break;
        }
      }
    }
  }
  // Small square infill at medial seams and narrow components. Distance guides
  // orientation; it never creates a random-cell tessellation or changes owners.
  const infillStep = Math.max(1, Math.floor(pitch * 0.36)),
    buckets = Array.from({ length: 32 }, () => []);
  for (let y = 0; y < w && !full(); y += infillStep)
    for (let x = 0; x < w; x += infillStep) {
      const i = y * w + x;
      if (tileAt[i]) continue;
      const bucket = Math.min(31, Math.floor((distance[i] / pitch) * 4));
      buckets[bucket].push(i);
    }
  for (let bi = buckets.length - 1; bi >= 0 && !full(); bi--)
    for (const i of buckets[bi]) {
      if (full()) break;
      if (tileAt[i]) continue;
      const x = i % w,
        y = (i / w) | 0,
        label = labels[i],
        sample = (sx, sy) =>
          labels[clamp(sy, 0, w - 1) * w + clamp(sx, 0, w - 1)] === label
            ? distance[clamp(sy, 0, w - 1) * w + clamp(sx, 0, w - 1)]
            : 0,
        gx = sample(x + 1, y) - sample(x - 1, y),
        gy = sample(x, y + 1) - sample(x, y - 1),
        angle =
          Math.hypot(gx, gy) > 0.1
            ? Math.atan2(gy, gx) + Math.PI / 2
            : mosaicHash(label, 11, f.seed) * 0.13;
      for (const factor of [0.68, 0.48, 0.31]) {
        const width = Math.max(
            0.8,
            Math.min(pitch * factor, 2 * distance[i] - 0.1),
          ),
          height = Math.max(
            0.7,
            Math.min(pitch * factor, 2 * distance[i] - 0.1),
          );
        if (
          add(
            squareQuad(
              x + 0.5,
              y + 0.5,
              angle,
              width,
              height,
              pitch * 0.015,
              i + f.seed,
            ),
            label,
            "infill",
            -1,
            angle,
          )
        )
          break;
      }
    }
  const domainCoverage = domains.map((v) => ({ ...v, tilePixels: 0 }));
  for (let i = 0; i < n; i++)
    if (tileAt[i]) domainCoverage[labels[i] - 1].tilePixels++;
  return {
    w,
    settings,
    owners,
    labels,
    distance,
    barriers,
    tileAt,
    tiles,
    paths: paths.map((p) => ({
      label: p.label,
      row: p.row,
      level: p.level,
      pointCount: p.points.length,
    })),
    domains: domainCoverage,
    stats: {
      candidates,
      rejected,
      budgetExhausted: full(),
      candidateLimitReached: candidates >= settings.maxCandidates,
      tileLimitReached: tiles.length >= settings.maxTiles,
      tiles: tiles.length,
      rowTiles: tiles.filter((t) => t.kind === "row").length,
      infillTiles: tiles.filter((t) => t.kind === "infill").length,
      thinTiles: tiles.filter((t) => t.kind === "thin").length,
      coveredPixels: tileAt.reduce((a, v) => a + (v > 0), 0),
      totalPixels: n,
    },
  };
}

export function renderDirectedTesserae(f, plan) {
  const { w, tiles, tileAt, owners, settings } = plan,
    pixels = new Uint8ClampedArray(w * w * 4),
    light = f.reliefLight || [-0.45, -0.55, 0.704],
    ll = Math.hypot(...light) || 1,
    L = light.map((v) => v / ll),
    tileColors = tiles.map((t) => {
      const tiltLight = t.tilt[0] * L[0] + t.tilt[1] * L[1],
        v = 1 + tiltLight * 0.5;
      return t.color.map((c) => clamp(c * v, 0, 255));
    });
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 4,
        tid = tileAt[i];
      if (!tid) {
        const c = f.C(x, y),
          base = f.B(x, y);
        const shadow = owners[i] > 1 ? 0.7 : 0.86;
        for (let channel = 0; channel < 3; channel++)
          pixels[k + channel] =
            (c[channel] * 0.4 +
              base[channel] * 0.4 +
              [153, 145, 126][channel] * 0.2) *
            shadow;
        pixels[k + 3] = 255;
        continue;
      }
      const t = tiles[tid - 1],
        color = tileColors[tid - 1];
      let edgeDistance = Infinity,
        edge = -1;
      for (let e = 0; e < 4; e++) {
        const a = t.q[e],
          out = t.normals[e],
          d = -((x + 0.5 - a[0]) * out[0] + (y + 0.5 - a[1]) * out[1]);
        if (d < edgeDistance) {
          edgeDistance = d;
          edge = e;
        }
      }
      let shade = 1;
      if (edgeDistance < settings.bevel) {
        const out = t.normals[edge],
          incidence = out[0] * L[0] + out[1] * L[1],
          ramp = 1 - clamp(edgeDistance / settings.bevel);
        shade += ramp * (incidence * 0.23 - 0.025);
      }
      for (let channel = 0; channel < 3; channel++)
        pixels[k + channel] = color[channel] * shade;
      pixels[k + 3] = 255;
    }
  return pixels;
}
export function drawDirectedTesserae(p, f) {
  const key =
      "directed-tesserae:v1:" + mosaicSettings(f.intensity, f.w).strength,
    plan = f.prepare
      ? f.prepare(key, () => buildDirectedTesserae(f))
      : buildDirectedTesserae(f),
    pixels = renderDirectedTesserae(f, plan);
  p.loadPixels();
  p.pixels.set(pixels);
  p.updatePixels();
}
export const directedTesseraeRegistry = {
  id: "directed-tesserae",
  family: "Cut & assembly",
  name: "Directed tesserae",
  title: "Small stones follow the form.",
  control: "Tile scale",
  medium: "Curved rows / stone and mortar",
  swatch: "#b39771",
  category: "DIRECTIONAL TILE ASSEMBLY",
  description:
    "Small quadrilateral stones follow the outlines in curving rows. Quiet mortar joints separate flat sampled colors; shallow tilted faces catch the shared light.",
  mechanism:
    "Native-mask distance contours · arc-length row placement · separated convex quadrilaterals · small seam infill · per-tile color sampling · shared-light bevels. Image-space decorative assembly, with fixed scene geometry.",
  reference: "https://www.metmuseum.org/art/collection/search/253565",
  referenceLabel: "Roman mosaic panel / The Met",
  referencePage: "https://www.dgp.toronto.edu/papers/ahausner_SIGGRAPH2001.pdf",
  referencePageLabel: "Hausner / Simulating Decorative Mosaics, 2001",
  draw: drawDirectedTesserae,
};
