/**
 * Doodle vocabularies for the dead-space glyph fill: every cell holds one tiny drawn thing. Each
 * doodle is a signed-ish distance to its pen strokes in a unit frame (u across, v down, the cell's
 * reach at ±1), so the fill can ink a line of any width round it; solid silhouettes return 0 inside.
 * Sets are themed (hieroglyphs, letters, body parts, furniture, buildings, nature, gems, flowers,
 * sacred geometry, contours, fractals, fungi); `machinery` is the original notebook of circuit
 * blocks, rings, ladders and three-stroke glyphs, kept exactly as it was so older prints replay.
 */
export const DOODLE_SETS = {
  machinery: 'Machinery: circuit blocks, rings, ladders, hatching and three-stroke glyphs, a notebook from another world.',
  hieroglyphs: 'Hieroglyphs: an eye of Horus, ankhs, ibises, cobras, scarabs, reeds, water, walking legs, seated figures and cartouches, a wall of Egyptian writing.',
  ascii: 'ASCII: capital letters, digits and punctuation in pen strokes, one character per cell, like a terminal dump or a type specimen.',
  anatomy: 'Body parts: eyes, ears, hands, feet, hearts, bones, skulls, teeth, lungs, vertebrae and brains, a page of anatomical studies.',
  furniture: 'Furniture: chairs, tables, lamps, beds, shelves, mirrors, clocks, doors and cups, a catalogue of household things.',
  buildings: 'Buildings: houses, towers, churches, pagodas, domes, castles, lighthouses, bridges, windmills and pyramids, a skyline of small architectures.',
  nature: 'Nature: trees, mountains, clouds, suns, moons, waves, leaves, rivers, snowflakes, shells and fish, a field guide in the margins.',
  gems: 'Gems and crystals: brilliant cuts, emerald cuts, hexagonal crystal columns, clusters, geodes and prisms, faceted and sparkling.',
  flowers: 'Flowers: daisies, tulips, roses, lotuses, lilies, sunflowers, bells, buds, clovers, dandelions and ferns, a pressed-flower book.',
  sacred: 'Sacred geometry: the flower of life, the vesica piscis, Metatron’s cube, hexagrams, pentagrams, yantras, golden spirals and the tree of life.',
  contours: 'Contours: topographic rings, fingerprint whorls, wood grain, ripples, isobars and cross-contour hatching, every cell a small map.',
  fractals: 'Fractals: Koch snowflakes, Sierpinski triangles, H-trees, dragon curves, Hilbert curves and branching trees, self-similar to the edge of the pen.',
  fungi: 'Fungi: mushrooms, toadstools, bracket fungus, morels, chanterelles, puffballs, gills, mycelium threads and lichen rosettes.',
  notebook: 'A notebook of everything: each cell takes its doodle from any of these sets, a hieroglyph beside a mushroom beside a chair.',
} as const;
export type DoodleSet = keyof typeof DOODLE_SETS;
export const DOODLE_SET_NAMES = Object.keys(DOODLE_SETS) as DoodleSet[];

/** A repeatable 0–1 number for a pair of integers. */
export function hashPair(a: number, b: number) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/**
 * Unit distance from (u, v) to a doodle's strokes; `k` is the cell's own 0–1 number for small variations
 * and `r` the cell's reach in pixels, for shapes that must thin out in small cells.
 */
export type Doodle = (u: number, v: number, k: number, r: number) => number;
export interface DoodleShape { name: string; draw: Doodle }

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const { hypot, abs, min, max, sin, cos, atan2, PI } = Math;

// Pen primitives, all returning unit distance to the stroke (or 0 inside a solid).
const seg = (u: number, v: number, x0: number, y0: number, x1: number, y1: number) => {
  const dx = x1 - x0, dy = y1 - y0, t = clamp01(((u - x0) * dx + (v - y0) * dy) / (dx * dx + dy * dy || 1));
  return hypot(u - x0 - dx * t, v - y0 - dy * t);
};
/** A polyline through flat [x0, y0, x1, y1, …]; closed joins the last point to the first. */
const path = (u: number, v: number, pts: readonly number[], closed = false) => {
  let best = Infinity;
  for (let i = 2; i < pts.length; i += 2) best = min(best, seg(u, v, pts[i - 2], pts[i - 1], pts[i], pts[i + 1]));
  if (closed && pts.length >= 4) best = min(best, seg(u, v, pts[pts.length - 2], pts[pts.length - 1], pts[0], pts[1]));
  return best;
};
const ring = (u: number, v: number, cx: number, cy: number, rad: number) => abs(hypot(u - cx, v - cy) - rad);
const disc = (u: number, v: number, cx: number, cy: number, rad: number) => max(0, hypot(u - cx, v - cy) - rad);
/** An ellipse outline, exact on its shorter axis and near enough elsewhere. */
const oval = (u: number, v: number, cx: number, cy: number, rx: number, ry: number) => { const k = min(rx, ry); return abs(hypot((u - cx) * k / rx, (v - cy) * k / ry) - k); };
const blob = (u: number, v: number, cx: number, cy: number, rx: number, ry: number) => { const k = min(rx, ry); return max(0, hypot((u - cx) * k / rx, (v - cy) * k / ry) - k); };
/** An arc of a circle from angle a0 to a1 (radians, v down so angles run clockwise on the page). */
const arc = (u: number, v: number, cx: number, cy: number, rad: number, a0: number, a1: number) => {
  const du = u - cx, dv = v - cy;
  let t = atan2(dv, du);
  const span = a1 - a0;
  let rel = t - a0;
  rel -= Math.floor(rel / (2 * PI)) * 2 * PI;
  if (rel <= span) return abs(hypot(du, dv) - rad);
  return min(hypot(u - cx - cos(a0) * rad, v - cy - sin(a0) * rad), hypot(u - cx - cos(a1) * rad, v - cy - sin(a1) * rad));
};
const box = (u: number, v: number, cx: number, cy: number, hw: number, hh: number) => {
  const dx = abs(u - cx) - hw, dy = abs(v - cy) - hh;
  return abs(hypot(max(dx, 0), max(dy, 0)) + min(max(dx, dy), 0));
};
const slab = (u: number, v: number, cx: number, cy: number, hw: number, hh: number) => hypot(max(abs(u - cx) - hw, 0), max(abs(v - cy) - hh, 0));
const dot = (u: number, v: number, cx: number, cy: number, rad = 0.07) => disc(u, v, cx, cy, rad);
/** A regular polygon outline of n sides, radius rad, the first corner at angle a0. */
const poly = (u: number, v: number, cx: number, cy: number, rad: number, n: number, a0 = -PI / 2) => {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) pts.push(cx + cos(a0 + i * 2 * PI / n) * rad, cy + sin(a0 + i * 2 * PI / n) * rad);
  return path(u, v, pts, true);
};
/** A star outline of n points. */
const star = (u: number, v: number, cx: number, cy: number, outer: number, inner: number, n: number, a0 = -PI / 2) => {
  const pts: number[] = [];
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? inner : outer, a = a0 + i * PI / n; pts.push(cx + cos(a) * r, cy + sin(a) * r); }
  return path(u, v, pts, true);
};
/** A wavy stroke: y = cy + amp·sin(freq·x + phase) across x0..x1, as a polyline. */
const wave = (u: number, v: number, x0: number, x1: number, cy: number, amp: number, freq: number, phase = 0, steps = 10) => {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) { const x = x0 + (x1 - x0) * i / steps; pts.push(x, cy + amp * sin(freq * x + phase)); }
  return path(u, v, pts);
};
/** A zigzag across x0..x1 with `teeth` peaks. */
const zigzag = (u: number, v: number, x0: number, x1: number, cy: number, amp: number, teeth: number) => {
  const pts: number[] = [];
  for (let i = 0; i <= teeth * 2; i++) pts.push(x0 + (x1 - x0) * i / (teeth * 2), cy + (i % 2 ? -amp : amp));
  return path(u, v, pts);
};
/** An Archimedean spiral of `turns` turns growing to `rad`. */
const spiral = (u: number, v: number, cx: number, cy: number, rad: number, turns: number, a0 = 0, steps = 28) => {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) { const t = i / steps, a = a0 + t * turns * 2 * PI; pts.push(cx + cos(a) * rad * t, cy + sin(a) * rad * t); }
  return path(u, v, pts);
};
/** A rounded profile stroked through `n` sample points of f(t) for t in 0..1. */
const curve = (u: number, v: number, f: (t: number) => [number, number], n = 12, closed = false) => {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) pts.push(...f(i / n));
  return path(u, v, pts, closed);
};
const m = (...ds: number[]) => min(...ds);
/** Iso-lines of a scalar field every `step`, with the nearest line at unit distance (fields are near-unit-gradient). */
const iso = (f: number, step: number) => { const r = f - Math.floor(f / step) * step; return min(r, step - r); };

// ---------------------------------------------------------------- machinery (the original eight kinds)
const machineryShapes: readonly DoodleShape[] = [
  { name: 'ring and dot', draw: (u, v) => { const d = hypot(u, v); return min(abs(d - 0.5), max(0, d - 0.12)); } },
  { name: 'block with a seam', draw: (u, v) => min(abs(max(abs(u), abs(v)) - 0.45), abs(v) < 0.45 && abs(u) < 0.45 ? abs(u - 0.15) : Infinity) },
  { name: 'ladder', draw: (u, v) => { if (abs(v) > 0.6) return Infinity; const rail = abs(abs(u) - 0.2), step = 0.24; const rung = abs(u) < 0.2 ? abs(v - Math.round(v / step) * step) : Infinity; return min(rail, rung); } },
  { name: 'hatching', draw: (u, v) => { if (max(abs(u), abs(v)) > 0.5) return Infinity; const step = 0.2; return abs(u - Math.round(u / step) * step); } },
  { name: 'glyph', draw: () => Infinity },
  { name: 'glyph', draw: () => Infinity },
  { name: 'dot grid', draw: (u, v) => { const step = 0.32; if (max(abs(u), abs(v)) > 0.5) return Infinity; return max(0, hypot(u - Math.round(u / step) * step, v - Math.round(v / step) * step) - 0.07); } },
  { name: 'blank', draw: () => Infinity },
];
/** The original three-stroke glyph: its points are the cell's own, drawn in pixels by the caller. */
function machineryGlyph(cell: number, a: number, b: number, r: number): number {
  let best = Infinity;
  const point = (k: number): [number, number] => [(hashPair(cell, 10 + k * 2) - 0.5) * r * 1.1, (hashPair(cell, 11 + k * 2) - 0.5) * r * 1.1];
  for (let k = 0; k < 3; k++) {
    const [x0, y0] = point(k), [x1, y1] = point(k + 1);
    const dx = x1 - x0, dy = y1 - y0, t = clamp01(((a - x0) * dx + (b - y0) * dy) / (dx * dx + dy * dy || 1));
    best = min(best, hypot(a - x0 - dx * t, b - y0 - dy * t));
  }
  return best;
}

// More pen primitives for the themed sets.
const rot = (u: number, v: number, a: number): [number, number] => [u * cos(a) + v * sin(a), -u * sin(a) + v * cos(a)];
/** A rounded box outline. */
const rbox = (u: number, v: number, cx: number, cy: number, hw: number, hh: number, rad: number) => {
  const dx = abs(u - cx) - hw + rad, dy = abs(v - cy) - hh + rad;
  return abs(hypot(max(dx, 0), max(dy, 0)) + min(max(dx, dy), 0) - rad);
};
/** A petal: an oval outline from (cx, cy) reaching `len` along angle a, `wid` wide. */
const petal = (u: number, v: number, cx: number, cy: number, a: number, len: number, wid: number) => { const [x, y] = rot(u - cx, v - cy, a); return oval(x, y, len / 2, 0, len / 2, wid / 2); };
/** A lens (pointed oval) from (x0, y0) to (x1, y1), bulging `bulge` to each side. */
const lens = (u: number, v: number, x0: number, y0: number, x1: number, y1: number, bulge: number, n = 8) => {
  const dx = x1 - x0, dy = y1 - y0, l = hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const side = (s: number) => curve(u, v, (t) => [x0 + dx * t + nx * bulge * s * sin(PI * t), y0 + dy * t + ny * bulge * s * sin(PI * t)], n);
  return min(side(1), side(-1));
};
/** A closed outline in polar form round (cx, cy). */
const polar = (u: number, v: number, cx: number, cy: number, radiusAt: (a: number) => number, n = 24) =>
  curve(u, v, (t) => { const a = t * 2 * PI; const r = radiusAt(a); return [cx + cos(a) * r, cy + sin(a) * r]; }, n, true);
/** Short radial strokes round (cx, cy) from r0 to r1, n of them. */
const rays = (u: number, v: number, cx: number, cy: number, r0: number, r1: number, n: number, a0 = 0) => {
  let best = Infinity;
  for (let i = 0; i < n; i++) { const a = a0 + i * 2 * PI / n; best = min(best, seg(u, v, cx + cos(a) * r0, cy + sin(a) * r0, cx + cos(a) * r1, cy + sin(a) * r1)); }
  return best;
};
const mirror = (f: (u: number, v: number) => number) => (u: number, v: number) => min(f(u, v), f(-u, v));
/** An almond eye: two lids, an iris ring and a pupil. */
const almond = (u: number, v: number, cx: number, cy: number, w: number, h: number, iris = 0.3, pupil = 0.14) =>
  m(curve(u, v, (t) => [cx - w + 2 * w * t, cy - h * sin(PI * t)]), curve(u, v, (t) => [cx - w + 2 * w * t, cy + h * sin(PI * t)]), ring(u, v, cx, cy, h * iris / 0.3 * 0.9), dot(u, v, cx, cy, h * pupil / 0.3 * 0.9));

