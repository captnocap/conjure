import type { Capture, QuestionSet } from '../kit/contract';
import { choice, score } from '../kit/questions';
import { hashText, seeded } from '../kit/random';
import { type Palette, type PaletteRole, rekey } from '../kit/palette';

/**
 * The house style made physical: after the look (and any accent) has printed the frame, one
 * typed pass makes it seem to come from another dimension. Every effect works from the same
 * capture as the look, so it registers with the print, and by default borrows the print's own
 * paper and ink, so a quiet ink plate stays a quiet ink plate, only stranger.
 */
export const RIFTS = {
  plate: 'A document from elsewhere: the picture becomes a specimen plate or field record, ruled, labelled and captioned in a script nobody can read.',
  echo: 'Echoes: the subjects leave a trail of offset afterimages, as if seen from several moments or dimensions at once.',
  tear: 'A tear: bands of the picture slip sideways and split their colours, as if reality were badly tuned.',
  wireframe: 'Seams: part of each subject stands unrendered as a bare triangulated mesh, like a simulation showing how it is made.',
  portal: 'A portal: a doorway opens behind the hero with the whole picture inside it, again and again, deeper and deeper.',
  sky: 'A wrong world: the sky turns a flat, unnatural colour and the ground an alien earth, colours reduced like early computer graphics.',
  trails: 'Light trails: the scene sinks toward night while long-exposure strands of light stream around the hero.',
  colossus: 'Impossible scale: a vast ghost of the hero looms behind everything, far too large to be there.',
} as const;
export type Rift = keyof typeof RIFTS;

/**
 * Foreign inks are a character (screen-bright pair, one hot signal, dusty earth, pastels, chrome); with
 * a palette their hues re-key to it by `roles`, so the acid pair is acid in the idea's own colours.
 */
export const RIFT_INKS = {
  own: { colors: [], roles: [], description: 'The print’s own paper and ink: the strangeness stays inside the medium, quiet and plausible.' },
  acid: { colors: ['#3cf08f', '#ff3fa4'], roles: ['ink', 'second'], description: 'Two screen-bright colours clashing at full strength, like a wireframe glowing on a dead screen.' },
  signal: { colors: ['#ff3b2f', '#fff1dc'], roles: ['ink'], description: 'One hot signal colour and white heat, like light painted in a long exposure at night.' },
  ochre: { colors: ['#7d8650', '#c8742e'], roles: ['second', 'ink'], description: 'Dusty, sun-baked earth colours: a hazy sky over baked ground on another planet.' },
  candy: { colors: ['#ff8fc7', '#4fd9c4', '#ffd35c'], roles: ['ink', 'second', 'second'], description: 'Clashing candy pastels, like an op-art interior.' },
  chrome: { colors: ['#eef2f4', '#24282e'], roles: [], description: 'Chrome white and graphite: cold, clinical and early-CGI.' },
} as const satisfies Record<string, { colors: readonly string[]; roles: readonly PaletteRole[]; description: string }>;
export type RiftInk = keyof typeof RIFT_INKS;

export const OTHERWORLD_QUESTIONS = {
  rift: choice('How does this picture show that it comes from another dimension?', RIFTS),
  riftDepth: score('How far has the picture crossed over?', [
    'A faint wrongness', 'Clearly strange', 'Half in another world', 'Deep in another dimension', 'Entirely elsewhere',
  ]),
  riftInk: choice('Which inks carry the strangeness?', Object.fromEntries(Object.entries(RIFT_INKS).map(([id, ink]) => [id, ink.description])) as Record<RiftInk, string>),
} satisfies QuestionSet;

export const OTHERWORLD_NAMES: readonly string[] = Object.keys(OTHERWORLD_QUESTIONS);

export interface Otherworld {
  rift: Rift;
  /** The settled score, 0–1. Even the faintest setting is clearly visible: the style is heavy. */
  depth: number;
  ink: RiftInk;
}

/** Strength of the effect for a settled depth: never below a clear, deliberate presence. */
export const strengthOf = (depth: number) => 0.35 + 0.65 * Math.min(1, Math.max(0, Number.isFinite(depth) ? depth : 0.5));

export function otherworldOf(answers: Record<string, string | number | boolean>): Otherworld {
  const rift = (typeof answers.rift === 'string' && Object.hasOwn(RIFTS, answers.rift) ? answers.rift : 'plate') as Rift;
  const ink = (typeof answers.riftInk === 'string' && Object.hasOwn(RIFT_INKS, answers.riftInk) ? answers.riftInk : 'own') as RiftInk;
  return { rift, depth: Math.min(1, Math.max(0, Number(answers.riftDepth))) || 0, ink };
}

