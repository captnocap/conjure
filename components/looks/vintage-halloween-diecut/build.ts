import { type Palette as Colours, type PaletteRole, choice, clamp01, defineLook, mix, rekey, score, seeded } from '@conjure/kit';

type RGB = readonly [number, number, number];

/** Ink roles. A pixel of the decoration is bare card or one of four litho inks. */
const P = 0, L = 1, O = 2, A = 3, K = 4;
const PLATES = [L, O, A, K] as const;

interface Palette {
  name: string;
  /** The card stock. */
  paper: RGB;
  /** A printed light ink (cream or moon yellow); null leaves the card showing. */
  light: RGB | null;
  /** Pumpkin orange; null when the card itself is orange. */
  orange: RGB | null;
  accent: RGB | null;
  accentHue: number;
  black: RGB;
  /** Which ink prints the night sky. */
  sky: typeof K | typeof A;
  /** What the moon is: a light ink or bare card. */
  moon: typeof L | typeof P;
}

const PALETTES: Record<string, Palette> = {
  classic: {
    name: 'pumpkin orange and black on cream card',
    paper: [238, 226, 196], light: null, orange: [228, 110, 28], accent: null, accentHue: 0,
    black: [30, 23, 21], sky: K, moon: P,
  },
  moon: {
    name: 'orange, black and moon yellow',
    paper: [241, 232, 208], light: [246, 196, 44], orange: [226, 100, 26], accent: null, accentHue: 0,
    black: [25, 20, 23], sky: K, moon: L,
  },
  acid: {
    name: 'orange, black and witch-hat acid green',
    paper: [237, 228, 198], light: [240, 222, 150], orange: [232, 108, 30], accent: [138, 186, 44], accentHue: 82,
    black: [24, 24, 20], sky: K, moon: L,
  },
  violet: {
    name: 'orange and black under a violet night',
    paper: [240, 229, 202], light: [246, 206, 84], orange: [230, 106, 34], accent: [92, 54, 128], accentHue: 275,
    black: [30, 19, 33], sky: A, moon: L,
  },
  twotone: {
    name: 'black printed on orange card',
    paper: [232, 122, 40], light: null, orange: null, accent: null, accentHue: 0,
    black: [26, 19, 17], sky: K, moon: P,
  },
  harvest: {
    name: 'harvest orange, brick red, black and corn yellow',
    paper: [236, 222, 186], light: [240, 184, 58], orange: [212, 92, 26], accent: [164, 42, 30], accentHue: 4,
    black: [33, 24, 20], sky: K, moon: L,
  },
};

/**
 * The press takes the picture's palette: the card tints to the ground, the main ink (and the pale
 * moon ink, keeping its place beside it) to the ink, the accent to the second. Black stays black. On
 * the two-tone job the coloured card is the ink. The scene is still sorted onto plates by the designed
 * accent hue, so the same things print in the accent.
 */
type InkName = 'paper' | 'light' | 'orange' | 'accent';
const INK_ROLES: Record<string, Partial<Record<InkName, PaletteRole>>> = {
  twotone: { paper: 'ink' },
};
const DEFAULT_INK_ROLES: Partial<Record<InkName, PaletteRole>> = { paper: 'ground', light: 'ink', orange: 'ink', accent: 'second' };
function keyPress(designed: Palette, colours: Colours | undefined, name: string): Palette {
  if (!colours) return designed;
  const roles = INK_ROLES[name] ?? DEFAULT_INK_ROLES;
  const set: Partial<Record<InkName, RGB>> = {};
  for (const key of Object.keys(roles) as InkName[]) if (designed[key]) set[key] = designed[key]!;
  const keyed = rekey(set as Record<string, RGB>, colours, roles as Record<string, PaletteRole>);
  return { ...designed, ...keyed };
}
const PIN = [[0, '#f2a99a'], [0.35, '#c23a2c'], [1, '#6e1a14']] as const;

const ERAS = {
  twenties: { line: 0.75, period: 3.6, slip: 0.6, margin: 1.15, grain: 0.7, name: 'German-made 1920s embossed die-cut' },
  thirties: { line: 1.1, period: 4.6, slip: 1.1, margin: 1, grain: 0.8, name: '1930s Beistle-style die-cut' },
  forties: { line: 1, period: 6.2, slip: 2, margin: 0.85, grain: 1.3, name: 'wartime 1940s cheap litho' },
  fifties: { line: 1.4, period: 7.6, slip: 2.8, margin: 1.25, grain: 0.9, name: '1950s dime-store party goods' },
} as const;

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

/** Coverage of a round-dot litho screen at one pixel. */
function screen(x: number, y: number, cos: number, sin: number, period: number, tint: number) {
  if (tint <= 0.004) return 0;
  if (tint >= 0.97) return 1;
  let u = (x * cos + y * sin) / period;
  let v = (y * cos - x * sin) / period;
  const holes = tint > 0.56;
  if (holes) { u += 0.5; v += 0.5; }
  u -= Math.floor(u) + 0.5;
  v -= Math.floor(v) + 0.5;
  const distance = Math.sqrt(u * u + v * v) * period;
  const radius = period * Math.sqrt((holes ? 1 - tint : tint) / Math.PI);
  const cover = clamp01(radius - distance + 0.5);
  return holes ? 1 - cover : cover;
}

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function boxBlur(source: Float32Array, size: number, radius: number) {
  const count = size * size;
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
}

/**
 * For every pixel, the nearest seed pixel (two-pass propagation, close to exact).
 * Returns the seed's x and y, -1 where there is none.
 */
function nearestSeed(seed: Uint8Array, size: number) {
  const count = size * size;
  const sx = new Int16Array(count).fill(-1), sy = new Int16Array(count).fill(-1);
  for (let p = 0; p < count; p++) if (seed[p]) { sx[p] = p % size; sy[p] = (p / size) | 0; }
  const offer = (p: number, q: number, x: number, y: number) => {
    const qx = sx[q];
    if (qx < 0) return;
    const qy = sy[q];
    const d = (x - qx) * (x - qx) + (y - qy) * (y - qy);
    const px = sx[p];
    if (px < 0 || d < (x - px) * (x - px) + (y - sy[p]) * (y - sy[p])) { sx[p] = qx; sy[p] = qy; }
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      if (x > 0) offer(p, p - 1, x, y);
      if (y > 0) {
        offer(p, p - size, x, y);
        if (x > 0) offer(p, p - size - 1, x, y);
        if (x < size - 1) offer(p, p - size + 1, x, y);
      }
    }
    for (let x = size - 2; x >= 0; x--) offer(y * size + x, y * size + x + 1, x, y);
  }
  for (let y = size - 1; y >= 0; y--) {
    for (let x = size - 1; x >= 0; x--) {
      const p = y * size + x;
      if (x < size - 1) offer(p, p + 1, x, y);
      if (y < size - 1) {
        offer(p, p + size, x, y);
        if (x < size - 1) offer(p, p + size + 1, x, y);
        if (x > 0) offer(p, p + size - 1, x, y);
      }
    }
    for (let x = 1; x < size; x++) offer(y * size + x, y * size + x - 1, x, y);
  }
  return { sx, sy };
}

