import { choice, defineLook, score } from '@conjure/kit';

/**
 * Pixel diorama: the frame is resampled onto a coarse grid (one identity per cell, so sprites
 * keep hard edges), relit from the plain-lighting and normal channels, matched to a small
 * console palette with ordered dithering between neighbouring shades, outlined from identity
 * and depth edges, and finally shown on a screen (crisp, dot-matrix, tube or backlit panel).
 */

type Lab = [number, number, number];

const PALETTES: Record<string, { tonal?: boolean; limit?: number; hex: string }> = {
  gameboy: { tonal: true, hex: '0f380f 306230 8bac0f 9bbc0f' },
  pocket: { tonal: true, hex: '1c1c1a 5c5c58 a6a69e e4e4d8' },
  onebit: { tonal: true, hex: '1b1a22 f1eee0' },
  cga: { hex: '000000 55ffff ff55ff ffffff' },
  nes: {
    limit: 13,
    hex:
      '000000 7c7c7c bcbcbc f8f8f8 0000bc 0058f8 3cbcfc a4e4fc 4428bc 6844fc 9878f8 d8b8f8 940084 d800cc f878f8 a80020 e40058 f85898 f8a4c0 ' +
      'a81000 f83800 f87858 f0d0b0 881400 e45c10 fca044 fce0a8 503000 ac7c00 f8b800 f8d878 007800 00b800 b8f818 d8f878 005800 00a800 58d854 b8f8b8 00a844 58f898 004058 008888 00e8d8',
  },
  pc16: { hex: '000000 0000aa 00aa00 00aaaa aa0000 aa00aa aa5500 aaaaaa 555555 5555ff 55ff55 55ffff ff5555 ff55ff ffff55 ffffff' },
  c64: { hex: '000000 ffffff 68372b 70a4b2 6f3d86 588d43 352879 b8c76f 6f4f25 433900 9a6759 444444 6c6c6c 9ad284 6c5eb5 959595' },
  fantasy: { hex: '000000 1d2b53 7e2553 008751 ab5236 5f574f c2c3c7 fff1e8 ff004d ffa300 ffec27 00e436 29adff 83769c ff77a8 ffccaa' },
  pastel: { hex: '2d2a3e 5b5378 8a7fa8 c9b8d8 fbeee6 ffd6c9 f7a8b8 e87a90 a8e0d0 6fb7b0 ffe6a0 a9c9f0' },
};

const GRIDS = [72, 90, 120, 144, 180, 240];

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const CLUSTER4 = [12, 5, 6, 13, 4, 0, 1, 7, 11, 3, 2, 8, 15, 10, 9, 14];

const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001110', '.': '000000000000010', ',': '000000000010100', '!': '010010010000010', '?': '110001010000010',
  '-': '000000111000000', "'": '010010000000000', '/': '001001010100100', ':': '000010000010000',
};
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const COIN = ['.XXX.', 'XX.XX', 'XX.XX', 'XX.XX', '.XXX.'];

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function toLab(r: number, g: number, b: number): Lab {
  const lr = srgbToLinear(r / 255), lg = srgbToLinear(g / 255), lb = srgbToLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const CHROMA = 2.2; // chroma counts for more than lightness when matching, so greys stay grey
const distance = (a: Lab, L: number, A: number, B: number) => {
  const dl = a[0] - L, da = a[1] - A, db = a[2] - B;
  return dl * dl + CHROMA * (da * da + db * db);
};
const hash = (x: number, y: number, seed: number) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const percentile = (values: number[], at: number) => {
  if (!values.length) return 0;
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * at))];
};

