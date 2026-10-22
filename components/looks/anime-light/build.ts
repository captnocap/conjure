import { choice, defineLook, score, seeded } from '@conjure/kit';
import {
  type RGB,
  boxBlur,
  clamp01,
  coarse,
  fbm,
  fromHSV,
  gaussian,
  grow,
  hasher,
  hex,
  kuwahara,
  lerp,
  luma,
  mixRGB,
  pause,
  saturate,
  smooth,
  toHSV,
  valueNoise,
} from './raster';
import { type CloudKind, type Palette, type Tradition, paintSky } from './sky';

/**
 * Japanese feature-animation background painting and light. The capture is split the way an
 * animation frame is made: the sky and the set are a painting on board (repainted with its own
 * light, haze, brushwork and fine detail), the things are cels (flattened to a few paints, cut
 * into hard shadow bands from the plain-lit pass, outlined), and the camera department adds the
 * light: god rays from the key light's direction masked by depth, bloom and lens flare.
 */

const P = (zenith: string, mid: string, horizon: string, sun: string, shade: string, cloudLit: string, cloudShade: string, haze: string): Palette => ({
  zenith: hex(zenith), mid: hex(mid), horizon: hex(horizon), sun: hex(sun), shade: hex(shade),
  cloudLit: hex(cloudLit), cloudShade: hex(cloudShade), haze: hex(haze),
});
const SUMMER = P('#1b58c6', '#3f93e8', '#d2f0fb', '#fff4d6', '#9cb0f0', '#fffdf6', '#9fb2dc', '#c8e4f8');
const GOLDEN = P('#3d78bd', '#8fbfd8', '#ffd38a', '#ffcc80', '#9a86b8', '#ffe2b0', '#a291b4', '#ffdcae');
const ROSE = P('#6f86c4', '#eca6ae', '#ffd9b4', '#ffc9ae', '#a894cc', '#ffd6cf', '#a597bf', '#f6cfcb');
const RAIN = P('#2a74a0', '#74bcc6', '#dcf3ea', '#fbfff0', '#8cb2c8', '#fdfefb', '#8d9cae', '#cfe9e6');
const WINTER = P('#5b8ac6', '#9fc2e0', '#e8eef5', '#fffaf2', '#9eaed6', '#fafbff', '#b5bfd8', '#e0e7f2');
const DAWN = P('#5c7fc0', '#c8b4cc', '#ffd2ae', '#ffd8b8', '#a49ccc', '#ffe0cc', '#a8a4c8', '#f0d8d0');
const NIGHT = P('#0e1838', '#22386c', '#4c5f92', '#d6e2ff', '#5a6aa8', '#9aacd8', '#3a4672', '#3c4c7c');
const DUSK = P('#46457a', '#a57d9f', '#ffb784', '#ffa868', '#8a7cb8', '#ffbf96', '#7a6c98', '#c99aa6');
const TINTS = { summer: SUMMER, golden: GOLDEN, rose: ROSE, rain: RAIN, winter: WINTER } as const;

const mixPalette = (a: Palette, b: Palette, t: number): Palette => {
  const out = {} as Palette;
  for (const key of Object.keys(a) as (keyof Palette)[]) out[key] = mixRGB(a[key], b[key], t);
  return out;
};
const mapPalette = (a: Palette, f: (c: RGB, key: keyof Palette) => RGB): Palette => {
  const out = {} as Palette;
  for (const key of Object.keys(a) as (keyof Palette)[]) out[key] = f(a[key], key);
  return out;
};

const LINES = {
  none: 'No outline: shapes separated only by colour and shadow, like a modern digital feature.',
  sepia: 'A fine warm brown line, hand-traced and gentle.',
  self: 'Each shape traced in a darker shade of its own colour, so the line melts into the paint.',
  ink: 'A crisp near-black ink line, graphic and clear.',
} as const;

