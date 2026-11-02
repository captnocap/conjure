import { type Palette, type PaletteRole, choice, clamp01, defineLook, mix, rekey, score, seeded } from '@conjure/kit';

/**
 * Shadow theatre: the frame played as a puppet show behind a lit screen.
 *
 * The capture is laid into the screen's window. Every placed thing becomes a puppet: it is split
 * into leather pieces by colour, each piece takes one of the tradition's few dyes, is carved with
 * lace-like holes (oriented and foreshortened by the piece's normal), outlined, and pinned at its
 * joints with rivets. Sharp folds in the normals and jumps in depth are carved as cut lines, so a
 * box still reads as a box. The place is never dropped: the set and the ground are cut as scenery
 * flats along their real edges (colour, fold or depth breaks), in a paler second tone, as open line,
 * soft held-back shadow, or perforated leather. Each puppet's lines, lace, rivets and rods are sized
 * to its extent on screen, and a small one is enlarged from its foot. The identity pass already
 * holds the nearest surface at every pixel, so overlapping puppets keep the nearest in front with
 * a contact shadow, instead of multiplying into black. The plain-lit pass gives dye density and
 * the gilding's light; the key light places a side lamp and the direction ghosts fall.
 */

type RGB = [number, number, number];
type Ctx = CanvasRenderingContext2D;
type Tradition = 'piying' | 'wayang' | 'karagoz' | 'film';
type Pattern = 'none' | 'dots' | 'flowers' | 'clouds' | 'lattice' | 'ice' | 'lines' | 'stars' | 'lace' | 'rows';

const TAU = Math.PI * 2;
const DRESS = 255;
const FAR = 1e6;

const hex = (value: string): RGB => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16) / 255) as RGB;
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const luma = (c: RGB) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
const cover = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);

function toHsl([r, g, b]: RGB): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-5) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

function saturate(c: RGB, amount: number): RGB {
  const y = luma(c);
  return [Math.max(0, y + (c[0] - y) * amount), Math.max(0, y + (c[1] - y) * amount), Math.max(0, y + (c[2] - y) * amount)];
}

function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1;
}

const fbm = (x: number, y: number, seed: number) =>
  valueNoise(x, y, seed) * 0.55 + valueNoise(x * 2.1, y * 2.1, seed + 7) * 0.3 + valueNoise(x * 4.3, y * 4.3, seed + 13) * 0.15;

/** Box blur, in place, `passes` times. Edges clamp. */
function blur(field: Float32Array, size: number, radius: number, passes: number, scratch: Float32Array) {
  radius = Math.round(radius);
  if (radius < 1) return;
  const window = radius * 2 + 1;
  const line = new Float32Array(size + window + 1);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < size; y++) {
      const row = y * size;
      let sum = 0;
      line[0] = 0;
      for (let i = -radius; i < size + radius; i++) {
        sum += field[row + (i < 0 ? 0 : i >= size ? size - 1 : i)];
        line[i + radius + 1] = sum;
      }
      for (let x = 0; x < size; x++) scratch[row + x] = (line[x + window] - line[x]) / window;
    }
    for (let x = 0; x < size; x++) {
      let sum = 0;
      line[0] = 0;
      for (let i = -radius; i < size + radius; i++) {
        sum += scratch[(i < 0 ? 0 : i >= size ? size - 1 : i) * size + x];
        line[i + radius + 1] = sum;
      }
      for (let y = 0; y < size; y++) field[y * size + x] = (line[y + window] - line[y]) / window;
    }
  }
}

/** Chamfer distance from seed pixels, travelling only through pixels of the same region label. */
function chamfer(region: Int32Array, seeds: Uint8Array, size: number, out: Float32Array) {
  const E = Math.SQRT2;
  const n = size * size;
  for (let p = 0; p < n; p++) out[p] = region[p] < 0 || seeds[p] ? 0 : FAR;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      let d = out[p];
      if (d === 0) continue;
      const r = region[p];
      if (x > 0 && region[p - 1] === r && out[p - 1] + 1 < d) d = out[p - 1] + 1;
      if (y > 0) {
        const q = p - size;
        if (region[q] === r && out[q] + 1 < d) d = out[q] + 1;
        if (x > 0 && region[q - 1] === r && out[q - 1] + E < d) d = out[q - 1] + E;
        if (x < size - 1 && region[q + 1] === r && out[q + 1] + E < d) d = out[q + 1] + E;
      }
      out[p] = d;
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const p = y * size + x;
      let d = out[p];
      if (d === 0) continue;
      const r = region[p];
      if (x < size - 1 && region[p + 1] === r && out[p + 1] + 1 < d) d = out[p + 1] + 1;
      if (y < size - 1) {
        const q = p + size;
        if (region[q] === r && out[q] + 1 < d) d = out[q] + 1;
        if (x < size - 1 && region[q + 1] === r && out[q + 1] + E < d) d = out[q + 1] + E;
        if (x > 0 && region[q - 1] === r && out[q - 1] + E < d) d = out[q - 1] + E;
      }
      out[p] = d;
    }
}

/** Signed distance to the nearest carved hole of a pattern, in pixels: negative inside a hole. */
function patternSdf(kind: Pattern, u: number, v: number, s: number, h: number): number {
  switch (kind) {
    case 'dots': {
      // Fish-roe: staggered round holes.
      const rowH = s * 0.866;
      const row = Math.round(v / rowH);
      const off = row & 1 ? s * 0.5 : 0;
      const cu = Math.round((u - off) / s) * s + off;
      return Math.hypot(u - cu, v - row * rowH) - s * 0.2 * h;
    }
    case 'flowers': {
      // Five-petalled rosettes, the petals cut and the hearts left.
      const P = s * 2.3;
      const row = Math.round(v / P);
      const off = row & 1 ? P * 0.5 : 0;
      const du = u - (Math.round((u - off) / P) * P + off);
      const dv = v - row * P;
      const r = Math.hypot(du, dv);
      const sector = TAU / 5;
      const th = Math.atan2(dv, du) + (row & 1 ? sector / 2 : 0);
      const phi = th - Math.round(th / sector) * sector;
      const a = P * 0.15 * h;
      const b = P * 0.085 * h;
      const px = r * Math.cos(phi) - P * 0.22;
      const py = r * Math.sin(phi);
      return (Math.hypot(px / a, py / b) - 1) * b;
    }
    case 'clouds': {
      // Little scrolls: an Archimedean spiral cut as a line, turning alternately.
      const P = s * 2.1;
      const row = Math.round(v / P);
      const off = row & 1 ? P * 0.5 : 0;
      const col = Math.round((u - off) / P);
      let du = u - (col * P + off);
      const dv = v - row * P;
      if ((row + col) & 1) du = -du;
      const r = Math.hypot(du, dv);
      const b = (P * 0.2) / TAU;
      const th = Math.atan2(dv, du);
      let k = Math.round((r / b - th) / TAU);
      if (k < 0) k = 0;
      const d = Math.abs(r - b * (th + TAU * k));
      const w = Math.max(1.6, P * 0.075) * h;
      return Math.max(d - w * 0.5, r - P * 0.4);
    }
    case 'lattice': {
      // Square panes between leather bars.
      const P = s * 1.25;
      const bar = Math.max(1.6, P * 0.24) / h;
      const du = u - Math.round(u / P) * P;
      const dv = v - Math.round(v / P) * P;
      const half = P * 0.5 - bar * 0.5;
      const qx = Math.abs(du) - half + 1;
      const qy = Math.abs(dv) - half + 1;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 1;
    }
    case 'ice': {
      // Cracked ice: irregular panes left between bars, as in a Chinese window.
      const P = s * 1.7;
      const gx = Math.floor(u / P);
      const gy = Math.floor(v / P);
      let f1 = 1e9;
      let f2 = 1e9;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const cx = gx + i;
          const cy = gy + j;
          const px = (cx + 0.12 + 0.76 * hash2(cx, cy, 11)) * P;
          const py = (cy + 0.12 + 0.76 * hash2(cx, cy, 23)) * P;
          const d = Math.hypot(u - px, v - py);
          if (d < f1) {
            f2 = f1;
            f1 = d;
          } else if (d < f2) f2 = d;
        }
      const bar = Math.max(1.5, P * 0.12) / h;
      return bar * 0.5 - (f2 - f1) * 0.5;
    }
    case 'lines': {
      // Carved slits laid in staggered courses.
      const P = s * 0.8;
      const row = Math.round(v / P);
      const dv = v - row * P;
      const L = s * 2.2;
      const period = L + s * 0.55;
      const shifted = u + (row & 1) * period * 0.5;
      const du = shifted - Math.round(shifted / period) * period;
      const w = Math.max(1.1, s * 0.13) * h;
      return Math.hypot(Math.max(Math.abs(du) - L * 0.5 + w * 0.5, 0), dv) - w * 0.5;
    }
    case 'stars': {
      // Four-pointed stars, as punched in karagöz hide.
      const P = s * 1.6;
      const row = Math.round(v / P);
      const off = row & 1 ? P * 0.5 : 0;
      const du = Math.abs(u - (Math.round((u - off) / P) * P + off));
      const dv = Math.abs(v - row * P);
      const R = P * 0.36 * h;
      return ((Math.sqrt(du) + Math.sqrt(dv)) ** 2 - R) * 0.55;
    }
    case 'lace': {
      // Rosettes of six pin holes round a seventh, like a cut-paper doily.
      const P = s * 1.7;
      const row = Math.round(v / P);
      const off = row & 1 ? P * 0.5 : 0;
      const du = u - (Math.round((u - off) / P) * P + off);
      const dv = v - row * P;
      const r = Math.hypot(du, dv);
      const sector = TAU / 6;
      const th = Math.atan2(dv, du);
      const phi = th - Math.round(th / sector) * sector;
      const ring = Math.hypot(r * Math.cos(phi) - P * 0.25, r * Math.sin(phi)) - P * 0.075 * h;
      return Math.min(ring, r - P * 0.085 * h);
    }
    default:
      return 1e9;
  }
}

const LAMPS = {
  oil: ['#fff3cf', '#f6d396', '#d4954e', '#6e3a18'],
  candle: ['#fffaec', '#f7e7bf', '#dcbd86', '#856339'],
  ember: ['#ffe0a0', '#f8973f', '#c03e18', '#46100a'],
  electric: ['#ffffff', '#f3f1eb', '#d0cec7', '#727176'],
  jade: ['#f1fbe0', '#c2e2a2', '#6c9d5f', '#1c3a24'],
  rose: ['#fff0e4', '#f8bfa9', '#d47163', '#561a26'],
  moon: ['#eefaf5', '#a6dad0', '#4a8c90', '#10323c'],
} as const;
const RAMP_AT = [0, 0.5, 0.98, 1.5];
/** The lamp is the picture's glow: its heart takes the palette ink and its falloff the ground (keeping each lamp's own depth). A bare bulb keeps its white heart. */
const LAMP_ROLES: Record<string, (PaletteRole | undefined)[]> = { electric: [undefined, undefined, 'ground', 'ground'] };
const LAMP_DEFAULT_ROLES: PaletteRole[] = ['ink', 'ink', 'ground', 'ground'];
const to255 = (c: RGB) => [c[0] * 255, c[1] * 255, c[2] * 255] as const;
const from255 = (c: readonly [number, number, number]): RGB => [c[0] / 255, c[1] / 255, c[2] / 255];
/** Re-key a set of 0–1 colours to the palette, by index. */
function rekeyList(colours: RGB[], palette: Palette | undefined, roles: (PaletteRole | undefined)[]): RGB[] {
  if (!palette) return colours;
  const set: Record<string, readonly [number, number, number]> = {};
  const map: Record<string, PaletteRole | undefined> = {};
  colours.forEach((c, i) => { set[i] = to255(c); map[i] = roles[i]; });
  const out = rekey(set, palette, map);
  return colours.map((c, i) => (roles[i] ? from255(out[i]) : c));
}

function ramp(stops: RGB[], t: number): RGB {
  if (t <= 0) return stops[0];
  for (let i = 1; i < RAMP_AT.length; i++)
    if (t < RAMP_AT[i]) return lerp3(stops[i - 1], stops[i], (t - RAMP_AT[i - 1]) / (RAMP_AT[i] - RAMP_AT[i - 1]));
  return stops[stops.length - 1];
}

interface DyeTable {
  dyes: { hue: number; t: RGB }[];
  black: RGB;
  hide: RGB;
}
const PIYING: DyeTable = {
  dyes: [
    { hue: 4, t: hex('#d63a2a') },
    { hue: 24, t: hex('#e67a2a') },
    { hue: 40, t: hex('#eaa836') },
    { hue: 52, t: hex('#eecb4c') },
    { hue: 140, t: hex('#3a9c5c') },
    { hue: 212, t: hex('#3a70aa') },
  ],
  black: hex('#3c2618'),
  hide: hex('#dcac6a'),
};
const KARAGOZ: DyeTable = {
  dyes: [
    { hue: 355, t: hex('#d82434') },
    { hue: 40, t: hex('#f2ae1c') },
    { hue: 145, t: hex('#1e9c52') },
    { hue: 222, t: hex('#2a5cd4') },
    { hue: 285, t: hex('#7c3a9e') },
  ],
  black: hex('#1c120c'),
  hide: hex('#e2bc7e'),
};
const SOFT_LINE: Record<Tradition, RGB> = {
  piying: hex('#5a3e26'),
  wayang: hex('#3a2416'),
  karagoz: hex('#5e4028'),
  film: hex('#2a2a2e'),
};
const SOFT_TINTS: Record<Tradition, RGB> = {
  piying: hex('#8a6a48'),
  wayang: hex('#5a3a24'),
  karagoz: hex('#9a7050'),
  film: hex('#4c4c50'),
};
const WAYANG = {
  gold: hex('#dcaa44'),
  black: hex('#1a130e'),
  red: hex('#a41e16'),
  teal: hex('#1e5a64'),
  hide: hex('#7a3c1a'),
  horn: hex('#2a1a10'),
};

