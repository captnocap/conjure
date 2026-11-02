import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
export default defineLook({
  questions: {
    hide: choice('What character does the leather have? Hues follow the picture palette.', { pale: 'Pale natural hide with warm honey highlights.', chestnut: 'Rich chestnut leather with dark cuts.', oxblood: 'Deep reddish-brown hide with muted pink-brown highlights.', black: 'Very dark leather with restrained grey-brown raised edges.' }),
    cutting: choice('How is the scene tooled into the hide?', { outline: 'Fine swivel-knife lines outline the forms.', bevel: 'Bevelled cuts lower one side of each contour.', relief: 'The forms rise in a broadly modelled leather relief.', incised: 'Deep narrow incisions hold dark dye around the shapes.' }),
    stamping: choice('Which background tool marks remain?', { plain: 'Mostly smooth leather with its natural grain.', basket: 'Small interlocking basket-weave stamps.', seed: 'Dense little seed-shaped background stamps.', pebble: 'Rounded pebble impressions between the main forms.' }),
    dye: choice('How is colour applied to the leather?', { natural: 'Natural leather tone carries the entire picture.', antique: 'A dark antique dye gathers in the cuts and low places.', two: 'Two related dye tones separate the major forms.', painted: 'Muted scene colours are painted lightly inside the tooled shapes.' }),
    depth: score('How deeply are the tools pressed?', ['Very shallow tracing', 'Light cuts', 'Clear bevels', 'Deeply tooled contours', 'Strong raised and recessed forms']),
    stitching: choice('What holds the edge of the leather panel?', { none: 'A plain unstitched edge.', saddle: 'A single even row of pale saddle stitches.', laced: 'Thick crossing leather laces bind the edge.', double: 'Two close parallel rows of small saddle stitches.' }),
    border: choice('What tooling decorates the border?', { plain: 'A simple unornamented border.', rope: 'A narrow twisted rope border.', petals: 'Small repeated petal stamps run around the edge.', chevron: 'Short chevron stamps give the border a firm rhythm.' }),
    finish: choice('How is the surface finished?', { matte: 'Dry matte leather with open grain.', wax: 'A soft wax sheen on the raised parts.', oil: 'An oiled finish deepens the broad tones.', polished: 'Well-burnished raised edges catch small bright glints.' }),
    history: choice('What trace of use remains?', { fresh: 'A newly finished leather panel.', crease: 'A soft old crease crosses the lower part.', scuffed: 'Pale scuff marks interrupt the surface near one corner.', repaired: 'A small stitched patch repairs the lower corner.' }),
    fittings: choice('What small fittings accompany the panel?', { none: 'No separate metal fittings.', rivets: 'Four small brass rivets secure the corners.', corners: 'Small folded brass corner guards.', eyelets: 'Dark-centred brass eyelets run along the upper edge.' }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720, pixels = new Uint8ClampedArray(color.length);
    const sets = {
      pale: { leather: [195, 145, 83], cut: [80, 43, 24], high: [237, 199, 141], dye: [130, 78, 47] },
      chestnut: { leather: [135, 76, 43], cut: [45, 25, 19], high: [207, 143, 86], dye: [85, 49, 35] },
      oxblood: { leather: [109, 48, 44], cut: [39, 23, 26], high: [179, 108, 91], dye: [76, 45, 50] },
      black: { leather: [57, 52, 46], cut: [18, 18, 20], high: [150, 136, 116], dye: [72, 66, 57] },
    } as const;
    const dye = rekey(sets[a.hide], context.palette, { leather: 'ground', cut: 'ink', high: 'ground', dye: 'second' });
    const step = Math.max(1, Math.round(unit));
    const toneAt = (p: number) => (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p], tone = toneAt(p);
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const before = (Math.max(0, y - step) * size + Math.max(0, x - step)) * 4;
        const contour = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 75 || Math.abs(tone - toneAt(q)) + Math.abs(tone - toneAt(r)) > 0.23);
        const raisedEdge = id >= 1 && (id !== identity[before] || Math.abs(tone - toneAt(before)) > 0.21);
        const grain = hash(Math.floor(x / Math.max(1, unit)), Math.floor(y / Math.max(1, unit)), context.seed);
        const xx = x / unit, yy = y / unit;
        let stamp = 0;
        if (a.stamping === 'basket') { const row = Math.floor(yy / 7), col = Math.floor(xx / 7); stamp = Math.sin(((row + col) % 2 ? xx : yy) * 2.2) * 2.5 + (Math.min(xx % 7, yy % 7) < 0.7 ? -5 : 0); }
        if (a.stamping === 'seed') { const dx = (xx + Math.floor(yy / 6) % 2 * 3) % 6 - 3, dy = yy % 6 - 3; stamp = dx * dx / 4 + dy * dy < 2.5 ? -4 : 0.5; }
        if (a.stamping === 'pebble') stamp = Math.sin(xx * 0.9 + Math.sin(yy * 0.6)) * Math.cos(yy * 1.1) * 3.2;
        const margin = Math.min(u, v, 1 - u, 1 - v), along = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? yy : xx;
        const stitchRow = Math.abs(margin - 0.027) < 0.0016 || a.stitching === 'double' && Math.abs(margin - 0.038) < 0.0016;
        const stitch = a.stitching !== 'none' && (a.stitching === 'laced' ? margin < 0.04 && margin > 0.012 && Math.abs(Math.sin(along * 0.7 + margin * 250)) > 0.9 : stitchRow && Math.floor(along / 4) % 2 === 0);
        let borderMark = 0;
        if (margin > 0.047 && margin < 0.065) {
          if (a.border === 'rope') borderMark = Math.sin(along * 0.7 + margin * 190) * 9;
          if (a.border === 'petals') borderMark = Math.cos(along * 0.65) * Math.cos((margin - 0.056) * 270) > 0.35 ? -10 : 3;
          if (a.border === 'chevron') borderMark = Math.abs((along % 10) / 10 - 0.5) * 0.022 > margin - 0.05 ? -7 : 2;
        }
        let fitting = 0;
        const cx = Math.min(u, 1 - u) - 0.065, cy = Math.min(v, 1 - v) - 0.065;
        if (a.fittings === 'rivets' && cx * cx + cy * cy < 0.00005) fitting = 1;
        if (a.fittings === 'corners' && Math.min(u, 1 - u) + Math.min(v, 1 - v) < 0.065) fitting = 1;
        if (a.fittings === 'eyelets' && u > 0.1 && u < 0.9) { const dx = u % 0.1 - 0.05, dy = v - 0.03, rr = dx * dx + dy * dy; if (rr < 0.000036) fitting = rr < 0.00001 ? 2 : 1; }
        for (let c = 0; c < 3; c++) {
          let base = dye.leather[c];
          if (id >= 1) base = mix(dye.cut[c], dye.high[c], 0.32 + tone * 0.55);
          if (a.dye === 'two' && id >= 2 && tone < 0.6) base = mix(base, dye.dye[c], 0.48);
          if (a.dye === 'painted' && id >= 1) base = mix(base, color[p + c], 0.32);
          if (a.dye === 'antique' && id >= 1) base = mix(base, dye.cut[c], (1 - tone) * 0.3);
          let value = base + (grain - 0.5) * (a.finish === 'matte' ? 7 : 3) + stamp * (id >= 2 ? 0.45 : 1) + borderMark;
          if (contour) value = mix(value, dye.cut[c], a.cutting === 'incised' ? 0.9 : mix(0.35, 0.78, a.depth));
          if (raisedEdge && a.cutting !== 'outline') value = mix(value, dye.high[c], mix(0.25, 0.8, a.depth));
          if (a.cutting === 'relief') value += (normal[p] / 255 + normal[p + 1] / 255 - 1) * (5 + a.depth * 18);
          if (a.finish === 'oil') value *= 0.87;
          if (a.finish === 'wax') value += Math.max(0, normal[p + 2] / 255 - 0.6) * 14;
          if (a.finish === 'polished' && raisedEdge) value += 12;
          if (a.history === 'crease') value -= Math.max(0, 1 - Math.abs(v - 0.72 - Math.sin(u * 5) * 0.02) / 0.006) * 20;
          if (a.history === 'scuffed' && u > 0.73 && v > 0.78 && grain > 0.72) value = mix(value, dye.high[c], 0.32);
          if (a.history === 'repaired' && u > 0.77 && u < 0.91 && v > 0.8 && v < 0.92) { value = mix(value, dye.dye[c], 0.72); if (Math.min(u - 0.77, 0.91 - u, v - 0.8, 0.92 - v) < 0.005 && Math.floor((xx + yy) / 4) % 2 === 0) value = dye.high[c]; }
          if (stitch) value = dye.high[c];
          if (fitting === 1) value = [192, 154, 82][c] + Math.sin(xx * 0.7 + yy * 0.4) * 11;
          if (fitting === 2) value = dye.cut[c];
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.cutting} tooling in ${a.hide} leather`, `${a.stamping} stamping, ${a.dye} dye`, `${a.stitching} stitching and ${a.finish} finish`] };
  },
});
