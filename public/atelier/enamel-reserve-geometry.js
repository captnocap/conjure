import { BufferAttribute, BufferGeometry, LatheGeometry, Vector2 } from "./vendor/three.module.min.js";
import { ENAMEL_ELIGIBLE_IDS, ENAMEL_L, ENAMEL_MODEL_VERSION, ENAMEL_S } from "./enamel-reserve-config.js";

// Frozen CHART.json: actual Float32 meridian vertices, accumulated in double
// precision. These authored coordinates are not a normalized/inverted V chart.
const MERIDIAN_ARCS = Object.freeze([
  0, 0.057783687335660076, 0.10868039490892598, 0.1577244172811363,
  0.2056247287880522, 0.2526608811191814, 0.2989747901687817,
  0.34465021303653226, 0.38974335750075856, 0.43429676555916574,
  0.47834691070011215, 0.521928315746609, 0.5650758502040464,
  0.6078264548360797, 0.6502198712028325, 0.6922989851514428,
  0.7341100161018298, 0.7757020494099041, 0.8171269989925289,
  0.8584390671180747, 0.8996949319489731, 0.9409551977662481,
  0.9822888065210821, 1.0237824313734636, 1.0655588135556702,
  1.1078051539995648, 1.1508100391040121, 1.1949935009291173,
  1.2408946136300911, 1.2890699234599365, 1.339884227145449,
  1.3932521183863193, 1.4484595527689836, 1.504195833927261,
  1.5588530538474465, 1.611025992700569, 1.6600207084137792,
  1.7060899140028332, 1.7502057861219826, 1.7936302755013154,
  1.8400081814276228,
]);
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
      throw new RangeError("Enamel reserve requires unchanged original Vase draw metadata");
    if (geometry.hasAttribute("enCoord"))
      throw new RangeError("The source geometry already contains reserved enamel coordinates");
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
    throw new RangeError("Enamel reserve requires the unchanged original Vase transform and unit scale");
}

