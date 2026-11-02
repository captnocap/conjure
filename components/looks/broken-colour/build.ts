import { type PaletteRole, choice, clamp01, defineLook, mix, noul, rekey, rekeyOne, score, seeded } from '@conjure/kit';

type Lab = [number, number, number];
type Buffer = Float32Array | number[];

const smooth = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

// ---- blurs and noise ------------------------------------------------------------------------

/** Box blur along one axis (0 = rows, 1 = columns) of one channel of `stride`-interleaved floats. */
function blurAxis(data: Float32Array, size: number, radius: number, axis: 0 | 1, stride = 1, channel = 0) {
  if (radius < 1) return;
  const line = new Float32Array(size);
  const span = radius * 2 + 1;
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
function blur(data: Float32Array, size: number, radius: number, stride = 1, channel = 0, passes = 1) {
  for (let pass = 0; pass < passes; pass++) {
    blurAxis(data, size, radius, 0, stride, channel);
    blurAxis(data, size, radius, 1, stride, channel);
  }
}
/** Two-pass chamfer distance in place: cells at 0 are edges, every other cell starts large. */
function chamfer(dist: Float32Array, size: number) {
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + 1);
      if (y > 0) {
        d = Math.min(d, dist[i - size] + 1);
        if (x > 0) d = Math.min(d, dist[i - size - 1] + 1.414);
        if (x < size - 1) d = Math.min(d, dist[i - size + 1] + 1.414);
      }
      dist[i] = d;
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      let d = dist[i];
      if (x < size - 1) d = Math.min(d, dist[i + 1] + 1);
      if (y < size - 1) {
        d = Math.min(d, dist[i + size] + 1);
        if (x < size - 1) d = Math.min(d, dist[i + size + 1] + 1.414);
        if (x > 0) d = Math.min(d, dist[i + size - 1] + 1.414);
      }
      dist[i] = d;
    }
}
function normalise(field: Float32Array) {
  let sum = 0;
  let sq = 0;
  for (let i = 0; i < field.length; i++) {
    sum += field[i];
    sq += field[i] * field[i];
  }
  const mean = sum / field.length;
  const dev = Math.sqrt(Math.max(1e-12, sq / field.length - mean * mean));
  for (let i = 0; i < field.length; i++) field[i] = (field[i] - mean) / dev;
}

// ---- colour: display sRGB and Oklab ---------------------------------------------------------