type RGB = readonly [number, number, number];
const hex = (value: string): RGB => [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const lumaOf = (color: RGB) => luma(color[0], color[1], color[2]);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Turn a colour round the colour wheel, keeping roughly its lightness. */
function hueRotate([r, g, b]: RGB, degrees: number): RGB {
  const a = (degrees * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const channel = (x: number) => Math.min(255, Math.max(0, x));
  return [
    channel(r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928)),
    channel(r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.14) + b * (0.072 - cos * 0.072 - sin * 0.283)),
    channel(r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072)),
  ];
}
/** Push a colour away from grey. */
function vivid(color: RGB, amount: number): RGB {
  const grey = lumaOf(color);
  return color.map((channel) => Math.min(255, Math.max(0, grey + (channel - grey) * amount))) as unknown as RGB;
}

const FIRST_THING = 3;
const HERO = 3;

/** The print's own paper and ink: the mean of its lightest and darkest few percent. */
export function printInks(pixels: Uint8ClampedArray, count: number): { ink: RGB; paper: RGB } {
  const histogram = new Uint32Array(256);
  const level = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const value = Math.round(luma(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]));
    level[i] = value;
    histogram[value]++;
  }
  const share = Math.max(1, Math.round(count * 0.06));
  let low = 0, high = 255;
  for (let seen = 0; low < 255 && (seen += histogram[low]) < share; low++);
  for (let seen = 0; high > 0 && (seen += histogram[high]) < share; high--);
  const sum = (test: (value: number) => boolean): RGB => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < count; i++) if (test(level[i])) { r += pixels[i * 4]; g += pixels[i * 4 + 1]; b += pixels[i * 4 + 2]; n++; }
    return n ? [r / n, g / n, b / n] : [128, 128, 128];
  };
  let ink = sum((value) => value <= low), paper = sum((value) => value >= high);
  // A print with no real range still needs a legible pair.
  if (lumaOf(paper) - lumaOf(ink) < 70) {
    ink = mixRGB(ink, [24, 22, 26], 0.7);
    paper = mixRGB(paper, [238, 230, 214], 0.7);
  }
  return { ink, paper };
}

/** Smooth value noise on a lattice, repeatable for a seed. */
function valueNoise(seed: number) {
  const corner = (x: number, y: number) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
    const top = corner(ix, iy) + (corner(ix + 1, iy) - corner(ix, iy)) * fx;
    const bottom = corner(ix, iy + 1) + (corner(ix + 1, iy + 1) - corner(ix, iy + 1)) * fx;
    return top + (bottom - top) * fy;
  };
}

/** Anti-aliased pen strokes gathered as coverage, then laid down once in one colour. */
class Strokes {
  readonly coverage: Float32Array;
  constructor(readonly size: number, readonly allowed?: (index: number) => boolean) {
    this.coverage = new Float32Array(size * size);
  }
  dot(x: number, y: number, radius: number, alpha = 1) {
    const { size } = this;
    for (let py = Math.max(0, Math.floor(y - radius - 1)); py <= Math.min(size - 1, Math.ceil(y + radius + 1)); py++)
      for (let px = Math.max(0, Math.floor(x - radius - 1)); px <= Math.min(size - 1, Math.ceil(x + radius + 1)); px++) {
        const index = py * size + px;
        if (this.allowed && !this.allowed(index)) continue;
        const cover = clamp01(radius + 0.5 - Math.hypot(px + 0.5 - x, py + 0.5 - y)) * alpha;
        if (cover > this.coverage[index]) this.coverage[index] = cover;
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, radius: number, alpha = 1) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.7));
    for (let step = 0; step <= steps; step++) this.dot(x0 + (x1 - x0) * step / steps, y0 + (y1 - y0) * step / steps, radius, alpha);
  }
  lay(out: Uint8ClampedArray, color: RGB, opacity = 1) {
    for (let i = 0; i < this.coverage.length; i++) {
      const a = this.coverage[i] * opacity;
      if (a <= 0) continue;
      out[i * 4] += (color[0] - out[i * 4]) * a;
      out[i * 4 + 1] += (color[1] - out[i * 4 + 1]) * a;
      out[i * 4 + 2] += (color[2] - out[i * 4 + 2]) * a;
    }
  }
}

interface Frame {
  size: number;
  count: number;
  id: (index: number) => number;
  /** The print as the look left it. */
  source: Uint8ClampedArray;
  out: Uint8ClampedArray;
  inks: { a: RGB; b: RGB; c: RGB; foreign: boolean; paper: RGB; ink: RGB };
  strength: number;
  random: () => number;
  seed: number;
  capture: Capture;
  /** Where a loop is, 0–1. Every effect returns to its first frame at 1. */
  phase: number;
}

function boundsOf(frame: Frame, test: (id: number) => boolean) {
  let minX = frame.size, minY = frame.size, maxX = -1, maxY = -1, area = 0;
  for (let i = 0; i < frame.count; i++) {
    if (!test(frame.id(i))) continue;
    const x = i % frame.size, y = (i / frame.size) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    area++;
  }
  return area ? { minX, minY, maxX, maxY, area, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 } : null;
}