function assertAO(baked) {
  const count = baked.getAttribute("position")?.count;
  for (const name of ["materialAO", "materialLightAO"]) {
    const attribute = baked.getAttribute(name);
    if (!attribute || attribute.isInterleavedBufferAttribute || attribute.itemSize !== 1 ||
        attribute.normalized !== false || attribute.count !== count ||
        !(attribute.array instanceof Float32Array) || !attribute.array.every(Number.isFinite))
      throw new RangeError("Enamel reserve requires finite original baked materialAO and materialLightAO attributes");
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

function assertOriginalBuffers(source, baked) {
  // Reconstruct Three r180's canonical buffers solely for validation. They are
  // never rendered or installed on either source or baked geometry.
  const points = originalProfile(), expected = new LatheGeometry(points, 72);
  const equal = (a, b) => a && b && !a.isInterleavedBufferAttribute &&
    a.itemSize === b.itemSize && a.count === b.count && a.normalized === b.normalized && a.gpuType === b.gpuType &&
    a.array?.constructor === b.array.constructor && a.array.length === b.array.length &&
    a.array.every((value, i) => Object.is(value, b.array[i]));
  const fail = () => { throw new RangeError("Enamel reserve requires unchanged original Vase buffers and topology"); };
  try {
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
  } finally { expected.dispose(); }
}

function createChart(mesh, baked) {
  const source = mesh.geometry, parameters = source.parameters || {};
  const native = source.getAttribute("position"), uv = baked.getAttribute("uv");
  if (source.type !== "LatheGeometry" || parameters.segments !== 72 ||
      !Array.isArray(parameters.points) || parameters.points.length !== 41 ||
      parameters.phiStart !== 0 || parameters.phiLength !== Math.PI * 2 ||
      native?.count !== 73 * 41 || !uv ||
      uv.count !== baked.getAttribute("position")?.count || !baked.getAttribute("normal"))
    throw new RangeError("Enamel reserve supports the unchanged Garden Vase only");
  assertOriginalBuffers(source, baked);

  // Prove that the measured profile remains the frozen authored chart. Use the
  // frozen values for output so that the Float32 chart is byte-exact to proof.
  let measured = 0;
  for (let i = 0; i < MERIDIAN_ARCS.length; i++) {
    if (!(native.getZ(i) > 0) || !Number.isFinite(native.getY(i)) || native.getX(i) !== 0)
      throw new RangeError("Enamel reserve requires the original positive-radius open Vase profile");
    if (i) measured += Math.hypot(native.getZ(i) - native.getZ(i - 1), native.getY(i) - native.getY(i - 1));
    if (Math.abs(measured - MERIDIAN_ARCS[i]) > 1e-14)
      throw new RangeError("The Vase meridian differs from the frozen enamel chart");
  }
  if (ENAMEL_L !== 3.893621295721977 || ENAMEL_S !== MERIDIAN_ARCS.at(-1))
    throw new RangeError("The enamel chart dimensions differ from the frozen model");
  const coordinates = new Float32Array(uv.count * 2);
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i), profile = v * 40, index = Math.round(profile);
    if (!Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1 ||
        Math.abs(profile - index) >= 1e-5 || index < 0 || index >= MERIDIAN_ARCS.length)
      throw new RangeError("Enamel reserve requires finite native Vase UV coordinates");
    coordinates[i * 2] = u * ENAMEL_L;
    coordinates[i * 2 + 1] = MERIDIAN_ARCS[index];
  }

  const view = new BufferGeometry(), coordinateAttribute = new BufferAttribute(coordinates, 2);
  for (const [name, attribute] of Object.entries(baked.attributes)) view.setAttribute(name, attribute);
  view.setIndex(baked.index);
  for (const name of VIEW_METADATA) view[name] = baked[name];
  view.setAttribute("enCoord", coordinateAttribute);
  view.userData = { ...baked.userData, enamelReserveChart: {
    modelVersion: ENAMEL_MODEL_VERSION, objectId: 7, chartL: ENAMEL_L, chartS: ENAMEL_S,
    coordinateBytes: coordinates.byteLength, borrowedAttributes: true,
  } };
  const dispose = view.dispose.bind(view);
  const record = { mesh, view, coordinateAttribute, disposed: false };
  view.dispose = () => {
    if (record.disposed) return;
    record.disposed = true;
    // Three's disposal listener must only see the owned chart buffer. Even if
    // a caller modifies this view, no borrowed or foreign attribute is ours.
    for (const name of Object.keys(view.attributes)) view.deleteAttribute(name);
    view.setAttribute("enCoord", coordinateAttribute);
    view.setIndex(null);
    view.morphAttributes = {};
    dispose();
  };
  return record;
}

// New views remain staged until releaseUnused identifies the committed set.
// A failed preparation never retires or modifies the previous active view.
export function createEnamelGeometryManager() {
  const current = new WeakMap(), records = new Set();
  let disposed = false;
  const retire = record => {
    record.view.dispose();
    records.delete(record);
    if (current.get(record.mesh) === record) current.delete(record.mesh);
  };
  return {
    prepare(mesh, baked, { objectId } = {}) {
      if (disposed) throw new Error("Enamel geometry manager is disposed");
      if (objectId !== 7 || !ENAMEL_ELIGIBLE_IDS.includes(objectId) ||
          !mesh?.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh ||
          !mesh.geometry?.isBufferGeometry || !baked?.isBufferGeometry)
        throw new RangeError("Enamel reserve is available only for Vase (7)");
      // Mutable draw metadata and transforms are checked on cache hits too.
      assertMetadata(mesh.geometry, baked);
      assertTransform(mesh);
      assertAO(baked);
      const key = fingerprint(mesh, baked), old = current.get(mesh);
      if (old && !old.disposed && same(old.key, key) &&
          old.view.getAttribute("enCoord") === old.coordinateAttribute) return old.view;
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