/** Light through dyed leather: thick hide is dark and saturated, thin hide glows. */
const leather = (dye: RGB, tr: number): RGB => {
  const g = mix(2.4, 0.85, tr);
  const k = mix(0.3, 1.05, tr);
  return [Math.pow(dye[0], g) * k, Math.pow(dye[1], g) * k, Math.pow(dye[2], g) * k];
};

interface Dye {
  t: RGB;
  paint: RGB | null;
  cut: boolean;
}

function dyeFor(trad: Tradition, colour: RGB, tr: number): Dye {
  const [h, s, l] = toHsl(colour);
  if (trad === 'film') return { t: [0.012, 0.011, 0.013], paint: null, cut: false };
  if (trad === 'wayang') {
    const g = mix(2.0, 1.0, tr);
    const k = mix(0.04, 0.6, tr);
    const t: RGB = [Math.pow(WAYANG.hide[0], g) * k, Math.pow(WAYANG.hide[1], g) * k, Math.pow(WAYANG.hide[2], g) * k];
    // Gold and black: warm and pale colours are gilded, dark and cool ones lacquered black, true reds stay red.
    let paint = WAYANG.gold;
    if (l < 0.24) paint = WAYANG.black;
    else if (s > 0.35 && (h < 18 || h > 335)) paint = WAYANG.red;
    else if (s > 0.18 && h > 75 && h < 300) paint = WAYANG.black;
    return { t, paint, cut: false };
  }
  const table = trad === 'karagoz' ? KARAGOZ : PIYING;
  const t2 = trad === 'karagoz' ? mix(0.4, 1, tr) : tr;
  if (s < 0.15 || l > 0.93 || l < 0.08) {
    if (l > 0.78) return { t: leather(table.hide, t2), paint: null, cut: true };
    if (l > 0.46) return { t: leather(table.hide, t2), paint: null, cut: false };
    return { t: leather(table.black, t2), paint: null, cut: false };
  }
  let best = table.dyes[0];
  let gap = 1e9;
  for (const dye of table.dyes) {
    const g = hueGap(h, dye.hue);
    if (g < gap) {
      gap = g;
      best = dye;
    }
  }
  return { t: leather(best.t, t2), paint: null, cut: false };
}

interface Piece {
  cls: number;
  cluster: number;
  area: number;
  x: number;
  y: number;
  lit: number;
  nx: number;
  ny: number;
  nz: number;
  r: number;
  g: number;
  b: number;
  t: RGB;
  paint: RGB | null;
  /** How much front paint shows on the lamp side (scenery is mostly seen as shadow). */
  front: number;
  /** The puppet's size on screen, 0.28 to 1: its lines, lace and rivets scale with it. */
  k: number;
  cut: boolean;
  pattern: Pattern;
  pitch: number;
  cos: number;
  sin: number;
  squash: number;
}

interface Joint {
  x: number;
  y: number;
  rho: number;
  cls: number;
  k: number;
}

function sheet(size: number): Ctx {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas.getContext('2d', { willReadFrequently: true })!;
}

/** The gunungan: a tall leaf-shaped mountain with a gate at its foot and the tree of life inside. */
function gunungan(g: Ctx, k: Ctx, cx: number, base: number, h: number, random: () => number) {
  const w = h * 0.6;
  const leaf = new Path2D();
  leaf.moveTo(cx - w * 0.5, base);
  leaf.bezierCurveTo(cx - w * 0.64, base - h * 0.42, cx - w * 0.2, base - h * 0.76, cx, base - h);
  leaf.bezierCurveTo(cx + w * 0.2, base - h * 0.76, cx + w * 0.64, base - h * 0.42, cx + w * 0.5, base);
  leaf.closePath();
  g.fill(leaf);
  k.lineCap = 'round';
  k.lineJoin = 'round';
  // An inner border following the outline.
  k.lineWidth = 2;
  k.save();
  k.translate(cx, base - h * 0.42);
  k.scale(0.84, 0.86);
  k.translate(-cx, -(base - h * 0.42));
  k.stroke(leaf);
  k.restore();
  // The gate.
  const gw = w * 0.36;
  const gh = h * 0.15;
  const gx = cx - gw / 2;
  const gy = base - gh - h * 0.04;
  k.lineWidth = 2.2;
  k.strokeRect(gx, gy, gw, gh);
  k.beginPath();
  k.moveTo(cx, gy + 3);
  k.lineTo(cx, gy + gh);
  k.moveTo(gx - gw * 0.18, gy);
  k.lineTo(cx, gy - gh * 0.55);
  k.lineTo(gx + gw * 1.18, gy);
  k.stroke();
  // The tree: a trunk with curling branches and leaf holes.
  const trunkBase = gy - gh * 0.6;
  const trunkTop = base - h * 0.88;
  k.lineWidth = 2.8;
  k.beginPath();
  k.moveTo(cx, trunkBase);
  k.lineTo(cx, trunkTop);
  k.stroke();
  for (let i = 0; i < 7; i++) {
    const t = 0.1 + i * 0.12;
    const y = mix(trunkBase, trunkTop, t);
    const span = w * 0.36 * (1 - t * 0.75);
    for (const side of [-1, 1]) {
      const ex = cx + side * span;
      const ey = y - h * 0.07;
      k.lineWidth = 1.9;
      k.beginPath();
      k.moveTo(cx, y);
      k.quadraticCurveTo(cx + side * span * 0.55, y + h * 0.02, ex, ey);
      k.stroke();
      const curl = Math.max(2.5, span * 0.14);
      k.beginPath();
      k.arc(ex - side * curl, ey, curl, side > 0 ? 0 : Math.PI, side > 0 ? Math.PI * 1.5 : -Math.PI * 0.5, side < 0);
      k.stroke();
      for (let j = 0; j < 3; j++) {
        const f = 0.3 + j * 0.25;
        const px = mix(cx, ex, f) + (random() - 0.5) * 3;
        const py = mix(y, ey, f) - 5 - random() * 4;
        k.beginPath();
        k.arc(px, py, 1.7, 0, TAU);
        k.fill();
      }
    }
  }
}

/** A carved lattice window hung at a top corner, with a lantern beside it. */
function windowAndLantern(g: Ctx, k: Ctx, x0: number, y0: number, W: number, side: number) {
  const H = W * 0.8;
  g.fillStyle = '#ff0000';
  g.fillRect(x0, y0, W, H);
  const b = Math.max(6, W * 0.06);
  const cols = 5;
  const rows = 4;
  const cw = (W - b * 2) / cols;
  const ch = (H - b * 2) / rows;
  const bar = Math.max(2.4, cw * 0.14);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) k.fillRect(x0 + b + i * cw + bar / 2, y0 + b + j * ch + bar / 2, cw - bar, ch - bar);
  // A round medallion left solid in the middle, with a ring cut into it.
  k.globalCompositeOperation = 'destination-out';
  k.beginPath();
  k.arc(x0 + W / 2, y0 + H / 2, Math.min(W, H) * 0.2, 0, TAU);
  k.fill();
  k.globalCompositeOperation = 'source-over';
  k.lineWidth = 1.8;
  k.beginPath();
  k.arc(x0 + W / 2, y0 + H / 2, Math.min(W, H) * 0.13, 0, TAU);
  k.stroke();
  // The lantern: hung by a cord inward of the window.
  // The lantern hangs from the window's outer half.
  const lx = x0 + W * (side < 0 ? 0.3 : 0.7);
  const rx = W * 0.15;
  const ry = W * 0.17;
  const ly = y0 + H + W * 0.14 + ry;
  g.fillStyle = '#00ff00';
  g.fillRect(lx - 1.3, y0 + H - 2, 2.6, ly - ry - (y0 + H - 2));
  g.beginPath();
  g.ellipse(lx, ly, rx, ry, 0, 0, TAU);
  g.fill();
  g.fillRect(lx - rx * 0.55, ly - ry - 4, rx * 1.1, 6);
  g.fillRect(lx - rx * 0.55, ly + ry - 2, rx * 1.1, 6);
  for (let i = -1; i <= 1; i++) g.fillRect(lx + i * rx * 0.3 - 1, ly + ry + 3, 2, ry * 0.9);
  k.lineWidth = 1.6;
  for (let i = -2; i <= 2; i++) {
    k.beginPath();
    k.ellipse(lx, ly, Math.abs(i) * rx * 0.3 + 0.5, ry * 0.8, 0, 0, TAU);
    k.stroke();
  }
}

/** Curling silhouette branches hanging in from the top corners. */
function vines(g: Ctx, k: Ctx, wx: number, wy: number, ww: number, wh: number, random: () => number, count: number) {
  g.fillStyle = g.strokeStyle = '#ff0000';
  g.lineCap = 'round';
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? wx - 4 : wx + ww + 4;
    for (let i = 0; i < count; i++) {
      const reach = ww * mix(0.16, 0.3, random());
      const drop = wh * mix(0.08, 0.3, random());
      const sx = x0;
      const sy = wy + wh * (0.02 + i * 0.06);
      const c1x = sx - side * reach * 0.5;
      const c1y = sy + drop * 0.1;
      const ex = sx - side * reach;
      const ey = sy + drop;
      const points: [number, number][] = [];
      for (let s = 0; s <= 24; s++) {
        const t = s / 24;
        points.push([
          (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * c1x + t * t * ex,
          (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * c1y + t * t * ey,
        ]);
      }
      // A curl at the tip.
      const turns = 1.4 + random();
      const radius = 8 + random() * 7;
      for (let s = 1; s <= 18; s++) {
        const t = s / 18;
        const ang = -side * (Math.PI * 0.5 + t * turns * Math.PI);
        const r = radius * (1 - t * 0.8);
        points.push([ex - side * radius + Math.cos(ang) * r * -side, ey + radius * 0.2 + Math.sin(ang) * r]);
      }
      for (let s = 1; s < points.length; s++) {
        const t = s / points.length;
        g.lineWidth = mix(7, 1.4, t);
        g.beginPath();
        g.moveTo(points[s - 1][0], points[s - 1][1]);
        g.lineTo(points[s][0], points[s][1]);
        g.stroke();
      }
      for (let s = 3; s < 24; s += 3) {
        const [px, py] = points[s];
        const [qx, qy] = points[s + 1];
        const ang = Math.atan2(qy - py, qx - px) + (s % 2 ? 0.9 : -0.9);
        const len = mix(19, 9, s / 24);
        const lx = px + Math.cos(ang) * len * 0.7;
        const ly = py + Math.sin(ang) * len * 0.7;
        g.beginPath();
        g.ellipse(lx, ly, len * 0.7, len * 0.3, ang, 0, TAU);
        g.fill();
        k.lineWidth = 0.9;
        k.beginPath();
        k.moveTo(lx - Math.cos(ang) * len * 0.45, ly - Math.sin(ang) * len * 0.45);
        k.lineTo(lx + Math.cos(ang) * len * 0.45, ly + Math.sin(ang) * len * 0.45);
        k.stroke();
      }
    }
  }
}

/** Scrolling clouds carved across the top of the screen. */
function clouds(g: Ctx, k: Ctx, wx: number, wy: number, ww: number, wh: number, random: () => number, count: number) {
  g.fillStyle = '#ff0000';
  k.lineCap = 'round';
  const lobes: [number, number, number][] = [
    [-1.25, 0.25, 0.62],
    [-0.45, -0.25, 0.9],
    [0.45, -0.18, 0.78],
    [1.2, 0.22, 0.6],
    [0, 0.35, 0.72],
  ];
  for (let i = 0; i < count; i++) {
    const cx = wx + ww * (0.1 + (0.8 * (i + 0.5)) / count) + (random() - 0.5) * ww * 0.06;
    const cy = wy + wh * (0.08 + random() * 0.09);
    const R = ww * 0.042 * (0.8 + random() * 0.5);
    g.beginPath();
    for (const [dx, dy, rr] of lobes) {
      g.moveTo(cx + dx * R + rr * R, cy + dy * R);
      g.arc(cx + dx * R, cy + dy * R, rr * R, 0, TAU);
    }
    g.fill();
    // A curling tail.
    const dir = random() < 0.5 ? -1 : 1;
    g.lineWidth = R * 0.28;
    g.strokeStyle = '#ff0000';
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + dir * R * 1.6, cy + R * 0.3);
    g.quadraticCurveTo(cx + dir * R * 2.4, cy + R * 0.9, cx + dir * R * 3.0, cy + R * 0.4);
    g.stroke();
    k.lineWidth = 1.6;
    for (const [dx, dy, rr] of lobes.slice(0, 4)) {
      k.beginPath();
      const ox = cx + dx * R;
      const oy = cy + dy * R;
      for (let s = 0; s <= 30; s++) {
        const t = s / 30;
        const ang = t * TAU * 1.5 * (dx < 0 ? -1 : 1);
        const r = rr * R * 0.62 * t;
        const px = ox + Math.cos(ang) * r;
        const py = oy + Math.sin(ang) * r;
        if (s === 0) k.moveTo(px, py);
        else k.lineTo(px, py);
      }
      k.stroke();
    }
  }
}

