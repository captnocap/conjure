import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

type RGB = readonly [number, number, number];
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

interface Stock {
  /** The sheets of glass the glazier has to hand. */
  glass: RGB[];
  /** What the open backdrop is glazed with. */
  ground: RGB[];
  border: [RGB, RGB];
  clear: RGB;
  /** How firmly a piece is pulled to the nearest sheet, 0 keeps the scene's own colour. */
  snap: number;
  saturate: number;
}
const stock = (glass: string[], ground: string[], border: [string, string], clear: string, snap: number, saturate: number): Stock => ({
  glass: glass.map(hex),
  ground: ground.map(hex),
  border: [hex(border[0]), hex(border[1])],
  clear: hex(clear),
  snap,
  saturate,
});

const STOCKS = {
  jewel: stock(
    ['#b3122a', '#1a3fa8', '#1c7a3e', '#e8a81c', '#6a2a8c', '#ece6cf', '#e6b98f', '#4f86d9', '#7a4a1f', '#d9621e'],
    ['#1a3fa8', '#16358f', '#2450bd', '#1a3fa8', '#b3122a'],
    ['#b3122a', '#e8a81c'],
    '#e6e4cf',
    0.72,
    2.1,
  ),
  opal: stock(
    ['#efe4c2', '#e9a779', '#7d9a4a', '#3f8f8c', '#9b83c4', '#2f4f9b', '#d98a26', '#cf6d86', '#6d4428', '#b7d3c6', '#f3d27a'],
    ['#9cc3e0', '#c9dceb', '#f0d9b8', '#e9b99a'],
    ['#7d9a4a', '#d98a26'],
    '#efe9d2',
    0.55,
    1.7,
  ),
  deco: stock(
    ['#e0a030', '#55585c', '#dfe6e2', '#1f5a5c', '#c8d2cf', '#d9621e', '#a9cdb0', '#17191b', '#f1ddb0'],
    ['#dfe6e2', '#d2dcd8', '#e6eae4', '#c8d2cf', '#edd9a3'],
    ['#17191b', '#e0a030'],
    '#e2e9e5',
    0.8,
    1.3,
  ),
  grisaille: stock(
    ['#dfe3d2', '#b9bfb0', '#e8c040', '#a9c2d6', '#d9b7ad', '#8a6a40', '#f1efe2', '#c9a13a', '#7e8a86'],
    ['#dfe3d2', '#d5dbc9', '#e6e8da', '#dfe3d2', '#e8c040'],
    ['#e8c040', '#a9c2d6'],
    '#e3e6d6',
    0.88,
    1.0,
  ),
  dalle: stock(
    ['#d81e1e', '#f2c40f', '#1746c9', '#0e8f4e', '#f26a0f', '#7a1fa2', '#f4f0e0', '#12a5b5', '#e0308a'],
    ['#1746c9', '#1a2f9e', '#4a1f9a', '#12a5b5', '#1746c9'],
    ['#f2c40f', '#d81e1e'],
    '#f1eedd',
    0.9,
    2.4,
  ),
  ember: stock(
    ['#a80f1e', '#e2551a', '#f0a020', '#5c1f6e', '#2a2466', '#f2d9a0', '#7a1512', '#c93a5a', '#f6ead0'],
    ['#5c1f6e', '#2a2466', '#7a1b58', '#a80f1e', '#3b2380'],
    ['#f0a020', '#a80f1e'],
    '#f3e3c0',
    0.75,
    2.0,
  ),
  true: stock([], [], ['#c9a13a', '#3b6ea8'], '#e8e8dc', 0, 1.9),
} as const satisfies Record<string, Stock>;

/** A repeatable hash of a lattice point, in [0, 1). */
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

const KIND_STONE = 0, KIND_BORDER = 1, KIND_GROUND = 2, KIND_PICTURE = 3;

