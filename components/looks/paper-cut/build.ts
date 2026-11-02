import { type Palette, type PaletteRole, choice, clamp01, defineLook, mix, oklch, paintRGB, rekey, score, seeded } from '@conjure/kit';

/**
 * Paper cut: the frame rebuilt as a stack of cut paper sheets.
 *
 * Depth decides which sheet a pixel belongs to, identity keeps things whole against the ground,
 * colour is reduced to a small stock of papers, plain lighting or normals glue shade pieces on,
 * and the key light direction says which way every sheet drops its shadow.
 */

type RGB = [number, number, number];

const hex = (value: string): RGB => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16) / 255) as RGB;
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const luma = (c: RGB) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;

function hsl(h: number, s: number, l: number): RGB {
  h = (((h % 360) + 360) % 360) / 360;
  s = clamp01(s);
  l = clamp01(l);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

function saturate(c: RGB, amount: number): RGB {
  const y = luma(c);
  return [clamp01(y + (c[0] - y) * amount), clamp01(y + (c[1] - y) * amount), clamp01(y + (c[2] - y) * amount)];
}

/** Lighten (amount > 0) or darken (amount < 0) the way a different sheet of the same paper family would. */
function shade(c: RGB, amount: number): RGB {
  return amount >= 0
    ? [mix(c[0], 1, amount), mix(c[1], 1, amount * 0.96), mix(c[2], 1, amount * 0.9)]
    : [c[0] * (1 + amount), c[1] * (1 + amount * 0.96), c[2] * (1 + amount * 0.86)];
}

function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number, period = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const x1 = period ? (ix + 1) % period : ix + 1;
  const y1 = period ? (iy + 1) % period : iy + 1;
  const a = hash2(ix, iy, seed);
  const b = hash2(x1, iy, seed);
  const c = hash2(ix, y1, seed);
  const d = hash2(x1, y1, seed);
  return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1;
}

const triangle = (t: number) => 1 - 4 * Math.abs(t - Math.floor(t) - 0.5);

/** Box blur, in place, `passes` times. Edges clamp. */
function blur(field: Float32Array, size: number, radius: number, passes: number, scratch: Float32Array) {
  radius = Math.round(radius);
  if (radius < 1) return;
  const window = radius * 2 + 1;
  const line = new Float32Array(size + window + 1);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < size; y++) {
      const row = y * size;
      let sum = 0;
      line[0] = 0;
      for (let i = -radius; i < size + radius; i++) {
        sum += field[row + (i < 0 ? 0 : i >= size ? size - 1 : i)];
        line[i + radius + 1] = sum;
      }
      for (let x = 0; x < size; x++) scratch[row + x] = (line[x + window] - line[x]) / window;
    }
    for (let x = 0; x < size; x++) {
      let sum = 0;
      line[0] = 0;
      for (let i = -radius; i < size + radius; i++) {
        sum += scratch[(i < 0 ? 0 : i >= size ? size - 1 : i) * size + x];
        line[i + radius + 1] = sum;
      }
      for (let y = 0; y < size; y++) field[y * size + x] = (line[y + window] - line[y]) / window;
    }
  }
}

const STOCK = [
  '#d8362f', '#ef7a2a', '#f6c531', '#f3e9c9', '#8cc152', '#2f8f5b', '#2aa7a0', '#3d8fd1', '#2b4c9b',
  '#6b4aa0', '#e56aa0', '#7a4a2f', '#26262b', '#9a9a98', '#f7f5ee', '#f4a7a0', '#a9d6e8',
].map(hex);

const KRAFT = ['#1f1b19', '#4f3b2c', '#8c6a47', '#b99263', '#dcc9a3', '#f4ecda'].map(hex);
const DUSK_WARM = ['#1d1836', '#4f2757', '#a23a67', '#e4683f', '#f6a94e', '#fbdc98', '#fdf1cf'].map(hex);
const DUSK_COLD = ['#0c1a2c', '#12384f', '#1c6470', '#3f9c8c', '#8fcf9f', '#d3ecb4', '#f4f8dc'].map(hex);

/** HSL hue in degrees of a 0–1 colour. */
function hueOf([r, g, b]: RGB): number {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
}

/** Re-key 0–1 colours with the kit's 0–255 `rekey`, by index. */
function keyList(colours: RGB[], palette: Palette, roles: (PaletteRole | undefined)[]): RGB[] {
  const keyed = rekey(Object.fromEntries(colours.map((c, k) => [k, [c[0] * 255, c[1] * 255, c[2] * 255] as const])), palette, Object.fromEntries(roles.map((role, k) => [k, role])));
  return colours.map((_, k) => keyed[k].map((v) => v / 255) as RGB);
}

/**
 * Construction paper under a palette: every coloured sheet is re-keyed on its own, so it lands squarely
 * on the palette hue rather than on an offset from it; the reds, oranges, pinks, yellow, brown and
 * violet become sheets of the palette's ink, the greens, teal and blues sheets of its second. Each
 * sheet keeps its lightness, so the drawer still runs pale to deep. Cream, black, grey and white card
 * stay. Indexes follow STOCK.
 */
const STOCK_ROLES: (PaletteRole | undefined)[] = [
  'ink', 'ink', 'ink', undefined, 'second', 'second', 'second', 'second', 'second',
  'ink', 'ink', 'ink', undefined, undefined, undefined, 'ink', 'second',
];
const keyStock = (palette: Palette): RGB[] => STOCK.map((sheet, i) => {
  const role = STOCK_ROLES[i];
  return role ? keyList([sheet], palette, [role])[0] : sheet;
});
/** The dusk ramp: deep foreground on the ground, the burning middle on the ink, the glowing sky on the second. */
const DUSK_ROLES: PaletteRole[] = ['ground', 'ground', 'ink', 'ink', 'ink', 'second', 'second'];

function ramp(stops: RGB[], t: number): RGB {
  const at = clamp01(t) * (stops.length - 1);
  const low = Math.min(stops.length - 2, Math.floor(at));
  return lerp3(stops[low], stops[low + 1], at - low);
}

const BACKING = 60; // colour slot for the mount behind the scene
const FRAME = 61; // colour slot for the window mat in front of it

