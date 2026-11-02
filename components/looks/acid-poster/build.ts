import { type PaletteRole, choice, clamp01, defineLook, fromOklch, mix, oklch, paintIsMetal, rekey, rekeyOne, score, seeded } from '@conjure/kit';

/**
 * A psychedelic poster. The scene is redrawn, not filtered:
 *   1. identity, depth and normals give every form a bold, swelling key line; plain lighting is
 *      cut into a few flat inks per region (or contour stripes, or a split-fountain rainbow),
 *   2. each region takes inks from a small set of equal-value complementary pairs, so edges
 *      shimmer; the sky and walls carry halo bands echoing the hero's silhouette, or rays,
 *   3. ornaments (mushrooms, eyes, rainbows, peace and smiley motifs, paisley, drips, skeletal
 *      formulae) go only into dead space, kept clear of every placed thing,
 *   4. one gentle liquid warp field bends the whole sheet like melting lettering,
 *   5. the substrate finishes it: poster paper, flocked velvet under UV, or a perforated blotter.
 */

type RGB = readonly [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const luma = (c: RGB) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
const saturate = (c: RGB, s: number): RGB => {
  const l = luma(c);
  return [l + (c[0] - l) * s, l + (c[1] - l) * s, l + (c[2] - l) * s].map((v) => Math.max(0, Math.min(255, v))) as [number, number, number];
};
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
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
const hueOf = (c: RGB) => {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 1e-5) return { h: 0, s: 0 };
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  if (h < 0) h += 1;
  return { h, s: d / Math.max(1e-5, max) };
};
const describe = <T extends Record<string, { description: string }>>(table: T) =>
  Object.fromEntries(Object.entries(table).map(([key, entry]) => [key, entry.description])) as Record<keyof T & string, string>;

/** Exact Euclidean distance to the nearest site (Felzenszwalb), with the index of that site. */
function distanceField(site: Uint8Array, w: number, h: number, wantFrom: boolean) {
  const FAR = 1e10;
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1);
  const v = new Int32Array(n), near = new Int32Array(n);
  const col = new Float32Array(w * h);
  const colRow = wantFrom ? new Int32Array(w * h) : null;
  const pass = (len: number) => {
    let k = 0;
    v[0] = 0;
    z[0] = -FAR;
    z[1] = FAR;
    for (let q = 1; q < len; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = FAR;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
      near[q] = v[k];
    }
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = site[y * w + x] ? 0 : FAR;
    pass(h);
    for (let y = 0; y < h; y++) {
      col[y * w + x] = d[y];
      if (colRow) colRow[y * w + x] = near[y];
    }
  }
  const dist = new Float32Array(w * h);
  const from = wantFrom ? new Int32Array(w * h) : null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = col[y * w + x];
    pass(w);
    for (let x = 0; x < w; x++) {
      dist[y * w + x] = Math.sqrt(d[x]);
      if (from && colRow) from[y * w + x] = colRow[y * w + near[x]] * w + near[x];
    }
  }
  return { dist, from };
}

/** Three box passes of a separable blur over a float RGB buffer. */
function blurRGB(src: Float32Array, size: number, radius: number) {
  const r = Math.max(1, Math.round(radius));
  let a: Float32Array = src, b: Float32Array = new Float32Array(src.length);
  for (let it = 0; it < 3; it++) {
    for (let horizontal = 0; horizontal < 2; horizontal++) {
      for (let line = 0; line < size; line++) {
        for (let ch = 0; ch < 3; ch++) {
          let sum = 0;
          const at = (i: number) => {
            const c = Math.max(0, Math.min(size - 1, i));
            return horizontal ? (line * size + c) * 3 + ch : (c * size + line) * 3 + ch;
          };
          for (let i = -r; i <= r; i++) sum += a[at(i)];
          for (let i = 0; i < size; i++) {
            b[at(i)] = sum / (2 * r + 1);
            sum += a[at(i + r + 1)] - a[at(i - r)];
          }
        }
      }
      const t = a;
      a = b;
      b = t === src ? new Float32Array(src.length) : t;
    }
  }
  return a;
}

// ── Signed distances for ornaments, in the ornament's own unit square ─────────────────────────
const sdCircle = (u: number, v: number, cx: number, cy: number, r: number) => Math.hypot(u - cx, v - cy) - r;
const sdSeg = (u: number, v: number, ax: number, ay: number, bx: number, by: number, r: number) => {
  const pax = u - ax, pay = v - ay, bax = bx - ax, bay = by - ay;
  const h = clamp01((pax * bax + pay * bay) / Math.max(1e-9, bax * bax + bay * bay));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};
const sdBox = (u: number, v: number, cx: number, cy: number, hx: number, hy: number, round: number) => {
  const qx = Math.abs(u - cx) - hx + round, qy = Math.abs(v - cy) - hy + round;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - round;
};
const sdEllipse = (u: number, v: number, cx: number, cy: number, rx: number, ry: number) =>
  (Math.hypot((u - cx) / rx, (v - cy) / ry) - 1) * Math.min(rx, ry);
const smin = (a: number, b: number, k: number) => {
  const h = clamp01(0.5 + (0.5 * (b - a)) / k);
  return mix(b, a, h) - k * h * (1 - h);
};

const TRADITIONS = {
  ballroom: {
    name: 'San Francisco ballroom poster',
    line: 1, melt: 1, soft: false, metallic: false, chrome: false, glow: false, key: '#2b1230', paper: '#f2e7cd',
    description: 'A 1966 to 1968 San Francisco ballroom concert poster: everything melts into flowing Art Nouveau whiplash curves, flat inks of equal value in vibrating complementary pairs, edges that shimmer, lettering swollen to fill every gap.',
  },
  london: {
    name: 'London underground poster',
    line: 0.55, melt: 0.6, soft: false, metallic: true, chrome: false, glow: false, key: '#151214', paper: '#efe7d2',
    description: 'A 1967 London underground poster: metallic gold and silver inks over a bright flat ground, fine Beardsley pen lines and solid black masses, paisley and peacock borders, the UFO Club and Oz magazine.',
  },
  airbrush: {
    name: '1970s airbrushed rock poster',
    line: 0.65, melt: 0.45, soft: true, metallic: false, chrome: true, glow: false, key: '#2a1610', paper: '#f2e2c2',
    description: 'A 1970s airbrushed rock poster: soft sprayed gradients, a chrome-reflecting hero with a horizon line in it, rainbow bands, sunset skies and four-pointed starbursts on the highlights, album-cover gloss.',
  },
  blacklight: {
    name: 'blacklight velvet poster',
    line: 0.9, melt: 0.85, soft: false, metallic: false, chrome: false, glow: true, key: '#070608', paper: '#0b0a0d',
    description: 'A blacklight poster: Day-Glo magenta, chartreuse, orange and acid yellow glowing out of a black ground as if under UV, shadows falling away into black, a head shop wall at night.',
  },
} as const;

const PAIRS = {
  'red-green': {
    name: 'red against green', a: '#e2362b', b: '#2f9d4e', c: '#f3cd3a', fa: '#ff2b58', fb: '#7dff2b', fc: '#fff200',
    description: 'Two opposite inks of the same value, with a lighter third: a straight complementary clash whose edges throb.',
  },
  'orange-blue': {
    name: 'orange against blue', a: '#f1791e', b: '#2a6ecf', c: '#f5df6d', fa: '#ff7b00', fb: '#25c6ff', fc: '#f6ff3a',
    description: 'A hot ink against a cool partner, with a pale third: warm and cold at once, glowing like a sunset over water.',
  },
  'magenta-green': {
    name: 'magenta against chartreuse', a: '#d8267f', b: '#7cc63b', c: '#f6d04a', fa: '#ff1fb1', fb: '#b6ff19', fc: '#ffe600',
    description: 'The most saturated ink against an acid partner, with a bright third: the loudest, most electric pairing.',
  },
  'violet-yellow': {
    name: 'violet against yellow', a: '#9a50cf', b: '#e9c31f', c: '#e4553a', fa: '#c24eff', fb: '#f4ff20', fc: '#ff6a2b',
    description: 'A deep dark ink against a light glowing one, with a warm third: rich, mystical, a temple at dusk.',
  },
  rainbow: {
    name: 'a full rainbow', a: '#e3392e', b: '#2b84c7', c: '#f1c51f', fa: '#ff2a5c', fb: '#1ec9ff', fc: '#f6ff00',
    description: 'The whole spectrum turned to start from the main ink, a different ink for every form: rainbow bands, a riot.',
  },
  'gold-silver': {
    name: 'gold and silver', a: '#c69a3d', b: '#a8acb4', c: '#b4244f', fa: '#ffb400', fb: '#e2f2ff', fc: '#ff2a8b',
    description: 'Metallic gold and silver inks with one deep accent ink: precious, occult, a gatefold sleeve.',
  },
} as const;

