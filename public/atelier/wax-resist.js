import { sameDrawSurface, cleanFields } from "./clean-studies.js";

const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function resistHash(x, y, seed = 0) {
  let a =
    Math.imul(x | 0, 374761393) ^
    Math.imul(y | 0, 668265263) ^
    Math.imul(seed | 0, 1442695041);
  a = Math.imul(a ^ (a >>> 13), 1274126177);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, seed) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    u = smooth(0, 1, x - ix),
    v = smooth(0, 1, y - iy);
  return mix(
    mix(resistHash(ix, iy, seed), resistHash(ix + 1, iy, seed), u),
    mix(resistHash(ix, iy + 1, seed), resistHash(ix + 1, iy + 1, seed), u),
    v,
  );
}

// Optical density accumulates during dyeing. Wax stores coverage, never color.
// Adding later wax preserves exactly the pigment already in the cloth.
export function addResist(wax, addition) {
  if (wax.length !== addition.length)
    throw Error("Wax masks must have matching sizes");
  for (let i = 0; i < wax.length; i++)
    wax[i] = 1 - (1 - wax[i]) * (1 - clamp(addition[i]));
}
export function dyeCloth(
  density,
  wax,
  absorption,
  exposure = 1,
  uptake = null,
) {
  if (
    density.length !== wax.length * 3 ||
    (uptake && uptake.length !== wax.length)
  )
    throw Error("Dye fields must have matching sizes");
  if (
    !Number.isFinite(exposure) ||
    exposure < 0 ||
    (absorption.length !== 3 && absorption.length !== density.length)
  )
    throw Error("Invalid dye bath");
  for (let i = 0; i < wax.length; i++) {
    const dose =
      exposure * (1 - clamp(wax[i])) * (uptake ? clamp(uptake[i], 0, 2) : 1);
    for (let c = 0; c < 3; c++) {
      const a = absorption[absorption.length === 3 ? c : i * 3 + c];
      if (!Number.isFinite(a) || a < 0)
        throw Error("Dye absorption must be nonnegative and finite");
      density[i * 3 + c] += dose * a;
    }
  }
}
export function fractureResist(wax, fracture) {
  if (wax.length !== fracture.length)
    throw Error("Wax fracture field must have matching size");
  for (let i = 0; i < wax.length; i++) wax[i] *= 1 - clamp(fracture[i]);
}

// Jittered cell boundaries approximate sparse brittle-wax fracture paths.
// This only changes permeability before a bath. It draws no independent ink.
export function waxFracture(x, y, seed, strength) {
  const cell = 35 - strength * 9,
    u = x / cell,
    v = y / cell;
  const ix = Math.floor(u),
    iy = Math.floor(v);
  let first = 1e9,
    second = 1e9,
    owner = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const a = ix + dx,
        b = iy + dy;
      const px = a + 0.18 + 0.64 * resistHash(a, b, seed + 600);
      const py = b + 0.18 + 0.64 * resistHash(a, b, seed + 700);
      const d = Math.hypot(u - px, v - py);
      if (d < first) {
        second = first;
        first = d;
        owner = resistHash(a, b, seed + 800);
      } else if (d < second) second = d;
    }
  const broken = smooth(0.55, 0.72, noise(x / 71, y / 71, seed + 808));
  const width = 0.2 + strength * 0.52;
  return (
    (1 - smooth(width * 0.2, width + 0.5, (second - first) * cell)) *
    broken *
    (0.6 + 0.4 * owner)
  );
}

