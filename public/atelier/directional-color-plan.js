// Fixed transport: exact source evidence and the completed 720-square output.
// Every packet and renderer owns fresh ordinary buffers. No workspaces are kept.
import { DIRECTIONAL_COLOR_MODEL, DIRECTIONAL_COLOR_SOURCE_SIZE,
  copyDirectionalColorSource, validateDirectionalColorSource } from './directional-color-core.js';
export { DIRECTIONAL_COLOR_MODEL, DIRECTIONAL_COLOR_SOURCE_SIZE,
  copyDirectionalColorSource, validateDirectionalColorSource };
export const DIRECTIONAL_COLOR_RETAINED_BYTES = 720 * 720 * 4 * 2;
const SOURCE_BYTES = 720 * 720 * 4;
const KEYS = ['version', 'model', 'source', 'size', 'sourceRGBA', 'outputRGBA'];
const TA = Object.getPrototypeOf(Uint8Array.prototype);
const brand = Object.getOwnPropertyDescriptor(TA, Symbol.toStringTag).get;
const length = Object.getOwnPropertyDescriptor(TA, 'length').get;
const buffer = Object.getOwnPropertyDescriptor(TA, 'buffer').get;
const offset = Object.getOwnPropertyDescriptor(TA, 'byteOffset').get;
const byteLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
const resizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable')?.get;
const detached = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'detached')?.get;
let nextSource = 0;
function bytes(value) {
  const kind = brand.call(value), backing = buffer.call(value), start = offset.call(value);
  const size = byteLength.call(backing);
  if (kind !== 'Uint8Array' || resizable?.call(backing) || detached?.call(backing) ||
      length.call(value) !== SOURCE_BYTES || start !== 0 || size !== SOURCE_BYTES)
    throw Error('Invalid Directional color plan buffer');
  const rgba = new Uint8Array(backing, start, SOURCE_BYTES);
  for (let i = 3; i < rgba.length; i += 4)
    if (rgba[i] !== 255) throw Error('Directional color requires opaque source and output pixels');
  return rgba;
}
function sourceView(rgba, size) {
  validateDirectionalColorSource(rgba, size);
  return new Uint8Array(buffer.call(rgba), offset.call(rgba), SOURCE_BYTES);
}
function equal(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function association(value) {
  if (!value || typeof value.source !== 'string' || !value.source.length ||
      value.source.length > 80 || value.size !== 720) throw Error('Invalid Directional color source');
}
function packetViews(plan, expected, rgba) {
  association(expected);
  if (!plan || typeof plan !== 'object' || Reflect.ownKeys(plan).length !== KEYS.length ||
      !KEYS.every(key => Object.getOwnPropertyDescriptor(plan, key)?.value !== undefined) ||
      plan.version !== 1 || plan.model !== DIRECTIONAL_COLOR_MODEL ||
      plan.source !== expected.source || plan.size !== expected.size)
    throw Error('Invalid Directional color plan association');
  const sourceRGBA = bytes(plan.sourceRGBA), outputRGBA = bytes(plan.outputRGBA);
  if (sourceRGBA.buffer === outputRGBA.buffer) throw Error('Invalid Directional color buffer ownership');
  if (rgba !== undefined && !equal(sourceRGBA, sourceView(rgba, expected.size)))
    throw Error('Stale Directional color source pixels');
  return { sourceRGBA, outputRGBA };
}
export function validateDirectionalColorPlan(plan, expected, rgba) {
  packetViews(plan, expected, rgba);
  return plan;
}
function copyPlan(plan, arrays = plan, expected = plan) {
  return { version: 1, model: DIRECTIONAL_COLOR_MODEL, source: expected.source, size: 720,
    sourceRGBA: new Uint8Array(arrays.sourceRGBA), outputRGBA: new Uint8Array(arrays.outputRGBA) };
}
export function compactDirectionalColorPlan(full, expected, rgba) {
  association(expected);
  const output = typeof full?.renderRGBA === 'function' ? full.renderRGBA() : full?.outputRGBA;
  return validateDirectionalColorPlan({ version: 1, model: DIRECTIONAL_COLOR_MODEL,
    source: expected.source, size: 720, sourceRGBA: copyDirectionalColorSource(rgba, 720),
    outputRGBA: new Uint8Array(bytes(output)) }, expected, rgba);
}
export function hydrateDirectionalColorPlan(plan, expected, rgba) {
  const outputRGBA = new Uint8Array(packetViews(plan, expected, rgba).outputRGBA);
  return Object.freeze({ renderRGBA: () => new Uint8Array(outputRGBA) });
}
// One healthy completed result, plus at most one in-flight source snapshot.
// Exact bytes decide cache hits; seed, strength, object identity and hashes do not.
// New sources invalidate older tickets. Failed validation/allocation never commits.
export function createDirectionalColorPlanCache() {
  let entry = null, current = null, disposed = false;
  function assertOpen() { if (disposed) throw Error('Directional color cache is disposed'); }
  function assertCurrent(raw, expected) {
    assertOpen();
    association(expected);
    if (!raw || !current || expected.source !== current.source ||
        !equal(current.sourceRGBA, sourceView(raw.color, raw.size)))
      throw Error('Stale Directional color cache reply');
  }
  return {
    assertCurrent,
    clear() { entry = null; current = null; },
    dispose() { entry = null; current = null; disposed = true; },
    preparation(raw) {
      assertOpen();
      if (!raw || typeof raw !== 'object') throw Error('Invalid Directional color capture');
      const source = sourceView(raw.color, raw.size);
      if (!current || !equal(current.sourceRGBA, source)) {
        const sourceRGBA = entry && equal(entry.sourceRGBA, source) ? entry.sourceRGBA : new Uint8Array(source);
        current = { source: `directional-color-${++nextSource}`, size: 720, sourceRGBA };
      }
      const expected = { source: current.source, size: 720 };
      return { ...expected, ...(entry && equal(entry.sourceRGBA, source) ? { plan: copyPlan(entry, entry, expected) } : {}) };
    },
    remember(raw, expected, packet) {
      assertCurrent(raw, expected);
      const own = copyPlan(packet, packetViews(packet, expected, current.sourceRGBA));
      // Commit only after validation and both owned allocations succeed.
      entry = own;
      current = { source: expected.source, size: 720, sourceRGBA: own.sourceRGBA };
    },
  };
}
