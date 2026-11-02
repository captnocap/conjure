import { type Palette, type PaletteRole, choice, clamp01, defineLook, fromOklch, mix, oklch, paintRGB, rekey, score, seeded } from '@conjure/kit';

/**
 * Ukiyo-e: the frame is cut into blocks the way a publisher's workshop would.
 *   1. the colour capture is flattened and matched to a handful of mineral pigments (one block each),
 *   2. each block is printed as a transparent ink with its own wood grain and registration,
 *   3. bokashi gradations are wiped in: the sky band, the horizon, the ground, the shaded side of things,
 *   4. the key block is cut from identity, depth, normal and pigment boundaries and printed last,
 *   5. weather, cartouche, signature and seals go on, and the paper ages with the mood.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const smooth = (from: number, to: number, x: number) => {
  const t = clamp01((x - from) / (to - from));
  return t * t * (3 - 2 * t);
};

interface Inks {
  key: string;
  /** The sky block at full strength, and the tint wiped along the horizon. */
  deep: string;
  horizon: string;
  /** What the shaded side of a form is overprinted with. */
  shade: string;
  grey: string;
  seal: string;
  cartouche: string;
  pigments: string[];
}

const PALETTES: Record<string, Inks> = {
  prussian: {
    key: '#1a2746', deep: '#1f4f8f', horizon: '#e6b08a', shade: '#55709c', grey: '#7f8a8c', seal: '#c2362a', cartouche: '#d9b45a',
    pigments: ['#1f4f8f', '#cfa256', '#5f8f6c', '#d78c7c', '#8a5b3d', '#4e87a8'],
  },
  tokaido: {
    key: '#1b1917', deep: '#23447e', horizon: '#d8563a', shade: '#5a6787', grey: '#7c8187', seal: '#c8382b', cartouche: '#c8382b',
    pigments: ['#27457a', '#4f8058', '#c2432f', '#e0b74a', '#b78b5c', '#6d5a88', '#7fa9b5'],
  },
  aizuri: {
    key: '#132c5a', deep: '#1d4f91', horizon: '#9fbcd6', shade: '#4d73a8', grey: '#6b86a3', seal: '#c8382b', cartouche: '#e7dfc8',
    pigments: ['#1d4f91', '#3f74ad', '#5b7fa0'],
  },
  benizuri: {
    key: '#221d1b', deep: '#cf6a72', horizon: '#e3c878', shade: '#a0707a', grey: '#958f84', seal: '#b93a3a', cartouche: '#e3c878',
    pigments: ['#cf6a72', '#6f9460', '#e2c877', '#b7846a'],
  },
  kabuki: {
    key: '#141211', deep: '#5a5652', horizon: '#8e8982', shade: '#4b4441', grey: '#6e6a66', seal: '#b8322a', cartouche: '#c99a3e',
    pigments: ['#b8322a', '#c99a3e', '#6f7442', '#5b3f6e', '#2c2724', '#2f5a6e'],
  },
  twilight: {
    key: '#151a2e', deep: '#17274f', horizon: '#e58a4a', shade: '#3c4877', grey: '#5c6678', seal: '#c63b2e', cartouche: '#e9a23e',
    pigments: ['#1c2f5c', '#4b4a82', '#2f6d78', '#f0a13c', '#c9697a', '#4d6b4f', '#7c93b8'],
  },
  autumn: {
    key: '#2a1c14', deep: '#d9a04c', horizon: '#eccf8e', shade: '#8d6a4c', grey: '#8b8f78', seal: '#b52f22', cartouche: '#d9632b',
    pigments: ['#d9632b', '#d4a23a', '#7b7a3c', '#7a4a2c', '#a63a28', '#3c5578'],
  },
};

/**
 * How the picture's palette reaches the blocks. Every print tints its paper toward the ground and
 * prints its horizon wipe and title cartouche in the second colour; the red seal and the key line stay.
 * The named techniques (Hokusai's Prussian blue, the blue-only aizuri, the rose-and-green benizuri)
 * keep their pigments; the mood sets (tokaido, kabuki, twilight, autumn) re-key them, the hues near
 * their brightest pigment taking the ink and the rest the second, so the set still reads as woodblock.
 */
