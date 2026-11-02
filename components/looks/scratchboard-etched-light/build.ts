import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
export default defineLook({
  questions: {
    tool: choice('What cuts through the dark surface?', {
      needle: 'A fine needle leaves precise tapering scratches.',
      comb: 'A small comb makes groups of parallel cuts.',
      blade: 'A narrow blade exposes broader ribbons of light.',
      stipple: 'A pointed tool picks out many tiny light dots.',
    }),
    reveal: choice('What layer appears beneath the ink?', {
      ivory: 'Warm ivory clay beneath the dark coating.',
      white: 'Bright white clay with strong clean highlights.',
      copper: 'Warm copper-coloured foil catches the scratched light.',
      colour: 'A muted multicoloured underpainting follows the scene colours.',
    }),
    coating: choice('What dark coating is scratched away? Hues follow the picture palette.', {
      black: 'Deep charcoal-black ink with quiet warm undertones.',
      blue: 'Dark blue ink, cool and nocturnal.',
      sepia: 'Deep sepia ink, warm and archival.',
      green: 'Very dark green ink, botanical and hushed.',
    }),
    strokes: choice('In what direction do the scratches run?', {
      form: 'Fine cuts follow the direction of each surface.',
      cross: 'Two crossing families of cuts build the lights.',
      parallel: 'Disciplined diagonal cuts run across each form.',
      curved: 'Long gently curving cuts describe the volumes.',
    }),
    spacing: score('How closely are the cuts placed?', ['Sparse isolated cuts', 'Open strokes', 'Even engraved marks', 'Closely cut light', 'Dense fine hatching']),
    pressure: score('How deeply does the tool scrape the board?', ['Hairline grazes', 'Light cuts', 'Firm pale cuts', 'Strong bright cuts', 'Broad exposed clay']),
    balance: choice('How much of the picture is pulled out of darkness?', {
      silhouette: 'Dark silhouettes with only bright edge accents.',
      restrained: 'A restrained range of lights emerges from broad dark passages.',
      balanced: 'Clear middle values describe the whole scene.',
      luminous: 'Many close cuts open the image into luminous light.',
    }),
    edges: choice('How are the outlines cut?', {
      fine: 'Fine continuous pale outlines.',
      broken: 'Short interrupted outlines leave a handmade rhythm.',
      soft: 'The scratched shading carries most edges without a drawn outline.',
      doubled: 'Two nearby cuts reinforce the main silhouettes.',
    }),
    border: choice('How does the scratched image meet the edge of the board?', {
      full: 'Dark board extends to the edge.',
      ruled: 'A fine double scratched rule frames the image.',
      rough: 'A rough scraped edge exposes the pale layer.',
      plate: 'A plain dark margin surrounds the cut picture.',
    }),
    history: choice('What trace of the working process remains?', {
      clean: 'A clean finished board.',
      trial: 'A few practice scratches remain in a lower corner.',
      repaired: 'A small retouched dark patch covers an earlier cut.',
      scuffed: 'Light scuffs from handling remain near the board edges.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const sets = {
      black: { dark: [27, 28, 28], light: [234, 222, 192] },
      blue: { dark: [24, 37, 52], light: [219, 228, 222] },
      sepia: { dark: [55, 38, 29], light: [236, 215, 170] },
      green: { dark: [29, 45, 36], light: [220, 226, 193] },
    } as const;
    const colours = rekey(sets[a.coating], context.palette, { dark: 'ink', light: 'ground' });
    const lum = (p: number) => clamp01((color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255);
    const brightness = { silhouette: 0.24, restrained: 0.46, balanced: 0.68, luminous: 0.87 }[a.balance];
    const step = Math.max(1, Math.round(unit));
    const revealed = (p: number, c: number) => a.reveal === 'colour' ? mix(color[p + c], colours.light[c], 0.34) : a.reveal === 'copper' ? [221, 160, 102][c] : a.reveal === 'white' ? 246 : colours.light[c];
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], tone = lum(p);
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        let contour = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 92);
        if (a.edges === 'broken') contour &&= Math.floor((x + y) / (4 * unit)) % 3 !== 0;
        if (a.edges === 'doubled') { const q2 = (y * size + Math.min(size - 1, x + step * 3)) * 4; contour ||= id >= 2 && id !== identity[q2]; }
        for (let c = 0; c < 3; c++) {
          let value = colours.dark[c] * 0.75 + 4;
          if (id >= 1) value = mix(value, revealed(p, c), Math.pow(tone, 1.7) * (0.32 + brightness * 0.38));
          if (contour) value = mix(value, revealed(p, c), a.edges === 'soft' ? 0.38 : a.balance === 'silhouette' ? 0.85 : 0.68);
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    const grid = mix(4.6, 2.1, a.spacing) * unit;
    for (let gy = 0; gy < size; gy += grid) {
      if (Math.floor(gy / grid) % 18 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let gx = 0; gx < size; gx += grid) {
        const ix = Math.floor(gx / grid), iy = Math.floor(gy / grid), x = Math.min(size - 1, Math.floor(gx + hash(ix, iy, context.seed + 1) * grid)), y = Math.min(size - 1, Math.floor(gy + hash(ix, iy, context.seed + 2) * grid));
        const p = (y * size + x) * 4, id = identity[p];
        if (id === 0 || hash(ix, iy, context.seed + 3) > Math.pow(lum(p), 2.5) * (0.1 + brightness * 0.62)) continue;
        let angle = Math.atan2(normal[p + 1] - 128, normal[p] - 128) + Math.PI / 2;
        if (a.strokes === 'parallel') angle = -0.65;
        if (a.strokes === 'cross') angle = (ix + iy) % 2 ? 0.65 : -0.65;
        const length = (a.tool === 'stipple' ? 1.1 : a.tool === 'blade' ? 7 : 5) * unit;
        const passes = a.tool === 'comb' ? 3 : a.tool === 'blade' ? 2 : 1;
        for (let pass = 0; pass < passes; pass++) for (let t = -length / 2; t <= length / 2; t += Math.max(0.5, unit * 0.55)) {
          const bend = a.strokes === 'curved' ? Math.sin(t / length * Math.PI) * unit * 1.5 : 0;
          const offset = bend + (pass - (passes - 1) / 2) * (a.tool === 'comb' ? 1.6 : 0.8) * unit;
          const xx = Math.round(x + Math.cos(angle) * t - Math.sin(angle) * offset), yy = Math.round(y + Math.sin(angle) * t + Math.cos(angle) * offset);
          if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
          const q = (yy * size + xx) * 4;
          if (identity[q] !== id) continue;
          const alpha = mix(0.18, 0.6, a.pressure) * (1 - Math.abs(t) / length * 0.55) * Math.pow(lum(q), 1.5) / Math.sqrt(passes);
          for (let c = 0; c < 3; c++) pixels[q + c] = mix(pixels[q + c], revealed(q, c), alpha);
        }
      }
    }
    for (let y = 0; y < size; y++) {
      if (y % 64 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, edge = Math.min(u, v, 1 - u, 1 - v);
        const rule = a.border === 'ruled' && Math.min(Math.abs(edge - 0.022), Math.abs(edge - 0.031)) < 0.0013;
        const rough = a.border === 'rough' && edge < 0.012 + hash(Math.floor(x / unit), Math.floor(y / unit), context.seed) * 0.007;
        const trial = a.history === 'trial' && u > 0.83 && u < 0.92 && v > 0.88 && v < 0.94 && Math.floor((x + y) / (3 * unit)) % 3 === 0;
        const scuff = a.history === 'scuffed' && edge < 0.07 && hash(Math.floor(x / (13 * unit)), Math.floor(y / unit), context.seed + 12) > 0.97;
        for (let c = 0; c < 3; c++) {
          if (a.border === 'plate' && edge < 0.025) pixels[p + c] = colours.dark[c] * 0.65;
          if (rule || rough || trial || scuff) pixels[p + c] = mix(pixels[p + c], revealed(p, c), scuff ? 0.3 : 0.8);
          if (a.history === 'repaired' && u > 0.82 && u < 0.9 && v > 0.84 && v < 0.91) pixels[p + c] = colours.dark[c] * 0.8;
        }
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.tool} cuts through ${a.coating} to ${a.reveal}`, `${a.strokes} strokes, ${a.balance} lights and ${a.edges} edges`, `${a.border} board, ${a.history} finish`] };
  },
});
