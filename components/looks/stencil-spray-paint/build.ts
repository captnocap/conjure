import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
export default defineLook({
  questions: {
    cuts: choice('How many cut layers describe the picture?', {
      silhouette: 'One strong shadow stencil, with open paper highlights.',
      three: 'Three value stencils separate shadows, middle planes and lights.',
      four: 'Four cut layers keep extra detail in the smaller forms.',
      contour: 'A thin contour stencil lies over two broad flat tone layers.',
    }),
    nozzle: choice('What sort of spray edge does the can leave?', {
      fine: 'A fine nozzle produces a close controlled edge.',
      fan: 'A broad fan nozzle leaves a small soft halo.',
      spatter: 'Coarse droplets gather irregularly around the cut edge.',
      fog: 'A light aerosol fog extends gently beyond the stencil.',
    }),
    registration: choice('How do the separate stencil layers line up?', {
      tight: 'The layers fit closely with crisp shared boundaries.',
      offset: 'One accent stencil sits slightly to the side.',
      overlap: 'Dark and accent layers overlap in a narrow heavier edge.',
      double: 'A second light impression echoes the main stencil.',
    }),
    carrier: choice('What surface receives the paint?', {
      wall: 'A pale rough plaster wall with small granular pits.',
      card: 'Warm matte card with a dry close tooth.',
      metal: 'A grey painted metal sheet with fine horizontal scuffs.',
      fabric: 'Coarse woven cloth visible through the spray.',
    }),
    inks: choice('What tonal character do the inks have? Hues follow the picture palette.', {
      signal: 'A nearly black main ink and one forceful warm accent.',
      utility: 'Dark olive-grey, muted middle ink and pale buff reserves.',
      industrial: 'Hard dark blue-grey beside a clean bright accent.',
      faded: 'Soft charcoal, faded muted ink and warm pale stock.',
    }),
    coverage: score('How fully does the sprayed paint cover the surface?', ['Light translucent mist', 'Thin open coverage', 'Even paint', 'Dense strong paint', 'Heavy almost opaque coats']),
    bridges: choice('What holding bridges interrupt the cut shapes?', {
      hidden: 'Holding bridges are small enough to disappear in the picture.',
      upright: 'Occasional slim upright bridges join the stencil islands.',
      diagonal: 'A few small diagonal bridge marks remain in dark shapes.',
      paired: 'Short paired horizontal bridges give the cut layers a practical rhythm.',
    }),
    edge: choice('How does the sprayed picture end?', {
      open: 'The picture continues to the edge of the surface.',
      torn: 'An uneven torn mask leaves a pale ragged outer margin.',
      tape: 'Straight masking-tape strips leave a clean pale boundary.',
      frame: 'A narrow sprayed dark keyline frames the picture.',
    }),
    marks: choice('What practical marks were made beside the image?', {
      none: 'No marks beyond the picture.',
      test: 'A small row of nozzle test dots remains at the lower edge.',
      arrows: 'Two small stencilled alignment arrows sit below the picture.',
      ticks: 'Short registration ticks remain near the four corners.',
    }),
    history: choice('What happened to the paint after spraying?', {
      fresh: 'The fresh paint is even and intact.',
      runs: 'A few narrow runs descend from the heaviest lower edges.',
      flaked: 'Tiny irregular flakes expose the underlying surface.',
      wiped: 'A lightly wiped band leaves horizontal streaks in one corner.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, normal, identity } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(color.length);
    const sets = {
      signal: { dark: [31, 35, 35], mid: [166, 72, 48], light: [211, 174, 115], paper: [232, 223, 199] },
      utility: { dark: [45, 53, 40], mid: [119, 129, 83], light: [186, 173, 123], paper: [224, 214, 181] },
      industrial: { dark: [31, 45, 61], mid: [52, 125, 151], light: [228, 168, 66], paper: [220, 225, 220] },
      faded: { dark: [71, 65, 62], mid: [147, 117, 112], light: [194, 173, 140], paper: [231, 217, 191] },
    } as const;
    const dye = rekey(sets[a.inks], context.palette, { dark: 'ink', mid: 'second', light: 'second', paper: 'ground' });
    const index = (x: number, y: number) => (Math.max(0, Math.min(size - 1, Math.round(y))) * size + Math.max(0, Math.min(size - 1, Math.round(x)))) * 4;
    const toneAt = (p: number) => (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
    const step = Math.max(1, Math.round(unit));
    const layerAt = (p: number) => {
      const tone = toneAt(p);
      return a.cuts === 'silhouette' ? (tone < 0.58 ? 0 : 3) : a.cuts === 'four' ? Math.min(3, Math.floor(tone * 4)) : tone < 0.37 ? 0 : tone < 0.73 ? 1 : 3;
    };
    const palette = [dye.dark, dye.mid, dye.light, dye.paper];
    const mistRadius = { fine: 1.3, fan: 3.5, spatter: 5, fog: 7 }[a.nozzle] * unit;
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((r) => setTimeout(r, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size, id = identity[p];
        let layer = layerAt(p);
        const q = index(x + step, y), r = index(x, y + step);
        const contour = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 80);
        if (contour && (a.cuts === 'contour' || id >= 3)) layer = 0;
        const grain = hash(Math.floor(x / Math.max(unit, 1)), Math.floor(y / Math.max(unit, 1)), context.seed);
        const shift = a.registration === 'tight' ? 0 : (a.registration === 'double' ? 4 : 2) * unit;
        const shiftedLayer = layerAt(index(x - shift, y + shift * 0.5));
        let chosen = palette[layer], opacity = layer === 3 ? 0 : mix(0.58, 1, a.coverage);
        if (a.registration === 'offset' && shiftedLayer === 1) chosen = dye.mid;
        if (a.registration === 'offset' && shiftedLayer === 1 && layer === 3) opacity = 0.7;
        if (a.registration === 'double' && layer === 3 && shiftedLayer !== 3) { chosen = palette[shiftedLayer]; opacity = 0.28; }
        const angle = hash(x, y, context.seed + 11) * Math.PI * 2;
        const nearby = layerAt(index(x + Math.cos(angle) * mistRadius, y + Math.sin(angle) * mistRadius));
        if (nearby < layer && grain > (a.nozzle === 'spatter' ? 0.74 : 0.87)) { chosen = palette[nearby]; opacity = Math.max(opacity, a.nozzle === 'spatter' ? 0.5 : a.nozzle === 'fog' ? 0.19 : 0.3); }
        let bridge = false;
        if (a.bridges === 'upright') bridge = Math.abs((x / unit + 13) % 67 - 33.5) < 0.48 && Math.floor(y / (18 * unit)) % 4 === 0;
        if (a.bridges === 'diagonal') bridge = Math.abs((x / unit + y / unit * 0.7) % 91 - 45.5) < 0.65 && Math.floor(y / (25 * unit)) % 3 === 1;
        if (a.bridges === 'paired') bridge = Math.min(Math.abs(y / unit % 73 - 31), Math.abs(y / unit % 73 - 36)) < 0.55 && Math.floor(x / (15 * unit)) % 4 === 2;
        if (bridge) opacity *= 0.14;
        if (a.history === 'flaked' && hash(Math.floor(x / (2 * unit)), Math.floor(y / (2 * unit)), context.seed + 5) > 0.978) opacity *= 0.14;
        if (a.history === 'wiped' && u > 0.67 && v > 0.69) opacity *= 0.5 + Math.sin(y / unit * 2.6) * 0.25;
        if (a.history === 'runs' && v > 0.47 && v < 0.9 && hash(Math.floor(x / (2 * unit)), 0, context.seed + 9) > 0.989 && layerAt(index(x, y - 15 * unit)) === 0) { chosen = dye.dark; opacity = Math.max(opacity, (0.9 - v) * 1.2); }
        const margin = Math.min(u, v, 1 - u, 1 - v), edgeCoord = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? y / unit : x / unit;
        if (a.edge === 'tape' && margin < 0.035 || a.edge === 'torn' && margin < 0.019 + hash(Math.floor(edgeCoord / 4), 0, context.seed + 17) * 0.014) opacity = 0;
        if (a.edge === 'frame' && Math.abs(margin - 0.022) < 0.002) { chosen = dye.dark; opacity = 0.85; }
        if (a.marks === 'test' && u > 0.055 && u < 0.2 && (u * 100 % 3 - 1.5) ** 2 + ((v - 0.946) * 100) ** 2 < 0.35) { chosen = dye.mid; opacity = 0.8; }
        if (a.marks === 'arrows' && v > 0.925 && v < 0.963) {
          const dx = Math.min(Math.abs(u - 0.08), Math.abs(u - 0.14));
          if (dx < 0.002 || v < 0.94 && dx < (0.94 - v) * 0.7) { chosen = dye.dark; opacity = 0.9; }
        }
        if (a.marks === 'ticks' && (Math.abs(Math.min(u, 1 - u) - 0.055) < 0.0014 && Math.min(v, 1 - v) < 0.04 || Math.abs(Math.min(v, 1 - v) - 0.055) < 0.0014 && Math.min(u, 1 - u) < 0.04)) { chosen = dye.dark; opacity = 0.9; }
        for (let c = 0; c < 3; c++) {
          const stockShift = a.carrier === 'metal' ? -28 : a.carrier === 'fabric' ? -12 : a.carrier === 'card' ? -4 : 0;
          let stock = dye.paper[c] + stockShift;
          let texture = (grain - 0.5) * (a.carrier === 'wall' ? 12 : 3);
          if (a.carrier === 'metal') texture += Math.sin(y / unit * 3.1) * 2;
          if (a.carrier === 'fabric') texture += Math.sin(x / unit * 2.3) * Math.cos(y / unit * 2.3) * 5;
          let value = mix(stock, chosen[c], clamp01(opacity)) + texture * (1 - opacity * 0.65);
          if (a.registration === 'overlap' && shiftedLayer !== layer && layer < 3 && shiftedLayer < 3) value *= 0.79;
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.cuts} stencil layers with a ${a.nozzle} nozzle`, `${a.registration} registration, ${a.bridges} bridges`, `${a.history} paint on ${a.carrier}`] };
  },
});
