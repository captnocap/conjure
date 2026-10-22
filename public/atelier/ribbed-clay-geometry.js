import { BufferAttribute, BufferGeometry, FloatType, LatheGeometry, Vector2 } from "./vendor/three.module.min.js";
import { RIBBED_CLAY_ELIGIBLE_IDS, RIBBED_CLAY_PERIOD, RIBBED_CLAY_MODEL_VERSION, RIBBED_CLAY_MAX_V, RIBBED_CLAY_MERIDIAN_ARCS } from "./ribbed-clay-config.js";

// Frozen proof: the actual Float32 meridian profile accumulated in double
// precision. Chart V interpolates these arcs at the original Float32 UV.y;
// rounding to the nearest source row changes the admitted chart bytes.
const MERIDIAN_ARCS = RIBBED_CLAY_MERIDIAN_ARCS;
const MODEL_MATRIX = Object.freeze([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -1.45, 0.13, 0.9, 1,
]);
const CORE_ATTRIBUTES = new Set(["position", "normal", "uv"]);
const VIEW_METADATA = ["groups", "drawRange", "morphAttributes", "morphTargetsRelative", "boundingBox", "boundingSphere"];
const same = (a, b) => a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
const stamp = (attribute, versioned = false) => attribute
  ? [attribute, attribute.array, attribute.count, attribute.itemSize,
    attribute.normalized, attribute.gpuType, attribute.isInterleavedBufferAttribute,
    attribute.data, attribute.data?.array, attribute.offset,
    versioned ? (attribute.version ?? attribute.data?.version) : null]
  : [null];

function assertMetadata(source, baked) {
  for (const geometry of [source, baked]) {
    if (!geometry?.isBufferGeometry || !Array.isArray(geometry.groups) ||
        geometry.groups.length || geometry.drawRange?.start !== 0 ||
        geometry.drawRange?.count !== Infinity || !geometry.morphAttributes ||
        Object.keys(geometry.morphAttributes).length || geometry.morphTargetsRelative !== false)
      throw new RangeError("Ribbed clay requires unchanged original Vase draw metadata");
    if (geometry.hasAttribute("clayCoord"))
      throw new RangeError("The source geometry already contains reserved ribbed clay coordinates");
  }
}

function assertTransform(mesh) {
  // Do not update matrices here: preparation never mutates the caller's mesh.
  // Both matrices and the editable TRS are checked, including edits made before
  // updateMatrixWorld. The production source copy uses matrixAutoUpdate=false.
  if (!same(mesh.scale.toArray(), [1, 1, 1]) ||
      !same(mesh.position.toArray(), MODEL_MATRIX.slice(12, 15)) ||
      !same(mesh.quaternion.toArray(), [0, 0, 0, 1]) ||
      !same(mesh.matrix.elements, MODEL_MATRIX) ||
      !same(mesh.matrixWorld.elements, MODEL_MATRIX))
    throw new RangeError("Ribbed clay requires the unchanged original Vase transform and unit scale");
}

function assertAO(baked) {
  const count = baked.getAttribute("position")?.count;
  for (const name of ["materialAO", "materialLightAO"]) {
    const attribute = baked.getAttribute(name);
    if (!attribute || attribute.isInterleavedBufferAttribute || attribute.itemSize !== 1 ||
        attribute.normalized !== false || attribute.count !== count ||
        !(attribute.array instanceof Float32Array) || !attribute.array.every(Number.isFinite))
      throw new RangeError("Ribbed clay requires finite original baked materialAO and materialLightAO attributes");
  }
}

const fingerprint = (mesh, baked) => [
  mesh.geometry, baked, ...mesh.scale.toArray(), ...mesh.position.toArray(),
  ...mesh.quaternion.toArray(), ...mesh.matrix.elements, ...mesh.matrixWorld.elements,
  mesh.geometry.type, mesh.geometry.parameters?.segments,
  mesh.geometry.parameters?.phiStart, mesh.geometry.parameters?.phiLength,
  mesh.geometry.parameters?.points, mesh.geometry.parameters?.points?.length,
  ...(mesh.geometry.parameters?.points || []).flatMap(point => [point.x, point.y]),
  ...[...CORE_ATTRIBUTES].flatMap(name => stamp(mesh.geometry.getAttribute(name), true)),
  ...stamp(mesh.geometry.index, true),
  ...Object.entries(baked.attributes).flatMap(([name, attribute]) =>
    [name, ...stamp(attribute, CORE_ATTRIBUTES.has(name))]),
  ...stamp(baked.index, true), ...VIEW_METADATA.map(name => baked[name]), baked.userData,
];

