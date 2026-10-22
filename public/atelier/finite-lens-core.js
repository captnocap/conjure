/**
 * Portable, synchronous frozen finite-lens prototype. No DOM, Node, p5, worker,
 * geometry/image cache, external dependencies, or mutable module state.
 *
 * Scope: the frozen 720-square, opaque source and four disjoint ball lenses.
 * Primary transmission only. Finite-picture misses are black; omitted reflected
 * paths are not proven black. The all-sample inter-sphere audit is external.
 */
export const MODEL_SHA256 = 'cd1b89697223d400deede1bd96da0cab660a1d6140847394ebe00b6ed7290ac5';
export const RENDER_MODEL_SHA256 = 'c9e8d875e00bdc47a90170a98777e6d1343835161bfd1f2b1d75fa7dc9abab6f';
export const WIDTH = 720;
export const HEIGHT = 720;
export const SAMPLES_PER_AXIS = 16;
export const LENSES = Object.freeze([
  Object.freeze({ id: 'L1', cx: 255, cy: 230, radius: 50 }),
  Object.freeze({ id: 'L2', cx: 474, cy: 302, radius: 65 }),
  Object.freeze({ id: 'L3', cx: 322, cy: 492, radius: 46 }),
  Object.freeze({ id: 'L4', cx: 549, cy: 520, radius: 58 }),
]);
const DEPTH = 450;
const INDEX = 4 / 3;
const ETA = 1 / INDEX;
const ETA2 = ETA * ETA;

