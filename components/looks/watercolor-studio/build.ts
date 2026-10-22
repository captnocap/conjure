import { choice, clamp01, defineLook, mix, score } from '@conjure/kit';

type RGB = readonly [number, number, number];
const PALETTES: Record<string, { cool: RGB; warm: RGB; green: RGB }> = {
  natural: { cool: [75, 110, 143], warm: [188, 114, 71], green: [97, 137, 91] },
  garden: { cool: [91, 113, 157], warm: [196, 105, 126], green: [78, 132, 77] },
  coastal: { cool: [53, 131, 168], warm: [212, 157, 67], green: [59, 157, 145] },
  orchard: { cool: [119, 121, 176], warm: [207, 102, 62], green: [135, 153, 63] },
  lilac: { cool: [132, 116, 169], warm: [211, 151, 128], green: [111, 157, 147] },
  earth: { cool: [90, 121, 151], warm: [168, 112, 63], green: [111, 132, 88] },
};
const smooth = (low: number, high: number, value: number) => {
  const t = clamp01((value - low) / (high - low));
  return t * t * (3 - 2 * t);
};

/** Seeded paper and pigment fields, independent of traversal order and browser drawing state. */
function pigmentNoise(seed: number) {
  const cell = (x: number, y: number) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const field = (x: number, y: number, spacing: number) => {
    const sx = x / spacing, sy = y / spacing, ix = Math.floor(sx), iy = Math.floor(sy);
    const tx = smooth(0, 1, sx - ix), ty = smooth(0, 1, sy - iy);
    return mix(mix(cell(ix, iy), cell(ix + 1, iy), tx), mix(cell(ix, iy + 1), cell(ix + 1, iy + 1), tx), ty);
  };
  return { cell, field };
}

