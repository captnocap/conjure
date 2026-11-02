import { type Palette, type PaletteRole, choice, clamp01, defineLook, mix, rekey, rekeyOne, score, seeded } from '@conjure/kit';

/**
 * Old master light: the frame repainted in oils, built on light rather than line.
 *
 *   1. The capture is read for local colour (the plain-lit pass divides most of the render's
 *      shading back out), form (plain-lit pass plus normals against capture.light), depth and
 *      identity.
 *   2. Local colour is matched to a historical palette, two pigments per spot, so a wall is a
 *      family of neighbouring earths rather than one colour with noise.
 *   3. A light map is built per tradition and the whole picture is multiplied by it, things,
 *      set and ground alike, so every form is modelled by the same light:
 *        chiaroscuro  a warm pool on the subject, a brown-black floor everywhere else;
 *        sfumato      a soft, blurred light, olive half-tones and a hazy blue distance;
 *        hard-light   two versions of the scene, a cool shade and a warm sun, the sun clipped
 *                     in by hard-edged blocks derived from the plain-lit pass and capture.light.
 *   4. The result is repainted with bristle strokes: big scrubbed marks behind, medium marks
 *      along the floor's iso-depth lines, small marks following each thing's form, impasto
 *      ridges in the brightest lights. Strokes never cross a form's edge.
 *   5. Paint height, canvas weave and cupped craquelure are lit by a gallery light from the
 *      upper left; varnish, smoke grime and a vignette finish the canvas.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const mulRGB = (a: RGB, b: RGB): RGB => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
const scaleRGB = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (from: number, to: number, x: number) => {
  const t = clamp01((x - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const hash = (x: number, y: number, s: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const fbm = (x: number, y: number, s: number, octaves = 4) => {
  let value = 0, amp = 0.5, total = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * vnoise(x * f, y * f, s + i * 101);
    total += amp;
    amp *= 0.5;
    f *= 2.07;
  }
  return value / total;
};

/** Separable box blur, repeated: close enough to a gaussian for paint. */
function blur(src: Float32Array, size: number, radius: number, passes = 2): Float32Array {
  const r = Math.round(radius);
  const out = src.slice();
  if (r < 1) return out;
  const line = new Float32Array(size);
  const norm = 1 / (2 * r + 1);
  const last = size - 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < size; y++) {
      const row = y * size;
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += out[row + Math.min(last, Math.max(0, i))];
      for (let x = 0; x < size; x++) {
        line[x] = acc * norm;
        acc += out[row + Math.min(last, x + r + 1)] - out[row + Math.max(0, x - r)];
      }
      out.set(line, row);
    }
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += out[Math.min(last, Math.max(0, i)) * size + x];
      for (let y = 0; y < size; y++) {
        line[y] = acc * norm;
        acc += out[Math.min(last, y + r + 1) * size + x] - out[Math.max(0, y - r) * size + x];
      }
      for (let y = 0; y < size; y++) out[y * size + x] = line[y];
    }
  }
  return out;
}

