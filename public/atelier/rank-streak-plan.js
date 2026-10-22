import { coveragePercentFromStrength } from './rank-streaks.js';

// Transport contains only replay data. The accepted core keeps its diagnostic
// permutation; the main-thread cache does not need it. No live buffer is exposed
// by a retained cache or hydrated renderer, or transferred out of either one.
const MODEL = 'sorted-span-coverage-cap72-v1';
const KEYS = ['version', 'model', 'source', 'size', 'original', 'sorted', 'spans'];
const TA = Object.getPrototypeOf(Uint8Array.prototype);
const brand = Object.getOwnPropertyDescriptor(TA, Symbol.toStringTag).get;
const length = Object.getOwnPropertyDescriptor(TA, 'length').get;
const buffer = Object.getOwnPropertyDescriptor(TA, 'buffer').get;
const offset = Object.getOwnPropertyDescriptor(TA, 'byteOffset').get;
const byteLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
const resizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable')?.get;
const detached = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'detached')?.get;
let nextSource = 0;

// The shared controls/recipes stay at 15..95 for every older study. Only this
// study maps that domain to coverage, preserving the accepted 60 -> 60 default.
export function rankCoverageFromSharedStrength(strength) {
  if (typeof strength !== 'number' || !Number.isFinite(strength))
    throw new TypeError('shared strength must be a finite number');
  const coverage = strength <= 0.6 ? (strength - 0.15) * 4 / 3
    : 0.6 + (strength - 0.6) * 8 / 7;
  return coveragePercentFromStrength(coverage);
}

function dimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width < 1 || height < 1 || width > 720 || height > 720)
    throw Error('Invalid Pixel sorting dimensions');
  return width * height;
}
function view(value, brands, count, packed = false) {
  const kind = brand.call(value), backing = buffer.call(value), start = offset.call(value);
  const bytes = byteLength.call(backing); // Also rejects shared buffers.
  if (!brands.includes(kind) || resizable?.call(backing) || detached?.call(backing) ||
      length.call(value) !== count || (packed && (start !== 0 || bytes !== count * (kind === 'Uint32Array' ? 4 : 1))))
    throw Error('Invalid Pixel sorting buffer');
  // Inspect actual intrinsic slots, not mutable own properties on a view.
  return kind === 'Uint32Array' ? new Uint32Array(backing, start, count)
    : new Uint8Array(backing, start, count);
}
function sourceView(rgba, width, height) {
  return view(rgba, ['Uint8Array', 'Uint8ClampedArray'], dimensions(width, height) * 4);
}
function equal(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
export function validateRankStreakSource(rgba, width, height) {
  sourceView(rgba, width, height);
}
export function copyRankStreakSource(rgba, width, height) {
  return new Uint8Array(sourceView(rgba, width, height));
}
function association(value) {
  if (!value || typeof value.source !== 'string' || !value.source.length ||
      value.source.length > 80) throw Error('Invalid Pixel sorting source');
  dimensions(value.size, value.size);
}
function packetViews(plan, expected, rgba) {
  association(expected);
  if (!plan || typeof plan !== 'object' || Object.keys(plan).length !== KEYS.length ||
      !KEYS.every(key => Object.getOwnPropertyDescriptor(plan, key)?.value !== undefined) ||
      plan.version !== 1 || plan.model !== MODEL || plan.source !== expected.source ||
      plan.size !== expected.size) throw Error('Invalid Pixel sorting plan association');
  const count = dimensions(plan.size, plan.size), original = view(plan.original, ['Uint8Array'], count * 4, true),
    sorted = view(plan.sorted, ['Uint8Array'], count * 4, true), spanLength = length.call(plan.spans);
  if (spanLength % 2 || spanLength > count) throw Error('Invalid Pixel sorting span count');
  const spans = view(plan.spans, ['Uint32Array'], spanLength, true);
  if (new Set([original.buffer, sorted.buffer, spans.buffer]).size !== 3)
    throw Error('Invalid Pixel sorting buffer ownership');
  if (rgba !== undefined && !equal(original, sourceView(rgba, plan.size, plan.size)))
    throw Error('Stale Pixel sorting source pixels');
  const occupied = new Uint8Array(count);
  for (let i = 0; i < spans.length; i += 2) {
    const start = spans[i], size = spans[i + 1];
    if (size < 2 || size > 72 || start + size > count || start % plan.size + size > plan.size)
      throw Error('Invalid Pixel sorting span bounds');
    for (let k = start; k < start + size; k++) {
      if (occupied[k]) throw Error('Overlapping Pixel sorting spans');
      occupied[k] = 1;
    }
  }
  return { original, sorted, spans };
}
export function validateRankStreakPlan(plan, expected, rgba) {
  packetViews(plan, expected, rgba);
  return plan;
}
function copyPlan(plan, arrays = plan) {
  return { version: 1, model: MODEL, source: plan.source, size: plan.size,
    original: new Uint8Array(arrays.original), sorted: new Uint8Array(arrays.sorted),
    spans: new Uint32Array(arrays.spans) };
}
export function compactRankStreakPlan(full, expected) {
  association(expected);
  const m = full.metadata;
  if (m.width !== expected.size || m.height !== expected.size || m.cap !== 72 ||
      m.lowerInclusive !== 16384 || m.upperExclusive !== 57344)
    throw Error('Invalid Pixel sorting core association');
  const spans = new Uint32Array(m.rankedChunkIds.length * 2);
  m.rankedChunkIds.forEach((id, i) => {
    spans[i * 2] = m.chunks[id].offset;
    spans[i * 2 + 1] = m.chunks[id].length;
  });
  return validateRankStreakPlan({ version: 1, model: MODEL, source: expected.source,
    size: expected.size, original: full.renderPercent(0), sorted: full.renderPercent(100), spans }, expected);
}
export function hydrateRankStreakPlan(packet, expected, rgba) {
  const { original, sorted, spans } = copyPlan(packet, packetViews(packet, expected, rgba));
  function selectedCount(percent) {
    if (!Number.isInteger(percent) || percent < 0 || percent > 100)
      throw Error('Invalid Pixel sorting coverage');
    return Math.floor((percent * (spans.length / 2) + 50) / 100);
  }
  function renderPercent(percent) {
    const count = selectedCount(percent), out = new Uint8Array(original);
    for (let i = 0; i < count * 2; i += 2) {
      const start = spans[i] * 4, end = start + spans[i + 1] * 4;
      out.set(sorted.subarray(start, end), start);
    }
    return out;
  }
  return Object.freeze({ selectedCount, renderPercent,
    renderStrength: strength => renderPercent(coveragePercentFromStrength(strength)) });
}

// Exactly one source revision per mixer/study renderer. Replacing the capture
// releases the previous rasters; seed and coverage never create extra entries.
// Byte equality also invalidates an accidentally mutated capture in place.
export function createRankStreakPlanCache() {
  let capture = null;
  return {
    clear() { capture = null; },
    preparation(raw, includePlan = true) {
      if (!raw || typeof raw !== 'object') throw Error('Invalid Pixel sorting capture');
      const rgba = sourceView(raw.color, raw.size, raw.size);
      if (!capture || capture.raw !== raw || capture.size !== raw.size || !equal(capture.original, rgba))
        capture = { raw, size: raw.size, source: `rank-streak-${++nextSource}`,
          original: new Uint8Array(rgba), plan: null };
      return { source: capture.source, size: capture.size,
        ...(includePlan && capture.plan ? { plan: copyPlan(capture.plan) } : {}) };
    },
    remember(raw, expected, packet) {
      if (!capture || capture.raw !== raw || capture.source !== expected.source ||
          capture.size !== raw.size || !equal(capture.original, sourceView(raw.color, raw.size, raw.size)))
        throw Error('Stale Pixel sorting cache reply');
      const own = copyPlan(packet, packetViews(packet, expected, capture.original));
      capture.original = own.original;
      capture.plan = own;
    },
  };
}
