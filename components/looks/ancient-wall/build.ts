import { type Capture, choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

/**
 * Ancient wall: the frame repainted the way an ancient workshop would have painted it.
 *   1. the capture is wobbled by hand, simplified (most of all on the cave wall), and every
 *      surface is matched to the few pigments its tradition had,
 *   2. the ground is read from its normals: tops and sides become flat painted fields or bare surface,
 *   3. outlines come from identity, depth and normal breaks (scratched through the glaze on a black-figure vase),
 *   4. colour is laid flat, washed, dabbed, or left unfinished over a red guide drawing,
 *   5. borders, hieroglyphs, inscriptions, cartouches, signs or stencilled hands go on,
 *   6. it is all pressed into the surface (rock relief, plaster, curved clay) and then aged by what
 *      happened to the wall, as far as the mood's wear allows: flakes, soot, scratches, seeping water.
 */

type RGB = [number, number, number];
type Tradition = 'cave' | 'egypt' | 'blackfigure' | 'redfigure' | 'dunhuang';
type Ground = 'pale' | 'warm' | 'deep';
type Palette = 'sparse' | 'earth' | 'mineral';

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const smooth = (from: number, to: number, x: number) => {
  const t = clamp01((x - from) / (to - from));
  return t * t * (3 - 2 * t);
};

const GLAZE = '#1b120d';
const CLAY = 'clay';

/** The bare surface: its base tone, a darker mottle and a third patch colour. */
const WALLS: Record<Tradition, Record<Ground, [string, string, string]>> = {
  cave: { pale: ['#dccaa8', '#9a8164', '#cfa47a'], warm: ['#cf955d', '#74482a', '#b6643a'], deep: ['#8f6a4a', '#43301f', '#80452a'] },
  egypt: { pale: ['#efe5cc', '#dccdab', '#f3ead6'], warm: ['#dcb46a', '#c49a52', '#e3c27e'], deep: ['#8d9c94', '#76857e', '#9aa79f'] },
  blackfigure: { pale: ['#e3b689', '#d1a072', '#ebc49b'], warm: ['#d8763e', '#c2622f', '#e2884f'], deep: ['#b3532e', '#9a4426', '#bf6038'] },
  redfigure: { pale: ['#e3b689', '#d1a072', '#ebc49b'], warm: ['#d8763e', '#c2622f', '#e2884f'], deep: ['#b3532e', '#9a4426', '#bf6038'] },
  dunhuang: { pale: ['#e2d1ad', '#cbb68e', '#ebdcbd'], warm: ['#a8482f', '#8c3826', '#b35a3d'], deep: ['#4f705b', '#405e4c', '#5d7d67'] },
};

/** The pigments the scene's surfaces are matched to. On a red-figure vase the first is the bare clay. */
const PIGMENTS: Record<Tradition, Record<Palette, string[]>> = {
  cave: {
    sparse: ['#9c3520', '#21150d'],
    earth: ['#9c3520', '#6e2418', '#c9772f', '#21150d', '#efdcbc'],
    mineral: ['#b5381f', '#6e2418', '#d99a2b', '#21150d', '#4a2c34', '#f2e6cc', '#8c4a22'],
  },
  egypt: {
    sparse: ['#b23a26', '#231a14', '#d9a441'],
    earth: ['#a83c26', '#d9a441', '#231a14', '#f2ead6', '#7a4a2a', '#c8763f'],
    mineral: ['#b8322a', '#2a58a8', '#e2b13a', '#2e8a55', '#231a14', '#f2ead6', '#3fa6a0', '#c8763f'],
  },
  blackfigure: { sparse: [GLAZE], earth: [GLAZE, '#8a2a37'], mineral: [GLAZE, '#8a2a37', '#f3e6cf'] },
  redfigure: { sparse: [CLAY, GLAZE], earth: [CLAY, GLAZE, '#8a2a37'], mineral: [CLAY, GLAZE, '#8a2a37', '#f3e6cf', '#b7773a'] },
  dunhuang: {
    sparse: ['#a5452f', '#3f8f6e', '#ecdfc4'],
    earth: ['#a5452f', '#7a3020', '#c99a5a', '#ecdfc4', '#3a2a24'],
    mineral: ['#3f8f6e', '#6ab08e', '#2f5f8f', '#5a86b0', '#ecdfc4', '#a5452f', '#d8b05a', '#4a4038'],
  },
};
/** Extra cost for reaching an accent: a vase is mostly glaze (or clay), touched with colour. */
const BIAS: Partial<Record<Tradition, number[]>> = { blackfigure: [0, 0.035, 0.05], redfigure: [0, 0, 0.03, 0.06, 0.04] };
const LINE: Record<Tradition, string> = { cave: '#21150d', egypt: '#2a1810', blackfigure: GLAZE, redfigure: GLAZE, dunhuang: '#5a2414' };
/** The guide drawing of an unfinished picture. */
const GUIDE: Record<Tradition, string> = { cave: '#efe0c2', egypt: '#c0462c', blackfigure: '#7a3a1e', redfigure: '#6a3420', dunhuang: '#b5482a' };
/** What shows where the paint layer has come away. */
const BENEATH: Record<Tradition, string> = { cave: '#e4d2b0', egypt: '#a8865c', blackfigure: '#ecc79c', redfigure: '#ecc79c', dunhuang: '#d8c6a2' };

// sRGB → OKLab, for judging which pigment a colour is nearest to.
const LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const oklab = (r: number, g: number, b: number): RGB => {
  const R = LINEAR[Math.max(0, Math.min(255, Math.round(r)))];
  const G = LINEAR[Math.max(0, Math.min(255, Math.round(g)))];
  const B = LINEAR[Math.max(0, Math.min(255, Math.round(b)))];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const hash = (x: number, y: number, s: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const fbm = (x: number, y: number, s: number, octaves: number) => {
  let sum = 0, norm = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * f, y * f, s + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
};
/** fbm sampled on a coarse grid and interpolated: smooth fields at a fraction of the cost. */
function field(size: number, scale: number, octaves: number, s: number, step = 3): Float32Array {
  const g = Math.ceil(size / step) + 2;
  const coarse = new Float32Array(g * g);
  for (let gy = 0; gy < g; gy++) for (let gx = 0; gx < g; gx++) coarse[gy * g + gx] = fbm((gx * step) / scale, (gy * step) / scale, s, octaves);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = y / step, iy = Math.floor(fy), ty = fy - iy;
    for (let x = 0; x < size; x++) {
      const fx = x / step, ix = Math.floor(fx), tx = fx - ix;
      const i = iy * g + ix;
      const a = coarse[i], b = coarse[i + 1], c = coarse[i + g], d = coarse[i + g + 1];
      out[y * size + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
  }
  return out;
}
/** A two-pass chamfer distance: seeds hold their own (negative) reach, everything else 1e4. */
function chamfer(f: Float32Array, size: number, label?: Int16Array) {
  const D = Math.SQRT2;
  const take = (p: number, q: number, d: number) => {
    if (f[q] + d < f[p]) {
      f[p] = f[q] + d;
      if (label) label[p] = label[q];
    }
  };
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      const p = y * size + x;
      take(p, p - 1, 1); take(p, p - size, 1); take(p, p - size - 1, D); take(p, p - size + 1, D);
    }
  for (let y = size - 2; y > 0; y--)
    for (let x = size - 2; x > 0; x--) {
      const p = y * size + x;
      take(p, p + 1, 1); take(p, p + size, 1); take(p, p + size + 1, D); take(p, p + size - 1, D);
    }
}

// ── Glyphs: drawn from a few primitives in a unit cell (y down) ───────────────────────────────
type Prim = ['l', number[], number?] | ['o', number, number, number, number] | ['d', number, number, number] | ['p', number[]] | ['e', number, number, number, number];
const ell = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = Math.PI * 2, n = 18) => {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    pts.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
  }
  return pts;
};
/** Hieroglyph-like signs: ankh, sun, water, reed, loaf, mouth, birds, viper, arm, basket, house… */
const HIEROGLYPHS: Prim[][] = [
  [['o', 0.5, 0.24, 0.14, 0.18], ['l', [0.2, 0.47, 0.8, 0.47], 1.2], ['l', [0.5, 0.44, 0.5, 0.96], 1.3]],
  [['e', 0.5, 0.5, 0.3, 0.3], ['d', 0.5, 0.5, 0.07]],
  [['l', [0.04, 0.56, 0.13, 0.42, 0.22, 0.58, 0.31, 0.42, 0.4, 0.58, 0.49, 0.42, 0.58, 0.58, 0.67, 0.42, 0.76, 0.58, 0.85, 0.42, 0.96, 0.56]]],
  [['p', [0.5, 0.04, 0.63, 0.28, 0.6, 0.66, 0.5, 0.96, 0.41, 0.66, 0.4, 0.3]]],
  [['p', ell(0.5, 0.74, 0.36, 0.34, Math.PI, Math.PI * 2)]],
  [['p', [0.08, 0.5, 0.3, 0.37, 0.7, 0.37, 0.92, 0.5, 0.7, 0.63, 0.3, 0.63]]],
  [['e', 0.52, 0.52, 0.24, 0.15], ['d', 0.3, 0.3, 0.09], ['l', [0.23, 0.29, 0.09, 0.34]], ['p', [0.7, 0.44, 0.97, 0.6, 0.72, 0.63]], ['l', [0.47, 0.64, 0.43, 0.94]], ['l', [0.57, 0.64, 0.62, 0.94]], ['l', [0.31, 0.37, 0.37, 0.45]]],
  [['e', 0.5, 0.6, 0.19, 0.27], ['e', 0.5, 0.25, 0.15, 0.13], ['l', [0.42, 0.86, 0.4, 0.98]], ['l', [0.58, 0.86, 0.6, 0.98]]],
  [['l', [0.06, 0.72, 0.22, 0.56, 0.38, 0.72, 0.54, 0.56, 0.7, 0.7, 0.84, 0.58], 1.3], ['e', 0.88, 0.56, 0.07, 0.05], ['l', [0.86, 0.52, 0.83, 0.38]], ['l', [0.9, 0.52, 0.93, 0.38]]],
  [['l', [0.05, 0.62, 0.62, 0.62], 1.7], ['p', [0.6, 0.52, 0.95, 0.44, 0.97, 0.53, 0.64, 0.7]]],
  [['p', ell(0.5, 0.42, 0.4, 0.42, 0, Math.PI)], ['l', [0.86, 0.48, 0.96, 0.36, 0.9, 0.28], 0.8]],
  [['l', [0.4, 0.82, 0.14, 0.82, 0.14, 0.2, 0.86, 0.2, 0.86, 0.82, 0.6, 0.82], 1.2]],
  [['l', [0.28, 0.2, 0.28, 0.8], 1.2], ['l', [0.5, 0.2, 0.5, 0.8], 1.2], ['l', [0.72, 0.2, 0.72, 0.8], 1.2]],
  [['l', [0.5, 0.14, 0.5, 0.96], 2], ['l', [0.26, 0.2, 0.74, 0.2], 1.1], ['l', [0.26, 0.32, 0.74, 0.32], 1.1], ['l', [0.26, 0.44, 0.74, 0.44], 1.1], ['l', [0.3, 0.96, 0.7, 0.96], 1.2]],
  [['p', [0.48, 0.96, 0.44, 0.6, 0.4, 0.3, 0.5, 0.05, 0.62, 0.2, 0.6, 0.55, 0.54, 0.96]]],
  [['p', [0.1, 0.42, 0.3, 0.3, 0.62, 0.3, 0.9, 0.42, 0.62, 0.54, 0.3, 0.54]], ['d', 0.5, 0.42, 0.08], ['l', [0.4, 0.56, 0.36, 0.84, 0.48, 0.9], 0.9], ['l', [0.6, 0.56, 0.74, 0.84], 0.9]],
  [['d', 0.55, 0.16, 0.11], ['p', [0.44, 0.28, 0.66, 0.28, 0.72, 0.6, 0.92, 0.64, 0.92, 0.86, 0.3, 0.86, 0.36, 0.56]]],
  [['l', [0.5, 0.96, 0.5, 0.5], 0.9], ['p', [0.5, 0.54, 0.2, 0.14, 0.38, 0.24, 0.5, 0.05, 0.62, 0.24, 0.8, 0.14]]],
  [['l', [0.56, 0.06, 0.5, 0.84, 0.9, 0.88], 1.7]],
  [['l', [0.5, 0.92, 0.5, 0.2, 0.28, 0.2, 0.28, 0.72, 0.72, 0.72, 0.72, 0.36, 0.5, 0.36], 1.1]],
  [['l', [0.18, 0.92, 0.8, 0.92, 0.8, 0.72, 0.6, 0.62, 0.6, 0.32], 1.4], ['e', 0.6, 0.25, 0.13, 0.1]],
  [['p', [0.38, 0.08, 0.62, 0.08, 0.6, 0.2, 0.77, 0.42, 0.7, 0.86, 0.3, 0.86, 0.23, 0.42, 0.4, 0.2]]],
];
/** Archaic Greek capitals as strokes in a unit cell; O is drawn as a small ring. */
const LETTERS: Record<string, number[][]> = {
  Α: [[0.1, 1, 0.5, 0, 0.9, 1], [0.28, 0.58, 0.72, 0.58]],
  Ε: [[0.85, 0, 0.2, 0, 0.2, 1, 0.85, 1], [0.2, 0.5, 0.7, 0.5]],
  Ι: [[0.5, 0, 0.5, 1]],
  Κ: [[0.2, 0, 0.2, 1], [0.85, 0, 0.22, 0.55, 0.85, 1]],
  Λ: [[0.1, 1, 0.5, 0, 0.9, 1]],
  Ν: [[0.15, 1, 0.15, 0, 0.85, 1, 0.85, 0]],
  Π: [[0.15, 1, 0.15, 0, 0.85, 0, 0.85, 1]],
  Ρ: [[0.2, 1, 0.2, 0, 0.72, 0.04, 0.82, 0.26, 0.7, 0.48, 0.2, 0.5]],
  Σ: [[0.85, 0.04, 0.2, 0.26, 0.76, 0.5, 0.2, 0.74, 0.85, 0.96]],
  Τ: [[0.08, 0, 0.92, 0], [0.5, 0, 0.5, 1]],
  Χ: [[0.12, 0, 0.88, 1], [0.88, 0, 0.12, 1]],
  Η: [[0.15, 0, 0.15, 1], [0.85, 0, 0.85, 1], [0.15, 0.5, 0.85, 0.5]],
  Μ: [[0.08, 1, 0.2, 0, 0.5, 0.62, 0.8, 0, 0.92, 1]],
  Δ: [[0.5, 0, 0.08, 1, 0.92, 1, 0.5, 0]],
  Υ: [[0.1, 0, 0.5, 0.5, 0.9, 0], [0.5, 0.5, 0.5, 1]],
  Ο: [],
};
const WORDS = ['ΚΑΛΟΣ', 'ΕΠΟΙΕΣΕΝ', 'ΧΑΙΡΕ', 'ΗΟΠΑΙΣΚΑΛΟΣ', 'ΚΑΛΕ', 'ΝΙΚΕ', 'ΔΕΜΟΣ', 'ΑΝΤΙΜΕΝΕΣ'];

/** OKLab of every 15-bit colour bin, judged once. */
const BIN_LAB = new Float32Array(32768 * 3);
for (let bin = 0; bin < 32768; bin++) {
  const lab = oklab(((bin >> 10) & 31) * 8 + 4, ((bin >> 5) & 31) * 8 + 4, (bin & 31) * 8 + 4);
  BIN_LAB[bin * 3] = lab[0];
  BIN_LAB[bin * 3 + 1] = lab[1];
  BIN_LAB[bin * 3 + 2] = lab[2];
}

// ── Passes. Each pixel loop lives in its own function so the engine can optimise it alone. ──

interface Source {
  id0: Uint8Array;
  dep0: Float32Array;
  lit0: Float32Array;
  fold0: Float32Array;
  tint: RGB;
}
interface Frame {
  size: number;
  ids: Uint8Array;
  dep: Float32Array;
  lit: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  fold: Float32Array;
  col: Float32Array;
}

function readCapture(capture: Capture, cave: boolean): Source {
  const { size, normal, depth, diffuse, identity } = capture;
  const N = size * size;
  const id0 = new Uint8Array(N), dep0 = new Float32Array(N), lit0 = new Float32Array(N), fold0 = new Float32Array(N);
  const histogram = new Uint32Array(256);
  let solid = 0, sr = 0, sg = 0, sb = 0;
  for (let p = 0; p < N; p++) {
    const id = identity[p * 4];
    id0[p] = id;
    dep0[p] = id === 0 ? 1 : (depth[p * 4] + depth[p * 4 + 1] / 256 + depth[p * 4 + 2] / 65536) / 255;
    if (id > 0) {
      const r = diffuse[p * 4], g = diffuse[p * 4 + 1], b = diffuse[p * 4 + 2];
      histogram[Math.round((r + g + b) / 3)]++;
      sr += r;
      sg += g;
      sb += b;
      solid++;
    }
  }
  let litMax = 255;
  for (let v = 255, seen = 0; v > 0; v--) {
    seen += histogram[v];
    if (seen > solid * 0.02) {
      litMax = v;
      break;
    }
  }
  const norm = 1 / Math.max(24, litMax) / 3;
  for (let p = 0; p < N; p++) lit0[p] = id0[p] === 0 ? 1 : Math.min(1, (diffuse[p * 4] + diffuse[p * 4 + 1] + diffuse[p * 4 + 2]) * norm);
  // Folds (depth bends and normal creases) are found before the hand's wobble, then carried with it.
  const pws = capture.pixelWorldSize / Math.max(1e-6, capture.far - capture.near);
  const creaseDot = cave ? 0.5 : 0.8, crease = cave ? 0.45 : 0.5;
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      const p = y * size + x, id = id0[p];
      if (id === 0) continue;
      let s = 0;
      for (let side = 0; side < 2; side++) {
        const step = side === 0 ? 1 : size;
        const q = p + step;
        if (id0[q] !== id || id0[p - step] !== id) continue;
        if (Math.abs(dep0[p - step] - 2 * dep0[p] + dep0[q]) > pws * 2.5) s = 0.8;
        const dot =
          ((normal[p * 4] - 127.5) * (normal[q * 4] - 127.5) + (normal[p * 4 + 1] - 127.5) * (normal[q * 4 + 1] - 127.5) + (normal[p * 4 + 2] - 127.5) * (normal[q * 4 + 2] - 127.5)) / 16256;
        if (dot < creaseDot) s = Math.max(s, id === 1 ? 0.6 : crease);
      }
      fold0[p] = s;
    }
  // The plain grey pass carries the colour of the light.
  const mean = (sr + sg + sb) / 3 || 1;
  const t = (v: number) => Math.min(1.6, Math.max(0.6, v / mean || 1));
  return { id0, dep0, lit0, fold0, tint: [t(sr), t(sg), t(sb)] };
}

