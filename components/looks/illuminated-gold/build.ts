import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

/**
 * Illuminated gold: the frame is repainted the way a gilder and an illuminator would work it.
 *   1. The capture is read: identity regions, albedo with cast shadows lifted out, form shading from normals.
 *   2. Colours are matched to a few mineral pigments and painted flat in two or three tones.
 *   3. Gold is laid where the tradition puts it (background, halo, chosen identities), tooled or inlaid with a motif.
 *   4. Outlines come from identity, depth, crease and pigment edges, drawn through distance fields so their
 *      width can swell (heavy outside and fine inside for a poster).
 *   5. A raking highlight sweeps across all the gold, turned by the normals; border, page and age go on last.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const blend = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;

function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const fbm = (x: number, y: number, s: number) =>
  vnoise(x, y, s) * 0.55 + vnoise(x * 2.1 + 7.3, y * 2.1 - 3.1, s + 1) * 0.3 + vnoise(x * 4.3 - 1.7, y * 4.3 + 9.2, s + 2) * 0.15;

const LINEAR = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function oklab(r: number, g: number, b: number): RGB {
  const R = LINEAR(r), G = LINEAR(g), B = LINEAR(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Box blur in place, a few passes for a soft bell. */
function blurField(field: Float32Array, n: number, radius: number, passes: number) {
  const line = new Float32Array(n);
  const span = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let axis = 0; axis < 2; axis++) {
      const step = axis === 0 ? 1 : n, other = axis === 0 ? n : 1;
      for (let row = 0; row < n; row++) {
        const base = row * other;
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += field[base + Math.min(n - 1, Math.max(0, k)) * step];
        for (let k = 0; k < n; k++) {
          line[k] = sum / span;
          sum += field[base + Math.min(n - 1, k + radius + 1) * step] - field[base + Math.max(0, k - radius) * step];
        }
        for (let k = 0; k < n; k++) field[base + k * step] = line[k];
      }
    }
  }
}

// ── Exact Euclidean distance transform (Felzenszwalb), keeping the nearest site of every pixel ──
const BIG = 1e20;
function edtLine(f: Float64Array, n: number, d: Float64Array, arg: Int32Array, v: Int32Array, z: Float64Array) {
  let k = -1;
  for (let q = 0; q < n; q++) {
    if (f[q] >= BIG) continue;
    if (k < 0) {
      k = 0;
      v[0] = q;
      z[0] = -Infinity;
      z[1] = Infinity;
      continue;
    }
    let s = 0;
    for (;;) {
      const r = v[k];
      s = (f[q] + q * q - (f[r] + r * r)) / (2 * q - 2 * r);
      // z[0] is -Infinity, so this never steps below the first parabola.
      if (s <= z[k]) k--;
      else break;
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  if (k < 0) {
    d.fill(BIG);
    arg.fill(-1);
    return;
  }
  let j = 0;
  for (let q = 0; q < n; q++) {
    while (z[j + 1] < q) j++;
    const r = v[j];
    d[q] = (q - r) * (q - r) + f[r];
    arg[q] = r;
  }
}
function edt(site: Uint8Array, n: number, dist: Float32Array, nearest: Int32Array) {
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1);
  const v = new Int32Array(n), arg = new Int32Array(n);
  const colD = new Float64Array(n * n), colArg = new Int32Array(n * n);
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) f[y] = site[y * n + x] ? 0 : BIG;
    edtLine(f, n, d, arg, v, z);
    for (let y = 0; y < n; y++) {
      colD[y * n + x] = d[y];
      colArg[y * n + x] = arg[y];
    }
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) f[x] = colD[y * n + x];
    edtLine(f, n, d, arg, v, z);
    for (let x = 0; x < n; x++) {
      const p = y * n + x;
      if (d[x] >= BIG || arg[x] < 0) {
        dist[p] = 1e9;
        nearest[p] = -1;
        continue;
      }
      const sx = arg[x];
      dist[p] = Math.sqrt(d[x]);
      nearest[p] = colArg[y * n + sx] * n + sx;
    }
  }
}

// ── Materials ───────────────────────────────────────────────────────────────────────────────
interface Palette {
  pigments: string[];
  white: string;
  grey: string;
  ink: string;
  /** Two colours for a painted diaper when the background is not gilded. */
  field: [string, string];
  /** A poster's sky, top to bottom. */
  poster: [string, string, string];
  trim: [string, string];
}
const PALETTES: Record<string, Palette> = {
  lapis: { pigments: ['#26479a', '#c3361f', '#3c7a4b', '#d4808c', '#cf9f3a', '#6a3f86', '#7a4b2c'], white: '#f3ecdb', grey: '#8f8a80', ink: '#1d1612', field: ['#26479a', '#b8322a'], poster: ['#b9c6c9', '#ece2c8', '#e3c09e'], trim: ['#26479a', '#c9566a'] },
  courtly: { pigments: ['#7e9cc9', '#c97d88', '#8ea27a', '#d8b56c', '#a782ae', '#9b6c52', '#5f7fa8'], white: '#f7f0e2', grey: '#a29c94', ink: '#2c2320', field: ['#7e9cc9', '#c97d88'], poster: ['#d3dccf', '#f2e7d1', '#ecd2bf'], trim: ['#6f8fc0', '#c97d88'] },
  jewel: { pigments: ['#a3222c', '#2e6b4b', '#2b4f9e', '#dc7a2a', '#5e3f87', '#d9b24a', '#c96e8a'], white: '#f5f0e4', grey: '#8a8580', ink: '#16120e', field: ['#2e6b4b', '#a3222c'], poster: ['#b7c4a0', '#e8dcc0', '#d9b48c'], trim: ['#2b4f9e', '#a3222c'] },
  muted: { pigments: ['#8fac80', '#e3b49a', '#d49a92', '#c9a24a', '#5f9a8a', '#b9a3c2', '#9c7a54', '#d9706a'], white: '#f6eedb', grey: '#a8a596', ink: '#4e3320', field: ['#8fac80', '#d49a92'], poster: ['#b9cba0', '#e2dcb4', '#ecc9a2'], trim: ['#8fac80', '#d49a92'] },
  imperial: { pigments: ['#5b2563', '#8e1c22', '#245f52', '#1f3a7d', '#c7922e', '#3b2b50', '#b0605a'], white: '#efe6d6', grey: '#857a7c', ink: '#170f12', field: ['#5b2563', '#1f3a7d'], poster: ['#aea1b6', '#ddd0c4', '#c99d8c'], trim: ['#5b2563', '#8e1c22'] },
  earth: { pigments: ['#a2482e', '#6f7f56', '#c79a48', '#5d4430', '#3e5466', '#b0716a'], white: '#ede3cd', grey: '#968c7a', ink: '#211812', field: ['#6f7f56', '#a2482e'], poster: ['#c6c4a4', '#e4d8b8', '#d9b693'], trim: ['#6f7f56', '#a2482e'] },
};

interface Leaf {
  lo: string;
  mid: string;
  hi: string;
  glint: string;
  /** Strength of the raking band, of the normal-driven specular, of the brushed grain and of the tooling. */
  sweep: number;
  spec: number;
  grain: number;
  emboss: number;
  stars: number;
  sharp: number;
  /** Width of the cushioned edge where the leaf meets paint, pixels. */
  bevel: number;
}
const LEAVES: Record<string, Leaf> = {
  burnished: { lo: '#7a4f12', mid: '#d0a03a', hi: '#f8dc86', glint: '#fff7dc', sweep: 0.85, spec: 0.9, grain: 0.55, emboss: 1, stars: 1, sharp: 1, bevel: 2.5 },
  shell: { lo: '#6f4f1c', mid: '#bd9748', hi: '#eed58e', glint: '#f8ebc4', sweep: 0.4, spec: 0.4, grain: 1, emboss: 0.8, stars: 0, sharp: 0.3, bevel: 1.5 },
  raised: { lo: '#6e440e', mid: '#cd9a34', hi: '#fae29a', glint: '#fff8e2', sweep: 0.7, spec: 1, grain: 0.4, emboss: 1.7, stars: 0.6, sharp: 0.8, bevel: 7 },
  red: { lo: '#64290e', mid: '#bb6f2c', hi: '#efbb6a', glint: '#ffe3b4', sweep: 0.7, spec: 0.8, grain: 0.6, emboss: 1, stars: 0.6, sharp: 0.8, bevel: 2.5 },
  silver: { lo: '#4c5056', mid: '#a1a6ac', hi: '#eef1f2', glint: '#ffffff', sweep: 0.8, spec: 0.9, grain: 0.5, emboss: 1, stars: 0.8, sharp: 0.9, bevel: 2.5 },
  bronze: { lo: '#482d16', mid: '#92623a', hi: '#cf9f66', glint: '#efd2a2', sweep: 0.42, spec: 0.5, grain: 0.8, emboss: 0.8, stars: 0.2, sharp: 0.5, bevel: 1.5 },
};

const PAGES: Record<string, { tint: string; age: number; follicles: number }> = {
  vellum: { tint: '#f2ebda', age: 0.05, follicles: 1 },
  parchment: { tint: '#e9d7af', age: 0.3, follicles: 0.6 },
  old: { tint: '#d9be8a', age: 0.6, follicles: 0.4 },
  smoke: { tint: '#b4966a', age: 0.85, follicles: 0.3 },
  purple: { tint: '#4b2343', age: 0.25, follicles: 0.2 },
  poster: { tint: '#f1e4c9', age: 0.1, follicles: 0 },
};

const KLIMT_MOTIFS = ['spirals', 'eyes', 'rectangles', 'dots'];
const TRADITION_NAMES: Record<string, string> = {
  manuscript: 'Gothic illuminated manuscript',
  klimt: 'Vienna gold-period panel',
  nouveau: 'Art nouveau poster',
};

