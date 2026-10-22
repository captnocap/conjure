import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

type RGB = [number, number, number];
const hex = (value: string): RGB => [
  parseInt(value.slice(1, 3), 16) / 255,
  parseInt(value.slice(3, 5), 16) / 255,
  parseInt(value.slice(5, 7), 16) / 255,
];
const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

// ------------------------------------------------------------------------------------ palettes

interface Palette {
  deep: RGB;
  mids: RGB[];
  cream: RGB;
  /** The wall around an oval, the paper of a sheet. */
  wall: RGB;
  /** Dream sky: top, middle, horizon. */
  sky: [RGB, RGB, RGB];
  /** Dream plain: far, near. */
  land: [RGB, RGB];
  /** Cliffs: lit, shade. */
  rock: [RGB, RGB];
  sea: RGB;
  /** Tints for the stutter of futurist copies. */
  echo: RGB[];
  /** Keep the scene's own hues instead of choosing among the mids. */
  follow: boolean;
}
const palette = (
  deep: string,
  mids: string[],
  cream: string,
  wall: string,
  sky: [string, string, string],
  land: [string, string],
  rock: [string, string],
  sea: string,
  echo: string[],
  follow = false,
): Palette => ({
  deep: hex(deep),
  mids: mids.map(hex),
  cream: hex(cream),
  wall: hex(wall),
  sky: [hex(sky[0]), hex(sky[1]), hex(sky[2])],
  land: [hex(land[0]), hex(land[1])],
  rock: [hex(rock[0]), hex(rock[1])],
  sea: hex(sea),
  echo: echo.map(hex),
  follow,
});

const PALETTES = {
  umber: palette(
    '#271c12',
    ['#6e5538', '#8a6a42', '#b8975f', '#a8a395', '#7d7262', '#5a5852', '#9c7b4e', '#c2a774', '#4a3a28'],
    '#e6dcc4',
    '#d4cab2',
    ['#6f6a5a', '#a2987c', '#d8c9a0'],
    ['#c9ac78', '#5e4528'],
    ['#c8a060', '#6a4a2a'],
    '#7d8a86',
    ['#b8975f', '#a8a395', '#6e5538', '#d6c8ac'],
  ),
  pewter: palette(
    '#1f1e1c',
    ['#5a5852', '#6f7a80', '#8e9eab', '#a8a395', '#7d725f', '#9c8f74', '#b4b8b2', '#5f6a70', '#3f3e3a'],
    '#e2e0d6',
    '#d6d4ca',
    ['#4a5560', '#8a96a0', '#d2d0c4'],
    ['#b8b2a0', '#4f4a40'],
    ['#a8a08c', '#55504a'],
    '#6f7f8a',
    ['#8e9eab', '#b4b8b2', '#9c8f74', '#cfd0c8'],
  ),
  olive: palette(
    '#1b2022',
    ['#3d5a6c', '#6a7f8a', '#8a9a5b', '#5f6e3a', '#c9b98a', '#2c3a4a', '#a8b4b0', '#7a6a4a', '#9a4a32'],
    '#e8e4d4',
    '#d8d6c6',
    ['#2c4a66', '#7a92a0', '#d8d2b4'],
    ['#c4b88c', '#4a4a32'],
    ['#b8a46a', '#5a5032'],
    '#3d5a6c',
    ['#3d5a6c', '#8a9a5b', '#c9b98a', '#a8b4b0'],
  ),
  desert: palette(
    '#22160d',
    ['#9a6a34', '#c8954a', '#d2ad70', '#8aa6b8', '#4f6f86', '#a8452c', '#e8c27a', '#6b7a4a', '#5a3d22'],
    '#f6efd6',
    '#e6dcc0',
    ['#1e3a74', '#5f88bd', '#ecdcaa'],
    ['#dcb978', '#6e4a26'],
    ['#e8c27a', '#8a5a2c'],
    '#4f7894',
    ['#e8c27a', '#8aa6b8', '#c8954a', '#f6efd6'],
  ),
  prismatic: palette(
    '#1c1820',
    ['#d23a1e', '#1f4fa8', '#e8c22a', '#2a8a5a', '#e2711d', '#7a3a8a', '#3fa0c8', '#c8467a', '#4a3a40'],
    '#faf3e2',
    '#e9e2d2',
    ['#2a3a8a', '#c8467a', '#f0b84a'],
    ['#e8b070', '#5a2a3a'],
    ['#e2711d', '#7a3a8a'],
    '#1f4fa8',
    ['#d23a1e', '#1f4fa8', '#e8c22a', '#2a8a5a', '#7a3a8a'],
  ),
  bistre: palette(
    '#20140a',
    ['#6b4426', '#7f5634', '#94683f', '#5c3d24', '#a67c50', '#86603c', '#b8946a'],
    '#efe2c8',
    '#e6d8bc',
    ['#6b4f36', '#a68a66', '#e2cfa8'],
    ['#c8a77c', '#5c3d24'],
    ['#b08a5c', '#5c3d24'],
    '#7f6a52',
    ['#94683f', '#d9c3a0', '#6b4426'],
  ),
  scene: palette(
    '#241a12',
    ['#7a6a52', '#9a8a6a', '#5a5852', '#b8a47c'],
    '#efe6d0',
    '#ddd5c2',
    ['#26457e', '#6a92c0', '#ead9a6'],
    ['#d6b47a', '#6a4826'],
    ['#e2bc78', '#8a5a2c'],
    '#4f7894',
    ['#d6c8ac', '#8e9eab', '#c8954a', '#efe6d0'],
    true,
  ),
} as const satisfies Record<string, Palette>;

// ------------------------------------------------------------------------------------ noise

function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const fbm = (x: number, y: number, s: number) =>
  noise(x, y, s) * 0.55 + noise(x * 2.1 + 7.3, y * 2.1 - 3.1, s + 1) * 0.3 + noise(x * 4.3 - 1.7, y * 4.3 + 9.2, s + 2) * 0.15;

/** Box blur in place, a few passes for a soft bell. */
function blur(field: Float32Array, n: number, radius: number, passes: number) {
  if (radius < 1) return;
  const line = new Float32Array(n);
  const span = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let axis = 0; axis < 2; axis++) {
      const step = axis === 0 ? 1 : n, other = axis === 0 ? n : 1;
      for (let row = 0; row < n; row++) {
        const base = row * other;
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += field[base + Math.min(n - 1, Math.max(0, k)) * step];
        for (let k = 0; k < n; k++) {
          line[k] = sum / span;
          sum += field[base + Math.min(n - 1, k + radius + 1) * step] - field[base + Math.max(0, k - radius) * step];
        }
        for (let k = 0; k < n; k++) field[base + k * step] = line[k];
      }
    }
  }
}

// ------------------------------------------------------------------------------------ geometry

/** Bowyer–Watson Delaunay triangulation. Returns vertex index triples. */
function triangulate(xs: number[], ys: number[]): number[] {
  const count = xs.length;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    minX = Math.min(minX, xs[i]);
    maxX = Math.max(maxX, xs[i]);
    minY = Math.min(minY, ys[i]);
    maxY = Math.max(maxY, ys[i]);
  }
  const d = Math.max(maxX - minX, maxY - minY) * 30 + 10;
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  const X = xs.slice(), Y = ys.slice();
  X.push(midX - d, midX, midX + d);
  Y.push(midY - d, midY + d, midY - d);
  const ta: number[] = [], tb: number[] = [], tc: number[] = [], ux: number[] = [], uy: number[] = [], r2: number[] = [];
  const add = (i: number, j: number, k: number) => {
    const ax = X[i], ay = Y[i], bx = X[j], by = Y[j], cx = X[k], cy = Y[k];
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    let x: number, y: number, r: number;
    if (Math.abs(D) < 1e-9) {
      x = (ax + bx + cx) / 3;
      y = (ay + by + cy) / 3;
      r = Infinity;
    } else {
      const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
      x = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D;
      y = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
      r = (ax - x) * (ax - x) + (ay - y) * (ay - y);
    }
    ta.push(i);
    tb.push(j);
    tc.push(k);
    ux.push(x);
    uy.push(y);
    r2.push(r);
  };
  add(count, count + 1, count + 2);
  const edges: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = X[i], y = Y[i];
    edges.length = 0;
    for (let t = ta.length - 1; t >= 0; t--) {
      const dx = x - ux[t], dy = y - uy[t];
      if (dx * dx + dy * dy < r2[t]) {
        edges.push(ta[t], tb[t], tb[t], tc[t], tc[t], ta[t]);
        const last = ta.length - 1;
        ta[t] = ta[last];
        tb[t] = tb[last];
        tc[t] = tc[last];
        ux[t] = ux[last];
        uy[t] = uy[last];
        r2[t] = r2[last];
        ta.pop();
        tb.pop();
        tc.pop();
        ux.pop();
        uy.pop();
        r2.pop();
      }
    }
    for (let e = 0; e < edges.length; e += 2) {
      const e0 = edges[e], e1 = edges[e + 1];
      if (e0 < 0) continue;
      let shared = false;
      for (let f = e + 2; f < edges.length; f += 2) {
        if ((edges[f] === e0 && edges[f + 1] === e1) || (edges[f] === e1 && edges[f + 1] === e0)) {
          edges[f] = edges[f + 1] = -1;
          shared = true;
        }
      }
      if (!shared) add(e0, e1, i);
    }
  }
  const out: number[] = [];
  for (let t = 0; t < ta.length; t++) if (ta[t] < count && tb[t] < count && tc[t] < count) out.push(ta[t], tb[t], tc[t]);
  return out;
}

function fillTriangle(
  n: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  visit: (p: number, x: number, y: number) => void,
) {
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(area) < 1e-9) return;
  const s = area > 0 ? 1 : -1;
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(n - 1, Math.ceil(Math.max(ax, bx, cx)));
  const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(n - 1, Math.ceil(Math.max(ay, by, cy)));
  for (let y = y0; y <= y1; y++) {
    const py = y + 0.5;
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5;
      if (((bx - px) * (cy - py) - (by - py) * (cx - px)) * s < -1e-6) continue;
      if (((cx - px) * (ay - py) - (cy - py) * (ax - px)) * s < -1e-6) continue;
      if (((ax - px) * (by - py) - (ay - py) * (bx - px)) * s < -1e-6) continue;
      visit(y * n + x, x, y);
    }
  }
}

// ------------------------------------------------------------------------------------ questions

const TRADITIONS = {
  cubism:
    'Analytic cubism, Paris 1910–1912: the scene cut into small translucent planes in browns, ochres and greys, each lit on one side and shaded on the other, the subject seen from two angles at once. Cafés, guitars, still lifes, studios, intellect, quiet fracture.',
  futurism:
    'Italian futurism, 1912–1914: whatever moves is repeated in a stutter of offset copies along its path, with speed lines and long wedges of force cutting the air. Cars, trains, cyclists, crowds, dogs on leashes, noise, speed, the modern city.',
  surrealism:
    'A surrealist dream, 1931: soft things sag and drip like warm wax under hard golden light, on a flat endless plain with a far sea and cliffs, long shadows raking the empty ground. Memory, time, sleep, melancholy, the uncanny.',
} as const;

