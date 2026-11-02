import { type Palette as PicturePalette, type PaletteRole, type RGB as Paint, choice, clamp01, defineLook, mix, rekey, rekeyOne, score, seeded } from '@conjure/kit';

/**
 * Collage studio: the frame rebuilt as a mixed-media collage.
 *
 * Identity decides the pieces: every placed thing, the set and (optionally) a strip of floor is
 * cut out of its own source medium, given a cut edge, a small paste misalignment and a drop
 * shadow, then pasted onto one sheet in depth order. Colour, plain lighting, normals and depth
 * feed each medium; the key light direction says where the shadows fall; the model's
 * confidence in a thing decides whether it was committed to print or left as a pencil study.
 */

type RGB = [number, number, number];
type Medium = 'ink' | 'halftone' | 'pencil' | 'photo' | 'blueprint' | 'torn';
type Cut = 'scalpel' | 'scissors' | 'loose' | 'torn' | 'rectangles';
type Palette = 'true' | 'riso' | 'vintage' | 'neon' | 'mono' | 'primary';

const MEDIA = {
  ink: 'A flat-ink print: two or three solid colours under a black outline, like a screenprint or a poster.',
  halftone: 'A halftone cutting from a magazine or newspaper: the picture made of coloured dots on newsprint.',
  pencil: 'A graphite study on white sketchbook paper: hatched, soft, drawn by hand.',
  photo: 'A glossy photograph: the real thing, full colour, cut from a catalogue page.',
  blueprint: 'A blueprint: white line work on Prussian blue, with a faint drafting grid.',
  torn: 'Torn coloured paper: a flat silhouette ripped from a sheet, no detail inside, white fibres along every edge.',
} as const;
const MEDIUM_NAMES: Record<Medium, string> = {
  ink: 'flat ink',
  halftone: 'halftone',
  pencil: 'pencil',
  photo: 'photograph',
  blueprint: 'blueprint',
  torn: 'torn paper',
};
const MEDIUM_KEYS = Object.keys(MEDIA) as Medium[];

const hex = (value: string): RGB => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16) / 255) as RGB;
const luma = (r: number, g: number, b: number) => r * 0.3 + g * 0.59 + b * 0.11;
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in -1..1. */
function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1;
}

/** Box blur in place, `passes` times, edges clamped. */
function blur(field: Float32Array, size: number, radius: number, passes: number, scratch: Float32Array) {
  radius = Math.round(radius);
  if (radius < 1) return;
  const window = radius * 2 + 1;
  const line = new Float32Array(size + window + 1);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < size; y++) {
      const row = y * size;
      let sum = 0;
      line[0] = 0;
      for (let i = -radius; i < size + radius; i++) {
        sum += field[row + (i < 0 ? 0 : i >= size ? size - 1 : i)];
        line[i + radius + 1] = sum;
      }
      for (let x = 0; x < size; x++) scratch[row + x] = (line[x + window] - line[x]) / window;
    }
    for (let x = 0; x < size; x++) {
      let sum = 0;
      line[0] = 0;
      for (let i = -radius; i < size + radius; i++) {
        sum += scratch[(i < 0 ? 0 : i >= size ? size - 1 : i) * size + x];
        line[i + radius + 1] = sum;
      }
      for (let y = 0; y < size; y++) field[y * size + x] = (line[y + window] - line[y]) / window;
    }
  }
}

/** Distance in pixels from every pixel to the nearest set pixel of the mask (chamfer 1, 1.414), capped. */
function distanceField(mask: Uint8Array, size: number, cap: number): Float32Array {
  const d = new Float32Array(size * size);
  for (let p = 0; p < d.length; p++) d[p] = mask[p] ? 0 : cap;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      let v = d[p];
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[p - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[p - size] + 1);
        if (x > 0) v = Math.min(v, d[p - size - 1] + 1.414);
        if (x < size - 1) v = Math.min(v, d[p - size + 1] + 1.414);
      }
      d[p] = v;
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const p = y * size + x;
      let v = d[p];
      if (v === 0) continue;
      if (x < size - 1) v = Math.min(v, d[p + 1] + 1);
      if (y < size - 1) {
        v = Math.min(v, d[p + size] + 1);
        if (x < size - 1) v = Math.min(v, d[p + size + 1] + 1.414);
        if (x > 0) v = Math.min(v, d[p + size - 1] + 1.414);
      }
      d[p] = v;
    }
  return d;
}

/** Coverage of a round-dot screen at one point: dots below half tone, paper holes above it. */
function screen(x: number, y: number, cos: number, sin: number, period: number, tint: number, gain: number) {
  if (tint <= 0.004) return 0;
  if (tint >= 0.97) return 1;
  let u = (x * cos + y * sin) / period;
  let v = (y * cos - x * sin) / period;
  const holes = tint > 0.56;
  if (holes) {
    u += 0.5;
    v += 0.5;
  }
  u -= Math.floor(u) + 0.5;
  v -= Math.floor(v) + 0.5;
  const distance = Math.sqrt(u * u + v * v) * period;
  const radius = period * Math.sqrt((holes ? 1 - tint : tint) / Math.PI) + (holes ? -gain : gain);
  const cover = clamp01(radius - distance + 0.5);
  return holes ? 1 - cover : cover;
}

/** One printing ink: its colour, screen angle, how much of the picture's darkness it carries, and the hue it answers to. */
interface Ink {
  colour: RGB;
  cos: number;
  sin: number;
  dark: number;
  chroma: RGB | null;
  process?: 'c' | 'm' | 'y' | 'k';
}
function ink(colour: string, degrees: number, dark: number, process?: Ink['process']): Ink {
  const rgb = hex(colour);
  const y = luma(...rgb);
  const chroma: RGB = [rgb[0] - y, rgb[1] - y, rgb[2] - y];
  const length = Math.hypot(...chroma);
  const radians = (degrees * Math.PI) / 180;
  return {
    colour: rgb,
    cos: Math.cos(radians),
    sin: Math.sin(radians),
    dark,
    chroma: length > 0.05 ? (chroma.map((c) => c / length) as RGB) : null,
    process,
  };
}
const INK_SETS: Record<Palette, Ink[]> = {
  true: [ink('#00a0dc', 15, 0, 'c'), ink('#e62878', 75, 0, 'm'), ink('#fad71e', 0, 0, 'y'), ink('#1a1618', 45, 1, 'k')],
  riso: [ink('#0078bf', 15, 0.78, ), ink('#ff48b0', 75, 0.12)],
  vintage: [ink('#5e3c28', 45, 0.88), ink('#b04034', 15, 0.08), ink('#c49a3a', 0, 0.04)],
  neon: [ink('#141418', 45, 0.88), ink('#ff148c', 15, 0), ink('#82f014', 75, 0)],
  mono: [ink('#161618', 45, 1)],
  primary: [ink('#161618', 45, 0.82), ink('#d6222c', 15, 0.02), ink('#184cac', 75, 0.04), ink('#face00', 0, 0)],
};
const RED_INKS: Ink[] = [ink('#c8202a', 45, 1)];

/** Coloured papers in the drawer, per palette; a torn piece takes the nearest to the thing's own colour. */
const STOCKS: Record<Palette, RGB[]> = {
  true: ['#d8362f', '#ef7a2a', '#f6c531', '#f3e9c9', '#8cc152', '#2f8f5b', '#2aa7a0', '#3d8fd1', '#2b4c9b', '#6b4aa0', '#e56aa0', '#7a4a2f', '#26262b', '#9a9a98', '#f7f5ee', '#f4a7a0', '#a9d6e8'].map(hex),
  riso: ['#ff48b0', '#0078bf', '#ffd5e8', '#bfe0f5', '#f7f3ea', '#2a2a2e'].map(hex),
  vintage: ['#c9a66b', '#8c5a3c', '#a8453a', '#6b6b3a', '#e8dcc0', '#3a2a22', '#d9b48a'].map(hex),
  neon: ['#ff1e8c', '#8cff1e', '#ffe600', '#1a1a1e', '#ff7a00', '#00e5ff'].map(hex),
  mono: ['#1a1a1c', '#4a4a4c', '#8a8a8c', '#c8c8c6', '#f2f2ef'].map(hex),
  primary: ['#d8262c', '#1d4ea8', '#f5c800', '#1a1a1c', '#f4f1ea'].map(hex),
};
const PIN_COLOURS = ['#d8262c', '#1d4ea8', '#f5c800', '#2f9a4a', '#f4f1ea', '#e8731e'];
const CRAYONS: Record<Palette, string[]> = {
  true: ['#d8262c', '#1d4ea8', '#2f9a4a', '#f5a000', '#7b3fa0'],
  riso: ['#ff48b0', '#0078bf'],
  vintage: ['#a8453a', '#6b6b3a', '#5e3c28'],
  neon: ['#ff1e8c', '#8cff1e', '#ffe600'],
  mono: ['#1a1a1c', '#1a1a1c', '#c8202a'],
  primary: ['#d8262c', '#1d4ea8', '#f5c800'],
};