// ---------------------------------------------------------------- hieroglyphs
const hieroglyphShapes: readonly DoodleShape[] = [
  { name: 'wedjat eye', draw: (u, v) => m(almond(u, v, 0, -0.05, 0.6, 0.28, 0.3, 0.14), curve(u, v, (t) => [-0.7 + 1.4 * t, -0.45 - 0.14 * sin(PI * t)]), seg(u, v, 0.22, 0.22, 0.22, 0.6), path(u, v, [-0.1, 0.22, -0.32, 0.6, -0.5, 0.52])) },
  { name: 'ankh', draw: (u, v) => m(ring(u, v, 0, -0.38, 0.22), seg(u, v, 0, -0.16, 0, 0.65), seg(u, v, -0.4, 0.0, 0.4, 0.0)) },
  { name: 'ibis', draw: (u, v) => m(blob(u, v, 0, 0.15, 0.4, 0.22), curve(u, v, (t) => [0.3 + 0.08 * sin(PI * t), 0.0 - 0.45 * t]), blob(u, v, 0.35, -0.45, 0.12, 0.09), curve(u, v, (t) => [0.45 + 0.3 * t, -0.45 + 0.25 * t * t]), seg(u, v, -0.05, 0.35, -0.05, 0.65), seg(u, v, 0.15, 0.35, 0.15, 0.65)) },
  { name: 'cobra', draw: (u, v) => m(blob(u, v, 0, -0.22, 0.28, 0.36), path(u, v, [0, 0.14, 0.28, 0.35, 0, 0.5, -0.3, 0.6, -0.6, 0.55]), dot(u, v, 0.08, -0.4, 0.04)) },
  { name: 'water', draw: (u, v) => m(zigzag(u, v, -0.65, 0.65, -0.18, 0.12, 3), zigzag(u, v, -0.65, 0.65, 0.18, 0.12, 3)) },
  { name: 'reed leaf', draw: (u, v) => m(lens(u, v, 0, 0.65, 0, -0.65, 0.2), seg(u, v, 0, 0.6, 0, -0.5)) },
  { name: 'winged sun', draw: (u, v) => m(ring(u, v, 0, -0.1, 0.2), dot(u, v, 0, -0.1, 0.05), mirror((x, y) => m(path(x, y, [-0.22, -0.05, -0.45, -0.25, -0.7, 0.05]), path(x, y, [-0.22, 0.05, -0.45, -0.1, -0.68, 0.12]), seg(x, y, -0.35, -0.2, -0.4, 0.0)))(u, v)) },
  { name: 'scarab', draw: (u, v) => m(oval(u, v, 0, 0.05, 0.3, 0.4), arc(u, v, 0, -0.35, 0.18, PI, 2 * PI), seg(u, v, 0, -0.2, 0, 0.45), seg(u, v, -0.3, -0.12, 0.3, -0.12), mirror((x, y) => m(seg(x, y, -0.28, -0.1, -0.55, -0.32), seg(x, y, -0.3, 0.1, -0.62, 0.1), seg(x, y, -0.25, 0.3, -0.5, 0.52)))(u, v)) },
  { name: 'feather of Maat', draw: (u, v) => m(curve(u, v, (t) => [-0.05 - 0.3 * sin(PI * t), 0.65 - 1.3 * t]), curve(u, v, (t) => [0.05 + 0.12 * sin(PI * t), 0.65 - 1.3 * t]), seg(u, v, 0, 0.6, 0, -0.5)) },
  { name: 'walking legs', draw: (u, v) => m(path(u, v, [-0.5, -0.45, -0.4, 0.5, -0.65, 0.5]), path(u, v, [-0.5, -0.45, -0.05, -0.45, 0.4, 0.5, 0.65, 0.5])) },
  { name: 'arm', draw: (u, v) => m(path(u, v, [-0.65, 0.12, -0.3, 0.12, 0.15, -0.05, 0.5, -0.05]), seg(u, v, 0.5, -0.05, 0.68, -0.2), seg(u, v, 0.5, -0.05, 0.7, -0.02), seg(u, v, 0.5, -0.05, 0.66, 0.14)) },
  { name: 'mouth', draw: (u, v) => m(curve(u, v, (t) => [-0.6 + 1.2 * t, -0.22 * sin(PI * t)]), curve(u, v, (t) => [-0.6 + 1.2 * t, 0.22 * sin(PI * t)])) },
  { name: 'basket', draw: (u, v) => m(curve(u, v, (t) => [-0.6 + 1.2 * t, -0.1 + 0.45 * sin(PI * t)]), seg(u, v, -0.6, -0.1, 0.6, -0.1)) },
  { name: 'seated figure', draw: (u, v) => m(dot(u, v, -0.15, -0.5, 0.14), seg(u, v, -0.15, -0.36, -0.18, 0.1), path(u, v, [-0.18, 0.1, 0.42, 0.1, 0.42, 0.5, 0.62, 0.5]), seg(u, v, -0.18, 0.1, -0.4, 0.5), seg(u, v, -0.4, 0.5, 0.62, 0.5), seg(u, v, -0.15, -0.2, 0.25, -0.02)) },
  { name: 'vulture', draw: (u, v) => m(oval(u, v, 0, 0.1, 0.38, 0.25), curve(u, v, (t) => [0.3 + 0.12 * t, -0.05 - 0.4 * t]), path(u, v, [0.42, -0.5, 0.62, -0.46, 0.56, -0.3]), seg(u, v, -0.36, 0.15, -0.65, 0.35), seg(u, v, -0.05, 0.35, -0.05, 0.6), seg(u, v, 0.15, 0.35, 0.15, 0.6)) },
  { name: 'house', draw: (u, v) => path(u, v, [-0.2, 0.35, -0.5, 0.35, -0.5, -0.35, 0.5, -0.35, 0.5, 0.35, 0.2, 0.35]) },
  { name: 'djed pillar', draw: (u, v) => m(seg(u, v, 0, -0.3, 0, 0.65), seg(u, v, -0.3, 0.65, 0.3, 0.65), slab(u, v, 0, -0.6, 0.3, 0.04), slab(u, v, 0, -0.42, 0.26, 0.04), slab(u, v, 0, -0.24, 0.22, 0.04), slab(u, v, 0, -0.06, 0.18, 0.04)) },
  { name: 'was sceptre', draw: (u, v) => m(seg(u, v, 0, -0.4, 0, 0.5), path(u, v, [-0.2, 0.65, 0, 0.5, 0.2, 0.65]), path(u, v, [0, -0.4, 0.1, -0.56, 0.3, -0.52]), seg(u, v, -0.02, -0.5, -0.2, -0.66)) },
  { name: 'lotus', draw: (u, v) => m(lens(u, v, 0, 0.42, 0, -0.65, 0.2), lens(u, v, 0, 0.42, -0.55, -0.4, 0.14), lens(u, v, 0, 0.42, 0.55, -0.4, 0.14), seg(u, v, 0, 0.42, 0, 0.65)) },
  { name: 'cartouche', draw: (u, v) => m(rbox(u, v, 0, -0.05, 0.38, 0.55, 0.3), seg(u, v, -0.4, 0.6, 0.4, 0.6), dot(u, v, 0, -0.3, 0.06), slab(u, v, 0, 0.0, 0.14, 0.03), ring(u, v, 0, 0.25, 0.08)) },
  { name: 'twisted flax', draw: (u, v) => m(curve(u, v, (t) => [0.16 * sin(3 * PI * t), -0.6 + 1.2 * t], 18), curve(u, v, (t) => [-0.16 * sin(3 * PI * t), -0.6 + 1.2 * t], 18)) },
  { name: 'quail chick', draw: (u, v) => m(oval(u, v, 0, 0.15, 0.32, 0.26), ring(u, v, 0.26, -0.3, 0.15), seg(u, v, 0.4, -0.3, 0.58, -0.26), dot(u, v, 0.28, -0.33, 0.03), seg(u, v, -0.05, 0.4, -0.05, 0.62), seg(u, v, 0.12, 0.4, 0.12, 0.62), seg(u, v, -0.3, 0.05, -0.62, -0.1)) },
  { name: 'eye', draw: (u, v) => almond(u, v, 0, 0, 0.6, 0.3) },
  { name: 'star', draw: (u, v) => star(u, v, 0, 0, 0.55, 0.22, 5) },
  { name: 'horned viper', draw: (u, v) => m(wave(u, v, -0.65, 0.45, 0.18, 0.1, 7, 0, 14), blob(u, v, 0.55, 0.1, 0.14, 0.1), seg(u, v, 0.48, 0.0, 0.42, -0.2), seg(u, v, 0.62, 0.0, 0.68, -0.2)) },
  { name: 'bread loaf', draw: (u, v) => m(arc(u, v, 0, 0.2, 0.45, PI, 2 * PI), seg(u, v, -0.45, 0.2, 0.45, 0.2)) },
  { name: 'jar', draw: (u, v) => m(path(u, v, [-0.3, -0.42, 0.3, -0.42, 0.4, 0.5, -0.4, 0.5], true), seg(u, v, -0.36, -0.5, 0.36, -0.5)) },
  { name: 'folded cloth', draw: (u, v) => m(box(u, v, 0, 0, 0.25, 0.6), seg(u, v, -0.25, -0.5, 0.25, -0.2), seg(u, v, -0.25, -0.15, 0.25, 0.15), seg(u, v, -0.25, 0.2, 0.25, 0.5)) },
];

// ---------------------------------------------------------------- ascii: a stroke font on a 4 × 6 grid
// Each glyph: strokes separated by '|', each a run of points 'xy' on the grid (x 0–4, y 0–6, y down).
const FONT: Record<string, string> = {
  A: '06 20 46|14 34', B: '06 00 30 41 42 33 44 45 36 06|03 33', C: '41 30 10 01 05 16 36 45', D: '06 00 20 42 44 26 06', E: '40 00 06 46|03 23', F: '40 00 06|03 23',
  G: '41 30 10 01 05 16 36 45 43 23', H: '00 06|40 46|03 43', I: '10 30|20 26|16 36', J: '40 43 45 36 16 05', K: '00 06|40 03|13 46', L: '00 06 46', M: '06 00 23 40 46',
  N: '06 00 46 40', O: '10 30 41 45 36 16 05 01 10', P: '06 00 30 41 42 33 03', Q: '10 30 41 45 36 16 05 01 10|24 46', R: '06 00 30 41 42 33 03|23 46',
  S: '41 30 10 01 02 13 33 44 45 36 16 05', T: '00 40|20 26', U: '00 05 16 36 45 40', V: '00 26 40', W: '00 06 23 46 40', X: '00 46|06 40', Y: '00 23 40|23 26', Z: '00 40 06 46',
  '0': '10 30 41 45 36 16 05 01 10|05 41', '1': '11 20 26|06 36', '2': '01 10 30 41 42 06 46', '3': '01 10 30 41 42 33 44 45 36 16 05|13 33', '4': '30 04 44|30 36',
  '5': '40 00 03 33 44 45 36 16 05', '6': '41 30 10 01 05 16 36 45 44 33 13 04', '7': '00 40 16', '8': '10 30 41 42 33 13 02 01 10|13 04 05 16 36 45 44 33', '9': '05 16 36 45 41 30 10 01 02 13 33 42',
  '#': '10 06|30 26|02 42|04 44', '@': '33 23 14 24 34 43 41 30 10 01 05 16 36 45', '&': '46 11 20 31 22 04 05 16 26 44', '%': '01 10 21 12 01|40 06|35 44 45 36 35', '*': '20 26|02 44|04 42',
  '+': '21 25|03 43', '=': '02 42|04 44', '{': '30 20 12 03 14 25 26 36', '}': '10 20 32 43 34 25 26 16', '[': '30 10 16 36', ']': '10 30 36 16', '<': '40 03 46', '>': '00 43 06',
  '/': '40 06', '\\': '00 46', '~': '04 12 23 34 42', '^': '02 20 42', '|': '20 26', ';': '22 22|25 15', ':': '22 22|25 25', '?': '01 10 30 41 42 23 24|26 26', '!': '20 24|26 26',
  $: '41 30 10 01 02 13 33 44 45 36 16 05|20 26', '.': '26 26', ',': '25 16',
};
const CHARACTERS = Object.keys(FONT);
const glyphStrokes = new Map<string, number[][]>();
for (const [ch, spec] of Object.entries(FONT)) glyphStrokes.set(ch, spec.split('|').map((run) => run.split(' ').flatMap((p) => [(Number(p[0]) - 2) * 0.27, (Number(p[1]) - 3) * 0.2])));
/** One character as pen strokes, centred and about 1.2 units tall. */
const character = (u: number, v: number, ch: string, scale = 1, cx = 0, cy = 0) => {
  let best = Infinity;
  for (const run of glyphStrokes.get(ch) ?? []) {
    if (run.length === 2 || (run.length === 4 && run[0] === run[2] && run[1] === run[3])) best = min(best, dot(u, v, cx + run[0] * scale, cy + run[1] * scale, 0.08 * scale));
    else { const pts: number[] = []; for (let i = 0; i < run.length; i += 2) pts.push(cx + run[i] * scale, cy + run[i + 1] * scale); best = min(best, path(u, v, pts)); }
  }
  return best;
};
const asciiShapes: readonly DoodleShape[] = CHARACTERS.map((ch) => ({ name: ch, draw: (u, v) => character(u, v, ch) }));

// ---------------------------------------------------------------- anatomy
const anatomyShapes: readonly DoodleShape[] = [
  { name: 'eye', draw: (u, v) => m(almond(u, v, 0, 0, 0.62, 0.3), curve(u, v, (t) => [-0.6 + 1.2 * t, -0.48 - 0.1 * sin(PI * t)])) },
  { name: 'ear', draw: (u, v) => m(curve(u, v, (t) => { const a = -0.6 * PI + 1.35 * PI * t; return [-0.08 + 0.42 * cos(a), 0.58 * sin(a)]; }, 14), curve(u, v, (t) => { const a = -0.45 * PI + 0.9 * PI * t; return [-0.05 + 0.22 * cos(a), -0.05 + 0.3 * sin(a)]; }, 8), dot(u, v, -0.15, 0.42, 0.05)) },
  { name: 'hand', draw: (u, v) => { let d = rbox(u, v, 0, 0.3, 0.3, 0.3, 0.12); for (let i = 0; i < 4; i++) d = min(d, seg(u, v, -0.22 + i * 0.15, 0.0, -0.27 + i * 0.18, -0.62 + abs(i - 1.5) * 0.08)); return min(d, path(u, v, [-0.3, 0.25, -0.6, -0.05, -0.68, -0.15])); } },
  { name: 'foot', draw: (u, v) => { let d = path(u, v, [-0.22, -0.55, 0.2, -0.6, 0.3, 0.0, 0.2, 0.6, -0.2, 0.6, -0.3, 0.2], true); for (let i = 0; i < 5; i++) d = min(d, dot(u, v, -0.2 + i * 0.1, -0.7 + abs(i - 1) * 0.06, 0.05 - i * 0.005)); return d; } },
  { name: 'heart', draw: (u, v) => m(polar(u, v, 0, 0.12, (a) => 0.42 + 0.06 * sin(2 * a + 1) + 0.03 * cos(3 * a)), path(u, v, [-0.08, -0.3, -0.08, -0.6, 0.15, -0.62, 0.2, -0.4]), seg(u, v, 0.1, -0.3, 0.3, -0.55), seg(u, v, -0.2, -0.3, -0.35, -0.5), wave(u, v, -0.3, 0.25, 0.05, 0.08, 9, 0, 8)) },
  { name: 'bone', draw: (u, v) => m(ring(u, v, -0.13, -0.5, 0.14), ring(u, v, 0.13, -0.5, 0.14), ring(u, v, -0.13, 0.5, 0.14), ring(u, v, 0.13, 0.5, 0.14), seg(u, v, -0.1, -0.38, -0.1, 0.38), seg(u, v, 0.1, -0.38, 0.1, 0.38)) },
  { name: 'skull', draw: (u, v) => { let d = m(arc(u, v, 0, -0.1, 0.5, PI, 2 * PI), seg(u, v, -0.5, -0.1, -0.42, 0.3), seg(u, v, 0.5, -0.1, 0.42, 0.3), path(u, v, [-0.42, 0.3, -0.3, 0.58, 0.3, 0.58, 0.42, 0.3]), dot(u, v, -0.2, 0.02, 0.13), dot(u, v, 0.2, 0.02, 0.13), path(u, v, [-0.06, 0.3, 0, 0.18, 0.06, 0.3], true)); for (let i = -2; i <= 2; i++) d = min(d, seg(u, v, i * 0.11, 0.42, i * 0.11, 0.58)); return d; } },
  { name: 'tooth', draw: (u, v) => path(u, v, [-0.3, -0.5, 0.3, -0.5, 0.36, 0.0, 0.22, 0.12, 0.26, 0.6, 0.1, 0.12, -0.1, 0.12, -0.26, 0.6, -0.22, 0.12, -0.36, 0.0], true) },
  { name: 'nose', draw: (u, v) => m(path(u, v, [-0.1, -0.62, -0.05, -0.2, 0.15, 0.15, 0.3, 0.3, 0.1, 0.42, -0.1, 0.36]), arc(u, v, -0.05, 0.3, 0.12, 0.3 * PI, 1.2 * PI)) },
  { name: 'lips', draw: (u, v) => m(path(u, v, [-0.6, 0, -0.3, -0.16, -0.1, -0.08, 0, -0.16, 0.1, -0.08, 0.3, -0.16, 0.6, 0]), curve(u, v, (t) => [-0.6 + 1.2 * t, 0.3 * sin(PI * t)]), seg(u, v, -0.6, 0, 0.6, 0)) },
  { name: 'rib cage', draw: (u, v) => { let d = seg(u, v, 0, -0.65, 0, 0.65); for (let i = 0; i < 4; i++) { const y = -0.45 + i * 0.3; d = min(d, path(u, v, [0, y, -0.3, y + 0.05, -0.5, y + 0.22]), path(u, v, [0, y, 0.3, y + 0.05, 0.5, y + 0.22])); } return d; } },
  { name: 'vertebra', draw: (u, v) => m(oval(u, v, 0, 0.15, 0.3, 0.2), ring(u, v, 0, -0.18, 0.13), seg(u, v, 0, -0.31, 0, -0.62), seg(u, v, -0.12, -0.25, -0.5, -0.42), seg(u, v, 0.12, -0.25, 0.5, -0.42), seg(u, v, -0.1, -0.1, -0.35, 0.05), seg(u, v, 0.1, -0.1, 0.35, 0.05)) },
  { name: 'lungs', draw: (u, v) => m(seg(u, v, 0, -0.62, 0, -0.22), oval(u, v, -0.3, 0.15, 0.25, 0.42), oval(u, v, 0.3, 0.15, 0.25, 0.42), seg(u, v, 0, -0.22, -0.22, -0.02), seg(u, v, 0, -0.22, 0.22, -0.02)) },
  { name: 'brain', draw: (u, v) => m(oval(u, v, 0, 0, 0.55, 0.42), seg(u, v, 0, -0.4, 0, 0.35), wave(u, v, -0.45, -0.08, -0.12, 0.06, 28, 0, 10), wave(u, v, 0.08, 0.45, -0.12, 0.06, 28, 1, 10), wave(u, v, -0.42, -0.08, 0.12, 0.06, 28, 2, 10), wave(u, v, 0.08, 0.42, 0.12, 0.06, 28, 0.5, 10), path(u, v, [-0.1, 0.4, -0.05, 0.6, 0.1, 0.62])) },
  { name: 'finger', draw: (u, v) => m(path(u, v, [-0.13, 0.65, -0.13, -0.35, 0, -0.56, 0.13, -0.35, 0.13, 0.65]), arc(u, v, 0, -0.3, 0.1, PI, 2 * PI), seg(u, v, -0.13, 0.0, 0.13, 0.0), seg(u, v, -0.13, 0.3, 0.13, 0.3)) },
  { name: 'fist', draw: (u, v) => m(oval(u, v, 0, 0.1, 0.45, 0.35), arc(u, v, -0.3, -0.2, 0.12, PI, 2 * PI), arc(u, v, -0.1, -0.24, 0.12, PI, 2 * PI), arc(u, v, 0.1, -0.24, 0.12, PI, 2 * PI), arc(u, v, 0.3, -0.2, 0.12, PI, 2 * PI), path(u, v, [-0.45, 0.15, -0.2, 0.25, 0.1, 0.2])) },
  { name: 'spine', draw: (u, v) => { let d = curve(u, v, (t) => [0.15 * sin(2 * PI * t), -0.65 + 1.3 * t], 16); for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8, x = 0.15 * sin(2 * PI * t), y = -0.65 + 1.3 * t; d = min(d, seg(u, v, x - 0.12, y, x + 0.12, y)); } return d; } },
  { name: 'intestine', draw: (u, v) => curve(u, v, (t) => [0.5 * sin(2.5 * PI * t) * (1 - 0.3 * t) + 0.1 * cos(9 * PI * t), -0.6 + 1.25 * t], 40) },
  { name: 'open mouth', draw: (u, v) => { let d = m(oval(u, v, 0, 0, 0.58, 0.32), arc(u, v, 0, 0.35, 0.3, PI + 0.3, 2 * PI - 0.3)); for (let i = -2; i <= 2; i++) d = min(d, seg(u, v, i * 0.15, -0.27, i * 0.15, -0.1), seg(u, v, i * 0.15, 0.27, i * 0.15, 0.12)); return min(d, seg(u, v, -0.4, -0.1, 0.4, -0.1), seg(u, v, -0.4, 0.12, 0.4, 0.12)); } },
  { name: 'leg', draw: (u, v) => m(path(u, v, [-0.2, -0.65, -0.25, 0.0, -0.15, 0.45, -0.1, 0.6, 0.35, 0.6]), path(u, v, [0.1, -0.65, 0.12, 0.0, 0.05, 0.45, 0.1, 0.52]), arc(u, v, -0.05, 0.05, 0.1, -0.5 * PI, 0.5 * PI)) },
  { name: 'kidney', draw: (u, v) => m(polar(u, v, 0, 0, (a) => 0.42 - 0.12 * cos(a) * max(0, cos(a)) + 0.08 * cos(2 * a)), path(u, v, [-0.3, -0.12, -0.5, -0.2, -0.65, -0.1]), path(u, v, [-0.3, 0.12, -0.5, 0.2, -0.65, 0.3])) },
  { name: 'femur', draw: (u, v) => m(path(u, v, [-0.1, -0.35, -0.08, 0.4]), path(u, v, [0.1, -0.35, 0.12, 0.4]), ring(u, v, -0.2, -0.5, 0.17), arc(u, v, 0.22, -0.38, 0.12, PI, 2 * PI), seg(u, v, 0.1, -0.35, 0.34, -0.38), path(u, v, [-0.08, 0.4, -0.3, 0.5, -0.25, 0.65, 0.3, 0.65, 0.32, 0.5, 0.12, 0.4])) },
];