/** A hand never traces exactly: the whole drawing is resampled through a smooth wobble. */
function warpFrame(capture: Capture, src: Source, wobble: number, cave: boolean, seed: number): Frame {
  const { size, color, normal, diffuse } = capture;
  const { id0, dep0, lit0, fold0, tint } = src;
  const N = size * size, U = size / 720;
  const ids = new Uint8Array(N), dep = new Float32Array(N), lit = new Float32Array(N);
  const nx = new Float32Array(N), ny = new Float32Array(N), fold = new Float32Array(N), col = new Float32Array(N * 3);
  const step = 4, g = Math.ceil(size / step) + 2;
  const WX = new Float32Array(g * g), WY = new Float32Array(g * g);
  const wl = 46 * U, wf = 12 * U;
  for (let gy = 0; gy < g; gy++)
    for (let gx = 0; gx < g; gx++) {
      const X = gx * step, Y = gy * step;
      let wx = (vnoise(X / wl, Y / wl, seed + 1) - 0.5) * 2 * wobble;
      let wy = (vnoise(X / wl, Y / wl, seed + 2) - 0.5) * 2 * wobble;
      if (cave) {
        wx += (vnoise(X / wf, Y / wf, seed + 3) - 0.5) * wobble * 0.5;
        wy += (vnoise(X / wf, Y / wf, seed + 4) - 0.5) * wobble * 0.5;
      }
      WX[gy * g + gx] = wx;
      WY[gy * g + gx] = wy;
    }
  for (let y = 0; y < size; y++) {
    const fy = y / step, iy = fy | 0, ty = fy - iy;
    for (let x = 0; x < size; x++) {
      const fx = x / step, ix = fx | 0, tx = fx - ix, i = iy * g + ix;
      const wx = WX[i] + (WX[i + 1] - WX[i]) * tx + (WX[i + g] - WX[i]) * ty + (WX[i] - WX[i + 1] - WX[i + g] + WX[i + g + 1]) * tx * ty;
      const wy = WY[i] + (WY[i + 1] - WY[i]) * tx + (WY[i + g] - WY[i]) * ty + (WY[i] - WY[i + 1] - WY[i + g] + WY[i + g + 1]) * tx * ty;
      const sx = Math.max(0, Math.min(size - 1, Math.round(x + wx)));
      const sy = Math.max(0, Math.min(size - 1, Math.round(y + wy)));
      const p = y * size + x, q = sy * size + sx;
      const id = id0[q];
      ids[p] = id;
      dep[p] = dep0[q];
      lit[p] = lit0[q];
      nx[p] = normal[q * 4] / 127.5 - 1;
      ny[p] = normal[q * 4 + 1] / 127.5 - 1;
      fold[p] = fold0[q];
      if (id === 0) {
        col[p * 3] = color[q * 4];
        col[p * 3 + 1] = color[q * 4 + 1];
        col[p * 3 + 2] = color[q * 4 + 2];
        continue;
      }
      // Lift light, shade and the light's colour out of the surface: these traditions paint
      // what a thing is, not how it is lit.
      const gain = 1 / mix(1, Math.max(lit[p], 0.3), 0.78);
      const dr = diffuse[q * 4], dg = diffuse[q * 4 + 1], db = diffuse[q * 4 + 2], dm = (dr + dg + db) / 3;
      const tr = dm > 10 ? Math.min(1.6, Math.max(0.6, dr / dm)) : tint[0];
      const tg = dm > 10 ? Math.min(1.6, Math.max(0.6, dg / dm)) : tint[1];
      const tb = dm > 10 ? Math.min(1.6, Math.max(0.6, db / dm)) : tint[2];
      col[p * 3] = Math.min(255, (color[q * 4] * gain) / (0.15 + 0.85 * tr));
      col[p * 3 + 1] = Math.min(255, (color[q * 4 + 1] * gain) / (0.15 + 0.85 * tg));
      col[p * 3 + 2] = Math.min(255, (color[q * 4 + 2] * gain) / (0.15 + 0.85 * tb));
    }
  }
  return { size, ids, dep, lit, nx, ny, fold, col };
}

/** The cave painter simplifies: small parts melt into the body, corners round off. */
function simplifyIds(ids: Uint8Array, size: number, r: number, stride: number) {
  const next = new Uint8Array(ids.length);
  const votes = new Uint16Array(256);
  const seen = new Uint8Array(256);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let best = ids[y * size + x], bestVotes = 0, n = 0;
      for (let yy = Math.max(0, y - r); yy <= Math.min(size - 1, y + r); yy += stride)
        for (let xx = Math.max(0, x - r); xx <= Math.min(size - 1, x + r); xx += stride) {
          const id = ids[yy * size + xx];
          const v = ++votes[id];
          seen[n++] = id;
          if (v > bestVotes) {
            best = id;
            bestVotes = v;
          }
        }
      for (let i = 0; i < n; i++) votes[seen[i]] = 0;
      next[y * size + x] = best;
    }
  ids.set(next);
}

/**
 * Match every surface of the set and the things to a pigment. Each surface's dominant colour
 * (a mean, then a mean of what lies near it) chooses its main pigment, and pixels of that hue,
 * lit or shaded, take it too, so a face stays one colour. Neighbouring things are nudged apart.
 */
