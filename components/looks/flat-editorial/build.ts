import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

/**
 * Contemporary flat editorial illustration, the grainy vector style of explainer videos and
 * magazine spots. Every surface is redrawn as unoutlined flat shapes: each object is reduced to a
 * few colours, each colour is mapped onto one of eight named six-colour palettes (exact values),
 * and form is given only by a few tone steps of the same colour cut from the plain-lit pass.
 * A grain stipple of small square dots gathers where each tone step turns toward the next darker
 * one, so shading reads as grain rather than gradient. The palette's accent is kept for the hero.
 * The ground and sky become the palette's paper, with an optional flat backdrop device behind the
 * subject, and shadows are redrawn as flat shapes in one of several graphic conventions.
 */

type Lab = [number, number, number];
interface Box { x0: number; y0: number; x1: number; y1: number }

/** The eight palettes of the reference card, exact: bg, surface, ink, sub, accent, accent2. */
const PALETTES = {
  paper: { bg: '#F3EDE2', surface: '#FBF8F2', ink: '#1B1A17', sub: '#6B655B', accent: '#C8402F', accent2: '#2F5D62' },
  poster: { bg: '#FFD23F', surface: '#FFF6D6', ink: '#111111', sub: '#4A4433', accent: '#FF5A36', accent2: '#14213D' },
  ink: { bg: '#121417', surface: '#1E2226', ink: '#F2EFE8', sub: '#A39E93', accent: '#F2B33D', accent2: '#5FB3A1' },
  navy: { bg: '#0D1B2A', surface: '#16293D', ink: '#EEF3F6', sub: '#8FA3B3', accent: '#5CC8E0', accent2: '#F2A93B' },
  bauhaus: { bg: '#EFE9DD', surface: '#FFFFFF', ink: '#111111', sub: '#555555', accent: '#D62828', accent2: '#1D4E89' },
  snow: { bg: '#E9EEF0', surface: '#FFFFFF', ink: '#1F2A30', sub: '#5E6B72', accent: '#D9482B', accent2: '#3E7C8C' },
  wood: { bg: '#EDE3D1', surface: '#F7F1E6', ink: '#2B2622', sub: '#7A6E62', accent: '#C4552D', accent2: '#3F5B4B' },
  chalk: { bg: '#23302B', surface: '#2E3D37', ink: '#F1EFE6', sub: '#A9B3AA', accent: '#F4D35E', accent2: '#E87D5A' },
} as const;

/** The flat device behind the subject: which palette colour, and how far it is mixed into the paper. */
const DEVICE: Record<keyof typeof PALETTES, ['surface' | 'sub' | 'accent2', number]> = {
  paper: ['accent2', 0.2], poster: ['surface', 1], ink: ['accent2', 0.15], navy: ['sub', 0.17],
  bauhaus: ['accent2', 0.16], snow: ['accent2', 0.2], wood: ['accent2', 0.2], chalk: ['sub', 0.17],
};

const SHAPES = {
  crisp: { round: 0, tone: 1.2, minArea: 24, bias: 0 },
  softened: { round: 2, tone: 2.4, minArea: 40, bias: 0.06 },
  rounded: { round: 4.2, tone: 4, minArea: 90, bias: 0.1 },
  pebble: { round: 7.5, tone: 6.5, minArea: 220, bias: 0.12 },
} as const;

/** Relative tone steps kept in the colour tables: three darker, three lighter. */
const STEPS = 3;
const SPAN = STEPS * 2 + 1;

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

// ---- colour ------------------------------------------------------------------------------------
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toDisplay = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const LINEAR = new Float32Array(256).map((_, index) => toLinear(index / 255));

function labOfLinear(r: number, g: number, b: number): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const labOf = (hex: string): Lab =>
  labOfLinear(LINEAR[parseInt(hex.slice(1, 3), 16)], LINEAR[parseInt(hex.slice(3, 5), 16)], LINEAR[parseInt(hex.slice(5, 7), 16)]);
function displayOf([L, a, b]: Lab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const out = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return [0, 1, 2].map((c) => Math.round(clamp01(toDisplay(clamp01(out[c]))) * 255)) as [number, number, number];
}
const mixLab = (from: Lab, to: Lab, t: number): Lab => [mix(from[0], to[0], t), mix(from[1], to[1], t), mix(from[2], to[2], t)];
const chroma = (c: Lab) => Math.hypot(c[1], c[2]);

// ---- noise -------------------------------------------------------------------------------------
function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 1597334677) ^ Math.imul(y | 0, 3812015801) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(seed: number) {
  return (x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
    return a + (b - a) * sx + (c - a + (d - c - b + a) * sx) * sy;
  };
}

// ---- fields ------------------------------------------------------------------------------------
/** Separable box blur, linear in the image size for any radius. */
function boxBlur(source: Float32Array, w: number, h: number, radius: number): Float32Array {
  const r = Math.max(1, Math.round(radius));
  const span = r * 2 + 1;
  const temp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += source[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      temp[row + x] = sum / span;
      sum += source[row + Math.min(w - 1, x + r + 1)] - source[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += temp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / span;
      sum += temp[Math.min(h - 1, y + r + 1) * w + x] - temp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}
/** Two box passes, near enough to a gaussian that thresholded shapes come out round. */
const soften = (source: Float32Array, w: number, h: number, radius: number) =>
  radius < 0.6 ? source.slice() : boxBlur(boxBlur(source, w, h, radius * 0.72), w, h, radius * 0.72);

/** Blur `values` inside one identity only, so light never leaks between objects. */
function regionBlur(values: Float32Array, ids: Uint8Array, member: number, box: Box, size: number, radius: number, out: Float32Array) {
  if (box.x1 < box.x0) return;
  const pad = Math.ceil(radius * 2) + 2;
  const x0 = Math.max(0, box.x0 - pad), y0 = Math.max(0, box.y0 - pad);
  const x1 = Math.min(size - 1, box.x1 + pad), y1 = Math.min(size - 1, box.y1 + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const v = new Float32Array(w * h), m = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y0 + y) * size + x0 + x;
      if (ids[p] !== member) continue;
      v[y * w + x] = values[p];
      m[y * w + x] = 1;
    }
  const bv = soften(v, w, h, radius), bm = soften(m, w, h, radius);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y0 + y) * size + x0 + x;
      if (ids[p] === member) out[p] = bv[y * w + x] / Math.max(1e-4, bm[y * w + x]);
    }
}

