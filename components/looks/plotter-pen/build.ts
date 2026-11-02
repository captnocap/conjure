import { type PaletteRole, choice, clamp01, defineLook, mix, paintIsMetal, rekey, score, seeded } from '@conjure/kit';

/**
 * A pen plotter: a machine that drags a real pen over paper. It can only make strokes, so tone
 * is built from hatching that packs closer in the shadows, outlines are traced once, and the
 * ink pools where the pen lands and lifts. Up to three pens can be loaded, and the paper can be
 * light (fineliners, ballpoint) or dark card (gel and metallic pens).
 */
type RGB = readonly [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const PAPERS = {
  white: { colour: '#f6f5f0', dark: false, grid: false, mottle: 0.02, name: 'white Bristol', description: 'Bright white Bristol board: the pen shows at its crispest.' },
  cream: { colour: '#eee4cc', dark: false, grid: false, mottle: 0.07, name: 'tinted cartridge paper', description: 'Softly tinted cartridge paper, slightly mottled, a sketchbook feel.' },
  grey: { colour: '#c6c6c0', dark: false, grid: false, mottle: 0.04, name: 'mid-toned card', description: 'Mid-toned card, so the drawing sits quietly in a half-tone.' },
  kraft: { colour: '#c4a473', dark: false, grid: false, mottle: 0.09, name: 'kraft paper', description: 'Brown kraft paper, fibrous, like a drawing on a parcel.' },
  graph: { colour: '#f7f7f2', dark: false, grid: true, mottle: 0.02, name: 'graph paper', description: 'White paper with a faint printed pale-blue grid showing through.' },
  black: { colour: '#15151a', dark: true, grid: false, mottle: 0.03, name: 'black card', description: 'Near-black card: the pens become gel and metallic inks, bright lines on dark.' },
  navy: { colour: '#162039', dark: true, grid: false, mottle: 0.04, name: 'deep coloured card', description: 'Deep, richly coloured dark card with pale lines, like a chart of the night.' },
} as const;

/** Pens in order of boldness: the first is the main pen, the ones after it are lighter or accents. */
const PENSETS = {
  fineliner: { name: 'a black fineliner', dark: ['#f1efe8'], light: ['#1b1b1d'], opacity: 2.6, description: 'One black technical fineliner (a white gel pen on dark card): the classic single-pen plot.' },
  ballpoint: { name: 'a ballpoint', dark: ['#9cc0ff'], light: ['#243b8c'], opacity: 1.5, description: 'One coloured ballpoint: slightly glossy, translucent, darker wherever lines cross.' },
  sepia: { name: 'a soft archival pen', dark: ['#e2bb63'], light: ['#5b3a21'], opacity: 2.2, description: 'One soft, muted archival pen (a gel pen on dark card): old-survey, parchment.' },
  redline: { name: 'black and accent pens', dark: ['#f1efe8', '#ff6470'], light: ['#1b1b1d', '#c83228'], opacity: 2.4, description: 'Black with a coloured second pen: black for the drawing, colour for whatever the second pen is given.' },
  blues: { name: 'two pens of one colour', dark: ['#c4d8ff', '#4f84d8'], light: ['#1c2a5c', '#5e9fd6'], opacity: 2.2, description: 'A deep and a light pen of one colour: a calm two-tone drawing, a little like a cyanotype.' },
  trio: { name: 'three pens', dark: ['#ffd36a', '#5ef0e0', '#ff7fb3'], light: ['#1f2c5a', '#1f8b86', '#e2782c'], opacity: 2.3, description: 'A deep key pen and two contrasting pens: the classic three-pen generative print.' },
  neon: { name: 'three fluorescent gel pens', dark: ['#ff4fb0', '#3fe0ff', '#c6ff3b'], light: ['#ec2f9c', '#17b5d4', '#79c414'], opacity: 2.3, description: 'Three fluorescent gel pens: loud, synthetic, a festival poster.' },
  metallic: { name: 'silver and gold gel pens', dark: ['#d9dde4', '#e9c45e'], light: ['#585e69', '#8a6c1c'], opacity: 2.0, description: 'Silver and gold metallic gel pens: a quiet shimmer, at its best on dark card.' },
} as const;

/**
 * Pens re-keyed to the picture's palette by index: the first pen carries the ink, the others answer in
 * the second colour. The black fineliner and redline's black are black ink and stay; silver and gold
 * stay metal unless the palette ink is itself a metal. White, kraft and graph paper stay; toned and dark
 * papers take the ground.
 */
const PEN_ROLES: Record<string, Record<string, PaletteRole>> = {
  fineliner: {}, ballpoint: { 0: 'ink' }, sepia: { 0: 'ink' }, redline: { 1: 'ink' }, blues: { 0: 'ink', 1: 'ink' },
  trio: { 0: 'ink', 1: 'second', 2: 'second' }, neon: { 0: 'ink', 1: 'second', 2: 'second' }, metallic: {},
};
const GROUND_PAPERS = new Set(['cream', 'grey', 'black', 'navy']);

const describe = <T extends Record<string, { description: string }>>(table: T) =>
  Object.fromEntries(Object.entries(table).map(([key, entry]) => [key, entry.description])) as Record<keyof T & string, string>;

/** Tone thresholds for the four hatching passes: each pass adds lines where the tone is darker than this. */
const THRESHOLDS = [0.1, 0.32, 0.55, 0.78] as const;

export default defineLook({
  questions: {
    paper: choice('What paper is loaded on the plotter bed?', describe(PAPERS)),
    pens: choice('Which pens are loaded in the carousel? Coloured pens take the picture\u2019s palette.', describe(PENSETS)),
    assign: choice('If more than one pen is loaded, how are the pens shared out?', {
      tone: 'By tone: the boldest pen draws the outlines and deepest shadows, the lighter pens the open hatching.',
      layers: 'Outline and fill: one pen traces every outline, the others lay down all the hatching.',
      object: 'By object: each thing in the scene is plotted entirely in its own pen.',
      light: 'By light: the lit sides in one pen, the shadow sides in another.',
      depth: 'By distance: the nearest things in the boldest pen, the far ones fading to the lightest.',
      colour: 'By colour: each surface takes whichever pen is nearest its own hue, like a colour separation.',
    }),
    mark: choice('How does the pen build tone?', {
      hatch: 'Parallel hatching: one family of straight lines that pack closer in the shadows.',
      cross: 'Cross-hatching: a second family of lines laid across the first in the darker tones.',
      wave: 'Wave lines: continuous parallel lines across the whole sheet that wiggle wider and faster where it is dark.',
      stipple: 'Stippling: thousands of single pen taps, crowding together in the shadows.',
      scribble: 'Scribble: wandering looping lines that pile up in the darks, like an absent-minded hand.',
    }),
    direction: choice('If the tone is made of lines, which way do they run?', {
      diagonal: 'Diagonally, rising to the right: the right-hander’s habit.',
      counter: 'Diagonally, falling to the right.',
      horizontal: 'Horizontally, like ruled paper.',
      vertical: 'Vertically, like rain.',
      form: 'Around the forms: the lines turn with each surface, like an engraving.',
      light: 'Across the light: the lines run along the boundary between lit and shadowed sides.',
      each: 'A different angle for every object, so each thing reads as its own panel.',
    }),
    nib: score('How wide is the pen nib?', ['A 0.05 needle', 'Fine, 0.2', 'Medium, 0.4', 'Broad, 0.7', 'A fat 1.0 marker']),
    spacing: score('How closely are the hatch lines spaced?', ['Tight, nearly solid in the shadows', 'Close', 'Medium', 'Open', 'Very open: airy, mostly paper']),
    edges: choice('How are the outlines drawn?', {
      crisp: 'Every silhouette and crease traced once, cleanly, the shadow side a touch heavier.',
      silhouette: 'Only the outer silhouettes; the insides are left to the hatching.',
      heavy: 'Bold outlines traced twice, much thicker than the hatching, like a comic.',
      none: 'No outlines at all: the forms are made of tone alone.',
    }),
    plot: choice('What happened to this plot?', {
      clean: 'A clean finished plot, straight off the bed, exactly as intended.',
      drying: 'The pen was running dry: lines thin out and skip in patches, strong where the ink was still fresh.',
      shifted: 'The paper slipped between pen changes, so the layers are a few millimetres out of register.',
      doubled: 'Plotted twice over the same sheet, the second pass slightly offset: every line ghosted.',
      proof: 'A proof: the plotter’s registration crosses and a pen test strip left in the margins.',
    }),
  },

  async apply(capture, a, context, signal) {
    const N = capture.size, total = N * N;
    const { mood, seed } = context;
    const random = seeded((seed ^ 0x5e1f00d) >>> 0);
    const breathe = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };
    const paper = PAPERS[a.paper];
    const set = PENSETS[a.pens];
    const roles = a.pens === 'metallic' && context.palette && paintIsMetal(context.palette.ink) ? { 1: 'ink' as const } : PEN_ROLES[a.pens] ?? {};
    const loaded = (paper.dark ? set.dark : set.light).map(hex);
    const keyed = rekey(Object.fromEntries(loaded.map((pen, k) => [k, pen])), context.palette, roles);
    const pens: RGB[] = loaded.map((_, k) => keyed[k]);
    const n = pens.length;
    const opacity = set.opacity * (paper.dark ? 1.2 : 1);

    // ---- noise -------------------------------------------------------------------------------
    const hash = (x: number, y: number, salt: number) => {
      let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((salt + seed) | 0, 1274126177);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const noise = (x: number, y: number, salt: number) => {
      const ix = Math.floor(x), iy = Math.floor(y);
      let fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      return mix(mix(hash(ix, iy, salt), hash(ix + 1, iy, salt), fx), mix(hash(ix, iy + 1, salt), hash(ix + 1, iy + 1, salt), fx), fy);
    };

    // ---- read the capture --------------------------------------------------------------------
    const { identity, depth, diffuse, color, normal } = capture;
    const ID = new Uint8Array(total), D = new Float32Array(total), lit = new Float32Array(total), lum = new Float32Array(total);
    const histogram = new Uint32Array(256);
    let solid = 0, nearest = 1, farthest = 0;
    for (let at = 0; at < total; at++) {
      const o = at * 4;
      const id = identity[o];
      ID[at] = id;
      D[at] = (depth[o] + depth[o + 1] / 255 + depth[o + 2] / 65025) / 256;
      const plain = diffuse[o] * 0.3 + diffuse[o + 1] * 0.59 + diffuse[o + 2] * 0.11;
      lit[at] = plain;
      lum[at] = (color[o] * 0.2126 + color[o + 1] * 0.7152 + color[o + 2] * 0.0722) / 255;
      if (id >= 1) {
        histogram[Math.round(plain)]++;
        solid++;
      }
      if (id >= 2) {
        if (D[at] < nearest) nearest = D[at];
        if (D[at] > farthest) farthest = D[at];
      }
    }
    if (farthest <= nearest) {
      nearest = 0;
      farthest = 1;
    }
    const percentile = (fraction: number) => {
      let seen = 0;
      for (let value = 0; value < 256; value++) {
        seen += histogram[value];
        if (seen >= solid * fraction) return value;
      }
      return 255;
    };
    const dim = percentile(0.03), bright = Math.max(dim + 12, percentile(0.85));
    /** 0 paper-light, 1 the deepest shadow: the plain-lit pass, with a share of the material's own darkness. */
    const tone = new Float32Array(total);
    /** 0 in shadow, 1 in full light. */
    const light = new Float32Array(total);
    const belonging = (id: number) => (id >= 3 ? (capture.confidence?.[id] ?? 1) : 1);
    for (let at = 0; at < total; at++) {
      if (!ID[at]) continue;
      const l = clamp01((lit[at] - dim) / (bright - dim));
      light[at] = l;
      // A doubtful thing is drawn lighter, as a plotter artist would leave an unresolved part open.
      const value = Math.pow(clamp01(0.68 * (1 - l) + 0.32 * (1 - lum[at])), 1.25) * mix(0.55, 1, belonging(ID[at]));
      // A lit surface is left as bare paper: the plotter only draws where there is tone to build.
      tone[at] = value < 0.09 ? 0 : value;
    }
    const away = (at: number) => clamp01((D[at] - nearest) / (farthest - nearest));
    const depthBreak = (capture.pixelWorldSize * 1.5) / Math.max(1e-6, capture.far - capture.near);
    const depthStep = depthBreak * 5;
    const [lightX, lightY] = capture.light;

    // Which pen is nearest each pixel's hue, for the colour-separation assignment.
    const hueOf = ([r, g, b]: RGB) => {
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (d < 1e-6) return { hue: 0, chroma: 0 };
      const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { hue: hue / 6, chroma: d / 255 };
    };
    const penHues = pens.map(hueOf);
    const chromatic = penHues.map((h, k) => ({ k, hue: h.hue })).filter((e) => penHues[e.k].chroma > 0.15);
    const neutral = Math.max(0, penHues.findIndex((h) => h.chroma <= 0.15));
    const hueBin = new Uint8Array(total);
    if (a.assign === 'colour' && n > 1) {
      for (let at = 0; at < total; at++) {
        const o = at * 4;
        const { hue, chroma } = hueOf([color[o], color[o + 1], color[o + 2]]);
        if (chroma < 0.14 || !chromatic.length) {
          hueBin[at] = neutral;
          continue;
        }
        let best = chromatic[0].k, bestDistance = 2;
        for (const { k, hue: penHue } of chromatic) {
          const distance = Math.abs(((hue - penHue + 1.5) % 1) - 0.5);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = k;
          }
        }
        hueBin[at] = best;
      }
    }
    const objectSalt = Math.floor(random() * 3);
    /** Which pen draws tone at this pixel, for the hatching level (0 open … 3 deepest) and the line index. */
    const penFor = (at: number, level: number, line: number): number => {
      if (n === 1) return 0;
      const id = ID[at];
      switch (a.assign) {
        case 'tone':
          if (a.mark === 'wave') return line % n;
          return n === 2 ? (level >= 2 ? 0 : 1) : level >= 2 ? 0 : level === 1 ? 1 : 2;
        case 'layers':
          return a.mark === 'wave' ? 1 + (line % (n - 1)) : n === 3 && id === 1 ? 2 : 1;
        case 'object':
          return id === 1 ? n - 1 : (id + objectSalt) % n;
        case 'light':
          return light[at] > 0.6 ? n - 1 : n === 3 && light[at] > 0.3 ? 1 : 0;
        case 'depth':
          return Math.min(n - 1, Math.floor(away(at) * n * 0.999));
        case 'colour':
          return hueBin[at];
      }
    };
    const penForEdge = (at: number) => (a.assign === 'object' || a.assign === 'depth' || a.assign === 'colour' ? penFor(at, 3, 0) : 0);

    // ---- the pen -----------------------------------------------------------------------------
    const r0 = mix(0.42, 1.5, a.nib);
    /** The open hatch spacing; a wider nib needs wider lines or the darks close up into a solid. */
    const S = mix(3.2, 8.5, a.spacing) + r0 * 4;
    /** The closest two lines can sit before their ink merges. */
    const minGap = 2.2 * r0 + 0.5;
    const wobble = mix(0.18, 0.9, mood.energy);
    const dryness = (a.plot === 'drying' ? 1 : 0) + mood.wear * 0.25;
    const cov = pens.map(() => new Float32Array(total));
    const integral = (R: number) => (R >= 1 ? 2 * R - 1 : R * R);
    const stamp = (k: number, cx: number, cy: number, r: number, alpha: number) => {
      const target = cov[k];
      const R = r + 0.5;
      const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(N - 1, Math.ceil(cx + R));
      const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(N - 1, Math.ceil(cy + R));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const cover = R - Math.hypot(x - cx, y - cy);
          if (cover > 0) target[y * N + x] += Math.min(1, cover) * alpha;
        }
    };
    /** A pen running dry: the ink thins in patches, and the stroke itself breaks up. */
    const dryAt = (x: number, y: number) => (dryness ? 1 - clamp01(dryness * smooth(0.45, 0.85, noise(x / 48, y / 48, 21)) * 0.7) : 1);
    const skipAt = (along: number, k: number) => (dryness > 0.5 ? 1 - 0.85 * smooth(0.55, 0.75, noise(along / 4, k * 3, 23)) : 1);
    const slip = (): [number, number] => [(random() < 0.5 ? -1 : 1) * (2 + random() * 3), (random() < 0.5 ? -1 : 1) * (2 + random() * 3)];
    const slips = pens.map(slip);
    /** Where a pen's layer landed on the paper: out of register when the sheet slipped. */
    const offsetOf = (k: number, layer: number): [number, number] =>
      a.plot !== 'shifted' ? [0, 0] : n === 1 ? (layer === 1 ? slips[0] : [0, 0]) : k === 0 ? [0, 0] : slips[k];

    const SEG = 0.65;
    /** Draw one pen stroke along a polyline: wobble, pressure, and the ink pooling where the pen lands and lifts. */
    const draw = (k: number, pts: number[], r: number, alpha: number, layer: number) => {
      const count = pts.length / 2;
      const [ox, oy] = offsetOf(k, layer);
      if (count === 1) {
        const rd = r * 1.25;
        stamp(k, pts[0] + ox, pts[1] + oy, rd, (alpha * 1.2 * dryAt(pts[0], pts[1])) / integral(rd + 0.5));
        return;
      }
      let length = 0;
      for (let i = 1; i < count; i++) length += Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
      const scale = (alpha * SEG) / integral(r + 0.5);
      let s = 0, carry = 0;
      for (let i = 1; i < count; i++) {
        const x0 = pts[i * 2 - 2], y0 = pts[i * 2 - 1], x1 = pts[i * 2], y1 = pts[i * 2 + 1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len < 1e-6) continue;
        const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
        let t = carry;
        for (; t <= len; t += SEG) {
          const x = x0 + ux * t, y = y0 + uy * t, along = s + t;
          const w = (noise(x / 7, y / 7, 3) - 0.5) * 2 * wobble + (hash(Math.round(along * 3), k, 9) - 0.5) * 0.22;
          const press = 1 + (noise(along / 12, k * 17, 5) - 0.5) * 0.55;
          const pool = Math.min(along, length - along) < 1.5 ? 1.35 : 1;
          const dry = dryAt(x, y) * skipAt(along, k);
          stamp(k, x - uy * w + ox, y + ux * w + oy, r * press * pool * (0.75 + 0.25 * dry), scale * (0.8 + 0.25 * press) * pool * dry);
        }
        carry = t - len;
        s += len;
      }
    };
    /** Collects pen-down points and draws a stroke whenever the pen lifts or changes. */
    const stroker = (r: number, alpha: number, layer: number) => {
      let pts: number[] = [], pen = -1;
      const lift = () => {
        if (pts.length) draw(pen, pts, r, alpha, layer);
        pts = [];
        pen = -1;
      };
      const down = (x: number, y: number, k: number) => {
        if (pen !== k) lift();
        pen = k;
        pts.push(x, y);
      };
      return { down, lift };
    };

    // ---- directions --------------------------------------------------------------------------
    const angleFor = (id: number): number => {
      switch (a.direction) {
        case 'counter':
          return Math.PI / 4;
        case 'horizontal':
          return 0.0;
        case 'vertical':
          return Math.PI / 2;
        case 'light':
          return Math.atan2(lightY, lightX) + Math.PI / 2;
        case 'each':
          return id === 1 ? 0.05 : -Math.PI / 4 + (hash(id * 31, 7, 43) - 0.5) * Math.PI * 0.9;
        default:
          return -Math.PI / 4;
      }
    };
    const dither = (ix: number, iy: number) => (hash(ix, iy, 41) - 0.5) * 0.03;

    /** Parallel hatch lines at one angle, pen down where the tone passes this level's threshold. */
    const sweep = async (level: number, angle: number, spacing: number, shiftFraction: number, only: number, box?: readonly [number, number, number, number]) => {
      const thr = THRESHOLDS[level];
      const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux;
      const cx = N / 2, cy = N / 2;
      let pMin = -N, pMax = N, tMin = -N, tMax = N;
      if (box) {
        pMin = Infinity; pMax = -Infinity; tMin = Infinity; tMax = -Infinity;
        for (const [bx, by] of [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]]) {
          const p = (bx - cx) * nx + (by - cy) * ny, t = (bx - cx) * ux + (by - cy) * uy;
          pMin = Math.min(pMin, p); pMax = Math.max(pMax, p); tMin = Math.min(tMin, t); tMax = Math.max(tMax, t);
        }
        pMin -= spacing; pMax += spacing; tMin -= 2; tMax += 2;
      } else {
        const reach = N * 0.7072 + spacing;
        pMin = tMin = -reach; pMax = tMax = reach;
      }
      const st = stroker(r0, 1, 1);
      let index = 0;
      for (let p = Math.ceil((pMin - shiftFraction * spacing) / spacing) * spacing + shiftFraction * spacing; p <= pMax; p += spacing, index++) {
        if (index % 48 === 0) await breathe();
        let down = false, lastId = -1, lastD = 0;
        for (let t = tMin; t <= tMax; t += 1) {
          const x = cx + nx * p + ux * t, y = cy + ny * p + uy * t;
          const ix = Math.round(x), iy = Math.round(y);
          if (ix < 0 || iy < 0 || ix >= N || iy >= N) { st.lift(); down = false; lastId = -1; continue; }
          const at = iy * N + ix, id = ID[at];
          if (!id || (only && id !== only)) { st.lift(); down = false; lastId = -1; continue; }
          const v = tone[at] + dither(ix, iy);
          if (down ? v < thr - 0.025 : v > thr + 0.025) down = !down;
          if (!down) { st.lift(); lastId = -1; continue; }
          if (id !== lastId || Math.abs(D[at] - lastD) > depthStep) st.lift();
          lastId = id;
          lastD = D[at];
          st.down(x, y, penFor(at, level, index));
        }
        st.lift();
      }
    };

    /** Lines that follow the surfaces: streamlines in a field made from the normals, kept evenly spaced by an occupancy grid. */
    const trace = async (level: number, spacing: number, cross: boolean) => {
      const thr = THRESHOLDS[level];
      const cell = Math.max(1.5, spacing * 0.9);
      const gw = Math.ceil(N / cell) + 1;
      const occ = new Int32Array(gw * gw).fill(-1);
      const base = angleFor(0);
      const bx = Math.cos(base), by = Math.sin(base);
      const dirBuf = new Float32Array(2);
      const dir = (x: number, y: number) => {
        const o = (Math.round(y) * N + Math.round(x)) * 4;
        const nx = normal[o] / 127.5 - 1, ny = -(normal[o + 1] / 127.5 - 1);
        const m = Math.hypot(nx, ny);
        let fx = bx, fy = by;
        if (m > 0.05) {
          let cx = cross ? nx / m : -ny / m, cy = cross ? ny / m : nx / m;
          if (cx * bx + cy * by < 0) { cx = -cx; cy = -cy; }
          const w = smooth(0.1, 0.4, m);
          fx = mix(bx, cx, w);
          fy = mix(by, cy, w);
          const l = Math.hypot(fx, fy) || 1;
          fx /= l; fy /= l;
        }
        dirBuf[0] = fx;
        dirBuf[1] = fy;
      };
      const st = stroker(r0, 1, 1);
      const rows = Math.ceil(N / spacing);
      let line = 0;
      for (let pass = 0; pass < 2; pass++)
        for (let gy = pass; gy < rows; gy += 2) {
          if (gy % 12 === 0) await breathe();
          for (let gx = 0; gx < rows; gx++) {
            const sx = (gx + hash(gx, gy, 51)) * spacing, sy = (gy + hash(gx, gy, 53)) * spacing;
            if (sx >= N - 1 || sy >= N - 1) continue;
            const at0 = Math.round(sy) * N + Math.round(sx), id = ID[at0];
            if (!id || tone[at0] < thr - 0.05) continue;
            if (occ[Math.floor(sy / cell) * gw + Math.floor(sx / cell)] >= 0) continue;
            const back: number[] = [], fore: number[] = [], cells: number[] = [];
            for (const sign of [-1, 1]) {
              let x = sx, y = sy, px = sign * bx, py = sign * by;
              let down = tone[at0] > thr, up = 0, lastD = D[at0];
              const list = sign < 0 ? back : fore;
              for (let i = 0; i < 400; i++) {
                dir(x, y);
                let fx = dirBuf[0], fy = dirBuf[1];
                if (fx * px + fy * py < 0) { fx = -fx; fy = -fy; }
                fx = px * 0.35 + fx * 0.65;
                fy = py * 0.35 + fy * 0.65;
                const l = Math.hypot(fx, fy) || 1;
                px = fx / l; py = fy / l;
                x += px; y += py;
                const ix = Math.round(x), iy = Math.round(y);
                if (ix < 0 || iy < 0 || ix >= N || iy >= N) break;
                const at = iy * N + ix;
                if (ID[at] !== id || Math.abs(D[at] - lastD) > depthStep) break;
                lastD = D[at];
                const c = Math.floor(y / cell) * gw + Math.floor(x / cell);
                if (occ[c] >= 0 && occ[c] !== line) break;
                if (occ[c] < 0) { occ[c] = line; cells.push(c); }
                const v = tone[at] + dither(ix, iy);
                if (down ? v < thr - 0.025 : v > thr + 0.025) down = !down;
                if (!down) { if (++up > spacing * 3) break; } else up = 0;
                list.push(x, y, down ? 1 : 0);
              }
            }
            if (back.length + fore.length < 9) {
              for (const c of cells) occ[c] = -1;
              continue;
            }
            const emit = (x: number, y: number, isDown: number) => {
              if (isDown) st.down(x, y, penFor(Math.round(y) * N + Math.round(x), level, line));
              else st.lift();
            };
            for (let i = back.length - 3; i >= 0; i -= 3) emit(back[i], back[i + 1], back[i + 2]);
            emit(sx, sy, tone[at0] > thr ? 1 : 0);
            for (let i = 0; i < fore.length; i += 3) emit(fore[i], fore[i + 1], fore[i + 2]);
            st.lift();
            line++;
          }
        }
    };

    /** Continuous parallel lines over the whole sheet whose wiggle grows with the tone. */
    const waves = async () => {
      const Sw = Math.max(S * 1.5, r0 * 2 + 4);
      const angle = angleFor(2);
      const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux;
      const cx = N / 2, cy = N / 2, reach = N * 0.7072 + Sw;
      const st = stroker(r0, 1, 1);
      let index = 0;
      for (let p = -reach; p <= reach; p += Sw, index++) {
        if (index % 24 === 0) await breathe();
        let phase = random() * 6.283;
        for (let t = -reach; t <= reach; t += 1) {
          const x = cx + nx * p + ux * t, y = cy + ny * p + uy * t;
          const ix = Math.round(x), iy = Math.round(y);
          if (ix < 0 || iy < 0 || ix >= N || iy >= N) { st.lift(); continue; }
          const at = iy * N + ix, id = ID[at];
          const tn = id ? tone[at] : 0;
          // Over bare paper only every other line runs, straight; the rest join in where there is tone.
          if (tn <= 0 && index % 2) { st.lift(); continue; }
          const amp = (Sw / 2 - r0 * 1.1) * Math.pow(smooth(0.02, 0.92, tn), 0.8);
          phase += (2 * Math.PI) / mix(Sw * 2.6, Math.max(Sw * 0.9, r0 * 5), tn);
          const off = amp * Math.sin(phase);
          const pen = id ? penFor(at, tn > 0.5 ? 3 : 1, index) : a.assign === 'tone' || a.assign === 'layers' ? penFor(at, 0, index) : 0;
          st.down(x + nx * off, y + ny * off, pen);
        }
        st.lift();
      }
    };

    /** Single pen taps, more of them where it is dark. */
    const stipple = async () => {
      // Stipple only reads when it is dense, so the spacing score opens it up less than it does hatching.
      const g = Math.max(2, S * 0.3, minGap * 0.9);
      const rows = Math.ceil(N / g);
      for (let gy = 0; gy < rows; gy++) {
        if (gy % 40 === 0) await breathe();
        for (let gx = 0; gx < rows; gx++) {
          const x = (gx + random()) * g, y = (gy + random()) * g;
          if (x >= N - 1 || y >= N - 1) continue;
          const at = Math.round(y) * N + Math.round(x), id = ID[at];
          if (!id) continue;
          const tn = tone[at];
          if (tn <= 0 || random() > Math.pow(tn, 1.15) * 1.1) continue;
          const pen = penFor(at, tn > 0.5 ? 3 : 1, 0);
          draw(pen, [x, y], r0 * 1.1 * (0.9 + random() * 0.3), 1, 1);
          if (tn > 0.72 && random() < (tn - 0.72) * 2.5) draw(pen, [x + (random() - 0.5) * g, y + (random() - 0.5) * g], r0 * 1.1, 1, 1);
        }
      }
    };

    /** Wandering looping lines that only touch down where it is dark enough. */
    const scribble = async () => {
      // Scribble crosses itself, so each pass lays down about twice the line per area of a hatching
      // pass to read as dark: 2 × gap² / S of walk per seed.
      const STEP = 1.6;
      const levels = [{ thr: 0.1, gap: S * 4 }, { thr: 0.32, gap: S * 3.2 }, { thr: 0.55, gap: S * 2.6 }, { thr: 0.78, gap: S * 2.2 }];
      for (let li = 0; li < levels.length; li++) {
        const { thr, gap } = levels[li];
        const steps = Math.round((2.2 * gap * gap) / S / STEP);
        const rows = Math.ceil(N / gap);
        const st = stroker(r0 * 0.9, 1, 1);
        for (let gy = 0; gy < rows; gy++) {
          if (gy % 20 === 0) await breathe();
          for (let gx = 0; gx < rows; gx++) {
            let x = (gx + random()) * gap, y = (gy + random()) * gap;
            if (x >= N - 1 || y >= N - 1) continue;
            let at = Math.round(y) * N + Math.round(x);
            const id = ID[at];
            if (!id || tone[at] < thr - 0.05) continue;
            let angle = random() * 6.283, down = tone[at] > thr, up = 0;
            const curl = (random() - 0.5) * 0.3;
            const pen = penFor(at, li, gx + gy);
            for (let i = 0; i < steps; i++) {
              angle += (noise(x / 13, y / 13, 61 + li) - 0.5) * 0.9 + curl;
              x += Math.cos(angle) * STEP;
              y += Math.sin(angle) * STEP;
              const ix = Math.round(x), iy = Math.round(y);
              if (ix < 0 || iy < 0 || ix >= N || iy >= N) break;
              at = iy * N + ix;
              if (ID[at] !== id) break;
              const v = tone[at] + dither(ix, iy);
              if (down ? v < thr - 0.025 : v > thr + 0.025) down = !down;
              if (!down) { st.lift(); if (++up > 14) break; continue; }
              up = 0;
              st.down(x, y, pen);
            }
            st.lift();
          }
        }
      }
    };

    // ---- outlines: silhouettes, depth breaks, creases, painted detail ------------------------
    const outlines = async () => {
      if (a.edges === 'none') return;
      const heavy = a.edges === 'heavy';
      const rEdge = r0 * (heavy ? 2.1 : a.edges === 'silhouette' ? 1.35 : 1.2);
      const put = (k: number, x: number, y: number, r: number, alpha: number) => {
        const [ox, oy] = offsetOf(k, 0);
        const wx = (noise(x / 7, y / 7, 3) - 0.5) * 2 * wobble, wy = (noise(x / 7, y / 7, 4) - 0.5) * 2 * wobble;
        const press = 1 + (noise(x / 12, y / 12, 5) - 0.5) * 0.5;
        const dry = dryAt(x, y);
        const rr = r * press * (0.75 + 0.25 * dry);
        stamp(k, x + wx + ox, y + wy + oy, rr, (alpha * dry * (0.8 + 0.25 * press)) / integral(rr + 0.5));
        if (heavy) {
          const ax = (noise(x / 30, y / 30, 6) - 0.5) * 3.2, ay = (noise(x / 30, y / 30, 7) - 0.5) * 3.2;
          stamp(k, x + wx + ax + ox, y + wy + ay + oy, rr * 0.85, (alpha * 0.8 * dry) / integral(rr * 0.85 + 0.5));
        }
      };
      for (let y = 1; y < N - 1; y++) {
        if (y % 120 === 0) await breathe();
        for (let x = 1; x < N - 1; x++) {
          const at = y * N + x;
          const here = ID[at];
          for (let axis = 0; axis < 2; axis++) {
            const step = axis ? N : 1;
            const next = at + step, before = at - step;
            const there = ID[next];
            let kind = 0, front = at;
            if (here !== there) {
              if (Math.max(here, there) <= 1) kind = 0.9;
              else {
                front = there === 0 || (here !== 0 && D[at] <= D[next]) ? at : next;
                if (ID[front] <= 1) front = front === at ? next : at;
                const outward = (front === at ? 1 : -1) * (axis ? lightY : lightX);
                // The drafting convention: edges turned away from the light are drawn heavier.
                kind = 1.1 * (outward < -0.12 ? 1.3 : outward > 0.12 ? 0.85 : 1);
              }
            } else if (here >= 1 && a.edges !== 'silhouette') {
              if (Math.abs(D[before] - 2 * D[at] + D[next]) > depthBreak && ID[before] === here) {
                kind = 1;
                front = D[at] <= D[next] ? at : next;
              } else {
                const p = at * 4, q = next * 4;
                const ax = normal[p] - 127.5, ay = normal[p + 1] - 127.5, az = normal[p + 2] - 127.5;
                const bx = normal[q] - 127.5, by = normal[q + 1] - 127.5, bz = normal[q + 2] - 127.5;
                const facing = (ax * bx + ay * by + az * bz) / (Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz) + 1e-6);
                if (facing < (here === 1 ? 0.72 : 0.88)) kind = 0.7;
                else {
                  const change = Math.abs(color[p] - color[q]) + Math.abs(color[p + 1] - color[q + 1]) + Math.abs(color[p + 2] - color[q + 2]);
                  if (change > 84 && Math.abs(lit[at] - lit[next]) < 22) kind = 0.45;
                }
              }
            }
            if (!kind) continue;
            const far = ID[front] >= 2 ? away(front) : 0.2;
            put(penForEdge(front), x + (axis ? 0 : 0.5), y + (axis ? 0.5 : 0), rEdge * kind * mix(1.1, 0.72, far), mix(1, 0.8, far));
          }
        }
      }
    };

    // ---- the plotter's own marks on a proof --------------------------------------------------
    const proof = () => {
      const cross = (x: number, y: number) => {
        const ring: number[] = [];
        for (let i = 0; i <= 28; i++) ring.push(x + Math.cos((i / 28) * 6.283) * 7, y + Math.sin((i / 28) * 6.283) * 7);
        draw(0, ring, r0, 1, 0);
        draw(0, [x - 12, y, x + 12, y], r0, 1, 0);
        draw(0, [x, y - 12, x, y + 12], r0, 1, 0);
      };
      for (const [x, y] of [[26, 26], [N - 26, 26], [26, N - 26], [N - 26, N - 26]]) cross(x, y);
      pens.forEach((_, k) => {
        const x0 = 52 + k * 70, y0 = N - 20;
        const teeth: number[] = [];
        for (let i = 0; i <= 12; i++) teeth.push(x0 + i * 4, y0 + (i % 2 ? -5 : 5));
        draw(k, teeth, r0, 1, 0);
        draw(k, [x0, y0 + 11, x0 + 48, y0 + 11], r0, 1, 0);
        for (let j = 0; j < 5; j++) draw(k, [x0 + 2 + j * 11, y0 - 11], r0, 1, 0);
      });
    };

    // ---- plot --------------------------------------------------------------------------------
    await breathe();
    if (a.mark === 'wave') await waves();
    else if (a.mark === 'stipple') await stipple();
    else if (a.mark === 'scribble') await scribble();
    else {
      const crossed = a.mark === 'cross';
      // Four passes interleave down to a quarter of the spacing; when that would merge into a solid
      // for this nib, the two darkest passes cross the first instead of squeezing between its lines.
      const merges = S / 4 < minGap;
      const shifts = crossed ? [0, 0, 0.5, 0.5] : merges ? [0, 0.5, 0, 0.5] : [0, 0.5, 0.25, 0.75];
      const turns = crossed ? [0, 1.25, 0, 1.25] : merges ? [0, 0, 1.25, 1.25] : [0, 0, 0, 0];
      if (a.direction === 'form') {
        const tighten = [1, 0.72, 0.56, 0.45];
        for (let level = 0; level < 4; level++)
          await trace(level, Math.max(minGap, S * tighten[level]), crossed ? level % 2 === 1 : merges && level >= 2);
      } else if (a.direction === 'each') {
        const boxes = new Map<number, [number, number, number, number]>();
        for (let at = 0; at < total; at++) {
          const id = ID[at];
          if (!id) continue;
          const x = at % N, y = (at - x) / N;
          const box = boxes.get(id);
          if (!box) boxes.set(id, [x, y, x, y]);
          else {
            box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y);
            box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
          }
        }
        for (const [id, box] of boxes) for (let level = 0; level < 4; level++) await sweep(level, angleFor(id) + turns[level], S, shifts[level], id, box);
      } else {
        const angle = angleFor(2);
        for (let level = 0; level < 4; level++) await sweep(level, angle + turns[level], S, shifts[level], 0);
      }
    }
    await outlines();
    if (a.plot === 'proof') proof();
    if (a.plot === 'doubled') {
      const dx = (random() < 0.5 ? -1 : 1) * (2 + Math.round(random() * 2)), dy = (random() < 0.5 ? -1 : 1) * (1 + Math.round(random() * 2));
      for (const target of cov) {
        const copy = target.slice();
        for (let y = 0; y < N; y++) {
          const sy = y - dy;
          if (sy < 0 || sy >= N) continue;
          for (let x = 0; x < N; x++) {
            const sx = x - dx;
            if (sx >= 0 && sx < N) target[y * N + x] += copy[sy * N + sx] * 0.65;
          }
        }
      }
    }
    await breathe();

    // ---- ink on paper ------------------------------------------------------------------------
    const pixels = new Uint8ClampedArray(total * 4);
    const base = GROUND_PAPERS.has(a.paper) ? rekey({ paper: hex(paper.colour) }, context.palette, { paper: 'ground' }).paper : hex(paper.colour);
    const tint = (mood.warmth - 0.5) * (paper.dark ? 4 : 10);
    const stain: RGB = [168, 138, 88];
    const gridColour: RGB = [128, 172, 222];
    for (let y = 0; y < N; y++) {
      if (y % 64 === 0) await breathe();
      for (let x = 0; x < N; x++) {
        const at = y * N + x, p = at * 4;
        const fibre = (hash(x, y, 33) - 0.5) * 5 + (noise(x / 3.5, y / 1.6, 34) - 0.5) * 4 + (noise(x / 40, y / 40, 35) - 0.5) * 255 * paper.mottle;
        let r = base[0] + tint + fibre, g = base[1] + fibre, b = base[2] - tint + fibre;
        if (!paper.dark && mood.wear > 0.15) {
          const foxing = smooth(0.66, 0.92, noise(x / 90, y / 90, 37)) * mood.wear * 0.16;
          r = mix(r, stain[0], foxing); g = mix(g, stain[1], foxing); b = mix(b, stain[2], foxing);
        }
        if (paper.grid && (x % 20 === 0 || y % 20 === 0)) {
          const strength = x % 100 === 0 || y % 100 === 0 ? 0.3 : 0.16;
          r = mix(r, gridColour[0], strength); g = mix(g, gridColour[1], strength); b = mix(b, gridColour[2], strength);
        }
        for (let k = 0; k < n; k++) {
          const c = cov[k][at];
          if (c <= 0) continue;
          const alpha = 1 - Math.exp(-c * opacity);
          r = mix(r, pens[k][0], alpha); g = mix(g, pens[k][1], alpha); b = mix(b, pens[k][2], alpha);
        }
        pixels[p] = r;
        pixels[p + 1] = g;
        pixels[p + 2] = b;
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    const markNote = { hatch: 'parallel hatching', cross: 'cross-hatching', wave: 'wave lines', stipple: 'stippling', scribble: 'scribbled tone' }[a.mark];
    const directionNote = a.mark === 'stipple' || a.mark === 'scribble' ? '' : ` running ${{ diagonal: 'diagonally', counter: 'counter-diagonally', horizontal: 'horizontally', vertical: 'vertically', form: 'around the forms', light: 'across the light', each: 'at a different angle per object' }[a.direction]}`;
    return {
      pixels,
      notes: [
        `${set.name} on ${paper.name}${n > 1 ? `, shared out by ${a.assign}` : ''}`,
        `${markNote}${directionNote}, ${a.edges === 'none' ? 'no outlines' : `${a.edges} outlines`}`,
        { clean: 'a clean plot', drying: 'the pen ran dry in patches', shifted: 'layers out of register', doubled: 'plotted twice, ghosted', proof: 'a proof with registration marks and a pen test' }[a.plot],
      ],
    };
  },
});
