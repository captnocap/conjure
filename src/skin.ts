import { CATALOGUE } from '../engine/catalogue';

/**
 * The page wears the picture it shows. Its paper, ink and accent are drawn from the print's own
 * pixels, and its chrome takes the post effects of the print's medium: misregistered ink and a dot
 * screen for prints, scanlines and a colour split for optical looks, a wet wobble for paintings,
 * stepped pixel edges for game graphics, stitched and cut edges for craft, grain for photographs.
 * A handful of looks with a strong signature of their own refine their medium's effects.
 */
type Rgb = [number, number, number];

const DEFAULT_SKIN = 'plain';
/** Looks whose signature is stronger than their medium's. */
const SIGNATURES = new Set(['looks/xerox-noir', 'looks/crt-broadcast', 'looks/thermal-scan', 'looks/blueprint', 'looks/halftone-comic', 'looks/stained-glass', 'looks/neon-vaporwave', 'looks/cartridge-64', 'looks/watercolor-studio', 'looks/cross-stitch']);

const luminance = ([r, g, b]: Rgb) => {
  const channel = (value: number) => { const v = value / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const contrast = (a: Rgb, b: Rgb) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
const css = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;
const saturation = ([r, g, b]: Rgb) => { const max = Math.max(r, g, b), min = Math.min(r, g, b); return max === 0 ? 0 : (max - min) / max; };
const mean = (pixels: Rgb[]): Rgb => {
  if (!pixels.length) return [128, 128, 128];
  const sum = pixels.reduce((total, pixel) => [total[0] + pixel[0], total[1] + pixel[1], total[2] + pixel[2]], [0, 0, 0]);
  return sum.map((value) => Math.round(value / pixels.length)) as Rgb;
};
const BLACK: Rgb = [10, 10, 12];
const WHITE: Rgb = [250, 249, 245];

/** Push `color` toward black or white until it reads against `ground` at `ratio`. */
function legible(color: Rgb, ground: Rgb, ratio: number): Rgb {
  const toward = luminance(ground) > 0.4 ? BLACK : WHITE;
  for (let t = 0; t <= 1; t += 0.05) { const tried = mix(color, toward, t); if (contrast(tried, ground) >= ratio) return tried; }
  return toward;
}

/** A small grid of the picture's pixels. */
export function sample(source: CanvasImageSource, region?: { x: number; y: number; width: number; height: number }, grid = 40): Rgb[] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = grid;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  if (region) context.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, grid, grid);
  else context.drawImage(source, 0, 0, grid, grid);
  const data = context.getImageData(0, 0, grid, grid).data;
  const pixels: Rgb[] = [];
  for (let at = 0; at < data.length; at += 4) pixels.push([data[at], data[at + 1], data[at + 2]]);
  return pixels;
}

/** The liveliest colour in a set of pixels: the mean of its most saturated tenth, lifted off the dark. */
export function vivid(pixels: Rgb[]): Rgb {
  const ranked = [...pixels].sort((a, b) => saturation(b) * (0.4 + Math.max(...b) / 425) - saturation(a) * (0.4 + Math.max(...a) / 425));
  const top = mean(ranked.slice(0, Math.max(1, Math.round(ranked.length / 10))));
  return Math.max(...top) < 90 ? mix(top, WHITE, 0.35) : top;
}

/** How colourful a set of pixels looks (Hasler and Süsstrunk's measure). */
export function colourfulness(pixels: Rgb[]): number {
  const rg = pixels.map(([r, g]) => r - g);
  const yb = pixels.map(([r, g, b]) => (r + g) / 2 - b);
  const stats = (values: number[]) => { const m = values.reduce((sum, value) => sum + value, 0) / values.length; return [m, Math.sqrt(values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length)]; };
  const [mrg, srg] = stats(rg), [myb, syb] = stats(yb);
  return Math.hypot(srg, syb) + 0.3 * Math.hypot(mrg, myb);
}

export interface Palette { paper: Rgb; ink: Rgb; accent: Rgb; dark: boolean }