// ---------------------------------------------------------------- furniture
const furnitureShapes: readonly DoodleShape[] = [
  { name: 'chair', draw: (u, v) => m(box(u, v, 0, -0.3, 0.3, 0.35), seg(u, v, -0.3, -0.45, 0.3, -0.45), seg(u, v, -0.3, -0.2, 0.3, -0.2), slab(u, v, 0, 0.08, 0.38, 0.04), seg(u, v, -0.33, 0.12, -0.33, 0.65), seg(u, v, 0.33, 0.12, 0.33, 0.65), seg(u, v, -0.33, 0.45, 0.33, 0.45)) },
  { name: 'armchair', draw: (u, v) => m(rbox(u, v, 0, -0.15, 0.42, 0.4, 0.15), rbox(u, v, -0.5, 0.2, 0.14, 0.18, 0.08), rbox(u, v, 0.5, 0.2, 0.14, 0.18, 0.08), seg(u, v, -0.36, 0.1, 0.36, 0.1), seg(u, v, -0.45, 0.38, -0.45, 0.6), seg(u, v, 0.45, 0.38, 0.45, 0.6)) },
  { name: 'table', draw: (u, v) => m(slab(u, v, 0, -0.22, 0.62, 0.04), seg(u, v, -0.5, -0.18, -0.5, 0.6), seg(u, v, 0.5, -0.18, 0.5, 0.6), seg(u, v, -0.5, -0.05, 0.5, -0.05)) },
  { name: 'stool', draw: (u, v) => m(oval(u, v, 0, -0.25, 0.4, 0.1), seg(u, v, -0.3, -0.18, -0.45, 0.6), seg(u, v, 0, -0.15, 0, 0.62), seg(u, v, 0.3, -0.18, 0.45, 0.6), seg(u, v, -0.3, 0.25, 0.3, 0.25)) },
  { name: 'floor lamp', draw: (u, v) => m(path(u, v, [-0.25, -0.62, 0.25, -0.62, 0.42, -0.2, -0.42, -0.2], true), seg(u, v, 0, -0.2, 0, 0.52), slab(u, v, 0, 0.56, 0.3, 0.04)) },
  { name: 'bed', draw: (u, v) => m(rbox(u, v, -0.55, -0.05, 0.08, 0.5, 0.05), box(u, v, 0.05, 0.2, 0.55, 0.13), oval(u, v, -0.3, 0.05, 0.14, 0.06), seg(u, v, -0.45, 0.33, -0.45, 0.55), seg(u, v, 0.55, 0.33, 0.55, 0.55), seg(u, v, -0.1, 0.07, 0.6, 0.07)) },
  { name: 'bookshelf', draw: (u, v) => { let d = m(box(u, v, 0, 0, 0.42, 0.62), seg(u, v, -0.42, -0.2, 0.42, -0.2), seg(u, v, -0.42, 0.2, 0.42, 0.2)); for (let i = 0; i < 5; i++) { const x = -0.32 + i * 0.16; d = min(d, seg(u, v, x, -0.2, x, -0.5 + (i % 3) * 0.06), seg(u, v, x + 0.05, 0.2, x + 0.05, -0.1 + ((i + 1) % 2) * 0.06), seg(u, v, x - 0.03, 0.62, x - 0.03, 0.3 + (i % 2) * 0.08)); } return d; } },
  { name: 'chest of drawers', draw: (u, v) => m(box(u, v, 0, 0, 0.45, 0.52), seg(u, v, -0.45, -0.17, 0.45, -0.17), seg(u, v, -0.45, 0.17, 0.45, 0.17), dot(u, v, 0, -0.34, 0.05), dot(u, v, 0, 0, 0.05), dot(u, v, 0, 0.34, 0.05), seg(u, v, -0.4, 0.52, -0.4, 0.62), seg(u, v, 0.4, 0.52, 0.4, 0.62)) },
  { name: 'mirror', draw: (u, v) => m(oval(u, v, 0, -0.12, 0.32, 0.42), seg(u, v, 0, 0.3, 0, 0.5), slab(u, v, 0, 0.54, 0.28, 0.03), seg(u, v, -0.15, 0.05, 0.05, -0.3)) },
  { name: 'clock', draw: (u, v) => m(ring(u, v, 0, 0, 0.52), seg(u, v, 0, 0, 0, -0.34), seg(u, v, 0, 0, 0.26, 0.1), dot(u, v, 0, -0.42, 0.04), dot(u, v, 0, 0.42, 0.04), dot(u, v, -0.42, 0, 0.04), dot(u, v, 0.42, 0, 0.04), dot(u, v, 0, 0, 0.04)) },
  { name: 'door', draw: (u, v) => m(box(u, v, 0, 0, 0.35, 0.62), dot(u, v, 0.22, 0.05, 0.05), box(u, v, 0, -0.32, 0.22, 0.18), box(u, v, 0, 0.25, 0.22, 0.25)) },
  { name: 'window', draw: (u, v) => m(box(u, v, 0, -0.05, 0.45, 0.5), seg(u, v, 0, -0.55, 0, 0.45), seg(u, v, -0.45, -0.05, 0.45, -0.05), slab(u, v, 0, 0.52, 0.55, 0.03)) },
  { name: 'vase', draw: (u, v) => m(path(u, v, [-0.2, -0.62, 0.2, -0.62, 0.12, -0.4, 0.36, 0.0, 0.3, 0.52, -0.3, 0.52, -0.36, 0.0, -0.12, -0.4], true), seg(u, v, -0.2, 0.4, 0.2, 0.4)) },
  { name: 'cup', draw: (u, v) => m(box(u, v, -0.05, 0.1, 0.3, 0.35), arc(u, v, 0.25, 0.1, 0.2, -0.5 * PI, 0.5 * PI), curve(u, v, (t) => [-0.18 + 0.06 * sin(3 * PI * t), -0.3 - 0.32 * t]), curve(u, v, (t) => [0.05 + 0.06 * sin(3 * PI * t + 1), -0.3 - 0.32 * t])) },
  { name: 'sofa', draw: (u, v) => m(rbox(u, v, 0, 0.12, 0.62, 0.3, 0.12), rbox(u, v, 0, -0.25, 0.5, 0.15, 0.1), seg(u, v, 0, -0.1, 0, 0.42), seg(u, v, -0.5, 0.42, -0.5, 0.58), seg(u, v, 0.5, 0.42, 0.5, 0.58)) },
  { name: 'bathtub', draw: (u, v) => m(path(u, v, [-0.65, -0.2, -0.55, 0.42, 0.55, 0.42, 0.65, -0.2], true), seg(u, v, 0.5, -0.5, 0.5, -0.2), seg(u, v, 0.4, -0.5, 0.6, -0.5), dot(u, v, -0.45, 0.5, 0.05), dot(u, v, 0.45, 0.5, 0.05), wave(u, v, -0.5, 0.5, -0.05, 0.04, 14, 0, 10)) },
  { name: 'candle', draw: (u, v) => m(box(u, v, 0, 0.18, 0.1, 0.38), lens(u, v, 0, -0.25, 0, -0.62, 0.1), seg(u, v, 0, -0.2, 0, -0.3), path(u, v, [-0.3, 0.56, -0.3, 0.64, 0.3, 0.64, 0.3, 0.56]), arc(u, v, 0.38, 0.5, 0.1, -0.5 * PI, 0.5 * PI)) },
  { name: 'bench', draw: (u, v) => m(slab(u, v, 0, 0.05, 0.62, 0.05), seg(u, v, -0.45, 0.1, -0.45, 0.5), seg(u, v, 0.45, 0.1, 0.45, 0.5), seg(u, v, -0.55, 0.5, -0.35, 0.5), seg(u, v, 0.35, 0.5, 0.55, 0.5), seg(u, v, -0.45, 0.3, 0.45, 0.3)) },
  { name: 'rocking chair', draw: (u, v) => m(path(u, v, [-0.35, -0.6, -0.3, 0.1, 0.3, 0.1, 0.3, 0.45]), seg(u, v, -0.3, -0.45, -0.15, -0.45), seg(u, v, -0.32, -0.25, -0.1, -0.25), seg(u, v, -0.3, 0.1, -0.3, 0.45), arc(u, v, 0, -0.1, 0.72, 0.28 * PI, 0.72 * PI)) },
  { name: 'picture frame', draw: (u, v) => m(box(u, v, 0, 0, 0.52, 0.42), box(u, v, 0, 0, 0.42, 0.32), path(u, v, [-0.3, 0.15, -0.1, -0.1, 0.05, 0.05, 0.2, -0.15, 0.32, 0.15]), dot(u, v, 0.2, -0.18, 0.04)) },
  { name: 'teapot', draw: (u, v) => m(oval(u, v, 0, 0.12, 0.4, 0.3), path(u, v, [0.35, 0.0, 0.62, -0.3]), path(u, v, [0.3, 0.2, 0.6, -0.1]), arc(u, v, -0.42, 0.1, 0.18, 0.5 * PI, 1.5 * PI), arc(u, v, 0, -0.18, 0.2, PI, 2 * PI), dot(u, v, 0, -0.4, 0.05)) },
  { name: 'pendant lamp', draw: (u, v) => m(seg(u, v, 0, -0.65, 0, -0.2), path(u, v, [-0.15, -0.2, 0.15, -0.2, 0.42, 0.2, -0.42, 0.2], true), arc(u, v, 0, 0.25, 0.12, 0, PI)) },
];

