import { type Palette, choice, clamp01, defineLook, mix, oklch, paintRGB, rekeyOne, score, seeded } from '@conjure/kit';

/**
 * Oil paint laid in directional strokes that follow a flow field read from the capture.
 *
 * Every region is its own pass: the backdrop (identity 0) swirls or bands, ground and set
 * surfaces split into floors (strokes raked along the depth gradient toward the distance) and
 * walls (strokes upright), and each placed thing is painted last with smaller marks that wrap
 * its surface (normals, curvature) and hug its silhouette. Colour comes from a palette of many
 * hues per region, never brightness jitter of one colour. Strokes leave a height field that is
 * lit from the scene's key light, so loaded paint stands off the canvas.
 */

type RGB = [number, number, number];

const smooth = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

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

/** Distance in pixels to the nearest set pixel of `mask` (two-pass chamfer). */
function chamfer(mask: Uint8Array, size: number): Float32Array {
  const N = size * size;
  const d = new Float32Array(N);
  for (let i = 0; i < N; i++) d[i] = mask[i] ? 0 : 1e6;
  const D = Math.SQRT2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let v = d[i];
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - size] + 1);
        if (x > 0) v = Math.min(v, d[i - size - 1] + D);
        if (x < size - 1) v = Math.min(v, d[i - size + 1] + D);
      }
      d[i] = v;
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      let v = d[i];
      if (v === 0) continue;
      if (x < size - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < size - 1) {
        v = Math.min(v, d[i + size] + 1);
        if (x < size - 1) v = Math.min(v, d[i + size + 1] + D);
        if (x > 0) v = Math.min(v, d[i + size - 1] + D);
      }
      d[i] = v;
    }
  return d;
}

function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ seed) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Smooth value noise in 0..1. */
function vnoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function toHsl(r: number, g: number, b: number, out: number[]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d > 1e-6) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  out[0] = h;
  out[1] = s;
  out[2] = l;
}
function fromHsl(h: number, s: number, l: number, out: number[] | Float32Array, at = 0) {
  h = ((h % 1) + 1) % 1;
  const a = s * Math.min(l, 1 - l);
  for (let c = 0; c < 3; c++) {
    const n = c === 0 ? 0 : c === 1 ? 8 : 4;
    const k = (n + h * 12) % 12;
    out[at + c] = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  }
}
const hueToward = (h: number, target: number, t: number) => {
  let d = target - h;
  d -= Math.round(d);
  return h + d * t;
};

// ---- the questions' vocabulary ----------------------------------------------------------------

const TRADITIONS = {
  swirl:
    'Post-Impressionist swirl, after Van Gogh: short thick dashes of loaded paint laid side by side in many pure hues, skies turning in eddies, walls brushed upright, floors raked toward the distance, every shape ringed in dark blue. Fervent, ecstatic, starry or sun-struck, restless.',
  scream:
    'Expressionist scream, after Munch: very long thin translucent strokes that flow and bend across each shape and stop at its edge, no outlines, a dark flat underlayer glowing between them, the whole picture rippling as if the air vibrates. Dread, anguish, fevered sunsets, isolation.',
  blue:
    'Blue-period melancholy, after early Picasso: near-monochrome Prussian and cerulean blues, broad dry strokes softened together, a thick steady blue contour, figures drawn slightly long and thin. Poverty, grief, cold rooms, quiet sorrow.',
} as const;

interface Chord {
  /** [hue, saturation] given to grey regions by role. */
  sky: [number, number];
  ground: [number, number];
  set: [number, number];
  /** [lightness, pull] for the backdrop. */
  skyL: [number, number];
  /** [lightness, pull] for everything else. */
  midL: [number, number];
  /** Hues every colour leans toward. */
  pulls: number[];
  accent: number;
  /** How the blue period's blues turn: hue shift and chalkiness. */
  blueTurn: number;
  blueChalk: number;
  /** Seven band colours for an Expressionist sky, or null to derive them from the backdrop. */
  bands: string[] | null;
}

const SCREAM_BANDS = ['#e2541c', '#f08a24', '#f4c03a', '#c8301e', '#e8743a', '#f6a63a', '#b82a1e'];

const CHORD_SAY = {
  scene: 'True to the scene’s own colours, only purer and more intense; greys become cobalt skies and ochre earth.',
  starry: 'A night chord: a deep dominant hue in a dark sky against complementary lamplight, deeper still below. Nocturnes, wonder, insomnia.',
  harvest: 'A blazing midday chord: a hot dominant hue and its neighbours under a pale contrasting sky, a few sharp accents. Fields, labour, blazing sun.',
  blossom: 'A fresh spring chord: pale chalky tints of three soft hues around blossom white. Renewal, tenderness, a new child.',
  cafe: 'A clashing night-café chord: two hues fighting at full strength, with a sickly lamp between. Passions, nerves, drink, no sleep.',
  sunset: 'A burning sunset chord: a fiery dominant hue in bands across the sky over deep contrasting water and ground. Alarm, fever, a cry through nature.',
} as const;

const CHORDS: Record<keyof typeof CHORD_SAY, Chord> = {
  scene: {
    sky: [0.6, 0.42], ground: [0.09, 0.42], set: [0.58, 0.28], skyL: [0.6, 0], midL: [0.5, 0], pulls: [], accent: 0.13,
    blueTurn: 0, blueChalk: 0, bands: null,
  },
  starry: {
    sky: [0.585, 0.5], ground: [0.45, 0.4], set: [0.6, 0.42], skyL: [0.32, 0.74], midL: [0.45, 0.2], pulls: [0.585, 0.13, 0.46], accent: 0.13,
    blueTurn: 0.02, blueChalk: 0, bands: ['#1f3a8a', '#2f56b0', '#e8c447', '#26408f', '#5b7fd0', '#f0d870', '#1a2c70'],
  },
  harvest: {
    sky: [0.55, 0.5], ground: [0.11, 0.66], set: [0.08, 0.5], skyL: [0.74, 0.25], midL: [0.58, 0.12], pulls: [0.11, 0.06, 0.55, 0.25], accent: 0.99,
    blueTurn: -0.035, blueChalk: 0, bands: ['#e8b440', '#f2d070', '#d88a30', '#9cc4d8', '#f0c050', '#c87028', '#ead890'],
  },
  blossom: {
    sky: [0.5, 0.4], ground: [0.27, 0.42], set: [0.47, 0.3], skyL: [0.8, 0.3], midL: [0.72, 0.15], pulls: [0.5, 0.94, 0.27], accent: 0.94,
    blueTurn: -0.01, blueChalk: 1, bands: ['#9ad6cf', '#e8b8c8', '#f4ecd8', '#7cc0b8', '#d898b0', '#c8e0b0', '#b0d8e8'],
  },
  cafe: {
    sky: [0.3, 0.36], ground: [0.08, 0.6], set: [0.0, 0.7], skyL: [0.32, 0.7], midL: [0.4, 0.5], pulls: [0.0, 0.31, 0.14], accent: 0.14,
    blueTurn: -0.06, blueChalk: 0, bands: ['#2f7a4a', '#c43a2a', '#e8d050', '#3c9058', '#a8281e', '#d8c040', '#24603a'],
  },
  sunset: {
    sky: [0.04, 0.8], ground: [0.63, 0.5], set: [0.62, 0.45], skyL: [0.58, 0.3], midL: [0.45, 0.2], pulls: [0.04, 0.63, 0.11], accent: 0.11,
    blueTurn: 0.045, blueChalk: 0, bands: SCREAM_BANDS,
  },
};

const SUPPORTS = {
  linen: { say: 'Primed linen canvas: warm off-white, its weave catching the paint wherever it is thin.', tone: hex('#e6dcc8'), weave: 1, fibre: 0.15 },
  cardboard: { say: 'Raw brown cardboard, unprimed and matte: its tan shows between strokes and drinks the paint dry.', tone: hex('#a8875f'), weave: 0, fibre: 1 },
  gesso: { say: 'A smooth white gesso panel: bright clean gaps and crisp brush ridges.', tone: hex('#f2efe7'), weave: 0.12, fibre: 0.1 },
  toned: { say: 'Coarse canvas toned with a dark coloured ground: its glow burns through every gap.', tone: hex('#97503a'), weave: 1.25, fibre: 0.2 },
} as const;
const SUPPORT_SAY = Object.fromEntries(Object.entries(SUPPORTS).map(([k, v]) => [k, v.say])) as Record<keyof typeof SUPPORTS, string>;

/**
 * A chord under the picture's palette: the whole chord turns (HSL hue) so its leading pull lands on
 * the ink's hue, every other hue keeping its offset, so a chord stays a chord (starry keeps its
 * complementary lamp, cafe its clash); the accent glow takes the second colour's hue; a colourless
 * ink drains the chord. The scene chord, the blue period's blues, its dark-blue contours and the
 * blue shadows are the tradition and stay. A toned canvas takes the ground's tint.
 */
function chordIn(key: keyof typeof CHORDS, palette: Palette | undefined): Chord {
  const chord = CHORDS[key];
  if (!palette || key === 'scene') return chord;
  const hsl = [0, 0, 0];
  const ink = paintRGB(palette.ink), second = paintRGB(palette.second);
  toHsl(ink[0] / 255, ink[1] / 255, ink[2] / 255, hsl);
  const turn = hsl[0] - chord.pulls[0];
  toHsl(second[0] / 255, second[1] / 255, second[2] / 255, hsl);
  const accent = hsl[0];
  const drain = Math.min(1, oklch(ink)[1] / 0.1);
  const at = (h: number) => (((h + turn) % 1) + 1) % 1;
  const role = ([h, sat]: [number, number]): [number, number] => [at(h), sat * drain];
  const out = [0, 0, 0];
  const band = (value: string) => {
    const c = hex(value);
    toHsl(c[0], c[1], c[2], hsl);
    fromHsl(at(hsl[0]), hsl[1] * drain, hsl[2], out);
    return `#${out.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`;
  };
  return {
    ...chord, sky: role(chord.sky), ground: role(chord.ground), set: role(chord.set),
    pulls: chord.pulls.map(at), accent, bands: chord.bands?.map(band) ?? null,
  };
}

