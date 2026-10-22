/** Small raster helpers for the anime-light look: noise, blurs, resampling and colour arithmetic. */

export type RGB = [number, number, number];

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Hermite step; works with the edges in either order. */
export const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
};
export const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
export const mixRGB = (a: readonly number[], b: readonly number[], t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
export const scaleRGB = (a: readonly number[], k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
export const hex = (code: string): RGB => {
  const n = parseInt(code.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
export const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A repeatable hash of an integer lattice point, 0..1. */
export function hasher(seed: number) {
  return (x: number, y: number) => {
    let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ seed;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise, 0..1. */
export function valueNoise(seed: number) {
  const hash = hasher(seed);
  return (x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/** Fractal sum of value noise, 0..1. */
export function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves = 4) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * f + i * 17.31, y * f - i * 9.17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/** Separable box blur with clamped edges, linear time for any radius. */
export function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return src.slice();
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  const span = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / span;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / span;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Three box passes: near enough a gaussian of the given radius (sigma). */
export function gaussian(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const r = radius * 0.58;
  if (Math.round(r) < 1) {
    if (radius < 0.6) return src.slice();
    return boxBlur(src, w, h, 1);
  }
  return boxBlur(boxBlur(boxBlur(src, w, h, r), w, h, r), w, h, r);
}

/** Halve a square plane by averaging 2×2 blocks. */
export function halve(src: Float32Array, size: number): Float32Array {
  const small = Math.max(1, size >> 1);
  const out = new Float32Array(small * small);
  for (let y = 0; y < small; y++)
    for (let x = 0; x < small; x++) {
      const a = (y * 2) * size + x * 2;
      const b = Math.min(size - 1, y * 2 + 1) * size + x * 2;
      const right = Math.min(size - 1, x * 2 + 1) - x * 2;
      out[y * small + x] = (src[a] + src[a + right] + src[b] + src[b + right]) * 0.25;
    }
  return out;
}

/** Bilinear read of a square plane, clamped at the edges. */
export function sample(src: Float32Array, size: number, x: number, y: number) {
  const fx = Math.min(size - 1.001, Math.max(0, x)), fy = Math.min(size - 1.001, Math.max(0, y));
  const x0 = fx | 0, y0 = fy | 0;
  const tx = fx - x0, ty = fy - y0;
  const i = y0 * size + x0;
  const top = src[i] + (src[i + 1] - src[i]) * tx;
  const bottom = src[i + size] + (src[i + size + 1] - src[i + size]) * tx;
  return top + (bottom - top) * ty;
}

/** Grow a small square plane back to full size, bilinearly. */
export function grow(src: Float32Array, small: number, size: number): Float32Array {
  const out = new Float32Array(size * size);
  const k = small / size;
  for (let y = 0; y < size; y++) {
    const sy = (y + 0.5) * k - 0.5;
    for (let x = 0; x < size; x++) out[y * size + x] = sample(src, small, (x + 0.5) * k - 0.5, sy);
  }
  return out;
}

/**
 * A generalised Kuwahara filter from summed-area tables: each pixel takes the mean colour of its
 * four quadrants, weighted toward the calmest one. Flat patches with crisp edges, the way a
 * brush lays down paint, at a cost that does not grow with the radius.
 */
export function kuwahara(r: Float32Array, g: Float32Array, b: Float32Array, size: number, radius: number) {
  const W = size + 1;
  const sr = new Float64Array(W * W), sg = new Float64Array(W * W), sb = new Float64Array(W * W);
  const sl = new Float64Array(W * W), sq = new Float64Array(W * W);
  for (let y = 0; y < size; y++) {
    let ar = 0, ag = 0, ab = 0, al = 0, aq = 0;
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const l = luma(r[p], g[p], b[p]);
      ar += r[p]; ag += g[p]; ab += b[p]; al += l; aq += l * l;
      const q = (y + 1) * W + x + 1, above = y * W + x + 1;
      sr[q] = sr[above] + ar; sg[q] = sg[above] + ag; sb[q] = sb[above] + ab;
      sl[q] = sl[above] + al; sq[q] = sq[above] + aq;
    }
  }
  const box = (t: Float64Array, x0: number, y0: number, x1: number, y1: number) =>
    t[(y1 + 1) * W + x1 + 1] - t[y0 * W + x1 + 1] - t[(y1 + 1) * W + x0] + t[y0 * W + x0];
  const or = new Float32Array(size * size), og = new Float32Array(size * size), ob = new Float32Array(size * size);
  const rad = Math.max(1, Math.round(radius));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let wr = 0, wg = 0, wb = 0, wt = 0;
      for (let qd = 0; qd < 4; qd++) {
        const x0 = qd & 1 ? x : Math.max(0, x - rad), x1 = qd & 1 ? Math.min(size - 1, x + rad) : x;
        const y0 = qd & 2 ? y : Math.max(0, y - rad), y1 = qd & 2 ? Math.min(size - 1, y + rad) : y;
        const n = (x1 - x0 + 1) * (y1 - y0 + 1);
        const ml = box(sl, x0, y0, x1, y1) / n;
        const variance = Math.max(0, box(sq, x0, y0, x1, y1) / n - ml * ml);
        const w = 1 / (1e-4 + variance) ** 2;
        wr += (box(sr, x0, y0, x1, y1) / n) * w;
        wg += (box(sg, x0, y0, x1, y1) / n) * w;
        wb += (box(sb, x0, y0, x1, y1) / n) * w;
        wt += w;
      }
      const p = y * size + x;
      or[p] = wr / wt; og[p] = wg / wt; ob[p] = wb / wt;
    }
  return [or, og, ob] as const;
}

/** Saturate a colour about its luma. */
export function saturate(c: RGB, s: number): RGB {
  const l = luma(c[0], c[1], c[2]);
  return [l + (c[0] - l) * s, l + (c[1] - l) * s, l + (c[2] - l) * s];
}

/** RGB 0..1 to hue (0..1), saturation, value. */
export function toHSV(r: number, g: number, b: number): RGB {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 1e-6) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, max > 0 ? d / max : 0, max];
}
export function fromHSV(h: number, s: number, v: number): RGB {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

/**
 * A slowly varying field sampled on a coarse grid and filled in bilinearly: the same picture as
 * evaluating `fn` at every pixel when its features are much larger than `step`, at a fraction of the cost.
 */
export function coarse(fn: (x: number, y: number) => number, size: number, step: number): Float32Array {
  const s = Math.max(1, Math.round(step));
  const n = Math.ceil(size / s) + 2;
  const grid = new Float32Array(n * n);
  for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) grid[gy * n + gx] = fn(gx * s, gy * s);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = y / s, y0 = fy | 0, ty = fy - y0;
    for (let x = 0; x < size; x++) {
      const fx = x / s, x0 = fx | 0, tx = fx - x0;
      const i = y0 * n + x0;
      const top = grid[i] + (grid[i + 1] - grid[i]) * tx;
      const bottom = grid[i + n] + (grid[i + n + 1] - grid[i + n]) * tx;
      out[y * size + x] = top + (bottom - top) * ty;
    }
  }
  return out;
}
