import { BufferAttribute, BufferGeometry, LatheGeometry, Vector2 } from "three";
import { SHINGLE_MAX_V, SHINGLE_MODEL_VERSION, SHINGLE_ROW_PITCH, SHINGLE_U_CELLS } from "./shingle-relief-config.js";

const stamp = (attribute, versioned = false) => attribute
  ? [attribute, attribute.array, attribute.count, attribute.itemSize, attribute.normalized,
    versioned ? attribute.version : null]
  : [null];
const same = (a, b) => a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
function assertFullDrawRange(source, baked) {
  for (const geometry of [source, baked])
    if (geometry.groups.length || geometry.drawRange.start !== 0 ||
        geometry.drawRange.count !== Infinity || Object.keys(geometry.morphAttributes).length)
      throw new RangeError("Shingle relief requires unchanged original vase draw metadata");
}
const fingerprint = (mesh, baked) => [mesh.geometry, baked, ...mesh.scale.toArray(), ...mesh.matrixWorld.elements,
  mesh.geometry.type, mesh.geometry.parameters?.segments, mesh.geometry.parameters?.phiStart,
  mesh.geometry.parameters?.phiLength, mesh.geometry.parameters?.points?.length,
  ...stamp(mesh.geometry.getAttribute("position"), true),
  ...stamp(mesh.geometry.getAttribute("uv"), true),
  ...stamp(mesh.geometry.getAttribute("normal"), true),
  ...stamp(mesh.geometry.index, true),
  ...Object.entries(baked.attributes).flatMap(([name, attribute]) =>
    [name, ...stamp(attribute, ["position", "normal", "uv"].includes(name))]),
  ...stamp(baked.index, true), baked.groups, baked.drawRange, baked.morphAttributes,
  baked.morphTargetsRelative, baked.boundingBox, baked.boundingSphere];

