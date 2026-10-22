// Fixed finite fluted-glass-over-print primary transmission, frozen MODEL SHA-256:
// 6da58feddd81cb97fb9e5e9de6ed43df7d234b890884c1469f3c4933b8be3b40
// This consumes only completed opaque sRGB pixels. There is no scene geometry,
// normal/depth/identity data, light, material, user parameter, or source analysis.
export const WIDTH = 720;
export const HEIGHT = 720;
export const RGBA_BYTES = WIDTH * HEIGHT * 4;
export const MODEL_SHA256 = '6da58feddd81cb97fb9e5e9de6ed43df7d234b890884c1469f3c4933b8be3b40';

const LEFT = 72, RIGHT = 648, TOP = 36, BOTTOM = 684;
const SAMPLES = 1024, IOR = 1.5, GAP = 72;
const OMEGA = 2 * Math.PI / 72, SLOPE = 8 * OMEGA;
// The cache contains only source-independent coefficients and a 256-byte-value
// sRGB decoding table. None of its arrays is exported or returned to callers.
let cachedPlan;

export function assertFixed720Opaque(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['width', 'height', 'rgba'].includes(key)) ||
      !['width', 'height', 'rgba'].every(key => Object.hasOwn(input, key)))
    throw new TypeError('Expected only { width, height, rgba } for fluted glass.');
  const { width, height, rgba } = input;
  if (width !== WIDTH || height !== HEIGHT)
    throw new RangeError('Fluted glass requires width=720 and height=720.');
  if (!(rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray))
    throw new TypeError('rgba must be a Uint8Array or Uint8ClampedArray.');
  if (!(rgba.buffer instanceof ArrayBuffer) || rgba.buffer.resizable === true)
    throw new TypeError('rgba must use a nonshared, fixed-length ArrayBuffer.');
  if (rgba.length !== RGBA_BYTES || rgba.byteLength !== RGBA_BYTES)
    throw new RangeError('rgba must contain exactly 720*720*4 attached bytes.');
  for (let i = 3; i < RGBA_BYTES; i += 4)
    if (rgba[i] !== 255) throw new TypeError('rgba must be opaque (every alpha is 255).');
  return rgba;
}

function square(value) { return value * value; }

function buildPlan() {
  const rowOffsets = new Uint32Array(WIDTH + 1);
  // The frozen proof has at most five source cells per covered column. This
  // bound is checked, never used to truncate a row or discard a ray.
  const capacity = (RIGHT - LEFT) * 5;
  const sourceColumns = new Uint16Array(capacity);
  const weights = new Float64Array(capacity);
  const accumulator = new Float64Array(WIDTH);
  let count = 0;
  for (let column = 0; column < WIDTH; column++) {
    rowOffsets[column] = count;
    if (column < LEFT || column >= RIGHT) continue;
    accumulator.fill(0);
    for (let sample = 0; sample < SAMPLES; sample++) {
      const x = column + (sample + 0.5) / SAMPLES;
      const phase = OMEGA * (x - LEFT);
      const h = 14 - 8 * Math.cos(phase);
      const p = SLOPE * Math.sin(phase);
      const s = Math.sqrt(1 + p * p);
      const ci = 1 / s, eta = 1 / IOR;
      const ct = Math.sqrt(1 - eta * eta * (1 - ci * ci));
      const k = eta * ci - ct;
      const vx = k * (-p / s), vz = -eta + k / s;
      const rearTime = -h / vz;
      const xb = x + rearTime * vx;
      const delta = 1 - IOR * IOR * vx * vx;
      // Whole-profile certificate excludes front reentry, side exits, TIR,
      // critical tangency and finite print misses for this exact apparatus.
      // Fail closed if arithmetic ever contradicts that fixed branch.
      if (!(delta > 0 && rearTime > 0 && xb >= LEFT && xb <= RIGHT))
        throw new RangeError('Frozen fluted-glass branch certificate failed.');
      const wz = -Math.sqrt(delta), forwardTime = -GAP / wz;
      const q = xb + forwardTime * IOR * vx;
      const rs1 = square((ci - IOR * ct) / (ci + IOR * ct));
      const rp1 = square((IOR * ci - ct) / (IOR * ci + ct));
      const rs2 = square((IOR * -vz - -wz) / (IOR * -vz + -wz));
      const rp2 = square((-vz - IOR * -wz) / (-vz + IOR * -wz));
      const weight = 0.5 * ((1 - rs1) * (1 - rs2) + (1 - rp1) * (1 - rp2));
      if (!(Number.isFinite(q) && forwardTime > 0 && q >= 0 && q < WIDTH &&
            Number.isFinite(weight) && weight >= 0 && weight <= 1))
        throw new RangeError('Frozen fluted-glass finite radiance certificate failed.');
      // Piecewise constant finite print; no clamp, wrap, interpolation,
      // Jacobian, absorption, successful-hit renormalization or reflected path.
      accumulator[Math.floor(q)] += weight / SAMPLES;
    }
    let rowCount = 0;
    // Ascending source-cell order preserves the frozen Python CSR dot order.
    for (let sourceColumn = 0; sourceColumn < WIDTH; sourceColumn++) {
      if (accumulator[sourceColumn] === 0) continue;
      if (++rowCount > 5 || count >= capacity)
        throw new RangeError('Frozen fluted-glass sparse work bound failed.');
      sourceColumns[count] = sourceColumn;
      weights[count++] = accumulator[sourceColumn];
    }
  }
  rowOffsets[WIDTH] = count;
  const decode = new Float64Array(256);
  for (let byte = 0; byte < 256; byte++) {
    const value = byte / 255;
    decode[byte] = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }
  return { rowOffsets, sourceColumns, weights, decode };
}