/** Glyphs of a script nobody can read: two to four pen strokes in a small cell. */
function glyphs(strokes: Strokes, random: () => number, x: number, baseline: number, count: number, height: number) {
  const width = height * 0.68;
  for (let n = 0; n < count; n++) {
    if (random() < 0.16) { x += width * 0.9; continue; }
    const marks = 2 + Math.floor(random() * 3);
    for (let m = 0; m < marks; m++) {
      const points = 2 + Math.floor(random() * 2);
      let px = x + random() * width, py = baseline - random() * height;
      for (let p = 0; p < points; p++) {
        const nx = x + random() * width, ny = baseline - random() * height;
        strokes.line(px, py, nx, ny, height * 0.07);
        px = nx; py = ny;
      }
      if (random() < 0.25) strokes.dot(x + random() * width, baseline - height * (0.9 + random() * 0.3), height * 0.08);
    }
    x += width * (1.15 + random() * 0.3);
  }
  return x;
}

/** A specimen plate: paper margins, ruled borders, leader lines and captions in an unknown script. */
function plate(frame: Frame) {
  const { size, out, strength, random, inks } = frame;
  const paper = inks.paper;
  // Foreign inks write in whichever of their colours stands out from the paper.
  const ink = inks.foreign ? [inks.a, inks.b, inks.c].reduce((best, color) => Math.abs(lumaOf(color) - lumaOf(paper)) > Math.abs(lumaOf(best) - lumaOf(paper)) ? color : best) : inks.ink;
  const side = Math.round(size * (0.045 + 0.04 * strength)), top = side, bottom = Math.round(size * (0.12 + 0.07 * strength));
  const mottle = valueNoise(frame.seed ^ 0x1234), fox = valueNoise(frame.seed ^ 0x9876);
  const inside = (x: number, y: number) => x >= side && x < size - side && y >= top && y < size - bottom;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (inside(x, y)) continue;
    const i = (y * size + x) * 4;
    const tone = 0.93 + 0.09 * mottle(x / 46, y / 46);
    const spot = Math.max(0, fox(x / 13, y / 13) - 0.78) * 2.2;
    out[i] = paper[0] * tone - spot * 40;
    out[i + 1] = paper[1] * tone - spot * 52;
    out[i + 2] = paper[2] * tone - spot * 70;
  }
  const strokes = new Strokes(size);
  const x0 = side - 0.5, y0 = top - 0.5, x1 = size - side - 0.5, y1 = size - bottom - 0.5;
  for (const [ax, ay, bx, by] of [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]) strokes.line(ax, ay, bx, by, 1.1);
  const gap = 5;
  for (const [ax, ay, bx, by] of [[x0 - gap, y0 - gap, x1 + gap, y0 - gap], [x1 + gap, y0 - gap, x1 + gap, y1 + gap], [x1 + gap, y1 + gap, x0 - gap, y1 + gap], [x0 - gap, y1 + gap, x0 - gap, y0 - gap]]) strokes.line(ax, ay, bx, by, 0.5, 0.8);
  // Leader lines from labelled parts of the subjects out to the margin, each ending in a short label.
  const subjects: number[] = [];
  for (let i = 0; i < frame.count; i += 7) if (frame.id(i) >= FIRST_THING) subjects.push(i);
  const leaders = subjects.length ? 2 + Math.round(strength * 3) : 0;
  for (let n = 0; n < leaders; n++) {
    const at = subjects[Math.floor(random() * subjects.length)];
    const px = at % size, py = (at / size) | 0;
    const upward = py < (top + size - bottom) / 2;
    const ex = Math.min(size - side - 30, Math.max(side + 30, px + (random() - 0.5) * size * 0.3));
    const ey = upward ? top + 18 + random() * 30 : size - bottom - 18 - random() * 30;
    strokes.dot(px, py, 2.2);
    strokes.line(px, py, ex, ey, 0.6);
    strokes.line(ex - 6, ey, ex + 6, ey, 0.6);
    glyphs(strokes, random, ex + 9, ey + 4, 2 + Math.floor(random() * 3), 9);
  }
  // Captions: a catalogue mark, a title in the unknown script, and a wavering scale line.
  const baseline = size - bottom / 2 + 7;
  glyphs(strokes, random, side + 4, baseline, 3 + Math.floor(random() * 2), 15);
  glyphs(strokes, random, size * 0.36 + random() * size * 0.06, baseline, 6 + Math.floor(random() * 4), 15);
  let wx = size - side - size * 0.2;
  const period = 8 + random() * 6;
  for (let step = 0; step < size * 0.18; step += 2) {
    const nx = wx + 2, y = baseline - 6 + Math.sin((step / period) * Math.PI) * 4, ny = baseline - 6 + Math.sin(((step + 2) / period) * Math.PI) * 4;
    strokes.line(wx, y, nx, ny, 0.8);
    wx = nx;
  }
  for (const [cx, cy] of [[x0 - gap, y0 - gap], [x1 + gap, y0 - gap], [x0 - gap, y1 + gap], [x1 + gap, y1 + gap]]) {
    strokes.line(cx - 7, cy, cx + 7, cy, 0.5, 0.7);
    strokes.line(cx, cy - 7, cx, cy + 7, 0.5, 0.7);
  }
  strokes.lay(out, ink, 0.92);
  return 'ruled and captioned as a specimen plate in a script nobody can read';
}

