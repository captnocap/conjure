// Fixed replay transport: only source evidence and the accepted logical raster.
// Retained arrays are private; every transport/output is a fresh ordinary buffer.
export const PIXEL_CLUSTER_MODEL = 'f6df22f483fb09c31064748e9b08c8524422462965955fd900bb3a28bd79e159';
export const PIXEL_CLUSTER_SOURCE_SIZE = 720;
export const PIXEL_CLUSTER_LOGICAL_SIZE = 120;
export const PIXEL_CLUSTER_RETAINED_BYTES = 720 * 720 * 4 + 120 * 120 * 4;
const SOURCE_BYTES = 720 * 720 * 4, LOGICAL_BYTES = 120 * 120 * 4;
const KEYS = ['version', 'model', 'source', 'size', 'original', 'rgba120'];
const TA = Object.getPrototypeOf(Uint8Array.prototype);
const brand = Object.getOwnPropertyDescriptor(TA, Symbol.toStringTag).get;
const length = Object.getOwnPropertyDescriptor(TA, 'length').get;
const buffer = Object.getOwnPropertyDescriptor(TA, 'buffer').get;
const offset = Object.getOwnPropertyDescriptor(TA, 'byteOffset').get;
const byteLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
const resizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable')?.get;
const detached = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'detached')?.get;
let nextSource = 0;
function bytes(value, kinds, count, packed = false) {
  const kind = brand.call(value), backing = buffer.call(value), start = offset.call(value);
  const size = byteLength.call(backing); // Shared buffers have no valid ArrayBuffer slot.
  if (!kinds.includes(kind) || resizable?.call(backing) || detached?.call(backing) ||
      length.call(value) !== count || (packed && (start !== 0 || size !== count)))
    throw Error('Invalid Pixel clusters buffer');
  return new Uint8Array(backing, start, count);
}
function opaque(rgba) {
  for (let i = 3; i < rgba.length; i += 4)
    if (rgba[i] !== 255) throw Error('Pixel clusters requires opaque source and output pixels');
  return rgba;
}
function sourceView(rgba, size) {
  if (size !== 720) throw Error('Pixel clusters requires the fixed 720 × 720 source');
  return opaque(bytes(rgba, ['Uint8Array', 'Uint8ClampedArray'], SOURCE_BYTES));
}
function logicalView(rgba) {
  const pixels = opaque(bytes(rgba, ['Uint8Array'], LOGICAL_BYTES, true)), colors = new Set();
  for (let i = 0; i < pixels.length; i += 4) {
    colors.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]);
    if (colors.size > 24) throw Error('Pixel clusters exceeds the fixed 24-color budget');
  }
  return pixels;
}
function equal(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function association(value) {
  if (!value || typeof value.source !== 'string' || !value.source.length ||
      value.source.length > 80 || value.size !== 720) throw Error('Invalid Pixel clusters source');
}
export function validatePixelClusterSource(rgba, size) { sourceView(rgba, size); }
export function copyPixelClusterSource(rgba, size) { return new Uint8Array(sourceView(rgba, size)); }
function packetViews(plan, expected, rgba) {
  association(expected);
  if (!plan || typeof plan !== 'object' || Object.keys(plan).length !== KEYS.length ||
      !KEYS.every(key => Object.getOwnPropertyDescriptor(plan, key)?.value !== undefined) ||
      plan.version !== 1 || plan.model !== PIXEL_CLUSTER_MODEL ||
      plan.source !== expected.source || plan.size !== expected.size)
    throw Error('Invalid Pixel clusters plan association');
  const original = opaque(bytes(plan.original, ['Uint8Array'], SOURCE_BYTES, true)), rgba120 = logicalView(plan.rgba120);
  if (original.buffer === rgba120.buffer) throw Error('Invalid Pixel clusters buffer ownership');
  if (rgba !== undefined && !equal(original, sourceView(rgba, expected.size)))
    throw Error('Stale Pixel clusters source pixels');
  return { original, rgba120 };
}
export function validatePixelClusterPlan(plan, expected, rgba) {
  packetViews(plan, expected, rgba);
  return plan;
}
function copyPlan(plan, arrays = plan, expected = plan) {
  return { version: 1, model: PIXEL_CLUSTER_MODEL, source: expected.source, size: 720,
    original: new Uint8Array(arrays.original), rgba120: new Uint8Array(arrays.rgba120) };
}
export function compactPixelClusterPlan(full, expected, rgba) {
  association(expected);
  const logical = typeof full?.renderLogical === 'function' ? full.renderLogical() : full?.rgba120;
  return validatePixelClusterPlan({ version: 1, model: PIXEL_CLUSTER_MODEL,
    source: expected.source, size: 720, original: copyPixelClusterSource(rgba, 720),
    rgba120: new Uint8Array(logicalView(logical)) }, expected, rgba);
}
export function hydratePixelClusterPlan(plan, expected, rgba) {
  const logical = new Uint8Array(packetViews(plan, expected, rgba).rgba120);
  return Object.freeze({
    renderLogical: () => new Uint8Array(logical),
    renderRGBA() {
      const out = new Uint8Array(SOURCE_BYTES);
      for (let y = 0; y < 720; y++) for (let x = 0; x < 720; x++) {
        const source = (Math.floor(y / 6) * 120 + Math.floor(x / 6)) * 4, target = (y * 720 + x) * 4;
        out[target] = logical[source]; out[target + 1] = logical[source + 1];
        out[target + 2] = logical[source + 2]; out[target + 3] = 255;
      }
      return out;
    },
  });
}
// One healthy result, plus at most one in-flight source snapshot. New source
// requests invalidate old tickets; validation/allocation failures preserve the
// healthy entry. Exact source bytes, never seed/strength/hash identity, decide hits.
export function createPixelClusterPlanCache() {
  let entry = null, current = null;
  function assertCurrent(raw, expected) {
    association(expected);
    if (!current || expected.source !== current.source || !equal(current.original, sourceView(raw.color, raw.size)))
      throw Error('Stale Pixel clusters cache reply');
  }
  return {
    assertCurrent,
    clear() { entry = null; current = null; },
    preparation(raw) {
      if (!raw || typeof raw !== 'object') throw Error('Invalid Pixel clusters capture');
      const source = sourceView(raw.color, raw.size);
      if (!current || !equal(current.original, source)) {
        const original = entry && equal(entry.original, source) ? entry.original : new Uint8Array(source);
        current = { source: `pixel-clusters-${++nextSource}`, size: 720, original };
      }
      const expected = { source: current.source, size: 720 };
      return { ...expected, ...(entry && equal(entry.original, source) ? { plan: copyPlan(entry, entry, expected) } : {}) };
    },
    remember(raw, expected, packet) {
      assertCurrent(raw, expected);
      const own = copyPlan(packet, packetViews(packet, expected, current.original));
      // Commit only after every validation and allocation succeeds.
      entry = own;
      current = { source: expected.source, size: 720, original: own.original };
    },
  };
}