function assignPigments(f: Frame, labs: RGB[], cost: number[], variety: number): Int16Array {
  const { size, ids, col } = f;
  const N = size * size, count = labs.length;
  const match = (L: number, A0: number, B0: number, used: Uint8Array | null) => {
    const A = A0 * 1.35, B = B0 * 1.35;
    let best = 0, bestDistance = Infinity;
    for (let t = 0; t < count; t++) {
      const lab = labs[t];
      const d = (L - lab[0]) ** 2 * 1.1 + ((A - lab[1]) ** 2 + (B - lab[2]) ** 2) * 2 + cost[t] + (used ? used[t] * variety : 0);
      if (d < bestDistance) {
        best = t;
        bestDistance = d;
      }
    }
    return best;
  };
  const bins = new Uint16Array(N);
  for (let p = 0; p < N; p++)
    if (ids[p] >= 2) bins[p] = ((Math.min(255, col[p * 3]) >> 3) << 10) | ((Math.min(255, col[p * 3 + 1]) >> 3) << 5) | (Math.min(255, col[p * 3 + 2]) >> 3);
  const sums = new Float64Array(256 * 4);
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float64Array(256 * 4);
    for (let p = 0; p < N; p += 2) {
      const id = ids[p];
      if (id < 2) continue;
      const at = bins[p] * 3;
      const L = BIN_LAB[at], A0 = BIN_LAB[at + 1], B0 = BIN_LAB[at + 2];
      if (pass === 1) {
        const n = sums[id * 4 + 3];
        if (Math.abs(L - sums[id * 4] / n) > 0.2 || Math.hypot(A0 - sums[id * 4 + 1] / n, B0 - sums[id * 4 + 2] / n) > 0.06) continue;
      }
      next[id * 4] += L;
      next[id * 4 + 1] += A0;
      next[id * 4 + 2] += B0;
      next[id * 4 + 3]++;
    }
    for (let id = 0; id < 256; id++) if (next[id * 4 + 3] > 0 || pass === 0) for (let c = 0; c < 4; c++) sums[id * 4 + c] = next[id * 4 + c];
  }
  const order: number[] = [];
  for (let id = 2; id < 256; id++) if (sums[id * 4 + 3] > 0) order.push(id);
  order.sort((a, b) => sums[b * 4 + 3] - sums[a * 4 + 3]);
  const mainOf = new Int16Array(256).fill(-1);
  const meanOf = new Float32Array(256 * 3);
  const used = new Uint8Array(count);
  for (const id of order) {
    const n = sums[id * 4 + 3];
    meanOf[id * 3] = sums[id * 4] / n;
    meanOf[id * 3 + 1] = sums[id * 4 + 1] / n;
    meanOf[id * 3 + 2] = sums[id * 4 + 2] / n;
    mainOf[id] = match(meanOf[id * 3], meanOf[id * 3 + 1], meanOf[id * 3 + 2], used);
    used[mainOf[id]]++;
  }
  const lut = new Int16Array(32768).fill(-1);
  const paint = new Int16Array(N).fill(-1);
  for (let p = 0; p < N; p++) {
    const id = ids[p];
    if (id < 2) continue;
    const bin = bins[p], at = bin * 3;
    const L = BIN_LAB[at], A0 = BIN_LAB[at + 1], B0 = BIN_LAB[at + 2];
    if (mainOf[id] >= 0 && Math.abs(L - meanOf[id * 3]) < 0.2 && Math.hypot(A0 - meanOf[id * 3 + 1], B0 - meanOf[id * 3 + 2]) < 0.05) {
      paint[p] = mainOf[id];
      continue;
    }
    let t = lut[bin];
    if (t < 0) t = lut[bin] = match(L, A0, B0, null);
    paint[p] = t;
  }
  return paint;
}

/** A majority vote inside each surface removes specks no painter would bother with. */
function votePaint(paint: Int16Array, ids: Uint8Array, size: number, r: number, stride: number, count: number): Int16Array {
  const votes = new Uint16Array(count);
  const next = new Int16Array(paint);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x, id = ids[p];
      if (id < 2) continue;
      votes.fill(0);
      let best = paint[p], bestVotes = 0;
      for (let yy = Math.max(0, y - r); yy <= Math.min(size - 1, y + r); yy += stride)
        for (let xx = Math.max(0, x - r); xx <= Math.min(size - 1, x + r); xx += stride) {
          const q = yy * size + xx;
          const k = paint[q];
          if (ids[q] !== id || k < 0) continue;
          const v = ++votes[k];
          if (v > bestVotes) {
            best = k;
            bestVotes = v;
          }
        }
      next[p] = best;
    }
  return next;
}

/**
 * Each thing reads as one painted shape with a few accents: crumbs merge into the largest part.
 * On a vase, the largest part of every figure is glaze (or bare clay) and colour stays an accent.
 */
function consolidate(paint: Int16Array, ids: Uint8Array, count: number, vase: boolean) {
  const N = paint.length;
  const counts = new Uint32Array(256 * count);
  for (let p = 0; p < N; p++) if (ids[p] >= 2 && paint[p] >= 0) counts[ids[p] * count + paint[p]]++;
  const remap = new Int16Array(256 * count);
  for (let id = 2; id < 256; id++) {
    let total = 0, top = 0;
    for (let k = 0; k < count; k++) {
      total += counts[id * count + k];
      if (counts[id * count + k] > counts[id * count + top]) top = k;
    }
    for (let k = 0; k < count; k++) {
      const c = counts[id * count + k];
      remap[id * count + k] = vase ? (k === top || c < total * 0.025 || c > total * 0.42 ? 0 : k) : c < total * 0.025 ? top : k;
    }
  }
  for (let p = 0; p < N; p++) if (ids[p] >= 2 && paint[p] >= 0) paint[p] = remap[ids[p] * count + paint[p]];
}

interface EdgeOptions {
  T: Tradition;
  FIG: number;
  BLACK: number;
  weight: number;
  cutWeight: number;
  wear: number;
  seed: number;
}
/** Outlines (and incisions) from identity, pigment and fold breaks, as reach fields. */
function findEdges(f: Frame, paint: Int16Array, o: EdgeOptions) {
  const { size, ids, dep, fold } = f;
  const { T, FIG, BLACK, weight, cutWeight, wear, seed } = o;
  const N = size * size, U = size / 720;
  const cave = T === 'cave', black = T === 'blackfigure', red = T === 'redfigure';
  let thingNear = 1, thingFar = 0;
  for (let p = 0; p < N; p++)
    if (ids[p] >= 2) {
      if (dep[p] < thingNear) thingNear = dep[p];
      if (dep[p] > thingFar) thingFar = dep[p];
    }
  const thingSpan = Math.max(1e-6, thingFar - thingNear);
  const line = new Float32Array(N).fill(1e4);
  const cut = black ? new Float32Array(N).fill(1e4) : null;
  const bd = new Float32Array(N).fill(1e4);
  const glaze = (k: number) => BLACK >= 0 && k === BLACK;
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      const p = y * size + x;
      let sl = 0, sc = 0, region = false;
      for (let side = 0; side < 2; side++) {
        const q = p + (side === 0 ? 1 : size);
        const ia = ids[p], ib = ids[q], ka = paint[p], kb = paint[q];
        if (ia !== ib) {
          region = true;
          // Things carry the full line; the world's set a little less; ground meeting sky least.
          const s = ia >= FIG || ib >= FIG ? 1 : ia >= 2 || ib >= 2 ? (cave ? 0.6 : 0.9) : cave ? 0.5 : 0.8;
          if (black) {
            if (ka >= 0 && kb >= 0) sc = Math.max(sc, 0.95);
            else if ((ka < 0 && kb < 0) || ka <= -2 || kb <= -2) sl = Math.max(sl, s * 0.85);
          } else if (red) {
            if (!(glaze(ka) && glaze(kb))) sl = Math.max(sl, s);
          } else sl = Math.max(sl, s);
          continue;
        }
        if (ka !== kb && ia !== 0) {
          region = true;
          const s = ia === 1 ? 0.6 : cave ? 0.55 : 0.65;
          if (black) {
            if (ka >= 0 && kb >= 0) sc = Math.max(sc, 0.8);
            else if (ka <= -2 || kb <= -2) sl = Math.max(sl, s);
          } else if (red) {
            if (!(glaze(ka) && glaze(kb))) sl = Math.max(sl, s);
          } else sl = Math.max(sl, s);
        }
      }
      const s = fold[p];
      if (s > 0) {
        const ka = paint[p];
        region = true;
        if (black) {
          if (ka >= 0) sc = Math.max(sc, s);
          else sl = Math.max(sl, s * 0.8);
        } else if (red) {
          if (!glaze(ka)) sl = Math.max(sl, s);
        } else sl = Math.max(sl, s);
      }
      if (region) bd[p] = 0;
      if (sl === 0 && sc === 0) continue;
      const near = ids[p] >= 2 ? 1.15 - 0.3 * clamp01((dep[p] - thingNear) / thingSpan) : 0.9;
      let hand: number;
      if (cave) {
        hand = 0.55 + 0.9 * vnoise(x / (26 * U), y / (26 * U), seed + 21);
        // The cave painter did not close every outline.
        hand *= sl < 1 ? smooth(0.3, 0.5, vnoise(x / (60 * U), y / (60 * U), seed + 23)) : 0.35 + 0.65 * smooth(0.22, 0.42, vnoise(x / (70 * U), y / (70 * U), seed + 25));
      } else hand = 0.9 + 0.2 * vnoise(x / (24 * U), y / (24 * U), seed + 27);
      // A worn wall loses the finest lines first.
      hand *= 1 - 0.6 * smooth(wear * 0.25, wear * 0.25 - 0.08, vnoise(x / (7 * U), y / (7 * U), seed + 29));
      if (sl > 0) line[p] = -weight * sl * near * hand;
      if (sc > 0 && cut) cut[p] = -cutWeight * sc * (0.9 + 0.2 * hand);
    }
  chamfer(line, size);
  if (cut) chamfer(cut, size);
  chamfer(bd, size);
  return { line, cut, bd };
}

/** Plain lighting blurred inside each surface: used sparingly, for a shaded back or a wash. */
function blurWithin(src: Float32Array, ids: Uint8Array, size: number, r: number): Float32Array {
  let a = new Float32Array(src), b = new Float32Array(src.length);
  for (let pass = 0; pass < 2; pass++) {
    const step = pass === 0 ? 1 : size;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const p = y * size + x, id = ids[p];
        const along = step === 1 ? x : y;
        let sum = 0, n = 0;
        for (let k = -Math.min(r, along); k <= Math.min(r, size - 1 - along); k += 3) {
          const q = p + k * step;
          if (ids[q] !== id) continue;
          sum += a[q];
          n++;
        }
        b[p] = n ? sum / n : a[p];
      }
    [a, b] = [b, a];
  }
  return a;
}

function putRGB(P: Float32Array, A: Float32Array, p: number, r: number, g: number, b: number, alpha: number) {
  if (alpha <= 0) return;
  if (alpha > 1) alpha = 1;
  const k = 1 - alpha;
  P[p * 3] = P[p * 3] * k + r * alpha;
  P[p * 3 + 1] = P[p * 3 + 1] * k + g * alpha;
  P[p * 3 + 2] = P[p * 3 + 2] * k + b * alpha;
  A[p] = A[p] * k + alpha;
}

/** The guide drawing of an unfinished picture: the outline again, quickly and a little off. */
function guidePass(P: Float32Array, A: Float32Array, line: Float32Array, size: number, c: RGB, weight: number, alpha: number, seed: number) {
  const U = size / 720, shift = 3 * U;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sx = Math.round(x + (vnoise(x / (30 * U), y / (30 * U), seed + 31) - 0.5) * 2 * shift + shift * 0.5);
      const sy = Math.round(y + (vnoise(x / (30 * U), y / (30 * U), seed + 32) - 0.5) * 2 * shift - shift * 0.4);
      if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
      const cover = clamp01(0.5 - (line[sy * size + sx] + 0.35 * weight));
      if (cover > 0) putRGB(P, A, y * size + x, c[0], c[1], c[2], cover * alpha);
    }
}

