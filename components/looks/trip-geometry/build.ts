import { type Palette as Colours, type PaletteRole, choice, clamp01, defineLook, fromOklch, mix, oklch, paintRGB, rekey, score, seeded } from '@conjure/kit';

type RGB = [number, number, number];
const hex = (value: string): RGB => [
  parseInt(value.slice(1, 3), 16) / 255,
  parseInt(value.slice(3, 5), 16) / 255,
  parseInt(value.slice(5, 7), 16) / 255,
];
const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};
const fract = (v: number) => v - Math.floor(v);
const TAU = Math.PI * 2;

interface Palette {
  hues: RGB[];
  /** The unprinted ground behind line-work. */
  ground: RGB;
  /** Keylines and the gaps between fills. */
  ink: RGB;
  /** A dark ground: lines glow light instead of printing dark. */
  dark: boolean;
  /** How much the hue slides with the angle of the surface, like a film of oil. */
  sheen: number;
}
const palette = (hues: string[], ground: string, ink: string, dark: boolean, sheen: number): Palette => ({
  hues: hues.map(hex),
  ground: hex(ground),
  ink: hex(ink),
  dark,
  sheen,
});

const PALETTES = {
  oilslick: palette(
    ['#c58b2b', '#b8336a', '#2763b8', '#1f9e8a', '#9ac43a', '#e6c84a', '#e0567a', '#2f8f4e', '#d96a2a', '#3c7fa6'],
    '#121a1c',
    '#06090a',
    true,
    1,
  ),
  neon: palette(
    ['#ff2d6f', '#ffe11a', '#19ff8c', '#ff7a00', '#00e5ff', '#c6ff00', '#ff3df5', '#ff4a2e', '#7dff3a'],
    '#070707',
    '#000000',
    true,
    0.25,
  ),
  mandala: palette(
    ['#8e1b14', '#d2481a', '#e6a52e', '#f3dca4', '#2f6b55', '#1f3a66', '#a8325e', '#6b3a14', '#e07a3a', '#c99a2e'],
    '#f1e2bf',
    '#2a120a',
    false,
    0.15,
  ),
  candy: palette(
    ['#ff9ebb', '#ffd1a1', '#fff0a0', '#b5f0c8', '#9fe0f5', '#ffc3ec', '#ff8f8f', '#c8f59a', '#ffe0c2'],
    '#fff7ef',
    '#4a2d4f',
    false,
    0.4,
  ),
  fillmore: palette(
    ['#ff5a1f', '#ff1f8e', '#ffd400', '#00a86b', '#1f3fc7', '#d7102a', '#7ad83b', '#ff9d00', '#00b3b3'],
    '#fff1d6',
    '#1a0d14',
    false,
    0.1,
  ),
  visionary: palette(
    ['#1d6f6a', '#e6b450', '#f6ebc8', '#b2412b', '#3d7fc4', '#9cc7a0', '#d47a2e', '#7a2f4f', '#e8d27a'],
    '#0d1e22',
    '#040b0d',
    true,
    0.7,
  ),
} as const satisfies Record<string, Palette>;

/**
 * The vision takes the picture's palette: hues near the set's most vivid one carry the ink, the rest
 * answer in the second (each keeping half its hue spread, so the vision stays many-coloured), and the
 * ground tints. Keylines stay as designed: near-black, or a dark that must hold against the fills.
 */
function keyVision(P: Palette, colours: Colours | undefined): Palette {
  if (!colours) return P;
  const bytes = P.hues.map((c) => [c[0] * 255, c[1] * 255, c[2] * 255] as const);
  const lch = bytes.map(oklch);
  const anchor = lch.reduce((best, c, i) => (c[1] > lch[best][1] ? i : best), 0);
  const roles = lch.map(([, , h]): PaletteRole => (Math.abs(Math.atan2(Math.sin(h - lch[anchor][2]), Math.cos(h - lch[anchor][2]))) < 0.9 ? 'ink' : 'second'));
  const keyed = rekey(Object.fromEntries(bytes.map((c, i) => [i, c])), colours, Object.fromEntries(roles.map((r, i) => [i, r])));
  const unit = (c: readonly number[]): RGB => [c[0] / 255, c[1] / 255, c[2] / 255];
  const hues = P.hues.map((_, i) => {
    const [L, C, h] = oklch(keyed[i]);
    const target = oklch(paintRGB(colours[roles[i]]))[2];
    return unit(fromOklch(L, C, target + Math.atan2(Math.sin(h - target), Math.cos(h - target)) * 0.5));
  });
  const ground = rekey({ ground: [P.ground[0] * 255, P.ground[1] * 255, P.ground[2] * 255] as const }, colours, { ground: 'ground' }).ground;
  return { ...P, hues, ground: unit(ground) };
}

const SYMMETRY = { two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, twelve: 12 } as const;
type Form = 'tunnel' | 'spiral' | 'honeycomb' | 'checker' | 'cobweb' | 'molecule';
const FORMS: Form[] = ['tunnel', 'spiral', 'honeycomb', 'checker', 'cobweb', 'molecule'];

/** A repeatable hash of a lattice point, in [0, 1). */
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

/** Box blur in place, a few passes for a soft bell. */
function blur(field: Float32Array, n: number, radius: number, passes: number) {
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

/**
 * Distance in pixels to the nearest marked pixel, by propagating each pixel's nearest seed in two
 * raster passes (close to Euclidean, linear in the pixel count). `near` holds that seed's index.
 */
function distanceTo(mask: Uint8Array, n: number): { dist: Float32Array; near: Int32Array } {
  const N = n * n;
  const near = new Int32Array(N).fill(-1);
  const dist = new Float32Array(N).fill(1e9);
  for (let p = 0; p < N; p++) if (mask[p]) (near[p] = p, (dist[p] = 0));
  const test = (p: number, q: number, x: number, y: number) => {
    const s = near[q];
    if (s < 0) return;
    const dx = (s % n) - x, dy = ((s / n) | 0) - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < dist[p]) (dist[p] = d, (near[p] = s));
  };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const p = y * n + x;
      if (x > 0) test(p, p - 1, x, y);
      if (y > 0) {
        test(p, p - n, x, y);
        if (x > 0) test(p, p - n - 1, x, y);
        if (x < n - 1) test(p, p - n + 1, x, y);
      }
    }
  for (let y = n - 1; y >= 0; y--)
    for (let x = n - 1; x >= 0; x--) {
      const p = y * n + x;
      if (x < n - 1) test(p, p + 1, x, y);
      if (y < n - 1) {
        test(p, p + n, x, y);
        if (x < n - 1) test(p, p + n + 1, x, y);
        if (x > 0) test(p, p + n - 1, x, y);
      }
    }
  return { dist, near };
}

// ---------------------------------------------------------------- the form constants
// Each writes into `o`: a band index for colour, an alternate index for side-by-side hues, and the
// distance in pixels to the nearest drawn line.
const o = { band: 0, alt: 0, edge: 0 };

