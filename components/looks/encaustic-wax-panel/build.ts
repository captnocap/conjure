import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
export default defineLook({
  questions: {
    application: choice('How is the pigmented wax laid down?', {
      brush: 'Short warm brush strokes leave gentle parallel ridges.',
      spatula: 'A spatula spreads broad smooth patches with raised edges.',
      poured: 'Poured wax forms softly overlapping translucent pools.',
      scraped: 'Scraped wax leaves narrow flattened passages and fine tool lines.',
    }),
    wax: choice('How transparent is the wax between pigment layers?', {
      clear: 'Clear wax preserves rich colours beneath the surface.',
      cloudy: 'Cloudy wax softly veils the colours.',
      milky: 'Pale milky wax opens the picture into softer lighter tones.',
      layered: 'Uneven translucent layers reveal older colours in places.',
    }),
    palette: choice('What pigment family leads the panel? Hues follow the picture palette.', {
      honey: 'Warm ochre, honey and brown with soft ivory lights.',
      celadon: 'Quiet green-grey, cool darks and pale cream.',
      earth: 'Deep red earth, muted rose and warm pale highlights.',
      slate: 'Slate blue, charcoal and cool chalky lights.',
    }),
    thickness: score('How much wax relief stands above the panel?', ['Nearly flat glazed wax', 'A light wax skin', 'Visible soft ridges', 'Thick layered wax', 'Raised tactile passages']),
    finish: choice('How has the final wax surface been treated?', {
      polish: 'Hand-polished wax gives broad restrained gleams.',
      matte: 'A matte wax surface holds quiet diffuse light.',
      bloom: 'A pale wax bloom rests across the darker passages.',
      grain: 'A fine granular wax surface remains from making.',
    }),
    incision: choice('What is drawn through the wax?', {
      none: 'No incised marks, only the painted wax.',
      contours: 'Fine dark lines incise selected outlines.',
      hatch: 'Short parallel cuts deepen the shaded passages.',
      cross: 'Sparse crossing cuts give the darker forms a worked surface.',
    }),
    support: choice('What is visible around the wax painting?', {
      pale: 'A pale warm panel surrounds the painted forms.',
      wood: 'Quiet brown wood grain shows through the unpainted ground.',
      dark: 'A deep muted ground surrounds the luminous scene.',
      linen: 'A fine linen ground catches the transparent wax.',
    }),
    inclusions: choice('What tiny inclusions have been set into the wax?', {
      none: 'Pure pigmented wax, with no inclusions.',
      fibres: 'A few fine paper fibres are held beneath the surface.',
      foil: 'Sparse small metallic flakes catch the light.',
      petals: 'A few pale flattened petal shapes remain in the wax.',
    }),
    edge: choice('How is the panel finished at its edges?', {
      full: 'The wax picture reaches the edge.',
      wood: 'A narrow bare wood edge frames the panel.',
      raw: 'An uneven soft wax rim catches a little light.',
      darkened: 'A darkened wax edge encloses the picture.',
    }),
    history: choice('What history remains in the wax layers?', {
      fresh: 'A newly fused uninterrupted surface.',
      crazed: 'A few delicate irregular lines cross the older wax.',
      scraped: 'A lower corner has been scraped back to reveal an earlier layer.',
      repaired: 'A small warmer wax repair joins the surrounding paint.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const sets = {
      honey: { dark: [64, 46, 35], middle: [175, 140, 84], light: [242, 227, 188], repair: [195, 141, 76] },
      celadon: { dark: [42, 61, 58], middle: [125, 155, 137], light: [231, 233, 204], repair: [178, 149, 103] },
      earth: { dark: [75, 39, 35], middle: [177, 109, 89], light: [241, 216, 184], repair: [202, 147, 77] },
      slate: { dark: [43, 49, 62], middle: [126, 147, 162], light: [227, 230, 218], repair: [174, 145, 113] },
    } as const;
    const pigment = rekey(sets[a.palette], context.palette, { dark: 'ink', middle: 'second', light: 'ground', repair: 'second' });
    const back = { pale: [229, 216, 182], wood: [159, 128, 87], dark: [47, 51, 50], linen: [212, 204, 177] }[a.support];
    const step = Math.max(1, Math.round(unit)), soft = Math.max(1, Math.round(mix(0.7, 2.2, a.thickness) * unit));
    for (let y = 0; y < size; y++) {
      if (y % 40 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], xx = x / unit, yy = y / unit, u = x / size, v = y / size;
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const edgeForm = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 95);
        const nx = (normal[p] - 128) / 127, ny = (normal[p + 1] - 128) / 127;
        const along = xx * (0.8 + nx * 0.3) + yy * (0.4 + ny * 0.3);
        let ridge = Math.sin(along * 1.7 + Math.sin(yy * 0.08) * 2);
        if (a.application === 'spatula') ridge = Math.pow(Math.abs(Math.sin(xx * 0.12 + Math.sin(yy * 0.055) * 2) * Math.cos(yy * 0.11)), 5) * 2 - 0.3;
        if (a.application === 'poured') ridge = Math.sin(xx * 0.055 + Math.sin(yy * 0.065) * 2) * Math.cos(yy * 0.043 + Math.cos(xx * 0.07));
        if (a.application === 'scraped') ridge = Math.sin((xx + yy * 0.22) * 2.5) * 0.5 + Math.sin(yy * 0.12) * 0.3;
        const tone = clamp01((color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255);
        const neighbour = (Math.min(size - 1, y + soft) * size + Math.min(size - 1, x + soft)) * 4;
        const cloud = a.wax === 'clear' ? 0.04 : a.wax === 'cloudy' ? 0.14 : a.wax === 'milky' ? 0.25 : 0.08 + (Math.sin(u * 14 + Math.sin(v * 9)) + 1) * 0.055;
        const edge = Math.min(u, v, 1 - u, 1 - v);
        const patchX = Math.floor(xx / 24), patchY = Math.floor(yy / 24), chosen = hash(patchX, patchY, context.seed + 21);
        const localX = xx % 24 - 12, localY = yy % 24 - 12;
        const fleck = a.inclusions === 'foil' && chosen > 0.94 && Math.abs(localX) < 1.8 && Math.abs(localY + localX * 0.5) < 3;
        const petal = a.inclusions === 'petals' && chosen > 0.97 && localX * localX / 12 + localY * localY / 50 < 1;
        const fibre = a.inclusions === 'fibres' && chosen > 0.86 && Math.abs(localY - Math.sin(localX * 0.18) * 2) < 0.35 && Math.abs(localX) < 8;
        const incision = id >= 1 && (a.incision === 'contours' ? edgeForm : a.incision === 'hatch' ? tone < 0.6 && Math.sin((xx + yy) * 0.9) > 0.97 : a.incision === 'cross' && tone < 0.65 && Math.min(Math.abs(Math.sin(xx * 0.65 + yy * 0.8)), Math.abs(Math.sin(yy * 0.65 - xx * 0.8))) < 0.04);
        const craze = a.history === 'crazed' && Math.abs(Math.sin(xx * 0.021 + Math.sin(yy * 0.043) * 0.7)) < 0.008;
        for (let c = 0; c < 3; c++) {
          const mapped = tone < 0.5 ? mix(pigment.dark[c], pigment.middle[c], tone * 2) : mix(pigment.middle[c], pigment.light[c], tone * 2 - 1);
          const source = identity[neighbour] === id ? mix(color[p + c], color[neighbour + c], 0.16) : color[p + c];
          let value = mix(mapped, source, 0.55);
          value = mix(value, pigment.light[c], cloud);
          value += ridge * mix(1.5, 8, a.thickness);
          if (edgeForm) value *= a.application === 'poured' ? 0.92 : 0.86;
          if (a.finish === 'polish') value += Math.pow(Math.max(0, nx * -0.4 + ny * 0.6 + 0.2), 4) * 18;
          if (a.finish === 'bloom') value = mix(value, pigment.light[c], (1 - tone) * 0.16);
          if (a.finish === 'grain') value += (hash(Math.floor(xx), Math.floor(yy), context.seed) - 0.5) * 12;
          if (id === 0) value = back[c] + (a.support === 'wood' ? Math.sin(yy * 0.8 + Math.sin(xx * 0.04) * 3) * 3 : a.support === 'linen' ? Math.sin(xx * 2) * Math.cos(yy * 2) * 3 : 0);
          if (incision || craze) value = mix(value, pigment.dark[c], craze ? 0.24 : 0.5);
          if (fleck) value = mix(value, [215, 177, 89][c], 0.74);
          if (petal) value = mix(value, pigment.light[c], 0.48);
          if (fibre) value = mix(value, pigment.light[c], 0.35);
          if (a.edge === 'wood' && edge < 0.022) value = [151, 113, 70][c] + Math.sin(yy * 0.7) * 4;
          if (a.edge === 'raw' && edge < 0.015 + Math.sin((u + v) * 70) * 0.003) value = pigment.light[c] - 12 + ridge * 7;
          if (a.edge === 'darkened' && edge < 0.025) value = mix(value, pigment.dark[c], (1 - edge / 0.025) * 0.65);
          if (a.history === 'scraped' && u > 0.77 && u < 0.91 && v > 0.82 && v < 0.93) value = mix(value, back[c], 0.55) + Math.sin(yy * 2.2) * 3;
          if (a.history === 'repaired' && Math.hypot((u - 0.85) / 0.06, (v - 0.86) / 0.055) < 1) value = mix(value, pigment.repair[c], 0.45);
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.application} ${a.wax} wax in ${a.palette} pigments`, `${a.finish} finish, ${a.incision} incisions and ${a.inclusions} inclusions`, `${a.support} support, ${a.edge} edge, ${a.history} surface`] };
  },
});
