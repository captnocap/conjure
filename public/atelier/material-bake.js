import {
  BufferAttribute,
  BufferGeometry,
  Matrix3,
  Vector3,
} from "./vendor/three.module.min.js";
import { apertureFloat32CPU, APERTURE_MODEL_FINGERPRINT, ELIGIBLE_IDS, PERFORATED_SHELL_ID } from "./perforated-shell-field.js";

const SHELL_ELIGIBLE_MASK = ELIGIBLE_IDS.reduce((mask, id) => mask | (2 ** (id - 1)), 0) >>> 0;
const SHELL_BACK_SAMPLES = 16;
// Source meshes switch to render geometries during assignment. Retain the
// original geometry and backing storage while this opt-in bake stays alive.
const shellBakeSources = new WeakMap();

/**
 * Camera-independent material maps for a fixed, static triangle scene.
 *
 * Curvature is a discrete tangent-space shape-operator fit to geometry-derived
 * normals. convex/concave are the positive/negative principal magnitudes, in
 * inverse WORLD units, not an arbitrary 0..1 texture. A sphere of radius r has
 * convex ~= 1/r; a saddle can have BOTH channels. Normals are averaged only
 * across welded edges below creaseAngle, leaving planar box faces at zero.
 * Sharp edges are represented separately by exact triangle edge distances.
 *
 * AO is cosine-weighted hemisphere visibility in [0,1], tested against ALL
 * input triangles through a BVH, up to maxDistance world units. It treats all
 * surfaces as opaque, double-sided occluders by default. Opt-in cacheAOVisibility
 * retains all intersected object bits per ray (at most 32 meshes), allowing
 * applyOpaqueMask to exclude explicit transparent assignments without retracing.
 * This is binary straight-ray visibility, not refractive ambient transport.
 * The default 16 deterministic
 * samples are deliberately a low-cost approximation, not converged lighting.
 * Vertex interpolation cannot reveal contacts between vertices (particularly
 * a four-vertex ground plane). Increasing samples cannot fix coarse geometry.
 * Open/non-manifold boundaries have no invented dihedral curvature.
 *
 * Call updateMatrixWorld before baking. Geometry, attributes, materials and
 * transforms are never modified. Maps do not depend on camera, image, noise or
 * UVs. Optional refineAO copies UVs and other attributes barycentrically into
 * render-only geometry; it never changes the original triangle map/metadata.
 * refineAO accepts maxEdgeLength (default .2), numeric meshIndices (default all
 * except floor index 0), maxTriangles (100000 generated target triangles), and
 * maxAdditionalRays (750000). Only constant-normal triangles may subdivide.
 * Keep original geometry sources for seeded marks and worker snapshots.
 */
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const FAR_EDGE = 1e4;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const length = (a) => Math.hypot(a[0], a[1], a[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a) => {
  const d = length(a);
  return d > 1e-30 ? a.map((x) => x / d) : [0, 1, 0];
};
const point = (attribute, i, m) => {
  const x = attribute.getX(i),
    y = attribute.getY(i),
    z = attribute.getZ(i);
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
};
const basis = (n) => {
  const t = unit(cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n));
  return [t, cross(n, t)];
};

function settings(options) {
  const result = {
    samples: options.samples ?? 16,
    maxDistance: options.maxDistance ?? 1.5,
    creaseAngle: options.creaseAngle ?? 25,
    weldTolerance: options.weldTolerance ?? null,
    rayBias:
      options.rayBias ?? Math.max(1e-6, (options.maxDistance ?? 1.5) * 1e-4),
  };
  if (
    !Number.isInteger(result.samples) ||
    result.samples < 1 ||
    result.samples > 512
  )
    throw new RangeError("samples must be an integer from 1 to 512");
  if (!(result.maxDistance > 0) || !Number.isFinite(result.maxDistance))
    throw new RangeError("maxDistance must be finite and positive");
  if (!(result.creaseAngle > 0 && result.creaseAngle < 180))
    throw new RangeError("creaseAngle must be between 0 and 180 degrees");
  if (!(result.rayBias > 0 && result.rayBias < result.maxDistance))
    throw new RangeError(
      "rayBias must be positive and smaller than maxDistance",
    );
  if (
    result.weldTolerance !== null &&
    !(result.weldTolerance > 0 && Number.isFinite(result.weldTolerance))
  )
    throw new RangeError("weldTolerance must be finite and positive");
  return result;
}

/** Shell caching is bounded to the admitted original object slots and types. */
function shellCacheSettings(solids, options) {
  if (options.cachePerforatedShell !== undefined && typeof options.cachePerforatedShell !== "boolean")
    throw new TypeError("cachePerforatedShell must be a boolean");
  if (!options.cachePerforatedShell) return false;
  if (options.cacheAOVisibility !== true)
    throw new TypeError("cachePerforatedShell requires cacheAOVisibility: true");
  if (solids[6]?.geometry?.type !== "LatheGeometry" || solids[9]?.geometry?.type !== "SphereGeometry")
    throw new TypeError("Perforated shell caching requires Vase 7 (LatheGeometry) and Sphere 10 (SphereGeometry) in original mesh order");
  return true;
}

/** Plain data only: mesh selection is keyed by numeric index values, never callbacks. */
function refinementSettings(value, meshCount) {
  if (value === undefined || value === false || value === null) return null;
  const input = value === true ? {} : value;
  if (typeof input !== "object" || Array.isArray(input))
    throw new TypeError("refineAO must be true, false, or a settings object");
  const allowed = new Set([
    "maxEdgeLength",
    "meshIndices",
    "maxTriangles",
    "maxAdditionalRays",
  ]);
  for (const key of Object.keys(input))
    if (!allowed.has(key))
      throw new TypeError(`Unknown refineAO setting: ${key}`);
  const maxEdgeLength = input.maxEdgeLength ?? 0.2;
  const maxTriangles = input.maxTriangles ?? 100000;
  const maxAdditionalRays = input.maxAdditionalRays ?? 750000;
  if (!(maxEdgeLength > 0 && Number.isFinite(maxEdgeLength)))
    throw new RangeError("refineAO.maxEdgeLength must be finite and positive");
  if (!Number.isSafeInteger(maxTriangles) || maxTriangles < 1)
    throw new RangeError(
      "refineAO.maxTriangles must be a positive safe integer",
    );
  if (!Number.isSafeInteger(maxAdditionalRays) || maxAdditionalRays < 0)
    throw new RangeError(
      "refineAO.maxAdditionalRays must be a nonnegative safe integer",
    );
  const requested =
    input.meshIndices ??
    Array.from({ length: Math.max(0, meshCount - 1) }, (_, i) => i + 1);
  if (
    !Array.isArray(requested) ||
    requested.some((i) => !Number.isInteger(i) || i < 0 || i >= meshCount)
  )
    throw new RangeError(
      "refineAO.meshIndices must contain valid mesh indices",
    );
  return {
    maxEdgeLength,
    meshIndices: [...new Set(requested)].sort((a, b) => a - b),
    maxTriangles,
    maxAdditionalRays,
  };
}