const STATES = {
  fresh: 'Just finished and still wet: the ridges of paint glisten in the light.',
  aged: 'A century old: yellowed varnish and a fine web of cracks across the paint.',
  unfinished: 'Abandoned unfinished: the subject is painted, but the margins are bare canvas with the charcoal underdrawing showing.',
  scraped: 'Reworked in a fury: passages scraped back with a palette knife, smeared flat between ridged edges.',
} as const;

const BLUES = ['#0c1830', '#132240', '#1d3866', '#24476f', '#2d5a94', '#3b6878', '#4f719a', '#6b8fb6', '#8aa5c4', '#a3b6c9', '#b6c8d8', '#cbd8e0'];
const DEEP_BLUES = ['#1b2a6a', '#22357a', '#142050', '#2b3f88', '#1d2f5c'];

type Role = 'sky' | 'floor' | 'wall' | 'other' | 'thing';
/** Base stroke [length, width] in pixels at 720, by tradition and role. */
const DIMS: Record<keyof typeof TRADITIONS, Record<Role, [number, number]>> = {
  swirl: { sky: [34, 6.2], floor: [30, 6], wall: [42, 6.4], other: [22, 5], thing: [17, 4.4] },
  scream: { sky: [210, 4.6], floor: [170, 4.8], wall: [230, 5.2], other: [140, 4.2], thing: [110, 3.6] },
  blue: { sky: [66, 12.5], floor: [60, 12], wall: [66, 12.5], other: [40, 9.5], thing: [28, 7] },
};

interface Entry {
  dh: number;
  abs: number;
  sm: number;
  dl: number;
  w: number;
}

interface Brush {
  w: number;
  alpha: number;
  dry: number;
  pickup: number;
  thick: number;
  clip: number;
  seam: number;
  taper: number;
}

