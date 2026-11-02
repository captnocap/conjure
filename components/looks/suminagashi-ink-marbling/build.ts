import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
export default defineLook({
  questions: {
    bath: choice('How is the floating ink moved?', { still: 'Quiet concentric ink rings remain almost undisturbed.', current: 'Slow water currents stretch the rings into irregular flowing bands.', comb: 'A narrow comb draws repeating curved teeth through the floating ink.', spiral: 'A gentle spiral turn winds the rings around the main forms.' }),
    rings: choice('What shape do the ink bands have?', { fine: 'Fine continuous dark rings with open pale spaces.', broad: 'Broad soft bands alternate with narrow pale channels.', broken: 'Interrupted rings let clean paper show through.', doubled: 'Closely paired ink lines describe each ring.' }),
    ink: choice('What range of marbling inks is used? Hues follow the picture palette.', { carbon: 'One dark carbon ink with subtle grey dilutions.', earth: 'Dark brown and muted earthy middle tones.', pair: 'A dark ink and a clear contrasting second ink.', festive: 'Several related vivid inks alternate with pale paper reserves.' }),
    paper: choice('What paper lifts the floating picture?', { smooth: 'Smooth pale paper shows the finest lines clearly.', rice: 'A light translucent-looking paper with long fine fibres.', rag: 'Soft warm rag paper with a gentle close grain.', rough: 'A more irregular handmade sheet interrupts the ink slightly.' }),
    scale: score('How far apart are the visible ink rings?', ['Very fine close rings', 'Small ripples', 'Clear flowing bands', 'Broad currents', 'Large leisurely rings']),
    loading: score('How much ink is carried by the water?', ['Very light grey ink', 'Thin open ink', 'Balanced ink and paper', 'Rich dark bands', 'Dense broad ink passages']),
    dispersal: choice('How does the ink separate on the bath?', { even: 'Even smooth ink boundaries.', feather: 'Fine feathery edges spread into the adjacent water.', cells: 'Tiny pale dispersal cells open within the darker bands.', bead: 'Small dark beads gather at a few ring edges.' }),
    transfer: choice('How was the sheet lifted from the bath?', { clean: 'A clean complete transfer.', dragged: 'A slight sideways drag doubles a few edges.', missed: 'A small dry patch leaves one corner incompletely printed.', folded: 'A shallow paper fold leaves one fine pale line.' }),
    edge: choice('How is the marbled sheet finished?', { full: 'Marbling fills the sheet.', margin: 'A narrow clean paper margin surrounds the picture.', pooled: 'A little darker ink pools near the outer edge.', deckled: 'A softly irregular deckled edge remains pale.' }),
    drawing: choice('How do the scene shapes meet the flowing ink?', { integrated: 'The forms emerge from the changing thickness of the ink bands.', contour: 'A fine ink contour clarifies the shape boundaries.', wash: 'A subtle continuous wash sits beneath the marbled lines.', reserve: 'A narrow pale reserve separates the principal forms.' }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720, pixels = new Uint8ClampedArray(color.length);
    const sets = {
      carbon: { dark: [35, 39, 38], mid: [126, 130, 122], accent: [75, 82, 78], paper: [237, 231, 212] },
      earth: { dark: [57, 38, 29], mid: [153, 118, 74], accent: [107, 77, 53], paper: [234, 218, 184] },
      pair: { dark: [28, 56, 70], mid: [118, 156, 151], accent: [177, 84, 62], paper: [237, 229, 202] },
      festive: { dark: [55, 39, 72], mid: [76, 149, 158], accent: [198, 109, 65], paper: [242, 227, 190] },
    } as const;
    const dye = rekey(sets[a.ink], context.palette, { dark: 'ink', mid: 'ink', accent: 'second', paper: 'ground' });
    const bounds = new Map<number, number[]>();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const id = identity[(y * size + x) * 4], b = bounds.get(id);
      if (b) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); } else bounds.set(id, [x, y, x, y]);
    }
    const spacing = new Map([...bounds].map(([id, b]) => [id, Math.max(1.6 * unit, Math.min(mix(3.3, 9.5, a.scale) * unit, Math.sqrt((b[2] - b[0] + 1) * (b[3] - b[1] + 1)) * 0.028))]));
    const step = Math.max(1, Math.round(unit));
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p];
        const tone = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const contour = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 80);
        const box = bounds.get(id)!;
        let dx = x - (id >= 3 ? (box[0] + box[2]) / 2 : size * 0.43), dy = y - (id >= 3 ? (box[1] + box[3]) / 2 : size * 0.47);
        if (a.bath === 'current') { dx += Math.sin(v * 15) * size * 0.035; dy += Math.sin(u * 17 + v * 4) * size * 0.027; }
        if (a.bath === 'comb') dx += Math.sin(v * 47) * size * 0.024;
        const radius = Math.hypot(dx, dy), turn = Math.atan2(dy, dx);
        let field = radius + (a.bath === 'spiral' ? turn * size * 0.026 : Math.sin(turn * 5) * size * 0.004);
        field += Math.sin(u * 31 + v * 7) * size * 0.002 + (normal[p] / 255 - 0.5) * spacing.get(id)! * 1.3;
        const phase = field / spacing.get(id)!, fraction = phase - Math.floor(phase);
        let width = mix(0.08, 0.58, clamp01((1 - tone) * 1.13 + a.loading * 0.22));
        if (a.rings === 'broad') width = Math.min(0.82, width * 1.38);
        const grain = hash(Math.floor(x / Math.max(1, unit)), Math.floor(y / Math.max(1, unit)), context.seed);
        let band = Math.abs(fraction - 0.5) < width / 2;
        if (a.rings === 'doubled') band = Math.min(Math.abs(fraction - 0.35), Math.abs(fraction - 0.65)) < width * 0.27;
        if (a.rings === 'broken' && Math.sin(turn * 27 + Math.floor(phase) * 0.8) > 0.72) band = false;
        let underwash = (1 - tone) * (a.drawing === 'wash' ? 0.72 : 0.6);
        if (contour && a.drawing !== 'reserve') underwash = Math.max(underwash, 0.42);
        if (id === 0) underwash *= 0.03;
        let amount = band ? mix(0.3, 0.52, a.loading) * (0.18 + (1 - tone) * 0.82) : 0;
        if (id === 0) amount *= 0.13;
        if (a.dispersal === 'feather') amount *= 0.7 + grain * 0.3;
        if (a.dispersal === 'cells' && Math.sin(x / unit * 1.7) * Math.cos(y / unit * 1.3) > 0.91) amount *= 0.3;
        if (a.dispersal === 'bead' && Math.abs(fraction - 0.5) < width && grain > 0.975) amount = Math.max(amount, 0.8);
        if (a.drawing === 'contour' && contour) amount = 0.7;
        if (a.drawing === 'reserve' && contour) { amount = 0; underwash = 0; }
        if (a.transfer === 'dragged' && Math.abs(fraction - 0.56) < width * 0.5) amount = Math.max(amount, 0.35);
        if (a.transfer === 'missed' && u + v > 1.7) amount *= clamp01((1.9 - u - v) * 5);
        if (a.transfer === 'folded' && Math.abs(v - 0.61 - u * 0.03) < 0.002) amount *= 0.15;
        const margin = Math.min(u, v, 1 - u, 1 - v);
        if (a.edge === 'margin' && margin < 0.035 || a.edge === 'deckled' && margin < 0.015 + grain * 0.009) amount = 0;
        if (a.edge === 'pooled' && margin < 0.023) amount = Math.max(amount, (0.023 - margin) * 17);
        const target = a.ink === 'pair' && Math.floor(phase) % 4 === 1 || a.ink === 'festive' && Math.floor(phase) % 3 === 0 ? dye.accent : Math.floor(phase) % 3 === 1 ? dye.mid : dye.dark;
        for (let c = 0; c < 3; c++) {
          const paperShift = a.paper === 'rag' ? -5 : a.paper === 'rough' ? -10 : a.paper === 'rice' ? 3 : 0;
          let texture = (grain - 0.5) * (a.paper === 'smooth' ? 1 : a.paper === 'rough' ? 9 : 4);
          if (a.paper === 'rice') texture += Math.sin(x / unit * 0.2 + Math.sin(y / unit * 0.014)) * Math.sin(y / unit * 2) * 2;
          const base = mix(dye.paper[c] + paperShift, dye.dark[c], clamp01(underwash));
          pixels[p + c] = mix(base, target[c], clamp01(amount)) + texture;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.bath} bath, ${a.rings} ink rings`, `${a.ink} inks and ${a.dispersal} dispersal`, `${a.transfer} transfer to ${a.paper} paper`] };
  },
});