// ---------------------------------------------------------------- buildings
const crenellation = (u: number, v: number, cx: number, y: number, hw: number, teeth: number, tall = 0.12) => {
  const pts: number[] = [cx - hw, y];
  const w = 2 * hw / (teeth * 2 - 1);
  for (let i = 0; i < teeth * 2 - 1; i++) { const x0 = cx - hw + i * w, x1 = x0 + w, up = i % 2 === 0 ? -tall : 0; pts.push(x0, y + up, x1, y + up); }
  pts.push(cx + hw, y);
  return path(u, v, pts);
};
const buildingShapes: readonly DoodleShape[] = [
  { name: 'house', draw: (u, v) => m(box(u, v, 0, 0.2, 0.4, 0.35), path(u, v, [-0.52, -0.15, 0, -0.6, 0.52, -0.15]), box(u, v, 0.02, 0.4, 0.1, 0.15), box(u, v, -0.22, 0.1, 0.1, 0.1), slab(u, v, 0.28, -0.4, 0.05, 0.12)) },
  { name: 'tower', draw: (u, v) => m(box(u, v, 0, 0.08, 0.22, 0.52), crenellation(u, v, 0, -0.44, 0.22, 3), seg(u, v, 0, -0.2, 0, -0.05), seg(u, v, 0, 0.15, 0, 0.3), arc(u, v, 0, 0.6, 0.08, PI, 2 * PI)) },
  { name: 'church', draw: (u, v) => m(box(u, v, 0.1, 0.25, 0.4, 0.3), path(u, v, [-0.32, -0.05, 0.1, -0.35, 0.52, -0.05]), box(u, v, -0.42, 0.1, 0.1, 0.45), path(u, v, [-0.52, -0.35, -0.42, -0.62, -0.32, -0.35]), seg(u, v, -0.42, -0.62, -0.42, -0.72), seg(u, v, -0.47, -0.68, -0.37, -0.68), arc(u, v, 0.1, 0.25, 0.08, PI, 2 * PI), seg(u, v, 0.02, 0.25, 0.02, 0.55), seg(u, v, 0.18, 0.25, 0.18, 0.55)) },
  { name: 'pagoda', draw: (u, v) => { let d = seg(u, v, 0, -0.7, 0, -0.5); for (let i = 0; i < 3; i++) { const y = -0.5 + i * 0.38, w = 0.3 + i * 0.15; d = min(d, path(u, v, [-w, y + 0.12, -w * 0.55, y, w * 0.55, y, w, y + 0.12]), seg(u, v, -w * 0.4, y, -w * 0.4, y + 0.26), seg(u, v, w * 0.4, y, w * 0.4, y + 0.26)); } return d; } },
  { name: 'dome', draw: (u, v) => m(arc(u, v, 0, 0.02, 0.45, PI, 2 * PI), box(u, v, 0, 0.32, 0.55, 0.28), seg(u, v, 0, -0.43, 0, -0.62), dot(u, v, 0, -0.65, 0.04), seg(u, v, -0.45, 0.02, 0.45, 0.02), arc(u, v, 0, 0.6, 0.12, PI, 2 * PI)) },
  { name: 'arch', draw: (u, v) => m(seg(u, v, -0.45, 0.65, -0.45, 0.0), arc(u, v, 0, 0, 0.45, PI, 2 * PI), seg(u, v, 0.45, 0, 0.45, 0.65), seg(u, v, -0.3, 0.65, -0.3, 0.0), arc(u, v, 0, 0, 0.3, PI, 2 * PI), seg(u, v, 0.3, 0, 0.3, 0.65), slab(u, v, 0, -0.38, 0.06, 0.08)) },
  { name: 'castle', draw: (u, v) => m(box(u, v, 0, 0.3, 0.42, 0.25), box(u, v, -0.52, 0.05, 0.14, 0.5), box(u, v, 0.52, 0.05, 0.14, 0.5), crenellation(u, v, -0.52, -0.45, 0.14, 2, 0.1), crenellation(u, v, 0.52, -0.45, 0.14, 2, 0.1), crenellation(u, v, 0, 0.05, 0.38, 4, 0.08), arc(u, v, 0, 0.42, 0.1, PI, 2 * PI), seg(u, v, -0.1, 0.42, -0.1, 0.55), seg(u, v, 0.1, 0.42, 0.1, 0.55)) },
  { name: 'skyscraper', draw: (u, v) => { let d = m(box(u, v, 0, 0.02, 0.25, 0.62), seg(u, v, 0, -0.64, 0, -0.8)); for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) d = min(d, slab(u, v, -0.1 + c * 0.2, -0.5 + r * 0.2, 0.04, 0.04)); return d; } },
  { name: 'lighthouse', draw: (u, v) => m(path(u, v, [-0.22, 0.62, 0.22, 0.62, 0.13, -0.28, -0.13, -0.28], true), box(u, v, 0, -0.42, 0.17, 0.12), path(u, v, [-0.17, -0.54, 0, -0.66, 0.17, -0.54]), seg(u, v, -0.22, -0.42, -0.5, -0.5), seg(u, v, 0.22, -0.42, 0.5, -0.5), seg(u, v, -0.2, -0.3, -0.45, -0.2), seg(u, v, 0.2, -0.3, 0.45, -0.2), seg(u, v, -0.17, 0.1, 0.17, 0.1), seg(u, v, -0.2, 0.35, 0.2, 0.35)) },
  { name: 'bridge', draw: (u, v) => m(slab(u, v, 0, -0.05, 0.65, 0.04), arc(u, v, -0.33, -0.02, 0.26, 0, PI), arc(u, v, 0.33, -0.02, 0.26, 0, PI), seg(u, v, -0.62, 0.0, -0.62, 0.5), seg(u, v, 0.62, 0.0, 0.62, 0.5), seg(u, v, 0, 0.0, 0, 0.5), seg(u, v, -0.65, -0.22, 0.65, -0.22), seg(u, v, -0.4, -0.22, -0.4, -0.1), seg(u, v, 0.4, -0.22, 0.4, -0.1)) },
  { name: 'windmill', draw: (u, v) => { const cx = 0, cy = -0.18; let d = path(u, v, [-0.22, 0.62, 0.22, 0.62, 0.12, -0.05, -0.12, -0.05], true); for (let i = 0; i < 4; i++) { const a = PI / 4 + i * PI / 2; d = min(d, seg(u, v, cx, cy, cx + cos(a) * 0.55, cy + sin(a) * 0.55), seg(u, v, cx + cos(a) * 0.2 + cos(a + PI / 2) * 0.08, cy + sin(a) * 0.2 + sin(a + PI / 2) * 0.08, cx + cos(a) * 0.5 + cos(a + PI / 2) * 0.08, cy + sin(a) * 0.5 + sin(a + PI / 2) * 0.08)); } return min(d, dot(u, v, cx, cy, 0.05)); } },
  { name: 'hut', draw: (u, v) => m(path(u, v, [-0.58, 0.2, 0, -0.6, 0.58, 0.2], true), seg(u, v, -0.45, 0.2, -0.45, 0.6), seg(u, v, 0.45, 0.2, 0.45, 0.6), seg(u, v, -0.45, 0.6, 0.45, 0.6), arc(u, v, 0, 0.6, 0.12, PI, 2 * PI), seg(u, v, -0.3, -0.2, 0.3, -0.2), seg(u, v, -0.15, -0.4, 0.15, -0.4)) },
  { name: 'pyramid', draw: (u, v) => m(path(u, v, [-0.65, 0.5, 0, -0.6, 0.65, 0.5], true), seg(u, v, 0, -0.6, 0.18, 0.5), seg(u, v, -0.42, 0.12, -0.08, 0.12), seg(u, v, -0.55, 0.32, -0.03, 0.32)) },
  { name: 'obelisk', draw: (u, v) => m(path(u, v, [-0.12, 0.5, -0.08, -0.45, 0, -0.66, 0.08, -0.45, 0.12, 0.5], true), slab(u, v, 0, 0.58, 0.25, 0.07), seg(u, v, 0, -0.3, 0, 0.3)) },
  { name: 'column', draw: (u, v) => m(seg(u, v, -0.12, -0.42, -0.12, 0.45), seg(u, v, 0.12, -0.42, 0.12, 0.45), seg(u, v, 0, -0.42, 0, 0.45), slab(u, v, 0, -0.5, 0.25, 0.07), slab(u, v, 0, 0.53, 0.25, 0.07), spiral(u, v, -0.2, -0.46, 0.08, 1, 0, 10), spiral(u, v, 0.2, -0.46, 0.08, 1, PI, 10)) },
  { name: 'tent', draw: (u, v) => m(path(u, v, [-0.62, 0.5, 0, -0.55, 0.62, 0.5], true), path(u, v, [-0.14, 0.5, 0, 0.08, 0.14, 0.5]), seg(u, v, 0, -0.55, 0, -0.7)) },
  { name: 'torii', draw: (u, v) => m(seg(u, v, -0.4, -0.32, -0.4, 0.62), seg(u, v, 0.4, -0.32, 0.4, 0.62), path(u, v, [-0.68, -0.5, -0.4, -0.55, 0.4, -0.55, 0.68, -0.5]), seg(u, v, -0.55, -0.32, 0.55, -0.32), seg(u, v, 0, -0.55, 0, -0.32)) },
  { name: 'igloo', draw: (u, v) => m(arc(u, v, 0, 0.35, 0.58, PI, 2 * PI), seg(u, v, -0.58, 0.35, 0.58, 0.35), arc(u, v, 0, 0.35, 0.42, PI, 2 * PI), arc(u, v, 0, 0.35, 0.25, PI, 2 * PI), seg(u, v, 0, -0.23, 0, -0.07), seg(u, v, -0.3, 0.05, -0.25, 0.35), seg(u, v, 0.3, 0.05, 0.25, 0.35), arc(u, v, 0.62, 0.35, 0.14, PI, 2 * PI)) },
  { name: 'barn and silo', draw: (u, v) => m(box(u, v, -0.15, 0.25, 0.4, 0.3), path(u, v, [-0.55, -0.05, -0.4, -0.4, -0.15, -0.5, 0.1, -0.4, 0.25, -0.05]), box(u, v, -0.15, 0.4, 0.1, 0.15), box(u, v, 0.5, 0.05, 0.12, 0.5), arc(u, v, 0.5, -0.45, 0.12, PI, 2 * PI)) },
  { name: 'minaret', draw: (u, v) => m(box(u, v, 0, 0.12, 0.1, 0.5), seg(u, v, -0.2, -0.25, 0.2, -0.25), path(u, v, [-0.14, -0.38, -0.14, -0.5, 0, -0.68, 0.14, -0.5, 0.14, -0.38]), seg(u, v, -0.22, 0.62, 0.22, 0.62)) },
  { name: 'ziggurat', draw: (u, v) => m(box(u, v, 0, 0.45, 0.65, 0.15), box(u, v, 0, 0.15, 0.45, 0.15), box(u, v, 0, -0.15, 0.25, 0.15), path(u, v, [-0.1, 0.6, -0.1, -0.3, 0.1, -0.3, 0.1, 0.6])) },
  { name: 'stairs', draw: (u, v) => path(u, v, [-0.62, 0.62, -0.62, 0.36, -0.37, 0.36, -0.37, 0.1, -0.12, 0.1, -0.12, -0.16, 0.13, -0.16, 0.13, -0.42, 0.38, -0.42, 0.38, -0.65, 0.62, -0.65, 0.62, 0.62], true) },
  { name: 'chimney smoke', draw: (u, v) => m(path(u, v, [-0.65, 0.6, -0.65, 0.3, 0, -0.3, 0.65, 0.3, 0.65, 0.6]), path(u, v, [0.25, -0.1, 0.25, -0.5, 0.42, -0.5, 0.42, 0.05]), spiral(u, v, 0.3, -0.75, 0.2, 1.2, -PI / 2, 12)) },
  { name: 'tenement', draw: (u, v) => { let d = box(u, v, 0, 0, 0.42, 0.65); for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) d = min(d, box(u, v, -0.25 + c * 0.25, -0.45 + r * 0.3, 0.06, 0.08)); return min(d, zigzag(u, v, 0.3, 0.42, 0.0, 0.3, 1)); } },
];

// ---------------------------------------------------------------- nature
const natureShapes: readonly DoodleShape[] = [
  { name: 'tree', draw: (u, v) => m(polar(u, v, 0, -0.18, (a) => 0.42 + 0.06 * sin(5 * a) + 0.03 * sin(8 * a + 1)), seg(u, v, -0.07, 0.22, -0.07, 0.65), seg(u, v, 0.07, 0.22, 0.07, 0.65), seg(u, v, -0.07, 0.55, -0.3, 0.65), seg(u, v, 0.07, 0.55, 0.3, 0.65)) },
  { name: 'pine', draw: (u, v) => m(path(u, v, [-0.3, -0.2, 0, -0.65, 0.3, -0.2]), path(u, v, [-0.42, 0.15, 0, -0.3, 0.42, 0.15]), path(u, v, [-0.55, 0.5, 0, 0.05, 0.55, 0.5], true), seg(u, v, 0, 0.5, 0, 0.66)) },
  { name: 'mountains', draw: (u, v) => m(path(u, v, [-0.65, 0.5, -0.35, -0.2, -0.15, 0.1, 0.1, -0.55, 0.4, 0.0, 0.65, 0.5]), zigzag(u, v, -0.05, 0.25, -0.35, 0.05, 2), zigzag(u, v, -0.43, -0.27, -0.08, 0.04, 1), seg(u, v, -0.65, 0.5, 0.65, 0.5)) },
  { name: 'cloud', draw: (u, v) => m(arc(u, v, -0.3, 0.12, 0.22, PI, 2 * PI), arc(u, v, 0, -0.05, 0.3, PI, 2 * PI), arc(u, v, 0.32, 0.12, 0.22, PI, 2 * PI), seg(u, v, -0.52, 0.12, -0.52, 0.3), seg(u, v, 0.54, 0.12, 0.54, 0.3), seg(u, v, -0.52, 0.3, 0.54, 0.3)) },
  { name: 'sun', draw: (u, v) => m(ring(u, v, 0, 0, 0.28), rays(u, v, 0, 0, 0.4, 0.62, 8)) },
  { name: 'crescent moon', draw: (u, v) => m(arc(u, v, 0, 0, 0.5, 0.32 * PI, 1.68 * PI), arc(u, v, 0.24, 0, 0.42, 0.35 * PI, 1.65 * PI), dot(u, v, 0.35, -0.3, 0.03), dot(u, v, 0.5, 0.15, 0.03)) },
  { name: 'wave', draw: (u, v) => m(spiral(u, v, 0.18, -0.12, 0.38, 0.8, PI, 14), curve(u, v, (t) => [0.18 - 0.38 * cos(PI * t) - 0.5 * t, -0.12 + 0.38 * sin(PI * t) + 0.1 * t], 10), wave(u, v, -0.65, 0.65, 0.4, 0.07, 9, 0, 14)) },
  { name: 'leaf', draw: (u, v) => m(lens(u, v, -0.42, 0.5, 0.42, -0.5, 0.3), seg(u, v, -0.42, 0.5, 0.42, -0.5), seg(u, v, -0.15, 0.18, -0.3, -0.1), seg(u, v, 0.05, -0.06, -0.1, -0.35), seg(u, v, 0.2, -0.24, 0.1, -0.5), seg(u, v, -0.1, 0.12, 0.08, 0.32), seg(u, v, 0.1, -0.12, 0.28, 0.08), seg(u, v, -0.42, 0.5, -0.58, 0.68)) },
  { name: 'river', draw: (u, v) => m(wave(u, v, -0.68, 0.68, -0.1, 0.25, 4.5, 0, 16), wave(u, v, -0.68, 0.68, 0.1, 0.25, 4.5, 0, 16)) },
  { name: 'rain', draw: (u, v) => { let d = m(arc(u, v, -0.22, -0.3, 0.18, PI, 2 * PI), arc(u, v, 0.08, -0.4, 0.25, PI, 2 * PI), arc(u, v, 0.35, -0.3, 0.16, PI, 2 * PI), seg(u, v, -0.4, -0.3, 0.51, -0.3)); for (let i = 0; i < 5; i++) d = min(d, seg(u, v, -0.4 + i * 0.2, -0.1 + (i % 2) * 0.15, -0.48 + i * 0.2, 0.15 + (i % 2) * 0.15), seg(u, v, -0.3 + i * 0.2, 0.3 + (i % 2) * 0.1, -0.38 + i * 0.2, 0.55 + (i % 2) * 0.1)); return d; } },
  { name: 'lightning', draw: (u, v) => m(path(u, v, [0.18, -0.65, -0.22, -0.05, 0.1, -0.05, -0.25, 0.65]), path(u, v, [0.3, -0.65, -0.05, -0.15, 0.25, -0.15, -0.25, 0.65])) },
  { name: 'snowflake', draw: (u, v) => { let d = rays(u, v, 0, 0, 0, 0.62, 6); for (let i = 0; i < 6; i++) { const a = i * PI / 3, x = cos(a) * 0.36, y = sin(a) * 0.36; d = min(d, seg(u, v, x, y, x + cos(a + 0.6) * 0.18, y + sin(a + 0.6) * 0.18), seg(u, v, x, y, x + cos(a - 0.6) * 0.18, y + sin(a - 0.6) * 0.18)); } return d; } },
  { name: 'hill and tree', draw: (u, v) => m(arc(u, v, 0, 0.55, 0.65, PI, 2 * PI), ring(u, v, 0.25, -0.3, 0.15), seg(u, v, 0.25, -0.15, 0.25, 0.12), seg(u, v, -0.65, 0.55, 0.65, 0.55)) },
  { name: 'star', draw: (u, v) => star(u, v, 0, 0, 0.58, 0.24, 5) },
  { name: 'feather', draw: (u, v) => { let d = seg(u, v, -0.3, 0.62, 0.3, -0.62); for (let i = 0; i < 6; i++) { const t = 0.18 + i * 0.14, x = -0.3 + 0.6 * t, y = 0.62 - 1.24 * t, l = 0.22 - i * 0.02; d = min(d, seg(u, v, x, y, x - l, y - l * 0.6), seg(u, v, x, y, x + l * 0.7, y + l * 0.4)); } return d; } },
  { name: 'shell', draw: (u, v) => m(spiral(u, v, 0.02, 0.08, 0.55, 1.6, -PI / 2, 30), seg(u, v, 0.02, 0.08, 0.3, -0.38), seg(u, v, 0.02, 0.08, 0.5, 0.0), seg(u, v, 0.02, 0.08, 0.35, 0.45)) },
  { name: 'fish', draw: (u, v) => m(lens(u, v, -0.5, 0, 0.3, 0, 0.26), path(u, v, [0.3, 0, 0.6, -0.26, 0.6, 0.26], true), dot(u, v, -0.3, -0.03, 0.04), arc(u, v, -0.22, 0, 0.12, -0.4 * PI, 0.4 * PI), seg(u, v, -0.05, -0.2, 0.1, -0.38)) },
  { name: 'birds', draw: (u, v) => m(path(u, v, [-0.55, -0.1, -0.3, -0.32, -0.05, -0.1, 0.2, -0.32, 0.45, -0.1]), path(u, v, [0.05, 0.3, 0.2, 0.18, 0.35, 0.3, 0.5, 0.18, 0.65, 0.3])) },
  { name: 'grass', draw: (u, v) => { let d = Infinity; for (let i = 0; i < 5; i++) { const x = -0.5 + i * 0.25, h = 0.45 + abs(i - 2) * 0.1; d = min(d, curve(u, v, (t) => [x + 0.15 * (i - 2) * t * t, 0.6 - (0.6 + h - 0.6) * t - 0.6 * t], 6)); } return min(d, seg(u, v, -0.65, 0.6, 0.65, 0.6)); } },
  { name: 'acorn', draw: (u, v) => m(arc(u, v, 0, -0.1, 0.32, PI, 2 * PI), seg(u, v, -0.32, -0.1, 0.32, -0.1), arc(u, v, 0, -0.08, 0.28, 0.05 * PI, 0.95 * PI), seg(u, v, 0, -0.42, 0.1, -0.62), dot(u, v, -0.15, -0.25, 0.025), dot(u, v, 0.02, -0.3, 0.025), dot(u, v, 0.17, -0.22, 0.025), seg(u, v, 0, 0.0, 0, 0.18)) },
  { name: 'pebbles', draw: (u, v) => m(oval(u, v, -0.3, 0.15, 0.3, 0.2), oval(u, v, 0.28, 0.05, 0.25, 0.28), oval(u, v, -0.05, -0.35, 0.18, 0.12), oval(u, v, 0.2, 0.45, 0.14, 0.1)) },
  { name: 'volcano', draw: (u, v) => m(path(u, v, [-0.65, 0.5, -0.2, -0.3, 0.2, -0.3, 0.65, 0.5]), seg(u, v, -0.65, 0.5, 0.65, 0.5), path(u, v, [-0.1, -0.3, -0.15, -0.45, 0, -0.38, 0.15, -0.5, 0.2, -0.3]), zigzag(u, v, -0.08, 0.05, -0.0, 0.0, 0), path(u, v, [0.05, -0.3, 0.1, 0.0, 0.0, 0.2, 0.12, 0.45]), spiral(u, v, 0.05, -0.62, 0.14, 1, 0, 10)) },
  { name: 'raindrop', draw: (u, v) => m(arc(u, v, 0, 0.15, 0.35, 0, PI), seg(u, v, 0.35, 0.15, 0, -0.6), seg(u, v, -0.35, 0.15, 0, -0.6), arc(u, v, -0.05, 0.2, 0.2, 0.55 * PI, 0.95 * PI)) },
  { name: 'cactus', draw: (u, v) => m(rbox(u, v, 0, 0.1, 0.15, 0.55, 0.12), path(u, v, [-0.15, 0.0, -0.4, 0.0, -0.4, -0.35]), path(u, v, [0.15, 0.15, 0.42, 0.15, 0.42, -0.2]), dot(u, v, 0, -0.3, 0.02), dot(u, v, 0.05, 0.0, 0.02), dot(u, v, -0.05, 0.3, 0.02), dot(u, v, -0.4, -0.2, 0.02), seg(u, v, -0.4, 0.65, 0.4, 0.65)) },
  { name: 'palm', draw: (u, v) => { let d = curve(u, v, (t) => [0.1 - 0.2 * t * t, 0.65 - 1.0 * t], 8); for (let i = 0; i < 5; i++) { const a = -1.05 * PI + i * 0.28 * PI; d = min(d, curve(u, v, (t) => [-0.1 + cos(a) * 0.5 * t, -0.35 + sin(a) * 0.5 * t + 0.35 * t * t], 6)); } return d; } },
];

