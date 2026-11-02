import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    tool: choice('What applied the wax resist?', {
      spout: 'Fine flowing lines laid with a small wax spout.',
      brush: 'Broad brushed resist with soft uneven boundaries.',
      stamp: 'A repeating stamped resist with regular small marks.',
      splash: 'Fine wax droplets join the drawn contours.',
    }),
    dyes: choice('What dye family carries the cloth? Hues follow the picture palette.', {
      indigo: 'Dark indigo, muted blue and warm undyed cloth.',
      earth: 'Brown, ochre and a deep near-black over ivory cloth.',
      madder: 'Red-brown and ochre with pale cream reserves.',
      forest: 'Deep green, olive and warm yellow over pale cloth.',
    }),
    baths: choice('How many colour stages build the image?', {
      two: 'Two broad dye values make a bold graphic cloth.',
      three: 'Three successive baths separate dark, middle and reserved areas.',
      five: 'Five restrained values preserve small forms and gentle shading.',
      blended: 'Softly blended dye carries the full tonal range.',
    }),
    reserve: choice('Where does the wax leave the cloth undyed?', {
      contours: 'Fine pale contours outline the scene.',
      highlights: 'Broad bright shapes remain as undyed cloth.',
      shadow: 'Shadow contours are reserved, giving the cloth a reversed feeling.',
      double: 'A pale twin line surrounds the main forms.',
    }),
    crackle: score('How much fine crackle entered the wax before the last dye bath?', ['Unbroken wax', 'A few fine cracks', 'A light crackle network', 'Clearly crackled wax', 'Rich dark crackle']),
    cloth: choice('What cloth receives the dye?', {
      cotton: 'Close soft cotton with an understated weave.',
      linen: 'Uneven linen threads show through the dye.',
      silk: 'Fine silk with a gentle directional sheen.',
      hemp: 'Coarse cloth with a visibly open weave.',
    }),
    filling: choice('What small resist marks fill the larger tonal shapes?', {
      plain: 'Only the picture, with no repeating infill.',
      dots: 'Tiny regularly spaced pale wax dots.',
      waves: 'Small parallel wave marks follow the surfaces.',
      leaves: 'Repeating small pinched leaf shapes fill the broad areas.',
    }),
    border: choice('What frames the dyed textile?', {
      full: 'The pattern runs to the cloth edge.',
      rules: 'Two narrow pale resist rules frame the image.',
      floral: 'A band of small flower-like resist medallions.',
      fringe: 'A dyed band ends in short pale fringe threads.',
    }),
    registration: choice('How evenly do the wax and dye layers meet?', {
      exact: 'Careful repeated alignment with crisp resist edges.',
      drift: 'A second dye edge sits slightly beside the first.',
      bleed: 'A little dye seeps into soft irregular edges.',
      uneven: 'Uneven soaking leaves broad subtle variations in dye strength.',
    }),
    history: choice('What trace remains in the finished cloth?', {
      fresh: 'Fresh cloth, washed and ironed flat.',
      folded: 'A pale old fold line crosses the fabric.',
      repaired: 'A small stitched patch replaces a lower corner.',
      overdyed: 'An extra dark bath has subdued one side of the cloth.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const sets = {
      indigo: { ink: [28, 49, 77], middle: [106, 137, 153], cloth: [237, 222, 185], accent: [163, 127, 65] },
      earth: { ink: [51, 38, 29], middle: [150, 108, 59], cloth: [239, 224, 190], accent: [189, 150, 86] },
      madder: { ink: [89, 38, 35], middle: [179, 95, 65], cloth: [244, 224, 189], accent: [201, 155, 73] },
      forest: { ink: [38, 63, 41], middle: [121, 142, 75], cloth: [237, 228, 183], accent: [183, 151, 61] },
    } as const;
    const dyes = rekey(sets[a.dyes], context.palette, { ink: 'ink', middle: 'ink', cloth: 'ground', accent: 'second' });
    const gridSize = Math.min(size, 720), cracks = new Float32Array(gridSize * gridSize), cell = 22 * gridSize / 720;
    for (let y = 0; y < gridSize; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < gridSize; x++) {
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell); let first = Infinity, second = Infinity;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const px = (gx + ox + hash(gx + ox, gy + oy, context.seed)) * cell;
          const py = (gy + oy + hash(gx + ox, gy + oy, context.seed + 27)) * cell;
          const d = (px - x) ** 2 + (py - y) ** 2;
          if (d < first) { second = first; first = d; } else if (d < second) second = d;
        }
        cracks[y * gridSize + x] = (Math.sqrt(second) - Math.sqrt(first)) / cell;
      }
    }
    const step = Math.max(1, Math.round(({ spout: 0.9, brush: 2.1, stamp: 1.3, splash: 1.1 }[a.tool]) * unit));
    const lum = (p: number) => (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
    const levels = { two: 2, three: 3, five: 5, blended: 0 }[a.baths];
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], u = x / size, v = y / size, xx = x / unit, yy = y / unit;
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const value = lum(p), mapped = id >= 1 ? 0.08 + value * 0.76 : value, tone = levels ? Math.round(clamp01(mapped) * (levels - 1)) / (levels - 1) : mapped;
        const contour = id >= 2 && (id !== identity[q] || id !== identity[r] || Math.abs(lum(q) - value) + Math.abs(lum(r) - value) > 0.2 || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 100);
        let wax = contour;
        if (a.reserve === 'highlights') wax ||= id >= 2 && value > 0.84;
        if (a.reserve === 'shadow') wax ||= id >= 2 && value < 0.23;
        if (a.reserve === 'double') { const far = (y * size + Math.min(size - 1, x + step * 3)) * 4; wax ||= id >= 2 && id !== identity[far]; }
        const gx = xx + (normal[p] - 128) * 0.04, gy = yy + (normal[p + 1] - 128) * 0.04;
        const dots = Math.hypot(gx % 9 - 4.5, gy % 9 - 4.5) < 0.75;
        const waves = Math.abs(Math.sin(gy * 0.63 + Math.sin(gx * 0.22) * 0.9)) > 0.975;
        const leaf = Math.abs(Math.sin(gx * 0.34) * Math.sin(gy * 0.34)) > 0.88;
        const infill = id >= 1 && value < 0.86 && (a.filling === 'dots' ? dots : a.filling === 'waves' ? waves : a.filling === 'leaves' && leaf);
        if (a.tool === 'splash' && hash(Math.floor(xx / 2), Math.floor(yy / 2), context.seed + 11) > 0.992) wax = true;
        if (a.tool === 'stamp' && id >= 2 && (Math.floor(xx) % 17 === 0 || Math.floor(yy) % 17 === 0) && hash(Math.floor(xx / 17), Math.floor(yy / 17), context.seed + 4) > 0.75) wax = true;
        const crack = cracks[Math.min(gridSize - 1, Math.floor(v * gridSize)) * gridSize + Math.min(gridSize - 1, Math.floor(u * gridSize))] < a.crackle * 0.025;
        const edge = Math.min(u, v, 1 - u, 1 - v), edgeCoord = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? yy : xx;
        const border = a.border === 'rules' ? Math.min(Math.abs(edge - 0.022), Math.abs(edge - 0.035)) < 0.002 : a.border === 'floral' ? edge < 0.042 && Math.abs(Math.sin(edgeCoord * 0.18) * Math.cos(edge * 240)) > 0.62 : a.border === 'fringe' && (edge < 0.014 && Math.floor(edgeCoord / 2) % 2 === 0 || edge > 0.018 && edge < 0.03);
        const weaveScale = { cotton: 1.4, linen: 0.9, silk: 2.1, hemp: 0.65 }[a.cloth];
        const weave = Math.sin(xx * weaveScale) * Math.cos(yy * weaveScale) * (a.cloth === 'hemp' ? 6 : 2);
        const bleed = a.registration === 'bleed' && wax && hash(Math.floor(xx), Math.floor(yy), context.seed + 9) > 0.73;
        for (let c = 0; c < 3; c++) {
          let dye = tone < 0.5 ? mix(dyes.ink[c], dyes.middle[c], tone * 2) : mix(dyes.middle[c], dyes.cloth[c], tone * 2 - 1);
          // Continuous local tone preserves a tiny person even in a two-bath graphic panel.
          dye = mix(dye, mix(dyes.ink[c], dyes.cloth[c], mapped), 0.48);
          if (id === 0) dye = dyes.cloth[c];
          if (wax && !bleed) dye = mix(dye, dyes.cloth[c], contour ? 0.8 : 0.38);
          if (infill) dye = mix(dye, dyes.cloth[c], 0.5);
          if (border) dye = dyes.cloth[c];
          // A fine dyed edge beside the resist keeps distant objects legible.
          const left = (y * size + Math.max(0, x - step)) * 4;
          if (id >= 2 && id !== identity[left] && !contour) dye = mix(dye, dyes.ink[c], 0.62);
          if (crack && (wax || value > 0.48)) dye = mix(dye, dyes.ink[c], (id === 0 ? 0.07 : 0.12) + a.crackle * (id === 0 ? 0.1 : 0.24));
          if (a.registration === 'drift' && !wax && Math.abs(lum(q) - value) > 0.06) dye = mix(dye, dyes.accent[c], 0.45);
          if (a.registration === 'uneven') dye = mix(dye, dyes.cloth[c], (Math.sin(u * 8 + Math.sin(v * 6)) + 1) * 0.075);
          if (a.cloth === 'silk') dye += Math.sin((u + v) * 4) * 6;
          if (a.history === 'folded' && Math.abs(v - 0.61 - Math.sin(u * 5) * 0.004) < 0.003) dye = mix(dye, dyes.cloth[c], 0.65);
          if (a.history === 'repaired' && u > 0.79 && u < 0.91 && v > 0.79 && v < 0.92) dye = (Math.floor(xx / 5) + Math.floor(yy / 5)) % 2 ? dyes.accent[c] : dyes.cloth[c];
          if (a.history === 'overdyed') dye = mix(dye, dyes.ink[c], (1 - u) * 0.22);
          pixels[p + c] = dye + weave + (hash(x, y, context.seed + 16) - 0.5) * 2;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.tool} wax, ${a.baths} ${a.dyes} dye stages`, `${a.reserve} reserves and ${a.filling} infill on ${a.cloth}`, `${a.border} border, ${a.registration} registration, ${a.history} cloth`] };
  },
});