/** Diffuse pigment with bounded linear-time passes, rather than a radius-squared kernel. */
async function diffuse(input: Float32Array, size: number, radius: number, pause: () => Promise<void>) {
  const horizontal = new Float32Array(input.length), output = new Float32Array(input.length), divisor = radius * 2 + 1;
  for (let y = 0; y < size; y++) {
    if (y % 64 === 0) await pause();
    const row = y * size;
    let sum = 0;
    for (let dx = -radius; dx <= radius; dx++) sum += input[row + Math.max(0, Math.min(size - 1, dx))];
    for (let x = 0; x < size; x++) {
      horizontal[row + x] = sum / divisor;
      sum += input[row + Math.min(size - 1, x + radius + 1)] - input[row + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < size; x++) {
    if (x % 64 === 0) await pause();
    let sum = 0;
    for (let dy = -radius; dy <= radius; dy++) sum += horizontal[Math.max(0, Math.min(size - 1, dy)) * size + x];
    for (let y = 0; y < size; y++) {
      output[y * size + x] = sum / divisor;
      sum += horizontal[Math.min(size - 1, y + radius + 1) * size + x] - horizontal[Math.max(0, y - radius) * size + x];
    }
  }
  return output;
}

export default defineLook({
  questions: {
    process: choice('Which watercolor handling best expresses the scene?', {
      wet: 'Wet-on-wet painting: pigments drift into damp paper, with soft colour blooms and edges that dissolve into light.',
      dry: 'Dry-brush watercolor: broken strokes catch the paper tooth, with crisp accents and small untouched flecks of white.',
      botanical: 'A botanical watercolor plate: carefully glazed local colours, precise selected edges and generous untouched paper.',
      pleinair: 'A plein-air watercolor: broad fresh washes, lively warm and cool shadows, a few crisp accents and breathing space.',
    }),
    palette: choice('Which watercolor pigments should carry the colours?', {
      natural: 'Keep the scene\'s own colour relationships, tempered by ultramarine and warm ochre watercolor pigments.',
      garden: 'Sap green, rose madder and soft ultramarine: rich living foliage and tender rose-coloured accents.',
      coastal: 'Cerulean, turquoise and golden ochre: clear, sunlit water and open air.',
      orchard: 'Vermilion, violet-blue and yellow-green: fresh fruit, warm masonry and lively painted colour.',
      lilac: 'Gentle lavender, peach and pale jade: a tender, airy pastel painting with coloured shadows.',
      earth: 'Burnt sienna, olive and muted cobalt: warm natural earth pigments and quiet blue shadows.',
    }),
    paper: choice('What light paper receives the washes?', {
      cotton: 'Soft warm-white cotton rag with a fine natural tooth.',
      bright: 'Clear white watercolor paper, fresh and luminous.',
      cream: 'A warm ivory sketchbook sheet, mellow and sunlit.',
    }),
    pigment: score('How much pigment is carried in each transparent wash?', ['Very pale transparent washes', 'Lightly tinted', 'Fresh balanced colour', 'Rich layered colour', 'Deep saturated pigment pools']),
    water: score('How wet is the paper as the brush passes over it?', ['Nearly dry, controlled strokes', 'Just damp', 'Flowing washes', 'Very wet', 'Pigments mingle freely on soaked paper']),
    granulation: score('How strongly does pigment settle into the paper texture?', ['Almost smooth', 'A little paper tooth', 'Visible fine granulation', 'Mineral speckling', 'Strong uneven granulating pigment']),
    edges: choice('Which edges of the forms stay clear?', {
      lost: 'Mostly lost edges, with shapes dissolving into one another and into the paper.',
      selective: 'A painter\'s mix of soft lost edges and a few crisp structural accents.',
      crisp: 'Carefully observed boundaries with thin darker pigment gathering at selected edges.',
    }),
    whites: score('How much untouched white paper is reserved for highlights?', ['Only the brightest glints', 'Small highlights', 'Clear luminous lights', 'Generous white passages', 'Many open white shapes and unpainted highlights']),
    sheet: choice('How does the watercolor meet the edge of the sheet?', {
      open: 'Paint freely reaches the edges of the sheet.',
      deckle: 'An irregular clean paper margin surrounds the painting.',
      vignette: 'The wash gradually disappears into generous untouched paper around the edges.',
    }),
  },

  async apply(capture, a, context, signal) {
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };
    await pause();
    const { size, color, normal, identity, diffuse: lighting } = capture, count = size * size, unit = size / 720;
    const palette = PALETTES[a.palette];
    const paper: RGB = a.paper === 'bright' ? [253, 253, 249] : a.paper === 'cream' ? [246, 236, 211] : [250, 247, 237];
    const noise = pigmentNoise(context.seed ^ 0x47fa930d);
    const fields = [new Float32Array(count), new Float32Array(count), new Float32Array(count)];
    const tone = new Float32Array(count), clouds = new Float32Array(count), tooth = new Float32Array(count);
    const wetness = clamp01(a.water * (a.process === 'wet' ? 1.1 : a.process === 'dry' ? 0.45 : a.process === 'botanical' ? 0.55 : 0.8));
    const load = (0.55 + a.pigment * 1.05) * (a.process === 'botanical' ? 0.85 : 1);
    for (let y = 0; y < size; y++) {
      if (y % 40 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const i = y * size + x, p = i * 4, id = identity[p];
        const red = color[p] / 255, green = color[p + 1] / 255, blue = color[p + 2] / 255;
        const light = red * 0.2126 + green * 0.7152 + blue * 0.0722;
        tone[i] = light;
        clouds[i] = noise.field(x, y, 29 * unit);
        tooth[i] = noise.field(x + 91 * unit, y - 47 * unit, 4.5 * unit);
        const warm = clamp01(0.3 + (red - blue) * 2.1 + context.mood.warmth * 0.15);
        const leafy = clamp01((green - (red + blue) * 0.5) * 3.5);
        const maximum = Math.max(red, green, blue, 0.01), minimum = Math.min(red, green, blue);
        const saturation = (maximum - minimum) / maximum;
        const shadow = 1 - (lighting[p] * 0.2126 + lighting[p + 1] * 0.7152 + lighting[p + 2] * 0.0722) / 255;
        const preserve = 1 - smooth(0.66 - a.whites * 0.14, 1 - a.whites * 0.05, light) * (0.5 + a.whites * 0.5);
        let concentration = id >= 2 ? (0.04 + Math.pow(1 - light, 0.82) * 0.6 + shadow * 0.055) * load * preserve
          : id === 1 ? (0.018 + (1 - light) * 0.18) * load : (1 - light) * 0.045 * load;
        concentration *= 0.8 + clouds[i] * 0.4;
        for (let c = 0; c < 3; c++) {
          let pigment = mix(mix(palette.cool[c], palette.warm[c], warm), palette.green[c], leafy) / 255;
          if (a.palette === 'natural') pigment = mix(pigment, [red, green, blue][c] / maximum * 0.7, saturation * 0.75);
          fields[c][i] = concentration * (1 - pigment) * 2.65;
        }
      }
    }
    const radius = Math.max(1, Math.round((1.5 + wetness * 9) * unit));
    const soft = [];
    for (const field of fields) soft.push(await diffuse(field, size, radius, pause));
    const blend = a.process === 'wet' ? 0.5 + wetness * 0.3 : a.process === 'botanical' ? 0.16 + wetness * 0.26 : a.process === 'dry' ? 0.16 + wetness * 0.3 : 0.32 + wetness * 0.28;
    const edgeStrength = { lost: 0.025, selective: 0.13, crisp: 0.25 }[a.edges] * (a.process === 'botanical' ? 1.3 : a.process === 'wet' ? 0.55 : 1);
    const pixels = new Uint8ClampedArray(count * 4);
    for (let y = 0; y < size; y++) {
      if (y % 32 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const i = y * size + x, p = i * 4, id = identity[p];
        const left = y * size + Math.max(0, x - 1), right = y * size + Math.min(size - 1, x + 1);
        const above = Math.max(0, y - 1) * size + x, below = Math.min(size - 1, y + 1) * size + x;
        const boundary = identity[left * 4] !== id || identity[above * 4] !== id || identity[right * 4] !== id || identity[below * 4] !== id;
        const gradient = Math.abs(tone[right] - tone[left]) + Math.abs(tone[below] - tone[above]);
        const shape = (Math.abs(normal[right * 4] - normal[left * 4]) + Math.abs(normal[below * 4 + 1] - normal[above * 4 + 1])) / 255;
        const selective = a.edges === 'selective' ? smooth(0.35, 0.7, clouds[i] + (1 - tone[i]) * 0.18) : 1;
        const contour = id >= 2 ? Math.max(boundary ? 0.7 : 0, gradient * 1.2, shape * 0.55) * edgeStrength * selective : 0;
        const grain = noise.cell(x, y), fibre = Math.sin(y * 1.6 / unit + clouds[i] * 5) * 0.6;
        const granule = 1 + ((tooth[i] - 0.5) * 0.6 + (grain - 0.5) * 0.4) * a.granulation;
        const wrinkle = Math.sin(clouds[i] * 21 + tooth[i] * 0.9);
        const backrun = wetness * 0.08 * Math.pow(Math.max(0, wrinkle), 6);
        const drySkip = a.process === 'dry' ? smooth(0.57, 0.92, tooth[i] * 0.55 + grain * 0.45 + Math.max(0, fibre) * 0.16) * 0.75 : 0;
        const bleedX = Math.max(0, Math.min(size - 1, Math.round(x + (clouds[i] - 0.5) * wetness * 5 * unit)));
        const bleedY = Math.max(0, Math.min(size - 1, Math.round(y + (tooth[i] - 0.5) * wetness * 4 * unit)));
        const sample = bleedY * size + bleedX;
        const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
        const margin = size * 0.045 + (clouds[i] - 0.5) * 12 * unit;
        const sheet = a.sheet === 'open' ? 1 : a.sheet === 'deckle' ? smooth(margin - unit, margin + unit * 2, edge) : smooth(size * 0.025, size * 0.17, edge);
        for (let c = 0; c < 3; c++) {
          const puddle = Math.max(0, fields[c][i] - soft[c][i]) * (0.15 + a.pigment * 0.35) * (0.4 + clouds[i] * 0.6);
          let density = (mix(fields[c][i], soft[c][sample], blend) * granule + puddle + contour + backrun * fields[c][i]) * (1 - drySkip) * sheet;
          // Transparent layers absorb light; untouched areas stay the colour of the actual paper.
          density = Math.max(0, density);
          pixels[p + c] = paper[c] * Math.exp(-density) + (grain - 0.5) * (1.8 + a.granulation * 2.8) + fibre;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return {
      pixels,
      notes: [`${{ wet: 'Wet-on-wet', dry: 'Dry-brush', botanical: 'Botanical', pleinair: 'Plein-air' }[a.process]} watercolor in ${a.palette} pigments`, `${a.paper} paper, ${a.edges} edges and ${a.sheet} sheet`, 'Transparent pigment, granulation, edge pooling and reserved paper whites'],
    };
  },
});
