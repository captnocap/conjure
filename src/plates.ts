import { generateSvg, rasterizeSvg } from './svg';
import type { Plan } from '../engine/director';
import { FRAME_SIZE, type Stage } from '../engine/stage';

/**
 * A presentation with more than one plate prints the others here. Every plate is the same
 * settled scene with the plate's own mood or framing, so no further decisions are asked.
 */
export interface PlateImage {
  title: string;
  canvas: HTMLCanvasElement;
}

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

function withPrint(svg: string, png: string) {
  return svg.replace(/(<svg\b[^>]*>)/, `$1<image x="0" y="0" width="${FRAME_SIZE}" height="${FRAME_SIZE}" href="${png}"/>`);
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/** Mount a plate's plan, print it with its look and lay its vector sheets over the print. */
export async function printPlate(stage: Stage, plan: Plan, signal: AbortSignal): Promise<HTMLCanvasElement> {
  await stage.mount(plan);
  signal.throwIfAborted();
  // Painted faces draw over the first few frames; let them land before the frame is captured.
  await wait(500);
  const capture = stage.capture();
  const result = await stage.develop(signal, capture);
  signal.throwIfAborted();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = FRAME_SIZE;
  const context = canvas.getContext('2d')!;
  if (!result) {
    context.drawImage($<HTMLCanvasElement>('#stage'), 0, 0, FRAME_SIZE, FRAME_SIZE);
    return canvas;
  }
  context.putImageData(new ImageData(new Uint8ClampedArray(result.pixels), FRAME_SIZE, FRAME_SIZE), 0, 0);
  const layers = (plan.design?.layers ?? []).filter((layer) => layer.visible && layer.opacity > 0);
  if (!layers.length) return canvas;
  const pixels = await rasterizeSvg(withPrint(generateSvg(FRAME_SIZE, layers, capture), canvas.toDataURL('image/png')), FRAME_SIZE, signal);
  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), FRAME_SIZE, FRAME_SIZE), 0, 0);
  return canvas;
}

/** The mat colour comes from the plates themselves, so a dark print sits on a dark mat. */
function matColour(plates: readonly PlateImage[]): string {
  let r = 0, g = 0, b = 0, count = 0;
  for (const plate of plates) {
    const context = plate.canvas.getContext('2d')!;
    for (const [x, y] of [[2, 2], [FRAME_SIZE - 3, 2], [2, FRAME_SIZE - 3], [FRAME_SIZE - 3, FRAME_SIZE - 3]]) {
      const [cr, cg, cb] = context.getImageData(x, y, 1, 1).data;
      r += cr; g += cg; b += cb; count++;
    }
  }
  if (!count) return '#e5e7de';
  const mix = (channel: number) => Math.round(channel / count * 0.85 + 235 * 0.15);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

const luminance = (colour: string) => {
  const [r, g, b] = colour.match(/\d+/g)!.map(Number);
  return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
};

/** Plates side by side on one mat, each titled, as a single picture to save. */
export function composeSeries(plates: readonly PlateImage[], idea: string): HTMLCanvasElement {
  const gutter = 28;
  const caption = 44;
  const canvas = document.createElement('canvas');
  canvas.width = plates.length * FRAME_SIZE + (plates.length + 1) * gutter;
  canvas.height = FRAME_SIZE + gutter + caption;
  const context = canvas.getContext('2d')!;
  const mat = matColour(plates);
  context.fillStyle = mat;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const ink = luminance(mat) > 0.5 ? 'rgba(32, 54, 44, 0.85)' : 'rgba(240, 243, 232, 0.85)';
  context.fillStyle = ink;
  context.textBaseline = 'alphabetic';
  plates.forEach((plate, index) => {
    const x = gutter + index * (FRAME_SIZE + gutter);
    context.drawImage(plate.canvas, x, gutter, FRAME_SIZE, FRAME_SIZE);
    context.font = '20px Georgia, "Times New Roman", serif';
    context.textAlign = 'left';
    context.fillText(plate.title, x + 2, gutter + FRAME_SIZE + 28);
  });
  context.font = '14px system-ui, sans-serif';
  context.textAlign = 'right';
  context.fillText(idea.length > 90 ? `${idea.slice(0, 89)}…` : idea, canvas.width - gutter - 2, gutter + FRAME_SIZE + 28);
  return canvas;
}

/** Show the plates under the frame; clicking one opens it large. */
export function showSeries(plates: readonly PlateImage[] | null, kind: string) {
  const host = $('#plates');
  host.replaceChildren();
  host.hidden = !plates;
  if (!plates) return;
  const heading = document.createElement('p');
  heading.className = 'plates-title';
  heading.textContent = `${kind}: ${plates.length} plates from the same decisions`;
  host.append(heading);
  const row = document.createElement('div');
  row.className = 'plates-row';
  for (const plate of plates) {
    const figure = document.createElement('figure');
    const image = new Image();
    image.src = plate.canvas.toDataURL('image/jpeg', 0.9);
    image.alt = `${plate.title}: one plate of the series`;
    const caption = document.createElement('figcaption');
    caption.textContent = plate.title;
    figure.append(image, caption);
    figure.addEventListener('click', () => {
      const dialog = $<HTMLDialogElement>('#plate-view');
      const large = dialog.querySelector('img')!;
      large.src = image.src;
      large.alt = image.alt;
      dialog.querySelector('figcaption')!.textContent = plate.title;
      dialog.showModal();
    });
    row.append(figure);
  }
  host.append(row);
}