const SPECTRUM = ['#e2342c', '#f0891c', '#f2cd22', '#3fa548', '#2a78c6', '#8a4fb8'].map(hex);
const SPECTRUM_FLUOR = ['#ff2a5a', '#ff8a00', '#f6ff00', '#6bff2a', '#1ec8ff', '#c44dff'].map(hex);
const GOLD = hex('#c99b3e');
const SILVER = hex('#aeb2ba');

const ORNAMENTS = {
  none: { description: 'No ornament: the scene and its ripples fill the sheet alone.' },
  mushrooms: { description: 'Toadstools and liberty caps sprouting in the margins: red caps with white spots, cream stems.' },
  eyes: { description: 'All-seeing eyes floating in the dead space, almond-shaped with rayed lashes and staring irises.' },
  rainbows: { description: 'Small rainbow arcs on puffy clouds tucked into the corners.' },
  peace: { description: 'Peace signs and smiling suns: flower-power badges scattered in the empty space.' },
  smileys: { description: 'Yellow smiley faces, some melting and dripping off the bottom.' },
  paisley: { description: 'Paisley teardrops with nested bands and dotted rims, curling like Indian textiles.' },
  drips: { description: 'Melting blobs dripping in the empty space, as if the poster itself is running.' },
  molecules: { description: 'Skeletal formulae drawn like chemistry homework: the lysergamide ring system with its 8-alpha or 8-beta bond, a tryptamine, mescaline.' },
} as const;

const MOTIFS = {
  none: { description: 'A flat ground of colour behind the scene.' },
  halo: { description: 'Concentric halo bands rippling out from the hero, echoing its outline, in alternating vibrating inks.' },
  rays: { description: 'Straight rays bursting from behind the hero like a sunburst.' },
  spiral: { description: 'Rays twisted into a hypnotic spiral whirling around the hero.' },
  checker: { description: 'Rings crossed with rays into an op-art polar chequerboard that buzzes in the eye.' },
  whiplash: { description: 'Long flowing Art Nouveau whiplash stripes sweeping across the ground like hair or smoke.' },
} as const;

const GROUNDS = {
  paper: { description: 'Smooth poster paper, screen-printed: crisp flat ink with a faint squeegee streak.' },
  velvet: { description: 'Black flocked velvet: soft nap that swallows the darks and makes the inks glow.' },
  blotter: { description: 'A perforated blotter sheet: soft absorbent paper scored into a grid of tiny square tabs.' },
} as const;

const DISPLAYS = {
  sheet: { description: 'The image runs to the edges of the sheet, nothing else.' },
  bill: { description: 'A concert bill: a narrow border and a band of swollen, melting, barely legible lettering across the top.' },
  wall: { description: 'Tacked up on a wall: masking tape at the corners, fold creases from being mailed, a curling edge.' },
} as const;

