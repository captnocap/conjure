import type { Capture, QuestionSet } from '../kit/contract';
import { choice } from '../kit/questions';

/**
 * A second style laid over part of the picture. A look treats each object as one mass, so the
 * details that make it (an eye, a face, a sign) can vanish under a heavy treatment; an accent
 * redraws the hero, or just its most striking detail, with a contrasting look on the same capture.
 */
export const ACCENT_QUESTIONS = {
  accent: choice('Is part of the picture drawn in a second, contrasting style laid over the first?', {
    none: 'No: one style for the whole picture.',
    hero: 'Yes: the hero is drawn in a second style, standing apart from everything else.',
    detail: 'Yes: only the hero’s most striking detail, such as an eye, a face or a mark, is drawn in a second style.',
  }),
  accentEdge: choice('If part is drawn in a second style, how does it meet the first?', {
    clean: 'A clean cut along the shape.',
    feather: 'A soft feathered blend.',
    torn: 'A torn paper edge with a white rim, like a collage.',
    outline: 'An inked outline around it.',
  }),
} satisfies QuestionSet;

export const ACCENT_NAMES: readonly string[] = [...Object.keys(ACCENT_QUESTIONS), 'accentLook'];
export type AccentRegion = 'hero' | 'detail';
export type AccentEdge = keyof typeof ACCENT_QUESTIONS.accentEdge.options;

/** The first placed thing; the stage numbers things from 3. */
export const HERO_ID = 3;

/** Box sums over a square window, from an integral image. */
function boxSum(integral: Float64Array, size: number, x: number, y: number, radius: number) {
  const stride = size + 1;
  const x0 = Math.max(0, x - radius), y0 = Math.max(0, y - radius);
  const x1 = Math.min(size, x + radius + 1), y1 = Math.min(size, y + radius + 1);
  return integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0];
}

function integralOf(values: ArrayLike<number>, size: number) {
  const stride = size + 1, integral = new Float64Array(stride * stride);
  for (let y = 0; y < size; y++) {
    let row = 0;
    for (let x = 0; x < size; x++) {
      row += values[y * size + x];
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  return integral;
}

/** Grow (positive radius) or shrink (negative) a binary mask by a square window. */
export function morph(mask: Uint8Array, size: number, radius: number): Uint8Array<ArrayBuffer> {
  const integral = integralOf(mask, size), out = new Uint8Array(size * size);
  const r = Math.abs(radius);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sum = boxSum(integral, size, x, y, r);
    // Growing keeps any pixel the window touches; shrinking keeps only windows that are entirely set.
    const area = (Math.min(size, x + r + 1) - Math.max(0, x - r)) * (Math.min(size, y + r + 1) - Math.max(0, y - r));
    out[y * size + x] = radius >= 0 ? (sum > 0 ? 1 : 0) : (sum >= area - 0.5 ? 1 : 0);
  }
  return out;
}

/**
 * Where the second style goes, 0..1 per pixel. For the hero, its silhouette. For a detail, the parts
 * of the hero whose colour departs from the hero's own average and whose neighbourhood is busy (an
 * eye with lashes, lettering, a face), closed into blobs, keeping the strongest one or two. Falls
 * back to the whole hero when nothing stands out, and to nothing when there is no hero in frame.
 */
export function accentMask(capture: Capture, region: AccentRegion): Uint8Array<ArrayBuffer> {
  const { size, identity, color } = capture;
  const count = size * size;
  const hero = new Uint8Array(count);
  let heroArea = 0;
  for (let i = 0; i < count; i++) if (identity[i * 4] === HERO_ID) { hero[i] = 1; heroArea++; }
  if (!heroArea || region === 'hero') return hero;
  // The hero's own average colour.
  let mr = 0, mg = 0, mb = 0;
  for (let i = 0; i < count; i++) if (hero[i]) { mr += color[i * 4]; mg += color[i * 4 + 1]; mb += color[i * 4 + 2]; }
  mr /= heroArea; mg /= heroArea; mb /= heroArea;
  // Local spread of brightness, counting only hero pixels so the silhouette edge is not mistaken for detail.
  const lum = new Float32Array(count), lum2 = new Float32Array(count), inside = new Float32Array(count);
  for (let i = 0; i < count; i++) if (hero[i]) {
    const l = color[i * 4] * 0.2126 + color[i * 4 + 1] * 0.7152 + color[i * 4 + 2] * 0.0722;
    lum[i] = l; lum2[i] = l * l; inside[i] = 1;
  }
  const S = integralOf(lum, size), S2 = integralOf(lum2, size), N = integralOf(inside, size);
  const score = new Float32Array(count);
  const scores: number[] = [];
  const radius = Math.max(3, Math.round(size / 130));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    if (!hero[i]) continue;
    const n = boxSum(N, size, x, y, radius);
    const mean = boxSum(S, size, x, y, radius) / n;
    const spread = Math.sqrt(Math.max(0, boxSum(S2, size, x, y, radius) / n - mean * mean));
    const distance = Math.hypot(color[i * 4] - mr, color[i * 4 + 1] - mg, color[i * 4 + 2] - mb) / 441;
    // Detail means a busy neighbourhood; departing from the hero's colour only strengthens it, so a
    // flat patch of another colour (a painted blotch) is not mistaken for an eye.
    score[i] = Math.min(1, spread / 45) * (0.6 + 0.4 * Math.min(1, distance * 2));
    if ((x + y) % 3 === 0) scores.push(score[i]);
  }
  scores.sort((a, b) => a - b);
  const threshold = Math.max(0.3, scores[Math.floor(scores.length * 0.85)] ?? 1);
  const busy = new Uint8Array(count);
  for (let i = 0; i < count; i++) busy[i] = hero[i] && score[i] > threshold ? 1 : 0;
  // A focal point: the window, about a quarter of the hero across, that holds the most detail.
  let x0 = size, y0 = size, x1 = 0, y1 = 0;
  for (let i = 0; i < count; i++) if (hero[i]) { const x = i % size, y = (i - x) / size; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const half = Math.max(4, Math.round(Math.sqrt(heroArea) * 0.14));
  const weighted = new Float32Array(count);
  for (let i = 0; i < count; i++) if (busy[i]) weighted[i] = score[i];
  const W = integralOf(weighted, size);
  const step = Math.max(1, Math.round(half / 6));
  const windows: { x: number; y: number; sum: number }[] = [];
  for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) {
    const sum = boxSum(W, size, x, y, half);
    if (sum > 0) windows.push({ x, y, sum });
  }
  if (!windows.length) return hero;
  windows.sort((a, b) => b.sum - a.sum);
  // One focal point, and a second only if it is nearly as strong and does not overlap (two eyes, say).
  const focal = [windows[0]];
  const second = windows.find((w) => Math.hypot(w.x - focal[0].x, w.y - focal[0].y) > half * 2.2);
  if (second && second.sum >= windows[0].sum * 0.7) focal.push(second);
  // Within each window, the busy parts grown into a shape, kept inside a soft oval and the hero.
  const reach = Math.max(3, Math.round(half * 0.35));
  const core = new Uint8Array(count);
  for (const { x: cx, y: cy } of focal)
    for (let y = Math.max(0, cy - half); y <= Math.min(size - 1, cy + half); y++)
      for (let x = Math.max(0, cx - half); x <= Math.min(size - 1, cx + half); x++) if (busy[y * size + x]) core[y * size + x] = 1;
  const grown = morph(core, size, reach);
  const detail = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    if (!grown[i] || !hero[i]) continue;
    const x = i % size, y = (i - x) / size;
    if (focal.some((w) => ((x - w.x) / (half * 1.35)) ** 2 + ((y - w.y) / (half * 1.35)) ** 2 <= 1)) detail[i] = 1;
  }
  return detail.some(Boolean) ? detail : hero;
}