const LINEAR = new Float32Array(256);
for (let v = 0; v < 256; v++) {
  const c = v / 255;
  LINEAR[v] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const GAMMA = new Float32Array(4096);
for (let v = 0; v < 4096; v++) {
  const c = v / 4095;
  GAMMA[v] = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function linearToLab(r: number, g: number, b: number, out: Buffer, o: number) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  out[o] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[o + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[o + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
}

/** Oklab to display sRGB in 0..1. `safe` pulls chroma in until the colour fits, so hue holds. */
function labToRgb(L: number, a: number, b: number, out: Buffer, o: number, safe = true) {
  for (let tries = 0; ; tries++) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const outside = r < -0.003 || g < -0.003 || bl < -0.003 || r > 1.003 || g > 1.003 || bl > 1.003;
    if (!safe || !outside || tries >= 4) {
      out[o] = GAMMA[Math.round(clamp01(r) * 4095)];
      out[o + 1] = GAMMA[Math.round(clamp01(g) * 4095)];
      out[o + 2] = GAMMA[Math.round(clamp01(bl) * 4095)];
      return;
    }
    a *= 0.74;
    b *= 0.74;
  }
}

const hex = (code: string): Lab => {
  const n = parseInt(code.slice(1), 16);
  const out: Lab = [0, 0, 0];
  linearToLab(LINEAR[(n >> 16) & 255], LINEAR[(n >> 8) & 255], LINEAR[n & 255], out, 0);
  return out;
};
const rgbOf = (code: string): Lab => {
  const n = parseInt(code.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// ---- the palettes -----------------------------------------------------------------------------

const LIGHTS = {
  sunlit: {
    say: 'Sunlit: warm creamy lights against cool saturated shadows, a high bright key like a summer afternoon on the river.',
    light: '#ffe09a', shadow: '#7a6ad2', sky: '#bcd8ee', water: '#5c94b4',
    key: [0.29, 0.95], gamma: 0.85, chroma: 1.45, tint: 0.75, aerial: 0.12, shimmer: 1, breaking: 1,
    extra: ['#fff4c4', '#f8cf6a', '#9c8ae0'],
    breaks: ['#ffe09a', '#f7b2b8', '#9cc4f0', '#bba6e6', '#bfe09a'],
  },
  overcast: {
    say: 'Overcast: muted pearly greyed colour, close in value, quiet and soft, the light diffused and even.',
    light: '#ece6d4', shadow: '#6c8c98', sky: '#d2d7d4', water: '#7b969a',
    key: [0.3, 0.9], gamma: 0.95, chroma: 1.05, tint: 0.55, aerial: 0.22, shimmer: 0.2, breaking: 0.6,
    extra: ['#cfcfc6', '#a9b2ab', '#8a979c', '#ddd3c2', '#b7aa98'],
    breaks: ['#e6dcc4', '#bcd2c4', '#b4c2d2', '#dcc4c4', '#cfd6b4'],
  },
  dusk: {
    say: 'Dusk: glowing saturated lights against deep dark shadows, the two pulled far apart, a low and dramatic key.',
    light: '#ffa464', shadow: '#4a4c9e', sky: '#e9b4a0', water: '#5a6496',
    key: [0.18, 0.88], gamma: 1.05, chroma: 1.4, tint: 0.7, aerial: 0.18, shimmer: 0.6, breaking: 1.1,
    extra: ['#ea6c3c', '#c9506a', '#352f6a', '#f2a24e', '#f6c6a0'],
    breaks: ['#ffa464', '#e87890', '#6a6ad0', '#f2c060', '#8a5aa8'],
  },
  winter: {
    say: 'Winter: snow light, near-white and barely tinted in the sun, crisp clear colour in every shadow.',
    light: '#ffd8c8', shadow: '#6a9ad8', sky: '#e2ebf3', water: '#88a8c4',
    key: [0.32, 0.97], gamma: 0.8, chroma: 1.0, tint: 0.7, aerial: 0.16, shimmer: 0.8, breaking: 0.85,
    extra: ['#f6f8fb', '#dce8f4', '#b9cde8', '#f2ded8', '#a8b8dc'],
    breaks: ['#ffd8c8', '#a8c8f0', '#c8b8e8', '#f4f0d0', '#9ad0d8'],
  },
  mist: {
    say: 'Morning mist: everything veiled in pale pearly tints, forms half dissolved, like fog on the Thames.',
    light: '#f4d8c4', shadow: '#9890ba', sky: '#e4dcdc', water: '#a2abbc',
    key: [0.36, 0.93], gamma: 0.8, chroma: 0.95, tint: 0.6, aerial: 0.3, shimmer: 0.3, breaking: 0.7,
    extra: ['#e6dde0', '#ccc3d4', '#dccdc0', '#b9b9cb', '#f1e6da'],
    breaks: ['#f4d8c4', '#d8c8e0', '#c8d0dc', '#e8d0d8', '#d8dcc8'],
  },
  spring: {
    say: 'Spring garden: fresh clean lights, bright young colour and soft cool shadows, light and new.',
    light: '#fff09c', shadow: '#56a6a0', sky: '#d0eaf0', water: '#58a2a6',
    key: [0.31, 0.95], gamma: 0.85, chroma: 1.5, tint: 0.7, aerial: 0.12, shimmer: 0.8, breaking: 1,
    extra: ['#f8c6d8', '#a8d878', '#fff8d2', '#7cc08a'],
    breaks: ['#fff09c', '#f8c0d4', '#a8dc88', '#9cd0e0', '#d8e8a0'],
  },
} as const;

/** A light, clean Impressionist palette: no black, no earths but a little ochre, much white. */
const IMPRESSIONIST = [
  '#fbf6ea', '#f6e6b4', '#f4d35e', '#f2b25a', '#ec8a5a', '#e8949a', '#d47fa6', '#b498d2', '#8a7aca', '#6f8fd8',
  '#8cc2e2', '#4a64b2', '#5aa88a', '#8cc06a', '#3f7a5a', '#cadb92', '#f2caa8', '#d6b27a', '#2e4078', '#5a4078',
];
/** Seurat's pure colours and their tints with white. Nothing else is mixed. */
const SEURAT = [
  '#1a2058', '#2a3a9a', '#3f6fd0', '#6aaee6', '#1f6a52', '#2f9a5a', '#a8c83a', '#f2cf3a', '#f08a2a', '#e0432a',
  '#c0306a', '#7a4aa8', '#f8f4e8', '#e8b48a', '#f6e49a', '#f6c48a', '#cfe08a', '#b0cff0', '#f2b8c8', '#c99a4a',
  '#9a7ac8',
];
/** Giverny: water blues and lilacs, willow and lily greens, blossom pinks, sun-gold. */
const MONET = [
  '#5b6fb5', '#7d8fd0', '#9db5e0', '#6aa0a8', '#b7a6d8', '#d9c8e8', '#8fb8a8', '#a6c4e8', '#c8b0d8', '#5f8f4a',
  '#7fae5a', '#3f6f4a', '#9cc070', '#6f9a7a', '#b4cc78', '#f0a0b8', '#f7d0dc', '#fff2f4', '#e88aa0', '#f2d27a',
  '#e8b85a', '#fff0c8', '#2f4a5a', '#3a3f78',
];
const LEAVES = ['#5f8f4a', '#7fae5a', '#3f6f4a', '#9cc070', '#6f9a7a', '#b4cc78'];
const BLOSSOM = ['#f0a0b8', '#f7d0dc', '#fff2f4', '#e88aa0'];

/**
 * Under the idea's palette the painter's light takes its ink (the light and the sky that pulls toward
 * it), the shadow and the water its second colour, and the canvas priming is tinted toward its ground.
 * The paint box itself (Impressionist, Seurat, Giverny) and the broken-colour touches stay: they are
 * the tradition, and they still divide whatever colour is asked of them.
 */
const LIGHT_ROLES: Record<string, PaletteRole> = { light: 'ink', sky: 'ink', shadow: 'second', water: 'second' };
const bytesOf = (code: string) => [1, 3, 5].map((i) => parseInt(code.slice(i, i + 2), 16)) as [number, number, number];
const codeOf = (c: readonly number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

const CANVASES = {
  white: { say: 'A white primed canvas: bright specks between the touches make the whole picture glow.', tone: '#f3f0e8', weave: 0.035 },
  cream: { say: 'A cream-primed canvas: warm, soft light between the touches.', tone: '#ece0c6', weave: 0.04 },
  linen: { say: 'Raw unbleached linen: a tan, coarse weave that shows through wherever the paint is thin.', tone: '#c4ad87', weave: 0.09 },
  rose: { say: 'A canvas toned with a rose-pink ground: warmth glowing up through every gap.', tone: '#e8c9bb', weave: 0.04 },
  border: {
    say: 'White canvas with its own painted border of dark dots in the opposite colours, the way Seurat framed his pictures.',
    tone: '#f3f0e8',
    weave: 0.035,
  },
} as const;

const STATES = {
  finished: 'Finished and signed in the corner, covered edge to edge.',
  study: 'A quick study made outdoors in one sitting: the touches thin out toward the margins and bare canvas shows at the edges.',
  wet: 'Still wet on the easel: the paint glistens and every ridge catches the light.',
  faded: 'A century later: the fugitive pigments have changed, lake reds faded pale and bright yellows dulled toward olive, as happened to Seurat’s own canvases.',
} as const;

const describe = <T extends Record<string, { say: string }>>(table: T) =>
  Object.fromEntries(Object.entries(table).map(([key, value]) => [key, value.say])) as Record<keyof T & string, string>;

export default defineLook({
  questions: {
    tradition: choice('Which tradition of broken colour is it painted in?', {
      impressionist:
        'Impressionist, 1870s: short pastel dabs and commas laid side by side, light shimmering on every surface, violet shadows, soft edges, painted outdoors at speed.',
      pointillist:
        'Pointillist, after Seurat: equal round dots of pure colour placed side by side in proportion, complementary dots in the shadows. Still, patient, luminous, a little like mosaic.',
      'water-garden':
        'Monet’s water garden at Giverny: short horizontal strokes in blue-green and lilac with touches of sun-gold, the scene mirrored and broken on still water among lily pads.',
    }),
    touch: score('How big is each touch of paint?', ['Fine as grains of rice', 'Small', 'Medium, like a fingertip', 'Broad', 'Bold as a thumb']),
    division: score('How strictly is the colour divided?', [
      'Loosely: touches of nearly the local colour, blended where they meet',
      'Partly divided',
      'Clearly divided into neighbouring hues',
      'Strictly: only pure colours side by side, every grey built from a pair of opposites',
    ]),
    palette: choice('What light is it painted in? Its colours come from the picture\u2019s palette.', describe(LIGHTS)),
    water: noul('Does the ground become water, with the scene reflected and broken on its surface?'),
    edges: score('How soft are the edges of things?', [
      'Crisp: every form keeps its outline',
      'Firm',
      'Soft',
      'Dissolved: forms melt into the air around them',
    ]),
    canvas: choice('What is it painted on?', describe(CANVASES)),
    body: score('How thick is the paint?', ['Thin and dry, the weave showing through', 'Light', 'Buttery', 'Thick impasto, every touch a ridge']),
    state: choice('What state is the painting in now?', STATES),
  },

  async apply(capture, answers, context, signal) {
    const size = capture.size;
    const N = size * size;
    const mood = context.mood;
    const random = seeded((context.seed ^ 0x2b0c01) >>> 0);
    const dots = answers.tradition === 'pointillist';
    const garden = answers.tradition === 'water-garden';
    const inks = context.palette;
    const designed = LIGHTS[answers.palette];
    const keyed = rekey({ light: bytesOf(designed.light), sky: bytesOf(designed.sky), shadow: bytesOf(designed.shadow), water: bytesOf(designed.water) }, inks, LIGHT_ROLES);
    const P = inks
      ? { ...designed, light: codeOf(keyed.light), sky: codeOf(keyed.sky), shadow: codeOf(keyed.shadow), water: codeOf(keyed.water) }
      : designed;
    const sheet = CANVASES[answers.canvas];
    const canvasTone = inks ? codeOf(rekeyOne(bytesOf(sheet.tone), inks, 'ground')) : sheet.tone;
    const state = answers.state;
    let beats = 0;
    const breathe = async () => {
      if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
      if (++beats % 6 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    };

    // ---- read the capture ---------------------------------------------------------------------
    const ids = new Uint8Array(N);
    const counts = new Uint32Array(256);
    const depth = new Float32Array(N);
    const nrm = new Float32Array(N * 3);
    const src = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const id = capture.identity[i * 4];
      ids[i] = id;
      counts[id]++;
      depth[i] = id === 0 ? 1 : capture.depth[i * 4] / 255 + capture.depth[i * 4 + 1] / 65280 + capture.depth[i * 4 + 2] / 16711680;
      nrm[i * 3] = capture.normal[i * 4] / 127.5 - 1;
      nrm[i * 3 + 1] = capture.normal[i * 4 + 1] / 127.5 - 1;
      nrm[i * 3 + 2] = capture.normal[i * 4 + 2] / 127.5 - 1;
      linearToLab(LINEAR[capture.color[i * 4]], LINEAR[capture.color[i * 4 + 1]], LINEAR[capture.color[i * 4 + 2]], src, i * 3);
    }
    for (let c = 0; c < 3; c++) blur(src, size, 1, 3, c);
    await breathe();

    // plain light, normalised so 1 is fully lit
    const histogram = new Uint32Array(256);
    let solid = 0;
    for (let i = 0; i < N; i++)
      if (ids[i] >= 1) {
        histogram[capture.diffuse[i * 4]]++;
        solid++;
      }
    let whitePoint = 255;
    for (let acc = 0, v = 255; v >= 0; v--) {
      acc += histogram[v];
      if (acc > solid * 0.05) {
        whitePoint = Math.max(8, v);
        break;
      }
    }
    const [lx, ly, lz] = capture.light;
    const hl = Math.hypot(lx, ly, lz + 1) || 1;
    const lit = new Float32Array(N);
    const spec = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (ids[i] === 0) {
        lit[i] = 1;
        continue;
      }
      const d = capture.diffuse[i * 4] / whitePoint;
      lit[i] = smooth(0.28, 0.86, d);
      const facing = Math.max(0, (nrm[i * 3] * lx - nrm[i * 3 + 1] * ly + nrm[i * 3 + 2] * (lz + 1)) / hl);
      spec[i] = Math.pow(facing, 16) * clamp01(d * 1.2);
    }
    blur(lit, size, 1);

    // tonal range of the subject, and how far back it goes
    let lo = 0;
    let hi = 1;
    let dmin = 1;
    let dmax = 0;
    {
      const tones = new Uint32Array(256);
      for (let i = 0; i < N; i++)
        if (ids[i] >= 1) {
          tones[Math.max(0, Math.min(255, (src[i * 3] * 255) | 0))]++;
          if (depth[i] < dmin) dmin = depth[i];
          if (depth[i] > dmax) dmax = depth[i];
        }
      for (let acc = 0, v = 0; v < 256; v++) {
        acc += tones[v];
        if (acc > solid * 0.03) {
          lo = v / 255;
          break;
        }
      }
      for (let acc = 0, v = 255; v >= 0; v--) {
        acc += tones[v];
        if (acc > solid * 0.03) {
          hi = v / 255;
          break;
        }
      }
    }
    const range = Math.max(0.2, hi - lo);
    // a dark scene stays dark: the key drops with the frame's own middle tone
    let middle = 0.5;
    {
      const all = new Uint32Array(64);
      for (let i = 0; i < N; i += 3) all[Math.max(0, Math.min(63, (src[i * 3] * 63) | 0))]++;
      for (let acc = 0, v = 0; v < 64; v++) {
        acc += all[v];
        if (acc > N / 6) {
          middle = v / 63;
          break;
        }
      }
    }
    const darkness = smooth(0.55, 0.2, middle);
    const dspan = Math.max(1e-6, dmax - dmin);

    // ---- the light the painter sees ------------------------------------------------------------
    const lightC = hex(P.light);
    const shadowC = hex(P.shadow);
    const skyC = hex(P.sky);
    const waterC = hex(P.water);
    const day = (mood.daylight - 0.5) * 2;
    const dayTint = hex(day < 0 ? '#ffc2ba' : '#ffa862');
    for (let c = 0; c < 3; c++) lightC[c] = mix(lightC[c], dayTint[c], Math.abs(day) * 0.3);
    const warm = mood.warmth - 0.5;
    lightC[1] += warm * 0.03;
    lightC[2] += warm * 0.05;
    shadowC[1] += warm * 0.015;
    shadowC[2] += warm * 0.04;
    skyC[1] += warm * 0.012;
    skyC[2] += warm * 0.03;
    const gain = P.chroma * mix(0.8, 1.2, mood.cheer);
    const keyLo = P.key[0] - 0.2 * darkness;
    const keyHi = P.key[1] - 0.34 * darkness;

    const field = (rx: number, ry: number, passes = 2) => {
      const f = new Float32Array(N);
      for (let i = 0; i < N; i++) f[i] = random() - 0.5;
      for (let pass = 0; pass < passes; pass++) {
        blurAxis(f, size, rx, 0);
        blurAxis(f, size, ry, 1);
      }
      normalise(f);
      return f;
    };
    const cloudA = field(34, 34);
    const cloudB = field(28, 28);
    await breathe();

    const lmag = Math.hypot(lx, ly) || 1;
    const lxn = lx / lmag;
    const lyn = ly / lmag;
    /** The air: sky colour, warming toward the side the light comes from, never flat. */
    const atmos = (x: number, y: number, i: number, out: Buffer) => {
      const side = clamp01(0.5 + ((x / size - 0.5) * lxn + (y / size - 0.5) * lyn) * 1.5);
      const k = side * 0.6;
      out[0] = mix(keyHi - 0.1, keyHi - 0.01, side) + cloudA[i] * 0.03;
      out[1] = mix(skyC[1], lightC[1], k) + cloudA[i] * 0.012 + cloudB[i] * 0.016;
      out[2] = mix(skyC[2], lightC[2], k) + cloudB[i] * 0.022;
    };

    const T = new Float32Array(N * 3);
    const tmp = [0, 0, 0];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const o = i * 3;
        let L = Math.max(mix(keyLo, keyHi, Math.pow(clamp01((src[o] - lo) / range), P.gamma)), src[o] * 0.85);
        const li = lit[i];
        let a = src[o + 1] * gain + mix(shadowC[1], lightC[1], li) * P.tint;
        let b = src[o + 2] * gain + mix(shadowC[2], lightC[2], li) * P.tint;
        if (ids[i] === 0) {
          atmos(x, y, i, tmp);
          L = mix(src[o], L, 0.6);
          const w = clamp01(0.88 - Math.hypot(src[o + 1], src[o + 2]) * 6) * smooth(0.25, 0.6, src[o]);
          L = mix(L, tmp[0], w);
          a = mix(a, tmp[1], w);
          b = mix(b, tmp[2], w);
        } else {
          const f = clamp01((depth[i] - dmin) / dspan) * P.aerial * (ids[i] >= 3 ? 0.5 : 1);
          if (f > 0.002) {
            atmos(x, y, i, tmp);
            L = mix(L, tmp[0], f);
            a = mix(a, tmp[1], f);
            b = mix(b, tmp[2], f);
          }
        }
        T[o] = L;
        T[o + 1] = a;
        T[o + 2] = b;
      }
    await breathe();

    // ---- the ground as water: reflections broken on its surface ------------------------------
    const water = new Uint8Array(N);
    let waterCount = 0;
    const nG = [0, 1, 0];
    if (answers.water && counts[1] > N * 0.01) {
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (let i = 0; i < N; i++)
        if (ids[i] === 1 && nrm[i * 3 + 1] > 0.2) {
          sx += nrm[i * 3];
          sy += nrm[i * 3 + 1];
          sz += nrm[i * 3 + 2];
        }
      for (let round = 0; round < 2; round++) {
        const len = Math.hypot(sx, sy, sz) || 1;
        nG[0] = sx / len;
        nG[1] = sy / len;
        nG[2] = sz / len;
        sx = sy = sz = 0;
        for (let i = 0; i < N; i++)
          if (ids[i] === 1 && nrm[i * 3] * nG[0] + nrm[i * 3 + 1] * nG[1] + nrm[i * 3 + 2] * nG[2] > 0.9) {
            sx += nrm[i * 3];
            sy += nrm[i * 3 + 1];
            sz += nrm[i * 3 + 2];
          }
      }
      if (nG[1] > 0.15) {
        const pws = capture.pixelWorldSize;
        const near = capture.near;
        const span = capture.far - capture.near;
        const height = (i: number) => {
          const x = i % size;
          const y = (i / size) | 0;
          return (x + 0.5 - size / 2) * pws * nG[0] + (size / 2 - y - 0.5) * pws * nG[1] - (near + depth[i] * span) * nG[2];
        };
        const flat = (i: number) => nrm[i * 3] * nG[0] + nrm[i * 3 + 1] * nG[1] + nrm[i * 3 + 2] * nG[2] > 0.9;
        const levels: number[] = [];
        for (let i = 0; i < N; i += 5) if (ids[i] === 1 && flat(i)) levels.push(height(i));
        levels.sort((p, q) => p - q);
        const plane = levels[levels.length >> 1] ?? 0;
        const tol = Math.max(pws * 3, size * pws * 0.02);
        for (let i = 0; i < N; i++)
          if (ids[i] === 1 && flat(i) && Math.abs(height(i) - plane) < tol) {
            water[i] = 1;
            waterCount++;
          }
        if (waterCount < N * 0.01) {
          water.fill(0);
          waterCount = 0;
        }
        if (waterCount) {
          // mirror every thing pixel through the plane and keep the nearest image on each water pixel
          const refl = new Float32Array(N * 3);
          const reflZ = new Float32Array(N).fill(-Infinity);
          for (let i = 0; i < N; i++) {
            if (ids[i] < 2) continue;
            const x = i % size;
            const y = (i / size) | 0;
            const px = (x + 0.5 - size / 2) * pws;
            const py = (size / 2 - y - 0.5) * pws;
            const pz = -(near + depth[i] * span);
            const h = px * nG[0] + py * nG[1] + pz * nG[2] - plane;
            if (h < -tol) continue;
            const rx = px - 2 * h * nG[0];
            const ry = py - 2 * h * nG[1];
            const rz = pz - 2 * h * nG[2];
            const qx = Math.round(rx / pws + size / 2 - 0.5);
            const qy = Math.round(size / 2 - 0.5 - ry / pws);
            if (qx < 0 || qy < 0 || qx >= size || qy >= size) continue;
            const j = qy * size + qx;
            if (!water[j] || rz <= reflZ[j]) continue;
            reflZ[j] = rz;
            refl[j * 3] = T[i * 3];
            refl[j * 3 + 1] = T[i * 3 + 1];
            refl[j * 3 + 2] = T[i * 3 + 2];
          }
          for (let pass = 0; pass < 2; pass++)
            for (let y = 1; y < size - 1; y++)
              for (let x = 1; x < size - 1; x++) {
                const j = y * size + x;
                if (!water[j] || reflZ[j] > -Infinity) continue;
                let n = 0;
                let r0 = 0;
                let r1 = 0;
                let r2 = 0;
                for (const k of [j - 1, j + 1, j - size, j + size]) {
                  if (reflZ[k] === -Infinity) continue;
                  n++;
                  r0 += refl[k * 3];
                  r1 += refl[k * 3 + 1];
                  r2 += refl[k * 3 + 2];
                }
                if (n < 2) continue;
                reflZ[j] = 0;
                refl[j * 3] = r0 / n;
                refl[j * 3 + 1] = r1 / n;
                refl[j * 3 + 2] = r2 / n;
              }
          await breathe();

          const band = field(40, 3);
          const gaps = field(20, 3);
          const ripple = Math.min(10, mix(1.2, 6.5, mood.energy) * Math.max(0.7, size / 720));
          const ph1 = random() * 6.28;
          const ph2 = random() * 6.28;
          for (let y = 0; y < size; y++)
            for (let x = 0; x < size; x++) {
              const j = y * size + x;
              if (!water[j]) continue;
              const f = clamp01((depth[j] - dmin) / dspan);
              atmos(x, y, j, tmp);
              const sky = clamp01(0.28 + 0.3 * f + band[j] * 0.3) * mix(0.5, 1, lit[j]);
              const wl = waterC[0] * mix(0.8, 1, lit[j]) + band[j] * 0.03;
              let L = mix(wl, tmp[0], sky);
              let a = mix(waterC[1] + cloudA[j] * 0.01, tmp[1], sky);
              let b = mix(waterC[2] + cloudB[j] * 0.012, tmp[2], sky);
              const off = Math.round(ripple * (Math.sin(y * 0.55 + ph1) * 0.6 + Math.sin(y * 0.21 + x * 0.013 + ph2) * 0.4));
              const k = y * size + Math.max(0, Math.min(size - 1, x + off));
              if (reflZ[k] > -Infinity && gaps[j] > -1.25) {
                const m = 0.82;
                L = mix(L, refl[k * 3] * 0.86 + 0.02, m);
                a = mix(a, mix(refl[k * 3 + 1], waterC[1], 0.4), m);
                b = mix(b, mix(refl[k * 3 + 2], waterC[2], 0.4), m);
              }
              T[j * 3] = L;
              T[j * 3 + 1] = a;
              T[j * 3 + 2] = b;
            }

          // Giverny: lily pads and their flowers floating on the water
          if (garden) {
            const gx = nG[0];
            const gy = -nG[1];
            const gl = Math.hypot(gx, gy);
            const ux = gl < 0.05 ? 1 : -gy / gl;
            const uy = gl < 0.05 ? 0 : gx / gl;
            const ratio = Math.max(0.22, Math.min(1, Math.abs(nG[2])));
            const want = Math.round(mix(5, 14, mood.density) * Math.max(0.4, Math.min(1.6, waterCount / (N * 0.15))));
            const scale = Math.max(0.7, Math.min(1.5, mix(10, 36, answers.touch) / 20)) * (size / 720);
            const leaves = LEAVES.map(hex);
            const blossom = BLOSSOM.map(hex);
            const gold = hex('#f2d27a');
            let placed = 0;
            for (let attempt = 0; attempt < want * 30 && placed < want; attempt++) {
              const cx = random() * size;
              const cy = random() * size;
              const c0 = (cy | 0) * size + (cx | 0);
              if (!water[c0]) continue;
              placed++;
              const rad = mix(15, 34, random()) * scale;
              const leaf = leaves[(random() * leaves.length) | 0];
              const notch = random() * Math.PI * 2;
              const flower = random() < 0.55;
              const petal = blossom[(random() * blossom.length) | 0];
              const reachPx = Math.ceil(rad) + 2;
              for (let y = Math.max(0, (cy - reachPx) | 0); y < Math.min(size, cy + reachPx); y++)
                for (let x = Math.max(0, (cx - reachPx) | 0); x < Math.min(size, cx + reachPx); x++) {
                  const j = y * size + x;
                  if (!water[j]) continue;
                  const du = (x - cx) * ux + (y - cy) * uy;
                  const dv = (-(x - cx) * uy + (y - cy) * ux) / ratio;
                  const d = Math.hypot(du, dv) / rad;
                  if (d > 1) continue;
                  let wedge = Math.atan2(dv, du) - notch;
                  wedge = Math.atan2(Math.sin(wedge), Math.cos(wedge));
                  if (Math.abs(wedge) < 0.22 && d > 0.08) continue;
                  const shade = mix(0.78, 1, lit[j]);
                  let L = leaf[0] * shade + 0.07 + 0.04 * (1 - d) - 0.03 * Math.cos(wedge * 6) * d;
                  let a = leaf[1];
                  let b = leaf[2];
                  if (flower) {
                    const fd = Math.hypot(du + rad * 0.15, dv * ratio + rad * 0.25) / (rad * 0.48);
                    if (fd < 1) {
                      const c = fd < 0.32 ? gold : petal;
                      L = c[0] * mix(0.86, 1, lit[j]);
                      a = c[1];
                      b = c[2];
                    }
                  }
                  T[j * 3] = L;
                  T[j * 3 + 1] = a * gain * 0.8;
                  T[j * 3 + 2] = b * gain * 0.8;
                }
            }
          }
        }
      }
    }
    await breathe();

    // ---- silhouettes: behind a nearer form the air or ground darkens and cools ------------------
    {
      const behind = depth.slice();
      blur(behind, size, 5, 1, 0, 2);
      const k = mix(0.2, 0.1, answers.edges);
      for (let i = 0; i < N; i++) {
        const occ = smooth(0.004, 0.05, (depth[i] - behind[i]) / dspan) * (ids[i] === 0 ? 0.6 : 1);
        if (occ <= 0) continue;
        T[i * 3] -= occ * k;
        T[i * 3 + 1] = mix(T[i * 3 + 1], shadowC[1], occ * 0.3);
        T[i * 3 + 2] = mix(T[i * 3 + 2], shadowC[2], occ * 0.3);
      }
    }

    // ---- where the edges are, and how far each pixel lies from one --------------------------------
    // Structural edges (a change of identity or a break in depth) are silhouettes; texture edges
    // (creases and changes of colour) are the drawing inside a form. No touch grows much past either.
    const edgeS = new Float32Array(N).fill(1e4);
    const edgeT = new Float32Array(N).fill(1e4);
    {
      const gap = dspan * 0.03;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          for (let dir = 0; dir < 2; dir++) {
            if (dir === 0 ? x >= size - 2 : y >= size - 2) continue;
            const j = dir === 0 ? i + 1 : i + size;
            const j2 = dir === 0 ? i + 2 : i + 2 * size;
            if (ids[i] !== ids[j] || (ids[i] > 0 && Math.abs(depth[i] - depth[j]) > gap)) {
              edgeS[i] = 0;
              edgeS[j] = 0;
              continue;
            }
            if (ids[i] === 0) continue;
            const dot = water[i] ? 1 : nrm[i * 3] * nrm[j * 3] + nrm[i * 3 + 1] * nrm[j * 3 + 1] + nrm[i * 3 + 2] * nrm[j * 3 + 2];
            if (dot < 0.82) {
              edgeT[i] = 0;
              edgeT[j] = 0;
              continue;
            }
            if (ids[j2] !== ids[i]) continue;
            const dc = Math.abs(T[i * 3] - T[j2 * 3]) * 1.6 + Math.abs(T[i * 3 + 1] - T[j2 * 3 + 1]) + Math.abs(T[i * 3 + 2] - T[j2 * 3 + 2]);
            if (dc > 0.075) edgeT[j] = 0;
          }
        }
      chamfer(edgeS, size);
      chamfer(edgeT, size);
    }
    /** How many pixels across each form is: small things need small, careful touches. */
    const extent = new Float32Array(256);
    for (let id = 0; id < 256; id++) extent[id] = id < 3 ? 1e4 : Math.sqrt(counts[id]);
    const meanDepth = new Float64Array(256);
    const boxes = Array.from({ length: 256 }, () => [size, size, -1, -1]);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const id = ids[i];
        meanDepth[id] += depth[i];
        const box = boxes[id];
        if (x < box[0]) box[0] = x;
        if (y < box[1]) box[1] = y;
        if (x > box[2]) box[2] = x;
        if (y > box[3]) box[3] = y;
      }
    await breathe();

    // Irradiation, after Chevreul and Seurat: at a boundary each tone is pushed away from its
    // neighbour, lights lighter and darks darker, so the masses hold however broken the colour.
    {
      const Lb = new Float32Array(N);
      for (let i = 0; i < N; i++) Lb[i] = T[i * 3];
      blur(Lb, size, 5, 1, 0, 2);
      const k = dots ? mix(0.35, 0.8, answers.division) : mix(0.25, 0.45, answers.division);
      for (let i = 0; i < N; i++) {
        const near = 1 + 0.7 * Math.exp(-edgeS[i] / 3);
        T[i * 3] = Math.max(0.06, Math.min(1, T[i * 3] + (T[i * 3] - Lb[i]) * k * near));
      }
    }
    // A small thing such as a person is set apart from what surrounds it: if the two are close in
    // value, the thing is pushed away from its surround and a faint halo of the opposite value is laid
    // around it, the way Seurat separated his figures from the grass.
    for (let id = 3; id < 256; id++) {
      if (!counts[id] || extent[id] > 120) continue;
      const small = smooth(120, 35, extent[id]);
      const r = 5;
      const [bx0, by0, bx1, by1] = boxes[id];
      const x0 = Math.max(0, bx0 - r);
      const y0 = Math.max(0, by0 - r);
      const w = Math.min(size - 1, bx1 + r) - x0 + 1;
      const h = Math.min(size - 1, by1 + r) - y0 + 1;
      const near = new Float32Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) near[y * w + x] = ids[(y0 + y) * size + x0 + x] === id ? 1 : 0;
      // a separable box blur over a w × h window
      {
        const tmpRow = new Float32Array(Math.max(w, h));
        for (let pass = 0; pass < 2; pass++) {
          const len = pass === 0 ? w : h;
          const lines = pass === 0 ? h : w;
          for (let l = 0; l < lines; l++) {
            for (let k = 0; k < len; k++) tmpRow[k] = near[pass === 0 ? l * w + k : k * w + l];
            for (let k = 0; k < len; k++) {
              let sum = 0;
              for (let q = Math.max(0, k - r); q <= Math.min(len - 1, k + r); q++) sum += tmpRow[q];
              near[pass === 0 ? l * w + k : k * w + l] = sum / (2 * r + 1);
            }
          }
        }
      }
      let inL = 0;
      let inN = 0;
      let outL = 0;
      let outW = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = (y0 + y) * size + x0 + x;
          if (ids[i] === id) {
            inL += T[i * 3];
            inN++;
          } else if (near[y * w + x] > 0) {
            outL += T[i * 3] * near[y * w + x];
            outW += near[y * w + x];
          }
        }
      if (!inN || outW < 1) continue;
      inL /= inN;
      outL /= outW;
      const diff = inL - outL;
      const want = 0.17 * small;
      if (Math.abs(diff) >= want) continue;
      const sign = Math.abs(diff) > 0.01 ? Math.sign(diff) : outL > 0.5 ? -1 : 1;
      const shift = want - Math.abs(diff);
      const ownDepth = meanDepth[id] / counts[id];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = (y0 + y) * size + x0 + x;
          if (ids[i] === id) T[i * 3] = Math.max(0.06, Math.min(0.99, T[i * 3] + sign * shift * 0.7));
          else if (near[y * w + x] > 0 && depth[i] > ownDepth) T[i * 3] = Math.max(0.06, Math.min(0.99, T[i * 3] - sign * shift * 0.45 * Math.min(1, near[y * w + x] * 2)));
        }
    }

    // Soft edges melt big masses into each other; small things keep their outline.
    const soften = Math.round(answers.edges * 2.4);
    if (soften) {
      const U = T.slice();
      for (let c = 0; c < 3; c++) blur(U, size, soften, 3, c);
      for (let i = 0; i < N; i++) {
        const w = smooth(18, 80, extent[ids[i]]) * mix(0.55, 1, answers.edges);
        if (w <= 0) continue;
        T[i * 3] = mix(T[i * 3], U[i * 3], w);
        T[i * 3 + 1] = mix(T[i * 3 + 1], U[i * 3 + 1], w);
        T[i * 3 + 2] = mix(T[i * 3 + 2], U[i * 3 + 2], w);
      }
    }
    await breathe();

    // ---- which way the brush travels -------------------------------------------------------------
    const angle = new Float32Array(N);
    if (!dots) {
      const fx = new Float32Array(N);
      const fy = new Float32Array(N);
      const idTurn = new Float32Array(256);
      for (let k = 0; k < 256; k++) idTurn[k] = (random() - 0.5) * 0.9;
      const back = garden ? 0 : -0.62 + (random() - 0.5) * 0.3;
      const formWeight = garden ? 0.85 : 0.7;
      for (let i = 0; i < N; i++) {
        const id = ids[i];
        let flat: number;
        let follow = 0;
        let form = 0;
        if (id === 0) flat = back + cloudA[i] * (garden ? 0.06 : 0.45);
        else {
          const nx = nrm[i * 3];
          const ny = -nrm[i * 3 + 1];
          form = Math.atan2(nx, -ny);
          follow = smooth(0.15, 0.5, Math.hypot(nx, ny)) * formWeight;
          flat = id === 1 ? cloudB[i] * 0.12 : (garden ? 0 : -0.75) + idTurn[id];
        }
        fx[i] = follow * Math.cos(2 * form) + (1 - follow) * Math.cos(2 * flat);
        fy[i] = follow * Math.sin(2 * form) + (1 - follow) * Math.sin(2 * flat);
      }
      blur(fx, size, 3);
      blur(fy, size, 3);
      for (let i = 0; i < N; i++) {
        let t = 0.5 * Math.atan2(fy[i], fx[i]);
        if (water[i]) t = cloudB[i] * 0.04;
        else if (garden && ids[i] >= 1) t = Math.abs(Math.sin(t)) > 0.72 ? Math.PI / 2 + cloudA[i] * 0.08 : cloudA[i] * 0.06;
        angle[i] = t;
      }
    }

    // ---- how wide each form is, so small things take small touches -------------------------------
    const S = (dots ? mix(4.6, 13, answers.touch) : garden ? mix(10, 36, answers.touch) : mix(8, 30, answers.touch)) * (size / 720);
    const sMin = (dots ? 2.5 : garden ? 5 : 3.8) * Math.max(0.6, size / 720);
    const thick = new Float32Array(N).fill(1e4);
    {
      const dist = new Float32Array(N);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const id = ids[i];
          const edge =
            (x > 0 && ids[i - 1] !== id) || (x < size - 1 && ids[i + 1] !== id) || (y > 0 && ids[i - size] !== id) || (y < size - 1 && ids[i + size] !== id);
          dist[i] = edge ? 0.5 : 1e4;
        }
      chamfer(dist, size);
      const r = Math.min(16, Math.max(3, Math.round(S * 0.6)));
      const across = new Float32Array(N);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const id = ids[i];
          if (id < 2) continue;
          let m = dist[i];
          for (let k = Math.max(0, x - r); k <= Math.min(size - 1, x + r); k++) {
            const j = y * size + k;
            if (ids[j] === id && dist[j] > m) m = dist[j];
          }
          across[i] = m;
        }
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const id = ids[i];
          if (id < 2) continue;
          let m = across[i];
          for (let k = Math.max(0, y - r); k <= Math.min(size - 1, y + r); k++) {
            const j = k * size + x;
            if (ids[j] === id && across[j] > m) m = across[j];
          }
          thick[i] = m;
        }
    }
    // the largest touch each pixel can take without crossing a silhouette or the drawing within
    const sizeMap = new Float32Array(N);
    {
      const loose = mix(1, 1.4, answers.edges);
      for (let i = 0; i < N; i++) sizeMap[i] = Math.max(sMin, Math.min(2.1 * edgeS[i] + 2, (2.8 * edgeT[i] + 2.5) * loose));
    }
    await breathe();

    // ---- how much of the canvas is worked ----------------------------------------------------------
    const reach = new Float32Array(N).fill(1);
    if (state === 'study') {
      const wob = field(18, 18);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const m = Math.min(x, y, size - 1 - x, size - 1 - y) / size;
          const edge = 0.075 + wob[i] * 0.035;
          reach[i] = smooth(edge - 0.04, edge + 0.06, m) * (ids[i] === 0 ? 0.82 : 1);
        }
    }

    // ---- the canvas and the lay-in ------------------------------------------------------------------
    const tone = rgbOf(canvasTone);
    const paint = new Float32Array(N * 3);
    const height = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      paint[i * 3] = tone[0];
      paint[i * 3 + 1] = tone[1];
      paint[i * 3 + 2] = tone[2];
    }
    {
      const U = T.slice();
      const r = Math.max(2, Math.round(S * 0.5));
      for (let c = 0; c < 3; c++) blur(U, size, r, 3, c, 2);
      const strength = dots ? 0.6 : garden ? 0.72 : 0.62;
      const lift = dots ? 0.03 : 0.06;
      const rgb = [0, 0, 0];
      for (let i = 0; i < N; i++) {
        // broad inside a form, sharp at its silhouette, and dense in the darks so gaps never pale them
        const k = smooth(0, r * 1.5, edgeS[i]);
        const uL = mix(T[i * 3], U[i * 3], k);
        const al = clamp01(mix(strength, 0.92, smooth(0.72, 0.3, uL)) * reach[i] * (0.85 + 0.12 * cloudB[i]));
        if (al <= 0.005) continue;
        labToRgb(Math.min(1, uL + lift * smooth(0.3, 0.7, uL)), mix(T[i * 3 + 1], U[i * 3 + 1], k) * 0.8, mix(T[i * 3 + 2], U[i * 3 + 2], k) * 0.8, rgb, 0, false);
        paint[i * 3] = mix(paint[i * 3], rgb[0], al);
        paint[i * 3 + 1] = mix(paint[i * 3 + 1], rgb[1], al);
        paint[i * 3 + 2] = mix(paint[i * 3 + 2], rgb[2], al);
      }
    }
    await breathe();

    // ---- the order of work: air, ground, then things from the back -------------------------------
    const order: number[] = [];
    for (let id = 0; id < 256; id++) if (counts[id] > 0) order.push(id);
    order.sort((p, q) => (p < 2 || q < 2 ? p - q : meanDepth[q] / counts[q] - meanDepth[p] / counts[p]));
    const rank = new Int16Array(256);
    order.forEach((id, n) => (rank[id] = n));

    // ---- the colours on the palette, and how a wanted colour is divided -------------------------
    const palette = (dots ? SEURAT : [...(garden ? MONET : IMPRESSIONIST), ...P.extra, P.light, P.shadow]).map(hex);
    const strict = dots ? mix(0.55, 1, answers.division) : answers.division * (garden ? 0.8 : 0.86);
    const lambda = mix(0.5, 0.04, answers.division);
    const cache = new Map<number, number>();
    const decompose = (L: number, a: number, b: number) => {
      const qL = Math.max(0, Math.min(63, Math.round(L * 63)));
      const qa = Math.max(0, Math.min(63, Math.round((a + 0.32) * 100)));
      const qb = Math.max(0, Math.min(63, Math.round((b + 0.32) * 100)));
      const key = (qL << 12) | (qa << 6) | qb;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const tL = (qL / 63) * 2;
      const ta = qa / 100 - 0.32;
      const tb = qb / 100 - 0.32;
      let best = Infinity;
      let bi = 0;
      let bj = 0;
      let bw = 1;
      for (let i = 0; i < palette.length; i++) {
        const p = palette[i];
        const dL = p[0] * 2 - tL;
        const da = p[1] - ta;
        const db = p[2] - tb;
        const d = dL * dL + da * da + db * db;
        if (d < best) {
          best = d;
          bi = bj = i;
          bw = 1;
        }
      }
      for (let i = 0; i < palette.length; i++)
        for (let j = i + 1; j < palette.length; j++) {
          const p = palette[i];
          const q = palette[j];
          const eL = (p[0] - q[0]) * 2;
          const ea = p[1] - q[1];
          const eb = p[2] - q[2];
          const ee = eL * eL + ea * ea + eb * eb;
          const vL = tL - q[0] * 2;
          const va = ta - q[1];
          const vb = tb - q[2];
          const w = Math.max(0.15, Math.min(0.85, (vL * eL + va * ea + vb * eb) / (ee + 1e-9)));
          const rL = vL - w * eL;
          const ra = va - w * ea;
          const rb = vb - w * eb;
          const d = rL * rL + ra * ra + rb * rb + lambda * ee * 0.25;
          if (d < best) {
            best = d;
            bi = i;
            bj = j;
            bw = w;
          }
        }
      const code = bi | (bj << 8) | (Math.round(bw * 255) << 16);
      cache.set(key, code);
      return code;
    };

    // The touches a colour is broken into: hue offsets that average back to the colour seen,
    // the warm ones favoured in the light and the cool ones in shadow.
    const breakHues = (garden ? ['#8fb8a8', '#b7a6d8', '#f2d27a', '#9cc070', '#9db5e0', '#f0a0b8'] : P.breaks).map(hex);
    let meanA = 0;
    let meanB = 0;
    for (const h of breakHues) {
      meanA += h[1] / breakHues.length;
      meanB += h[2] / breakHues.length;
    }
    const warmA = lightC[1] - shadowC[1];
    const warmB = lightC[2] - shadowC[2];
    const warmLen = Math.hypot(warmA, warmB) || 1;
    const magnitude =
      (dots ? mix(0.035, 0.08, answers.division) : garden ? mix(0.03, 0.065, answers.division) : mix(0.03, 0.07, answers.division)) * P.breaking;
    const offA: number[] = [];
    const offB: number[] = [];
    const offL: number[] = [];
    const offWarm: number[] = [];
    for (const h of breakHues) {
      const da = h[1] - meanA;
      const db = h[2] - meanB;
      const len = Math.hypot(da, db) || 1;
      const w = (da * warmA + db * warmB) / (len * warmLen);
      offA.push((da / len) * magnitude);
      offB.push((db / len) * magnitude);
      offL.push(w * (dots ? 0.03 : 0.045));
      offWarm.push(w);
    }
    const weights = new Float32Array(breakHues.length);

    const faded = state === 'faded';
    const spread = mix(0.4, 0.2, answers.division);
    const compShadow = dots ? mix(0.06, 0.24, answers.division) : garden ? 0.14 : 0.2;
    const compContrast = dots ? mix(0.02, 0.07, answers.division) : mix(0.005, 0.03, answers.division);
    const lightFleck = dots ? 0.08 : 0.12;
    const col = [0, 0, 0];
    /** Choose the paint for one touch: the colour seen there, broken, and divided onto the palette. */
    const pick = (i: number, accent: number, fine = 0) => {
      const o = i * 3;
      const id = ids[i];
      // the air is laid in close, quiet touches; small careful touches stay near the local colour
      const calm = (id === 0 ? 0.45 : 1) * mix(1, 0.4, fine);
      let L = T[o] + (random() - 0.5) * 0.08 * calm;
      let a = T[o + 1] + (random() - 0.5) * 0.03 * calm;
      let b = T[o + 2] + (random() - 0.5) * 0.03 * calm;
      const turn = (random() - 0.5) * spread * calm;
      const ct = Math.cos(turn);
      const st = Math.sin(turn);
      const ta = a * ct - b * st;
      b = a * st + b * ct;
      a = ta;
      {
        let total = 0;
        const bias = (lit[i] - 0.5) * 1.8;
        for (let k = 0; k < weights.length; k++) total += weights[k] = Math.max(0.1, 1 + offWarm[k] * bias);
        let r = random() * total;
        let k = 0;
        while (k < weights.length - 1 && (r -= weights[k]) > 0) k++;
        L += offL[k] * calm;
        a += offA[k] * calm;
        b += offB[k] * calm;
      }
      const shade = id === 0 ? 0 : 1 - lit[i];
      const u = random();
      const pS = compShadow * shade * calm;
      const pC = pS + compContrast * (1 + accent * 0.5) * calm;
      const pL = pC + lightFleck * lit[i] * smooth(0.55, 0.9, T[o]) * (id === 0 ? 0.5 : 1) * calm;
      if (u < pS) {
        L *= 0.94;
        a = shadowC[1] * 1.3;
        b = shadowC[2] * 1.3;
      } else if (u < pC) {
        const c = Math.hypot(a, b);
        if (c > 0.03) {
          a = -a * (dots ? 1.2 : 0.85);
          b = -b * (dots ? 1.2 : 0.85);
          L = mix(L, 0.62, 0.15);
        } else {
          a = shadowC[1];
          b = shadowC[2];
        }
      } else if (u < pL) {
        L = Math.min(0.99, L + 0.06);
        a = lightC[1] * 1.3;
        b = lightC[2] * 1.3;
      }
      const sharp = strict * mix(1, 0.55, fine) * (id === 0 ? 0.6 : 1);
      if (sharp > 0.01) {
        const code = decompose(L, a, b);
        const p = palette[random() < (code >>> 16) / 255 ? code & 255 : (code >>> 8) & 255];
        L = mix(L, p[0], sharp);
        a = mix(a, p[1], sharp);
        b = mix(b, p[2], sharp);
      }
      if (faded) {
        const c = Math.hypot(a, b);
        const h = Math.atan2(b, a);
        // lake reds and violets fade toward pink and white
        const red = clamp01(1 - Math.abs(Math.atan2(Math.sin(h - 0.05), Math.cos(h - 0.05))) / 0.85) * smooth(0.02, 0.08, c);
        // chrome and zinc yellows darken toward olive
        const yel = clamp01(1 - Math.abs(Math.atan2(Math.sin(h - 1.85), Math.cos(h - 1.85))) / 0.45) * smooth(0.03, 0.1, c);
        const c2 = c * (1 - 0.55 * red) * (1 - 0.3 * yel);
        const h2 = h + 0.35 * yel;
        L = L + 0.07 * red - 0.13 * yel;
        a = Math.cos(h2) * c2;
        b = Math.sin(h2) * c2;
      }
      labToRgb(L, a, b, col, 0);
    };

    // ---- the touch itself ---------------------------------------------------------------------------
    const soft = mix(0.6, 1.5, answers.edges);
    const spill = mix(0, 0.6, answers.edges);
    const bristle = new Float32Array(16);
    let bandWidth = 0;
    /** kind 0: a dab or comma, 1: a round dot, 2: a flat horizontal stroke. own -1 paints anywhere, -2 only the border. */
    const lay = (
      x: number, y: number, ang: number, a: number, b: number, curve: number,
      cr: number, cg: number, cb: number, alpha: number, own: number, kind: number, thickness: number,
    ) => {
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      // the touch's own box, turned with it, so long thin strokes visit only the pixels they can reach
      const Umax = kind === 1 ? 1.35 * a : 1.15 * a;
      const Vmax = kind === 1 ? 1.35 * b : 1.3 * b + Math.abs(curve) * 1.33 * a;
      const hx = Math.abs(ca) * Umax + Math.abs(sa) * Vmax + 1;
      const hy = Math.abs(sa) * Umax + Math.abs(ca) * Vmax + 1;
      const x0 = Math.max(0, Math.floor(x - hx));
      const x1 = Math.min(size - 1, Math.ceil(x + hx));
      const y0 = Math.max(0, Math.floor(y - hy));
      const y1 = Math.min(size - 1, Math.ceil(y + hy));
      const spillOwn = own >= 0 ? spill * smooth(18, 80, extent[own]) : 0;
      for (let k = 0; k < 16; k++) bristle[k] = random();
      const tail = random() < 0.5 ? 1 : -1;
      const phase = random() * 6.283;
      const cosPhase = Math.cos(phase);
      const sinPhase = Math.sin(phase);
      const ownRank = own >= 0 ? rank[own] : 999;
      const ragged = kind === 2 ? 0.5 : 0.32;
      const base = kind === 2 ? 0.55 : 0.72;
      for (let py = y0; py <= y1; py++) {
        const dy = py + 0.5 - y;
        for (let px = x0; px <= x1; px++) {
          const j = py * size + px;
          let foreign = false;
          if (own >= 0) {
            const q = ids[j];
            if (q !== own) {
              if (rank[q] >= ownRank || spillOwn <= 0.02) continue;
              foreign = true;
            }
          } else if (own === -2 && Math.min(px, py, size - 1 - px, size - 1 - py) >= bandWidth - 1) continue;
          const dx = px + 0.5 - x;
          const u = dx * ca + dy * sa;
          let v = -dx * sa + dy * ca;
          let cover: number;
          let h: number;
          if (kind === 1) {
            const d0 = Math.sqrt((u * u) / (a * a) + (v * v) / (b * b));
            if (d0 > 1.35) continue;
            // a slightly irregular round: sin(3θ + phase) without atan2
            const r = Math.sqrt(u * u + v * v) || 1;
            const cs = u / r;
            const sn = v / r;
            const s3 = sn * (3 - 4 * sn * sn);
            const c3 = cs * (4 * cs * cs - 3);
            const d = d0 / (1 + 0.09 * (s3 * cosPhase + c3 * sinPhase));
            cover = clamp01((1 - d) * b / soft + 0.5);
            h = Math.max(0, 1 - d * d);
          } else {
            v -= (curve * u * u) / a;
            const t = u / a;
            if (t < -1.15 || t > 1.15) continue;
            const acr = v / b;
            if (acr < -1.3 || acr > 1.3) continue;
            const bv = bristle[Math.min(15, Math.max(0, ((acr * 0.5 + 0.5) * 16) | 0))];
            const tt = t * tail;
            const w = tt > 0 ? 1 - 0.5 * tt * tt : Math.sqrt(Math.max(0, 1 - tt * tt * tt * tt));
            cover = clamp01((w * b - Math.abs(v)) / soft + 0.5);
            cover *= clamp01((1 - ragged * bv - tt) * a / soft + 0.5) * clamp01((1 + tt) * a / soft + 0.5);
            cover *= base + (1 - base) * bv;
            h = (0.55 + 0.45 * bv) * (0.7 + 0.3 * Math.abs(acr));
          }
          if (foreign) cover *= spillOwn;
          if (cover <= 0.02) continue;
          const al = cover * alpha;
          const keep = 1 - al;
          paint[j * 3] = paint[j * 3] * keep + cr * al;
          paint[j * 3 + 1] = paint[j * 3 + 1] * keep + cg * al;
          paint[j * 3 + 2] = paint[j * 3 + 2] * keep + cb * al;
          height[j] = height[j] * (1 - al * 0.6) + al * thickness * h;
        }
      }
    };

    // ---- touches, region by region, broad first then finer -----------------------------------------
    const kind = dots ? 1 : garden ? 2 : 0;
    const spacingFactor = dots ? 0.86 : garden ? 0.42 : 0.46;
    const extra = dots ? [0, 0.04, 0, 0, 0] : [0, 0.3, 0.05, 0.02, 0.02];
    const coverage = mix(1.12, 0.9, mood.density) * (state === 'study' ? 1.12 : 1);
    const jitter = dots ? 0.34 : 0.6;
    const angleJitter = mix(0.12, 0.55, mood.energy) * (garden ? 0.35 : 1);
    const thickness = mix(0.08, 0.6, answers.body);
    const alpha = dots ? 0.96 : garden ? 0.88 : 0.93;
    const thinK = dots ? 2.2 : garden ? 3 : 2.6;
    const scaleOf = (id: number) => {
      if (id === 0) return dots ? 1 : 1.12;
      if (id === 1) return 1;
      if (counts[id] / N > 0.22) return 0.9;
      return dots ? 0.8 : 0.72;
    };
    /** The broadest touch a region takes: a thing is never painted in marks wider than a sixth of itself. */
    const broadest = (id: number) => Math.max(sMin, Math.min(S * scaleOf(id), id >= 3 ? extent[id] / 6 : 1e4));
    /** How careful a touch is: the smallest touches, and every touch on a small thing such as a person. */
    const fineOf = (s: number, id: number) => Math.max(smooth(90, 25, extent[id]), 0.7 * clamp01((sMin * 2.2 - s) / (sMin * 1.2)));

    const touch = (x: number, y: number, i: number, s: number, level: number, own: number, alphaScale = 1) => {
      pick(i, level, fineOf(s, ids[i]));
      let ang: number;
      let a: number;
      let b: number;
      let curve = 0;
      if (kind === 1) {
        ang = random() * Math.PI;
        b = s * 0.5;
        a = b * (1 + random() * 0.22);
      } else if (kind === 2) {
        ang = angle[i] + (random() - 0.5) * angleJitter;
        a = s * 0.55;
        b = s * mix(0.12, 0.17, random());
        curve = (random() - 0.5) * 0.1;
      } else {
        ang = angle[i] + (random() - 0.5) * angleJitter;
        a = s * 0.5;
        b = s * mix(0.18, 0.25, random());
        curve = (random() - 0.5) * 0.5;
      }
      lay(x, y, ang, a, Math.max(b, 0.8), curve, col[0], col[1], col[2], alpha * alphaScale, own, kind, thickness * (level ? 0.85 : 1));
    };

    let laid = 0;
    for (const id of order) {
      const box = boxes[id];
      const sR = broadest(id);
      let levels = 1;
      while (levels < 5 && sR / (1 << levels) >= sMin * 0.85) levels++;
      for (let level = 0; level < levels; level++) {
        const sizeL = sR / (1 << level);
        const h = Math.max(1.2, sizeL * spacingFactor * coverage);
        const rowH = kind === 1 ? h * 0.866 : h;
        const ox = random() * h;
        const oy = random() * rowH;
        const list: number[] = [];
        let row = 0;
        for (let gy = box[1] - oy; gy <= box[3] + 1; gy += rowH, row++) {
          const shift = kind === 1 && row & 1 ? h / 2 : 0;
          for (let gx = box[0] - ox + shift; gx <= box[2] + 1; gx += h) {
            const x = gx + (random() - 0.5) * jitter * h;
            const y = gy + (random() - 0.5) * jitter * rowH;
            if (x < 0 || y < 0 || x >= size || y >= size) continue;
            const i = (y | 0) * size + (x | 0);
            if (ids[i] !== id) continue;
            if (reach[i] < 1 && random() > reach[i]) continue;
            let s = Math.min(sR, sizeMap[i]);
            if (id >= 2) s = Math.min(s, Math.max(sMin, thick[i] * thinK));
            s = Math.max(sMin, s);
            if (level > 0) {
              // a finer pass only where the broader one was too big, plus a few for variety
              const need = s < sizeL * 1.24;
              if (!need && random() > extra[level]) continue;
              s = Math.min(s, sizeL * 1.1);
            }
            // much finer than this pass: a later pass lays it
            if (level < levels - 1 && s < sizeL * 0.3) continue;
            list.push(x, y, i, s * (0.86 + random() * 0.28));
          }
        }
        const count = list.length / 4;
        for (let k = count - 1; k > 0; k--) {
          const j = (random() * (k + 1)) | 0;
          for (let c = 0; c < 4; c++) {
            const t = list[k * 4 + c];
            list[k * 4 + c] = list[j * 4 + c];
            list[j * 4 + c] = t;
          }
        }
        for (let k = 0; k < count; k++) {
          touch(list[k * 4], list[k * 4 + 1], list[k * 4 + 2], list[k * 4 + 3], level, id);
          if (++laid % 600 === 0) await breathe();
        }
      }
    }

    // ---- light struck on last: flecks of sun on lit surfaces, glints on the water -------------------
    if (!dots) {
      const amount = P.shimmer * mix(0.6, 1.3, mood.cheer);
      const tries = Math.round((amount * N * 1.5) / (S * S));
      const flick = [0, 0, 0];
      for (let n = 0; n < tries; n++) {
        const x = random() * size;
        const y = random() * size;
        const i = (y | 0) * size + (x | 0);
        const id = ids[i];
        if (reach[i] < random()) continue;
        const glow = id === 0 ? 0.3 + 0.4 * clamp01(cloudA[i]) : water[i] ? lit[i] * (0.4 + 0.5 * clamp01(T[i * 3] * 1.2 - 0.4)) : lit[i] * smooth(0.55, 0.92, T[i * 3]) + spec[i] * 0.8;
        if (glow < 0.4 + random() * 0.6) continue;
        const L = Math.min(0.99, T[i * 3] + 0.1);
        labToRgb(L, mix(T[i * 3 + 1], lightC[1] * 1.4, 0.7), mix(T[i * 3 + 2], lightC[2] * 1.4, 0.7), flick, 0);
        const s = Math.min(S * mix(0.32, 0.5, random()), broadest(id) * 0.7, sizeMap[i] * 0.8);
        const ang = water[i] ? 0 : angle[i] + (random() - 0.5) * angleJitter;
        lay(x, y, ang, s * (water[i] ? 0.7 : 0.5), s * (water[i] ? 0.13 : 0.2), 0, flick[0], flick[1], flick[2], 0.92, id, water[i] ? 2 : kind, thickness * 1.1);
        if (++laid % 600 === 0) await breathe();
      }
    }

    // ---- Seurat's painted border -------------------------------------------------------------------
    if (answers.canvas === 'border') {
      bandWidth = Math.round(size * 0.036);
      const B = bandWidth;
      const base = [0, 0, 0];
      labToRgb(0.33, -0.005, -0.1, base, 0);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const m = Math.min(x, y, size - 1 - x, size - 1 - y);
          if (m >= B) continue;
          const i = (y * size + x) * 3;
          paint[i] = mix(paint[i], base[0], 0.88);
          paint[i + 1] = mix(paint[i + 1], base[1], 0.88);
          paint[i + 2] = mix(paint[i + 2], base[2], 0.88);
        }
      const s = Math.min(B * 0.7, dots ? S : S * 0.5);
      const h = s * (dots ? 0.86 : 0.5);
      const save = [T[0], T[1], T[2]];
      for (let gy = h * random(); gy < size; gy += h * (dots ? 0.866 : 1))
        for (let gx = h * random(); gx < size; gx += h) {
          const x = gx + (random() - 0.5) * h * 0.5;
          const y = gy + (random() - 0.5) * h * 0.5;
          if (Math.min(x, y, size - 1 - x, size - 1 - y) >= B - 1 || x < 0 || y < 0 || x >= size || y >= size) continue;
          const ix = Math.max(B + 4, Math.min(size - B - 5, x)) | 0;
          const iy = Math.max(B + 4, Math.min(size - B - 5, y)) | 0;
          const o = (iy * size + ix) * 3;
          // the opposite of what it touches: lighter beside darks, darker beside lights, hue reversed
          const L = mix(0.6, 0.28, T[o]);
          T[0] = mix(L, 0.33, 0.3);
          T[1] = mix(-T[o + 1] * 1.4, -0.005, 0.3);
          T[2] = mix(-T[o + 2] * 1.4, -0.1, 0.3);
          pick(0, 1);
          const ang = dots ? random() * Math.PI : Math.abs(x - size / 2) > Math.abs(y - size / 2) ? Math.PI / 2 : 0;
          lay(x, y, ang, kind === 1 ? s * 0.5 : s * 0.5, kind === 1 ? s * 0.5 : s * 0.2, 0, col[0], col[1], col[2], 0.95, -2, kind === 2 ? 0 : kind, thickness);
        }
      T[0] = save[0];
      T[1] = save[1];
      T[2] = save[2];
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const m = Math.min(x, y, size - 1 - x, size - 1 - y);
          if (m < B - 1 || m > B + 1) continue;
          const i = y * size + x;
          const k = m === B ? 0.9 : 0.5;
          paint[i * 3] = mix(paint[i * 3], tone[0], k);
          paint[i * 3 + 1] = mix(paint[i * 3 + 1], tone[1], k);
          paint[i * 3 + 2] = mix(paint[i * 3 + 2], tone[2], k);
          height[i] *= 1 - k;
        }
      await breathe();
    }

    // ---- the signature ------------------------------------------------------------------------------
    if (state === 'finished') {
      const inset = bandWidth ? bandWidth + 10 : 16;
      const right = random() < 0.75;
      const width = size * mix(0.1, 0.15, random());
      let x = right ? size - inset - width : inset;
      const baseY = size - inset - 6;
      let y = baseY;
      const o = ((baseY | 0) * size + (x | 0)) * 3;
      const ink = [0, 0, 0];
      if (T[o] > 0.55) labToRgb(0.42, 0.12, 0.06, ink, 0);
      else labToRgb(0.95, 0.0, 0.03, ink, 0);
      const strokes = 10 + ((random() * 8) | 0);
      const pen = Math.max(0.7, size / 720);
      for (let n = 0; n < strokes; n++) {
        const up = n % 2 === 0;
        const len = mix(3.5, 9, random()) * pen * (random() < 0.15 ? 1.8 : 1);
        const ang = up ? -1.25 + (random() - 0.5) * 0.6 : 1.1 + (random() - 0.5) * 0.6;
        const dx = Math.cos(ang) * len;
        const dy = Math.sin(ang) * len;
        lay(x + dx / 2, y + dy / 2, ang, len / 2 + 0.6, 0.85 * pen, 0, ink[0], ink[1], ink[2], 0.9, -1, 0, 0.3);
        x += dx + width / strokes * 0.6;
        y += dy;
        y = mix(y, baseY, 0.35);
      }
      const swash = width * 0.9;
      lay(x - swash / 2, baseY + 5 * pen, -0.06, swash / 2, 0.8 * pen, 0.12, ink[0], ink[1], ink[2], 0.85, -1, 0, 0.3);
    }
    await breathe();

    // ---- the surface: relief of the paint, the weave, varnish and age ----------------------------
    blur(height, size, 1);
    const weave = new Float32Array(N);
    {
      const colJit = new Float32Array(size);
      const rowJit = new Float32Array(size);
      for (let k = 0; k < size; k++) {
        colJit[k] = random();
        rowJit[k] = random();
      }
      const slubA = field(1, 22, 1);
      const slubB = field(22, 1, 1);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const over = (((x / 2.4) | 0) + ((y / 2.4) | 0)) & 1;
          const thread = over ? Math.sin(x * 2.62 + rowJit[y] * 0.8) : Math.sin(y * 2.62 + colJit[x] * 0.8);
          weave[i] = thread * 0.55 + slubA[i] * 0.22 + slubB[i] * 0.22 + (random() - 0.5) * 0.35;
        }
    }
    const relief = mix(0.8, 2.5, answers.body) * (state === 'wet' ? 1.2 : 1);
    const sheen = state === 'wet' ? 0.22 : mix(0, 0.06, answers.body);
    const Ll = Math.hypot(-0.5, -0.62, 0.6);
    const Lx = -0.5 / Ll;
    const Ly = -0.62 / Ll;
    const Lz = 0.6 / Ll;
    const Hl = Math.hypot(Lx, Ly, Lz + 1);
    const Hx = Lx / Hl;
    const Hy = Ly / Hl;
    const Hz = (Lz + 1) / Hl;
    const age = smooth(0.45, 1, mood.wear) * 0.9 + (faded ? 0.25 : 0);

    // craquelure: a network of fine cracks once the paint is old
    let cracks: Float32Array | null = null;
    if (age > 0.12) {
      cracks = new Float32Array(N);
      const cell = 26 * (size / 720);
      const gw = Math.ceil(size / cell) + 2;
      const fx = new Float32Array(gw * gw);
      const fy = new Float32Array(gw * gw);
      for (let k = 0; k < gw * gw; k++) {
        fx[k] = random();
        fy[k] = random();
      }
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const cx = Math.floor(x / cell);
          const cy = Math.floor(y / cell);
          let f1 = 1e9;
          let f2 = 1e9;
          for (let oy = -1; oy <= 1; oy++)
            for (let ox = -1; ox <= 1; ox++) {
              const gx = cx + ox;
              const gy = cy + oy;
              if (gx < 0 || gy < 0 || gx >= gw || gy >= gw) continue;
              const k = gy * gw + gx;
              const ddx = (gx + fx[k]) * cell - x;
              const ddy = (gy + fy[k]) * cell - y;
              const d = Math.sqrt(ddx * ddx + ddy * ddy);
              if (d < f1) {
                f2 = f1;
                f1 = d;
              } else if (d < f2) f2 = d;
            }
          cracks[y * size + x] = 1 - smooth(0.15, 0.95, f2 - f1);
        }
      await breathe();
    }

    const pixels = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const hC = height[i];
        const gx = (height[y * size + Math.min(size - 1, x + 1)] - height[y * size + Math.max(0, x - 1)]) * 0.5;
        const gy = (height[Math.min(size - 1, y + 1) * size + x] - height[Math.max(0, y - 1) * size + x]) * 0.5;
        const nx = -gx * relief;
        const ny = -gy * relief;
        const len = Math.sqrt(nx * nx + ny * ny + 1);
        const lam = (nx * Lx + ny * Ly + Lz) / len / Lz;
        const shade = 1 + (lam - 1) * 0.6;
        const glint = sheen > 0 ? Math.pow(Math.max(0, (nx * Hx + ny * Hy + Hz) / len), 36) * sheen * clamp01(hC * 3) : 0;
        const w = 1 + weave[i] * sheet.weave * (1 - 0.75 * clamp01(hC * 2.5));
        let r = paint[i * 3] * shade * w + glint;
        let g = paint[i * 3 + 1] * shade * w + glint;
        let b = paint[i * 3 + 2] * shade * w + glint * 0.95;
        if (age > 0) {
          r *= 1 - 0.06 * age;
          g *= 1 - 0.1 * age;
          b *= 1 - 0.24 * age;
        }
        if (cracks) {
          const c = cracks[i] * smooth(0.2, 1, age) * 0.22;
          r *= 1 - c;
          g *= 1 - c;
          b *= 1 - c * 0.9;
        }
        pixels[i * 4] = r * 255;
        pixels[i * 4 + 1] = g * 255;
        pixels[i * 4 + 2] = b * 255;
        pixels[i * 4 + 3] = 255;
      }

    const sizeWord = answers.touch < 0.25 ? 'fine' : answers.touch < 0.5 ? 'small' : answers.touch < 0.75 ? 'broad' : 'bold';
    const divided = answers.division < 0.3 ? 'loosely broken' : answers.division < 0.7 ? 'divided into neighbouring hues' : 'strictly divided into pure colours';
    const tradition = dots ? 'Pointillist dots' : garden ? 'Water-garden strokes' : 'Impressionist dabs';
    return {
      pixels,
      notes: [
        `${tradition} in ${answers.palette === 'overcast' ? 'an' : 'a'} ${answers.palette} palette on ${answers.canvas === 'border' ? 'white canvas with a painted border' : `${answers.canvas} canvas`}`,
        `${sizeWord} touches, colour ${divided}, ${answers.edges > 0.6 ? 'edges dissolved' : answers.edges > 0.3 ? 'soft edges' : 'crisp edges'}, ${answers.body > 0.6 ? 'thick impasto' : answers.body > 0.3 ? 'buttery paint' : 'thin paint'}`,
        ...(waterCount ? ['the ground turned to water, the scene broken in its reflection'] : []),
        STATES[state].split(':')[0].split('.')[0].toLowerCase(),
      ],
    };
  },
});
