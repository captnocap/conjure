/** Surface-curvature hatching. Pure geometry; no camera or material enters tracing. */
import * as T from "./vendor/three.module.min.js";
import { prepareSurfaceGeometry } from "./material-bake.js";
import { materialVisibilityKey, createMaterialVisibility, apertureSegmentCuts } from "./material-visibility.js";
import { apertureFloat32CPU } from "./perforated-shell-field.js";
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const mul = (a, s) => a.map((v) => v * s);
export const norm = (a) => Math.hypot(...a);
export const unit = (a) => mul(a, 1 / (norm(a) || 1));
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const tangent = (a, n) => sub(a, mul(n, dot(a, n)));
const mix3 = (vectors, w) =>
  [0, 1, 2].map((k) => vectors.reduce((s, v, i) => s + v[k] * w[i], 0));
const smooth = (x, a, b) => {
  x = clamp((x - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// The fitted geometry tensor comes from the shared surface-geometry analysis.
// No normals, vertices, UVs, materials, or transforms are written to the scene.
export function prepare(mesh, id, { smoothIterations = 8 } = {}) {
  mesh.updateWorldMatrix(true, false);
  const data = prepareSurfaceGeometry(mesh);
  data.id = id;
  const { faces, groups } = data,
    edges = new Map();
  const box = new T.Box3().setFromObject(mesh);
  data.scale = box.getSize(new T.Vector3()).length();
  for (const f of faces) {
    f.adjacent = [-1, -1, -1];
    f.area = f.twiceArea * 0.5;
    f.e1 = sub(f.p[1], f.p[0]);
    f.e2 = sub(f.p[2], f.p[0]);
    f.g11 = dot(f.e1, f.e1);
    f.g12 = dot(f.e1, f.e2);
    f.g22 = dot(f.e2, f.e2);
    f.det = f.g11 * f.g22 - f.g12 * f.g12;
    for (let k = 0; k < 3; k++) {
      const ids = [f.ids[(k + 1) % 3], f.ids[(k + 2) % 3]].sort(
          (a, b) => a - b,
        ),
        key = ids.join(":");
      const list = edges.get(key) || [];
      list.push([f.index, k]);
      edges.set(key, list);
    }
  }
  let allowedEdges = 0,
    barriers = 0;
  for (const entries of edges.values()) {
    if (entries.length !== 2) {
      barriers++;
      continue;
    }
    const [a, b] = entries;
    if (
      dot(faces[a[0]].normal, faces[b[0]].normal) <
      Math.cos((25 * Math.PI) / 180)
    ) {
      barriers++;
      continue;
    }
    faces[a[0]].adjacent[a[1]] = b[0];
    faces[b[0]].adjacent[b[1]] = a[0];
    allowedEdges++;
  }
  // Smooth-patch IDs prevent spacing tests from suppressing disconnected sheets.
  let patchCount = 0;
  for (const f of faces) {
    if (f.patch !== undefined) continue;
    const stack = [f.index];
    while (stack.length) {
      const id = stack.pop(),
        q = faces[id];
      if (q.patch !== undefined) continue;
      q.patch = patchCount;
      for (const n of q.adjacent) if (n >= 0) stack.push(n);
    }
    patchCount++;
  }
  const axis = new T.Vector3(0, 1, 0)
      .transformDirection(mesh.matrixWorld)
      .toArray(),
    secondary = new T.Vector3(1, 0, 0)
      .transformDirection(mesh.matrixWorld)
      .toArray();
  for (const g of groups) {
    const [a, b, c] = g.shape,
      angle = 0.5 * Math.atan2(2 * b, a - c),
      mean = (a + c) * 0.5,
      spread = Math.hypot((a - c) * 0.5, b);
    g.k = [mean - spread, mean + spread];
    // The lower signed principal family is continuous on cylinder/torus surfaces.
    g.principal = unit(
      add(mul(g.tangent, -Math.sin(angle)), mul(g.bitangent, Math.cos(angle))),
    );
    const contrast =
      (2 * spread) / (Math.abs(g.k[0]) + Math.abs(g.k[1]) + 1e-5 / data.scale);
    g.confidence =
      smooth(contrast, 0.12, 0.38) * smooth(spread * data.scale, 0.03, 0.15);
    let fallback = tangent(axis, g.normal);
    if (norm(fallback) < 0.15) fallback = tangent(secondary, g.normal);
    g.fallback = unit(fallback);
    g.direction = g.confidence > 0.5 ? g.principal : g.fallback;
  }
  // Sign-invariant line dyads, transported to each vertex tangent plane. Strong
  // principal directions are fixed; weak or undefined regions borrow neighbors.
  for (let pass = 0; pass < smoothIterations; pass++) {
    const next = groups.map((g) => {
      if (g.confidence > 0.92) return g.principal;
      let aa = 0,
        ab = 0,
        bb = 0;
      const addLine = (v, w) => {
        const x = dot(v, g.tangent),
          y = dot(v, g.bitangent),
          l = Math.hypot(x, y);
        if (l < 1e-8) return;
        aa += (w * x * x) / (l * l);
        ab += (w * x * y) / (l * l);
        bb += (w * y * y) / (l * l);
      };
      addLine(g.principal, 8 * g.confidence);
      addLine(g.fallback, 0.15 * (1 - g.confidence));
      for (const i of g.neighbors)
        addLine(transport(groups[i].direction, groups[i].normal, g.normal), 1);
      const angle = 0.5 * Math.atan2(2 * ab, aa - bb);
      return unit(
        add(mul(g.tangent, Math.cos(angle)), mul(g.bitangent, Math.sin(angle))),
      );
    });
    groups.forEach((g, i) => (g.direction = next[i]));
  }
  data.area = faces.reduce((s, f) => s + f.area, 0);
  data.cdf = [];
  let sum = 0;
  for (const f of faces) data.cdf.push((sum += f.area));
  data.metadata = {
    ...data.metadata,
    area: data.area,
    allowedEdges,
    barriers,
    patches: patchCount,
    principalVertices: groups.filter((g) => g.confidence > 0.92).length,
    fallbackVertices: groups.filter((g) => g.confidence < 0.05).length,
  };
  return data;
}
export function barycentric(f, p) {
  const v = sub(p, f.p[0]),
    d = dot(v, f.e1),
    e = dot(v, f.e2),
    b = (d * f.g22 - e * f.g12) / f.det,
    c = (e * f.g11 - d * f.g12) / f.det;
  return [1 - b - c, b, c];
}
function derivative(f, d) {
  const a = dot(d, f.e1),
    b = dot(d, f.e2),
    v = (a * f.g22 - b * f.g12) / f.det,
    w = (b * f.g11 - a * f.g12) / f.det;
  return [-v - w, v, w];
}
export function field(data, f, b, family = 0, previous = null) {
  const groups = f.groups.map((i) => data.groups[i]),
    n = unit(
      mix3(
        groups.map((g) => g.normal),
        b,
      ),
    );
  const t = unit(tangent(f.e1, n)),
    v = cross(n, t);
  let aa = 0,
    ab = 0,
    bb = 0;
  for (let j = 0; j < 3; j++) {
    const d = groups[j].direction,
      x = dot(d, t),
      y = dot(d, v);
    aa += b[j] * x * x;
    ab += b[j] * x * y;
    bb += b[j] * y * y;
  }
  const coherence = Math.hypot(aa - bb, 2 * ab) / (aa + bb + 1e-20);
  if (coherence < 0.08) return null;
  const angle = 0.5 * Math.atan2(2 * ab, aa - bb) + family * Math.PI * 0.5;
  let d = unit(
    tangent(add(mul(t, Math.cos(angle)), mul(v, Math.sin(angle))), f.normal),
  );
  if (previous && dot(d, previous) < 0) d = mul(d, -1);
  return {
    d,
    n,
    coherence,
    confidence: groups.reduce((s, g, i) => s + g.confidence * b[i], 0),
  };
}
function transport(d, n0, n1) {
  const axis = cross(n0, n1),
    s = norm(axis),
    c = clamp(dot(n0, n1), -1, 1);
  if (s < 1e-9) return d;
  const a = mul(axis, 1 / s);
  return add(add(mul(d, c), mul(cross(a, d), s)), mul(a, dot(a, d) * (1 - c)));
}
class Occupancy {
  constructor(spacing) {
    this.h = spacing;
    this.bins = new Map();
  }
  key(p) {
    return p.map((x) => Math.floor(x / this.h));
  }
  add(s) {
    const key = this.key(s.p).join(","),
      list = this.bins.get(key) || [];
    list.push(s);
    this.bins.set(key, list);
  }
  nearby(p, n, patch, r) {
    const k = this.key(p);
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const list = this.bins.get([k[0] + x, k[1] + y, k[2] + z].join(","));
          if (!list) continue;
          for (const s of list)
            if (s.patch === patch && dot(n, s.n) > 0.5 && norm(sub(p, s.p)) < r)
              return true;
        }
    return false;
  }
}
function halfTrace(
  data,
  seed,
  family,
  sign,
  occupancy,
  opt,
  stats,
  oppositeHalf = [],
) {
  let face = seed.face,
    b = seed.b.slice(),
    p = mix3(data.faces[face].p, b),
    f = data.faces[face],
    initial = field(data, f, b, family);
  if (!initial) {
    stats.singular++;
    return [];
  }
  let previous = mul(initial.d, sign),
    distance = 0,
    points = [{ p, face, b: b.slice(), n: initial.n }],
    steps = 0,
    stagnant = 0;
  while (distance < opt.maxLength * 0.5 && steps++ < opt.maxSteps) {
    f = data.faces[face];
    const q = field(data, f, b, family, previous);
    if (!q) {
      stats.singular++;
      break;
    }
    if (dot(q.d, previous) < 0.4) {
      stats.turn++;
      break;
    }
    const db = derivative(f, q.d);
    let travel = Math.min(opt.step, opt.maxLength * 0.5 - distance),
      edge = -1;
    for (let k = 0; k < 3; k++) {
      if (db[k] >= -1e-12) continue;
      const t = -b[k] / db[k];
      if (t >= -1e-8 && t < travel) {
        travel = Math.max(0, t);
        edge = k;
      }
    }
    const nb = b.map((x, k) => x + db[k] * travel),
      np = mix3(f.p, nb);
    if (
      distance > opt.step * 4 &&
      oppositeHalf
        .slice(4)
        .some(
          (s) => dot(s.n, q.n) > 0.5 && norm(sub(s.p, np)) < opt.step * 0.65,
        )
    ) {
      stats.loop++;
      break;
    }
    if (
      distance > opt.step * 8 &&
      points
        .slice(0, -8)
        .some((s) => dot(s.n, q.n) > 0.5 && norm(sub(s.p, np)) < opt.step * 0.5)
    ) {
      stats.loop++;
      break;
    }
    if (
      distance > opt.step &&
      occupancy.nearby(np, q.n, f.patch, opt.spacing * 0.72)
    ) {
      stats.spacing++;
      break;
    }
    stagnant = travel < 1e-7 ? stagnant + 1 : 0;
    if (stagnant > 5) {
      stats.stagnation++;
      break;
    }
    if (travel > 1e-8) {
      distance += travel;
      points.push({ p: np, face, b: nb, n: q.n });
    }
    p = np;
    b = nb;
    previous = q.d;
    if (edge >= 0) {
      const next = f.adjacent[edge];
      if (next < 0) {
        stats.boundary++;
        break;
      }
      if (nb.filter((x) => Math.abs(x) < 1e-8).length > 1) {
        stats.vertex++;
        break;
      }
      previous = transport(previous, f.normal, data.faces[next].normal);
      face = next;
      b = barycentric(data.faces[face], p);
      // Tiny deterministic interior nudge only resolves roundoff at the shared edge.
      b = b.map((x) => Math.max(1e-10, x));
      const sum = b.reduce((a, x) => a + x, 0);
      b = b.map((x) => x / sum);
      p = mix3(data.faces[face].p, b);
      stats.crossings++;
    }
  }
  if (steps >= opt.maxSteps) stats.stepCap++;
  return points;
}
export function trace(data, options = {}) {
  const opt = {
    spacing: 0.075,
    step: 0.023,
    maxLength: 1.45,
    maxSteps: 350,
    maxCandidates: 12000,
    maxPaths: 1500,
    seed: 2401,
    families: 2,
    ...options,
  };
  const paths = [],
    stats = {
      candidates: 0,
      rejectedSeeds: 0,
      singular: 0,
      turn: 0,
      spacing: 0,
      boundary: 0,
      vertex: 0,
      crossings: 0,
      stepCap: 0,
      loop: 0,
      stagnation: 0,
      short: 0,
    };
  for (let family = 0; family < opt.families; family++) {
    const spacing = opt.spacing * (family ? 1.35 : 1),
      occupied = new Occupancy(spacing),
      rng = random(opt.seed + data.id * 100003 + family * 223),
      candidateCount = Math.min(
        opt.maxCandidates,
        Math.ceil((data.area / (spacing * spacing)) * 6),
      );
    for (
      let candidate = 0;
      candidate < candidateCount && paths.length < opt.maxPaths;
      candidate++
    ) {
      stats.candidates++;
      const area = rng() * data.area;
      let lo = 0,
        hi = data.faces.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (data.cdf[mid] < area) lo = mid + 1;
        else hi = mid;
      }
      const r = Math.sqrt(rng()),
        t = rng(),
        b = [1 - r, r * (1 - t), r * t],
        f = data.faces[lo],
        p = mix3(f.p, b),
        v = field(data, f, b, family);
      if (!v || occupied.nearby(p, v.n, f.patch, spacing)) {
        stats.rejectedSeeds++;
        continue;
      }
      const seed = { face: lo, b },
        local = { ...opt, spacing },
        a = halfTrace(data, seed, family, -1, occupied, local, stats),
        z = halfTrace(data, seed, family, 1, occupied, local, stats, a),
        points = [...a.reverse(), ...z.slice(1)];
      const length = points
        .slice(1)
        .reduce((s, p, i) => s + norm(sub(p.p, points[i].p)), 0);
      if (length < 0.11) {
        stats.short++;
        continue;
      }
      for (const s of points) occupied.add({ ...s, patch: f.patch });
      paths.push({ object: data.id, patch: f.patch, family, points, length });
    }
  }
  return { paths, stats };
}
export function snapshot(camera, size = 720) {
  return {
    view: camera.matrixWorldInverse.clone(),
    projection: camera.projectionMatrix.clone(),
    size,
    near: camera.near,
    far: camera.far,
  };
}
export function project(p, capture) {
  const v = new T.Vector3(...p).applyMatrix4(capture.view),
    z = -v.z;
  v.applyMatrix4(capture.projection);
  return [(v.x + 1) * capture.size * 0.5, (1 - v.y) * capture.size * 0.5, z];
}

/** Owned typed arrays, suitable for structured clone. Do not transfer a live cache. */
export function packSurfaceHatches(paths) {
  const total = paths.reduce((sum, path) => sum + path.points.length, 0),
    points = new Float32Array(total * 3),
    offsets = new Uint32Array(paths.length + 1),
    owners = new Uint16Array(paths.length),
    families = new Uint8Array(paths.length);
  let at = 0;
  paths.forEach((path, i) => {
    offsets[i] = at;
    owners[i] = path.object;
    families[i] = path.family;
    for (const point of path.points) {
      points.set(point.p, at * 3);
      at++;
    }
  });
  offsets[paths.length] = at;
  return { version: 1, stride: 3, points, offsets, owners, families };
}

/** Projection only. Source paths remain immutable; Atelier uses orthographic views. */
export function projectSurfaceHatches(source, view, projection, size) {
  if (source.version !== 1) throw new Error("Unsupported hatch source version");
  const v = view.elements || view,
    p = projection.elements || projection,
    input = source.points,
    points = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 3) {
    const x = input[i],
      y = input[i + 1],
      z = input[i + 2],
      vx = v[0] * x + v[4] * y + v[8] * z + v[12],
      vy = v[1] * x + v[5] * y + v[9] * z + v[13],
      vz = v[2] * x + v[6] * y + v[10] * z + v[14],
      vw = v[3] * x + v[7] * y + v[11] * z + v[15];
    const cx = p[0] * vx + p[4] * vy + p[8] * vz + p[12] * vw,
      cy = p[1] * vx + p[5] * vy + p[9] * vz + p[13] * vw,
      cw = p[3] * vx + p[7] * vy + p[11] * vz + p[15] * vw;
    points[i] = (cx / cw + 1) * size * 0.5;
    points[i + 1] = (1 - cy / cw) * size * 0.5;
    points[i + 2] = -vz / vw;
  }
  return { ...source, points, size, orthographic: Math.abs(p[11]) < 1e-12 };
}

