/**
 * Sorted-span coverage, independently implemented for the frozen external proof.
 * No dependencies, canvas, random state, color synthesis, or output feedback.
 * Each preparation owns a private source snapshot and a single full-order field.
 */
const CAP = 72;
const LOWER = 16384;
const UPPER = 57344;
const MAX_DIMENSION = 720; // App rendering ceiling; does not change cap72.
// Intrinsics read actual view slots: own length/buffer properties can be forged.
const TYPED_ARRAY = Object.getPrototypeOf(Uint8Array.prototype);
const typedBrand = Object.getOwnPropertyDescriptor(TYPED_ARRAY, Symbol.toStringTag).get;
const typedLength = Object.getOwnPropertyDescriptor(TYPED_ARRAY, 'length').get;
const typedBuffer = Object.getOwnPropertyDescriptor(TYPED_ARRAY, 'buffer').get;
const typedByteOffset = Object.getOwnPropertyDescriptor(TYPED_ARRAY, 'byteOffset').get;
const bufferByteLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
const bufferResizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable')?.get;
const bufferDetached = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'detached')?.get;

export function coveragePercentFromStrength(strength) {
  if (typeof strength !== 'number' || !Number.isFinite(strength)) {
    throw new TypeError('strength must be a finite number');
  }
  return Math.floor(Math.min(1, Math.max(0, strength)) * 100 + 0.5);
}

function validatePercent(percent) {
  if (typeof percent !== 'number' || !Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError('sorted-span coverage must be an integer from 0 through 100');
  }
  return percent;
}

function validateSource(rgba, width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new RangeError('width and height must be integers from 1 through 720');
  }
  const count = width * height;
  if (!Number.isSafeInteger(count) || count > 0xffffffff || !Number.isSafeInteger(count * 4)) {
    throw new RangeError('dimensions exceed exact Uint32 record addressing');
  }
  const brand = typedBrand.call(rgba);
  if (brand !== 'Uint8Array' && brand !== 'Uint8ClampedArray') {
    throw new TypeError('rgba must be a Uint8Array or Uint8ClampedArray');
  }
  const buffer = typedBuffer.call(rgba);
  // ArrayBuffer's intrinsic byteLength getter rejects SharedArrayBuffer too.
  bufferByteLength.call(buffer);
  if (bufferResizable?.call(buffer) || bufferDetached?.call(buffer)) {
    throw new TypeError('rgba must have a fixed, nonshared, attached ArrayBuffer');
  }
  const length = typedLength.call(rgba);
  if (length !== count * 4) {
    throw new RangeError('rgba length must equal width * height * 4');
  }
  const view = new Uint8Array(buffer, typedByteOffset.call(rgba), length);
  return { pixelCount: count, source: new Uint8Array(view) };
}

function countInversions(order) {
  // order gives ascending rank -> original local record. Its inverse has the
  // same inversion count, so no second rank array is needed.
  const tree = new Uint16Array(order.length + 1);
  let inversions = 0;
  for (let seen = 0; seen < order.length; seen++) {
    let prefix = 0;
    for (let k = order[seen] + 1; k > 0; k -= k & -k) prefix += tree[k];
    inversions += seen - prefix;
    for (let k = order[seen] + 1; k < tree.length; k += k & -k) tree[k]++;
  }
  return inversions;
}

function priorityCompare(a, b) {
  // m <= 72: each product <= 2556^2 = 6,533,136, exactly represented.
  const difference = b.inversions * a.pairs - a.inversions * b.pairs;
  return difference || a.row - b.row || a.left - b.left;
}