/** Offset afterimages of the subjects, drawn behind them, fading with distance. */
function echo(frame: Frame) {
  const { size, out, source, strength, random, inks } = frame;
  const angle = random() * Math.PI * 2, copies = 3 + Math.round(4 * strength);
  // In a loop the afterimages breathe out and back in.
  const spacing = (7 + 20 * strength) * (1 + 0.45 * Math.sin(frame.phase * Math.PI * 2));
  const dx = Math.cos(angle) * spacing, dy = Math.sin(angle) * spacing * 0.6;
  for (let k = copies; k >= 1; k--) {
    const ox = Math.round(dx * k), oy = Math.round(dy * k);
    const tint = k % 2 ? inks.a : inks.b;
    const alpha = (0.55 + 0.4 * strength) * Math.pow(1 - (k - 1) / (copies + 1), 0.8);
    for (let y = 0; y < size; y++) {
      const sy = y - oy;
      if (sy < 0 || sy >= size) continue;
      for (let x = 0; x < size; x++) {
        const sx = x - ox;
        if (sx < 0 || sx >= size) continue;
        const index = y * size + x, from = sy * size + sx;
        if (frame.id(index) >= FIRST_THING || frame.id(from) < FIRST_THING) continue;
        const i = index * 4, s = from * 4;
        // The copy keeps a little of the print's own detail under the echo's ink.
        const shade = luma(source[s], source[s + 1], source[s + 2]) / 255;
        const r = tint[0] * (0.55 + 0.45 * shade), g = tint[1] * (0.55 + 0.45 * shade), b = tint[2] * (0.55 + 0.45 * shade);
        out[i] += (r - out[i]) * alpha;
        out[i + 1] += (g - out[i + 1]) * alpha;
        out[i + 2] += (b - out[i + 2]) * alpha;
      }
    }
  }
  return `${copies} offset afterimages trail the subjects`;
}

/** Bands that slip sideways with their colours split, and a jagged seam where the halves disagree. */
function tear(frame: Frame) {
  const { size, out, source, strength, random, inks } = frame;
  const sample = (x: number, y: number, channel: number) => {
    const cx = Math.min(size - 1, Math.max(0, Math.round(x))), cy = Math.min(size - 1, Math.max(0, Math.round(y)));
    return source[(cy * size + cx) * 4 + channel];
  };
  // The seam: everything beyond a jagged diagonal line is displaced.
  const slope = (random() - 0.5) * 0.8, offset = size * (0.35 + random() * 0.3) + Math.sin(frame.phase * Math.PI * 2) * 14;
  const shiftX = (random() < 0.5 ? -1 : 1) * (8 + 26 * strength), shiftY = (random() - 0.5) * 12 * strength;
  const jag = valueNoise(frame.seed ^ 0x7e41);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const edge = offset + slope * (x - size / 2) + (jag(x / 9, 0.5) - 0.5) * 22;
    if (y < edge) continue;
    const i = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) out[i + c] = sample(x - shiftX, y - shiftY, c);
  }
  const seam = new Strokes(size);
  for (let x = 0; x < size; x += 2) {
    const e0 = offset + slope * (x - size / 2) + (jag(x / 9, 0.5) - 0.5) * 22;
    const e1 = offset + slope * (x + 2 - size / 2) + (jag((x + 2) / 9, 0.5) - 0.5) * 22;
    seam.line(x, e0, x + 2, e1, 0.9);
  }
  // Slipped bands with split channels.
  const bands = 4 + Math.round(9 * strength);
  const split = 3 + 7 * strength;
  for (let n = 0; n < bands; n++) {
    // In a loop the bands roll down the picture like a tracking fault, wrapping once round.
    const y0 = Math.floor(random() * size + frame.phase * size) % size, height = 3 + Math.floor(random() * (12 + 40 * strength));
    const slip = (random() - 0.5) * 2 * (12 + 70 * strength);
    const smear = random() < 0.25, column = Math.floor(random() * size);
    for (let y = y0; y < Math.min(size, y0 + height); y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (smear) {
        // A stretched smear: one column of the picture pulled across the band.
        for (let c = 0; c < 3; c++) out[i + c] = sample(column + Math.floor(x / 60), y, c);
      } else {
        out[i] = sample(x - slip + split, y, 0);
        out[i + 1] = sample(x - slip, y, 1);
        out[i + 2] = sample(x - slip - split, y, 2);
      }
    }
    if (inks.foreign && random() < 0.6) {
      const edge = new Strokes(size);
      edge.line(0, y0, size, y0, 0.6);
      edge.lay(out, n % 2 ? inks.a : inks.b, 0.8);
    }
  }
  seam.lay(out, inks.foreign ? inks.a : inks.paper, 0.85);
  return `the picture tears along a seam and ${bands} bands slip out of register`;
}

