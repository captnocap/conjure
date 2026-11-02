import { type PaletteRole, choice, clamp01, defineLook, fromOklch, mix, noul, oklch, rekey, rekeyOne, score } from '@conjure/kit';

type RGB = readonly [number, number, number];

/** paper, line, accent (the marking pencil), whether the sheet is dark, how much the line bleeds. */
const STOCKS = {
  blueprint: { paper: [31, 74, 138], line: [232, 241, 248], accent: [255, 214, 92], dark: true, bleed: 0.55, mottle: 0.16 },
  cyan: { paper: [10, 30, 58], line: [108, 226, 242], accent: [255, 138, 92], dark: true, bleed: 0.15, mottle: 0.06 },
  sepia: { paper: [226, 206, 164], line: [88, 50, 24], accent: [168, 38, 28], dark: false, bleed: 0.5, mottle: 0.12 },
  blueline: { paper: [232, 230, 220], line: [58, 62, 160], accent: [196, 48, 44], dark: false, bleed: 0.45, mottle: 0.08 },
  vellum: { paper: [220, 216, 203], line: [26, 25, 24], accent: [200, 50, 30], dark: false, bleed: 0.1, mottle: 0.1 },
  cad: { paper: [12, 14, 18], line: [226, 228, 230], accent: [240, 80, 70], dark: true, bleed: 0, mottle: 0 },
} as const satisfies Record<string, { paper: RGB; line: RGB; accent: RGB; dark: boolean; bleed: number; mottle: number }>;

/**
 * Under the idea's palette the sheet takes its ground, the line work its ink and the marking pencil
 * its second colour, each keeping its tone (a dark sheet stays dark, a pale line pale). Black ink on
 * vellum and a CAD screen's white default line stay; the CAD layer colours turn onto the ink as a set
 * and the note layer takes the second colour.
 */
const STOCK_ROLES: Record<string, PaletteRole> = { paper: 'ground', line: 'ink', accent: 'second' };
const ROLES: Partial<Record<keyof typeof STOCKS, Record<string, PaletteRole>>> = {
  vellum: { paper: 'ground', accent: 'second' },
  cad: { paper: 'ground', accent: 'second' },
};

const CAD_LAYERS: RGB[] = [
  [84, 216, 232],
  [228, 116, 208],
  [240, 156, 74],
  [232, 214, 84],
  [150, 170, 255],
];
const CAD_NOTE: RGB = [118, 220, 118];

/** Single-stroke drafting capitals on a 4 × 6 grid: polylines of "xy" points, y down from the cap line. */
const GLYPHS: Record<string, string> = {
  '0': '10 30 41 45 36 16 05 01 10',
  '1': '11 20 26,16 36',
  '2': '01 10 30 41 42 06 46',
  '3': '00 40 22 32 43 45 36 16 05',
  '4': '36 30 04 44',
  '5': '40 00 02 32 43 45 36 16 05',
  '6': '30 10 02 05 16 36 45 44 33 03',
  '7': '00 40 16',
  '8': '10 30 41 42 33 13 02 01 10,13 04 05 16 36 45 44 33',
  '9': '43 13 02 01 10 30 41 44 26 16',
  A: '06 20 46,14 34',
  B: '06 00 30 41 42 33 03,33 44 45 36 06',
  C: '41 30 10 01 05 16 36 45',
  D: '06 00 30 41 45 36 06',
  E: '40 00 06 46,03 33',
  F: '40 00 06,03 33',
  G: '41 30 10 01 05 16 36 45 43 23',
  H: '00 06,40 46,03 43',
  I: '10 30,20 26,16 36',
  J: '40 45 36 16 05',
  K: '00 06,40 03 46',
  L: '00 06 46',
  M: '06 00 23 40 46',
  N: '06 00 46 40',
  O: '10 30 41 45 36 16 05 01 10',
  P: '06 00 30 41 42 33 03',
  Q: '10 30 41 45 36 16 05 01 10,34 46',
  R: '06 00 30 41 42 33 03,23 46',
  S: '41 30 10 01 02 13 33 44 45 36 16 05',
  T: '00 40,20 26',
  U: '00 05 16 36 45 40',
  V: '00 26 40',
  W: '00 16 23 36 40',
  X: '00 46,40 06',
  Y: '00 23 40,23 26',
  Z: '00 40 06 46',
  '.': '26 26',
  ':': '22 22,25 25',
  '-': '13 33',
  '/': '40 06',
  '+': '03 43,21 25',
};
const STROKES = new Map(
  Object.entries(GLYPHS).map(([key, lines]) => [
    key,
    lines.split(',').map((line) => line.split(' ').map((point) => [Number(point[0]), Number(point[1])] as const)),
  ]),
);

const STAMPS = ['SUPERSEDED', 'AS BUILT', 'VOID', 'FOR REVIEW', 'FILE COPY'];
const REDLINES = ['VERIFY ON SITE', 'REVISE', 'CHECK DIM', 'MOVE 200', 'OMIT', 'SEE NOTE 4', 'TOO TALL'];

/** A length in the unit a draughtsman would write it in. */
function length(metres: number, bare: boolean): string {
  if (metres < 0.0005) return `${(metres * 1e6).toFixed(0)} UM`;
  if (metres < 0.02) return `${(metres * 1000).toFixed(1)}${bare ? '' : ' MM'}`;
  if (metres < (bare ? 20 : 1)) return `${Math.round(metres * 1000)}${bare ? '' : ' MM'}`;
  if (metres < 1000) return `${metres.toFixed(metres < 10 ? 2 : 1)} M`;
  if (metres < 1e6) return `${(metres / 1000).toFixed(1)} KM`;
  const exponent = Math.floor(Math.log10(metres / 1000));
  return `${(metres / 1000 / 10 ** exponent).toFixed(1)}E${exponent} KM`;
}

/** The nearest standard drawing scale to a ratio. */
function standardScale(ratio: number): string {
  const nice = (value: number) => {
    const exponent = Math.floor(Math.log10(value));
    const mantissa = value / 10 ** exponent;
    const step = [1, 2, 2.5, 5, 10].reduce((best, each) => (Math.abs(Math.log(each / mantissa)) < Math.abs(Math.log(best / mantissa)) ? each : best));
    if (exponent >= 6) return `${step === 10 ? 1 : step}E${step === 10 ? exponent + 1 : exponent}`;
    return String(Math.round(step * 10 ** exponent));
  };
  return ratio >= 1 ? `1:${nice(ratio)}` : `${nice(1 / ratio)}:1`;
}

