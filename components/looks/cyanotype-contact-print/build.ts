import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
const line = (v: number, period: number) => Math.abs(v / period - Math.floor(v / period) - 0.5) * period;
export default defineLook({
  questions: {
    process: choice('What character does the contact print have?', {
      classic: 'Deep iron-blue shadows and clean pale paper lights.',
      toned: 'A softly toned brown-blue print with warm light passages.',
      split: 'Cool dark blue sits beside warmer washed midtones.',
      wet: 'A wet experimental print has gentle cloudy colour blooms.',
    }),
    negative: choice('What sort of exposure makes the image?', {
      continuous: 'A photographic negative gives a complete continuous-tone image.',
      silhouettes: 'A photogram-like exposure leaves pale object silhouettes on a dark field.',
      drawing: 'A fine line negative gives clear contours and light shaded forms.',
      reversal: 'Partially reversed tones produce pale shadow shapes and dark lights.',
    }),
    coating: choice('How was the sensitised area coated?', {
      brushed: 'Long brush strokes leave an irregular coated boundary.',
      roller: 'An even rectangular coating stops cleanly short of the paper edges.',
      pooled: 'A hand-poured coating has softly pooled and scalloped edges.',
      full: 'The coating fills the whole sheet.',
    }),
    exposure: score('How deep is the exposure?', ['Very pale and airy', 'Light exposure', 'Balanced middle values', 'Dense rich shadows', 'A deeply exposed saturated print']),
    paper: choice('What paper holds the print?', {
      cotton: 'Soft cotton rag with a gentle fine tooth.',
      smooth: 'Smooth bright paper with little visible grain.',
      fibre: 'Thicker handmade paper with occasional long fibres.',
      linen: 'A faint woven linen texture shows through the emulsion.',
    }),
    washing: choice('What has the rinse left behind?', {
      clear: 'An even clean rinse with crisp pale highlights.',
      pale: 'A long wash has gently lightened the entire image.',
      tides: 'Faint curved tide marks remain near the lower edge.',
      droplets: 'Small pale droplets interrupt a few dark passages.',
    }),
    contact: choice('How closely did the negative touch the sheet?', {
      tight: 'Close contact gives crisp edges and fine details.',
      soft: 'A slightly lifted negative softens the edge transitions.',
      shifted: 'A small slip leaves a second faint image edge.',
      doubled: 'Two close exposures create a more visible echo of the forms.',
    }),
    border: choice('How was the paper held during exposure?', {
      free: 'The sheet lies free, with no fixing marks.',
      pins: 'Four pale pin-head reserves remain near the corners.',
      easel: 'A narrow unexposed easel border encloses the image.',
      torn: 'A rough torn edge leaves a broken pale boundary.',
    }),
    registration: choice('What practical darkroom marks remain?', {
      clean: 'No registration marks remain.',
      crosses: 'Four small alignment crosses mark the coated area.',
      scale: 'A narrow graduated exposure scale sits along the lower margin.',
      brackets: 'Short corner brackets locate the original negative.',
    }),
    history: choice('What has happened to the finished print?', {
      fresh: 'A fresh clean print, newly dried.',
      fold: 'One gentle fold has whitened a narrow line across the sheet.',
      bleed: 'A little blue pigment has bled beyond one coated edge.',
      scratched: 'A few fine pale scratches cross the lower corner.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(color.length);
    const sets = {
      classic: { dark: [17, 49, 91], mid: [66, 114, 160], paper: [237, 236, 215], bloom: [132, 169, 170] },
      toned: { dark: [48, 48, 62], mid: [123, 103, 91], paper: [232, 219, 191], bloom: [153, 138, 112] },
      split: { dark: [27, 48, 83], mid: [128, 134, 116], paper: [239, 226, 201], bloom: [163, 120, 105] },
      wet: { dark: [32, 45, 91], mid: [76, 127, 154], paper: [232, 228, 204], bloom: [165, 134, 158] },
    } as const;
    const dye = rekey(sets[a.process], context.palette, { dark: 'ink', mid: 'ink', paper: 'ground', bloom: 'second' });
    const step = Math.max(1, Math.round(unit));
    const index = (x: number, y: number) => (Math.max(0, Math.min(size - 1, y)) * size + Math.max(0, Math.min(size - 1, x))) * 4;
    const toneAt = (p: number) => (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], u = x / size, v = y / size;
        const q = index(x + step, y), r = index(x, y + step);
        const edge = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 80);
        let tone = toneAt(p);
        if (a.contact === 'soft') tone = (tone * 2 + toneAt(index(x - step, y)) + toneAt(q) + toneAt(index(x, y - step)) + toneAt(r)) / 6;
        if (a.contact === 'shifted' || a.contact === 'doubled') {
          const offset = Math.max(1, Math.round(unit * (a.contact === 'doubled' ? 5 : 2)));
          tone = mix(tone, toneAt(index(x - offset, y - offset)), a.contact === 'doubled' ? 0.42 : 0.23);
        }
        if (a.negative === 'silhouettes') tone = id >= 2 ? 0.76 + tone * 0.22 : id === 1 ? 0.16 + tone * 0.19 : 0.04;
        if (a.negative === 'drawing') tone = edge ? 0.12 : 0.72 + tone * 0.25;
        if (a.negative === 'reversal') tone = Math.abs(tone - 0.37) / 0.63;
        tone = clamp01(Math.pow(clamp01(tone), mix(0.6, 1.8, a.exposure)));
        if (a.washing === 'pale') tone = mix(tone, 1, 0.22);
        const edgeCoord = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? y / unit : x / unit;
        const margin = Math.min(u, v, 1 - u, 1 - v);
        const coatEdge = a.coating === 'full' ? -1 : a.coating === 'roller' ? 0.035 : a.coating === 'brushed' ? 0.029 + hash(Math.floor(edgeCoord / 5), 0, context.seed) * 0.022 : 0.036 + Math.sin(edgeCoord * 0.05) * 0.009 + Math.sin(edgeCoord * 0.017) * 0.006;
        let coated = clamp01((margin - coatEdge) * size / Math.max(1, 2 * unit));
        if (a.border === 'easel' && margin < 0.055) coated = 0;
        if (a.border === 'torn' && margin < 0.012 + hash(Math.floor(edgeCoord / 3), 8, context.seed) * 0.01) coated = 0;
        if (a.border === 'pins' && ((Math.min(u, 1 - u) - 0.065) ** 2 + (Math.min(v, 1 - v) - 0.065) ** 2 < 0.000035)) tone = 0.98;
        const grain = hash(Math.floor(x / Math.max(1, unit)), Math.floor(y / Math.max(1, unit)), context.seed + 4);
        const cloud = Math.sin(u * 17 + Math.sin(v * 14)) * Math.sin(v * 21 + u * 3) * 0.5 + 0.5;
        if (a.washing === 'tides' && v > 0.74 && Math.abs(Math.sin(v * 85 + Math.sin(u * 13) * 2)) > 0.985) tone = Math.max(0, tone - 0.075);
        if (a.washing === 'droplets') {
          const cell = 25 * unit, cx = Math.floor(x / cell), cy = Math.floor(y / cell);
          const dx = x / cell - cx - 0.5, dy = y / cell - cy - 0.5;
          if (hash(cx, cy, context.seed + 9) > 0.91 && dx * dx + dy * dy < 0.025) tone = mix(tone, 1, 0.46);
        }
        if (a.history === 'fold' && Math.abs(v - 0.58 - u * 0.015) < 0.0018) tone = mix(tone, 1, 0.6);
        if (a.history === 'scratched' && u > 0.74 && v > 0.78 && line((u + v * 0.3) * size, 8 * unit) < 0.36 * unit) tone = mix(tone, 1, 0.45);
        let registration = false;
        const cornerX = Math.abs(Math.min(u, 1 - u) - 0.075), cornerY = Math.abs(Math.min(v, 1 - v) - 0.075);
        if (a.registration === 'crosses') registration = cornerX < 0.0013 && cornerY < 0.011 || cornerY < 0.0013 && cornerX < 0.011;
        if (a.registration === 'brackets') registration = cornerX < 0.0013 && cornerY < 0.026 || cornerY < 0.0013 && cornerX < 0.026;
        if (a.registration === 'scale' && v > 0.918 && v < 0.945 && u > 0.28 && u < 0.72) { tone = Math.floor((u - 0.28) / 0.044) / 10; coated = 1; }
        for (let c = 0; c < 3; c++) {
          let value = tone < 0.5 ? mix(dye.dark[c], dye.mid[c], tone * 2) : mix(dye.mid[c], dye.paper[c], tone * 2 - 1);
          if (a.process === 'wet') value = mix(value, dye.bloom[c], cloud * 0.14 * (1 - tone));
          value = mix(dye.paper[c], value, coated);
          if (a.history === 'bleed' && u < 0.07 && v > 0.45 && v < 0.8) value = mix(value, dye.mid[c], Math.max(0, Math.sin(v * 40 + u * 20)) * 0.22);
          if (registration) value = dye.dark[c];
          let texture = (grain - 0.5) * (a.paper === 'smooth' ? 1 : a.paper === 'cotton' ? 4 : 6);
          if (a.paper === 'fibre') texture += Math.sin(x / unit * 0.27 + Math.sin(y / unit * 0.035)) * Math.sin(y / unit * 2.8) * 2.5;
          if (a.paper === 'linen') texture += Math.sin(x / unit * 2.3) * Math.cos(y / unit * 2.3) * 2;
          pixels[p + c] = value + texture;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.process} cyanotype from a ${a.negative} negative`, `${a.coating} coating on ${a.paper}, ${a.washing} rinse`, `${a.contact} contact and ${a.border} border`] };
  },
});
