import { mix } from '@conjure/kit';
import { type Press, type RGB, clamp, hash2, hueGap, hueOf, luma, mixRGB, sameRGB } from './common';
import { CAPITAL_ADVANCE, capitals, textBars } from './glyphs';
import type { Ctx } from './palette';
import { FLOOR, WALL, type Scene, type Thing, edges, stroke } from './scene';

type Pair = readonly [RGB | null, RGB];

const apart = (a: RGB | null, b: RGB | null, paper: RGB) => {
  const x = a ?? paper, y = b ?? paper;
  if (Math.abs(luma(x) - luma(y)) > 0.22) return true;
  const hx = hueOf(x), hy = hueOf(y);
  return hx.sat > 0.3 && hy.sat > 0.3 && hueGap(hx.hue, hy.hue) > 60;
};

interface Grid {
  /** Dot spacing in pixels. */
  spacing: number;
  /** Dot radius as a share of spacing. */
  ratio: number;
  seed: number;
  /** Vertical compression of the lattice (a foreshortened floor), 1 for none. */
  squashY: number;
  /** Squash each dot by the surface normal, as if painted on it. */
  surface: boolean;
}

/** Coverage of hand-drawn dots on a hexagonal lattice at one point; n is the surface normal there. */
function dots(x: number, y: number, grid: Grid, size: number, nx = 0, ny = 0, nz = 1): number {
  const S = grid.spacing;
  const gx = x, gy = y / grid.squashY;
  const h = S * 0.8660254;
  const row0 = Math.floor(gy / h);
  let ax = 0, ay = 0, squash = 1;
  if (grid.surface) {
    const len = Math.hypot(nx, ny);
    if (len > 0.08) {
      ax = nx / len;
      ay = ny / len;
      squash = Math.max(0.3, Math.abs(nz));
    }
  }
  let best = 0;
  for (let j = row0; j <= row0 + 1; j++) {
    const off = j & 1 ? S / 2 : 0;
    const f = (gx - off) / S;
    const i0 = Math.round(f);
    for (let k = 0; k < 2; k++) {
      const i = k === 0 ? i0 : f > i0 ? i0 + 1 : i0 - 1;
      const h1 = hash2(i, j, grid.seed), h2 = hash2(i, j, grid.seed + 1), h3 = hash2(i, j, grid.seed + 2), h4 = hash2(j, i, grid.seed + 3);
      const cx = i * S + off + (h1 - 0.5) * 0.2 * S;
      const cy = j * h + (h2 - 0.5) * 0.2 * S;
      let dx = gx - cx, dy = gy - cy;
      if (squash < 1) {
        const along = dx * ax + dy * ay, across = -dx * ay + dy * ax;
        dx = along / squash;
        dy = across;
      }
      const rot = h3 * Math.PI;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const u = dx * cr + dy * sr, v = (-dx * sr + dy * cr) / (0.8 + 0.2 * h4);
      const dist = Math.hypot(u, v);
      const theta = Math.atan2(v, u);
      const r = S * grid.ratio * size * (0.82 + 0.36 * h1 * h2 + 0.1 * h4) * (1 + 0.07 * Math.sin(2 * theta + h3 * 6.28) + 0.05 * Math.sin(3 * theta + h2 * 6.28));
      const cover = r - dist + 0.5;
      if (cover > best) best = cover;
      if (best >= 1) return 1;
    }
  }
  return clamp(best, 0, 1);
}

