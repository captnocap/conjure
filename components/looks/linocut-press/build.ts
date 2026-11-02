import { type PaletteRole, choice, clamp01, defineLook, fromOklch, mix, oklch, rekey, score, seeded } from '@conjure/kit';

/**
 * A linocut. The frame is read as a lino block the way a printmaker would cut it:
 *   1. the plain-lit pass and the local tone say how much of the block is carved away at each
 *      point: solid ink in the shadows, gouge marks through the half-tones, bare paper in the light,
 *   2. the normals give the gouges their direction, so the white marks run with the form; the
 *      ground and the sky are gouged their own way,
 *   3. identity keeps every form its own shape, and depth and creases give the key line,
 *   4. one to three blocks are inked (tint, colour, key), rolled unevenly and pulled slightly out
 *      of register, then chips, pinholes and the pressed edge of the plate finish the impression.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const smooth = (from: number, to: number, x: number) => {
  const t = clamp01((x - from) / (to - from));
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
const describe = <T extends Record<string, { description: string }>>(table: T) =>
  Object.fromEntries(Object.entries(table).map(([key, entry]) => [key, entry.description])) as Record<keyof T & string, string>;

const PAPERS = {
  white: { hex: '#f3f0e8', dark: false, fibre: 0, mottle: 0.015, specks: 0, name: 'white printmaking paper', description: 'Bright white printmaking paper: the carved areas print as clean white.' },
  cream: { hex: '#ebe1c7', dark: false, fibre: 0.15, mottle: 0.04, specks: 0, name: 'cream cartridge paper', description: 'Softly tinted cartridge paper, a little mottled.' },
  mulberry: { hex: '#ede6d4', dark: false, fibre: 1, mottle: 0.03, specks: 0, name: 'mulberry paper', description: 'Soft Japanese mulberry paper with long fibres lying in the sheet.' },
  newsprint: { hex: '#d7cdab', dark: false, fibre: 0.2, mottle: 0.06, specks: 1, name: 'yellowed newsprint', description: 'Cheap yellowed newsprint, speckled, the ink sunk in: a proof pulled on whatever was to hand.' },
  kraft: { hex: '#bf9a66', dark: false, fibre: 0.5, mottle: 0.07, specks: 0.3, name: 'kraft paper', description: 'Brown kraft paper, so the carved areas come out tan instead of white.' },
  grey: { hex: '#b8b7b0', dark: false, fibre: 0.1, mottle: 0.04, specks: 0, name: 'toned card', description: 'Mid-toned card: a quiet tonal print, the paper itself a half-tone.' },
  black: { hex: '#17181b', dark: true, fibre: 0, mottle: 0.02, specks: 0, name: 'black paper', description: 'Near-black paper printed with white and pale inks: a night print, where the gouges read as dark.' },
} as const;

/** Blocks in printing order: a tint, a colour, and the key that goes on last. */
const INKS = {
  black: { key: '#161616', mid: '#6d6964', light: '#c4bdb0', spot: false, name: 'black ink', description: 'Black oil ink alone; further blocks add a warm grey and a pale stone tint.' },
  brick: { key: '#1a1513', mid: '#b4372a', light: '#e9bba4', spot: false, name: 'black over a strong colour', description: 'Black key over a strong saturated block, with a soft blush of it for the third: the classic poster linocut.' },
  indigo: { key: '#1a2746', mid: '#4b6b9b', light: '#abc0d9', spot: false, name: 'deep cool inks', description: 'A deep key, a muted mid tone and a pale tint of one colour: cool, nautical, nocturnal.' },
  sepia: { key: '#3a2316', mid: '#8b5a33', light: '#d5b88d', spot: false, name: 'mellow inks', description: 'A dark mellow key over a softer mid ink and a pale tint: an old book-plate.' },
  forest: { key: '#17251c', mid: '#3f6c47', light: '#aac78d', spot: false, name: 'dense organic inks', description: 'A very dark key, a rich mid ink and a pale fresh tint: botanical, damp, woodland.' },
  harbour: { key: '#132c47', mid: '#3a8c9f', light: '#e3b43a', spot: true, name: 'a deep key, a colour block and a spot', description: 'A deep key, a clear colour block and a contrasting spot colour printed wherever the scene is warm: a harbour poster.' },
  fluoro: { key: '#1b1b1b', mid: '#ff4f8f', light: '#f9e04a', spot: true, name: 'black with two fluorescent inks', description: 'Black key, a fluorescent block and a contrasting fluorescent spot colour on the warm things: a gig poster.' },
  oxblood: { key: '#4a1620', mid: '#b86b78', light: '#e7d7c3', spot: false, name: 'dusky inks', description: 'A dark heavy key, a dusty mid ink and a bone-pale tint: wine, velvet, theatre.' },
} as const;

/**
 * Blocks re-keyed to the picture's palette: the colour block carries the ink, a spot colour answers in
 * the second, and a coloured key follows the ink but keeps its own darkness (a key that lifted toward a
 * pale palette ink would stop being a key). Black keys and the all-black set are black ink and stay.
 */
const INK_ROLES: Record<string, Record<string, PaletteRole>> = {
  black: {},
  brick: { mid: 'ink', light: 'ink' },
  fluoro: { mid: 'ink', light: 'second' },
  harbour: { key: 'ink', mid: 'ink', light: 'second' },
};
const FAMILY: Record<string, PaletteRole> = { key: 'ink', mid: 'ink', light: 'ink' };
/** Toned and dark papers take the palette's ground; white, mulberry, kraft and newsprint are materials and stay. */
const GROUND_PAPERS = new Set(['cream', 'grey', 'black']);