// ---------------------------------------------------------------- gems and crystals
const emeraldOutline = (s: number) => [-0.5 * s, -0.3 * s, -0.3 * s, -0.5 * s, 0.3 * s, -0.5 * s, 0.5 * s, -0.3 * s, 0.5 * s, 0.3 * s, 0.3 * s, 0.5 * s, -0.3 * s, 0.5 * s, -0.5 * s, 0.3 * s];
const shard = (u: number, v: number, cx: number, cy: number, a: number, len: number, wid: number) => { const [x, y] = rot(u - cx, v - cy, a); return m(path(x, y, [0, -wid, len * 0.75, -wid, len, 0, len * 0.75, wid, 0, wid], true), seg(x, y, len * 0.75, -wid, len * 0.75, wid)); };
const gemShapes: readonly DoodleShape[] = [
  { name: 'brilliant, top', draw: (u, v, _k, r) => { let d = m(ring(u, v, 0, 0, 0.58), poly(u, v, 0, 0, 0.3, 8)); if (r < 12) return min(d, rays(u, v, 0, 0, 0.3, 0.58, 8, -PI / 2)); for (let i = 0; i < 8; i++) { const a = -PI / 2 + i * PI / 4; d = min(d, seg(u, v, cos(a) * 0.3, sin(a) * 0.3, cos(a + PI / 8) * 0.58, sin(a + PI / 8) * 0.58), seg(u, v, cos(a) * 0.3, sin(a) * 0.3, cos(a - PI / 8) * 0.58, sin(a - PI / 8) * 0.58)); } return d; } },
  { name: 'brilliant, side', draw: (u, v) => m(path(u, v, [-0.62, -0.1, -0.35, -0.42, 0.35, -0.42, 0.62, -0.1, 0, 0.6], true), seg(u, v, -0.62, -0.1, 0.62, -0.1), seg(u, v, -0.35, -0.42, -0.2, -0.1), seg(u, v, 0.35, -0.42, 0.2, -0.1), seg(u, v, -0.2, -0.1, 0, 0.6), seg(u, v, 0.2, -0.1, 0, 0.6), seg(u, v, 0, -0.42, 0, -0.1)) },
  { name: 'emerald cut', draw: (u, v) => m(path(u, v, emeraldOutline(1.2), true), path(u, v, emeraldOutline(0.7), true), seg(u, v, -0.6, -0.36, -0.35, -0.21), seg(u, v, 0.6, -0.36, 0.35, -0.21), seg(u, v, -0.6, 0.36, -0.35, 0.21), seg(u, v, 0.6, 0.36, 0.35, 0.21)) },
  { name: 'pear cut', draw: (u, v) => m(arc(u, v, 0, 0.18, 0.4, 0, PI), seg(u, v, 0.4, 0.18, 0, -0.62), seg(u, v, -0.4, 0.18, 0, -0.62), arc(u, v, 0, 0.18, 0.2, 0, PI), seg(u, v, 0.2, 0.18, 0, -0.25), seg(u, v, -0.2, 0.18, 0, -0.25), seg(u, v, 0, -0.62, 0, -0.25), seg(u, v, -0.4, 0.18, -0.2, 0.18), seg(u, v, 0.4, 0.18, 0.2, 0.18)) },
  { name: 'marquise', draw: (u, v) => m(lens(u, v, -0.68, 0, 0.68, 0, 0.3), lens(u, v, -0.38, 0, 0.38, 0, 0.16), seg(u, v, -0.68, 0, -0.38, 0), seg(u, v, 0.68, 0, 0.38, 0), seg(u, v, 0, -0.3, 0, -0.16), seg(u, v, 0, 0.3, 0, 0.16)) },
  { name: 'crystal column', draw: (u, v) => m(path(u, v, [-0.2, 0.58, -0.2, -0.3, 0, -0.66, 0.2, -0.3, 0.2, 0.58], true), seg(u, v, -0.07, 0.58, -0.07, -0.3), seg(u, v, 0.07, 0.58, 0.07, -0.3), seg(u, v, -0.07, -0.3, 0, -0.66), seg(u, v, 0.07, -0.3, 0, -0.66), seg(u, v, -0.2, -0.3, 0.2, -0.3)) },
  { name: 'cluster', draw: (u, v) => m(shard(u, v, -0.1, 0.55, -0.5 * PI, 1.15, 0.14), shard(u, v, -0.2, 0.5, -0.72 * PI, 0.7, 0.1), shard(u, v, 0.05, 0.55, -0.3 * PI, 0.75, 0.1), seg(u, v, -0.6, 0.6, 0.6, 0.6)) },
  { name: 'quartz point', draw: (u, v) => m(poly(u, v, 0, 0, 0.55, 6, 0), rays(u, v, 0, 0, 0, 0.55, 6, 0), poly(u, v, 0, 0, 0.2, 6, 0)) },
  { name: 'geode', draw: (u, v) => m(polar(u, v, 0, 0, (a) => 0.6 + 0.03 * sin(5 * a)), star(u, v, 0, 0, 0.42, 0.24, 9), polar(u, v, 0, 0, (a) => 0.5 + 0.02 * sin(7 * a), 18)) },
  { name: 'octahedron', draw: (u, v) => m(poly(u, v, 0, 0, 0.62, 4), seg(u, v, -0.62, 0, 0.62, 0), seg(u, v, 0, -0.62, 0.18, 0.05), seg(u, v, 0.18, 0.05, 0, 0.62), seg(u, v, -0.62, 0, 0.18, 0.05), seg(u, v, 0.62, 0, 0.18, 0.05)) },
  { name: 'prism', draw: (u, v) => m(poly(u, v, 0, 0.08, 0.5, 3), seg(u, v, -0.68, 0.05, -0.22, 0.05), seg(u, v, 0.22, 0.02, 0.68, -0.2), seg(u, v, 0.22, 0.06, 0.68, 0.0), seg(u, v, 0.22, 0.1, 0.68, 0.2)) },
  { name: 'raw crystal', draw: (u, v) => m(path(u, v, [-0.5, 0.2, -0.35, -0.45, 0.05, -0.62, 0.45, -0.25, 0.55, 0.3, 0.1, 0.55, -0.3, 0.5], true), seg(u, v, 0.05, -0.62, 0.05, 0.0), seg(u, v, -0.5, 0.2, 0.05, 0.0), seg(u, v, 0.55, 0.3, 0.05, 0.0), seg(u, v, 0.1, 0.55, 0.05, 0.0), seg(u, v, -0.35, -0.45, 0.05, 0.0)) },
  { name: 'trillion', draw: (u, v) => m(poly(u, v, 0, 0.05, 0.62, 3), poly(u, v, 0, 0.05, 0.3, 3, PI / 2), seg(u, v, 0, -0.57, 0, -0.25), seg(u, v, -0.54, 0.36, -0.26, 0.2), seg(u, v, 0.54, 0.36, 0.26, 0.2)) },
  { name: 'cushion', draw: (u, v) => m(rbox(u, v, 0, 0, 0.52, 0.48, 0.2), rbox(u, v, 0, 0, 0.3, 0.26, 0.1), seg(u, v, -0.42, -0.38, -0.25, -0.2), seg(u, v, 0.42, -0.38, 0.25, -0.2), seg(u, v, -0.42, 0.38, -0.25, 0.2), seg(u, v, 0.42, 0.38, 0.25, 0.2)) },
  { name: 'heart cut', draw: (u, v) => m(arc(u, v, -0.26, -0.18, 0.28, PI, 2 * PI), arc(u, v, 0.26, -0.18, 0.28, PI, 2 * PI), path(u, v, [-0.54, -0.15, 0, 0.6, 0.54, -0.15]), seg(u, v, 0, -0.18, 0, 0.6), seg(u, v, -0.26, -0.18, 0, 0.1), seg(u, v, 0.26, -0.18, 0, 0.1), seg(u, v, 0, -0.18, 0, 0.1)) },
  { name: 'cabochon', draw: (u, v) => m(arc(u, v, 0, 0.15, 0.55, PI, 2 * PI), seg(u, v, -0.55, 0.15, 0.55, 0.15), arc(u, v, 0, 0.15, 0.4, 1.15 * PI, 1.4 * PI), seg(u, v, -0.62, 0.3, 0.62, 0.3)) },
  { name: 'sparkle', draw: (u, v) => m(path(u, v, [-0.38, -0.05, -0.2, -0.26, 0.2, -0.26, 0.38, -0.05, 0, 0.38], true), seg(u, v, -0.38, -0.05, 0.38, -0.05), seg(u, v, -0.2, -0.26, -0.12, -0.05), seg(u, v, 0.2, -0.26, 0.12, -0.05), star(u, v, 0.5, -0.5, 0.16, 0.04, 4), star(u, v, -0.52, 0.32, 0.12, 0.03, 4), star(u, v, 0.45, 0.4, 0.09, 0.025, 4)) },
  { name: 'ring', draw: (u, v) => m(ring(u, v, 0, 0.18, 0.4), ring(u, v, 0, 0.18, 0.32), poly(u, v, 0, -0.32, 0.18, 4), seg(u, v, -0.18, -0.32, 0.18, -0.32), seg(u, v, -0.1, -0.22, -0.08, -0.12), seg(u, v, 0.1, -0.22, 0.08, -0.12)) },
  { name: 'crystal ball', draw: (u, v) => m(ring(u, v, 0, -0.08, 0.45), path(u, v, [-0.32, 0.5, -0.18, 0.4, 0.18, 0.4, 0.32, 0.5], true), arc(u, v, 0, -0.08, 0.32, 1.15 * PI, 1.4 * PI), dot(u, v, 0.12, 0.12, 0.03)) },
  { name: 'amethyst points', draw: (u, v) => m(path(u, v, [-0.62, 0.32, -0.45, -0.22, -0.3, 0.32, -0.1, -0.48, 0.1, 0.32, 0.3, -0.3, 0.62, 0.32]), seg(u, v, -0.45, -0.22, -0.42, 0.32), seg(u, v, -0.1, -0.48, -0.08, 0.32), seg(u, v, 0.3, -0.3, 0.32, 0.32), slab(u, v, 0, 0.42, 0.65, 0.08)) },
];

// ---------------------------------------------------------------- flowers
const petals = (u: number, v: number, cx: number, cy: number, n: number, len: number, wid: number, from = 0.12, a0 = -PI / 2) => {
  let d = Infinity;
  for (let i = 0; i < n; i++) { const a = a0 + i * 2 * PI / n; d = min(d, petal(u, v, cx + cos(a) * from, cy + sin(a) * from, a, len, wid)); }
  return d;
};
const flowerShapes: readonly DoodleShape[] = [
  { name: 'daisy', draw: (u, v) => m(ring(u, v, 0, 0, 0.16), petals(u, v, 0, 0, 8, 0.42, 0.18, 0.16)) },
  { name: 'tulip', draw: (u, v) => m(path(u, v, [-0.35, -0.1, -0.3, -0.55, -0.12, -0.32, 0, -0.6, 0.12, -0.32, 0.3, -0.55, 0.35, -0.1, 0.2, 0.15, -0.2, 0.15], true), seg(u, v, 0, 0.15, 0, 0.65), curve(u, v, (t) => [-0.4 * t * (1 - t) * 2 - 0.02, 0.62 - 0.5 * t], 6)) },
  { name: 'rose', draw: (u, v) => m(spiral(u, v, 0, -0.12, 0.38, 2.2, 0, 32), arc(u, v, 0, -0.1, 0.5, 0.15 * PI, 0.95 * PI), arc(u, v, 0.05, -0.12, 0.52, 1.1 * PI, 1.9 * PI), seg(u, v, 0, 0.4, 0, 0.66)) },
  { name: 'lotus', draw: (u, v) => m(lens(u, v, 0, 0.35, 0, -0.62, 0.18), lens(u, v, 0, 0.35, -0.42, -0.45, 0.14), lens(u, v, 0, 0.35, 0.42, -0.45, 0.14), lens(u, v, 0, 0.35, -0.62, -0.08, 0.1), lens(u, v, 0, 0.35, 0.62, -0.08, 0.1), seg(u, v, -0.68, 0.42, 0.68, 0.42), wave(u, v, -0.5, 0.5, 0.55, 0.03, 12, 0, 8)) },
  { name: 'lily', draw: (u, v) => m(path(u, v, [-0.42, -0.5, -0.15, 0.2, 0, 0.35, 0.15, 0.2, 0.42, -0.5]), arc(u, v, -0.5, -0.45, 0.15, 0.7 * PI, 1.6 * PI), arc(u, v, 0.5, -0.45, 0.15, 1.4 * PI, 2.3 * PI), seg(u, v, 0, 0.3, -0.12, -0.3), seg(u, v, 0, 0.3, 0.02, -0.35), seg(u, v, 0, 0.3, 0.15, -0.28), dot(u, v, -0.13, -0.33, 0.03), dot(u, v, 0.02, -0.38, 0.03), dot(u, v, 0.16, -0.31, 0.03), seg(u, v, 0, 0.35, 0, 0.66)) },
  { name: 'sunflower', draw: (u, v) => { let d = m(ring(u, v, 0, -0.05, 0.25), star(u, v, 0, -0.05, 0.58, 0.3, 12), seg(u, v, 0, 0.5, 0, 0.68)); for (let i = -2; i <= 2; i++) d = min(d, seg(u, v, -0.2, -0.05 + i * 0.09, 0.2, -0.05 + i * 0.09), seg(u, v, i * 0.09, -0.25, i * 0.09, 0.15)); return d; } },
  { name: 'bell flower', draw: (u, v) => m(path(u, v, [-0.3, -0.38, -0.33, 0.1, -0.42, 0.32, -0.15, 0.2, 0, 0.36, 0.15, 0.2, 0.42, 0.32, 0.33, 0.1, 0.3, -0.38]), arc(u, v, 0, -0.38, 0.3, PI, 2 * PI), curve(u, v, (t) => [-0.4 * t, -0.68 + 0.3 * t * t], 6)) },
  { name: 'five petals', draw: (u, v) => m(petals(u, v, 0, 0, 5, 0.48, 0.3, 0.1), dot(u, v, 0, 0, 0.07)) },
  { name: 'bud', draw: (u, v) => m(lens(u, v, 0, 0.2, 0, -0.6, 0.22), seg(u, v, 0, 0.2, -0.32, -0.2), seg(u, v, 0, 0.2, 0.32, -0.2), seg(u, v, 0, 0.2, 0, 0.66), seg(u, v, 0, 0.12, 0, -0.45)) },
  { name: 'stem with leaves', draw: (u, v) => m(seg(u, v, 0.1, -0.65, -0.1, 0.65), lens(u, v, 0.03, -0.2, -0.42, -0.45, 0.1), lens(u, v, -0.02, 0.1, 0.42, -0.12, 0.1), lens(u, v, -0.07, 0.4, -0.42, 0.22, 0.09)) },
  { name: 'clover', draw: (u, v) => { let d = seg(u, v, 0, 0.1, 0.12, 0.65); for (let i = 0; i < 3; i++) { const a = -PI / 2 + i * 2 * PI / 3; d = min(d, polar(u, v, cos(a) * 0.28, sin(a) * 0.28, (b) => 0.25 - 0.06 * max(0, cos(b - a - PI)), 16)); } return d; } },
  { name: 'dandelion', draw: (u, v) => { let d = m(ring(u, v, 0, -0.12, 0.12), seg(u, v, 0, 0.0, 0, 0.66), rays(u, v, 0, -0.12, 0.15, 0.48, 12, 0.1)); for (let i = 0; i < 12; i++) { const a = 0.1 + i * PI / 6; d = min(d, dot(u, v, cos(a) * 0.52, -0.12 + sin(a) * 0.52, 0.035)); } return d; } },
  { name: 'fern', draw: (u, v) => { let d = curve(u, v, (t) => [0.3 - 0.5 * t - 0.15 * t * t, 0.62 - 1.25 * t], 8); for (let i = 0; i < 7; i++) { const t = 0.1 + i * 0.12, x = 0.3 - 0.5 * t - 0.15 * t * t, y = 0.62 - 1.25 * t, l = 0.26 - i * 0.03; d = min(d, seg(u, v, x, y, x - l, y - l * 0.5), seg(u, v, x, y, x + l, y - l * 0.35)); } return d; } },
  { name: 'poppy', draw: (u, v) => m(petals(u, v, 0, -0.05, 4, 0.5, 0.42, 0.06, -PI / 4), ring(u, v, 0, -0.05, 0.1), dot(u, v, -0.14, -0.08, 0.025), dot(u, v, 0.14, -0.02, 0.025), dot(u, v, 0.02, 0.1, 0.025), seg(u, v, 0, 0.3, 0.05, 0.68)) },
  { name: 'iris', draw: (u, v) => m(lens(u, v, 0, 0.05, 0, -0.62, 0.14), lens(u, v, 0, 0.05, -0.38, -0.45, 0.11), lens(u, v, 0, 0.05, 0.38, -0.45, 0.11), curve(u, v, (t) => [-0.1 - 0.45 * t, 0.05 + 0.5 * t - 0.3 * t * t], 6), curve(u, v, (t) => [0.1 + 0.45 * t, 0.05 + 0.5 * t - 0.3 * t * t], 6), seg(u, v, 0, 0.1, 0, 0.66)) },
  { name: 'cherry blossom', draw: (u, v) => { let d = Infinity; for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * 2 * PI / 5; d = min(d, polar(u, v, cos(a) * 0.3, sin(a) * 0.3, (b) => 0.2 - 0.07 * max(0, cos(b - a)) ** 6, 14), seg(u, v, cos(a) * 0.08, sin(a) * 0.08, cos(a + 0.3) * 0.2, sin(a + 0.3) * 0.2)); } return min(d, dot(u, v, 0, 0, 0.04)); } },
  { name: 'tendril', draw: (u, v) => m(curve(u, v, (t) => [-0.1 + 0.3 * sin(2 * t), 0.65 - 1.1 * t], 10), spiral(u, v, 0.32, -0.38, 0.22, 1.4, PI, 14), spiral(u, v, -0.42, 0.05, 0.16, 1.2, 0, 12), seg(u, v, -0.42, 0.05, -0.15, 0.1)) },
  { name: 'thistle', draw: (u, v) => m(path(u, v, [-0.25, -0.05, -0.3, 0.2, 0, 0.3, 0.3, 0.2, 0.25, -0.05], true), rays(u, v, 0, 0.05, 0.25, 0.6, 9, -0.95 * PI), seg(u, v, 0, 0.3, 0, 0.68), seg(u, v, -0.25, 0.08, 0.25, 0.08), seg(u, v, -0.15, 0.2, 0.15, 0.2)) },
  { name: 'daffodil', draw: (u, v) => m(petals(u, v, 0, -0.05, 6, 0.42, 0.2, 0.2), ring(u, v, 0, -0.05, 0.2), star(u, v, 0, -0.05, 0.24, 0.19, 8), seg(u, v, 0, 0.38, 0, 0.68)) },
  { name: 'snowdrop', draw: (u, v) => m(curve(u, v, (t) => [-0.3 + 0.5 * sin(1.5 * t), 0.65 - 1.1 * t], 8), lens(u, v, 0.2, -0.3, 0.1, 0.25, 0.1), lens(u, v, 0.2, -0.3, 0.35, 0.2, 0.09), lens(u, v, 0.2, -0.3, -0.12, 0.15, 0.09), dot(u, v, 0.2, -0.32, 0.04), lens(u, v, -0.3, 0.65, -0.55, -0.1, 0.07)) },
  { name: 'vine', draw: (u, v) => m(wave(u, v, -0.68, 0.68, 0.05, 0.18, 4, 0, 16), lens(u, v, -0.5, -0.05, -0.3, -0.48, 0.09), lens(u, v, 0.05, 0.15, 0.3, 0.55, 0.09), lens(u, v, 0.45, -0.1, 0.4, -0.55, 0.08), dot(u, v, -0.2, 0.3, 0.04)) },
];

