import { type RGB, clamp01, coarse, fbm, gaussian, hasher, lerp, mixRGB, smooth, valueNoise } from './raster';

/**
 * The painted sky of an anime background: a saturated gradient, a sun glow, sculpted clouds in
 * the manner of the background departments (a blue-grey silhouette, a bright ball offset toward
 * the sun on every puff, a blurred and a crisp layer laid together) and, for the evening city,
 * a hazy skyline of lit windows. It covers the whole frame; the look shows it only where the
 * capture has backdrop.
 */

export interface Palette {
  zenith: RGB;
  mid: RGB;
  horizon: RGB;
  /** The colour of the light itself: rays, rims, highlights, flare. */
  sun: RGB;
  /** A multiply tint for shadow. */
  shade: RGB;
  cloudLit: RGB;
  cloudShade: RGB;
  /** Air: what distance fades toward. */
  haze: RGB;
}

export type Tradition = 'luminous' | 'watercolour' | 'evening';
export type CloudKind = 'clear' | 'puffs' | 'towers' | 'mackerel' | 'veils';

export interface SkyOptions {
  size: number;
  unit: number;
  /** Row of the horizon in pixels. */
  horizon: number;
  sunX: number;
  sunY: number;
  palette: Palette;
  tradition: Tradition;
  clouds: CloudKind;
  /** 0 a few clouds … 1 a crowded sky. */
  amount: number;
  /** Lean and raggedness of the clouds, from the mood. */
  energy: number;
  /** Evening only: the share of skyline windows lit. */
  windows: number;
  random: () => number;
  seed: number;
}

export interface Sky {
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  /** Where cloud or skyline covers the open sky, 0..1. */
  cover: Float32Array;
  /** The sky colour before clouds and skyline, for haze and fog. */
  air: Float32Array[];
  notes: string[];
}

interface Blob {
  x: number;
  y: number;
  rx: number;
  ry: number;
  angle: number;
}
interface Group {
  blobs: Blob[];
  /** The flat underside of the cloud, in pixels; Infinity for none. */
  base: number;
  /** 0 near … 1 far: how much the air swallows it. */
  far: number;
  /** How ragged the edge is. */
  wobble: number;
  /** How thin the cloud is: thin cloud lets the sky through its shade. */
  thin: number;
}

const desat = (c: RGB, k: number): RGB => {
  const l = c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
  return [l + (c[0] - l) * k, l + (c[1] - l) * k, l + (c[2] - l) * k];
};

