import type { Capture } from './contract';
import { hashText, seeded } from './random';

/** Small, composable vector systems. Every mark is generated locally from its seed. */
export const SVG_MOTIFS = [
  { id: 'topography', title: 'Contour atlas', description: 'Flowing topographic lines, like imaginary terrain.' },
  { id: 'orbital', title: 'Orbital mechanics', description: 'Elliptical rings, satellites and delicate celestial instruments.' },
  { id: 'botanical', title: 'Wild herbarium', description: 'Sweeping stems and translucent leaves growing across the frame.' },
  { id: 'collage', title: 'Cut-paper geometry', description: 'Discs, arches, wedges and bars in a playful geometric composition.' },
  { id: 'constellation', title: 'Star correspondence', description: 'Fine connections between a scattered field of stars.' },
  { id: 'stipple', title: 'Dust and pollen', description: 'A drifting field of tiny ink particles and clustered speckles.' },
  { id: 'blueprint', title: 'Field notes', description: 'Drafting grids, dimension lines and quiet specimen annotations.' },
  { id: 'ribbons', title: 'Silk currents', description: 'Long translucent ribbons bending like water or folded silk.' },
  { id: 'interference', title: 'Broken transmission', description: 'Bowed raster fragments, signal dropouts and isolated phosphor blocks: a distressed CRT transmission with plenty of open space.' },
  { id: 'fracture', title: 'Fault and ember', description: 'Jagged branching fissures, broken stress arcs and translucent shards: cracked terrain, scorched glass and electric fault lines.' },
  { id: 'halftone', title: 'Distressed screen', description: 'An uneven dot screen with chipped ink, rubbed-away bands and fine grit: a weathered stencil or underground poster print.' },
] as const;

export type SvgMotif = (typeof SVG_MOTIFS)[number]['id'];

/**
 * A picture traced into flat vector shapes, one per colour, kept as validated path data rather
 * than raw markup. `tone` runs 0 dark … 1 light; `background` marks the colours that owned the
 * picture's border, which most treatments drop.
 */
export interface TracedShape { d: string; fill: string; tone: number; background: boolean }
export interface TracedImage { id: string; name: string; width: number; height: number; shapes: TracedShape[] }
export const TRACE_STYLES = ['poster', 'ink', 'lines', 'ghost'] as const;
export type TraceStyle = (typeof TRACE_STYLES)[number];
export interface TraceSheet {
  image: TracedImage;
  style: TraceStyle;
  /** Centre of the picture in the frame, 0..1. */
  x: number;
  y: number;
  /** Its longer side as a fraction of the frame. */
  size: number;
}

export interface SvgLayer {
  id: string;
  /** A drawn motif, or 'trace' for a traced picture carried in `trace`. */
  motif: SvgMotif | 'trace';
  /** Present when the motif is 'trace'. */
  trace?: TraceSheet;
  seed: number;
  color: string;
  accent: string;
  opacity: number;
  density: number;
  scale: number;
  rotation: number;
  blend: 'normal' | 'multiply' | 'screen';
  placement: 'all' | 'subject' | 'background';
  visible: boolean;
}

/** Stable defaults; callers adding the same motif twice should give each layer a unique id. */
export function createSvgLayer(motif: SvgMotif, seed: number): SvgLayer {
  const safeMotif: SvgMotif = SVG_MOTIFS.some((entry) => entry.id === motif) ? motif : 'topography';
  const safeSeed = Number.isFinite(seed) ? seed >>> 0 : 0;
  return {
    id: `${safeMotif}-${safeSeed}`, motif: safeMotif, seed: safeSeed,
    color: '#264c65', accent: '#d89257', opacity: 0.65, density: 0.45,
    scale: 1, rotation: 0, blend: 'normal', placement: 'all', visible: true,
  };
}