// ---------------------------------------------------------------- sacred geometry
/** Centres of a hexagonal lattice of spacing s within radius `within` of the origin. */
const hexLattice = (s: number, within: number) => {
  const centres: [number, number][] = [];
  for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) { const x = s * (q + r / 2), y = s * r * Math.sqrt(3) / 2; if (hypot(x, y) <= within + 1e-6) centres.push([x, y]); }
  return centres;
};
const SEED_OF_LIFE = hexLattice(0.28, 0.29), FLOWER_OF_LIFE = hexLattice(0.21, 0.43);
const ringsAt = (u: number, v: number, centres: readonly [number, number][], rad: number) => { let d = Infinity; for (const [x, y] of centres) d = min(d, ring(u, v, x, y, rad)); return d; };
const corners = (n: number, rad: number, a0 = -PI / 2, cx = 0, cy = 0): [number, number][] => Array.from({ length: n }, (_, i) => [cx + cos(a0 + i * 2 * PI / n) * rad, cy + sin(a0 + i * 2 * PI / n) * rad]);
/** Lines joining every corner to every `skip`-th next corner. */
const starLines = (u: number, v: number, pts: readonly [number, number][], skip: number) => { let d = Infinity; for (let i = 0; i < pts.length; i++) { const j = (i + skip) % pts.length; d = min(d, seg(u, v, pts[i][0], pts[i][1], pts[j][0], pts[j][1])); } return d; };
const TREE_OF_LIFE: [number, number][] = [[0, -0.64], [0.3, -0.44], [-0.3, -0.44], [0.3, -0.1], [-0.3, -0.1], [0, 0.06], [0.3, 0.24], [-0.3, 0.24], [0, 0.4], [0, 0.66]];
const TREE_PATHS = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 6], [4, 7], [5, 6], [5, 7], [6, 7], [6, 8], [7, 8], [5, 8], [8, 9]];
const sacredShapes: readonly DoodleShape[] = [
  { name: 'seed of life', draw: (u, v) => m(ringsAt(u, v, SEED_OF_LIFE, 0.28), ring(u, v, 0, 0, 0.58)) },
  { name: 'flower of life', draw: (u, v, _k, r) => (r < 15 ? m(ringsAt(u, v, SEED_OF_LIFE, 0.28), ring(u, v, 0, 0, 0.58)) : m(ringsAt(u, v, FLOWER_OF_LIFE, 0.21), ring(u, v, 0, 0, 0.65))) },
  { name: 'vesica piscis', draw: (u, v) => m(ring(u, v, -0.2, 0, 0.42), ring(u, v, 0.2, 0, 0.42), seg(u, v, 0, -0.37, 0, 0.37), seg(u, v, -0.62, 0, 0.62, 0)) },
  { name: 'Metatron’s cube', draw: (u, v, _k, r) => { const inner = corners(6, 0.3, -PI / 2), outer = corners(6, 0.6, -PI / 2); let d = m(ring(u, v, 0, 0, 0.1), ringsAt(u, v, inner, 0.1), ringsAt(u, v, outer, 0.1), starLines(u, v, outer, 1), starLines(u, v, outer, 2), rays(u, v, 0, 0, 0, 0.6, 6, -PI / 2)); if (r >= 14) for (let i = 0; i < 6; i++) d = min(d, seg(u, v, inner[i][0], inner[i][1], outer[(i + 2) % 6][0], outer[(i + 2) % 6][1]), seg(u, v, inner[i][0], inner[i][1], outer[(i + 4) % 6][0], outer[(i + 4) % 6][1])); return d; } },
  { name: 'hexagram', draw: (u, v) => m(poly(u, v, 0, 0, 0.6, 3), poly(u, v, 0, 0, 0.6, 3, PI / 2), ring(u, v, 0, 0, 0.62)) },
  { name: 'pentagram', draw: (u, v) => m(starLines(u, v, corners(5, 0.6), 2), ring(u, v, 0, 0, 0.62)) },
  { name: 'yantra', draw: (u, v) => m(ring(u, v, 0, 0, 0.65), poly(u, v, 0, 0.1, 0.55, 3), poly(u, v, 0, -0.08, 0.5, 3, PI / 2), poly(u, v, 0, 0.0, 0.32, 3), poly(u, v, 0, 0.02, 0.28, 3, PI / 2), poly(u, v, 0, 0.04, 0.12, 3), dot(u, v, 0, 0, 0.03), petals(u, v, 0, 0, 8, 0.2, 0.1, 0.58)) },
  { name: 'torus', draw: (u, v) => m(oval(u, v, 0, 0, 0.62, 0.26), oval(u, v, 0, 0, 0.47, 0.19), oval(u, v, 0, 0, 0.32, 0.13), oval(u, v, 0, 0, 0.16, 0.07), oval(u, v, 0, 0, 0.14, 0.62)) },
  { name: 'golden spiral', draw: (u, v) => m(curve(u, v, (t) => { const a = t * 3.2 * PI, r = 0.05 * Math.exp(0.3063 * a) * 0.52; return [0.08 + cos(a) * r, 0.05 + sin(a) * r]; }, 40), box(u, v, 0, 0, 0.65, 0.4), seg(u, v, -0.15, -0.4, -0.15, 0.4), seg(u, v, -0.15, -0.1, 0.65, -0.1)) },
  { name: 'merkaba', draw: (u, v) => { const up = corners(3, 0.6), down = corners(3, 0.6, PI / 2); return m(poly(u, v, 0, 0, 0.6, 3), poly(u, v, 0, 0, 0.6, 3, PI / 2), seg(u, v, up[0][0], up[0][1], 0, 0), seg(u, v, up[1][0], up[1][1], 0, 0), seg(u, v, up[2][0], up[2][1], 0, 0), seg(u, v, down[0][0], down[0][1], 0, 0)); } },
  { name: 'tree of life', draw: (u, v) => { let d = Infinity; for (const [x, y] of TREE_OF_LIFE) d = min(d, ring(u, v, x, y, 0.09)); for (const [a, b] of TREE_PATHS) d = min(d, seg(u, v, TREE_OF_LIFE[a][0], TREE_OF_LIFE[a][1], TREE_OF_LIFE[b][0], TREE_OF_LIFE[b][1])); return d; } },
  { name: 'circle, square, triangle', draw: (u, v) => m(ring(u, v, 0, 0, 0.62), box(u, v, 0, 0, 0.44, 0.44), poly(u, v, 0, 0.08, 0.42, 3)) },
  { name: 'enneagram', draw: (u, v) => { const pts = corners(9, 0.6); return m(ring(u, v, 0, 0, 0.62), poly(u, v, 0, 0, 0.6, 3), seg(u, v, pts[1][0], pts[1][1], pts[4][0], pts[4][1]), seg(u, v, pts[4][0], pts[4][1], pts[2][0], pts[2][1]), seg(u, v, pts[2][0], pts[2][1], pts[8][0], pts[8][1]), seg(u, v, pts[8][0], pts[8][1], pts[5][0], pts[5][1]), seg(u, v, pts[5][0], pts[5][1], pts[7][0], pts[7][1]), seg(u, v, pts[7][0], pts[7][1], pts[1][0], pts[1][1])); } },
  { name: 'triquetra', draw: (u, v) => m(petal(u, v, 0, 0, -PI / 2, 0.92, 0.5), petal(u, v, 0, 0, PI / 6, 0.92, 0.5), petal(u, v, 0, 0, 5 * PI / 6, 0.92, 0.5), ring(u, v, 0, 0, 0.36)) },
  { name: 'eye in triangle', draw: (u, v) => m(poly(u, v, 0, 0.08, 0.64, 3), almond(u, v, 0, 0.15, 0.32, 0.16), rays(u, v, 0, 0.08, 0.66, 0.78, 9, -PI / 2 - 0.4)) },
  { name: 'labyrinth', draw: (u, v) => m(arc(u, v, 0, 0, 0.62, 0.6, 0.6 + 1.8 * PI), arc(u, v, 0, 0, 0.47, 2.4, 2.4 + 1.8 * PI), arc(u, v, 0, 0, 0.32, 4.6, 4.6 + 1.8 * PI), arc(u, v, 0, 0, 0.17, 1.2, 1.2 + 1.7 * PI), dot(u, v, 0, 0, 0.04)) },
  { name: 'yin yang', draw: (u, v) => m(ring(u, v, 0, 0, 0.6), arc(u, v, 0, -0.3, 0.3, 0.5 * PI, 1.5 * PI), arc(u, v, 0, 0.3, 0.3, -0.5 * PI, 0.5 * PI), dot(u, v, 0, -0.3, 0.09), ring(u, v, 0, 0.3, 0.09)) },
  { name: 'triskelion', draw: (u, v) => m(spiral(u, v, 0, 0, 0.6, 0.85, 0, 16), spiral(u, v, 0, 0, 0.6, 0.85, 2 * PI / 3, 16), spiral(u, v, 0, 0, 0.6, 0.85, 4 * PI / 3, 16), ring(u, v, 0, 0, 0.64)) },
  { name: 'mandala', draw: (u, v) => m(ring(u, v, 0, 0, 0.62), ring(u, v, 0, 0, 0.42), ring(u, v, 0, 0, 0.2), petals(u, v, 0, 0, 8, 0.2, 0.12, 0.3), rays(u, v, 0, 0, 0.44, 0.6, 16), dot(u, v, 0, 0, 0.05)) },
  { name: 'sun cross', draw: (u, v) => m(ring(u, v, 0, 0, 0.58), ring(u, v, 0, 0, 0.2), seg(u, v, 0, -0.66, 0, 0.66), seg(u, v, -0.66, 0, 0.66, 0)) },
  { name: 'ouroboros', draw: (u, v) => { let d = m(arc(u, v, 0, 0, 0.5, -0.32 * PI, 1.5 * PI), blob(u, v, 0.02, -0.5, 0.15, 0.1), dot(u, v, 0.08, -0.53, 0.025)); for (let i = 0; i < 10; i++) { const a = -0.2 * PI + i * 0.16 * PI; d = min(d, seg(u, v, cos(a) * 0.46, sin(a) * 0.46, cos(a) * 0.54, sin(a) * 0.54)); } return d; } },
  { name: 'cube', draw: (u, v) => { const pts = corners(6, 0.58); return m(poly(u, v, 0, 0, 0.58, 6), seg(u, v, 0, 0, pts[0][0], pts[0][1]), seg(u, v, 0, 0, pts[2][0], pts[2][1]), seg(u, v, 0, 0, pts[4][0], pts[4][1])); } },
  { name: 'lemniscate', draw: (u, v) => m(curve(u, v, (t) => { const a = t * 2 * PI, s = sin(a), c = cos(a), k = 1 + s * s; return [0.66 * c / k, 0.66 * s * c / k]; }, 32, true), dot(u, v, 0, 0, 0.04)) },
  { name: 'dodecahedron', draw: (u, v) => { const outer = corners(5, 0.62), inner = corners(5, 0.3, PI / 2); let d = m(poly(u, v, 0, 0, 0.62, 5), poly(u, v, 0, 0, 0.3, 5, PI / 2)); for (let i = 0; i < 5; i++) d = min(d, seg(u, v, outer[i][0], outer[i][1], inner[(i + 3) % 5][0], inner[(i + 3) % 5][1])); return d; } },
];

// ---------------------------------------------------------------- contours
/**
 * Lines of a field every `step` (in units, widened so the lines sit at least 4.5 px apart in a cell of reach r),
 * inked only where `within` holds; `grad` is the field's gradient size there.
 */
