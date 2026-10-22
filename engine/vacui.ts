import type { Capture, QuestionSet } from '../kit/contract';
import { choice, noul, score } from '../kit/questions';
import { hashText, seeded } from '../kit/random';
import { distanceTransform } from '../kit/sdf';
import { morph } from './accent';
import { printInks } from './otherworld';

/**
 * Horror vacui: the print's dead space grows micro-macro detail, so nothing is left bare. Rows of
 * cells follow the iso-distance lines round the subjects (like mosaic andamento), so the fill seems
 * to grow out of the subject instead of sitting behind it. Three layers of structure, after
 * cellular graphite drawings: warped noise for the landforms (soft light and dark regions), Voronoi
 * cells for the micro texture, and comb-like tubules where light meets dark. The shading belongs to
 * the regions; the cell walls stay crisp on top. Colours come from the print itself.
 */
export const VACUI_FILLS = {
  tissue: 'Living tissue: rows of cells grow out from every outline like plant tissue under a microscope, with comb-like tubules where light meets dark.',
  terrain: 'Terrain from above: the cells swell into broad landforms and winding riverbeds, a map of a world that is also a cell.',
  lace: 'Lace and coral: a fine porous mesh of tiny cells, densest where it meets the subject, lightly shaded.',
  glyphs: 'Doodled machinery: every cell holds a tiny drawn thing, circuit blocks, rings, ladders, hatching and glyphs, packed like a notebook from another world.',
} as const;
export type VacuiFill = keyof typeof VACUI_FILLS;

export const VACUI_GRAINS = {
  hug: 'Finest against the subject, opening into large cells out in the open, so up close it is cells and from afar it is terrain.',
  halo: 'Large cells against the subject, growing finer out in the open: a halo of detail.',
  even: 'One even grain throughout; only the shading changes.',
} as const;
export type VacuiGrain = keyof typeof VACUI_GRAINS;

/** What the growth adds up to from afar: micro up close, macro across the room. */
export const VACUI_FORMS = {
  land: 'Landforms: soft regions of light and dark like terrain seen from the air.',
  skull: 'A vast hidden skull: from across the room the shading becomes eye sockets, a nose and a row of teeth around the subject.',
  eye: 'One vast eye: from across the room the shading becomes a single watching eye, iris and pupil.',
} as const;
export type VacuiForm = keyof typeof VACUI_FORMS;

export const VACUI_INKS = {
  print: 'The print\u2019s own colours, so the growth belongs to the medium.',
  graphite: 'Graphite on pale paper: soft pencil shading with crisp white walls, like a patient drawing.',
  blacklight: 'Fluorescent lines glowing under ultraviolet light: hot pink and violet on deep indigo, like a drawing under a blacklight.',
} as const;
export type VacuiInk = keyof typeof VACUI_INKS;

export const VACUI_QUESTIONS = {
  vacui: choice('How does the empty space fill with micro-macro detail, so that nothing in the picture is left bare?', VACUI_FILLS),
  vacuiGrain: choice('How does the size of those cells change with distance from the subject?', VACUI_GRAINS),
  vacuiReach: score('How much of the quiet space does the growth claim?', [
    'Only the emptiest stretches', 'The open background', 'Most of the quiet space', 'Every gap, wall to wall',
  ]),
  vacuiForm: choice('Seen from across the room, what larger form does all that small detail make?', VACUI_FORMS),
  vacuiInk: choice('In which inks is the growth drawn?', VACUI_INKS),
  vacuiDrip: noul('Do the dark forms in the growth drip and run downward, like wet paint?'),
} satisfies QuestionSet;

export const VACUI_NAMES: readonly string[] = Object.keys(VACUI_QUESTIONS);

export interface Vacui {
  fill: VacuiFill;
  grain: VacuiGrain;
  /** The settled score, 0–1. */
  reach: number;
  /** Absent in plans made before forms, inks and drips existed: landforms in the print's colours, dry. */
  form?: VacuiForm;
  ink?: VacuiInk;
  drip?: boolean;
}

const oneOf = <T extends string>(options: Readonly<Record<T, string>>, value: unknown, fallback: T): T =>
  typeof value === 'string' && Object.hasOwn(options, value) ? value as T : fallback;