export default defineLook({
  questions: {
    palette: choice('Which stock of paper is the picture cut from? Coloured stocks take the picture\u2019s palette.', {
      scene: "Papers chosen to match the scene's own colours, reduced to a small tidy stock: a faithful picture-book collage.",
      construction: 'Loud school construction paper in two bright families of flat, saturated sheets. Childlike and cheerful.',
      kraft: 'Brown kraft, cream and black card with one bright accent: rustic, recycled, a market-stall poster.',
      tonal: 'One hue family stepped from deep in front to pale behind, like a layered paper landscape receding into mist.',
      horizon: 'A glowing gradient running through the layers, deep foreground to luminous sky: theatrical and romantic.',
      white: 'All white paper. Only shadows separate the sheets: a quiet architectural paper sculpture.',
      silhouette: 'Black card silhouettes over one vivid backing, like a shadow-puppet theatre or a Victorian cut profile.',
    }),
    cut: choice('How were the edges cut?', {
      scalpel: 'A sharp scalpel: exact, crisp edges that keep every corner.',
      scissors: 'Scissors: rounded, simplified shapes with a confident hand-wobble, corners snipped off.',
      torn: 'Torn by hand: ragged edges with a pale fibrous core showing along every tear.',
      deckled: 'Handmade deckle: soft feathery edges, slightly fuzzy, like sheets pulled from a mould.',
      pinking: 'Pinking shears: every edge runs in a small zigzag, crafty and playful.',
    }),
    layers: score('How many sheets deep is the stack?', [
      'Three bold sheets',
      'Four or five',
      'Six or seven',
      'Nine fine layers, like a tunnel book',
    ]),
    lift: score('How far do the sheets stand off one another?', [
      'Pasted flat, hairline shadows',
      'Slightly raised on glue dots',
      'Clearly spaced on foam pads',
      'A deep shadow box with long shadows',
    ]),
    detail: score('How much detail did the cutter keep?', [
      'A few big simple shapes',
      'Main shapes and a handful of details',
      'Careful, most features kept',
      'Intricate filigree, every small part cut out',
    ]),
    form: choice('How is roundness and shade shown inside each shape?', {
      flat: 'Not at all: one flat colour per shape, pure silhouette and pattern.',
      shade: 'A darker piece is glued wherever shadow falls, including shadows cast across the ground.',
      facets: 'Each facing plane gets its own tone, like folded papercraft: tops light, sides in two shades.',
    }),
    paper: choice('What kind of paper is it?', {
      card: 'Smooth art card with only a faint tooth.',
      sugar: 'Rough sugar paper, speckled with short coarse fibres.',
      mulberry: 'Handmade mulberry paper with long pale fibres trailing through it.',
      laid: 'Laid writing paper with fine ribbed lines and wider chain lines.',
      recycled: 'Recycled stock flecked with dark and light inclusions.',
    }),
    mount: choice('What is the scene mounted on or framed by?', {
      plain: 'A single plain backing sheet.',
      halo: 'Concentric cut rings receding behind the subject, like ripples or a glow made of paper.',
      strata: 'Wavy bands stacked behind it like distant hills or cloud banks.',
      sun: 'A plain backing with one big paper disc hung behind: a sun or a moon.',
      mat: 'A rectangular window mat in front, so the scene sits inside a shadow-box frame.',
      arch: 'An arched window cut in a front sheet, like a toy theatre proscenium or a chapel niche.',
      porthole: 'A round hole cut in a front sheet: looking through a porthole or a peephole.',
    }),
    lighting: choice('How is the finished piece lit for its photograph?', {
      raking: 'Soft side light from the scene\'s own key light: gentle, readable drop shadows.',
      overhead: 'A broad lamp from above: short, very soft shadows falling straight down.',
      spot: 'A hard single spotlight: long crisp-edged shadows, dramatic.',
      lightbox: 'Lit from behind as a light box: the back glows, front sheets fall into darkness, light spills round every edge.',
    }),
  },

  async apply(capture, a, context, signal) {
    const { size, color, identity, normal, diffuse } = capture;
    const n = size * size;
    const mood = context.mood;
    const rng = seeded((context.seed ^ 0x51ed270b) >>> 0);
    const seed = Math.floor(rng() * 1e6);
    const scratch = new Float32Array(n);
    // Yielding lets a cancelled print stop, but every yield also lets the live scene draw a
    // frame, which can cost far more than the print itself. So check often and yield rarely.
    let checkpoints = 0;
    const pause = async () => {
      signal.throwIfAborted();
      if (++checkpoints % 6 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };

    const bandCount = Math.round(mix(3, 9, a.layers));
    const detail = a.detail;
    const framed = a.mount === 'mat' || a.mount === 'arch' || a.mount === 'porthole';
    const base = framed ? 1 : 0;
    const lightbox = a.lighting === 'lightbox';

    // ---- 1. Read the capture ------------------------------------------------------------------
    const kind = new Uint8Array(n); // 0 backdrop, 1 ground or glow, 2 thing
    const depth = new Float32Array(n);
    // The backdrop colour is the commonest colour among pixels no surface claimed.
    const tally = [new Uint32Array(64), new Uint32Array(64), new Uint32Array(64)];
    let empty = 0;
    for (let p = 0; p < n; p++) {
      const id = identity[p * 4];
      depth[p] = (capture.depth[p * 4] + capture.depth[p * 4 + 1] / 256 + capture.depth[p * 4 + 2] / 65536) / 255;
      kind[p] = id === 0 ? 0 : id === 1 ? 1 : 2;
      if (id === 0) {
        empty++;
        for (let c = 0; c < 3; c++) tally[c][color[p * 4 + c] >> 2]++;
      }
    }
    const backdrop: RGB = [0.93, 0.91, 0.86];
    if (empty > 0)
      for (let c = 0; c < 3; c++) {
        let best = 0;
        for (let bin = 1; bin < 64; bin++) if (tally[c][bin] > tally[c][best]) best = bin;
        backdrop[c] = (best * 4 + 2) / 255;
      }
    // Glows, sprites and lines have no surface, but they are part of the picture: cut them too.
    const glow = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      if (kind[p] !== 0) continue;
      const dr = color[p * 4] / 255 - backdrop[0];
      const dg = color[p * 4 + 1] / 255 - backdrop[1];
      const db = color[p * 4 + 2] / 255 - backdrop[2];
      if (dr * dr + dg * dg + db * db > 0.03) {
        glow[p] = 1;
        kind[p] = 1;
      }
    }

    // Depth range: things set the scale when there are any, so the cast is what gets sliced.
    const range = (want: number) => {
      const bins = new Uint32Array(1024);
      let count = 0;
      for (let p = 0; p < n; p++)
        if (kind[p] >= want && !glow[p]) {
          bins[Math.min(1023, Math.floor(depth[p] * 1023))]++;
          count++;
        }
      if (count < n * 0.01) return null;
      let low = 0;
      let high = 1023;
      for (let seen = 0; low < 1023 && seen + bins[low] < count * 0.02; low++) seen += bins[low];
      for (let seen = 0; high > 0 && seen + bins[high] < count * 0.02; high--) seen += bins[high];
      return [low / 1023, Math.max(high, low + 1) / 1023] as const;
    };
    const all = range(1) ?? ([0, 1] as const);
    const cast = range(2);
    let near = all[0];
    let far = all[1];
    if (cast) {
      const pad = (cast[1] - cast[0]) * 0.45 + 1e-4;
      near = Math.max(all[0], cast[0] - pad);
      far = Math.min(all[1], cast[1] + pad);
    }
    const span = Math.max(1e-5, far - near);

    // Smooth depth inside each class, so bands follow broad form and not every leaf.
    const zThing = new Float32Array(n);
    const zGround = new Float32Array(n);
    const wThing = new Float32Array(n);
    const wGround = new Float32Array(n);
    const meanDepth = new Map<number, [number, number]>();
    for (let p = 0; p < n; p++) {
      const z = clamp01((depth[p] - near) / span);
      if (kind[p] === 2) {
        zThing[p] = z;
        wThing[p] = 1;
        const id = identity[p * 4];
        const sum = meanDepth.get(id) ?? [0, 0];
        sum[0] += z;
        sum[1]++;
        meanDepth.set(id, sum);
      } else if (kind[p] === 1 && !glow[p]) {
        zGround[p] = z;
        wGround[p] = 1;
      }
    }
    const depthRadius = Math.round(mix(7, 2, detail));
    blur(zThing, size, depthRadius, 2, scratch);
    blur(wThing, size, depthRadius, 2, scratch);
    blur(zGround, size, depthRadius, 2, scratch);
    blur(wGround, size, depthRadius, 2, scratch);
    await pause();

    // ---- 2. Reduce colour to a stock of papers ------------------------------------------------
    const stockCount = Math.round(mix(6, 13, detail));
    const feature = new Float32Array(n * 3);
    for (let p = 0; p < n; p++) {
      const r = color[p * 4] / 255;
      const g = color[p * 4 + 1] / 255;
      const b = color[p * 4 + 2] / 255;
      feature[p * 3] = (r + 2 * g + b) * 0.25 * 0.7;
      feature[p * 3 + 1] = r - b;
      feature[p * 3 + 2] = g - (r + b) * 0.5;
    }
    const samples: number[] = [];
    for (let y = 1; y < size; y += 3)
      for (let x = 1; x < size; x += 3) {
        const p = y * size + x;
        if (kind[p] === 0) continue;
        samples.push(p);
        if (kind[p] === 2) samples.push(p, p); // the cast matters more than the floor it stands on
      }
    if (samples.length === 0) samples.push(0);
    const centres = new Float32Array(stockCount * 3);
    {
      const distance = new Float32Array(samples.length).fill(Infinity);
      let pick = samples[Math.floor(rng() * samples.length)];
      for (let k = 0; k < stockCount; k++) {
        centres.set(feature.subarray(pick * 3, pick * 3 + 3), k * 3);
        let total = 0;
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i] * 3;
          const d =
            (feature[s] - centres[k * 3]) ** 2 + (feature[s + 1] - centres[k * 3 + 1]) ** 2 + (feature[s + 2] - centres[k * 3 + 2]) ** 2;
          if (d < distance[i]) distance[i] = d;
          total += distance[i];
        }
        let target = rng() * total;
        pick = samples[samples.length - 1];
        for (let i = 0; i < samples.length; i++) {
          target -= distance[i];
          if (target <= 0) {
            pick = samples[i];
            break;
          }
        }
      }
      const sums = new Float64Array(stockCount * 4);
      for (let round = 0; round < 9; round++) {
        sums.fill(0);
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i] * 3;
          let best = 0;
          let bestDistance = Infinity;
          for (let k = 0; k < stockCount; k++) {
            const d =
              (feature[s] - centres[k * 3]) ** 2 + (feature[s + 1] - centres[k * 3 + 1]) ** 2 + (feature[s + 2] - centres[k * 3 + 2]) ** 2;
            if (d < bestDistance) {
              bestDistance = d;
              best = k;
            }
          }
          sums[best * 4] += feature[s];
          sums[best * 4 + 1] += feature[s + 1];
          sums[best * 4 + 2] += feature[s + 2];
          sums[best * 4 + 3]++;
        }
        for (let k = 0; k < stockCount; k++)
          if (sums[k * 4 + 3] > 0) for (let c = 0; c < 3; c++) centres[k * 3 + c] = sums[k * 4 + c] / sums[k * 4 + 3];
      }
    }
    await pause();

    // Nearest paper per pixel, then a vote among neighbours of the same class: this is the
    // cutter simplifying, and it keeps thin things from dissolving into the ground behind them.
    const paperOf = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      if (kind[p] === 0) continue;
      let best = 0;
      let bestDistance = Infinity;
      for (let k = 0; k < stockCount; k++) {
        const d =
          (feature[p * 3] - centres[k * 3]) ** 2 +
          (feature[p * 3 + 1] - centres[k * 3 + 1]) ** 2 +
          (feature[p * 3 + 2] - centres[k * 3 + 2]) ** 2;
        if (d < bestDistance) {
          bestDistance = d;
          best = k;
        }
      }
      paperOf[p] = best;
    }
    const voteRadius = Math.round(mix(3, 0.6, detail)) + (a.cut === 'scissors' ? 2 : a.cut === 'torn' ? 1 : 0);
    if (voteRadius >= 1) {
      const voted = new Uint8Array(n);
      const bestVote = new Float32Array(n);
      const thingVote = new Float32Array(n);
      const groundVote = new Float32Array(n);
      for (let k = 0; k < stockCount; k++) {
        let anyThing = false;
        let anyGround = false;
        for (let p = 0; p < n; p++) {
          const mine = paperOf[p] === k;
          thingVote[p] = mine && kind[p] === 2 ? 1 : 0;
          groundVote[p] = mine && kind[p] === 1 ? 1 : 0;
          if (thingVote[p]) anyThing = true;
          if (groundVote[p]) anyGround = true;
        }
        if (!anyThing && !anyGround) continue;
        if (anyThing) blur(thingVote, size, voteRadius, 2, scratch);
        if (anyGround) blur(groundVote, size, voteRadius, 2, scratch);
        for (let p = 0; p < n; p++) {
          const vote = kind[p] === 2 ? thingVote[p] : kind[p] === 1 ? groundVote[p] : 0;
          if (vote > bestVote[p]) {
            bestVote[p] = vote;
            voted[p] = k;
          }
        }
        if (k % 4 === 3) await pause();
      }
      paperOf.set(voted);
    }
    const stock: RGB[] = [];
    for (let k = 0; k < stockCount; k++) {
      const y = centres[k * 3] / 0.7;
      const co = centres[k * 3 + 1];
      const cg = centres[k * 3 + 2];
      const g = y + cg * 0.5;
      const rb = y - cg * 0.5; // (r + b) / 2
      stock.push([clamp01(rb + co * 0.5), clamp01(g), clamp01(rb - co * 0.5)]);
    }
    await pause();

    // ---- 3. Tone pieces from light or from facing ---------------------------------------------
    const tone = new Uint8Array(n).fill(1);
    const light: RGB = [capture.light[0], -capture.light[1], capture.light[2]]; // into view space, y up
    if (a.form !== 'flat') {
      const lit = new Float32Array(n);
      let sum = 0;
      let count = 0;
      for (let p = 0; p < n; p++) {
        if (kind[p] === 0 || glow[p]) {
          lit[p] = 0.5;
          continue;
        }
        if (a.form === 'shade') lit[p] = diffuse[p * 4] / 255;
        else {
          const nx = normal[p * 4] / 127.5 - 1;
          const ny = normal[p * 4 + 1] / 127.5 - 1;
          const nz = normal[p * 4 + 2] / 127.5 - 1;
          lit[p] = nx * light[0] + ny * light[1] + nz * light[2];
        }
        sum += lit[p];
        count++;
      }
      const average = count ? sum / count : 0.5;
      for (let p = 0; p < n; p++) if (kind[p] === 0 || glow[p]) lit[p] = average;
      blur(lit, size, Math.round(mix(3, 1, detail)), 2, scratch);
      const low = a.form === 'shade' ? average * 0.7 : 0.18;
      const high = a.form === 'shade' ? Math.min(0.97, average * 1.5 + 0.1) : 0.72;
      for (let p = 0; p < n; p++) {
        if (kind[p] === 0 || glow[p]) continue;
        tone[p] = lit[p] < low ? 0 : lit[p] > high && kind[p] === 2 ? 2 : 1;
      }
    }

    // A floor that fills the frame hides the mount. Where the mount matters, the plain floor that
    // runs off the edges is cut away, leaving the cast, its plinth and its shadows on the backing.
    const openFloor =
      a.mount === 'halo' || a.mount === 'strata' || a.mount === 'sun' || a.palette === 'silhouette' || a.lighting === 'lightbox';
    if (openFloor) {
      const border: number[] = [];
      for (let i = 0; i < size; i++) border.push(i, (size - 1) * size + i, i * size, i * size + size - 1);
      const counts = new Uint32Array(stockCount);
      let floor = 0;
      for (const p of border)
        if (kind[p] === 1 && !glow[p]) {
          counts[paperOf[p]]++;
          floor++;
        }
      if (floor > border.length * 0.4) {
        let main = 0;
        for (let k = 1; k < stockCount; k++) if (counts[k] > counts[main]) main = k;
        const queue = new Int32Array(n);
        let filled = 0;
        const open = (p: number) => {
          if (kind[p] === 1 && !glow[p] && paperOf[p] === main && tone[p] === 1) {
            kind[p] = 0;
            queue[filled++] = p;
          }
        };
        for (const p of border) open(p);
        for (let head = 0; head < filled; head++) {
          const p = queue[head];
          const x = p % size;
          if (x > 0) open(p - 1);
          if (x < size - 1) open(p + 1);
          if (p >= size) open(p - size);
          if (p < n - size) open(p + size);
        }
      }
    }

    // ---- 4. Lay every pixel on a sheet --------------------------------------------------------
    // Level 0 is nearest the viewer. A window mat, when there is one, takes level 0.
    const level = new Uint8Array(n);
    const slot = new Uint8Array(n); // which paper: stock index × 3 + tone, or BACKING / FRAME
    const isThing = new Uint8Array(n);
    const tint = new Uint8Array(n); // the sheet whose colour a piece takes: a whole thing keeps one family
    const backLevel = base + bandCount;

    // Distance to the scene, for rings that echo its silhouette.
    let ringDistance: Float32Array | null = null;
    if (a.mount === 'halo') {
      ringDistance = new Float32Array(n);
      for (let p = 0; p < n; p++) ringDistance[p] = kind[p] === 0 ? 1e6 : 0;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const p = y * size + x;
          let d = ringDistance[p];
          if (x > 0) d = Math.min(d, ringDistance[p - 1] + 1);
          if (y > 0) {
            d = Math.min(d, ringDistance[p - size] + 1);
            if (x > 0) d = Math.min(d, ringDistance[p - size - 1] + 1.414);
            if (x < size - 1) d = Math.min(d, ringDistance[p - size + 1] + 1.414);
          }
          ringDistance[p] = d;
        }
      for (let y = size - 1; y >= 0; y--)
        for (let x = size - 1; x >= 0; x--) {
          const p = y * size + x;
          let d = ringDistance[p];
          if (x < size - 1) d = Math.min(d, ringDistance[p + 1] + 1);
          if (y < size - 1) {
            d = Math.min(d, ringDistance[p + size] + 1);
            if (x < size - 1) d = Math.min(d, ringDistance[p + size + 1] + 1.414);
            if (x > 0) d = Math.min(d, ringDistance[p + size - 1] + 1.414);
          }
          ringDistance[p] = d;
        }
    }
    const ringWidth = size * mix(0.07, 0.11, rng());
    const ringOffset = size * mix(0.02, 0.06, rng());
    const hills = [0, 1, 2].map((j) => ({
      height: size * (0.2 + 0.2 * j + (rng() - 0.5) * 0.08),
      swell: size * mix(0.025, 0.07, rng()),
      wave: mix(1.2, 3.2, rng()),
      phase: rng() * 7,
      tilt: (rng() - 0.5) * 0.18,
    }));
    const sunSide = Math.abs(light[0]) > 0.12 ? Math.sign(light[0]) : rng() < 0.5 ? -1 : 1;
    const sun = { x: size * (0.5 + sunSide * mix(0.2, 0.3, rng())), y: size * mix(0.17, 0.27, rng()), r: size * mix(0.1, 0.16, rng()) };
    const margin = size * mix(0.055, 0.085, rng());
    const corner = size * mix(0.0, 0.05, rng());
    const portholeRadius = size * mix(0.4, 0.46, rng());
    const inFrame = (x: number, y: number) => {
      if (a.mount === 'porthole') return Math.hypot(x - size / 2, y - size / 2) > portholeRadius;
      const left = margin;
      const right = size - margin;
      const bottom = size - margin * 1.15;
      const top = margin;
      if (x < left || x > right || y > bottom || y < top) return true;
      if (a.mount === 'arch') {
        const radius = (right - left) / 2;
        return y < top + radius && Math.hypot(x - size / 2, y - (top + radius)) > radius;
      }
      const cx = x < left + corner ? left + corner : x > right - corner ? right - corner : x;
      const cy = y < top + corner ? top + corner : y > bottom - corner ? bottom - corner : y;
      return Math.hypot(x - cx, y - cy) > corner;
    };

    // The cut: every edge in the picture is displaced by the hand that made it.
    const wobble = (0.7 + 1.5 * mood.energy) * (1 + mood.wear * 0.5);
    const displace = (x: number, y: number): [number, number] => {
      let dx = valueNoise(x / 61, y / 61, seed) * wobble;
      let dy = valueNoise(x / 61, y / 61, seed + 7) * wobble;
      if (a.cut === 'scissors') {
        dx += valueNoise(x / 34, y / 34, seed + 1) * 2.4;
        dy += valueNoise(x / 34, y / 34, seed + 2) * 2.4;
      } else if (a.cut === 'torn') {
        const rough = 1 + mood.wear * 0.6;
        dx += (valueNoise(x / 23, y / 23, seed + 1) * 3.4 + valueNoise(x / 8.5, y / 8.5, seed + 3) * 2.1 + valueNoise(x / 3.1, y / 3.1, seed + 5) * 1.1) * rough;
        dy += (valueNoise(x / 23, y / 23, seed + 2) * 3.4 + valueNoise(x / 8.5, y / 8.5, seed + 4) * 2.1 + valueNoise(x / 3.1, y / 3.1, seed + 6) * 1.1) * rough;
      } else if (a.cut === 'deckled') {
        dx += valueNoise(x / 5.2, y / 5.2, seed + 1) * 1.5 + valueNoise(x / 1.9, y / 1.9, seed + 3) * 1.0;
        dy += valueNoise(x / 5.2, y / 5.2, seed + 2) * 1.5 + valueNoise(x / 1.9, y / 1.9, seed + 4) * 1.0;
      } else if (a.cut === 'pinking') {
        dx += triangle(y / 11) * 2.8;
        dy += triangle(x / 11) * 2.8;
      }
      return [dx, dy];
    };

    for (let y = 0; y < size; y++) {
      if (y % 120 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const out = y * size + x;
        const [dx, dy] = displace(x, y);
        const fx = x + dx;
        const fy = y + dy;
        const sx = Math.max(0, Math.min(size - 1, Math.round(fx)));
        const sy = Math.max(0, Math.min(size - 1, Math.round(fy)));
        const p = sy * size + sx;
        if (framed && inFrame(fx, fy)) {
          level[out] = 0;
          tint[out] = 0;
          slot[out] = FRAME;
          continue;
        }
        if (kind[p] === 0) {
          let back = 0;
          if (ringDistance) {
            const d = ringDistance[p] + valueNoise(sx / 95, sy / 95, seed + 20) * ringWidth * 0.45 - ringOffset;
            back = Math.max(0, Math.min(3, Math.floor(d / ringWidth) + (d > 0 ? 1 : 0)));
          } else if (a.mount === 'strata') {
            back = 3;
            for (const hill of hills) {
              const crest =
                size - hill.height + Math.sin((fx / size) * hill.wave * 6.283 + hill.phase) * hill.swell + (fx - size / 2) * hill.tilt +
                valueNoise(fx / 70, hill.phase, seed + 30) * hill.swell * 0.6;
              if (fy > crest) back--;
            }
          } else if (a.mount === 'sun') back = Math.hypot(fx - sun.x, fy - sun.y) < sun.r ? 0 : 1;
          level[out] = backLevel + back;
          tint[out] = backLevel + back;
          slot[out] = BACKING;
          continue;
        }
        let z: number;
        let own = -1;
        if (glow[p]) z = 0.999;
        else if (kind[p] === 2) {
          const sum = meanDepth.get(identity[p * 4]);
          own = sum ? sum[0] / sum[1] : 0.5;
          const local = wThing[p] > 1e-4 ? zThing[p] / wThing[p] : own;
          z = mix(own, local, 0.7) - 0.5 / bandCount; // the cast stands half a sheet proud of the floor
          isThing[out] = 1;
        } else z = wGround[p] > 1e-4 ? zGround[p] / wGround[p] : 1;
        level[out] = base + Math.max(0, Math.min(bandCount - 1, Math.floor(z * bandCount)));
        tint[out] = own < 0 ? level[out] : base + Math.max(0, Math.min(bandCount - 1, Math.floor((own - 0.5 / bandCount) * bandCount)));
        slot[out] = paperOf[p] * 3 + tone[p];
      }
    }

    // ---- 5. Throw away scraps too small to cut ------------------------------------------------
    const keyOf = (p: number) => (level[p] << 9) | (slot[p] << 1) | isThing[p];
    const component = new Int32Array(n).fill(-1);
    const order = new Int32Array(n);
    const starts: number[] = [];
    {
      let filled = 0;
      for (let seedPixel = 0; seedPixel < n; seedPixel++) {
        if (component[seedPixel] >= 0) continue;
        const id = starts.length;
        const key = keyOf(seedPixel);
        starts.push(filled);
        component[seedPixel] = id;
        order[filled++] = seedPixel;
        for (let head = starts[id]; head < filled; head++) {
          const p = order[head];
          const x = p % size;
          if (x > 0 && component[p - 1] < 0 && keyOf(p - 1) === key) (component[p - 1] = id), (order[filled++] = p - 1);
          if (x < size - 1 && component[p + 1] < 0 && keyOf(p + 1) === key) (component[p + 1] = id), (order[filled++] = p + 1);
          if (p >= size && component[p - size] < 0 && keyOf(p - size) === key) (component[p - size] = id), (order[filled++] = p - size);
          if (p < n - size && component[p + size] < 0 && keyOf(p + size) === key) (component[p + size] = id), (order[filled++] = p + size);
        }
      }
      starts.push(filled);
    }
    await pause();
    const minimum = Math.round(mix(220, 9, Math.sqrt(detail)));
    for (let id = 0; id < starts.length - 1; id++) {
      const from = starts[id];
      const to = starts[id + 1];
      const area = to - from;
      const thing = isThing[order[from]] === 1;
      if (area >= (thing ? Math.max(6, minimum / 3) : minimum)) continue;
      let host = -1;
      let hostArea = 0;
      let hostSame = false;
      for (let i = from; i < to; i++) {
        const p = order[i];
        const x = p % size;
        for (const q of [x > 0 ? p - 1 : -1, x < size - 1 ? p + 1 : -1, p - size, p + size]) {
          if (q < 0 || q >= n || component[q] === id) continue;
          const other = component[q];
          const otherArea = starts[other + 1] - starts[other];
          const same = (isThing[q] === 1) === thing;
          if ((same && !hostSame) || (same === hostSame && otherArea > hostArea)) {
            host = q;
            hostArea = otherArea;
            hostSame = same;
          }
        }
      }
      // A small thing with only ground around it stays: it may be the whole subject.
      if (host < 0 || (thing && !hostSame)) continue;
      const hostLevel = level[host];
      const hostSlot = slot[host];
      const hostThing = isThing[host];
      const hostTint = tint[host];
      for (let i = from; i < to; i++) {
        level[order[i]] = hostLevel;
        slot[order[i]] = hostSlot;
        isThing[order[i]] = hostThing;
        tint[order[i]] = hostTint;
      }
    }

    // Glued-on pieces: within one sheet, smaller pieces and the cast sit on top.
    const areas = new Map<number, number>();
    for (let p = 0; p < n; p++) areas.set(keyOf(p), (areas.get(keyOf(p)) ?? 0) + 1);
    const rank = new Uint8Array(n);
    for (let p = 0; p < n; p++)
      rank[p] = isThing[p] * 64 + Math.max(0, Math.min(63, 24 - Math.floor(Math.log2((areas.get(keyOf(p)) ?? 1) + 1))));
    let maxLevel = 0;
    for (let p = 0; p < n; p++) if (level[p] > maxLevel) maxLevel = level[p];
    await pause();

    // ---- 6. Choose the papers -----------------------------------------------------------------
    const vivid = 0.75 + mood.cheer * 0.5;
    // Under the picture's palette, tonal and silhouette take their hue from its ink (silhouette's vivid
    // backing lands on it) and only as much vividness as the ink has; kraft's accent is the ink; the
    // construction drawer and the dusk ramp are re-keyed; scene, white and the kraft card are left as made.
    const palette = context.palette;
    const inkPaint = palette ? paintRGB(palette.ink).map((v) => v / 255) as RGB : undefined;
    const hue = inkPaint ? hueOf(inkPaint) - (a.palette === 'silhouette' ? 40 : 0) : 232 + mood.warmth * 150; // blue, through violet and rose, to orange
    const tinted = inkPaint ? vivid * clamp01(oklch(paintRGB(palette!.ink))[1] / 0.1) : vivid;
    const stockPapers = palette && a.palette === 'construction' ? keyStock(palette) : STOCK;
    const duskStops = DUSK_COLD.map((cold, i) => lerp3(cold, DUSK_WARM[i], mood.warmth));
    const horizonStops = palette && a.palette === 'horizon' ? keyList(duskStops, palette, DUSK_ROLES) : duskStops;
    const backingBase: RGB = (() => {
      switch (a.palette) {
        case 'scene':
          return saturate(shade(backdrop, 0.12), 0.9);
        case 'construction': {
          const options = [stockPapers[16], stockPapers[3], stockPapers[2], stockPapers[15], stockPapers[6]];
          return options[Math.floor(rng() * options.length)];
        }
        case 'kraft':
          return rng() < 0.65 ? KRAFT[3] : KRAFT[4];
        case 'tonal':
          return hsl(hue, 0.3 * tinted, 0.9);
        case 'horizon':
          return horizonStops[5];
        case 'white':
          return [0.955, 0.948, 0.925];
        default:
          return hsl(hue + 40, 0.7 * tinted, 0.6);
      }
    })();
    const designedAccent = mood.warmth > 0.5 ? hex('#cf4327') : hex('#1f8087');
    const accent = palette ? keyList([designedAccent], palette, ['ink'])[0] : designedAccent;
    let accentPaper = -1;
    {
      let strongest = 0.22;
      for (let k = 0; k < stockCount; k++) {
        const c = stock[k];
        const chroma = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
        if (chroma > strongest) {
          strongest = chroma;
          accentPaper = k;
        }
      }
    }
    const colours = new Map<number, RGB>();
    const paperColour = (lvl: number, s: number, thing: number): RGB => {
      const key = (lvl * 64 + s) * 2 + thing;
      let c = colours.get(key);
      if (c) return c;
      if (s === FRAME) {
        c =
          a.palette === 'white'
            ? [0.97, 0.965, 0.95]
            : a.palette === 'kraft'
              ? KRAFT[1]
              : a.palette === 'construction'
                ? stockPapers[12]
                : a.palette === 'silhouette'
                  ? [0.07, 0.065, 0.08]
                  : a.palette === 'tonal'
                    ? hsl(hue, 0.4 * tinted, 0.14)
                    : a.palette === 'horizon'
                      ? horizonStops[0]
                      : luma(backdrop) > 0.5
                        ? [0.96, 0.945, 0.9]
                        : [0.13, 0.12, 0.13];
      } else if (s === BACKING) {
        const back = lvl - backLevel; // 0 is the nearest piece of the mount
        const step = maxLevel > backLevel ? back / (maxLevel - backLevel) : 0;
        if (a.palette === 'white') c = shade(backingBase, -0.012 * back);
        else if (a.palette === 'horizon') {
          c = saturate(ramp(horizonStops, 0.72 + 0.28 * (maxLevel > backLevel ? step : 1)), vivid);
        } else if (a.palette === 'silhouette') c = hsl(hue + 40 - back * 9, 0.75 * tinted, 0.5 + 0.11 * back + (maxLevel > backLevel ? 0 : 0.12));
        else if (a.palette === 'tonal') c = hsl(hue + back * 4, 0.34 * tinted, 0.74 + 0.06 * back + (maxLevel > backLevel ? 0 : 0.14));
        else if (a.mount === 'sun' && back === 0) c = a.palette === 'kraft' ? accent : a.palette === 'construction' ? stockPapers[2] : shade(saturate(lerp3(backingBase, hex('#f6c95a'), 0.75), 1.1), 0.05);
        else {
          const direction = luma(backingBase) > 0.55 ? -1 : 1;
          c = shade(backingBase, direction * 0.085 * (maxLevel > backLevel ? maxLevel - backLevel - back : 0));
        }
      } else {
        const paper = Math.floor(s / 3);
        const tn = s % 3;
        const raw = stock[paper];
        const f = bandCount > 1 ? (lvl - base) / (bandCount - 1) : 0; // 0 front … 1 back
        const brightness = luma(raw);
        const toned = (colour: RGB) => (tn === 0 ? shade(colour, -0.26) : tn === 2 ? shade(colour, 0.2) : colour);
        switch (a.palette) {
          case 'scene':
            c = lerp3(toned(saturate(raw, 1.05 + mood.cheer * 0.3)), backingBase, 0.16 * f);
            break;
          case 'construction': {
            let best = 0;
            const chroma = Math.max(raw[0], raw[1], raw[2]) - Math.min(raw[0], raw[1], raw[2]);
            if (chroma < 0.13) {
              // Grey things get whatever loud sheet was nearest to hand, light for light and dark for dark.
              const drawer = brightness > 0.72 ? [3, 14, 2, 16, 15] : brightness > 0.36 ? [1, 4, 6, 7, 10, 0] : [8, 9, 11, 12, 5];
              best = drawer[(paper * 7 + seed) % drawer.length];
            } else {
              let bestDistance = Infinity;
              const want = saturate(raw, 1.5);
              for (let i = 0; i < STOCK.length; i++) {
                const d = (want[0] - STOCK[i][0]) ** 2 + (want[1] - STOCK[i][1]) ** 2 + (want[2] - STOCK[i][2]) ** 2;
                if (d < bestDistance) {
                  bestDistance = d;
                  best = i;
                }
              }
            }
            c = toned(stockPapers[best]);
            break;
          }
          case 'kraft':
            c = toned(paper === accentPaper ? accent : ramp(KRAFT, clamp01(brightness * 1.15 - 0.05 + (f - 0.5) * 0.12)));
            break;
          case 'tonal':
            c = toned(hsl(hue + (brightness - 0.5) * 40, (0.5 - f * 0.18 + (thing ? 0.12 : 0)) * tinted, clamp01(0.16 + 0.44 * f + (brightness - 0.5) * 0.6)));
            break;
          case 'horizon': {
            c = toned(saturate(ramp(horizonStops, clamp01(f * 0.55 + (brightness - 0.5) * 0.5 + (thing ? 0.2 : 0.1))), vivid));
            break;
          }
          case 'white': {
            const v = 0.955 - (1 - brightness) * 0.05 - (tn === 0 ? 0.05 : 0) + (tn === 2 ? 0.02 : 0);
            c = [v, v - 0.004, v - 0.02 + f * 0.012];
            break;
          }
          default: {
            // The cast is black card; whatever floor survives is a dim tinted sheet beneath it.
            const v = thing
              ? 0.06 + 0.05 * f + brightness * 0.05 + (tn === 2 ? 0.05 : tn === 0 ? -0.02 : 0)
              : 0.2 + 0.14 * f + brightness * 0.08 + (tn === 0 ? -0.07 : 0);
            c = hsl(hue + 30, (thing ? 0.25 : 0.45 * vivid) * (inkPaint ? tinted / vivid : 1), v);
          }
        }
      }
      // Old paper fades and yellows.
      c = lerp3(saturate(c, 1 - mood.wear * 0.3), [0.86, 0.8, 0.66], mood.wear * 0.13);
      colours.set(key, c);
      return c;
    };

    // ---- 7. Paper texture ---------------------------------------------------------------------
    const texture = new Float32Array(n);
    {
      const grain = a.paper === 'card' ? 0.35 : a.paper === 'laid' ? 0.5 : 0.8;
      for (let p = 0; p < n; p++) texture[p] = (hash2(p % size, (p / size) | 0, seed + 40) - 0.5) * 2 * grain;
      blur(texture, size, 1, 1, scratch);
      const stroke = (count: number, shortest: number, longest: number, weight: number, curl: number) => {
        for (let i = 0; i < count; i++) {
          let x = rng() * size;
          let y = rng() * size;
          let angle = rng() * 6.283;
          const length = mix(shortest, longest, rng() * rng());
          const value = (rng() < 0.75 ? 1 : -0.7) * weight * mix(0.5, 1, rng());
          const bend = (rng() - 0.5) * curl;
          for (let step = 0; step < length; step++) {
            const px = ((Math.round(x) % size) + size) % size;
            const py = ((Math.round(y) % size) + size) % size;
            texture[py * size + px] += value;
            x += Math.cos(angle);
            y += Math.sin(angle);
            angle += bend + (rng() - 0.5) * curl;
          }
        }
      };
      if (a.paper === 'sugar') stroke(26000, 2, 9, 0.9, 0.5);
      if (a.paper === 'mulberry') {
        stroke(2600, 25, 120, 1.25, 0.09);
        stroke(5000, 3, 12, 0.6, 0.4);
      }
      if (a.paper === 'recycled') {
        stroke(2600, 1, 5, -2.2, 0.8);
        stroke(1800, 1, 4, 1.8, 0.8);
        stroke(500, 6, 22, 1.0, 0.2);
      }
      if (a.paper === 'laid')
        for (let p = 0; p < n; p++) {
          const x = p % size;
          const y = (p / size) | 0;
          texture[p] += Math.sin(y * 1.5708) * 0.3 + (x % 48 < 2 ? -0.55 : 0);
        }
      if (a.paper !== 'card' && a.paper !== 'laid') blur(texture, size, 1, 1, scratch);
      // Cloudy unevenness in the pulp, periodic so a sheet can start anywhere in the texture.
      const cells = 20;
      const cloud = size / cells;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
          texture[y * size + x] += valueNoise(x / cloud, y / cloud, seed + 41, cells) * (a.paper === 'card' ? 0.25 : 0.6);
    }
    const textureAmount = { card: 0.03, sugar: 0.075, mulberry: 0.085, laid: 0.05, recycled: 0.07 }[a.paper];
    await pause();

    // ---- 8. Shadows between sheets ------------------------------------------------------------
    const lift = a.palette === 'white' ? Math.max(0.3, a.lift) : a.lift;
    const unit = mix(1.3, 8.5, lift) * (a.lighting === 'spot' ? 1.5 : a.lighting === 'overhead' ? 0.8 : 1);
    const softness = a.lighting === 'spot' ? 0.22 : a.lighting === 'overhead' ? 1.1 : 0.55;
    let fallX = -capture.light[0];
    let fallY = -capture.light[1];
    if (a.lighting === 'overhead') (fallX = fallX * 0.15), (fallY = 1);
    const fallLength = Math.hypot(fallX, fallY);
    if (fallLength < 0.08) (fallX = 0.5), (fallY = 0.86);
    else (fallX /= fallLength), (fallY /= fallLength);

    const shadow = new Float32Array(n); // 0 none … 1 full; in a light box this holds spilled light instead
    const mask = new Float32Array(n);
    const sampleMask = (x: number, y: number) => {
      const sx = x < 0 ? 0 : x > size - 1 ? size - 1 : x;
      const sy = y < 0 ? 0 : y > size - 1 ? size - 1 : y;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(size - 1, x0 + 1);
      const y1 = Math.min(size - 1, y0 + 1);
      const tx = sx - x0;
      const ty = sy - y0;
      return (
        (mask[y0 * size + x0] * (1 - tx) + mask[y0 * size + x1] * tx) * (1 - ty) +
        (mask[y1 * size + x0] * (1 - tx) + mask[y1 * size + x1] * tx) * ty
      );
    };
    const present = new Uint8Array(maxLevel + 2);
    for (let p = 0; p < n; p++) present[level[p]] = 1;
    for (let receiver = lightbox ? 0 : 1; receiver <= maxLevel; receiver++) {
      if (!present[receiver]) continue;
      await pause();
      if (lightbox) {
        // Light from the back wall leaks round the edge of every sheet in front of it.
        for (let p = 0; p < n; p++) mask[p] = level[p] > receiver ? 1 : 0;
        blur(mask, size, Math.max(2, unit * 0.9), 2, scratch);
        for (let p = 0; p < n; p++) if (level[p] === receiver) shadow[p] = mask[p];
        continue;
      }
      // Everything nearer than this sheet shadows it; sheets two or more up throw longer, softer shadows.
      for (let reach = 1; reach <= 2; reach++) {
        let any = false;
        for (let p = 0; p < n; p++) {
          mask[p] = level[p] <= receiver - reach ? 1 : 0;
          any ||= mask[p] === 1;
        }
        if (!any) break;
        const throwBy = unit * (reach === 1 ? 1 : 2.5);
        blur(mask, size, Math.max(1, unit * softness * (reach === 1 ? 1 : 2.1)), 2, scratch);
        const strength = reach === 1 ? 0.78 : 0.55;
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++) {
            const p = y * size + x;
            if (level[p] !== receiver) continue;
            const cast = sampleMask(x - fallX * throwBy, y - fallY * throwBy) * strength;
            shadow[p] = 1 - (1 - shadow[p]) * (1 - cast);
          }
      }
    }
    await pause();

    // ---- 9. Print -----------------------------------------------------------------------------
    const pixels = new Uint8ClampedArray(n * 4);
    const shadowTint: RGB = lerp3([0.2, 0.24, 0.42], [0.36, 0.2, 0.2], mood.warmth);
    const shadowDepth = a.palette === 'white' ? 0.62 : a.palette === 'silhouette' ? 0.55 : 0.64;
    const lamp: RGB = lerp3([0.86, 0.95, 1.0], [1.0, 0.9, 0.66], mood.warmth * 0.75 + 0.25);
    const core: RGB = a.palette === 'kraft' ? [0.86, 0.78, 0.64] : [0.97, 0.955, 0.92];
    const creases = Array.from({ length: Math.floor(mood.wear * 3.6) }, () => {
      const angle = rng() * 3.1416;
      return { nx: Math.cos(angle), ny: Math.sin(angle), offset: mix(0.2, 0.8, rng()) * size * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))) };
    });
    const at = (x: number, y: number) => (y < 0 ? 0 : y > size - 1 ? size - 1 : y) * size + (x < 0 ? 0 : x > size - 1 ? size - 1 : x);
    const rx = Math.round(fallX);
    const ry = Math.round(fallY);
    const stepX = rx === 0 && ry === 0 ? 0 : rx;
    const stepY = rx === 0 && ry === 0 ? 1 : ry;
    const rim = lightbox ? 0 : a.cut === 'torn' ? 4.6 : a.cut === 'deckled' ? 2.2 : 0;
    const ring = [[1, 0], [0.71, 0.71], [0, 1], [-0.71, 0.71], [-1, 0], [-0.71, -0.71], [0, -1], [0.71, -0.71]];

    for (let y = 0; y < size; y++) {
      if (y % 90 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const lvl = level[p];
        const s = slot[p];
        let [r, g, b] = paperColour(tint[p], s, isThing[p]);

        // Each sheet is its own piece of paper: its fibres do not line up with its neighbours'.
        const sheet = lvl * 64 + s;
        const ox = (sheet * 131) % size;
        const oy = (sheet * 277) % size;
        const tx = (x + ox) % size;
        const ty = (y + oy) % size;
        const turned = sheet % 2 === 1;
        const here = turned ? texture[tx * size + ty] : texture[ty * size + tx];
        const bx = (tx + 1) % size;
        const by = (ty + 1) % size;
        const beside = turned ? texture[bx * size + by] : texture[by * size + bx];
        const darkPaper = luma([r, g, b]) < 0.3;
        let gain = 1 + here * textureAmount * (darkPaper ? 1.8 : 1) + (here - beside) * textureAmount * 0.9;

        // Torn and deckled edges show the pale core of the sheet.
        if (rim > 0) {
          const width = Math.max(0, (valueNoise(x / 6.3, y / 6.3, seed + 50) * 0.5 + 0.5) * rim - (a.cut === 'torn' ? 0.9 : 0.4));
          if (width > 0.5) {
            let exposed = 0;
            for (let i = 0; i < 8; i++) {
              const q = at(Math.round(x + ring[i][0] * width), Math.round(y + ring[i][1] * width));
              // Between sheets the whole tear shows; a glued piece shows only a thin trace of it.
              if (level[q] > lvl) exposed += 1;
              else if (level[q] === lvl && rank[q] + 2 < rank[p] && a.cut === 'torn') exposed += 0.3;
            }
            if (exposed >= 0.9) {
              const amount = Math.min(1, exposed / 3) * (a.cut === 'torn' ? 0.8 : 0.4) * (0.75 + here * 0.25);
              r = mix(r, core[0], amount);
              g = mix(g, core[1], amount);
              b = mix(b, core[2], amount);
            }
          }
        }

        // The thickness of the sheet: a bright lip toward the light, a dark one away from it.
        const toward = at(x - stepX, y - stepY);
        const away = at(x + stepX, y + stepY);
        let lip = 0;
        if (!lightbox) {
          if (level[toward] > lvl) (gain += 0.1), (lip = 0.05);
          else if (level[away] > lvl) gain -= 0.1;
          // Glued pieces cast a hairline shadow on the sheet they sit on.
          for (let reach = 1; reach <= 2; reach++) {
            const q = at(x - stepX * reach, y - stepY * reach);
            if (level[q] === lvl && rank[q] > rank[p]) {
              gain -= (reach === 1 ? 0.2 : 0.1) * (0.5 + lift * 0.5);
              break;
            }
          }
          if (level[toward] === lvl && rank[toward] < rank[p]) gain += 0.045;
        }

        if (lightbox) {
          // Backlit paper is translucent: what shows is mostly how many sheets the light came
          // through, washed with the sheet's own colour.
          const f = maxLevel > 0 ? lvl / maxLevel : 1;
          const backWall = lvl >= backLevel ? 1 : 0;
          const glowing = mix(0.15, 0.95, Math.pow(f, 1.3)) + backWall * 0.1;
          const spill = shadow[p] * mix(0.8, 0.3, f);
          const paperLight = Math.min(1.35, glowing + spill) * gain;
          r = mix(r, 0.97, 0.5) * paperLight * lamp[0] + spill * lamp[0] * 0.2;
          g = mix(g, 0.95, 0.5) * paperLight * lamp[1] + spill * lamp[1] * 0.2;
          b = mix(b, 0.9, 0.5) * paperLight * lamp[2] + spill * lamp[2] * 0.2;
        } else {
          const dark = shadow[p] * shadowDepth;
          r = (r * gain + lip) * (1 - dark * (1 - shadowTint[0]));
          g = (g * gain + lip) * (1 - dark * (1 - shadowTint[1]));
          b = (b * gain + lip) * (1 - dark * (1 - shadowTint[2]));
        }

        // Age: fold lines catching the light, and tea-coloured blooms.
        for (const crease of creases) {
          const d = x * crease.nx + y * crease.ny - crease.offset;
          if (d > -3 && d < 3) {
            const fold = (d < 0 ? 0.09 : -0.11) * (1 - Math.abs(d) / 3) * (0.6 + mood.wear * 0.5);
            r += fold;
            g += fold;
            b += fold;
          }
        }
        if (mood.wear > 0.4) {
          const stain = clamp01(valueNoise(x / 120, y / 120, seed + 60) * 1.4 + valueNoise(x / 27, y / 27, seed + 61) * 0.5 - 0.6) * (mood.wear - 0.4) * 0.8;
          r *= 1 - stain * 0.3;
          g *= 1 - stain * 0.42;
          b *= 1 - stain * 0.62;
        }

        pixels[p * 4] = r * 255;
        pixels[p * 4 + 1] = g * 255;
        pixels[p * 4 + 2] = b * 255;
        pixels[p * 4 + 3] = 255;
      }
    }

    return {
      pixels,
      notes: [
        `${bandCount} sheets of ${a.paper} paper in ${a.palette} stock, ${stockCount} colours`,
        `${a.cut} edges, ${a.form} form, mounted ${a.mount}`,
        `${a.lighting} lighting, lift ${Math.round(a.lift * 100)}%`,
      ],
    };
  },
});
