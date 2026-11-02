import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    stitch: choice('How are the rows of beads stitched together?', {
      loom: 'Straight loom rows with a bead at every crossing.',
      peyote: 'Alternating rows sit half a bead apart, like tiny bricks.',
      herringbone: 'Pairs lean toward one another in repeating chevrons.',
      net: 'An open diamond net leaves more backing visible.',
    }),
    bead: choice('What shape are the beads?', {
      seed: 'Round seed beads with a small central hole.',
      cylinder: 'Straight-sided cylinder beads with flat faces.',
      faceted: 'Tiny cut-glass beads with four bright facets.',
      oval: 'Elongated oval beads with a broad curved face.',
    }),
    gauge: score('How small are the beads compared with the picture?', ['Bold large beads', 'Coarse decorative panel', 'Medium beadwork', 'Fine miniature rows', 'Tiny detailed seed beads']),
    material: choice('What material catches the light on each bead?', {
      ceramic: 'Opaque matte ceramic with quiet diffuse highlights.',
      glass: 'Translucent coloured glass with a bright little rim.',
      pearl: 'Pearlescent beads with a soft shifting milky sheen.',
      metallic: 'Metal-lined beads with a sharp bright reflection.',
    }),
    palette: choice('What character do the bead colours have? Hues follow the picture palette.', {
      folk: 'Strong warm and cool colours over a pale base.',
      mineral: 'Stone, earth and a restrained dark accent.',
      bright: 'Clean saturated colours with clear black and white.',
      dusk: 'Dark subdued colours with a few pale luminous beads.',
    }),
    colourCount: choice('How many colours does the maker keep in the pattern?', {
      two: 'Two contrasting bead colours make a graphic silhouette.',
      four: 'Four broad tonal colours describe the scene.',
      six: 'Six colours preserve small figures and objects.',
      full: 'A wide range follows the scene’s local colours.',
    }),
    thread: choice('What thread is visible between the beads?', {
      pale: 'Pale waxed thread visible between close rows.',
      dark: 'Fine dark thread drawing the bead grid.',
      gold: 'Golden cord flashes in the gaps.',
      hidden: 'Nearly hidden thread merges with the backing.',
    }),
    backing: choice('What backing holds the beadwork?', {
      linen: 'Pale linen with a fine woven tooth.',
      felt: 'Dark felt with a soft matte surface.',
      leather: 'Warm leather with a small pebbled grain.',
      velvet: 'Deep velvet that makes the beads glow.',
    }),
    edge: choice('How is the edge of the bead panel finished?', {
      full: 'The bead pattern fills the frame.',
      plain: 'A simple two-row light bead border.',
      diamonds: 'A repeating diamond border in two contrasting bead colours.',
      tassels: 'A narrow border with short beaded tassels hanging below.',
    }),
    history: choice('What trace of making or use is visible?', {
      complete: 'Every bead is in place in a finished panel.',
      missing: 'A few scattered beads are missing, exposing the backing.',
      repaired: 'One small patch has been repaired with a contrasting bead colour.',
      unfinished: 'The lower corner still shows unfilled rows of thread.',
    }),
  },
  async apply(capture, a, context, signal) {
    const { size, color, identity, normal } = capture;
    const output = new Uint8ClampedArray(size * size * 4), unit = size / 720;
    const sets = {
      folk: { dark: [40, 45, 48], middle: [143, 85, 55], light: [236, 217, 174], accent: [55, 139, 136], second: [180, 135, 57] },
      mineral: { dark: [48, 50, 43], middle: [130, 123, 96], light: [227, 216, 186], accent: [142, 81, 61], second: [99, 136, 131] },
      bright: { dark: [24, 26, 33], middle: [178, 52, 64], light: [244, 235, 211], accent: [28, 135, 166], second: [232, 181, 40] },
      dusk: { dark: [26, 30, 40], middle: [85, 70, 91], light: [213, 212, 188], accent: [104, 143, 135], second: [165, 113, 75] },
    } as const;
    const dyes = rekey(sets[a.palette], context.palette, { dark: 'ink', middle: 'ink', light: 'ground', accent: 'second', second: 'second' });
    const halfLight = [mix(dyes.middle[0], dyes.light[0], 0.5), mix(dyes.middle[1], dyes.light[1], 0.5), mix(dyes.middle[2], dyes.light[2], 0.5)] as const;
    const colours = a.colourCount === 'two' ? [dyes.dark, dyes.light] : a.colourCount === 'four' ? [dyes.dark, dyes.middle, dyes.light, dyes.accent] : [...Object.values(dyes), halfLight];
    const background = { linen: [223, 213, 187], felt: [58, 58, 56], leather: [130, 88, 53], velvet: [33, 29, 40] }[a.backing];
    const cord = a.thread === 'pale' ? [227, 220, 197] : a.thread === 'dark' ? [36, 33, 29] : a.thread === 'gold' ? [194, 152, 64] : background;
    const baseGauge = mix(7, 3.2, a.gauge) * unit;
    const bounds = new Map<number, number[]>();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const id = identity[(y * size + x) * 4], b = bounds.get(id) ?? [x, y, x, y];
      b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); bounds.set(id, b);
    }
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size;
        const id = identity[p], b = bounds.get(id)!;
        const gauge = id >= 3 ? Math.max(1.4 * unit, Math.min(baseGauge, Math.max(b[2] - b[0], b[3] - b[1]) / 20)) : baseGauge;
        const rows = size / gauge;
        const row = Math.floor(y / gauge), shift = a.stitch === 'peyote' || a.stitch === 'net' ? (row % 2) * 0.5 : 0;
        const col = Math.floor(x / gauge - shift);
        const centreX = (col + shift + 0.5) * gauge, centreY = (row + 0.5) * gauge;
        let dx = (x - centreX) / gauge, dy = (y - centreY) / gauge;
        if (a.stitch === 'herringbone') { const angle = col % 2 ? 0.28 : -0.28; const oldX = dx; dx = oldX * Math.cos(angle) - dy * Math.sin(angle); dy = oldX * Math.sin(angle) + dy * Math.cos(angle); }
        const radiusX = a.bead === 'oval' ? 0.41 : a.stitch === 'net' ? 0.45 : 0.49, radiusY = a.bead === 'oval' ? 0.49 : a.stitch === 'net' ? 0.45 : 0.49;
        const radial = a.bead === 'cylinder' ? Math.max(Math.abs(dx) / radiusX, Math.abs(dy) / radiusY) : Math.hypot(dx / radiusX, dy / radiusY);
        const sx = Math.max(0, Math.min(size - 1, Math.round(centreX))), sy = Math.max(0, Math.min(size - 1, Math.round(centreY)));
        const sample = (sy * size + sx) * 4, q = identity[sample] === identity[p] ? sample : p;
        const raw = [color[q], color[q + 1], color[q + 2]];
        let luminance = (raw[0] * 0.2126 + raw[1] * 0.7152 + raw[2] * 0.0722) / 255;
        const step = Math.max(1, Math.round(unit));
        const right = (y * size + Math.min(size - 1, x + step)) * 4;
        const down = (Math.min(size - 1, y + step) * size + x) * 4;
        const contour = id >= 2 && (id !== identity[right] || id !== identity[down] || Math.abs(normal[p] - normal[right]) + Math.abs(normal[p + 1] - normal[down + 1]) > 80);
        if (id >= 2) luminance = Math.min(luminance, 0.92);
        if (contour) luminance *= 0.53;
        let best = colours[0], distance = Infinity;
        for (const candidate of colours) {
          const d = candidate.reduce((sum, value, c) => sum + (value - raw[c]) ** 2, 0);
          if (d < distance) { distance = d; best = candidate; }
        }
        const edge = Math.min(u, v, 1 - u, 1 - v);
        const border = a.edge !== 'full' && edge < 0.028;
        const tassel = a.edge === 'tassels' && v > 0.94;
        const missed = a.history === 'missing' && hash(col, row, context.seed) > 0.989;
        const empty = a.history === 'unfinished' && u + v > 1.7 || tassel && (col % 3 !== 0 || row > rows - 1 - (col % 4));
        const hole = a.bead === 'seed' && Math.abs(dx) < 0.065 && Math.abs(dy) < 0.09;
        const beadVisible = radial < 1 && !hole && !missed && !empty;
        const cordVisible = Math.abs(dx) < 0.035 || Math.abs(dy) < 0.035;
        const hemisphere = Math.sqrt(Math.max(0, 1 - radial * radial));
        const facet = a.bead === 'faceted' ? (dx + dy > 0 ? -9 : 14) : 0;
        const highlight = Math.exp(-((dx + 0.15) ** 2 + (dy + 0.16) ** 2) * (a.material === 'metallic' ? 180 : 75));
        const gleam = { ceramic: 6, glass: 42, pearl: 26, metallic: 63 }[a.material];
        for (let c = 0; c < 3; c++) {
          let value = mix(best[c], mix(dyes.dark[c], dyes.light[c], clamp01(luminance)), a.colourCount === 'two' ? 0.72 : 0.52);
          if (contour) value = mix(value, dyes.dark[c], 0.45);
          if (a.colourCount === 'full') value = mix(value, Math.round(raw[c] / 28) * 28, 0.55);
          if (border) value = a.edge === 'diamonds' && Math.abs(col % 8 - 4) + Math.abs(row % 8 - 4) < 4 ? dyes.accent[c] : dyes.light[c];
          if (a.history === 'repaired' && u > 0.78 && u < 0.87 && v > 0.78 && v < 0.88) value = dyes.accent[c];
          if (tassel) value = col % 2 ? dyes.accent[c] : dyes.light[c];
          const backingNoise = (hash(x, y, context.seed + 4) - 0.5) * (a.backing === 'leather' ? 11 : 4);
          const cloth = a.backing === 'linen' ? Math.sin(x / unit * 2) * 1.6 + Math.cos(y / unit * 2) * 1.6 : 0;
          const bg = (cordVisible ? cord[c] : background[c]) + backingNoise + cloth;
          output[p + c] = beadVisible ? value * (0.74 + hemisphere * 0.26) + highlight * gleam + facet + (a.material === 'pearl' ? Math.sin((dx - dy) * 4 + c * 0.6) * 5 : 0) : bg;
        }
        output[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels: output, notes: [`${a.stitch} stitch, ${a.bead} ${a.material} beads`, `${a.colourCount} colours on ${a.backing}, ${a.thread} thread`, `${a.edge} edge, ${a.history} panel`] };
  },
});
