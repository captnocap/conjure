/**
 * A tiny brush-stroke font. The check browser has no Japanese typeface, so the handful of
 * characters a back alley needs are drawn as strokes on a unit square (y down).
 */
type Stroke = readonly (readonly [number, number])[];
const BOX = (l: number, t: number, r: number, b: number): Stroke => [[l, t], [r, t], [r, b], [l, b], [l, t]];
export const GLYPHS: Record<string, readonly Stroke[]> = {
  大: [[[0.12, 0.36], [0.88, 0.36]], [[0.5, 0.08], [0.5, 0.4], [0.4, 0.68], [0.12, 0.92]], [[0.5, 0.4], [0.62, 0.68], [0.9, 0.92]]],
  吉: [[[0.14, 0.24], [0.86, 0.24]], [[0.5, 0.06], [0.5, 0.46]], [[0.26, 0.46], [0.74, 0.46]], BOX(0.28, 0.62, 0.72, 0.92)],
  酒: [[[0.1, 0.14], [0.2, 0.22]], [[0.06, 0.4], [0.17, 0.47]], [[0.06, 0.9], [0.2, 0.66]], [[0.32, 0.12], [0.96, 0.12]], BOX(0.36, 0.3, 0.92, 0.92), [[0.55, 0.12], [0.55, 0.5], [0.46, 0.6]], [[0.73, 0.12], [0.73, 0.52], [0.84, 0.58]], [[0.36, 0.74], [0.92, 0.74]]],
  生: [[[0.3, 0.1], [0.16, 0.4]], [[0.26, 0.3], [0.82, 0.3]], [[0.5, 0.08], [0.5, 0.9]], [[0.28, 0.58], [0.74, 0.58]], [[0.1, 0.9], [0.9, 0.9]]],
  山: [[[0.5, 0.08], [0.5, 0.86]], [[0.14, 0.4], [0.14, 0.86], [0.86, 0.86], [0.86, 0.4]]],
  本: [[[0.1, 0.32], [0.9, 0.32]], [[0.5, 0.06], [0.5, 0.95]], [[0.5, 0.34], [0.34, 0.6], [0.1, 0.8]], [[0.5, 0.34], [0.66, 0.6], [0.9, 0.8]], [[0.34, 0.72], [0.66, 0.72]]],
  天: [[[0.2, 0.16], [0.8, 0.16]], [[0.1, 0.44], [0.9, 0.44]], [[0.5, 0.16], [0.5, 0.46], [0.38, 0.7], [0.12, 0.92]], [[0.5, 0.46], [0.64, 0.72], [0.9, 0.92]]],
  円: [[[0.18, 0.94], [0.18, 0.12], [0.82, 0.12], [0.82, 0.9], [0.72, 0.94]], [[0.5, 0.12], [0.5, 0.52]], [[0.18, 0.52], [0.82, 0.52]]],
  千: [[[0.72, 0.08], [0.28, 0.2]], [[0.08, 0.46], [0.92, 0.46]], [[0.5, 0.16], [0.5, 0.95]]],
  中: [BOX(0.16, 0.28, 0.84, 0.64), [[0.5, 0.05], [0.5, 0.96]]],
  ラ: [[[0.26, 0.14], [0.74, 0.14]], [[0.12, 0.4], [0.86, 0.4], [0.76, 0.66], [0.42, 0.92]]],
  ー: [[[0.5, 0.1], [0.5, 0.9]]],
  メ: [[[0.76, 0.1], [0.56, 0.5], [0.18, 0.9]], [[0.26, 0.32], [0.82, 0.76]]],
  ン: [[[0.14, 0.2], [0.34, 0.33]], [[0.14, 0.88], [0.6, 0.7], [0.88, 0.28]]],
};

/** Draw one glyph into the square at (x, y) of side `size`, with a round brush. */
export function drawGlyph(g: CanvasRenderingContext2D, char: string, x: number, y: number, size: number, ink: string, weight = 0.11) {
  const strokes = GLYPHS[char];
  if (!strokes) return;
  g.save();
  g.strokeStyle = ink; g.lineWidth = size * weight; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const stroke of strokes) {
    g.beginPath();
    stroke.forEach(([px, py], index) => (index ? g.lineTo(x + px * size, y + py * size) : g.moveTo(x + px * size, y + py * size)));
    g.stroke();
  }
  g.restore();
}

/** A vertical column of glyphs centred on cx, filling from `top` downward. */
export function drawColumn(g: CanvasRenderingContext2D, text: string, cx: number, top: number, size: number, ink: string, weight = 0.11) {
  [...text].forEach((char, index) => drawGlyph(g, char, cx - size / 2, top + index * size * 1.08, size, ink, weight));
}
