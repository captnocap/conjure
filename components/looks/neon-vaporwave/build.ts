import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

// Synthwave neon, built from the capture rather than filtered from the colour:
//   geometry -> the camera is recovered from depth and normals, so the ground grid lies on the ground
//   set      -> sky gradient, striped sun, palms or wire mountains, and an endless grid floor beyond
//   fill     -> things go dark, neon-lit, chrome or pastel
//   tubes    -> silhouettes (identity and depth steps) and strong creases only, never soft joints,
//               drawn as glass tubing: coloured body, near-white core, two halos
//   tape     -> chroma bleed, channel split, tracking bands, dropouts, scanlines, then the VCR's own text

type RGB = [number, number, number];

const hex = (value: string): RGB => {
  const n = parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const blend = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const times = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const luma = (c: RGB) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
const WHITE: RGB = [1, 1, 1];

interface Palette {
  label: string;
  /** Sky from the zenith to the horizon. */
  sky: [string, string, string, string];
  /** Sun from its crown to its sliced base. */
  sun: [string, string];
  floor: string;
  grid: string;
  tubes: [string, string, string, string];
  /** Top, middle and bottom of a chrome-lettering gradient. */
  ramp: [string, string, string];
  shade: string;
  pastelSky: [string, string, string, string];
  pastelFloor: string;
  pastelShadow: string;
}

const PALETTES: Record<string, Palette> = {
  sunset: {
    label: 'sunset (coral, magenta, gold)',
    sky: ['#1e0b26', '#5c1745', '#c23a5c', '#ff9a5c'],
    sun: ['#ffe45c', '#ff3d78'],
    floor: '#170711',
    grid: '#ff4f9e',
    tubes: ['#ff6a55', '#ff2f9a', '#ffc93c', '#ff9450'],
    ramp: ['#ffd84a', '#ff6a55', '#ff2f9a'],
    shade: '#26101c',
    pastelSky: ['#f6c3d8', '#ffd1bd', '#ffe2ae', '#fff3d9'],
    pastelFloor: '#fbd9e2',
    pastelShadow: '#c58fb8',
  },
  arcade: {
    label: 'arcade (cyan, pink, yellow)',
    sky: ['#02030d', '#0a1038', '#142f66', '#1bb8d8'],
    sun: ['#fff35a', '#ff48b8'],
    floor: '#03040f',
    grid: '#2ee6ff',
    tubes: ['#ff4fbf', '#2ee6ff', '#ffe84a', '#66ff9a'],
    ramp: ['#ffe84a', '#ff4fbf', '#2ee6ff'],
    shade: '#0b0e26',
    pastelSky: ['#bdeeff', '#d9f5ff', '#ffdcef', '#fffbd2'],
    pastelFloor: '#e2f7ff',
    pastelShadow: '#8fb5e8',
  },
  nightdrive: {
    label: 'night drive (teal and amber)',
    sky: ['#020b0e', '#07262c', '#0e4446', '#d98a3c'],
    sun: ['#ffdc86', '#e45d1a'],
    floor: '#02090b',
    grid: '#1ad2c0',
    tubes: ['#ffae3b', '#1fe0c6', '#ff7a2e', '#a8fff0'],
    ramp: ['#ffd27a', '#ffae3b', '#1fe0c6'],
    shade: '#071a1d',
    pastelSky: ['#cdeee8', '#dff3ea', '#ffe5c2', '#fff2de'],
    pastelFloor: '#dcf2ec',
    pastelShadow: '#79b3ab',
  },
  redline: {
    label: 'redline (crimson and orange)',
    sky: ['#060102', '#2a0408', '#6e0a12', '#ff4a1c'],
    sun: ['#ffe14d', '#ff1f2d'],
    floor: '#080102',
    grid: '#ff2a3a',
    tubes: ['#ff2a3a', '#ff8a1f', '#ffd84a', '#ff5c6c'],
    ramp: ['#ffd84a', '#ff8a1f', '#ff2a3a'],
    shade: '#1c0507',
    pastelSky: ['#ffd3cc', '#ffdfca', '#ffedc2', '#fff6e2'],
    pastelFloor: '#ffe2dc',
    pastelShadow: '#d98c86',
  },
  miami: {
    label: 'Miami (flamingo pink and aqua)',
    sky: ['#0a1838', '#23407c', '#d8689c', '#ffc2a6'],
    sun: ['#fff0a0', '#ff68a8'],
    floor: '#0a1430',
    grid: '#4ff0e0',
    tubes: ['#ff70b8', '#4ff0e0', '#fff1a8', '#7fd0ff'],
    ramp: ['#fff1a8', '#ff70b8', '#4ff0e0'],
    shade: '#142246',
    pastelSky: ['#b8e4ff', '#d8eeff', '#ffd2e5', '#ffe9d6'],
    pastelFloor: '#dcf6f4',
    pastelShadow: '#8fc6d8',
  },
  vapor: {
    label: 'vapor (magenta, cyan, lavender)',
    sky: ['#120526', '#3b0d63', '#a12aa0', '#ff6ad5'],
    sun: ['#ffe66b', '#ff2fa0'],
    floor: '#0e0420',
    grid: '#ff4fd8',
    tubes: ['#3ff6ff', '#ff4fd8', '#b8a0ff', '#7dffc8'],
    ramp: ['#7dffc8', '#3ff6ff', '#ff4fd8'],
    shade: '#1e0a3a',
    pastelSky: ['#c9b8ff', '#e2c8ff', '#ffc8e8', '#ccfff0'],
    pastelFloor: '#f0dcff',
    pastelShadow: '#9d8ad8',
  },
};

// 5x7 character generator for the VCR's on-screen display: one byte per column, bit 0 at the top.
const FONT: Record<string, readonly number[]> = {
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e], '1': [0x00, 0x42, 0x7f, 0x40, 0x00], '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31], '4': [0x18, 0x14, 0x12, 0x7f, 0x10], '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30], '7': [0x01, 0x71, 0x09, 0x05, 0x03], '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e], ':': [0x00, 0x36, 0x36, 0x00, 0x00], '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  A: [0x7e, 0x11, 0x11, 0x11, 0x7e], B: [0x7f, 0x49, 0x49, 0x49, 0x36], C: [0x3e, 0x41, 0x41, 0x41, 0x22],
  D: [0x7f, 0x41, 0x41, 0x22, 0x1c], E: [0x7f, 0x49, 0x49, 0x49, 0x41], F: [0x7f, 0x09, 0x09, 0x09, 0x01],
  G: [0x3e, 0x41, 0x49, 0x49, 0x7a], H: [0x7f, 0x08, 0x08, 0x08, 0x7f], I: [0x00, 0x41, 0x7f, 0x41, 0x00],
  J: [0x20, 0x40, 0x41, 0x3f, 0x01], K: [0x7f, 0x08, 0x14, 0x22, 0x41], L: [0x7f, 0x40, 0x40, 0x40, 0x40],
  M: [0x7f, 0x02, 0x0c, 0x02, 0x7f], N: [0x7f, 0x04, 0x08, 0x10, 0x7f], O: [0x3e, 0x41, 0x41, 0x41, 0x3e],
  P: [0x7f, 0x09, 0x09, 0x09, 0x06], R: [0x7f, 0x09, 0x19, 0x29, 0x46], S: [0x46, 0x49, 0x49, 0x49, 0x31],
  T: [0x01, 0x01, 0x7f, 0x01, 0x01], U: [0x3f, 0x40, 0x40, 0x40, 0x3f], V: [0x1f, 0x20, 0x40, 0x20, 0x1f],
  W: [0x3f, 0x40, 0x38, 0x40, 0x3f], Y: [0x07, 0x08, 0x70, 0x08, 0x07],
  '>': [0x7f, 0x3e, 0x1c, 0x08, 0x00], '<': [0x08, 0x1c, 0x3e, 0x7f, 0x00], '|': [0x7f, 0x7f, 0x00, 0x7f, 0x7f],
  '*': [0x1c, 0x3e, 0x3e, 0x3e, 0x1c],
};
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const two = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** Separable running-sum box blur, in place. Three passes approach a gaussian. */
function boxBlur(data: Float32Array, n: number, radius: number, passes: number, scratch: Float32Array) {
  const r = Math.round(radius);
  if (r < 1) return;
  const span = r * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < n; y++) {
      const row = y * n;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += data[row + Math.min(n - 1, Math.max(0, k))];
      for (let x = 0; x < n; x++) {
        scratch[x] = sum / span;
        sum += data[row + Math.min(n - 1, x + r + 1)] - data[row + Math.max(0, x - r)];
      }
      for (let x = 0; x < n; x++) data[row + x] = scratch[x];
    }
    for (let x = 0; x < n; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += data[Math.min(n - 1, Math.max(0, k)) * n + x];
      for (let y = 0; y < n; y++) {
        scratch[y] = sum / span;
        sum += data[Math.min(n - 1, y + r + 1) * n + x] - data[Math.max(0, y - r) * n + x];
      }
      for (let y = 0; y < n; y++) data[y * n + x] = scratch[y];
    }
  }
}

