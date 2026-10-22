/** Shared pieces of the poster press: colour, noise, distance fields and the plate model. */

export type RGB = readonly [number, number, number];

export const hex = (value: string): RGB => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
];
export const luma = (c: RGB) => (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255;
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const sameRGB = (a: RGB, b: RGB) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 6;
export const css = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const smooth = (edge0: number, edge1: number, v: number) => {
  const t = clamp((v - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Hue in degrees and a chroma-like saturation, for matching a colour to the nearest ink. */
export function hueOf(c: RGB): { hue: number; sat: number; light: number } {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d > 1e-5) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { hue, sat: d, light: (max + min) / 2 };
}
export const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

export const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A repeatable 0..1 hash of two integers and a seed. */
export function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in 0..1. */
export function valueNoise(seed: number) {
  return (x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed);
    const c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
    const top = a + (b - a) * sx;
    return top + (c + (d - c) * sx - top) * sy;
  };
}
export function fbm(seed: number, octaves = 4) {
  const layers = Array.from({ length: octaves }, (_, i) => valueNoise(seed + i * 977));
  return (x: number, y: number) => {
    let sum = 0, amp = 0.5, norm = 0, f = 1;
    for (const layer of layers) {
      sum += layer(x * f, y * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  };
}

const INF = 1e20;
function edt1d(f: Float32Array, n: number, d: Float32Array, v: Int32Array, z: Float32Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Euclidean distance from every pixel to the nearest pixel where `feature` is true (Felzenszwalb). */
export function distanceField(w: number, h: number, feature: (p: number) => boolean): Float32Array {
  const grid = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) grid[p] = feature(p) ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float32Array(n), d = new Float32Array(n), v = new Int32Array(n), z = new Float32Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) f[x] = grid[row + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[row + x] = Math.sqrt(d[x]);
  }
  return grid;
}

/**
 * The plate model. Every shape is laid in painter's order as a knockout: whatever it covers is
 * removed from the plates beneath, so each plate holds exactly the ink the designer cut for it.
 * Misregistration at compose time then opens paper slivers and dark traps between inks.
 */
export class Press {
  readonly plates: Float32Array[] = [];
  readonly colours: RGB[] = [];
  readonly count: number;
  readonly g: CanvasRenderingContext2D;
  /** Multiplies every lay: the image area of the sheet. */
  clip: Float32Array | null = null;

  constructor(readonly N: number) {
    this.count = N * N;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = N;
    this.g = canvas.getContext('2d', { willReadFrequently: true })!;
  }

  ink(colour: RGB): number {
    const found = this.colours.findIndex((c) => sameRGB(c, colour));
    if (found >= 0) return found;
    this.colours.push(colour);
    this.plates.push(new Float32Array(this.count));
    return this.colours.length - 1;
  }

  /** Lay coverage `a` of ink `k` (or bare paper when k < 0) at pixel p. */
  lay(k: number, p: number, a: number) {
    if (a <= 0.002) return;
    if (a > 1) a = 1;
    if (this.clip) {
      a *= this.clip[p];
      if (a <= 0.002) return;
    }
    const plates = this.plates;
    for (let j = 0; j < plates.length; j++) plates[j][p] *= 1 - a;
    if (k >= 0) plates[k][p] += a;
  }

  /** A per-pixel field of one ink (null: knock back to paper). */
  fill(colour: RGB | null, cover: (p: number) => number) {
    const k = colour ? this.ink(colour) : -1;
    for (let p = 0; p < this.count; p++) {
      const a = cover(p);
      if (a > 0.002) this.lay(k, p, a);
    }
  }

  /** Vector shapes drawn in white on the scratch canvas, then laid as one ink. */
  draw(colour: RGB | null, paint: (g: CanvasRenderingContext2D) => void, mask?: (p: number) => number, strength = 1) {
    const k = colour ? this.ink(colour) : -1;
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.N, this.N);
    g.save();
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#ffffff';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    paint(g);
    g.restore();
    const data = g.getImageData(0, 0, this.N, this.N).data;
    for (let p = 0; p < this.count; p++) {
      const alpha = data[p * 4 + 3];
      if (!alpha) continue;
      let a = (alpha / 255) * strength;
      if (mask) a *= mask(p);
      this.lay(k, p, a);
    }
  }
}

export interface ComposeOptions {
  paper: RGB;
  dark: boolean;
  tooth: number;
  wear: number;
  seed: number;
  /** Plate offsets in pixels, by plate index. */
  offsets: (readonly [number, number])[];
  /** Plate indices whose ink is chalk rather than printing ink. */
  chalk?: Set<number>;
  folds: boolean;
  signal: AbortSignal;
}

/** Pull the sheet: paper, inks in order of lightness, misregistration, ink mottle and paper wear. */
export function compose(press: Press, o: ComposeOptions): Uint8ClampedArray {
  const N = press.N, count = N * N;
  const out = new Uint8ClampedArray(count * 4);
  const low = fbm(o.seed + 11, 4);
  const grain = valueNoise(o.seed + 29);
  const fibre = valueNoise(o.seed + 41);
  const speck = valueNoise(o.seed + 53);
  const unit = N / 720;
  const order = press.colours.map((_, i) => i).sort((a, b) => luma(press.colours[b]) - luma(press.colours[a]));

  // Paper: tone, mottle, fibres, yellowed edges.
  const base = new Float32Array(count * 3);
  const age = o.dark ? 0 : o.wear;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const p = y * N + x;
      const m = low(x / (90 * unit), y / (90 * unit)) - 0.5;
      const g = grain(x / (1.3 * unit), y / (1.3 * unit)) - 0.5;
      const f = fibre(x / (14 * unit), y / (2.2 * unit));
      const fleck = f > 0.86 ? (f - 0.86) * 3 * o.tooth : 0;
      const edge = Math.min(x, y, N - 1 - x, N - 1 - y) / N;
      const burn = age * (0.3 * Math.max(0, 0.1 - edge) * 10 + 0.12 * Math.max(0, m + 0.2));
      const shade = 1 + m * 0.07 * (0.5 + o.tooth) + g * 0.05 * o.tooth - fleck * 0.12 - burn * 0.22;
      const yellow = burn * 0.55;
      base[p * 3] = o.paper[0] * shade * (1 + yellow * 0.02);
      base[p * 3 + 1] = o.paper[1] * shade * (1 - yellow * 0.06);
      base[p * 3 + 2] = o.paper[2] * shade * (1 - yellow * 0.22);
    }
  }

  // Foxing spots on old stock.
  if (!o.dark && o.wear > 0.35) {
    const spots = Math.round((o.wear - 0.35) * 22);
    for (let s = 0; s < spots; s++) {
      const cx = hash2(s, 1, o.seed) * N, cy = hash2(s, 2, o.seed) * N;
      const r = (3 + hash2(s, 3, o.seed) * 14) * unit;
      const x0 = Math.max(0, Math.floor(cx - r * 1.5)), x1 = Math.min(N - 1, Math.ceil(cx + r * 1.5));
      const y0 = Math.max(0, Math.floor(cy - r * 1.5)), y1 = Math.min(N - 1, Math.ceil(cy + r * 1.5));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const d = Math.hypot(x - cx, y - cy) / r;
          if (d > 1.4) continue;
          const t = (d < 1 ? 0.35 + 0.65 * d * d : Math.max(0, 1 - (d - 1) / 0.4)) * 0.16;
          const p = (y * N + x) * 3;
          base[p] *= 1 - t * 0.6;
          base[p + 1] *= 1 - t * 0.9;
          base[p + 2] *= 1 - t * 1.4;
        }
    }
  }

  const sample = (plate: Float32Array, x: number, y: number) => {
    if (x < 0 || y < 0 || x > N - 1 || y > N - 1) return 0;
    const x0 = x | 0, y0 = y | 0;
    const x1 = Math.min(N - 1, x0 + 1), y1 = Math.min(N - 1, y0 + 1);
    const fx = x - x0, fy = y - y0;
    const a = plate[y0 * N + x0], b = plate[y0 * N + x1], c = plate[y1 * N + x0], d = plate[y1 * N + x1];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };

  const foldStrength = o.folds ? clamp((o.wear - 0.45) * 2.2, 0, 1) : 0;
  const foldX = N * 0.5 + (hash2(7, 7, o.seed) - 0.5) * 6 * unit;
  const foldY = N * 0.5 + (hash2(8, 8, o.seed) - 0.5) * 6 * unit;

  for (let y = 0; y < N; y++) {
    if ((y & 63) === 0) o.signal.throwIfAborted();
    for (let x = 0; x < N; x++) {
      const p = y * N + x;
      let r = base[p * 3], g = base[p * 3 + 1], b = base[p * 3 + 2];
      const tooth = speck(x / (1.1 * unit), y / (1.1 * unit));
      const mottle = low(x / (40 * unit) + 7.3, y / (40 * unit) - 3.1);
      // A crease where the sheet was folded in four: ink cracks away along it.
      let crack = 1;
      if (foldStrength > 0) {
        const dx = Math.abs(x - foldX), dy = Math.abs(y - foldY);
        const near = Math.min(dx, dy);
        if (near < 2.5 * unit) crack = 1 - foldStrength * (0.35 + 0.6 * (tooth > 0.45 ? 1 : 0));
      }
      for (const k of order) {
        const [ox, oy] = o.offsets[k] ?? [0, 0];
        let a = sample(press.plates[k], x - ox, y - oy);
        if (a <= 0.002) continue;
        const ink = press.colours[k];
        if (o.chalk?.has(k)) {
          // Chalk catches on the tooth of the paper and leaves it bare in the hollows.
          const bite = speck(x / (0.8 * unit) + 31, y / (2.2 * unit));
          a *= clamp((bite - 0.18) * 2.4, 0, 1) * (0.75 + 0.25 * mottle);
        } else {
          // Flat ink with a little mottle, and specks where the paper's tooth refused it.
          const missing = tooth > 1 - 0.05 * (0.4 + o.tooth) * (0.4 + o.wear * 1.6) ? 0.85 : 0;
          a *= (1 - missing) * (0.93 + 0.07 * mottle);
        }
        a *= crack;
        const opaque = 0.84;
        r = r * (1 - a) + a * (opaque * ink[0] + (1 - opaque) * ink[0] * r / 255);
        g = g * (1 - a) + a * (opaque * ink[1] + (1 - opaque) * ink[1] * g / 255);
        b = b * (1 - a) + a * (opaque * ink[2] + (1 - opaque) * ink[2] * b / 255);
      }
      if (foldStrength > 0) {
        const dx = x - foldX, dy = y - foldY;
        const lineX = Math.exp(-(dx * dx) / (2 * unit * unit)), lineY = Math.exp(-(dy * dy) / (2 * unit * unit));
        const side = (dx > 0 ? 0.02 : -0.015) * Math.exp(-Math.abs(dx) / (6 * unit)) + (dy > 0 ? 0.02 : -0.015) * Math.exp(-Math.abs(dy) / (6 * unit));
        const lift = 1 + (0.08 * (lineX + lineY) - side) * foldStrength;
        r *= lift;
        g *= lift;
        b *= lift;
      }
      out[p * 4] = r;
      out[p * 4 + 1] = g;
      out[p * 4 + 2] = b;
      out[p * 4 + 3] = 255;
    }
  }
  return out;
}
