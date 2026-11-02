import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
export default defineLook({
  questions: {
    laying: choice('How is the coloured sand laid?', { poured: 'Fine poured streams fill clear flat fields.', tapped: 'Small tapped deposits leave a gently uneven surface.', raked: 'Very fine raked furrows run through the sand.', packed: 'Lightly packed sand has a smooth dense matte finish.' }),
    pigment: choice('What character do the sand pigments have? Hues follow the picture palette.', { earth: 'Muted ochre, brown, pale stone and charcoal grains.', jewel: 'Bright separated pigment fields with clear darks.', mineral: 'Quiet mineral greens, warm greys and pale cream.', pastel: 'Soft pale pigment fields with a restrained dark accent.' }),
    grading: choice('What grain shapes are visible?', { fine: 'Even fine rounded grains.', coarse: 'Larger angular mineral grains.', mixed: 'A mixture of fine powder and a few larger grains.', crystal: 'Tiny pale crystalline grains catch occasional light.' }),
    size: score('How large are the individual grains?', ['Powder-fine pigment', 'Fine sand', 'Clear tiny grains', 'Coarser visible granules', 'Large tactile grains']),
    thickness: score('How deeply is the sand built up?', ['A thin dusting', 'A shallow even layer', 'A clear granular bed', 'Thick raised colour fields', 'Small sculpted banks of pigment']),
    meeting: choice('How do neighbouring colour fields meet?', { clean: 'Clean carefully guided pigment boundaries.', spilled: 'A few stray grains cross each boundary.', outlined: 'A thin dark sand line separates the forms.', blended: 'The colours blend slightly along their meeting edges.' }),
    board: choice('What support shows around the picture?', { wood: 'A warm wooden board.', dark: 'A flat dark working surface.', pale: 'A pale smooth tray.', cloth: 'A quiet coarse cloth backing.' }),
    border: choice('How is the sand picture bounded?', { open: 'The image continues to the edge.', line: 'A narrow double line of dark pigment frames it.', steps: 'A stepped geometric pigment border.', beads: 'A row of small rounded pigment deposits surrounds the picture.' }),
    tools: choice('What trace of the working tools remains?', { none: 'No tool marks remain.', rake: 'A short test strip of raked sand lies at the lower edge.', funnel: 'A tiny spilled cone of sand and a curved pouring trail remain below the picture.', compass: 'A faint small compass circle remains in one lower corner.' }),
    making: choice('What state is the sand image in?', { finished: 'The picture has just been completed.', partial: 'One corner still has only a pale outline on the support.', cleared: 'A narrow swept strip exposes the support near the lower edge.', disturbed: 'A small irregular sweep has displaced pigment in one corner.' }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720, pixels = new Uint8ClampedArray(color.length);
    const sets = {
      earth: { dark: [57, 43, 32], mid: [157, 119, 72], light: [231, 212, 171], accent: [173, 80, 51], cool: [111, 127, 108] },
      jewel: { dark: [36, 41, 66], mid: [68, 143, 154], light: [242, 219, 163], accent: [203, 83, 64], cool: [87, 111, 169] },
      mineral: { dark: [48, 62, 58], mid: [126, 150, 119], light: [231, 223, 188], accent: [166, 113, 79], cool: [111, 151, 160] },
      pastel: { dark: [90, 85, 91], mid: [172, 167, 160], light: [242, 232, 207], accent: [205, 153, 136], cool: [155, 184, 188] },
    } as const;
    const dye = rekey(sets[a.pigment], context.palette, { dark: 'ink', mid: 'second', light: 'ground', accent: 'second', cool: 'ink' });
    const backs = { wood: [153, 119, 78], dark: [43, 47, 47], pale: [226, 220, 198], cloth: [176, 163, 134] }, back = backs[a.board];
    const step = Math.max(1, Math.round(unit));
    const index = (x: number, y: number) => (Math.max(0, Math.min(size - 1, Math.round(y))) * size + Math.max(0, Math.min(size - 1, Math.round(x)))) * 4;
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p];
        const grainSize = mix(1.2, 3.6, a.size) * unit * (id >= 3 ? 0.6 : 1), ix = Math.floor(x / grainSize), iy = Math.floor(y / grainSize);
        const grain = hash(ix, iy, context.seed), fx = x / grainSize - ix - 0.5, fy = y / grainSize - iy - 0.5;
        const centre = index((ix + 0.5) * grainSize, (iy + 0.5) * grainSize), source = identity[centre] === id ? centre : p;
        const raw = [color[source], color[source + 1], color[source + 2]], tone = (raw[0] * 0.2126 + raw[1] * 0.7152 + raw[2] * 0.0722) / 255;
        let pigment = tone < 0.3 ? dye.dark : tone < 0.64 ? dye.mid : dye.light;
        if (tone > 0.25 && tone < 0.85 && raw[0] - raw[2] > 30) pigment = dye.accent;
        if (tone > 0.25 && tone < 0.85 && raw[2] - raw[0] > 20) pigment = dye.cool;
        const q = index(x + step, y), r = index(x, y + step);
        const edge = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 80);
        let relief = (1 - Math.min(1, (fx * fx + fy * fy) * 3.5)) * (3 + a.thickness * 5) - 4;
        if (a.grading === 'coarse') relief = (grain - 0.5) * (8 + a.thickness * 13);
        if (a.grading === 'mixed') relief *= grain > 0.88 ? 1.8 : 0.45;
        if (a.grading === 'crystal' && grain > 0.97) relief += 19;
        if (a.laying === 'packed') relief *= 0.35;
        if (a.laying === 'tapped') relief += Math.sin(x / unit * 0.09) * Math.sin(y / unit * 0.12) * 3;
        if (a.laying === 'raked') relief += Math.sin((x / unit + (normal[p] / 255 - 0.5) * y / unit) * 1.8) * 3;
        const margin = Math.min(u, v, 1 - u, 1 - v), along = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? y / unit : x / unit;
        const visibleBoard = margin < 0.015 || a.making === 'partial' && u + v > 1.72 || a.making === 'cleared' && v > 0.91 && v < 0.93 || a.making === 'disturbed' && u > 0.72 && v > 0.75 && Math.sin(u * 37 + v * 21) > 0.35;
        for (let c = 0; c < 3; c++) {
          const continuous = tone < 0.5 ? mix(dye.dark[c], dye.mid[c], tone * 2) : mix(dye.mid[c], dye.light[c], tone * 2 - 1);
          let value = mix(pigment[c], continuous, 0.44) + relief;
          if (a.meeting === 'outlined' && edge) value = dye.dark[c];
          if (a.meeting === 'blended' && edge) value = mix(value, dye.mid[c], 0.32);
          if (a.meeting === 'spilled' && grain > 0.78) { const nearby = index(x + (grain - 0.5) * 5 * unit, y + 2 * unit); if (identity[nearby] !== id) value = mix(value, dye.mid[c], 0.45); }
          if (edge) value -= a.thickness * 5;
          if (a.border === 'line' && (Math.abs(margin - 0.027) < 0.0018 || Math.abs(margin - 0.038) < 0.0018)) value = dye.dark[c] + relief;
          if (a.border === 'steps' && margin > 0.022 && margin < 0.048) value = Math.floor(along / 8 + margin * 500) % 2 ? dye.accent[c] : dye.light[c];
          if (a.border === 'beads' && Math.hypot((along % 11 - 5.5) / 720, margin - 0.03) < 0.004) value = dye.accent[c] + relief * 2;
          if (visibleBoard) value = back[c] + (a.board === 'wood' ? Math.sin(y / unit * 0.12 + Math.sin(x / unit * 0.012)) * 3 : a.board === 'cloth' ? Math.sin(x / unit * 2) * Math.cos(y / unit * 2) * 3 : 0);
          if (a.making === 'partial' && u + v > 1.72 && edge) value = mix(value, dye.light[c], 0.5);
          if (a.tools === 'rake' && u > 0.06 && u < 0.23 && v > 0.935 && v < 0.963) value = dye.mid[c] + Math.sin(x / unit * 1.4) * 7;
          if (a.tools === 'funnel') { const rr = Math.hypot(u - 0.12, v - 0.947); if (rr < 0.014) value = dye.accent[c] + (1 - rr / 0.014) * 12; if (u > 0.14 && u < 0.3 && Math.abs(v - 0.947 - Math.sin(u * 45) * 0.006) < 0.0015) value = dye.accent[c]; }
          if (a.tools === 'compass' && Math.abs(Math.hypot(u - 0.1, v - 0.9) - 0.025) < 0.0015) value = dye.dark[c];
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.laying} ${a.pigment} sand, ${a.grading} grains`, `${a.meeting} boundaries on ${a.board}`, `${a.border} border, ${a.making} picture`] };
  },
});
