// A finite-image, linear-light multiple exposure inspired by prism filters.
// Each contribution samples the same immutable capture once. This is not
// calibrated refraction, another camera view, or a recursive image process.
const decode = Float64Array.from({ length: 256 }, (_, byte) => {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

function checkSource(color, size) {
  if (!Number.isInteger(size) || size < 1 || size > 720 ||
      !ArrayBuffer.isView(color) || color.BYTES_PER_ELEMENT !== 1 ||
      !["Uint8Array", "Uint8ClampedArray"].includes(color.constructor.name) ||
      color.length !== size * size * 4)
    throw Error("Prismatic exposure needs a square RGB capture up to 720 pixels");
}

export function exposureWeights(strength) {
  if (!Number.isFinite(strength)) throw Error("Invalid prismatic exposure strength");
  const side = 0.3 * Math.max(0, Math.min(1, strength));
  return [1 - 2 * side, side, side];
}

export function preparePrismaticRGB(color, size) {
  checkSource(color, size);
  const linear = new Float64Array(size * size * 3);
  for (let i = 0; i < size * size; i++)
    for (let c = 0; c < 3; c++) linear[i * 3 + c] = decode[color[i * 4 + c]];
  return Object.freeze({ color, size, linear });
}

function encodeByte(linear) {
  const c = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.floor(255 * c + 0.5);
}

export function renderPrismaticExposure(color, size, strength, prepared) {
  checkSource(color, size);
  const weights = exposureWeights(strength);
  if (weights[1] === 0) return new Uint8ClampedArray(color);
  const plan = prepared || preparePrismaticRGB(color, size);
  if (plan.color !== color || plan.size !== size ||
      !(plan.linear instanceof Float64Array) || plan.linear.length !== size * size * 3)
    throw Error("Prismatic exposure preparation belongs to another capture");
  const linear = plan.linear, rgba = new Uint8ClampedArray(color.length);
  const bundles = [[weights[0], 0, 0], [weights[1], 0.18 * size, 0.07 * size],
    [weights[2], -0.18 * size, -0.07 * size]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let red = 0, green = 0, blue = 0, coverage = 0;
    for (const [weight, dx, dy] of bundles) {
      const sx = x - dx, sy = y - dy, ix = Math.floor(sx), iy = Math.floor(sy);
      const fx = sx - ix, fy = sy - iy;
      for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) {
        const xx = ix + ox, yy = iy + oy;
        if (xx < 0 || xx >= size || yy < 0 || yy >= size) continue;
        const amount = weight * (ox ? fx : 1 - fx) * (oy ? fy : 1 - fy);
        const i = (yy * size + xx) * 3;
        coverage += amount;
        red += amount * linear[i]; green += amount * linear[i + 1]; blue += amount * linear[i + 2];
      }
    }
    // The unchanged primary has weight >= 0.4, so this denominator is positive.
    // Missing source corners carry no radiance or coverage; normalize once.
    const i = (y * size + x) * 4;
    rgba[i] = encodeByte(red / coverage); rgba[i + 1] = encodeByte(green / coverage);
    rgba[i + 2] = encodeByte(blue / coverage); rgba[i + 3] = 255;
  }
  return rgba;
}

export function drawPrismaticExposure(p, frame) {
  const weights = exposureWeights(frame.intensity);
  const prepared = weights[1] === 0 ? undefined : frame.prepare("prismatic-exposure",
    () => preparePrismaticRGB(frame.color, frame.w));
  const rgba = renderPrismaticExposure(frame.color, frame.w, frame.intensity, prepared);
  p.loadPixels();
  if (p.pixels.length !== rgba.length) throw Error("Prismatic exposure requires pixel density 1");
  p.pixels.set(rgba);
  p.updatePixels();
}

export const prismaticExposureStudy = {
  id: "prismatic-exposure", name: "Prismatic exposure", family: "Light & waves",
  offThread: true, title: "One view, three impressions.", control: "Prism exposure",
  medium: "Clear primary / displaced exposures", swatch: "#b2bdb9",
  category: "SIMULTANEOUS IMAGE EXPOSURES",
  description: "A clear primary impression anchors two displaced copies. The arch, vase and sphere overlap like a photograph through a prism filter; exposure changes their influence while the separation stays fixed.",
  mechanism: "Three positive contributions from the same captured view · linear-light bilinear sampling · one normalization over valid source coverage. Illustrative prism-like exposure, not calibrated glass or new viewpoints; peripheral copies clip at the image boundary. Object and tone selections keep the original image masks.",
  reference: "https://prismlensfx.com/products/linear-prism-fx-filter",
  referenceLabel: "Prism Lens FX / linear prism photographs",
  referencePage: "https://prismlensfx.com/products/kaleidoscopefxfilter",
  referencePageLabel: "Prism Lens FX / clear-center repetitions",
  draw: drawPrismaticExposure,
};