const spacing = (step: number, r: number) => max(step, 4.5 / max(1, r));
const contour = (f: number, step: number, grad = 1, within = true) => (within ? iso(f, step) / max(0.25, grad) : Infinity);
const contourShapes: readonly DoodleShape[] = [
  { name: 'island', draw: (u, v, k, r) => { const a = atan2(v, u), d = hypot(u, v); const f = d * (1 + 0.22 * sin(3 * a + 2 * PI * k) + 0.1 * sin(5 * a - k)); return contour(f, spacing(0.13, r), 1.1, f < 0.78); } },
  { name: 'two peaks', draw: (u, v, k, r) => { const f = min(hypot(u - 0.28, v - 0.18 + 0.2 * k), hypot(u + 0.28, v + 0.22 - 0.2 * k)); return contour(f, spacing(0.12, r), 1, f < 0.5); } },
  { name: 'saddle', draw: (u, v, k, r) => { const [x, y] = rot(u, v, k * PI / 2); return contour(x * x - y * y, spacing(0.16, r), 2 * hypot(x, y), hypot(x, y) < 0.78); } },
  { name: 'isobars', draw: (u, v, k, r) => contour(v + 0.22 * sin(3.2 * u + 2 * PI * k) + 0.08 * sin(7 * u + k), spacing(0.17, r), 1, abs(u) < 0.75 && abs(v) < 0.75) },
  { name: 'whorl', draw: (u, v, k, r) => { const d = hypot(u, v), a = atan2(v, u), step = spacing(0.13, r); return contour(d - step * a / (2 * PI) + 0.02 * sin(4 * a + 6 * k), step, 1, d < 0.78); } },
  { name: 'ripples', draw: (u, v, k, r) => { const f = hypot(u - 0.5 + 0.3 * k, v + 0.5 - 0.2 * k); return contour(f, spacing(0.15, r), 1, f < 1.35); } },
  { name: 'wood grain', draw: (u, v, k, r) => { const f = hypot(u / 1.7, v) + 0.05 * sin(9 * u + 3 * v + 6 * k) + 0.03 * sin(17 * v); return contour(f, spacing(0.14, r), 1, f < 0.72); } },
  { name: 'cross contour', draw: (u, v, k, r) => contour(v + (0.3 + 0.2 * k) * u * u, spacing(0.16, r), 1, hypot(u, v) < 0.78) },
  { name: 'terraces', draw: (u, v, k, r) => { const a = atan2(v, u), f = hypot(u, v) * (1 + 0.1 * sin(4 * a + 2 * PI * k)), step = spacing(0.12, r); if (f > 0.78) return Infinity; const d = iso(f, step); return Math.round(f / step) % 3 === 0 ? max(0, d - 0.03) : d; } },
  { name: 'peanut', draw: (u, v, k, r) => { const d1 = hypot(u - 0.26, v - 0.1 * k), d2 = hypot(u + 0.26, v + 0.1 * k), f = -Math.log(Math.exp(-8 * d1) + Math.exp(-8 * d2)) / 8; return contour(f, spacing(0.12, r), 1, f < 0.5); } },
  { name: 'nested rounds', draw: (u, v, k, r) => { const [x, y] = rot(u, v, (k - 0.5) * 0.6); const dx = abs(x) - 0.2, dy = abs(y) - 0.08; const sd = hypot(max(dx, 0), max(dy, 0)) + min(max(dx, dy), 0); return contour(sd, spacing(0.14, r), 1, sd < 0.58); } },
  { name: 'hand-drawn stack', draw: (u, v, k, r) => contour(v + 0.1 * sin(5 * u + 2 * PI * k) + 0.15 * (k - 0.5) * u, spacing(0.14, r), 1, abs(u) < 0.7 && abs(v) < 0.7) },
  { name: 'crosshatch contours', draw: (u, v, k, r) => min(contour(v + 0.3 * u * u, spacing(0.2, r), 1, hypot(u, v) < 0.78), contour(u - (0.2 + 0.3 * k) * v * v, spacing(0.2, r), 1, hypot(u, v) < 0.78)) },
  { name: 'offset bullseye', draw: (u, v, k, r) => { const a = atan2(v + 0.1, u - 0.15), f = hypot(u - 0.15, v + 0.1) * (1 + 0.12 * sin(2 * a + 4 * k)); return contour(f, spacing(0.11, r), 1, f < 0.6); } },
  { name: 'figure eight', draw: (u, v, k, r) => { const d1 = hypot(u - 0.05 * k, v - 0.28), d2 = hypot(u + 0.05 * k, v + 0.28), f = -Math.log(Math.exp(-9 * d1) + Math.exp(-9 * d2)) / 9; return contour(f, spacing(0.11, r), 1, f < 0.42); } },
  { name: 'sea and shore', draw: (u, v, k, r) => { const f = v + 0.25 * sin(2.5 * u + 2 * PI * k) + 0.1 * sin(6 * u); if (abs(u) > 0.75 || abs(v) > 0.75) return Infinity; return f < 0 ? contour(f, spacing(0.15, r)) : min(contour(f, spacing(0.3, r)), abs(f) < 0.03 ? 0 : Infinity); } },
];

// ---------------------------------------------------------------- fractals (polylines built once, fitted to the cell)
/** Scale and centre a flat polyline so its longer side spans `span`. */
const fitted = (pts: number[], span = 1.24): number[] => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) { x0 = min(x0, pts[i]); x1 = max(x1, pts[i]); y0 = min(y0, pts[i + 1]); y1 = max(y1, pts[i + 1]); }
  const s = span / max(x1 - x0, y1 - y0, 1e-9), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return pts.map((p, i) => (i % 2 ? (p - cy) * s : (p - cx) * s));
};
/** Replace every segment of a closed or open polyline by the Koch motif, `times` over. */
const kochify = (pts: number[], times: number, closed: boolean): number[] => {
  let out = pts;
  for (let n = 0; n < times; n++) {
    const next: number[] = [];
    const count = out.length / 2;
    for (let i = 0; i < (closed ? count : count - 1); i++) {
      const ax = out[i * 2], ay = out[i * 2 + 1], bx = out[((i + 1) % count) * 2], by = out[((i + 1) % count) * 2 + 1];
      const dx = (bx - ax) / 3, dy = (by - ay) / 3, mx = ax + dx * 1.5, my = ay + dy * 1.5;
      const px = mx - dy * Math.sqrt(3) / 2, py = my + dx * Math.sqrt(3) / 2;
      next.push(ax, ay, ax + dx, ay + dy, px, py, ax + 2 * dx, ay + 2 * dy);
    }
    if (!closed) next.push(out[out.length - 2], out[out.length - 1]);
    out = next;
  }
  return out;
};
const KOCH_SNOWFLAKE = fitted(kochify([0, -1, 0.866, 0.5, -0.866, 0.5], 2, true));
const KOCH_CURVE = fitted(kochify([-1, 0, 1, 0], 3, false));
const foldCurve = (folds: number, dragon: boolean) => {
  // The dragon curve folds alternate; the Lévy C curve always turns the same way.
  let turns: number[] = [];
  for (let n = 0; n < folds; n++) turns = dragon ? [...turns, 1, ...turns.map((t) => -t).reverse()] : [...turns.map(() => 1), 1, ...turns.map(() => 1)];
  const pts = [0, 0]; let x = 0, y = 0, dx = 1, dy = 0;
  const step = () => { x += dx; y += dy; pts.push(x, y); };
  step();
  for (const t of turns) { [dx, dy] = t > 0 ? [-dy, dx] : [dy, -dx]; step(); }
  return fitted(pts);
};
const DRAGON = foldCurve(6, true);
const LEVY_C = (() => { // the C curve: each segment becomes two at right angles, bulging the same way
  let pts = [-1, 0, 1, 0];
  for (let n = 0; n < 6; n++) { const next: number[] = [pts[0], pts[1]]; for (let i = 2; i < pts.length; i += 2) { const ax = pts[i - 2], ay = pts[i - 1], bx = pts[i], by = pts[i + 1]; next.push((ax + bx) / 2 - (by - ay) / 2, (ay + by) / 2 + (bx - ax) / 2, bx, by); } pts = next; }
  return fitted(pts);
})();
const HILBERT = (() => {
  const order = 3, n = 1 << order, pts: number[] = [];
  for (let d = 0; d < n * n; d++) {
    let x = 0, y = 0, t = d;
    for (let s = 1; s < n; s *= 2) { const rx = 1 & (t >> 1), ry = 1 & (t ^ rx); if (!ry) { if (rx) { x = s - 1 - x; y = s - 1 - y; } [x, y] = [y, x]; } x += s * rx; y += s * ry; t >>= 2; }
    pts.push(x, y);
  }
  return fitted(pts);
})();
const polylines = (u: number, v: number, lines: readonly number[][]) => { let d = Infinity; for (const line of lines) d = min(d, path(u, v, line)); return d; };
const hTree = (depth: number): number[][] => {
  const lines: number[][] = [];
  const grow = (x: number, y: number, l: number, level: number) => {
    lines.push([x - l, y, x + l, y], [x - l, y - l, x - l, y + l], [x + l, y - l, x + l, y + l]);
    if (level < depth) for (const [sx, sy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) grow(x + sx * l, y + sy * l, l / 2, level + 1);
  };
  grow(0, 0, 0.3, 1);
  return lines;
};
const H_TREE = hTree(3);
const SIERPINSKI = (() => {
  const tris: number[][] = [];
  const split = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, level: number) => {
    if (level === 0) { tris.push([ax, ay, bx, by, cx, cy, ax, ay]); return; }
    const abx = (ax + bx) / 2, aby = (ay + by) / 2, bcx = (bx + cx) / 2, bcy = (by + cy) / 2, cax = (cx + ax) / 2, cay = (cy + ay) / 2;
    split(ax, ay, abx, aby, cax, cay, level - 1); split(abx, aby, bx, by, bcx, bcy, level - 1); split(cax, cay, bcx, bcy, cx, cy, level - 1);
  };
  split(0, -0.62, 0.62 * 0.866 * 1.15, 0.5 * 0.62 + 0.1, -0.62 * 0.866 * 1.15, 0.5 * 0.62 + 0.1, 2);
  return tris;
})();
const PYTHAGORAS = (() => {
  const squares: number[][] = [];
  const grow = (x: number, y: number, dx: number, dy: number, level: number) => {
    // A square on the base from (x, y) along (dx, dy); its far side bears two tilted children.
    const nx = dy, ny = -dx;
    const ax = x, ay = y, bx = x + dx, by = y + dy, cx = bx + nx, cy = by + ny, ex = ax + nx, ey = ay + ny;
    squares.push([ax, ay, bx, by, cx, cy, ex, ey, ax, ay]);
    if (level === 0) return;
    const tx = (ex + cx) / 2 + nx * 0.5, ty = (ey + cy) / 2 + ny * 0.5;
    grow(ex, ey, tx - ex, ty - ey, level - 1); grow(tx, ty, cx - tx, cy - ty, level - 1);
  };
  grow(-0.17, 0.62, 0.34, 0, 3);
  return squares;
})();
const branchTree = (u: number, v: number, x: number, y: number, a: number, l: number, depth: number, spread: number, shrink: number, lean: number): number => {
  const x1 = x + cos(a) * l, y1 = y + sin(a) * l;
  let d = seg(u, v, x, y, x1, y1);
  if (depth > 0 && hypot(u - x1, v - y1) < l * 3.2) d = min(d, branchTree(u, v, x1, y1, a - spread + lean, l * shrink, depth - 1, spread, shrink, lean), branchTree(u, v, x1, y1, a + spread + lean, l * shrink, depth - 1, spread, shrink, lean));
  return d;
};
const APOLLONIAN = (() => {
  const R = 0.64, r = R * (2 * Math.sqrt(3) - 3), d = R - r, circles: [number, number, number][] = [[0, 0, R]];
  for (let i = 0; i < 3; i++) circles.push([cos(-PI / 2 + i * 2 * PI / 3) * d, sin(-PI / 2 + i * 2 * PI / 3) * d, r]);
  circles.push([0, 0, R - 2 * r]);
  // The three outer gaps: a circle tangent to the outer ring and two inner ones, found by bisection.
  for (let i = 0; i < 3; i++) {
    const a = -PI / 2 + PI / 3 + i * 2 * PI / 3;
    let lo = 0, hi = r;
    for (let n = 0; n < 30; n++) { const rho = (lo + hi) / 2, dist = R - rho, gap = hypot(cos(a) * dist - cos(a - PI / 3) * d, sin(a) * dist - sin(a - PI / 3) * d) - r - rho; if (gap > 0) lo = rho; else hi = rho; }
    circles.push([cos(a) * (R - lo), sin(a) * (R - lo), lo]);
  }
  return circles;
})();
/** Distance to the boundary of a Mandelbrot or Julia set by the distance estimate, 0 inside. */
const escapeDistance = (zr: number, zi: number, cr: number, ci: number, scale: number) => {
  let dr = 1, di = 0, escaped = false;
  for (let n = 0; n < 48; n++) {
    const ndr = 2 * (zr * dr - zi * di) + (scale > 0 ? 1 : 0), ndi = 2 * (zr * di + zi * dr);
    dr = ndr; di = ndi;
    const nr = zr * zr - zi * zi + cr, ni = 2 * zr * zi + ci;
    zr = nr; zi = ni;
    if (zr * zr + zi * zi > 1e8) { escaped = true; break; }
  }
  if (!escaped) return 0;
  const mag = hypot(zr, zi);
  return 0.5 * mag * Math.log(mag) / max(1e-9, hypot(dr, di)) / abs(scale);
};
const fractalShapes: readonly DoodleShape[] = [
  { name: 'Koch snowflake', draw: (u, v) => path(u, v, KOCH_SNOWFLAKE, true) },
  { name: 'Sierpinski triangle', draw: (u, v) => polylines(u, v, SIERPINSKI) },
  { name: 'H-tree', draw: (u, v) => polylines(u, v, H_TREE) },
  { name: 'dragon curve', draw: (u, v) => path(u, v, DRAGON) },
  { name: 'Hilbert curve', draw: (u, v) => path(u, v, HILBERT) },
  { name: 'binary tree', draw: (u, v, k) => branchTree(u, v, 0, 0.66, -PI / 2, 0.42, 5, 0.3 + 0.3 * k, 0.68, (k - 0.5) * 0.2) },
  { name: 'Cantor bars', draw: (u, v) => { let d = Infinity; const bar = (x0: number, x1: number, level: number) => { d = min(d, slab(u, v, (x0 + x1) / 2, -0.5 + level * 0.3, (x1 - x0) / 2, 0.06)); if (level < 3) { bar(x0, x0 + (x1 - x0) / 3, level + 1); bar(x1 - (x1 - x0) / 3, x1, level + 1); } }; bar(-0.64, 0.64, 0); return d; } },
  { name: 'Vicsek cross', draw: (u, v, _k, r) => { const crossAt = (cx: number, cy: number, s: number) => path(u, v, [cx - s / 2, cy - s * 1.5, cx + s / 2, cy - s * 1.5, cx + s / 2, cy - s / 2, cx + s * 1.5, cy - s / 2, cx + s * 1.5, cy + s / 2, cx + s / 2, cy + s / 2, cx + s / 2, cy + s * 1.5, cx - s / 2, cy + s * 1.5, cx - s / 2, cy + s / 2, cx - s * 1.5, cy + s / 2, cx - s * 1.5, cy - s / 2, cx - s / 2, cy - s / 2], true); if (r < 14) return crossAt(0, 0, 0.42); let d = Infinity; for (const [ox, oy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) d = min(d, crossAt(ox * 0.42, oy * 0.42, 0.14)); return d; } },
  { name: 'Sierpinski carpet', draw: (u, v) => { let d = box(u, v, 0, 0, 0.63, 0.63); const hole = (cx: number, cy: number, s: number, level: number) => { d = min(d, box(u, v, cx, cy, s / 2, s / 2)); if (level === 0) return; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (i || j) hole(cx + i * s, cy + j * s, s / 3, level - 1); }; hole(0, 0, 0.42, 1); return d; } },
  { name: 'Lévy C curve', draw: (u, v) => path(u, v, LEVY_C) },
  { name: 'Pythagoras tree', draw: (u, v) => polylines(u, v, PYTHAGORAS) },
  { name: 'spiral of spirals', draw: (u, v) => { let d = spiral(u, v, 0, 0, 0.62, 1.6, 0, 32); for (let i = 0; i < 4; i++) { const t = 0.45 + i * 0.17, a = t * 1.6 * 2 * PI; d = min(d, spiral(u, v, cos(a) * 0.62 * t, sin(a) * 0.62 * t, 0.14, 1.2, a + PI, 10)); } return d; } },
  { name: 'dendrite', draw: (u, v, k) => min(branchTree(u, v, 0, 0.66, -PI / 2 + (k - 0.5) * 0.3, 0.35, 4, 0.55 + 0.2 * k, 0.6, 0), branchTree(u, v, 0, 0.3, -PI / 2 - 0.9 + k * 0.4, 0.22, 3, 0.5, 0.6, 0)) },
  { name: 'fractal fern', draw: (u, v) => { let d = seg(u, v, 0.05, 0.66, -0.05, -0.62); for (let i = 0; i < 7; i++) { const t = (i + 0.5) / 7.5, x = 0.05 - 0.1 * t, y = 0.66 - 1.28 * t, l = 0.34 * (1 - t * 0.8); for (const s of [-1, 1]) { const ex = x + s * l, ey = y - l * 0.45; d = min(d, seg(u, v, x, y, ex, ey)); for (let j = 1; j <= 3; j++) { const q = j / 4, px = x + (ex - x) * q, py = y + (ey - y) * q, pl = l * 0.3 * (1 - q * 0.6); d = min(d, seg(u, v, px, py, px + s * pl * 0.5, py - pl), seg(u, v, px, py, px + s * pl * 0.9, py + pl * 0.5)); } } } return d; } },
  { name: 'Koch curve', draw: (u, v) => path(u, v, KOCH_CURVE) },
  { name: 'hexaflake', draw: (u, v) => { let d = poly(u, v, 0, 0, 0.64, 6, 0); for (let i = 0; i < 7; i++) { const a = i * PI / 3, x = i === 6 ? 0 : cos(a) * 0.43, y = i === 6 ? 0 : sin(a) * 0.43; d = min(d, poly(u, v, x, y, 0.21, 6, 0)); } return d; } },
  { name: 'Apollonian gasket', draw: (u, v) => { let d = Infinity; for (const [x, y, r] of APOLLONIAN) d = min(d, ring(u, v, x, y, r)); return d; } },
  { name: 'Mandelbrot set', draw: (u, v) => escapeDistance(0, 0, -0.62 + u * 1.3, v * 1.3, 1.3) },
  { name: 'Julia set', draw: (u, v, k) => escapeDistance(u * 1.9, v * 1.9, -0.75 + 0.06 * k, 0.12 + 0.1 * k, -1.9) || Infinity },
];

// ---------------------------------------------------------------- fungi
const cap = (u: number, v: number, cx: number, cy: number, w: number, h: number) => m(curve(u, v, (t) => [cx - w + 2 * w * t, cy - h * sin(PI * t) ** 0.7 * (t < 0.5 ? 1 : 1)], 12), seg(u, v, cx - w, cy, cx + w, cy));
const stem = (u: number, v: number, cx: number, top: number, bottom: number, w: number) => m(seg(u, v, cx - w, top, cx - w * 1.15, bottom), seg(u, v, cx + w, top, cx + w * 1.15, bottom), arc(u, v, cx, bottom, w * 1.15, 0, PI));
const smallMushroom = (u: number, v: number, cx: number, cy: number, s: number) => m(cap(u, v, cx, cy, 0.3 * s, 0.22 * s), stem(u, v, cx, cy, cy + 0.42 * s, 0.07 * s));
const fungiShapes: readonly DoodleShape[] = [
  { name: 'mushroom', draw: (u, v) => m(cap(u, v, 0, -0.08, 0.5, 0.42), stem(u, v, 0, -0.08, 0.6, 0.12), seg(u, v, -0.3, -0.08, -0.25, 0.1), seg(u, v, 0.3, -0.08, 0.25, 0.1)) },
  { name: 'toadstool', draw: (u, v) => m(cap(u, v, 0, -0.1, 0.55, 0.45), stem(u, v, 0, -0.1, 0.62, 0.1), dot(u, v, -0.28, -0.3, 0.05), dot(u, v, 0.05, -0.42, 0.05), dot(u, v, 0.32, -0.22, 0.045), dot(u, v, -0.05, -0.18, 0.03), seg(u, v, -0.2, 0.12, 0.2, 0.12)) },
  { name: 'bracket fungus', draw: (u, v) => m(seg(u, v, -0.5, -0.66, -0.5, 0.66), arc(u, v, -0.5, 0.0, 0.58, -0.5 * PI, 0.5 * PI), arc(u, v, -0.5, 0.0, 0.42, -0.5 * PI, 0.5 * PI), arc(u, v, -0.5, 0.0, 0.26, -0.5 * PI, 0.5 * PI), seg(u, v, -0.5, 0.58, 0.08, 0.58), seg(u, v, -0.5, 0.4, -0.1, 0.4)) },
  { name: 'morel', draw: (u, v) => { let d = m(path(u, v, [-0.3, 0.06, -0.14, -0.62, 0.14, -0.62, 0.3, 0.06], true), box(u, v, 0, 0.35, 0.15, 0.28)); for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) { const y = -0.5 + r * 0.15, w = 0.16 + r * 0.04; if (abs(c * w) < 0.3) d = min(d, ring(u, v, c * w, y, 0.05)); } return d; } },
  { name: 'chanterelle', draw: (u, v) => m(path(u, v, [-0.55, -0.35, -0.45, -0.45, 0, -0.3, 0.45, -0.45, 0.55, -0.35, 0.2, 0.25, 0.15, 0.6, -0.15, 0.6, -0.2, 0.25], true), seg(u, v, 0, -0.3, -0.42, -0.38), seg(u, v, 0, -0.3, -0.28, 0.1), seg(u, v, 0, -0.3, 0, 0.2), seg(u, v, 0, -0.3, 0.28, 0.1), seg(u, v, 0, -0.3, 0.42, -0.38)) },
  { name: 'puffball', draw: (u, v) => { let d = m(ring(u, v, 0, 0.1, 0.42), path(u, v, [-0.15, 0.5, 0, 0.62, 0.15, 0.5]), seg(u, v, -0.08, -0.32, 0.08, -0.32)); for (let i = 0; i < 6; i++) d = min(d, dot(u, v, -0.25 + i * 0.1, -0.12 + (i % 2) * 0.1 - 0.05 * abs(i - 2.5), 0.025)); return min(d, dot(u, v, 0.1, -0.5, 0.02), dot(u, v, -0.05, -0.58, 0.02), dot(u, v, 0.2, -0.6, 0.02)); } },
  { name: 'cluster', draw: (u, v) => m(smallMushroom(u, v, -0.3, -0.05, 0.9), smallMushroom(u, v, 0.2, -0.3, 1.1), smallMushroom(u, v, 0.4, 0.2, 0.7), seg(u, v, -0.65, 0.6, 0.65, 0.6)) },
  { name: 'gills', draw: (u, v, _k, r) => { let d = m(ring(u, v, 0, 0, 0.58), ring(u, v, 0, 0, 0.1)); for (let i = 0; i < 16; i += r < 14 ? 2 : 1) { const a = i * PI / 8, r0 = i % 2 ? 0.3 : 0.14; d = min(d, seg(u, v, cos(a) * r0, sin(a) * r0, cos(a) * 0.55, sin(a) * 0.55)); } return d; } },
  { name: 'mycelium', draw: (u, v, k) => m(branchTree(u, v, -0.2, 0.66, -PI / 2 + 0.3, 0.3, 4, 0.5 + 0.2 * k, 0.65, 0.1), branchTree(u, v, 0.25, 0.66, -PI / 2 - 0.2, 0.28, 4, 0.55, 0.62, -0.1), seg(u, v, -0.65, 0.66, 0.65, 0.66)) },
  { name: 'spore print', draw: (u, v, _k, r) => m(v > 0.12 ? Infinity : rays(u, v, 0, 0.12, 0.08, 0.56, r < 16 ? 14 : 28, 0), arc(u, v, 0, 0.12, 0.58, PI, 2 * PI), seg(u, v, -0.58, 0.12, 0.58, 0.12), dot(u, v, 0, 0.12, 0.05)) },
  { name: 'cup fungus', draw: (u, v) => m(path(u, v, [-0.5, -0.3, -0.45, 0.1, -0.2, 0.36, 0.2, 0.36, 0.45, 0.1, 0.5, -0.3]), oval(u, v, 0, -0.3, 0.5, 0.15), seg(u, v, 0, 0.36, 0, 0.6), seg(u, v, -0.2, 0.62, 0.2, 0.62)) },
  { name: 'lichen', draw: (u, v, k) => m(polar(u, v, 0, 0, (a) => 0.52 + 0.08 * sin(9 * a + 6 * k) + 0.03 * sin(17 * a), 40), polar(u, v, 0, 0, (a) => 0.3 + 0.05 * sin(7 * a - 3 * k), 24), dot(u, v, 0.15, -0.1, 0.04), dot(u, v, -0.12, 0.18, 0.04), dot(u, v, -0.05, -0.2, 0.03)) },
  { name: 'coral fungus', draw: (u, v, k) => m(seg(u, v, 0, 0.66, 0, 0.3), branchTree(u, v, 0, 0.3, -PI / 2, 0.3, 3, 0.45 + 0.15 * k, 0.72, 0)) },
  { name: 'enoki', draw: (u, v) => { let d = seg(u, v, -0.4, 0.66, 0.4, 0.66); for (let i = 0; i < 6; i++) { const x = -0.3 + i * 0.12, top = -0.35 + (i % 3) * 0.12; d = min(d, seg(u, v, x + 0.06, 0.66, x, top), dot(u, v, x, top - 0.04, 0.06)); } return d; } },
  { name: 'shaggy inkcap', draw: (u, v) => { let d = m(path(u, v, [-0.26, 0.1, -0.26, -0.3, -0.12, -0.62, 0.12, -0.62, 0.26, -0.3, 0.26, 0.1], true), stem(u, v, 0, 0.1, 0.62, 0.08)); for (let i = 0; i < 7; i++) d = min(d, seg(u, v, -0.18 + (i % 4) * 0.12, -0.5 + Math.floor(i / 4) * 0.25 + (i % 2) * 0.1, -0.14 + (i % 4) * 0.12, -0.42 + Math.floor(i / 4) * 0.25 + (i % 2) * 0.1)); return min(d, seg(u, v, -0.2, 0.1, -0.22, 0.25), seg(u, v, 0.1, 0.1, 0.12, 0.3)); } },
  { name: 'fly agaric', draw: (u, v) => m(path(u, v, [-0.62, -0.08, -0.45, -0.45, 0, -0.62, 0.45, -0.45, 0.62, -0.08], true), box(u, v, 0, 0.3, 0.14, 0.32), seg(u, v, -0.26, 0.05, 0.26, 0.05), dot(u, v, -0.35, -0.28, 0.05), dot(u, v, -0.05, -0.45, 0.05), dot(u, v, 0.3, -0.3, 0.05), dot(u, v, 0.12, -0.2, 0.035), dot(u, v, -0.2, -0.15, 0.03)) },
  { name: 'truffle', draw: (u, v, k) => m(polar(u, v, 0, 0, (a) => 0.46 + 0.07 * sin(6 * a + 6 * k) + 0.04 * sin(11 * a), 32), dot(u, v, -0.15, -0.1, 0.03), dot(u, v, 0.12, 0.08, 0.03), dot(u, v, 0.05, -0.22, 0.025), dot(u, v, -0.1, 0.2, 0.025), dot(u, v, 0.25, -0.15, 0.02)) },
  { name: 'slime mould', draw: (u, v, k) => { const pts: [number, number][] = []; for (let i = 0; i < 6; i++) { const a = i * PI / 3 + k * 2, r = 0.35 + 0.25 * ((i * 7 + Math.floor(k * 10)) % 3) / 2; pts.push([cos(a) * r, sin(a) * r]); } let d = Infinity; for (let i = 0; i < 6; i++) d = min(d, dot(u, v, pts[i][0], pts[i][1], 0.06), seg(u, v, pts[i][0], pts[i][1], pts[(i + 1) % 6][0], pts[(i + 1) % 6][1]), seg(u, v, pts[i][0], pts[i][1], 0, 0)); return min(d, dot(u, v, 0, 0, 0.08)); } },
  { name: 'fairy ring', draw: (u, v) => { let d = Infinity; for (let i = 0; i < 8; i++) { const a = i * PI / 4 + 0.2; d = min(d, smallMushroom(u, v, cos(a) * 0.5, sin(a) * 0.32 - 0.1, 0.45)); } return d; } },
  { name: 'bolete', draw: (u, v) => m(oval(u, v, 0, -0.3, 0.52, 0.3), seg(u, v, -0.5, -0.2, 0.5, -0.2), rbox(u, v, 0, 0.25, 0.22, 0.38, 0.1), dot(u, v, -0.3, -0.12, 0.02), dot(u, v, 0, -0.1, 0.02), dot(u, v, 0.3, -0.12, 0.02), dot(u, v, -0.15, -0.14, 0.02), dot(u, v, 0.15, -0.14, 0.02)) },
  { name: 'oyster mushrooms', draw: (u, v) => { let d = seg(u, v, -0.6, -0.66, -0.6, 0.66); for (let i = 0; i < 3; i++) { const y = -0.4 + i * 0.4, r = 0.45 - i * 0.08; d = min(d, arc(u, v, -0.6, y, r, -0.45 * PI, 0.45 * PI), seg(u, v, -0.6, y, -0.6 + r * 0.9, y + 0.1), seg(u, v, -0.6, y, -0.6 + r * 0.8, y - 0.2), seg(u, v, -0.6, y, -0.6 + r * 0.8, y + 0.35)); } return d; } },
  { name: 'spore cloud', draw: (u, v) => { let d = m(ring(u, v, 0, 0.3, 0.3), path(u, v, [-0.1, 0.58, 0, 0.66, 0.1, 0.58])); for (let i = 0; i < 9; i++) d = min(d, dot(u, v, -0.4 + (i % 5) * 0.2 + (i > 4 ? 0.1 : 0), -0.2 - Math.floor(i / 5) * 0.25 - (i % 2) * 0.08, 0.025 + 0.01 * (i % 3))); return d; } },
];