export function vacuiOf(answers: Record<string, string | number | boolean>): Vacui {
  return {
    fill: oneOf(VACUI_FILLS, answers.vacui, 'tissue'),
    grain: oneOf(VACUI_GRAINS, answers.vacuiGrain, 'hug'),
    reach: Math.min(1, Math.max(0, Number(answers.vacuiReach))) || 0,
    form: oneOf(VACUI_FORMS, answers.vacuiForm, 'land'),
    ink: oneOf(VACUI_INKS, answers.vacuiInk, 'print'),
    drip: answers.vacuiDrip === true,
  };
}

interface Character {
  /** Cell size against the subject and its limit, in pixels; growth per pixel of distance. */
  base: number;
  most: number;
  growth: number;
  /** How far the iso-lines meander, in pixels, and the size of the landforms. */
  warp: number;
  landform: number;
  /** How strongly the landforms are shaded, 0–1. */
  contrast: number;
  /** Cell spacing along a row where light meets dark, as a share of the row's width: comb-like tubules. */
  tubule: number;
  wall: number;
}
const CHARACTER: Record<VacuiFill, Character> = {
  tissue: { base: 6, most: 30, growth: 0.1, warp: 34, landform: 170, contrast: 0.8, tubule: 0.33, wall: 0.55 },
  terrain: { base: 8, most: 46, growth: 0.14, warp: 70, landform: 260, contrast: 1, tubule: 0.45, wall: 0.65 },
  lace: { base: 4, most: 15, growth: 0.05, warp: 18, landform: 150, contrast: 0.4, tubule: 0.6, wall: 0.42 },
  glyphs: { base: 15, most: 42, growth: 0.07, warp: 26, landform: 200, contrast: 0.85, tubule: 0.5, wall: 0.5 },
};

/** A repeatable 0–1 number for a pair of integers. */
function hashPair(a: number, b: number) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

const ellipse = (u: number, v: number, cx: number, cy: number, rx: number, ry: number) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
const inside = (e: number, edge = 0.15) => 1 - smoothstep(1 - edge, 1 + edge, e);

/**
 * The macro form at a point, in face units (about −1 to 1 across the frame, v down): how dark it
 * wants the shading, and how strongly it overrides the landforms there.
 */
function formAt(form: VacuiForm, u: number, v: number): { dark: number; weight: number } {
  if (form === 'skull') {
    const head = ellipse(u, v, 0, -0.05, 0.92, 1.02);
    const cranium = inside(head, 0.06), rim = 1 - smoothstep(0, 0.06, Math.abs(Math.sqrt(head) - 1));
    const sockets = Math.max(inside(ellipse(u, v, -0.38, -0.12, 0.27, 0.24)), inside(ellipse(u, v, 0.38, -0.12, 0.27, 0.24)));
    const nose = Math.max(inside(ellipse(u, v, -0.06, 0.28, 0.07, 0.12)), inside(ellipse(u, v, 0.06, 0.28, 0.07, 0.12)));
    let dark = 0.3, weight = cranium * 0.7;
    dark += (0.7 - dark) * rim; weight = Math.max(weight, rim * 0.9);
    dark += (1 - dark) * Math.max(sockets, nose); weight = Math.max(weight, Math.max(sockets, nose) * 0.97);
    if (Math.abs(u) < 0.5 && v > 0.5 && v < 0.88) {
      const local = ((u + 0.5) / 0.125) % 1, across = (local - 0.5) / 0.36;
      const tooth = Math.abs(across) < 1 && v > 0.55 && v < 0.83 - 0.07 * across * across;
      dark = tooth ? 0.04 : 0.95;
      weight = 0.95;
    }
    return { dark, weight };
  }
  if (form === 'eye') {
    const lid = 0.5 * Math.max(0, 1 - u * u);
    if (Math.abs(u) >= 1 || Math.abs(v) > lid + 0.06) return { dark: 0.5, weight: 0 };
    const edge = 1 - smoothstep(0, 0.05, Math.abs(Math.abs(v) - lid));
    const radius = Math.hypot(u, v);
    let dark = 0.08;
    if (radius < 0.34) dark = 0.45 + 0.3 * Math.sin(Math.atan2(v, u) * 22) * smoothstep(0.12, 0.3, radius);
    if (radius < 0.13) dark = 1;
    if (Math.hypot(u + 0.07, v + 0.08) < 0.045) dark = 0;
    dark += (0.95 - dark) * edge;
    return { dark, weight: 0.95 };
  }
  return { dark: 0.5, weight: 0 };
}