/**
 * Own one instance per immutable original scene, outside render(). Preparing and
 * tracing are lazy. Only seed changes rebuild paths; orbit/light/materials and
 * intensity never enter the source cache key. The two-seed LRU bounds retention.
 */
export function createSurfaceHatching(solids, options = {}) {
  let prepared = null,
    latest = null;
  const cache = new Map(),
    stats = {
      preparations: 0,
      traceBuilds: 0,
      projections: 0,
      prepareMS: 0,
      traceMS: 0,
      atlasBuilds: 0,
      visibilityBuilds: 0,
      atlasMS: 0,
      visibilityMS: 0,
    };
  function prepareOnce() {
    if (!prepared) {
      const start = performance.now();
      prepared = solids.map((mesh, i) => prepare(mesh, i + 1));
      stats.preparations++;
      stats.prepareMS += performance.now() - start;
    }
  }
  function world(seed = 2401) {
    if (!Number.isSafeInteger(seed))
      throw new RangeError("Hatch seed must be an integer");
    if (cache.has(seed)) {
      const entry = cache.get(seed);
      cache.delete(seed);
      cache.set(seed, entry);
      return entry;
    }
    prepareOnce();
    const start = performance.now(),
      paths = prepared
        .slice(1)
        .flatMap((mesh) => trace(mesh, { ...options, seed }).paths),
      source = packSurfaceHatches(paths, prepared);
    stats.traceBuilds++;
    stats.traceMS += performance.now() - start;
    cache.set(seed, source);
    while (cache.size > 2) cache.delete(cache.keys().next().value);
    return source;
  }
  return {
    world,
    project(seed, view, projection, size) {
      stats.projections++;
      return projectSurfaceHatches(world(seed), view, projection, size);
    },
    visible(seed, view, projection, size, materialVisibility) {
      const v = view.elements || view,
        p = projection.elements || projection,
        key =
          size + ":" + Array.from(v).join(",") + ":" + Array.from(p).join(",") +
          (materialVisibilityKey(materialVisibility) ? ":" + materialVisibilityKey(materialVisibility) : "");
      const source = world(seed);
      if (!latest || latest.key !== key) {
        const start = performance.now(),
          capturedView = new T.Matrix4().fromArray(v),
          capturedProjection = new T.Matrix4().fromArray(p);
        latest = {
          key,
          view: capturedView,
          projection: capturedProjection,
          atlas: createHatchVisibilityAtlas(
            prepared,
            capturedView,
            capturedProjection,
            size,
            { materialVisibility },
          ),
          runs: new Map(),
        };
        stats.atlasBuilds++;
        stats.atlasMS += performance.now() - start;
      }
      if (latest.runs.has(seed)) {
        const result = latest.runs.get(seed);
        latest.runs.delete(seed);
        latest.runs.set(seed, result);
        return result;
      }
      const start = performance.now(),
        projected = projectSurfaceHatches(
          source,
          latest.view,
          latest.projection,
          size,
        ),
        result = exactVisibleHatchRuns(projected, latest.atlas);
      stats.projections++;
      stats.visibilityBuilds++;
      stats.visibilityMS += performance.now() - start;
      latest.runs.set(seed, result);
      while (latest.runs.size > 2)
        latest.runs.delete(latest.runs.keys().next().value);
      return result;
    },
    stats,
  };
}

