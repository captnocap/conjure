import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

/**
 * A frame of traditional cel animation. The cast is painted on clear cels: every object is
 * flattened to a few opaque paints, every paint region is closed by an ink line, and the plain
 * lighting is reduced to one hard-edged shadow shape (or more, if asked). The ground, the set and
 * the sky are a separate painting on board: the capture is repainted with real brush strokes that
 * follow the forms, softened and hazed with distance, and quieter in colour than the cels so the
 * characters read in front of it. The cels are then shot over it with grain, dust or tape.
 */
type Triple = [number, number, number];

const ERAS = {
  rubberhose: {
    name: '1930s rubber-hose short', line: 1.45, taper: 0, wobble: 0.55, xerox: 0, round: 6, saturation: 0.8, slip: 0, vignette: 0.32, grain: 1.4,
  },
  limited: {
    name: '1960s limited-animation cartoon', line: 0.8, taper: 0.15, wobble: 0.4, xerox: 1, round: 3, saturation: 1.15, slip: 3.2, vignette: 0, grain: 0.8,
  },
  television: {
    name: '1980s Saturday-morning cartoon', line: 1, taper: 0.3, wobble: 0.12, xerox: 0, round: 3, saturation: 1.2, slip: 0.9, vignette: 0.05, grain: 0.8,
  },
  feature: {
    name: '1990s animated feature', line: 0.95, taper: 1, wobble: 0.08, xerox: 0, round: 2, saturation: 1.05, slip: 0, vignette: 0, grain: 0.6,
  },
} as const;

const BLACK: Triple = [0.085, 0.07, 0.095];
const BROWN: Triple = [0.31, 0.18, 0.115];

/** A mid-century gouache tin for the limited paint set. */
const TIN: Triple[] = [
  [214, 170, 60], [50, 140, 135], [226, 110, 90], [120, 130, 60], [140, 190, 210], [110, 60, 95], [170, 80, 45], [238, 228, 200],
  [50, 50, 55], [235, 160, 170], [160, 210, 170], [190, 150, 100], [45, 60, 100], [150, 150, 145], [245, 220, 120], [150, 55, 50],
].map((c) => [c[0] / 255, c[1] / 255, c[2] / 255] as Triple);
/** The greys a black-and-white short was painted in. */
const GREYS = [0.97, 0.8, 0.6, 0.4, 0.2, 0.07];

const TEAL: Triple = [0.12, 0.52, 0.5];
const ORANGE: Triple = [0.9, 0.35, 0.2];