function tunnel(x: number, y: number, S: number, N: number, phase: number) {
  const r = Math.sqrt(x * x + y * y) + 1e-3;
  const m = N * Math.max(1, Math.round(26 / N));
  const cell = (TAU * r) / m;
  const U = Math.log(r / S) * (m / TAU) * 0.9 + phase;
  const V = ((Math.atan2(y, x) + Math.PI) / TAU) * m;
  const fu = fract(U), fv = fract(V);
  o.band = Math.floor(U);
  o.alt = (Math.floor(U) + Math.floor(V)) & 1;
  o.edge = Math.min(Math.min(fu, 1 - fu) * cell * 1.6, Math.min(fv, 1 - fv) * cell);
  if (r < S * 0.9) (o.band = -99, (o.edge = 99));
}

function spiral(x: number, y: number, S: number, N: number, phase: number) {
  const r = Math.sqrt(x * x + y * y) + 1e-3;
  const th = Math.atan2(y, x);
  const arms = N < 4 ? N * 3 : N;
  const k = 5;
  const U = Math.log(r / S) * k + (th / TAU) * arms + phase;
  const V = Math.log(r / S) * k * 0.7 - (th / TAU) * arms * 2;
  const grad = Math.sqrt(k * k + (arms / TAU) ** 2) / r;
  const fu = fract(U);
  o.band = Math.floor(U);
  o.alt = Math.floor(V) & 1;
  o.edge = Math.min(fu, 1 - fu) / grad;
  if (r < S * 0.7) (o.band = -99, (o.edge = 99));
}

/** Hex cell for a point in cell units: writes the cell centre and the offset from it. */
const hx = { cx: 0, cy: 0, gx: 0, gy: 0, k: 0 };
function hexCell(qx: number, qy: number) {
  const RY = 1.7320508;
  const ax = qx - Math.floor(qx) - 0.5, ay = qy - Math.floor(qy / RY) * RY - 0.8660254;
  const bxr = qx - 0.5, byr = qy - 0.8660254;
  const bx = bxr - Math.floor(bxr) - 0.5, by = byr - Math.floor(byr / RY) * RY - 0.8660254;
  if (ax * ax + ay * ay < bx * bx + by * by) (hx.gx = ax, (hx.gy = ay));
  else (hx.gx = bx, (hx.gy = by));
  hx.cx = qx - hx.gx;
  hx.cy = qy - hx.gy;
  // Distance from the centre in hex terms (the edge is at 0.5), and which of the six edges is nearest.
  const sx = Math.abs(hx.gx), sy = Math.abs(hx.gy);
  const slanted = sx * 0.5 + sy * 0.8660254;
  hx.k = slanted > sx ? (hx.gy >= 0 ? (hx.gx >= 0 ? 0 : 1) : hx.gx >= 0 ? 3 : 4) : hx.gx >= 0 ? 2 : 5;
  return Math.max(slanted, sx);
}
const cellKey = (cx: number, cy: number) => [Math.round(cx * 2), Math.round(cy / 0.8660254)] as const;
const EDGE_NORMALS: [number, number][] = [
  [0.5, 0.8660254],
  [-0.5, 0.8660254],
  [1, 0],
  [0.5, -0.8660254],
  [-0.5, -0.8660254],
  [-1, 0],
];

function honeycomb(x: number, y: number, S: number) {
  const d = hexCell(x / S, y / S);
  const [i, j] = cellKey(hx.cx, hx.cy);
  o.band = Math.floor(Math.sqrt(hx.cx * hx.cx + hx.cy * hx.cy) * 0.9);
  o.alt = (((i + j * 3) % 3) + 3) % 3;
  o.edge = (0.5 - d) * S;
}

function checker(x: number, y: number, S: number, angle: number) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const u = (x * c - y * s) / S, v = (x * s + y * c) / S;
  const i = Math.floor(u), j = Math.floor(v);
  const fu = u - i, fv = v - j;
  o.band = Math.max(Math.abs(i + 0.5), Math.abs(j + 0.5)) | 0;
  o.alt = (i + j) & 1;
  o.edge = Math.min(Math.min(fu, 1 - fu), Math.min(fv, 1 - fv)) * S;
}

function cobweb(x: number, y: number, S: number, N: number, phase: number) {
  const r = Math.sqrt(x * x + y * y) + 1e-3;
  const sides = N * Math.max(1, Math.ceil(7 / N));
  const a = TAU / sides;
  const th = Math.atan2(y, x) + Math.PI;
  const t = (th % a) - a / 2;
  // Threads between spokes sag toward the hub, like silk.
  const rho = ((r * Math.cos(t)) / Math.cos(a / 2)) * (1 + 0.16 * (1 - Math.abs(t) / (a / 2)));
  const step = Math.log(1.28);
  const U = Math.log(Math.max(1e-3, rho / S)) / step + phase;
  const fu = fract(U);
  o.band = Math.floor(U);
  o.alt = Math.floor(th / a) & 1;
  o.edge = Math.min(Math.min(fu, 1 - fu) * rho * step, r * Math.sin(a / 2 - Math.abs(t)));
  if (r < S * 0.5) (o.band = -99, (o.edge = 99));
}

/** Skeletal formulae on a hex lattice: fused benzene rings, Kekulé double bonds, aromatic circles, chains. */
function molecule(x: number, y: number, S: number, seed: number) {
  const d = hexCell(x / S, y / S);
  const [i, j] = cellKey(hx.cx, hx.cy);
  const here = hash(i, j, seed);
  const ring = here < 0.5;
  const [nx, ny] = EDGE_NORMALS[hx.k];
  const [ni, nj] = cellKey(hx.cx + nx, hx.cy + ny);
  const there = hash(ni, nj, seed) < 0.5;
  const lo = i * 4096 + j < ni * 4096 + nj;
  const bond = hash(lo ? i : ni, lo ? j : nj, seed + (lo ? ni : i) * 31 + (lo ? nj : j) * 7 + 3) < 0.28;
  let edge = 99;
  if (ring || there || bond) edge = (0.5 - d) * S;
  if (ring) {
    if (here < 0.12) {
      // An aromatic ring drawn as a circle inside.
      edge = Math.min(edge, Math.abs(Math.sqrt(hx.gx * hx.gx + hx.gy * hx.gy) - 0.27) * S);
    } else if ((hx.k + Math.floor(here * 20)) % 2 === 0) {
      // A double bond on alternate sides: a shorter line inside, parallel to the edge.
      const along = Math.abs(hx.gx * -ny + hx.gy * nx);
      if (along < 0.17) edge = Math.min(edge, Math.abs(0.5 - d - 0.13) * S);
    }
  }
  o.band = Math.floor(here * 40);
  o.alt = ring ? 1 : 0;
  o.edge = edge;
}

