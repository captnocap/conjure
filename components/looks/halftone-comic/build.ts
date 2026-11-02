import { type PaletteRole, choice, clamp01, defineLook, mix, rekey, rekeyOne, score, seeded } from '@conjure/kit';

type RGB = readonly [number, number, number];

/** One book's set of inks. `levels` are the tints the colourist could order from the engraver. */
interface InkSet {
  mode: 'process' | 'spot' | 'mono';
  cyan: RGB;
  magenta: RGB;
  yellow: RGB;
  black: RGB;
  levels: readonly number[];
  saturation: number;
  lift: number;
  /** How much of the grey beneath a colour is removed, and how far neutrals lean to a tint. */
  clean: number;
  cast: number;
  name: string;
}

const INKS: Record<string, InkSet> = {
  newsstand: {
    mode: 'process', name: 'four-colour newsstand inks',
    cyan: [20, 150, 205], magenta: [214, 38, 112], yellow: [250, 218, 48], black: [30, 26, 28],
    levels: [0, 0.25, 0.5, 1], saturation: 1.5, lift: 0.8, clean: 0.6, cast: 0,
  },
  heroic: {
    mode: 'process', name: 'loud heroic primaries',
    cyan: [0, 112, 214], magenta: [232, 24, 62], yellow: [255, 226, 0], black: [18, 16, 24],
    levels: [0, 0.25, 0.5, 1], saturation: 2.3, lift: 0.75, clean: 0.8, cast: 0,
  },
  romance: {
    mode: 'process', name: 'romance-book rose and teal',
    cyan: [72, 176, 180], magenta: [236, 104, 150], yellow: [250, 204, 128], black: [58, 34, 52],
    levels: [0, 0.25, 0.5, 0.75, 1], saturation: 1.25, lift: 0.62, clean: 0.55, cast: 0.35,
  },
  horror: {
    mode: 'process', name: 'horror-book slime, blood and ochre',
    cyan: [34, 122, 104], magenta: [168, 22, 34], yellow: [212, 166, 44], black: [16, 14, 20],
    levels: [0, 0.25, 0.5, 1], saturation: 1.3, lift: 1.05, clean: 0.35, cast: 0,
  },
  spot: {
    mode: 'spot', name: 'black and one spot colour',
    cyan: [26, 92, 190], magenta: [214, 42, 34], yellow: [0, 0, 0], black: [24, 22, 24],
    levels: [0, 0.25, 0.5, 1], saturation: 1, lift: 1, clean: 0, cast: 0,
  },
  screentone: {
    mode: 'mono', name: 'black ink and screentone only',
    cyan: [0, 0, 0], magenta: [0, 0, 0], yellow: [0, 0, 0], black: [22, 22, 26],
    levels: [0, 0.12, 0.25, 0.4, 0.6], saturation: 0, lift: 1, clean: 0, cast: 0,
  },
};

/**
 * Under the picture's palette the free books print in its colours: the lead plate carries the ink and
 * the other two answer in the second colour, keeping their offsets so they still mix as a set. The
 * newsstand and heroic books are four-colour process by definition and keep their plates; the key
 * line stays black everywhere, and screentone stays black ink only.
 */
const PLATE_ROLES: Record<string, Record<string, PaletteRole>> = {
  romance: { magenta: 'ink', cyan: 'second', yellow: 'second' },
  horror: { magenta: 'ink', cyan: 'second', yellow: 'second' },
};

const PAPERS: Record<string, { tone: RGB; fibre: number; burn: number; name: string }> = {
  pulp: { tone: [235, 228, 208], fibre: 0.6, burn: 0.15, name: 'fresh pulp' },
  yellowed: { tone: [229, 211, 164], fibre: 0.8, burn: 0.5, name: 'yellowed newsprint' },
  brittle: { tone: [208, 178, 124], fibre: 1, burn: 1, name: 'browned, brittle newsprint' },
  grey: { tone: [206, 203, 192], fibre: 1.6, burn: 0.2, name: 'grey recycled stock' },
  white: { tone: [249, 248, 243], fibre: 0.15, burn: 0, name: 'bright modern stock' },
};

const OPENERS = ['MEANWHILE...', 'LATER THAT NIGHT...', 'SUDDENLY!', 'AND THEN...', 'ELSEWHERE...', 'BUT AT THAT VERY MOMENT...', 'THE NEXT MORNING...', 'NOT FAR AWAY...'];
const GRIM_LINES = ["...IT'S TOO QUIET.", 'WE ARE NOT ALONE.', 'NOBODY CAME BACK.', "IT WASN'T HERE YESTERDAY."];
const GLAD_LINES = ['AT LAST!', 'WOULD YOU LOOK AT THAT!', "IT'S PERFECT!", 'I KNEW IT!'];
const SOUNDS = ['KRAK!', 'WHAM!', 'THOOM!', 'ZZAK!', 'KA-POW!', 'SKREE!', 'BRAKK!', 'FWOOSH!'];

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
    const top = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * sx;
    const bottom = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}