/** Part of each subject left unrendered: flat fill, a triangulated mesh and its true creases. */
function wireframe(frame: Frame) {
  const { size, out, strength, random, inks, capture } = frame;
  const bounds = boundsOf(frame, (id) => id >= FIRST_THING)!;
  // A cut through the subjects: one side is finished, the other still a mesh.
  const angle = random() * Math.PI * 2, nx = Math.cos(angle), ny = Math.sin(angle);
  const reach = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2;
  const cut = reach * (1 - 2 * Math.min(1, 0.25 + strength * 0.85)) + reach * 0.35 * Math.sin(frame.phase * Math.PI * 2);
  const wobble = valueNoise(frame.seed ^ 0x3a1);
  const bare = (index: number) => {
    if (frame.id(index) < FIRST_THING) return false;
    const x = index % size, y = (index / size) | 0;
    return (x - bounds.cx) * nx + (y - bounds.cy) * ny + (wobble(x / 30, y / 30) - 0.5) * 40 > cut;
  };
  const fill = inks.foreign ? inks.a : inks.paper, line = inks.foreign ? inks.b : inks.ink;
  const diffuse = capture.diffuse;
  for (let i = 0; i < frame.count; i++) {
    if (!bare(i)) continue;
    const light = diffuse ? 0.75 + 0.35 * (diffuse[i * 4] / 255) : 1;
    out[i * 4] = fill[0] * light; out[i * 4 + 1] = fill[1] * light; out[i * 4 + 2] = fill[2] * light;
  }
  const strokes = new Strokes(size, bare);
  const cell = 26 - 12 * strength;
  const columns = Math.ceil(size / cell) + 2, rows = columns;
  const point = (c: number, r: number): [number, number] => {
    const h = hashText(`${c},${r}`) ^ frame.seed;
    const jitter = seeded(h);
    return [(c - 1) * cell + (jitter() - 0.5) * cell * 0.7, (r - 1) * cell + (jitter() - 0.5) * cell * 0.7];
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
    const p = point(c, r), right = point(c + 1, r), down = point(c, r + 1), diagonal = (c + r) % 2 ? point(c + 1, r + 1) : null;
    strokes.line(p[0], p[1], right[0], right[1], 0.55);
    strokes.line(p[0], p[1], down[0], down[1], 0.55);
    if (diagonal) strokes.line(p[0], p[1], diagonal[0], diagonal[1], 0.55);
    else { const across = point(c + 1, r); const below = point(c, r + 1); strokes.line(across[0], across[1], below[0], below[1], 0.55); }
  }
  // The model's own creases and silhouette, where normals or identity change sharply.
  const normal = capture.normal;
  for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    const index = y * size + x;
    if (!bare(index)) continue;
    const i = index * 4, right = i + 4, below = i + size * 4;
    const crease = Math.abs(normal[i] - normal[right]) + Math.abs(normal[i + 1] - normal[right + 1]) + Math.abs(normal[i + 2] - normal[right + 2])
      + Math.abs(normal[i] - normal[below]) + Math.abs(normal[i + 1] - normal[below + 1]) + Math.abs(normal[i + 2] - normal[below + 2]);
    if (crease > 90 || frame.id(index + 1) !== frame.id(index) || frame.id(index + size) !== frame.id(index)) strokes.dot(x + 0.5, y + 0.5, 0.9);
  }
  strokes.lay(out, line, 0.95);
  return 'part of each subject stands unrendered as a bare mesh';
}

