import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
const line = (x: number) => Math.abs(x - Math.round(x));
export default defineLook({
  questions: {
    technique: choice('What sort of lace makes the image?', { bobbin: 'Fine interlaced bobbin threads with tiny crossing knots.', needle: 'Close needle-lace loops build the denser picture areas.', tatted: 'Small tatted rings join with short thread bridges.', crochet: 'Thicker linked crochet loops form a softer openwork picture.' }),
    mesh: choice('What net connects the picture forms?', { diamond: 'A diagonal diamond net.', square: 'A fine straight square net.', hexagon: 'A small honeycomb-like hexagonal net.', arched: 'Rows of small overlapping arched loops.' }),
    thread: choice('What character does the thread have? Hues follow the picture palette.', { ivory: 'Pale ivory thread on a deeper backing.', black: 'Fine dark thread on a pale backing.', gold: 'Muted warm gold thread with pale small glints.', rose: 'Soft faded rose thread with a darker backing.' }),
    gauge: score('How fine is the lace mesh?', ['Very fine hairlike lace', 'Fine knotted net', 'Clear individual loops', 'Broad hand-worked lace', 'Chunky open crochet']),
    fullness: score('How densely are the forms stitched?', ['Very open outlines and net', 'Light stitched areas', 'Balanced open and solid lace', 'Dense picture motifs', 'Rich close stitched forms']),
    motif: choice('What small motifs fill the lace shapes?', { plain: 'Only the net and the picture contours.', floral: 'Tiny petal-like knots repeat inside the denser shapes.', geometric: 'Small angular diamonds fill the picture forms.', scroll: 'Short paired curls thread through the motifs.' }),
    edging: choice('How is the lace edge finished?', { straight: 'A straight narrow stitched border.', scallop: 'Small rounded scallops frame the sheet.', picot: 'Tiny looped picots run along the border.', fringe: 'A short knotted fringe hangs from the lower edge.' }),
    support: choice('What lies behind the openwork?', { cloth: 'A plain matte cloth backing.', velvet: 'Deep soft velvet makes the threads stand out.', paper: 'Smooth pale mounting paper.', wood: 'A quiet warm wood backing with fine grain.' }),
    lift: choice('How does the lace stand above the backing?', { flat: 'The lace lies almost flat against its backing.', raised: 'A little lift casts fine shadows under the threads.', stiff: 'Stiffened lace holds clear raised edges.', rippled: 'A few shallow ripples lift the openwork gently.' }),
    making: choice('What trace of making or repair remains?', { complete: 'A complete unmarked lace picture.', darned: 'A small rectangular darn repairs the lower corner.', tail: 'A loose finishing thread curls along the lower edge.', unfinished: 'One corner still has only an open connecting net.' }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720, pixels = new Uint8ClampedArray(color.length);
    const sets = {
      ivory: { yarn: [234, 227, 205], back: [67, 84, 88], shadow: [34, 45, 49] },
      black: { yarn: [43, 39, 37], back: [226, 218, 191], shadow: [157, 145, 119] },
      gold: { yarn: [211, 178, 109], back: [65, 54, 45], shadow: [31, 30, 27] },
      rose: { yarn: [202, 151, 143], back: [65, 72, 82], shadow: [32, 36, 43] },
    } as const;
    const dye = rekey(sets[a.thread], context.palette, { yarn: 'ink', back: 'ground', shadow: 'ground' });
    const step = Math.max(1, Math.round(unit));
    const bounds = new Map<number, number[]>();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const id = identity[(y * size + x) * 4], b = bounds.get(id); if (b) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); } else bounds.set(id, [x, y, x, y]); }
    const widths = new Map([...bounds].map(([id, b]) => [id, Math.max(1.8 * unit, Math.min(mix(3.5, 8, a.gauge) * unit, Math.sqrt((b[2] - b[0] + 1) * (b[3] - b[1] + 1)) * 0.025))]));
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p], gauge = widths.get(id)!;
        let xx = x / gauge, yy = y / gauge;
        if (a.lift === 'rippled') yy += Math.sin(u * 18) * 0.35;
        const fx = xx - Math.floor(xx) - 0.5, fy = yy - Math.floor(yy) - 0.5;
        let net = Math.min(line(xx), line(yy));
        if (a.mesh === 'diamond') net = Math.min(line(xx + yy), line(xx - yy));
        if (a.mesh === 'hexagon') net = Math.min(Math.abs(Math.max(Math.abs(fx) * 0.866 + Math.abs(fy) * 0.5, Math.abs(fy)) - 0.42), line(xx) * 1.5);
        if (a.mesh === 'arched') net = Math.abs(Math.hypot(fx, fy * 0.8) - 0.42);
        const tone = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const edge = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 80);
        let width = (a.technique === 'crochet' ? 0.11 : 0.065) + (id >= 1 ? (1 - tone) * mix(0.06, 0.24, a.fullness) : 0);
        let stitch = net < width;
        if (a.technique === 'tatted') stitch ||= Math.abs(Math.hypot(fx, fy) - 0.3) < width * 0.6;
        if (a.technique === 'needle' && id >= 1 && tone < 0.7) stitch ||= line(xx * 2 + yy * 0.6) < width;
        if (a.technique === 'bobbin') stitch ||= Math.hypot(fx, fy) < 0.1;
        let fill = id >= 1 ? (1 - tone) * mix(0.05, 0.34, a.fullness) : 0;
        if (id >= 1 && a.motif === 'floral') stitch ||= Math.abs(Math.hypot(fx, fy) - (0.22 + Math.sin(Math.atan2(fy, fx) * 5) * 0.065)) < 0.035;
        if (id >= 1 && a.motif === 'geometric') stitch ||= Math.abs(Math.abs(fx) + Math.abs(fy) - 0.34) < 0.035;
        if (id >= 1 && a.motif === 'scroll') stitch ||= Math.abs(fy - Math.sin(fx * 8) * 0.25) < 0.035;
        let amount = stitch ? id === 0 ? 0.12 : 0.72 + (1 - tone) * 0.24 : fill;
        if (edge) amount = 0.86;
        if (a.making === 'unfinished' && u + v > 1.76) amount = net < 0.065 ? 0.42 : 0;
        if (a.making === 'darned' && u > 0.79 && u < 0.9 && v > 0.82 && v < 0.92) amount = Math.min(line(xx * 2), line(yy * 2)) < 0.13 ? 0.92 : 0.13;
        if (a.making === 'tail' && u > 0.34 && u < 0.64 && Math.abs(v - 0.95 - Math.sin(u * 37) * 0.008) < 0.002) amount = 0.92;
        const margin = Math.min(u, v, 1 - u, 1 - v), along = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? y / unit : x / unit;
        if (a.edging === 'straight' && Math.abs(margin - 0.022) < 0.002) amount = 0.9;
        if (a.edging === 'scallop' && Math.abs(margin - 0.022 - Math.sin(along * 0.15) * 0.007) < 0.002) amount = 0.9;
        if (a.edging === 'picot' && margin < 0.035 && Math.abs(Math.hypot((along % 10 - 5) / 720, margin - 0.022) - 0.006) < 0.0016) amount = 0.9;
        if (a.edging === 'fringe' && v > 0.94) amount = line(x / (4 * unit)) < 0.15 && v < 0.985 ? 0.78 : 0;
        const grain = hash(x, y, context.seed);
        for (let c = 0; c < 3; c++) {
          let base = dye.back[c];
          if (a.support === 'velvet') base *= 0.72;
          if (a.support === 'paper') base = mix(base, 236, 0.22);
          if (a.support === 'wood') base += Math.sin(x / unit * 0.08 + Math.sin(y / unit * 0.01)) * 4 - 4;
          if (a.lift !== 'flat' && net < width + (a.lift === 'stiff' ? 0.055 : 0.035) && !stitch) base = mix(base, dye.shadow[c], 0.55);
          const yarn = dye.yarn[c] + (stitch ? Math.cos(net / Math.max(width, 0.01) * Math.PI) * 5 : 0);
          pixels[p + c] = mix(base, yarn, clamp01(amount)) + (grain - 0.5) * 2;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.technique} lace with ${a.mesh} net`, `${a.thread} thread, ${a.motif} filling`, `${a.edging} edging over ${a.support}`] };
  },
});
