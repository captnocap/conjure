import type { Capture } from '@conjure/kit';
import { type RGB, clamp, distanceField, smooth } from './common';

/** Regions of the sheet, after the layout has tipped or inset the picture. */
export const WALL = 0, FLOOR = 1, SET = 2, THING = 3, MARGIN = 4;
const OUTSIDE = 254;

export interface Layout {
  /** Picture scale inside the sheet. */
  scale: number;
  /** Rotation of the picture, radians, positive clockwise on screen. */
  theta: number;
  /** Centre of the picture on the sheet, pixels. */
  cx: number;
  cy: number;
  /** The image area; outside it is bare paper margin. */
  box: { x0: number; y0: number; x1: number; y1: number };
  /** Extra slope of a synthetic horizon, radians. */
  slope: number;
}

export interface Thing {
  id: number;
  area: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  colour: RGB;
  lum: number;
  confidence: number;
}

export interface Scene {
  N: number;
  count: number;
  id: Uint8Array;
  region: Uint8Array;
  depth: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  lit: Float32Array;
  lum: Float32Array;
  rgb: Uint8Array;
  /** 0 lit … 1 in shadow. */
  shade: Float32Array;
  things: Thing[];
  set: Thing | null;
  hero: Thing | null;
  /** Bounds of everything placed (things, else the set). */
  subject: { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number };
  hasWall: boolean;
  hasFloor: boolean;
  /** Unit vector toward the key light in image space (x right, y down). */
  light: [number, number];
  area: Layout['box'];
  inArea: Float32Array;
  /** Metres per depth unit, and metres per pixel, for discontinuity tests. */
  depthSpan: number;
  pixelWorld: number;
  /** Mean floor normal z (how foreshortened the floor is). */
  floorTilt: number;
  /** The shadows cast on floor and set: centroid, and whether any exist. */
  shadowAt: [number, number] | null;
}

