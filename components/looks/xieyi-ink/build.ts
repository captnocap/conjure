import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

/**
 * Xieyi: Chinese freehand ink painting, re-brushed from the capture.
 *   1. Paper first (xuan, hemp, silk, an old scroll or gold-flecked sheet); ink only darkens it.
 *   2. Ink density comes from the plain-lit pass and material darkness. It is snapped to the five
 *      inks (clear, pale, heavy, thick, burnt) and laid as broad side-loaded wash strokes running
 *      along each surface (tangents from the normals), then bled into the paper with tide lines.
 *   3. One permitted colour goes down the same way, under the ink, on the most colourful thing.
 *   4. Contours are traced from identity, depth and normal breaks and broken into calligraphic
 *      strokes: pressure, a wet core, bristles that run dry into flying white. The lit side is
 *      mostly left out, so forms are suggested rather than outlined.
 *   5. Ground and set shrink to a pale shadow pool, a dry ground stroke and a few moss dots, plus
 *      a few pale, broken strokes along the set's strongest edges (what stands in front of what,
 *      the sharpest folds, firmest near the cast) and broken pale washes on its darkest masses.
 *   6. An inscription is brushed into the emptiest paper and the seals are pressed.
 *
 * Every mark is sized to what it describes. A thing's extent in pixels sets its presence: a figure
 * across a room is laid in whole inside its own silhouette, each stroke as wide as the limb it lands
 * on, so it stays a few small decisive marks instead of vanishing or spreading into a blot. When a
 * thing fills the frame the set stays all but bare, as on the plinth.
 */

type RGB = readonly [number, number, number];
interface Pt {
  x: number;
  y: number;
}

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
const fbm = (x: number, y: number, s: number) =>
  vnoise(x, y, s) * 0.55 + vnoise(x * 2.07, y * 2.07, s + 31) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 77) * 0.15;

// ── Buffers ────────────────────────────────────────────────────────────────────────────────

function boxLine(src: Float32Array, dst: Float32Array, size: number, r: number, horizontal: boolean) {
  const norm = 1 / (2 * r + 1);
  const step = horizontal ? 1 : size;
  for (let line = 0; line < size; line++) {
    const base = horizontal ? line * size : line;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[base + Math.min(size - 1, Math.max(0, k)) * step];
    for (let i = 0; i < size; i++) {
      dst[base + i * step] = sum * norm;
      sum += src[base + Math.min(size - 1, i + r + 1) * step] - src[base + Math.max(0, i - r) * step];
    }
  }
}
/** Two box passes each way: close enough to a gaussian, linear in the radius. */
function blur(src: Float32Array, size: number, radius: number): Float32Array {
  const r = Math.round(radius);
  const a = new Float32Array(src.length);
  if (r < 1) {
    a.set(src);
    return a;
  }
  const b = new Float32Array(src.length);
  boxLine(src, a, size, r, true);
  boxLine(a, b, size, r, false);
  boxLine(b, a, size, r, true);
  boxLine(a, b, size, r, false);
  return b;
}
/** Chamfer distance in pixels to the nearest set pixel of the mask. */
function distanceTo(mask: Uint8Array, size: number): Float32Array {
  const d = new Float32Array(size * size);
  const D = 1.4142;
  for (let p = 0; p < d.length; p++) d[p] = mask[p] ? 0 : 1e6;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      let v = d[p];
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[p - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[p - size] + 1);
        if (x > 0) v = Math.min(v, d[p - size - 1] + D);
        if (x < size - 1) v = Math.min(v, d[p - size + 1] + D);
      }
      d[p] = v;
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const p = y * size + x;
      let v = d[p];
      if (v === 0) continue;
      if (x < size - 1) v = Math.min(v, d[p + 1] + 1);
      if (y < size - 1) {
        v = Math.min(v, d[p + size] + 1);
        if (x < size - 1) v = Math.min(v, d[p + size + 1] + D);
        if (x > 0) v = Math.min(v, d[p + size - 1] + D);
      }
      d[p] = v;
    }
  return d;
}
/** Average within one identity only, so tone never smears across an object's edge. */
function smoothWithin(src: Float32Array, ids: Uint8Array, size: number, r: number): Float32Array {
  const a = new Float32Array(src.length), b = new Float32Array(src.length);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x, id = ids[p];
      let sum = 0, n = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(size - 1, x + r); k++)
        if (ids[y * size + k] === id) {
          sum += src[y * size + k];
          n++;
        }
      a[p] = sum / n;
    }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = y * size + x, id = ids[p];
      let sum = 0, n = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(size - 1, y + r); k++)
        if (ids[k * size + x] === id) {
          sum += a[k * size + x];
          n++;
        }
      b[p] = sum / n;
    }
  return b;
}

// ── Paths ──────────────────────────────────────────────────────────────────────────────────

function catmull(pts: Pt[], sub: number): Pt[] {
  if (pts.length < 3) return pts.map((p) => ({ ...p }));
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push({ ...pts[pts.length - 1] });
  return out;
}
/** Equal arc-length samples: without this, flying white would change frequency with stroke length. */
function resample(pts: Pt[], ds: number): Pt[] {
  const out: Pt[] = [{ ...pts[0] }];
  let need = ds;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    let at = 0;
    while (l - at >= need) {
      at += need;
      out.push({ x: a.x + ((b.x - a.x) * at) / l, y: a.y + ((b.y - a.y) * at) / l });
      need = ds;
    }
    need -= l - at;
  }
  const last = pts[pts.length - 1], tail = out[out.length - 1];
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > ds * 0.3) out.push({ ...last });
  return out;
}
const lengthOf = (pts: Pt[]) => {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return l;
};
/** The part of a polyline between two arc lengths. */
function slice(pts: Pt[], from: number, to: number): Pt[] {
  const out: Pt[] = [];
  let at = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l === 0) continue;
    const lerp = (d: number): Pt => ({ x: a.x + ((b.x - a.x) * (d - at)) / l, y: a.y + ((b.y - a.y) * (d - at)) / l });
    if (!out.length && at + l >= from) out.push(lerp(Math.max(from, at)));
    if (out.length && at + l > to) {
      out.push(lerp(to));
      return out;
    }
    if (out.length && at + l >= from) out.push({ ...b });
    at += l;
  }
  return out;
}

// ── The brush ──────────────────────────────────────────────────────────────────────────────

interface Brush {
  w: number;
  tone: number;
  dry: number;
  head: number;
  tail: number;
  blunt: number;
  spread: number;
  seed: number;
}

/**
 * One loaded brush stroke on a canvas: a wet core that narrows as the ink runs out, and a fan of
 * bristles, each one continuous path that breaks where the hair runs dry (flying white).
 */
function brush(ctx: CanvasRenderingContext2D, raw: Pt[], b: Brush, ink: string) {
  if (raw.length < 2 || b.w < 0.3) return;
  const ds = Math.max(1.2, Math.min(3, b.w * 0.25 + 0.8));
  const pts = resample(catmull(raw, 4), ds);
  const n = pts.length;
  if (n < 2) return;
  const tx = new Float32Array(n), ty = new Float32Array(n), prof = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)];
    const l = Math.hypot(c.x - a.x, c.y - a.y) || 1;
    tx[i] = (c.x - a.x) / l;
    ty[i] = (c.y - a.y) / l;
    const q = i / (n - 1);
    prof[i] = mix(b.blunt, 1, smooth(0, b.head, q)) * (1 - 0.8 * smooth(1 - b.tail, 1, q)) * (0.88 + 0.12 * vnoise(i * ds * 0.03, b.seed, 11)) * (0.78 + 0.4 * vnoise(i * ds * 0.009, b.seed + 1, 13));
  }
  const half = (i: number) => b.w * 0.5 * prof[i] * (1 - 0.85 * b.dry * Math.pow(i / (n - 1), 0.8));
  ctx.fillStyle = `rgba(${ink},${(b.tone * 0.72).toFixed(3)})`;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const h = half(i);
    if (i === 0) ctx.moveTo(pts[i].x + ty[i] * h, pts[i].y - tx[i] * h);
    else ctx.lineTo(pts[i].x + ty[i] * h, pts[i].y - tx[i] * h);
  }
  for (let i = n - 1; i >= 0; i--) {
    const h = half(i);
    ctx.lineTo(pts[i].x - ty[i] * h, pts[i].y + tx[i] * h);
  }
  ctx.closePath();
  ctx.fill();
  if (b.blunt > 0.35) {
    // The hidden-tip entry leaves a rounded press of ink where the brush first lands.
    const r0 = half(0);
    ctx.beginPath();
    ctx.ellipse(pts[0].x, pts[0].y, r0 * 1.02, r0 * 0.9, Math.atan2(ty[0], tx[0]), 0, Math.PI * 2);
    ctx.fill();
  }
  const hairs = Math.max(4, Math.min(18, Math.round(b.w / 1.3)));
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (let k = 0; k < hairs; k++) {
    const f = ((k + 0.5) / hairs) * 2 - 1 + (hash(k, b.seed, 5) - 0.5) / hairs;
    ctx.lineWidth = Math.max(0.45, (b.w / hairs) * 1.3);
    ctx.strokeStyle = `rgba(${ink},${(b.tone * (0.5 + 0.4 * hash(k, b.seed, 9))).toFixed(3)})`;
    ctx.beginPath();
    let on = false;
    for (let i = 0; i < n; i++) {
      const q = i / (n - 1);
      const cut = b.dry * Math.pow(q, 1.2) * 0.95 + 0.05 + Math.abs(f) * b.dry * 0.3;
      if (vnoise(k * 1.9 + b.seed * 0.37, i * ds * 0.022, 23) < cut || prof[i] < 0.05) {
        on = false;
        continue;
      }
      const off = f * 0.475 * b.w * prof[i] * b.spread;
      const x = pts[i].x - ty[i] * off, y = pts[i].y + tx[i] * off;
      if (on) ctx.lineTo(x, y);
      else {
        ctx.moveTo(x, y);
        on = true;
      }
    }
    ctx.stroke();
  }
}

/**
 * A broad wash stroke stamped into a density buffer as a ribbon: side-loaded (dark on one edge,
 * watery on the other), streaked by the bristles, with ragged edges where the paper drinks, a
 * firm press where it lands and flying white where the brush runs dry.
 */
function washStroke(
  buf: Float32Array, size: number, path: Pt[], w: number, tone: number, side: number, sideSign: number,
  dry: number, soft: number, seed: number, random: () => number, cap: (p: number) => number,
) {
  const pts = path.length > 1 ? resample(path, 1.6) : path;
  const n = pts.length;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = w * 0.7 + 3;
  const x0 = Math.max(0, Math.floor(minX - pad)), y0 = Math.max(0, Math.floor(minY - pad));
  const x1 = Math.min(size - 1, Math.ceil(maxX + pad)), y1 = Math.min(size - 1, Math.ceil(maxY + pad));
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw <= 0 || bh <= 0) return;
  const local = new Float32Array(bw * bh);
  const lanes = Math.max(5, Math.round(w / 2));
  const table = new Float32Array(lanes * n);
  for (let k = 0; k < lanes; k++) for (let i = 0; i < n; i++) table[k * n + i] = vnoise(k * 1.7 + seed, i * 0.045, 41);
  const blunt = 0.7 + random() * 0.25, taper = 0.25 + random() * 0.5, swell = random() * 6.28;
  // The brush lands at a slant: a flat, chiselled press rather than a rounded cap.
  const chisel = (random() - 0.5) * 1.8, lift = random() * 0.25;
  for (let i = 0; i < n; i++) {
    const q = n > 1 ? i / (n - 1) : 0.5;
    const h = w * 0.5 * mix(blunt, 1, smooth(0, 0.1, q)) * (1 - taper * smooth(0.65, 1, q)) * (0.88 + 0.12 * Math.sin(q * 5 + swell));
    if (h < 0.6) continue;
    let tx = 1, ty = 0;
    if (n > 1) {
      const a = pts[Math.max(0, i - 2)], c = pts[Math.min(n - 1, i + 2)];
      const l = Math.hypot(c.x - a.x, c.y - a.y) || 1;
      tx = (c.x - a.x) / l;
      ty = (c.y - a.y) / l;
    }
    const px = -ty, py = tx, cx = pts[i].x, cy = pts[i].y;
    const cut = dry * Math.pow(q, 1.1) * 0.85;
    // Ragged edges, different on each side: the paper drinks unevenly.
    const ragA = (vnoise(i * 0.09, seed, 51) - 0.5) * 0.35, ragB = (vnoise(i * 0.09, seed + 3, 51) - 0.5) * 0.35;
    const back = i === 0 ? h * 0.7 : 1.7, front = i === n - 1 ? h * 0.2 : 1.7;
    // Splat across the sample's own footprint (a thin slab of the ribbon), not its bounding box.
    const a0 = i === 0 ? -back : -1.1, a1 = i === n - 1 ? front : 1.1;
    for (let al = a0; al <= a1; al += 0.7) {
      for (let lat = -h; lat <= h; lat += 0.7) {
        const s = lat / h;
        if (i === 0 && al < -back * clamp01(0.5 + 0.5 * s * chisel + lift * (s * s - 0.5))) continue;
        const rr = Math.abs(s) + (s < 0 ? ragA : ragB);
        if (rr >= 1) continue;
        const xx = Math.round(cx + tx * al + px * lat), yy = Math.round(cy + ty * al + py * lat);
        if (xx < x0 || xx > x1 || yy < y0 || yy > y1) continue;
        const edge = rr < 1 - soft ? 1 : 1 - smooth(1 - soft, 1, rr);
        const grad = 1 - side * 0.5 * (1 + s * sideSign);
        let lane = ((s + 1) * 0.5 * lanes) | 0;
        if (lane >= lanes) lane = lanes - 1;
        else if (lane < 0) lane = 0;
        const nv = table[lane * n + i];
        const v = tone * grad * edge * (nv < cut ? 0.08 : 0.78 + 0.44 * (nv - 0.5));
        const k = (yy - y0) * bw + (xx - x0);
        if (v > local[k]) local[k] = v;
      }
    }
  }
  for (let yy = 0; yy < bh; yy++)
    for (let xx = 0; xx < bw; xx++) {
      const v = local[yy * bw + xx];
      if (v <= 0) continue;
      const p = (yy + y0) * size + xx + x0;
      // Overlaps darken, but only so far past what this part of the picture asks for.
      const limit = Math.max(buf[p], cap(p));
      buf[p] = Math.min(limit, buf[p] + v * (1 - buf[p]));
    }
}