/** Exact original-triangle depths at arbitrary subpixel points in one capture. */
export function createHatchVisibilityAtlas(
  prepared,
  view,
  projection,
  size,
  { tileSize = 8, materialVisibility } = {},
) {
  const capture = { view, projection, size },
    width = Math.ceil(size / tileSize),
    tiles = Array.from({ length: width * width }, () => []),
    triangles = [],
    v = view.elements || view,
    meshes = [];
  for (const entry of prepared) meshes[entry.id - 1] = entry.mesh;
  const visibility = createMaterialVisibility(materialVisibility, meshes, view, projection, size);
  for (const mesh of prepared)
    for (const face of mesh.faces) {
      const n = face.normal,
        facing = v[2] * n[0] + v[6] * n[1] + v[10] * n[2],
        side = visibility?.has(mesh.id) ? T.DoubleSide : mesh.mesh.material.side;
      if (
        (side === T.FrontSide && facing <= 0) ||
        (side === T.BackSide && facing >= 0)
      )
        continue;
      const [a, b, c] = face.p.map((p) => project(p, capture)),
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(den) < 1e-12) continue;
      const xmin = Math.min(a[0], b[0], c[0]),
        xmax = Math.max(a[0], b[0], c[0]),
        ymin = Math.min(a[1], b[1], c[1]),
        ymax = Math.max(a[1], b[1], c[1]);
      if (xmax < 0 || ymax < 0 || xmin >= size || ymin >= size) continue;
      const index = triangles.length;
      const triangle = [...a, ...b, ...c, 1 / den, mesh.id];
      if (visibility?.has(mesh.id)) triangle.local = face.p.map(p => visibility.local(mesh.id, p));
      triangles.push(triangle);
      const x0 = clamp(Math.floor(xmin / tileSize), 0, width - 1),
        x1 = clamp(Math.floor(xmax / tileSize), 0, width - 1),
        y0 = clamp(Math.floor(ymin / tileSize), 0, width - 1),
        y1 = clamp(Math.floor(ymax / tileSize), 0, width - 1);
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) tiles[y * width + x].push(index);
    }
  return { size, tileSize, width, tiles, triangles, ...(visibility ? { visibility } : {}) };
}

