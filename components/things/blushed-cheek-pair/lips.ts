import type { P2 } from './relief';

/** A mouth described by a few numbers; every edge is a function of u = x / W in -1..1. */
export interface Mouth {
  /** Half width, metres. */
  W: number;
  /** Upper and lower lip heights at their fullest. */
  Hu: number;
  Hl: number;
  /** Depth of the cupid's bow notch, 0..1. */
  bow: number;
  /** How far the mouth is open at the centre, metres. */
  gap: number;
  /** Corner lift (smile) or drop, as a fraction of W. */
  smile: number;
  /** How far each lip stands out. */
  Du: number;
  Dl: number;
}

export function mouthCurves(m: Mouth) {
  const lift = (u: number) => m.smile * m.W * u * u;
  const open = (u: number) => m.gap * Math.max(0, 1 - u * u) ** 0.8;
  const line = (u: number) => lift(u) - 0.035 * m.W * Math.exp(-((u / 0.25) ** 2)) + 0.02 * m.W * Math.exp(-(((Math.abs(u) - 0.5) / 0.25) ** 2)) * (1 - u * u);
  const upperEdge = (u: number) => line(u) + open(u) * 0.42;
  const lowerEdge = (u: number) => line(u) - open(u) * 0.58;
  const top = (u: number) => upperEdge(u) + m.Hu * Math.max(0, 1 - Math.abs(u) ** 2.4) ** 0.7 * (1 - m.bow * Math.exp(-((u / 0.17) ** 2)));
  const bottom = (u: number) => lowerEdge(u) - m.Hl * Math.max(0, 1 - Math.abs(u) ** 2.6) ** 0.6;
  return { top, bottom, upperEdge, lowerEdge };
}

/** Which part of the mouth a point is in, and how far the lip stands out there. */
export function mouthAt(m: Mouth, x: number, y: number): { part: 'out' | 'gap' | 'upper' | 'lower'; z: number } {
  const u = x / m.W;
  if (Math.abs(u) >= 1) return { part: 'out', z: 0 };
  const c = mouthCurves(m);
  const side = Math.max(0, 1 - u ** 4) ** 0.5;
  const top = c.top(u), upperEdge = c.upperEdge(u), lowerEdge = c.lowerEdge(u), bottom = c.bottom(u);
  if (y > top || y < bottom) return { part: 'out', z: 0 };
  if (y >= upperEdge) {
    const t = (y - upperEdge) / Math.max(top - upperEdge, 1e-6);
    return { part: 'upper', z: m.Du * side * Math.sin(Math.PI * t ** 0.72) ** 0.62 };
  }
  if (y <= lowerEdge) {
    const t = (lowerEdge - y) / Math.max(lowerEdge - bottom, 1e-6);
    return { part: 'lower', z: m.Dl * side * Math.sin(Math.PI * t ** 0.8) ** 0.62 };
  }
  return { part: 'gap', z: 0 };
}

/** The outer contour of the lips as a polygon, for painting. */
export function mouthOutline(m: Mouth, steps = 48): P2[] {
  const c = mouthCurves(m);
  const points: P2[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = -1 + (2 * i) / steps;
    points.push([u * m.W, c.top(u)]);
  }
  for (let i = steps; i >= 0; i--) {
    const u = -1 + (2 * i) / steps;
    points.push([u * m.W, c.bottom(u)]);
  }
  return points;
}

export function gapOutline(m: Mouth, steps = 32): P2[] {
  const c = mouthCurves(m);
  const points: P2[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = -1 + (2 * i) / steps;
    points.push([u * m.W, c.upperEdge(u)]);
  }
  for (let i = steps; i >= 0; i--) {
    const u = -1 + (2 * i) / steps;
    points.push([u * m.W, c.lowerEdge(u)]);
  }
  return points;
}