/** A separable box blur, repeated, as a cheap soft edge. */
function soften(mask: ArrayLike<number>, size: number, radius: number, passes = 2): Float32Array {
  let current = Float32Array.from(mask);
  if (radius < 1) return current;
  const scratch = new Float32Array(size * size);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < size; y++) {
      let sum = 0;
      for (let x = -radius; x <= radius; x++) sum += current[y * size + Math.min(size - 1, Math.max(0, x))];
      for (let x = 0; x < size; x++) {
        scratch[y * size + x] = sum / (2 * radius + 1);
        sum += current[y * size + Math.min(size - 1, x + radius + 1)] - current[y * size + Math.max(0, x - radius)];
      }
    }
    const next = new Float32Array(size * size);
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) sum += scratch[Math.min(size - 1, Math.max(0, y)) * size + x];
      for (let y = 0; y < size; y++) {
        next[y * size + x] = sum / (2 * radius + 1);
        sum += scratch[Math.min(size - 1, y + radius + 1) * size + x] - scratch[Math.max(0, y - radius) * size + x];
      }
    }
    current = next;
  }
  return current;
}

const smooth = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Lay the accent's pixels over the base inside the mask, meeting it the chosen way. Deterministic for a seed. */
export function composeAccent(base: Uint8ClampedArray, accent: Uint8ClampedArray, mask: Uint8Array, size: number, edge: AccentEdge, seed: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(base);
  const scale = size / 720;
  const soft = soften(mask, size, Math.max(1, Math.round((edge === 'feather' ? 16 : 1.5) * scale)));
  const ring = edge === 'torn' || edge === 'outline' ? soften(mask, size, Math.max(1, Math.round((edge === 'torn' ? 5 : 2.5) * scale))) : null;
  let state = seed >>> 0;
  const noise = (i: number) => { state = Math.imul(state ^ (i * 2654435761), 1597334677) >>> 0; return ((state >>> 8) & 0xffff) / 0xffff; };
  for (let i = 0; i < size * size; i++) {
    // A feather fades in from the region's own edge, so the second look's background never haloes
    // outside it; the other edges cut on the edge itself.
    let weight = edge === 'feather' ? smooth(0.5, 0.97, soft[i]) : smooth(0.35, 0.65, soft[i]);
    let paint: [number, number, number] | null = null, paintWeight = 0;
    // Away from the region there is nothing to tear: the rim lives only within the softened band.
    if (edge === 'torn' && ring && ring[i] > 0.02) {
      const x = i % size, y = (i - x) / size;
      // A ragged boundary: the threshold wanders with a cheap value noise along the edge.
      const wobble = (Math.sin(x * 0.21 + y * 0.13 + (seed % 97)) + Math.sin(x * 0.07 - y * 0.29)) * 0.12 + (noise(i) - 0.5) * 0.18;
      weight = smooth(0.48, 0.56, ring[i] + wobble);
      const rim = smooth(0.18, 0.3, ring[i] + wobble) * (1 - weight);
      if (rim > 0) { paint = [246, 243, 236]; paintWeight = rim; }
    } else if (edge === 'outline' && ring) {
      const line = 1 - Math.abs(ring[i] - 0.5) * 2;
      if (line > 0.4) { paint = [27, 26, 23]; paintWeight = smooth(0.4, 0.8, line) * 0.9; }
    }
    if (weight <= 0 && paintWeight <= 0) continue;
    const p = i * 4;
    for (let c = 0; c < 3; c++) {
      let value = base[p + c] * (1 - weight) + accent[p + c] * weight;
      if (paint) value = value * (1 - paintWeight) + paint[c] * paintWeight;
      out[p + c] = value;
    }
  }
  return out;
}
