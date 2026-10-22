import { mix } from '@conjure/kit';
import { type Press, clamp, distanceField, mixRGB } from './common';
import { CAPITAL_ADVANCE, capitals, textBars } from './glyphs';
import type { Ctx } from './palette';
import { FLOOR, SET, THING, WALL, type Scene, edges, stroke } from './scene';
import { horizonLine, space } from './sheet';

const COS45 = Math.SQRT1_2;

/** Coverage of a round-dot screen at 45 degrees: dots below half tone, holes above it. */
function screen(x: number, y: number, period: number, tint: number) {
  if (tint <= 0.02) return 0;
  if (tint >= 0.96) return 1;
  let u = (x * COS45 + y * COS45) / period;
  let v = (y * COS45 - x * COS45) / period;
  const holes = tint > 0.56;
  if (holes) {
    u += 0.5;
    v += 0.5;
  }
  u -= Math.floor(u) + 0.5;
  v -= Math.floor(v) + 0.5;
  const distance = Math.sqrt(u * u + v * v) * period;
  const radius = period * Math.sqrt((holes ? 1 - tint : tint) / Math.PI) + (holes ? -0.35 : 0.35);
  const cover = clamp(radius - distance + 0.5, 0, 1);
  return holes ? 1 - cover : cover;
}

