import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    die: choice('How does the die push the paper into relief?', {
      raised: 'The subject rises above a flat sheet like a pale sculpted cameo.',
      recessed: 'The subject is pressed below the paper surface, leaving shadowed recesses.',
      intaglio: 'Fine recessed contours surround gently raised inner surfaces.',
      stepped: 'Three distinct die levels turn the subject into a layered relief.',
    }),
    stock: choice('What thick paper receives the impression? Its tint follows the picture palette.', {
      cotton: 'Warm white cotton rag with fine soft fibres.',
      linen: 'Cool ivory linen paper with a regular faint tooth.',
      kraft: 'Brown kraft board with a coarse fibrous body.',
      charcoal: 'Dark charcoal paper, its raised ridges catching pale light.',
    }),
    pressure: score('How deeply does the press drive the relief?', ['A whisper in the sheet', 'Light impression', 'Clear relief', 'Deep impression', 'Sculpted heavy paper']),
    edge: choice('How sharply do the die edges meet the paper?', {
      soft: 'Soft rounded shoulders, as if pressed with a broad wooden die.',
      crisp: 'Sharp precise ridges with narrow shadows.',
      bevel: 'Wide sloping bevels make the thickness obvious.',
      doubled: 'A fine second ridge runs beside each main edge.',
    }),
    lamp: choice('Where does the raking light strike the paper?', {
      left: 'Low light from the upper left reveals a long lower-right shadow.',
      right: 'Low light from the upper right reverses the relief shadows.',
      bottom: 'An unusual light from below makes the impression feel unfamiliar.',
      frontal: 'A broad frontal light keeps the relief quiet and luminous.',
    }),
    finish: choice('How is the raised paper surface finished?', {
      dry: 'Dry untreated paper with a quiet matte surface.',
      burnished: 'Polished high points catch a small soft sheen.',
      tinted: 'A very light tone rubbed over the high points describes the forms.',
      gilded: 'Thin warm foil catches only the highest ridges.',
    }),
    detail: score('How much fine surface information survives the die?', ['Broad forms', 'Simple relief', 'Balanced detail', 'Fine modelling', 'Minute chased details']),
    surround: choice('What impression surrounds the image?', {
      none: 'The relief fills an unframed sheet.',
      plate: 'A rectangular plate mark is pressed around the image.',
      oval: 'A shallow oval cameo frame surrounds the composition.',
      double: 'Two narrow recessed rectangular rules frame the scene.',
    }),
    deckle: choice('How was the sheet cut?', {
      square: 'Straight machine-cut edges.',
      torn: 'A softly irregular torn edge runs around the sheet.',
      scallop: 'A small regular scalloped edge.',
      corner: 'Rounded corners soften the square sheet.',
    }),
    history: choice('What trace of handling remains on the paper?', {
      fresh: 'A newly pressed, untouched sheet.',
      fold: 'One shallow old fold crosses the lower third.',
      rubbed: 'A small lower corner has had its relief rubbed smooth.',
      proof: 'A tiny blind registration cross remains beside the image.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, count = size * size, unit = size / 720;
    const pixels = new Uint8ClampedArray(count * 4), field = new Float32Array(count);
    const stocks = {
      cotton: { paper: [239, 233, 218], shadow: [107, 99, 84], foil: [193, 154, 73] },
      linen: { paper: [229, 233, 226], shadow: [90, 104, 101], foil: [175, 159, 99] },
      kraft: { paper: [185, 151, 106], shadow: [73, 55, 39], foil: [222, 185, 98] },
      charcoal: { paper: [75, 77, 78], shadow: [25, 28, 30], foil: [207, 184, 122] },
    } as const;
    const palette = rekey(stocks[a.stock], context.palette, { paper: 'ground', shadow: 'ink', foil: 'second' });
    for (let y = 0; y < size; y++) {
      if (y % 96 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const k = y * size + x, p = k * 4;
        const lum = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        const id = identity[p];
        let h = id === 0 ? 0 : (1 - lum) * 0.68 + (id >= 2 ? 0.22 : 0.05);
        if (a.die === 'stepped') h = Math.round(h * 3) / 3;
        if (a.die === 'recessed') h = -h;
        const step = Math.max(1, Math.round(unit));
        const q = (y * size + Math.min(size - 1, x + step)) * 4;
        const r = (Math.min(size - 1, y + step) * size + x) * 4;
        const contour = id !== identity[q] || id !== identity[r];
        if (a.die === 'intaglio' && contour) h = -0.18;
        const distance = Math.min(x, y, size - 1 - x, size - 1 - y) / size;
        const oval = Math.hypot((x / size - 0.5) / 0.46, (y / size - 0.5) / 0.46);
        if ((a.surround === 'plate' && Math.abs(distance - 0.035) < 0.0025) || (a.surround === 'double' && Math.min(Math.abs(distance - 0.027), Math.abs(distance - 0.04)) < 0.0015) || (a.surround === 'oval' && Math.abs(oval - 1) < 0.008)) h -= 0.2;
        if (a.history === 'fold') h += Math.exp(-(((y / size - 0.66 - Math.sin(x / size * 3) * 0.004) / 0.0025) ** 2)) * 0.12;
        if (a.history === 'rubbed' && x / size > 0.76 && y / size > 0.77) h *= 0.22;
        if (a.history === 'proof' && ((Math.abs(x / size - 0.06) < 0.0015 && Math.abs(y / size - 0.06) < 0.012) || (Math.abs(y / size - 0.06) < 0.0015 && Math.abs(x / size - 0.06) < 0.012))) h -= 0.24;
        field[k] = h;
      }
    }
    const radius = Math.max(1, Math.round(({ soft: 2.4, crisp: 0.8, bevel: 3.5, doubled: 1.2 }[a.edge]) * unit));
    const sample = (x: number, y: number) => field[Math.max(0, Math.min(size - 1, y)) * size + Math.max(0, Math.min(size - 1, x))];
    const light = { left: [-0.8, -0.6], right: [0.8, -0.6], bottom: [-0.3, 0.95], frontal: [0.25, -0.3] }[a.lamp];
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const k = y * size + x, p = k * 4, h = field[k], u = x / size, v = y / size;
        const dx = sample(x + radius, y) - sample(x - radius, y), dy = sample(x, y + radius) - sample(x, y - radius);
        let shade = (dx * light[0] + dy * light[1]) * mix(45, 150, a.pressure);
        if (a.edge === 'doubled') shade += ((sample(x + radius * 3, y) - sample(x - radius * 3, y)) * light[0] + (sample(x, y + radius * 3) - sample(x, y - radius * 3)) * light[1]) * 28;
        const id = identity[p], modelling = id >= 2 ? ((normal[p] - 128) * light[0] + (normal[p + 1] - 128) * light[1]) * mix(0.035, 0.14, a.detail) : 0;
        const texture = (hash(x, y, context.seed) - 0.5) * (a.stock === 'kraft' ? 7 : 3) + (a.stock === 'linen' ? Math.sin(x / unit * 2) * Math.cos(y / unit * 2) * 1.5 : 0);
        const distance = Math.min(u, v, 1 - u, 1 - v);
        const torn = a.deckle === 'torn' && distance < 0.007 + Math.sin(x / unit * 0.24 + y / unit * 0.15) * 0.0015 + hash(Math.floor(x / unit / 3), Math.floor(y / unit / 3), context.seed) * 0.002;
        const scallop = a.deckle === 'scallop' && distance < 0.007 + (Math.sin((x + y) / unit * 0.4) + 1) * 0.002;
        const corner = a.deckle === 'corner' && Math.hypot(Math.max(0, Math.abs(u - 0.5) - 0.46), Math.max(0, Math.abs(v - 0.5) - 0.46)) > 0.04;
        for (let c = 0; c < 3; c++) {
          const tone = clamp01(Math.abs(h) * (a.finish === 'tinted' ? 0.38 : 0.13));
          let value = mix(palette.paper[c], palette.shadow[c], tone) + shade + modelling + texture;
          if (a.finish === 'burnished') value += Math.max(0, shade) * 0.45 + Math.abs(h) * 6;
          if (a.finish === 'gilded' && Math.abs(dx) + Math.abs(dy) > 0.12) value = mix(value, palette.foil[c] + shade, 0.65);
          pixels[p + c] = torn || scallop || corner ? 247 : value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.die} impression in ${a.stock} paper`, `${a.edge} die, ${a.lamp} light, ${a.finish} surface`, `${a.surround} surround, ${a.deckle} edge, ${a.history} sheet`] };
  },
});
