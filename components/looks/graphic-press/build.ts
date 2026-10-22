import { choice, defineLook, score } from '@conjure/kit';

const PALETTES = {
  harbour: ['#183b54', '#f0eada', '#d47843'],
  forest: ['#26443a', '#edf0d9', '#b08346'],
  berry: ['#472841', '#f0dfe2', '#e48276'],
  cobalt: ['#18399b', '#f0efdf', '#f08b3d'],
  charcoal: ['#242627', '#ece8de', '#a39782'],
  neon: ['#18172d', '#ddd9ee', '#4ce3cd'],
} as const;
const rgb = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const clamp = (n: number) => Math.max(0, Math.min(255, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default defineLook({
  questions: {
    process: choice('Which graphic printing process should describe the scene?', {
      blueprint: 'A technical blueprint: light contour lines on deep blue paper.',
      cyanotype: 'A cyanotype: pale highlights and botanical silhouettes in Prussian blue.',
      risograph: 'A two-ink risograph: coarse dots, coloured shadows and imperfect registration.',
      comic: 'A graphic novel panel: flat colour, dark contours and restrained halftone.',
      woodcut: 'A woodcut: cut-away highlights, strong dark masses and carved hatching.',
      stencil: 'A paper-cut stencil: broad coloured silhouettes and a clean limited palette.',
      glass: 'A stained-glass picture: luminous coloured facets with dark leading.',
      thermal: 'A thermal image: deep violet shadows passing through red to bright gold.',
      pixel: 'A pixel illustration: deliberately stepped edges and a small ordered palette.',
      engraving: 'A copperplate engraving: fine contour strokes and dense cross-hatched shadows.',
    }),
    palette: choice('Which family of inks suits the print?', {
      harbour: 'Navy, ivory and rusty orange, like a harbour chart.',
      forest: 'Pine green, soft cream and ochre, botanical and earthy.',
      berry: 'Plum, pale rose and coral, intimate and playful.',
      cobalt: 'Cobalt blue and vivid orange on warm white, bold and modern.',
      charcoal: 'Charcoal, pale paper and muted stone, nearly monochrome.',
      neon: 'Indigo, lavender and luminous mint, electric and nocturnal.',
    }),
    contrast: score('How strongly should the print separate its light and dark areas?', ['Soft tonal transitions', 'Gentle', 'Crisp', 'Strong', 'Severe black and white masses']),
    grain: score('How much visible printing grain remains?', ['Perfectly clean', 'A trace', 'Fine paper grain', 'Rough ink', 'Heavy stippling']),
    contours: score('How prominent are the contours and structural boundaries?', ['Barely visible', 'Fine', 'Clear', 'Bold', 'Very heavy']),
    linework: choice('If a patterned ink is used, how are the marks arranged?', {
      diagonal: 'Even diagonal strokes.', cross: 'Cross-hatching in two diagonal directions.',
      wave: 'Fine undulating engraved lines.', dots: 'An orderly screen of round halftone dots.',
      none: 'No patterned ink: unbroken flat fields.',
    }),
    detail: choice('How finely does the graphic process resolve small details?', {
      fine: 'Fine marks and small facets, keeping the smallest structures.',
      medium: 'A balanced scale of marks, with a few simplified details.',
      coarse: 'Large dots, broad facets or chunky pixels, strongly simplified.',
    }),
    registration: choice('If coloured inks overlap, how precisely do they align?', {
      clean: 'Exactly aligned, careful printing.', warm: 'A tiny warm ink offset, like a handmade print.',
      cyan: 'A subtle cyan edge shifted to one side.', doubled: 'Two faint offset impressions, a slightly haunted image.',
    }),
    paper: choice('What kind of paper holds the picture?', {
      white: 'Bright clean paper.', cream: 'Warm cream rag paper.',
      slate: 'Dark slate paper, for a luminous picture.', tinted: 'Paper gently tinted with the accent ink.',
    }),
  },

  async apply(capture, a, context, signal) {
    const { size, color, identity, normal } = capture;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const [inkHex, paperHex, accentHex] = PALETTES[a.palette];
    const ink = rgb(inkHex), accent = rgb(accentHex);
    let paper = rgb(a.paper === 'white' ? '#faf9f0' : a.paper === 'cream' ? '#e9dfc6' : paperHex);
    if (a.paper === 'slate') paper = rgb('#282b38');
    if (a.paper === 'tinted') paper = paper.map((c, i) => lerp(c, accent[i], 0.2));
    const unit = { fine: 3, medium: 6, coarse: 10 }[a.detail];
    const pixelated = a.process === 'pixel';
    const facetSize = unit * 3;
    const contrast = 0.7 + a.contrast * 1.9;
    const width = Math.max(1, Math.round(1 + a.contours * 2));
    const shifted = a.registration === 'clean' ? 0 : a.registration === 'doubled' ? 3 : 1;

    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) {
        signal.throwIfAborted();
        // Keep the page responsive and let a cancelled print actually stop.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      for (let x = 0; x < size; x++) {
        const out = (y * size + x) * 4;
        const sx = pixelated ? Math.min(size - 1, Math.floor(x / unit) * unit + Math.floor(unit / 2)) : x;
        const sy = pixelated ? Math.min(size - 1, Math.floor(y / unit) * unit + Math.floor(unit / 2)) : y;
        const sample = (sy * size + sx) * 4;
        const luminance = (color[sample] * 0.2126 + color[sample + 1] * 0.7152 + color[sample + 2] * 0.0722) / 255;
        const noise = pixelated
          ? (((Math.imul(Math.floor(x / unit) + 1, 73856093) ^ Math.imul(Math.floor(y / unit) + 1, 19349663) ^ context.seed) >>> 0) % 1024) / 1024
          : context.random();
        const grain = (noise - 0.5) * a.grain * 0.15;
        const tone = Math.max(0, Math.min(1, (luminance - 0.5) * contrast + 0.5 + grain));
        const dark = 1 - tone;
        let edge = 0;
        const edgeWidth = pixelated ? unit : width;
        for (const [dx, dy] of [[edgeWidth, 0], [0, edgeWidth]]) {
          const neighbour = (Math.min(size - 1, sy + dy) * size + Math.min(size - 1, sx + dx)) * 4;
          if (identity[sample] !== identity[neighbour]) edge = 1;
          else edge = Math.max(edge, (Math.abs(normal[sample] - normal[neighbour]) + Math.abs(normal[sample + 1] - normal[neighbour + 1])) / 150);
        }
        edge = Math.min(1, edge) * (0.15 + a.contours * 0.85);
        const mark = a.linework === 'none' ? 0 : a.linework === 'dots'
          ? (Math.hypot(x % unit - unit / 2, y % unit - unit / 2) < dark * unit * 0.6 ? 1 : 0)
          : a.linework === 'wave' ? (Math.abs(Math.sin(y / unit * 2 + Math.sin(x / 18))) > 1 - dark * 0.45 ? 1 : 0)
          : (((x + y) % unit < dark * unit * 0.5 || a.linework === 'cross' && (x - y + size * unit) % unit < dark * unit * 0.4) ? 1 : 0);
        let value: number[];

        switch (a.process) {
          case 'blueprint': {
            const bg = rgb('#173957'), line = rgb('#c8edf0');
            const grid = x % (unit * 8) === 0 || y % (unit * 8) === 0 ? 0.12 : 0;
            const strength = Math.min(1, edge * 0.95 + mark * 0.07 + grid);
            value = bg.map((c, i) => lerp(c, line[i], strength));
            break;
          }
          case 'cyanotype': {
            const blue = rgb('#204ba1');
            value = blue.map((c, i) => lerp(c, paper[i], Math.pow(tone, 1.25)) * (1 - edge * 0.25));
            break;
          }
          case 'thermal': {
            const ramp = [rgb('#251038'), rgb('#633ca5'), rgb('#ce4769'), rgb('#f5953d'), rgb('#fff2a6')];
            const at = tone * 3.999, low = Math.floor(at);
            value = ramp[low].map((c, i) => lerp(c, ramp[low + 1][i], at - low) * (1 - edge * 0.35));
            break;
          }
          case 'woodcut':
          case 'engraving': {
            const density = a.process === 'woodcut' ? (dark > 0.62 ? 0.98 : mark * dark) : mark * Math.sqrt(dark);
            value = paper.map((c, i) => lerp(c, ink[i], Math.min(1, density + edge)));
            break;
          }
          case 'risograph': {
            const other = (y * size + Math.max(0, Math.min(size - 1, x + shifted))) * 4;
            const warm = (color[other] - color[other + 2] + 255) / 510;
            value = paper.map((c, i) => lerp(lerp(c, accent[i], warm * dark * 0.95), ink[i], Math.min(1, mark * dark * 0.75 + edge * 0.7)));
            break;
          }
          case 'stencil': {
            const swatch = tone < 0.35 ? ink : tone < 0.68 ? accent : paper;
            value = swatch.map((c, i) => lerp(c, ink[i], edge * 0.55));
            break;
          }
          default: {
            const levels = a.process === 'pixel' ? 4 : a.process === 'comic' ? 5 : 7;
            const tint = Math.round(tone * levels) / levels;
            const leading = a.process === 'glass' && identity[out] >= 2 &&
              (x % facetSize === 0 || y % facetSize === 0) ? 0.65 : edge;
            const facet = ((Math.imul(Math.floor(x / facetSize) + 1, 37) ^ Math.imul(Math.floor(y / facetSize) + 1, 67) ^ context.seed) >>> 0) % 7 / 6;
            value = [0, 1, 2].map((i) => {
              const base = lerp(ink[i], color[sample + i], 0.6);
              let flat = lerp(base, paper[i], tint * 0.8);
              if (a.process === 'glass' && identity[out] >= 2) flat = lerp(flat, accent[i], facet * 0.2);
              return lerp(flat, ink[i], Math.min(1, leading + (a.process === 'comic' ? mark * dark * 0.18 : 0)));
            });
          }
        }
        if (shifted && a.process !== 'risograph' && edge < 0.2) {
          const other = (sy * size + Math.max(0, sx - shifted * (pixelated ? unit : 1))) * 4;
          const fringe = Math.abs(color[other] - color[sample]) / 255 * 0.5;
          const tint = a.registration === 'cyan' ? [70, 205, 216] : accent;
          value = value.map((c, i) => lerp(c, tint[i], fringe));
        }
        for (let i = 0; i < 3; i++) pixels[out + i] = clamp(value[i] + grain * 80);
        pixels[out + 3] = 255;
      }
    }
    return { pixels, notes: [`${a.process} in ${a.palette} inks`, `${a.detail} detail, ${a.paper} paper`, `${a.linework} marks, ${a.registration} registration`] };
  },
});