function collectMesh(mesh, options) {
  const geometry = mesh.geometry,
    position = geometry?.getAttribute("position");
  if (!position || position.itemSize < 3)
    throw new TypeError(
      "Every solid must have a three-component position attribute",
    );
  const matrix = mesh.matrixWorld?.elements ?? IDENTITY;
  const determinant = dot(
    [matrix[0], matrix[1], matrix[2]],
    cross(
      [matrix[4], matrix[5], matrix[6]],
      [matrix[8], matrix[9], matrix[10]],
    ),
  );
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-20)
    throw new RangeError("Cannot bake a singular mesh transform");
  const orientation = Math.sign(determinant);
  const world = Array.from({ length: position.count }, (_, i) =>
    point(position, i, matrix),
  );
  const low = [Infinity, Infinity, Infinity],
    high = [-Infinity, -Infinity, -Infinity];
  for (const p of world)
    for (let j = 0; j < 3; j++) {
      if (!Number.isFinite(p[j]))
        throw new RangeError("Cannot bake a non-finite vertex");
      low[j] = Math.min(low[j], p[j]);
      high[j] = Math.max(high[j], p[j]);
    }
  const tolerance =
    options.weldTolerance ?? Math.max(1e-8, length(sub(high, low)) * 1e-6);
  const buckets = new Map(),
    welded = [],
    originalToWeld = new Uint32Array(position.count);
  // Search neighboring cells as well, so a UV seam on a bucket boundary welds.
  world.forEach((p, original) => {
    const cell = p.map((x) => Math.floor(x / tolerance));
    let found = -1;
    for (let x = -1; x <= 1 && found < 0; x++)
      for (let y = -1; y <= 1 && found < 0; y++)
        for (let z = -1; z <= 1 && found < 0; z++) {
          const candidates = buckets.get(
            `${cell[0] + x},${cell[1] + y},${cell[2] + z}`,
          );
          if (candidates)
            for (const candidate of candidates) {
              if (length(sub(welded[candidate], p)) <= tolerance) {
                found = candidate;
                break;
              }
            }
        }
    if (found < 0) {
      found = welded.length;
      welded.push(p);
      const key = cell.join(","),
        list = buckets.get(key) ?? [];
      list.push(found);
      buckets.set(key, list);
    }
    originalToWeld[original] = found;
  });
  const index = geometry.getIndex(),
    count = index?.count ?? position.count;
  const faces = [],
    edges = new Map();
  const start = Math.max(0, geometry.drawRange?.start ?? 0);
  const end = Math.min(count, start + (geometry.drawRange?.count ?? Infinity));
  for (let i = start; i + 2 < end; i += 3) {
    const original = [0, 1, 2].map((j) => (index ? index.getX(i + j) : i + j));
    const ids = original.map((j) => originalToWeld[j]);
    const p = original.map((j) => world[j]);
    const areaVector = cross(sub(p[1], p[0]), sub(p[2], p[0]));
    const twiceArea = length(areaVector);
    if (new Set(ids).size < 3 || twiceArea < tolerance * tolerance * 1e-4)
      continue;
    const normal = areaVector.map((x) => (x * orientation) / twiceArea);
    const f = {
      original,
      ids,
      p,
      normal,
      twiceArea,
      sourceOffset: i,
      index: faces.length,
      edgeKinds: [0, 0, 0],
      groups: [],
    };
    faces.push(f);
    for (let opposite = 0; opposite < 3; opposite++) {
      const a = ids[(opposite + 1) % 3],
        b = ids[(opposite + 2) % 3];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      const edge = edges.get(key) ?? { a, b, faces: [] };
      edge.faces.push({ face: f, opposite });
      edges.set(key, edge);
    }
  }
  const parent = Uint32Array.from({ length: faces.length * 3 }, (_, i) => i);
  const root = (v) => {
    while (parent[v] !== v) {
      parent[v] = parent[parent[v]];
      v = parent[v];
    }
    return v;
  };
  const join = (a, b) => {
    parent[root(a)] = root(b);
  };
  const cosine = Math.cos((options.creaseAngle * Math.PI) / 180);
  const curvatureSigns = new Uint8Array(welded.length);
  let convexEdges = 0,
    concaveEdges = 0,
    boundaryEdges = 0,
    nonmanifoldEdges = 0;
  for (const edge of edges.values()) {
    if (edge.faces.length !== 2) {
      if (edge.faces.length === 1) boundaryEdges++;
      else nonmanifoldEdges++;
      continue;
    }
    const [first, second] = edge.faces;
    const signed = -dot(
      first.face.normal,
      sub(second.face.p[second.opposite], welded[edge.a]),
    );
    const kind =
      signed > tolerance * 0.1 ? 1 : signed < -tolerance * 0.1 ? -1 : 0;
    const signBit = kind > 0 ? 1 : kind < 0 ? 2 : 0;
    curvatureSigns[edge.a] |= signBit;
    curvatureSigns[edge.b] |= signBit;
    if (dot(first.face.normal, second.face.normal) >= cosine) {
      for (const id of [edge.a, edge.b])
        join(
          first.face.index * 3 + first.face.ids.indexOf(id),
          second.face.index * 3 + second.face.ids.indexOf(id),
        );
    } else {
      first.face.edgeKinds[first.opposite] = kind;
      second.face.edgeKinds[second.opposite] = kind;
      if (kind > 0) convexEdges++;
      else if (kind < 0) concaveEdges++;
    }
  }
  const groups = [],
    groupIds = new Map();
  for (const f of faces)
    for (let corner = 0; corner < 3; corner++) {
      const r = root(f.index * 3 + corner);
      let id = groupIds.get(r);
      if (id === undefined) {
        id = groups.length;
        groupIds.set(r, id);
        groups.push({
          p: f.p[corner],
          signs: curvatureSigns[f.ids[corner]],
          normal: [0, 0, 0],
          neighbors: new Set(),
          originals: new Set(),
        });
      }
      f.groups[corner] = id;
      const g = groups[id];
      const va = unit(sub(f.p[(corner + 1) % 3], f.p[corner]));
      const vb = unit(sub(f.p[(corner + 2) % 3], f.p[corner]));
      const angle = Math.acos(clamp(dot(va, vb), -1, 1));
      for (let j = 0; j < 3; j++) g.normal[j] += angle * f.normal[j];
      g.originals.add(f.original[corner]);
    }
  for (const g of groups) g.normal = unit(g.normal);
  for (const f of faces)
    for (let j = 0; j < 3; j++) {
      groups[f.groups[j]].neighbors.add(f.groups[(j + 1) % 3]);
      groups[f.groups[j]].neighbors.add(f.groups[(j + 2) % 3]);
    }
  for (const g of groups) {
    const [t, b] = basis(g.normal);
    let aa = 0,
      ab = 0,
      bb = 0,
      bc = 0,
      cc = 0,
      ra = 0,
      rb = 0,
      rc = 0;
    for (const neighbor of g.neighbors) {
      const other = groups[neighbor],
        dp = sub(other.p, g.p),
        dn = sub(other.normal, g.normal);
      const distance = length(dp);
      if (distance <= tolerance) continue;
      const u = dot(dp, t) / distance,
        v = dot(dp, b) / distance;
      const nu = dot(dn, t) / distance,
        nv = dot(dn, b) / distance;
      aa += u * u;
      ab += u * v;
      bb += u * u + v * v;
      bc += u * v;
      cc += v * v;
      ra += u * nu;
      rb += v * nu + u * nv;
      rc += v * nv;
    }
    const determinant = aa * (bb * cc - bc * bc) - ab * ab * cc;
    let a = 0,
      bValue = 0,
      c = 0;
    if (Math.abs(determinant) > 1e-12) {
      a =
        ((bb * cc - bc * bc) * ra - ab * cc * rb + ab * bc * rc) / determinant;
      bValue = (-ab * cc * ra + aa * cc * rb - aa * bc * rc) / determinant;
      c =
        (ab * bc * ra - aa * bc * rb + (aa * bb - ab * ab) * rc) / determinant;
    }
    // Retain the fitted tensor for curvature-aligned surface line fields.
    g.shape = [a, bValue, c];
    g.tangent = t;
    g.bitangent = b;
    g.fitDeterminant = determinant;
    const mean = (a + c) * 0.5,
      spread = Math.hypot((a - c) * 0.5, bValue);
    let maximum = mean + spread,
      minimum = mean - spread;
    // A least-squares fit can overshoot on anisotropic, coarse triangles.
    // Actual incident dihedral signs constrain that numerical overshoot: a
    // locally convex polyhedron cannot acquire fictitious concave pooling.
    if (!(g.signs & 2)) {
      maximum = Math.max(0, maximum);
      minimum = Math.max(0, minimum);
    }
    if (!(g.signs & 1)) {
      maximum = Math.min(0, maximum);
      minimum = Math.min(0, minimum);
    }
    g.convex = Math.max(0, maximum);
    g.concave = Math.max(0, -minimum);
    g.signedMean = (maximum + minimum) * 0.5;
  }
  return {
    mesh,
    world,
    faces,
    groups,
    originalToWeld,
    tolerance,
    positionCount: position.count,
    metadata: {
      vertexCount: position.count,
      weldedVertexCount: welded.length,
      triangleCount: faces.length,
      smoothVertexCount: groups.length,
      convexEdges,
      concaveEdges,
      boundaryEdges,
      nonmanifoldEdges,
      weldTolerance: tolerance,
    },
  };
}