function originalProfile() {
  const points = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    points.push(new Vector2(0.31 + 0.31 * Math.sin(Math.PI * t) ** 0.8 -
      0.14 * Math.exp(-(((t - 0.9) / 0.15) ** 2)), 1.65 * t));
  }
  return points;
}

let canonical = null;
function originalReference() {
  if (!canonical) {
    const points = originalProfile(), expected = new LatheGeometry(points, 72);
    // The validator retains only private CPU arrays. It is never registered
    // with a renderer, installed on a mesh, or used as a rendering geometry.
    canonical = { points, expected };
    expected.dispose();
  }
  return canonical;
}

function assertOriginalBuffers(source, baked) {
  const { points, expected } = originalReference();
  const equal = (a, b) => a && b && !a.isInterleavedBufferAttribute &&
    a.itemSize === b.itemSize && a.count === b.count && a.normalized === b.normalized && a.gpuType === b.gpuType &&
    a.array?.constructor === b.array.constructor && a.array.length === b.array.length &&
    a.array.every((value, i) => Object.is(value, b.array[i]));
  const fail = () => { throw new RangeError("Ribbed clay requires unchanged original Vase buffers and topology"); };
  {
    if (!source.parameters.points.every((point, i) =>
      Object.is(point.x, points[i].x) && Object.is(point.y, points[i].y))) fail();
    if (!equal(source.index, expected.index)) fail();
    if (baked.index && !equal(baked.index, expected.index)) fail();
    for (const name of CORE_ATTRIBUTES) {
      const reference = expected.getAttribute(name), actual = baked.getAttribute(name);
      if (!equal(source.getAttribute(name), reference)) fail();
      if (baked.index) { if (!equal(actual, reference)) fail(); continue; }
      if (!actual || actual.isInterleavedBufferAttribute ||
          actual.itemSize !== reference.itemSize || actual.normalized !== reference.normalized || actual.gpuType !== reference.gpuType ||
          actual.array?.constructor !== reference.array.constructor ||
          actual.count !== expected.index.count ||
          actual.array.length !== expected.index.count * reference.itemSize) fail();
      for (let i = 0; i < actual.count; i++)
        for (let axis = 0; axis < actual.itemSize; axis++)
          if (!Object.is(actual.array[i * actual.itemSize + axis],
            reference.array[expected.index.array[i] * reference.itemSize + axis])) fail();
    }
  }
}

function assertChartInputs(mesh, baked) {
  const source = mesh.geometry, parameters = source.parameters || {};
  const native = source.getAttribute("position"), uv = baked.getAttribute("uv");
  if (source.type !== "LatheGeometry" || parameters.segments !== 72 ||
      !Array.isArray(parameters.points) || parameters.points.length !== 41 ||
      parameters.phiStart !== 0 || parameters.phiLength !== Math.PI * 2 ||
      native?.count !== 73 * 41 || !uv ||
      uv.count !== baked.getAttribute("position")?.count || !baked.getAttribute("normal"))
    throw new RangeError("Ribbed clay supports the unchanged Garden Vase only");
  assertOriginalBuffers(source, baked);

  // Prove that the measured profile remains the frozen authored chart. Use the
  // frozen values for output so that the Float32 chart is byte-exact to proof.
  let measured = 0;
  for (let i = 0; i < MERIDIAN_ARCS.length; i++) {
    if (!(native.getZ(i) > 0) || !Number.isFinite(native.getY(i)) || native.getX(i) !== 0)
      throw new RangeError("Ribbed clay requires the original positive-radius open Vase profile");
    if (i) measured += Math.hypot(native.getZ(i) - native.getZ(i - 1), native.getY(i) - native.getY(i - 1));
    if (Math.abs(measured - MERIDIAN_ARCS[i]) > 1e-14)
      throw new RangeError("The Vase meridian differs from the frozen ribbed clay chart");
  }
  if (RIBBED_CLAY_PERIOD !== 2 * Math.PI || RIBBED_CLAY_MAX_V !== MERIDIAN_ARCS.at(-1))
    throw new RangeError("The ribbed clay chart dimensions differ from the frozen model");
}