/** A doorway behind the hero holding the whole picture, recursively. */
function portal(frame: Frame) {
  const { size, out, source, strength, random, inks } = frame;
  const hero = boundsOf(frame, (id) => id === HERO) ?? boundsOf(frame, (id) => id >= FIRST_THING)!;
  const span = Math.min(size * (0.5 + 0.3 * strength), Math.max(size * 0.32, Math.max(hero.maxX - hero.minX, hero.maxY - hero.minY) * 1.35));
  const scale = span / size;
  const left = Math.min(size - span, Math.max(0, hero.cx - span / 2 + (random() - 0.5) * span * 0.2));
  const top = Math.min(size - span, Math.max(0, hero.cy - span / 2 - span * 0.12));
  const inside = (x: number, y: number) => x >= left && x < left + span && y >= top && y < top + span;
  const levels = 2 + Math.round(3 * strength);
  // In a loop the view falls endlessly into the doorway: inside it, everything zooms toward the
  // doorway's own vanishing point, and after one loop each level has become the one before it.
  const fixedX = left / (1 - scale), fixedY = top / (1 - scale);
  const zoom = Math.pow(scale, frame.phase);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!inside(x, y)) continue;
    const index = y * size + x;
    if (frame.id(index) >= FIRST_THING) continue;
    let qx = fixedX + ((x - left) / scale - fixedX) * zoom, qy = fixedY + ((y - top) / scale - fixedY) * zoom, depth = 1;
    while (depth < levels + 1 && inside(qx, qy)) { qx = (qx - left) / scale; qy = (qy - top) / scale; depth++; }
    const sx = Math.min(size - 1, Math.max(0, Math.round(qx))), sy = Math.min(size - 1, Math.max(0, Math.round(qy)));
    const i = index * 4, s = (sy * size + sx) * 4;
    const dim = Math.pow(0.86, depth - frame.phase);
    out[i] = source[s] * dim; out[i + 1] = source[s + 1] * dim; out[i + 2] = source[s + 2] * dim;
  }
  const doorway = new Strokes(size, (index) => frame.id(index) < FIRST_THING);
  for (const [ax, ay, bx, by] of [[left, top, left + span, top], [left + span, top, left + span, top + span], [left + span, top + span, left, top + span], [left, top + span, left, top]]) doorway.line(ax, ay, bx, by, 2.2);
  const strokes = new Strokes(size, (index) => frame.id(index) < FIRST_THING && inside(index % size, (index / size) | 0));
  for (let depth = 1; depth <= levels; depth++) {
    // The nested doorways in image space, carried toward the viewer by the loop's zoom.
    const k = Math.pow(scale, depth) / zoom;
    const l = fixedX + (0 - fixedX) * k, t = fixedY + (0 - fixedY) * k, s = size * k;
    for (const [ax, ay, bx, by] of [[l, t, l + s, t], [l + s, t, l + s, t + s], [l + s, t + s, l, t + s], [l, t + s, l, t]]) strokes.line(ax, ay, bx, by, 0.7);
  }
  doorway.lay(out, inks.foreign ? inks.a : inks.ink, 0.9);
  strokes.lay(out, inks.foreign ? inks.a : inks.ink, 0.9);
  return `a doorway behind the hero holds the picture ${levels} levels deep`;
}

/** A flat, unnatural sky over an alien earth, colours reduced toward early computer graphics. */
function sky(frame: Frame) {
  const { size, out, strength, inks } = frame;
  let backdrop = 0;
  for (let i = 0; i < frame.count; i++) if (frame.id(i) === 0) backdrop++;
  const skyId = backdrop > frame.count * 0.03 ? 0 : 2;
  // In the print's own inks the wrong sky is its paper turned to an impossible hue.
  const heaven = inks.foreign ? inks.a : vivid(hueRotate(mixRGB(inks.paper, inks.ink, 0.3), 150), 2.6);
  const earth = inks.foreign ? inks.b : vivid(hueRotate(mixRGB(inks.paper, inks.ink, 0.4), 35), 1.8);
  const levels = Math.round(7 - 3 * strength);
  for (let i = 0; i < frame.count; i++) {
    const id = frame.id(i), j = i * 4, y = (i / size) | 0;
    let r = out[j], g = out[j + 1], b = out[j + 2];
    if (id === skyId) {
      const grade = 0.88 + 0.16 * (y / size);
      const amount = 0.7 + 0.3 * strength;
      r += (heaven[0] * grade - r) * amount; g += (heaven[1] * grade - g) * amount; b += (heaven[2] * grade - b) * amount;
    } else if (id === 1) {
      // The ground keeps its light and shade but takes the alien earth's colour.
      const shade = luma(r, g, b) / 255, amount = 0.45 + 0.4 * strength;
      r += (earth[0] * (0.45 + 0.75 * shade) - r) * amount; g += (earth[1] * (0.45 + 0.75 * shade) - g) * amount; b += (earth[2] * (0.45 + 0.75 * shade) - b) * amount;
    }
    // Reduced colour, mixed in with the strength.
    const step = 255 / (levels - 1), poster = 0.35 + 0.5 * strength;
    out[j] = r + (Math.round(r / step) * step - r) * poster;
    out[j + 1] = g + (Math.round(g / step) * step - g) * poster;
    out[j + 2] = b + (Math.round(b / step) * step - b) * poster;
  }
  return `the ${skyId === 0 ? 'sky turns' : 'walls turn'} an unnatural flat colour over an alien ground`;
}

