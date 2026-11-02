import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
const lineDistance = (v: number, spacing: number) => Math.abs(v / spacing - Math.floor(v / spacing) - 0.5) * spacing;

export default defineLook({
  questions: {
    stylus: choice('What character does the metalpoint mark have?', {
      silver: 'A fine cool grey silverpoint mark, quietly brown in its deepest passages.',
      gold: 'A soft warm grey mark with a restrained golden cast.',
      copper: 'A warmer red-brown metalpoint line.',
      lead: 'A dense dark grey line with a softer, wider edge.',
    }),
    stroke: choice('How are the small strokes organised?', {
      cross: 'Patient layers of close cross-hatching build the shadows.',
      parallel: 'A single diagonal family of fine parallel marks carries the drawing.',
      contour: 'Fine curved hatch lines follow the orientation of each surface.',
      stipple: 'Tiny closely spaced points build a delicate stippled drawing.',
    }),
    ground: choice('What prepared ground holds the drawing? Hues follow the picture palette.', {
      bone: 'Warm bone-white ground, with a dark quiet line.',
      rose: 'A pale rose-grey ground with a slightly stronger line.',
      ochre: 'A mid-light warm ochre preparation.',
      slate: 'A darker blue-grey ground with pale metal marks.',
    }),
    gauge: score('How fine are the individual marks?', ['Very fine hairline marks', 'Fine lines', 'Clear close strokes', 'Broad visible hatching', 'Deliberately coarse metal strokes']),
    pressure: score('How insistently is the drawing worked?', ['A faint exploratory study', 'Light hesitant marks', 'Patient middle values', 'Firm repeated strokes', 'Dense worked shadows']),
    contours: choice('How are the silhouettes drawn?', {
      complete: 'Fine continuous contours hold the forms together.',
      broken: 'Short interrupted contours let the prepared ground breathe.',
      shadows: 'Only the darker edges have an explicit drawn contour.',
      unlined: 'The hatch fields meet without a separate outline.',
    }),
    preparation: choice('What texture remains in the prepared surface?', {
      smooth: 'A smooth carefully polished drawing ground.',
      brushed: 'Fine brush furrows remain in the preparation.',
      chalky: 'A gently granular chalk-like ground catches the point unevenly.',
      fibrous: 'A little paper fibre shows through the thin preparation.',
    }),
    oxidation: choice('What history is visible in the metal marks?', {
      fresh: 'Fresh even marks with a clean delicate sheen.',
      mellow: 'The older lines have warmed and softened slightly.',
      spotted: 'A few small darker speckles interrupt the old drawing.',
      burnished: 'Gently rubbed passages catch a small amount of pale light.',
    }),
    reserve: choice('How are the lightest passages reserved?', {
      natural: 'The light comes only from untouched ground.',
      lifted: 'The brightest surfaces are left especially open and pale.',
      halo: 'A slim untouched strip separates a few strong contours from their shadows.',
      margin: 'An untouched prepared margin surrounds the drawing.',
    }),
    working: choice('What trace of the working sheet remains?', {
      clean: 'Only the finished drawing remains.',
      grid: 'A very faint measured grid lies under the drawing.',
      corners: 'Four tiny alignment crosses remain near the corners.',
      trial: 'Several short trial strokes remain along the lower margin.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal, diffuse } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(color.length);
    const stocks = {
      bone: { paper: [234, 226, 207], mark: [73, 69, 63], warm: [113, 83, 64] },
      rose: { paper: [226, 209, 201], mark: [79, 65, 65], warm: [123, 82, 67] },
      ochre: { paper: [205, 184, 142], mark: [68, 62, 54], warm: [118, 71, 49] },
      slate: { paper: [86, 103, 114], mark: [222, 218, 202], warm: [201, 183, 154] },
    } as const;
    const dye = rekey(stocks[a.ground], context.palette, { paper: 'ground', mark: 'ink', warm: 'second' });
    const extents = new Map<number, number[]>();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const id = identity[(y * size + x) * 4], b = extents.get(id);
      if (b) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
      else extents.set(id, [x, y, x, y]);
    }
    const spacingById = new Map([...extents].map(([id, b]) => [id, Math.max(0.9 * unit, Math.min(mix(2, 4.1, a.gauge) * unit, Math.sqrt((b[2] - b[0] + 1) * (b[3] - b[1] + 1)) * 0.027))]));
    const step = Math.max(1, Math.round(unit));
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], u = x / size, v = y / size;
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const luminance = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        let tone = clamp01(luminance * 0.87 + diffuse[p] / 255 * 0.13);
        if (id >= 2) tone = Math.min(tone, 0.78);
        else if (id === 1) tone = Math.min(tone, 0.94);
        const contour = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 75);
        const spacing = spacingById.get(id)!;
        const angle = a.stroke === 'contour' ? (normal[p] / 255 - 0.5) * 1.1 + (normal[p + 1] / 255 - 0.5) * 0.6 : 0.68;
        const xx = x * Math.cos(angle) + y * Math.sin(angle), yy = -x * Math.sin(angle) + y * Math.cos(angle);
        const grain = hash(Math.floor(x / Math.max(1, unit)), Math.floor(y / Math.max(1, unit)), context.seed);
        let darkness = Math.pow(1 - tone, 0.9) * mix(0.6, 1.35, a.pressure);
        if (id === 0) darkness *= 0.07;
        if (a.reserve === 'lifted' && tone > 0.72) darkness *= 0.3;
        const width = mix(0.34, 0.66, a.gauge) * unit * (a.stylus === 'lead' ? 1.25 : 1);
        let mark = lineDistance(yy, spacing) < width && grain < Math.min(1, darkness * 1.75) ? 0.66 : 0;
        if (a.stroke === 'cross' && lineDistance(xx + yy * 0.26, spacing * 1.13) < width && darkness > 0.3) mark = Math.max(mark, (darkness - 0.25) * 0.9);
        if (a.stroke === 'cross' && lineDistance(xx - yy * 0.4, spacing * 1.71) < width && darkness > 0.68) mark = Math.max(mark, darkness * 0.75);
        if (a.stroke === 'stipple') {
          const dx = lineDistance(xx, spacing), dy = lineDistance(yy, spacing);
          mark = dx * dx + dy * dy < width * width * (0.7 + darkness * 2) ? 0.72 + 0.2 * clamp01(darkness) : 0;
        }
        if (id === 0) mark *= 0.08;
        if (id >= 1) mark = Math.max(mark, (id >= 2 ? 0.035 : 0) + darkness * 0.18);
        if (a.reserve === 'halo' && contour) mark = 0;
        if (contour && a.contours !== 'unlined' && (a.contours !== 'shadows' || tone < 0.6) && (a.contours !== 'broken' || Math.floor((x + y) / (5 * unit)) % 3 !== 0)) mark = Math.max(mark, 0.48 + a.pressure * 0.2);
        if (a.preparation === 'chalky') mark *= grain < 0.14 ? 0.28 : 1;
        if (a.oxidation === 'spotted' && id >= 1 && hash(Math.floor(x / (3 * unit)), Math.floor(y / (3 * unit)), context.seed + 7) > 0.9985) mark = Math.max(mark, 0.25);
        const margin = Math.min(u, v, 1 - u, 1 - v);
        if (a.reserve === 'margin' && margin < 0.035) mark = 0;
        if (a.working === 'grid' && (lineDistance(x, 72 * unit) < 0.3 * unit || lineDistance(y, 72 * unit) < 0.3 * unit)) mark = Math.max(mark, 0.11);
        if (a.working === 'corners' && ((Math.abs(Math.min(u, 1 - u) - 0.045) < 0.0015 && Math.abs(Math.min(v, 1 - v) - 0.045) < 0.01) || (Math.abs(Math.min(v, 1 - v) - 0.045) < 0.0015 && Math.abs(Math.min(u, 1 - u) - 0.045) < 0.01))) mark = 0.55;
        if (a.working === 'trial' && u > 0.055 && u < 0.19 && v > 0.94 && v < 0.961 && lineDistance(x + y * 0.35, 6 * unit) < 0.5 * unit) mark = 0.4 + (u - 0.055) * 2;
        for (let c = 0; c < 3; c++) {
          const warmth = a.stylus === 'copper' ? 0.65 : a.stylus === 'gold' ? 0.3 : a.oxidation === 'mellow' ? 0.22 : 0;
          const ink = mix(dye.mark[c], dye.warm[c], warmth);
          let tooth = (grain - 0.5) * (a.preparation === 'smooth' ? 1.7 : 5);
          if (a.preparation === 'brushed') tooth += Math.sin(y / unit * 1.6 + Math.sin(x / unit * 0.04)) * 2;
          if (a.preparation === 'fibrous') tooth += Math.sin(x / unit * 2.4) * Math.sin(y / unit * 0.31) * 2.2;
          let value = mix(dye.paper[c], ink, clamp01(mark)) + tooth;
          if (a.oxidation === 'burnished') value += mark * Math.pow(Math.max(0, Math.sin(u * 6 + v * 2)), 6) * 16;
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.stylus} point with ${a.stroke} marks on ${a.ground} ground`, `${a.preparation} preparation, ${a.oxidation} marks`, `${a.working} working sheet`] };
  },
});
