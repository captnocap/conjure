import { generateSvg, rasterizeSvg } from './svg';
import type { Plan } from '../engine/director';
import type { Stage } from '../engine/stage';
import type { Capture } from '@conjure/kit';

/**
 * The window print: the same held scene with the camera's view widened until it fills the whole
 * browser window, developed by the same look. The square print is the frame's own crop of it: the
 * widened view is laid out so the original view lands exactly where the frame sits on screen, so
 * behind the frame the scene carries on to the edges of the window. Everything is measured from
 * the person's actual window when the idea is conjured.
 */
export interface WindowView {
  /** The window, in CSS pixels, when the print was made. */
  width: number;
  height: number;
  /** Where the square frame sat in that window. */
  frame: { x: number; y: number; size: number };
}

/** The widest print side: the looks' cost grows with the square of it. */
export const MAX_WINDOW_SIDE = 2048;

/** The window as it is now, or null when it is hardly bigger than the frame and widening would add nothing. */
export function measureWindow(frame: HTMLElement): WindowView | null {
  const rect = frame.getBoundingClientRect();
  if (rect.width < 120 || innerWidth * innerHeight < rect.width * rect.width * 1.5) return null;
  return { width: innerWidth, height: innerHeight, frame: { x: rect.left, y: rect.top, size: rect.width } };
}

/**
 * The film is a square of side max(width, height) CSS pixels with the window at its top left. In the
 * original view's normalised device coordinates the frame spans -1..1; these are the film's edges.
 */
export function filmOf(view: WindowView) {
  const side = Math.max(view.width, view.height);
  const unit = 2 / view.frame.size;
  return {
    side,
    left: -1 - view.frame.x * unit,
    right: -1 + (side - view.frame.x) * unit,
    top: 1 + view.frame.y * unit,
    bottom: 1 - (side - view.frame.y) * unit,
    /** Print pixels for the film's side: about one per CSS pixel, within the cap. */
    pixels: Math.min(MAX_WINDOW_SIDE, Math.round(side)),
  };
}

/** Develop a wide capture with the plan's look and vector sheets, cropped to the window. */
export async function developWindow(stage: Stage, plan: Plan, capture: Capture, view: WindowView, signal: AbortSignal): Promise<HTMLCanvasElement> {
  const size = capture.size;
  const result = await stage.develop(signal, capture);
  signal.throwIfAborted();
  const square = document.createElement('canvas');
  square.width = square.height = size;
  const context = square.getContext('2d')!;
  context.putImageData(new ImageData(new Uint8ClampedArray(result ? result.pixels : capture.color), size, size), 0, 0);
  const layers = (plan.design?.layers ?? []).filter((layer) => layer.visible && layer.opacity > 0);
  if (layers.length) {
    // The sheets are drawn in a 720-unit viewBox whatever the pixel size; the print goes under them in the same units.
    const svg = generateSvg(size, layers, capture).replace(/(<svg\b[^>]*>)/, `$1<image x="0" y="0" width="720" height="720" href="${square.toDataURL('image/png')}"/>`);
    const pixels = await rasterizeSvg(svg, size, signal);
    context.putImageData(new ImageData(new Uint8ClampedArray(pixels), size, size), 0, 0);
  }
  const scale = size / Math.max(view.width, view.height);
  const cropped = document.createElement('canvas');
  cropped.width = Math.round(view.width * scale);
  cropped.height = Math.round(view.height * scale);
  cropped.getContext('2d')!.drawImage(square, 0, 0, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped;
}

/** Lays the window print behind the page so its frame region sits under the frame, through scrolling and resizing. */
export function installWindowPrint(frame: HTMLElement) {
  const holder = document.createElement('div');
  holder.id = 'window-print';
  holder.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.alt = '';
  holder.append(image);
  document.body.prepend(holder);
  let view: WindowView | null = null;

  const place = () => {
    if (!view || !image.naturalWidth) return;
    if (document.body.classList.contains('window-view')) {
      // Filling the window: the print covers it, centred.
      const scale = Math.max(innerWidth / view.width, innerHeight / view.height);
      Object.assign(image.style, { left: `${(innerWidth - view.width * scale) / 2}px`, top: `${(innerHeight - view.height * scale) / 2}px`, width: `${view.width * scale}px`, height: `${view.height * scale}px` });
      return;
    }
    const rect = frame.getBoundingClientRect();
    if (!rect.width) return;
    const scale = rect.width / view.frame.size;
    Object.assign(image.style, {
      left: `${rect.left + scrollX - view.frame.x * scale}px`,
      top: `${rect.top + scrollY - view.frame.y * scale}px`,
      width: `${view.width * scale}px`,
      height: `${view.height * scale}px`,
    });
  };
  new ResizeObserver(place).observe(frame);
  addEventListener('resize', place);
  image.addEventListener('load', () => { place(); document.body.classList.add('windowed'); });

  return {
    show(url: string, shown: WindowView) {
      view = shown;
      if (image.src === url && image.complete) { place(); document.body.classList.add('windowed'); return; }
      image.src = url;
    },
    clear() {
      view = null;
      image.removeAttribute('src');
      document.body.classList.remove('windowed', 'window-view');
    },
    get shown() { return !!view; },
    place,
  };
}
