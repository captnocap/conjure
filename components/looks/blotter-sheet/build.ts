import { type PaletteRole, choice, clamp01, defineLook, mix, rekey, rekeyOne, score, seeded } from '@conjure/kit';

type RGB = readonly [number, number, number];

/** One ink on the press. `fountain` inks change colour across the sheet (a split-fountain well). */
interface Plate {
  rgb: RGB;
  angle: number;
  fountain?: boolean;
}

interface InkSet {
  name: string;
  /** The last plate is the key: outlines and ornament rules print in it. */
  plates: Plate[];
  /** Separate analytically as cyan, magenta, yellow and black instead of matching a palette. */
  process?: boolean;
}

const INKS: Record<string, InkSet> = {
  process: {
    name: 'four-colour process inks',
    process: true,
    plates: [
      { rgb: [0, 152, 214], angle: 15 },
      { rgb: [222, 18, 120], angle: 75 },
      { rgb: [252, 222, 20], angle: 0 },
      { rgb: [34, 30, 34], angle: 45 },
    ],
  },
  fountain: {
    name: 'a split-fountain rainbow under black',
    plates: [
      { rgb: [150, 150, 150], angle: 15, fountain: true },
      { rgb: [30, 24, 30], angle: 45 },
    ],
  },
  dayglo: {
    name: 'day-glo pink, orange and green over black',
    plates: [
      { rgb: [255, 150, 24], angle: 0 },
      { rgb: [255, 58, 142], angle: 75 },
      { rgb: [52, 196, 84], angle: 15 },
      { rgb: [30, 20, 34], angle: 45 },
    ],
  },
  earth: {
    name: 'ochre, rust and teal with brown-black',
    plates: [
      { rgb: [226, 170, 52], angle: 0 },
      { rgb: [190, 76, 40], angle: 75 },
      { rgb: [38, 112, 108], angle: 15 },
      { rgb: [56, 36, 26], angle: 45 },
    ],
  },
  duotone: {
    name: 'antique gold and oxblood',
    plates: [
      { rgb: [230, 176, 44], angle: 15 },
      { rgb: [112, 22, 40], angle: 45 },
    ],
  },
  mono: {
    name: 'one black ink',
    plates: [{ rgb: [28, 26, 30], angle: 45 }],
  },
};

const PAPERS: Record<string, { tone: RGB; fibre: number; fleck: number; age: number; name: string }> = {
  white: { tone: [247, 246, 241], fibre: 0.5, fleck: 0, age: 0, name: 'bright white blotter' },
  cream: { tone: [244, 235, 212], fibre: 0.8, fleck: 0, age: 0.15, name: 'cream blotter' },
  ivory: { tone: [238, 229, 204], fibre: 1.5, fleck: 0.2, age: 0.2, name: 'thick ivory felt blotter' },
  buff: { tone: [229, 212, 172], fibre: 1, fleck: 0.3, age: 0.9, name: 'aged buff stock' },
  grey: { tone: [228, 226, 219], fibre: 1.1, fleck: 1, age: 0.1, name: 'grey-white recycled stock' },
};

/**
 * Under the idea's palette the spot inks print in its colours, the scene still separated against the
 * inks as designed so every surface keeps its plate: the lead inks take the palette's ink (keeping
 * their offsets), the answering one its second colour, the fountain rainbow turns to start on the ink
 * and the stock is tinted toward the ground. Process inks (true colour) and black keys stay.
 */
const INK_ROLES: Record<string, Record<string, PaletteRole>> = {
  dayglo: { 0: 'ink', 1: 'ink', 2: 'second' },
  earth: { 0: 'ink', 1: 'ink', 2: 'second' },
  duotone: { 0: 'second', 1: 'ink' }, // the dark plate is the key that carries the drawing
};

const RAINBOW: RGB[] = [
  [226, 44, 58],
  [244, 128, 34],
  [248, 210, 46],
  [74, 168, 78],
  [40, 124, 196],
  [138, 64, 160],
];

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
    const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
    const top = a + (b - a) * sx;
    const bottom = c + (d - c) * sx;
    return top + (bottom - top) * sy;
  };
}

/** Separable box blur, run twice for a soft tent. */
function blur(source: Float32Array, size: number, radius: number, passes = 2): Float32Array {
  radius = Math.max(1, Math.round(radius));
  let input = source;
  const temp = new Float32Array(source.length);
  let out = new Float32Array(source.length);
  const span = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < size; y++) {
      const row = y * size;
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += input[row + Math.min(size - 1, Math.max(0, k))];
      for (let x = 0; x < size; x++) {
        temp[row + x] = sum / span;
        sum += input[row + Math.min(size - 1, x + radius + 1)] - input[row + Math.max(0, x - radius)];
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
    if (pass < passes - 1) {
      input = out;
      out = new Float32Array(source.length);
    }
  }
  return out;
}

/** Coverage of a round-dot screen at one pixel: dots below half tone, paper holes above it. */
function screen(x: number, y: number, cos: number, sin: number, period: number, tint: number, gain: number) {
  if (tint <= 0.01) return 0;
  if (tint >= 0.97) return 1;
  let u = (x * cos + y * sin) / period;
  let v = (y * cos - x * sin) / period;
  const holes = tint > 0.56;
  if (holes) { u += 0.5; v += 0.5; }
  u -= Math.floor(u) + 0.5;
  v -= Math.floor(v) + 0.5;
  const distance = Math.sqrt(u * u + v * v) * period;
  const radius = period * Math.sqrt((holes ? 1 - tint : tint) / Math.PI) + (holes ? -gain : gain);
  const cover = clamp01(radius - distance + 0.5);
  return holes ? 1 - cover : cover;
}

const lum = (r: number, g: number, b: number) => r * 0.3 + g * 0.59 + b * 0.11;

function rainbow(t: number, stops: readonly RGB[] = RAINBOW): RGB {
  const f = clamp01(t) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(f));
  const k = f - i;
  const s = k * k * (3 - 2 * k);
  const a = stops[i], b = stops[i + 1];
  return [mix(a[0], b[0], s), mix(a[1], b[1], s), mix(a[2], b[2], s)];
}

