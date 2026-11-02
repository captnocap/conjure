import { type Palette, type PaletteRole, choice, clamp01, defineLook, fromOklch, mix, oklch, paintRGB, rekey, score, seeded } from '@conjure/kit';

type RGB = readonly [number, number, number];

const smooth = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

/** Separable box blur, in place, on one channel of `stride`-interleaved floats. */
function boxBlur(data: Float32Array, size: number, radius: number, stride = 1, channel = 0, passes = 1) {
  if (radius < 1) return;
  const line = new Float32Array(size);
  const span = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let axis = 0; axis < 2; axis++) {
      const step = (axis === 0 ? 1 : size) * stride;
      const other = (axis === 0 ? size : 1) * stride;
      for (let row = 0; row < size; row++) {
        const base = row * other + channel;
        for (let k = 0; k < size; k++) line[k] = data[base + k * step];
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += line[Math.min(size - 1, Math.max(0, k))];
        for (let k = 0; k < size; k++) {
          data[base + k * step] = sum / span;
          sum += line[Math.min(size - 1, k + radius + 1)] - line[Math.max(0, k - radius)];
        }
      }
    }
  }
}

/**
 * Edge-stopping smoothing of `channels`-interleaved floats: a recursive filter run along rows and
 * columns whose feedback is cut where `cutH` (between a pixel and its right neighbour) or `cutV`
 * (and the one below) mark a boundary, so colour spreads within a form but never across its edge.
 */
function edgeSmooth(data: Float32Array, channels: number, size: number, sigma: number, cutH: Float32Array, cutV: Float32Array, iterations = 2) {
  if (sigma < 0.5) return;
  for (let it = 0; it < iterations; it++) {
    const s = (sigma * Math.sqrt(3) * Math.pow(2, iterations - it - 1)) / Math.sqrt(Math.pow(4, iterations) - 1);
    const a = Math.exp(-Math.SQRT2 / s);
    for (let c = 0; c < channels; c++) {
      for (let y = 0; y < size; y++) {
        const row = y * size;
        for (let x = 1; x < size; x++) {
          const i = row + x;
          const k = i * channels + c;
          data[k] += a * (1 - cutH[i - 1]) * (data[k - channels] - data[k]);
        }
        for (let x = size - 2; x >= 0; x--) {
          const i = row + x;
          const k = i * channels + c;
          data[k] += a * (1 - cutH[i]) * (data[k + channels] - data[k]);
        }
      }
      const down = size * channels;
      for (let x = 0; x < size; x++) {
        for (let y = 1; y < size; y++) {
          const i = y * size + x;
          const k = i * channels + c;
          data[k] += a * (1 - cutV[i - size]) * (data[k - down] - data[k]);
        }
        for (let y = size - 2; y >= 0; y--) {
          const i = y * size + x;
          const k = i * channels + c;
          data[k] += a * (1 - cutV[i]) * (data[k + down] - data[k]);
        }
      }
    }
  }
}

/** Chamfer (3-4) distance in pixels from every pixel to the nearest one set in `mask`. */
function distanceTo(mask: Uint8Array, size: number) {
  const d = new Float32Array(size * size);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : 1e6;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let v = d[i];
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - size] + 3);
        if (x > 0) v = Math.min(v, d[i - size - 1] + 4);
        if (x < size - 1) v = Math.min(v, d[i - size + 1] + 4);
      }
      d[i] = v;
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      let v = d[i];
      if (v === 0) continue;
      if (x < size - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < size - 1) {
        v = Math.min(v, d[i + size] + 3);
        if (x < size - 1) v = Math.min(v, d[i + size + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + size - 1] + 4);
      }
      d[i] = v;
    }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

function hsl(h: number, s: number, l: number): RGB {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}
const rgb = (r: number, g: number, b: number): RGB => [r / 255, g / 255, b / 255];

const PAPERS = {
  blackboard: {
    say: 'A classroom blackboard: dull near-black slate, hazy with old eraser dust. Everything is drawn in light.',
    tone: rgb(36, 47, 43),
    grain: 'board',
  },
  black: {
    say: 'Near-black pastel paper: velvety and deep, so colours glow like stage lights in the dark.',
    tone: rgb(27, 26, 30),
    grain: 'pebble',
  },
  kraft: {
    say: 'Kraft or sugar paper in a middle tone: humble and fibrous. Lights and darks both show against it.',
    tone: rgb(178, 143, 104),
    grain: 'fibre',
  },
  grey: {
    say: 'Muted mid-tone Mi-Teintes paper with a honeycomb tooth: quiet, studious, the life-drawing room.',
    tone: rgb(134, 138, 144),
    grain: 'pebble',
  },
  terracotta: {
    say: 'Strongly coloured mid-tone sanded paper: a ground glowing between the strokes, gritty and earthy.',
    tone: rgb(170, 98, 72),
    grain: 'sand',
  },
  indigo: {
    say: 'Deep dark coloured paper: dusk, night air, shadow under every colour.',
    tone: rgb(46, 58, 98),
    grain: 'pebble',
  },
  cream: {
    say: 'Pale laid paper with faint ribbed lines: airy, antique. Mostly darks and soft tints show.',
    tone: rgb(228, 216, 192),
    grain: 'laid',
  },
} as const;

const PALETTES = {
  box: 'A full box of soft pastels: every colour available, true to the scene but milky and opaque.',
  chalkCharcoal: 'White chalk and black charcoal only: a tonal study, no colour but the paper.',
  troisCrayons: 'Trois crayons: sanguine red, black and white, like an old master figure study.',
  schoolroom: 'Schoolroom and pavement chalks: dusty white and a spread of soft, bright, sunny colours. Childlike, cheerful.',
  earth: 'Earth sticks: muted, dusty, low-key colours from light to deep, with a cream. Autumnal, rustic, quiet.',
  fauve: 'Fierce jewel colours pushed past nature: violet shadows, orange lights, emerald and magenta.',
  nocturne: 'Deep sticks in one close cool harmony with one pale glowing accent: moonlit, hushed, melancholy.',
} as const;

const STICKS: Record<Exclude<keyof typeof PALETTES, 'box' | 'fauve'>, RGB[]> = {
  chalkCharcoal: [rgb(246, 244, 236), rgb(28, 26, 27), rgb(120, 118, 116)],
  troisCrayons: [rgb(244, 240, 228), rgb(30, 26, 26), rgb(178, 78, 52), rgb(112, 50, 36), rgb(216, 150, 118)],
  schoolroom: [
    rgb(246, 245, 238), rgb(250, 228, 120), rgb(244, 160, 180), rgb(138, 196, 236),
    rgb(150, 214, 170), rgb(246, 170, 98), rgb(190, 160, 222), rgb(226, 92, 96),
  ],
  earth: [
    rgb(240, 228, 200), rgb(212, 164, 84), rgb(176, 96, 52), rgb(112, 62, 40), rgb(60, 44, 36),
    rgb(126, 128, 78), rgb(104, 126, 140), rgb(188, 140, 110), rgb(70, 82, 60), rgb(150, 150, 140),
  ],
  nocturne: [
    rgb(236, 238, 246), rgb(60, 84, 160), rgb(34, 44, 96), rgb(110, 96, 176), rgb(60, 140, 150),
    rgb(150, 180, 220), rgb(250, 226, 150), rgb(22, 22, 40), rgb(170, 130, 190), rgb(232, 150, 96),
  ],
};

/**
 * Under the idea's palette the paper takes its ground (keeping its depth: a dark sheet stays dark)
 * and the designed boxes take its colours, each stick keeping its value and half its hue step from
 * the rest: the schoolroom's warm chalks and the earth box's warm earths the ink, their cool ones the
 * second colour; the nocturne's blues the ink and its candle-light the second. White, black and grey
 * sticks stay. The full box and fauve follow the scene; chalk and charcoal and trois crayons are
 * fixed traditions.
 */