/**
 * Under the picture's palette the free sets turn to its colours, keeping their design: riso's
 * fluorescent ink on the ink and its shadow-carrying blue on the second; vintage's faded inks as one
 * family on the ink with olive on the second; neon's loud papers split between ink and second under
 * a fixed black; mono's lone accent on the ink. Black, white and grey stay; the scene's own colours
 * stay the scene's; primary keeps its Bauhaus primaries; push pins stay their shop colours. The
 * circled marker answers in the second colour. i = ink, s = second, - = fixed, per colour in order.
 */
const SET_ROLES: Partial<Record<Palette, { inks: string; stocks: string; crayons: string }>> = {
  riso: { inks: 'si', stocks: 'isis--', crayons: 'is' },
  vintage: { inks: 'iii', stocks: 'iiis-ii', crayons: 'isi' },
  neon: { inks: '-is', stocks: 'isi-is', crayons: 'isi' },
  mono: { inks: '-', stocks: '-----', crayons: '--i' },
};
const ROLE_OF: Record<string, PaletteRole | undefined> = { i: 'ink', s: 'second' };
const toPaint = (c: RGB): Paint => [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)];
const fromPaint = (c: Paint): RGB => [c[0] / 255, c[1] / 255, c[2] / 255];
const paintHexOf = (c: Paint) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
function keyedList(list: RGB[], pattern: string, picture: PicturePalette): RGB[] {
  const out = rekey(Object.fromEntries(list.map((c, i) => [i, toPaint(c)])), picture, Object.fromEntries(list.map((_, i) => [i, ROLE_OF[pattern[i]]])));
  return list.map((c, i) => (ROLE_OF[pattern[i]] ? fromPaint(out[i]) : c));
}
/** The same ink, printed in another colour: screen angle, darkness and process kept. */
function reinked(source: Ink, colour: RGB): Ink {
  const y = luma(...colour);
  const chroma: RGB = [colour[0] - y, colour[1] - y, colour[2] - y];
  const length = Math.hypot(...chroma);
  return { ...source, colour, chroma: length > 0.05 ? (chroma.map((c) => c / length) as RGB) : null };
}
function tableIn(key: Palette, picture: PicturePalette | undefined) {
  const plain = { inks: INK_SETS[key], stocks: STOCKS[key], crayons: CRAYONS[key], accentStock: hex('#d12a2a'), accentInks: RED_INKS, marker: (colour: string) => colour };
  if (!picture) return plain;
  const marker = (colour: string) => paintHexOf(rekeyOne(toPaint(hex(colour)), picture, 'second'));
  const roles = SET_ROLES[key];
  if (!roles) return { ...plain, marker };
  const inkColours = keyedList(INK_SETS[key].map((i) => i.colour), roles.inks, picture);
  return {
    inks: INK_SETS[key].map((i, k) => (ROLE_OF[roles.inks[k]] ? reinked(i, inkColours[k]) : i)),
    stocks: keyedList(STOCKS[key], roles.stocks, picture),
    crayons: keyedList(CRAYONS[key].map(hex), roles.crayons, picture).map((c, k) => (ROLE_OF[roles.crayons[k]] ? paintHexOf(toPaint(c)) : CRAYONS[key][k])),
    accentStock: fromPaint(rekeyOne(toPaint(hex('#d12a2a')), picture, 'ink')),
    accentInks: [reinked(RED_INKS[0], fromPaint(rekeyOne(toPaint(RED_INKS[0].colour), picture, 'ink')))],
    marker,
  };
}

interface Piece {
  id: number;
  strip: boolean;
  rect: boolean;
  medium: Medium;
  cut: Cut;
  dist: Float32Array | null;
  top: Float32Array | null;
  bottom: Float32Array | null;
  margin: number;
  amp: number;
  seed: number;
  box: [number, number, number, number];
  px: number;
  py: number;
  cos: number;
  sin: number;
  ox: number;
  oy: number;
  shx: number;
  shy: number;
  soft: number;
  rim: number;
  stock: RGB;
  stockDark: RGB;
  accent: boolean;
  period: number;
  sheen: number;
  inks: Ink[];
  doubtful: boolean;
  hero: boolean;
  count: number;
}