function hueOf(r: number, g: number, b: number) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const c = max - min;
  if (c < 1e-6) return 0;
  let h: number;
  if (max === r) h = ((g - b) / c) % 6;
  else if (max === g) h = (b - r) / c + 2;
  else h = (r - g) / c + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** A die-cut bat: round body, pricked ears, wings with scalloped trailing edges. Drawn at unit scale 100. */
function batPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.ellipse(0, 4, 8, 13, 0, 0, Math.PI * 2);
  ctx.moveTo(6.5, -10);
  ctx.arc(0, -10, 6.5, 0, Math.PI * 2);
  for (const side of [-1, 1]) {
    ctx.moveTo(side * 1.5, -14);
    ctx.lineTo(side * 4.5, -23);
    ctx.lineTo(side * 6.5, -12);
    ctx.closePath();
    const tips = [[50, -14], [41, 4], [29, 6], [17, 11], [6, 9]];
    ctx.moveTo(side * 5, -5);
    ctx.quadraticCurveTo(side * 22, -22, side * tips[0][0], tips[0][1]);
    for (let i = 1; i < tips.length; i++) {
      const [ax, ay] = tips[i - 1], [bx, by] = tips[i];
      ctx.quadraticCurveTo(side * (ax + bx) / 2, (ay + by) / 2 - 9, side * bx, by);
    }
    ctx.closePath();
  }
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, turn: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = turn + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export default defineLook({
  questions: {
    era: choice('Which era and maker printed this Halloween decoration?', {
      twenties: 'A German-made 1920s embossed die-cut: delicate keylines, fine screen, soft colour, carefully registered, precious and a little eerie.',
      thirties: 'A 1930s American Beistle-style die-cut: bold black keylines, flat confident orange and black, a slight slip between plates.',
      forties: 'A wartime 1940s decoration on cheap stock: coarse halftone dots, fewer tones, wobbly registration, thrifty and homely.',
      fifties: 'A 1950s dime-store party good: chunky cartoon outlines, big visible dots, plates badly out of register, cheerful and loud.',
    }),
    inks: choice('Which inks are on the press? Their colours come from the picture\u2019s palette.', {
      classic: 'One strong ink and black on pale card: the plainest, most classic Halloween.',
      moon: 'A strong ink and black with a bright, pale third ink for moons, stars and highlights.',
      acid: 'A strong ink and black with a sharp, clashing accent for witches, goblins, cats\' eyes and anything cool-coloured.',
      violet: 'A strong ink and black under a deep, dusky accent-coloured night sky with a pale moon: mysterious, a little haunted.',
      twotone: 'Black only, printed on strongly coloured card: the cheapest two-colour job, bold and graphic.',
      harvest: 'Four inks, rich and earthy, a strong one, a deep accent, a pale one and black: farmhouse, a jack-o-lantern on the porch.',
    }),
    paper: choice('What is the decoration made of?', {
      embossed: 'Heavy embossed cardboard: forms pressed up into relief, raised outlines, a die-cut card edge.',
      crepe: 'Crepe paper: fine crinkled ridges run across everything and the dye is mottled.',
      honeycomb: 'Honeycomb tissue: ribs of folded tissue paper fan across the forms, soft and translucent.',
      glossy: 'Glossy chromolitho stock: rich saturated inks, a varnish sheen catching the light.',
      pulp: 'A cheap paper plate or napkin: soft matte pulp, inks sunk and fibrous.',
    }),
    form: score('How much of the 3D form survives the printing?', [
      'None: everything is a pure black silhouette',
      'Black silhouettes cut by a lit edge of colour',
      'Flat shapes of ink with solid black shadows',
      'Flat shapes with halftone shading',
      'Fully modelled litho: tones, dots and highlights',
    ]),
    weight: score('How heavy are the keylines and the die-cut card margin?', [
      'Hairline',
      'Fine',
      'Bold',
      'Chunky',
      'Heavy cartoon outlines',
    ]),
    sky: choice('What is behind the scene?', {
      moonlit: 'A black night with a big full moon disc and a halo of dots around it.',
      harvest: 'An orange evening sky with a giant harvest moon, things in black silhouette against it.',
      crescent: 'A night sky with a thin crescent moon and scattered stars.',
      rays: 'A sunburst of alternating orange and dark rays fanning out from a moon behind the scene, like a party plate.',
      card: 'No sky: the decoration is cut out and laid on plain cream card.',
    }),
    ornament: choice('Which ornaments are printed around the scene?', {
      bats: 'A flight of die-cut bats wheeling across the sky and over the moon.',
      stars: 'Five-pointed stars scattered through the sky.',
      cobweb: 'Cobwebs strung in the corners with a spider dangling on a thread.',
      swarm: 'Everything at once: bats, stars and a cobweb, a crowded party sheet.',
      none: 'No ornaments: the scene alone.',
    }),
    border: choice('How is the edge of the decoration finished?', {
      scallop: 'A scalloped orange border with a black edge, like a party plate or a place card.',
      pinked: 'A black zigzag border cut with pinking shears.',
      lace: 'A paper-lace doily border punched with little holes.',
      ruled: 'A cream margin and a double black ruled frame, like a printed card.',
      bleed: 'No border: the picture runs to the edge.',
    }),
    mounting: choice('Where has this decoration been, and how is it held up?', {
      fresh: 'Fresh out of the envelope, lying flat, never hung.',
      taped: 'Taped to a classroom window with yellowed cellophane tape at the top corners.',
      tacked: 'Pinned to a wall with a thumbtack through the top.',
      folded: 'Folded in quarters and kept in an attic box for years, the creases cracking the ink.',
    }),
  },

  async apply(capture, answers, context, signal) {
    const { size, color, normal, depth, identity, diffuse } = capture;
    const count = size * size;
    const unit = size / 720;
    const mood = context.mood;
    const random = seeded((context.seed ^ 0x48a110e) >>> 0);
    const low = noiseField((context.seed * 31 + 7) | 0);
    const fine = noiseField((context.seed * 131 + 91) | 0);
    const palette = keyPress(PALETTES[answers.inks], context.palette, answers.inks);
    const toCss = (c: RGB) => `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
    const pinStops = PIN.map(([at, h]) => {
      const c: RGB = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      return [at, context.palette ? toCss(rekey({ c }, context.palette, { c: 'second' }).c) : h] as const;
    });
    const era = ERAS[answers.era];
    const form = answers.form;
    const weight = answers.weight;
    const cheer = mood.cheer;
    const [lx, ly, lz] = capture.light;

    // ---- read the capture ------------------------------------------------------------------------
    const id = new Uint8Array(count);
    const far = new Float32Array(count);
    const lit = new Float32Array(count);
    const area = new Float64Array(256);
    const histogram = new Uint32Array(256);
    let heroX = 0, heroY = 0, heroCount = 0, skyCount = 0;
    for (let p = 0; p < count; p++) {
      const at = p * 4;
      const i = identity[at];
      id[p] = i;
      area[i]++;
      far[p] = i === 0 ? 1 : (depth[at] * 65536 + depth[at + 1] * 256 + depth[at + 2]) / 16777216;
      lit[p] = diffuse[at] * 0.3 + diffuse[at + 1] * 0.59 + diffuse[at + 2] * 0.11;
      if (i > 0) histogram[Math.min(255, Math.round(lit[p]))]++;
      else skyCount++;
      if (i >= 3) { heroX += p % size; heroY += (p / size) | 0; heroCount++; }
    }
    // Worlds whose ground runs past the frame (a studio floor, an open plain) have no sky. When the
    // ground is most of the picture and the sky almost none of it, the ground becomes the backdrop
    // the decoration is printed against, so there is still a night and a moon behind the scene.
    const groundIsBack = skyCount < count * 0.12 && area[1] > count * 0.35;
    if (groundIsBack) {
      for (let p = 0; p < count; p++) if (id[p] === 1) { id[p] = 0; far[p] = 1; skyCount++; }
      area[0] = skyCount; area[1] = 0;
    }
    heroX = heroCount ? heroX / heroCount : size / 2;
    heroY = heroCount ? heroY / heroCount : size / 2;
    const extent = new Float32Array(256);
    for (let i = 0; i < 256; i++) extent[i] = Math.sqrt(area[i]);
    let total = 0, seen = 0, bright = 255;
    for (let v = 0; v < 256; v++) total += histogram[v];
    for (let v = 0; v < 256; v++) {
      seen += histogram[v];
      if (seen >= total * 0.92) { bright = Math.max(8, v); break; }
    }
    for (let p = 0; p < count; p++) lit[p] = Math.min(1.3, lit[p] / bright);
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
      split = Math.min(0.75, Math.max(0.3, split));
    }
    const litSoft = boxBlur(lit, size, Math.max(1, Math.round(2 * unit)));
    signal.throwIfAborted();
    await pause();

    // Flatten colour inside each identity so the separations come out as clean shapes.
    const radius = Math.max(1, Math.round(4 * unit));
    const planes = [0, 1, 2].map((channel) => {
      const plane = new Float32Array(count);
      for (let p = 0; p < count; p++) plane[p] = color[p * 4 + channel];
      return boxBlur(plane, size, radius);
    });
    signal.throwIfAborted();
    await pause();

    // ---- the moon ------------------------------------------------------------------------------
    const sky = answers.sky;
    const moonScale = { moonlit: 0.17, harvest: 0.25, crescent: 0.15, rays: 0.12, card: 0 }[sky];
    let moonR = moonScale * size;
    let moonX = size * 0.72, moonY = size * 0.22, moonCover = 0;
    if (moonR > 0) {
      // Find open sky for the moon: high, away from the hero, shrinking it a little to fit a corner.
      let best = -1e9, bestR = moonR;
      for (const shrink of [1, 0.8, 0.62]) {
        const r = moonR * shrink;
        for (let gy = 0; gy <= 5; gy++) {
          for (let gx = 0; gx <= 8; gx++) {
            const cx = size * (0.1 + (0.8 * gx) / 8);
            const cy = size * ((sky === 'harvest' ? 0.16 : 0.1) + (0.44 * gy) / 5);
            let hit = 0, n = 0;
            for (let ring = 1; ring <= 4; ring++) {
              for (let k = 0; k < 12; k++) {
                const a = (k / 12) * Math.PI * 2 + ring;
                const x = Math.round(cx + Math.cos(a) * r * ring / 4.4), y = Math.round(cy + Math.sin(a) * r * ring / 4.4);
                n++;
                if (x < 0 || y < 0 || x >= size || y >= size) continue;
                if (id[y * size + x] === 0) hit++;
              }
            }
            const cover = hit / n;
            const value = cover * 1.3 + shrink * 0.3 - (cy / size) * 0.35 + (Math.abs(cx - heroX) / size) * 0.3 + random() * 0.04;
            if (value > best) { best = value; moonX = cx; moonY = cy; moonCover = cover; bestR = r; }
          }
        }
      }
      moonR = bestR;
    }
    const inMoon = (x: number, y: number) => {
      if (moonR <= 0) return false;
      const dx = x - moonX, dy = y - moonY;
      if (dx * dx + dy * dy > moonR * moonR) return false;
      if (sky === 'crescent') {
        const cx = x - (moonX + moonR * 0.42), cy = y - (moonY - moonR * 0.22);
        return cx * cx + cy * cy > moonR * moonR * 0.82;
      }
      return true;
    };
    /** Scenery inside the moon prints as a black silhouette only when the moon is mostly open sky. */
    const silhouetteMoon = moonR > 0 && moonCover > 0.35;

    // ---- card margins: the scene as one die-cut, and each thing as its own --------------------
    const sceneSeed = new Uint8Array(count), thingSeed = new Uint8Array(count);
    for (let p = 0; p < count; p++) {
      if (id[p] >= 1) sceneSeed[p] = 1;
      if (id[p] >= 3) thingSeed[p] = 1;
    }
    const toScene = nearestSeed(sceneSeed, size);
    signal.throwIfAborted();
    const toThing = nearestSeed(thingSeed, size);
    signal.throwIfAborted();
    await pause();
    const marginScale = era.margin * mix(0.6, 1.6, weight) * unit;
    const sceneMargin = mix(4, 9, weight) * era.margin * unit;
    const thingMargin = (i: number) => Math.min(mix(2.5, 7, weight) * era.margin * unit, Math.max(1.2 * unit, extent[i] * 0.045 * marginScale / unit));
    /** 0 outside any card, 1 scene card, 2 thing card (for shadows and emboss). */
    const card = new Uint8Array(count);
    const sceneMarginMask = new Uint8Array(count);
    for (let p = 0; p < count; p++) {
      const x = p % size, y = (p / size) | 0;
      if (id[p] >= 3) { card[p] = 2; continue; }
      const tx = toThing.sx[p];
      if (tx >= 0) {
        const ty = toThing.sy[p];
        const d = Math.hypot(x - tx, y - ty);
        const wobble = (fine(x / (5 * unit), y / (5 * unit)) - 0.5) * 0.8 * unit;
        if (d + wobble < thingMargin(id[ty * size + tx])) { card[p] = 2; continue; }
      }
      if (id[p] >= 1) { card[p] = 1; continue; }
      const qx = toScene.sx[p];
      if (qx >= 0 && Math.hypot(x - qx, y - toScene.sy[p]) < sceneMargin) { card[p] = 1; sceneMarginMask[p] = 1; }
    }

    // ---- separations: every pixel becomes a role and a black tint ------------------------------
    const role = new Uint8Array(count);
    const kTint = new Uint8Array(count);
    /** On black shapes in a modelled print, how far the lit face opens up into dots. */
    const kOpen = new Uint8Array(count);
    const darkCut = mix(0.2, 0.13, cheer);
    const candidates: { role: number; hue: number }[] = [];
    candidates.push({ role: palette.orange ? O : P, hue: 28 });
    if (palette.accent) candidates.push({ role: A, hue: palette.accentHue });
    if (palette.light) candidates.push({ role: L, hue: 50 });
    const inkRole = (r: number, g: number, b: number) => {
      const Y = r * 0.3 + g * 0.59 + b * 0.11;
      if (Y < darkCut) return K;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const chroma = max - min;
      if (chroma < 0.08 + 0.08 * (1 - max)) return Y > 0.5 ? P : Y > 0.3 ? -1 : K;
      const hue = hueOf(r, g, b);
      let best = -1, gap = 1e9;
      for (const c of candidates) {
        if (c.role === L && Y < 0.55) continue;
        const d = hueGap(hue, c.hue);
        if (d < gap) { gap = d; best = c.role; }
      }
      if (gap <= 48) return best;
      // Colours the presses did not carry: cool and dark goes black, pale goes to the card.
      if (palette.accent && hueGap(hue, palette.accentHue) < 95) return A;
      return Y > 0.58 ? P : Y > 0.38 && palette.orange ? O : K;
    };
    for (let p = 0; p < count; p++) {
      const i = id[p];
      if (i === 0) continue;
      const x = p % size, y = (p / size) | 0;
      if (card[p] === 2 && i < 3) { role[p] = P; continue; }
      if (i < 3 && silhouetteMoon && inMoon(x, y)) { role[p] = K; continue; }
      const thing = i >= 3;
      // The ground stays a flat ink even in a silhouette print, so black figures have something to stand on.
      const s = thing ? form : i === 1 ? Math.max(0.5, form - 0.15) : clamp01(form - 0.15);
      let r = planes[0][p] / 255, g = planes[1][p] / 255, b = planes[2][p] / 255;
      // Near an identity edge the blur mixes two things: use the raw pixel there.
      if (x > radius && y > radius && x < size - radius && y < size - radius
        && (id[p - radius] !== i || id[p + radius] !== i || id[p - radius * size] !== i || id[p + radius * size] !== i)) {
        r = color[p * 4] / 255; g = color[p * 4 + 1] / 255; b = color[p * 4 + 2] / 255;
      }
      let base = inkRole(r, g, b);
      let tone = 0;
      if (base === -1) { base = s >= 0.45 ? P : K; tone = s >= 0.45 ? 0.35 : 0; }
      const l = litSoft[p];
      let out = base;
      if (s < 0.18) out = K;
      else {
        const cut = split * mix(1.3, 0.55, clamp01((s - 0.18) / 0.32)) * mix(1.15, 0.88, cheer);
        if (l < cut) out = K;
        else if (s >= 0.6 && base !== K) {
          const amount = clamp01((split * 1.12 - l) / (split * 0.62));
          tone = Math.max(tone, Math.round(amount * 3) / 4 * mix(0.4, 1, (s - 0.6) / 0.4));
          if (s >= 0.55 && l > 1.04 && (base === O || base === A)) out = palette.light ? L : P;
        } else if (base === K && s >= 0.7 && l > split * 1.1) {
          out = K;
          tone = -clamp01((l - split * 1.1) * 0.9) * 0.45;
        }
      }
      role[p] = out;
      if (tone > 0) kTint[p] = Math.round(Math.min(1, tone) * 255);
      else if (tone < 0) kOpen[p] = Math.round(-tone * 255);
    }
    // Two passes of a majority filter so textures print as shapes, not speckle.
    {
      const next = new Uint8Array(count);
      const tally = new Uint8Array(5);
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const p = y * size + x;
            const i = id[p];
            if (i === 0 || card[p] === 2 && i < 3) { next[p] = role[p]; continue; }
            tally.fill(0);
            for (let dy = -1; dy <= 1; dy++) {
              const yy = y + dy;
              if (yy < 0 || yy >= size) continue;
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx;
                if (xx < 0 || xx >= size) continue;
                const q = yy * size + xx;
                if (id[q] === i) tally[role[q]]++;
              }
            }
            let best = role[p];
            for (let k = 0; k < 5; k++) if (tally[k] > tally[best]) best = k;
            next[p] = best;
          }
        }
        role.set(next);
      }
    }
    signal.throwIfAborted();
    await pause();

    // ---- keylines -----------------------------------------------------------------------------
    const lineSeed = new Uint8Array(count);
    const lineWidth = new Float32Array(count);
    const lineBase = mix(0.5, 3.4, Math.pow(weight, 1.1)) * era.line * unit;
    const range = Math.max(1e-6, capture.far - capture.near);
    const jump = Math.max(capture.pixelWorldSize * 4, range * 0.0005) / range;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const p = y * size + x;
        const i = id[p];
        if (i === 0) continue;
        let kind = 0;
        for (const q of [p + 1, p - 1, p + size, p - size]) {
          if (id[q] !== i && far[p] <= far[q]) { kind = 3; break; }
        }
        if (!kind && (i >= 3 ? form >= 0.4 : i === 2 && form >= 0.3)) {
          const bend = Math.max(Math.abs(far[p - 1] - 2 * far[p] + far[p + 1]), Math.abs(far[p - size] - 2 * far[p] + far[p + size]));
          if (bend > jump && far[p] <= Math.min(far[p - 1], far[p + 1], far[p - size], far[p + size]) + jump * 0.5) kind = 2;
          else if (form >= (i >= 3 ? 0.55 : 0.45)) {
            const at = p * 4, a = (p + 1) * 4, c = (p + size) * 4;
            const nx = normal[at] - 128, ny = normal[at + 1] - 128, nz = normal[at + 2] - 128;
            const dotRight = (nx * (normal[a] - 128) + ny * (normal[a + 1] - 128) + nz * (normal[a + 2] - 128)) / 16129;
            const dotDown = (nx * (normal[c] - 128) + ny * (normal[c + 1] - 128) + nz * (normal[c + 2] - 128)) / 16129;
            if (Math.min(dotRight, dotDown) < 0.6) kind = 1;
          }
        }
        if (!kind) continue;
        const sizeFactor = Math.min(1, Math.max(0.35, extent[i] / (110 * unit)));
        const kindFactor = kind === 3 ? 1 : kind === 2 ? 0.6 : 0.4;
        const sceneFactor = i < 3 ? 0.7 : 1;
        const brush = mix(0.8, 1.2, low(x / (40 * unit), y / (40 * unit)));
        lineSeed[p] = 1;
        lineWidth[p] = Math.max(0.45 * unit, lineBase * kindFactor * sceneFactor * sizeFactor * brush);
      }
    }
    const toLine = nearestSeed(lineSeed, size);
    signal.throwIfAborted();
    await pause();

    // ---- plates --------------------------------------------------------------------------------
    const plate: Uint8Array[] = [];
    for (let k = 0; k <= K; k++) plate.push(new Uint8Array(count));
    const skyInk = palette.sky;
    const glowInk = palette.light ? L : palette.orange ? O : P;
    const moonInk = palette.moon;
    const nRays = 18 + Math.floor(random() * 8);
    const rayTurn = random() * Math.PI;
    const darkSky = sky === 'moonlit' || sky === 'crescent';
    for (let p = 0; p < count; p++) {
      const x = p % size, y = (p / size) | 0;
      const i = id[p];
      if (i === 0 && !card[p]) {
        // The sky.
        const dx = x - moonX, dy = y - moonY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (moonR > 0 && inMoon(x, y)) {
          if (moonInk !== P) plate[moonInk][p] = 255;
          // A few soft craters in a light orange screen.
          const crater = low((x - moonX) / (moonR * 0.35) + 11, (y - moonY) / (moonR * 0.35) + 5);
          if (crater > 0.66 && palette.orange) plate[O][p] = Math.round(clamp01((crater - 0.66) * 3) * 90);
          continue;
        }
        if (sky === 'card') {
          const edge = Math.min(x, y, size - 1 - x, size - 1 - y) / size;
          const v = clamp01((0.12 - edge) / 0.12) * (palette.orange ? 0.35 : 0.22);
          if (v > 0.02) plate[palette.orange ? O : K][p] = Math.round(v * 255);
          continue;
        }
        if (sky === 'harvest') {
          if (palette.orange) plate[O][p] = 255;
          const top = clamp01((0.55 - y / size) / 0.55);
          const halo = clamp01((d - moonR) / (moonR * 1.4));
          const k = (palette.orange ? 0.15 : 0.35) + top * 0.6 * halo + (1 - halo) * -0.15;
          plate[K][p] = Math.round(clamp01(k) * 255);
          continue;
        }
        if (sky === 'rays') {
          const a = Math.atan2(dy, dx) + rayTurn;
          const band = Math.floor(((a / (Math.PI * 2)) + 1) * nRays) % 2;
          if (band) plate[skyInk][p] = 255;
          else if (palette.orange) plate[O][p] = 255;
          continue;
        }
        // Night: the sky ink, opened into a halo of dots around the moon.
        const halo = moonR > 0 ? clamp01((d - moonR * 1.02) / (moonR * 1.1)) : 1;
        const tint = mix(0.35, 1, Math.pow(halo, 0.8));
        plate[skyInk][p] = Math.round(tint * 255);
        if (tint < 0.99 && glowInk !== P) plate[glowInk][p] = 255;
        if (skyInk === A && y > size * 0.55) plate[K][p] = Math.round(clamp01((y / size - 0.55) * 1.4) * 255 * 0.5);
        continue;
      }
      if (i === 0 || (card[p] === 2 && i < 3)) continue; // bare card margin
      const r = role[p];
      if (r !== P) plate[r][p] = 255;
      if (r === K && kOpen[p]) plate[K][p] = 255 - kOpen[p];
      else if (kTint[p]) plate[K][p] = Math.max(plate[K][p], kTint[p]);
    }
    // Keylines print in black over everything on their own side of the card.
    for (let p = 0; p < count; p++) {
      const sx = toLine.sx[p];
      if (sx < 0) continue;
      const x = p % size, y = (p / size) | 0;
      const sy = toLine.sy[p];
      const w = lineWidth[sy * size + sx];
      const d = Math.hypot(x - sx, y - sy);
      if (d >= w + 1) continue;
      if (id[p] === 0 && card[p]) {
        // Lines lie on the card, never on the bare margin around it unless they hug the edge.
        if (d > w * 0.5) continue;
      }
      const cover = clamp01(w - d + 0.5);
      plate[K][p] = Math.max(plate[K][p], Math.round(cover * 255));
    }
    signal.throwIfAborted();
    await pause();

    // ---- ornaments, drawn on canvases and laid onto the plates ---------------------------------
    const canvas = () => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      return c.getContext('2d') as CanvasRenderingContext2D;
    };
    interface Layer { ctx: CanvasRenderingContext2D; role: number; knock: boolean; skyOnly: boolean }
    const layers: Layer[] = [];
    const layer = (r: number, knock: boolean, skyOnly = false) => {
      const entry = { ctx: canvas(), role: r, knock, skyOnly };
      entry.ctx.fillStyle = '#000';
      entry.ctx.strokeStyle = '#000';
      layers.push(entry);
      return entry.ctx;
    };
    const ornament = answers.ornament;
    const notes: string[] = [era.name, palette.name, ...(groundIsBack ? ['ground printed as the backdrop'] : [])];
    const lightOrnament = darkSky || (sky === 'rays' && skyInk === A) ? (palette.light ? L : P) : K;
    const isSky = (x: number, y: number) => {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= size || yi >= size) return false;
      const p = yi * size + xi;
      return id[p] === 0 && !card[p];
    };
    if (ornament === 'stars' || ornament === 'swarm' || sky === 'crescent') {
      const ctx = layer(lightOrnament, true, true);
      const n = Math.round(mix(8, 26, mood.density) * (ornament === 'stars' || ornament === 'swarm' ? 1 : 0.5));
      let placed = 0;
      for (let tries = 0; tries < n * 12 && placed < n; tries++) {
        const x = size * (0.04 + random() * 0.92), y = size * (0.03 + random() * 0.6);
        if (!isSky(x, y) || inMoon(x, y)) continue;
        const r = size * mix(0.009, 0.026, random() * random()) ;
        starPath(ctx, x, y, r, random() * 0.6);
        ctx.fill();
        placed++;
      }
      if (placed) notes.push(`${placed} stars`);
    }
    if (ornament === 'cobweb' || ornament === 'swarm') {
      const webInk = darkSky || sky === 'rays' ? (palette.light ? L : P) : K;
      const ctx = layer(webInk, webInk !== K);
      ctx.lineWidth = Math.max(1, 1.4 * unit);
      ctx.lineCap = 'round';
      const corners: [number, number, number][] = [[0, 0, 0], [size, 0, Math.PI / 2]];
      const pick = moonX > size / 2 ? [corners[0]] : [corners[1]];
      if (ornament === 'cobweb') pick.push(moonX > size / 2 ? corners[1] : corners[0]);
      for (const [cx, cy, turn] of pick) {
        const reach = size * mix(0.2, 0.3, random());
        const spokes = 6;
        const angles: number[] = [];
        for (let k = 0; k < spokes; k++) angles.push(turn + (k / (spokes - 1)) * (Math.PI / 2) + (random() - 0.5) * 0.12);
        for (const a of angles) {
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach); ctx.stroke();
        }
        for (let ring = 1; ring <= 6; ring++) {
          const rr = (reach * ring) / 6.4;
          ctx.beginPath();
          for (let k = 0; k < spokes; k++) {
            const a = angles[k];
            const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
            if (!k) ctx.moveTo(px, py);
            else {
              const m = (angles[k - 1] + a) / 2;
              const sag = rr * 0.8;
              ctx.quadraticCurveTo(cx + Math.cos(m) * sag, cy + Math.sin(m) * sag, px, py);
            }
          }
          ctx.stroke();
        }
        // The spider on its thread.
        const a = angles[3];
        const hx = cx + Math.cos(a) * reach * 0.55;
        const hy = cy + Math.sin(a) * reach * 0.55;
        const drop = size * mix(0.08, 0.16, random());
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + drop); ctx.stroke();
        const body = size * 0.014;
        ctx.beginPath(); ctx.ellipse(hx, hy + drop + body, body * 0.8, body, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx, hy + drop + body * 2.1, body * 0.75, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = Math.max(1, 1.6 * unit);
        for (const side of [-1, 1]) for (let leg = 0; leg < 4; leg++) {
          const ly0 = hy + drop + body * (1 + leg * 0.35);
          ctx.beginPath();
          ctx.moveTo(hx, ly0);
          ctx.quadraticCurveTo(hx + side * body * 1.8, ly0 - body * 1.2, hx + side * body * 2.4, ly0 + body * (leg - 1) * 0.5);
          ctx.stroke();
        }
      }
      notes.push('cobwebs in the corners');
    }
    if (ornament === 'bats' || ornament === 'swarm') {
      // Bats on a dark sky get a die-cut cream edge so they read; on light grounds they are plain black.
      const edged = darkSky || sky === 'rays';
      const edge = edged ? layer(P, true) : null;
      const ctx = layer(K, false);
      const n = Math.round(mix(4, 10, mood.density) * (ornament === 'swarm' ? 1.3 : 1) * mix(0.8, 1.2, mood.energy));
      const spots: [number, number][] = [];
      let placed = 0;
      for (let tries = 0; tries < 400 && placed < n; tries++) {
        let x: number, y: number;
        const crossing = placed < (moonR > 0 ? 2 : 0);
        if (crossing) {
          const a = random() * Math.PI * 2, rr = Math.sqrt(random()) * moonR * 0.7;
          x = moonX + Math.cos(a) * rr; y = moonY + Math.sin(a) * rr;
        } else {
          x = size * (0.06 + random() * 0.88); y = size * (0.05 + random() * 0.55);
          if (!isSky(x, y) && tries < 300) continue;
        }
        const w = size * mix(0.035, 0.08, random()) * (crossing ? 1.2 : 1);
        if (spots.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < w * 0.9)) continue;
        spots.push([x, y]);
        const tilt = (random() - 0.5) * mix(0.4, 1.1, mood.energy);
        const flap = mix(0.55, 1.15, random());
        for (const [target, grow] of [[edge, 1], [ctx, 0]] as const) {
          if (!target) continue;
          target.save();
          target.translate(x, y);
          target.rotate(tilt);
          target.scale(w / 100, (w / 100) * flap);
          batPath(target);
          target.fill();
          if (grow) { target.lineWidth = (3.2 * unit * 100) / w; target.lineJoin = 'round'; target.stroke(); }
          target.restore();
        }
        placed++;
      }
      notes.push(`${placed} bats`);
    }
    const border = answers.border;
    if (border !== 'bleed') {
      const band = size * (border === 'ruled' ? 0.04 : 0.05);
      if (border === 'scallop') {
        const back = layer(K, false);
        const front = layer(palette.orange ? O : P, true);
        const n = Math.round(size / (band * 1.25));
        const step = size / n;
        for (const [ctx, grow] of [[back, 2.2 * unit * mix(0.8, 1.6, weight)], [front, 0]] as const) {
          ctx.beginPath();
          ctx.rect(0, 0, size, size);
          ctx.rect(band + grow, band + grow, size - 2 * (band + grow), size - 2 * (band + grow));
          ctx.fill('evenodd');
          const r = step * 0.5 + grow;
          for (let k = 0; k < n; k++) {
            const c = step * (k + 0.5);
            for (const [x, y] of [[c, band], [c, size - band], [band, c], [size - band, c]]) {
              ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            }
          }
        }
        notes.push('scalloped border');
      } else if (border === 'pinked') {
        const ctx = layer(K, true);
        const tooth = band * 0.5;
        const n = Math.round(size / tooth);
        const step = size / n;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let k = 0; k <= n; k++) ctx.lineTo(k * step, k % 2 ? band : band * 0.55);
        ctx.lineTo(size, 0);
        ctx.closePath();
        ctx.moveTo(0, size);
        for (let k = 0; k <= n; k++) ctx.lineTo(k * step, size - (k % 2 ? band : band * 0.55));
        ctx.lineTo(size, size);
        ctx.closePath();
        ctx.moveTo(0, 0);
        for (let k = 0; k <= n; k++) ctx.lineTo(k % 2 ? band : band * 0.55, k * step);
        ctx.lineTo(0, size);
        ctx.closePath();
        ctx.moveTo(size, 0);
        for (let k = 0; k <= n; k++) ctx.lineTo(size - (k % 2 ? band : band * 0.55), k * step);
        ctx.lineTo(size, size);
        ctx.closePath();
        ctx.fill();
        notes.push('pinked border');
      } else if (border === 'lace') {
        const ctx = layer(P, true);
        const n = Math.round(size / (band * 0.9));
        const step = size / n;
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.rect(band, band, size - 2 * band, size - 2 * band);
        ctx.fill('evenodd');
        for (let k = 0; k < n; k++) {
          const c = step * (k + 0.5);
          for (const [x, y] of [[c, band], [c, size - band], [band, c], [size - band, c]]) {
            ctx.beginPath(); ctx.arc(x, y, step * 0.5, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'destination-out';
        for (let k = 0; k < n; k++) {
          const c = step * (k + 0.5);
          for (const [x, y, dx, dy] of [[c, band, 0, -1], [c, size - band, 0, 1], [band, c, -1, 0], [size - band, c, 1, 0]]) {
            ctx.beginPath(); ctx.arc(x + dx * band * 0.1, y + dy * band * 0.1, step * 0.17, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + dx * band * 0.62 + dy * step * 0.5, y + dy * band * 0.62 + dx * step * 0.5, step * 0.11, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
        notes.push('paper lace border');
      } else {
        const blank = layer(P, true);
        blank.beginPath();
        blank.rect(0, 0, size, size);
        blank.rect(band, band, size - 2 * band, size - 2 * band);
        blank.fill('evenodd');
        const ctx = layer(K, false);
        ctx.lineWidth = Math.max(1, mix(1.4, 3.6, weight) * unit);
        ctx.strokeRect(band * 0.45, band * 0.45, size - band * 0.9, size - band * 0.9);
        ctx.lineWidth = Math.max(1, 1.1 * unit);
        ctx.strokeRect(band * 0.75, band * 0.75, size - band * 1.5, size - band * 1.5);
        notes.push('ruled frame');
      }
    }
    for (const { ctx, role: r, knock, skyOnly } of layers) {
      const data = ctx.getImageData(0, 0, size, size).data;
      for (let p = 0; p < count; p++) {
        const a = data[p * 4 + 3];
        if (!a) continue;
        if (skyOnly && (id[p] !== 0 || card[p])) continue;
        if (knock) {
          const keep = 1 - a / 255;
          for (const k of PLATES) if (k !== r) plate[k][p] = Math.round(plate[k][p] * keep);
        }
        if (r !== P) plate[r][p] = Math.max(plate[r][p], a);
      }
      signal.throwIfAborted();
    }
    await pause();

    // ---- the card surface ----------------------------------------------------------------------
    const paperKind = answers.paper;
    // A height field: the scene card, the thing cards on top, raised keylines for embossing.
    const height = new Float32Array(count);
    for (let p = 0; p < count; p++) {
      height[p] = (card[p] >= 1 ? 0.5 : 0) + (card[p] === 2 ? 0.5 : 0) + (paperKind === 'embossed' ? (plate[K][p] / 255) * 0.25 : 0);
    }
    const relief = boxBlur(height, size, Math.max(1, Math.round(1.5 * unit)));
    const cardSoft = boxBlur(height, size, Math.max(2, Math.round(5 * unit)));
    const shadowLen = 5 * unit * mix(0.8, 1.5, weight);
    const lightLen = Math.hypot(lx, ly) || 1;
    const sdx = Math.round((-lx / lightLen) * shadowLen), sdy = Math.round((-ly / lightLen) * shadowLen);
    signal.throwIfAborted();
    await pause();

    // ---- print: registration, screens, inks on card ---------------------------------------------
    const slip = era.slip * unit * mix(0.6, 1.4, mood.energy) * mix(0.8, 1.3, mood.wear);
    const offsets = PLATES.map((k) => {
      if (k === K) return [0, 0];
      const a = random() * Math.PI * 2, m = slip * mix(0.6, 1.2, random());
      return [Math.round(Math.cos(a) * m), Math.round(Math.sin(a) * m)];
    });
    const angles = { [L]: 0, [O]: Math.PI / 12, [A]: (Math.PI * 5) / 12, [K]: Math.PI / 4 } as Record<number, number>;
    const period = era.period * unit * (paperKind === 'glossy' ? 0.8 : 1);
    const fade = mood.wear * 0.28;
    const paper: number[] = [
      palette.paper[0] + (mood.warmth - 0.5) * 12 - mood.wear * 10,
      palette.paper[1] + (mood.warmth - 0.5) * 4 - mood.wear * 16,
      palette.paper[2] - (mood.warmth - 0.5) * 14 - mood.wear * 30,
    ];
    const inkOf = (k: number): RGB => (k === L ? palette.light : k === O ? palette.orange : k === A ? palette.accent : palette.black) ?? palette.black;
    const inks = PLATES.map((k) => {
      const c = inkOf(k);
      const saturate = paperKind === 'glossy' ? 1.12 : paperKind === 'pulp' ? 0.88 : 1;
      const grey = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      const sat = c.map((v) => grey + (v - grey) * saturate * mix(0.9, 1.08, cheer));
      return sat.map((v, j) => v + (paper[j] - v) * (k === K ? fade * 0.5 : fade));
    });
    const opacity = PLATES.map((k) => (k === K ? 0.97 : paperKind === 'honeycomb' ? 0.84 : paperKind === 'pulp' ? 0.86 : 0.94));
    const screens = PLATES.map((k) => [Math.cos(angles[k]), Math.sin(angles[k])]);
    const out = new Uint8ClampedArray(count * 4);
    const grain = era.grain * (paperKind === 'pulp' ? 1.8 : paperKind === 'glossy' ? 0.4 : 1);
    const crease = answers.mounting === 'folded';
    const foxing = noiseField((context.seed * 7 + 3) | 0);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        let r = paper[0], g = paper[1], b = paper[2];
        for (let j = 0; j < 4; j++) {
          const k = PLATES[j];
          const [ox, oy] = offsets[j];
          const qx = Math.min(size - 1, Math.max(0, x - ox)), qy = Math.min(size - 1, Math.max(0, y - oy));
          const t = plate[k][qy * size + qx];
          if (!t) continue;
          let cover = screen(x, y, screens[j][0], screens[j][1], period, t / 255);
          if (!cover) continue;
          if (paperKind === 'crepe' || paperKind === 'pulp') cover *= mix(0.82, 1, low(x / (9 * unit), y / (3 * unit) + j * 17));
          const ink = inks[j];
          const amount = cover * opacity[j];
          r += (ink[0] - r) * amount;
          g += (ink[1] - g) * amount;
          b += (ink[2] - b) * amount;
        }
        // Surface of the card.
        let shade = 1;
        const xr = Math.min(size - 2, Math.max(1, x)), yr = Math.min(size - 2, Math.max(1, y));
        const gx = relief[yr * size + xr + 1] - relief[yr * size + xr - 1];
        const gy = relief[(yr + 1) * size + xr] - relief[(yr - 1) * size + xr];
        const emboss = paperKind === 'embossed' ? 2.6 : 1.2;
        shade += (-gx * lx - gy * ly) / lightLen * emboss * 0.5;
        const i = id[p];
        if (i > 0) {
          const at = p * 4;
          const nx = normal[at] / 127.5 - 1, ny = normal[at + 1] / 127.5 - 1, nz = normal[at + 2] / 127.5 - 1;
          if (paperKind === 'embossed') {
            const facing = nx * lx - ny * ly + nz * lz;
            shade += (facing - 0.45) * (i >= 3 ? 0.2 : 0.1);
          } else if (paperKind === 'glossy') {
            const hx = lx, hy = -ly, hz = lz + 1;
            const hl = Math.hypot(hx, hy, hz) || 1;
            const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), 36);
            r += (255 - r) * spec * 0.55; g += (255 - g) * spec * 0.55; b += (255 - b) * spec * 0.55;
          } else if (paperKind === 'honeycomb' && i >= 3) {
            const u = Math.asin(Math.max(-1, Math.min(1, nx))) / Math.PI + 0.5;
            const ribs = 14 + (i % 5) * 2;
            const f = u * ribs - Math.floor(u * ribs);
            shade *= f < 0.14 ? 0.8 : f < 0.3 ? 1.06 : 1;
            const cell = fine(x / (2.2 * unit), y / (2.2 * unit));
            shade *= mix(0.96, 1.03, cell);
          }
        }
        if (paperKind === 'crepe') {
          const wave = Math.sin((y + low(x / (60 * unit), y / (60 * unit)) * 18 * unit) / (1.15 * unit));
          shade *= 1 + wave * 0.045 + (fine(x / (30 * unit), y / (0.9 * unit)) - 0.5) * 0.08;
        }
        // Shadow of a card on whatever lies beneath it.
        const sx2 = Math.min(size - 1, Math.max(0, x - sdx)), sy2 = Math.min(size - 1, Math.max(0, y - sdy));
        const above = cardSoft[sy2 * size + sx2];
        const here = card[p] === 2 ? 1 : card[p] === 1 ? 0.5 : 0;
        if (above > here + 0.02) shade *= 1 - Math.min(0.42, (above - here) * 0.7);
        shade *= 1 + (fine(x / (1.3 * unit), y / (1.3 * unit)) - 0.5) * 0.07 * grain + (low(x / (70 * unit), y / (70 * unit)) - 0.5) * 0.025 * grain;
        // Age: foxing and a browned edge.
        if (mood.wear > 0.3) {
          const fox = foxing(x / (5 * unit), y / (5 * unit)) * 0.6 + low(x / (90 * unit), y / (90 * unit)) * 0.4;
          const gate = 0.86 - mood.wear * 0.08;
          if (fox > gate) {
            const v = clamp01((fox - gate) * 8) * mood.wear * 0.3;
            r += (150 - r) * v; g += (100 - g) * v; b += (55 - b) * v;
          }
          const edge = Math.min(x, y, size - 1 - x, size - 1 - y) / size;
          shade *= 1 - clamp01((0.05 - edge) / 0.05) * mood.wear * 0.25;
        }
        if (crease) {
          const dxc = Math.abs(x - size / 2), dyc = Math.abs(y - size / 2);
          for (const [dist, side] of [[dxc, x < size / 2 ? -1 : 1], [dyc, y < size / 2 ? -1 : 1]]) {
            if (dist < 3 * unit) {
              shade *= side < 0 ? 0.9 : 1.05;
              if (dist < 1.5 * unit && fine(x / (2 * unit), y / (2 * unit)) > 0.45) {
                const v = 0.7;
                r += (paper[0] - r) * v; g += (paper[1] - g) * v; b += (paper[2] - b) * v;
              }
            }
          }
        }
        const at = p * 4;
        out[at] = r * shade;
        out[at + 1] = g * shade;
        out[at + 2] = b * shade;
        out[at + 3] = 255;
      }
      if ((y & 63) === 0) signal.throwIfAborted();
    }
    await pause();

    // ---- how it is hung -----------------------------------------------------------------------
    const mounting = answers.mounting;
    if (mounting === 'taped' || mounting === 'tacked') {
      const ctx = canvas();
      if (mounting === 'taped') {
        for (const [cx, turn] of [[size * 0.07, -0.75], [size * 0.93, 0.75]] as const) {
          ctx.save();
          ctx.translate(cx, size * 0.05);
          ctx.rotate(turn + (random() - 0.5) * 0.2);
          const w = size * 0.17, h = size * 0.05;
          ctx.beginPath();
          ctx.moveTo(-w / 2, -h / 2);
          for (let k = 0; k <= 6; k++) ctx.lineTo(-w / 2 + (k % 2) * 3 * unit, -h / 2 + (h * k) / 6);
          for (let k = 6; k >= 0; k--) ctx.lineTo(w / 2 - (k % 2) * 3 * unit, -h / 2 + (h * k) / 6);
          ctx.closePath();
          ctx.fillStyle = `rgba(${Math.round(mix(240, 214, mood.wear))}, ${Math.round(mix(232, 186, mood.wear))}, ${Math.round(mix(205, 112, mood.wear))}, ${mix(0.42, 0.62, mood.wear)})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(120, 100, 60, 0.25)';
          ctx.lineWidth = unit;
          ctx.stroke();
          ctx.restore();
        }
        notes.push('taped up by the corners');
      } else {
        const cx = size * mix(0.46, 0.54, random()), cy = size * 0.035, r = 10 * unit;
        ctx.fillStyle = 'rgba(20, 12, 8, 0.35)';
        ctx.beginPath(); ctx.arc(cx + 3 * unit, cy + 4 * unit, r, 0, Math.PI * 2); ctx.fill();
        const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
        for (const [at, c] of pinStops) grad.addColorStop(at, c);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        notes.push('pinned with a thumbtack');
      }
      const data = ctx.getImageData(0, 0, size, size).data;
      for (let p = 0; p < count; p++) {
        const a = data[p * 4 + 3] / 255;
        if (!a) continue;
        const at = p * 4;
        for (let c = 0; c < 3; c++) out[at + c] = out[at + c] * (1 - a) + data[at + c] * a;
      }
    } else if (mounting === 'folded') notes.push('folded in quarters');

    notes.push(`${answers.paper} paper`, `${answers.sky} sky`, form < 0.18 ? 'pure silhouettes' : form < 0.45 ? 'silhouettes cut by lit edges' : form < 0.7 ? 'flat ink shapes' : 'modelled litho');
    return { pixels: out, notes };
  },
});