const BOX = 720;
const MAX_LAYERS = 24;
const bounded = (value: number, low: number, high: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback;
const number = (value: number) => Number(value.toFixed(2)).toString();
const hex = (value: string, fallback: string) =>
  typeof value === 'string' && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? value : fallback;
const xml = (value: string) => value.replace(/[&<>"']/g, (character) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);

/** Path data from the tracer is only move, line, curve and close commands with numbers. */
const SAFE_PATH = /^[MLQCZmlqcz0-9.,\s-]*$/;
const MAX_TRACE_SHAPES = 64;
const MAX_TRACE_PATH = 800_000;

/** Keep only well-formed shapes within budget; anything else in a trace is dropped, never rendered. */
export function normalizeTrace(sheet: unknown): TraceSheet | undefined {
  if (!sheet || typeof sheet !== 'object') return undefined;
  const raw = sheet as Partial<TraceSheet>;
  const image = raw.image as Partial<TracedImage> | undefined;
  if (!image || !Array.isArray(image.shapes)) return undefined;
  let budget = MAX_TRACE_PATH;
  const shapes: TracedShape[] = [];
  for (const shape of image.shapes.slice(0, MAX_TRACE_SHAPES)) {
    if (!shape || typeof shape.d !== 'string' || !SAFE_PATH.test(shape.d) || shape.d.length > budget) continue;
    budget -= shape.d.length;
    shapes.push({ d: shape.d, fill: hex(shape.fill, '#808080'), tone: bounded(Number(shape.tone), 0, 1, 0.5), background: shape.background === true });
  }
  if (!shapes.length) return undefined;
  const text = (value: unknown, fallback: string, length: number) => typeof value === 'string' ? value.slice(0, length).replace(/[\u0000-\u001f\ud800-\udfff\ufffe\uffff]/g, '') || fallback : fallback;
  return {
    image: {
      id: text(image.id, 'trace', 80), name: text(image.name, 'A traced picture', 80),
      width: bounded(Number(image.width), 1, 4096, 100), height: bounded(Number(image.height), 1, 4096, 100), shapes,
    },
    style: TRACE_STYLES.includes(raw.style as TraceStyle) ? raw.style as TraceStyle : 'poster',
    x: bounded(Number(raw.x), 0, 1, 0.5), y: bounded(Number(raw.y), 0, 1, 0.5), size: bounded(Number(raw.size), 0.1, 1.2, 0.6),
  };
}

/** A readable name for any sheet: the motif's title, or the traced picture's own name. */
export function layerTitle(layer: Pick<SvgLayer, 'motif' | 'trace'>): string {
  if (layer.motif === 'trace') return layer.trace?.image.name ?? 'Traced picture';
  return SVG_MOTIFS.find((entry) => entry.id === layer.motif)?.title ?? 'Vector sheet';
}

function normalize(layer: SvgLayer): SvgLayer {
  const trace = layer.motif === 'trace' ? normalizeTrace(layer.trace) : undefined;
  const defaults = createSvgLayer(layer.motif === 'trace' ? 'topography' : layer.motif, layer.seed);
  return {
    ...defaults,
    ...(trace ? { motif: 'trace' as const, trace } : {}),
    id: typeof layer.id === 'string' ? layer.id.slice(0, 120).replace(/[\u0000-\u001f\ud800-\udfff\ufffe\uffff]/g, '') : defaults.id,
    color: hex(layer.color, defaults.color), accent: hex(layer.accent, defaults.accent),
    opacity: bounded(layer.opacity, 0, 1, defaults.opacity),
    density: bounded(layer.density, 0, 1, defaults.density),
    scale: bounded(layer.scale, 0.35, 2.4, 1), rotation: bounded(layer.rotation, -360, 360, 0),
    blend: ['normal', 'multiply', 'screen'].includes(layer.blend) ? layer.blend : 'normal',
    placement: ['all', 'subject', 'background'].includes(layer.placement) ? layer.placement : 'all',
    visible: layer.visible !== false,
  };
}

type Point = [number, number];
const point = ([x, y]: Point) => `${number(x)} ${number(y)}`;
const line = (a: Point, b: Point, extra = '') => `<path d="M${point(a)}L${point(b)}" ${extra}/>`;
const circle = (x: number, y: number, radius: number, extra = '') =>
  `<circle cx="${number(x)}" cy="${number(y)}" r="${number(radius)}" ${extra}/>`;

/** Smooth interpolating cubic path through a bounded set of points. */
function curve(points: Point[]): string {
  let path = `M${point(points[0])}`;
  for (let index = 1; index < points.length; index++) {
    const before = points[Math.max(0, index - 2)], from = points[index - 1];
    const to = points[index], after = points[Math.min(points.length - 1, index + 1)];
    path += `C${point([from[0] + (to[0] - before[0]) / 6, from[1] + (to[1] - before[1]) / 6])} ${point([to[0] - (after[0] - from[0]) / 6, to[1] - (after[1] - from[1]) / 6])} ${point(to)}`;
  }
  return path;
}

/**
 * A traced picture in one of four treatments. Poster keeps its own colours without the background;
 * ink re-inks it in the sheet's two colours by tone; lines keeps only the marks that contrast with
 * its background, in one ink; ghost keeps the whole picture, background and all.
 */
function traceMarks(sheet: TraceSheet, color: string, accent: string): string {
  const { image, style } = sheet;
  const fit = (BOX * sheet.size) / Math.max(image.width, image.height);
  const left = sheet.x * BOX - (image.width * fit) / 2, top = sheet.y * BOX - (image.height * fit) / 2;
  const figure = image.shapes.filter((shape) => !shape.background);
  const backdrop = image.shapes.filter((shape) => shape.background);
  const backdropTone = backdrop.length ? backdrop.reduce((sum, shape) => sum + shape.tone, 0) / backdrop.length : 1;
  let paths: string[];
  if (style === 'ghost') paths = image.shapes.map((shape) => `<path d="${shape.d}" fill="${shape.fill}"/>`);
  else if (style === 'poster') paths = figure.map((shape) => `<path d="${shape.d}" fill="${shape.fill}"/>`);
  else if (style === 'ink') paths = figure.map((shape) => `<path d="${shape.d}" fill="${shape.tone < 0.5 ? color : accent}" fill-opacity="${number(1 - shape.tone * 0.7)}"/>`);
  else {
    // A light backdrop keeps the dark marks; a dark one keeps the light marks.
    const marks = image.shapes.filter((shape) => !shape.background && (backdropTone >= 0.5 ? shape.tone < 0.42 : shape.tone > 0.58));
    paths = (marks.length ? marks : figure.slice(0, 1)).map((shape) => `<path d="${shape.d}" fill="${color}"/>`);
  }
  return `<g data-vector-part="trace" stroke="none" transform="translate(${number(left)} ${number(top)}) scale(${number(fit)})">${paths.join('')}</g>`;
}

function marks(layer: SvgLayer): string {
  if (layer.motif === 'trace') return layer.trace ? traceMarks(layer.trace, layer.color, layer.accent) : '';
  const random = seeded(layer.seed), { color, accent, density } = layer;
  const range = (low: number, high: number) => low + random() * (high - low);
  const output: string[] = [];
  const ink = (index: number) => index % 4 === 0 ? accent : color;
  switch (layer.motif) {
    case 'topography': {
      const count = Math.round(12 + density * 35), phase = range(0, Math.PI * 2);
      const hills = Array.from({ length: 3 }, () => [range(100, 650), range(130, 600), range(70, 180), range(-90, 90)]);
      for (let row = 0; row < count; row++) {
        const y = (row - 1) / (count - 3) * BOX;
        const points: Point[] = Array.from({ length: 29 }, (_, index) => {
          const x = -80 + index * 32;
          const wave = Math.sin(x / 135 + phase + y / 310) * 16;
          const elevation = hills.reduce((sum, [hx, hy, width, force]) => sum + Math.exp(-((x - hx) ** 2 + (y - hy) ** 2 * 0.32) / (width * width)) * force, 0);
          return [x, y + wave + elevation];
        });
        output.push(`<path d="${curve(points)}" stroke="${ink(row)}" stroke-width="${row % 5 === 0 ? 1.9 : 0.85}" opacity="${row % 5 === 0 ? 0.85 : 0.58}"/>`);
      }
      break;
    }
    case 'orbital': {
      const cx = range(240, 480), cy = range(240, 480), tilt = range(-55, 55), count = Math.round(4 + density * 10);
      const squash = range(0.45, 0.8);
      output.push(`<g transform="rotate(${number(tilt)} ${number(cx)} ${number(cy)})">`);
      for (let index = 0; index < count; index++) {
        const radius = 56 + index * (260 / count), ry = radius * squash;
        output.push(`<ellipse cx="${number(cx)}" cy="${number(cy)}" rx="${number(radius)}" ry="${number(ry)}" stroke="${ink(index)}" stroke-width="${index % 3 ? 0.9 : 1.6}" ${index % 4 === 1 ? 'stroke-dasharray="2 7"' : ''}/>`);
        const angle = range(0, Math.PI * 2), x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * ry;
        output.push(circle(x, y, range(2, 5.5), `fill="${ink(index)}" stroke="none"`));
        if (index % 3 === 0) output.push(circle(x, y, 10, `stroke="${accent}" stroke-width="0.7"`));
      }
      output.push('</g>');
      output.push(line([cx - 12, cy], [cx + 12, cy], `stroke="${accent}"`), line([cx, cy - 12], [cx, cy + 12], `stroke="${accent}"`));
      break;
    }
    case 'botanical': {
      const count = Math.round(3 + density * 7);
      for (let stem = 0; stem < count; stem++) {
        const base: Point = [range(10, 710), range(680, 820)], tip: Point = [base[0] + range(-200, 200), range(95, 430)];
        const c1: Point = [base[0] + range(-80, 80), base[1] - 170], c2: Point = [tip[0] + range(-100, 100), tip[1] + 90];
        const at = (t: number): Point => [0, 1].map((axis) => (1 - t) ** 3 * base[axis] + 3 * (1 - t) ** 2 * t * c1[axis] + 3 * (1 - t) * t * t * c2[axis] + t ** 3 * tip[axis]) as Point;
        output.push(`<path d="M${point(base)}C${point(c1)} ${point(c2)} ${point(tip)}" stroke="${ink(stem)}" stroke-width="1.4"/>`);
        const leaves = Math.round(range(5, 11));
        for (let leaf = 0; leaf < leaves; leaf++) {
          const t = 0.12 + leaf / leaves * 0.83, origin = at(t), next = at(t + 0.015);
          const angle = Math.atan2(next[1] - origin[1], next[0] - origin[0]) + (leaf % 2 ? 1 : -1) * range(0.5, 1.05);
          const length = range(32, 72) * (1 - t * 0.4), width = length * range(0.15, 0.27);
          const end: Point = [origin[0] + Math.cos(angle) * length, origin[1] + Math.sin(angle) * length];
          const middle: Point = [(origin[0] + end[0]) / 2, (origin[1] + end[1]) / 2];
          const side: Point = [-Math.sin(angle) * width, Math.cos(angle) * width];
          output.push(`<path d="M${point(origin)}Q${point([middle[0] + side[0], middle[1] + side[1]])} ${point(end)}Q${point([middle[0] - side[0], middle[1] - side[1]])} ${point(origin)}Z" fill="${ink(stem + leaf)}" fill-opacity="0.18" stroke="${ink(stem)}" stroke-width="0.75"/>`);
          output.push(line(origin, end, `stroke="${ink(stem)}" stroke-width="0.5" opacity="0.6"`));
        }
      }
      break;
    }
    case 'collage': {
      const count = Math.round(5 + density * 15);
      for (let index = 0; index < count; index++) {
        const x = range(50, 670), y = range(45, 670), width = range(45, 175), height = range(35, 145);
        const style = `fill="${index % 2 ? color : accent}" fill-opacity="${number(range(0.14, 0.38))}" stroke="${ink(index)}" stroke-width="0.8"`;
        output.push(`<g transform="translate(${number(x)} ${number(y)}) rotate(${number(Math.round(range(-4, 4)) * 15)})">`);
        switch (index % 4) {
          case 0: output.push(circle(0, 0, width * 0.5, style)); break;
          case 1: output.push(`<path d="M${number(-width / 2)} ${number(height / 2)}V0A${number(width / 2)} ${number(height / 2)} 0 0 1 ${number(width / 2)} 0V${number(height / 2)}Z" ${style}/>`); break;
          case 2: output.push(`<path d="M${number(-width / 2)} ${number(height / 2)}L0 ${number(-height / 2)}L${number(width / 2)} ${number(height / 2)}Z" ${style}/>`); break;
          default: output.push(`<rect x="${number(-width / 2)}" y="${number(-height / 6)}" width="${number(width)}" height="${number(height / 3)}" ${style}/>`);
        }
        output.push('</g>');
      }
      break;
    }
    case 'constellation': {
      const stars: Point[] = Array.from({ length: Math.round(15 + density * 44) }, () => [range(24, 696), range(24, 696)]);
      for (let index = 0; index < stars.length; index++) {
        const [x, y] = stars[index];
        const nearby = stars.slice(0, index).map((other) => ({ other, distance: Math.hypot(other[0] - x, other[1] - y) })).sort((a, b) => a.distance - b.distance);
        if (nearby[0]?.distance < 185) output.push(line(stars[index], nearby[0].other, `stroke="${color}" stroke-width="0.7" opacity="0.52"`));
        output.push(circle(x, y, range(1, 3), `fill="${ink(index)}" stroke="none"`));
        if (index % 7 === 0) {
          output.push(circle(x, y, 8, `stroke="${accent}" stroke-width="0.6"`));
          output.push(line([x - 12, y], [x + 12, y], `stroke="${accent}" stroke-width="0.6"`), line([x, y - 12], [x, y + 12], `stroke="${accent}" stroke-width="0.6"`));
        }
      }
      break;
    }
    case 'stipple': {
      const count = Math.round(130 + density * 770), cx = range(140, 580), cy = range(160, 560);
      for (let index = 0; index < count; index++) {
        const angle = range(0, Math.PI * 2), radius = Math.sqrt(random()) * range(100, 500);
        const x = index % 3 ? cx + Math.cos(angle) * radius : range(0, BOX);
        const y = index % 3 ? cy + Math.sin(angle) * radius * 0.7 : range(0, BOX);
        output.push(circle(x, y, range(0.5, 2.6), `fill="${ink(index)}" stroke="none" opacity="${number(range(0.2, 0.85))}"`));
      }
      break;
    }
    case 'blueprint': {
      const spacing = [36, 48, 60][Math.floor(random() * 3)], offset = Math.round(range(0, spacing));
      output.push(`<g stroke="${color}" stroke-width="0.45" opacity="${number(0.12 + density * 0.15)}">`);
      for (let at = offset; at < BOX; at += spacing) output.push(line([at, 0], [at, BOX]), line([0, at], [BOX, at]));
      output.push('</g>');
      const margin = 34 + Math.round(range(0, 25));
      for (const x of [margin, BOX - margin]) for (const y of [margin, BOX - margin]) {
        output.push(line([x - 11, y], [x + 11, y], `stroke="${accent}"`), line([x, y - 11], [x, y + 11], `stroke="${accent}"`));
      }
      for (let index = 0; index < Math.round(2 + density * 5); index++) {
        const x = range(90, 510), y = range(85, 620), width = range(60, 170);
        output.push(line([x, y], [x + width, y], `stroke="${ink(index)}" stroke-width="0.7"`));
        for (const at of [x, x + width]) output.push(line([at - 4, y + 5], [at + 4, y - 5], `stroke="${ink(index)}" stroke-width="0.9"`));
        output.push(`<text x="${number(x + width / 2)}" y="${number(y - 7)}" text-anchor="middle" font-family="monospace" font-size="8" fill="${ink(index)}" stroke="none" letter-spacing="1">${String(Math.round(width * 7)).padStart(3, '0')}</text>`);
      }
      output.push(`<text x="${number(margin)}" y="${number(BOX - margin + 20)}" font-family="monospace" font-size="8" fill="${color}" stroke="none" letter-spacing="2">FIG. ${String(layer.seed % 97 + 1).padStart(2, '0')} / FIELD STUDY</text>`);
      break;
    }
    case 'ribbons': {
      const count = Math.round(3 + density * 8), phase = range(0, Math.PI * 2), sway = range(35, 100);
      for (let index = 0; index < count; index++) {
        const base = (index + 0.5) / count * BOX, width = range(12, 48);
        const edge = (offset: number): Point[] => Array.from({ length: 19 }, (_, at) => {
          const x = -90 + at * 50;
          return [x, base + Math.sin(x / 180 + phase + index * 0.42) * sway + Math.sin(x / 330 + phase) * 24 + offset];
        });
        const top = edge(-width / 2), bottom = edge(width / 2).reverse();
        output.push(`<path d="${curve(top)}L${point(bottom[0])}${curve(bottom).replace(/^M[^C]+/, '')}Z" fill="${ink(index)}" fill-opacity="0.16" stroke="${ink(index)}" stroke-width="0.8"/>`);
      }
      break;
    }
    case 'interference': {
      const bands = Math.round(8 + density * 19), bow = range(12, 44), phase = range(0, Math.PI * 2);
      const centre = range(180, 540), reach = range(125, 245), silence = range(200, 520);
      output.push('<g data-vector-part="raster" fill="none" stroke-linecap="butt">');
      for (let band = 0; band < bands; band++) {
        const y = centre + ((band + 0.5) / bands - 0.5) * reach + range(-7, 7), shift = range(-12, 12);
        const warp = (x: number) => y + bow * ((x - 360) / 360) ** 2 * (y < 360 ? -1 : 1) + Math.sin(x / 95 + phase) * 3;
        let trace = '', drawing = false;
        for (let sample = 0; sample < 45; sample++) {
          const x = sample * 16 + shift;
          // Dropouts are absent geometry, so the scene still shows through the damaged signal.
          const quiet = Math.exp(-((x - silence) ** 2) / (110 * 110)) * 0.62;
          if (random() < 0.25 + quiet + (band % 4 === 0 ? 0.15 : 0)) { drawing = false; continue; }
          const from: Point = [x, warp(x)], to: Point = [x + range(7, 14), warp(x + 12)];
          trace += `${drawing && random() < 0.55 ? 'L' : 'M'}${point(from)}L${point(to)}`;
          drawing = true;
        }
        output.push(`<path d="${trace}" stroke="${ink(band)}" stroke-width="${band % 5 === 0 ? 1.8 : 0.7}" opacity="${number(range(0.25, 0.65))}"/>`);
        if (band % 5 === 0) output.push(`<path d="${trace}" transform="translate(${number(range(4, 11))} 3)" stroke="${accent}" stroke-width="0.6" opacity="0.22"/>`);
      }
      output.push('</g><g data-vector-part="phosphor" stroke="none">');
      const clusters = Math.round(8 + density * 22);
      for (let cluster = 0; cluster < clusters; cluster++) {
        const x = range(10, 665), y = range(15, 705), columns = Math.round(range(2, 7));
        for (let cell = 0; cell < columns; cell++) {
          if (random() < 0.27) continue;
          output.push(`<rect x="${number(x + cell * 6)}" y="${number(y + (cell % 3 === 0 ? 2 : 0))}" width="${number(range(1.5, 4.5))}" height="${number(range(1.2, 4))}" fill="${ink(cluster + cell)}" opacity="${number(range(0.25, 0.75))}"/>`);
        }
      }
      output.push('</g>');
      break;
    }
    case 'fracture': {
      const faults = Math.round(1 + density * 2), shards: string[] = [];
      const stress: Point = [range(190, 530), range(210, 510)];
      output.push('<g data-vector-part="faults" fill="none">');
      for (let fault = 0; fault < faults; fault++) {
        const angle = range(-0.35, 0.35), start: Point = [range(80, 640), -35];
        const phase = range(0, Math.PI * 2), bend = range(25, 80);
        const points: Point[] = [start];
        for (let step = 1; step <= 20; step++) {
          points.push([start[0] + Math.sin(angle) * step * 39 + Math.sin(step / 3.8 + phase) * bend + range(-8, 8), start[1] + step * 39 + range(-5, 5)]);
        }
        output.push(`<path d="${curve(points)}" stroke="${ink(fault)}" stroke-width="${number(range(0.7, 1.35))}" opacity="0.72"/>`);
        for (let joint = 2; joint < points.length - 2; joint += 3) {
          const origin = points[joint], sign = joint % 2 ? 1 : -1;
          const branchAngle = angle + sign * range(0.6, 1.15), length = range(32, 105);
          const tip: Point = [origin[0] + Math.sin(branchAngle) * length, origin[1] + Math.cos(branchAngle) * length];
          const elbow: Point = [(origin[0] + tip[0]) / 2 + range(-12, 12), (origin[1] + tip[1]) / 2 + range(-9, 9)];
          output.push(`<path d="M${point(origin)}L${point(elbow)}L${point(tip)}" stroke="${ink(fault + joint)}" stroke-width="0.55" opacity="0.58"/>`);
          if (joint === 8) {
            const splinter: Point = [elbow[0] + sign * range(5, 15), elbow[1] + range(5, 17)];
            shards.push(`<path d="M${point(origin)}L${point(elbow)}L${point(splinter)}Z" fill="${ink(fault + joint)}" fill-opacity="0.1" stroke="${ink(fault)}" stroke-width="0.45"/>`);
          }
        }
      }
      // Open, interrupted arcs suggest a stress field; they never close into opaque panels.
      for (let arc = 0; arc < Math.round(1 + density * 2); arc++) {
        const radius = range(65, 300), from = range(0, Math.PI * 2), span = range(0.2, 0.8);
        const at = (angle: number): Point => [stress[0] + Math.cos(angle) * radius, stress[1] + Math.sin(angle) * radius * 0.65];
        output.push(`<path d="M${point(at(from))}A${number(radius)} ${number(radius * 0.65)} 0 0 1 ${point(at(from + span))}" stroke="${accent}" stroke-width="0.65" opacity="0.48"/>`);
      }
      output.push(`</g><g data-vector-part="shards">${shards.join('')}</g>`);
      break;
    }
    case 'halftone': {
      const spacing = 18 - density * 6, phase = range(0, Math.PI * 2), rub = range(-0.35, 0.35);
      const fields = Array.from({ length: 3 }, () => [range(80, 640), range(80, 640), range(120, 260)]);
      let dots = 0;
      output.push(`<g data-vector-part="screen" fill="${color}" stroke="none">`);
      for (let row = 0; row < Math.ceil(BOX / spacing); row++) {
        for (let column = 0; column < Math.ceil(BOX / spacing); column++) {
          const x = (column + 0.5 + (row % 2) * 0.5) * spacing + range(-0.2, 0.2) * spacing;
          const y = (row + 0.5) * spacing + range(-0.2, 0.2) * spacing;
          const field = Math.min(1, fields.reduce((sum, [cx, cy, width]) => sum + Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (width * width)) * 0.7, 0));
          const wear = Math.sin((y + x * rub) / 27 + phase);
          if (wear > 0.9 || random() > 0.07 + field * 0.68 || dots >= 1800) continue;
          dots++;
          const radius = spacing * (0.012 + field * 0.082) * range(0.65, 1.12), opacity = number(range(0.3, 0.74));
          if (random() < 0.58) {
            // A missing wedge in the dot is exposed paper, not a white paint overlay.
            output.push(`<path d="M${point([x - radius, y])}A${number(radius)} ${number(radius)} 0 1 1 ${point([x, y + radius])}L${point([x + radius * 0.2, y + radius * 0.1])}Z" opacity="${opacity}"/>`);
          } else output.push(circle(x, y, radius, `opacity="${opacity}"`));
        }
      }
      output.push(`</g><g data-vector-part="grit" fill="${accent}" stroke="none">`);
      for (let speck = 0; speck < Math.round(35 + density * 105); speck++) {
        const x = range(0, BOX), y = range(0, BOX), width = range(0.6, 2.5), height = range(0.4, 1.5);
        output.push(`<path d="M${number(x)} ${number(y)}l${number(width)} ${number(-height)}l${number(width * 0.25)} ${number(height * 1.6)}Z" opacity="${number(range(0.18, 0.55))}"/>`);
      }
      output.push('</g>');
      break;
    }
  }
  return output.join('');
}

/** Coarse identity silhouettes stay portable vector paths, with at most 180 × 180 cells. */
function subjectPath(capture: Capture): string | null {
  const size = capture.size;
  if (!Number.isInteger(size) || size < 1 || size > 4096 || capture.identity.length < size * size * 4) return null;
  const cells = Math.min(size, 180), step = BOX / cells;
  type Run = { x: number; y: number; width: number; height: number };
  let active = new Map<string, Run>();
  const rectangles: Run[] = [];
  for (let y = 0; y < cells; y++) {
    const next = new Map<string, Run>();
    const row = Math.min(size - 1, Math.floor((y + 0.5) / cells * size));
    const subject = (x: number) => capture.identity[(row * size + Math.min(size - 1, Math.floor((x + 0.5) / cells * size))) * 4] >= 2;
    for (let x = 0; x < cells;) {
      if (!subject(x)) { x++; continue; }
      const start = x++;
      while (x < cells && subject(x)) x++;
      const key = `${start}:${x - start}`, previous = active.get(key);
      if (previous) { previous.height++; next.set(key, previous); active.delete(key); }
      else next.set(key, { x: start, y, width: x - start, height: 1 });
    }
    rectangles.push(...active.values());
    active = next;
  }
  rectangles.push(...active.values());
  return rectangles.map(({ x, y, width, height }) => `M${number(x * step)} ${number(y * step)}h${number(width * step)}v${number(height * step)}h${number(-width * step)}Z`).join('');
}

/**
 * Transparent standalone SVG with editable named groups, deterministic for the same inputs.
 * Density and opacity are 0..1; scale is 0.35..2.4; rotation is in degrees.
 * Subject placement uses captured identities 2+; background includes the ground (0 and 1).
 * Without a valid capture, placement falls back to the full frame. At most 24 layers render.
 */
export function generateSvg(size: number, layers: readonly SvgLayer[], capture?: Capture): string {
  const dimension = Math.round(bounded(size, 1, 4096, BOX));
  const visible = layers.slice(0, MAX_LAYERS).map(normalize).filter((layer) => layer.visible && layer.opacity > 0);
  const namespace = `conjure-${hashText(JSON.stringify(visible))}`;
  const silhouette = capture && visible.some((layer) => layer.placement !== 'all') ? subjectPath(capture) : null;
  const defs: string[] = [];
  if (silhouette !== null) {
    if (visible.some((layer) => layer.placement === 'subject')) defs.push(`<clipPath id="${namespace}-subject" clipPathUnits="userSpaceOnUse"><path d="${silhouette}"/></clipPath>`);
    if (visible.some((layer) => layer.placement === 'background')) defs.push(`<clipPath id="${namespace}-background" clipPathUnits="userSpaceOnUse"><path d="M0 0H720V720H0Z${silhouette}" clip-rule="evenodd" fill-rule="evenodd"/></clipPath>`);
  }
  const groups = visible.map((layer, index) => {
    const title = layerTitle(layer);
    const clip = silhouette !== null && layer.placement !== 'all' ? ` clip-path="url(#${namespace}-${layer.placement})"` : '';
    // Keep clipping outside the transform so the mask stays registered to the captured scene.
    return `<g id="${namespace}-layer-${index}" data-layer="${xml(layer.id)}" data-motif="${layer.motif}" opacity="${number(layer.opacity)}" style="mix-blend-mode:${layer.blend}"${clip}><title>${xml(title)}</title><g transform="translate(360 360) rotate(${number(layer.rotation)}) scale(${number(layer.scale)}) translate(-360 -360)">${marks(layer)}</g></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" viewBox="0 0 720 720" fill="none" stroke-linecap="round" stroke-linejoin="round" style="isolation:isolate"><title>Conjure vector layers</title>${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${groups.join('')}</svg>`;
}

/** A traced picture on its own, for previews: its own viewBox, the chosen treatment, transparent ground. */
export function traceSvg(image: TracedImage, style: TraceStyle = 'poster', color = '#1d1d1f', accent = '#8a8378'): string {
  const sheet = normalizeTrace({ image, style, x: 0.5, y: 0.5, size: 1 });
  if (!sheet) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720">${traceMarks(sheet, hex(color, '#1d1d1f'), hex(accent, '#8a8378'))}</svg>`;
}

/** Rasterize generated SVG for a pixel look or PNG export. Releases its blob on every exit. */
export async function rasterizeSvg(svg: string, size: number, signal: AbortSignal): Promise<Uint8ClampedArray> {
  signal.throwIfAborted();
  const dimension = Math.round(bounded(size, 1, 4096, BOX));
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  let image: HTMLImageElement | undefined;
  let abort: (() => void) | undefined;
  try {
    image = new Image();
    const loading = image;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        if (abort) signal.removeEventListener('abort', abort);
        loading.onload = loading.onerror = null;
        error === undefined ? resolve() : reject(error);
      };
      abort = () => finish(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      loading.onload = () => finish();
      loading.onerror = () => finish(new Error('The generated SVG could not be rasterized.'));
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) { abort(); return; }
      try { loading.src = url; }
      catch (error) { finish(error); }
    });
    signal.throwIfAborted();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = dimension;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('A 2D canvas is required to rasterize SVG.');
    context.drawImage(image, 0, 0, dimension, dimension);
    const pixels = context.getImageData(0, 0, dimension, dimension).data;
    signal.throwIfAborted();
    return pixels;
  } finally {
    if (abort) signal.removeEventListener('abort', abort);
    if (image) {
      image.onload = image.onerror = null;
      image.src = '';
    }
    URL.revokeObjectURL(url);
  }
}