/** K-means in OKLab, seeded, merging centroids that land close and folding in tiny clusters. */
function cluster(samples: Float32Array, n: number, k: number, random: () => number, mergeBelow: number): { lab: Lab; weight: number }[] {
  if (n === 0) return [{ lab: [0.7, 0, 0], weight: 1 }];
  const at = (i: number): Lab => [samples[i * 3], samples[i * 3 + 1], samples[i * 3 + 2]];
  const centres: Lab[] = [at(Math.floor(random() * n))];
  const nearest = new Float32Array(n).fill(Infinity);
  while (centres.length < k) {
    const c = centres[centres.length - 1];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const d = (samples[i * 3] - c[0]) ** 2 + (samples[i * 3 + 1] - c[1]) ** 2 + (samples[i * 3 + 2] - c[2]) ** 2;
      if (d < nearest[i]) nearest[i] = d;
      total += nearest[i];
    }
    if (total < 1e-6) break;
    let pick = random() * total, chosen = n - 1;
    for (let i = 0; i < n; i++) {
      pick -= nearest[i];
      if (pick <= 0) { chosen = i; break; }
    }
    centres.push(at(chosen));
  }
  let weights = new Float32Array(centres.length);
  const sums = new Float32Array(centres.length * 3);
  for (let round = 0; round < 8; round++) {
    sums.fill(0);
    weights = new Float32Array(centres.length);
    for (let i = 0; i < n; i++) {
      let best = 0, bestD = Infinity;
      for (let j = 0; j < centres.length; j++) {
        const c = centres[j];
        const d = (samples[i * 3] - c[0]) ** 2 + (samples[i * 3 + 1] - c[1]) ** 2 + (samples[i * 3 + 2] - c[2]) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      }
      sums[best * 3] += samples[i * 3];
      sums[best * 3 + 1] += samples[i * 3 + 1];
      sums[best * 3 + 2] += samples[i * 3 + 2];
      weights[best]++;
    }
    for (let j = 0; j < centres.length; j++)
      if (weights[j] > 0) centres[j] = [sums[j * 3] / weights[j], sums[j * 3 + 1] / weights[j], sums[j * 3 + 2] / weights[j]];
  }
  const found = centres.map((lab, j) => ({ lab, weight: weights[j] })).filter((c) => c.weight > 0);
  for (;;) {
    if (found.length < 2) break;
    let a = -1, b = -1, closest = Infinity;
    for (let i = 0; i < found.length; i++)
      for (let j = i + 1; j < found.length; j++) {
        const d = Math.hypot(found[i].lab[0] - found[j].lab[0], found[i].lab[1] - found[j].lab[1], found[i].lab[2] - found[j].lab[2]);
        if (d < closest) { closest = d; a = i; b = j; }
      }
    const tiny = found.findIndex((c) => c.weight < n * 0.03);
    if (closest >= mergeBelow && tiny < 0) break;
    if (closest >= mergeBelow) {
      a = tiny;
      closest = Infinity;
      for (let j = 0; j < found.length; j++) {
        if (j === a) continue;
        const d = Math.hypot(found[a].lab[0] - found[j].lab[0], found[a].lab[1] - found[j].lab[1], found[a].lab[2] - found[j].lab[2]);
        if (d < closest) { closest = d; b = j; }
      }
    }
    const wa = found[a].weight, wb = found[b].weight, w = wa + wb;
    found[a] = { lab: mixLab(found[a].lab, found[b].lab, wb / w), weight: w };
    found.splice(b, 1);
  }
  return found;
}

/** A 3×3 majority vote on the labels, never crossing from one object into another. */
function majority(label: Int32Array, ids: Uint8Array, size: number) {
  const out = label.slice();
  const keys = new Int32Array(9), tallies = new Int32Array(9);
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      const p = y * size + x;
      const own = ids[p];
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const q = p + dy * size + dx;
          if (ids[q] !== own) continue;
          const key = label[q];
          let found = -1;
          for (let i = 0; i < n; i++) if (keys[i] === key) { found = i; break; }
          if (found < 0) { keys[n] = key; tallies[n] = 1; n++; } else tallies[found]++;
        }
      let best = label[p], bestCount = 0;
      for (let i = 0; i < n; i++) if (tallies[i] > bestCount) { bestCount = tallies[i]; best = keys[i]; }
      if (bestCount >= 5) out[p] = best;
    }
  label.set(out);
}

/** Folds every connected patch smaller than `minArea` into the label it borders most. */
function mergeSmall(label: Int32Array, ids: Uint8Array, size: number, minArea: number) {
  const count = size * size;
  const seen = new Uint8Array(count);
  const stack = new Int32Array(count);
  const patch = new Int32Array(count);
  const tally = new Map<number, number>();
  for (let start = 0; start < count; start++) {
    if (seen[start]) continue;
    const own = label[start], region = ids[start];
    let top = 0, n = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top) {
      const p = stack[--top];
      patch[n++] = p;
      const x = p % size;
      const near = [x > 0 ? p - 1 : -1, x < size - 1 ? p + 1 : -1, p - size, p + size];
      for (const q of near) {
        if (q < 0 || q >= count || seen[q] || label[q] !== own) continue;
        seen[q] = 1;
        stack[top++] = q;
      }
    }
    if (n >= minArea) continue;
    tally.clear();
    for (let i = 0; i < n; i++) {
      const p = patch[i], x = p % size;
      const near = [x > 0 ? p - 1 : -1, x < size - 1 ? p + 1 : -1, p - size, p + size];
      for (const q of near) {
        if (q < 0 || q >= count || label[q] === own || ids[q] !== region) continue;
        tally.set(label[q], (tally.get(label[q]) ?? 0) + 1);
      }
    }
    let best = own, bestCount = 0;
    for (const [key, value] of tally) if (value > bestCount) { bestCount = value; best = key; }
    if (best !== own) for (let i = 0; i < n; i++) label[patch[i]] = best;
  }
}