// ---------------------------------------------------------------- the sets
export type ThemedSet = Exclude<DoodleSet, 'notebook'>;
export const DOODLE_SHAPES: Record<ThemedSet, readonly DoodleShape[]> = {
  machinery: machineryShapes.map((shape) => (shape.name === 'glyph' ? { ...shape, draw: (u: number, v: number, k: number) => machineryGlyph(Math.floor(k * 1e6), u, v, 1) } : shape)),
  hieroglyphs: hieroglyphShapes, ascii: asciiShapes, anatomy: anatomyShapes, furniture: furnitureShapes, buildings: buildingShapes, nature: natureShapes,
  gems: gemShapes, flowers: flowerShapes, sacred: sacredShapes, contours: contourShapes, fractals: fractalShapes, fungi: fungiShapes,
};
const THEMED = DOODLE_SET_NAMES.filter((set): set is ThemedSet => set !== 'notebook');
/** How far a set's doodles may lean each way, in radians: upright things only lean; symmetric ones turn freely. */
const TURN: Record<ThemedSet, number> = {
  machinery: PI, hieroglyphs: 0.12, ascii: 0.14, anatomy: 0.3, furniture: 0.12, buildings: 0.1, nature: 0.2, gems: 0.5, flowers: 0.35, sacred: PI, contours: PI, fractals: PI / 2, fungi: 0.18,
};
/** One cell in twelve stays blank in the themed sets, so the page breathes (machinery has its own blank kind). */
const BLANK = 1 / 12;

/** Which set a cell draws from: the chosen one, or for the notebook any set by the cell's own hash. */
export function doodleSetOf(set: DoodleSet, cell: number): ThemedSet {
  return set === 'notebook' ? THEMED[Math.floor(hashPair(cell, 5) * THEMED.length)] : set;
}

/** The cell's turn in radians: machinery turns as it always did; letters and chairs only lean. */
export function doodleTurn(set: DoodleSet, cell: number): number {
  const own = doodleSetOf(set, cell);
  return own === 'machinery' ? hashPair(cell, 99) * PI : (hashPair(cell, 99) - 0.5) * 2 * TURN[own];
}

/** The original machinery doodle, in pixels, exactly as it was drawn before the themed sets existed. */
function machineryDoodle(cell: number, a: number, b: number, r: number): number {
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
    case 4: case 5: return machineryGlyph(cell, a, b, r);
    case 6: { const step = 0.32 * r; if (Math.max(Math.abs(a), Math.abs(b)) > 0.5 * r) return Infinity; return Math.max(0, Math.hypot(a - Math.round(a / step) * step, b - Math.round(b / step) * step) - 0.07 * r); }
    default: return Infinity;
  }
}

/** The shape a cell draws (its index into the set's shapes), or −1 for a blank cell. */
export function doodleIndexOf(set: DoodleSet, cell: number): number {
  const own = doodleSetOf(set, cell);
  if (own === 'machinery') return Math.floor(hashPair(cell, 7) * 8);
  return hashPair(cell, 8) < BLANK ? -1 : Math.floor(hashPair(cell, 7) * DOODLE_SHAPES[own].length);
}

/**
 * Distance in pixels from (a, b) to the nearest stroke of a cell's doodle, in the cell's own turned
 * frame of reach r (the cell's half-spacing). Infinity where there is nothing to draw.
 */
export function doodleAt(set: DoodleSet, cell: number, a: number, b: number, r: number): number {
  const own = doodleSetOf(set, cell);
  if (own === 'machinery') return machineryDoodle(cell, a, b, r);
  const index = doodleIndexOf(set, cell);
  if (index < 0) return Infinity;
  const u = a / r, v = b / r;
  // Every shape sits within ±0.8 of its cell's centre: nothing to ink out past the cell's reach.
  if (u * u + v * v > 1.6) return Infinity;
  return DOODLE_SHAPES[own][index].draw(u, v, hashPair(cell, 9), r) * r;
}

/** A line of text in the ASCII set's stroke font, left-aligned at (x, y), `scale` units per character height of 1.2. */
export function doodleText(u: number, v: number, text: string, x: number, y: number, scale: number): number {
  let best = Infinity;
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    if (ch === ' ' || !glyphStrokes.has(ch)) continue;
    const cx = x + (i + 0.5) * 1.3 * scale;
    if (abs(u - cx) > 0.8 * scale) continue;
    best = min(best, character(u, v, ch, scale, cx, y));
  }
  return best;
}