/** Distance in pixels to the nearest stroke of a cell's doodle, in the cell's own turned frame. */
function doodle(cell: number, a: number, b: number, r: number): number {
  const kind = Math.floor(hashPair(cell, 7) * 8);
  switch (kind) {
    case 0: { const d = Math.hypot(a, b); return Math.min(Math.abs(d - 0.5 * r), Math.max(0, d - 0.12 * r)); }
    case 1: return Math.min(Math.abs(Math.max(Math.abs(a), Math.abs(b)) - 0.45 * r), Math.abs(b) < 0.45 * r && Math.abs(a) < 0.45 * r ? Math.abs(a - 0.15 * r) : Infinity);
    case 2: {
      if (Math.abs(b) > 0.6 * r) return Infinity;
      const rail = Math.abs(Math.abs(a) - 0.2 * r), step = 0.24 * r;
      const rung = Math.abs(a) < 0.2 * r ? Math.abs(b - Math.round(b / step) * step) : Infinity;
      return Math.min(rail, rung);
    }
    case 3: { if (Math.max(Math.abs(a), Math.abs(b)) > 0.5 * r) return Infinity; const step = 0.2 * r; return Math.abs(a - Math.round(a / step) * step); }
    case 4: case 5: {
      // A glyph: three pen strokes between points the cell chose.
      let best = Infinity;
      const point = (k: number): [number, number] => [(hashPair(cell, 10 + k * 2) - 0.5) * r * 1.1, (hashPair(cell, 11 + k * 2) - 0.5) * r * 1.1];
      for (let k = 0; k < 3; k++) {
        const [x0, y0] = point(k), [x1, y1] = point(k + 1);
        const dx = x1 - x0, dy = y1 - y0, t = clamp01(((a - x0) * dx + (b - y0) * dy) / (dx * dx + dy * dy || 1));
        best = Math.min(best, Math.hypot(a - x0 - dx * t, b - y0 - dy * t));
      }
      return best;
    }
    case 6: { const step = 0.32 * r; if (Math.max(Math.abs(a), Math.abs(b)) > 0.5 * r) return Infinity; return Math.max(0, Math.hypot(a - Math.round(a / step) * step, b - Math.round(b / step) * step) - 0.07 * r); }
    default: return Infinity;
  }
}

const INKS: Record<Exclude<VacuiInk, 'print'>, { base: RGB; paper: RGB; ink: RGB; line: RGB; dark: RGB }> = {
  graphite: { base: [214, 210, 202], paper: [241, 238, 230], ink: [42, 42, 46], line: [251, 250, 246], dark: [52, 52, 56] },
  blacklight: { base: [58, 30, 168], paper: [123, 77, 255], ink: [12, 5, 50], line: [255, 157, 230], dark: [255, 120, 214] },
};

type RGB = readonly [number, number, number];
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function valueNoise(seed: number) {
  const corner = (x: number, y: number) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = corner(ix, iy) + (corner(ix + 1, iy) - corner(ix, iy)) * sx;
    const bottom = corner(ix, iy + 1) + (corner(ix + 1, iy + 1) - corner(ix, iy + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}

/** Local mean and spread of brightness in a square window: the spread is low where the print is flat and empty. */
function flatness(pixels: Uint8ClampedArray, size: number, radius: number) {
  const stride = size + 1, sum = new Float64Array(stride * stride), squares = new Float64Array(stride * stride);
  for (let y = 0; y < size; y++) {
    let row = 0, rowSquares = 0;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4, value = luma(pixels[i], pixels[i + 1], pixels[i + 2]);
      row += value; rowSquares += value * value;
      sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + row;
      squares[(y + 1) * stride + x + 1] = squares[y * stride + x + 1] + rowSquares;
    }
  }
  const spread = new Float32Array(size * size), local = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const x0 = Math.max(0, x - radius), y0 = Math.max(0, y - radius), x1 = Math.min(size, x + radius + 1), y1 = Math.min(size, y + radius + 1);
    const area = (x1 - x0) * (y1 - y0);
    const box = (table: Float64Array) => table[y1 * stride + x1] - table[y0 * stride + x1] - table[y1 * stride + x0] + table[y0 * stride + x0];
    const mean = box(sum) / area;
    spread[y * size + x] = Math.sqrt(Math.max(0, box(squares) / area - mean * mean));
    local[y * size + x] = mean;
  }
  return { spread, local };
}

