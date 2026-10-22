import { mix } from '@conjure/kit';
import { type Press, type RGB, clamp, hueGap, hueOf, mixRGB, sameRGB } from './common';
import { bayer, textBars } from './glyphs';
import type { Ctx } from './palette';
import { decompose, type Part } from './parts';
import { FLOOR, SET, type Scene, type Thing, edges, stroke } from './scene';
import { castShadow, horizonAt, horizonLine, space } from './sheet';

/** The nearest of the given inks to a colour; greys go to the key or stay pale. */
function nearestInk(colour: RGB, inks: RGB[], key: RGB, pale: RGB): RGB {
  const c = hueOf(colour);
  if (c.sat < 0.16) return c.light < 0.5 ? key : pale;
  let best = inks[0], gap = Infinity;
  for (const ink of inks) {
    const h = hueOf(ink);
    const d = hueGap(c.hue, h.hue);
    if (d < gap) {
      gap = d;
      best = ink;
    }
  }
  return best;
}

export function bauhaus(s: Scene, press: Press, c: Ctx): string[] {
  const { N, unit, inks, random, mood } = c;
  const notes: string[] = [];
  const key = c.key;
  const memorial = c.occasion === 'memorial';
  const primaries = memorial ? [inks.red] : [inks.red, inks.yellow, inks.blue];
  const pale = mixRGB(c.paper, inks.grey, 0.5);
  const A = s.area, W = A.x1 - A.x0, H = A.y1 - A.y0;
  const bar = mix(5, 24, c.weight) * unit;
  const markScale = mix(0.7, 1.4, c.mark);
  const busy = clamp(mood.density + (c.occasion === 'manifesto' ? 0.45 : 0) + (c.occasion === 'party' ? 0.25 : 0) - (memorial ? 0.6 : 0), 0, 1.4);
  const [lx, ly] = s.light;
  const hero = s.hero;
  const hb = hero ?? { x0: s.subject.x0, y0: s.subject.y0, x1: s.subject.x1, y1: s.subject.y1, cx: s.subject.cx, cy: s.subject.cy };
  const heroMain = hero ? nearestInk(hero.colour, primaries, key, inks.red) : inks.red;
  const others = primaries.filter((ink) => !sameRGB(ink, heroMain));
  const discInk = memorial ? (sameRGB(heroMain, inks.red) ? key : inks.red) : others[Math.floor(random() * others.length)] ?? inks.red;
  const barInk = memorial ? key : others.find((ink) => !sameRGB(ink, discInk)) ?? inks.red;
  const floorInk = memorial ? mixRGB(key, c.paper, 0.15) : inks.grey;
  // Backlit scenes print their shaded faces blue, so the cast shadow steps down to a dark grey.
  let shaded = 0, solid = 0;
  for (let p = 0; p < s.count; p++) if (s.region[p] === 3) {
    solid++;
    if (s.shade[p] > 0.5) shaded++;
  }
  const backlit = solid > 0 && shaded > solid * 0.5;
  const shadowInk = memorial ? key : backlit || sameRGB(heroMain, inks.blue) ? mixRGB(floorInk, key, 0.5) : inks.blue;
  const room = space(s);
  const openRight = room.right > room.left;
  const horizon = horizonLine(s);

  // Ground plane: one flat grey field under a heavy ground line.
  if (s.hasFloor) press.fill(floorInk, (p) => (s.region[p] === FLOOR ? 1 : 0));

  // Background construction, laid before the subject so the subject knocks it out.
  const heroH = hb.y1 - hb.y0, heroW = hb.x1 - hb.x0;
  const R = clamp(0.4 * Math.max(heroH, heroW * 1.3) * markScale, 0.1 * W, 0.34 * W);
  const dcx = clamp(hb.cx + lx * R * 0.55 + (openRight ? 0.12 : -0.12) * R, A.x0 + R * 0.2, A.x1 - R * 0.2);
  const dcy = clamp(hb.y0 + heroH * 0.32 + ly * R * 0.45, A.y0 + R * 0.25, horizon - R * 0.15);
  press.draw(discInk, (g) => {
    g.beginPath();
    g.arc(dcx, dcy, R, 0, Math.PI * 2);
    g.fill();
  });
  if (mood.energy > 0.45 || c.occasion === 'party') {
    // Concentric arcs pushing away from the disc, like sound leaving a speaker.
    const rings = 2 + Math.round(mood.energy * 3);
    // They spread away from the subject, into the open sheet.
    const away = Math.hypot(dcx - hb.cx, dcy - hb.cy) > R * 0.2 ? Math.atan2(dcy - hb.cy, dcx - hb.cx) : Math.atan2(-ly, -lx);
    press.draw(key, (g) => {
      g.lineWidth = Math.max(2 * unit, bar * 0.28);
      g.lineCap = 'butt';
      for (let i = 1; i <= rings; i++) {
        g.beginPath();
        g.arc(dcx, dcy, R * (1 + i * 0.16), away - 0.55, away + 0.55);
        g.stroke();
      }
    });
  }
  // The long thin diagonal that ties the sheet together.
  const diagonalUp = random() < 0.5;
  press.draw(key, (g) => {
    g.lineWidth = Math.max(1.6 * unit, bar * 0.18);
    g.beginPath();
    g.moveTo(A.x0 - 10, diagonalUp ? A.y0 + H * (0.72 + random() * 0.1) : A.y0 + H * (0.12 + random() * 0.1));
    g.lineTo(A.x1 + 10, diagonalUp ? A.y0 + H * (0.1 + random() * 0.12) : A.y0 + H * (0.7 + random() * 0.12));
    g.stroke();
  });
  // A vertical bar on the open side and a heavy black bar across the top.
  const barX = openRight ? A.x1 - Math.max(0.06 * W, room.right * 0.45) : A.x0 + Math.max(0.06 * W, room.left * 0.45) - bar * 1.4;
  press.draw(barInk, (g) => g.fillRect(barX, A.y0 + H * (0.12 + random() * 0.08), bar * 1.4, horizon - A.y0 - H * 0.12));
  // With a headline the bar becomes its underline; otherwise it crosses the top on its own.
  const xh = mix(0.05, 0.085, c.mark) * W;
  const words = clamp(Math.floor((W * 0.62) / (xh * 1.2)), 4, 8);
  const headX = openRight ? A.x0 + W * 0.05 : A.x1 - W * 0.05 - words * xh * 1.2;
  const headBase = A.y0 + H * 0.05 + xh * 1.9;
  press.draw(key, (g) => {
    if (c.lettering === 'headline') g.fillRect(headX, headBase + xh * 0.95, words * xh * 1.15, bar * 0.8);
    else {
      const len = W * (0.22 + random() * 0.18) * markScale;
      const x = openRight ? A.x0 + W * 0.05 : A.x1 - W * 0.05 - len;
      g.fillRect(x, A.y0 + H * (0.06 + random() * 0.04), len, bar * 0.8);
    }
  });
  // A right triangle sits on the ground line in the open space.
  if (!memorial && s.hasFloor) {
    const T = clamp(0.17 * W * markScale, 0.08 * W, 0.3 * W);
    const tx = openRight ? Math.min(A.x1 - T * 0.4, s.subject.x1 + T * 0.15) : Math.max(A.x0 + T * 0.4, s.subject.x0 - T * 0.15);
    const ty = horizonAt(s, tx) ?? horizon;
    const triInk = primaries.find((ink) => !sameRGB(ink, discInk) && !sameRGB(ink, barInk)) ?? inks.yellow;
    press.draw(triInk, (g) => {
      g.beginPath();
      g.moveTo(tx, ty);
      g.lineTo(tx + (openRight ? T : -T), ty);
      g.lineTo(tx, ty - T * 1.15);
      g.closePath();
      g.fill();
    });
  }
  // Busier sheets add a grey square, a ring and a second small disc.
  if (busy > 0.45) {
    const q = 0.07 * W * markScale;
    press.draw(inks.grey, (g) => g.fillRect(openRight ? A.x1 - W * 0.22 : A.x0 + W * 0.12, A.y0 + H * 0.2, q, q));
    press.draw(key, (g) => {
      g.lineWidth = bar * 0.45;
      g.beginPath();
      g.arc(openRight ? A.x1 - W * 0.16 : A.x0 + W * 0.16, A.y0 + H * 0.38, q * 0.9, 0, Math.PI * 2);
      g.stroke();
    });
  }
  if (busy > 0.85) {
    // A manifesto grid of thin rules across the wall.
    press.draw(key, (g) => {
      g.lineWidth = Math.max(1, unit * 1.2);
      const step = W / (6 + Math.round(random() * 3));
      for (let x = A.x0 + step; x < A.x1; x += step) {
        g.beginPath();
        g.moveTo(x, A.y0);
        g.lineTo(x, horizon);
        g.stroke();
      }
    }, (p) => (s.region[p] === 0 ? 1 : 0), 0.9);
  }

  // The ground line: a heavy rule along the horizon that stops short of the edges.
  if (s.hasFloor && s.hasWall) {
    const line = stroke(s, edges(s, { silhouettes: false, crease: null, colour: null, horizon: true, solid: () => false }), bar * 0.45);
    const from = A.x0 + W * (openRight ? 0.04 : 0.1), to = A.x1 - W * (openRight ? 0.1 : 0.04);
    press.fill(key, (p) => {
      const x = p % N;
      return x >= from && x <= to ? line[p] : 0;
    });
  }

  // Lettering set behind the subject.
  if (c.lettering === 'headline') {
    press.draw(key, (g) => bayer(g, words, headX, headBase, xh, random));
    notes.push('a headline in ring-and-stem lower case');
  } else if (c.lettering === 'column') {
    press.draw(memorial ? key : inks.red, (g) => {
      const xh = mix(0.07, 0.12, c.mark) * W;
      const count = clamp(Math.floor((H * 0.78) / (xh * 1.15)), 4, 8);
      const x = openRight ? A.x1 - W * 0.04 : A.x0 + W * 0.04 + xh * 1.15;
      g.translate(x, A.y0 + H * 0.92);
      g.rotate(-Math.PI / 2);
      bayer(g, count, 0, 0, xh, random);
    });
    notes.push('a word running up the side');
  }

  // The plinth or set: black sides, a bare top.
  if (s.set) {
    press.fill(key, (p) => (s.id[p] === 2 ? 1 : 0));
    press.fill(null, (p) => (s.id[p] === 2 && s.ny[p] < -0.55 && s.shade[p] < 0.5 ? 1 : 0));
  }

  const abstraction = c.abstraction;
  const geometric = abstraction >= 0.45;
  // Cast shadows: flat planes of blue, or black triangles once the picture is pure geometry.
  if (abstraction < 0.72) {
    press.fill(shadowInk, (p) => ((s.region[p] === FLOOR || (s.region[p] === SET && s.ny[p] < -0.55)) && s.shade[p] > 0.5 ? 1 : 0));
  } else {
    for (const t of s.things) {
      const at = castShadow(s, t);
      if (!at) continue;
      const w = t.x1 - t.x0;
      const footX = (t.x0 + t.x1) / 2, footY = t.y1;
      const ax = footX + (at[0] - footX) * 2.1, ay = footY + (at[1] - footY) * 2.1;
      press.draw(c.dark ? mixRGB(c.paper, inks.light, 0.22) : key, (g) => {
        g.beginPath();
        g.moveTo(t.x0 + w * 0.2, footY);
        g.lineTo(t.x1 - w * 0.2, footY);
        g.lineTo(ax, ay);
        g.closePath();
        g.fill();
      });
    }
  }

  // The subject.
  const things = s.things.length ? s.things : [];
  for (const [index, t] of things.entries()) {
    // Pale, colourless things still print in a primary; only dark ones go to black.
    const pick = memorial ? (t === hero ? inks.red : key) : nearestInk(t.colour, primaries, key, inks.grey);
    const main = sameRGB(pick, inks.grey) ? (t === hero ? heroMain : (others[index % Math.max(1, others.length)] ?? inks.red)) : pick;
    if (!geometric) planar(s, press, c, t, main, memorial ? inks.red : primaries.filter((ink) => !sameRGB(ink, discInk))[index % 2] ?? inks.red);
    else {
      if (abstraction < 0.72) press.fill(mixRGB(main, c.paper, sameRGB(main, key) ? 0.8 : 0.7), (p) => (s.id[p] === t.id ? 1 : 0));
      figure(s, press, c, t, main, index);
    }
    c.signal.throwIfAborted();
  }

  if (c.lettering === 'notice') {
    const clipped = press.clip;
    press.clip = null;
    const y = c.margin ? A.y1 + (N - A.y1) * 0.25 : A.y1 - H * 0.11;
    if (!c.margin) press.draw(null, (g) => g.fillRect(A.x0, y - H * 0.025, W, H * 0.11 + 1));
    press.draw(key, (g) => {
      g.fillRect(A.x0 + W * 0.04, y, W * 0.92, Math.max(2, bar * 0.35));
      textBars(g, A.x0 + W * 0.04, y + bar * 0.35 + 8 * unit, W * 0.5, 3, 5 * unit, random);
      textBars(g, A.x0 + W * 0.6, y + bar * 0.35 + 8 * unit, W * 0.36, 3, 5 * unit, random);
    });
    press.clip = clipped;
    notes.push('a ruled notice along the foot');
  }

  notes.unshift(
    geometric
      ? abstraction < 0.72
        ? 'things built from discs, blocks and rods over a pale tint of their shape'
        : 'things reduced to pure discs, blocks, triangles and jointed rods'
      : 'things flattened into planes of primary colour',
  );
  return notes;
}