export default defineLook({
  questions: {
    tradition: choice('Which painter’s tradition lays the paint?', TRADITIONS),
    chord: choice('What character has the colour chord that carries the painting? Its hues come from the picture\u2019s palette.', CHORD_SAY),
    stroke: score('How long is each brushstroke?', ['Stubby dabs', 'Short dashes', 'Medium', 'Long', 'Very long sweeping ribbons']),
    load: score('How thick is the paint on the brush?', [
      'Thin and dry, dragged on',
      'Light',
      'A full brush',
      'Heavy',
      'Loaded impasto standing off the canvas',
    ]),
    contour: score('How strongly are shapes outlined?', ['No outline at all', 'A faint broken line', 'A firm line', 'A thick heavy contour']),
    swirl: score('How much does the sky or backdrop swirl?', ['Still, laid flat', 'A gentle drift', 'Rolling waves', 'Great turning whirlpools']),
    warp: score('How much does the whole picture waver?', ['Straight and true', 'A slight tremor', 'Wavering', 'The whole world ripples']),
    support: choice('What is it painted on?', SUPPORT_SAY),
    state: choice('What has become of the canvas since it was painted?', STATES),
  },

  async apply(capture, answers, context, signal) {
    const size = capture.size;
    const N = size * size;
    const mood = context.mood;
    const vg = answers.tradition === 'swirl';
    const mu = answers.tradition === 'scream';
    const bl = answers.tradition === 'blue';
    const chord = chordIn(answers.chord, context.palette);
    const support = answers.support === 'toned' && context.palette
      ? { ...SUPPORTS.toned, tone: rekeyOne(SUPPORTS.toned.tone.map((v) => Math.round(v * 255)) as unknown as [number, number, number], context.palette, 'ground').map((v) => v / 255) as RGB }
      : SUPPORTS[answers.support];
    const state = answers.state;
    const random = seeded((context.seed ^ 0x2f6e1d93) >>> 0);
    const nseed = (context.seed ^ 0x5bd1e995) | 0;
    const px1 = size / 720;
    let beats = 0;
    const breathe = async () => {
      if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
      if (++beats % 3 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };

    // ---- read the capture ------------------------------------------------------------------
    let ids = new Uint8Array(N);
    let col = new Float32Array(N * 3);
    let nrm = new Float32Array(N * 3); // image space: x right, y down, z toward the viewer
    let dep = new Float32Array(N);
    let dif = new Float32Array(N);
    {
      const hist = new Uint32Array(256);
      let lit = 0;
      for (let i = 0; i < N; i++) {
        const id = capture.identity[i * 4];
        ids[i] = id;
        col[i * 3] = capture.color[i * 4] / 255;
        col[i * 3 + 1] = capture.color[i * 4 + 1] / 255;
        col[i * 3 + 2] = capture.color[i * 4 + 2] / 255;
        nrm[i * 3] = capture.normal[i * 4] / 127.5 - 1;
        nrm[i * 3 + 1] = -(capture.normal[i * 4 + 1] / 127.5 - 1);
        nrm[i * 3 + 2] = capture.normal[i * 4 + 2] / 127.5 - 1;
        dep[i] = id === 0 ? 1 : (capture.depth[i * 4] * 65536 + capture.depth[i * 4 + 1] * 256 + capture.depth[i * 4 + 2]) / 16777215;
        dif[i] = capture.diffuse[i * 4];
        if (id >= 1) {
          hist[capture.diffuse[i * 4]]++;
          lit++;
        }
      }
      let white = 255;
      for (let acc = 0, v = 255; v >= 0; v--) {
        acc += hist[v];
        if (acc > lit * 0.04) {
          white = Math.max(8, v);
          break;
        }
      }
      for (let i = 0; i < N; i++) dif[i] = ids[i] === 0 ? 1 : Math.min(1.2, dif[i] / white);
    }

    // ---- the blue period draws its figures long: stretch each thing up from its feet --------
    if (bl) {
      const mnX = new Int32Array(256).fill(size);
      const mxX = new Int32Array(256).fill(-1);
      const mnY = new Int32Array(256).fill(size);
      const mxY = new Int32Array(256).fill(-1);
      const sumX = new Float64Array(256);
      const sumD = new Float64Array(256);
      const n = new Int32Array(256);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const id = ids[i];
          if (id < 3) continue;
          n[id]++;
          sumX[id] += x;
          sumD[id] += dep[i];
          if (x < mnX[id]) mnX[id] = x;
          if (x > mxX[id]) mxX[id] = x;
          if (y < mnY[id]) mnY[id] = y;
          if (y > mxY[id]) mxY[id] = y;
        }
      const nIds = ids.slice();
      const nCol = col.slice();
      const nNrm = nrm.slice();
      const nDep = dep.slice();
      const nDif = dif.slice();
      const copy = (to: number, from: number) => {
        nIds[to] = ids[from];
        nDep[to] = dep[from];
        nDif[to] = dif[from];
        for (let c = 0; c < 3; c++) {
          nCol[to * 3 + c] = col[from * 3 + c];
          nNrm[to * 3 + c] = nrm[from * 3 + c];
        }
      };
      // what stood behind each thing: the nearest background pixel along the row
      const left = new Int32Array(size);
      const right = new Int32Array(size);
      for (let y = 0; y < size; y++) {
        const row = y * size;
        let last = -1;
        for (let x = 0; x < size; x++) {
          if (ids[row + x] < 3) last = x;
          left[x] = last;
        }
        last = -1;
        for (let x = size - 1; x >= 0; x--) {
          if (ids[row + x] < 3) last = x;
          right[x] = last;
        }
        for (let x = 0; x < size; x++) {
          if (ids[row + x] < 3) continue;
          const l = left[x];
          const r = right[x];
          const src = l < 0 ? r : r < 0 ? l : x - l <= r - x ? l : r;
          if (src >= 0) copy(row + x, row + src);
          else nIds[row + x] = 0;
        }
      }
      const order: number[] = [];
      for (let id = 3; id < 256; id++) if (n[id] > 0) order.push(id);
      order.sort((a, b) => sumD[b] / n[b] - sumD[a] / n[a]);
      const SX = 0.87;
      const SY = 1.13;
      for (const id of order) {
        const cx = sumX[id] / n[id];
        const foot = mxY[id];
        const top = foot - (foot - mnY[id]) * SY;
        const half = Math.max(cx - mnX[id], mxX[id] - cx) * SX + 2;
        for (let y = Math.max(0, Math.floor(top)); y <= foot; y++) {
          const sy = Math.round(foot + (y - foot) / SY);
          if (sy < 0 || sy >= size) continue;
          for (let x = Math.max(0, Math.floor(cx - half)); x <= Math.min(size - 1, Math.ceil(cx + half)); x++) {
            const sx = Math.round(cx + (x - cx) / SX);
            if (sx < 0 || sx >= size) continue;
            const from = sy * size + sx;
            if (ids[from] === id) copy(y * size + x, from);
          }
        }
      }
      ids = nIds;
      col = nCol;
      nrm = nNrm;
      dep = nDep;
      dif = nDif;
    }
    await breathe();

    // ---- which way is up, and which surfaces are floors and walls ----------------------------
    let ux = 0;
    let uy = -0.8;
    let uz = 0.6;
    {
      let sx = 0;
      let sy = 0;
      let sz = 0;
      let c = 0;
      for (let i = 0; i < N; i++)
        if (ids[i] === 1) {
          sx += nrm[i * 3];
          sy += nrm[i * 3 + 1];
          sz += nrm[i * 3 + 2];
          c++;
        }
      const l = Math.hypot(sx, sy, sz);
      if (c > N * 0.01 && l > c * 0.3) {
        ux = sx / l;
        uy = sy / l;
        uz = sz / l;
      } else {
        const d = Math.hypot(ux, uy, uz);
        ux /= d;
        uy /= d;
        uz /= d;
      }
    }
    let upX = ux;
    let upY = uy;
    {
      const l = Math.hypot(upX, upY);
      if (l < 0.2 || upY > 0) {
        upX = 0;
        upY = -1;
      } else {
        upX /= l;
        upY /= l;
      }
    }
    const upA = Math.atan2(upY, upX);
    const rightA = upA + Math.PI / 2;

    const fUp = new Float32Array(N);
    for (let i = 0; i < N; i++) fUp[i] = nrm[i * 3] * ux + nrm[i * 3 + 1] * uy + nrm[i * 3 + 2] * uz;
    boxBlur(fUp, size, 2);

    // A large featureless ground (a studio sweep, an endless floor under an overhead camera) is the
    // picture's backdrop to a painter, and is treated like the sky.
    let groundBackdrop = false;
    {
      let all = 0;
      let n = 0;
      let s = 0;
      let s2 = 0;
      for (let i = 0; i < N; i++) {
        if (ids[i] !== 1) continue;
        all++;
        if (dif[i] < 0.7) continue;
        const l = 0.3 * col[i * 3] + 0.59 * col[i * 3 + 1] + 0.11 * col[i * 3 + 2];
        s += l;
        s2 += l * l;
        n++;
      }
      if (all > N * 0.2 && n > all * 0.3) {
        const m = s / n;
        groundBackdrop = Math.sqrt(Math.max(0, s2 / n - m * m)) < 0.045;
      }
    }

    // labels: 0 backdrop, id*4+class for ground and set (1 floor, 2 wall, 3 other), 16+id for things
    const LABELS = 16 + 256;
    const lab = new Uint16Array(N);
    const cnt = new Int32Array(LABELS);
    const mnX = new Int32Array(LABELS).fill(size);
    const mxX = new Int32Array(LABELS).fill(-1);
    const mnY = new Int32Array(LABELS).fill(size);
    const mxY = new Int32Array(LABELS).fill(-1);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const id = ids[i];
        let L = 0;
        if (id >= 3) L = 16 + id;
        else if (id === 1 && groundBackdrop) L = 4;
        else if (id >= 1) {
          const f = fUp[i];
          L = id * 4 + (f > 0.7 ? 1 : Math.abs(f) < 0.45 ? 2 : 3);
        }
        lab[i] = L;
        cnt[L]++;
        if (x < mnX[L]) mnX[L] = x;
        if (x > mxX[L]) mxX[L] = x;
        if (y < mnY[L]) mnY[L] = y;
        if (y > mxY[L]) mxY[L] = y;
      }
    const isSkyL = (L: number) => L === 0 || L === 4;
    const roleOf = (L: number): Role => (isSkyL(L) ? 'sky' : L >= 16 ? 'thing' : (L & 3) === 1 ? 'floor' : (L & 3) === 2 ? 'wall' : 'other');

    // ---- edges: silhouettes, depth steps and sharp creases ---------------------------------
    const E = new Uint8Array(N);
    {
      const check = (i: number, j: number) => {
        const a = ids[i];
        const b = ids[j];
        const da = dep[i];
        const db = dep[j];
        if (a !== b) {
          E[da <= db ? i : j] = 1;
          return;
        }
        if (a === 0) return;
        if (Math.abs(da - db) > 0.0006 + 0.02 * Math.min(da, db)) {
          E[da <= db ? i : j] = 1;
          return;
        }
        const dot = nrm[i * 3] * nrm[j * 3] + nrm[i * 3 + 1] * nrm[j * 3 + 1] + nrm[i * 3 + 2] * nrm[j * 3 + 2];
        if (dot < 0.55 && !E[i]) E[i] = 2;
      };
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          if (x + 1 < size) check(i, i + 1);
          if (y + 1 < size) check(i, i + size);
        }
    }
    const dist = chamfer(E, size);
    // the edge's own direction, from the structure tensor of the distance field
    const etx = new Float32Array(N);
    const ety = new Float32Array(N);
    const edx = new Float32Array(N);
    const edy = new Float32Array(N);
    {
      const jxx = new Float32Array(N);
      const jxy = new Float32Array(N);
      const jyy = new Float32Array(N);
      for (let y = 1; y < size - 1; y++)
        for (let x = 1; x < size - 1; x++) {
          const i = y * size + x;
          const gx = Math.min(dist[i + 1], 14) - Math.min(dist[i - 1], 14);
          const gy = Math.min(dist[i + size], 14) - Math.min(dist[i - size], 14);
          jxx[i] = gx * gx;
          jxy[i] = gx * gy;
          jyy[i] = gy * gy;
        }
      boxBlur(jxx, size, 2);
      boxBlur(jxy, size, 2);
      boxBlur(jyy, size, 2);
      for (let i = 0; i < N; i++) {
        const a = -(jxx[i] - jyy[i]);
        const b = -2 * jxy[i];
        const l = Math.hypot(a, b);
        if (l < 1e-6) {
          etx[i] = 0;
          ety[i] = 0;
          edx[i] = 1;
          edy[i] = 0;
          continue;
        }
        etx[i] = a / l;
        ety[i] = b / l;
        const th = 0.5 * Math.atan2(b, a);
        edx[i] = Math.cos(th);
        edy[i] = Math.sin(th);
      }
    }
    // floors are brushed along their boards: the strongest direction among their own edges
    const board = new Float32Array(LABELS).fill(Number.NaN);
    {
      const BINS = 24;
      const hist = new Float32Array(LABELS * BINS);
      const total = new Float32Array(LABELS);
      const thingMask = new Uint8Array(N);
      for (let i = 0; i < N; i++) thingMask[i] = ids[i] >= 3 ? 1 : 0;
      const nearThing = chamfer(thingMask, size);
      for (let i = 0; i < N; i++) {
        const L = lab[i];
        if (L === 0 || L >= 16 || (L & 3) !== 1 || dist[i] > 2.5 || nearThing[i] < 5) continue;
        let a = Math.atan2(edy[i], edx[i]);
        if (a < 0) a += Math.PI;
        hist[L * BINS + Math.min(BINS - 1, Math.floor((a / Math.PI) * BINS))]++;
        total[L]++;
      }
      for (let L = 1; L < 16; L++) {
        if (total[L] < 40) continue;
        let best = -1;
        let bin = 0;
        for (let b = 0; b < BINS; b++) {
          const v = hist[L * BINS + b] + 0.5 * (hist[L * BINS + ((b + 1) % BINS)] + hist[L * BINS + ((b + BINS - 1) % BINS)]);
          if (v > best) {
            best = v;
            bin = b;
          }
        }
        if (best > total[L] * 0.18) board[L] = ((bin + 0.5) / BINS) * Math.PI;
      }
    }
    await breathe();

    // ---- the sky's motion -------------------------------------------------------------------
    const swirl = answers.swirl;
    const vortices: { x: number; y: number; r: number; spin: number }[] = [];
    if (vg && swirl > 0.12 && cnt[0] + cnt[4] > N * 0.05) {
      const space = new Float32Array(N);
      for (let i = 0; i < N; i++) space[i] = isSkyL(lab[i]) ? 1 : 0;
      boxBlur(space, size, Math.round(26 * px1), 1, 0, 2);
      const want = 1 + Math.floor(swirl * 2.7);
      const R0 = (0.075 + 0.075 * swirl) * size;
      for (let v = 0; v < want; v++) {
        let best = -1;
        let bx = 0;
        let by = 0;
        const margin = Math.round(R0 * 0.75);
        for (let y = margin; y < size - margin; y += 6)
          for (let x = margin; x < size - margin; x += 6) {
            const i = y * size + x;
            if (!isSkyL(lab[i])) continue;
            let s = space[i] * (1.2 - (0.5 * y) / size) + random() * 0.04;
            for (const o of vortices) if (Math.hypot(x - o.x, y - o.y) < (o.r + R0) * 1.1) s = -1;
            if (s > best) {
              best = s;
              bx = x;
              by = y;
            }
          }
        if (best < 0.35) break;
        const r = R0 * (0.65 + 0.45 * space[by * size + bx]) * (v === 0 ? 1 : 0.7 + random() * 0.3);
        vortices.push({ x: bx, y: by, r, spin: random() < 0.5 ? -1 : 1 });
      }
    }
    const wavePh1 = random() * 6.28;
    const wavePh2 = random() * 6.28;
    // Expressionist sky: wavy bands; strokes run along them
    const bandW = 17 * px1;
    const bA = mix(4, 24, swirl) * px1;
    const bk1 = 0.024 / px1;
    const bk2 = 0.05 / px1;
    const bk3 = 0.011 / px1;
    const bandY = (x: number, y: number) => y + bA * Math.sin(x * bk1 + wavePh1) + 0.45 * bA * Math.sin(x * bk2 + y * bk3 + wavePh2);
    let bands: RGB[] = (chord.bands ?? SCREAM_BANDS).map(hex);
    const hs = [0, 0, 0];
    const tmp = [0, 0, 0];
    if (!chord.bands && cnt[0] + cnt[4] > 0) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < N; i++)
        if (isSkyL(lab[i])) {
          r += col[i * 3];
          g += col[i * 3 + 1];
          b += col[i * 3 + 2];
        }
      const skyN = cnt[0] + cnt[4];
      toHsl(r / skyN, g / skyN, b / skyN, hs);
      if (hs[1] > 0.18) {
        const [h0, s0, l0] = hs;
        bands = [0, 0.035, -0.03, 0.07, 0.012, -0.055, 0.02].map((dh, k) => {
          fromHsl(h0 + dh, clamp01(s0 * 1.25 + 0.1), clamp01(l0 + [0, 0.08, -0.1, 0.04, -0.05, 0.1, -0.02][k]), tmp);
          return [tmp[0], tmp[1], tmp[2]] as RGB;
        });
      }
    }

    // ---- the blue ramp -------------------------------------------------------------------------
    const blues = BLUES.map((h) => {
      const c = hex(h);
      toHsl(c[0], c[1], c[2], hs);
      const hue = hs[0] + chord.blueTurn - (mood.warmth - 0.5) * 0.035;
      const sat = hs[1] * (chord.blueChalk ? 0.68 : 1) * mix(0.85, 1.1, mood.cheer);
      const l = chord.blueChalk ? mix(hs[2], 0.8, 0.14) : hs[2];
      fromHsl(hue, clamp01(sat), l, tmp);
      return { r: tmp[0], g: tmp[1], b: tmp[2], l };
    }).sort((a, b) => a.l - b.l);
    const blueAt = (L: number, out: number[] | Float32Array, at: number) => {
      let k = 0;
      while (k < blues.length - 2 && blues[k + 1].l < L) k++;
      const a = blues[k];
      const b = blues[k + 1];
      const t = clamp01((L - a.l) / Math.max(1e-4, b.l - a.l));
      out[at] = mix(a.r, b.r, t);
      out[at + 1] = mix(a.g, b.g, t);
      out[at + 2] = mix(a.b, b.b, t);
    };
    const deepBlues = DEEP_BLUES.map(hex);
    const prussian = blues[0];

    // ---- what colour the painter is after at each pixel --------------------------------------
    const tgt = new Float32Array(N * 3);
    const glow = [0, 0, 0];
    fromHsl(chord.accent, 0.75, 0.74, glow);
    {
      const satMood = mix(0.8, 1.15, mood.cheer);
      const warm = mood.warmth - 0.5;
      let lo = 0;
      let hi = 1;
      if (bl) {
        const tones = new Uint32Array(256);
        for (let i = 0; i < N; i++) tones[Math.min(255, (255 * (0.3 * col[i * 3] + 0.59 * col[i * 3 + 1] + 0.11 * col[i * 3 + 2])) | 0)]++;
        for (let acc = 0, v = 0; v < 256; v++) {
          acc += tones[v];
          if (acc > N * 0.03) {
            lo = v / 255;
            break;
          }
        }
        for (let acc = 0, v = 255; v >= 0; v--) {
          acc += tones[v];
          if (acc > N * 0.03) {
            hi = v / 255;
            break;
          }
        }
        if (hi - lo < 0.2) hi = lo + 0.2;
      }
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const id = ids[i];
          const r0 = col[i * 3];
          const g0 = col[i * 3 + 1];
          const b0 = col[i * 3 + 2];
          if (bl) {
            let L = clamp01((0.3 * r0 + 0.59 * g0 + 0.11 * b0 - lo) / (hi - lo));
            if (id > 0) L *= 0.74 + 0.26 * Math.min(1, dif[i]);
            // the room behind is a deep cold blue, never a pale wash
            if (isSkyL(lab[i])) L *= 0.82;
            blueAt(0.1 + 0.54 * L, tgt, i * 3);
            continue;
          }
          toHsl(r0, g0, b0, hs);
          let [h, s, l] = hs;
          const isSky = isSkyL(lab[i]);
          if (mu && isSky) {
            const yy = bandY(x, y);
            const k = ((Math.floor(yy / bandW) % 7) + 7) % 7;
            const c = bands[k];
            const dark = mix(0.5, 1.05, smooth(0.05, 0.75, l));
            tgt[i * 3] = c[0] * dark;
            tgt[i * 3 + 1] = c[1] * dark;
            tgt[i * 3 + 2] = c[2] * dark;
            continue;
          }
          const role = isSky ? chord.sky : id === 1 ? chord.ground : id === 2 ? chord.set : null;
          const grey = 1 - smooth(0.05, 0.22, s);
          if (role) {
            h = hueToward(h, role[0], grey);
            s = mix(s, role[1], grey);
          } else if (grey > 0) {
            h = hueToward(h, chord.set[0], grey);
            s = mix(s, 0.24, grey);
          }
          if (chord.pulls.length) {
            let best = chord.pulls[0];
            let bd = 9;
            for (const p of chord.pulls) {
              let d = p - h;
              d = Math.abs(d - Math.round(d));
              if (d < bd) {
                bd = d;
                best = p;
              }
            }
            h = hueToward(h, best, (mu ? 0.45 : 0.35) * (1 - grey * 0.5));
          }
          if (isSky) l = mix(l, chord.skyL[0], chord.skyL[1]);
          else l = mix(l, chord.midL[0], chord.midL[1]);
          const sh = id === 0 ? 0 : 1 - smooth(0.2, 0.85, dif[i]);
          h = hueToward(h, mu ? 0.63 : 0.68, sh * (mu ? 0.32 : 0.28));
          h = hueToward(h, 0.11, (1 - sh) * clamp01(0.05 + warm * 0.22));
          l = clamp01(0.5 + (l - 0.5) * (mu ? 1.15 : 1.12) - sh * (mu ? 0.12 : 0.08));
          // light colours pushed to full saturation turn to neon: hold them back
          s = Math.min(clamp01((s * (mu ? 1.2 : 1.18) + (mu ? 0.08 : 0.07)) * satMood), 1 - Math.max(0, l - 0.5) * 1.1);
          let core = 0;
          if (isSky && vortices.length) {
            for (const v of vortices) {
              const d = Math.hypot(x - v.x, y - v.y);
              const w = Math.exp(-((d / v.r) ** 2));
              if (w < 0.01) continue;
              l += w * 0.08 * Math.sin((d / v.r) * 15);
              core = Math.max(core, Math.exp(-((d / (0.3 * v.r)) ** 2)));
            }
            l = clamp01(l);
          }
          fromHsl(h, s, l, tgt, i * 3);
          if (core > 0.01) for (let c = 0; c < 3; c++) tgt[i * 3 + c] = mix(tgt[i * 3 + c], glow[c], core * 0.75);
        }
    }
    await breathe();

    // a softened copy for the blocking-in pass, and the underpainting
    const soft = tgt.slice();
    for (let c = 0; c < 3; c++) boxBlur(soft, size, Math.round(6 * px1), 3, c, 2);

    // ---- unfinished margins ---------------------------------------------------------------------
    const M = new Float32Array(N).fill(1);
    if (state === 'unfinished') {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const dx = Math.abs((x / size - 0.5) * 2);
          const dy = Math.abs((y / size - 0.48) * 2);
          const r = Math.cbrt(dx * dx * dx + dy * dy * dy);
          const n = vnoise(x / (70 * px1), y / (70 * px1), nseed + 11);
          let m = 1 - smooth(0.5, 0.9, r + (n - 0.5) * 0.4);
          if (ids[i] >= 3) m = Math.max(m, 0.92);
          M[i] = m;
        }
    }

    // ---- the support and the underpainting -----------------------------------------------------
    const canvas = new Float32Array(N * 3);
    const H = new Float32Array(N);
    {
      const cover = (vg ? 0.86 : mu ? 0.92 : 0.9) - (answers.support === 'cardboard' ? 0.12 : 0);
      const darken = vg ? 0.84 : bl ? 0.82 : 0.72;
      // the Expressionist underlayer is flat: one same-hue colour per region
      const flat = new Float32Array(LABELS * 3);
      if (mu) {
        for (let i = 0; i < N; i++) {
          const L = lab[i];
          flat[L * 3] += tgt[i * 3];
          flat[L * 3 + 1] += tgt[i * 3 + 1];
          flat[L * 3 + 2] += tgt[i * 3 + 2];
        }
        for (let L = 0; L < LABELS; L++) if (cnt[L]) for (let c = 0; c < 3; c++) flat[L * 3 + c] /= cnt[L];
      }
      const charcoal = state === 'unfinished';
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const fib = support.fibre * (vnoise(x / (1.6 * px1), y / (5 * px1), nseed + 3) - 0.5) * 0.12 + (vnoise(x / 40, y / 40, nseed + 4) - 0.5) * 0.05;
          let sr = support.tone[0] * (1 + fib);
          let sg = support.tone[1] * (1 + fib);
          let sb = support.tone[2] * (1 + fib);
          if (charcoal && dist[i] < 1.3 && M[i] < 0.98) {
            const k = 0.75 * (vnoise(x / 9, y / 9, nseed + 5) > 0.3 ? 1 : 0.35);
            sr = mix(sr, 0.17, k);
            sg = mix(sg, 0.16, k);
            sb = mix(sb, 0.16, k);
          }
          let d = darken;
          if (mu) d *= 1.12 - (0.38 * y) / size;
          if (mu && answers.contour > 0) d *= 1 - answers.contour * 0.3 * Math.exp(-dist[i] / 2.2);
          const k = cover * M[i];
          for (let c = 0; c < 3; c++) {
            const u = (mu ? mix(flat[lab[i] * 3 + c], soft[i * 3 + c], 0.3) : soft[i * 3 + c]) * d;
            canvas[i * 3 + c] = mix(c === 0 ? sr : c === 1 ? sg : sb, u, k);
          }
          H[i] = 0.06 * k;
        }
    }
    await breathe();

    // ---- the flow field ---------------------------------------------------------------------------
    const dirX = new Float32Array(N);
    const dirY = new Float32Array(N);
    {
      const fx = new Float32Array(N);
      const fy = new Float32Array(N);
      const idAngle = new Float32Array(256);
      for (let k = 0; k < 256; k++) idAngle[k] = upA + (random() - 0.5) * 1.2;
      const waveAmp = vg ? mix(0.1, 0.7, swirl) : mix(0.06, 0.35, swirl);
      const k1 = 0.011 / px1;
      const k2 = 0.017 / px1;
      const sway = vg ? 0.16 + 0.22 * swirl : mu ? 0.5 : 0.2;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const L = lab[i];
          const role = roleOf(L);
          let ax = 0;
          let ay = 0;
          const add = (th: number, w: number) => {
            ax += w * Math.cos(2 * th);
            ay += w * Math.sin(2 * th);
          };
          if (role === 'sky') {
            if (mu) {
              const c1 = Math.cos(x * bk1 + wavePh1);
              const c2 = Math.cos(x * bk2 + y * bk3 + wavePh2);
              const gx = bA * bk1 * c1 + 0.45 * bA * bk2 * c2;
              const gy = 1 + 0.45 * bA * bk3 * c2;
              const l = Math.hypot(gx, gy);
              const tx = gy / l;
              const ty = -gx / l;
              ax = tx * tx - ty * ty;
              ay = 2 * tx * ty;
            } else {
              add(waveAmp * Math.sin(x * k1 + 1.4 * Math.sin(y * k2 + wavePh1) + wavePh2), 1);
              for (const v of vortices) {
                const dx = x - v.x;
                const dy = y - v.y;
                const d2 = dx * dx + dy * dy;
                const w = Math.exp(-d2 / (v.r * v.r * 1.6)) * 4 * swirl;
                if (w < 0.01) continue;
                add(Math.atan2(dy, dx) + Math.PI / 2 + v.spin * 0.22, w);
              }
            }
          } else if (role === 'wall') {
            const n = mu ? Math.sin(y * 0.03 / px1 + x * 0.008 / px1 + wavePh1) : vnoise(x / (60 * px1), y / (60 * px1), nseed) * 2 - 1;
            add(upA + sway * n, 1);
          } else {
            // floors, odd surfaces and things
            let gx = 0;
            let gy = 0;
            let valid = false;
            if (x > 1 && x < size - 2 && y > 1 && y < size - 2) {
              if (lab[i - 2] === L && lab[i + 2] === L && lab[i - 2 * size] === L && lab[i + 2 * size] === L) {
                gx = dep[i + 2] - dep[i - 2];
                gy = dep[i + 2 * size] - dep[i - 2 * size];
                valid = Math.hypot(gx, gy) > 2e-7;
              }
            }
            if (role === 'floor') {
              if (bl) add(rightA + 0.15 * (vnoise(x / 80, y / 80, nseed + 1) * 2 - 1), 1);
              else {
                const wobble = (vg ? 0.14 : 0.3) * (vnoise(x / (50 * px1), y / (50 * px1), nseed + 2) * 2 - 1);
                if (!Number.isNaN(board[L])) add(board[L] + wobble, 1);
                if (valid) {
                  const l = Math.hypot(gx, gy);
                  const tx = gx / l;
                  const ty = gy / l;
                  const w = Number.isNaN(board[L]) ? 1 : 0.45;
                  ax += w * (tx * tx - ty * ty);
                  ay += w * 2 * tx * ty;
                } else if (Number.isNaN(board[L])) add(rightA + wobble * 2, 1);
              }
            } else {
              const f = fUp[i];
              const vertW = 1 - smooth(0.3, 0.65, Math.abs(f));
              add(upA, vertW * 0.8);
              if (valid && f > 0) {
                const l = Math.hypot(gx, gy);
                const tx = gx / l;
                const ty = gy / l;
                ax += (1 - vertW) * 0.8 * (tx * tx - ty * ty);
                ay += (1 - vertW) * 0.8 * 2 * tx * ty;
              } else add(rightA, (1 - vertW) * 0.8);
              // curved surfaces: wrap the stroke around the form
              const nx = nrm[i * 3];
              const ny = nrm[i * 3 + 1];
              const lean = Math.hypot(nx, ny);
              if (lean > 0.08 && x > 1 && x < size - 2 && y > 1 && y < size - 2) {
                const a = (i - 2) * 3;
                const b = (i + 2) * 3;
                const c = (i - 2 * size) * 3;
                const d = (i + 2 * size) * 3;
                const curv =
                  Math.abs(nrm[b] - nrm[a]) + Math.abs(nrm[b + 1] - nrm[a + 1]) + Math.abs(nrm[d] - nrm[c]) + Math.abs(nrm[d + 1] - nrm[c + 1]);
                const w = smooth(0.06, 0.3, curv) * 1.6;
                if (w > 0) {
                  const tx = -ny / lean;
                  const ty = nx / lean;
                  ax += w * (tx * tx - ty * ty);
                  ay += w * 2 * tx * ty;
                }
              }
              // hug the silhouette
              const reach = mu ? 8 : 3.5;
              const we = (mu ? 2.2 : 1.3) * Math.exp(-dist[i] / (reach * px1));
              ax += we * etx[i];
              ay += we * ety[i];
              add(idAngle[ids[i]], 0.08);
            }
          }
          fx[i] = ax;
          fy[i] = ay;
        }
      const r = Math.round((vg ? 3 : mu ? 5 : 4) * px1);
      boxBlur(fx, size, r);
      boxBlur(fy, size, r);
      for (let i = 0; i < N; i++) {
        const th = 0.5 * Math.atan2(fy[i], fx[i]);
        dirX[i] = Math.cos(th);
        dirY[i] = Math.sin(th);
      }
    }
    await breathe();

    // ---- the brush ----------------------------------------------------------------------------------
    const stamp = new Int32Array(N).fill(-1);
    let strokeId = 0;
    const MAXP = 2048;
    const px = new Float32Array(MAXP);
    const py = new Float32Array(MAXP);
    const bx = new Float32Array(MAXP);
    const by = new Float32Array(MAXP);
    const bLoad = new Float32Array(256);
    const bVal = new Float32Array(256);
    const bMix = new Float32Array(256);
    const bHgt = new Float32Array(256);
    const ca = [0, 0, 0];
    const cb = [0, 0, 0];

    /** Walk the field from (x0, y0); writes points into ox/oy and returns how many. */
    const walk = (
      x0: number, y0: number, sign: number, maxLen: number, clip: number, cr: number, sr: number,
      follow: number, maxTurn: number, edge: number, ox: Float32Array, oy: Float32Array,
    ) => {
      let x = x0;
      let y = y0;
      let n = 0;
      let pdx = 0;
      let pdy = 0;
      let turned = 0;
      const steps = Math.min(MAXP / 2 - 2, Math.floor(maxLen));
      for (let step = 0; step < steps; step++) {
        const i = (y | 0) * size + (x | 0);
        const f0 = edge > 0 ? edx[i] : dirX[i];
        const g0 = edge > 0 ? edy[i] : dirY[i];
        let fx = f0 * cr - g0 * sr;
        let fy = f0 * sr + g0 * cr;
        if (step === 0) {
          fx *= sign;
          fy *= sign;
        } else {
          if (fx * pdx + fy * pdy < 0) {
            fx = -fx;
            fy = -fy;
          }
          let nx = pdx + (fx - pdx) * follow;
          let ny = pdy + (fy - pdy) * follow;
          const l = Math.hypot(nx, ny) || 1;
          nx /= l;
          ny /= l;
          turned += Math.acos(Math.max(-1, Math.min(1, nx * pdx + ny * pdy)));
          if (turned > maxTurn) break;
          fx = nx;
          fy = ny;
        }
        x += fx;
        y += fy;
        if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) break;
        let j = (y | 0) * size + (x | 0);
        if (clip >= 0 && lab[j] !== clip) break;
        if (edge > 0) {
          const d = dist[j];
          if (d > edge) break;
          if (d > 0.5) {
            const gx = dist[j + 1] - dist[j - 1];
            const gy = dist[j + size] - dist[j - size];
            const gl = Math.hypot(gx, gy);
            if (gl > 0) {
              x -= (gx / gl) * Math.min(0.6, d * 0.4);
              y -= (gy / gl) * Math.min(0.6, d * 0.4);
              if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) break;
              j = (y | 0) * size + (x | 0);
            }
          }
        }
        ox[n] = x;
        oy[n] = y;
        n++;
        pdx = fx;
        pdy = fy;
      }
      return n;
    };

    /** Trace a stroke both ways from a seed pixel into px/py. */
    const trace = (seed: number, len: number, clip: number, rot: number, follow: number, maxTurn: number, edge: number) => {
      const x0 = (seed % size) + random();
      const y0 = Math.floor(seed / size) + random();
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const half = len / 2;
      const nb = walk(x0, y0, -1, half, clip, cr, sr, follow, maxTurn * 0.5, edge, bx, by);
      let n = 0;
      for (let k = nb - 1; k >= 0; k--) {
        px[n] = bx[k];
        py[n] = by[k];
        n++;
      }
      px[n] = x0;
      py[n] = y0;
      n++;
      const nf = walk(x0, y0, 1, half, clip, cr, sr, follow, maxTurn * 0.5, edge, bx, by);
      for (let k = 0; k < nf; k++) {
        px[n] = bx[k];
        py[n] = by[k];
        n++;
      }
      return n;
    };

    /** Lay one loaded stroke along px/py: bristle streaks, dry gaps, wet pickup and a ridge of paint. */
    const lay = (n: number, brush: Brush) => {
      if (n < 2) return;
      strokeId++;
      const B = Math.min(255, Math.max(3, Math.ceil(brush.w / 0.5) + 1));
      let mixPhase = random() * 10;
      const streak = random();
      for (let j = 0; j < B; j++) {
        bLoad[j] = 0.3 + 0.7 * random();
        bVal[j] = (random() - 0.5) * 0.06;
        mixPhase += 0.25 + random() * 0.3;
        const m = 0.5 + 0.5 * Math.sin(mixPhase);
        bMix[j] = streak < 0.25 ? 0 : smooth(0.45, 0.9, m) * (0.5 + 0.5 * streak);
        bHgt[j] = random();
      }
      const x0 = px[0] | 0;
      const y0 = py[0] | 0;
      const c0 = (y0 * size + x0) * 3;
      let carR = canvas[c0];
      let carG = canvas[c0 + 1];
      let carB = canvas[c0 + 2];
      const total = n - 1;
      const inLen = Math.min(total * 0.25, brush.w * 0.7);
      for (let k = 0; k < n; k++) {
        const x = px[k];
        const y = py[k];
        const k0 = k > 0 ? k - 1 : 0;
        const k1 = k < n - 1 ? k + 1 : n - 1;
        let tx = px[k1] - px[k0];
        let ty = py[k1] - py[k0];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        const nx = -ty;
        const ny = tx;
        const s = k / total;
        const along = k;
        let wf = 0.62 + 0.38 * smooth(0, Math.max(1, inLen), along);
        wf *= 1 - brush.taper * smooth(0.7, 1, s);
        const halfW = (brush.w * wf) / 2;
        const load = 1 - brush.dry * smooth(0.3, 1, s);
        const ci = ((y | 0) * size + (x | 0)) * 3;
        carR += (canvas[ci] - carR) * 0.05;
        carG += (canvas[ci + 1] - carG) * 0.05;
        carB += (canvas[ci + 2] - carB) * 0.05;
        const pick = brush.pickup * s;
        const blob = s < 0.12 ? 1.25 : 1;
        for (let j = 0; j < B; j++) {
          const t = (j / (B - 1)) * 2 - 1;
          const off = t * halfW;
          const X = Math.round(x + nx * off);
          const Y = Math.round(y + ny * off);
          if (X < 0 || Y < 0 || X >= size || Y >= size) continue;
          const p = Y * size + X;
          if (stamp[p] === strokeId) continue;
          if (brush.clip >= 0 && lab[p] !== brush.clip) continue;
          if (brush.seam > 0 && dist[p] < brush.seam) continue;
          stamp[p] = strokeId;
          const need = 1 - load;
          if (bLoad[j] < need) continue;
          if (bLoad[j] < need + 0.18 && random() < 0.5) continue;
          const at = Math.abs(t);
          const cov = brush.alpha * (at > 0.78 ? Math.max(0.25, (1 - at) / 0.22) : 1);
          const m = bMix[j];
          const v = 1 + bVal[j];
          let r = (ca[0] + (cb[0] - ca[0]) * m) * v;
          let g = (ca[1] + (cb[1] - ca[1]) * m) * v;
          let b = (ca[2] + (cb[2] - ca[2]) * m) * v;
          r += (carR - r) * pick;
          g += (carG - g) * pick;
          b += (carB - b) * pick;
          const q = p * 3;
          canvas[q] += (r - canvas[q]) * cov;
          canvas[q + 1] += (g - canvas[q + 1]) * cov;
          canvas[q + 2] += (b - canvas[q + 2]) * cov;
          const hgt = brush.thick * (0.7 + 0.3 * bHgt[j]) * (0.85 + 0.35 * at * at) * blob * (0.6 + 0.4 * load);
          H[p] = H[p] * (1 - cov * 0.7) + hgt * cov;
        }
      }
    };

    // ---- colour for one stroke --------------------------------------------------------------------
    const palettes = new Map<number, Entry[]>();
    const paletteFor = (L: number) => {
      let p = palettes.get(L);
      if (p) return p;
      p = [];
      const n = vg ? 10 : 6;
      const spread = vg ? 0.05 + random() * 0.035 : 0.025 + random() * 0.02;
      for (let k = 0; k < n; k++)
        p.push({
          dh: ((k / (n - 1)) * 2 - 1) * spread + (random() - 0.5) * 0.012,
          abs: -1,
          sm: 0.75 + random() * 0.4,
          dl: (random() - 0.5) * (vg ? 0.12 : 0.08),
          w: 1,
        });
      if (vg) {
        p.push({ dh: 0.5 + (random() - 0.5) * 0.08, abs: -1, sm: 0.85, dl: 0.04, w: 0.22 });
        p.push({ dh: 0, abs: chord.accent, sm: 1.1, dl: 0.06, w: 0.2 });
        p.push({ dh: (random() < 0.5 ? -1 : 1) * 0.15, abs: -1, sm: 0.95, dl: -0.03, w: 0.45 });
      }
      palettes.set(L, p);
      return p;
    };
    const pickEntry = (p: Entry[], accent: boolean) => {
      let total = 0;
      for (const e of p) total += e.w < 1 && accent ? e.w * 3 : e.w;
      let r = random() * total;
      for (const e of p) {
        r -= e.w < 1 && accent ? e.w * 3 : e.w;
        if (r <= 0) return e;
      }
      return p[p.length - 1];
    };
    const fromEntry = (e: Entry, h: number, s: number, l: number, dl: number, out: number[]) =>
      fromHsl(e.abs >= 0 ? e.abs : h + e.dh, clamp01(s * e.sm), clamp01(l + e.dl + dl), out);
    const pickBlue = (L: number, out: number[]) => {
      let total = 0;
      const w = blues.map((b) => {
        const v = Math.exp(-(((b.l - L) / 0.07) ** 2)) + 1e-4;
        total += v;
        return v;
      });
      let r = random() * total;
      let k = 0;
      for (; k < w.length - 1; k++) {
        r -= w[k];
        if (r <= 0) break;
      }
      const b = blues[k];
      const j = 1 + (random() - 0.5) * 0.08;
      out[0] = b.r * j;
      out[1] = b.g * j;
      out[2] = b.b * j;
    };
    /** pass: 0 blocking in, 1 main, 2 accents */
    const colourFor = (seed: number, L: number, pass: number) => {
      const q = seed * 3;
      let r = tgt[q];
      let g = tgt[q + 1];
      let b = tgt[q + 2];
      if (pass === 0) {
        r = (r + soft[q]) / 2;
        g = (g + soft[q + 1]) / 2;
        b = (b + soft[q + 2]) / 2;
      }
      if (bl) {
        toHsl(r, g, b, hs);
        if (pass === 2) {
          pickBlue(hs[2] + (random() - 0.5) * 0.06, ca);
          pickBlue(hs[2] + (random() - 0.5) * 0.1, cb);
          return;
        }
        const turn = (random() - 0.5) * 0.05;
        blueAt(hs[2] + (random() - 0.5) * 0.05, ca, 0);
        toHsl(ca[0], ca[1], ca[2], tmp);
        fromHsl(tmp[0] + turn, tmp[1], tmp[2], ca);
        blueAt(hs[2] + (random() - 0.5) * 0.08, cb, 0);
        return;
      }
      if (mu && isSkyL(L)) {
        const j = 1 + (random() - 0.5) * 0.1;
        ca[0] = r * j;
        ca[1] = g * j;
        ca[2] = b * j;
        // the neighbouring band bleeds into the same stroke
        const x = seed % size;
        const y = Math.floor(seed / size);
        const k = ((Math.floor(bandY(x, y) / bandW + (random() < 0.5 ? 1 : -1)) % 7) + 7) % 7;
        cb[0] = bands[k][0];
        cb[1] = bands[k][1];
        cb[2] = bands[k][2];
        return;
      }
      toHsl(r, g, b, hs);
      const [h, s, l] = hs;
      const p = paletteFor(L);
      const lj = pass === 2 ? (random() < 0.5 ? -1 : 1) * 0.08 : 0;
      let first: Entry;
      if (vg && pass !== 2 && random() < 0.65) {
        // colour runs in streams: the palette entry drifts slowly across the region
        const nMain = 10;
        const v = vnoise((seed % size) / (38 * px1), Math.floor(seed / size) / (38 * px1), nseed + 31 + L * 7);
        const c = clamp01((v - 0.5) * 1.9 + 0.5) * nMain;
        first = p[Math.max(0, Math.min(nMain - 1, Math.floor(c + (random() - 0.5) * 3)))];
      } else first = pickEntry(p, pass === 2);
      fromEntry(first, h, s, l, lj, ca);
      fromEntry(pickEntry(p, false), h, s, l, lj * 0.5, cb);
    };

    // ---- the passes -----------------------------------------------------------------------------------
    const lenF = vg ? mix(0.5, 1.75, answers.stroke) : mu ? mix(0.6, 1.4, answers.stroke) : mix(0.7, 1.5, answers.stroke);
    const wF = mix(0.65, 1.55, answers.load);
    const thickF = mix(0.35, 1.5, answers.load) * (vg ? 1 : mu ? 0.35 : 0.5);
    const jitterA = (vg ? 0.14 : mu ? 0.05 : 0.12) * (0.7 + 0.6 * mood.energy);
    const dims = DIMS[answers.tradition];
    const labels: number[] = [];
    for (let L = 0; L < LABELS; L++) if (cnt[L] >= 12) labels.push(L);
    // things last, farthest first
    const meanDepth = new Float32Array(LABELS);
    for (let i = 0; i < N; i++) meanDepth[lab[i]] += dep[i];
    for (const L of labels) meanDepth[L] /= cnt[L];
    const background = labels.filter((L) => L < 16);
    const things = labels.filter((L) => L >= 16).sort((a, b) => meanDepth[b] - meanDepth[a]);

    const seedsFor = (L: number, len: number, w: number, cov: number) => {
      const effLen = Math.min(len, 0.9 * Math.sqrt(cnt[L]) + 4);
      const cell = Math.max(1.5, Math.sqrt((effLen * w) / cov));
      const seeds: number[] = [];
      for (let gy = mnY[L]; gy <= mxY[L]; gy += cell)
        for (let gx = mnX[L]; gx <= mxX[L]; gx += cell) {
          const x = Math.min(size - 1, Math.floor(gx + random() * cell));
          const y = Math.min(size - 1, Math.floor(gy + random() * cell));
          const p = y * size + x;
          if (lab[p] !== L) continue;
          if (M[p] < 1 && random() > M[p]) continue;
          seeds.push(p);
        }
      for (let k = seeds.length - 1; k > 0; k--) {
        const r = Math.floor(random() * (k + 1));
        const t = seeds[k];
        seeds[k] = seeds[r];
        seeds[r] = t;
      }
      return seeds;
    };

    const confidence = capture.confidence;
    const paintRegion = async (L: number, pass: number, cov: number, lenM: number, wM: number) => {
      const role = roleOf(L);
      let [len, w] = dims[role];
      let c = cov;
      if (role === 'thing') {
        const sF = Math.min(1, Math.max(0.5, Math.sqrt(cnt[L] / (N * 0.05))));
        len *= vg || bl ? sF : 1;
        w *= sF;
        const conf = confidence?.[L - 16] ?? 1;
        c *= mix(0.6, 1, clamp01(conf));
      }
      len *= lenF * lenM * px1;
      w *= wF * wM * px1;
      const seeds = seedsFor(L, len, w, c);
      const brush: Brush = {
        w,
        alpha: mu ? 0.58 + 0.2 * random() : bl ? 0.92 : 1,
        dry: vg ? 0.35 + 0.3 * mood.wear : mu ? 0.25 : 0.45 + 0.25 * mood.wear,
        pickup: vg ? 0.2 : mu ? 0.12 : 0.3,
        thick: thickF * (role === 'thing' ? 0.4 : 1),
        clip: L,
        seam: mu ? answers.contour * 2.2 * px1 : 0,
        taper: vg ? 0.4 : mu ? 0.75 : 0.25,
      };
      const follow = mu ? 0.45 : vg ? 0.5 : 0.3;
      const maxTurn = mu ? 4.5 : vg ? 1.1 : 0.7;
      let count = 0;
      for (const seed of seeds) {
        const sl = len * (0.75 + random() * 0.5);
        brush.w = w * (0.85 + random() * 0.3);
        if (mu) brush.alpha = 0.55 + 0.25 * random();
        colourFor(seed, L, pass);
        const n = trace(seed, sl, L, (random() - 0.5) * 2 * jitterA, follow, maxTurn, 0);
        lay(n, brush);
        if (++count % 600 === 0) await breathe();
      }
    };

    if (vg) {
      const passes: [number, number, number, number][] = [
        [0, 0.8, 1.15, 1.15],
        [1, 1.25, 1, 1],
        [2, 0.32, 0.7, 0.8],
      ];
      for (const [pass, cov, lenM, wM] of passes) {
        for (const L of background) await paintRegion(L, pass, cov, lenM, wM);
        for (const L of things) await paintRegion(L, pass, cov * (pass === 0 ? 1 : 1.15), lenM, wM);
      }
    } else if (mu) {
      for (const L of background) await paintRegion(L, 1, 1.55, 1, 1);
      for (const L of things) await paintRegion(L, 1, 1.7, 1, 1);
    } else {
      for (const L of background) await paintRegion(L, 1, 1.5, 1, 1);
      // the broad passes are softened together, as if dragged with a dry rag
      const blurred = canvas.slice();
      for (let c = 0; c < 3; c++) boxBlur(blurred, size, Math.round(4 * px1), 3, c, 1);
      for (let i = 0; i < N * 3; i++) canvas[i] = mix(canvas[i], blurred[i], 0.72);
      boxBlur(H, size, 1);
      for (const L of things) await paintRegion(L, 1, 1.6, 1, 1);
      for (const L of things) await paintRegion(L, 2, 0.4, 0.7, 0.6);
      // dry-brush filaments across everything
      const fil: Brush = { w: 1.6 * px1, alpha: 0.12, dry: 0.5, pickup: 0, thick: 0.1, clip: -1, seam: 0, taper: 0.6 };
      const count = Math.round(900 * (N / (720 * 720)));
      for (let k = 0; k < count; k++) {
        const seed = Math.floor(random() * N);
        if (M[seed] < 0.5) continue;
        const light = random() < 0.55;
        const c = light ? blues[blues.length - 2] : blues[1];
        ca[0] = cb[0] = c.r;
        ca[1] = cb[1] = c.g;
        ca[2] = cb[2] = c.b;
        fil.w = (1.2 + random() * 1.2) * px1;
        fil.clip = lab[seed];
        const n = trace(seed, (14 + random() * 30) * px1, lab[seed], (random() - 0.5) * 0.2, 0.3, 0.6, 0);
        lay(n, fil);
      }
    }
    await breathe();

    // ---- contours ------------------------------------------------------------------------------------
    const contour = answers.contour;
    if ((vg || bl) && contour > 0.04) {
      const cw = (vg ? mix(1.4, 4.2, contour) : mix(2.4, 5.6, contour)) * px1;
      const clen = (vg ? 26 : 40) * px1;
      const list: number[] = [];
      for (let i = 0; i < N; i++) {
        if (!E[i]) continue;
        if (E[i] === 2 && random() > (vg ? 0.6 : 0.35)) continue;
        if (M[i] < 0.6) continue;
        list.push(i);
      }
      const every = Math.max(2, Math.round(clen * 0.36));
      const brush: Brush = {
        w: cw,
        alpha: vg ? 0.55 + 0.4 * contour : 0.94,
        dry: vg ? 0.45 : 0.08,
        pickup: vg ? 0.1 : 0,
        thick: thickF * 0.8,
        clip: -1,
        seam: 0,
        taper: vg ? 0.5 : 0.2,
      };
      let count = 0;
      for (let k = Math.floor(random() * every); k < list.length; k += every) {
        const seed = list[Math.min(list.length - 1, k + Math.floor(random() * every))];
        if (vg) {
          const c = deepBlues[Math.floor(random() * deepBlues.length)];
          const t = 0.5 + 0.38 * contour;
          const q = seed * 3;
          for (let ch = 0; ch < 3; ch++) ca[ch] = mix(canvas[q + ch], c[ch], t);
          const c2 = deepBlues[Math.floor(random() * deepBlues.length)];
          for (let ch = 0; ch < 3; ch++) cb[ch] = mix(canvas[q + ch], c2[ch], t + 0.1);
          brush.w = cw * (0.75 + random() * 0.5);
        } else {
          const j = 0.9 + random() * 0.2;
          ca[0] = prussian.r * j;
          ca[1] = prussian.g * j;
          ca[2] = prussian.b * j;
          cb[0] = ca[0] * 1.3;
          cb[1] = ca[1] * 1.3;
          cb[2] = ca[2] * 1.3;
        }
        const n = trace(seed, clen * (0.8 + random() * 0.4), -1, 0, 0.6, 2.4, cw * 0.5 + 1.5);
        lay(n, brush);
        if (++count % 600 === 0) await breathe();
      }
    }

    // ---- palette-knife scraping --------------------------------------------------------------------
    if (state === 'scraped') {
      const snap = canvas.slice();
      const swaths = 3 + Math.floor(random() * 3);
      for (let s = 0; s < swaths; s++) {
        const ang = rightA + (random() - 0.5) * 1.1;
        const cx = Math.cos(ang);
        const cy = Math.sin(ang);
        const len = (130 + random() * 150) * px1;
        const wid = (28 + random() * 28) * px1;
        const half = wid / 2;
        // the knife works the ground and backdrop around the subject, not the subject itself
        let x0 = 0;
        let y0 = 0;
        for (let tries = 0; tries < 24; tries++) {
          x0 = (0.08 + random() * 0.55) * size;
          y0 = (0.15 + random() * 0.7) * size;
          if (ids[Math.floor(y0) * size + Math.floor(x0)] < 3) break;
        }
        const xs = [x0 - half, x0 + half, x0 + cx * len - half, x0 + cx * len + half];
        const ys = [y0 - half, y0 + half, y0 + cy * len - half, y0 + cy * len + half];
        const xa = Math.max(1, Math.floor(Math.min(...xs)));
        const xb = Math.min(size - 2, Math.ceil(Math.max(...xs)));
        const ya = Math.max(1, Math.floor(Math.min(...ys)));
        const yb = Math.min(size - 2, Math.ceil(Math.max(...ys)));
        for (let y = ya; y <= yb; y++)
          for (let x = xa; x <= xb; x++) {
            const u = (x - x0) * cx + (y - y0) * cy;
            const v = -(x - x0) * cy + (y - y0) * cx;
            if (u < 0 || u > len) continue;
            const edge = half * (0.78 + 0.4 * vnoise(u / (22 * px1), s * 7.3, nseed + 12));
            if (Math.abs(v) > edge) continue;
            const i = y * size + x;
            if (ids[i] >= 3) continue;
            const fade = smooth(0, 5 * px1, u) * (1 - smooth(len - 8 * px1, len, u));
            // the knife drags the paint it gathered: each line across the blade by its own distance
            const line = Math.floor(v / (1.5 * px1) + 1000);
            const drag = Math.min(u, (8 + 40 * hash2(line, s, nseed + 13)) * px1);
            const sx = Math.min(size - 1, Math.max(0, Math.round(x - cx * drag)));
            const sy = Math.min(size - 1, Math.max(0, Math.round(y - cy * drag)));
            const from = (ids[sy * size + sx] >= 3 ? i : sy * size + sx) * 3;
            const thin = 0.25 + 0.5 * hash2(line, s + 7, nseed + 14);
            const q = i * 3;
            const k = 0.92 * fade;
            canvas[q] = mix(canvas[q], mix(snap[from], support.tone[0], thin * 0.5), k);
            canvas[q + 1] = mix(canvas[q + 1], mix(snap[from + 1], support.tone[1], thin * 0.5), k);
            canvas[q + 2] = mix(canvas[q + 2], mix(snap[from + 2], support.tone[2], thin * 0.5), k);
            H[i] = mix(H[i], 0.02 + 0.05 * thin, k);
            if (Math.abs(v) > edge - 3 * px1) H[i] += (0.4 * thickF + 0.35) * fade;
          }
      }
    }
    await breathe();

    // ---- light the paint ------------------------------------------------------------------------------
    boxBlur(H, size, 1);
    const hT = new Float32Array(N);
    {
      const P = 3.2 * px1;
      const wAmp = support.weave * 0.13;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          let weave = 0;
          if (wAmp > 0) {
            const u = x / P;
            const v = y / P;
            const iu = Math.floor(u);
            const iv = Math.floor(v);
            const fu = u - iu;
            const fv = v - iv;
            const over = (iu + iv) & 1;
            weave = over ? Math.sin(Math.PI * fu) * (0.75 + 0.25 * Math.sin(Math.PI * fv)) : Math.sin(Math.PI * fv) * (0.75 + 0.25 * Math.sin(Math.PI * fu));
            weave *= 0.8 + 0.4 * hash2(iu, iv, nseed);
          }
          const bare = 1 - smooth(0.05, 0.5, H[i]);
          hT[i] = H[i] * 1.1 + wAmp * weave * (0.3 + 0.7 * bare) + support.fibre * 0.05 * vnoise(x / 2, y / 6, nseed + 6);
        }
    }
    let lx = capture.light[0];
    let ly = capture.light[1];
    {
      const l = Math.hypot(lx, ly);
      if (l < 0.15) {
        lx = -0.6;
        ly = -0.7;
      }
      const m = Math.hypot(lx, ly);
      lx /= m;
      ly /= m;
    }
    const Lz = 0.75;
    const Ll = Math.hypot(lx * 0.66, ly * 0.66, Lz);
    const Lx = (lx * 0.66) / Ll;
    const Ly = (ly * 0.66) / Ll;
    const LZ = Lz / Ll;
    const hvl = Math.hypot(Lx, Ly, LZ + 1);
    const Hx = Lx / hvl;
    const Hy = Ly / hvl;
    const Hz = (LZ + 1) / hvl;
    const specP = 28;
    const specFlat = Math.pow(Hz, specP);
    const specAmt =
      (vg ? 0.32 : mu ? 0.06 : 0.12) * (state === 'fresh' ? 2.4 : state === 'aged' ? 0.45 : 1) * (answers.support === 'cardboard' ? 0.4 : 1);
    const shadeAmt = 1.05;
    const out = new Float32Array(N * 3);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let gx = 0;
        let gy = 0;
        if (x > 0 && x < size - 1) gx = (hT[i + 1] - hT[i - 1]) * 0.5;
        if (y > 0 && y < size - 1) gy = (hT[i + size] - hT[i - size]) * 0.5;
        const nl = Math.hypot(gx, gy, 1);
        const nx = -gx / nl;
        const ny = -gy / nl;
        const nz = 1 / nl;
        const shade = 1 + (nx * Lx + ny * Ly) * shadeAmt;
        const sp = Math.max(0, nx * Hx + ny * Hy + nz * Hz);
        const spec = Math.max(0, Math.pow(sp, specP) - specFlat) * specAmt;
        const q = i * 3;
        out[q] = canvas[q] * shade + spec;
        out[q + 1] = canvas[q + 1] * shade + spec;
        out[q + 2] = canvas[q + 2] * shade + spec * 0.95;
      }
    await breathe();

    // ---- age: varnish and craquelure -----------------------------------------------------------------
    const crackle = state === 'aged' ? 1 : mood.wear > 0.7 ? (mood.wear - 0.7) * 1.6 : 0;
    if (state === 'aged' || crackle > 0) {
      const cell = 13 * px1;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const q = i * 3;
          if (state === 'aged') {
            const l = 0.3 * out[q] + 0.59 * out[q + 1] + 0.11 * out[q + 2];
            out[q] = mix(out[q], l, 0.1) * 0.95;
            out[q + 1] = mix(out[q + 1], l, 0.1) * 0.91;
            out[q + 2] = mix(out[q + 2], l, 0.1) * 0.8;
          }
          // F2 - F1 on a jittered grid, wobbled
          const wx = x + (vnoise(x / 9, y / 9, nseed + 7) - 0.5) * 4;
          const wy = y + (vnoise(x / 9, y / 9, nseed + 8) - 0.5) * 4;
          const cx = Math.floor(wx / cell);
          const cy = Math.floor(wy / cell);
          let f1 = 1e9;
          let f2 = 1e9;
          for (let oy = -1; oy <= 1; oy++)
            for (let ox = -1; ox <= 1; ox++) {
              const gx = cx + ox;
              const gy = cy + oy;
              const fx = (gx + hash2(gx, gy, nseed + 21)) * cell;
              const fy = (gy + hash2(gx, gy, nseed + 22)) * cell;
              const d = Math.hypot(wx - fx, wy - fy);
              if (d < f1) {
                f2 = f1;
                f1 = d;
              } else if (d < f2) f2 = d;
            }
          const e = f2 - f1;
          if (e < 0.8) {
            const k = (1 - e / 0.8) * 0.32 * crackle * smooth(0.35, 0.6, vnoise(x / 30, y / 30, nseed + 23));
            out[q] *= 1 - k;
            out[q + 1] *= 1 - k;
            out[q + 2] *= 1 - k * 0.9;
          }
        }
    }
    await breathe();

    // ---- the whole picture wavers, row by row ---------------------------------------------------------
    const amp = (mu ? mix(2.5, 11, answers.warp) : mix(0, 8, answers.warp)) * (0.8 + 0.4 * mood.energy) * px1;
    const pixels = new Uint8ClampedArray(N * 4);
    {
      const m = amp > 0.2 ? Math.ceil(amp * 1.5) + 1 : 0;
      const sc = (size - 2 * m - 1) / (size - 1);
      const p1 = random() * 6.28;
      const p2 = random() * 6.28;
      const p3 = random() * 6.28;
      const rowShift = new Float32Array(size);
      const colShift = new Float32Array(size);
      for (let k = 0; k < size; k++) {
        rowShift[k] = amp * (Math.sin((k * 0.018) / px1 + p1) + 0.45 * Math.sin((k * 0.0465) / px1 - p2)) / 1.45;
        colShift[k] = amp * 0.6 * Math.sin((k * 0.0135) / px1 + p3);
      }
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          let sx = m + x * sc + rowShift[y];
          let sy = m + y * sc + colShift[x];
          sx = Math.min(size - 1.001, Math.max(0, sx));
          sy = Math.min(size - 1.001, Math.max(0, sy));
          const ix = Math.floor(sx);
          const iy = Math.floor(sy);
          const fx = sx - ix;
          const fy = sy - iy;
          const a = (iy * size + ix) * 3;
          const b = a + 3;
          const c = a + size * 3;
          const d = c + 3;
          const o = (y * size + x) * 4;
          for (let ch = 0; ch < 3; ch++) {
            const top = out[a + ch] + (out[b + ch] - out[a + ch]) * fx;
            const bot = out[c + ch] + (out[d + ch] - out[c + ch]) * fx;
            pixels[o + ch] = (top + (bot - top) * fy) * 255;
          }
          pixels[o + 3] = 255;
        }
    }

    const names = { swirl: 'Post-Impressionist swirl', scream: 'Expressionist scream', blue: 'Blue-period melancholy' } as const;
    return {
      pixels,
      notes: [
        `${names[answers.tradition]} in a ${answers.chord} chord`,
        `${Math.round(dims.sky[0] * lenF)} px strokes, ${answers.load > 0.6 ? 'heavy impasto' : answers.load < 0.3 ? 'thin paint' : 'a full brush'}`,
        ...(vortices.length ? [`${vortices.length} sky ${vortices.length > 1 ? 'eddies' : 'eddy'}`] : []),
        `on ${answers.support}, ${answers.state}`,
        ...(amp > 1 ? [`wavering ${amp.toFixed(1)} px`] : []),
      ],
    };
  },
});
