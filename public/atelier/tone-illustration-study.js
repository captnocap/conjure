import { cleanFields } from './clean-studies.js';

const SIZE = 720;
const clamp = (value, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));

function validateFrame(frame) {
  if (frame?.w !== SIZE) throw new RangeError('Tone illustration requires the fixed 720-pixel capture');
  for (const name of ['color', 'normal', 'depth', 'identity', ...(frame.diffuse ? ['diffuse'] : [])]) {
    const bytes = frame[name];
    if (!(bytes instanceof Uint8Array || bytes instanceof Uint8ClampedArray) || bytes.length !== SIZE * SIZE * 4)
      throw new TypeError(`Tone illustration requires complete byte RGBA ${name}`);
  }
  if (typeof frame.prepare !== 'function') throw new TypeError('Tone illustration needs the frame preparation cache');
  for (const name of ['ID', 'N', 'B', 'C', 'L', 'metalness', 'distance'])
    if (typeof frame[name] !== 'function') throw new TypeError(`Tone illustration needs frame.${name}`);
  const light = frame.reliefLight;
  if (!Array.isArray(light) || light.length !== 3 || !light.every(Number.isFinite) || Math.abs(Math.hypot(...light) - 1) > 1e-12)
    throw new TypeError('Tone illustration requires a finite unit reliefLight (tolerance 1e-12)');
  if (!Array.isArray(frame.edges) || frame.edges.length > 16384)
    throw new RangeError('Tone illustration requires at most 16384 captured edges');
  let samples = 0;
  for (const edge of frame.edges) {
    if (!Array.isArray(edge) || edge.length !== 2 || edge.some(point => !Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)))
      throw new TypeError('Tone illustration requires finite captured edge endpoints');
    const steps = Math.max(1, Math.ceil(Math.hypot(edge[1][0] - edge[0][0], edge[1][1] - edge[0][1]) / .85));
    // cleanFields already skips edges longer than four image widths.
    if (steps <= SIZE * 4) samples += steps;
  }
  if (samples > 262144) throw new RangeError('Tone illustration exceeds its captured-edge work budget');
}

export function prepareToneIllustrationFrame(frame) {
  validateFrame(frame);
  // Reuse the unchanged cleanFields construction and the existing two-entry,
  // immutable-capture cache. Shared seed/strength do not change the depiction.
  const field = frame.prepare('clean-fields', () => cleanFields(frame));
  const rgba = frame.prepare('tone-illustration', () => {
    const pixels = new Uint8ClampedArray(frame.color);
    const [lx, ly, lz] = frame.reliefLight;
    for (let y = 0; y < frame.w; y++) for (let x = 0; x < frame.w; x++) {
      const i = y * frame.w + x, at = i * 4;
      if (field.ids[i] <= 1) continue;
      const nx = frame.N(x, y, 0) * 2 - 1, ny = frame.N(x, y, 1) * 2 - 1, nz = frame.N(x, y, 2) * 2 - 1;
      const length = Math.hypot(nx, ny, nz);
      if (!Number.isFinite(length) || length <= 0) throw new TypeError('Tone illustration requires finite nonzero body normals');
      // Native geometry normals use camera Y; reliefLight uses image Y.
      // Positive-facing warm is the explicitly frozen convention.
      const s = clamp((nx * lx - ny * ly + nz * lz) / length, -1, 1), t = (1 + s) / 2;
      const pigment = frame.B(x, y).map(c => c / 255), sourceRGB = frame.C(x, y);
      const metal = frame.metalness(x, y), brightness = frame.L(x, y);
      if (pigment.length !== 3 || !pigment.every(c => Number.isFinite(c) && c >= 0 && c <= 1) ||
          sourceRGB.length !== 3 || !sourceRGB.every(c => Number.isFinite(c) && c >= 0 && c <= 255) ||
          !Number.isFinite(metal) || metal < 0 || metal > 1 || !Number.isFinite(brightness) || brightness < 0 || brightness > 1)
        throw new TypeError('Tone illustration requires finite source pigment, color and material values');
      const highlight = metal > .3 ? clamp((brightness - .7) / .18) : 0, amount = .9 * highlight;
      for (let c = 0; c < 3; c++) {
        const cool = [0, 0, .4][c] + .2 * pigment[c], warm = [.4, .4, 0][c] + .6 * pigment[c];
        const body = (1 - t) * cool + t * warm;
        pixels[at + c] = body * 255 * (1 - amount) + sourceRGB[c] * amount;
      }
      pixels[at + 3] = 255;
    }
    return pixels;
  });
  return { rgba, field };
}

export function drawToneIllustration(p, frame) {
  const { rgba, field } = prepareToneIllustrationFrame(frame);
  p.loadPixels();
  if (p.pixels.length !== rgba.length) throw new RangeError('Tone illustration requires pixel density 1');
  p.pixels.set(rgba);
  p.updatePixels();
  // Literal Clean cel contour/crease marks: no line cleanup or new highlights.
  p.noFill(); p.stroke(25, 32, 29); p.strokeWeight(1.15);
  for (let i = 0; i < field.contours.length; i += 5)
    p.line(field.contours[i], field.contours[i + 1], field.contours[i + 2], field.contours[i + 3]);
  p.strokeWeight(.7);
  for (let i = 0; i < field.creases.length; i += 4)
    p.line(field.creases[i], field.creases[i + 1], field.creases[i + 2], field.creases[i + 3]);
}

export const toneIllustrationStudy = {
  id: 'tone-illustration', name: 'Tone illustration', family: 'Lines & geometry',
  offThread: true, fixedSourceSize: 720,
  control: 'Fixed settings', fixedSettings: 'Continuous warm & cool',
  formatStrength: () => 'Continuous warm & cool',
  title: 'Warm and cool describe the turn.',
  medium: 'Continuous orientation tones / geometric ink', swatch: '#958f77',
  category: 'ILLUSTRATIVE WARM/COOL SHADING',
  description: 'Continuous warm and cool tones describe the direction of each visible surface. Existing outlines and bright-metal marks keep the scene legible while materials converge toward a shared illustrative palette.',
  mechanism: 'Normalized native normals · signed shared-key incidence · fixed Figure 7 pigment endpoints · unchanged Clean cel lines and bright-metal marker. Positive-facing warm is an explicit convention. Floor shadows remain; body shadows, AO and reflective identity are mostly flattened. The metal marker can darken pixels, and a reserved-dark/white hierarchy is not guaranteed.',
  reference: 'https://users.cs.northwestern.edu/~ago820/SIG98/gooch98.pdf',
  referenceLabel: 'Gooch et al. / Technical illustration',
  draw: drawToneIllustration,
};
