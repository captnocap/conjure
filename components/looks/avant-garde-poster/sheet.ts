import { FLOOR, MARGIN, SET, THING, WALL, type Scene, type Thing } from './scene';

/** Where the wall meets the floor in one column, or null when the column has none. */
export function horizonAt(s: Scene, x: number): number | null {
  const { N, region, area } = s;
  const cx = Math.max(area.x0, Math.min(area.x1 - 1, Math.round(x)));
  let sawWall = false;
  for (let y = area.y0; y < area.y1; y++) {
    const r = region[y * N + cx];
    if (r === WALL) sawWall = true;
    else if (r === FLOOR && sawWall) return y;
  }
  return null;
}

/** A representative horizon height across the picture. */
export function horizonLine(s: Scene): number {
  const samples: number[] = [];
  const { area } = s;
  for (let i = 0; i <= 12; i++) {
    const y = horizonAt(s, area.x0 + ((area.x1 - area.x0) * i) / 12);
    if (y !== null) samples.push(y);
  }
  if (!samples.length) return area.y0 + (area.y1 - area.y0) * (s.hasFloor ? 0.62 : 0.92);
  samples.sort((a, b) => a - b);
  return samples[samples.length >> 1];
}

/** How much open sheet lies on each side of the subject. */
export function space(s: Scene) {
  const { area, subject } = s;
  return {
    left: subject.x0 - area.x0,
    right: area.x1 - subject.x1,
    top: subject.y0 - area.y0,
    bottom: area.y1 - subject.y1,
  };
}

/** Centroid of the shadow a thing casts on the floor or set, if it can be found. */
export function castShadow(s: Scene, t: Thing): [number, number] | null {
  const { N, region, shade, ny, id } = s;
  const h = t.y1 - t.y0, w = t.x1 - t.x0;
  const x0 = Math.max(0, Math.floor(t.x0 - h * 0.8)), x1 = Math.min(N, Math.ceil(t.x1 + h * 0.8));
  const y0 = Math.max(0, Math.floor(t.y0 + h * 0.3)), y1 = Math.min(N, Math.ceil(t.y1 + h * 0.5));
  let sx = 0, sy = 0, n = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const p = y * N + x;
      if (shade[p] < 0.5 || ny[p] > -0.4) continue;
      if (region[p] !== FLOOR && !(region[p] === SET && id[p] === 2)) continue;
      sx += x;
      sy += y;
      n++;
    }
  if (n < Math.max(12, w * 0.5)) return null;
  return [sx / n, sy / n];
}

/** True where a pixel belongs to the background (wall or floor), not to the cast, set or margin. */
export const isGround = (s: Scene, p: number) => s.region[p] === WALL || s.region[p] === FLOOR;
export const isSolid = (s: Scene, p: number) => s.region[p] === THING || s.region[p] === SET;
export const inSheet = (s: Scene, p: number) => s.region[p] !== MARGIN;