/** Flat planes: the lit face in the thing's primary, tops in a second ink, shade in black. */
function planar(s: Scene, press: Press, c: Ctx, t: Thing, main: RGB, fallback: RGB) {
  const { inks, key } = c;
  // A dark thing is still printed in a primary: black is kept for its shade.
  if (sameRGB(main, key) || sameRGB(main, inks.grey)) main = fallback;
  const top = sameRGB(main, inks.yellow) ? inks.light : inks.yellow;
  const detail = c.abstraction < 0.25;
  const pick = new Int8Array(s.count).fill(-1);
  // A backlit thing would print as one black mass: its shade turns to a receding blue instead.
  let inShade = 0;
  for (let p = 0; p < s.count; p++) if (s.id[p] === t.id && s.shade[p] > 0.5) inShade++;
  const shadeInk = inShade > t.area * 0.5 && !sameRGB(main, inks.blue) && c.occasion !== 'memorial' ? inks.blue : key;
  const palette: RGB[] = [main, top, shadeInk, inks.light];
  for (let p = 0; p < s.count; p++) {
    if (s.id[p] !== t.id) continue;
    if (detail && Math.abs(s.lum[p] - t.lum) > 0.3) pick[p] = s.lum[p] > t.lum ? 3 : 2;
    else if (s.shade[p] > 0.5) pick[p] = 2;
    else if (s.ny[p] < -0.62) pick[p] = 1;
    else pick[p] = 0;
  }
  palette.forEach((ink, i) => press.fill(ink, (p) => (pick[p] === i ? 1 : 0)));
}