const STICK_ROLES: Partial<Record<keyof typeof STICKS, Record<string, PaletteRole>>> = {
  schoolroom: { 1: 'ink', 2: 'ink', 5: 'ink', 7: 'ink', 3: 'second', 4: 'second', 6: 'second' },
  earth: { 1: 'ink', 2: 'ink', 3: 'ink', 4: 'ink', 7: 'ink', 5: 'second', 6: 'second', 8: 'second' },
  nocturne: { 1: 'ink', 2: 'ink', 3: 'ink', 4: 'ink', 5: 'ink', 8: 'ink', 6: 'second', 9: 'second' },
};
/** How much of each stick's hue step from its group survives, so a box stays near the palette's colours. */
const STICK_SPREAD = 0.5;
const keyed = (colours: readonly RGB[], palette: Palette | undefined, roles: Record<string, PaletteRole>, spread = 1): RGB[] => {
  if (!palette) return [...colours];
  const out = rekey(Object.fromEntries(colours.map((c, i) => [i, [c[0] * 255, c[1] * 255, c[2] * 255] as const])), palette, roles);
  return colours.map((_, i) => {
    let c = out[i];
    const role = roles[i];
    if (role && spread < 1) {
      const [L, C, h] = oklch(c), target = oklch(paintRGB(palette[role]))[2];
      c = fromOklch(L, C, target + Math.atan2(Math.sin(h - target), Math.cos(h - target)) * spread);
    }
    return [c[0] / 255, c[1] / 255, c[2] / 255] as const;
  });
};

const MARKS = {
  sweep: {
    say: 'Broad strokes with the side of the stick, wrapping around each form like a hand stroking it.',
    form: 1, cross: false, len: [28, 78], width: [7, 13], jitter: 0.14, curl: 0, vertical: false,
  },
  hatch: {
    say: 'Fast slanted hatching with the tip: parallel lines all leaning one way, airy and nervous.',
    form: 0.12, cross: false, len: [18, 44], width: [2.4, 4.2], jitter: 0.1, curl: 0, vertical: false,
  },
  striate: {
    say: 'Long upright striations, colour laid beside colour in vertical streaks, like Degas.',
    form: 0.22, cross: false, len: [40, 110], width: [3, 6], jitter: 0.05, curl: 0, vertical: true,
  },
  scumble: {
    say: 'Loose looping scumbles: curling, cloudy, restless marks that never quite close.',
    form: 0.45, cross: false, len: [30, 64], width: [6, 11], jitter: 0.9, curl: 0.11, vertical: false,
  },
  dab: {
    say: 'Short stubby dabs set across the form like tiles or petals: blunt, rhythmic, mosaic.',
    form: 1, cross: true, len: [6, 14], width: [8, 14], jitter: 0.28, curl: 0, vertical: false,
  },
} as const;

const OUTLINES = {
  none: 'No line at all: edges are only where one colour meets another.',
  charcoal: 'A dark charcoal contour, breaking and returning, holding the forms together.',
  chalk: 'A bright white chalk line, like a diagram or a teacher’s drawing on the board.',
  local: 'A coloured line in a deeper or brighter shade of each object’s own colour.',
} as const;

const EXTENTS = {
  subject: 'Only the subject is drawn; the rest of the sheet is left bare.',
  halo: 'The subject sits in a cloud of colour that fades out to bare sheet toward the edges.',
  full: 'Worked edge to edge: the whole sheet is covered.',
} as const;

const STATES = {
  fresh: 'Just finished, crisp and untouched.',
  dusty: 'Dust is falling from it: faint coloured trails drift down the sheet under the heavy passages.',
  erased: 'Someone has dragged an eraser or a sleeve through it, leaving broad ghostly swipes.',
  swatches: 'A working study: the sticks were tried out in a column of test scribbles down the margin.',
  taped: 'It was taped to a board: a clean bare border, with scraps of masking tape still at the corners.',
} as const;