const CANONICAL = new Set(['prussian', 'aizuri', 'benizuri']);
const hexOf = (c: readonly number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
function keyInks(designed: Inks, palette: Palette | undefined, name: string): Inks {
  if (!palette) return designed;
  const half = (role: PaletteRole, list: string[], roles?: PaletteRole[]): string[] => {
    const bytes = list.map(hex);
    const out = rekey(Object.fromEntries(bytes.map((c, i) => [i, c])), palette, Object.fromEntries(bytes.map((_, i) => [i, roles?.[i] ?? role])));
    return list.map((_, i) => {
      const r = roles?.[i] ?? role;
      const [L, C, h] = oklch(out[i]);
      const target = oklch(paintRGB(palette[r]))[2];
      return hexOf(fromOklch(L, C, target + Math.atan2(Math.sin(h - target), Math.cos(h - target)) * 0.5));
    });
  };
  const [horizon, cartouche] = half('second', [designed.horizon, designed.cartouche]);
  const keyed = { ...designed, horizon, cartouche };
  if (CANONICAL.has(name)) return keyed;
  const lch = designed.pigments.map((h) => oklch(hex(h)));
  const anchor = lch.reduce((best, c, i) => (c[1] > lch[best][1] ? i : best), 0);
  const roles = lch.map(([, , h]): PaletteRole => (Math.abs(Math.atan2(Math.sin(h - lch[anchor][2]), Math.cos(h - lch[anchor][2]))) < 0.9 ? 'ink' : 'second'));
  const [deep, shade] = half('ink', [designed.deep, designed.shade]);
  return { ...keyed, deep, shade, pigments: half('ink', designed.pigments, roles) };
}

const PAPERS: Record<string, string> = {
  hosho: '#f0e7d2',
  aged: '#dfcca4',
  tea: '#cbb086',
  grey: '#d6d7cc',
  crepe: '#ead9bd',
};

// sRGB → OKLab, for judging which pigment a colour is nearest to.
const LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const oklab = (r: number, g: number, b: number): RGB => {
  const R = LINEAR[Math.max(0, Math.min(255, Math.round(r)))];
  const G = LINEAR[Math.max(0, Math.min(255, Math.round(g)))];
  const B = LINEAR[Math.max(0, Math.min(255, Math.round(b)))];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const hash = (x: number, y: number, s: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

export default defineLook({
  questions: {
    palette: choice('Which set of pigments did the publisher pay for?', {
      prussian: 'Prussian blue with pale ochre, soft green and a blush of pink, outlined in blue: the great wave and the mountain views.',
      tokaido: 'A full set of bright, clear pigments under a black line: a lively travel print of the road and its stations.',
      aizuri: 'Blue alone, in three strengths, on bare paper: a cool, quiet, porcelain picture.',
      benizuri: 'Rose red and soft green only, with a little yellow: an early, gentle, two-block print.',
      kabuki: 'Black and a few strong, saturated pigments on a dark mica ground: an actor print, theatrical and severe.',
      twilight: 'Deep night shades with one glowing lamp colour: a later print of dusk, rain-wet streets and lit windows.',
      autumn: 'Earthy, dusty pigments under a glowing sky: maple season, harvest, ripe and dry.',
    }),
    sky: choice('How is the sky block wiped?', {
      band: 'One dark band wiped across the very top, fading quickly to bare paper.',
      glow: 'A dark band at the top and a second colour rising from the horizon, with bare paper between.',
      wash: 'A pale flat tint over the whole sky that deepens toward the top.',
      deep: 'Printed solid and deep right down to a paler horizon, with a full moon left as bare paper.',
      bare: 'Left as unprinted paper, with only a breath of tint at the horizon.',
    }),
    weather: choice('What weather is cut into the blocks?', {
      clear: 'A clear still day, nothing in the air.',
      rain: 'A sudden shower: fine dark slanting lines ruled across the whole picture.',
      snow: 'Snowfall: every upward surface left as white paper, flakes spattered over everything.',
      mist: 'Bands of flat stylised mist drifting across and hiding the distance.',
      blossom: 'Petals on the wind: small pink and white flecks scattered through the scene.',
    }),
    keyline: score('How heavy is the key-block outline?', [
      'A hairline, barely holding the colours',
      'Fine',
      'Confident',
      'Bold',
      'Thick and black, like an actor print',
    ]),
    hand: choice("What is the block cutter's line like?", {
      even: 'An even wiry line of one width throughout.',
      swelling: 'A line that swells on the shaded side of forms and thins toward the light.',
      brush: 'A calligraphic brush line, thick on one diagonal and thin on the other.',
    }),
    blocks: score('How finely are the colour blocks cut?', [
      'A few broad flat shapes',
      'Simplified',
      'Balanced',
      'Detailed',
      'Many small blocks and extra tone printings',
    ]),
    grain: score('How much of the wood and the baren shows in the flat colour?', [
      'Smooth, even colour',
      'A trace',
      'Visible grain',
      'Strong grain',
      'Streaky, thin ink with the plank showing through',
    ]),
    paper: choice('What paper is it printed on?', {
      hosho: 'Fresh creamy hosho paper, bright and soft.',
      aged: 'Paper toned to a warm tan by a century of light.',
      tea: 'Deeply browned paper, the colour of strong tea.',
      grey: 'Cool pale grey-green paper.',
      crepe: 'Crinkled crepe paper, covered in fine horizontal ridges.',
    }),
    signature: choice('How is the print titled and signed?', {
      title: 'A coloured title cartouche in a top corner, with a signature column and red seal below.',
      twin: 'Twin coloured cartouches for the series and the place, a signature panel and a round censor seal.',
      seal: 'No title: only a small signature and a square red seal in a quiet corner.',
      gourd: 'A signature column ending in a gourd-shaped red seal.',
      unsigned: 'Unsigned and untitled, a proof before the lettering was cut.',
    }),
  },

  async apply(capture, a, context, signal) {
    const { size, color, identity, normal, depth, diffuse } = capture;
    const N = size * size;
    const seed = context.seed | 0;
    const rnd = seeded((context.seed ^ 0x51ed270b) >>> 0);
    const mood = context.mood;
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const designed = PALETTES[a.palette];
    const inks = keyInks(designed, context.palette, a.palette);
    const grey = (c: RGB): RGB => {
      const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      return [l, l, l];
    };
    // Cheer keeps the pigments fresh; a grim print is a little fugitive and dull.
    const ink = (h: string): RGB => mixRGB(grey(hex(h)), hex(h), 0.74 + 0.26 * mood.cheer);
    const paperOf = (c: RGB): RGB => {
      const out: RGB = [...c];
      out[0] = Math.min(255, out[0] + (mood.warmth - 0.5) * 8);
      out[2] = Math.min(255, out[2] - (mood.warmth - 0.5) * 12);
      return out;
    };
    // The paper takes half the ground's tint: washi stays washi.
    const designedPaper = paperOf(hex(PAPERS[a.paper]));
    const paper = context.palette ? paperOf(mixRGB(hex(PAPERS[a.paper]), [...rekey({ paper: hex(PAPERS[a.paper]) }, context.palette, { paper: 'ground' }).paper], 0.5)) : designedPaper;
    const key = ink(inks.key);
    const trOf = (c: RGB): RGB => [Math.min(1, c[0] / paper[0]), Math.min(1, c[1] / paper[1]), Math.min(1, c[2] / paper[2])];

    const margin = Math.round(size * 0.03);
    const lo = margin, hi = size - margin;
    const inside = (x: number, y: number) => x >= lo && x < hi && y >= lo && y < hi;

    // ── 1. Read the capture ────────────────────────────────────────────────────────────────
    const ids = new Uint8Array(N);
    const dep = new Float32Array(N);
    const lit = new Float32Array(N);
    const histogram = new Uint32Array(256);
    let solidCount = 0;
    for (let p = 0; p < N; p++) {
      const id = identity[p * 4];
      ids[p] = id;
      dep[p] = id === 0 ? 1 : (depth[p * 4] + depth[p * 4 + 1] / 256 + depth[p * 4 + 2] / 65536) / 255;
      if (id > 0) {
        histogram[diffuse[p * 4]]++;
        solidCount++;
      }
    }
    let litMax = 255;
    for (let v = 255, seen = 0; v > 0; v--) {
      seen += histogram[v];
      if (seen > solidCount * 0.02) {
        litMax = v;
        break;
      }
    }
    for (let p = 0; p < N; p++) lit[p] = ids[p] === 0 ? 1 : Math.min(1, diffuse[p * 4] / Math.max(24, litMax));

    // ── 2. Flatten the colour inside each surface (a bilateral that never crosses an identity) ──
    let src = new Float32Array(N * 3);
    for (let p = 0; p < N; p++) {
      // Lift cast shadows most of the way out: a block is one flat colour, and the shading
      // comes back later as a wiped gradation rather than as a hard-edged shadow shape.
      const gain = ids[p] === 0 ? 1 : 1 / mix(1, Math.max(lit[p], 0.35), 0.6);
      src[p * 3] = Math.min(255, color[p * 4] * gain);
      src[p * 3 + 1] = Math.min(255, color[p * 4 + 1] * gain);
      src[p * 3 + 2] = Math.min(255, color[p * 4 + 2] * gain);
    }
    let tmp = new Float32Array(N * 3);
    const flatRadius = Math.round(mix(6, 2, a.blocks));
    const flatStride = flatRadius > 3 ? 2 : 1;
    for (let pass = 0; pass < 4; pass++) {
      const step = pass % 2 === 0 ? 1 : size;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const p = y * size + x;
          const id = ids[p];
          const cr = src[p * 3], cg = src[p * 3 + 1], cb = src[p * 3 + 2];
          let sr = 0, sg = 0, sb = 0, n = 0;
          const along = step === 1 ? x : y;
          const from = -Math.min(flatRadius, along - (along % flatStride)), to = Math.min(flatRadius, size - 1 - along);
          for (let k = from; k <= to; k += flatStride) {
            const q = p + k * step;
            if (ids[q] !== id) continue;
            const r = src[q * 3], g = src[q * 3 + 1], b = src[q * 3 + 2];
            if (Math.abs(r - cr) + Math.abs(g - cg) + Math.abs(b - cb) > 72) continue;
            sr += r; sg += g; sb += b; n++;
          }
          tmp[p * 3] = sr / n; tmp[p * 3 + 1] = sg / n; tmp[p * 3 + 2] = sb / n;
        }
      }
      [src, tmp] = [tmp, src];
      if (pass % 2 === 1) await pause();
    }

    // ── 3. Find the open sky: backdrop pixels close to the backdrop's own colour ──────────────
    const bins = new Map<number, number>();
    const tally = (rowTo: number) => {
      for (let y = lo; y < rowTo; y += 2)
        for (let x = lo; x < hi; x += 2) {
          const p = y * size + x;
          if (ids[p] !== 0) continue;
          const bin = ((color[p * 4] >> 3) << 10) | ((color[p * 4 + 1] >> 3) << 5) | (color[p * 4 + 2] >> 3);
          bins.set(bin, (bins.get(bin) ?? 0) + 1);
        }
    };
    tally(Math.round(size * 0.18));
    if (bins.size === 0) tally(hi);
    let skyBin = -1, skyVotes = 0;
    for (const [bin, votes] of bins) if (votes > skyVotes) [skyBin, skyVotes] = [bin, votes];
    const skyRGB: RGB = skyBin < 0 ? [255, 255, 255] : [((skyBin >> 10) & 31) * 8 + 4, ((skyBin >> 5) & 31) * 8 + 4, (skyBin & 31) * 8 + 4];
    const darkSky = skyBin >= 0 && oklab(...skyRGB)[0] < 0.5;

    // ── 4. Cut the colour blocks: match every pixel to a pigment at one of a few strengths ────
    const SKY = 0, PAPER = 1;
    // Printed in the keyed pigments, matched by the designed ones, so each block keeps its place.
    const targetRGB: RGB[] = [paper, paper];
    const matchRGB: RGB[] = [designedPaper, designedPaper];
    const targetFamily: number[] = [0, 0];
    const push = (c: RGB, d: RGB, family: number) => {
      targetRGB.push(c);
      matchRGB.push(d);
      targetFamily.push(family);
    };
    const greyInk = ink(inks.grey);
    push(mixRGB(paper, greyInk, 0.4), mixRGB(designedPaper, greyInk, 0.4), 1);
    push(mixRGB(paper, greyInk, 0.85), mixRGB(designedPaper, greyInk, 0.85), 1);
    push(mixRGB(greyInk, key, 0.82), mixRGB(greyInk, key, 0.82), 1);
    const fine = a.blocks > 0.55;
    inks.pigments.forEach((h, at) => {
      const base = ink(h), was = ink(designed.pigments[at]);
      push(mixRGB(paper, base, 0.42), mixRGB(designedPaper, was, 0.42), 2 + at);
      if (fine) push(mixRGB(paper, base, 0.72), mixRGB(designedPaper, was, 0.72), 2 + at);
      push(base, was, 2 + at);
      push(mixRGB(base, key, fine ? 0.34 : 0.4), mixRGB(was, key, fine ? 0.34 : 0.4), 2 + at);
      if (fine) push(mixRGB(base, key, 0.62), mixRGB(was, key, 0.62), 2 + at);
    });
    const families = 2 + inks.pigments.length;
    const targetLab = matchRGB.map((c) => oklab(c[0], c[1], c[2]));
    const paperL = targetLab[PAPER][0];

    // Stretch the scene's own tonal range onto what paper and ink can give.
    const lights = new Uint32Array(101);
    let sampled = 0;
    for (let p = 0; p < N; p += 7) {
      lights[Math.round(oklab(src[p * 3], src[p * 3 + 1], src[p * 3 + 2])[0] * 100)]++;
      sampled++;
    }
    let lowL = 0, highL = 1;
    for (let v = 0, seen = 0; v <= 100; v++) {
      seen += lights[v];
      if (seen > sampled * 0.03) { lowL = v / 100; break; }
    }
    for (let v = 100, seen = 0; v >= 0; v--) {
      seen += lights[v];
      if (seen > sampled * 0.03) { highL = v / 100; break; }
    }
    const span = Math.max(0.5, highL - lowL);
    const mono = a.palette === 'aizuri';
    const lut = new Int16Array(32768).fill(-1);
    const matchBin = (bin: number) => {
      const [L0, A, B] = oklab(((bin >> 10) & 31) * 8 + 4, ((bin >> 5) & 31) * 8 + 4, (bin & 31) * 8 + 4);
      // Anchored at the light end: what was brightest stays paper, and the rest falls away from it.
      const L = mix(L0, paperL - ((highL - L0) / span) * (paperL - 0.2), 0.65);
      const boost = mono ? 0.3 : 2;
      let best = PAPER, bestDistance = Infinity;
      for (let t = PAPER; t < targetLab.length; t++) {
        const lab = targetLab[t];
        const dL = L - lab[0], dA = A * boost - lab[1], dB = B * boost - lab[2];
        const distance = dL * dL * (mono ? 3 : 0.9) + (dA * dA + dB * dB) * 2.1 + (t === PAPER ? 0.0006 : targetFamily[t] === 1 ? 0.0022 : 0);
        if (distance < bestDistance) {
          best = t;
          bestDistance = distance;
        }
      }
      return best;
    };
    let idx = new Uint8Array(N);
    const base = capture.baseColors;
    for (let p = 0; p < N; p++) {
      let r = src[p * 3], g = src[p * 3 + 1], b = src[p * 3 + 2];
      const id = ids[p];
      if (id === 0 && skyBin >= 0 && Math.abs(r - skyRGB[0]) + Math.abs(g - skyRGB[1]) + Math.abs(b - skyRGB[2]) < 40) {
        idx[p] = SKY;
        continue;
      }
      const mean = id >= 3 ? base[id] : null;
      if (mean) {
        // Pull each thing a little toward its own mean colour so it reads as one printed shape.
        r = mix(r, mean[0], 0.14); g = mix(g, mean[1], 0.14); b = mix(b, mean[2], 0.14);
      }
      const bin = ((Math.min(255, r) >> 3) << 10) | ((Math.min(255, g) >> 3) << 5) | (Math.min(255, b) >> 3);
      let t = lut[bin];
      if (t < 0) t = lut[bin] = matchBin(bin);
      idx[p] = t;
    }
    await pause();

    // A majority vote inside each surface removes specks no cutter would bother to carve.
    const voteStride = a.blocks < 0.5 ? 2 : 1;
    const voteRadius = voteStride === 2 ? 4 : Math.round(mix(3, 1, a.blocks));
    const votes = new Uint16Array(targetRGB.length);
    for (let pass = 0; pass < 1; pass++) {
      const next = new Uint8Array(N);
      for (let y = 0; y < size; y++) {
        const y0 = y - Math.min(voteRadius, y - (y % voteStride)), y1 = Math.min(size - 1, y + voteRadius);
        for (let x = 0; x < size; x++) {
          const p = y * size + x, id = ids[p];
          const x0 = x - Math.min(voteRadius, x - (x % voteStride)), x1 = Math.min(size - 1, x + voteRadius);
          votes.fill(0);
          let best = idx[p], bestVotes = 0;
          for (let yy = y0; yy <= y1; yy += voteStride)
            for (let q = yy * size + x0, end = yy * size + x1; q <= end; q += voteStride) {
              if (ids[q] !== id) continue;
              const v = ++votes[idx[q]];
              if (v > bestVotes) {
                best = idx[q];
                bestVotes = v;
              }
            }
          next[p] = best;
        }
      }
      idx = next;
      await pause();
    }

    // With no open backdrop in the frame, bare pale ground is the picture's open air.
    let openSky = 0;
    for (let p = 0; p < N; p++) if (idx[p] === SKY) openSky++;
    if (openSky < N * 0.04) for (let p = 0; p < N; p++) if (ids[p] === 1 && idx[p] === PAPER) idx[p] = SKY;

    // ── 5. Print the colour blocks as transparent inks, each with its own grain and registration ──
    const tr = new Float32Array(N * 3).fill(1);
    const grainAmount = 0.12 + a.grain * 0.88;
    const slip = 0.25 + mood.wear * 2.3;
    const offset: number[] = [0, 0];
    for (let f = 2; f <= families; f++) {
      const angle = rnd() * Math.PI * 2, reach = rnd() * slip;
      offset.push(Math.round(Math.cos(angle) * reach) + Math.round(Math.sin(angle) * reach) * size);
    }
    // One plank's worth of grain and baren mottle; every block reads it from a different place.
    const plankField = new Float32Array(N);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const plank = y * 0.8 + 26 * vnoise(x * 0.005, y * 0.018, seed + 1);
        const ring = 0.5 + 0.5 * Math.sin(plank * 0.5 + 3.2 * vnoise(x * 0.012, y * 0.16, seed + 7));
        plankField[y * size + x] = 0.2 * ring * ring + 0.12 * vnoise(x / 15, y / 15, seed + 13);
      }
    const speckle = 0.035 + mood.wear * 0.05;
    const coverage = (x: number, y: number, family: number) => {
      const speck = hash(x, y, seed + family * 131) < speckle ? 0.42 : 0;
      return 1 - grainAmount * (plankField[(y * size + x + family * 190537) % N] + speck);
    };
    const targetTr = targetRGB.map(trOf);
    for (let y = lo; y < hi; y++)
      for (let x = lo; x < hi; x++) {
        const p = y * size + x, t = idx[p];
        if (t <= PAPER) continue;
        const family = targetFamily[t];
        const q = p + offset[family];
        const cover = coverage(x, y, family);
        const ink3 = targetTr[t];
        tr[q * 3] *= 1 - (1 - ink3[0]) * cover;
        tr[q * 3 + 1] *= 1 - (1 - ink3[1]) * cover;
        tr[q * 3 + 2] *= 1 - (1 - ink3[2]) * cover;
      }
    await pause();

    // ── 6. Bokashi: the sky ──────────────────────────────────────────────────────────────────
    const skyRows = new Uint32Array(size);
    let skyTotal = 0;
    for (let y = lo; y < hi; y++)
      for (let x = lo; x < hi; x++)
        if (idx[y * size + x] === SKY) {
          skyRows[y]++;
          skyTotal++;
        }
    let horizonRow = hi;
    for (let y = hi - 1, seen = 0; y >= lo; y--) {
      seen += skyRows[y];
      if (seen > skyTotal * 0.04) {
        horizonRow = y;
        break;
      }
    }
    const heightPx = hi - lo;
    const horizonV = Math.max(0.35, (horizonRow - lo) / heightPx);
    const skyMode = darkSky ? 'deep' : a.sky;
    const deepTr = trOf(ink(inks.deep));
    const darkTr = trOf(mixRGB(ink(inks.deep), key, a.palette === 'autumn' ? 0.15 : 0.5));
    const horizonTr = trOf(mixRGB(ink(inks.horizon), [255, 150, 90], Math.max(0, mood.warmth - 0.5) * 0.4));
    const glowAmount = 0.45 + 0.55 * Math.abs(mood.daylight - 0.5) * 2;
    const snowing = a.weather === 'snow', raining = a.weather === 'rain';
    const overcast = trOf(mixRGB(mixRGB(greyInk, ink(inks.shade), 0.4), key, 0.25));
    const moon = { x: mix(lo, hi, rnd() < 0.5 ? 0.22 + rnd() * 0.1 : 0.68 + rnd() * 0.1), y: mix(lo, hi, 0.13 + rnd() * 0.1), r: size * (0.04 + rnd() * 0.022) };
    let cr = 1, cg = 1, cb = 1, cover = 1;
    const wipe = (ink3: RGB, amount: number) => {
      const k = clamp01(amount) * cover;
      cr *= 1 - (1 - ink3[0]) * k; cg *= 1 - (1 - ink3[1]) * k; cb *= 1 - (1 - ink3[2]) * k;
    };
    if (skyTotal > 0)
      for (let y = lo; y < hi; y++) {
        const v = (y - lo) / heightPx;
        for (let x = lo; x < hi; x++) {
          const p = y * size + x;
          if (idx[p] !== SKY) continue;
          // The wiped edge of a gradation is never ruler-straight.
          const wobble = (vnoise(x / 90, y / 40, seed + 77) - 0.5) * 0.05;
          const band = Math.pow(smooth(0.3, 0.0, v + wobble), 1.4);
          const rise = smooth(horizonV - 0.36, horizonV, v + wobble);
          cr = 1; cg = 1; cb = 1;
          cover = coverage(x, y, 0);
          if (skyMode === 'band') wipe(deepTr, band);
          else if (skyMode === 'glow') {
            wipe(deepTr, band);
            wipe(horizonTr, rise * glowAmount);
          } else if (skyMode === 'wash') {
            wipe(deepTr, 0.3 + 0.7 * Math.pow(smooth(0.55, 0, v + wobble), 1.2));
          } else if (skyMode === 'deep') {
            const halo = Math.hypot(x - moon.x, y - moon.y) / moon.r;
            if (halo > 1) {
              wipe(deepTr, (1 - 0.62 * rise) * smooth(1, 1.9, halo + 0.55));
              wipe(darkTr, Math.pow(smooth(0.5, 0, v + wobble), 1.2) * 0.9);
            }
          } else wipe(horizonTr, rise * 0.3);
          if (snowing || raining) wipe(overcast, (snowing ? 0.8 : 0.62) * (0.4 + 0.6 * smooth(0.8, 0, v + wobble)));
          tr[p * 3] = cr; tr[p * 3 + 1] = cg; tr[p * 3 + 2] = cb;
        }
      }
    await pause();

    // ── 7. Snow caps, then bokashi on the ground and on the shaded side of things ────────────
    let groundNear = 1, groundFar = 0, thingNear = 1, thingFar = 0;
    for (let p = 0; p < N; p++) {
      if (ids[p] === 1) {
        if (dep[p] < groundNear) groundNear = dep[p];
        if (dep[p] > groundFar) groundFar = dep[p];
      } else if (ids[p] >= 3) {
        if (dep[p] < thingNear) thingNear = dep[p];
        if (dep[p] > thingFar) thingFar = dep[p];
      }
    }
    if (snowing)
      for (let p = 0; p < N; p++) {
        if (ids[p] === 0 || idx[p] === SKY) continue;
        const up = normal[p * 4 + 1] / 127.5 - 1;
        const cap = smooth(ids[p] === 1 ? 0.2 : 0.5, ids[p] === 1 ? 0.4 : 0.66, up) * 0.94;
        for (let c = 0; c < 3; c++) tr[p * 3 + c] = mix(tr[p * 3 + c], 1, cap);
      }

    // Plain lighting, blurred wide inside each surface, becomes a hand-wiped gradation.
    let shadeA = new Float32Array(lit), shadeB = new Float32Array(N);
    const wipeRadius = Math.round(size / 60);
    for (let pass = 0; pass < 4; pass++) {
      const step = pass % 2 === 0 ? 1 : size;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const p = y * size + x, id = ids[p];
          const along = step === 1 ? x : y;
          const from = -Math.min(wipeRadius, along - (along % 3)), to = Math.min(wipeRadius, size - 1 - along);
          let sum = 0, n = 0;
          for (let k = from; k <= to; k += 3) {
            const q = p + k * step;
            if (ids[q] !== id) continue;
            sum += shadeA[q];
            n++;
          }
          shadeB[p] = n ? sum / n : shadeA[p];
        }
      [shadeA, shadeB] = [shadeB, shadeA];
      if (pass % 2 === 1) await pause();
    }
    const shadeTr = trOf(ink(inks.shade));
    const groundSpan = Math.max(1e-6, groundFar - groundNear);
    for (let y = lo; y < hi; y++)
      for (let x = lo; x < hi; x++) {
        const p = y * size + x, id = ids[p];
        if (id === 0) continue;
        let amount = smooth(0.78, 0.18, shadeA[p]) * (id === 1 ? 0.4 : 0.6);
        if (id === 1 && idx[p] !== SKY) {
          const far = (dep[p] - groundNear) / groundSpan;
          // The ground pales toward the distance and takes a deeper wipe along the near edge.
          const pale = smooth(0.45, 1, far) * 0.55;
          for (let c = 0; c < 3; c++) tr[p * 3 + c] = mix(tr[p * 3 + c], 1, pale);
          amount += smooth(0.3, 0, far) * 0.3;
        }
        amount *= 0.75 + 0.25 * coverage(x, y, 1);
        for (let c = 0; c < 3; c++) tr[p * 3 + c] *= 1 - (1 - shadeTr[c]) * amount;
      }

    // Soften the cut edges by half a pixel so the blocks do not look stepped.
    const soft = new Float32Array(N * 3);
    for (let y = 1; y < size - 1; y++)
      for (let x = 1; x < size - 1; x++) {
        const p = (y * size + x) * 3;
        for (let c = 0; c < 3; c++)
          soft[p + c] = tr[p + c] * 0.4 + (tr[p + c - 3] + tr[p + c + 3] + tr[p + c - size * 3] + tr[p + c + size * 3]) * 0.15;
      }
    await pause();

    // ── 8. Paper ─────────────────────────────────────────────────────────────────────────────
    const sheet = new Float32Array(N);
    const crepe = a.paper === 'crepe';
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let tone = 1 + 0.045 * (vnoise(x / 2.2, y / 2.2, seed + 3) - 0.5) + 0.05 * (vnoise(x / 46, y / 46, seed + 5) - 0.5) + 0.03 * (hash(x, y, seed + 9) - 0.5);
        if (crepe) tone *= 1 + 0.075 * Math.sin(y * 1.75 + 7 * vnoise(x / 22, y / 7, seed + 11)) + 0.03 * (vnoise(x / 3, y, seed + 12) - 0.5);
        sheet[y * size + x] = tone;
      }
    // Long kozo fibres lying in the sheet.
    for (let f = 0; f < 420; f++) {
      let x = rnd() * size, y = rnd() * size, angle = rnd() * Math.PI * 2;
      const tone = rnd() < 0.6 ? 0.035 : -0.045, length = 10 + rnd() * 34;
      for (let s = 0; s < length; s++) {
        const xi = x | 0, yi = y | 0;
        if (xi >= 0 && xi < size && yi >= 0 && yi < size) sheet[yi * size + xi] += tone;
        angle += (rnd() - 0.5) * 0.35;
        x += Math.cos(angle);
        y += Math.sin(angle);
      }
    }

    const out = new Float32Array(N * 3);
    const fade = mood.wear * 0.22;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const p = y * size + x, on = inside(x, y);
        for (let c = 0; c < 3; c++) out[p * 3 + c] = paper[c] * sheet[p] * (on ? mix(soft[p * 3 + c], 1, fade) : 1);
      }
    await pause();

    // ── 9. The key block ─────────────────────────────────────────────────────────────────────
    const weight = mix(0.35, 2.5, a.keyline);
    const reach = new Float32Array(N).fill(1e4);
    const pws = capture.pixelWorldSize / Math.max(1e-6, capture.far - capture.near);
    const light = capture.light;
    const lightLength = Math.hypot(light[0], light[1]) || 1;
    for (let y = lo; y < hi - 1; y++)
      for (let x = lo; x < hi - 1; x++) {
        const p = y * size + x;
        let strength = 0;
        for (let side = 0; side < 2; side++) {
          const step = side === 0 ? 1 : size;
          const q = p + step;
          const ia = ids[p], ib = ids[q];
          if (ia !== ib) {
            strength = Math.max(strength, ia < 2 && ib < 2 ? 0.7 : 1);
            continue;
          }
          const fa = idx[p] === SKY ? -1 : targetFamily[idx[p]], fb = idx[q] === SKY ? -1 : targetFamily[idx[q]];
          if (fa !== fb && idx[p] !== idx[q]) {
            const jump = Math.abs(src[p * 3] - src[q * 3]) + Math.abs(src[p * 3 + 1] - src[q * 3 + 1]) + Math.abs(src[p * 3 + 2] - src[q * 3 + 2]);
            if (ia === 1 ? jump > 70 : jump > 34 || fa === -1 || fb === -1) strength = Math.max(strength, ia === 0 ? 0.72 : ia === 1 ? 0.35 : 0.5);
          }
          if (ia === 0) continue;
          const bend = Math.abs(dep[p - step] - 2 * dep[p] + dep[q]);
          if (bend > pws * 2.5) strength = Math.max(strength, 0.85);
          const dot =
            ((normal[p * 4] - 127.5) * (normal[q * 4] - 127.5) +
              (normal[p * 4 + 1] - 127.5) * (normal[q * 4 + 1] - 127.5) +
              (normal[p * 4 + 2] - 127.5) * (normal[q * 4 + 2] - 127.5)) / 16256;
          if (dot < 0.78) strength = Math.max(strength, ia === 1 ? 0.4 : 0.62);
        }
        if (strength === 0) continue;
        let w = weight * strength;
        if (a.hand !== 'even' && ids[p] >= 1) {
          const nx = normal[p * 4] / 127.5 - 1, ny = -(normal[p * 4 + 1] / 127.5 - 1);
          const flat = Math.hypot(nx, ny);
          if (a.hand === 'swelling') {
            const away = flat > 0.05 ? -(nx * light[0] + ny * light[1]) / (flat * lightLength) : 0;
            w *= 0.5 + 0.95 * clamp01(0.5 + 0.5 * away) + 0.3 * (vnoise(x / 26, y / 26, seed + 41) - 0.5);
          } else {
            const across = flat > 0.05 ? Math.abs(nx * 0.7071 + ny * 0.7071) / flat : 0.5;
            w *= 0.4 + 1.15 * across;
          }
        } else if (a.hand !== 'even') w *= 0.75 + 0.6 * (vnoise(x / 22, y / 22, seed + 43) - 0.5);
        // A worn block loses chips out of its finest ridges.
        w *= 1 - 0.7 * smooth(mood.wear * 0.27, mood.wear * 0.27 - 0.08, vnoise(x / 7, y / 7, seed + 47));
        reach[p] = Math.min(reach[p], -w);
      }
    // A two-pass chamfer turns per-point line weights into a smooth stroke of varying width.
    const D1 = 1, D2 = Math.SQRT2;
    for (let y = 1; y < size - 1; y++)
      for (let x = 1; x < size - 1; x++) {
        const p = y * size + x;
        reach[p] = Math.min(reach[p], reach[p - 1] + D1, reach[p - size] + D1, reach[p - size - 1] + D2, reach[p - size + 1] + D2);
      }
    for (let y = size - 2; y > 0; y--)
      for (let x = size - 2; x > 0; x--) {
        const p = y * size + x;
        reach[p] = Math.min(reach[p], reach[p + 1] + D1, reach[p + size] + D1, reach[p + size + 1] + D2, reach[p + size - 1] + D2);
      }
    await pause();

    // ── 10. Mist lies under nothing: it hides colour and line alike, behind the nearest things ──
    const veil = new Float32Array(N);
    if (a.weather === 'mist') {
      const front = mix(thingNear, thingFar, 0.42);
      const bands = 3 + Math.floor(rnd() * 3);
      for (let b = 0; b < bands; b++) {
        const yc = mix(lo, hi, 0.2 + ((b + rnd() * 0.8) / bands) * 0.62);
        const h = size * (0.012 + rnd() * 0.016);
        const lobes = 2 + Math.floor(rnd() * 2);
        let x0 = rnd() < 0.5 ? lo - 60 : mix(lo, hi, rnd() * 0.5);
        let x1 = x0 < lo ? mix(lo, hi, 0.35 + rnd() * 0.5) : rnd() < 0.5 ? hi + 60 : Math.min(hi + 60, x0 + size * (0.3 + rnd() * 0.4));
        for (let l = 0; l < lobes; l++) {
          const cy = yc + l * h * 1.7;
          for (let y = Math.max(lo, Math.floor(cy - h - 1)); y <= Math.min(hi - 1, Math.ceil(cy + h + 1)); y++)
            for (let x = Math.max(lo, Math.floor(x0 - h)); x <= Math.min(hi - 1, Math.ceil(x1 + h)); x++) {
              const p = y * size + x;
              if (ids[p] >= 3 && dep[p] < front) continue;
              const dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0;
              const cover = clamp01(h - Math.hypot(dx, y - cy) + 0.5);
              if (cover > veil[p]) veil[p] = cover;
            }
          const shift = size * (0.05 + rnd() * 0.14) * (rnd() < 0.5 ? -1 : 1);
          x0 += shift;
          x1 += shift * (0.4 + rnd());
        }
      }
    }
    const mistTint = trOf(mixRGB(paper, ink(inks.horizon), 0.16));
    const lineStrength = 0.94 - mood.wear * 0.12;
    for (let y = lo; y < hi; y++)
      for (let x = lo; x < hi; x++) {
        const p = y * size + x;
        const line = clamp01(0.5 - reach[p]) * lineStrength * (0.9 + 0.1 * coverage(x, y, 1));
        const mist = veil[p];
        for (let c = 0; c < 3; c++) {
          let v = mix(out[p * 3 + c], key[c] * sheet[p], line);
          if (mist > 0) v = mix(v, paper[c] * sheet[p] * mistTint[c], mist);
          out[p * 3 + c] = v;
        }
      }
    await pause();

    // ── 11. Drawing tools for weather, lettering and seals ───────────────────────────────────
    const dab = (p: number, c: RGB, alpha: number) => {
      out[p * 3] = mix(out[p * 3], c[0] * sheet[p], alpha);
      out[p * 3 + 1] = mix(out[p * 3 + 1], c[1] * sheet[p], alpha);
      out[p * 3 + 2] = mix(out[p * 3 + 2], c[2] * sheet[p], alpha);
    };
    const stroke = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, c: RGB, alpha = 1, clip = true) => {
      const pad = Math.max(w0, w1) + 1;
      const ax = Math.max(clip ? lo : 0, Math.floor(Math.min(x0, x1) - pad)), bx = Math.min((clip ? hi : size) - 1, Math.ceil(Math.max(x0, x1) + pad));
      const ay = Math.max(clip ? lo : 0, Math.floor(Math.min(y0, y1) - pad)), by = Math.min((clip ? hi : size) - 1, Math.ceil(Math.max(y0, y1) + pad));
      const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
      for (let y = ay; y <= by; y++)
        for (let x = ax; x <= bx; x++) {
          const t = clamp01(((x - x0) * dx + (y - y0) * dy) / len2);
          const cover = clamp01(mix(w0, w1, t) - Math.hypot(x - x0 - dx * t, y - y0 - dy * t) + 0.5);
          if (cover > 0) dab(y * size + x, c, cover * alpha);
        }
    };
    const fillRect = (x0: number, y0: number, w: number, h: number, c: RGB, alpha: number, family: number) => {
      for (let y = Math.max(0, Math.round(y0)); y < Math.min(size, Math.round(y0 + h)); y++)
        for (let x = Math.max(0, Math.round(x0)); x < Math.min(size, Math.round(x0 + w)); x++) dab(y * size + x, c, alpha * coverage(x, y, family));
    };
    const frame = (x0: number, y0: number, w: number, h: number, weightPx: number, c: RGB) => {
      stroke(x0, y0, x0 + w, y0, weightPx, weightPx, c, 0.95, false);
      stroke(x0, y0 + h, x0 + w, y0 + h, weightPx, weightPx, c, 0.95, false);
      stroke(x0, y0, x0, y0 + h, weightPx, weightPx, c, 0.95, false);
      stroke(x0 + w, y0, x0 + w, y0 + h, weightPx, weightPx, c, 0.95, false);
    };
    /** Not writing, but brushwork with the structure of it: bars, posts, sweeps and dots in a square. */
    const glyph = (cx: number, cy: number, s: number, w: number, c: RGB) => {
      const h = s / 2;
      const bars = 1 + Math.floor(rnd() * 3), posts = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < bars; i++) {
        const y = cy - h * 0.85 + ((i + 0.5 + (rnd() - 0.5) * 0.4) / bars) * s * 0.8;
        const half = h * (0.45 + 0.5 * rnd()), shift = (rnd() - 0.5) * h * 0.3, tilt = h * 0.08;
        stroke(cx + shift - half, y + tilt, cx + shift + half, y - tilt, w * 0.75, w * 1.1, c);
      }
      for (let i = 0; i < posts; i++) {
        const x = cx + (rnd() - 0.5) * s * 0.6;
        stroke(x, cy - h * (0.5 + 0.5 * rnd()), x + (rnd() - 0.5) * 2, cy + h * (0.4 + 0.6 * rnd()), w * 1.15, w * 0.6, c);
      }
      if (rnd() < 0.6) stroke(cx - h * 0.1, cy - h * 0.1, cx - h * 0.9, cy + h * 0.9, w * 1.1, w * 0.3, c);
      if (rnd() < 0.55) stroke(cx + h * 0.1, cy, cx + h * 0.9, cy + h * 0.9, w * 0.45, w * 1.3, c);
      if (rnd() < 0.45) {
        const x = cx + (rnd() - 0.5) * s * 0.7, y = cy - h * 0.7 + rnd() * h * 0.5;
        stroke(x, y, x + w * 1.2, y + w * 1.6, w * 0.6, w * 1.2, c);
      }
    };
    const column = (x: number, y: number, count: number, s: number, c: RGB) => {
      for (let i = 0; i < count; i++) glyph(x, y + s * 0.5 + i * s * 1.12, s * (0.86 + rnd() * 0.2), Math.max(0.7, s * 0.062), c);
      return y + count * s * 1.12;
    };
    const sealRed = ink(inks.seal);
    const secondCartouche = ink(context.palette ? hexOf(rekey({ c: hex('#e0b74a') }, context.palette, { c: 'second' }).c) : '#e0b74a');
    const squareSeal = (x0: number, y0: number, s: number) => {
      for (let y = Math.round(y0); y < Math.round(y0 + s); y++)
        for (let x = Math.round(x0); x < Math.round(x0 + s); x++) {
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const corner = Math.hypot(Math.max(0, Math.abs(x - x0 - s / 2) - s / 2 + 2.5), Math.max(0, Math.abs(y - y0 - s / 2) - s / 2 + 2.5));
          if (corner > 2.5) continue;
          dab(y * size + x, sealRed, 0.93 * (hash(x, y, seed + 61) < 0.07 ? 0.45 : 1) * (0.8 + 0.2 * vnoise(x / 3, y / 3, seed + 63)));
        }
      // Seal script: a small maze of carved channels showing the paper.
      const cut = Math.max(0.7, s * 0.045), cell = (s - 6) / 2;
      for (let gy = 0; gy < 2; gy++)
        for (let gx = 0; gx < 2; gx++) {
          const cx = x0 + 3 + gx * cell, cy = y0 + 3 + gy * cell;
          const rows = 2 + Math.floor(rnd() * 2), upright = rnd() < 0.5;
          for (let i = 0; i < rows; i++) {
            const at = ((i + 0.6) / (rows + 0.2)) * cell, a0 = cell * (0.12 + rnd() * 0.2), a1 = cell * (0.7 + rnd() * 0.2);
            if (upright) stroke(cx + at, cy + a0, cx + at, cy + a1, cut, cut, paper, 0.92, false);
            else stroke(cx + a0, cy + at, cx + a1, cy + at, cut, cut, paper, 0.92, false);
          }
          const tie = cell * (0.2 + rnd() * 0.6);
          if (upright) stroke(cx + cell * 0.2, cy + tie, cx + cell * 0.85, cy + tie, cut, cut, paper, 0.92, false);
          else stroke(cx + tie, cy + cell * 0.2, cx + tie, cy + cell * 0.85, cut, cut, paper, 0.92, false);
        }
    };
    const disc = (cx: number, cy: number, r: number, c: RGB, alpha: number, ring = 0) => {
      for (let y = Math.max(0, Math.floor(cy - r - 1)); y <= Math.min(size - 1, Math.ceil(cy + r + 1)); y++)
        for (let x = Math.max(0, Math.floor(cx - r - 1)); x <= Math.min(size - 1, Math.ceil(cx + r + 1)); x++) {
          const d = Math.hypot(x - cx, y - cy);
          const cover = ring > 0 ? clamp01(ring - Math.abs(d - r) + 0.5) : clamp01(r - d + 0.5);
          if (cover > 0) dab(y * size + x, c, cover * alpha * (ring > 0 ? 1 : 0.8 + 0.2 * vnoise(x / 3, y / 3, seed + 67)));
        }
    };

    // ── 12. Weather printed over the picture ─────────────────────────────────────────────────
    if (raining) {
      const lean = mix(0.16, 0.5, mood.energy);
      const count = Math.round(170 + mood.energy * 200);
      for (let i = 0; i < count; i++) {
        const tilt = lean + (i % 2 ? 0.07 : -0.03), length = size * (0.25 + rnd() * 0.6);
        const x = lo - size * 0.3 + rnd() * size * 1.3, y = lo - 40 + rnd() * size;
        const dx = -Math.sin(tilt), dy = Math.cos(tilt);
        for (let s = 0; s < length; s++) {
          const px = x + dx * s, py = y + dy * s;
          const xi = Math.floor(px), yi = Math.round(py);
          if (xi < lo || xi >= hi - 1 || yi < lo || yi >= hi) continue;
          const part = px - xi;
          dab(yi * size + xi, key, 0.6 * (1 - part));
          dab(yi * size + xi + 1, key, 0.6 * part);
        }
      }
    } else if (snowing) {
      const count = Math.round(380 + mood.density * 520);
      for (let i = 0; i < count; i++) {
        const x = mix(lo, hi, rnd()), y = mix(lo, hi, rnd());
        const r = rnd() < 0.12 ? 2 + rnd() * 1.4 : 0.6 + rnd() * 1.2;
        if (inside(x, y)) disc(x, y, r, paper, 0.96);
      }
    } else if (a.weather === 'blossom') {
      const petal = mixRGB(paper, ink('#d9788a'), 0.62);
      const count = Math.round(90 + mood.density * 200);
      for (let i = 0; i < count; i++) {
        const x = mix(lo + 4, hi - 4, rnd()), y = mix(lo + 4, hi - 4, rnd());
        const angle = rnd() * Math.PI, r = 1.8 + rnd() * 2.6;
        stroke(x - Math.cos(angle) * r, y - Math.sin(angle) * r, x + Math.cos(angle) * r, y + Math.sin(angle) * r, r * 0.3, r * 0.75, rnd() < 0.7 ? petal : paper, 0.95);
      }
    }
    await pause();

    // ── 13. Border, cartouche, signature and seals ───────────────────────────────────────────
    frame(lo, lo, hi - lo, hi - lo, 0.9, key);
    const notes: string[] = [];
    if (a.signature !== 'unsigned') {
      // Sign in whichever lower corner the subject leaves quietest.
      const busy = (x0: number) => {
        let n = 0;
        for (let y = Math.round(size * 0.62); y < hi; y += 3)
          for (let x = x0; x < x0 + size * 0.2; x += 3) if (ids[y * size + Math.round(x)] >= 2) n++;
        return n;
      };
      const leftQuiet = busy(lo) <= busy(hi - size * 0.2);
      const titleLeft = !leftQuiet;
      const unit = size / 720;
      const inset = lo + 12 * unit;
      if (a.signature === 'title' || a.signature === 'twin') {
        const panels = a.signature === 'twin' ? 2 : 1;
        const w = 34 * unit, h = (a.signature === 'twin' ? 132 : 150) * unit;
        for (let i = 0; i < panels; i++) {
          const x = titleLeft ? inset + i * (w + 5 * unit) : hi - 12 * unit - w - i * (w + 5 * unit);
          const fill = i === 0 ? ink(inks.cartouche) : (a.palette === 'tokaido' || a.palette === 'autumn' ? secondCartouche : ink(inks.seal));
          const tall = i === 0 ? h : h * 0.78;
          fillRect(x, inset, w, tall, mixRGB(paper, fill, 0.86), 0.97, 9 + i);
          frame(x, inset, w, tall, 0.75, key);
          column(x + w / 2, inset + 7 * unit, i === 0 ? (a.signature === 'twin' ? 4 : 5) : 3, 23 * unit, key);
        }
      }
      const s = 19 * unit;
      const sx = leftQuiet ? inset + 12 * unit : hi - 24 * unit - s * 0.5;
      const glyphs = a.signature === 'seal' ? 2 : 3;
      const sealSize = (a.signature === 'seal' ? 26 : 21) * unit;
      const top = hi - 16 * unit - sealSize - glyphs * s * 1.12 - (a.signature === 'gourd' ? 12 * unit : 0);
      if (a.signature === 'twin') {
        fillRect(sx - s * 0.75, top - 5 * unit, s * 1.5, glyphs * s * 1.12 + 8 * unit, mixRGB(paper, ink(inks.cartouche), 0.5), 0.95, 12);
        frame(sx - s * 0.75, top - 5 * unit, s * 1.5, glyphs * s * 1.12 + 8 * unit, 0.6, sealRed);
      }
      const end = column(sx, top, glyphs, s, key);
      if (a.signature === 'gourd') {
        disc(sx, end + 9 * unit, 7.5 * unit, sealRed, 0.92);
        disc(sx, end + 23 * unit, 10.5 * unit, sealRed, 0.92);
        glyph(sx, end + 9 * unit, 9 * unit, 0.8, paper);
        glyph(sx, end + 23 * unit, 13 * unit, 0.9, paper);
      } else squareSeal(sx - sealSize / 2, end + 4 * unit, sealSize);
      if (a.signature === 'twin') {
        // The round censor's seal and the publisher's mark sit in the margin of the picture.
        const cx = leftQuiet ? sx + 34 * unit : sx - 34 * unit, cy = hi - 28 * unit;
        disc(cx, cy, 10 * unit, key, 0.9, 0.8);
        glyph(cx, cy, 12 * unit, 0.85, key);
      }
      notes.push({ title: 'titled in a cartouche, signed and sealed', twin: 'twin cartouches, signature panel and censor seal', seal: 'a signature and a square red seal', gourd: 'signed with a gourd seal' }[a.signature]);
    } else notes.push('an unsigned proof');
    await pause();

    // ── 14. Age ──────────────────────────────────────────────────────────────────────────────
    const wear = mood.wear;
    const foxing: [number, number, number][] = [];
    for (let i = 0; i < Math.round(wear * wear * 46); i++) foxing.push([rnd() * size, rnd() * size, 1.5 + rnd() * rnd() * 9]);
    const stain: RGB = [0.8, 0.66, 0.46];
    const pixels = new Uint8ClampedArray(N * 4);
    const foldX = Math.round(size * (0.49 + rnd() * 0.02));
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const edge = Math.min(x, y, size - 1 - x, size - 1 - y) / size;
        let toned = 0;
        if (wear > 0.01) toned = wear * ((edge < 0.14 ? 0.42 * smooth(0.11, 0, edge + 0.03 * vnoise(x / 30, y / 30, seed + 71)) : 0) + 0.1 * plankField[((y >> 2) * size + (x >> 2)) % N] * 3);
        if (wear > 0.55 && Math.abs(x - foldX) < 2) toned += (wear - 0.55) * 0.5 * (0.5 + 0.5 * vnoise(x, y / 9, seed + 79));
        for (let c = 0; c < 3; c++) pixels[p * 4 + c] = out[p * 3 + c] * (1 - toned * (1 - stain[c]));
        pixels[p * 4 + 3] = 255;
      }
    for (const [fx, fy, fr] of foxing)
      for (let y = Math.max(0, Math.floor(fy - fr * 2)); y <= Math.min(size - 1, Math.ceil(fy + fr * 2)); y++)
        for (let x = Math.max(0, Math.floor(fx - fr * 2)); x <= Math.min(size - 1, Math.ceil(fx + fr * 2)); x++) {
          const spot = 0.3 * smooth(fr * 1.6, fr * 0.3, Math.hypot(x - fx, y - fy) + fr * 0.5 * vnoise(x / 2, y / 2, seed + 83));
          if (spot <= 0) continue;
          const p = (y * size + x) * 4;
          for (let c = 0; c < 3; c++) pixels[p + c] *= 1 - spot * (1 - stain[c] * 0.9);
        }

    const skyWords = { band: 'a single wiped band of sky', glow: 'sky wiped from the top and the horizon', wash: 'a washed sky', deep: 'a deep sky with the moon left as paper', bare: 'a bare paper sky' }[skyMode];
    return {
      pixels,
      notes: [
        `${a.palette} pigments, ${inks.pigments.length + 1} colour blocks${fine ? ' with extra tone printings' : ''}`,
        `${skyWords}${a.weather === 'clear' ? '' : `, ${a.weather}`}`,
        `${a.hand} key line on ${a.paper} paper`,
        ...notes,
      ],
    };
  },
});