export function analyse(capture: Capture, layout: Layout, signal: AbortSignal): Scene {
  const N = capture.size, count = N * N;
  const { identity, depth: depthBytes, normal, diffuse, color } = capture;

  // Normalise the plain lighting so "in shadow" means the same in every world.
  const histogram = new Uint32Array(256);
  for (let p = 0; p < count; p++) {
    if (identity[p * 4] === 0) continue;
    const at = p * 4;
    histogram[Math.min(255, Math.round(diffuse[at] * 0.3 + diffuse[at + 1] * 0.59 + diffuse[at + 2] * 0.11))]++;
  }
  let total = 0;
  for (let v = 0; v < 256; v++) total += histogram[v];
  let bright = 255;
  for (let v = 0, seen = 0; v < 256; v++) {
    seen += histogram[v];
    if (seen >= total * 0.92) {
      bright = Math.max(8, v);
      break;
    }
  }

  const id = new Uint8Array(count);
  const depth = new Float32Array(count);
  const nx = new Float32Array(count), ny = new Float32Array(count), nz = new Float32Array(count);
  const lit = new Float32Array(count);
  const lum = new Float32Array(count);
  const rgb = new Uint8Array(count * 3);
  const inArea = new Float32Array(count);

  const { scale, theta, cx, cy, box } = layout;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const half = N / 2;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const p = y * N + x;
      const inside = x >= box.x0 && x < box.x1 && y >= box.y0 && y < box.y1;
      inArea[p] = inside ? 1 : 0;
      const u = (x + 0.5 - cx) / scale, v = (y + 0.5 - cy) / scale;
      const sx = Math.floor(cos * u + sin * v + half), sy = Math.floor(-sin * u + cos * v + half);
      if (!inside) {
        id[p] = OUTSIDE;
        depth[p] = 1;
        nz[p] = 1;
        lit[p] = 1;
        lum[p] = 1;
        continue;
      }
      if (sx < 0 || sy < 0 || sx >= N || sy >= N) {
        id[p] = 0;
        depth[p] = 1;
        nz[p] = 1;
        lit[p] = 1;
        lum[p] = 0.9;
        rgb[p * 3] = rgb[p * 3 + 1] = rgb[p * 3 + 2] = 230;
        continue;
      }
      const q = sy * N + sx, at = q * 4;
      const raw = identity[at];
      id[p] = Math.min(253, raw);
      depth[p] = raw === 0 ? 1 : (depthBytes[at] * 65536 + depthBytes[at + 1] * 256 + depthBytes[at + 2]) / 16777216;
      const ax = normal[at] / 127.5 - 1, ay = -(normal[at + 1] / 127.5 - 1), az = normal[at + 2] / 127.5 - 1;
      nx[p] = cos * ax - sin * ay;
      ny[p] = sin * ax + cos * ay;
      nz[p] = raw === 0 ? 1 : az;
      lit[p] = raw === 0 ? 1 : Math.min(1.2, (diffuse[at] * 0.3 + diffuse[at + 1] * 0.59 + diffuse[at + 2] * 0.11) / bright);
      rgb[p * 3] = color[at];
      rgb[p * 3 + 1] = color[at + 1];
      rgb[p * 3 + 2] = color[at + 2];
      lum[p] = (color[at] * 0.299 + color[at + 1] * 0.587 + color[at + 2] * 0.114) / 255;
    }
  }
  signal.throwIfAborted();

  // Per-identity statistics.
  const stats = new Map<number, { area: number; sx: number; sy: number; x0: number; y0: number; x1: number; y1: number; r: number; g: number; b: number }>();
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const p = y * N + x;
      const k = id[p];
      if (k === OUTSIDE) continue;
      let s = stats.get(k);
      if (!s) stats.set(k, (s = { area: 0, sx: 0, sy: 0, x0: N, y0: N, x1: 0, y1: 0, r: 0, g: 0, b: 0 }));
      s.area++;
      s.sx += x;
      s.sy += y;
      if (x < s.x0) s.x0 = x;
      if (y < s.y0) s.y0 = y;
      if (x > s.x1) s.x1 = x;
      if (y > s.y1) s.y1 = y;
      s.r += rgb[p * 3];
      s.g += rgb[p * 3 + 1];
      s.b += rgb[p * 3 + 2];
    }
  const toThing = (k: number): Thing | null => {
    const s = stats.get(k);
    if (!s || s.area < 30) return null;
    const colour: RGB = [s.r / s.area, s.g / s.area, s.b / s.area];
    return {
      id: k,
      area: s.area,
      x0: s.x0,
      y0: s.y0,
      x1: s.x1 + 1,
      y1: s.y1 + 1,
      cx: s.sx / s.area,
      cy: s.sy / s.area,
      colour,
      lum: (colour[0] * 0.299 + colour[1] * 0.587 + colour[2] * 0.114) / 255,
      confidence: clamp(capture.confidence?.[k] ?? 1, 0, 1),
    };
  };
  const things: Thing[] = [];
  for (const k of [...stats.keys()].sort((a, b) => a - b)) if (k >= 3) {
    const t = toThing(k);
    if (t) things.push(t);
  }
  const set = toThing(2);
  const hero = things.find((t) => t.id === 3) ?? things.slice().sort((a, b) => b.area - a.area)[0] ?? null;
  const placed = things.length ? things : set ? [set] : [];
  const subject = placed.length
    ? {
        x0: Math.min(...placed.map((t) => t.x0)),
        y0: Math.min(...placed.map((t) => t.y0)),
        x1: Math.max(...placed.map((t) => t.x1)),
        y1: Math.max(...placed.map((t) => t.y1)),
        cx: 0,
        cy: 0,
      }
    : { x0: N * 0.35, y0: N * 0.3, x1: N * 0.65, y1: N * 0.75, cx: 0, cy: 0 };
  subject.cx = (subject.x0 + subject.x1) / 2;
  subject.cy = (subject.y0 + subject.y1) / 2;

  // Wall and floor: the scene's own split when it has both, otherwise a horizon set behind the cast.
  const areaPixels = (box.x1 - box.x0) * (box.y1 - box.y0);
  const backdrop = stats.get(0)?.area ?? 0;
  const ground = stats.get(1)?.area ?? 0;
  const natural = backdrop > areaPixels * 0.04 && ground > areaPixels * 0.04;
  const region = new Uint8Array(count);
  let hasWall = true, hasFloor = true;
  if (natural) {
    for (let p = 0; p < count; p++) {
      const k = id[p];
      region[p] = k === OUTSIDE ? MARGIN : k === 0 ? WALL : k === 1 ? FLOOR : k === 2 ? SET : THING;
    }
  } else if (ground > areaPixels * 0.04) {
    const feet = things.length ? things : set ? [set] : [];
    let horizon = N * 0.62;
    if (feet.length) {
      const top = Math.min(...feet.map((t) => t.y0)), bottom = Math.max(...feet.map((t) => t.y1));
      horizon = top + (bottom - top) * 0.72;
    }
    horizon = clamp(horizon, box.y0 + (box.y1 - box.y0) * 0.3, box.y0 + (box.y1 - box.y0) * 0.86);
    const tan = Math.tan(layout.slope);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const p = y * N + x;
        const k = id[p];
        const line = horizon + tan * (x - subject.cx);
        region[p] = k === OUTSIDE ? MARGIN : k === 2 ? SET : k >= 3 ? THING : y < line ? WALL : FLOOR;
      }
  } else {
    hasFloor = false;
    for (let p = 0; p < count; p++) {
      const k = id[p];
      region[p] = k === OUTSIDE ? MARGIN : k === 2 ? SET : k >= 3 ? THING : WALL;
    }
  }
  if (!natural && backdrop + ground < areaPixels * 0.02) hasWall = false;

  // Shadow: the split that best separates light from shade (Otsu) on everything solid.
  const solidHistogram = new Uint32Array(64);
  let solid = 0;
  for (let p = 0; p < count; p++) {
    if (id[p] === 0 || id[p] === OUTSIDE) continue;
    solidHistogram[Math.min(63, Math.floor((lit[p] / 1.2) * 64))]++;
    solid++;
  }
  let split = 0.5;
  if (solid) {
    let sumAll = 0;
    for (let v = 0; v < 64; v++) sumAll += v * solidHistogram[v];
    let below = 0, sumBelow = 0, best = -1;
    for (let v = 0; v < 64; v++) {
      below += solidHistogram[v];
      sumBelow += v * solidHistogram[v];
      const above = solid - below;
      if (!below || !above) continue;
      const gap = sumBelow / below - (sumAll - sumBelow) / above;
      const between = below * above * gap * gap;
      if (between > best) {
        best = between;
        split = ((v + 0.5) / 64) * 1.2;
      }
    }
    split = clamp(split, 0.25, 0.8);
  }
  const shade = new Float32Array(count);
  let shX = 0, shY = 0, shN = 0;
  for (let p = 0; p < count; p++) {
    if (id[p] === 0 || id[p] === OUTSIDE) continue;
    shade[p] = smooth(split + 0.05, split - 0.05, lit[p]);
    if (shade[p] > 0.5 && (region[p] === FLOOR || id[p] === 2) && ny[p] < -0.4) {
      shX += p % N;
      shY += (p / N) | 0;
      shN++;
    }
  }

  // Floor foreshortening.
  let fz = 0, fn = 0;
  for (let p = 0; p < count; p += 7)
    if (id[p] === 1) {
      fz += Math.abs(nz[p]);
      fn++;
    }

  const lx = capture.light[0], ly = capture.light[1];
  let rx = cos * lx - sin * ly, ry = sin * lx + cos * ly;
  const len = Math.hypot(rx, ry);
  if (len < 0.08) {
    rx = -0.6;
    ry = -0.8;
  } else {
    rx /= len;
    ry /= len;
  }

  return {
    N,
    count,
    id,
    region,
    depth,
    nx,
    ny,
    nz,
    lit,
    lum,
    rgb,
    shade,
    things,
    set,
    hero,
    subject,
    hasWall,
    hasFloor,
    light: [rx, ry],
    area: box,
    inArea,
    depthSpan: capture.far - capture.near,
    pixelWorld: capture.pixelWorldSize / scale,
    floorTilt: fn ? clamp(fz / fn, 0.25, 1) : 0.6,
    shadowAt: shN > 20 ? [shX / shN, shY / shN] : null,
  };
}