export function exactHatchVisible(atlas, x, y, z, owner, tolerance = 1e-4) {
  if (x < 0 || y < 0 || x >= atlas.size || y >= atlas.size) return false;
  if (atlas.visibility && !atlas.visibility.retained(owner, x, y, z)) return false;
  const candidates =
    atlas.tiles[
      Math.floor(y / atlas.tileSize) * atlas.width +
        Math.floor(x / atlas.tileSize)
    ];
  let front = Infinity,
    frontOwner = -1;
  for (const id of candidates) {
    const t = atlas.triangles[id],
      u = ((t[4] - t[7]) * (x - t[6]) + (t[6] - t[3]) * (y - t[7])) * t[9],
      v = ((t[7] - t[1]) * (x - t[6]) + (t[0] - t[6]) * (y - t[7])) * t[9],
      w = 1 - u - v;
    if (u < -1e-7 || v < -1e-7 || w < -1e-7) continue;
    if (t.local && apertureFloat32CPU([0, 1, 2].map(k => u*t.local[0][k] + v*t.local[1][k] + w*t.local[2][k]))) continue;
    const d = u * t[2] + v * t[5] + w * t[8];
    if (
      d < front - 1e-7 ||
      (Math.abs(d - front) < 1e-7 && t[10] < frontOwner)
    ) {
      front = d;
      frontOwner = t[10];
    }
  }
  return frontOwner === owner && Math.abs(front - z) < tolerance;
}

