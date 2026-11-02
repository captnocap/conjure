import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, s: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ s;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    weave: choice('Which weave interlocks the picture’s threads?', {
      plain: 'One over, one under, with a regular checker of warp and weft.',
      twill: 'Two over, one under, making fine diagonal ribs.',
      satin: 'Long smooth floats punctuated by small binding points.',
      herringbone: 'Diagonal twill reverses in narrow chevrons.',
    }),
    yarn: choice('What yarn carries the woven picture?', {
      wool: 'Soft matte wool with a little irregular fuzz.',
      silk: 'Fine smooth silk with a directional sheen.',
      cotton: 'Firm even cotton threads with a dry surface.',
      linen: 'Slubby linen with occasional thick natural fibres.',
    }),
    gauge: score('How fine is the woven image?', ['Broad visible yarns', 'Coarse tapestry', 'Medium cloth', 'Fine figured weave', 'Very fine silk detail']),
    colours: choice('What range of thread colours is carried through the scene?', {
      two: 'A two-yarn light and dark woven silhouette.',
      three: 'Three yarns: shadow, middle colour and light.',
      five: 'Five yarns: three tonal shades and two accent colours.',
      many: 'A richly coloured pictorial tapestry preserving local scene colours.',
    }),
    palette: choice('What character does the yarn dye have? Hues follow the picture palette.', {
      mineral: 'Restrained dark, stone and pale flax yarns.',
      jewel: 'Dense dark yarns and vivid contrasting accents.',
      faded: 'Muted naturally faded dyes with a pale ground.',
      indigo: 'A severe dark-and-pale arrangement with one sharp accent.',
    }),
    relief: score('How strongly does the crossing yarn catch the light?', ['Almost flat cloth', 'Quiet thread', 'Visible weave', 'Raised loops', 'Deep textured yarn']),
    drift: choice('How does the hand tension move the warp?', {
      straight: 'Straight evenly tensioned threads.',
      wave: 'A slow wave bends the rows slightly.',
      bowed: 'Rows bow gently toward the centre of the hanging.',
      irregular: 'Small irregular offsets reveal hand weaving.',
    }),
    edge: choice('How is the woven picture finished?', {
      bleed: 'Cloth fills the frame.',
      selvedge: 'A narrow contrasting selvedge binds all four edges.',
      fringe: 'A selvedge above and loose knotted fringe below.',
      band: 'A broad geometric woven border surrounds the scene.',
    }),
    history: choice('What has happened to the cloth?', {
      new: 'Freshly cut from the loom, evenly woven.',
      mended: 'A small rectangular darn repairs the lower corner.',
      faded: 'Light has faded a band along the hanging’s upper edge.',
      pulled: 'A single loose weft thread runs across the lower third.',
    }),
    backing: choice('What lies behind any gaps and fringe?', {
      ivory: 'Warm pale linen backing.',
      charcoal: 'Dark charcoal cloth behind the loose fibres.',
      ochre: 'Earthy ochre mounting fabric.',
      bare: 'Pale gallery wall visible through the fringe.',
    }),
  },
  async apply(capture, a, context, signal) {
    const { size, color, identity, normal } = capture;
    const out = new Uint8ClampedArray(size * size * 4), unit = size / 720;
    const sets = {
      mineral: { dark: [43, 46, 44], middle: [123, 125, 110], light: [229, 217, 187], accent: [155, 87, 48], second: [84, 124, 130] },
      jewel: { dark: [34, 29, 42], middle: [138, 71, 64], light: [235, 213, 164], accent: [196, 148, 44], second: [53, 132, 114] },
      faded: { dark: [77, 68, 68], middle: [160, 141, 124], light: [232, 220, 193], accent: [173, 114, 98], second: [130, 160, 155] },
      indigo: { dark: [27, 42, 61], middle: [86, 115, 135], light: [226, 225, 205], accent: [168, 77, 53], second: [123, 156, 162] },
    } as const;
    const dyes = rekey(sets[a.palette], context.palette, { dark: 'ink', middle: 'ink', light: 'ground', accent: 'second', second: 'second' });
    const threads = a.colours === 'two' ? [dyes.dark, dyes.light] : a.colours === 'three' ? [dyes.dark, dyes.middle, dyes.light] : [dyes.dark, dyes.middle, dyes.light, dyes.accent, dyes.second];
    const gauge = mix(6.2, 2.6, a.gauge) * unit;
    const backing = { ivory: [231, 221, 196], charcoal: [45, 43, 43], ochre: [179, 143, 88], bare: [238, 237, 230] }[a.backing];
    const margin = a.edge === 'band' ? 0.055 : a.edge === 'bleed' ? 0 : 0.018;
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size;
        let offset = 0;
        if (a.drift === 'wave') offset = Math.sin(v * 18) * gauge * 0.7;
        if (a.drift === 'bowed') offset = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * gauge * 2.5;
        if (a.drift === 'irregular') offset = (hash(Math.floor(y / gauge), 0, context.seed) - 0.5) * gauge * 0.6;
        const fx = (x + offset) / gauge, fy = y / gauge;
        const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        let over = (ix + iy) % 2 === 0;
        if (a.weave === 'twill') over = (ix + iy) % 3 !== 0;
        if (a.weave === 'satin') over = (ix + iy * 2) % 5 !== 0;
        if (a.weave === 'herringbone') over = ((Math.floor(ix / 12) % 2 ? -ix : ix) + iy + 10000) % 3 !== 0;
        const stripe = over ? ty : tx;
        const roundness = Math.sqrt(Math.max(0, 1 - (stripe * 2 - 1) ** 2));
        const sx = Math.max(0, Math.min(size - 1, Math.floor((ix + 0.5) * gauge - offset)));
        const sy = Math.max(0, Math.min(size - 1, Math.floor((iy + 0.5) * gauge)));
        const sampled = (sy * size + sx) * 4;
        const source = identity[sampled] === identity[p] ? sampled : p;
        const raw = [color[source], color[source + 1], color[source + 2]];
        let tone = (raw[0] * 0.2126 + raw[1] * 0.7152 + raw[2] * 0.0722) / 255;
        const step = Math.max(1, Math.round(unit));
        const right = (y * size + Math.min(size - 1, x + step)) * 4;
        const down = (Math.min(size - 1, y + step) * size + x) * 4;
        const contour = identity[p] >= 2 && (identity[p] !== identity[right] || identity[p] !== identity[down] || Math.abs(normal[p] - normal[right]) + Math.abs(normal[p + 1] - normal[down + 1]) > 85);
        if (identity[p] >= 2) tone = Math.min(tone, 0.93);
        if (contour) tone *= 0.62;
        let best = threads[0], distance = Infinity;
        for (const thread of threads) {
          const d = thread.reduce((sum, value, c) => sum + (value - raw[c]) ** 2, 0);
          if (d < distance) { distance = d; best = thread; }
        }
        if (a.colours === 'two') best = tone > (over ? 0.48 : 0.56) ? dyes.light : dyes.dark;
        // A fraction of continuous shading keeps a distant hand or face inside its silhouette.
        const shade = clamp01((tone - 0.5) * 1.15 + 0.5);
        const fuzz = (hash(x, y, context.seed) - 0.5) * (a.yarn === 'wool' ? 15 : a.yarn === 'linen' ? 10 : 4);
        const sheen = a.yarn === 'silk' ? Math.pow(roundness, 5) * 22 : 0;
        const slub = a.yarn === 'linen' && hash(ix, iy, context.seed + 1) > 0.94 ? 10 : 0;
        const border = Math.min(u, v, 1 - u, 1 - v) < margin;
        const fringe = a.edge === 'fringe' && v > 0.955;
        const loose = fringe && v > 0.965 + hash(ix, 0, context.seed + 45) * 0.033;
        const gap = fringe && (tx < 0.16 || tx > 0.84 || loose);
        const mend = a.history === 'mended' && u > 0.76 && u < 0.87 && v > 0.77 && v < 0.87;
        for (let c = 0; c < 3; c++) {
          const shaded = mix(dyes.dark[c], dyes.light[c], shade);
          let value = mix(best[c], shaded, a.colours === 'two' ? 0.65 : identity[p] >= 3 ? 0.5 : 0.36);
          if (contour) value = mix(value, dyes.dark[c], 0.35);
          if (a.colours === 'many') value = mix(value, Math.round(raw[c] / 36) * 36, 0.5);
          if (border) value = a.edge === 'band' && ((ix + iy) % 8 < 3) ? dyes.light[c] : dyes.accent[c];
          if (mend) value = (ix + iy) % 3 ? dyes.light[c] : dyes.second[c];
          if (a.history === 'faded') value = mix(value, dyes.light[c], Math.max(0, 0.23 - v) * 1.3);
          if (a.history === 'pulled' && Math.abs(v - 0.69 - Math.sin(u * 9) * 0.004) < 0.002) value = dyes.light[c];
          if (fringe) value = dyes.light[c];
          out[p + c] = gap ? backing[c] : value + (roundness - 0.78) * (18 + a.relief * 46) + sheen + slub + fuzz;
        }
        out[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels: out, notes: [`${a.weave} weave in ${a.yarn}, ${a.colours} yarn colours`, `${a.drift} tension, ${a.edge} finish`, `${a.history} cloth on ${a.backing} backing`] };
  },
});