// Fresh owned geometry data. Does not perform AO or edit source attributes.
export function prepareSurfaceGeometry(mesh, options = {}) {
  return collectMesh(mesh, settings(options));
}

function buildBVH(data, capture = false, cachePerforatedShell = false) {
  const eligibleMask = cachePerforatedShell ? SHELL_ELIGIBLE_MASK : 0;
  if (capture && data.length > 32) throw new RangeError("AO visibility caching supports at most 32 objects");
  const triangles = capture
    ? data.flatMap((d, meshIndex) => d.faces.map((f) => ({ ...f, objectBit: (2 ** meshIndex) >>> 0, ...(eligibleMask & (2 ** meshIndex) ? { localP: f.original.map(i => point(d.mesh.geometry.getAttribute("position"), i, IDENTITY)) } : {}) })))
    : data.flatMap((d) => d.faces);
  const recordedMasks = [];
  const survivingMasks = cachePerforatedShell ? [] : null;
  let lastSurvivingMask = 0;
  const bounds = triangles.map((f) => {
    const low = [0, 1, 2].map((j) => Math.min(...f.p.map((p) => p[j])));
    const high = [0, 1, 2].map((j) => Math.max(...f.p.map((p) => p[j])));
    return { low, high, center: low.map((x, j) => (x + high[j]) * 0.5) };
  });
  const order = triangles.map((_, i) => i),
    nodes = [];
  function build(start, end) {
    const low = [Infinity, Infinity, Infinity],
      high = [-Infinity, -Infinity, -Infinity];
    for (let i = start; i < end; i++)
      for (let j = 0; j < 3; j++) {
        low[j] = Math.min(low[j], bounds[order[i]].low[j]);
        high[j] = Math.max(high[j], bounds[order[i]].high[j]);
      }
    let objectMask = 0;
    if (capture) for (let i = start; i < end; i++) objectMask |= triangles[order[i]].objectBit;
    const node = { low, high, start, end, left: -1, right: -1, objectMask: objectMask >>> 0 },
      id = nodes.length;
    nodes.push(node);
    if (end - start > 8) {
      const spans = high.map((v, j) => v - low[j]);
      const axis = spans.indexOf(Math.max(...spans));
      const sorted = order
        .slice(start, end)
        .sort((a, b) => bounds[a].center[axis] - bounds[b].center[axis]);
      for (let i = 0; i < sorted.length; i++) order[start + i] = sorted[i];
      const middle = (start + end) >>> 1;
      node.left = build(start, middle);
      node.right = build(middle, end);
    }
    return id;
  }
  if (triangles.length) build(0, triangles.length);
  const stack = [];
  let triangleTests = 0;
  function occluderMask(origin, direction, maxDistance, epsilon) {
    if (!nodes.length) return 0;
    let hitMask = 0, survivingMask = 0;
    lastSurvivingMask = 0;
    const inverse = direction.map((x) => 1 / x);
    stack.length = 1;
    stack[0] = 0;
    while (stack.length) {
      const node = nodes[stack.pop()];
      if (capture && (node.objectMask & ~((hitMask & ~eligibleMask) | (survivingMask & eligibleMask))) === 0) continue;
      let near = 0,
        far = maxDistance;
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(direction[axis]) < 1e-15) {
          if (origin[axis] < node.low[axis] || origin[axis] > node.high[axis]) {
            far = -1;
            break;
          }
        } else {
          const a = (node.low[axis] - origin[axis]) * inverse[axis],
            b = (node.high[axis] - origin[axis]) * inverse[axis];
          near = Math.max(near, Math.min(a, b));
          far = Math.min(far, Math.max(a, b));
          if (far < near) break;
        }
      }
      if (far < near) continue;
      if (node.left >= 0) {
        stack.push(node.left, node.right);
        continue;
      }
      for (let i = node.start; i < node.end; i++) {
        const triangle = triangles[order[i]], bit = triangle.objectBit;
        if (capture && (((bit & eligibleMask) ? survivingMask : hitMask) & bit)) continue;
        triangleTests++;
        const p = triangles[order[i]].p;
        const e1x = p[1][0] - p[0][0],
          e1y = p[1][1] - p[0][1],
          e1z = p[1][2] - p[0][2];
        const e2x = p[2][0] - p[0][0],
          e2y = p[2][1] - p[0][1],
          e2z = p[2][2] - p[0][2];
        const hx = direction[1] * e2z - direction[2] * e2y,
          hy = direction[2] * e2x - direction[0] * e2z,
          hz = direction[0] * e2y - direction[1] * e2x;
        const det = e1x * hx + e1y * hy + e1z * hz;
        if (Math.abs(det) < 1e-14) continue;
        const reciprocal = 1 / det;
        const sx = origin[0] - p[0][0],
          sy = origin[1] - p[0][1],
          sz = origin[2] - p[0][2];
        const u = reciprocal * (sx * hx + sy * hy + sz * hz);
        if (u < -1e-8 || u > 1 + 1e-8) continue;
        const qx = sy * e1z - sz * e1y,
          qy = sz * e1x - sx * e1z,
          qz = sx * e1y - sy * e1x;
        const v =
          reciprocal *
          (direction[0] * qx + direction[1] * qy + direction[2] * qz);
        if (v < -1e-8 || u + v > 1 + 1e-8) continue;
        const distance = reciprocal * (e2x * qx + e2y * qy + e2z * qz);
        if (distance > epsilon && distance <= maxDistance) {
          if (!capture) return 1;
          hitMask = (hitMask | bit) >>> 0;
          if (bit & eligibleMask) {
            // Keep the proof's Float64 barycentric reconstruction and exact
            // Float32 aperture predicate. A discarded hit cannot end this
            // object's search: a later surface may still occlude the ray.
            const local = triangle.localP[0].map((x, j) => (1 - u - v) * x + u * triangle.localP[1][j] + v * triangle.localP[2][j]);
            if (!apertureFloat32CPU(local)) survivingMask = (survivingMask | bit) >>> 0;
          } else survivingMask = (survivingMask | bit) >>> 0;
        }
      }
    }
    lastSurvivingMask = survivingMask;
    return hitMask;
  }
  function occluded(origin, direction, maxDistance, epsilon) {
    const mask = occluderMask(origin, direction, maxDistance, epsilon);
    if (capture) recordedMasks.push(mask);
    if (survivingMasks) survivingMasks.push(lastSurvivingMask);
    return mask !== 0;
  }

  return {
    occluded,
    capture,
    rayCount: () => recordedMasks.length,
    finish: () => Uint32Array.from(recordedMasks),
    finishSurviving: () => Uint32Array.from(survivingMasks),
    nodeCount: nodes.length,
    triangleCount: triangles.length,
    tests: () => triangleTests,
  };
}

/**
 * Returns {meshes, metadata}; scalar arrays and triangle maps always describe
 * original positions. With refineAO, also returns refined.meshes entries with
 * geometry (null means no refinement) and CPU-only interpolation audit data.
 * Original bake timing/rays remain in metadata; totalMilliseconds/totalRays
 * include the optional refinement. All rays reuse the same original-scene BVH.
 */