/** Nearest seed for every pixel by jump flooding, then one more step-1 pass for accuracy. */
function nearestSeeds(size: number, xs: Float32Array, ys: Float32Array, count: number) {
  let label = new Int32Array(size * size).fill(-1), next = new Int32Array(size * size);
  for (let s = 0; s < count; s++) {
    const index = Math.min(size - 1, Math.round(ys[s])) * size + Math.min(size - 1, Math.round(xs[s]));
    label[index] = s;
  }
  const steps: number[] = [];
  for (let step = 1 << Math.ceil(Math.log2(size)) - 1; step >= 1; step >>= 1) steps.push(step);
  steps.push(1);
  for (const step of steps) {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let best = label[y * size + x], bestDistance = best >= 0 ? (xs[best] - x) ** 2 + (ys[best] - y) ** 2 : Infinity;
      for (let dy = -step; dy <= step; dy += step) {
        const ny = y + dy;
        if (ny < 0 || ny >= size) continue;
        for (let dx = -step; dx <= step; dx += step) {
          const nx = x + dx;
          if (nx < 0 || nx >= size || (!dx && !dy)) continue;
          const candidate = label[ny * size + nx];
          if (candidate < 0 || candidate === best) continue;
          const distance = (xs[candidate] - x) ** 2 + (ys[candidate] - y) ** 2;
          if (distance < bestDistance) { best = candidate; bestDistance = distance; }
        }
      }
      next[y * size + x] = best;
    }
    [label, next] = [next, label];
  }
  return label;
}

/**
 * Fill the print's dead space. Repeatable for a seed. `phase` (0–1) slides the landforms round a
 * closed path, so the frames of a loop make the tissue drift and come back to where it began.
 */