export function srgbToLinear(byte) {
  const x = byte / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgbByte(value) {
  const x = Math.min(1, Math.max(0, value));
  const encoded = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  return Math.floor(encoded * 255 + 0.5);
}

/**
 * Algebraic evaluation of the exact two-interface spherical path.
 * A single caller-owned scalar record is reused, with no per-ray allocation.
 * theta = asin(t), beta = asin(eta*t), delta = 2*(theta-beta).
 * Explicit sin/cos identities remove all trigonometry and division by t.
 * At t=0 these identities retain the correct paraxial scale 1-D/(2R).
 */
function radialTransfer(t2, depthOverRadius, result) {
  const c = Math.sqrt(1 - t2);
  const cr = Math.sqrt(1 - ETA2 * t2);
  const a = cr - ETA * c;
  const b = c * cr + ETA * t2;
  const sinBetaOverT = 2 * ETA * cr * c - 1 + 2 * ETA2 * t2;
  const cosBeta = (1 - 2 * ETA2 * t2) * c + 2 * ETA * t2 * cr;
  const sinDeltaOverT = 2 * a * b;
  const cosDelta = 1 - 2 * t2 * a * a;
  result.scale = sinBetaOverT - (depthOverRadius - cosBeta) * sinDeltaOverT / cosDelta;
  result.cosDelta = cosDelta;
  const rsRatio = (c - INDEX * cr) / (c + INDEX * cr);
  const rpRatio = (INDEX * c - cr) / (INDEX * c + cr);
  const ts = 1 - rsRatio * rsRatio;
  const tp = 1 - rpRatio * rpRatio;
  // Matching per-polarization Fresnel coefficients at both sphere crossings.
  result.weight = 0.5 * (ts * ts + tp * tp);
}

/** Diagnostic entry point; rejects strict-aperture misses. Local coordinates. */
export function traceRadial(x, y, radius, result = {}) {
  const rr = x * x + y * y;
  if (!(radius > 0 && rr < radius * radius)) throw new RangeError('Ray must be strictly inside the aperture');
  radialTransfer(rr / (radius * radius), DEPTH / radius, result);
  result.qx = x * result.scale;
  result.qy = y * result.scale;
  return result;
}

/**
 * Render the frozen 16x16 midpoint rule from unchanged native RGBA bytes.
 * Input must be opaque Uint8Array / Uint8ClampedArray of exactly 720x720x4.
 * Returns a new opaque Uint8ClampedArray; input is never written.
 * Optional linearOutput (Float64Array, 720x720x3) and stats are diagnostics.
 * LinearOutput is not needed or allocated during ordinary rendering.
 */
export function renderFiniteLens(source, { linearOutput = null, stats = null } = {}) {
  if (!(source instanceof Uint8Array || source instanceof Uint8ClampedArray) || source.length !== WIDTH * HEIGHT * 4) {
    throw new TypeError('Expected native 720x720 RGBA byte array');
  }
  for (let i = 3; i < source.length; i += 4) {
    if (source[i] !== 255) throw new RangeError('Frozen apparatus requires an opaque source');
  }
  if (linearOutput !== null && (!(linearOutput instanceof Float64Array) || linearOutput.length !== WIDTH * HEIGHT * 3)) {
    throw new TypeError('linearOutput must have 720x720x3 Float64 elements');
  }
  if (linearOutput !== null && linearOutput.buffer === source.buffer) {
    throw new TypeError('Diagnostic linearOutput must not share the source buffer');
  }
  const output = new Uint8ClampedArray(source);
  // A 256-entry transfer table, not an image/geometry operator or source cache.
  const linear = new Float64Array(256);
  for (let i = 0; i < 256; i++) linear[i] = srgbToLinear(i);
  if (linearOutput !== null) {
    for (let p = 0, i = 0; i < source.length; p += 3, i += 4) {
      linearOutput[p] = linear[source[i]];
      linearOutput[p + 1] = linear[source[i + 1]];
      linearOutput[p + 2] = linear[source[i + 2]];
    }
  }
  const ray = { scale: 0, weight: 0, cosDelta: 0 };
  let totalCovered = 0, totalHits = 0, partialPixels = 0, fullPixels = 0;
  const lensStats = stats === null ? null : [];
  for (const lens of LENSES) {
    const { cx, cy, radius } = lens;
    const rrLimit = radius * radius;
    const depthOverRadius = DEPTH / radius;
    let coveredRays = 0, pictureHits = 0;
    for (let py = cy - radius; py < cy + radius; py++) {
      for (let px = cx - radius; px < cx + radius; px++) {
        const outputOffset = (py * WIDTH + px) * 4;
        const baseR = linear[source[outputOffset]];
        const baseG = linear[source[outputOffset + 1]];
        const baseB = linear[source[outputOffset + 2]];
        let red = 0, green = 0, blue = 0, coverage = 0;
        // Exactly the reference's y-major, then x-major 256-sample ordering.
        for (let sy = 0; sy < 16; sy++) {
          const y = py + (sy + 0.5) / 16 - cy;
          for (let sx = 0; sx < 16; sx++) {
            const x = px + (sx + 0.5) / 16 - cx;
            const rr = x * x + y * y;
            if (!(rr < rrLimit)) {
              red += baseR; green += baseG; blue += baseB;
              continue;
            }
            coverage++;
            radialTransfer(rr / rrLimit, depthOverRadius, ray);
            const qx = cx + x * ray.scale, qy = cy + y * ray.scale;
            // Strict finite-plane gate precedes source reconstruction.
            if (!(qx >= 0 && qx < WIDTH && qy >= 0 && qy < HEIGHT)) continue;
            pictureHits++;
            const tx = qx - 0.5, ty = qy - 0.5;
            const ix = Math.floor(tx), iy = Math.floor(ty);
            const fx = tx - ix, fy = ty - iy;
            let sampleR = 0, sampleG = 0, sampleB = 0;
            // The exact frozen tap order: (0,0), (1,0), (0,1), (1,1).
            // Out-of-bounds taps contribute zero, with no renormalization.
            for (let dy = 0; dy < 2; dy++) {
              const tapY = iy + dy;
              if (tapY < 0 || tapY >= HEIGHT) continue;
              const wy = dy ? fy : 1 - fy;
              for (let dx = 0; dx < 2; dx++) {
                const tapX = ix + dx;
                if (tapX < 0 || tapX >= WIDTH) continue;
                const weight = (dx ? fx : 1 - fx) * wy;
                const at = (tapY * WIDTH + tapX) * 4;
                sampleR += linear[source[at]] * weight;
                sampleG += linear[source[at + 1]] * weight;
                sampleB += linear[source[at + 2]] * weight;
              }
            }
            red += sampleR * ray.weight;
            green += sampleG * ray.weight;
            blue += sampleB * ray.weight;
          }
        }
        coveredRays += coverage;
        if (coverage === 0) continue; // Entire original pixel remains byte exact.
        if (coverage === 256) fullPixels++; else partialPixels++;
        red /= 256; green /= 256; blue /= 256;
        output[outputOffset] = linearToSrgbByte(red);
        output[outputOffset + 1] = linearToSrgbByte(green);
        output[outputOffset + 2] = linearToSrgbByte(blue);
        if (linearOutput !== null) {
          const at = (py * WIDTH + px) * 3;
          linearOutput[at] = red; linearOutput[at + 1] = green; linearOutput[at + 2] = blue;
        }
      }
    }
    totalCovered += coveredRays; totalHits += pictureHits;
    if (lensStats !== null) lensStats.push({ id: lens.id, apertureRays: coveredRays, pictureHits });
  }
  if (stats !== null) Object.assign(stats, {
    candidateSampleSlots: 12497920, apertureRays: totalCovered, pictureHits: totalHits,
    partialPixels, fullPixels, untouchedPixels: WIDTH * HEIGHT - partialPixels - fullPixels,
    lenses: lensStats,
  });
  return output;
}