/** Horizontal-only box blur, in place, for chroma smear. */
function rowBlur(data: Float32Array, n: number, radius: number, passes: number, scratch: Float32Array) {
  const r = Math.round(radius);
  if (r < 1) return;
  const span = r * 2 + 1;
  for (let pass = 0; pass < passes; pass++)
    for (let y = 0; y < n; y++) {
      const row = y * n;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += data[row + Math.min(n - 1, Math.max(0, k))];
      for (let x = 0; x < n; x++) {
        scratch[x] = sum / span;
        sum += data[row + Math.min(n - 1, x + r + 1)] - data[row + Math.max(0, x - r)];
      }
      for (let x = 0; x < n; x++) data[row + x] = scratch[x];
    }
}

/** The centre of a one-pixel line after the same blur: what a line's blurred peak should be divided by. */
function linePeak(radius: number, passes: number): number {
  const r = Math.round(radius);
  if (r < 1) return 1;
  const length = r * passes * 2 + 3;
  let line = new Float64Array(length);
  line[length >> 1] = 1;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float64Array(length);
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += line[Math.min(length - 1, Math.max(0, i + k))];
      next[i] = sum / (r * 2 + 1);
    }
    line = next;
  }
  return line[length >> 1];
}

const hash2 = (x: number, y: number, salt: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ salt;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    palette: choice('Which neon palette lights the frame?', {
      sunset: 'Sunset: coral, hot magenta and gold tubes under a plum-to-coral sky; a beach boulevard at the end of the day.',
      arcade: 'Arcade: electric cyan, bubblegum pink and lemon yellow on near-black navy; an attract screen in a dark arcade.',
      nightdrive: 'Night drive: teal and amber on a deep teal night with an orange city glow on the horizon; a highway after midnight.',
      redline: 'Redline: crimson, orange and yellow on black under a burning red horizon; outrun, speed and menace.',
      miami: 'Miami: flamingo pink and aqua under a blue-to-pink dusk; deco hotels, palms and cocktails.',
      vapor: 'Vapor: magenta, cyan and lavender over a violet sky; the classic mall-soft vaporwave glow.',
    }),
    fill: choice('Are things filled, or only drawn in light?', {
      outline: 'Only outlined: every object is a dark shape traced by glowing tubes, like a neon sign switched on at night.',
      neonlit: 'Lit by neon: dark surfaces washed in coloured light from both sides, warm on the lit face and cool on the shadowed one.',
      chrome: 'Chrome: polished mirror metal reflecting the sunset above a hard dark horizon line, with white glints; eighties airbrush.',
      pastel: 'Pastel daylight: soft flat pastel fills, a pale sky and a chequered floor; a deserted food court, mall-soft calm.',
    }),
    tubes: choice('How are the neon tubes coloured?', {
      each: 'Each object in its own colour, like separate signs in one window.',
      split: 'Two-tone: warm on the side facing the light, cool on the side turned away from it.',
      single: 'One colour throughout, as if the whole scene were bent from a single length of tubing.',
      gradient: 'A sunset gradient running down the frame, from the top colour to the bottom one, like chrome lettering.',
    }),
    weight: score('How thick are the neon tubes?', ['Hairline filaments', 'Fine tubing', 'Sign-shop tubing', 'Fat glass tubes']),
    glow: score('How hard do the tubes glow?', [
      'Dry lines with barely a halo',
      'A soft halo',
      'A coloured haze around every line',
      'Blazing: halos fill the air',
      'Blooming: everything swims in light',
    ]),
    grid: score('How fine is the grid laid over the ground?', [
      'A few wide squares',
      'Broad tiles',
      'A regular grid',
      'Fine graph paper',
      'A dense mesh',
    ]),
    sky: choice('What stands on the horizon behind the scene?', {
      setting: 'A huge striped sun half sunk into the horizon, its lower bands sliced away.',
      risen: 'A whole striped sun standing clear of the horizon, ringed in glow.',
      mountains: 'Wireframe mountains traced in neon along the horizon, a smaller sun behind them.',
      palms: 'A setting striped sun framed by black palm-tree silhouettes.',
      stars: 'No sun: a night sky full of stars over one long glowing horizon line.',
    }),
    tape: choice('What is the tape doing right now?', {
      playing: 'Playing: PLAY and a running tape counter in the corner, a tracking band drifting through.',
      paused: 'Paused on this frame: PAUSE in the corner, two bars of noise frozen across the picture, the frame shivering.',
      rewinding: 'Rewinding: the picture torn by horizontal streaks and skewed, REW in the corner.',
      recording: 'Recording off the air: a red REC dot and an eighties date stamp burned into the corner.',
      broadcast: 'No on-screen display: a clean dub where only the tape itself shows.',
    }),
    vhs: score('How damaged is the videotape?', [
      'A clean digital master',
      'Soft tape: a little colour bleed',
      'Worn: colour fringes and a tracking band',
      'Chewed: channels split wide, noise bands, dropouts',
      'Barely playable: the picture tears and smears',
    ]),
  },

  async apply(capture, a, context, signal) {
    const N = capture.size;
    const count = N * N;
    const half = N / 2;
    const { mood } = context;
    const rnd = seeded((context.seed ^ 0x7a9e51c3) >>> 0);
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const scratch = new Float32Array(N);
    const P = PALETTES[a.palette] ?? PALETTES.sunset;
    const pastel = a.fill === 'pastel';
    const damage = clamp01(a.vhs * 0.85 + mood.wear * 0.2 - 0.04);
    const notes: string[] = [`${P.label} palette`];

    // ------------------------------------------------------------------ palette under the mood
    const dusk = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    const moodColour = (c: RGB): RGB => {
      const grey = luma(c);
      const desat = blend(c, [grey, grey, grey], (1 - mood.cheer) * 0.28);
      return times(desat, 0.82 + 0.3 * mood.cheer);
    };
    let sky = (pastel ? P.pastelSky : P.sky).map(hex) as RGB[];
    if (!pastel) {
      const tint = mood.warmth > 0.5 ? hex('#3a0a10') : hex('#03123a');
      const amount = Math.abs(mood.warmth - 0.5) * 0.55;
      sky[0] = blend(sky[0], tint, amount);
      sky[1] = blend(sky[1], tint, amount * 0.45);
      // Toward noon the sky hazes up toward its horizon colour.
      for (let s = 0; s < 3; s++) sky[s] = blend(sky[s], sky[3], (1 - dusk) * 0.07 * (s + 1));
    }
    sky = sky.map(moodColour);
    const sunTop = blend(hex(P.sun[0]), WHITE, pastel ? 0.25 : 0);
    const sunBottom = blend(hex(P.sun[1]), WHITE, pastel ? 0.2 : 0);
    const floor = moodColour(hex(pastel ? P.pastelFloor : P.floor));
    const gridColour = hex(P.grid);
    const tubeColours = P.tubes.map(hex);
    const ramp = P.ramp.map(hex);
    const shade = hex(P.shade);
    const pastelShadow = hex(P.pastelShadow);
    const tubeOffset = Math.floor(rnd() * 4);
    const singleTube = P.tubes[0] === P.grid ? tubeColours[1] : tubeColours[0];

    // ------------------------------------------------------------------ decode the capture
    const ident = new Uint8Array(count);
    const Z = new Float32Array(count);
    const NX = new Float32Array(count), NY = new Float32Array(count), NZ = new Float32Array(count);
    const lit = new Float32Array(count);
    const area = new Int32Array(256);
    const span = capture.far - capture.near;
    const litHistogram = new Uint32Array(256);
    let solid = 0;
    for (let i = 0; i < count; i++) {
      const o = i * 4;
      const id = capture.identity[o];
      ident[i] = id;
      area[id]++;
      const v = (capture.depth[o] + capture.depth[o + 1] / 256 + capture.depth[o + 2] / 65536) / 256;
      Z[i] = id === 0 ? capture.far : capture.near + v * span;
      const nx = capture.normal[o] / 127.5 - 1, ny = capture.normal[o + 1] / 127.5 - 1, nz = capture.normal[o + 2] / 127.5 - 1;
      const nl = Math.hypot(nx, ny, nz) || 1;
      NX[i] = nx / nl;
      NY[i] = ny / nl;
      NZ[i] = nz / nl;
      if (id > 0) {
        litHistogram[capture.diffuse[o]]++;
        solid++;
      }
    }
    let litTop = 255;
    for (let v = 0, seen = 0; v < 256; v++) {
      seen += litHistogram[v];
      if (seen >= solid * 0.97) {
        litTop = v;
        break;
      }
    }
    const litScale = 1 / Math.max(10, litTop);
    for (let i = 0; i < count; i++) lit[i] = Math.min(1, capture.diffuse[i * 4] * litScale);
    await pause();

    // ------------------------------------------------------------------ recover the camera
    // Which way is up: the ground mostly faces it.
    const groundId = area[1] > 400 ? 1 : 2;
    const isGround = (i: number) => ident[i] === groundId;
    const average = (accept: (i: number) => boolean): [number, number, number] | null => {
      let x = 0, y = 0, z = 0, n = 0;
      for (let i = 0; i < count; i += 3)
        if (accept(i)) {
          x += NX[i];
          y += NY[i];
          z += NZ[i];
          n++;
        }
      const l = Math.hypot(x, y, z);
      return n > 60 && l > 1e-6 ? [x / l, y / l, z / l] : null;
    };
    let up: [number, number, number] = average(isGround) ?? [0, 0.82, 0.57];
    const facesUp = (i: number) => NX[i] * up[0] + NY[i] * up[1] + NZ[i] * up[2];
    up = average((i) => isGround(i) && facesUp(i) > 0.8) ?? up;

    // Orthographic or perspective: whichever makes the ground flat.
    let perspective = false;
    let ortho = capture.pixelWorldSize > 0 ? capture.pixelWorldSize : 0.01;
    let focal = 0;
    {
      let n = 0, sA = 0, sA2 = 0, sB = 0, sB2 = 0, sAB = 0, sP = 0, sP2 = 0, sPB = 0;
      for (let y = 0; y < N; y += 2)
        for (let x = 0; x < N; x += 2) {
          const i = y * N + x;
          if (!isGround(i) || facesUp(i) < 0.97) continue;
          const A = up[0] * (x + 0.5 - half) + up[1] * (half - y - 0.5);
          const B = up[2] * Z[i];
          const Ap = A * Z[i];
          n++;
          sA += A; sA2 += A * A; sB += B; sB2 += B * B; sAB += A * B; sP += Ap; sP2 += Ap * Ap; sPB += Ap * B;
        }
      if (n > 300 && Math.hypot(up[0], up[1]) > 0.2) {
        const vA = sA2 / n - (sA / n) ** 2, vP = sP2 / n - (sP / n) ** 2, vB = sB2 / n - (sB / n) ** 2;
        const cAB = sAB / n - (sA * sB) / n / n, cPB = sPB / n - (sP * sB) / n / n;
        if (vA > 1e-9 && vP > 1e-12) {
          const slope = cAB / vA, slopeP = cPB / vP;
          const residual = vB - (cAB * cAB) / vA, residualP = vB - (cPB * cPB) / vP;
          if (slopeP > 0 && residualP < residual * 0.6) {
            perspective = true;
            focal = slopeP;
          } else if (slope > 0 && slope / ortho > 0.25 && slope / ortho < 4) ortho = slope;
        }
      }
    }
    const metresPerPixel = (i: number) => (perspective ? focal * Z[i] : ortho);

    // The ground's own axes, from the faces standing upright (plinth sides, walls, boxes).
    const cross = (p: number[], q: number[]): [number, number, number] => [
      p[1] * q[2] - p[2] * q[1],
      p[2] * q[0] - p[0] * q[2],
      p[0] * q[1] - p[1] * q[0],
    ];
    let e1: [number, number, number] = [1 - up[0] * up[0], -up[0] * up[1], -up[0] * up[2]];
    {
      const l = Math.hypot(...e1) || 1;
      e1 = [e1[0] / l, e1[1] / l, e1[2] / l];
    }
    const e2 = cross(up, e1);
    let C4 = 0, S4 = 0;
    for (let i = 0; i < count; i += 2) {
      if (ident[i] === 0) continue;
      const d = Math.abs(facesUp(i));
      if (d > 0.3) continue;
      const hx = NX[i] * e1[0] + NY[i] * e1[1] + NZ[i] * e1[2];
      const hy = NX[i] * e2[0] + NY[i] * e2[1] + NZ[i] * e2[2];
      const theta = Math.atan2(hy, hx);
      const w = (1 - d / 0.3) * (ident[i] <= 2 ? 3 : 1);
      C4 += w * Math.cos(4 * theta);
      S4 += w * Math.sin(4 * theta);
    }
    const phi = Math.atan2(S4, C4) / 4;
    const a1: [number, number, number] = [
      Math.cos(phi) * e1[0] + Math.sin(phi) * e2[0],
      Math.cos(phi) * e1[1] + Math.sin(phi) * e2[1],
      Math.cos(phi) * e1[2] + Math.sin(phi) * e2[2],
    ];
    const a2 = cross(up, a1);

    // Grid coordinates on the ground and set: top faces by their plan, side faces by their elevation.
    let groundDepth = 0, groundCount = 0;
    for (let i = 0; i < count; i += 7)
      if (isGround(i)) {
        groundDepth += Z[i];
        groundCount++;
      }
    groundDepth = groundCount ? groundDepth / groundCount : capture.near + span * 0.5;
    const refMetres = perspective ? focal * groundDepth : ortho;
    const cellPx = mix(84, 22, a.grid);
    const cell = cellPx * refMetres;
    const offU = rnd() * cell, offV = rnd() * cell;
    const U = new Float32Array(count), V = new Float32Array(count);
    const face = new Uint8Array(count);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (ident[i] !== 1 && ident[i] !== 2) continue;
        const m = metresPerPixel(i);
        const X = (x + 0.5 - half) * m, Y = (half - y - 0.5) * m, W = -Z[i];
        const gx = X * a1[0] + Y * a1[1] + W * a1[2] + offU;
        const gy = X * a2[0] + Y * a2[1] + W * a2[2] + offV;
        const gh = X * up[0] + Y * up[1] + W * up[2];
        const du = Math.abs(facesUp(i));
        const d1 = Math.abs(NX[i] * a1[0] + NY[i] * a1[1] + NZ[i] * a1[2]);
        const d2 = Math.abs(NX[i] * a2[0] + NY[i] * a2[1] + NZ[i] * a2[2]);
        if (du >= d1 && du >= d2) {
          U[i] = gx; V[i] = gy; face[i] = 1;
        } else if (d1 >= d2) {
          U[i] = gy; V[i] = gh; face[i] = 2;
        } else {
          U[i] = gx; V[i] = gh; face[i] = 3;
        }
      }
    const lineHalf = mix(1.25, 0.8, a.grid);
    const gridLine = new Float32Array(count);
    const checker = new Uint8Array(count);
    const coverage = (dist: number, slope: number) => {
      // slope: change of the coordinate per pixel. Lines narrower than a pixel fade to their average.
      const s = Math.max(1e-9, slope);
      const px = dist / s;
      const sharp = 1 - smooth(lineHalf - 0.5, lineHalf + 0.6, px);
      const crowd = smooth(0.12, 0.4, s / cell);
      return mix(sharp, Math.min(1, (2 * lineHalf * s) / cell), crowd);
    };
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (!face[i]) continue;
        const same = (j: number) => face[j] === face[i] && ident[j] === ident[i];
        const jx = x + 1 < N && same(i + 1) ? i + 1 : x > 0 && same(i - 1) ? i - 1 : -1;
        const jy = y + 1 < N && same(i + N) ? i + N : y > 0 && same(i - N) ? i - N : -1;
        const sU = Math.hypot(jx >= 0 ? U[jx] - U[i] : 0, jy >= 0 ? U[jy] - U[i] : 0) || cell * 0.02;
        const sV = Math.hypot(jx >= 0 ? V[jx] - V[i] : 0, jy >= 0 ? V[jy] - V[i] : 0) || cell * 0.02;
        const fu = U[i] / cell, fv = V[i] / cell;
        const lu = coverage(Math.abs(fu - Math.round(fu)) * cell, Math.min(sU, cell));
        const lv = coverage(Math.abs(fv - Math.round(fv)) * cell, Math.min(sV, cell));
        gridLine[i] = Math.max(lu, lv);
        checker[i] = (Math.floor(fu) + Math.floor(fv)) & 1;
      }
    await pause();

    // ------------------------------------------------------------------ scenery: what the sky and the endless floor replace
    // The backdrop always. On an open orthographic floor (a studio sweep, a plain), the floor too: the part
    // lying beyond everything placed becomes sky, and the rest becomes a floor running to the sun.
    let farthest = 0, nearest = Infinity, placedPixels = 0;
    for (let i = 0; i < count; i += 2)
      if (ident[i] >= 2) {
        placedPixels++;
        if (Z[i] > farthest) farthest = Z[i];
        if (Z[i] < nearest) nearest = Z[i];
      }
    const beyondDepth = placedPixels > 40 ? farthest + (farthest - nearest) * 0.05 : Infinity;
    let edgeRows = 0;
    for (let y = 0; y < N; y++) if (ident[y * N] === 1 && ident[y * N + N - 1] === 1) edgeRows++;
    let topRow = 0;
    for (let x = 0; x < N; x++) if (ident[x] === 1) topRow++;
    const openFloor = !perspective && edgeRows > N * 0.3 && topRow > N * 0.5;
    const painted = new Uint8Array(count);
    for (let i = 0; i < count; i++) painted[i] = ident[i] === 0 || (openFloor && ident[i] === 1) ? 1 : 0;

    // The horizon: the far edge of the floor behind the scene, or where the backdrop stops.
    let hA = N * 0.62, hB = 0;
    {
      const xs: number[] = [], ys: number[] = [];
      if (openFloor) {
        for (let x = 0; x < N; x += 4) {
          let low = -1;
          for (let y = 0; y < N; y++) {
            const i = y * N + x;
            if (ident[i] === 1 && Z[i] > beyondDepth) low = y;
          }
          if (low > 0) {
            xs.push(x);
            ys.push(low);
          }
        }
      } else if (area[1] + area[2] > count * 0.02) {
        for (let x = 0; x < N; x += 4) {
          let run = 0;
          while (run < N && ident[run * N + x] === 0) run++;
          if (run > 0 && run < N) {
            xs.push(x);
            ys.push(run);
          }
        }
      }
      if (xs.length > 8) {
        const n = xs.length;
        const mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
        let sxy = 0, sxx = 0;
        for (let k = 0; k < n; k++) {
          sxy += (xs[k] - mx) * (ys[k] - my);
          sxx += (xs[k] - mx) ** 2;
        }
        hB = Math.max(-0.4, Math.min(0.4, sxx > 0 ? sxy / sxx : 0));
        hA = my - hB * mx;
        // Columns where a tall thing stands in front report the horizon too high; trust the open ones.
        const sorted = ys.map((v, k) => v - (hA + hB * xs[k])).sort((p, q) => p - q);
        hA += sorted[Math.floor(n * (openFloor ? 0.5 : 0.75))];
      } else if (openFloor || area[1] + area[2] > count * 0.02) hA = openFloor ? N * 0.4 : 0;
    }
    const horizonAt = (x: number) => Math.max(0, Math.min(N, hA + hB * x));
    const skyKind = a.sky;
    const hasSun = skyKind !== 'stars';
    const sunR = N * (skyKind === 'mountains' ? 0.15 : skyKind === 'risen' ? 0.15 : 0.2) * (0.92 + rnd() * 0.16);
    const sunLift = skyKind === 'risen' ? 1.3 : skyKind === 'mountains' ? 0.45 : 0.08;
    let sunX = half;
    {
      let best = -1;
      for (const fraction of [0.5, 0.42, 0.58, 0.33, 0.67, 0.24, 0.76]) {
        const cx = N * fraction, h = horizonAt(cx), cy = h - sunR * sunLift;
        let seen = 0;
        for (let yy = Math.max(0, Math.floor(cy - sunR)); yy < Math.min(h, cy + sunR); yy += 4)
          for (let xx = Math.max(0, Math.floor(cx - sunR)); xx < Math.min(N, cx + sunR); xx += 4)
            if ((xx - cx) ** 2 + (yy - cy) ** 2 < sunR * sunR && painted[yy * N + xx]) seen++;
        const value = seen * (1 - Math.abs(fraction - 0.5) * 0.8);
        if (value > best) {
          best = value;
          sunX = cx;
        }
      }
    }
    const H = horizonAt(sunX);
    const sunY = H - sunR * sunLift;
    const vanishX = sunX;
    // A reference level for the floor's own light, so shadows still land on the painted floor.
    let floorLight = 0.6;
    {
      const levels: number[] = [];
      for (let i = 0; i < count; i += 11) if (ident[i] === 1) levels.push(lit[i]);
      levels.sort((p, q) => p - q);
      if (levels.length > 20) floorLight = Math.max(0.05, levels[Math.floor(levels.length * 0.6)]);
    }

    // Palms and mountains are painted on a canvas, then laid into the backdrop only.
    const deco = document.createElement('canvas');
    deco.width = deco.height = N;
    const pen = deco.getContext('2d', { willReadFrequently: true })!;
    const wires = document.createElement('canvas');
    wires.width = wires.height = N;
    const wirePen = wires.getContext('2d', { willReadFrequently: true })!;
    const css = (c: RGB) => `rgb(${Math.round(clamp01(c[0]) * 255)},${Math.round(clamp01(c[1]) * 255)},${Math.round(clamp01(c[2]) * 255)})`;
    const silhouette = pastel ? blend(pastelShadow, [0.15, 0.1, 0.2], 0.35) : blend(floor, [0, 0, 0], 0.55);
    if (skyKind === 'palms') {
      const sides = [-1, 1];
      const extra = rnd() < 0.6 ? [rnd() < 0.5 ? -1 : 1] : [];
      for (const [index, side] of [...sides, ...extra].entries()) {
        const far = index >= 2;
        const height = N * (far ? 0.16 + rnd() * 0.05 : 0.24 + rnd() * 0.1);
        const bx = sunX + side * (sunR * (far ? 2.1 : 1.15) + rnd() * N * 0.07);
        const by = H + N * (far ? 0.005 : 0.02 + rnd() * 0.03);
        drawPalm(pen, bx, by, height, side * (0.12 + rnd() * 0.18), rnd, css(silhouette));
      }
    }
    if (skyKind === 'mountains') {
      const peaks: [number, number][] = [];
      for (let x = -40; x < N + 80; x += 30 + rnd() * 60) {
        const fromSun = Math.abs(x - sunX) / N;
        const h = N * (0.03 + rnd() * 0.09) * (0.55 + fromSun * 1.4);
        peaks.push([x, H - h]);
        peaks.push([x + 15 + rnd() * 30, H - h * (0.25 + rnd() * 0.35)]);
      }
      pen.fillStyle = css(pastel ? blend(silhouette, WHITE, 0.3) : blend(floor, sky[1], 0.25));
      pen.beginPath();
      pen.moveTo(-50, H + 1);
      for (const [x, y] of peaks) pen.lineTo(x, y);
      pen.lineTo(N + 60, H + 1);
      pen.closePath();
      pen.fill();
      wirePen.strokeStyle = css(pastel ? gridColour : blend(gridColour, WHITE, 0.1));
      wirePen.lineWidth = 1.2;
      wirePen.lineJoin = 'round';
      // Ridge, contour bands and the drop lines of a wireframe mesh.
      for (const level of [1, 0.66, 0.36]) {
        wirePen.globalAlpha = level === 1 ? 1 : 0.7;
        wirePen.beginPath();
        peaks.forEach(([x, y], k) => (k ? wirePen.lineTo(x, H - (H - y) * level) : wirePen.moveTo(x, H - (H - y) * level)));
        wirePen.stroke();
      }
      wirePen.globalAlpha = 0.7;
      wirePen.beginPath();
      for (let k = 0; k < peaks.length; k++) {
        const [x, y] = peaks[k];
        wirePen.moveTo(x, y);
        wirePen.lineTo(x + (x - sunX) * 0.08, H);
      }
      wirePen.stroke();
    }
    const decoPixels = pen.getImageData(0, 0, N, N).data;
    const wirePixels = wirePen.getImageData(0, 0, N, N).data;
    notes.push(
      { setting: 'striped sun setting', risen: 'striped sun risen', mountains: 'wireframe mountains', palms: 'palms against the sun', stars: 'starfield horizon' }[skyKind],
    );

    // ------------------------------------------------------------------ the base picture
    const R = new Float32Array(count), G = new Float32Array(count), B = new Float32Array(count);
    const haloR = new Float32Array(count), haloG = new Float32Array(count), haloB = new Float32Array(count);
    const set = (i: number, c: RGB) => {
      R[i] = c[0];
      G[i] = c[1];
      B[i] = c[2];
    };
    const skyAt = (y: number, h: number): RGB => {
      const t = clamp01(y / Math.max(1, h));
      if (t < 0.5) return blend(sky[0], sky[1], smooth(0, 0.5, t));
      if (t < 0.84) return blend(sky[1], sky[2], (t - 0.5) / 0.34);
      return blend(sky[2], sky[3], (t - 0.84) / 0.16);
    };
    const gridSoft = pastel ? blend(gridColour, pastelShadow, 0.3) : gridColour;
    const Lv = [capture.light[0], -capture.light[1], capture.light[2]];
    {
      const l = Math.hypot(Lv[0], Lv[1], Lv[2]) || 1;
      Lv[0] /= l; Lv[1] /= l; Lv[2] /= l;
    }
    const Lxy = Math.hypot(Lv[0], Lv[1]) || 1;
    const lx = Lv[0] / Lxy, ly = Lv[1] / Lxy;
    const idTube = (id: number): RGB => (id <= 2 ? blend(gridColour, WHITE, 0.12) : tubeColours[(id - 3 + tubeOffset) % (pastel ? 3 : 4)]);
    const horizonGlow = blend(sky[3], sunBottom, hasSun ? 0.35 : 0);
    const gridHalo = mix(0.012, 0.045, a.glow) * (pastel ? 0.4 : 1);
    const floorK = Math.max(40, N - H) ** 2 / (1.6 * cellPx);
    const floorKu = Math.max(40, N - H) / (1.6 * cellPx);
    const floorPhase = rnd();
    const starCount = !pastel ? Math.round((skyKind === 'stars' ? 900 : 180) * (0.35 + mood.density) * (0.35 + 0.65 * dusk)) : 0;
    // Each thing's height on screen, so chrome can sweep its horizon line across every face.
    const objTop = new Int32Array(256).fill(N), objBottom = new Int32Array(256).fill(-1);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const id = ident[y * N + x];
        if (id < 3) continue;
        if (y < objTop[id]) objTop[id] = y;
        if (y > objBottom[id]) objBottom[id] = y;
      }

    for (let y = 0; y < N; y++) {
      if ((y & 63) === 0) signal.throwIfAborted();
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const id = ident[i];
        if (painted[i]) {
          let c: RGB;
          const h = horizonAt(x + 0.5);
          if (y < h) {
            c = skyAt(y + 0.5, h);
            if (hasSun) {
              const d = Math.hypot(x - sunX, y - sunY);
              const glow = Math.exp(-Math.max(0, d - sunR) / (sunR * 0.45)) * (pastel ? 0.35 : 0.55);
              const sunGlow = blend(sunBottom, sunTop, 0.3);
              c = [1 - (1 - c[0]) * (1 - sunGlow[0] * glow), 1 - (1 - c[1]) * (1 - sunGlow[1] * glow), 1 - (1 - c[2]) * (1 - sunGlow[2] * glow)];
              if (d < sunR + 1) {
                const top = sunY - sunR;
                const bottom = Math.min(sunY + sunR, h);
                const t = clamp01((y - top) / Math.max(1, bottom - top));
                let inside = clamp01(sunR + 0.5 - d);
                // Slices in the lower part, widening toward the base.
                const sliceStart = sunY - sunR * 0.2;
                if (y > sliceStart) {
                  const v = clamp01((y - sliceStart) / Math.max(1, bottom - sliceStart));
                  const period = sunR * 0.17;
                  const q = ((y - sliceStart) / period) % 1;
                  const gap = 0.12 + 0.5 * v;
                  inside *= smooth(gap - 0.03, gap + 0.03, q);
                }
                c = blend(c, blend(sunTop, sunBottom, smooth(0, 1, t)), inside);
              }
            }
            // A band of light along the horizon.
            const near = Math.exp(-(h - y) / (N * 0.035));
            c = blend(c, horizonGlow, near * 0.45);
          } else {
            // The endless floor, vanishing at the sun.
            const dy = y - h + 0.5;
            const depth = floorK / dy + floorPhase;
            const slopeY = floorK / (dy * dy);
            const across = ((x - vanishX) / dy) * floorKu;
            const slopeX = Math.hypot(floorKu / dy, (Math.abs(x - vanishX) * floorKu) / (dy * dy));
            const lineH = 1 - smooth(lineHalf - 0.4, lineHalf + 0.7, Math.abs(depth - Math.round(depth)) / slopeY);
            const lineV = 1 - smooth(lineHalf - 0.4, lineHalf + 0.7, Math.abs(across - Math.round(across)) / slopeX);
            const fadeH = 1 - smooth(0.15, 0.45, slopeY);
            const fadeV = 1 - smooth(0.15, 0.45, slopeX);
            const line = Math.max(lineH * fadeH + Math.min(1, slopeY) * 0.25 * (1 - fadeH), lineV * fadeV);
            const haze = Math.exp(-dy / (N * 0.06));
            let base = floor;
            if (pastel && ((Math.floor(depth) + Math.floor(across)) & 1)) base = blend(floor, pastelShadow, 0.2);
            c = blend(base, horizonGlow, haze * (pastel ? 0.5 : 0.55));
            if (hasSun) {
              const streak = Math.exp(-(((x - sunX) / (sunR * 0.7)) ** 2)) * Math.exp(-dy / (N * 0.22)) * 0.3;
              c = blend(c, sunBottom, streak);
            }
            // Shadows cast on the real floor still fall on the painted one.
            const shadowed = id === 1 ? clamp01(lit[i] / floorLight) : 1;
            c = times(c, 0.35 + 0.65 * shadowed);
            const strength = line * (0.45 + 0.55 * (1 - haze)) * (0.4 + 0.6 * shadowed);
            c = blend(c, gridSoft, strength * 0.9);
            haloR[i] += gridColour[0] * strength * gridHalo;
            haloG[i] += gridColour[1] * strength * gridHalo;
            haloB[i] += gridColour[2] * strength * gridHalo;
          }
          const da = decoPixels[i * 4 + 3] / 255;
          if (da > 0) c = blend(c, [decoPixels[i * 4] / 255, decoPixels[i * 4 + 1] / 255, decoPixels[i * 4 + 2] / 255], da);
          set(i, c);
          continue;
        }

        const o = i * 4;
        const original: RGB = [capture.color[o] / 255, capture.color[o + 1] / 255, capture.color[o + 2] / 255];
        const nx = NX[i], ny = NY[i], nz = NZ[i];
        const l = lit[i];
        if (id <= 2) {
          // Ground and set: a dark floor (or pastel tiles) ruled with the glowing grid.
          let c: RGB;
          const upness = Math.max(0, facesUp(i));
          if (pastel) {
            c = checker[i] ? blend(floor, pastelShadow, 0.22) : blend(floor, WHITE, 0.25);
            c = times(c, 0.72 + 0.32 * l);
            c = blend(c, pastelShadow, (1 - upness) * 0.3);
          } else {
            c = times(floor, 0.6 + 1.2 * l);
            c = blend(c, horizonGlow, 0.05 + 0.05 * upness);
          }
          const g = gridLine[i] * (0.55 + 0.45 * Math.max(upness, 0.4));
          c = blend(c, pastel ? gridSoft : blend(gridColour, WHITE, 0.08), g * 0.92);
          haloR[i] += gridColour[0] * g * gridHalo;
          haloG[i] += gridColour[1] * g * gridHalo;
          haloB[i] += gridColour[2] * g * gridHalo;
          set(i, c);
          continue;
        }

        // Things.
        const key = idTube(id);
        const other = tubeColours[(id - 2 + tubeOffset) % 4];
        const facing = nx * lx + ny * ly;
        let c: RGB;
        if (a.fill === 'outline') {
          c = blend(times(shade, 0.45 + 0.35 * l), key, 0.04 + 0.04 * l);
        } else if (a.fill === 'neonlit') {
          const rim = smooth(0.05, 0.85, -facing) * Math.pow(1 - Math.max(0, nz), 0.7);
          const skyward = Math.max(0, facesUp(i));
          const k = l * l;
          c = times(shade, 0.8);
          c = [
            c[0] + original[0] * 0.08 * (0.3 + l) + key[0] * k * 0.5 + other[0] * rim * 0.6 + sky[3][0] * skyward * 0.1,
            c[1] + original[1] * 0.08 * (0.3 + l) + key[1] * k * 0.5 + other[1] * rim * 0.6 + sky[3][1] * skyward * 0.1,
            c[2] + original[2] * 0.08 * (0.3 + l) + key[2] * k * 0.5 + other[2] * rim * 0.6 + sky[3][2] * skyward * 0.1,
          ];
        } else if (a.fill === 'chrome') {
          // A mirror that holds the sunset: sky above a hard horizon line, dark floor below it,
          // swept across each thing by its height on screen and bent by each face's reflection.
          let vx = 0, vy = 0, vz = -1;
          if (perspective) {
            vx = (x + 0.5 - half) * focal;
            vy = (half - y - 0.5) * focal;
            const vl = Math.hypot(vx, vy, 1);
            vx /= vl; vy /= vl; vz = -1 / vl;
          }
          const dn = vx * nx + vy * ny + vz * nz;
          const rx = vx - 2 * dn * nx, ry = vy - 2 * dn * ny, rz = vz - 2 * dn * nz;
          const v = (y - objTop[id]) / Math.max(8, objBottom[id] - objTop[id]);
          const e = (0.52 - v) * 1.5 + (rx * up[0] + ry * up[1] + rz * up[2]) * 0.7 - up[2] * 0.25;
          let env: RGB;
          if (e >= 0) {
            const t = Math.pow(clamp01(e / 0.9), 0.75);
            env = t < 0.25
              ? blend(blend(sky[3], WHITE, 0.5), sky[2], t / 0.25)
              : t < 0.6 ? blend(sky[2], sky[1], (t - 0.25) / 0.35) : blend(sky[1], times(sky[0], 1.3), (t - 0.6) / 0.4);
          } else {
            const t = Math.pow(clamp01(-e / 0.9), 0.7);
            env = t < 0.5
              ? blend(times(floor, 0.4), blend(sunBottom, floor, 0.55), t / 0.5)
              : blend(blend(sunBottom, floor, 0.55), blend(sunTop, sunBottom, 0.5), (t - 0.5) / 0.5);
          }
          const line = 1 - smooth(0.0, 0.03, Math.abs(e));
          env = blend(env, WHITE, line * 0.9);
          const spec = smooth(0.95, 0.995, rx * Lv[0] + ry * Lv[1] + rz * Lv[2]);
          c = blend(times(env, 0.7 + 0.4 * l), original, 0.06);
          c = blend(c, WHITE, spec);
        } else {
          const base = blend(blend(tubeColours[(id - 3 + tubeOffset) % 3], WHITE, 0.24), original, 0.16);
          const light = blend(base, WHITE, 0.3);
          const shadow = times(blend(base, pastelShadow, 0.6), 0.72);
          const t1 = smooth(0.22, 0.3, l), t2 = smooth(0.6, 0.68, l);
          c = blend(blend(shadow, times(base, 0.95), t1), light, t2);
        }
        set(i, c);
      }
    }
    // Stars in the open sky.
    for (let s = 0; s < starCount; s++) {
      const x = Math.floor(rnd() * N), y = Math.floor(rnd() * horizonAt(x) * (skyKind === 'stars' ? 0.95 : 0.7));
      const bright = rnd() ** 2 * (1 - y / Math.max(1, horizonAt(x))) * 0.9;
      const big = rnd() < 0.06;
      for (let dy = big ? -2 : 0; dy <= (big ? 2 : 0); dy++)
        for (let dx = big ? -2 : 0; dx <= (big ? 2 : 0); dx++) {
          if (big && dx !== 0 && dy !== 0) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= N || yy >= horizonAt(xx)) continue;
          const i = yy * N + xx;
          if (!painted[i] || decoPixels[i * 4 + 3] > 0) continue;
          const k = bright * (big ? 1 - (Math.abs(dx) + Math.abs(dy)) * 0.3 : 1);
          R[i] += (1 - R[i]) * k;
          G[i] += (1 - G[i]) * k;
          B[i] += (1 - B[i]) * k;
        }
    }
    notes.push(
      { outline: 'objects only outlined in light', neonlit: 'surfaces lit by coloured neon', chrome: 'mirror chrome', pastel: 'pastel fills, chequered floor' }[a.fill],
    );
    await pause();

    // ------------------------------------------------------------------ where the tubes run
    // Silhouettes: identity changes and depth steps. Creases: only sharp folds, so soft joints stay dark.
    const edge = new Float32Array(count);
    const mark = (i: number, w: number) => {
      if (w > edge[i]) edge[i] = w;
    };
    for (let y = 0; y < N; y++) {
      if ((y & 63) === 0) signal.throwIfAborted();
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const id = ident[i];
        for (const j of [x + 1 < N ? i + 1 : -1, y + 1 < N ? i + N : -1]) {
          if (j < 0) continue;
          const other = ident[j];
          if (painted[i] && painted[j]) continue;
          if (other !== id) {
            if (painted[i] && area[other] < 12) continue;
            if (painted[j] && area[id] < 12) continue;
            const front = painted[i] ? j : painted[j] ? i : Z[i] <= Z[j] ? i : j;
            mark(front, 1);
          } else if (id > 0) {
            const dot = NX[i] * NX[j] + NY[i] * NY[j] + NZ[i] * NZ[j];
            if (dot < 0.77) mark(i, 0.85 * smooth(0.77, 0.45, dot));
          }
        }
        if (id > 0 && !painted[i] && x > 0 && y > 0 && x < N - 1 && y < N - 1) {
          const tau = 4 * metresPerPixel(i);
          const zc = Z[i];
          let jump = 0;
          if (ident[i - 1] === id && ident[i + 1] === id) {
            jump = perspective
              ? -(1 / Z[i - 1] + 1 / Z[i + 1] - 2 / zc) * zc * zc
              : Z[i - 1] + Z[i + 1] - 2 * zc;
          }
          if (ident[i - N] === id && ident[i + N] === id) {
            const vertical = perspective
              ? -(1 / Z[i - N] + 1 / Z[i + N] - 2 / zc) * zc * zc
              : Z[i - N] + Z[i + N] - 2 * zc;
            jump = Math.max(jump, vertical);
          }
          if (jump > tau) mark(i, smooth(tau, tau * 2, jump));
        }
      }
    }
    // Colour every tube, break some (wear), dim some (doubt and flicker).
    const tubeW = new Float32Array(count);
    const tubeR = new Float32Array(count), tubeG = new Float32Array(count), tubeB = new Float32Array(count);
    const hot = new Float32Array(count);
    const segment = 14 + Math.round(rnd() * 10);
    const salt = Math.floor(rnd() * 1e9);
    const deadChance = mood.wear * mood.wear * 0.18;
    const flickerChance = 0.05 + mood.energy * 0.2;
    const confidence = capture.confidence;
    const tubeColourAt = (i: number, y: number): RGB => {
      const id = ident[i];
      if (a.tubes === 'each') return idTube(id);
      if (a.tubes === 'single') return id <= 2 ? blend(gridColour, WHITE, 0.12) : singleTube;
      if (a.tubes === 'split') {
        const t = smooth(-0.3, 0.3, NX[i] * lx + NY[i] * ly);
        return blend(tubeColours[1], tubeColours[0], t);
      }
      const t = y / N;
      return t < 0.5 ? blend(ramp[0], ramp[1], t / 0.5) : blend(ramp[1], ramp[2], (t - 0.5) / 0.5);
    };
    const horizonTube = pastel ? gridColour : blend(sky[3], WHITE, 0.35);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        let w = edge[i];
        let colour: RGB | null = null;
        if (w > 0) colour = tubeColourAt(i, y);
        else if (painted[i]) {
          const wire = wirePixels[i * 4 + 3] / 255;
          const h = horizonAt(x + 0.5);
          const horizon = 1 - smooth(0.4, 1.4, Math.abs(y + 0.5 - h));
          if (wire > 0.05) {
            w = wire;
            colour = [wirePixels[i * 4] / 255, wirePixels[i * 4 + 1] / 255, wirePixels[i * 4 + 2] / 255];
          } else if (horizon > 0.02 && h > 2 && decoPixels[i * 4 + 3] < 128) {
            w = horizon;
            colour = horizonTube;
          }
        }
        if (!colour || w <= 0) continue;
        const cx = Math.floor(x / segment), cy = Math.floor(y / segment);
        const roll = hash2(cx, cy, salt);
        const id = ident[i];
        const doubt = id >= 3 && confidence ? clamp01(confidence[id] ?? 1) : 1;
        let brightness = 0.55 + 0.45 * doubt;
        if (roll < deadChance && id >= 3) brightness = 0;
        else if (roll < deadChance + flickerChance * (1.4 - doubt)) brightness *= 0.45 + hash2(cx, cy, salt ^ 99) * 0.3;
        tubeW[i] = w;
        tubeR[i] = colour[0] * w;
        tubeG[i] = colour[1] * w;
        tubeB[i] = colour[2] * w;
        hot[i] = w * brightness;
      }
    await pause();

    // ------------------------------------------------------------------ halos
    const halo1 = Math.round(mix(3, 9, a.glow));
    const halo2 = Math.round(mix(11, 30, a.glow));
    const amp1 = mix(0.18, 0.8, a.glow) * (pastel ? 0.35 : 1) / linePeak(halo1, 3);
    const amp2 = mix(0.04, 0.38, a.glow) * (pastel ? 0.2 : 1) / linePeak(halo2, 3);
    const haloSources = [
      [tubeR, haloR],
      [tubeG, haloG],
      [tubeB, haloB],
    ] as const;
    const glowLayers: Float32Array[] = [];
    for (const [tube, extra] of haloSources) {
      const near = new Float32Array(count);
      for (let i = 0; i < count; i++) near[i] = (tube[i] * (tubeW[i] > 0 ? hot[i] / tubeW[i] : 0)) + extra[i];
      const far = near.slice();
      boxBlur(near, N, halo1, 3, scratch);
      boxBlur(far, N, halo2, 3, scratch);
      for (let i = 0; i < count; i++) near[i] = near[i] * amp1 + far[i] * amp2;
      glowLayers.push(near);
      await pause();
    }
    const channels = [R, G, B];
    for (let c = 0; c < 3; c++) {
      const target = channels[c], glow = glowLayers[c];
      for (let i = 0; i < count; i++) target[i] = 1 - (1 - target[i]) * Math.exp(-1.15 * glow[i]);
    }

    // ------------------------------------------------------------------ the tubes themselves
    const bodyRadius = Math.round(mix(0.2, 2.8, a.weight));
    const bodyPeak = linePeak(bodyRadius, 2);
    const cover = tubeW.slice();
    const heat = hot.slice();
    const tr = tubeR.slice(), tg = tubeG.slice(), tb = tubeB.slice();
    for (const layer of [cover, heat, tr, tg, tb]) boxBlur(layer, N, bodyRadius, 2, scratch);
    await pause();
    for (let i = 0; i < count; i++) {
      const w = cover[i];
      if (w < 0.02) continue;
      const k = Math.min(1, w / bodyPeak);
      const glass: RGB = [tr[i] / w, tg[i] / w, tb[i] / w];
      const burn = Math.min(1, heat[i] / w);
      const body = bodyRadius ? smooth(0.16, 0.55, k) : k;
      const core = (bodyRadius ? smooth(0.62, 0.98, k) : k * 0.75) * burn;
      const lift = pastel ? 0.72 + 0.15 * burn : 0.6 + 0.6 * burn;
      const bodyColour: RGB = burn > 0.05
        ? [Math.min(1, glass[0] * lift), Math.min(1, glass[1] * lift), Math.min(1, glass[2] * lift)]
        : blend(times(glass, 0.3), [R[i], G[i], B[i]], 0.4);
      const coreColour = blend(glass, WHITE, pastel ? 0.35 : 0.8);
      R[i] = mix(mix(R[i], bodyColour[0], body), coreColour[0], core);
      G[i] = mix(mix(G[i], bodyColour[1], body), coreColour[1], core);
      B[i] = mix(mix(B[i], bodyColour[2], body), coreColour[2], core);
    }
    notes.push(
      `${{ each: 'a tube colour per object', split: 'two-tone tubes split by the light', single: 'one colour of tubing', gradient: 'gradient tubing' }[a.tubes]}, ${['hairline', 'fine', 'sign-shop', 'fat'][Math.min(3, Math.round(a.weight * 3))]}`,
    );
    await pause();

    // ------------------------------------------------------------------ the tape
    const tape = a.tape;
    const jitter = damage * (0.5 + mood.energy);
    // Chroma bleeds and lags behind the luma.
    if (damage > 0.04) {
      const Y = new Float32Array(count), I = new Float32Array(count), Q = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        Y[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
        I[i] = 0.596 * R[i] - 0.274 * G[i] - 0.322 * B[i];
        Q[i] = 0.211 * R[i] - 0.523 * G[i] + 0.312 * B[i];
      }
      const chromaRadius = Math.round(1 + damage * 5);
      rowBlur(I, N, chromaRadius, 2, scratch);
      rowBlur(Q, N, chromaRadius, 2, scratch);
      if (damage > 0.35) {
        const soft = Y.slice();
        rowBlur(soft, N, 1, 1, scratch);
        for (let i = 0; i < count; i++) Y[i] = mix(Y[i], soft[i], 0.6);
      }
      const lag = Math.round(1 + damage * 3);
      for (let y = 0; y < N; y++)
        for (let x = N - 1; x >= 0; x--) {
          const i = y * N + x;
          const j = y * N + Math.max(0, x - lag);
          const ci = I[j] * (1 - damage * 0.15), cq = Q[j] * (1 - damage * 0.15);
          R[i] = Y[i] + 0.956 * ci + 0.621 * cq;
          G[i] = Y[i] - 0.272 * ci - 0.647 * cq;
          B[i] = Y[i] - 1.106 * ci + 1.703 * cq;
        }
      await pause();
    }

    // Row displacement: a slow wobble, tracking bands, tears and the head-switch seam.
    const shift = new Float32Array(N);
    const bandNoise = new Float32Array(N);
    const p1 = rnd() * 6.28, p2 = rnd() * 6.28;
    for (let y = 0; y < N; y++) shift[y] = jitter * 2.2 * Math.sin(y * 0.021 + p1) * Math.sin(y * 0.0047 + p2) + (rnd() - 0.5) * jitter * 0.9;
    const bands: [number, number, number][] = [];
    if (tape === 'paused') bands.push([N * (0.18 + rnd() * 0.08), N * 0.035, 0.5 + damage], [N * (0.72 + rnd() * 0.08), N * 0.035, 0.5 + damage]);
    else if (tape === 'rewinding') for (let k = 0; k < 9 + damage * 8; k++) bands.push([rnd() * N, N * (0.004 + rnd() * 0.012), 0.8 + damage]);
    else if (tape === 'playing') {
      if (damage > 0.15) bands.push([N * (0.25 + rnd() * 0.6), N * (0.05 + damage * 0.05), damage * 1.2]);
      if (damage > 0.6) bands.push([rnd() * N, N * 0.03, damage]);
    } else if (damage > 0.45) bands.push([N * (0.2 + rnd() * 0.6), N * 0.05, damage]);
    for (const [centre, size, strength] of bands) {
      const throwPx = (tape === 'rewinding' ? 40 : 22) * strength * (rnd() < 0.5 ? -1 : 1);
      for (let y = Math.max(0, Math.floor(centre - size)); y < Math.min(N, centre + size); y++) {
        const t = 1 - Math.abs(y - centre) / size;
        shift[y] += throwPx * t * t * (0.6 + rnd() * 0.4);
        bandNoise[y] = Math.max(bandNoise[y], t * Math.min(1, strength));
      }
    }
    if (tape === 'rewinding') for (let y = 0; y < N; y++) shift[y] += (y / N - 0.5) * 26 * (0.4 + damage);
    const seam = damage > 0.2 || tape === 'paused' ? Math.round(5 + damage * 12) : 0;
    for (let y = N - seam; y < N; y++) {
      shift[y] += 10 + rnd() * 14;
      bandNoise[y] = Math.max(bandNoise[y], 0.6);
    }
    const split = damage > 0.03 ? 1 + damage * 6.5 : 0;
    const shiver = tape === 'paused' ? 1 : 0;
    const outR = new Float32Array(count), outG = new Float32Array(count), outB = new Float32Array(count);
    const sample = (layer: Float32Array, y: number, x: number) => {
      const xi = Math.round(x);
      if (xi < 0 || xi >= N) return 0.02;
      return layer[y * N + xi];
    };
    for (let y = 0; y < N; y++) {
      const sy = shiver && y % 2 ? Math.min(N - 1, y + 1) : y;
      const s = shift[y];
      const extra = bandNoise[y] * 4;
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const sx = x - s;
        outR[i] = sample(R, sy, sx + split + extra);
        outG[i] = sample(G, sy, sx);
        outB[i] = sample(B, sy, sx - split - extra);
      }
    }
    await pause();

    // Noise, dropouts, scanlines, a raised black level and the tube's falloff.
    const grain = 0.012 + damage * 0.07;
    let state = (context.seed ^ 0x2545f491) >>> 0;
    const noise = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
    for (let y = 0; y < N; y++) {
      const band = bandNoise[y];
      if (band > 0) {
        // Streaks of snow across a tracking band.
        let x = Math.floor(noise() * 40);
        while (x < N) {
          const length = 4 + Math.floor(noise() * 60 * band);
          const level = noise() ** 2 * band * 0.9;
          for (let k = 0; k < length && x + k < N; k++) {
            const i = y * N + x + k;
            outR[i] = mix(outR[i], 0.92, level);
            outG[i] = mix(outG[i], 0.92, level);
            outB[i] = mix(outB[i], 0.95, level);
          }
          x += length + Math.floor(noise() * 50 * (1.2 - band));
        }
      }
    }
    const dropouts = Math.round(damage * damage * 70 * (0.4 + mood.wear));
    for (let d = 0; d < dropouts; d++) {
      const y = Math.floor(rnd() * N), x0 = Math.floor(rnd() * N), length = 6 + Math.floor(rnd() * 50);
      for (let k = 0; k < length && x0 + k < N; k++) {
        const t = Math.sin((k / length) * Math.PI);
        const i = y * N + x0 + k;
        outR[i] = mix(outR[i], 1, t * 0.85);
        outG[i] = mix(outG[i], 1, t * 0.85);
        outB[i] = mix(outB[i], 1, t * 0.85);
      }
    }
    const scan = 0.04 + damage * 0.16;
    const lift = damage * (pastel ? 0.02 : 0.05);
    const liftColour = sky[1];
    const pixels = new Uint8ClampedArray(count * 4);
    for (let y = 0; y < N; y++) {
      const dark = y % 3 === 2 ? 1 - scan : 1;
      const vy = (y - half) / half;
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const vx = (x - half) / half;
        const vignette = 1 - 0.32 * Math.pow(Math.min(1, (vx * vx + vy * vy) / 2), 1.3);
        const n = (noise() - 0.5) * grain * 2;
        const k = dark * vignette;
        pixels[i * 4] = (lift * liftColour[0] + outR[i] * (1 - lift) + n) * k * 255;
        pixels[i * 4 + 1] = (lift * liftColour[1] + outG[i] * (1 - lift) + n) * k * 255;
        pixels[i * 4 + 2] = (lift * liftColour[2] + outB[i] * (1 - lift) + n) * k * 255;
        pixels[i * 4 + 3] = 255;
      }
    }

    // ------------------------------------------------------------------ the VCR's own text, crisp over the tape
    const text = (words: string, x0: number, y0: number, size: number, colour: RGB) => {
      for (const pass of [0, 1]) {
        let x = x0;
        for (const ch of words) {
          const glyph = FONT[ch];
          if (glyph)
            for (let col = 0; col < 5; col++)
              for (let row = 0; row < 7; row++) {
                if (!((glyph[col] >> row) & 1)) continue;
                const ox = x + col * size + (pass ? 0 : 2), oy = y0 + row * size + (pass ? 0 : 2);
                for (let dy = 0; dy < size; dy++)
                  for (let dx = 0; dx < size; dx++) {
                    const px = ox + dx, py = oy + dy;
                    if (px < 0 || py < 0 || px >= N || py >= N) continue;
                    const o = (py * N + px) * 4;
                    const c = pass ? colour : ([0.03, 0.02, 0.05] as RGB);
                    pixels[o] = c[0] * 255;
                    pixels[o + 1] = c[1] * 255;
                    pixels[o + 2] = c[2] * 255;
                  }
              }
          x += 6 * size;
        }
      }
    };
    const osd: RGB = [0.94, 0.95, 0.97];
    const unit = Math.max(2, Math.round(N / 200));
    const margin = Math.round(N * 0.06);
    const counter = `${Math.floor(rnd() * 2)}:${two(rnd() * 60)}:${two(rnd() * 60)}`;
    const year = 1984 + Math.floor(rnd() * 13);
    if (tape === 'playing') {
      text('PLAY >', margin, margin, unit + 1, osd);
      text(`SP ${counter}`, margin, N - margin - 7 * unit, unit, osd);
    } else if (tape === 'paused') {
      text('PAUSE |', margin, margin, unit + 1, osd);
      text(`SP ${counter}`, margin, N - margin - 7 * unit, unit, osd);
    } else if (tape === 'rewinding') {
      text('<< REW', margin, margin, unit + 1, osd);
      text(`${counter}`, margin, N - margin - 7 * unit, unit, osd);
    } else if (tape === 'recording') {
      text('*', margin, margin, unit + 1, [0.95, 0.12, 0.12]);
      text('REC', margin + 8 * (unit + 1), margin, unit + 1, osd);
      const date = `${MONTHS[Math.floor(rnd() * 12)]} ${two(1 + rnd() * 28)} ${year}`;
      const clock = `${rnd() < 0.5 ? 'AM' : 'PM'} ${1 + Math.floor(rnd() * 12)}:${two(rnd() * 60)}`;
      text(date, N - margin - date.length * 6 * unit, N - margin - 18 * unit, unit, [1, 0.72, 0.3]);
      text(clock, N - margin - clock.length * 6 * unit, N - margin - 8 * unit, unit, [1, 0.72, 0.3]);
    }
    notes.push(
      `${{ playing: 'tape playing', paused: 'paused frame', rewinding: 'rewinding', recording: 'recording off air', broadcast: 'clean dub' }[tape]}, tape damage ${Math.round(damage * 100)}%`,
    );
    if (perspective) notes.push('ground grid laid in perspective');
    return { pixels, notes };
  },
});