export default defineLook({
  questions: {
    hero: choice('What is the main subject cut from?', MEDIA),
    rest: choice('What are the supporting objects and the set cut from?', {
      same: 'The same medium as the main subject: one consistent source, and only the cutting and pasting makes it a collage.',
      mixed: 'Each from something different: a true mixed-media jumble of print, photo, pencil and paper.',
      ...MEDIA,
    }),
    stage: choice('What do they stand on?', {
      bare: 'Nothing is cut for the ground: the pieces are pasted straight onto the sheet and their shadows are pencilled in underneath.',
      strip: 'A torn strip of coloured paper laid across the sheet as a floor.',
      photo: 'A photograph of the real ground, cut as a band and pasted under everything.',
      halftone: 'A band of newsprint halftone showing the floor, dots and all.',
      ink: 'A flat-ink printed band of floor in two or three solid colours.',
      blueprint: 'A blueprint plan of the ground, drafted on blue, pasted under the pieces.',
      pencil: 'The ground sketched in pencil on a torn page of sketchbook.',
    }),
    sheet: choice('What is it all pasted onto?', {
      kraft: 'Brown kraft paper, warm and workmanlike.',
      white: 'Heavy white cartridge paper, clean and gallery-like.',
      black: 'Black card, so every piece and shadow pops.',
      graph: 'Pale graph paper with a fine blue grid: a schoolbook or a lab notebook.',
      page: 'A page torn from an old printed book, grey type showing between the pieces.',
      cardboard: 'Corrugated cardboard from a box, rough, brown and fluted.',
    }),
    cut: choice('How were the pieces cut out?', {
      scalpel: 'Scalpel: exact along every outline, no margin, nothing wobbles.',
      scissors: 'Scissors: a little loose, corners rounded off, a confident hand-wobble.',
      loose: 'Cut lazily, with a wide margin of the source page left around each object.',
      torn: 'Torn out by hand: ragged edges with white fibre showing all round.',
      rectangles: 'Snipped out as plain rectangles, as if clipped straight from the page.',
      mixed: 'Every piece cut its own way: some torn, some scissored, some left as rectangles.',
    }),
    fixing: choice('How are the pieces fixed down?', {
      glue: 'Glued flat: hairline shadows, nothing on top.',
      tape: 'Strips of masking tape over the edges.',
      pins: 'Coloured push pins through the top of each piece, as on a cork board.',
      staples: 'Stapled on, quick and careless.',
      unfixed: 'Not fixed at all: just laid in place, lifting and shifting, with deep shadows.',
    }),
    inks: choice('What inks and papers were on the table? Their colours come from the picture\u2019s palette.', {
      true: "The scene's own colours in every medium.",
      riso: 'Risograph inks: two fluorescent inks only, one light and one deep, overprinted.',
      vintage: 'Old magazines: faded, dusty, sun-bleached inks and papers on yellowed stock.',
      neon: 'Loud fluorescent papers and inks under black, clashing and clubby.',
      mono: 'Black and white only: photocopies, pencil and black paper, with the main subject alone in one strong colour.',
      primary: 'Red, blue and yellow papers and inks under black: a Bauhaus poster.',
    }),
    marks: choice('What did the collagist add by hand at the end?', {
      nothing: 'Nothing: the pieces speak for themselves.',
      circled: 'The main subject ringed in bright marker, with an arrow pointing at it.',
      scribbles: 'Crayon scribbles rubbed in under every piece, as shadows and emphasis.',
      numbers: 'A numbered sticker on every piece, like an inventory or an exploded diagram.',
      coffee: 'A coffee ring and a thumbprint: it sat on the desk a long time.',
      titled: 'A strip of masking tape along the bottom with the idea written on it in marker.',
    }),
    care: score('How carefully was it assembled?', [
      'Thrown together in a hurry',
      'Quick',
      'Reasonably neat',
      'Careful',
      'Meticulous, every edge true',
    ]),
  },

  async apply(capture, a, context, signal) {
    const { size, color, identity, normal, diffuse } = capture;
    const n = size * size;
    const mood = context.mood;
    const rng = seeded((context.seed ^ 0x7a11e5) >>> 0);
    const seed = Math.floor(rng() * 1e6);
    const scratch = new Float32Array(n);
    const palette = a.inks as Palette;
    const table = tableIn(palette, context.palette);
    let checkpoints = 0;
    const pause = async () => {
      signal.throwIfAborted();
      if (++checkpoints % 5 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const at = (x: number, y: number) => (y < 0 ? 0 : y > size - 1 ? size - 1 : y) * size + (x < 0 ? 0 : x > size - 1 ? size - 1 : x);

    // ---- 1. Read the capture ------------------------------------------------------------------
    const id = new Uint8Array(n);
    const lum = new Float32Array(n);
    const lit = new Float32Array(n);
    const far = new Float32Array(n);
    const histogram = new Uint32Array(256);
    let groundCount = 0;
    for (let p = 0; p < n; p++) {
      const q = p * 4;
      id[p] = identity[q];
      lum[p] = luma(color[q], color[q + 1], color[q + 2]) / 255;
      far[p] = id[p] === 0 ? 1 : (capture.depth[q] * 65536 + capture.depth[q + 1] * 256 + capture.depth[q + 2]) / 16777216;
      const l = luma(diffuse[q], diffuse[q + 1], diffuse[q + 2]);
      lit[p] = l;
      if (id[p] > 0) histogram[Math.min(255, Math.round(l))]++;
      if (id[p] === 1) groundCount++;
    }
    // Plain lighting normalised so "in shadow" means the same in every world.
    let total = 0;
    for (let v = 0; v < 256; v++) total += histogram[v];
    let bright = 255;
    for (let v = 0, seen = 0; v < 256; v++) {
      seen += histogram[v];
      if (seen >= total * 0.92) {
        bright = Math.max(8, v);
        break;
      }
    }
    for (let p = 0; p < n; p++) lit[p] = Math.min(1.25, lit[p] / bright);
    let groundMedian = 0.8;
    if (groundCount > 0) {
      const bins = new Uint32Array(128);
      for (let p = 0; p < n; p++) if (id[p] === 1) bins[Math.min(127, Math.floor(lit[p] * 100))]++;
      for (let v = 0, seen = 0; v < 128; v++) {
        seen += bins[v];
        if (seen >= groundCount / 2) {
          groundMedian = Math.max(0.1, v / 100);
          break;
        }
      }
    }
    const shadowLine = groundMedian * 0.72;

    // Edges: silhouettes, depth steps and creases, for the drawn media.
    const edge = new Uint8Array(n);
    const range = Math.max(1e-6, capture.far - capture.near);
    const jump = Math.max(capture.pixelWorldSize * 4, range * 0.0002) / range;
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const p = y * size + x;
        if (id[p] !== id[p + 1] || id[p] !== id[p + size]) {
          edge[p] = 255;
          continue;
        }
        if (id[p] === 0) continue;
        if (Math.abs(far[p] - far[p + 1]) > jump || Math.abs(far[p] - far[p + size]) > jump) {
          edge[p] = 210;
          continue;
        }
        const q = p * 4;
        const nx = normal[q] - 128;
        const ny = normal[q + 1] - 128;
        const nz = normal[q + 2] - 128;
        const r = (p + 1) * 4;
        const d = (p + size) * 4;
        const dotRight = (nx * (normal[r] - 128) + ny * (normal[r + 1] - 128) + nz * (normal[r + 2] - 128)) / 16129;
        const dotDown = (nx * (normal[d] - 128) + ny * (normal[d + 1] - 128) + nz * (normal[d + 2] - 128)) / 16129;
        if (Math.min(dotRight, dotDown) < 0.78) edge[p] = 140;
      }
    const lineAt = (p: number) => {
      const x = p % size;
      const y = (p / size) | 0;
      return Math.max(edge[p], edge[at(x - 1, y)], edge[at(x, y - 1)], edge[at(x + 1, y)], edge[at(x, y + 1)]) / 255;
    };
    // A smoothed colour for the flat media, so a print has areas and not noise.
    const smooth = [0, 1, 2].map((c) => {
      const plane = new Float32Array(n);
      for (let p = 0; p < n; p++) plane[p] = color[p * 4 + c] / 255;
      blur(plane, size, 2, 1, scratch);
      return plane;
    });
    await pause();

    // ---- 2. Decide the pieces -----------------------------------------------------------------
    let maxId = 0;
    const counts = new Uint32Array(256);
    for (let p = 0; p < n; p++) {
      counts[id[p]]++;
      if (id[p] > maxId) maxId = id[p];
    }
    // Which ids become pieces: the set and every thing big enough to cut; scraps fold into the set.
    const pieceIds: number[] = [];
    for (let k = 2; k <= maxId; k++) if (counts[k] >= 40) pieceIds.push(k);
    if (pieceIds.length > 11) {
      pieceIds.sort((p, q) => counts[q] - counts[p]);
      pieceIds.length = 11;
    }
    const keep = new Set(pieceIds);
    if (!keep.has(2) && pieceIds.length === 0 && counts[2] > 0) pieceIds.push(2), keep.add(2);
    for (let p = 0; p < n; p++) if (id[p] >= 2 && !keep.has(id[p])) id[p] = keep.has(2) ? 2 : pieceIds[0] ?? 2;
    if (!keep.has(2)) for (let p = 0; p < n; p++) if (id[p] === 2) id[p] = pieceIds[0] ?? 2;

    // Depth order from the boundaries where pieces meet: the nearer one is pasted later.
    const wins = new Map<number, number>();
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const p = y * size + x;
        const me = id[p];
        if (me < 2) continue;
        for (const q of [p + 1, p + size]) {
          const other = id[q];
          if (other < 2 || other === me) continue;
          const nearer = far[p] < far[q] ? me : other;
          const farther = nearer === me ? other : me;
          wins.set(nearer, (wins.get(nearer) ?? 0) + 1);
          wins.set(farther, (wins.get(farther) ?? 0) - 1);
        }
      }
    pieceIds.sort((p, q) => (wins.get(p) ?? 0) - (wins.get(q) ?? 0) || counts[q] - counts[p]);

    const heroId = pieceIds.includes(3) ? 3 : pieceIds[0];
    const fall = (() => {
      let fx = -capture.light[0];
      let fy = -capture.light[1];
      const length = Math.hypot(fx, fy);
      if (length < 0.08) return [0.55, 0.83];
      return [fx / length, fy / length];
    })();
    const care = a.care;
    const jitterRotation = ((0.4 + (1 - care) * 2.6) * Math.PI) / 180 * (0.5 + mood.energy * 0.8);
    const jitterOffset = 1 + (1 - care) * 4;
    const liftBase = { glue: 0.12, tape: 0.3, pins: 0.42, staples: 0.26, unfixed: 0.9 }[a.fixing];

    const pool = MEDIUM_KEYS.filter((m) => m !== a.hero).sort(() => rng() - 0.5);
    let poolAt = 0;
    const mediumFor = (pieceId: number): Medium => {
      if (pieceId === heroId) return a.hero;
      if (a.rest === 'same') return a.hero;
      if (a.rest === 'mixed') return pool[poolAt++ % pool.length];
      return a.rest;
    };
    const cutFor = (medium: Medium): Cut => {
      if (medium === 'torn') return 'torn';
      if (a.cut !== 'mixed') return a.cut;
      const options: Cut[] = ['scissors', 'torn', 'rectangles', 'loose', 'scissors'];
      return options[Math.floor(rng() * options.length)];
    };
    const nearestStock = (base: RGB, stocks: RGB[]): RGB => {
      let best = stocks[0];
      let bestDistance = Infinity;
      for (const stock of stocks) {
        const d = (stock[0] - base[0]) ** 2 + (stock[1] - base[1]) ** 2 + (stock[2] - base[2]) ** 2;
        if (d < bestDistance) {
          bestDistance = d;
          best = stock;
        }
      }
      return best;
    };
    const saturated = (c: RGB, amount: number): RGB => {
      const y = luma(...c);
      return [clamp01(y + (c[0] - y) * amount), clamp01(y + (c[1] - y) * amount), clamp01(y + (c[2] - y) * amount)];
    };

    const pieces: Piece[] = [];
    const makePiece = (pieceId: number, medium: Medium, strip: boolean): Piece => {
      const cut = strip ? (medium === 'torn' || a.cut === 'torn' || a.cut === 'mixed' ? 'torn' : 'scissors') : cutFor(medium);
      const confidence = capture.confidence?.[pieceId] ?? 1;
      const doubtful = !strip && confidence < 0.5;
      if (doubtful) medium = 'pencil';
      const base = capture.baseColors[pieceId] ?? [128, 128, 128];
      const baseRgb: RGB = [base[0] / 255, base[1] / 255, base[2] / 255];
      const accent = palette === 'mono' && pieceId === heroId;
      const stock = accent ? table.accentStock : nearestStock(saturated(baseRgb, palette === 'true' ? 1.5 : 1.2), table.stocks);
      const margin = { scalpel: 1.2, scissors: 5 + rng() * 2, loose: 12 + rng() * 7, torn: 6 + rng() * 4, rectangles: 10 + rng() * 6 }[cut];
      const amp = { scalpel: 0, scissors: 2.8, loose: 3.2, torn: 7 * (1 + mood.wear * 0.5), rectangles: 1.2 }[cut] * (1.3 - care * 0.6);
      const angle = cut === 'scalpel' ? 0 : (rng() - 0.5) * 2 * jitterRotation * (strip ? 0.3 : 1);
      const lift = (liftBase + (doubtful ? 0.4 : 0)) * (1 + (1 - care) * 0.3) * (strip ? 0.6 : 1);
      const throwBy = 2 + lift * 11;
      return {
        id: pieceId,
        strip,
        rect: cut === 'rectangles',
        medium,
        cut,
        dist: null,
        top: null,
        bottom: null,
        margin,
        amp,
        seed: Math.floor(rng() * 1e6),
        box: [size, size, 0, 0],
        px: 0,
        py: 0,
        cos: Math.cos(angle),
        sin: Math.sin(angle),
        ox: cut === 'scalpel' ? 0 : (rng() - 0.5) * 2 * jitterOffset,
        oy: cut === 'scalpel' ? 0 : (rng() - 0.5) * 2 * jitterOffset,
        shx: fall[0] * throwBy,
        shy: fall[1] * throwBy,
        soft: 0.8 + lift * 5,
        rim: cut === 'torn' ? 2.4 + mood.wear : cut === 'scalpel' ? 0.8 : 1.3,
        stock,
        stockDark: lerp3(stock, [0, 0, 0], 0.32),
        accent,
        period: 4.2 + rng() * 1.4,
        sheen: rng(),
        inks: accent ? table.accentInks : table.inks,
        doubtful,
        hero: pieceId === heroId,
        count: counts[pieceId],
      };
    };

    // The floor strip goes down first.
    const stageMedium: Medium | null = a.stage === 'bare' || groundCount < n * 0.02 ? null : a.stage === 'strip' ? 'torn' : a.stage;
    if (stageMedium) {
      const strip = makePiece(1, stageMedium, true);
      const horizon = new Float32Array(size).fill(size);
      const floor = new Float32Array(size).fill(-1);
      for (let x = 0; x < size; x++)
        for (let y = 0; y < size; y++)
          if (id[y * size + x] === 1) {
            if (horizon[x] === size) horizon[x] = y;
            floor[x] = y;
          }
      // Smooth the horizon across columns so the strip follows the broad line of the ground.
      const smoothed = new Float32Array(size);
      for (let x = 0; x < size; x++) {
        let sum = 0;
        let count = 0;
        for (let k = -24; k <= 24; k++) {
          const v = horizon[Math.max(0, Math.min(size - 1, x + k))];
          if (v < size) {
            sum += v;
            count++;
          }
        }
        smoothed[x] = count ? sum / count : size * 0.5;
      }
      let feet = size;
      for (let p = 0; p < n; p++) if (id[p] >= 2) feet = Math.min(feet, (p / size) | 0);
      let lowest = 0;
      for (let y = size - 1; y >= 0 && !lowest; y--) for (let x = 0; x < size; x++) if (id[y * size + x] >= 2) { lowest = y; break; }
      // The strip's top sits around the middle of the cast, never above the real horizon: a floor,
      // not a backdrop, so the sheet still shows above it.
      const bandTop = Math.max(size * 0.1, feet + (lowest - feet) * 0.5 - size * 0.06);
      strip.top = new Float32Array(size);
      strip.bottom = new Float32Array(size);
      const rough = strip.cut === 'torn' ? 1 : 0.4;
      for (let x = 0; x < size; x++) {
        const wobble = (valueNoise(x / 60, 0.5, strip.seed) * 7 + valueNoise(x / 14, 0.5, strip.seed + 1) * 3 + valueNoise(x / 4, 0.5, strip.seed + 2) * 1.2) * rough;
        strip.top[x] = Math.max(smoothed[x] + 2, bandTop) + wobble;
        const bottom = floor[x] >= size - 2 ? size + 40 : floor[x] + 10;
        strip.bottom[x] = bottom + (valueNoise(x / 50, 3.5, strip.seed + 3) * 6 + valueNoise(x / 9, 3.5, strip.seed + 4) * 2) * rough;
      }
      let top = size;
      for (let x = 0; x < size; x++) top = Math.min(top, strip.top[x]);
      strip.box = [0, Math.max(0, Math.floor(top)), size - 1, size - 1];
      strip.px = size / 2;
      strip.py = (strip.box[1] + size) / 2;
      strip.amp = 0;
      strip.rim = strip.cut === 'torn' ? 3 : 1.3;
      pieces.push(strip);
    }

    const mask = new Uint8Array(n);
    for (const pieceId of pieceIds) {
      const piece = makePiece(pieceId, mediumFor(pieceId), false);
      let sx = 0;
      let sy = 0;
      piece.count = 0;
      for (let p = 0; p < n; p++) {
        const mine = id[p] === pieceId ? 1 : 0;
        mask[p] = mine;
        if (!mine) continue;
        piece.count++;
        const x = p % size;
        const y = (p / size) | 0;
        sx += x;
        sy += y;
        if (x < piece.box[0]) piece.box[0] = x;
        if (y < piece.box[1]) piece.box[1] = y;
        if (x > piece.box[2]) piece.box[2] = x;
        if (y > piece.box[3]) piece.box[3] = y;
      }
      piece.px = sx / piece.count;
      piece.py = sy / piece.count;
      piece.dist = distanceField(mask, size, 72);
      pieces.push(piece);
      await pause();
    }

    // ---- 3. Where a piece is, in output space -------------------------------------------------
    let SX = 0;
    let SY = 0;
    /** Positive inside the piece (distance in pixels past its cut edge), negative outside. Leaves the source point in SX, SY. */
    const edgeAt = (pc: Piece, x: number, y: number): number => {
      const dx = x - pc.ox - pc.px;
      const dy = y - pc.oy - pc.py;
      const sx = pc.px + dx * pc.cos + dy * pc.sin;
      const sy = pc.py - dx * pc.sin + dy * pc.cos;
      SX = sx;
      SY = sy;
      if (pc.strip) {
        const col = sx < 0 ? 0 : sx > size - 1 ? size - 1 : Math.round(sx);
        return Math.min(sy - pc.top![col], pc.bottom![col] - sy);
      }
      let base: number;
      if (pc.rect) {
        const m = pc.margin;
        base = Math.min(sx - pc.box[0] + m, pc.box[2] + m - sx, sy - pc.box[1] + m, pc.box[3] + m - sy);
      } else {
        if (sx < -0.5 || sx > size - 0.5 || sy < -0.5 || sy > size - 0.5) return -60;
        base = pc.margin - pc.dist![Math.round(sy) * size + Math.round(sx)];
      }
      if (pc.amp === 0 || base > pc.amp + 1 || base < -pc.amp - 1) return base;
      let wobble: number;
      switch (pc.cut) {
        case 'scissors':
          wobble = valueNoise(sx / 23, sy / 23, pc.seed) * 2.2 + valueNoise(sx / 9, sy / 9, pc.seed + 1) * 0.6;
          break;
        case 'loose':
          wobble = valueNoise(sx / 31, sy / 31, pc.seed) * 3;
          break;
        case 'torn':
          wobble = valueNoise(sx / 19, sy / 19, pc.seed) * 4 + valueNoise(sx / 7, sy / 7, pc.seed + 1) * 2.2 + valueNoise(sx / 2.8, sy / 2.8, pc.seed + 2) * 1.1;
          break;
        default:
          wobble = valueNoise(sx / 40, sy / 40, pc.seed) * 1.2;
      }
      return base + wobble * (pc.amp / (pc.cut === 'torn' ? 7.3 : pc.cut === 'loose' ? 3 : pc.cut === 'scissors' ? 2.8 : 1.2));
    };
    const boundaryDown = (pc: Piece, x: number): number => {
      for (let y = Math.max(0, pc.box[1] - pc.margin - pc.amp - 8); y < size; y++) if (edgeAt(pc, x, y) > 0) return y;
      return pc.box[1];
    };
    const boundarySide = (pc: Piece, y: number, fromLeft: boolean): number => {
      if (fromLeft) {
        for (let x = Math.max(0, pc.box[0] - pc.margin - pc.amp - 8); x < size; x++) if (edgeAt(pc, x, y) > 0) return x;
        return pc.box[0];
      }
      for (let x = Math.min(size - 1, pc.box[2] + pc.margin + pc.amp + 8); x >= 0; x--) if (edgeAt(pc, x, y) > 0) return x;
      return pc.box[2];
    };

    // ---- 4. Fixings and marks, drawn once on a canvas -----------------------------------------
    const overlay = document.createElement('canvas');
    overlay.width = overlay.height = size;
    const g = overlay.getContext('2d', { willReadFrequently: true })!;
    const handFont = '"Comic Sans MS", "Segoe Print", "Bradley Hand", "Marker Felt", "Chalkboard SE", cursive, sans-serif';
    const tape = (x: number, y: number, angle: number, length: number, width: number) => {
      g.save();
      g.translate(x, y);
      g.rotate(angle);
      const half = length / 2;
      const serrated = (sign: number) => {
        const steps = 5;
        for (let i = 0; i <= steps; i++) {
          const t = -width / 2 + (width * i) / steps;
          const bite = (i % 2 === 0 ? 0 : 1.8) + (rng() - 0.5) * 1.2;
          g.lineTo(sign * (half - bite), sign > 0 ? t : -t);
        }
      };
      g.beginPath();
      g.moveTo(-half, -width / 2);
      g.lineTo(half - 2, -width / 2);
      serrated(1);
      g.lineTo(-half + 2, width / 2);
      serrated(-1);
      g.closePath();
      g.save();
      g.translate(1.2, 2.2);
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.fill();
      g.restore();
      g.fillStyle = `rgba(${Math.round(236 - mood.wear * 20)},${Math.round(220 - mood.wear * 30)},${Math.round(170 - mood.wear * 30)},0.74)`;
      g.fill();
      g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.22)';
      g.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        const yy = -width / 2 + (width * (i + 0.5)) / 4;
        g.moveTo(-half, yy + (rng() - 0.5) * 3);
        g.lineTo(half, yy + (rng() - 0.5) * 3);
        g.stroke();
      }
      g.strokeStyle = 'rgba(110,90,50,0.22)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-half, -width / 2 + 0.6);
      g.lineTo(half, -width / 2 + 0.6);
      g.moveTo(-half, width / 2 - 0.6);
      g.lineTo(half, width / 2 - 0.6);
      g.stroke();
      g.restore();
    };
    const pin = (x: number, y: number, colour: string) => {
      const r = 7;
      g.fillStyle = 'rgba(0,0,0,0.32)';
      g.beginPath();
      g.ellipse(x + 2.5, y + 3.5, r, r * 0.8, 0, 0, Math.PI * 2);
      g.fill();
      const shine = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
      shine.addColorStop(0, '#ffffff');
      shine.addColorStop(0.25, colour);
      shine.addColorStop(1, 'rgba(0,0,0,0.9)');
      g.fillStyle = shine;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 1;
      g.stroke();
    };
    const staple = (x: number, y: number, angle: number) => {
      g.save();
      g.translate(x, y);
      g.rotate(angle);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(-7 + 1, -1.3 + 1.5, 14, 2.6);
      g.fillStyle = '#9ea2a6';
      g.fillRect(-7, -1.3, 14, 2.6);
      g.fillStyle = '#5a5e62';
      g.fillRect(-7, -1.3, 1.6, 2.6);
      g.fillRect(5.4, -1.3, 1.6, 2.6);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(-5, -1.3, 10, 0.8);
      g.restore();
    };
    const sticker = (x: number, y: number, label: string) => {
      g.save();
      g.translate(x, y);
      g.rotate((rng() - 0.5) * 0.5);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath();
      g.arc(1.5, 2.5, 12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f6f3ea';
      g.beginPath();
      g.arc(0, 0, 12, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(40,40,40,0.5)';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = 'rgba(25,25,30,0.9)';
      g.font = `bold 15px ${handFont}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, 0, 1);
      g.restore();
    };
    const marker = (points: [number, number][], colour: string, width: number, alpha: number) => {
      g.save();
      g.strokeStyle = colour;
      g.globalAlpha = alpha;
      g.lineWidth = width;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      g.restore();
    };

    const things = pieces.filter((pc) => !pc.strip);
    const numbered = [...pieces].sort((p, q) => (q.hero ? 1 : 0) - (p.hero ? 1 : 0));
    for (const pc of pieces) {
      const width = pc.box[2] - pc.box[0];
      const height = pc.box[3] - pc.box[1];
      const wants = a.fixing === 'unfixed' || a.fixing === 'glue' ? 0 : 1 + (pc.strip || pc.count > n * 0.12 || rng() < 0.3 + mood.density * 0.4 ? 1 : 0);
      const topX = pc.box[0] + width * (0.3 + rng() * 0.4);
      const topY = boundaryDown(pc, topX);
      const sideY = pc.box[1] + height * (0.3 + rng() * 0.4);
      const fromLeft = rng() < 0.5;
      const sideX = boundarySide(pc, sideY, fromLeft);
      const points: [number, number, number][] = [[topX, topY, (rng() - 0.5) * 0.7], [sideX, sideY, Math.PI / 2 + (rng() - 0.5) * 0.7]];
      if (pc.strip) points[1] = [pc.box[0] + width * (0.75 + rng() * 0.15), boundaryDown(pc, pc.box[0] + width * 0.82), (rng() - 0.5) * 0.7];
      for (let i = 0; i < wants; i++) {
        const [x, y, angle] = points[i];
        if (a.fixing === 'tape') tape(x, y, angle, 42 + rng() * 22, 15 + rng() * 3);
        else if (a.fixing === 'pins') pin(x, y + 3, PIN_COLOURS[Math.floor(rng() * PIN_COLOURS.length)]);
        else if (a.fixing === 'staples') staple(x, y + 2, angle + (rng() - 0.5) * 0.8);
      }
      if (pc.doubtful && a.fixing !== 'pins') pin(topX, topY + 3, PIN_COLOURS[Math.floor(rng() * PIN_COLOURS.length)]);
    }
    let markNote = 'no marks';
    const crayons = table.crayons;
    const hero = things.find((pc) => pc.hero);
    if (a.marks === 'circled' && hero) {
      const pad = 16 + hero.margin;
      const cx = (hero.box[0] + hero.box[2]) / 2 + hero.ox;
      const cy = (hero.box[1] + hero.box[3]) / 2 + hero.oy;
      const rx = (hero.box[2] - hero.box[0]) / 2 + pad;
      const ry = (hero.box[3] - hero.box[1]) / 2 + pad;
      const phase = rng() * Math.PI * 2;
      const ring: [number, number][] = [];
      for (let i = 0; i <= 78; i++) {
        const t = (i / 72) * Math.PI * 2 + phase;
        const wobble = 1 + valueNoise(Math.cos(t) * 2 + 5, Math.sin(t) * 2 + 5, seed + 9) * 0.06 + (i / 78) * 0.04;
        ring.push([cx + Math.cos(t) * rx * wobble, cy + Math.sin(t) * ry * wobble]);
      }
      const red = table.marker(palette === 'vintage' ? '#a8453a' : '#d9252a');
      marker(ring, red, 4.5, 0.85);
      // The arrow comes in from the emptiest corner.
      const corners: [number, number][] = [[40, 40], [size - 40, 40], [40, size - 40], [size - 40, size - 40]];
      const from = corners.sort((p, q) => Math.hypot(q[0] - cx, q[1] - cy) - Math.hypot(p[0] - cx, p[1] - cy))[0];
      const ux = cx - from[0];
      const uy = cy - from[1];
      const length = Math.hypot(ux, uy) || 1;
      const reach = 1 / Math.hypot(ux / length / rx, uy / length / ry);
      const tip: [number, number] = [cx - (ux / length) * (reach + 10), cy - (uy / length) * (reach + 10)];
      const mid: [number, number] = [mix(from[0], tip[0], 0.5) + (rng() - 0.5) * 30, mix(from[1], tip[1], 0.5) + (rng() - 0.5) * 30];
      marker([from, mid, tip], red, 4.5, 0.85);
      const back = Math.atan2(from[1] - tip[1], from[0] - tip[0]);
      for (const spread of [-0.45, 0.45])
        marker([tip, [tip[0] + Math.cos(back + spread) * 20, tip[1] + Math.sin(back + spread) * 20]], red, 4.5, 0.85);
      markNote = 'the subject circled in marker';
    } else if (a.marks === 'scribbles') {
      for (const pc of pieces) {
        const strokes = 1 + Math.floor(rng() * 2 + mood.energy);
        for (let s = 0; s < strokes; s++) {
          const x = pc.box[0] + (pc.box[2] - pc.box[0]) * (0.2 + rng() * 0.6);
          const y = pc.strip ? pc.box[1] + (size - pc.box[1]) * rng() : pc.box[3] + pc.margin + 4 + rng() * 10;
          const w = 30 + rng() * 60;
          const h = 8 + rng() * 14;
          const tilt = (rng() - 0.5) * 0.5;
          const steps = 10 + Math.floor(rng() * 14);
          const path: [number, number][] = [];
          for (let i = 0; i <= steps; i++) {
            const u = (i / steps) * 2 - 1;
            const v = (i % 2 ? 1 : -1) * Math.sqrt(Math.max(0, 1 - u * u)) * h;
            const px = u * w;
            path.push([x + px * Math.cos(tilt) - v * Math.sin(tilt) + (rng() - 0.5) * 3, y + px * Math.sin(tilt) + v * Math.cos(tilt) + (rng() - 0.5) * 3]);
          }
          marker(path, crayons[Math.floor(rng() * crayons.length)], 3.2, 0.55);
        }
      }
      markNote = 'crayon scribbles under the pieces';
    } else if (a.marks === 'numbers') {
      numbered.forEach((pc, index) => {
        const x = pc.box[0] + (pc.box[2] - pc.box[0]) * (pc.strip ? 0.1 : 0.22);
        const y = boundaryDown(pc, x);
        sticker(x, y + 6, String(index + 1));
      });
      markNote = `${pieces.length} numbered stickers`;
    } else if (a.marks === 'coffee') {
      const corner = [[0.2, 0.22], [0.8, 0.2], [0.22, 0.8], [0.8, 0.78]][Math.floor(rng() * 4)];
      const cx = corner[0] * size + (rng() - 0.5) * 60;
      const cy = corner[1] * size + (rng() - 0.5) * 60;
      const r = 52 + rng() * 26;
      g.save();
      g.lineCap = 'round';
      for (let i = 0; i < 80; i++) {
        const t0 = (i / 80) * Math.PI * 2;
        if (rng() < 0.18) continue;
        g.strokeStyle = `rgba(112,72,32,${(0.2 + rng() * 0.25).toFixed(2)})`;
        g.lineWidth = 4 + rng() * 5;
        g.beginPath();
        g.arc(cx, cy, r + valueNoise(Math.cos(t0) + 3, Math.sin(t0) + 3, seed + 12) * 3, t0, t0 + Math.PI / 40 + 0.03);
        g.stroke();
      }
      g.strokeStyle = 'rgba(112,72,32,0.12)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cy, r - 6, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      // A thumbprint: ridges inside an ellipse.
      const tx = size * (rng() < 0.5 ? 0.12 : 0.88) + (rng() - 0.5) * 40;
      const ty = size * (0.3 + rng() * 0.4);
      g.save();
      g.translate(tx, ty);
      g.rotate((rng() - 0.5) * 1.2);
      g.beginPath();
      g.ellipse(0, 0, 17, 22, 0, 0, Math.PI * 2);
      g.clip();
      g.strokeStyle = 'rgba(70,45,30,0.3)';
      g.lineWidth = 1.1;
      for (let i = 1; i <= 11; i++) {
        g.beginPath();
        for (let k = 0; k <= 48; k++) {
          const t = (k / 48) * Math.PI * 2;
          const wob = 1 + valueNoise(Math.cos(t) * 3 + i, Math.sin(t) * 3 + i, seed + 13) * 0.12;
          const x = Math.cos(t) * i * 1.9 * wob;
          const y = Math.sin(t) * i * 2.4 * wob + i * 0.4;
          if (k === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        if (rng() < 0.75) g.stroke();
      }
      g.restore();
      markNote = 'a coffee ring and a thumbprint';
    } else if (a.marks === 'titled') {
      let text = context.idea.trim().replace(/\s+/g, ' ');
      if (text.length > 44) text = `${text.slice(0, 42).trimEnd()}…`;
      if (!text) text = 'untitled';
      const angle = (rng() - 0.5) * 0.05;
      const x = size / 2 + (rng() - 0.5) * 40;
      const y = size - 38;
      tape(x, y, angle, Math.min(size * 0.7, 120 + text.length * 14), 34);
      g.save();
      g.translate(x, y);
      g.rotate(angle);
      g.fillStyle = 'rgba(25,25,30,0.86)';
      g.font = `italic 600 22px ${handFont}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, 0, 1, size * 0.66);
      g.restore();
      markNote = `titled "${text}"`;
    }
    const over = g.getImageData(0, 0, size, size).data;
    await pause();

    // ---- 5. Paint -----------------------------------------------------------------------------
    const sheetBase: RGB = {
      kraft: [0.76, 0.62, 0.44],
      white: [0.95, 0.94, 0.91],
      black: [0.1, 0.1, 0.11],
      graph: [0.93, 0.93, 0.9],
      page: [0.9, 0.86, 0.75],
      cardboard: [0.7, 0.55, 0.37],
    }[a.sheet] as RGB;
    const warmShift = (mood.warmth - 0.5) * 0.05;
    const darkSheet = a.sheet === 'black';
    const shadowTint: RGB = lerp3([0.22, 0.26, 0.42], [0.38, 0.22, 0.2], mood.warmth);
    const core: RGB = [0.97, 0.96, 0.93];
    const graphite: RGB = [0.24, 0.25, 0.28];
    const sanguine: RGB = [0.6, 0.22, 0.16];
    const newsprint: RGB = palette === 'mono' ? [0.95, 0.95, 0.93] : lerp3([0.92, 0.88, 0.78], [0.86, 0.78, 0.6], mood.wear * 0.7 + (palette === 'vintage' ? 0.4 : 0));
    const inkPaper: RGB = palette === 'vintage' ? [0.92, 0.87, 0.74] : [0.96, 0.95, 0.91];
    const pencilPaper: RGB = [0.97, 0.96, 0.93];
    const bluePaper: RGB = palette === 'vintage' ? [0.84, 0.76, 0.6] : palette === 'mono' ? [0.95, 0.95, 0.94] : [0.12, 0.29, 0.55];
    const blueLine: RGB = palette === 'vintage' ? [0.36, 0.22, 0.12] : palette === 'mono' ? [0.12, 0.12, 0.14] : [0.92, 0.95, 0.98];
    const stepX = Math.round(-fall[0]);
    const stepY = Math.round(-fall[1]);
    const creases = Array.from({ length: Math.floor(mood.wear * 3.2) }, () => {
      const angle = rng() * Math.PI;
      return { nx: Math.cos(angle), ny: Math.sin(angle), offset: mix(0.2, 0.8, rng()) * size * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))) };
    });
    const cheerSat = 0.85 + mood.cheer * 0.45;
    const gain = 0.05 + mood.wear * 0.3;
    const pixels = new Uint8ClampedArray(n * 4);
    let r = 0;
    let g1 = 0;
    let b = 0;

    /** Ink coverages for one colour, 0..1 per ink of the set. */
    const covers = new Float32Array(4);
    const separate = (inks: Ink[], cr: number, cg: number, cb: number, lm: number) => {
      const y = luma(cr, cg, cb);
      const chr = cr - y;
      const chg = cg - y;
      const chb = cb - y;
      const magnitude = Math.hypot(chr, chg, chb);
      if (inks[0].process) {
        const k = 1 - Math.max(cr, cg, cb);
        const under = 1 - k + 1e-4;
        covers[0] = clamp01((1 - cr - k) / under) * 0.95;
        covers[1] = clamp01((1 - cg - k) / under) * 0.95;
        covers[2] = clamp01((1 - cb - k) / under) * 0.95;
        covers[3] = clamp01(Math.pow(k, 1.25) * 1.05);
        return;
      }
      for (let i = 0; i < inks.length; i++) {
        const ink = inks[i];
        let affinity = 0;
        if (ink.chroma && magnitude > 0.015) affinity = clamp01(((chr * ink.chroma[0] + chg * ink.chroma[1] + chb * ink.chroma[2]) / magnitude) * magnitude * 3.2);
        covers[i] = clamp01(affinity + (1 - lm) * ink.dark - (ink.dark > 0.5 ? 0.08 : 0));
      }
    };

    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const tooth = (hash2(x, y, seed + 40) - 0.5) * 2;
        const mottle = valueNoise(x / 80, y / 80, seed + 41);

        // The sheet.
        r = sheetBase[0] + warmShift;
        g1 = sheetBase[1];
        b = sheetBase[2] - warmShift;
        switch (a.sheet) {
          case 'kraft': {
            const fibre = valueNoise(x / 2.5, y / 36, seed + 42) * 0.03 + tooth * 0.025 + mottle * 0.03;
            r += fibre;
            g1 += fibre;
            b += fibre;
            break;
          }
          case 'cardboard': {
            const flute = Math.sin((x / 7.5) * Math.PI * 2 + valueNoise(x / 50, y / 50, seed + 43) * 0.6) * 0.035 + tooth * 0.02 + mottle * 0.02;
            r += flute;
            g1 += flute;
            b += flute;
            break;
          }
          case 'graph': {
            const grid = x % 18 === 0 || y % 18 === 0 ? (x % 90 === 0 || y % 90 === 0 ? 0.55 : 0.32) : 0;
            r = mix(r, 0.55, grid) + tooth * 0.012;
            g1 = mix(g1, 0.72, grid) + tooth * 0.012;
            b = mix(b, 0.9, grid) + tooth * 0.012;
            break;
          }
          case 'page': {
            // Two columns of grey type, words of random length, a running head and a page number.
            const marginX = 52;
            const column = x < size / 2 - 12 ? 0 : x > size / 2 + 12 ? 1 : -1;
            const row = Math.floor((y - 60) / 15);
            const inRow = (y - 60) % 15;
            let type = 0;
            if (column >= 0 && x > marginX && x < size - marginX && row >= 0 && row < 40 && inRow >= 4 && inRow <= 10) {
              const cell = Math.floor(x / 4);
              const wordSeed = hash2(cell >> 1, row * 2 + column, seed + 44);
              const gap = hash2(cell, row, seed + 45) < 0.14 || (inRow === 10 && hash2(cell >> 2, row, seed + 46) < 0.5);
              const lineEnd = hash2(row, column, seed + 47) * 0.35;
              const u = column === 0 ? (x - marginX) / (size / 2 - 12 - marginX) : (x - size / 2 - 12) / (size - marginX - size / 2 - 12);
              if (!gap && u < 1 - lineEnd * (row % 7 === 6 ? 1 : 0.05)) type = 0.42 + wordSeed * 0.25 + (inRow === 4 || inRow === 10 ? -0.2 : 0);
            }
            if (y > 28 && y < 36 && x > marginX && x < marginX + 120 && hash2(x >> 2, 1, seed + 48) < 0.8) type = 0.4;
            const yellow = mottle * 0.04 + tooth * 0.02;
            r = mix(r, 0.22, type * 0.78) + yellow;
            g1 = mix(g1, 0.2, type * 0.78) + yellow;
            b = mix(b, 0.18, type * 0.78) + yellow * 0.6;
            break;
          }
          case 'black': {
            const t = tooth * 0.018 + mottle * 0.01;
            r += t;
            g1 += t;
            b += t;
            break;
          }
          default: {
            const t = tooth * 0.022 + mottle * 0.015;
            r += t;
            g1 += t;
            b += t;
          }
        }

        // The topmost piece here.
        let top = -1;
        let eTop = 0;
        let sx = x;
        let sy = y;
        for (let k = pieces.length - 1; k >= 0; k--) {
          const e = edgeAt(pieces[k], x, y);
          if (e > 0) {
            top = k;
            eTop = e;
            sx = SX;
            sy = SY;
            break;
          }
        }

        if (top < 0) {
          // Bare ground: the scene's cast shadows pencilled onto the sheet.
          if (!stageMedium && id[p] === 1) {
            const dark = clamp01((shadowLine - lit[p]) / 0.22);
            if (dark > 0.02) {
              const along = (x + y + valueNoise(x / 30, y / 30, seed + 50) * 3) % 5;
              const line = along < dark * 3.2 ? 1 : 0;
              const amount = clamp01(line * 0.55 + dark * 0.25) * (darkSheet ? 0.5 : 0.8);
              const pencil = darkSheet ? 0.55 : 0.3;
              r = mix(r, pencil, amount);
              g1 = mix(g1, pencil, amount);
              b = mix(b, pencil + 0.02, amount);
            }
          }
        } else {
          const pc = pieces[top];
          const qx = sx < 0 ? 0 : sx > size - 1 ? size - 1 : Math.round(sx);
          const qy = sy < 0 ? 0 : sy > size - 1 ? size - 1 : Math.round(sy);
          const q = qy * size + qx;
          const own = id[q] === pc.id;
          let cr = color[q * 4] / 255;
          let cg = color[q * 4 + 1] / 255;
          let cb = color[q * 4 + 2] / 255;
          let L = lit[q];
          let lm = lum[q];
          if (pc.strip && !own) {
            // Beyond the real floor the band is just more of the same paper.
            const base = capture.baseColors[1] ?? [200, 200, 200];
            cr = base[0] / 255;
            cg = base[1] / 255;
            cb = base[2] / 255;
            L = groundMedian;
            lm = luma(cr, cg, cb);
          }
          const line = own ? lineAt(q) : 0;
          const inside = own || pc.strip;
          switch (pc.medium) {
            case 'photo': {
              let pr = (cr - 0.5) * 1.12 + 0.52;
              let pg = (cg - 0.5) * 1.12 + 0.52;
              let pb = (cb - 0.5) * 1.12 + 0.52;
              const y0 = luma(pr, pg, pb);
              if (pc.accent) {
                pr = mix(0.96, 0.72, 1 - y0);
                pg = mix(0.95, 0.1, 1 - y0);
                pb = mix(0.92, 0.12, 1 - y0);
              } else
                switch (palette) {
                  case 'riso':
                    pr = mix(0.96, 0.02, 1 - y0);
                    pg = mix(0.96, 0.3, 1 - y0);
                    pb = mix(1, 0.6, 1 - y0);
                    break;
                  case 'vintage': {
                    const s = 0.55;
                    pr = mix(y0, pr, s) * 0.85 + 0.12;
                    pg = mix(y0, pg, s) * 0.8 + 0.09;
                    pb = mix(y0, pb, s) * 0.7 + 0.06;
                    break;
                  }
                  case 'neon': {
                    const s = 1.7;
                    pr = clamp01((y0 + (pr - y0) * s - 0.5) * 1.3 + 0.5);
                    pg = clamp01((y0 + (pg - y0) * s - 0.5) * 1.3 + 0.5);
                    pb = clamp01((y0 + (pb - y0) * s - 0.5) * 1.3 + 0.5);
                    break;
                  }
                  case 'mono':
                    pr = pg = pb = clamp01((y0 - 0.5) * 1.15 + 0.5);
                    break;
                  default: {
                    const s = (palette === 'primary' ? 1.25 : 1) * cheerSat;
                    pr = y0 + (pr - y0) * s;
                    pg = y0 + (pg - y0) * s;
                    pb = y0 + (pb - y0) * s;
                  }
                }
              // Gloss: a soft diagonal sheen across the print, and fine grain.
              const sheen = clamp01(1 - Math.abs((sx + sy) / (2 * size) - mix(0.25, 0.75, pc.sheen)) * 4) * 0.07;
              const grain = (hash2(qx, qy, pc.seed) - 0.5) * 0.03;
              r = clamp01(pr + sheen + grain);
              g1 = clamp01(pg + sheen + grain);
              b = clamp01(pb + sheen + grain);
              break;
            }
            case 'halftone': {
              const sat = palette === 'true' ? 1.3 * cheerSat : 1.1;
              const y0 = luma(cr, cg, cb);
              separate(pc.inks, clamp01(y0 + (cr - y0) * sat), clamp01(y0 + (cg - y0) * sat), clamp01(y0 + (cb - y0) * sat), lm);
              r = newsprint[0];
              g1 = newsprint[1];
              b = newsprint[2];
              for (let i = 0; i < pc.inks.length; i++) {
                const ink = pc.inks[i];
                const cover = screen(sx, sy, ink.cos, ink.sin, pc.period, covers[i], gain) * 0.96;
                r *= 1 - cover * (1 - ink.colour[0]);
                g1 *= 1 - cover * (1 - ink.colour[1]);
                b *= 1 - cover * (1 - ink.colour[2]);
              }
              const t = tooth * 0.02;
              r += t;
              g1 += t;
              b += t;
              break;
            }
            case 'ink': {
              r = inkPaper[0];
              g1 = inkPaper[1];
              b = inkPaper[2];
              if (inside) {
                const level = L > 0.78 ? 2 : L > 0.42 ? 1 : 0;
                if (palette === 'true' && !pc.accent) {
                  // Posterised to a few flat colours, then shaded with a darker and a lighter ink.
                  const y0 = luma(smooth[0][q], smooth[1][q], smooth[2][q]);
                  const s = 1.35 * cheerSat;
                  let fr = Math.round(clamp01(y0 + (smooth[0][q] - y0) * s) * 3) / 3;
                  let fg = Math.round(clamp01(y0 + (smooth[1][q] - y0) * s) * 3) / 3;
                  let fb = Math.round(clamp01(y0 + (smooth[2][q] - y0) * s) * 3) / 3;
                  if (level === 0) (fr *= 0.55), (fg *= 0.55), (fb *= 0.6);
                  else if (level === 2) (fr = mix(fr, 1, 0.22)), (fg = mix(fg, 1, 0.22)), (fb = mix(fb, 1, 0.22));
                  r *= mix(fr, 1, 0.04);
                  g1 *= mix(fg, 1, 0.04);
                  b *= mix(fb, 1, 0.04);
                } else {
                  separate(pc.inks, smooth[0][q], smooth[1][q], smooth[2][q], lm);
                  for (let i = 0; i < pc.inks.length; i++) {
                    const ink = pc.inks[i];
                    let cover = ink.dark > 0.5 ? (covers[i] > 0.55 ? 1 : covers[i] > 0.28 ? 0.5 : 0) : Math.round(covers[i] * 3) / 3;
                    if (ink.dark > 0.5 && level === 0) cover = Math.max(cover, 0.5);
                    r *= 1 - cover * (1 - ink.colour[0]);
                    g1 *= 1 - cover * (1 - ink.colour[1]);
                    b *= 1 - cover * (1 - ink.colour[2]);
                  }
                }
                if (line > 0.4) {
                  const k = clamp01((line - 0.4) * 1.8);
                  const black = pc.accent ? sanguine : ([0.08, 0.07, 0.08] as RGB);
                  r = mix(r, black[0], k);
                  g1 = mix(g1, black[1], k);
                  b = mix(b, black[2], k);
                }
              }
              break;
            }
            case 'pencil': {
              r = pencilPaper[0] + tooth * 0.02;
              g1 = pencilPaper[1] + tooth * 0.02;
              b = pencilPaper[2] + tooth * 0.02;
              if (inside) {
                const tone = Math.pow(clamp01((1 - lm) * 0.45 + (1 - L) * 0.6), 1.15);
                const wobble = valueNoise(sx / 25, sy / 25, pc.seed + 3) * 1.4;
                const u = (((sx + sy + wobble) % 4.6) + 4.6) % 4.6;
                let mark = u < tone * 4.2 ? 0.7 : 0;
                if (tone > 0.5) {
                  const v = (((sx - sy + wobble) % 4.6) + 4.6) % 4.6;
                  if (v < (tone - 0.5) * 6) mark = Math.max(mark, 0.7);
                }
                if (tone > 0.78) {
                  const w = ((sy % 3.4) + 3.4) % 3.4;
                  if (w < (tone - 0.78) * 9) mark = Math.max(mark, 0.75);
                }
                const smudge = tone * 0.28;
                const grainy = 0.85 + (hash2(qx, qy, pc.seed + 4) - 0.5) * 0.5;
                const amount = clamp01(Math.max(mark * grainy, smudge, line * 0.95 * (0.8 + hash2(qx + 7, qy, pc.seed + 5) * 0.4))) * 0.88;
                const lead = pc.accent ? sanguine : graphite;
                r = mix(r, lead[0], amount);
                g1 = mix(g1, lead[1], amount);
                b = mix(b, lead[2], amount);
              }
              break;
            }
            case 'blueprint': {
              const dark = bluePaper[0] < 0.5;
              const paperMottle = valueNoise(sx / 40, sy / 40, pc.seed + 6) * (dark ? 0.035 : 0.02);
              r = bluePaper[0] + paperMottle;
              g1 = bluePaper[1] + paperMottle;
              b = bluePaper[2] + paperMottle;
              const gx = ((sx % 16) + 16) % 16;
              const gy = ((sy % 16) + 16) % 16;
              if (gx < 1 || gy < 1) {
                const k = dark ? 0.12 : 0.1;
                r = mix(r, blueLine[0], k);
                g1 = mix(g1, blueLine[1], k);
                b = mix(b, blueLine[2], k);
              }
              if (inside) {
                let k = line > 0.3 ? clamp01((line - 0.3) * 1.6) * 0.9 : 0;
                if (L < 0.5) {
                  const u = (((sx - sy) % 6) + 6) % 6;
                  if (u < 1.1) k = Math.max(k, clamp01((0.5 - L) * 2.2) * 0.75);
                }
                if (k > 0) {
                  const colour = pc.accent ? sanguine : blueLine;
                  // Lines bleed a little on a real blueprint.
                  const bleed = dark ? 0.9 : 1;
                  r = mix(r, colour[0], k * bleed);
                  g1 = mix(g1, colour[1], k * bleed);
                  b = mix(b, colour[2], k * bleed);
                }
              }
              break;
            }
            default: {
              // Torn paper: one flat sheet, and a darker scrap glued where the shadow falls.
              const shadowed = inside && L < 0.5 + valueNoise(sx / 11, sy / 11, pc.seed + 7) * 0.08;
              const colour = shadowed ? pc.stockDark : pc.stock;
              const fibre = valueNoise(sx / 3, sy / 28, pc.seed + 8) * 0.025 + tooth * 0.02;
              r = colour[0] + fibre;
              g1 = colour[1] + fibre;
              b = colour[2] + fibre;
            }
          }

          // A photograph clipped as a rectangle keeps the white border of the print.
          if (pc.rect && pc.medium === 'photo' && eTop < 7) {
            const k = clamp01((7 - eTop) * 0.8);
            r = mix(r, 0.96, k);
            g1 = mix(g1, 0.95, k);
            b = mix(b, 0.92, k);
          }
          // The cut: white paper core along the edge, fibrous when torn.
          const rimWidth = pc.rim * (pc.cut === 'torn' ? 0.6 + (valueNoise(sx / 5, sy / 5, pc.seed + 9) * 0.5 + 0.5) * 1.3 : 1);
          if (eTop < rimWidth) {
            const amount = clamp01((rimWidth - eTop) / Math.max(1, rimWidth * 0.8)) * (pc.cut === 'torn' ? 0.9 : 0.75);
            const coreColour = pc.medium === 'halftone' ? newsprint : core;
            r = mix(r, coreColour[0], amount);
            g1 = mix(g1, coreColour[1], amount);
            b = mix(b, coreColour[2], amount);
          }
          // The thickness of the paper: a bright lip toward the light, a dark one away from it.
          if (eTop < 1.6) {
            if (edgeAt(pc, x - stepX, y - stepY) <= 0) {
              r += 0.07;
              g1 += 0.07;
              b += 0.07;
            } else if (edgeAt(pc, x + stepX, y + stepY) <= 0) {
              r *= 0.86;
              g1 *= 0.86;
              b *= 0.86;
            }
          }
          // Doubtful pieces are the ones the artist was not sure about: a little lighter, never finished.
          if (pc.doubtful) {
            r = mix(r, 0.95, 0.12);
            g1 = mix(g1, 0.95, 0.12);
            b = mix(b, 0.93, 0.12);
          }
        }

        // Drop shadows from every piece pasted above this one.
        let shade = 0;
        for (let k = top + 1; k < pieces.length; k++) {
          const pc = pieces[k];
          const e = edgeAt(pc, x - pc.shx, y - pc.shy);
          if (e < -pc.soft) continue;
          const s = clamp01((e + pc.soft) / (2 * pc.soft));
          shade = 1 - (1 - shade) * (1 - s * 0.8);
        }
        if (shade > 0) {
          shade = Math.min(0.84, shade) * (darkSheet && top < 0 ? 0.7 : 1);
          r *= 1 - shade * (1 - shadowTint[0]);
          g1 *= 1 - shade * (1 - shadowTint[1]);
          b *= 1 - shade * (1 - shadowTint[2]);
        }

        // Fixings and marks.
        const alpha = over[p * 4 + 3] / 255;
        if (alpha > 0) {
          r = mix(r, over[p * 4] / 255, alpha);
          g1 = mix(g1, over[p * 4 + 1] / 255, alpha);
          b = mix(b, over[p * 4 + 2] / 255, alpha);
        }

        // Age: folds and tea-coloured stains over the whole thing.
        for (const crease of creases) {
          const d = x * crease.nx + y * crease.ny - crease.offset;
          if (d > -3 && d < 3) {
            const fold = (d < 0 ? 0.08 : -0.1) * (1 - Math.abs(d) / 3) * (0.6 + mood.wear * 0.5);
            r += fold;
            g1 += fold;
            b += fold;
          }
        }
        if (mood.wear > 0.4) {
          const stain = clamp01(valueNoise(x / 120, y / 120, seed + 60) * 1.4 + valueNoise(x / 27, y / 27, seed + 61) * 0.5 - 0.6) * (mood.wear - 0.4) * 0.8;
          r *= 1 - stain * 0.28;
          g1 *= 1 - stain * 0.4;
          b *= 1 - stain * 0.6;
        }
        // Photographed under a lamp: a soft fall-off toward the corners.
        const vx = x / size - 0.5;
        const vy = y / size - 0.5;
        const vignette = 1 - (vx * vx + vy * vy) * 0.14;
        const grain = (hash2(x, y, seed + 62) - 0.5) * 0.02;
        pixels[p * 4] = (r * vignette + grain) * 255;
        pixels[p * 4 + 1] = (g1 * vignette + grain) * 255;
        pixels[p * 4 + 2] = (b * vignette + grain) * 255;
        pixels[p * 4 + 3] = 255;
      }
    }

    const heroPiece = things.find((pc) => pc.hero);
    const others = things.filter((pc) => !pc.hero);
    const doubtfulCount = things.filter((pc) => pc.doubtful).length;
    const described = (list: Piece[]) => [...new Set(list.map((pc) => MEDIUM_NAMES[pc.medium]))].join(', ');
    return {
      pixels,
      notes: [
        heroPiece ? `subject cut from ${MEDIUM_NAMES[heroPiece.medium]}${others.length ? `, ${others.length} other piece${others.length > 1 ? 's' : ''} from ${described(others)}` : ''}` : 'an empty sheet',
        `${stageMedium ? `floor as a ${MEDIUM_NAMES[stageMedium]} strip` : 'pasted straight on the sheet'} of ${a.sheet} paper, ${a.cut} cut, ${a.fixing === 'unfixed' ? 'unfixed' : a.fixing}`,
        `${a.inks === 'true' ? 'true colours' : `${a.inks} inks`}, ${markNote}${doubtfulCount ? `, ${doubtfulCount} doubtful piece${doubtfulCount > 1 ? 's' : ''} left in pencil` : ''}`,
      ],
    };
  },
});
