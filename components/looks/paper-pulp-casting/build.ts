import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
export default defineLook({
  questions: {
    mould: choice('What sort of mould shapes the pulp?', { relief: 'Forms rise in a shallow cast-paper relief.', intaglio: 'The picture is pressed into the pulp as a recessed impression.', layered: 'Several stepped paper layers build a clear silhouette relief.', sculpted: 'Rounder smoothly sculpted paper forms rise from the backing.' }),
    pulp: choice('What character does the pulp have? Hues follow the picture palette.', { white: 'Clean warm-white pulp with pale fibre shadows.', recycled: 'Soft grey recycled pulp with darker tiny flecks.', plant: 'Warm buff plant-fibre pulp.', dyed: 'A muted coloured pulp with lighter broken edges.' }),
    fibre: choice('What fibres show in the cast sheet?', { cotton: 'Very short fine cotton fibres.', long: 'Long pale fibres lie across the pressed surface.', seeds: 'Tiny dark seed-like flecks punctuate the pulp.', chips: 'Small irregular paper chips remain embedded in the sheet.' }),
    depth: score('How deep is the cast relief?', ['Almost flat paper', 'A delicate impression', 'Clearly raised forms', 'Deep tactile relief', 'Thick strongly sculpted pulp']),
    trim: choice('How is the edge finished?', { deckled: 'A soft fibrous deckle surrounds the sheet.', cut: 'The outer edge is cut clean and square.', cast: 'A slightly thicker rounded mould rim encloses the image.', stitched: 'A line of small stitches secures the cast sheet to a backing.' }),
    drying: choice('How did the sheet dry?', { flat: 'Flat and evenly dried.', bowed: 'A slight broad bow lifts the centre of the sheet.', pressed: 'A firm press leaves a smooth compressed surface.', rippled: 'Shallow drying ripples cross the outer sheet.' }),
    inclusion: choice('What is embedded in a few small areas?', { none: 'Only the pulp fibres.', petals: 'A few small muted petal fragments.', straw: 'Short golden straw fragments.', thread: 'Fine contrasting thread fragments caught in the pulp.' }),
    surface: choice('What texture does the mould leave?', { smooth: 'A smooth mould surface.', mesh: 'A fine woven screen impression.', pebbled: 'A softly pebbled mould texture.', wrinkled: 'Small irregular wrinkles from a flexible mould.' }),
    colour: choice('How does colour describe the scene?', { natural: 'Only the natural pulp and relief shadows describe the picture.', tinted: 'A quiet wash tints the raised forms.', two: 'Two pulp tones separate the major shapes.', local: 'Muted colours from the scene are worked into the pulp.' }),
    repair: choice('What trace of handling remains?', { fresh: 'A freshly cast unmarked sheet.', joined: 'A narrow pulp seam repairs a lower corner.', scraped: 'A lightly scraped patch exposes fresh pale fibres.', damp: 'A small soft-edged damp stain remains near the lower edge.' }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(color.length), relief = new Float32Array(size * size);
    const sets = {
      white: { pulp: [232, 226, 208], shadow: [115, 108, 91], tint: [151, 163, 153] },
      recycled: { pulp: [201, 200, 186], shadow: [89, 96, 91], tint: [135, 147, 151] },
      plant: { pulp: [213, 192, 149], shadow: [111, 87, 53], tint: [146, 130, 92] },
      dyed: { pulp: [176, 196, 191], shadow: [62, 97, 101], tint: [166, 116, 99] },
    } as const;
    const dye = rekey(sets[a.pulp], context.palette, { pulp: 'ground', shadow: 'ink', tint: 'second' });
    for (let i = 0; i < relief.length; i++) {
      const p = i * 4, tone = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
      let height = identity[p] === 0 ? 0 : 0.2 + (1 - tone) * 0.6 + (normal[p + 2] / 255 - 0.5) * 0.12;
      if (a.mould === 'layered') height = Math.round(height * 5) / 5;
      if (a.mould === 'intaglio') height *= -1;
      if (a.mould === 'sculpted') height = Math.sqrt(Math.max(0, height)) * 0.8;
      relief[i] = height;
    }
    const step = Math.max(1, Math.round(unit));
    const at = (x: number, y: number) => relief[Math.max(0, Math.min(size - 1, y)) * size + Math.max(0, Math.min(size - 1, x))];
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const i = y * size + x, p = i * 4, id = identity[p], u = x / size, v = y / size;
        const tone = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        const dx = at(x + step, y) - at(x - step, y), dy = at(x, y + step) - at(x, y - step);
        const reliefShade = clamp01(0.7 - (dx * 0.8 + dy * 0.6) * mix(0.7, 3.5, a.depth));
        const grain = hash(Math.floor(x / Math.max(1, unit)), Math.floor(y / Math.max(1, unit)), context.seed);
        const fibreCellX = Math.floor(x / (7 * unit)), fibreCellY = Math.floor(y / (7 * unit));
        const cell = hash(fibreCellX, fibreCellY, context.seed + 1);
        let texture = (grain - 0.5) * (a.drying === 'pressed' ? 2 : 6);
        if (a.fibre === 'long') texture += Math.sin(x / unit * 0.18 + Math.sin(y / unit * 0.025)) * Math.sin(y / unit * 2.8) * 3;
        if (a.fibre === 'seeds' && cell > 0.96 && Math.hypot(x / (7 * unit) % 1 - 0.5, y / (7 * unit) % 1 - 0.5) < 0.15) texture -= 24;
        if (a.fibre === 'chips' && cell > 0.92) texture += (cell - 0.9) * 90;
        if (a.surface === 'mesh') texture += Math.sin(x / unit * 2) * Math.cos(y / unit * 2) * 3.5;
        if (a.surface === 'pebbled') texture += Math.sin(x / unit * 0.65) * Math.sin(y / unit * 0.71) * 4;
        if (a.surface === 'wrinkled') texture += Math.sin(x / unit * 0.13 + Math.sin(y / unit * 0.042) * 3) * 3;
        if (a.drying === 'bowed') texture += Math.sin(u * Math.PI) * Math.cos(v * Math.PI) * 9;
        if (a.drying === 'rippled') texture += Math.sin(u * 42 + Math.sin(v * 13)) * 4;
        const margin = Math.min(u, v, 1 - u, 1 - v), edgeCoord = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? y / unit : x / unit;
        const outside = margin < (a.trim === 'cut' ? 0.018 : a.trim === 'deckled' ? 0.015 + hash(Math.floor(edgeCoord / 3), 0, context.seed + 4) * 0.012 : 0.018);
        const stitch = a.trim === 'stitched' && Math.abs(margin - 0.034) < 0.0015 && Math.floor(edgeCoord / 4) % 2 === 0;
        const include = a.inclusion !== 'none' && cell > 0.989;
        for (let c = 0; c < 3; c++) {
          let base = dye.pulp[c];
          if (a.colour === 'tinted' && id >= 1) base = mix(base, dye.tint[c], 0.16 + (1 - tone) * 0.25);
          if (a.colour === 'two' && tone < 0.55 && id >= 1) base = mix(base, dye.tint[c], 0.55);
          if (a.colour === 'local' && id >= 1) base = mix(base, color[p + c], 0.35);
          let value = mix(dye.shadow[c], base, clamp01(reliefShade + (id === 0 ? 0.3 : tone * 0.28))) + texture;
          if (a.trim === 'cast' && margin < 0.035) value += Math.sin(margin / 0.035 * Math.PI) * 12;
          if (include && (a.inclusion === 'petals' || a.inclusion === 'straw' && y / (7 * unit) % 1 < 0.22 || a.inclusion === 'thread' && Math.abs(x / (7 * unit) % 1 - y / (7 * unit) % 1) < 0.07)) value = mix(value, dye.tint[c], a.inclusion === 'thread' ? 0.8 : 0.5);
          if (a.repair === 'joined' && u > 0.68 && v > 0.72 && Math.abs(u + v - 1.65) < 0.007) value += 11 + grain * 5;
          if (a.repair === 'scraped' && ((u - 0.83) / 0.07) ** 2 + ((v - 0.86) / 0.03) ** 2 < 1) value = mix(value, dye.pulp[c], 0.7) + grain * 4;
          if (a.repair === 'damp') value -= Math.max(0, 1 - Math.hypot((u - 0.4) / 0.16, (v - 0.94) / 0.08)) * 14;
          if (outside) value = dye.pulp[c] * 0.87;
          if (stitch) value = dye.shadow[c];
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.mould} cast from ${a.pulp} pulp`, `${a.fibre} fibres, ${a.surface} mould`, `${a.trim} edges and ${a.drying} drying`] };
  },
});
