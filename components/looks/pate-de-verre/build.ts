import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
export default defineLook({
  questions: {
    grains: choice('What sort of glass grains make the picture?', { fine: 'Small even grains form a fine sugary surface.', mixed: 'Several grain sizes remain visible together.', crushed: 'Angular crushed fragments give sharper small glints.', round: 'Small rounded glass granules soften the surface.' }),
    firing: choice('How far have the grains fused?', { fused: 'The grains have fused into a close nearly smooth surface.', granular: 'Distinct grains remain visible in a matte sugary surface.', bubbles: 'Fine trapped bubbles punctuate a more fused glass skin.', satin: 'A satin-fired surface softens the little reflections.' }),
    layers: choice('How is the glass built up?', { translucent: 'Translucent layers let the backing light enter the picture.', opaque: 'Denser opaque glass keeps a solid milky colour.', sandwich: 'A clear upper layer rests above the coloured grains.', inset: 'Separate shallow coloured insets define the forms.' }),
    palette: choice('What character do the glass colours have? Hues follow the picture palette.', { sea: 'Quiet dark and pale sea-glass tones.', amber: 'Warm dark honey, pale amber and milky light grains.', jewel: 'Rich jewel-like colours with clear bright highlights.', milk: 'Pale opaque glass with a few darker coloured grains.' }),
    size: score('How large are the visible glass granules?', ['Very fine powder-like grains', 'Fine granules', 'Clear little grains', 'Larger crushed glass', 'Broad visible fragments']),
    thickness: score('How thick is the glass body?', ['A thin fragile sheet', 'A shallow glass skin', 'A solid cast plaque', 'Thick translucent glass', 'Deep softly luminous glass']),
    edge: choice('How is the glass edge finished?', { polished: 'A smooth polished edge catches a narrow highlight.', raw: 'A rough granular cast edge.', bevel: 'A broad polished bevel around the sheet.', dark: 'A thin dark edge encloses the cast glass.' }),
    backing: choice('What is behind the glass?', { light: 'A pale light backing brightens the glass.', dark: 'A dark backing makes the small highlights stand out.', copper: 'A warm metallic backing gives a muted glow.', frosted: 'A softly frosted backing spreads the light evenly.' }),
    inclusions: choice('What small inclusions are trapped in the cast?', { none: 'Only the fused glass grains.', gold: 'A few minute warm metallic flakes.', bubbles: 'A few larger clear circular bubbles.', threads: 'Fine darker glass threads run through small areas.' }),
    form: choice('What form does the finished glass picture take?', { plaque: 'One continuous cast plaque.', tiles: 'Several larger glass tiles are joined with fine seams.', rim: 'A raised clear glass rim surrounds the picture.', panel: 'A narrow inset glass panel sits inside a plain cast border.' }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720, pixels = new Uint8ClampedArray(color.length);
    const sets = {
      sea: { dark: [33, 77, 83], mid: [103, 169, 159], light: [228, 237, 212], accent: [145, 145, 101] },
      amber: { dark: [86, 48, 23], mid: [194, 142, 65], light: [246, 223, 168], accent: [143, 96, 66] },
      jewel: { dark: [45, 46, 86], mid: [87, 140, 161], light: [229, 232, 207], accent: [178, 93, 128] },
      milk: { dark: [92, 112, 113], mid: [184, 198, 185], light: [245, 240, 217], accent: [175, 147, 127] },
    } as const;
    const dye = rekey(sets[a.palette], context.palette, { dark: 'ink', mid: 'second', light: 'ground', accent: 'second' });
    const step = Math.max(1, Math.round(unit)), glassSize = mix(1.8, 5.1, a.size) * unit;
    const back = { light: [235, 233, 213], dark: [40, 47, 48], copper: [163, 107, 70], frosted: [185, 201, 199] }[a.backing];
    for (let y = 0; y < size; y++) {
      if (y % 30 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p];
        const cellSize = glassSize * (id >= 3 ? 0.6 : 1) * (a.grains === 'fine' ? 0.7 : 1);
        const ix = Math.floor(x / cellSize), iy = Math.floor(y / cellSize);
        let distance = Infinity, centreX = x, centreY = y, seed = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const cx = (ix + dx + 0.2 + hash(ix + dx, iy + dy, context.seed) * 0.6) * cellSize;
          const cy = (iy + dy + 0.2 + hash(ix + dx, iy + dy, context.seed + 1) * 0.6) * cellSize;
          const d = (x - cx) ** 2 + (y - cy) ** 2;
          if (d < distance) { distance = d; centreX = cx; centreY = cy; seed = hash(ix + dx, iy + dy, context.seed + 2); }
        }
        const sample = (Math.max(0, Math.min(size - 1, Math.round(centreY))) * size + Math.max(0, Math.min(size - 1, Math.round(centreX)))) * 4;
        const source = identity[sample] === id ? sample : p;
        const tone = (color[source] * 0.2126 + color[source + 1] * 0.7152 + color[source + 2] * 0.0722) / 255;
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const edge = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 80);
        const radius = Math.sqrt(distance) / cellSize;
        let facet = a.grains === 'crushed' ? (seed - 0.5) * 18 : Math.max(0, 1 - radius * radius * 3) * 13 - 5;
        if (a.grains === 'mixed') facet *= seed > 0.6 ? 1.4 : 0.55;
        if (a.firing === 'fused') facet *= 0.3;
        if (a.firing === 'satin') facet *= 0.5;
        const bubble = (a.firing === 'bubbles' && seed > 0.92 || a.inclusions === 'bubbles' && seed > 0.982) && radius < 0.31;
        const margin = Math.min(u, v, 1 - u, 1 - v);
        for (let c = 0; c < 3; c++) {
          let pigment = tone < 0.5 ? mix(dye.dark[c], dye.mid[c], tone * 2) : mix(dye.mid[c], dye.light[c], tone * 2 - 1);
          if (seed > 0.84 && tone > 0.25 && tone < 0.8) pigment = mix(pigment, dye.accent[c], 0.2);
          let value = pigment + facet;
          if (a.layers === 'translucent') value = mix(value, back[c], 0.12 + a.thickness * 0.06);
          if (a.layers === 'opaque') value = mix(value, dye.light[c], 0.07);
          if (a.layers === 'sandwich') value += Math.pow(Math.max(0, Math.sin(u * 4 + v * 2)), 12) * (8 + a.thickness * 13);
          if (a.layers === 'inset' && edge) value = mix(value, dye.dark[c], 0.38);
          if (edge) value -= 5 + a.thickness * 10;
          if (bubble) value += Math.abs(radius - 0.22) < 0.055 ? 22 : -5;
          if (a.inclusions === 'gold' && seed > 0.991 && radius < 0.25) value = [220, 180, 87][c] + facet;
          if (a.inclusions === 'threads' && seed > 0.82 && Math.abs((x - centreX) - (y - centreY) * 0.4) < unit * 0.3) value = mix(value, dye.dark[c], 0.4);
          if (a.form === 'tiles' && (Math.abs(u * 4 - Math.round(u * 4)) < 0.004 || Math.abs(v * 4 - Math.round(v * 4)) < 0.004)) value = mix(value, dye.dark[c], 0.42);
          if (a.form === 'rim' && margin < 0.03) value = mix(back[c], dye.light[c], 0.62) + Math.sin(margin / 0.03 * Math.PI) * 13;
          if (a.form === 'panel' && margin < 0.048) value = dye.mid[c] + facet * 0.5;
          if (a.edge === 'dark' && margin < 0.012) value = dye.dark[c];
          if (a.edge === 'bevel' && margin < 0.022) value = mix(value, dye.light[c], 0.35) + Math.sin(margin * 145) * 8;
          if (a.edge === 'polished' && margin < 0.006) value = dye.light[c];
          if (a.edge === 'raw' && margin < 0.009 + seed * 0.004) value = mix(value, back[c], 0.55);
          pixels[p + c] = value + (hash(x, y, context.seed + 8) - 0.5) * (a.firing === 'granular' ? 8 : 2);
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.grains} glass grains, ${a.firing} firing`, `${a.layers} ${a.palette} glass on ${a.backing}`, `${a.form} with ${a.edge} edge`] };
  },
});