/** Paper from the picture's prevailing tone, ink from its far end, accent from its liveliest colour. */
export function paletteOf(pixels: Rgb[]): Palette {
  const sorted = [...pixels].sort((a, b) => luminance(a) - luminance(b));
  const average = mean(pixels);
  const dark = luminance(average) < 0.22;
  const darkest = mean(sorted.slice(0, Math.ceil(sorted.length / 8)));
  const lightest = mean(sorted.slice(-Math.ceil(sorted.length / 8)));
  const paper = dark ? mix(darkest, BLACK, 0.45) : mix(mix(average, lightest, 0.5), WHITE, 0.7);
  const ink = legible(dark ? mix(lightest, WHITE, 0.5) : mix(darkest, BLACK, 0.35), paper, 9);
  const accent = legible(vivid(pixels), paper, 3.2);
  return { paper, ink, accent, dark };
}

function mediumOf(lookId: string | null | undefined): string {
  if (!lookId) return DEFAULT_SKIN;
  const entry = CATALOGUE.find((candidate) => candidate.id === lookId) as { medium?: string } | undefined;
  return entry?.medium ?? 'mixed';
}

/** The page's SVG filters, put in once. */
function installFilters() {
  if (document.querySelector('#skin-filters')) return;
  const holder = document.createElement('div');
  holder.innerHTML = `<svg id="skin-filters" width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="skin-wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
    <filter id="skin-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>
  </svg>`;
  document.body.append(holder.firstElementChild!);
}

/** A skin being taken off: its effects stay while its overlay fades, then go. */
let leaving = 0;
/** How long the overlay takes to fade before the medium's effects come off. */
const LEAVE_MS = 600;

/** Dress the page in a picture: its colours, and the effects of the look that made it. */
export function wear(source: CanvasImageSource | null, lookId?: string | null) {
  installFilters();
  const root = document.documentElement;
  const body = document.body;
  clearTimeout(leaving);
  body.classList.remove('skin-leaving');
  if (!source) {
    // The colours ease back through the typed tokens; the overlay fades first, then the effects come off.
    for (const name of ['--paper', '--sheet', '--ink', '--faint', '--rule', '--accent', '--frame-ground']) root.style.removeProperty(name);
    if (body.dataset.skin === DEFAULT_SKIN) return;
    body.classList.add('skin-leaving');
    leaving = window.setTimeout(() => {
      root.style.colorScheme = '';
      body.dataset.skin = DEFAULT_SKIN;
      delete body.dataset.look;
      body.classList.remove('dark-skin', 'skin-leaving');
    }, LEAVE_MS);
    return;
  }
  const { paper, ink, accent, dark } = paletteOf(sample(source));
  root.style.setProperty('--paper', css(paper));
  root.style.setProperty('--sheet', css(mix(paper, ink, 0.05)));
  root.style.setProperty('--ink', css(ink));
  root.style.setProperty('--faint', css(legible(mix(ink, paper, 0.45), paper, 4.5)));
  root.style.setProperty('--rule', css(mix(ink, paper, 0.78)));
  root.style.setProperty('--accent', css(accent));
  root.style.setProperty('--frame-ground', css(mix(paper, ink, 0.1)));
  const skin = mediumOf(lookId);
  const look = lookId && SIGNATURES.has(lookId) ? lookId.replace('looks/', '') : undefined;
  const put = () => {
    root.style.colorScheme = dark ? 'dark' : 'light';
    body.classList.toggle('dark-skin', dark);
    body.dataset.skin = skin;
    if (look) body.dataset.look = look;
    else delete body.dataset.look;
    body.classList.remove('skin-leaving');
  };
  // From one medium to another, the old overlay fades out before the new one fades in.
  if (body.dataset.skin && body.dataset.skin !== DEFAULT_SKIN && (body.dataset.skin !== skin || body.dataset.look !== look)) {
    body.classList.add('skin-leaving');
    leaving = window.setTimeout(put, LEAVE_MS / 2);
  } else put();
}