export function kusama(s: Scene, press: Press, c: Ctx): string[] {
  const { N, unit, inks, random, mood } = c;
  const notes: string[] = [];
  const dark = inks.key;
  const A = s.area, W = A.x1 - A.x0, H = A.y1 - A.y0;
  const memorial = c.occasion === 'memorial';
  const a = c.abstraction;
  const pool: Pair[] = memorial
    ? [[dark, inks.light], [inks.light, dark], [inks.red, inks.light], [mixRGB(dark, inks.light, 0.5), dark], [inks.red, dark]]
    : [
        [inks.red, inks.light],
        [inks.yellow, dark],
        [inks.light, inks.red],
        [dark, inks.yellow],
        [inks.blue, inks.light],
        [inks.pink, dark],
        [inks.light, inks.blue],
        [inks.green, inks.light],
        [inks.light, dark],
      ];
  const used: (RGB | null)[] = [];
  const choose = (prefer: number, against: (RGB | null)[]): Pair => {
    for (let k = 0; k < pool.length; k++) {
      const pair = pool[(prefer + k) % pool.length];
      if (against.every((other) => apart(pair[0], other, c.paper)) && !used.some((u) => u && pair[0] && sameRGB(u, pair[0]))) return pair;
    }
    for (let k = 0; k < pool.length; k++) {
      const pair = pool[(prefer + k) % pool.length];
      if (against.every((other) => apart(pair[0], other, c.paper))) return pair;
    }
    return pool[prefer % pool.length];
  };
  // On black stock the wall stays black and only its dots are printed: a mirrored infinity room.
  const wallPair: Pair = c.dark
    ? [null, memorial ? inks.light : [inks.yellow, inks.red, inks.light][Math.floor(random() * 3)]]
    : memorial
      ? pool[random() < 0.5 ? 0 : 1]
      : pool[[0, 3, 4, 0, 1][Math.floor(random() * 5)]];
  used.push(wallPair[0]);
  const floorPair = s.hasFloor ? choose(memorial ? 0 : 2 + Math.floor(random() * 3), [wallPair[0]]) : wallPair;
  used.push(floorPair[0]);
  // The cast is coloured before the set, so the hero never shares a colour with what it stands on.
  const thingPairs = new Map<number, Pair>();
  const ordered: Thing[] = s.hero ? [s.hero, ...s.things.filter((t) => t !== s.hero)] : s.things;
  ordered.forEach((t, i) => {
    const pair = choose(i === 0 ? (memorial ? 2 : 1) : 2 + i * 2, [wallPair[0], floorPair[0]]);
    used.push(pair[0]);
    thingPairs.set(t.id, pair);
  });
  const heroField = ordered.length ? thingPairs.get(ordered[0].id)![0] : null;
  const setPair = s.set ? choose(3, [floorPair[0], wallPair[0], heroField]) : floorPair;
  const base = mix(20, 60, c.mark) * unit * mix(1.15, 0.82, mood.density);
  const ratio = a > 0.7 && mood.density > 0.55 ? 0.46 : mix(0.3, 0.4, a);
  const shadeFields = a < 0.5;

  const region = (p: number) => s.region[p];
  const layField = (pair: Pair, inRegion: (p: number) => boolean) => {
    if (!pair[0]) return;
    press.fill(pair[0], (p) => (inRegion(p) ? 1 : 0));
    if (shadeFields) press.fill(mixRGB(pair[0], dark, 0.32), (p) => (inRegion(p) && s.shade[p] > 0.5 ? 1 : 0));
  };
  const seedBase = (c.seed * 7919) | 0;

  // Wall: big dots, with small dots in the gaps.
  layField(wallPair, (p) => region(p) === WALL);
  const wallGrid: Grid = { spacing: base, ratio, seed: seedBase + 1, squashY: 1, surface: false };
  press.fill(wallPair[1], (p) => (region(p) === WALL ? dots(p % N, (p / N) | 0, wallGrid, 1) : 0));
  if (c.mark > 0.3 && ratio < 0.44) {
    const small: Grid = { spacing: base, ratio: ratio * 0.32, seed: seedBase + 2, squashY: 1, surface: false };
    press.fill(wallPair[1], (p) => {
      if (region(p) !== WALL) return 0;
      return dots((p % N) + base * 0.5, ((p / N) | 0) + base * 0.2887, small, 1);
    });
  }
  c.signal.throwIfAborted();

  // Floor: the lattice lies down with the ground.
  if (s.hasFloor) {
    layField(floorPair, (p) => region(p) === FLOOR);
    const floorGrid: Grid = { spacing: base * 0.9, ratio, seed: seedBase + 3, squashY: s.floorTilt, surface: false };
    press.fill(floorPair[1], (p) => (region(p) === FLOOR ? dots(p % N, (p / N) | 0, floorGrid, 1) : 0));
  }
  if (s.set) {
    layField(setPair, (p) => s.id[p] === 2);
    const setGrid: Grid = { spacing: base * 0.62, ratio, seed: seedBase + 4, squashY: 1, surface: true };
    press.fill(setPair[1], (p) => (s.id[p] === 2 ? dots(p % N, (p / N) | 0, setGrid, 1, s.nx[p], s.ny[p], s.nz[p]) : 0));
  }
  c.signal.throwIfAborted();

  // Each thing in its own two colours, dots sized to the thing and painted onto its surfaces.
  for (const t of ordered) {
    const pair = thingPairs.get(t.id)!;
    layField(pair, (p) => s.id[p] === t.id);
    const spacing = clamp(Math.sqrt(t.area) * 0.19, 6 * unit, base * 0.8) * mix(0.8, 1.25, c.mark);
    const grid: Grid = { spacing, ratio: Math.min(0.46, ratio + 0.03), seed: seedBase + 10 + t.id * 17, squashY: 1, surface: true };
    const darker = luma(pair[1]) < luma(pair[0] ?? c.paper);
    press.fill(pair[1], (p) => {
      if (s.id[p] !== t.id) return 0;
      let size = 1;
      if (a < 0.75) {
        size *= mix(0.68, 1.06, Math.pow(Math.max(0, s.nz[p]), 0.7));
        size *= darker ? 1 + 0.3 * s.shade[p] : 1 - 0.25 * s.shade[p];
      }
      return dots(p % N, (p / N) | 0, grid, size, s.nx[p], s.ny[p], s.nz[p]);
    });
    c.signal.throwIfAborted();
  }

  // Lettering: plain and quiet, as on a gallery poster.
  const module = mix(0.01, 0.016, c.mark) * W;
  if (c.lettering === 'headline' || c.lettering === 'column') {
    const vertical = c.lettering === 'column';
    const count = vertical ? clamp(Math.floor((H * 0.7) / (module * 6)), 3, 9) : clamp(Math.floor((W * 0.55) / (CAPITAL_ADVANCE * module)), 4, 10);
    const w = vertical ? module * 5 : count * CAPITAL_ADVANCE * module + module * 2.4;
    const h = vertical ? count * module * 6 + module * 1.4 : module * 7;
    const roomRight = A.x1 - s.subject.x1 > s.subject.x0 - A.x0;
    const bx = vertical ? (roomRight ? A.x1 - W * 0.05 - w : A.x0 + W * 0.05) : A.x0 + (W - w) / 2;
    const by = A.y0 + H * 0.05;
    press.draw(inks.light, (g) => {
      g.beginPath();
      g.roundRect(bx, by, w, h, module * 1.2);
      g.fill();
    });
    press.draw(dark, (g) => {
      if (vertical) for (let i = 0; i < count; i++) capitals(g, 1, bx + module * 0.9, by + module * 0.7 + i * module * 6, module, 'marker', random, 0.75);
      else capitals(g, count, bx + module * 1.2, by + module, module, 'marker', random, 0.75);
    });
    notes.push(`a quiet lettered ${vertical ? 'spine' : 'title'}`);
  }

  // Outlines keep things from dissolving into the wall: the lesson of the polka-dot room.
  const radius = mix(1, 4.5, c.weight) * unit;
  const line = stroke(s, edges(s, { silhouettes: true, crease: null, colour: null, horizon: false, solid: (k) => k >= 2 && k < 254 }), radius);
  press.fill(dark, (p) => line[p]);
  if (s.hasFloor && s.hasWall && !c.dark) {
    const horizon = stroke(s, edges(s, { silhouettes: false, crease: null, colour: null, horizon: true, solid: () => false }), radius * 0.6);
    press.fill(dark, (p) => horizon[p]);
  }

  if (c.lettering === 'notice') {
    const clipped = press.clip;
    press.clip = null;
    const y = c.margin ? A.y1 + (N - A.y1) * 0.3 : A.y1 - H * 0.09;
    if (!c.margin) press.draw(inks.light, (g) => g.fillRect(A.x0, y - H * 0.02, W, H * 0.09 + 1));
    press.draw(dark, (g) => textBars(g, A.x0 + W * 0.06, y, W * 0.88, 2, 5 * unit, random, true));
    press.clip = clipped;
    notes.push('a rounded notice along the foot');
  }

  const describe = (pair: Pair) => (pair[0] ? 'coloured' : 'black') + ' ground';
  notes.unshift(
    ratio >= 0.46 ? 'an infinity net of crowded dots over everything' : `hand-drawn dots on every surface, ${describe(wallPair)} wall`,
    `${ordered.length} thing${ordered.length === 1 ? '' : 's'} in their own two colours`,
  );
  return notes;
}
