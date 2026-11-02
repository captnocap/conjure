/*
 * Contour pools: a geometry-bent scalar landscape, cut into uneven plateaus.
 * Inspired by the user's supplied blue/orange/cream artwork (artist unknown).
 * No reference-image sampling, ink-drop advection, or luminance quantization.
 */
import { sameDrawSurface } from "./clean-studies.js";
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const palette = [
  [242, 229, 194],
  [229, 99, 38],
  [239, 168, 140],
  [244, 230, 197],
  [35, 119, 146],
  [25, 75, 130],
  [16, 46, 67],
  [86, 151, 162],
];

export function poolHash(x, y, seed = 0) {
  let n =
    Math.imul(x | 0, 374761393) ^
    Math.imul(y | 0, 668265263) ^
    Math.imul(seed | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

// C2 interpolation makes the field smooth across the fixed noise lattice.
export function poolNoise(x, y, seed = 0) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    u = x - ix,
    v = y - iy;
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return mix(
    mix(poolHash(ix, iy, seed), poolHash(ix + 1, iy, seed), fade(u)),
    mix(poolHash(ix, iy + 1, seed), poolHash(ix + 1, iy + 1, seed), fade(u)),
    fade(v),
  );
}

export function contourPoolSettings(intensity) {
  const strength = clamp(Number.isFinite(intensity) ? intensity : 0.6);
  return Object.freeze({
    strength,
    warp: 0.2 + strength * 0.61,
    intervals: 4.2 + strength * 4.8,
    channel: 0.65 + strength * 2.5,
  });
}

// This helper has no frame access or mutable state: useful for examining the
// continuous field independently of the contour/color renderer.
export function sampleContourPoolField(
  u,
  v,
  nx,
  ny,
  nz,
  depth,
  seed,
  settings,
) {
  const broad = poolNoise(u * 0.61 + 7.3, v * 0.61 - 2.8, seed + 103);
  const bend = settings.warp;
  const a =
    u +
    bend * (poolNoise(u * 1.14, v * 1.14, seed + 31) - 0.5) * 2.8 +
    0.29 * Math.sin(v * 2.1 + seed * 0.017);
  const b =
    v +
    bend * (poolNoise(u * 1.03 + 4.1, v * 1.03, seed + 79) - 0.5) * 2.3 +
    0.22 * Math.sin(u * 2.7 + seed * 0.013);
  const density = smooth(0.3, 0.79, broad);
  const scalar =
    1.48 * poolNoise(a, b, seed + 211) +
    (0.11 + density * 0.34) *
      poolNoise(a * 2.04 - 2.7, b * 2.04 + 3.1, seed + 307) +
    0.11 * Math.sin(a * 2.63 - b * 1.42) +
    0.11 * nx -
    0.13 * ny +
    0.09 * nz +
    0.045 * depth;
  // Smooth modulation of level spacing creates wide quiet pools and locally
  // compressed bands; the resulting topology includes saddles/merged islands.
  const level =
    settings.intervals * (scalar + 0.07 * Math.sin(scalar * 8.4 + broad * 2.1));
  return {
    level,
    broad,
    taper: poolNoise(a * 0.7 + 16.2, b * 0.7 - 4.8, seed + 401),
  };
}

export function contourPoolCacheKey(f) {
  return `contour-pools-v1:${f.w}:${contourPoolSettings(f.intensity).strength}`;
}

export function prepareContourPools(f) {
  const w = f.w,
    count = w * w,
    settings = contourPoolSettings(f.intensity);
  const owner = new Uint16Array(count),
    depth = new Float32Array(count);
  const normal = new Float32Array(count * 3),
    level = new Float32Array(count);
  const taper = new Float32Array(count),
    broad = new Float32Array(count);
  const boundaryDistance = new Float32Array(count).fill(1e4);
  const gradient = new Float32Array(count),
    band = new Int16Array(count);
  const ink = new Float32Array(count),
    halfWidths = new Float32Array(count),
    outlines = new Float32Array(count);
  const colors = new Uint8ClampedArray(count * 3);
  const seed = Number.isFinite(f.seed) ? f.seed | 0 : 0;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        j = i * 3,
        id = f.ID(x, y);
      owner[i] = id;
      depth[i] = f.distance(x, y);
      let nx = f.N(x, y, 0) * 2 - 1,
        ny = f.N(x, y, 1) * 2 - 1,
        nz = f.N(x, y, 2) * 2 - 1;
      const length = Math.hypot(nx, ny, nz) || 1;
      nx /= length;
      ny /= length;
      nz /= length;
      normal[j] = nx;
      normal[j + 1] = ny;
      normal[j + 2] = nz;
      const world = f.worldPosition(x, y);
      // World coordinates and surface orientation bend the level set as it wraps
      // round actual solids. Screen space only supplies a broad composition bias.
      const worldWeight = id > 1 ? 1 : 0.16;
      const u =
        (x / w) * 2.8 +
        worldWeight * (world[0] * 0.15 + world[2] * 0.1) +
        nx * 0.42;
      const v =
        (y / w) * 2.7 +
        worldWeight * (-world[1] * 0.15 + world[2] * 0.11) +
        ny * 0.42;
      const local = sampleContourPoolField(
        u,
        v,
        nx,
        ny,
        nz,
        f.normalizedDepth ? f.normalizedDepth(depth[i]) : clamp((depth[i] - 6) / 15),
        seed,
        settings,
      );
      level[i] = local.level;
      taper[i] = local.taper;
      broad[i] = local.broad;
      const material = f.B(x, y);
      colors[j] = material[0];
      colors[j + 1] = material[1];
      colors[j + 2] = material[2];
    }

  // No stencil crosses owners, depth discontinuities, or hard normal creases.
  // Thus a hidden/background color or field cannot leak into a visible object.
  const joins = (i, j) => {
    if (owner[i] !== owner[j]) return false;
    const a = i * 3,
      b = j * 3;
    const dot =
      normal[a] * normal[b] +
      normal[a + 1] * normal[b + 1] +
      normal[a + 2] * normal[b + 2];
    return (
      dot > 0.83 &&
      Math.abs(depth[i] - depth[j]) < 0.025 + (f.pixelWorldSize || 8.2 / w) * 6
    );
  };
  const surfaceJoins = (i, j) =>
    joins(i, j) ||
    (owner[i] !== owner[j] &&
      sameDrawSurface(f, i % w, Math.floor(i / w), j % w, Math.floor(j / w)));
  // Quantized normal buffers can introduce tiny level-set chatter. Two local
  // diffusion steps suppress it without transporting anything across a mask.
  const temporary = new Float32Array(count);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < w; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let sum = level[i] * 4,
          weight = 4;
        if (x && joins(i, i - 1)) {
          sum += level[i - 1];
          weight++;
        }
        if (x + 1 < w && joins(i, i + 1)) {
          sum += level[i + 1];
          weight++;
        }
        if (y && joins(i, i - w)) {
          sum += level[i - w];
          weight++;
        }
        if (y + 1 < w && joins(i, i + w)) {
          sum += level[i + w];
          weight++;
        }
        temporary[i] = sum / weight;
      }
    level.set(temporary);
  }
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const left = x > 0 && joins(i, i - 1),
        right = x + 1 < w && joins(i, i + 1);
      const up = y > 0 && joins(i, i - w),
        down = y + 1 < w && joins(i, i + w);
      const dx =
        left && right
          ? (level[i + 1] - level[i - 1]) * 0.5
          : right
            ? level[i + 1] - level[i]
            : left
              ? level[i] - level[i - 1]
              : 0;
      const dy =
        up && down
          ? (level[i + w] - level[i - w]) * 0.5
          : down
            ? level[i + w] - level[i]
            : up
              ? level[i] - level[i - w]
              : 0;
      gradient[i] = Math.hypot(dx, dy);
      if (
        (x > 0 && !surfaceJoins(i, i - 1)) ||
        (x + 1 < w && !surfaceJoins(i, i + 1)) ||
        (y > 0 && !surfaceJoins(i, i - w)) ||
        (y + 1 < w && !surfaceJoins(i, i + w))
      )
        boundaryDistance[i] = 0;
    }
  // Two bounded chamfer sweeps, confined to the same visible surface.
  const relax = (i, j, cost) => {
    if (surfaceJoins(i, j))
      boundaryDistance[i] = Math.min(
        boundaryDistance[i],
        boundaryDistance[j] + cost,
      );
  };
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x) relax(i, i - 1, 1);
      if (y) relax(i, i - w, 1);
      if (x && y) relax(i, i - w - 1, Math.SQRT2);
    }
  for (let y = w - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (x + 1 < w) relax(i, i + 1, 1);
      if (y + 1 < w) relax(i, i + w, 1);
      if (x + 1 < w && y + 1 < w) relax(i, i + w + 1, Math.SQRT2);
    }
  for (let i = 0; i < count; i++) {
    const cell = Math.floor(level[i]);
    band[i] = cell;
    const fract = level[i] - cell,
      edge = Math.min(fract, 1 - fract);
    // Uneven channel pressure. Finite scalar width also opens black lakes near
    // saddle points; gradient width keeps steep bands from becoming wire lines.
    const pressure = 0.13 + 1.3 * smooth(0.15, 0.85, taper[i]);
    const width = settings.channel * pressure * (w / 720);
    const halfLevel = Math.min(
      0.32,
      0.015 + settings.strength * 0.034 + gradient[i] * width,
    );
    const aa = Math.max(0.004, gradient[i] * 0.75);
    const channelInk = 1 - smooth(halfLevel - aa, halfLevel + aa, edge);
    const outline =
      1 -
      smooth(
        ((0.48 + settings.strength * 0.7) * w) / 720,
        ((1.65 + settings.strength * 0.9) * w) / 720,
        boundaryDistance[i],
      );
    halfWidths[i] = halfLevel;
    outlines[i] = outline;
    ink[i] = Math.max(channelInk, outline);
  }
  return {
    w,
    settings,
    owner,
    depth,
    normal,
    level,
    taper,
    broad,
    boundaryDistance,
    gradient,
    band,
    ink,
    halfWidths,
    outlines,
    colors,
  };
}