export function bakeMaterialGeometry(solids, options = {}) {
  const started = performance.now(),
    config = settings(options),
    refinement = refinementSettings(options.refineAO, solids.length);
  const data = solids.map((mesh) => collectMesh(mesh, config));
  if (options.cacheAOVisibility !== undefined && typeof options.cacheAOVisibility !== "boolean")
    throw new TypeError("cacheAOVisibility must be a boolean");
  const cachePerforatedShell = shellCacheSettings(solids, options);
  const bvh = buildBVH(data, options.cacheAOVisibility === true, cachePerforatedShell);
  let rays = 0;
  const meshes = data.map((d) => {
    const convex = new Float32Array(d.positionCount),
      concave = new Float32Array(d.positionCount),
      signedMean = new Float32Array(d.positionCount),
      ao = new Float32Array(d.positionCount),
      counts = new Uint32Array(d.positionCount);
    for (const g of d.groups) {
      if (bvh.capture) g.sampleSite = bvh.rayCount() / config.samples;
      const [t, b] = basis(g.normal);
      // Move infinitesimally into this smooth patch as well as off its face.
      // At a crease the literal shared vertex lies on the other face's plane;
      // normal bias alone would wrongly let rays leave an interior corner.
      const inward = [0, 0, 0];
      for (const neighbor of g.neighbors)
        for (let j = 0; j < 3; j++)
          inward[j] += d.groups[neighbor].p[j] - g.p[j];
      const normalPart = dot(inward, g.normal);
      for (let j = 0; j < 3; j++) inward[j] -= normalPart * g.normal[j];
      const inwardLength = length(inward);
      const origin = g.p.map(
        (x, j) =>
          x +
          g.normal[j] * config.rayBias +
          (inwardLength > d.tolerance
            ? (inward[j] / inwardLength) * config.rayBias * 2
            : 0),
      );
      let hits = 0;
      // Fixed low-discrepancy cosine samples. Deterministic and camera-free.
      for (let sample = 0; sample < config.samples; sample++) {
        const r = Math.sqrt((sample + 0.5) / config.samples),
          phi = sample * 2.399963229728653;
        const x = r * Math.cos(phi),
          y = r * Math.sin(phi),
          z = Math.sqrt(1 - r * r);
        const direction = [0, 1, 2].map(
          (j) => t[j] * x + b[j] * y + g.normal[j] * z,
        );
        if (
          bvh.occluded(
            origin,
            direction,
            config.maxDistance,
            config.rayBias * 0.1,
          )
        )
          hits++;
        rays++;
      }
      g.ao = 1 - hits / config.samples;
      for (const i of g.originals) {
        convex[i] += g.convex;
        concave[i] += g.concave;
        signedMean[i] += g.signedMean;
        ao[i] += g.ao;
        counts[i]++;
      }
    }
    for (let i = 0; i < d.positionCount; i++) {
      if (counts[i]) {
        convex[i] /= counts[i];
        concave[i] /= counts[i];
        signedMean[i] /= counts[i];
        ao[i] /= counts[i];
      } else ao[i] = 1;
    }
    return {
      mesh: d.mesh,
      convex,
      concave,
      signedMean,
      ao,
      metadata: d.metadata,
      ...(bvh.capture ? { visibilityMap: {
        renderVertexCount: d.mesh.geometry.getIndex()?.count ?? d.positionCount,
        cornerSites: Uint32Array.from(d.faces.flatMap(f => f.groups.map(g => d.groups[g].sampleSite))),
      }} : {}),
      triangles: d.faces.map((f) => ({
        sourceOffset: f.sourceOffset,
        original: f.original,
        convex: f.groups.map((g) => d.groups[g].convex),
        concave: f.groups.map((g) => d.groups[g].concave),
        ao: f.groups.map((g) => d.groups[g].ao),
        edgeKinds: f.edgeKinds,
        edgeHeights: f.p.map(
          (_, j) =>
            f.twiceArea / length(sub(f.p[(j + 1) % 3], f.p[(j + 2) % 3])),
        ),
      })),
    };
  });
  const result = {
    meshes,
    metadata: {
      ...config,
      curvatureUnits: "inverse-world-units",
      aoConvention: "1=open, 0=occluded",
      aoMethod:
        "deterministic cosine hemisphere rays; opaque double-sided triangles",
      curvatureMethod:
        "welded geometry-normal shape operator, split at sharp edges",
      triangleCount: bvh.triangleCount,
      bvhNodes: bvh.nodeCount,
      rays,
      triangleTests: bvh.tests(),
      milliseconds: performance.now() - started,
      limitations: [
        "Vertex AO cannot resolve contacts between vertices.",
        "Low sample counts estimate bounded-distance visibility, not converged illumination.",
        "Curvature depends on tessellation and creaseAngle; open boundaries have no inferred exterior face.",
      ],
    },
  };
  if (refinement) {
    result.refined = refineMaterialAO(data, result, config, refinement, bvh);
    result.metadata.refinement = result.refined.metadata;
    result.metadata.totalRays = rays + result.refined.metadata.additionalRays;
    result.metadata.totalMilliseconds = performance.now() - started;
  }
  if (bvh.capture) {
    // Original and refined front rays remain an immutable prefix. Inward
    // samples are appended only after refinement and only for the fixed pair.
    const frontRayCount = bvh.rayCount();
    const back = cachePerforatedShell ? appendShellBacksideSamples(data, result, config, bvh) : null;
    result.visibility = {
      samples: config.samples,
      objectCount: solids.length,
      rayMasks: bvh.finish(),
      ...(back ? {
        survivingMasks: bvh.finishSurviving(),
        frontRayCount,
        backSamples: SHELL_BACK_SAMPLES,
        backSiteCount: back.siteCount,
        eligibleMask: SHELL_ELIGIBLE_MASK,
        modelFingerprint: APERTURE_MODEL_FINGERPRINT,
        apertureEvaluation: "shared float32 CPU predicate; float64 hit reconstruction",
      } : {}),
      activeMask: null,
      activeTargets: null,
      activeAttributes: null,
      method: "binary straight-ray visibility; explicit transparent-occluder exclusion",
    };
    if (back) {
      const geometries = solids.map(mesh => mesh.geometry);
      shellBakeSources.set(result, {
        geometries,
        arrays: geometries.flatMap(geometry => [
          geometry.getIndex()?.array,
          ...Object.values(geometry.attributes).map(attribute => attribute.array ?? attribute.data?.array),
        ]).filter(Boolean),
      });
      result.metadata.frontRays = frontRayCount;
      result.metadata.backRays = back.siteCount * SHELL_BACK_SAMPLES;
      result.metadata.totalRays = bvh.rayCount();
      result.metadata.backTriangleTests = back.triangleTests;
    }
    result.metadata.totalTriangleTests = bvh.tests();
    // Include retained mask packing and sample maps in the reported total.
    result.metadata.totalMilliseconds = performance.now() - started;
  }
  return result;
}

/**
 * An attribute-only, nonindexed clone: original positions/shape are preserved.
 * Each vec3 edge component is a WORLD-distance to a sharp triangle edge.
 * Components for non-sharp edges are 1e4. Interpolate, take min(component),
 * then a world-width smoothstep for edge wear/pooling. Coplanar diagonals do
 * not become wear lines. Per-corner maps retain hard-side AO and curvature.
 */
export function createMaterialBakeGeometry(mesh, baked) {
  if (
    baked.mesh !== mesh ||
    baked.convex.length !== mesh.geometry.getAttribute("position").count
  )
    throw new TypeError("Bake does not belong to this mesh");
  const geometry = mesh.geometry.index
    ? mesh.geometry.toNonIndexed()
    : mesh.geometry.clone();
  const count = geometry.getAttribute("position").count;
  const convex = new Float32Array(count),
    concave = new Float32Array(count),
    ao = new Float32Array(count).fill(1);
  const convexEdge = new Float32Array(count * 3).fill(FAR_EDGE),
    concaveEdge = new Float32Array(count * 3).fill(FAR_EDGE);
  for (const triangle of baked.triangles)
    for (let corner = 0; corner < 3; corner++) {
      const vertex = triangle.sourceOffset + corner;
      convex[vertex] = triangle.convex[corner];
      concave[vertex] = triangle.concave[corner];
      ao[vertex] = triangle.ao[corner];
      for (let edge = 0; edge < 3; edge++) {
        const array =
          triangle.edgeKinds[edge] > 0
            ? convexEdge
            : triangle.edgeKinds[edge] < 0
              ? concaveEdge
              : null;
        if (array)
          array[vertex * 3 + edge] =
            edge === corner ? triangle.edgeHeights[edge] : 0;
      }
    }
  geometry.setAttribute("materialConvex", new BufferAttribute(convex, 1));
  geometry.setAttribute("materialConcave", new BufferAttribute(concave, 1));
  geometry.setAttribute("materialAO", new BufferAttribute(ao, 1));
  if (baked.visibilityMap)
    geometry.setAttribute("materialLightAO", new BufferAttribute(ao.slice(), 1));
  if (baked.visibilityMap?.backCornerSites) {
    const backAO = new Float32Array(count).fill(1);
    for (let triangle = 0; triangle < baked.triangles.length; triangle++)
      for (let corner = 0; corner < 3; corner++)
        backAO[baked.triangles[triangle].sourceOffset + corner] = baked.backAO[baked.visibilityMap.backCornerSites[triangle * 3 + corner] - baked.visibilityMap.backSiteStart];
    geometry.setAttribute("materialBackLightAO", new BufferAttribute(backAO, 1));
  }
  geometry.setAttribute(
    "materialConvexEdge",
    new BufferAttribute(convexEdge, 3),
  );
  geometry.setAttribute(
    "materialConcaveEdge",
    new BufferAttribute(concaveEdge, 3),
  );
  return geometry;
}