export default defineLook({
  questions: {
    inks: choice('What character have the inks mixed for the blocks? Coloured inks take the picture\u2019s palette.', describe(INKS)),
    blocks: choice('How many blocks were cut and printed?', {
      one: 'A single key block: one ink and bare paper, the starkest print.',
      two: 'Two blocks: a flat colour block printed under the key.',
      three: 'Three blocks: a pale tint, a mid colour and the key, a reduction print with graded tones.',
    }),
    gouge: score('How coarse are the gouges?', [
      'Fine V-gouge hairlines, close and even',
      'Fine',
      'Medium U-gouge strokes',
      'Broad',
      'Chunky wide scoops, a block cut in a hurry',
    ]),
    carve: score('How much of the block is carved away?', [
      'Very little: a heavy, inky print with the highlights picked out',
      'Heavy',
      'Balanced',
      'Light',
      'Nearly all of it: an open, airy print of a few dark marks',
    ]),
    sky: choice('How is the sky cut?', {
      white: 'Carved away to bare paper: the scene stands against nothing.',
      lines: 'A dark band across the top gouged with long horizontal lines that open out to bare paper toward the horizon.',
      rays: 'A sun left as a white disc with gouged rays bursting across an inked sky.',
      solid: 'Printed solid: the scene cut out of a flat dark sky.',
      night: 'A solid night sky with a carved moon and a scatter of stars.',
    }),
    ground: choice('How is the ground cut?', {
      white: 'Carved away to bare paper: only the cast shadows are left in ink.',
      strokes: 'Gouged with flowing horizontal strokes, denser near the front and thinning to paper in the distance.',
      solid: 'A solid dark ground with a few hairline gouges, the things standing on ink.',
    }),
    edges: choice('How are the forms separated?', {
      black: 'A dark key line cut around every form and crease.',
      white: 'A white line carved along every edge, the colours meeting across a thin gap.',
      none: 'No outline: forms meet edge to edge, told apart by tone alone.',
    }),
    paper: choice('What paper is it printed on?', describe(PAPERS)),
    proof: choice('What state is this impression in?', {
      clean: 'A clean editioned print: even inking, tight registration.',
      slipped: 'The paper slipped on the press: the colour blocks sit a few millimetres out of register.',
      dry: 'Under-inked: the roller was running out, so the solids are thin and mottled.',
      heavy: 'Over-inked: ink squashed into the finest gouges and squeezed at the edges, very black.',
      chipped: 'The block is old and damaged: chips, cracks and a lost corner print as white flaws.',
      artist: "An artist's proof pulled on a wide sheet, pencilled with edition, title and signature.",
    }),
  },

  async apply(capture, a, context, signal) {
    const { size, color, identity, normal, depth, diffuse } = capture;
    const N = size * size;
    const seed = context.seed | 0;
    const rnd = seeded((context.seed ^ 0x11a0c0de) >>> 0);
    const { mood } = context;
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };

    const paperSpec = PAPERS[a.paper];
    const inkSpec = INKS[a.inks];
    const dark = paperSpec.dark;
    const blocks = a.blocks === 'one' ? 1 : a.blocks === 'two' ? 2 : 3;
    const spot = inkSpec.spot && blocks === 3;

    // ── Colours: cheer keeps the ink saturated, warmth tints paper and ink ─────────────────────
    const grey = (c: RGB): RGB => {
      const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      return [l, l, l];
    };
    const temper = (c: RGB, amount: number): RGB => [
      Math.max(0, Math.min(255, c[0] + (mood.warmth - 0.5) * amount)),
      c[1],
      Math.max(0, Math.min(255, c[2] - (mood.warmth - 0.5) * amount)),
    ];
    const inkOf = (c0: readonly [number, number, number], lift: number): RGB => {
      let c: RGB = [c0[0], c0[1], c0[2]];
      if (dark && lift) c = mixRGB(c, [246, 241, 230], lift);
      return temper(mixRGB(grey(c), c, 0.7 + 0.3 * mood.cheer), 14);
    };
    const designed = { key: hex(inkSpec.key), mid: hex(inkSpec.mid), light: hex(inkSpec.light) };
    const keyed = rekey(designed, context.palette, INK_ROLES[a.inks] ?? FAMILY);
    if (keyed !== designed && keyed.key !== designed.key) {
      const [, chroma, hue] = oklch(keyed.key);
      keyed.key = fromOklch(oklch(designed.key)[0], chroma, hue);
    }
    const sheetColour = hex(paperSpec.hex);
    const paper = temper(GROUND_PAPERS.has(a.paper) ? [...rekey({ sheetColour }, context.palette, { sheetColour: 'ground' }).sheetColour] as RGB : sheetColour, 10);
    const keyInk = dark ? temper(hex('#ede7d9'), 10) : inkOf(keyed.key, 0);
    const midInk = inkOf(keyed.mid, 0.3);
    const lightInk = inkOf(keyed.light, 0.45);

    // ── The plate: the block's rectangle inside the sheet ────────────────────────────────────
    const wide = a.proof === 'artist';
    const mL = Math.round(size * (wide ? 0.09 : 0.045));
    const mT = Math.round(size * (wide ? 0.08 : 0.045));
    const mR = size - mL;
    const mB = size - Math.round(size * (wide ? 0.17 : 0.045));
    const inPlate = (x: number, y: number) => x >= mL && x < mR && y >= mT && y < mB;
    const plateW = mR - mL, plateH = mB - mT;

    // ── 1. Read the capture ──────────────────────────────────────────────────────────────────
    const ids = new Uint8Array(N);
    const lit = new Float32Array(N);
    const lum = new Float32Array(N);
    const dep = new Float32Array(N);
    const histogram = new Uint32Array(256);
    let solid = 0;
    let groundNear = 1, groundFar = 0;
    for (let p = 0; p < N; p++) {
      const o = p * 4;
      const id = identity[o];
      ids[p] = id;
      dep[p] = id === 0 ? 1 : (depth[o] + depth[o + 1] / 256 + depth[o + 2] / 65536) / 255;
      const plain = diffuse[o] * 0.3 + diffuse[o + 1] * 0.59 + diffuse[o + 2] * 0.11;
      lit[p] = plain;
      lum[p] = (color[o] * 0.2126 + color[o + 1] * 0.7152 + color[o + 2] * 0.0722) / 255;
      if (id >= 1) {
        histogram[Math.round(plain)]++;
        solid++;
      }
      if (id === 1) {
        if (dep[p] < groundNear) groundNear = dep[p];
        if (dep[p] > groundFar) groundFar = dep[p];
      }
    }
    const percentile = (fraction: number) => {
      let seen = 0;
      for (let value = 0; value < 256; value++) {
        seen += histogram[value];
        if (seen >= solid * fraction) return value;
      }
      return 255;
    };
    const dim = percentile(0.03), bright = Math.max(dim + 12, percentile(0.88));
    const groundSpan = Math.max(1e-6, groundFar - groundNear);
    const confidence = capture.confidence;

    // ── 2. Tone: how much of the block is left at each point (0 solid ink … 1 bare paper) ────
    // A sun or moon goes on the lit side, but where the sky is open: a disc hidden behind a
    // lamp post or a roofline is no use to anyone.
    const skyAround = (cx: number, cy: number, r: number) => {
      let n = 0, open = 0;
      const step = Math.max(1, r / 3);
      for (let dy = -r; dy <= r; dy += step)
        for (let dx = -r; dx <= r; dx += step) {
          if (dx * dx + dy * dy > r * r) continue;
          const x = Math.round(cx + dx), y = Math.round(cy + dy);
          n++;
          if (inPlate(x, y) && ids[y * size + x] === 0) open++;
        }
      return n ? open / n : 0;
    };
    const preferU = capture.light[0] > 0 ? 0.8 : 0.2;
    const placeInSky = (v0: number, v1: number, r: number): [number, number] => {
      let bestX = mix(mL, mR, preferU), bestY = mix(mT, mB, v0), bestScore = -1;
      for (let i = 0; i < 28; i++) {
        const u = i < 10 ? preferU + (rnd() - 0.5) * 0.14 : 0.12 + rnd() * 0.76;
        const x = mix(mL, mR, u), y = mix(mT, mB, v0 + rnd() * (v1 - v0));
        const score = skyAround(x, y, r * 1.4) - Math.abs(u - preferU) * 0.35;
        if (score > bestScore) { bestScore = score; bestX = x; bestY = y; }
      }
      return [bestX, bestY];
    };
    const sunR = 0.065 + rnd() * 0.03;
    const [sunX, sunY] = placeInSky(0.12, 0.24, sunR * size * 0.5);
    // Where the key block goes from solid to carved away, in tone. The sky is cut in these terms
    // so that its treatment survives any answer to "how much is carved".
    const keySolid = mix(0.6, 0.2, a.carve), keyClear = mix(0.93, 0.56, a.carve);
    const skyTone = (x: number, y: number) => {
      const v = (y - mT) / plateH;
      switch (a.sky) {
        case 'lines': {
          const wobble = (vnoise(x / 120, y / 40, seed + 3) - 0.5) * 0.08;
          if (dark) return mix(0.92, 0.5, smooth(0.1, 0.75, v + wobble));
          return mix(0.17, 1, smooth(0.08, 0.64, v + wobble));
        }
        case 'rays': {
          // The sun is a bare disc. Around it the rays are cut wide and crowd into light; far
          // away they thin to hairlines through solid ink. On black paper the burst inverts:
          // white ink around the sun fading into black paper with pale ridges.
          const r = Math.hypot(x - sunX, y - sunY) / (size * 0.5);
          if (r < sunR) return dark ? 0 : 1;
          const nearSun = 1 - smooth(sunR * 1.1, 0.8, r);
          let open = dark ? 0.85 - 0.72 * nearSun : 0.3 + 0.58 * nearSun;
          open = clamp01(open + smooth(0.6, 0.98, v) * 0.7);
          return mix(keySolid, keyClear + 0.03, open);
        }
        case 'solid':
        case 'night':
          return dark ? 1 : 0.04;
        default:
          return 1;
      }
    };
    const L = new Float32Array(N);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const id = ids[p];
        if (id === 0) {
          L[p] = skyTone(x, y);
          continue;
        }
        const l = clamp01((lit[p] - dim) / (bright - dim));
        let tone: number;
        if (id === 1) {
          const far = (dep[p] - groundNear) / groundSpan;
          if (a.ground === 'white') tone = clamp01(l * 1.25 + 0.14);
          else if (a.ground === 'strokes') tone = Math.min(clamp01(l * 1.2 + 0.1), mix(0.4, 0.99, smooth(0, 1, far)));
          // A solid ground keeps a few hairline gouges whatever the carving, thinning toward the front;
          // cast shadows stay solid.
          else if (dark) tone = Math.min(0.21 + far * 0.1, l * 1.2 + 0.08);
          else tone = Math.min(keySolid + 0.055 + far * 0.07, l * 1.2 + 0.08);
        } else {
          tone = l * (0.3 + 0.7 * Math.sqrt(lum[p]));
          if (confidence && id >= 3) tone += (1 - (confidence[id] ?? 1)) * 0.25;
        }
        L[p] = dark ? 1 - clamp01(tone) : clamp01(tone);
      }
    await pause();

    // Spot colour: which pixels the warm block covers (a majority vote keeps it to whole shapes).
    let warm: Uint8Array | null = null;
    if (spot) {
      const field = new Float32Array(N);
      for (let p = 0; p < N; p++) {
        if (ids[p] === 0) continue;
        const o = p * 4;
        const r = color[o], g = color[o + 1], b = color[o + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        if (d < 36) continue;
        const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        if (hue < 1.25 || hue > 5.6) field[p] = 1;
      }
      const sum = new Float32Array(N);
      for (let pass = 0; pass < 2; pass++) {
        const step = pass === 0 ? 1 : size;
        const src = pass === 0 ? field : sum, dst = pass === 0 ? sum : field;
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++) {
            const p = y * size + x, id = ids[p];
            const along = pass === 0 ? x : y;
            let total = 0, n = 0;
            for (let k = -3; k <= 3; k++) {
              const at = along + k;
              if (at < 0 || at >= size) continue;
              const q = p + k * step;
              if (ids[q] !== id) continue;
              total += src[q];
              n++;
            }
            dst[p] = n ? total / n : 0;
          }
      }
      warm = new Uint8Array(N);
      for (let p = 0; p < N; p++) warm[p] = field[p] > 0.5 ? 1 : 0;
      await pause();
    }

    // ── 3. The gouges: strokes traced along the form and stamped into a distance field ───────
    const S = mix(5, 12, a.gouge);
    const halfThing = S * 0.62, halfGround = S * 1.3 * 0.62, halfSky = S * 1.7 * 0.62;
    const skyGouged = a.sky === 'lines' || a.sky === 'rays';
    const halfFor = (id: number) => (id === 0 ? halfSky : id === 1 ? halfGround : halfThing);
    const wobble = mix(0.1, 0.75, mood.energy);
    const objAngle = new Float32Array(256);
    for (let id = 0; id < 256; id++) objAngle[id] = -0.55 + (hash(id, 7, seed) - 0.5) * 0.7;
    const D = new Float32Array(N).fill(1e3);
    const dirAt = (p: number, x: number, y: number, out: [number, number]) => {
      const id = ids[p];
      if (id === 0) {
        if (a.sky === 'rays') {
          const dx = x - sunX, dy = y - sunY, n = Math.hypot(dx, dy) || 1;
          out[0] = dx / n; out[1] = dy / n;
        } else {
          const angle = 0.2 * Math.sin(x / 80 + y / 45 + seed % 7);
          out[0] = Math.cos(angle); out[1] = Math.sin(angle);
        }
        return;
      }
      if (id === 1) {
        const angle = (vnoise(x / 90, y / 50, seed + 21) - 0.5) * 0.5;
        out[0] = Math.cos(angle); out[1] = Math.sin(angle);
        return;
      }
      const nx = normal[p * 4] / 127.5 - 1, ny = -(normal[p * 4 + 1] / 127.5 - 1);
      const flat = Math.hypot(nx, ny);
      const a0 = objAngle[id];
      const fx = Math.cos(a0), fy = Math.sin(a0);
      let tx = 0, ty = 0;
      if (flat > 1e-3) {
        tx = -ny / flat; ty = nx / flat;
        if (tx < 0 || (tx === 0 && ty < 0)) { tx = -tx; ty = -ty; }
      }
      const w = smooth(0.12, 0.5, flat);
      let dx = mix(fx, tx, w), dy = mix(fy, ty, w);
      const n = Math.hypot(dx, dy);
      if (n < 1e-3) { dx = fx; dy = fy; } else { dx /= n; dy /= n; }
      out[0] = dx; out[1] = dy;
    };
    const STEP = 0.75;
    const dir: [number, number] = [0, 0];
    const points: number[] = [];
    const gather = (x0: number, y0: number, id: number, sign: number, half: number, into: number[]) => {
      let x = x0, y = y0;
      const p0 = (y0 | 0) * size + (x0 | 0);
      dirAt(p0, x0, y0, dir);
      let pdx = dir[0] * sign, pdy = dir[1] * sign;
      for (let s = 0; s < half; s += STEP) {
        const xi = x | 0, yi = y | 0;
        if (!inPlate(xi, yi)) break;
        const p = yi * size + xi;
        if (ids[p] !== id) break;
        dirAt(p, x, y, dir);
        let dx = dir[0], dy = dir[1];
        if (dx * pdx + dy * pdy < 0) { dx = -dx; dy = -dy; }
        // Rays are cut straight from the sun; everything else wanders with the hand.
        const w = (vnoise(x / 9, y / 9, seed + 31) - 0.5) * wobble * (id === 0 && a.sky === 'rays' ? 0.25 : 1);
        const c = Math.cos(w), sn = Math.sin(w);
        const rx = dx * c - dy * sn, ry = dx * sn + dy * c;
        into.push(x, y, rx, ry);
        x += rx * STEP; y += ry * STEP;
        pdx = rx; pdy = ry;
      }
    };
    const back: number[] = [];
    const trace = (x0: number, y0: number, id: number, length: number, maxHalf: number, salt: number) => {
      points.length = 0;
      back.length = 0;
      gather(x0, y0, id, -1, length / 2, back);
      for (let i = back.length - 4; i >= 4; i -= 4) points.push(back[i], back[i + 1], back[i + 2], back[i + 3]);
      gather(x0, y0, id, 1, length / 2, points);
      const n = points.length / 4;
      if (n < 4) return;
      const R = Math.ceil(maxHalf * 1.15 + 1);
      for (let i = 0; i < n; i++) {
        const s = i / (n - 1);
        const x = points[i * 4], y = points[i * 4 + 1], dx = points[i * 4 + 2], dy = points[i * 4 + 3];
        const profile = Math.pow(Math.sin(Math.PI * s), 0.5) * (0.72 + 0.56 * vnoise(x / 11, y / 11, salt));
        if (profile < 0.04) continue;
        for (let t = -R; t <= R; t++) {
          const qx = Math.round(x - dy * t), qy = Math.round(y + dx * t);
          if (qx < 0 || qy < 0 || qx >= size || qy >= size) continue;
          const q = qy * size + qx;
          if (ids[q] !== id) continue;
          const e = Math.abs(t) / profile;
          if (e < D[q]) D[q] = e;
        }
      }
    };
    const seedStrokes = (kind: 'thing' | 'ground' | 'sky', sx: number, sy: number, length: number, maxHalf: number) => {
      const salt = seed + (kind === 'thing' ? 41 : kind === 'ground' ? 43 : 47);
      for (let gy = mT; gy < mB; gy += sy)
        for (let gx = mL; gx < mR; gx += sx) {
          const x = gx + (rnd() - 0.5) * sx * 0.9, y = gy + (rnd() - 0.5) * sy * 0.9;
          const xi = x | 0, yi = y | 0;
          if (!inPlate(xi, yi)) continue;
          const p = yi * size + xi;
          const id = ids[p];
          if (kind === 'thing' ? id < 2 : kind === 'ground' ? id !== 1 : id !== 0) continue;
          if (D[p] < Math.min(sx, sy) * 0.45) continue;
          trace(x, y, id, length * (0.5 + rnd() * 1.1), maxHalf, salt);
        }
    };
    seedStrokes('thing', S, S, mix(16, 44, a.gouge), halfThing);
    await pause();
    seedStrokes('ground', S * 1.3 * 3, S * 1.3, mix(50, 130, a.gouge), halfGround);
    if (skyGouged) seedStrokes('sky', S * 1.7 * (a.sky === 'rays' ? 1 : 6), S * 1.7, a.sky === 'rays' ? size : mix(120, 320, a.gouge), halfSky);
    await pause();

    // ── 4. Lines: the key line around forms, the halo against solid ground, the plate edge ───
    const haloSky = dark ? a.sky === 'white' || a.sky === 'solid' || a.sky === 'night' : a.sky === 'solid' || a.sky === 'night';
    const haloGround = dark ? a.ground === 'white' || a.ground === 'solid' : a.ground === 'solid';
    const lineW = a.edges === 'white' ? mix(1.3, 2.4, a.gouge) : mix(1.1, 2.5, a.gouge) * mix(1.15, 0.8, a.carve);
    const haloW = 1.8 + S * 0.08;
    const paperAt = keyClear - 0.04;
    const reach = new Float32Array(N).fill(1e4);
    const haloReach = new Float32Array(N).fill(1e4);
    // Creases across an inked ground (a plinth's rim, a kerb) are cut as a white line, or they vanish.
    const creaseReach = new Float32Array(N).fill(1e4);
    const groundInked = keySolid + 0.15;
    const pws = capture.pixelWorldSize / Math.max(1e-6, capture.far - capture.near);
    for (let y = mT; y < mB - 1; y++)
      for (let x = mL; x < mR - 1; x++) {
        const p = y * size + x;
        let strength = 0;
        let crease = 0;
        let halo = false;
        for (let side = 0; side < 2; side++) {
          const step = side === 0 ? 1 : size;
          const q = p + step;
          const ia = ids[p], ib = ids[q];
          if (ia !== ib) {
            if (a.edges === 'none') {
              // No outline, except a hairline where two areas of bare paper would otherwise merge.
              if (L[p] > paperAt && L[q] > paperAt) strength = Math.max(strength, 0.6);
            } else strength = Math.max(strength, ia < 2 && ib < 2 ? 0.75 : 1);
            const thingA = ia >= 2, thingB = ib >= 2;
            if (thingA !== thingB) {
              const other = thingA ? ib : ia;
              if ((other === 0 && haloSky) || (other === 1 && haloGround)) halo = true;
            }
            continue;
          }
          if (ia === 0) continue;
          const solidGround = ia === 1 && L[p] < groundInked && L[q] < groundInked;
          if (a.edges === 'none' && !solidGround) continue;
          const bend = Math.abs(dep[p - step] - 2 * dep[p] + dep[q]);
          const dot =
            ((normal[p * 4] - 127.5) * (normal[q * 4] - 127.5) +
              (normal[p * 4 + 1] - 127.5) * (normal[q * 4 + 1] - 127.5) +
              (normal[p * 4 + 2] - 127.5) * (normal[q * 4 + 2] - 127.5)) / 16256;
          if (solidGround) {
            if (dot < 0.72 || bend > pws * 2.5) crease = Math.max(crease, a.edges === 'none' ? 0.55 : 0.8);
            continue;
          }
          if (bend > pws * 2.5) strength = Math.max(strength, 0.85);
          if (dot < 0.72) strength = Math.max(strength, ia === 1 ? 0.45 : 0.65);
        }
        if (halo) haloReach[p] = -haloW;
        const jitter = 0.85 + 0.3 * vnoise(x / 17, y / 17, seed + 53);
        if (strength > 0) reach[p] = Math.min(reach[p], -lineW * strength * jitter);
        if (crease > 0) creaseReach[p] = -mix(1.1, 2, a.gouge) * crease * jitter;
      }
    const chamfer = (field: Float32Array) => {
      const D2 = Math.SQRT2;
      for (let y = 1; y < size - 1; y++)
        for (let x = 1; x < size - 1; x++) {
          const p = y * size + x;
          field[p] = Math.min(field[p], field[p - 1] + 1, field[p - size] + 1, field[p - size - 1] + D2, field[p - size + 1] + D2);
        }
      for (let y = size - 2; y > 0; y--)
        for (let x = size - 2; x > 0; x--) {
          const p = y * size + x;
          field[p] = Math.min(field[p], field[p + 1] + 1, field[p + size] + 1, field[p + size + 1] + D2, field[p + size - 1] + D2);
        }
    };
    chamfer(reach);
    chamfer(haloReach);
    chamfer(creaseReach);
    await pause();

    const inkLine = new Float32Array(N);
    const cut = new Float32Array(N);
    // The knife-cut rim of the block catches the roller in long runs that come and go, heavier
    // on an over-inked pull, barely there on a clean one.
    const rimAmount = a.proof === 'heavy' ? 1 : a.proof === 'clean' ? 0.35 : 0.75;
    for (let y = mT; y < mB; y++)
      for (let x = mL; x < mR; x++) {
        const p = y * size + x;
        const line = clamp01(0.5 - reach[p]);
        const halo = ids[p] < 2 ? clamp01(0.5 - haloReach[p]) : 0;
        const lineIsInk = a.edges === 'none' || (a.edges === 'black') !== dark;
        if (lineIsInk) inkLine[p] = line;
        else cut[p] = line;
        if (dark) inkLine[p] = Math.max(inkLine[p], halo);
        else cut[p] = Math.max(cut[p], halo);
        cut[p] = Math.max(cut[p], clamp01(0.5 - creaseReach[p]));
        const toEdge = Math.min(x - mL, mR - 1 - x, y - mT, mB - 1 - y);
        if (toEdge < 4) {
          const along = toEdge === x - mL || toEdge === mR - 1 - x ? y : x;
          const side = toEdge === x - mL ? 1 : toEdge === mR - 1 - x ? 2 : toEdge === y - mT ? 3 : 4;
          const present = smooth(0.32, 0.5, vnoise(along / 70, side * 9, seed + 59));
          const width = 0.5 + 2.2 * vnoise(along / 21, side * 5, seed + 131) * (0.6 + 0.4 * vnoise(along / 4, side, seed + 137));
          inkLine[p] = Math.max(inkLine[p], clamp01(width - toEdge) * present * rimAmount);
        }
      }

    // ── 5. Flaws: chips, cracks and lost corners in the block; a moon and stars in the sky ──
    const glow = new Float32Array(N);
    const blob = (cx: number, cy: number, r: number, into: Float32Array, rag: number, onlySky: boolean) => {
      const x0 = Math.max(0, Math.floor(cx - r * 1.5)), x1 = Math.min(size - 1, Math.ceil(cx + r * 1.5));
      const y0 = Math.max(0, Math.floor(cy - r * 1.5)), y1 = Math.min(size - 1, Math.ceil(cy + r * 1.5));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if (!inPlate(x, y)) continue;
          const p = y * size + x;
          if (onlySky && ids[p] !== 0) continue;
          const edge = r * (1 - rag + rag * 2 * vnoise(x / 3, y / 3, seed + 61));
          const v = clamp01(edge - Math.hypot(x - cx, y - cy) + 0.5);
          if (v > into[p]) into[p] = v;
        }
    };
    const scratch = (x: number, y: number, angle: number, length: number, width: number, into: Float32Array) => {
      for (let s = 0; s < length; s++) {
        angle += (rnd() - 0.5) * 0.6;
        x += Math.cos(angle); y += Math.sin(angle);
        const xi = Math.round(x), yi = Math.round(y);
        if (!inPlate(xi, yi)) return;
        const w = width * (0.6 + 0.8 * Math.sin((s / length) * Math.PI));
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const qx = xi + dx, qy = yi + dy;
            if (!inPlate(qx, qy)) continue;
            const v = clamp01(w - Math.hypot(dx, dy) + 0.5);
            const q = qy * size + qx;
            if (v > into[q]) into[q] = v;
          }
      }
    };
    const chipped = a.proof === 'chipped';
    const chips = (chipped ? 16 : 0) + Math.round(mood.wear * 12);
    for (let i = 0; i < chips; i++) blob(mix(mL, mR, rnd()), mix(mT, mB, rnd()), 1.5 + rnd() * (chipped ? 5 : 3), cut, 0.45, false);
    const cracks = (chipped ? 2 + Math.floor(rnd() * 2) : 0) + (mood.wear > 0.7 ? 1 : 0);
    for (let i = 0; i < cracks; i++) {
      const fromLeft = rnd() < 0.5;
      const x = fromLeft ? mL + 1 : mR - 2, y = mix(mT, mB, 0.15 + rnd() * 0.7);
      scratch(x, y, fromLeft ? (rnd() - 0.5) * 0.8 : Math.PI + (rnd() - 0.5) * 0.8, 50 + rnd() * 160, 0.9 + rnd() * 0.6, cut);
    }
    if (chipped) {
      const corners = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < corners; i++) {
        const cx = rnd() < 0.5 ? mL : mR - 1, cy = rnd() < 0.5 ? mT : mB - 1;
        const cutSize = size * (0.03 + rnd() * 0.05);
        for (let y = mT; y < mB; y++)
          for (let x = mL; x < mR; x++) {
            const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
            if (dx + dy > cutSize * 1.5) continue;
            const edge = cutSize * (0.8 + 0.4 * vnoise(x / 6, y / 6, seed + 67));
            const v = clamp01(edge - (dx + dy) + 0.5);
            const p = y * size + x;
            if (v > cut[p]) cut[p] = v;
          }
      }
    }
    if (a.sky === 'rays') {
      // A cut line around the sun, so the disc reads against the burst.
      const rPx = sunR * size * 0.5;
      const x0 = Math.max(0, Math.floor(sunX - rPx - 4)), x1 = Math.min(size - 1, Math.ceil(sunX + rPx + 4));
      const y0 = Math.max(0, Math.floor(sunY - rPx - 4)), y1 = Math.min(size - 1, Math.ceil(sunY + rPx + 4));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if (!inPlate(x, y)) continue;
          const p = y * size + x;
          if (ids[p] !== 0) continue;
          const ring = clamp01(1.5 - Math.abs(Math.hypot(x - sunX, y - sunY) - rPx - 1.2));
          if (ring <= 0) continue;
          if (dark) cut[p] = Math.max(cut[p], ring);
          else inkLine[p] = Math.max(inkLine[p], ring);
        }
    }
    if (a.sky === 'night') {
      const moonR = size * (0.035 + rnd() * 0.03);
      const [moonX, moonY] = placeInSky(0.1, 0.28, moonR);
      blob(moonX, moonY, moonR, glow, 0.03, true);
      if (rnd() < 0.45) {
        // A crescent: the shadow disc is punched back out of the moon.
        const shade = new Float32Array(N);
        blob(moonX + moonR * 0.5 * (rnd() < 0.5 ? -1 : 1), moonY - moonR * 0.25, moonR * 0.92, shade, 0.03, true);
        for (let p = 0; p < N; p++) if (shade[p] > 0) glow[p] = Math.max(0, glow[p] - shade[p]);
      }
      const stars = 50 + Math.floor(rnd() * 120);
      for (let i = 0; i < stars; i++) {
        const x = mix(mL, mR, rnd()), y = mix(mT, mB, rnd() * 0.75);
        const r = 0.6 + rnd() * 1.3;
        blob(x, y, r, glow, 0.1, true);
        if (rnd() < 0.08) {
          const arm = 3 + rnd() * 4;
          scratch(x - arm, y, 0, arm * 2, 0.6, glow);
          scratch(x, y - arm, Math.PI / 2, arm * 2, 0.6, glow);
        }
      }
      for (let p = 0; p < N; p++)
        if (glow[p] > 0 && ids[p] === 0) {
          if (dark) inkLine[p] = Math.max(inkLine[p], glow[p]);
          else cut[p] = Math.max(cut[p], glow[p]);
        }
    }
    await pause();

    // ── 6. Paper ─────────────────────────────────────────────────────────────────────────────
    const sheet = new Float32Array(N);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let tone = 1 + 0.035 * (vnoise(x / 2.3, y / 2.3, seed + 71) - 0.5) + paperSpec.mottle * (vnoise(x / 38, y / 38, seed + 73) - 0.5) * 2 + 0.025 * (hash(x, y, seed + 75) - 0.5);
        if (paperSpec.specks && hash(x, y, seed + 77) < 0.0025 * paperSpec.specks) tone -= 0.3;
        // The pressed edge of the plate: a shadow outside it, a slight polish inside.
        const toEdge = Math.min(x - mL, mR - 1 - x, y - mT, mB - 1 - y);
        if (toEdge < 0 && toEdge > -3) tone *= x >= mR || y >= mB ? 0.95 : 0.985;
        else if (toEdge >= 0 && toEdge < 2) tone *= 1.025;
        sheet[y * size + x] = tone;
      }
    const fibres = Math.round(520 * paperSpec.fibre);
    for (let f = 0; f < fibres; f++) {
      let x = rnd() * size, y = rnd() * size, angle = rnd() * Math.PI * 2;
      const tone = rnd() < 0.6 ? 0.04 : -0.05, length = 10 + rnd() * 34;
      for (let s = 0; s < length; s++) {
        const xi = x | 0, yi = y | 0;
        if (xi >= 0 && xi < size && yi >= 0 && yi < size) sheet[yi * size + xi] += tone;
        angle += (rnd() - 0.5) * 0.35;
        x += Math.cos(angle);
        y += Math.sin(angle);
      }
    }
    let fox: Float32Array | null = null;
    if (mood.wear > 0.45 && !dark) {
      fox = new Float32Array(N);
      const spots = 4 + Math.round(mood.wear * 18);
      for (let i = 0; i < spots; i++) {
        const cx = rnd() * size, cy = rnd() * size, r = 3 + rnd() * 12;
        for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(size - 1, Math.ceil(cy + r)); y++)
          for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(size - 1, Math.ceil(cx + r)); x++) {
            const d = Math.hypot(x - cx, y - cy) / r;
            const v = smooth(1, 0.2, d) * (0.5 + 0.5 * vnoise(x / 4, y / 4, seed + 79)) * 0.7;
            const p = y * size + x;
            if (v > fox[p]) fox[p] = v;
          }
      }
    }
    await pause();

    // ── 7. Pull the print: each block inked, offset and laid down in turn ────────────────────
    interface Block { ink: RGB; solid: number; clear: number; opacity: number; ox: number; oy: number; salt: number; role: 'light' | 'mid' | 'key' }
    const midSolid = keyClear - 0.1, midClear = Math.min(1, keyClear + 0.2);
    const lightSolid = midClear - 0.08, lightClear = Math.min(1.03, midClear + 0.16);
    const slipOf = (): [number, number] => {
      const angle = rnd() * Math.PI * 2;
      const reach = (a.proof === 'slipped' ? 3.5 + rnd() * 4 : 0.5 + rnd() * 1.3) * (1 + mood.wear * 0.8);
      return [Math.cos(angle) * reach, Math.sin(angle) * reach];
    };
    const colourOpacity = 0.9;
    const keyOpacity = a.proof === 'heavy' ? 1 : a.proof === 'dry' ? 0.9 : 0.95;
    const blockList: Block[] = [];
    if (blocks === 3) {
      const [ox, oy] = slipOf();
      blockList.push({ ink: lightInk, solid: lightSolid, clear: lightClear, opacity: colourOpacity, ox, oy, salt: seed + 83, role: 'light' });
    }
    if (blocks >= 2) {
      const [ox, oy] = slipOf();
      blockList.push({ ink: midInk, solid: midSolid, clear: midClear, opacity: colourOpacity, ox, oy, salt: seed + 89, role: 'mid' });
    }
    blockList.push({ ink: keyInk, solid: keySolid, clear: keyClear, opacity: keyOpacity, ox: 0, oy: 0, salt: seed + 97, role: 'key' });

    // A dry pull is the key running out; the colour blocks were rolled fresh and only wear thins them.
    const dryColour = Math.min(1, 0.2 + mood.wear * 0.25);
    const dryKey = Math.min(1, (a.proof === 'dry' ? 0.75 : 0.2) + mood.wear * 0.25);
    const pin = (a.proof === 'dry' ? 0.012 : 0.004) + mood.wear * 0.02;
    const widthAdjust = a.proof === 'heavy' ? -0.6 : a.proof === 'dry' ? 0.3 : 0;
    // The brayer travels up the block, a little off square. It leaves streaks along its travel,
    // a faint lap line each time it comes round, and where the film ran thin a fine salty
    // breakup of the solid: the paper's tooth showing through, worst on a dry or worn pull.
    const rollAngle = (rnd() - 0.5) * 0.3;
    const rc = Math.cos(rollAngle), rs = Math.sin(rollAngle);
    const lapLength = mix(150, 230, rnd());
    const roller = (x: number, y: number, salt: number, dry: number, colour: boolean) => {
      const u = x * rc + y * rs, v = -x * rs + y * rc;
      const band = vnoise(u / 30, v / 260, salt) - 0.5;
      const lapPhase = (((v + hash(salt, 1, 2) * lapLength) % lapLength) + lapLength) % lapLength;
      const lap = Math.exp(-lapPhase * 0.35) * (0.5 + vnoise(u / 25, 3, salt + 5));
      const patch = vnoise(x / 28, y / 28, salt + 1) * 0.6 + vnoise(x / 9, y / 9, salt + 2) * 0.25 + band * 0.5 + 0.075;
      const thin = smooth(0.6 - dry * 0.28, 0.98 - dry * 0.2, patch);
      let ink = 1 - band * ((colour ? 0.22 : 0.08) + dry * 0.12) - thin * (0.05 + dry * 0.1) - lap * (colour ? 0.12 : 0.05);
      const tooth = hash(x, y, salt + 3) * 0.55 + vnoise(x / 1.7, y / 1.7, salt + 6) * 0.45;
      if (tooth < thin * (0.06 + dry * 0.26) + dry * 0.02) ink *= 0.2;
      if (hash(x, y, salt + 4) < pin) ink *= 0.25;
      return clamp01(ink);
    };
    // Chatter: the cleared ground of a block is never quite flat. Ridges left between the broad
    // clearing strokes catch the roller and print as broken parallel lines, mostly toward the rim.
    const chatterAmount = clamp01(
      (a.proof === 'clean' ? 0.3 : a.proof === 'chipped' || a.proof === 'artist' ? 0.95 : 0.65) * (0.6 + 0.8 * mood.wear) * mix(0.75, 1.15, a.gouge),
    );
    const chatterAngle = rnd() * Math.PI;
    const ridgeGap = S * 2.6;
    const chatterAt = (x: number, y: number) => {
      const dl = x - mL, dr = mR - 1 - x, dt = y - mT, db = mB - 1 - y;
      const toEdge = Math.min(dl, dr, dt, db);
      const nearEdge = (1 - smooth(4, 64, toEdge)) * smooth(0.38, 0.6, vnoise(x / 34, y / 34, seed + 101));
      const scatter = smooth(0.74, 0.88, vnoise(x / 60, y / 60, seed + 103)) * 0.7;
      const where = Math.max(nearEdge, scatter) * chatterAmount;
      if (where < 0.04) return 0;
      // Along the rim the clearing strokes ran with the edge; in the open they sweep at random.
      const angle = nearEdge > scatter
        ? (toEdge === dl || toEdge === dr ? Math.PI / 2 : 0) + (vnoise(x / 90, y / 90, seed + 107) - 0.5) * 0.3
        : chatterAngle + (vnoise(x / 150, y / 150, seed + 107) - 0.5) * 1.4;
      const c = Math.cos(angle), s = Math.sin(angle);
      const along = x * c + y * s, across = -x * s + y * c;
      const phase = across / ridgeGap + (vnoise(along / 45, across / ridgeGap, seed + 109) - 0.5) * 0.5;
      const ridge = Math.round(phase);
      const off = Math.abs(phase - ridge) * ridgeGap;
      const width = 0.35 + 1.1 * vnoise(along / 8, ridge * 1.7, seed + 113);
      const broken = smooth(0.48, 0.62, vnoise(along / 16, ridge * 3.1, seed + 127));
      return clamp01(width - off + 0.5) * broken * where;
    };
    const squash = a.proof === 'heavy';

    const pixels = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < size; y++) {
      if (y % 60 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const grain = sheet[p];
        let r = paper[0] * grain, g = paper[1] * grain, b = paper[2] * grain;
        if (fox && fox[p] > 0) {
          const f = fox[p];
          r *= 1 - 0.06 * f; g *= 1 - 0.14 * f; b *= 1 - 0.26 * f;
        }
        if (inPlate(x, y)) {
          const inkGrain = 0.94 + 0.06 * grain;
          for (const block of blockList) {
            const qx = Math.max(0, Math.min(size - 1, Math.round(x - block.ox)));
            const qy = Math.max(0, Math.min(size - 1, Math.round(y - block.oy)));
            const q = qy * size + qx;
            const id = ids[q];
            if (warm && block.role !== 'key') {
              if (block.role === 'light' && !warm[q]) continue;
              if (block.role === 'mid' && warm[q]) continue;
            }
            const f = smooth(block.solid, block.clear, L[q]);
            let cov: number;
            // Bare paper (a white sky, a lit white ground, a pure highlight) takes no block at all,
            // except where the key's cleared ground chatters.
            if (f >= 0.97 || L[q] >= 0.995) cov = block.role === 'key' && id <= 1 ? chatterAt(x, y) * 0.85 : 0;
            else if (f <= 0.002) cov = 1;
            else {
              const halfW = f * halfFor(id) + widthAdjust;
              cov = 1 - clamp01(halfW - D[q] + 0.5);
            }
            if (cov > 0) cov *= roller(x, y, block.salt, block.role === 'key' ? dryKey : dryColour, block.role !== 'key');
            if (block.role === 'key') cov = Math.max(cov, inkLine[p]);
            cov *= 1 - cut[p];
            if (cov <= 0.003) continue;
            let [ir, ig, ib] = block.ink;
            if (squash && block.role === 'key' && f > 0.002 && f < 0.97) {
              // Ink squeezed up against the edge of a gouge sits thicker and darker.
              const rim = clamp01(1 - (D[q] - f * halfFor(id)) / 1.6) * 0.16;
              ir *= 1 - rim; ig *= 1 - rim; ib *= 1 - rim;
            }
            const k = cov * block.opacity;
            r = mix(r, ir * inkGrain, k);
            g = mix(g, ig * inkGrain, k);
            b = mix(b, ib * inkGrain, k);
          }
        }
        const o = p * 4;
        pixels[o] = r; pixels[o + 1] = g; pixels[o + 2] = b; pixels[o + 3] = 255;
      }
    }

    // ── 8. Pencil under an artist's proof: edition, title and signature as scrawl ───────────
    if (wide) {
      const graphite: RGB = dark ? [200, 196, 190] : [92, 90, 88];
      const pencil = (x0: number, y0: number, x1: number, y1: number, alpha: number) => {
        const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const qx = Math.round(x) + dx, qy = Math.round(y) + dy;
              if (qx < 0 || qy < 0 || qx >= size || qy >= size) continue;
              const cover = clamp01(0.75 - Math.hypot(qx - x, qy - y) + 0.5) * alpha;
              if (cover <= 0) continue;
              const o = (qy * size + qx) * 4;
              pixels[o] = mix(pixels[o], graphite[0], cover);
              pixels[o + 1] = mix(pixels[o + 1], graphite[1], cover);
              pixels[o + 2] = mix(pixels[o + 2], graphite[2], cover);
            }
        }
      };
      const baseline = mB + (size - mB) * 0.42;
      const glyphs = (x: number, count: number, height: number) => {
        for (let gIndex = 0; gIndex < count; gIndex++) {
          let px = x, py = baseline - rnd() * height * 0.3;
          const strokes = 2 + Math.floor(rnd() * 3);
          for (let s = 0; s < strokes; s++) {
            const nx = x + rnd() * height * 0.7, ny = baseline - rnd() * height;
            pencil(px, py, nx, ny, 0.5);
            px = nx; py = ny;
          }
          x += height * 0.75 + rnd() * 3;
        }
        return x;
      };
      let x = mL + 2;
      x = glyphs(x, 1 + Math.floor(rnd() * 2), 11);
      pencil(x + 1, baseline - 9, x + 6, baseline + 1, 0.5);
      glyphs(x + 8, 2, 11);
      glyphs(mix(mL, mR, 0.36) + rnd() * 20, 5 + Math.floor(rnd() * 6), 10);
      // A signature: one looping line.
      let sx = mix(mL, mR, 0.68) + rnd() * 20, sy = baseline - 2;
      const loops = 10 + Math.floor(rnd() * 8);
      for (let i = 0; i < loops; i++) {
        const nx = sx + 4 + rnd() * 7, ny = baseline - rnd() * 14 + (i % 3 === 0 ? 4 : 0);
        pencil(sx, sy, nx, ny, 0.55);
        sx = nx; sy = ny;
      }
    }

    const edgeNote = a.edges === 'black' ? 'a dark key line' : a.edges === 'white' ? 'a carved white line' : 'no outline';
    return {
      pixels,
      notes: [
        `${inkSpec.name}, ${blocks} ${blocks === 1 ? 'block' : 'blocks'} on ${paperSpec.name}`,
        `${a.gouge < 0.33 ? 'fine' : a.gouge < 0.66 ? 'medium' : 'broad'} gouges, ${a.carve < 0.33 ? 'heavily inked' : a.carve < 0.66 ? 'balanced' : 'lightly carved'}, ${edgeNote}`,
        `sky ${a.sky}, ground ${a.ground}, ${a.proof === 'artist' ? "artist's proof" : a.proof === 'clean' ? 'a clean impression' : `${a.proof} impression`}`,
      ],
    };
  },
});