export default defineLook({
  questions: {
    paper: choice('What is it drawn on? Its colour comes from the picture\u2019s palette.', Object.fromEntries(Object.entries(PAPERS).map(([k, v]) => [k, v.say])) as Record<keyof typeof PAPERS, string>),
    palette: choice('Which sticks are in the box? Designed boxes take their colours from the picture\u2019s palette.', PALETTES),
    mark: choice('How does the hand move?', Object.fromEntries(Object.entries(MARKS).map(([k, v]) => [k, v.say])) as Record<keyof typeof MARKS, string>),
    weight: score('How heavily is the chalk laid on?', [
      'A whisper: mostly bare sheet',
      'Light and open',
      'Moderate',
      'Rich',
      'Thick and loaded, the tooth filled',
    ]),
    smudge: score('How much is it blended with the fingers?', [
      'Not at all: every stroke raw',
      'Shadows softened',
      'Half rubbed in',
      'Velvety, smoky, almost all blended',
    ]),
    tooth: score('How rough is the surface?', ['Smooth', 'Fine tooth', 'Coarse', 'Very rough, breaking every stroke']),
    highlights: score('How many bright raw highlights are struck on last?', ['None', 'A few', 'Plenty', 'Sparkling everywhere']),
    outline: choice('Is there a drawn line around things?', OUTLINES),
    extent: choice('How much of the sheet is worked?', EXTENTS),
    state: choice('What has happened to the drawing since?', STATES),
  },

  async apply(capture, answers, context, signal) {
    const { size, identity, mood } = { ...capture, mood: context.mood };
    const N = size * size;
    const random = seeded((context.seed ^ 0x51c4a1) >>> 0);
    const paper = PAPERS[answers.paper];
    const mark = MARKS[answers.mark];
    const P = keyed([paper.tone], context.palette, { 0: 'ground' })[0];
    /** The paper as designed: sticks are chosen against it, so each passage takes the stick it always did. */
    const PM = paper.tone;
    const paperLum = 0.3 * P[0] + 0.59 * P[1] + 0.11 * P[2];
    const dark = paperLum < 0.3;
    let beats = 0;
    const breathe = async () => {
      if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
      if (++beats % 24 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    };

    // ---- the surface: a height field the chalk catches on --------------------------------
    const tooth = new Float32Array(N);
    // the grain is a little coarser than a pixel, so it reads as paper rather than noise
    for (let i = 0; i < N; i++) tooth[i] = random();
    boxBlur(tooth, size, 1, 1, 0, answers.tooth > 0.6 ? 2 : 1);
    const coarse = new Float32Array(N);
    for (let i = 0; i < N; i++) coarse[i] = random();
    if (paper.grain === 'fibre') {
      // long horizontal fibres
      const line = new Float32Array(N);
      for (let i = 0; i < N; i++) line[i] = coarse[i];
      for (let y = 0; y < size; y++) {
        let run = 0.5;
        for (let x = 0; x < size; x++) {
          run = run * 0.86 + line[y * size + x] * 0.14;
          coarse[y * size + x] = run;
        }
      }
      boxBlur(coarse, size, 1);
    } else if (paper.grain === 'laid') {
      boxBlur(coarse, size, 2);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
          coarse[y * size + x] += 0.035 * Math.sin(y * 1.35) + (x % 96 < 2 ? -0.03 : 0);
    } else if (paper.grain === 'pebble') {
      boxBlur(coarse, size, 1, 1, 0, 2);
    } else if (paper.grain === 'sand') {
      boxBlur(coarse, size, 1);
    } else {
      // board: nearly smooth, with long scratches from old erasing
      for (let y = 0; y < size; y++) {
        let run = 0.5;
        for (let x = 0; x < size; x++) {
          const i = ((y + ((x * 0.18) | 0)) % size) * size + x;
          run = run * 0.93 + coarse[i] * 0.07;
          coarse[i] = run;
        }
      }
    }
    const normalise = (field: Float32Array) => {
      let sum = 0;
      let sq = 0;
      for (let i = 0; i < N; i++) {
        sum += field[i];
        sq += field[i] * field[i];
      }
      const mean = sum / N;
      const dev = Math.sqrt(Math.max(1e-9, sq / N - mean * mean));
      for (let i = 0; i < N; i++) field[i] = (field[i] - mean) / dev;
    };
    normalise(tooth);
    normalise(coarse);
    const coarseMix = paper.grain === 'board' ? 0.45 : mix(0.55, 1.1, answers.tooth);
    for (let i = 0; i < N; i++) {
      const z = (tooth[i] * 0.8 + coarse[i] * coarseMix) / Math.sqrt(0.64 + coarseMix * coarseMix);
      tooth[i] = 1 / (1 + Math.exp(-1.7 * z)); // about uniform in 0..1
    }
    // slow mottling for uneven pressure and board haze
    const cloud = new Float32Array(N);
    for (let i = 0; i < N; i++) cloud[i] = random();
    boxBlur(cloud, size, 36, 1, 0, 2);
    normalise(cloud);
    for (let i = 0; i < N; i++) cloud[i] = clamp01(0.5 + cloud[i] * 0.28);
    await breathe();

    // ---- read the capture -----------------------------------------------------------------
    const ids = new Uint8Array(N);
    for (let i = 0; i < N; i++) ids[i] = identity[i * 4];
    const src = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      src[i * 3] = capture.color[i * 4] / 255;
      src[i * 3 + 1] = capture.color[i * 4 + 1] / 255;
      src[i * 3 + 2] = capture.color[i * 4 + 2] / 255;
    }
    for (let c = 0; c < 3; c++) boxBlur(src, size, 1, 3, c);

    // plain light, normalised so 1 is fully lit
    const histogram = new Uint32Array(256);
    let lit = 0;
    for (let i = 0; i < N; i++)
      if (ids[i] >= 1) {
        histogram[capture.diffuse[i * 4]]++;
        lit++;
      }
    let whitePoint = 255;
    for (let acc = 0, v = 255; v >= 0; v--) {
      acc += histogram[v];
      if (acc > lit * 0.05) {
        whitePoint = Math.max(8, v);
        break;
      }
    }
    const shadow = new Float32Array(N);
    const spec = new Float32Array(N);
    const [lx, ly, lz] = capture.light;
    const hLen = Math.hypot(lx, ly, lz + 1) || 1;
    const hx = lx / hLen;
    const hy = ly / hLen;
    const hz = (lz + 1) / hLen;
    const depth = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      depth[i] = capture.depth[i * 4] / 255 + capture.depth[i * 4 + 1] / 65280;
      if (ids[i] === 0) continue;
      const d = capture.diffuse[i * 4] / whitePoint;
      shadow[i] = 1 - smooth(0.22, 0.72, d);
      const nx = capture.normal[i * 4] / 127.5 - 1;
      const ny = -(capture.normal[i * 4 + 1] / 127.5 - 1);
      const nz = capture.normal[i * 4 + 2] / 127.5 - 1;
      const facing = Math.max(0, nx * hx + ny * hy + nz * hz);
      spec[i] = Math.pow(facing, 14) * clamp01(d * 1.2);
    }
    const shadowSoft = shadow.slice();
    boxBlur(shadowSoft, size, 3);
    await breathe();

    // ---- the drawing's structure: where one form, plane or colour meets another --------------
    // cutH[i] is the boundary between a pixel and its right neighbour, cutV the one below it.
    const cutH = new Float32Array(N);
    const cutV = new Float32Array(N);
    {
      const col = capture.color;
      const nrm = capture.normal;
      const between = (i: number, j: number) => {
        if (ids[i] !== ids[j]) return 1;
        if (ids[i] === 0) return 0;
        let e = smooth(0.005, 0.02, Math.abs(depth[i] - depth[j]));
        const dot =
          ((nrm[i * 4] - 127.5) * (nrm[j * 4] - 127.5) +
            (nrm[i * 4 + 1] - 127.5) * (nrm[j * 4 + 1] - 127.5) +
            (nrm[i * 4 + 2] - 127.5) * (nrm[j * 4 + 2] - 127.5)) /
          (127.5 * 127.5);
        e = Math.max(e, 1 - smooth(0.7, 0.93, dot));
        const dc = (Math.abs(col[i * 4] - col[j * 4]) + Math.abs(col[i * 4 + 1] - col[j * 4 + 1]) + Math.abs(col[i * 4 + 2] - col[j * 4 + 2])) / 255;
        return Math.max(e, smooth(0.08, 0.28, dc));
      };
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          cutH[i] = x < size - 1 ? between(i, i + 1) : 1;
          cutV[i] = y < size - 1 ? between(i, i + size) : 1;
        }
    }
    // how strongly each pixel sits on a boundary, from either side
    const edge = new Float32Array(N);
    const firm = new Uint8Array(N);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let e = 0;
        if (x < size - 1) e = cutH[i];
        if (y < size - 1) e = Math.max(e, cutV[i]);
        if (x > 0) e = Math.max(e, cutH[i - 1]);
        if (y > 0) e = Math.max(e, cutV[i - size]);
        edge[i] = e;
        firm[i] = e > 0.5 ? 1 : 0;
      }
    // room to either side before a boundary, and how busy the neighbourhood is: the artist
    // works small where the subject is intricate and broad where it is open
    const dist = distanceTo(firm, size);
    const busy = edge.slice();
    boxBlur(busy, size, 5);
    const scale = new Float32Array(N);
    for (let i = 0; i < N; i++) scale[i] = Math.max(0.3, 1 / (1 + 8 * busy[i]));
    await breathe();

    // The artist keys the picture against the sheet. Tones are stretched across the subject's
    // range, deepened in shadow, then placed between the darkest and lightest values the sheet
    // allows: on a dark sheet the paper is the darks and everything lighter gets chalk in
    // proportion; on a pale one the paper is the lights and the darks are drawn.
    {
      const tones = new Uint32Array(256);
      let counted = 0;
      for (let i = 0; i < N; i++)
        if (ids[i] >= 1) {
          tones[Math.min(255, (255 * (0.3 * src[i * 3] + 0.59 * src[i * 3 + 1] + 0.11 * src[i * 3 + 2])) | 0)]++;
          counted++;
        }
      let low = 0;
      let high = 255;
      for (let acc = 0, v = 0; v < 256; v++) {
        acc += tones[v];
        if (acc > counted * 0.03) {
          low = v;
          break;
        }
      }
      for (let acc = 0, v = 255; v >= 0; v--) {
        acc += tones[v];
        if (acc > counted * 0.03) {
          high = v;
          break;
        }
      }
      const lo = low / 255;
      const range = Math.max(0.15, (high - low) / 255);
      const top = 0.95;
      const value = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const l = 0.3 * src[i * 3] + 0.59 * src[i * 3 + 1] + 0.11 * src[i * 3 + 2];
        value[i] = mix(l, clamp01((l - lo) / range), 0.8) * (1 - 0.3 * shadowSoft[i]);
      }
      // Counterchange: each passage is pushed away from the tone around it, so a dark console
      // still parts from a dark floor and a pale shelf from a pale wall.
      const around = value.slice();
      boxBlur(around, size, 16, 1, 0, 2);
      for (let i = 0; i < N; i++) {
        const l = 0.3 * src[i * 3] + 0.59 * src[i * 3 + 1] + 0.11 * src[i * 3 + 2];
        const n = clamp01(value[i] + 0.5 * (value[i] - around[i]));
        // even the darkest part of the subject gets a whisper of chalk, so its silhouette holds
        const floor = dark ? paperLum + (ids[i] >= 2 ? 0.07 : 0) : 0.07;
        let keyed = mix(floor, top, dark ? Math.pow(n, 1.1) : n);
        // on a dark sheet the open backdrop stays near the paper: a haze, not a second subject
        if (dark && ids[i] === 0) keyed = mix(paperLum, keyed, 0.55);
        const k = keyed / Math.max(0.02, l);
        const hue = Math.min(1.6, Math.max(Math.min(k, 1.6), 1 / Math.max(0.6, k)));
        for (let c = 0; c < 3; c++) src[i * 3 + c] = clamp01(keyed + (src[i * 3 + c] - l) * hue);
      }
    }
    // and simplifies within each shape, so texture does not turn into noise
    edgeSmooth(src, 3, size, 2.5, cutH, cutV);
    await breathe();

    // ---- where the hand goes: a stroke direction for every pixel ---------------------------
    const baseAngle = mark.vertical ? Math.PI / 2 + (random() - 0.5) * 0.12 : -0.95 + (random() - 0.5) * 0.5;
    const idTurn = Array.from({ length: 256 }, () => (random() - 0.5) * (mark.vertical ? 0.1 : 0.7));
    const fieldX = new Float32Array(N);
    const fieldY = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const nx = capture.normal[i * 4] / 127.5 - 1;
      const ny = -(capture.normal[i * 4 + 1] / 127.5 - 1);
      const lean = Math.hypot(nx, ny);
      const follow = ids[i] === 0 ? 0 : smooth(0.12, 0.4, lean) * mark.form;
      const formAngle = mark.cross ? Math.atan2(ny, nx) : Math.atan2(nx, -ny);
      const flat = baseAngle + idTurn[ids[i]] + (mark.cross ? Math.PI / 2 : 0) * (ids[i] === 0 ? 0 : 1);
      fieldX[i] = follow * Math.cos(2 * formAngle) + (1 - follow) * Math.cos(2 * flat);
      fieldY[i] = follow * Math.sin(2 * formAngle) + (1 - follow) * Math.sin(2 * flat);
    }
    // Strokes that follow the form also run along its edges, which draws them; and any mark
    // squeezed into a narrow shape turns to run along it.
    const along = { sweep: 0.85, scumble: 0.55, hatch: 0, striate: 0, dab: 0 }[answers.mark];
    const tangent = new Float32Array(N).fill(NaN);
    {
      const ridge = edge.slice();
      boxBlur(ridge, size, 2);
      for (let y = 1; y < size - 1; y++)
        for (let x = 1; x < size - 1; x++) {
          const i = y * size + x;
          const gx = ridge[i + 1] - ridge[i - 1];
          const gy = ridge[i + size] - ridge[i - size];
          const g = Math.hypot(gx, gy);
          if (g < 1e-3 || dist[i] > 7) continue;
          tangent[i] = Math.atan2(gy, gx) + Math.PI / 2;
          const w = Math.max(along * (1 - smooth(1, 7, dist[i])), 0.6 * (1 - smooth(1, 3, dist[i]))) * smooth(0.01, 0.08, g);
          const t = 2 * Math.atan2(gy, gx) + Math.PI;
          fieldX[i] = fieldX[i] * (1 - w) + Math.cos(t) * w;
          fieldY[i] = fieldY[i] * (1 - w) + Math.sin(t) * w;
        }
    }
    boxBlur(fieldX, size, 3);
    boxBlur(fieldY, size, 3);
    const angle = new Float32Array(N);
    for (let i = 0; i < N; i++) angle[i] = 0.5 * Math.atan2(fieldY[i], fieldX[i]);
    await breathe();

    // ---- how much of the sheet is worked ---------------------------------------------------
    const reach = new Float32Array(N);
    {
      const near = new Float32Array(N);
      const far = new Float32Array(N);
      for (let i = 0; i < N; i++) near[i] = far[i] = ids[i] >= 2 ? 1 : 0;
      boxBlur(near, size, 14, 1, 0, 2);
      boxBlur(far, size, 70, 1, 0, 2);
      for (let i = 0; i < N; i++) {
        if (ids[i] >= 2) reach[i] = 1;
        // Worked edge to edge, but the ground is pressed lighter than the things on it.
        else if (answers.extent === 'full') reach[i] = ids[i] === 1 ? 0.8 : 0.6;
        // The cloud is worked more lightly than the subject, so a pale subject is not lost in it.
        else if (answers.extent === 'halo') reach[i] = 0.6 * smooth(0.03, 0.3, far[i] + (cloud[i] - 0.5) * 0.25);
        else reach[i] = ids[i] === 1 ? Math.max(smooth(0.1, 0.6, near[i]) * 0.7, shadowSoft[i] * smooth(0.0, 0.12, far[i])) : 0;
      }
      if (answers.state === 'taped') {
        const margin = Math.round(size * 0.055);
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++)
            if (Math.min(x, y, size - 1 - x, size - 1 - y) < margin) reach[y * size + x] = 0;
      }
    }

    // ---- the box of sticks ----------------------------------------------------------------
    const saturation = mix(0.72, 1.12, mood.cheer);
    const sticks: RGB[] = [];
    if (answers.palette === 'box' || answers.palette === 'fauve') {
      const vivid = answers.palette === 'fauve';
      for (let h = 0; h < 14; h++) {
        const hue = (h + 0.3) / 14;
        const levels = vivid
          ? [[0.3, 0.9], [0.46, 1], [0.6, 0.95], [0.76, 0.9]]
          : [[0.14, 0.9], [0.24, 0.85], [0.36, 0.72], [0.5, 0.64], [0.66, 0.58], [0.8, 0.5], [0.9, 0.4]];
        for (const [l, s] of levels) sticks.push(hsl(hue, clamp01(s * saturation), l));
        // a real box also holds the greyed tints and earths that most of the world is made of
        if (!vivid && h % 2 === 0) for (const l of [0.28, 0.45, 0.62, 0.78]) sticks.push(hsl(hue, 0.22 * saturation, l));
      }
      const greys = vivid ? [0.08, 0.5, 0.97] : [0.07, 0.16, 0.3, 0.45, 0.6, 0.74, 0.86, 0.96];
      for (const g of greys) {
        sticks.push([g, g, g]);
        if (!vivid && g > 0.1 && g < 0.9) sticks.push([g * 1.06, g, g * 0.92], [g * 0.93, g, g * 1.08]);
      }
    } else {
      for (const s of STICKS[answers.palette]) {
        const l = 0.3 * s[0] + 0.59 * s[1] + 0.11 * s[2];
        sticks.push([mix(l, s[0], saturation), mix(l, s[1], saturation), mix(l, s[2], saturation)].map(clamp01) as unknown as RGB);
      }
    }
    // The box as designed picks the stick; the box as re-keyed to the palette lays the colour.
    const sticksMade = sticks.slice();
    const stickRoles = (answers.palette === 'schoolroom' || answers.palette === 'earth' || answers.palette === 'nocturne') ? STICK_ROLES[answers.palette] : undefined;
    if (stickRoles) sticks.splice(0, sticks.length, ...keyed(sticksMade, context.palette, stickRoles, STICK_SPREAD));
    let lightest = sticks[0];
    for (const s of sticks) if (s[0] + s[1] + s[2] > lightest[0] + lightest[1] + lightest[2]) lightest = s;
    const used = new Uint32Array(sticks.length);
    const warm = (mood.warmth - 0.5) * 0.09;

    /** The colour the artist is after at a pixel, before choosing a stick. */
    const want = (i: number, out: number[]) => {
      let r = src[i * 3] + warm;
      let g = src[i * 3 + 1];
      let b = src[i * 3 + 2] - warm;
      if (answers.palette === 'fauve') {
        const l = 0.3 * r + 0.59 * g + 0.11 * b;
        r = l + (r - l) * 2.1;
        g = l + (g - l) * 2.1;
        b = l + (b - l) * 2.1;
        const sh = shadowSoft[i];
        r = mix(r, r * 0.55 + 0.18, sh * 0.6) + (1 - sh) * 0.08;
        g = mix(g, g * 0.4, sh * 0.6) + (1 - sh) * 0.03;
        b = mix(b, b * 0.6 + 0.4, sh * 0.6) - (1 - sh) * 0.08;
      } else if (answers.palette === 'nocturne') {
        const sh = shadowSoft[i];
        r *= 1 - sh * 0.25;
        g *= 1 - sh * 0.12;
      }
      out[0] = clamp01(r);
      out[1] = clamp01(g);
      out[2] = clamp01(b);
    };

    // Neighbouring strokes reach for neighbouring sticks: the variation in choice drifts slowly
    // across the sheet instead of scattering confetti.
    const drift = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) drift[i] = random() - 0.5;
    for (let c = 0; c < 3; c++) boxBlur(drift, size, 7, 3, c, 2);
    {
      let sq = 0;
      for (let i = 0; i < N * 3; i++) sq += drift[i] * drift[i];
      const dev = Math.sqrt(sq / (N * 3)) || 1;
      for (let i = 0; i < N * 3; i++) drift[i] /= dev;
    }
    const broken = answers.palette === 'box' || answers.palette === 'fauve' ? 0.035 : 0.06;
    // how much of a stick's colour a passage reaches once the paper shows through the tooth
    // (measured: about half for a whisper, four fifths from a moderate hand up)
    const reached = mix(0.5, 0.85, Math.min(1, answers.weight / 0.35));
    /**
     * Best stick for a wanted colour over this paper, and how hard to press it. A thin veil of a
     * far-off stick reads as speckle, so `thin` is what the artist pays for one: the heavier the
     * hand, the more surely it reaches for the stick nearest the colour and lays it firmly.
     */
    const pick = (t: number[], i: number, thin: number): { stick: number; press: number } => {
      // small, intricate passages get the true colour; open ones are broken up a little
      const b = broken * mix(0.3, 1, scale[i]);
      // The variation is mostly in value, with only a little in hue, so a grey stays grey; each
      // stroke differs a touch from its neighbours, which is what lets the strokes be seen.
      const shade = drift[i * 3] * b + (random() - 0.5) * 0.09 * Math.sqrt(scale[i]);
      for (let c = 0; c < 3; c++) t[c] += shade + (drift[i * 3 + c] - drift[i * 3]) * b * 0.35;
      let best = 0;
      let bestCost = Infinity;
      let bestPress = 0;
      for (let k = 0; k < sticksMade.length; k++) {
        const s = sticksMade[k];
        const vr = s[0] - PM[0];
        const vg = s[1] - PM[1];
        const vb = s[2] - PM[2];
        const vv = vr * vr + vg * vg + vb * vb + 1e-5;
        // the paper always shows through the tooth a little, so no stick reaches its full colour:
        // a colour beyond that reach is found with a deeper stick, not by pressing harder
        const a = Math.min(reached, clamp01(((t[0] - PM[0]) * vr + (t[1] - PM[1]) * vg + (t[2] - PM[2]) * vb) / vv));
        const er = PM[0] + a * vr - t[0];
        const eg = PM[1] + a * vg - t[1];
        const eb = PM[2] + a * vb - t[2];
        // value and hue are judged apart, so a dark red stays a red rather than becoming the
        // nearest dark grey
        const el = 0.3 * er + 0.59 * eg + 0.11 * eb;
        const cost =
          3 * el * el + 1.5 * ((er - el) * (er - el) + (eg - el) * (eg - el) + (eb - el) * (eb - el)) + thin * a * (1 - a) - a * 0.004 * (0.5 + answers.weight);
        if (cost < bestCost) {
          bestCost = cost;
          best = k;
          bestPress = a;
        }
      }
      return { stick: best, press: bestPress };
    };

    // ---- pigment layer and the stroke -------------------------------------------------------
    const pig = new Float32Array(N * 3); // premultiplied
    const cover = new Float32Array(N);
    const scratch = new Float32Array(N);
    const touched = new Int32Array(N);
    // A pixel's coverage follows the hardest press laid on it (overlaps fill the tooth no deeper),
    // so value comes from pressure as well as from the stick; a heavier hand lays a little more.
    const passes = answers.weight > 0.66 ? 2 : 1;
    const gain = (mix(1, 0.94, answers.tooth) * mix(0.8, 1.12, Math.sqrt(answers.weight))) / (passes === 2 ? 1.1 : 1);
    // Chalk grain is finer than a pixel, so a pixel is part covered in proportion to the press,
    // more on the peaks of the tooth and less in its pits. A light touch catches only the peaks;
    // a rough sheet breaks every stroke into specks.
    const grit = mix(0.15, 1, Math.pow(answers.tooth, 1.5));
    const take = (v: number, i: number) => clamp01(v + (tooth[i] - 0.5) * grit);
    const pack = mix(0.02, 0.12, answers.weight);
    const wobble = mix(0.6, 1.6, mood.energy);
    const profile = new Float32Array(64);

    interface StrokeSpec {
      x: number;
      y: number;
      length: number;
      width: number;
      press: number;
      colour: RGB;
      /** Stop where the subject's colour moves more than `tol` away from where the stroke began. */
      clip: boolean;
      tol?: number;
      /** Keep the stroke inside its shape: never across a boundary, narrowing to fit beside one. */
      hug?: boolean;
      fixed?: number;
      curl?: number;
      jitter?: number;
      opacity?: number;
      waver?: number;
    }
    const tmp = [0, 0, 0];
    const stroke = (spec: StrokeSpec) => {
      const { length, width, clip } = spec;
      const hug = spec.hug ?? false;
      const tol = spec.tol ?? 0.05;
      const i0 = (spec.y | 0) * size + (spec.x | 0);
      const sid = ids[i0];
      const samples = Math.max(2, Math.min(63, Math.round(width / 0.85)));
      let level = 0.5 + random() * 0.5;
      for (let k = 0; k < samples; k++) {
        level = clamp01(level * 0.6 + random() * 0.55);
        const edge = Math.abs((2 * k) / (samples - 1) - 1);
        profile[k] = (random() < 0.08 ? 0.2 : 0.4 + 0.6 * level) * (1 - 0.45 * edge * edge * edge);
      }
      const turn = (spec.jitter ?? mark.jitter) * wobble * (random() - 0.5) * 2;
      const curl = (spec.curl ?? mark.curl) * (random() < 0.5 ? -1 : 1) * (0.6 + random() * 0.8);
      const r0 = src[i0 * 3];
      const g0 = src[i0 * 3 + 1];
      const b0 = src[i0 * 3 + 2];
      let count = 0;
      let phase = random() * 6.28;
      const ramp = Math.max(1.5, Math.min(length * 0.15, 4));
      const flip = spec.fixed === undefined && random() < 0.5 ? Math.PI : 0;
      // A stroke that meets a boundary at once is turned to run along the shape instead, so a
      // narrow form (a book's spine, a chair leg) still gets its chalk.
      for (let attempt = 0; attempt < 2; attempt++) {
        let x = spec.x;
        let y = spec.y;
        let a = attempt === 0 ? (spec.fixed ?? angle[i0]) + turn + flip : Number.isNaN(tangent[i0]) ? angle[i0] + Math.PI / 2 : tangent[i0];
        if (attempt === 1 && random() < 0.5) a += Math.PI;
        const steer = attempt === 0 ? 0.45 : 0.12;
        let dx = Math.cos(a);
        let dy = Math.sin(a);
        let px = x | 0;
        let py = y | 0;
        let s = 0;
        for (; s < length; s++) {
          const ix = x | 0;
          const iy = y | 0;
          if (ix < 0 || iy < 0 || ix >= size || iy >= size) break;
          const i = iy * size + ix;
          if (ids[i] !== sid) break;
          if (hug && (ix !== px || iy !== py)) {
            let crossing = ix !== px ? cutH[py * size + Math.min(ix, px)] : 0;
            if (iy !== py) crossing = Math.max(crossing, cutV[Math.min(iy, py) * size + ix]);
            if (crossing > 0.55) break;
          }
          px = ix;
          py = iy;
          if (clip) {
            const dr = src[i * 3] - r0;
            const dg = src[i * 3 + 1] - g0;
            const db = src[i * 3 + 2] - b0;
            if (dr * dr + dg * dg + db * db > tol) break;
          }
          // the stick bites within a few pixels, and lifts off over the last third of a full stroke
          const press = spec.press * Math.min(1, (s / ramp) * 0.35 + 0.65) * Math.min(1, (length - s) / (length * 0.3) + 0.2);
          const nx = -dy;
          const ny = dx;
          // the stick's width is laid out from the middle to each side, stopping at a boundary;
          // the middle itself is always laid, so even the narrowest form takes chalk
          const mid = (samples - 1) / 2;
          {
            const v = press * Math.max(profile[Math.floor(mid)], profile[Math.ceil(mid)]) * (0.55 + 0.45 * reach[i]);
            if (scratch[i] < v) {
              if (scratch[i] === 0) touched[count++] = i;
              scratch[i] = v;
            }
          }
          for (let side = -1; side <= 1; side += 2) {
            let qx = ix;
            let qy = iy;
            for (let k = side < 0 ? Math.floor(mid) : Math.floor(mid) + 1; k >= 0 && k < samples; k += side) {
              const u = (k / (samples - 1) - 0.5) * width;
              const jx = (x + nx * u) | 0;
              const jy = (y + ny * u) | 0;
              if (jx < 0 || jy < 0 || jx >= size || jy >= size) break;
              if (hug && (jx !== qx || jy !== qy)) {
                let crossing = 0;
                for (let cx = Math.min(jx, qx); cx < Math.max(jx, qx); cx++) crossing = Math.max(crossing, cutH[qy * size + cx]);
                for (let cy = Math.min(jy, qy); cy < Math.max(jy, qy); cy++) crossing = Math.max(crossing, cutV[cy * size + jx]);
                if (crossing > 0.55) break;
              }
              qx = jx;
              qy = jy;
              const j = jy * size + jx;
              if (ids[j] !== sid && (clip || Math.abs(u) > 2.5)) continue;
              const v = press * profile[k] * (0.55 + 0.45 * reach[j]);
              if (scratch[j] < v) {
                if (scratch[j] === 0) touched[count++] = j;
                scratch[j] = v;
              }
            }
          }
          if (spec.fixed !== undefined) {
            phase += 0.5;
            a = spec.fixed + turn + Math.sin(phase) * (spec.waver ?? 0);
          } else a = angle[i] + turn + curl * s;
          let ndx = Math.cos(a);
          let ndy = Math.sin(a);
          if (curl === 0 && ndx * dx + ndy * dy < 0) {
            ndx = -ndx;
            ndy = -ndy;
          }
          dx = dx * (1 - steer) + ndx * steer;
          dy = dy * (1 - steer) + ndy * steer;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len;
          dy /= len;
          x += dx;
          y += dy;
        }
        if (s >= 3 || length < 5 || spec.fixed !== undefined) break;
      }
      const opacity = spec.opacity ?? 0.94;
      const [cr, cg, cb] = spec.colour;
      for (let n = 0; n < count; n++) {
        const j = touched[n];
        const v = scratch[j] * gain * (0.8 + 0.4 * cloud[j]);
        scratch[j] = 0;
        const al = take(v, j) * opacity;
        if (al <= 0.003) continue;
        // A stroke fills the tooth only as deep as its pressure reaches, laying its colour over
        // the old chalk on the peaks; going over a passage again packs the tooth only a little.
        const was = cover[j];
        const top = Math.max(was, al);
        const filled = Math.min(1, top + pack * Math.min(was, al) * (1 - top));
        const keep = was > al ? (was - al) / was : 0;
        const fresh = al + filled - top;
        pig[j * 3] = pig[j * 3] * keep + cr * fresh;
        pig[j * 3 + 1] = pig[j * 3 + 1] * keep + cg * fresh;
        pig[j * 3 + 2] = pig[j * 3 + 2] * keep + cb * fresh;
        cover[j] = filled;
      }
    };

    /** Rub the pigment into the tooth, within each shape: grain disappears where `amount` is high. */
    const rub = (sigma: number, amount: (i: number) => number) => {
      if (sigma < 0.5) return;
      const soft3 = pig.slice();
      const softA = cover.slice();
      edgeSmooth(soft3, 3, size, sigma, cutH, cutV);
      edgeSmooth(softA, 1, size, sigma, cutH, cutV);
      for (let i = 0; i < N; i++) {
        const k = amount(i);
        if (k <= 0) continue;
        pig[i * 3] = mix(pig[i * 3], soft3[i * 3], k);
        pig[i * 3 + 1] = mix(pig[i * 3 + 1], soft3[i * 3 + 1], k);
        pig[i * 3 + 2] = mix(pig[i * 3 + 2], soft3[i * 3 + 2], k);
        cover[i] = mix(cover[i], softA[i], k);
      }
    };

    const hush = (i: number) => (ids[i] === 0 ? (dark ? 0.3 : 0.4) : ids[i] === 1 ? 0.85 : 1);
    // the open sheet is mostly laid in with the side of the stick; fewer drawn strokes go there
    const spare = (i: number) => (ids[i] === 0 ? 0.5 : 1);
    /**
     * Seed strokes across the sheet so that each spot is covered about `overdraw` times: where
     * `area` says strokes come out small, proportionally more of them are laid.
     */
    const scatter = async (overdraw: number, smallest: number, area: (i: number) => number, body: (x: number, y: number, i: number) => void) => {
      const spacing = Math.max(1.5, Math.sqrt(smallest / overdraw));
      const cells = Math.ceil(size / spacing);
      const order = new Int32Array(cells * cells);
      for (let k = 0; k < order.length; k++) order[k] = k;
      for (let k = order.length - 1; k > 0; k--) {
        const j = (random() * (k + 1)) | 0;
        const t = order[k];
        order[k] = order[j];
        order[j] = t;
      }
      const room = overdraw * spacing * spacing;
      for (let k = 0; k < order.length; k++) {
        if ((k & 1023) === 0) await breathe();
        const x = Math.min(size - 1, ((order[k] % cells) + random()) * spacing);
        const y = Math.min(size - 1, (((order[k] / cells) | 0) + random()) * spacing);
        const i = (y | 0) * size + (x | 0);
        if (random() * area(i) > room) continue;
        body(x, y, i);
      }
    };

    // Stroke size follows the subject: full size in open passages, smaller where it is busy,
    // and narrowed to fit beside a boundary.
    const sizeAt = (i: number, width: number, length: number) => {
      const s = scale[i];
      // boundaries already stop and narrow a stroke, so its length shrinks only a little and
      // each kind of mark keeps its shape
      const w = width * Math.pow(s, 0.65);
      const l = length * Math.pow(s, 0.3);
      return { w, l, area: Math.max(5, Math.min(w, 2 * dist[i] + 1.4) * Math.min(l, 2 * dist[i] + w) * 0.85) };
    };
    const wide = mix(mark.width[0], mark.width[1], 0.5);
    const long = mix(mark.len[0], mark.len[1], 0.5);

    // 1. blocking in: broad, light, loose, then rubbed
    const blockW = Math.min(40, wide * 2);
    const blockL = long * 1.2;
    await scatter(1.3, 5, (i) => sizeAt(i, blockW, blockL).area, (x, y, i) => {
      if (random() > (reach[i] + 0.02) * hush(i)) return;
      want(i, tmp);
      const { stick, press } = pick(tmp, i, mix(0.08, 0.2, answers.weight));
      if (press < 0.08) return;
      const { w, l } = sizeAt(i, blockW, blockL);
      stroke({
        x,
        y,
        length: l * mix(0.8, 1.2, random()),
        width: w * mix(0.8, 1.2, random()),
        press: press * mix(0.5, 0.75, answers.weight) * Math.sqrt(reach[i]) * (0.6 + 0.4 * hush(i)),
        colour: sticks[stick],
        clip: true,
        tol: 0.06,
        hug: true,
      });
    });
    // the open sheet around the subject is laid with the side of the stick and rubbed smooth
    rub(mix(2, 7, answers.smudge), (i) => clamp01(answers.smudge * 1.5) * (0.55 + 0.45 * shadowSoft[i]) + (ids[i] === 0 ? 0.45 : 0));

    // 2. the drawing proper: strokes that follow the form, each one stick
    for (let pass = 0; pass < passes; pass++)
      await scatter(mix(1.8, 3.2, answers.weight), 5, (i) => sizeAt(i, wide, long).area, (x, y, i) => {
        if (random() > reach[i] * hush(i) * spare(i)) return;
        want(i, tmp);
        const { stick, press } = pick(tmp, i, mix(0.02, 0.08, answers.weight));
        if (press < 0.06) return;
        used[stick]++;
        const { w, l } = sizeAt(i, mix(mark.width[0], mark.width[1], random()), mix(mark.len[0], mark.len[1], random() * random() * 1.6));
        stroke({
          x,
          y,
          length: l,
          width: w,
          press: press * (mark.cross ? mix(0.85, 1.2, random()) : mix(0.75, 1.05, random())) * Math.sqrt(reach[i]) * (0.6 + 0.4 * hush(i)),
          colour: sticks[stick],
          clip: true,
          tol: 0.025,
          hug: true,
        });
      });

    // 2b. going back in with the tip: wherever the drawing so far has missed a small form (a
    // spine, a dial, a chair leg), short firm strokes of the right stick put it back
    {
      const fixW = Math.max(2, wide * 0.45);
      const fixL = Math.max(4, long * 0.3);
      await scatter(1, 4, () => 4, (x, y, i) => {
        if (random() > reach[i] * hush(i) * spare(i)) return;
        want(i, tmp);
        const { stick, press } = pick(tmp, i, mix(0.02, 0.08, answers.weight));
        if (press < 0.06) return;
        // judged against what that stick can give over this paper, not the scene's own colour
        const a = cover[i];
        let err = 0;
        for (let c = 0; c < 3; c++) {
          const have = P[c] * (1 - a) + pig[i * 3 + c];
          const aim = P[c] + (sticks[stick][c] - P[c]) * press;
          err += (have - aim) * (have - aim);
        }
        if (err < 0.007) return;
        stroke({
          x,
          y,
          length: fixL * mix(0.6, 1.2, random()),
          width: fixW * mix(0.7, 1.2, random()),
          press: press * mix(0.9, 1.1, random()) * Math.sqrt(reach[i]),
          colour: sticks[stick],
          clip: true,
          tol: 0.025,
          hug: true,
        });
      });
    }
    rub(mix(1.5, 4, answers.smudge), (i) => Math.min(0.8, answers.smudge * (0.3 + 0.8 * shadowSoft[i]) + Math.max(0, answers.smudge - 0.6) * 0.8 + (ids[i] === 0 ? 0.4 : 0)));
    await breathe();

    // 3. the line
    if (answers.outline !== 'none') {
      const contour = new Float32Array(N);
      for (let y = 0; y < size - 1; y++)
        for (let x = 0; x < size - 1; x++) {
          const i = y * size + x;
          let e = 0;
          for (const j of [i + 1, i + size]) {
            if (ids[i] !== ids[j]) e = Math.max(e, ids[i] >= 2 || ids[j] >= 2 ? 1 : 0.25);
            else if (ids[i] >= 2) {
              if (Math.abs(depth[i] - depth[j]) > 0.012) e = Math.max(e, 0.8);
              const dot =
                (capture.normal[i * 4] - 127.5) * (capture.normal[j * 4] - 127.5) +
                (capture.normal[i * 4 + 1] - 127.5) * (capture.normal[j * 4 + 1] - 127.5) +
                (capture.normal[i * 4 + 2] - 127.5) * (capture.normal[j * 4 + 2] - 127.5);
              if (dot < 127.5 * 127.5 * 0.72) e = Math.max(e, 0.55);
            }
          }
          contour[i] = e;
        }
      boxBlur(contour, size, 1);
      const lineWeight = mix(1.4, 2.6, answers.weight);
      const sway = new Float32Array(N);
      for (let i = 0; i < N; i++) sway[i] = random();
      boxBlur(sway, size, 9, 1, 0, 2);
      normalise(sway);
      for (let y = 2; y < size - 2; y++)
        for (let x = 2; x < size - 2; x++) {
          const i = y * size + x;
          const ox = Math.round(sway[i] * 1.3 * wobble);
          const oy = Math.round(sway[(i + 977) % N] * 1.3 * wobble);
          const j = Math.min(size - 3, Math.max(2, y + oy)) * size + Math.min(size - 3, Math.max(2, x + ox));
          const e = contour[j];
          if (e < 0.04 || reach[i] <= 0) continue;
          const lost = smooth(0.25, 0.6, cloud[(i + 31337) % N] + sway[(i + 5003) % N] * 0.12);
          const v = Math.min(1.25, e * lineWeight * (0.35 + 0.9 * lost)) * gain;
          const al = take(v, i) * 0.92;
          if (al <= 0.003) continue;
          let c: RGB;
          if (answers.outline === 'charcoal') c = dark ? rgb(214, 208, 196) : rgb(30, 27, 27);
          else if (answers.outline === 'chalk') c = rgb(246, 245, 238);
          else {
            want(j, tmp);
            c = dark
              ? [mix(tmp[0], 1, 0.45), mix(tmp[1], 1, 0.45), mix(tmp[2], 1, 0.45)]
              : [tmp[0] * 0.38, tmp[1] * 0.34, tmp[2] * 0.4];
          }
          const keep = 1 - al;
          pig[i * 3] = pig[i * 3] * keep + c[0] * al;
          pig[i * 3 + 1] = pig[i * 3 + 1] * keep + c[1] * al;
          pig[i * 3 + 2] = pig[i * 3 + 2] * keep + c[2] * al;
          cover[i] = cover[i] * keep + al;
        }
    }
    await breathe();

    // 4. highlights: raw chalk struck on last and left alone
    if (answers.highlights > 0.04) {
      let peak = 0.05;
      for (let i = 0; i < N; i++) if (ids[i] >= 2 && spec[i] > peak) peak = spec[i];
      const tries = Math.round(mix(2500, 26000, answers.highlights));
      for (let n = 0; n < tries; n++) {
        if ((n & 1023) === 0) await breathe();
        const x = random() * size;
        const y = random() * size;
        const i = (y | 0) * size + (x | 0);
        if (ids[i] < 2) continue;
        const l = 0.3 * src[i * 3] + 0.59 * src[i * 3 + 1] + 0.11 * src[i * 3 + 2];
        const h = (spec[i] / peak) * 0.8 + Math.pow(l, 4) * (1 - shadow[i]) * 0.3;
        if (h < 0.42 + random() * 0.5) continue;
        want(i, tmp);
        const tint = answers.palette === 'box' || answers.palette === 'fauve' ? 0.3 : 0;
        stroke({
          x,
          y,
          length: mix(7, 22, random()) * (mark.cross ? 0.6 : 1),
          width: mix(2.2, 5.5, random()),
          press: mix(0.95, 1.35, random()),
          colour: [mix(lightest[0], tmp[0], tint), mix(lightest[1], tmp[1], tint), mix(lightest[2], tmp[2], tint)],
          clip: true,
          hug: true,
          opacity: 0.97,
        });
      }
    }

    // ---- what happened to it afterwards ------------------------------------------------------
    const smears = (answers.state === 'erased' ? 3 : 0) + (mood.wear > 0.7 ? 1 : 0);
    for (let n = 0; n < smears; n++) {
      const cx = mix(0.2, 0.8, random()) * size;
      const cy = mix(0.2, 0.8, random()) * size;
      const dir = mix(-0.5, 0.5, random()) + (random() < 0.3 ? 1.2 : 0);
      const ux = Math.cos(dir);
      const uy = Math.sin(dir);
      const half = mix(90, 230, random());
      // narrow enough, and lifting little enough, that the drawing still reads through the swipe
      const band = mix(14, 26, random());
      const lift = answers.state === 'erased' ? mix(0.25, 0.4, random()) : 0.18;
      const before = pig.slice();
      const beforeA = cover.slice();
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const along = (x - cx) * ux + (y - cy) * uy;
          const across = -(x - cx) * uy + (y - cy) * ux + Math.sin(along * 0.012) * 14;
          const m = (1 - smooth(band * 0.7, band, Math.abs(across))) * (1 - smooth(half * 0.8, half, Math.abs(along)));
          if (m <= 0) continue;
          const i = y * size + x;
          let r = 0;
          let g = 0;
          let b = 0;
          let a = 0;
          for (let t = -3; t <= 3; t++) {
            const sx = Math.min(size - 1, Math.max(0, Math.round(x + ux * t * 5)));
            const sy = Math.min(size - 1, Math.max(0, Math.round(y + uy * t * 5)));
            const j = sy * size + sx;
            r += before[j * 3];
            g += before[j * 3 + 1];
            b += before[j * 3 + 2];
            a += beforeA[j];
          }
          const streak = 0.92 + 0.12 * coarse[((y * 3) % size) * size + ((across * 2 + size * 4) | 0) % size];
          const k = (1 - lift) * streak / 7;
          pig[i * 3] = mix(pig[i * 3], r * k, m);
          pig[i * 3 + 1] = mix(pig[i * 3 + 1], g * k, m);
          pig[i * 3 + 2] = mix(pig[i * 3 + 2], b * k, m);
          cover[i] = mix(cover[i], a * k, m);
          if (dark) {
            const haze = m * 0.035 * streak;
            pig[i * 3] += 0.9 * haze * (1 - cover[i]);
            pig[i * 3 + 1] += 0.9 * haze * (1 - cover[i]);
            pig[i * 3 + 2] += 0.88 * haze * (1 - cover[i]);
            cover[i] += haze * (1 - cover[i]);
          }
        }
      await breathe();
    }

    if (answers.state === 'dusty' || mood.wear > 0.8) {
      const amount = answers.state === 'dusty' ? 1 : 0.4;
      // dust runs down in trails: some columns of the sheet catch it and others stay clean
      const trail = new Float32Array(size);
      for (let x = 0; x < size; x++) trail[x] = random();
      for (let x = 0; x < size; x++) trail[x] = smooth(0.45, 0.85, trail[x]);
      for (let x = 0; x < size; x++) {
        if (trail[x] <= 0) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        for (let y = 0; y < size; y++) {
          const i = y * size + x;
          const c = cover[i];
          r = r * 0.988 + pig[i * 3] * 0.02;
          g = g * 0.988 + pig[i * 3 + 1] * 0.02;
          b = b * 0.988 + pig[i * 3 + 2] * 0.02;
          a = a * 0.988 + c * 0.02;
          const fall = clamp01(a * 0.5 * amount) * trail[x] * smooth(0.3, 0.75, tooth[i]) * (1 - c);
          if (fall <= 0.004 || a < 1e-4) continue;
          pig[i * 3] += (r / a) * fall;
          pig[i * 3 + 1] += (g / a) * fall;
          pig[i * 3 + 2] += (b / a) * fall;
          cover[i] += fall;
        }
      }
    }

    if (answers.state === 'swatches') {
      const ranked = [...used.keys()].sort((p, q) => used[q] - used[p]).filter((k) => used[k] > 0).slice(0, 7);
      const left = random() < 0.5;
      const saved = reach.slice();
      reach.fill(1);
      ranked.forEach((k, n) => {
        const y0 = size * 0.12 + n * size * 0.105 + random() * 8;
        const x0 = left ? size * 0.03 : size * 0.88;
        for (let row = 0; row < 5; row++)
          stroke({
            x: x0 + random() * 6,
            y: y0 + row * 5.5,
            length: mix(34, 54, random()),
            width: mix(4, 6.5, random()),
            press: mix(0.8, 1.15, random()),
            colour: sticks[k],
            clip: false,
            fixed: 0.06,
            jitter: 0.08,
            curl: 0,
            waver: 0.5,
          });
      });
      reach.set(saved);
    }

    // ---- sheet and pigment together ----------------------------------------------------------
    const pixels = new Uint8ClampedArray(N * 4);
    const haze = paper.grain === 'board' ? mix(0.05, 0.16, mood.wear) : 0;
    const relief = dark ? 0.035 : 0.075;
    for (let i = 0; i < N; i++) {
      const t = tooth[i] - 0.5;
      const mottle = (cloud[i] - 0.5) * (dark ? 0.03 : 0.05);
      const dust = haze * (cloud[i] * 0.9 + clamp01(0.5 + coarse[i] * 0.4) * 0.7);
      const lift = 1 + t * relief * 2 + mottle;
      const a = clamp01(cover[i]);
      // even rubbed pigment sits thinner in the pits of the sheet
      const pit = 1 - (1 - a * 0.55) * 0 - Math.max(0, -t) * 0.1 * a;
      for (let c = 0; c < 3; c++) {
        const sheet = P[c] * lift + dust * (0.92 - P[c]);
        const v = sheet * (1 - a) + pig[i * 3 + c] * pit;
        pixels[i * 4 + c] = v * 255;
      }
      pixels[i * 4 + 3] = 255;
    }

    if (answers.state === 'taped') {
      const tape = (cx: number, cy: number, rot: number, w: number, h: number) => {
        const ux = Math.cos(rot);
        const uy = Math.sin(rot);
        const reachPx = Math.ceil(Math.hypot(w, h) / 2) + 2;
        for (let y = Math.max(0, (cy - reachPx) | 0); y < Math.min(size, cy + reachPx); y++)
          for (let x = Math.max(0, (cx - reachPx) | 0); x < Math.min(size, cx + reachPx); x++) {
            const u = (x - cx) * ux + (y - cy) * uy;
            const v = -(x - cx) * uy + (y - cy) * ux;
            const torn = Math.sin(v * 1.9 + cx) * 1.6;
            if (Math.abs(u) > w / 2 + torn || Math.abs(v) > h / 2) continue;
            const i = y * size + x;
            const shade = 0.93 + 0.07 * Math.sin(u * 0.9) * Math.sin(u * 0.23 + v) + (tooth[i] - 0.5) * 0.05;
            const al = 0.86;
            pixels[i * 4] = pixels[i * 4] * (1 - al) + 232 * shade * al;
            pixels[i * 4 + 1] = pixels[i * 4 + 1] * (1 - al) + 216 * shade * al;
            pixels[i * 4 + 2] = pixels[i * 4 + 2] * (1 - al) + 168 * shade * al;
          }
      };
      const m = size * 0.05;
      tape(m + 6, m + 4, -0.78 + (random() - 0.5) * 0.3, 78, 24);
      tape(size - m - 6, m + 4, 0.78 + (random() - 0.5) * 0.3, 78, 24);
      tape(m + 6, size - m - 4, 0.78 + (random() - 0.5) * 0.3, 78, 24);
      tape(size - m - 6, size - m - 4, -0.78 + (random() - 0.5) * 0.3, 78, 24);
    }

    const words = (key: string) => key.replace(/([A-Z])/g, ' $1').toLowerCase();
    return {
      pixels,
      notes: [
        `${words(answers.palette)} sticks on ${answers.paper === 'blackboard' ? 'a blackboard' : `${answers.paper} paper`}`,
        `${answers.mark} strokes, ${answers.weight > 0.66 ? 'heavily loaded' : answers.weight < 0.33 ? 'lightly laid' : 'moderately laid'}, ${answers.smudge > 0.6 ? 'well rubbed in' : answers.smudge > 0.2 ? 'shadows blended' : 'left raw'}`,
        ...(answers.outline === 'none' ? [] : [`${answers.outline} line`]),
        `${answers.extent === 'full' ? 'worked edge to edge' : answers.extent === 'halo' ? 'fading to bare sheet' : 'subject only'}; ${answers.state}`,
      ],
    };
  },
});