/** One-result cache. Call clear() after edits that bypass attribute versions. */
export function createMaterialBakeCache() {
  let previous = null;
  return {
    bake(solids, options = {}) {
      if (options.cacheAOVisibility !== undefined && typeof options.cacheAOVisibility !== "boolean")
        throw new TypeError("cacheAOVisibility must be a boolean");
      const cachePerforatedShell = shellCacheSettings(solids, options);
      const config = settings(options),
        refinement = refinementSettings(options.refineAO, solids.length),
        key = JSON.stringify({ ...config, refineAO: refinement, cacheAOVisibility: options.cacheAOVisibility ?? false, ...(cachePerforatedShell ? { cachePerforatedShell, shellModel: APERTURE_MODEL_FINGERPRINT, shellEligibleMask: SHELL_ELIGIBLE_MASK } : {}) });
      const identities = solids.map((mesh) => [
        mesh,
        mesh.geometry,
        mesh.geometry.getAttribute("position"),
        mesh.geometry.getIndex(),
        ...(refinement ? Object.values(mesh.geometry.attributes) : []),
        ...(cachePerforatedShell ? [mesh.geometry.getIndex()?.array, ...Object.values(mesh.geometry.attributes).flatMap(attribute => [attribute, attribute.array, attribute.data?.array])] : []),
      ]);
      const signature = solids
        .map((mesh) =>
          [
            mesh.geometry.getAttribute("position").version,
            mesh.geometry.getAttribute("position").count,
            mesh.geometry.getIndex()?.version ?? 0,
            mesh.geometry.getIndex()?.count ?? 0,
            mesh.geometry.drawRange.start,
            mesh.geometry.drawRange.count,
            ...(cachePerforatedShell ? [mesh.geometry.type] : []),
            ...(refinement || cachePerforatedShell
              ? [
                  JSON.stringify(mesh.geometry.groups),
                  ...Object.entries(mesh.geometry.attributes).flatMap(
                    ([name, attribute]) => [
                      name,
                      attribute.version ?? attribute.data?.version ?? 0,
                      attribute.itemSize,
                      attribute.count,
                      attribute.normalized,
                    ],
                  ),
                ]
              : []),
            ...(mesh.matrixWorld?.elements ?? IDENTITY),
          ].join(","),
        )
        .join(";");
      if (
        previous &&
        previous.key === key &&
        previous.signature === signature &&
        previous.identities.length === identities.length &&
        identities.every((items, i) =>
          items.every((item, j) => item === previous.identities[i][j]),
        )
      )
        return previous.result;
      const result = bakeMaterialGeometry(solids, {
        ...config,
        refineAO: refinement,
        cacheAOVisibility: options.cacheAOVisibility,
        cachePerforatedShell,
      });
      if (cachePerforatedShell) result.visibility.sourceSignature = signature;
      previous = { key, signature, identities, result };
      return result;
    },
    clear() {
      previous = null;
    },
  };
}

const midpoint = (a, b) => a.map((x, i) => (x + b[i]) * 0.5);
const mix3 = (p, bary) =>
  [0, 1, 2].map((j) => bary.reduce((sum, x, k) => sum + x * p[k][j], 0));
const sq = (a, b) => a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0);

/**
 * Render-only longest-edge subdivision of constant-normal triangles. The full
 * ORIGINAL-scene BVH supplies AO; geometry/curvature/UV/edge-distance fields
 * remain barycentric copies. Smooth curved triangles are never subdivided,
 * avoiding Three's extra normalization at new vertices. Default selection
 * excludes mesh 0, the stage's 200 x 200 floor, which remains an occluder.
 * Original meshes must continue to own study, worker and seeded-mark metadata.
 * sourceOffsets and barycentrics are CPU-only audit sidecars, not attributes.
 */