/** Coverage of a round-dot screen at one pixel: dots below half tone, paper holes above it. */
function screen(x: number, y: number, cos: number, sin: number, period: number, tint: number, gain: number) {
  if (tint <= 0.004) return 0;
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

const nearest = (levels: readonly number[], value: number) => {
  let best = levels[0];
  for (const level of levels) if (Math.abs(level - value) < Math.abs(best - value)) best = level;
  return best;
};

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function wrap(context2d: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && context2d.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export default defineLook({
  questions: {
    inks: choice('Which book was this panel printed for, and with which inks?', {
      newsstand: 'A four-colour newsstand adventure comic: cyan, magenta and yellow in three flat tints each under black line, the classic sixty-four colours.',
      heroic: 'A superhero cover: pure red, blue and yellow at full strength, almost no half measures, loud and confident.',
      romance: 'A romance or teen book: three soft pastel plates with a tinted-black line, tender, wistful, a little faded.',
      horror: 'A pre-code horror or crime book: three murky, clotted plates under heavy black, sickly and lurid.',
      spot: 'A cheap two-colour job: black plus a single spot colour, like a pulp interior, a fanzine or a propaganda leaflet.',
      screentone: 'A manga page: black ink only, with greys laid in as mechanical dot screentone on the stock. Quiet, stark or melancholy.',
    }),
    screen: score('How coarse is the dot screen?', [
      'A fine modern screen that almost reads as flat colour',
      'An ordinary comic-book screen',
      'Plainly visible Ben-Day dots',
      'Coarse dots you could count',
      'A pop-art blow-up: dots the size of peas',
    ]),
    shading: choice('How did the inker treat the shadows?', {
      spotted: 'Solid pools of spotted black: shadow shapes filled flat, dramatic and graphic.',
      feathered: 'Spotted blacks whose edges break into tapering brush feathering.',
      hatched: 'Pen hatching and cross-hatching, no solid masses: scratchy, nervous, underground.',
      tone: 'Shadows as a black dot screen laid over the colour, soft and mechanical.',
      open: 'No shadow at all: clear, even outline over flat colour, calm and legible like a European album.',
    }),
    weight: score('How heavy is the inking?', [
      'A hairline pen, barely any black',
      'A light, careful line',
      'A confident brush line',
      'Thick brushwork and deep shadows',
      'Drenched in black, more ink than paper',
    ]),
    registration: score('How well did the colour plates line up on press?', [
      'Dead on',
      'A whisker out',
      'Visibly slipped: colour peeks past the line',
      'Badly off, a Friday-night print run',
      'Wildly off: ghost images in each ink',
    ]),
    paper: choice('What is it printed on, and how has the paper kept?', {
      pulp: 'Fresh pale pulp, faintly tinted, bought this week.',
      yellowed: 'Aged, dimmed newsprint from a box in the attic.',
      brittle: 'Browning, brittle pages with darkened edges, decades old.',
      grey: 'Dull recycled stock flecked with fibres, cheap and matte.',
      white: 'Bright, clean modern stock where the dots sit crisp.',
    }),
    caption: choice('What lettering sits in the panel?', {
      none: 'None: the picture speaks alone.',
      narration: 'A coloured narration box that states the subject of the picture.',
      opener: 'A narration box with a stock scene-setter such as "MEANWHILE..." for a story in mid-flow.',
      balloon: 'A speech balloon with a short exclamation, its tail pointing at the main subject.',
      sound: 'A big jagged sound effect, for impact, noise or violence.',
    }),
    action: choice('What is happening in the panel right now?', {
      still: 'Nothing moves: a quiet establishing shot with an empty backdrop.',
      focus: 'Focus lines converge on the subject: a reveal, a shock, a moment of realisation.',
      speed: 'Streaking speed lines behind the subject: something is rushing past or being hurled.',
      burst: 'A jagged impact burst behind the subject: an explosion, a blow, a sudden arrival.',
      gloom: 'Heavy vertical shading hangs behind the subject: dread, rain, or bad news.',
    }),
    frame: choice('How is the panel bordered?', {
      ruled: 'A ruled black border with a clean paper gutter.',
      hand: 'A hand-ruled brush border that wobbles and overshoots its corners.',
      rounded: 'A round-cornered panel, like a newspaper strip or a flashback.',
      bleed: 'No border: the art runs off the edge of the page.',
    }),
  },

  async apply(capture, answers, context, signal) {
    const { size, color, normal, depth, identity, diffuse } = capture;
    const count = size * size;
    const random = seeded((context.seed ^ 0x51ed270b) >>> 0);
    const mood = context.mood;
    const book = INKS[answers.inks];
    const plates = PLATE_ROLES[answers.inks] ? rekey({ cyan: book.cyan, magenta: book.magenta, yellow: book.yellow }, context.palette, PLATE_ROLES[answers.inks]) : book;
    // A spot job prints its one colour in the palette's ink, whichever way the warmth leans.
    const spot = book.mode === 'spot' ? { cyan: rekeyOne(book.cyan, context.palette, 'ink'), magenta: rekeyOne(book.magenta, context.palette, 'ink') } : {};
    const inks: InkSet = { ...book, cyan: plates.cyan, magenta: plates.magenta, yellow: plates.yellow, ...spot };
    const stock = PAPERS[answers.paper];
    // The stock takes the palette's ground as a tint; bright modern white stays white.
    const paper = answers.paper === 'white' ? stock : { ...stock, tone: rekeyOne(stock.tone, context.palette, 'ground') };
    const unit = size / 720;
    const low = noiseField((context.seed * 31 + 7) | 0);
    const fine = noiseField((context.seed * 131 + 91) | 0);

    // ---- read the capture -------------------------------------------------------------------
    const id = new Uint8Array(count);
    const far = new Float32Array(count);
    const lit = new Float32Array(count);
    let heroX = 0, heroY = 0, heroCount = 0;
    let setX = 0, setY = 0, setCount = 0;
    const histogram = new Uint32Array(256);
    for (let p = 0; p < count; p++) {
      const at = p * 4;
      id[p] = identity[at];
      far[p] = id[p] === 0 ? 1 : (depth[at] * 65536 + depth[at + 1] * 256 + depth[at + 2]) / 16777216;
      lit[p] = diffuse[at] * 0.3 + diffuse[at + 1] * 0.59 + diffuse[at + 2] * 0.11;
      if (id[p] > 0) histogram[Math.min(255, Math.round(lit[p]))]++;
      // In practice id 2 is the world's own set dressing and the cast starts at 3.
      if (id[p] >= 3) {
        heroX += p % size;
        heroY += (p / size) | 0;
        heroCount++;
      } else if (id[p] === 2) {
        setX += p % size;
        setY += (p / size) | 0;
        setCount++;
      }
    }
    if (!heroCount) { heroX = setX; heroY = setY; heroCount = setCount; }
    heroX = heroCount ? heroX / heroCount : size / 2;
    heroY = heroCount ? heroY / heroCount : size / 2;
    // Normalise the plain lighting so "in shadow" means the same thing in every world.
    let seen = 0, total = 0, bright = 255;
    for (let v = 0; v < 256; v++) total += histogram[v];
    for (let v = 0; v < 256; v++) {
      seen += histogram[v];
      if (seen >= total * 0.92) { bright = Math.max(8, v); break; }
    }
    for (let p = 0; p < count; p++) lit[p] = Math.min(1.2, lit[p] / bright);
    // Where the light ends and the shadow begins: the split that best separates the two (Otsu).
    let split = 0.5;
    {
      let sumAll = 0;
      for (let v = 0; v < 256; v++) sumAll += v * histogram[v];
      let below = 0, sumBelow = 0, best = -1;
      for (let v = 0; v < 256; v++) {
        below += histogram[v];
        sumBelow += v * histogram[v];
        const above = total - below;
        if (!below || !above) continue;
        const gap = sumBelow / below - (sumAll - sumBelow) / above;
        const between = below * above * gap * gap;
        if (between > best) { best = between; split = v / bright; }
      }
      split = Math.min(0.8, Math.max(0.25, split));
    }

    const blur = (source: Float32Array, radius: number) => {
      const temp = new Float32Array(count), out = new Float32Array(count);
      const span = radius * 2 + 1;
      for (let y = 0; y < size; y++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += source[y * size + Math.min(size - 1, Math.max(0, k))];
        for (let x = 0; x < size; x++) {
          temp[y * size + x] = sum / span;
          sum += source[y * size + Math.min(size - 1, x + radius + 1)] - source[y * size + Math.max(0, x - radius)];
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
      return out;
    };
    const shade = blur(lit, Math.max(1, Math.round(2 * unit)));
    signal.throwIfAborted();
    await pause();

    // ---- the panel shape --------------------------------------------------------------------
    const margin = answers.frame === 'bleed' ? 0 : Math.round(26 * unit);
    const corner = answers.frame === 'rounded' ? 46 * unit : 0;
    const rule = (answers.frame === 'hand' ? 3.4 : 2.6) * unit * mix(0.8, 1.35, answers.weight);
    /** Signed distance to the panel edge: negative inside the picture. */
    const panel = (x: number, y: number) => {
      if (!margin) return -1e3;
      let wobble = 0;
      if (answers.frame === 'hand') wobble = (low(x / 90, y / 90) - 0.5) * 5 * unit + (fine(x / 14, y / 14) - 0.5) * 1.4 * unit;
      const half = size / 2 - margin;
      const dx = Math.abs(x - size / 2) - half + corner, dy = Math.abs(y - size / 2) - half + corner;
      const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
      return outside + Math.min(Math.max(dx, dy), 0) - corner + wobble;
    };

    // ---- colour separation ------------------------------------------------------------------
    // Flatten the render inside each identity, then let the colourist pick from a few tints.
    const tintC = new Uint8Array(count), tintM = new Uint8Array(count), tintY = new Uint8Array(count);
    /** Things that are simply black (tyres, hoses, screens) are filled by the inker, not the colourist. */
    const localBlack = new Uint8Array(count);
    const tintK = new Uint8Array(count);
    {
      const radius = Math.max(1, Math.round(3 * unit));
      const channels = [0, 1, 2].map((channel) => {
        const plane = new Float32Array(count);
        for (let p = 0; p < count; p++) plane[p] = color[p * 4 + channel];
        return blur(plane, radius);
      });
      const cheer = mix(0.85, 1.2, mood.cheer);
      const cool = (mood.warmth - 0.5) * 0.08;
      for (let p = 0; p < count; p++) {
        // Near an identity boundary the blur would smear two things together: use the raw pixel.
        const x = p % size, y = (p / size) | 0;
        const edge = id[p] !== id[y * size + Math.min(size - 1, x + radius)] || id[p] !== id[y * size + Math.max(0, x - radius)]
          || id[p] !== id[Math.min(size - 1, y + radius) * size + x] || id[p] !== id[Math.max(0, y - radius) * size + x];
        let r = (edge ? color[p * 4] : channels[0][p]) / 255;
        let g = (edge ? color[p * 4 + 1] : channels[1][p]) / 255;
        let b = (edge ? color[p * 4 + 2] : channels[2][p]) / 255;
        r = Math.pow(r, inks.lift) + cool;
        g = Math.pow(g, inks.lift);
        b = Math.pow(b, inks.lift) - cool;
        const grey = r * 0.3 + g * 0.59 + b * 0.11;
        const backdrop = id[p] === 0;
        if (!backdrop) localBlack[p] = Math.round(clamp01((0.16 - grey) * 14 + 0.5) * 255);
        if (inks.mode === 'mono') {
          const tone = backdrop ? clamp01((1 - grey) * 0.8) * (0.35 + 0.65 * (1 - y / size)) : nearest(inks.levels, clamp01(1 - grey) * 0.75);
          tintC[p] = Math.round(tone * 255);
          continue;
        }
        if (inks.mode === 'spot') {
          const chroma = Math.max(r, g, b) - Math.min(r, g, b);
          const want = clamp01(chroma * 1.5 + (1 - grey) * 0.55 - 0.08);
          const tone = backdrop ? clamp01(0.12 + want * 0.5) * (0.3 + 0.9 * (1 - y / size)) : nearest(inks.levels, want);
          tintM[p] = Math.round(clamp01(tone) * 255);
          continue;
        }
        const saturation = inks.saturation * cheer;
        r = clamp01(grey + (r - grey) * saturation);
        g = clamp01(grey + (g - grey) * saturation);
        b = clamp01(grey + (b - grey) * saturation);
        // Pull the grey out from under the colour: three overlapping screens of equal weight print
        // as mud, and darkness belongs to the black plate. What is left is a clean, bright hue.
        if (backdrop) {
          // The backdrop keeps only its hue, at a strength that matches how dark it was, graded
          // so the dots swell toward the top like a printed sky. Night gets a black screen too.
          const deep = Math.min(1 - r, 1 - g, 1 - b);
          const stretch = mix(1, 1 / (1.02 - deep), clamp01(deep * 1.3));
          const grade = 0.5 + 0.8 * (1 - y / size);
          const plate = (value: number) => {
            const tint = clamp01((1 - value - deep) * stretch) * grade;
            return Math.round(clamp01((tint - 0.07) * 1.08) * 255);
          };
          tintC[p] = plate(r);
          tintM[p] = plate(g);
          tintY[p] = plate(b);
          const night = clamp01((deep - 0.4) * 0.9) * grade;
          tintK[p] = night < 0.08 ? 0 : Math.round(clamp01(night) * 255);
        } else {
          const under = Math.min(1 - r, 1 - g, 1 - b) * inks.clean;
          r += under;
          g += under * (1 - inks.cast);
          b += under * (1 - inks.cast * 0.4);
          tintC[p] = Math.round(nearest(inks.levels, 1 - r) * 255);
          tintM[p] = Math.round(nearest(inks.levels, 1 - g) * 255);
          tintY[p] = Math.round(nearest(inks.levels, 1 - b) * 255);
        }
      }
    }
    signal.throwIfAborted();
    await pause();

    // ---- black plate: the line ----------------------------------------------------------------
    // Find where a line belongs, give each point the width a brush would have there, then let
    // every pixel ask its nearest line point whether it is inside the stroke.
    const [lx, ly, lz] = capture.light;
    const base = mix(0.55, 3.1, Math.pow(answers.weight, 1.15)) * unit;
    const range = capture.far - capture.near;
    const jump = Math.max(capture.pixelWorldSize * 3.5, range * 0.0004) / range;
    const strokeWidth = new Float32Array(count);
    const sourceX = new Int16Array(count).fill(-1), sourceY = new Int16Array(count).fill(-1);
    const lineKind = new Uint8Array(count);
    const open = answers.shading === 'open';
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const p = y * size + x;
        let kind = 0;
        const right = p + 1, down = p + size;
        if (id[p] !== id[right] || id[p] !== id[down]) {
          // Keep the line on the nearer thing so it hugs the silhouette.
          const other = id[p] !== id[right] ? right : down;
          kind = far[p] <= far[other] ? 3 : 0;
          if (!kind && id[other] !== id[p]) kind = 0;
        } else if (id[p] !== id[p - 1] || id[p] !== id[p - size]) {
          const other = id[p] !== id[p - 1] ? p - 1 : p - size;
          kind = far[p] <= far[other] ? 3 : 0;
        }
        if (!kind && id[p] > 0) {
          const bend = Math.max(Math.abs(far[p - 1] - 2 * far[p] + far[p + 1]), Math.abs(far[p - size] - 2 * far[p] + far[p + size]));
          if (bend > jump && (far[p] <= far[p + 1] || far[p] <= far[p + size]) && far[p] <= Math.min(far[p - 1], far[p + 1], far[p - size], far[p + size]) + jump * 0.5) kind = 2;
          else {
            const at = p * 4;
            const nx = normal[at] - 128, ny = normal[at + 1] - 128, nz = normal[at + 2] - 128;
            const a = (p + 1) * 4, c = (p + size) * 4;
            const dotRight = (nx * (normal[a] - 128) + ny * (normal[a + 1] - 128) + nz * (normal[a + 2] - 128)) / 16129;
            const dotDown = (nx * (normal[c] - 128) + ny * (normal[c + 1] - 128) + nz * (normal[c + 2] - 128)) / 16129;
            if (Math.min(dotRight, dotDown) < (id[p] === 1 ? 0.5 : 0.72)) kind = 1;
          }
        }
        if (!kind) continue;
        const at = p * 4;
        const facing = ((normal[at] - 128) * lx - (normal[at + 1] - 128) * ly + (normal[at + 2] - 128) * lz) / 127;
        const shadowSide = open ? 1 : mix(0.7, 1.55, clamp01(0.5 - facing * 0.8));
        const brush = mix(0.6, 1.4, low(x / (34 * unit), y / (34 * unit))) * mix(0.9, 1.1, fine(x / 6, y / 6));
        const kindWidth = kind === 3 ? 1.25 : kind === 2 ? 0.85 : 0.5;
        strokeWidth[p] = Math.max(0.35, base * kindWidth * shadowSide * (open ? mix(0.9, 1.1, brush - 0.5) : brush));
        sourceX[p] = x;
        sourceY[p] = y;
        lineKind[p] = kind;
      }
    }
    // An inker simplifies busy texture: where interior lines crowd together, leave most of them out.
    {
      const busy = new Float32Array(count);
      for (let p = 0; p < count; p++) busy[p] = lineKind[p] === 1 || lineKind[p] === 2 ? 1 : 0;
      const crowd = blur(busy, Math.max(2, Math.round(5 * unit)));
      for (let p = 0; p < count; p++) {
        if (!busy[p]) continue;
        if (crowd[p] > (lineKind[p] === 1 ? 0.2 : 0.3)) { sourceX[p] = -1; strokeWidth[p] = 0; }
      }
    }
    // Drop isolated specks so noisy normals do not pepper the page.
    for (let y = 1; y < size - 1; y++)
      for (let x = 1; x < size - 1; x++) {
        const p = y * size + x;
        if (sourceX[p] < 0) continue;
        let friends = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (strokeWidth[p + dy * size + dx] > 0) friends++;
        if (friends < 3) sourceX[p] = -2;
      }
    for (let p = 0; p < count; p++) if (sourceX[p] === -2) { sourceX[p] = -1; strokeWidth[p] = 0; }
    const reach = (p: number, x: number, y: number, from: number) => {
      if (sourceX[from] < 0) return;
      const fx = sourceX[from], fy = sourceY[from];
      if (sourceX[p] < 0) { sourceX[p] = fx; sourceY[p] = fy; return; }
      const mine = (sourceX[p] - x) ** 2 + (sourceY[p] - y) ** 2;
      const theirs = (fx - x) ** 2 + (fy - y) ** 2;
      if (theirs < mine) { sourceX[p] = fx; sourceY[p] = fy; }
    };
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        if (x > 0) reach(p, x, y, p - 1);
        if (y > 0) {
          reach(p, x, y, p - size);
          if (x > 0) reach(p, x, y, p - size - 1);
          if (x < size - 1) reach(p, x, y, p - size + 1);
        }
      }
    for (let y = size - 1; y >= 0; y--)
      for (let x = size - 1; x >= 0; x--) {
        const p = y * size + x;
        if (x < size - 1) reach(p, x, y, p + 1);
        if (y < size - 1) {
          reach(p, x, y, p + size);
          if (x < size - 1) reach(p, x, y, p + size + 1);
          if (x > 0) reach(p, x, y, p + size - 1);
        }
      }
    signal.throwIfAborted();
    await pause();

    // ---- lettering and the border, drawn once on a canvas --------------------------------------
    const letters = document.createElement('canvas');
    letters.width = letters.height = size;
    const pen = letters.getContext('2d', { willReadFrequently: true })!;
    const face = '"Comic Sans MS", "Comic Neue", "Chalkboard SE", "Trebuchet MS", Verdana, sans-serif';
    const blackCss = `rgb(${inks.black.join(',')})`;
    const boxFill = inks.mode === 'mono' ? '#ffffff' : inks.mode === 'spot' ? '#ffffff' : `rgb(${inks.yellow.join(',')})`;
    const inset = margin + 12 * unit;
    let lettering = 'no lettering';
    if (answers.caption === 'narration' || answers.caption === 'opener') {
      const idea = context.idea.trim().replace(/\s+/g, ' ').slice(0, 64).toUpperCase();
      const text = answers.caption === 'opener' || !idea ? OPENERS[Math.floor(random() * OPENERS.length)] : `${idea}${/[.!?]$/.test(idea) ? '' : '...'}`;
      pen.font = `italic bold ${Math.round(19 * unit)}px ${face}`;
      const lines = wrap(pen, text, size * 0.42);
      const width = Math.max(...lines.map((line) => pen.measureText(line).width)) + 26 * unit;
      const height = lines.length * 24 * unit + 16 * unit;
      const top = heroY < size * 0.4 && random() < 0.7;
      const x = top ? inset : random() < 0.5 ? inset : size - inset - width;
      const y = heroY < size * 0.36 ? size - inset - height : inset;
      pen.fillStyle = blackCss;
      pen.fillRect(x + 4 * unit, y + 4 * unit, width, height);
      pen.fillStyle = boxFill;
      pen.fillRect(x, y, width, height);
      pen.lineWidth = 2.4 * unit;
      pen.strokeStyle = blackCss;
      pen.strokeRect(x, y, width, height);
      pen.fillStyle = blackCss;
      pen.textBaseline = 'middle';
      lines.forEach((line, index) => pen.fillText(line, x + 13 * unit, y + 8 * unit + (index + 0.5) * 24 * unit));
      lettering = `caption "${text}"`;
    } else if (answers.caption === 'balloon') {
      const pool = mood.cheer > 0.5 ? GLAD_LINES : GRIM_LINES;
      const text = pool[Math.floor(random() * pool.length)];
      pen.font = `italic bold ${Math.round(20 * unit)}px ${face}`;
      const lines = wrap(pen, text, size * 0.26);
      const rx = Math.max(...lines.map((line) => pen.measureText(line).width)) / 2 + 30 * unit;
      const ry = lines.length * 13 * unit + 24 * unit;
      const left = heroX > size / 2 ? true : random() < 0.5 ? false : heroX < size * 0.45 ? false : true;
      const cx = left ? inset + rx + 8 * unit : size - inset - rx - 8 * unit;
      const cy = inset + ry + 4 * unit;
      // The tail leaves the balloon on the side facing the speaker and stops short of them.
      const away = Math.hypot(heroX - cx, heroY - cy) || 1;
      const ux = (heroX - cx) / away, uy = (heroY - cy) / away;
      const rim = 1 / Math.hypot(ux / rx, uy / ry);
      const rootX = cx + ux * rim * 0.8, rootY = cy + uy * rim * 0.8;
      const length = Math.min(Math.max(away - rim - 60 * unit, 26 * unit), 95 * unit);
      const tailX = cx + ux * (rim + length), tailY = cy + uy * (rim + length);
      const shape = () => {
        pen.beginPath();
        pen.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        pen.moveTo(rootX - uy * 13 * unit, rootY + ux * 13 * unit);
        pen.quadraticCurveTo(mix(rootX, tailX, 0.6) - uy * 9 * unit, mix(rootY, tailY, 0.6) + ux * 9 * unit, tailX, tailY);
        pen.lineTo(rootX + uy * 13 * unit, rootY - ux * 13 * unit);
        pen.closePath();
      };
      shape();
      pen.lineJoin = 'round';
      pen.lineWidth = 5.4 * unit;
      pen.strokeStyle = blackCss;
      pen.stroke();
      pen.fillStyle = '#ffffff';
      pen.fill();
      pen.fillStyle = blackCss;
      pen.textBaseline = 'middle';
      pen.textAlign = 'center';
      lines.forEach((line, index) => pen.fillText(line, cx, cy + (index - (lines.length - 1) / 2) * 25 * unit));
      lettering = `balloon "${text}"`;
    } else if (answers.caption === 'sound') {
      const text = SOUNDS[Math.floor(random() * SOUNDS.length)];
      const px = Math.round(mix(64, 96, mood.energy) * unit);
      pen.font = `italic 900 ${px}px Impact, "Arial Black", "Helvetica Neue", ${face}`;
      const width = pen.measureText(text).width;
      const left = heroX > size / 2;
      const top = heroY > size * 0.42;
      const cx = left ? inset + width / 2 + 20 * unit : size - inset - width / 2 - 20 * unit;
      const cy = top ? inset + px * 0.8 : size - inset - px * 0.7;
      pen.save();
      pen.translate(cx, cy);
      pen.rotate((left ? -1 : 1) * mix(0.08, 0.24, random()));
      pen.textAlign = 'center';
      pen.textBaseline = 'middle';
      pen.lineJoin = 'miter';
      pen.miterLimit = 3;
      pen.fillStyle = blackCss;
      pen.fillText(text, 6 * unit, 7 * unit);
      pen.lineWidth = 9 * unit;
      pen.strokeStyle = blackCss;
      pen.strokeText(text, 0, 0);
      pen.fillStyle = inks.mode === 'mono' ? '#ffffff' : inks.mode === 'spot' ? `rgb(${(mood.warmth > 0.42 ? inks.magenta : inks.cyan).join(',')})` : `rgb(${(random() < 0.5 ? inks.yellow : inks.magenta).join(',')})`;
      pen.fillText(text, 0, 0);
      pen.restore();
      lettering = `sound effect "${text}"`;
    }
    const overlay = pen.getImageData(0, 0, size, size).data;
    signal.throwIfAborted();
    await pause();

    // ---- press settings -----------------------------------------------------------------------
    const period = mix(5, 17, Math.pow(answers.screen, 1.5)) * unit;
    const gain = mix(0.05, 0.45, mood.wear) * (answers.paper === 'white' ? 0.3 : 1);
    const slip = Math.pow(answers.registration, 1.4) * 9 * unit;
    const offsets = [0, 1, 2].map((plate) => {
      const angle = random() * Math.PI * 2;
      const amount = slip * mix(0.55, 1, random()) * (plate === 2 ? 0.8 : 1);
      return [Math.round(Math.cos(angle) * amount), Math.round(Math.sin(angle) * amount)] as const;
    });
    const angles = [15, 75, 0, 45].map((degrees) => {
      const radians = ((degrees + (random() - 0.5) * 4) * Math.PI) / 180;
      return [Math.cos(radians), Math.sin(radians)] as const;
    });
    const spotInk = mood.warmth > 0.42 ? inks.magenta : inks.cyan;
    const threshold = open ? -1 : answers.weight < 0.5 ? mix(split * 0.4, split * 0.94, answers.weight * 2) : mix(split * 0.94, split + (1 - split) * 0.3, answers.weight * 2 - 1);
    const band = 0.2;
    const hatchPeriod = mix(5.2, 8, answers.screen) * unit;
    const hatchAngle = Math.atan2(-ly, lx) + Math.PI / 2 + 0.5;
    const hatchCos = Math.cos(hatchAngle), hatchSin = Math.sin(hatchAngle);
    const stripe = (x: number, y: number, cos: number, sin: number, fill: number) => {
      if (fill <= 0) return 0;
      const wobble = (low(x / 40, y / 40) - 0.5) * 2.2;
      let v = (x * sin - y * cos + wobble) / hatchPeriod;
      v = Math.abs(v - Math.floor(v) - 0.5) * hatchPeriod;
      return clamp01(fill * hatchPeriod * 0.5 - v + 0.5);
    };

    // Background action: everything here is drawn only where the backdrop shows.
    const spokes = 96;
    const spokeStart = new Float32Array(spokes), spokeWidth = new Float32Array(spokes);
    const heroRadius = Math.sqrt(heroCount / Math.PI) || size * 0.2;
    for (let k = 0; k < spokes; k++) {
      const present = random() < mix(0.35, 0.8, mood.energy);
      spokeStart[k] = Math.max(heroRadius, 70 * unit) * mix(1.2, 2.3, random());
      spokeWidth[k] = present ? mix(0.1, 0.42, random()) : 0;
    }
    const rows = 72;
    const rowStart = new Float32Array(rows), rowLength = new Float32Array(rows), rowWidth = new Float32Array(rows);
    for (let k = 0; k < rows; k++) {
      rowStart[k] = random() * size;
      rowLength[k] = mix(0.25, 0.9, random()) * size;
      rowWidth[k] = random() < mix(0.4, 0.8, mood.energy) ? mix(0.14, 0.6, random()) : 0;
    }
    const points = 18 + Math.floor(random() * 8);
    const burstOuter = new Float32Array(points);
    for (let k = 0; k < points; k++) burstOuter[k] = mix(1.5, 2.3, random());
    const burstPhase = random() * Math.PI * 2;
    const slant = (random() - 0.5) * 0.3 + (heroX > size / 2 ? 0.12 : -0.12);

    /** Returns black coverage for the action drawn on the backdrop, and whether to knock colour out. */
    const action = (x: number, y: number): number => {
      const dx = x - heroX, dy = y - heroY;
      switch (answers.action) {
        case 'focus': {
          const radius = Math.hypot(dx, dy);
          const turn = ((Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1) * spokes;
          const k = Math.floor(turn) % spokes;
          if (!spokeWidth[k] || radius < spokeStart[k]) return 0;
          const across = Math.abs(turn - k - 0.5) * ((Math.PI * 2) / spokes) * radius;
          const grow = clamp01((radius - spokeStart[k]) / (size * 0.55));
          return clamp01(spokeWidth[k] * grow * ((Math.PI * 2) / spokes) * radius - across + 0.5);
        }
        case 'speed': {
          const along = x + y * slant * 0, across = (y - x * slant + size) / (size / rows);
          const k = ((Math.floor(across) % rows) + rows) % rows;
          if (!rowWidth[k]) return 0;
          const from = ((along - rowStart[k]) % size + size) % size;
          if (from > rowLength[k]) return 0;
          const taper = Math.sin((from / rowLength[k]) * Math.PI);
          const offset = Math.abs(across - Math.floor(across) - 0.5) * (size / rows);
          return clamp01(rowWidth[k] * taper * (size / rows) - offset + 0.5);
        }
        case 'burst': {
          const radius = Math.hypot(dx, dy) / heroRadius;
          const turn = (((Math.atan2(dy, dx) + burstPhase) / (Math.PI * 2) + 2) % 1) * points;
          const k = Math.floor(turn) % points;
          const tip = 1 - Math.abs(turn - k - 0.5) * 2;
          const edge = mix(1.12, burstOuter[k], tip);
          // The spikes are steep, so measure across their flanks rather than along the radius,
          // or the outline thins to nothing where it matters most.
          const steep = ((burstOuter[k] - 1.12) * 2 * points) / (Math.PI * 2 * Math.max(radius, 0.2));
          const pixels = ((edge - radius) * heroRadius) / Math.hypot(1, steep);
          // 2 = inside the burst (knock the colour out to paper), 0..1 = its black outline.
          if (pixels > 2.2 * unit * (1 + answers.weight)) return 2;
          return pixels > -2.2 * unit * (1 + answers.weight) ? 1 : 0;
        }
        case 'gloom': {
          const fall = clamp01(1.15 - y / (size * 0.8) + (low(x / 60, 3) - 0.5) * 0.5);
          const spacing = 6.5 * unit;
          const wobble = (low(x / 9, y / 120) - 0.5) * 2;
          const v = Math.abs(((x + wobble) / spacing) % 1 - 0.5) * spacing;
          return clamp01(fall * mix(0.3, 0.5, answers.weight) * spacing - v + 0.5) * (fine(x / 3, y / 46) > 0.16 ? 1 : 0);
        }
        default:
          return 0;
      }
    };

    // ---- print --------------------------------------------------------------------------------
    const pixels = new Uint8ClampedArray(count * 4);
    const wear = mood.wear;
    const foxing = noiseField((context.seed * 977 + 5) | 0);
    const fold = answers.paper === 'white' ? -1 : wear > 0.55 ? Math.round(mix(0.42, 0.58, random()) * size) : -1;
    const warmPaper = (mood.warmth - 0.5) * 10;
    const blackStrength = answers.paper === 'white' ? 0.97 : mix(0.96, 0.9, wear);
    const tintAt = (plane: Uint8Array, x: number, y: number, offset: readonly [number, number]) => {
      const sx = Math.min(size - 1, Math.max(0, x + offset[0])), sy = Math.min(size - 1, Math.max(0, y + offset[1]));
      return plane[sy * size + sx] / 255;
    };

    for (let y = 0; y < size; y++) {
      if (y % 240 === 0) {
        signal.throwIfAborted();
        await pause();
      }
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const out = p * 4;

        // Paper first: tone, fibres, mottle, browned edges, foxing.
        const tooth = (fine(x / 1.7, y / 1.7) - 0.5) * 9 * paper.fibre + (fine(x / 0.9 + 40, y / 5.5) - 0.5) * 7 * paper.fibre;
        const mottle = (low(x / 70, y / 70) - 0.5) * 12 * (0.4 + paper.burn);
        const border = Math.min(x, y, size - 1 - x, size - 1 - y) / size;
        const burn = paper.burn * mix(0.35, 1, wear) * Math.pow(clamp01(1 - border * 7 + (low(x / 30, y / 30) - 0.5) * 0.7), 2);
        let fox = 0;
        if (paper.burn > 0 && wear > 0.3) {
          const spot = foxing(x / 13, y / 13) * 0.6 + foxing(x / 4, y / 4) * 0.4;
          fox = clamp01((spot - mix(0.86, 0.76, wear)) * 7) * paper.burn * 0.7;
        }
        let pr = paper.tone[0] + tooth + mottle + warmPaper - burn * 48 - fox * 22;
        let pg = paper.tone[1] + tooth + mottle - burn * 62 - fox * 36;
        let pb = paper.tone[2] + tooth + mottle - warmPaper - burn * 78 - fox * 52;
        if (fold >= 0) {
          const crease = Math.abs(y - fold + (low(x / 50, 9) - 0.5) * 3);
          if (crease < 2.2) { const lightened = (1 - crease / 2.2) * 26 * (fine(x / 2.5, 1) > 0.3 ? 1 : 0.2); pr += lightened; pg += lightened; pb += lightened; }
        }

        const edge = panel(x, y);
        let r = pr, g = pg, b = pb;
        let black = 0;
        if (edge < 0) {
          const backdrop = id[p] === 0;
          let knock = false;
          // Action lines run behind the cast: over the backdrop and the ground, never over a thing.
          if (id[p] <= 1 && answers.action !== 'still') {
            const drawn = action(x, y);
            if (drawn === 2) knock = true;
            else black = drawn;
          }
          // Colour plates, each a dot screen at its own angle, each a little out of place.
          const starve = 1 - wear * 0.22 * low(x / 110 + 9, y / 110);
          if (inks.mode === 'process') {
            const c = knock ? 0 : screen(x, y, angles[0][0], angles[0][1], period, tintAt(tintC, x, y, offsets[0]), gain) * starve;
            const m = knock ? 0 : screen(x, y, angles[1][0], angles[1][1], period, tintAt(tintM, x, y, offsets[1]), gain) * starve;
            const yl = knock ? 1 : screen(x, y, angles[2][0], angles[2][1], period, tintAt(tintY, x, y, offsets[2]), gain) * starve;
            r *= (1 - c * (1 - inks.cyan[0] / 255)) * (1 - m * (1 - inks.magenta[0] / 255)) * (1 - yl * (1 - inks.yellow[0] / 255));
            g *= (1 - c * (1 - inks.cyan[1] / 255)) * (1 - m * (1 - inks.magenta[1] / 255)) * (1 - yl * (1 - inks.yellow[1] / 255));
            b *= (1 - c * (1 - inks.cyan[2] / 255)) * (1 - m * (1 - inks.magenta[2] / 255)) * (1 - yl * (1 - inks.yellow[2] / 255));
          } else if (inks.mode === 'spot') {
            const s = screen(x, y, angles[1][0], angles[1][1], period, knock ? 0.5 : tintAt(tintM, x, y, offsets[1]), gain) * starve;
            r *= 1 - s * (1 - spotInk[0] / 255);
            g *= 1 - s * (1 - spotInk[1] / 255);
            b *= 1 - s * (1 - spotInk[2] / 255);
          } else if (!knock) {
            black = Math.max(black, screen(x, y, angles[3][0], angles[3][1], period, tintC[p] / 255, gain));
          }

          // Shadow shapes from the plain lighting.
          let mass = 0;
          if (!backdrop) mass = localBlack[p] / 255;
          else if (tintK[p] && !knock) black = Math.max(black, screen(x, y, angles[3][0], angles[3][1], period, tintK[p] / 255, gain));
          if (!backdrop && !knock && threshold > 0) {
            const s = shade[p];
            const dark = threshold - s;
            switch (answers.shading) {
              case 'spotted':
                mass = Math.max(mass, clamp01(dark * 60 + 0.5));
                break;
              case 'feathered': {
                const reach2 = clamp01(1 - (s - threshold) / band);
                mass = Math.max(mass, clamp01(dark * 60 + 0.5));
                black = Math.max(black, s < threshold + band ? stripe(x, y, hatchCos, hatchSin, reach2 * reach2 * 0.95) : 0);
                break;
              }
              case 'hatched': {
                const depthOf = clamp01((threshold + band * 0.5 - s) / (threshold + band * 0.5));
                if (depthOf > 0) {
                  black = Math.max(black, stripe(x, y, hatchCos, hatchSin, 0.22 + depthOf * 0.5));
                  if (depthOf > 0.3) black = Math.max(black, stripe(x, y, -hatchSin, hatchCos, 0.1 + depthOf * 0.5));
                  if (depthOf > 0.62) black = Math.max(black, stripe(x, y, Math.SQRT1_2 * (hatchCos - hatchSin), Math.SQRT1_2 * (hatchCos + hatchSin), depthOf * 0.5));
                }
                break;
              }
              case 'tone': {
                const cover = clamp01((threshold + band * 0.5 - s) / (threshold + band * 0.5));
                if (cover > 0) black = Math.max(black, screen(x, y, angles[3][0], angles[3][1], period * 0.9, Math.min(0.8, 0.14 + cover * 0.9), gain));
                break;
              }
            }
          }

          // The line itself.
          const sx = sourceX[p];
          if (sx >= 0) {
            const sy = sourceY[p];
            const distance = Math.sqrt((sx - x) ** 2 + (sy - y) ** 2);
            const width = strokeWidth[sy * size + sx];
            // Inside a pool of black the line is scratched back out in white, so forms stay legible.
            if (mass > 0.5) mass *= 1 - 0.92 * clamp01(Math.max(0.75 * unit, width * 0.42) - distance + 0.5);
            else black = Math.max(black, clamp01(width - distance + 0.5));
          }
          black = Math.max(black, mass);
        }
        // The panel border sits on the black plate too.
        if (margin) black = Math.max(black, clamp01(rule - Math.abs(edge) + 0.5));
        if (answers.frame === 'hand' && margin) {
          // Overshoot: the ruled strokes run past the corners.
          const over = 9 * unit, half = size / 2 - margin;
          const ax = Math.abs(x - size / 2) - half, ay = Math.abs(y - size / 2) - half;
          if ((Math.abs(ax) < rule * 0.7 && ay > 0 && ay < over) || (Math.abs(ay) < rule * 0.7 && ax > 0 && ax < over)) black = Math.max(black, 0.9);
        }

        // Lettering is stripped in after the art: flat fills, then its own black.
        const alpha = overlay[out + 3] / 255;
        if (alpha > 0 && edge < rule) {
          const or = overlay[out], og = overlay[out + 1], ob = overlay[out + 2];
          const isBlack = or + og + ob < 150;
          if (isBlack) black = Math.max(black, alpha);
          else {
            r = mix(r, (pr * or) / 255, alpha);
            g = mix(g, (pg * og) / 255, alpha);
            b = mix(b, (pb * ob) / 255, alpha);
            black *= 1 - alpha;
          }
        }

        if (black > 0) {
          // Black never prints perfectly solid on pulp: it starves, speckles and lets paper through.
          let solid = blackStrength - (low(x / 26 + 50, y / 26) - 0.5) * 0.12 * (0.5 + wear);
          if (wear > 0.25 && fine(x / 1.3 + 7, y / 1.3) > mix(1.0, 0.9, wear)) solid *= 0.35;
          const k = black * solid;
          r = mix(r, inks.black[0] + tooth * 0.5, k);
          g = mix(g, inks.black[1] + tooth * 0.5, k);
          b = mix(b, inks.black[2] + tooth * 0.5, k);
        }
        pixels[out] = r;
        pixels[out + 1] = g;
        pixels[out + 2] = b;
        pixels[out + 3] = 255;
      }
    }

    const slipped = Math.max(...offsets.map(([ox, oy]) => Math.hypot(ox, oy)));
    return {
      pixels,
      notes: [
        `${inks.name} on ${paper.name}`,
        `${answers.shading} shadows, line ${base.toFixed(1)} px, dots every ${period.toFixed(1)} px`,
        slipped < 1 ? 'plates in register' : `plates out by up to ${slipped.toFixed(0)} px`,
        `${answers.action === 'still' ? 'no action lines' : `${answers.action} lines`}, ${answers.frame} frame, ${lettering}`,
      ],
    };
  },
});