export function prepareWaxResist(f, options = {}) {
  const w = f.w,
    count = w * w,
    scale = w / 720,
    seed = f.seed | 0,
    strength = clamp(f.intensity);
  const owner = new Uint16Array(count),
    light = new Float32Array(count),
    field = new Float32Array(count),
    edge = new Float32Array(count).fill(999);
  const absorption = new Float32Array(count * 3),
    uptake = new Float32Array(count),
    cloth = new Uint8ClampedArray(count * 3);
  const wax = new Float32Array(count),
    firstWax = new Float32Array(count),
    laterWax = new Float32Array(count),
    finalWax = new Float32Array(count),
    fractures = new Float32Array(count);
  const density = new Float32Array(count * 3),
    ancestry = new Uint8Array(count);
  const hist = new Uint32Array(256),
    illumination = cleanFields(f).light;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        id = f.ID(x, y),
        c = f.B(x, y),
        j = i * 3;
      owner[i] = id;
      let l = illumination[i];
      light[i] = l;
      if (id > 1) hist[Math.round(l * 255)]++;
      const p = f.worldPosition
        ? f.worldPosition(x, y)
        : [(x / w) * 8, (y / w) * 8, 0];
      const nx = f.N(x, y, 0) * 2 - 1,
        ny = f.N(x, y, 1) * 2 - 1;
      field[i] =
        0.5 +
        0.2 * Math.sin(p[0] * 2.1 + p[2] * 1.4) +
        0.16 * Math.sin(p[1] * 2.7 - p[2] * 1.2) +
        0.08 * nx +
        0.06 * ny;
      uptake[i] =
        0.79 + 0.21 * noise(x / (37 * scale), y / (37 * scale), seed + 12);
      // Broken fibers retain cloth tooth without a periodic pixel lattice that
      // would form moire when the fixed canvas is reduced in the comparison UI.
      const fibers =
        0.025 * (noise(x / (1.4 * scale), y / (14 * scale), seed + 19) - 0.5) +
        0.018 * (noise(x / (11 * scale), y / (1.6 * scale), seed + 23) - 0.5);
      const tooth = fibers + 0.008 * (resistHash(x, y, seed + 13) - 0.5);
      for (let ch = 0; ch < 3; ch++) {
        cloth[j + ch] = [247, 238, 217][ch] * (1 + tooth);
        absorption[j + ch] =
          0.05 + 0.92 * -Math.log(Math.max(0.17, c[ch] / 255));
      }
    }
  let total = hist.reduce((a, b) => a + b, 0),
    acc = 0,
    lo = 0.2,
    hi = 0.9;
  for (let q = 0; q < 256; q++) {
    acc += hist[q];
    if (acc < total * 0.08) lo = q / 255;
    if (acc < total * 0.92) hi = q / 255;
  }
  for (let y = 1; y < w - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x,
        id = owner[i];
      if (id <= 1) continue;
      for (const d of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const j = (y + d[1]) * w + x + d[0];
        if (owner[j] !== id && !sameDrawSurface(f, x, y, x + d[0], y + d[1])) {
          edge[i] = 0;
          break;
        }
      }
    }
  // Native-pixel distance to the waxed contour; two linear chamfer sweeps.
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x) edge[i] = Math.min(edge[i], edge[i - 1] + 1);
      if (y) edge[i] = Math.min(edge[i], edge[i - w] + 1);
    }
  for (let y = w - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (x + 1 < w) edge[i] = Math.min(edge[i], edge[i + 1] + 1);
      if (y + 1 < w) edge[i] = Math.min(edge[i], edge[i + w] + 1);
    }
  // Local connected width, rather than an object-wide maximum: a slender
  // branch must survive even when it shares an ID with a broad body. Five
  // native pixels of geodesic dilation reach inward from broad boundaries,
  // while separated masks cannot lend each other their width.
  let widths = Float32Array.from(edge, (d, i) =>
    owner[i] > 1 ? Math.min(d, 5 * scale) : 0,
  );
  let work = new Float32Array(count);
  for (let step = 0; step < Math.ceil(5 * scale); step++) {
    for (let y = 0; y < w; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x,
          id = owner[i];
        let value = widths[i];
        if (id > 1) {
          if (x && owner[i - 1] === id) value = Math.max(value, widths[i - 1]);
          if (x + 1 < w && owner[i + 1] === id)
            value = Math.max(value, widths[i + 1]);
          if (y && owner[i - w] === id) value = Math.max(value, widths[i - w]);
          if (y + 1 < w && owner[i + w] === id)
            value = Math.max(value, widths[i + w]);
        }
        work[i] = value;
      }
    [widths, work] = [work, widths];
  }
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        outside = owner[i] <= 1;
      const thin = 1 - smooth(2 * scale, 4.5 * scale, widths[i]);
      const l = clamp((light[i] - lo) / Math.max(0.15, hi - lo));
      const broad = field[i],
        ragged =
          (noise(x / (3.8 * scale), y / (3.8 * scale), seed + 55) - 0.5) *
          0.002;
      const line =
        1 -
        smooth(
          (0.85 + strength * 0.75) * scale,
          (1.65 + strength * 0.75) * scale,
          edge[i],
        );
      const reserve = smooth(0.839, 0.851, l + 0.1 * (broad - 0.5) + ragged);
      const canting = 1 - smooth(0.005, 0.011, Math.abs(broad - 0.54));
      firstWax[i] = outside
        ? 1
        : Math.max(line, reserve, canting * 0.98) * (1 - thin);
      laterWax[i] = outside
        ? 1
        : Math.max(
            thin,
            smooth(0.369, 0.381, l + 0.24 * (broad - 0.5) + ragged),
          );
      finalWax[i] = outside
        ? 1
        : smooth(0.164, 0.176, l + 0.11 * (broad - 0.5) + ragged);
      fractures[i] =
        outside || options.fractures === false
          ? 0
          : waxFracture(x / scale, y / scale, seed, strength) *
            (0.13 + strength * 0.22) *
            (1 - line) *
            (1 - thin);
    }
  const expose = (bit) => {
    for (let i = 0; i < count; i++) if (1 - wax[i] > 1e-6) ancestry[i] |= bit;
  };
  addResist(wax, firstWax);
  expose(1);
  dyeCloth(density, wax, absorption, 1.35, uptake);
  addResist(wax, laterWax);
  // Handle the cloth only after the first color has been fixed and rewaxed.
  fractureResist(wax, fractures);
  expose(2);
  dyeCloth(density, wax, [1.37, 0.66, 0.13], 0.9 + strength * 0.9, uptake);
  addResist(wax, finalWax);
  expose(4);
  dyeCloth(density, wax, [0.77, 0.76, 0.39], 0.8 + strength, uptake);
  const pixels = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++)
      pixels[i * 4 + c] = cloth[i * 3 + c] * Math.exp(-density[i * 3 + c]);
    pixels[i * 4 + 3] = 255;
  }
  return {
    pixels,
    ancestry,
    settings: { strength, lo, hi },
    ...(options.debug
      ? {
          firstWax,
          laterWax,
          finalWax,
          fractures,
          density,
          cloth,
          absorption,
          uptake,
        }
      : {}),
  };
}

export function waxResist(p, f) {
  const plan = f.prepare(`wax-resist-v1:${f.w}:${f.intensity}`, () =>
    prepareWaxResist(f),
  );
  p.loadPixels();
  p.pixels.set(plan.pixels);
  p.updatePixels();
}