const QUESTIONS = {
  intensity: score('How deep into the geometry is the vision (the classic levels of psychedelic visual geometry)?', [
    'Level 1: barely there; a faint drifting lattice and a breathing shimmer of colour on surfaces',
    'Level 2: fine patterns crawl over everything, colours start to swim',
    'Level 3: clear lattices and form constants sit on every surface, tracers trail moving things',
    'Level 4: the geometry wraps each object along its form, tunnels and spirals pull toward the distance',
    'Level 5: geometry covers the whole field; the scene shows through it',
    'Level 6: the patterns are vivid and three-dimensional; the room starts to come apart',
    'Level 7: the set and ground fold into kaleidoscopic mirrored structures',
    'Level 8A: inside the geometry; a mirror-folded fractal field replaces the world, figures made of the same geometry',
    'Level 8B: the geometry becomes ordered and meaningful, nested mandalas and glyph-dense architecture fill everything',
  ]),
  palette: choice('What character has the vision\u2019s colour? Its hues come from the picture\u2019s palette.', {
    oilslick: 'Iridescent oil-slick: metallic, shifting colours sliding into each other on a dark film.',
    neon: 'Neon on black: hot, acid colours at full strength glowing out of darkness. Raves, black light.',
    mandala: 'Rich mandala pigments, deep and earthy, with pale cream between and a dark answer. Temples, sacred art.',
    candy: 'Pastel candy: soft, milky, sugary tints on white. Sweet, giddy, cartoon, childlike wonder.',
    fillmore: 'Sixties concert poster: saturated colours vibrating hard against each other on pale stock.',
    visionary: 'Visionary art: deep jewel tones and fine glowing filigree with pale light, luminous and anatomical.',
  }),
  form: choice('Which form constant does the geometry take?', {
    tunnel: 'Tunnels and funnels: rings and spokes pulling everything toward a vanishing point.',
    spiral: 'Spirals: logarithmic arms winding into the centre of each thing and the distance.',
    honeycomb: 'Honeycomb lattice: hexagonal cells tiling every surface in three colours.',
    checker: 'Checkerboard lattice: tilted squares stepping out in concentric rings.',
    cobweb: 'Cobwebs: polygonal threads sagging between radial spokes.',
    molecule: 'Molecular skeletons: chemistry diagrams of fused hexagonal rings, double bonds and chains.',
    mixed: 'All of them at once: each thing wears a different form constant.',
  }),
  symmetry: choice('What symmetry order folds the geometry?', {
    two: 'Two-fold: a mirror down the middle, like a Rorschach blot.',
    three: 'Three-fold: a triangular, trinity turn.',
    four: 'Four-fold: square, compass-like order.',
    five: 'Five-fold: a flower or a star, organic and odd.',
    six: 'Six-fold: snowflake and honeycomb order.',
    eight: 'Eight-fold: a dense rose window.',
    twelve: 'Twelve-fold: a dizzying many-petalled kaleidoscope.',
  }),
  mark: choice('How is the geometry drawn?', {
    hairline: 'Fine hairlines: engraved, op-art line-work over the scene.',
    'bold-line': 'Bold glowing lines: thick coloured strokes over a dark or pale ground.',
    fill: 'Flat fills: bands and cells of solid colour side by side.',
    keyline: 'Fills with heavy black keylines, like a screen-printed poster.',
  }),
  tracers: score('How strongly do things leave tracers and echoing auras?', [
    'No tracers',
    'Faint afterimages',
    'Clear trails and a halo of echoes',
    'Long rainbow trails and rippling auras around everything',
  ]),
  motion: choice('What is the geometry doing right now?', {
    breathing: 'Breathing: the patterns swell and contract in slow pulses.',
    flowing: 'Flowing: lines crawl and ripple like liquid across the surfaces.',
    melting: 'Melting: walls and patterns drip and sag downward.',
    spinning: 'Spinning: everything twists in a slow whirlpool around its centre.',
  }),
  finish: choice('What is the vision printed on?', {
    vision: 'Nothing: the pure vision, crisp and luminous, as if seen with open eyes.',
    blotter: 'A blotter sheet: soft absorbent paper perforated into a grid of small square tabs.',
    poster: 'A screen-printed poster: flat inks snapped to the palette, slightly out of register.',
    velvet: 'A black-light velvet poster: fuzzy black flocking with fluorescent colours glowing.',
    projection: 'A liquid light show: an oil-wheel projection on a wall, blooming blobs of coloured light.',
  }),
  grain: score('How much grain and texture is in the print?', ['Clean', 'A little', 'Grainy', 'Heavy grit']),
} as const;