export default defineLook({
  questions: {
    tradition: choice('Which tradition of animation background painting is this frame from?', {
      luminous:
        'Luminous sky, the 2010s feature where the sky is the hero: crystalline hard-edged cel shadows, shafts of sunlight streaming through the frame, blooming highlights and a saturated blue sky stacked with sunlit cumulus. Summer longing, trains and rooftops, the distance between two people.',
      watercolour:
        'Watercolour background, the 1980s pastoral feature: transparent washes with dried water-mark edges and paper grain over the land and buildings, the characters and things as clean flat cels with one crescent of shadow, white puffy clouds. Countryside, childhood, wind in the grass, gentle wonder.',
      evening:
        'Evening city: a soft violet dusk that glows warm rather than neon, a distant skyline of lit windows, lens flare from the low sun, lamps blooming and amber light along every edge. The walk home, the end of a school day, missing someone, the city switching on its lights.',
    }),
    tint: choice('Which colours does the light paint the frame in?', {
      hour: "The scene's own hour: cerulean at noon, rose at dawn, amber toward dusk, following where the sun sits.",
      summer: 'High summer: hard cerulean, cream-white cloud, a white-gold sun and greens shadowed with blue. Heat, cicadas, a long holiday.',
      golden: 'Golden hour: honey and apricot light, plum shadows, a sky fading from gold up to pale aqua.',
      rose: 'Magic-hour rose: peach-pink light, lilac shadow, a sky of salmon and soft periwinkle.',
      rain: 'Just after rain: rinsed clean air, a cool teal sky, glistening white light and grey cloud breaking apart.',
      winter: 'A clear winter day: silvery pale blue, white light, slate-blue shadows, everything crisp and quiet.',
    }),
    clouds: choice('What is painted in the sky?', {
      clear: 'An unbroken clear sky: only the deep gradient and a single thin contrail ruled across it.',
      puffs: 'Fair-weather puffs: small white flat-bottomed clouds drifting at different heights.',
      towers: 'Towering cumulus: huge sculpted thunderheads stacked up behind the scene, bright on the sun side, blue-grey in their own shade.',
      mackerel: 'A mackerel sky: rows of small rippled cloudlets receding toward the horizon, each lit along its edge.',
      veils: 'High veils of cirrus: long brushed streaks of thin cloud swept across a deep sky.',
    }),
    rays: score('How strongly does light stream through the air?', [
      'Clear air, no visible rays',
      'A faint haze of light',
      'Clear shafts of light',
      'Blazing curtains of light pouring through the frame',
    ]),
    bands: score('How are the shadows on the painted cels cut?', [
      'Softly airbrushed gradients',
      'One clean shadow band',
      'A hard shadow band and a bright highlight',
      'Crystalline: several hard facets of shadow and light with a rim of sun',
    ]),
    bloom: score('How much do the lights and highlights glow?', [
      'Crisp, no glow',
      'A gentle halo on the brightest lights',
      'A soft luminous glow',
      'Dreamlike: the whole frame swims in light',
    ]),
    line: choice('How are the cels outlined?', LINES),
    detail: score('How finely is the background painted?', [
      'Loose broad washes',
      'Simple shapes lightly brushed',
      'Carefully painted with texture',
      'Obsessive detail: every brick, leaf and crack picked out with highlights',
    ]),
    finish: choice('How is the frame finished?', {
      digital: 'A clean digital composite: crisp and bright, a whisper of colour fringing toward the edges.',
      film: 'Shot on film: fine grain, a little softness and darkened corners, like a 35mm print.',
      board: 'Painted on illustration board: the tooth of the board and the bristle of the brush show through every colour, like an art-book plate.',
    }),
  },

  async apply(capture, answers, context, signal) {
    const S = capture.size, N = S * S, unit = S / 720;
    const mood = context.mood;
    const tradition = answers.tradition as Tradition;
    const clouds = answers.clouds as CloudKind;
    const detail = clamp01(answers.detail), hard = clamp01(answers.bands), bloomAmt = clamp01(answers.bloom);
    const random = seeded((context.seed ^ 0x5a1e7c3b) >>> 0);
    const seed = (context.seed ^ 0x2b7d) | 0;
    const white = hasher(seed * 3 + 1);
    const low = valueNoise(seed * 5 + 7);
    const fine = valueNoise(seed * 11 + 3);
    const tick = async () => {
      signal.throwIfAborted();
      await pause();
      signal.throwIfAborted();
    };
    const notes: string[] = [];

    // ---- read the capture ------------------------------------------------------------------
    const R0 = new Float32Array(N), G0 = new Float32Array(N), B0 = new Float32Array(N);
    const id = new Uint8Array(N), rel = new Float32Array(N), lit = new Float32Array(N);
    const nx = new Float32Array(N), ny = new Float32Array(N), nz = new Float32Array(N);
    let dmin = Infinity, dmax = -Infinity, maxId = 0;
    for (let p = 0; p < N; p++) {
      const a = p * 4;
      R0[p] = capture.color[a] / 255; G0[p] = capture.color[a + 1] / 255; B0[p] = capture.color[a + 2] / 255;
      const k = capture.identity[a];
      id[p] = k;
      if (k > maxId) maxId = k;
      nx[p] = capture.normal[a] / 127.5 - 1;
      ny[p] = 1 - capture.normal[a + 1] / 127.5; // image space: y runs down
      nz[p] = capture.normal[a + 2] / 127.5 - 1;
      lit[p] = luma(capture.diffuse[a], capture.diffuse[a + 1], capture.diffuse[a + 2]) / 255;
      if (k > 0) {
        const d = (capture.depth[a] * 65536 + capture.depth[a + 1] * 256 + capture.depth[a + 2]) / 16777216;
        rel[p] = d;
        if (d < dmin) dmin = d;
        if (d > dmax) dmax = d;
      }
    }
    const drange = Math.max(1e-6, dmax - dmin);
    for (let p = 0; p < N; p++) rel[p] = id[p] === 0 ? 1 : clamp01((rel[p] - dmin) / drange);

    // Plain light, normalised so the brightest lit surfaces sit near 1.
    const hist = new Uint32Array(256);
    let solid = 0;
    for (let p = 0; p < N; p++) if (id[p] > 0) { hist[Math.min(255, Math.round(lit[p] * 255))]++; solid++; }
    let bright = 1;
    for (let v = 0, seen = 0; v < 256; v++) {
      seen += hist[v];
      if (seen >= solid * 0.94) { bright = Math.max(0.03, v / 255); break; }
    }
    const E = new Float32Array(N);
    for (let p = 0; p < N; p++) E[p] = Math.min(1.4, lit[p] / bright);
    const Es = gaussian(E, S, S, 1.1 * unit);
    const otsu = (lo: number, hi: number) => {
      const h = new Float64Array(256);
      let total = 0;
      for (let p = 0; p < N; p++) if (id[p] >= lo && id[p] <= hi) { h[Math.min(255, Math.round((Es[p] / 1.4) * 255))]++; total++; }
      if (total < 50) return 0.55;
      let sumAll = 0;
      for (let v = 0; v < 256; v++) sumAll += v * h[v];
      let below = 0, sumBelow = 0, best = -1, split = 0.55;
      for (let v = 0; v < 256; v++) {
        below += h[v]; sumBelow += v * h[v];
        const above = total - below;
        if (!below || !above) continue;
        const gap = sumBelow / below - (sumAll - sumBelow) / above;
        const between = below * above * gap * gap;
        if (between > best) { best = between; split = ((v + 0.5) / 255) * 1.4; }
      }
      return Math.min(0.85, Math.max(0.25, split));
    };
    const splitCast = otsu(3, 255), splitBg = otsu(1, 2);

    // The key light in the picture: x right, y down, z toward the viewer.
    let [lx, ly, lz] = capture.light;
    {
      const m = Math.hypot(lx, ly, lz) || 1;
      lx /= m; ly /= m; lz /= m;
    }
    const lm = Math.hypot(lx, ly);
    const dirX = lm < 0.12 ? -0.45 : lx / lm, dirY = lm < 0.12 ? -0.89 : ly / lm;
    const sideways = clamp01(lm * 2);

    // Where the horizon sits: the median top edge of everything solid.
    const tops: number[] = [];
    for (let x = 0; x < S; x += 2)
      for (let y = 0; y < S; y++) if (id[y * S + x] !== 0) { tops.push(y); break; }
    tops.sort((a, b) => a - b);
    const horizon = tops.length > S * 0.05 ? Math.min(0.85 * S, Math.max(0.22 * S, tops[Math.floor(tops.length / 2)])) : 0.62 * S;

    // The sun sits up in the sky on the side the key light comes from.
    // With no open sky in the frame the sun stands outside it, and its light comes in from the edge.
    let openSky = 0;
    for (let p = 0; p < N; p++) if (id[p] === 0) openSky++;
    openSky /= N;
    let sdx = dirX, sdy = dirY;
    if (sdy > -0.25) { sdy = -0.25; const m = Math.hypot(sdx, sdy); sdx /= m; sdy /= m; }
    const reach = openSky < 0.03 ? 0.8 * S : S * Math.min(0.62, 0.36 + 0.3 * clamp01(lz));
    let sunX = S / 2 + sdx * reach, sunY = S / 2 + sdy * reach;
    const lowSun = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    if (openSky >= 0.03) {
      sunY = Math.min(sunY, horizon - 0.06 * S);
      if (tradition === 'evening') sunY = lerp(sunY, horizon - 0.07 * S, 0.75);
      else sunY = lerp(sunY, horizon - 0.12 * S, lowSun * 0.4);
    }
    sunY = Math.max(sunY, -0.3 * S);
    sunX = Math.min(1.3 * S, Math.max(-0.3 * S, sunX));

    // ---- the palette ------------------------------------------------------------------------
    let pal: Palette =
      answers.tint === 'hour'
        ? mood.daylight < 0.5
          ? mixPalette(DAWN, SUMMER, smooth(0, 1, mood.daylight * 2))
          : mixPalette(SUMMER, GOLDEN, smooth(0, 1, (mood.daylight - 0.5) * 2))
        : TINTS[answers.tint];
    if (tradition === 'evening') pal = mixPalette(pal, DUSK, 0.74);
    // A world that brought a dark sky of its own is painted as night: deep blue, moonlit cloud, its stars kept.
    let night = 0;
    {
      let sum = 0, n = 0;
      for (let p = 0; p < N; p += 3) if (id[p] === 0) { sum += luma(R0[p], G0[p], B0[p]); n++; }
      if (n > N * 0.01) night = smooth(0.26, 0.1, sum / n);
      if (night > 0) pal = mixPalette(pal, NIGHT, night * 0.85);
    }
    if (tradition === 'watercolour')
      pal = {
        ...pal,
        zenith: mixRGB(pal.zenith, pal.mid, 0.35),
        cloudLit: mixRGB(pal.cloudLit, hex('#fffcf2'), 0.7),
        cloudShade: mixRGB(pal.cloudShade, hex('#eef0f4'), 0.3),
      };
    {
      const warm = mood.warmth - 0.5;
      const toward = warm > 0 ? hex('#ffad6a') : hex('#d6e6ff');
      pal = { ...pal, sun: mixRGB(pal.sun, toward, Math.abs(warm) * 0.5), horizon: mixRGB(pal.horizon, toward, Math.abs(warm) * 0.25) };
      const sat = lerp(0.72, 1.1, mood.cheer);
      pal = mapPalette(pal, (c) => saturate(c, sat).map(clamp01) as RGB);
    }
    const shadeMax = Math.max(...pal.shade);
    const coolTone: RGB = [pal.shade[0] / shadeMax, pal.shade[1] / shadeMax, pal.shade[2] / shadeMax];
    await tick();

    // ---- the sky ----------------------------------------------------------------------------
    const sky = paintSky({
      size: S, unit, horizon, sunX, sunY, palette: pal, tradition, clouds,
      amount: clamp01(lerp(0.25, 1, mood.density) * 0.7 + random() * 0.3),
      energy: mood.energy,
      windows: lerp(0.22, 0.6, mood.density) * lerp(0.7, 1.1, mood.cheer) * (1 + night * 0.5),
      random, seed,
    });
    notes.push(...sky.notes);
    await tick();

    // ---- the background painting: ground and set ---------------------------------------------
    const kRadius = lerp(4.2, 2, detail) * unit + (tradition === 'watercolour' ? unit : 0);
    const [KR, KG, KB] = kuwahara(R0, G0, B0, S, kRadius);
    await tick();
    const OR = new Float32Array(N), OG = new Float32Array(N), OB = new Float32Array(N);
    const wBg = lerp(0.18, 0.035, hard);
    const bgSat = tradition === 'luminous' ? 1.14 : tradition === 'evening' ? 1.06 : 1.02;
    const hazeK = tradition === 'luminous' ? 0.22 : tradition === 'watercolour' ? 0.3 : 0.32;
    const sunLight: RGB = mixRGB([1, 1, 1], pal.sun, tradition === 'evening' ? 0.6 : tradition === 'luminous' ? 0.55 : 0.35);
    // A painting never leaves the lit ground at paper white: that is where the light effects show.
    const exposure = tradition === 'evening' ? 0.8 : tradition === 'luminous' ? 0.93 : 0.94;
    const closed = openSky < 0.03;
    const groundHaze: RGB = pal.haze;
    for (let p = 0; p < N; p++) {
      const k = id[p];
      if (k === 0 || k >= 3) continue;
      const e = Es[p];
      const f = Math.min(2.2, 1 / Math.max(0.3, e) ** 0.42);
      const ar = Math.min(1, KR[p] * f), ag = Math.min(1, KG[p] * f), ab = Math.min(1, KB[p] * f);
      const litK = smooth(splitBg - wBg, splitBg + wBg, e);
      const below = lerp(0.8, 1, clamp01(e / splitBg));
      const above = 0.95 + 0.12 * clamp01((e - splitBg) / Math.max(0.05, 1 - splitBg));
      let r = ar * lerp(pal.shade[0] * below, sunLight[0] * above, litK) * exposure;
      let g = ag * lerp(pal.shade[1] * below, sunLight[1] * above, litK) * exposure;
      let b = ab * lerp(pal.shade[2] * below, sunLight[2] * above, litK) * exposure;
      const l = luma(r, g, b);
      r = l + (r - l) * bgSat; g = l + (g - l) * bgSat; b = l + (b - l) * bgSat;
      // Aerial perspective: with no sky in the picture, the far ground fades toward the sky's colour.
      const hz = k === 1 && closed ? hazeK * 0.8 * smooth(0.15, 1, rel[p]) : hazeK * smooth(0.3, 1, rel[p]);
      const hc = k === 1 ? groundHaze : pal.haze;
      OR[p] = lerp(r, hc[0], hz); OG[p] = lerp(g, hc[1], hz); OB[p] = lerp(b, hc[2], hz);
    }
    await tick();

    // Painted light: each surface lighter and warmer toward the sun, cooler away from it, and the
    // colour drifting through neighbouring hues across a wall rather than sitting as one flat mix.
    {
      const drift = valueNoise(seed * 71 + 5), drift2 = valueNoise(seed * 73 + 9);
      const gradK = (tradition === 'evening' ? 0.32 : tradition === 'luminous' ? 0.22 : 0.14) * (closed ? 1.5 : 1);
      const sl = Math.hypot(sunX - S / 2, sunY - S / 2) || 1;
      const ux = (sunX - S / 2) / sl, uy = (sunY - S / 2) / sl;
      const hueK = tradition === 'watercolour' ? 0.05 : 0.035;
      const hueField = coarse((x, y) => fbm(drift, x / (130 * unit), y / (130 * unit), 2), S, 8 * unit);
      const valField = coarse((x, y) => fbm(drift2, x / (70 * unit), y / (70 * unit), 2), S, 5 * unit);
      for (let p = 0; p < N; p++) {
        const k = id[p];
        if (k === 0 || k >= 3) continue;
        const x = p % S, y = (p / S) | 0;
        const toward = clamp01(((x - S / 2) * ux + (y - S / 2) * uy) / S + 0.5);
        const hsv = toHSV(OR[p], OG[p], OB[p]);
        const dh = (hueField[p] - 0.5) * hueK * 2;
        const dv = (valField[p] - 0.5) * 0.08;
        let [r, g, b] = fromHSV(hsv[0] + dh, clamp01(hsv[1] * (1 + dv)), clamp01(hsv[2] * (1 + dv)));
        const away = (1 - toward) * gradK;
        r *= lerp(1, coolTone[0] * 0.92, away); g *= lerp(1, coolTone[1] * 0.92, away); b *= lerp(1, coolTone[2] * 0.92, away);
        const toSun = toward * toward * gradK * 0.8;
        r = 1 - (1 - r) * (1 - pal.sun[0] * toSun); g = 1 - (1 - g) * (1 - pal.sun[1] * toSun); b = 1 - (1 - b) * (1 - pal.sun[2] * toSun);
        OR[p] = r; OG[p] = g; OB[p] = b;
      }
    }

    // Stroke direction along each surface: across the projected normal.
    const tanX = new Float32Array(N), tanY = new Float32Array(N);
    for (let p = 0; p < N; p++) {
      const m = Math.hypot(nx[p], ny[p]);
      if (m < 0.2) { const v = id[p] === 2; tanX[p] = v ? 0 : 1; tanY[p] = v ? 1 : 0; }
      else { tanX[p] = -ny[p] / m; tanY[p] = nx[p] / m; }
    }

    // Brush streaks: bristle noise drawn out along the stroke direction.
    const streakK = (tradition === 'watercolour' ? 0.012 : tradition === 'evening' ? 0.032 : 0.028) + (answers.finish === 'board' ? 0.035 : 0);
    {
      const raw = new Float32Array(N);
      for (let p = 0; p < N; p++) raw[p] = white(p % S, (p / S) | 0);
      const bristle = boxBlur(raw, S, S, Math.max(1, Math.round(0.8 * unit)));
      const L = Math.max(2, Math.round(lerp(8, 4, detail) * unit));
      const gain = 2.4 * Math.sqrt(L / 3);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const p = y * S + x;
          if (id[p] === 0 || id[p] >= 3) continue;
          const tx = tanX[p], ty = tanY[p];
          let s = 0;
          for (let k = -L; k <= L; k++) {
            const qx = Math.min(S - 1, Math.max(0, Math.round(x + tx * k))), qy = Math.min(S - 1, Math.max(0, Math.round(y + ty * k)));
            s += bristle[qy * S + qx];
          }
          const v = Math.max(-1, Math.min(1, (s / (2 * L + 1) - 0.5) * gain));
          const m = 1 + v * streakK;
          OR[p] *= m; OG[p] *= m; OB[p] *= m;
        }
    }
    await tick();

    // Fine painted detail: dabs of neighbouring hues laid side by side, families clustered in patches.
    const FAMILIES: [number, number, number][] = [
      [0.018, 1.08, 1.05], [-0.015, 1.06, 0.94], [0.035, 0.95, 1.0], [-0.028, 1.12, 1.03], [0, 1.15, 0.92], [0.008, 0.9, 1.06],
    ];
    let dabs = 0;
    {
      const cell = lerp(12, 5, detail) * unit;
      const chance = lerp(0.18, 0.62, detail) * lerp(0.8, 1.1, mood.density) * (tradition === 'watercolour' ? 0.55 : 1);
      const strength = tradition === 'watercolour' ? 0.26 : lerp(0.2, 0.4, detail);
      const cells = Math.ceil(S / cell);
      const h = hasher(seed * 17 + 23);
      for (let cy = 0; cy < cells; cy++) {
        for (let cx = 0; cx < cells; cx++) {
          if (h(cx, cy) > chance) continue;
          const px = Math.min(S - 1, Math.floor((cx + h(cx + 911, cy)) * cell)), py = Math.min(S - 1, Math.floor((cy + h(cx, cy + 577)) * cell));
          const p = py * S + px;
          const region = id[p];
          if (region === 0 || region >= 3) continue;
          const turn = (h(cx + 3, cy + 5) - 0.5) * 0.6;
          const ca = Math.cos(turn), sa = Math.sin(turn);
          const ux = tanX[p] * ca - tanY[p] * sa, uy = tanX[p] * sa + tanY[p] * ca;
          const len = cell * lerp(0.9, 1.7, h(cx + 13, cy + 7)) * (tradition === 'watercolour' ? 1.1 : 1);
          const wid = len * (tradition === 'watercolour' ? lerp(0.6, 0.9, h(cx, cy + 31)) : lerp(0.16, 0.28, h(cx, cy + 31)));
          const famAt = Math.floor(((fbm(low, px / (45 * unit), py / (45 * unit), 2) - 0.28) / 0.44) * FAMILIES.length);
          const fam = FAMILIES[Math.min(FAMILIES.length - 1, Math.max(0, famAt))];
          const hsv = toHSV(OR[p], OG[p], OB[p]);
          const lift = 1 + (h(cx + 41, cy + 43) - 0.5) * 0.12;
          const col = fromHSV(hsv[0] + fam[0], clamp01(hsv[1] * fam[1]), clamp01(hsv[2] * fam[2] * lift));
          const reachD = Math.ceil(len + 1);
          for (let yy = Math.max(0, py - reachD); yy <= Math.min(S - 1, py + reachD); yy++)
            for (let xx = Math.max(0, px - reachD); xx <= Math.min(S - 1, px + reachD); xx++) {
              const q = yy * S + xx;
              if (id[q] !== region) continue;
              const dx = xx - px, dy = yy - py;
              const u = (dx * ux + dy * uy) / len, v = (-dx * uy + dy * ux) / wid;
              const e = u * u + v * v;
              if (e >= 1) continue;
              const a = strength * smooth(1, 0.55, e);
              if (tradition === 'watercolour') {
                // A wet dab: a transparent glaze of a neighbouring hue, soft at its edge.
                const k2 = a * 0.5 * smooth(1, 0.2, e);
                OR[q] = lerp(OR[q], OR[q] * (col[0] / Math.max(0.05, OR[p])), k2);
                OG[q] = lerp(OG[q], OG[q] * (col[1] / Math.max(0.05, OG[p])), k2);
                OB[q] = lerp(OB[q], OB[q] * (col[2] / Math.max(0.05, OB[p])), k2);
              } else {
                OR[q] = lerp(OR[q], col[0], a); OG[q] = lerp(OG[q], col[1], a); OB[q] = lerp(OB[q], col[2], a);
              }
            }
          dabs++;
        }
        if (cy % 40 === 0) await tick();
      }
    }

    // Edges picked out: corners turned to the light catch a bright line, the others a dark accent.
    {
      const k = lerp(0.25, 1, detail);
      const hiCol: RGB = mixRGB([1, 1, 1], pal.sun, 0.5);
      for (let y = 0; y < S - 1; y++)
        for (let x = 0; x < S - 1; x++) {
          const p = y * S + x;
          if (id[p] === 0 || id[p] >= 3) continue;
          let crease = 0, step = 0;
          for (const q of [p + 1, p + S]) {
            if (id[q] === 0) continue;
            const dn = Math.hypot(nx[p] - nx[q], ny[p] - ny[q], nz[p] - nz[q]);
            crease = Math.max(crease, smooth(0.35, 0.9, dn));
            if (id[q] < 3) step = Math.max(step, smooth(0.03, 0.08, Math.abs(rel[q] - rel[p])));
          }
          if (crease <= 0 && step <= 0) continue;
          const facing = nx[p] * lx + ny[p] * ly + nz[p] * lz;
          if (crease > 0 && facing > 0.2 && Es[p] > splitBg) {
            const a = crease * k * 0.55;
            OR[p] = lerp(OR[p], hiCol[0], a); OG[p] = lerp(OG[p], hiCol[1], a); OB[p] = lerp(OB[p], hiCol[2], a);
          } else {
            const a = 1 - Math.max(crease * 0.28, step * 0.35) * k;
            OR[p] *= a; OG[p] *= a; OB[p] *= a * 1.02;
          }
        }
    }
    await tick();

    // Watercolour: washes laid in layers, each drying with a darker water mark at its edge.
    if (tradition === 'watercolour') {
      const nb = Math.round(lerp(4, 7, detail));
      const band = new Int16Array(N).fill(-1);
      const edgy = new Float32Array(N);
      const warp = valueNoise(seed * 19 + 5), warp2 = valueNoise(seed * 23 + 7);
      const lumPlane = new Float32Array(N);
      for (let p = 0; p < N; p++) lumPlane[p] = luma(OR[p], OG[p], OB[p]);
      const lumSoft = gaussian(lumPlane, S, S, 2.5 * unit);
      const amp = 7 * unit;
      const warpX = coarse((x, y) => fbm(warp, x / (30 * unit), y / (30 * unit), 3), S, 3 * unit);
      const warpY = coarse((x, y) => fbm(warp2, x / (30 * unit), y / (30 * unit), 3), S, 3 * unit);
      for (let p = 0; p < N; p++) {
        if (id[p] === 0 || id[p] >= 3) continue;
        const x = p % S, y = (p / S) | 0;
        const l = lumPlane[p];
        const wx = Math.min(S - 1, Math.max(0, Math.round(x + (warpX[p] - 0.5) * 2 * amp)));
        const wy = Math.min(S - 1, Math.max(0, Math.round(y + (warpY[p] - 0.5) * 2 * amp)));
        const v = lumSoft[wy * S + wx];
        band[p] = Math.max(0, Math.floor(v * nb + 0.5));
        // Flatten toward the wash's tone only where there is form to flatten, never on open ground.
        const xa = Math.min(S - 1, x + 1), xb = Math.max(0, x - 1), ya = Math.min(S - 1, y + 1), yb = Math.max(0, y - 1);
        const slope = Math.abs(lumSoft[y * S + xa] - lumSoft[y * S + xb]) + Math.abs(lumSoft[ya * S + x] - lumSoft[yb * S + x]);
        edgy[p] = smooth(0.006, 0.02, slope);
        const flat = Math.min(1.25, Math.max(0.8, ((band[p] + 0.5) / nb) / Math.max(0.03, l))) ** (0.3 * edgy[p]);
        OR[p] *= flat; OG[p] *= flat; OB[p] *= flat;
      }
      const edgyS = boxBlur(edgy, S, S, Math.round(3 * unit));
      for (let y = 2; y < S - 2; y++)
        for (let x = 2; x < S - 2; x++) {
          const p = y * S + x;
          if (band[p] < 0) continue;
          let mark = 0;
          for (const [dx, dy, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [2, 0, 0.45], [-2, 0, 0.45], [0, 2, 0.45], [0, -2, 0.45]] as const) {
            const q = p + dy * S + dx;
            if (band[q] < 0) continue;
            if (band[q] > band[p] || id[q] !== id[p]) mark = Math.max(mark, w);
          }
          mark *= smooth(0.05, 0.25, edgyS[p]);
          if (mark) { const m = 1 - 0.17 * mark; OR[p] *= m; OG[p] *= m; OB[p] *= m * 1.01; }
        }
      // Colour blooms where a second wash crept in, and pigment settling into the paper.
      const tints: RGB[] = [hex('#ffe9b0'), hex('#ffd2da'), hex('#d2dcff'), hex('#dcf5d2')];
      const blooms = tints.map((_, i) => { const n = valueNoise(seed * 31 + i * 101); return coarse((x, y) => fbm(n, x / (120 * unit), y / (120 * unit), 3), S, 5 * unit); });
      for (let p = 0; p < N; p++) {
        if (band[p] < 0) continue;
        const x = p % S, y = (p / S) | 0;
        let r = OR[p], g = OG[p], b = OB[p];
        for (let i = 0; i < tints.length; i++) {
          const n = blooms[i][p];
          const m = smooth(0.58, 0.66, n);
          if (m <= 0) continue;
          const rim = 1 - 0.03 * (1 - Math.abs(m * 2 - 1));
          r = lerp(r, r * tints[i][0], 0.12 * m) * rim; g = lerp(g, g * tints[i][1], 0.12 * m) * rim; b = lerp(b, b * tints[i][2], 0.12 * m) * rim;
        }
        const grain = (white(x * 3 + 1, y * 3 + 2) + fine(x / (1.6 * unit), y / (1.6 * unit)) - 1) * 0.07 * (1.2 - luma(r, g, b));
        OR[p] = r * (1 + grain); OG[p] = g * (1 + grain); OB[p] = b * (1 + grain);
      }
    }
    await tick();

    // ---- the cels: the things ------------------------------------------------------------------
    const counts = new Int32Array(maxId + 1);
    for (let p = 0; p < N; p++) counts[id[p]]++;
    const label = new Int16Array(N).fill(-1);
    const paints: RGB[] = [];
    const selfLit = new Float32Array(256 * 8);
    const lifted = (p: number): RGB => {
      const f = Math.min(2.2, 1 / Math.max(0.3, Es[p]) ** 0.45);
      return [Math.min(1, KR[p] * f), Math.min(1, KG[p] * f), Math.min(1, KB[p] * f)];
    };
    const castIds: number[] = [];
    for (let k = 3; k <= maxId; k++) if (counts[k] > 0) castIds.push(k);
    if (castIds.length) {
      const members: number[][] = castIds.map(() => []);
      const slot = new Int16Array(maxId + 1).fill(-1);
      castIds.forEach((k, i) => (slot[k] = i));
      for (let p = 0; p < N; p++) if (id[p] >= 3) members[slot[id[p]]].push(p);
      for (let i = 0; i < castIds.length; i++) {
        const list = members[i];
        const stride = Math.max(1, Math.floor(list.length / 2500));
        const samples: RGB[] = [];
        for (let j = 0; j < list.length; j += stride) samples.push(lifted(list[j]));
        const centroids = kmeans(samples, 5, random);
        const offset = paints.length;
        for (const c of centroids) paints.push(saturate(c, 1.1).map(clamp01) as RGB);
        for (const p of list) {
          const c = lifted(p);
          let best = 0, bestD = Infinity;
          for (let j = 0; j < centroids.length; j++) {
            const d = (c[0] - centroids[j][0]) ** 2 + (c[1] - centroids[j][1]) ** 2 + (c[2] - centroids[j][2]) ** 2;
            if (d < bestD) { bestD = d; best = j; }
          }
          label[p] = offset + best;
        }
      }
      for (let pass = 0; pass < 2; pass++) majority(label, id, S);
      // A paint that stays bright where the plain light finds shadow is lit from within: a lamp, a screen.
      const shadowSum = new Float32Array(paints.length), shadowCount = new Float32Array(paints.length);
      const litSum = new Float32Array(paints.length), litCount = new Float32Array(paints.length);
      for (let p = 0; p < N; p++) {
        if (label[p] < 0) continue;
        const l0 = luma(R0[p], G0[p], B0[p]);
        if (E[p] < splitCast * 0.6) { shadowSum[label[p]] += l0; shadowCount[label[p]]++; }
        else if (E[p] > splitCast * 1.1) { litSum[label[p]] += l0; litCount[label[p]]++; }
      }
      if (tradition === 'evening') {
        // At dusk a small bright globe or pane is a lamp: it is switched on.
        const area = new Float32Array(paints.length), bright = new Float32Array(paints.length);
        for (let p = 0; p < N; p++) if (label[p] >= 0) { area[label[p]]++; bright[label[p]] += luma(R0[p], G0[p], B0[p]); }
        for (let j = 0; j < paints.length; j++)
          if (area[j] > 6 * unit * unit && area[j] < N * 0.006) selfLit[j] = Math.max(selfLit[j], smooth(0.8, 0.9, bright[j] / area[j]));
      }
      for (let j = 0; j < paints.length; j++) {
        if (shadowCount[j] < 12 * unit * unit) continue;
        const dim = shadowSum[j] / shadowCount[j];
        const steady = litCount[j] > 12 * unit * unit ? smooth(0.75, 0.9, dim / Math.max(0.05, litSum[j] / litCount[j])) : 1;
        selfLit[j] = Math.max(selfLit[j], smooth(0.78, 0.9, dim) * steady);
      }
      notes.push(`${castIds.length} cel${castIds.length > 1 ? 's' : ''} in ${paints.length} paints`);
    }
    await tick();

    const inShape = (k: number, x: number, y: number) => {
      const xi = Math.round(x), yi = Math.round(y);
      return xi >= 0 && yi >= 0 && xi < S && yi < S && id[yi * S + xi] === k;
    };
    // The crescent: the shape slid toward the light leaves a sliver of shadow on its far side.
    const crescent = new Float32Array(N), rim = new Float32Array(N);
    const crescentOn = tradition === 'watercolour' || hard < 0.15;
    const rimOn = tradition === 'evening' || (tradition === 'luminous' && hard > 0.55) || lz < -0.2;
    {
      const span: Record<number, number> = {};
      for (const k of castIds) span[k] = Math.sqrt(counts[k]);
      for (let p = 0; p < N; p++) {
        const k = id[p];
        if (k < 3) continue;
        const x = p % S, y = (p / S) | 0;
        if (crescentOn) {
          const d = Math.min(13 * unit, Math.max(3.5 * unit, span[k] * 0.08)) * lerp(0.65, 1, sideways);
          if (!inShape(k, x - dirX * d, y - dirY * d)) crescent[p] = 1;
        }
        if (rimOn) {
          const d = lerp(1.6, 3.2, hard) * unit;
          if (!inShape(k, x + dirX * d, y + dirY * d)) rim[p] = 1;
        }
      }
    }
    const crescentS = gaussian(crescent, S, S, 0.8 * unit);
    const rimS = gaussian(rim, S, S, 0.7 * unit);

    const w = lerp(0.12, 0.012, hard);
    const hx = lx, hy = ly, hz = lz + 1;
    const hm = Math.hypot(hx, hy, hz) || 1;
    const hiT = lerp(0.97, 0.9, hard);
    const shadeK = tradition === 'watercolour' ? 0.85 : 0.95;
    const rimCol = pal.sun;
    for (let p = 0; p < N; p++) {
      if (id[p] < 3) continue;
      let paint = paints[label[p]] ?? [R0[p], G0[p], B0[p]];
      {
        const c = lifted(p);
        const stray = Math.hypot(c[0] - paint[0], c[1] - paint[1], c[2] - paint[2]);
        if (stray > 0.28) paint = mixRGB(paint, c, smooth(0.28, 0.45, stray));
      }
      const e = Es[p];
      let litK = smooth(splitCast - w, splitCast + w, e);
      if (hard < 0.2) litK = lerp(smooth(splitCast - 0.3, splitCast + 0.3, e), litK, hard / 0.2);
      litK *= 1 - crescentS[p];
      const sr = paint[0] * lerp(1, pal.shade[0], shadeK), sg = paint[1] * lerp(1, pal.shade[1], shadeK), sb = paint[2] * lerp(1, pal.shade[2], shadeK);
      const kr = paint[0] * lerp(1, sunLight[0], 0.3) * 1.03, kg = paint[1] * lerp(1, sunLight[1], 0.3) * 1.03, kb = paint[2] * lerp(1, sunLight[2], 0.3) * 1.03;
      let r = lerp(sr, kr, litK), g = lerp(sg, kg, litK), b = lerp(sb, kb, litK);
      if (hard > 0.72) {
        const core = (1 - smooth(splitCast * 0.55 - w, splitCast * 0.55 + w, e)) * smooth(0.72, 0.85, hard);
        r = lerp(r, sr * pal.shade[0] * 0.92, core * 0.8); g = lerp(g, sg * pal.shade[1] * 0.92, core * 0.8); b = lerp(b, sb * pal.shade[2] * 0.92, core * 0.8);
      }
      if (hard > 0.4) {
        const spec = Math.max(0, (nx[p] * hx + ny[p] * hy + nz[p] * hz) / hm);
        const hi = smooth(hiT - w * 0.5, hiT + w * 0.5, spec) * litK * smooth(0.4, 0.55, hard);
        r = lerp(r, lerp(paint[0], 1, 0.6), hi * 0.85); g = lerp(g, lerp(paint[1], 1, 0.6), hi * 0.85); b = lerp(b, lerp(paint[2], 0.97, 0.6), hi * 0.85);
      }
      if (rimOn && rimS[p] > 0) {
        const k = rimS[p] * (tradition === 'evening' ? 0.85 : 0.7);
        r = lerp(r, 1 - (1 - paint[0]) * (1 - rimCol[0] * 0.9), k);
        g = lerp(g, 1 - (1 - paint[1]) * (1 - rimCol[1] * 0.9), k);
        b = lerp(b, 1 - (1 - paint[2]) * (1 - rimCol[2] * 0.9), k);
      }
      const lamp = selfLit[label[p]] ?? 0;
      if (lamp > 0) {
        const warmK = tradition === 'evening' ? 0.45 : 0.15;
        r = lerp(r, lerp(paint[0], 1, warmK) * 1.08, lamp); g = lerp(g, lerp(paint[1], 0.88, warmK) * 1.06, lamp); b = lerp(b, lerp(paint[2], 0.62, warmK), lamp);
      }
      if (tradition === 'evening') { r *= lerp(0.9, 1, lamp); g *= lerp(0.9, 1, lamp); b *= lerp(0.9, 1, lamp); }
      // The cels sit in the same air as the painting, only less.
      const hz2 = hazeK * 0.5 * smooth(0.45, 1, rel[p]);
      OR[p] = lerp(r, pal.haze[0], hz2); OG[p] = lerp(g, pal.haze[1], hz2); OB[p] = lerp(b, pal.haze[2], hz2);
      if (tradition === 'watercolour') {
        // Paint on the cel takes a little of the paper's grain, so it does not read as vector fill.
        const x = p % S, y = (p / S) | 0;
        const t = 1 + (fine(x / (2 * unit), y / (2 * unit)) - 0.5) * 0.06 + (fbm(low, x / (40 * unit), y / (40 * unit), 2) - 0.5) * 0.08;
        OR[p] *= t; OG[p] *= t; OB[p] *= t;
      }
    }
    await tick();

    // Self-lit surfaces (lamps, windows, screens) stay lit and glow warm.
    const glow = new Float32Array(N);
    for (let p = 0; p < N; p++) if (label[p] >= 0 && selfLit[label[p]] > 0) glow[p] = selfLit[label[p]] * (tradition === 'evening' ? 1.4 : 0.8);
    for (let p = 0; p < N; p++) {
      if (id[p] === 0 || id[p] >= 3) continue;
      const l0 = luma(R0[p], G0[p], B0[p]);
      const em = smooth(0.8, 0.93, l0) * (1 - smooth(0.25, 0.5, E[p]));
      if (em <= 0.02) continue;
      glow[p] = em;
      const warm = tradition === 'evening' ? 0.4 : 0.15;
      OR[p] = lerp(OR[p], lerp(R0[p], 1, warm) * 1.05, em); OG[p] = lerp(OG[p], lerp(G0[p], 0.86, warm) * 1.05, em); OB[p] = lerp(OB[p], lerp(B0[p], 0.6, warm), em);
    }

    // ---- the sky goes in behind; whatever glittered in the original backdrop is kept --------------
    {
      // Compared only against other backdrop pixels, so the edge of a dark thing never reads as a star.
      const l0 = new Float32Array(N), open = new Float32Array(N);
      for (let p = 0; p < N; p++) if (id[p] === 0) { l0[p] = luma(R0[p], G0[p], B0[p]); open[p] = 1; }
      const sumL = boxBlur(l0, S, S, Math.round(6 * unit)), sumO = boxBlur(open, S, S, Math.round(6 * unit));
      for (let p = 0; p < N; p++) {
        if (id[p] !== 0) continue;
        let r = sky.r[p], g = sky.g[p], b = sky.b[p];
        const spark = smooth(0.06, 0.3, l0[p] - sumL[p] / Math.max(1e-3, sumO[p]));
        if (spark > 0) {
          r = 1 - (1 - r) * (1 - R0[p] * spark); g = 1 - (1 - g) * (1 - G0[p] * spark); b = 1 - (1 - b) * (1 - B0[p] * spark);
          glow[p] = Math.max(glow[p], spark);
        }
        OR[p] = r; OG[p] = g; OB[p] = b;
      }
    }
    await tick();

    // ---- ink lines on the cels ----------------------------------------------------------------
    if (answers.line !== 'none' && castIds.length) {
      const inkSepia: RGB = tradition === 'watercolour' ? hex('#5a3e30') : hex('#6a4632');
      const ink: RGB = hex('#1c1820');
      const mark = new Float32Array(N), inner = new Float32Array(N);
      const back = Math.round(2 * unit);
      for (let y = 1; y < S - 1; y++)
        for (let x = 1; x < S - 1; x++) {
          const p = y * S + x;
          const k = id[p];
          if (k < 3) continue;
          let m = 0, n = 0;
          for (const [dx, dy, wgt] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 0.5], [-1, -1, 0.5], [1, -1, 0.5], [-1, 1, 0.5]] as const) {
            const q = p + dy * S + dx;
            if (id[q] !== k) {
              if (id[q] < 3 || rel[q] > rel[p]) m = Math.max(m, wgt);
            } else {
              const dn = Math.hypot(nx[p] - nx[q], ny[p] - ny[q], nz[p] - nz[q]);
              if (dn > 0.55 || rel[q] - rel[p] > 0.025) n = Math.max(n, wgt * 0.8);
              else if (label[q] !== label[p] && wgt === 1) n = Math.max(n, 0.45);
            }
          }
          // The line swells on the shadow side.
          const qx = Math.round(x - dirX * back), qy = Math.round(y - dirY * back);
          if (qx >= 0 && qy >= 0 && qx < S && qy < S) {
            const q = qy * S + qx;
            if (id[q] !== k && (id[q] < 3 || rel[q] > rel[p])) m = Math.max(m, 0.75);
          }
          mark[p] = m; inner[p] = n;
        }
      for (let p = 0; p < N; p++) {
        const m = mark[p], n = inner[p];
        if (m <= 0 && n <= 0) continue;
        const paint = paints[label[p]] ?? [OR[p], OG[p], OB[p]];
        const self: RGB = [paint[0] * 0.42, paint[1] * 0.4, paint[2] * 0.46];
        const outer = answers.line === 'ink' ? ink : answers.line === 'sepia' ? inkSepia : self;
        const innerCol = answers.line === 'ink' ? mixRGB(ink, self, 0.4) : answers.line === 'sepia' ? mixRGB(inkSepia, self, 0.5) : self;
        const a = Math.max(m * 0.92, n * 0.55);
        const c = m >= n * 0.6 ? outer : innerCol;
        OR[p] = lerp(OR[p], c[0], a); OG[p] = lerp(OG[p], c[1], a); OB[p] = lerp(OB[p], c[2], a);
      }
    }
    await tick();

    // ---- light through the air: god rays from the sun, masked by depth -----------------------------
    const rayAmt = clamp01(answers.rays) * (tradition === 'watercolour' ? 0.6 : 1);
    const S2 = S >> 1;
    let ray2: Float32Array | null = null;
    if (rayAmt > 0.03) {
      const src = new Float32Array(S2 * S2);
      for (let y = 0; y < S2; y++)
        for (let x = 0; x < S2; x++) {
          const p = Math.min(S - 1, y * 2) * S + Math.min(S - 1, x * 2);
          const near = Math.exp(-Math.hypot(x * 2 - sunX, y * 2 - sunY) / (0.32 * S));
          if (id[p] === 0) {
            const l = luma(OR[p], OG[p], OB[p]);
            src[y * S2 + x] = l * l * (0.25 + 0.75 * near);
          } else if (id[p] < 3) {
            // Air over sunlit ground glows; things and shadows leave dark shafts behind them.
            src[y * S2 + x] = smooth(splitBg - wBg, splitBg + wBg, Es[p]) * 0.42 * (0.35 + 0.65 * near) * lerp(0.6, 1, rel[p]);
          }
        }
      const sx = sunX / 2, sy = sunY / 2;
      const steps = 40, decay = 0.965, span = 0.92;
      const out = new Float32Array(S2 * S2);
      const beams = valueNoise(seed * 37 + 13);
      const twist = random() * 10;
      const count = lerp(4, 9, mood.energy);
      // The beams depend only on the angle around the sun: one turn of it, tabulated.
      const TURN = 2048;
      const beamTable = new Float32Array(TURN + 1);
      for (let i = 0; i <= TURN; i++) {
        const theta = (i / TURN) * Math.PI * 2 - Math.PI;
        beamTable[i] = smooth(0.44, 0.64, fbm(beams, Math.cos(theta) * count + twist, Math.sin(theta) * count, 3));
      }
      for (let y = 0; y < S2; y++) {
        for (let x = 0; x < S2; x++) {
          const dx = ((sx - x) * span) / steps, dy = ((sy - y) * span) / steps;
          let acc = 0, wsum = 0, wt = 1, qx = x, qy = y;
          for (let i = 0; i < steps; i++) {
            let s: number;
            if (qx < 0 || qy < 0 || qx > S2 - 1 || qy > S2 - 1) s = 0.7 * Math.exp(-Math.hypot(qx - sx, qy - sy) / (0.3 * S));
            else s = src[(qy | 0) * S2 + (qx | 0)];
            acc += s * wt; wsum += wt; wt *= decay; qx += dx; qy += dy;
          }
          const theta = Math.atan2(y - sy, x - sx);
          const beam = beamTable[Math.round(((theta + Math.PI) / (Math.PI * 2)) * TURN)];
          const d = Math.hypot(x - sx, y - sy) * 2;
          out[y * S2 + x] = (acc / wsum) * lerp(1, 0.08 + 1.5 * beam, 0.85) + beam * Math.exp(-d / (0.75 * S)) * 0.14;
        }
        if (y % 90 === 0) await tick();
      }
      ray2 = out;
      const ray = grow(out, S2, S);
      let mean = 0;
      for (let i = 0; i < out.length; i++) mean += out[i];
      mean = Math.max(1e-3, mean / out.length);
      for (let p = 0; p < N; p++) {
        // Between the shafts the air is in shadow: a little cooler and darker, so the beams read on pale ground.
        if (id[p] !== 0) {
          const gap = clamp01((mean - ray[p]) / mean) * rayAmt * 0.3;
          OR[p] *= lerp(1, coolTone[0] * 0.9, gap); OG[p] *= lerp(1, coolTone[1] * 0.9, gap); OB[p] *= lerp(1, coolTone[2] * 0.9, gap);
        }
        const mask = id[p] === 0 ? 1 : id[p] >= 3 ? lerp(0.25, 0.7, rel[p]) : lerp(0.35, 1, smooth(0, 1, rel[p]));
        const a = Math.min(0.8, ray[p] * rayAmt * (closed ? 1.7 : 1.25) * mask);
        OR[p] = 1 - (1 - OR[p]) * (1 - pal.sun[0] * a); OG[p] = 1 - (1 - OG[p]) * (1 - pal.sun[1] * a); OB[p] = 1 - (1 - OB[p]) * (1 - pal.sun[2] * a);
      }
      notes.push(`light rays at ${Math.round(rayAmt * 100)}%`);
    }
    await tick();

    // ---- bloom --------------------------------------------------------------------------------
    if (bloomAmt > 0.03 || glow.some((v) => v > 0.3)) {
      const thr = lerp(0.93, 0.76, bloomAmt);
      const planes = [OR, OG, OB].map(() => new Float32Array(S2 * S2));
      for (let y = 0; y < S2; y++)
        for (let x = 0; x < S2; x++) {
          const p = Math.min(S - 1, y * 2) * S + Math.min(S - 1, x * 2);
          const q = Math.min(S - 1, y * 2 + 1) * S + Math.min(S - 1, x * 2 + 1);
          const r = (OR[p] + OR[q]) / 2, g = (OG[p] + OG[q]) / 2, b = (OB[p] + OB[q]) / 2;
          const k = clamp01((luma(r, g, b) - thr) / (1 - thr)) ** 2 + Math.max(glow[p], glow[q]) * 0.8;
          const i = y * S2 + x;
          planes[0][i] = r * k; planes[1][i] = g * k; planes[2][i] = b * k;
        }
      const big = [OR, OG, OB].map((plane, c) => {
        const near = gaussian(planes[c], S2, S2, 2.2 * unit);
        const far = gaussian(planes[c], S2, S2, 9 * unit);
        const both = new Float32Array(S2 * S2);
        for (let i = 0; i < both.length; i++) both[i] = near[i] * 0.6 + far[i] * 0.7;
        return grow(both, S2, S);
      });
      const amount = lerp(0.25, 1, bloomAmt) * (tradition === 'watercolour' ? 0.6 : 0.9);
      for (let p = 0; p < N; p++) {
        OR[p] = 1 - (1 - OR[p]) * (1 - Math.min(1, big[0][p] * amount));
        OG[p] = 1 - (1 - OG[p]) * (1 - Math.min(1, big[1][p] * amount));
        OB[p] = 1 - (1 - OB[p]) * (1 - Math.min(1, big[2][p] * amount));
      }
      if (bloomAmt > 0.75) {
        // Dreamlike: a soft wash of the whole frame laid back over itself.
        const dream = [OR, OG, OB].map((plane) => gaussian(plane, S, S, 5 * unit));
        const k = (bloomAmt - 0.75) * 1.2;
        for (let p = 0; p < N; p++) {
          OR[p] = 1 - (1 - OR[p]) * (1 - dream[0][p] * k); OG[p] = 1 - (1 - OG[p]) * (1 - dream[1][p] * k); OB[p] = 1 - (1 - OB[p]) * (1 - dream[2][p] * k);
        }
      }
    }
    await tick();

    // ---- lens flare from the sun --------------------------------------------------------------
    const flareBase = tradition === 'evening' ? 0.95 : tradition === 'luminous' ? 0.6 : 0.12;
    let visible = 0;
    {
      let open = 0, total = 0;
      const rr = Math.round(6 * unit);
      for (let dy = -rr; dy <= rr; dy++)
        for (let dx = -rr; dx <= rr; dx++) {
          const x = Math.round(sunX + dx), y = Math.round(sunY + dy);
          total++;
          if (x < 0 || y < 0 || x >= S || y >= S) { open += 0.5; continue; }
          const p = y * S + x;
          if (id[p] === 0) open += 1 - sky.cover[p] * 0.85;
        }
      visible = total ? open / total : 0;
      const off = Math.max(0, -sunX, sunX - S, -sunY, sunY - S) / S;
      visible *= 1 - smooth(0, 0.18, off);
    }
    const flare = flareBase * visible * lerp(0.5, 1, bloomAmt) * lerp(0.7, 1.1, mood.cheer) * (1 - night * 0.6);
    if (flare > 0.04) {
      const cx = S / 2, cy = S / 2;
      const ghosts = [
        { f: 0.45, r: 0.022, a: 0.12, c: pal.sun },
        { f: 0.75, r: 0.04, a: 0.07, c: hex('#bfffd0') },
        { f: 1.25, r: 0.03, a: 0.1, c: hex('#d0c0ff') },
        { f: 1.6, r: 0.06, a: 0.05, c: hex('#ffd2a0') },
        { f: 2.0, r: 0.085, a: 0.04, c: hex('#bfe8ff') },
      ].map((g) => ({ ...g, x: sunX + (cx - sunX) * g.f, y: sunY + (cy - sunY) * g.f, r: g.r * S }));
      const spin = random() * Math.PI;
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const p = y * S + x;
          const dx = x - sunX, dy = y - sunY;
          const d = Math.hypot(dx, dy);
          let add = 0;
          if (d < 0.32 * S) {
            const phi = Math.atan2(dy, dx);
            const spikes = Math.abs(Math.cos(phi * 5 + spin)) ** 90 + 0.6 * Math.abs(Math.cos(phi * 3 + spin * 1.7)) ** 140;
            add += spikes * Math.exp(-d / (0.09 * S)) * 0.7 + Math.exp(-d / (0.03 * S)) * 0.5;
          }
          add += Math.exp(-Math.abs(dy) / (1.4 * unit)) * Math.exp(-Math.abs(dx) / (0.24 * S)) * 0.35;
          let r = pal.sun[0] * add, g = pal.sun[1] * add, b = pal.sun[2] * add;
          for (const gh of ghosts) {
            const u = Math.abs(x - gh.x), v = Math.abs(y - gh.y);
            if (u > gh.r + 2 || v > gh.r + 2) continue;
            const hexD = Math.max(u * 0.866 + v * 0.5, v);
            const inside = smooth(gh.r + 1, gh.r - 1, hexD) * gh.a * (0.6 + 0.6 * smooth(gh.r * 0.6, gh.r, hexD));
            r += gh.c[0] * inside; g += gh.c[1] * inside; b += gh.c[2] * inside;
          }
          if (r + g + b < 0.003) continue;
          OR[p] = 1 - (1 - OR[p]) * (1 - Math.min(1, r * flare)); OG[p] = 1 - (1 - OG[p]) * (1 - Math.min(1, g * flare)); OB[p] = 1 - (1 - OB[p]) * (1 - Math.min(1, b * flare));
        }
      notes.push('lens flare from the sun');
    }
    await tick();

    // ---- dust in the light -------------------------------------------------------------------
    if (ray2 && tradition !== 'watercolour' && rayAmt > 0.3) {
      const motes = Math.round(lerp(18, 70, mood.energy) * rayAmt);
      let placed = 0;
      for (let tries = 0; tries < motes * 30 && placed < motes; tries++) {
        const x = random() * S, y = random() * S;
        const v = ray2[Math.min(S2 - 1, (y / 2) | 0) * S2 + Math.min(S2 - 1, (x / 2) | 0)];
        if (random() > v * 1.6) continue;
        placed++;
        const bokeh = random() < 0.25;
        const rad = (bokeh ? lerp(3, 7, random()) : lerp(0.7, 2, random())) * unit;
        const a = bokeh ? lerp(0.08, 0.16, random()) : lerp(0.35, 0.8, random());
        for (let yy = Math.max(0, Math.floor(y - rad - 2)); yy <= Math.min(S - 1, Math.ceil(y + rad + 2)); yy++)
          for (let xx = Math.max(0, Math.floor(x - rad - 2)); xx <= Math.min(S - 1, Math.ceil(x + rad + 2)); xx++) {
            const d = Math.hypot(xx - x, yy - y);
            const k = (bokeh ? smooth(rad + 1, rad - 1, d) * (0.7 + 0.3 * smooth(rad * 0.5, rad, d)) : Math.exp(-((d / rad) ** 2))) * a;
            if (k < 0.004) continue;
            const p = yy * S + xx;
            OR[p] = 1 - (1 - OR[p]) * (1 - pal.sun[0] * k); OG[p] = 1 - (1 - OG[p]) * (1 - pal.sun[1] * k); OB[p] = 1 - (1 - OB[p]) * (1 - pal.sun[2] * k);
          }
      }
      if (placed) notes.push(`${placed} motes of dust in the light`);
    }

    // ---- grade and finish ------------------------------------------------------------------------
    const finish = answers.finish;
    const sat = (tradition === 'luminous' ? 1.1 : tradition === 'evening' ? 1.04 : 0.98) * lerp(0.82, 1.06, mood.cheer);
    const grain = finish === 'film' ? lerp(0.022, 0.05, mood.wear) : finish === 'board' ? 0.012 : 0.006;
    const vignette = finish === 'film' ? 0.22 : tradition === 'evening' ? 0.12 : 0.05;
    const paper: RGB = hex('#f6efe0');
    const fibre = valueNoise(seed * 61 + 29);
    let shiftR: Float32Array | null = null, shiftB: Float32Array | null = null;
    if (finish === 'digital') {
      shiftR = new Float32Array(N); shiftB = new Float32Array(N);
      const k = 0.0022;
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const dx = x - S / 2, dy = y - S / 2;
          const rx = Math.min(S - 1, Math.max(0, Math.round(S / 2 + dx * (1 + k)))), ry = Math.min(S - 1, Math.max(0, Math.round(S / 2 + dy * (1 + k))));
          const bx = Math.min(S - 1, Math.max(0, Math.round(S / 2 + dx * (1 - k)))), by = Math.min(S - 1, Math.max(0, Math.round(S / 2 + dy * (1 - k))));
          shiftR[y * S + x] = OR[ry * S + rx];
          shiftB[y * S + x] = OB[by * S + bx];
        }
    }
    const soft = finish === 'film' ? [OR, OG, OB].map((plane) => gaussian(plane, S, S, 0.9 * unit)) : null;
    const pixels = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        let r = shiftR ? shiftR[p] : OR[p], g = OG[p], b = shiftB ? shiftB[p] : OB[p];
        if (soft) { r = lerp(r, soft[0][p], 0.3); g = lerp(g, soft[1][p], 0.3); b = lerp(b, soft[2][p], 0.3); }
        // Split light: shadows lean to the palette's cool, lights to the sun.
        const l = clamp01(luma(r, g, b));
        const cool = (1 - l) ** 2 * 0.22, warmK = l * l * 0.1;
        r *= lerp(1, coolTone[0], cool); g *= lerp(1, coolTone[1], cool); b *= lerp(1, coolTone[2], cool);
        r = 1 - (1 - r) * (1 - pal.sun[0] * warmK); g = 1 - (1 - g) * (1 - pal.sun[1] * warmK); b = 1 - (1 - b) * (1 - pal.sun[2] * warmK);
        const l2 = luma(r, g, b);
        r = l2 + (r - l2) * sat; g = l2 + (g - l2) * sat; b = l2 + (b - l2) * sat;
        if (finish === 'board' || tradition === 'watercolour') {
          const tooth = (fbm(fine, x / (2.2 * unit), y / (2.2 * unit), 2) - 0.5) * (finish === 'board' ? 0.055 : 0.045);
          const fib = finish === 'board' ? (fbm(fibre, (x * 0.8 + y * 0.6) / (26 * unit), (-x * 0.6 + y * 0.8) / (1.4 * unit), 2) - 0.5) * 0.035 : 0;
          const m = 1 + tooth + fib;
          r = r * m * 0.97 + paper[0] * 0.03; g = g * m * 0.97 + paper[1] * 0.03; b = b * m * 0.97 + paper[2] * 0.03;
        }
        if (finish === 'film') { r = r * 0.95 + 0.035; g = g * 0.95 + 0.03; b = b * 0.95 + 0.035; }
        const n = (white(x, y) + white(x + 7919, y + 104729) - 1) * grain;
        r += n; g += n; b += n;
        const vx = (x - S / 2) / (S / 2), vy = (y - S / 2) / (S / 2);
        const fall = 1 - vignette * clamp01((vx * vx + vy * vy) * 0.75 - 0.15);
        const o = p * 4;
        pixels[o] = r * fall * 255; pixels[o + 1] = g * fall * 255; pixels[o + 2] = b * fall * 255; pixels[o + 3] = 255;
      }
      if (y % 180 === 0) await tick();
    }

    const names = { luminous: 'Luminous-sky feature background', watercolour: 'Watercolour pastoral background', evening: 'Evening city dusk' };
    return {
      pixels,
      notes: [
        `${names[tradition]} in ${answers.tint === 'hour' ? "the hour's own" : answers.tint} light${night > 0.5 ? ', turned to night by the dark sky' : ''}`,
        ...notes,
        `${dabs} painted dabs of detail; ${['soft', 'clean', 'hard', 'crystalline'][Math.min(3, Math.floor(hard * 4))]} cel shadows, ${answers.line} line`,
        `${finish} finish`,
      ],
    };
  },
});