function refineMaterialAO(data, baked, config, options, bvh) {
  const started = performance.now();
  const { maxEdgeLength, maxTriangles, maxAdditionalRays } = options;
  const selected = new Set(options.meshIndices);
  const initialTriangleTests = bvh.tests();
  const cosineSamples = Array.from({ length: config.samples }, (_, i) => {
    const r = Math.sqrt((i + 0.5) / config.samples),
      phi = i * 2.399963229728653;
    return [r * Math.cos(phi), r * Math.sin(phi), Math.sqrt(1 - r * r)];
  });
  let rays = 0,
    totalTriangles = 0;
  const meshes = data.map((d, meshIndex) => {
    const original = baked.meshes[meshIndex];
    if (original.mesh !== d.mesh)
      throw new TypeError("Bake and solids order must match");
    if (!selected.has(meshIndex))
      return {
        mesh: d.mesh,
        geometry: null,
        metadata: { refined: false, triangles: d.faces.length },
      };
    const normalAttribute = d.mesh.geometry.getAttribute("normal");
    if (
      !normalAttribute ||
      normalAttribute.itemSize !== 3 ||
      normalAttribute.count !== d.positionCount
    )
      throw new TypeError(
        "AO refinement requires a three-component normal for every position",
      );
    const normalMatrix = new Matrix3().getNormalMatrix(d.mesh.matrixWorld);
    const v = new Vector3();
    const eligibleFaces = new Set();
    for (const face of d.faces) {
      const normals = face.original.map((i) =>
        v
          .fromBufferAttribute(normalAttribute, i)
          .applyMatrix3(normalMatrix)
          .normalize()
          .toArray(),
      );
      if (normals.every((n) => sq(n, normals[0]) <= 1e-12))
        eligibleFaces.add(face.sourceOffset);
    }
    const needsRefinement = d.faces.some(
      (face) =>
        eligibleFaces.has(face.sourceOffset) &&
        face.p.some(
          (p, i) =>
            sq(p, face.p[(i + 1) % 3]) >
            maxEdgeLength * maxEdgeLength * (1 + 1e-12),
        ),
    );
    if (!needsRefinement)
      return {
        mesh: d.mesh,
        geometry: null,
        metadata: { refined: false, triangles: d.faces.length },
      };
    const source = createMaterialBakeGeometry(d.mesh, original);
    const attributes = Object.entries(source.attributes);
    const values = Object.fromEntries(attributes.map(([name]) => [name, []]));
    const barycentrics = [],
      sourceOffsets = [],
      sampleSites = [];
    const cache = new Map();
    let addedVertices = 0,
      unchangedTriangles = 0,
      maximumEdge = 0,
      skippedCurvedTriangles = 0;
    const key = (p, n) =>
      `${p.map((x) => Math.round(x * 1e8)).join(",")}/${n.map((x) => Math.round(x * 1e7)).join(",")}`;
    const faces = new Map(d.faces.map((f) => [f.sourceOffset, f]));
    // Reuse the original sampled smooth-corner AO exactly.
    for (const triangle of original.triangles) {
      const face = faces.get(triangle.sourceOffset);
      for (let corner = 0; corner < 3; corner++)
        cache.set(
          key(face.p[corner], d.groups[face.groups[corner]].normal),
          {ao: triangle.ao[corner], site: original.visibilityMap?.cornerSites[face.index * 3 + corner]},
        );
    }
    const trace = (p, n, face) => {
      const k = key(p, n);
      if (cache.has(k)) return cache.get(k);
      if (rays + config.samples > maxAdditionalRays)
        throw new RangeError(
          "Dense AO ray budget exceeded; source inputs remain unchanged",
        );
      const center = mix3(face.p, [1 / 3, 1 / 3, 1 / 3]);
      const inward = sub(center, p),
        component = dot(inward, n);
      for (let j = 0; j < 3; j++) inward[j] -= component * n[j];
      const inwardLength = length(inward);
      const origin = p.map(
        (x, j) =>
          x +
          n[j] * config.rayBias +
          (inwardLength > d.tolerance
            ? (inward[j] / inwardLength) * config.rayBias * 2
            : 0),
      );
      const [t, b] = basis(n);
      const site = bvh.rayCount() / config.samples;
      let hits = 0;
      for (const [x, y, z] of cosineSamples) {
        const direction = [0, 1, 2].map((j) => t[j] * x + b[j] * y + n[j] * z);
        hits += bvh.occluded(
          origin,
          direction,
          config.maxDistance,
          config.rayBias * 0.1,
        )
          ? 1
          : 0;
        rays++;
      }
      const ao = 1 - hits / config.samples;
      const entry = {ao, site};
      cache.set(k, entry);
      addedVertices++;
      return entry;
    };
    for (const triangle of original.triangles) {
      const face = faces.get(triangle.sourceOffset),
        offset = triangle.sourceOffset;
      const aoNormals = face.groups.map((g) => d.groups[g].normal);
      const mayRefine = eligibleFaces.has(offset);
      if (!mayRefine) skippedCurvedTriangles++;
      const queue = [
        [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
      ];
      let leafCount = 0;
      while (queue.length) {
        const tri = queue.pop(),
          p = tri.map((b) => mix3(face.p, b));
        const lengths = [sq(p[0], p[1]), sq(p[1], p[2]), sq(p[2], p[0])];
        const e = lengths.indexOf(Math.max(...lengths));
        if (
          mayRefine &&
          lengths[e] > maxEdgeLength * maxEdgeLength * (1 + 1e-12)
        ) {
          const a = e,
            b = (e + 1) % 3,
            c = (e + 2) % 3,
            middle = midpoint(tri[a], tri[b]);
          queue.push([tri[a], middle, tri[c]], [middle, tri[b], tri[c]]);
          if (totalTriangles + queue.length > maxTriangles)
            throw new RangeError(
              "Dense AO triangle budget exceeded; source inputs remain unchanged",
            );
          continue;
        }
        totalTriangles++;
        if (totalTriangles > maxTriangles)
          throw new RangeError(
            "Dense AO triangle budget exceeded; source inputs remain unchanged",
          );
        leafCount++;
        if (mayRefine)
          maximumEdge = Math.max(maximumEdge, Math.sqrt(lengths[e]));
        sourceOffsets.push(offset);
        for (let corner = 0; corner < 3; corner++) {
          const bary = tri[corner],
            world = p[corner],
            n = unit(mix3(aoNormals, bary));
          const originalCorner = bary.findIndex((weight) => weight === 1);
          const sample = originalCorner >= 0
            ? {ao: triangle.ao[originalCorner], site: original.visibilityMap?.cornerSites[face.index * 3 + originalCorner]}
            : trace(world, n, face);
          const ao = sample.ao;
          if (bvh.capture) sampleSites.push(sample.site);
          for (const [name, attribute] of attributes) {
            for (let j = 0; j < attribute.itemSize; j++)
              values[name].push(
                name === "materialAO" || name === "materialLightAO"
                  ? ao
                  : bary.reduce(
                      (s, weight, k) =>
                        s + weight * attribute.getComponent(offset + k, j),
                      0,
                    ),
              );
          }
          barycentrics.push(...bary);
        }
      }
      if (leafCount === 1) unchangedTriangles++;
    }
    const geometry = new BufferGeometry();
    for (const [name, attribute] of attributes)
      geometry.setAttribute(
        name,
        new BufferAttribute(new Float32Array(values[name]), attribute.itemSize),
      );
    // Translate each original group independently, preserving gaps and
    // overlapping groups as well as ordinary disjoint material groups.
    for (const group of source.groups) {
      let start = -1;
      for (let i = 0; i <= sourceOffsets.length; i++) {
        const inside =
          i < sourceOffsets.length &&
          sourceOffsets[i] >= group.start &&
          sourceOffsets[i] < group.start + group.count;
        if (inside && start < 0) start = i;
        if (!inside && start >= 0) {
          geometry.addGroup(start * 3, (i - start) * 3, group.materialIndex);
          start = -1;
        }
      }
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    source.dispose();
    return {
      mesh: d.mesh,
      geometry,
      ...(bvh.capture ? { sampleSites: new Uint32Array(sampleSites) } : {}),
      sourceOffsets: new Uint32Array(sourceOffsets),
      barycentrics: new Float32Array(barycentrics),
      metadata: {
        refined: true,
        triangles: sourceOffsets.length,
        originalTriangles: d.faces.length,
        addedTriangles: sourceOffsets.length - d.faces.length,
        additionalSampleSites: addedVertices,
        unchangedTriangles,
        skippedCurvedTriangles,
        maximumEdge,
      },
    };
  });
  return {
    meshes,
    metadata: {
      ...options,
      samples: config.samples,
      method: "flat-normal triangle subdivision; original-scene BVH AO",
      originalTriangles: bvh.triangleCount,
      renderTriangles: meshes.reduce((s, m) => s + m.metadata.triangles, 0),
      additionalRays: rays,
      triangleTests: bvh.tests() - initialTriangleTests,
      milliseconds: performance.now() - started,
      bvhTriangles: bvh.triangleCount,
    },
  };
}

/**
 * Update only materialLightAO from retained ray masks. Original mesh/triangle AO,
 * materialAO, curvature and edge fields remain the immutable geometric signal
 * for procedural patina, pigment and roughness. No ray casting or rebuild occurs.
 * Pass existing render geometries in original mesh order; omitting them updates
 * owned refined geometries only. All source geometry/transforms must still match.
 */
export function applyOpaqueMask(baked, opaqueMask, geometries = null) {
  if (!baked?.visibility) throw new TypeError("Bake needs cacheAOVisibility: true");
  const { samples, rayMasks, objectCount } = baked.visibility;
  const allMask = objectCount === 32 ? 0xffffffff : 2 ** objectCount - 1;
  if (!Number.isInteger(opaqueMask) || opaqueMask < 0 || opaqueMask > allMask)
    throw new RangeError("Opaque mask must fit the cached object count");
  if (geometries && (!Array.isArray(geometries) || geometries.length !== baked.meshes.length))
    throw new TypeError("Render geometries must match the baked mesh order");
  const targets = baked.meshes.map((item, index) => geometries?.[index] || baked.refined?.meshes[index]?.geometry || null);
  for (let index = 0; index < targets.length; index++) {
    const geometry = targets[index];
    if (!geometry) continue;
    const attribute = geometry.getAttribute("materialLightAO"), refined = baked.refined?.meshes[index];
    const expected = refined?.geometry === geometry ? refined.sampleSites.length : baked.meshes[index].visibilityMap.renderVertexCount;
    if (!attribute || attribute.itemSize !== 1 || attribute.count !== expected)
      throw new TypeError("Render geometry does not match the AO mapping");
  }
  const attributes = targets.map((geometry) => geometry?.getAttribute("materialLightAO") || null);
  if (baked.visibility.activeMask === opaqueMask && targets.every((target, index) => {
    const attribute = attributes[index], prior = baked.visibility.activeAttributes?.[index];
    return target === baked.visibility.activeTargets?.[index] &&
      (attribute ? attribute === prior?.attribute && attribute.array === prior.array && attribute.version === prior.version : prior === null);
  }))
    return { changed: false, raysTraced: 0 };
  const started = performance.now();
  const siteAO = new Float64Array(rayMasks.length / samples);
  for (let site = 0; site < siteAO.length; site++) {
    let hits = 0;
    for (let ray = 0; ray < samples; ray++)
      hits += (rayMasks[site * samples + ray] & opaqueMask) !== 0 ? 1 : 0;
    siteAO[site] = 1 - hits / samples;
  }
  for (let index = 0; index < targets.length; index++) {
    const geometry = targets[index];
    if (!geometry) continue;
    const item = baked.meshes[index], refined = baked.refined?.meshes[index];
    const attribute = geometry.getAttribute("materialLightAO");
    if (refined?.geometry === geometry) {
      for (let vertex = 0; vertex < attribute.count; vertex++)
        attribute.array[vertex] = siteAO[refined.sampleSites[vertex]];
    } else {
      attribute.array.fill(1);
      for (let triangle = 0; triangle < item.triangles.length; triangle++)
        for (let corner = 0; corner < 3; corner++)
          attribute.array[item.triangles[triangle].sourceOffset + corner] = siteAO[item.visibilityMap.cornerSites[triangle * 3 + corner]];
    }
    attribute.needsUpdate = true;
  }
  baked.visibility.activeMask = opaqueMask;
  baked.visibility.activeTargets = targets;
  baked.visibility.activeAttributes = attributes.map((attribute) => attribute
    ? { attribute, array: attribute.array, version: attribute.version }
    : null);
  return { changed: true, raysTraced: 0, milliseconds: performance.now() - started };
}

// Explicit material-assignment policy preserves historical Original sphere behavior.
export function opaqueAssignmentMask(objectCount, assignments = {}) {
  if (!Number.isInteger(objectCount) || objectCount < 0 || objectCount > 32) throw new RangeError("At most 32 objects");
  let result = objectCount === 32 ? 0xffffffff : 2 ** objectCount - 1;
  for (let i = 0; i < objectCount; i++) if (assignments[i + 1] === "frosted-glass") result = (result & ~(2 ** i)) >>> 0;
  return result;
}

// Independent inward hemispheres follow the exact original smooth groups.
function appendShellBacksideSamples(data, baked, config, bvh) {
  let siteCount = 0;
  const initialTests = bvh.tests();
  for (let meshIndex = 0; meshIndex < data.length; meshIndex++) {
    if (!(SHELL_ELIGIBLE_MASK & (2 ** meshIndex))) continue;
    const d = data[meshIndex], item = baked.meshes[meshIndex];
    const sites = [], ao = new Float32Array(d.groups.length);
    item.visibilityMap.backSiteStart = siteCount;
    for (let groupIndex = 0; groupIndex < d.groups.length; groupIndex++) {
      const g = d.groups[groupIndex], normal = g.normal.map(x => -x);
      const [t, b] = basis(normal), inward = [0, 0, 0];
      for (const neighbor of g.neighbors)
        for (let j = 0; j < 3; j++) inward[j] += d.groups[neighbor].p[j] - g.p[j];
      const normalPart = dot(inward, g.normal);
      for (let j = 0; j < 3; j++) inward[j] -= normalPart * g.normal[j];
      const inwardLength = length(inward);
      const origin = g.p.map((x, j) => x - g.normal[j] * config.rayBias +
        (inwardLength > d.tolerance ? (inward[j] / inwardLength) * config.rayBias * 2 : 0));
      let hits = 0;
      sites[groupIndex] = siteCount++;
      for (let sample = 0; sample < SHELL_BACK_SAMPLES; sample++) {
        const r = Math.sqrt((sample + 0.5) / SHELL_BACK_SAMPLES), phi = sample * 2.399963229728653;
        const x = r * Math.cos(phi), y = r * Math.sin(phi), z = Math.sqrt(1 - r * r);
        const direction = [0, 1, 2].map(j => t[j] * x + b[j] * y + normal[j] * z);
        hits += bvh.occluded(origin, direction, config.maxDistance, config.rayBias * 0.1) ? 1 : 0;
      }
      ao[groupIndex] = 1 - hits / SHELL_BACK_SAMPLES;
    }
    item.backAO = ao;
    item.visibilityMap.backCornerSites = Uint32Array.from(d.faces.flatMap(f => f.groups.map(g => sites[g])));
  }
  return { siteCount, triangleTests: bvh.tests() - initialTests };
}

const shellAOAttributeNames = ["materialLightAO", "materialBackLightAO"];

function shellTargetSnapshot(targets) {
  return targets.map(target => target ? {
    geometry: target.geometry,
    attributes: shellAOAttributeNames.map(name => {
      const attribute = target.geometry.getAttribute(name);
      return attribute ? { attribute, array: attribute.array, version: attribute.version } : null;
    }),
  } : null);
}

function sameShellTargets(targets, prior) {
  return prior?.length === targets.length && targets.every((target, index) => {
    if (!target) return prior[index] === null;
    return prior[index]?.geometry === target.geometry && shellAOAttributeNames.every((name, attributeIndex) => {
      const attribute = target.geometry.getAttribute(name), old = prior[index].attributes[attributeIndex];
      return attribute ? attribute === old?.attribute && attribute.array === old.array && attribute.version === old.version : old === null;
    });
  });
}

/** Validate every destination and map before allocating or changing AO buffers. */
function shellTargets(baked, geometries) {
  if (geometries && (!Array.isArray(geometries) || geometries.length !== baked.meshes.length))
    throw new TypeError("Render geometries must match the baked mesh order");
  const { samples, frontRayCount, backSiteCount } = baked.visibility;
  const frontSiteCount = frontRayCount / samples;
  const invalid = () => { throw new TypeError("Render geometry does not match the shell AO mapping"); };
  const validSites = (sites, count, limit) => {
    if (!sites || sites.length !== count) invalid();
    for (const site of sites)
      if (!Number.isInteger(site) || site < 0 || site >= limit) invalid();
  };
  const immutableArrays = new Set(shellBakeSources.get(baked)?.arrays);
  const rememberGeometry = geometry => {
    if (geometry.getIndex()?.array) immutableArrays.add(geometry.getIndex().array);
    for (const [name, attribute] of Object.entries(geometry.attributes))
      if (!shellAOAttributeNames.includes(name)) immutableArrays.add(attribute.array ?? attribute.data?.array);
  };
  for (const geometry of shellBakeSources.get(baked)?.geometries ?? []) rememberGeometry(geometry);
  for (const value of Object.values(baked.visibility)) if (ArrayBuffer.isView(value)) immutableArrays.add(value);
  for (const item of baked.meshes) {
    for (const name of ["ao", "convex", "concave", "signedMean", "backAO"])
      if (item[name]) immutableArrays.add(item[name]);
    for (const value of Object.values(item.visibilityMap ?? {}))
      if (ArrayBuffer.isView(value)) immutableArrays.add(value);
    rememberGeometry(item.mesh.geometry);
  }
  for (const refined of baked.refined?.meshes ?? []) {
    if (refined.geometry) rememberGeometry(refined.geometry);
    for (const name of ["sampleSites", "barycentrics", "sourceOffsets"])
      if (refined[name]) immutableArrays.add(refined[name]);
  }
  const targets = baked.meshes.map((item, index) => {
    const geometry = geometries?.[index] || baked.refined?.meshes[index]?.geometry || null;
    if (!geometry) return null;
    const refined = baked.refined?.meshes[index], map = item.visibilityMap;
    const isRefined = refined?.geometry === geometry;
    const count = isRefined ? refined.sampleSites?.length : map?.renderVertexCount;
    if (!Number.isInteger(count) || count < 0 || geometry.getAttribute("position")?.count !== count) invalid();
    validSites(map?.cornerSites, item.triangles.length * 3, frontSiteCount);
    for (const triangle of item.triangles)
      if (!Number.isInteger(triangle.sourceOffset) || triangle.sourceOffset < 0 || triangle.sourceOffset + 2 >= map.renderVertexCount) invalid();
    if (isRefined) validSites(refined.sampleSites, count, frontSiteCount);
    const hasBack = (baked.visibility.eligibleMask & (2 ** index)) !== 0;
    let sourceTriangles = null;
    if (hasBack) {
      validSites(map.backCornerSites, item.triangles.length * 3, backSiteCount);
      if (isRefined) {
        if (refined.sourceOffsets?.length * 3 !== count || refined.barycentrics?.length !== count * 3) invalid();
        sourceTriangles = new Map(item.triangles.map((triangle, i) => [triangle.sourceOffset, i]));
        for (const offset of refined.sourceOffsets) if (!sourceTriangles.has(offset)) invalid();
        for (const weight of refined.barycentrics) if (!Number.isFinite(weight)) invalid();
      }
    } else if (map?.backCornerSites) invalid();
    const front = geometry.getAttribute("materialLightAO"), back = geometry.getAttribute("materialBackLightAO");
    const validAttribute = attribute => attribute?.isBufferAttribute && !attribute.isInterleavedBufferAttribute &&
      attribute.itemSize === 1 && attribute.count === count && attribute.array instanceof Float32Array &&
      attribute.array.length === count && !attribute.normalized;
    if (!validAttribute(front)) invalid();
    if (back && !validAttribute(back)) throw new TypeError("Back lighting AO does not match the shell AO mapping");
    rememberGeometry(geometry);
    return { geometry, item, refined: isRefined ? refined : null, sourceTriangles, count, front, back, hasBack };
  });
  // Array identity is insufficient: distinct views may overlap some or all of
  // the same storage. Half-open byte ranges also allow disjoint packed views.
  const ranges = new Map();
  const rememberRange = array => {
    if (!ArrayBuffer.isView(array) || array.byteLength === 0) return;
    const intervals = ranges.get(array.buffer) ?? [];
    intervals.push([array.byteOffset, array.byteOffset + array.byteLength]);
    ranges.set(array.buffer, intervals);
  };
  for (const array of immutableArrays) rememberRange(array);
  for (const target of targets) if (target) {
    for (const attribute of [target.front, target.hasBack ? target.back : null]) if (attribute) {
      const array = attribute.array, start = array.byteOffset, end = start + array.byteLength;
      if (array.byteLength && ranges.get(array.buffer)?.some(([low, high]) => start < high && low < end))
        throw new TypeError("Lighting AO buffers must be independent of geometric fields and other AO buffers");
      rememberRange(array);
    }
  }
  return targets;
}

/** Assignment-only lighting update. Geometric AO and all retained rays are immutable. */
export function applyShellMask(baked, opaqueMask, shellMask, geometries = null) {
  if (!baked?.visibility?.survivingMasks) {
    if (shellMask === 0) return applyOpaqueMask(baked, opaqueMask, geometries);
    throw new TypeError("Bake needs cachePerforatedShell: true and cacheAOVisibility: true");
  }
  const visibility = baked.visibility;
  const { rayMasks, survivingMasks, samples, objectCount, frontRayCount, backSamples, backSiteCount, eligibleMask } = visibility;
  const allMask = objectCount === 32 ? 0xffffffff : 2 ** objectCount - 1;
  if (!Number.isInteger(opaqueMask) || opaqueMask < 0 || opaqueMask > allMask)
    throw new RangeError("Opaque mask must fit the cached object count");
  if (!Number.isInteger(shellMask) || shellMask < 0 || shellMask > allMask || (shellMask & ~eligibleMask) !== 0)
    throw new RangeError("Shell mask must contain only eligible cached objects (Vase 7 and Sphere 10)");
  if (!Number.isInteger(frontRayCount / samples) || backSamples !== SHELL_BACK_SAMPLES ||
      frontRayCount + backSamples * backSiteCount !== rayMasks.length || survivingMasks.length !== rayMasks.length)
    throw new TypeError("Invalid cached shell AO mappings");
  const targets = shellTargets(baked, geometries), prior = visibility.activeShell;
  if (prior?.opaqueMask === opaqueMask && prior.shellMask === shellMask && sameShellTargets(targets, prior.targets))
    return { changed: false, raysTraced: 0 };
  const started = performance.now();
  const effective = index => ((rayMasks[index] & opaqueMask & ~shellMask) | (survivingMasks[index] & opaqueMask & shellMask)) >>> 0;
  const siteAO = shellMask ? new Float64Array(frontRayCount / samples) : null;
  const backSiteAO = new Float64Array(backSiteCount);
  if (siteAO) for (let site = 0; site < siteAO.length; site++) {
    let hits = 0;
    for (let ray = 0; ray < samples; ray++) hits += effective(site * samples + ray) !== 0 ? 1 : 0;
    siteAO[site] = 1 - hits / samples;
  }
  for (let site = 0; site < backSiteAO.length; site++) {
    let hits = 0;
    for (let ray = 0; ray < backSamples; ray++) hits += effective(frontRayCount + site * backSamples + ray) !== 0 ? 1 : 0;
    backSiteAO[site] = 1 - hits / backSamples;
  }
  // Allocate every missing inward attribute and stage every output before the
  // first write. A late bad target can never leave earlier objects half updated.
  const outputs = targets.map(target => {
    if (!target) return null;
    const { item, refined, sourceTriangles, count, hasBack } = target;
    const frontValues = siteAO ? new Float32Array(count).fill(1) : null;
    const backValues = hasBack ? new Float32Array(count).fill(1) : null;
    const backAttribute = hasBack ? target.back || new BufferAttribute(new Float32Array(count), 1) : null;
    if (refined) {
      for (let vertex = 0; vertex < count; vertex++) {
        if (frontValues) frontValues[vertex] = siteAO[refined.sampleSites[vertex]];
        if (backValues) {
          const triangle = sourceTriangles.get(refined.sourceOffsets[Math.floor(vertex / 3)]);
          let ao = 0;
          for (let corner = 0; corner < 3; corner++)
            ao += refined.barycentrics[vertex * 3 + corner] * backSiteAO[item.visibilityMap.backCornerSites[triangle * 3 + corner]];
          backValues[vertex] = ao;
        }
      }
    } else {
      for (let triangle = 0; triangle < item.triangles.length; triangle++)
        for (let corner = 0; corner < 3; corner++) {
          const vertex = item.triangles[triangle].sourceOffset + corner;
          if (frontValues) frontValues[vertex] = siteAO[item.visibilityMap.cornerSites[triangle * 3 + corner]];
          if (backValues) backValues[vertex] = backSiteAO[item.visibilityMap.backCornerSites[triangle * 3 + corner]];
        }
    }
    return { frontValues, backValues, backAttribute };
  });
  // Delegate the no-shell front path to the actual released implementation.
  const frontResult = shellMask === 0 ? applyOpaqueMask(baked, opaqueMask, geometries) : null;
  for (let index = 0; index < targets.length; index++) {
    const target = targets[index], output = outputs[index];
    if (!target) continue;
    if (output.frontValues) {
      target.front.array.set(output.frontValues);
      target.front.needsUpdate = true;
    }
    if (output.backValues) {
      output.backAttribute.array.set(output.backValues);
      if (!target.back) target.geometry.setAttribute("materialBackLightAO", output.backAttribute);
      output.backAttribute.needsUpdate = true;
    }
  }
  if (shellMask) {
    visibility.activeMask = null;
    visibility.activeTargets = null;
    visibility.activeAttributes = null;
  }
  visibility.activeShell = { opaqueMask, shellMask, targets: shellTargetSnapshot(targets) };
  return { changed: true, raysTraced: 0, frontChanged: frontResult?.changed ?? true, milliseconds: performance.now() - started };
}

/** The shell assignment is opaque except at the fixed field's discarded hits. */
export function shellAssignmentMask(assignments = {}) {
  let mask = 0;
  for (const [key, materialId] of Object.entries(assignments)) if (materialId === PERFORATED_SHELL_ID) {
    const id = Number(key);
    if (!ELIGIBLE_IDS.includes(id))
      throw new RangeError(`Perforated shell is available only for Vase 7 and Sphere 10; unsupported object ${key}`);
    mask = (mask | (2 ** (id - 1))) >>> 0;
  }
  return mask;
}