// ── Script and seals ───────────────────────────────────────────────────────────────────────

interface GlyphStroke {
  kind: 'line' | 'dot' | 'press';
  pts: Pt[];
}
/** An invented character: radicals of horizontals, verticals, sweeps and dots in a square cell. */
function makeGlyph(r: () => number): GlyphStroke[] {
  const strokes: GlyphStroke[] = [];
  const P = (x: number, y: number): Pt => ({ x, y });
  const boxes: [number, number, number, number][] = [];
  const layout = r();
  if (layout < 0.3) boxes.push([0.12, 0.08, 0.88, 0.92]);
  else if (layout < 0.6) {
    const s = 0.36 + r() * 0.14;
    boxes.push([0.06, 0.14, s, 0.88], [s + 0.07, 0.04, 0.94, 0.96]);
  } else if (layout < 0.85) {
    const s = 0.38 + r() * 0.12;
    boxes.push([0.18, 0.04, 0.82, s], [0.08, s + 0.07, 0.92, 0.96]);
  } else {
    strokes.push({ kind: 'line', pts: [P(0.14, 0.12), P(0.13, 0.55), P(0.15, 0.92)] });
    strokes.push({ kind: 'line', pts: [P(0.16, 0.12), P(0.6, 0.1), P(0.86, 0.09), P(0.84, 0.6), P(0.78, 0.9)] });
    boxes.push([0.3, 0.3, 0.7, 0.76]);
  }
  for (const [x0, y0, x1, y1] of boxes) {
    const count = 2 + Math.floor(r() * 3);
    const w = x1 - x0, h = y1 - y0;
    for (let i = 0; i < count; i++) {
      const band = y0 + h * ((i + 0.25 + r() * 0.5) / count);
      const kind = r();
      if (kind < 0.26) {
        const a = x0 + w * r() * 0.15, b = x1 - w * r() * 0.15;
        strokes.push({ kind: 'line', pts: [P(a, band + h * 0.02), P((a + b) / 2, band - h * 0.01), P(b, band - h * 0.04)] });
      } else if (kind < 0.42) {
        const x = x0 + w * (0.35 + r() * 0.3);
        strokes.push({ kind: 'line', pts: [P(x, y0 + h * r() * 0.15), P(x + w * 0.02, y0 + h * 0.5), P(x, y1 - h * r() * 0.1)] });
      } else if (kind < 0.54) {
        const x = x0 + w * (0.55 + r() * 0.35), y = y0 + h * r() * 0.3;
        strokes.push({ kind: 'line', pts: [P(x, y), P(x - w * 0.14, y + h * 0.32), P(x0 + w * r() * 0.15, Math.min(y1, y + h * 0.66))] });
      } else if (kind < 0.64) {
        const x = x0 + w * (0.2 + r() * 0.3), y = y0 + h * r() * 0.3;
        strokes.push({ kind: 'press', pts: [P(x, y), P(x + w * 0.25, y + h * 0.36), P(x1, Math.min(y1, y + h * 0.62))] });
      } else if (kind < 0.82) {
        const x = x0 + w * (0.15 + r() * 0.7), y = y0 + h * (0.05 + r() * 0.8);
        strokes.push({ kind: 'dot', pts: [P(x, y), P(x + w * 0.07 * (r() > 0.5 ? 1 : -1), y + h * 0.11)] });
      } else if (kind < 0.92) {
        strokes.push({ kind: 'line', pts: [P(x0 + w * 0.12, band), P(x1 - w * 0.1, band - h * 0.03), P(x1 - w * 0.14, Math.min(y1, band + h * 0.45))] });
      } else {
        const x = x0 + w * (0.45 + r() * 0.3);
        strokes.push({ kind: 'line', pts: [P(x, y0 + h * 0.05), P(x, y1 - h * 0.12), P(x - w * 0.2, y1 - h * 0.22)] });
      }
    }
  }
  return strokes;
}

/** Seal-script marks: square, meandering, all right angles, like characters cut in stone. */
function sealMarks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: () => number) {
  const L = 4;
  const at = (i: number) => 0.15 + (i / (L - 1)) * 0.7;
  const walks = 2 + Math.floor(r() * 2);
  for (let k = 0; k < walks; k++) {
    let i = Math.floor(r() * L), j = Math.floor(r() * L);
    ctx.beginPath();
    ctx.moveTo(x + at(i) * w, y + at(j) * h);
    let across = r() > 0.5;
    const steps = 2 + Math.floor(r() * 3);
    for (let s = 0; s < steps; s++) {
      const move = (r() > 0.5 ? 1 : -1) * (1 + Math.floor(r() * 2));
      if (across) i = Math.max(0, Math.min(L - 1, i + move));
      else j = Math.max(0, Math.min(L - 1, j + move));
      ctx.lineTo(x + at(i) * w, y + at(j) * h);
      across = !across;
    }
    ctx.stroke();
  }
  if (r() > 0.55) {
    const j = Math.floor(r() * L);
    ctx.beginPath();
    ctx.moveTo(x + at(0) * w, y + at(j) * h);
    ctx.lineTo(x + at(L - 1) * w, y + at(j) * h);
    ctx.stroke();
  }
}

// ── The answers ────────────────────────────────────────────────────────────────────────────

interface Manner {
  line: number; lineW: number; crease: number; wash: number; washTone: number; washW: number; washLen: number;
  side: number; wet: number; empty: number; dry: number; spatter: number; cun: number; dots: number; ground: number;
  overflow: number; accent: number; mist: number; spread: number;
  /** How many pale broken strokes suggest the set, and how much pale wash it takes. */
  setLine: number; setWash: number;
  /** The share of the set's strokes laid as soft wet ribbons of wash rather than lines. */
  setSoft: number;
}
const MANNERS: Record<'sparse' | 'bold' | 'splashed' | 'boneless' | 'dryline' | 'misty', Manner> = {
  sparse: { line: 0.85, lineW: 1.15, crease: 0.15, wash: 0.55, washTone: 0.85, washW: 1.25, washLen: 1.4, side: 0.35, wet: 0.05, empty: 0.28, dry: 0.05, spatter: 0.1, cun: 0.15, dots: 0.8, ground: 0.7, overflow: 3, accent: 0.75, mist: 0.2, spread: 0.75, setLine: 0.8, setWash: 0.55, setSoft: 0 },
  bold: { line: 0.95, lineW: 1.35, crease: 0.4, wash: 0.95, washTone: 0.9, washW: 1, washLen: 1, side: 0.55, wet: 0.1, empty: 0, dry: 0, spatter: 0.3, cun: 0.25, dots: 1, ground: 0.9, overflow: 4, accent: 1.2, mist: 0, spread: 1, setLine: 1.0, setWash: 0.85, setSoft: 0 },
  splashed: { line: 0.5, lineW: 1.7, crease: 0.12, wash: 1.15, washTone: 1.1, washW: 1.8, washLen: 0.8, side: 0.5, wet: 0.35, empty: -0.05, dry: -0.1, spatter: 1, cun: 0, dots: 0.6, ground: 0.8, overflow: 11, accent: 1, mist: 0.1, spread: 1.1, setLine: 0.7, setWash: 1.15, setSoft: 0.3 },
  boneless: { line: 0.14, lineW: 0.9, crease: 0.08, wash: 1.05, washTone: 0.95, washW: 1.2, washLen: 1.15, side: 0.85, wet: 0.15, empty: 0.05, dry: -0.1, spatter: 0.1, cun: 0, dots: 0.4, ground: 0.5, overflow: 5, accent: 1.3, mist: 0.1, spread: 1, setLine: 0.6, setWash: 1.35, setSoft: 0.85 },
  dryline: { line: 1, lineW: 0.7, crease: 0.75, wash: 0.3, washTone: 0.5, washW: 0.8, washLen: 1, side: 0.2, wet: -0.3, empty: 0.1, dry: 0.35, spatter: 0, cun: 1, dots: 0.9, ground: 1, overflow: 1, accent: 0.5, mist: 0.1, spread: 1.2, setLine: 1.3, setWash: 0.4, setSoft: 0 },
  misty: { line: 0.28, lineW: 1, crease: 0.05, wash: 0.8, washTone: 0.65, washW: 1.6, washLen: 1.25, side: 0.3, wet: 0.4, empty: 0.15, dry: 0, spatter: 0, cun: 0, dots: 0.15, ground: 0.2, overflow: 8, accent: 0.6, mist: 0.85, spread: 0.9, setLine: 0.45, setWash: 1.25, setSoft: 0.6 },
};

interface Paper {
  base: RGB; absorb: number; fibres: number; weave: number; stain: number; flecks: number; specks: number;
}
const PAPERS: Record<'xuan' | 'hemp' | 'silk' | 'aged' | 'gold', Paper> = {
  xuan: { base: [242, 236, 219], absorb: 1, fibres: 1, weave: 0, stain: 0.15, flecks: 0, specks: 0.1 },
  hemp: { base: [229, 220, 198], absorb: 1.2, fibres: 1.8, weave: 0, stain: 0.3, flecks: 0, specks: 1 },
  silk: { base: [224, 206, 166], absorb: 0.45, fibres: 0.15, weave: 1, stain: 0.35, flecks: 0, specks: 0 },
  aged: { base: [218, 196, 152], absorb: 0.8, fibres: 0.8, weave: 0, stain: 1, flecks: 0, specks: 0.4 },
  gold: { base: [240, 230, 207], absorb: 0.7, fibres: 0.5, weave: 0, stain: 0.1, flecks: 1, specks: 0 },
};

const ACCENTS: Record<'none' | 'vermilion' | 'rouge' | 'indigo' | 'ochre' | 'gamboge' | 'malachite', RGB | null> = {
  none: null,
  vermilion: [224, 74, 44],
  rouge: [182, 42, 74],
  indigo: [72, 106, 142],
  ochre: [192, 120, 60],
  gamboge: [230, 174, 52],
  malachite: [80, 152, 120],
};

/** The five inks: clear, pale, heavy, thick, burnt. */
const INKS = [0.12, 0.3, 0.55, 0.78, 0.92];