export default defineLook({
  questions: QUESTIONS,

  async apply(capture, a, context, signal) {
    const n = capture.size;
    const N = n * n;
    const sc = n / 720;
    const { color, normal, depth, identity, diffuse } = capture;
    const mood = context.mood;
    const seed = (context.seed % 100_000) + 7;
    const random = seeded(context.seed ^ 0x7219ab);
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const velvet = a.finish === 'velvet';
    // On black velvet every palette prints as fluorescent ink on a black ground.
    const P: Palette = keyVision(velvet ? { ...PALETTES[a.palette], ground: hex('#0b0810'), ink: hex('#000000'), dark: true } : PALETTES[a.palette], context.palette);
    const hues = P.hues;
    const H = hues.length;
    const sym = SYMMETRY[a.symmetry];

    // ---------------------------------------------------------------- how deep
    const level = a.intensity * 8; // 0 = level 1 … 7 = 8A, 8 = 8B
    const step = Math.round(level);
    const levelName = step >= 8 ? '8B' : step >= 7 ? '8A' : `${step + 1}`;
    const g = clamp01(level / 7);
    const thingAmount = smooth(1.5, 6, level) * 0.92;
    const setAmount = smooth(1, 5.5, level) * 0.96;
    const faint = mix(0.5, 0.85, smooth(0, 2, level));
    const fieldAmount = smooth(4.4, 7, level);
    const ordered = step >= 8;
    const shimmer = mix(0.13, 0.6, smooth(0, 5, level));
    const energy = mix(0.45, 1.35, mood.energy);
    const motion = energy * (0.35 + 0.65 * g);
    const tracer = a.tracers;

    // ---------------------------------------------------------------- read the capture
    const ids = new Uint8Array(N);
    const dep = new Float32Array(N);
    const tones = new Uint32Array(256);
    let solid = 0;
    for (let p = 0; p < N; p++) {
      const id = identity[p * 4];
      ids[p] = id;
      if (id > 0) {
        dep[p] = (depth[p * 4] * 65536 + depth[p * 4 + 1] * 256 + depth[p * 4 + 2]) / 16777216;
        tones[diffuse[p * 4]]++;
        solid++;
      } else dep[p] = 1;
    }
    let lit = 255;
    for (let seen = 0; lit > 20 && seen < solid * 0.05; lit--) seen += tones[lit];
    const metres = Math.max(1e-6, capture.far - capture.near);
    const pws = capture.pixelWorldSize > 0 ? capture.pixelWorldSize : metres / n;
    const depthPx = metres / pws; // depth units to pixels

    // Each thing's centre and extent, so marks fit the thing they describe.
    const count = new Float64Array(256), sumX = new Float64Array(256), sumY = new Float64Array(256), sumD = new Float64Array(256);
    for (let p = 0; p < N; p++) {
      const id = ids[p];
      count[id]++;
      sumX[id] += p % n;
      sumY[id] += (p / n) | 0;
      sumD[id] += dep[p];
    }
    const cx = new Float32Array(256), cy = new Float32Array(256), radius = new Float32Array(256), meanD = new Float32Array(256);
    const spacing = new Float32Array(256), offset = new Float32Array(256);
    const formOf: Form[] = [];
    const formStart = Math.floor(random() * FORMS.length);
    const bandsAcross = mix(3.2, 6.5, g);
    for (let id = 0; id < 256; id++) {
      if (!count[id]) continue;
      cx[id] = sumX[id] / count[id];
      cy[id] = sumY[id] / count[id];
      meanD[id] = sumD[id] / count[id];
      radius[id] = Math.sqrt(count[id] / Math.PI);
      spacing[id] = Math.min(64 * sc, Math.max(4.5 * sc, (radius[id] * 2) / bandsAcross));
      offset[id] = Math.floor(hash(id, 3, seed) * H);
      formOf[id] = a.form === 'mixed' ? FORMS[(formStart + id) % FORMS.length] : a.form;
    }
    const groundForm: Form = a.form === 'mixed' ? 'tunnel' : a.form;

    // The vanishing point: where the deepest surfaces gather, drawn a little toward the middle.
    let threshold = 1;
    {
      const bins = new Uint32Array(1024);
      for (let p = 0; p < N; p++) if (ids[p] > 0) bins[Math.min(1023, (dep[p] * 1024) | 0)]++;
      let seen = 0;
      for (let b = 1023; b >= 0; b--) {
        seen += bins[b];
        if (seen > solid * 0.06) {
          threshold = b / 1024;
          break;
        }
      }
    }
    let vx = 0, vy = 0, vc = 0;
    for (let p = 0; p < N; p++)
      if (ids[p] > 0 && dep[p] >= threshold) (vx += p % n, (vy += (p / n) | 0), vc++);
    vx = vc ? vx / vc : n / 2;
    vy = vc ? vy / vc : n * 0.4;
    vx = mix(vx, n / 2, 0.3);
    vy = mix(vy, n * 0.42, 0.3);
    await pause();

    // ---------------------------------------------------------------- edges
    // Hard edges: the outline of every thing. Soft edges: where set meets ground, depth jumps, creases.
    const hardMask = new Uint8Array(N), softMask = new Uint8Array(N), thingMask = new Uint8Array(N);
    const jump = pws * 7 / metres;
    const nrm = (p: number, c: number) => normal[p * 4 + c] / 127.5 - 1;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const p = y * n + x;
        const id = ids[p];
        if (id >= 3) thingMask[p] = 1;
        for (let k = 0; k < 2; k++) {
          const q = k === 0 ? (x < n - 1 ? p + 1 : -1) : y < n - 1 ? p + n : -1;
          if (q < 0) continue;
          const other = ids[q];
          if (other !== id) {
            if (Math.max(id, other) >= 3) (hardMask[p] = 1, (hardMask[q] = 1));
            else softMask[p] = 1;
          } else if (id > 0) {
            const dot = nrm(p, 0) * nrm(q, 0) + nrm(p, 1) * nrm(q, 1) + nrm(p, 2) * nrm(q, 2);
            if (Math.abs(dep[p] - dep[q]) > jump || dot < 0.8) softMask[p] = 1;
          }
        }
      }
    const hard = distanceTo(hardMask, n).dist;
    await pause();
    const soft = distanceTo(softMask, n).dist;
    await pause();
    const halo = distanceTo(thingMask, n);
    await pause();

    // ---------------------------------------------------------------- colour helpers
    const out = new Float32Array(N * 3);
    const pc: RGB = [0, 0, 0];
    /** A palette colour at a fractional position: hues sit side by side, sliding with the sheen. */
    const pal = (t: number, sheen: number) => {
      const i = Math.floor(t);
      let f = t - i;
      f = sheen > 0.5 ? f * f * (3 - 2 * f) : smooth(1 - Math.max(0.08, sheen * 0.5), 1, f);
      const c0 = hues[((i % H) + H) % H], c1 = hues[(((i + 1) % H) + H) % H];
      pc[0] = c0[0] + (c1[0] - c0[0]) * f;
      pc[1] = c0[1] + (c1[1] - c0[1]) * f;
      pc[2] = c0[2] + (c1[2] - c0[2]) * f;
    };
    const altShift = Math.max(2, Math.round(H / 3));
    /** A line colour kept apart in value from what it is drawn over: darkened on pale, lifted on dark. */
    const lc: RGB = [0, 0, 0];
    const contrast = (r: number, g: number, b: number, under: number) => {
      const l = lum(r, g, b);
      if (under > 0.5) {
        const k = l > under - 0.32 ? Math.max(0, under - 0.32) / Math.max(0.02, l) : 1;
        lc[0] = r * k;
        lc[1] = g * k;
        lc[2] = b * k;
      } else {
        const w = l < under + 0.32 ? clamp01((under + 0.32 - l) / Math.max(0.05, 1 - l)) : 0;
        lc[0] = mix(r, 1, w);
        lc[1] = mix(g, 1, w);
        lc[2] = mix(b, 1, w);
      }
    };
    const fillMarks = a.mark === 'fill' || a.mark === 'keyline';
    const lineWidth = (a.mark === 'hairline' ? 0.75 : a.mark === 'bold-line' ? 1.9 : a.mark === 'keyline' ? 1.15 : 0.45) * sc;
    const hardWidth = mix(0.9, 2.1, smooth(0, 6, level)) * sc * (a.mark === 'keyline' ? 1.5 : 1);
    const softWidth = mix(0.5, 0.9, g) * sc * (a.mark === 'keyline' ? 1.3 : 1);
    const aa = 0.7 * sc;
    const lineAt = (distance: number, width: number) => 1 - smooth(width - aa, width + aa, distance);
    const angle = random() * Math.PI;
    const phase0 = random() * 10;
    const kal: [number, number] = [0.62 + random() * 0.28, 0.48 + random() * 0.3];
    const fieldZoom = mix(1.6, 2.6, random());

    /** Warps a local coordinate by the chosen motion. Writes wx, wy. */
    let wx = 0, wy = 0;
    const warp = (x: number, y: number, S: number, reach: number, salt: number) => {
      wx = x;
      wy = y;
      if (a.motion === 'breathing') {
        const r = Math.sqrt(x * x + y * y);
        const f = 1 + 0.13 * motion * Math.sin(r / (S * 3.1) + phase0);
        wx *= f;
        wy *= f;
      } else if (a.motion === 'flowing') {
        const s = S * 4.5;
        wx += (noise(x / s, y / s, seed + salt) - 0.5) * S * 2.6 * motion;
        wy += (noise(x / s + 17, y / s - 9, seed + salt + 1) - 0.5) * S * 2.6 * motion;
      } else if (a.motion === 'melting') {
        const drip = noise(x / (S * 5), salt, seed + 5);
        wy -= drip * drip * S * 5 * motion * (0.4 + clamp01((y + reach) / (reach * 2)));
      } else {
        const r = Math.sqrt(x * x + y * y);
        const turn = 1.6 * motion * Math.exp(-r / reach);
        const c = Math.cos(turn), s = Math.sin(turn);
        wx = x * c - y * s;
        wy = x * s + y * c;
      }
    };

    /** Evaluates a form constant at a pixel in a frame centred on (ox, oy). */
    const evaluate = (form: Form, p: number, x: number, y: number, ox: number, oy: number, S: number, warpReach: number, refract: number, phase: number, salt: number) => {
      const nx = nrm(p, 0), ny = nrm(p, 1), nz = nrm(p, 2);
      if (form === 'honeycomb' || form === 'checker' || form === 'molecule') {
        // Lattices are laid on the surface itself: stretched along the way the surface turns from the
        // viewer, so a floor's cells foreshorten and a wall's stand up.
        let u = x - ox, v = y - oy;
        const tl = Math.sqrt(nx * nx + ny * ny);
        if (tl > 0.05) {
          const tx = nx / tl, ty = -ny / tl;
          const c = u * tx + v * ty;
          const stretched = c / Math.max(0.3, Math.abs(nz));
          u += tx * (stretched - c);
          v += ty * (stretched - c);
        }
        warp(u, v, S, warpReach, salt);
        if (form === 'honeycomb') honeycomb(wx, wy, S);
        else if (form === 'checker') checker(wx, wy, S, angle);
        else molecule(wx, wy, S * 1.25, seed + salt);
        return;
      }
      warp(x - ox + nx * refract, y - oy - ny * refract, S, warpReach, salt);
      if (form === 'tunnel') tunnel(wx, wy, S, sym, phase);
      else if (form === 'spiral') spiral(wx, wy, S, sym, phase);
      else cobweb(wx, wy, S, sym, phase);
    };

    // ---------------------------------------------------------------- the field beyond (8A / 8B)
    const field: RGB = [0, 0, 0];
    let fieldEdge = 99;
    const foldTo = (x: number, y: number, order: number) => {
      const r = Math.sqrt(x * x + y * y);
      const wedge = Math.PI / order;
      let t = Math.atan2(y, x) + Math.PI;
      t = t % (wedge * 2);
      if (t > wedge) t = wedge * 2 - t;
      wx = r * Math.cos(t);
      wy = r * Math.sin(t);
    };
    const gasket = 1.06 + random() * 0.22;
    const fractalField = (x: number, y: number) => {
      // A kaleidoscope folded by the symmetry, filled with an inversion fractal: circles nested in circles.
      foldTo(x, y, sym);
      const zoom = fieldZoom * 1.4;
      let px = (wx / n) * zoom + 0.31, py = (wy / n) * zoom - 0.17;
      let scale = 1, trap = 9, at = 0;
      for (let i = 0; i < 8; i++) {
        px = -1 + 2 * fract(0.5 * px + 0.5);
        py = -1 + 2 * fract(0.5 * py + 0.5);
        const r2 = px * px + py * py + 1e-6;
        if (r2 < trap) (trap = r2, (at = i));
        const k = gasket / r2;
        px *= k;
        py *= k;
        scale *= k;
      }
      const d = (0.25 * Math.abs(py)) / scale; // distance to the nearest thread, in field units
      const px2 = (d * n) / zoom;
      const bands = Math.log(trap + 1e-4) * -0.8 + at * 1.7 + phase0;
      pal(bands, Math.max(0.5, P.sheen));
      const f = fract(bands);
      fieldEdge = Math.min(px2, Math.min(f, 1 - f) * 10 * sc);
      const glow = Math.exp(-px2 / (2.5 * sc));
      const depthTone = mix(0.6, 1.08, clamp01(1 - at / 7));
      field[0] = Math.min(1, pc[0] * depthTone + glow * 0.25);
      field[1] = Math.min(1, pc[1] * depthTone + glow * 0.25);
      field[2] = Math.min(1, pc[2] * depthTone + glow * 0.25);
    };
    const mandalaField = (x: number, y: number) => {
      // Nested, ordered mandala rings: petals doubling outward, each petal outlined three deep.
      const r = Math.sqrt(x * x + y * y) + 1e-3;
      const th = Math.atan2(y, x) + Math.PI;
      const S0 = 9 * sc, phi = 1.34;
      const rr = Math.log(r / S0) / Math.log(phi);
      const j = Math.floor(rr), t = rr - j;
      const petals = sym * (1 << Math.min(4, Math.max(0, (j >> 1) % 4 + 1)));
      const s = fract((th / TAU) * petals + (j & 1) * 0.5);
      const cellW = (TAU * r) / petals, cellH = r * Math.log(phi);
      const dx = (s - 0.5) * 2, dy = (t - 0.5) * 2;
      // A pointed petal: narrow at both ends, round in the middle.
      const e = Math.sqrt(dx * dx * (1 + Math.max(0, dy) * 2.2) + dy * dy);
      const nested = e * 3;
      const k = Math.floor(nested);
      const inside = e < 1;
      pal(inside ? j * 2 + k + 1 : j * 2 + phase0, 0.1);
      field[0] = pc[0];
      field[1] = pc[1];
      field[2] = pc[2];
      const local = Math.min(cellW, cellH) * 0.5;
      const ring = Math.min(t, 1 - t) * cellH;
      const outline = inside ? Math.min(fract(nested), 1 - fract(nested)) * (local / 3) : Math.abs(e - 1) * local;
      // Glyphs: a dot of information at the heart of every petal.
      const dot = e < 0.16 ? 0 : 99;
      fieldEdge = Math.min(ring, outline, dot);
    };
    await pause();

    // ---------------------------------------------------------------- draw every surface
    const groundS = mix(30, 17, g) * sc;
    const groundReach = n * 0.35;
    for (let y = 0; y < n; y++) {
      if ((y & 31) === 0) await pause();
      for (let x = 0; x < n; x++) {
        const p = y * n + x;
        const id = ids[p];
        const thing = id >= 3;
        const L = id > 0 ? Math.min(1.25, diffuse[p * 4] / lit) : 1;
        const nz = id > 0 ? nrm(p, 2) : 1;

        // The scene as it is, its colour sampled through any melt, with a breathing shimmer of hues.
        let sx = x, sy = y;
        if (a.motion === 'melting' && !thing && level > 1.5) {
          const drip = noise(x / (38 * sc), 3, seed + 11);
          sy = Math.max(0, Math.round(y - drip * drip * drip * 46 * sc * motion * g * (0.3 + y / n)));
          if (ids[sy * n + sx] >= 3) sy = y;
        }
        const sp = (sy * n + sx) * 4;
        let r = color[sp] / 255, gr = color[sp + 1] / 255, b = color[sp + 2] / 255;
        if (velvet) {
          // Under black light the room sinks into the dark; only the inks fluoresce.
          r *= 0.4;
          gr *= 0.4;
          b *= 0.45;
        }
        const sceneLum = lum(r, gr, b);

        // The geometry on this surface.
        let S: number, form: Form, ox: number, oy: number, refract: number, phase: number, reach: number;
        if (thing) {
          S = spacing[id];
          form = formOf[id];
          ox = cx[id];
          oy = cy[id];
          refract = radius[id] * mix(0.25, 0.7, g);
          phase = ((dep[p] - meanD[id]) * depthPx) / S * 0.5 + phase0;
          reach = radius[id];
        } else {
          S = groundS;
          form = groundForm;
          ox = vx;
          oy = vy;
          refract = id > 0 ? 26 * sc * g : 0;
          phase = id > 0 ? -dep[p] * mix(4, 10, g) + phase0 : phase0;
          reach = groundReach;
        }
        evaluate(form, p, x, y, ox, oy, S, reach, refract, phase, thing ? id * 13 : 0);
        const lineA = lineAt(o.edge, lineWidth);
        const sheenShift = P.sheen * ((1 - nz) * 2.4 + L * 0.8);
        const centre = o.band === -99;
        pal(centre ? offset[id] + 1 : o.band + (thing ? offset[id] : 0) + o.alt * altShift + sheenShift, P.sheen);
        let fr = pc[0], fg = pc[1], fb = pc[2];
        if (centre) {
          // The light at the end of the tunnel.
          fr = mix(fr, 1, 0.55);
          fg = mix(fg, 1, 0.55);
          fb = mix(fb, 1, 0.55);
        }
        // The breathing shimmer: the scene keeps its values, but its hues slide cell by cell through the palette.
        {
          const drift = fbm(x / (110 * sc), y / (110 * sc), seed + 31);
          pal(centre ? offset[id] : o.band + (thing ? offset[id] : 0) + o.alt * altShift + drift * 2.5 + (1 - nz) * 2, 1);
          const hueLum = Math.max(0.05, lum(pc[0], pc[1], pc[2]));
          const k = Math.min(2.4, (sceneLum + 0.03) / hueLum);
          r = mix(r, Math.min(1, pc[0] * k), shimmer);
          gr = mix(gr, Math.min(1, pc[1] * k), shimmer);
          b = mix(b, Math.min(1, pc[2] * k), shimmer);
        }
        const shade = thing ? mix(0.4, 1.12, Math.min(1, L)) : id > 0 ? mix(0.62, 1.06, Math.min(1, L)) : 1;
        // The ground the geometry is drawn on: the scene, pulled toward the palette's ground as it deepens.
        let br: number, bg: number, bb: number;
        if (P.dark) {
          const keep = velvet ? mix(0.5, 0.18, g) : mix(0.8, 0.32, g);
          br = mix(P.ground[0], r, keep) + fr * 0.07;
          bg = mix(P.ground[1], gr, keep) + fg * 0.07;
          bb = mix(P.ground[2], b, keep) + fb * 0.07;
        } else {
          const toward = mix(0.15, 0.55, g);
          br = mix(r, P.ground[0], toward);
          bg = mix(gr, P.ground[1], toward);
          bb = mix(b, P.ground[2], toward);
        }
        // Skeletal formulae leave the cells between rings blank.
        const blank = form === 'molecule' ? o.alt === 0 : P.dark && o.alt === 0 && !centre;
        let gr0: number, gg0: number, gb0: number;
        if (fillMarks) {
          const ink = a.mark === 'keyline' ? 0.95 : 0.6;
          gr0 = mix(blank ? br : fr * shade, P.ink[0], lineA * ink);
          gg0 = mix(blank ? bg : fg * shade, P.ink[1], lineA * ink);
          gb0 = mix(blank ? bb : fb * shade, P.ink[2], lineA * ink);
        } else {
          const lift = P.dark ? Math.min(1.2, shade * 1.1) : shade;
          contrast(Math.min(1, fr * lift), Math.min(1, fg * lift), Math.min(1, fb * lift), lum(br, bg, bb));
          gr0 = mix(br, lc[0], lineA);
          gg0 = mix(bg, lc[1], lineA);
          gb0 = mix(bb, lc[2], lineA);
        }
        const amount = thing ? thingAmount : setAmount * (id === 0 ? 0.9 : 1);
        let cr = mix(r, gr0, amount), cg = mix(gr, gg0, amount), cb = mix(b, gb0, amount);
        // Below full geometry, the lines still crawl faintly over the scene.
        const over = lineA * faint * (1 - amount);
        if (over > 0) {
          contrast(fr, fg, fb, lum(cr, cg, cb));
          cr = mix(cr, lc[0], over);
          cg = mix(cg, lc[1], over);
          cb = mix(cb, lc[2], over);
        }

        // The field beyond: set, ground and sky fold into the kaleidoscope.
        // Each thing is made of the same field, centred on itself, magnified to its size and bent by its surface.
        if (fieldAmount > 0) {
          if (thing) {
            const zoom = (n * 0.22) / Math.max(6 * sc, radius[id]);
            const lx = (x - cx[id] + nrm(p, 0) * radius[id] * 0.5) * zoom, ly = (y - cy[id] - nrm(p, 1) * radius[id] * 0.5) * zoom;
            if (ordered) mandalaField(lx, ly);
            else fractalField(lx, ly);
          } else if (ordered) mandalaField(x - vx, y - vy);
          else fractalField(x - vx, y - vy);
          let fr2 = field[0], fg2 = field[1], fb2 = field[2];
          if (!ordered && !thing) {
            // The room itself, mirror-folded into the field.
            foldTo(x - n / 2, y - n * 0.45, sym);
            const mx = Math.min(n - 1, Math.max(0, Math.round(n / 2 + wx))), my = Math.min(n - 1, Math.max(0, Math.round(n * 0.45 + wy)));
            const mp = my * n + mx;
            if (ids[mp] < 3) {
              const ml = lum(color[mp * 4] / 255, color[mp * 4 + 1] / 255, color[mp * 4 + 2] / 255);
              const lift = mix(0.7, 1.25, ml);
              fr2 *= lift;
              fg2 *= lift;
              fb2 *= lift;
            }
          }
          const edgeA = lineAt(fieldEdge, lineWidth * 0.9);
          if (fillMarks) {
            fr2 = mix(fr2, P.ink[0], edgeA * 0.7);
            fg2 = mix(fg2, P.ink[1], edgeA * 0.7);
            fb2 = mix(fb2, P.ink[2], edgeA * 0.7);
          } else {
            const base = P.dark ? 0.32 : 0.9;
            const lr = P.dark ? Math.min(1, fr2 * 1.3) : fr2 * 0.8;
            const lg = P.dark ? Math.min(1, fg2 * 1.3) : fg2 * 0.8;
            const lb = P.dark ? Math.min(1, fb2 * 1.3) : fb2 * 0.8;
            fr2 = mix(P.dark ? fr2 * base : mix(P.ground[0], fr2, 0.45), lr, edgeA);
            fg2 = mix(P.dark ? fg2 * base : mix(P.ground[1], fg2, 0.45), lg, edgeA);
            fb2 = mix(P.dark ? fb2 * base : mix(P.ground[2], fb2, 0.45), lb, edgeA);
          }
          // Light and shadow still fall across the folded set, so the room keeps its shape.
          const keep = thing ? shade * 1.05 : id > 0 ? mix(1, mix(0.5, 1.1, Math.min(1, L)), 0.65) : 1;
          const fa = fieldAmount * (thing ? 0.6 : id === 0 ? 1 : 0.92);
          cr = mix(cr, fr2 * keep, fa);
          cg = mix(cg, fg2 * keep, fa);
          cb = mix(cb, fb2 * keep, fa);
        }

        // Soft lines keep the room's structure; hard lines keep every thing's silhouette.
        const softA = lineAt(soft[p], softWidth) * mix(0.3, 0.75, g) * (thing ? 0.7 : 1);
        if (softA > 0) {
          const ir = P.dark ? Math.min(1, fr * 1.2 + 0.1) : P.ink[0];
          const ig = P.dark ? Math.min(1, fg * 1.2 + 0.1) : P.ink[1];
          const ib = P.dark ? Math.min(1, fb * 1.2 + 0.1) : P.ink[2];
          cr = mix(cr, ir, softA);
          cg = mix(cg, ig, softA);
          cb = mix(cb, ib, softA);
        }
        out[p * 3] = cr;
        out[p * 3 + 1] = cg;
        out[p * 3 + 2] = cb;
      }
    }
    await pause();

    // ---------------------------------------------------------------- tracers and auras
    const echo = new Float32Array(N * 3);
    echo.set(out);
    {
      const steps = Math.round(mix(2, 7, tracer));
      const stride = mix(3, 8, mood.energy) * sc * mix(1, 1.6, g);
      const heading = random() * TAU;
      const gap = mix(1.5, 3.5, g) * sc;
      const separate = smooth(2, 6, level) * 0.9;
      const dx = Math.cos(heading) * stride, dy = Math.sin(heading) * stride * 0.6;
      for (let y = 0; y < n; y++) {
        if ((y & 63) === 0) await pause();
        for (let x = 0; x < n; x++) {
          const p = y * n + x;
          const id = ids[p];
          // Rings of echo ripple out from each thing.
          const d = halo.dist[p];
          const near = halo.near[p];
          let cr = out[p * 3], cg = out[p * 3 + 1], cb = out[p * 3 + 2];
          if (id < 3 && near >= 0 && tracer > 0.02) {
            const owner = ids[near];
            const R = radius[owner];
            const ring = Math.min(14 * sc, Math.max(3.2 * sc, R * 0.13));
            const reachPx = tracer * (R * 0.9 + 28 * sc);
            if (d < reachPx) {
              const k = Math.floor(d / ring);
              const fade = (1 - d / reachPx) * mix(0.5, 0.92, tracer);
              if (k % 2 === 0 || fillMarks) {
                pal(offset[owner] + k + 0.5, 0.2);
                const lift = P.dark ? 1 : 0.92;
                cr = mix(cr, pc[0] * lift, fade);
                cg = mix(cg, pc[1] * lift, fade);
                cb = mix(cb, pc[2] * lift, fade);
              } else {
                cr = mix(cr, P.ground[0], fade * 0.6);
                cg = mix(cg, P.ground[1], fade * 0.6);
                cb = mix(cb, P.ground[2], fade * 0.6);
              }
            }
          }
          // Afterimages trail behind each thing, each echo a hue further on.
          for (let s = 1; tracer > 0.02 && s <= steps; s++) {
            const qx = Math.round(x + dx * s), qy = Math.round(y + dy * s);
            if (qx < 0 || qy < 0 || qx >= n || qy >= n) break;
            const q = qy * n + qx;
            const other = ids[q];
            if (other < 3 || other === id || (id >= 3 && dep[p] < dep[q])) continue;
            const fade = tracer * (1 - s / (steps + 1)) * 0.8;
            pal(offset[other] + s * 1.0, 0.3);
            cr = mix(cr, mix(out[q * 3], pc[0], 0.55), fade);
            cg = mix(cg, mix(out[q * 3 + 1], pc[1], 0.55), fade);
            cb = mix(cb, mix(out[q * 3 + 2], pc[2], 0.55), fade);
            break;
          }
          // A clear gap around every thing keeps it apart from the geometry behind it.
          if (id < 3 && d < hardWidth + gap + aa) {
            const gapA = (1 - smooth(hardWidth + gap - aa, hardWidth + gap + aa, d)) * separate;
            const gc = P.dark ? 0 : 1;
            cr = mix(cr, P.dark ? gc : P.ground[0], gapA);
            cg = mix(cg, P.dark ? gc : P.ground[1], gapA);
            cb = mix(cb, P.dark ? gc : P.ground[2], gapA);
          }
          echo[p * 3] = cr;
          echo[p * 3 + 1] = cg;
          echo[p * 3 + 2] = cb;
        }
      }
    }

    // The silhouette over everything: a keyline, glowing on dark palettes, ink on pale ones.
    for (let p = 0; p < N; p++) {
      if (hard[p] > hardWidth + aa) continue;
      const id = ids[p] >= 3 ? ids[p] : halo.near[p] >= 0 ? ids[halo.near[p]] : 3;
      // A small figure gets a finer keyline, so the outline does not swallow it.
      const width = Math.min(hardWidth, Math.max(0.8 * sc, radius[id] * 0.09));
      const hA = lineAt(hard[p], width) * mix(0.45, 1, smooth(0, 5, level));
      if (hA <= 0) continue;
      let kr = P.ink[0], kg = P.ink[1], kb = P.ink[2];
      if (P.dark) {
        pal(offset[id] + 2, 0);
        kr = mix(pc[0], 1, 0.45);
        kg = mix(pc[1], 1, 0.45);
        kb = mix(pc[2], 1, 0.45);
      }
      echo[p * 3] = mix(echo[p * 3], kr, hA);
      echo[p * 3 + 1] = mix(echo[p * 3 + 1], kg, hA);
      echo[p * 3 + 2] = mix(echo[p * 3 + 2], kb, hA);
    }
    await pause();

    // ---------------------------------------------------------------- the print
    const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
    for (let p = 0; p < N; p++) {
      R[p] = echo[p * 3];
      G[p] = echo[p * 3 + 1];
      B[p] = echo[p * 3 + 2];
    }
    const bloom = (amount: number, radiusPx: number, threshold: number) => {
      const br = new Float32Array(N), bg = new Float32Array(N), bb = new Float32Array(N);
      for (let p = 0; p < N; p++) {
        const l = lum(R[p], G[p], B[p]);
        const w = smooth(threshold, threshold + 0.35, Math.max(R[p], G[p], B[p]) * 0.35 + l * 0.65);
        br[p] = R[p] * w;
        bg[p] = G[p] * w;
        bb[p] = B[p] * w;
      }
      const rad = Math.max(1, Math.round(radiusPx));
      blur(br, n, rad, 3);
      blur(bg, n, rad, 3);
      blur(bb, n, rad, 3);
      for (let p = 0; p < N; p++) {
        R[p] = 1 - (1 - R[p]) * (1 - br[p] * amount);
        G[p] = 1 - (1 - G[p]) * (1 - bg[p] * amount);
        B[p] = 1 - (1 - B[p]) * (1 - bb[p] * amount);
      }
    };
    const grain = a.grain * 0.13 + mood.wear * 0.03;
    if (a.finish === 'vision') {
      if (P.dark) bloom(0.35, 5 * sc, 0.45);
    } else if (a.finish === 'blotter') {
      // Ink soaks into absorbent paper; a grid of perforations cuts the sheet into tabs.
      blur(R, n, 1, 1);
      blur(G, n, 1, 1);
      blur(B, n, 1, 1);
      const paper = hex('#f3ecdb');
      const tab = n / 18;
      const hole = 4.2 * sc;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const p = y * n + x;
          const fibre = noise(x / (1.4 * sc), y / (9 * sc), seed + 51) * 0.6 + noise(x / (7 * sc), y / (1.2 * sc), seed + 52) * 0.4;
          const soak = 0.1 + mood.wear * 0.08;
          let r = mix(R[p], paper[0], soak) * (0.95 + fibre * 0.08);
          let gg = mix(G[p], paper[1], soak) * (0.95 + fibre * 0.08);
          let b = mix(B[p], paper[2], soak) * (0.94 + fibre * 0.08);
          const ux = x / tab, uy = y / tab;
          const ex = Math.min(fract(ux), 1 - fract(ux)) * tab, ey = Math.min(fract(uy), 1 - fract(uy)) * tab;
          const lineD = Math.min(ex, ey);
          if (lineD < 1.6 * sc) {
            // A crease of pressed paper, broken into a row of punched holes.
            const along = ex < ey ? y : x;
            const inHole = fract(along / hole) < 0.42;
            if (inHole && lineD < 1.0 * sc) (r = mix(r, paper[0] * 1.02, 0.85), (gg = mix(gg, paper[1] * 1.02, 0.85)), (b = mix(b, paper[2] * 1.02, 0.85)));
            else (r *= 0.8, (gg *= 0.8), (b *= 0.8));
          }
          R[p] = r;
          G[p] = gg;
          B[p] = b;
        }
    } else if (a.finish === 'poster') {
      // Inks snapped toward the palette, one plate a little out of register.
      const plates = [...hues, P.ground, P.ink];
      const snap = mix(0.25, 0.65, g);
      const shiftX = Math.round(2 * sc), shiftY = Math.round(-1.5 * sc);
      const r0 = R.slice();
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const p = y * n + x;
          const qx = Math.min(n - 1, Math.max(0, x - shiftX)), qy = Math.min(n - 1, Math.max(0, y - shiftY));
          const r = r0[qy * n + qx], gg = G[p], b = B[p];
          let best = 0, bestD = 9;
          for (let i = 0; i < plates.length; i++) {
            const c = plates[i];
            const d = (c[0] - r) ** 2 + (c[1] - gg) ** 2 + (c[2] - b) ** 2;
            if (d < bestD) (bestD = d, (best = i));
          }
          const c = plates[best];
          R[p] = mix(r, c[0], snap);
          G[p] = mix(gg, c[1], snap);
          B[p] = mix(b, c[2], snap);
        }
    } else if (a.finish === 'velvet') {
      // Black flocking: a soft pile shows in the dark ground; the fluorescent inks are pushed brighter.
      for (let p = 0; p < N; p++) {
        const x = p % n, y = (p / n) | 0;
        const l = lum(R[p], G[p], B[p]);
        const pile = (noise(x / (1.1 * sc), y / (1.1 * sc), seed + 61) * 0.6 + noise(x / (4 * sc), y / (4 * sc), seed + 62) * 0.4) * 0.07 * (1 - smooth(0.1, 0.4, l));
        const mx = Math.max(R[p], G[p], B[p]), mn = Math.min(R[p], G[p], B[p]);
        const sat = mx > 0 ? (mx - mn) / mx : 0;
        const boost = 1 + sat * 0.35;
        R[p] = Math.min(1, R[p] * boost) + pile * 0.8;
        G[p] = Math.min(1, G[p] * boost) + pile * 0.6;
        B[p] = Math.min(1, B[p] * boost) + pile;
      }
      bloom(0.5, 7 * sc, 0.45);
    } else {
      // An oil-wheel projection: pools of coloured light drift over the picture, which blooms and fringes.
      const blobS = n / 3.2;
      const r0 = R.slice(), b0 = B.slice();
      const fringe = 2.5 * sc;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const p = y * n + x;
          const ox = x - n / 2, oy = y - n / 2;
          const rr = Math.sqrt(ox * ox + oy * oy) / (n / 2);
          const ux = Math.round((ox / (n / 2)) * fringe), uy = Math.round((oy / (n / 2)) * fringe);
          const qr = Math.min(n - 1, Math.max(0, y + uy)) * n + Math.min(n - 1, Math.max(0, x + ux));
          const qb = Math.min(n - 1, Math.max(0, y - uy)) * n + Math.min(n - 1, Math.max(0, x - ux));
          const blob = fbm(x / blobS, y / blobS, seed + 71);
          pal(blob * H * 2, 1);
          const pool = smooth(0.45, 0.75, fbm(x / blobS + 5, y / blobS - 3, seed + 72)) * 0.32;
          const vignette = 1 - smooth(0.7, 1.45, rr) * 0.75;
          // Projected light is deeper than ink on paper: the wall between the light stays dim.
          const deepen = (v: number) => Math.pow(Math.max(0, v), 1.35);
          R[p] = deepen(1 - (1 - r0[qr]) * (1 - pc[0] * pool)) * vignette;
          G[p] = deepen(1 - (1 - G[p]) * (1 - pc[1] * pool)) * vignette;
          B[p] = deepen(1 - (1 - b0[qb]) * (1 - pc[2] * pool)) * vignette;
        }
      bloom(0.38, 9 * sc, 0.5);
    }
    await pause();

    // Grain, and the mood's warmth laid over all.
    const warm = (mood.warmth - 0.5) * 0.06;
    const dim = mood.cheer < 0.3 ? mix(0.88, 1, mood.cheer / 0.3) : 1;
    const pixels = new Uint8ClampedArray(N * 4);
    for (let p = 0; p < N; p++) {
      const x = p % n, y = (p / n) | 0;
      const grit = grain > 0 ? (hash(x, y, seed + 91) - 0.5) * grain + (noise(x / (2.5 * sc), y / (2.5 * sc), seed + 92) - 0.5) * grain * 0.8 : 0;
      pixels[p * 4] = (R[p] * dim * (1 + warm) + grit) * 255;
      pixels[p * 4 + 1] = (G[p] * dim + grit) * 255;
      pixels[p * 4 + 2] = (B[p] * dim * (1 - warm) + grit) * 255;
      pixels[p * 4 + 3] = 255;
    }

    return {
      pixels,
      notes: [
        `geometry level ${levelName}`,
        `${a.form} form constant in ${a.palette} colour, ${sym}-fold`,
        `${a.mark} marks, ${a.motion}`,
        ...(tracer > 0.02 ? [`tracers ${Math.round(tracer * 100)}%`] : []),
        `printed as ${a.finish}`,
      ],
    };
  },
});
