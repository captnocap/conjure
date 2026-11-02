import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    making: choice('How are the wool shapes assembled?', {
      needle: 'Fine needle-felted fibres gradually build soft continuous shapes.',
      wet: 'Wet-felted wool lies flatter, with slightly blended edges.',
      applique: 'Cut pieces of felt sit in distinct overlapping patches.',
      relief: 'Thick sculpted felt rises above a softer backing.',
    }),
    fibre: choice('What character of fibre is visible?', {
      fine: 'Fine smooth wool with short close fibres.',
      coarse: 'Long coarse wool strands remain clearly visible.',
      curly: 'Small curly locks form soft loops and tangled tufts.',
      silk: 'A few long bright silk-like strands catch the light.',
    }),
    direction: choice('How does the maker lay the fibres?', {
      surface: 'Strands follow the direction of the captured surfaces.',
      cross: 'Successive layers cross at right angles.',
      flowing: 'Gentle flowing swirls join the larger forms.',
      tangled: 'Short fibres turn in many directions like a dense felt pad.',
    }),
    thickness: score('How thick are the visible fibre bundles?', ['Fine wisps', 'Small strands', 'Clear wool bundles', 'Bold tufts', 'Thick sculpted locks']),
    palette: choice('What family of dyed wool describes the scene? Hues follow the picture palette.', {
      meadow: 'Natural greens and ochres with a warm rose accent.',
      winter: 'Quiet grey-blue wool, cream highlights and a dark blue base.',
      bright: 'Bright clean dyed wool with warm and cool contrasts.',
      undyed: 'Natural ivory, oat, brown and charcoal fleece.',
    }),
    nap: score('How fluffy is the finished wool surface?', ['Closely needled flat felt', 'A little soft nap', 'Soft wool pile', 'Loose fluffy fibres', 'Very airy unruly fleece']),
    seams: choice('What joins the edges of the felt shapes?', {
      hidden: 'The fibres merge without a visible stitched seam.',
      running: 'Short pale running stitches follow the silhouettes.',
      blanket: 'Dark blanket-stitch loops reinforce the edges.',
      cord: 'A raised coloured wool cord outlines the shapes.',
    }),
    backing: choice('What backing remains visible around the felt?', {
      cream: 'Pale dense felt with a quiet soft grain.',
      linen: 'Natural woven linen showing through the wool.',
      dark: 'A deep charcoal felt ground.',
      rose: 'A muted rose-coloured backing cloth.',
    }),
    border: choice('How is the wool picture finished at its edges?', {
      full: 'The felt picture reaches the edge.',
      raw: 'A fuzzy raw border leaves stray wool along the edge.',
      stitch: 'A sewn rectangular line secures the outer edge.',
      rolled: 'A thick rounded wool binding frames the image.',
    }),
    history: choice('What trace of making or use is visible?', {
      fresh: 'A freshly finished unmarked felt picture.',
      patched: 'A small contrasting felt patch repairs a lower corner.',
      pilled: 'A few tiny pills of wool gather on the surface.',
      unfinished: 'One corner is still a thin layer of loose fibres over the backing.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const sets = {
      meadow: { dark: [44, 58, 39], mid: [139, 150, 92], light: [236, 224, 188], accent: [174, 103, 103] },
      winter: { dark: [39, 51, 68], mid: [125, 147, 161], light: [234, 233, 220], accent: [154, 133, 113] },
      bright: { dark: [43, 46, 61], mid: [72, 145, 154], light: [244, 229, 184], accent: [205, 102, 65] },
      undyed: { dark: [52, 44, 39], mid: [153, 131, 101], light: [234, 221, 186], accent: [120, 91, 63] },
    } as const;
    const dye = rekey(sets[a.palette], context.palette, { dark: 'ink', mid: 'second', light: 'ground', accent: 'second' });
    const back = { cream: [230, 223, 202], linen: [205, 193, 163], dark: [49, 49, 50], rose: [175, 133, 129] }[a.backing];
    const step = Math.max(1, Math.round(unit));
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], u = x / size, v = y / size;
        let tone = clamp01((color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255);
        if (a.making === 'applique') tone = Math.round(tone * 5) / 5;
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const outline = id >= 2 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 85);
        const stitched = outline && (a.seams === 'cord' || Math.floor((x + y) / (4 * unit)) % 2 === 0);
        const edge = Math.min(u, v, 1 - u, 1 - v), edgeCoord = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? y / unit : x / unit;
        const raw = a.border === 'raw' && edge < 0.018 + hash(Math.floor(edgeCoord / 4), 7, context.seed) * 0.008;
        const border = a.border === 'rolled' && edge < 0.025;
        const stitch = a.border === 'stitch' && Math.abs(edge - 0.025) < 0.0018 && Math.floor(edgeCoord / 5) % 2 === 0;
        for (let c = 0; c < 3; c++) {
          const local = tone < 0.5 ? mix(dye.dark[c], dye.mid[c], tone * 2) : mix(dye.mid[c], dye.light[c], tone * 2 - 1);
          let value = a.palette === 'undyed' ? local : mix(local, color[p + c], 0.28);
          if (id === 0 || raw) value = back[c];
          if (outline) value *= a.making === 'relief' ? 0.73 : a.making === 'wet' ? 0.95 : 0.88;
          if (stitched && a.seams !== 'hidden') value = a.seams === 'running' ? dye.light[c] : a.seams === 'cord' ? dye.accent[c] : dye.dark[c];
          if (border) value = dye.accent[c] + Math.sin(edge / 0.025 * Math.PI) * 17;
          if (stitch) value = dye.dark[c];
          if (a.history === 'patched' && u > 0.77 && u < 0.91 && v > 0.8 && v < 0.92) value = dye.accent[c];
          if (a.history === 'unfinished' && u + v > 1.75) value = mix(value, back[c], 0.8);
          const tooth = a.backing === 'linen' && id === 0 ? Math.sin(x / unit * 1.7) * Math.cos(y / unit * 1.7) * 3 : 0;
          pixels[p + c] = value + tooth + (hash(x, y, context.seed) - 0.5) * mix(2, 7, a.nap);
        }
        pixels[p + 3] = 255;
      }
    }
    // Short, curved strands are laid over the whole image, clipped to their owning surface.
    const spacing = mix(3.2, 4.8, a.thickness) * unit;
    for (let gy = 0; gy < size; gy += spacing) {
      if (Math.floor(gy / spacing) % 16 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let gx = 0; gx < size; gx += spacing) {
        const ix = Math.floor(gx / spacing), iy = Math.floor(gy / spacing);
        const x = Math.min(size - 1, Math.floor(gx + hash(ix, iy, context.seed + 1) * spacing)), y = Math.min(size - 1, Math.floor(gy + hash(ix, iy, context.seed + 2) * spacing));
        const p = (y * size + x) * 4, id = identity[p];
        let angle = Math.atan2(normal[p + 1] - 128, normal[p] - 128) + Math.PI / 2;
        if (a.direction === 'cross') angle = (ix + iy) % 2 * Math.PI / 2 + 0.35;
        if (a.direction === 'flowing') angle = Math.sin(x / size * 9) + Math.cos(y / size * 7);
        if (a.direction === 'tangled') angle = hash(ix, iy, context.seed + 3) * Math.PI * 2;
        const length = ({ fine: 5, coarse: 14, curly: 10, silk: 19 }[a.fibre]) * mix(0.7, 1.3, a.nap) * unit;
        const strand = [pixels[p], pixels[p + 1], pixels[p + 2]], highlight = (hash(ix, iy, context.seed + 4) - 0.5) * (a.fibre === 'silk' ? 70 : 36);
        for (let t = -length / 2; t <= length / 2; t++) {
          const bend = Math.sin(t / Math.max(1, length) * (a.fibre === 'curly' ? Math.PI * 5 : Math.PI * 2)) * (a.fibre === 'curly' ? 1.6 : 0.35) * unit;
          const xx = Math.round(x + Math.cos(angle) * t - Math.sin(angle) * bend), yy = Math.round(y + Math.sin(angle) * t + Math.cos(angle) * bend);
          if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
          const q = (yy * size + xx) * 4;
          if (identity[q] !== id) continue;
          const alpha = mix(0.17, 0.45, a.thickness) * (1 - Math.abs(t) / length);
          for (let c = 0; c < 3; c++) pixels[q + c] = mix(pixels[q + c], strand[c] + highlight, alpha);
        }
        if (a.history === 'pilled' && hash(ix, iy, context.seed + 8) > 0.988) {
          const radius = 1.3 * unit;
          for (let dy = -Math.ceil(radius); dy <= radius; dy++) for (let dx = -Math.ceil(radius); dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius || x + dx < 0 || y + dy < 0 || x + dx >= size || y + dy >= size) continue;
            const q = ((y + dy) * size + x + dx) * 4;
            if (identity[q] === id) for (let c = 0; c < 3; c++) pixels[q + c] = strand[c] + 10 - (dx + dy) / unit * 7;
          }
        }
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.making} felt with ${a.fibre} fibres laid ${a.direction}`, `${a.palette} wool over ${a.backing}, ${a.seams} seams`, `${a.border} edge, ${a.history} surface`] };
  },
});