/** A palm silhouette: a tapering curved trunk and drooping fronds of leaflets. */
function drawPalm(
  pen: CanvasRenderingContext2D,
  bx: number,
  by: number,
  height: number,
  lean: number,
  rnd: () => number,
  colour: string,
) {
  pen.fillStyle = colour;
  pen.strokeStyle = colour;
  const tx = bx + lean * height, ty = by - height;
  const cx = bx + lean * height * 0.15, cy = by - height * 0.55;
  const left: [number, number][] = [], right: [number, number][] = [];
  for (let s = 0; s <= 20; s++) {
    const t = s / 20;
    const x = (1 - t) ** 2 * bx + 2 * (1 - t) * t * cx + t * t * tx;
    const y = (1 - t) ** 2 * by + 2 * (1 - t) * t * cy + t * t * ty;
    const dx = 2 * (1 - t) * (cx - bx) + 2 * t * (tx - cx), dy = 2 * (1 - t) * (cy - by) + 2 * t * (ty - cy);
    const l = Math.hypot(dx, dy) || 1;
    const w = height * mix(0.03, 0.016, t) * (s % 3 === 0 ? 1.12 : 1);
    left.push([x - (dy / l) * w, y + (dx / l) * w]);
    right.push([x + (dy / l) * w, y - (dx / l) * w]);
  }
  pen.beginPath();
  left.forEach(([x, y], k) => (k ? pen.lineTo(x, y) : pen.moveTo(x, y)));
  for (const [x, y] of right.reverse()) pen.lineTo(x, y);
  pen.closePath();
  pen.fill();
  const fronds = 7 + Math.floor(rnd() * 3);
  pen.lineCap = 'round';
  for (let f = 0; f < fronds; f++) {
    const angle = mix(-Math.PI * 1.02, Math.PI * 0.02, (f + 0.5) / fronds) + (rnd() - 0.5) * 0.25;
    const length = height * (0.42 + rnd() * 0.2);
    const dirX = Math.cos(angle), dirY = Math.sin(angle);
    const droop = length * (0.3 + 0.45 * Math.abs(dirX));
    const point = (t: number): [number, number] => [tx + dirX * length * t, ty + dirY * length * t + droop * t * t];
    pen.lineWidth = Math.max(1.5, height * 0.014);
    pen.beginPath();
    for (let s = 0; s <= 12; s++) {
      const [x, y] = point(s / 12);
      if (s) pen.lineTo(x, y);
      else pen.moveTo(x, y);
    }
    pen.stroke();
    pen.lineWidth = Math.max(1, height * 0.008);
    for (let s = 1; s <= 14; s++) {
      const t = s / 15;
      const [x, y] = point(t);
      const [x2, y2] = point(Math.min(1, t + 0.02));
      const tl = Math.hypot(x2 - x, y2 - y) || 1;
      const ux = (x2 - x) / tl, uy = (y2 - y) / tl;
      const leaf = length * 0.2 * (1 - t * 0.55);
      for (const side of [-1, 1]) {
        const spread = 0.75;
        const lx = ux * Math.cos(spread) - side * uy * Math.sin(spread);
        const ly = uy * Math.cos(spread) + side * ux * Math.sin(spread);
        pen.beginPath();
        pen.moveTo(x, y);
        pen.quadraticCurveTo(x + lx * leaf * 0.6, y + ly * leaf * 0.6, x + lx * leaf, y + ly * leaf + leaf * 0.45);
        pen.stroke();
      }
    }
  }
  for (let k = 0; k < 3; k++) {
    pen.beginPath();
    pen.arc(tx + (rnd() - 0.5) * height * 0.06, ty + height * 0.03 + rnd() * height * 0.02, height * 0.022, 0, Math.PI * 2);
    pen.fill();
  }
}