export interface EdgeOptions {
  /** Draw where a solid meets anything else. */
  silhouettes: boolean;
  /** Fold lines inside a solid where the normal turns by more than this (cosine), or null. */
  crease: number | null;
  /** Colour edges inside a solid stronger than this luminance step, or null. */
  colour: number | null;
  /** Where wall meets floor. */
  horizon: boolean;
  /** Which ids count as solids for silhouettes and creases. */
  solid: (k: number) => boolean;
}

/** One-pixel edge skeleton of the picture. */
export function edges(s: Scene, o: EdgeOptions): Uint8Array {
  const { N, id, region, depth, nx, ny, nz, lum } = s;
  const out = new Uint8Array(s.count);
  const jump = (8 * s.pixelWorld) / Math.max(1e-6, s.depthSpan);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const p = y * N + x;
      if (region[p] === MARGIN) continue;
      for (const q of [x + 1 < N ? p + 1 : -1, y + 1 < N ? p + N : -1]) {
        if (q < 0 || region[q] === MARGIN) continue;
        const a = id[p], b = id[q];
        let mark = false;
        if (a !== b) {
          if (o.silhouettes && (o.solid(a) || o.solid(b))) mark = true;
        } else if (o.solid(a)) {
          if (Math.abs(depth[p] - depth[q]) > jump * Math.max(1, 3 * (1 - Math.abs(nz[p])))) mark = o.silhouettes;
          if (!mark && o.crease !== null && nx[p] * nx[q] + ny[p] * ny[q] + nz[p] * nz[q] < o.crease) mark = true;
          if (!mark && o.colour !== null && Math.abs(lum[p] - lum[q]) > o.colour) mark = true;
        }
        if (!mark && o.horizon && region[p] !== region[q] && (region[p] <= FLOOR && region[q] <= FLOOR)) mark = true;
        if (mark) {
          out[p] = 1;
          break;
        }
      }
    }
  // Drop isolated specks so they do not swell into blots.
  for (let y = 1; y < N - 1; y++)
    for (let x = 1; x < N - 1; x++) {
      const p = y * N + x;
      if (!out[p]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && out[p + dy * N + dx]) n++;
      if (!n) out[p] = 0;
    }
  return out;
}

/** Turn a skeleton into an equal-weight line of the given half-width. */
export function stroke(s: Scene, skeleton: Uint8Array, radius: number): Float32Array {
  const distance = distanceField(s.N, s.N, (p) => skeleton[p] === 1);
  const out = new Float32Array(s.count);
  for (let p = 0; p < s.count; p++) out[p] = clamp(radius + 0.5 - distance[p], 0, 1);
  return out;
}

/** A mask of one identity, and its bounding box padded by `pad`. */
export function maskOf(s: Scene, k: number) {
  const out = new Uint8Array(s.count);
  for (let p = 0; p < s.count; p++) if (s.id[p] === k) out[p] = 1;
  return out;
}