function createChart(mesh, baked) {
  const uv = baked.getAttribute("uv"), coordinates = new Float32Array(uv.count * 2);
  for (let i = 0; i < uv.count; i++) {
    // Keep this operation order exact to the frozen export. In particular,
    // native Float32 V is interpolated, not rounded back to its authored row.
    const at = uv.getY(i) * 40, j = Math.min(39, Math.floor(at)), f = at - j;
    coordinates[2 * i] = 2 * Math.PI * uv.getX(i);
    coordinates[2 * i + 1] = MERIDIAN_ARCS[j] * (1 - f) + MERIDIAN_ARCS[j + 1] * f;
  }

  const view = new BufferGeometry(), coordinateAttribute = new BufferAttribute(coordinates, 2);
  for (const [name, attribute] of Object.entries(baked.attributes)) view.setAttribute(name, attribute);
  view.setIndex(baked.index);
  for (const name of VIEW_METADATA) view[name] = baked[name];
  view.setAttribute("clayCoord", coordinateAttribute);
  view.userData = { ...baked.userData, ribbedClayChart: {
    modelVersion: RIBBED_CLAY_MODEL_VERSION, objectId: 7, chartPeriod: RIBBED_CLAY_PERIOD, chartMaxV: RIBBED_CLAY_MAX_V,
    coordinateBytes: coordinates.byteLength, borrowedAttributes: true,
  } };
  const dispose = view.dispose.bind(view);
  const record = { mesh, view, coordinateAttribute, coordinates, coordinateVersion: coordinateAttribute.version, disposed: false };
  view.dispose = () => {
    if (record.disposed) return;
    record.disposed = true;
    // Three's disposal listener must only see the owned chart buffer. Even if
    // a caller modifies this view, no borrowed or foreign attribute is ours.
    for (const name of Object.keys(view.attributes)) view.deleteAttribute(name);
    view.setAttribute("clayCoord", coordinateAttribute);
    view.setIndex(null);
    view.morphAttributes = {};
    dispose();
  };
  return record;
}


function intactView(record, baked) {
  const { view, coordinateAttribute, coordinates } = record;
  if (record.disposed || view.index !== baked.index ||
      Object.keys(view.attributes).length !== Object.keys(baked.attributes).length + 1 ||
      !Object.entries(baked.attributes).every(([name, attribute]) => view.getAttribute(name) === attribute) ||
      !VIEW_METADATA.every(name => view[name] === baked[name]) ||
      view.getAttribute("clayCoord") !== coordinateAttribute ||
      coordinateAttribute.array !== coordinates || coordinateAttribute.itemSize !== 2 ||
      coordinateAttribute.count !== baked.getAttribute("uv").count || coordinateAttribute.normalized !== false ||
      coordinateAttribute.isInterleavedBufferAttribute || coordinateAttribute.gpuType !== FloatType ||
      coordinateAttribute.version !== record.coordinateVersion) return false;
  // Raw buffer writes can omit needsUpdate. Such a corrupted view must not be
  // reused; rebuilding stages a separate owned view and leaves the old intact.
  const uv = baked.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) {
    const at = uv.getY(i) * 40, j = Math.min(39, Math.floor(at)), f = at - j;
    if (!Object.is(coordinates[2 * i], Math.fround(2 * Math.PI * uv.getX(i))) ||
        !Object.is(coordinates[2 * i + 1], Math.fround(MERIDIAN_ARCS[j] * (1 - f) + MERIDIAN_ARCS[j + 1] * f))) return false;
  }
  return true;
}

// New views remain staged until releaseUnused identifies the committed set.
// A failed preparation never retires or modifies the previous active view.
export function createRibbedClayGeometryManager() {
  const current = new WeakMap(), records = new Set();
  let disposed = false;
  const retire = record => {
    record.view.dispose();
    records.delete(record);
    if (current.get(record.mesh) === record) current.delete(record.mesh);
  };
  return {
    prepare(mesh, baked, { objectId } = {}) {
      if (disposed) throw new Error("Ribbed clay geometry manager is disposed");
      if (objectId !== 7 || !RIBBED_CLAY_ELIGIBLE_IDS.includes(objectId) ||
          !mesh?.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh ||
          !mesh.geometry?.isBufferGeometry || !baked?.isBufferGeometry)
        throw new RangeError("Ribbed clay is available only for Vase (7)");
      // Mutable draw metadata and transforms are checked on cache hits too.
      assertMetadata(mesh.geometry, baked);
      assertTransform(mesh);
      assertAO(baked);
      // Buffer contents are checked even on cache hits: unversioned raw edits
      // cannot silently change the fixed backing geometry or chart contract.
      assertChartInputs(mesh, baked);
      const key = fingerprint(mesh, baked), old = current.get(mesh);
      if (old && same(old.key, key) && intactView(old, baked)) return old.view;
      const record = createChart(mesh, baked);
      record.key = key;
      records.add(record);
      current.set(mesh, record);
      return record.view;
    },
    releaseUnused(activeGeometries) {
      if (disposed) return;
      const active = new Set(activeGeometries);
      for (const record of [...records]) if (!active.has(record.view) || record.disposed) retire(record);
      for (const record of records) current.set(record.mesh, record);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const record of [...records]) retire(record);
    },
  };
}