interface FillOptions {
  T: Tradition;
  mark: string;
  pigs: RGB[];
  BLACK: number;
  FIG: number;
  seed: number;
  bd: Float32Array;
  shade: Float32Array;
  nd: Float32Array | null;
  nlab: Int16Array | null;
  fd: Float32Array | null;
}
function paintFills(f: Frame, paint: Int16Array, P: Float32Array, A: Float32Array, o: FillOptions) {
  const { size, ids, nx, ny } = f;
  const { T, mark, pigs, BLACK, FIG, seed, bd, shade, nd, nlab, fd } = o;
  const U = size / 720;
  const vase = T === 'blackfigure' || T === 'redfigure';
  const cave = T === 'cave', dunhuang = T === 'dunhuang', redfigure = T === 'redfigure';
  const washed = mark === 'washed', dabbed = mark === 'dabbed', flat = mark === 'flat', unfinished = mark === 'unfinished';
  const misfire = hex('#8e3f20'), dilute = hex('#9a5226');
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const k = paint[p];
      if (k < 0) {
        // Dabbed pigment sprays a speckled halo past its edge.
        if (nd && nlab && nd[p] > 0 && nd[p] < 14 * U && nlab[p] >= 0) {
          const speck = 0.55 * vnoise(x / (1.7 * U), y / (1.7 * U), seed + 43) + 0.45 * hash(x, y, seed + 44);
          const c = pigs[nlab[p]];
          putRGB(P, A, p, c[0], c[1], c[2], 0.85 * Math.exp(-nd[p] / (3.2 * U)) * smooth(0.35, 0.75, speck));
        }
        continue;
      }
      const base = pigs[k];
      let r = base[0], g = base[1], b = base[2];
      let alpha = 0.96;
      let streak = 0.5;
      if (washed || unfinished) {
        // The brush runs along the face, across its slope.
        let tx = -ny[p], ty = -nx[p];
        const tl = Math.hypot(tx, ty);
        if (tl < 0.2) {
          tx = 0.8;
          ty = 0.6;
        } else {
          tx /= tl;
          ty /= tl;
        }
        streak = vnoise((x * tx + y * ty) / (50 * U), (-x * ty + y * tx) / (7 * U), seed + 45 + ids[p]);
      }
      if (flat) alpha = 0.97 - 0.07 * vnoise(x / (9 * U), y / (9 * U), seed + 41);
      else if (washed) alpha = vase ? 0.68 + 0.32 * streak : Math.min(1, 0.42 + 0.48 * streak + 0.24 * Math.exp(-bd[p] / (2.2 * U)));
      else if (dabbed) {
        if (vase) {
          // Patchy firing: the glaze went red-brown where the kiln breathed in.
          if (k === BLACK || (T === 'blackfigure' && k === 0)) {
            const patch = vnoise(x / (70 * U), y / (70 * U), seed + 49) * 0.65 + 0.35 * vnoise(x / (24 * U), y / (24 * U), seed + 50);
            const m = smooth(0.58, 0.72, patch) * (ids[p] >= 2 ? 0.7 : 0.5);
            r = mix(r, misfire[0], m);
            g = mix(g, misfire[1], m);
            b = mix(b, misfire[2], m);
          }
          alpha = 0.95;
        } else {
          const speck = 0.55 * vnoise(x / (1.7 * U), y / (1.7 * U), seed + 43) + 0.45 * hash(x, y, seed + 44);
          alpha = 0.5 + 0.5 * smooth(0.25, 0.7, speck);
        }
      } else alpha = 0.6 + 0.3 * streak;
      // Unfinished red-figure: the glaze was laid first as a broad band around each figure.
      if (fd && k === BLACK) alpha *= smooth(30 * U, 18 * U, fd[p] + (vnoise(x / (12 * U), y / (12 * U), seed + 51) - 0.5) * 16 * U);
      // Ragged, dry edges where pigment was rubbed into rock.
      if (cave || (dabbed && !vase)) alpha *= 0.35 + 0.65 * smooth(0, 3 * U, bd[p] + (vnoise(x / (4 * U), y / (4 * U), seed + 47) - 0.5) * 6 * U + U);
      const shadow = smooth(0.72, 0.22, shade[p]);
      if (cave && ids[p] >= 2) {
        const dark = 1 - 0.32 * shadow;
        r *= dark;
        g *= dark;
        b *= dark;
        // The cave painter cared for the animals, not the room: the set is only a rubbed tone.
        if (ids[p] < FIG) alpha *= 0.4;
      } else if (dunhuang && ids[p] >= 1) {
        // Relief shading: each area deepens toward its own outline.
        const m = 0.5 * Math.exp(-bd[p] / (6 * U)) + 0.2 * shadow;
        r = mix(r, r * 0.6, m);
        g = mix(g, g * 0.52, m);
        b = mix(b, b * 0.5, m);
      } else if (redfigure && k === 0 && ids[p] >= 2) {
        // A thin wash of dilute glaze where the form turns from the light.
        const m = 0.42 * shadow;
        r = mix(r, dilute[0], m);
        g = mix(g, dilute[1], m);
        b = mix(b, dilute[2], m);
      }
      putRGB(P, A, p, r, g, b, alpha);
    }
}

function paintLines(f: Frame, paint: Int16Array, line: Float32Array, cut: Float32Array | null, P: Float32Array, A: Float32Array, cave: boolean, ink: RGB, opacity: number, scratch: RGB, seed: number) {
  const { size } = f;
  const U = size / 720, N = size * size;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const r = line[p];
      const cover = clamp01(0.5 - r);
      if (cover <= 0) {
        // Charcoal leaves a fuzz of grains beside its stroke.
        if (cave && r < 3.5 * U && hash(x, y, seed + 51) < 0.16 * (1 - (r - 0.5) / (3 * U))) putRGB(P, A, p, ink[0], ink[1], ink[2], 0.55);
        continue;
      }
      let alpha = cover * opacity;
      if (cave) alpha *= (hash(x, y, seed + 53) < 0.08 ? 0.3 : 1) * (vnoise(x / (3 * U), y / (3 * U), seed + 55) > 0.66 ? 0.5 : 1);
      else alpha *= 0.9 + 0.1 * vnoise(x / (5 * U), y / (5 * U), seed + 57);
      putRGB(P, A, p, ink[0], ink[1], ink[2], alpha);
    }
  if (cut)
    // Incised through the black glaze to the clay beneath.
    for (let p = 0; p < N; p++) {
      const cover = clamp01(0.5 - cut[p]);
      if (cover > 0 && paint[p] >= 0) putRGB(P, A, p, scratch[0], scratch[1], scratch[2], cover * 0.94);
    }
}

interface SurfaceOptions {
  T: Tradition;
  mark: string;
  str: number;
  light: [number, number, number];
  walls: RGB[];
  seed: number;
}
/** The surface itself, and how paint pressed into it takes its light and grain. */
function buildSurface(size: number, o: SurfaceOptions) {
  const { T, mark, str, light, walls, seed } = o;
  const [lx, ly, lz] = light;
  const N = size * size, U = size / 720;
  const cave = T === 'cave', vase = T === 'blackfigure' || T === 'redfigure', dunhuang = T === 'dunhuang';
  // Big swells, smaller lumps and (on rock) a fine tooth.
  const height = field(size, (cave ? 115 : vase ? 200 : 110) * U, cave ? 4 : 3, seed + 61);
  const mid = field(size, (cave ? 30 : 24) * U, 3, seed + 62);
  const midWeight = cave ? 0.12 : vase ? 0.03 : 0.06;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      height[p] += mid[p] * midWeight + (cave ? vnoise(x / (4 * U), y / (4 * U), seed + 63) * 0.012 : (hash(x, y, seed + 64) - 0.5) * 0.0015);
    }
  const gain = { cave: mix(18, 52, str), egypt: mix(2, 24, str), blackfigure: mix(3, 18, str), redfigure: mix(3, 18, str), dunhuang: mix(3, 30, str) }[T] / U;
  const tone1 = field(size, 95 * U, 3, seed + 71), tone2 = field(size, 44 * U, 3, seed + 72);
  const W = new Float32Array(N * 3), shadeP = new Float32Array(N), dry = new Float32Array(N);
  // A vase is thrown on a wheel and seen on its curved body: shading and a gloss band by column.
  const u0 = 0.5 + 0.24 * Math.sign(lx || 1);
  const curveOf = new Float32Array(size).fill(1), specOf = new Float32Array(size), glossOf = new Float32Array(size);
  if (vase)
    for (let x = 0; x < size; x++) {
      const u = x / size;
      curveOf[x] = 0.66 + 0.34 * Math.cos((u - 0.5) * 2.3);
      specOf[x] = Math.exp(-(((u - u0) / 0.045) ** 2)) * 0.9 + Math.exp(-(((u - u0) / 0.17) ** 2)) * 0.18;
      glossOf[x] = Math.exp(-(((u - u0) / 0.035) ** 2)) * 0.8 + Math.exp(-(((u - u0) / 0.12) ** 2)) * 0.2;
    }
  const dryAmount = (cave ? ({ flat: 0.3, washed: 0.55, dabbed: 0.45, unfinished: 0.45 } as Record<string, number>)[mark] ?? 0.3 : T === 'egypt' ? 0.06 : dunhuang ? 0.14 : 0) * mix(0.5, 1.25, str);
  const [w0, w1, w2] = walls;
  const mottle = cave ? 0.5 : mix(0.35, 0.95, str);
  const patchOf = cave ? 0.42 : 0.4;
  const grainAmp = mix(0.03, cave ? 0.16 : 0.09, str);
  const reliefMix = cave ? 1 : 0.6;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const xl = x > 0 ? x - 1 : x, xr = x < size - 1 ? x + 1 : x, yu = y > 0 ? y - 1 : y, yd = y < size - 1 ? y + 1 : y;
      const hx = (height[y * size + xr] - height[y * size + xl]) * 0.5 * gain;
      const hy = (height[yd * size + x] - height[yu * size + x]) * 0.5 * gain;
      const d = (-hx * lx - hy * ly + lz) / Math.sqrt(hx * hx + hy * hy + 1);
      const relief = Math.min(1.35, Math.max(0.62, 1 + (d - lz) * 1.6));
      const t1 = smooth(0.36, 0.7, tone1[p]) * mottle;
      const t2 = (cave ? smooth(0.5, 0.72, tone2[p]) : smooth(0.55, 0.7, tone2[p])) * patchOf;
      let r = w0[0] + (w1[0] - w0[0]) * t1, g = w0[1] + (w1[1] - w0[1]) * t1, b = w0[2] + (w1[2] - w0[2]) * t1;
      r += (w2[0] - r) * t2;
      g += (w2[1] - g) * t2;
      b += (w2[2] - b) * t2;
      const h0 = hash(x, y, seed + 75);
      let grain = 1 + (h0 - 0.5) * grainAmp;
      if (cave && hash(x, y, seed + 76) < 0.015 * (0.5 + str)) grain *= 0.78;
      else if (dunhuang && hash(x >> 1, y, seed + 77) < 0.006) grain *= 0.85; // straw in the plaster
      if (vase) grain *= 1 + (vnoise(x / (300 * U), y / (2.3 * U), seed + 73) - 0.5) * 0.06 * mix(0.4, 1.4, str);
      const curve = curveOf[x], spec = specOf[x];
      const lightTerm = (1 + (relief - 1) * reliefMix) * curve * grain;
      W[p * 3] = r * lightTerm + spec * 22;
      W[p * 3 + 1] = g * lightTerm + spec * 20;
      W[p * 3 + 2] = b * lightTerm + spec * 18;
      // Paint soaked into the surface follows its light and grain.
      shadeP[p] = (cave ? relief * (0.85 + 0.15 * grain) : (1 + (relief - 1) * 0.5) * (0.97 + 0.03 * grain)) * curve;
      if (dryAmount > 0) {
        const peak = cave ? vnoise(x / (3.2 * U), y / (3.2 * U), seed + 79) * 0.6 + (height[p] - 0.5) * 0.88 + 0.2 : tone2[p] * 0.6 + h0 * 0.4;
        dry[p] = dryAmount * smooth(0.55, 0.78, peak);
      }
    }
  return { W, shadeP, dry, glossOf: vase ? glossOf : null };
}

function composite(size: number, W: Float32Array, shadeP: Float32Array, dry: Float32Array, P: Float32Array, A: Float32Array, glossOf: Float32Array | null): Float32Array {
  const N = size * size;
  const out = new Float32Array(N * 3);
  for (let p = 0; p < N; p++) {
    const f = 1 - dry[p];
    const k = A[p] * f;
    const s = shadeP[p] * f;
    out[p * 3] = W[p * 3] * (1 - k) + P[p * 3] * s;
    out[p * 3 + 1] = W[p * 3 + 1] * (1 - k) + P[p * 3 + 1] * s;
    out[p * 3 + 2] = W[p * 3 + 2] * (1 - k) + P[p * 3 + 2] * s;
    if (glossOf) {
      // The glaze shines where the body turns toward the light.
      const shine = glossOf[p % size] * A[p] * 46;
      out[p * 3] += shine;
      out[p * 3 + 1] += shine * 0.95;
      out[p * 3 + 2] += shine * 0.9;
    }
  }
  return out;
}

/** Flakes: the paint (and the skin of the surface) has come away. */
function flakePass(out: Float32Array, ids: Uint8Array, size: number, T: Tradition, frac: number, light: [number, number, number], beneath: RGB, seed: number) {
  const U = size / 720, N = size * size;
  const vase = T === 'blackfigure' || T === 'redfigure';
  const F = field(size, (vase ? 22 : T === 'dunhuang' ? 60 : 48) * U, 5, seed + 81, 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) F[y * size + x] += (hash(x >> 1, y >> 1, seed + 83) - 0.5) * 0.012;
  // Dunhuang's figures were protected; only the open ground flakes.
  const onlyOpen = T === 'dunhuang';
  const bins = new Uint32Array(1024);
  let total = 0;
  for (let p = 0; p < N; p += 3) {
    if (onlyOpen && ids[p] >= 2) continue;
    bins[Math.max(0, Math.min(1023, Math.floor(F[p] * 1024)))]++;
    total++;
  }
  let thr = 1;
  for (let b = 1023, seen = 0; b >= 0; b--) {
    seen += bins[b];
    if (seen > (N / 3) * frac || seen > total * 0.3) {
      thr = b / 1024;
      break;
    }
  }
  const sx = Math.round(light[0] * 3 * U), sy = Math.round(light[1] * 3 * U);
  // On rock a spall is only fresher, paler stone; elsewhere the layer beneath shows.
  const bare = T === 'cave' ? 0.35 : 1;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      if (onlyOpen && ids[p] >= 2) continue;
      const v = F[p];
      if (v > thr) {
        const q = Math.max(0, Math.min(size - 1, y + sy)) * size + Math.max(0, Math.min(size - 1, x + sx));
        const lip = F[q] <= thr || (onlyOpen && ids[q] >= 2);
        const k = (0.92 + 0.16 * hash(x >> 1, y >> 1, seed + 85)) * (lip ? 0.74 : 1);
        out[p * 3] = mix(out[p * 3], beneath[0], bare) * k;
        out[p * 3 + 1] = mix(out[p * 3 + 1], beneath[1], bare) * k;
        out[p * 3 + 2] = mix(out[p * 3 + 2], beneath[2], bare) * k;
      } else if (v > thr - 0.018) {
        out[p * 3] *= 0.86;
        out[p * 3 + 1] *= 0.86;
        out[p * 3 + 2] *= 0.86;
      }
    }
}