export default defineLook({
  questions: {
    tradition: choice('Which psychedelic poster tradition is it printed in?', describe(TRADITIONS)),
    palette: choice('How do the inks vibrate against each other? Their colours come from the picture\u2019s palette.', describe(PAIRS)),
    shading: choice('How are the forms coloured in?', {
      flat: 'Each form one flat ink, held only by its outline: the boldest, most graphic poster.',
      twoTone: 'Two flat inks per form, the shadow cut as a hard shape in the vibrating partner colour.',
      contours: 'Concentric contour stripes following the light across every form, like a topographic map of the body.',
      fountain: 'A split-fountain roll: one ink blended through the rainbow across the whole sheet.',
    }),
    melt: score('How much does the picture melt and flow?', [
      'Barely: a faint wobble',
      'A gentle sway',
      'Flowing',
      'Liquid',
      'Fully melting, as if seen mid-trip',
    ]),
    outline: score('How heavy is the outline around every form?', [
      'Hairline pen, Beardsley-fine',
      'Light',
      'Bold',
      'Heavy',
      'Fat swollen cartoon outlines',
    ]),
    motif: choice('What ripples out from the hero across the empty ground?', describe(MOTIFS)),
    ornament: choice('Which psychedelic ornament fills the dead space, never covering the subject?', describe(ORNAMENTS)),
    ground: choice('What is it printed on?', describe(GROUNDS)),
    display: choice('How is the poster shown?', describe(DISPLAYS)),
  },

  async apply(capture, a, context, signal) {
    const { size, color, identity, normal, depth, diffuse } = capture;
    const S = size;
    const N = S * S;
    const k = S / 720;
    const seed = context.seed | 0;
    const rnd = seeded((context.seed ^ 0x5eed_ac1d) >>> 0);
    const { mood } = context;
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const trad = TRADITIONS[a.tradition];
    const pair = PAIRS[a.palette];
    const blacklight = trad.glow;
    const velvet = a.ground === 'velvet';
    const dark = blacklight || velvet;

    // ── 1. Read the capture ─────────────────────────────────────────────────────────────────
    const ids = new Uint8Array(N);
    const dep = new Float32Array(N);
    const lit = new Float32Array(N);
    const nrm = new Float32Array(N * 3);
    for (let p = 0; p < N; p++) {
      const o = p * 4;
      ids[p] = identity[o];
      dep[p] = identity[o] === 0 ? 1 : (depth[o] + depth[o + 1] / 256 + depth[o + 2] / 65536) / 255;
      lit[p] = (diffuse[o] * 0.3 + diffuse[o + 1] * 0.59 + diffuse[o + 2] * 0.11) / 255;
      nrm[p * 3] = normal[o] / 127.5 - 1;
      nrm[p * 3 + 1] = normal[o + 1] / 127.5 - 1;
      nrm[p * 3 + 2] = normal[o + 2] / 127.5 - 1;
    }

    // Per-region statistics: area, centroid, extent and the spread of its lighting.
    const area = new Float64Array(256), sx = new Float64Array(256), sy = new Float64Array(256);
    const hist = new Uint32Array(256 * 64);
    let groundNear = 1, groundFar = 0;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const p = y * S + x, id = ids[p];
        area[id]++;
        sx[id] += x;
        sy[id] += y;
        hist[id * 64 + Math.min(63, Math.floor(lit[p] * 64))]++;
        if (id === 1) {
          if (dep[p] < groundNear) groundNear = dep[p];
          if (dep[p] > groundFar) groundFar = dep[p];
        }
      }
    const loLit = new Float32Array(256), hiLit = new Float32Array(256);
    for (let id = 0; id < 256; id++) {
      if (!area[id]) continue;
      let seen = 0, lo = -1, hi = 63;
      for (let b = 0; b < 64; b++) {
        seen += hist[id * 64 + b];
        if (lo < 0 && seen >= area[id] * 0.04) lo = b;
        if (seen >= area[id] * 0.96) {
          hi = b;
          break;
        }
      }
      loLit[id] = Math.max(0, lo) / 64;
      hiLit[id] = Math.max(loLit[id] + 0.08, (hi + 1) / 64);
    }
    // Each thing's scale: marks and lines are sized to its extent so small figures do not shatter.
    const extent = new Float32Array(256);
    for (let id = 0; id < 256; id++) extent[id] = Math.sqrt(area[id]);
    const lineScale = (id: number) => (id <= 2 ? 1 : Math.max(0.42, Math.min(1.15, extent[id] / (150 * k))));

    let heroId = area[3] > 0 ? 3 : 0;
    if (!heroId) for (let id = 3; id < 256; id++) if (area[id] > (heroId ? area[heroId] : 0)) heroId = id;
    const hcx = heroId ? sx[heroId] / area[heroId] : S / 2;
    const hcy = heroId ? sy[heroId] / area[heroId] : S * 0.55;
    const heroR = heroId ? Math.sqrt(area[heroId] / Math.PI) : S * 0.12;
    await pause();

    // ── 2. Inks ────────────────────────────────────────────────────────────────────────────
    const sat = mix(0.72, 1.12, mood.cheer);
    const temper = (c: RGB, amt: number): RGB => [
      Math.max(0, Math.min(255, c[0] + (mood.warmth - 0.5) * amt)),
      c[1],
      Math.max(0, Math.min(255, c[2] - (mood.warmth - 0.5) * amt)),
    ];
    const ink = (h: string | RGB) => temper(saturate(typeof h === 'string' ? hex(h) : h, sat), 12);
    const WHITE: RGB = blacklight ? [250, 250, 240] : [252, 248, 236];
    const K = hex(trad.key);
    // The idea's palette re-keys the inks: the vibrating pair turns together onto the ink (so the partner
    // stays its opposite and still throbs), the third (the hero's) takes the second colour, paper and
    // velvet take the ground, and the spectrum turns so it starts on the ink.
    // Gold and silver stay metal unless the palette's ink is a metal itself.
    const { palette } = context;
    const metalInk = !!palette && paintIsMetal(palette.ink);
    const VELVET = rekeyOne(hex('#0c0a0e'), palette, 'ground');
    const paperRGB = temper(blacklight ? VELVET : rekeyOne(hex(trad.paper), palette, 'ground'), 10);
    // The partner turns exactly as the first ink did (rekey would anchor on whichever of the two is more
    // vivid, and the first ink is the one that floods the sheet).
    const turnWith = (c: RGB, from: RGB, to: RGB): RGB => {
      const [l0, c0, h0] = oklch(from), [l1, c1, h1] = oklch(to), [l, ch, h] = oklch(c);
      return fromOklch(Math.min(0.98, Math.max(0.02, l + l1 - l0)), c0 > 0.025 ? Math.min(2.5, c1 / c0) * ch : ch, h + h1 - h0);
    };
    const raw = { a: hex(blacklight ? pair.fa : pair.a), b: hex(blacklight ? pair.fb : pair.b), c: hex(blacklight ? pair.fc : pair.c) };
    const keepMetal = a.palette === 'gold-silver' && !blacklight && !metalInk;
    const P = !palette ? raw : {
      a: keepMetal ? raw.a : rekeyOne(raw.a, palette, 'ink'),
      b: keepMetal ? raw.b : turnWith(raw.b, raw.a, rekeyOne(raw.a, palette, 'ink')),
      c: rekeyOne(raw.c, palette, 'second'),
    };
    const toMetal = (c: RGB) => (metalInk ? rekeyOne(c, palette, 'ink') : c);
    const gold = toMetal(GOLD), silver = toMetal(SILVER);
    let A = ink(P.a), B = ink(P.b), C = ink(P.c);
    if (a.tradition === 'london') {
      // Metallic inks are always in a London print: gold for the hero, silver beside it.
      if (a.palette !== 'gold-silver') C = gold;
    }
    const SPEC = blacklight ? SPECTRUM_FLUOR : SPECTRUM;
    const turned = rekey(Object.fromEntries(SPEC.map((c, i) => [i, c])) as Record<string, RGB>, palette,
      Object.fromEntries(SPEC.map((_, i) => [i, 'ink' as PaletteRole])));
    const spectrum = SPEC.map((_, i) => ink(turned[i]));
    const isMetal = (c: RGB) => c === gold || c === silver || (a.palette === 'gold-silver' && !blacklight && (c === A || c === B));

    // Fills a thing can take; the hero gets the third ink so it stands against the vibrating pair.
    const fills: RGB[] = a.palette === 'rainbow' ? spectrum : [A, B, C];
    const partner = (c: RGB): RGB => {
      if (a.palette === 'rainbow') {
        const i = spectrum.indexOf(c);
        if (i >= 0) return spectrum[(i + 3) % 6];
      }
      if (c === A) return B;
      if (c === B) return A;
      return a.tradition === 'london' ? K : lerp3(A, B, 0.5);
    };
    const fillOf = new Array<RGB>(256);
    const fillHues = fills.map((c) => hueOf(c).h);
    for (let id = 3; id < 256; id++) {
      if (!area[id]) continue;
      if (id === heroId) {
        fillOf[id] = a.palette === 'rainbow' ? spectrum[2] : C;
        continue;
      }
      const base = capture.baseColors[id];
      let pick = Math.floor(hash(id, 7, seed) * fills.length);
      if (base) {
        const { h, s } = hueOf([base[0], base[1], base[2]]);
        if (s > 0.18) {
          let best = 1e9;
          fills.forEach((_, i) => {
            const dh = Math.min(Math.abs(h - fillHues[i]), 1 - Math.abs(h - fillHues[i]));
            if (dh < best) {
              best = dh;
              pick = i;
            }
          });
        }
      }
      // Avoid the hero's ink on supporting things, so the hero stays the one glowing form.
      if (fills[pick] === fillOf[heroId] && fills.length > 1) pick = (pick + 1 + (id % (fills.length - 1))) % fills.length;
      if (fills[pick] === fillOf[heroId]) pick = (pick + 1) % fills.length;
      fillOf[id] = fills[pick];
    }

    // Region colours for the backdrop, the ground and the set.
    const back = a.tradition === 'london' ? (a.palette === 'gold-silver' ? ink(P.c) : A) : blacklight ? VELVET : A;
    const backAlt = blacklight ? A : a.tradition === 'london' ? (a.palette === 'gold-silver' ? gold : C) : B;
    const ground1 = blacklight ? VELVET : a.tradition === 'london' ? paperRGB : B;
    const ground2 = blacklight ? B : a.tradition === 'london' ? K : lerp3(B, K, 0.28);
    const setInks: RGB[] = blacklight
      ? [lerp3(A, VELVET, 0.55), lerp3(B, VELVET, 0.55), lerp3(C, VELVET, 0.6)]
      : a.tradition === 'london'
        ? [lerp3(paperRGB, A, 0.25), lerp3(paperRGB, silver, 0.5), lerp3(paperRGB, B, 0.3)]
        : [lerp3(A, WHITE, 0.5), lerp3(C, WHITE, 0.45), lerp3(B, WHITE, 0.5)];

    // Split fountain: a rainbow rolled diagonally across the sheet.
    const fountainStops = a.palette === 'rainbow' || a.shading === 'fountain' ? spectrum : [A, C, B];
    const fountain = (x: number, y: number): RGB => {
      const u = clamp01((x * 0.75 + y * 0.35) / (S * 1.1) + (vnoise(x / (90 * k), y / (90 * k), seed + 4) - 0.5) * 0.08);
      const f = u * (fountainStops.length - 1);
      const i = Math.min(fountainStops.length - 2, Math.floor(f));
      return lerp3(fountainStops[i], fountainStops[i + 1], smooth(0, 1, f - i));
    };
    await pause();

    // ── 3. Distance fields: from the hero (halo bands), from all things (ornaments) ───────────
    const heroMask = new Uint8Array(N), thingMask = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      if (ids[p] === heroId && heroId) heroMask[p] = 1;
      if (ids[p] >= 3) thingMask[p] = 1;
    }
    const heroDist = heroId ? distanceField(heroMask, S, S, false).dist : null;
    await pause();
    const thingDist = distanceField(thingMask, S, S, false).dist;
    await pause();

    // ── 4. Key line: silhouettes, depth breaks and creases, swelling like a brush ──────────────
    const baseLine = mix(0.9, 6.2, a.outline) * trad.line * k;
    const siteR = new Float32Array(N);
    const sites = new Uint8Array(N);
    for (let y = 0; y < S - 1; y++) {
      if ((y & 63) === 0) signal.throwIfAborted();
      for (let x = 0; x < S - 1; x++) {
        const p = y * S + x;
        const ip = ids[p];
        let r = 0;
        for (const q of [p + 1, p + S]) {
          const iq = ids[q];
          if (ip !== iq) {
            const fg = ip === 0 ? iq : iq === 0 ? ip : dep[p] < dep[q] ? ip : iq;
            const rr = (ip <= 1 && iq <= 1 ? 0.75 : 1) * baseLine * lineScale(Math.max(fg, ip <= 1 && iq <= 1 ? 1 : fg));
            r = Math.max(r, rr);
          } else if (ip >= 1) {
            const dz = Math.abs(dep[p] - dep[q]);
            const dot = nrm[p * 3] * nrm[q * 3] + nrm[p * 3 + 1] * nrm[q * 3 + 1] + nrm[p * 3 + 2] * nrm[q * 3 + 2];
            const jump = dz > 0.0035 + dep[p] * 0.012;
            const crease = ip >= 2 && dot < 0.72;
            if (jump || crease) r = Math.max(r, baseLine * lineScale(ip) * (jump ? 0.75 : 0.5));
          }
        }
        if (r > 0) {
          // A brush that swells and thins along the stroke: the whiplash line.
          const swell = 0.62 + 0.76 * vnoise(x / (34 * k), y / (34 * k), seed + 11);
          siteR[p] = Math.max(0.55 * k, r * swell);
          sites[p] = 1;
        }
      }
    }
    const lineField = distanceField(sites, S, S, true);
    const keyCov = new Float32Array(N);
    {
      const { dist, from } = lineField;
      for (let p = 0; p < N; p++) {
        const r = siteR[from![p]];
        keyCov[p] = clamp01(r - dist[p] + 0.5);
      }
    }
    await pause();

    // ── 5. Fills, region by region ─────────────────────────────────────────────────────────
    const fill = new Float32Array(N * 3);
    const metal = new Uint8Array(N);
    const bandW = mix(26, 13, mood.energy) * k * (a.motif === 'checker' ? 1.3 : 1);
    const rays = Math.round(mix(12, 26, mood.energy));
    const twist = a.motif === 'spiral' ? mix(5, 9, a.melt) : 0;
    const contourBands = (id: number) => (extent[id] > 140 * k ? 4 : extent[id] > 60 * k ? 3 : 2);
    const lx = capture.light[0], ly = capture.light[1], lz = capture.light[2];
    const hl = Math.hypot(lx, ly, lz + 1) || 1;
    const hx = lx / hl, hy = -ly / hl, hz = (lz + 1) / hl; // half vector toward the viewer; view-space y is up

    /** 0 or 1: which of the two motif inks this point of the ground takes; -1 for none. */
    const motifAt = (x: number, y: number, p: number): number => {
      if (a.motif === 'none') return -1;
      const wob = (vnoise(x / (60 * k), y / (60 * k), seed + 21) - 0.5) * bandW * 1.2;
      const ang = Math.atan2(y - hcy, x - hcx);
      const r = Math.hypot(x - hcx, y - hcy);
      if (a.motif === 'halo') {
        const d = (heroDist ? heroDist[p] : r) + wob;
        return Math.floor(d / bandW) & 1;
      }
      if (a.motif === 'rays' || a.motif === 'spiral') {
        const t = (ang + twist * (r / S) + wob / (S * 0.3)) / (Math.PI * 2);
        return Math.floor((t + 1) * rays) & 1;
      }
      if (a.motif === 'checker') {
        const ring = Math.floor((r + wob) / bandW) & 1;
        const sector = Math.floor(((ang / (Math.PI * 2)) + 1) * rays * 0.75) & 1;
        return ring ^ sector;
      }
      // whiplash
      const flow = y + S * 0.13 * Math.sin(x / (S * 0.21) + seed * 0.37) + S * 0.05 * Math.sin(x / (S * 0.07) + y / (S * 0.3)) + wob * 2;
      return Math.sin(flow / (bandW * 0.9)) > 0 ? 1 : 0;
    };

    for (let y = 0; y < S; y++) {
      if ((y & 31) === 0) signal.throwIfAborted();
      for (let x = 0; x < S; x++) {
        const p = y * S + x, id = ids[p];
        let col: RGB;
        let isM = false;
        // Tone within the region; a nearly uniform region reads as lit, not as all shadow.
        const spread = Math.max(hiLit[id] - loLit[id], 0.3 * hiLit[id] + 0.04);
        const t0 = clamp01((lit[p] - (hiLit[id] - spread)) / spread);
        const tn = t0 + (vnoise(x / (28 * k), y / (28 * k), seed + 31) - 0.5) * 0.14;
        if (id === 0) {
          // Backdrop: sky or the far wall.
          if (a.tradition === 'airbrush' && !velvet) {
            const v = clamp01(y / (S * 0.75));
            col = v < 0.5 ? lerp3(lerp3(B, K, 0.55), A, smooth(0, 0.5, v)) : lerp3(A, C, smooth(0.5, 1, v));
          } else col = a.shading === 'fountain' && !blacklight ? fountain(x, y) : velvet && !blacklight ? VELVET : back;
          isM = isMetal(col);
          const m = motifAt(x, y, p);
          if (m === 1) {
            if (a.tradition === 'airbrush') {
              const r = (heroDist ? heroDist[p] : Math.hypot(x - hcx, y - hcy)) / (bandW * 1.4);
              const i = Math.floor(r) % 6;
              col = lerp3(col, spectrum[i], 0.85);
            } else if (blacklight || velvet) {
              col = a.palette === 'rainbow' ? spectrum[Math.floor((heroDist ? heroDist[p] : 0) / (bandW * 2)) % 6] : backAlt;
            } else col = backAlt;
            isM = isMetal(col);
          }
        } else if (id === 1) {
          // Ground: stripes receding with depth, cast shadows as flat dark shapes.
          const span = Math.max(1e-5, groundFar - groundNear);
          const g = ((dep[p] - groundNear) / span) * mix(7, 13, mood.energy) + (vnoise(x / (50 * k), y / (50 * k), seed + 41) - 0.5) * 0.5;
          const fr = g - Math.floor(g);
          const stripe = blacklight || a.tradition === 'london' || velvet ? fr < 0.2 : fr < 0.5;
          col = stripe ? ground2 : velvet && !blacklight ? lerp3(ground1, VELVET, 0.5) : ground1;
          if (a.tradition === 'airbrush') col = lerp3(lerp3(B, K, 0.2), lerp3(C, B, 0.4), smooth(0, 1, (dep[p] - groundNear) / span));
          if (!blacklight && tn < 0.32) col = lerp3(col, K, a.tradition === 'london' ? 0.9 : 0.4);
          // Open ground far from the cast takes the motif in full; near the cast it fades back.
          const m = motifAt(x, y, p);
          if (m >= 0) {
            const open = smooth(18 * k, 70 * k, thingDist[p]) * (a.motif === 'halo' || a.motif === 'checker' ? 1 : 0.85);
            const strength = mix(0.25, 1, open);
            const mc = m === 1 ? backAlt : blacklight || velvet ? VELVET : back;
            col = lerp3(col, mc, strength * (m === 1 ? 1 : 0.85));
          }
        } else if (id === 2) {
          // The set: flat planes by facing, cut into light and shade.
          const ax = Math.abs(nrm[p * 3]), ay = Math.abs(nrm[p * 3 + 1]), az = Math.abs(nrm[p * 3 + 2]);
          const facet = ay > ax && ay > az ? 1 : ax > az ? 0 : 2;
          col = setInks[facet];
          if (blacklight) col = tn < 0.38 ? VELVET : col;
          else if (trad.soft) col = lerp3(lerp3(col, K, 0.35), lerp3(col, WHITE, 0.3), smooth(0.1, 0.9, tn));
          else if (tn < 0.3) col = lerp3(col, a.tradition === 'london' ? K : partner(fills[facet % fills.length]), a.tradition === 'london' ? 0.85 : 0.45);
          else if (tn > 0.85) col = lerp3(col, WHITE, 0.35);
          const m = a.motif === 'halo' || a.motif === 'whiplash' ? motifAt(x, y, p) : -1;
          if (m === 1) col = lerp3(col, backAlt, blacklight ? 0.35 : 0.22);
        } else {
          // A thing: its ink, its shadow ink and its light.
          let F = fillOf[id] ?? fills[0];
          if (a.shading === 'fountain') F = fountain(x, y);
          const chrome = trad.chrome && id === heroId;
          if (chrome) {
            // Chrome reflects sky above a horizon that runs across the middle of the form.
            const yl = (y - hcy) / Math.max(8 * k, heroR);
            const ny = nrm[p * 3 + 1] * 0.75 - yl * 0.55 + (vnoise(x / (40 * k), y / (40 * k), seed + 51) - 0.5) * 0.3;
            const sky = lerp3(WHITE, lerp3(B, WHITE, 0.2), smooth(0.05, 0.9, ny));
            const earth = lerp3(lerp3(C, K, 0.65), lerp3(A, C, 0.5), smooth(-0.05, -0.9, ny));
            col = ny > 0.04 ? sky : ny > -0.06 ? lerp3(K, B, 0.2) : earth;
            col = lerp3(col, K, (1 - t0) * 0.35);
          } else {
            const shadow: RGB = blacklight
              ? VELVET
              : a.tradition === 'london'
                ? K
                : trad.soft
                  ? lerp3(F, K, 0.55)
                  : a.tradition === 'ballroom'
                    ? partner(F)
                    : lerp3(F, K, 0.45);
            const mid: RGB = blacklight ? lerp3(F, VELVET, 0.4) : F;
            const light: RGB = blacklight ? F : a.tradition === 'london' ? WHITE : lerp3(F, WHITE, 0.5);
            if (a.shading === 'flat') col = F;
            else if (a.shading === 'contours') {
              const nb = contourBands(id);
              const b = Math.max(0, Math.min(nb - 1, Math.floor(tn * nb)));
              col = b === nb - 1 ? light : (nb - 1 - b) % 2 === 1 ? mid : shadow;
              if (blacklight && b > 0) col = b === nb - 1 ? F : mid;
            } else if (trad.soft) {
              col = tn < 0.5 ? lerp3(shadow, mid, smooth(0.05, 0.5, tn)) : lerp3(mid, light, smooth(0.6, 1, tn));
            } else col = tn < (a.tradition === 'london' ? 0.27 : 0.4) ? shadow : tn > 0.86 ? light : mid;
            isM = isMetal(F) && col === F;
            if (a.tradition === 'london' && (col === mid) && id === heroId) isM = true;
          }
        }
        if (isM) metal[p] = 1;
        fill[p * 3] = col[0];
        fill[p * 3 + 1] = col[1];
        fill[p * 3 + 2] = col[2];
      }
    }
    // Metallic ink: it catches the light by the surface's angle, with a fine glitter.
    for (let p = 0; p < N; p++) {
      if (!metal[p]) continue;
      const x = p % S, y = (p - x) / S;
      let sheen: number;
      if (ids[p] >= 1) {
        const d = nrm[p * 3] * hx + nrm[p * 3 + 1] * hy + nrm[p * 3 + 2] * hz;
        sheen = Math.pow(clamp01(d), 6) * 0.9 + clamp01(d) * 0.25;
      } else sheen = 0.35 + 0.35 * Math.sin((x + y) / (S * 0.18) + vnoise(x / (80 * k), y / (80 * k), seed + 61) * 3);
      const f = 0.72 + 0.62 * sheen + (hash(x, y, seed + 62) - 0.5) * 0.12;
      fill[p * 3] = Math.min(255, fill[p * 3] * f);
      fill[p * 3 + 1] = Math.min(255, fill[p * 3 + 1] * f);
      fill[p * 3 + 2] = Math.min(255, fill[p * 3 + 2] * f);
    }
    await pause();

    // ── 6. Ornaments in the dead space, and lettering on a bill ───────────────────────────
    const putFill = (p: number, c: RGB) => {
      fill[p * 3] = c[0];
      fill[p * 3 + 1] = c[1];
      fill[p * 3 + 2] = c[2];
    };
    const lineK: RGB = blacklight ? [8, 6, 10] : K;
    const molInkC: RGB = blacklight ? lerp3(C, WHITE, 0.1) : K;
    const oLine = Math.max(1.3 * k, baseLine * 0.65);
    type Layer = { d: (u: number, v: number) => number; ink: RGB };
    const paint = (cx: number, cy: number, R: number, rot: number, flip: boolean, layers: Layer[], gap: number) => {
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const lw = oLine / R;
      const x0 = Math.max(0, Math.floor(cx - R * 1.15)), x1 = Math.min(S - 1, Math.ceil(cx + R * 1.15));
      const y0 = Math.max(0, Math.floor(cy - R * 1.15)), y1 = Math.min(S - 1, Math.ceil(cy + R * 1.15));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const p = y * S + x;
          if (thingDist[p] < gap) continue;
          const dx = (x - cx) / R, dy = (y - cy) / R;
          let u = dx * cr + dy * sr;
          const v = -dx * sr + dy * cr;
          if (flip) u = -u;
          let out: RGB | null = null;
          for (const layer of layers) {
            const d = layer.d(u, v);
            if (d < -lw / 2) out = layer.ink;
            else if (d < lw / 2) out = layer.ink === molInkC ? molInkC : lineK;
          }
          if (out) putFill(p, out);
        }
    };
    const cream = blacklight ? lerp3(C, WHITE, 0.3) : lerp3(WHITE, C, 0.15);
    const glyphN = (u: number, v: number, cx: number, cy: number, s: number, w: number) =>
      Math.min(
        sdSeg(u, v, cx - 0.3 * s, cy + 0.4 * s, cx - 0.3 * s, cy - 0.4 * s, w),
        sdSeg(u, v, cx - 0.3 * s, cy - 0.4 * s, cx + 0.3 * s, cy + 0.4 * s, w),
        sdSeg(u, v, cx + 0.3 * s, cy + 0.4 * s, cx + 0.3 * s, cy - 0.4 * s, w),
      );
    const glyphH = (u: number, v: number, cx: number, cy: number, s: number, w: number) =>
      Math.min(
        sdSeg(u, v, cx - 0.3 * s, cy + 0.4 * s, cx - 0.3 * s, cy - 0.4 * s, w),
        sdSeg(u, v, cx + 0.3 * s, cy + 0.4 * s, cx + 0.3 * s, cy - 0.4 * s, w),
        sdSeg(u, v, cx - 0.3 * s, cy, cx + 0.3 * s, cy, w),
      );
    const glyphO = (u: number, v: number, cx: number, cy: number, s: number, w: number) =>
      Math.abs(Math.hypot((u - cx) / 0.85, v - cy) - 0.36 * s) - w;

    /** A skeletal formula: bonds, ring double bonds, the 8-alpha/8-beta stereo bond, atom labels. */
    type Mol = {
      atoms: [number, number][];
      bonds: [number, number, number, number?][]; // a, b, order (1, 2, 3 = wedge, 4 = hash), ring centre index for inner line
      rings: [number, number][];
      labels: [number, string][];
    };
    const r3 = Math.sqrt(3) / 2;
    const MOLS: Mol[] = [
      {
        // Lysergamide: indole, ring C, ring D with N6-methyl, the C8 carboxamide with two ethyls.
        atoms: [
          [0, -1], [r3, -0.5], [r3, 0.5], [0, 1], [-r3, 0.5], [-r3, -0.5], // 0-5 benzene
          [-1.75, 0.85], [-2.35, 0.05], [-1.732, -1], // 6 N1, 7 C2, 8 C3
          [-1.732, -2], [-r3, -2.5], [0, -2], // 9 C4, 10 C5, 11 C10
          [-r3, -3.5], [0, -4], [r3, -3.5], [r3, -2.5], // 12 N6, 13 C7, 14 C8, 15 C9
          [-1.732, -4], // 16 methyl
          [1.732, -4], [1.732, -5], [2.598, -3.5], [3.464, -4], [4.33, -3.5], [2.598, -2.5], [3.464, -2], // 17 C=O, 18 O, 19 N, ethyls
        ],
        rings: [[0, 0], [-r3, -1.5], [0, -3]],
        bonds: [
          [0, 1, 1], [1, 2, 2, 0], [2, 3, 1], [3, 4, 2, 0], [4, 5, 1], [5, 0, 2, 0],
          [4, 6, 1], [6, 7, 1], [7, 8, 2], [8, 5, 1],
          [8, 9, 1], [9, 10, 1], [10, 11, 1], [11, 0, 1],
          [10, 12, 1], [12, 13, 1], [13, 14, 1], [14, 15, 1], [15, 11, 2, 2],
          [12, 16, 1], [14, 17, hash(seed, 3, 1) < 0.5 ? 3 : 4], [17, 18, 2], [17, 19, 1], [19, 20, 1], [20, 21, 1], [19, 22, 1], [22, 23, 1],
        ],
        labels: [[6, 'NH'], [12, 'N'], [18, 'O'], [19, 'N']],
      },
      {
        // A tryptamine: indole with a dimethylaminoethyl arm.
        atoms: [
          [0, -1], [r3, -0.5], [r3, 0.5], [0, 1], [-r3, 0.5], [-r3, -0.5],
          [1.82, -0.81], [2.41, 0], [1.82, 0.81], [1.5, -1.76], [2.2, -2.47], [1.9, -3.42], [0.92, -3.62], [2.6, -4.13],
        ],
        rings: [[0, 0]],
        bonds: [
          [0, 1, 1], [1, 2, 2, 0], [2, 3, 1], [3, 4, 2, 0], [4, 5, 1], [5, 0, 2, 0],
          [1, 6, 1], [6, 7, 2], [7, 8, 1], [8, 2, 1], [6, 9, 1], [9, 10, 1], [10, 11, 1], [11, 12, 1], [11, 13, 1],
        ],
        labels: [[8, 'NH'], [11, 'N']],
      },
      {
        // Mescaline: three methoxy groups and an ethylamine arm.
        atoms: [
          [0, -1], [r3, -0.5], [r3, 0.5], [0, 1], [-r3, 0.5], [-r3, -0.5],
          [r3, -1.5], [r3, -2.5], [1.732, -3], [0, 2], [r3, 2.5], [1.732, 1], [2.598, 0.5], [-1.732, 1], [-2.598, 0.5],
        ],
        rings: [[0, 0]],
        bonds: [
          [0, 1, 2, 0], [1, 2, 1], [2, 3, 2, 0], [3, 4, 1], [4, 5, 2, 0], [5, 0, 1],
          [0, 6, 1], [6, 7, 1], [7, 8, 1], [3, 9, 1], [9, 10, 1], [2, 11, 1], [11, 12, 1], [4, 13, 1], [13, 14, 1],
        ],
        labels: [[8, 'N'], [9, 'O'], [11, 'O'], [13, 'O']],
      },
    ];
    const molLayers = (mol: Mol): Layer[] => {
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (const [x, y] of mol.atoms) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      const sc = 1.85 / Math.max(maxX - minX + 0.8, maxY - minY + 0.8);
      const ox = (minX + maxX) / 2, oy = (minY + maxY) / 2;
      const P = mol.atoms.map(([x, y]) => [(x - ox) * sc, (y - oy) * sc] as [number, number]);
      const labelled = new Set(mol.labels.map(([i]) => i));
      const w = 0.045 * sc * 2.2;
      const segs: [number, number, number, number][] = [];
      const wedges: [number, number, number, number][] = [];
      const hashes: [number, number, number, number][] = [];
      for (const [i, j, order, ring] of mol.bonds) {
        let [ax, ay] = P[i], [bx, by] = P[j];
        const len = Math.hypot(bx - ax, by - ay);
        const ux = (bx - ax) / len, uy = (by - ay) / len;
        if (labelled.has(i)) {
          ax += ux * 0.3 * sc;
          ay += uy * 0.3 * sc;
        }
        if (labelled.has(j)) {
          bx -= ux * 0.3 * sc;
          by -= uy * 0.3 * sc;
        }
        if (order === 3) wedges.push([ax, ay, bx, by]);
        else if (order === 4) hashes.push([ax, ay, bx, by]);
        else segs.push([ax, ay, bx, by]);
        if (order === 2) {
          if (ring !== undefined) {
            const [rcx, rcy] = mol.rings[ring];
            const cxs = (rcx - ox) * sc, cys = (rcy - oy) * sc;
            const mx = (ax + bx) / 2, my = (ay + by) / 2;
            const tx = cxs - mx, ty = cys - my, tl = Math.hypot(tx, ty) || 1;
            const off = 0.2 * sc;
            const sh = 0.18;
            segs.push([
              mix(ax, bx, sh) + (tx / tl) * off, mix(ay, by, sh) + (ty / tl) * off,
              mix(ax, bx, 1 - sh) + (tx / tl) * off, mix(ay, by, 1 - sh) + (ty / tl) * off,
            ]);
          } else {
            const off = 0.16 * sc;
            segs.push([ax - uy * off, ay + ux * off, bx - uy * off, by + ux * off]);
          }
        }
      }
      const molInk = molInkC;
      return [
        {
          ink: molInk,
          d: (u, v) => {
            let d = 1e9;
            for (const s of segs) d = Math.min(d, sdSeg(u, v, s[0], s[1], s[2], s[3], w));
            for (const s of wedges) {
              // A wedge: widens from the stereocentre toward the substituent.
              const bax = s[2] - s[0], bay = s[3] - s[1], L = Math.hypot(bax, bay);
              const t = clamp01(((u - s[0]) * bax + (v - s[1]) * bay) / (L * L));
              const px = s[0] + bax * t, py = s[1] + bay * t;
              d = Math.min(d, Math.hypot(u - px, v - py) - mix(w * 0.6, 0.12 * sc, t));
            }
            for (const s of hashes) {
              // A hashed bond: a ladder of rungs growing toward the substituent.
              const bax = s[2] - s[0], bay = s[3] - s[1], L = Math.hypot(bax, bay);
              const nx = -bay / L, ny = bax / L;
              for (let r = 0; r < 6; r++) {
                const t = (r + 0.5) / 6, half = mix(0.03, 0.13, t) * sc;
                const px = s[0] + bax * t, py = s[1] + bay * t;
                d = Math.min(d, sdSeg(u, v, px - nx * half, py - ny * half, px + nx * half, py + ny * half, w * 0.7));
              }
            }
            for (const [i, text] of mol.labels) {
              const [cx, cy] = P[i];
              const gs = 0.42 * sc;
              const gw = w * 0.85;
              if (text === 'N') d = Math.min(d, glyphN(u, v, cx, cy, gs, gw));
              else if (text === 'O') d = Math.min(d, glyphO(u, v, cx, cy, gs, gw));
              else if (text === 'NH') d = Math.min(d, glyphN(u, v, cx, cy, gs, gw), glyphH(u, v, cx, cy + 0.5 * sc, gs, gw));
            }
            return d;
          },
        },
      ];
    };

    const ornament = (kind: keyof typeof ORNAMENTS, i: number): Layer[] => {
      const r = (n: number) => hash(i, n, seed + 71);
      const red = a.palette === 'rainbow' ? spectrum[0] : A;
      switch (kind) {
        case 'mushrooms': {
          if (r(1) < 0.55) {
            const spots = Array.from({ length: 6 }, (_, j) => [mix(-0.55, 0.55, r(10 + j)), mix(-0.55, -0.15, r(20 + j)), mix(0.07, 0.13, r(30 + j))]);
            return [
              { ink: cream, d: (u, v) => sdBox(u, v, 0, 0.45, 0.2, 0.45, 0.12) },
              { ink: red, d: (u, v) => Math.max(sdEllipse(u, v, 0, 0, 0.85, 0.65), v - 0.02) },
              ...spots.map(([sx2, sy2, sr]) => ({ ink: cream, d: (u: number, v: number) => Math.max(sdCircle(u, v, sx2, sy2, sr), sdEllipse(u, v, 0, 0, 0.82, 0.62)) })),
            ];
          }
          // A liberty cap: a slender stem and a pointed, nippled cap.
          return [
            { ink: cream, d: (u, v) => sdSeg(u, v, 0.05, 0.9, -0.05, -0.1, 0.1) },
            { ink: lerp3(C, K, 0.35), d: (u, v) => smin(Math.max(sdEllipse(u, v, 0, -0.15, 0.45, 0.7), v + 0.05 - 0.2), sdCircle(u, v, 0, -0.85, 0.09), 0.08) },
          ];
        }
        case 'eyes': {
          const almond = (u: number, v: number) => Math.max(sdCircle(u, v, 0, 0.62, 1.05), sdCircle(u, v, 0, -0.62, 1.05));
          const iris = B;
          return [
            ...Array.from({ length: 9 }, (_, j) => {
              const t = (j / 8) * 1.8 - 0.9;
              return { ink: lineK, d: (u: number, v: number) => sdSeg(u, v, t * 0.85, -0.38 + Math.abs(t) * 0.18, t * 1.15, -0.72 + Math.abs(t) * 0.3, 0.025) };
            }),
            { ink: blacklight ? lerp3(C, WHITE, 0.4) : WHITE, d: almond },
            { ink: iris, d: (u, v) => Math.max(sdCircle(u, v, 0, 0, 0.33), almond(u, v)) },
            { ink: lineK, d: (u, v) => sdCircle(u, v, 0, 0, 0.13) },
            { ink: WHITE, d: (u, v) => sdCircle(u, v, 0.1, -0.1, 0.05) },
          ];
        }
        case 'rainbows': {
          const bands = spectrum;
          return [
            ...bands.map((c, j) => ({
              ink: c,
              d: (u: number, v: number) => Math.max(Math.abs(Math.hypot(u, v - 0.35) - (0.88 - j * 0.1)) - 0.05, v - 0.35),
            })),
            { ink: WHITE, d: (u, v) => smin(smin(sdCircle(u, v, -0.72, 0.42, 0.2), sdCircle(u, v, -0.5, 0.38, 0.17), 0.05), sdCircle(u, v, -0.88, 0.45, 0.14), 0.05) },
            { ink: WHITE, d: (u, v) => smin(smin(sdCircle(u, v, 0.72, 0.42, 0.2), sdCircle(u, v, 0.5, 0.38, 0.17), 0.05), sdCircle(u, v, 0.88, 0.45, 0.14), 0.05) },
          ];
        }
        case 'peace': {
          if (r(2) < 0.6) {
            const w = 0.1;
            return [
              { ink: C, d: (u, v) => sdCircle(u, v, 0, 0, 0.9) },
              {
                ink: lineK,
                d: (u, v) =>
                  Math.min(
                    Math.abs(sdCircle(u, v, 0, 0, 0.74)) - w,
                    sdSeg(u, v, 0, -0.74, 0, 0.74, w),
                    sdSeg(u, v, 0, 0.05, -0.52, 0.52, w),
                    sdSeg(u, v, 0, 0.05, 0.52, 0.52, w),
                  ),
              },
            ];
          }
          // A smiling sun.
          return [
            ...Array.from({ length: 12 }, (_, j) => {
              const t = (j / 12) * Math.PI * 2;
              return { ink: blacklight ? A : lerp3(A, C, 0.5), d: (u: number, v: number) => sdSeg(u, v, Math.cos(t) * 0.55, Math.sin(t) * 0.55, Math.cos(t) * 0.95, Math.sin(t) * 0.95, 0.08) };
            }),
            { ink: C, d: (u, v) => sdCircle(u, v, 0, 0, 0.55) },
            { ink: lineK, d: (u, v) => Math.min(sdCircle(u, v, -0.2, -0.12, 0.07), sdCircle(u, v, 0.2, -0.12, 0.07), Math.max(Math.abs(sdCircle(u, v, 0, 0.02, 0.3)) - 0.035, -v + 0.08)) },
          ];
        }
        case 'smileys': {
          const melting = r(3) < 0.5;
          const drips = Array.from({ length: 4 }, (_, j) => [mix(-0.55, 0.55, j / 3) + (r(40 + j) - 0.5) * 0.15, mix(0.75, 1.05, r(50 + j))]);
          const face = (u: number, v: number) => {
            let d = sdCircle(u, v, 0, -0.08, 0.78);
            if (melting) for (const [dx, dl] of drips) d = smin(d, sdSeg(u, v, dx, 0.3, dx, dl - 0.08, 0.09), 0.12);
            return d;
          };
          return [
            { ink: blacklight ? C : hex('#f5d21e'), d: face },
            {
              ink: lineK,
              d: (u, v) => Math.min(sdEllipse(u, v, -0.26, -0.3, 0.08, 0.15), sdEllipse(u, v, 0.26, -0.3, 0.08, 0.15), Math.max(Math.abs(sdCircle(u, v, 0, -0.2, 0.46)) - 0.05, -v + 0.0)),
            },
          ];
        }
        case 'paisley': {
          const pts: [number, number, number][] = [[0, 0.32, 0.52], [0.08, 0.08, 0.47], [0.18, -0.16, 0.4], [0.28, -0.37, 0.31], [0.35, -0.55, 0.22], [0.36, -0.7, 0.14], [0.29, -0.82, 0.09], [0.18, -0.88, 0.055]];
          const tear = (u: number, v: number) => {
            let d = 1e9;
            for (const [px, py, pr] of pts) d = smin(d, sdCircle(u, v, px, py, pr), 0.09);
            return d;
          };
          const c1 = a.palette === 'rainbow' ? spectrum[4] : B, c2 = a.palette === 'rainbow' ? spectrum[1] : C, c3 = A;
          return [
            { ink: c1, d: tear },
            { ink: c2, d: (u, v) => tear(u, v) + 0.13 },
            { ink: c3, d: (u, v) => tear(u, v) + 0.26 },
            ...Array.from({ length: 9 }, (_, j) => {
              const t = Math.PI * (0.15 + (j / 8) * 1.2);
              return { ink: c2, d: (u: number, v: number) => sdCircle(u, v, Math.cos(t) * 0.68, 0.32 + Math.sin(t) * 0.68, 0.055) };
            }),
          ];
        }
        case 'drips': {
          const drips = Array.from({ length: 5 }, (_, j) => [mix(-0.65, 0.65, j / 4) + (r(60 + j) - 0.5) * 0.12, mix(0.15, 0.95, r(70 + j)), mix(0.07, 0.13, r(80 + j))]);
          const c = a.palette === 'rainbow' ? spectrum[Math.floor(r(5) * 6)] : r(5) < 0.5 ? B : A;
          return [
            {
              ink: c,
              d: (u, v) => {
                let d = sdEllipse(u, v, 0, -0.45, 0.85, 0.32);
                for (const [dx, dl, dr] of drips) d = smin(d, smin(sdSeg(u, v, dx, -0.4, dx, dl, dr * 0.7), sdCircle(u, v, dx, dl, dr), 0.08), 0.15);
                return d;
              },
            },
          ];
        }
        case 'molecules':
          return molLayers(MOLS[i === 0 ? 0 : Math.floor(r(6) * MOLS.length)]);
        default:
          return [];
      }
    };

    const placed: [number, number, number][] = [];
    if (a.ornament !== 'none') {
      const count = Math.round(mix(2, 8, mood.density));
      const R0 = (a.ornament === 'molecules' ? 62 : 40) * k;
      const gap = 7 * k;
      for (let tries = 0; tries < 500 && placed.length < count; tries++) {
        // Prefer the margins: sample toward the edges of the sheet.
        const edge = rnd();
        let x = rnd() * S, y = rnd() * S;
        if (edge < 0.6) {
          const side = Math.floor(rnd() * 4);
          const depthIn = rnd() * 0.22 * S;
          if (side === 0) y = depthIn + R0;
          else if (side === 1) y = S - depthIn - R0;
          else if (side === 2) x = depthIn + R0;
          else x = S - depthIn - R0;
        }
        const R = R0 * mix(0.7, 1.25, rnd());
        x = Math.max(R + 6 * k, Math.min(S - R - 6 * k, x));
        y = Math.max(R + 6 * k, Math.min(S - R - 6 * k, y));
        const p = Math.round(y) * S + Math.round(x);
        if (thingDist[p] < R * 1.05 + gap) continue;
        if (placed.some(([px, py, pr]) => Math.hypot(px - x, py - y) < pr + R + 8 * k)) continue;
        placed.push([x, y, R]);
      }
      placed.forEach(([x, y, R], i) => {
        const tilt = a.ornament === 'molecules' ? (rnd() - 0.5) * 0.5 : (rnd() - 0.5) * 0.7;
        paint(x, y, R, tilt, rnd() < 0.4, ornament(a.ornament, i), gap * 0.5);
      });
    }

    // A bill's lettering: swollen strokes that fill a curved band across the top.
    let lettered = false;
    const margin = Math.round(S * 0.028);
    if (a.display === 'bill') {
      const y0 = Math.round(S * 0.045), y1 = Math.round(S * 0.17);
      let covered = 0;
      for (let y = y0; y < y1 + S * 0.03; y++) for (let x = 0; x < S; x++) if (thingMask[y * S + x]) covered++;
      if (covered < S * (y1 - y0) * 0.04) {
        lettered = true;
        const n = 6 + Math.floor(rnd() * 5);
        const glyphs = Array.from({ length: n }, (_, g) => {
          const strokes: [number, number, number, number][] = [];
          const pick = (m: number) => Math.floor(hash(g, m, seed + 91) * 8);
          for (let s = 0; s < 3; s++) {
            switch (pick(s)) {
              case 0: strokes.push([-0.28, -0.42, -0.28, 0.42]); break;
              case 1: strokes.push([0.28, -0.42, 0.28, 0.42]); break;
              case 2: strokes.push([-0.28, -0.42, 0.28, 0.42]); break;
              case 3: strokes.push([-0.28, 0, 0.28, 0]); break;
              case 4: strokes.push([-0.28, -0.42, 0.28, -0.42]); break;
              case 5: strokes.push([-0.28, 0.42, 0.28, 0.42]); break;
              case 6: strokes.push([0, -0.42, 0, 0.42]); break;
              default: strokes.push([0.28, -0.42, -0.28, 0.42]);
            }
          }
          return { strokes, bowl: hash(g, 9, seed + 92) < 0.3 };
        });
        const letterInk = blacklight ? C : a.tradition === 'london' ? gold : a.palette === 'rainbow' ? spectrum[2] : C;
        const lx0 = margin + S * 0.04, lx1 = S - margin - S * 0.04;
        const cellW = (lx1 - lx0) / n;
        const lwL = Math.max(1.3 * k, baseLine * 0.6);
        for (let y = y0 - Math.round(S * 0.03); y < y1 + Math.round(S * 0.03); y++)
          for (let x = Math.floor(lx0); x < Math.ceil(lx1); x++) {
            const p = y * S + x;
            if (thingDist[p] < 4 * k) continue;
            const u = (x - lx0) / (lx1 - lx0);
            const arch = -Math.sin(u * Math.PI) * S * 0.028;
            const swellH = mix(0.75, 1.15, Math.sin(u * Math.PI));
            const mid = (y0 + y1) / 2 + arch;
            const vv = (y - mid) / ((y1 - y0) * 0.5 * swellH);
            if (Math.abs(vv) > 1.25) continue;
            const g = Math.max(0, Math.min(n - 1, Math.floor((x - lx0) / cellW)));
            const gu = ((x - lx0) - (g + 0.5) * cellW) / cellW;
            const gl = glyphs[g];
            let d = 1e9;
            for (const s of gl.strokes) d = Math.min(d, sdSeg(gu, vv * 0.5, s[0], s[1] * 0.5 * 2, s[2], s[3] * 0.5 * 2, 0.17) / 1);
            if (gl.bowl) d = Math.min(d, Math.abs(Math.hypot(gu / 0.36, vv / 0.9) - 0.75) * 0.3 - 0.1);
            const dpx = d * cellW;
            if (dpx < -lwL / 2) putFill(p, letterInk);
            else if (dpx < lwL / 2) putFill(p, lineK);
          }
      }
    }
    await pause();

    // ── 7. The melt: one liquid warp bends the whole sheet, then the key prints a hair off ───
    const amp = a.melt * trad.melt * 0.034 * S;
    const L1 = 0.33 * S, L2 = 0.12 * S;
    const misX = (0.8 + mood.wear * 1.6) * k, misY = (0.5 + mood.wear) * k * 0.7;
    const out = new Float32Array(N * 3);
    const sampleFill = (fx: number, fy: number, o: number) => {
      fx = Math.max(0, Math.min(S - 1.001, fx));
      fy = Math.max(0, Math.min(S - 1.001, fy));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const p00 = (y0 * S + x0) * 3, p10 = p00 + 3, p01 = p00 + S * 3, p11 = p01 + 3;
      for (let c = 0; c < 3; c++)
        out[o + c] = mix(mix(fill[p00 + c], fill[p10 + c], tx), mix(fill[p01 + c], fill[p11 + c], tx), ty);
    };
    const sampleKey = (fx: number, fy: number) => {
      fx = Math.max(0, Math.min(S - 1.001, fx));
      fy = Math.max(0, Math.min(S - 1.001, fy));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const p = y0 * S + x0;
      return mix(mix(keyCov[p], keyCov[p + 1], tx), mix(keyCov[p + S], keyCov[p + S + 1], tx), ty);
    };
    const keyInk: RGB = blacklight ? [6, 5, 8] : K;
    for (let y = 0; y < S; y++) {
      if ((y & 31) === 0) signal.throwIfAborted();
      for (let x = 0; x < S; x++) {
        const n1 = vnoise(x / L1, y / L1, seed + 101) - 0.5, n2 = vnoise(x / L2, y / L2, seed + 102) - 0.5;
        const n3 = vnoise(x / L1, y / L1, seed + 103) - 0.5, n4 = vnoise(x / L2, y / L2, seed + 104) - 0.5;
        const drip = (vnoise(x / L2, 3.3, seed + 105) - 0.3) * (y / S);
        const dx = amp * (n1 * 1.5 + n2 * 0.5);
        const dy = amp * (n3 * 1.5 + n4 * 0.5) - amp * 0.9 * drip;
        const o = (y * S + x) * 3;
        sampleFill(x + dx, y + dy, o);
        const kc = sampleKey(x + dx + misX, y + dy + misY);
        if (kc > 0) {
          out[o] = mix(out[o], keyInk[0], kc);
          out[o + 1] = mix(out[o + 1], keyInk[1], kc);
          out[o + 2] = mix(out[o + 2], keyInk[2], kc);
        }
      }
    }
    await pause();

    // ── 8. Glow under UV, and airbrushed starbursts ───────────────────────────────────────
    if (blacklight || (velvet && a.tradition !== 'london')) {
      const emit = new Float32Array(N * 3);
      for (let p = 0; p < N; p++) {
        const r = out[p * 3], g = out[p * 3 + 1], b = out[p * 3 + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const e = clamp01((mx - 90) / 165) * clamp01((mx - mn) / 120 + 0.2);
        emit[p * 3] = r * e;
        emit[p * 3 + 1] = g * e;
        emit[p * 3 + 2] = b * e;
      }
      const glow = blurRGB(emit, S, 5 * k);
      const strength = blacklight ? 0.75 : 0.4;
      for (let i = 0; i < N * 3; i++) out[i] = out[i] + glow[i] * strength * (1 - out[i] / 400);
      await pause();
    }
    if (trad.chrome) {
      // Four-pointed stars on the brightest highlights, kept apart from one another.
      const stars: [number, number][] = [];
      const cand: [number, number, number][] = [];
      for (let y = 4; y < S - 4; y += 3)
        for (let x = 4; x < S - 4; x += 3) {
          const p = y * S + x;
          if (ids[p] < 2) continue;
          const d = nrm[p * 3] * hx + nrm[p * 3 + 1] * hy + nrm[p * 3 + 2] * hz;
          const sc = lit[p] * 0.6 + d * 0.4 + (ids[p] === heroId ? 0.3 : 0);
          cand.push([sc, x, y]);
        }
      cand.sort((p, q) => q[0] - p[0]);
      for (const [, x, y] of cand) {
        if (stars.length >= Math.round(mix(2, 6, mood.energy))) break;
        if (stars.some(([sx2, sy2]) => Math.hypot(sx2 - x, sy2 - y) < S * 0.12)) continue;
        stars.push([x, y]);
      }
      for (const [cx, cy] of stars) {
        const R = mix(16, 34, rnd()) * k;
        for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(S, cy + R); y++)
          for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(S, cx + R); x++) {
            const u = Math.abs(x - cx) / R, v = Math.abs(y - cy) / R;
            const arm = Math.max(clamp01(1 - u - v * 9) * (1 - u), clamp01(1 - v - u * 9) * (1 - v));
            const core = clamp01(1 - Math.hypot(u, v) * 3.5);
            const e = clamp01(arm * 1.6 + core);
            const o = (y * S + x) * 3;
            out[o] = mix(out[o], 255, e);
            out[o + 1] = mix(out[o + 1], 253, e);
            out[o + 2] = mix(out[o + 2], 245, e);
          }
      }
    }

    // ── 9. Substrate, display and age ─────────────────────────────────────────────────────
    const tab = 24 * k;
    const missing = new Set<string>();
    if (a.ground === 'blotter' && mood.wear > 0.45) {
      // Tabs torn out from one corner of the sheet.
      const n = Math.round(mix(2, 14, (mood.wear - 0.45) / 0.55));
      const cols = Math.floor(S / tab);
      for (let i = 0; i < n; i++) {
        const tx = cols - 1 - Math.floor(rnd() * rnd() * 5), ty = Math.floor(rnd() * rnd() * 5);
        missing.add(`${tx},${ty}`);
      }
    }
    const tapeSpots: [number, number, number][] = a.display === 'wall'
      ? [[S * 0.04, S * 0.04, 0.7], [S * 0.96, S * 0.04, -0.7], [S * 0.04, S * 0.96, -0.7], [S * 0.96, S * 0.96, 0.7]]
      : [];
    const fade = mood.wear * 0.28;
    const yellow: RGB = [230, 210, 160];
    const pix = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < S; y++) {
      if ((y & 31) === 0) signal.throwIfAborted();
      for (let x = 0; x < S; x++) {
        const p = y * S + x, o = p * 3;
        let r = out[o], g = out[o + 1], b = out[o + 2];
        const grain = hash(x, y, seed + 201) - 0.5;
        if (a.ground === 'velvet') {
          // Flocked nap: soft streaks brushed one way, the light catching some fibres.
          const nap = vnoise(x / (2.5 * k), y / (16 * k), seed + 202) * 0.55 + vnoise(x / (55 * k), y / (38 * k), seed + 203) * 0.45;
          const f = 0.86 + nap * 0.2 + grain * 0.06;
          r *= f;
          g *= f;
          b *= f;
          if (mood.wear > 0.3) {
            const worn = smooth(0.62, 0.8, vnoise(x / (90 * k), y / (70 * k), seed + 204)) * (mood.wear - 0.3);
            r = mix(r, 70, worn * 0.5);
            g = mix(g, 66, worn * 0.5);
            b = mix(b, 72, worn * 0.5);
          }
        } else {
          const streak = (vnoise(x / (200 * k), y / (3 * k), seed + 205) - 0.5) * 0.05;
          const f = 1 + grain * 0.045 + streak;
          r *= f;
          g *= f;
          b *= f;
          if (a.ground === 'blotter') {
            // Absorbent paper, then the perforation lines between tabs.
            const fib = (vnoise(x / (6 * k), y / (1.5 * k), seed + 206) - 0.5) * 0.06;
            r *= 1 + fib;
            g *= 1 + fib;
            b *= 1 + fib;
            const gx = x / tab, gy = y / tab;
            const ex = Math.abs(gx - Math.round(gx)) * tab, ey = Math.abs(gy - Math.round(gy)) * tab;
            const along = ex < 0.9 * k ? y : ey < 0.9 * k ? x : -1;
            if (along >= 0) {
              const hole = (along / (3.2 * k)) % 1 < 0.45;
              const f2 = hole ? 0.6 : 1.08;
              r *= f2;
              g *= f2;
              b *= f2;
            }
            if (missing.has(`${Math.floor(gx)},${Math.floor(gy)}`)) {
              // The tabletop showing through where tabs were torn off.
              const wood = 0.5 + 0.5 * Math.sin(y / (5 * k) + vnoise(x / (40 * k), y / (8 * k), seed + 207) * 6);
              r = mix(70, 110, wood);
              g = mix(46, 72, wood);
              b = mix(32, 48, wood);
              const eTear = Math.min(ex, ey);
              if (eTear < 1.6 * k) {
                r = 235;
                g = 228;
                b = 210;
              }
            }
          }
        }
        // Sun fade toward a yellowed sheet with age.
        if (fade > 0 && !dark) {
          r = mix(r, yellow[0], fade);
          g = mix(g, yellow[1], fade);
          b = mix(b, yellow[2], fade);
        }
        if (a.display === 'bill' || (a.display === 'wall' && lettered)) {
          const e = Math.min(x, y, S - 1 - x, S - 1 - y);
          if (e < margin) {
            r = paperRGB[0];
            g = paperRGB[1];
            b = paperRGB[2];
          } else if (e < margin + 2.2 * k) {
            r = K[0];
            g = K[1];
            b = K[2];
          }
        }
        if (a.display === 'wall') {
          // Mailing folds: a light ridge and a dark valley across the quarters.
          const fx = Math.abs(x - S / 2), fy = Math.abs(y - S / 2);
          const fold = (fx < 1.5 * k ? 1 : 0) + (fy < 1.5 * k ? 1 : 0);
          const shade = (x > S / 2 && fx < 5 * k ? -0.08 : 0) + (y > S / 2 && fy < 5 * k ? -0.06 : 0);
          const f = fold ? 1.14 : 1 + shade;
          r *= f;
          g *= f;
          b *= f;
          for (const [tx, ty, rot] of tapeSpots) {
            const dx = x - tx, dy = y - ty;
            const u = dx * Math.cos(rot) + dy * Math.sin(rot), v = -dx * Math.sin(rot) + dy * Math.cos(rot);
            const torn = (hash(Math.floor(v / (2 * k)), 1, seed + 208) - 0.5) * 3 * k;
            if (Math.abs(u) < 34 * k + torn && Math.abs(v) < 11 * k) {
              r = mix(r, 236, 0.55);
              g = mix(g, 222, 0.55);
              b = mix(b, 178, 0.55);
            }
          }
          // The bottom edge curls away from the wall.
          const curl = smooth(S * 0.93, S, y) * 0.3;
          r *= 1 - curl;
          g *= 1 - curl;
          b *= 1 - curl;
        }
        const q = p * 4;
        pix[q] = r;
        pix[q + 1] = g;
        pix[q + 2] = b;
        pix[q + 3] = 255;
      }
    }

    return {
      pixels: pix,
      notes: [
        `${trad.name} in ${palette ? `${palette.ink} against ${palette.second}` : pair.name}`,
        `${a.shading === 'twoTone' ? 'two-tone' : a.shading} fills, melt ${Math.round(a.melt * 100)}%, outline ${baseLine.toFixed(1)} px`,
        ...(a.motif !== 'none' ? [`${a.motif} motif from the hero`] : []),
        ...(placed.length ? [`${placed.length} ${a.ornament} in the dead space`] : []),
        `on ${a.ground}${lettered ? ', with melted lettering' : ''}${a.display === 'wall' ? ', tacked to a wall' : ''}`,
      ],
    };
  },
});
