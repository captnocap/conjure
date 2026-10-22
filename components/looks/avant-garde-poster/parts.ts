import { clamp, distanceField } from './common';
import type { Scene, Thing } from './scene';

export type Point = [number, number];
export type Part =
  | { kind: 'rect'; x0: number; y0: number; x1: number; y1: number; area: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; area: number }
  | { kind: 'tri'; a: Point; b: Point; c: Point; area: number }
  | { kind: 'rod'; points: Point[]; width: number; area: number };

function components(mask: Uint8Array, w: number, h: number, minArea: number): number[][] {
  const seen = new Uint8Array(w * h);
  const out: number[][] = [];
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue;
    const pixels: number[] = [];
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const q = stack.pop()!;
      pixels.push(q);
      const x = q % w, y = (q / w) | 0;
      if (x > 0 && mask[q - 1] && !seen[q - 1]) { seen[q - 1] = 1; stack.push(q - 1); }
      if (x < w - 1 && mask[q + 1] && !seen[q + 1]) { seen[q + 1] = 1; stack.push(q + 1); }
      if (y > 0 && mask[q - w] && !seen[q - w]) { seen[q - w] = 1; stack.push(q - w); }
      if (y < h - 1 && mask[q + w] && !seen[q + w]) { seen[q + w] = 1; stack.push(q + w); }
    }
    if (pixels.length >= minArea) out.push(pixels);
  }
  return out;
}

/** Fit a stack of rectangles, discs and triangles to one bulky blob, row by row. */
function bulky(pixels: number[], w: number, ox: number, oy: number): Part[] {
  let ry0 = Infinity, ry1 = -Infinity;
  for (const q of pixels) {
    const y = (q / w) | 0;
    if (y < ry0) ry0 = y;
    if (y > ry1) ry1 = y;
  }
  const H = ry1 - ry0 + 1;
  const width = new Float64Array(H), left = new Float64Array(H).fill(Infinity), right = new Float64Array(H).fill(-Infinity), sumX = new Float64Array(H);
  for (const q of pixels) {
    const y = ((q / w) | 0) - ry0, x = q % w;
    width[y]++;
    sumX[y] += x;
    if (x < left[y]) left[y] = x;
    if (x > right[y]) right[y] = x;
  }
  const S1 = new Float64Array(H + 1), S2 = new Float64Array(H + 1);
  for (let y = 0; y < H; y++) {
    S1[y + 1] = S1[y] + width[y];
    S2[y + 1] = S2[y] + width[y] * width[y];
  }
  const sse = (i: number, j: number) => S2[j] - S2[i] - ((S1[j] - S1[i]) ** 2) / (j - i);
  const meanW = S1[H] / H;
  const L = Math.max(3, Math.round(H * 0.14));
  const K = Math.min(4, Math.floor(H / L));
  if (K < 1) {
    let l = Infinity, r = -Infinity;
    for (let y = 0; y < H; y++) if (width[y]) { l = Math.min(l, left[y]); r = Math.max(r, right[y]); }
    return [{ kind: 'rect', x0: ox + l, y0: oy + ry0, x1: ox + r + 1, y1: oy + ry1 + 1, area: pixels.length }];
  }
  const dp: Float64Array[] = [], from: Int32Array[] = [];
  for (let k = 0; k <= K; k++) {
    dp.push(new Float64Array(H + 1).fill(Infinity));
    from.push(new Int32Array(H + 1));
  }
  dp[0][0] = 0;
  for (let k = 1; k <= K; k++)
    for (let j = k * L; j <= H; j++)
      for (let i = (k - 1) * L; i <= j - L; i++) {
        if (dp[k - 1][i] === Infinity) continue;
        const cost = dp[k - 1][i] + sse(i, j);
        if (cost < dp[k][j]) {
          dp[k][j] = cost;
          from[k][j] = i;
        }
      }
  const penalty = H * (0.12 * meanW) ** 2;
  let bestK = 1;
  for (let k = 1; k <= K; k++) if (dp[k][H] + k * penalty < dp[bestK][H] + bestK * penalty) bestK = k;
  const bounds: number[] = [H];
  for (let k = bestK, j = H; k > 0; k--) {
    j = k === 1 ? 0 : from[k][j];
    bounds.unshift(j);
  }
  if (bounds[0] !== 0) bounds.unshift(0);

  const parts: Part[] = [];
  for (let s = 0; s < bounds.length - 1; s++) {
    const i = bounds[s], j = bounds[s + 1];
    const n = j - i;
    if (n <= 0) continue;
    const area = S1[j] - S1[i];
    if (area < 4) continue;
    const mw = area / n;
    let lsum = 0, rsum = 0, rows = 0, lmin = Infinity, rmax = -Infinity, cx = 0, cy = 0;
    let st = 0, sw = 0, stt = 0, stw = 0;
    for (let y = i; y < j; y++) {
      if (!width[y]) continue;
      lsum += left[y];
      rsum += right[y];
      rows++;
      lmin = Math.min(lmin, left[y]);
      rmax = Math.max(rmax, right[y]);
      cx += sumX[y];
      cy += (y + 0.5) * width[y];
      const t = y - i;
      st += t;
      sw += width[y];
      stt += t * t;
      stw += t * width[y];
    }
    if (!rows) continue;
    cx /= area;
    cy /= area;
    const slope = (rows * stw - st * sw) / Math.max(1e-6, rows * stt - st * st);
    const change = (slope * n) / Math.max(1, mw);
    const fill = area / (n * (rmax - lmin + 1));
    const top = oy + ry0 + i, bottom = oy + ry0 + j;
    if (Math.abs(change) > 0.85 && n > mw * 0.3) {
      // Tapers: a triangle with its apex at the narrow end.
      const narrowRow = change > 0 ? i : j - 1;
      const wideRows = change > 0 ? [Math.max(i, j - 3), j] : [i, Math.min(j, i + 3)];
      let wl = Infinity, wr = -Infinity;
      for (let y = wideRows[0]; y < wideRows[1]; y++) if (width[y]) {
        wl = Math.min(wl, left[y]);
        wr = Math.max(wr, right[y]);
      }
      const apexX = width[narrowRow] ? sumX[narrowRow] / width[narrowRow] : cx;
      const apex: Point = [ox + apexX + 0.5, change > 0 ? top : bottom];
      const baseY = change > 0 ? bottom : top;
      parts.push({ kind: 'tri', a: apex, b: [ox + wl, baseY], c: [ox + wr + 1, baseY], area });
    } else if (n / mw > 0.75 && n / mw < 1.33 && fill < 0.84 && (s === 0 || bounds.length === 2)) {
      // Discs only for a head on top of a stack, or a blob that is round on its own.
      parts.push({ kind: 'circle', cx: ox + cx + 0.5, cy: oy + ry0 + cy, r: Math.sqrt(area / Math.PI) * 1.03, area });
    } else {
      parts.push({ kind: 'rect', x0: ox + lsum / rows, y0: top, x1: ox + rsum / rows + 1, y1: bottom, area });
    }
  }
  return parts;
}