/** Soot from lamps and torches, rising in plumes and darkest at the top. */
function sootPass(out: Float32Array, size: number, amount: number, seed: number) {
  const U = size / 720;
  const plume = field(size, 60 * U, 3, seed + 87);
  for (let y = 0; y < size; y++) {
    const top = Math.pow(smooth(0.9, 0, y / size), 1.15);
    if (top <= 0) continue;
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      // Smoke climbs: tall streaks over a broad uneven stain.
      const rise = vnoise(x / (34 * U), y / (260 * U) - x / (900 * U), seed + 88);
      const k = clamp01(amount * top * clamp01(0.55 + 1.3 * (rise - 0.5) + 0.9 * (plume[p] - 0.5)));
      out[p * 3] *= 1 - k * 0.8;
      out[p * 3 + 1] *= 1 - k * 0.84;
      out[p * 3 + 2] *= 1 - k * 0.87;
    }
  }
}

/** Water seeping down the wall: runs with tide-line edges, rising damp and a salt bloom. */
function seepPass(out: Float32Array, size: number, wear: number, rnd: () => number, seed: number) {
  const U = size / 720;
  const runs = Math.round(4 + 8 * wear);
  const stain: RGB = [0.86, 0.84, 0.76];
  for (let r = 0; r < runs; r++) {
    const x0 = rnd() * size, y0 = rnd() * size * 0.35, length = size * (0.3 + 0.6 * rnd()), w = (6 + 16 * rnd()) * U;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(size, y0 + length); y++) {
      const t = (y - y0) / length;
      const cx = x0 + (vnoise(r * 7.3, y / (60 * U), seed + 89) - 0.5) * 24 * U;
      const ww = w * (0.55 + 0.6 * vnoise(r * 3.1, y / (30 * U), seed + 90)) * (0.4 + 0.6 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5 + 0.2));
      for (let x = Math.max(0, Math.floor(cx - ww - 2)); x <= Math.min(size - 1, Math.ceil(cx + ww + 2)); x++) {
        const e = Math.abs(x - cx) / ww;
        const p = y * size + x;
        if (e < 1) for (let c = 0; c < 3; c++) out[p * 3 + c] *= mix(1, stain[c], 0.9 * (1 - t * 0.5));
        if (e > 0.82 && e < 1.12) for (let c = 0; c < 3; c++) out[p * 3 + c] *= 0.86;
      }
    }
  }
  const tideY = size * (0.8 + 0.08 * rnd());
  const crust = field(size, 12 * U, 3, seed + 93);
  const salt: RGB = [241, 238, 228];
  for (let x = 0; x < size; x++) {
    const yLine = tideY + (vnoise(x / (50 * U), 1.5, seed + 91) - 0.5) * 34 * U;
    for (let y = Math.max(0, Math.floor(yLine - 50 * U)); y < size; y++) {
      const p = y * size + x;
      let k = y > yLine ? 0.9 : 1;
      if (Math.abs(y - yLine) < 1.6 * U) k *= 0.78;
      for (let c = 0; c < 3; c++) out[p * 3 + c] *= k;
      const bloom = smooth(yLine - 26 * U, yLine, y) * smooth(0.62, 0.74, crust[p] + 0.05 * wear) * (0.13 + 0.06 * hash(x, y, seed + 95));
      if (bloom > 0) for (let c = 0; c < 3; c++) out[p * 3 + c] = mix(out[p * 3 + c], salt[c], bloom);
    }
  }
}

/** Torchlight on the cave, fading on the fresco, and a last grain. */
function finishPass(out: Float32Array, size: number, cave: boolean, light: [number, number, number], desat: number, seed: number): Uint8ClampedArray {
  const N = size * size;
  const pixels = new Uint8ClampedArray(N * 4);
  const fcx = size * (0.5 + light[0] * 0.12), fcy = size * (0.5 + light[1] * 0.12);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      let r = out[p * 3], g = out[p * 3 + 1], b = out[p * 3 + 2];
      if (cave) {
        const k = 1 - 0.5 * smooth(0.5, 1.15, Math.hypot(x - fcx, y - fcy) / (size * 0.78));
        r *= k * 1.03;
        g *= k;
        b *= k * 0.95;
      }
      if (desat > 0) {
        const l = r * 0.3 + g * 0.59 + b * 0.11;
        r = mix(r, l, desat);
        g = mix(g, l, desat);
        b = mix(b, l, desat);
      }
      const n = (hash(x, y, seed + 111) - 0.5) * 5;
      pixels[p * 4] = r + n;
      pixels[p * 4 + 1] = g + n;
      pixels[p * 4 + 2] = b + n;
      pixels[p * 4 + 3] = 255;
    }
  return pixels;
}

/** Distance from every pixel to the nearest pixel passing `seedAt`, optionally carrying its paint. */
function distanceFrom(size: number, seedAt: (p: number) => boolean, paint: Int16Array | null) {
  const N = size * size;
  const d = new Float32Array(N).fill(1e4);
  const label = paint ? new Int16Array(N).fill(-1) : undefined;
  for (let p = 0; p < N; p++)
    if (seedAt(p)) {
      d[p] = 0;
      if (label && paint) label[p] = paint[p];
    }
  chamfer(d, size, label);
  return { d, label: label ?? null };
}

