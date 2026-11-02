import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    ground: choice('How was the copper prepared before the image was scraped into it?', {
      fine: 'A finely rocked plate holding close, even velvet grain.',
      coarse: 'Broad rocking teeth leave a visible field of granular black.',
      crossed: 'Two directions of rocking leave a delicate crossing tooth.',
      irregular: 'An uneven hand-rocked ground opens into small islands of grain.',
    }),
    burnish: score('How much light has the burnisher lifted from the black plate?', ['Deep black with tiny lights', 'Restrained low light', 'Balanced shadows and lights', 'Broad polished highlights', 'Pale luminous surfaces']),
    hardness: score('How abruptly does polished light meet the remaining burr?', ['Long velvet transitions', 'Soft', 'Defined', 'Firm', 'Hard carved light']),
    scrape: choice('What marks the scraping tool leaves across the forms?', {
      smooth: 'Polished smooth tones with almost no directional scratches.',
      curved: 'Curving scraper strokes follow the modelled surfaces.',
      diagonal: 'Fine diagonal scrapes run through the middle tones.',
      cross: 'A second opposing scrape makes a fine crossed silver texture.',
    }),
    ink: choice('What body does the printing ink have? Its hues follow the picture palette.', {
      velvet: 'A dense soft black with warm mineral middle tones.',
      sepia: 'A transparent earthy ink with open brown half-tones.',
      silver: 'A cool near-neutral black with clean silvery light.',
      sanguine: 'An iron-rich warm ink with glowing terracotta half-tones.',
    }),
    wipe: choice('How was ink wiped from the plate before printing?', {
      clean: 'Clean plate tone with bright open paper.',
      veil: 'A thin plate-tone veil remains across the light.',
      halo: 'A wiped pool of brightness opens around the centre.',
      edges: 'Ink gathers in the outer plate corners.',
    }),
    stock: choice('What stock receives the intaglio impression?', {
      smooth: 'Smooth warm cotton with only a fine tooth.',
      laid: 'Laid paper with thin parallel chain lines.',
      fibrous: 'Soft handmade stock with irregular pale fibres.',
      grey: 'A quiet middle-grey sheet for pale lifted highlights.',
    }),
    pressure: score('How hard does the press drive the paper into the plate?', ['A light ghost impression', 'Soft ink', 'Even impression', 'Dense burr', 'Heavy velvety ink']),
    edge: choice('How is the plate presented on the sheet?', {
      bleed: 'The image fills the sheet.',
      bite: 'A narrow white margin and sharply embossed plate mark.',
      broad: 'A generous paper surround with a deep plate bevel.',
      oval: 'A softly wiped oval image inside the rectangular plate.',
    }),
    history: choice('What trace of the plate’s life remains in this impression?', {
      fresh: 'A fresh plate with an even ground.',
      worn: 'A later impression, its burr worn pale in the lower corners.',
      scratch: 'A single fine accidental scratch cuts through the ink.',
      proof: 'An unfinished working proof, one corner only lightly burnished.',
    }),
  },
  async apply(capture, a, context, signal) {
    const { size, color, identity, normal } = capture;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const inkSets = {
      velvet: { dark: [20, 19, 25], middle: [106, 91, 81], paper: [240, 232, 211] },
      sepia: { dark: [54, 34, 25], middle: [155, 113, 75], paper: [243, 231, 203] },
      silver: { dark: [22, 28, 34], middle: [116, 127, 132], paper: [239, 241, 231] },
      sanguine: { dark: [68, 25, 22], middle: [167, 81, 57], paper: [245, 224, 200] },
    } as const;
    const { dark, middle, paper } = rekey(inkSets[a.ink], context.palette, { dark: 'ink', middle: 'second', paper: 'ground' });
    const unit = size / 720;
    const grain = { fine: 0.65, coarse: 1.35, crossed: 0.85, irregular: 1.1 }[a.ground] * unit;
    const margin = a.edge === 'bleed' ? 0 : Math.round(size * (a.edge === 'broad' ? 0.065 : 0.026));
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size;
        const raw = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        let tone = clamp01((raw - 0.48) * mix(0.85, 1.85, a.hardness) + mix(0.2, 0.7, a.burnish));
        const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
        const outside = edgeDist < margin;
        const nx = normal[p] / 255 * 2 - 1, ny = normal[p + 1] / 255 * 2 - 1;
        const scratchPhase = a.scrape === 'curved' ? (x * (0.6 + nx * 0.2) + y * (0.4 + ny * 0.2)) / unit : (x + y * 0.63) / unit;
        const scrape = a.scrape === 'smooth' ? 0 : (Math.sin(scratchPhase * 1.9) + (a.scrape === 'cross' ? Math.sin((x - y * 0.8) / unit * 1.7) : 0)) * 0.035 * (1 - Math.abs(tone * 2 - 1));
        tone += scrape;
        if (a.wipe === 'veil') tone -= 0.06;
        if (a.wipe === 'halo') tone += Math.exp(-((u - 0.5) ** 2 + (v - 0.46) ** 2) * 10) * 0.13;
        if (a.wipe === 'edges') tone -= ((u - 0.5) ** 2 + (v - 0.5) ** 2) * 0.28;
        if (a.history === 'worn') tone += Math.max(0, v - 0.6) * Math.abs(u - 0.5) * 0.9;
        if (a.history === 'proof' && u < 0.22 && v > 0.7) tone *= 0.6;
        if (a.history === 'scratch' && Math.abs(u - 0.69 + v * 0.035 + Math.sin(v * 10) * 0.002) < 0.0007) tone = 0.92;
        if (identity[p] >= 2) {
          tone = Math.min(tone, 0.94);
          const step = Math.max(1, Math.round(unit));
          const right = (y * size + Math.min(size - 1, x + step)) * 4;
          const down = (Math.min(size - 1, y + step) * size + x) * 4;
          if (identity[p] !== identity[right] || identity[p] !== identity[down]) tone -= 0.12;
        }
        const n = hash(Math.floor(x / grain), Math.floor(y / grain), context.seed);
        let threshold = n;
        if (a.ground === 'crossed') threshold = clamp01(n * 0.82 + Math.sin((x + y) / unit * 2) * 0.09);
        if (a.ground === 'irregular') threshold = clamp01(n * 0.88 + hash(Math.floor(x / (unit * 8)), Math.floor(y / (unit * 8)), context.seed + 91) * 0.18);
        const density = clamp01((1 - tone) * mix(0.72, 1.15, a.pressure));
        const black = threshold < density;
        // Preserve local tone as well as burr dots, so tiny objects remain legible across a room.
        const grainTone = mix(clamp01(tone), black ? 0 : 1, identity[p] >= 3 ? 0.4 : 0.48);
        const oval = a.edge === 'oval' ? clamp01((Math.hypot((u - 0.5) / 0.46, (v - 0.5) / 0.47) - 0.88) * 8) : 0;
        let paperNoise = (hash(x, y, context.seed + 17) - 0.5) * 3;
        if (a.stock === 'laid') paperNoise -= (y % Math.max(2, Math.round(7 * unit)) === 0 ? 4 : 0);
        if (a.stock === 'fibrous') paperNoise += Math.sin(x / unit * 0.8 + Math.sin(y / unit * 0.06)) * 2.5;
        for (let c = 0; c < 3; c++) {
          const stock = paper[c] - (a.stock === 'grey' ? 28 : 0);
          const t = grainTone < 0.5 ? mix(dark[c], middle[c], grainTone * 2) : mix(middle[c], stock, grainTone * 2 - 1);
          const bevel = margin && Math.abs(edgeDist - margin) < 1.5 * unit ? (edgeDist < margin ? -20 : 8) : 0;
          pixels[p + c] = mix(outside ? stock : t, stock, oval) + paperNoise + bevel;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.ground} rocked ground, ${a.scrape} scraping`, `${a.ink} ink on ${a.stock} stock`, `${a.history} impression, ${a.edge} plate edge`] };
  },
});