export default defineLook({
  questions: {
    stock: choice('What is the sheet printed on? Its colours come from the picture\u2019s palette.', {
      blueprint: 'A true blueprint: soft pale lines on a mottled deep sheet, slightly bled, the classic engineering copy.',
      cyan: 'Crisp glowing bright line work on a near-black sheet, a modern schematic or a film prop of a secret plan.',
      sepia: 'A diazo print: dark soft line on a warm mid-pale sheet, antique, a patent office or a ship yard.',
      blueline: 'A whiteprint: strong coloured line on off-white, the everyday office copy of the 1970s.',
      vellum: 'Black ink on pale drafting vellum, the hand-made original, precise and quiet.',
      cad: 'A CAD screen: thin coloured layers on a black screen, each object in its own layer colour, cold and exact.',
    }),
    weight: score('How heavy is the line work?', ['Hairline, delicate', 'Fine', 'Standard drafting weights', 'Bold', 'Heavy, poster-like']),
    hand: choice('Whose hand drew it?', {
      plotter: 'A plotter: perfectly even, mechanical, no hesitation anywhere.',
      ruled: 'A draughtsman with pen and straightedge: steady lines that overshoot their corners.',
      freehand: 'A freehand sketch on the back of a plan: wobbling doubled strokes, quick and confident.',
      pencil: 'Soft pencil: grainy grey strokes with construction lines never rubbed out.',
    }),
    shading: choice('How are the shadow sides rendered?', {
      hatch: 'Parallel diagonal hatching that thickens as the shadow deepens.',
      cross: 'Cross-hatching: a second set of strokes laid over the deepest shade.',
      planes: 'Each face hatched in its own direction, so the form turns as the strokes turn.',
      stipple: 'Stippled dots, denser in shadow, like a scientific plate.',
      poche: 'Flat tone poured into the shadows, like a filled section.',
      none: 'No shading at all: pure outline.',
    }),
    grid: choice('What is ruled under the drawing?', {
      none: 'Nothing: a plain sheet.',
      graph: 'Graph paper: a fine square grid with every fifth line heavier.',
      module: 'A broad structural grid with crosses where the lines meet.',
      iso: 'An isometric grid of three line families.',
      dots: 'A field of small dots.',
    }),
    notation: choice('How is the drawing annotated?', {
      ticks: 'Architectural dimensions: extension lines, slashed ticks and sizes in metres.',
      arrows: 'Engineering dimensions: arrowheads and sizes in millimetres.',
      callouts: 'Numbered balloons on leaders with a parts schedule in the corner.',
      survey: 'Survey marks: contour lines of depth, spot levels and crosses.',
      bare: 'No annotation: the drawing alone.',
    }),
    title: choice('How is the sheet titled?', {
      block: 'A ruled title block in the bottom right corner with scale, number and revision.',
      strip: 'A title strip running the full width of the bottom edge.',
      seal: 'A round seal with the title lettered beside it.',
      none: 'Untitled: only the border.',
    }),
    stage: choice('What has happened to this sheet?', {
      issued: 'Freshly issued: clean, approved, exactly as it left the office.',
      working: 'Still being worked out: construction lines, ghosts of an erased first attempt.',
      redlined: 'Marked up by a checker: revision clouds and blunt notes in coloured pencil.',
      superseded: 'Filed away: rubber-stamped across the face and punched for the binder.',
      site: 'A site copy: taped at the corners, folded in four, ringed by a coffee cup.',
    }),
    wash: noul('Is the drawing hand-coloured, with a thin wash of each object’s own colour under the lines?'),
  },

  async apply(capture, a, context, signal) {
    const N = capture.size;
    const total = N * N;
    const { mood, seed } = context;
    const { palette } = context;
    const designed = STOCKS[a.stock];
    const stock = { ...designed, ...rekey({ paper: designed.paper, line: designed.line, accent: designed.accent }, palette, ROLES[a.stock] ?? STOCK_ROLES) };
    // The layer set turns as one, pivoting on the set's own layer (tag 2, the largest area) so the
    // drawing's main colour is the palette's ink and every other layer keeps its hue step from it.
    let cadLayers = CAD_LAYERS;
    if (palette) {
      const [l0, c0, h0] = oklch(CAD_LAYERS[2]);
      const [l1, c1, h1] = oklch(rekeyOne(CAD_LAYERS[2], palette, 'ink'));
      cadLayers = CAD_LAYERS.map((c) => {
        const [l, ch, h] = oklch(c);
        return fromOklch(Math.min(0.98, Math.max(0.02, l + l1 - l0)), Math.min(2.5, c1 / c0) * ch, h + h1 - h0);
      });
    }
    const cadNote = rekeyOne(CAD_NOTE, palette, 'second');
    const breathe = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };

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

    // ---- the hand ----------------------------------------------------------------------------
    const wobble = { plotter: 0, ruled: 0.3, freehand: 1.7, pencil: 0.8 }[a.hand] * (0.8 + mood.energy * 0.5);
    const passes = a.hand === 'freehand' || a.hand === 'pencil' ? 2 : 1;
    const overshoot = { plotter: 0, ruled: 4, freehand: 2.5, pencil: 5 }[a.hand];
    const W = mix(0.42, 1.2, a.weight);
    const dx = (x: number, y: number, pass: number, amount: number) =>
      amount ? ((noise(x / 44, y / 44, 11 + pass * 7) - 0.5) * 2 + (noise(x / 8, y / 8, 13 + pass * 7) - 0.5) * 0.5) * amount : 0;
    const dy = (x: number, y: number, pass: number, amount: number) =>
      amount ? ((noise(x / 44, y / 44, 17 + pass * 7) - 0.5) * 2 + (noise(x / 8, y / 8, 19 + pass * 7) - 0.5) * 0.5) * amount : 0;

    // ---- layers ------------------------------------------------------------------------------
    const scene = new Float32Array(total); // the drawing itself
    const notes = new Float32Array(total); // border, dimensions, lettering
    const marks = new Float32Array(total); // the accent pencil or stamp
    const knock = new Float32Array(total); // where the drawing is cleared for lettering
    const layer = new Uint8Array(total); // which object each scene stroke belongs to

    const stamp = (target: Float32Array, cx: number, cy: number, r: number, alpha: number, tag = 0) => {
      const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(N - 1, Math.ceil(cx + r + 1));
      const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(N - 1, Math.ceil(cy + r + 1));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const cover = clamp01(r + 0.5 - Math.hypot(x - cx, y - cy)) * alpha;
          const at = y * N + x;
          if (cover > target[at]) {
            target[at] = cover;
            if (target === scene) layer[at] = tag;
          }
        }
    };
    const pen = (target: Float32Array, x: number, y: number, r: number, alpha: number, tag = 0, amount = wobble) => {
      if (passes === 1 && target !== marks) stamp(target, x + dx(x, y, 0, amount), y + dy(x, y, 0, amount), r, alpha, tag);
      else {
        stamp(target, x + dx(x, y, 0, amount), y + dy(x, y, 0, amount), r * 0.85, alpha * 0.8, tag);
        if (target !== marks) stamp(target, x + dx(x, y, 1, amount), y + dy(x, y, 1, amount), r * 0.8, alpha * 0.6, tag);
      }
    };
    interface Stroke { r?: number; alpha?: number; dash?: readonly number[]; over?: boolean; amount?: number }
    const line = (target: Float32Array, x0: number, y0: number, x1: number, y1: number, style: Stroke = {}) => {
      const { r = 0.5, alpha = 1, dash, over = false, amount = target === marks ? Math.max(wobble, 1.3) : wobble } = style;
      let span = Math.hypot(x1 - x0, y1 - y0);
      const ux = span ? (x1 - x0) / span : 0, uy = span ? (y1 - y0) / span : 0;
      const extra = over ? overshoot * (0.5 + hash(Math.round(x0 + x1), Math.round(y0 + y1), 5)) : 0;
      x0 -= ux * extra;
      y0 -= uy * extra;
      span += extra * 2;
      const period = dash ? dash.reduce((sum, each) => sum + each, 0) : 0;
      for (let t = 0; t <= span; t += 0.6) {
        if (dash) {
          let within = t % period, on = true;
          for (const each of dash) {
            if (within < each) break;
            within -= each;
            on = !on;
          }
          if (!on) continue;
        }
        pen(target, x0 + ux * t, y0 + uy * t, r, alpha, 0, amount);
      }
    };
    const arc = (target: Float32Array, cx: number, cy: number, radius: number, from: number, to: number, style: Stroke = {}) => {
      const { r = 0.5, alpha = 1, amount = target === marks ? Math.max(wobble, 1.3) : wobble } = style;
      const steps = Math.max(4, Math.ceil((Math.abs(to - from) * radius) / 0.6));
      for (let step = 0; step <= steps; step++) {
        const angle = from + ((to - from) * step) / steps;
        pen(target, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, r, alpha, 0, amount);
      }
    };
    const box = (target: Float32Array, x0: number, y0: number, x1: number, y1: number, style: Stroke = {}) => {
      line(target, x0, y0, x1, y0, style);
      line(target, x1, y0, x1, y1, style);
      line(target, x1, y1, x0, y1, style);
      line(target, x0, y1, x0, y0, style);
    };
    const clear = (x0: number, y0: number, x1: number, y1: number, amount = 1) => {
      for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(N - 1, Math.ceil(y1)); y++)
        for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(N - 1, Math.ceil(x1)); x++) knock[y * N + x] = Math.max(knock[y * N + x], amount);
    };
    const slant = a.hand === 'plotter' ? 0 : 0.18;
    const ADVANCE = 5.7;
    const textWidth = (text: string, height: number) => (text.length * ADVANCE - 1.7) * (height / 6);
    const letter = (
      target: Float32Array, text: string, x: number, y: number, height: number,
      options: { align?: 'left' | 'center' | 'right'; angle?: number; r?: number; alpha?: number; wipe?: boolean } = {},
    ) => {
      const { align = 'left', angle = 0, r = Math.max(0.5, height / 16), alpha = 1, wipe = true } = options;
      const unit = height / 6;
      const width = textWidth(text, height);
      const start = align === 'left' ? 0 : align === 'center' ? -width / 2 : -width;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const put = (lx: number, ly: number) => [x + lx * cos - ly * sin, y + lx * sin + ly * cos] as const;
      if (wipe) {
        const corners = [put(start - 3, 3), put(start + width + 3, 3), put(start - 3, -height - 3), put(start + width + 3, -height - 3)];
        clear(Math.min(...corners.map((c) => c[0])), Math.min(...corners.map((c) => c[1])), Math.max(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[1])), 0.92);
      }
      [...text].forEach((character, index) => {
        for (const stroke of STROKES.get(character) ?? []) {
          const points = stroke.map(([gx, gy]) => put(start + (index * ADVANCE + gx + slant * (6 - gy)) * unit, (gy - 6) * unit));
          if (points.length === 2 && points[0][0] === points[1][0] && points[0][1] === points[1][1])
            stamp(target, points[0][0], points[0][1], r * 1.5, alpha);
          for (let at = 1; at < points.length; at++)
            line(target, points[at - 1][0], points[at - 1][1], points[at][0], points[at][1], { r, alpha, amount: target === marks ? 0.9 : wobble * 0.35 });
        }
      });
    };

    // ---- read the capture --------------------------------------------------------------------
    const D = new Float32Array(total);
    const ID = new Uint8Array(total);
    const shade = new Float32Array(total);
    const histogram = new Uint32Array(256);
    let solid = 0, nearest = 1, farthest = 0;
    for (let at = 0; at < total; at++) {
      const o = at * 4;
      const id = capture.identity[o];
      ID[at] = id;
      D[at] = (capture.depth[o] + capture.depth[o + 1] / 255 + capture.depth[o + 2] / 65025) / 256;
      const lit = capture.diffuse[o] * 0.3 + capture.diffuse[o + 1] * 0.59 + capture.diffuse[o + 2] * 0.11;
      shade[at] = lit;
      if (id >= 1) {
        histogram[Math.round(lit)]++;
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
    const dim = percentile(0.03), bright = Math.max(dim + 12, percentile(0.8));
    /** 0 in full light, 1 in the deepest shadow. */
    const dark = (at: number) => 1 - clamp01((shade[at] - dim) / (bright - dim));
    /** 0 at the nearest object, 1 at the farthest. */
    const away = (at: number) => clamp01((D[at] - nearest) / (farthest - nearest));
    const range = capture.far - capture.near;
    const pws = capture.pixelWorldSize;
    const [lightX, lightY] = capture.light;

    // ---- sheet layout ------------------------------------------------------------------------
    const M = 22; // margin to the border
    const inner = { x0: M, y0: M, x1: N - M, y1: N - M };
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) if (x < M || y < M || x > N - M || y > N - M) knock[y * N + x] = 1;

    // ---- the drawing: outlines, breaks, creases, surface detail ------------------------------
    const depthBreak = (pws * 1.5) / range;
    for (let y = 1; y < N - 1; y++) {
      if (y % 240 === 0) await breathe();
      for (let x = 1; x < N - 1; x++) {
        const at = y * N + x;
        const here = ID[at];
        for (let axis = 0; axis < 2; axis++) {
          const step = axis ? N : 1;
          const next = at + step, before = at - step;
          const there = ID[next];
          let kind = 0, tag = here, front = at;
          if (here !== there) {
            if (Math.max(here, there) <= 1) kind = 0.9;
            else {
              front = there === 0 || (here !== 0 && D[at] <= D[next]) ? at : next;
              if (ID[front] <= 1) front = front === at ? next : at;
              tag = ID[front];
              const outward = (front === at ? 1 : -1) * (axis ? lightY : lightX);
              // The drafting convention of the shadow line: edges turned from the light are drawn heavier.
              kind = 1.6 * (outward < -0.12 ? 1.4 : outward > 0.12 ? 0.85 : 1);
            }
          } else if (here >= 1) {
            if (Math.abs(D[before] - 2 * D[at] + D[next]) > depthBreak && ID[before] === here) {
              kind = 1.25;
              front = D[at] <= D[next] ? at : next;
            } else {
              const p = at * 4, q = next * 4;
              const ax = capture.normal[p] - 127.5, ay = capture.normal[p + 1] - 127.5, az = capture.normal[p + 2] - 127.5;
              const bx = capture.normal[q] - 127.5, by = capture.normal[q + 1] - 127.5, bz = capture.normal[q + 2] - 127.5;
              const facing = (ax * bx + ay * by + az * bz) / (Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz) + 1e-6);
              if (facing < (here === 1 ? 0.7 : 0.88)) kind = 0.75;
              else {
                const change =
                  Math.abs(capture.color[p] - capture.color[q]) + Math.abs(capture.color[p + 1] - capture.color[q + 1]) + Math.abs(capture.color[p + 2] - capture.color[q + 2]);
                // Painted detail, labels and seams, but not the soft edge of a shadow.
                if (change > 84 && Math.abs(shade[at] - shade[next]) < 22) kind = 0.45;
              }
            }
          }
          if (!kind) continue;
          const far = away(front);
          pen(scene, x + (axis ? 0 : 0.5), y + (axis ? 0.5 : 0), Math.min(3.2, W * kind * mix(1.3, 0.6, far)), mix(1, 0.62, far), tag);
        }
      }
    }
    await breathe();

    // ---- what stands in the scene ------------------------------------------------------------
    interface Part { id: number; x0: number; y0: number; x1: number; y1: number; count: number; cx: number; cy: number }
    const found = new Map<number, Part>();
    for (let y = M; y < N - M; y++)
      for (let x = M; x < N - M; x++) {
        const id = ID[y * N + x];
        if (id < 2) continue;
        let part = found.get(id);
        if (!part) found.set(id, (part = { id, x0: x, y0: y, x1: x, y1: y, count: 0, cx: 0, cy: 0 }));
        part.x0 = Math.min(part.x0, x);
        part.x1 = Math.max(part.x1, x);
        part.y1 = y;
        part.count++;
        part.cx += x;
        part.cy += y;
      }
    const parts = [...found.values()].filter((part) => part.count > 500).sort((one, two) => two.count - one.count);
    for (const part of parts) {
      part.cx /= part.count;
      part.cy /= part.count;
    }
    const hero = parts[0];

    // ---- border, zones, title ----------------------------------------------------------------
    box(notes, inner.x0, inner.y0, inner.x1, inner.y1, { r: Math.max(0.9, W * 1.5), over: true });
    box(notes, 7, 7, N - 7, N - 7, { r: 0.4, alpha: 0.6 });
    if (a.title !== 'none')
      for (let zone = 0; zone < 6; zone++) {
        const centre = M + ((N - 2 * M) * (zone + 0.5)) / 6, edge = M + ((N - 2 * M) * zone) / 6;
        if (zone) {
          line(notes, edge, 7, edge, M, { r: 0.4 });
          line(notes, 7, edge, M, edge, { r: 0.4 });
          line(notes, edge, N - M, edge, N - 7, { r: 0.4 });
          line(notes, N - M, edge, N - 7, edge, { r: 0.4 });
        }
        letter(notes, String(zone + 1), centre, M - 6, 7, { align: 'center', wipe: false });
        letter(notes, 'ABCDEF'[zone], 14.5, centre + 3.5, 7, { align: 'center', wipe: false });
      }

    const idea = (context.idea.toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() || 'UNTITLED').split(' ');
    const titled = (room: number, height: number) => {
      const fits = Math.floor((room / (height / 6) + 1.7) / ADVANCE);
      let text = '';
      for (const word of idea) {
        if ((text ? text.length + 1 : 0) + word.length > fits) break;
        text += (text ? ' ' : '') + word;
      }
      return text || idea[0].slice(0, fits);
    };
    const number = `${'ACDEKMPS'[seed % 8]}-${String(1000 + (seed % 8999))}`;
    const revision = 'ABCDEFG'[Math.min(6, Math.floor(mood.wear * 4 + (seed % 3)))];
    const drawnBy = 'JKLMRSTW'[(seed >>> 3) % 8] + 'ABCDEGHP'[(seed >>> 6) % 8];
    const scaleText = `SCALE ${standardScale((pws * N) / 0.42)}`;
    let floor = inner.y1; // the lowest y left free for the scale bar and notes
    let blockLeft = inner.x1; // the left edge of anything standing in the bottom-right corner
    let blockTop = inner.y1;
    const heavy = { r: Math.max(0.8, W * 1.2) }, light = { r: 0.5 };
    if (a.title === 'block') {
      const x0 = inner.x1 - 270, y0 = inner.y1 - 94;
      clear(x0, y0, inner.x1, inner.y1);
      box(notes, x0, y0, inner.x1, inner.y1, { ...heavy, over: true });
      line(notes, x0, y0 + 38, inner.x1, y0 + 38, light);
      line(notes, x0, y0 + 66, inner.x1, y0 + 66, light);
      line(notes, x0 + 150, y0 + 38, x0 + 150, y0 + 66, light);
      line(notes, x0 + 96, y0 + 66, x0 + 96, inner.y1, light);
      line(notes, x0 + 196, y0 + 66, x0 + 196, inner.y1, light);
      const big = textWidth(idea.join(' '), 14) <= 250 ? 14 : 10;
      letter(notes, titled(250, big), x0 + 135, y0 + 19 + big / 2, big, { align: 'center', r: big / 11, wipe: false });
      letter(notes, scaleText, x0 + 10, y0 + 57, 9, { wipe: false });
      letter(notes, `DWG ${number}`, x0 + 160, y0 + 57, 9, { wipe: false });
      letter(notes, `DRN ${drawnBy}`, x0 + 10, y0 + 85, 9, { wipe: false });
      letter(notes, 'SHT 1/3', x0 + 106, y0 + 85, 9, { wipe: false });
      letter(notes, `REV ${revision}`, x0 + 206, y0 + 85, 9, { wipe: false });
      blockLeft = x0;
      blockTop = y0;
    } else if (a.title === 'strip') {
      const y0 = inner.y1 - 40;
      clear(inner.x0, y0, inner.x1, inner.y1);
      line(notes, inner.x0, y0, inner.x1, y0, heavy);
      for (const x of [inner.x1 - 80, inner.x1 - 212, inner.x1 - 350]) line(notes, x, y0, x, inner.y1, light);
      letter(notes, titled(inner.x1 - 350 - inner.x0 - 24, 13), inner.x0 + 12, y0 + 27, 13, { r: 1.1, wipe: false });
      letter(notes, scaleText, inner.x1 - 340, y0 + 25, 9, { wipe: false });
      letter(notes, `DWG ${number}`, inner.x1 - 202, y0 + 25, 9, { wipe: false });
      letter(notes, `REV ${revision}`, inner.x1 - 70, y0 + 25, 9, { wipe: false });
      floor = y0;
      blockTop = y0;
    } else if (a.title === 'seal') {
      const cx = inner.x1 - 58, cy = inner.y1 - 58;
      for (let y = cy - 52; y <= cy + 52; y++) for (let x = cx - 52; x <= cx + 52; x++) if (Math.hypot(x - cx, y - cy) < 51) knock[y * N + x] = 1;
      arc(notes, cx, cy, 46, 0, Math.PI * 2, heavy);
      arc(notes, cx, cy, 41, 0, Math.PI * 2, light);
      arc(notes, cx, cy, 27, 0, Math.PI * 2, light);
      for (let tick = 0; tick < 48; tick++) {
        const angle = (tick / 48) * Math.PI * 2;
        line(notes, cx + Math.cos(angle) * 29, cy + Math.sin(angle) * 29, cx + Math.cos(angle) * (tick % 4 ? 34 : 39), cy + Math.sin(angle) * (tick % 4 ? 34 : 39), { r: 0.45 });
      }
      letter(notes, 'DWG', cx, cy - 3, 8, { align: 'center', wipe: false });
      letter(notes, number.slice(2), cx, cy + 12, 9, { align: 'center', wipe: false });
      const text = titled(300, 12);
      letter(notes, text, cx - 58, inner.y1 - 24, 12, { align: 'right', r: 1 });
      line(notes, cx - 58 - textWidth(text, 12) - 6, inner.y1 - 18, cx - 50, inner.y1 - 18, { ...light, over: true });
      letter(notes, `${scaleText}  REV ${revision}`, cx - 58, inner.y1 - 6, 7, { align: 'right' });
      blockLeft = cx - 52;
      blockTop = cy - 52;
    }
    await breathe();

    // ---- annotation --------------------------------------------------------------------------
    const many = Math.min(parts.length, 1 + Math.round(mood.density * 2));
    const thin = { r: 0.45, alpha: 0.9 };
    const within = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
    const terminator = (x: number, y: number, ux: number, uy: number) => {
      if (a.notation === 'arrows') for (const spread of [-0.3, -0.15, 0, 0.15, 0.3]) line(notes, x, y, x + (ux - uy * spread) * 8, y + (uy + ux * spread) * 8, { r: 0.5 });
      else line(notes, x - (ux + uy) * 0 - 3.5 * (ux - uy), y - 3.5 * (uy + ux), x + 3.5 * (ux - uy), y + 3.5 * (uy + ux), { r: 0.95 });
    };
    const dimension = (x0: number, y0: number, x1: number, y1: number, text: string) => {
      const span = Math.hypot(x1 - x0, y1 - y0);
      const ux = (x1 - x0) / span, uy = (y1 - y0) / span;
      line(notes, x0, y0, x1, y1, { ...thin, over: a.notation === 'ticks' });
      terminator(x0, y0, ux, uy);
      terminator(x1, y1, -ux, -uy);
      const upright = Math.abs(uy) > Math.abs(ux);
      if (upright) letter(notes, text, (x0 + x1) / 2 - 5, (y0 + y1) / 2, 8, { align: 'center', angle: -Math.PI / 2 });
      else letter(notes, text, (x0 + x1) / 2, (y0 + y1) / 2 - 5, 8, { align: 'center' });
    };
    const bare = a.notation === 'arrows';
    if (a.notation === 'ticks' || a.notation === 'arrows')
      parts.slice(0, many).forEach((part, index) => {
        const gap = 18 + index * 4;
        // Width, below the part unless the title is in the way.
        let y = part.y1 + gap;
        if (y > floor - 12 || (y > blockTop - 10 && part.x1 > blockLeft - 10)) y = part.y0 - gap;
        y = within(y, inner.y0 + 16, floor - 10);
        const away1 = y > part.y1 ? 1 : -1;
        const edge = y > part.y1 ? part.y1 : part.y0;
        line(notes, part.x0, edge + away1 * 4, part.x0, y + away1 * 5, thin);
        line(notes, part.x1, edge + away1 * 4, part.x1, y + away1 * 5, thin);
        dimension(part.x0, y, part.x1, y, length((part.x1 - part.x0) * pws, bare));
        // Height, on the open side.
        let x = part.cx < N / 2 ? part.x0 - gap : part.x1 + gap;
        if (x < inner.x0 + 16) x = part.x1 + gap;
        if (x > inner.x1 - 12) x = part.x0 - gap;
        x = within(x, inner.x0 + 16, inner.x1 - 12);
        const side = x > part.x1 ? 1 : -1;
        const from = x > part.x1 ? part.x1 : part.x0;
        line(notes, from + side * 4, part.y0, x + side * 5, part.y0, thin);
        line(notes, from + side * 4, part.y1, x + side * 5, part.y1, thin);
        dimension(x, part.y0, x, part.y1, length((part.y1 - part.y0) * pws, bare));
      });
    if (a.notation === 'callouts') {
      const listed = parts.slice(0, Math.min(parts.length, 2 + Math.round(mood.density * 4)));
      listed.forEach((part, index) => {
        const side = part.cx < N / 2 ? -1 : 1;
        const fromX = part.cx, fromY = part.y0 + (part.y1 - part.y0) * 0.3;
        const toX = within(fromX + side * (48 + index * 9), inner.x0 + 20, inner.x1 - 20);
        const toY = within(part.y0 - 26 - index * 7, inner.y0 + 20 + (toX < 220 ? listed.length * 14 + 30 : 0), floor - 20);
        const span = Math.hypot(toX - fromX, toY - fromY) || 1;
        stamp(notes, fromX, fromY, 2, 1);
        line(notes, fromX, fromY, toX - ((toX - fromX) / span) * 10, toY - ((toY - fromY) / span) * 10, thin);
        clear(toX - 10, toY - 10, toX + 10, toY + 10);
        arc(notes, toX, toY, 10, 0, Math.PI * 2, { r: 0.7 });
        letter(notes, String(index + 1), toX, toY + 4, 8, { align: 'center', wipe: false });
      });
      const x0 = inner.x0 + 10, y0 = inner.y0 + 10, row = 14, wide = 176;
      clear(x0, y0, x0 + wide, y0 + row * (listed.length + 1));
      box(notes, x0, y0, x0 + wide, y0 + row * (listed.length + 1), { r: 0.6 });
      line(notes, x0, y0 + row, x0 + wide, y0 + row, { r: 0.6 });
      for (const x of [x0 + 34, x0 + 104]) line(notes, x, y0, x, y0 + row * (listed.length + 1), thin);
      ['NO', 'WIDE', 'HIGH'].forEach((head, column) => letter(notes, head, x0 + [6, 40, 110][column], y0 + 11, 7, { wipe: false }));
      listed.forEach((part, index) => {
        const y = y0 + row * (index + 2) - 3;
        letter(notes, String(index + 1), x0 + 12, y, 7, { wipe: false });
        letter(notes, length((part.x1 - part.x0) * pws, false), x0 + 40, y, 7, { wipe: false });
        letter(notes, length((part.y1 - part.y0) * pws, false), x0 + 110, y, 7, { wipe: false });
      });
    }
    if (a.notation === 'survey') {
      const spots = 3 + Math.round(mood.density * 6);
      for (let spot = 0, tries = 0; spot < spots && tries < 200; tries++) {
        const x = Math.round(inner.x0 + 40 + context.random() * (N - 2 * M - 120));
        const y = Math.round(inner.y0 + 40 + context.random() * (N - 2 * M - 80));
        const at = y * N + x;
        if (ID[at] < 1 || knock[at] > 0) continue;
        line(notes, x - 5, y, x + 5, y, { r: 0.6 });
        line(notes, x, y - 5, x, y + 5, { r: 0.6 });
        letter(notes, `+${length((farthest - D[at]) * range + pws, true).replace(' M', '')}`, x + 8, y - 4, 7);
        spot++;
      }
    }
    if (a.notation !== 'bare') {
      // The centre line of the principal object, the light, and a bar scale.
      if (hero) line(notes, hero.cx, Math.max(inner.y0 + 6, hero.y0 - 26), hero.cx, Math.min(floor - 6, hero.y1 + 26), { r: 0.45, alpha: 0.85, dash: [16, 4, 3, 4] });
      const sx = inner.x1 - 40, sy = inner.y0 + 40;
      const flat = Math.hypot(lightX, lightY);
      clear(sx - 26, sy - 26, sx + 26, sy + 34);
      arc(notes, sx, sy, 13, 0, Math.PI * 2, { r: 0.6 });
      if (flat > 0.08) {
        const ux = lightX / flat, uy = lightY / flat;
        line(notes, sx + ux * 24, sy + uy * 24, sx - ux * 17, sy - uy * 17, { r: 0.7 });
        for (const spread of [-0.35, -0.18, 0.18, 0.35]) line(notes, sx - ux * 17, sy - uy * 17, sx - ux * 8 + uy * spread * 9, sy - uy * 8 - ux * spread * 9, { r: 0.5 });
      } else stamp(notes, sx, sy, 2.5, 1);
      letter(notes, 'LIGHT', sx, sy + 30, 7, { align: 'center', wipe: false });

      const target = 150 * pws;
      const exponent = Math.floor(Math.log10(target));
      const unit = [5, 2, 1].map((each) => each * 10 ** exponent).find((each) => each <= target) ?? 10 ** exponent;
      const barWidth = unit / pws, bx = inner.x0 + 16, by = floor - 14;
      clear(bx - 8, by - 20, bx + barWidth + 70, by + 8);
      box(notes, bx, by - 5, bx + barWidth, by, { r: 0.5 });
      for (let part = 0; part < 4; part++) {
        line(notes, bx + (barWidth * part) / 4, by - 5, bx + (barWidth * part) / 4, by, { r: 0.5 });
        if (part % 2 === 0) for (let fill = 1; fill < 5; fill++) line(notes, bx + (barWidth * part) / 4, by - fill, bx + (barWidth * (part + 1)) / 4, by - fill, { r: 0.5, amount: 0 });
      }
      letter(notes, '0', bx, by - 9, 7, { align: 'center', wipe: false });
      letter(notes, length(unit, false), bx + barWidth + 6, by, 7, { wipe: false });
    }
    await breathe();

    // ---- what happened to the sheet ----------------------------------------------------------
    const creased = clamp01(mood.wear * 0.8 + (a.stage === 'site' ? 0.7 : a.stage === 'superseded' ? 0.25 : 0));
    let ring: [number, number, number] | null = null;
    if (a.stage === 'working' || a.hand === 'pencil') {
      const faint = { r: 0.4, alpha: a.stage === 'working' ? 0.42 : 0.28 };
      for (const part of parts.slice(0, a.stage === 'working' ? 3 : 1)) {
        for (const x of [part.x0, part.x1]) line(notes, x, inner.y0, x, floor, faint);
        for (const y of [part.y0, part.y1]) line(notes, inner.x0, y, inner.x1, y, faint);
        line(notes, part.x0, part.y0, part.x1, part.y1, faint);
        line(notes, part.x1, part.y0, part.x0, part.y1, faint);
      }
    }
    if (a.stage === 'redlined') {
      const pencil = { r: 1.15, alpha: 0.92 };
      const subject = parts[Math.min(parts.length - 1, 1)] ?? { x0: N * 0.35, y0: N * 0.35, x1: N * 0.65, y1: N * 0.6, cx: N / 2, cy: N / 2 };
      const x0 = Math.max(inner.x0 + 12, subject.x0 - 12), x1 = Math.min(inner.x1 - 12, subject.x1 + 12);
      const y0 = Math.max(inner.y0 + 12, subject.y0 - 12), y1 = Math.min(floor - 12, subject.y1 + 12);
      const across = Math.max(2, Math.round((x1 - x0) / 20)), down = Math.max(2, Math.round((y1 - y0) / 20));
      const bx = (x1 - x0) / across / 2, by = (y1 - y0) / down / 2;
      for (let bump = 0; bump < across; bump++) {
        arc(marks, x0 + bx * (2 * bump + 1), y0, bx, Math.PI, Math.PI * 2, pencil);
        arc(marks, x0 + bx * (2 * bump + 1), y1, bx, 0, Math.PI, pencil);
      }
      for (let bump = 0; bump < down; bump++) {
        arc(marks, x0, y0 + by * (2 * bump + 1), by, Math.PI / 2, Math.PI * 1.5, pencil);
        arc(marks, x1, y0 + by * (2 * bump + 1), by, -Math.PI / 2, Math.PI / 2, pencil);
      }
      const leftward = subject.cx > N / 2;
      const noteX = leftward ? Math.max(inner.x0 + 20, x0 - 150) : Math.min(inner.x1 - 150, x1 + 26);
      const noteY = within(y0 - 22, inner.y0 + 44, floor - 30);
      const tilt = (context.random() - 0.5) * 0.16;
      letter(marks, REDLINES[Math.floor(context.random() * REDLINES.length)], noteX, noteY, 12, { angle: tilt, r: 1.1, wipe: false });
      line(marks, noteX + (leftward ? 120 : 0), noteY + 6, leftward ? x0 - 4 : x1 + 4, y0 + 14, pencil);
      const tx = leftward ? x1 + 8 : x0 - 30, ty = y1 - 8;
      if (tx > inner.x0 + 6 && tx < inner.x1 - 30) {
        line(marks, tx, ty, tx + 22, ty, pencil);
        line(marks, tx + 22, ty, tx + 11, ty - 19, pencil);
        line(marks, tx + 11, ty - 19, tx, ty, pencil);
        letter(marks, String(1 + (seed % 4)), tx + 11, ty - 3, 8, { align: 'center', r: 0.9, wipe: false });
      }
      if (hero && hero !== subject) {
        line(marks, hero.x0 + 6, hero.y1 + 8, hero.x1 - 6, hero.y1 + 12, pencil);
        line(marks, hero.x0 + 10, hero.y1 + 13, hero.x1 - 16, hero.y1 + 16, pencil);
      }
    }
    if (a.stage === 'superseded') {
      const word = STAMPS[Math.floor(context.random() * STAMPS.length)];
      const height = 34, tilt = -0.22 + (context.random() - 0.5) * 0.2;
      const cx = N * (0.42 + context.random() * 0.16), cy = N * (0.4 + context.random() * 0.2);
      const half = textWidth(word, height) / 2 + 18, tall = height / 2 + 14;
      const cos = Math.cos(tilt), sin = Math.sin(tilt);
      const corner = (u: number, v: number) => [cx + u * cos - v * sin, cy + u * sin + v * cos] as const;
      for (const grow of [0, 6]) {
        const c = [corner(-half - grow, -tall - grow), corner(half + grow, -tall - grow), corner(half + grow, tall + grow), corner(-half - grow, tall + grow)];
        c.forEach((from, index) => {
          const to = c[(index + 1) % 4];
          line(marks, from[0], from[1], to[0], to[1], { r: grow ? 1.1 : 2.2, amount: 0.25 });
        });
      }
      const [tx, ty] = corner(0, height / 2);
      letter(marks, word, tx, ty, height, { align: 'center', angle: tilt, r: 2.6, wipe: false });
    }
    if (a.stage === 'site') ring = [N * (0.2 + context.random() * 0.6), N * (0.2 + context.random() * 0.55), 30 + context.random() * 16];
    await breathe();

    // ---- shading, grid and the finished coverage ----------------------------------------------
    const ink = new Float32Array(total);
    const spacing = a.shading === 'stipple' ? 4.6 : mix(5.6, 4.6, a.weight);
    const strokeWeight = mix(0.75, 1.3, a.weight);
    const ruled = (x: number, y: number, angle: number, pitch: number, half: number) => {
      const v = (x * Math.cos(angle) + y * Math.sin(angle)) / pitch;
      return clamp01(half + 0.5 - Math.abs(v - Math.round(v)) * pitch);
    };
    const isoStep = (pws * 16) / range;
    for (let y = 0; y < N; y++) {
      if (y % 240 === 0) await breathe();
      for (let x = 0; x < N; x++) {
        const at = y * N + x;
        const id = ID[at];
        let cover = scene[at];
        const k = id >= 1 ? dark(at) : 0;
        const deep = clamp01((k - 0.3) / 0.7);
        if (deep > 0 && a.shading !== 'none') {
          const X = x + dx(x, y, 2, wobble * 1.4), Y = y + dy(x, y, 2, wobble * 1.4);
          let tone = 0;
          if (a.shading === 'poche') tone = deep > 0.55 ? 0.62 : deep > 0.12 ? 0.34 : 0;
          else if (a.shading === 'stipple') {
            const cx = Math.floor(X / spacing), cy = Math.floor(Y / spacing);
            const radius = mix(0.25, 1.55, deep) * strokeWeight;
            const room = Math.max(0, spacing / 2 - radius);
            const px = (cx + 0.5) * spacing + (hash(cx, cy, 31) - 0.5) * 2 * room, py = (cy + 0.5) * spacing + (hash(cx, cy, 37) - 0.5) * 2 * room;
            tone = clamp01(radius + 0.5 - Math.hypot(X - px, Y - py));
          } else {
            let angle = id === 1 ? -Math.PI / 4 : Math.PI / 4 + (((id * 37) % 5) - 2) * 0.1;
            if (a.shading === 'planes') {
              const o = at * 4;
              const nx = capture.normal[o] - 127.5, ny = -(capture.normal[o + 1] - 127.5), nz = capture.normal[o + 2] - 127.5;
              if (Math.hypot(nx, ny) > Math.abs(nz) * 0.45) angle = Math.round(Math.atan2(ny, nx) / (Math.PI / 6)) * (Math.PI / 6);
              else angle = Math.PI / 4;
            }
            tone = ruled(X, Y, angle, id === 1 ? spacing * 1.25 : spacing, mix(0.05, 0.95, deep) * strokeWeight);
            if (a.shading === 'cross' && deep > 0.5) tone = Math.max(tone, ruled(X, Y, angle + Math.PI / 2, spacing, mix(0.05, 0.8, (deep - 0.5) * 2) * strokeWeight));
          }
          tone *= mix(0.86, 0.5, away(at));
          if (tone > cover) {
            cover = tone;
            layer[at] = id;
          }
        }
        if (a.notation === 'survey' && id >= 1 && x > 0 && x < N - 1 && y > 0 && y < N - 1) {
          const slope = Math.hypot(D[at + 1] - D[at - 1], D[at + N] - D[at - N]) / 2 / isoStep;
          if (slope > 0.004 && slope < 0.7) {
            const v = D[at] / isoStep;
            const contour = clamp01(0.95 - Math.abs(v - Math.round(v)) / slope) * 0.5;
            if (contour > cover) {
              cover = contour;
              layer[at] = id;
            }
          }
        }
        if (a.stage === 'working' && x > 6 && y > 4) cover = Math.max(cover, scene[at - 6 - 4 * N] * 0.17);
        cover *= 1 - knock[at];
        if (knock[at] < 1 && a.grid !== 'none') {
          let rule = 0;
          if (a.grid === 'graph') rule = Math.max((x - M) % 12 === 0 || (y - M) % 12 === 0 ? 0.1 : 0, (x - M) % 60 === 0 || (y - M) % 60 === 0 ? 0.24 : 0);
          else if (a.grid === 'module') {
            const gx = (x - M) % 116, gy = (y - M) % 116;
            rule = (gx === 0 && y % 6 < 4) || (gy === 0 && x % 6 < 4) ? 0.2 : 0;
            if ((gx < 7 || gx > 109) && (gy < 7 || gy > 109) && (gx === 0 || gy === 0)) rule = 0.75;
          } else if (a.grid === 'iso') rule = Math.max(ruled(x, y, Math.PI / 6, 22, 0), ruled(x, y, (5 * Math.PI) / 6, 22, 0), ruled(x, y, 0, 22 / Math.cos(Math.PI / 6), 0)) * 0.16;
          else rule = clamp01(1.5 - Math.hypot(((x - M + 9) % 18) - 9, ((y - M + 9) % 18) - 9)) * 0.38;
          cover = Math.max(cover, rule);
        }
        if (notes[at] > cover) {
          cover = notes[at];
          layer[at] = 255;
        }
        ink[at] = cover;
      }
    }

    // Blueprints and diazo prints are contact copies: the line spreads a little into the paper.
    if (stock.bleed > 0 || a.hand === 'pencil') {
      const soft = Math.max(stock.bleed, a.hand === 'pencil' ? 0.4 : 0);
      const blurred = new Float32Array(total);
      for (let y = 1; y < N - 1; y++)
        for (let x = 1; x < N - 1; x++) {
          const at = y * N + x;
          blurred[at] = ink[at] * 0.4 + (ink[at - 1] + ink[at + 1] + ink[at - N] + ink[at + N]) * 0.15;
        }
      for (let at = 0; at < total; at++) ink[at] = clamp01(mix(ink[at], blurred[at] * 1.12, soft));
    }
    await breathe();

    // ---- print ---------------------------------------------------------------------------------
    const pixels = new Uint8ClampedArray(total * 4);
    const warm = mood.warmth - 0.5;
    const paper: RGB = stock.dark
      ? [stock.paper[0] + warm * 16, stock.paper[1] - warm * 4, stock.paper[2] - warm * 22]
      : [stock.paper[0] + warm * 8, stock.paper[1], stock.paper[2] - warm * 18];
    const graphite = a.hand === 'pencil';
    const lineColour: RGB = graphite ? [0, 1, 2].map((c) => mix(stock.line[c], paper[c], 0.22)) as unknown as RGB : stock.line;
    const fold: RGB = stock.dark ? [paper[0] * 1.5 + 70, paper[1] * 1.4 + 60, paper[2] * 1.2 + 40] : [paper[0] * 0.78, paper[1] * 0.76, paper[2] * 0.72];
    const stain: RGB = stock.dark ? [paper[0] * 0.7 + 30, paper[1] * 0.7 + 20, paper[2] * 0.55] : [150, 108, 62];
    const fade = mood.wear * 0.5 + (a.stage === 'site' ? 0.2 : 0);
    const holes = a.stage === 'superseded';
    for (let y = 0; y < N; y++) {
      if (y % 240 === 0) await breathe();
      for (let x = 0; x < N; x++) {
        const at = y * N + x, o = at * 4;
        const id = ID[at];
        const grain = hash(x, y, 3) - 0.5;
        const cloud = noise(x / 110, y / 110, 41) - 0.5 + (noise(x / 23, y / 23, 43) - 0.5) * 0.35;
        const tone = 1 + cloud * stock.mottle * 2 + grain * (stock.dark ? 0.05 : 0.035);
        let r = paper[0] * tone, g = paper[1] * tone, b = paper[2] * tone;

        // Worn sheets fade and foul from the edges inward.
        const rim = Math.min(x, y, N - 1 - x, N - 1 - y) / N;
        const aged = rim < 0.16 && fade > 0.01 && a.stock !== 'cad' ? ((0.16 - rim) / 0.16) * fade * (0.6 + noise(x / 60, y / 60, 47) * 0.8) : 0;
        if (aged > 0) {
          r = mix(r, stain[0] * 1.25 + (stock.dark ? 40 : 30), aged * 0.5);
          g = mix(g, stain[1] * 1.25 + (stock.dark ? 40 : 26), aged * 0.5);
          b = mix(b, stain[2] * 1.25 + (stock.dark ? 50 : 10), aged * 0.5);
        }
        const blot = a.stock === 'cad' ? 0 : clamp01((noise(x / 70, y / 70, 53) - (0.86 - mood.wear * 0.3)) * 6);
        if (blot > 0) {
          r = mix(r, stain[0], blot * 0.35);
          g = mix(g, stain[1], blot * 0.35);
          b = mix(b, stain[2], blot * 0.35);
        }

        if (a.wash && id >= 1 && knock[at] < 0.5) {
          const base = capture.baseColors[id];
          const cr = base ? mix(base[0], capture.color[o], 0.45) : capture.color[o];
          const cg = base ? mix(base[1], capture.color[o + 1], 0.45) : capture.color[o + 1];
          const cb = base ? mix(base[2], capture.color[o + 2], 0.45) : capture.color[o + 2];
          const hand = (id === 1 ? 0.22 : 0.62) * (0.7 + noise(x / 30, y / 30, 59) * 0.6);
          if (stock.dark) {
            const lift = hand * 0.62;
            r = mix(r, cr * 0.85 + 20, lift);
            g = mix(g, cg * 0.85 + 20, lift);
            b = mix(b, cb * 0.85 + 24, lift);
          } else {
            r *= mix(1, Math.min(1, cr / 235), hand);
            g *= mix(1, Math.min(1, cg / 235), hand);
            b *= mix(1, Math.min(1, cb / 235), hand);
          }
        }

        let cover = ink[at];
        if (graphite) cover *= 0.6 + hash(x >> 1, y >> 1, 7) * 0.5;
        if (a.stock === 'blueprint' || a.stock === 'sepia') cover *= 0.86 + cloud * 0.5;
        if (mood.wear > 0.02) cover *= 1 - mood.wear * 0.45 * clamp01((noise(x / 38, y / 38, 61) - 0.45) * 3);

        let crease = 0;
        if (creased > 0.05 && a.stock !== 'cad') {
          const vertical = Math.abs(x - N / 2 + (noise(y / 40, 0.5, 67) - 0.5) * 3);
          const level = Math.abs(y - N / 2 + (noise(x / 40, 0.5, 71) - 0.5) * 3);
          crease = Math.max(Math.exp(-((vertical / 1.3) ** 2)), Math.exp(-((level / 1.3) ** 2))) * creased * (0.45 + noise(x / 9, y / 9, 73) * 0.7);
          const band = Math.max(Math.exp(-((vertical / 14) ** 2)), Math.exp(-((level / 14) ** 2))) * creased * 0.12;
          r = mix(mix(r, fold[0], band), fold[0], crease * 0.75);
          g = mix(mix(g, fold[1], band), fold[1], crease * 0.75);
          b = mix(mix(b, fold[2], band), fold[2], crease * 0.75);
          cover *= 1 - crease * 0.7;
        }

        let colour: RGB = lineColour;
        if (a.stock === 'cad') {
          const tag = layer[at];
          colour = tag === 255 ? cadNote : tag >= 2 ? cadLayers[tag % cadLayers.length] : tag === 1 ? [150, 156, 164] : stock.line;
        }
        cover = clamp01(cover);
        r = mix(r, colour[0], cover);
        g = mix(g, colour[1], cover);
        b = mix(b, colour[2], cover);

        let mark = marks[at];
        if (mark > 0) {
          if (a.stage === 'superseded') mark *= clamp01((noise(x / 5, y / 5, 79) - 0.22) * 4) * (0.55 + noise(x / 50, y / 50, 83) * 0.5);
          else mark *= 0.7 + hash(x >> 1, y >> 1, 89) * 0.4;
          mark = clamp01(mark);
          r = mix(r, stock.accent[0], mark);
          g = mix(g, stock.accent[1], mark);
          b = mix(b, stock.accent[2], mark);
        }

        if (ring) {
          const from = Math.hypot(x - ring[0], y - ring[1]) + (noise(x / 14, y / 14, 97) - 0.5) * 3;
          const wet = Math.exp(-(((from - ring[2]) / 1.9) ** 2)) * (0.35 + noise(x / 26, y / 26, 101) * 0.75) + (from < ring[2] ? 0.07 : 0);
          r = mix(r, stock.dark ? 58 : 122, wet * 0.62);
          g = mix(g, stock.dark ? 50 : 84, wet * 0.62);
          b = mix(b, stock.dark ? 40 : 44, wet * 0.62);
        }
        if (a.stage === 'site') {
          // Masking tape across each corner.
          const u = Math.min(x, N - 1 - x), v = Math.min(y, N - 1 - y);
          const along = Math.abs(u - v) / Math.SQRT2, off = Math.abs((u + v) / Math.SQRT2 - 30);
          if (along < 30 + (hash(Math.floor(off), 0, 103) - 0.5) * 3 && off < 10) {
            const tape = 0.72 + grain * 0.2;
            r = mix(r, 226, tape);
            g = mix(g, 208, tape);
            b = mix(b, 158, tape);
          }
        }
        if (holes) {
          const hole = Math.min(Math.hypot(x - 11, y - N * 0.3), Math.hypot(x - 11, y - N * 0.7));
          if (hole < 6.5) {
            const edge = clamp01(6.5 - hole);
            r = mix(r, 24, edge);
            g = mix(g, 22, edge);
            b = mix(b, 22, edge);
          }
        }
        pixels[o] = r;
        pixels[o + 1] = g;
        pixels[o + 2] = b;
        pixels[o + 3] = 255;
      }
    }

    const said = {
      blueprint: 'blueprint', cyan: 'cyan schematic on navy', sepia: 'sepia diazo print', blueline: 'blueline whiteprint', vellum: 'ink on vellum', cad: 'CAD layers on black',
    }[a.stock];
    return {
      pixels,
      notes: [
        `${said}, ${a.hand === 'plotter' ? 'plotted' : a.hand === 'ruled' ? 'ruled by hand' : a.hand === 'freehand' ? 'sketched freehand' : 'in pencil'}`,
        `${a.shading === 'none' ? 'outline only' : `${a.shading} shading`}, ${a.grid === 'none' ? 'plain sheet' : `${a.grid} grid`}${a.wash ? ', hand-coloured' : ''}`,
        `${a.notation === 'bare' ? 'no annotation' : `${a.notation} annotation`}, ${a.title === 'none' ? 'untitled' : `title ${a.title}`}, ${a.stage}`,
      ],
    };
  },
});