export default defineLook({
  questions: {
    tradition: choice('Which modern tradition breaks the picture?', TRADITIONS),
    palette: choice('Which colours are on the palette?', {
      umber: 'Braque in 1911: tobacco and umber browns, ochre and dull greys, with deep brown shadows. Cafés, pipes, newspapers, guitars.',
      pewter: 'Picasso in 1910: pewter and silver greys, slate blue and a little brown. Cool, cerebral, wintry portraits.',
      olive: 'Juan Gris: slate blue, olive green, black and straw, with one brick red. Crisp, tabletop, modern.',
      desert: 'Dalí: ochre sand, gold rock, deep Prussian sky fading to pale lemon at the horizon. Dreams, heat, stillness.',
      prismatic: 'Severini and Balla: vermilion, cobalt, lemon and emerald against near-black. Electric light, dance halls, speed.',
      bistre: 'One brown: a bistre study in browns from cream to near black, like an old drawing.',
      scene: 'The scene’s own colours, deepened and muted into old oil paint.',
    }),
    planes: score('How large are the planes the picture is cut into?', [
      'Shattered into many small facets',
      'Small',
      'Medium',
      'Large',
      'A few broad planes',
    ]),
    distortion: score('How hard is the scene bent and broken?', [
      'Barely disturbed, still easy to read',
      'Shifted',
      'Clearly broken and bent',
      'Torn apart, half abstract',
    ]),
    shadows: score('How long are the shadows thrown across the ground?', [
      'No cast shadows',
      'Short',
      'Long',
      'Very long, raking across the ground',
      'Stretching to the horizon',
    ]),
    line: score('How heavily is it drawn over in line?', [
      'No line, paint only',
      'A few faint pencil lines',
      'Firm charcoal lines',
      'Heavy black scaffolding',
    ]),
    handling: choice('How is the paint put down?', {
      glaze: 'Smooth invisible glazes blended like enamel, polished and academic.',
      dashes: 'Short brick-like dabs of cream and umber laid over every plane, gritty, like Braque’s handwriting.',
      divisionist: 'Separate strokes of unmixed colour laid side by side, running with the movement.',
      charcoal: 'Charcoal and thin gouache on paper: a drawing, hatched and smudged, the colour only washed in.',
    }),
    support: choice('What is it painted on?', {
      linen: 'Oil on coarse linen, edge to edge, the weave showing through thin paint.',
      oval: 'An oval canvas hung on a pale wall, the picture darkening toward its rim.',
      panel: 'A small smooth panel under amber varnish, fine cracks in the old paint.',
      sheet: 'A sheet of toned paper, worked up in the middle and left unfinished toward the edges.',
    }),
    pull: choice('Which way does the picture pull?', {
      light: 'Away from the light, the way the shadows fall.',
      right: 'Rushing to the right.',
      left: 'Rushing to the left.',
      rising: 'Rising upward, lifting off.',
      burst: 'Bursting outward from the subject toward the viewer.',
    }),
  },

  async apply(capture, a, context, signal) {
    const n = capture.size;
    const N = n * n;
    const k720 = n / 720;
    const { color, normal, depth, identity, diffuse } = capture;
    const mood = context.mood;
    const seed = ((context.seed >>> 0) % 1_000_003) + 7;
    const random = seeded((context.seed ^ 0x2f1a9c3) >>> 0);
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const cubism = a.tradition === 'cubism';
    const futurism = a.tradition === 'futurism';
    const surreal = a.tradition === 'surrealism';
    const notes: string[] = [];

    // ---------------------------------------------------------------- palette, tinted by mood
    const P: Palette = PALETTES[a.palette];
    const warm = (mood.warmth - 0.5) * 0.16;
    const tint = (c: RGB): RGB => [clamp01(c[0] * (1 + warm)), clamp01(c[1] * (1 + warm * 0.2)), clamp01(c[2] * (1 - warm))];
    const deep = tint(P.deep), cream = tint(P.cream);
    const mids = P.mids.map(tint);
    const echoes = P.echo.map(tint);
    const Ld = lum(deep[0], deep[1], deep[2]), Lc = lum(cream[0], cream[1], cream[2]);
    const midA = mids.map((c) => c[0] - c[1]);
    const midB = mids.map((c) => (c[0] + c[1]) / 2 - c[2]);
    const midL = mids.map((c) => lum(c[0], c[1], c[2]));
    // The least saturated colours carry the open field of a cubist picture.
    const allMids = mids.map((_, j) => j);
    const quiet = allMids
      .slice()
      .sort((i, j) => Math.abs(midA[i]) + Math.abs(midB[i]) - Math.abs(midA[j]) - Math.abs(midB[j]))
      .slice(0, Math.max(3, Math.ceil(mids.length * 0.6)));
    // Grim ideas print darker, joyful ones a little lighter.
    const gloom = mix(0.82, 1.06, mood.cheer);

    /** Recolour a scene colour into the palette at a target value. `alt` picks a neighbouring hue. */
    const paint = (r: number, g: number, b: number, target: number, alt: number, out: RGB) => {
      let Mr: number, Mg: number, Mb: number, Ml: number;
      if (P.follow) {
        const l = lum(r, g, b);
        Mr = mix(l, r, 0.8) * 0.88;
        Mg = mix(l, g, 0.8) * 0.85;
        Mb = mix(l, b, 0.8) * 0.8;
        Ml = lum(Mr, Mg, Mb);
      } else {
        const ca = r - g, cb = (r + g) / 2 - b, cl = lum(r, g, b);
        let best = 0, second = 0, bs = Infinity, ss = Infinity;
        for (let j = 0; j < mids.length; j++) {
          const s = (ca - midA[j]) ** 2 + (cb - midB[j]) ** 2 + 0.12 * (cl - midL[j]) ** 2;
          if (s < bs) {
            second = best;
            ss = bs;
            best = j;
            bs = s;
          } else if (s < ss) {
            second = j;
            ss = s;
          }
        }
        const j = alt > 0.62 ? second : best;
        Mr = mids[j][0];
        Mg = mids[j][1];
        Mb = mids[j][2];
        Ml = midL[j];
      }
      if (target <= Ml) {
        const t = clamp01((target - Ld) / (Ml - Ld + 1e-4));
        out[0] = deep[0] + (Mr - deep[0]) * t;
        out[1] = deep[1] + (Mg - deep[1]) * t;
        out[2] = deep[2] + (Mb - deep[2]) * t;
      } else {
        const t = clamp01((target - Ml) / (Lc - Ml + 1e-4));
        out[0] = Mr + (cream[0] - Mr) * t;
        out[1] = Mg + (cream[1] - Mg) * t;
        out[2] = Mb + (cream[2] - Mb) * t;
      }
    };

    // ---------------------------------------------------------------- read the capture
    const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
    const ID = new Uint8Array(N), Z = new Float32Array(N), DF = new Float32Array(N);
    const NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
    const tones = new Uint32Array(256);
    let solid = 0;
    for (let p = 0; p < N; p++) {
      const i = p * 4;
      R[p] = color[i] / 255;
      G[p] = color[i + 1] / 255;
      B[p] = color[i + 2] / 255;
      const id = identity[i];
      ID[p] = id;
      NX[p] = normal[i] / 127.5 - 1;
      NY[p] = 1 - normal[i + 1] / 127.5; // image space: y down
      NZ[p] = normal[i + 2] / 127.5 - 1;
      if (id > 0) {
        Z[p] = (depth[i] * 65536 + depth[i + 1] * 256 + depth[i + 2]) / 16777216;
        tones[diffuse[i]]++;
        solid++;
      }
    }
    let lit = 255;
    for (let seen = 0; lit > 20 && seen < solid * 0.05; lit--) seen += tones[lit];
    for (let p = 0; p < N; p++) DF[p] = ID[p] > 0 ? Math.min(1, diffuse[p * 4] / lit) : 0.8;

    const measure = (ids: Uint8Array) => {
      const count = new Float64Array(256), sx = new Float64Array(256), sy = new Float64Array(256), sz = new Float64Array(256);
      const x0 = new Float64Array(256).fill(n), x1 = new Float64Array(256).fill(-1);
      const y0 = new Float64Array(256).fill(n), y1 = new Float64Array(256).fill(-1);
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          const id = ids[p];
          count[id]++;
          sx[id] += x;
          sy[id] += y;
          sz[id] += Z[p];
          if (x < x0[id]) x0[id] = x;
          if (x > x1[id]) x1[id] = x;
          if (y < y0[id]) y0[id] = y;
          if (y > y1[id]) y1[id] = y;
        }
      return { count, sx, sy, sz, x0, x1, y0, y1 };
    };
    const st = measure(ID);
    const things: number[] = [];
    for (let id = 3; id < 256; id++) if (st.count[id] >= 40) things.push(id);
    let hero = -1;
    if (st.count[3] >= 40) hero = 3;
    else if (things.length) hero = things.reduce((best, id) => (st.count[id] > st.count[best] ? id : best), things[0]);
    else if (st.count[2] >= 40) hero = 2;
    const heroBox =
      hero >= 0
        ? { x0: st.x0[hero], x1: st.x1[hero], y0: st.y0[hero], y1: st.y1[hero], cx: st.sx[hero] / st.count[hero], cy: st.sy[hero] / st.count[hero] }
        : { x0: n * 0.3, x1: n * 0.7, y0: n * 0.3, y1: n * 0.7, cx: n / 2, cy: n / 2 };
    const heroSize = Math.max(24, heroBox.x1 - heroBox.x0, heroBox.y1 - heroBox.y0);

    // Where the light comes from, in the picture.
    const [lx0, ly0, lz0] = capture.light;
    const lh = Math.hypot(lx0, ly0);
    const Lx = lh > 0.05 ? lx0 / lh : -0.7, Ly = lh > 0.05 ? ly0 / lh : -0.7;
    const hl = Math.hypot(lx0, ly0, lz0 + 1) || 1;
    const Hx = lx0 / hl, Hy = ly0 / hl, Hz = (lz0 + 1) / hl;

    // Which way the picture pulls.
    const burst = a.pull === 'burst';
    let mx = 1, my = 0;
    if (a.pull === 'light') {
      mx = -Lx;
      my = -Ly * 0.35;
      if (Math.abs(mx) < 0.4) mx = mx < 0 ? -0.85 : 0.85;
    } else if (a.pull === 'left') {
      mx = -1;
      my = 0.06;
    } else if (a.pull === 'rising') {
      mx = 0.14;
      my = -1;
    } else {
      mx = 1;
      my = 0.06;
    }
    const ml = Math.hypot(mx, my);
    mx /= ml;
    my /= ml;
    await pause();

    // ---------------------------------------------------------------- melt (surrealism)
    const srcMap = new Int32Array(N);
    for (let p = 0; p < N; p++) srcMap[p] = p;
    const dripShade = new Float32Array(N);
    if (surreal && things.length) {
      const A = mix(0.14, 0.52, a.distortion);
      const order = things.slice().sort((i, j) => st.sz[i] / st.count[i] - st.sz[j] / st.count[j]);
      const owner = new Int16Array(N).fill(-1);
      const lobe = mix(16, 80, a.planes) * k720;
      const lean = (burst ? 0 : mx) * mix(0.04, 0.2, a.distortion);
      for (const o of order) {
        const ox0 = st.x0[o], ox1 = st.x1[o], oy0 = st.y0[o], oy1 = st.y1[o];
        const H = oy1 - oy0 + 1, W = ox1 - ox0 + 1, ocx = (ox0 + ox1) / 2, hw = W / 2 + 1;
        const leanPx = lean * H;
        const xa = Math.max(0, Math.floor(ox0 - Math.abs(leanPx) - 2)), xb = Math.min(n - 1, Math.ceil(ox1 + Math.abs(leanPx) + 2));
        for (let x = xa; x <= xb; x++) {
          const edge = Math.min(1.3, Math.abs(x - ocx) / hw);
          const sag = Math.min(0.55, A * (0.5 + 0.6 * edge * edge) * (0.6 + 0.8 * noise(x / lobe, o * 7.3, seed + 3))) * H;
          // Each source row lands at y + sag·h^1.6, which only increases with y: walk it to invert.
          const fwd = (y: number) => y + sag * Math.min(1, Math.max(0, (oy1 - y) / H)) ** 1.6;
          let j = oy0;
          for (let yo = oy0; yo <= oy1; yo++) {
            const p = yo * n + x;
            if (owner[p] >= 0) continue;
            if (fwd(oy0) > yo) continue;
            while (j < oy1 && fwd(j + 1) <= yo) j++;
            const f0 = fwd(j), f1 = j < oy1 ? fwd(j + 1) : f0 + 1;
            const y = j + clamp01((yo - f0) / Math.max(1e-4, f1 - f0));
            const h = Math.max(0, (oy1 - y) / H);
            const xs = Math.round(x - leanPx * h * h), ys = Math.round(y);
            if (xs < 0 || xs >= n || ys < 0 || ys >= n) continue;
            const q = ys * n + xs;
            if (ID[q] === o) {
              srcMap[p] = q;
              owner[p] = o;
            }
          }
        }
        // Drips hang from whatever overhangs.
        const dripMax = H * mix(0.12, 0.42, a.distortion);
        for (let x = xa; x <= xb; x++) {
          const bump = smooth(0.46, 0.76, noise(x / (lobe * 0.4), o * 3.1 + 40, seed + 9));
          if (bump <= 0) continue;
          let yl = -1;
          for (let y = oy1; y >= oy0; y--)
            if (owner[y * n + x] === o) {
              yl = y;
              break;
            }
          if (yl < 0 || yl > oy1 - 5) continue;
          const below = Math.min(n - 1, yl + 2) * n + Math.min(n - 1, Math.max(0, Math.round(x)));
          if (ID[below] === o) continue;
          const len = Math.round(dripMax * bump ** 0.55 * (0.45 + 0.75 * noise(x / (lobe * 0.6), o * 5.7, seed + 11)));
          // Take the drip's colour from just inside the edge, not the anti-aliased rim.
          let from = yl * n + x;
          for (let up = 4; up >= 1; up--)
            if (yl - up >= 0 && owner[(yl - up) * n + x] === o) {
              from = (yl - up) * n + x;
              break;
            }
          for (let y = yl + 1; y <= Math.min(n - 1, yl + len); y++) {
            const p = y * n + x;
            if (owner[p] >= 0) break;
            srcMap[p] = srcMap[from];
            owner[p] = o;
            dripShade[p] = 1 - bump;
          }
        }
      }
      // What the sagging leaves behind is filled from the nearest backdrop or floor in the column.
      for (const o of things) {
        for (let y = st.y0[o]; y <= st.y1[o]; y++)
          for (let x = st.x0[o]; x <= st.x1[o]; x++) {
            const p = y * n + x;
            if (ID[p] !== o || owner[p] >= 0) continue;
            let found = p;
            for (let d = 1; d < n; d++) {
              if (y - d >= 0 && ID[p - d * n] < 3) {
                found = p - d * n;
                break;
              }
              if (y + d < n && ID[p + d * n] < 3) {
                found = p + d * n;
                break;
              }
            }
            srcMap[p] = found;
          }
      }
      notes.push(`soft things sag ${Math.round(A * 100)}% and drip`);
    }

    // ---------------------------------------------------------------- the scene as it will be painted
    const gather = <T extends Float32Array | Uint8Array>(from: T, into: T): T => {
      for (let p = 0; p < N; p++) into[p] = from[srcMap[p]];
      return into;
    };
    const sR = surreal ? gather(R, new Float32Array(N)) : R;
    const sG = surreal ? gather(G, new Float32Array(N)) : G;
    const sB = surreal ? gather(B, new Float32Array(N)) : B;
    const sID = surreal ? gather(ID, new Uint8Array(N)) : ID;
    const sNX = surreal ? gather(NX, new Float32Array(N)) : NX;
    const sNY = surreal ? gather(NY, new Float32Array(N)) : NY;
    const sNZ = surreal ? gather(NZ, new Float32Array(N)) : NZ;
    const sDF = surreal ? gather(DF, new Float32Array(N)) : DF;
    const sZ = surreal ? gather(Z, new Float32Array(N)) : Z;
    const st2 = surreal ? measure(sID) : st;
    await pause();

    // ---------------------------------------------------------------- dream landscape (surrealism)
    const land = new Uint8Array(N);
    let horizon = n * 0.5;
    if (surreal) {
      // A natural horizon where the world shows open sky; otherwise one is laid behind the subject.
      let sum = 0, cols = 0;
      for (let x = 0; x < n; x += 4) {
        if (sID[x] !== 0) continue;
        let y = 0;
        while (y < n && sID[y * n + x] === 0) y++;
        sum += y;
        cols++;
      }
      const natural = cols > n / 12;
      horizon = natural
        ? Math.min(n * 0.7, Math.max(n * 0.25, sum / cols))
        : Math.min(n * 0.6, Math.max(n * 0.36, mix(heroBox.y0, heroBox.y1, 0.5)));
      let floorLight = 0, floorCount = 0;
      for (let p = 0; p < N; p++)
        if (sID[p] === 1) {
          floorLight += sDF[p];
          floorCount++;
        }
      floorLight = floorCount ? floorLight / floorCount : 1;
      const cliffLeft = heroBox.cx > n / 2;
      const cliffSpan = n * mix(0.28, 0.42, random());
      const cliffHeight = n * mix(0.07, 0.13, random());
      const seaSpan = n * mix(0.35, 0.6, random());
      const [sky0, sky1, sky2] = P.sky.map(tint);
      const [far, near] = P.land.map(tint);
      const [rockLit, rockShade] = P.rock.map(tint);
      const sea = tint(P.sea);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const p = y * n + x;
          const id = sID[p];
          if (id > 1) continue;
          const skyward = y < horizon && (id === 0 || !natural);
          land[p] = skyward ? 2 : 1;
          let r: number, g: number, b: number;
          const fromEdge = cliffLeft ? x : n - 1 - x;
          // Cliffs rise toward the frame edge on the side away from the subject.
          const env = smooth(cliffSpan, 0, fromEdge);
          const top = horizon - cliffHeight * env * (0.55 + 0.6 * fbm(x / (40 * k720), 3.3, seed + 31));
          const shoreDrop = smooth(seaSpan, 0, fromEdge) * n * 0.03;
          if (env > 0.02 && y > top && y < horizon + shoreDrop * 0.3) {
            const t = clamp01((y - top) / Math.max(1, horizon - top));
            const facet = fbm(x / (22 * k720) + y / (60 * k720), y / (16 * k720), seed + 33);
            const litSide = facet > 0.5 === Lx < 0 ? 1 : 0.35;
            r = mix(rockLit[0], rockShade[0], mix(1 - litSide, 1, t * 0.6));
            g = mix(rockLit[1], rockShade[1], mix(1 - litSide, 1, t * 0.6));
            b = mix(rockLit[2], rockShade[2], mix(1 - litSide, 1, t * 0.6));
          } else if (skyward) {
            const t = y / horizon;
            if (t < 0.6) {
              const u = t / 0.6;
              r = mix(sky0[0], sky1[0], u);
              g = mix(sky0[1], sky1[1], u);
              b = mix(sky0[2], sky1[2], u);
            } else {
              const u = smooth(0, 1, (t - 0.6) / 0.4);
              r = mix(sky1[0], sky2[0], u);
              g = mix(sky1[1], sky2[1], u);
              b = mix(sky1[2], sky2[2], u);
            }
            const cloud = smooth(0.6, 0.78, fbm(x / (230 * k720), y / (14 * k720), seed + 35)) * smooth(0.25, 0.5, t) * 0.35;
            r = mix(r, sky2[0], cloud);
            g = mix(g, sky2[1], cloud);
            b = mix(b, sky2[2], cloud);
          } else if (y >= horizon && y < horizon + shoreDrop) {
            const t = (y - horizon) / Math.max(1, shoreDrop);
            const glint = Math.abs(t - 0.3) < 0.08 ? 0.35 : 0;
            r = mix(mix(sea[0], sky2[0], 0.25 * (1 - t)), sky2[0], glint);
            g = mix(mix(sea[1], sky2[1], 0.25 * (1 - t)), sky2[1], glint);
            b = mix(mix(sea[2], sky2[2], 0.25 * (1 - t)), sky2[2], glint);
          } else {
            const t = clamp01((y - horizon) / (n - horizon)) ** 0.75;
            const band = (noise(x / (320 * k720), y / ((5 + 40 * t) * k720), seed + 37) - 0.5) * 0.09;
            // The world's own light and shade on its floor carries over onto the plain.
            const k = id === 1 ? Math.min(1.05, Math.max(0.5, 0.55 + 0.45 * (sDF[p] / Math.max(0.05, floorLight)))) : 1;
            r = (mix(far[0], near[0], t) + band) * k;
            g = (mix(far[1], near[1], t) + band * 0.85) * k;
            b = (mix(far[2], near[2], t) + band * 0.6) * k;
          }
          sR[p] = r;
          sG[p] = g;
          sB[p] = b;
        }
      }
      notes.push('a flat dream plain with a far sea and cliffs');
    }
    await pause();

    // ---------------------------------------------------------------- long cast shadows
    const shadow = new Float32Array(N);
    const shadowLength = a.shadows ** 0.9 * 2.4 * (0.8 + 0.5 * Math.abs(mood.daylight - 0.5) * 2);
    if (a.shadows > 0.05) {
      // Shadows lie on the ground away from the light, raking back toward the horizon.
      const side = Lx > 0 ? -1 : 1;
      const rise = mix(0.22, 0.5, 1 - Math.min(1, Math.abs(Lx)));
      const dirX = side * Math.cos(rise), dirY = -Math.sin(rise);
      const casters = things.slice();
      if (surreal && st2.count[2] >= 40) casters.push(2);
      for (const o of casters) {
        // The foot: where it stood before any melting.
        const yg = o >= 3 ? st.y1[o] : st2.y1[o], H = yg - st2.y0[o] + 1;
        const K = Math.min(shadowLength, (n * 0.85) / Math.max(1, H));
        const up = -K * dirY, across = K * dirX;
        const ya = Math.max(0, Math.floor(yg - up * H) - 1);
        const xa = Math.max(0, Math.floor(Math.min(st2.x0[o], st2.x0[o] + across * H)) - 1);
        const xb = Math.min(n - 1, Math.ceil(Math.max(st2.x1[o], st2.x1[o] + across * H)) + 1);
        for (let y = ya; y <= yg && y < n; y++) {
          const t = (yg - y) / up;
          if (t > H) continue;
          const ys = Math.round(yg - t);
          if (ys < 0) continue;
          for (let x = xa; x <= xb; x++) {
            const p = y * n + x;
            const id = sID[p];
            if (id === o || id >= 3) continue;
            if (land[p] === 2) continue;
            const xs = Math.round(x - across * t);
            if (xs < 0 || xs >= n) continue;
            if (sID[ys * n + xs] === o) shadow[p] = 1;
          }
        }
      }
      blur(shadow, n, Math.max(1, Math.round(1.5 * k720)), 2);
      notes.push(`shadows ${shadowLength.toFixed(1)}× their height`);
    }
    await pause();

    // ---------------------------------------------------------------- underpainting: the scene in palette
    const UR = new Float32Array(N), UG = new Float32Array(N), UB = new Float32Array(N);
    {
      const bR = sR.slice(), bG = sG.slice(), bB = sB.slice();
      const soft = surreal ? 2 : 1;
      blur(bR, n, soft, 1);
      blur(bG, n, soft, 1);
      blur(bB, n, soft, 1);
      // Thing masks for academic modelling: dark inner edges round every soft form.
      let inner: Float32Array | null = null;
      if (surreal) {
        inner = new Float32Array(N);
        for (let p = 0; p < N; p++) inner[p] = sID[p] >= 2 ? 1 : 0;
        blur(inner, n, Math.max(2, Math.round(5 * k720)), 2);
      }
      const glowR = n * 0.34;
      const out: RGB = [0, 0, 0];
      // The open field (backdrop and floor) is repainted as a space of planes; it keeps only its shading.
      let fieldL = 0, fieldCount = 0;
      for (let p = 0; p < N; p++)
        if (sID[p] <= 1) {
          fieldL += lum(bR[p], bG[p], bB[p]);
          fieldCount++;
        }
      fieldL = fieldCount ? fieldL / fieldCount : 0.8;
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          const id = sID[p];
          if (land[p]) {
            UR[p] = bR[p];
            UG[p] = bG[p];
            UB[p] = bB[p];
            continue;
          }
          let r = bR[p], g = bG[p], b = bB[p];
          let l = lum(r, g, b);
          const alt = surreal ? 0 : noise(x / (46 * k720), y / (46 * k720), seed + 5);
          let target: number;
          if (!surreal && id <= 1) {
            const dx = x - heroBox.cx, dy = y - heroBox.cy;
            const glow = Math.exp(-(dx * dx + dy * dy) / (2 * glowR * glowR));
            const base = cubism ? 0.14 + 0.38 * glow : 0.3 + 0.3 * glow;
            target = base + 0.45 * (l - fieldL) + (noise(x / (90 * k720), y / (90 * k720), seed + 7) - 0.5) * 0.18;
            if (!P.follow) {
              const pool = cubism ? quiet : allMids;
              const j = pool[Math.min(pool.length - 1, Math.floor(noise(x / (240 * k720), y / (240 * k720), seed + 8) * pool.length * 1.2) % pool.length)];
              r = mids[j][0];
              g = mids[j][1];
              b = mids[j][2];
            }
          } else if (cubism) target = 0.04 + 0.74 * l ** 1.35;
          else if (futurism) target = 0.04 + 0.92 * l ** 1.08;
          else {
            target = 0.03 + 0.97 * l ** 1.12;
            if (inner && id >= 2) {
              const edge = clamp01((1 - inner[p]) * 2.2);
              target *= 1 - 0.38 * edge;
              const spec = Math.max(0, sNX[p] * Hx + sNY[p] * Hy + sNZ[p] * Hz) ** 36;
              target = Math.min(1, target + spec * 0.45);
              if (dripShade[p] > 0) target *= 1 - 0.35 * dripShade[p];
            }
          }
          paint(r, g, b, target * gloom, alt, out);
          UR[p] = out[0];
          UG[p] = out[1];
          UB[p] = out[2];
        }
    }
    await pause();

    // Cast shadows darken the underpainting, so facets and strokes carry them.
    if (a.shadows > 0.05) {
      const shade = surreal ? 0.62 : 0.55;
      const sky0 = tint(P.sky[0]);
      const sc: RGB = surreal ? [mix(deep[0], sky0[0], 0.4), mix(deep[1], sky0[1], 0.4), mix(deep[2], sky0[2], 0.4)] : deep;
      for (let p = 0; p < N; p++) {
        const s = shadow[p] * shade;
        if (s <= 0.002) continue;
        UR[p] = mix(UR[p], UR[p] * 0.3 + sc[0] * 0.3, s);
        UG[p] = mix(UG[p], UG[p] * 0.3 + sc[1] * 0.3, s);
        UB[p] = mix(UB[p], UB[p] * 0.3 + sc[2] * 0.3, s);
      }
    }

    // Output buffers.
    const OR = UR.slice(), OG = UG.slice(), OB = UB.slice();
    const blend = (p: number, c: RGB | readonly [number, number, number], al: number) => {
      OR[p] += (c[0] - OR[p]) * al;
      OG[p] += (c[1] - OG[p]) * al;
      OB[p] += (c[2] - OB[p]) * al;
    };

    // ---------------------------------------------------------------- edges, for seeding facets and lines
    const E = new Float32Array(N);
    if (!surreal) {
      const zr = 40;
      for (let y = 0; y < n - 1; y++)
        for (let x = 0; x < n - 1; x++) {
          const p = y * n + x;
          for (const q of [p + 1, p + n]) {
            let e: number;
            if (sID[p] !== sID[q]) e = 1;
            else {
              const dot = sNX[p] * sNX[q] + sNY[p] * sNY[q] + sNZ[p] * sNZ[q];
              e = Math.max(clamp01((1 - dot) * 5), clamp01(Math.abs(sZ[p] - sZ[q]) * zr * 25));
              const dc = Math.abs(sR[p] - sR[q]) + Math.abs(sG[p] - sG[q]) + Math.abs(sB[p] - sB[q]);
              e = Math.max(e, clamp01(dc * 2.5) * 0.8);
            }
            if (e > E[p]) E[p] = e;
            if (e > E[q]) E[q] = e;
          }
        }
    }

    // ---------------------------------------------------------------- facets
    // On a sheet of paper the picture is left unfinished toward the edges.
    const sheetKeep = a.support === 'sheet' ? new Float32Array(N).fill(1) : null;
    if (sheetKeep && surreal)
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          // A brushed edge: a gentle wobble, and dry strokes that end at different lengths.
          const horizontal = Math.min(x, n - 1 - x) < Math.min(y, n - 1 - y);
          const along = horizontal ? y : x;
          const edge =
            Math.min(x, y, n - 1 - x, n - 1 - y) +
            (noise(along / (90 * k720), horizontal ? 1 : 5, seed + 99) - 0.5) * n * 0.035 +
            (noise(along / (4 * k720), horizontal ? 2 : 6, seed + 98) - 0.5) * n * 0.012;
          sheetKeep[p] = smooth(n * 0.05, n * 0.07, edge);
        }
    const paper = tint(P.wall);
    const S = (cubism ? mix(30, 92, a.planes) : mix(18, 62, a.planes)) * k720;
    const px: number[] = [], py: number[] = [], tx: number[] = [], ty: number[] = [];
    let tri: Int32Array | null = null;
    let tris: number[] = [];
    if (!surreal) {
      const cell = Math.max(2, S * 0.2);
      const gw = Math.ceil((n + 4 * S) / cell) + 2;
      const grid = new Int32Array(gw * gw).fill(-1);
      const off = 2 * S;
      // Futurism stretches its planes along the pull: triangulate in a squeezed frame.
      const squeeze = futurism && !burst ? 4 : 1;
      const toT = (x: number, y: number): [number, number] => {
        if (squeeze === 1) return [x, y];
        const u = (x - n / 2) * mx + (y - n / 2) * my, v = -(x - n / 2) * my + (y - n / 2) * mx;
        return [u / squeeze, v];
      };
      const tryAdd = (x: number, y: number, minD: number) => {
        const gx = Math.floor((x + off) / cell), gy = Math.floor((y + off) / cell);
        if (gx < 1 || gy < 1 || gx >= gw - 1 || gy >= gw - 1) return;
        const reach = Math.ceil(minD / cell);
        for (let j = Math.max(0, gy - reach); j <= Math.min(gw - 1, gy + reach); j++)
          for (let i = Math.max(0, gx - reach); i <= Math.min(gw - 1, gx + reach); i++) {
            const k = grid[j * gw + i];
            if (k >= 0 && (px[k] - x) ** 2 + (py[k] - y) ** 2 < minD * minD) return;
          }
        if (grid[gy * gw + gx] >= 0) return;
        grid[gy * gw + gx] = px.length;
        px.push(x);
        py.push(y);
        const [u, v] = toT(x, y);
        tx.push(u + (hash(px.length, 3, seed) - 0.5) * 0.01);
        ty.push(v + (hash(px.length, 5, seed) - 0.5) * 0.01);
      };
      // Frame corners and edges.
      for (const [x, y] of [[0, 0], [n, 0], [0, n], [n, n]] as const) tryAdd(x, y, 1);
      for (let s = S * 0.9; s < n; s += S * 0.9) {
        tryAdd(s, 0, S * 0.3);
        tryAdd(s, n, S * 0.3);
        tryAdd(0, s, S * 0.3);
        tryAdd(n, s, S * 0.3);
      }
      // Points on the edges of things and the turn of surfaces, so planes break where the form breaks.
      const fine = Math.max(8 * k720, S * 0.55);
      const ce = Math.max(4, S * 0.45);
      for (let cy = 0; cy < n; cy += ce)
        for (let cx = 0; cx < n; cx += ce) {
          let best = -1, bestE = 0.45;
          for (let y = Math.floor(cy); y < Math.min(n, cy + ce); y++)
            for (let x = Math.floor(cx); x < Math.min(n, cx + ce); x++) {
              const e = E[y * n + x] + hash(x, y, seed + 13) * 0.05;
              if (e > bestE) {
                bestE = e;
                best = y * n + x;
              }
            }
          if (best >= 0 && random() < 0.88) {
            const isThing = sID[best] >= 3;
            tryAdd((best % n) + 0.5, Math.floor(best / n) + 0.5, (isThing ? fine : S) * 0.38);
          }
        }
      if (futurism && burst) {
        // Rings round the subject: long radial slivers.
        const maxR = Math.hypot(Math.max(heroBox.cx, n - heroBox.cx), Math.max(heroBox.cy, n - heroBox.cy)) + S;
        for (let rr = S * 0.8; rr < maxR; rr += S * 1.9) {
          const count = Math.max(8, Math.round((Math.PI * 2 * rr) / (S * 0.6)));
          const phase = random();
          for (let k = 0; k < count; k++) {
            const ang = ((k + phase + (random() - 0.5) * 0.4) / count) * Math.PI * 2;
            const r0 = rr + (random() - 0.5) * S * 0.5;
            const x = heroBox.cx + Math.cos(ang) * r0, y = heroBox.cy + Math.sin(ang) * r0;
            if (x > -S && y > -S && x < n + S && y < n + S) tryAdd(x, y, S * 0.25);
          }
        }
      } else if (futurism) {
        const su = S * 2.4, sv = S * 0.55;
        const reach = n * 0.75;
        for (let v = -reach; v < reach; v += sv)
          for (let u = -reach + random() * su; u < reach; u += su) {
            const uu = u + (random() - 0.5) * su * 0.7, vv = v + (random() - 0.5) * sv * 0.5;
            const x = n / 2 + uu * mx - vv * my, y = n / 2 + uu * my + vv * mx;
            if (x > -S && y > -S && x < n + S && y < n + S) tryAdd(x, y, sv * 0.45);
          }
      }
      // Smaller planes on things, broader ones on the ground and backdrop.
      for (let gy = 0; gy < n; gy += fine)
        for (let gx = 0; gx < n; gx += fine) {
          const x = gx + fine * (0.5 + (random() - 0.5) * 0.8), y = gy + fine * (0.5 + (random() - 0.5) * 0.8);
          const p = Math.min(n - 1, Math.floor(y)) * n + Math.min(n - 1, Math.floor(x));
          if (sID[p] >= 3) tryAdd(x, y, fine * 0.55);
        }
      if (!futurism)
        for (let gy = 0; gy < n; gy += S)
          for (let gx = 0; gx < n; gx += S) tryAdd(gx + S * (0.5 + (random() - 0.5) * 0.8), gy + S * (0.5 + (random() - 0.5) * 0.8), S * 0.5);
      else
        for (let gy = 0; gy < n; gy += S * 1.4)
          for (let gx = 0; gx < n; gx += S * 1.4) tryAdd(gx + S * (0.7 + (random() - 0.5)), gy + S * (0.7 + (random() - 0.5)), S * 0.45);

      await pause();
      tris = triangulate(tx, ty);
      await pause();
      const labels = new Int32Array(N).fill(-1);
      const T = tris.length / 3;
      for (let t = 0; t < T; t++) {
        const i = tris[t * 3], j = tris[t * 3 + 1], k = tris[t * 3 + 2];
        fillTriangle(n, px[i], py[i], px[j], py[j], px[k], py[k], (p) => {
          labels[p] = t;
        });
      }
      for (let p = 0; p < N; p++) if (labels[p] < 0) labels[p] = p > 0 ? labels[p - 1] : 0;
      for (let p = 0; p < N; p++) if (labels[p] < 0) labels[p] = 0;
      tri = labels;

      // Cubist planes are not all triangles: pair many with the neighbour across their longest edge.
      const group = new Int32Array(T);
      const verts: number[][] = [];
      for (let t = 0; t < T; t++) {
        group[t] = t;
        verts.push([tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2]]);
      }
      if (cubism) {
        const across = new Map<number, number[]>();
        for (let t = 0; t < T; t++)
          for (let e = 0; e < 3; e++) {
            const i = tris[t * 3 + e], j = tris[t * 3 + ((e + 1) % 3)];
            const key = Math.min(i, j) * 65536 + Math.max(i, j);
            const list = across.get(key);
            if (list) list.push(t);
            else across.set(key, [t]);
          }
        const merged = new Uint8Array(T);
        for (let step = 0; step < T; step++) {
          const t = Math.floor(random() * T);
          if (merged[t] || random() > 0.6) continue;
          let best = -1, bestLength = 0;
          for (let e = 0; e < 3; e++) {
            const i = tris[t * 3 + e], j = tris[t * 3 + ((e + 1) % 3)];
            const length = (px[i] - px[j]) ** 2 + (py[i] - py[j]) ** 2;
            if (length > bestLength) {
              bestLength = length;
              best = Math.min(i, j) * 65536 + Math.max(i, j);
            }
          }
          const other = (across.get(best) ?? []).find((u) => u !== t);
          if (other === undefined || merged[other]) continue;
          merged[t] = merged[other] = 1;
          group[other] = t;
          for (const v of verts[other]) if (!verts[t].includes(v)) verts[t].push(v);
        }
        for (let p = 0; p < N; p++) labels[p] = group[labels[p]];
      }

      // Facet properties.
      const facetKeep = sheetKeep ? new Float32Array(T).fill(1) : null;
      const offX = new Float32Array(T), offY = new Float32Array(T), alpha = new Float32Array(T), strength = new Float32Array(T);
      const gsx = new Float32Array(T), gsy = new Float32Array(T), gdx = new Float32Array(T), gdy = new Float32Array(T);
      const valueShift = new Float32Array(T);
      const swap = new Int16Array(T).fill(-1);
      for (let t = 0; t < T; t++) {
        if (group[t] !== t) continue;
        const vs = verts[t];
        const vx = vs.map((v) => px[v]), vy = vs.map((v) => py[v]);
        const cx = vx.reduce((sum, v) => sum + v, 0) / vs.length, cy = vy.reduce((sum, v) => sum + v, 0) / vs.length;
        const cp = Math.min(n - 1, Math.max(0, Math.floor(cy))) * n + Math.min(n - 1, Math.max(0, Math.floor(cx)));
        const id = sID[cp];
        const thing = id >= 3;
        valueShift[t] = (random() - 0.5) * (thing ? 0.16 : 0.26);
        if (facetKeep) {
          // On a sheet the planes give out one by one toward the edges.
          const edge = Math.min(cx, cy, n - cx, n - cy) / n;
          const threshold = 0.05 + 0.13 * random() + (thing ? -0.05 : 0);
          facetKeep[t] = smooth(threshold - 0.015, threshold + 0.015, edge);
        }
        if (cubism) {
          const shift = a.distortion * S * (thing ? 0.18 : 0.45) * (0.3 + 0.7 * random());
          const ang = random() * Math.PI * 2;
          offX[t] = Math.cos(ang) * shift;
          offY[t] = Math.sin(ang) * shift;
          alpha[t] = thing ? mix(0.45, 0.82, random()) : mix(0.5, 0.92, random());
          // The vertex toward the light starts light, the far one ends dark; sometimes the other way.
          let s = 0, e = 0, sd = -Infinity, ed = Infinity;
          for (let v = 0; v < vs.length; v++) {
            const d = (vx[v] - cx) * Lx + (vy[v] - cy) * Ly + (random() - 0.5) * S * 0.3;
            if (d > sd) {
              sd = d;
              s = v;
            }
            if (d < ed) {
              ed = d;
              e = v;
            }
          }
          if (random() < 0.3) [s, e] = [e, s];
          const dx = vx[e] - vx[s], dy = vy[e] - vy[s], l2 = dx * dx + dy * dy || 1;
          gsx[t] = vx[s];
          gsy[t] = vy[s];
          gdx[t] = dx / l2;
          gdy[t] = dy / l2;
          // The field calms toward the frame; the subject keeps its hard light and dark.
          const away = smooth(n * 0.22, n * 0.62, Math.hypot(cx - heroBox.cx, cy - heroBox.cy));
          strength[t] = thing ? mix(0.6, 1.15, random()) : mix(0.2, 1.05, random()) * (1 - 0.45 * away);
          if (random() < (thing ? 0.22 : 0.1)) swap[t] = Math.floor(random() * mids.length);
        } else {
          // Futurist planes: shifted along the pull, graded along it.
          const dirX = burst ? cx - heroBox.cx : mx, dirY = burst ? cy - heroBox.cy : my;
          const dl = Math.hypot(dirX, dirY) || 1;
          const ux = dirX / dl, uy = dirY / dl;
          const shift = a.distortion * S * (thing ? 0.5 : 1.1) * (random() * 2 - 1);
          offX[t] = ux * shift;
          offY[t] = uy * shift;
          alpha[t] = thing ? mix(0.35, 0.65, random()) : mix(0.4, 0.78, random());
          let lo = Infinity, hi = -Infinity;
          for (let v = 0; v < vs.length; v++) {
            const d = vx[v] * ux + vy[v] * uy;
            lo = Math.min(lo, d);
            hi = Math.max(hi, d);
          }
          const span = Math.max(1, hi - lo);
          const flip = random() < 0.5;
          // g = x·gdx + y·gdy + gsx: 0 at one end of the plane along the pull, 1 at the other.
          gdx[t] = (flip ? -ux : ux) / span;
          gdy[t] = (flip ? -uy : uy) / span;
          gsx[t] = flip ? hi / span : -lo / span;
          strength[t] = thing ? mix(0.6, 1.2, random()) : mix(0.4, 1.0, random());
          if (random() < (thing ? 0.3 : 0.12)) swap[t] = Math.floor(random() * mids.length);
        }
      }
      // Each facet's base colour: the mean of what it shows.
      const sumR = new Float64Array(T), sumG = new Float64Array(T), sumB = new Float64Array(T), cnt = new Float64Array(T);
      const sample = new Int32Array(N);
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          const t = labels[p];
          const qx = Math.min(n - 1, Math.max(0, Math.round(x + offX[t]))), qy = Math.min(n - 1, Math.max(0, Math.round(y + offY[t])));
          const q = qy * n + qx;
          sample[p] = q;
          sumR[t] += UR[q];
          sumG[t] += UG[q];
          sumB[t] += UB[q];
          cnt[t]++;
        }
      const baseR = new Float32Array(T), baseG = new Float32Array(T), baseB = new Float32Array(T);
      for (let t = 0; t < T; t++) {
        if (!cnt[t]) continue;
        const c = cnt[t];
        let r = sumR[t] / c, g = sumG[t] / c, b = sumB[t] / c;
        if (swap[t] >= 0 && !P.follow) {
          // Another hue from the palette at the same value: many colours per region.
          const l = lum(r, g, b), m = mids[swap[t]], j = midL[swap[t]];
          if (l <= j) {
            const k = clamp01((l - Ld) / (j - Ld + 1e-4));
            r = deep[0] + (m[0] - deep[0]) * k;
            g = deep[1] + (m[1] - deep[1]) * k;
            b = deep[2] + (m[2] - deep[2]) * k;
          } else {
            const u = clamp01((l - j) / (Lc - j + 1e-4));
            r = m[0] + (cream[0] - m[0]) * u;
            g = m[1] + (cream[1] - m[1]) * u;
            b = m[2] + (cream[2] - m[2]) * u;
          }
        }
        const v = valueShift[t];
        const to = v > 0 ? cream : deep, w = Math.abs(v);
        baseR[t] = r + (to[0] - r) * w;
        baseG[t] = g + (to[1] - g) * w;
        baseB[t] = b + (to[2] - b) * w;
      }
      if (facetKeep && sheetKeep) for (let p = 0; p < N; p++) sheetKeep[p] = facetKeep[labels[p]];
      const lightUp = cubism ? 0.48 : 0.4, darkDown = cubism ? 0.72 : 0.6;
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          const t = labels[p];
          const q = sample[p];
          let g: number;
          if (cubism) g = clamp01((x - gsx[t]) * gdx[t] + (y - gsy[t]) * gdy[t]);
          else g = clamp01(x * gdx[t] + y * gdy[t] + gsx[t]);
          const k = strength[t];
          const br = baseR[t], bg = baseG[t], bb = baseB[t];
          let r: number, gg: number, b: number;
          if (g < 0.45) {
            const u = lightUp * k * (1 - g / 0.45);
            r = br + (cream[0] - br) * u;
            gg = bg + (cream[1] - bg) * u;
            b = bb + (cream[2] - bb) * u;
          } else {
            const u = darkDown * k * ((g - 0.45) / 0.55) ** 1.2;
            r = br + (deep[0] - br) * u;
            gg = bg + (deep[1] - bg) * u;
            b = bb + (deep[2] - bb) * u;
          }
          const al = alpha[t];
          OR[p] = UR[q] + (r - UR[q]) * al;
          OG[p] = UG[q] + (gg - UG[q]) * al;
          OB[p] = UB[q] + (b - UB[q]) * al;
        }
      notes.push(`${T} ${cubism ? 'translucent facets' : 'planes stretched along the pull'}, about ${Math.round(S)} px`);
    }
    await pause();

    // ---------------------------------------------------------------- cubism: a second view and overlapping planes
    if (cubism) {
      if (hero >= 2) {
        const theta = (a.pull === 'left' ? 1 : a.pull === 'right' ? -1 : random() < 0.5 ? -1 : 1) * mix(0.07, 0.36, a.distortion);
        const sc = 1 + random() * 0.07;
        const shiftLen = mix(0.05, 0.17, a.distortion) * heroSize;
        const sx = (burst ? 0 : mx) * shiftLen, sy = (burst ? -0.4 : my) * shiftLen;
        const cos = Math.cos(theta), sin = Math.sin(theta);
        const ccx = heroBox.cx, ccy = heroBox.cy;
        let bx0 = n, bx1 = 0, by0 = n, by1 = 0;
        for (const [x, y] of [
          [heroBox.x0, heroBox.y0],
          [heroBox.x1, heroBox.y0],
          [heroBox.x0, heroBox.y1],
          [heroBox.x1, heroBox.y1],
        ]) {
          const dx = x - ccx, dy = y - ccy;
          const fx = ccx + sx + sc * (cos * dx - sin * dy), fy = ccy + sy + sc * (sin * dx + cos * dy);
          bx0 = Math.min(bx0, fx);
          bx1 = Math.max(bx1, fx);
          by0 = Math.min(by0, fy);
          by1 = Math.max(by1, fy);
        }
        bx0 = Math.max(0, Math.floor(bx0) - 2);
        by0 = Math.max(0, Math.floor(by0) - 2);
        bx1 = Math.min(n - 1, Math.ceil(bx1) + 2);
        by1 = Math.min(n - 1, Math.ceil(by1) + 2);
        const IR = OR.slice(), IG = OG.slice(), IB = OB.slice();
        const view = new Uint8Array(N);
        const lift = random() < 0.5;
        const share = mix(0.3, 0.6, a.distortion);
        for (let y = by0; y <= by1; y++)
          for (let x = bx0; x <= bx1; x++) {
            const dx = (x - ccx - sx) / sc, dy = (y - ccy - sy) / sc;
            const qx = Math.round(ccx + cos * dx + sin * dy), qy = Math.round(ccy - sin * dx + cos * dy);
            if (qx < 0 || qy < 0 || qx >= n || qy >= n) continue;
            const q = qy * n + qx;
            if (sID[q] !== hero) continue;
            const p = y * n + x;
            // The other view shows through only some of the planes, never as a whole ghost.
            const t = tri ? tri[p] : 0;
            if (hash(t, 11, seed) > share) continue;
            view[p] = 1;
            const r = lift ? mix(IR[q], cream[0], 0.16) : mix(IR[q], deep[0], 0.12);
            const g = lift ? mix(IG[q], cream[1], 0.16) : mix(IG[q], deep[1], 0.12);
            const b = lift ? mix(IB[q], cream[2], 0.16) : mix(IB[q], deep[2], 0.12);
            const al = 0.78;
            OR[p] += (r - OR[p]) * al;
            OG[p] += (g - OG[p]) * al;
            OB[p] += (b - OB[p]) * al;
          }
        if (a.line > 0.04) {
          const al = mix(0.3, 0.85, a.line);
          for (let y = by0; y < by1; y++)
            for (let x = bx0; x < bx1; x++) {
              const p = y * n + x;
              if (view[p] !== view[p + 1] || view[p] !== view[p + n]) {
                const grain = 0.55 + 0.45 * hash(x, y, seed + 41);
                blend(p, deep, al * grain);
                if (a.line > 0.55) blend(p + 1, deep, al * grain * 0.6);
              }
            }
        }
        notes.push(`a second view of the subject turned ${Math.round((Math.abs(theta) * 180) / Math.PI)}°`);
      }

      // Large translucent planes laid across the middle, binding the subject into the space.
      const planes = Math.round(mix(8, 26, mood.density) * mix(0.7, 1.2, a.distortion));
      const count = px.length;
      for (let k = 0; k < planes; k++) {
        const ang = random() * Math.PI * 2, rad = Math.abs(random() + random() + random() - 1.5) * n * 0.22;
        const ax = heroBox.cx + Math.cos(ang) * rad, ay = heroBox.cy + Math.sin(ang) * rad;
        const reach = S * mix(1.6, 3.6, random());
        const near: number[] = [];
        for (let i = 0; i < count; i++) if ((px[i] - ax) ** 2 + (py[i] - ay) ** 2 < reach * reach) near.push(i);
        if (near.length < 3) continue;
        const pick: number[] = [];
        const want = random() < 0.5 ? 3 : 4;
        for (let tries = 0; tries < 20 && pick.length < want; tries++) {
          const i = near[Math.floor(random() * near.length)];
          if (!pick.includes(i)) pick.push(i);
        }
        if (pick.length < 3) continue;
        const mcx = pick.reduce((s, i) => s + px[i], 0) / pick.length, mcy = pick.reduce((s, i) => s + py[i], 0) / pick.length;
        pick.sort((i, j) => Math.atan2(py[i] - mcy, px[i] - mcx) - Math.atan2(py[j] - mcy, px[j] - mcx));
        const kind = random();
        const m = mids[Math.floor(random() * mids.length)];
        const al = mix(0.14, 0.42, random());
        const sxp = px[pick[0]], syp = py[pick[0]];
        let far = pick[1];
        for (const i of pick) if ((px[i] - sxp) ** 2 + (py[i] - syp) ** 2 > (px[far] - sxp) ** 2 + (py[far] - syp) ** 2) far = i;
        const ddx = px[far] - sxp, ddy = py[far] - syp, dl2 = ddx * ddx + ddy * ddy || 1;
        const hatchStep = 6 * k720 + random() * 3;
        const visit = (p: number, x: number, y: number) => {
          if (kind < 0.14) {
            // stippled plane
            const u = (x + y) / (9 * k720), v = (x - y) / (9 * k720);
            const du = u - Math.round(u), dv = v - Math.round(v);
            if (du * du + dv * dv < 0.06) blend(p, deep, 0.5);
          } else if (kind < 0.28) {
            // hatched plane
            if (((x + y * 0.6) % hatchStep) < 1.2 * k720) blend(p, deep, 0.4);
          } else {
            const g = clamp01(((x - sxp) * ddx + (y - syp) * ddy) / dl2);
            let r: number, gg: number, b: number;
            if (g < 0.5) {
              const u = 0.35 * (1 - g * 2);
              r = m[0] + (cream[0] - m[0]) * u;
              gg = m[1] + (cream[1] - m[1]) * u;
              b = m[2] + (cream[2] - m[2]) * u;
            } else {
              const u = 0.55 * (g - 0.5) * 2;
              r = m[0] + (deep[0] - m[0]) * u;
              gg = m[1] + (deep[1] - m[1]) * u;
              b = m[2] + (deep[2] - m[2]) * u;
            }
            OR[p] += (r - OR[p]) * al;
            OG[p] += (gg - OG[p]) * al;
            OB[p] += (b - OB[p]) * al;
          }
        };
        for (let v = 1; v < pick.length - 1; v++)
          fillTriangle(n, px[pick[0]], py[pick[0]], px[pick[v]], py[pick[v]], px[pick[v + 1]], py[pick[v + 1]], visit);
      }
      notes.push(`${planes} overlapping planes`);
    }
    await pause();

    // ---------------------------------------------------------------- futurism: the stutter of copies and speed lines
    if (futurism && things.length) {
      // Lines of force: long wedges thrown back from the subject, light against dark.
      {
        const wedges = Math.round(mix(5, 10, mood.energy));
        const ax = heroBox.cx + (burst ? 0 : mx * heroSize * 0.2), ay = heroBox.cy + (burst ? 0 : my * heroSize * 0.2);
        const back = Math.atan2(-my, -mx);
        for (let k = 0; k < wedges; k++) {
          const ang = burst ? (k / wedges) * Math.PI * 2 + random() * 0.5 : back + (random() - 0.5) * 1.5;
          const half = mix(0.035, 0.12, random());
          const len = n * mix(0.55, 1.15, random());
          const x1 = ax + Math.cos(ang - half) * len, y1 = ay + Math.sin(ang - half) * len;
          const x2 = ax + Math.cos(ang + half) * len, y2 = ay + Math.sin(ang + half) * len;
          const c = k % 3 === 0 ? cream : k % 3 === 1 ? deep : echoes[k % echoes.length];
          const al0 = mix(0.22, 0.42, random());
          fillTriangle(n, ax, ay, x1, y1, x2, y2, (p, x, y) => {
            if (sID[p] >= 3) return;
            const g = Math.hypot(x - ax, y - ay) / len;
            blend(p, c, al0 * (1 - g) ** 0.8 * smooth(0, 0.12, g));
          });
        }
      }
      const IR = OR.slice(), IG = OG.slice(), IB = OB.slice();
      const copies = Math.max(3, Math.round(mix(3, 7, a.distortion) * mix(0.8, 1.25, mood.energy)));
      const order = things.slice().sort((i, j) => st.sz[j] / st.count[j] - st.sz[i] / st.count[i]);
      for (const o of order) {
        const ox0 = st.x0[o], ox1 = st.x1[o], oy0 = st.y0[o], oy1 = st.y1[o];
        const ext = (ox1 - ox0) * Math.abs(mx) + (oy1 - oy0) * Math.abs(my);
        const step = mix(0.2, 0.38, a.distortion) * Math.max(ext, 40 * k720) + 4 * k720;
        const growth = mix(0.07, 0.16, a.distortion);
        for (let k = copies; k >= 1; k--) {
          const al = 0.72 * (1 - k / (copies + 1)) ** 0.8;
          const echo = echoes[(k - 1 + o) % echoes.length];
          let bx0: number, bx1: number, by0: number, by1: number;
          const sc = 1 + k * growth;
          const dx = -mx * step * k, dy = -my * step * k;
          if (burst) {
            bx0 = heroBox.cx + (ox0 - heroBox.cx) * sc;
            bx1 = heroBox.cx + (ox1 - heroBox.cx) * sc;
            by0 = heroBox.cy + (oy0 - heroBox.cy) * sc;
            by1 = heroBox.cy + (oy1 - heroBox.cy) * sc;
          } else {
            bx0 = ox0 + dx;
            bx1 = ox1 + dx;
            by0 = oy0 + dy;
            by1 = oy1 + dy;
          }
          const xa = Math.max(0, Math.floor(bx0)), xb = Math.min(n - 1, Math.ceil(bx1));
          const ya = Math.max(0, Math.floor(by0)), yb = Math.min(n - 1, Math.ceil(by1));
          if (xb < xa || yb < ya) continue;
          const bw = xb - xa + 1;
          const inside = new Uint8Array(bw * (yb - ya + 1));
          for (let y = ya; y <= yb; y++)
            for (let x = xa; x <= xb; x++) {
              const qx = burst ? Math.round(heroBox.cx + (x - heroBox.cx) / sc) : Math.round(x - dx);
              const qy = burst ? Math.round(heroBox.cy + (y - heroBox.cy) / sc) : Math.round(y - dy);
              if (qx < 0 || qy < 0 || qx >= n || qy >= n) continue;
              const q = qy * n + qx;
              if (sID[q] !== o) continue;
              inside[(y - ya) * bw + (x - xa)] = 1;
              const p = y * n + x;
              OR[p] += (mix(IR[q], echo[0], 0.32) - OR[p]) * al;
              OG[p] += (mix(IG[q], echo[1], 0.32) - OG[p]) * al;
              OB[p] += (mix(IB[q], echo[2], 0.32) - OB[p]) * al;
            }
          // Each echo keeps its own contour, like a run of exposures on one plate.
          const outline = mix(0.3, 0.85, a.line) * (1 - k / (copies + 1)) ** 0.6;
          for (let y = ya; y <= yb; y++)
            for (let x = xa; x <= xb; x++) {
              const i = (y - ya) * bw + (x - xa);
              if (!inside[i]) continue;
              const edge = x === xa || x === xb || y === ya || y === yb || !inside[i - 1] || !inside[i + 1] || !inside[i - bw] || !inside[i + bw];
              if (edge) blend(y * n + x, deep, outline * (0.6 + 0.4 * hash(x, y, seed + 43)));
            }
        }
      }
      await pause();
      // Speed lines trail behind every moving thing.
      const L = mix(0.25, 0.55, a.distortion) * n * mix(0.75, 1.25, mood.energy);
      const lane = mix(7, 16, a.planes) * k720;
      const lineAl = mix(0.45, 0.9, a.line);
      const stepT = 2 * k720;
      const refR = n * 0.35;
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          if (sID[p] >= 3) continue;
          let dirX = mx, dirY = my, v: number;
          if (burst) {
            const ddx = heroBox.cx - x, ddy = heroBox.cy - y, dl = Math.hypot(ddx, ddy) || 1;
            dirX = ddx / dl;
            dirY = ddy / dl;
            v = Math.atan2(ddy, ddx) * refR;
          } else v = -x * my + y * mx;
          const li = Math.floor(v / lane);
          const h1 = hash(li, 17, seed);
          if (h1 > 0.58) continue;
          const fv = v / lane - li;
          const thick = 0.2 + 0.4 * hash(li, 29, seed);
          const cov = clamp01((thick / 2 - Math.abs(fv - 0.5)) * lane + 0.5);
          if (cov <= 0) continue;
          const Lm = L * (0.3 + 0.7 * hash(li, 31, seed));
          let hit = -1, at = 0;
          for (let t = stepT; t < Lm; t += stepT) {
            const qx = Math.round(x + dirX * t), qy = Math.round(y + dirY * t);
            if (qx < 0 || qy < 0 || qx >= n || qy >= n) break;
            const q = qy * n + qx;
            if (sID[q] >= 3) {
              hit = q;
              at = t;
              break;
            }
          }
          if (hit < 0) continue;
          const fade = (1 - at / Lm) ** 1.2;
          const kind = hash(li, 37, seed);
          const al = fade * cov * lineAl;
          if (kind < 0.4) blend(p, deep, al);
          else if (kind < 0.62) blend(p, cream, al * 0.85);
          else blend(p, [IR[hit], IG[hit], IB[hit]], al);
        }
      // The things themselves stay on top of their own echoes.
      for (let p = 0; p < N; p++)
        if (sID[p] >= 3) {
          OR[p] = IR[p];
          OG[p] = IG[p];
          OB[p] = IB[p];
        }
      notes.push(`${copies} echoes of each moving thing with speed lines`);
    }
    await pause();

    // ---------------------------------------------------------------- handling before the line
    if (a.handling === 'glaze') {
      blur(OR, n, 1, 1);
      blur(OG, n, 1, 1);
      blur(OB, n, 1, 1);
    } else if (a.handling === 'divisionist') {
      const gap = 4.2 * k720;
      const len = 10 * k720, wid = 2.8 * k720;
      const IR = OR.slice(), IG = OG.slice(), IB = OB.slice();
      for (let gy = 0; gy < n; gy += gap)
        for (let gx = 0; gx < n; gx += gap) {
          const cx = gx + random() * gap, cy = gy + random() * gap;
          const c = Math.min(n - 1, Math.floor(cy)) * n + Math.min(n - 1, Math.floor(cx));
          let ang: number;
          if (futurism) ang = burst ? Math.atan2(cy - heroBox.cy, cx - heroBox.cx) : Math.atan2(my, mx);
          else if (cubism && tri) ang = (hash(tri[c], 23, seed) - 0.5) * 2.4 + 0.6;
          else if (sID[c] > 0 && Math.hypot(sNX[c], sNY[c]) > 0.25) ang = Math.atan2(sNY[c], sNX[c]) + Math.PI / 2;
          else ang = -0.35;
          ang += (random() - 0.5) * 0.5;
          const j = Math.floor(random() * mids.length);
          const push = P.follow ? 0.1 : 0.2;
          const lift = (random() - 0.5) * 0.08;
          const r = clamp01(IR[c] + (mids[j][0] - IR[c]) * push + lift);
          const g = clamp01(IG[c] + (mids[j][1] - IG[c]) * push + lift);
          const b = clamp01(IB[c] + (mids[j][2] - IB[c]) * push + lift);
          stamp(cx, cy, ang, len * (0.7 + random() * 0.6), wid, (p, cover) => blend(p, [r, g, b], cover * (cubism ? 0.6 : 0.85)));
        }
    }

    function stamp(cx: number, cy: number, ang: number, length: number, width: number, visit: (p: number, cover: number) => void) {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const rad = length / 2 + width;
      const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(n - 1, Math.ceil(cx + rad));
      const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(n - 1, Math.ceil(cy + rad));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          const along = Math.abs(dx * ca + dy * sa), across = Math.abs(-dx * sa + dy * ca);
          const cover = clamp01(length / 2 - along + 0.5) * clamp01(width / 2 - across + 0.5);
          if (cover > 0) visit(y * n + x, cover);
        }
    }
    function drawLine(x0: number, y0: number, x1: number, y1: number, width: number, al: number, c: RGB) {
      const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
      const xa = Math.max(0, Math.floor(Math.min(x0, x1) - width - 1)), xb = Math.min(n - 1, Math.ceil(Math.max(x0, x1) + width + 1));
      const ya = Math.max(0, Math.floor(Math.min(y0, y1) - width - 1)), yb = Math.min(n - 1, Math.ceil(Math.max(y0, y1) + width + 1));
      const len = Math.sqrt(l2);
      for (let y = ya; y <= yb; y++)
        for (let x = xa; x <= xb; x++) {
          const qx = x + 0.5 - x0, qy = y + 0.5 - y0;
          // Distance to the infinite line first: cheap rejection for long diagonals.
          const across = Math.abs(qx * dy - qy * dx) / len;
          if (across > width / 2 + 1) continue;
          const t = clamp01((qx * dx + qy * dy) / l2);
          const ex = qx - t * dx, ey = qy - t * dy;
          const cover = clamp01(width / 2 + 0.5 - Math.sqrt(ex * ex + ey * ey));
          if (cover <= 0) continue;
          const grain = 0.5 + 0.5 * hash(x, y, seed + 51);
          blend(y * n + x, c, al * cover * grain);
        }
    }
    await pause();

    if (sheetKeep)
      for (let p = 0; p < N; p++) {
        const k = sheetKeep[p];
        if (k >= 1) continue;
        OR[p] = mix(paper[0], OR[p], k);
        OG[p] = mix(paper[1], OG[p], k);
        OB[p] = mix(paper[2], OB[p], k);
      }

    // ---------------------------------------------------------------- line
    if (a.line > 0.05) {
      if (!surreal && tri) {
        const seen = new Set<number>();
        const strong: [number, number][] = [];
        const width = mix(0.9, 3.4, a.line) * k720, al = mix(0.3, 0.92, a.line);
        const T = tris.length / 3;
        for (let t = 0; t < T; t++)
          for (let e = 0; e < 3; e++) {
            let i = tris[t * 3 + e], j = tris[t * 3 + ((e + 1) % 3)];
            if (i > j) [i, j] = [j, i];
            const key = i * 65536 + j;
            if (seen.has(key)) continue;
            seen.add(key);
            let sum = 0;
            for (let s = 0; s < 7; s++) {
              const f = (s + 0.5) / 7;
              const x = Math.min(n - 1, Math.max(0, Math.round(px[i] + (px[j] - px[i]) * f)));
              const y = Math.min(n - 1, Math.max(0, Math.round(py[i] + (py[j] - py[i]) * f)));
              let e2 = 0;
              for (let oy = -1; oy <= 1; oy++)
                for (let ox = -1; ox <= 1; ox++) {
                  const xx = Math.min(n - 1, Math.max(0, x + ox)), yy = Math.min(n - 1, Math.max(0, y + oy));
                  e2 = Math.max(e2, E[yy * n + xx]);
                }
              sum += e2;
            }
            const mean = sum / 7;
            const dx = px[j] - px[i], dy = py[j] - py[i], dl = Math.hypot(dx, dy) || 1;
            if (mean > 0.62) {
              const over = (cubism ? mix(4, 16, random()) : mix(2, 8, random())) * mix(0.6, 1.4, mood.energy) * k720;
              const ux = dx / dl, uy = dy / dl;
              strong.push([i, j]);
              drawLine(px[i] - ux * over, py[i] - uy * over, px[j] + ux * over, py[j] + uy * over, width * mix(0.7, 1.3, random()), al * mix(0.65, 1, random()), deep);
            } else if (cubism && random() < 0.06 + 0.1 * a.line) {
              const light = random() < 0.5;
              drawLine(px[i], py[i], px[j], py[j], Math.max(0.8, width * 0.5), light ? 0.3 : 0.28, light ? cream : deep);
            }
          }
        if (cubism && strong.length) {
          // Passage: a few edges run on far past where they began.
          const runs = Math.round(mix(3, 12, a.line));
          for (let k = 0; k < runs; k++) {
            const [i, j] = strong[Math.floor(random() * strong.length)];
            const dx = px[j] - px[i], dy = py[j] - py[i], dl = Math.hypot(dx, dy) || 1;
            const ext = mix(2, 6, random()) * dl;
            drawLine(px[i] - (dx / dl) * ext, py[i] - (dy / dl) * ext, px[j] + (dx / dl) * ext, py[j] + (dy / dl) * ext, Math.max(0.8, width * 0.5), al * 0.35, deep);
          }
        }
        // The contour of each thing, drawn in pieces and lost again (passage).
        {
          const reach = Math.max(1, Math.round(width * 0.6));
          const al2 = al * (cubism ? 0.8 : 0.9);
          for (let y = reach; y < n - reach; y++)
            for (let x = reach; x < n - reach; x++) {
              const p = y * n + x;
              const id = sID[p];
              if (id < 3) continue;
              let edge = false;
              for (let d = 1; d <= reach && !edge; d++)
                edge = sID[p + d] !== id || sID[p - d] !== id || sID[p + d * n] !== id || sID[p - d * n] !== id;
              if (!edge) continue;
              const keep = cubism ? smooth(0.38, 0.52, noise(x / (28 * k720), y / (28 * k720), seed + 45 + id)) : 1;
              if (keep > 0) blend(p, deep, al2 * keep * (0.6 + 0.4 * hash(x, y, seed + 47)));
            }
        }
        if (cubism) {
          // A scaffold of long straight strokes, mostly upright, binding the planes into one structure.
          const bars = Math.round(mix(5, 14, a.line) * mix(0.8, 1.2, mood.density));
          for (let k = 0; k < bars; k++) {
            const ox = heroBox.cx + (random() + random() - 1) * heroSize * 0.7, oy = heroBox.cy + (random() + random() - 1) * heroSize * 0.6;
            const kind = random();
            const ang = kind < 0.45 ? Math.PI / 2 + (random() - 0.5) * 0.12 : kind < 0.65 ? (random() - 0.5) * 0.12 : (random() < 0.5 ? 1 : -1) * (Math.PI / 4 + (random() - 0.5) * 0.3);
            const half = n * mix(0.1, 0.32, random());
            const ux = Math.cos(ang), uy = Math.sin(ang);
            const w = Math.max(0.9, width * mix(0.5, 1, random()));
            drawLine(ox - ux * half, oy - uy * half, ox + ux * half, oy + uy * half, w, al * mix(0.45, 0.8, random()), deep);
            // A pale band rides beside each dark stroke, as if lit from one side.
            const side = 2.2 * k720 + w;
            drawLine(ox - ux * half - uy * side, oy - uy * half + ux * side, ox + ux * half - uy * side, oy + uy * half + ux * side, w * 1.6, 0.22, cream);
          }
        }
        notes.push(`${strong.length} drawn edges`);
      } else if (surreal) {
        const al = mix(0.15, 0.6, a.line);
        for (let y = 0; y < n - 1; y++)
          for (let x = 0; x < n - 1; x++) {
            const p = y * n + x;
            const i0 = sID[p], i1 = sID[p + 1], i2 = sID[p + n];
            if ((i0 !== i1 && Math.max(i0, i1) >= 2) || (i0 !== i2 && Math.max(i0, i2) >= 2)) blend(p, deep, al * (0.6 + 0.4 * hash(x, y, seed + 61)));
          }
      }
    }
    await pause();

    // ---------------------------------------------------------------- handling after the line
    if (a.handling === 'dashes') {
      const count = Math.round(mix(3500, 9000, mood.density) * k720 * k720);
      for (let k = 0; k < count; k++) {
        const cx = random() * n, cy = random() * n;
        const vertical = random() < 0.15;
        const ang = (vertical ? Math.PI / 2 : 0) + (random() - 0.5) * 0.5;
        const light = random() < 0.55;
        const al = light ? 0.2 : 0.16;
        stamp(cx, cy, ang, (3 + random() * 4) * k720, 1.5 * k720, (p, cover) => blend(p, light ? cream : deep, al * cover * (sheetKeep ? sheetKeep[p] : 1)));
      }
      // Sand in the paint.
      for (let p = 0; p < N; p++) {
        const h = hash(p % n, (p / n) | 0, seed + 71);
        if (h > 0.985) blend(p, cream, 0.25);
        else if (h < 0.015) blend(p, deep, 0.3);
      }
    } else if (a.handling === 'charcoal') {
      // Rubbed tone, then hatching laid in patches, each plane hatched its own way.
      const step = 5.5 * k720;
      const baseAng = futurism && !burst ? Math.atan2(my, mx) : Math.PI / 4;
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          const v = lum(OR[p], OG[p], OB[p]);
          const dark = clamp01((0.8 - v) / 0.7);
          let ang = baseAng;
          if (cubism && tri) ang = hash(tri[p], 29, seed) * Math.PI;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          const wob = (noise(x / (30 * k720), y / (30 * k720), seed + 81) - 0.5) * 2.5;
          let u = (x * ca + y * sa + wob) / step, w = (-x * sa + y * ca + wob) / (step * 1.15);
          if (futurism && burst) {
            // Hatching that radiates from the subject.
            u = (Math.atan2(y - heroBox.cy, x - heroBox.cx) * n * 0.3 + wob) / step;
            w = Math.hypot(x - heroBox.cx, y - heroBox.cy) / (step * 1.15);
          }
          const f1 = u - Math.floor(u), f2 = w - Math.floor(w);
          const patch = smooth(0.3, 0.55, noise(x / (22 * k720), y / (22 * k720), seed + 85));
          let k = 0;
          if (dark > 0.4 && f1 < (dark - 0.4) * 1.1) k = 0.72 * (0.35 + 0.65 * patch);
          if (dark > 0.72 && f2 < (dark - 0.72) * 1.6) k = Math.max(k, 0.82);
          const smudge = dark * dark * 0.5 * (0.7 + 0.3 * noise(x / (40 * k720), y / (40 * k720), seed + 87));
          const grain = 0.75 + 0.25 * hash(x, y, seed + 83);
          const wash = 0.5;
          const r = mix(paper[0], OR[p], wash), g = mix(paper[1], OG[p], wash), b = mix(paper[2], OB[p], wash);
          const ink = clamp01((k + smudge) * grain);
          OR[p] = mix(r, deep[0] * 0.8, ink);
          OG[p] = mix(g, deep[1] * 0.8, ink);
          OB[p] = mix(b, deep[2] * 0.8, ink);
        }
    }
    await pause();

    // ---------------------------------------------------------------- support
    const wall = tint(P.wall);
    if (cubism || a.support === 'oval') {
      // Analytic pictures dissolve toward their edges.
      const vcx = mix(n / 2, heroBox.cx, 0.4), vcy = mix(n / 2, heroBox.cy, 0.4);
      const fall = cubism ? 0.34 : 0.18;
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          const r = Math.hypot(x - vcx, y - vcy) / (n * 0.72);
          const k = 1 - fall * smooth(0.45, 1.05, r) * (sheetKeep ? sheetKeep[p] : 1);
          OR[p] *= k;
          OG[p] *= k;
          OB[p] *= k;
        }
    }
    if (a.support === 'linen') {
      const pitch = 2.6 * k720;
      for (let y = 0, p = 0; y < n; y++) {
        const slubY = (hash(Math.floor(y / pitch), 7, seed) - 0.5) * 0.05;
        for (let x = 0; x < n; x++, p++) {
          const slubX = (hash(Math.floor(x / pitch), 9, seed) - 0.5) * 0.05;
          const weave = Math.sin((x / pitch) * Math.PI) * Math.sin((y / pitch) * Math.PI);
          const k = 1 + weave * 0.055 + slubX + slubY + (hash(x, y, seed + 91) - 0.5) * 0.03;
          OR[p] *= k;
          OG[p] *= k;
          OB[p] *= k;
        }
      }
    } else if (a.support === 'panel') {
      const cell = mix(14, 42, a.planes) * k720;
      const crack = 0.18 + 0.55 * mood.wear;
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          // Craquelure: the gap between the two nearest cell points.
          const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
          let f1 = Infinity, f2 = Infinity;
          for (let j = -1; j <= 1; j++)
            for (let i = -1; i <= 1; i++) {
              const cx = (gx + i + hash(gx + i, gy + j, seed + 93)) * cell, cy = (gy + j + hash(gx + i, gy + j, seed + 95)) * cell;
              const d = Math.hypot(x - cx, y - cy);
              if (d < f1) {
                f2 = f1;
                f1 = d;
              } else if (d < f2) f2 = d;
            }
          const line = (1 - smooth(0, 0.9 * k720, f2 - f1)) * smooth(0.3, 0.6, noise(x / (25 * k720), y / (25 * k720), seed + 96));
          const k = 1 - line * crack * 0.4;
          OR[p] = OR[p] * k * 0.98;
          OG[p] = OG[p] * k * 0.95;
          OB[p] = OB[p] * k * 0.84;
        }
    } else if (a.support === 'oval') {
      const rx = n * 0.44, ry = n * 0.485, ocx = n / 2, ocy = n / 2;
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          const d = Math.hypot((x - ocx) / rx, (y - ocy) / ry);
          const edge = (d - 1) * Math.min(rx, ry);
          if (edge < -1.5) {
            const k = 1 - 0.28 * smooth(0.7, 1, d);
            OR[p] *= k;
            OG[p] *= k;
            OB[p] *= k;
            continue;
          }
          const ds = Math.hypot((x - ocx - 7 * k720) / rx, (y - ocy - 9 * k720) / ry);
          const shade = 1 - 0.3 * (1 - smooth(1, 1.06, ds));
          const grain = 1 + (hash(x, y, seed + 97) - 0.5) * 0.04;
          const wr = wall[0] * shade * grain, wg = wall[1] * shade * grain, wb = wall[2] * shade * grain;
          const t = clamp01((edge + 1.5) / 2);
          const rim = 1 - clamp01(Math.abs(edge - 0.2) / 1.2);
          OR[p] = mix(mix(OR[p], wr, t), deep[0], rim * 0.7);
          OG[p] = mix(mix(OG[p], wg, t), deep[1], rim * 0.7);
          OB[p] = mix(mix(OB[p], wb, t), deep[2], rim * 0.7);
        }
    } else if (a.support === 'sheet') {
      for (let y = 0, p = 0; y < n; y++)
        for (let x = 0; x < n; x++, p++) {
          const grain = 1 + (hash(x, y, seed + 101) - 0.5) * 0.06 + (noise(x / 3, y / 3, seed + 103) - 0.5) * 0.04;
          OR[p] *= grain;
          OG[p] *= grain;
          OB[p] *= grain;
        }
    }
    // Age: a little dust and yellowing on worn ideas.
    if (mood.wear > 0.45) {
      const dust = (mood.wear - 0.45) * 2;
      for (let p = 0; p < N; p++) {
        if (hash(p % n, (p / n) | 0, seed + 107) > 1 - 0.004 * dust) blend(p, deep, 0.45);
        OB[p] *= 1 - 0.06 * dust;
      }
    }

    const pixels = new Uint8ClampedArray(N * 4);
    for (let p = 0; p < N; p++) {
      pixels[p * 4] = OR[p] * 255;
      pixels[p * 4 + 1] = OG[p] * 255;
      pixels[p * 4 + 2] = OB[p] * 255;
      pixels[p * 4 + 3] = 255;
    }
    notes.unshift(
      `${{ cubism: 'Analytic cubism', futurism: 'Futurist motion', surrealism: 'Surrealist melt' }[a.tradition]} in ${a.palette}, ${a.handling} on ${a.support}`,
    );
    return { pixels, notes };
  },
});