export default defineLook({
  questions: {
    tradition: choice('Which ancient tradition painted it?', {
      cave: 'A Palaeolithic cave wall: red and yellow ochre and charcoal soaked into bumpy limestone, ragged dry edges, forms reduced to outlines and fills, by torchlight.',
      egypt: 'An Egyptian tomb painting: flat registers on smooth plaster, flat mineral colours inside a fine dark outline, columns and bands of hieroglyphs.',
      blackfigure: 'A Greek black-figure vase: glossy black silhouettes on orange terracotta, details scratched through to the clay, purple-red and white touches, a meander border.',
      redfigure: 'A Greek red-figure vase: the figures left in warm terracotta on a black glaze ground, drawn in fine black relief line.',
      dunhuang: 'A Dunhuang cave fresco on the Silk Road: malachite green and lapis blue on earth red, an even iron-wire outline, faded colour and flaking plaster.',
    }),
    palette: choice('How many pigments did the painter have?', {
      sparse: 'Barely any: one colour and black on the bare surface, more drawing than painting.',
      earth: 'The plain earths: red and yellow ochre, soot black and chalk white, sober and warm.',
      mineral: 'The costly minerals too: malachite green, lapis or Egyptian blue, gold, purple and white where the tradition allows.',
    }),
    ground: choice('What is the bare surface like?', {
      pale: 'Pale: bare limestone, white gesso, buff clay or white plaster, bright and clean.',
      warm: 'Warm: ochre rock, yellow plaster, bright orange clay or earth-red plaster.',
      deep: 'Deep: smoke-darkened rock, grey-blue plaster, dark red clay or a dark green ground.',
    }),
    mark: choice('How was the colour laid on?', {
      flat: 'Even, opaque, careful fills with crisp edges: a master workshop at its best.',
      washed: 'Thin and uneven: brush streaks and pooled edges, the surface showing through.',
      dabbed: 'Dabbed, blown or blotchy: speckled soft edges, sprayed pigment or patchy firing.',
      unfinished: 'Left unfinished: guide lines and outlines everywhere, only some areas filled in.',
    }),
    outline: score('How heavy is the outline?', ['A hairline', 'Fine', 'Confident', 'Bold', 'Heavy and blunt']),
    surface: score('How strongly does the surface itself show?', ['Smooth and even', 'A light grain', 'Textured', 'Rough', 'Deeply rugged and pitted']),
    history: choice('What has happened to the wall since it was painted?', {
      sealed: 'Sealed in the dark since the day it was finished: colours fresh, edges clean.',
      flaking: 'Paint and plaster are flaking away in patches, showing the bare layer beneath.',
      soot: 'Lamps and torches have blackened it with smoke, darkest toward the top.',
      scratched: 'Later visitors scratched it: gouges, scrawled names and tally marks across the picture.',
      seeping: 'Water has seeped down it, leaving runs, tide lines and a white mineral crust.',
    }),
    border: choice('What frames or accompanies the picture?', {
      none: 'Nothing: the picture runs straight off into the bare surface.',
      bands: 'Plain painted bands or margins: ruled stripes, a register line, a glazed panel edge.',
      frieze: 'A patterned frieze: meander, rays, lotus bundles, scrolling vine, a hanging valance or rows of signs, as the tradition knows it.',
      writing: 'Writing or signs beside the picture: hieroglyph columns, a painted inscription, a donor cartouche, or stencilled hands.',
    }),
  },

  async apply(capture, a, context, signal) {
    const { size } = capture;
    const N = size * size;
    const U = size / 720;
    const seed = (context.seed * 7919 + 13) | 0;
    const rnd = seeded((context.seed ^ 0x5bd1e995) >>> 0);
    const mood = context.mood;
    const T = a.tradition as Tradition;
    const cave = T === 'cave';
    const vase = T === 'blackfigure' || T === 'redfigure';
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };

    // ── Colours ─────────────────────────────────────────────────────────────────────────────
    const walls = WALLS[T][a.ground as Ground].map(hex);
    for (const w of walls) {
      w[0] = Math.min(255, Math.max(0, w[0] + (mood.warmth - 0.5) * 10));
      w[2] = Math.min(255, Math.max(0, w[2] - (mood.warmth - 0.5) * 12));
    }
    const clay = walls[0];
    // Cheer keeps the pigments fresh; age sinks them toward the ground they were laid on.
    const fresh = 0.68 + 0.32 * mood.cheer;
    const fade = vase ? 0 : 0.05 + mood.wear * 0.2 + (T === 'dunhuang' ? 0.16 : 0);
    const pigment = (name: string): RGB => {
      if (name === CLAY) return [clay[0], clay[1], clay[2]];
      const c = hex(name);
      if (name === GLAZE) return c;
      const g = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      return mixRGB(mixRGB([g, g, g], c, fresh), walls[0], fade * 0.55);
    };
    const names = [...PIGMENTS[T][a.palette as Palette]];
    const count = names.length;
    const pigs = names.map(pigment);
    const BLACK = names.indexOf(GLAZE);
    const ink = hex(LINE[T]);

    // ── 1. Read the capture, wobble it by hand, simplify ────────────────────────────────────
    const source = readCapture(capture, cave);
    let FIG = 2;
    for (let p = 0; p < N; p += 7)
      if (source.id0[p] >= 3) {
        FIG = 3; // things are 3 and up; 2 is the world's own set (a plinth, walls, shelving)
        break;
      }
    const wobble = U * { cave: 3.4, egypt: 0.7, blackfigure: 1, redfigure: 1, dunhuang: 1.4 }[T] * (0.75 + 0.5 * mood.energy) * (a.mark === 'unfinished' ? 1.25 : 1);
    const frame = warpFrame(capture, source, wobble, cave, seed);
    const { ids } = frame;
    await pause();
    if (cave) {
      simplifyIds(ids, size, Math.round(4 * U), 2);
      await pause();
    }

    // ── 2. Match every surface to a pigment ─────────────────────────────────────────────────
    const labs = pigs.map((c) => oklab(c[0], c[1], c[2]));
    const wallLab = oklab(walls[0][0], walls[0][1], walls[0][2]);
    const bias = BIAS[T] ?? [];
    // A pigment that vanishes into the wall is a poor choice for a figure (white on Egyptian
    // plaster is allowed: linen was painted so, and the outline carries it).
    const reach = cave || T === 'dunhuang' ? 0.12 : T === 'egypt' ? 0.05 : 0;
    const cost = labs.map((l, t) => (bias[t] ?? 0) + Math.max(0, reach - Math.hypot(l[0] - wallLab[0], l[1] - wallLab[1], l[2] - wallLab[2])) * 2.5);
    let paint = assignPigments(frame, labs, cost, vase ? 0 : 0.03);
    paint = votePaint(paint, ids, size, cave ? Math.round(4 * U) : Math.max(1, Math.round(2 * U)), cave ? 2 : 1, count);
    consolidate(paint, ids, count, vase);
    // The ground and the backdrop stay the bare surface (the black glaze ground on red-figure).
    for (let p = 0; p < N; p++) if (ids[p] < 2) paint[p] = T === 'redfigure' ? BLACK : -1;
    // Unfinished: some areas were never filled; they keep their identity as outlined shapes (-2 - k).
    // A thing the model was unsure of stays a sketch in every finish.
    const unfinished = a.mark === 'unfinished';
    const doubt = (id: number) => id >= 3 && (capture.confidence?.[id] ?? 1) < 0.45;
    if (T !== 'redfigure')
      for (let p = 0; p < N; p++) {
        const k = paint[p];
        if (k >= 0 && ((unfinished && hash(ids[p], k, seed + 91) > (T === 'egypt' ? 0.55 : 0.5)) || doubt(ids[p]))) paint[p] = -2 - k;
      }
    await pause();

    // ── 3. Outlines, incisions and the distance to every edge ───────────────────────────────
    const weight = U * { cave: mix(0.9, 3.6, a.outline), egypt: mix(0.45, 1.7, a.outline), blackfigure: mix(0.6, 2, a.outline), redfigure: mix(0.45, 1.6, a.outline), dunhuang: mix(0.6, 2.2, a.outline) }[T];
    const { line, cut, bd } = findEdges(frame, paint, { T, FIG, BLACK, weight, cutWeight: U * mix(0.4, 1.05, a.outline), wear: mood.wear, seed });
    await pause();
    const shade = cave || T === 'dunhuang' || T === 'redfigure' ? blurWithin(frame.lit, ids, size, Math.round(8 * U)) : frame.lit;
    const dabbed = a.mark === 'dabbed';
    const near = dabbed && !vase ? distanceFrom(size, (p) => paint[p] >= 0 && ids[p] >= 1, paint) : null;
    const band = unfinished && T === 'redfigure' ? distanceFrom(size, (p) => paint[p] !== BLACK, null).d : null;
    await pause();

    // ── 4. The paint layer (premultiplied colour and coverage) ─────────────────────────────
    const P = new Float32Array(N * 3);
    const A = new Float32Array(N);
    const put = (p: number, c: RGB, alpha: number) => putRGB(P, A, p, c[0], c[1], c[2], alpha);

    // Figures on the bare surface: where they are, and where there is room beside them.
    let bx0 = size, bx1 = 0, by0 = size, by1 = 0;
    for (let y = 0; y < size; y += 2)
      for (let x = 0; x < size; x += 2)
        if (source.id0[y * size + x] >= FIG) {
          if (x < bx0) bx0 = x;
          if (x > bx1) bx1 = x;
          if (y < by0) by0 = y;
          if (y > by1) by1 = y;
        }
    if (bx1 < bx0) [bx0, bx1, by0, by1] = [size * 0.3, size * 0.7, size * 0.3, size * 0.7];
    const busy = (x0: number, y0: number, w: number, h: number, set = false) => {
      let n = 0, hit = 0;
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(size, y0 + h); y += 3)
        for (let x = Math.max(0, Math.floor(x0)); x < Math.min(size, x0 + w); x += 3) {
          n++;
          const id = source.id0[y * size + x];
          if (id >= FIG || (set && id === 2)) hit++;
        }
      return n ? hit / n : 1;
    };

    if (unfinished) {
      const guide = hex(GUIDE[T]);
      if (T === 'egypt') {
        // The painter's proportion grid, still showing.
        const cell = Math.max(12 * U, (by1 - by0) / 14);
        const gx0 = bx0 - cell, gx1 = bx1 + cell, gy0 = by0 - cell, gy1 = by1 + cell * 0.5;
        for (let y = Math.max(0, Math.floor(gy0)); y < Math.min(size, gy1); y++) {
          const v = (y - gy0) % cell;
          const rowLine = Math.min(v, cell - v) < 0.6 * U;
          for (let x = Math.max(0, Math.floor(gx0)); x < Math.min(size, gx1); x++) {
            const u = (x - gx0) % cell;
            if (rowLine || Math.min(u, cell - u) < 0.6 * U) put(y * size + x, guide, 0.3);
          }
        }
      }
      guidePass(P, A, line, size, guide, weight, cave ? 0.4 : 0.55, seed);
    }
    paintFills(frame, paint, P, A, { T, mark: a.mark, pigs, BLACK, FIG, seed, bd, shade, nd: near?.d ?? null, nlab: near?.label ?? null, fd: band });
    await pause();
    paintLines(frame, paint, line, cut, P, A, cave, ink, 0.95 - mood.wear * 0.1, mixRGB(clay, [250, 228, 200], 0.18), seed);
    await pause();

    // ── 5. Drawing tools for borders, writing and signs ─────────────────────────────────────
    const span = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, c: RGB, alpha = 1, dry = 0) => {
      const pad = Math.max(w0, w1) + 1;
      const ax = Math.max(0, Math.floor(Math.min(x0, x1) - pad)), bx = Math.min(size - 1, Math.ceil(Math.max(x0, x1) + pad));
      const ay = Math.max(0, Math.floor(Math.min(y0, y1) - pad)), by = Math.min(size - 1, Math.ceil(Math.max(y0, y1) + pad));
      const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
      for (let y = ay; y <= by; y++)
        for (let x = ax; x <= bx; x++) {
          const t = clamp01(((x - x0) * dx + (y - y0) * dy) / len2);
          let cover = clamp01(mix(w0, w1, t) - Math.hypot(x - x0 - dx * t, y - y0 - dy * t) + 0.5);
          if (cover <= 0) continue;
          if (dry > 0) cover *= 1 - dry * (hash(x, y, seed + 97) < 0.3 ? 0.75 : 0);
          put(y * size + x, c, cover * alpha);
        }
    };
    const polyline = (pts: number[], w: number, c: RGB, alpha = 1, dry = 0) => {
      for (let i = 0; i + 3 < pts.length; i += 2) span(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], w, w, c, alpha, dry);
    };
    const insidePoly = (pts: number[], px: number, py: number) => {
      let c = false;
      for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
        const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const poly = (pts: number[], c: RGB, alpha = 1) => {
      let ax = Infinity, bx = -Infinity, ay = Infinity, by = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        ax = Math.min(ax, pts[i]);
        bx = Math.max(bx, pts[i]);
        ay = Math.min(ay, pts[i + 1]);
        by = Math.max(by, pts[i + 1]);
      }
      for (let y = Math.max(0, Math.floor(ay)); y <= Math.min(size - 1, Math.ceil(by)); y++)
        for (let x = Math.max(0, Math.floor(ax)); x <= Math.min(size - 1, Math.ceil(bx)); x++) {
          let n = 0;
          if (insidePoly(pts, x + 0.25, y + 0.25)) n++;
          if (insidePoly(pts, x + 0.75, y + 0.25)) n++;
          if (insidePoly(pts, x + 0.25, y + 0.75)) n++;
          if (insidePoly(pts, x + 0.75, y + 0.75)) n++;
          if (n) put(y * size + x, c, (alpha * n) / 4);
        }
    };
    const rect = (x0: number, y0: number, w: number, h: number, c: RGB, alpha = 1) => {
      for (let y = Math.max(0, Math.round(y0)); y < Math.min(size, Math.round(y0 + h)); y++)
        for (let x = Math.max(0, Math.round(x0)); x < Math.min(size, Math.round(x0 + w)); x++) put(y * size + x, c, alpha);
    };
    const disc = (cx: number, cy: number, r: number, c: RGB, alpha = 1, blotch = 0) => {
      for (let y = Math.max(0, Math.floor(cy - r - 2)); y <= Math.min(size - 1, Math.ceil(cy + r + 2)); y++)
        for (let x = Math.max(0, Math.floor(cx - r - 2)); x <= Math.min(size - 1, Math.ceil(cx + r + 2)); x++) {
          const d = Math.hypot(x - cx, y - cy) + (blotch ? (vnoise(x / (1.6 * U), y / (1.6 * U), seed + 99) - 0.5) * blotch : 0);
          const cover = clamp01(r - d + 0.5);
          if (cover > 0) put(y * size + x, c, cover * alpha * (blotch ? 0.75 + 0.25 * hash(x, y, seed + 98) : 1));
        }
    };
    const glyph = (prims: Prim[], cx: number, cy: number, s: number, lineC: RGB, fillC: RGB, w: number) => {
      const X = (u: number) => cx + (u - 0.5) * s, Y = (v: number) => cy + (v - 0.5) * s;
      const map = (pts: number[]) => pts.map((v, i) => (i % 2 === 0 ? X(v) : Y(v)));
      for (const prim of prims) {
        if (prim[0] === 'l') polyline(map(prim[1]), w * (prim[2] ?? 1), lineC);
        else if (prim[0] === 'o') polyline(map(ell(prim[1], prim[2], prim[3], prim[4], 0, Math.PI * 2, 20)), w, lineC);
        else if (prim[0] === 'd') disc(X(prim[1]), Y(prim[2]), prim[3] * s, lineC);
        else {
          const pts = map(prim[0] === 'e' ? ell(prim[1], prim[2], prim[3], prim[4]) : prim[1]);
          poly(pts, fillC);
          if (fillC !== lineC) polyline([...pts, pts[0], pts[1]], w * 0.55, lineC);
        }
      }
    };
    const pick = <V,>(list: readonly V[]) => list[Math.floor(rnd() * list.length) % list.length];
    const notes: string[] = [];

    // ── 6. Borders and writing, per tradition ───────────────────────────────────────────────
    const border = a.border;
    if (T === 'egypt') {
      const red = pigment('#b8322a'), blue = pigment('#2a58a8'), yellow = pigment('#e2b13a'), green = pigment('#2e8a55');
      const white = pigment('#f4ecd8'), black = pigment('#231a14'), ochre = pigment('#a83c26');
      const blockColours = a.palette === 'mineral' ? [blue, red, green, yellow] : a.palette === 'earth' ? [ochre, yellow, black, ochre] : [ochre, yellow];
      const glyphFills = a.palette === 'mineral' ? [blue, green, red, blue] : a.palette === 'earth' ? [ochre, ink, ink] : [ink];
      const blocks = (y0: number, h: number) => {
        rect(0, y0, size, h, white);
        const w = 20 * U, gap = 4 * U;
        let i = 0;
        for (let x = -rnd() * w; x < size; x += w + gap, i++) {
          rect(x, y0 + 2.5 * U, w, h - 5 * U, blockColours[i % blockColours.length]);
          rect(x - 1.1 * U, y0 + 2.5 * U, 1.1 * U, h - 5 * U, black);
        }
        rect(0, y0, size, 1.6 * U, black);
        rect(0, y0 + h - 1.6 * U, size, 1.6 * U, black);
      };
      const dado = (y0: number) => {
        rect(0, y0, size, 4 * U, yellow);
        rect(0, y0 + 4 * U, size, 3 * U, ochre);
        rect(0, y0 + 7 * U, size, 2.5 * U, white);
        rect(0, y0 + 9.5 * U, size, size - y0, black);
        rect(0, y0, size, 1.2 * U, black);
      };
      const kheker = (y0: number, h: number) => {
        const w = 17 * U;
        let i = 0;
        for (let x = -rnd() * w; x < size + w; x += w, i++) {
          const c = blockColours[i % blockColours.length];
          const cx = x + w / 2;
          poly([cx - w * 0.16, y0 + h, cx + w * 0.16, y0 + h, cx + w * 0.16, y0 + h * 0.6, cx + w * 0.4, y0 + h * 0.38, cx + w * 0.2, y0 + h * 0.2, cx - w * 0.2, y0 + h * 0.2, cx - w * 0.4, y0 + h * 0.38, cx - w * 0.16, y0 + h * 0.6], c);
          polyline([cx - w * 0.16, y0 + h, cx - w * 0.16, y0 + h * 0.6, cx - w * 0.4, y0 + h * 0.38, cx - w * 0.2, y0 + h * 0.2, cx + w * 0.2, y0 + h * 0.2, cx + w * 0.4, y0 + h * 0.38, cx + w * 0.16, y0 + h * 0.6, cx + w * 0.16, y0 + h], 0.6 * U, black);
          disc(cx, y0 + h * 0.12, w * 0.17, c);
          polyline(ell(cx, y0 + h * 0.12, w * 0.17, w * 0.17), 0.55 * U, black);
        }
      };
      let glyphNo = Math.floor(rnd() * HIEROGLYPHS.length);
      const nextGlyph = () => HIEROGLYPHS[(glyphNo = (glyphNo + 1 + Math.floor(rnd() * 4)) % HIEROGLYPHS.length)];
      const write = (cx: number, cy: number, s: number, i: number) => glyph(nextGlyph(), cx, cy, s, ink, glyphFills[i % glyphFills.length], Math.max(0.8, s * 0.055));
      const column = (x0: number, y0: number, y1: number, cw: number, divider: RGB) => {
        // Glyphs stack down between ruled lines; a cell that would cross a figure is left out.
        let i = 0, written = 0;
        for (let y = y0; y + cw <= y1; y += cw * 1.02, i++) {
          if (busy(x0 - 2 * U, y, cw + 4 * U, cw * 1.02, true) > 0.03) continue;
          rect(x0, y, 1.2 * U, cw * 1.02, divider);
          rect(x0 + cw, y, 1.2 * U, cw * 1.02, divider);
          write(x0 + cw / 2 + 0.6 * U, y + cw * 0.52, cw * 0.8, i);
          written++;
        }
        return written;
      };
      const divider = a.palette === 'mineral' ? blue : black;
      let top = 0, bottom = size;
      if (border !== 'none') {
        if (border === 'frieze') {
          kheker(0, 40 * U);
          blocks(40 * U, 16 * U);
          top = 56 * U;
        } else {
          blocks(0, 18 * U);
          top = 18 * U;
        }
        dado(size - 36 * U);
        bottom = size - 36 * U;
      }
      if (border === 'frieze') {
        // A horizontal band of signs under the frieze.
        const h = 30 * U;
        rect(0, top + h, size, 1.2 * U, divider);
        let i = 0;
        for (let x = 6 * U + rnd() * 10 * U; x < size - h; x += h * 1.05, i++) if (busy(x, top, h, h, true) < 0.04) write(x + h / 2, top + h / 2 + 1.5 * U, h * 0.78, i);
        top += h;
      }
      const roomLeft = bx0, roomRight = size - bx1;
      const leftSide = roomLeft >= roomRight;
      if (border === 'writing') {
        const cw = 30 * U;
        const cols = Math.max(2, Math.min(5, Math.floor((leftSide ? roomLeft : roomRight) / cw) - 1));
        const x0 = leftSide ? Math.max(8 * U, bx0 - cols * cw - 10 * U) : Math.min(size - 8 * U - cols * cw, bx1 + 10 * U);
        for (let c = 0; c < cols; c++) column(x0 + c * cw, top + 8 * U, bottom - 10 * U, cw, divider);
        notes.push(`${cols} columns of hieroglyphs`);
      } else {
        // A caption beside the main figure, as every tomb figure is named.
        const cw = (border === 'none' ? 36 : 32) * U;
        const x0 = leftSide ? Math.max(6 * U, bx0 - cw - 8 * U) : Math.min(size - 6 * U - cw, bx1 + 8 * U);
        const y0 = Math.max(top + 8 * U, by0 - 10 * U);
        column(x0, y0, Math.min(bottom - 8 * U, y0 + cw * (3 + Math.floor(rnd() * 3)) * 1.02 + 6 * U), cw, divider);
        notes.push(border === 'none' ? 'a hieroglyph caption' : border === 'frieze' ? 'a lotus-bundle frieze and a band of signs' : 'block borders and a register dado');
      }
    } else if (vase) {
      const glaze = pigs[BLACK];
      const purple = pigment('#8a2a37'), white = pigment('#f3e6cf');
      const meander = (y0: number, h: number, c: RGB, back: RGB) => {
        rect(0, y0, size, h, back);
        const k = (h - 7 * U) / 46, period = 60 * k, w = Math.max(1, 3.4 * k);
        rect(0, y0, size, 1.8 * U, c);
        rect(0, y0 + h - 1.8 * U, size, 1.8 * U, c);
        const oy = y0 + 3.5 * U;
        for (let x0 = -rnd() * period; x0 < size; x0 += period) {
          const pts = [4, 46, 4, 0, 50, 0, 50, 34, 18, 34, 18, 14, 36, 14, 36, 22].map((v, i) => (i % 2 === 0 ? x0 + v * k : oy + v * k));
          polyline(pts, w, c);
          span(x0 + 4 * k, oy + 46 * k, x0 + 64 * k, oy + 46 * k, w, w, c);
        }
      };
      const rays = (yBase: number, h: number, c: RGB) => {
        const w = h * 0.55;
        for (let x = -rnd() * w; x < size; x += w * 1.12) poly([x, yBase, x + w / 2, yBase - h, x + w, yBase], c);
        rect(0, yBase, size, size - yBase, c);
      };
      const letters = (word: string, x: number, y: number, h: number, c: RGB, vertical: boolean) => {
        const w = Math.max(0.9 * U, h * 0.085);
        let i = 0;
        for (const ch of word) {
          const lh = h * (0.88 + rnd() * 0.18);
          const cx = vertical ? x : x + i * h * 0.78;
          const cy = (vertical ? y + i * h * 1.15 : y) + (rnd() - 0.5) * h * 0.08;
          i++;
          if (ch === 'Ο') {
            polyline(ell(cx + lh * 0.3, cy + lh * 0.5, lh * 0.16, lh * 0.16, 0, Math.PI * 2, 12), w, c);
            continue;
          }
          for (const stroke of LETTERS[ch] ?? []) polyline(stroke.map((v, j) => (j % 2 === 0 ? cx + v * lh * 0.62 : cy + v * lh)), w, c);
        }
      };
      const onBlack = T === 'redfigure';
      if (border === 'bands') {
        if (onBlack) {
          rect(0, 14 * U, size, 3 * U, clay);
          rect(0, 22 * U, size, 1.6 * U, clay);
          rect(0, size - 30 * U, size, 5 * U, clay);
        } else {
          // A panel amphora: the picture is a reserved window in a black body.
          const mx = 30 * U, my = 40 * U, mb = 48 * U;
          rect(0, 0, mx, size, glaze);
          rect(size - mx, 0, mx, size, glaze);
          rect(0, 0, size, my, glaze);
          rect(0, size - mb, size, mb, glaze);
          rect(mx - 6 * U, my - 6 * U, size - 2 * mx + 12 * U, 2 * U, purple);
          rect(mx - 6 * U, size - mb + 4 * U, size - 2 * mx + 12 * U, 2 * U, purple);
        }
        notes.push(onBlack ? 'reserved bands' : 'a reserved panel in the black body');
      } else if (border === 'frieze') {
        meander(8 * U, 32 * U, glaze, clay);
        if (onBlack) meander(size - 42 * U, 30 * U, glaze, clay);
        else {
          rect(0, size - 64 * U, size, 2 * U, glaze);
          rays(size - 20 * U, 34 * U, glaze);
        }
        notes.push(onBlack ? 'meander bands above and below' : 'a meander above and rays below');
      } else if (border === 'writing') {
        const word = pick(WORDS), h = 22 * U;
        const textC = onBlack && !unfinished ? pigment('#c8673e') : glaze;
        const horizontal = by0 > 70 * U && bx1 - bx0 > word.length * h * 0.78;
        if (horizontal) letters(word, bx0 + 6 * U, by0 - 36 * U, h, textC, false);
        else {
          const x = bx0 > size - bx1 ? Math.max(10 * U, bx0 - 30 * U) : Math.min(size - 24 * U, bx1 + 16 * U);
          letters(word, x, Math.max(16 * U, by0), h, textC, true);
        }
        rect(0, size - 26 * U, size, 3 * U, onBlack ? clay : glaze);
        notes.push(`painted inscription ${word}`);
      }
      if (!onBlack && a.palette === 'mineral' && border !== 'none') for (let x = 8 * U; x < size; x += 13 * U) disc(x, size - 10 * U, 1.8 * U, white);
    } else if (T === 'dunhuang') {
      const green = pigment('#3f8f6e'), pale = pigment('#6ab08e'), lapis = pigment('#2f5f8f'), white = pigment('#ecdfc4');
      const red = pigment('#a5452f'), dark = pigment('#7a3020'), gold = pigment('#d8b05a');
      const accents = a.palette === 'mineral' ? [green, lapis, white, red, pale] : a.palette === 'earth' ? [dark, white, gold, red] : [green, white, red];
      const stripes = (y0: number, list: [RGB, number][], down = true) => {
        let y = y0;
        for (const [c, h] of list) {
          rect(0, down ? y : y - h * U, size, h * U, c);
          y += down ? h * U : -h * U;
        }
      };
      if (border === 'bands' || border === 'writing') {
        stripes(0, [[dark, 6], [accents[0], 8], [white, 3], [accents[1], 5]]);
        stripes(size, [[dark, 8], [accents[0], 7], [white, 3]], false);
        for (let x = 6 * U; x < size; x += 12 * U) disc(x, 15.5 * U, 1.2 * U, red);
      }
      if (border === 'frieze') {
        // A hanging valance along the top.
        rect(0, 0, size, 12 * U, dark);
        const w = 28 * U, h = 24 * U;
        let i = 0;
        for (let x = -rnd() * w; x < size; x += w, i++) {
          poly([x, 12 * U, x + w, 12 * U, x + w / 2, 12 * U + h], accents[i % accents.length]);
          polyline([x, 12 * U, x + w / 2, 12 * U + h, x + w, 12 * U], 0.8 * U, ink);
          disc(x + w / 2, 12 * U + h + 2.5 * U, 2.2 * U, gold);
        }
        // A scrolling vine along the foot.
        const h2 = 34 * U, y0 = size - h2;
        rect(0, y0, size, h2, dark);
        rect(0, y0, size, 2 * U, gold);
        const period = 64 * U;
        const stem: number[] = [];
        for (let x = 0; x <= size; x += 3 * U) stem.push(x, y0 + h2 / 2 + Math.sin((x / period) * Math.PI * 2) * h2 * 0.22);
        polyline(stem, 1.6 * U, accents[0]);
        for (let x = period / 4, j = 0; x < size; x += period / 2, j++) {
          const up = j % 2 === 0 ? -1 : 1;
          const cy = y0 + h2 / 2 + up * h2 * 0.22;
          const curl: number[] = [];
          for (let t = 0; t < 1; t += 0.06) {
            const ang = t * Math.PI * 2.2, r = h2 * 0.22 * (1 - t * 0.8);
            curl.push(x + Math.cos(ang) * r * 1.2, cy + up * (h2 * 0.04 + Math.sin(ang) * r * 0.9));
          }
          polyline(curl, 1.3 * U, white);
          poly(ell(x + period * 0.12, cy - up * h2 * 0.18, 5 * U, 2.4 * U), accents[(j + 1) % accents.length]);
        }
        notes.push('a hanging valance and a scrolling vine');
      }
      if (border === 'writing') {
        // A donor's cartouche in a quiet margin.
        const w = 40 * U, h = Math.min(size * 0.42, 220 * U);
        const left = bx0 > size - bx1;
        const x0 = left ? Math.max(14 * U, bx0 - w - 18 * U) : Math.min(size - w - 14 * U, bx1 + 18 * U);
        const y0 = Math.max(30 * U, Math.min(by0, size - h - 40 * U));
        rect(x0, y0, w, h, a.palette === 'mineral' ? pale : pigment('#e6d39a'));
        polyline([x0, y0, x0 + w, y0, x0 + w, y0 + h, x0, y0 + h, x0, y0], 1.3 * U, dark);
        const s = 22 * U;
        const c = pigment('#2a1d18');
        for (let cy = y0 + s * 0.75; cy < y0 + h - s * 0.5; cy += s * 1.1) {
          const cx = x0 + w / 2, hh = s / 2, cw = Math.max(0.9 * U, s * 0.075);
          const bars = 1 + Math.floor(rnd() * 3), posts = 1 + Math.floor(rnd() * 2);
          for (let i = 0; i < bars; i++) {
            const yy = cy - hh * 0.85 + ((i + 0.5 + (rnd() - 0.5) * 0.4) / bars) * s * 0.8;
            const half = hh * (0.45 + 0.5 * rnd()), shift = (rnd() - 0.5) * hh * 0.3;
            span(cx + shift - half, yy + hh * 0.06, cx + shift + half, yy - hh * 0.06, cw * 0.75, cw * 1.1, c);
          }
          for (let i = 0; i < posts; i++) {
            const xx = cx + (rnd() - 0.5) * s * 0.6;
            span(xx, cy - hh * (0.5 + 0.5 * rnd()), xx + (rnd() - 0.5) * 2, cy + hh * (0.4 + 0.6 * rnd()), cw * 1.15, cw * 0.6, c);
          }
          if (rnd() < 0.6) span(cx - hh * 0.1, cy - hh * 0.1, cx - hh * 0.9, cy + hh * 0.9, cw * 1.1, cw * 0.3, c);
          if (rnd() < 0.55) span(cx + hh * 0.1, cy, cx + hh * 0.9, cy + hh * 0.9, cw * 0.45, cw * 1.3, c);
        }
        notes.push("a donor's cartouche");
      } else if (border === 'bands') notes.push('painted stripe borders');
      // Faded rosettes scattered over the open ground.
      if (a.palette !== 'sparse') {
        const want = Math.round(4 + mood.density * 10);
        for (let i = 0, tries = 0; i < want && tries < 80; tries++) {
          const r = (7 + rnd() * 6) * U;
          const x = mix(r + 20 * U, size - r - 20 * U, rnd()), y = mix(60 * U, size - 60 * U, rnd());
          if (busy(x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2, true) > 0) continue;
          i++;
          const petal = accents[Math.floor(rnd() * accents.length)];
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2 + rnd() * 0.3;
            disc(x + Math.cos(ang) * r * 0.62, y + Math.sin(ang) * r * 0.62, r * 0.36, petal, 0.7);
          }
          disc(x, y, r * 0.3, gold, 0.8);
        }
      }
    } else {
      // Cave: dots, signs, stencilled hands.
      const red = pigment('#9c3520'), black = pigment('#21150d');
      const colours = a.palette === 'sparse' ? [red, black] : [red, black, pigment('#c9772f')];
      const sign = (kind: number, x: number, y: number, s: number, c: RGB) => {
        const w = 2.4 * U;
        if (kind === 0) {
          polyline([x - s / 2, y, x, y - s * 0.45, x + s / 2, y], w, c, 0.9, 0.5);
          for (const dx of [-s / 3, 0, s / 3]) span(x + dx, y, x + dx, y + s * 0.4, w, w, c, 0.9, 0.5);
        } else if (kind === 1) {
          for (const dx of [0, s * 0.3]) polyline([x + dx + s * 0.2, y - s * 0.35, x + dx - s * 0.2, y, x + dx + s * 0.2, y + s * 0.35], w, c, 0.9, 0.5);
        } else if (kind === 2) {
          span(x, y - s / 2, x, y + s / 2, w * 1.2, w * 0.9, c, 0.9, 0.5);
          disc(x + s * 0.14, y - s * 0.15, s * 0.13, c, 0.9, 2 * U);
        } else if (kind === 3) {
          span(x - s * 0.2, y - s / 2, x - s * 0.2, y + s / 2, w, w, c, 0.9, 0.5);
          span(x + s * 0.2, y - s / 2, x + s * 0.2, y + s / 2, w, w, c, 0.9, 0.5);
          for (let r = -0.3; r <= 0.31; r += 0.3) span(x - s * 0.2, y + r * s, x + s * 0.2, y + r * s, w * 0.9, w * 0.9, c, 0.9, 0.5);
        } else for (let i = 0; i < 5; i++) disc(x + (rnd() - 0.5) * s, y + (rnd() - 0.5) * s * 0.6, (3.5 + rnd() * 2) * U, c, 0.9, 2.5 * U);
      };
      const hand = (cx: number, cy: number, s: number, angle: number, c: RGB) => {
        const fingers = [[-0.36, 0.0, -0.72, 0.36], [-0.17, 0.36, -0.24, 0.98], [0.02, 0.4, 0.04, 1.06], [0.19, 0.36, 0.28, 0.96], [0.33, 0.2, 0.5, 0.74]];
        const ca = Math.cos(angle), sa = Math.sin(angle);
        const capsule = (px: number, py: number, f: number[], r: number) => {
          const dx = f[2] - f[0], dy = f[3] - f[1];
          const t = clamp01(((px - f[0]) * dx + (py - f[1]) * dy) / (dx * dx + dy * dy));
          return Math.hypot(px - f[0] - dx * t, py - f[1] - dy * t) - r;
        };
        const R = s * 1.45;
        for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(size - 1, Math.ceil(cy + R)); y++)
          for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(size - 1, Math.ceil(cx + R)); x++) {
            const ox = (x - cx) / s, oy = (y - cy) / s;
            const lx = ox * ca + oy * sa, ly = -(-ox * sa + oy * ca);
            let d = (Math.hypot(lx / 0.36, (ly - 0.02) / 0.42) - 1) * 0.36;
            for (const f of fingers) d = Math.min(d, capsule(lx, ly, f, 0.085));
            d = Math.min(d, capsule(lx, ly, [0, -0.3, 0, -0.95], 0.2));
            if (d < 0) continue;
            const spray = Math.exp(-d / 0.32) * smooth(1.45, 0.75, Math.hypot(ox, oy));
            const speck = 0.5 * hash(x, y, seed + 101) + 0.5 * vnoise(x / (2 * U), y / (2 * U), seed + 102);
            put(y * size + x, c, spray * (0.35 + 0.65 * speck));
          }
      };
      const spots = (want: number, r: number) => {
        const chosen: [number, number][] = [];
        for (let t = 0; t < 160 && chosen.length < want; t++) {
          const x = mix(r + 8 * U, size - r - 8 * U, rnd()), y = mix(r + 8 * U, size - r - 8 * U, rnd());
          if (busy(x - r, y - r, 2 * r, 2 * r, true) > 0.04) continue;
          if (chosen.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < 2.1 * r)) continue;
          chosen.push([x, y]);
        }
        return chosen;
      };
      if (border === 'bands') {
        const rows = 1 + Math.floor(rnd() * 2);
        for (let row = 0; row < rows; row++) {
          const y = size - (26 + row * 18) * U;
          for (let x = 20 * U + rnd() * 14 * U; x < size - 20 * U; x += (16 + rnd() * 8) * U)
            if (busy(x - 8 * U, y - 8 * U, 16 * U, 16 * U) < 0.05) disc(x, y + (rnd() - 0.5) * 6 * U, (4.5 + rnd() * 2.5) * U, row === 0 ? colours[0] : colours[1], 0.9, 3 * U);
        }
        notes.push('rows of finger dots');
      } else if (border === 'frieze') {
        const s = 40 * U;
        for (const [x, y] of spots(7 + Math.round(mood.density * 5), s * 0.7)) sign(Math.floor(rnd() * 5), x, y, s, pick(colours));
        notes.push('painted signs');
      } else if (border === 'writing') {
        const s = 50 * U;
        const placed = spots(2 + Math.round(mood.density * 3), s * 1.3);
        placed.forEach(([x, y], i) => hand(x, y, s, (rnd() - 0.5) * 0.9, i % 3 === 2 ? colours[1] : colours[0]));
        notes.push(`${placed.length} stencilled hands`);
      }
    }
    await pause();

    // ── 7. The surface, and the paint pressed into it ───────────────────────────────────────
    // A cave is lit by a torch held near the wall: the rock is seen in a softer, more frontal light.
    let lx = capture.light[0], ly = capture.light[1], lz = Math.max(cave ? 0.75 : 0.35, Math.abs(capture.light[2]));
    {
      const l = Math.hypot(lx, ly, lz) || 1;
      lx /= l;
      ly /= l;
      lz /= l;
    }
    const light: [number, number, number] = [lx, ly, lz];
    const surface = buildSurface(size, { T, mark: a.mark, str: a.surface, light, walls, seed });
    await pause();
    const out = composite(size, surface.W, surface.shadeP, surface.dry, P, A, surface.glossOf);
    await pause();

    // ── 8. What happened to it since ───────────────────────────────────────────────────────
    const wear = mood.wear;
    const history = a.history;
    const beneath = hex(BENEATH[T]);
    // A scratch or crack: a pale gouge (or a dark hairline) with a dark lip away from the light.
    const gouge = (x0: number, y0: number, x1: number, y1: number, pale: number, shadow: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.ceil(len * 2);
      const px = -(y1 - y0) / (len || 1), py = (x1 - x0) / (len || 1);
      const side = px * lx + py * ly > 0 ? -1 : 1;
      for (let i = 0; i <= steps; i++) {
        const x = Math.round(mix(x0, x1, i / steps)), y = Math.round(mix(y0, y1, i / steps));
        if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) continue;
        const p = y * size + x;
        for (let c = 0; c < 3; c++) out[p * 3 + c] = pale > 0 ? mix(out[p * 3 + c], beneath[c], pale) : out[p * 3 + c] * (1 + pale);
        if (shadow > 0) {
          const q = (y + Math.round(py * side)) * size + x + Math.round(px * side);
          for (let c = 0; c < 3; c++) out[q * 3 + c] *= 1 - shadow;
        }
      }
    };
    // Hairline cracks in every old surface.
    const crackCount = Math.round(((cave ? 4 : 3) + wear * 10) * (history === 'sealed' ? 0.5 : 1));
    const walk = (sx: number, sy: number, sa: number, n: number, depthLeft: number) => {
      let cx = sx, cy = sy, ca = sa;
      for (let s = 0; s < n; s++) {
        ca += (rnd() - 0.5) * 0.9;
        const step = (5 + rnd() * 9) * U;
        const ex = cx + Math.cos(ca) * step, ey = cy + Math.sin(ca) * step;
        gouge(cx, cy, ex, ey, -0.38, 0);
        gouge(cx + 0.8, cy + 0.8, ex + 0.8, ey + 0.8, 0.12, 0);
        cx = ex;
        cy = ey;
        if (depthLeft > 0 && rnd() < 0.1) walk(cx, cy, ca + (rnd() < 0.5 ? 0.8 : -0.8), Math.floor(n / 3), depthLeft - 1);
      }
    };
    for (let i = 0; i < crackCount; i++) walk(rnd() * size, rnd() * size, rnd() * Math.PI * 2, 10 + Math.floor(rnd() * 30), 1);

    const flakeFrac =
      history === 'flaking'
        ? { cave: 0.01 + 0.035 * wear, egypt: 0.025 + 0.08 * wear, blackfigure: 0.015 + 0.05 * wear, redfigure: 0.015 + 0.05 * wear, dunhuang: 0.03 + 0.09 * wear }[T]
        : history === 'sealed'
          ? T === 'dunhuang'
            ? 0.012
            : 0
          : { cave: 0.004, egypt: 0.006, blackfigure: 0.003, redfigure: 0.003, dunhuang: 0.03 }[T] * smooth(0.25, 0.8, wear) * 1.5;
    if (flakeFrac > 0) {
      flakePass(out, ids, size, T, flakeFrac, light, beneath, seed);
      if (history === 'flaking') notes.push('flaking');
    }
    const sootAmount = history === 'soot' ? 0.45 + 0.35 * wear : (cave ? 0.14 : T === 'dunhuang' ? 0.12 : 0) * (0.4 + wear);
    if (sootAmount > 0) {
      sootPass(out, size, sootAmount, seed);
      if (history === 'soot') notes.push('blackened by smoke');
    }
    // Scratches, scrawled names and tallies left by visitors.
    const scratchCount = history === 'scratched' ? Math.round(24 + 60 * wear) : wear > 0.7 ? Math.round((wear - 0.7) * 30) : 0;
    if (scratchCount > 0) {
      const lean = rnd() * Math.PI;
      for (let i = 0; i < scratchCount; i++) {
        const ang = rnd() < 0.6 ? lean + (rnd() - 0.5) * 0.5 : rnd() * Math.PI;
        const len = (12 + rnd() * rnd() * 140) * U;
        const x = rnd() * size, y = rnd() * size;
        gouge(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, 0.75, 0.25);
      }
      if (history === 'scratched') {
        const groups = 2 + Math.floor(rnd() * 3);
        for (let g = 0; g < groups; g++) {
          const h = (9 + rnd() * 6) * U;
          const letters = 3 + Math.floor(rnd() * 5);
          let x = mix(20 * U, size * 0.7, rnd());
          const y = mix(40 * U, size - 60 * U, rnd());
          const tally = rnd() < 0.35;
          for (let c = 0; c < letters; c++) {
            if (tally) {
              gouge(x, y, x + (rnd() - 0.5) * 2, y + h, 0.8, 0.3);
              if (c % 5 === 4) gouge(x - h * 2.2, y + h * 0.75, x + h * 0.3, y + h * 0.2, 0.8, 0.3);
              x += h * 0.45;
              continue;
            }
            const strokes = 2 + Math.floor(rnd() * 2);
            for (let s = 0; s < strokes; s++) gouge(x + rnd() * h * 0.6, y + rnd() * h, x + rnd() * h * 0.6, y + rnd() * h, 0.8, 0.3);
            x += h * 0.75;
          }
        }
        notes.push('scratched by visitors');
      }
    }
    if (history === 'seeping') {
      seepPass(out, size, wear, rnd, seed);
      notes.push('water runs, a tide line and salt crust');
    }
    await pause();

    // ── 9. Finish ───────────────────────────────────────────────────────────────────────────
    const pixels = finishPass(out, size, cave, light, T === 'dunhuang' ? 0.12 + 0.16 * wear : 0, seed);
    const named = { cave: 'cave wall', egypt: 'Egyptian tomb plaster', blackfigure: 'black-figure vase', redfigure: 'red-figure vase', dunhuang: 'Dunhuang fresco' }[T];
    return {
      pixels,
      notes: [`${named}, ${a.palette} pigments on a ${a.ground} ground`, `${a.mark} colour, ${a.outline < 0.35 ? 'fine' : a.outline < 0.7 ? 'confident' : 'heavy'} outline`, ...notes],
    };
  },
});