export function paintSky(o: SkyOptions): Sky {
  const S = o.size, N = S * S, unit = o.unit, P = o.palette, H = o.horizon;
  const r = new Float32Array(N), g = new Float32Array(N), b = new Float32Array(N);
  const cover = new Float32Array(N);
  const noise = valueNoise((o.seed * 7 + 11) | 0);
  const edge = valueNoise((o.seed * 13 + 5) | 0);
  const notes: string[] = [];
  const glowAmount = o.tradition === 'watercolour' ? 0.45 : o.tradition === 'evening' ? 1.05 : 0.9;
  const sunIn = o.sunX > -0.05 * S && o.sunX < 1.05 * S && o.sunY > -0.05 * S && o.sunY < 1.05 * S;
  const discR = 0.026 * S;

  // ---- the gradient, the glow and the sun --------------------------------------------------
  const washField = coarse((x, y) => fbm(noise, x / (110 * unit), y / (70 * unit), 3), S, 6 * unit);
  for (let y = 0; y < S; y++) {
    const t = y / Math.max(1, H);
    for (let x = 0; x < S; x++) {
      let c: RGB;
      if (t <= 1) {
        c = t < 0.55 ? mixRGB(P.zenith, P.mid, smooth(0, 1, t / 0.55) * 0.85 + (t / 0.55) * 0.15) : mixRGB(P.mid, P.horizon, ((t - 0.55) / 0.45) ** 1.25);
      } else c = mixRGB(P.horizon, P.mid, clamp01((y - H) / Math.max(1, S - H)) * 0.32);
      // The sky is brighter on the side the sun is on.
      const side = Math.exp(-Math.abs(x - o.sunX) / (0.55 * S)) * 0.22 * Math.min(1, t);
      c = mixRGB(c, P.horizon, side);
      // A painted sky is laid in by hand and is never quite even.
      const wash = 1 + (washField[y * S + x] - 0.5) * (o.tradition === 'watercolour' ? 0.1 : 0.05);
      const d = Math.hypot(x - o.sunX, y - o.sunY);
      const glow = (0.5 * Math.exp(-d / (0.07 * S)) + 0.38 * Math.exp(-d / (0.3 * S))) * glowAmount;
      const p = y * S + x;
      r[p] = 1 - (1 - c[0] * wash) * (1 - P.sun[0] * glow);
      g[p] = 1 - (1 - c[1] * wash) * (1 - P.sun[1] * glow);
      b[p] = 1 - (1 - c[2] * wash) * (1 - P.sun[2] * glow);
      if (sunIn && o.tradition !== 'watercolour' && d < discR + 2) {
        const k = smooth(discR + 1, discR - 1, d);
        r[p] = lerp(r[p], 1, k); g[p] = lerp(g[p], 0.99, k); b[p] = lerp(b[p], 0.94, k);
      }
    }
  }
  const air = [r.slice(), g.slice(), b.slice()];

  // ---- the clouds ---------------------------------------------------------------------------
  const random = o.random;
  const groups: Group[] = [];
  const lean = (random() - 0.5) * lerp(0.2, 0.7, o.energy);
  const puffGroup = (yb: number, cx: number, w: number, far: number) => {
    const blobs: Blob[] = [];
    const m = 6 + Math.floor(random() * 7);
    for (let k = 0; k < m; k++) {
      const dx = random() * 2 - 1;
      const rad = w * lerp(0.17, 0.3, random()) * (1 - Math.abs(dx) * 0.45);
      blobs.push({ x: cx + dx * w * 0.5, y: yb - rad * lerp(0.25, 1.05, random()), rx: rad, ry: rad * 0.92, angle: 0 });
    }
    groups.push({ blobs, base: yb + (random() - 0.5) * 2 * unit, far, wobble: 0.07, thin: 0 });
  };
  if (o.clouds === 'towers') {
    const n = 1 + Math.round(lerp(1, 2.6, o.amount) + random() * 1.2);
    const order = Array.from({ length: n }, (_, i) => i).sort(() => random() - 0.5);
    for (const t of order) {
      const cx = S * (0.06 + 0.88 * ((t + 0.15 + random() * 0.7) / n));
      const base = H + S * 0.03 * random();
      const height = S * lerp(0.3, 0.62, random()) * lerp(0.8, 1.1, o.amount);
      const width = S * lerp(0.15, 0.3, random());
      const blobs: Blob[] = [];
      const count = 36 + Math.floor(random() * 18);
      for (let k = 0; k < count; k++) {
        const f = random() ** 0.85;
        const spread = width * 0.5 * (1 - 0.55 * f);
        const rad = S * lerp(0.03, 0.072, random()) * (1 - 0.35 * f) * lerp(0.85, 1.15, width / (0.3 * S));
        blobs.push({ x: cx + (random() * 2 - 1) * spread + lean * f * height, y: base - f * height + rad * 0.5, rx: rad, ry: rad * 0.93, angle: 0 });
      }
      for (let k = 0; k < 4; k++) {
        const rad = S * lerp(0.045, 0.075, random());
        blobs.push({ x: cx + lean * height + (random() * 2 - 1) * width * 0.22, y: base - height + rad * 0.6, rx: rad, ry: rad, angle: 0 });
      }
      groups.push({ blobs, base, far: lerp(0.25, 0.55, random()), wobble: 0.05, thin: 0 });
    }
    for (let k = 0; k < Math.round(lerp(1, 3, o.amount)); k++) puffGroup(lerp(0.12 * S, H * 0.7, random()), random() * S, S * lerp(0.08, 0.16, random()), 0.1);
    notes.push(`${n} towering cumulus`);
  } else if (o.clouds === 'puffs') {
    const n = Math.round(lerp(4, 10, o.amount)) + Math.floor(random() * 3);
    const made: { yb: number; cx: number; w: number }[] = [];
    for (let k = 0; k < n; k++) {
      const yb = lerp(0.1 * S, H - 0.03 * S, random() ** 0.8);
      const scale = lerp(1, 0.42, clamp01(yb / Math.max(1, H)));
      made.push({ yb, cx: random() * S, w: S * lerp(0.11, 0.24, random()) * scale });
    }
    // Far clouds first, so nearer ones overlap them.
    made.sort((a, b2) => a.yb - b2.yb).reverse();
    for (const m of made) puffGroup(m.yb, m.cx, m.w, lerp(0.1, 0.55, clamp01(m.yb / Math.max(1, H))));
    notes.push(`${n} fair-weather puffs`);
  } else if (o.clouds === 'mackerel') {
    const rows = Math.round(lerp(8, 14, o.amount));
    const angle = (random() - 0.5) * 0.5;
    const field = valueNoise((o.seed * 29 + 3) | 0);
    const blobs: Blob[] = [];
    for (let j = 0; j < rows; j++) {
      const f = (j + 0.5) / rows;
      const y = 0.03 * S + (H - 0.05 * S) * (1 - (1 - f) ** 1.7);
      const near = 1 - clamp01(y / Math.max(1, H));
      const size = S * lerp(0.011, 0.05, near ** 1.2);
      const spacing = size * lerp(1.45, 1.9, random());
      for (let x = -random() * spacing; x < S + spacing; x += spacing * lerp(0.8, 1.2, random())) {
        const px = x + (random() - 0.5) * spacing * 0.4, py = y + (random() - 0.5) * size * 0.5;
        if (fbm(field, px / (0.28 * S), py / (0.16 * S), 3) < lerp(0.5, 0.4, o.amount)) continue;
        const lobes = 2 + Math.floor(random() * 3);
        const along = angle + (random() - 0.5) * 0.25;
        for (let q = 0; q < lobes; q++) {
          const off = (q - (lobes - 1) / 2) * size * 0.42 + (random() - 0.5) * size * 0.15;
          const rad = size * lerp(0.2, 0.34, random());
          blobs.push({ x: px + Math.cos(along) * off, y: py + Math.sin(along) * off + (random() - 0.5) * size * 0.12, rx: rad * 1.25, ry: rad * 0.8, angle: along });
        }
      }
    }
    groups.push({ blobs, base: Infinity, far: 0.2, wobble: 0.2, thin: 0.3 });
    notes.push('a mackerel sky');
  }

  for (const group of groups) composite(group);

  if (o.clouds === 'veils') {
    const angle = -0.25 + (random() - 0.5) * 0.4;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const streak = valueNoise((o.seed * 41 + 9) | 0), patch = valueNoise((o.seed * 43 + 1) | 0);
    for (let y = 0; y < Math.min(S, H + 4); y++)
      for (let x = 0; x < S; x++) {
        const u = x * ca + y * sa, v = -x * sa + y * ca;
        const s = fbm(streak, u / (0.3 * S), v / (0.016 * S), 4);
        const hook = fbm(streak, u / (0.09 * S) + 40, v / (0.03 * S), 2);
        const m = smooth(0.5, 0.78, s * 0.8 + hook * 0.2) * smooth(0.3, 0.62, fbm(patch, x / (0.3 * S), y / (0.22 * S), 3)) * smooth(H, H * 0.55, y);
        if (m <= 0.002) continue;
        const p = y * S + x;
        const k = m * lerp(0.55, 0.85, o.amount);
        r[p] = lerp(r[p], P.cloudLit[0], k); g[p] = lerp(g[p], P.cloudLit[1], k); b[p] = lerp(b[p], P.cloudLit[2], k);
        cover[p] = Math.max(cover[p], m * 0.5);
      }
    notes.push('veils of cirrus');
  }

  if (o.clouds === 'clear') {
    // One contrail ruled across the clear sky, older and wider toward one end.
    const x0 = lerp(-0.1, 0.4, random()) * S, y0 = lerp(0.08, 0.3, random()) * S;
    const x1 = lerp(0.65, 1.1, random()) * S, y1 = y0 + lerp(-0.12, 0.2, random()) * S;
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy;
    const fresh = random() < 0.5;
    for (let y = Math.max(0, Math.floor(Math.min(y0, y1) - 10 * unit)); y < Math.min(S, Math.ceil(Math.max(y0, y1) + 10 * unit)); y++)
      for (let x = 0; x < S; x++) {
        const t = clamp01(((x - x0) * dx + (y - y0) * dy) / len2);
        const d = Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t));
        const age = fresh ? t : 1 - t;
        const w = lerp(1, 4.2, age) * unit;
        const a = Math.exp(-((d / w) ** 2)) * lerp(0.9, 0.2, age) * smooth(0, 0.04, t) * smooth(1, 0.96, t);
        if (a < 0.003) continue;
        const p = y * S + x;
        r[p] = lerp(r[p], P.cloudLit[0], a); g[p] = lerp(g[p], P.cloudLit[1], a); b[p] = lerp(b[p], P.cloudLit[2], a);
      }
    notes.push('a clear sky with one contrail');
  }

  if (o.tradition === 'evening') skyline();

  return { r, g, b, cover, air, notes };

  /**
   * Lay one cloud over the sky. Every puff is a dome; together they make one lumpy height field
   * whose slopes are lit by the sun, so the mass reads as one sculpted body with a lit side, a
   * shaded side and cauliflower lobes, painted as a crisp layer over a softened one.
   */
  function composite(group: Group) {
    if (!group.blobs.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, cxs = 0, cys = 0;
    for (const blob of group.blobs) {
      const reach = Math.max(blob.rx, blob.ry) * 1.2 + 3;
      minX = Math.min(minX, blob.x - reach); maxX = Math.max(maxX, blob.x + reach);
      minY = Math.min(minY, blob.y - reach); maxY = Math.max(maxY, blob.y + reach);
      cxs += blob.x; cys += blob.y;
    }
    cxs /= group.blobs.length; cys /= group.blobs.length;
    const pad = Math.ceil(8 * unit);
    const x0 = Math.max(0, Math.floor(minX) - pad), x1 = Math.min(S - 1, Math.ceil(maxX) + pad);
    const y0 = Math.max(0, Math.floor(minY) - pad), y1 = Math.min(S - 1, Math.ceil(Math.min(maxY, group.base + 3)) + pad);
    if (x1 < x0 || y1 < y0) return;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const cov = new Float32Array(w * h), hgt = new Float32Array(w * h);
    const scale = 6 * unit;
    for (const blob of group.blobs) {
      const cos = Math.cos(blob.angle), sin = Math.sin(blob.angle);
      const reach = Math.max(blob.rx, blob.ry) * 1.2 + 2;
      const bx0 = Math.max(x0, Math.floor(blob.x - reach)), bx1 = Math.min(x1, Math.ceil(blob.x + reach));
      const by0 = Math.max(y0, Math.floor(blob.y - reach)), by1 = Math.min(y1, Math.ceil(blob.y + reach));
      const rmin = Math.min(blob.rx, blob.ry);
      const lift = blob.rx * 0.15 * (edge(blob.x * 0.37, blob.y * 0.41) - 0.5);
      for (let y = by0; y <= by1; y++)
        for (let x = bx0; x <= bx1; x++) {
          const dx = x - blob.x, dy = y - blob.y;
          const u = dx * cos + dy * sin, v = -dx * sin + dy * cos;
          const e = Math.sqrt((u / blob.rx) ** 2 + (v / blob.ry) ** 2) + (edge(x / scale, y / scale) - 0.5) * group.wobble;
          const c = clamp01((1 - e) * rmin + 0.5);
          if (c <= 0) continue;
          const i = (y - y0) * w + (x - x0);
          if (c > cov[i]) cov[i] = c;
          const z = rmin * Math.sqrt(Math.max(0, 1 - Math.min(1, e) ** 2)) + lift;
          if (z > hgt[i]) hgt[i] = z;
        }
    }
    if (group.base < Infinity)
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const flat = clamp01((group.base + (edge(x / (14 * unit), 3.7) - 0.5) * 3 * unit - y) / (1.2 * unit) + 0.5);
          cov[(y - y0) * w + (x - x0)] *= flat;
        }
      }
    // The sun as the cloud sees it: off to the side it lies in the picture, and always a little above.
    let tx = o.sunX - cxs, ty = o.sunY - cys;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    let Lx = tx * 0.85, Ly = ty * 0.85 - 0.35, Lz = 0.5;
    const Lm = Math.hypot(Lx, Ly, Lz);
    Lx /= Lm; Ly /= Lm; Lz /= Lm;
    const watercolour = o.tradition === 'watercolour';
    const hs = gaussian(hgt, w, h, 1.2 * unit);
    const lit = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (cov[i] <= 0) continue;
        const gx = (hs[i + 1] - hs[i - 1]) * 0.5, gy = (hs[i + w] - hs[i - w]) * 0.5;
        const nl = Math.hypot(gx, gy, 1);
        const lam = (-gx * Lx - gy * Ly + Lz) / nl;
        lit[i] = watercolour ? smooth(-0.35, 0.55, lam) : smooth(0.02, 0.22, lam) * 0.82 + smooth(0.45, 0.8, lam) * 0.18;
      }
    const soft = gaussian(lit, w, h, 2.8 * unit);
    const halo = gaussian(cov, w, h, 2.2 * unit);
    const top = Math.max(minY, y0), bottom = Math.min(group.base, maxY);
    for (let y = y0; y <= y1; y++) {
      const vy = clamp01((y - top) / Math.max(1, bottom - top));
      const dark = lerp(1.06, watercolour ? 0.9 : 0.8, vy * vy);
      const sr = P.cloudShade[0] * dark, sg = P.cloudShade[1] * dark, sb = P.cloudShade[2] * lerp(1.06, 0.94, vy * vy);
      for (let x = x0; x <= x1; x++) {
        const i = (y - y0) * w + (x - x0), p = y * S + x;
        const a = cov[i];
        if (watercolour && a < 0.5) {
          // The blue wash pools and dries darker against the white paper of the cloud.
          const ring = clamp01((halo[i] - a) * 2.4);
          if (ring > 0) { const k = 1 - 0.16 * ring; r[p] *= k; g[p] *= k; b[p] *= k * 1.02; }
        }
        if (a <= 0.002) continue;
        const L = clamp01(lit[i] * (watercolour ? 0.6 : 0.7) + soft[i] * (watercolour ? 0.4 : 0.3));
        let cr = lerp(sr, P.cloudLit[0], L), cg = lerp(sg, P.cloudLit[1], L), cb = lerp(sb, P.cloudLit[2], L);
        if (group.thin > 0) { cr = lerp(cr, r[p], group.thin * (1 - L)); cg = lerp(cg, g[p], group.thin * (1 - L)); cb = lerp(cb, b[p], group.thin * (1 - L)); }
        // A silver edge where the cloud thins toward the sun.
        const near = Math.exp(-Math.hypot(x - o.sunX, y - o.sunY) / (0.28 * S));
        const rim = clamp01((a - halo[i]) * 2.2) * (0.15 + near) * (watercolour ? 0.3 : 0.8);
        cr = 1 - (1 - cr) * (1 - P.sun[0] * rim); cg = 1 - (1 - cg) * (1 - P.sun[1] * rim); cb = 1 - (1 - cb) * (1 - P.sun[2] * rim);
        // Far clouds sink into the air.
        const ar = air[0][p], ag = air[1][p], ab = air[2][p];
        cr = lerp(cr, ar, group.far * 0.45); cg = lerp(cg, ag, group.far * 0.45); cb = lerp(cb, ab, group.far * 0.45);
        r[p] = lerp(r[p], cr, a); g[p] = lerp(g[p], cg, a); b[p] = lerp(b[p], cb, a);
        if (a > cover[p]) cover[p] = a;
      }
    }
  }

  /** The evening city: two hazy rows of buildings on the horizon, their windows lit warm. */
  function skyline() {
    const hash = hasher((o.seed * 53 + 17) | 0);
    const fogTop = H + 0.02 * S, fogSpan = 0.28 * S;
    const glow = mixRGB(P.horizon, P.sun, 0.35);
    const layers = [
      { lift: 0.55, colour: desat(mixRGB(mixRGB(P.horizon, P.zenith, 0.5), P.mid, 0.35), 0.55), cell: [3, 4], win: [1, 2], rate: 0.7 },
      { lift: 1, colour: desat(mixRGB(mixRGB(P.zenith, P.mid, 0.25), [0.24, 0.2, 0.26], 0.4), 0.5), cell: [4.5, 6], win: [2, 3], rate: 1 },
    ];
    let lights = 0;
    for (const layer of layers) {
      const tops = new Float32Array(S).fill(Infinity);
      const starts = new Float32Array(S), ids = new Int32Array(S).fill(-1);
      const antennas: [number, number][] = [];
      let x = -random() * 20 * unit, k = 0;
      while (x < S) {
        const bw = S * lerp(0.022, 0.07, random());
        const tall = random() < 0.16 ? lerp(1.6, 2.6, random()) : 1;
        const bh = S * lerp(0.015, 0.07, random()) * tall * layer.lift;
        const top = H - bh;
        const step = random() < 0.3 ? lerp(0.25, 0.4, random()) : 0;
        for (let xi = Math.max(0, Math.floor(x)); xi < Math.min(S, Math.floor(x + bw)); xi++) {
          const inner = step && Math.abs(xi - (x + bw / 2)) < bw * step;
          const t = inner ? top - bh * 0.25 : top;
          if (t < tops[xi]) { tops[xi] = t; starts[xi] = x; ids[xi] = k; }
        }
        if (tall > 1 && random() < 0.6) antennas.push([Math.floor(x + bw / 2), top - (step ? bh * 0.25 : 0)]);
        x += bw + (random() < 0.3 ? random() * 7 * unit : 0);
        k++;
      }
      const cw = layer.cell[0] * unit, ch = layer.cell[1] * unit, ww = layer.win[0] * unit, wh = layer.win[1] * unit;
      for (let xi = 0; xi < S; xi++) {
        if (tops[xi] === Infinity) continue;
        for (let y = Math.max(0, Math.floor(tops[xi])); y < S; y++) {
          const p = y * S + xi;
          const fog = smooth(fogTop, fogTop + fogSpan, y);
          const edgeK = clamp01(y - tops[xi] + 0.5);
          let cr = lerp(layer.colour[0], glow[0], fog * 0.7), cg = lerp(layer.colour[1], glow[1], fog * 0.7), cb = lerp(layer.colour[2], glow[2], fog * 0.7);
          const gx = Math.floor((xi - starts[xi]) / cw), gy = Math.floor((y - tops[xi] - 2 * unit) / ch);
          const lx = xi - starts[xi] - gx * cw, ly = y - tops[xi] - 2 * unit - gy * ch;
          if (gy >= 0 && lx >= (cw - ww) / 2 && lx < (cw + ww) / 2 && ly < wh && fog < 0.9) {
            const v = hash(ids[xi] * 131 + gx, gy + layer.lift * 1000);
            if (v < o.windows * layer.rate) {
              const tone = hash(gx + 7, ids[xi] * 3 + gy);
              const wk = (1 - fog) * lerp(0.75, 1, tone);
              cr = lerp(cr, 1, wk); cg = lerp(cg, lerp(0.74, 0.9, tone), wk); cb = lerp(cb, lerp(0.42, 0.66, tone), wk);
              lights++;
            }
          }
          r[p] = lerp(r[p], cr, edgeK); g[p] = lerp(g[p], cg, edgeK); b[p] = lerp(b[p], cb, edgeK);
          cover[p] = Math.max(cover[p], edgeK);
        }
      }
      for (const [ax, ay] of antennas) {
        const len = Math.round(lerp(6, 14, random()) * unit);
        for (let y = Math.max(0, Math.floor(ay - len)); y < Math.min(S, Math.ceil(ay)); y++) {
          const p = y * S + Math.min(S - 1, Math.max(0, ax));
          r[p] = lerp(r[p], layer.colour[0], 0.8); g[p] = lerp(g[p], layer.colour[1], 0.8); b[p] = lerp(b[p], layer.colour[2], 0.8);
        }
        const ty = Math.floor(ay - len);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const yy = ty + dy, xx = ax + dx;
            if (yy < 0 || yy >= S || xx < 0 || xx >= S) continue;
            const k = dx === 0 && dy === 0 ? 1 : 0.35;
            const p = yy * S + xx;
            r[p] = lerp(r[p], 1, k); g[p] = lerp(g[p], 0.3, k); b[p] = lerp(b[p], 0.25, k);
          }
      }
    }
    notes.push(`a dusk skyline with ${lights > 400 ? 'hundreds of' : 'a scatter of'} lit windows`);
  }
}