/**
 * Exact centerline visibility intervals for a projected original-mesh segment.
 * Triangle barycentric half-planes give coverage entry/exit. Linear depth
 * crossings split every place where the nearest owner or depth test can change.
 * This cannot bridge a thin occluder between later drawing samples.
 */
export function visibleHatchSegmentIntervals(atlas, a, b, owner, tolerance = 1e-4) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    width = atlas.width,
    h = atlas.tileSize,
    ids = new Set(),
    events = [0, 1],
    cover = [];
  if (
    Math.max(a[0], b[0]) < 0 ||
    Math.max(a[1], b[1]) < 0 ||
    Math.min(a[0], b[0]) >= atlas.size ||
    Math.min(a[1], b[1]) >= atlas.size
  )
    return [];
  const xmin = clamp(Math.floor(Math.min(a[0], b[0]) / h), 0, width - 1),
    xmax = clamp(Math.floor(Math.max(a[0], b[0]) / h), 0, width - 1),
    ymin = clamp(Math.floor(Math.min(a[1], b[1]) / h), 0, width - 1),
    ymax = clamp(Math.floor(Math.max(a[1], b[1]) / h), 0, width - 1);
  for (let y = ymin; y <= ymax; y++)
    for (let x = xmin; x <= xmax; x++)
      for (const id of atlas.tiles[y * width + x]) ids.add(id);
  const root = (base, slope, level, lo, hi) => {
    if (Math.abs(slope) < 1e-14) return;
    const t = (level - base) / slope;
    if (t > lo + 1e-10 && t < hi - 1e-10) events.push(t);
  };
  for (const id of ids) {
    const t = atlas.triangles[id],
      u =
        ((t[4] - t[7]) * (a[0] - t[6]) + (t[6] - t[3]) * (a[1] - t[7])) * t[9],
      v =
        ((t[7] - t[1]) * (a[0] - t[6]) + (t[0] - t[6]) * (a[1] - t[7])) * t[9],
      du = ((t[4] - t[7]) * dx + (t[6] - t[3]) * dy) * t[9],
      dv = ((t[7] - t[1]) * dx + (t[0] - t[6]) * dy) * t[9];
    let lo = 0,
      hi = 1;
    for (const [base, slope] of [
      [u, du],
      [v, dv],
      [1 - u - v, -du - dv],
    ]) {
      if (Math.abs(slope) < 1e-15) {
        if (base < -1e-7) {
          hi = -1;
          break;
        }
      } else {
        const cut = (-1e-7 - base) / slope;
        if (slope > 0) lo = Math.max(lo, cut);
        else hi = Math.min(hi, cut);
      }
    }
    if (hi - lo < 1e-10) continue;
    const z = u * t[2] + v * t[5] + (1 - u - v) * t[8],
      zd = du * t[2] + dv * t[5] - (du + dv) * t[8],
      difference = z - a[2],
      slope = zd - dz;
    // A triangle farther behind the surface than the acceptance tolerance can
    // neither establish support nor hide this segment.
    if (Math.min(difference + slope * lo, difference + slope * hi) > tolerance)
      continue;
    const entry = { lo, hi, z, zd, owner: t[10] };
    if (t.local) {
      entry.localA = [0,1,2].map(k => u*t.local[0][k] + v*t.local[1][k] + (1-u-v)*t.local[2][k]);
      entry.localD = [0,1,2].map(k => du*t.local[0][k] + dv*t.local[1][k] - (du+dv)*t.local[2][k]);
      events.push(...apertureSegmentCuts(entry.localA, entry.localA.map((v,k) => v+entry.localD[k]), lo, hi));
    }
    cover.push(entry);
    events.push(lo, hi);
    root(difference, slope, -tolerance, lo, hi);
    root(difference, slope, tolerance, lo, hi);
  }
  if (atlas.visibility?.has(owner)) {
    const localA = atlas.visibility.point(owner, ...a), localB = atlas.visibility.point(owner, ...b);
    events.push(...apertureSegmentCuts(localA, localB));
  }
  // Screen clipping also has exact parameter boundaries.
  root(a[0], dx, 0, 0, 1);
  root(a[0], dx, atlas.size, 0, 1);
  root(a[1], dy, 0, 0, 1);
  root(a[1], dy, atlas.size, 0, 1);
  for (let i = 0; i < cover.length; i++)
    for (let j = i + 1; j < cover.length; j++) {
      const x = cover[i],
        y = cover[j],
        lo = Math.max(x.lo, y.lo),
        hi = Math.min(x.hi, y.hi);
      if (hi <= lo) continue;
      root(x.z - y.z, x.zd - y.zd, -1e-7, lo, hi);
      root(x.z - y.z, x.zd - y.zd, 0, lo, hi);
      root(x.z - y.z, x.zd - y.zd, 1e-7, lo, hi);
    }
  events.sort((a, b) => a - b);
  const cuts = events.filter((x, i) => !i || x - events[i - 1] > 1e-9),
    visible = [];
  for (let i = 1; i < cuts.length; i++) {
    const lo = cuts[i - 1],
      hi = cuts[i],
      mid = (lo + hi) * 0.5,
      x = a[0] + dx * mid,
      y = a[1] + dy * mid;
    if (x < 0 || y < 0 || x >= atlas.size || y >= atlas.size) continue;
    if (atlas.visibility && !atlas.visibility.retained(owner, x, y, a[2] + dz * mid)) continue;
    let front = Infinity,
      frontOwner = -1;
    for (const c of cover) {
      if (mid < c.lo || mid > c.hi) continue;
      if (c.localA && apertureFloat32CPU(c.localA.map((v,k) => v + c.localD[k]*mid))) continue;
      const z = c.z + c.zd * mid;
      if (
        z < front - 1e-7 ||
        (Math.abs(z - front) < 1e-7 && c.owner < frontOwner)
      ) {
        front = z;
        frontOwner = c.owner;
      }
    }
    if (frontOwner !== owner || Math.abs(front - (a[2] + dz * mid)) > tolerance)
      continue;
    const last = visible.at(-1);
    if (last && Math.abs(last[1] - lo) < 1e-9) last[1] = hi;
    else visible.push([lo, hi]);
  }
  return visible;
}