export function prepareSortedSpanCoverage(rgba, width, height) {
  const { pixelCount, source } = validateSource(rgba, width, height);
  let scores = new Uint16Array(pixelCount);
  const fullOrder = new Uint32Array(pixelCount);
  const fullOutput = new Uint8Array(source);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    scores[i] = 54 * source[o] + 183 * source[o + 1] + 19 * source[o + 2];
    fullOrder[i] = i;
  }

  const intervals = [];
  const chunks = [];
  const ranked = [];
  let eligiblePixels = 0;
  let totalInversions = 0;
  for (let row = 0; row < height; row++) {
    const rowOffset = row * width;
    let x = 0;
    while (x < width) {
      const s = scores[rowOffset + x];
      if (s < LOWER || s >= UPPER) { x++; continue; }
      const left = x++;
      while (x < width && scores[rowOffset + x] >= LOWER && scores[rowOffset + x] < UPPER) x++;
      const right = x;
      intervals.push(Object.freeze({ row, left, right }));
      eligiblePixels += right - left;
      for (let chunkLeft = left; chunkLeft < right; chunkLeft += CAP) {
        const chunkRight = Math.min(right, chunkLeft + CAP);
        const length = chunkRight - chunkLeft;
        const offset = rowOffset + chunkLeft;
        const order = Array.from({ length }, (_, i) => i);
        order.sort((a, b) => scores[offset + a] - scores[offset + b] || a - b);
        const inversions = countInversions(order);
        const chunk = Object.freeze({
          id: chunks.length, row, left: chunkLeft, right: chunkRight,
          length, offset, inversions, pairs: length * (length - 1) / 2,
        });
        chunks.push(chunk);
        totalInversions += inversions;
        if (inversions === 0) continue;
        ranked.push(chunk);
        for (let destinationLocal = 0; destinationLocal < length; destinationLocal++) {
          const destination = offset + destinationLocal;
          const origin = offset + order[destinationLocal];
          fullOrder[destination] = origin;
          const from = origin * 4;
          const to = destination * 4;
          fullOutput[to] = source[from];
          fullOutput[to + 1] = source[from + 1];
          fullOutput[to + 2] = source[from + 2];
          fullOutput[to + 3] = source[from + 3];
        }
      }
    }
  }
  ranked.sort(priorityCompare);
  Object.freeze(intervals);
  Object.freeze(chunks);
  Object.freeze(ranked);
  const metadata = Object.freeze({
    width, height, pixelCount, cap: CAP, lowerInclusive: LOWER, upperExclusive: UPPER,
    eligiblePixels, intervalCount: intervals.length, chunkCount: chunks.length,
    sortableChunkCount: ranked.length, noOpChunkCount: chunks.length - ranked.length,
    totalInversions, intervals, chunks, rankedChunkIds: Object.freeze(ranked.map(c => c.id)),
    retainedRasterBytes: source.byteLength + fullOutput.byteLength + fullOrder.byteLength,
    temporaryScoreBytes: scores.byteLength,
  });
  // Sort callbacks share this lexical scope with the returned closures. Clear
  // the now-unused field explicitly so engines need not retain the score raster.
  scores = null;

  function selectedCount(percent) {
    validatePercent(percent);
    // N <= 2^32-1 and p <= 100, so p*N+50 is exactly representable.
    return Math.floor((percent * ranked.length + 50) / 100);
  }

  function renderPercent(percent) {
    const count = selectedCount(percent); // Validate before allocation.
    const out = new Uint8Array(source);
    for (let k = 0; k < count; k++) {
      const c = ranked[k];
      const left = c.offset * 4;
      const right = left + c.length * 4;
      out.set(fullOutput.subarray(left, right), left);
    }
    return out;
  }

  function permutationPercent(percent) {
    const count = selectedCount(percent);
    const result = new Uint32Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) result[i] = i;
    for (let k = 0; k < count; k++) {
      const c = ranked[k];
      result.set(fullOrder.subarray(c.offset, c.offset + c.length), c.offset);
    }
    return result;
  }

  return Object.freeze({
    metadata, selectedCount, renderPercent, permutationPercent,
    renderStrength: strength => renderPercent(coveragePercentFromStrength(strength)),
  });
}
