import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
export default defineLook({
  questions: {
    medium: choice('What is rubbed across the paper?', {
      graphite: 'Soft graphite with cool silvery darks.',
      charcoal: 'Powdery charcoal with broken deep dark marks.',
      wax: 'A broad wax crayon leaving dense uneven colour.',
      pencil: 'A sharp coloured pencil with visible diagonal strokes.',
    }),
    relief: choice('What surface texture lies beneath the scene?', {
      wood: 'Long wood grain flows around knots beneath the forms.',
      stone: 'Fine pits and rounded mineral grain from a stone relief.',
      cloth: 'A woven textile texture crosses the relief.',
      engraved: 'Fine parallel grooves and engraved cross marks.',
    }),
    pigment: choice('What colour of rubbing pigment was chosen? Hues follow the picture palette.', {
      black: 'Cool near-black pigment on pale paper.',
      umber: 'Earthy brown pigment with a soft warm accent.',
      blue: 'Deep blue pigment, like a field-study pencil.',
      red: 'Rust-red pigment with dark brown accents.',
    }),
    paper: choice('What sheet receives the rubbing?', {
      thin: 'Thin pale paper lets fine relief marks show sharply.',
      rag: 'Warm rag paper with irregular soft tooth.',
      kraft: 'Brown kraft paper with coarse visible fibres.',
      blue: 'Soft blue-grey paper carries the rubbing.',
    }),
    pressure: score('How firmly is the medium pressed over the relief?', ['Only high edges catch', 'Light pressure', 'Clear raised shapes', 'Firm complete rubbing', 'Dense heavy rubbing']),
    sweep: choice('How does the hand move over the sheet?', {
      diagonal: 'Broad diagonal passes cross the image.',
      horizontal: 'Long horizontal passes rub the scene.',
      circular: 'Small circular motions build overlapping patches.',
      following: 'The rubbing follows the direction of each surface.',
    }),
    contact: choice('How evenly does the paper contact the relief?', {
      even: 'The paper lies evenly against the relief.',
      lifted: 'A few soft pale patches show where the paper lifted.',
      offset: 'A light second rubbing is shifted slightly beside the first.',
      folded: 'A crease interrupts the rubbed impression.',
    }),
    contour: choice('How are the most prominent raised edges recorded?', {
      natural: 'Edges emerge naturally from the rubbing.',
      traced: 'A darker pencil line reinforces the raised contours.',
      pale: 'Pale pressure ridges remain alongside the dark edges.',
      doubled: 'A second short contour line records a slight paper shift.',
    }),
    sheet: choice('How is the working sheet finished?', {
      full: 'The rubbing reaches the edge.',
      tape: 'Small masking-tape strips hold the corners.',
      deckle: 'An irregular blank paper margin frames the impression.',
      torn: 'A narrow torn margin leaves coarse loose fibres.',
    }),
    record: choice('What remains from recording the rubbed surface?', {
      none: 'Only the rubbed image.',
      numbered: 'Three tiny numbered study tabs sit near the lower margin.',
      swatch: 'A small pigment pressure swatch sits in the lower corner.',
      erasure: 'A rubbed-out pale correction interrupts one lower corner.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const sets = {
      black: { ink: [44, 47, 48], accent: [104, 107, 101] },
      umber: { ink: [83, 58, 39], accent: [148, 111, 64] },
      blue: { ink: [38, 63, 99], accent: [89, 127, 147] },
      red: { ink: [126, 55, 39], accent: [170, 103, 67] },
    } as const;
    const dye = rekey(sets[a.pigment], context.palette, { ink: 'ink', accent: 'second' });
    const paper = { thin: [240, 236, 220], rag: [234, 222, 191], kraft: [194, 169, 124], blue: [202, 216, 216] }[a.paper];
    const step = Math.max(1, Math.round(unit));
    const lum = (p: number) => (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
    for (let y = 0; y < size; y++) {
      if (y % 40 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], xx = x / unit, yy = y / unit, u = x / size, v = y / size;
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const tone = lum(p), boundary = id >= 1 && (id !== identity[q] || id !== identity[r]);
        const normalEdge = Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]);
        const reliefEdge = boundary || id >= 1 && (normalEdge > 85 || Math.abs(lum(q) - tone) + Math.abs(lum(r) - tone) > 0.19);
        const seed = hash(Math.floor(xx / 6), Math.floor(yy / 6), context.seed);
        let texture = 0;
        if (a.relief === 'wood') texture = (Math.sin(yy * 1.4 + Math.sin(xx * 0.023) * 5 + Math.sin(xx * 0.011 + yy * 0.014) * 8) + 1) * 0.5;
        if (a.relief === 'stone') texture = hash(Math.floor(xx / 1.5), Math.floor(yy / 1.5), context.seed + 3) * 0.65 + seed * 0.35;
        if (a.relief === 'cloth') texture = (Math.sin(xx * 2.2) * Math.cos(yy * 2.2) + 1) * 0.5;
        if (a.relief === 'engraved') texture = Math.max(Math.sin((xx + yy * 0.35) * 1.8), Math.cos((yy - xx * 0.1) * 0.8)) * 0.5 + 0.5;
        let direction = a.sweep === 'horizontal' ? yy : a.sweep === 'diagonal' ? (xx + yy) * 0.71 : a.sweep === 'circular' ? Math.hypot(xx % 70 - 35, yy % 70 - 35) : xx * (normal[p] - 128) / 127 + yy * (normal[p + 1] - 128) / 127;
        const pass = (Math.sin(direction * (a.medium === 'pencil' ? 2.6 : 0.35)) + 1) * 0.5;
        let density = id === 0 ? 0 : (1 - tone * 0.8) * mix(0.35, 0.95, a.pressure);
        density *= mix(0.45, 1.1, texture) * mix(0.7, 1, pass);
        if (a.medium === 'wax') density = clamp01(density * 1.3 + (texture > 0.75 ? 0.06 : 0));
        if (a.medium === 'charcoal') density *= 0.58 + hash(Math.floor(xx), Math.floor(yy), context.seed + 9) * 0.75;
        if (a.medium === 'pencil') density *= pass > 0.66 ? 1.28 : 0.45;
        if (reliefEdge) density = Math.max(density, a.contour === 'traced' ? 0.9 : 0.68);
        if (a.contour === 'doubled') {
          const far = (y * size + Math.min(size - 1, x + step * 3)) * 4;
          if (id >= 2 && id !== identity[far]) density = Math.max(density, 0.5);
        }
        if (a.contact === 'offset') {
          const shifted = (Math.max(0, y - step * 2) * size + Math.max(0, x - step * 3)) * 4;
          if (identity[shifted] >= 1) density += (1 - lum(shifted)) * 0.12;
        }
        if (a.contact === 'lifted') density *= 0.62 + Math.sin(u * 18 + Math.sin(v * 13)) * 0.23;
        if (a.contact === 'folded' && Math.abs(u - 0.43 - Math.sin(v * 5) * 0.003) < 0.004) density *= 0.18;
        if (reliefEdge) density = Math.max(density, a.contour === 'traced' ? 0.9 : 0.7);
        const edge = Math.min(u, v, 1 - u, 1 - v);
        const margin = a.sheet === 'deckle' ? 0.023 + Math.sin((u + v) * 75) * 0.004 : a.sheet === 'torn' ? 0.017 + hash(Math.floor(xx / 3), Math.floor(yy / 3), context.seed + 2) * 0.011 : 0;
        if (edge < margin) density = 0;
        const tape = a.sheet === 'tape' && (u < 0.13 || u > 0.87) && (v < 0.04 || v > 0.96);
        const swatch = a.record === 'swatch' && u > 0.79 && u < 0.92 && v > 0.87 && v < 0.94;
        const tabIndex = a.record === 'numbered' && v > 0.91 && v < 0.95 ? [0.12, 0.2, 0.28].findIndex((left) => u > left && u < left + 0.035) : -1;
        const tab = tabIndex >= 0;
        let numeral = false;
        if (tab) {
          const tx = (u - [0.12, 0.2, 0.28][tabIndex]) / 0.035, ty = (v - 0.91) / 0.04;
          const bars: Record<string, boolean> = {
            a: tx > 0.25 && tx < 0.72 && ty > 0.15 && ty < 0.23,
            b: tx > 0.65 && tx < 0.73 && ty > 0.19 && ty < 0.5,
            c: tx > 0.65 && tx < 0.73 && ty > 0.5 && ty < 0.81,
            d: tx > 0.25 && tx < 0.72 && ty > 0.77 && ty < 0.85,
            e: tx > 0.23 && tx < 0.31 && ty > 0.5 && ty < 0.81,
            g: tx > 0.25 && tx < 0.72 && ty > 0.46 && ty < 0.54,
          };
          numeral = ['bc', 'abged', 'abcgd'][tabIndex].split('').some((bar) => bars[bar]);
        }
        if (a.record === 'erasure' && Math.hypot((u - 0.84) / 0.09, (v - 0.88) / 0.04) < 1) density *= 0.2;
        for (let c = 0; c < 3; c++) {
          let value = mix(paper[c], dye.ink[c], clamp01(density));
          if (a.medium === 'graphite') value += (normal[p + 1] / 255 - 0.5) * 4 * density;
          if (a.contour === 'pale' && reliefEdge) value = mix(value, paper[c], 0.18);
          if (swatch) value = mix(paper[c], dye.ink[c], (u - 0.79) / 0.13 * (Math.sin(yy * 1.6) > -0.1 ? 0.9 : 0.3));
          if (tab) value = numeral ? dye.ink[c] : paper[c] - 22;
          if (tape) value = mix(value, [219, 204, 161][c], 0.8);
          const grain = hash(x, y, context.seed + 8) - 0.5;
          pixels[p + c] = value + grain * (a.paper === 'rag' ? 6 : a.paper === 'kraft' ? 9 : 3);
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.medium} rubbed over ${a.relief}`, `${a.pigment} pigment on ${a.paper}, ${a.sweep} passes`, `${a.contact} contact and ${a.contour} contours, ${a.sheet} sheet, ${a.record} record`] };
  },
});
