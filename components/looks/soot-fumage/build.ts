import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
const noise = (x: number, y: number, seed: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return mix(mix(hash(ix, iy, seed), hash(ix + 1, iy, seed), u), mix(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), u), v);
};
export default defineLook({
  questions: {
    flow: choice('How is the soot deposited?', {
      veils: 'Thin overlapping smoke veils gently shade the forms.',
      plumes: 'Narrow flame-like plumes rise through the darker passages.',
      eddies: 'Small curling eddies leave rounded pools of soot.',
      dragged: 'Long dragged soot streaks run through the picture.',
    }),
    lifting: choice('What tool lifts the lights out of the soot?', {
      none: 'The smoky light passages are left untouched.',
      feather: 'A soft feather lifts curved pale wisps from the deposits.',
      fingertip: 'Broad fingertip rubs soften a few luminous passages.',
      needle: 'Fine pale needle scratches describe small edges.',
    }),
    support: choice('What surface holds the soot? Hues follow the picture palette.', {
      ivory: 'Warm ivory paper with deep brown-black carbon.',
      cool: 'A cool pale grey ground with neutral charcoal soot.',
      sepia: 'An aged warm tan sheet with rich dark deposits.',
      dark: 'A deep grey ground bearing pale smoke-like marks.',
    }),
    deposit: score('How much soot has gathered?', ['A faint thin veil', 'Light deposits', 'Clear smoky shapes', 'Rich dark soot', 'Dense worked carbon shadows']),
    scale: score('How broad are the smoke eddies?', ['Very fine currents', 'Small swirls', 'Broad hand-sized eddies', 'Large cloud-like plumes', 'Sweeping smoke fields']),
    direction: choice('Which way do the smoke currents travel?', {
      rising: 'The main currents rise vertically.',
      oblique: 'The deposits sweep diagonally across the sheet.',
      radial: 'Smoke curls outward from a quiet centre.',
      surface: 'The currents bend around the orientation of each surface.',
    }),
    edge: choice('How does the soot reach the edge of the sheet?', {
      smoke: 'A soft irregular smoke boundary fades into clean paper.',
      mask: 'A rectangular mask leaves a clean pale outer margin.',
      vignette: 'The smoky forms fade gradually near all four edges.',
      full: 'The deposits continue to the edges without a border.',
    }),
    fixing: choice('How has the delicate carbon been fixed?', {
      dry: 'Dry matte soot keeps a fine powdery surface.',
      damp: 'A damp fixing leaves a few soft cloud-like tide changes.',
      varnished: 'A thin varnish gives the darkest passages a quiet glint.',
      loose: 'Loose soot still has tiny grains sitting on the surface.',
    }),
    trace: choice('What trace remains on the finished study?', {
      clear: 'Only the soot drawing remains.',
      thumb: 'A soft thumb-shaped smudge marks the lower corner.',
      flakes: 'Tiny pale flakes reveal paper beneath the darkest soot.',
      drops: 'A few small pale drops have lifted circular spots.',
    }),
    reading: choice('How do the forms emerge from the smoke?', {
      tonal: 'Dark soot shadows surround pale illuminated surfaces.',
      negative: 'Pale silhouettes emerge from a darker smoky field.',
      ghost: 'A lighter shifted veil echoes the original forms.',
      rim: 'Darker soot gathers at the forms’ edges with soft interiors.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, normal, identity } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(color.length);
    const sets = {
      ivory: { paper: [235, 228, 210], carbon: [40, 34, 29], warm: [107, 78, 54] },
      cool: { paper: [224, 228, 224], carbon: [36, 42, 44], warm: [90, 101, 103] },
      sepia: { paper: [204, 181, 140], carbon: [42, 29, 24], warm: [112, 69, 38] },
      dark: { paper: [56, 62, 64], carbon: [229, 224, 207], warm: [177, 166, 144] },
    } as const;
    const dye = rekey(sets[a.support], context.palette, { paper: 'ground', carbon: 'ink', warm: 'second' });
    const step = Math.max(1, Math.round(unit));
    const toneAt = (p: number) => (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
    for (let y = 0; y < size; y++) {
      if (y % 30 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p];
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const contour = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 78);
        let xx = u, yy = v;
        if (a.direction === 'oblique') { xx = u * 0.71 + v * 0.71; yy = v * 0.71 - u * 0.71; }
        if (a.direction === 'radial') { xx = Math.atan2(v - 0.5, u - 0.5) / Math.PI; yy = Math.hypot(u - 0.5, v - 0.5); }
        if (a.direction === 'surface') { xx += (normal[p] / 255 - 0.5) * 0.1; yy += (normal[p + 1] / 255 - 0.5) * 0.1; }
        const frequency = mix(23, 6, a.scale);
        const broad = noise(xx * frequency, yy * frequency * 0.75, context.seed);
        const curl = noise(xx * frequency * 2 + broad * 2.4, yy * frequency * 2 - broad * 1.9, context.seed + 1);
        let cloud = broad * 0.6 + curl * 0.4;
        if (a.flow === 'plumes') cloud = noise(xx * frequency * 2.2 + Math.sin(yy * 15) * 0.6, yy * frequency * 0.4, context.seed + 2);
        if (a.flow === 'eddies') cloud = 0.5 + Math.sin(broad * 21 + curl * 4) * 0.3;
        if (a.flow === 'dragged') cloud = noise(xx * frequency * 0.45, yy * frequency * 3.8 + broad, context.seed + 3);
        const tone = toneAt(p);
        let form = id === 0 ? 0.07 : Math.max(id >= 2 ? 0.17 : 0.06, 1 - tone);
        if (a.reading === 'negative') form = id >= 2 ? 0.06 + tone * 0.12 : 0.55 + (1 - tone) * 0.28;
        if (a.reading === 'ghost') {
          const offset = Math.max(1, Math.round(4 * unit)), source = (Math.max(0, y - offset) * size + Math.max(0, x - offset)) * 4;
          form = mix(form, 1 - toneAt(source), 0.25);
        }
        if (a.reading === 'rim') form *= 0.53;
        let ink = 1 - Math.exp(-form * mix(1, 3.3, a.deposit) * (0.55 + cloud * 0.75));
        if (contour) ink = Math.max(ink, a.reading === 'rim' ? 0.67 : 0.29);
        if (a.lifting === 'feather' && curl > 0.42 && broad < 0.72 && Math.abs(Math.sin(xx * 90 + yy * 12 + broad * 7)) > 0.965) ink *= 0.84;
        if (a.lifting === 'fingertip') ink *= 0.8 + Math.min(0.2, Math.abs(Math.sin(xx * 18 + yy * 11)) * 0.4);
        if (a.lifting === 'needle' && contour && Math.floor((x + y) / (4 * unit)) % 3 === 0) ink *= 0.15;
        const margin = Math.min(u, v, 1 - u, 1 - v);
        if (a.edge === 'mask' && margin < 0.04) ink = 0;
        if (a.edge === 'vignette') ink *= clamp01(margin / 0.12);
        if (a.edge === 'smoke') ink *= clamp01((margin - 0.012 - broad * 0.018) / 0.025);
        const grain = hash(Math.floor(x / Math.max(1, unit)), Math.floor(y / Math.max(1, unit)), context.seed + 8);
        if (a.fixing === 'damp') ink *= 0.89 + curl * 0.22;
        if (a.fixing === 'loose' && grain > 0.985 && id >= 1) ink = Math.min(1, ink + 0.12);
        if (a.trace === 'flakes' && ink > 0.45 && hash(Math.floor(x / (2 * unit)), Math.floor(y / (2 * unit)), context.seed + 13) > 0.98) ink *= 0.13;
        if (a.trace === 'thumb') { const thumb = ((u - 0.87) / 0.035) ** 2 + ((v - 0.88) / 0.057) ** 2; if (thumb < 1) ink = Math.max(ink, (1 - thumb) * 0.25); }
        if (a.trace === 'drops') for (let k = 0; k < 3; k++) { const dx = u - 0.72 - k * 0.06, dy = v - 0.79 + k * 0.03; if (dx * dx + dy * dy < (0.009 + k * 0.003) ** 2) ink *= 0.35; }
        for (let c = 0; c < 3; c++) {
          const soot = mix(dye.carbon[c], dye.warm[c], cloud * 0.17);
          let value = mix(dye.paper[c], soot, clamp01(ink)) + (grain - 0.5) * (a.fixing === 'dry' ? 5 : 2);
          if (a.fixing === 'varnished') value += ink * Math.pow(Math.max(0, Math.sin(u * 5 - v * 3)), 8) * 13;
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.flow} of soot with ${a.direction} currents`, `${a.lifting} lifted lights, ${a.fixing} fixing`, `${a.reading} forms on ${a.support} ground`] };
  },
});
