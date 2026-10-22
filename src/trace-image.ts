import ImageTracer from 'imagetracerjs';
import type { TracedImage, TracedShape } from '../kit/svg';

/** Opaque RGBA pixels, rows top to bottom: a canvas ImageData or anything shaped like one. */
export interface PixelImage { width: number; height: number; data: Uint8ClampedArray }

/** The longest side a picture is traced at. Larger photos are scaled down first. */
export const TRACE_SIDE = 480;

/** Six flat colours, small specks dropped, gentle curves: a poster, not a photocopy. */
const OPTIONS = { numberofcolors: 6, pathomit: 16, ltres: 1.5, qtres: 1.5, roundcoords: 1, blurradius: 3, blurdelta: 32, colorquantcycles: 3, mincolorratio: 0, strokewidth: 0, viewbox: true };

/** A colour owning more than this share of the border is taken for background. */
const BACKGROUND_SHARE = 0.2;

const channel = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');
const luminance = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Trace a picture into flat vector shapes, one per colour, with its background colours marked. */
export function traceImage(image: PixelImage, name: string, id: string): TracedImage {
  if (!(image.width > 0 && image.height > 0) || image.data.length < image.width * image.height * 4)
    throw new Error('The picture has no pixels to trace.');
  const options = ImageTracer.checkoptions({ ...OPTIONS });
  const traced = ImageTracer.imagedataToTracedata(image, options);
  const nearest = (r: number, g: number, b: number) => {
    let best = 0, distance = Infinity;
    traced.palette.forEach((colour, index) => {
      const d = (colour.r - r) ** 2 + (colour.g - g) ** 2 + (colour.b - b) ** 2;
      if (d < distance) { distance = d; best = index; }
    });
    return best;
  };
  // Which palette colours own the border: those are almost always the background.
  const owners = new Array(traced.palette.length).fill(0);
  let border = 0;
  const sample = (x: number, y: number) => {
    const p = (y * image.width + x) * 4;
    owners[nearest(image.data[p], image.data[p + 1], image.data[p + 2])]++;
    border++;
  };
  for (let x = 0; x < image.width; x += 2) { sample(x, 0); sample(x, image.height - 1); }
  for (let y = 0; y < image.height; y += 2) { sample(0, y); sample(image.width - 1, y); }

  const shapes: TracedShape[] = [];
  traced.layers.forEach((paths, index) => {
    // Hole paths are written inside their parent's path, so only parents are emitted.
    const d = paths
      .map((path, at) => (path.isholepath ? '' : /\sd="([^"]*)"/.exec(ImageTracer.svgpathstring(traced, index, at, options))?.[1] ?? ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!d) return;
    const { r, g, b, a } = traced.palette[index];
    shapes.push({
      d,
      fill: `#${channel(r)}${channel(g)}${channel(b)}`,
      tone: Number(luminance(r, g, b).toFixed(3)),
      background: a < 128 || owners[index] / Math.max(1, border) > BACKGROUND_SHARE,
    });
  });
  if (!shapes.length) throw new Error('Nothing could be traced from the picture.');
  // Never drop everything: a picture that is all border keeps its largest colour.
  if (shapes.every((shape) => shape.background)) shapes.reduce((a, b) => (b.d.length > a.d.length ? b : a)).background = false;
  return { id, name, width: image.width, height: image.height, shapes };
}

/** A short id from the name and the traced content, so the same picture traced twice keeps its id. */
export function traceId(name: string, shapes: readonly TracedShape[]): string {
  let hash = 2166136261;
  for (const shape of shapes) for (let i = 0; i < shape.d.length; i += 7) hash = Math.imul(hash ^ shape.d.charCodeAt(i), 16777619);
  const slug = name.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'trace';
  return `${slug}-${(hash >>> 0).toString(36).slice(0, 6)}`;
}
