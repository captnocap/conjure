import { BufferAttribute, BufferGeometry } from "./vendor/three.module.min.js";

// A render-only view of the existing baked geometry. Every existing attribute,
// including the live light-AO mask, is shared by identity. Cloth coordinates are
// fixed to the source object; camera/light changes never regenerate these charts.
const charts = new WeakMap();
const MAX_CHART_VARIANTS = 4;
const TAU = Math.PI * 2;
const even = (length, pitch) => Math.max(2, Math.round(length / pitch / 2) * 2);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ellipse = (a, b) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
const xyz = (a, i) => [a.getX(i), a.getY(i), a.getZ(i)];
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const distance = (a, b, scale) => Math.hypot(...a.map((x, i) => (x - b[i]) * scale[i]));
const normalKey = (a) => a.map((x) => Math.round(x * 1e5)).join(",");
const barycentric = (p, tri) => {
  const v0 = sub(tri[1], tri[0]), v1 = sub(tri[2], tri[0]), v2 = sub(p, tri[0]);
  const aa = dot(v0, v0), ab = dot(v0, v1), bb = dot(v1, v1);
  const pa = dot(v2, v0), pb = dot(v2, v1), det = aa * bb - ab * ab;
  if (!(det > 1e-24)) return null;
  const b = (bb * pa - ab * pb) / det, c = (aa * pb - ab * pa) / det;
  return [1 - b - c, b, c];
};
const at = (array, t) => {
  const p = clamp(t, 0, 1) * (array.length - 1), i = Math.min(array.length - 2, Math.floor(p));
  return array[i] + (array[i + 1] - array[i]) * (p - i);
};

// r180 ExtrudeGeometry emits six vertices per side quad, contour-edge first,
// depth/bevel-layer second: [a,b,d,b,c,d]. Reading those exact source facets
// avoids reconstructing the bevel shape or using the discontinuous side UVs.
// The one contour and its first layer are the original closed Shape outline.
function archChart(mesh, baked, scale, pitch, coord, period) {
  const source = mesh.geometry, options = source.parameters.options;
  const shapes = Array.isArray(source.parameters.shapes) ? source.parameters.shapes : [source.parameters.shapes];
  if (shapes.length !== 1 || shapes[0].holes.length || options.extrudePath)
    throw new Error("Woven arch chart expects the fixed single-contour straight extrusion");
  const layers = (options.steps ?? 1) + (options.bevelEnabled === false ? 0 : 2 * (options.bevelSegments ?? 3));
  const group = source.groups.find((item) => item.materialIndex === 1);
  if (!group || group.count % (6 * layers)) throw new Error("Unexpected r180 arch side topology");
  const p = source.getAttribute("position"), n = source.getAttribute("normal");
  const edgeCount = group.count / (6 * layers), length = [0], across = [];
  for (let e = 0; e < edgeCount; e++) {
    const base = group.start + e * layers * 6;
    length.push(length[e] + distance(xyz(p, base), xyz(p, base + 1), scale));
    const sequence = [0];
    for (let layer = 0; layer < layers; layer++) {
      const a = base + layer * 6;
      sequence.push(sequence[layer] + distance(xyz(p, a), xyz(p, a + 2), scale));
    }
    across.push(sequence);
  }
  const total = length.at(-1), repeat = even(total, pitch), facets = [], buckets = new Map();
  for (let e = 0; e < edgeCount; e++) {
    const next = (e + 1) % edgeCount;
    for (let layer = 0; layer < layers; layer++) {
      const base = group.start + (e * layers + layer) * 6;
      const a = [length[e] / total * repeat, across[e][layer] / pitch];
      const b = [length[e + 1] / total * repeat, across[next][layer] / pitch];
      const c = [length[e + 1] / total * repeat, across[next][layer + 1] / pitch];
      const d = [length[e] / total * repeat, across[e][layer + 1] / pitch];
      const uv = [a, b, d, b, c, d];
      for (let t = 0; t < 6; t += 3) {
        const vertices = [0, 1, 2].map((k) => xyz(p, base + t + k));
        const normal = xyz(n, base + t), key = normalKey(normal);
        const facet = { vertices, normal, uv: uv.slice(t, t + 3) };
        facets.push(facet);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(facet);
      }
    }
  }
  const bp = baked.getAttribute("position"), bn = baked.getAttribute("normal");
  const index = baked.index, count = index ? index.count : bp.count;
  let sideTriangles = 0;
  for (let t = 0; t < count; t += 3) {
    const ids = [0, 1, 2].map((k) => index ? index.getX(t + k) : t + k);
    const normal = xyz(bn, ids[0]);
    if (Math.abs(normal[2]) > 1 - 1e-6) {
      for (const i of ids) {
        coord[i * 2] = bp.getX(i) * scale[0] / pitch;
        coord[i * 2 + 1] = bp.getY(i) * scale[1] / pitch;
      }
      continue;
    }
    const vertices = ids.map((i) => xyz(bp, i));
    const center = [0, 1, 2].map((axis) => vertices.reduce((sum, v) => sum + v[axis], 0) / 3);
    let found;
    // Normals survive the bake unchanged. The fallback tolerates caller-provided
    // interpolation precision without silently accepting a different panel.
    const candidates = buckets.get(normalKey(normal)) || facets.filter((f) => dot(f.normal, normal) > 1 - 1e-7);
    for (const facet of candidates) {
      if (Math.abs(dot(sub(center, facet.vertices[0]), facet.normal)) > 2e-5) continue;
      const weights = barycentric(center, facet.vertices);
      if (weights && weights.every((x) => x >= -2e-4 && x <= 1.0002)) { found = facet; break; }
    }
    if (!found) throw new Error(`Woven arch chart could not match baked triangle ${t / 3}`);
    for (let k = 0; k < 3; k++) {
      const weights = barycentric(vertices[k], found.vertices);
      if (!weights || weights.some((x) => x < -0.002 || x > 1.002))
        throw new Error(`Woven arch chart triangle crosses an original facet at ${t / 3}`);
      const i = ids[k];
      coord[i * 2] = weights.reduce((sum, x, j) => sum + x * found.uv[j][0], 0);
      coord[i * 2 + 1] = weights.reduce((sum, x, j) => sum + x * found.uv[j][1], 0);
      period[i * 2] = repeat;
    }
    sideTriangles++;
  }
  return { type: "planar-front-and-perimeter-strip", perimeter: total, repeat, layers, edgeCount, sideTriangles };
}