export default defineLook({
  questions: {
    tradition: choice('Which gilded tradition is the picture made in?', {
      manuscript:
        'A Gothic illuminated manuscript, about 1300: flat mineral colours inside black outlines on parchment, set against burnished gold leaf tooled with a pattern, framed by vines and ivy. Books of hours, saints, monks, bestiaries, devotion, legend.',
      klimt:
        'Vienna gold period, about 1907: the background and the large areas of things become flat gold fields patterned with spirals, eyes, rectangles and dots, while smooth rounded surfaces keep soft realistic shading. Lovers, icons, luxury, dreams, decadence.',
      nouveau:
        'A Paris art nouveau poster, about 1896: flat muted colours, a swelling outline heavy outside and fine within, a great halo disc behind the subject and an organic frame. Advertisements, seasons, muses, theatre, perfume, cafés.',
    }),
    gold: score('How much of the picture is gold?', [
      'A touch: gold only in the border and small ornaments',
      'The background or the halo',
      'Background, halo and gold highlights',
      'Most large areas gilded',
      'Nearly everything shines with gold',
    ]),
    motif: choice('What pattern is worked into the gold?', {
      diaper: 'A diaper of incised diagonal lines making lozenges, each with a quatrefoil of punched dots: Gothic and orderly.',
      punched: 'Rosettes and rings of tiny punch marks, like the gold ground of a Sienese altarpiece: delicate and glittering.',
      spirals: 'Coiling gold spirals on dark brown discs, scattered thick: organic, hypnotic.',
      eyes: 'Almond eyes with coloured irises, open and watching, like Egyptian amulets: mysterious, watchful.',
      rectangles: 'Stacked black, white and silver rectangles and little checkerboards: architectural, stern, Viennese.',
      dots: 'Concentric discs of colour and clusters of white dots: flowering, festive, tender.',
      plain: 'Plain leaf with no pattern, only its brushed grain and the seams between the sheets.',
    }),
    border: choice('What frames the picture?', {
      none: 'Nothing: the picture runs to the edge of the sheet.',
      rule: 'A simple panel frame of gold fillet and coloured rules.',
      vines: 'A parchment margin full of thin black vine stems, ivy leaves in blue, red and gold, and gold bezants: a Gothic book page.',
      bar: 'A heavy bar border of alternating coloured segments with white filigree, gold knots at the corners and sprays of ivy.',
      mosaic: 'A frame of gold mosaic tiles and a black-and-white checkered band, like a Secession picture frame.',
      whiplash: 'A round-topped arch with whiplash curves, studs and a band of coloured tiles: an art nouveau poster frame.',
    }),
    outline: score('How heavy is the outline?', ['Hairline', 'Fine', 'Firm', 'Bold', 'Heavy and black, like leading']),
    page: choice('What is it painted on?', {
      vellum: 'Fresh calfskin vellum, a clean creamy white.',
      parchment: 'Mellowed parchment, warm honey cream.',
      old: 'Old parchment, yellowed and browned toward the edges by centuries.',
      smoke: 'Smoke-darkened parchment, brown as toast, from a church or a library fire.',
      purple: 'Imperial purple-dyed vellum, deep and dark, for a royal or sacred book.',
      poster: 'Smooth cream lithographic poster paper.',
    }),
    palette: choice('Which pigments does the painter have?', {
      lapis: 'Ultramarine, vermilion, verdigris green and rose: the classic Gothic jewel colours.',
      courtly: 'Soft azure, rose pink, sage and pale ochre: a gentle courtly palette.',
      jewel: 'Crimson, emerald, cobalt, orange and violet with black and white: rich Viennese jewel tones.',
      muted: 'Sage, peach, dusty rose, ochre and teal: muted poster pastels.',
      imperial: 'Purple, deep red, malachite and lapis: imperial and solemn.',
      earth: 'Red earth, green earth, yellow ochre and umber: sober, rustic, Romanesque.',
    }),
    leaf: choice('What metal is laid, and how is it finished?', {
      burnished: 'Yellow gold leaf burnished to a mirror: a bright raking glint and star sparkles.',
      shell: 'Matte shell gold, ground and brushed on: soft, powdery and even.',
      raised: 'Gold laid over raised gesso: cushioned edges and deep tooling that catch the light.',
      red: 'Deep red gold over red bole: warm, coppery, old.',
      silver: 'Silver leaf: cool, white and moonlit.',
      bronze: 'Bronze powder ink: dark brown-gold with a low sheen, as on a poster.',
    }),
  },

  async apply(capture, a, context, signal) {
    const n = capture.size;
    const N = n * n;
    const { color, normal, depth, identity, diffuse } = capture;
    const mood = context.mood;
    const seed = (context.seed >>> 0) % 1_000_003;
    const rnd = seeded((context.seed ^ 0x9e11d) >>> 0);
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    /** A smooth field sampled on a coarse grid and read back bilinearly: slow noise at a fraction of the cost. */
    const coarse = (step: number, fn: (X: number, Y: number) => number) => {
      const w = Math.ceil(n / step) + 2;
      const grid = new Float32Array(w * w);
      for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) grid[j * w + i] = fn(i * step, j * step);
      return (X: number, Y: number) => {
        const fx = X / step, fy = Y / step;
        const ix = Math.min(w - 2, Math.max(0, Math.floor(fx))), iy = Math.min(w - 2, Math.max(0, Math.floor(fy)));
        const tx = fx - ix, ty = fy - iy;
        const q = iy * w + ix;
        const a0 = grid[q], b0 = grid[q + 1], c0 = grid[q + w], d0 = grid[q + w + 1];
        return a0 + (b0 - a0) * tx + (c0 - a0) * ty + (a0 - b0 - c0 + d0) * tx * ty;
      };
    };
    const gothic = a.tradition === 'manuscript', klimt = a.tradition === 'klimt', nouveau = a.tradition === 'nouveau';
    const P = PALETTES[a.palette] ?? PALETTES.lapis;
    const leaf = LEAVES[a.leaf] ?? LEAVES.burnished;
    const page = PAGES[a.page] ?? PAGES.parchment;
    const amount = a.gold;
    const dens = mix(1.25, 0.8, mood.density);
    const warm = mood.warmth - 0.5;

    // ── Colours ─────────────────────────────────────────────────────────────────────────────
    const sat = 0.62 + 0.38 * mood.cheer;
    const paint = (h: string): RGB => {
      const c = hex(h);
      const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      return blend([l, l, l], c, sat);
    };
    const inkC = hex(P.ink), whiteC = hex(P.white);
    const lineInk: RGB = nouveau ? blend(hex('#4e3320'), inkC, 0.4) : klimt ? blend(hex('#2a1808'), inkC, 0.5) : inkC;
    const shiftGold = (c: RGB): RGB => [clamp01(c[0] + warm * 0.06), clamp01(c[1] + warm * 0.01), clamp01(c[2] - warm * 0.07)];
    const gLo = shiftGold(hex(leaf.lo)), gMid = shiftGold(hex(leaf.mid)), gHi = shiftGold(hex(leaf.hi)), gGlint = hex(leaf.glint);
    const bole = hex('#8f3b22');
    const pageBase = hex(page.tint);
    const pageC: RGB = [clamp01(pageBase[0] + warm * 0.03), pageBase[1], clamp01(pageBase[2] - warm * 0.04)];
    const darkPage = pageC[0] * 0.3 + pageC[1] * 0.59 + pageC[2] * 0.11 < 0.45;
    const acc = P.pigments.map(paint);
    const brownC = hex('#3a2312'), blackC = hex('#17120e'), silverC = hex('#c5c8c9'), whiteK = hex('#f3eee3');
    const trim0 = paint(P.trim[0]), trim1 = paint(P.trim[1]);

    // Light, in image space (x right, y down, z toward the viewer).
    const [lx0, ly0, lz0] = capture.light;
    const lLen = Math.hypot(lx0, ly0, lz0) || 1;
    const Lx = lx0 / lLen, Ly = ly0 / lLen, Lz = lz0 / lLen;
    const l2 = Math.hypot(Lx, Ly);
    const ex = l2 > 0.1 ? Lx / l2 : -0.7071, ey = l2 > 0.1 ? Ly / l2 : -0.7071;

    // ── 1. Read the capture ─────────────────────────────────────────────────────────────────
    const ids = new Uint8Array(N);
    const dep = new Float32Array(N);
    const lit = new Float32Array(N);
    const nX = new Float32Array(N), nY = new Float32Array(N), nZ = new Float32Array(N);
    const F = new Float32Array(N); // form shading from the normals: 0 turned away … 1 facing the light
    const histogram = new Uint32Array(256);
    let solid = 0;
    for (let p = 0; p < N; p++) {
      const id = identity[p * 4];
      ids[p] = id;
      if (id === 0) {
        dep[p] = 1;
        nZ[p] = 1;
        F[p] = 0.5 + 0.5 * Lz;
        continue;
      }
      dep[p] = (depth[p * 4] + depth[p * 4 + 1] / 256 + depth[p * 4 + 2] / 65536) / 255;
      const x = normal[p * 4] / 127.5 - 1, y = -(normal[p * 4 + 1] / 127.5 - 1), z = normal[p * 4 + 2] / 127.5 - 1;
      const len = Math.hypot(x, y, z) || 1;
      nX[p] = x / len;
      nY[p] = y / len;
      nZ[p] = z / len;
      F[p] = clamp01(0.5 + 0.5 * (nX[p] * Lx + nY[p] * Ly + nZ[p] * Lz));
      histogram[diffuse[p * 4]]++;
      solid++;
    }
    let litMax = 255;
    for (let v = 255, seen = 0; v > 0; v--) {
      seen += histogram[v];
      if (seen > solid * 0.02) {
        litMax = v;
        break;
      }
    }
    for (let p = 0; p < N; p++) lit[p] = ids[p] === 0 ? 1 : Math.min(1, diffuse[p * 4] / Math.max(24, litMax));

    // Albedo: the colour with cast shadows and most of the shading lifted out, then flattened
    // inside each surface so a region reads as one coat of paint.
    let alb = new Float32Array(N * 3);
    for (let p = 0; p < N; p++) {
      const gain = ids[p] === 0 ? 1 : 1 / mix(1, Math.max(lit[p], 0.3), 0.65);
      alb[p * 3] = Math.min(1, (color[p * 4] / 255) * gain);
      alb[p * 3 + 1] = Math.min(1, (color[p * 4 + 1] / 255) * gain);
      alb[p * 3 + 2] = Math.min(1, (color[p * 4 + 2] / 255) * gain);
    }
    let tmp = new Float32Array(N * 3);
    const flatRadius = 3;
    for (let pass = 0; pass < 4; pass++) {
      const step = pass % 2 === 0 ? 1 : n;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const p = y * n + x;
          const id = ids[p];
          const cr = alb[p * 3], cg = alb[p * 3 + 1], cb = alb[p * 3 + 2];
          let sr = 0, sg = 0, sb = 0, count = 0;
          const along = step === 1 ? x : y;
          const from = -Math.min(flatRadius, along), to = Math.min(flatRadius, n - 1 - along);
          for (let k = from; k <= to; k++) {
            const q = p + k * step;
            if (ids[q] !== id) continue;
            const r = alb[q * 3], g = alb[q * 3 + 1], b = alb[q * 3 + 2];
            if (Math.abs(r - cr) + Math.abs(g - cg) + Math.abs(b - cb) > 0.3) continue;
            sr += r;
            sg += g;
            sb += b;
            count++;
          }
          tmp[p * 3] = sr / count;
          tmp[p * 3 + 1] = sg / count;
          tmp[p * 3 + 2] = sb / count;
        }
      }
      [alb, tmp] = [tmp, alb];
    }
    await pause();

    // The open field: the backdrop, and the floor wherever it is one plain colour (a studio floor,
    // still water, snow). It is what a gilder covers with leaf; patterned or busy ground stays painted.
    const field = new Uint8Array(N);
    let fieldL = 0.8;
    {
      // An interior with no open floor or sky offers its plain walls (the set) instead.
      let open0 = 0;
      for (let p = 0; p < N; p += 3) if (ids[p] <= 1) open0++;
      const top = open0 * 3 < N * 0.12 ? 2 : 1;
      const bins = new Uint32Array(4096);
      for (let p = 0; p < N; p += 3)
        if (ids[p] <= top) bins[(Math.min(15, (alb[p * 3] * 16) | 0) << 8) | (Math.min(15, (alb[p * 3 + 1] * 16) | 0) << 4) | Math.min(15, (alb[p * 3 + 2] * 16) | 0)]++;
      let common = 0;
      for (let bin = 1; bin < 4096; bin++) if (bins[bin] > bins[common]) common = bin;
      let sr = 0, sg = 0, sb = 0, c = 0;
      for (let p = 0; p < N; p += 3) {
        if (ids[p] > top) continue;
        if (((Math.min(15, (alb[p * 3] * 16) | 0) << 8) | (Math.min(15, (alb[p * 3 + 1] * 16) | 0) << 4) | Math.min(15, (alb[p * 3 + 2] * 16) | 0)) !== common) continue;
        sr += alb[p * 3];
        sg += alb[p * 3 + 1];
        sb += alb[p * 3 + 2];
        c++;
      }
      const [L0, A0, B0] = c ? oklab(sr / c, sg / c, sb / c) : [0.8, 0, 0];
      fieldL = L0;
      const labLut = new Float32Array(32768 * 3).fill(NaN);
      const soft = new Float32Array(N);
      for (let p = 0; p < N; p++) {
        const id = ids[p];
        if (id === 0) {
          soft[p] = 1;
          continue;
        }
        if (id > top) continue;
        const bin = (Math.min(31, Math.round(alb[p * 3] * 31)) << 10) | (Math.min(31, Math.round(alb[p * 3 + 1] * 31)) << 5) | Math.min(31, Math.round(alb[p * 3 + 2] * 31));
        if (Number.isNaN(labLut[bin * 3])) {
          const lab = oklab(((bin >> 10) & 31) / 31, ((bin >> 5) & 31) / 31, (bin & 31) / 31);
          labLut[bin * 3] = lab[0];
          labLut[bin * 3 + 1] = lab[1];
          labLut[bin * 3 + 2] = lab[2];
        }
        const L = labLut[bin * 3], A = labLut[bin * 3 + 1], B = labLut[bin * 3 + 2];
        // Shadow on the floor is still floor: lightness may fall well below the field's own.
        if (Math.abs(A - A0) < 0.035 && Math.abs(B - B0) < 0.035 && L > L0 - 0.38 && L < L0 + 0.12) soft[p] = 1;
      }
      blurField(soft, n, 2, 1);
      for (let p = 0; p < N; p++) if (ids[p] === 0 || (ids[p] <= top && soft[p] > 0.5)) field[p] = 1;
    }

    // Per-identity measures.
    const area = new Float64Array(256), sumX = new Float64Array(256), sumY = new Float64Array(256);
    const minX = new Float64Array(256).fill(n), maxX = new Float64Array(256).fill(-1);
    const minY = new Float64Array(256).fill(n), maxY = new Float64Array(256).fill(-1);
    const maxDep = new Float64Array(256);
    for (let p = 0; p < N; p++) {
      const id = ids[p];
      const x = p % n, y = (p / n) | 0;
      area[id]++;
      sumX[id] += x;
      sumY[id] += y;
      if (x < minX[id]) minX[id] = x;
      if (x > maxX[id]) maxX[id] = x;
      if (y < minY[id]) minY[id] = y;
      if (y > maxY[id]) maxY[id] = y;
      if (dep[p] > maxDep[id] && id > 0) maxDep[id] = dep[p];
    }
    const things: number[] = [];
    for (let id = 3; id < 256; id++) if (area[id] > 40) things.push(id);
    things.sort((u, v) => area[v] - area[u]);
    let hero = area[3] > 40 ? 3 : things.length ? things[0] : area[2] > 40 ? 2 : -1;
    if (hero === 2 && !gothic && !nouveau) hero = -1;
    // A thing whose own colour is golden yellow is the first to be gilded: crowns, cups, lamps.
    const yellow = new Uint8Array(256);
    for (let id = 2; id < 256; id++) {
      const base = capture.baseColors[id];
      if (!base) continue;
      const [, A, B] = oklab(base[0] / 255, base[1] / 255, base[2] / 255);
      const hue = (Math.atan2(B, A) * 180) / Math.PI;
      if (Math.hypot(A, B) > 0.07 && hue > 48 && hue < 112) yellow[id] = 1;
    }

    // Smooth rounded surfaces (a Klimt face, a cup, a pole) keep realistic shading; flat facets are gilded.
    const curved = new Float32Array(N);
    if (klimt) {
      for (let y = 2; y < n - 2; y++)
        for (let x = 2; x < n - 2; x++) {
          const p = y * n + x;
          const id = ids[p];
          if (id < 2) continue;
          const l = p - 2, r = p + 2, u = p - 2 * n, d = p + 2 * n;
          if (ids[l] !== id || ids[r] !== id || ids[u] !== id || ids[d] !== id) continue;
          const c =
            Math.abs(nX[r] - nX[l]) + Math.abs(nY[r] - nY[l]) + Math.abs(nZ[r] - nZ[l]) +
            Math.abs(nX[d] - nX[u]) + Math.abs(nY[d] - nY[u]) + Math.abs(nZ[d] - nZ[u]);
          curved[p] = c > 0.04 && c < 1.15 ? 1 : 0;
        }
      blurField(curved, n, 4, 2);
    }

    // ── 2. Match colours to pigments ────────────────────────────────────────────────────────
    const fams: RGB[] = [...acc, paint(P.white), paint(P.grey), paint(P.ink)];
    const nF = fams.length;
    const WHITE = nF - 3;
    const famLab = fams.map((c) => oklab(c[0], c[1], c[2]));
    // Each pigment comes in three strengths: deep, full and let down with white.
    const ramp: RGB[][] = fams.map((c, f) => [blend(c, inkC, f === nF - 1 ? 0.25 : 0.36), c, blend(c, whiteC, 0.42)]);
    const lut = new Int16Array(32768).fill(-1);
    const matchBin = (bin: number) => {
      const [L, A, B] = oklab(((bin >> 10) & 31) / 31, ((bin >> 5) & 31) / 31, (bin & 31) / 31);
      let best = 0, bestD = Infinity;
      for (let f = 0; f < nF; f++) {
        const [fl, fa, fb] = famLab[f];
        // The render is paler than a pigment: push its chroma out before matching hues.
        const dist = ((A * 1.5 - fa) ** 2 + (B * 1.5 - fb) ** 2) * 3 + (L - fl) ** 2 * 0.35;
        if (dist < bestD) {
          bestD = dist;
          best = f;
        }
      }
      const dL = L - famLab[best][0];
      const st = best >= WHITE ? 1 : dL > 0.13 ? 2 : dL < -0.13 ? 0 : 1;
      return best * 3 + st;
    };
    let key = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      const id = ids[p];
      if (id === 0) continue;
      let r = alb[p * 3], g = alb[p * 3 + 1], b = alb[p * 3 + 2];
      const mean = id >= 3 ? capture.baseColors[id] : null;
      if (mean) {
        r = mix(r, mean[0] / 255, 0.15);
        g = mix(g, mean[1] / 255, 0.15);
        b = mix(b, mean[2] / 255, 0.15);
      }
      const bin = (Math.min(31, Math.round(r * 31)) << 10) | (Math.min(31, Math.round(g * 31)) << 5) | Math.min(31, Math.round(b * 31));
      let t = lut[bin];
      if (t < 0) t = lut[bin] = matchBin(bin);
      key[p] = t;
    }
    // A majority vote inside each surface clears specks no painter would bother with.
    {
      const next = new Uint8Array(N);
      const votes = new Uint16Array(nF * 3);
      const R = 2;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const p = y * n + x, id = ids[p];
          if (id === 0) continue;
          votes.fill(0);
          let best = key[p], bestVotes = 0;
          for (let yy = Math.max(0, y - R); yy <= Math.min(n - 1, y + R); yy++)
            for (let xx = Math.max(0, x - R); xx <= Math.min(n - 1, x + R); xx++) {
              const q = yy * n + xx;
              if (ids[q] !== id) continue;
              const v = ++votes[key[q]];
              if (v > bestVotes) {
                bestVotes = v;
                best = key[q];
              }
            }
          next[p] = best;
        }
      key = next;
    }
    await pause();

    // ── 3. Where the gold goes ──────────────────────────────────────────────────────────────
    const gilt = new Uint8Array(256);
    let backGold = false;
    const count = Math.max(1, things.length);
    const smallFirst = [...things].reverse();
    if (gothic) {
      backGold = amount >= 0.18;
      smallFirst.forEach((id, i) => {
        if (amount >= (yellow[id] ? 0.32 : 0.78 + (0.18 * i) / count)) gilt[id] = 1;
      });
      if (amount >= 0.9) gilt[2] = 1;
    } else if (klimt) {
      backGold = true;
      if (amount >= 0.12) gilt[2] = 1;
      if (amount >= 0.62) gilt[1] = 1;
      things.forEach((id, i) => {
        if (amount >= (yellow[id] ? 0.2 : 0.28 + (0.45 * i) / count)) gilt[id] = 1;
      });
    } else {
      backGold = amount >= 0.85;
      smallFirst.forEach((id, i) => {
        if (amount >= (yellow[id] ? 0.55 : 0.75 + (0.2 * i) / count)) gilt[id] = 1;
      });
      if (amount >= 0.95) gilt[2] = 1;
    }
    const chryso = gothic ? smooth(0.48, 0.75, amount) : 0;

    // Which motif each region carries, and at what size.
    const motifOf: string[] = new Array(256).fill('plain');
    const scaleOf = new Float32Array(256).fill(18 * dens);
    const occOf = new Float32Array(256).fill(0.85);
    motifOf[0] = a.motif;
    if (klimt) {
      const start = Math.max(0, KLIMT_MOTIFS.indexOf(a.motif));
      motifOf[2] = KLIMT_MOTIFS.includes(a.motif) ? a.motif : KLIMT_MOTIFS[start];
      things.forEach((id, i) => (motifOf[id] = KLIMT_MOTIFS[(start + 1 + i) % KLIMT_MOTIFS.length]));
      motifOf[1] = gilt[1] ? 'rectangles' : 'dots';
      // The ground of a Klimt panel is mostly mottled leaf; its pattern is only scattered there.
      scaleOf[0] = 46 * dens;
      occOf[0] = 0.2;
      for (let id = 1; id < 256; id++) {
        if (!area[id]) continue;
        scaleOf[id] = Math.min(30, Math.max(11, Math.sqrt(area[id]) / 7)) * dens;
        occOf[id] = id === 1 ? 0.8 : gilt[id] ? 0.9 : 0.72;
      }
      if (!gilt[1]) scaleOf[1] = 15 * dens;
    } else if (gothic) {
      scaleOf[0] = (a.motif === 'punched' || a.motif === 'dots' ? 30 : 24) * dens;
      occOf[0] = 0.9;
      motifOf[2] = a.motif === 'diaper' ? 'punched' : a.motif;
    } else {
      scaleOf[0] = 30 * dens;
      occOf[0] = 0.8;
    }

    // Klimt keeps rounded surfaces realistic; everything else in a gilded identity becomes a gold field.
    const skinCache = new Int8Array(32768).fill(-1);
    const skinLike = (p: number) => {
      const bin = (Math.min(31, Math.round(alb[p * 3] * 31)) << 10) | (Math.min(31, Math.round(alb[p * 3 + 1] * 31)) << 5) | Math.min(31, Math.round(alb[p * 3 + 2] * 31));
      if (skinCache[bin] < 0) {
        const [L, A, B] = oklab(((bin >> 10) & 31) / 31, ((bin >> 5) & 31) / 31, (bin & 31) / 31);
        const C = Math.hypot(A, B), hue = (Math.atan2(B, A) * 180) / Math.PI;
        skinCache[bin] = L > 0.45 && L < 0.93 && C > 0.025 && C < 0.15 && hue > 18 && hue < 80 ? 1 : 0;
      }
      return skinCache[bin] === 1;
    };
    const real = new Uint8Array(N);
    const gold = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      const id = ids[p];
      // Skin-like and rounded keeps its modelling; a rounded surface of an ungilded thing does too.
      if (klimt && id >= 2 && curved[p] > 0.45 && (!gilt[id] || skinLike(p))) real[p] = 1;
      if (field[p]) gold[p] = backGold ? 1 : 0;
      else if (gilt[id] && !real[p]) gold[p] = 1;
    }

    // ── Halo behind the hero ────────────────────────────────────────────────────────────────
    let haloX = n / 2, haloY = n * 0.35, haloR = 0, haloDepth = 1;
    if (hero >= 0) {
      const w = maxX[hero] - minX[hero] + 1, h = maxY[hero] - minY[hero] + 1;
      haloX = sumX[hero] / area[hero];
      haloR = Math.min(n * 0.34, Math.max(w * 0.62, h * 0.4, n * 0.12));
      haloY = minY[hero] + Math.min(h * 0.3, haloR * 0.7);
      haloDepth = maxDep[hero];
    }
    const haloOn = hero >= 0 && (nouveau || (gothic && amount >= 0.38));
    const haloGold = gothic || amount >= 0.45;

    // ── Layout of the sheet ─────────────────────────────────────────────────────────────────
    const border = a.border;
    const m =
      border === 'none' ? 0
      : border === 'rule' ? Math.round(n * 0.042)
      : border === 'vines' ? Math.round(n * 0.095)
      : border === 'bar' ? Math.round(n * 0.09)
      : border === 'mosaic' ? Math.round(n * 0.06)
      : Math.round(n * 0.085);
    const s = (n - 2 * m) / n;
    const ox = m, oy = m;
    const half = (n - 2 * m) / 2;
    const archR = (n - 2 * m) * 0.56, archCy = m + archR;
    const sdArch = (X: number, Y: number) => {
      const dx = X - n / 2, dy = Y - n / 2;
      let d = Math.max(Math.abs(dx) - half, Math.abs(dy) - half);
      if (Y < archCy) d = Math.max(d, Math.hypot(dx, Y - archCy) - archR);
      return d;
    };
    const picCover = (X: number, Y: number) => {
      if (border === 'whiplash') return clamp01(0.5 - sdArch(X, Y));
      return X >= m && X < n - m && Y >= m && Y < n - m ? 1 : 0;
    };

    // ── The gold itself ─────────────────────────────────────────────────────────────────────
    // A raking band sweeps across the leaf; its light swings with the band so curved gilt turns.
    const sweepU = mix(0.2, 1.25, mood.daylight) + (rnd() - 0.5) * 0.25;
    const sweepW = mix(0.17, 0.08, mood.energy);
    let hX = mix(-0.9, 0.9, clamp01(sweepU / 1.45)), hY = -0.45, hZ = 0.75;
    {
      const l = Math.hypot(hX, hY, hZ);
      hX /= l;
      hY /= l;
      hZ = hZ / l + 1;
      const k = Math.hypot(hX, hY, hZ);
      hX /= k;
      hY /= k;
      hZ /= k;
    }
    const specPow = mix(5, 28, leaf.sharp);
    const leafTone = coarse(6, (X, Y) => fbm(X * 0.006, Y * 0.006, seed + 3) + (fbm(X * 0.03, Y * 0.03, seed + 4) - 0.5) * 0.35);
    const mottleK = coarse(2, (X, Y) => fbm(X * 0.06, Y * 0.06, seed + 41) * 0.6 + fbm(X * 0.012, Y * 0.012, seed + 42) * 0.4);
    const mottleN = coarse(5, (X, Y) => fbm(X * 0.01, Y * 0.01, seed + 51));
    const mottleG = coarse(4, (X, Y) => fbm(X * 0.02, Y * 0.02, seed + 53));
    const paintTex = coarse(4, (X, Y) => fbm(X * 0.025, Y * 0.025, seed + 35));
    const wearZone = coarse(6, (X, Y) => fbm(X * 0.009, Y * 0.009, seed + 71));
    let gr = 0, gg = 0, gb = 0;
    const goldAt = (X: number, Y: number, relief: number, tilt: number, nx: number, ny: number, nz: number, shaped: boolean) => {
      let f =
        0.5 +
        (leafTone(X, Y) - 0.5) * 0.8 +
        (vnoise(X * 0.02, Y * 0.35, seed + 5) - 0.5) * 0.14 * leaf.grain +
        (hash(X, Y, seed + 9) - 0.5) * 0.09 * leaf.grain +
        relief * 0.42 * leaf.emboss +
        tilt;
      // The seams between the sheets of leaf, each sheet laid a little over the last.
      const row = Math.floor(Y / 44);
      const sx = (X + (row & 1) * 23 + 4600) % 46, sy = Y - row * 44;
      if (sx < 0.9 || sy < 0.9) f -= 0.05;
      else if (sx < 2 || sy < 2) f += 0.025;
      f = clamp01(f);
      if (f < 0.5) {
        const t = f * 2;
        gr = gLo[0] + (gMid[0] - gLo[0]) * t;
        gg = gLo[1] + (gMid[1] - gLo[1]) * t;
        gb = gLo[2] + (gMid[2] - gLo[2]) * t;
      } else {
        const t = (f - 0.5) * 2;
        gr = gMid[0] + (gHi[0] - gMid[0]) * t;
        gg = gMid[1] + (gHi[1] - gMid[1]) * t;
        gb = gMid[2] + (gHi[2] - gMid[2]) * t;
      }
      const u = (X + 0.45 * Y) / n;
      const band = Math.exp(-(((u - sweepU) / sweepW) ** 2));
      let hl: number;
      if (shaped) {
        const spec = Math.pow(Math.max(0, nx * hX + ny * hY + nz * hZ), specPow);
        hl = band * leaf.sweep * (0.3 + 0.7 * spec) + spec * 0.4 * leaf.spec;
      } else hl = band * leaf.sweep * 0.75;
      hl = clamp01(hl * (0.55 + 0.6 * f));
      gr += (gGlint[0] - gr) * hl;
      gg += (gGlint[1] - gg) * hl;
      gb += (gGlint[2] - gb) * hl;
    };

    // ── Motifs: tooling relief (mh), an inlaid colour (ma, mr, mg, mb), a parity and a dot mask ──
    let mh = 0, ma = 0, mr = 0, mg = 0, mb = 0, mpar = 0, mdot = 0;
    const setC = (c: RGB, alpha: number) => {
      mr = c[0];
      mg = c[1];
      mb = c[2];
      ma = alpha;
    };
    const pattern = (kind: string, x: number, y: number, S: number, salt: number, occ: number) => {
      mh = 0;
      ma = 0;
      mpar = 0;
      mdot = 0;
      if (kind === 'diaper') {
        const k = S * 0.7071;
        const u = (x + y) / S, v = (x - y) / S;
        const iu = Math.floor(u), iv = Math.floor(v);
        const fu = u - iu, fv = v - iv;
        const line = smooth(1.3, 0.35, Math.min(Math.min(fu, 1 - fu) * k, Math.min(fv, 1 - fv) * k));
        const cu = (fu - 0.5) * k, cv = (fv - 0.5) * k;
        const o = S * 0.12;
        const r0 = Math.hypot(cu, cv);
        const r1 = Math.min(Math.hypot(cu - o, cv), Math.hypot(cu + o, cv), Math.hypot(cu, cv - o), Math.hypot(cu, cv + o));
        mdot = Math.max(smooth(1.5, 0.7, r0), smooth(1.2, 0.5, r1));
        mh = -Math.max(line, mdot * 0.9);
        mpar = (iu + iv) & 1;
        if (mpar) setC(acc[salt % acc.length], 0.85 * (1 - line));
        return;
      }
      if (kind === 'punched') {
        const ix = Math.floor(x / S), iy = Math.floor(y / S);
        const dx = x - (ix + 0.5) * S, dy = y - (iy + 0.5) * S, r = Math.hypot(dx, dy);
        const R0 = S * 0.27, ang = Math.atan2(dy, dx), step = TAU / 8;
        const k = Math.round(ang / step);
        const dp = Math.hypot(dx - Math.cos(k * step) * R0, dy - Math.sin(k * step) * R0);
        const ring = smooth(0.9, 0.3, Math.abs(dp - 1.7));
        const centre = Math.min(1, smooth(0.9, 0.3, Math.abs(r - 2.6)) + smooth(1.1, 0.5, r));
        const R1 = S * 0.46, arc = ang * R1;
        const dots = smooth(1.0, 0.4, Math.hypot(r - R1, arc - Math.round(arc / 3.4) * 3.4));
        mh = -Math.min(1, ring + centre + dots);
        mdot = centre;
        mpar = (ix + iy) & 1;
        if (r < 4) setC(acc[Math.abs(ix * 7 + iy * 3 + salt) % acc.length], clamp01(3.5 - r));
        return;
      }
      if (kind === 'spirals') {
        const ix = Math.floor(x / S), iy = Math.floor(y / S);
        if (hash(ix, iy, salt) > occ) return;
        const R = S * (0.3 + 0.17 * hash(ix, iy, salt + 1));
        const cx = (ix + 0.5) * S + (hash(ix, iy, salt + 2) - 0.5) * (S - 2 * R);
        const cy = (iy + 0.5) * S + (hash(ix, iy, salt + 3) - 0.5) * (S - 2 * R);
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
        if (r > R + 1) return;
        const dir = hash(ix, iy, salt + 4) < 0.5 ? 1 : -1;
        const turns = 2.2 + 1.3 * hash(ix, iy, salt + 5);
        const t = (r / R) * turns - (dir * Math.atan2(dy, dx)) / TAU + hash(ix, iy, salt + 6);
        const f = t - Math.floor(t);
        const pitch = R / turns;
        const coil = Math.max(smooth(1.3, 0.45, Math.min(f, 1 - f) * pitch), smooth(1.4, 0.5, Math.abs(r - R)));
        const inside = clamp01(R - r + 0.5);
        mh = -coil * inside * 0.8;
        setC(brownC, inside * (1 - coil));
        mdot = smooth(2, 1, r);
        mpar = 1;
        return;
      }
      if (kind === 'eyes') {
        const H = S * 0.72;
        const iy = Math.floor(y / H);
        const off = (iy & 1) * S * 0.5;
        const ix = Math.floor((x + off) / S);
        if (hash(ix, iy, salt) > occ) return;
        const cx = (ix + 0.5) * S - off, cy = (iy + 0.5) * H;
        const Rw = S * 0.37, Rh = H * 0.32;
        const lx = (x - cx) / Rw, ly = (y - cy) / Rh;
        if (Math.abs(lx) > 1.15 || Math.abs(ly) > 1.6) return;
        const sd = (Math.abs(ly) - (1 - lx * lx)) * Rh;
        if (sd > 1.6) return;
        const edge = smooth(1.4, 0.5, Math.abs(sd + 0.5));
        const inside = clamp01(-sd + 0.5);
        const ri = Math.hypot(x - cx, y - cy);
        const irisR = Rh * 0.8;
        const iris = clamp01(irisR - ri + 0.5);
        const pupil = clamp01(irisR * 0.45 - ri + 0.5);
        let c = whiteK;
        c = blend(c, acc[Math.abs(ix + iy * 3 + salt) % acc.length], iris);
        c = blend(c, blackC, Math.max(pupil, edge));
        setC(c, Math.max(inside, edge));
        mh = -edge;
        mdot = pupil;
        mpar = 1;
        return;
      }
      if (kind === 'rectangles') {
        const cw = S * 0.62;
        const ix = Math.floor(x / cw);
        const rh = S * (0.9 + 0.9 * hash(ix, 0, salt));
        const yo = hash(ix, 1, salt) * rh;
        const iy = Math.floor((y + yo) / rh);
        const lx = x - ix * cw, ly = y + yo - iy * rh;
        const e = Math.min(lx, cw - lx, ly, rh - ly);
        mh = -smooth(1.2, 0.4, e);
        mpar = (ix + iy) & 1;
        const pick = hash(ix, iy, salt + 7);
        if (pick > occ) return;
        const inside = clamp01(e - 1.6 + 0.5);
        let c: RGB = pick < occ * 0.42 ? blackC : pick < occ * 0.72 ? whiteK : pick < occ * 0.86 ? silverC : acc[Math.abs(ix + iy) % acc.length];
        if (pick < occ * 0.16) c = ((Math.floor(lx / 3.2) + Math.floor(ly / 3.2)) & 1) === 1 ? whiteK : blackC;
        setC(c, inside);
        return;
      }
      if (kind === 'dots') {
        const ix = Math.floor(x / S), iy = Math.floor(y / S);
        if (hash(ix, iy, salt) > occ) return;
        const R = S * (0.26 + 0.2 * hash(ix, iy, salt + 1));
        const cx = (ix + 0.5) * S + (hash(ix, iy, salt + 2) - 0.5) * (S - 2 * R);
        const cy = (iy + 0.5) * S + (hash(ix, iy, salt + 3) - 0.5) * (S - 2 * R);
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
        if (r > R + 1) return;
        mdot = smooth(2, 1, r);
        mpar = 1;
        if (hash(ix, iy, salt + 4) < 0.66) {
          const inside = clamp01(R - r + 0.5);
          const rr = r / R;
          const c0 = acc[Math.abs(ix * 3 + iy + salt) % acc.length], c2 = acc[Math.abs(ix + iy * 5 + 2 + salt) % acc.length];
          const c = rr < 0.34 ? c2 : rr < 0.66 ? whiteK : c0;
          const edge = Math.max(smooth(0.9, 0.3, Math.abs(r - R * 0.34)), smooth(0.9, 0.3, Math.abs(r - R * 0.66)), smooth(1.0, 0.35, Math.abs(r - R)));
          setC(blend(c, blackC, edge * 0.6), inside);
          mh = -edge;
        } else {
          const ang = Math.atan2(dy, dx), st = TAU / 6, k = Math.round(ang / st);
          const d1 = Math.hypot(dx - Math.cos(k * st) * R * 0.62, dy - Math.sin(k * st) * R * 0.62);
          const sr = R * 0.27;
          const outer = clamp01(sr - d1 + 0.5), heart = clamp01(sr - r + 0.5);
          if (heart > 0) setC(acc[1 % acc.length], heart);
          else setC(whiteK, outer);
          mh = -Math.max(outer, heart) * 0.7;
        }
      }
    };

    // ── Distance fields: the cushion of the leaf and the outlines ───────────────────────────
    const cushion = new Float32Array(N);
    {
      const notGold = new Uint8Array(N);
      let anyGold = false;
      for (let p = 0; p < N; p++) {
        if (gold[p]) anyGold = true;
        else notGold[p] = 1;
      }
      if (anyGold) {
        const dist = new Float32Array(N), near = new Int32Array(N);
        edt(notGold, n, dist, near);
        for (let p = 0; p < N; p++) cushion[p] = gold[p] ? smooth(0, leaf.bevel, dist[p]) : 0;
      }
    }
    await pause();

    const outerSite = new Uint8Array(N), innerSite = new Uint8Array(N);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const p = y * n + x, id = ids[p];
        for (let side = 0; side < 2; side++) {
          if (side === 0 ? x >= n - 1 : y >= n - 1) continue;
          const q = side === 0 ? p + 1 : p + n;
          const iq = ids[q];
          const nearer = dep[p] <= dep[q] ? p : q;
          if (field[p] && field[q]) continue;
          if (iq !== id || field[p] !== field[q]) {
            outerSite[nearer] = 1;
            continue;
          }
          if (gold[p] !== gold[q]) {
            outerSite[gold[p] ? p : q] = 1;
            continue;
          }
          if (field[p]) continue;
          const dp = dep[p], dq = dep[q];
          if (Math.abs(dp - dq) > 0.04 * Math.max(dp, dq) + 0.002) {
            outerSite[nearer] = 1;
            continue;
          }
          if (gold[p] && klimt) continue;
          if (real[p]) continue;
          if (nX[p] * nX[q] + nY[p] * nY[q] + nZ[p] * nZ[q] < 0.8) {
            innerSite[p] = 1;
            continue;
          }
          if (!gold[p] && ((key[p] / 3) | 0) !== ((key[q] / 3) | 0)) innerSite[p] = 1;
        }
      }
    const distO = new Float32Array(N), nearO = new Int32Array(N);
    const distI = new Float32Array(N), nearI = new Int32Array(N);
    edt(outerSite, n, distO, nearO);
    edt(innerSite, n, distI, nearI);
    await pause();

    const wOut = gothic ? mix(1.2, 4.6, a.outline) : klimt ? mix(1.0, 3.6, a.outline) : mix(2.0, 7.5, a.outline);
    const wIn = gothic ? mix(0.75, 2.4, a.outline) : klimt ? mix(0.5, 1.3, a.outline) : mix(0.6, 1.7, a.outline);
    const widthAt = (site: number, base: number) => {
      const sx = site % n, sy = (site / n) | 0;
      if (nouveau) return base * (0.45 + 1.15 * (1 - F[site]));
      if (gothic) return base * (0.8 + 0.4 * vnoise(sx * 0.05, sy * 0.05, seed + 61));
      return real[site] ? base * 0.45 : base;
    };
    const conf = capture.confidence;
    // No line can reach farther than this from its site, whatever its swell.
    const reachO = wOut * 0.8 + 1, reachI = wIn * 0.8 + 1;

    // ── 4. Paint the picture ────────────────────────────────────────────────────────────────
    const pic = new Float32Array(N * 3);
    const picGold = new Float32Array(N);
    const field0 = paint(P.field[0]), field1 = paint(P.field[1]);
    // A dark scene makes a night poster: the sky deepens toward the ink.
    const night = smooth(0.5, 0.25, fieldL);
    const posterC = P.poster.map((h, i) => {
      const c = paint(h);
      return blend(c, blend(c, inkC, 0.7), night * (1 - i * 0.3));
    });
    const haloTint = blend(posterC[1], whiteC, 0.45);
    const wearLoss = !nouveau && mood.wear > 0.3 ? smooth(0.3, 1, mood.wear) : 0;
    const shadowWarm: RGB = [0.16, 0.08, 0.05];
    for (let y = 0; y < n; y++) {
      if ((y & 63) === 0) await pause();
      for (let x = 0; x < n; x++) {
        const p = y * n + x;
        const id = ids[p];
        const X = ox + (x + 0.5) * s, Y = oy + (y + 0.5) * s;
        let r = 0, g = 0, b = 0, isGold = 0;
        const open = field[p] === 1;
        const region = open ? 0 : id;
        if (gold[p]) {
          const kind = motifOf[region];
          const S = scaleOf[region], occ = occOf[region];
          const salt = region * 31 + 7;
          let relief = 0;
          let ia = 0, ir = 0, ig = 0, ib = 0;
          if (kind !== 'plain') {
            pattern(kind, x, y, S, salt, occ);
            const h0 = mh;
            ia = ma;
            ir = mr;
            ig = mg;
            ib = mb;
            pattern(kind, x + ex, y + ey, S, salt, occ);
            relief = h0 - mh + h0 * 0.25;
          }
          if (leaf.bevel > 0 && !open) {
            const q = Math.min(N - 1, Math.max(0, Math.round(y + ey) * n + Math.round(x + ex)));
            relief += (cushion[p] - cushion[q]) * (leaf.bevel > 4 ? 2.2 : 1.2) - (1 - cushion[p]) * 0.25;
          }
          const shaped = !open;
          const tilt = shaped ? (F[p] - 0.55) * (klimt ? 0.18 : 0.45) : 0;
          goldAt(X, Y, relief, tilt, nX[p], nY[p], nZ[p], shaped);
          r = gr;
          g = gg;
          b = gb;
          if (klimt && open) {
            // The mottled brown-gold of a Klimt ground, with gold dust.
            const mot = smooth(0.52, 0.66, mottleK(X, Y) + (hash(x, y, seed + 44) - 0.5) * 0.08);
            r *= 1 - 0.2 * mot;
            g *= 1 - 0.27 * mot;
            b *= 1 - 0.38 * mot;
            const dust = hash(x, y, seed + 43);
            if (dust < 0.006) {
              r = mix(r, gGlint[0], 0.7);
              g = mix(g, gGlint[1], 0.7);
              b = mix(b, gGlint[2], 0.7);
            } else if (dust > 0.994) {
              r *= 0.6;
              g *= 0.55;
              b *= 0.5;
            }
          }
          isGold = 1;
          // Klimt sets colour into the gold; the other traditions only tool it.
          if (klimt && ia > 0) {
            const shade = 0.82 + 0.3 * F[p];
            r = mix(r, ir * shade, ia);
            g = mix(g, ig * shade, ia);
            b = mix(b, ib * shade, ia);
            isGold = 1 - ia;
          }
        } else if (open) {
          if (nouveau) {
            const v = y / n;
            const c = v < 0.5 ? blend(posterC[0], posterC[1], v * 2) : blend(posterC[1], posterC[2], (v - 0.5) * 2);
            pattern(a.motif === 'plain' ? 'dots' : a.motif, x, y, scaleOf[0], 11, occOf[0]);
            const toneDown = 1 - 0.07 * Math.max(ma, Math.min(1, -mh));
            const mottle = 1 + (mottleN(X, Y) - 0.5) * 0.08;
            r = c[0] * toneDown * mottle;
            g = c[1] * toneDown * mottle;
            b = c[2] * toneDown * mottle;
          } else {
            // A painted diaper ground: two colours, white filigree and a few gold dots.
            const kind = a.motif === 'plain' ? 'diaper' : a.motif;
            pattern(kind, x, y, scaleOf[0], 11, 0.85);
            let c = mpar && (kind === 'diaper' || kind === 'punched' || kind === 'rectangles') ? field1 : field0;
            if (ma > 0 && kind !== 'diaper' && kind !== 'punched' && kind !== 'rectangles') c = blend(c, [mr, mg, mb], ma * 0.9);
            if (mh < -0.3) c = blend(c, whiteC, 0.75 * Math.min(1, -mh));
            const mottle = 1 + (mottleG(X, Y) - 0.5) * 0.1;
            r = c[0] * mottle;
            g = c[1] * mottle;
            b = c[2] * mottle;
            if (mdot > 0.4 && (kind === 'diaper' || kind === 'punched')) {
              goldAt(X, Y, 0, 0.1, 0, 0, 1, false);
              r = mix(r, gr, mdot);
              g = mix(g, gg, mdot);
              b = mix(b, gb, mdot);
              isGold = mdot;
            }
          }
        } else {
          const k = key[p];
          const fam = (k / 3) | 0, st = k % 3;
          let c: RGB;
          if (real[p]) {
            // Realistic modelling: the albedo lit by the plain pass, shadows warmed.
            const l = 0.36 + 0.74 * Math.pow(lit[p], 0.9);
            const ar = alb[p * 3], ag = alb[p * 3 + 1], ab = alb[p * 3 + 2];
            c = [ar * l + shadowWarm[0] * (1 - l), ag * l + shadowWarm[1] * (1 - l), ab * l + shadowWarm[2] * (1 - l)];
          } else {
            c = ramp[fam][st];
            const Fv = F[p] + (vnoise(x * 0.05, y * 0.05, seed + 31) - 0.5) * 0.08;
            if (gothic) {
              if (Fv > 0.76) c = blend(c, whiteC, 0.3);
              else if (Fv < 0.42) c = blend(c, inkC, 0.3);
            } else if (nouveau) {
              if (Fv < 0.44) c = blend(c, lineInk, 0.17);
            } else {
              if (Fv < 0.42) c = blend(c, inkC, 0.22);
              // Klimt's painted fields carry their own mosaic of colour, a flower meadow on the ground.
              const kind = motifOf[id];
              pattern(kind, x, y, scaleOf[id], id * 31 + 7, occOf[id]);
              if (ma > 0) c = blend(c, [mr, mg, mb], ma * 0.92);
            }
            const tex = 1 + (hash(x, y, seed + 33) - 0.5) * 0.04 + (paintTex(X, Y) - 0.5) * 0.09;
            c = [c[0] * tex, c[1] * tex, c[2] * tex];
          }
          r = c[0];
          g = c[1];
          b = c[2];
          // Gold or lead-white hatching laid along the form on the lit side.
          if (gothic && id >= 2 && !real[p]) {
            const len = Math.hypot(nX[p], nY[p]);
            const dx = len > 0.2 ? nX[p] / len : 0.7071, dy = len > 0.2 ? nY[p] / len : -0.7071;
            const ph = (x * dx + y * dy) / 4.6 + Math.sin(x * 0.07 - y * 0.11) * 0.22;
            // only where the plain-lit pass says light really falls: no gold in a cast shadow
            const hatch = smooth(0.2, 0.06, Math.abs(ph - Math.round(ph))) * smooth(0.72, 0.9, F[p]) * smooth(0.45, 0.75, lit[p]);
            if (hatch > 0) {
              if (chryso > 0) {
                goldAt(X, Y, 0, 0.15, nX[p], nY[p], nZ[p], true);
                const t = hatch * chryso;
                r = mix(r, gr, t);
                g = mix(g, gg, t);
                b = mix(b, gb, t);
                isGold = t;
              } else {
                r = mix(r, whiteC[0], hatch * 0.4);
                g = mix(g, whiteC[1], hatch * 0.4);
                b = mix(b, whiteC[2], hatch * 0.4);
              }
            }
          }
        }

        // The halo stands just behind the hero: anything farther away is covered by it.
        if (haloOn) {
          const dx = x - haloX, dy = y - haloY, rr = Math.hypot(dx, dy);
          if (rr < haloR + 1.5 && (open || dep[p] > haloDepth)) {
            const cov = clamp01(haloR - rr + 0.5);
            const q = rr / haloR;
            const ang = Math.atan2(dy, dx);
            let hr: number, hg: number, hb: number, hGold = 0;
            const ring = (at: number, w: number) => smooth(w, w * 0.3, Math.abs(rr - haloR * at));
            if (nouveau) {
              const studN = Math.max(16, Math.round((TAU * haloR * 0.93) / 22));
              const sa = Math.round((ang / TAU) * studN) * (TAU / studN);
              const sd = Math.hypot(dx - Math.cos(sa) * haloR * 0.93, dy - Math.sin(sa) * haloR * 0.93);
              const studR = Math.max(2.6, haloR * 0.03);
              if (q > 0.86 || haloGold) {
                const relief = q > 0.86 ? -ring(0.86, 1.4) : 0;
                let tooled = 0;
                if (q <= 0.86 && a.motif !== 'plain') {
                  pattern(a.motif === 'rectangles' || a.motif === 'eyes' ? 'punched' : a.motif, x, y, 22, 5, 0.9);
                  tooled = mh;
                }
                goldAt(X, Y, relief + tooled * 0.8, 0.05, 0, 0, 1, false);
                hr = gr;
                hg = gg;
                hb = gb;
                hGold = 1;
              } else {
                const petal = Math.abs(q - 0.68 * (0.84 + 0.16 * Math.abs(Math.cos(6 * ang))));
                const line = Math.max(smooth(0.012, 0.004, petal), ring(0.36, 1.2));
                const c = blend(haloTint, trim1, 0.12 + 0.5 * line);
                hr = c[0];
                hg = c[1];
                hb = c[2];
              }
              const studInk = smooth(1.2, 0.4, Math.abs(sd - studR));
              const studFill = clamp01(studR - sd + 0.5) * (1 - studInk);
              if (studFill > 0) {
                hr = mix(hr, whiteC[0], studFill * 0.8);
                hg = mix(hg, whiteC[1], studFill * 0.8);
                hb = mix(hb, whiteC[2], studFill * 0.8);
              }
              const inkL = Math.max(ring(1, 1.6), ring(0.86, 1.3), ring(0.82, 0.9), studInk);
              hr = mix(hr, lineInk[0], inkL);
              hg = mix(hg, lineInk[1], inkL);
              hb = mix(hb, lineInk[2], inkL);
              hGold *= 1 - inkL;
            } else {
              // A tooled nimbus: incised rings with a band of punches and faint rays.
              const rays = 28;
              const ra = ((ang / TAU) * rays + 100) % 1;
              const ray = q < 0.8 ? smooth(0.08, 0.02, Math.abs(ra - 0.5)) * smooth(0.15, 0.4, q) : 0;
              const arc = ang * haloR * 0.885;
              const punch = smooth(1.1, 0.4, Math.hypot(rr - haloR * 0.885, arc - Math.round(arc / 5) * 5));
              const relief = -(ring(0.9, 1.4) + ring(0.81, 1.4) + punch) + ray * 0.8;
              goldAt(X, Y, relief * 1.5, 0.14, 0, 0, 1, false);
              hr = gr;
              hg = gg;
              hb = gb;
              hGold = 1;
              // a painted rim of colour, as the nimbus is ruled off from the gold ground
              const rim = smooth(0.935, 0.95, q);
              if (rim > 0) {
                hr = mix(hr, trim1[0], rim);
                hg = mix(hg, trim1[1], rim);
                hb = mix(hb, trim1[2], rim);
                hGold *= 1 - rim;
              }
              const inkL = Math.max(ring(1, Math.max(1.4, wOut * 0.6)), ring(0.94, 1.1));
              hr = mix(hr, lineInk[0], inkL);
              hg = mix(hg, lineInk[1], inkL);
              hb = mix(hb, lineInk[2], inkL);
              hGold *= 1 - inkL;
            }
            r = mix(r, hr, cov);
            g = mix(g, hg, cov);
            b = mix(b, hb, cov);
            isGold = mix(isGold, hGold, cov);
          }
        }

        // Losses: rubbed gold shows its red bole, flaked paint shows the page.
        if (wearLoss > 0) {
          // Handling wears some passages more than others; there the leaf thins and paint flakes.
          const zone = smooth(0.5, 0.7, wearZone(X, Y));
          if (zone > 0) {
            const flake = vnoise(X * 0.11, Y * 0.11, seed + 73) * 0.7 + vnoise(X * 0.33, Y * 0.33, seed + 75) * 0.3;
            const thr = 1 - 0.34 * wearLoss * zone;
            if (isGold > 0.5) {
              const t = smooth(thr - 0.14, thr, flake) * 0.7;
              r = mix(r, bole[0], t);
              g = mix(g, bole[1], t);
              b = mix(b, bole[2], t);
              isGold *= 1 - t;
            } else if (flake > thr - 0.01) {
              const t = smooth(thr, thr + 0.025, flake);
              r = mix(r * 0.75, pageC[0], t);
              g = mix(g * 0.75, pageC[1], t);
              b = mix(b * 0.75, pageC[2], t);
            }
          }
        }

        // Outlines over everything.
        const finish = id >= 3 && conf ? smooth(0.15, 0.6, conf[id] ?? 1) : 1;
        let cov = 0;
        const so = nearO[p];
        if (so >= 0 && distO[p] < reachO) cov = clamp01(widthAt(so, wOut) * 0.5 - distO[p] + 0.5);
        const si = nearI[p];
        if (si >= 0 && distI[p] < reachI) cov = Math.max(cov, clamp01(widthAt(si, wIn) * 0.5 - distI[p] + 0.5));
        if (finish < 1) {
          // Doubtful things are left as an underdrawing on the bare page.
          r = mix(pageC[0], r, finish);
          g = mix(pageC[1], g, finish);
          b = mix(pageC[2], b, finish);
          isGold *= finish;
          cov *= 0.55 + 0.45 * finish;
        }
        if (cov > 0) {
          const inkA = cov * (gothic ? 0.92 + 0.08 * hash(x >> 2, y >> 2, seed + 63) : 0.96);
          r = mix(r, lineInk[0], inkA);
          g = mix(g, lineInk[1], inkA);
          b = mix(b, lineInk[2], inkA);
          isGold *= 1 - inkA;
        }
        pic[p * 3] = r;
        pic[p * 3 + 1] = g;
        pic[p * 3 + 2] = b;
        picGold[p] = isGold;
      }
    }
    await pause();

    // ── 5. The border, drawn as a layer over the sheet ──────────────────────────────────────
    const lr = new Float32Array(N), lg = new Float32Array(N), lb = new Float32Array(N);
    const la = new Float32Array(N), lgo = new Float32Array(N), lt = new Float32Array(N);
    const put = (i: number, cov: number, c: RGB | null, tilt = 0) => {
      if (cov <= 0) return;
      if (cov > 1) cov = 1;
      const k = 1 - cov;
      lr[i] *= k;
      lg[i] *= k;
      lb[i] *= k;
      lgo[i] *= k;
      lt[i] *= k;
      la[i] = la[i] * k + cov;
      if (c) {
        lr[i] += c[0] * cov;
        lg[i] += c[1] * cov;
        lb[i] += c[2] * cov;
      } else {
        lgo[i] += cov;
        lt[i] += tilt * cov;
      }
    };
    const disc = (cx: number, cy: number, rad: number, c: RGB | null, tilt = 0) => {
      const x0 = Math.max(0, Math.floor(cx - rad - 1)), x1 = Math.min(n - 1, Math.ceil(cx + rad + 1));
      const y0 = Math.max(0, Math.floor(cy - rad - 1)), y1 = Math.min(n - 1, Math.ceil(cy + rad + 1));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) put(y * n + x, rad - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.5, c, tilt);
    };
    /** Stamps a stroke along a polyline: width from `w(t)`, ink rim first, then the fill. */
    const stroke = (pts: number[], w: (t: number) => number, fill: RGB | null, rim: number) => {
      const passes = rim > 0 ? 2 : 1;
      for (let pass = 0; pass < passes; pass++) {
        const last = pts.length / 2 - 1;
        for (let k = 0; k < last; k++) {
          const ax = pts[k * 2], ay = pts[k * 2 + 1], bx = pts[k * 2 + 2], by = pts[k * 2 + 3];
          const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.6));
          for (let j = 0; j < steps; j++) {
            const t = (k + j / steps) / last;
            const px = ax + ((bx - ax) * j) / steps, py = ay + ((by - ay) * j) / steps;
            const half = w(t) / 2;
            if (pass === 0 && rim > 0) disc(px, py, half + rim, lineInk);
            else disc(px, py, half, fill);
          }
        }
      }
    };
    const spiral = (sx: number, sy: number, r0: number, a0: number, turns: number, dir: number, out: number[]) => {
      const cx = sx - Math.cos(a0) * r0, cy = sy - Math.sin(a0) * r0;
      const steps = Math.max(12, Math.round(r0 * turns * 4));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const rr = r0 * (1 - 0.8 * t), ang = a0 + dir * turns * TAU * t;
        out.push(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
      }
      return out;
    };
    const ivy = (cx: number, cy: number, size: number, ang: number, c: RGB | null) => {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const lobes = [
        [0.62, 0, 0.36],
        [0.32, 0.36, 0.3],
        [0.32, -0.36, 0.3],
        [0.18, 0, 0.3],
      ];
      const ext = size * 1.1 + 3;
      const x0 = Math.max(0, Math.floor(cx - ext)), x1 = Math.min(n - 1, Math.ceil(cx + ext));
      const y0 = Math.max(0, Math.floor(cy - ext)), y1 = Math.min(n - 1, Math.ceil(cy + ext));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
          let sd = 1e9;
          for (const [lu, lv, lr2] of lobes) sd = Math.min(sd, Math.hypot(u - lu * size, v - lv * size) - lr2 * size);
          const i = y * n + x;
          put(i, 0.5 - (sd - 1.1), lineInk);
          put(i, 0.5 - (sd + 0.4), c, 0.1);
          if (u > size * 0.1 && u < size * 0.8) put(i, (0.55 - Math.abs(v)) * 0.8 * clamp01(-sd), lineInk);
        }
    };
    const stemC: RGB | null = darkPage ? null : lineInk;
    let leafScale = 1;
    const leafColours: (RGB | null)[] = [trim0, trim1, null];

    /** A wavy vine along one side of the margin, with ivy, bezants and hairline tendrils. */
    const vine = (sx: number, sy: number, dx: number, dy: number, len: number, amp: number, phase: number, sideSalt: number) => {
      const px = -dy, py = dx;
      const lambda = mix(70, 44, mood.density);
      const pts: number[] = [];
      for (let t = 0; t <= len; t += 1.5) {
        const o = amp * Math.sin((TAU * t) / lambda + phase);
        pts.push(sx + dx * t + px * o, sy + dy * t + py * o);
      }
      stroke(pts, () => 1.5, stemC, 0);
      let k = 0;
      for (let crest = ((Math.PI / 2 - phase) / TAU) * lambda; crest < len; crest += lambda / 2, k++) {
        if (crest < 6) continue;
        const sgn = Math.sin((TAU * crest) / lambda + phase) > 0 ? 1 : -1;
        const bx = sx + dx * crest + px * amp * sgn, by = sy + dy * crest + py * amp * sgn;
        let ddx = px * sgn + dx * 0.55, ddy = py * sgn + dy * 0.55;
        const dl = Math.hypot(ddx, ddy);
        ddx /= dl;
        ddy /= dl;
        const stalk = (5 + 2 * hash(k, sideSalt, seed + 101)) * leafScale;
        const ex2 = bx + ddx * stalk, ey2 = by + ddy * stalk;
        stroke([bx, by, ex2, ey2], () => 1.1, stemC, 0);
        const pick = hash(k, sideSalt, seed + 103);
        if (pick < 0.62) {
          ivy(ex2, ey2, mix(7.5, 10, hash(k, sideSalt, seed + 105)) * leafScale, Math.atan2(ddy, ddx), leafColours[(k + sideSalt) % 3]);
        } else {
          disc(ex2, ey2, 1.1 + 3.5 * leafScale, lineInk);
          disc(ex2, ey2, 3.5 * leafScale, null, 0.15);
          // three hairline sprays around the bezant
          for (let j = -1; j <= 1; j++) {
            const aa = Math.atan2(ddy, ddx) + j * 0.9;
            stroke([ex2 + Math.cos(aa) * 4.6, ey2 + Math.sin(aa) * 4.6, ex2 + Math.cos(aa) * 8.5, ey2 + Math.sin(aa) * 8.5], () => 0.8, stemC, 0);
          }
        }
        // a hairline tendril curling off the other side of the stem
        if (hash(k, sideSalt, seed + 107) < 0.55) {
          const tx = sx + dx * (crest + lambda / 4), ty = sy + dy * (crest + lambda / 4);
          const pts2: number[] = [tx, ty];
          spiral(tx - px * sgn * 2, ty - py * sgn * 2, 4 + 2 * hash(k, sideSalt, 109), Math.atan2(-py * sgn, -px * sgn), 1.3, sgn, pts2);
          stroke(pts2, () => 0.8, stemC, 0);
        }
      }
    };
    const quatrefoil = (cx: number, cy: number, size: number) => {
      for (let j = 0; j < 4; j++) {
        const aa = (j * Math.PI) / 2 + Math.PI / 4;
        disc(cx + Math.cos(aa) * size * 0.75, cy + Math.sin(aa) * size * 0.75, size * 0.62 + 1.1, lineInk);
      }
      for (let j = 0; j < 4; j++) {
        const aa = (j * Math.PI) / 2 + Math.PI / 4;
        disc(cx + Math.cos(aa) * size * 0.75, cy + Math.sin(aa) * size * 0.75, size * 0.62, j % 2 ? trim0 : trim1);
      }
      disc(cx, cy, size * 0.58 + 1.2, lineInk);
      disc(cx, cy, size * 0.58, null, 0.12);
    };

    // Bands that run around the picture, described by distance outward from its edge.
    if (border !== 'none' && border !== 'whiplash') {
      for (let Y = 0; Y < n; Y++)
        for (let X = 0; X < n; X++) {
          const dx = X + 0.5 - n / 2, dy = Y + 0.5 - n / 2;
          const out = Math.max(Math.abs(dx), Math.abs(dy)) - half;
          if (out < 0 || out > m) continue;
          const i = Y * n + X;
          const side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
          const along = side % 2 ? Y + 0.5 : X + 0.5;
          const band = (lo: number, hi: number) => clamp01(Math.min(out - lo, hi - out) + 0.5);
          if (border === 'rule') {
            put(i, band(0, 6), null, 0.05);
            put(i, band(6, 7.2), lineInk);
            put(i, band(7.2, 13), trim0);
            const dotD = Math.hypot(((along % 8) + 8) % 8 - 4, out - 10.1);
            put(i, band(7.2, 13) * clamp01(1.2 - dotD), whiteC);
            put(i, band(13, 14.2), lineInk);
          } else if (border === 'vines') {
            put(i, band(0, 4.5), null, 0.05);
            put(i, band(4.5, 5.7), lineInk);
            put(i, band(5.7, 10), side === 0 || side === 3 ? trim0 : trim1);
            const dotD = Math.hypot(((along % 7) + 7) % 7 - 3.5, out - 7.85);
            put(i, band(5.7, 10) * clamp01(1.1 - dotD), whiteC);
            put(i, band(10, 11.2), lineInk);
          } else if (border === 'bar') {
            const bw = 13;
            put(i, band(0, 3), null, 0.05);
            put(i, band(3, 4.2), lineInk);
            const seg = Math.floor((along + side * 13) / 38);
            put(i, band(4.2, 4.2 + bw), seg & 1 ? trim0 : trim1);
            const wave = Math.abs(out - (4.2 + bw / 2) - 2.6 * Math.sin(along * 0.33));
            put(i, band(4.2, 4.2 + bw) * clamp01(0.9 - wave), whiteC);
            put(i, band(4.2 + bw, 5.4 + bw), lineInk);
          } else if (border === 'mosaic') {
            put(i, band(0, 1.5), lineInk);
            const q = 5;
            const chk = (Math.floor(along / q) + Math.floor((out - 1.5) / q)) & 1;
            put(i, band(1.5, 11.5), chk ? whiteK : blackC);
            put(i, band(11.5, 13), lineInk);
            if (out > 13 && out < m - 3) {
              const t = 7;
              const tx = Math.floor(along / t), ty = Math.floor((out - 13) / t);
              const lx = along - tx * t, ly = out - 13 - ty * t;
              const grout = Math.min(lx, t - lx, ly, t - ly);
              const h = hash(tx + side * 977, ty, seed + 111);
              const cov = clamp01(grout - 0.5);
              put(i, 1, hex('#2a1d10'));
              if (h < 0.82) put(i, cov, null, (hash(tx + side * 977, ty, seed + 113) - 0.5) * 0.55);
              else if (h < 0.9) put(i, cov, blend(silverC, whiteK, hash(tx, ty, seed + 115) * 0.5));
              else put(i, cov, acc[Math.floor(h * 97) % acc.length]);
            }
            put(i, band(m - 3, m + 1), lineInk);
          }
        }
      await pause();
      if (border === 'vines') {
        const free = m - 11.2;
        const e0 = free / 2;
        const amp = free * mix(0.12, 0.2, mood.energy);
        const len = n - 2 * e0 - 28;
        vine(e0 + 14, e0, 1, 0, len, amp, 0.3, 0);
        vine(n - e0, e0 + 14, 0, 1, len, amp, 1.1, 1);
        vine(n - e0 - 14, n - e0, -1, 0, len, amp, 2.0, 2);
        vine(e0, n - e0 - 14, 0, -1, len, amp, 2.7, 3);
        for (const [cx, cy] of [[e0, e0], [n - e0, e0], [n - e0, n - e0], [e0, n - e0]]) quatrefoil(cx, cy, 9);
      } else if (border === 'bar') {
        const c0 = m - 4.2 - 13 / 2;
        // gold knots at the corners and at the middle of each side, then sprays of ivy from the corners
        const knots = [[c0, c0], [n - c0, c0], [n - c0, n - c0], [c0, n - c0], [n / 2, c0], [n - c0, n / 2], [n / 2, n - c0], [c0, n / 2]];
        knots.forEach(([cx, cy], j) => quatrefoil(cx, cy, j < 4 ? 11 : 8));
        const free = m - 18;
        const e0 = free / 2;
        if (free > 14) {
          const len = (n - 2 * e0) * 0.3;
          leafScale = Math.min(1, (free / 2 - 3) / 15);
          vine(e0 + 16, e0, 1, 0, len, free * 0.1, 0.4, 0);
          vine(e0, e0 + 16, 0, 1, len, free * 0.1, 2.2, 1);
          vine(n - e0 - 16, n - e0, -1, 0, len, free * 0.1, 0.9, 2);
          vine(n - e0, n - e0 - 16, 0, -1, len, free * 0.1, 1.7, 3);
          leafScale = 1;
        }
      }
    } else if (border === 'whiplash') {
      const archInk = Math.max(1.4, wOut * 0.35);
      for (let Y = 0; Y < n; Y++)
        for (let X = 0; X < n; X++) {
          const d = sdArch(X + 0.5, Y + 0.5);
          if (d < -1) continue;
          const i = Y * n + X;
          const edgeD = Math.min(X + 0.5, Y + 0.5, n - X - 0.5, n - Y - 0.5);
          const band = (lo: number, hi: number) => clamp01(Math.min(d - lo, hi - d) + 0.5);
          const eb = (lo: number, hi: number) => clamp01(Math.min(edgeD - lo, hi - edgeD) + 0.5);
          // flat colour field around the arch, with a light lithographic mottle
          const mot = 1 + (mottleN(X, Y) - 0.5) * 0.08;
          put(i, clamp01(d - 0.5) * clamp01(edgeD - 9), [trim0[0] * mot, trim0[1] * mot, trim0[2] * mot]);
          put(i, band(0, archInk), lineInk);
          put(i, band(archInk, archInk + 6), null, 0.08);
          put(i, band(archInk + 6, archInk * 2 + 6), lineInk);
          // the outer frame line
          put(i, eb(5, 6.4), lineInk);
          put(i, eb(6.4, 9), null, 0.05);
          put(i, eb(9, 10.2), lineInk);
          // a band of coloured tiles along the foot
          if (Y > n - m + 16 && Y < n - 16 && X > 16 && X < n - 16) {
            const tw = 12, th = 14;
            const tx = Math.floor((X - 16) / tw), ty = Math.floor((Y - (n - m + 16)) / th);
            const lx = X - 16 - tx * tw, ly = Y - (n - m + 16) - ty * th;
            const grout = Math.min(lx, tw - lx, ly, th - ly);
            const k = tx + ty * 5;
            const pickC = (k * 7 + (k >> 2)) % (acc.length + 2);
            const c = pickC < acc.length ? acc[pickC] : pickC === acc.length ? whiteC : null;
            put(i, 1, lineInk);
            put(i, clamp01(grout - 0.6), c, 0.1);
          }
        }
      await pause();
      // studs along the arch
      const studAt = (cx: number, cy: number) => {
        disc(cx, cy, 4.2, lineInk);
        disc(cx, cy, 3, null, 0.2);
      };
      const off = archInk * 2 + 6 + 7;
      for (let Y = archCy; Y < n - m - 4; Y += 22) {
        studAt(m - off, Y);
        studAt(n - m + off, Y);
      }
      const springA = Math.atan2(-Math.sqrt(Math.max(0, archR * archR - half * half)), -half);
      const steps = Math.floor(((Math.PI / 2 + springA + Math.PI) * (archR + off)) / 22);
      for (let k = 0; k <= steps * 2; k++) {
        const ang = springA + (k / (steps * 2)) * (Math.PI - 2 * (Math.PI + springA));
        studAt(n / 2 + Math.cos(ang) * (archR + off), archCy + Math.sin(ang) * (archR + off));
      }
      // whiplash ribbons in the spandrels: one up the side and one along the top, both curling
      // into a spiral in the corner, swelling in the middle and fine at the ends
      const springY = archCy - Math.sqrt(Math.max(0, archR * archR - half * half));
      const rho = Math.max(12, Math.min(24, (springY - m) * 0.15));
      const bez = (P0: number[], P1: number[], P2: number[], P3: number[], pts: number[]) => {
        for (let k = 0; k <= 48; k++) {
          const t = k / 48, u = 1 - t;
          pts.push(
            u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
            u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1],
          );
        }
        return pts;
      };
      const swell = (t: number) => 0.8 + 8.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.9);
      for (const side of [-1, 1]) {
        const edgeX = side < 0 ? m : n - m;
        const cx = edgeX - side * (rho + 9), cy = m + rho + 9;
        // up the side
        const up = bez([edgeX - side * 6, springY - 12], [edgeX - side * 5, springY * 0.55 + m * 0.45], [edgeX - side * 4, cy + rho * 2.2], [cx - side * rho, cy + rho * 0.2], []);
        spiral(cx - side * rho, cy + rho * 0.2, rho, side < 0 ? Math.PI : 0, 1.5, side, up);
        stroke(up, swell, null, 1.2);
        // along the top, toward the crown of the arch
        const along = bez([n / 2 + side * half * 0.32, m + 6], [n / 2 + side * half * 0.55, m + 3], [cx + side * rho * 3, m + 5], [cx + side * rho * 0.6, cy - rho * 0.9], []);
        spiral(along[along.length - 2], along[along.length - 1], rho * 0.45, side < 0 ? 0 : Math.PI, 1.2, -side, along);
        stroke(along, (t) => 0.7 + 6 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.9), trim1, 1.1);
        disc(cx + side * rho * 2.4, cy + rho * 1.7, 5.2, lineInk);
        disc(cx + side * rho * 2.4, cy + rho * 1.7, 4, trim1);
      }
    }
    await pause();

    // ── 6. The sheet: page, picture, layer, age ─────────────────────────────────────────────
    const fox = new Float32Array(N);
    const foxCount = Math.round(mood.wear * 26 + page.age * 10);
    for (let k = 0; k < foxCount; k++) {
      const cx = rnd() * n, cy = rnd() * n, rad = 2 + rnd() * rnd() * 14, str = 0.06 + rnd() * 0.2;
      const x0 = Math.max(0, Math.floor(cx - rad - 2)), x1 = Math.min(n - 1, Math.ceil(cx + rad + 2));
      const y0 = Math.max(0, Math.floor(cy - rad - 2)), y1 = Math.min(n - 1, Math.ceil(cy + rad + 2));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const d = Math.hypot(x - cx, y - cy) / rad;
          if (d < 1.2) fox[y * n + x] += str * (smooth(1.15, 0.2, d) * 0.7 + smooth(0.25, 0, Math.abs(d - 0.9)) * 0.5);
        }
    }
    const crack = gothic || klimt ? smooth(0.35, 0.9, mood.wear) : 0;
    const fold = nouveau ? smooth(0.4, 0.9, mood.wear) : 0;
    const vigAmount = 0.05 + 0.3 * page.age + 0.25 * mood.wear;
    const out = new Float32Array(N * 3);
    const goldOut = new Float32Array(N);
    const pageTex = coarse(3, (X, Y) => (fbm(X * 0.004, Y * 0.004, seed + 81) - 0.5) * 0.1 + (fbm(X * 0.03, Y * 0.03, seed + 83) - 0.5) * 0.045);
    const crackZone = coarse(6, (X, Y) => smooth(0.42, 0.66, fbm(X * 0.008, Y * 0.008, seed + 93)));
    const edgeWobble = coarse(4, (X, Y) => (fbm(X * 0.02, Y * 0.02, seed + 95) - 0.5) * 0.05);
    // Craquelure cells: one jittered point per 13 px cell, read back as the gap between nearest points.
    const cs = 13, cw = Math.ceil(n / cs) + 3;
    const cellX = new Float32Array(cw * cw), cellY = new Float32Array(cw * cw);
    for (let j = 0; j < cw; j++)
      for (let k = 0; k < cw; k++) {
        cellX[j * cw + k] = k - 1 + hash(k - 1, j - 1, seed + 91);
        cellY[j * cw + k] = j - 1 + hash(k - 1, j - 1, seed + 92);
      }
    for (let Y = 0; Y < n; Y++) {
      if ((Y & 127) === 0) await pause();
      for (let X = 0; X < n; X++) {
        const i = Y * n + X;
        const Xc = X + 0.5, Yc = Y + 0.5;
        const tex = 1 + pageTex(Xc, Yc) + (vnoise(Xc * 0.05, Yc * 0.9, seed + 85) - 0.5) * 0.03;
        let r = pageC[0] * tex, g = pageC[1] * tex, b = pageC[2] * tex;
        if (page.follicles > 0 && hash(X, Y, seed + 87) < 0.0016 * page.follicles) {
          r *= 0.9;
          g *= 0.88;
          b *= 0.85;
        }
        let goldHere = 0;
        const pc = picCover(Xc, Yc);
        if (pc > 0) {
          const sx = Math.min(n - 1.001, Math.max(0, (Xc - ox) / s - 0.5)), sy = Math.min(n - 1.001, Math.max(0, (Yc - oy) / s - 0.5));
          const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
          const p00 = iy * n + ix, p10 = p00 + 1, p01 = p00 + n, p11 = p01 + 1;
          const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
          const pr = pic[p00 * 3] * w00 + pic[p10 * 3] * w10 + pic[p01 * 3] * w01 + pic[p11 * 3] * w11;
          const pgr = pic[p00 * 3 + 1] * w00 + pic[p10 * 3 + 1] * w10 + pic[p01 * 3 + 1] * w01 + pic[p11 * 3 + 1] * w11;
          const pb = pic[p00 * 3 + 2] * w00 + pic[p10 * 3 + 2] * w10 + pic[p01 * 3 + 2] * w01 + pic[p11 * 3 + 2] * w11;
          const pg = picGold[p00] * w00 + picGold[p10] * w10 + picGold[p01] * w01 + picGold[p11] * w11;
          // the page's grain shows through paint, much less through leaf
          const through = 1 + (tex - 1) * (0.55 - 0.4 * pg);
          r = mix(r, pr * through, pc);
          g = mix(g, pgr * through, pc);
          b = mix(b, pb * through, pc);
          goldHere = pg * pc;
          if (crack > 0) {
            const cx = Xc / cs, cy = Yc / cs, ix2 = Math.floor(cx), iy2 = Math.floor(cy);
            let d1 = 9, d2 = 9;
            for (let j = 0; j <= 2; j++)
              for (let k = 0; k <= 2; k++) {
                const q = (iy2 + j) * cw + ix2 + k;
                const dx = cx - cellX[q], dy = cy - cellY[q];
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < d1) {
                  d2 = d1;
                  d1 = d;
                } else if (d < d2) d2 = d;
              }
            const cm = smooth(0.08, 0.02, d2 - d1) * crack * crackZone(Xc, Yc) * pc;
            r *= 1 - 0.38 * cm;
            g *= 1 - 0.4 * cm;
            b *= 1 - 0.42 * cm;
          }
        }
        if (la[i] > 0) {
          let cr = lr[i], cg = lg[i], cb = lb[i];
          if (lgo[i] > 0) {
            goldAt(Xc, Yc, 0, lt[i] / lgo[i], 0, 0, 1, false);
            cr += gr * lgo[i];
            cg += gg * lgo[i];
            cb += gb * lgo[i];
          }
          const k = 1 - la[i];
          const through = 1 + (tex - 1) * 0.4;
          r = r * k + cr * through;
          g = g * k + cg * through;
          b = b * k + cb * through;
          goldHere = goldHere * k + lgo[i];
        }
        if (fold > 0) {
          const fd = Math.min(Math.abs(Xc - n / 2), Math.abs(Yc - n / 2));
          const light = smooth(1.6, 0.2, fd) * fold * 0.22;
          const dark = smooth(3.5, 1.4, fd) * smooth(0.4, 1.4, fd) * fold * 0.1;
          r = mix(r, 1, light) * (1 - dark);
          g = mix(g, 1, light) * (1 - dark);
          b = mix(b, 1, light) * (1 - dark);
        }
        const f = fox[i] * (1 - goldHere * 0.6);
        if (f > 0) {
          r *= 1 - f * 0.55;
          g *= 1 - f * 0.75;
          b *= 1 - f;
        }
        const edge = Math.min(Xc, Yc, n - Xc, n - Yc) / n;
        const vig = (1 - smooth(0, 0.16, edge + edgeWobble(Xc, Yc))) * vigAmount;
        r *= 1 - vig * 0.32;
        g *= 1 - vig * 0.42;
        b *= 1 - vig * 0.58;
        out[i * 3] = r;
        out[i * 3 + 1] = g;
        out[i * 3 + 2] = b;
        goldOut[i] = goldHere;
      }
    }

    // Four-pointed glints where the raking light crosses burnished leaf.
    const stars = Math.round(mix(3, 13, mood.energy) * leaf.stars);
    for (let made = 0, tries = 0; made < stars && tries < 900; tries++) {
      const X = 8 + rnd() * (n - 16), Y = 8 + rnd() * (n - 16);
      const i = (Y | 0) * n + (X | 0);
      if (goldOut[i] < 0.9) continue;
      const u = (X + 0.45 * Y) / n;
      const band = Math.exp(-(((u - sweepU) / (sweepW * 1.5)) ** 2));
      if (band < 0.3 && rnd() > 0.12) continue;
      const len = 4 + rnd() * 8, I = 0.5 + 0.5 * band;
      const R = Math.ceil(len);
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) {
          const x = (X | 0) + dx, y = (Y | 0) + dy;
          if (x < 0 || y < 0 || x >= n || y >= n) continue;
          const ax = Math.abs(dx), ay = Math.abs(dy);
          const v =
            Math.max(Math.exp(-ay * 1.7) * Math.max(0, 1 - ax / len), Math.exp(-ax * 1.7) * Math.max(0, 1 - ay / len)) +
            Math.exp(-(dx * dx + dy * dy) / 2.5) * 0.6;
          const t = Math.min(1, v * I);
          const j = (y * n + x) * 3;
          out[j] += (gGlint[0] - out[j]) * t;
          out[j + 1] += (gGlint[1] - out[j + 1]) * t;
          out[j + 2] += (gGlint[2] - out[j + 2]) * t;
        }
      made++;
    }

    const pixels = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      pixels[i * 4] = out[i * 3] * 255;
      pixels[i * 4 + 1] = out[i * 3 + 1] * 255;
      pixels[i * 4 + 2] = out[i * 3 + 2] * 255;
      pixels[i * 4 + 3] = 255;
    }
    const giltCount = [...gilt].filter(Boolean).length;
    return {
      pixels,
      notes: [
        TRADITION_NAMES[a.tradition] ?? a.tradition,
        `${a.leaf} leaf, ${backGold ? 'gilded ground' : 'painted ground'}${giltCount ? `, ${giltCount} gilded surface${giltCount > 1 ? 's' : ''}` : ''}${haloOn ? ', halo' : ''}`,
        `${a.motif} motif, ${a.palette} pigments on ${a.page}`,
        `${border} border, outline ${a.outline.toFixed(2)}`,
      ],
    };
  },
});