/** The scene sinks toward night and long-exposure light streams around the hero. */
function trails(frame: Frame) {
  const { size, out, strength, random, inks } = frame;
  const hero = boundsOf(frame, (id) => id === HERO) ?? boundsOf(frame, (id) => id >= FIRST_THING)!;
  const dusk = 0.35 + 0.35 * strength;
  for (let i = 0; i < frame.count; i++) {
    const keep = frame.id(i) === HERO ? 0.5 : 1;
    for (let c = 0; c < 3; c++) out[i * 4 + c] *= 1 - dusk * keep;
  }
  const field = valueNoise(frame.seed ^ 0x51);
  const heat = new Float32Array(frame.count);
  // Strands are swung round the hero at a radius that suits the frame, not just a small hero.
  const orbit = Math.max(Math.max(hero.maxX - hero.minX, hero.maxY - hero.minY) * 0.75, size * 0.14);
  const strands = Math.round(70 + 170 * strength), steps = Math.round(170 + 160 * strength);
  const spin = random() < 0.5 ? 1 : -1;
  for (let n = 0; n < strands; n++) {
    // Each strand starts on a ring round the hero, a little in or out, and sweeps on from there.
    const start = random() * Math.PI * 2, ring = orbit * (0.55 + random() * 0.9);
    let x = hero.cx + Math.cos(start) * ring, y = hero.cy + Math.sin(start) * ring * 0.8;
    const drift = (random() - 0.5) * 0.5, bright = 0.45 + random() * 0.55;
    for (let step = 0; step < steps; step++) {
      const ax = x - hero.cx, ay = y - hero.cy, distance = Math.hypot(ax, ay) + 1e-3;
      // Swirl round the hero, wander on the noise, and pull back toward the orbit.
      const wander = (field(x / 140, y / 140) - 0.5) * Math.PI * 1.6;
      const pull = (ring - distance) / ring;
      let vx = (-ay / distance) * spin + (ax / distance) * (pull * 0.6 + drift);
      let vy = (ax / distance) * spin + (ay / distance) * (pull * 0.6 + drift);
      const turned = Math.atan2(vy, vx) + wander;
      vx = Math.cos(turned); vy = Math.sin(turned);
      x += vx * 2.2; y += vy * 2.2;
      if (x < 0 || y < 0 || x >= size || y >= size) break;
      // In a loop, pulses of light travel along each strand and come round again.
      const fade = Math.sin(Math.PI * step / steps) * (frame.phase || step ? 0.55 + 0.45 * Math.cos(Math.PI * 2 * (step / steps * 2 - frame.phase)) : 1);
      heat[(y | 0) * size + (x | 0)] += 0.55 * bright * fade;
    }
  }
  // A soft glow around each strand, from two box blurs.
  const blur = (from: Float32Array, radius: number) => {
    const to = new Float32Array(from.length), row = new Float32Array(from.length), width = radius * 2 + 1;
    for (let y = 0; y < size; y++) {
      let sum = 0;
      for (let x = -radius; x < size; x++) {
        if (x + radius < size) sum += from[y * size + x + radius];
        if (x - radius - 1 >= 0) sum -= from[y * size + x - radius - 1];
        if (x >= 0) row[y * size + x] = sum / width;
      }
    }
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let y = -radius; y < size; y++) {
        if (y + radius < size) sum += row[(y + radius) * size + x];
        if (y - radius - 1 >= 0) sum -= row[(y - radius - 1) * size + x];
        if (y >= 0) to[y * size + x] = sum / width;
      }
    }
    return to;
  };
  const glow = blur(blur(heat, 4), 4);
  const light = inks.foreign ? inks.a : vivid(mixRGB(inks.paper, [255, 250, 240], 0.6), 1.4), core: RGB = inks.foreign ? inks.b : [255, 252, 246];
  for (let i = 0; i < frame.count; i++) {
    // Exposure saturates, as film does, instead of piling up into a white blot.
    const line = 1 - Math.exp(-heat[i] * 1.4), halo = 1 - Math.exp(-glow[i] * 5);
    if (line <= 0.001 && halo <= 0.001) continue;
    for (let c = 0; c < 3; c++) out[i * 4 + c] += light[c] * halo * 0.75 + (core[c] - out[i * 4 + c]) * line * 0.85;
  }
  return `${strands} strands of long-exposure light stream round the hero`;
}

