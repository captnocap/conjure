import { type Palette as Colours, type PaletteRole, choice, clamp01, defineLook, fromOklch, mix, oklch, paintRGB, rekey, score, seeded } from '@conjure/kit';
import { distanceTransform } from './sdf';

/**
 * A mosaic laid over the frame, after the Pompeii card: an edge map from identity, colour,
 * normals and depth; a distance field from those edges; stones walked along the contour bands of
 * that field (andamento), each turned to the contour; offset rows to fill the open ground; then
 * every stone rasterised as a weighted L-infinity Voronoi so the joints fall on the bisectors.
 * The layout runs at full size over a map of stone sizes: small stones for small and distant
 * things, larger ones for the calm ground, so a whole room still reads.
 */

type RGB = [number, number, number];
const hex = (value: string): RGB => [
  parseInt(value.slice(1, 3), 16) / 255,
  parseInt(value.slice(3, 5), 16) / 255,
  parseInt(value.slice(5, 7), 16) / 255,
];

// ------------------------------------------------------------------ OKLab, for matching stones by eye
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toDisplay = (c: number) => {
  const v = Math.max(0, Math.min(1, c));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
};
function toLab(r: number, g: number, b: number): RGB {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromLab(L: number, A: number, B: number): RGB {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    toDisplay(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toDisplay(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toDisplay(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

// ------------------------------------------------------------------ repeatable noise
function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const fbm = (x: number, y: number, s: number) =>
  noise(x, y, s) * 0.55 + noise(x * 2.1 + 7.3, y * 2.1 - 3.1, s + 1) * 0.3 + noise(x * 4.3 - 1.7, y * 4.3 + 9.2, s + 2) * 0.15;

// ------------------------------------------------------------------ traditions
type Shape = 'cube' | 'smalti' | 'pebble' | 'shard';
/** Border inks: ground, dark, accent A light/dark, accent B light/dark, pearl. */
type Inks = [string, string, string, string, string, string, string];
interface Tradition {
  /** Stocks of stone or glass; each is cut in four shades. */
  hues: string[];
  /** Extra stones used as they are. */
  neutrals: string[];
  chroma: number;
  contrast: number;
  size: number;
  shape: Shape;
  /** Dark stones laid along a figure's outline, or null. */
  outline: string | null;
  /** Pale stones of the halo around figures, or null to keep the ground's colour. */
  halo: string | null;
  inks: Inks;
  /** How many rows inside a figure follow its contours before filling in rows. */
  thingRings: number;
  joint: number;
  bevel: number;
  tilt: number;
  gloss: number;
  variety: number;
}

const TRADITIONS = {
  roman: {
    hues: ['#e3d5b5', '#d2a445', '#c0603a', '#a8322a', '#d49a88', '#7a5236', '#8a857c', '#6c7c94', '#7d9a5a', '#3e5a36', '#3f5f9e', '#3f8c8a', '#c98a3a'],
    neutrals: ['#f4f0e6', '#ebe4d4', '#2b2420', '#46322a', '#5c5650', '#b8b2a6'],
    chroma: 0.95, contrast: 1.08, size: 1, shape: 'cube', outline: '#33241d', halo: '#f3efe5',
    inks: ['#efe9dc', '#2b2420', '#a8322a', '#7c221d', '#d0a23c', '#9c6c1c', '#f7f3ea'],
    thingRings: 99, joint: 1, bevel: 0.12, tilt: 0.05, gloss: 0, variety: 1,
  },
  ostia: {
    hues: [], neutrals: ['#ebe6da', '#221f1c'],
    chroma: 0, contrast: 1, size: 1, shape: 'cube', outline: null, halo: '#ebe6da',
    inks: ['#ebe6da', '#221f1c', '#3a3631', '#221f1c', '#bdb7ab', '#221f1c', '#ebe6da'],
    thingRings: 99, joint: 1, bevel: 0.12, tilt: 0.05, gloss: 0, variety: 1,
  },
  byzantine: {
    hues: ['#1d2f86', '#3f63c0', '#2a8f96', '#2b7a3f', '#b3202a', '#6a2e6e', '#d9a68a', '#6b3d25', '#d4a63a', '#c9ccd2', '#e07a2a'],
    neutrals: ['#efe9dc', '#1c1717', '#f6f0e0'],
    chroma: 1.5, contrast: 1.14, size: 0.95, shape: 'smalti', outline: '#2a1410', halo: null,
    inks: ['#d4a63a', '#17246e', '#b3202a', '#6e1218', '#2b7a3f', '#174a26', '#f1ece0'],
    thingRings: 99, joint: 0.9, bevel: 0.17, tilt: 0.15, gloss: 0.12, variety: 1.2,
  },
  pebble: {
    hues: ['#d6c7a6', '#b8955e', '#98805c', '#8a8781', '#9a5a40', '#75785a', '#6d7884'],
    neutrals: ['#ece5d3', '#55534f', '#2a2826', '#f3eee2'],
    chroma: 0.85, contrast: 1.12, size: 1.2, shape: 'pebble', outline: '#2a2826', halo: '#ece5d3',
    inks: ['#e9e2cf', '#2a2826', '#9a5a40', '#6b3a28', '#b8955e', '#7d6440', '#f3eee2'],
    thingRings: 99, joint: 1.15, bevel: 0, tilt: 0.08, gloss: 0.05, variety: 1.1,
  },
  trencadis: {
    hues: ['#1f4fb4', '#4aa0dc', '#2fb0b0', '#3a9a3c', '#9cc23a', '#f2c230', '#ee7a1e', '#d6322a', '#e87aa0', '#c8902a', '#7a4ab0'],
    neutrals: ['#f4f2ec', '#f0e2b8', '#1c2440'],
    chroma: 1.9, contrast: 1.1, size: 1.75, shape: 'shard', outline: '#1c2440', halo: '#f6f4ee',
    inks: ['#f4f2ec', '#1f4fb4', '#d6322a', '#a0221c', '#f2c230', '#ee7a1e', '#ffffff'],
    thingRings: 3, joint: 1.4, bevel: 0.1, tilt: 0.07, gloss: 0.6, variety: 1.3,
  },
} as const satisfies Record<string, Tradition>;

/**
 * How each tradition takes the picture's palette. Roman and pebble floors keep their natural stones
 * (Rome lets its few cool glass stones answer in the second colour), Ostia stays black and white,
 * Byzantium keeps its gold, flesh and silver but re-keys its coloured glass, and trencadis follows the
 * palette fully. The border's two accent strands follow everywhere but Ostia and the pebbles.
 */
type Role = PaletteRole | undefined;
const KEYING: Record<string, { hues?: Role[] | 'split'; neutrals?: Role[]; inks: Role[] }> = {
  roman: { hues: [, , , , , , , 'second', 'second', 'second', 'second', 'second'], inks: ['ground', , 'ink', 'ink', 'second', 'second'] },
  byzantine: { hues: ['second', 'second', 'second', 'second', 'ink', 'ink', , , , , 'ink'], inks: [, 'second', 'ink', 'ink', 'second', 'second'] },
  trencadis: { hues: 'split', neutrals: [, 'ground'], inks: [, 'second', 'ink', 'ink', 'second', 'second'] },
};
/** Re-key a list of hex stones by role; each role keeps its hue offsets, drawn in by half so the palette reads. */
function rekeyStones(list: readonly string[], palette: Colours | undefined, roles: Role[] | 'split'): string[] {
  if (!palette || !list.length) return list.slice();
  const bytes = list.map((h) => hex(h).map((v) => v * 255) as unknown as readonly [number, number, number]);
  const lch = bytes.map(oklch);
  const anchor = lch.reduce((best, c, i) => (c[1] > lch[best][1] ? i : best), 0);
  const role = (i: number): Role => {
    if (roles !== 'split') return roles[i];
    const [, C, h] = lch[i];
    if (C < 0.03) return undefined;
    return Math.abs(Math.atan2(Math.sin(h - lch[anchor][2]), Math.cos(h - lch[anchor][2]))) < 0.9 ? 'ink' : 'second';
  };
  const out = rekey(Object.fromEntries(bytes.map((c, i) => [i, c])), palette, Object.fromEntries(list.map((_, i) => [i, role(i)])));
  return list.map((h, i) => {
    const r = role(i);
    if (!r) return h;
    const [L, C, hue] = oklch(out[i]);
    const target = oklch(paintRGB(palette[r]))[2];
    const c = fromOklch(L, C, target + Math.atan2(Math.sin(hue - target), Math.cos(hue - target)) * 0.5);
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  });
}

const GROUT: Record<string, string> = { lime: '#d6cdb9', grey: '#8e8a82', dark: '#34302c', red: '#a8644c', white: '#f0ede5' };
const SETTINGS = {
  floor: { bevel: 0.7, dome: 0.02, tilt: 0.6, gloss: 0 },
  wall: { bevel: 1.25, dome: 0.05, tilt: 1.7, gloss: 0.25 },
  excavated: { bevel: 1, dome: 0.04, tilt: 1, gloss: 0 },
  wet: { bevel: 1.1, dome: 0.04, tilt: 1, gloss: 0.55 },
} as const;

interface Palette {
  lab: Float32Array;
  rgb: Float32Array;
  size: number;
}
/** The box of stones: matched by their designed colour (`lab`), laid in their keyed colour (`rgb`). */
function buildPalette(tradition: Tradition, keyedHues: readonly string[] = tradition.hues, keyedNeutrals: readonly string[] = tradition.neutrals): Palette {
  const shades = (hues: readonly string[], neutrals: readonly string[] = tradition.neutrals) => {
    const entries: RGB[] = [];
    for (const stock of hues) {
      const [L, A, B] = toLab(...hex(stock));
      for (const offset of [-0.25, -0.12, 0, 0.1]) {
        const keep = offset > 0 ? 1 - offset * 3 : 1 - Math.abs(offset) * 0.5;
        entries.push(fromLab(Math.max(0.18, Math.min(0.96, L + offset)), A * keep, B * keep));
      }
    }
    for (const stone of neutrals) entries.push(hex(stone));
    return entries;
  };
  const designed = shades(tradition.hues), keyed = shades(keyedHues, keyedNeutrals);
  const lab = new Float32Array(designed.length * 3), rgb = new Float32Array(designed.length * 3);
  designed.forEach((entry, i) => {
    const [L, A, B] = toLab(...entry);
    lab.set([L, A, B], i * 3);
    rgb.set(keyed[i], i * 3);
  });
  return { lab, rgb, size: designed.length };
}
/** The nearest stones in the box, one of the closest three chosen with a little chance. */
function pick(palette: Palette, L: number, A: number, B: number, spread: number, roll: number): number {
  let i0 = 0, i1 = 0, i2 = 0, d0 = Infinity, d1 = Infinity, d2 = Infinity;
  const { lab, size } = palette;
  for (let i = 0; i < size; i++) {
    const dl = lab[i * 3] - L, da = lab[i * 3 + 1] - A, db = lab[i * 3 + 2] - B;
    const d = dl * dl + 1.6 * (da * da + db * db);
    if (d < d0) (d2 = d1), (i2 = i1), (d1 = d0), (i1 = i0), (d0 = d), (i0 = i);
    else if (d < d1) (d2 = d1), (i2 = i1), (d1 = d), (i1 = i);
    else if (d < d2) (d2 = d), (i2 = i);
  }
  const tau = 0.0016 * spread;
  const w1 = d1 < Infinity ? Math.exp(-(d1 - d0) / tau) : 0, w2 = d2 < Infinity ? Math.exp(-(d2 - d0) / tau) : 0;
  const t = roll * (1 + w1 + w2);
  return t < 1 ? i0 : t < 1 + w1 ? i1 : i2;
}

// ------------------------------------------------------------------ border motifs, in stone units
const ZONE = 7;
const WAVE_P = 9, KEY_P = 6, ROPE_P = 8, GEM_P = 8;
/** A running wave, stone by stone from the outer edge up: a dark swell rising to a crest that curls over. */
const WAVE = ['#########', '######...', '.####....', '..###.#..', '...###..#', '....#####', '.....###.'];
/** A jewelled ribbon: a cut gem with a glint, then a pair of pearls; G light and g shaded facets. */
const JEWELS = ['00000000', '111g1111', '11ggg116', '1GGGGg11', '11HGG116', '111G1111', '00000000'];
const KEY = ['XXXXXX', 'X.....', 'X.XXX.', 'X...X.', 'XXXXX.'];
const wrap = (value: number, period: number) => ((value % period) + period) % period;

/** Ink index for a point of the motif zone: u along the band, y from its outer side, both in stones. */
function motif(kind: string, u: number, y: number): number {
  if (kind === 'wave') return WAVE[Math.min(ZONE - 1, Math.max(0, Math.floor(y)))][Math.floor(wrap(u, WAVE_P))] === '#' ? 1 : 0;
  if (kind === 'meander') {
    const row = Math.floor(y);
    if (row < 1 || row > 5) return 0;
    return KEY[row - 1][Math.floor(wrap(u, KEY_P))] === 'X' ? 1 : 0;
  }
  if (kind === 'guilloche') {
    const x = wrap(u, ROPE_P), y0 = ZONE / 2, A = 1.45, w = 0.95, line = 0.55;
    const phase = (x / ROPE_P) * Math.PI * 2;
    const slope = A * ((Math.PI * 2) / ROPE_P) * Math.cos(phase);
    const k = 1 / Math.sqrt(1 + slope * slope);
    const d0 = Math.abs(y - (y0 + A * Math.sin(phase))) * k, d1 = Math.abs(y - (y0 - A * Math.sin(phase))) * k;
    let ink = 0;
    const eye = x < ROPE_P / 2 ? ROPE_P / 4 : (3 * ROPE_P) / 4;
    if (Math.hypot(x - eye, y - y0) < 0.6) ink = 1;
    const over = Math.floor(x / (ROPE_P / 2) + 0.5) & 1;
    for (const strand of over ? [0, 1] : [1, 0]) {
      const d = strand ? d1 : d0;
      if (d < w) ink = strand ? (d < w * 0.5 ? 4 : 5) : d < w * 0.5 ? 2 : 3;
      else if (d < w + line) ink = 1;
    }
    return ink;
  }
  if (kind === 'jewels') {
    const row = JEWELS[Math.min(ZONE - 1, Math.max(0, Math.floor(y)))];
    const cell = row[Math.floor(wrap(u, GEM_P))];
    const red = Math.floor(u / GEM_P) % 2 === 0;
    return cell === '0' ? 0 : cell === '1' ? 1 : cell === 'G' ? (red ? 2 : 4) : cell === 'g' ? (red ? 3 : 5) : 6;
  }
  return 0;
}
/** Plain bands, row by row from the outside in. */
const BANDS = [1, 0, 2, 2, 2, 2, 3, 4, 1, 0, 1];

const BAND = 255, HALO = 254, LIMIT = 1.45;
const ROW = -1;
const NEIGHBOURS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];

export default defineLook({
  questions: {
    tradition: choice('Which mosaic tradition lays the picture?', {
      roman: 'A Roman villa floor in the Pompeii manner: matte marble and limestone cubes in cream, ochre, terracotta and rose with a few cooler coloured stones, figures outlined in dark stone and haloed in white, rows following every contour.',
      ostia: 'A black-and-white Roman bath floor, as at Ostia: figures as black silhouettes with white lines for their details, on a white ground. Stark, graphic, classical.',
      byzantine: 'A Byzantine church mosaic: glittering gold smalti grounds (deep starry blue in cold light), deep jewel-toned glass, everything shimmering and solemn.',
      pebble: 'A Greek pebble mosaic, as at Pella: rounded river pebbles in natural whites, ochres, greys and blacks set in dark mortar, soft and domed.',
      trencadis: "Gaudi's trencadis: broken glazed tiles and plates in bright, saturated glazes and white, glossy irregular shards in wide white joints. Barcelona, playful, sunny.",
    }),
    stone: score('How large are the stones?', [
      'Minute vermiculatum chips, almost painterly',
      'Small and fine',
      'Ordinary floor tesserae',
      'Large',
      'Big chunky cubes, bold and blocky',
    ]),
    grout: choice('What colour is the mortar between the stones?', {
      lime: 'Warm pale lime mortar: soft, ancient, sunlit.',
      grey: 'Mid grey cement: neutral and workmanlike.',
      dark: 'Charcoal-dark joints: every stone outlined, jewel-like and graphic.',
      red: 'Pinkish-red crushed-brick mortar, opus signinum: warm, Roman, earthy.',
      white: 'Bright white joints: crisp, modern, Mediterranean.',
    }),
    joint: score('How wide are the joints between the stones?', [
      'Hairline: stones butted tight',
      'Narrow',
      'Ordinary',
      'Open',
      'Wide: every stone set apart in its bed',
    ]),
    border: choice('What border frames the picture?', {
      wave: 'A running wave scroll: dark waves curling over and over around the edge.',
      meander: 'A Greek key meander: a squared line folding back on itself all the way round.',
      guilloche: 'A guilloche: two coloured strands braided like a rope, with dark eyes between them.',
      jewels: 'A jewelled band: oval gems and pairs of pearls set in a dark ribbon.',
      bands: 'Plain coloured bands: a broad strong-coloured frame ruled with dark and contrasting lines.',
      none: 'No border: the picture runs out to the edge.',
    }),
    halo: score('How strongly is each figure set off by a halo of pale stones laid around it?', [
      'No halo: figures sit straight on the ground',
      'A single row',
      'A couple of rows',
      'A broad halo',
      'A wide halo of many rows',
    ]),
    laying: choice('How are the stones of the open ground laid?', {
      rows: 'In straight offset rows like brickwork: calm and orderly.',
      ripples: 'In rings echoing every outline, rippling out to the edges.',
      fans: 'In overlapping fans or scales, like cobbled paving.',
      diagonal: 'In rows set on the diagonal: brisk and slanting.',
      scatter: 'Crazy paving: stones at random, each turned its own way.',
    }),
    setting: choice('What has become of the mosaic?', {
      floor: 'A floor polished flat by centuries of feet: level, matte and tight.',
      wall: 'High on a wall or vault: each stone pressed in at its own small tilt, so the surface glitters unevenly.',
      excavated: 'Just uncovered at a dig: patches lost to the bare mortar bed with the red underdrawing showing, dust in every joint.',
      wet: 'Sponged with water to show the colours: deep, saturated stones with wet highlights.',
    }),
  },

  async apply(capture, a, context, signal) {
    const n = capture.size;
    const N = n * n;
    const T: Tradition = TRADITIONS[a.tradition];
    const S = SETTINGS[a.setting];
    const mood = context.mood;
    const seed = (context.seed % 100_000) + 31;
    const random = seeded(context.seed ^ 0x3e55e7a);
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const { color, normal, depth, identity, diffuse } = capture;

    // ---------------------------------------------------------------- features at full size
    const id = new Uint8Array(N);
    const cr = new Float32Array(N), cg = new Float32Array(N), cb = new Float32Array(N);
    const dep = new Float32Array(N);
    const tones = new Uint32Array(256);
    let solid = 0;
    for (let p = 0; p < N; p++) {
      id[p] = identity[p * 4];
      cr[p] = color[p * 4] / 255;
      cg[p] = color[p * 4 + 1] / 255;
      cb[p] = color[p * 4 + 2] / 255;
      dep[p] = (depth[p * 4] * 65536 + depth[p * 4 + 1] * 256 + depth[p * 4 + 2]) / 16777216;
      if (id[p] > 0) (tones[diffuse[p * 4]]++, solid++);
    }
    let lit = 255;
    for (let seen = 0; lit > 20 && seen < solid * 0.05; lit--) seen += tones[lit];
    // A lightly softened copy for edges, so render speckle does not draw contours.
    const soft = (source: Float32Array) => {
      const out = new Float32Array(N);
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          let sum = 0, count = 0;
          for (let j = Math.max(0, y - 1); j <= Math.min(n - 1, y + 1); j++)
            for (let i = Math.max(0, x - 1); i <= Math.min(n - 1, x + 1); i++) (sum += source[j * n + i]), count++;
          out[y * n + x] = sum / count;
        }
      return out;
    };
    const sr = soft(cr), sg = soft(cg), sb = soft(cb);
    await pause();
    const depthScale = (capture.far - capture.near) / Math.max(1e-6, capture.pixelWorldSize);
    const normalDot = (p: number, q: number) =>
      (normal[p * 4] / 127.5 - 1) * (normal[q * 4] / 127.5 - 1) +
      (normal[p * 4 + 1] / 127.5 - 1) * (normal[q * 4 + 1] / 127.5 - 1) +
      (normal[p * 4 + 2] / 127.5 - 1) * (normal[q * 4 + 2] / 127.5 - 1);
    // Every contour the rows follow, and the main lines of the set: its silhouette against the
    // backdrop, where floor meets set, folds and steps in depth. Those are ruled in dark stone.
    const edge = new Uint8Array(N), major = new Uint8Array(N);
    for (let y = 0; y < n - 1; y++)
      for (let x = 0; x < n - 1; x++) {
        const p = y * n + x;
        for (let side = 0; side < 2; side++) {
          const q = side ? p + n : p + 1;
          const ip = id[p], iq = id[q];
          if (ip !== iq) {
            edge[p] = 1;
            // A towel on the sand is no main line; the set's silhouette, a step or a fold is.
            if (ip <= 2 && iq <= 2 && (ip === 0 || iq === 0 || normalDot(p, q) < 0.55 || Math.abs(dep[p] - dep[q]) * depthScale > 14)) major[p] = 1;
            continue;
          }
          if (Math.abs(sr[p] - sr[q]) + Math.abs(sg[p] - sg[q]) + Math.abs(sb[p] - sb[q]) > 0.16) edge[p] = 1;
          if (ip === 0) continue;
          const dot = normalDot(p, q), jump = Math.abs(dep[p] - dep[q]) * depthScale;
          if (dot < 0.82 || jump > 6) edge[p] = 1;
          if (ip <= 2 && (dot < 0.55 || jump > 14)) major[p] = 1;
        }
      }
    await pause();

    // ---------------------------------------------------------------- how large each stone is, place by place
    // A mosaicist cuts small tesserae for figures and distant things and keeps the big ones for
    // the calm ground. Each thing's stones are sized to its thickness on screen; the set and the
    // ground are laid finer where they carry drawing and around the things that stand on them.
    const smooth = (e0: number, e1: number, v: number) => {
      const t = clamp01((v - e0) / (e1 - e0));
      return t * t * (3 - 2 * t);
    };
    const boxBlur = (source: Float32Array, r: number) => {
      const across = new Float32Array(N), out = new Float32Array(N);
      for (let y = 0; y < n; y++) {
        let sum = 0;
        const row = y * n;
        for (let x = -r; x <= r; x++) sum += source[row + Math.min(n - 1, Math.max(0, x))];
        for (let x = 0; x < n; x++) {
          across[row + x] = sum / (2 * r + 1);
          sum += source[row + Math.min(n - 1, x + r + 1)] - source[row + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < n; x++) {
        let sum = 0;
        for (let y = -r; y <= r; y++) sum += across[Math.min(n - 1, Math.max(0, y)) * n + x];
        for (let y = 0; y < n; y++) {
          out[y * n + x] = sum / (2 * r + 1);
          sum += across[Math.min(n - 1, y + r + 1) * n + x] - across[Math.max(0, y - r) * n + x];
        }
      }
      return out;
    };
    const bordered = a.border !== 'none';
    const RINGS = 11;
    const sb0 = mix(5.4, 7, a.stone) * (a.tradition === 'trencadis' ? 1.2 : a.tradition === 'pebble' ? 1.08 : 1);
    const band = bordered ? RINGS * sb0 : 0;
    const s = mix(6, 15, a.stone) * T.size;
    const smallest = T.shape === 'shard' ? 3.6 : T.shape === 'pebble' ? 3.4 : 3;
    const area = new Float64Array(256), rim = new Float64Array(256);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const p = y * n + x, c = id[p];
        area[c]++;
        if ((x > 0 && id[p - 1] !== c) || (x < n - 1 && id[p + 1] !== c) || (y > 0 && id[p - n] !== c) || (y < n - 1 && id[p + n] !== c)) rim[c]++;
      }
    const sizeOf = new Float32Array(256), thickOf = new Float32Array(256);
    sizeOf[0] = s * 1.08;
    sizeOf[1] = s;
    sizeOf[2] = s * 0.95;
    sizeOf[HALO] = s * 0.92;
    const across = mix(4.2, 3, a.stone);
    for (let k = 3; k < 254; k++) {
      if (!area[k]) continue;
      // Thickness on screen: a strip's width, a disc's radius.
      thickOf[k] = (2 * area[k]) / Math.max(1, rim[k]);
      const byArea = s * 0.84 * Math.min(1, Math.max(0.5, Math.sqrt(area[k]) / (s * 11)));
      sizeOf[k] = Math.max(smallest, Math.min(byArea, thickOf[k] / across));
    }
    let anyThing = false;
    for (let k = 3; k < 254; k++) if (area[k]) anyThing = true;
    const things = distanceTransform((p) => id[p] >= 3, n, n);
    const thingField = things.distance, thingFrom = things.from;
    const nearestThing = (p: number) => Math.min(253, id[thingFrom[p]]);
    const haloRows = Math.round(a.halo * 5);
    // A halo is never wider than a quarter of the figure it sets off, so a small figure is set off
    // by its dark outline alone instead of a pale blot.
    const haloOf = new Float32Array(256);
    for (let k = 3; k < 254; k++)
      if (area[k] && haloRows) haloOf[k] = Math.min(haloRows, Math.floor(thickOf[k] / sizeOf[k] / 4)) * sizeOf[k];

    const density = boxBlur(Float32Array.from(edge), Math.max(3, Math.round(s * 0.9)));
    // A busy set, a whole room of furniture, is laid in smaller stones throughout than a calm
    // studio floor: its ordinary size comes down with how much drawing it carries.
    {
      const busy = new Float64Array(3), count = new Float64Array(3);
      for (let p = 0; p < N; p++) if (id[p] === 1 || id[p] === 2) (busy[id[p]] += density[p]), count[id[p]]++;
      for (const c of [1, 2]) if (count[c]) sizeOf[c] *= mix(1, 0.62, smooth(0.03, 0.12, busy[c] / count[c]));
    }
    const openMin = Math.max(smallest * 1.15, s * 0.4);
    let sz = new Float32Array(N);
    for (let p = 0; p < N; p++) {
      const c = id[p];
      if (c >= 3) {
        sz[p] = sizeOf[Math.min(253, c)];
        continue;
      }
      const base = sizeOf[c];
      let size = c > 0 ? mix(base, openMin, smooth(0.05, 0.2, density[p])) : base;
      if (anyThing) size = Math.min(size, mix(sizeOf[nearestThing(p)] * 1.2, base, clamp01(thingField[p] / (2.5 * base))));
      sz[p] = size;
    }
    sz = boxBlur(sz, Math.max(2, Math.round(s * 0.5)));
    const cls = new Uint8Array(N);
    let largest = sb0, finest = Infinity;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const p = y * n + x;
        if (bordered && Math.min(x + 0.5, y + 0.5, n - x - 0.5, n - y - 0.5) < band) cls[p] = BAND;
        else if (id[p] <= 2 && haloRows > 0 && anyThing && thingField[p] < haloOf[nearestThing(p)]) {
          cls[p] = HALO;
          sz[p] = sizeOf[nearestThing(p)];
        } else cls[p] = Math.min(253, id[p]);
        if (id[p] >= 3) sz[p] = sizeOf[Math.min(253, id[p])];
        largest = Math.max(largest, sz[p]);
        finest = Math.min(finest, sz[p]);
      }
    const site = new Uint8Array(N), outline = new Uint8Array(N);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const p = y * n + x;
        const differs = (x < n - 1 && cls[p] !== cls[p + 1]) || (y < n - 1 && cls[p] !== cls[p + n]);
        if (differs) outline[p] = 1;
        if (differs || edge[p]) site[p] = 1;
      }
    const field = distanceTransform((p) => site[p] === 1, n, n).distance;
    const fromOutline = distanceTransform((p) => outline[p] === 1, n, n).distance;
    // Only long lines are main lines: the folds and steps of clutter are left to the colours.
    {
      const stack = new Int32Array(N), seen = new Uint8Array(N), members: number[] = [];
      for (let p0 = 0; p0 < N; p0++) {
        if (!major[p0] || seen[p0]) continue;
        members.length = 0;
        let top = 0;
        stack[top++] = p0;
        seen[p0] = 1;
        while (top) {
          const p = stack[--top];
          members.push(p);
          const x = p % n, y = (p / n) | 0;
          for (let j = Math.max(0, y - 1); j <= Math.min(n - 1, y + 1); j++)
            for (let i = Math.max(0, x - 1); i <= Math.min(n - 1, x + 1); i++) {
              const q = j * n + i;
              if (major[q] && !seen[q]) (seen[q] = 1), (stack[top++] = q);
            }
        }
        if (members.length < 120) for (const p of members) major[p] = 0;
      }
    }
    const fromMajor = distanceTransform((p) => major[p] === 1, n, n).distance;
    await pause();

    // ---------------------------------------------------------------- the stone list and its spacing grid
    const xs: number[] = [], ys: number[] = [], sizes: number[] = [], widths: number[] = [], angles: number[] = [];
    const classes: number[] = [], rings: number[] = [], inks: number[] = [];
    const CELL = 6, G = Math.ceil(n / CELL);
    const head = new Int32Array(G * G).fill(-1);
    const next: number[] = [];
    const place = (x: number, y: number, size: number, factor: number, angle: number, c: number, ring: number, ink = -1, width = size): boolean => {
      if (!(x >= 0 && y >= 0 && x < n && y < n)) return false;
      const reach = Math.ceil((factor * (size + largest)) / 2 / CELL);
      const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
      for (let j = Math.max(0, gy - reach); j <= Math.min(G - 1, gy + reach); j++)
        for (let i = Math.max(0, gx - reach); i <= Math.min(G - 1, gx + reach); i++)
          for (let k = head[j * G + i]; k >= 0; k = next[k]) {
            const need = (factor * (size + sizes[k])) / 2, dx = xs[k] - x, dy = ys[k] - y;
            if (dx * dx + dy * dy < need * need) return false;
          }
      const k = xs.length;
      xs.push(x);
      ys.push(y);
      sizes.push(size);
      widths.push(width);
      angles.push(angle);
      classes.push(c);
      rings.push(ring);
      inks.push(ink);
      next.push(head[gy * G + gx]);
      head[gy * G + gx] = k;
      return true;
    };
    const wobble = mix(0.7, 1.6, mood.energy);

    // ---------------------------------------------------------------- the border: rows along each side, squares in the corners
    if (bordered) {
      const P = a.border === 'wave' ? WAVE_P : a.border === 'meander' ? KEY_P : a.border === 'guilloche' ? ROPE_P : GEM_P;
      const inkFor = (u: number, row: number) =>
        a.border === 'bands' ? BANDS[row] : row === 0 || row === RINGS - 1 ? 1 : row === 1 || row === RINGS - 2 ? 0 : motif(a.border, u, row - 2 + 0.5);
      const length = n - 2 * band;
      const periods = Math.max(1, Math.round(length / (P * sb0)));
      const along = length / (periods * P);
      for (let side = 0; side < 4; side++)
        for (let row = 0; row < RINGS; row++) {
          const v = (row + 0.5) * sb0;
          let u = 0;
          for (let period = 0; period < periods; period++) {
            const cuts: number[] = [];
            for (let j = 0; j < P; j++) cuts.push(0.86 + random() * 0.28);
            const total = cuts.reduce((sum, cut) => sum + cut, 0);
            for (let j = 0; j < P; j++) {
              const w = (cuts[j] / total) * P * along;
              const centre = u + w / 2;
              u += w;
              const t = band + centre;
              const [x, y, angle] =
                side === 0 ? [t, v, 0] : side === 1 ? [n - v, t, Math.PI / 2] : side === 2 ? [n - t, n - v, Math.PI] : [v, n - t, -Math.PI / 2];
              place(x, y, sb0, 0.5, angle + (random() - 0.5) * 0.08, BAND, row, inkFor(centre / along, row), w);
            }
          }
        }
      for (let corner = 0; corner < 4; corner++)
        for (let j = 0; j < RINGS; j++)
          for (let i = 0; i < RINGS; i++) {
            const ox = corner === 0 || corner === 3 ? 0 : n - band, oy = corner < 2 ? 0 : n - band;
            const x = ox + (i + 0.5) * sb0, y = oy + (j + 0.5) * sb0;
            const a1 = corner === 0 || corner === 3 ? i : RINGS - 1 - i, b1 = corner < 2 ? j : RINGS - 1 - j;
            let ink: number;
            if (a.border === 'bands') ink = BANDS[Math.min(a1, b1)];
            else if (Math.min(a1, b1) <= 1) ink = Math.min(a1, b1) === 0 ? 1 : 0;
            else if (Math.max(a1, b1) >= RINGS - 2) ink = Math.max(a1, b1) === RINGS - 1 ? 1 : 0;
            else ink = [1, 0, 2, 4][Math.min(a1 - 2, b1 - 2, RINGS - 3 - a1, RINGS - 3 - b1)] ?? 4;
            place(x, y, sb0, 0.5, (random() - 0.5) * 0.08, BAND, 0, ink);
          }
    }

    // ---------------------------------------------------------------- andamento: stones walked along the contour bands
    const ringLimit = new Int16Array(256).fill(T.thingRings);
    const ripples = a.laying === 'ripples';
    ringLimit[0] = ripples ? 999 : 1;
    ringLimit[1] = ripples ? 999 : 2;
    ringLimit[2] = ripples ? 999 : 2;
    ringLimit[HALO] = 999;
    const fieldOf = (c: number) => (c === HALO ? thingField : field);
    const ringAt = new Int16Array(N).fill(-1);
    for (let p = 0; p < N; p++) {
      const c = cls[p];
      if (c === BAND) continue;
      const h = sz[p];
      const F = fieldOf(c)[p];
      const k = Math.floor(F / h);
      if (k < ringLimit[c] && Math.abs(F - (k + 0.5) * h) < Math.min(1.44, 0.3 * h)) ringAt[p] = k;
    }
    const gradient = (F: Float32Array, x: number, y: number): [number, number] => [
      F[y * n + Math.min(n - 1, x + 1)] - F[y * n + Math.max(0, x - 1)],
      F[Math.min(n - 1, y + 1) * n + x] - F[Math.max(0, y - 1) * n + x],
    ];
    const walk = (q0: number, F: Float32Array, band: Int16Array, visited: Uint8Array) => {
      const c = cls[q0], ring = band[q0];
      let q = q0, dx = 0, dy = 0, lastX = -1e9, lastY = -1e9;
      for (;;) {
        visited[q] = 1;
        const x = q % n, y = (q / n) | 0, h = sz[q];
        if ((x - lastX) ** 2 + (y - lastY) ** 2 >= h * h * 0.96) {
          const [gx, gy] = gradient(F, x, y);
          const length = Math.hypot(gx, gy) || 1;
          const shift = Math.max(-1.4, Math.min(1.4, (ring + 0.5) * h - F[q]));
          const px = x + 0.5 + (gx / length) * shift, py = y + 0.5 + (gy / length) * shift;
          if (place(px, py, h, 0.8, Math.atan2(gy, gx) + (random() - 0.5) * 0.12 * wobble, c, ring)) (lastX = x), (lastY = y);
        }
        let best = -1, bestDot = -2, bx = 0, by = 0;
        for (const [ox, oy] of NEIGHBOURS) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
          const nq = ny * n + nx;
          if (visited[nq] || band[nq] !== ring || cls[nq] !== c) continue;
          const scale = ox && oy ? Math.SQRT1_2 : 1;
          const dot = dx || dy ? (ox * dx + oy * dy) * scale : 0;
          if (dot > bestDot) (bestDot = dot), (best = nq), (bx = ox * scale), (by = oy * scale);
        }
        if (best < 0) break;
        dx = 0.6 * dx + 0.4 * bx;
        dy = 0.6 * dy + 0.4 * by;
        const length = Math.hypot(dx, dy) || 1;
        dx /= length;
        dy /= length;
        q = best;
      }
    };
    // First the outline course: one unbroken row walked round the edge of every thing.
    const rimBand = new Int16Array(N).fill(-1);
    for (let p = 0; p < N; p++) {
      const c = cls[p];
      if (c < 3 || c >= 254) continue;
      const h = sz[p];
      if (Math.abs(fromOutline[p] - 0.5 * h) < Math.min(1.44, 0.3 * h)) rimBand[p] = 0;
    }
    const courseStart = xs.length;
    const rimVisited = new Uint8Array(N);
    for (let q0 = 0; q0 < N; q0++) if (rimBand[q0] === 0 && !rimVisited[q0]) walk(q0, fromOutline, rimBand, rimVisited);
    const courseEnd = xs.length;
    const visited = new Uint8Array(N);
    for (let q0 = 0; q0 < N; q0++) if (ringAt[q0] >= 0 && !visited[q0]) walk(q0, fieldOf(cls[q0]), ringAt, visited);
    await pause();

    // ---------------------------------------------------------------- the open ground: fans, then rows, then any holes
    // Open ground is laid in courses of a few set sizes, each where the size map calls for it.
    const STEP = 0.75, LEVELS = 9;
    const level = new Uint8Array(N);
    const present = new Uint8Array(256 * LEVELS), box = new Int16Array(256 * LEVELS * 4);
    const baseOf = (c: number) => (c === HALO ? sizeOf[HALO] : sizeOf[c]);
    for (let p = 0; p < N; p++) {
      const c = cls[p];
      if (c === BAND) continue;
      const open = c <= 2 || c === HALO;
      const j = open ? Math.min(LEVELS - 1, Math.max(0, Math.round(Math.log(baseOf(c) / sz[p]) / Math.log(1 / STEP)))) : 0;
      level[p] = j;
      const key = c * LEVELS + j, x = p % n, y = (p / n) | 0;
      if (!present[key]) (present[key] = 1), (box[key * 4] = x), (box[key * 4 + 1] = x), (box[key * 4 + 2] = y), (box[key * 4 + 3] = y);
      else {
        if (x < box[key * 4]) box[key * 4] = x;
        if (x > box[key * 4 + 1]) box[key * 4 + 1] = x;
        if (y > box[key * 4 + 3]) box[key * 4 + 3] = y;
      }
    }
    const order: number[] = [];
    for (let c = 3; c < 254; c++) if (present[c * LEVELS]) order.push(c);
    for (const c of [HALO, 2, 1, 0]) order.push(c);
    const pixelAt = (x: number, y: number) => Math.min(n - 1, Math.max(0, Math.floor(y))) * n + Math.min(n - 1, Math.max(0, Math.floor(x)));
    const clsAt = (x: number, y: number) => cls[pixelAt(x, y)];
    const scatter = a.laying === 'scatter';
    for (const c of order) {
      const open = c <= 2;
      for (let lv = 0; lv < LEVELS; lv++) {
        if (!present[c * LEVELS + lv]) continue;
        const size = c >= 3 && c < 254 ? sizeOf[c] : baseOf(c) * STEP ** lv;
        const fits = (x: number, y: number) => {
          const p = pixelAt(x, y);
          return cls[p] === c && level[p] === lv;
        };
        // Only the lattice over this course's own box is walked.
        const key = c * LEVELS + lv;
        const bx0 = box[key * 4] - size, bx1 = box[key * 4 + 1] + size, by0 = box[key * 4 + 2] - size, by1 = box[key * 4 + 3] + size;
        if (open && a.laying === 'fans') {
          const radius = size * 5.5;
          const rowsOfFans = Math.ceil(n / (radius * 0.5)) + 2;
          for (let j = Math.min(rowsOfFans, Math.ceil((by1 + radius) / (radius * 0.5))); j >= Math.max(-1, Math.floor(by0 / (radius * 0.5)) - 1); j--) {
            const cy = j * radius * 0.5;
            for (let i = Math.max(-1, Math.floor((bx0 - radius) / radius) - 1); i <= Math.min(Math.ceil(n / radius) + 1, Math.ceil((bx1 + radius) / radius)); i++) {
              const cx = i * radius + (j & 1 ? radius / 2 : 0);
              for (let k = 0; (k + 0.6) * size < radius; k++) {
                const r = (k + 0.6) * size;
                const count = Math.max(1, Math.round((Math.PI * r) / size));
                for (let t = 0; t < count; t++) {
                  const theta = Math.PI + ((t + 0.5) / count) * Math.PI;
                  const x = cx + r * Math.cos(theta), y = cy + r * Math.sin(theta);
                  if (x < 0 || y < 0 || x >= n || y >= n || !fits(x, y)) continue;
                  place(x, y, size, 0.86, theta + (random() - 0.5) * 0.1 * wobble, c, ROW);
                }
              }
            }
          }
        }
        const loose = open && (scatter || T.shape === 'shard');
        const phi = open && a.laying === 'diagonal' ? Math.PI / 4 : 0;
        const cos = Math.cos(phi), sin = Math.sin(phi);
        const extent = phi ? n * 0.75 : n * 0.5 + size;
        let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
        for (const [cx, cy] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) {
          const du = (cx - n / 2) * cos + (cy - n / 2) * sin, dv = (cy - n / 2) * cos - (cx - n / 2) * sin;
          (u0 = Math.min(u0, du)), (u1 = Math.max(u1, du)), (v0 = Math.min(v0, dv)), (v1 = Math.max(v1, dv));
        }
        for (let j = Math.max(0, Math.floor((v0 + extent) / size)); -extent + j * size < Math.min(extent, v1 + size); j++) {
          const v = -extent + j * size;
          const rowShift = (random() - 0.5) * 0.1 * size;
          const offset = j & 1 ? size / 2 : 0;
          for (let u = -extent + offset + Math.max(0, Math.floor((u0 + extent - offset) / size)) * size; u < Math.min(extent, u1 + size); u += size) {
            const ju = (random() - 0.5) * (loose ? 0.8 : 0.18) * size, jv = rowShift + (loose ? (random() - 0.5) * 0.8 * size : 0);
            const x = n / 2 + (u + ju) * cos - (v + jv) * sin, y = n / 2 + (u + ju) * sin + (v + jv) * cos;
            if (x < 0 || y < 0 || x >= n || y >= n || !fits(x, y)) continue;
            let angle = phi + (random() - 0.5) * 0.1 * wobble;
            if (loose) angle = random() * Math.PI;
            else if (!open || ripples) {
              const [gx, gy] = gradient(fieldOf(c), Math.floor(x), Math.floor(y));
              if (gx || gy) angle = Math.atan2(gy, gx);
            }
            place(x, y, size, loose ? 0.8 : 0.86, angle, c, ROW);
          }
        }
      }
    }
    for (let y = 0; y < n; y += 2)
      for (let x = 0; x < n; x += 2) {
        const p = y * n + x, c = cls[p];
        if (c === BAND) continue;
        const [gx, gy] = gradient(fieldOf(c), x, y);
        place(x + 0.5, y + 0.5, sz[p] * 0.8, 0.88, gx || gy ? Math.atan2(gy, gx) : 0, c, ROW);
      }
    await pause();

    // ---------------------------------------------------------------- cut each stone: a convex shape slightly larger than its spacing
    const K = xs.length;
    const PLANES = 6;
    const planes = new Float32Array(K * PLANES * 3);
    const planeCount = new Uint8Array(K);
    const round = new Uint8Array(K);
    const halfMean = new Float32Array(K), reach = new Float32Array(K), jointOf = new Float32Array(K);
    const shardOf = new Uint8Array(K);
    const ellipse = new Float32Array(K * 4);
    for (let k = 0; k < K; k++) {
      const r = (i: number) => hash(k, i, seed + 101);
      // Borders and small figures in trencadis are cut to shape, as Jujol cut his medallions.
      const ck = classes[k], smallThing = ck >= 3 && ck < 254 && thickOf[ck] / sizeOf[ck] < 8;
      const shape: Shape = (ck === BAND || smallThing) && T.shape === 'shard' ? 'cube' : T.shape;
      const half = sizes[k] / 2, halfWide = widths[k] / 2;
      const base = k * PLANES * 3;
      jointOf[k] = Math.max(0.3, Math.min(1, sizes[k] / s));
      if (shape === 'pebble') {
        round[k] = 1;
        const hu = halfWide * (1.08 + 0.3 * r(1)), hv = half * (0.92 + 0.26 * r(2));
        const angle = angles[k] + (classes[k] === BAND ? 0.05 : 0.45) * (r(3) - 0.5);
        ellipse.set([Math.cos(angle), Math.sin(angle), 1 / hu, 1 / hv], k * 4);
        halfMean[k] = (hu + hv) / 2;
        reach[k] = LIMIT * Math.max(hu, hv) + 1;
        continue;
      }
      if (shape === 'shard') {
        // A broken piece of tile: three to five straight breaks at uneven distances, so the
        // neighbours' bisectors cut it into an angular shard of its own size.
        shardOf[k] = 1;
        const count = 3 + Math.floor(r(1) * 3);
        planeCount[k] = count;
        let hMax = 0, hSum = 0;
        const scale = 0.8 + 0.5 * r(2);
        for (let i = 0; i < count; i++) {
          const theta = angles[k] + ((i + (r(10 + i) - 0.5) * 0.7) * Math.PI * 2) / count;
          const h = half * scale * (count === 3 ? 0.74 : 0.94) * (0.85 + 0.45 * r(20 + i));
          planes.set([Math.cos(theta), Math.sin(theta), 1 / h], base + i * 3);
          hMax = Math.max(hMax, h);
          hSum += h;
        }
        halfMean[k] = hSum / count;
        reach[k] = LIMIT * hMax * 1.75 + 1;
        continue;
      }
      const smalti = shape === 'smalti';
      const angle = angles[k] + (r(4) - 0.5) * (smalti ? 0.28 : 0.12) * wobble;
      const c = Math.cos(angle), sn = Math.sin(angle);
      const grow = (i: number) => (smalti ? 1.0 + 0.34 * r(i) : 1.08 + 0.2 * r(i));
      const h = [halfWide * grow(5), halfWide * grow(6), half * grow(7), half * grow(8)];
      planeCount[k] = 4;
      planes.set([c, sn, 1 / h[0], -c, -sn, 1 / h[1], -sn, c, 1 / h[2], sn, -c, 1 / h[3]], base);
      halfMean[k] = (h[0] + h[1] + h[2] + h[3]) / 4;
      reach[k] = LIMIT * Math.max(...h) * 1.42 + 1;
    }

    // ---------------------------------------------------------------- weighted L-infinity Voronoi: nearest and second-nearest stone per pixel
    const D1 = new Float32Array(N).fill(9), D2 = new Float32Array(N).fill(9);
    const I1 = new Int32Array(N).fill(-1), I2 = new Int32Array(N).fill(-1);
    const P1 = new Uint8Array(N);
    for (let k = 0; k < K; k++) {
      if ((k & 2047) === 2047) await pause();
      const cx = xs[k], cy = ys[k], r = reach[k];
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(n - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(n - 1, Math.ceil(cy + r));
      if (round[k]) {
        const ec = ellipse[k * 4], es = ellipse[k * 4 + 1], iu = ellipse[k * 4 + 2], iv = ellipse[k * 4 + 3];
        for (let y = y0; y <= y1; y++) {
          const dy = y + 0.5 - cy;
          for (let x = x0; x <= x1; x++) {
            const dx = x + 0.5 - cx;
            const u = (dx * ec + dy * es) * iu, v = (dy * ec - dx * es) * iv;
            const D = Math.sqrt(u * u + v * v);
            if (D >= LIMIT) continue;
            const p = y * n + x;
            if (D < D1[p]) (D2[p] = D1[p]), (I2[p] = I1[p]), (D1[p] = D), (I1[p] = k);
            else if (D < D2[p]) (D2[p] = D), (I2[p] = k);
          }
        }
        continue;
      }
      const base = k * PLANES * 3, count = planeCount[k];
      for (let y = y0; y <= y1; y++) {
        const dy = y + 0.5 - cy;
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - cx;
          let D = -1e9, plane = 0;
          for (let i = 0; i < count; i++) {
            const o = base + i * 3;
            const value = (dx * planes[o] + dy * planes[o + 1]) * planes[o + 2];
            if (value > D) (D = value), (plane = i);
          }
          if (D >= LIMIT) continue;
          const p = y * n + x;
          if (D < D1[p]) (D2[p] = D1[p]), (I2[p] = I1[p]), (D1[p] = D), (I1[p] = k), (P1[p] = plane);
          else if (D < D2[p]) (D2[p] = D), (I2[p] = k);
        }
      }
    }
    await pause();

    // ---------------------------------------------------------------- what each stone shows: the scene under it, matched to the box of stones
    // Ostia lays each shape of the set and the floor wholly black or wholly white: the patches
    // between contours are split at the threshold that best divides the room's own tones.
    let tone: Uint8Array | null = null;
    const toneSum = new Float32Array(K), toneCount = new Float32Array(K);
    const aroundSum = new Float64Array(256), aroundCount = new Float64Array(256);
    if (a.tradition === 'ostia') {
      tone = new Uint8Array(N).fill(2);
      const Lp = new Float32Array(N), hist = new Float64Array(64);
      let total = 0;
      for (let p = 0; p < N; p++) {
        if (id[p] !== 1 && id[p] !== 2) continue;
        Lp[p] = toLab(cr[p], cg[p], cb[p])[0];
        hist[Math.min(63, Math.max(0, Math.floor(Lp[p] * 64)))]++;
        total++;
      }
      let best = 0.5, bestVar = -1, w0 = 0, m0 = 0, mAll = 0;
      for (let i = 0; i < 64; i++) mAll += hist[i] * (i + 0.5);
      for (let i = 0; i < 63; i++) {
        w0 += hist[i];
        m0 += hist[i] * (i + 0.5);
        const w1 = total - w0;
        if (!w0 || !w1) continue;
        const between = w0 * w1 * (m0 / w0 - (mAll - m0) / w1) ** 2;
        if (between > bestVar) (bestVar = between), (best = (i + 1) / 64);
      }
      const threshold = Math.max(0.35, Math.min(0.78, best));
      const patch = new Int32Array(N).fill(-1), stack = new Int32Array(N);
      for (let p0 = 0; p0 < N; p0++) {
        if (patch[p0] >= 0 || edge[p0] || (id[p0] !== 1 && id[p0] !== 2)) continue;
        let top = 0, count = 0, sumL = 0;
        const own = id[p0];
        stack[top++] = p0;
        patch[p0] = p0;
        const members: number[] = [];
        while (top) {
          const p = stack[--top];
          members.push(p);
          sumL += Lp[p];
          count++;
          const x = p % n;
          for (const q of [x > 0 ? p - 1 : -1, x < n - 1 ? p + 1 : -1, p - n, p + n]) {
            if (q < 0 || q >= N || patch[q] >= 0 || edge[q] || id[q] !== own) continue;
            patch[q] = p0;
            stack[top++] = q;
          }
        }
        const white = sumL / count >= threshold ? 1 : 0;
        for (const p of members) tone[p] = white;
      }
      // What each figure stands against, so a black figure on a black ground gets a white contour.
      for (let p = 0; p < N; p++) {
        if (id[p] > 2 || thingField[p] < 1.5 || thingField[p] > 8) continue;
        const c = nearestThing(p);
        const white = tone[p] < 2 ? tone[p] : id[p] === 0 ? (toLab(cr[p], cg[p], cb[p])[0] > 0.47 ? 1 : 0) : -1;
        if (white < 0) continue;
        aroundSum[c] += white;
        aroundCount[c]++;
      }
    }
    const sum = new Float64Array(K * 5), mine = new Float64Array(K * 5);
    for (let p = 0; p < N; p++) {
      const k = I1[p];
      if (k < 0 || D1[p] > 1) continue;
      const c = classes[k];
      const at = k * 5;
      sum[at] += cr[p];
      sum[at + 1] += cg[p];
      sum[at + 2] += cb[p];
      sum[at + 3] += diffuse[p * 4];
      sum[at + 4]++;
      if (c === id[p] || (c === HALO && id[p] <= 2) || (c === 253 && id[p] >= 253)) {
        mine[at] += cr[p];
        mine[at + 1] += cg[p];
        mine[at + 2] += cb[p];
        mine[at + 3] += diffuse[p * 4];
        mine[at + 4]++;
      }
      if (tone && tone[p] < 2) (toneSum[k] += tone[p]), toneCount[k]++;
    }
    const keying = KEYING[a.tradition];
    const palette = buildPalette(
      T,
      keying?.hues ? rekeyStones(T.hues, context.palette, keying.hues) : T.hues,
      keying?.neutrals ? rekeyStones(T.neutrals, context.palette, keying.neutrals) : T.neutrals,
    );
    const inkRGB = (keying ? rekeyStones(T.inks, context.palette, keying.inks) : T.inks).map(hex);
    const glazes = rekeyStones(['#1f4fb4', '#3a9a3c'], a.tradition === 'trencadis' ? context.palette : undefined, ['second', 'second']).map(hex);
    const stoneR = new Float32Array(K), stoneG = new Float32Array(K), stoneB = new Float32Array(K);
    const tiltOf = new Float32Array(K), glossOf = new Float32Array(K), missing = new Uint8Array(K), plateCurve = new Float32Array(K);
    const pattern = new Uint8Array(K), patternAngle = new Float32Array(K), patternRGB = new Float32Array(K * 3);
    const chroma = T.chroma * mix(0.8, 1.2, mood.cheer) * (a.setting === 'wet' ? 1.15 : 1);
    const coldGold = a.tradition === 'byzantine' && mood.warmth < 0.3;
    const GOLD: [number, RGB][] = [[0, hex('#5e4414')], [0.35, hex('#a97f27')], [0.62, hex('#d3a942')], [0.85, hex('#f0d47a')], [1, hex('#fff6d6')]];
    const gold = (f: number): RGB => {
      const t = clamp01(f);
      for (let i = 1; i < GOLD.length; i++)
        if (t <= GOLD[i][0]) {
          const [t0, c0] = GOLD[i - 1], [t1, c1] = GOLD[i];
          const w = (t - t0) / (t1 - t0);
          return [mix(c0[0], c1[0], w), mix(c0[1], c1[1], w), mix(c0[2], c1[2], w)];
        }
      return GOLD[GOLD.length - 1][1];
    };
    const confidence = capture.confidence;
    const excavated = a.setting === 'excavated';
    const lacuna = excavated ? mix(0.72, 0.665, mood.wear) : 9;
    const wear = mood.wear;
    const warmChance = 0.09 * (0.5 + mood.warmth), coolChance = 0.07 * (1.5 - mood.warmth);
    const tiltAmount = T.tilt * S.tilt;
    const glossAmount = T.gloss + S.gloss;
    // Mean lightness per stone and per region, for traditions that decide by region.
    const lightness = new Float32Array(K);
    const regionSum = new Float64Array(256), regionCount = new Float64Array(256);
    for (let k = 0; k < K; k++) {
      const at = k * 5, source = mine[k * 5 + 4] > 0 ? mine : sum, count = source[at + 4];
      if (!count) continue;
      lightness[k] = toLab(source[at] / count, source[at + 1] / count, source[at + 2] / count)[0];
      regionSum[classes[k]] += lightness[k] * count;
      regionCount[classes[k]] += count;
    }
    const regionL = new Float32Array(256);
    for (let c = 0; c < 256; c++) regionL[c] = regionCount[c] ? regionSum[c] / regionCount[c] : 0.5;
    // Each figure's own colour, so a washed-out face of it is still laid in its family of stones.
    const baseLab = (capture.baseColors ?? []).map((base) => (base ? toLab(base[0] / 255, base[1] / 255, base[2] / 255) : null));
    // The main lines of the floor and the set. A stone beside one is ruled dark when it lies on
    // the near side of a step in depth, against the backdrop, or on the shaded side of a fold.
    const ruleRGB = hex(T.outline ?? '#221f1c');
    // The open field: the backdrop, or an endless studio floor that runs out to the frame.
    const rimShare = new Float64Array(256);
    for (let i = 0; i < n; i++) for (const p of [i, (n - 1) * n + i, i * n, i * n + n - 1]) rimShare[id[p]] += 1 / (4 * n);
    const fieldLike = (c: number) => c === 0 || ((c === 1 || c === 2) && rimShare[c] > 0.3);
    const ruled = (k: number) => {
      const c = classes[k];
      if ((c !== 1 && c !== 2) || rings[k] > 0) return false;
      const x = xs[k], y = ys[k], p0 = pixelAt(x, y), reachR = Math.max(2, sizes[k] * 0.8);
      const around: number[] = [];
      for (let t = 0; t < 8; t++) {
        const theta = (t * Math.PI) / 4;
        const ps = pixelAt(x + Math.cos(theta) * reachR, y + Math.sin(theta) * reachR);
        // The silhouette of the whole set against the backdrop is always ruled.
        if (id[ps] === 0) return true;
        around.push(ps);
      }
      // Inside, only the long main lines: the steps and folds of clutter are drawn by their colours.
      if (fromMajor[p0] > sizes[k] * 0.75) return false;
      const l0 = diffuse[p0 * 4];
      for (const ps of around) {
        const other = id[ps];
        if (other >= 3) continue;
        const jump = (dep[ps] - dep[p0]) * depthScale;
        if (jump > 6) return true;
        if (jump < -6) continue;
        if (normalDot(p0, ps) < 0.6 && diffuse[ps * 4] > l0 + 6) return true;
      }
      return false;
    };
    for (let k = 0; k < K; k++) {
      const r = (i: number) => hash(k, i, seed + 211);
      const c = classes[k];
      const at = k * 5;
      const source = mine[at + 4] > 0 ? mine : sum;
      const count = source[at + 4];
      const q = pixelAt(xs[k], ys[k]);
      let mr = 0.8, mg = 0.8, mb = 0.8, md = lit;
      if (count > 0) (mr = source[at] / count), (mg = source[at + 1] / count), (mb = source[at + 2] / count), (md = source[at + 3] / count);
      else {
        const p = Math.min(n - 1, Math.floor(ys[k])) * n + Math.min(n - 1, Math.floor(xs[k]));
        (mr = cr[p]), (mg = cg[p]), (mb = cb[p]);
      }
      const thing = c >= 3 && c < 254;
      let rgb: RGB;
      let isGold = false;
      if (c === BAND) {
        const ink = inks[k];
        if (a.tradition === 'byzantine' && ink === 0) (rgb = gold(0.3 + 0.55 * r(1) + (r(2) < 0.06 ? 0.3 : 0))), (isGold = true);
        else rgb = [...inkRGB[ink]] as RGB;
      } else if (a.tradition === 'ostia') {
        const L = lightness[k];
        const black = hex('#221f1c'), white = hex('#ebe6da');
        if (thing) {
          const detail = rings[k] === 0 && fromOutline[q] > sizes[k] * 1.3;
          const onBlack = aroundCount[c] > 0 && aroundSum[c] / aroundCount[c] < 0.5;
          rgb = (onBlack && k >= courseStart && k < courseEnd) || detail || L > Math.max(0.88, regionL[c] + 0.3) ? white : black;
        } else {
          // A region is laid white or black as a whole; only a real shadow or highlight flips.
          const light = regionL[c] > 0.47;
          if ((c === 1 || c === 2) && toneCount[k] > 0) rgb = toneSum[k] / toneCount[k] >= 0.5 ? white : black;
          else rgb = light ? (L < regionL[c] - 0.17 ? black : white) : L > regionL[c] + 0.2 ? white : black;
          // The main lines of the floor and the set are ruled in one line of the other colour.
          if (ruled(k)) rgb = rgb === white ? black : white;
        }
        if (rgb === white && r(3) < 0.08) rgb = hex('#d9d3c5');
        if (rgb === black && r(3) < 0.1) rgb = hex('#3a3632');
      } else {
        let [L, A, B] = toLab(mr, mg, mb);
        const plain = L > 0.5 && Math.hypot(A, B) < 0.07;
        const base = thing ? baseLab[c] : null;
        if (base) {
          const borrow = 0.5 * (1 - clamp01(Math.hypot(A, B) / 0.08));
          A = mix(A, base[1], borrow);
          B = mix(B, base[2], borrow);
        }
        if (thing) L += (md / lit - 0.72) * 0.12;
        L = 0.5 + (L - 0.5) * T.contrast;
        A = A * chroma + (mood.warmth - 0.5) * 0.02;
        B = B * chroma + (mood.warmth - 0.5) * 0.04;
        const under = c === HALO ? id[q] : c;
        if (ruled(k)) {
          // A course of dark stones down the main lines of the set, darker than the stone beside it.
          const i = pick(palette, Math.min(L * 0.6, 0.32), A, B, 1, r(5));
          rgb = [mix(palette.rgb[i * 3], ruleRGB[0], 0.3), mix(palette.rgb[i * 3 + 1], ruleRGB[1], 0.3), mix(palette.rgb[i * 3 + 2], ruleRGB[2], 0.3)];
        } else if (a.tradition === 'byzantine' && (under === 0 || (fieldLike(under) && plain))) {
          // The open field goes to gold; plain pale walls and floors of a room stay in white glass so it reads against it.
          if (coldGold) {
            const blues = ['#14206a', '#1d2f86', '#25399a', '#1a2878'];
            rgb = r(2) < 0.045 ? gold(0.75 + 0.25 * r(3)) : r(2) < 0.055 ? hex('#efe9dc') : hex(blues[Math.floor(r(4) * blues.length)]);
          } else {
            const vault = fbm(xs[k] / 230, ys[k] / 230, seed + 7);
            rgb = gold(0.16 + 0.6 * r(1) + (vault - 0.5) * 0.7 + (r(2) < 0.05 ? 0.35 : 0) + (c === HALO ? 0.12 : 0));
            isGold = true;
          }
        } else if (c === HALO && T.halo) {
          rgb = hex(T.halo);
        } else if (thing && T.outline && k >= courseStart && k < courseEnd) {
          // The figure's outline course. A slender figure only a few stones across keeps more of
          // its own colour in it, or it would be all outline.
          const across = thickOf[c] / sizeOf[c];
          const weight = mix(0.3, 0.55, clamp01((across - 2) / 3));
          const i = pick(palette, Math.min(L, mix(0.42, 0.3, weight / 0.55)), A, B, 1, r(5));
          const dark = hex(T.outline);
          rgb = [mix(palette.rgb[i * 3], dark[0], weight), mix(palette.rgb[i * 3 + 1], dark[1], weight), mix(palette.rgb[i * 3 + 2], dark[2], weight)];
        } else {
          let spread = T.variety;
          // Calm ground: the backdrop takes few odd shards, the set and floor some more.
          if (a.tradition === 'trencadis' && !thing && r(6) < (fieldLike(under) ? 0.05 : 0.08)) {
            // A field of broken plates: some shards are any colour at about the right lightness.
            A = (r(7) - 0.5) * 0.3;
            B = (r(8) - 0.5) * 0.3;
            spread *= 2;
          }
          const i = pick(palette, L, A, B, spread, r(5));
          rgb = [palette.rgb[i * 3], palette.rgb[i * 3 + 1], palette.rgb[i * 3 + 2]];
        }
      }
      // Each stone its own: brightness, a grey step, now and then a warm or a cool one.
      let [R, Gc, Bc] = rgb;
      const f = 1 + (r(11) - 0.5) * 0.1 * T.variety, add = (r(12) - 0.5) * (14 / 255);
      R = R * f + add;
      Gc = Gc * f + add;
      Bc = Bc * f + add;
      const temper = r(13);
      if (temper < warmChance) (R += 12 / 255), (Gc += 4 / 255), (Bc -= 8 / 255);
      else if (temper > 1 - coolChance) (R -= 6 / 255), (Bc += 9 / 255);
      if (wear > 0) {
        const grey = (R + Gc + Bc) / 3, fade = wear * 0.22;
        R = mix(R, grey, fade) * (1 - wear * 0.06);
        Gc = mix(Gc, grey, fade) * (1 - wear * 0.06);
        Bc = mix(Bc, grey, fade) * (1 - wear * 0.06);
        if (r(14) < wear * 0.12) (R *= 0.86), (Gc *= 0.84), (Bc *= 0.8);
      }
      if (a.setting === 'wet') (R *= 0.9), (Gc *= 0.9), (Bc *= 0.9);
      stoneR[k] = R;
      stoneG[k] = Gc;
      stoneB[k] = Bc;
      tiltOf[k] = 1 + (r(15) + r(16) - 1) * tiltAmount * (isGold ? 2.6 : 1);
      glossOf[k] = glossAmount * (r(17) < 0.4 ? 1 : 0.3) * (isGold ? 1.6 : 1);
      plateCurve[k] = r(24) * 2 - 0.6;
      if (a.tradition === 'trencadis' && c !== BAND && r(18) < (fieldLike(c === HALO ? id[q] : c) ? 0.03 : 0.07)) {
        // A shard of a patterned tile: stripes or spots in a second glaze.
        pattern[k] = r(19) < 0.6 ? 1 : 2;
        patternAngle[k] = r(20) * Math.PI;
        const light = R + Gc + Bc > 2.2;
        patternRGB.set(light ? glazes[r(21) < 0.5 ? 0 : 1] : hex('#f6f4ee'), k * 3);
      }
      // Loss: lacunae at a dig, the odd stone gone with age, and doubtful figures only half laid.
      let lost = false;
      if (excavated && fbm(xs[k] / 120, ys[k] / 120, seed + 60) > lacuna + (thing ? 0.07 : 0)) lost = true;
      if (r(22) < wear * wear * 0.012) lost = true;
      if (thing && confidence && r(23) < (1 - (confidence[c] ?? 1)) * 0.6) lost = true;
      missing[k] = lost ? 1 : 0;
    }
    await pause();

    // ---------------------------------------------------------------- set the stones: bevels toward the light, joints on the bisectors
    const [lx0, ly0, lz0] = capture.light;
    let lx = lx0, ly = ly0;
    const l2 = Math.hypot(lx, ly);
    if (l2 < 0.05) (lx = -0.6), (ly = -0.8);
    else (lx /= l2), (ly /= l2);
    const lz = Math.max(0.45, lz0);
    const l3 = Math.hypot(lx * Math.max(0.2, l2), ly * Math.max(0.2, l2), lz);
    const L3x = (lx * Math.max(0.2, l2)) / l3, L3y = (ly * Math.max(0.2, l2)) / l3, L3z = lz / l3;
    const groutRGB = hex(GROUT[a.grout]);
    const dirt = mix(1, 0.86, wear) * (a.setting === 'wet' ? 0.78 : 1);
    const dust = hex('#d8ccb6');
    const bed = hex('#c9b397'), sinopia = hex('#a34a2c');
    const g = Math.max(0.35, Math.min(s * 0.13, mix(0.45, 1.6, a.joint) * T.joint * Math.sqrt(s / (9 * T.size))));
    const bevelWidth = Math.max(1.1, Math.min(2.8, s * 0.2));
    const bevel = T.bevel * S.bevel;
    const dome = S.dome;
    const pixels = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < n; y++) {
      if (y % 90 === 89) await pause();
      for (let x = 0; x < n; x++) {
        const p = y * n + x;
        const k = I1[p];
        const grain = hash(x, y, seed + 9);
        let gr = groutRGB[0], gg = groutRGB[1], gb = groutRGB[2];
        const gn = (0.9 + 0.14 * grain) * dirt;
        gr *= gn;
        gg *= gn;
        gb *= gn;
        if (excavated) (gr = mix(gr, dust[0], 0.35)), (gg = mix(gg, dust[1], 0.35)), (gb = mix(gb, dust[2], 0.35));
        let R = gr, Gc = gg, Bc = gb;
        if (k >= 0) {
          const d1 = D1[p], k2 = I2[p];
          const cx = xs[k], cy = ys[k];
          // The stone's own edge, and the joint shared with its neighbour.
          let nx = 0, ny = 0, inv = 1 / halfMean[k];
          if (round[k]) {
            const ec = ellipse[k * 4], es = ellipse[k * 4 + 1], iu = ellipse[k * 4 + 2], iv = ellipse[k * 4 + 3];
            const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
            const gu = (dx * ec + dy * es) * iu * iu, gv = (dy * ec - dx * es) * iv * iv;
            nx = gu * ec - gv * es;
            ny = gu * es + gv * ec;
            const length = Math.hypot(nx, ny) || 1;
            nx /= length;
            ny /= length;
          } else {
            const o = k * PLANES * 3 + P1[p] * 3;
            nx = planes[o];
            ny = planes[o + 1];
            inv = planes[o + 2];
          }
          const ownX = nx, ownY = ny;
          let e = (1 - d1) / inv;
          if (k2 >= 0) {
            const h1 = halfMean[k], h2 = halfMean[k2];
            const t = ((D2[p] - d1) * h1 * h2) / (h1 + h2) - g * (jointOf[k] + jointOf[k2]) * 0.5;
            if (t < e) {
              e = t;
              nx = xs[k2] - cx;
              ny = ys[k2] - cy;
              const length = Math.hypot(nx, ny) || 1;
              nx /= length;
              ny /= length;
            }
          }
          const cover = clamp01(e + 0.5);
          const facing = nx * lx + ny * ly;
          if (k2 >= 0 && missing[k2] && !missing[k]) (gr = bed[0] * 0.8), (gg = bed[1] * 0.8), (gb = bed[2] * 0.8);
          if (missing[k]) {
            // The bare bed: rough lime, with the red underdrawing where the picture had an edge.

            const rough = 0.86 + 0.18 * fbm(x / 6, y / 6, seed + 3) + 0.06 * grain;
            R = bed[0] * rough;
            Gc = bed[1] * rough;
            Bc = bed[2] * rough;
            if (field[p] < 1.8 && noise(x / 9, y / 9, seed + 4) > 0.3) {
              R = mix(R, sinopia[0], 0.7);
              Gc = mix(Gc, sinopia[1], 0.7);
              Bc = mix(Bc, sinopia[2], 0.7);
            }
            if (k2 >= 0 && !missing[k2]) {
              const t = ((D2[p] - d1) * halfMean[k]) / 2;
              const shadow = 1 - 0.32 * clamp01(1 - t / 3.5) * (0.6 + 0.4 * clamp01(-(nx * lx + ny * ly)));
              R *= shadow;
              Gc *= shadow;
              Bc *= shadow;
            }
          } else {
            let sr0 = stoneR[k], sg0 = stoneG[k], sb0 = stoneB[k];
            if (pattern[k]) {
              const pc = Math.cos(patternAngle[k]), ps = Math.sin(patternAngle[k]);
              const u = (x + 0.5 - cx) * pc + (y + 0.5 - cy) * ps, v = (y + 0.5 - cy) * pc - (x + 0.5 - cx) * ps;
              const period = halfMean[k] * 0.8;
              const on = pattern[k] === 1 ? wrap(u / period, 1) < 0.38 : Math.hypot(wrap(u / period, 1) - 0.5, wrap(v / period, 1) - 0.5) < 0.24;
              if (on) (sr0 = patternRGB[k * 3]), (sg0 = patternRGB[k * 3 + 1]), (sb0 = patternRGB[k * 3 + 2]);
            }
            let shade = tiltOf[k];
            if (round[k]) {
              // A domed pebble lit from the key light.
              const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, d1) ** 2));
              const side = Math.sqrt(Math.max(0, 1 - nz * nz));
              const lambert = ownX * side * L3x + ownY * side * L3y + nz * L3z;
              shade *= 0.58 + 0.52 * Math.max(0, lambert);
            } else if (shardOf[k]) {
              // Glazed tile: a flat face with a thin bright lip where the break faces the light,
              // and the faint curve of the plate it was broken from.
              if (e < 1.2) shade += 0.22 * (1 - Math.max(0, e) / 1.2) * facing;
              shade += (((x + 0.5 - cx) * lx + (y + 0.5 - cy) * ly) / halfMean[k]) * 0.06 * plateCurve[k];
            } else {
              const bw = Math.min(bevelWidth, Math.max(0.8, halfMean[k] * 0.5));
              if (e < bw) {
                const b = 1 - Math.max(0, e) / bw;
                shade += bevel * b * b * 2 * facing;
              }
              shade -= dome * d1 * d1;
            }
            shade *= 1 + (grain - 0.5) * 0.06;
            let sr1 = sr0 * shade, sg1 = sg0 * shade, sb1 = sb0 * shade;
            const gloss = glossOf[k];
            if (gloss > 0) {
              const h = halfMean[k];
              let spark = 0;
              const edgeWidth = shardOf[k] ? 1.2 : Math.min(bevelWidth, Math.max(0.8, h * 0.5));
              if (shardOf[k] && plateCurve[k] > 0.5) {
                // A small sharp window reflection on the glaze.
                const hx = x + 0.5 - (cx + lx * h * 0.35), hy = y + 0.5 - (cy + ly * h * 0.35);
                spark = Math.max(0, 1 - Math.max(Math.abs(hx), Math.abs(hy)) / (0.16 * h)) * 0.7;
              }
              if (e < edgeWidth && facing > 0) spark += (1 - Math.max(0, e) / edgeWidth) ** 2 * facing * facing * 0.6;
              spark *= gloss;
              sr1 += spark;
              sg1 += spark;
              sb1 += spark * 0.95;
            }
            if (e < 0) {
              // A recessed joint lies in the shadow of the stone between it and the light.
              const shadow = 1 - 0.3 * clamp01(-facing) * clamp01(1 + e / (2 * g + 0.5));
              gr *= shadow;
              gg *= shadow;
              gb *= shadow;
            }
            R = gr + (sr1 - gr) * cover;
            Gc = gg + (sg1 - gg) * cover;
            Bc = gb + (sb1 - gb) * cover;
          }
        }
        if (excavated) {
          const film = 0.05 + 0.12 * wear * noise(x / 70, y / 70, seed + 5);
          R = mix(R, dust[0], film);
          Gc = mix(Gc, dust[1], film);
          Bc = mix(Bc, dust[2], film);
        }
        pixels[p * 4] = R * 255;
        pixels[p * 4 + 1] = Gc * 255;
        pixels[p * 4 + 2] = Bc * 255;
        pixels[p * 4 + 3] = 255;
      }
    }

    let lost = 0;
    for (let k = 0; k < K; k++) lost += missing[k];
    const names = { roman: 'Roman floor', ostia: 'Ostia black-and-white', byzantine: coldGold ? 'Byzantine, starry blue ground' : 'Byzantine, gold ground', pebble: 'Greek pebble', trencadis: 'trencadis' };
    return {
      pixels,
      notes: [
        `${names[a.tradition]}: ${K} stones from ${finest.toFixed(1)} to ${s.toFixed(1)} px, ${a.laying} on the open ground`,
        `${a.grout} joints ${(g * 2).toFixed(1)} px, ${bordered ? `${a.border} border` : 'no border'}, ${haloRows ? `halo of ${haloRows} rows` : 'no halo'}`,
        `${a.setting}${lost ? `, ${lost} stones lost` : ''}`,
      ],
    };
  },
});
