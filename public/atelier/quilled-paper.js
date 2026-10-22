/* Upright paper relief. Image-space decorative assembly, not altered scene geometry.
 * Base coordinates are pixels of the captured scene. Material is placed only in
 * finite-thickness upright strips; the common backing is uniformly unpainted.
 * Orthographic 3D triangle visibility and a per-triangle directional shadow map
 * include wall-on-wall shadows. No scene-wide offset/drop-shadow is used.
 */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const norm = (a) => {
  const l = Math.hypot(...a) || 1;
  return a.map((x) => x / l);
};
export const QUILLED_PAPER_VERSION = 1;
export const hash = (a, b, s = 0) => {
  let n =
    Math.imul(a | 0, 374761393) ^
    Math.imul(b | 0, 668265263) ^
    Math.imul(s | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
export function quillingSettings(f) {
  const scale = f.w / 720;
  return Object.freeze({
    scale,
    thickness: 0.94 * scale,
    height: 24 * scale,
    pitch: 14.5 * scale,
    edgeInset: 1.85 * scale,
    step: 2.15 * scale,
    tilt: 0.59,
    maxPaths: 420,
    maxSegments: 15000,
    maxCoils: 12,
    shadowScale: 2,
    maxShadowSize: 2048,
  });
}
// Exact squared Euclidean distance transform of the visible domain boundary.
function edtLine(src, dst, n, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s;
    do {
      const p = v[k];
      s = (src[q] + q * q - src[p] - p * p) / (2 * (q - p));
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
    dst[q] = (q - v[k]) ** 2 + src[v[k]];
  }
}
export function quillingFields(f) {
  const w = f.w,
    n = w * w,
    owners = new Uint16Array(n),
    labels = new Uint32Array(n),
    barriers = new Uint8Array(n),
    nx = new Float32Array(n),
    ny = new Float32Array(n),
    nz = new Float32Array(n),
    depth = new Float32Array(n);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      owners[i] = f.ID(x, y);
      const a = norm([
        2 * f.N(x, y, 0) - 1,
        2 * f.N(x, y, 1) - 1,
        2 * f.N(x, y, 2) - 1,
      ]);
      nx[i] = a[0];
      ny[i] = a[1];
      nz[i] = a[2];
      depth[i] = f.distance ? f.distance(x, y) : 0;
    }
  const joined = (i, j) => {
    const dot = nx[i] * nx[j] + ny[i] * ny[j] + nz[i] * nz[j];
    if (dot < 0.86 || owners[i] <= 1 || owners[j] <= 1) return false;
    if (owners[i] === owners[j])
      return (
        Math.abs(depth[i] - depth[j]) <
        Math.max(0.07, (f.pixelWorldSize || 0.01) * 7)
      );
    // Merge only exact same-material coplanar depth ties at intersecting meshes.
    if (dot < 0.998 || Math.abs(nz[i]) < 0.2) return false;
    const x = i % w,
      y = (i / w) | 0,
      u = j % w,
      v = (j / w) | 0;
    if (f.materialKey && f.materialKey(x, y) !== f.materialKey(u, v))
      return false;
    const color = f.baseColor || f.B,
      a = color(x, y),
      b = color(u, v);
    if (a.some((v, k) => Math.abs(v - b[k]) > 0.5)) return false;
    const scale = f.pixelWorldSize || 8.2 / w,
      expected = ((nx[i] * (u - x) - ny[i] * (v - y)) * scale) / nz[i];
    return (
      Math.abs(depth[j] - depth[i] - expected) <
      0.0008 + (scale * 0.06) / Math.abs(nz[i])
    );
  };
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x + 1 < w && !joined(i, i + 1)) barriers[i] |= 1;
      if (y + 1 < w && !joined(i, i + w)) barriers[i] |= 2;
    }
  const queue = new Int32Array(n),
    domains = [];
  for (let i = 0; i < n; i++) {
    if (labels[i] || owners[i] <= 1) continue;
    const id = domains.length + 1,
      domain = {
        label: id,
        owner: owners[i],
        count: 0,
        minX: w,
        minY: w,
        maxX: 0,
        maxY: 0,
        maxDistance: 0,
        peak: i,
      };
    let head = 0,
      tail = 1;
    queue[0] = i;
    labels[i] = id;
    while (head < tail) {
      const k = queue[head++],
        x = k % w,
        y = (k / w) | 0;
      domain.count++;
      domain.minX = Math.min(domain.minX, x);
      domain.maxX = Math.max(domain.maxX, x);
      domain.minY = Math.min(domain.minY, y);
      domain.maxY = Math.max(domain.maxY, y);
      const visit = (j) => {
        if (!labels[j] && owners[j] > 1) {
          labels[j] = id;
          queue[tail++] = j;
        }
      };
      if (x && !(barriers[k - 1] & 1)) visit(k - 1);
      if (x + 1 < w && !(barriers[k] & 1)) visit(k + 1);
      if (y && !(barriers[k - w] & 2)) visit(k - w);
      if (y + 1 < w && !(barriers[k] & 2)) visit(k + w);
    }
    domains.push(domain);
  }
  const distance = new Float32Array(n),
    tmp = new Float32Array(n),
    src = new Float64Array(w),
    dst = new Float64Array(w),
    v = new Int32Array(w),
    z = new Float64Array(w + 1);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        id = labels[i];
      distance[i] =
        !id ||
        x === 0 ||
        y === 0 ||
        x === w - 1 ||
        y === w - 1 ||
        labels[i - 1] !== id ||
        labels[i + 1] !== id ||
        labels[i - w] !== id ||
        labels[i + w] !== id
          ? 0
          : 1e10;
    }
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) src[x] = distance[y * w + x];
    edtLine(src, dst, w, v, z);
    for (let x = 0; x < w; x++) tmp[y * w + x] = dst[x];
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < w; y++) src[y] = tmp[y * w + x];
    edtLine(src, dst, w, v, z);
    for (let y = 0; y < w; y++) {
      const i = y * w + x;
      distance[i] = Math.sqrt(dst[y]);
      if (labels[i]) {
        const d = domains[labels[i] - 1];
        if (distance[i] > d.maxDistance) {
          d.maxDistance = distance[i];
          d.peak = i;
        }
      }
    }
  }
  return { w, owners, labels, distance, domains };
}
// A contour graph joins exact grid-edge identifiers, including saddle cases.
export function bandContours(field, settings) {
  const { w, labels, distance: d, domains } = field,
    groups = new Map();
  for (let y = 0; y < w - 1; y++)
    for (let x = 0; x < w - 1; x++) {
      const i = y * w + x,
        label = labels[i];
      if (
        !label ||
        domains[label - 1].maxDistance < 2.1 * settings.scale ||
        labels[i + 1] !== label ||
        labels[i + w] !== label ||
        labels[i + w + 1] !== label
      )
        continue;
      const vs = [d[i], d[i + 1], d[i + w + 1], d[i + w]],
        lo = Math.min(...vs),
        hi = Math.max(...vs),
        maxD = domains[label - 1].maxDistance;
      // Small components get one hollow rim; broad masses retain a few wide bands.
      const first = Math.min(settings.edgeInset, maxD * 0.38);
      for (
        let level = first, row = 0;
        level <= hi;
        level += settings.pitch, row++
      ) {
        if (level <= lo) continue;
        const coords = [
            [x, y],
            [x + 1, y],
            [x + 1, y + 1],
            [x, y + 1],
          ],
          keys = [i * 2, (i + 1) * 2 + 1, (i + w) * 2, i * 2 + 1],
          nodes = [];
        for (let e = 0; e < 4; e++) {
          const j = (e + 1) % 4;
          if (vs[e] < level === vs[j] < level) continue;
          const t = (level - vs[e]) / (vs[j] - vs[e]);
          nodes.push({
            key: keys[e],
            p: [
              coords[e][0] + t * (coords[j][0] - coords[e][0]),
              coords[e][1] + t * (coords[j][1] - coords[e][1]),
            ],
          });
        }
        if (nodes.length < 2) continue;
        const key = label + ":" + row;
        if (!groups.has(key))
          groups.set(key, { label, row, links: [], nodes: new Map() });
        const g = groups.get(key);
        for (let k = 0; k < nodes.length; k += 2) {
          const a = nodes[k],
            b = nodes[k + 1];
          if (!b) break;
          const ix = g.links.length;
          g.links.push([a.key, b.key]);
          for (const q of [a, b]) {
            if (!g.nodes.has(q.key)) g.nodes.set(q.key, { p: q.p, edges: [] });
            g.nodes.get(q.key).edges.push(ix);
          }
        }
      }
    }
  const paths = [];
  for (const g of groups.values()) {
    const seen = new Uint8Array(g.links.length);
    for (let start = 0; start < g.links.length; start++) {
      if (seen[start]) continue;
      const first = g.links[start][0],
        points = [];
      let key = first,
        closed = false;
      for (let k = 0; k <= g.links.length; k++) {
        const node = g.nodes.get(key);
        points.push(node.p);
        const edge = node.edges.find((e) => !seen[e]);
        if (edge === undefined) break;
        seen[edge] = 1;
        const link = g.links[edge];
        key = link[0] === key ? link[1] : link[0];
        if (key === first) {
          closed = true;
          break;
        }
      }
      if (points.length >= 6)
        paths.push({
          points,
          closed,
          label: g.label,
          row: g.row,
          kind: "band",
        });
    }
  }
  return paths;
}
function resample(points, closed, step) {
  const cumulative = [0],
    m = points.length;
  for (let i = 1; i < m + (closed ? 1 : 0); i++) {
    const a = points[i - 1],
      b = points[i % m];
    cumulative.push(cumulative.at(-1) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = cumulative.at(-1),
    count = Math.max(3, Math.ceil(length / step)),
    out = [];
  let k = 1;
  for (let i = 0; i < count + (closed ? 0 : 1); i++) {
    const s = (length * i) / count;
    while (k < cumulative.length - 1 && cumulative[k] < s) k++;
    const a = points[(k - 1) % m],
      b = points[k % m],
      t = (s - cumulative[k - 1]) / (cumulative[k] - cumulative[k - 1] || 1);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return { points: out, length };
}
function smooth(points, closed, passes = 3) {
  let out = points;
  for (let k = 0; k < passes; k++)
    out = out.map((p, i) =>
      !closed && (i === 0 || i === out.length - 1)
        ? p
        : [
            (out[(i + out.length - 1) % out.length][0] +
              p[0] * 2 +
              out[(i + 1) % out.length][0]) /
              4,
            (out[(i + out.length - 1) % out.length][1] +
              p[1] * 2 +
              out[(i + 1) % out.length][1]) /
              4,
          ],
    );
  return out;
}
export function segmentDistanceSquared(a, b, c, d) {
  const ux = b[0] - a[0],
    uy = b[1] - a[1],
    vx = d[0] - c[0],
    vy = d[1] - c[1],
    wx = a[0] - c[0],
    wy = a[1] - c[1],
    den = ux * vy - uy * vx;
  if (Math.abs(den) > 1e-12) {
    const s = (vx * wy - vy * wx) / den,
      t = (ux * wy - uy * wx) / den;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) return 0;
  }
  const pd = (p, q, r) => {
    const dx = r[0] - q[0],
      dy = r[1] - q[1],
      t = clamp(
        ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / (dx * dx + dy * dy || 1),
      );
    return (p[0] - q[0] - t * dx) ** 2 + (p[1] - q[1] - t * dy) ** 2;
  };
  return Math.min(pd(a, c, d), pd(b, c, d), pd(c, a, b), pd(d, a, b));
}
function segmentGrid(cellSize) {
  const buckets = new Map(),
    segments = [];
  const keys = (a, b, margin) => {
    const out = [];
    for (
      let y = Math.floor((Math.min(a[1], b[1]) - margin) / cellSize);
      y <= Math.floor((Math.max(a[1], b[1]) + margin) / cellSize);
      y++
    )
      for (
        let x = Math.floor((Math.min(a[0], b[0]) - margin) / cellSize);
        x <= Math.floor((Math.max(a[0], b[0]) + margin) / cellSize);
        x++
      )
        out.push(x + "," + y);
    return out;
  };
  return {
    segments,
    add(a, b, path, index) {
      const s = { a, b, path, index };
      segments.push(s);
      for (const k of keys(a, b, 0)) {
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(s);
      }
    },
    near(a, b, margin) {
      const seen = new Set(),
        out = [];
      for (const k of keys(a, b, margin))
        for (const s of buckets.get(k) || [])
          if (!seen.has(s)) {
            seen.add(s);
            out.push(s);
          }
      return out;
    },
  };
}
export function buildQuilledPaper(f, settings = quillingSettings(f)) {
  const field = quillingFields(f),
    { w, labels, distance, domains } = field,
    raw = bandContours(field, settings),
    paths = [],
    grid = segmentGrid(12 * settings.scale),
    stats = {
      candidates: raw.length,
      rejectedShort: 0,
      rejectedIntersection: 0,
      rejectedBoundary: 0,
      segments: 0,
      bands: 0,
      coils: 0,
      ribs: 0,
      collisionChecks: 0,
      budgetExhausted: false,
    };
  const safe = (p, label, margin) => {
    for (const q of [
      [0, 0],
      [margin, 0],
      [-margin, 0],
      [0, margin],
      [0, -margin],
    ]) {
      const x = Math.round(p[0] + q[0]),
        y = Math.round(p[1] + q[1]);
      if (x < 0 || y < 0 || x >= w || y >= w || labels[y * w + x] !== label)
        return false;
    }
    return true;
  };
  const accept = (candidate) => {
    const closed = candidate.closed,
      thickness = candidate.thickness || settings.thickness,
      rs = resample(
        smooth(candidate.points, closed, candidate.kind === "coil" ? 0 : 3),
        closed,
        settings.step,
      ),
      points = rs.points,
      m = points.length,
      segments = m - (closed ? 0 : 1);
    if (
      rs.length < (candidate.kind === "band" ? 28 : 8) * settings.scale ||
      m < 4
    ) {
      stats.rejectedShort++;
      return false;
    }
    if (
      paths.length >= settings.maxPaths ||
      stats.segments + segments > settings.maxSegments
    ) {
      stats.budgetExhausted = true;
      return false;
    }
    if (
      points.some((p) =>
        candidate.kind === "rib"
          ? f.ID(...p) !== candidate.owner
          : !safe(p, candidate.label, thickness * 0.65),
      )
    ) {
      stats.rejectedBoundary++;
      return false;
    }
    const clearance = settings.thickness * 2.05,
      ownGrid = segmentGrid(10 * settings.scale);
    for (let i = 0; i < segments; i++) {
      const a = points[i],
        b = points[(i + 1) % m];
      for (const s of [
        ...grid.near(a, b, clearance),
        ...ownGrid.near(a, b, clearance),
      ]) {
        if (
          s.path === -1 &&
          (Math.abs(s.index - i) <= 2 ||
            (closed && Math.abs(s.index - i) >= segments - 2))
        )
          continue;
        stats.collisionChecks++;
        if (segmentDistanceSquared(a, b, s.a, s.b) < clearance ** 2) {
          stats.rejectedIntersection++;
          return false;
        }
      }
      ownGrid.add(a, b, -1, i);
    }
    const base = [0, 0, 0],
      lit = [0, 0, 0];
    for (const p of points) {
      const b = f.B(...p),
        c = f.C(...p);
      for (let k = 0; k < 3; k++) {
        base[k] += b[k] / m;
        lit[k] += c[k] / m;
      }
    }
    const index = paths.length,
      h = hash(candidate.label, candidate.row ?? 17, f.seed),
      color = base.map((v, k) =>
        clamp((v * 0.74 + lit[k] * 0.26) * (0.95 + 0.08 * h), 0, 255),
      ),
      height = settings.height * (0.89 + 0.21 * hash(index, 73, f.seed));
    paths.push({
      ...candidate,
      serial: paths.length,
      points,
      length: rs.length,
      color,
      height,
      thickness,
    });
    for (let i = 0; i < segments; i++)
      grid.add(points[i], points[(i + 1) % m], index, i);
    stats.segments += segments;
    stats[
      candidate.kind === "coil"
        ? "coils"
        : candidate.kind === "rib"
          ? "ribs"
          : "bands"
    ]++;
    return true;
  };
  // Outlines have priority, then wide interior bands. No tile tessellation/infill.
  raw.sort(
    (a, b) =>
      a.row - b.row ||
      domains[b.label - 1].count - domains[a.label - 1].count ||
      a.label - b.label,
  );
  for (const c of raw) accept(c);
  // Narrow scene components become one continuous upright rib, rather than two
  // subpixel contour walls. Only original visible owner pixels authorize a rib.
  const thin = new Map();
  for (const d of domains) {
    if (!thin.has(d.owner))
      thin.set(d.owner, {
        owner: d.owner,
        label: d.label,
        minX: w,
        minY: w,
        maxX: 0,
        maxY: 0,
        maxDistance: 0,
        count: 0,
      });
    const o = thin.get(d.owner);
    o.minX = Math.min(o.minX, d.minX);
    o.minY = Math.min(o.minY, d.minY);
    o.maxX = Math.max(o.maxX, d.maxX);
    o.maxY = Math.max(o.maxY, d.maxY);
    o.maxDistance = Math.max(o.maxDistance, d.maxDistance);
    o.count += d.count;
  }
  for (const o of thin.values()) {
    if (
      o.maxDistance >= 2.1 * settings.scale ||
      o.count < 20 * settings.scale ** 2
    )
      continue;
    const vertical = o.maxY - o.minY >= o.maxX - o.minX,
      bins = [];
    for (
      let t = vertical ? o.minY : o.minX;
      t <= (vertical ? o.maxY : o.maxX);
      t++
    ) {
      let sum = 0,
        weight = 0;
      for (
        let u = vertical ? o.minX : o.minY;
        u <= (vertical ? o.maxX : o.maxY);
        u++
      ) {
        const x = vertical ? u : t,
          y = vertical ? t : u,
          i = y * w + x;
        if (field.owners[i] !== o.owner) continue;
        const v = 1 + distance[i] * 2;
        sum += u * v;
        weight += v;
      }
      bins.push(
        weight ? (vertical ? [sum / weight, t] : [t, sum / weight]) : null,
      );
    }
    let run = [];
    const flush = () => {
      if (run.length >= 8) {
        const cleaned = smooth(run, false, 2),
          rs = resample(cleaned, false, settings.step * 0.75).points;
        let valid = [];
        const commit = () => {
          if (valid.length >= 4)
            accept({
              points: valid,
              closed: false,
              label: o.label,
              owner: o.owner,
              kind: "rib",
              row: -2,
              thickness: settings.thickness * 0.74,
            });
          valid = [];
        };
        for (const p of rs) {
          if (f.ID(...p) === o.owner) valid.push(p);
          else commit();
        }
        commit();
      }
      run = [];
    };
    for (const p of bins) {
      if (p) run.push(p);
      else flush();
    }
    flush();
  }

  // One rolled strip at a selected roomy medial pocket. Every turn is hollow.
  const candidates = domains
    .filter(
      (d) =>
        d.maxDistance > 7 * settings.scale &&
        d.count > 800 * settings.scale ** 2,
    )
    .sort((a, b) => hash(a.label, 91, f.seed) - hash(b.label, 91, f.seed));
  for (const d of candidates) {
    if (stats.coils >= settings.maxCoils) break;
    const center = [d.peak % w, (d.peak / w) | 0],
      r = Math.min(8 * settings.scale, d.maxDistance * 0.45),
      turns = 1.65 + hash(d.label, 22, f.seed) * 0.45,
      pitch = settings.thickness * 2.45,
      inner = r - turns * pitch;
    if (inner < settings.thickness * 1.5) continue;
    const points = [],
      a0 = hash(d.label, 71, f.seed) * Math.PI * 2,
      n = Math.ceil((turns * Math.PI * 2 * r) / settings.step);
    for (let j = 0; j <= n; j++) {
      const a = a0 + (j / n) * turns * Math.PI * 2,
        rad = inner + ((r - inner) * j) / n;
      points.push([
        center[0] + Math.cos(a) * rad,
        center[1] + Math.sin(a) * rad,
      ]);
    }
    accept({ points, closed: false, label: d.label, row: -1, kind: "coil" });
  }
  return {
    w,
    settings,
    paths,
    stats,
    fieldSummary: domains.map((d) => ({ ...d })),
    seed: f.seed,
  };
}
// The tilted common backing has Y=y/cos(a). Projection preserves the fixed
// captured scene's base-plane framing: screen=(X, cos(a)Y - sin(a)Z).
export function extrudeQuilling(plan, { heightScale = 1 } = {}) {
  const triangles = [];
  let primitive = 0,
    serial = 0;
  const s = Math.sin(plan.settings.tilt),
    c = Math.cos(plan.settings.tilt),
    stats = { mitersClamped: 0, degenerate: 0 };
  const point = (p, z) => [p[0], p[1] / c, z];
  const tri = (a, b, d, color, n, kind, path) => {
    if (
      Math.hypot(
        (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]),
        (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]),
        (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]),
      ) < 1e-8
    ) {
      stats.degenerate++;
      return;
    }
    triangles.push({
      a,
      b,
      c: d,
      color,
      n,
      kind,
      path,
      key:
        (kind === "top" ? 0 : kind === "end" ? 1e9 : 2e9) +
        serial * 100000 +
        primitive++,
    });
  };
  const quad = (a, b, d, e, color, n, kind, path) => {
    tri(a, b, d, color, n, kind, path);
    tri(a, d, e, color, n, kind, path);
  };
  for (let pi = 0; pi < plan.paths.length; pi++) {
    const path = plan.paths[pi];
    serial = path.serial ?? pi;
    primitive = 0;
    const pts = path.points,
      m = pts.length,
      segments = m - (path.closed ? 0 : 1),
      offsets = [],
      h = path.height * heightScale,
      t = path.thickness * 0.5;
    for (let i = 0; i < m; i++) {
      const p = pts[i],
        prev = pts[i === 0 ? (path.closed ? m - 1 : 0) : i - 1],
        next = pts[i === m - 1 ? (path.closed ? 0 : m - 1) : i + 1],
        a = norm([p[0] - prev[0], (p[1] - prev[1]) / c, 0]),
        b = norm([next[0] - p[0], (next[1] - p[1]) / c, 0]);
      if (i === 0 && !path.closed) a.splice(0, 3, ...b);
      if (i === m - 1 && !path.closed) b.splice(0, 3, ...a);
      const v = norm([-a[1] - b[1], a[0] + b[0], 0]),
        den = Math.max(0.01, v[0] * -b[1] + v[1] * b[0]),
        factor = Math.min(2, 1 / den);
      if (factor === 2) stats.mitersClamped++;
      offsets.push([v[0] * t * factor, v[1] * t * factor]);
    }
    const corners = (i, z, sign) => {
      const p = point(pts[i], z);
      return [p[0] + offsets[i][0] * sign, p[1] + offsets[i][1] * sign, z];
    };
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % m,
        a = corners(i, 0, 1),
        b = corners(j, 0, 1),
        d = corners(j, h, 1),
        e = corners(i, h, 1),
        a2 = corners(i, 0, -1),
        b2 = corners(j, 0, -1),
        d2 = corners(j, h, -1),
        e2 = corners(i, h, -1),
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        n = norm([-dy, dx, 0]);
      quad(a, b, d, e, path.color, n, "side", pi);
      quad(
        b2,
        a2,
        e2,
        d2,
        path.color,
        norm([b2[1] - a2[1], a2[0] - b2[0], 0]),
        "side",
        pi,
      );
      quad(e, d, d2, e2, path.color, [0, 0, 1], "top", pi);
    }
    if (!path.closed)
      for (const i of [0, m - 1]) {
        const next = i === 0 ? 1 : m - 2,
          sign = i === 0 ? -1 : 1,
          dir = norm([
            pts[next][0] - pts[i][0],
            (pts[next][1] - pts[i][1]) / c,
            0,
          ]);
        quad(
          corners(i, 0, -1),
          corners(i, 0, 1),
          corners(i, h, 1),
          corners(i, h, -1),
          path.color,
          dir.map((v) => -v),
          "end",
          pi,
        );
      }
  }
  return { triangles, stats, s, c };
}
function raster(a, b, c, w, h, visit) {
  const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(area) < 1e-10) return;
  const x0 = Math.max(0, Math.ceil(Math.min(a[0], b[0], c[0]) - 0.5)),
    x1 = Math.min(w - 1, Math.floor(Math.max(a[0], b[0], c[0]) - 0.5)),
    y0 = Math.max(0, Math.ceil(Math.min(a[1], b[1], c[1]) - 0.5)),
    y1 = Math.min(h - 1, Math.floor(Math.max(a[1], b[1], c[1]) - 0.5));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5,
        py = y + 0.5,
        u = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area,
        v = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area,
        t = 1 - u - v;
      if (u >= -1e-9 && v >= -1e-9 && t >= -1e-9) visit(x, y, u, v, t);
    }
}
export function renderQuilledPaper(
  f,
  plan,
  {
    heightScale = clamp(Number.isFinite(f.intensity) ? f.intensity : 0.6),
    shadowEnabled = true,
    lightOverride = null,
    reverseTriangles = false,
  } = {},
) {
  const mesh = extrudeQuilling(plan, { heightScale }),
    { s, c } = mesh,
    w = plan.w,
    n = w * w,
    scale = plan.settings.scale,
    Lview = norm(lightOverride || f.reliefLight || [-0.45, -0.55, 0.704]),
    L = norm([
      Lview[0],
      c * Lview[1] + s * Lview[2],
      -s * Lview[1] + c * Lview[2],
    ]),
    lz = Math.max(0.16, L[2]),
    margin = Math.ceil(
      plan.settings.height *
        heightScale *
        1.1 *
        Math.max(Math.abs(L[0]) / lz, Math.abs(c * L[1]) / lz) +
        4 * scale,
    ),
    ss = Math.min(
      plan.settings.shadowScale,
      plan.settings.maxShadowSize / (w + margin * 2),
    ),
    sw = Math.min(
      plan.settings.maxShadowSize,
      Math.ceil((w + margin * 2) * ss),
    ),
    sh = sw,
    shadow = new Float32Array(sw * sh),
    pixels = new Uint8ClampedArray(n * 4),
    depth = new Float64Array(n),
    faceKeys = new Uint32Array(n).fill(4294967295),
    faceKinds = new Uint8Array(n);
  if (reverseTriangles) mesh.triangles.reverse();
  const stats = {
    triangles: mesh.triangles.length,
    culledTriangles: 0,
    shadowTexels: sw * sh,
    shadowWrites: 0,
    visibleFragments: 0,
    shadowedFloor: 0,
    shadowedWalls: 0,
    sidePixels: 0,
    topPixels: 0,
    backingPixels: 0,
    lightClamped: L[2] < 0.16,
    estimatedArrayBytes:
      shadow.byteLength +
      pixels.byteLength +
      depth.byteLength +
      faceKinds.byteLength +
      faceKeys.byteLength,
  };
  const lightPoint = (p) => [
    (p[0] - (p[2] * L[0]) / lz + margin) * ss,
    (c * (p[1] - (p[2] * L[1]) / lz) + margin) * ss,
    p[2],
  ];
  if (shadowEnabled && heightScale > 0)
    for (const tri of mesh.triangles) {
      const a = lightPoint(tri.a),
        b = lightPoint(tri.b),
        d = lightPoint(tri.c);
      raster(a, b, d, sw, sh, (x, y, u, v, t) => {
        const i = y * sw + x,
          z = u * a[2] + v * b[2] + t * d[2];
        if (z > shadow[i]) {
          shadow[i] = z;
          stats.shadowWrites++;
        }
      });
    }
  const visibility = (X, Y, Z, bias = 0.28 * scale) => {
    if (!shadowEnabled || heightScale === 0) return 1;
    const x = (X - (Z * L[0]) / lz + margin) * ss,
      y = (c * (Y - (Z * L[1]) / lz) + margin) * ss;
    let lit = 0;
    for (const [dx, dy] of [
      [0, 0],
      [-0.6, -0.25],
      [0.6, 0.25],
    ]) {
      const ix = Math.floor(x + dx),
        iy = Math.floor(y + dy);
      lit +=
        ix < 0 ||
        iy < 0 ||
        ix >= sw ||
        iy >= sh ||
        shadow[iy * sw + ix] <= Z + bias
          ? 1
          : 0;
    }
    return lit / 3;
  };
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        v = visibility(x + 0.5, (y + 0.5) / c, 0),
        noise = (hash(x, y, f.seed) - 0.5) * 0.8,
        shade = 0.84 + 0.16 * v;
      depth[i] = ((y + 0.5) / c) * s;
      for (let k = 0; k < 3; k++)
        pixels[i * 4 + k] = [246, 243, 234][k] * shade + noise;
      pixels[i * 4 + 3] = 255;
      if (v < 1) stats.shadowedFloor++;
    }
  for (const tri of mesh.triangles) {
    const facing = tri.n[1] * s + tri.n[2] * c;
    if (facing <= 1e-8) {
      stats.culledTriangles++;
      continue;
    }
    const project = (p) => [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c],
      a = project(tri.a),
      b = project(tri.b),
      d = project(tri.c),
      lambert = Math.max(
        0,
        tri.n[0] * L[0] + tri.n[1] * L[1] + tri.n[2] * L[2],
      );
    raster(a, b, d, w, w, (x, y, u, v, t) => {
      const i = y * w + x,
        z = u * a[2] + v * b[2] + t * d[2];
      const dz = z - depth[i];
      if (dz < -1e-8 || (Math.abs(dz) <= 1e-8 && tri.key >= faceKeys[i]))
        return;
      depth[i] = z;
      faceKeys[i] = tri.key;
      const X = u * tri.a[0] + v * tri.b[0] + t * tri.c[0],
        Y = u * tri.a[1] + v * tri.b[1] + t * tri.c[1],
        Z = u * tri.a[2] + v * tri.b[2] + t * tri.c[2],
        vis = visibility(
          X,
          Y,
          Z,
          0.25 * scale +
            Math.min(
              2.5 * scale,
              (((Math.abs(tri.n[0]) + Math.abs(tri.n[1]) / c) * lz) /
                (Math.max(
                  0.05,
                  Math.abs(tri.n[0] * L[0] + tri.n[1] * L[1] + tri.n[2] * L[2]),
                ) *
                  ss)) *
                0.65,
            ),
        ),
        contact = heightScale > 0 ? 0.84 + 0.16 * clamp(Z / (2.8 * scale)) : 1,
        ambient = tri.kind === "top" ? 0.78 : 0.53,
        shade =
          (ambient + (tri.kind === "top" ? 0.3 : 0.48) * lambert * vis) *
          contact;
      for (let k = 0; k < 3; k++) {
        const pigment = tri.color[k],
          rim = pigment;
        pixels[i * 4 + k] = rim * shade;
      }
      faceKinds[i] = tri.kind === "top" ? 2 : 1;
      stats.visibleFragments++;
      if (vis < 1) stats.shadowedWalls++;
    });
  }
  for (const k of faceKinds) {
    if (k === 1) stats.sidePixels++;
    else if (k === 2) stats.topPixels++;
    else stats.backingPixels++;
  }
  return { pixels, stats, meshStats: mesh.stats, faceKinds };
}
export function prepareQuilledPaper(f) {
  const settings = quillingSettings(f),
    key = `quilled-paper:v${QUILLED_PAPER_VERSION}:${f.w}`;
  return f.prepare
    ? f.prepare(key, () => buildQuilledPaper(f, settings))
    : buildQuilledPaper(f, settings);
}
export function drawQuilledPaper(p, f) {
  const plan = prepareQuilledPaper(f),
    result = renderQuilledPaper(f, plan);
  p.loadPixels();
  p.pixels.set(result.pixels);
  p.updatePixels();
}
export const quilledPaperRegistry = {
  id: "quilled-paper",
  family: "Cut & assembly",
  name: "Upright paper",
  title: "Color stands on its edge.",
  control: "Paper height",
  medium: "Upright strips / hollow curls",
  swatch: "#bd775d",
  category: "QUILLED PAPER RELIEF",
  offThread: true,
  description:
    "Long paper strips stand upright on an unpainted backing. Thin rims catch the light above broad colored walls, open cavities and a few tight curls.",
  mechanism:
    "Visible-surface distance bands · finite strip cross-sections · separate top, side and end faces · orthographic triangle visibility · per-triangle directional shadows on backing and neighboring walls. A new decorative relief built from the captured scene; no original mesh displacement.",
  reference: "https://www.artyulia.co.uk/papergraphic",
  referenceLabel: "Yulia Brodskaya / on-edge paper",
  draw: drawQuilledPaper,
};