/** A Schlemmer figure: stacked blocks, discs and triangles, rods jointed with discs. */
function figure(s: Scene, press: Press, c: Ctx, t: Thing, main: RGB, index: number) {
  const { inks, key, unit } = c;
  const parts = decompose(s, t);
  const [lx, ly] = s.light;
  const cycle: RGB[] = c.occasion === 'memorial' ? [main, key] : [main, ...[inks.red, inks.yellow, inks.blue, key].filter((ink) => !sameRGB(ink, main))];
  const masses = parts.filter((part) => part.kind !== 'rod').sort((a, b) => b.area - a.area);
  const shadeParts = c.abstraction < 0.92;
  masses.forEach((part, i) => {
    const ink = cycle[(i + index) % cycle.length];
    const shadeInk = sameRGB(ink, key) ? inks.grey : key;
    press.draw(ink, (g) => massPath(g, part));
    if (!shadeParts) return;
    press.draw(shadeInk, (g) => {
      if (part.kind === 'rect') {
        const w = part.x1 - part.x0;
        const strip = w * 0.3;
        if (lx <= 0) g.fillRect(part.x1 - strip, part.y0, strip, part.y1 - part.y0);
        else g.fillRect(part.x0, part.y0, strip, part.y1 - part.y0);
      } else if (part.kind === 'circle') {
        const toward = Math.atan2(ly, lx);
        g.beginPath();
        g.arc(part.cx, part.cy, part.r, toward + Math.PI / 2, toward + Math.PI * 1.5);
        g.closePath();
        g.fill();
      } else if (part.kind === 'tri') {
        const apex = part.a;
        const mid: [number, number] = [(part.b[0] + part.c[0]) / 2, (part.b[1] + part.c[1]) / 2];
        const far = (lx <= 0) === part.b[0] > part.c[0] ? part.b : part.c;
        g.beginPath();
        g.moveTo(apex[0], apex[1]);
        g.lineTo(mid[0], mid[1]);
        g.lineTo(far[0], far[1]);
        g.closePath();
        g.fill();
      }
    });
  });
  // A strong detail inside the thing (a dial, a window, a label) survives as one inset square.
  if (c.abstraction < 0.9) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0, brighter = 0;
    for (let y = t.y0; y < t.y1; y++)
      for (let x = t.x0; x < t.x1; x++) {
        const p = y * s.N + x;
        if (s.id[p] !== t.id || Math.abs(s.lum[p] - t.lum) < 0.3) continue;
        n++;
        if (s.lum[p] > t.lum) brighter++;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    const boxArea = (x1 - x0 + 1) * (y1 - y0 + 1);
    if (n > t.area * 0.015 && boxArea < t.area * 0.35 && n > boxArea * 0.35) {
      press.draw(brighter > n / 2 ? inks.light : key, (g) => g.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1));
    }
  }
  const rods = parts.filter((part): part is Extract<Part, { kind: 'rod' }> => part.kind === 'rod');
  const bar = mix(4, 16, c.weight) * unit;
  for (const r of rods) {
    const width = clamp(r.width, bar * 0.55, bar * 1.5);
    press.draw(key, (g) => {
      g.lineWidth = width;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      r.points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    });
    const joints = r.points.length > 2 ? r.points.slice(1, -1) : [r.points[0]];
    const jr = Math.max(4 * unit, width * 0.95);
    press.draw(inks.light, (g) => {
      for (const [x, y] of joints) {
        g.beginPath();
        g.arc(x, y, jr, 0, Math.PI * 2);
        g.fill();
      }
    });
    press.draw(key, (g) => {
      g.lineWidth = Math.max(1.5 * unit, jr * 0.3);
      for (const [x, y] of joints) {
        g.beginPath();
        g.arc(x, y, jr - g.lineWidth / 2, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(x, y, jr * 0.28, 0, Math.PI * 2);
        g.fill();
      }
    });
  }
}

function massPath(g: CanvasRenderingContext2D, part: Part) {
  g.beginPath();
  if (part.kind === 'rect') g.rect(part.x0, part.y0, part.x1 - part.x0, part.y1 - part.y0);
  else if (part.kind === 'circle') g.arc(part.cx, part.cy, part.r, 0, Math.PI * 2);
  else if (part.kind === 'tri') {
    g.moveTo(part.a[0], part.a[1]);
    g.lineTo(part.b[0], part.b[1]);
    g.lineTo(part.c[0], part.c[1]);
    g.closePath();
  }
  g.fill();
}
