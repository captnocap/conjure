/**
 * Lettering-like marks. None of it spells anything: glyphs are drawn from skeletons that read as
 * letters at a glance, the way a poster's slogan reads as type before it reads as words.
 */

type Point = readonly [number, number];
type Skeleton = readonly (readonly Point[])[];

/** Capital skeletons on a 2 × 4 grid: modular block letters of the 1920s. */
const CAPITALS: readonly Skeleton[] = [
  [[[0, 0], [0, 4]], [[2, 0], [2, 4]], [[0, 2], [2, 2]]],
  [[[0, 4], [0, 0], [2, 0], [2, 4]]],
  [[[0, 4], [0, 0], [2, 0]]],
  [[[2, 0], [0, 0], [0, 4], [2, 4]], [[0, 2], [1.5, 2]]],
  [[[0, 0], [0, 4], [2, 4]]],
  [[[0, 0], [2, 0]], [[1, 0], [1, 4]]],
  [[[2, 0], [0, 0], [0, 4], [2, 4]]],
  [[[0, 0], [2, 0], [2, 4], [0, 4], [0, 0]]],
  [[[0, 4], [0, 0], [2, 4], [2, 0]]],
  [[[0, 0], [0, 2], [2, 2]], [[2, 0], [2, 4]]],
  [[[0, 0], [0, 4], [2, 4], [2, 0]], [[1, 1.4], [1, 4]]],
  [[[1, 0], [1, 4]], [[0, 0], [2, 4]], [[2, 0], [0, 4]]],
  [[[2, 4], [2, 0], [0, 0], [0, 2], [2, 2]], [[2, 2], [0, 4]]],
  [[[0, 4], [0, 0], [2, 0], [2, 2], [0, 2]]],
  [[[0, 0], [0, 4]], [[2, 0], [0, 2], [2, 4]]],
  [[[0, 4], [1, 0], [2, 4]], [[0.5, 2.6], [1.5, 2.6]]],
  [[[2, 0], [0, 0], [0, 4], [2, 4], [2, 2], [0, 2]]],
];

export type CapitalStyle = 'block' | 'marker';

/** Width of one capital in modules, including its own stroke. */
export const CAPITAL_ADVANCE = 3.2;

/**
 * Draw a line of capitals on a canvas path. `module` is the grid step in pixels and the
 * block stroke is one module wide; the marker stroke is round and wobbles a little.
 */
export function capitals(
  g: CanvasRenderingContext2D,
  count: number,
  x: number,
  y: number,
  module: number,
  style: CapitalStyle,
  random: () => number,
  weight = 1,
) {
  g.lineWidth = module * (style === 'block' ? 1 : 0.8) * weight;
  g.lineCap = style === 'block' ? 'square' : 'round';
  g.lineJoin = style === 'block' ? 'miter' : 'round';
  g.miterLimit = 4;
  let pen = x + module * 0.5;
  for (let i = 0; i < count; i++) {
    const glyph = CAPITALS[Math.floor(random() * CAPITALS.length)];
    const lean = style === 'marker' ? (random() - 0.5) * 0.25 : 0;
    const lift = style === 'marker' ? (random() - 0.5) * module * 0.5 : 0;
    g.beginPath();
    for (const line of glyph) {
      line.forEach(([gx, gy], index) => {
        const wobble = style === 'marker' ? (random() - 0.5) * module * 0.22 : 0;
        const px = pen + gx * module + (4 - gy) * lean * module * 0.3 + wobble;
        const py = y + module * 0.5 + gy * module + lift + (style === 'marker' ? (random() - 0.5) * module * 0.22 : 0);
        if (index === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      });
    }
    g.stroke();
    pen += CAPITAL_ADVANCE * module;
  }
  return pen - x;
}

/**
 * Lower-case letters built only from rings, arcs and stems, the universal alphabet of the
 * Bauhaus print shop. `x` is the left edge, `base` the baseline, `xh` the x-height.
 */
const LOWER = ['a', 'b', 'd', 'o', 'n', 'u', 'h', 'l', 'e', 'c', 'p', 'q', 'r', 't', 'i'] as const;
export function bayer(
  g: CanvasRenderingContext2D,
  count: number,
  x: number,
  base: number,
  xh: number,
  random: () => number,
) {
  const w = xh * 0.16;
  g.lineWidth = w;
  g.lineCap = 'butt';
  const r = xh / 2 - w / 2;
  let pen = x;
  for (let i = 0; i < count; i++) {
    const ch = LOWER[Math.floor(random() * LOWER.length)];
    const cx = pen + xh / 2, cy = base - xh / 2;
    const left = pen + w / 2, right = pen + xh - w / 2;
    const ring = () => {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
    };
    const stem = (sx: number, top: number, bottom: number) => {
      g.beginPath();
      g.moveTo(sx, top);
      g.lineTo(sx, bottom);
      g.stroke();
    };
    const arch = (down: boolean) => {
      g.beginPath();
      g.arc(cx, cy, r, down ? 0 : Math.PI, down ? Math.PI : Math.PI * 2);
      g.stroke();
    };
    let advance = xh + w * 1.6;
    switch (ch) {
      case 'a': ring(); stem(right, base - xh, base); break;
      case 'b': ring(); stem(left, base - xh * 1.8, base); break;
      case 'd': ring(); stem(right, base - xh * 1.8, base); break;
      case 'o': ring(); break;
      case 'n': arch(false); stem(left, cy, base); stem(right, cy, base); stem(left, base - xh, cy); break;
      case 'u': arch(true); stem(left, base - xh, cy); stem(right, base - xh, base); break;
      case 'h': arch(false); stem(left, base - xh * 1.8, base); stem(right, cy, base); break;
      case 'l': stem(pen + w / 2, base - xh * 1.8, base); advance = w * 2.6; break;
      case 'i': stem(pen + w / 2, base - xh, base); g.fillRect(pen, base - xh * 1.45, w, w); advance = w * 2.6; break;
      case 'e': ring(); g.fillRect(left - w / 2, cy - w / 2, xh - w, w); break;
      case 'c': g.beginPath(); g.arc(cx, cy, r, Math.PI * 0.25, Math.PI * 1.75); g.stroke(); break;
      case 'p': ring(); stem(left, base - xh, base + xh * 0.8); break;
      case 'q': ring(); stem(right, base - xh, base + xh * 0.8); break;
      case 'r': g.beginPath(); g.arc(cx, cy, r, Math.PI, Math.PI * 1.6); g.stroke(); stem(left, base - xh, base); advance = xh * 0.8; break;
      case 't': stem(pen + xh * 0.3, base - xh * 1.6, base); g.fillRect(pen, base - xh, xh * 0.62, w); advance = xh * 0.75; break;
    }
    pen += advance;
  }
  return pen - x;
}

/** Rows of text-like bars, the grey of small type seen from across a room. */
export function textBars(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  rows: number,
  height: number,
  random: () => number,
  rounded = false,
) {
  for (let row = 0; row < rows; row++) {
    let pen = x;
    const end = x + width * (row === rows - 1 ? 0.4 + random() * 0.4 : 0.92 + random() * 0.08);
    const top = y + row * height * 2;
    while (pen < end - height) {
      const word = Math.min(end - pen, height * (1.2 + random() * 4.5));
      if (rounded) {
        g.beginPath();
        g.roundRect(pen, top, word, height, height / 2);
        g.fill();
      } else g.fillRect(pen, top, word, height);
      pen += word + height * 0.9;
    }
  }
}