export default defineLook({
  questions: {
    tradition: choice('Which shadow-puppet tradition is playing?', {
      piying:
        'Chinese piying: translucent hide puppets dyed red, green, amber and black, cut with lace-like flowers, clouds and lattices, jointed with visible rivets, glowing on a warm screen in a red lacquered frame.',
      wayang:
        'Javanese wayang kulit: intricately perforated buffalo-hide figures, black and gilded, stretched into tall elongated profiles on horn rods, before a lamp-lit screen above a banana-trunk stage.',
      karagoz:
        'Turkish karagöz: chunky figures of brightly dyed camel hide, saturated crimson, saffron, cobalt and emerald with heavy black outlines, on a white muslin screen with a painted border.',
      film:
        'Silhouette film in the manner of 1920s cut-paper animation: solid black silhouettes with fine lace edges and pierced details on a softly graded coloured backdrop, inside a rounded film gate.',
    }),
    lamp: choice('What character has the light behind the screen? Its colours come from the picture\u2019s palette.', {
      oil: 'An oil lamp: a rich glowing heart falling to a deep, burnt dark at the edges.',
      candle: 'Candlelight: pale and soft all over, gentle and intimate.',
      ember: 'A brazier or torch: a fierce saturated glow, smoky and dramatic.',
      electric: 'A bare electric bulb: near-white and plain, a modern stage; only its edges take a tint.',
      jade: 'A gel: pale, even, uncanny light, for forests and spirits.',
      rose: 'A soft gel: a gentle tinted wash deepening to a strong dusk at the edges.',
      moon: 'A night gel: pale light deepening steeply to ink at the edges.',
    }),
    lampAt: choice('Where does the lamp hang?', {
      behind: 'Right behind the middle of the screen: a bright hotspot with a visible flame glow, the puppets haloed.',
      high: 'Hung above, as in wayang: light pours from the top of the screen and fades towards the stage.',
      low: 'On the floor below: a glow rising from the bottom edge, like footlights or a horizon at dusk.',
      side: "Off to one side, where the scene's own key light is: a raking glow across the screen.",
      even: 'Diffused evenly: a broad, flat wash of light across the whole screen.',
    }),
    translucency: score('How much light comes through the leather?', [
      'Thick, nearly opaque hide: dark shapes lit only through the cut holes',
      'Dense leather with deep, dark dyes',
      'Glowing translucent dyes',
      'Thin as stained glass: bright, luminous colour',
    ]),
    carving: score('How intricately are the puppets carved?', [
      'Bold: a few simple cut-outs',
      'Measured carving on the larger pieces',
      'Rich carving on every piece',
      'Lace: dense filigree everywhere',
    ]),
    screen: choice('What is the screen made of?', {
      cotton: 'Fine white cotton: an even, close weave.',
      paper: 'Oiled rice paper: mottled, with long fibres caught in it.',
      silk: 'Silk: smooth and luminous, with faint horizontal threads.',
      canvas: 'Coarse linen: a heavy, slubby weave.',
      film: 'Projected film: grain, dust and a few scratches.',
    }),
    rods: choice('Are the control rods visible?', {
      hidden: 'Hidden: no rods show, the puppets seem to move by themselves.',
      faint: 'Faint: soft blurred rod shadows, held back from the screen.',
      clear: 'Clear: dark rods running from neck and hands down to the puppeteer below.',
    }),
    scenery: choice('What becomes of the ground and the set behind the cast?', {
      bare: 'Cut in open line: the place is traced only by its outlines left standing in pale hide, the rest cut away to the lamp, so the puppets carry all the colour.',
      soft: 'Soft shadows: the place hangs back near the lamp as pale, soft-edged silhouettes in one muted tone, its shapes still legible.',
      carved: 'Carved scenery: the place is cut as perforated leather scenery pieces in a second, paler dye, with the cast standing in front.',
    }),
    dressing: choice('What else stands on the screen besides the cast?', {
      none: 'Nothing else: only the cast.',
      gunungan: 'A gunungan: the tall leaf-shaped tree-of-life puppet, planted at one side of the screen.',
      window: 'A carved lattice window and a hanging lantern at one top corner.',
      vines: 'Curling silhouette branches and leaves hanging in from the top corners.',
      clouds: 'Carved scrolling clouds drifting across the top of the screen.',
    }),
  },

  async apply(capture, a, context, signal) {
    const S = capture.size;
    const n = S * S;
    const mood = context.mood;
    const rng = seeded((context.seed ^ 0x2c1b3c6d) >>> 0);
    const seed = Math.floor(rng() * 1e6);
    let checkpoints = 0;
    const pause = async () => {
      signal.throwIfAborted();
      if (++checkpoints % 5 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const trad = a.tradition as Tradition;
    // The tradition's dyes are its identity; the scenery's soft tone and line answer in the palette's second colour.
    const [softTint, softLine] = rekeyList([SOFT_TINTS[trad], SOFT_LINE[trad]], context.palette, ['second', 'second']);
    const film = trad === 'film';
    const wayang = trad === 'wayang';
    const karagoz = trad === 'karagoz';
    const c = a.carving;
    const tr = a.translucency;
    const unit = S / 720;
    const scratch = new Float32Array(n);

    // ---- 1. Lay the capture into the screen's window -------------------------------------------
    const margins: Record<Tradition, [number, number, number, number]> = {
      piying: [30, 30, 30, 30],
      wayang: [16, 46, 16, 56],
      karagoz: [28, 28, 28, 28],
      film: [14, 14, 14, 14],
    };
    const [ml, mt, mr, mb] = margins[trad].map((m) => Math.round(m * unit));
    const wx = ml;
    const wy = mt;
    const ww = S - ml - mr;
    const wh = S - mt - mb;
    const sc = Math.min(ww, wh) / S;
    const ox = wx + (ww - S * sc) / 2;
    const oy = wy + (wh - S * sc) / 2;
    const inside = (x: number, y: number) => x >= wx && x < wx + ww && y >= wy && y < wy + wh;
    // Where the capture itself lies inside the window (wayang's tall screen is wider than the frame).
    const framed = (x: number, y: number) => x >= ox && x < ox + S * sc && y >= oy && y < oy + S * sc && inside(x, y);

    let cls = new Uint8Array(n);
    let z = new Float32Array(n).fill(1);
    let lit = new Float32Array(n);
    let nrm = new Float32Array(n * 3);
    let col = new Float32Array(n * 3);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        const sx = Math.floor((x - ox) / sc);
        const sy = Math.floor((y - oy) / sc);
        if (!inside(x, y) || sx < 0 || sy < 0 || sx >= S || sy >= S) {
          nrm[p * 3 + 2] = 1;
          continue;
        }
        const q = sy * S + sx;
        cls[p] = capture.identity[q * 4];
        z[p] = (capture.depth[q * 4] + capture.depth[q * 4 + 1] / 256 + capture.depth[q * 4 + 2] / 65536) / 255;
        lit[p] = capture.diffuse[q * 4] / 255;
        for (let k = 0; k < 3; k++) {
          nrm[p * 3 + k] = capture.normal[q * 4 + k] / 127.5 - 1;
          col[p * 3 + k] = capture.color[q * 4 + k] / 255;
        }
      }
    await pause();

    const thingBoxes = () => {
      const boxes = new Map<number, { x0: number; x1: number; y0: number; y1: number; count: number; sx: number }>();
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const id = cls[y * S + x];
          if (id < 3 || id === DRESS) continue;
          let box = boxes.get(id);
          if (!box) boxes.set(id, (box = { x0: x, x1: x, y0: y, y1: y, count: 0, sx: 0 }));
          if (x < box.x0) box.x0 = x;
          if (x > box.x1) box.x1 = x;
          if (y > box.y1) box.y1 = y;
          box.count++;
          box.sx += x;
        }
      return boxes;
    };
    let boxes = thingBoxes();

    // Puppets are cut larger than the scenery, as in a real play: a thing small on the screen (a
    // figure across a room) is enlarged from its foot, up to 1.4 times, so it still reads as a
    // figure. Wayang figures are also tall and narrow: each is stood up again, stretched.
    const grow = new Map<number, number>();
    let regrow = wayang;
    for (const [id, box] of boxes) {
      const size = Math.max(box.y1 - box.y0, box.x1 - box.x0, 1);
      const g = Math.max(1, Math.min(1.4, (95 * unit) / size));
      grow.set(id, g);
      if (g > 1.01) regrow = true;
    }
    if (regrow && boxes.size) {
      const src = { cls: cls.slice(), z: z.slice(), lit: lit.slice(), nrm: nrm.slice(), col: col.slice() };
      const copy = (p: number, q: number) => {
        cls[p] = src.cls[q];
        z[p] = src.z[q];
        lit[p] = src.lit[q];
        for (let k = 0; k < 3; k++) {
          nrm[p * 3 + k] = src.nrm[q * 3 + k];
          col[p * 3 + k] = src.col[q * 3 + k];
        }
      };
      for (let x = 0; x < S; x++) {
        let below = -1;
        for (let y = S - 1; y >= 0; y--) {
          const p = y * S + x;
          if (src.cls[p] >= 3) {
            if (below >= 0) copy(p, below);
            else {
              cls[p] = 0;
              z[p] = 1;
            }
          } else below = p;
        }
      }
      for (const [id, box] of boxes) {
        const height = Math.max(1, box.y1 - box.y0);
        const g = grow.get(id) ?? 1;
        const room = (box.y1 - wy - 6) / height;
        const stretch = Math.max(1, Math.min(wayang ? 1.24 * g : g, room));
        const narrow = wayang ? 0.84 * g : stretch;
        const cx = (box.x0 + box.x1) / 2;
        const foot = box.y1;
        const nx0 = Math.max(wx, Math.floor(cx - (cx - box.x0) * narrow) - 1);
        const nx1 = Math.min(wx + ww - 1, Math.ceil(cx + (box.x1 - cx) * narrow) + 1);
        const ny0 = Math.max(wy, Math.floor(foot - height * stretch) - 1);
        for (let y = ny0; y <= foot; y++)
          for (let x = nx0; x <= nx1; x++) {
            const sx = Math.round(cx + (x - cx) / narrow);
            const sy = Math.round(foot + (y - foot) / stretch);
            if (sx < 0 || sy < 0 || sx >= S || sy >= S) continue;
            const q = sy * S + sx;
            if (src.cls[q] !== id) continue;
            const p = y * S + x;
            if (cls[p] >= 3 && z[p] <= src.z[q]) continue;
            copy(p, q);
          }
      }
      boxes = thingBoxes();
      await pause();
    }
    for (const box of boxes.values()) box.y0 = S;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const box = boxes.get(cls[y * S + x]);
        if (box && y < box.y0) box.y0 = y;
      }
    // How large each puppet stands on the screen: lines, lace, rivets and rods are sized to it, so a
    // figure across the room is cut as finely as it needs to read, not with the marks of a giant.
    const detail = new Float32Array(256).fill(1);
    let castScale = 0.3;
    for (const [id, box] of boxes) {
      const k = Math.max(0.28, Math.min(1, Math.max(Math.sqrt(box.count), (box.y1 - box.y0) * 0.5) / (80 * unit)));
      detail[id] = k;
      castScale = Math.max(castScale, k);
    }

    // Plain light, normalised so a fully lit surface reads 1.
    const histogram = new Uint32Array(256);
    let surfaces = 0;
    for (let p = 0; p < n; p++)
      if (cls[p] > 0) {
        histogram[Math.min(255, Math.round(lit[p] * 255))]++;
        surfaces++;
      }
    let litRef = 0.5;
    if (surfaces > 0) {
      let seen = 0;
      for (let b = 0; b < 256; b++) {
        seen += histogram[b];
        if (seen >= surfaces * 0.88) {
          litRef = Math.max(0.05, b / 255);
          break;
        }
      }
    }
    const litN = new Float32Array(n);
    for (let p = 0; p < n; p++) litN[p] = Math.min(1.3, lit[p] / litRef);

    let left = 0;
    let right = 0;
    for (const box of boxes.values()) {
      const mean = box.sx / box.count;
      if (mean < S / 2) left += box.count;
      else right += box.count;
    }
    const emptier = left <= right ? -1 : 1;

    // ---- 2. Dressing: more puppets pinned to the screen behind the cast ------------------------
    const dressCode = new Uint8Array(n);
    const dressCut = new Float32Array(n);
    let gunung: { x: number; top: number; base: number } | null = null;
    if (a.dressing !== 'none') {
      const g = sheet(S);
      const k = sheet(S);
      g.fillStyle = '#ff0000';
      k.fillStyle = k.strokeStyle = '#ffffff';
      const extra = mood.density;
      // A full set leaves less screen to plant the gunungan in: it stands shorter and keeps the place in view.
      let placeArea = 0;
      for (let p = 0; p < n; p++) if (cls[p] === 1 || cls[p] === 2) placeArea++;
      const crowded = cover((placeArea / (ww * wh) - 0.3) / 0.35);
      if (a.dressing === 'gunungan') {
        const h = wh * mix(0.5, 0.64, extra) * mix(1, 0.7, crowded);
        const cx = emptier < 0 ? wx + h * 0.33 : wx + ww - h * 0.33;
        const base = wy + wh + (wayang ? 6 : -2) * unit;
        gunungan(g, k, cx, base, h, rng);
        gunung = { x: cx, top: base - h, base };
      } else if (a.dressing === 'window') {
        const W = ww * mix(0.24, 0.19, crowded);
        const x0 = emptier < 0 ? wx + 10 * unit : wx + ww - 10 * unit - W;
        windowAndLantern(g, k, x0, wy - 2, W, emptier);
      } else if (a.dressing === 'vines') {
        vines(g, k, wx, wy, ww, wh, rng, extra > 0.5 ? 3 : 2);
      } else {
        clouds(g, k, wx, wy, ww, wh, rng, Math.round(mix(2, 5, extra)));
      }
      const shape = g.getImageData(0, 0, S, S).data;
      const cuts = k.getImageData(0, 0, S, S).data;
      for (let y = wy; y < wy + wh; y++)
        for (let x = wx; x < wx + ww; x++) {
          const p = y * S + x;
          if (shape[p * 4 + 3] < 128 || (cls[p] >= 3 && cls[p] !== DRESS)) continue;
          cls[p] = DRESS;
          dressCode[p] = shape[p * 4] > 127 ? 1 : 2;
          dressCut[p] = cuts[p * 4 + 3] / 255;
          z[p] = 1;
          litN[p] = 1;
          nrm[p * 3] = 0;
          nrm[p * 3 + 1] = 0;
          nrm[p * 3 + 2] = 1;
        }
      await pause();
    }

    // ---- 3. What is a puppet, and what stands in front of what ---------------------------------
    // The place is never dropped: the set (2) and the ground (1) are cut as scenery pieces too,
    // pinned flat behind the cast. The scenery answer decides how they are cut, not whether.
    const carvedScenery = a.scenery === 'carved';
    const softScenery = a.scenery === 'soft';
    const lineScenery = a.scenery === 'bare';
    const isThing = (id: number) => id >= 3 && id !== DRESS;
    const isScenery = (id: number) => id === 1 || id === 2;
    const puppet = new Uint8Array(n);
    const order = new Float32Array(n);
    for (let p = 0; p < n; p++) {
      const id = cls[p];
      if (id >= 1) puppet[p] = 1;
      order[p] = isThing(id) ? z[p] : id === DRESS ? 1.5 : id > 0 ? 2 + z[p] : 9;
    }

    // ---- 4. Cut each puppet into pieces by colour ----------------------------------------------
    const feature = new Float32Array(n * 3);
    for (let p = 0; p < n; p++) {
      if (!puppet[p] || cls[p] === DRESS) continue;
      const r = col[p * 3];
      const g = col[p * 3 + 1];
      const b = col[p * 3 + 2];
      const y = r * 0.3 + g * 0.59 + b * 0.11;
      const light = Math.max(0.35, Math.min(1.1, litN[p]));
      feature[p * 3] = Math.min(1.2, y / light) * 0.75;
      feature[p * 3 + 1] = ((r - b) / (y + 0.12)) * 0.3;
      feature[p * 3 + 2] = ((g - (r + b) * 0.5) / (y + 0.12)) * 0.3;
    }
    const cluster = new Uint8Array(n);
    const kmeans = (pick: (p: number) => boolean, K: number, offset: number, random: () => number = rng) => {
      const samples: number[] = [];
      for (let y = 1; y < S; y += 2)
        for (let x = (y >> 1) & 1; x < S; x += 2) {
          const p = y * S + x;
          if (pick(p)) samples.push(p);
        }
      if (!samples.length) return;
      const centres = new Float32Array(K * 3);
      const distance = new Float32Array(samples.length).fill(Infinity);
      let chosen = samples[Math.floor(random() * samples.length)];
      for (let k = 0; k < K; k++) {
        centres.set(feature.subarray(chosen * 3, chosen * 3 + 3), k * 3);
        let total = 0;
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i] * 3;
          const d = (feature[s] - centres[k * 3]) ** 2 + (feature[s + 1] - centres[k * 3 + 1]) ** 2 + (feature[s + 2] - centres[k * 3 + 2]) ** 2;
          if (d < distance[i]) distance[i] = d;
          total += distance[i];
        }
        let target = random() * total;
        chosen = samples[samples.length - 1];
        for (let i = 0; i < samples.length; i++) {
          target -= distance[i];
          if (target <= 0) {
            chosen = samples[i];
            break;
          }
        }
      }
      const nearest = (s: number) => {
        let best = 0;
        let bestDistance = Infinity;
        for (let k = 0; k < K; k++) {
          const d = (feature[s] - centres[k * 3]) ** 2 + (feature[s + 1] - centres[k * 3 + 1]) ** 2 + (feature[s + 2] - centres[k * 3 + 2]) ** 2;
          if (d < bestDistance) {
            bestDistance = d;
            best = k;
          }
        }
        return best;
      };
      const sums = new Float64Array(K * 4);
      for (let round = 0; round < 8; round++) {
        sums.fill(0);
        for (const p of samples) {
          const k = nearest(p * 3);
          for (let j = 0; j < 3; j++) sums[k * 4 + j] += feature[p * 3 + j];
          sums[k * 4 + 3]++;
        }
        for (let k = 0; k < K; k++) if (sums[k * 4 + 3] > 0) for (let j = 0; j < 3; j++) centres[k * 3 + j] = sums[k * 4 + j] / sums[k * 4 + 3];
      }
      for (let p = 0; p < n; p++) if (pick(p)) cluster[p] = offset + nearest(p * 3);
    };
    kmeans((p) => isThing(cls[p]), 6, 0);
    // The scenery draws from its own stream, so the lamp and the cloth fall as before.
    const sceneryRng = seeded((context.seed ^ 0x51ce4e27) >>> 0);
    kmeans((p) => cls[p] === 2, 5, 6, sceneryRng);
    kmeans((p) => cls[p] === 1, 3, 11, sceneryRng);
    for (let p = 0; p < n; p++) if (cls[p] === DRESS) cluster[p] = 13 + dressCode[p];
    await pause();

    // A cutter simplifies: each pixel takes the commonest cluster around it within its own puppet.
    {
      const voted = cluster.slice();
      const counts = new Uint16Array(16);
      for (let y = 2; y < S - 2; y++)
        for (let x = 2; x < S - 2; x++) {
          const p = y * S + x;
          if (!puppet[p] || cls[p] === DRESS) continue;
          counts.fill(0);
          const id = cls[p];
          for (let j = -2; j <= 2; j++)
            for (let i = -2; i <= 2; i++) {
              const q = p + j * S + i;
              if (cls[q] === id) counts[cluster[q]]++;
            }
          let best = cluster[p];
          for (let k = 0; k < 16; k++) if (counts[k] > counts[best]) best = k;
          voted[p] = best;
        }
      cluster.set(voted);
    }
    await pause();

    // Connected pieces. Scenery is also parted at its folds and steps (a wall from the floor, a
    // stage front from its top), so a room is cut as the flats a puppeteer would make of it.
    const pixelMetres = (capture.pixelWorldSize || 0.01) / sc;
    const depthSpan = Math.max(1e-6, capture.far - capture.near);
    const flat = (p: number, q: number) =>
      nrm[p * 3] * nrm[q * 3] + nrm[p * 3 + 1] * nrm[q * 3 + 1] + nrm[p * 3 + 2] * nrm[q * 3 + 2] > 0.8 &&
      (Math.abs(z[p] - z[q]) * depthSpan) / pixelMetres < 4;
    let piece = new Int32Array(n).fill(-1);
    const stack = new Int32Array(n);
    let pieceCount = 0;
    for (let p0 = 0; p0 < n; p0++) {
      if (!puppet[p0] || piece[p0] >= 0) continue;
      const id = cls[p0];
      const k = cluster[p0];
      const fold = isScenery(id);
      let top = 0;
      stack[top++] = p0;
      piece[p0] = pieceCount;
      while (top > 0) {
        const p = stack[--top];
        const x = p % S;
        const neighbours = [x > 0 ? p - 1 : -1, x < S - 1 ? p + 1 : -1, p - S, p + S];
        for (const q of neighbours) {
          if (q < 0 || q >= n || piece[q] >= 0 || !puppet[q] || cls[q] !== id || cluster[q] !== k) continue;
          if (fold && !flat(p, q)) continue;
          piece[q] = pieceCount;
          stack[top++] = q;
        }
      }
      pieceCount++;
    }
    // Fold slivers into the neighbour they share most edge with.
    {
      const area = new Int32Array(pieceCount);
      for (let p = 0; p < n; p++) if (piece[p] >= 0) area[piece[p]]++;
      // A small puppet keeps its smaller parts (a head, a sleeve); scenery is cut in broader flats.
      const minArea = new Float32Array(256);
      for (let id = 0; id < 256; id++)
        minArea[id] = mix(170, 55, c) * unit * unit * (isScenery(id) ? 2.2 : Math.max(0.2, detail[id] * detail[id]));
      const contacts = new Map<number, Map<number, number>>();
      for (let p = 0; p < n; p++) {
        const a0 = piece[p];
        if (a0 < 0 || area[a0] >= minArea[cls[p]] || cls[p] === DRESS) continue;
        const x = p % S;
        for (const q of [x > 0 ? p - 1 : -1, x < S - 1 ? p + 1 : -1, p - S, p + S]) {
          if (q < 0 || q >= n) continue;
          const b0 = piece[q];
          if (b0 < 0 || b0 === a0 || cls[q] !== cls[p]) continue;
          let m = contacts.get(a0);
          if (!m) contacts.set(a0, (m = new Map()));
          m.set(b0, (m.get(b0) ?? 0) + 1);
        }
      }
      const target = new Int32Array(pieceCount);
      for (let i = 0; i < pieceCount; i++) target[i] = i;
      for (const [a0, m] of contacts) {
        let best = -1;
        let most = 0;
        for (const [b0, count] of m)
          if (count > most || (count === most && area[b0] > area[best])) {
            most = count;
            best = b0;
          }
        if (best >= 0) target[a0] = best;
      }
      const resolve = (i: number) => {
        for (let guard = 0; guard < 8 && target[i] !== i; guard++) i = target[i];
        return i;
      };
      const remap = new Int32Array(pieceCount).fill(-1);
      let next = 0;
      for (let p = 0; p < n; p++) {
        if (piece[p] < 0) continue;
        const r = resolve(piece[p]);
        if (remap[r] < 0) remap[r] = next++;
        piece[p] = remap[r];
      }
      pieceCount = next;
    }
    await pause();

    // ---- 5. Dye, pattern and orientation for each piece ----------------------------------------
    const pieces: Piece[] = [];
    for (let i = 0; i < pieceCount; i++)
      pieces.push({
        cls: 0, cluster: 0, area: 0, x: 0, y: 0, lit: 0, nx: 0, ny: 0, nz: 0, r: 0, g: 0, b: 0,
        t: [1, 1, 1], paint: null, front: 1, k: 1, cut: false, pattern: 'none', pitch: 8, cos: 1, sin: 0, squash: 1,
      });
    for (let p = 0; p < n; p++) {
      const i = piece[p];
      if (i < 0) continue;
      const pc = pieces[i];
      pc.cls = cls[p];
      pc.cluster = cluster[p];
      pc.area++;
      pc.x += p % S;
      pc.y += Math.floor(p / S);
      pc.lit += litN[p];
      pc.nx += nrm[p * 3];
      pc.ny += nrm[p * 3 + 1];
      pc.nz += nrm[p * 3 + 2];
      pc.r += col[p * 3];
      pc.g += col[p * 3 + 1];
      pc.b += col[p * 3 + 2];
    }
    const sat = mix(0.8, 1.18, mood.cheer) * (1 - mood.wear * 0.25);
    const DRESS_COLOURS: Record<Tradition, [string, string]> = {
      piying: a.dressing === 'window' ? ['#d8ccb8', '#d03028'] : a.dressing === 'clouds' ? ['#3a6ea8', '#3a6ea8'] : ['#3a8a50', '#d03028'],
      wayang: ['#d0a040', '#a41e16'],
      karagoz: a.dressing === 'clouds' ? ['#2a5cd4', '#2a5cd4'] : ['#1e9c52', '#d82434'],
      film: ['#101010', '#101010'],
    };
    const patterns: Record<Tradition, { big: Pattern[]; mid: Pattern[]; small: Pattern[]; scenery: Pattern[] }> = {
      piying: { big: ['flowers', 'clouds', 'ice', 'lattice'], mid: ['dots', 'lattice', 'lines', 'ice'], small: ['dots', 'lines'], scenery: ['lattice', 'ice', 'lines'] },
      karagoz: { big: ['stars', 'lattice', 'dots'], mid: ['dots', 'lines', 'stars'], small: ['dots'], scenery: ['lattice', 'dots'] },
      wayang: { big: ['rows'], mid: ['rows'], small: ['rows'], scenery: ['rows'] },
      film: { big: ['lace'], mid: ['lace'], small: ['none'], scenery: ['none'] },
    };
    const basePitch = (karagoz ? 13 : wayang ? 7 : 9) * unit * mix(1.45, 0.72, c);
    for (const pc of pieces) {
      const k = pc.area || 1;
      pc.x /= k;
      pc.y /= k;
      pc.lit /= k;
      pc.nx /= k;
      pc.ny /= k;
      pc.nz /= k;
      pc.r /= k;
      pc.g /= k;
      pc.b /= k;
      const light = Math.max(0.65, Math.min(1.1, pc.lit));
      let colour: RGB = [Math.min(1, pc.r / light), Math.min(1, pc.g / light), Math.min(1, pc.b / light)];
      if (pc.cls === DRESS) colour = hex(DRESS_COLOURS[trad][pc.cluster === 14 ? 0 : 1]);
      const scenery = isScenery(pc.cls);
      const ground = pc.cls === 1;
      pc.k = isThing(pc.cls) ? detail[pc.cls] : 1;
      const dye = dyeFor(trad, colour, scenery ? Math.max(tr, 0.6) : tr);
      pc.t = saturate(dye.t, sat);
      if (mood.wear > 0) pc.t = lerp3(pc.t, leather(PIYING.hide, tr), mood.wear * 0.18);
      pc.paint = dye.paint;
      // White details are cut clean away, but a white body stays as plain undyed hide.
      pc.cut = dye.cut && !scenery && pc.cls !== DRESS && pc.area < 0.35 * (boxes.get(pc.cls)?.count ?? 1);
      if (scenery) {
        // Scenery is pinned one layer back, in a second tone: the darker the place's own colour,
        // the denser its card, so a red curtain still stands apart from a pale wall.
        const y = luma(colour);
        if (lineScenery) {
          // Open line: the hide is cut away to a whisper of tone, leaving its outlines.
          const g = ground ? 0.95 : mix(0.86, 0.94, y);
          pc.t = film ? [g, g, g] : lerp3(pc.t, [1, 1, 1], ground ? 0.9 : 0.8);
          pc.paint = null;
        } else if (softScenery) {
          const T = softTint;
          const op = (ground ? 0.13 : 0.4) * mix(1.35, 0.65, y);
          pc.t = [1 - op * (1 - T[0]), 1 - op * (1 - T[1]), 1 - op * (1 - T[2])];
          pc.paint = null;
        } else if (film) {
          // Grey card in layers: the ground palest, the set behind the cast a mid grey.
          const g = ground ? mix(0.74, 0.9, y) : mix(0.36, 0.58, y);
          pc.t = [g, g, g * 1.03];
        } else {
          // A second, paler dye taken straight from the place's own colour (not snapped to the
          // cast's few dyes), so a wall that only drifts in the light does not break into patches.
          const hide = wayang ? ([0.86, 0.6, 0.36] as RGB) : karagoz ? KARAGOZ.hide : PIYING.hide;
          const base = lerp3(saturate(colour, wayang ? 0.6 : 0.85), hide, wayang ? 0.55 : 0.3);
          pc.t = ground ? lerp3(base, [1, 1, 1], 0.72) : lerp3(leather(base, mix(0.62, 0.86, tr)), [1, 1, 1], 0.18);
          // However dark the place, its scenery stays paler than the cast standing in front of it.
          const tone = luma(pc.t);
          if (tone < 0.42) pc.t = lerp3(pc.t, [1, 1, 1], (0.42 - tone) / (1 - tone));
          if (wayang) {
            // Wayang scenery is seen as warm shadow, gilded only at its edges.
            pc.paint = WAYANG.black;
            pc.front = ground ? 0.03 : 0.15;
          }
        }
      }
      // Pattern: chosen per tradition, kept the same for one colour across one puppet.
      const pick = hash2(pc.cls, pc.cluster, seed + 3);
      const set = patterns[trad];
      const bigArea = 1800 * unit * unit;
      const list = scenery ? set.scenery : k > bigArea ? set.big : k > 450 * unit * unit ? set.mid : set.small;
      const carved = wayang || k > bigArea * 1.5 || pc.cls === DRESS || hash2(pc.cls * 31 + pc.cluster, 7, seed) < mix(0.35, 1, c);
      pc.pattern = carved ? list[Math.floor(pick * list.length) % list.length] : 'none';
      if (film && (c < 0.45 || k < 1500 * unit * unit) && !dye.cut) pc.pattern = 'none';
      if (film && dye.cut) pc.pattern = 'lace';
      if (scenery && (!carvedScenery || ground)) pc.pattern = 'none';
      pc.pitch = scenery
        ? basePitch * Math.max(0.9, Math.min(1.7, Math.sqrt(k) / (110 * unit))) * 1.25
        : basePitch * Math.max(0.75, Math.min(1.3, Math.sqrt(k) / (110 * unit))) * mix(0.7, 1, pc.k);
      // A small puppet's piece too narrow to hold lace stays plain, so the figure reads by its outline.
      if (pc.k < 1 && Math.sqrt(k) < pc.pitch * mix(7, 4.5, pc.k)) pc.pattern = 'none';
      // Faces turned away carry a foreshortened pattern, laid along the way they turn.
      const lateral = Math.hypot(pc.nx, pc.ny);
      const angle = lateral > 0.2 ? Math.atan2(-pc.ny, pc.nx) : (hash2(pc.cls, pc.cluster, seed + 9) - 0.5) * 0.5;
      pc.cos = Math.cos(angle);
      pc.sin = Math.sin(angle);
      pc.squash = lateral > 0.2 ? 1 / Math.max(0.45, Math.abs(pc.nz)) : 1;
    }

    // ---- 6. Distances: to the silhouette, to the piece seams, to a nearer puppet, to a fold ----
    const region = new Int32Array(n);
    for (let p = 0; p < n; p++) region[p] = puppet[p] ? cls[p] : -1;
    const seedSil = new Uint8Array(n);
    const seedPiece = new Uint8Array(n);
    const seedOcc = new Uint8Array(n);
    const seedCrease = new Uint8Array(n);
    // Scenery is cut only along its real edges: where the colour, the surface or the depth breaks
    // across the boundary. A floor whose colour merely drifts in the light, or a studio floor that
    // melts into its paper, has no line to cut; a wall meeting the floor, or a tile, does.
    const edgeSum = new Map<number, number>();
    const edgeCount = new Map<number, number>();
    const pairKey = (p: number, q: number) => {
      const a0 = piece[p];
      const b0 = puppet[q] && piece[q] >= 0 ? piece[q] : pieceCount;
      return a0 < b0 ? a0 * (pieceCount + 1) + b0 : b0 * (pieceCount + 1) + a0;
    };
    for (let y = wy; y < wy + wh; y++)
      for (let x = wx; x < wx + ww; x++) {
        const p = y * S + x;
        if (!isScenery(cls[p]) || piece[p] < 0) continue;
        for (const q of [x > wx ? p - 1 : -1, x < wx + ww - 1 ? p + 1 : -1, y > wy ? p - S : -1, y < wy + wh - 1 ? p + S : -1]) {
          if (q < 0) continue;
          const other = cls[q];
          if (other >= 3 || (other === cls[p] && piece[q] === piece[p])) continue;
          let d = Math.abs(col[p * 3] - col[q * 3]) + Math.abs(col[p * 3 + 1] - col[q * 3 + 1]) + Math.abs(col[p * 3 + 2] - col[q * 3 + 2]);
          if (other > 0) {
            if (nrm[p * 3] * nrm[q * 3] + nrm[p * 3 + 1] * nrm[q * 3 + 1] + nrm[p * 3 + 2] * nrm[q * 3 + 2] < 0.8) d += 0.5;
            if ((Math.abs(z[p] - z[q]) * depthSpan) / pixelMetres > 4) d += 0.5;
          }
          const key = pairKey(p, q);
          edgeSum.set(key, (edgeSum.get(key) ?? 0) + d);
          edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
        }
      }
    const realEdge = (p: number, q: number) => {
      // A set piece always keeps its outline against the empty screen.
      if (cls[p] === 2 && !puppet[q]) return true;
      const key = pairKey(p, q);
      const count = edgeCount.get(key);
      return !count || edgeSum.get(key)! / count > 0.14;
    };
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        if (!puppet[p]) continue;
        const id = cls[p];
        for (const q of [x > 0 ? p - 1 : -1, x < S - 1 ? p + 1 : -1, y > 0 ? p - S : -1, y < S - 1 ? p + S : -1]) {
          // The screen's own edge is not a cut.
          if (q < 0 || !framed(q % S, (q / S) | 0)) continue;
          const scene = isScenery(id) && !isThing(cls[q]) && cls[q] !== DRESS;
          if (scene && !realEdge(p, q)) continue;
          if (!puppet[q]) seedSil[p] = 1;
          else if (cls[q] !== id) {
            if (order[q] > order[p]) seedSil[p] = 1;
            else if (scene) seedPiece[p] = 1;
            else seedOcc[p] = 1;
          } else if (piece[q] !== piece[p]) seedPiece[p] = 1;
        }
        // Folds: a sharp turn in the surface or a jump in depth inside one piece.
        if (isThing(id) && x < S - 1 && y < S - 1) {
          for (const q of [p + 1, p + S]) {
            if (piece[q] !== piece[p]) continue;
            const dot = nrm[p * 3] * nrm[q * 3] + nrm[p * 3 + 1] * nrm[q * 3 + 1] + nrm[p * 3 + 2] * nrm[q * 3 + 2];
            const jump = (Math.abs(z[p] - z[q]) * depthSpan) / pixelMetres;
            if (dot < 0.8 || jump > 3) seedCrease[p] = 1;
          }
        }
      }
    const dSil = new Float32Array(n);
    const dPiece = new Float32Array(n);
    const dOcc = new Float32Array(n);
    const dCrease = new Float32Array(n);
    chamfer(region, seedSil, S, dSil);
    chamfer(region, seedPiece, S, dPiece);
    chamfer(region, seedOcc, S, dOcc);
    chamfer(region, seedCrease, S, dCrease);
    await pause();
    // Outside distance, for the lace fringe of film silhouettes.
    const dOut = new Float32Array(n);
    if (film && c > 0.25) {
      const outside = new Int32Array(n);
      const seeds = new Uint8Array(n);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const p = y * S + x;
          if (puppet[p] && cls[p] >= 3) {
            outside[p] = -1;
            continue;
          }
          for (const q of [x > 0 ? p - 1 : -1, x < S - 1 ? p + 1 : -1, y > 0 ? p - S : -1, y < S - 1 ? p + S : -1])
            if (q >= 0 && puppet[q] && isThing(cls[q])) seeds[p] = 1;
        }
      chamfer(outside, seeds, S, dOut);
      await pause();
    }

    // ---- 7. Joints and rods --------------------------------------------------------------------
    const joints: Joint[] = [];
    {
      const pairs = new Map<number, { count: number; sx: number; sy: number; cls: number }>();
      for (let y = 0; y < S - 1; y++)
        for (let x = 0; x < S - 1; x++) {
          const p = y * S + x;
          if (!puppet[p] || !isThing(cls[p])) continue;
          for (const q of [p + 1, p + S]) {
            if (cls[q] !== cls[p] || piece[q] === piece[p]) continue;
            const lo = Math.min(piece[p], piece[q]);
            const hi = Math.max(piece[p], piece[q]);
            const key = lo * 1_000_003 + hi;
            let pair = pairs.get(key);
            if (!pair) pairs.set(key, (pair = { count: 0, sx: 0, sy: 0, cls: cls[p] }));
            pair.count++;
            pair.sx += x + (q === p + 1 ? 0.5 : 0);
            pair.sy += y + (q === p + S ? 0.5 : 0);
          }
        }
      const byThing = new Map<number, { x: number; y: number; count: number }[]>();
      for (const pair of pairs.values()) {
        if (pair.count < Math.max(3, 9 * unit * detail[pair.cls])) continue;
        const list = byThing.get(pair.cls) ?? [];
        list.push({ x: pair.sx / pair.count, y: pair.sy / pair.count, count: pair.count });
        byThing.set(pair.cls, list);
      }
      const snap = (x: number, y: number, id: number): [number, number] | null => {
        for (let r = 0; r <= 6; r++)
          for (let j = -r; j <= r; j++)
            for (let i = -r; i <= r; i++) {
              const px = Math.round(x) + i;
              const py = Math.round(y) + j;
              if (px < 0 || py < 0 || px >= S || py >= S) continue;
              if (cls[py * S + px] === id) return [px, py];
            }
        return null;
      };
      for (const [id, box] of boxes) {
        const k = detail[id];
        const maxRho = 14 * unit * k;
        const apart = 22 * unit * Math.max(0.4, k);
        const list = (byThing.get(id) ?? []).sort((p, q) => q.count - p.count);
        const mine: Joint[] = [];
        for (const candidate of list) {
          if (mine.length >= (k < 0.6 ? 2 : 4)) break;
          const at = snap(candidate.x, candidate.y, id);
          if (!at) continue;
          if (mine.some((j) => Math.hypot(j.x - at[0], j.y - at[1]) < apart)) continue;
          mine.push({ x: at[0], y: at[1], rho: Math.min(maxRho, dSil[at[1] * S + at[0]] * 0.92), cls: id, k });
        }
        // A puppet of a single colour is still built in jointed sections.
        if (mine.length < 2 && box.y1 - box.y0 > 40 * unit)
          for (const f of [0.36, 0.68]) {
            const y = Math.round(mix(box.y0, box.y1, f));
            let best = -1;
            let bestD = 0;
            for (let x = box.x0; x <= box.x1; x++) {
              const p = y * S + x;
              if (cls[p] === id && dSil[p] > bestD) {
                bestD = dSil[p];
                best = x;
              }
            }
            if (best < 0 || bestD < 2) continue;
            if (mine.some((j) => Math.hypot(j.x - best, j.y - y) < apart)) continue;
            mine.push({ x: best, y, rho: Math.min(maxRho, bestD * 0.92), cls: id, k });
          }
        joints.push(...mine);
      }
    }

    // Rods: from neck and hands down to the puppeteer, never across another puppet. A rod is
    // pressed to the screen only at its tip: further down it leaves the cloth, so its shadow fades
    // over a length set by its puppet's size, and a figure across the room is not hung on a mast.
    const rodBack = new Float32Array(n);
    const rodFront = new Float32Array(n);
    if (a.rods !== 'hidden') {
      const g = sheet(S);
      g.strokeStyle = g.fillStyle = '#ffffff';
      g.lineCap = 'round';
      const front = sheet(S);
      front.strokeStyle = front.fillStyle = '#ffffff';
      front.lineCap = 'round';
      const fading = (target: Ctx, ax: number, ay: number, bx: number, by: number, foot: number, reach: number) => {
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const dy = (by - ay) / len;
        const held = Math.max(0, Math.min(len, dy > 0.05 ? (foot - ay) / dy : 0));
        const span = held + reach;
        const end = Math.min(1, span / len);
        const gradient = target.createLinearGradient(ax, ay, ax + ((bx - ax) / len) * span, ay + ((by - ay) / len) * span);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(held / span, 'rgba(255,255,255,1)');
        gradient.addColorStop(Math.min(1, held / span + (reach / span) * 0.45), 'rgba(255,255,255,0.55)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        target.strokeStyle = gradient;
        target.beginPath();
        target.moveTo(ax, ay);
        target.lineTo(ax + (bx - ax) * end, ay + (by - ay) * end);
        target.stroke();
        target.strokeStyle = '#ffffff';
      };
      const clear = a.rods === 'clear';
      const crosses = (id: number, ax: number, ay: number, bx: number, by: number) => {
        const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
        for (let s = 2; s <= steps; s++) {
          const x = Math.round(mix(ax, bx, s / steps));
          const y = Math.round(mix(ay, by, s / steps));
          if (x < 0 || y < 0 || x >= S || y >= S) break;
          const k = cls[y * S + x];
          if (isThing(k) && k !== id) return true;
        }
        return false;
      };
      const rod = (id: number, ax: number, ay: number, lean: number, width: number) => {
        const by = S + 20;
        const box = boxes.get(id)!;
        const k = detail[id];
        const w = width * unit * mix(0.42, 1, k);
        const reach = Math.max(70 * unit, (box.y1 - box.y0) * 3);
        for (const tryLean of [lean, -lean * 0.6, 0]) {
          const bx = ax + tryLean * (by - ay);
          if (crosses(id, ax, ay, bx, by)) continue;
          const target = wayang ? front : g;
          target.lineWidth = w;
          fading(target, ax, ay, bx, by, box.y1, reach);
          target.beginPath();
          target.arc(ax, ay, w * 0.9, 0, TAU);
          target.fill();
          return;
        }
      };
      const ranked = [...boxes.entries()].sort((p, q) => q[1].count - p[1].count).slice(0, 4);
      const largest = ranked.length ? ranked[0][1].count : 0;
      for (const [id, box] of ranked) {
        if (box.count < 160 * unit * unit) continue;
        const h = box.y1 - box.y0;
        const meanX = box.sx / box.count;
        const k = detail[id];
        if (karagoz) {
          // The karagöz rod meets the figure square-on: only its tip shows, a dark dot in the body.
          const y = Math.round(box.y0 + h * 0.36);
          let x = Math.round(meanX);
          for (let i = 1; i < S && cls[y * S + x] !== id; i++) {
            const right = Math.round(meanX) + i;
            const left = Math.round(meanX) - i;
            if (right < S && cls[y * S + right] === id) x = right;
            else if (left >= 0 && cls[y * S + left] === id) x = left;
          }
          g.beginPath();
          g.arc(x, y, (clear ? 5 : 7) * unit * mix(0.45, 1, k), 0, TAU);
          g.fill();
          continue;
        }
        // Neck: high on the figure, near its middle.
        const neckY = Math.round(box.y0 + Math.max(4, h * 0.12));
        let neckX = -1;
        let nearest = 1e9;
        for (let x = box.x0; x <= box.x1; x++)
          if (cls[neckY * S + x] === id && Math.abs(x - meanX) < nearest) {
            nearest = Math.abs(x - meanX);
            neckX = x;
          }
        const centre = wx + ww / 2;
        if (neckX >= 0) {
          if (wayang) {
            // The gapit: a horn spine running the length of the figure, down into the trunk.
            front.lineWidth = 2.6 * unit * mix(0.5, 1, k);
            fading(front, neckX, neckY, neckX + (neckX < centre ? -1 : 1) * 8 * unit, S + 20, box.y1, Math.max(80 * unit, h * 3));
          } else rod(id, neckX, neckY, (neckX < centre ? -1 : 1) * 0.22, clear ? 3.4 : 5);
        }
        // Hands: the outermost points about the middle of the figure, on the leading puppets only.
        const leading = box.count === largest || (clear && box.count > largest * 0.45);
        if (box.x1 - box.x0 > 34 * unit && leading && (clear || !wayang)) {
          for (const side of clear ? [-1, 1] : [neckX < centre ? -1 : 1]) {
            let hx = -1;
            let hy = -1;
            for (let y = Math.round(box.y0 + h * 0.3); y <= box.y0 + h * 0.62; y += 2)
              for (let x = side < 0 ? box.x0 : box.x1; side < 0 ? x <= box.x1 : x >= box.x0; x -= side) {
                if (cls[y * S + x] !== id) continue;
                if (hx < 0 || (side < 0 ? x < hx : x > hx)) {
                  hx = x;
                  hy = y;
                }
                break;
              }
            if (hx >= 0) rod(id, hx - side * 3 * unit, hy, side * (wayang ? 0.14 : 0.34), wayang ? 1.7 : clear ? 2.8 : 4.4);
          }
        }
      }
      if (gunung) {
        const target = wayang ? front : g;
        target.lineWidth = (wayang ? 2.6 : clear ? 3.4 : 5) * unit;
        target.beginPath();
        target.moveTo(gunung.x, mix(gunung.base, gunung.top, 0.55));
        target.lineTo(gunung.x, S + 20);
        target.stroke();
      }
      const back = g.getImageData(0, 0, S, S).data;
      const fore = front.getImageData(0, 0, S, S).data;
      for (let p = 0; p < n; p++) {
        rodBack[p] = back[p * 4 + 3] / 255;
        rodFront[p] = fore[p * 4 + 3] / 255;
      }
      blur(rodBack, S, (clear ? 1 : mix(1.5, 3, castScale)) * unit, 2, scratch);
      await pause();
    }

    // ---- 8. The lamp behind the screen ---------------------------------------------------------
    const stops = rekeyList(LAMPS[a.lamp].map(hex), context.palette, LAMP_ROLES[a.lamp] ?? LAMP_DEFAULT_ROLES);
    const tint: RGB = [mix(0.93, 1.06, mood.warmth), 1, mix(1.08, 0.88, mood.warmth)];
    let hx = 0.5;
    let hy = 0.45;
    let rx = 0.62;
    let ry = 0.62;
    if (a.lampAt === 'behind') {
      hx = 0.5 + (rng() - 0.5) * 0.14;
      hy = 0.42 + (rng() - 0.5) * 0.1;
    } else if (a.lampAt === 'high') {
      hx = 0.5 + (rng() - 0.5) * 0.24;
      hy = -0.14;
      rx = 1.15;
      ry = 1.0;
    } else if (a.lampAt === 'low') {
      hx = 0.5 + (rng() - 0.5) * 0.24;
      hy = 1.16;
      rx = 1.15;
      ry = 1.0;
    } else if (a.lampAt === 'side') {
      const m = Math.hypot(capture.light[0], capture.light[1]) || 1;
      hx = 0.5 + (capture.light[0] / m) * 0.6;
      hy = 0.5 + (capture.light[1] / m) * 0.45;
      rx = ry = 0.85;
    } else {
      rx = ry = 1.9;
    }
    const spread = mix(0.82, 1.2, mood.cheer) * (film ? 1.25 : 1);
    rx *= spread;
    ry *= spread;
    const hotX = wx + hx * ww;
    const hotY = wy + hy * wh;
    const flicker = 0.03 + mood.energy * 0.1;
    const flame = !film && a.lampAt !== 'even' && hx > 0 && hx < 1 && hy > 0 && hy < 1;
    const Lr = new Float32Array(n);
    const Lg = new Float32Array(n);
    const Lb = new Float32Array(n);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        const u = (x - wx) / ww;
        const v = (y - wy) / wh;
        let t = Math.hypot((u - hx) / rx, (v - hy) / ry);
        t += valueNoise(x / (150 * unit), y / (150 * unit), seed + 1) * flicker + valueNoise(x / (45 * unit), y / (45 * unit), seed + 2) * flicker * 0.35;
        const [r, g, b] = ramp(stops, t);
        let core = 0;
        if (flame) {
          const fx = (x - hotX) / (30 * unit);
          const fy = (y - hotY) / (52 * unit);
          core = Math.exp(-(fx * fx + fy * fy)) * (0.22 + mood.energy * 0.12);
        }
        Lr[p] = (r + core) * tint[0];
        Lg[p] = (g + core * 0.92) * tint[1];
        Lb[p] = (b + core * 0.7) * tint[2];
      }
      if (y % 120 === 0) await pause();
    }
    const hot: RGB = [stops[0][0] * tint[0], stops[0][1] * tint[1], stops[0][2] * tint[2]];

    // ---- 9. The screen cloth, its age, the soft scenery and the puppets' ghosts -----------------
    const tex = new Float32Array(n).fill(1);
    const grainAdd = new Float32Array(n);
    {
      const fibreA = rng() * Math.PI;
      const fa = [Math.cos(fibreA), Math.sin(fibreA)];
      const fb = [Math.cos(fibreA + 1.1), Math.sin(fibreA + 1.1)];
      const scratches = Array.from({ length: a.screen === 'film' ? 2 + Math.floor(mood.wear * 5) : 0 }, () => ({
        x: wx + rng() * ww,
        w: 0.5 + rng() * 0.8,
        a: 0.05 + rng() * 0.1,
      }));
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const p = y * S + x;
          let t = 1;
          switch (a.screen) {
            case 'cotton':
              t += Math.sin((x * Math.PI) / (1.4 * unit)) * Math.sin((y * Math.PI) / (1.4 * unit)) * 0.025;
              t += valueNoise(x / 1.3, y / 1.3, seed + 20) * 0.02 + valueNoise(x / 90, y / 90, seed + 21) * 0.03;
              break;
            case 'paper': {
              t += fbm(x / (38 * unit), y / (38 * unit), seed + 22) * 0.08;
              const s1 = valueNoise((x * fa[0] + y * fa[1]) / (46 * unit), (-x * fa[1] + y * fa[0]) / (1.4 * unit), seed + 23);
              const s2 = valueNoise((x * fb[0] + y * fb[1]) / (60 * unit), (-x * fb[1] + y * fb[0]) / (1.6 * unit), seed + 24);
              t += cover((Math.max(s1, s2) - 0.62) * 4) * 0.07;
              break;
            }
            case 'silk':
              t += valueNoise(x / (60 * unit), y / (0.9 * unit), seed + 25) * 0.025 + valueNoise(x / (140 * unit), y / (3 * unit), seed + 26) * 0.035;
              break;
            case 'canvas':
              t += Math.sin((x * TAU) / (3.2 * unit)) * Math.sin((y * TAU) / (3.2 * unit)) * 0.045;
              t += valueNoise(x / (30 * unit), y / (2.4 * unit), seed + 27) * 0.04 + valueNoise(x / (2.4 * unit), y / (30 * unit), seed + 28) * 0.04;
              break;
            case 'film': {
              const grain = hash2(x, y, seed + 29) + hash2(x + 1, y, seed + 29) * 0.5 - 0.75;
              t += grain * 0.1;
              grainAdd[p] = grain * 0.035;
              const speck = hash2(x >> 1, y >> 1, seed + 30);
              if (speck < 0.0006 * (1 + mood.wear * 4)) t *= 0.35;
              for (const s of scratches) if (Math.abs(x - s.x) < s.w) grainAdd[p] += s.a;
              break;
            }
          }
          // Age: tea-coloured stains and grime toward the edges of the screen.
          if (mood.wear > 0.25) {
            const f = fbm(x / (160 * unit), y / (160 * unit), seed + 31) + 0.18 * valueNoise(x / (30 * unit), y / (30 * unit), seed + 32);
            const threshold = 0.5 - mood.wear * 0.22;
            const s0 = cover((f - threshold) / 0.3);
            const soaked = s0 * s0 * (3 - 2 * s0);
            const tide = Math.exp(-(((f - threshold) / 0.03) ** 2));
            t *= 1 - (soaked * 0.13 + tide * 0.09) * ((mood.wear - 0.25) / 0.75);
            const edge = Math.min(x - wx, wx + ww - x, y - wy, wy + wh - y) / (60 * unit);
            if (edge < 1) t *= 1 - (1 - Math.max(0, edge)) * mood.wear * 0.22;
          }
          tex[p] = t;
        }
        if (y % 120 === 0) await pause();
      }
    }
    // Stain colour shifts blue out first, like paper browned by smoke.
    const stainTint = mood.wear > 0.25;

    // How far the set stands behind the cast: soft scenery held further back blurs more.
    let behind = 0.5;
    {
      let setDepth = 0;
      let setCount = 0;
      let thingDepth = 0;
      let thingCount = 0;
      for (let p = 0; p < n; p++) {
        if (cls[p] === 2) {
          setDepth += z[p];
          setCount++;
        } else if (isThing(cls[p])) {
          thingDepth += z[p];
          thingCount++;
        }
      }
      if (setCount && thingCount) behind = cover(((setDepth / setCount - thingDepth / thingCount) * depthSpan) / (pixelMetres * 200));
    }

    // Ghosts: a puppet not pressed flat against the screen throws a soft offset shadow.
    const ghostThing = new Float32Array(n);
    const ghostDress = new Float32Array(n);
    for (let p = 0; p < n; p++) {
      if (isThing(cls[p])) ghostThing[p] = 1;
      else if (cls[p] === DRESS) ghostDress[p] = 1;
    }
    blur(ghostThing, S, 3 * unit, 2, scratch);
    if (a.dressing !== 'none') blur(ghostDress, S, 3 * unit, 2, scratch);
    let gdx = wx + ww / 2 - hotX;
    let gdy = wy + wh / 2 - hotY;
    const gm = Math.hypot(gdx, gdy);
    if (gm < 40 * unit) {
      gdx = 0.6;
      gdy = 0.8;
    } else {
      gdx /= gm;
      gdy /= gm;
    }
    const ghostReach = mix(4, 11, mood.energy) * unit * mix(0.4, 1, castScale);
    const offX = Math.round(gdx * ghostReach);
    const offY = Math.round(gdy * ghostReach);
    const ghostAt = (field: Float32Array, x: number, y: number) => {
      const sx = x - offX;
      const sy = y - offY;
      if (sx < 0 || sy < 0 || sx >= S || sy >= S) return 0;
      return field[sy * S + sx];
    };
    await pause();

    // ---- 10. Light through each pixel: transmission T, and front paint F -----------------------
    const Tr = new Float32Array(n).fill(1);
    const Tg = new Float32Array(n).fill(1);
    const Tb = new Float32Array(n).fill(1);
    const Fr = new Float32Array(n);
    const Fg = new Float32Array(n);
    const Fb = new Float32Array(n);
    const spec = {
      piying: { wOut: 2.3, wIn: 1.15, outline: [0.06, 0.022, 0.01] as RGB, crease: 1.5 },
      karagoz: { wOut: 3.1, wIn: 1.5, outline: [0.03, 0.02, 0.015] as RGB, crease: 2.0 },
      wayang: { wOut: 1.5, wIn: 1.0, outline: [0.0, 0.0, 0.0] as RGB, crease: 1.2 },
      film: { wOut: 0, wIn: 0, outline: [0.012, 0.011, 0.013] as RGB, crease: 0.9 },
    }[trad];
    const wOut = spec.wOut * unit;
    const wIn = spec.wIn * unit;
    const border = mix(5, 3, c) * unit + wOut;
    const holeSize = mix(0.82, 1.15, c);
    const creaseW = spec.crease * unit * (film && c < 0.6 ? 0 : 1);
    const rim = mix(3.4, 2.4, c) * unit + wOut;
    const confidence = capture.confidence;
    const doubt = (id: number) => (confidence && id < confidence.length ? 1 - clamp01(confidence[id]) : 0);
    // Wayang gilding catches the lamp from the front: the plain light, plus glints from the normals.
    const lx = capture.light[0];
    const ly = -capture.light[1];
    const lz = capture.light[2];
    const hm = Math.hypot(lx, ly, lz + 1) || 1;
    const halfX = lx / hm;
    const halfY = ly / hm;
    const halfZ = (lz + 1) / hm;
    const gold = WAYANG.gold;
    const rows = Math.round(mix(1, 4, c));
    const rowGap = mix(7.5, 5.5, c) * unit;
    const rimW = 2.2 * unit;
    const dotPitch = 3.7 * unit;
    const dotGrid = (x: number, y: number, pitch: number, radius: number) => {
      const rowH = pitch * 0.866;
      const row = Math.round(y / rowH);
      const off = row & 1 ? pitch * 0.5 : 0;
      const cu = Math.round((x - off) / pitch) * pitch + off;
      return Math.hypot(x - cu, y - row * rowH) - radius;
    };

    for (let y = wy; y < wy + wh; y++) {
      for (let x = wx; x < wx + ww; x++) {
        const p = y * S + x;
        if (!puppet[p]) {
          // The bare screen, its soft scenery, the ghosts of the puppets in front of it.
          let k = 1 - 0.3 * ghostAt(ghostThing, x, y);
          if (a.dressing !== 'none') k *= 1 - 0.24 * ghostAt(ghostDress, x, y);
          let r = k;
          let g = k;
          let b = k;
          if (film && c > 0.5 && dOut[p] < 4 * unit) {
            // Lace fringe: tiny scallops standing just off the silhouette.
            const pitch = 4.2 * unit;
            const gx = Math.round(x / pitch) * pitch;
            const gy = Math.round(y / pitch) * pitch;
            const gp = Math.min(S - 1, Math.max(0, Math.round(gy))) * S + Math.min(S - 1, Math.max(0, Math.round(gx)));
            const at = dOut[gp];
            if (!puppet[gp] && at < 1.2 * unit) {
              const cov = cover(1.7 * unit + 0.5 - Math.hypot(x - gx, y - gy));
              r = mix(r, 0.012, cov);
              g = mix(g, 0.011, cov);
              b = mix(b, 0.013, cov);
            }
          }
          Tr[p] = r;
          Tg[p] = g;
          Tb[p] = b;
          continue;
        }
        const pc = pieces[piece[p]];
        const ds = dSil[p];
        const dp = dPiece[p];
        const e = ds < dp ? ds : dp;
        const id = cls[p];
        const scenery = id === 1 || id === 2;
        // Lines, borders and folds are cut to the puppet's size on screen.
        const kk = pc.k;
        const wOutK = wOut * mix(0.5, 1, kk);
        const wInK = wIn * mix(0.65, 1, kk);
        let tr0 = pc.t[0];
        let tg0 = pc.t[1];
        let tb0 = pc.t[2];
        // Hide is uneven: fibre and hand-rubbed dye.
        const fibre = 1 + valueNoise(x / (5 * unit), y / (5 * unit), seed + 40) * 0.06 + valueNoise(x / (22 * unit), y / (22 * unit), seed + 41) * 0.08;
        // Dye lies thicker where the plain light falls in shadow, so the form still turns.
        const form = Math.max(0.72, Math.min(1.2, 1 + (litN[p] - pc.lit) * 0.45));
        tr0 *= fibre * form;
        tg0 *= fibre * form;
        tb0 *= fibre * form;
        // Local pattern coordinates: centred on the piece, turned and foreshortened with its face.
        const dx = x - pc.x;
        const dy = y - pc.y;
        const u = (dx * pc.cos + dy * pc.sin) * pc.squash;
        const v = -dx * pc.sin + dy * pc.cos;
        let hole = 0;
        let fr = 0;
        let fg = 0;
        let fb = 0;
        if (scenery && !carvedScenery) {
          // Open-line or soft scenery: pale card, kept only by the strips along its outlines and seams.
          const lw = (lineScenery ? 1.7 : 1.5) * unit;
          const ink: RGB = lineScenery ? (film ? [0.08, 0.08, 0.085] : wayang ? [0.16, 0.08, 0.04] : spec.outline) : softLine;
          const strength = lineScenery ? (id === 1 ? 0.8 : 0.92) : 0.75;
          // The floor's own seams (tiles, rugs, paving) are cut lighter than the walls' edges.
          const o = Math.max(cover(lw + 0.5 - ds), cover(lw * 0.62 + 0.5 - dp) * (id === 1 ? 0.5 : 0.85));
          const f = 1 + (fibre - 1) * 0.5;
          tr0 = mix(pc.t[0] * f, ink[0], o * strength);
          tg0 = mix(pc.t[1] * f, ink[1], o * strength);
          tb0 = mix(pc.t[2] * f, ink[2], o * strength);
          if (dressCut[p] > 0) hole = dressCut[p];
        } else if (wayang) {
          // Gilded, perforated hide: a gold rim, rows of punched holes between gold lines, fine
          // pricking inside, all painted on the side facing the lamp.
          const paint = pc.paint ?? gold;
          let gilt = 0;
          const rimEnd = wOutK + rimW * mix(0.55, 1, kk);
          const gap = rowGap * mix(0.7, 1, kk);
          if (e < rimEnd) gilt = cover(e - wOutK + 0.5);
          else {
            const k = (e - rimEnd) / gap;
            if (k < (kk < 0.6 ? Math.min(rows, 1) : rows)) {
              const frac = k - Math.floor(k);
              const lineD = Math.min(frac, 1 - frac) * gap;
              gilt = cover(0.75 * unit + 0.5 - lineD);
              const band = Math.abs(frac - 0.5) * gap;
              if (band < 1.7 * unit) hole = cover(0.5 - dotGrid(x, y, dotPitch, 1.15 * unit * holeSize)) * cover(1.7 * unit - band);
            } else if (c > 0.3 && !scenery && kk > 0.5) {
              hole = cover(0.5 - dotGrid(u, v, 5.6 * unit, 0.95 * unit * holeSize));
              const inten = patternSdf('lattice', u + v, u - v, pc.pitch * 2.2, 0.5);
              if (inten > -0.6 && inten < 0.6 && c > 0.55) gilt = Math.max(gilt, 1 - Math.abs(inten) / 0.6);
            }
          }
          if (dCrease[p] < 2 * unit && e > rimEnd) gilt = Math.max(gilt, cover(0.7 * unit + 0.5 - dCrease[p]));
          if (dressCut[p] > 0) hole = Math.max(hole, dressCut[p]);
          const nx = nrm[p * 3];
          const ny = nrm[p * 3 + 1];
          const nz = nrm[p * 3 + 2];
          const glintBase = Math.max(0, nx * halfX + ny * halfY + nz * halfZ);
          const crinkle = 0.7 + 0.6 * hash2(x >> 1, y >> 1, seed + 42);
          const glint = Math.pow(glintBase, 18) * 0.9 * crinkle;
          const light = 0.32 + 0.85 * Math.min(1.1, litN[p]);
          const pr = mix(paint[0], gold[0], gilt);
          const pg = mix(paint[1], gold[1], gilt);
          const pb = mix(paint[2], gold[2], gilt);
          const sheen = gilt > 0 || paint === gold ? glint : glint * 0.25;
          const shown = mix(pc.front, 1, gilt);
          fr = (pr * light + sheen) * hot[0] * shown;
          fg = (pg * light + sheen * 0.85) * hot[1] * shown;
          fb = (pb * light + sheen * 0.55) * hot[2] * shown;
          const keep = 1 - hole;
          tr0 = mix(tr0, 1, hole);
          tg0 = mix(tg0, 1, hole);
          tb0 = mix(tb0, 1, hole);
          fr *= keep;
          fg *= keep;
          fb *= keep;
          const o = Math.max(cover(wOutK - ds), cover(wInK - dp));
          tr0 *= 1 - o;
          tg0 *= 1 - o;
          tb0 *= 1 - o;
          fr *= 1 - o * 0.9;
          fg *= 1 - o * 0.9;
          fb *= 1 - o * 0.9;
        } else if (film) {
          // Solid black card: pierced only by eyelets, lace rosettes and hairline joints.
          if (pc.cut) hole = cover(e - rim * mix(0.5, 1, kk) + 0.5) * 0.85;
          if (c > 0.2 && !scenery && kk > 0.5) {
            const eye = 3.6 * unit;
            if (Math.abs(e - eye) < 1.6 * unit) hole = Math.max(hole, cover(0.5 - dotGrid(x, y, 5.4 * unit, 1.05 * unit * holeSize)) * cover(1.6 * unit - Math.abs(e - eye)));
          }
          if (pc.pattern !== 'none' && e > 7 * unit) hole = Math.max(hole, cover(0.5 - patternSdf(pc.pattern, u, v, pc.pitch, holeSize)));
          if (c > 0.35) hole = Math.max(hole, cover(0.55 - dp) * 0.9);
          if (creaseW > 0 && e > 4 * unit) hole = Math.max(hole, cover(creaseW * 0.5 + 0.5 - dCrease[p]) * 0.9);
          if (dressCut[p] > 0) hole = Math.max(hole, dressCut[p]);
          hole = Math.max(hole, cover(1.1 * unit - dOcc[p]) * 0.85);
          tr0 = mix(pc.t[0], 1, hole);
          tg0 = mix(pc.t[1], 1, hole);
          tb0 = mix(pc.t[2], 1, hole);
        } else {
          // Translucent dyed leather: carved holes, cut folds, a dark edge round every piece.
          const borderK = border * mix(0.45, 1, kk);
          const creaseK = creaseW * mix(0.6, 1, kk);
          if (pc.cut) hole = cover(e - rim * mix(0.5, 1, kk) + 0.5);
          else if (pc.pattern !== 'none' && e > borderK) hole = cover(0.5 - patternSdf(pc.pattern, u, v, pc.pitch, holeSize)) * cover(e - borderK);
          if (creaseK > 0 && e > borderK * 0.6 && dCrease[p] < creaseK + 1) hole = Math.max(hole, cover(creaseK * 0.5 + 0.5 - dCrease[p]));
          if (dressCut[p] > 0) hole = Math.max(hole, dressCut[p] * cover(e - wOut));
          tr0 = mix(tr0, 1, hole);
          tg0 = mix(tg0, 1, hole);
          tb0 = mix(tb0, 1, hole);
          const o = Math.max(cover(wOutK - ds), cover((scenery ? wIn * 0.8 : wInK) - dp));
          tr0 = mix(tr0, spec.outline[0], o);
          tg0 = mix(tg0, spec.outline[1], o);
          tb0 = mix(tb0, spec.outline[2], o);
        }
        // Scenery is cut back from the edge of a puppet standing over it, so the figure keeps its
        // silhouette against the set; a puppet over a puppet throws a contact shadow instead.
        if (scenery) {
          const halo = cover(2.2 * unit + 0.5 - dOcc[p]) * 0.8;
          if (halo > 0) {
            tr0 = mix(tr0, 1, halo);
            tg0 = mix(tg0, 1, halo);
            tb0 = mix(tb0, 1, halo);
          }
        } else if (dOcc[p] < 12 * unit) {
          const s = 1 - 0.42 * Math.exp(-dOcc[p] / (2.6 * unit));
          tr0 *= s;
          tg0 *= s;
          tb0 *= s;
          fr *= s;
          fg *= s;
          fb *= s;
        }
        // Scenery and the dressing sit behind the cast, under its ghost.
        if (!isThing(id)) {
          const k = 1 - 0.3 * ghostAt(ghostThing, x, y);
          tr0 *= k;
          tg0 *= k;
          tb0 *= k;
        }
        // A puppet the director doubted is held back from the screen: greyer and fainter.
        const unsure = isThing(id) ? doubt(id) : 0;
        if (unsure > 0.25) {
          const m = (unsure - 0.25) * 0.8;
          tr0 = mix(tr0, 0.5, m);
          tg0 = mix(tg0, 0.48, m);
          tb0 = mix(tb0, 0.45, m);
        }
        Tr[p] = tr0;
        Tg[p] = tg0;
        Tb[p] = tb0;
        Fr[p] = fr;
        Fg[p] = fg;
        Fb[p] = fb;
      }
      if (y % 90 === 0) await pause();
    }

    // Soft scenery is held back from the cloth, so its shadow spreads and softens; the cast stays
    // sharp. The blur skips the puppets, so no dark puppet bleeds into the scenery round it.
    if (softScenery) {
      const radius = mix(1.4, 3, behind) * unit;
      const mask = new Float32Array(n);
      for (let p = 0; p < n; p++) mask[p] = isThing(cls[p]) || cls[p] === DRESS ? 0 : 1;
      const weight = mask.slice();
      blur(weight, S, radius, 2, scratch);
      for (const T of [Tr, Tg, Tb]) {
        const layer = new Float32Array(n);
        for (let p = 0; p < n; p++) layer[p] = T[p] * mask[p];
        blur(layer, S, radius, 2, scratch);
        for (let p = 0; p < n; p++) if (mask[p] && weight[p] > 0.02) T[p] = layer[p] / weight[p];
        await pause();
      }
    }

    // Joints: the round end of one piece riveted over the next.
    if (!film)
      for (const j of joints) {
        const R = Math.ceil(j.rho + 3);
        const rivet = (karagoz ? 3.2 : wayang ? 2.8 : 2.6) * unit * mix(0.5, 1, j.k);
        for (let y = Math.max(0, j.y - R); y <= Math.min(S - 1, j.y + R); y++)
          for (let x = Math.max(0, j.x - R); x <= Math.min(S - 1, j.x + R); x++) {
            const p = y * S + x;
            if (cls[p] !== j.cls) continue;
            const d = Math.hypot(x - j.x, y - j.y);
            if (j.rho > 4 * unit) {
              if (d < j.rho) {
                // Two layers of hide overlap here.
                Tr[p] *= 0.8;
                Tg[p] *= 0.78;
                Tb[p] *= 0.76;
              }
              const ring = cover(wIn + 0.5 - Math.abs(d - j.rho));
              if (ring > 0) {
                Tr[p] = mix(Tr[p], spec.outline[0], ring * 0.85);
                Tg[p] = mix(Tg[p], spec.outline[1], ring * 0.85);
                Tb[p] = mix(Tb[p], spec.outline[2], ring * 0.85);
                if (wayang) {
                  Fr[p] = mix(Fr[p], gold[0] * hot[0] * 0.9, ring);
                  Fg[p] = mix(Fg[p], gold[1] * hot[1] * 0.9, ring);
                  Fb[p] = mix(Fb[p], gold[2] * hot[2] * 0.9, ring);
                }
              }
            }
            const head = cover(rivet + 0.5 - d);
            if (head > 0) {
              Tr[p] = mix(Tr[p], spec.outline[0], head);
              Tg[p] = mix(Tg[p], spec.outline[1], head);
              Tb[p] = mix(Tb[p], spec.outline[2], head);
              if (wayang) {
                const shine = 0.6 + 0.6 * cover(1 - d / rivet);
                Fr[p] = mix(Fr[p], gold[0] * hot[0] * shine, head);
                Fg[p] = mix(Fg[p], gold[1] * hot[1] * shine, head);
                Fb[p] = mix(Fb[p], gold[2] * hot[2] * shine, head);
              } else {
                // The knotted pin catches a pinprick of light.
                const knot = cover(rivet * 0.38 + 0.5 - d) * 0.55;
                Tr[p] = mix(Tr[p], 0.85, knot);
                Tg[p] = mix(Tg[p], 0.62, knot);
                Tb[p] = mix(Tb[p], 0.35, knot);
              }
            }
          }
      }
    await pause();

    // ---- 11. Develop: lamp × cloth × rods × leather, plus front paint ------------------------
    const pixels = new Uint8ClampedArray(n * 4);
    const rodOpacity = a.rods === 'clear' ? 0.88 : 0.5;
    const horn = WAYANG.horn;
    const outR = new Float32Array(n);
    const outG = new Float32Array(n);
    const outB = new Float32Array(n);
    for (let p = 0; p < n; p++) {
      const t = tex[p];
      const rodK = 1 - rodBack[p] * rodOpacity;
      let sr = t;
      let sg = t;
      let sb = t;
      if (stainTint && t < 1) {
        const loss = 1 - t;
        sg = t - loss * 0.15;
        sb = t - loss * 0.45;
      }
      let r = Lr[p] * sr * rodK * Tr[p] + Fr[p] + grainAdd[p];
      let g = Lg[p] * sg * rodK * Tg[p] + Fg[p] + grainAdd[p];
      let b = Lb[p] * sb * rodK * Tb[p] + Fb[p] + grainAdd[p];
      const front = rodFront[p];
      if (front > 0) {
        const y = Math.floor(p / S);
        const x = p % S;
        const glint = 0.5 + 0.5 * Math.sin((x + y) * 0.9);
        r = mix(r, horn[0] * hot[0] + glint * 0.08, front);
        g = mix(g, horn[1] * hot[1] + glint * 0.06, front);
        b = mix(b, horn[2] * hot[2] + glint * 0.04, front);
      }
      outR[p] = r;
      outG[p] = g;
      outB[p] = b;
    }
    await pause();

    // Soften stair-steps along every cut edge.
    {
      const label = new Int32Array(n);
      for (let p = 0; p < n; p++) label[p] = puppet[p] ? piece[p] : -1;
      const src = [outR.slice(), outG.slice(), outB.slice()];
      const dst = [outR, outG, outB];
      for (let y = 1; y < S - 1; y++)
        for (let x = 1; x < S - 1; x++) {
          const p = y * S + x;
          const l = label[p];
          if (label[p - 1] === l && label[p + 1] === l && label[p - S] === l && label[p + S] === l) continue;
          for (let ch = 0; ch < 3; ch++) {
            const s = src[ch];
            dst[ch][p] =
              (s[p] * 4 + (s[p - 1] + s[p + 1] + s[p - S] + s[p + S]) * 2 + s[p - S - 1] + s[p - S + 1] + s[p + S - 1] + s[p + S + 1]) / 16;
          }
        }
    }

    // ---- 12. The frame ------------------------------------------------------------------------
    const ornament = sheet(S);
    ornament.fillStyle = ornament.strokeStyle = '#ffffff';
    if (trad === 'piying') {
      // Fretwork brackets in each corner of the screen.
      const L = 64 * unit;
      const s = 9 * unit;
      ornament.lineWidth = 4 * unit;
      ornament.lineJoin = 'miter';
      for (const [cx, cy, sx, sy] of [
        [wx, wy, 1, 1],
        [wx + ww, wy, -1, 1],
        [wx, wy + wh, 1, -1],
        [wx + ww, wy + wh, -1, -1],
      ]) {
        ornament.beginPath();
        ornament.moveTo(cx, cy + sy * L);
        ornament.lineTo(cx + sx * s, cy + sy * L);
        ornament.lineTo(cx + sx * s, cy + sy * s);
        ornament.lineTo(cx + sx * L, cy + sy * s);
        ornament.lineTo(cx + sx * L, cy);
        ornament.lineTo(cx, cy);
        ornament.closePath();
        ornament.fill();
        ornament.beginPath();
        ornament.moveTo(cx + sx * s * 2.4, cy + sy * L * 0.72);
        ornament.lineTo(cx + sx * s * 2.4, cy + sy * s * 2.4);
        ornament.lineTo(cx + sx * L * 0.72, cy + sy * s * 2.4);
        ornament.moveTo(cx + sx * s * 2.4, cy + sy * s * 2.4);
        ornament.lineTo(cx + sx * L * 0.42, cy + sy * L * 0.42);
        ornament.stroke();
        ornament.beginPath();
        ornament.arc(cx + sx * L * 0.42, cy + sy * L * 0.42, 5 * unit, 0, TAU);
        ornament.fill();
        ornament.beginPath();
        ornament.moveTo(cx + sx * s * 4, cy + sy * L * 0.55);
        ornament.lineTo(cx + sx * s * 4, cy + sy * s * 4);
        ornament.lineTo(cx + sx * L * 0.55, cy + sy * s * 4);
        ornament.lineWidth = 2.2 * unit;
        ornament.stroke();
        ornament.lineWidth = 4 * unit;
      }
    }
    const orn = ornament.getImageData(0, 0, S, S).data;
    const wood = (along: number, across: number, base: RGB, k: number): RGB => {
      const grain =
        valueNoise(along / (70 * unit), across / (2.2 * unit), seed + 50) * 0.55 +
        valueNoise(along / (16 * unit), across / (0.9 * unit), seed + 51) * 0.2 +
        valueNoise(along / (220 * unit), across / (9 * unit), seed + 52) * 0.25;
      const f = (0.82 + grain * 0.28) * k;
      return [base[0] * f, base[1] * f, base[2] * f];
    };
    const lacquer = hex('#5c1a10');
    const walnut = hex('#4a2c18');
    const kelirRed = hex('#7a1610');
    const goldLeaf = hex('#d6a646');
    const trunkGreen = hex('#8c8a52');
    const trunkBrown = hex('#5a4a2a');
    const gateRadius = 30 * unit;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const p = y * S + x;
        let r = outR[p];
        let g = outG[p];
        let b = outB[p];
        const isIn = inside(x, y);
        const dl = x - wx;
        const dr = wx + ww - 1 - x;
        const dt = y - wy;
        const db = wy + wh - 1 - y;
        if (film) {
          // A rounded film gate and an iris of soft darkness.
          const qx = Math.max(gateRadius - dl, gateRadius - dr, 0);
          const qy = Math.max(gateRadius - dt, gateRadius - db, 0);
          const outside = Math.hypot(qx, qy) - gateRadius;
          const edge = Math.min(dl, dr, dt, db);
          const gate = qx > 0 && qy > 0 ? cover(outside + 0.5) : cover(0.5 - edge);
          const u = (x - S / 2) / (S / 2);
          const v = (y - S / 2) / (S / 2);
          const iris = 1 - cover((Math.hypot(u, v) - 0.72) * 1.3) * 0.55;
          r *= iris;
          g *= iris;
          b *= iris;
          const black = 0.018 + (hash2(x, y, seed + 53) - 0.5) * 0.02;
          r = mix(r, black, gate);
          g = mix(g, black, gate);
          b = mix(b, black, gate);
        } else if (!isIn) {
          let colour: RGB;
          // How far outside the window, and whether this is a rail (top, bottom) or a stile (sides).
          const inward = Math.max(-dl, -dr, -dt, -db);
          const horizontal = Math.max(-dt, -db) >= Math.max(-dl, -dr);
          if (trad === 'wayang') {
            if (y < wy) {
              // The top border of the kelir: red cloth with a gold band of tumpal teeth.
              const weave = 1 + Math.sin(x * 2.2) * Math.sin(y * 2.2) * 0.04 + valueNoise(x / 40, y / 6, seed + 54) * 0.08;
              colour = [kelirRed[0] * weave, kelirRed[1] * weave, kelirRed[2] * weave];
              const fromEdge = wy - 1 - y;
              const tooth = 1 - Math.abs(((x - wx) / (24 * unit)) % 1 * 2 - 1);
              const toothCover = cover(tooth * 13 * unit - fromEdge + 0.5) * cover(fromEdge - 2 * unit + 0.5);
              const line = cover(1.2 * unit + 0.5 - Math.abs(fromEdge - 17 * unit));
              const goldCover = Math.max(toothCover, line, cover(1.6 * unit - fromEdge));
              const lustre = 0.75 + 0.35 * valueNoise(x / 9, y / 9, seed + 55);
              colour = lerp3(colour, [goldLeaf[0] * lustre, goldLeaf[1] * lustre, goldLeaf[2] * lustre], goldCover);
            } else if (y >= wy + wh) {
              // The banana trunk the puppets are planted in.
              const v = (y - (wy + wh)) / (S - wy - wh);
              const round = 0.5 + 0.55 * Math.sin(Math.PI * (v * 0.9 + 0.08));
              const streak = valueNoise(x / (2.2 * unit), y / (40 * unit), seed + 56) * 0.12 + valueNoise(x / (30 * unit), y / (8 * unit), seed + 57) * 0.1;
              const base = lerp3(trunkGreen, trunkBrown, cover(0.5 + valueNoise(x / (90 * unit), v * 3, seed + 58) * 0.6));
              const k = round + streak;
              colour = [base[0] * k, base[1] * k, base[2] * k];
              const front = rodFront[p];
              if (front > 0) colour = lerp3(colour, [horn[0] * 0.8, horn[1] * 0.8, horn[2] * 0.8], front);
            } else colour = wood(y, x, [0.09, 0.06, 0.045], 1);
          } else {
            const base = trad === 'piying' ? lacquer : walnut;
            colour = horizontal ? wood(x, y, base, 1) : wood(y, x, base, 1);
            // A bevel catching the lamp at the inner edge, and a gold bead for piying.
            if (inward < 4 * unit) colour = colour.map((ch) => ch * (1.35 - inward / (4 * unit) * 0.35)) as RGB;
            if (trad === 'piying' && inward > 5 * unit && inward < 8 * unit) {
              const lustre = 0.8 + 0.3 * valueNoise(x / 7, y / 7, seed + 59);
              colour = [goldLeaf[0] * lustre, goldLeaf[1] * lustre, goldLeaf[2] * lustre];
            }
            const outer = Math.min(x, y, S - 1 - x, S - 1 - y);
            if (outer < 3 * unit) colour = colour.map((ch) => ch * 0.6) as RGB;
          }
          // Old frames scuff.
          if (mood.wear > 0.3 && hash2(x >> 2, y >> 2, seed + 60) < (mood.wear - 0.3) * 0.08) colour = colour.map((ch) => ch * 1.4 + 0.04) as RGB;
          [r, g, b] = colour;
        } else if (trad === 'karagoz') {
          // A painted border on the muslin: crimson and cobalt teeth.
          const edge = Math.min(dl, dr, dt, db);
          if (edge >= 4 * unit && edge < 15 * unit) {
            const along = dt === edge || db === edge ? x : y;
            const phase = ((along / (18 * unit)) % 1 + 1) % 1;
            const depth = (edge - 4 * unit) / (11 * unit);
            const up = phase < 0.5 ? phase * 2 : 2 - phase * 2;
            const second = depth > up;
            const ink = second ? KARAGOZ.dyes[3].t : KARAGOZ.dyes[0].t;
            const m = cover(Math.min(edge - 4 * unit, 15 * unit - edge) + 0.5) * 0.8;
            r *= mix(1, ink[0], m);
            g *= mix(1, ink[1], m);
            b *= mix(1, ink[2], m);
          }
        }
        if (trad === 'piying' && orn[p * 4 + 3] > 0 && isIn) {
          const m = orn[p * 4 + 3] / 255;
          const w = wood(x + y, x - y, lacquer, 0.85);
          r = mix(r, w[0], m);
          g = mix(g, w[1], m);
          b = mix(b, w[2], m);
        }
        pixels[p * 4] = r * 255;
        pixels[p * 4 + 1] = g * 255;
        pixels[p * 4 + 2] = b * 255;
        pixels[p * 4 + 3] = 255;
      }
      if (y % 120 === 0) await pause();
    }

    let flats = 0;
    for (const pc of pieces) if (isScenery(pc.cls)) flats++;
    const names: Record<Tradition, string> = {
      piying: 'Chinese piying',
      wayang: 'Javanese wayang kulit',
      karagoz: 'Turkish karagöz',
      film: 'silhouette film',
    };
    return {
      pixels,
      notes: [
        `${names[trad]}: ${boxes.size} puppets in ${pieceCount - flats} pieces, ${joints.length} riveted joints, before ${flats} scenery flats cut from the place`,
        `${a.lamp} light ${a.lampAt === 'even' ? 'evenly diffused' : `from ${a.lampAt}`} on a ${a.screen} screen`,
        `translucency ${Math.round(tr * 100)}%, carving ${Math.round(c * 100)}%, rods ${a.rods}, scenery ${a.scenery}, dressing ${a.dressing}`,
      ],
    };
  },
});