// ---- shapes ------------------------------------------------------------------------------------
const roundBox = (x: number, y: number, hw: number, hh: number, r: number) => {
  const qx = Math.abs(x) - hw + r, qy = Math.abs(y) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const capsule = (x: number, y: number, half: number, r: number) => Math.hypot(Math.max(Math.abs(x) - half, 0), y) - r;

export default defineLook({
  questions: {
    palette: choice('Which named palette is the illustration printed in?', {
      paper: 'Paper: warm cream ground, near-black ink, warm grey, a brick-red accent and deep teal. Essays, history, reading, explaining an idea.',
      poster: 'Poster yellow: a loud yellow ground, black ink, a hot orange-red accent and dark navy. Opinions, conflict, one big claim.',
      ink: 'Deep ink: a near-black ground with off-white, stone grey, a saffron accent and sea green. Technology, night, serious subjects.',
      navy: 'Navy: a flat dark navy ground with pale grey-white, slate, a bright cyan accent and amber. Products, data, phones and devices.',
      bauhaus: 'Bauhaus: off-white and pure white, black, mid grey, a primary red accent and cobalt blue. Design, structure, geometry, process.',
      snow: 'Snow: pale icy grey and white, blue-black, slate, a vermilion accent and steel teal. Winter, medicine, cleanliness, the lab.',
      wood: 'Warm wood: oatmeal and linen, dark brown, taupe, a terracotta accent and pine green. Home, kitchen, crafts, everyday life.',
      chalk: 'Chalkboard: dark green slate, chalk white, sage grey, a chalk-yellow accent and coral. Classrooms, working things out, formulas.',
    }),
    tones: score('How many tone steps model each form?', [
      'Two: one light and one shadow',
      'Three: shadow, base and light',
      'Four, with a deep core shadow',
      'Five closely stepped tones',
    ]),
    grain: score('How much grain stipple textures the shapes?', [
      'Clean vector, almost no grain',
      'A light dusting in the shadows',
      'Visible grain gathering in every shadow',
      'Heavy grainy texture like a risograph',
    ]),
    shapes: choice('How are the shapes drawn?', {
      crisp: 'Exact silhouettes with crisp corners, like precise vector tracing.',
      softened: 'Slightly softened corners, the usual polished vector illustration.',
      rounded: 'Simplified to rounded geometry: friendly pill and pebble corners, small details merged.',
      pebble: 'Strongly simplified soft blobs: chunky, toy-like shapes with the small details dissolved.',
    }),
    backdrop: choice('What sits behind the subject?', {
      plain: 'Nothing: the flat paper colour alone, quiet and editorial.',
      halo: 'A big soft organic blob behind the subject, shaded with grain: the classic spot illustration.',
      sun: 'A large flat disc of sun or moon with a few pill-shaped clouds.',
      horizon: 'Rolling flat hills behind the subject: a simple layered landscape.',
      confetti: 'Small floating geometric symbols around the subject: dots, rings, crosses, squiggles and sparkles.',
      panel: 'A rounded card panel framing the subject, like an app screen or article header.',
    }),
    shadow: choice('How do things cast shadows?', {
      none: 'No cast shadows: the shapes sit flat on the ground.',
      cast: 'The real cast shadows, redrawn as one flat darker shape.',
      offset: 'A hard flat drop shadow offset away from the light, like a sticker.',
      long: 'A long flat diagonal shadow streaming away, retro flat design.',
      pool: 'A small flat oval pool beneath each object, like an icon.',
      stippled: 'Shadows made only of dense grain dots, with no flat fill.',
    }),
    highlight: choice('How does light catch the shapes?', {
      none: 'No highlights beyond the tone steps.',
      rim: 'A thin bright sliver along every edge that faces the light.',
      glint: 'Small bright highlight shapes where curved surfaces catch the light, glossy.',
      sheen: 'Two diagonal light bars across the lit faces, like glass or plastic.',
    }),
    detail: score('How many colours does each object keep?', [
      'One flat colour per object, a pure silhouette',
      'Two or three main colours',
      'Every main part in its own colour',
    ]),
  },

  async apply(capture, answers, context, signal) {
    const { size, color, normal, depth, identity, diffuse } = capture;
    const count = size * size;
    const unit = size / 720;
    const mood = context.mood;
    const scheme = PALETTES[answers.palette];
    const shape = SHAPES[answers.shapes];
    const seed = context.seed >>> 0;
    const random = seeded((seed ^ 0x6a09e667) >>> 0);
    const ragged = valueNoise((seed * 31 + 7) | 0);
    const tick = async () => {
      signal.throwIfAborted();
      await pause();
      signal.throwIfAborted();
    };
    const grain = clamp01(answers.grain) * mix(0.85, 1.25, mood.wear);
    const steps = 2 + Math.round(clamp01(answers.tones) * 3);
    const detail = clamp01(answers.detail);

    const bg = labOf(scheme.bg), surface = labOf(scheme.surface), ink = labOf(scheme.ink);
    const sub = labOf(scheme.sub), accent = labOf(scheme.accent), accent2 = labOf(scheme.accent2);
    const dark = bg[0] < 0.5;
    const tint = (c: Lab, t: number) => mixLab(bg, c, t);

    // ---- read the capture -------------------------------------------------------------------
    const id = new Uint8Array(count);
    const raw = new Float32Array(count);
    const far = new Float32Array(count);
    const nX = new Float32Array(count), nY = new Float32Array(count), nZ = new Float32Array(count);
    let topId = 0;
    for (let p = 0; p < count; p++) {
      const at = p * 4;
      const v = identity[at];
      id[p] = v;
      if (v > topId) topId = v;
      raw[p] = diffuse[at] * 0.3 + diffuse[at + 1] * 0.59 + diffuse[at + 2] * 0.11;
      far[p] = v === 0 ? 1 : (depth[at] * 65536 + depth[at + 1] * 256 + depth[at + 2]) / 16777216;
      nX[p] = normal[at] / 127.5 - 1;
      nY[p] = normal[at + 1] / 127.5 - 1;
      nZ[p] = normal[at + 2] / 127.5 - 1;
    }
    const isThing = (v: number) => v >= 3;
    const hero = 3;

    // Light, normalised so the well-lit faces of the cast sit at 1.
    const histogram = new Uint32Array(256);
    let castPixels = 0;
    for (let p = 0; p < count; p++) if (isThing(id[p])) { histogram[Math.min(255, Math.round(raw[p]))]++; castPixels++; }
    if (castPixels < 400) for (let p = 0; p < count; p++) if (id[p] > 0) histogram[Math.min(255, Math.round(raw[p]))]++;
    let total = 0;
    for (let v = 0; v < 256; v++) total += histogram[v];
    let bright = 255;
    for (let v = 0, seen = 0; v < 256; v++) {
      seen += histogram[v];
      if (seen >= total * 0.92) { bright = Math.max(8, v); break; }
    }
    const lit = new Float32Array(count);
    for (let p = 0; p < count; p++) lit[p] = Math.min(1.3, raw[p] / bright);

    // Key light in view space (y up) and in the picture (y down).
    let [lx, ly, lz] = capture.light;
    {
      const n = Math.hypot(lx, ly, lz) || 1;
      lx /= n; ly /= n; lz /= n;
    }
    let toLightX = lx, toLightY = ly;
    {
      const n = Math.hypot(toLightX, toLightY);
      if (n < 0.15) { toLightX = -0.6; toLightY = -0.8; } else { toLightX /= n; toLightY /= n; }
    }
    // Shadows fall away from the light and a little downward, onto the ground.
    let fallX = -toLightX, fallY = -toLightY + 0.45;
    {
      const n = Math.hypot(fallX, fallY) || 1;
      fallX /= n; fallY /= n;
    }
    await tick();

    // ---- paint underneath the light: divide colour by plain lighting -----------------------------
    const litSoft = soften(lit, size, size, 2 * unit);
    const linear = [0, 1, 2].map((c) => {
      const plane = new Float32Array(count);
      for (let p = 0; p < count; p++) plane[p] = LINEAR[color[p * 4 + c]];
      return plane;
    });
    const linearSoft = linear.map((plane) => boxBlur(plane, size, size, 1));
    const albedo = new Float32Array(count * 3);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const own = id[p];
        const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1 || id[p - 1] !== own || id[p + 1] !== own || id[p - size] !== own || id[p + size] !== own;
        const source = edge ? linear : linearSoft;
        const light = own === 0 ? 1 : Math.min(1.3, Math.max(0.16, litSoft[p]));
        const lab = labOfLinear(Math.min(1, source[0][p] / light), Math.min(1, source[1][p] / light), Math.min(1, source[2][p] / light));
        albedo[p * 3] = lab[0];
        albedo[p * 3 + 1] = lab[1];
        albedo[p * 3 + 2] = lab[2];
      }
    await tick();

    // ---- each surface reduced to a few colours ---------------------------------------------------
    const present: number[] = [];
    {
      const seen = new Uint32Array(topId + 1);
      for (let p = 0; p < count; p++) seen[id[p]]++;
      for (let v = 0; v <= topId; v++) if (seen[v] > 0) present.push(v);
    }
    interface Cluster { identity: number; lab: Lab; area: number; paint: number; box: Box; main: boolean }
    const clusters: Cluster[] = [];
    const label = new Int32Array(count);
    for (const member of present) {
      const k = member === 0 ? 1 : member === 1 ? 1 + Math.round(detail * 2) : member === 2 ? 1 + Math.round(detail * 3) : 1 + Math.round(detail * 4);
      let n = 0;
      for (let y = 0; y < size; y += 2) for (let x = 0; x < size; x += 2) if (id[y * size + x] === member) n++;
      const samples = new Float32Array(Math.max(1, n) * 3);
      let i = 0;
      for (let y = 0; y < size; y += 2)
        for (let x = 0; x < size; x += 2) {
          const p = y * size + x;
          if (id[p] !== member) continue;
          samples[i * 3] = albedo[p * 3];
          samples[i * 3 + 1] = albedo[p * 3 + 1];
          samples[i * 3 + 2] = albedo[p * 3 + 2];
          i++;
        }
      const found = n ? cluster(samples, n, k, random, 0.05) : [{ lab: [0.7, 0, 0] as Lab, weight: 1 }];
      const from = clusters.length;
      for (const c of found) clusters.push({ identity: member, lab: c.lab, area: 0, paint: 0, box: { x0: size, y0: size, x1: -1, y1: -1 }, main: false });
      for (let p = 0; p < count; p++) {
        if (id[p] !== member) continue;
        let best = from, bestD = Infinity;
        for (let j = from; j < clusters.length; j++) {
          const c = clusters[j].lab;
          const d = (albedo[p * 3] - c[0]) ** 2 + (albedo[p * 3 + 1] - c[1]) ** 2 + (albedo[p * 3 + 2] - c[2]) ** 2;
          if (d < bestD) { bestD = d; best = j; }
        }
        label[p] = best;
      }
    }
    majority(label, id, size);
    majority(label, id, size);
    await tick();
    mergeSmall(label, id, size, Math.round(shape.minArea * unit * unit));
    // Re-measure what survived: area, true mean colour and bounds.
    {
      const sums = new Float64Array(clusters.length * 3);
      for (let p = 0; p < count; p++) {
        const c = clusters[label[p]];
        c.area++;
        sums[label[p] * 3] += albedo[p * 3];
        sums[label[p] * 3 + 1] += albedo[p * 3 + 1];
        sums[label[p] * 3 + 2] += albedo[p * 3 + 2];
      }
      clusters.forEach((c, j) => {
        if (c.area) c.lab = [sums[j * 3] / c.area, sums[j * 3 + 1] / c.area, sums[j * 3 + 2] / c.area];
      });
    }
    await tick();

    // ---- the paints: the palette's six colours and their tints, nothing else ---------------------
    const paints: Lab[] = [bg];
    const add = (lab: Lab) => paints.push(lab) - 1;
    // On a dark ground, colours pulled toward the paper turn to mud, so those tints are light-ground only.
    const general = [
      add(surface), add(ink), add(sub), add(accent2),
      add(mixLab(sub, surface, 0.5)), add(mixLab(accent2, ink, 0.4)), add(mixLab(sub, ink, 0.5)), add(tint(ink, 0.2)), add(tint(sub, 0.4)),
      ...(dark ? [add(mixLab(accent2, ink, 0.65))] : [add(mixLab(accent2, surface, 0.5)), add(tint(accent2, 0.32))]),
    ];
    const ACCENT = add(accent);
    const heroExtra = [ACCENT, add(mixLab(accent, surface, 0.45)), add(mixLab(accent, ink, 0.35))];
    const GHOST = add(tint(sub, 0.42));

    // Where the paper is: the backdrop, or the ground when it is the same colour or there is no sky.
    const area = (member: number) => clusters.filter((c) => c.identity === member).reduce((s, c) => s + c.area, 0);
    const largest = (member: number) =>
      clusters.filter((c) => c.identity === member).reduce<Cluster | null>((best, c) => (!best || c.area > best.area ? c : best), null);
    const backdropShare = area(0) / count;
    const sky = largest(0), floor = largest(1);
    const reference: Lab = backdropShare > 0.02 && sky ? sky.lab : floor ? floor.lab : [0.9, 0, 0.01];
    const paperLike = (c: Cluster) =>
      c.identity === 0 || (c.identity === 1 && Math.hypot(c.lab[0] - reference[0], c.lab[1] - reference[1], c.lab[2] - reference[2]) < 0.07);
    const sourceLight = reference[0] >= 0.55;
    const contrastSource = (L: number) => (sourceLight ? reference[0] - L : L - reference[0]);
    const contrastPaint = (L: number) => (dark ? L - bg[0] : bg[0] - L);
    const gain = Math.abs(bg[0] - ink[0]) / 0.7;
    const confidence = capture.confidence;

    const mainOf = new Map<number, Cluster>();
    for (const member of present) {
      if (member < 2) continue;
      const own = clusters.filter((c) => c.identity === member && c.area > 0);
      if (!own.length) continue;
      const pick = member === hero
        ? own.reduce((best, c) => (c.area * (0.35 + chroma(c.lab) * 5) > best.area * (0.35 + chroma(best.lab) * 5) ? c : best))
        : own.reduce((best, c) => (c.area > best.area ? c : best));
      pick.main = true;
      mainOf.set(member, pick);
    }
    const usedMain = new Map<number, number>();
    const order = [...present.filter(isThing), ...present.filter((v) => v === 2), ...present.filter((v) => v < 2)];
    for (const member of order) {
      const own = clusters.filter((c) => c.identity === member).sort((p, q) => Number(q.main) - Number(p.main) || q.area - p.area);
      const usedHere = new Map<number, number>();
      const ghost = isThing(member) && member !== hero && (confidence?.[member] ?? 1) < 0.45;
      for (const c of own) {
        if (paperLike(c)) { c.paint = 0; continue; }
        if (ghost) { c.paint = GHOST; continue; }
        if (member === hero && c.main) { c.paint = ACCENT; usedHere.set(ACCENT, 1); continue; }
        const candidates = member === hero ? [...general, ...heroExtra.slice(1)] : general;
        let best = candidates[0], bestCost = Infinity;
        const want = gain * contrastSource(c.lab[0]);
        for (const index of candidates) {
          const s = paints[index];
          let cost = (want - contrastPaint(s[0])) ** 2 + 1.3 * ((c.lab[1] * 0.8 - s[1]) ** 2 + (c.lab[2] * 0.8 - s[2]) ** 2);
          const offPaper = Math.abs(s[0] - bg[0]);
          // With no outlines, an object only exists where its fill differs from the paper behind it.
          if (isThing(member) && c.main) cost += 0.14 * (1 - smooth(0.06, 0.2, offPaper));
          if (isThing(member)) cost += 0.03 * (1 - smooth(0.03, 0.1, offPaper));
          if (member === 2 && offPaper < 0.05) cost += 0.01;
          cost += (usedHere.get(index) ?? 0) * 0.006;
          if (c.main) cost += (usedMain.get(index) ?? 0) * 0.008;
          // The set must not take the colour of the objects standing in front of it.
          if (member === 2) cost += (usedMain.get(index) ?? 0) * 0.025;
          if (cost < bestCost) { bestCost = cost; best = index; }
        }
        c.paint = best;
        usedHere.set(best, (usedHere.get(best) ?? 0) + 1);
        if (c.main) usedMain.set(best, (usedMain.get(best) ?? 0) + 1);
      }
    }
    await tick();

    // ---- simplify the silhouettes: round every shape by blurring and re-cutting it ---------------
    if (shape.round > 0 || mood.wear > 0.55) {
      const radius = Math.max(1.2, shape.round) * unit;
      const roughness = smooth(0.45, 1, mood.wear) * 0.22;
      const best = new Float32Array(count).fill(-1);
      const out = label.slice();
      const boxes = clusters.map(() => ({ x0: size, y0: size, x1: -1, y1: -1 }));
      for (let p = 0; p < count; p++) {
        const b = boxes[label[p]], x = p % size, y = (p / size) | 0;
        if (x < b.x0) b.x0 = x;
        if (x > b.x1) b.x1 = x;
        if (y < b.y0) b.y0 = y;
        if (y > b.y1) b.y1 = y;
      }
      for (let j = 0; j < clusters.length; j++) {
        const b = boxes[j];
        if (b.x1 < b.x0) continue;
        const pad = Math.ceil(radius * 2) + 2;
        const x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad);
        const x1 = Math.min(size - 1, b.x1 + pad), y1 = Math.min(size - 1, b.y1 + pad);
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const mask = new Float32Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (label[(y0 + y) * size + x0 + x] === j) mask[y * w + x] = 1;
        const blurred = soften(mask, w, h, radius);
        const bias = isThing(clusters[j].identity) ? shape.bias : 0;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            let v = blurred[y * w + x];
            if (v < 0.02) continue;
            const p = (y0 + y) * size + x0 + x;
            if (label[p] === j) v += bias;
            if (roughness) v += (ragged((x0 + x) / (9 * unit) + j * 17.3, (y0 + y) / (9 * unit) + j * 5.1) - 0.5) * roughness;
            if (v > best[p]) { best[p] = v; out[p] = j; }
          }
        if ((j & 3) === 3) await tick();
      }
      label.set(out);
      for (let p = 0; p < count; p++) id[p] = clusters[label[p]].identity;
    }
    await tick();

    // ---- bounds of each object, after simplification --------------------------------------------
    const boxes: Box[] = [];
    const sumsX = new Float64Array(topId + 1), sumsY = new Float64Array(topId + 1), areas = new Uint32Array(topId + 1);
    for (let v = 0; v <= topId; v++) boxes.push({ x0: size, y0: size, x1: -1, y1: -1 });
    for (let p = 0; p < count; p++) {
      const v = id[p], b = boxes[v], x = p % size, y = (p / size) | 0;
      if (x < b.x0) b.x0 = x;
      if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y;
      if (y > b.y1) b.y1 = y;
      sumsX[v] += x;
      sumsY[v] += y;
      areas[v]++;
    }
    const cast: Box = { x0: size, y0: size, x1: -1, y1: -1 };
    for (let v = 3; v <= topId; v++) {
      if (!areas[v]) continue;
      cast.x0 = Math.min(cast.x0, boxes[v].x0);
      cast.y0 = Math.min(cast.y0, boxes[v].y0);
      cast.x1 = Math.max(cast.x1, boxes[v].x1);
      cast.y1 = Math.max(cast.y1, boxes[v].y1);
    }
    if (cast.x1 < cast.x0) {
      const fallback = areas[2] ? boxes[2] : { x0: size * 0.3, y0: size * 0.3, x1: size * 0.7, y1: size * 0.7 };
      Object.assign(cast, fallback);
    }
    const castW = cast.x1 - cast.x0 + 1, castH = cast.y1 - cast.y0 + 1;
    const castCX = (cast.x0 + cast.x1) / 2, castCY = (cast.y0 + cast.y1) / 2;

    // ---- tone fields: plain light for objects, facing for set and ground ---------------------------
    const toneRadius = shape.tone * unit;
    const thingTone = new Float32Array(count);
    for (let v = 3; v <= topId; v++) if (areas[v]) regionBlur(lit, id, v, boxes[v], size, toneRadius, thingTone);
    const facing = new Float32Array(count);
    for (let p = 0; p < count; p++) facing[p] = 0.3 + 0.75 * Math.max(0, nX[p] * lx + nY[p] * -ly + nZ[p] * lz);
    // Normalise facing so the set's and ground's best-lit faces sit at 1.
    {
      const bins = new Uint32Array(256);
      let n = 0;
      for (let p = 0; p < count; p++) if (id[p] === 1 || id[p] === 2) { bins[Math.min(255, Math.round(facing[p] * 180))]++; n++; }
      let top = 1;
      for (let v = 0, seen = 0; v < 256; v++) {
        seen += bins[v];
        if (seen >= n * 0.9) { top = Math.max(0.2, v / 180); break; }
      }
      for (let p = 0; p < count; p++) facing[p] = Math.min(1.3, facing[p] / top);
    }
    const setTone = new Float32Array(count);
    const shade = new Float32Array(count);
    for (const v of [1, 2]) if (areas[v]) {
      regionBlur(facing, id, v, boxes[v], size, toneRadius, setTone);
      regionBlur(lit, id, v, boxes[v], size, toneRadius * 1.3, shade);
    }
    // Where something blocks the light: the plain-lit pass falls well below what facing predicts.
    const blocked = new Uint8Array(count);
    {
      const ratio = new Float32Array(count);
      let sum = 0, n = 0;
      for (let p = 0; p < count; p++)
        if (id[p] === 1 || id[p] === 2) {
          ratio[p] = shade[p] / Math.max(0.05, setTone[p]);
          sum += ratio[p];
          n++;
        }
      const typical = n ? sum / n : 1;
      for (let p = 0; p < count; p++) if ((id[p] === 1 || id[p] === 2) && ratio[p] < typical * 0.72) blocked[p] = 1;
    }
    await tick();

    // Tone thresholds: even steps, pulled halfway toward the cast's own spread of light.
    const thresholds = (values: Float32Array, members: (v: number) => boolean, n: number) => {
      const bins = new Uint32Array(256);
      let total = 0;
      for (let p = 0; p < count; p++) if (members(id[p])) { bins[Math.min(255, Math.round((values[p] / 1.3) * 255))]++; total++; }
      const cuts: number[] = [];
      for (let i = 1; i < n; i++) {
        const fixed = 0.25 + (0.7 * i) / n;
        let quantile = fixed;
        if (total > 200) {
          const want = (total * i) / n;
          for (let v = 0, seen = 0; v < 256; v++) {
            seen += bins[v];
            if (seen >= want) { quantile = (v / 255) * 1.3; break; }
          }
        }
        cuts.push(mix(fixed, Math.min(1.1, Math.max(0.12, quantile)), 0.4));
      }
      for (let i = 1; i < cuts.length; i++) cuts[i] = Math.max(cuts[i], cuts[i - 1] + 0.06);
      return cuts;
    };
    const thingCuts = thresholds(thingTone, isThing, steps);
    const setSteps = Math.max(2, Math.min(steps, 3));
    const setCuts = thresholds(setTone, (v) => v === 1 || v === 2, setSteps);
    const BASE_STEP = [0, 0, 1, 1, 2, 2];

    // ---- every pixel: which paint, which tone step, how far through it ----------------------------
    const paintOf = new Int16Array(count);
    const rel = new Int8Array(count);
    const frac = new Float32Array(count);
    /** 0 paper, 1 set or ground, 2 an object. */
    const kind = new Uint8Array(count);
    const quantise = (t: number, cuts: number[], n: number, p: number) => {
      let s = 0;
      while (s < cuts.length && t >= cuts[s]) s++;
      const lo = s === 0 ? Math.max(0, cuts[0] - 0.4) : cuts[s - 1];
      const hi = s === cuts.length ? Math.min(1.35, cuts[cuts.length - 1] + 0.4) : cuts[s];
      frac[p] = clamp01((t - lo) / Math.max(0.02, hi - lo));
      return s - BASE_STEP[n];
    };
    for (let p = 0; p < count; p++) {
      const c = clusters[label[p]];
      paintOf[p] = c.paint;
      const v = id[p];
      if (c.paint === 0 && v < 2) { kind[p] = 0; frac[p] = 1; continue; }
      if (isThing(v)) {
        kind[p] = 2;
        rel[p] = quantise(thingTone[p], thingCuts, steps, p);
      } else {
        kind[p] = 1;
        rel[p] = v === 0 ? 0 : quantise(setTone[p], setCuts, setSteps, p);
      }
    }
    await tick();

    // ---- the backdrop device, painted only on the paper ----------------------------------------
    const decor = new Float32Array(count); // extra stipple density from a device's own gradient
    const onPaper = (p: number) => kind[p] === 0;
    const draw = (x0: number, y0: number, x1: number, y1: number, inside: (x: number, y: number) => boolean, paint: number, gradient?: (x: number, y: number) => number) => {
      const ax = Math.max(0, Math.floor(x0)), ay = Math.max(0, Math.floor(y0));
      const bx = Math.min(size - 1, Math.ceil(x1)), by = Math.min(size - 1, Math.ceil(y1));
      for (let y = ay; y <= by; y++)
        for (let x = ax; x <= bx; x++) {
          const p = y * size + x;
          if (!onPaper(p) || !inside(x, y)) continue;
          paintOf[p] = paint;
          decor[p] = gradient ? gradient(x, y) : 0;
        }
    };
    const awayFromLight = (x: number, y: number, cx: number, cy: number, r: number) =>
      clamp01(0.42 + (((x - cx) * fallX + (y - cy) * fallY) / r) * 0.62);
    const lightPaper = !dark;
    const [deviceKey, deviceAmount] = DEVICE[answers.palette];
    const deviceTint = add(deviceKey === 'surface' ? surface : tint(deviceKey === 'sub' ? sub : accent2, deviceAmount));
    const deviceSoft = add(tint(sub, lightPaper ? 0.16 : 0.2));
    const deviceDeep = add(tint(sub, lightPaper ? 0.32 : 0.4));
    let deviceNote = 'plain paper';
    switch (answers.backdrop) {
      case 'halo': {
        const R = Math.min(size * 0.46, Math.max(castW, castH) * 0.56 + 26 * unit);
        const cx = castCX + toLightX * R * 0.08, cy = castCY - castH * 0.06;
        const phase = [random() * 6.28, random() * 6.28, random() * 6.28];
        const radiusAt = (angle: number) => R * (1 + 0.06 * Math.sin(2 * angle + phase[0]) + 0.035 * Math.sin(3 * angle + phase[1]) + 0.02 * Math.sin(5 * angle + phase[2]));
        draw(cx - R * 1.2, cy - R * 1.2, cx + R * 1.2, cy + R * 1.2, (x, y) => Math.hypot(x - cx, y - cy) < radiusAt(Math.atan2(y - cy, x - cx)), deviceTint,
          (x, y) => awayFromLight(x, y, cx, cy, R) ** 2);
        const dots = 2 + Math.round(mood.density * 3);
        for (let i = 0; i < dots; i++) {
          const angle = random() * Math.PI * 2;
          const r = (4 + random() * 7) * unit;
          const ox = cx + Math.cos(angle) * radiusAt(angle) * (1.08 + random() * 0.18), oy = cy + Math.sin(angle) * radiusAt(angle) * (1.08 + random() * 0.18);
          draw(ox - r, oy - r, ox + r, oy + r, (x, y) => Math.hypot(x - ox, y - oy) < r, i % 2 ? deviceDeep : deviceTint);
        }
        deviceNote = 'a grain-shaded blob behind the subject';
        break;
      }
      case 'sun': {
        const R = size * 0.11;
        const cx = Math.min(size - R * 1.3, Math.max(R * 1.3, size * 0.5 + toLightX * size * 0.3));
        const cy = Math.max(R * 1.25, Math.min(cast.y0 + R * 0.4, size * 0.22));
        // A pale moon on a dark ground; a tinted disc on a light one.
        const sun = add(lightPaper ? (deviceKey === 'surface' ? surface : tint(accent2, 0.34)) : tint(ink, 0.7));
        draw(cx - R, cy - R, cx + R, cy + R, (x, y) => Math.hypot(x - cx, y - cy) < R, sun, (x, y) => awayFromLight(x, y, cx, cy, R) ** 2 * 0.9);
        const clouds = 2 + Math.round(random() * 2);
        for (let i = 0; i < clouds; i++) {
          const w = size * (0.07 + random() * 0.07), h = size * (0.018 + random() * 0.01);
          const ox = size * (0.12 + random() * 0.76), oy = size * (0.1 + random() * 0.22);
          draw(ox - w, oy - h, ox + w, oy + h, (x, y) => roundBox(x - ox, y - oy, w, h, h) < 0, i % 2 ? deviceSoft : deviceTint);
        }
        deviceNote = 'a flat disc with pill clouds';
        break;
      }
      case 'horizon': {
        const level = Math.min(size * 0.85, Math.max(size * 0.25, cast.y0 + castH * 0.5));
        const back = add(tint(accent2, lightPaper ? 0.14 : 0.2));
        const front = add(tint(accent2, lightPaper ? 0.3 : 0.36));
        const f1 = 0.8 + random() * 0.8, f2 = 1.3 + random() * 1.2, p1 = random() * 6.28, p2 = random() * 6.28;
        const amp = size * 0.035;
        const backY = (x: number) => level - size * 0.06 + amp * Math.sin((x / size) * Math.PI * 2 * f1 + p1);
        const frontY = (x: number) => level + size * 0.05 + amp * 0.8 * Math.sin((x / size) * Math.PI * 2 * f2 + p2);
        draw(0, level - size * 0.06 - amp, size, size, (x, y) => y > backY(x), back, (x, y) => clamp01(1 - (y - backY(x)) / (size * 0.12)) * 0.5);
        draw(0, level + size * 0.05 - amp, size, size, (x, y) => y > frontY(x), front, (x, y) => clamp01(1 - (y - frontY(x)) / (size * 0.18)) * 0.7);
        deviceNote = 'rolling flat hills';
        break;
      }
      case 'confetti': {
        const wanted = Math.round(8 + mood.density * 12);
        const kinds = mood.cheer > 0.5 ? ['sparkle', 'plus', 'ring', 'dot', 'squiggle', 'sparkle'] : mood.cheer > 0.2 ? ['dot', 'ring', 'plus', 'squiggle', 'triangle'] : ['dot', 'dash', 'ring', 'dash'];
        const colours = [add(sub), add(accent2), deviceDeep];
        let placed = 0;
        for (let attempt = 0; attempt < wanted * 14 && placed < wanted; attempt++) {
          const ox = size * (0.05 + random() * 0.9), oy = size * (0.05 + random() * 0.9);
          const r = (10 + random() * 10) * unit * (1 + mood.energy * 0.25);
          if (ox > cast.x0 - r * 2 && ox < cast.x1 + r * 2 && oy > cast.y0 - r * 2 && oy < cast.y1 + r * 2) continue;
          const corners = [[ox, oy], [ox - r, oy], [ox + r, oy], [ox, oy - r], [ox, oy + r]];
          if (!corners.every(([x, y]) => x >= 0 && y >= 0 && x < size && y < size && onPaper(Math.floor(y) * size + Math.floor(x)))) continue;
          const turn = random() * Math.PI * (0.5 + mood.energy);
          const cos = Math.cos(turn), sin = Math.sin(turn);
          const local = (x: number, y: number) => [(x - ox) * cos + (y - oy) * sin, -(x - ox) * sin + (y - oy) * cos];
          const which = kinds[Math.floor(random() * kinds.length)];
          const stroke = Math.max(1.6, r * 0.24);
          let inside: (x: number, y: number) => boolean;
          switch (which) {
            case 'dot': { const rr = r * 0.45; inside = (x, y) => Math.hypot(x - ox, y - oy) < rr; break; }
            case 'ring': inside = (x, y) => Math.abs(Math.hypot(x - ox, y - oy) - r * 0.6) < stroke * 0.55; break;
            case 'plus': inside = (x, y) => { const [u, v] = local(x, y); return capsule(u, v, r * 0.6, stroke * 0.55) < 0 || capsule(v, u, r * 0.6, stroke * 0.55) < 0; }; break;
            case 'dash': inside = (x, y) => { const [u, v] = local(x, y); return capsule(u, v, r * 0.7, stroke * 0.55) < 0; }; break;
            case 'squiggle': inside = (x, y) => { const [u, v] = local(x, y); return Math.abs(u) < r && Math.abs(v - Math.sin((u / r) * Math.PI * 1.5) * r * 0.3) < stroke * 0.6; }; break;
            case 'triangle': inside = (x, y) => { const [u, v] = local(x, y); const h = r * 0.9; return v > -h * 0.5 && v < h * 0.5 && Math.abs(u) < (v + h * 0.5) * 0.62; }; break;
            default: inside = (x, y) => { const [u, v] = local(x, y); return Math.sqrt(Math.abs(u)) + Math.sqrt(Math.abs(v)) < Math.sqrt(r * 0.95); };
          }
          draw(ox - r * 1.2, oy - r * 1.2, ox + r * 1.2, oy + r * 1.2, inside, colours[placed % colours.length]);
          placed++;
        }
        deviceNote = `${placed} floating symbols`;
        break;
      }
      case 'panel': {
        const panel = Math.abs(surface[0] - bg[0]) > 0.035 ? add(surface) : deviceTint;
        const hw = Math.min(size * 0.47, castW * 0.5 + size * 0.09), hh = Math.min(size * 0.47, castH * 0.5 + size * 0.08);
        const cx = Math.min(size - hw - 4, Math.max(hw + 4, castCX)), cy = Math.min(size - hh - 4, Math.max(hh + 4, castCY));
        const r = size * 0.05;
        draw(cx - hw, cy - hh, cx + hw, cy + hh, (x, y) => roundBox(x - cx, y - cy, hw, hh, r) < 0, panel, (x, y) => clamp01((y - cy) / hh) ** 2 * 0.6);
        deviceNote = 'a rounded card panel';
        break;
      }
      default:
        break;
    }
    await tick();

    // ---- shadows ---------------------------------------------------------------------------------
    const shadowed = new Uint8Array(count); // 1 flat shadow, 2 shadow drawn as grain only
    const shadowTail = new Float32Array(count); // grain fade along a long shadow
    const groundShare = (areas[1] ?? 0) / count;
    const receives = (p: number) => {
      const v = id[p];
      if (isThing(v)) return false;
      if (v === 0) return groundShare < 0.02;
      return true;
    };
    const casterFor = (p: number, q: number) => (isThing(id[q]) ? !isThing(id[p]) : id[q] === 2 && id[p] !== 2);
    let shadowNote = 'no cast shadows';
    switch (answers.shadow) {
      case 'cast':
      case 'stippled':
        for (let p = 0; p < count; p++) if (blocked[p] && receives(p)) shadowed[p] = answers.shadow === 'cast' ? 1 : 2;
        shadowNote = answers.shadow === 'cast' ? 'cast shadows as flat shapes' : 'cast shadows in grain';
        break;
      case 'offset': {
        const distance = Math.max(6, Math.min(castW, castH) * 0.06 + 6 * unit);
        const dx = Math.round(fallX * distance), dy = Math.round(fallY * distance);
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++) {
            const p = y * size + x;
            if (!receives(p)) continue;
            const sx = x - dx, sy = y - dy;
            if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
            if (casterFor(p, sy * size + sx)) shadowed[p] = 1;
          }
        shadowNote = 'an offset drop shadow';
        break;
      }
      case 'long': {
        // March each row (or column) along the fall direction, carrying the distance from a caster.
        const reach = Math.min(size * 0.34, Math.max(castW, castH) * 0.75);
        const run = (casters: (q: number) => boolean) => {
          const dist = new Float32Array(count).fill(Infinity);
          const vertical = Math.abs(fallY) >= Math.abs(fallX);
          const lead = vertical ? fallY : fallX, side = vertical ? fallX : fallY;
          const stepLength = 1 / Math.abs(lead), slide = side / Math.abs(lead);
          const sign = lead > 0 ? 1 : -1;
          for (let i = 0; i < size; i++) {
            const line = sign > 0 ? i : size - 1 - i;
            for (let j = 0; j < size; j++) {
              const p = vertical ? line * size + j : j * size + line;
              if (casters(p)) { dist[p] = 0; continue; }
              if (i === 0) continue;
              const prevLine = line - sign;
              const at = j - slide;
              const a = Math.floor(at), b = a + 1;
              let d = Infinity;
              for (const k of [a, b]) {
                if (k < 0 || k >= size) continue;
                const q = vertical ? prevLine * size + k : k * size + prevLine;
                if (dist[q] < d) d = dist[q];
              }
              dist[p] = d + stepLength;
            }
          }
          return dist;
        };
        // Only the objects stream long shadows; the set would bury the picture in shade.
        const fromThings = run((q) => isThing(id[q]));
        for (let p = 0; p < count; p++) {
          if (!receives(p)) continue;
          const d = fromThings[p];
          if (d > 0 && d < reach) {
            const along = d / reach;
            shadowed[p] = along < 0.72 ? 1 : 2;
            shadowTail[p] = smooth(0.55, 1, along);
          }
        }
        shadowNote = 'a long diagonal shadow';
        break;
      }
      case 'pool': {
        let squash = 0.45;
        {
          const values: number[] = [];
          for (let p = 0; p < count; p += 7) if (id[p] === 1 || id[p] === 2) values.push(Math.abs(nZ[p]));
          values.sort((m, n) => m - n);
          if (values.length) squash = Math.min(0.75, Math.max(0.22, values[values.length >> 1]));
        }
        for (let v = 3; v <= topId; v++) {
          if (!areas[v]) continue;
          const b = boxes[v];
          // The width of the object's foot: its lowest tenth.
          let left = size, right = -1;
          const footTop = b.y1 - Math.max(2, (b.y1 - b.y0) * 0.1);
          for (let y = Math.max(0, Math.floor(footTop)); y <= b.y1; y++)
            for (let x = b.x0; x <= b.x1; x++) if (id[y * size + x] === v) { if (x < left) left = x; if (x > right) right = x; }
          if (right < left) continue;
          const rx = Math.max((right - left) * 0.75, (b.x1 - b.x0) * 0.42) + 6 * unit;
          const ry = rx * squash;
          const cx = (left + right) / 2 + fallX * rx * 0.22, cy = b.y1 - ry * 0.25 + fallY * ry * 0.2;
          for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(size - 1, Math.ceil(cy + ry)); y++)
            for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(size - 1, Math.ceil(cx + rx)); x++) {
              const p = y * size + x;
              if (receives(p) && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) shadowed[p] = 1;
            }
        }
        shadowNote = 'oval pools beneath each object';
        break;
      }
      default:
        break;
    }
    if (answers.shadow !== 'none') {
      // Round the shadow shapes like everything else.
      const mask = new Float32Array(count);
      for (let p = 0; p < count; p++) mask[p] = shadowed[p] ? 1 : 0;
      const soft = soften(mask, size, size, Math.max(1.5, shape.tone * 0.8) * unit);
      const kindOf = new Uint8Array(shadowed);
      for (let p = 0; p < count; p++) {
        if (!receives(p)) { shadowed[p] = 0; continue; }
        if (soft[p] >= 0.5 && !shadowed[p]) {
          // Take the kind from a neighbour that was shadowed.
          shadowed[p] = kindOf[p - 1] || kindOf[p + 1] || kindOf[p - size] || kindOf[p + size] || 1;
        } else if (soft[p] < 0.5) shadowed[p] = 0;
      }
      for (let p = 0; p < count; p++) if (shadowed[p] === 1) rel[p] = Math.max(-STEPS, rel[p] - 1);
    }
    await tick();

    // ---- highlights ------------------------------------------------------------------------------
    let highlightNote = 'tone steps only';
    if (answers.highlight !== 'none') {
      const mark = new Float32Array(count);
      if (answers.highlight === 'rim') {
        const reach = Math.max(3, Math.round((4.5 + steps * 0.5) * unit));
        const dx = Math.round(toLightX * reach), dy = Math.round(toLightY * reach);
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++) {
            const p = y * size + x;
            if (!isThing(id[p])) continue;
            const sx = x + dx, sy = y + dy;
            if (sx < 0 || sy < 0 || sx >= size || sy >= size) continue;
            const q = sy * size + sx;
            if (id[q] !== id[p] && (!isThing(id[q]) || far[q] > far[p]) && nX[p] * lx + nY[p] * -ly + nZ[p] * lz > -0.05) mark[p] = 1;
          }
        highlightNote = 'a bright rim toward the light';
      } else if (answers.highlight === 'glint') {
        let hx = lx, hy = -ly, hz = lz + 1;
        const n = Math.hypot(hx, hy, hz) || 1;
        hx /= n; hy /= n; hz /= n;
        for (let p = 0; p < count; p++) {
          if (!isThing(id[p])) continue;
          const spec = Math.max(0, nX[p] * hx + nY[p] * hy + nZ[p] * hz) ** 48;
          if (spec <= 0.5 || lit[p] <= 0.55) continue;
          // Flat faces turned to the light would flash white all over: glints belong to curves.
          const x = p % size, y = (p / size) | 0, o = Math.max(2, Math.round(3 * unit));
          if (x < o || y < o || x >= size - o || y >= size - o) continue;
          const bend = Math.abs(nX[p + o] - nX[p - o]) + Math.abs(nY[p + o] - nY[p - o]) + Math.abs(nX[p + o * size] - nX[p - o * size]) + Math.abs(nY[p + o * size] - nY[p - o * size]);
          if (bend > 0.05) mark[p] = 1;
        }
        highlightNote = 'glossy glints';
      } else {
        const angle = -0.9 + toLightX * 0.3;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        for (let v = 3; v <= topId; v++) {
          if (!areas[v]) continue;
          const b = boxes[v];
          const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
          const span = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) + 1;
          const start = -0.22 + toLightX * 0.12;
          for (let y = b.y0; y <= b.y1; y++)
            for (let x = b.x0; x <= b.x1; x++) {
              const p = y * size + x;
              if (id[p] !== v || rel[p] < 0) continue;
              const u = ((x - cx) * cos + (y - cy) * sin) / span;
              if ((u > start && u < start + 0.075) || (u > start + 0.11 && u < start + 0.135)) mark[p] = 1;
            }
        }
        highlightNote = 'two diagonal sheen bars';
      }
      const soft = soften(mark, size, size, Math.max(1.2, shape.tone * 0.6) * unit);
      const raise = answers.highlight === 'sheen' ? 1 : 2;
      for (let p = 0; p < count; p++) if (isThing(id[p]) && soft[p] >= 0.5) rel[p] = Math.min(STEPS, Math.max(rel[p], 0) + raise);
    }
    await tick();

    // ---- colour tables: each paint in seven tone steps of the same hue ----------------------------
    const coolShadow: [number, number] = [mix(-0.008, 0.012, mood.warmth), mix(-0.016, 0.004, mood.warmth)];
    const warmLight: [number, number] = [mix(0.002, 0.004, mood.warmth), mix(0.008, 0.014, mood.warmth)];
    const lift = mix(0.85, 1.12, mood.cheer);
    const table = new Uint8Array(paints.length * SPAN * 3);
    paints.forEach((base, index) => {
      for (let r = -STEPS; r <= STEPS; r++) {
        let c: Lab = [base[0], base[1], base[2]];
        if (r < 0) {
          const k = -r;
          const drop = dark && base[0] < 0.35 ? 0.055 : 0.082;
          c = [Math.max(0.06, base[0] * (1 - 0.06 * k) - drop * k), base[1] * (1 + 0.07 * k) + coolShadow[0] * k, base[2] * (1 + 0.07 * k) + coolShadow[1] * k];
        } else if (r > 0) {
          c = [base[0] + (1 - base[0]) * Math.min(0.85, 0.3 * r * lift), base[1] * (1 - 0.14 * r) + warmLight[0] * r, base[2] * (1 - 0.14 * r) + warmLight[1] * r];
        }
        const rgb = displayOf(c);
        table.set(rgb, (index * SPAN + r + STEPS) * 3);
      }
    });
    const colourAt = (paint: number, step: number) => (paint * SPAN + Math.max(-STEPS, Math.min(STEPS, step)) + STEPS) * 3;

    // ---- flat colour, with the stair-steps smoothed off the shape edges ---------------------------
    const pixels = new Uint8ClampedArray(count * 4);
    const key = new Int32Array(count);
    for (let p = 0; p < count; p++) {
      key[p] = paintOf[p] * 16 + rel[p] + 8;
      const at = colourAt(paintOf[p], rel[p]);
      pixels[p * 4] = table[at];
      pixels[p * 4 + 1] = table[at + 1];
      pixels[p * 4 + 2] = table[at + 2];
      pixels[p * 4 + 3] = 255;
    }
    {
      const flat = pixels.slice();
      for (let y = 1; y < size - 1; y++)
        for (let x = 1; x < size - 1; x++) {
          const p = y * size + x;
          const k = key[p];
          if (key[p - 1] === k && key[p + 1] === k && key[p - size] === k && key[p + size] === k) continue;
          for (let c = 0; c < 3; c++) {
            const at = p * 4 + c;
            const ring = flat[at - 4] + flat[at + 4] + flat[at - size * 4] + flat[at + size * 4];
            const corners = flat[at - size * 4 - 4] + flat[at - size * 4 + 4] + flat[at + size * 4 - 4] + flat[at + size * 4 + 4];
            pixels[at] = (flat[at] * 4 + ring * 1.5 + corners * 0.5) / 12;
          }
        }
    }
    await tick();

    // ---- grain stipple: square dots that gather toward the next darker tone ------------------------
    const cell = Math.max(2, Math.round(2 * unit));
    const dotSeed = (seed * 2654435761) >>> 0;
    const centreX = new Float32Array(topId + 1), centreY = new Float32Array(topId + 1), reachOf = new Float32Array(topId + 1);
    for (let v = 0; v <= topId; v++) {
      if (!areas[v]) continue;
      centreX[v] = sumsX[v] / areas[v];
      centreY[v] = sumsY[v] / areas[v];
      reachOf[v] = Math.max(8, Math.hypot(boxes[v].x1 - boxes[v].x0, boxes[v].y1 - boxes[v].y0) * 0.5);
    }
    const paperDust = answers.backdrop === 'plain' ? 0.012 : 0.022;
    for (let cy = 0; cy < size; cy += cell) {
      if (cy % (cell * 64) === 0) await tick();
      for (let cx = 0; cx < size; cx += cell) {
        const p = cy * size + cx;
        const v = id[p];
        const r = hash2(cx / cell, cy / cell, dotSeed);
        let darkDots = 0, lightDots = 0;
        if (kind[p] === 2) {
          // Dense where the plain light is low, thinning to nothing on the lit faces, with a drift
          // across each shape away from the light and a dither where one tone meets the next.
          const pos = clamp01(0.5 + (((cx - centreX[v]) * fallX + (cy - centreY[v]) * fallY) / reachOf[v]) * 0.6);
          const t = clamp01(thingTone[p] / 1.05);
          darkDots = Math.min(0.42, 0.62 * (1 - t) ** 1.4 + 0.14 * pos * pos + 0.16 * (1 - frac[p]) ** 3) * 0.62;
          lightDots = rel[p] >= 0 ? 0.05 * frac[p] ** 2 * (1 - pos) : 0;
        } else if (kind[p] === 1) {
          const t = clamp01(setTone[p] / 1.05);
          darkDots = Math.min(0.32, 0.45 * (1 - t) ** 1.4 + 0.12 * (1 - frac[p]) ** 3) * 0.6;
          lightDots = 0.02 * frac[p];
        } else {
          darkDots = paperDust + decor[p] * 0.36;
        }
        if (shadowed[p] === 2) darkDots = Math.max(darkDots, 0.62 * (1 - shadowTail[p] * 0.85));
        else if (shadowed[p] === 1) darkDots += 0.08;
        darkDots *= grain;
        lightDots *= grain;
        let step = 0;
        if (r < darkDots) step = -1;
        else if (r > 1 - lightDots) step = 1;
        else continue;
        const k = key[p];
        const dotRel = shadowed[p] === 2 ? rel[p] - 1 : rel[p] + step;
        const at = colourAt(paintOf[p], dotRel);
        for (let dy = 0; dy < cell && cy + dy < size; dy++)
          for (let dx = 0; dx < cell && cx + dx < size; dx++) {
            const q = (cy + dy) * size + cx + dx;
            if (key[q] !== k) continue;
            pixels[q * 4] = table[at];
            pixels[q * 4 + 1] = table[at + 1];
            pixels[q * 4 + 2] = table[at + 2];
          }
      }
    }
    // A fine texture of single pixels over the objects only, like printed grain.
    const fineSeed = (seed * 40503 + 977) >>> 0;
    for (let p = 0; p < count; p++) {
      if (kind[p] === 0 && paintOf[p] === 0) continue;
      const h = hash2(p % size, (p / size) | 0, fineSeed);
      const darkShare = 0.025 * grain * (kind[p] === 2 ? 1 : 0.5), lightShare = 0.02 * grain * (kind[p] === 2 ? 1 : 0.5);
      let at = -1, amount = 0;
      if (h < darkShare) { at = colourAt(paintOf[p], rel[p] - 1); amount = 0.32; }
      else if (h > 1 - lightShare) { at = colourAt(paintOf[p], rel[p] + 1); amount = 0.38; }
      if (at < 0) continue;
      for (let c = 0; c < 3; c++) pixels[p * 4 + c] = mix(pixels[p * 4 + c], table[at + c], amount);
    }

    const toneNames = ['', '', 'two tones', 'three tones', 'four tones', 'five tones'];
    return {
      pixels,
      notes: [
        `flat editorial illustration in the ${answers.palette} palette, accent on the hero`,
        `${toneNames[steps]}, ${answers.shapes} shapes, ${grain < 0.15 ? 'clean' : grain < 0.5 ? 'lightly grained' : 'grainy'} stipple`,
        `${deviceNote}; ${shadowNote}; ${highlightNote}`,
      ],
    };
  },
});
