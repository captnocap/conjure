import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
export default defineLook({
  questions: {
    stitch: choice('What sort of punched pile forms the picture?', { loops: 'Small uncut loops form a dense rounded pile.', cut: 'Cut loop ends make a soft velvety pile.', mixed: 'Alternating cut and loop rows create a subtle raised pattern.', tufts: 'Longer tuft clusters stand above the backing.' }),
    rows: choice('How are the yarn rows laid?', { straight: 'Even straight rows fill the shapes.', brick: 'Staggered rows interlock like small bricks.', contour: 'Rows turn gently with the orientation of the forms.', flowing: 'Slow curved rows flow across the larger surfaces.' }),
    yarn: choice('What yarn is punched into the backing?', { wool: 'Matte wool with fine soft fibres.', cotton: 'Firm cotton yarn with a clear twisted strand.', velvet: 'Soft velvety yarn with broad quiet highlights.', scraps: 'Mixed yarn remnants show small changes in thickness.' }),
    gauge: score('How large are the individual loops?', ['Tiny close loops', 'Fine textured pile', 'Clear small yarn loops', 'Coarse hand-worked loops', 'Bold chunky yarn']),
    pile: score('How high does the pile stand?', ['Almost flat stitches', 'Low even loops', 'A clear soft pile', 'Thick raised tufts', 'Very deep sculpted pile']),
    dyes: choice('What character do the yarn colours have? Hues follow the picture palette.', { muted: 'Quiet muted yarns with pale warm reserves.', bright: 'Bright separated yarns with a strong dark outline tone.', natural: 'Undyed-looking cream, brown and charcoal tones.', pair: 'Two strong related dye families with pale accents.' }),
    outlines: choice('How are the colour fields separated?', { blended: 'Neighbouring yarns blend slightly at their edges.', cord: 'A raised dark yarn cord outlines the forms.', stepped: 'Stepped rows meet along clear squared colour boundaries.', open: 'Colour changes meet without a separate edging yarn.' }),
    backing: choice('What backing is visible between loops and at the edges?', { hessian: 'Warm coarse hessian.', canvas: 'Pale tightly woven canvas.', felt: 'Dark soft felt.', linen: 'Natural grey-beige linen.' }),
    finish: choice('How is the textile edge finished?', { bound: 'A thick matching yarn binding encloses the picture.', fringe: 'Short knotted yarn fringe hangs from the lower edge.', raw: 'An unfinished strip of backing shows around the pile.', hem: 'A narrow sewn fabric hem holds the outer edge.' }),
    making: choice('What trace of making remains?', { complete: 'An evenly finished textile picture.', patched: 'A small contrasting stitched patch repairs a lower corner.', loose: 'A single loose yarn tail rests near the lower edge.', unfinished: 'A small corner still shows bare backing and a few guiding stitches.' }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720, pixels = new Uint8ClampedArray(color.length);
    const sets = {
      muted: { dark: [52, 59, 58], mid: [132, 151, 136], light: [237, 225, 193], accent: [176, 113, 91] },
      bright: { dark: [37, 42, 61], mid: [73, 150, 163], light: [244, 225, 164], accent: [205, 95, 66] },
      natural: { dark: [54, 42, 33], mid: [151, 123, 90], light: [236, 222, 186], accent: [111, 88, 68] },
      pair: { dark: [35, 60, 73], mid: [111, 157, 157], light: [238, 225, 197], accent: [183, 112, 93] },
    } as const;
    const dye = rekey(sets[a.dyes], context.palette, { dark: 'ink', mid: 'second', light: 'ground', accent: 'second' });
    const backs = { hessian: [176, 151, 111], canvas: [228, 218, 190], felt: [51, 55, 52], linen: [190, 183, 161] }, back = backs[a.backing];
    const step = Math.max(1, Math.round(unit));
    const bounds = new Map<number, number[]>();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const id = identity[(y * size + x) * 4], b = bounds.get(id); if (b) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); } else bounds.set(id, [x, y, x, y]); }
    const widths = new Map([...bounds].map(([id, b]) => [id, Math.max(1.6 * unit, Math.min(mix(3, 7.5, a.gauge) * unit, Math.sqrt((b[2] - b[0] + 1) * (b[3] - b[1] + 1)) * 0.034))]));
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p], gauge = widths.get(id)!;
        let xx = x, yy = y;
        if (a.rows === 'contour') { xx += (normal[p] / 255 - 0.5) * gauge * 2; yy += (normal[p + 1] / 255 - 0.5) * gauge; }
        if (a.rows === 'flowing') { xx += Math.sin(v * 15) * gauge * 1.1; yy += Math.sin(u * 13) * gauge * 0.5; }
        const row = Math.floor(yy / gauge); if (a.rows === 'brick') xx += row % 2 * gauge * 0.5;
        const col = Math.floor(xx / gauge), fx = xx / gauge - col - 0.5, fy = yy / gauge - row - 0.5;
        const jitter = hash(col, row, context.seed), grain = hash(x, y, context.seed + 1);
        const radius = Math.sqrt(fx * fx / 0.19 + fy * fy / 0.11);
        const isCut = a.stitch === 'cut' || a.stitch === 'mixed' && row % 2 === 0;
        const loop = radius < 1 && (isCut || radius > 0.38);
        const tone = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const edge = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 80);
        let weaveLight = loop ? Math.sin(clamp01((radius - 0.35) / 0.65) * Math.PI) * (7 + a.pile * 16) - 5 : -8 - a.pile * 7;
        if (isCut) weaveLight = Math.sin((fx + fy * 0.6) * 27) * 3 + jitter * 8 - 4;
        if (a.stitch === 'tufts') weaveLight += Math.sin(Math.atan2(fy, fx) * 9) * (3 + a.pile * 5);
        if (a.yarn === 'cotton') weaveLight += Math.sin((fx - fy) * 24) * 3;
        if (a.yarn === 'velvet') weaveLight *= 0.55;
        if (a.yarn === 'scraps') weaveLight *= 0.6 + jitter * 0.9;
        const margin = Math.min(u, v, 1 - u, 1 - v), along = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? y / unit : x / unit;
        const fringe = a.finish === 'fringe' && v > 0.94, bare = a.finish === 'raw' && margin < 0.03 || fringe && (Math.abs(fx) > 0.3 || v > 0.97 + jitter * 0.025);
        const unfinished = a.making === 'unfinished' && u + v > 1.75;
        for (let c = 0; c < 3; c++) {
          const levels = a.outlines === 'stepped' ? Math.round(tone * 5) / 5 : tone;
          let yarn = levels < 0.5 ? mix(dye.dark[c], dye.mid[c], levels * 2) : mix(dye.mid[c], dye.light[c], levels * 2 - 1);
          if (a.dyes !== 'natural') yarn = mix(yarn, color[p + c], a.dyes === 'bright' ? 0.37 : 0.24);
          let value = yarn + weaveLight + (grain - 0.5) * (a.yarn === 'wool' ? 7 : 3);
          if (edge && a.outlines === 'cord') value = dye.dark[c] + weaveLight * 0.4;
          if (edge && a.outlines === 'blended') value = mix(value, dye.mid[c], 0.18);
          if (!loop) value = mix(value, back[c], 0.16);
          if (a.finish === 'bound' && margin < 0.025) value = dye.accent[c] + Math.sin(margin / 0.025 * Math.PI) * 12;
          if (a.finish === 'hem' && margin < 0.024) value = back[c] + (Math.floor(along / 4) % 2 === 0 && Math.abs(margin - 0.015) < 0.002 ? -40 : 0);
          if (fringe) value = dye.light[c] + weaveLight;
          if (bare || unfinished) value = back[c] + Math.sin(x / unit * 2.1) * Math.cos(y / unit * 2.1) * 4;
          if (a.making === 'patched' && u > 0.79 && u < 0.91 && v > 0.81 && v < 0.92) value = dye.accent[c] + weaveLight;
          if (a.making === 'loose' && u > 0.38 && u < 0.68 && Math.abs(v - 0.94 - Math.sin(u * 37) * 0.008) < 0.002) value = dye.accent[c];
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.stitch} pile in ${a.yarn}, ${a.rows} rows`, `${a.dyes} yarns with ${a.outlines} boundaries`, `${a.finish} edge on ${a.backing}, ${a.making}`] };
  },
});