function assertOriginalBuffers(source, baked) {
  // This material is deliberately scoped to the original Garden vase. Rebuild
  // its canonical r180 buffers for validation only; they never enter a renderer
  // or replace source geometry, and are released after this preparation.
  const points = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    points.push(new Vector2(0.31 + 0.31 * Math.sin(Math.PI * t) ** 0.8 -
      0.14 * Math.exp(-(((t - 0.9) / 0.15) ** 2)), 1.65 * t));
  }
  const expected = new LatheGeometry(points, 72);
  const equal = (a, b) => a && b && a.itemSize === b.itemSize &&
    a.array.constructor === b.array.constructor && a.array.length === b.array.length &&
    a.array.every((value, i) => Object.is(value, b.array[i]));
  const fail = () => { throw new RangeError("Shingle relief requires unchanged original vase buffers"); };
  try {
    if (!equal(source.index, expected.index)) fail();
    assertFullDrawRange(source, baked);
    if (baked.index && !equal(baked.index, expected.index)) fail();
    for (const name of ["position", "normal", "uv"]) {
      const reference = expected.getAttribute(name), actual = baked.getAttribute(name);
      if (!equal(source.getAttribute(name), reference)) fail();
      if (baked.index) { if (!equal(actual, reference)) fail(); continue; }
      if (!actual || actual.itemSize !== reference.itemSize ||
          actual.array.constructor !== reference.array.constructor ||
          actual.count !== expected.index.count) fail();
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
      parameters.points?.length !== 41 || parameters.phiStart !== 0 ||
      parameters.phiLength !== Math.PI * 2 || native?.count !== 73 * 41 ||
      !uv || uv.count !== baked.getAttribute("position")?.count ||
      !baked.getAttribute("normal") || mesh.scale.toArray().some(value => value !== 1))
    throw new RangeError("Shingle relief supports the unchanged Garden vase only");
  if (baked.hasAttribute("shingleCoord"))
    throw new Error("The source geometry already contains reserved shingle coordinates");
  assertOriginalBuffers(source, baked);

  // The first meridian contains the actual Float32 profile used by Three.
  // Chart V follows its polygonal arc length; U stays unwrapped at the seam.
  const arc = [0];
  for (let i = 0; i < 41; i++) {
    if (!(native.getZ(i) > 0) || !Number.isFinite(native.getY(i)) || native.getX(i) !== 0)
      throw new RangeError("Shingle relief requires the original open, positive-radius vase profile");
    if (i) arc.push(arc[i - 1] + Math.hypot(
      native.getZ(i) - native.getZ(i - 1), native.getY(i) - native.getY(i - 1)));
  }
  const length = arc.at(-1);
  if (Math.abs(length / SHINGLE_ROW_PITCH - SHINGLE_MAX_V) > 1e-9)
    throw new RangeError("The vase profile differs from the frozen shingle model");
  const coordinates = new Float32Array(uv.count * 2);
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    if (!Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1)
      throw new RangeError("Shingle relief requires finite native vase UV coordinates");
    const at = v * 40, a = Math.min(39, Math.floor(at)), fraction = at - a;
    coordinates[i * 2] = SHINGLE_U_CELLS * u;
    coordinates[i * 2 + 1] = (length - (arc[a] * (1 - fraction) + arc[a + 1] * fraction)) / SHINGLE_ROW_PITCH;
  }
  const view = new BufferGeometry(), borrowed = Object.keys(baked.attributes);
  for (const name of borrowed) view.setAttribute(name, baked.attributes[name]);
  view.setIndex(baked.index);
  for (const name of ["groups", "drawRange", "morphAttributes", "morphTargetsRelative", "boundingBox", "boundingSphere"])
    view[name] = baked[name];
  view.setAttribute("shingleCoord", new BufferAttribute(coordinates, 2));
  view.userData = { ...baked.userData, shingleReliefChart: {
    modelVersion: SHINGLE_MODEL_VERSION, objectId: 7, maxV: SHINGLE_MAX_V,
    profileLength: length, coordinateBytes: coordinates.byteLength, borrowedAttributes: true,
  } };
  const dispose = view.dispose.bind(view);
  let disposed = false;
  view.dispose = () => {
    if (disposed) return;
    disposed = true;
    // WebGLGeometries must release only our coordinate buffer and VAO, never
    // the source position/index/AO buffers still used by other capture passes.
    for (const name of borrowed) view.deleteAttribute(name);
    view.setIndex(null);
    view.morphAttributes = {};
    dispose();
  };
  return view;
}

// Preparation can fail later in the scene's atomic update. Keep the previous
// active view until releaseUnused is told which geometries were installed.
export function createShingleGeometryManager() {
  const current = new WeakMap(), records = new Set();
  let disposed = false;
  const retire = record => {
    record.view.dispose();
    records.delete(record);
    if (current.get(record.mesh) === record) current.delete(record.mesh);
  };
  return {
    prepare(mesh, baked, { objectId } = {}) {
      if (disposed) throw new Error("Shingle geometry manager is disposed");
      if (objectId !== 7 || !mesh?.isMesh || !baked?.isBufferGeometry)
        throw new RangeError("Shingle relief is available only for Vase (7)");
      // Draw metadata is mutable in place, without BufferAttribute versions.
      // Enforce the fixed-vase contract on cache hits as well as new charts.
      assertFullDrawRange(mesh.geometry, baked);
      const key = fingerprint(mesh, baked), old = current.get(mesh);
      if (old && same(old.key, key)) return old.view;
      const view = createChart(mesh, baked), record = { mesh, view, key };
      records.add(record);
      current.set(mesh, record);
      return view;
    },
    releaseUnused(activeGeometries) {
      if (disposed) return;
      const active = new Set(activeGeometries);
      for (const record of [...records]) if (!active.has(record.view)) retire(record);
      for (const record of records) current.set(record.mesh, record);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const record of [...records]) retire(record);
    },
  };
}