function encode(linear) {
  if (!(Number.isFinite(linear) && linear >= 0 && linear <= 1))
    throw new RangeError('Fluted glass produced invalid linear radiance.');
  const srgb = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
  // Frozen half-up byte rounding, not Uint8ClampedArray's ties-to-even rule.
  return Math.floor(srgb * 255 + 0.5);
}

export function applyFlutedGlass(input) {
  const rgba = assertFixed720Opaque(input);
  const plan = cachedPlan || (cachedPlan = buildPlan());
  // Always fresh and nonshared; input is never changed, transferred or retained.
  const output = new Uint8ClampedArray(rgba);
  const { rowOffsets, sourceColumns, weights, decode } = plan;
  // y integration is exact: profile extrusion, original print cells and both
  // plate y edges are integer-aligned. Outside the plate stays byte-exact.
  for (let y = TOP; y < BOTTOM; y++) {
    const row = y * WIDTH * 4;
    for (let x = LEFT; x < RIGHT; x++) {
      let red = 0, green = 0, blue = 0;
      for (let j = rowOffsets[x]; j < rowOffsets[x + 1]; j++) {
        const source = row + 4 * sourceColumns[j], weight = weights[j];
        red += weight * decode[rgba[source]];
        green += weight * decode[rgba[source + 1]];
        blue += weight * decode[rgba[source + 2]];
      }
      const target = row + 4 * x;
      output[target] = encode(red);
      output[target + 1] = encode(green);
      output[target + 2] = encode(blue);
    }
  }
  return output;
}

export const FIXED_WORK = Object.freeze({
  width: WIDTH, height: HEIGHT,
  xMidpointsPerPixel: SAMPLES,
  coveredRayEvaluations: (RIGHT - LEFT) * SAMPLES,
  identityRaySamplesElided: (WIDTH - RIGHT + LEFT) * SAMPLES,
  maximumColumnsPerCoveredPixel: 5,
  coveredOutputPixels: (RIGHT - LEFT) * (BOTTOM - TOP),
  maximumCachedTypedArrayBytes: (WIDTH + 1) * 4 + (RIGHT - LEFT) * 5 * 10 + 256 * 8,
  temporaryPlanTypedArrayBytes: WIDTH * 8,
  outputBytesPerCall: RGBA_BYTES,
  retainsSourcePixels: false,
  configurableOptics: false,
});