/** A thin blob becomes a jointed rod through the centres of its stretches. */
function rod(pixels: number[], w: number, ox: number, oy: number, thickness: Float32Array, N: number): Part | null {
  let mx = 0, my = 0, t = 0;
  for (const q of pixels) {
    mx += q % w;
    my += (q / w) | 0;
    t += thickness[q];
  }
  const n = pixels.length;
  mx /= n;
  my /= n;
  let cxx = 0, cyy = 0, cxy = 0;
  for (const q of pixels) {
    const dx = (q % w) - mx, dy = ((q / w) | 0) - my;
    cxx += dx * dx;
    cyy += dy * dy;
    cxy += dx * dy;
  }
  const angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let tmin = Infinity, tmax = -Infinity;
  for (const q of pixels) {
    const v = ((q % w) - mx) * dx + (((q / w) | 0) - my) * dy;
    if (v < tmin) tmin = v;
    if (v > tmax) tmax = v;
  }
  const length = tmax - tmin;
  if (length < 6) return null;
  const segments = clamp(Math.round(length / (0.085 * N)), 1, 4);
  const bins = segments + 1;
  const sx = new Float64Array(bins), sy = new Float64Array(bins), sn = new Float64Array(bins);
  for (const q of pixels) {
    const x = q % w, y = (q / w) | 0;
    const v = (x - mx) * dx + (y - my) * dy;
    const b = Math.min(bins - 1, Math.floor(((v - tmin) / (length + 1e-6)) * bins));
    sx[b] += x;
    sy[b] += y;
    sn[b]++;
  }
  const points: Point[] = [];
  for (let b = 0; b < bins; b++) if (sn[b]) points.push([ox + sx[b] / sn[b] + 0.5, oy + sy[b] / sn[b] + 0.5]);
  if (points.length < 2) {
    points.length = 0;
    points.push([ox + mx + dx * tmin, oy + my + dy * tmin], [ox + mx + dx * tmax, oy + my + dy * tmax]);
  } else {
    // Stretch the ends out to the true extremes of the blob.
    const first = points[0], last = points[points.length - 1];
    const half = length / bins / 2;
    points[0] = [first[0] - dx * half, first[1] - dy * half];
    points[points.length - 1] = [last[0] + dx * half, last[1] + dy * half];
  }
  return { kind: 'rod', points, width: Math.max(2, (t / n) * 2.4), area: n };
}

/** Reduce one placed thing to geometric parts: bulky masses and thin rods. */
export function decompose(s: Scene, thing: Thing): Part[] {
  const { N } = s;
  const pad = 2;
  const bx0 = Math.max(0, thing.x0 - pad), by0 = Math.max(0, thing.y0 - pad);
  const bx1 = Math.min(N, thing.x1 + pad), by1 = Math.min(N, thing.y1 + pad);
  const w = bx1 - bx0, h = by1 - by0;
  if (w < 3 || h < 3) return [];
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[y * w + x] = s.id[(by0 + y) * N + bx0 + x] === thing.id ? 1 : 0;
  const inside = distanceField(w, h, (q) => !mask[q]);
  let tMax = 0;
  for (let q = 0; q < w * h; q++) if (mask[q] && inside[q] > tMax) tMax = inside[q];
  const tau = Math.max(0.3 * tMax, 0.011 * N);
  const opened = new Uint8Array(w * h);
  if (tMax >= tau) {
    const toCore = distanceField(w, h, (q) => mask[q] === 1 && inside[q] >= tau);
    for (let q = 0; q < w * h; q++) opened[q] = mask[q] && toCore[q] <= tau + 0.75 ? 1 : 0;
  }
  const thin = new Uint8Array(w * h);
  for (let q = 0; q < w * h; q++) thin[q] = mask[q] && !opened[q] ? 1 : 0;
  const parts: Part[] = [];
  for (const blob of components(opened, w, h, Math.max(30, thing.area * 0.01))) parts.push(...bulky(blob, w, bx0, by0));
  for (const blob of components(thin, w, h, Math.max(20, thing.area * 0.004))) {
    const r = rod(blob, w, bx0, by0, inside, N);
    if (r) parts.push(r);
  }
  return parts;
}