const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const lum = (c: readonly number[]) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
const saturate = (c: readonly number[], s: number): Triple => {
  const l = lum(c);
  return [clamp01(l + (c[0] - l) * s), clamp01(l + (c[1] - l) * s), clamp01(l + (c[2] - l) * s)];
};
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Smooth value noise in 0..1, repeatable for a seed. */
function noiseField(seed: number) {
  const hash = (x: number, y: number) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return (x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * sx;
    const bottom = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}
/** White noise per pixel, repeatable. */
function grainAt(seed: number) {
  return (x: number, y: number) => {
    let h = Math.imul(x, 1597334677) ^ Math.imul(y, 3812015801) ^ seed;
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

/** Separable box blur, linear time for any radius. */
function blur(source: Float32Array, size: number, radius: number) {
  const count = size * size;
  const temp = new Float32Array(count), out = new Float32Array(count);
  radius = Math.max(1, Math.round(radius));
  const span = radius * 2 + 1;
  for (let y = 0; y < size; y++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += source[y * size + Math.min(size - 1, Math.max(0, k))];
    for (let x = 0; x < size; x++) {
      temp[y * size + x] = sum / span;
      sum += source[y * size + Math.min(size - 1, x + radius + 1)] - source[y * size + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < size; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += temp[Math.min(size - 1, Math.max(0, k)) * size + x];
    for (let y = 0; y < size; y++) {
      out[y * size + x] = sum / span;
      sum += temp[Math.min(size - 1, y + radius + 1) * size + x] - temp[Math.max(0, y - radius) * size + x];
    }
  }
  return out;
}
/** Two box passes: close enough to a gaussian that shapes come out rounded, not square. */
const soften = (source: Float32Array, size: number, radius: number) => blur(blur(source, size, radius * 0.7), size, radius * 0.7);

/**
 * K-means in RGB on a sample, seeded. Starts the centroids far apart, then merges any that end up
 * close and folds tiny clusters into their neighbours, so an object comes out as the few paints
 * a cel painter would have mixed for it.
 */
function cluster(samples: Float32Array, n: number, k: number, random: () => number, mergeBelow: number): number[][] {
  if (n === 0) return [[0.5, 0.5, 0.5, 1]];
  const centroids: number[][] = [];
  const first = Math.floor(random() * n) * 3;
  centroids.push([samples[first], samples[first + 1], samples[first + 2], 0]);
  const nearest = new Float32Array(n).fill(Infinity);
  while (centroids.length < k) {
    const c = centroids[centroids.length - 1];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const d = (samples[i * 3] - c[0]) ** 2 + (samples[i * 3 + 1] - c[1]) ** 2 + (samples[i * 3 + 2] - c[2]) ** 2;
      if (d < nearest[i]) nearest[i] = d;
      total += nearest[i];
    }
    if (total < 1e-5) break;
    let pick = random() * total, chosen = n - 1;
    for (let i = 0; i < n; i++) {
      pick -= nearest[i];
      if (pick <= 0) { chosen = i; break; }
    }
    centroids.push([samples[chosen * 3], samples[chosen * 3 + 1], samples[chosen * 3 + 2], 0]);
  }
  const sums = new Float32Array(centroids.length * 4);
  for (let round = 0; round < 8; round++) {
    sums.fill(0);
    for (let i = 0; i < n; i++) {
      const r = samples[i * 3], g = samples[i * 3 + 1], b = samples[i * 3 + 2];
      let best = 0, bestD = Infinity;
      for (let j = 0; j < centroids.length; j++) {
        const c = centroids[j];
        const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      }
      sums[best * 4] += r;
      sums[best * 4 + 1] += g;
      sums[best * 4 + 2] += b;
      sums[best * 4 + 3]++;
    }
    for (let j = 0; j < centroids.length; j++) {
      const w = sums[j * 4 + 3];
      if (w > 0) centroids[j] = [sums[j * 4] / w, sums[j * 4 + 1] / w, sums[j * 4 + 2] / w, w];
      else centroids[j][3] = 0;
    }
  }
  for (;;) {
    if (centroids.length < 2) break;
    let a = -1, b = -1, closest = Infinity;
    for (let i = 0; i < centroids.length; i++)
      for (let j = i + 1; j < centroids.length; j++) {
        const d = Math.hypot(centroids[i][0] - centroids[j][0], centroids[i][1] - centroids[j][1], centroids[i][2] - centroids[j][2]);
        if (d < closest) { closest = d; a = i; b = j; }
      }
    const tiny = centroids.findIndex((c) => c[3] < n * 0.02);
    if (closest >= mergeBelow && tiny < 0) break;
    if (closest >= mergeBelow) {
      a = tiny;
      b = -1;
      closest = Infinity;
      for (let j = 0; j < centroids.length; j++) {
        if (j === a) continue;
        const d = (centroids[a][0] - centroids[j][0]) ** 2 + (centroids[a][1] - centroids[j][1]) ** 2 + (centroids[a][2] - centroids[j][2]) ** 2;
        if (d < closest) { closest = d; b = j; }
      }
    }
    const wa = centroids[a][3] || 1, wb = centroids[b][3] || 1, w = wa + wb;
    centroids[a] = [
      (centroids[a][0] * wa + centroids[b][0] * wb) / w,
      (centroids[a][1] * wa + centroids[b][1] * wb) / w,
      (centroids[a][2] * wa + centroids[b][2] * wb) / w,
      w,
    ];
    centroids.splice(b, 1);
  }
  return centroids;
}

/** A 3×3 majority vote on a label map, never crossing from one region into another. */
function majority(label: Uint16Array, region: Int16Array, size: number) {
  const out = label.slice();
  const candidates = new Int32Array(9), tallies = new Int32Array(9);
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      const p = y * size + x;
      const own = region[p];
      if (own < 0) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const q = p + dy * size + dx;
          if (region[q] !== own) continue;
          const l = label[q];
          let at = -1;
          for (let i = 0; i < n; i++) if (candidates[i] === l) { at = i; break; }
          const weight = dx === 0 && dy === 0 ? 2 : 1;
          if (at < 0) { candidates[n] = l; tallies[n] = weight; n++; } else tallies[at] += weight;
        }
      let best = 0;
      for (let i = 1; i < n; i++) if (tallies[i] > tallies[best]) best = i;
      out[p] = candidates[best];
    }
  label.set(out);
}

/** Paint islands smaller than a brush dab are folded into whatever surrounds them. */
function mergeSmall(label: Uint16Array, region: Int16Array, size: number, minArea: number) {
  const count = size * size;
  const seen = new Uint8Array(count);
  const stack = new Int32Array(count);
  const members = new Int32Array(count);
  const tally = new Map<number, number>();
  for (let start = 0; start < count; start++) {
    if (seen[start] || region[start] < 0) continue;
    const own = region[start], mine = label[start];
    let top = 0, n = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top) {
      const p = stack[--top];
      members[n++] = p;
      const x = p % size;
      const visit = (q: number) => {
        if (!seen[q] && region[q] === own && label[q] === mine) { seen[q] = 1; stack[top++] = q; }
      };
      if (x > 0) visit(p - 1);
      if (x < size - 1) visit(p + 1);
      if (p >= size) visit(p - size);
      if (p < count - size) visit(p + size);
    }
    if (n >= minArea) continue;
    tally.clear();
    for (let i = 0; i < n; i++) {
      const p = members[i];
      const x = p % size;
      const look = (q: number) => {
        if (region[q] === own && label[q] !== mine) tally.set(label[q], (tally.get(label[q]) ?? 0) + 1);
      };
      if (x > 0) look(p - 1);
      if (x < size - 1) look(p + 1);
      if (p >= size) look(p - size);
      if (p < count - size) look(p + size);
    }
    let best = -1, most = 0;
    for (const [key, value] of tally) if (value > most) { most = value; best = key; }
    if (best >= 0) for (let i = 0; i < n; i++) label[members[i]] = best;
  }
}

/** How one brush lays paint: its size, load, bristles and how it treats region edges. */
interface Brush {
  length: number;
  width: number;
  opacity: number;
  /** How much the bristle lanes break up the paint. */
  bristle: number;
  /** Light and dark streaks along the lanes. */
  streak: number;
  /** The fraction of the stroke at its tail where it runs dry. */
  dry: number;
  /** 0: strokes stop at the edge of the shape they started in … 1: they cross freely. */
  leak: number;
  /** How ragged the sides of the stroke are. */
  ragged: number;
  /** Glazes only: pigment gathered at the dried edge of the wash. */
  rim: number;
  glaze: boolean;
}

export default defineLook({
  questions: {
    era: choice('Which era of animation is this frame from?', {
      rubberhose: 'A 1930s rubber-hose short: thick, even, slightly wobbling black ink around round simple shapes, soft rounded shadows, an unevenly exposed and vignetted frame. Jazz, bouncing walks, cheerful with a shiver.',
      limited: 'A 1960s limited-animation television cartoon: thin broken xerox lines, bold flat paint slipped a little out of register with the line, stylised backgrounds. Mid-century modern, a laugh track, the same three walk cycles.',
      television: 'A 1980s Saturday-morning cartoon: a clean even line, bright flat paint with simple shadows, a softly painted background. Toy commercials, cereal, after school, taped off the television.',
      feature: 'A 1990s animated feature film: a tapering brush line that swells in shadow, carefully modelled paint with shadows and highlights, a lush atmospheric background. Musicals, grand stories, the big screen.',
    }),
    paint: choice('Which paints did the ink-and-paint department mix for the cels?', {
      faithful: "The scene's own colours as opaque cel paint: a touch brighter, cleaner and flatter than life.",
      technicolor: 'Saturated Technicolor: candy red, cobalt, emerald and gold at full strength (red-orange and teal two-strip colour on a 1930s short).',
      pastel: 'Soft pastel paints: chalky pinks, mints, butter yellow and lavender, nothing darker than a mid-tone, gentle and sleepy.',
      limited: 'A limited mid-century gouache tin: mustard, teal, coral, olive, plum and cream, every shape snapped to the nearest pot.',
      monochrome: 'Black-and-white paints in a handful of greys, as in a short made before colour, crisp and graphic.',
    }),
    tones: score('How many tones is each cel colour painted in?', [
      'Flat colour with no shadow at all',
      'One hard-edged shadow tone',
      'One shadow tone and a highlight',
      'A shadow, a deeper core shadow and a highlight',
      'Shadow, core shadow, highlight and a bright rim light',
    ]),
    line: score('How heavy is the ink line around the cels?', [
      'A hairline, barely there',
      'A fine pen line',
      'A confident brush line',
      'A thick bold line',
      'A fat, chunky line, half ink',
    ]),
    ink: choice('What colour is the outline inked in?', {
      black: 'Black ink: the classic cartoon line, crisp and definite.',
      brown: 'Dark sepia-brown ink: warmer and gentler than black, like a storybook.',
      coloured: 'Self-coloured lines: every shape outlined in a darker shade of its own paint, so the line melts into the colour, soft and painterly.',
      mixed: 'A black outer silhouette with the inner lines in darker shades of each paint, as on a big-studio feature.',
    }),
    background: choice('What is the background painted in?', {
      gouache: 'Opaque gouache on board: solid brush strokes following the forms, visible bristle streaks, matte and rich.',
      watercolour: 'Transparent watercolour: overlapping washes with dark dried edges, granulating pigment, white paper showing in the lights.',
      poster: 'Stylised flat poster shapes: the background cut into a few hard-edged tones with dry-brush texture and loose offset outlines, mid-century modern.',
      airbrush: 'Airbrush: smooth sprayed gradients inside crisp masked shapes with a fine speckle of spray, glossy and synthetic.',
    }),
    softness: score('How soft is the painted background behind the cels?', [
      'Crisp: the background almost as sharp as the cels',
      'Lightly brushed',
      'Soft painterly strokes',
      'Very soft, a little out of focus',
      'A misty, barely defined painting',
    ]),
    finish: choice('How was the frame shot and how has it kept?', {
      clean: 'A clean new transfer: no grain, no dust, colours as painted.',
      grain: 'Fine film grain over the whole frame, as projected from a good print.',
      dust: 'Cel dust: specks, hairs and fibres caught between the cels and the glass when the frame was shot.',
      worn: 'A worn old print: colour faded toward magenta, lifted blacks, heavy grain, scratches, dust and darkened corners.',
      video: 'Taped off television: soft bleeding colour, scanlines and a wavering band at the bottom of the picture.',
    }),
  },

  async apply(capture, answers, context, signal) {
    const { size, color, normal, depth, identity, diffuse } = capture;
    const count = size * size;
    const unit = size / 720;
    const mood = context.mood;
    const era = ERAS[answers.era];
    const random = seeded((context.seed ^ 0x2ce1a7d1) >>> 0);
    const low = noiseField((context.seed * 31 + 7) | 0);
    const fine = noiseField((context.seed * 131 + 91) | 0);
    const mid = noiseField((context.seed * 577 + 3) | 0);
    const white = grainAt((context.seed * 7919 + 17) | 0);
    const tick = async () => {
      signal.throwIfAborted();
      await pause();
      signal.throwIfAborted();
    };
    const CAST = 3;
    const medium = answers.background;
    const soft = clamp01(answers.softness);
    const mono = answers.paint === 'monochrome';
    const twoStripEra = answers.era === 'rubberhose' && answers.paint === 'technicolor';

    // ---- read the capture -------------------------------------------------------------------
    const id = new Uint8Array(count);
    /** -1 for the cast, 0 backdrop, 1 ground, 2 set: the regions of the background painting. */
    const group = new Int16Array(count);
    const far = new Float32Array(count);
    const lit = new Float32Array(count);
    const castHistogram = new Uint32Array(256), allHistogram = new Uint32Array(256);
    let castPixels = 0;
    let skyR = 0, skyG = 0, skyB = 0, skyCount = 0;
    for (let p = 0; p < count; p++) {
      const at = p * 4;
      id[p] = identity[at];
      group[p] = id[p] >= CAST ? -1 : id[p];
      far[p] = id[p] === 0 ? 1 : (depth[at] * 65536 + depth[at + 1] * 256 + depth[at + 2]) / 16777216;
      lit[p] = diffuse[at] * 0.3 + diffuse[at + 1] * 0.59 + diffuse[at + 2] * 0.11;
      const bin = Math.min(255, Math.round(lit[p]));
      if (id[p] >= CAST) { castHistogram[bin]++; castPixels++; }
      if (id[p] > 0) allHistogram[bin]++;
      if (id[p] === 0) { skyR += color[at]; skyG += color[at + 1]; skyB += color[at + 2]; skyCount++; }
    }
    const histogram = castPixels > 500 ? castHistogram : allHistogram;
    let total = 0;
    for (let v = 0; v < 256; v++) total += histogram[v];
    let seen = 0, bright = 255;
    for (let v = 0; v < 256; v++) {
      seen += histogram[v];
      if (seen >= total * 0.92) { bright = Math.max(8, v); break; }
    }
    for (let p = 0; p < count; p++) lit[p] = Math.min(1.3, lit[p] / bright);
    // Where the painter puts the shadow line: the split that best separates light from shade (Otsu).
    let split = 0.5;
    {
      let sumAll = 0;
      for (let v = 0; v < 256; v++) sumAll += v * histogram[v];
      let below = 0, sumBelow = 0, best = -1;
      for (let v = 0; v < 256; v++) {
        below += histogram[v];
        sumBelow += v * histogram[v];
        const above = total - below;
        if (!below || !above) continue;
        const gap = sumBelow / below - (sumAll - sumBelow) / above;
        const between = below * above * gap * gap;
        if (between > best) { best = between; split = v / bright; }
      }
      split = Math.min(0.78, Math.max(0.32, split));
    }
    const sky: Triple = skyCount ? [skyR / skyCount / 255, skyG / skyCount / 255, skyB / skyCount / 255] : [0.8, 0.84, 0.88];
    const litSoft = blur(lit, size, 2 * unit);
    // Shadow shapes are simplified: a 1930s painter rounded them right off, a 1990s one kept more.
    const shade = soften(lit, size, Math.max(1.5, era.round * unit));
    await tick();

    // ---- flat paint: each thing reduced to a few opaque colours ------------------------------
    // Divide the render by its own plain lighting to guess the paint underneath, blur a little
    // so texture does not become speckle, then cluster per thing.
    const radius = Math.max(1, Math.round(1.2 * unit));
    const channels = [0, 1, 2].map((channel) => {
      const plane = new Float32Array(count);
      for (let p = 0; p < count; p++) plane[p] = color[p * 4 + channel];
      return blur(plane, size, radius);
    });
    await tick();
    const albedo = new Float32Array(count * 3);
    for (let p = 0; p < count; p++) {
      const own = id[p];
      if (own < CAST) continue;
      const x = p % size, y = (p / size) | 0;
      const edge = own !== id[y * size + Math.min(size - 1, x + radius)] || own !== id[y * size + Math.max(0, x - radius)]
        || own !== id[Math.min(size - 1, y + radius) * size + x] || own !== id[Math.max(0, y - radius) * size + x];
      // The plain lighting is linear while the colour is tone-mapped: compare them in display space.
      const light = Math.pow(Math.min(1.3, Math.max(0.14, litSoft[p])), 1 / 2.2);
      for (let c = 0; c < 3; c++) albedo[p * 3 + c] = clamp01((edge ? color[p * 4 + c] : channels[c][p]) / 255 / light);
    }
    const palette: number[][] = [];
    const label = new Uint16Array(count);
    const castRegion = new Int16Array(count).fill(-1);
    const members = new Set<number>();
    for (let p = 0; p < count; p++) if (id[p] >= CAST) { members.add(id[p]); castRegion[p] = id[p]; }
    for (const member of [...members].sort((a, b) => a - b)) {
      let n = 0;
      for (let p = 0; p < count; p++) if (id[p] === member && (p & 1) === 0 && (((p / size) | 0) & 1) === 0) n++;
      const samples = new Float32Array(n * 3);
      let k = 0;
      for (let p = 0; p < count; p++) {
        if (id[p] !== member || (p & 1) !== 0 || (((p / size) | 0) & 1) !== 0) continue;
        samples[k * 3] = albedo[p * 3];
        samples[k * 3 + 1] = albedo[p * 3 + 1];
        samples[k * 3 + 2] = albedo[p * 3 + 2];
        k++;
      }
      const found = cluster(samples, n, 6, random, 0.1);
      const from = palette.length;
      for (const c of found) palette.push([c[0], c[1], c[2]]);
      for (let p = 0; p < count; p++) {
        if (id[p] !== member) continue;
        let best = from, bestD = Infinity;
        for (let j = from; j < palette.length; j++) {
          const c = palette[j];
          const d = (albedo[p * 3] - c[0]) ** 2 + (albedo[p * 3 + 1] - c[1]) ** 2 + (albedo[p * 3 + 2] - c[2]) ** 2;
          if (d < bestD) { bestD = d; best = j; }
        }
        label[p] = best;
      }
    }
    majority(label, castRegion, size);
    majority(label, castRegion, size);
    mergeSmall(label, castRegion, size, Math.round(70 * unit * unit));
    await tick();

    // ---- the paint set ----------------------------------------------------------------------
    const cheerSat = mix(0.88, 1.14, mood.cheer);
    const warmShift = (mood.warmth - 0.5) * 0.07;
    const twoStrip = (c: readonly number[]): Triple => {
      const l = lum(c);
      const w = clamp01(0.5 + (c[0] - c[2]) * 1.6);
      const hue = [mix(TEAL[0], ORANGE[0], w), mix(TEAL[1], ORANGE[1], w), mix(TEAL[2], ORANGE[2], w)];
      const hl = lum(hue) || 1;
      return [clamp01(mix(c[0], (hue[0] * l) / hl, 0.85)), clamp01(mix(c[1], (hue[1] * l) / hl, 0.85)), clamp01(mix(c[2], (hue[2] * l) / hl, 0.85))];
    };
    const nearestTin = (c: readonly number[]) => {
      let best = TIN[0], bestD = Infinity;
      for (const pot of TIN) {
        const d = ((c[0] - pot[0]) * 0.3) ** 2 + ((c[1] - pot[1]) * 0.59) ** 2 + ((c[2] - pot[2]) * 0.11) ** 2
          + ((c[0] - pot[0]) ** 2 + (c[1] - pot[1]) ** 2 + (c[2] - pot[2]) ** 2) * 0.12;
        if (d < bestD) { bestD = d; best = pot; }
      }
      return best;
    };
    const grey = (c: readonly number[]) => {
      const l = Math.pow(lum(c), 0.95);
      let best = GREYS[0];
      for (const level of GREYS) if (Math.abs(level - l) < Math.abs(best - l)) best = level;
      return best;
    };
    const mixPaint = (input: readonly number[]): Triple => {
      let c: Triple = [input[0], input[1], input[2]];
      switch (answers.paint) {
        case 'faithful':
          c = saturate(c.map((v) => Math.pow(v, 0.85)), 1.35 * cheerSat * era.saturation);
          break;
        case 'technicolor':
          c = saturate(c.map((v) => Math.pow(v, 0.82)), 1.9 * cheerSat);
          if (twoStripEra) c = twoStrip(c);
          break;
        case 'pastel': {
          c = saturate(c.map((v) => Math.pow(v, 0.8)), 1.25 * cheerSat);
          c = [mix(c[0], 1, 0.45), mix(c[1], 0.98, 0.45), mix(c[2], 0.97, 0.45)];
          break;
        }
        case 'limited': {
          const pot = nearestTin(saturate(c.map((v) => Math.pow(v, 0.9)), 1.3));
          c = [pot[0], pot[1], pot[2]];
          break;
        }
        case 'monochrome': {
          const g = grey(c);
          c = [g, g * 0.985, g * 0.95];
          break;
        }
      }
      if (!mono) c = [clamp01(c[0] + warmShift), c[1], clamp01(c[2] - warmShift)];
      return c;
    };
    const paintOf = palette.map((c) => mixPaint(c));
    // Shadow paint: the base colour multiplied by a cool violet (warm moods: a dusky rose).
    const shadowMul: Triple = mono ? [0.6, 0.6, 0.6] : [mix(0.56, 0.74, mood.warmth), mix(0.55, 0.56, mood.warmth), mix(0.82, 0.6, mood.warmth)];
    const shadowLift = answers.paint === 'pastel' ? 0.3 : 0;
    const toneCount = Math.round(clamp01(answers.tones) * 4);
    const confidence = capture.confidence;
    const painted = (member: number) => (confidence?.[member] ?? 1) >= 0.45;
    let anyClear = false;
    for (const member of members) if (!painted(member)) anyClear = true;
    const selfLine = (c: Triple): Triple => {
      const s = saturate(c, 1.35);
      return mono ? [c[0] * 0.3, c[1] * 0.3, c[2] * 0.3] : [s[0] * 0.42, s[1] * 0.38, s[2] * 0.44];
    };

    // ---- the ink line -------------------------------------------------------------------------
    const [lx, ly, lz] = capture.light;
    const base = mix(0.85, 3.2, Math.pow(answers.line, 1.1)) * unit * era.line;
    const range = capture.far - capture.near;
    const jump = Math.max(capture.pixelWorldSize * 3.5, range * 0.0004) / range;
    const strokeWidth = new Float32Array(count);
    const sourceX = new Int16Array(count).fill(-1), sourceY = new Int16Array(count).fill(-1);
    const lineKind = new Uint8Array(count);
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const p = y * size + x;
        const own = id[p];
        if (own < CAST) continue;
        let kind = 0;
        const right = p + 1, down = p + size, left = p - 1, up = p - size;
        if (own !== id[right] || own !== id[down]) {
          const other = own !== id[right] ? right : down;
          kind = far[p] <= far[other] ? 3 : 0;
        } else if (own !== id[left] || own !== id[up]) {
          const other = own !== id[left] ? left : up;
          kind = far[p] <= far[other] ? 3 : 0;
        }
        if (!kind && own === id[right] && own === id[down] && own === id[left] && own === id[up]) {
          const bend = Math.max(Math.abs(far[left] - 2 * far[p] + far[right]), Math.abs(far[up] - 2 * far[p] + far[down]));
          if (bend > jump && (far[p] <= far[right] || far[p] <= far[down]) && far[p] <= Math.min(far[left], far[right], far[up], far[down]) + jump * 0.5) kind = 2;
          else {
            const at = p * 4;
            const nx = normal[at] - 128, ny = normal[at + 1] - 128, nz = normal[at + 2] - 128;
            const a = right * 4, c = down * 4;
            const dotRight = (nx * (normal[a] - 128) + ny * (normal[a + 1] - 128) + nz * (normal[a + 2] - 128)) / 16129;
            const dotDown = (nx * (normal[c] - 128) + ny * (normal[c + 1] - 128) + nz * (normal[c + 2] - 128)) / 16129;
            if (Math.min(dotRight, dotDown) < 0.72) kind = 1;
            // Every paint region on a cel is closed by ink: the line is what the painter fills to.
            else if (label[p] !== label[right] || label[p] !== label[down]) kind = 4;
          }
        }
        if (!kind) continue;
        const at = p * 4;
        const facing = ((normal[at] - 128) * lx - (normal[at + 1] - 128) * ly + (normal[at + 2] - 128) * lz) / 127;
        const shadowSide = clamp01(0.5 - facing * 0.8);
        const pressure = low(x / (26 * unit), y / (26 * unit));
        const taper = mix(1, mix(0.55, 1.55, shadowSide) * mix(0.7, 1.25, pressure), era.taper);
        const wobbleWidth = mix(1, mix(0.78, 1.22, pressure), era.wobble);
        const kindWidth = kind === 3 ? 1 : kind === 2 ? 0.8 : 0.58;
        strokeWidth[p] = Math.max(0.35, base * kindWidth * taper * wobbleWidth);
        sourceX[p] = x;
        sourceY[p] = y;
        lineKind[p] = kind;
      }
    }
    // An inker leaves out the clutter: where interior lines crowd, most are dropped.
    {
      const busy = new Float32Array(count);
      for (let p = 0; p < count; p++) busy[p] = lineKind[p] === 1 || lineKind[p] === 2 || lineKind[p] === 4 ? 1 : 0;
      const crowd = blur(busy, size, Math.max(2, Math.round(5 * unit)));
      for (let p = 0; p < count; p++) {
        if (!busy[p]) continue;
        if (crowd[p] > (lineKind[p] === 2 ? 0.3 : 0.22)) { sourceX[p] = -1; strokeWidth[p] = 0; lineKind[p] = 0; }
      }
    }
    for (let y = 1; y < size - 1; y++)
      for (let x = 1; x < size - 1; x++) {
        const p = y * size + x;
        if (sourceX[p] < 0) continue;
        let friends = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (strokeWidth[p + dy * size + dx] > 0) friends++;
        if (friends < 3) sourceX[p] = -2;
      }
    for (let p = 0; p < count; p++) if (sourceX[p] === -2) { sourceX[p] = -1; strokeWidth[p] = 0; lineKind[p] = 0; }
    const reach = (p: number, x: number, y: number, from: number) => {
      if (sourceX[from] < 0) return;
      const fx = sourceX[from], fy = sourceY[from];
      if (sourceX[p] < 0) { sourceX[p] = fx; sourceY[p] = fy; return; }
      const mine = (sourceX[p] - x) ** 2 + (sourceY[p] - y) ** 2;
      const theirs = (fx - x) ** 2 + (fy - y) ** 2;
      if (theirs < mine) { sourceX[p] = fx; sourceY[p] = fy; }
    };
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        if (x > 0) reach(p, x, y, p - 1);
        if (y > 0) {
          reach(p, x, y, p - size);
          if (x > 0) reach(p, x, y, p - size - 1);
          if (x < size - 1) reach(p, x, y, p - size + 1);
        }
      }
    for (let y = size - 1; y >= 0; y--)
      for (let x = size - 1; x >= 0; x--) {
        const p = y * size + x;
        if (x < size - 1) reach(p, x, y, p + 1);
        if (y < size - 1) {
          reach(p, x, y, p + size);
          if (x < size - 1) reach(p, x, y, p + size + 1);
          if (x > 0) reach(p, x, y, p + size - 1);
        }
      }
    await tick();

    // ---- the background, before it is painted -------------------------------------------------
    // Each region (sky, ground, set) is smoothed on its own so a wall never melts into the sky,
    // and what lies under the cels is filled in from around them.
    const bgMaskAll = new Float32Array(count);
    for (let p = 0; p < count; p++) bgMaskAll[p] = group[p] >= 0 ? 1 : 0;
    const fillRadius = 22 * unit;
    const fillMask = blur(bgMaskAll, size, fillRadius);
    const fillPlanes = [0, 1, 2].map((c) => {
      const plane = new Float32Array(count);
      for (let p = 0; p < count; p++) plane[p] = bgMaskAll[p] ? color[p * 4 + c] / 255 : 0;
      return blur(plane, size, fillRadius);
    });
    let meanR = 0, meanG = 0, meanB = 0, meanN = 0;
    for (let p = 0; p < count; p += 7) if (group[p] >= 0) { meanR += color[p * 4]; meanG += color[p * 4 + 1]; meanB += color[p * 4 + 2]; meanN++; }
    const meanBg: Triple = meanN ? [meanR / meanN / 255, meanG / meanN / 255, meanB / meanN / 255] : sky;
    await tick();
    /** Smooth the background region by region at a radius; the cast is filled from around it. */
    const regionBlur = async (radiusPx: number) => {
      const out = new Float32Array(count * 3);
      const weight = new Float32Array(count);
      for (let g = 0; g < 3; g++) {
        const mask = new Float32Array(count);
        let any = false;
        for (let p = 0; p < count; p++) if (group[p] === g) { mask[p] = 1; any = true; }
        if (!any) continue;
        const m = blur(mask, size, radiusPx);
        for (let c = 0; c < 3; c++) {
          const plane = new Float32Array(count);
          for (let p = 0; p < count; p++) plane[p] = mask[p] ? color[p * 4 + c] / 255 : 0;
          const s = blur(plane, size, radiusPx);
          for (let p = 0; p < count; p++) if (group[p] === g) out[p * 3 + c] = s[p] / Math.max(1e-4, m[p]);
        }
        for (let p = 0; p < count; p++) if (group[p] === g) weight[p] = m[p];
        await tick();
      }
      for (let p = 0; p < count; p++) {
        if (group[p] >= 0) continue;
        const m = fillMask[p];
        for (let c = 0; c < 3; c++) out[p * 3 + c] = m > 0.02 ? fillPlanes[c][p] / m : meanBg[c];
      }
      return { colour: out, weight };
    };
    // Distance, for the haze: the 5th and 95th percentile of depth across the background.
    let farLo = 0, farHi = 1;
    {
      const bins = new Uint32Array(256);
      let n = 0;
      for (let p = 0; p < count; p++) if (id[p] === 1 || id[p] === 2) { bins[Math.min(255, Math.floor(far[p] * 255))]++; n++; }
      let acc = 0, lo = -1, hi = -1;
      for (let v = 0; v < 256; v++) {
        acc += bins[v];
        if (lo < 0 && acc >= n * 0.05) lo = v;
        if (hi < 0 && acc >= n * 0.95) hi = v;
      }
      if (n && hi > lo) { farLo = lo / 255; farHi = hi / 255; }
    }
    // The background painter's palette: quieter than the cels so the characters read in front.
    const hazeColour: Triple = [mix(sky[0], 1, 0.4), mix(sky[1], 1, 0.4), mix(sky[2], 1, 0.42)];
    const hazeAmount = (0.1 + 0.32 * soft) * (medium === 'poster' ? 0.6 : 1);
    const bgSat = mono ? 0 : 0.84 * Math.sqrt(era.saturation) * cheerSat * (answers.paint === 'technicolor' ? 1.2 : answers.paint === 'pastel' ? 0.8 : 1) * (medium === 'poster' ? 1.2 : 1);
    const grade = (source: Float32Array, p: number, x: number, y: number): Triple => {
      let r = source[p * 3], g = source[p * 3 + 1], b = source[p * 3 + 2];
      const own = group[p];
      if (own === 0 || (own < 0 && id[p] === 0)) {
        // A painted sky grades from deeper at the top to paler at the horizon and is never even.
        const shift = mix(0.9, 1.06, y / size) + (mid(x / (170 * unit), y / (110 * unit)) - 0.5) * (medium === 'poster' ? 0.03 : 0.1);
        r *= shift; g *= shift; b *= mix(shift, 1, 0.4);
      } else if (own > 0) {
        const h = hazeAmount * smooth(farLo, farHi, far[p]);
        r = mix(r, hazeColour[0], h); g = mix(g, hazeColour[1], h); b = mix(b, hazeColour[2], h);
      }
      if (twoStripEra) [r, g, b] = twoStrip([r, g, b]);
      const l = lum([r, g, b]);
      if (mono) {
        const v = clamp01((l - 0.5) * 1.08 + 0.52);
        return [v, v * 0.985, v * 0.95];
      }
      r = l + (r - l) * bgSat; g = l + (g - l) * bgSat; b = l + (b - l) * bgSat;
      if (answers.paint === 'limited') {
        const pot = nearestTin([r, g, b]);
        r = mix(r, pot[0], 0.35); g = mix(g, pot[1], 0.35); b = mix(b, pot[2], 0.35);
      }
      if (answers.paint === 'pastel') { r = mix(r, 1, 0.25); g = mix(g, 0.98, 0.25); b = mix(b, 0.97, 0.25); }
      // Backgrounds sit a touch quieter than the cels: contrast eased around the middle.
      r = mix(r, 0.55, 0.08) + warmShift; g = mix(g, 0.55, 0.08); b = mix(b, 0.55, 0.08) - warmShift;
      return [clamp01(r), clamp01(g), clamp01(b)];
    };
    const gradeAll = (source: Float32Array) => {
      const out = new Float32Array(count * 3);
      for (let p = 0; p < count; p++) {
        const [r, g, b] = grade(source, p, p % size, (p / size) | 0);
        out[p * 3] = r; out[p * 3 + 1] = g; out[p * 3 + 2] = b;
      }
      return out;
    };

    // ---- the direction of the brush --------------------------------------------------------------
    // Strokes run along the forms: around the edges of shapes (the structure tensor of the
    // picture), and elsewhere across each surface (perpendicular to its normal on screen).
    const coarseBlur = await regionBlur(mix(2, 7, soft) * unit);
    const coarse = gradeAll(coarseBlur.colour);
    await tick();
    const angle = new Float32Array(count);
    {
      const structure = new Float32Array(count);
      for (let p = 0; p < count; p++) structure[p] = lum([coarse[p * 3], coarse[p * 3 + 1], coarse[p * 3 + 2]]) + Math.max(0, group[p]) * 0.25;
      const jxx = new Float32Array(count), jyy = new Float32Array(count), jxy = new Float32Array(count);
      for (let y = 1; y < size - 1; y++)
        for (let x = 1; x < size - 1; x++) {
          const p = y * size + x;
          const gx = structure[p + 1] - structure[p - 1] + 0.5 * (structure[p - size + 1] - structure[p - size - 1] + structure[p + size + 1] - structure[p + size - 1]);
          const gy = structure[p + size] - structure[p - size] + 0.5 * (structure[p + size - 1] - structure[p - size - 1] + structure[p + size + 1] - structure[p - size + 1]);
          jxx[p] = gx * gx; jyy[p] = gy * gy; jxy[p] = gx * gy;
        }
      const r = 7 * unit;
      const sxx = blur(jxx, size, r), syy = blur(jyy, size, r), sxy = blur(jxy, size, r);
      const skyTilt = (random() - 0.5) * 0.25;
      for (let p = 0; p < count; p++) {
        const x = p % size, y = (p / size) | 0;
        const a = sxx[p] - syy[p], b = 2 * sxy[p];
        const strength = Math.sqrt(a * a + b * b);
        const tensor = 0.5 * Math.atan2(b, a) + Math.PI / 2;
        // The surface's own direction.
        const at = p * 4;
        const nx = (normal[at] - 128) / 127, ny = -(normal[at + 1] - 128) / 127;
        const flat = Math.hypot(nx, ny);
        const surface = group[p] === 0 || id[p] === 0 || flat < 0.2 ? skyTilt + (low(x / (200 * unit), y / (200 * unit)) - 0.5) * 0.5 : Math.atan2(-ny, nx) + Math.PI / 2;
        const w = smooth(0.0004, 0.004, strength);
        const vx = w * Math.cos(2 * tensor) + (1 - w) * Math.cos(2 * surface);
        const vy = w * Math.sin(2 * tensor) + (1 - w) * Math.sin(2 * surface);
        angle[p] = 0.5 * Math.atan2(vy, vx);
      }
    }
    await tick();

    // ---- paint the background ---------------------------------------------------------------------
    const canvas = new Float32Array(count * 3);
    const lanes = new Float32Array(256);
    for (let i = 0; i < 256; i++) lanes[i] = random();
    const paperTone: Triple = medium === 'watercolour' ? [0.975, 0.965, 0.935] : [0.93, 0.91, 0.86];
    /** Lays one stroke into `target`: opaque paint mixes in, a glaze adds pigment density. */
    const stroke = (target: Float32Array, cx: number, cy: number, theta: number, colour: Triple, brush: Brush, own: number) => {
      const half = brush.length / 2, hw = brush.width / 2;
      const cos = Math.cos(theta), sin = Math.sin(theta);
      const ext = half + hw + 2;
      const x0 = Math.max(0, Math.floor(cx - ext)), x1 = Math.min(size - 1, Math.ceil(cx + ext));
      const y0 = Math.max(0, Math.floor(cy - ext)), y1 = Math.min(size - 1, Math.ceil(cy + ext));
      const laneCount = Math.max(3, brush.width / (1.7 * unit));
      const offset = random() * 256;
      const bend = (random() - 0.5) * 0.6 / Math.max(1, half);
      for (let y = y0; y <= y1; y++) {
        const dy = y - cy;
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const u = dx * cos + dy * sin;
          let v = -dx * sin + dy * cos;
          v -= bend * u * u;
          let b = 1, width = hw;
          if (brush.glaze) width = hw * (1 - brush.ragged * 0.5 * (1 + Math.sin(u / (5 * unit) + offset)));
          else {
            const t = (v / hw + 1) * laneCount + offset;
            const i = Math.floor(t), f = t - i;
            b = lanes[i & 255] + (lanes[(i + 1) & 255] - lanes[i & 255]) * f;
            width = hw * (1 - brush.ragged * (1 - b) * 0.6);
          }
          const cu = Math.max(Math.abs(u) - half, 0);
          const d = Math.sqrt(cu * cu + v * v);
          const cover = clamp01(width - d + 0.5);
          if (cover <= 0) continue;
          let alpha = cover * brush.opacity * (1 - brush.bristle * (1 - b));
          const along = (u + half) / (2 * half);
          if (along > 1 - brush.dry) {
            const k = (along - (1 - brush.dry)) / brush.dry;
            if (b < k) alpha *= 0.12;
          }
          const q = y * size + x;
          const g = group[q];
          if (g !== own && g >= 0) alpha *= brush.leak;
          if (alpha <= 0.003) continue;
          const at = q * 3;
          if (brush.glaze) {
            const rim = 1 + brush.rim * smooth(0.55, 1, d / Math.max(0.5, width));
            target[at] += colour[0] * alpha * rim;
            target[at + 1] += colour[1] * alpha * rim;
            target[at + 2] += colour[2] * alpha * rim;
          } else {
            const streak = 1 + (b - 0.5) * brush.streak;
            target[at] += (colour[0] * streak - target[at]) * alpha;
            target[at + 1] += (colour[1] * streak - target[at + 1]) * alpha;
            target[at + 2] += (colour[2] * streak - target[at + 2]) * alpha;
          }
        }
      }
    };
    /** Stroke centres on a jittered grid, in a shuffled order so no direction of overlap shows. */
    const centres = (spacing: number) => {
      const list: number[] = [];
      for (let y = spacing / 2; y < size; y += spacing)
        for (let x = spacing / 2; x < size; x += spacing) {
          const px = Math.min(size - 1, Math.max(0, Math.round(x + (random() - 0.5) * spacing)));
          const py = Math.min(size - 1, Math.max(0, Math.round(y + (random() - 0.5) * spacing)));
          const p = py * size + px;
          if (group[p] < 0 && !anyClear) continue;
          list.push(p);
        }
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const t = list[i]; list[i] = list[j]; list[j] = t;
      }
      return list;
    };
    const ownOf = (p: number) => (group[p] >= 0 ? group[p] : -2);
    /** Where the painting still differs from a sharper reference: there a smaller brush goes back in. */
    const errorCentres = (spacing: number, reference: Float32Array, read: (p: number) => Triple, threshold: number) => {
      const list: number[] = [];
      const step = Math.max(2, Math.round(spacing));
      for (let y0 = 0; y0 < size; y0 += step)
        for (let x0 = 0; x0 < size; x0 += step) {
          let sum = 0, n = 0, worst = -1, worstAt = -1;
          for (let y = y0; y < Math.min(size, y0 + step); y += 2)
            for (let x = x0; x < Math.min(size, x0 + step); x += 2) {
              const p = y * size + x;
              if (group[p] < 0) continue;
              const c = read(p);
              const e = Math.abs(c[0] - reference[p * 3]) + Math.abs(c[1] - reference[p * 3 + 1]) + Math.abs(c[2] - reference[p * 3 + 2]);
              sum += e; n++;
              if (e > worst) { worst = e; worstAt = p; }
            }
          if (n && sum / n > threshold) list.push(worstAt);
        }
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const t = list[i]; list[i] = list[j]; list[j] = t;
      }
      return list;
    };
    const fineBlur = await regionBlur(mix(1.5, 4, soft) * unit);
    const detail = gradeAll(fineBlur.colour);
    await tick();
    const jitterAngle = (p: number) => angle[p] + (random() - 0.5) * 0.35;
    let strokeCount = 0;

    if (medium === 'gouache') {
      canvas.set(coarse);
      const big: Brush = {
        length: mix(14, 34, soft) * unit, width: mix(5, 11, soft) * unit, opacity: 0.88, bristle: 0.45, streak: 0.13, dry: 0.3,
        leak: mix(0.04, 0.6, soft), ragged: 0.5, rim: 0, glaze: false,
      };
      const sweep: Brush = { ...big, length: big.length * 1.9, width: big.width * 1.15, dry: 0.4, streak: 0.06 };
      const list = centres(big.width * 0.72);
      for (let n = 0; n < list.length; n++) {
        if (n % 4000 === 0) await tick();
        const p = list[n];
        const x = p % size, y = (p / size) | 0;
        // A painter mixes a little more or less white and a touch warmer or cooler as they go.
        const value = 1 + (random() - 0.5) * 0.07 + (mid(x / (90 * unit) + 13, y / (60 * unit)) - 0.5) * 0.15;
        const temper = (low(x / (120 * unit) + 77, y / (120 * unit)) - 0.5) * 0.05;
        const c: Triple = [coarse[p * 3] * value + temper, coarse[p * 3 + 1] * value, coarse[p * 3 + 2] * value - temper];
        const skyward = group[p] === 0;
        stroke(canvas, x, y, skyward ? angle[p] + (random() - 0.5) * 0.12 : jitterAngle(p), c, skyward ? sweep : big, ownOf(p));
      }
      strokeCount += list.length;
      const small: Brush = { ...big, length: big.length * 0.5, width: big.width * 0.5, opacity: 0.92, bristle: 0.35, leak: big.leak * 0.5 };
      const again = errorCentres(small.width * 1.1, detail, (p) => [canvas[p * 3], canvas[p * 3 + 1], canvas[p * 3 + 2]], mix(0.06, 0.12, soft));
      for (let n = 0; n < again.length; n++) {
        if (n % 4000 === 0) await tick();
        const p = again[n];
        const value = 1 + (random() - 0.5) * 0.06;
        const c: Triple = [detail[p * 3] * value, detail[p * 3 + 1] * value, detail[p * 3 + 2] * value];
        stroke(canvas, p % size, (p / size) | 0, jitterAngle(p), c, small, ownOf(p));
      }
      strokeCount += again.length;
      // Board texture where the paint is thin.
      for (let p = 0; p < count; p++) {
        const x = p % size, y = (p / size) | 0;
        const tooth = (fine(x / (1.6 * unit) + 40, y / (1.6 * unit)) - 0.5) * 0.035;
        canvas[p * 3] += tooth; canvas[p * 3 + 1] += tooth; canvas[p * 3 + 2] += tooth;
      }
    } else if (medium === 'watercolour') {
      // Pigment density per channel; the paper is what is left. The wash is laid wet, so it
      // spreads, pools at the edge of each shape, and dries with hard tide lines where it bloomed.
      const target = new Float32Array(count * 3);
      for (let p = 0; p < count; p++)
        for (let c = 0; c < 3; c++) target[p * 3 + c] = -Math.log(Math.max(0.03, Math.min(1, coarse[p * 3 + c] / paperTone[c])));
      const wet = [0, 1, 2].map((c) => {
        const plane = new Float32Array(count);
        for (let p = 0; p < count; p++) plane[p] = target[p * 3 + c];
        return blur(plane, size, mix(2, 8, soft) * unit);
      });
      const crisp = 1 - soft;
      for (let p = 0; p < count; p++) {
        const x = p % size, y = (p / size) | 0;
        const cloud = low(x / (52 * unit) + 3, y / (44 * unit) + 9);
        const ripple = mid(x / (17 * unit) + 5, y / (17 * unit) + 31);
        const flow = cloud * 1.7 + ripple * 0.2;
        const tide = flow - Math.floor(flow);
        // Just inside a dried bloom the pigment is thickest, fading back to the wash behind it.
        const bloom = (1 - smooth(0, 0.12, tide)) - 0.35 * smooth(0.75, 1, tide);
        const pool = group[p] > 0 ? (1 - coarseBlur.weight[p]) * 0.7 : 0;
        const vary = (0.86 + 0.28 * cloud) * (1 + pool);
        for (let c = 0; c < 3; c++) {
          const t = mix(wet[c][p], target[p * 3 + c], crisp * 0.6);
          canvas[p * 3 + c] = t * vary + Math.min(t, 0.45) * 0.3 * bloom;
        }
      }
      await tick();
      // A few broad glazes over the top, each leaving its own soft-edged layer of colour.
      const wash: Brush = {
        length: mix(30, 60, soft) * unit, width: mix(14, 26, soft) * unit, opacity: 1, bristle: 0, streak: 0, dry: 0.1,
        leak: mix(0.1, 0.6, soft), ragged: 0.3, rim: 0.35, glaze: true,
      };
      const list = centres(wash.width * 1.9);
      for (let n = 0; n < list.length; n++) {
        if (n % 3000 === 0) await tick();
        const p = list[n];
        if (random() < 0.45) continue;
        const k = 0.16 + random() * 0.12;
        const c: Triple = [target[p * 3] * k, target[p * 3 + 1] * k, target[p * 3 + 2] * k];
        stroke(canvas, p % size, (p / size) | 0, jitterAngle(p), c, wash, ownOf(p));
        strokeCount++;
      }
      for (let p = 0; p < count; p++) {
        const x = p % size, y = (p / size) | 0;
        const granule = 1 + (fine(x / (2.6 * unit) + 50, y / (2.6 * unit)) - 0.5) * 0.3 + (white(x, y) - 0.5) * 0.08;
        const paper = (fine(x / (4 * unit) + 9, y / (4 * unit) + 70) - 0.5) * 0.03;
        for (let c = 0; c < 3; c++) canvas[p * 3 + c] = paperTone[c] * Math.exp(-canvas[p * 3 + c] * granule) + paper;
      }
    } else if (medium === 'poster') {
      // Cut the background into a few flat tones, as a stylist would with gouache and a ruler.
      let n = 0;
      for (let p = 0; p < count; p += 5) if (group[p] >= 0) n++;
      const samples = new Float32Array(n * 3);
      let k = 0;
      for (let p = 0; p < count; p += 5) {
        if (group[p] < 0) continue;
        samples[k * 3] = coarse[p * 3]; samples[k * 3 + 1] = coarse[p * 3 + 1]; samples[k * 3 + 2] = coarse[p * 3 + 2];
        k++;
      }
      const tones = cluster(samples, n, 8, random, 0.065);
      const flat = new Uint16Array(count);
      const region = new Int16Array(count);
      for (let p = 0; p < count; p++) {
        region[p] = group[p] >= 0 ? group[p] : 3;
        let best = 0, bestD = Infinity;
        for (let j = 0; j < tones.length; j++) {
          const t = tones[j];
          const d = (coarse[p * 3] - t[0]) ** 2 + (coarse[p * 3 + 1] - t[1]) ** 2 + (coarse[p * 3 + 2] - t[2]) ** 2;
          if (d < bestD) { bestD = d; best = j; }
        }
        flat[p] = best;
      }
      majority(flat, region, size);
      majority(flat, region, size);
      mergeSmall(flat, region, size, Math.round(260 * unit * unit));
      await tick();
      for (let p = 0; p < count; p++) {
        const t = tones[flat[p]];
        canvas[p * 3] = t[0]; canvas[p * 3 + 1] = t[1]; canvas[p * 3 + 2] = t[2];
      }
      // Dry-brush texture dragged across each flat shape.
      const drag: Brush = {
        length: mix(40, 80, soft) * unit, width: mix(7, 13, soft) * unit, opacity: 0.4, bristle: 0.9, streak: 0, dry: 0.55,
        leak: 0, ragged: 0.8, rim: 0, glaze: false,
      };
      const list = centres(drag.width * 2.6);
      for (let i = 0; i < list.length; i++) {
        if (i % 4000 === 0) await tick();
        const p = list[i];
        if (random() < 0.35) continue;
        const value = random() < 0.75 ? 0.88 : 1.08;
        const t = tones[flat[p]];
        stroke(canvas, p % size, (p / size) | 0, angle[p] + (random() - 0.5) * 0.15, [t[0] * value, t[1] * value, t[2] * value], drag, ownOf(p));
        strokeCount++;
      }
      // A flick of spatter from a loaded toothbrush.
      const flecks = Math.round(220 * mix(0.6, 1.4, mood.energy));
      for (let i = 0; i < flecks; i++) {
        const cx = random() * size, cy = random() * size;
        const p = Math.min(count - 1, Math.floor(cy) * size + Math.floor(cx));
        if (group[p] < 0) continue;
        const t = tones[flat[p]];
        const r = mix(0.6, 2, random() ** 3) * unit;
        const dark = random() < 0.7 ? 0.72 : 1.18;
        for (let yy = Math.max(0, Math.floor(cy - r - 1)); yy <= Math.min(size - 1, Math.ceil(cy + r + 1)); yy++)
          for (let xx = Math.max(0, Math.floor(cx - r - 1)); xx <= Math.min(size - 1, Math.ceil(cx + r + 1)); xx++) {
            const k = clamp01(r - Math.hypot(xx - cx, yy - cy) + 0.5) * 0.8;
            const q = yy * size + xx;
            if (k <= 0 || group[q] !== group[p]) continue;
            for (let c = 0; c < 3; c++) canvas[q * 3 + c] = mix(canvas[q * 3 + c], t[c] * dark, k);
          }
      }
      // Loose outlines drawn over the shapes, deliberately a little off them.
      const offX = Math.round(mix(2, 5, random()) * unit), offY = -Math.round(mix(1, 4, random()) * unit);
      const lineTone: Triple = mono ? [0.1, 0.1, 0.1] : [0.16, 0.13, 0.15];
      for (let y = 1; y < size - 1; y++)
        for (let x = 1; x < size - 1; x++) {
          const sx = x - offX, sy = y - offY;
          if (sx < 1 || sy < 1 || sx >= size - 1 || sy >= size - 1) continue;
          const s = sy * size + sx;
          const p = y * size + x;
          if (group[p] < 0 || group[s] < 0) continue;
          const edge = flat[s] !== flat[s + 1] || flat[s] !== flat[s + size] || group[s] !== group[s + 1] || group[s] !== group[s + size];
          if (!edge) continue;
          const pen = fine(x / (5 * unit) + 11, y / (5 * unit)) > 0.32 ? 0.75 : 0.15;
          canvas[p * 3] = mix(canvas[p * 3], lineTone[0], pen);
          canvas[p * 3 + 1] = mix(canvas[p * 3 + 1], lineTone[1], pen);
          canvas[p * 3 + 2] = mix(canvas[p * 3 + 2], lineTone[2], pen);
        }
      for (let p = 0; p < count; p++) {
        const x = p % size, y = (p / size) | 0;
        const tooth = (fine(x / (1.4 * unit) + 30, y / (1.4 * unit)) - 0.5) * 0.06 + (white(x, y) - 0.5) * 0.025;
        canvas[p * 3] += tooth; canvas[p * 3 + 1] += tooth; canvas[p * 3 + 2] += tooth;
      }
    } else {
      // Airbrush: very smooth gradients sprayed inside masked shapes, darker toward each edge.
      const sprayed = await regionBlur(mix(6, 16, soft) * unit);
      const smoothColour = gradeAll(sprayed.colour);
      for (let p = 0; p < count; p++) {
        const x = p % size, y = (p / size) | 0;
        const burn = group[p] > 0 ? (1 - sprayed.weight[p]) * 0.18 : 0;
        const speck = white(x, y);
        const l = lum([smoothColour[p * 3], smoothColour[p * 3 + 1], smoothColour[p * 3 + 2]]);
        const dot = speck < 0.035 * (1.2 - l) ? 0.88 : speck > 1 - 0.02 * l ? 1.06 : 1;
        const spray = 1 + (fine(x / (0.9 * unit) + 3, y / (0.9 * unit)) - 0.5) * 0.04 + (mid(x / (60 * unit), y / (60 * unit)) - 0.5) * 0.05;
        for (let c = 0; c < 3; c++) canvas[p * 3 + c] = smoothColour[p * 3 + c] * (1 - burn) * dot * spray;
      }
    }
    await tick();

    // The cast shadow is its own cel: a flat translucent shape laid over the background.
    {
      const bins = new Uint32Array(256);
      let n = 0;
      for (let p = 0; p < count; p++) if (id[p] === 1 || id[p] === 2) { bins[Math.min(255, Math.round(lit[p] * 196))]++; n++; }
      let acc = 0, groundBright = 1;
      for (let v = 0; v < 256; v++) { acc += bins[v]; if (acc >= n * 0.9) { groundBright = v / 196; break; } }
      const mask = new Float32Array(count);
      for (let p = 0; p < count; p++) mask[p] = (id[p] === 1 || id[p] === 2) && lit[p] < 0.6 * groundBright ? 1 : 0;
      const shape = soften(mask, size, Math.max(1.5, era.round * unit));
      const tint: Triple = mono ? [0.8, 0.8, 0.8] : [mix(0.74, 0.86, mood.warmth), mix(0.76, 0.78, mood.warmth), mix(0.92, 0.8, mood.warmth)];
      const edge = medium === 'airbrush' ? 0.12 : 0.04;
      for (let p = 0; p < count; p++) {
        if (group[p] <= 0) continue;
        const k = smooth(0.5 - edge, 0.5 + edge, shape[p]);
        if (k <= 0) continue;
        canvas[p * 3] *= mix(1, tint[0], k); canvas[p * 3 + 1] *= mix(1, tint[1], k); canvas[p * 3 + 2] *= mix(1, tint[2], k);
      }
    }
    // A soft background is a little out of focus under the camera, as on a multiplane stand.
    if (soft > 0.6 && medium !== 'poster') {
      const r = (soft - 0.6) * 5 * unit;
      for (let c = 0; c < 3; c++) {
        const plane = new Float32Array(count);
        for (let p = 0; p < count; p++) plane[p] = canvas[p * 3 + c];
        const b = blur(plane, size, r);
        for (let p = 0; p < count; p++) canvas[p * 3 + c] = b[p];
      }
    }
    await tick();

    // ---- compose the cels over the background -----------------------------------------------------
    const pixels = new Uint8ClampedArray(count * 4);
    const slipAngle = random() * Math.PI * 2;
    const slipX = Math.round(Math.cos(slipAngle) * era.slip * unit), slipY = Math.round(Math.sin(slipAngle) * era.slip * unit);
    const celShadow = (() => {
      const mask = new Float32Array(count);
      for (let p = 0; p < count; p++) mask[p] = id[p] >= CAST ? 1 : 0;
      return blur(mask, size, 2.5 * unit);
    })();
    const dropX = Math.round(2.5 * unit), dropY = Math.round(3 * unit);
    const rimWidth = 3.2 * unit;
    const halfLight: Triple = [lx, -ly, lz + 1];
    const halfLength = Math.hypot(...halfLight) || 1;
    halfLight[0] /= halfLength; halfLight[1] /= halfLength; halfLight[2] /= halfLength;
    // Highlights: only the brightest few percent of the cast, where the surface turns to the light.
    let hot = 1.1;
    {
      const bins = new Uint32Array(256);
      let n = 0;
      for (let p = 0; p < count; p++) if (id[p] >= CAST) { bins[Math.min(255, Math.round(shade[p] * 180))]++; n++; }
      let acc = 0;
      for (let v = 255; v >= 0; v--) { acc += bins[v]; if (acc >= n * 0.06) { hot = (v + 1) / 180; break; } }
    }
    const cover = (x: number, y: number, p: number) => {
      const sx = sourceX[p];
      if (sx < 0) return 0;
      const sy = sourceY[p];
      const wobX = (low(x / (18 * unit) + 40, y / (18 * unit)) - 0.5) * 2.2 * unit * era.wobble;
      const wobY = (low(x / (18 * unit), y / (18 * unit) + 40) - 0.5) * 2.2 * unit * era.wobble;
      const distance = Math.sqrt((sx - x - wobX) ** 2 + (sy - y - wobY) ** 2);
      let c = clamp01(strokeWidth[sy * size + sx] - distance + 0.5);
      // A xeroxed line breaks into streaks and toner specks rather than a smooth stroke.
      if (era.xerox && c > 0) {
        const streak = fine(x / (3.2 * unit) + 70, y / (3.2 * unit)) * 0.7 + fine(x / (1.3 * unit), y / (1.3 * unit) + 70) * 0.3;
        c *= streak > 0.33 ? 1 : 0.35;
      }
      return c;
    };
    const inkOf = (source: number): Triple => {
      const silhouette = lineKind[source] === 3;
      const self = () => (id[source] >= CAST ? selfLine(paintOf[label[source]]) : BLACK);
      switch (answers.ink) {
        case 'black': return BLACK;
        case 'brown': return BROWN;
        case 'coloured': return self();
        default: return silhouette ? BLACK : self();
      }
    };
    for (let y = 0; y < size; y++) {
      if (y % 120 === 0) await tick();
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const out = p * 4;
        let r = canvas[p * 3], g = canvas[p * 3 + 1], b = canvas[p * 3 + 2];
        if (id[p] < CAST) {
          const drop = celShadow[Math.max(0, y - dropY) * size + Math.max(0, x - dropX)] * 0.12;
          r *= 1 - drop; g *= 1 - drop; b *= 1 - drop * 0.8;
        }
        // The paint sits on the back of the cel, sometimes a hair out of register with the ink.
        const qx = Math.min(size - 1, Math.max(0, x - slipX)), qy = Math.min(size - 1, Math.max(0, y - slipY));
        const q = qy * size + qx;
        if (id[q] >= CAST && painted(id[q])) {
          const c = paintOf[label[q]];
          const s = shade[q];
          let pr = c[0], pg = c[1], pb = c[2];
          if (toneCount >= 1) {
            const band = 0.012;
            const shadow: Triple = [mix(c[0] * shadowMul[0], c[0], shadowLift), mix(c[1] * shadowMul[1], c[1], shadowLift), mix(c[2] * shadowMul[2], c[2], shadowLift)];
            let tone = shadow;
            if (toneCount >= 3) {
              const core = smooth(split * 0.6 - band, split * 0.6 + band, s);
              tone = [mix(shadow[0] * 0.7, shadow[0], core), mix(shadow[1] * 0.7, shadow[1], core), mix(shadow[2] * 0.76, shadow[2], core)];
            }
            const inLight = smooth(split - band, split + band, s);
            pr = mix(tone[0], c[0], inLight); pg = mix(tone[1], c[1], inLight); pb = mix(tone[2], c[2], inLight);
            if (toneCount >= 2) {
              const at = q * 4;
              const nh = ((normal[at] - 128) * halfLight[0] + (normal[at + 1] - 128) * halfLight[1] + (normal[at + 2] - 128) * halfLight[2]) / 127;
              const glint = smooth(hot - band, hot + band, s) * smooth(0.82, 0.86, nh);
              if (glint > 0) { pr = mix(pr, mix(c[0], 1, 0.55), glint); pg = mix(pg, mix(c[1], 0.99, 0.55), glint); pb = mix(pb, mix(c[2], 0.94, 0.55), glint); }
            }
            if (toneCount >= 4 && sourceX[q] >= 0) {
              const sx = sourceX[q], sy = sourceY[q];
              if (lineKind[sy * size + sx] === 3) {
                const at = q * 4;
                const facing = ((normal[at] - 128) * lx - (normal[at + 1] - 128) * ly + (normal[at + 2] - 128) * lz) / 127;
                const distance = Math.hypot(sx - qx, sy - qy);
                if (facing < 0.1 && distance < rimWidth + strokeWidth[sy * size + sx] && distance > strokeWidth[sy * size + sx] * 0.7) {
                  pr = mix(pr, 1, 0.7); pg = mix(pg, 0.97, 0.7); pb = mix(pb, 0.88, 0.7);
                }
              }
            }
          }
          // Cel edges with no line over them are softened a touch by the camera.
          let same = 0;
          if (qx > 0 && id[q - 1] === id[q]) same++;
          if (qx < size - 1 && id[q + 1] === id[q]) same++;
          if (qy > 0 && id[q - size] === id[q]) same++;
          if (qy < size - 1 && id[q + size] === id[q]) same++;
          const alpha = (1 + same) / 5;
          r = mix(r, pr, alpha); g = mix(g, pg, alpha); b = mix(b, pb, alpha);
        } else if (id[q] >= CAST) {
          // A cel the painters never reached: clear acetate, the background a shade cloudier.
          r = mix(r, 0.98, 0.08); g = mix(g, 0.98, 0.08); b = mix(b, 0.97, 0.08);
        }
        const lineCover = cover(x, y, p);
        if (lineCover > 0) {
          const ink = inkOf(sourceY[p] * size + sourceX[p]);
          const k = lineCover * 0.97;
          r = mix(r, ink[0], k); g = mix(g, ink[1], k); b = mix(b, ink[2], k);
        }
        pixels[out] = r * 255;
        pixels[out + 1] = g * 255;
        pixels[out + 2] = b * 255;
        pixels[out + 3] = 255;
      }
    }
    await tick();

    // ---- the finish: film, dust, tape ---------------------------------------------------------
    const finish = answers.finish;
    const grainAmp = era.grain * { clean: 0, grain: 10, dust: 3, worn: 13, video: 4 }[finish];
    const speckCount = Math.round({ clean: 0, grain: 0, dust: 110, worn: 150, video: 0 }[finish] * mix(0.6, 1.5, mood.wear));
    const hairCount = { clean: 0, grain: 0, dust: 6, worn: 7, video: 0 }[finish];
    const scratchCount = finish === 'worn' ? 2 + Math.floor(random() * 3) : 0;
    const dust = new Float32Array(count);
    const dustTone = new Float32Array(count);
    const stamp = (cx: number, cy: number, r: number, strength: number, tone: number) => {
      const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(size - 1, Math.ceil(cx + r + 1));
      const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(size - 1, Math.ceil(cy + r + 1));
      for (let yy = y0; yy <= y1; yy++)
        for (let xx = x0; xx <= x1; xx++) {
          const v = clamp01(r - Math.hypot(xx - cx, yy - cy) + 0.5) * strength;
          const i = yy * size + xx;
          if (v > dust[i]) { dust[i] = v; dustTone[i] = tone; }
        }
    };
    for (let n = 0; n < speckCount; n++) stamp(random() * size, random() * size, mix(0.5, 2.1, random() ** 2) * unit, mix(0.45, 0.95, random()), random() < 0.3 ? 236 : 30);
    for (let n = 0; n < hairCount; n++) {
      let hx = random() * size, hy = random() * size;
      let heading = random() * Math.PI * 2;
      const curl = (random() - 0.5) * 0.09, length = mix(24, 80, random()) * unit;
      const tone = random() < 0.35 ? 230 : 34;
      for (let t = 0; t < length; t++) {
        stamp(hx, hy, 0.6 * unit, 0.75, tone);
        hx += Math.cos(heading); hy += Math.sin(heading); heading += curl + (random() - 0.5) * 0.06;
      }
    }
    const scratches: number[] = [];
    for (let n = 0; n < scratchCount; n++) scratches.push(random() * size);
    await tick();
    const vignette = era.vignette * (finish === 'clean' ? 0.4 : 1) + (finish === 'worn' ? 0.32 : 0);
    const exposure = era.vignette > 0.2 ? mix(0.92, 1.06, low(123 + (context.seed % 7), 0.5)) : 1;
    const fade = finish === 'worn';
    const corner = 34 * unit;
    for (let y = 0; y < size; y++) {
      if (y % 180 === 0) await tick();
      const scan = finish === 'video' && y % 2 === 1 ? 0.9 : 1;
      for (let x = 0; x < size; x++) {
        const out = (y * size + x) * 4;
        let r = pixels[out], g = pixels[out + 1], b = pixels[out + 2];
        if (fade) {
          // Old dye fades unevenly: cyan goes first, the print drifts warm and magenta, blacks lift.
          if (mono) { r = r * 0.82 + 34; g = g * 0.8 + 30; b = b * 0.74 + 26; }
          else { r = r * 0.84 + 38; g = g * 0.78 + 28; b = b * 0.8 + 32; }
        }
        if (grainAmp) {
          const l = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
          const amount = grainAmp * (1 - Math.abs(l - 0.5) * 1.1) * mix(0.8, 1.2, low(x / (90 * unit) + 7, y / (90 * unit)));
          const n = (white(x, y) - 0.5) * amount * 0.8 + (fine(x / (1.4 * unit) + 300, y / (1.4 * unit)) - 0.5) * amount;
          r += n; g += n; b += n;
        }
        const d = dust[y * size + x];
        if (d > 0) { const t = dustTone[y * size + x]; r = mix(r, t, d * 0.85); g = mix(g, t, d * 0.85); b = mix(b, t * 1.02, d * 0.85); }
        for (const sx of scratches) {
          const along = mid(sx / 5, y / (30 * unit));
          if (along < 0.4) continue;
          const wobble = (low(sx, y / (200 * unit)) - 0.5) * 3 * unit;
          const v = clamp01(0.8 * unit - Math.abs(x - sx - wobble) + 0.5) * 0.7;
          if (v > 0) { r = mix(r, 245, v); g = mix(g, 243, v); b = mix(b, 236, v); }
        }
        if (vignette || exposure !== 1) {
          const dx = (x - size / 2) / (size / 2), dy = (y - size / 2) / (size / 2);
          let fall = 1 - vignette * clamp01((dx * dx + dy * dy) * 0.85 - 0.1);
          // An old projector gate rounds the corners of the frame into darkness.
          if (era.vignette > 0.2 && finish !== 'clean') {
            const cx = Math.max(0, Math.abs(x - size / 2) - (size / 2 - corner)), cy = Math.max(0, Math.abs(y - size / 2) - (size / 2 - corner));
            fall *= 1 - smooth(corner - 4 * unit, corner + 2 * unit, Math.hypot(cx, cy)) * 0.85;
          }
          const e = fall * exposure;
          r *= e; g *= e; b *= e;
        }
        pixels[out] = r * scan;
        pixels[out + 1] = g * scan;
        pixels[out + 2] = b * scan;
      }
    }
    if (finish === 'video') {
      // Tape colour bleeds sideways: the chroma smears while the luma stays put, and the bottom
      // of the picture tears where the heads switch.
      const planes = [0, 1, 2].map((c) => {
        const plane = new Float32Array(count);
        for (let p = 0; p < count; p++) plane[p] = pixels[p * 4 + c];
        return plane;
      });
      const rad = Math.max(1, Math.round(3 * unit));
      const tear = size - Math.round(14 * unit);
      for (let y = 0; y < size; y++) {
        if (y % 180 === 0) await tick();
        const shift = y >= tear ? Math.round((low(y / (3 * unit), 5) - 0.3) * 14 * unit) : Math.round((low(y / (40 * unit), 9) - 0.5) * 1.6 * unit);
        for (let x = 0; x < size; x++) {
          const p = y * size + x;
          const src = y * size + Math.min(size - 1, Math.max(0, x - shift));
          let sr = 0, sg = 0, sb = 0;
          for (let k = -rad; k <= rad; k++) {
            const i = y * size + Math.min(size - 1, Math.max(0, x - shift + k + rad));
            sr += planes[0][i]; sg += planes[1][i]; sb += planes[2][i];
          }
          const span = rad * 2 + 1;
          sr /= span; sg /= span; sb /= span;
          const l0 = planes[0][src] * 0.3 + planes[1][src] * 0.59 + planes[2][src] * 0.11;
          const l1 = sr * 0.3 + sg * 0.59 + sb * 0.11;
          const sat = 1.12;
          pixels[p * 4] = l0 + (sr - l1) * sat;
          pixels[p * 4 + 1] = l0 + (sg - l1) * sat;
          pixels[p * 4 + 2] = l0 + (sb - l1) * sat;
        }
      }
    }
    signal.throwIfAborted();

    const toneNames = ['flat colour', 'one shadow tone', 'a shadow and a highlight', 'shadow, core shadow and highlight', 'shadow, core, highlight and rim light'];
    const paintNames = { faithful: 'faithful', technicolor: twoStripEra ? 'two-strip Technicolor' : 'Technicolor', pastel: 'pastel', limited: 'limited gouache-tin', monochrome: 'black-and-white' };
    return {
      pixels,
      notes: [
        `${era.name}: ${paintNames[answers.paint]} cel paint in ${toneNames[toneCount]}`,
        `${answers.ink === 'mixed' ? 'black silhouette with self-coloured inner lines' : answers.ink === 'coloured' ? 'self-coloured' : answers.ink} ink, ${(base * 2).toFixed(1)} px${era.xerox ? ', xeroxed' : ''}${slipX || slipY ? ', paint off register' : ''}`,
        `${medium} background (${strokeCount} strokes), ${['crisp', 'lightly brushed', 'soft', 'very soft', 'misty'][Math.round(soft * 4)]}`,
        `${finish} finish`,
      ],
    };
  },
});
