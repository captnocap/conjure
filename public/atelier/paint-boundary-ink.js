import { render } from './paint-boundary-ink-core.js';

export const WIDTH = 720;
export const HEIGHT = 720;
export const RGBA_BYTES = WIDTH * HEIGHT * 4;

// Deliberately narrow standalone contract. No scene metadata or controls.
export function assertFixed720Opaque({ width, height, rgba } = {}) {
  if (width !== WIDTH || height !== HEIGHT) {
    throw new RangeError('Paint-boundary ink requires width=720 and height=720.');
  }
  if (!(rgba instanceof Uint8ClampedArray)) {
    throw new TypeError('rgba must be a Uint8ClampedArray.');
  }
  if (!(rgba.buffer instanceof ArrayBuffer) || rgba.buffer.resizable === true) {
    throw new TypeError('rgba must use a nonshared, fixed-length ArrayBuffer.');
  }
  if (rgba.length !== RGBA_BYTES || rgba.byteLength !== RGBA_BYTES) {
    throw new RangeError('rgba must contain exactly 720*720*4 attached bytes.');
  }
  for (let i = 3; i < RGBA_BYTES; i += 4) {
    if (rgba[i] !== 255) throw new TypeError('rgba must be opaque (every alpha is 255).');
  }
  return rgba;
}

export function applyPaintBoundaryInk(input) {
  const rgba = assertFixed720Opaque(input);
  const ink = render(rgba, WIDTH, HEIGHT).candidate;
  const output = new Uint8ClampedArray(RGBA_BYTES);
  for (let i = 0; i < RGBA_BYTES; i += 4) {
    for (let c = 0; c < 3; c++) {
      let value = rgba[i + c];
      // Existing opaque 100-percent Multiply operation order, including its
      // final Uint8ClampedArray conversion. Do not pre-round or simplify.
      const source = ink[i + c];
      const alpha = ((100 / 100) * ink[i + 3]) / 255;
      const blend = (value * source) / 255;
      value += (blend - value) * alpha;
      output[i + c] = value;
    }
    output[i + 3] = 255;
  }
  return output;
}

export const FIXED_WORK = Object.freeze({
  pixels: WIDTH * HEIGHT,
  preblurTaps: 14 * WIDTH * HEIGHT,
  tensorTaps: 78 * WIDTH * HEIGHT,
  crossBrightnessSamples: 15 * WIDTH * HEIGHT,
  tangentResponseSamples: 18 * WIDTH * HEIGHT,
  tangentFieldScalarSamples: 36 * WIDTH * HEIGHT,
  multiplyRGBChannels: 3 * WIDTH * HEIGHT,
  includedResearchControls: false,
});