/** Material/light-independent compact screen runs for the p5 drawing module. */
export function exactVisibleHatchRuns(
  projected,
  atlas,
  { samplePixels = 0.7 } = {},
) {
  if (!projected.orthographic)
    throw new Error(
      "Exact hatch atlas currently requires an orthographic capture",
    );
  const points = [],
    depths = atlas.visibility ? [] : null,
    runs = [],
    ranks = [],
    q = projected.points,
    stats = { visible: 0, hidden: 0 };
  for (let path = 0; path < projected.owners.length; path++) {
    const owner = projected.owners[path],
      family = projected.families[path];
    let runStart = -1;
    let n = Math.imul(path + 1, 374761393) ^ Math.imul(owner, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    const rank = ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    const flush = () => {
      if (runStart < 0) return;
      const count = points.length / 2 - runStart;
      if (count >= 2) {
        runs.push(runStart, count, owner, family);
        ranks.push(rank);
      } else {
        points.length = runStart * 2;
        if (depths) depths.length = runStart;
      }
      runStart = -1;
    };
    for (
      let j = projected.offsets[path];
      j + 1 < projected.offsets[path + 1];
      j++
    ) {
      const a = j * 3,
        b = a + 3,
        dx = q[b] - q[a],
        dy = q[b + 1] - q[a + 1],
        intervals = visibleHatchSegmentIntervals(
          atlas,
          [q[a], q[a + 1], q[a + 2]],
          [q[b], q[b + 1], q[b + 2]],
          owner,
        );
      if (!intervals.length) {
        flush();
        stats.hidden++;
        continue;
      }
      for (const [lo, hi] of intervals) {
        if (lo > 1e-9) flush();
        const count = Math.max(
          1,
          Math.ceil((Math.hypot(dx, dy) * (hi - lo)) / samplePixels),
        );
        for (let k = 0; k <= count; k++) {
          const t = lo + ((hi - lo) * k) / count,
            x = q[a] + dx * t,
            y = q[a + 1] + dy * t;
          if (runStart < 0) runStart = points.length / 2;
          const last = points.length;
          if (
            last < 2 ||
            Math.hypot(points[last - 2] - x, points[last - 1] - y) > 1e-6
          )
            {
              points.push(x, y);
              if (depths) depths.push(q[a + 2] + (q[b + 2] - q[a + 2]) * t);
            }
          stats.visible++;
        }
        if (hi < 1 - 1e-9) {
          flush();
          stats.hidden++;
        }
      }
    }
    flush();
  }
  return {
    version: 1,
    points: Float32Array.from(points),
    ...(depths ? { depths: Float32Array.from(depths) } : {}),
    runs: Uint32Array.from(runs),
    ranks: Float32Array.from(ranks),
    stats,
  };
}
