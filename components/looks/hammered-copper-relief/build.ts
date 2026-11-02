import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
export default defineLook({
  questions: {
    metal: choice('What character does the metal have? Hues follow the picture palette.', { copper: 'Warm reddish copper with pale peach glints.', tinned: 'Pale silver-tinned metal with dark grey cuts.', brass: 'A warm yellow metal with brown recessed shadows.', patinated: 'Dark aged copper with subdued green-grey patina.' }),
    relief: choice('How is the picture raised from the sheet?', { raised: 'The forms are pushed outward in shallow rounded relief.', recessed: 'The forms are sunk into the sheet with raised surrounding ground.', stepped: 'Two clear relief levels separate the picture planes.', outline: 'Fine chased contours describe almost flat forms.' }),
    hammer: choice('Which hammer marks remain?', { ball: 'Small rounded ball-peen dents overlap across the metal.', flat: 'Broad flat hammer facets catch angular patches of light.', planished: 'Fine close planishing leaves an almost smooth surface.', chased: 'Narrow chasing marks run along the surface direction.' }),
    size: score('How broad are the visible hammer marks?', ['Tiny tool marks', 'Fine close dents', 'Clear hammer facets', 'Broad deliberate facets', 'Large overlapping marks']),
    depth: score('How strongly is the metal relief modelled?', ['Very shallow tracing', 'Delicate relief', 'Clear raised forms', 'Deep worked shapes', 'Strong sculpted relief']),
    ground: choice('What finish surrounds the main relief?', { flat: 'A calm flat ground.', punched: 'Fine close punch marks darken the ground.', ribs: 'Thin parallel ribs texture the surrounding metal.', oxidised: 'A softly mottled oxidised ground surrounds brighter forms.' }),
    light: choice('From where does light skim the metal?', { left: 'A broad light from upper left.', right: 'A broad light from upper right.', top: 'Light from directly above.', raking: 'Low raking light emphasises the tool marks.' }),
    edge: choice('How is the metal panel finished?', { plain: 'A plain cut edge.', folded: 'A narrow folded metal hem.', rolled: 'A rounded rolled border.', rivets: 'A flat border with small regular rivets.' }),
    chasing: choice('What fine tool detail is added to the forms?', { none: 'Only the hammer marks and relief.', hatch: 'Fine crossed chasing in the darker forms.', scallop: 'Small scalloped tool marks decorate the lower border.', dots: 'Tiny punched dots emphasise the major contours.' }),
    history: choice('What history does the metal show?', { new: 'Freshly worked clean metal.', patina: 'Soft irregular patina gathers in recessed places.', heat: 'Subtle heat-darkened bands cross the sheet.', polished: 'Repeated polishing has brightened raised edges.' }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720, pixels = new Uint8ClampedArray(color.length);
    const sets = {
      copper: { dark: [65, 37, 29], mid: [176, 101, 63], high: [248, 210, 158], patina: [80, 126, 111] },
      tinned: { dark: [44, 49, 53], mid: [156, 170, 172], high: [244, 240, 219], patina: [91, 121, 120] },
      brass: { dark: [68, 47, 27], mid: [178, 141, 61], high: [247, 226, 156], patina: [93, 113, 84] },
      patinated: { dark: [33, 52, 47], mid: [84, 133, 117], high: [194, 184, 133], patina: [54, 100, 91] },
    } as const;
    const dye = rekey(sets[a.metal], context.palette, { dark: 'ink', mid: 'ground', high: 'ground', patina: 'second' });
    const light = { left: [-0.6, -0.5], right: [0.6, -0.5], top: [0, -0.8], raking: [-0.95, -0.1] }[a.light];
    const step = Math.max(1, Math.round(unit));
    const toneAt = (p: number) => (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p], tone = toneAt(p);
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const edge = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 75);
        const cellSize = mix(3, 8, a.size) * unit * (id >= 3 ? 0.65 : 1), ix = Math.floor(x / cellSize), iy = Math.floor(y / cellSize);
        const fx = x / cellSize - ix - 0.5, fy = y / cellSize - iy - 0.5;
        const randomFacet = hash(ix, iy, context.seed), grain = hash(x, y, context.seed + 3);
        let tool = (fx * light[0] + fy * light[1]) * 0.2 + (randomFacet - 0.5) * 0.11;
        if (a.hammer === 'flat') tool = (randomFacet - 0.5) * 0.23;
        if (a.hammer === 'planished') tool *= 0.25;
        if (a.hammer === 'chased') tool = Math.sin((x / unit + (normal[p] / 255 - 0.5) * y / unit) * 1.5) * 0.035;
        const nx = normal[p] / 255 * 2 - 1, ny = normal[p + 1] / 255 * 2 - 1;
        let base = id === 0 ? 0.49 : 0.27 + tone * 0.5 + (nx * light[0] + ny * light[1]) * mix(0.05, 0.2, a.depth);
        if (a.relief === 'recessed' && id >= 1) base = 0.85 - base * 0.65;
        if (a.relief === 'stepped') base = Math.round(base * 4) / 4;
        if (a.relief === 'outline') base = mix(0.5, base, 0.45);
        if (edge) base *= a.relief === 'outline' ? 0.4 : 0.72 - a.depth * 0.2;
        let strength = clamp01(base + tool);
        if (a.ground === 'punched' && id <= 1) strength -= Math.abs(Math.sin(x / unit * 2) * Math.sin(y / unit * 2)) * 0.075;
        if (a.ground === 'ribs' && id <= 1) strength += Math.sin(y / unit * 1.2) * 0.035;
        const mottle = Math.sin(u * 19 + Math.sin(v * 12)) * Math.cos(v * 23 + Math.sin(u * 17)) * 0.5 + 0.5;
        const margin = Math.min(u, v, 1 - u, 1 - v), along = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? y / unit : x / unit;
        if (a.edge === 'folded' && margin < 0.025) strength = 0.38 + margin / 0.025 * 0.48;
        if (a.edge === 'rolled' && margin < 0.032) strength = 0.36 + Math.sin(margin / 0.032 * Math.PI) * 0.49;
        if (a.edge === 'rivets' && Math.abs(margin - 0.025) < 0.004 && along % 24 < 5) strength = 0.88;
        if (a.chasing === 'hatch' && tone < 0.5 && Math.abs(Math.sin((x + y) / unit * 1.4)) > 0.92) strength -= 0.07;
        if (a.chasing === 'scallop' && v > 0.92 && v < 0.96) strength += Math.cos(x / unit * 0.3) * Math.sin((v - 0.92) * 78) * 0.06;
        if (a.chasing === 'dots' && edge && Math.floor((x + y) / (4 * unit)) % 2 === 0) strength *= 0.6;
        if (a.history === 'heat') strength -= Math.max(0, Math.sin(v * 16 + u * 7)) * 0.11;
        if (a.history === 'polished' && edge) strength += 0.22;
        strength = clamp01(strength);
        for (let c = 0; c < 3; c++) {
          let value = strength < 0.5 ? mix(dye.dark[c], dye.mid[c], strength * 2) : mix(dye.mid[c], dye.high[c], strength * 2 - 1);
          if (a.history === 'patina') value = mix(value, dye.patina[c], mottle * (1 - tone) * 0.48);
          if (a.ground === 'oxidised' && id <= 1) value = mix(value, dye.patina[c], mottle * 0.4);
          pixels[p + c] = value + (grain - 0.5) * 2;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.relief} ${a.metal} relief with ${a.hammer} hammering`, `${a.ground} ground and ${a.chasing} chasing`, `${a.history} finish, ${a.light} light`] };
  },
});