export function applyVacui(pixels: Uint8ClampedArray, capture: Capture, vacui: Vacui, seed: number, phase = 0): { pixels: Uint8ClampedArray; note: string } {
  const size = capture.size, count = size * size;
  const out = new Uint8ClampedArray(pixels);
  const id = (index: number) => capture.identity[index * 4];
  const character = CHARACTER[vacui.fill];
  const reach = vacui.reach;

  // 1. Dead space: the setting's flat, quiet stretches, cleaned of specks and slivers. The empty
  // backdrop goes first; the ground and the set's walls only as the reach grows, and flatter still.
  const { spread, local } = flatness(pixels, size, 6);
  const backdrop = 5 + 20 * reach, built = reach < 0.25 ? -1 : 1.5 + 12 * reach;
  let dead = new Uint8Array(count);
  for (let i = 0; i < count; i++) dead[i] = spread[i] < (id(i) === 0 ? backdrop : id(i) < 3 ? built : -1) ? 1 : 0;
  dead = morph(morph(dead, size, -3), size, 3);
  // Rows grow out from everything that is not dead space; in a frame that is all dead space, from its edges.
  const empty = dead.every(Boolean);
  const edge = (index: number) => { const x = index % size, y = (index / size) | 0; return x === 0 || y === 0 || x === size - 1 || y === size - 1; };
  const { distance } = distanceTransform(empty ? edge : (index) => !dead[index], size, size);
  const gap = 6 - 4 * reach;
  let claimed = 0;
  for (let i = 0; i < count; i++) if (distance[i] > gap) claimed++;
  if (claimed < count * 0.01) return { pixels: out, note: 'Dead space: the picture has none to fill' };

  const fieldSeed = (seed ^ hashText(`vacui:${vacui.fill}`)) >>> 0;
  const meander = valueNoise(fieldSeed ^ 0x2f1), land = valueNoise(fieldSeed ^ 0x77a), land2 = valueNoise(fieldSeed ^ 0x1b3), tooth = valueNoise(fieldSeed ^ 0x5c9);
  // A closed path through the noise, so a loop's last frame meets its first.
  const ox = Math.cos(phase * Math.PI * 2) * 0.35, oy = Math.sin(phase * Math.PI * 2) * 0.35;

  // 2. Landforms: warped noise for soft regions of light and dark, which a macro form (a skull, an eye)
  // can take over from afar; drips running down from the dark; and the meandering distance.
  const form = vacui.form ?? 'land';
  const macro = new Float32Array(count);
  // The form is anchored on the hero: it sits in the eye's pupil, or on the skull's nose.
  let heroX = 0, heroY = 0, heroArea = 0;
  for (let i = 0; i < count; i++) if (id(i) === 3) { heroX += i % size; heroY += (i / size) | 0; heroArea++; }
  const faceScale = size * 0.46, anchor = form === 'skull' ? 0.28 : 0;
  const centre = (value: number) => Math.min(size * 0.62, Math.max(size * 0.38, value));
  const faceX = heroArea ? centre(heroX / heroArea) : size * 0.5;
  const faceY = heroArea ? centre(heroY / heroArea - anchor * faceScale) : size * 0.48;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const s = character.landform;
    const wx = x / s + (land2(x / (s * 0.7) + 3.1, y / (s * 0.7)) - 0.5) * 1.6 + ox;
    const wy = y / s + (land2(x / (s * 0.7), y / (s * 0.7) + 7.7) - 0.5) * 1.6 + oy;
    let m = land(wx, wy) * 0.65 + land(wx * 2.1 + 5, wy * 2.1) * 0.35;
    if (form !== 'land') {
      const shape = formAt(form, (x - faceX) / faceScale, (y - faceY) / faceScale);
      m += (shape.dark - m) * shape.weight;
    }
    macro[i] = m;
  }
  if (vacui.drip) {
    // Columns of drips hang from the bottoms of solid dark forms, tapering to a bead.
    const dry = new Float32Array(macro), group = 7, solid = form === 'land' ? 0.7 : 0.88;
    for (let x = 0; x < size; x++) {
      const column = Math.floor(x / group);
      if (hashPair(fieldSeed ^ 0xd21, column) > 0.55) continue;
      const fall = 18 + hashPair(fieldSeed ^ 0xd22, column) * (60 + 140 * reach), half = 1.2 + hashPair(fieldSeed ^ 0xd23, column) * 2.2;
      const off = Math.abs(x + 0.5 - (column + 0.5) * group);
      let since = Infinity, run = 0;
      for (let y = 0; y < size; y++) {
        const i = y * size + x;
        // Only a dark run of some height feeds a drip, so outlines and thin seams stay dry.
        if (dry[i] > solid) { run++; if (run >= 8) since = 0; continue; }
        run = 0;
        since++;
        if (since >= fall) continue;
        const taper = 1 - since / fall, bead = since > fall - 6 ? 1.35 : 1;
        if (off < half * (0.35 + 0.65 * taper) * bead) macro[i] = Math.max(macro[i], 0.9);
      }
    }
  }
  const tone = new Float32Array(count), seam = new Float32Array(count), along = new Float32Array(count);
  const width = (d: number) => vacui.grain === 'hug' ? Math.min(character.most, character.base + character.growth * d)
    : vacui.grain === 'halo' ? Math.max(character.base, character.most - character.growth * d)
      : (character.base + character.most) * 0.4;
  const soft = 0.2 / Math.max(0.2, character.contrast);
  // A macro form needs its darks and lights, whatever the fill's usual contrast.
  const contrast = form === 'land' ? character.contrast : Math.max(0.9, character.contrast);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    if (distance[i] <= gap) continue;
    const m = macro[i];
    tone[i] = smoothstep(0.5 - soft, 0.5 + soft, m) * contrast;
    seam[i] = 1 - smoothstep(0, 0.07, Math.abs(m - 0.5));
    along[i] = distance[i] + (meander(x / 90, y / 90) - 0.5) * character.warp * 2;
  }

  // 3. Rows: band boundaries outward from the subjects, each row as wide as the grain says there.
  const bounds = [0];
  while (bounds.at(-1)! < size * 2) bounds.push(bounds.at(-1)! + width(bounds.at(-1)!));
  const bandOf = (d: number) => {
    let low = 0, high = bounds.length - 1;
    while (low < high - 1) { const mid = (low + high) >> 1; if (bounds[mid] <= d) low = mid; else high = mid; }
    return low;
  };

  // 4. Seeds along each row's centre line, spaced by the row's width, closer where light meets dark.
  const random = seeded(fieldSeed ^ 0x3d);
  const candidates: number[] = [];
  for (let i = 0; i < count; i++) {
    if (distance[i] <= gap) continue;
    const d = Math.max(0, along[i]), band = bandOf(d), centre = (bounds[band] + bounds[band + 1]) / 2;
    if (Math.abs(d - centre) < 0.55) candidates.push(i);
  }
  for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
  const bucket = 6, columns = Math.ceil(size / bucket);
  const grid = new Map<number, number[]>();
  const xs = new Float32Array(candidates.length + 1), ys = new Float32Array(candidates.length + 1), spacing = new Float32Array(candidates.length + 1);
  let seeds = 0;
  for (const i of candidates) {
    const x = i % size, y = (i / size) | 0;
    const d = Math.max(0, along[i]), band = bandOf(d), rowWidth = bounds[band + 1] - bounds[band];
    const gapAlong = rowWidth * (1 - (1 - character.tubule) * seam[i]);
    const reachBuckets = Math.ceil(gapAlong / bucket);
    const bx = Math.floor(x / bucket), by = Math.floor(y / bucket);
    let free = true;
    for (let gy = by - reachBuckets; gy <= by + reachBuckets && free; gy++) for (let gx = bx - reachBuckets; gx <= bx + reachBuckets && free; gx++) {
      for (const other of grid.get(gy * columns + gx) ?? []) if ((xs[other] - x) ** 2 + (ys[other] - y) ** 2 < gapAlong * gapAlong) { free = false; break; }
    }
    if (!free) continue;
    xs[seeds] = x + 0.5; ys[seeds] = y + 0.5; spacing[seeds] = rowWidth;
    const key = by * columns + bx;
    const members = grid.get(key);
    if (members) members.push(seeds); else grid.set(key, [seeds]);
    seeds++;
  }
  if (!seeds) return { pixels: out, note: 'Dead space: the picture has none to fill' };
  const label = nearestSeeds(size, xs, ys, seeds);

  // 5. Draw: regions shaded across whole landforms, pillowed cells, crisp walls, and any doodles.
  const own = printInks(pixels, count);
  const chosen = vacui.ink && vacui.ink !== 'print' ? INKS[vacui.ink] : null;
  const ink = chosen?.ink ?? own.ink, paper = chosen?.paper ?? own.paper;
  const light: RGB = chosen?.line ?? [paper[0] + (255 - paper[0]) * 0.35, paper[1] + (255 - paper[1]) * 0.35, paper[2] + (255 - paper[2]) * 0.35];
  // Pen marks on light ground are dark, on dark ground light; under a blacklight they always glow.
  const pen: RGB = chosen?.dark ?? [ink[0] * 0.8 + paper[0] * 0.2, ink[1] * 0.8 + paper[1] * 0.2, ink[2] * 0.8 + paper[2] * 0.2];
  const glowing = vacui.ink === 'blacklight', doodled = vacui.fill === 'glyphs';
  const halfWall = character.wall;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    if (distance[i] <= gap) continue;
    const mine = label[i];
    if (mine < 0) continue;
    const px = x + 0.5, py = y + 0.5;
    const toOwn = (xs[mine] - px) ** 2 + (ys[mine] - py) ** 2;
    // Distance to the nearest wall: the bisector with any differently labelled neighbour.
    let wallDistance = 2;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const other = label[ny * size + nx];
      if (other === mine || other < 0) continue;
      const between = Math.hypot(xs[other] - xs[mine], ys[other] - ys[mine]) || 1;
      const bisector = (((xs[other] - px) ** 2 + (ys[other] - py) ** 2) - toOwn) / (2 * between);
      if (bisector < wallDistance) wallDistance = bisector;
    }
    const wall = clamp01(halfWall + 0.5 - wallDistance);
    const rim = smoothstep(0.3, 1, Math.sqrt(toOwn) / Math.max(1.5, spacing[mine] * 0.55));
    const grain = 0.88 + 0.24 * tooth(x / 1.7, y / 1.7);
    // Dark landforms toward the ink, light ones toward the paper, the cells pillowed by their rims
    // (only lightly when each cell holds a doodle, so the doodle reads).
    const shade = clamp01((tone[i] * 0.85 + rim * (doodled ? 0.05 : 0.12 + 0.2 * tone[i])) * grain);
    const j = i * 4;
    const base: RGB = chosen ? [chosen.base[0] * 0.88 + pixels[j] * 0.12, chosen.base[1] * 0.88 + pixels[j + 1] * 0.12, chosen.base[2] * 0.88 + pixels[j + 2] * 0.12] : [pixels[j], pixels[j + 1], pixels[j + 2]];
    const lift = clamp01(0.35 - shade) * 0.6, sink = clamp01(shade - 0.2) * 0.95;
    let r = base[0] + (paper[0] - base[0]) * lift, g = base[1] + (paper[1] - base[1]) * lift, b = base[2] + (paper[2] - base[2]) * lift;
    r += (ink[0] - r) * Math.min(0.8, sink); g += (ink[1] - g) * Math.min(0.8, sink); b += (ink[2] - b) * Math.min(0.8, sink);
    // The macro form's own outline, where its shading crosses into the dark: what reads from afar.
    let line = wall;
    if (x > 0 && y > 0 && x < size - 1 && y < size - 1) {
      const slope = Math.hypot(macro[i + 1] - macro[i - 1], macro[i + size] - macro[i - size]) / 2;
      if (slope > 1e-4) line = Math.max(line, clamp01(1.4 - Math.abs(macro[i] - 0.62) / slope) * (form === 'land' ? 0.55 : 0.95));
    }
    if (doodled && shade < 0.82) {
      const turn = hashPair(mine, 99) * Math.PI, cos = Math.cos(turn), sin = Math.sin(turn);
      const ax = px - xs[mine], ay = py - ys[mine];
      const reachOf = Math.max(2.5, spacing[mine] * 0.5);
      line = Math.max(line, clamp01(0.65 + 0.02 * reachOf + 0.5 - doodle(mine, ax * cos + ay * sin, -ax * sin + ay * cos, reachOf)) * (1 - wall * 0.3));
    }
    const lit = glowing ? 1 : smoothstep(0.28, 0.5, shade);
    const stroke: RGB = [pen[0] + (light[0] - pen[0]) * lit, pen[1] + (light[1] - pen[1]) * lit, pen[2] + (light[2] - pen[2]) * lit];
    r += (stroke[0] - r) * line; g += (stroke[1] - g) * line; b += (stroke[2] - b) * line;
    if (glowing) {
      // Fluorescence bleeds a little light round every line.
      const halo = clamp01(1.6 - wallDistance) * 0.18;
      r += (light[0] - r) * halo; g += (light[1] - g) * halo; b += (light[2] - b) * halo;
    }
    // The print's own marks (anything darker than its surroundings) stay drawn over the growth.
    const mark = clamp01((local[i] - luma(pixels[j], pixels[j + 1], pixels[j + 2]) - 6) / 30) * 0.9;
    r += (pixels[j] - r) * mark; g += (pixels[j + 1] - g) * mark; b += (pixels[j + 2] - b) * mark;
    const coverage = smoothstep(gap, gap + 5, distance[i]);
    out[j] += (r - out[j]) * coverage;
    out[j + 1] += (g - out[j + 1]) * coverage;
    out[j + 2] += (b - out[j + 2]) * coverage;
  }
  const share = Math.round((claimed / count) * 100);
  const grainNote = { hug: 'finest against the subject', halo: 'a halo of fine detail far out', even: 'one even grain' }[vacui.grain];
  const formNote = { land: '', skull: ', making a vast skull from afar', eye: ', making one vast eye from afar' }[form];
  const inkNote = { print: '', graphite: ' in graphite', blacklight: ' under blacklight' }[vacui.ink ?? 'print'];
  return { pixels: out, note: `Dead space: ${vacui.fill} grows through ${share}% of the picture in ${seeds} cells${inkNote}, ${grainNote}${formNote}${vacui.drip ? ', dripping' : ''}` };
}