export default defineLook({
  questions: {
    palette: choice('Which machine’s palette is the picture limited to?', {
      gameboy: 'Four pea-soup greens of an early handheld: olive, murky, nostalgic, unlit.',
      pocket: 'Four neutral greys on a pale grey panel: a pocket handheld, quiet and clean.',
      onebit: 'Pure one-bit ink and paper, every tone made of dither alone: early desktop computers, stark and literate.',
      cga: 'Black, cyan, magenta and white only: garish early PC graphics, synthetic and strange.',
      nes: 'A dozen flat console colours picked from a living-room 8-bit machine: bright primaries, sky blues, brick oranges.',
      pc16: 'The sixteen fixed colours of an old PC adventure: harsh, saturated, heavily dithered.',
      c64: 'Sixteen dusty home-computer colours: muted browns, lavender, slate blue, a loading-screen melancholy.',
      fantasy: 'A punchy modern sixteen-colour indie palette: navy shadows, hot pink, peach, clean greens.',
      pastel: 'Soft candy pastels with plum shadows: a late pastel handheld, gentle, cute and dreamy.',
    }),
    resolution: score('How coarse is the pixel grid?', [
      'Tiny: huge blocks, almost an icon',
      'Very chunky',
      'Chunky, like an 8-bit sprite scene',
      'Medium, like a handheld screen',
      'Fine, like a 16-bit game',
      'Finest: small crisp pixels with room for detail',
    ]),
    dither: choice('What pattern mixes two colours where the light falls off?', {
      bayer: 'A fine ordered crosshatch of graded densities, the classic smooth dither.',
      coarse: 'A blunt two-by-two ordered pattern with only a few visible steps.',
      checker: 'Only a strict half-and-half checkerboard band between shades.',
      hatch: 'Diagonal pixel stripes, like hand-placed hatching.',
      cluster: 'Clustered dots that swell like a tiny halftone.',
      noise: 'Scattered random pixels, grainy and organic.',
      none: 'No dither at all: hard flat bands of colour.',
    }),
    blending: score('How far do the dither bands reach across each surface?', [
      'A thin seam only',
      'Narrow bands',
      'Moderate',
      'Wide gradients',
      'Dither everywhere',
    ]),
    outline: choice('How are the sprites outlined?', {
      none: 'No outlines: shapes are separated by colour alone.',
      silhouette: 'One dark pixel line around each object, nothing inside.',
      full: 'Dark outlines plus darker interior lines along steps and creases.',
      selout: 'Selective outlining: each edge is a deeper shade of the colour it borders, soft and painterly.',
      broken: 'The outline breaks into a highlight on the side facing the light.',
      heavy: 'A thick two-pixel sticker outline, bold and cartoonish.',
    }),
    light: choice('How does light shape the forms?', {
      soft: 'Shading as lit in the scene, stepped gently into a few tones.',
      flat: 'Nearly flat local colour, like a simple icon or board-game token.',
      cel: 'Two hard tones per surface: a lit side and a shadow side.',
      rim: 'Dark moody forms caught by a bright rim on the lit edge.',
    }),
    screen: choice('What kind of screen is it shown on?', {
      crisp: 'Perfect square pixels, as in an emulator or a modern pixel-art piece.',
      dotmatrix: 'A reflective dot-matrix LCD: visible gaps between pixels.',
      crt: 'A glass tube television: scanlines, soft horizontal smear and dark corners.',
      backlit: 'A backlit handheld panel with red, green and blue stripes in every pixel.',
    }),
    backdrop: choice('What fills the empty background behind the scene?', {
      plain: 'Left as it is: one calm field of colour.',
      bands: 'A sky gradient stepped into dithered horizontal bands.',
      stars: 'Sparse specks and little cross-shaped twinkles.',
      tiles: 'A faint checker of large tiles, like a menu or level-select wallpaper.',
    }),
    frame: choice('What is the game doing in this screenshot?', {
      none: 'Nothing on top: just the scene.',
      hud: 'Mid-play: hearts and a coin counter sit in the corners.',
      dialog: 'Someone is speaking: a text box along the bottom carries a line.',
      title: 'Waiting on the title screen: dark bars and PRESS START.',
      bezel: 'Paused inside a dark handheld screen border.',
    }),
  },

  async apply(capture, a, context, signal) {
    const { size, color, identity, normal, depth, diffuse, light } = capture;
    const mood = context.mood;
    const seed = context.seed | 0;
    const G = GRIDS[Math.min(GRIDS.length - 1, Math.round(a.resolution * (GRIDS.length - 1)))];
    const cell = Math.max(1, Math.floor(size / G));
    const cells = G * G;
    // Timers are throttled in a hidden tab, so yield through a message port instead.
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => { channel.port1.close(); resolve(); };
        channel.port2.postMessage(0);
      });
      signal.throwIfAborted();
    };

    // 1. Resample: each cell takes the identity most of its pixels share, and averages only those.
    const id = new Uint8Array(cells);
    const L = new Float32Array(cells), A = new Float32Array(cells), B = new Float32Array(cells);
    const lit = new Float32Array(cells), deep = new Float32Array(cells);
    const nx = new Float32Array(cells), ny = new Float32Array(cells), nz = new Float32Array(cells);
    const counts = new Uint16Array(256);
    for (let cy = 0; cy < G; cy++) {
      for (let cx = 0; cx < G; cx++) {
        const seen: number[] = [];
        for (let y = cy * cell; y < (cy + 1) * cell; y++)
          for (let x = cx * cell; x < (cx + 1) * cell; x++) {
            const v = identity[(y * size + x) * 4];
            if (counts[v]++ === 0) seen.push(v);
          }
        let best = seen[0];
        for (const v of seen) if (counts[v] > counts[best] || (counts[v] === counts[best] && v > best)) best = v;
        for (const v of seen) counts[v] = 0;
        let r = 0, g = 0, b = 0, d = 0, z = 0, n0 = 0, n1 = 0, n2 = 0, n = 0;
        for (let y = cy * cell; y < (cy + 1) * cell; y++)
          for (let x = cx * cell; x < (cx + 1) * cell; x++) {
            const p = (y * size + x) * 4;
            if (identity[p] !== best) continue;
            r += color[p]; g += color[p + 1]; b += color[p + 2];
            d += diffuse[p];
            z += depth[p] + depth[p + 1] / 256;
            n0 += normal[p]; n1 += normal[p + 1]; n2 += normal[p + 2];
            n++;
          }
        const at = cy * G + cx;
        id[at] = best;
        const lab = toLab(r / n, g / n, b / n);
        L[at] = lab[0]; A[at] = lab[1]; B[at] = lab[2];
        lit[at] = d / n / 255;
        deep[at] = best === 0 ? 1 : z / n / 255;
        const vx = n0 / n / 127.5 - 1, vy = n1 / n / 127.5 - 1, vz = n2 / n / 127.5 - 1;
        const len = Math.hypot(vx, vy, vz) || 1;
        nx[at] = vx / len; ny[at] = vy / len; nz[at] = vz / len;
      }
    }
    await pause();

    // 2. The palette, and the part of it this picture is allowed to use.
    const spec = PALETTES[a.palette];
    let rgbs = spec.hex.split(' ').map((h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)));
    let labs = rgbs.map(([r, g, b]) => toLab(r, g, b));
    const tonal = !!spec.tonal;

    // 3. Relight. Tone comes from the render, pushed around by the plain-lighting channel.
    const solidLit: number[] = [];
    for (let i = 0; i < cells; i++) if (id[i] >= 1) solidLit.push(lit[i]);
    const litRef = Math.max(0.02, percentile(solidLit, 0.95));
    const litMid = percentile(solidLit, 0.5) / litRef;
    const lxy = Math.hypot(light[0], light[1]) || 1;
    // The empty field: backdrop or floor that matches the colour along the top and upper sides of the frame.
    const backdropL: number[] = [], backdropA: number[] = [], backdropB: number[] = [];
    for (let i = 0; i < cells; i++) {
      const cy = Math.floor(i / G), cx = i % G;
      if (id[i] <= 1 && (cy === 0 || ((cx === 0 || cx === G - 1) && cy < G * 0.6))) {
        backdropL.push(L[i]); backdropA.push(A[i]); backdropB.push(B[i]);
      }
    }
    const sky: Lab = [percentile(backdropL, 0.5), percentile(backdropA, 0.5), percentile(backdropB, 0.5)];
    const empty = new Uint8Array(cells);
    if (backdropL.length > G / 2)
      for (let i = 0; i < cells; i++)
        if (id[i] <= 1 && distance(sky, L[i], A[i], B[i]) < 0.006) empty[i] = 1;

    const saturation = (tonal ? 1 : 1.05 + mood.cheer * 0.35) * (a.light === 'flat' ? 1.12 : 1);
    for (let i = 0; i < cells; i++) {
      if (id[i] >= 1 && !empty[i]) {
        const l = clamp01(lit[i] / litRef);
        const facing = nx[i] * light[0] - ny[i] * light[1] + nz[i] * light[2];
        if (a.light === 'soft') L[i] += (l - litMid) * 0.1;
        else if (a.light === 'flat') L[i] -= (l - litMid) * 0.2;
        else if (a.light === 'cel') L[i] += -(l - litMid) * 0.12 + (l > litMid * 0.92 ? 0.06 : -0.13);
        else if (id[i] >= 2) {
          const side = (nx[i] * light[0] - ny[i] * light[1]) / lxy;
          const rim = Math.pow(1 - clamp01(nz[i]), 1.5) * clamp01(side * 1.4 + 0.1);
          L[i] = L[i] * 0.72 - 0.03 + rim * 0.55 + clamp01(facing) * 0.05;
        } else L[i] -= 0.06;
        // The pixel artist's habit: shadows lean cool, highlights lean warm.
        if (!tonal) {
          const lean = (L[i] - 0.6) * 0.045;
          B[i] += lean; A[i] += lean * 0.25;
        }
      } else if (empty[i]) {
        const cy = Math.floor(i / G), cx = i % G;
        if (a.backdrop === 'bands') {
          const t = cy / (G - 1) - 0.5;
          // Deeper and bluer overhead, paler toward the horizon.
          L[i] += t * 0.26 - 0.06;
          B[i] -= (0.5 - t) * 0.05; A[i] -= (0.5 - t) * 0.012;
        } else {
          // An empty field is one flat colour; patterns are laid on it afterwards.
          L[i] = sky[0]; A[i] = sky[1]; B[i] = sky[2];
        }
      }
      A[i] *= saturation; B[i] *= saturation;
    }

    // Stretch the tonal range onto the palette's, so a four-shade machine uses all four shades.
    const allL = Array.from(L);
    const lo = percentile(allL, 0.02), hi = percentile(allL, 0.985);
    const palLo = Math.min(...labs.map((c) => c[0])), palHi = Math.max(...labs.map((c) => c[0]));
    const stretch = tonal ? 1 : 0.55;
    for (let i = 0; i < cells; i++) {
      const t = (L[i] - lo) / Math.max(0.05, hi - lo);
      const target = palLo + (palHi - palLo) * (tonal ? Math.pow(clamp01(t), 0.9) : t);
      L[i] = L[i] + (target - L[i]) * stretch;
    }

    const nearest = (l: number, aa: number, bb: number, below = Infinity) => {
      let best = -1, bestD = Infinity;
      for (let k = 0; k < labs.length; k++) {
        if (labs[k][0] >= below) continue;
        const d = tonal ? Math.abs(labs[k][0] - l) : distance(labs[k], l, aa, bb);
        if (d < bestD) { bestD = d; best = k; }
      }
      return best;
    };

    // A long palette is cut down to the colours this scene leans on, as an artist would choose a set.
    if (spec.limit && labs.length > spec.limit) {
      const used = new Float64Array(labs.length);
      for (let i = 0; i < cells; i++) used[nearest(L[i], A[i], B[i])] += id[i] >= 2 ? 3 : 1;
      const order = [...used.keys()].sort((p, q) => used[q] - used[p]);
      const darkest = labs.reduce((m, c, k) => (c[0] < labs[m][0] ? k : m), 0);
      const lightest = labs.reduce((m, c, k) => (c[0] > labs[m][0] ? k : m), 0);
      const keep = new Set<number>([darkest, lightest]);
      for (const k of order) { if (keep.size >= spec.limit) break; if (used[k] > 0) keep.add(k); }
      rgbs = [...keep].map((k) => rgbs[k]);
      labs = [...keep].map((k) => labs[k]);
    }
    const P = labs.length;
    const darkest = labs.reduce((m, c, k) => (c[0] < labs[m][0] ? k : m), 0);
    const lightest = labs.reduce((m, c, k) => (c[0] > labs[m][0] ? k : m), 0);
    await pause();

    // 4. Match every cell to a pair of palette colours and let the dither pattern pick between them.
    const spread = 0.12 + a.blending * 0.88;
    const threshold = (x: number, y: number): number => {
      switch (a.dither) {
        case 'bayer': return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
        case 'coarse': return ([0, 2, 3, 1][(y & 1) * 2 + (x & 1)] + 0.5) / 4;
        case 'checker': return (x + y) & 1 ? 0.3 : 0.9;
        case 'hatch': return [0.14, 0.62, 0.36, 0.9][(x + y) & 3];
        case 'cluster': return (CLUSTER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
        case 'noise': return hash(x, y, seed);
        default: return 2;
      }
    };
    const index = new Uint8Array(cells);
    for (let cy = 0; cy < G; cy++) {
      if (cy % 60 === 0) await pause();
      for (let cx = 0; cx < G; cx++) {
        const i = cy * G + cx;
        const l = L[i], aa = A[i], bb = B[i];
        const p1 = nearest(l, aa, bb);
        const c1 = labs[p1];
        let p2 = p1, t2 = 0, bestErr = tonal ? Infinity : distance(c1, l, aa, bb);
        for (let k = 0; k < P; k++) {
          if (k === p1) continue;
          const c2 = labs[k];
          if (tonal) {
            // The next shade on the side the target lies.
            const span = c2[0] - c1[0];
            if (span === 0 || Math.sign(span) !== Math.sign(l - c1[0])) continue;
            if (Math.abs(span) < bestErr) { bestErr = Math.abs(span); p2 = k; t2 = Math.min(0.5, (l - c1[0]) / span); }
            continue;
          }
          const dl = c2[0] - c1[0], da = c2[1] - c1[1], db = c2[2] - c1[2];
          const span = dl * dl + CHROMA * (da * da + db * db);
          const t = Math.max(0, Math.min(0.5, ((l - c1[0]) * dl + CHROMA * ((aa - c1[1]) * da + (bb - c1[2]) * db)) / span));
          if (t < 0.04) continue;
          const err = distance([c1[0] + dl * t, c1[1] + da * t, c1[2] + db * t], l, aa, bb) + 0.1 * t * span;
          if (err < bestErr) { bestErr = err; p2 = k; t2 = t; }
        }
        const reach = 0.5 - (0.5 - t2) / spread;
        index[i] = !(empty[i] && a.backdrop !== 'bands') && reach > threshold(cx, cy) * 0.5 ? p2 : p1;
      }
    }

    // Wallpaper tiles: a neighbouring shade where the palette has one, a sparse dot screen where it does not.
    if (a.backdrop === 'tiles') {
      const tile = Math.max(4, Math.round(G / 12));
      for (let cy = 0; cy < G; cy++)
        for (let cx = 0; cx < G; cx++) {
          const i = cy * G + cx;
          if (!empty[i] || (Math.floor(cx / tile) + Math.floor(cy / tile)) % 2 === 0) continue;
          const own = labs[index[i]];
          let alt = -1, altD = Infinity;
          for (let k = 0; k < P; k++) {
            if (k === index[i]) continue;
            const d = tonal ? Math.abs(labs[k][0] - own[0]) : distance(labs[k], own[0] - 0.05, own[1], own[2]);
            if (d < altD) { altD = d; alt = k; }
          }
          if (alt < 0) continue;
          const near = !tonal && distance(labs[alt], own[0], own[1], own[2]) < 0.02;
          if (near || (cx % 2 === 0 && cy % 2 === 0)) index[i] = alt;
        }
    }

    // Sparse stars on the empty backdrop.
    if (a.backdrop === 'stars') {
      const skyDark = labs[nearest(sky[0], sky[1], sky[2])][0] < 0.55;
      const speck = skyDark ? lightest : nearest(sky[0] - 0.22, sky[1], sky[2], tonal ? sky[0] - 0.05 : Infinity);
      const put = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= G || y >= G) return;
        if (empty[y * G + x]) index[y * G + x] = speck < 0 ? darkest : speck;
      };
      for (let cy = 0; cy < G; cy++)
        for (let cx = 0; cx < G; cx++) {
          const h = hash(cx, cy, seed + 77);
          if (h < 0.012) put(cx, cy);
          if (h < 0.0022 && G >= 90) { put(cx - 1, cy); put(cx + 1, cy); put(cx, cy - 1); put(cx, cy + 1); }
        }
    }

    // 5. Outlines, from identity (silhouettes) and from depth steps and creases (interior lines).
    if (a.outline !== 'none') {
      const fill = Uint8Array.from(index);
      const metresPerCell = capture.pixelWorldSize * cell;
      const range = capture.far - capture.near;
      const shade = (i: number) => {
        const own = labs[fill[i]];
        const k = nearest(own[0] - 0.2, own[1] * 1.15, own[2] * 1.15 - 0.015, own[0] - 0.04);
        return k < 0 ? darkest : k;
      };
      const outside: number[] = [];
      for (let cy = 0; cy < G; cy++)
        for (let cx = 0; cx < G; cx++) {
          const i = cy * G + cx;
          if (id[i] < 2 || empty[i]) continue;
          let silhouette = false, inner = false, ox = 0, oy = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = cx + dx, y = cy + dy;
            if (x < 0 || y < 0 || x >= G || y >= G) continue;
            const j = y * G + x;
            if (id[j] !== id[i]) {
              if (deep[i] <= deep[j] + 1e-4 || id[j] < 2) { silhouette = true; ox += dx; oy += dy; if (id[j] < 2) outside.push(j); }
            } else {
              const step = (deep[j] - deep[i]) * range;
              if (step > metresPerCell * 5) inner = true;
              else if ((dx > 0 || dy > 0) && nx[i] * nx[j] + ny[i] * ny[j] + nz[i] * nz[j] < 0.35) inner = true;
            }
          }
          if (silhouette) {
            if (a.outline === 'selout') index[i] = shade(i);
            else if (a.outline === 'broken' && (ox * light[0] + oy * light[1]) / lxy > 0.35) {
              const own = labs[fill[i]];
              let k = -1, bestD = Infinity;
              for (let q = 0; q < P; q++) {
                if (labs[q][0] <= own[0] + 0.04) continue;
                const d = tonal ? labs[q][0] - own[0] : distance(labs[q], own[0] + 0.2, own[1], own[2]);
                if (d < bestD) { bestD = d; k = q; }
              }
              index[i] = k < 0 ? fill[i] : k;
            } else index[i] = darkest;
          } else if (inner && a.outline !== 'silhouette') index[i] = shade(i);
        }
      if (a.outline === 'heavy') for (const j of outside) index[j] = darkest;
    }
    await pause();

    // 6. Whatever the game draws over the scene.
    const u = G >= 180 ? 2 : 1;
    const set = (x: number, y: number, k: number) => {
      if (x >= 0 && y >= 0 && x < G && y < G) index[y * G + x] = k;
    };
    const rect = (x: number, y: number, w: number, h: number, k: number) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, k);
    };
    const accent = (r: number, g: number, b: number) => {
      const want = toLab(r, g, b);
      let best = 0, bestD = Infinity;
      for (let k = 0; k < P; k++) {
        const d = distance(labs[k], want[0], want[1], want[2]);
        if (d < bestD) { bestD = d; best = k; }
      }
      return best;
    };
    const mid = tonal && P > 2 ? [...labs.keys()].sort((p, q) => labs[p][0] - labs[q][0])[1] : accent(120, 120, 130);
    const sprite = (rows: string[], x: number, y: number, k: number, edge: number) => {
      for (let pass = 0; pass < 2; pass++)
        rows.forEach((row, j) => [...row].forEach((ch, i) => {
          if (ch !== 'X') return;
          if (pass === 0) rect(x + (i - 1) * u, y + (j - 1) * u, 3 * u, 3 * u, edge);
          else rect(x + i * u, y + j * u, u, u, k);
        }));
    };
    const text = (line: string, x: number, y: number, k: number, edge = -1) => {
      for (let pass = edge < 0 ? 1 : 0; pass < 2; pass++)
        [...line].forEach((ch, n) => {
          const glyph = FONT[ch];
          if (!glyph) return;
          for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) {
            if (glyph[j * 3 + i] !== '1') continue;
            if (pass === 0) rect(x + (n * 4 + i - 1) * u, y + (j - 1) * u, 3 * u, 3 * u, edge);
            else rect(x + (n * 4 + i) * u, y + j * u, u, u, k);
          }
        });
    };
    if (a.frame === 'hud') {
      const red = tonal ? lightest : accent(230, 40, 60), gold = tonal ? lightest : accent(250, 200, 40);
      const full = 1 + Math.round(mood.cheer * 2);
      for (let h = 0; h < 3; h++) sprite(HEART, (3 + h * 9) * u, 3 * u, h < full ? red : mid, darkest);
      const coins = String(Math.floor(hash(1, 2, seed) * 100)).padStart(2, '0');
      const right = G - (3 + 5 + 2 + 12) * u;
      sprite(COIN, right, 3 * u, gold, darkest);
      text(`X${coins}`, right + 8 * u, 3 * u, lightest, darkest);
    } else if (a.frame === 'dialog') {
      const perLine = Math.floor((G - 14 * u) / (4 * u));
      const words = (context.idea || '...').toUpperCase().replace(/[^A-Z0-9.,!?'\/:-]+/g, ' ').trim().split(' ');
      const lines: string[] = [''];
      for (const word of words) {
        const current = lines[lines.length - 1];
        if ((current ? current.length + 1 : 0) + word.length <= perLine) lines[lines.length - 1] = current ? `${current} ${word}` : word;
        else if (lines.length < 2) lines.push(word.slice(0, perLine));
        else { lines[1] = `${lines[1].slice(0, perLine - 3)}...`; break; }
      }
      const h = 19 * u, top = G - h - 3 * u, left = 3 * u, w = G - 6 * u;
      const box = tonal ? darkest : accent(24, 36, 110);
      rect(left, top, w, h, darkest);
      rect(left + u, top + u, w - 2 * u, h - 2 * u, lightest);
      rect(left + 2 * u, top + 2 * u, w - 4 * u, h - 4 * u, box === lightest ? darkest : box);
      for (const [cx, cy] of [[left, top], [left + w - u, top], [left, top + h - u], [left + w - u, top + h - u]])
        rect(cx, cy, u, u, fillAt(index, G, cx, cy < G / 2 ? cy - 1 : cy + 1, darkest));
      lines.forEach((line, n) => text(line, left + 4 * u, top + (4 + n * 6) * u, lightest));
      const ax = left + w - 8 * u, ay = top + h - 6 * u;
      rect(ax, ay, 3 * u, u, lightest); rect(ax + u, ay + u, u, u, lightest);
    } else if (a.frame === 'title') {
      const bar = Math.round(G * 0.11);
      rect(0, 0, G, bar, darkest);
      rect(0, G - bar, G, bar, darkest);
      rect(0, bar, G, 1, mid); rect(0, G - bar - 1, G, 1, mid);
      const label = G >= 90 ? 'PRESS START' : 'START';
      text(label, Math.round((G - label.length * 4 * u) / 2), G - Math.round(bar / 2) - 2 * u, lightest);
    } else if (a.frame === 'bezel') {
      const b = Math.max(3, Math.round(G * 0.045));
      rect(0, 0, G, b, darkest); rect(0, G - b, G, b, darkest); rect(0, 0, b, G, darkest); rect(G - b, 0, b, G, darkest);
      rect(b, b, G - 2 * b, 1, mid); rect(b, G - b - 1, G - 2 * b, 1, mid); rect(b, b, 1, G - 2 * b, mid); rect(G - b - 1, b, 1, G - 2 * b, mid);
      for (const [x, y] of [[b, b], [G - b - 1, b], [b, G - b - 1], [G - b - 1, G - b - 1]]) set(x, y, darkest);
      const led = tonal ? lightest : accent(240, 50, 50);
      rect(Math.round(b / 2) - 1, Math.round(G * 0.3), Math.max(1, b - 2), Math.max(1, b - 2), led);
    }

    // 7. Show it on a screen.
    const pixels = new Uint8ClampedArray(size * size * 4);
    const ground = rgbs[lightest];
    const grime = Math.max(0, mood.wear - 0.45) * 1.8;
    const cellAt = (x: number, y: number) => rgbs[index[Math.min(G - 1, Math.floor(y / cell)) * G + Math.min(G - 1, Math.floor(x / cell))]];
    const centre = size / 2;
    for (let y = 0; y < size; y++) {
      if (y % 180 === 0) await pause();
      const fy = y % cell;
      const cy = Math.min(G - 1, Math.floor(y / cell));
      for (let x = 0; x < size; x++) {
        const fx = x % cell;
        const cx = Math.min(G - 1, Math.floor(x / cell));
        const c = rgbs[index[cy * G + cx]];
        let r = c[0], g = c[1], b = c[2];
        if (a.screen === 'dotmatrix') {
          // A reflective panel: lit pixels sit on a pale ground, with a gap and a faint cast shadow.
          const gap = cell >= 3 && (fx === cell - 1 || fy === cell - 1);
          const k = gap ? 0.5 : cell >= 5 && (fx === 0 || fy === 0) ? 0.1 : 0;
          const tint = 0.06;
          r = r + (ground[0] - r) * (k + tint); g = g + (ground[1] - g) * (k + tint); b = b + (ground[2] - b) * (k + tint);
          if (grime > 0) {
            const blotch = hash(cx >> 3, cy >> 3, seed + 5) * hash(cx >> 1, cy >> 1, seed + 9);
            const f = 1 - grime * 0.13 * blotch;
            r *= f; g *= f; b *= f * 0.97;
          }
        } else if (a.screen === 'crt') {
          const l1 = cellAt(Math.max(0, x - 1), y), r1 = cellAt(Math.min(size - 1, x + 1), y);
          const l2 = cellAt(Math.max(0, x - 2), y), r2 = cellAt(Math.min(size - 1, x + 2), y);
          r = r * 0.4 + (l1[0] + r1[0]) * 0.2 + (l2[0] + r2[0]) * 0.1;
          g = g * 0.4 + (l1[1] + r1[1]) * 0.2 + (l2[1] + r2[1]) * 0.1;
          b = b * 0.4 + (l1[2] + r1[2]) * 0.2 + (l2[2] + r2[2]) * 0.1;
          const beam = cell >= 3 ? 0.74 + 0.4 * Math.sin((Math.PI * (fy + 0.5)) / cell) : y % 2 ? 0.86 : 1.08;
          const dx = (x - centre) / centre, dy = (y - centre) / centre;
          const vignette = 1 - 0.3 * Math.pow(dx * dx + dy * dy, 1.3) * 0.6;
          const snow = 1 + (hash(x, y, seed + 3) - 0.5) * (0.05 + grime * 0.18);
          const f = beam * vignette * snow;
          const stripe = x % 3;
          r = (r * 0.96 + 8) * f * (stripe === 0 ? 1.07 : 0.97);
          g = (g * 0.96 + 8) * f * (stripe === 1 ? 1.07 : 0.97);
          b = (b * 0.96 + 8) * f * (stripe === 2 ? 1.07 : 0.97);
        } else if (a.screen === 'backlit') {
          const stripe = cell >= 3 ? Math.floor((fx * 3) / cell) : x % 3;
          const row = cell >= 4 && fy === cell - 1 ? 0.72 : 1;
          const lift = 14 + grime * 10;
          r = (r * 0.94 + lift) * (stripe === 0 ? 1.2 : 0.86) * row;
          g = (g * 0.94 + lift) * (stripe === 1 ? 1.2 : 0.86) * row;
          b = (b * 0.94 + lift) * (stripe === 2 ? 1.2 : 0.86) * row;
        }
        const out = (y * size + x) * 4;
        pixels[out] = r; pixels[out + 1] = g; pixels[out + 2] = b; pixels[out + 3] = 255;
      }
    }

    return {
      pixels,
      notes: [
        `${G} × ${G} pixels in the ${a.palette} palette (${P} colours)`,
        `${a.dither === 'none' ? 'flat bands' : `${a.dither} dither`}, ${a.outline} outline, ${a.light} light`,
        `${a.screen} screen${a.backdrop === 'plain' ? '' : `, ${a.backdrop} backdrop`}${a.frame === 'none' ? '' : `, ${a.frame}`}`,
      ],
    };
  },
});

/** The colour just outside a box corner, so the corner can be knocked back to round it. */
function fillAt(index: Uint8Array, G: number, x: number, y: number, fallback: number) {
  return x >= 0 && y >= 0 && x < G && y < G ? index[y * G + x] : fallback;
}
