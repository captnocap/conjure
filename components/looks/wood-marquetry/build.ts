import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, s: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ s;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    veneers: choice('What character of veneers makes the picture? Their hues follow the picture palette.', {
      classic: 'Pale maple lights, mellow fruitwood and deep walnut shadows.',
      ebony: 'A near-black and ivory contrast with very few middle veneers.',
      honey: 'Golden pale timber and warm midtones with narrow dark accents.',
      weathered: 'Silvered driftwood, faded chestnut and dark old oak.',
    }),
    grain: choice('How does the wood’s grain run inside the inlaid pieces?', {
      straight: 'Long close straight grain, calm and cabinet-like.',
      wave: 'Curly figured grain moves in gentle ripples.',
      burl: 'Whorled burl veneer with knots and irregular eyes.',
      quarter: 'Quarter-sawn stripes crossed by small silvery rays.',
    }),
    turn: choice('How does the craftsperson turn the grain between adjacent pieces?', {
      vertical: 'Most grain runs up the panel, with darker pieces turned across it.',
      surface: 'Grain follows each form’s captured surface direction.',
      alternating: 'Adjacent tonal pieces alternate their grain at right angles.',
      fan: 'Veneers fan outward from the middle like a radial cabinet lid.',
    }),
    tones: choice('How many separate veneer tones describe the scene?', {
      three: 'Three bold tones make a restrained inlaid silhouette.',
      five: 'Five tones show broad light, middle and shadow shapes.',
      seven: 'Seven veneers pick out small forms and gentle shading.',
      ten: 'Ten close tones form a detailed pictorial panel.',
    }),
    figure: score('How strongly does the natural wood figure show?', ['Quiet fine wood', 'A little grain', 'Clear figure', 'Rich grain', 'Strongly figured veneer']),
    joint: choice('How do the cut veneer edges meet?', {
      hairline: 'Very fine dark glue lines, almost invisible.',
      black: 'Firm dark seams outline every cut.',
      brass: 'Fine brass stringing separates the tonal shapes.',
      open: 'Slightly open joints leave narrow dark recesses.',
    }),
    bevel: score('How much relief is visible at the piece edges?', ['Flat flush inlay', 'A trace of sanding', 'Soft bevel', 'Raised cut edge', 'Deep intarsia relief']),
    finish: choice('What finish has been rubbed onto the panel?', {
      raw: 'Raw sanded wood with a soft dry surface.',
      wax: 'A quiet rubbed wax sheen.',
      shellac: 'A clear polished shellac with warm bands of reflected light.',
      oil: 'Darkened oiled timber with strong wet-looking grain.',
    }),
    border: choice('What frames the veneered image?', {
      none: 'The image reaches the edge of the wood.',
      string: 'A narrow pair of pale and dark stringing lines.',
      chevron: 'A geometric chevron band surrounds the panel.',
      parquet: 'A broad alternating parquet border.',
    }),
    history: choice('What has happened to the inlaid panel?', {
      new: 'Newly made with every veneer flat and intact.',
      patch: 'A small replacement veneer repairs one lower corner.',
      split: 'One slender seasonal split follows the wood grain.',
      sun: 'A broad faded strip records years beside a window.',
    }),
  },
  async apply(capture, a, context, signal) {
    const { size, color, identity, normal } = capture;
    const pixels = new Uint8ClampedArray(size * size * 4), unit = size / 720;
    const sets = {
      classic: { dark: [49, 30, 23], middle: [143, 88, 43], light: [234, 208, 158], accent: [189, 151, 75] },
      ebony: { dark: [24, 23, 23], middle: [119, 96, 67], light: [236, 223, 187], accent: [181, 144, 73] },
      honey: { dark: [77, 47, 25], middle: [183, 119, 48], light: [245, 221, 163], accent: [211, 161, 66] },
      weathered: { dark: [52, 47, 40], middle: [140, 132, 111], light: [225, 218, 196], accent: [174, 157, 111] },
    } as const;
    const wood = rekey(sets[a.veneers], context.palette, { dark: 'ink', middle: 'second', light: 'ground', accent: 'second' });
    const levels = { three: 3, five: 5, seven: 7, ten: 10 }[a.tones];
    const lum = (p: number) => (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
    const band = (p: number) => Math.min(levels - 1, Math.floor(clamp01(lum(p)) * levels));
    const step = Math.max(1, Math.round(unit));
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p];
        const right = (y * size + Math.min(size - 1, x + step)) * 4;
        const down = (Math.min(size - 1, y + step) * size + x) * 4;
        const toneBand = band(p), tone = toneBand / (levels - 1);
        const seam = id !== identity[right] || id !== identity[down] || toneBand !== band(right) || toneBand !== band(down);
        const xx = x / unit, yy = y / unit;
        let angle = toneBand % 2 ? 0.12 : Math.PI / 2;
        if (a.turn === 'surface') angle = Math.atan2(normal[p + 1] - 128, normal[p] - 128) + Math.PI / 2;
        if (a.turn === 'alternating') angle = (toneBand + id) % 2 * Math.PI / 2;
        if (a.turn === 'fan') angle = Math.atan2(v - 0.5, u - 0.5);
        const gx = xx * Math.cos(angle) + yy * Math.sin(angle), gy = -xx * Math.sin(angle) + yy * Math.cos(angle);
        const phase = hash(id, toneBand, context.seed) * 18;
        let grain = Math.sin(gx * 0.29 + Math.sin(gy * 0.023 + phase) * 1.7 + phase);
        if (a.grain === 'wave') grain = Math.sin(gx * 0.31 + Math.sin(gy * 0.052 + phase) * 4);
        if (a.grain === 'burl') grain = Math.sin(Math.hypot(gx - 240 - phase * 5, (gy - 260) * 0.62) * 0.21 + Math.sin(gx * 0.033) * 2.8);
        if (a.grain === 'quarter') grain = Math.sin(gx * 0.54 + phase) * 0.7 + (Math.sin(gy * 0.12 + Math.sin(gx * 0.015) * 2) > 0.91 ? 0.9 : 0);
        const pore = Math.pow(Math.max(0, Math.sin(gx * 1.7 + Math.sin(gy * 0.018))), 18);
        const distance = Math.min(u, v, 1 - u, 1 - v);
        const border = a.border !== 'none' && distance < (a.border === 'string' ? 0.019 : 0.047);
        const edgeCoord = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? yy : xx;
        const patch = a.history === 'patch' && u > 0.8 && u < 0.93 && v > 0.81 && v < 0.93;
        const split = a.history === 'split' && Math.abs(u - 0.36 - Math.sin(v * 7) * 0.006) < 0.001;
        const sheen = a.finish === 'shellac' ? Math.exp(-((u - 0.32) ** 2 + (v - 0.25) ** 2) / 0.18) * 14 : a.finish === 'wax' ? 4 * Math.max(0, Math.sin((u + v) * 2.5)) : 0;
        for (let c = 0; c < 3; c++) {
          let value = tone < 0.5 ? mix(wood.dark[c], wood.middle[c], tone * 2) : mix(wood.middle[c], wood.light[c], tone * 2 - 1);
          value += (grain * 8 - pore * 5) * mix(0.25, 1.45, a.figure);
          if (a.finish === 'oil') value = value * 0.86 + grain * 4;
          if (seam) value = a.joint === 'brass' ? wood.accent[c] + a.bevel * 14 : mix(value, wood.dark[c] * 0.45, a.joint === 'hairline' ? 0.35 : a.joint === 'open' ? 0.95 : 0.72);
          else value += a.bevel * (normal[p] / 255 - 0.5) * 9;
          if (border) {
            const bright = a.border === 'string' ? distance > 0.006 && distance < 0.012 : a.border === 'chevron' ? Math.sin(edgeCoord * 0.16 + distance * 220) > 0 : (Math.floor(edgeCoord / 18) + Math.floor(distance * 150)) % 2 === 0;
            value = (bright ? wood.light[c] : wood.dark[c]) + grain * 3;
          }
          if (patch) value = mix(wood.middle[c], wood.light[c], 0.4) + Math.sin(yy * 0.4) * 5;
          if (split) value = wood.dark[c] * 0.5;
          if (a.history === 'sun' && u < 0.24) value = mix(value, wood.light[c], 0.24);
          pixels[p + c] = value + sheen + (hash(x, y, context.seed + 6) - 0.5) * 2;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.veneers} veneers, ${a.tones} tones, ${a.grain} figure`, `${a.turn} grain with ${a.joint} joints`, `${a.finish} finish, ${a.history} panel, ${a.border} border`] };
  },
});