export default defineLook({
  questions: {
    glass: choice('What glass is the window made from?', {
      jewel: 'Medieval cathedral glass: ruby, cobalt, emerald and gold on a deep blue ground. Solemn, sacred, royal.',
      opal: 'Opalescent Tiffany glass: milky peach, moss, teal and lavender under a soft sky. Gardens, lamps, gentle nostalgia.',
      deco: 'Art Deco door glass: clear and frosted panes with amber, smoke grey, teal and black. Hotels, bars, city nights.',
      grisaille: 'Pale grisaille: nearly colourless greenish-white glass with touches of silver-stain yellow. Quiet, scholarly, wintry.',
      dalle: 'Modern slab glass: hot primaries, turquoise and violet, loud and flat. Mid-century chapels, optimism, pop.',
      ember: 'Sunset glass: blood red, orange and amber against violet and indigo. Passion, endings, fire, apocalypse.',
      true: 'Glass matched to the scene: each piece keeps the colour of what it shows, only richer.',
    }),
    leading: choice('How is the open background behind the subject glazed?', {
      diamond: 'A lattice of tall diamond quarries, like a Tudor casement.',
      squares: 'Plain rectangular panes in offset courses, like brickwork.',
      rays: 'Rays and rings bursting outward from the subject, a halo or glory.',
      crackle: 'Irregular hand-cut shards fitted like crazy paving.',
      scales: 'Overlapping fish scales or feathers in rows.',
      roundels: 'Rows of bullseye roundels, bottle bottoms with small fillers between.',
    }),
    pieces: score('How large are the pieces of glass that make up the subject?', [
      'A fine mosaic of tiny chips',
      'Small',
      'Medium',
      'Large',
      'A few bold slabs',
    ]),
    cames: score('How heavy is the leading between the pieces?', [
      'Hairline copper foil',
      'Slender lead',
      'Ordinary lead cames',
      'Thick lead',
      'Massive black bars, like glass set in concrete',
    ]),
    paint: choice('How much is painted onto the glass in dark grisaille?', {
      none: 'Nothing: pure cut colour, a mosaic of light.',
      trace: 'Thin brush-drawn trace lines pick out edges and folds only.',
      stipple: 'Trace lines plus stippled, grainy shading that models the forms.',
      hatch: 'Trace lines plus hatched strokes that follow each surface.',
      wash: 'Smoothly blended painted shadow, pictorial and Victorian, almost a painting on glass.',
    }),
    texture: choice('What is the surface of the glass like?', {
      antique: 'Mouth-blown antique: faint streaks and the odd bubble.',
      streaky: 'Streaky and marbled: two tones swirled through each piece.',
      seedy: 'Seedy: full of small trapped bubbles that sparkle.',
      hammered: 'Hammered: a tight pattern of dimples that scatter the light.',
      ripple: 'Water glass: long wavy ripples across each piece.',
    }),
    shape: choice('What is the shape of the window opening?', {
      panel: 'A square panel filling the frame, as in a door or a museum light box.',
      lancet: 'A tall pointed Gothic lancet set in dark stone.',
      round: 'A round-headed Romanesque arch set in dark stone.',
      rose: 'A circular rose window set in dark stone.',
    }),
    border: choice('What runs around the edge of the window?', {
      none: 'Nothing: the picture runs straight to the frame.',
      fillet: 'A plain narrow strip of one colour in long lengths.',
      jewelled: 'A border of short alternating blocks in two rich colours.',
      clear: 'A margin of pale clear glass.',
    }),
    behind: choice('What is behind the glass, lighting it?', {
      sky: 'An even bright sky: every piece glows steadily.',
      sun: 'The sun itself, low behind the window: one blinding patch with a wide halo, the rest deeper.',
      leaves: 'Trees outside: dappled moving shadows of branches and leaves across the glass.',
      lamp: 'A single lamp inside a dark building, seen from the street at night: a warm pool fading to near black.',
      overcast: 'A heavy grey day: dull, even, the colours deep and the lead dominant.',
    }),
  },

  async apply(capture, a, context, signal) {
    const n = capture.size;
    const N = n * n;
    const { color, normal, depth, identity, diffuse } = capture;
    const mood = context.mood;
    const seed = (context.seed % 100_000) + 17;
    const random = seeded(context.seed ^ 0x5a17ed);
    const P: Stock = STOCKS[a.glass];
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };

    // ---------------------------------------------------------------- the opening
    const S = Math.round(mix(15, 58, a.pieces)); // spacing of the subject's pieces
    const groundStep = Math.max(34, S * 1.7);
    const half = mix(0.8, 4.4, a.cames); // half-width of an ordinary came
    const outline = 1.3; // identity outlines are heavier by this factor
    const margin = a.shape === 'panel' ? 5 : 12;
    const W = n / 2 - margin;
    const cx = n / 2, cy = n / 2;
    const bandWidth = a.border === 'none' ? 0 : a.border === 'jewelled' ? Math.round(n * 0.04) : a.border === 'clear' ? Math.round(n * 0.045) : Math.round(n * 0.028);
    const bandLength = a.border === 'jewelled' ? bandWidth * 1.5 : a.border === 'clear' ? bandWidth * 2.6 : bandWidth * 5.5;
    const lancetR = W * 1.75;
    const springY = a.shape === 'lancet' ? margin + Math.sqrt(lancetR * lancetR - (lancetR - W) ** 2) : margin + W;
    let perimeter = 0;
    /** Signed distance to the opening's edge, negative inside. Sets `perimeter`, a coordinate along the edge. */
    const opening = (x: number, y: number): number => {
      const dx = x - cx, dy = y - cy;
      if (a.shape === 'rose') {
        perimeter = Math.atan2(dy, dx) * W + 20_000;
        return Math.hypot(dx, dy) - W;
      }
      if (a.shape !== 'panel' && y < springY) {
        if (a.shape === 'round') {
          perimeter = Math.atan2(y - springY, dx) * W + 20_000;
          return Math.hypot(dx, y - springY) - W;
        }
        const ox = dx < 0 ? cx + (lancetR - W) : cx - (lancetR - W);
        perimeter = Math.atan2(y - springY, x - ox) * lancetR + (dx < 0 ? 20_000 : 30_000);
        return Math.hypot(x - ox, y - springY) - lancetR;
      }
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax > ay) perimeter = y + (dx > 0 ? 2000 : 0);
      else perimeter = x + (dy > 0 ? 6000 : 4000);
      return Math.max(ax, ay) - W;
    };

    // ---------------------------------------------------------------- features
    const cr = new Float32Array(N), cg = new Float32Array(N), cb = new Float32Array(N);
    const dep = new Float32Array(N);
    let heroX = 0, heroY = 0, heroCount = 0;
    let nearest = 1, farthest = 0;
    for (let p = 0; p < N; p++) {
      cr[p] = color[p * 4] / 255;
      cg[p] = color[p * 4 + 1] / 255;
      cb[p] = color[p * 4 + 2] / 255;
      const id = identity[p * 4];
      if (id > 0) {
        const d = (depth[p * 4] * 65536 + depth[p * 4 + 1] * 256 + depth[p * 4 + 2]) / 16777216;
        dep[p] = d;
        if (d < nearest) nearest = d;
        if (d > farthest) farthest = d;
      }
      if (id >= 2) {
        heroX += p % n;
        heroY += (p / n) | 0;
        heroCount++;
      }
    }
    heroX = heroCount ? heroX / heroCount : cx;
    heroY = heroCount ? heroY / heroCount : cy;
    const sr = cr.slice(), sg = cg.slice(), sb = cb.slice();
    blur(sr, n, 2, 2);
    blur(sg, n, 2, 2);
    blur(sb, n, 2, 2);
    await pause();

    // The open field: wherever the backdrop or the floor is one plain, empty colour. It is glazed
    // with a repeating pattern; everything else (things, plinths, walls, cast shadows) is cut to shape.
    const bins = new Uint32Array(4096);
    const tones = new Uint32Array(256);
    let solid = 0;
    for (let p = 0; p < N; p++) {
      if (identity[p * 4] <= 1) bins[(Math.min(15, (sr[p] * 16) | 0) << 8) | (Math.min(15, (sg[p] * 16) | 0) << 4) | Math.min(15, (sb[p] * 16) | 0)]++;
      if (identity[p * 4] > 0) (tones[diffuse[p * 4]]++, solid++);
    }
    let commonest = 0;
    for (let bin = 1; bin < 4096; bin++) if (bins[bin] > bins[commonest]) commonest = bin;
    let fieldR = 0, fieldG = 0, fieldB = 0, fieldCount = 0;
    for (let p = 0; p < N; p++) {
      if (identity[p * 4] > 1) continue;
      if (((Math.min(15, (sr[p] * 16) | 0) << 8) | (Math.min(15, (sg[p] * 16) | 0) << 4) | Math.min(15, (sb[p] * 16) | 0)) !== commonest) continue;
      fieldR += sr[p];
      fieldG += sg[p];
      fieldB += sb[p];
      fieldCount++;
    }
    const back: RGB = fieldCount ? [fieldR / fieldCount, fieldG / fieldCount, fieldB / fieldCount] : [0.8, 0.82, 0.85];
    const field = new Uint8Array(N);
    for (let p = 0; p < N; p++)
      if (identity[p * 4] <= 1 && Math.max(Math.abs(sr[p] - back[0]), Math.abs(sg[p] - back[1]), Math.abs(sb[p] - back[2])) < 0.075) field[p] = 1;
    // Full light, as the plain-lit pass shows it: the level the brightest twentieth of surfaces reach.
    let lit = 255;
    for (let seen = 0; lit > 20 && seen < solid * 0.05; lit--) seen += tones[lit];
    const nxs = new Float32Array(N), nys = new Float32Array(N), nzs = new Float32Array(N);
    for (let p = 0; p < N; p++) {
      nxs[p] = normal[p * 4] / 127.5 - 1;
      nys[p] = normal[p * 4 + 1] / 127.5 - 1;
      nzs[p] = normal[p * 4 + 2] / 127.5 - 1;
    }

    // ---------------------------------------------------------------- raw labels
    const raw = new Int32Array(N);
    const edgeDistance = new Float32Array(N); // distance to the opening's edge, for the stone reveal
    const cut = new Uint8Array(N); // 1 where the subject's pieces are cut by clustering
    const tall = groundStep * 1.3, wide = groundStep * 0.8;
    const sectors = Math.max(12, Math.min(44, Math.round((n * 1.7) / groundStep / 2) * 2));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const p = y * n + x;
        const sd = opening(x + 0.5, y + 0.5);
        edgeDistance[p] = sd;
        if (sd > 0) {
          raw[p] = -1;
          continue;
        }
        if (sd > -bandWidth) {
          raw[p] = 1_000_000 + Math.floor(perimeter / bandLength);
          continue;
        }
        if (!field[p] || a.leading === 'crackle') {
          cut[p] = 1;
          continue;
        }
        let i = 0, j = 0;
        if (a.leading === 'diamond') {
          const u = (x - cx) / wide, v = (y - cy) / tall;
          i = Math.floor(u + v);
          j = Math.floor(u - v);
        } else if (a.leading === 'squares') {
          j = Math.floor(y / (groundStep * 0.85));
          i = Math.floor((x + (j & 1) * groundStep * 0.6) / (groundStep * 1.2));
        } else if (a.leading === 'rays') {
          const r = Math.hypot(x - heroX, y - heroY);
          j = Math.floor(Math.sqrt(r / groundStep) * 1.25);
          i = Math.floor(((Math.atan2(y - heroY, x - heroX) / (Math.PI * 2) + 0.5) * sectors + (j & 1) * 0.5) % sectors);
        } else if (a.leading === 'scales') {
          const w = groundStep * 1.25, h = groundStep * 0.62;
          const row = Math.floor(y / h);
          j = row - 1;
          i = Math.round((x - (j & 1) * w * 0.5) / w);
          for (let k = row + 1; k >= row - 1; k--) {
            const offset = (k & 1) * w * 0.5;
            const column = Math.round((x - offset) / w);
            if (Math.hypot(x - (column * w + offset), y - k * h) < w * 0.56) {
              j = k;
              i = column;
              break;
            }
          }
        } else {
          const g = groundStep * 1.2;
          i = Math.floor(x / g);
          j = Math.floor(y / g);
          if (Math.hypot(x - (i + 0.5) * g, y - (j + 0.5) * g) > g * 0.45) {
            i = Math.round(x / g) + 300;
            j = Math.round(y / g) + 300;
          }
        }
        raw[p] = 2_000_000 + (i + 400) * 1024 + (j + 400);
      }
    }
    await pause();

    // ---------------------------------------------------------------- cut the subject into pieces
    // A k-means over position, colour, surface direction and identity (SLIC): pieces stay compact
    // but their edges settle on creases, colour changes and the outlines of things.
    const grid = Math.ceil(n / S);
    const seeds: number[] = [];
    for (let k = 0; k < grid * grid; k++) {
      const x = Math.min(n - 1, Math.max(0, Math.round(((k % grid) + 0.5 + (random() - 0.5) * 0.6) * S)));
      const y = Math.min(n - 1, Math.max(0, Math.round((((k / grid) | 0) + 0.5 + (random() - 0.5) * 0.6) * S)));
      seeds.push(y * n + x);
    }
    // A small thing still deserves to be made of several pieces: give it extra seeds of its own.
    const areas = new Uint32Array(256), seeded0 = new Uint16Array(256);
    for (let p = 0; p < N; p++) if (cut[p]) areas[identity[p * 4]]++;
    for (const p of seeds) if (cut[p]) seeded0[identity[p * 4]]++;
    const wanted = new Float32Array(256);
    for (let id = 2; id < 256; id++) wanted[id] = areas[id] ? Math.max(0, Math.min(9, areas[id] / 110) - seeded0[id]) / areas[id] : 0;
    for (let p = 0; p < N; p++) {
      const id = identity[p * 4];
      if (id >= 2 && cut[p] && wanted[id] > 0 && hash(p % n, (p / n) | 0, seed + 21) < wanted[id]) seeds.push(p);
    }
    const K = seeds.length;
    const kx = new Float32Array(K), ky = new Float32Array(K);
    const kr = new Float32Array(K), kg = new Float32Array(K), kb = new Float32Array(K);
    const knx = new Float32Array(K), kny = new Float32Array(K), knz = new Float32Array(K);
    const kid = new Int16Array(K);
    for (let k = 0; k < K; k++) {
      const p = seeds[k];
      kx[k] = p % n;
      ky[k] = (p / n) | 0;
      kr[k] = sr[p];
      kg[k] = sg[p];
      kb[k] = sb[p];
      knx[k] = nxs[p];
      kny[k] = nys[p];
      knz[k] = nzs[p];
      kid[k] = field[p] ? 255 : identity[p * 4];
    }
    const owner = new Int32Array(N).fill(-1);
    const best = new Float32Array(N);
    const sums = new Float64Array(K * 9);
    const reach = Math.ceil(S * 1.15);
    const colourWeight = 26, normalWeight = 1.6, inverse = 1 / (S * S);
    for (let iteration = 0; iteration < 5; iteration++) {
      best.fill(Infinity);
      for (let k = 0; k < K; k++) {
        if (kx[k] < 0) continue;
        const x0 = Math.max(0, Math.floor(kx[k] - reach)), x1 = Math.min(n - 1, Math.ceil(kx[k] + reach));
        const y0 = Math.max(0, Math.floor(ky[k] - reach)), y1 = Math.min(n - 1, Math.ceil(ky[k] + reach));
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const p = y * n + x;
            if (!cut[p]) continue;
            const dx = x - kx[k], dy = y - ky[k];
            const dr = sr[p] - kr[k], dg = sg[p] - kg[k], db = sb[p] - kb[k];
            const ex = nxs[p] - knx[k], ey = nys[p] - kny[k], ez = nzs[p] - knz[k];
            const d =
              (dx * dx + dy * dy) * inverse +
              (dr * dr + dg * dg + db * db) * colourWeight +
              (ex * ex + ey * ey + ez * ez) * normalWeight +
              ((field[p] ? 255 : identity[p * 4]) === kid[k] ? 0 : 3);
            if (d < best[p]) {
              best[p] = d;
              owner[p] = k;
            }
          }
        }
      }
      await pause();
      if (iteration === 4) break;
      sums.fill(0);
      for (let p = 0; p < N; p++) {
        const k = owner[p];
        if (k < 0 || !cut[p]) continue;
        const at = k * 9;
        sums[at] += p % n;
        sums[at + 1] += (p / n) | 0;
        sums[at + 2] += sr[p];
        sums[at + 3] += sg[p];
        sums[at + 4] += sb[p];
        sums[at + 5] += nxs[p];
        sums[at + 6] += nys[p];
        sums[at + 7] += nzs[p];
        sums[at + 8]++;
      }
      for (let k = 0; k < K; k++) {
        const at = k * 9, count = sums[at + 8];
        if (!count) {
          kx[k] = -1e6;
          continue;
        }
        kx[k] = sums[at] / count;
        ky[k] = sums[at + 1] / count;
        kr[k] = sums[at + 2] / count;
        kg[k] = sums[at + 3] / count;
        kb[k] = sums[at + 4] / count;
        knx[k] = sums[at + 5] / count;
        kny[k] = sums[at + 6] / count;
        knz[k] = sums[at + 7] / count;
        const q = Math.round(ky[k]) * n + Math.round(kx[k]);
        if (cut[q]) kid[k] = field[q] ? 255 : identity[q * 4];
      }
    }
    for (let p = 0; p < N; p++) if (cut[p]) raw[p] = (owner[p] + 1) * 64 + (field[p] ? 63 : Math.min(62, identity[p * 4]));

    // ---------------------------------------------------------------- connected pieces, slivers merged away
    const piece = new Int32Array(N).fill(-1);
    const order = new Int32Array(N);
    const starts: number[] = [], counts: number[] = [];
    let filled = 0;
    for (let p0 = 0; p0 < N; p0++) {
      if (piece[p0] >= 0) continue;
      const label = raw[p0], index = starts.length;
      let head = filled;
      starts.push(filled);
      order[filled++] = p0;
      piece[p0] = index;
      while (head < filled) {
        const p = order[head++], x = p % n;
        if (x > 0 && piece[p - 1] < 0 && raw[p - 1] === label) (piece[p - 1] = index), (order[filled++] = p - 1);
        if (x < n - 1 && piece[p + 1] < 0 && raw[p + 1] === label) (piece[p + 1] = index), (order[filled++] = p + 1);
        if (p >= n && piece[p - n] < 0 && raw[p - n] === label) (piece[p - n] = index), (order[filled++] = p - n);
        if (p < N - n && piece[p + n] < 0 && raw[p + n] === label) (piece[p + n] = index), (order[filled++] = p + n);
      }
      counts.push(filled - starts[index]);
    }
    await pause();
    const pieces = starts.length;
    const sliver = Math.max(14, S * S * 0.1);
    const groundSliver = groundStep * groundStep * 0.06;
    for (let index = 0; index < pieces; index++) {
      const first = order[starts[index]];
      if (raw[first] < 0) continue;
      const lattice = raw[first] >= 1_000_000;
      if (counts[index] >= (lattice ? groundSliver : sliver)) continue;
      const id = identity[first * 4];
      let target = -1, targetSize = 0;
      for (let at = starts[index]; at < starts[index] + counts[index] && targetSize < 1e9; at++) {
        const p = order[at], x = p % n;
        for (const q of [x > 0 ? p - 1 : -1, x < n - 1 ? p + 1 : -1, p - n, p + n]) {
          if (q < 0 || q >= N) continue;
          const other = piece[q];
          if (other === index || raw[q] < 0) continue;
          // A sliver of open background may only join more background; a sliver of a thing, the same thing.
          if (lattice ? raw[q] < 1_000_000 || raw[q] >= 2_000_000 !== raw[first] >= 2_000_000 : identity[q * 4] !== id || raw[q] >= 1_000_000) continue;
          if (counts[other] > targetSize) (target = other), (targetSize = counts[other]);
        }
      }
      if (target < 0) continue;
      for (let at = starts[index]; at < starts[index] + counts[index]; at++) piece[order[at]] = target;
      counts[target] += counts[index];
      counts[index] = 0;
    }

    // ---------------------------------------------------------------- per-piece glass
    const stat = new Float64Array(pieces * 8); // r g b diffuse x y depth count
    for (let p = 0; p < N; p++) {
      const at = piece[p] * 8;
      stat[at] += cr[p];
      stat[at + 1] += cg[p];
      stat[at + 2] += cb[p];
      stat[at + 3] += diffuse[p * 4];
      stat[at + 4] += p % n;
      stat[at + 5] += (p / n) | 0;
      stat[at + 6] += dep[p];
      stat[at + 7]++;
    }
    const kind = new Uint8Array(pieces);
    const glassR = new Float32Array(pieces), glassG = new Float32Array(pieces), glassB = new Float32Array(pieces);
    const meanLight = new Float32Array(pieces);
    const turn = new Float32Array(pieces); // each piece is cut from the sheet at its own angle
    const crack = new Float32Array(pieces * 3); // nx ny offset, or nx = 2 for none
    const depthSpan = Math.max(1e-6, farthest - nearest);
    for (let index = 0; index < pieces; index++) {
      const at = index * 8, count = stat[at + 7];
      crack[index * 3] = 2;
      if (!count) continue;
      const first = order[starts[index]];
      const label = raw[first];
      const dice = seeded(seed * 7919 + index * 104729);
      turn[index] = dice() * Math.PI;
      meanLight[index] = stat[at + 3] / count / 255;
      const px = stat[at + 4] / count, py = stat[at + 5] / count;
      let r = stat[at] / count, g = stat[at + 1] / count, b = stat[at + 2] / count;
      if (label < 0) {
        kind[index] = KIND_STONE;
        continue;
      }
      if (label >= 2_000_000 || (label < 1_000_000 && label % 64 === 63)) {
        kind[index] = KIND_GROUND;
        let pick: RGB;
        if (a.glass === 'true') {
          // The scene's own backdrop, richer and deeper, and leaning cool when it has no hue of its
          // own, so that a pale subject still stands clear of a pale ground.
          const l = lum(back[0], back[1], back[2]);
          const grey = 1 - clamp01((Math.max(back[0], back[1], back[2]) - Math.min(back[0], back[1], back[2])) * 5);
          const deep = 0.74 - 0.12 * grey;
          pick = [
            mix(clamp01(l + (back[0] - l) * 2.4), 0.42, grey * 0.55) * deep,
            mix(clamp01(l + (back[1] - l) * 2.4), 0.62, grey * 0.55) * deep,
            mix(clamp01(l + (back[2] - l) * 2.4), 0.9, grey * 0.55) * deep,
          ];
        } else if (a.glass === 'opal') {
          // An opalescent sky: cool high up, warming toward the horizon.
          const t = clamp01(py / n + (dice() - 0.5) * 0.35);
          const top = P.ground[dice() < 0.5 ? 0 : 1], low = P.ground[dice() < 0.5 ? 2 : 3];
          pick = [mix(top[0], low[0], t), mix(top[1], low[1], t), mix(top[2], low[2], t)];
        } else pick = P.ground[Math.floor(dice() * P.ground.length)];
        const jitter = 0.86 + dice() * 0.28;
        r = pick[0] * jitter;
        g = pick[1] * jitter;
        b = pick[2] * jitter;
      } else if (label >= 1_000_000) {
        kind[index] = KIND_BORDER;
        const which = a.border === 'clear' ? P.clear : a.border === 'fillet' ? P.border[0] : P.border[(label - 1_000_000) & 1];
        const jitter = 0.88 + dice() * 0.22;
        r = which[0] * jitter;
        g = which[1] * jitter;
        b = which[2] * jitter;
      } else {
        kind[index] = KIND_PICTURE;
        const l = lum(r, g, b);
        const boost = P.saturate * mix(0.8, 1.15, mood.cheer);
        let r2 = clamp01(l + (r - l) * boost), g2 = clamp01(l + (g - l) * boost), b2 = clamp01(l + (b - l) * boost);
        if (P.glass.length) {
          let nearestSheet = P.glass[0], distance = Infinity, sheetIndex = 0;
          const id = identity[first * 4];
          const chroma = Math.max(r, g, b) - Math.min(r, g, b);
          for (const sheet of P.glass) {
            const da = r2 - g2 - (sheet[0] - sheet[1]);
            const dbb = (r2 + g2) / 2 - b2 - ((sheet[0] + sheet[1]) / 2 - sheet[2]);
            const dl = l - lum(sheet[0], sheet[1], sheet[2]);
            // Grey things have no hue to match, so each thing settles on sheets of its own liking.
            const grey = 1 - clamp01(chroma * 4);
            const liking = hash(id * 31 + 7, sheetIndex++, seed + 11) * 0.38 * grey;
            const d = (da * da + dbb * dbb) * (1 - 0.8 * grey) + dl * dl * 0.5 + liking + dice() * 0.004;
            if (d < distance) (distance = d), (nearestSheet = sheet);
          }
          r2 = mix(r2, nearestSheet[0], P.snap);
          g2 = mix(g2, nearestSheet[1], P.snap);
          b2 = mix(b2, nearestSheet[2], P.snap);
        }
        // Keep the scene's light and shade, but as glass: nothing falls to black, shadow is deeper colour.
        const want = 0.3 + 0.68 * Math.pow(l, 0.8);
        const gain = Math.min(2.2, Math.max(0.7, want / Math.max(0.03, lum(r2, g2, b2)))) * (0.92 + dice() * 0.16);
        // Farther pieces go a little paler and cooler, as aerial perspective.
        const far = clamp01((stat[at + 6] / count - nearest) / depthSpan) * 0.16;
        r = mix(r2 * gain, 0.78, far);
        g = mix(g2 * gain, 0.84, far);
        b = mix(b2 * gain, 0.95, far);
      }
      // Age: a few panes cracked, a few replaced with glass that does not quite match.
      if (count > 260 && dice() < mood.wear * mood.wear * 0.3) {
        const angle = dice() * Math.PI;
        const nx = Math.cos(angle), ny = Math.sin(angle);
        crack[index * 3] = nx;
        crack[index * 3 + 1] = ny;
        crack[index * 3 + 2] = nx * px + ny * py + (dice() - 0.5) * Math.sqrt(count) * 0.3;
      }
      if (dice() < mood.wear * 0.07) {
        const l = lum(r, g, b);
        r = mix(r, P.clear[0] * (0.5 + l * 0.6), 0.75);
        g = mix(g, P.clear[1] * (0.5 + l * 0.6), 0.75);
        b = mix(b, P.clear[2] * (0.5 + l * 0.6), 0.75);
      }
      glassR[index] = r;
      glassG[index] = g;
      glassB[index] = b;
    }
    await pause();

    // ---------------------------------------------------------------- lead: distance to the nearest cut
    const lead = new Float32Array(N).fill(1e6); // to any cut
    const edge = new Float32Array(N).fill(1e6); // to the outline of a thing or of the picture
    const threshold = half * outline;
    const solder: number[] = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const p = y * n + x, here = piece[p];
        let different = 0;
        for (let side = 0; side < 2; side++) {
          if (side === 0 ? x === n - 1 : y === n - 1) continue;
          const q = side === 0 ? p + 1 : p + n;
          const there = piece[q];
          if (there === here) continue;
          different++;
          lead[p] = lead[q] = 0.5;
          if (identity[p * 4] !== identity[q * 4] || kind[here] !== kind[there]) edge[p] = edge[q] = 0.5;
        }
        if (different === 2 && piece[p + 1] !== piece[p + n] && kind[here] !== KIND_STONE) solder.push(p);
      }
    }
    const diagonal = Math.SQRT2;
    for (const map of [lead, edge]) {
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const p = y * n + x;
          let d = map[p];
          if (x > 0) d = Math.min(d, map[p - 1] + 1);
          if (y > 0) {
            d = Math.min(d, map[p - n] + 1);
            if (x > 0) d = Math.min(d, map[p - n - 1] + diagonal);
            if (x < n - 1) d = Math.min(d, map[p - n + 1] + diagonal);
          }
          map[p] = d;
        }
      for (let y = n - 1; y >= 0; y--)
        for (let x = n - 1; x >= 0; x--) {
          const p = y * n + x;
          let d = map[p];
          if (x < n - 1) d = Math.min(d, map[p + 1] + 1);
          if (y < n - 1) {
            d = Math.min(d, map[p + n] + 1);
            if (x < n - 1) d = Math.min(d, map[p + n + 1] + diagonal);
            if (x > 0) d = Math.min(d, map[p + n - 1] + diagonal);
          }
          map[p] = d;
        }
    }
    // One came everywhere, and a heavier one along outlines. That extra weight sits outside a thing,
    // so a thin post or cable keeps its sliver of glass instead of drowning in lead.
    for (let p = 0; p < N; p++) {
      const reachIn = identity[p * 4] >= 2 ? Math.min(half * 0.75, 1.6) : threshold * 1.15;
      lead[p] = Math.min(lead[p] - (identity[p * 4] >= 2 ? Math.max(0.7, half * 0.62) : half), edge[p] - reachIn); // negative inside the metal
    }
    // Solder blobs where three cames meet.
    const blob = new Float32Array(N);
    const blobRadius = half * 1.5 + 0.8;
    if (half > 1.2)
      for (const p of solder) {
        const x0 = p % n, y0 = (p / n) | 0, r = Math.ceil(blobRadius);
        for (let y = Math.max(0, y0 - r); y <= Math.min(n - 1, y0 + r); y++)
          for (let x = Math.max(0, x0 - r); x <= Math.min(n - 1, x0 + r); x++) {
            const v = clamp01(blobRadius - Math.hypot(x - x0 - 0.5, y - y0 - 0.5));
            if (v > blob[y * n + x]) blob[y * n + x] = v;
          }
      }
    await pause();

    // ---------------------------------------------------------------- painted detail: where a brush would trace
    const trace = new Float32Array(N);
    const painted = a.paint !== 'none';
    if (painted) {
      const depthScale = (capture.far - capture.near) / Math.max(1e-6, capture.pixelWorldSize);
      for (let y = 1; y < n - 1; y++)
        for (let x = 1; x < n - 1; x++) {
          const p = y * n + x;
          if (field[p]) continue;
          let e = 0;
          for (let side = 0; side < 2; side++) {
            const q0 = side === 0 ? p - 1 : p - n, q1 = side === 0 ? p + 1 : p + n;
            if (identity[q0 * 4] !== identity[q1 * 4]) continue;
            const dn =
              (Math.abs(normal[q0 * 4] - normal[q1 * 4]) + Math.abs(normal[q0 * 4 + 1] - normal[q1 * 4 + 1]) + Math.abs(normal[q0 * 4 + 2] - normal[q1 * 4 + 2])) / 255;
            const dd = (Math.abs(dep[q0] - dep[q1]) * depthScale - 6) / 10;
            const dl = Math.abs(lum(sr[q0], sg[q0], sb[q0]) - lum(sr[q1], sg[q1], sb[q1]));
            e = Math.max(e, dn * 1.5, dd, dl * 5);
          }
          trace[p] = e;
        }
      blur(trace, n, 1, 1);
    }
    await pause();

    // ---------------------------------------------------------------- the light behind
    const [lx, ly] = capture.light;
    const lightLength = Math.hypot(lx, ly) || 1;
    const sunX = cx + (lx / lightLength) * n * 0.26 + (mood.daylight - 0.5) * n * 0.2;
    const sunY = cy + (ly / lightLength) * n * 0.26 + Math.abs(mood.daylight - 0.5) * n * 0.25;
    const warm = mood.warmth;
    let tint: RGB = [mix(0.92, 1.07, warm), mix(0.97, 0.98, warm), mix(1.08, 0.86, warm)];
    if (a.behind === 'lamp') tint = [1.07, 0.9, 0.7];
    if (a.behind === 'overcast') tint = [tint[0] * 0.93, tint[1] * 0.96, tint[2] * 1.0];
    const bloomAmount = { sky: 0.2, sun: 0.42, leaves: 0.22, lamp: 0.34, overcast: 0.08 }[a.behind] * mix(0.8, 1.2, mood.cheer);
    const backlight = (x: number, y: number): number => {
      switch (a.behind) {
        case 'sun': {
          const r2 = ((x - sunX) ** 2 + (y - sunY) ** 2) / (n * n);
          return 0.6 + 0.85 * Math.exp(-r2 / 0.11) + 1.1 * Math.exp(-r2 / 0.006);
        }
        case 'lamp': {
          const r2 = ((x - cx) ** 2 + (y - n * 0.56) ** 2) / (n * n);
          return 0.2 + 1.05 * Math.exp(-r2 / 0.085);
        }
        case 'leaves': {
          const sway = fbm(x / 95 + 3, y / 95, seed + 40);
          const leaf = fbm(x / 26, y / 26, seed + 50);
          const branch = Math.abs(noise(x / 150, y / 150, seed + 60) - 0.5);
          return 1.06 - 0.5 * smooth(0.42, 0.62, sway * 0.6 + leaf * 0.4) - 0.32 * (1 - smooth(0.0, 0.016, branch));
        }
        case 'overcast':
          return 0.7 + 0.08 * fbm(x / 200, y / 200, seed + 40);
        default:
          return 0.9 + 0.16 * (1 - y / n) + 0.08 * (fbm(x / 180, y / 180, seed + 40) - 0.5);
      }
    };

    // ---------------------------------------------------------------- render every pixel of glass
    const outR = new Float32Array(N), outG = new Float32Array(N), outB = new Float32Array(N);
    const paintWeight = { none: 0, trace: 0, stipple: 0.75, hatch: 0.8, wash: 0.9 }[a.paint];
    const grime = mix(0.04, 0.45, mood.wear);
    const grimeReach = mix(2, 7, mood.wear);
    const roundelStep = groundStep * 1.2;
    const bars: number[] = [];
    if (a.shape === 'lancet' || a.shape === 'round') bars.push(n * 0.27, n * 0.5, n * 0.73);
    else if (a.shape === 'panel' && a.cames > 0.4 && random() < 0.6) bars.push(n * 0.335, n * 0.665);
    for (let y = 0; y < n; y++) {
      if (y % 60 === 0) await pause();
      for (let x = 0; x < n; x++) {
        const p = y * n + x, index = piece[p];
        const what = kind[index];
        const sd = edgeDistance[p];
        if (what === KIND_STONE) {
          // Dressed stone around the opening, with a pale chamfer catching light near the glass.
          const stone = (0.07 + 0.05 * fbm(x / 34, y / 34, seed + 9) + 0.03 * hash(x, y, seed)) * (1 + 0.9 * Math.exp(-sd / 7));
          const course = (y + ((x / 96) | 0) * 0) % 72 < 2 || (x + (((y / 72) | 0) & 1) * 60) % 120 < 2 ? 0.6 : 1;
          outR[p] = stone * 1.05 * course;
          outG[p] = stone * course;
          outB[p] = stone * 0.92 * course;
          continue;
        }
        let r = glassR[index], g = glassG[index], b = glassB[index];
        const angle = turn[index];
        const ca = Math.cos(angle), sa = Math.sin(angle);
        const u = x * ca + y * sa, v = y * ca - x * sa;
        let m = 1;
        switch (a.texture) {
          case 'antique':
            m = 0.88 + 0.24 * fbm(u / 80, v / 7, seed + index);
            if (hash(x >> 3, y >> 3, seed + 3) < 0.035) {
              const bx = ((x >> 3) << 3) + 4, by = ((y >> 3) << 3) + 4;
              const d = Math.hypot(x - bx, y - by);
              m *= d < 1.2 ? 1.3 : d < 2.4 ? 0.8 : 1;
            }
            break;
          case 'streaky': {
            const s = fbm(u / 70 + 2 * noise(u / 120, v / 120, seed + 5), v / 13, seed + index);
            const t = smooth(0.42, 0.66, s) * 0.6;
            const l = lum(r, g, b);
            // The second tone is a milkier, shifted version of the first.
            r = mix(r, mix(l, 1, 0.55) * 1.02, t);
            g = mix(g, mix(l, 0.97, 0.55), t);
            b = mix(b, mix(l, 0.9, 0.55) * 0.98, t);
            m = 0.92 + 0.14 * s;
            break;
          }
          case 'seedy': {
            m = 0.93 + 0.1 * noise(u / 30, v / 30, seed + index);
            const gx = Math.floor(x / 7), gy = Math.floor(y / 7);
            if (hash(gx, gy, seed + 3) < 0.55) {
              const bx = (gx + 0.2 + 0.6 * hash(gx, gy, seed + 4)) * 7, by = (gy + 0.2 + 0.6 * hash(gx, gy, seed + 5)) * 7;
              const size = 0.8 + 1.7 * hash(gx, gy, seed + 6);
              const d = Math.hypot(x - bx, y - by);
              m *= d < size * 0.6 ? 1.35 : d < size * 1.3 ? 0.74 : 1;
            }
            break;
          }
          case 'hammered': {
            const gx = Math.floor(u / 8), gy = Math.floor(v / 8);
            let nearestDimple = 9;
            for (let j = -1; j <= 1; j++)
              for (let i = -1; i <= 1; i++) {
                const d = Math.hypot(u / 8 - (gx + i + hash(gx + i, gy + j, seed + 3)), v / 8 - (gy + j + hash(gx + i, gy + j, seed + 4)));
                if (d < nearestDimple) nearestDimple = d;
              }
            m = 0.9 + 0.3 * (1 - Math.min(1, nearestDimple * 1.3)) ** 1.5;
            break;
          }
          default:
            m = 0.96 + 0.17 * Math.sin(v / 4.2 + 5 * fbm(u / 60, v / 60, seed + index));
        }
        if (what === KIND_GROUND && a.leading === 'roundels') {
          const gi = Math.floor(x / roundelStep), gj = Math.floor(y / roundelStep);
          const d = Math.hypot(x - (gi + 0.5) * roundelStep, y - (gj + 0.5) * roundelStep);
          if (d < roundelStep * 0.45) m *= 0.9 + 0.16 * Math.cos(d * 0.75) + 0.25 * Math.exp(-d / 3);
        }

        // Grisaille: opaque brown vitreous paint, fired on.
        let paint = 0;
        if (painted && what === KIND_PICTURE) {
          const shade = diffuse[p * 4] / lit;
          const reference = Math.max(0.12, meanLight[index] * (255 / lit));
          const shadow = clamp01(clamp01((1.06 - shade / reference) * 1.7) * 0.75 + clamp01((0.55 - shade) * 1.5));
          const line = smooth(0.1, 0.24, trace[p] * (0.85 + 0.5 * noise(x / 9, y / 9, seed + 70)));
          if (a.paint === 'stipple') {
            const grain = hash(x, y, seed + 71) * 0.6 + noise(x / 2.3, y / 2.3, seed + 72) * 0.4;
            paint = smooth(0.25, 0.6, shadow * 1.1 + (grain - 0.5) * 0.9) * paintWeight * smooth(0.04, 0.3, shadow);
          } else if (a.paint === 'hatch') {
            // Strokes run across the direction the surface faces, so they wrap the form.
            const nx = nxs[p], ny = -nys[p];
            const facing = Math.hypot(nx, ny) > 0.25 ? Math.round(Math.atan2(ny, nx) / (Math.PI / 6)) * (Math.PI / 6) : angle;
            const along = x * Math.cos(facing) + y * Math.sin(facing) + 3 * noise(x / 40, y / 40, seed + 73);
            const stroke = Math.abs(((along / 5.2) % 1 + 1) % 1 - 0.5) * 2;
            paint = smooth(1 - shadow * 0.95, 1 - shadow * 0.95 + 0.3, stroke) * paintWeight * smooth(0.08, 0.3, shadow);
            if (shadow > 0.7) {
              const across = y * Math.cos(facing) - x * Math.sin(facing);
              const second = Math.abs(((across / 5.2) % 1 + 1) % 1 - 0.5) * 2;
              paint = Math.max(paint, smooth(0.55, 0.85, second) * paintWeight);
            }
          } else if (a.paint === 'wash') {
            paint = clamp01(shadow * 0.85 + (noise(x / 3, y / 3, seed + 74) - 0.5) * 0.12) * paintWeight * 0.8;
          }
          paint = Math.max(paint, line * 0.92);
        }

        // Dirt gathers against the leads; old glass also carries a film.
        const d = lead[p];
        m *= 1 - grime * Math.exp(-Math.max(0, d) / grimeReach);
        m *= 1 - mood.wear * 0.3 * smooth(0.35, 0.75, fbm(x / 120, y / 120, seed + 80));
        const nxCrack = crack[index * 3];
        if (nxCrack < 2) {
          const off = Math.abs(nxCrack * x + crack[index * 3 + 1] * y - crack[index * 3 + 2] + 2.5 * noise(x / 14, y / 14, seed + 81));
          if (off < 0.8) m *= 0.3;
          else if (off < 2) m *= 1.35;
        }

        const light = backlight(x, y) * m;
        const keep = 1 - paint * 0.88;
        r = r * light * tint[0] * keep + paint * 0.035;
        g = g * light * tint[1] * keep + paint * 0.022;
        b = b * light * tint[2] * keep + paint * 0.015;
        // Past full brightness glass burns out toward white instead of clipping to a flat primary.
        const over = Math.max(0, Math.max(r, g, b) - 1);
        if (over > 0) {
          r += over * 0.7;
          g += over * 0.7;
          b += over * 0.7;
        }

        // Lead came: a soft grey metal bar with a highlight along its crown.
        const cover = Math.max(clamp01(0.5 - d), blob[p]);
        if (cover > 0) {
          const gx = (x < n - 1 ? lead[p + 1] : d) - (x > 0 ? lead[p - 1] : d);
          const gy = (y < n - 1 ? lead[p + n] : d) - (y > 0 ? lead[p - n] : d);
          const crown = clamp01(-d / half);
          const sheen = 0.055 + 0.05 * crown * crown + 0.03 * clamp01(-(gx * lx + gy * ly)) + blob[p] * 0.035;
          r = mix(r, sheen, cover);
          g = mix(g, sheen * 1.02, cover);
          b = mix(b, sheen * 1.08, cover);
        }
        for (const bar of bars) {
          const off = Math.abs(y - bar);
          if (off < 3.2) {
            const iron = 0.035 + 0.03 * (1 - off / 3.2);
            const cover2 = clamp01(3.2 - off);
            r = mix(r, iron, cover2);
            g = mix(g, iron, cover2);
            b = mix(b, iron, cover2);
          }
        }
        outR[p] = r;
        outG[p] = g;
        outB[p] = b;
      }
    }
    await pause();

    // ---------------------------------------------------------------- halation: light spills over the lead and stone
    const glowR = outR.slice(), glowG = outG.slice(), glowB = outB.slice();
    const radius = Math.max(3, Math.round(n / 90));
    blur(glowR, n, radius, 2);
    await pause();
    blur(glowG, n, radius, 2);
    blur(glowB, n, radius, 2);
    await pause();
    const pixels = new Uint8ClampedArray(N * 4);
    for (let p = 0; p < N; p++) {
      const speck = (hash(p % n, (p / n) | 0, seed + 90) - 0.5) * 0.02;
      const r = outR[p] + glowR[p] * bloomAmount + speck;
      const g = outG[p] + glowG[p] * bloomAmount + speck;
      const b = outB[p] + glowB[p] * bloomAmount + speck;
      // A gentle shoulder so bright glass rolls off instead of clipping.
      pixels[p * 4] = 255 * (r < 0.8 ? r : 0.8 + 0.2 * (1 - Math.exp(-(r - 0.8) / 0.2)));
      pixels[p * 4 + 1] = 255 * (g < 0.8 ? g : 0.8 + 0.2 * (1 - Math.exp(-(g - 0.8) / 0.2)));
      pixels[p * 4 + 2] = 255 * (b < 0.8 ? b : 0.8 + 0.2 * (1 - Math.exp(-(b - 0.8) / 0.2)));
      pixels[p * 4 + 3] = 255;
    }

    let live = 0;
    for (let index = 0; index < pieces; index++) if (counts[index] && kind[index] !== KIND_STONE) live++;
    return {
      pixels,
      notes: [
        `${live} pieces of ${a.glass} glass, ${a.texture}`,
        `${a.leading} ground, cames ${(threshold * 2).toFixed(1)} px on outlines`,
        `${a.paint === 'none' ? 'unpainted' : `${a.paint} grisaille`}, ${a.shape} opening${a.border === 'none' ? '' : `, ${a.border} border`}`,
        `lit by ${a.behind}`,
      ],
    };
  },
});