/** K-means in RGB with spread-out seeds; close paints merge and slivers fold into a neighbour. */
function kmeans(samples: RGB[], k: number, random: () => number): RGB[] {
  const n = samples.length;
  if (!n) return [[0.5, 0.5, 0.5]];
  const centres: number[][] = [[...samples[Math.floor(random() * n)], 0]];
  const nearest = new Float32Array(n).fill(Infinity);
  while (centres.length < k) {
    const c = centres[centres.length - 1];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      const d = (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2;
      if (d < nearest[i]) nearest[i] = d;
      total += nearest[i];
    }
    if (total < 1e-5) break;
    let pick = random() * total, chosen = n - 1;
    for (let i = 0; i < n; i++) { pick -= nearest[i]; if (pick <= 0) { chosen = i; break; } }
    centres.push([...samples[chosen], 0]);
  }
  for (let round = 0; round < 8; round++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (const s of samples) {
      let best = 0, bestD = Infinity;
      for (let j = 0; j < centres.length; j++) {
        const c = centres[j];
        const d = (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      }
      const t = sums[best];
      t[0] += s[0]; t[1] += s[1]; t[2] += s[2]; t[3]++;
    }
    for (let j = 0; j < centres.length; j++) {
      const t = sums[j];
      if (t[3] > 0) centres[j] = [t[0] / t[3], t[1] / t[3], t[2] / t[3], t[3]];
      else centres[j][3] = 0;
    }
  }
  for (;;) {
    if (centres.length < 2) break;
    let a = -1, b = -1, closest = Infinity;
    for (let i = 0; i < centres.length; i++)
      for (let j = i + 1; j < centres.length; j++) {
        const d = Math.hypot(centres[i][0] - centres[j][0], centres[i][1] - centres[j][1], centres[i][2] - centres[j][2]);
        if (d < closest) { closest = d; a = i; b = j; }
      }
    const tiny = centres.findIndex((c) => c[3] < n * 0.03);
    if (closest >= 0.09 && tiny < 0) break;
    if (closest >= 0.09) {
      a = tiny; b = -1; closest = Infinity;
      for (let j = 0; j < centres.length; j++) {
        if (j === a) continue;
        const d = Math.hypot(centres[a][0] - centres[j][0], centres[a][1] - centres[j][1], centres[a][2] - centres[j][2]);
        if (d < closest) { closest = d; b = j; }
      }
    }
    const wa = centres[a][3] || 1, wb = centres[b][3] || 1, wt = wa + wb;
    centres[b] = [
      (centres[a][0] * wa + centres[b][0] * wb) / wt,
      (centres[a][1] * wa + centres[b][1] * wb) / wt,
      (centres[a][2] * wa + centres[b][2] * wb) / wt,
      wt,
    ];
    centres.splice(a, 1);
  }
  return centres.map((c) => [c[0], c[1], c[2]] as RGB);
}

/** A 3×3 majority vote on the paint labels, never crossing from one thing into another. */
function majority(label: Int16Array, id: Uint8Array, size: number) {
  const out = label.slice();
  const cand = new Int16Array(9), tally = new Int16Array(9);
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      const p = y * size + x;
      if (label[p] < 0) continue;
      const own = id[p];
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const q = p + dy * size + dx;
          if (id[q] !== own) continue;
          const l = label[q];
          let at = -1;
          for (let i = 0; i < n; i++) if (cand[i] === l) { at = i; break; }
          const w = dx === 0 && dy === 0 ? 2 : 1;
          if (at < 0) { cand[n] = l; tally[n] = w; n++; } else tally[at] += w;
        }
      let best = 0;
      for (let i = 1; i < n; i++) if (tally[i] > tally[best]) best = i;
      out[p] = cand[best];
    }
  label.set(out);
}