// OKLab, for matching colours to pigments by eye rather than by RGB distance.
const LINEAR = new Float32Array(1024);
for (let i = 0; i < 1024; i++) {
  const c = i / 1023;
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const lin = (c: number) => LINEAR[Math.max(0, Math.min(1023, Math.round(c * 1023)))];
const oklab = (r: number, g: number, b: number, out: Float32Array, o: number) => {
  const lr = lin(r), lg = lin(g), lb = lin(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  out[o] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[o + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[o + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
};

const describe = <T extends Record<string, { description: string }>>(table: T) =>
  Object.fromEntries(Object.entries(table).map(([key, entry]) => [key, entry.description])) as Record<keyof T & string, string>;

const TRADITIONS = {
  chiaroscuro: {
    description:
      'Rembrandt chiaroscuro: one warm pool of window or candle light on the subject, everything else sinking into brown-black; thin glazed darks, the brightest lights laid on thick.',
    name: 'Rembrandt chiaroscuro',
    floor: '#1e150d',
    lift: 0,
    pool: 1,
    edge: [0.1, 0.8] as const,
    marks: 1,
    load: 1,
    vary: 1,
    vignette: 0.8,
    soften: 0.35,
  },
  sfumato: {
    description:
      'Leonardo sfumato: soft smoky transitions with no hard edge anywhere, forms melting into olive shadow, a cool hazy distance, an old panel under yellowed varnish.',
    name: 'Leonardo sfumato',
    floor: '#2b281b',
    lift: 0.1,
    pool: 0.75,
    edge: [0, 0.22] as const,
    marks: 0.6,
    load: 0.3,
    vary: 0.55,
    vignette: 0.6,
    soften: 1,
  },
  'hard-light': {
    description:
      'Hopper realism: flat walls and floors in cool shade, long hard-edged blocks of warm sunlight laid across them, brushwork almost invisible, a still and lonely clarity.',
    name: 'Hopper hard light',
    floor: '#3c5a55',
    lift: 0,
    pool: 0,
    edge: [0.72, 1] as const,
    marks: 0.3,
    load: 0.22,
    vary: 0.35,
    vignette: 0.3,
    soften: 0,
  },
} as const;

const LIGHTS = {
  window: {
    description: 'Daylight from a high side window: a broad shaft falling across the subject, a little dust turning in it.',
    colour: '#ffe2b4',
    pool: 1,
    beam: 1,
    edge: 0,
    low: false,
    drain: 0,
  },
  candle: {
    description: 'A single candle or oil lamp close by: a small, deep, glowing pool, the dark pressing in all round it.',
    colour: '#ffad5c',
    pool: 0.62,
    beam: 0,
    edge: -0.05,
    low: true,
    drain: 0.1,
  },
  sun: {
    description: 'Low sun through glass: long slanting shapes of light with crisp edges, everything it touches glowing.',
    colour: '#ffd890',
    pool: 1.3,
    beam: 0.6,
    edge: 0.25,
    low: false,
    drain: 0,
  },
  north: {
    description: 'Cool, even north light from a studio skylight: pale and pearly, the shadows soft and grey.',
    colour: '#eef0ea',
    pool: 1.6,
    beam: 0,
    edge: -0.15,
    low: false,
    drain: 0.05,
  },
  moon: {
    description: 'Moonlight through an open shutter: a cold, pale light, the colour drained out, the shadows nearly black.',
    colour: '#b5c5e0',
    pool: 1.05,
    beam: 0.5,
    edge: 0.05,
    low: false,
    drain: 0.55,
  },
} as const;

const PALETTES = {
  earth: {
    description:
      'The old-master earth palette: lead white, Naples yellow, ochres, siennas, madder, umbers and bone black, with one bright accent pigment and a greyed distance; everything pulled toward warm brown and gold.',
    pigments: ['#ede4cf', '#e2c47e', '#c49a48', '#a8713a', '#8c4a2a', '#9c3d27', '#c2462e', '#7a2630', '#5f4b33', '#4a3121', '#2f2119', '#1b1714', '#6f7556', '#5b6a78', '#58542f'],
    pull: 0.62,
    wall: '#6b5638',
    sky: '#7d8a8c',
    haze: '#a3a593',
    hills: ['#8f9c98', '#6f7f74', '#5d5a3c'],
    ground: '#8a5a3a',
  },
  jewel: {
    description:
      'Earth colours set with costly pigments: a precious deep accent, its answering stone, crimson lake and lead-tin yellow glowing in the lit things, as in a rich commission.',
    pigments: ['#efe7d3', '#ead06a', '#c79a45', '#8c4a2a', '#c8402a', '#8e1b2c', '#5c1424', '#2a3f95', '#1f2a5e', '#3d7a55', '#24483a', '#4a3121', '#231a14', '#121014', '#6b84a8'],
    pull: 0.5,
    wall: '#4a3a2c',
    sky: '#56709a',
    haze: '#8f9db0',
    hills: ['#7f93ad', '#4f6a80', '#3a4a33'],
    ground: '#7a4630',
  },
  verdaccio: {
    description:
      'A Renaissance panel palette: cool green-grey verdaccio showing in the half-tones, olive shadows, ivory and pale tinted lights, a cool far distance.',
    pigments: ['#ebe3cb', '#dcc2a0', '#c9a27a', '#b99459', '#a56a58', '#7f826b', '#5f6656', '#3f4232', '#6c7a5e', '#6e7c88', '#94a5ac', '#4b3d2c', '#2b271c', '#8b6a3e'],
    pull: 0.6,
    wall: '#5a5640',
    sky: '#a7b9bb',
    haze: '#aab7b1',
    hills: ['#9fb2b4', '#7d9490', '#6b6a45'],
    ground: '#7d806a',
  },
  american: {
    description:
      'Twentieth-century tube colours: cadmium yellow and cream in the sun, a clean cool colour and slate in the shade, one strong accent; a clean American light of the 1930s and 40s.',
    pigments: ['#f3ecdc', '#f0cf74', '#e2b968', '#c98b52', '#b4553a', '#c4392d', '#7a2c2a', '#5d8679', '#4b6d63', '#2f4a43', '#4f6c8c', '#9fc3cf', '#5b3d2b', '#23272a', '#a3a58a'],
    pull: 0.55,
    wall: '#cdb886',
    sky: '#9ec6cf',
    haze: '#bccdc6',
    hills: ['#a9c0b8', '#8aa39a', '#7d8a5a'],
    ground: '#efe8d8',
  },
  tonal: {
    description:
      'Almost monochrome, a brown study in tone: umber, ochre and white with a single note of colour, the way a master laid in a picture before colour.',
    pigments: ['#ebe1cb', '#d4bf96', '#b28d55', '#8a5a33', '#5a4028', '#2c2118', '#15110d', '#a33a2a'],
    pull: 0.86,
    wall: '#5a4630',
    sky: '#a08a68',
    haze: '#ab9876',
    hills: ['#a6906c', '#86704e', '#5e4a30'],
    ground: '#8a6440',
  },
} as const;

/**
 * The picture's palette touches an old-master painting lightly, so the tradition still reads: each
 * option's accent pigments (earth's vermilion, jewel's ultramarine and malachite, verdaccio's rose,
 * the American brick red and viridian shade, the tonal study's single red) take the ink or the second;
 * the distance (sky, haze, hills) takes the second; the wall and floor are tinted by the ground; and
 * the light leans halfway toward the ink. The body of earths, whites and blacks stays as the
 * tradition ground them.
 */
const ACCENTS: Record<string, Record<number, PaletteRole>> = {
  earth: { 6: 'ink' },
  jewel: { 7: 'ink', 8: 'ink', 14: 'ink', 9: 'second', 10: 'second' },
  verdaccio: { 4: 'ink' },
  american: { 5: 'ink', 7: 'second', 8: 'second', 9: 'second' },
  tonal: { 7: 'ink' },
};
const bytesOf = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;
const hexOf = (c: readonly [number, number, number]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
function keyHexes(colours: readonly string[], palette: Palette, roles: Record<number, PaletteRole>): string[] {
  const keyed = rekey(Object.fromEntries(colours.map((c, k) => [k, bytesOf(c)])), palette, roles);
  return colours.map((c, k) => (roles[k] ? hexOf(keyed[k]) : c));
}
type Pigments = { pigments: readonly string[]; pull: number; wall: string; sky: string; haze: string; hills: readonly string[]; ground: string };
function keyPigments(pal: Pigments, key: string, palette: Palette | undefined): Pigments {
  if (!palette) return pal;
  const [sky, haze, ...hills] = keyHexes([pal.sky, pal.haze, ...pal.hills], palette, { 0: 'second', 1: 'second', 2: 'second', 3: 'second', 4: 'second' });
  const [wall, ground] = keyHexes([pal.wall, pal.ground], palette, { 0: 'ground', 1: 'ground' });
  return { ...pal, pigments: keyHexes(pal.pigments, palette, ACCENTS[key] ?? {}), wall, sky, haze, hills, ground };
}

const SUPPORTS = {
  linen: {
    description: 'Fine linen canvas: a tight, even weave just showing through the thin dark passages.',
    weave: 3.2,
    weaveAmp: 0.3,
    crack: 6.5,
    stretch: 1,
    marks: 1,
    load: 1,
  },
  sailcloth: {
    description: 'Coarse open-weave canvas: a heavy grain that breaks up every stroke and catches the light.',
    weave: 5.2,
    weaveAmp: 0.6,
    crack: 8,
    stretch: 1,
    marks: 1.15,
    load: 1,
  },
  panel: {
    description: 'A gessoed oak or poplar panel: smooth as enamel, no weave, cracks running with the grain of the wood.',
    weave: 0,
    weaveAmp: 0,
    crack: 5.5,
    stretch: 2.2,
    marks: 0.85,
    load: 0.7,
  },
  copper: {
    description: 'A small copper plate: glass-smooth, jewel-bright colour and tiny, precise brushwork.',
    weave: 0,
    weaveAmp: 0,
    crack: 4.5,
    stretch: 1.3,
    marks: 0.6,
    load: 0.35,
  },
} as const;

const CONDITIONS = {
  fresh: {
    description: 'Just finished in the studio: the paint still wet and glossy, colours bright, no varnish and no cracks.',
    varnish: 0,
    cracks: 0,
    grime: 0,
    gloss: 1,
  },
  museum: {
    description: 'Cleaned and restored in a museum: a clear, even varnish and a fine web of age cracks across the paint.',
    varnish: 0.18,
    cracks: 0.55,
    grime: 0.1,
    gloss: 0.55,
  },
  yellowed: {
    description: 'Under centuries of yellowed varnish: everything seen through amber, the blues turned green, cracks across it all.',
    varnish: 0.7,
    cracks: 0.75,
    grime: 0.3,
    gloss: 0.6,
  },
  smoke: {
    description: 'Hung for generations in a church or a tavern: darkened by smoke and candle soot, deep cracks, dirt settled in every hollow.',
    varnish: 0.85,
    cracks: 1,
    grime: 0.9,
    gloss: 0.2,
  },
  unfinished: {
    description: 'Left unfinished: the warm toned ground and the brown underdrawing still bare where the painter stopped; only the subject is brought to finish.',
    varnish: 0,
    cracks: 0.12,
    grime: 0,
    gloss: 0.35,
  },
} as const;

const BEHIND = {
  darkness: 'Brown-black darkness: everything beyond the light is swallowed, with only a faint glow behind the subject.',
  interior: 'A dim room: walls and floor kept in warm half-light, the light falling across a plain wall.',
  distance: 'Hazy distance: whatever lies beyond the subject goes paler, bluer and softer, a far landscape of blue hills.',
  sunlit: 'Bright open air: the surroundings sunlit and pale under a high sky, the subject set against light instead of dark.',
} as const;

export default defineLook({
  questions: {
    tradition: choice('Which tradition of painting with light is this?', describe(TRADITIONS)),
    light: choice('What light falls on the scene?', describe(LIGHTS)),
    contrast: score('How deep do the shadows go?', [
      'Shallow: shadows keep their colour and detail',
      'Moderate',
      'Deep',
      'Most of the canvas lost to darkness',
    ]),
    edge: score('How sharp is the edge where light turns to shadow?', ['Melting like smoke', 'Soft', 'Firm', 'Cut like a blade']),
    behind: choice('What becomes of everything behind the subject?', BEHIND),
    palette: choice('Which pigments are on the palette? Its accents take the picture\u2019s palette.', describe(PALETTES)),
    handling: score('How is the paint handled?', [
      'Glazed smooth as enamel, no brush visible',
      'Fine and fused',
      'Visible strokes',
      'Loose and broad',
      'Loaded impasto: the lights stand up in ridges',
    ]),
    support: choice('What is it painted on?', describe(SUPPORTS)),
    condition: choice('What has happened to the painting since it was made?', describe(CONDITIONS)),
  },

  async apply(capture, a, context, signal) {
    const S = capture.size, N = S * S;
    const { color, normal, depth, identity, diffuse } = capture;
    const { mood } = context;
    const seed = context.seed | 0;
    const rnd = seeded((context.seed ^ 0x0a17b4a7) >>> 0);
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };

    const trad = TRADITIONS[a.tradition];
    const lightSpec = LIGHTS[a.light];
    const pal = keyPigments(PALETTES[a.palette], a.palette, context.palette);
    const sup = SUPPORTS[a.support];
    const cond = CONDITIONS[a.condition];
    const hard = a.tradition === 'hard-light';
    const sfumato = a.tradition === 'sfumato';
    const chiaro = a.tradition === 'chiaroscuro';
    const unfinished = a.condition === 'unfinished';
    const handling = a.handling;

    // ── 1. Read the capture ──────────────────────────────────────────────────────────────────
    const ids = new Uint8Array(N);
    const dep = new Float32Array(N);
    const nX = new Float32Array(N), nY = new Float32Array(N), nZ = new Float32Array(N);
    const plain = new Float32Array(N);
    const count = new Int32Array(256);
    const minX = new Int32Array(256).fill(S), maxX = new Int32Array(256).fill(-1);
    const minY = new Int32Array(256).fill(S), maxY = new Int32Array(256).fill(-1);
    const sumX = new Float64Array(256), sumY = new Float64Array(256);
    const dLo = new Float32Array(256).fill(1), dHi = new Float32Array(256).fill(0);
    const histogram = new Uint32Array(256);
    let solid = 0;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const p = y * S + x, o = p * 4;
        const id = identity[o];
        ids[p] = id;
        count[id]++;
        if (x < minX[id]) minX[id] = x;
        if (x > maxX[id]) maxX[id] = x;
        if (y < minY[id]) minY[id] = y;
        if (y > maxY[id]) maxY[id] = y;
        sumX[id] += x;
        sumY[id] += y;
        nX[p] = normal[o] / 127.5 - 1;
        nY[p] = -(normal[o + 1] / 127.5 - 1);
        nZ[p] = normal[o + 2] / 127.5 - 1;
        if (id === 0) {
          dep[p] = 1;
          continue;
        }
        const d = (depth[o] * 65536 + depth[o + 1] * 256 + depth[o + 2]) / 16777216;
        dep[p] = d;
        if (d < dLo[id]) dLo[id] = d;
        if (d > dHi[id]) dHi[id] = d;
        const v = (diffuse[o] * 0.3 + diffuse[o + 1] * 0.59 + diffuse[o + 2] * 0.11) / 255;
        plain[p] = v;
        histogram[Math.min(255, Math.round(v * 255))]++;
        solid++;
      }
    const percentile = (fraction: number) => {
      let seen = 0;
      for (let v = 0; v < 256; v++) {
        seen += histogram[v];
        if (seen >= solid * fraction) return v / 255;
      }
      return 1;
    };
    const dim = percentile(0.03), bright = Math.max(dim + 0.05, percentile(0.95));

    // The hero is the first placed thing; the subject is every placed thing together.
    let hero = -1;
    for (let id = 3; id < 256; id++) if (count[id] > 40) { hero = id; break; }
    if (hero < 0) hero = count[2] > 40 ? 2 : count[1] > 40 ? 1 : 0;
    let sx0 = S, sx1 = 0, sy0 = S, sy1 = 0, tdLo = 1, tdHi = 0;
    for (let id = hero >= 3 ? 3 : hero; id < 256; id++) {
      if (count[id] <= 40 || (hero >= 3 && id < 3)) continue;
      if (hero < 3 && id !== hero) continue;
      sx0 = Math.min(sx0, minX[id]); sx1 = Math.max(sx1, maxX[id]);
      sy0 = Math.min(sy0, minY[id]); sy1 = Math.max(sy1, maxY[id]);
      tdLo = Math.min(tdLo, dLo[id]); tdHi = Math.max(tdHi, dHi[id]);
    }
    if (sx1 <= sx0) { sx0 = S * 0.3; sx1 = S * 0.7; sy0 = S * 0.3; sy1 = S * 0.7; }
    if (tdHi <= tdLo) { tdLo = 0.4; tdHi = 0.6; }
    const heroX = count[hero] ? sumX[hero] / count[hero] : S / 2;
    const heroY = count[hero] ? sumY[hero] / count[hero] : S / 2;
    const heroBase = count[hero] ? maxY[hero] : S * 0.7;
    const R = Math.max(sx1 - sx0, sy1 - sy0, S * 0.2);
    const scx = (sx0 + sx1) / 2, scy = (sy0 + sy1) / 2;
    const tdSpan = Math.max(1e-5, tdHi - tdLo);
    const groundTop = count[1] ? minY[1] : S * 0.62;

    // ── 2. Light: its direction, its colour, and how it falls ───────────────────────────────
    let [lx, ly, lz] = capture.light;
    const ln = Math.hypot(lx, ly, lz) || 1;
    lx /= ln; ly /= ln; lz /= ln;
    const l2 = Math.hypot(lx, ly);
    // Toward the light, in the picture.
    const ux = l2 > 0.12 ? lx / l2 : -0.6, uy = l2 > 0.12 ? ly / l2 : -0.8;

    let lightCol = hex(lightSpec.colour);
    if (context.palette) lightCol = mixRGB(lightCol, hex(hexOf(rekeyOne(bytesOf(lightSpec.colour), context.palette, 'ink'))), 0.5);
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const warm = (mood.warmth - 0.5) * 0.7 + lowSun * 0.12;
    lightCol = warm > 0 ? mulRGB(lightCol, mixRGB([1, 1, 1], [1.05, 0.93, 0.74], warm)) : mulRGB(lightCol, mixRGB([1, 1, 1], [0.9, 0.98, 1.1], -warm));
    const lightMax = Math.max(...lightCol);
    lightCol = scaleRGB(lightCol, 1 / lightMax);
    const floorCol = hex(trad.floor);
    const deep = clamp01(a.contrast + (0.5 - mood.cheer) * 0.18);
    const edge = clamp01(mix(trad.edge[0], trad.edge[1], a.edge) + lightSpec.edge);

    // Form: the plain-lit pass, sharpened by the key light's angle to each normal.
    const form = new Float32Array(N);
    const sLit = new Float32Array(N);
    for (let p = 0; p < N; p++) {
      if (ids[p] === 0) { form[p] = 0.5; continue; }
      const s = clamp01((plain[p] - dim) / (bright - dim));
      sLit[p] = s;
      const ndl = clamp01(nX[p] * lx + nY[p] * ly + nZ[p] * lz);
      form[p] = clamp01(0.74 * s + 0.26 * ndl * smooth(0.05, 0.32, s));
    }
    // Otsu's threshold splits sun from shade for the hard-light tradition.
    let threshold = 0.42;
    if (hard) {
      const bins = new Float64Array(64);
      let total = 0;
      for (let p = 0; p < N; p++) if (ids[p] >= 1) { bins[Math.min(63, (form[p] * 64) | 0)]++; total++; }
      let sumAll = 0;
      for (let i = 0; i < 64; i++) sumAll += i * bins[i];
      let wB = 0, sumB = 0, best = -1;
      for (let i = 0; i < 64; i++) {
        wB += bins[i];
        if (!wB || wB === total) continue;
        sumB += i * bins[i];
        const mB = sumB / wB, mF = (sumAll - sumB) / (total - wB);
        const between = wB * (total - wB) * (mB - mF) ** 2;
        if (between > best) { best = between; threshold = (i + 0.5) / 64; }
      }
      threshold = Math.min(0.62, Math.max(0.2, threshold));
    }
    const softR = Math.round(mix(sfumato ? 9 : 6, 0, edge));
    const formSoft = softR >= 1 ? blur(form, S, softR) : form;
    const width = mix(0.55, 0.018, edge);
    const formH = new Float32Array(N);
    for (let p = 0; p < N; p++) formH[p] = smooth(threshold - width, threshold + width, formSoft[p]);
    await pause();

    // The pool: where the light gathers in the picture. Supporting things get a lesser pool.
    const poolX = heroX + ux * R * 0.1;
    const poolY = (lightSpec.low ? heroY + R * 0.1 : heroY - R * 0.12) + uy * R * 0.08;
    const poolR = Math.min(S * 0.55, R * mix(1.35, 0.68, deep) * lightSpec.pool * (sfumato ? 1.2 : 1));
    const pools: [number, number, number, number][] = [[poolX, poolY, poolR, 1]];
    for (let id = 3; id < 256; id++) {
      if (id === hero || count[id] < 200) continue;
      const r = Math.max(maxX[id] - minX[id], maxY[id] - minY[id]) * 0.85 * lightSpec.pool;
      pools.push([sumX[id] / count[id] + ux * r * 0.2, sumY[id] / count[id] - r * 0.1, Math.max(r, R * 0.3), 0.55]);
    }
    const poolAt = (x: number, y: number) => {
      let keep = 1;
      for (const [px, py, r, w] of pools) {
        const dx = (x - px) / r, dy = (y - py) / (r * 0.9);
        const d2 = dx * dx + dy * dy;
        keep *= 1 - w * Math.exp(-(chiaro ? Math.pow(d2, 1.6) : d2) * 1.3);
      }
      return 1 - keep;
    };
    // How far each pixel is from the nearest placed thing: the light stays close to the subject.
    const near = new Float32Array(N).fill(1e4);
    for (let p = 0; p < N; p++) if (ids[p] >= 3) near[p] = 0;
    for (let y = 1; y < S - 1; y++)
      for (let x = 1; x < S - 1; x++) {
        const p = y * S + x;
        near[p] = Math.min(near[p], near[p - 1] + 1, near[p - S] + 1, near[p - S - 1] + 1.414, near[p - S + 1] + 1.414);
      }
    for (let y = S - 2; y > 0; y--)
      for (let x = S - 2; x > 0; x--) {
        const p = y * S + x;
        near[p] = Math.min(near[p], near[p + 1] + 1, near[p + S] + 1, near[p + S + 1] + 1.414, near[p + S - 1] + 1.414);
      }
    const spread = R * 0.3 + S * 0.07;
    const awayDark = hard ? 1 : a.behind === 'darkness' || chiaro ? mix(0.62, 0.22, deep) : mix(0.9, 0.62, deep);

    // How far behind the subject a surface lies: the backdrop, and floor or set beyond the things.
    const far = new Float32Array(N);
    for (let p = 0; p < N; p++) {
      const id = ids[p];
      if (id === 0) far[p] = 1;
      else if (id <= 2) far[p] = smooth(tdHi - tdSpan * 0.1, tdHi + tdSpan * 0.7, dep[p]) * (id === 2 ? 0.7 : 1);
    }

    // ── 3. Hard light: blocks of sun on floor and wall ───────────────────────────────────────
    const ax = -ux, ay = -uy; // shadows run this way
    const bx = -ay, by = ax;
    const patchX = heroX + ax * R * 0.25, patchY = heroBase + ay * R * 0.2;
    const patchHalfW = Math.max(S * 0.07, Math.min(S * 0.16, R * mix(0.22, 0.36, rnd())));
    const patchLen = Math.max(S * 0.3, Math.min(S * 0.75, R * 1.1));
    const patchSkew = (rnd() - 0.5) * 0.6;
    const barW = Math.max(2.5, S * 0.009);
    const crossU = (rnd() - 0.3) * patchLen * 0.6;
    const inFloorPatch = (x: number, y: number) => {
      const u = (x - patchX) * ax + (y - patchY) * ay;
      const v = (x - patchX) * bx + (y - patchY) * by - u * patchSkew;
      if (Math.abs(v) > patchHalfW || u < -patchLen || u > patchLen * 0.8) return 0;
      if (Math.abs(v) < barW || Math.abs(u - crossU) < barW * 1.3) return 0;
      return 1;
    };
    const wallX0 = ux < 0 ? scx - R * 0.15 : scx - R * 1.4, wallX1 = wallX0 + R * 1.55;
    const wallSlope = Math.max(-0.5, Math.min(0.5, uy / (Math.abs(ux) + 0.3))) * Math.sign(-ux || 1);
    const wallTop = Math.max(S * 0.05, sy0 - R * 0.05), wallBottom = wallTop + R * mix(0.45, 0.7, rnd());
    const inWallPatch = (x: number, y: number) => {
      if (x < wallX0 || x > wallX1) return 0;
      const shift = (x - wallX0) * wallSlope;
      if (y < wallTop + shift || y > wallBottom + shift) return 0;
      if (Math.abs(x - (wallX0 + wallX1) / 2) < barW) return 0;
      return 1;
    };

    // ── 4. Local colour, matched to the palette ──────────────────────────────────────────────
    const pigments = pal.pigments.map(hex);
    const K = pigments.length;
    const pigLab = new Float32Array(K * 3);
    pigments.forEach((c, k) => oklab(c[0], c[1], c[2], pigLab, k * 3));
    const pigLum = pigments.map((c) => luma(c[0], c[1], c[2]));
    const PR = new Float32Array(N), PG = new Float32Array(N), PB = new Float32Array(N);
    const p1 = new Uint8Array(N), p2 = new Uint8Array(N);
    const pull = pal.pull * (hard ? 0.9 : 1);
    const lab = new Float32Array(3);
    const saturation = mix(0.82, 1.08, mood.cheer) * (1 - lightSpec.drain);
    const matchPigments = (p: number, r: number, g: number, b: number, amount: number) => {
      oklab(r, g, b, lab, 0);
      let d1 = 1e9, d2 = 1e9, i1 = 0, i2 = 0;
      for (let k = 0; k < K; k++) {
        const dl = (lab[0] - pigLab[k * 3]) * 0.55, da = lab[1] - pigLab[k * 3 + 1], db = lab[2] - pigLab[k * 3 + 2];
        const d = dl * dl + da * da + db * db;
        if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = k; } else if (d < d2) { d2 = d; i2 = k; }
      }
      p1[p] = i1;
      p2[p] = i2;
      const w = 0.5 * Math.sqrt(d1) / (Math.sqrt(d1) + Math.sqrt(d2) + 1e-6);
      const c1 = pigments[i1], c2 = pigments[i2];
      let rr = mix(r, mix(c1[0], c2[0], w), amount);
      let gg = mix(g, mix(c1[1], c2[1], w), amount);
      let bb = mix(b, mix(c1[2], c2[2], w), amount);
      // Keep most of the scene's own values: the palette changes hue, the light makes the tone.
      const la = luma(r, g, b), lp = luma(rr, gg, bb) || 1e-3;
      const k = mix(1, la / lp, 0.55);
      rr *= k; gg *= k; bb *= k;
      const l = luma(rr, gg, bb);
      rr = l + (rr - l) * saturation; gg = l + (gg - l) * saturation; bb = l + (bb - l) * saturation;
      PR[p] = clamp01(rr); PG[p] = clamp01(gg); PB[p] = clamp01(bb);
    };
    for (let p = 0; p < N; p++) {
      if (ids[p] === 0) continue;
      const o = p * 4;
      // Divide most of the render's own shading back out, so the painting's light can model it again.
      const inv = 1 / (0.45 + 0.55 * sLit[p]);
      let r = (color[o] / 255) * inv, g = (color[o + 1] / 255) * inv, b = (color[o + 2] / 255) * inv;
      const m = Math.max(r, g, b);
      if (m > 0.95) { const k = 0.95 / m; r *= k; g *= k; b *= k; }
      matchPigments(p, r, g, b, pull);
    }
    await pause();

    // ── 5. The backdrop, painted as the tradition would have it ─────────────────────────────
    const hills = pal.hills.map(hex);
    const skyCol = hex(pal.sky), hazeCol = hex(pal.haze), wallCol = hex(pal.wall);
    const horizon = Math.min(S * 0.72, Math.max(S * 0.28, groundTop - S * 0.02));
    const glowX = heroX - ux * R * 0.35, glowY = heroY - uy * R * 0.2;
    const glowAt = (x: number, y: number) => Math.exp(-((x - glowX) ** 2 + (y - glowY) ** 2) / (R * R * 1.3));
    const backdrop = (x: number, y: number): RGB => {
      const side = ((x - S / 2) * ux + (y - S / 2) * uy) / (S * 0.5);
      switch (a.behind) {
        case 'darkness': {
          const scrub = 0.75 + 0.5 * fbm(x / 170, y / 170, seed + 11);
          const base = hard ? mixRGB(floorCol, [0.08, 0.1, 0.12], 0.6) : floorCol;
          return mixRGB(scaleRGB(base, scrub * 0.9), mulRGB(lightCol, [0.36, 0.3, 0.22]), glowAt(x, y) * 0.45 * (1 - deep * 0.5));
        }
        case 'interior': {
          if (hard) {
            const lit = inWallPatch(x, y);
            const shade = mixRGB(scaleRGB(wallCol, 0.6), scaleRGB(floorCol, 1.6 * luma(...wallCol)), 0.45);
            return lit ? mulRGB(wallCol, scaleRGB(lightCol, 1.12)) : shade;
          }
          const light = mix(0.25, 0.75, smooth(-1, 1, side)) * mix(1, 0.55, deep) + glowAt(x, y) * 0.35;
          const plaster = 0.92 + 0.16 * fbm(x / 90, y / 90, seed + 13);
          return mixRGB(scaleRGB(floorCol, 1.4), mulRGB(scaleRGB(wallCol, plaster), lightCol), clamp01(light));
        }
        case 'distance': {
          const t = clamp01(y / Math.max(1, horizon));
          let c = mixRGB(skyCol, mixRGB(hazeCol, lightCol, 0.25), smooth(0.2, 1, t));
          for (let k = 0; k < 3; k++) {
            const scale = [260, 170, 120][k];
            const top = horizon - S * [0.2, 0.12, 0.055][k] * (0.35 + 0.9 * fbm(x / scale, k * 7.3, seed + 17 + k));
            if (y > top) c = mixRGB(hills[k], hazeCol, 0.3 - k * 0.1);
          }
          if (y > horizon) c = mixRGB(hills[2], scaleRGB(hazeCol, 0.8), smooth(horizon, S, y) * 0.3);
          return scaleRGB(c, mix(1, 0.6, chiaro ? deep : deep * 0.3));
        }
        default: {
          const t = clamp01(y / Math.max(1, horizon));
          let c = mixRGB(scaleRGB(skyCol, hard ? 1.05 : 0.95), mixRGB([0.95, 0.93, 0.86], lightCol, 0.35), smooth(0, 1, t));
          if (!hard) {
            const cloud = smooth(0.48, 0.72, fbm(x / 160, y / 70, seed + 19));
            const litSide = smooth(-0.6, 0.8, side);
            c = mixRGB(c, mixRGB(scaleRGB(skyCol, 0.7), mulRGB(lightCol, [0.98, 0.95, 0.88]), litSide), cloud * 0.85);
          }
          return scaleRGB(c, mix(1, 0.62, chiaro ? deep : 0));
        }
      }
    };

    // ── 6. The light map, and the picture multiplied by it ───────────────────────────────────
    const lift = clamp01(mix(0.4, 0.03, deep) + trad.lift + (a.light === 'north' ? 0.08 : 0));
    const amb = mixRGB(floorCol, scaleRGB(lightCol, 0.55), lift);
    const gain = chiaro ? 1.16 : 1.06;
    const hazeAmount = sfumato ? 0.6 : 0.42;
    const LmR = new Float32Array(N), LmG = new Float32Array(N), LmB = new Float32Array(N);
    const TR = new Float32Array(N), TG = new Float32Array(N), TB = new Float32Array(N);
    const lit = new Uint8Array(N);
    // Rembrandt's open air is still a golden dusk, never daylight white.
    const airDim = chiaro ? mix(0.8, 0.5, deep) : 1;
    const coolShade: RGB = mixRGB(floorCol, [0.36, 0.53, 0.47], 0.5);
    const sunCol = mixRGB([1, 0.97, 0.9], lightCol, 0.55);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        const id = ids[p];
        const fz = far[p];
        if (id === 0) {
          const c = backdrop(x, y);
          matchPigments(p, c[0], c[1], c[2], pull * 0.5);
          LmR[p] = LmG[p] = LmB[p] = 1;
          TR[p] = PR[p]; TG[p] = PG[p]; TB[p] = PB[p];
          if (hard) lit[p] = a.behind === 'interior' ? inWallPatch(x, y) : a.behind === 'sunlit' ? 1 : 0;
          continue;
        }
        let r: number, g: number, b: number;
        if (hard) {
          // Two paintings of the scene, a cool one in shade and a warm one in sun, cut together.
          // Things catch the sun on any face turned even a little toward it.
          let sun = id >= 2 ? smooth(threshold * 0.72 - width, threshold * 0.72 + width, formSoft[p]) : formH[p];
          if (id === 1 && a.behind !== 'sunlit') sun *= inFloorPatch(x, y);
          if (a.behind === 'darkness') sun *= 1 - fz;
          lit[p] = sun > 0.5 ? 1 : 0;
          const P0 = PR[p], P1 = PG[p], P2 = PB[p];
          const l = luma(P0, P1, P2);
          const shadeK = mix(0.72, 0.5, deep) * (a.behind === 'darkness' ? mix(1, 0.45, fz) : 1);
          const sr = mix(P0 * shadeK, coolShade[0] * l * 1.5, 0.42);
          const sg = mix(P1 * shadeK, coolShade[1] * l * 1.5, 0.42);
          const sb = mix(P2 * shadeK, coolShade[2] * l * 1.5, 0.42);
          const fall = 1 + 0.1 * (((x - S / 2) * ux + (y - S / 2) * uy) / S) + (formSoft[p] - threshold) * 0.25;
          const wr = (P0 * sunCol[0] * 1.05 + 0.035) * fall, wg = (P1 * sunCol[1] * 1.05 + 0.02) * fall, wb = P2 * sunCol[2] * 1.02 * fall;
          r = mix(sr, wr, sun); g = mix(sg, wg, sun); b = mix(sb, wb, sun);
          LmR[p] = r / Math.max(0.02, P0); LmG[p] = g / Math.max(0.02, P1); LmB[p] = b / Math.max(0.02, P2);
        } else {
          let pool = poolAt(x, y);
          pool = mix(1, pool, chiaro || a.behind === 'darkness' ? 1 : trad.pool);
          if (id < 3) pool *= mix(awayDark, 1, Math.exp(-((near[p] / spread) ** 2)));
          const amt = pool * (0.1 + 0.9 * formH[p]) * (id >= 3 ? 1.12 : 0.9);
          let mr = amb[0] + lightCol[0] * gain * amt;
          let mg = amb[1] + lightCol[1] * gain * amt;
          let mb = amb[2] + lightCol[2] * gain * amt;
          if (fz > 0) {
            let fr: number, fg: number, fb: number;
            switch (a.behind) {
              case 'darkness': {
                const glow = glowAt(x, y) * 0.22;
                fr = amb[0] * 0.5 + lightCol[0] * (amt * 0.3 + glow);
                fg = amb[1] * 0.5 + lightCol[1] * (amt * 0.3 + glow);
                fb = amb[2] * 0.5 + lightCol[2] * (amt * 0.3 + glow);
                break;
              }
              case 'interior':
                fr = amb[0] * 1.1 + lightCol[0] * (0.14 + amt * 0.6);
                fg = amb[1] * 1.1 + lightCol[1] * (0.14 + amt * 0.6);
                fb = amb[2] * 1.1 + lightCol[2] * (0.14 + amt * 0.6);
                break;
              case 'distance':
                fr = amb[0] + lightCol[0] * (0.38 + amt * 0.4);
                fg = amb[1] + lightCol[1] * (0.38 + amt * 0.4);
                fb = amb[2] + lightCol[2] * (0.38 + amt * 0.4);
                break;
              default:
                fr = amb[0] * 0.3 + lightCol[0] * (0.78 + 0.22 * formH[p]) * airDim;
                fg = amb[1] * 0.3 + lightCol[1] * (0.78 + 0.22 * formH[p]) * airDim;
                fb = amb[2] * 0.3 + lightCol[2] * (0.78 + 0.22 * formH[p]) * airDim;
            }
            mr = mix(mr, fr, fz); mg = mix(mg, fg, fz); mb = mix(mb, fb, fz);
          }
          LmR[p] = mr; LmG[p] = mg; LmB[p] = mb;
          r = PR[p] * mr; g = PG[p] * mg; b = PB[p] * mb;
        }
        if (a.behind === 'distance' && fz > 0) {
          const h = fz * hazeAmount;
          r = mix(r, hazeCol[0], h); g = mix(g, hazeCol[1], h); b = mix(b, hazeCol[2], h);
        }
        // Air between the eye and the far things, more of it in Leonardo.
        if (sfumato && id >= 2) {
          const air = smooth(tdLo, tdHi + tdSpan, dep[p]) * 0.18;
          r = mix(r, hazeCol[0], air); g = mix(g, hazeCol[1], air); b = mix(b, hazeCol[2], air);
        }
        TR[p] = r; TG[p] = g; TB[p] = b;
      }
    }
    // A shaft of light in the air, from the window toward the pool.
    const beam = !hard && a.behind !== 'sunlit' ? lightSpec.beam * (chiaro ? 0.2 : 0.12) * (0.4 + deep * 0.8) : 0;
    if (beam > 0)
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const t = (x - poolX) * ux + (y - poolY) * uy;
          if (t <= 0) continue;
          const across = Math.abs(-(x - poolX) * uy + (y - poolY) * ux);
          const w = R * 0.4 + t * 0.3;
          const b = Math.exp(-((across / w) ** 2)) * smooth(0, R * 0.6, t) * Math.exp(-t / (S * 0.9)) * beam;
          const p = y * S + x;
          TR[p] = 1 - (1 - TR[p]) * (1 - lightCol[0] * b);
          TG[p] = 1 - (1 - TG[p]) * (1 - lightCol[1] * b);
          TB[p] = 1 - (1 - TB[p]) * (1 - lightCol[2] * b);
        }
    await pause();

    // A painter's whites stop short of the light itself: a soft shoulder instead of a clip.
    const shoulder = (v: number) => (v < 0.72 ? v : 0.72 + 0.24 * (1 - Math.exp(-(v - 0.72) / 0.24)));
    for (let p = 0; p < N; p++) {
      let r = shoulder(TR[p]), g = shoulder(TG[p]), b = shoulder(TB[p]);
      const l = luma(r, g, b), w = smooth(0.7, 0.98, l) * 0.35;
      r = mix(r, l * 1.04, w); g = mix(g, l, w); b = mix(b, l * 0.9, w);
      TR[p] = r; TG[p] = g; TB[p] = b;
    }

    // Lost edges: a softened picture under a sharp one, more in Leonardo, a little in Rembrandt.
    if (trad.soften > 0) {
      const r = sfumato ? mix(2, 1.2, edge) : 1.3;
      const keep = sfumato ? 0.62 : 0.72;
      const bR = blur(TR, S, r), bG = blur(TG, S, r), bB = blur(TB, S, r);
      for (let p = 0; p < N; p++) {
        TR[p] = mix(bR[p], TR[p], keep); TG[p] = mix(bG[p], TG[p], keep); TB[p] = mix(bB[p], TB[p], keep);
      }
    }
    await pause();

    // ── 7. The paint: underpainting, then strokes ────────────────────────────────────────────
    const groundCol = hex(hard ? '#e9e1cf' : pal.ground);
    const cmp = new Float32Array(N).fill(1);
    if (unfinished)
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const p = y * S + x;
          const d = Math.hypot((x - scx) / (R * 0.8), (y - scy) / R);
          let c = 1 - smooth(0.5, 1.05, d + (fbm(x / 70, y / 70, seed + 23) - 0.5) * 0.6);
          if (ids[p] >= 3) c = Math.max(c, 0.8);
          cmp[p] = c;
        }
    const confidence = capture.confidence;
    const CR = blur(TR, S, 3), CG = blur(TG, S, 3), CB = blur(TB, S, 3);
    for (let p = 0; p < N; p++) {
      const doubt = confidence && ids[p] >= 3 ? 1 - (confidence[ids[p]] ?? 1) : 0;
      const bare = Math.max(1 - cmp[p], doubt * 0.35);
      if (bare <= 0) continue;
      const x = p % S, y = (p / S) | 0;
      const scrub = 0.82 + 0.3 * fbm(x / 40, y / 40, seed + 29);
      CR[p] = mix(CR[p], groundCol[0] * scrub, bare);
      CG[p] = mix(CG[p], groundCol[1] * scrub, bare);
      CB[p] = mix(CB[p], groundCol[2] * scrub, bare);
    }
    const SR = blur(TR, S, 2), SG = blur(TG, S, 2), SB = blur(TB, S, 2);
    const H = new Float32Array(N);
    const key = new Uint16Array(N);
    const cls = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      const id = ids[p];
      key[p] = id * 2 + (hard ? lit[p] : 0);
      cls[p] = id === 0 || far[p] > 0.6 ? 0 : id === 1 ? 1 : id === 2 ? 2 : 3;
    }
    const depB = blur(dep, S, 3, 1);
    const objAngle = new Float32Array(256);
    for (let id = 0; id < 256; id++) objAngle[id] = (hard ? Math.PI / 2 : -0.7) + (hash(id, 3, seed) - 0.5) * 0.8;
    const farAngle = hard ? Math.PI / 2 : -0.9 + (rnd() - 0.5) * 0.4;
    const jitter = mix(0.1, 0.42, mood.energy);
    const angleAt = (p: number, x: number, y: number, c: number) => {
      const id = ids[p];
      let angle: number;
      if (c === 0) {
        angle = hard ? (id === 0 ? Math.PI / 2 : 0) : farAngle + 1.1 * (vnoise(x * 0.005, y * 0.005, seed + 5) - 0.5) + (rnd() < 0.18 ? 0.7 : 0);
      } else if (id === 1) {
        // Floors are painted along their lines of equal depth, so the strokes lie down in perspective.
        const xl = Math.max(1, Math.min(S - 2, x)), yl = Math.max(1, Math.min(S - 2, y));
        const q = yl * S + xl;
        const gx = depB[q + 1] - depB[q - 1], gy = depB[q + S] - depB[q - S];
        angle = Math.hypot(gx, gy) > 1e-7 ? Math.atan2(gx, -gy) : 0;
      } else {
        // Things follow their form: strokes run across the slope of each surface.
        const fx = nX[p], fy = nY[p];
        angle = Math.hypot(fx, fy) > 0.22 ? Math.atan2(fx, -fy) : objAngle[id];
      }
      return angle + (rnd() - 0.5) * jitter;
    };

    const brushScale = mix(0.75, 1.35, handling) * sup.marks * (hard ? 1.25 : sfumato ? 0.9 : 1);
    const hold = mix(0.28, 0.82, handling) * (hard ? 0.55 : sfumato ? 0.75 : 1);
    const amp = mix(0.03, 0.14, handling) * trad.marks * sup.marks;
    const load = mix(0.12, 1.3, handling) * trad.load * sup.load;
    const vary = mix(0.3, 0.7, handling) * trad.vary;
    const jit = mix(0.07, 0.2, handling) * trad.marks;
    const alphaBase = mix(0.6, 0.95, handling);
    const dryness = mix(0.05, 0.45, handling) * (hard ? 0.3 : 1) * (1 + mood.wear * 0.3);
    const bo = new Float32Array(48), e0 = new Float32Array(48), e1 = new Float32Array(48);
    let strokeSalt = 0;
    const drawStroke = (cx: number, cy: number, angle: number, len: number, wid: number, alpha: number, holdK: number, ampK: number, thick: number, varK: number, tint: RGB | null, free = false, dryK = 1) => {
      const xi = Math.max(0, Math.min(S - 1, cx | 0)), yi = Math.max(0, Math.min(S - 1, cy | 0));
      const c = yi * S + xi;
      const k0 = key[c];
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const half = len / 2, hw = wid / 2;
      let r = SR[c], g = SG[c], b = SB[c];
      if (tint && free) {
        r = tint[0]; g = tint[1]; b = tint[2];
      } else if (tint) {
        r = mix(r * 1.08, tint[0], 0.22); g = mix(g * 1.08, tint[1], 0.22); b = mix(b * 1.06, tint[2], 0.22);
      } else if (varK > 0) {
        // Broken colour: a neighbouring pigment at the same value, laid beside the first.
        const alt = rnd() < 0.7 ? p2[c] : p1[c];
        const pa = pigments[alt];
        const target = luma(PR[c], PG[c], PB[c]);
        const k = Math.min(2.5, target / Math.max(0.03, pigLum[alt]));
        const v = varK;
        r += LmR[c] * (Math.min(1, pa[0] * k) - PR[c]) * v;
        g += LmG[c] * (Math.min(1, pa[1] * k) - PG[c]) * v;
        b += LmB[c] * (Math.min(1, pa[2] * k) - PB[c]) * v;
      }
      const value = 1 + (rnd() - 0.5) * (tint ? 0.05 : jit);
      r *= value; g *= value; b *= value;
      const nb = Math.max(2, Math.min(48, Math.round(wid / 1.3)));
      for (let k = 0; k < nb; k++) {
        bo[k] = rnd() * 2 - 1;
        e0[k] = rnd() * 0.3;
        e1[k] = rnd() * 0.35;
      }
      const bend = (rnd() - 0.5) * 0.3 * wid * (0.5 + mood.energy);
      const salt = ++strokeSalt + seed;
      const ext = half + hw + Math.abs(bend);
      const xa = Math.max(0, Math.floor(cx - ext)), xb = Math.min(S - 1, Math.ceil(cx + ext));
      const ya = Math.max(0, Math.floor(cy - ext)), yb = Math.min(S - 1, Math.ceil(cy + ext));
      const lum = luma(r, g, b);
      const thickness = thick * (0.12 + 0.88 * Math.pow(clamp01(lum), 1.6));
      for (let py = ya; py <= yb; py++) {
        const ry = py + 0.5 - cy;
        for (let px = xa; px <= xb; px++) {
          const rx = px + 0.5 - cx;
          const along = rx * dx + ry * dy;
          if (along > half || along < -half) continue;
          const t = along / half;
          const across = -rx * dy + ry * dx - bend * (1 - t * t);
          if (across > hw || across < -hw) continue;
          const q = py * S + px;
          if (!free && key[q] !== k0) continue;
          const u = across / hw;
          const kk = Math.min(nb - 1, ((u * 0.5 + 0.5) * nb) | 0);
          if (t < -1 + e0[kk] || t > 1 - e1[kk]) continue;
          // A dry brush breaks up toward the end of the stroke.
          if (dryness > 0 && hash(kk, ((along + half) / 3) | 0, salt) < dryness * dryK * smooth(-0.3, 1, t)) continue;
          const au = Math.abs(u);
          const a0 = alpha * (1 - smooth(0.72, 1, au)) * smooth(-1 + e0[kk], -1 + e0[kk] + 0.35, t);
          if (a0 <= 0.003) continue;
          const mod = 1 + bo[kk] * ampK;
          const baseR = free ? CR[q] : TR[q], baseG = free ? CG[q] : TG[q], baseB = free ? CB[q] : TB[q];
          const cr = (baseR + (r - baseR) * holdK) * mod;
          const cg = (baseG + (g - baseG) * holdK) * mod;
          const cb = (baseB + (b - baseB) * holdK) * mod;
          CR[q] += (cr - CR[q]) * a0;
          CG[q] += (cg - CG[q]) * a0;
          CB[q] += (cb - CB[q]) * a0;
          if (thickness > 0) {
            const ridge = (0.84 + 0.16 * bo[kk]) * (1 + 0.5 * smooth(0.6, 1, au)) * (1 + 0.6 * smooth(0.4, 1, t));
            H[q] += (thickness * ridge - H[q]) * a0 * 0.85;
          }
        }
      }
    };
    const shuffle = (list: number[]) => {
      for (let i = list.length - 1; i > 0; i--) {
        const j = (rnd() * (i + 1)) | 0;
        const t = list[i];
        list[i] = list[j];
        list[j] = t;
      }
    };
    const paintClass = async (c: number, onlyId: number, wid: number, len: number, bounds: [number, number, number, number], alphaK = 1, thickK = 1) => {
      const cell = Math.max(1.6, wid * 0.72);
      const spots: number[] = [];
      for (let gy = bounds[1]; gy < bounds[3]; gy += cell)
        for (let gx = bounds[0]; gx < bounds[2]; gx += cell) {
          const x = gx + rnd() * cell, y = gy + rnd() * cell;
          const xi = x | 0, yi = y | 0;
          if (xi < 0 || yi < 0 || xi >= S || yi >= S) continue;
          const p = yi * S + xi;
          if (cls[p] !== c || (onlyId >= 0 && ids[p] !== onlyId)) continue;
          // Where the painter stopped, the paint ends in a ragged band of whole strokes.
          if (unfinished && cmp[p] + (vnoise(x / 26, y / 26, seed + 37) - 0.5) * 0.5 < 0.45) continue;
          spots.push(x, y);
        }
      const order = Array.from({ length: spots.length / 2 }, (_, i) => i);
      shuffle(order);
      let n = 0;
      for (const i of order) {
        const x = spots[i * 2], y = spots[i * 2 + 1];
        const p = (y | 0) * S + (x | 0);
        const l = len * (c === 0 ? 0.5 + rnd() * 1.0 : 0.7 + rnd() * 0.6);
        const w = wid * (c === 0 ? 0.6 + rnd() * 0.8 : 0.8 + rnd() * 0.4);
        const doubt = confidence && ids[p] >= 3 ? 1 - (confidence[ids[p]] ?? 1) : 0;
        const alpha = alphaBase * alphaK * mix(0.6, 1, cmp[p]) * (1 - doubt * 0.4);
        drawStroke(x, y, angleAt(p, x | 0, y | 0, c), l, w, alpha, hold, amp, load * thickK, c === 0 ? vary * 0.55 : vary, null);
        if (++n % 1500 === 0) await pause();
      }
    };
    const whole: [number, number, number, number] = [0, 0, S, S];
    // Unfinished: a thin brown lay-in scrubbed across the bare ground first.
    if (unfinished) {
      const umber = scaleRGB(groundCol, 0.62);
      for (let gy = 0; gy < S; gy += 16)
        for (let gx = 0; gx < S; gx += 16) {
          const x = gx + rnd() * 16, y = gy + rnd() * 16;
          const p = (y | 0) * S + (x | 0);
          if (p >= N || cmp[p] > 0.85 || rnd() < 0.35) continue;
          drawStroke(x, y, -0.8 + (rnd() - 0.5) * 0.9, 50 + rnd() * 40, 14 + rnd() * 10, 0.22 * (1 - cmp[p]), 1, 0.08, 0, 0, umber, true);
        }
    }
    const stretch = hard ? 1.6 : 1;
    // Behind: big scrubbed strokes. Darks are thin: little paint height there.
    await paintClass(0, -1, 16 * brushScale, 16 * brushScale * 3.2 * stretch, whole, chiaro ? 0.75 : 0.9, 0.35);
    await paintClass(1, -1, 9 * brushScale, 9 * brushScale * 3.2 * stretch, whole, 1, 0.7);
    if (count[2] > 0) await paintClass(2, -1, 6.5 * brushScale, 6.5 * brushScale * 2.8, [minX[2], minY[2], maxX[2] + 1, maxY[2] + 1], 1, 0.8);
    for (let id = 3; id < 256; id++) {
      if (count[id] < 8) continue;
      const w = Math.max(2.2, Math.min(7, Math.sqrt(count[id]) / 20)) * brushScale;
      await paintClass(3, id, w, w * mix(2, 3.4, handling) * (1 + mood.energy * 0.3), [minX[id], minY[id], maxX[id] + 1, maxY[id] + 1]);
    }
    await pause();

    // Impasto: the brightest lights loaded with lead white, standing up off the canvas.
    const impasto = (hard ? 0.15 : sfumato ? 0.3 : 1) * smooth(0.25, 0.8, handling) * sup.load;
    if (impasto > 0.02) {
      const lums = new Float32Array(N);
      let lit2 = 0;
      const hist = new Uint32Array(256);
      for (let p = 0; p < N; p++) {
        if (ids[p] < 1 || cls[p] === 0) continue;
        const l = luma(TR[p], TG[p], TB[p]);
        lums[p] = l;
        hist[Math.min(255, (l * 255) | 0)]++;
        lit2++;
      }
      let seen = 0, cut = 1;
      for (let v = 255; v >= 0; v--) {
        seen += hist[v];
        if (seen >= lit2 * 0.05) { cut = v / 255; break; }
      }
      const white: RGB = mixRGB([0.96, 0.93, 0.86], lightCol, 0.35);
      const spots: number[] = [];
      const cell = 8;
      for (let gy = 0; gy < S; gy += cell)
        for (let gx = 0; gx < S; gx += cell) {
          const x = gx + rnd() * cell, y = gy + rnd() * cell;
          const p = (y | 0) * S + (x | 0);
          if (p >= N || lums[p] < cut || rnd() > impasto * 0.8) continue;
          spots.push(x, y);
        }
      for (let i = 0; i < spots.length; i += 2) {
        const x = spots[i], y = spots[i + 1];
        const p = (y | 0) * S + (x | 0);
        const w = (ids[p] >= 3 ? 3.2 : 5) * brushScale * (0.8 + rnd() * 0.5);
        drawStroke(x, y, angleAt(p, x | 0, y | 0, cls[p]), w * (2.6 + rnd() * 1.8), w, 0.85, 0.8, 0.1, (load * 1.8 + 0.3) * impasto, 0, white, false, 0.3);
      }
    }
    await pause();

    // Unfinished: the brown underdrawing still shows wherever the paint did not arrive.
    if (unfinished) {
      const ink: RGB = hex('#3b2416');
      for (let y = 1; y < S - 1; y++)
        for (let x = 1; x < S - 1; x++) {
          const p = y * S + x;
          if (cmp[p] > 0.92) continue;
          let e = 0;
          if (ids[p] !== ids[p + 1] || ids[p] !== ids[p + S]) e = 1;
          else if (ids[p] >= 1) {
            const dot = nX[p] * nX[p + 1] + nY[p] * nY[p + 1] + nZ[p] * nZ[p + 1];
            const dot2 = nX[p] * nX[p + S] + nY[p] * nY[p + S] + nZ[p] * nZ[p + S];
            if (Math.min(dot, dot2) < 0.8) e = 0.7;
          }
          if (!e) continue;
          const a0 = e * 0.75 * (1 - cmp[p]) * (0.6 + 0.4 * vnoise(x / 9, y / 9, seed + 31));
          CR[p] = mix(CR[p], ink[0], a0); CG[p] = mix(CG[p], ink[1], a0); CB[p] = mix(CB[p], ink[2], a0);
        }
    }

    // Sfumato: the whole painting softly blurred under a sharper copy, smokier at the edges.
    if (sfumato) {
      const bR = blur(CR, S, 1.6), bG = blur(CG, S, 1.6), bB = blur(CB, S, 1.6);
      for (let p = 0; p < N; p++) {
        CR[p] = mix(bR[p], CR[p], 0.82); CG[p] = mix(bG[p], CG[p], 0.82); CB[p] = mix(bB[p], CB[p], 0.82);
      }
    }
    await pause();

    // ── 8. The canvas: paint height, weave and cracks, lit by the gallery ────────────────────
    // A panel painting in Leonardo's manner is glazed flat: what height there is, is soft.
    const Hp = sfumato ? blur(H, S, 1.5) : H;
    const Hs = new Float32Array(N);
    const crackAmt = cond.cracks * (0.6 + mood.wear * 0.7);
    const crack = new Float32Array(N);
    const cellSize = sup.crack * (0.85 + mood.wear * 0.4);
    const grime = cond.grime * (0.7 + mood.wear * 0.5);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        let h = Hp[p] * 1.6;
        if (sup.weave > 0) {
          const u = x / sup.weave, v = y / sup.weave;
          const i = Math.floor(u), j = Math.floor(v);
          const fu = u - i, fv = v - j;
          const slub = 0.75 + 0.5 * vnoise(x / 3, y / 37, seed + 41);
          const slub2 = 0.75 + 0.5 * vnoise(x / 37, y / 3, seed + 43);
          const warpTop = ((i + j) & 1) === 0;
          const w = warpTop ? Math.sin(Math.PI * fu) * (0.55 + 0.45 * Math.sin(Math.PI * fv)) * slub : Math.sin(Math.PI * fv) * (0.55 + 0.45 * Math.sin(Math.PI * fu)) * slub2;
          h += w * sup.weaveAmp * (1 - smooth(0, 1.3, H[p]));
        }
        if (crackAmt > 0.02) {
          const wx = x + (vnoise(x / 23, y / 23, seed + 47) - 0.5) * 5;
          const wy = y + (vnoise(x / 23, y / 23, seed + 53) - 0.5) * 5;
          const X = wx / (cellSize * sup.stretch), Y = wy / cellSize;
          const ci = Math.floor(X), cj = Math.floor(Y);
          let f1 = 1e9, f2 = 1e9;
          for (let oj = -1; oj <= 1; oj++)
            for (let oi = -1; oi <= 1; oi++) {
              const gi = ci + oi, gj = cj + oj;
              const fx = (gi + hash(gi, gj, seed + 59) - X) * sup.stretch, fy = gj + hash(gi, gj, seed + 61) - Y;
              const d = fx * fx + fy * fy;
              if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
            }
          const e = (Math.sqrt(f2) - Math.sqrt(f1)) * cellSize;
          const patch = 0.15 + 0.85 * smooth(0.36, 0.64, fbm(x / 110, y / 110, seed + 71));
          const line = (1 - smooth(0.25, 1.1, e)) * patch * crackAmt;
          crack[p] = line;
          // Each island of paint cups a little, which the raking light picks out.
          h += smooth(0, cellSize * 0.5, e) * 0.12 * crackAmt * patch - line * 0.25;
        }
        Hs[p] = h;
      }
    await pause();

    const gloss = cond.gloss * (hard ? 0.4 : 1);
    const reliefK = 0.45;
    const varnish = cond.varnish * (0.75 + mood.wear * 0.5);
    const amber: RGB = [0.8, 0.56, 0.24];
    const softLight = (base: number, blend: number) =>
      blend < 0.5 ? base - (1 - 2 * blend) * base * (1 - base) : base + (2 * blend - 1) * (Math.sqrt(base) - base);
    const vignette = trad.vignette * 0.55 + grime * 0.25;
    const out = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        let r = CR[p], g = CG[p], b = CB[p];
        // Hopper's walls: a faint vertical drag of the brush, barely there.
        if (hard) {
          const drag = (fbm(x * 0.06, y * 0.006, seed + 73) - 0.5) * 0.06;
          r *= 1 + drag; g *= 1 + drag; b *= 1 + drag;
        }
        // Relief: the gallery light rakes in from the upper left.
        const xl = Math.max(1, Math.min(S - 2, x)), yl = Math.max(1, Math.min(S - 2, y));
        const q = yl * S + xl;
        const gx = Hs[q + 1] - Hs[q - 1], gy = Hs[q + S] - Hs[q - S];
        const slope = 0.53 * gx + 0.62 * gy;
        const shade = 1 + slope * reliefK;
        r *= shade; g *= shade; b *= shade;
        const glint = Math.max(0, slope * reliefK - 0.12);
        const spec = glint * glint * 2.2 * gloss;
        r += spec; g += spec * 0.97; b += spec * 0.9;
        // Cracks hold dirt; the lifted lip of each catches a little light.
        if (crackAmt > 0.02) {
          const c = crack[p];
          const lip = x > 0 && y > 0 ? crack[p - S - 1] : 0;
          const dark = 1 - c * (0.3 + grime * 0.25);
          r = r * dark + lip * 0.03 * (1 - c); g = g * dark + lip * 0.028 * (1 - c); b = b * dark + lip * 0.024 * (1 - c);
        }
        // Varnish: amber soft light, then the blues sink toward green.
        if (varnish > 0) {
          r = mix(r, softLight(clamp01(r), amber[0]), varnish * 0.45);
          g = mix(g, softLight(clamp01(g), amber[1]), varnish * 0.45);
          b = mix(b, softLight(clamp01(b), amber[2]), varnish * 0.45);
          r *= mix(1, 0.9, varnish); g *= mix(1, 0.8, varnish); b *= mix(1, 0.56, varnish);
        }
        if (grime > 0) {
          const soot = 1 - grime * 0.22 * (0.7 + 0.6 * fbm(x / 120, y / 120, seed + 79));
          r *= soot; g *= soot * 0.98; b *= soot * 0.94;
        }
        const rr = Math.hypot(x - S / 2, y - S / 2) / (S * 0.7071);
        const v = 1 - vignette * Math.pow(smooth(0.42, 1.08, rr), 1.2);
        r *= Math.pow(v, 0.9); g *= v; b *= v * v;
        const grain = 1 + (hash(x, y, seed + 83) - 0.5) * 0.035;
        const o = p * 4;
        out[o] = clamp01(r * grain) * 255;
        out[o + 1] = clamp01(g * grain) * 255;
        out[o + 2] = clamp01(b * grain) * 255;
        out[o + 3] = 255;
      }

    const handNames = ['glazed smooth', 'fine and fused', 'visible strokes', 'loose and broad', 'loaded impasto'];
    return {
      pixels: out,
      notes: [
        `${trad.name}, ${a.light} light`,
        `${a.palette} palette, ${handNames[Math.min(4, Math.round(handling * 4))]} on ${a.support}`,
        `behind the subject: ${a.behind}`,
        `${a.condition === 'fresh' ? 'fresh from the studio' : a.condition === 'unfinished' ? 'left unfinished' : `${a.condition} condition`}`,
      ],
    };
  },
});