/** Return a cached attribute-only geometry view. Caller must retain the original
 * baked geometry when applying visibility masks: this view shares its attributes.
 * Pitch is approximate physical yarn-cell width, not a measured textile scale.
 * Closed-axis counts are even so the 2x2 weave and periodic irregularity close.
 */
export function createWovenGeometry(mesh, bakedGeometry, { pitch = 0.035 } = {}) {
  if (!mesh?.geometry || !bakedGeometry?.getAttribute("position")) throw new TypeError("Woven charts require source mesh and baked geometry");
  if (!(pitch > 0 && Number.isFinite(pitch))) throw new RangeError("Woven pitch must be finite and positive");
  const rawScale = mesh.scale.toArray(), scale = rawScale.map(Math.abs);
  if (scale.some((x) => !(x > 0 && Number.isFinite(x)))) throw new RangeError("Woven mesh scale must be finite and nonzero");
  let perGeometry = charts.get(bakedGeometry);
  if (!perGeometry) { perGeometry = new WeakMap(); charts.set(bakedGeometry, perGeometry); }
  let perSource = perGeometry.get(mesh.geometry);
  if (!perSource) { perSource = new Map(); perGeometry.set(mesh.geometry, perSource); }
  const key = [...rawScale, pitch].join(",");
  if (perSource.has(key)) {
    const cached = perSource.get(key);
    // Keep the active setting recent while bounding arbitrary pitch/scale edits.
    perSource.delete(key);
    perSource.set(key, cached);
    return cached;
  }
  const position = bakedGeometry.getAttribute("position"), normal = bakedGeometry.getAttribute("normal"), uv = bakedGeometry.getAttribute("uv");
  if (!normal || !uv) throw new Error("Woven charts require preserved normals and native UVs");
  const count = position.count, coord = new Float32Array(count * 2), polar = new Float32Array(count).fill(1), period = new Float32Array(count * 2);
  const p = mesh.geometry.parameters || {}, type = mesh.geometry.type;
  let metadata = { type, pitch, scale: rawScale };
  if (type === "ExtrudeGeometry") metadata = { ...metadata, ...archChart(mesh, bakedGeometry, scale, pitch, coord, period) };
  else {
    let repeats = [0, 0], spans = [1, 1], profile, tubeLengths;
    if (type === "LatheGeometry") {
      profile = [0];
      const radialScale = Math.sqrt((scale[0] ** 2 + scale[2] ** 2) / 2);
      for (let i = 1; i < p.points.length; i++) profile.push(profile[i - 1] + Math.hypot((p.points[i].x - p.points[i - 1].x) * radialScale, (p.points[i].y - p.points[i - 1].y) * scale[1]));
      const radius = p.points.reduce((sum, point) => sum + point.x, 0) / p.points.length;
      repeats[0] = even(ellipse(radius * scale[0], radius * scale[2]), pitch);
      spans = [repeats[0], profile.at(-1) / pitch];
    } else if (type === "TorusGeometry") {
      repeats = [even(ellipse(p.radius * scale[0], p.radius * scale[1]), pitch), even(ellipse(p.tube * (scale[0] + scale[1]) / 2, p.tube * scale[2]), pitch)];
      spans = repeats.slice();
    } else if (type === "CylinderGeometry") {
      const radius = (p.radiusTop + p.radiusBottom) / 2;
      repeats[0] = even(ellipse(radius * scale[0], radius * scale[2]), pitch);
      spans = [repeats[0], p.height * scale[1] / pitch];
    } else if (type === "TubeGeometry") {
      tubeLengths = [0];
      let previous = p.path.getPointAt(0).toArray();
      for (let j = 1; j <= 256; j++) {
        const current = p.path.getPointAt(j / 256).toArray();
        tubeLengths.push(tubeLengths[j - 1] + distance(previous, current, scale)); previous = current;
      }
      // Native U is arc length for the source curve. Uniform scale uses its exact
      // cached length; a nonuniform scale uses the sampled transformed length.
      if (scale[0] === scale[1] && scale[1] === scale[2]) tubeLengths = [0, p.path.getLength() * scale[0]];
      let circumference = 0;
      const frames = p.path.computeFrenetFrames(p.tubularSegments, p.closed);
      for (let j = 0; j <= p.tubularSegments; j++) {
        const a = Math.hypot(...frames.normals[j].toArray().map((x, i) => x * scale[i]));
        const b = Math.hypot(...frames.binormals[j].toArray().map((x, i) => x * scale[i]));
        circumference += ellipse(p.radius * a, p.radius * b) / (p.tubularSegments + 1);
      }
      repeats = [p.closed ? even(tubeLengths.at(-1), pitch) : 0, even(circumference, pitch)];
      spans = [repeats[0] || tubeLengths.at(-1) / pitch, repeats[1]];
    } else if (type === "SphereGeometry" || type === "IcosahedronGeometry") {
      const radius = p.radius, rx = radius * scale[0], ry = radius * scale[1], rz = radius * scale[2];
      repeats[0] = even(ellipse(rx, rz), pitch);
      spans = [repeats[0], ellipse(ry, (rx + rz) / 2) * 0.5 / pitch];
    } else if (type !== "BoxGeometry" && type !== "PlaneGeometry") throw new Error(`No fixed-scene woven chart for ${type}`);
    for (let i = 0; i < count; i++) {
      let u = uv.getX(i) * spans[0], v = uv.getY(i) * spans[1], pu = repeats[0], pv = repeats[1];
      if (type === "BoxGeometry") {
        const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i));
        const dimensions = nx > 0.9 ? [p.depth * scale[2], p.height * scale[1]] : ny > 0.9 ? [p.width * scale[0], p.depth * scale[2]] : [p.width * scale[0], p.height * scale[1]];
        u = uv.getX(i) * dimensions[0] / pitch; v = uv.getY(i) * dimensions[1] / pitch;
      } else if (type === "PlaneGeometry") {
        u = position.getX(i) * scale[0] / pitch; v = position.getY(i) * scale[1] / pitch;
      } else if (type === "LatheGeometry") v = at(profile, uv.getY(i)) / pitch;
      else if (type === "CylinderGeometry" && Math.abs(normal.getY(i)) > 0.999) {
        // Cartesian cap UVs never pinch at the center, and caps are separate panels.
        const radius = normal.getY(i) > 0 ? p.radiusTop : p.radiusBottom;
        u = uv.getX(i) * 2 * radius * scale[0] / pitch; v = uv.getY(i) * 2 * radius * scale[2] / pitch; pu = 0;
      } else if (type === "TubeGeometry") u = at(tubeLengths, uv.getX(i)) / tubeLengths.at(-1) * spans[0];
      else if (type === "SphereGeometry" || type === "IcosahedronGeometry") {
        // Longitude is undefined at each pole. Fade into a finite aggregate over
        // a physical cap; retain the native per-triangle repaired seam values.
        const horizontal = Math.hypot(position.getX(i) * scale[0], position.getZ(i) * scale[2]);
        polar[i] = smooth(horizontal / Math.max(1.5 * pitch, p.radius * Math.min(scale[0], scale[2]) * 0.08));
      }
      coord[i * 2] = u; coord[i * 2 + 1] = v;
      period[i * 2] = pu; period[i * 2 + 1] = pv;
    }
    metadata = { ...metadata, repeats, spans, profileLength: profile?.at(-1), curveLength: tubeLengths?.at(-1) };
  }
  const geometry = new BufferGeometry();
  for (const [name, attribute] of Object.entries(bakedGeometry.attributes)) geometry.setAttribute(name, attribute);
  geometry.setIndex(bakedGeometry.index);
  geometry.groups = bakedGeometry.groups;
  geometry.morphAttributes = bakedGeometry.morphAttributes;
  geometry.morphTargetsRelative = bakedGeometry.morphTargetsRelative;
  geometry.drawRange = bakedGeometry.drawRange;
  geometry.boundingBox = bakedGeometry.boundingBox;
  geometry.boundingSphere = bakedGeometry.boundingSphere;
  geometry.userData = { ...bakedGeometry.userData, wovenChart: metadata };
  geometry.setAttribute("wovenCoord", new BufferAttribute(coord, 2));
  geometry.setAttribute("wovenPolar", new BufferAttribute(polar, 1));
  geometry.setAttribute("wovenPeriod", new BufferAttribute(period, 2));
  perSource.set(key, geometry);
  if (perSource.size > MAX_CHART_VARIANTS) {
    // Eviction releases only our reference. Callers may still render an evicted
    // view, and disposing it would also invalidate its shared GPU attributes.
    perSource.delete(perSource.keys().next().value);
  }
  return geometry;
}