export function getContourPools(f) {
  return f.prepare(contourPoolCacheKey(f), () => prepareContourPools(f));
}

export function drawContourPools(p, f) {
  const field = getContourPools(f),
    count = f.w * f.w;
  p.loadPixels();
  const pixels = p.pixels;
  for (let i = 0; i < count; i++) {
    const j = i * 3,
      k = i * 4;
    const id = field.owner[i];
    // Material chroma steers the color family without determining the field.
    const r = field.colors[j],
      g = field.colors[j + 1],
      b = field.colors[j + 2];
    const family = r > g * 1.18 ? 1 : b + g > r * 2.03 ? 4 : 0;
    const index =
      (((field.band[i] + family) % palette.length) + palette.length) %
      palette.length;
    const color = palette[index],
      shade =
        0.87 +
        0.13 *
          clamp(0.56 + field.normal[j + 2] * 0.3 - field.normal[j + 1] * 0.28);
    const materialMix = id > 1 ? 0.16 : 0.06;
    const black = [8, 20, 22],
      coverage = field.ink[i];
    pixels[k] = mix(mix(color[0], r, materialMix) * shade, black[0], coverage);
    pixels[k + 1] = mix(
      mix(color[1], g, materialMix) * shade,
      black[1],
      coverage,
    );
    pixels[k + 2] = mix(
      mix(color[2], b, materialMix) * shade,
      black[2],
      coverage,
    );
    pixels[k + 3] = 255;
    // Resolve compressed bands over their scalar pixel footprint. Subpixel
    // plateaus merge into a stable color/ink average instead of stippled wires.
    const footprint = field.gradient[i];
    if (footprint > 0.12) {
      const taps = footprint > 0.32 ? 8 : 4,
        sum = [0, 0, 0];
      const aa = Math.max(0.004, (footprint / taps) * 0.8);
      for (let tap = 0; tap < taps; tap++) {
        const phase = field.level[i] + ((tap + 0.5) / taps - 0.5) * footprint;
        const cell = Math.floor(phase),
          fraction = phase - cell;
        const pigment =
          palette[
            (((cell + family) % palette.length) + palette.length) %
              palette.length
          ];
        const channel =
          1 -
          smooth(
            field.halfWidths[i] - aa,
            field.halfWidths[i] + aa,
            Math.min(fraction, 1 - fraction),
          );
        const alpha = Math.max(channel, field.outlines[i]);
        for (let c = 0; c < 3; c++)
          sum[c] += mix(
            mix(pigment[c], field.colors[j + c], materialMix) * shade,
            black[c],
            alpha,
          );
      }
      for (let c = 0; c < 3; c++) pixels[k + c] = sum[c] / taps;
    }
  }
  p.updatePixels();
}