/** A vast, faint ghost of the hero behind everything. */
function colossus(frame: Frame) {
  const { size, out, strength, random, inks } = frame;
  const color = frame.capture.color;
  const heroic = boundsOf(frame, (id) => id === HERO);
  const isHero = heroic ? (id: number) => id === HERO : (id: number) => id >= FIRST_THING;
  const hero = heroic ?? boundsOf(frame, isHero)!;
  const far = (id: number) => id === 0 || id === 2;
  let room = 0;
  for (let i = 0; i < frame.count; i++) if (far(frame.id(i))) room++;
  const canvas = room > frame.count * 0.08 ? far : (id: number) => id < FIRST_THING;
  const breath = Math.sin(frame.phase * Math.PI * 2);
  const zoom = Math.min(6, Math.max(1.8 + 1.6 * strength, (size * 0.95) / Math.max(1, hero.maxY - hero.minY))) * (1 + 0.05 * breath);
  // The giant's feet sit near the hero's, so it rises behind it into the sky; in a loop it sways.
  const anchorX = hero.cx + (random() - 0.5) * size * 0.25 + breath * 10, anchorY = Math.min(size * 1.05, hero.maxY + size * 0.15);
  const alpha = 0.4 + 0.4 * strength;
  const haze = mixRGB(inks.paper, inks.foreign ? inks.b : inks.paper, 0.5);
  // Bilinear samples of the hero's coverage and colour, so a giant scaled many times stays soft, not blocky.
  const coverage = (x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    let total = 0;
    for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]] as const) {
      const sx = x0 + dx, sy = y0 + dy;
      if (sx >= 0 && sy >= 0 && sx < size && sy < size && isHero(frame.id(sy * size + sx))) total += w;
    }
    return total;
  };
  const shadeAt = (x: number, y: number) => {
    const x0 = Math.min(size - 2, Math.max(0, Math.floor(x))), y0 = Math.min(size - 2, Math.max(0, Math.floor(y)));
    const fx = clamp01(x - x0), fy = clamp01(y - y0);
    const at = (sx: number, sy: number) => { const s = (sy * size + sx) * 4; return luma(color[s], color[s + 1], color[s + 2]) / 255; };
    return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = y * size + x;
    if (!canvas(frame.id(index))) continue;
    const sx = hero.cx + (x - anchorX) / zoom, sy = hero.maxY + (y - anchorY) / zoom;
    if (sx < -1 || sy < -1 || sx >= size || sy >= size) continue;
    const cover = coverage(sx, sy);
    if (cover <= 0) continue;
    // The giant is the hero's shape and light from the capture, toned in the print's own ramp (or the
    // foreign inks), so a pale pen drawing still casts a legible giant.
    const shade = shadeAt(sx, sy);
    let [r, g, b] = inks.foreign ? mixRGB(inks.a, inks.b, shade) : mixRGB(inks.ink, inks.paper, 0.15 + shade * 0.7);
    // Atmosphere: the giant is far away, partly lost in the air.
    r += (haze[0] - r) * 0.22; g += (haze[1] - g) * 0.22; b += (haze[2] - b) * 0.22;
    const i = index * 4, a = alpha * cover;
    out[i] += (r - out[i]) * a; out[i + 1] += (g - out[i + 1]) * a; out[i + 2] += (b - out[i + 2]) * a;
  }
  return `a vast ghost of the hero, ${zoom.toFixed(1)} times its size, looms behind everything`;
}

const EFFECTS: Record<Rift, (frame: Frame) => string> = { plate, echo, tear, wireframe, portal, sky, trails, colossus };
/** Effects that need a placed thing in frame; without one the picture becomes a plate instead. */
const NEEDS_SUBJECT: readonly Rift[] = ['echo', 'wireframe', 'portal', 'trails', 'colossus'];
const PHRASE: Record<RiftInk, string> = { own: 'in the print’s own inks', acid: 'in an acid pair', signal: 'in a signal colour and white heat', ochre: 'in dusty earth colours', candy: 'in candy pastels', chrome: 'in chrome and graphite' };

/** Apply the settled otherworld to a finished print. Repeatable for the same seed; the input is left untouched. */
export function applyOtherworld(pixels: Uint8ClampedArray, capture: Capture, world: Otherworld, seed: number, phase = 0, palette?: Palette): { pixels: Uint8ClampedArray; note: string } {
  const size = capture.size, count = size * size;
  const source = new Uint8ClampedArray(pixels);
  const out = new Uint8ClampedArray(pixels);
  const own = printInks(source, count);
  const chosen = RIFT_INKS[world.ink];
  const keyed = rekey(Object.fromEntries(chosen.colors.map((color, n) => [n, hex(color)])), palette, Object.fromEntries(chosen.roles.map((role, n) => [n, role])));
  const colors = chosen.colors.map((_, n) => keyed[n]);
  const inks = colors.length
    ? { a: colors[0], b: colors[1] ?? colors[0], c: colors[2] ?? colors[0], foreign: true, ...own }
    : { a: own.ink, b: mixRGB(own.ink, own.paper, 0.55), c: own.paper, foreign: false, ...own };
  const id = (index: number) => capture.identity[index * 4];
  let rift = world.rift;
  if (NEEDS_SUBJECT.includes(rift)) {
    let any = false;
    for (let i = 0; i < count && !any; i++) any = id(i) >= FIRST_THING;
    if (!any) rift = 'plate';
  }
  const frameSeed = (seed ^ hashText(`otherworld:${rift}`)) >>> 0;
  const frame: Frame = { size, count, id, source, out, inks, strength: strengthOf(world.depth), random: seeded(frameSeed), seed: frameSeed, capture, phase };
  const what = EFFECTS[rift](frame);
  return { pixels: out, note: `Otherworld: ${what}, ${PHRASE[world.ink]}` };
}
