import { mix } from '@conjure/kit';
import { type Press, type RGB, clamp, distanceField, hueGap, hueOf, luma, sameRGB } from './common';
import { CAPITAL_ADVANCE, capitals } from './glyphs';
import type { Ctx } from './palette';
import { FLOOR, SET, THING, WALL, type Scene, type Thing, edges, stroke } from './scene';
import { horizonLine, space } from './sheet';

/** Two inks read apart when their value or their hue differs enough. */
/** Outlines separate everything in this style, so fills only need to differ from their ground. */
const distinct = (a: RGB, b: RGB) =>
  Math.abs(luma(a) - luma(b)) > 0.12 || (hueGap(hueOf(a).hue, hueOf(b).hue) > 35 && hueOf(a).sat > 0.12 && hueOf(b).sat > 0.12);

export function haring(s: Scene, press: Press, c: Ctx): string[] {
  const { N, unit, inks, random, mood } = c;
  const notes: string[] = [];
  const chalk = c.dark;
  const key = c.key;
  const A = s.area, W = A.x1 - A.x0, H = A.y1 - A.y0;
  const memorial = c.occasion === 'memorial';
  const party = c.occasion === 'party';
  const radius = mix(1.6, 6.5, c.weight) * unit;
  const markScale = mix(0.7, 1.4, c.mark);
  const room = space(s);
  const openRight = room.right > room.left;
  const horizon = horizonLine(s);
  const wallInk = memorial ? inks.light : inks.yellow;
  const floorInk = memorial ? inks.key : inks.green;

  // Flat bright fields: a wall and a ground, nothing modelled.
  if (!chalk) {
    press.fill(wallInk, (p) => (s.region[p] === WALL ? 1 : 0));
    if (s.hasFloor) press.fill(floorInk, (p) => (s.region[p] === FLOOR ? 1 : 0));
  }

  const solidDist = distanceField(N, N, (p) => s.region[p] === THING || s.region[p] === SET);
  const clear = (x: number, y: number, need: number) => {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < A.x0 + 2 || yi < A.y0 + 2 || xi >= A.x1 - 2 || yi >= A.y1 - 2) return false;
    const p = yi * N + xi;
    return (s.region[p] === WALL || s.region[p] === FLOOR) && solidDist[p] >= need;
  };
  const segments: [number, number, number, number][] = [];
  const tryMark = (x0: number, y0: number, x1: number, y1: number, need: number) => {
    for (let i = 0; i <= 6; i++) if (!clear(x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6, need)) return false;
    for (const [a, b, cx, d] of segments) {
      const mx = (x0 + x1) / 2 - (a + cx) / 2, my = (y0 + y1) / 2 - (b + d) / 2;
      if (Math.hypot(mx, my) < radius * 4) return false;
    }
    segments.push([x0, y0, x1, y1]);
    return true;
  };

  // A heart with its own rays on the wall when the mood is glad.
  if (!memorial && (mood.cheer > 0.6 || party)) {
    const size = 0.055 * W * markScale;
    const candidates: [number, number][] = [
      [openRight ? A.x1 - W * 0.17 : A.x0 + W * 0.17, A.y0 + H * 0.2],
      [openRight ? A.x1 - W * 0.14 : A.x0 + W * 0.14, A.y0 + H * 0.42],
      [openRight ? A.x0 + W * 0.15 : A.x1 - W * 0.15, A.y0 + H * 0.18],
    ];
    const spot = candidates.find(([x, y]) => clear(x, y, size * 2.4) && s.region[Math.round(y) * N + Math.round(x)] === WALL);
    if (spot) {
      const [hx, hy] = spot;
      const heart = (g: CanvasRenderingContext2D) => {
        g.beginPath();
        g.moveTo(hx, hy + size);
        g.bezierCurveTo(hx - size * 1.9, hy - size * 0.1, hx - size * 0.9, hy - size * 1.5, hx, hy - size * 0.45);
        g.bezierCurveTo(hx + size * 0.9, hy - size * 1.5, hx + size * 1.9, hy - size * 0.1, hx, hy + size);
        g.closePath();
      };
      if (!chalk) press.draw(sameRGB(wallInk, inks.red) ? inks.pink : inks.red, (g) => { heart(g); g.fill(); });
      press.draw(key, (g) => { heart(g); g.lineWidth = radius * 2; g.stroke(); });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const r0 = size * 1.75, r1 = r0 + size * 0.7;
        tryMark(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0, hx + Math.cos(a) * r1, hy + Math.sin(a) * r1, radius * 1.5);
      }
      notes.push('a rayed heart on the wall');
    }
  }

  // Lettering in a white box, chunky marker capitals.
  const module = mix(0.011, 0.018, c.mark) * W;
  if (c.lettering !== 'none') {
    const pad = module * 1.4;
    let box: [number, number, number, number];
    if (c.lettering === 'headline') {
      const count = clamp(Math.floor((W * 0.6) / (CAPITAL_ADVANCE * module)), 4, 10);
      const w = count * CAPITAL_ADVANCE * module + pad * 2, h = module * 5 + pad * 2;
      box = [openRight ? A.x0 + W * 0.05 : A.x1 - W * 0.05 - w, A.y0 + H * 0.05, w, h];
    } else if (c.lettering === 'column') {
      const count = clamp(Math.floor((horizon - A.y0 - H * 0.12) / (module * 6)), 3, 8);
      const w = module * 3 + pad * 2, h = count * module * 6 + pad * 2 - module;
      box = [openRight ? A.x1 - W * 0.05 - w : A.x0 + W * 0.05, A.y0 + H * 0.06, w, h];
    } else {
      const count = clamp(Math.floor((W * 0.8) / (CAPITAL_ADVANCE * module * 0.6)), 6, 20);
      const w = count * CAPITAL_ADVANCE * module * 0.6 + pad * 2, h = module * 3 + pad * 2;
      box = c.margin ? [A.x0 + (W - w) / 2, A.y1 + (N - A.y1 - h) / 2, w, h] : [A.x0 + (W - w) / 2, A.y1 - h - H * 0.03, w, h];
    }
    const [bx, by, bw, bh] = box;
    const clipped = press.clip;
    if (c.lettering === 'notice' && c.margin) press.clip = null;
    if (!chalk) press.draw(inks.light, (g) => g.fillRect(bx, by, bw, bh));
    press.draw(key, (g) => {
      g.lineWidth = radius * 1.6;
      g.strokeRect(bx, by, bw, bh);
      if (c.lettering === 'headline') capitals(g, Math.floor((bw - pad * 2) / (CAPITAL_ADVANCE * module)), bx + pad, by + pad - module * 0.5, module, 'marker', random, 1.1);
      else if (c.lettering === 'column') {
        const count = Math.floor((bh - pad * 2 + module) / (module * 6));
        for (let i = 0; i < count; i++) capitals(g, 1, bx + pad - module * 0.5, by + pad - module * 0.5 + i * module * 6, module, 'marker', random, 1.1);
      } else capitals(g, Math.floor((bw - pad * 2) / (CAPITAL_ADVANCE * module * 0.6)), bx + pad, by + pad - module * 0.3, module * 0.6, 'marker', random, 1.1);
    });
    press.clip = clipped;
    notes.push(`marker lettering (${c.lettering})`);
  }

  // Flat fills for the set and every thing, each separated from the wall and ground.
  const pool: RGB[] = [inks.red, inks.blue, inks.pink, inks.light, inks.yellow, inks.green, inks.grey].filter(
    (ink) => distinct(ink, wallInk) && (!s.hasFloor || distinct(ink, floorInk)),
  );
  if (!pool.length) pool.push(inks.light);
  if (!chalk) {
    if (s.set) press.fill(pool.includes(inks.light) ? inks.light : pool[pool.length - 1], (p) => (s.id[p] === 2 ? 1 : 0));
    const ordered: Thing[] = s.hero ? [s.hero, ...s.things.filter((t) => t !== s.hero)] : s.things;
    ordered.forEach((t, i) => {
      const ink = pool[i % pool.length];
      press.fill(ink, (p) => (s.id[p] === t.id ? 1 : 0));
    });
  }

  // Thick equal-weight outlines everywhere: silhouettes, folds and, when legible, colour changes.
  const a = c.abstraction;
  const skeleton = edges(s, {
    silhouettes: true,
    crease: a < 0.6 ? 0.45 : null,
    colour: a < 0.3 ? 0.2 : null,
    horizon: s.hasWall && s.hasFloor,
    solid: (k) => k >= 2 && k < 254,
  });
  const line = stroke(s, skeleton, radius);
  press.fill(key, (p) => line[p]);
  c.signal.throwIfAborted();

  // Radiating motion marks around anything with energy.
  const energy = clamp(mood.energy + (party ? 0.35 : 0) - (memorial ? 0.4 : 0), 0, 1.2);
  const ordered = s.hero ? [s.hero, ...s.things.filter((t) => t !== s.hero)] : s.things;
  let marked = 0;
  for (const t of ordered) {
    const n = Math.round(mix(0, 13, clamp(energy, 0, 1)) * (t === s.hero ? 1 : 0.6));
    if (n < 3) continue;
    const span = Math.PI * 1.45;
    const start = -Math.PI / 2 - span / 2;
    const reach = Math.hypot(t.x1 - t.x0, t.y1 - t.y0);
    for (let i = 0; i < n; i++) {
      const angle = start + ((i + 0.5) / n) * span + (random() - 0.5) * 0.18;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      let last = 0;
      for (let d = 0; d < reach; d += 1) {
        const x = Math.round(t.cx + dx * d), y = Math.round(t.cy + dy * d);
        if (x < 0 || y < 0 || x >= N || y >= N) break;
        if (s.id[y * N + x] === t.id) last = d;
      }
      const gap = radius * 2.6 + 0.014 * N;
      const len = (0.03 + random() * 0.025) * N * markScale;
      const r0 = last + gap, r1 = r0 + len;
      if (tryMark(t.cx + dx * r0, t.cy + dy * r0, t.cx + dx * r1, t.cy + dy * r1, radius * 2)) marked++;
    }
    if (energy > 0.55) {
      // Lift lines under something that is jumping.
      const w = t.x1 - t.x0;
      for (let k = 0; k < 2; k++) {
        const y = t.y1 + radius * 3 + k * radius * 3.2 + 0.01 * N;
        const half = w * (0.22 - k * 0.07);
        if (tryMark(t.cx - half, y, t.cx + half, y, radius * 1.5)) marked++;
      }
    }
  }
  if (segments.length) {
    press.draw(key, (g) => {
      g.lineWidth = radius * 1.8;
      g.lineCap = 'round';
      for (const [x0, y0, x1, y1] of segments) {
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
      }
    });
  }
  if (marked) notes.push(`${marked} motion marks`);

  notes.unshift(chalk ? 'white chalk lines on a black subway panel' : a >= 0.6 ? 'flat bright shapes inside one heavy outline' : 'flat brights with every fold drawn in heavy line');
  return notes;
}
