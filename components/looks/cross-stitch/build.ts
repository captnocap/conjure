import { choice, clamp01, defineLook, mix, score } from '@conjure/kit';

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) LIN[i] = i / 255 <= 0.04045 ? i / 255 / 12.92 : Math.pow((i / 255 + 0.055) / 1.055, 2.4);
const oklab = (r: number, g: number, b: number): RGB => {
  const R = LIN[Math.max(0, Math.min(255, Math.round(r)))];
  const G = LIN[Math.max(0, Math.min(255, Math.round(g)))];
  const B = LIN[Math.max(0, Math.min(255, Math.round(b)))];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const lumOf = (c: readonly number[]) => (c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722) / 255;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Fixed floss cards. `ramp` palettes are one-colour work: tone is carried by stitch density. */
const FLOSS: Record<string, { colors: string[]; mono?: boolean; accent?: string; dark?: string[] }> = {
  sampler: { colors: ['#7a2e2a', '#a8483c', '#2f3f63', '#5c7a8c', '#5a6332', '#8c8f4f', '#c39a45', '#6b4a2f', '#d9c7a0', '#c98f8a', '#3a2c26', '#efe6cf'] },
  folk: { colors: ['#d21f2b', '#f2f0e6', '#17181c', '#1f8f4d', '#1d4fb8', '#f5c21b', '#e2409a', '#f07a1a', '#18a7b5', '#7a2c8f'] },
  redwork: { colors: ['#a80f1b', '#7d0f18', '#cf4a52'], mono: true, dark: ['#e8343f', '#f08088', '#fbe9e4'] },
  blackwork: { colors: ['#18171a', '#4b4850', '#77747c'], mono: true, accent: '#c79a2e', dark: ['#f2f0ea', '#b9b7c0', '#8a8892'] },
  delft: { colors: ['#0f2057', '#1f3f93', '#3f6fc0', '#7ea4dc', '#bcd0ee', '#f4f3ec'] },
  pastel: { colors: ['#f3b6c4', '#b7e0c7', '#f6e9a6', '#c9b8e6', '#a9d2f0', '#f7c9a8', '#b9bcc4', '#fbf8f0', '#8fa0b8', '#e48fa6', '#6f7f98'] },
  wool: { colors: ['#4d5a2a', '#9a3f1f', '#c9962b', '#1f5c63', '#5a2a4a', '#e2d3ad', '#4a3222', '#23402c', '#b56a3a', '#8a9a6a', '#2a2a33'] },
  neon: { colors: ['#ff2fa0', '#39ff6a', '#22e6ff', '#fff12e', '#ff7a1a', '#a64dff', '#ffffff', '#2b2bd6'] },
};

const LETTERS = [
  '010101111101101', '110101110101110', '011100100100011', '110101101101110', '111100110100111', '111100110100100',
  '011100101101011', '101101111101101', '111010010010111', '001001001101010', '101101110101101', '100100100100111',
  '101111111101101', '110101101101101', '010101101101010', '110101110100100',
];

export default defineLook({
  questions: {
    stitch: choice('Which stitch makes the picture?', {
      cross: 'Counted cross-stitch: every square of the cloth holds one neat X of floss.',
      tent: 'Tent stitch needlepoint: fat slanting half-stitches packed tight, a dense woollen tapestry.',
      mixed: 'Full crosses for the subjects and shadows, airy single half-stitches for ground and distance.',
      gobelin: 'Upright gobelin: straight vertical stitches laid in bricked rows, like a woven chair seat.',
      satin: 'Free embroidery: long glossy satin stitches that follow the direction of each surface.',
      knots: 'French knots: every square a small raised bead of thread, like candlewick or a rag rug.',
    }),
    palette: choice('Which floss is in the workbox?', {
      matched: "Skeins matched to the picture's own colours, a faithful needle-painting.",
      sampler: 'Antique sampler shades: brick red, indigo, olive, ochre, walnut and faded rose.',
      folk: 'Bright folk embroidery: scarlet, emerald, cobalt, sunflower and magenta with black and white.',
      redwork: 'Redwork: a single turkey-red thread, with tone carried by how densely it is stitched.',
      blackwork: 'Blackwork: black silk with a touch of gold, severe and Tudor.',
      delft: 'Blue and white only, like Delft tiles or willow-pattern china.',
      pastel: 'Nursery pastels: baby pink, mint, lemon, lilac and sky.',
      wool: 'Tapestry wools: moss, rust, mustard, teal and plum, a seventies cushion.',
      neon: 'Fluorescent floss: hot pink, acid green and electric cyan, modern and cheeky.',
    }),
    colours: score('How many colours of floss does the pattern call for?', [
      'Three or four skeins',
      'A small handful',
      'A dozen',
      'A full shaded chart of twenty',
    ]),
    count: score('How fine is the count of the cloth?', [
      'Big chunky squares, a beginner kit',
      'Coarse',
      'Standard 14-count',
      'Fine',
      'Tiny petit point, hundreds of stitches across',
    ]),
    thread: score('How thick is the thread?', [
      'A single fine strand, the cloth showing through',
      'Two strands',
      'Full and covering',
      'Plump wool that hides the cloth',
    ]),
    fabric: choice('What cloth is it worked on?', {
      white: 'Crisp white aida, a grid of tiny holes.',
      ecru: 'Warm cream aida, soft and old-fashioned.',
      linen: 'Raw natural linen, uneven slubby threads the colour of oatmeal.',
      black: 'Black aida, so the colours glow like a night scene.',
      dyed: 'Hand-dyed cloth, mottled dusty colour.',
      canvas: 'Stiff open-mesh needlepoint canvas, holes showing wherever it is left bare.',
    }),
    coverage: choice('How much of the cloth has been stitched?', {
      full: 'Every square is filled, sky and all: a solid stitched picture.',
      motif: 'Only the subjects and their cast shadows are stitched; the empty background is left as bare cloth.',
      linework: 'A line drawing in thread: backstitched outlines, with only the deepest shadows filled by sparse half-stitches.',
      voided: 'Assisi work: the background is stitched solid and the subjects are left as bare outlined cloth.',
      unfinished: 'A work in progress: part is stitched, the rest still shows the printed pattern, and the needle is parked mid-row.',
    }),
    outline: score('How much backstitch outlining is drawn over the stitching?', [
      'None: colour blocks only',
      'A fine outline round each subject',
      'Outlines and inner edges',
      'Heavy dark outlining everywhere, like a colouring book',
    ]),
    finish: choice('How is the piece presented?', {
      flat: 'The cloth fills the whole view, seen close.',
      hoop: 'Stretched in a round wooden embroidery hoop, spare cloth gathering beyond it.',
      sampler: 'A sampler: a stitched zigzag border and a row of alphabet above the picture.',
      swatch: 'A cut piece of cloth with frayed edges, lying on a dark wooden table.',
    }),
  },

  async apply(capture, a, context, signal) {
    const { size, color, normal, identity, diffuse, depth } = capture;
    const mood = context.mood;
    const seed = context.seed | 0;
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const h2 = (x: number, y: number, k = 0) => {
      let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((seed + k) | 0, 1274126177);
      h = Math.imul(h ^ (h >>> 13), 1103515245);
      h = Math.imul(h ^ (h >>> 15), 2246822519);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const vnoise = (x: number, y: number, k = 0) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const fx = x - xi, fy = y - yi;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      return mix(mix(h2(xi, yi, k), h2(xi + 1, yi, k), u), mix(h2(xi, yi + 1, k), h2(xi + 1, yi + 1, k), u), v);
    };

    // ── the grid ────────────────────────────────────────────────────────────
    const satin = a.stitch === 'satin';
    const s = satin ? Math.round(mix(8, 4, a.count)) : Math.round(mix(15, 5, a.count));
    const G = Math.floor(size / s);
    const ox = Math.floor((size - G * s) / 2), oy = ox;
    const N = G * G;

    // light, for thread relief and cast shadows
    let lx = capture.light[0], ly = capture.light[1];
    const ll = Math.hypot(lx, ly);
    if (ll < 0.05) { lx = -0.6; ly = -0.6; } else { lx /= ll; ly /= ll; }
    const LX = lx * 0.62, LY = ly * 0.62, LZ = 0.785;

    // depth: find which end of the packed RGBA is the significant one
    let roughR = 0, roughA = 0;
    for (let i = 0; i < size * size - 1; i += 37) {
      roughR += Math.abs(depth[i * 4] - depth[i * 4 + 4]);
      roughA += Math.abs(depth[i * 4 + 3] - depth[i * 4 + 7]);
    }
    const dHi = roughR <= roughA ? 0 : 3, dLo = dHi === 0 ? 1 : 2;

    const cx = size / 2, cy = size / 2;
    const Rin = size * 0.432, Rout = Rin + size * 0.034;
    const M = Math.round(size * 0.075);
    const b = Math.max(1, Math.round(G / 58)); // sampler border is drawn in blocks of b squares
    const Gs = Math.floor(G / b);
    const voided = a.coverage === 'voided';
    // the whole frame is fitted into whatever part of the cloth the presentation leaves for it
    let zoom = 1, pcx = cx, pcy = cy;
    if (a.finish === 'hoop') zoom = (size * 0.47) / (Rin - Math.max(10, s * 1.3));
    else if (a.finish === 'swatch') zoom = (size * 0.92) / (size - 2 * (M + Math.max(14, s * 1.6)));
    else if (a.finish === 'sampler') {
      zoom = (size * 0.86) / ((Gs - 16) * b * s);
      pcx = ox + (Gs / 2) * b * s;
      pcy = oy + ((15 + Gs - 8) / 2) * b * s;
    }
    const span = Math.max(1, Math.round(s * zoom));
    const edge = (v: number) => Math.max(0, Math.min(size - 1, v));

    // ── read each square of the cloth ───────────────────────────────────────
    const cid = new Uint8Array(N);
    const cr = new Float32Array(N), cg = new Float32Array(N), cb = new Float32Array(N);
    const cdif = new Float32Array(N), cnx = new Float32Array(N), cny = new Float32Array(N), cnz = new Float32Array(N);
    const cdep = new Float32Array(N);
    for (let j = 0; j < G; j++) {
      for (let i = 0; i < G; i++) {
        const c = j * G + i;
        const px = Math.round((ox + (i + 0.5) * s - pcx) * zoom + cx - span / 2);
        const py = Math.round((oy + (j + 0.5) * s - pcy) * zoom + cy - span / 2);
        const centre = (edge(py + (span >> 1)) * size + edge(px + (span >> 1))) * 4;
        const id = identity[centre];
        let n = 0, r = 0, g = 0, b = 0, d = 0, nx = 0, ny = 0, nz = 0;
        for (let yy = py; yy < py + span; yy++) {
          const y = edge(yy);
          for (let xx = px; xx < px + span; xx++) {
            const o = (y * size + edge(xx)) * 4;
            if (identity[o] !== id) continue;
            n++; r += color[o]; g += color[o + 1]; b += color[o + 2]; d += diffuse[o];
            nx += normal[o] - 127.5; ny += normal[o + 1] - 127.5; nz += normal[o + 2] - 127.5;
          }
        }
        cid[c] = id;
        cr[c] = r / n; cg[c] = g / n; cb[c] = b / n; cdif[c] = d / n / 255;
        const nl = Math.hypot(nx, ny, nz) || 1;
        cnx[c] = nx / nl; cny[c] = -ny / nl; cnz[c] = nz / nl; // image space: y runs down
        cdep[c] = (depth[centre + dHi] + depth[centre + dLo] / 256) / 255;
      }
    }

    // ── the cloth, and where on it the work sits ────────────────────────────
    const FAB: Record<typeof a.fabric, RGB> = {
      white: hex('#f0eee4'), ecru: hex('#e2d4b4'), linen: hex('#b9a887'), black: hex('#1d1d22'),
      dyed: [mix(132, 214, mood.warmth), mix(158, 160, mood.warmth), mix(178, 146, mood.warmth)],
      canvas: hex('#e4d9bb'),
    };
    const fab = FAB[a.fabric];
    const darkCloth = lumOf(fab) < 0.3;

    const region = new Uint8Array(N); // 1 picture, 2 border ornament
    for (let j = 0; j < G; j++) {
      for (let i = 0; i < G; i++) {
        const c = j * G + i;
        const x = ox + (i + 0.5) * s, y = oy + (j + 0.5) * s;
        if (a.finish === 'hoop') region[c] = Math.hypot(x - cx, y - cy) < Rin - Math.max(10, s * 1.3) ? 1 : 0;
        else if (a.finish === 'swatch') {
          const m = M + Math.max(14, s * 1.6);
          region[c] = x > m && x < size - m && y > m && y < size - m ? 1 : 0;
        } else if (a.finish === 'sampler') {
          const si = Math.floor(i / b), sj = Math.floor(j / b);
          region[c] = si >= 8 && si < Gs - 8 && sj >= 15 && sj < Gs - 8 ? 1 : 0;
        } else region[c] = 1;
      }
    }

    // ── which squares the pattern asks for ──────────────────────────────────
    // the empty background is whatever colour most of the backdrop and ground share
    const labAll = new Float32Array(N * 3);
    const bins = new Map<number, number[]>();
    for (let c = 0; c < N; c++) {
      const [L, A, B] = oklab(cr[c], cg[c], cb[c]);
      labAll[c * 3] = L; labAll[c * 3 + 1] = A; labAll[c * 3 + 2] = B;
      if (!region[c] || cid[c] >= 2) continue;
      const key = Math.floor(L * 14) * 10000 + Math.floor(A * 22 + 50) * 100 + Math.floor(B * 22 + 50);
      const bin = bins.get(key) ?? [0, 0, 0, 0];
      bin[0]++; bin[1] += L; bin[2] += A; bin[3] += B;
      bins.set(key, bin);
    }
    let bg: number[] | null = null;
    for (const bin of bins.values()) if (!bg || bin[0] > bg[0]) bg = bin;
    const bgL = bg ? bg[1] / bg[0] : 2, bgA = bg ? bg[2] / bg[0] : 0, bgB = bg ? bg[3] / bg[0] : 0;
    const bare = (c: number) => cid[c] < 2 && Math.hypot(labAll[c * 3] - bgL, labAll[c * 3 + 1] - bgA, labAll[c * 3 + 2] - bgB) < 0.06;
    const inShadow = (c: number) => cid[c] < 2 && labAll[c * 3] < bgL - 0.09;
    const want = new Uint8Array(N);
    const tones: number[] = [];
    for (let c = 0; c < N; c++) if (region[c] && !bare(c)) tones.push(labAll[c * 3]);
    tones.sort((p, q) => p - q);
    const deep = tones.length ? tones[Math.floor(tones.length * 0.24)] : 0;
    for (let c = 0; c < N; c++) {
      if (!region[c]) continue;
      want[c] =
        a.coverage === 'full' ? 1
        : a.coverage === 'voided' ? (cid[c] < 2 ? 1 : 0)
        : a.coverage === 'linework' ? (!bare(c) && labAll[c * 3] <= deep ? 1 : 0)
        : bare(c) ? 0 : 1;
    }
    const outline = a.coverage === 'linework' || voided ? Math.max(0.8, a.outline) : a.outline;

    // ── choose the floss ────────────────────────────────────────────────────
    const card = a.palette === 'matched' ? null : FLOSS[a.palette];
    const wanted = Math.round(mix(4, 20, a.colours));
    const cpal = new Int16Array(N).fill(-1);
    const half = new Uint8Array(N);
    let pal: RGB[] = [];
    const members: number[] = [];
    for (let c = 0; c < N; c++) if (want[c]) members.push(c);
    const lab = new Float32Array(N * 3);
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const confetti = 0.006 + 0.02 * mood.density;
    for (const c of members) {
      const [L, A, B] = oklab(cr[c], cg[c], cb[c]);
      const i = c % G, j = (c / G) | 0;
      lab[c * 3] = L + (bayer[(j & 3) * 4 + (i & 3)] / 15 - 0.5) * confetti * 2;
      lab[c * 3 + 1] = A; lab[c * 3 + 2] = B;
    }
    const Ls = members.map((c) => lab[c * 3]).sort((p, q) => p - q);
    const Llo = Ls.length ? Ls[Math.floor(Ls.length * 0.04)] : 0;
    const Lhi = Ls.length ? Math.max(Llo + 0.08, Ls[Math.floor(Ls.length * 0.96)]) : 1;

    if (card?.mono) {
      const shades = Math.max(1, Math.min(3, Math.round(wanted / 6)));
      pal = (darkCloth && card.dark ? card.dark : card.colors).slice(0, shades).map(hex);
      const accent = card.accent ? pal.push(hex(card.accent)) - 1 : -1;
      const chroma = members.map((c) => Math.hypot(lab[c * 3 + 1], lab[c * 3 + 2])).sort((p, q) => p - q);
      const vivid = chroma.length ? Math.max(0.07, chroma[Math.floor(chroma.length * 0.86)]) : 1;
      for (const c of members) {
        const tone = clamp01((lab[c * 3] - Llo) / (Lhi - Llo));
        const ink = voided ? 0.56 + 0.44 * (darkCloth ? tone : 1 - tone) : darkCloth ? tone : 1 - tone;
        if (accent >= 0 && cid[c] >= 2 && Math.hypot(lab[c * 3 + 1], lab[c * 3 + 2]) > vivid && lab[c * 3 + 2] > 0) {
          cpal[c] = accent;
          continue;
        }
        if (ink < 0.28) continue; // left as bare cloth
        if (ink < 0.5) half[c] = 1;
        cpal[c] = Math.min(shades - 1, Math.floor((1 - smooth(0.5, 1, ink)) * shades * 0.999));
      }
    } else if (card) {
      const full = card.colors.map(hex);
      const fl = full.map((c) => oklab(c[0], c[1], c[2]));
      const pLo = Math.min(...fl.map((c) => c[0])), pHi = Math.max(...fl.map((c) => c[0]));
      const pChroma = fl.reduce((sum, c) => sum + Math.hypot(c[1], c[2]), 0) / fl.length;
      let iChroma = 0;
      for (const c of members) iChroma += Math.hypot(lab[c * 3 + 1], lab[c * 3 + 2]);
      iChroma = iChroma / Math.max(1, members.length) + 0.01;
      const gain = Math.max(0.7, Math.min(2.4, pChroma / iChroma));
      for (const c of members) {
        const t = (lab[c * 3] - Llo) / (Lhi - Llo);
        lab[c * 3] = mix(lab[c * 3], pLo + clamp01(t) * (pHi - pLo), 0.75);
        lab[c * 3 + 1] *= gain; lab[c * 3 + 2] *= gain;
      }
      const assign = (allowed: number[]) => {
        const counts = new Array<number>(full.length).fill(0);
        for (const c of members) {
          let best = 0, bd = 1e9;
          for (const k of allowed) {
            const dL = lab[c * 3] - fl[k][0], dA = lab[c * 3 + 1] - fl[k][1], dB = lab[c * 3 + 2] - fl[k][2];
            const d = dL * dL * 1.6 + dA * dA + dB * dB;
            if (d < bd) { bd = d; best = k; }
          }
          cpal[c] = best; counts[best]++;
        }
        return counts;
      };
      // a voided ground must stand off the cloth, or the bare figures vanish into it
      const strong = full.map((_, k) => k).filter((k) => Math.abs(lumOf(full[k]) - lumOf(fab)) > 0.3);
      const all = voided && strong.length >= 2 ? strong : full.map((_, k) => k);
      const counts = assign(all);
      const keep = all.sort((p, q) => counts[q] - counts[p]).slice(0, Math.max(3, Math.min(full.length, wanted)));
      assign(keep);
      pal = full;
    } else {
      // k-means over the squares, seeded far apart
      const k = Math.min(wanted, Math.max(1, members.length));
      const cen: number[][] = [];
      if (members.length) {
        const first = members[Math.floor(context.random() * members.length)];
        cen.push([lab[first * 3], lab[first * 3 + 1], lab[first * 3 + 2]]);
        const far = new Float32Array(members.length).fill(1e9);
        while (cen.length < k) {
          const last = cen[cen.length - 1];
          let pick = 0, top = -1;
          for (let m = 0; m < members.length; m++) {
            const c = members[m];
            const d = (lab[c * 3] - last[0]) ** 2 + (lab[c * 3 + 1] - last[1]) ** 2 * 2 + (lab[c * 3 + 2] - last[2]) ** 2 * 2;
            if (d < far[m]) far[m] = d;
            const w = far[m] * (0.6 + 0.4 * h2(c, cen.length, 5));
            if (w > top) { top = w; pick = m; }
          }
          const c = members[pick];
          cen.push([lab[c * 3], lab[c * 3 + 1], lab[c * 3 + 2]]);
        }
        const sums = cen.map(() => [0, 0, 0, 0, 0, 0, 0]);
        for (let round = 0; round < 7; round++) {
          for (const sum of sums) sum.fill(0);
          for (const c of members) {
            let best = 0, bd = 1e9;
            for (let q = 0; q < cen.length; q++) {
              const d = (lab[c * 3] - cen[q][0]) ** 2 + (lab[c * 3 + 1] - cen[q][1]) ** 2 * 2 + (lab[c * 3 + 2] - cen[q][2]) ** 2 * 2;
              if (d < bd) { bd = d; best = q; }
            }
            cpal[c] = best;
            const sum = sums[best];
            const w = cid[c] >= 2 ? 3 : 1; // small subjects still earn their own skeins
            sum[0] += lab[c * 3] * w; sum[1] += lab[c * 3 + 1] * w; sum[2] += lab[c * 3 + 2] * w;
            sum[3] += cr[c] * w; sum[4] += cg[c] * w; sum[5] += cb[c] * w; sum[6] += w;
          }
          for (let q = 0; q < cen.length; q++) if (sums[q][6]) cen[q] = [sums[q][0] / sums[q][6], sums[q][1] / sums[q][6], sums[q][2] / sums[q][6]];
          if (round % 3 === 0) await pause();
        }
        const sat = mix(1, 1.35, mood.cheer);
        const punch = Math.max(1, Math.min(1.5, 0.5 / (Lhi - Llo)));
        const pivot = Math.pow((Llo + Lhi) / 2, 3) * 255;
        pal = sums.map((sum) => {
          const n = Math.max(1, sum[6]);
          const c: RGB = [sum[3] / n, sum[4] / n, sum[5] / n];
          const l = lumOf(c) * 255;
          return c.map((v) => Math.max(0, Math.min(255, pivot + (l + (v - l) * sat - pivot) * punch))) as RGB;
        });
        if (voided) {
          // Assisi grounds are one strong colour: borrow the hero's, shaded by the light
          const hero = capture.baseColors[2] ?? [150, 40, 40];
          const hl = Math.max(0.08, lumOf(hero));
          const target = darkCloth ? 0.62 : 0.26;
          pal = pal.map((p) => {
            const k = (target / hl) * (0.75 + 0.5 * lumOf(p));
            return [0, 1, 2].map((q) => Math.max(0, Math.min(255, mix(p[q] * (darkCloth ? 1.2 : 0.55), hero[q] * k, 0.7)))) as RGB;
          });
        }
      }
    }
    if (!pal.length) pal = [hex('#7a2e2a')];

    // stitch type per square
    if (a.stitch === 'mixed' && !voided) for (const c of members) if (cid[c] < 2 && !inShadow(c)) half[c] = 1;
    if (a.coverage === 'linework') for (const c of members) half[c] = 1;

    // ── how far the work has got ────────────────────────────────────────────
    const done = new Uint8Array(N);
    const used = new Array<number>(pal.length).fill(0);
    for (let c = 0; c < N; c++) if (cpal[c] >= 0) used[cpal[c]]++;
    const order = used.map((n, k) => [n, k]).filter((e) => e[0] > 0).sort((p, q) => p[0] - q[0]);
    const pending = new Set<number>();
    let frontier = 2;
    if (a.coverage === 'unfinished') {
      frontier = 0.42 + context.random() * 0.22;
      const skip = order.length > 4 ? 1 + Math.floor(context.random() * 2) : 0;
      for (let q = 0; q < skip; q++) pending.add(order[1 + q * 2]?.[1] ?? -1);
    }
    const holes = smooth(0.45, 1, mood.wear) * 0.07;
    for (let c = 0; c < N; c++) {
      if (cpal[c] < 0) continue;
      const i = c % G, j = (c / G) | 0;
      if (a.coverage === 'unfinished') {
        const f = (i * 0.55 + j * 0.45) / G + (vnoise(i * 7 / G, j * 7 / G, 11) - 0.5) * 0.55;
        if (f > frontier || pending.has(cpal[c])) continue;
      }
      if (holes > 0.004 && h2(i, j, 21) < holes * smooth(0.55, 0.8, vnoise(i * 6 / G, j * 6 / G, 23)) * 2.5) continue;
      done[c] = 1;
    }

    // sampler ornament: border bands and an alphabet row, in the two strongest flosses
    if (a.finish === 'sampler') {
      let hi = order.length ? order[order.length - 1][1] : 0, lo = hi, hc = -1, dl = 9;
      for (const [, k] of order) {
        const p = pal[k];
        const contrast = Math.abs(lumOf(p) - lumOf(fab));
        const chroma = (Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2])) / 255;
        if (contrast > 0.18 && chroma + contrast * 0.3 > hc) { hc = chroma + contrast * 0.3; hi = k; }
        const l = darkCloth ? -lumOf(p) : lumOf(p);
        if (l < dl) { dl = l; lo = k; }
      }
      if (hi === lo && order.length > 1) hi = order[order.length - 1][1] === lo ? order[order.length - 2][1] : order[order.length - 1][1];
      const fits = Math.floor((Gs - 16 + 1) / 4);
      const start = Math.floor((Gs - (fits * 4 - 1)) / 2);
      for (let j = 0; j < Gs * b; j++) {
        for (let i = 0; i < Gs * b; i++) {
          const si = Math.floor(i / b), sj = Math.floor(j / b);
          const k = Math.min(si, sj, Gs - 1 - si, Gs - 1 - sj);
          const along = k === si || k === Gs - 1 - si ? sj : si;
          let put = -1;
          if (k === 1 || k === 6) put = lo;
          else if (k >= 2 && k <= 4) {
            const tri = Math.abs((along % 4) - 2);
            if (tri === k - 2) put = hi;
            else if (k === 3 && along % 4 === 0) put = lo;
          } else if (sj >= 8 && sj <= 12 && si >= start && si < start + fits * 4) {
            const col = (si - start) % 4, letter = Math.floor((si - start) / 4) % LETTERS.length;
            if (col < 3 && LETTERS[letter][(sj - 8) * 3 + col] === '1') put = letter % 3 === 1 ? hi : lo;
          }
          if (put >= 0 && i < G && j < G) {
            const c = j * G + i;
            cpal[c] = put; done[c] = 1; region[c] = 2; half[c] = 0;
          }
        }
      }
    }

    // ── weave the cloth ─────────────────────────────────────────────────────
    const out = new Float32Array(size * size * 3);
    const tp = Math.max(2, satin ? 3 : s / 2); // linen thread pitch
    const lift = darkCloth ? 70 : 0;
    const dyeBlotch = a.fabric === 'dyed' ? 1 : 0;
    for (let y = 0; y < size; y++) {
      if (y % 120 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = (y * size + x) * 3;
        const u = (x - ox) / s, v = (y - oy) / s;
        const fu = u - Math.floor(u), fv = v - Math.floor(v);
        let m = 1, r = fab[0], g = fab[1], bl = fab[2];
        if (a.fabric === 'linen') {
          const tx = Math.floor((x - ox) / tp), ty = Math.floor((y - oy) / tp);
          const wx = (x - ox) / tp - tx, wy = (y - oy) / tp - ty;
          const over = (tx + ty) & 1;
          const fat = over ? 0.75 + h2(ty, 3, 31) * 0.6 : 0.75 + h2(tx, 7, 33) * 0.6;
          const across = over ? wy : wx;
          const prof = Math.sin(Math.PI * across);
          m = 0.74 + 0.3 * Math.pow(prof, 1 / fat) + ((over ? h2(ty, 1, 35) : h2(tx, 2, 37)) - 0.5) * 0.14;
          const fleck = h2(Math.floor(x / 5), y, 39);
          if (fleck > 0.985) m *= 0.8;
        } else if (a.fabric === 'canvas') {
          const dx = Math.min(fu, 1 - fu) * s, dy = Math.min(fv, 1 - fv) * s;
          const tw = Math.max(1.1, s * 0.2);
          const onV = dx < tw, onH = dy < tw;
          if (!onV && !onH) { r = 96; g = 82; bl = 62; m = 0.9; }
          else {
            const q = (onV && onH ? ((Math.floor(u + 0.5) + Math.floor(v + 0.5)) & 1 ? dx : dy) : onV ? dx : dy) / tw;
            m = 0.8 + 0.25 * Math.sqrt(Math.max(0, 1 - q * q));
          }
        } else {
          // aida: woven blocks with a hole at every corner
          const sub = 3;
          const iu = Math.floor(fu * sub), iv = Math.floor(fv * sub);
          const wu = fu * sub - iu, wv = fv * sub - iv;
          const prof = ((iu + iv) & 1) ? Math.sin(Math.PI * wv) : Math.sin(Math.PI * wu);
          m = 0.9 + 0.11 * prof;
          const edge = Math.min(fu, 1 - fu, fv, 1 - fv) * s;
          m *= 0.93 + 0.07 * smooth(0, 1.2, edge);
          const hole = Math.hypot(Math.min(fu, 1 - fu), Math.min(fv, 1 - fv)) * s;
          m *= mix(0.5, 1, smooth(Math.max(0.5, s * 0.07), Math.max(1.4, s * 0.2), hole));
        }
        if (dyeBlotch) {
          const t = vnoise(x / 70, y / 70, 41) * 0.65 + vnoise(x / 23, y / 23, 43) * 0.35;
          m *= 0.92 + 0.15 * t;
          r += (t - 0.5) * 16; bl -= (t - 0.5) * 14;
        }
        m *= 0.965 + 0.07 * vnoise(x / 160, y / 160, 45); // the cloth never lies quite flat
        const add = lift * (m - 0.82);
        out[o] = r * m + add; out[o + 1] = g * m + add; out[o + 2] = bl * m + add * 1.05;
      }
    }

    // ── drawing with thread ─────────────────────────────────────────────────
    const fade = mood.wear * 0.34;
    const dust: RGB = [mix(fab[0], 190, 0.6), mix(fab[1], 176, 0.6), mix(fab[2], 150, 0.6)];
    const shOff = Math.max(1, s * 0.13);
    const shx = -lx * shOff, shy = -ly * shOff;
    const shadowK = darkCloth ? 0.2 : 0.34;
    const thread = (x0: number, y0: number, x1: number, y1: number, r: number, c: readonly number[], sheen: number, tone = 1) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 0.01) return;
      const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      const pad = r + 2.5 + shOff;
      const xa = Math.max(0, Math.floor(Math.min(x0, x1) - pad)), xb = Math.min(size - 1, Math.ceil(Math.max(x0, x1) + pad));
      const ya = Math.max(0, Math.floor(Math.min(y0, y1) - pad)), yb = Math.min(size - 1, Math.ceil(Math.max(y0, y1) + pad));
      const st = shx * ux + shy * uy, sq = shy * ux - shx * uy;
      const twist = Math.PI / Math.max(1.6, r * 1.5);
      const reach = r + 1;
      for (let y = ya; y <= yb; y++) {
        for (let x = xa; x <= xb; x++) {
          const ax = x + 0.5 - x0, ay = y + 0.5 - y0;
          const t = ax * ux + ay * uy, q = ay * ux - ax * uy;
          const o = (y * size + x) * 3;
          // the cast shadow first, so the thread lies over it
          const t2 = t - st, q2 = q - sq;
          if (q2 < reach && q2 > -reach) {
            const e2 = t2 < 0 ? -t2 : t2 > len ? t2 - len : 0;
            const sh = (reach - Math.sqrt(e2 * e2 + q2 * q2)) / 1.6;
            if (sh > 0) {
              const k = 1 - shadowK * (sh > 1 ? 1 : sh);
              out[o] *= k; out[o + 1] *= k; out[o + 2] *= k;
            }
          }
          if (q > reach || q < -reach) continue;
          const tc = t < 0 ? 0 : t > len ? len : t;
          let al = r + 0.5 - Math.sqrt((t - tc) * (t - tc) + q * q);
          if (al <= 0) continue;
          if (al > 1) al = 1;
          const qn = Math.max(-1, Math.min(1, q / r));
          const e = (tc / len) * 2 - 1;
          const nx = -uy * qn * 0.9 + ux * e * 0.3, ny = ux * qn * 0.9 + uy * e * 0.3;
          const nz = Math.sqrt(Math.max(0.05, 1 - qn * qn * 0.85));
          const ndl = Math.max(0, (nx * LX + ny * LY + nz * LZ) / Math.sqrt(nx * nx + ny * ny + nz * nz));
          const ends = clamp01(Math.min(tc, len - tc) / (r * 1.5));
          const shade = ((0.5 + 0.6 * ndl) * (0.74 + 0.26 * ends) + Math.sin((t * 0.8 + q * 1.4) * twist) * 0.06) * tone;
          const n4 = ndl * ndl * ndl * ndl;
          const spec = sheen * n4 * n4 * n4 * n4 * 110;
          out[o] += (c[0] * shade + spec - out[o]) * al;
          out[o + 1] += (c[1] * shade + spec - out[o + 1]) * al;
          out[o + 2] += (c[2] * shade + spec - out[o + 2]) * al;
        }
      }
    };
    const knot = (kx: number, ky: number, R: number, c: readonly number[], tone: number) => {
      const xa = Math.max(0, Math.floor(kx - R - 3)), xb = Math.min(size - 1, Math.ceil(kx + R + 3));
      const ya = Math.max(0, Math.floor(ky - R - 3)), yb = Math.min(size - 1, Math.ceil(ky + R + 3));
      for (let pass = 0; pass < 2; pass++) {
        for (let y = ya; y <= yb; y++) {
          for (let x = xa; x <= xb; x++) {
            const ax = x + 0.5 - kx - (pass ? 0 : shx * 1.4), ay = y + 0.5 - ky - (pass ? 0 : shy * 1.4);
            const d = Math.hypot(ax, ay);
            const o = (y * size + x) * 3;
            if (!pass) {
              const al = clamp01((R + 1 - d) / 1.6);
              if (al > 0) { const k = 1 - shadowK * 1.2 * al; out[o] *= k; out[o + 1] *= k; out[o + 2] *= k; }
              continue;
            }
            const al = clamp01(R + 0.5 - d);
            if (al <= 0) continue;
            const q = Math.min(1, d / R);
            const nz = Math.sqrt(Math.max(0.04, 1 - q * q * 0.9));
            const ndl = Math.max(0, ((ax / (d || 1)) * q * LX + (ay / (d || 1)) * q * LY) * 0.95 + nz * LZ);
            const coil = Math.sin(Math.atan2(ay, ax) * 2 + q * 5.5 + kx) * 0.09 * q;
            const shade = (0.46 + 0.66 * ndl + coil) * tone;
            out[o] += (c[0] * shade - out[o]) * al;
            out[o + 1] += (c[1] * shade - out[o + 1]) * al;
            out[o + 2] += (c[2] * shade - out[o + 2]) * al;
          }
        }
      }
    };
    const ink = (x0: number, y0: number, x1: number, y1: number, r: number, c: readonly number[], alpha: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0) || 1;
      const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      const xa = Math.max(0, Math.floor(Math.min(x0, x1) - r - 1)), xb = Math.min(size - 1, Math.ceil(Math.max(x0, x1) + r + 1));
      const ya = Math.max(0, Math.floor(Math.min(y0, y1) - r - 1)), yb = Math.min(size - 1, Math.ceil(Math.max(y0, y1) + r + 1));
      for (let y = ya; y <= yb; y++) {
        for (let x = xa; x <= xb; x++) {
          const ax = x + 0.5 - x0, ay = y + 0.5 - y0;
          const t = ax * ux + ay * uy, q = ay * ux - ax * uy;
          const tc = t < 0 ? 0 : t > len ? len : t;
          const al = clamp01(r + 0.5 - Math.hypot(t - tc, q)) * alpha;
          if (al <= 0) continue;
          const o = (y * size + x) * 3;
          out[o] += (c[0] - out[o]) * al; out[o + 1] += (c[1] - out[o + 1]) * al; out[o + 2] += (c[2] - out[o + 2]) * al;
        }
      }
    };
    const floss = (c: number): RGB => {
      const p = pal[cpal[c]];
      const i = c % G, j = (c / G) | 0;
      const f = fade * (0.55 + 0.9 * vnoise(i * 5 / G, j * 5 / G, 51));
      return [mix(p[0], dust[0], f), mix(p[1], dust[1], f), mix(p[2], dust[2], f)];
    };
    const toneOf = (c: number) => 0.95 + h2(c, 3, 53) * 0.1;

    // the printed pattern, where the needle has not been yet
    if (a.coverage === 'unfinished') {
      const stamp = darkCloth ? [190, 205, 255] : [92, 122, 200];
      for (let c = 0; c < N; c++) {
        if (cpal[c] < 0 || done[c] || region[c] !== 1) continue;
        const x = ox + (c % G) * s, y = oy + ((c / G) | 0) * s;
        const p = pal[cpal[c]];
        const tint = [mix(stamp[0], p[0], 0.45), mix(stamp[1], p[1], 0.45), mix(stamp[2], p[2], 0.45)];
        const e = s * 0.22;
        const w = Math.max(0.35, s * 0.05);
        ink(x + e, y + e, x + s - e, y + s - e, w, tint, 0.55);
        ink(x + e, y + s - e, x + s - e, y + e, w, tint, 0.55);
      }
    }

    const hand = s * (0.02 + 0.07 * mood.energy);
    const jit = (c: number, k: number) => (h2(c, k, 61) - 0.5) * 2 * hand;
    let drawn = 0;
    const tick = async () => { if (++drawn % 3000 === 0) await pause(); };
    const sheen = satin ? 0.5 : a.stitch === 'tent' || a.stitch === 'gobelin' ? 0.08 : 0.2;

    if (a.stitch === 'cross' || a.stitch === 'mixed' || a.stitch === 'tent') {
      const tent = a.stitch === 'tent';
      const r = Math.max(0.75, s * (tent ? mix(0.2, 0.36, a.thread) : mix(0.12, 0.25, a.thread)));
      const inset = tent ? s * 0.04 : s * 0.12;
      for (let pass = tent ? 1 : 0; pass < 2; pass++) {
        for (let c = 0; c < N; c++) {
          if (!done[c]) continue;
          if (!pass && half[c]) continue;
          const x = ox + (c % G) * s, y = oy + ((c / G) | 0) * s;
          const col = floss(c);
          if (!pass) thread(x + inset + jit(c, 1), y + inset + jit(c, 2), x + s - inset + jit(c, 3), y + s - inset + jit(c, 4), r, col, sheen, toneOf(c) * 0.94);
          else thread(x + inset + jit(c, 5), y + s - inset + jit(c, 6), x + s - inset + jit(c, 7), y + inset + jit(c, 8), r, col, sheen, toneOf(c));
          await tick();
        }
      }
    } else if (a.stitch === 'knots') {
      const R = Math.max(1.3, s * mix(0.37, 0.5, a.thread));
      for (let c = 0; c < N; c++) {
        if (!done[c]) continue;
        const x = ox + (c % G + 0.5) * s, y = oy + (((c / G) | 0) + 0.5) * s;
        knot(x + jit(c, 1) * 2, y + jit(c, 2) * 2, R * (half[c] ? 0.7 : 1) * (0.9 + h2(c, 9, 63) * 0.2), floss(c), toneOf(c));
        await tick();
      }
    } else if (a.stitch === 'gobelin') {
      const r = Math.max(0.9, s * mix(0.26, 0.47, a.thread));
      for (let i = 0; i < G; i++) {
        for (let j = -(i & 1); j < G; j += 2) {
          const top = Math.max(0, j), bottom = Math.min(G - 1, j + 1);
          const cTop = top * G + i, cBot = bottom * G + i;
          const c = done[cBot] ? cBot : cTop;
          if (!done[c]) continue;
          const y0 = oy + (done[cTop] ? top : bottom) * s + s * 0.1, y1 = oy + (done[cBot] ? bottom + 1 : top + 1) * s - s * 0.1;
          const x = ox + (i + 0.5) * s;
          thread(x + jit(c, 1), y0, x + jit(c, 2), y1, r, floss(c), sheen, toneOf(c));
          await tick();
        }
      }
    } else {
      // satin: long stitches laid along each surface
      const r = Math.max(0.8, s * mix(0.15, 0.3, a.thread));
      const reach = s * mix(3.4, 5.2, a.thread) * 0.5;
      const cellAt = (x: number, y: number) => {
        const i = Math.floor((x - ox) / s), j = Math.floor((y - oy) / s);
        return i < 0 || j < 0 || i >= G || j >= G ? -1 : j * G + i;
      };
      const stride = 7919 % N === 0 ? 7907 : 7919;
      for (let n = 0, c = 0; n < N; n++, c = (c + stride) % N) {
        if (!done[c]) continue;
        const flat = Math.hypot(cnx[c], cny[c]);
        let ang = flat > 0.16 ? Math.atan2(-cnx[c], cny[c]) : h2(cid[c], cpal[c], 71) * Math.PI;
        ang += (h2(c, 5, 73) - 0.5) * (0.06 + 0.22 * mood.energy);
        const ux = Math.cos(ang), uy = Math.sin(ang);
        const mx = ox + (c % G + 0.5) * s + (h2(c, 1, 75) - 0.5) * s, my = oy + (((c / G) | 0) + 0.5) * s + (h2(c, 2, 77) - 0.5) * s;
        const want2 = reach * (0.7 + h2(c, 3, 79) * 0.6);
        const ends = [0, 0];
        for (let side = 0; side < 2; side++) {
          const dir = side ? 1 : -1;
          let t = 0;
          while (t < want2) {
            const k = cellAt(mx + ux * dir * (t + s * 0.5), my + uy * dir * (t + s * 0.5));
            if (k < 0 || !done[k] || cid[k] !== cid[c] || (cpal[k] !== cpal[c] && t > s * 0.9)) break;
            t += s * 0.5;
          }
          ends[side] = Math.max(s * 0.45, Math.min(want2, t));
        }
        thread(mx - ux * ends[0], my - uy * ends[0], mx + ux * ends[1], my + uy * ends[1], r, floss(c), sheen, toneOf(c) * (0.9 + cdif[c] * 0.15));
        await tick();
      }
    }

    // ── backstitch outlines along the edges of things ───────────────────────
    if (outline > 0.12) {
      const creases = outline > 0.45, folds = outline > 0.75;
      const differ = (p: number, q: number) => {
        if (!region[p] || !region[q] || region[p] === 2 || region[q] === 2) return false;
        if (!done[p] && !done[q] && a.coverage !== 'linework' && !voided) return false;
        if (a.coverage === 'unfinished' && (!done[p] || !done[q]) && (cpal[p] >= 0 && cpal[q] >= 0)) return false;
        if (cid[p] !== cid[q]) return true;
        if (cid[p] < 1) return false;
        if (creases && Math.abs(cdep[p] - cdep[q]) > 0.02 + cdep[p] * 0.03) return true;
        return folds && cnx[p] * cnx[q] + cny[p] * cny[q] + cnz[p] * cnz[q] < 0.5;
      };
      let line: RGB = darkCloth ? [236, 230, 214] : [38, 30, 30];
      if (card?.mono) line = pal[0];
      else if (!darkCloth && order.length) {
        let darkest = pal[order[0][1]];
        for (const [, k] of order) if (lumOf(pal[k]) < lumOf(darkest)) darkest = pal[k];
        line = [darkest[0] * 0.42 + 8, darkest[1] * 0.4 + 6, darkest[2] * 0.42 + 8];
      }
      const r = Math.max(0.8, Math.min(2.6, s * 0.08 * (0.7 + outline)));
      for (let j = 0; j < G - 1; j++) {
        for (let i = 0; i < G - 1; i++) {
          const p = j * G + i;
          const top = differ(p, p + 1), bottom = differ(p + G, p + G + 1), left = differ(p, p + G), right = differ(p + 1, p + G + 1);
          const n = +top + +bottom + +left + +right;
          if (!n) continue;
          const mx = ox + (i + 1) * s, my = oy + (j + 1) * s, hs = s / 2;
          const pts: [number, number][] = [];
          if (top) pts.push([mx, my - hs]);
          if (right) pts.push([mx + hs, my]);
          if (bottom) pts.push([mx, my + hs]);
          if (left) pts.push([mx - hs, my]);
          const wob = () => (h2(p, pts.length + drawn, 81) - 0.5) * hand;
          if (n === 2) thread(pts[0][0] + wob(), pts[0][1], pts[1][0], pts[1][1] + wob(), r, line, 0.1);
          else for (const pt of pts) thread(pt[0], pt[1], mx, my, r, line, 0.1);
          await tick();
        }
      }
    }

    // ── the needle, parked where the stitcher stopped ───────────────────────
    if (a.coverage === 'unfinished') {
      const edge: number[] = [];
      for (let c = 0; c < N - G - 1; c++) {
        if (!done[c] || region[c] !== 1) continue;
        const i = c % G, j = (c / G) | 0;
        if (i < G * 0.25 || i > G * 0.7 || j < G * 0.25 || j > G * 0.75) continue;
        if ((cpal[c + 1] >= 0 && !done[c + 1]) || (cpal[c + G] >= 0 && !done[c + G])) edge.push(c);
      }
      if (edge.length) {
        const c = edge[Math.floor(context.random() * edge.length)];
        const sx = ox + (c % G + 0.5) * s, sy = oy + (((c / G) | 0) + 0.5) * s;
        const ang = -0.5 + context.random() * 0.9;
        const nl = size * 0.15;
        const ex = sx + size * 0.05, ey = sy + size * 0.06; // the eye
        const tx = ex + Math.cos(ang) * nl, ty = ey + Math.sin(ang) * nl;
        const col = floss(c);
        // thread from the last stitch, through the eye, and a loose tail
        const curve = (x0: number, y0: number, qx: number, qy: number, x1: number, y1: number) => {
          let px = x0, py = y0;
          for (let k = 1; k <= 14; k++) {
            const t = k / 14, it = 1 - t;
            const x = it * it * x0 + 2 * it * t * qx + t * t * x1, y = it * it * y0 + 2 * it * t * qy + t * t * y1;
            thread(px, py, x, y, 1.1, col, 0.2);
            px = x; py = y;
          }
        };
        curve(sx, sy, sx - size * 0.03, sy + size * 0.09, ex, ey);
        curve(ex, ey, ex + size * 0.05, ey + size * 0.07, ex - size * 0.04, ey + size * 0.13);
        const steel = darkCloth ? [206, 210, 216] : [150, 156, 168];
        const steps = 16;
        for (let k = 0; k < steps; k++) {
          const t0 = k / steps, t1 = (k + 1) / steps;
          thread(mix(ex, tx, t0), mix(ey, ty, t0), mix(ex, tx, t1), mix(ey, ty, t1), mix(2.1, 0.5, Math.pow(t0, 1.6)), steel, 1.2, 1.05);
        }
        ink(ex + Math.cos(ang) * 3, ey + Math.sin(ang) * 3, ex + Math.cos(ang) * 10, ey + Math.sin(ang) * 10, 0.5, [40, 40, 46], 0.8);
      }
    }
    await pause();

    // ── how the piece is presented, and what time has done to it ────────────
    const wood = (x: number, y: number, base: RGB, k: number): RGB => {
      const grain = Math.sin(y * 0.55 + vnoise(x / 60, y / 9, k) * 9) * 0.5 + 0.5;
      const m = 0.78 + 0.22 * grain + (vnoise(x / 3, y / 40, k + 1) - 0.5) * 0.12;
      return [base[0] * m, base[1] * m, base[2] * m];
    };
    const table = hex('#3a2a20');
    const fringe = size * 0.03;
    const stainAmount = smooth(0.25, 1, mood.wear);
    const foldX = size * (0.34 + 0.3 * h2(1, 2, 91)), foldY = size * (0.36 + 0.3 * h2(3, 4, 93));
    const final = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      if (y % 120 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = (y * size + x) * 3;
        let r = out[o], g = out[o + 1], bl = out[o + 2];
        let cloth = true;
        if (a.finish === 'swatch') {
          const dxE = Math.min(x - M, size - M - x), dyE = Math.min(y - M, size - M - y);
          const inside = dxE >= 0 && dyE >= 0;
          if (!inside) {
            // pulled threads sticking out beyond the cut edge
            let frayed = false;
            if (dyE >= 0 && dxE < 0) {
              const row = Math.floor(y / tp);
              frayed = -dxE < fringe * (0.25 + 0.75 * h2(row, x < cx ? 1 : 2, 95)) && (y / tp - row) < 0.62;
            } else if (dxE >= 0 && dyE < 0) {
              const col = Math.floor(x / tp);
              frayed = -dyE < fringe * (0.25 + 0.75 * h2(col, y < cy ? 3 : 4, 97)) && (x / tp - col) < 0.62;
            }
            if (!frayed) {
              cloth = false;
              const w = wood(x, y, table, 99);
              // shadow of the cloth on the table
              const sxp = x + lx * 9, syp = y + ly * 9;
              const sd = Math.max(M - sxp, sxp - (size - M), M - syp, syp - (size - M));
              const k = mix(0.5, 1, smooth(-4, 7, sd));
              r = w[0] * k; g = w[1] * k; bl = w[2] * k;
            } else {
              const k = 0.82 + 0.18 * h2(x, y, 101);
              r *= k; g *= k; bl *= k;
            }
          } else {
            const k = 0.9 + 0.1 * smooth(0, fringe * 0.8, Math.min(dxE, dyE));
            r *= k; g *= k; bl *= k;
          }
        } else if (a.finish === 'hoop') {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          const d = Math.hypot(dx, dy);
          if (d > Rout) {
            const angle = Math.atan2(dy, dx);
            const pleat = Math.sin(angle * 17 + vnoise(angle * 2 + 9, 1, 103) * 6) * smooth(Rout, Rout + 90, d);
            const k = 0.84 + 0.045 * pleat;
            r *= k; g *= k; bl *= k;
          }
          const ds = Math.hypot(dx + lx * 9, dy + ly * 9);
          if (ds > Rin - 1 && ds < Rout + 1 && (d < Rin || d > Rout)) {
            const k = 0.66;
            r *= k; g *= k; bl *= k;
          }
          const al = clamp01(Math.min(d - Rin, Rout - d) + 0.5);
          if (al > 0) {
            const q = ((d - Rin) / (Rout - Rin)) * 2 - 1;
            const nz = Math.sqrt(Math.max(0.1, 1 - q * q * 0.8));
            const ndl = Math.max(0, ((dx / d) * q * LX + (dy / d) * q * LY) * 0.9 + nz * LZ);
            const angle = Math.atan2(dy, dx);
            const grain = Math.sin(d * 1.9 + vnoise(angle * 14, d / 30, 105) * 7) * 0.5 + 0.5;
            const m = (0.5 + 0.62 * ndl) * (0.86 + 0.14 * grain);
            r += (203 * m - r) * al; g += (160 * m - g) * al; bl += (104 * m - bl) * al;
          }
          // the brass clamp at the top
          const bx = Math.abs(x - cx), by = y - (cy - Rout - 5);
          if (bx < 19 && Math.abs(by) < 11) {
            const m = 0.75 + 0.3 * Math.cos((by / 11) * 1.4) - (bx < 2.2 ? 0.3 : 0) + (Math.abs(bx - 12) < 3.5 && Math.abs(by) < 7 ? 0.14 : 0);
            r = 196 * m; g = 158 * m; bl = 78 * m;
          }
        }
        if (cloth && stainAmount > 0) {
          const st = smooth(0.56, 0.8, vnoise(x / 110, y / 110, 111) * 0.7 + vnoise(x / 31, y / 31, 113) * 0.3) * stainAmount;
          const ring = smooth(0.5, 0.56, vnoise(x / 110, y / 110, 111) * 0.7 + vnoise(x / 31, y / 31, 113) * 0.3) * (1 - st) * stainAmount * 0.12;
          r *= 1 - st * 0.2 - ring; g *= 1 - st * 0.3 - ring; bl *= 1 - st * 0.46 - ring;
          // creases from years folded in a drawer
          const fx = x - foldX, fy = y - foldY;
          const crease = (Math.abs(fx) < 3 ? (fx < 0 ? 0.07 : -0.09) * (1 - Math.abs(fx) / 3) : 0) + (Math.abs(fy) < 3 ? (fy < 0 ? 0.07 : -0.09) * (1 - Math.abs(fy) / 3) : 0);
          const k = 1 + crease * stainAmount;
          r *= k; g *= k; bl *= k;
        }
        const grain = (h2(x, y, 121) - 0.5) * 7;
        const p = (y * size + x) * 4;
        final[p] = r + grain; final[p + 1] = g + grain; final[p + 2] = bl + grain; final[p + 3] = 255;
      }
    }

    let stitches = 0;
    for (let c = 0; c < N; c++) stitches += done[c];
    const usedNow = new Set<number>();
    for (let c = 0; c < N; c++) if (done[c]) usedNow.add(cpal[c]);
    return {
      pixels: final,
      notes: [
        `${a.stitch} stitch in ${usedNow.size} colours of ${a.palette} floss`,
        `${stitches.toLocaleString('en')} stitches on ${a.fabric} cloth, ${G} squares across`,
        `${a.coverage} coverage, ${a.finish} presentation`,
      ],
    };
  },
});