/** A skeletal structural formula drawn on a canvas: its ink core and its wider rim. */
function drawFormula(S: number, unit: number, random: () => number, line: number) {
  // Bond-length units. A benzene ring fused to a five-membered ring, a zigzag chain to an amine.
  const h = Math.sqrt(3) / 2;
  const ring6 = [-30, 30, 90, 150, 210, 270].map((a) => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)] as [number, number]);
  const cx5 = h + 0.688, R5 = 0.851;
  const ring5 = [216, 144, 72, 0, 288].map((a) => [cx5 + R5 * Math.cos((a * Math.PI) / 180), R5 * Math.sin((a * Math.PI) / 180)] as [number, number]);
  const deg = (a: number) => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)] as [number, number];
  const add = (p: [number, number], d: [number, number]) => [p[0] + d[0], p[1] + d[1]] as [number, number];
  const c3 = ring5[2];
  const p1 = add(c3, deg(75)), p2 = add(p1, deg(15)), amine = add(p2, deg(75));
  const m1 = add(amine, deg(15)), m2 = add(amine, deg(135));
  const bonds: [[number, number], [number, number], boolean][] = [];
  for (let i = 0; i < 6; i++) bonds.push([ring6[i], ring6[(i + 1) % 6], i % 2 === 1]);
  bonds.push([ring5[1], ring5[2], false], [ring5[2], ring5[3], true], [ring5[3], ring5[4], false], [ring5[4], ring5[0], false]);
  bonds.push([c3, p1, false], [p1, p2, false], [p2, amine, false], [amine, m1, false], [amine, m2, false]);
  const labels: [[number, number], string][] = [[ring5[4], 'NH'], [amine, 'N']];
  const substituent = Math.floor(random() * 3);
  let name = 'a tryptamine skeleton';
  if (substituent > 0) {
    const at = ring6[substituent === 1 ? 3 : 4];
    const dir = substituent === 1 ? 150 : 210;
    const o = add(at, deg(dir));
    bonds.push([at, o, false]);
    if (random() < 0.5) { labels.push([o, 'OH']); name = 'a hydroxylated tryptamine skeleton'; }
    else { const me = add(o, deg(dir - 60)); bonds.push([o, me, false]); labels.push([o, 'O']); name = 'a methoxy tryptamine skeleton'; }
  }
  // Fit and turn.
  const pts = bonds.flatMap((b) => [b[0], b[1]]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const turn = (random() - 0.5) * 0.9;
  const scale = (S * 0.76) / Math.max(x1 - x0, y1 - y0);
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const ox = S / 2 + (random() - 0.5) * S * 0.06, oy = S / 2 + (random() - 0.5) * S * 0.06;
  const coreW = mix(6, 10, line) * unit;
  const rimW = mix(2.2, 3.4, line) * unit;
  const gapAt = (p: [number, number]) => labels.some(([q]) => q === p);
  const draw = (pen: CanvasRenderingContext2D, width: number, rim: number) => {
    pen.lineCap = 'round';
    pen.lineJoin = 'round';
    pen.strokeStyle = '#ff0000';
    pen.fillStyle = '#ff0000';
    pen.lineWidth = (width + rim * 2) / scale;
    for (const [a, b, double] of bonds) {
      // shorten bonds into labelled atoms
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const ta = gapAt(a) ? 0.32 : 0, tb = gapAt(b) ? 0.32 : 0;
      pen.beginPath();
      pen.moveTo(a[0] + dx * ta, a[1] + dy * ta);
      pen.lineTo(b[0] - dx * tb, b[1] - dy * tb);
      pen.stroke();
      if (double) {
        // a second, shorter line toward the ring's centre
        const ring = bonds.indexOf(bonds.find((bond) => bond[0] === a && bond[1] === b)!) < 6 ? [0, 0] : [cx5, 0];
        const midx = (a[0] + b[0]) / 2, midy = (a[1] + b[1]) / 2;
        const ix = ring[0] - midx, iy = ring[1] - midy;
        const il = Math.hypot(ix, iy) || 1;
        const off = 0.24;
        pen.beginPath();
        pen.moveTo(a[0] + dx * 0.2 + (ix / il) * off, a[1] + dy * 0.2 + (iy / il) * off);
        pen.lineTo(b[0] - dx * 0.2 + (ix / il) * off, b[1] - dy * 0.2 + (iy / il) * off);
        pen.stroke();
      }
    }
    pen.textAlign = 'center';
    pen.textBaseline = 'middle';
    for (const [[x, y], text] of labels) {
      pen.save();
      pen.translate(x, y);
      pen.scale(1 / scale, 1 / scale);
      pen.rotate(-turn);
      const px = Math.round(0.5 * scale);
      pen.font = `900 ${px}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      if (rim > 0) {
        pen.lineWidth = rim * 2;
        pen.strokeText(text, 0, 0);
      }
      pen.fillText(text, 0, 0);
      pen.restore();
    }
  };
  const alphaOf = (rim: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const pen = canvas.getContext('2d', { willReadFrequently: true })!;
    pen.translate(ox, oy);
    pen.rotate(turn);
    pen.scale(scale, scale);
    pen.translate(-mx, -my);
    draw(pen, coreW, rim);
    const data = pen.getImageData(0, 0, S, S).data;
    const alpha = new Float32Array(S * S);
    for (let p = 0; p < S * S; p++) alpha[p] = data[p * 4 + 3] / 255;
    return alpha;
  };
  return { core: alphaOf(0), wide: alphaOf(rimW), name };
}

export default defineLook({
  questions: {
    tabs: score('How big are the perforated tabs?', [
      'Fine tabs, thirty-odd to a side: the perforations lie over the picture like a dense mesh',
      'Standard quarter-inch tabs, about two dozen to a side',
      'Generous tabs: the picture reads in clear squares',
      'Big tabs, a dozen to a side',
      'Huge tabs, eight to a side, each one a little picture of its own',
    ]),
    layout: choice('How is the art laid across the sheet?', {
      whole: 'One picture printed across the whole sheet and cut into tabs like a jigsaw: each tab holds a fragment of the scene.',
      tiled: 'The main subject repeated as a small icon on every single tab, over a pale one-ink ghost of the whole scene.',
      border: 'A centre picture framed by an ornamental border of tabs, each border tab carrying the subject as an icon on a solid ink ground.',
      medallion: 'The scene in a round medallion at the centre of a radiating sunburst or an eight-fold star rosette of alternating inks, the classic psychedelic eye.',
      formula: 'One picture across the sheet with a big skeletal structural formula overprinted in a second ink: fused hexagon and pentagon rings, zigzag bonds and atom letters, like a chemistry diagram.',
    }),
    inks: choice('Which inks did the printer run? Spot inks take their colours from the picture\u2019s palette.', {
      process: 'Four-colour process: cyan, magenta, yellow and black, the picture close to its true colours.',
      fountain: 'A split-fountain rainbow: one ink well loaded with bands of colour that blend through the whole spectrum across the sheet, under a black key.',
      dayglo: 'Day-glo spot inks: three fluorescent, blazing, acid-bright colours over black, loud as a sixties concert poster.',
      earth: 'Seventies earthy spot inks: three muted, dusty, sun-faded colours and a brown-black, like an album sleeve.',
      duotone: 'A two-colour job: a deep, dark key ink over a light glowing one, rich and a little occult.',
      mono: 'One ink only: black on the bare stock, a cheap, stark underground run.',
    }),
    method: choice('How was the sheet printed?', {
      offset: 'Offset litho: a fine halftone dot screen, tones and gradients built from tiny dots.',
      screen: 'Screen-printed: flat solid areas of each ink with hard edges, posterised into a few bold shapes.',
      grain: 'A grainy stencil-duplicator run: tones stippled from a mottled grain, a little home-made.',
    }),
    line: score('How heavily is the drawing keyed in outline?', [
      'No outline: colour shapes only',
      'A fine hairline key',
      "A clear illustrator's line",
      'A bold cartoon line',
      'Heavy, woodcut-thick outlines',
    ]),
    registration: score('How well did the ink plates line up on press?', [
      'Dead on',
      'A whisker out',
      'Visibly slipped: colour peeks past the line',
      'Badly off: every ink throws a ghost',
    ]),
    bleed: score('How much does the ink bleed into the soft blotter?', [
      'Crisp: the ink sits on the surface',
      'A slight softening',
      'Visibly feathered edges',
      'Soaked: every dark mark wicks out a furry halo',
    ]),
    paper: choice('What stock is it printed on?', {
      white: 'Bright white blotter, clean and new-looking.',
      cream: 'Soft cream blotter, warm and absorbent.',
      ivory: 'Thick ivory felt-like blotter with visible fibres and tooth.',
      buff: 'Aged buff stock gone yellow toward the edges, years in a drawer.',
      grey: 'Grey-white recycled stock with dark flecks.',
    }),
    state: choice('What has happened to this sheet since it was printed?', {
      fresh: 'Nothing: a crisp, flat, uncut sheet straight from the printer, laid square on the table.',
      handled: 'It has been handled and carried: a corner curls up off the table and soft creases cross it.',
      folded: 'It was folded in quarters to hide in a book and opened out again: two deep creases cross at the centre.',
      torn: 'A few tabs have been torn away along the perforations, leaving gaps that show the dark table beneath.',
      cut: 'A strip of tabs has been cut off one edge with scissors, a staircase of missing squares.',
    }),
  },

  async apply(capture, answers, context, signal) {
    const S = capture.size;
    const N = S * S;
    const unit = S / 720;
    const { color, normal, depth, identity, diffuse } = capture;
    const mood = context.mood;
    const random = seeded((context.seed ^ 0x6b10773e) >>> 0);
    const inks = INKS[answers.inks];
    const plates = inks.plates;
    const P = plates.length;
    const KEY = P - 1;
    const paperSpec = PAPERS[answers.paper];
    const wear = mood.wear;
    const bleed = answers.bleed;
    const method = answers.method;
    const layout = answers.layout;
    const state = answers.state;

    // The inks as they print under the idea's palette (separation still matches the designed inks).
    const { palette } = context;
    const keyedInks = rekey(Object.fromEntries(plates.map((plate, i) => [i, plate.rgb])) as Record<string, RGB>, palette, INK_ROLES[answers.inks] ?? {});
    const inkRGB = plates.map((_, i) => keyedInks[i]);
    const keyedRainbow = rekey(Object.fromEntries(RAINBOW.map((c, i) => [i, c])) as Record<string, RGB>, palette,
      Object.fromEntries(RAINBOW.map((_, i) => [i, 'ink' as PaletteRole])));
    const stops = RAINBOW.map((_, i) => keyedRainbow[i]);

    // Paper tone, nudged by warmth.
    const tone = rekeyOne(paperSpec.tone, palette, 'ground');
    const warm = (mood.warmth - 0.5) * 10;
    const paper: [number, number, number] = [
      Math.min(255, tone[0] + warm),
      tone[1] + warm * 0.2,
      Math.max(0, tone[2] - warm * 1.2),
    ];

    // ---- read the capture ----------------------------------------------------------------------
    const id = new Uint8Array(N);
    const far = new Float32Array(N);
    const lit = new Float32Array(N);
    const counts = new Uint32Array(256);
    const boxes = new Int32Array(256 * 4);
    for (let i = 0; i < 256; i++) { boxes[i * 4] = S; boxes[i * 4 + 1] = S; boxes[i * 4 + 2] = -1; boxes[i * 4 + 3] = -1; }
    const histogram = new Uint32Array(256);
    const lumHist = new Uint32Array(256);
    let nearest = 1, farthest = 0;
    for (let p = 0; p < N; p++) {
      const at = p * 4;
      const v = identity[at];
      id[p] = v;
      far[p] = v === 0 ? 1 : (depth[at] * 65536 + depth[at + 1] * 256 + depth[at + 2]) / 16777216;
      lit[p] = lum(diffuse[at], diffuse[at + 1], diffuse[at + 2]);
      counts[v]++;
      const x = p % S, y = (p / S) | 0;
      const b = v * 4;
      if (x < boxes[b]) boxes[b] = x;
      if (y < boxes[b + 1]) boxes[b + 1] = y;
      if (x > boxes[b + 2]) boxes[b + 2] = x;
      if (y > boxes[b + 3]) boxes[b + 3] = y;
      if (v > 0) {
        histogram[Math.min(255, Math.round(lit[p]))]++;
        lumHist[Math.min(255, Math.round(lum(color[at], color[at + 1], color[at + 2])))]++;
        if (far[p] < nearest) nearest = far[p];
        if (far[p] > farthest) farthest = far[p];
      }
    }
    const percentile = (hist: Uint32Array, q: number) => {
      let total = 0;
      for (let v = 0; v < 256; v++) total += hist[v];
      let seen = 0;
      for (let v = 0; v < 256; v++) {
        seen += hist[v];
        if (seen >= total * q) return v;
      }
      return 255;
    };
    const bright = Math.max(8, percentile(histogram, 0.92));
    for (let p = 0; p < N; p++) lit[p] = Math.min(1.2, lit[p] / bright);
    const lowL = percentile(lumHist, 0.02) / 255;
    const highL = Math.max(lowL + 0.2, percentile(lumHist, 0.985) / 255);
    const depthSpan = Math.max(1e-6, farthest - nearest);

    /** How big a thing is, as a mark multiplier: small things take small marks. */
    const markOf = new Float32Array(256);
    for (let v = 0; v < 256; v++) markOf[v] = v <= 2 ? 1 : clamp01(Math.sqrt(counts[v]) / 210) * 0.75 + 0.38;

    // Hero for icons: id 3 if it shows, else the biggest placed thing, else the set, else the centre.
    let hero = -1;
    if (counts[3] > 120) hero = 3;
    else {
      let best = 120;
      for (let v = 3; v < 256; v++) if (counts[v] > best) { best = counts[v]; hero = v; }
      if (hero < 0 && counts[2] > 400) hero = 2;
    }

    // Edge-aware smoothing of the colour: flatten each surface a little before separation.
    const planes = [0, 1, 2].map((channel) => {
      const plane = new Float32Array(N);
      for (let p = 0; p < N; p++) plane[p] = color[p * 4 + channel];
      return plane;
    });
    const softR = Math.max(1, Math.round(2 * unit));
    const soft = planes.map((plane) => blur(plane, S, softR, 1));
    const smooth = (p: number, channel: number) => {
      const x = p % S, y = (p / S) | 0;
      const r = softR + 1;
      const v = id[p];
      if (markOf[v] < 0.7) return planes[channel][p];
      if (x < r || y < r || x >= S - r || y >= S - r) return planes[channel][p];
      if (id[p - r] !== v || id[p + r] !== v || id[p - r * S] !== v || id[p + r * S] !== v) return planes[channel][p];
      return soft[channel][p];
    };
    signal.throwIfAborted();
    await pause();

    // ---- the sheet grid ------------------------------------------------------------------------
    const tabsPerSide = Math.max(6, Math.round(mix(32, 8, Math.pow(answers.tabs, 0.85))));
    const tab = S / tabsPerSide;

    // ---- lay the art across the sheet ---------------------------------------------------------
    // cls: 0 picture, 1 ghost picture (one pale ink), 2 icon, 3 ornament (direct coverage)
    const cls = new Uint8Array(N);
    const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
    const sid = new Uint8Array(N);
    const sfar = new Float32Array(N);
    const snormal = new Int32Array(N).fill(-1);
    const smark = new Float32Array(N);
    const direct = plates.map(() => new Float32Array(N));
    const keyDirect = new Float32Array(N);
    const ICON = 240, GROUNDTAB = 241, ORNAMENT = 242;

    const takePicture = (p: number, q: number, scale: number, kind: number) => {
      cls[p] = kind;
      sR[p] = smooth(q, 0);
      sG[p] = smooth(q, 1);
      sB[p] = smooth(q, 2);
      sid[p] = id[q];
      sfar[p] = far[q];
      snormal[p] = q;
      smark[p] = markOf[id[q]] * scale;
    };

    // The icon: the hero's silhouette averaged down to the size of a tab.
    const iconFill = layout === 'tiled' ? 0.72 : 0.7;
    const T = Math.max(6, Math.round(tab * iconFill));
    const iconR = new Float32Array(T * T), iconG = new Float32Array(T * T), iconB = new Float32Array(T * T);
    const iconCover = new Float32Array(T * T);
    let iconLo = 0, iconHi = 1;
    if (layout === 'tiled' || layout === 'border') {
      let x0: number, y0: number, side: number;
      if (hero >= 0) {
        const b = hero * 4;
        const w = boxes[b + 2] - boxes[b] + 1, h = boxes[b + 3] - boxes[b + 1] + 1;
        side = Math.max(w, h) * 1.08;
        x0 = (boxes[b] + boxes[b + 2]) / 2 - side / 2;
        y0 = (boxes[b + 1] + boxes[b + 3]) / 2 - side / 2;
      } else {
        side = S * 0.5;
        x0 = S * 0.25;
        y0 = S * 0.25;
      }
      const block = side / T;
      const steps = Math.max(1, Math.min(4, Math.round(block)));
      for (let iy = 0; iy < T; iy++)
        for (let ix = 0; ix < T; ix++) {
          let r = 0, g = 0, bl = 0, n = 0, all = 0;
          for (let a = 0; a < steps; a++)
            for (let c = 0; c < steps; c++) {
              const sx = Math.floor(x0 + (ix + (c + 0.5) / steps) * block);
              const sy = Math.floor(y0 + (iy + (a + 0.5) / steps) * block);
              all++;
              if (sx < 0 || sy < 0 || sx >= S || sy >= S) continue;
              const q = sy * S + sx;
              if (hero >= 0 && id[q] !== hero) continue;
              r += color[q * 4];
              g += color[q * 4 + 1];
              bl += color[q * 4 + 2];
              n++;
            }
          const k = iy * T + ix;
          iconCover[k] = n / all;
          if (n) { iconR[k] = r / n; iconG[k] = g / n; iconB[k] = bl / n; }
        }
      let lo = 1, hi = 0;
      for (let k = 0; k < T * T; k++) {
        if (iconCover[k] < 0.45) continue;
        const l = lum(iconR[k], iconG[k], iconB[k]) / 255;
        if (l < lo) lo = l;
        if (l > hi) hi = l;
      }
      iconLo = Math.max(0, lo - 0.08);
      iconHi = Math.max(iconLo + 0.25, hi + 0.12);
    }
    const placeIcon = (p: number, lx: number, ly: number) => {
      // lx, ly: pixel offset inside the tab; returns true if an icon pixel landed here.
      const off = (tab - T) / 2;
      const ix = Math.floor(lx - off), iy = Math.floor(ly - off);
      if (ix < 0 || iy < 0 || ix >= T || iy >= T) return false;
      const k = iy * T + ix;
      if (iconCover[k] < 0.45) return false;
      cls[p] = 2;
      sR[p] = iconR[k];
      sG[p] = iconG[k];
      sB[p] = iconB[k];
      sid[p] = ICON;
      smark[p] = 0.4;
      return true;
    };

    // Plates used for ornament: two inks that are not the key when the set has them.
    const inkA = P >= 2 ? 0 : KEY;
    const inkB = P >= 4 ? 1 : -1;
    const ghostPlate = P === 1 ? 0 : (() => {
      let best = 0, gap = Infinity;
      for (let i = 0; i < KEY; i++) {
        const l = plates[i].fountain ? 150 : lum(...plates[i].rgb);
        if (Math.abs(l - 150) < gap) { gap = Math.abs(l - 150); best = i; }
      }
      return best;
    })();

    const borderTabs = layout === 'border' ? (tabsPerSide >= 22 ? 2 : 1) : 0;
    const inner0 = borderTabs * tab, inner1 = S - borderTabs * tab;
    const innerScale = (inner1 - inner0) / S;
    const medR = S * 0.355;
    const medBand = 13 * unit;
    const medCrop = 0.94;
    const rays = Math.round(mix(20, 36, random()));
    const rosette = random() < 0.45;
    const twist = (mood.energy - 0.3) * 2.2 * (random() < 0.5 ? -1 : 1);

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        if (layout === 'whole' || layout === 'formula') takePicture(p, p, 1, 0);
        else if (layout === 'tiled') {
          const lx = x - Math.floor(x / tab) * tab, ly = y - Math.floor(y / tab) * tab;
          if (!placeIcon(p, lx, ly)) {
            takePicture(p, p, 1, 1);
            sid[p] = GROUNDTAB;
          }
        } else if (layout === 'border') {
          if (x >= inner0 && x < inner1 && y >= inner0 && y < inner1) {
            const qx = Math.min(S - 1, Math.floor((x - inner0) / innerScale));
            const qy = Math.min(S - 1, Math.floor((y - inner0) / innerScale));
            takePicture(p, qy * S + qx, innerScale, 0);
            // A double rule just inside the frame.
            const edge = Math.min(x - inner0, inner1 - 1 - x, y - inner0, inner1 - 1 - y);
            const rule = clamp01(2.6 * unit - edge + 0.5) + clamp01(0.8 * unit - Math.abs(edge - 5.6 * unit) + 0.5);
            if (rule > 0) keyDirect[p] = Math.max(keyDirect[p], clamp01(rule));
          } else {
            const cx = Math.floor(x / tab), cy = Math.floor(y / tab);
            const lx = x - cx * tab, ly = y - cy * tab;
            if (!placeIcon(p, lx, ly)) {
              cls[p] = 3;
              sid[p] = GROUNDTAB;
              const odd = (cx + cy) % 2 === 1;
              if (inkB >= 0) direct[odd ? inkB : inkA][p] = 1;
              else if (inkA !== KEY) direct[inkA][p] = odd ? 1 : 0.4;
              else direct[KEY][p] = odd ? 0.85 : 0.3;
            }
          }
        } else {
          // medallion
          const dx = x - S / 2, dy = y - S / 2;
          const r = Math.hypot(dx, dy);
          if (r < medR) {
            const qx = Math.min(S - 1, Math.max(0, Math.floor((dx / (2 * medR)) * S * medCrop + S / 2)));
            const qy = Math.min(S - 1, Math.max(0, Math.floor((dy / (2 * medR)) * S * medCrop + S / 2)));
            takePicture(p, qy * S + qx, (2 * medR) / (S * medCrop), 0);
            const ring = clamp01(2.8 * unit - (medR - r) + 0.5);
            if (ring > 0) keyDirect[p] = Math.max(keyDirect[p], ring);
          } else {
            cls[p] = 3;
            sid[p] = ORNAMENT;
            if (r < medR + medBand) {
              // paper band between two rules, dotted with ink beads
              const outer = clamp01(1.3 * unit - Math.abs(r - (medR + medBand - 1.3 * unit)) + 0.5);
              const inner = clamp01(2.8 * unit - (r - medR) + 0.5);
              const beads = 72;
              const angle = Math.atan2(dy, dx);
              const t = (((angle / (2 * Math.PI)) * beads) % 1 + 1) % 1;
              const bx = (t - 0.5) * ((2 * Math.PI * (medR + medBand * 0.5)) / beads);
              const by = r - (medR + medBand * 0.55);
              const bead = clamp01(2.0 * unit - Math.hypot(bx, by) + 0.5);
              keyDirect[p] = Math.max(inner, outer);
              direct[inkA === KEY ? KEY : inkA][p] = Math.max(direct[inkA === KEY ? KEY : inkA][p], bead);
            } else if (rosette) {
              // Interleaved eight-pointed stars: each ring of the rosette turns by a sixteenth.
              const angle = Math.atan2(dy, dx) + twist * 0.25 * (r / S);
              const shapeAt = (turn: number) => {
                const t = ((((angle + turn) / (2 * Math.PI)) * 8) % 1 + 1) % 1;
                return 1 - 0.3 * Math.abs(t - 0.5) * 2;
              };
              const bandW = S * 0.052;
              const d0 = (r - medR - medBand) / bandW;
              let band = Math.floor(d0 / shapeAt(0));
              const turn = band % 2 === 0 ? 0 : Math.PI / 8;
              const d = (r - medR - medBand) / (bandW * shapeAt(turn));
              band = Math.floor(d);
              const within = d - band;
              const edgePx = Math.min(within, 1 - within) * bandW;
              const aa = clamp01(edgePx + 0.5);
              const inA = band % 2 === 0;
              if (inkB >= 0) direct[inA ? inkA : inkB][p] = aa;
              else if (inkA !== KEY) direct[inkA][p] = inA ? aa : aa * 0.35;
              else direct[KEY][p] = inA ? aa : 0;
              if (answers.line > 0.12) keyDirect[p] = Math.max(keyDirect[p], clamp01(0.9 * unit - edgePx + 0.5) * 0.9);
            } else {
              const angle = Math.atan2(dy, dx) + twist * (r / S);
              const seg = (((angle / (2 * Math.PI)) * rays) % 1 + 1) % 1;
              const arc = (2 * Math.PI * r) / rays;
              const distEdge = Math.min(seg, Math.abs(seg - 0.5), 1 - seg) * arc;
              const inA = seg < 0.5;
              const aa = clamp01(distEdge + 0.5);
              // a fine key rule between rays
              const rule = clamp01(0.7 * unit * (0.6 + r / S) - distEdge + 0.5);
              if (inkB >= 0) {
                direct[inA ? inkA : inkB][p] = aa;
              } else if (inkA !== KEY) {
                direct[inkA][p] = inA ? aa : 0;
              } else {
                direct[KEY][p] = inA ? aa : 0;
              }
              if (answers.line > 0.12) keyDirect[p] = Math.max(keyDirect[p], rule * 0.9);
            }
          }
        }
      }
      if ((y & 63) === 0) signal.throwIfAborted();
    }
    signal.throwIfAborted();
    await pause();

    // ---- colour separation --------------------------------------------------------------------
    const levels = method === 'screen' ? [0, 1] : P >= 4 ? [0, 0.3, 0.6, 1] : P === 3 ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.25, 0.4, 0.55, 0.7, 0.85, 1];
    const pr = paper[0] / 255, pg = paper[1] / 255, pb = paper[2] / 255;
    const plateRGB = plates.map((plate) => (plate.fountain ? [0.56, 0.56, 0.56] : plate.rgb.map((v) => v / 255)));
    // Every combination of tints the press could lay down, and the colour it gives on this paper.
    const combos: number[][] = [[]];
    for (let i = 0; i < P; i++) {
      const next: number[][] = [];
      for (const combo of combos) for (const level of levels) next.push([...combo, level]);
      combos.length = 0;
      combos.push(...next);
    }
    const comboColour = combos.map((combo) => {
      let r = pr, g = pg, b = pb;
      combo.forEach((level, i) => {
        r *= 1 - level * (1 - plateRGB[i][0]);
        g *= 1 - level * (1 - plateRGB[i][1]);
        b *= 1 - level * (1 - plateRGB[i][2]);
      });
      return [r, g, b];
    });
    let darkest = 1;
    for (const c of comboColour) darkest = Math.min(darkest, lum(c[0], c[1], c[2]));
    const paperL = lum(pr, pg, pb);
    const saturation = mix(1.05, 1.55, mood.cheer) * (answers.inks === 'process' ? 1 : 1.25);
    const adjust = (r: number, g: number, b: number, out: number[], lo = lowL, hi = highL) => {
      r /= 255; g /= 255; b /= 255;
      const L = lum(r, g, b);
      const t = clamp01((L - lo) / (hi - lo));
      const target = mix(darkest + 0.04, paperL * 0.99, t);
      const ratio = L > 0.004 ? target / L : 0;
      let R = r * ratio, G = g * ratio, B = b * ratio;
      const grey = target;
      R = clamp01(grey + (R - grey) * saturation);
      G = clamp01(grey + (G - grey) * saturation);
      B = clamp01(grey + (B - grey) * saturation);
      out[0] = R; out[1] = G; out[2] = B; out[3] = t;
    };
    const BINS = 18;
    const lut = new Int32Array(BINS * BINS * BINS).fill(-1);
    const matchCombo = (R: number, G: number, B: number) => {
      const L = lum(R, G, B), A = R - G, Bo = (R + G) / 2 - B;
      let best = 0, bestD = Infinity;
      for (let c = 0; c < combos.length; c++) {
        const col = comboColour[c];
        const l = lum(col[0], col[1], col[2]);
        const dl = l - L, da = col[0] - col[1] - A, db = (col[0] + col[1]) / 2 - col[2] - Bo;
        let d = 3.2 * dl * dl + da * da + db * db;
        const combo = combos[c];
        // Prefer clean colour over a muddy pile of every ink.
        let total = 0;
        for (let i = 0; i < P; i++) total += combo[i];
        d += total * 0.0025 + combo[KEY] * 0.004;
        if (d < bestD) { bestD = d; best = c; }
      }
      return best;
    };
    const cov = plates.map(() => new Float32Array(N));
    const tmp = [0, 0, 0, 0];
    for (let p = 0; p < N; p++) {
      const k = cls[p];
      if (k === 3) {
        for (let i = 0; i < P; i++) cov[i][p] = direct[i][p];
        continue;
      }
      if (k === 2) adjust(sR[p], sG[p], sB[p], tmp, iconLo, iconHi);
      else adjust(sR[p], sG[p], sB[p], tmp);
      if (k === 1) {
        cov[ghostPlate][p] = clamp01(Math.pow(1 - tmp[3], 0.8) * 0.82 + (1 - Math.min(1, lit[p])) * 0.18 + 0.04);
        continue;
      }
      if (inks.process) {
        const r = clamp01(tmp[0] / pr), g = clamp01(tmp[1] / pg), b = clamp01(tmp[2] / pb);
        const kRaw = 1 - Math.max(r, g, b);
        const K = Math.pow(clamp01((kRaw - 0.3) / 0.7), 1.15);
        const keep = 1 - K * 0.85;
        cov[0][p] = clamp01((1 - r - K * 0.9) / Math.max(0.15, keep));
        cov[1][p] = clamp01((1 - g - K * 0.9) / Math.max(0.15, keep));
        cov[2][p] = clamp01((1 - b - K * 0.9) / Math.max(0.15, keep));
        cov[3][p] = K;
        continue;
      }
      const bi = Math.min(BINS - 1, Math.floor(tmp[0] * BINS));
      const bj = Math.min(BINS - 1, Math.floor(tmp[1] * BINS));
      const bk = Math.min(BINS - 1, Math.floor(tmp[2] * BINS));
      const bin = (bi * BINS + bj) * BINS + bk;
      if (lut[bin] < 0) lut[bin] = matchCombo((bi + 0.5) / BINS, (bj + 0.5) / BINS, (bk + 0.5) / BINS);
      const combo = combos[lut[bin]];
      for (let i = 0; i < P; i++) cov[i][p] = combo[i];
    }
    signal.throwIfAborted();
    await pause();
    // Soften the tint steps of a dot screen so gradients do not band (not for flat screen print).
    if (method !== 'screen' && !inks.process)
      for (let i = 0; i < P; i++) {
        const soft2 = blur(cov[i], S, Math.max(1, Math.round(1.5 * unit)), 1);
        for (let p = 0; p < N; p++) if (cls[p] !== 3) cov[i][p] = soft2[p];
      }
    let formulaNote = '';
    if (layout === 'formula') {
      const art = drawFormula(S, unit, random, answers.line);
      formulaNote = art.name;
      // Bonds print as a light ink (or bare paper) held by a key-ink rim, so they read on any ground.
      let light = -1, best = -1;
      for (let i = 0; i < KEY; i++) {
        const l = plates[i].fountain ? 250 : lum(...plates[i].rgb);
        if (l > light) { light = l; best = i; }
      }
      for (let p = 0; p < N; p++) {
        const w = art.wide[p];
        if (w <= 0) continue;
        const c = art.core[p];
        for (let i = 0; i < P; i++) cov[i][p] *= 1 - w;
        if (best >= 0) cov[best][p] = Math.max(cov[best][p], c);
        keyDirect[p] = Math.max(keyDirect[p], w * (1 - c));
      }
    }

    // The ghost picture keeps its silhouettes: a fine line in the ghost ink where things meet.
    if (layout === 'tiled') {
      const ghostLine = new Float32Array(N);
      for (let y = 1; y < S - 1; y++)
        for (let x = 1; x < S - 1; x++) {
          const p = y * S + x;
          const v = id[p];
          let edge = false;
          for (const q of [p + 1, p + S, p - 1, p - S]) if (id[q] !== v && far[p] <= far[q]) { edge = true; break; }
          if (!edge) continue;
          const w = Math.max(0.6, 1.3 * unit * markOf[v]);
          const reach = Math.ceil(w + 1);
          for (let dy = -reach; dy <= reach; dy++)
            for (let dx = -reach; dx <= reach; dx++) {
              const yy = y + dy, xx = x + dx;
              if (yy < 0 || xx < 0 || yy >= S || xx >= S) continue;
              const c = clamp01(w - Math.hypot(dx, dy) + 0.5);
              const q = yy * S + xx;
              if (c > ghostLine[q]) ghostLine[q] = c;
            }
        }
      for (let p = 0; p < N; p++) if (cls[p] === 1 && ghostLine[p] > 0) cov[ghostPlate][p] = Math.max(cov[ghostPlate][p], ghostLine[p] > 0.5 ? 1 : ghostLine[p]);
      signal.throwIfAborted();
    }

    // ---- the key line ------------------------------------------------------------------------
    const key = new Float32Array(N);
    const base = answers.line < 0.1 ? 0 : mix(0.6, 3.4, Math.pow(answers.line, 1.1)) * unit;
    const range = capture.far - capture.near;
    const jump = Math.max(capture.pixelWorldSize * 3.5, range * 0.0004) / Math.max(1e-6, range);
    const stamp = (cx: number, cy: number, w: number) => {
      const reach = Math.ceil(w + 1);
      for (let dy = -reach; dy <= reach; dy++) {
        const y = cy + dy;
        if (y < 0 || y >= S) continue;
        for (let dx = -reach; dx <= reach; dx++) {
          const x = cx + dx;
          if (x < 0 || x >= S) continue;
          const c = clamp01(w - Math.hypot(dx, dy) + 0.5);
          const q = y * S + x;
          if (c > key[q]) key[q] = c;
        }
      }
    };
    const wobble = noiseField((context.seed * 17 + 3) | 0);
    for (let y = 1; y < S - 1; y++) {
      for (let x = 1; x < S - 1; x++) {
        const p = y * S + x;
        const c = cls[p];
        if (c === 1 || c === 3) continue;
        const v = sid[p];
        let kind = 0;
        if (c === 2) {
          if (sid[p + 1] !== ICON || sid[p - 1] !== ICON || sid[p + S] !== ICON || sid[p - S] !== ICON) kind = 4;
        } else {
          if (base <= 0) continue;
          const right = p + 1, down = p + S;
          if ((cls[right] === 0 && sid[right] !== v) || (cls[down] === 0 && sid[down] !== v)) {
            const other = sid[right] !== v ? right : down;
            if (sfar[p] <= sfar[other]) kind = 3;
          }
          if (!kind && ((cls[p - 1] === 0 && sid[p - 1] !== v) || (cls[p - S] === 0 && sid[p - S] !== v))) {
            const other = sid[p - 1] !== v ? p - 1 : p - S;
            if (sfar[p] <= sfar[other]) kind = 3;
          }
          if (!kind && v > 0 && smark[p] > 0.55 && sid[p + 1] === v && sid[p + S] === v && sid[p - 1] === v && sid[p - S] === v) {
            const bend = Math.max(Math.abs(sfar[p - 1] - 2 * sfar[p] + sfar[p + 1]), Math.abs(sfar[p - S] - 2 * sfar[p] + sfar[p + S]));
            if (bend > jump && sfar[p] <= Math.min(sfar[p - 1], sfar[p + 1], sfar[p - S], sfar[p + S]) + jump * 0.5) kind = 2;
            else if (answers.line > 0.35) {
              const q = snormal[p], qa = snormal[p + 1], qc = snormal[p + S];
              if (q >= 0 && qa >= 0 && qc >= 0) {
                const at = q * 4, a = qa * 4, cc = qc * 4;
                const nx = normal[at] - 128, ny = normal[at + 1] - 128, nz = normal[at + 2] - 128;
                const dr = (nx * (normal[a] - 128) + ny * (normal[a + 1] - 128) + nz * (normal[a + 2] - 128)) / 16129;
                const dd = (nx * (normal[cc] - 128) + ny * (normal[cc + 1] - 128) + nz * (normal[cc + 2] - 128)) / 16129;
                if (Math.min(dr, dd) < (v === 1 ? 0.45 : 0.68)) kind = 1;
              }
            }
          }
        }
        if (!kind) continue;
        let w: number;
        if (kind === 4) w = Math.max(0.55 * unit, base * 0.38) * mix(0.8, 1.4, tab / (60 * unit));
        else {
          const nearness = clamp01(1 - (sfar[p] - nearest) / depthSpan);
          const pen = mix(0.75, 1.3, wobble(x / (30 * unit), y / (30 * unit)));
          const kindWidth = kind === 3 ? 1 : kind === 2 ? 0.7 : 0.42;
          w = base * kindWidth * pen * smark[p] * mix(0.8, 1.2, nearness);
          if (v <= 1) w *= 0.7;
        }
        if (w < 0.3) continue;
        stamp(x, y, w);
      }
      if ((y & 63) === 0) signal.throwIfAborted();
    }
    for (let p = 0; p < N; p++) if (keyDirect[p] > key[p]) key[p] = keyDirect[p];
    signal.throwIfAborted();
    await pause();

    // ---- screening, registration and the paper drinking the ink --------------------------------
    const fine = noiseField((context.seed * 131 + 91) | 0);
    const low = noiseField((context.seed * 31 + 7) | 0);
    const fibreSeeds = [0, 1, 2].map((k) => noiseField((context.seed * 7 + 13 * (k + 1)) | 0));
    const fibreAngles = [random() * Math.PI, random() * Math.PI, random() * Math.PI];
    // Fibre texture of the stock, -0.5..0.5: short streaks at three orientations plus tooth.
    const fibre = new Float32Array(N);
    const tooth = new Float32Array(N);
    {
      const fu = 1 / unit;
      const cs = fibreAngles.map(Math.cos), sn = fibreAngles.map(Math.sin);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const p = y * S + x;
          let f = 0;
          for (let k = 0; k < 3; k++) {
            const along = (x * cs[k] + y * sn[k]) * fu, across = (y * cs[k] - x * sn[k]) * fu;
            const n = fibreSeeds[k](along / 9, across / 1.1);
            f += Math.max(0, n - 0.62) * 2.6;
          }
          fibre[p] = f;
          tooth[p] = fine(x * fu / 1.2, y * fu / 1.2) - 0.5 + (low(x * fu / 7, y * fu / 7) - 0.5) * 0.6;
        }
    }
    signal.throwIfAborted();
    await pause();

    const regAmount = answers.registration * 6 * unit + mood.energy * 0.6 * unit;
    const offsets = plates.map((_, i) => {
      if (i === KEY) return [0, 0];
      const a = random() * Math.PI * 2;
      const m = regAmount * mix(0.5, 1, random());
      return [Math.round(Math.cos(a) * m), Math.round(Math.sin(a) * m)];
    });
    const period = 4.1 * unit;
    const gain = bleed * 0.45 * unit;
    const printed = plates.map(() => new Float32Array(N));
    const grainNoise = noiseField((context.seed * 977 + 5) | 0);
    for (let i = 0; i < P; i++) {
      const [ox, oy] = offsets[i];
      const angle = (plates[i].angle * Math.PI) / 180;
      const cs = Math.cos(angle), sn = Math.sin(angle);
      const src = cov[i], out = printed[i];
      for (let y = 0; y < S; y++) {
        const sy = Math.min(S - 1, Math.max(0, y - oy));
        for (let x = 0; x < S; x++) {
          const sx = Math.min(S - 1, Math.max(0, x - ox));
          const q = sy * S + sx;
          const c = src[q];
          if (c <= 0.004) continue;
          const flat = cls[q] === 3 || method === 'screen';
          const ghost = cls[q] === 1;
          let v: number;
          if (c >= 0.985) v = 1;
          else if (flat && !ghost && (c > 0.9 || c < 0.04)) v = c;
          else if (method === 'grain' && !ghost) {
            const n = grainNoise(x / (1.25 * unit) + i * 37, y / (1.25 * unit)) * 0.65 + fine(x / (3.4 * unit) + i * 11, y / (3.4 * unit)) * 0.35;
            v = clamp01((c - n) * 5 + 0.5);
          } else v = screen(x, y, cs, sn, period, c, gain);
          out[y * S + x] = v;
        }
      }
      signal.throwIfAborted();
    }
    // The key line prints on the key plate, solid, in register.
    for (let p = 0; p < N; p++) if (key[p] > printed[KEY][p]) printed[KEY][p] = key[p];
    await pause();

    // Bleed: blurred, re-thresholded through the fibres, so edges go furry; then a faint halo.
    const halos: Float32Array[] = [];
    for (let i = 0; i < P; i++) {
      const out = printed[i];
      const rb = (0.6 + 2.2 * bleed) * unit;
      const b = blur(out, S, rb, 1);
      const dark = 1 - lum(...(plates[i].fountain ? [120, 120, 120] as RGB : plates[i].rgb)) / 255;
      const solid = i === KEY || method === 'screen';
      for (let p = 0; p < N; p++) {
        const n = (fibre[p] * 0.5 + tooth[p] * 0.5) * Math.min(1, b[p] * 3);
        if (solid) {
          const v = b[p] + n * (0.15 + 0.4 * bleed);
          const feathered = clamp01((v - (0.5 - 0.2 * bleed)) * mix(3.2, 1.7, bleed) + 0.5);
          out[p] = Math.max(out[p] * (1 - bleed * 0.5), mix(out[p], feathered, 0.35 + 0.65 * bleed));
        } else {
          out[p] = clamp01(mix(out[p], b[p] * (1 + 0.4 * bleed), 0.15 + 0.4 * bleed));
        }
      }
      const h = blur(out, S, (2 + 4.5 * bleed) * unit, 2);
      const halo = new Float32Array(N);
      const strength = (0.05 + 0.22 * bleed) * (0.4 + dark);
      for (let p = 0; p < N; p++) halo[p] = Math.max(0, h[p] - out[p]) * strength;
      halos.push(halo);
      signal.throwIfAborted();
    }
    await pause();

    // ---- ink on paper: the flat printed sheet --------------------------------------------------
    const sheetR = new Float32Array(N), sheetG = new Float32Array(N), sheetB = new Float32Array(N);
    const fade = 1 - wear * 0.14;
    const fountainTurn = random() < 0.65 ? 0 : 1;
    const fountainFlip = random() < 0.5;
    const ageEdge = paperSpec.age * 0.5 + wear * 0.4;
    const fleckField = noiseField((context.seed * 59 + 21) | 0);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        const fu = 1 / unit;
        // paper
        const mottle = (low(x * fu / 55, y * fu / 55) - 0.5) * 0.05;
        const f = fibre[p] * paperSpec.fibre;
        const t = tooth[p] * (0.05 + 0.03 * paperSpec.fibre);
        let light = 1 + mottle + t + f * 0.035;
        // edge ageing
        const edge = Math.min(x, y, S - 1 - x, S - 1 - y) / S;
        const aged = ageEdge * Math.max(0, 1 - edge / 0.12) * (0.6 + low(x * fu / 20, y * fu / 20) * 0.8);
        let r = paper[0] * light * (1 - aged * 0.06);
        let g = paper[1] * light * (1 - aged * 0.11);
        let b = paper[2] * light * (1 - aged * 0.22);
        if (paperSpec.fleck > 0) {
          const fl = fleckField(x * fu / 2.2, y * fu / 2.2);
          if (fl > 0.93 - paperSpec.fleck * 0.02) {
            const d = (fl - 0.9) * 6 * paperSpec.fleck;
            r *= 1 - d; g *= 1 - d; b *= 1 - d * 0.9;
          }
        }
        // ink
        const density = fade * (0.9 + (low(x * fu / 18 + 40, y * fu / 18) - 0.5) * 0.16 - Math.max(0, tooth[p]) * 0.14);
        for (let i = 0; i < P; i++) {
          let c = printed[i][p];
          const hl = halos[i][p];
          if (c <= 0.002 && hl <= 0.002) continue;
          c = clamp01(c * density) + hl * (1 - c);
          let ink: RGB = inkRGB[i];
          if (plates[i].fountain) {
            const along = (fountainTurn ? y : x) / S;
            const wob = (low(x * fu / 140, y * fu / 140) - 0.5) * 0.08;
            ink = rainbow((fountainFlip ? 1 - along : along) * 1.04 - 0.02 + wob, stops);
          }
          r *= 1 - c * (1 - ink[0] / 255);
          g *= 1 - c * (1 - ink[1] / 255);
          b *= 1 - c * (1 - ink[2] / 255);
        }
        sheetR[p] = r;
        sheetG[p] = g;
        sheetB[p] = b;
      }
      if ((y & 63) === 0) signal.throwIfAborted();
    }
    await pause();

    // ---- the sheet as an object on the table ---------------------------------------------------
    const [lxRaw, lyRaw] = capture.light;
    const lLen = Math.hypot(lxRaw, lyRaw) || 1;
    const lx = lxRaw / lLen, ly = lyRaw / lLen;
    const rotation = ((random() - 0.5) * (state === 'fresh' ? 0.6 : mix(1.2, 3.2, wear)) * Math.PI) / 180;
    const margin = 15 * unit + S * 0.72 * Math.abs(Math.sin(rotation));
    const Lside = S - 2 * margin;
    const k = S / Lside; // sheet pixels per frame pixel
    const cosR = Math.cos(rotation), sinR = Math.sin(rotation);

    // Removed tabs.
    const removed = new Uint8Array(tabsPerSide * tabsPerSide);
    let removedCount = 0;
    if (state === 'torn') {
      const clusters = 1 + Math.round(random() * (1 + wear));
      for (let c = 0; c < clusters; c++) {
        const side = Math.floor(random() * 4);
        const along = Math.floor(random() * tabsPerSide);
        let cx = side === 0 ? 0 : side === 1 ? tabsPerSide - 1 : along;
        let cy = side === 2 ? 0 : side === 3 ? tabsPerSide - 1 : along;
        const count = Math.round(mix(2, 6, wear) + random() * 3);
        for (let n = 0; n < count; n++) {
          if (!removed[cy * tabsPerSide + cx]) { removed[cy * tabsPerSide + cx] = 1; removedCount++; }
          const dir = Math.floor(random() * 4);
          const nx = cx + (dir === 0 ? 1 : dir === 1 ? -1 : 0);
          const ny = cy + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
          if (nx >= 0 && ny >= 0 && nx < tabsPerSide && ny < tabsPerSide) { cx = nx; cy = ny; }
        }
      }
    } else if (state === 'cut') {
      const side = Math.floor(random() * 4);
      const depthTabs = Math.max(1, Math.round(tabsPerSide * mix(0.06, 0.16, wear)));
      const start = Math.floor(random() * tabsPerSide * 0.35);
      for (let a = 0; a < tabsPerSide; a++) {
        const steps = a < start ? 0 : Math.min(depthTabs, 1 + Math.floor((a - start) / Math.max(1, tabsPerSide * 0.12)));
        for (let d = 0; d < steps; d++) {
          const cx = side === 0 ? d : side === 1 ? tabsPerSide - 1 - d : a;
          const cy = side === 2 ? d : side === 3 ? tabsPerSide - 1 - d : a;
          if (!removed[cy * tabsPerSide + cx]) { removed[cy * tabsPerSide + cx] = 1; removedCount++; }
        }
      }
    }
    const gone = (sx: number, sy: number) => {
      const cx = Math.floor(sx / tab), cy = Math.floor(sy / tab);
      if (cx < 0 || cy < 0 || cx >= tabsPerSide || cy >= tabsPerSide) return true;
      return removed[cy * tabsPerSide + cx] === 1;
    };

    // Corner curl.
    const curl = state === 'handled' || (state === 'torn' && wear > 0.6);
    const curlCorner = Math.floor(random() * 4);
    const cornerX = curlCorner % 2 === 0 ? 0 : S, cornerY = curlCorner < 2 ? 0 : S;
    const diagX = (cornerX === 0 ? -1 : 1) / Math.SQRT2, diagY = (cornerY === 0 ? -1 : 1) / Math.SQRT2;
    const curlR = curl ? S * mix(0.07, 0.17, wear) * mix(0.8, 1.2, random()) : 0;
    const foreshorten = 0.62;
    /** Where the curled flap shows at sheet point (sx, sy): -1 for none, else the depth into the flap 0..1. */
    let flapX = 0, flapY = 0;
    const flapAt = (sx: number, sy: number) => {
      if (!curl) return -1;
      const s = (sx - cornerX) * diagX + (sy - cornerY) * diagY + curlR;
      if (s >= 0) return -1;
      const a = -s / foreshorten;
      if (a > curlR * 1.5) return -1;
      const ox = sx - s * diagX + a * diagX, oy = sy - s * diagY + a * diagY;
      if (ox < 0 || oy < 0 || ox >= S || oy >= S) return -1;
      flapX = ox;
      flapY = oy;
      return a / (curlR * 1.42);
    };
    const lifted = (sx: number, sy: number) => curl && (sx - cornerX) * diagX + (sy - cornerY) * diagY + curlR > 0;
    const onPaper = (sx: number, sy: number) =>
      sx >= 0 && sy >= 0 && sx < S && sy < S && !gone(sx, sy) && !lifted(sx, sy);

    // Creases.
    interface Crease { nx: number; ny: number; c: number; strength: number }
    const creases: Crease[] = [];
    if (state === 'folded') {
      const mid = Math.round(tabsPerSide / 2) * tab;
      creases.push({ nx: 1, ny: 0, c: mid, strength: mix(1.4, 2.2, wear) });
      creases.push({ nx: 0, ny: 1, c: mid, strength: mix(1.4, 2.2, wear) });
    } else if (state === 'handled' || state === 'torn') {
      const count = state === 'handled' ? 1 + Math.round(random() * (1 + wear * 1.5)) : Math.round(random() * wear * 1.5);
      for (let n = 0; n < count; n++) {
        const a = random() * Math.PI;
        const nx = Math.cos(a), ny = Math.sin(a);
        const px = S * mix(0.25, 0.75, random()), py = S * mix(0.25, 0.75, random());
        creases.push({ nx, ny, c: nx * px + ny * py, strength: mix(0.3, 0.75, wear) * mix(0.7, 1, random()) });
      }
    }
    const quadTilt = state === 'folded' ? [mix(-1, 1, random()), mix(-1, 1, random()), mix(-1, 1, random()), mix(-1, 1, random())] : null;
    const midSheet = Math.round(tabsPerSide / 2) * tab;

    // Perforation geometry, in sheet pixels.
    const holeTarget = Math.min(5.4 * unit, Math.max(3.1 * unit, tab / 6));
    const holeStep = tab / Math.max(3, Math.round(tab / holeTarget));
    const holeR = mix(0.62, 0.95, clamp01((tab / unit - 18) / 60)) * unit;
    const rimW = 1.2 * unit;
    const bandW = 0.9 * unit;
    const pillow = state === 'fresh' ? 0.018 : 0.035 + wear * 0.02;

    const ground: RGB = [mix(30, 40, mood.warmth), 28, mix(30, 24, mood.warmth)];
    const groundTex = noiseField((context.seed * 3 + 1) | 0);
    const out = new Uint8ClampedArray(N * 4);
    const backTone: RGB = [paper[0] * 0.93, paper[1] * 0.92, paper[2] * 0.9];

    const sampleSheet = (sx: number, sy: number, res: number[]) => {
      const fx = Math.min(S - 1.001, Math.max(0, sx - 0.5)), fy = Math.min(S - 1.001, Math.max(0, sy - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const ax = fx - x0, ay = fy - y0;
      const p = y0 * S + x0;
      const w00 = (1 - ax) * (1 - ay), w10 = ax * (1 - ay), w01 = (1 - ax) * ay, w11 = ax * ay;
      res[0] = sheetR[p] * w00 + sheetR[p + 1] * w10 + sheetR[p + S] * w01 + sheetR[p + S + 1] * w11;
      res[1] = sheetG[p] * w00 + sheetG[p + 1] * w10 + sheetG[p + S] * w01 + sheetG[p + S + 1] * w11;
      res[2] = sheetB[p] * w00 + sheetB[p + 1] * w10 + sheetB[p + S] * w01 + sheetB[p + S + 1] * w11;
    };
    const px = [0, 0, 0];
    const shadowReach = [3, 6, 10].map((d) => d * unit * k);

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const o = (y * S + x) * 4;
        const rx = x + 0.5 - S / 2, ry = y + 0.5 - S / 2;
        const sx = (rx * cosR + ry * sinR) * k + S / 2;
        const sy = (-rx * sinR + ry * cosR) * k + S / 2;
        let r: number, g: number, b: number;

        const flap = flapAt(sx, sy);
        if (flap >= 0) {
          // The underside of the curled corner: bare stock with the print soaked faintly through,
          // lit brightest along the roll and darker toward the lifted tip.
          sampleSheet(flapX, flapY, px); // the print soaked through, seen from behind
          const through = 0.12;
          const roll = Math.sin(clamp01(flap) * Math.PI * 0.5);
          const shade = mix(1.05, 0.78, roll) * (1 + (lx * -diagX + ly * -diagY) * 0.06);
          r = mix(backTone[0], px[0], through) * shade;
          g = mix(backTone[1], px[1], through) * shade;
          b = mix(backTone[2], px[2], through) * shade;
          // the fold edge itself
          if (flap < 0.04) { r *= 1.04; g *= 1.04; b *= 1.04; }
        } else if (!onPaper(sx, sy)) {
          // The table: dark felt, darker where the sheet shades it.
          const fu = 1 / unit;
          const tex = (groundTex(x * fu / 3, y * fu / 3) - 0.5) * 0.12 + (groundTex(x * fu / 40 + 9, y * fu / 40) - 0.5) * 0.1;
          let shadow = 0;
          for (const d of shadowReach) if (onPaper(sx + lx * d, sy + ly * d) || flapAt(sx + lx * d * 2, sy + ly * d * 2) >= 0) shadow += 1 / 3;
          const m = (1 + tex) * (1 - shadow * 0.55);
          r = ground[0] * m;
          g = ground[1] * m;
          b = ground[2] * m;
          // torn fibres standing out from a ripped edge
          if (state === 'torn' && sx >= 0 && sy >= 0 && sx < S && sy < S && gone(sx, sy) && !lifted(sx, sy)) {
            const cx = Math.floor(sx / tab), cy = Math.floor(sy / tab);
            const lxp = sx - cx * tab, lyp = sy - cy * tab;
            let dEdge = Infinity;
            if (!gone(sx - tab, sy) && cx > 0) dEdge = Math.min(dEdge, lxp);
            if (!gone(sx + tab, sy) && cx < tabsPerSide - 1) dEdge = Math.min(dEdge, tab - lxp);
            if (!gone(sx, sy - tab) && cy > 0) dEdge = Math.min(dEdge, lyp);
            if (!gone(sx, sy + tab) && cy < tabsPerSide - 1) dEdge = Math.min(dEdge, tab - lyp);
            const reach = (fine(sx / (1.1 * unit), sy / (1.1 * unit)) * 1.6 + fibre[Math.min(N - 1, Math.floor(sy) * S + Math.floor(sx))] * 1.5) * unit;
            if (dEdge < reach) {
              const fibreLight = 0.88 - (dEdge / Math.max(0.1, reach)) * 0.2;
              r = paper[0] * fibreLight; g = paper[1] * fibreLight; b = paper[2] * fibreLight;
            }
          }
        } else {
          sampleSheet(sx, sy, px);
          r = px[0]; g = px[1]; b = px[2];
          let shade = 1;
          // perforations
          const fx = sx / tab, fy = sy / tab;
          const ix = Math.round(fx), iy = Math.round(fy);
          const dxl = (fx - ix) * tab, dyl = (fy - iy) * tab;
          let hole = 0, rim = 0, band = 0;
          if (ix > 0 && ix < tabsPerSide) {
            const t = sy / holeStep;
            const dh = (t - Math.round(t - 0.5) - 0.5) * holeStep;
            const d = Math.hypot(dxl, dh);
            hole = Math.max(hole, clamp01(holeR - d + 0.5));
            rim = Math.max(rim, clamp01(1 - (d - holeR) / rimW));
            band = Math.max(band, clamp01(1 - Math.abs(dxl) / bandW));
            shade += Math.sign(dxl) * -lx * 0.05 * clamp01(1 - Math.abs(dxl) / (2.2 * unit)) * clamp01(Math.abs(dxl) / unit);
          }
          if (iy > 0 && iy < tabsPerSide) {
            const t = sx / holeStep;
            const dh = (t - Math.round(t - 0.5) - 0.5) * holeStep;
            const d = Math.hypot(dyl, dh);
            hole = Math.max(hole, clamp01(holeR - d + 0.5));
            rim = Math.max(rim, clamp01(1 - (d - holeR) / rimW));
            band = Math.max(band, clamp01(1 - Math.abs(dyl) / bandW));
            shade += Math.sign(dyl) * -ly * 0.05 * clamp01(1 - Math.abs(dyl) / (2.2 * unit)) * clamp01(Math.abs(dyl) / unit);
          }
          // Raised paper along the line takes less ink.
          const lift = Math.max(rim * 0.42, band * 0.2);
          if (lift > 0) {
            r = mix(r, paper[0] * 1.02, lift);
            g = mix(g, paper[1] * 1.02, lift);
            b = mix(b, paper[2] * 1.02, lift);
          }
          // Each tab pillows a little between its perforations.
          const ax = (fx - Math.floor(fx)) * 2 - 1, ay = (fy - Math.floor(fy)) * 2 - 1;
          const gx = -2 * ax * (1 - ay * ay), gy = -2 * ay * (1 - ax * ax);
          shade += (gx * lx + gy * ly) * pillow;
          // creases
          for (const crease of creases) {
            const d = crease.nx * sx + crease.ny * sy - crease.c;
            const w = 2.8 * unit;
            const q = d / w;
            if (Math.abs(q) > 4) continue;
            const facing = crease.nx * lx + crease.ny * ly;
            shade += crease.strength * q * Math.exp(-q * q) * 0.16 * (facing >= 0 ? 1 : -1) * (0.4 + Math.abs(facing));
            shade -= crease.strength * 0.05 * Math.exp(-((d / (1.3 * unit)) ** 2));
            const crack = crease.strength * Math.exp(-((d / (0.9 * unit)) ** 2)) * clamp01(fine(sx / (2 * unit), sy / (2 * unit)) * 1.6 - 0.3);
            if (crack > 0) {
              r = mix(r, paper[0], crack * 0.5);
              g = mix(g, paper[1], crack * 0.5);
              b = mix(b, paper[2], crack * 0.5);
            }
          }
          if (quadTilt) {
            const qi = (sx < midSheet ? 0 : 1) + (sy < midSheet ? 0 : 2);
            shade += quadTilt[qi] * 0.03;
          }
          // the curled flap's shadow on the sheet
          if (curl) {
            const d = 7 * unit * k;
            if (flapAt(sx + lx * d, sy + ly * d) >= 0) shade *= 0.8;
            else if (flapAt(sx + lx * d * 0.5, sy + ly * d * 0.5) >= 0) shade *= 0.9;
          }
          // paper thickness at a cut or torn edge
          const ex = Math.min(sx, S - sx), ey = Math.min(sy, S - sy);
          if (Math.min(ex, ey) < 1.2 * unit) shade *= 0.93;
          if (removedCount) {
            const cx = Math.floor(sx / tab), cy = Math.floor(sy / tab);
            const lxp = sx - cx * tab, lyp = sy - cy * tab;
            const e = 1.3 * unit;
            if ((lxp < e && gone(sx - tab, sy)) || (tab - lxp < e && gone(sx + tab, sy)) || (lyp < e && gone(sx, sy - tab)) || (tab - lyp < e && gone(sx, sy + tab))) shade *= 0.9;
          }
          r *= shade; g *= shade; b *= shade;
          if (hole > 0) {
            const hr = mix(ground[0], paper[0] * 0.5, 0.35), hg = mix(ground[1], paper[1] * 0.5, 0.35), hb = mix(ground[2], paper[2] * 0.5, 0.35);
            const h = hole * 0.85;
            r = mix(r, hr, h); g = mix(g, hg, h); b = mix(b, hb, h);
          }
        }
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
        out[o + 3] = 255;
      }
      if ((y & 63) === 0) signal.throwIfAborted();
    }

    return {
      pixels: out,
      notes: [
        `blotter sheet of ${tabsPerSide} by ${tabsPerSide} perforated tabs`,
        {
          whole: 'one picture across the whole sheet',
          tiled: 'the subject tiled as an icon on every tab over a ghost of the scene',
          border: 'centre picture in a border of icon tabs',
          medallion: `the scene in a medallion at the heart of ${rosette ? 'an eight-fold star rosette' : 'a sunburst'}`,
          formula: `one picture overprinted with ${formulaNote}`,
        }[layout],
        `${palette && INK_ROLES[answers.inks] ? `${answers.inks} inks in ${palette.ink} and ${palette.second}` : inks.name}, ${method === 'offset' ? 'offset halftone' : method === 'screen' ? 'flat screen print' : 'grainy stipple'}`,
        `on ${paperSpec.name}`,
        {
          fresh: 'crisp and flat',
          handled: 'handled, a corner curling',
          folded: 'folded in quarters and opened',
          torn: `${removedCount} tabs torn away`,
          cut: `${removedCount} tabs cut away`,
        }[state],
      ],
    };
  },
});