export default defineLook({
  questions: {
    manner: choice('In what manner is the scene brushed?', {
      sparse: 'A lonely few round strokes and wide empty paper, odd and austere, like a hermit painting one bird on a rock.',
      bold: 'Confident rich black ink and strong colour, playful and direct, every stroke loaded and sure.',
      splashed: 'Splashed ink: big wet pools and wild broad strokes that spill past the forms, spattered and stormy.',
      boneless: 'Boneless painting: forms built from soft graded washes alone, almost no outlines, gentle and luminous.',
      dryline: 'Dry scholarly brushwork: thin scratchy outlines and rubbed texture strokes, pale and detached, little wash.',
      misty: 'Chan mist: pale soaked washes dissolving into haze, forms rising out of fog, quiet and meditative.',
    }),
    wetness: score('How wet is the ink?', [
      'Barely damp: crisp edges',
      'Damp',
      'Wet: soft bleeding edges',
      'Very wet: blooms and tide lines',
      'Soaking: ink floods and feathers into the paper',
    ]),
    emptiness: score('How much of the paper is left empty?', [
      'Little: the forms are fully washed in',
      'Some',
      'Half: only the shaded sides are painted',
      'Most: a few strokes suggest everything',
      'Almost all: a handful of marks and the seal',
    ]),
    dryness: score('How dry does the brush run at the end of each stroke?', [
      'Fully loaded: solid strokes',
      'A little broken',
      'Streaked with flying white',
      'Split and scratchy',
      'Bone dry: hairs of ink on bare paper',
    ]),
    weight: score('How big is the brush?', [
      'A fine wolf-hair brush: slender lines',
      'Slim',
      'Medium',
      'Large',
      'A huge goat-hair brush: broad heavy strokes',
    ]),
    accent: choice('Which single colour, if any, is allowed beside the ink?', {
      none: 'Ink alone: every tone from pale grey wash to burnt black, no colour at all.',
      vermilion: 'Vermilion: a hot orange-red, like a persimmon, a lantern or a cockscomb.',
      rouge: 'Rouge: a deep crimson-pink, like peony petals or plum blossom.',
      indigo: 'Indigo: a soft grey-blue, like a scholar’s robe, far hills or cold water.',
      ochre: 'Ochre: an earthy red-brown, like autumn leaves, a cat’s fur or bare rock.',
      gamboge: 'Gamboge: a warm transparent yellow, like chrysanthemums, loquats or lamplight.',
      malachite: 'Malachite: a mineral green, like moss, bamboo leaves or jade.',
    }),
    paper: choice('What is it painted on?', {
      xuan: 'Raw xuan rice paper: soft ivory, fibrous and thirsty, ink blooms the instant it lands.',
      hemp: 'Coarse hemp paper: grey-buff, flecked with bark and long fibres, very absorbent.',
      silk: 'Sized silk: a warm tan woven ground where the ink sits crisp and barely bleeds.',
      aged: 'An old scroll: browned and foxed by centuries, creased from rolling, the ink faded.',
      gold: 'Gold-flecked paper: pale paper scattered with flakes of gold leaf, for a gift or a celebration.',
    }),
    inscription: choice('What did the painter write beside the picture?', {
      none: 'Nothing written: only the seal.',
      signature: 'Just a signature of two or three characters above the seal.',
      poem: 'A column of poetry running down the empty side, then a signature.',
      colophon: 'A long inscription in several small columns: a scholar’s note on why it was painted.',
      title: 'Two or three large bold characters as a title, brushed with as much force as the picture.',
    }),
    seal: choice('How is it sealed?', {
      name: 'A single square seal with white characters cut into red.',
      pair: 'Two seals stacked, one white on red and one red on white.',
      corner: 'An extra seal pressed into a lower corner to anchor the empty space.',
      leisure: 'A tall oval motto seal at the head of the writing and a name seal at its foot.',
      collectors: 'Many seals: later owners stamped their marks in the margins, some faded with age.',
    }),
  },

  async apply(capture, a, context, signal) {
    const { size, color, normal, depth, identity, diffuse } = capture;
    const N = size * size;
    const S = size / 720;
    const mood = context.mood;
    const rnd = seeded((context.seed ^ 0x5e1a1ced) >>> 0);
    const seed = (context.seed >>> 0) % 9973;
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };
    await pause();

    const M = MANNERS[a.manner];
    const P = PAPERS[a.paper];
    const accent = ACCENTS[a.accent];
    const wet = clamp01(a.wetness * 0.85 + M.wet + 0.05);
    const soak = clamp01(wet * P.absorb);
    const empty = clamp01(a.emptiness * 0.8 + M.empty + (0.5 - mood.cheer) * 0.08);
    const energy = mood.energy;
    const dry = clamp01(a.dryness * 0.85 + M.dry + energy * 0.12);
    const weight = mix(0.6, 1.75, a.weight);
    const aged = a.paper === 'aged' ? 1 : 0;
    const fade = 1 - aged * 0.14 - mood.wear * 0.06;
    const warm = mood.warmth - 0.5;
    const ink: RGB = aged ? [44, 34, 26] : [18 + warm * 12, 16 + warm * 2, 15 - warm * 8];
    const washInk: RGB = aged ? [70, 56, 42] : [40 + warm * 16, 41, 46 - warm * 14];
    const inkCss = ink.map((v) => Math.round(v)).join(',');

    // ── 1. Read the capture ──────────────────────────────────────────────────────────────
    const ids = new Uint8Array(N);
    const dep = new Float32Array(N);
    const lum = new Float32Array(N);
    const chroma = new Float32Array(N);
    const nX = new Float32Array(N), nY = new Float32Array(N), nZ = new Float32Array(N);
    const span = capture.far - capture.near;
    let things = 0;
    for (let p = 0; p < N; p++) {
      const q = p * 4, id = identity[q];
      ids[p] = id;
      dep[p] = id === 0 ? capture.far : capture.near + (span * (depth[q] + depth[q + 1] / 256 + depth[q + 2] / 65536)) / 255;
      const r = color[q], g = color[q + 1], b = color[q + 2];
      lum[p] = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
      chroma[p] = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      nX[p] = normal[q] / 127.5 - 1;
      nY[p] = -(normal[q + 1] / 127.5 - 1);
      nZ[p] = normal[q + 2] / 127.5 - 1;
      if (id >= 3) things++;
    }
    // Light is judged against the things themselves, so a dark world does not drown them.
    const histogram = new Uint32Array(256);
    let total = 0;
    for (let p = 0; p < N; p++)
      if (things > 50 ? ids[p] >= 3 : ids[p] > 0) {
        histogram[diffuse[p * 4]]++;
        total++;
      }
    const percentile = (f: number) => {
      let seen = 0;
      for (let v = 0; v < 256; v++) {
        seen += histogram[v];
        if (seen >= total * f) return v;
      }
      return 255;
    };
    const litLo = total ? percentile(0.03) : 0;
    const litHi = Math.max(litLo + 24, total ? percentile(0.98) : 255);
    const shade = new Float32Array(N);
    for (let p = 0; p < N; p++) shade[p] = ids[p] === 0 ? 0 : clamp01(1 - (diffuse[p * 4] - litLo) / (litHi - litLo));
    const lightLen = Math.hypot(capture.light[0], capture.light[1]) || 1;
    const lx = capture.light[0] / lightLen, ly = capture.light[1] / lightLen;
    /** How much a pixel turns away from the key light, from its normal: 0 facing it, 1 turned away. */
    const away = (p: number) => {
      const r = Math.hypot(nX[p], nY[p]);
      return r < 0.15 ? 0.5 : 0.5 - (0.5 * (nX[p] * lx + nY[p] * ly)) / r;
    };

    interface Body {
      id: number; minX: number; minY: number; maxX: number; maxY: number; area: number; chroma: number;
      scale: number; conf: number; baseL: number; baseR: number; angle: number;
      sx: number; sy: number; sxx: number; syy: number; sxy: number; major: number;
      /** 0 for a thing that fills the frame, 1 for a small figure across a room: marks shrink to suit. */
      pres: number;
      /** Mean thickness across the long axis, in pixels. */
      thick: number;
    }
    const bodies = new Map<number, Body>();
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const p = y * size + x, id = ids[p];
        if (id < 3) continue;
        let b = bodies.get(id);
        if (!b) {
          b = {
            id, minX: x, minY: y, maxX: x, maxY: y, area: 0, chroma: 0, scale: 1, conf: 1, baseL: x, baseR: x, angle: 0,
            sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0, major: 0, pres: 0, thick: 1,
          };
          bodies.set(id, b);
        }
        b.minX = Math.min(b.minX, x);
        b.maxX = Math.max(b.maxX, x);
        b.minY = Math.min(b.minY, y);
        b.maxY = Math.max(b.maxY, y);
        b.area++;
        b.chroma += chroma[p];
        b.sx += x;
        b.sy += y;
        b.sxx += x * x;
        b.syy += y * y;
        b.sxy += x * y;
      }
    for (const b of bodies.values()) {
      b.chroma /= b.area;
      b.scale = Math.min(1.3, Math.max(0.24, Math.sqrt(b.area) / (190 * S)));
      b.pres = 1 - smooth(150 * S, 320 * S, Math.max(b.maxX - b.minX, b.maxY - b.minY) + 1);
      b.conf = clamp01(capture.confidence?.[b.id] ?? 1);
      b.baseL = b.maxX;
      b.baseR = b.minX;
      // The long axis of the silhouette: a tall thing is brushed downward, a long one across.
      const mx = b.sx / b.area, my = b.sy / b.area;
      const cxx = b.sxx / b.area - mx * mx, cyy = b.syy / b.area - my * my, cxy = b.sxy / b.area - mx * my;
      const axis = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
      const spread = Math.sqrt(Math.max(0, (cxx + cyy) / 2 + Math.sqrt(((cxx - cyy) / 2) ** 2 + cxy * cxy)));
      b.major = spread * 3.4;
      b.thick = Math.max(1, b.area / Math.max(1, b.major));
      b.angle = axis + (rnd() - 0.5) * 0.35 - (a.manner === 'splashed' ? 0.5 : 0);
    }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const b = bodies.get(ids[y * size + x]);
        if (b && y >= b.maxY - 6 * S) {
          b.baseL = Math.min(b.baseL, x);
          b.baseR = Math.max(b.baseR, x);
        }
      }
    const cast = [...bodies.values()].filter((b) => b.area > 30 * S * S).sort((u, v) => v.area - u.area);
    const thingMask = new Uint8Array(N);
    for (let p = 0; p < N; p++) thingMask[p] = ids[p] >= 3 ? 1 : 0;
    const toThing = distanceTo(thingMask, size);
    await pause();

    // A shared cloud of noise for blooms and mist, and the fibre texture ink settles into.
    const cloud = new Float32Array(N);
    const fibre = new Float32Array(N);
    const creep = new Float32Array(N);
    const weaveAmp = P.weave ? 0.08 : 0.3;
    for (let y = 0; y < size; y++) {
      if (y % 120 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        cloud[p] = fbm((x * 0.05) / S, (y * 0.05) / S, seed + 3);
        fibre[p] = 1 + weaveAmp * (0.45 * hash(x, y, seed + 1) + 0.55 * vnoise(x * 0.45, y * 0.9, seed + 9) - 0.5);
        // Streaky, crossing fibres for ink to creep along.
        const u = x / S, v = y / S;
        creep[p] = Math.max(vnoise(u * 0.55, v * 0.12, seed + 21), vnoise((u + v) * 0.09, (u - v) * 0.4, seed + 23));
      }
    }

    // ── 2. Ink density targets ───────────────────────────────────────────────────────────
    const raw = new Float32Array(N);
    for (let p = 0; p < N; p++) if (ids[p] >= 3) raw[p] = 0.58 * shade[p] + 0.42 * (1 - lum[p]);
    const toneSrc = smoothWithin(smoothWithin(raw, ids, size, Math.round(3 * S)), ids, size, Math.round(3 * S));
    await pause();
    // Ink is relative to this picture's own range of light and dark, not to its exposure.
    const toneHist = new Uint32Array(101);
    let toneCount = 0;
    for (let p = 0; p < N; p++)
      if (ids[p] >= 3) {
        toneHist[Math.round(clamp01(toneSrc[p]) * 100)]++;
        toneCount++;
      }
    const toneAt = (f: number) => {
      let seen = 0;
      for (let v = 0; v <= 100; v++) {
        seen += toneHist[v];
        if (seen >= toneCount * f) return v / 100;
      }
      return 1;
    };
    const toneLo = toneCount ? toneAt(0.04) : 0, toneHi = Math.max(toneLo + 0.15, toneCount ? toneAt(0.97) : 1);
    const threshold = mix(-0.05, 0.6, empty);
    const reach = 0.11 * size;
    // The set (walls, stage, counters, far hills) keeps only its darkest masses, averaged widely so
    // tiles and wallpaper never print as a pattern, and fading with distance from the cast.
    const worldHist = new Uint32Array(256);
    let worldCount = 0;
    for (let p = 0; p < N; p++)
      if (ids[p] === 1 || ids[p] === 2) {
        worldHist[diffuse[p * 4]]++;
        worldCount++;
      }
    const worldAt = (f: number) => {
      let seen = 0;
      for (let v = 0; v < 256; v++) {
        seen += worldHist[v];
        if (seen >= worldCount * f) return v;
      }
      return 255;
    };
    const wLo = worldCount ? worldAt(0.03) : 0, wHi = Math.max(wLo + 24, worldCount ? worldAt(0.97) : 255);
    const worldMask = new Float32Array(N), worldRaw = new Float32Array(N);
    for (let p = 0; p < N; p++)
      if (ids[p] === 1 || ids[p] === 2) {
        worldMask[p] = 1;
        worldRaw[p] = 0.4 * clamp01(1 - (diffuse[p * 4] - wLo) / (wHi - wLo)) + 0.6 * (1 - lum[p]);
      }
    const wm = blur(worldMask, size, 6 * S), wt = blur(worldRaw, size, 6 * S);
    const setTone = new Float32Array(N);
    const setHist = new Uint32Array(101);
    for (let p = 0; p < N; p++)
      if (worldMask[p]) {
        setTone[p] = wt[p] / Math.max(1e-3, wm[p]);
        setHist[Math.round(clamp01(setTone[p]) * 100)]++;
      }
    const setAt = (f: number) => {
      let seen = 0;
      for (let v = 0; v <= 100; v++) {
        seen += setHist[v];
        if (seen >= worldCount * f) return v / 100;
      }
      return 1;
    };
    const sLo = worldCount ? setAt(0.08) : 0, sHi = Math.max(sLo + 0.12, worldCount ? setAt(0.985) : 1);
    /** Near the cast the set is suggested more firmly; toward the margins it gives way to paper. */
    const near = (p: number) => (cast.length ? mix(0.3, 1, Math.exp(-toThing[p] / (0.3 * size))) : 1);
    const setThreshold = mix(0.5, 0.75, empty);
    // When a thing fills the frame (the plinth) the set stays all but gone, as before.
    // A thing that fills the frame (the studio plinth) keeps the old, nearly bare paper around it.
    let fills = 0;
    for (const b of cast) fills = Math.max(fills, smooth(0.025, 0.08, b.area / N));
    const setPres = Math.min(1 - smooth(0.08, 0.2, things / Math.max(1, things + worldCount)), 1 - fills);
    const T = new Float32Array(N);
    for (let p = 0; p < N; p++) {
      const id = ids[p];
      if (id >= 3) {
        const b = bodies.get(id);
        const tn = (toneSrc[p] - toneLo) / (toneHi - toneLo);
        // A small figure across a room is painted whole, in a few strokes, or it is lost.
        const pres = b ? b.pres : 0;
        const big = smooth(threshold, threshold + 0.5, tn), small = 0.42 + 0.58 * smooth(-0.05, 0.85, tn);
        T[p] = mix(big, small, pres) * mix(M.wash, Math.max(M.wash, 0.85), pres) * (0.55 + 0.45 * (b ? b.conf : 1));
      } else if (id === 1 || id === 2) {
        const stn = (setTone[p] - sLo) / (sHi - sLo);
        const nearby = cast.length ? mix(0.3, 1, Math.exp(-toThing[p] / (0.22 * size))) : 1;
        let mass = smooth(setThreshold, setThreshold + 0.3, stn) * 0.42 * nearby * M.setWash * (1 - 0.5 * empty) * setPres;
        // Broken, not filled: the wash comes and goes across a wall or a hillside.
        if (mass > 0.01) mass *= smooth(0.3, 0.6, fbm(((p % size) * 0.009) / S, (((p / size) | 0) * 0.009) / S, seed + 41));
        const pool = id === 1
          ? clamp01((shade[p] - 0.25) * 1.5) * Math.exp(-toThing[p] / (reach * 0.7)) * 0.5 * (1 - empty * 0.5) * M.ground
          : clamp01((shade[p] - 0.3) * 1.3) * Math.exp(-toThing[p] / (reach * 0.6)) * 0.14 * (1 - empty * 0.8);
        T[p] = Math.max(pool, mass);
      }
    }

    // Stroke directions. Where the surface curves, the brush runs along the curve's axis (across
    // the normal's change, from its structure tensor); near a crease it runs along the crease; on
    // a flat face it follows the long axis of the thing. The ground is brushed level.
    const jxx = new Float32Array(N), jxy = new Float32Array(N), jyy = new Float32Array(N);
    for (let y = 1; y < size - 1; y++)
      for (let x = 1; x < size - 1; x++) {
        const p = y * size + x, id = ids[p];
        if (id < 2) continue;
        const okX = ids[p - 1] === id && ids[p + 1] === id, okY = ids[p - size] === id && ids[p + size] === id;
        const gxX = okX ? nX[p + 1] - nX[p - 1] : 0, gxY = okX ? nY[p + 1] - nY[p - 1] : 0, gxZ = okX ? nZ[p + 1] - nZ[p - 1] : 0;
        const gyX = okY ? nX[p + size] - nX[p - size] : 0, gyY = okY ? nY[p + size] - nY[p - size] : 0, gyZ = okY ? nZ[p + size] - nZ[p - size] : 0;
        const xx = gxX * gxX + gxY * gxY + gxZ * gxZ, yy = gyX * gyX + gyY * gyY + gyZ * gyZ, xy = gxX * gyX + gxY * gyY + gxZ * gyZ;
        const tr = xx + yy;
        if (tr < 1e-7) continue;
        const k = Math.min(1, Math.sqrt(tr) / 0.04) / tr;
        jxx[p] = xx * k;
        jyy[p] = yy * k;
        jxy[p] = xy * k;
      }
    const bxx = blur(jxx, size, 5 * S), byy = blur(jyy, size, 5 * S), bxy = blur(jxy, size, 5 * S);
    const theta = new Float32Array(N);
    for (let p = 0; p < N; p++) {
      const id = ids[p];
      if (!id) continue;
      if (id === 1) {
        theta[p] = 0.04;
        continue;
      }
      const xx = bxx[p], yy = byy[p], xy = bxy[p];
      const tr = xx + yy;
      const coherence = tr > 1e-6 ? Math.sqrt((xx - yy) * (xx - yy) + 4 * xy * xy) / tr : 0;
      const wt = Math.min(1, tr * 1.6) * coherence;
      const along = 0.5 * Math.atan2(2 * xy, xx - yy) + Math.PI / 2;
      // Walls and cliffs of the set are brushed downward, its floors and roofs across.
      const fallback = id === 2 ? (setPres > 0.5 && Math.abs(nY[p]) < 0.45 ? Math.PI / 2 : 0.04) : bodies.get(id)?.angle ?? Math.PI / 2;
      const c = Math.cos(2 * along) * wt + Math.cos(2 * fallback) * (1 - wt) * 0.6;
      const s = Math.sin(2 * along) * wt + Math.sin(2 * fallback) * (1 - wt) * 0.6;
      theta[p] = Math.atan2(s, c) / 2;
    }
    await pause();

    // ── 3. Wash strokes ──────────────────────────────────────────────────────────────────
    const trace = (x0: number, y0: number, id: number, t0: number, target: Float32Array, maxLen: number, overflow: number): Pt[] => {
      const step = 2 * S;
      const walk = (sign: number) => {
        const pts: Pt[] = [];
        let x = x0, y = y0;
        const a0 = theta[(y0 | 0) * size + (x0 | 0)];
        let dx = Math.cos(a0) * sign, dy = Math.sin(a0) * sign;
        let outside = 0;
        for (let len = 0; len < maxLen / 2; len += step) {
          x += dx * step;
          y += dy * step;
          const ix = x | 0, iy = y | 0;
          if (ix < 1 || iy < 1 || ix >= size - 1 || iy >= size - 1) break;
          const p = iy * size + ix;
          if (ids[p] !== id) {
            outside += step;
            if (outside > overflow) break;
          } else {
            outside = 0;
            if (Math.abs(target[p] - t0) > 0.3) break;
            let tx = Math.cos(theta[p]), ty = Math.sin(theta[p]);
            if (tx * dx + ty * dy < 0) {
              tx = -tx;
              ty = -ty;
            }
            dx = dx * 0.65 + tx * 0.35;
            dy = dy * 0.65 + ty * 0.35;
            const l = Math.hypot(dx, dy) || 1;
            dx /= l;
            dy /= l;
          }
          pts.push({ x, y });
        }
        return pts;
      };
      return [...walk(-1).reverse(), { x: x0, y: y0 }, ...walk(1)];
    };
    const snapInk = (t: number) => {
      const v = t + (rnd() - 0.5) * 0.12;
      let best = INKS[0];
      for (const level of INKS) if (Math.abs(level - v) < Math.abs(best - v)) best = level;
      return best;
    };
    /** How far a line through (x, y) along (dx, dy) stays inside one identity: the local width of a limb. */
    const chord = (x0: number, y0: number, dx: number, dy: number, id: number, limit: number) => {
      let n = 1;
      for (const sign of [1, -1])
        for (let t = 1; t < limit; t++) {
          const xi = Math.round(x0 + dx * t * sign), yi = Math.round(y0 + dy * t * sign);
          if (xi < 0 || yi < 0 || xi >= size || yi >= size || ids[yi * size + xi] !== id) break;
          n++;
        }
      return n;
    };
    let strokesLaid = 0;
    const paintWashes = async (
      target: Float32Array, buf: Float32Array, id: number, box: [number, number, number, number],
      width: number, len: number, side: number, overflow: number, toneOf: (t: number) => number, soft = mix(0.25, 0.6, soak),
      pres = 0,
    ) => {
      const spacing = Math.max(3 * S, width * 0.55);
      const seeds: { x: number; y: number; t: number }[] = [];
      for (let y = box[1]; y <= box[3]; y += spacing)
        for (let x = box[0]; x <= box[2]; x += spacing) {
          const sx = Math.min(size - 2, Math.max(1, x + (rnd() - 0.5) * spacing));
          const sy = Math.min(size - 2, Math.max(1, y + (rnd() - 0.5) * spacing));
          const p = (sy | 0) * size + (sx | 0);
          if (ids[p] !== id || target[p] < 0.04) continue;
          seeds.push({ x: sx, y: sy, t: target[p] + (rnd() - 0.5) * 0.08 });
        }
      seeds.sort((u, v) => u.t - v.t);
      for (const s of seeds) {
        const p = (s.y | 0) * size + (s.x | 0);
        if (buf[p] >= target[p] * 0.8) continue;
        if (++strokesLaid % 30 === 0) await pause();
        const path = trace(s.x, s.y, id, target[p], target, len * (0.6 + rnd() * 0.8), overflow);
        const shiftX = (rnd() - 0.5) * overflow * 0.6, shiftY = (rnd() - 0.5) * overflow * 0.6;
        for (const point of path) {
          point.x += shiftX;
          point.y += shiftY;
        }
        const a0 = theta[p];
        let sideSign = -Math.sin(a0) * lx + Math.cos(a0) * ly > 0 ? 1 : -1;
        if (rnd() < 0.2) sideSign = -sideSign;
        const tone = toneOf(target[p]);
        // On a small thing each stroke is as wide as the limb it lands on, and barely leaves it.
        let w = width * (0.75 + rnd() * 0.5);
        if (pres > 0) w = mix(w, Math.min(w, Math.max(1.8 * S, chord(s.x, s.y, -Math.sin(a0), Math.cos(a0), id, w * 2) * 0.95)), pres);
        const spill = tone * (1 - 0.85 * pres);
        washStroke(
          buf, size, path, w, tone, side, sideSign,
          dry * 0.6, soft, Math.floor(rnd() * 9999), rnd, (q) => (ids[q] === id ? target[q] * 1.15 + 0.12 : spill),
        );
      }
    };

    const W = new Float32Array(N);
    const brushScale = mix(0.75, 1.3, a.weight);
    /** The brush is sized to the thing: a figure across a room gets a slim brush that keeps its shape. */
    const washWidth = (b: Body, cap: number, floor: number, frac: number) => {
      const minDim = Math.min(b.maxX - b.minX, b.maxY - b.minY) + 1;
      const big = Math.min(cap * S, Math.max(floor * S, minDim * frac));
      const small = Math.min(14 * S, Math.max(2.2 * S, b.thick * 0.55));
      return mix(big, small, b.pres);
    };
    const fitWidth = (b: Body, width: number) => (b.pres > 0.3 ? Math.min(width, Math.max(2.4 * S, b.thick * mix(1.1, 0.75, b.pres))) : width);
    for (const b of cast) {
      const width = fitWidth(b, washWidth(b, 46, 6, 0.22) * M.washW * brushScale);
      const over = M.overflow * S * mix(1, 0.2, b.pres);
      const len = Math.min(width * 10, Math.max(width * 3, b.major * 0.6)) * M.washLen;
      await paintWashes(
        T, W, b.id, [b.minX - over, b.minY - over, b.maxX + over, b.maxY + over], width,
        len, M.side, over, (t) => Math.min(0.95, snapInk(t) * M.washTone), undefined, b.pres,
      );
    }
    // A small thing is also laid in whole, inside its own silhouette, with the bristle streaks of one
    // loaded stroke along its long axis: at a distance the silhouette is what reads.
    for (const b of cast) {
      if (b.pres < 0.05) continue;
      const ca = Math.cos(b.angle), sa = Math.sin(b.angle);
      const ss = 1 / Math.max(1.5 * S, b.thick * 0.18);
      for (let y = b.minY; y <= b.maxY; y++)
        for (let x = b.minX; x <= b.maxX; x++) {
          const p = y * size + x;
          if (ids[p] !== b.id || T[p] < 0.03) continue;
          const u = x * ca + y * sa, v = -x * sa + y * ca;
          const streak = vnoise(u * 0.05 / S, v * ss, seed + b.id * 7);
          const bare = streak < dry * 0.32 ? 0.35 : 1;
          const fill = Math.min(0.95, T[p] * M.washTone * 1.05) * (0.8 + 0.4 * (streak - 0.5)) * bare;
          W[p] = Math.max(W[p], fill * smooth(0, 0.6, b.pres));
        }
    }
    // The ground keeps its shadow pool near the cast; the set keeps a few pale washes on its darkest masses.
    await paintWashes(T, W, 1, [0, 0, size - 1, size - 1], 30 * S * Math.sqrt(weight), 105 * S, 0.45, 8 * S, (t) => Math.min(0.3, snapInk(t)));
    const setCap = mix(0.12, 0.3, setPres);
    await paintWashes(T, W, 2, [0, 0, size - 1, size - 1], (18 + 16 * a.weight) * S, 110 * S, 0.45, 3 * S, (t) => Math.min(setCap, snapInk(t)), mix(0.55, 0.85, soak));

    // One colour, under the ink, on whatever was most colourful.
    const A = new Float32Array(N);
    let accentNote = 'ink alone';
    if (accent && cast.length) {
      const chromatic = [...cast].sort((u, v) => v.chroma - u.chroma);
      const lead = chromatic[0];
      const hist = new Uint32Array(101);
      let n = 0;
      for (let p = 0; p < N; p++)
        if (ids[p] >= 3) {
          hist[Math.min(100, Math.round(chroma[p] * 100))]++;
          n++;
        }
      let seen = 0, top = 1;
      for (let v = 0; v <= 100; v++) {
        seen += hist[v];
        if (seen >= n * 0.95) {
          top = v / 100;
          break;
        }
      }
      const bland = top < 0.12;
      const AT = new Float32Array(N);
      for (let p = 0; p < N; p++) {
        const id = ids[p];
        if (id < 3) continue;
        const own = id === lead.id ? 1 : 0.45;
        const m = bland ? (id === cast[0].id ? 0.7 : 0) : smooth(0.3, 0.7, chroma[p] / Math.max(0.1, top));
        AT[p] = m * own * (0.5 + 0.4 * shade[p]) * M.accent * (1 - 0.35 * empty);
      }
      for (const b of cast) {
        const width = fitWidth(b, washWidth(b, 50, 7, 0.25) * brushScale);
        const over = M.overflow * S * 1.2 * mix(1, 0.25, b.pres);
        const len = Math.min(width * 9, Math.max(width * 3, b.major * 0.55));
        await paintWashes(
          AT, A, b.id, [b.minX - over, b.minY - over, b.maxX + over, b.maxY + over], width, len,
          M.side * 0.8, over, (t) => clamp01(t * 1.1) * (0.72 + 0.28 * mood.cheer), undefined, b.pres,
        );
      }
      accentNote = `${a.accent} laid under the ink`;
    }

    // Wet ink spreads: soften, darken the drying edge, and let water carry a pale halo outward.
    const bleed = (src: Float32Array, tide: number) => {
      const r1 = (0.6 + 2.2 * soak) * S, r2 = (3 + 11 * soak) * S;
      const b1 = blur(src, size, Math.max(1, r1)), b2 = blur(src, size, r2);
      const out = new Float32Array(N);
      const soften = 0.25 + 0.45 * soak;
      for (let p = 0; p < N; p++) {
        // The stroke keeps its shape; beyond it, ink creeps out along the paper's fibres.
        const body = mix(src[p], b1[p], soften);
        const spread = Math.max(0, b1[p] - src[p]) * smooth(0.3, 0.8, creep[p]) * (0.6 + 1.6 * soak);
        const rim = Math.max(0, b1[p] - b2[p]) * tide;
        const halo = smooth(0.012, 0.045, b2[p] * (0.45 + cloud[p])) * 0.065 * soak;
        out[p] = clamp01(body + spread * (1 - body) + rim + halo * (1 - body));
      }
      return out;
    };
    const washed = bleed(W, 0.4 + 1.1 * soak);
    const coloured = accent ? bleed(A, 0.3 + 0.9 * soak) : A;
    await pause();

    // ── 4. Contours from identity, depth and normal breaks ───────────────────────────────
    const edge = new Uint8Array(N);
    const jump = Math.max(capture.pixelWorldSize * 10, span * 1e-4);
    const crease = new Float32Array(N), creaseX = new Float32Array(N), creaseY = new Float32Array(N);
    const dot = (p: number, q: number) => nX[p] * nX[q] + nY[p] * nY[q] + nZ[p] * nZ[q];
    for (let y = 2; y < size - 2; y++)
      for (let x = 2; x < size - 2; x++) {
        const p = y * size + x, id = ids[p];
        if (id < 1) continue;
        if (ids[p - 2] === id && ids[p + 2] === id) creaseX[p] = 1 - dot(p - 2, p + 2);
        if (ids[p - 2 * size] === id && ids[p + 2 * size] === id) creaseY[p] = 1 - dot(p - 2 * size, p + 2 * size);
      }
    for (let y = 3; y < size - 3; y++)
      for (let x = 3; x < size - 3; x++) {
        const p = y * size + x;
        const cx = creaseX[p], cy = creaseY[p];
        if (cx >= cy) crease[p] = cx >= creaseX[p - 1] && cx > creaseX[p + 1] ? cx : 0;
        else crease[p] = cy >= creaseY[p - size] && cy > creaseY[p + size] ? cy : 0;
      }
    for (let y = 3; y < size - 3; y++)
      for (let x = 3; x < size - 3; x++) {
        const p = y * size + x, id = ids[p];
        if (id < 1) continue;
        let t = 0;
        if (id < 3) {
          // The set's own structure: its outline against the backdrop (4), where one part stands in
          // front of another (5), and its sharpest folds (6). Edges against a thing belong to the thing.
          for (const q of [p - 1, p + 1, p - size, p + size]) {
            const iq = ids[q];
            if (iq === 0) t = 4;
            else if (iq < 3 && t !== 4 && (iq !== id ? dep[q] > dep[p] : dep[q] - dep[p] > jump)) t = 5;
          }
          if (!t && crease[p] > 0.5) t = 6;
          edge[p] = t;
          continue;
        }
        for (const q of [p - 1, p + 1, p - size, p + size]) {
          if (ids[q] !== id) {
            if (ids[q] < 3 || dep[q] > dep[p]) t = 1;
          } else if (!t && dep[q] - dep[p] > jump) t = 2;
        }
        if (!t && crease[p] > 0.42) t = 3;
        edge[p] = t;
      }
    await pause();

    const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];
    const visited = new Uint8Array(N);
    const follow = (start: number, dx0: number, dy0: number, id: number) => {
      const out: number[] = [];
      let cur = start, dx = dx0, dy = dy0;
      for (let guard = 0; guard < 6000; guard++) {
        const cx = cur % size, cy = (cur / size) | 0;
        let best = -1, bestScore = -Infinity, bx = 0, by = 0;
        for (let k = 0; k < 8; k++) {
          const q = (cy + DY[k]) * size + cx + DX[k];
          if (!edge[q] || visited[q] || ids[q] !== id) continue;
          const sc = (dx * DX[k] + dy * DY[k]) / (k % 2 ? 1.4142 : 1) - (k % 2 ? 0.1 : 0);
          if (sc > bestScore) {
            bestScore = sc;
            best = q;
            bx = DX[k];
            by = DY[k];
          }
        }
        if (best < 0) break;
        visited[best] = 1;
        out.push(best);
        dx = dx * 0.6 + bx * 0.4;
        dy = dy * 0.6 + by * 0.4;
        cur = best;
      }
      return out;
    };
    interface Piece {
      pts: Pt[];
      px: number[];
      id: number;
      type: number;
      len: number;
    }
    const pieces: Piece[] = [];
    const setPieces: Piece[] = [];
    const minPixels = Math.round((9 + 26 * empty) * S);
    /** A small thing's outline is short: keep pieces in proportion to it, or none survive. */
    const minFor = (id: number) => {
      if (id < 3) return 16 * S;
      const b = bodies.get(id);
      return b ? mix(minPixels, Math.min(minPixels, Math.max(5 * S, b.major * 0.2)), b.pres) : minPixels;
    };
    for (let p = 0; p < N; p++) {
      if (!edge[p] || visited[p]) continue;
      visited[p] = 1;
      const id = ids[p];
      const minLen = minFor(id);
      const ahead = follow(p, 0, 0, id);
      let bdx = 0, bdy = 0;
      if (ahead.length) {
        bdx = -((ahead[0] % size) - (p % size));
        bdy = -(((ahead[0] / size) | 0) - ((p / size) | 0));
      }
      const behind = follow(p, bdx, bdy, id);
      const chain = [...behind.reverse(), p, ...ahead];
      if (chain.length < minLen) continue;
      const counts = [0, 0, 0, 0, 0, 0, 0];
      for (const q of chain) counts[edge[q]]++;
      const type = id < 3
        ? (counts[5] >= counts[4] && counts[5] >= counts[6] ? 5 : counts[4] >= counts[6] ? 4 : 6)
        : counts[1] >= counts[2] && counts[1] >= counts[3] ? 1 : counts[2] >= counts[3] ? 2 : 3;
      const rawPts = chain.map((q) => ({ x: (q % size) + 0.5, y: ((q / size) | 0) + 0.5 }));
      const sm = rawPts.map((_, i) => {
        let sx = 0, sy = 0, n = 0;
        for (let k = Math.max(0, i - 3); k <= Math.min(rawPts.length - 1, i + 3); k++) {
          sx += rawPts[k].x;
          sy += rawPts[k].y;
          n++;
        }
        return { x: sx / n, y: sy / n };
      });
      const keep: number[] = [];
      for (let i = 0; i < sm.length; i += 3) keep.push(i);
      if (keep[keep.length - 1] !== sm.length - 1) keep.push(sm.length - 1);
      // A brush turns a sharp corner by lifting: split there.
      const cuts = [0];
      for (let i = 2; i < keep.length - 2; i++) {
        const a0 = sm[keep[i - 2]], a1 = sm[keep[i]], a2 = sm[keep[i + 2]];
        const ang = Math.abs(Math.atan2(a2.y - a1.y, a2.x - a1.x) - Math.atan2(a1.y - a0.y, a1.x - a0.x));
        if (Math.min(ang, Math.PI * 2 - ang) > 0.8 && i - cuts[cuts.length - 1] >= 2) cuts.push(i);
      }
      if (cuts[cuts.length - 1] !== keep.length - 1) cuts.push(keep.length - 1);
      for (let c = 0; c < cuts.length - 1; c++) {
        const idx = keep.slice(cuts[c], cuts[c + 1] + 1);
        const pts = idx.map((k) => sm[k]);
        const len = lengthOf(pts);
        if (pts.length >= 2 && len >= minLen * 0.8) (id < 3 ? setPieces : pieces).push({ pts, px: idx.map((k) => chain[k]), id, type, len });
      }
    }
    await pause();

    // ── 5. Brushing the lines ────────────────────────────────────────────────────────────
    const canvasOf = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      return c.getContext('2d', { willReadFrequently: true })!;
    };
    const lines = canvasOf();
    /** Brush top to bottom or left to right, overshoot the ends a little and let the hand wander. */
    const handPath = (part: Pt[], ext: number, wander: number): Pt[] => {
      let pts = part;
      const first = pts[0], last = pts[pts.length - 1];
      const ddx = last.x - first.x, ddy = last.y - first.y;
      if ((Math.abs(ddy) > Math.abs(ddx) && ddy < 0) || (Math.abs(ddx) >= Math.abs(ddy) && ddx < 0)) pts = [...pts].reverse();
      const n = pts.length;
      const h0 = pts[0], h1 = pts[Math.min(n - 1, 1)], t0 = pts[n - 1], t1 = pts[Math.max(0, n - 2)];
      const hl = Math.hypot(h0.x - h1.x, h0.y - h1.y) || 1, tl = Math.hypot(t0.x - t1.x, t0.y - t1.y) || 1;
      const chord = Math.hypot(t0.x - h0.x, t0.y - h0.y) || 1;
      const perpX = -(t0.y - h0.y) / chord, perpY = (t0.x - h0.x) / chord;
      const offset = (rnd() - 0.5) * 2.4 * S * wander, phase = rnd() * 6.28;
      const path: Pt[] = [{ x: h0.x + ((h0.x - h1.x) / hl) * ext * 0.5, y: h0.y + ((h0.y - h1.y) / hl) * ext * 0.5 }];
      pts.forEach((pt, i) => {
        const wob = Math.sin(i * 0.35 + phase) * 0.9 * S * wander + offset;
        path.push({ x: pt.x + perpX * wob, y: pt.y + perpY * wob });
      });
      path.push({ x: t0.x + ((t0.x - t1.x) / tl) * ext, y: t0.y + ((t0.y - t1.y) / tl) * ext });
      return path;
    };
    const order = pieces.sort((u, v) => (u.id - v.id) || v.len - u.len);
    let load = 1, lastId = -1, linesDrawn = 0;
    for (const piece of order) {
      const body = bodies.get(piece.id);
      if (!body || linesDrawn > 900) continue;
      if (piece.id !== lastId) {
        load = 1;
        lastId = piece.id;
      }
      const total = piece.len;
      let at = 0;
      while (at < total - 2) {
        const seg = (50 + rnd() * 130) * S * (0.8 + 0.4 * weight) * (1 + energy * 0.3);
        let end = Math.min(total, at + seg);
        if (total - end < seg * 0.35) end = total;
        const part = slice(piece.pts, at, end);
        const from = at;
        at = end + (rnd() * 8 - 1.5) * S;
        if (part.length < 2) continue;
        // Shade along this part: the plain-lit pass, and which way the surface turns from the light.
        let sh = 0;
        const i0 = Math.floor((from / total) * (piece.px.length - 1)), i1 = Math.ceil((end / total) * (piece.px.length - 1));
        for (let i = i0; i <= i1; i++) sh += 0.5 * shade[piece.px[i]] + 0.5 * away(piece.px[i]);
        sh /= i1 - i0 + 1;
        const base = piece.type === 3 ? M.crease : M.line * (piece.type === 2 ? 0.85 : 1);
        // A small thing keeps its outline even on emptier paper: it is a few marks or nothing.
        const pres = body.pres;
        const chance = base * mix(1, 0.3, empty * (1 - 0.7 * pres)) * mix(0.3 + 0.95 * sh, 0.9, pres * 0.6);
        if (rnd() > Math.min(0.97, chance)) continue;
        const path = handPath(part, (2 + 5 * energy + rnd() * 3) * S * mix(1, 0.3, pres), mix(1, 0.35, pres));
        const len = end - from;
        let w = 5.4 * S * weight * M.lineW * body.scale * (0.35 + 1.25 * sh) * (piece.type === 3 ? 0.7 : 1) * mix(1, 0.85, empty);
        if (pres > 0.05) {
          // As wide as a fraction of the limb it outlines, measured straight across it.
          const across: number[] = [];
          for (const f of [0.25, 0.5, 0.75]) {
            const i = Math.min(part.length - 2, Math.floor(f * (part.length - 1)));
            const a0 = part[i], a1 = part[i + 1];
            const l = Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1;
            const nx = -(a1.y - a0.y) / l, ny = (a1.x - a0.x) / l;
            across.push(Math.max(chord(a0.x + nx, a0.y + ny, nx, ny, piece.id, 60 * S), chord(a0.x - nx, a0.y - ny, -nx, -ny, piece.id, 60 * S)));
          }
          across.sort((u, v) => u - v);
          w = mix(w, Math.min(w, Math.max(1.1 * S, across[1] * 0.3)), pres);
        }
        w = Math.max(1.1 * S, w);
        const tone = Math.min(0.95, ((piece.type === 3 ? 0.62 : 0.8) + 0.15 * sh) * (0.78 + 0.22 * load) * (0.6 + 0.4 * body.conf));
        brush(lines, path, {
          w, tone, dry: clamp01(dry * 0.85 + (1 - load) * 0.35), head: 0.06 + rnd() * 0.1,
          tail: 0.15 + 0.25 * energy * rnd() + 0.1, blunt: 0.45 + rnd() * 0.3, spread: M.spread, seed: Math.floor(rnd() * 9999),
        }, inkCss);
        linesDrawn++;
        load -= (len / (700 * S * weight)) * (0.5 + dry);
        if (load < 0.15) load = 1;
        if (linesDrawn % 40 === 0) await pause();
      }
    }

    // The set: a few pale, broken, dry strokes along its strongest edges (a wall line, a stage
    // edge, a banner), firmer near the cast and fading toward the margins.
    let setStrokes = 0;
    const SW = new Float32Array(N);
    let ribbons = 0;
    if (setPieces.length && setPres > 0.02) {
      // The outline of the whole set matters least; what stands in front of what, and the folds
      // nearest the cast, matter most.
      const strength = [0, 0, 0, 0, 0.45, 1, 0.85];
      const ranked = setPieces
        .map((piece) => {
          let loc = 0, n = 0;
          for (let i = 0; i < piece.px.length; i += 2, n++) loc += near(piece.px[i]);
          loc /= Math.max(1, n);
          return { piece, loc, score: Math.pow(piece.len, 0.65) * strength[piece.type] * loc * loc * (0.7 + 0.6 * rnd()) };
        })
        .sort((u, v) => v.score - u.score);
      const want = Math.round(mix(40, 14, empty) * M.setLine * setPres);
      for (const { piece, loc } of ranked.slice(0, want)) {
        const total = piece.len;
        let at = rnd() * Math.min(20 * S, total * 0.2);
        while (at < total - 4 * S) {
          const seg = (30 + rnd() * 90) * S * (0.8 + 0.3 * weight);
          const end = Math.min(total, at + seg);
          const part = slice(piece.pts, at, end);
          at = end + (5 + rnd() * 22) * S * (0.6 + empty);
          if (part.length < 2 || rnd() > mix(0.95, 0.68, empty)) continue;
          const path = handPath(part, (1 + 4 * energy + rnd() * 3) * S, 1.2);
          if (++setStrokes % 40 === 0) await pause();
          if (rnd() < M.setSoft) {
            // A soft wet ribbon of pale wash along the edge, with no bone in it.
            washStroke(
              SW, size, path, (5 + rnd() * 7) * S * Math.sqrt(weight), Math.min(0.45, 0.2 + 0.26 * loc), 0.55,
              rnd() < 0.5 ? 1 : -1, dry * 0.5, 0.8, Math.floor(rnd() * 9999), rnd, () => 0.5,
            );
            ribbons++;
            continue;
          }
          brush(lines, path, {
            w: (1.4 + rnd() * 2.2) * S * Math.sqrt(weight) * M.lineW * (piece.type === 6 ? 0.85 : 1),
            tone: Math.min(0.7, (0.3 + 0.36 * loc + 0.08 * rnd()) * (piece.type === 4 ? 0.8 : 1)),
            dry: clamp01(0.4 + 0.55 * dry + 0.1 * rnd()), head: 0.1 + rnd() * 0.15, tail: 0.3 + 0.3 * rnd(),
            blunt: 0.35 + rnd() * 0.3, spread: M.spread * 1.1, seed: Math.floor(rnd() * 9999),
          }, inkCss);
        }
      }
    }
    if (ribbons) {
      const soft = bleed(SW, 0.3 + 0.8 * soak);
      for (let p = 0; p < N; p++) washed[p] = 1 - (1 - washed[p]) * (1 - soft[p]);
    }

    // Texture strokes rubbed into the shadows.
    const thingArea = cast.reduce((sum, b) => sum + b.area, 0);
    const cunCount = Math.min(500, Math.round(((M.cun * thingArea) / (700 * S * S)) * (1 - 0.6 * empty)));
    for (let i = 0, made = 0; i < cunCount * 4 && made < cunCount && cast.length; i++) {
      const b = cast[Math.floor(rnd() * cast.length)];
      const x = b.minX + rnd() * (b.maxX - b.minX), y = b.minY + rnd() * (b.maxY - b.minY);
      const p = (y | 0) * size + (x | 0);
      if (ids[p] !== b.id || shade[p] < 0.38 + rnd() * 0.3) continue;
      made++;
      const ang = theta[p] + (rnd() - 0.5) * 0.5;
      const len = (9 + rnd() * 20) * S * Math.sqrt(weight) * b.scale;
      const bend = (rnd() - 0.5) * len * 0.25;
      const cx = Math.cos(ang), cy = Math.sin(ang);
      brush(lines, [
        { x: x - (cx * len) / 2, y: y - (cy * len) / 2 },
        { x: x - cy * bend, y: y + cx * bend },
        { x: x + (cx * len) / 2, y: y + (cy * len) / 2 },
      ], {
        w: (1.3 + rnd() * 1.4) * S * Math.sqrt(weight), tone: 0.4 + 0.35 * shade[p], dry: 0.45 + 0.5 * dry,
        head: 0.15, tail: 0.5, blunt: 0.4, spread: 1.2, seed: Math.floor(rnd() * 9999),
      }, inkCss);
    }

    // A dry ground stroke under each thing and a few moss dots at its foot.
    for (const b of cast) {
      // Everything here shrinks with the thing, so a far figure stands on a short dry stroke.
      const small = mix(1, 0.4, b.pres);
      const bw = Math.max(mix(30, 10, b.pres) * S, b.baseR - b.baseL);
      const strokes = rnd() < M.ground * (1 - 0.6 * empty) ? 1 + (rnd() < 0.4 ? 1 : 0) : 0;
      for (let k = 0; k < strokes; k++) {
        const y = b.maxY + (1 + rnd() * 5 + k * 6) * S * small;
        const x0 = b.baseL - (0.15 + rnd() * 0.5) * bw, x1 = b.baseR + (0.2 + rnd() * 0.6) * bw;
        const slope = (rnd() - 0.5) * 0.06 * (x1 - x0);
        const pts: Pt[] = [];
        for (let i = 0; i <= 4; i++) pts.push({ x: mix(x0, x1, i / 4), y: y + slope * (i / 4) + (rnd() - 0.5) * 3 * S });
        brush(lines, pts, {
          w: (4 + rnd() * 4) * S * weight * small, tone: 0.28 + 0.2 * rnd(), dry: 0.55 + 0.4 * dry, head: 0.1, tail: 0.45,
          blunt: 0.5, spread: 1.2, seed: Math.floor(rnd() * 9999),
        }, inkCss);
      }
      const dots = Math.round(M.dots * (2 + rnd() * 5) * (1 - 0.6 * empty) * mix(1, 0.5, b.pres));
      let cx = 0, cy = 0;
      for (let k = 0; k < dots; k++) {
        if (k % 3 === 0) {
          cx = b.baseL - 0.3 * bw + rnd() * 1.6 * bw;
          cy = b.maxY + (-3 + rnd() * 9) * S * small;
        }
        const x = cx + (rnd() - 0.5) * 14 * S * small, y = cy + (rnd() - 0.5) * 6 * S * small;
        const ang = -0.6 + (rnd() - 0.5);
        const l = (3 + rnd() * 3) * S * small;
        brush(lines, [{ x, y }, { x: x + Math.cos(ang) * l, y: y + Math.sin(ang) * l }], {
          w: (3.6 + rnd() * 2) * S * Math.pow(weight, 0.6) * mix(1, 0.55, b.pres), tone: 0.92, dry: 0.1, head: 0.3, tail: 0.55, blunt: 0.85,
          spread: 1, seed: Math.floor(rnd() * 9999),
        }, inkCss);
      }
    }

    // Splashes flicked off a loaded brush.
    const spatter = Math.round(M.spatter * (8 + 50 * energy) * (cast.length ? 1 : 0));
    for (let k = 0; k < spatter; k++) {
      const b = cast[Math.floor(rnd() * cast.length)];
      const m = 20 * S * mix(1, 0.4, b.pres);
      const x = b.minX - m + rnd() * (b.maxX - b.minX + 2 * m), y = b.minY - m + rnd() * (b.maxY - b.minY + 2 * m);
      const r = (0.6 + Math.pow(rnd(), 3) * 3.5) * S;
      lines.fillStyle = `rgba(${inkCss},${(0.5 + rnd() * 0.4).toFixed(2)})`;
      lines.beginPath();
      lines.ellipse(x, y, r, r * (0.6 + rnd() * 0.4), rnd() * 3.14, 0, Math.PI * 2);
      lines.fill();
    }
    await pause();

    const lineData = lines.getImageData(0, 0, size, size).data;
    const lineA = new Float32Array(N);
    for (let p = 0; p < N; p++) lineA[p] = lineData[p * 4 + 3] / 255;
    const lineHalo = blur(lineA, size, (1 + 3 * soak) * S);
    const L = new Float32Array(N);
    for (let p = 0; p < N; p++) L[p] = clamp01(lineA[p] + lineHalo[p] * 0.5 * soak * (0.5 + cloud[p]) * (1 - lineA[p]));

    // Mist rises from below and swallows the feet of things (the lowest part of each thing's own
    // height, so a far figure keeps its head and shoulders), and a band of it drifts across the set.
    let mistF: Float32Array = new Float32Array(N).fill(1);
    if (M.mist > 0 && cast.length) {
      let worldTop = size, worldBottom = 0;
      for (let p = 0; p < N; p++)
        if (ids[p] === 1 || ids[p] === 2) {
          const y = (p / size) | 0;
          if (y < worldTop) worldTop = y;
          if (y > worldBottom) worldBottom = y;
        }
      const WH = Math.max(40 * S, worldBottom - worldTop);
      const bandY = worldTop + WH * (0.3 + rnd() * 0.3), bandH = WH * (0.07 + rnd() * 0.06);
      const phase = rnd() * 6.28;
      const raw = new Float32Array(N);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const p = y * size + x, id = ids[p];
          const yy = y + 9 * S * Math.sin((x * 0.011) / S + phase) + 22 * S * (cloud[p] - 0.5);
          const b = id >= 3 ? bodies.get(id) : undefined;
          let m: number;
          if (b) {
            const H = Math.max(10 * S, b.maxY - b.minY);
            m = smooth(b.maxY - H * mix(0.5, 0.35, b.pres), b.maxY + 4 * S, yy);
          } else {
            m = smooth(worldBottom - WH * 0.3, worldBottom + 4 * S, yy);
            if (worldCount && toThing[p] > 5 * S) m = Math.max(m, (1 - smooth(0, bandH, Math.abs(yy - bandY))) * setPres * smooth(5 * S, 16 * S, toThing[p]));
          }
          raw[p] = m;
        }
      mistF = blur(raw, size, 3 * S);
      for (let p = 0; p < N; p++) mistF[p] = 1 - mistF[p] * M.mist;
    }
    await pause();

    // ── 6. Inscription and seals in the emptiest paper ───────────────────────────────────
    const occ = new Int32Array((size + 1) * (size + 1));
    for (let y = 0; y < size; y++) {
      let row = 0;
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        row += toThing[p] < 16 * S || washed[p] * mistF[p] > 0.07 || L[p] * mistF[p] > 0.07 || coloured[p] > 0.07 ? 1 : 0;
        occ[(y + 1) * (size + 1) + x + 1] = occ[y * (size + 1) + x + 1] + row;
      }
    }
    const busy = (x: number, y: number, w: number, h: number) => {
      const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
      const x1 = Math.min(size, Math.ceil(x + w)), y1 = Math.min(size, Math.ceil(y + h));
      if (x1 <= x0 || y1 <= y0) return 1;
      const W1 = size + 1;
      return (occ[y1 * W1 + x1] - occ[y0 * W1 + x1] - occ[y1 * W1 + x0] + occ[y0 * W1 + x0]) / ((x1 - x0) * (y1 - y0));
    };
    const margin = 0.045 * size;
    const findSpot = (w: number, h: number, prefer: 'top' | 'bottom', avoid: { x: number; y: number; w: number; h: number }[] = []) => {
      let best = { x: size - margin - w, y: margin, score: Infinity, busy: 1 };
      for (let y = margin; y + h <= size - margin; y += 6 * S)
        for (let x = margin; x + w <= size - margin; x += 6 * S) {
          if (avoid.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y)) continue;
          const o = busy(x, y, w, h);
          const cx = (x + w / 2) / size;
          const sc = o * 12 + 0.35 * (1 - Math.abs(cx - 0.5) * 2) + (1 - cx) * 0.15 + (prefer === 'top' ? y / size : 1 - (y + h) / size) * 0.5;
          if (sc < best.score) best = { x, y, score: sc, busy: o };
        }
      return best;
    };

    const script = canvasOf();
    const seals = canvasOf();
    const scriptDry = 0.15 + dry * 0.35;
    const drawGlyph = (cx: number, cy: number, g: number, heavy: number) => {
      const strokes = makeGlyph(rnd);
      const slant = (rnd() - 0.5) * 0.1;
      const map = (pt: Pt): Pt => ({ x: cx + (pt.x - 0.5) * g + (pt.y - 0.5) * g * slant, y: cy + (pt.y - 0.5) * g });
      let previous: Pt | null = null;
      for (const s of strokes) {
        const pts = s.pts.map(map);
        if (previous && rnd() < 0.3 + energy * 0.2)
          brush(script, [previous, { x: (previous.x + pts[0].x) / 2 + g * 0.05, y: (previous.y + pts[0].y) / 2 }, pts[0]], {
            w: g * 0.035, tone: 0.7, dry: 0.3, head: 0.2, tail: 0.3, blunt: 0.2, spread: 1, seed: Math.floor(rnd() * 9999),
          }, inkCss);
        const w = g * heavy * (s.kind === 'dot' ? 1.35 : 1);
        brush(script, pts, {
          w, tone: 0.9, dry: scriptDry, head: s.kind === 'press' ? 0.6 : 0.15, tail: s.kind === 'dot' ? 0.6 : s.kind === 'press' ? 0.12 : 0.32,
          blunt: s.kind === 'dot' ? 0.85 : s.kind === 'press' ? 0.25 : 0.55, spread: 1, seed: Math.floor(rnd() * 9999),
        }, inkCss);
        previous = pts[pts.length - 1];
      }
    };
    const drawColumn = (cx: number, y: number, count: number, g: number, heavy: number) => {
      let cy = y + g * 0.5;
      for (let i = 0; i < count; i++) {
        const gs = g * (0.85 + rnd() * 0.3);
        drawGlyph(cx + (rnd() - 0.5) * g * 0.12, cy, gs, heavy);
        cy += g * (1.05 + rnd() * 0.14);
      }
      return cy - g * 0.5;
    };
    const cinnabar: RGB = aged ? [176, 52, 40] : [196, 38, 30];
    const css = (c: RGB, alpha: number) => `rgba(${c.map((v) => Math.round(v)).join(',')},${alpha.toFixed(3)})`;
    const drawSeal = (x: number, y: number, w: number, h: number, white: boolean, oval: boolean, tint: RGB, alpha: number) => {
      seals.save();
      seals.fillStyle = seals.strokeStyle = css(tint, alpha);
      const outline = () => {
        seals.beginPath();
        if (oval) seals.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        else {
          const jag = () => (rnd() - 0.5) * 1.1 * S;
          const corners: Pt[] = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
          seals.moveTo(x + jag(), y + jag());
          for (let c = 0; c < 4; c++) {
            const a0 = corners[c], a1 = corners[(c + 1) % 4];
            for (let k = 1; k <= 6; k++) seals.lineTo(mix(a0.x, a1.x, k / 6) + jag(), mix(a0.y, a1.y, k / 6) + jag());
          }
          seals.closePath();
        }
      };
      const cols = oval || h > w * 1.4 ? 1 : 2, rows = 2;
      const inset = Math.min(w, h) * 0.1;
      const cw = (w - inset * 2) / cols, ch = (h - inset * 2) / rows;
      seals.lineCap = 'square';
      seals.lineJoin = 'miter';
      if (white) {
        outline();
        seals.fill();
        seals.globalCompositeOperation = 'destination-out';
        seals.strokeStyle = 'rgba(0,0,0,1)';
        seals.lineWidth = Math.max(1.2 * S, Math.min(cw, ch) * 0.13);
      } else {
        seals.lineWidth = Math.max(1.2 * S, Math.min(w, h) * 0.07);
        outline();
        seals.stroke();
        seals.lineWidth = Math.max(1.1 * S, Math.min(cw, ch) * 0.11);
      }
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) sealMarks(seals, x + inset + c * cw, y + inset + r * ch, cw, ch, rnd);
      seals.restore();
    };

    const sealSize = (0.04 + 0.012 * rnd()) * size * (a.inscription === 'title' ? 1.2 : 1);
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    let nameSeal: Pt | null = null;
    let leadSeal: Pt | null = null;
    const leisureH = a.seal === 'leisure' ? sealSize * 1.35 : 0;
    const scriptNote: string[] = [];
    if (a.inscription !== 'none') {
      const plan = (shrink: number) => {
        const cols: { count: number; g: number; offset: number; heavy: number }[] = [];
        if (a.inscription === 'signature') {
          cols.push({ count: 2 + (rnd() < 0.5 ? 1 : 0), g: 15 * S, offset: 0, heavy: 0.11 });
        } else if (a.inscription === 'poem') {
          const g = 18 * S;
          cols.push({ count: Math.max(3, Math.round((6 + rnd() * 5) * shrink)), g, offset: 0, heavy: 0.105 });
          cols.push({ count: 2 + (rnd() < 0.5 ? 1 : 0), g: g * 0.85, offset: g * (1 + rnd() * 2), heavy: 0.1 });
        } else if (a.inscription === 'colophon') {
          const g = 12.5 * S;
          const n = 3 + Math.floor(rnd() * 3);
          for (let c = 0; c < n; c++) cols.push({ count: Math.max(3, Math.round((7 + rnd() * 5) * shrink)), g, offset: rnd() < 0.3 ? g : 0, heavy: 0.1 });
          cols.push({ count: 2, g, offset: g * 2, heavy: 0.1 });
        } else {
          const g = (42 + rnd() * 14) * S * Math.max(0.7, shrink);
          cols.push({ count: 2 + (rnd() < 0.4 ? 1 : 0), g, offset: 0, heavy: 0.135 });
          cols.push({ count: 2, g: 14 * S, offset: g * 0.6, heavy: 0.1 });
        }
        const gap = (c: { g: number }) => c.g * 1.35;
        const width = cols.reduce((sum, c) => sum + gap(c), 0);
        const height = Math.max(...cols.map((c, i) => c.offset + c.count * c.g * 1.12 + (i === cols.length - 1 ? sealSize * 1.25 + c.g * 0.4 : 0))) + leisureH;
        return { cols, width, height, gap };
      };
      let layout = plan(1);
      let spot = findSpot(layout.width, layout.height, a.inscription === 'signature' ? 'bottom' : 'top');
      for (let attempt = 0; attempt < 3 && spot.busy > 0.03; attempt++) {
        layout = plan(0.7 - attempt * 0.15);
        spot = findSpot(layout.width, layout.height, a.inscription === 'signature' ? 'bottom' : 'top');
      }
      placed.push({ x: spot.x, y: spot.y, w: layout.width, h: layout.height });
      // Columns run right to left.
      let x = spot.x + layout.width;
      let endY = spot.y, endX = x;
      for (let i = 0; i < layout.cols.length; i++) {
        const c = layout.cols[i];
        const cx = x - layout.gap(c) / 2;
        let y0 = spot.y + c.offset;
        if (i === 0 && leisureH) {
          leadSeal = { x: cx, y: y0 };
          y0 += leisureH;
        }
        endY = drawColumn(cx, y0, c.count, c.g, c.heavy);
        endX = cx;
        x -= layout.gap(c);
      }
      nameSeal = { x: endX, y: endY + sealSize * 0.25 };
      scriptNote.push(`${a.inscription} brushed in the emptiest paper`);
    }
    if (!nameSeal) {
      const spot = findSpot(sealSize * 1.6, sealSize * 1.6 + leisureH, 'bottom');
      placed.push({ x: spot.x, y: spot.y, w: sealSize * 1.6, h: sealSize * 1.6 + leisureH });
      if (leisureH) leadSeal = { x: spot.x + sealSize * 0.8, y: spot.y };
      nameSeal = { x: spot.x + sealSize * 0.8, y: spot.y + sealSize * 0.3 + leisureH };
    }
    const nx = Math.min(size - sealSize - 4 * S, Math.max(4 * S, nameSeal.x - sealSize / 2));
    const ny = Math.min(size - sealSize * (a.seal === 'pair' ? 2.15 : 1) - 4 * S, Math.max(4 * S, nameSeal.y));
    drawSeal(nx, ny, sealSize, sealSize, true, false, cinnabar, 0.92);
    if (a.seal === 'pair') drawSeal(nx + sealSize * 0.08, ny + sealSize * 1.15, sealSize * 0.84, sealSize * 0.84, false, false, cinnabar, 0.9);
    const lead = leadSeal as Pt | null;
    if (a.seal === 'leisure' && lead) drawSeal(lead.x - sealSize * 0.32, lead.y, sealSize * 0.64, sealSize * 1.2, false, true, cinnabar, 0.88);
    if (a.seal === 'corner') {
      const s = sealSize * (1.1 + rnd() * 0.3);
      const left = busy(margin, size - margin - s, s, s) <= busy(size - margin - s, size - margin - s, s, s);
      drawSeal(left ? margin * 0.8 : size - margin * 0.8 - s, size - margin * 0.8 - s, s, s * (rnd() < 0.5 ? 1 : 1.3), rnd() < 0.5, false, cinnabar, 0.9);
    }
    if (a.seal === 'collectors') {
      const count = 3 + Math.floor(rnd() * 4);
      const tints: RGB[] = [[184, 48, 40], [204, 74, 52], [160, 44, 48], [190, 60, 34]];
      for (let k = 0; k < count; k++) {
        const s = sealSize * (0.7 + rnd() * 0.9);
        const tall = rnd() < 0.35;
        const w = s * (tall ? 0.7 : 1), h = s * (tall ? 1.4 : 1);
        let bx = 0, by = 0, bestBusy = 2;
        for (let t = 0; t < 12; t++) {
          const edgeSide = Math.floor(rnd() * 4);
          const along = margin * 0.5 + rnd() * (size - margin - s * 1.5);
          const cx = edgeSide === 0 ? margin * 0.4 : edgeSide === 1 ? size - margin * 0.4 - w : along;
          const cy = edgeSide === 2 ? margin * 0.4 : edgeSide === 3 ? size - margin * 0.4 - h : along;
          const o = busy(cx, cy, w, h) + (placed.some((r) => cx < r.x + r.w && cx + w > r.x && cy < r.y + r.h && cy + h > r.y) ? 1 : 0);
          if (o < bestBusy) {
            bestBusy = o;
            bx = cx;
            by = cy;
          }
        }
        placed.push({ x: bx, y: by, w, h });
        drawSeal(bx, by, w, h, rnd() < 0.5, rnd() < 0.2, tints[k % tints.length], (0.45 + rnd() * 0.4) * (1 - mood.wear * 0.3));
      }
    }
    await pause();

    // ── 7. Paper ─────────────────────────────────────────────────────────────────────────
    const paper = canvasOf();
    const sheet = paper.createImageData(size, size);
    const base = [P.base[0] + warm * 10, P.base[1] + warm * 2, P.base[2] - warm * 14];
    const stain = P.stain * (0.5 + mood.wear);
    for (let y = 0; y < size; y++) {
      if (y % 120 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const p = y * size + x, q = p * 4;
        const mottle = fbm((x * 0.006) / S, (y * 0.006) / S, seed + 17) - 0.5;
        const fine = vnoise(x * 0.08, y * 0.08, seed + 5) - 0.5;
        let v = 1 + mottle * 0.05 * (0.6 + stain) + fine * 0.02;
        const dx = x / size - 0.5, dy = y / size - 0.5;
        v *= 1 - (dx * dx + dy * dy) * 0.3 * (0.35 + stain * 0.6);
        if (P.weave) v *= 1 + 0.022 * (Math.sin((x * 2.35) / S + vnoise(x * 0.02, y * 0.3, seed) * 2) + Math.sin((y * 2.05) / S)) * 0.5;
        const blot = smooth(0.58, 0.82, fbm((x * 0.004) / S, (y * 0.004) / S, seed + 29)) * stain * 0.1;
        sheet.data[q] = base[0] * v * (1 - blot * 0.7);
        sheet.data[q + 1] = base[1] * v * (1 - blot);
        sheet.data[q + 2] = base[2] * v * (1 - blot * 1.5);
        sheet.data[q + 3] = 255;
      }
    }
    paper.putImageData(sheet, 0, 0);
    const fibres = Math.round(2600 * P.fibres * S * S);
    paper.lineCap = 'round';
    for (let k = 0; k < fibres; k++) {
      const x = rnd() * size, y = rnd() * size, l = (3 + rnd() * (P.fibres > 1.2 ? 26 : 12)) * S, ang = rnd() * Math.PI;
      const dark = k % 2 === 0;
      paper.strokeStyle = dark ? `rgba(140,112,74,${(0.05 + rnd() * 0.08).toFixed(3)})` : `rgba(255,252,242,${(0.12 + rnd() * 0.15).toFixed(3)})`;
      paper.lineWidth = (0.5 + rnd() * 0.6) * S;
      paper.beginPath();
      paper.moveTo(x, y);
      paper.quadraticCurveTo(x + Math.cos(ang) * l * 0.5 + (rnd() - 0.5) * l * 0.4, y + Math.sin(ang) * l * 0.5 + (rnd() - 0.5) * l * 0.4, x + Math.cos(ang) * l, y + Math.sin(ang) * l);
      paper.stroke();
    }
    const specks = Math.round(240 * P.specks * S * S);
    for (let k = 0; k < specks; k++) {
      paper.fillStyle = `rgba(92,72,50,${(0.2 + rnd() * 0.35).toFixed(3)})`;
      paper.beginPath();
      paper.arc(rnd() * size, rnd() * size, (0.4 + rnd() * 0.9) * S, 0, Math.PI * 2);
      paper.fill();
    }
    if (aged || mood.wear > 0.6) {
      const foxing = Math.round((aged ? 30 : 8) + mood.wear * 60);
      for (let k = 0; k < foxing; k++) {
        const x = rnd() * size, y = rnd() * size, r = (1 + rnd() * 5) * S;
        const g = paper.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(150,98,50,${(0.12 + rnd() * 0.25).toFixed(3)})`);
        g.addColorStop(1, 'rgba(150,98,50,0)');
        paper.fillStyle = g;
        paper.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    if (aged || (a.paper === 'silk' && mood.wear > 0.35)) {
      // Creases from rolling the scroll: a light ridge over a dark valley, wandering and patchy.
      const creases = aged ? 3 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 2);
      for (let k = 0; k < creases; k++) {
        const y = ((k + 0.5 + (rnd() - 0.5) * 0.6) / creases) * size;
        const strength = (aged ? 1 : 0.6) * (0.5 + mood.wear);
        const x0 = rnd() < 0.5 ? 0 : rnd() * size * 0.4, x1 = rnd() < 0.5 ? size : size * (0.6 + rnd() * 0.4);
        const tilt = (rnd() - 0.5) * 8 * S;
        const ridge = paper.createLinearGradient(x0, 0, x1, 0);
        const valley = paper.createLinearGradient(x0, 0, x1, 0);
        for (let s = 0; s <= 4; s++) {
          const v = rnd();
          ridge.addColorStop(s / 4, `rgba(255,248,230,${(0.07 * v * strength).toFixed(3)})`);
          valley.addColorStop(s / 4, `rgba(90,64,36,${(0.08 * v * strength).toFixed(3)})`);
        }
        for (const [style, dy] of [[ridge, 0], [valley, 1.2 * S]] as const) {
          paper.strokeStyle = style;
          paper.lineWidth = 1.2 * S;
          paper.beginPath();
          paper.moveTo(x0, y + dy);
          paper.quadraticCurveTo((x0 + x1) / 2, y + dy + tilt * 2, x1, y + dy + tilt);
          paper.stroke();
        }
      }
    }
    if (P.flecks) {
      const flecks = Math.round((90 + rnd() * 90) * S * S);
      for (let k = 0; k < flecks; k++) {
        const x = rnd() * size, y = rnd() * size, r = (1.2 + Math.pow(rnd(), 2) * 6) * S;
        paper.fillStyle = `rgba(${200 + Math.round(rnd() * 20)},${158 + Math.round(rnd() * 22)},${70 + Math.round(rnd() * 20)},${(0.45 + rnd() * 0.4).toFixed(3)})`;
        paper.beginPath();
        const sides = 3 + Math.floor(rnd() * 3), spin = rnd() * 6.28;
        for (let s = 0; s < sides; s++) {
          const ang = spin + (s / sides) * Math.PI * 2, rr = r * (0.5 + rnd() * 0.6);
          if (s === 0) paper.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
          else paper.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
        }
        paper.closePath();
        paper.fill();
      }
    }
    const paperData = paper.getImageData(0, 0, size, size).data;
    const scriptData = script.getImageData(0, 0, size, size).data;
    const sealData = seals.getImageData(0, 0, size, size).data;
    await pause();

    // ── 8. Ink into paper ────────────────────────────────────────────────────────────────
    const out = new Uint8ClampedArray(N * 4);
    const ik = ink.map((v) => 1 - v / 255), wk = washInk.map((v) => 1 - v / 255);
    const ak = accent ? accent.map((v) => 1 - v / 255) : [0, 0, 0];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const p = y * size + x, q = p * 4;
        let r = paperData[q], g = paperData[q + 1], b = paperData[q + 2];
        const m = mistF[p] * fade;
        const fib = fibre[p];
        if (accent) {
          const v = Math.min(1, coloured[p] * m * fib);
          r *= 1 - v * ak[0];
          g *= 1 - v * ak[1];
          b *= 1 - v * ak[2];
        }
        const w = Math.min(1, washed[p] * m * fib);
        r *= 1 - w * wk[0];
        g *= 1 - w * wk[1];
        b *= 1 - w * wk[2];
        const l = Math.min(1, L[p] * m * (0.9 + 0.1 * fib));
        r *= 1 - l * ik[0];
        g *= 1 - l * ik[1];
        b *= 1 - l * ik[2];
        const s = (scriptData[q + 3] / 255) * fade;
        r *= 1 - s * ik[0];
        g *= 1 - s * ik[1];
        b *= 1 - s * ik[2];
        const sa = sealData[q + 3] / 255;
        if (sa > 0) {
          const paste = sa * (0.72 + 0.28 * vnoise(x * 0.35, y * 0.35, seed + 61)) * (hash(x, y, seed + 7) < 0.05 ? 0.35 : 1);
          r *= 1 - paste * (1 - sealData[q] / 255);
          g *= 1 - paste * (1 - sealData[q + 1] / 255);
          b *= 1 - paste * (1 - sealData[q + 2] / 255);
        }
        const grain = (hash(x, y, seed + 13) - 0.5) * 3;
        out[q] = r + grain;
        out[q + 1] = g + grain;
        out[q + 2] = b + grain;
        out[q + 3] = 255;
      }
    signal.throwIfAborted();
    return {
      pixels: out,
      notes: [
        `${a.manner} manner on ${a.paper} paper, ${accentNote}`,
        `${linesDrawn} contour strokes, ${setStrokes} strokes suggesting the set, wetness ${wet.toFixed(2)}, ${Math.round(empty * 100)}% of the paper held empty`,
        ...scriptNote,
        `${a.seal} seal`,
      ],
    };
  },
});
