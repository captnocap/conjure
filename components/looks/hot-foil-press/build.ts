import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';
const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
export default defineLook({
  questions: {
    metal: choice('What metallic foil is pressed onto the sheet?', {
      gold: 'Warm gold foil with pale yellow glints.',
      silver: 'Cool silver foil with bright white reflections.',
      copper: 'Red copper foil with warm rose highlights.',
      pearl: 'Pale pearlescent foil with restrained coloured reflections.',
    }),
    coverage: choice('Which parts of the picture receive foil?', {
      forms: 'The depicted forms are stamped in foil.',
      shadows: 'Foil occupies darker shapes, with open paper lights.',
      highlights: 'Selected bright shapes catch the metallic foil.',
      contours: 'Fine foil contours trace the scene over the printed image.',
    }),
    underprint: choice('What ink is printed beneath the foil?', {
      mono: 'A quiet monochrome ink carries the unfoiled picture.',
      duotone: 'Two flat ink values describe the remaining shapes.',
      colour: 'Muted scene colours remain beneath the metallic accents.',
      blind: 'The unfoiled forms appear only as a subtle impression in the paper.',
    }),
    paper: choice('What paper stock holds the stamp? Colours follow the picture palette.', {
      black: 'Dense dark charcoal paper with a soft tooth.',
      ivory: 'Heavy warm ivory card.',
      blue: 'Muted blue-grey cover stock.',
      burgundy: 'Dark wine-red paper with a smooth surface.',
    }),
    die: choice('What texture is engraved into the foil die?', {
      smooth: 'Smooth foil with continuous reflected light.',
      brushed: 'Very fine brushed lines run through the foil.',
      stippled: 'A fine stippled die breaks up the reflection.',
      ruled: 'Close parallel engraved rules texture the stamped metal.',
    }),
    pressure: score('How firmly does the die press into the stock?', ['A delicate kiss impression', 'Light pressure', 'A clear complete stamp', 'Firm die edges', 'Deep tactile pressure']),
    registration: choice('How precisely does foil meet the printed ink?', {
      exact: 'Foil and ink align precisely.',
      shifted: 'The foil sits very slightly beside the ink drawing.',
      double: 'A faint second foil edge records a double impression.',
      knockout: 'A narrow paper gap separates foil from surrounding ink.',
    }),
    relief: choice('How does the die shape the paper?', {
      flat: 'A flat foil stamp, with no extra embossing.',
      raised: 'The stamped forms rise gently above the paper.',
      recessed: 'A small recessed impression catches a dark edge.',
      bevel: 'A clear bevel shines around the main contours.',
    }),
    condition: choice('What trace of printing or use remains?', {
      new: 'An even clean new foil impression.',
      patchy: 'A few small gaps reveal the paper beneath the foil.',
      tarnished: 'Subtle darker patches interrupt older metallic surfaces.',
      creased: 'A fine crease cracks the foil across the lower sheet.',
    }),
    border: choice('What finishing rule surrounds the print?', {
      full: 'No separate border.',
      keyline: 'A fine double metallic keyline surrounds the sheet.',
      corners: 'Four small decorative foil corner brackets.',
      panel: 'A quiet rectangular foil-bordered panel below the image.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const stocks = {
      black: { paper: [36, 41, 43], ink: [124, 137, 140], accent: [174, 159, 127] },
      ivory: { paper: [238, 229, 205], ink: [49, 67, 73], accent: [137, 127, 101] },
      blue: { paper: [90, 119, 133], ink: [30, 43, 56], accent: [192, 199, 179] },
      burgundy: { paper: [90, 42, 51], ink: [193, 151, 148], accent: [219, 190, 161] },
    } as const;
    const dyes = rekey(stocks[a.paper], context.palette, { paper: 'ground', ink: 'ink', accent: 'second' });
    const metal = { gold: [202, 160, 67], silver: [185, 196, 204], copper: [188, 114, 81], pearl: [210, 207, 182] }[a.metal];
    const lum = (p: number) => clamp01((color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255);
    const step = Math.max(1, Math.round(unit)), shift = Math.max(1, Math.round(unit * 2));
    const edgeAt = (x: number, y: number) => {
      const p = (y * size + x) * 4, q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
      return identity[p] >= 1 && (identity[p] !== identity[q] || identity[p] !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 85 || Math.abs(lum(p) - lum(q)) + Math.abs(lum(p) - lum(r)) > 0.22);
    };
    for (let y = 0; y < size; y++) {
      if (y % 36 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], tone = lum(p), xx = x / unit, yy = y / unit, u = x / size, v = y / size;
        const edgeForm = edgeAt(x, y);
        const sx = a.registration === 'shifted' ? Math.max(0, x - shift) : x, sy = a.registration === 'shifted' ? Math.max(0, y - shift) : y;
        const source = (sy * size + sx) * 4, sourceTone = lum(source), sourceEdge = edgeAt(sx, sy);
        let foil = identity[source] >= 1 && (a.coverage === 'forms' || a.coverage === 'shadows' && sourceTone < 0.53 || a.coverage === 'highlights' && sourceTone > 0.64 || a.coverage === 'contours' && sourceEdge);
        if (a.registration === 'knockout' && edgeForm) foil = false;
        if (a.registration === 'double' && edgeAt(Math.max(0, x - shift), Math.min(size - 1, y + shift))) foil = true;
        const edge = Math.min(u, v, 1 - u, 1 - v);
        const line = a.border === 'keyline' && Math.min(Math.abs(edge - 0.02), Math.abs(edge - 0.029)) < 0.0014;
        const corners = a.border === 'corners' && ((u < 0.12 || u > 0.88) && Math.abs(Math.min(v, 1 - v) - 0.025) < 0.002 || (v < 0.12 || v > 0.88) && Math.abs(Math.min(u, 1 - u) - 0.025) < 0.002);
        const panel = a.border === 'panel' && u > 0.33 && u < 0.67 && v > 0.92 && v < 0.97 && (u < 0.334 || u > 0.666 || v < 0.924 || v > 0.966);
        foil ||= line || corners || panel;
        const reflection = Math.sin(u * 6 + v * 2 + normal[source] / 255 * 1.5) * 0.5 + 0.5;
        let glint = mix(0.62, 1.13, sourceTone) + reflection * 0.13;
        if (a.die === 'brushed') glint += Math.sin(yy * 2.2 + Math.sin(xx * 0.03)) * 0.035;
        if (a.die === 'stippled') glint += (hash(Math.floor(xx), Math.floor(yy), context.seed + 3) - 0.5) * 0.13;
        if (a.die === 'ruled') glint += Math.sin((xx + yy * 0.3) * 1.9) * 0.065;
        if (a.condition === 'patchy' && hash(Math.floor(xx / 2), Math.floor(yy / 2), context.seed + 6) > 0.973) foil = false;
        if (a.condition === 'tarnished') glint *= 0.88 + Math.sin(u * 22 + Math.cos(v * 17)) * 0.1;
        if (a.condition === 'creased' && Math.abs(v - 0.73 - Math.sin(u * 7) * 0.004) < 0.0025) foil = false;
        for (let c = 0; c < 3; c++) {
          let value = id === 0 ? dyes.paper[c] : a.underprint === 'blind' ? dyes.paper[c] * (0.86 + tone * 0.12) : a.underprint === 'colour' ? mix(color[p + c], dyes.paper[c], 0.36) : mix(dyes.ink[c], dyes.paper[c], a.underprint === 'duotone' ? tone > 0.55 ? 0.78 : 0.23 : tone * 0.85);
          if (edgeForm) value = mix(value, dyes.ink[c], 0.62);
          if (foil) {
            value = metal[c] * glint + reflection ** 6 * 30;
            if (a.metal === 'pearl') value += Math.sin(u * 5 + v * 7 + c * 2.1) * 11;
            if (sourceEdge) value *= mix(0.88, 0.63, a.pressure);
          }
          if (edgeForm && a.relief !== 'flat') value += (a.relief === 'recessed' ? -18 : a.relief === 'bevel' ? 25 : 13) * mix(0.35, 1, a.pressure);
          if (!foil) value += (hash(x, y, context.seed + 9) - 0.5) * 3;
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.metal} foil on ${a.paper} stock`, `${a.coverage} with ${a.underprint} ink, ${a.die} die and ${a.relief} relief`, `${a.registration} registration, ${a.condition} finish, ${a.border} border`] };
  },
});