export function constructivism(s: Scene, press: Press, c: Ctx): string[] {
  const { N, unit, inks, random, mood } = c;
  const notes: string[] = [];
  const key = c.key;
  const red = inks.red;
  const memorial = c.occasion === 'memorial';
  const A = s.area, W = A.x1 - A.x0, H = A.y1 - A.y0;
  const bar = mix(5, 22, c.weight) * unit;
  const markScale = mix(0.75, 1.35, c.mark);
  const busy = clamp(mood.density + (c.occasion === 'manifesto' ? 0.45 : 0) + (c.occasion === 'party' ? 0.2 : 0) - (memorial ? 0.6 : 0), 0, 1.4);
  const hero = s.hero;
  const hb = hero ?? { x0: s.subject.x0, y0: s.subject.y0, x1: s.subject.x1, y1: s.subject.y1, cx: s.subject.cx, cy: s.subject.cy };
  const heroH = hb.y1 - hb.y0, heroW = hb.x1 - hb.x0;
  const room = space(s);
  const openRight = room.right > room.left;
  const horizon = horizonLine(s);
  const wallOnly = (p: number) => (s.region[p] === WALL ? 1 : 0);

  // A slanted red ground with a black rule along its top.
  if (s.hasFloor) press.fill(memorial ? key : red, (p) => (s.region[p] === FLOOR ? 1 : 0));

  // Lissitzky's black circle behind the subject, and the red wedge driven into it.
  const R = clamp(0.44 * Math.max(heroH, heroW * 1.2) * markScale, 0.12 * W, 0.36 * W);
  const ccx = clamp(hb.cx + (openRight ? 0.62 : -0.62) * R, A.x0 + R * 0.45, A.x1 - R * 0.45);
  const ccy = clamp(hb.y0 + heroH * 0.18, A.y0 + R * 0.5, horizon - R * 0.25);
  press.draw(memorial ? key : key, (g) => {
    g.beginPath();
    g.arc(ccx, ccy, R, 0, Math.PI * 2);
    g.fill();
  });
  const sx = openRight ? A.x1 + W * 0.04 : A.x0 - W * 0.04;
  const sy = A.y0 + H * (0.1 + random() * 0.22);
  const toward = Math.atan2(ccy - sy, ccx - sx);
  const dx = Math.cos(toward), dy = Math.sin(toward);
  const halfBase = clamp(0.11 * W * markScale, 0.05 * W, 0.16 * W);
  if (!memorial) {
    const apexX = ccx - dx * R * 0.1, apexY = ccy - dy * R * 0.1;
    press.draw(red, (g) => {
      g.beginPath();
      g.moveTo(apexX, apexY);
      g.lineTo(sx - dy * halfBase, sy + dx * halfBase);
      g.lineTo(sx + dy * halfBase, sy - dx * halfBase);
      g.closePath();
      g.fill();
    });
  }
  if (c.occasion === 'party' || mood.energy > 0.7) {
    press.draw(red, (g) => {
      g.lineWidth = Math.max(2 * unit, bar * 0.3);
      g.lineCap = 'butt';
      g.setLineDash([R * 0.22, R * 0.11]);
      g.beginPath();
      g.arc(ccx, ccy, R * 1.12, 0, Math.PI * 2);
      g.stroke();
    });
  }

  // Bars and thin rules on the same fighting diagonal, kept on the wall.
  const along = toward + (random() < 0.5 ? 0 : Math.PI / 2) * (busy > 0.6 ? 1 : 0);
  const ax = Math.cos(along), ay = Math.sin(along);
  press.draw(key, (g) => {
    const count = 2 + Math.round(busy * 3);
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      const ox = openRight ? A.x0 + W * (0.06 + 0.3 * random()) : A.x1 - W * (0.06 + 0.3 * random());
      const oy = A.y0 + H * (0.12 + t * 0.6);
      const len = W * (0.18 + random() * 0.3) * markScale;
      const thick = i % 2 ? bar * 0.25 : bar * (0.7 + random() * 0.6);
      g.save();
      g.translate(ox, oy);
      g.rotate(Math.atan2(ay, ax));
      g.fillRect(-len / 2, -thick / 2, len, thick);
      g.restore();
    }
    g.lineWidth = Math.max(1.4 * unit, bar * 0.12);
    g.beginPath();
    g.moveTo(sx - dx * W, sy - dy * W + H * 0.12);
    g.lineTo(sx + dx * W * 2, sy + dy * W * 2 + H * 0.12);
    g.stroke();
  }, wallOnly);
  if (!memorial && busy > 0.35) {
    press.draw(red, (g) => {
      const q = 0.1 * W * markScale;
      g.save();
      g.translate(openRight ? A.x0 + W * 0.16 : A.x1 - W * 0.16, A.y0 + H * 0.16);
      g.rotate(0.26);
      g.fillRect(-q / 2, -q / 2, q, q);
      g.restore();
      g.beginPath();
      g.arc(openRight ? A.x1 - W * 0.12 : A.x0 + W * 0.12, horizon - H * 0.1, q * 0.22, 0, Math.PI * 2);
      g.fill();
    }, wallOnly);
  }

  // Lettering behind the subject: blocky slogan capitals.
  const module = mix(0.011, 0.02, c.mark) * W;
  if (c.lettering === 'headline') {
    const count = clamp(Math.floor((W * 0.7) / (CAPITAL_ADVANCE * module)), 4, 12);
    press.draw(memorial ? key : key, (g) => {
      g.translate(openRight ? A.x0 + W * 0.05 : A.x1 - W * 0.05 - count * CAPITAL_ADVANCE * module, horizon - H * 0.05);
      g.rotate(-0.16);
      g.translate(0, -module * 5);
      capitals(g, count, 0, 0, module, 'block', random);
    });
    notes.push('a block-letter slogan on the diagonal');
  } else if (c.lettering === 'column') {
    const width = module * 4.2;
    const x = openRight ? A.x1 - W * 0.05 - width : A.x0 + W * 0.05;
    const top = A.y0 + H * 0.08, height = horizon - top;
    press.draw(key, (g) => g.fillRect(x, top, width, height), wallOnly);
    const count = clamp(Math.floor(height / (module * 5.4)), 3, 10);
    press.draw(inks.light, (g) => {
      for (let i = 0; i < count; i++) capitals(g, 1, x + module * 0.6, top + module * 0.6 + i * module * 5.4, module, 'block', random);
    });
    notes.push('a black column of stacked capitals');
  }

  // The set: solid black, its edges picked out in a thin paper line.
  if (s.set) {
    press.fill(key, (p) => (s.id[p] === 2 ? 1 : 0));
    // Its top is a grey screen of the photograph, so it does not merge with the black circle.
    const topPeriod = mix(3.2, 7.5, c.mark) * unit;
    press.fill(inks.light, (p) => (s.id[p] === 2 && s.ny[p] < -0.55 ? 1 : 0));
    press.fill(key, (p) => (s.id[p] === 2 && s.ny[p] < -0.55 ? screen(p % N, (p / N) | 0, topPeriod, 0.28 + 0.4 * s.shade[p]) : 0));
    const creases = stroke(s, edges(s, { silhouettes: false, crease: 0.6, colour: null, horizon: false, solid: (k) => k === 2 }), 0.7 * unit);
    press.fill(memorial ? inks.light : red, (p) => (s.id[p] === 2 ? creases[p] : 0));
  }
  if (s.hasFloor && s.hasWall) {
    const rule = stroke(s, edges(s, { silhouettes: false, crease: null, colour: null, horizon: true, solid: () => false }), bar * 0.4);
    press.fill(key, (p) => rule[p]);
  }
  // Cast shadows print solid black.
  press.fill(key, (p) => ((s.region[p] === FLOOR || (s.region[p] === SET && s.ny[p] < -0.55)) && s.shade[p] > 0.5 ? 1 : 0));

  // The subject is a photograph cut out with scissors: a white paper edge, then the halftone.
  const edge = mix(3, 9, c.weight) * unit;
  const far = distanceField(N, N, (p) => s.region[p] === THING);
  press.fill(inks.light, (p) => clamp(edge + 0.5 - far[p], 0, 1));
  const abstraction = c.abstraction;
  const period = mix(3.2, 7.5, c.mark) * unit * (abstraction < 0.35 ? 1 : 1.5);
  for (const t of s.things) {
    const values: number[] = [];
    const tone = (p: number) => 0.5 * s.lum[p] + 0.5 * Math.min(1, s.lit[p]);
    for (let p = 0; p < s.count; p += 3) if (s.id[p] === t.id) values.push(tone(p));
    values.sort((a, b) => a - b);
    const lo = values[Math.floor(values.length * 0.04)] ?? 0, hi = values[Math.floor(values.length * 0.96)] ?? 1;
    const span = Math.max(0.08, hi - lo);
    const dark = (p: number) => Math.max(clamp(1 - (tone(p) - lo) / span, 0, 1) ** 0.95, s.shade[p] * 0.7);
    const duotone = !memorial && abstraction >= 0.35 && abstraction < 0.72 && t === hero;
    if (abstraction >= 0.72) {
      // Cut paper: solid black shade, red half-tones, paper lights.
      press.fill(red, (p) => (s.id[p] === t.id && dark(p) > 0.3 ? 1 : 0));
      press.fill(key, (p) => (s.id[p] === t.id && dark(p) > 0.6 ? 1 : 0));
    } else {
      if (duotone) press.fill(mixRGB(red, inks.light, 0.15), (p) => (s.id[p] === t.id ? 1 : 0));
      press.fill(key, (p) => {
        if (s.id[p] !== t.id) return 0;
        return screen(p % N, (p / N) | 0, period, dark(p) * (duotone ? 0.85 : 1)) * (t.confidence < 0.5 ? 0.7 : 1);
      });
    }
    c.signal.throwIfAborted();
  }

  if (c.lettering === 'notice') {
    const clipped = press.clip;
    press.clip = null;
    const y = c.margin ? A.y1 + (N - A.y1) * 0.25 : A.y1 - H * 0.12;
    if (!c.margin) press.draw(null, (g) => g.fillRect(A.x0, y - H * 0.02, W, H * 0.12 + 1));
    press.draw(key, (g) => {
      capitals(g, clamp(Math.floor((W * 0.5) / (CAPITAL_ADVANCE * module * 0.5)), 4, 14), A.x0 + W * 0.04, y, module * 0.5, 'block', random);
      textBars(g, A.x0 + W * 0.04, y + module * 3.4, W * 0.9, 2, 4 * unit, random);
    });
    press.clip = clipped;
    notes.push('a slogan and small print along the foot');
  }

  notes.unshift(
    abstraction >= 0.72
      ? 'the subject cut from black and red paper'
      : abstraction >= 0.35
        ? 'the subject as a coarse 45-degree halftone photograph' + (memorial ? '' : ', the hero printed over red')
        : 'the subject as a cut-out halftone photograph with a white paper edge',
  );
  return notes;
}
