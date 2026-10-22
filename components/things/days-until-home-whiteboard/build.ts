import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type G = CanvasRenderingContext2D;
type R = () => number;
type XY = [number, number];

function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// ---------------------------------------------------------------- marker on a whiteboard
function line(g: G, pts: readonly XY[], colour: string, width: number, r: R, alpha = 1) {
  g.strokeStyle = colour; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.globalAlpha = alpha * (0.82 + r() * 0.18);
  g.beginPath();
  pts.forEach(([x, y], i) => { const jx = x + (r() - 0.5) * width * 0.35, jy = y + (r() - 0.5) * width * 0.35; if (i) g.lineTo(jx, jy); else g.moveTo(jx, jy); });
  g.stroke();
  g.globalAlpha = 1;
}
function scrawl(g: G, text: string, x: number, y: number, size: number, colour: string, r: R, align: 'left' | 'center' = 'left', alpha = 1, slant = 0) {
  g.font = `bold ${size}px sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const widths = [...text].map((ch) => g.measureText(ch).width * 0.96);
  let cx = align === 'center' ? x - widths.reduce((a, b) => a + b, 0) / 2 : x;
  g.fillStyle = colour;
  for (const [i, ch] of [...text].entries()) {
    g.save();
    g.globalAlpha = alpha * (0.85 + r() * 0.15);
    g.translate(cx + widths[i] / 2, y + (r() - 0.5) * size * 0.12 + slant * (cx - x));
    g.rotate((r() - 0.5) * 0.12 + slant);
    g.fillText(ch, 0, 0);
    g.restore();
    cx += widths[i];
  }
  g.globalAlpha = 1;
  return cx;
}
const ring = (cx: number, cy: number, rx: number, ry: number, n = 20, turns = 1.08): XY[] =>
  Array.from({ length: n + 1 }, (_u, i) => [cx + Math.cos((i / n) * Math.PI * 2 * turns - 0.4) * rx, cy + Math.sin((i / n) * Math.PI * 2 * turns - 0.4) * ry]);

const HEADINGS = {
  home: { text: 'DAYS TILL HOME', from: 'HERE', to: 'HOME', note: 'DAYS TILL HOME, the plain one.' },
  splashdown: { text: 'DAYS TO SPLASHDOWN', from: 'ISS', to: 'EARTH', note: 'DAYS TO SPLASHDOWN: a crew in orbit.' },
  leave: { text: 'DAYS TILL LEAVE', from: 'BASE', to: 'HOME', note: 'DAYS TILL LEAVE: a barracks or a ship.' },
  summer: { text: 'DAYS TILL SUMMER!', from: 'SCHOOL', to: 'BEACH', note: 'DAYS TILL SUMMER! in a classroom.' },
  baby: { text: 'DAYS TILL BABY', from: 'NOW', to: 'BABY', note: 'DAYS TILL BABY: someone is missing a birth back home.' },
} as const;

const MARKERS = {
  classic: { inks: ['#1d2230', '#1f4fb8', '#c8262c'], note: 'Black, blue and red: the office set.' },
  bright: { inks: ['#1f8a3a', '#7a2fc2', '#e8641a'], note: 'Green, purple and orange from a bright pack.' },
  one: { inks: ['#3a3d44', '#3a3d44', '#3a3d44'], note: 'One dying black marker for everything, streaky and pale.' },
  red: { inks: ['#c8262c', '#c8262c', '#1d2230'], note: 'Mostly red, urgent and loud.' },
} as const;

export default defineThing({
  questions: {
    heading: choice('What does the heading say?', Object.fromEntries(Object.entries(HEADINGS).map(([k, v]) => [k, v.note])) as Record<keyof typeof HEADINGS, string>),
    progress: score('How far along is the count?', ['Just started, months to go', 'A third of the way', 'Halfway', 'The last week', 'Home tomorrow']),
    count: choice('How are the days counted?', {
      tally: 'Tally gates of five, rows and rows of them.',
      calendar: 'A hand-ruled calendar grid with every finished day crossed out.',
      crossed: 'One number rewritten every morning, the old ones struck through in a column.',
      track: 'A dotted route from here to home with a magnet moved along it each day.',
    }),
    roster: choice('What else is on the board?', {
      chores: 'A chore roster: names across the top, galley, toilet, filters and trash down the side, ticks in the boxes.',
      shifts: 'A watch rota with times and initials.',
      menu: 'A week\'s meal plan, with PIZZA!! circled on Friday.',
      none: 'Nothing else: the countdown has the whole board.',
    }),
    doodle: choice('What has someone doodled in the corner?', {
      earth: 'A little Earth with a heart over it and an arrow saying HOME.',
      smiley: 'A grinning smiley face in sunglasses.',
      cat: 'A line-drawn cat sitting with its tail curled.',
      rocket: 'A rocket blasting off.',
      sad: 'A sad face with one tear and miss u.',
      tictactoe: 'A game of noughts and crosses, abandoned halfway.',
    }),
    state: choice('What state is the board in?', {
      fresh: 'Freshly wiped and neatly written, crisp lines.',
      smeared: 'Half wiped by a sleeve: a grey smear across the middle and the ghost of old writing.',
      scrawled: 'Crowded: everyone has added something, arrows, jokes, phone numbers, sticky notes.',
      abandoned: 'Abandoned: faded marker, dust, the count stopped days ago and nobody updated it.',
    }),
    markers: choice('What colours are the markers?', Object.fromEntries(Object.entries(MARKERS).map(([k, v]) => [k, v.note])) as Record<keyof typeof MARKERS, string>),
    photo: noul('Is a photo from home held up by a magnet?'),
    mount: choice('How is the board mounted?', {
      easel: 'On a wheeled steel stand, the movable classroom kind.',
      wall: 'Screwed to a painted wall with a marker tray.',
      station: 'Bungee-strapped to a padded spacecraft wall with velcro squares and a handrail.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const heading = HEADINGS[a.heading];
    const inks = MARKERS[a.markers].inks;
    const state = a.state;
    const faded = state === 'abandoned' ? 0.55 : 1 - mood.wear * 0.25;
    const inkAlpha = a.markers === 'one' ? faded * 0.7 : faded;
    const BW = 1.2, BH = 0.9;
    const progress = a.progress;
    const left = progress >= 0.99 ? 1 : Math.max(2, Math.round(mix(170, 3, progress) * (0.85 + random() * 0.3)));
    const done = Math.max(2, Math.round(mix(4, 175, progress) * (0.85 + random() * 0.3)));

    // ---------------------------------------------------------------- the writing surface
    let trackAt: XY | null = null;
    const CW = 1024, CH = 768;
    const surface = paint(CW, CH, (g) => {
      const r = random;
      const base = g.createLinearGradient(0, 0, CW, CH);
      base.addColorStop(0, '#fbfcfc'); base.addColorStop(1, '#eceff1');
      g.fillStyle = base; g.fillRect(0, 0, CW, CH);
      // the ghost of everything written before
      const ghosts = Math.round(4 + mood.wear * 10 + (state === 'smeared' ? 10 : 0) + (state === 'fresh' ? -4 : 0));
      for (let i = 0; i < ghosts; i++) scrawl(g, pick(['MEETING 0900', 'EVA PREP', 'CO2 SCRUB', 'DON\'T FORGET', 'X = 4.2', 'CALL KEN', 'WEEK 3', 'ROUTE B', '!!!', 'TEST']), r() * CW * 0.8, r() * CH, 26 + r() * 30, '#8a96a8', r, 'left', 0.1 + mood.wear * 0.08);
      // ---- heading ----
      scrawl(g, heading.text, 40, 62, heading.text.length > 15 ? 58 : 66, inks[1], r, 'left', inkAlpha, -0.01);
      line(g, [[40, 104], [CW * 0.55, 100 + (r() - 0.5) * 8]], inks[1], 5, r, inkAlpha);
      if (state !== 'abandoned' && mood.cheer > 0.4) for (let i = 0; i < 2; i++) scrawl(g, '!', CW * 0.58 + i * 22, 60, 64, inks[2], r, 'left', inkAlpha);

      // ---- the number left, circled ----
      const bigX = 150, bigY = 250;
      const num = left === 1 && progress >= 0.99 ? '1' : String(left);
      scrawl(g, num, bigX, bigY, num.length > 2 ? 140 : 170, inks[2], r, 'center', inkAlpha);
      line(g, ring(bigX, bigY + 6, num.length > 2 ? 130 : 105, 92, 26, 1.12), inks[2], 6, r, inkAlpha);
      scrawl(g, left === 1 ? 'TOMORROW!!' : 'DAYS LEFT', bigX, bigY + 128, 34, inks[0], r, 'center', inkAlpha);

      // ---- the count ----
      const ax = 290, ay = 150, aw = 380, ah = 330;
      if (a.count === 'tally') {
        const gateW = 40, rowH = 50, perRow = Math.floor(aw / gateW);
        const shown = Math.min(done, perRow * Math.floor(ah / rowH) * 5);
        for (let i = 0; i < shown; i++) {
          const gate = Math.floor(i / 5), k = i % 5;
          const gx = ax + (gate % perRow) * gateW, gy = ay + Math.floor(gate / perRow) * rowH;
          const colour = Math.floor(gate / 7) % 2 ? inks[0] : inks[a.markers === 'bright' ? 1 : 0];
          if (k < 4) line(g, [[gx + k * 7, gy], [gx + k * 7 + (r() - 0.5) * 3, gy + 36]], colour, 3.5, r, inkAlpha);
          else line(g, [[gx - 5, gy + 30], [gx + 27, gy + 6]], colour, 3.5, r, inkAlpha);
        }
      }
      if (a.count === 'calendar') {
        const cols = 7, rows = 6, cw = aw / cols, ch = ah / rows;
        const total = cols * rows, crossed = Math.round(mix(3, total - 1, progress));
        ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => scrawl(g, d, ax + (i + 0.5) * cw, ay - 18, 22, inks[0], r, 'center', inkAlpha));
        for (let i = 0; i <= cols; i++) line(g, [[ax + i * cw, ay], [ax + i * cw, ay + ah]], inks[0], 2, r, inkAlpha * 0.7);
        for (let j = 0; j <= rows; j++) line(g, [[ax, ay + j * ch], [ax + aw, ay + j * ch]], inks[0], 2, r, inkAlpha * 0.7);
        for (let i = 0; i < total; i++) {
          const cx = ax + (i % cols) * cw, cy = ay + Math.floor(i / cols) * ch;
          scrawl(g, String(i + 1), cx + 6, cy + 13, 15, inks[0], r, 'left', inkAlpha * 0.8);
          if (i < crossed) { line(g, [[cx + 8, cy + 8], [cx + cw - 8, cy + ch - 6]], inks[2], 4, r, inkAlpha); line(g, [[cx + cw - 8, cy + 8], [cx + 8, cy + ch - 6]], inks[2], 4, r, inkAlpha); }
          if (i === total - 1) { line(g, ring(cx + cw / 2, cy + ch / 2, cw * 0.48, ch * 0.48, 16), inks[1], 4, r, inkAlpha); scrawl(g, '♥', cx + cw / 2, cy + ch * 0.6, 26, inks[2], r, 'center', inkAlpha); }
        }
      }
      if (a.count === 'crossed') {
        const perRow = left + 20 >= 100 ? 4 : 6, step = aw / perRow;
        let n = left + Math.min(done, perRow * 4);
        for (let i = 0; i < perRow * 4 && n > left; i++, n--) {
          const cx = ax + (i % perRow) * step, cy = ay + Math.floor(i / perRow) * 58 + 20;
          scrawl(g, String(n), cx, cy, 38, inks[i % 2 ? 0 : 1], r, 'left', inkAlpha * 0.9);
          line(g, [[cx - 4, cy + (r() - 0.5) * 6], [cx + step * 0.78, cy + (r() - 0.5) * 10]], inks[2], 4, r, inkAlpha);
        }
        scrawl(g, String(left), ax + 30, ay + 290, 70, inks[2], r, 'left', inkAlpha);
        line(g, [[ax + 20, ay + 330], [ax + 160, ay + 326]], inks[2], 6, r, inkAlpha);
        line(g, [[ax + 24, ay + 340], [ax + 150, ay + 338]], inks[2], 4, r, inkAlpha);
      }
      if (a.count === 'track') {
        const pts: XY[] = [];
        for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([ax + 30 + t * (aw - 70), ay + ah * 0.55 - Math.sin(t * Math.PI) * ah * 0.35 + Math.sin(t * 9) * 10]); }
        for (let i = 0; i < pts.length - 1; i += 2) line(g, [pts[i], pts[i + 1]], inks[0], 4, r, inkAlpha);
        for (let i = 0; i <= 10; i++) { const p = pts[i * 4]; line(g, [[p[0], p[1] - 10], [p[0], p[1] + 10]], inks[0], 3, r, inkAlpha); }
        // here: a little station or a box; home: a planet or a house
        const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
        line(g, [[sx - 22, sy - 12], [sx + 22, sy - 12], [sx + 22, sy + 12], [sx - 22, sy + 12], [sx - 22, sy - 12]], inks[1], 4, r, inkAlpha);
        if (a.heading === 'splashdown') { line(g, [[sx - 50, sy], [sx - 22, sy]], inks[1], 4, r, inkAlpha); line(g, [[sx + 22, sy], [sx + 50, sy]], inks[1], 4, r, inkAlpha); }
        if (a.heading === 'splashdown' || a.heading === 'home') { line(g, ring(ex + 14, ey, 34, 34, 22, 1.02), inks[1], 5, r, inkAlpha); line(g, [[ex, ey - 10], [ex + 14, ey - 18], [ex + 24, ey + 4], [ex + 8, ey + 16]], '#1f8a3a', 5, r, inkAlpha); }
        else { line(g, [[ex - 16, ey + 24], [ex - 16, ey - 6], [ex + 14, ey - 30], [ex + 44, ey - 6], [ex + 44, ey + 24], [ex - 16, ey + 24]], inks[1], 5, r, inkAlpha); }
        scrawl(g, heading.from, sx, sy + 42, 26, inks[0], r, 'center', inkAlpha);
        scrawl(g, heading.to, ex + 14, ey + 56, 28, inks[2], r, 'center', inkAlpha);
        const p = pts[Math.round(progress * 40)];
        trackAt = [p[0] / CW, p[1] / CH];
      }

      // ---- the roster ----
      const rx = 690, ry = 150, rw = 300, rh = 270;
      if (a.roster === 'chores' || a.roster === 'shifts') {
        const names = ['KAT', 'DEV', 'OLU', 'MAX', 'ANA', 'JO', 'SAM', 'LEE'].sort(() => r() - 0.5).slice(0, 4);
        const rowsL = a.roster === 'chores' ? ['GALLEY', 'TOILET', 'FILTERS', 'TRASH', 'GYM LOG'] : ['0000', '0600', '1200', '1800'];
        scrawl(g, a.roster === 'chores' ? 'CHORES' : 'WATCH', rx, ry - 30, 34, inks[1], r, 'left', inkAlpha);
        const lw = 100, cw = (rw - lw) / names.length, ch = rh / (rowsL.length + 1);
        names.forEach((n, i) => scrawl(g, n, rx + lw + (i + 0.5) * cw, ry + ch * 0.5, 20, inks[0], r, 'center', inkAlpha));
        rowsL.forEach((label, j) => {
          scrawl(g, label, rx + 4, ry + ch * (j + 1.5), 20, inks[0], r, 'left', inkAlpha);
          names.forEach((_n, i) => {
            const cx = rx + lw + (i + 0.5) * cw, cy = ry + ch * (j + 1.5);
            if (a.roster === 'chores') { if (r() < 0.25 + progress * 0.5) line(g, [[cx - 10, cy], [cx - 3, cy + 9], [cx + 12, cy - 12]], inks[r() < 0.8 ? 2 : 1], 4, r, inkAlpha); }
            else if ((i + j) % names.length === 0) scrawl(g, 'X', cx, cy, 24, inks[2], r, 'center', inkAlpha);
          });
        });
        for (let j = 0; j <= rowsL.length + 1; j++) line(g, [[rx, ry + j * ch], [rx + rw, ry + j * ch]], inks[0], 1.8, r, inkAlpha * 0.6);
        line(g, [[rx + lw, ry], [rx + lw, ry + rh]], inks[0], 1.8, r, inkAlpha * 0.6);
      }
      if (a.roster === 'menu') {
        scrawl(g, 'MENU', rx, ry - 30, 34, inks[1], r, 'left', inkAlpha);
        const meals = ['TACOS', 'PASTA', 'CURRY', 'SOUP', 'PIZZA!!', 'STEW', '???'];
        ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((d, i) => {
          const y = ry + 10 + i * 38;
          scrawl(g, d, rx, y, 22, inks[0], r, 'left', inkAlpha);
          scrawl(g, meals[i], rx + 80, y, 24, i === 4 ? inks[2] : inks[0], r, 'left', inkAlpha);
          if (i === 4) line(g, ring(rx + 140, y, 78, 22, 18), inks[2], 3.5, r, inkAlpha);
        });
      }

      // ---- the doodle ----
      const dx = a.roster === 'none' ? 840 : 820, dy = a.roster === 'none' ? 330 : 590;
      const dsz = a.roster === 'none' ? 1.5 : 1;
      const D = (x: number, y: number): XY => [dx + x * dsz, dy + y * dsz];
      if (a.doodle === 'earth') {
        line(g, ring(dx, dy, 70 * dsz, 70 * dsz, 28, 1.03), inks[1], 5, r, inkAlpha);
        line(g, [D(-40, -30), D(-10, -45), D(5, -10), D(-25, 20), D(-45, 5)], '#1f8a3a', 5, r, inkAlpha);
        line(g, [D(20, 10), D(45, 0), D(50, 35), D(25, 45)], '#1f8a3a', 5, r, inkAlpha);
        scrawl(g, '♥', dx, dy - 100 * dsz, 50 * dsz, inks[2], r, 'center', inkAlpha);
        line(g, [D(-150, 70), D(-80, 40)], inks[0], 4, r, inkAlpha); line(g, [D(-96, 36), D(-80, 40), D(-90, 54)], inks[0], 4, r, inkAlpha);
        scrawl(g, 'HOME', dx - 160 * dsz, dy + 90 * dsz, 26 * dsz, inks[0], r, 'center', inkAlpha);
      }
      if (a.doodle === 'smiley' || a.doodle === 'sad') {
        line(g, ring(dx, dy, 72 * dsz, 72 * dsz, 28, 1.03), inks[0], 5, r, inkAlpha);
        if (a.doodle === 'smiley') {
          line(g, [D(-52, -20), D(-8, -20), D(-12, 0), D(-46, 0), D(-52, -20)], inks[0], 9, r, inkAlpha);
          line(g, [D(8, -20), D(52, -20), D(46, 0), D(12, 0), D(8, -20)], inks[0], 9, r, inkAlpha);
          line(g, [D(-8, -18), D(8, -18)], inks[0], 4, r, inkAlpha);
          line(g, [D(-40, 25), D(-20, 45), D(20, 45), D(40, 25)], inks[2], 6, r, inkAlpha);
        } else {
          for (const ex of [-25, 25]) line(g, [D(ex - 2, -20), D(ex + 2, -16)], inks[0], 10, r, inkAlpha);
          line(g, [D(-35, 40), D(-15, 28), D(15, 28), D(35, 40)], inks[0], 6, r, inkAlpha);
          line(g, [D(-25, -5), D(-30, 12), D(-25, 18), D(-20, 12), D(-25, -5)], '#1f6fd8', 5, r, inkAlpha);
          scrawl(g, 'miss u', dx - 40 * dsz, dy + 105 * dsz, 30 * dsz, inks[1], r, 'left', inkAlpha);
        }
      }
      if (a.doodle === 'cat') {
        line(g, [D(-40, 60), D(-50, 10), D(-30, -30), D(30, -30), D(50, 10), D(40, 60), D(-40, 60)], inks[0], 5, r, inkAlpha);
        line(g, [D(-30, -30), D(-35, -70), D(-10, -40)], inks[0], 5, r, inkAlpha);
        line(g, [D(30, -30), D(35, -70), D(10, -40)], inks[0], 5, r, inkAlpha);
        line(g, [D(40, 60), D(80, 55), D(90, 20), D(70, 5)], inks[0], 5, r, inkAlpha);
        for (const ex of [-15, 15]) line(g, [D(ex, -8), D(ex, -2)], inks[0], 8, r, inkAlpha);
        line(g, [D(-60, 5), D(-25, 10)], inks[0], 2.5, r, inkAlpha); line(g, [D(60, 5), D(25, 10)], inks[0], 2.5, r, inkAlpha);
      }
      if (a.doodle === 'rocket') {
        line(g, [D(-25, 50), D(-25, -30), D(0, -80), D(25, -30), D(25, 50), D(-25, 50)], inks[0], 5, r, inkAlpha);
        line(g, ring(dx, dy - 15 * dsz, 12 * dsz, 12 * dsz, 14), inks[1], 4, r, inkAlpha);
        line(g, [D(-25, 20), D(-50, 60), D(-25, 50)], inks[0], 5, r, inkAlpha);
        line(g, [D(25, 20), D(50, 60), D(25, 50)], inks[0], 5, r, inkAlpha);
        line(g, [D(-15, 55), D(-8, 95), D(0, 70), D(8, 100), D(15, 55)], inks[2], 5, r, inkAlpha);
      }
      if (a.doodle === 'tictactoe') {
        for (const k of [-1, 1]) { line(g, [D(k * 25, -75), D(k * 25, 75)], inks[0], 4, r, inkAlpha); line(g, [D(-75, k * 25), D(75, k * 25)], inks[0], 4, r, inkAlpha); }
        const marks = [[0, 0, 'X'], [1, 1, 'O'], [2, 0, 'X'], [1, 0, 'O'], [0, 2, 'X']] as const;
        for (const [cxI, cyI, m] of marks.slice(0, 3 + Math.floor(r() * 3))) scrawl(g, m, dx + (cxI - 1) * 50 * dsz, dy + (cyI - 1) * 50 * dsz, 38 * dsz, m === 'X' ? inks[2] : inks[1], r, 'center', inkAlpha);
      }

      // ---- the story: a crowd of additions, a wipe, or dust ----
      if (state === 'scrawled') {
        const adds = ['WE MISS YOU TOO', 'ONLY 2 MORE SUNDAYS', 'DEV OWES ME $5', 'who ate my pudding', 'CALL MUM!!', 'x 555 0192', 'SO CLOSE', 'NOT FUNNY KAT'];
        for (let i = 0; i < 6; i++) scrawl(g, pick(adds), 40 + r() * 600, 520 + r() * 220, 22 + r() * 12, pick(inks), r, 'left', inkAlpha, (r() - 0.5) * 0.15);
        for (let i = 0; i < 3; i++) { const x = 100 + r() * 500, y = 480 + r() * 200; line(g, [[x, y], [x + 60, y - 40 - r() * 40]], pick(inks), 3, r, inkAlpha); }
      }
      if (state === 'smeared') {
        // a sleeve dragged across: lift the ink and leave a grey haze
        const x0 = 120 + r() * 200, y0 = 330 + r() * 140, x1 = x0 + 360 + r() * 200, y1 = y0 - 80 - r() * 120;
        for (let k = 0; k < 46; k++) {
          const t = k / 45, x = mix(x0, x1, t) + (r() - 0.5) * 30, y = mix(y0, y1, t) + Math.sin(t * 3) * 30 + (r() - 0.5) * 40;
          g.fillStyle = `rgba(247,249,250,${0.35 + r() * 0.35})`;
          g.beginPath(); g.ellipse(x, y, 40 + r() * 30, 30 + r() * 22, Math.atan2(y1 - y0, x1 - x0), 0, 7); g.fill();
        }
        g.strokeStyle = 'rgba(120,130,150,0.16)'; g.lineCap = 'round';
        for (let k = 0; k < 10; k++) {
          const off = (r() - 0.5) * 90;
          g.lineWidth = 2 + r() * 5;
          g.beginPath(); g.moveTo(x0 + r() * 60, y0 + off); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + off + 25, x1 - r() * 60, y1 + off); g.stroke();
        }
      }
      if (state === 'abandoned' || mood.wear > 0.5) {
        const dust = g.createLinearGradient(0, 0, 0, CH);
        dust.addColorStop(0, `rgba(170,160,140,${0.06 + mood.wear * 0.1})`); dust.addColorStop(1, `rgba(170,160,140,${0.14 + mood.wear * 0.12})`);
        g.fillStyle = dust; g.fillRect(0, 0, CW, CH);
      }
      if (state === 'abandoned') scrawl(g, '?', bigX + 120, bigY - 90, 60, '#6a6e78', r, 'center', 0.6);
    });

    // ---------------------------------------------------------------- the board, its frame and tray
    const board = new THREE.Group();
    s.root.add(board);
    const alu = s.material('#c4c9ce', { metalness: 0.75, roughness: 0.32 });
    const dark = s.material('#2a2d33', { roughness: 0.6 });
    const boardY = a.mount === 'easel' ? 1.28 : a.mount === 'wall' ? 1.42 : 1.25;
    const front = a.mount === 'easel' ? 0.0 : a.mount === 'wall' ? 0.03 : 0.08;
    const put = <T extends THREE.Object3D>(m: T, parent: THREE.Object3D = board) => { parent.add(m); return m; };
    put(s.box([BW, BH, 0.024], [0, boardY, front - 0.012], s.material('#e8ebee', { roughness: 0.5 })));
    const face = put(new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.02, BH - 0.02), new THREE.MeshStandardMaterial({ map: surface, roughness: state === 'abandoned' ? 0.6 : 0.22, metalness: 0.02 })));
    face.position.set(0, boardY, front + 0.0015);
    face.receiveShadow = true;
    for (const sy of [-1, 1]) put(s.box([BW + 0.04, 0.022, 0.034], [0, boardY + sy * (BH / 2 + 0.006), front], alu));
    for (const sx of [-1, 1]) put(s.box([0.022, BH + 0.04, 0.034], [sx * (BW / 2 + 0.006), boardY, front], alu));
    for (const [cx, cy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) put(s.box([0.04, 0.04, 0.04], [cx * (BW / 2 + 0.006), boardY + cy * (BH / 2 + 0.006), front], dark));
    // tray, markers and an eraser
    const trayY = boardY - BH / 2 - 0.03;
    put(s.box([BW * 0.8, 0.012, 0.07], [0, trayY, front + 0.035], alu));
    put(s.box([BW * 0.8, 0.03, 0.008], [0, trayY + 0.012, front + 0.07], alu));
    const capOff = state === 'abandoned';
    const markerCount = a.markers === 'one' ? 1 : 3;
    for (let i = 0; i < markerCount; i++) {
      const mx = -0.3 + i * 0.12 + random() * 0.04;
      const pen = put(s.cylinder(0.009, 0.009, 0.13, [mx, trayY + 0.016, front + 0.04], s.material('#f0f0ec', { roughness: 0.5 }), 10));
      pen.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.12;
      if (!capOff || i > 0) { const cap = put(s.cylinder(0.011, 0.011, 0.045, [mx + 0.055, trayY + 0.016, front + 0.04], s.material(inks[i % 3], { roughness: 0.4 }), 10)); cap.rotation.z = Math.PI / 2; }
    }
    put(s.box([0.13, 0.035, 0.05], [0.28, trayY + 0.024, front + 0.035], s.material('#2a3a5a', { roughness: 0.8 })));
    put(s.box([0.13, 0.012, 0.05], [0.28, trayY + 0.002, front + 0.035], s.material('#5a5a5a', { roughness: 1 })));
    // a marker dangling on a string from the frame's corner
    const hang = new THREE.Group();
    hang.position.set(BW / 2 + 0.02, boardY + BH * 0.15, front + 0.03);
    board.add(hang);
    const stringLen = 0.32 + random() * 0.12;
    const cord = put(s.cylinder(0.0025, 0.0025, stringLen, [0, -stringLen / 2, 0], s.material('#e8e0c8', { roughness: 1 }), 6), hang);
    void cord;
    const dangler = put(s.cylinder(0.01, 0.01, 0.13, [0, -stringLen - 0.06, 0], s.material(inks[0], { roughness: 0.45 }), 10), hang);
    void dangler;
    hang.rotation.z = (random() - 0.5) * 0.2;

    // magnets, a photo, a postcard or sticky note, and the track magnet
    const magnetMat = (c: string) => s.material(c, { roughness: 0.35 });
    const magnet = (x: number, y: number, colour = pick(['#d8262c', '#1f6fd8', '#f2c21a', '#2e8a4a', '#1d1d1f'])) => {
      const m = put(s.cylinder(0.018, 0.018, 0.014, [x, y, front + 0.012], magnetMat(colour), 16));
      m.rotation.x = Math.PI / 2;
      return m;
    };
    const toBoard = (u: number, v: number): XY => [(u - 0.5) * (BW - 0.02), boardY + (0.5 - v) * (BH - 0.02)];
    if (trackAt) { const [x, y] = toBoard(trackAt[0], trackAt[1]); magnet(x, y, '#d8262c'); }
    if (a.photo) {
      const map = paint(128, 160, (g, w, h) => {
        g.fillStyle = '#f5f3ee'; g.fillRect(0, 0, w, h);
        const kind = Math.floor(random() * 3);
        const sky = g.createLinearGradient(0, 0, 0, h);
        if (kind === 0) { sky.addColorStop(0, '#0a1020'); sky.addColorStop(1, '#203a6a'); g.fillStyle = sky; g.fillRect(6, 6, w - 12, h - 30); g.fillStyle = '#3a7ad0'; g.beginPath(); g.arc(w / 2, h * 0.95, w * 0.7, Math.PI * 1.15, Math.PI * 1.85); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(w * (0.2 + random() * 0.6), h * (0.62 + random() * 0.1), 10, 3, 0.2, 0, 7); g.fill(); } }
        else {
          sky.addColorStop(0, kind === 1 ? '#5aa8e8' : '#f0a060'); sky.addColorStop(1, kind === 1 ? '#d8ecf8' : '#6a4a8a'); g.fillStyle = sky; g.fillRect(6, 6, w - 12, h - 30);
          g.fillStyle = kind === 1 ? '#6ab05a' : '#2a2030'; g.fillRect(6, h * 0.62, w - 12, h * 0.38 - 24);
          for (let i = 0; i < 3; i++) { const px = w * (0.3 + i * 0.2), ph = h * (i === 2 ? 0.28 : 0.42); g.fillStyle = kind === 1 ? pick(['#d8262c', '#2f6fd8', '#f2c21a', '#e86aa0']) : '#1a1420'; g.beginPath(); g.roundRect(px - 9, h * 0.8 - ph * 0.7, 18, ph * 0.6, 6); g.fill(); g.fillStyle = kind === 1 ? pick(['#e8c4a0', '#9a6b4b', '#7a4f33']) : '#1a1420'; g.beginPath(); g.arc(px, h * 0.8 - ph * 0.78, 8, 0, 7); g.fill(); }
        }
        g.fillStyle = `rgba(230,200,140,${0.1 + mood.wear * 0.25})`; g.fillRect(0, 0, w, h);
      });
      const [px, py] = toBoard(0.86 + (random() - 0.5) * 0.04, a.roster === 'none' ? 0.2 : 0.78);
      const photo = put(new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.15), new THREE.MeshStandardMaterial({ map, roughness: 0.45 })));
      photo.position.set(px, py, front + 0.004);
      photo.rotation.z = (random() - 0.5) * 0.2;
      photo.castShadow = true;
      magnet(px + (random() - 0.5) * 0.02, py + 0.06);
    }
    if (state === 'scrawled' || mood.density > 0.6) {
      for (let i = 0; i < 1 + Math.round(mood.density * 2); i++) {
        const [nx, ny] = toBoard(0.08 + random() * 0.55, 0.72 + random() * 0.2);
        const note = put(s.box([0.075, 0.075, 0.002], [nx, ny, front + 0.004 + i * 0.001], s.material(pick(['#f7e36a', '#f7a8c8', '#a8e0f0', '#b8f0a0']), { roughness: 0.8 })));
        note.rotation.z = (random() - 0.5) * 0.3;
      }
    }
    for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) { const [x, y] = toBoard(0.05 + random() * 0.9, random() < 0.5 ? 0.04 + random() * 0.06 : 0.92 + random() * 0.05); magnet(x, y); }

    // ---------------------------------------------------------------- the mount
    if (a.mount === 'easel') {
      const steel = s.material('#8a9096', { metalness: 0.6, roughness: 0.4 });
      for (const sx of [-1, 1]) {
        const x = sx * (BW / 2 + 0.05);
        s.box([0.035, 1.82, 0.035], [x, 0.1 + 0.91, -0.02], steel);
        s.box([0.04, 0.04, 0.62], [x, 0.1, -0.02], steel);
        for (const z of [-0.3, 0.26]) {
          s.cylinder(0.006, 0.006, 0.05, [x, 0.07, z], dark, 6);
          const wheel = s.cylinder(0.035, 0.035, 0.024, [x, 0.035, z], dark, 14);
          wheel.rotation.z = Math.PI / 2;
        }
        s.cylinder(0.022, 0.022, 0.02, [x - sx * 0.025, boardY, 0], dark, 12).rotation.z = Math.PI / 2;
      }
      s.box([BW + 0.1, 0.03, 0.03], [0, 0.42, -0.02], steel);
    }
    if (a.mount === 'wall') {
      const wallColour = pick(['#e8e2d4', '#d8e0e4', '#e4dccc', '#c8d4c0']);
      const wallMap = paint(128, 256, (g, w, h) => {
        g.fillStyle = wallColour; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${random() * 0.04})`; g.fillRect(random() * w, random() * h, 2, 2); }
        for (let i = 0; i < mood.wear * 16; i++) { g.fillStyle = 'rgba(80,70,50,0.08)'; g.beginPath(); g.ellipse(random() * w, random() * h, 6 + random() * 10, 4 + random() * 12, 0, 0, 7); g.fill(); }
      });
      s.mesh(new THREE.BoxGeometry(1.7, 2.3, 0.1), new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.9 }), [0, 1.15, -0.05]);
      s.box([1.7, 0.1, 0.02], [0, 0.05, 0.01], s.material('#6a6a66', { roughness: 0.6 }));
      // a light switch and a wall clock for the sense of a room
      s.box([0.08, 0.12, 0.015], [-0.72, 1.2, 0.008], s.material('#f0f0ec'));
      const clock = s.cylinder(0.12, 0.12, 0.03, [0.55, 2.08, 0.016], s.material('#f4f4f0'), 24);
      clock.rotation.x = Math.PI / 2;
      const rim = s.ring(0.12, 0.012, [0.55, 2.08, 0.03], dark);
      void rim;
      for (const [len, ang] of [[0.07, random() * 6.28], [0.1, random() * 6.28]] as const) {
        const hand = s.box([0.008, len, 0.004], [0.55 + Math.sin(ang) * len / 2, 2.08 + Math.cos(ang) * len / 2, 0.034], dark);
        hand.rotation.z = -ang;
      }
    }
    if (a.mount === 'station') {
      const padMap = paint(256, 320, (g, w, h) => {
        g.fillStyle = '#e4e6e2'; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 64) {
          const grad = g.createRadialGradient(x + 26, y + 26, 4, x + 32, y + 32, 46);
          grad.addColorStop(0, 'rgba(255,255,255,0.12)'); grad.addColorStop(1, 'rgba(0,0,0,0.1)');
          g.fillStyle = grad; g.fillRect(x, y, 64, 64);
          g.strokeStyle = 'rgba(0,0,0,0.18)'; g.setLineDash([3, 3]); g.strokeRect(x + 1, y + 1, 62, 62); g.setLineDash([]);
        }
        g.fillStyle = '#c8c8be';
        for (let i = 0; i < 10; i++) g.fillRect(random() * (w - 20), random() * (h - 20), 18, 18);
      });
      s.mesh(new THREE.BoxGeometry(1.56, 2.0, 0.1), new THREE.MeshStandardMaterial({ map: padMap, roughness: 0.95 }), [0, 1.0, 0]);
      const yellow = s.material('#e8b83a', { roughness: 0.5 });
      for (const x of [-0.6, 0.6]) s.box([0.04, 0.04, 0.08], [x, 0.38, 0.09], alu);
      s.rod([-0.66, 0.38, 0.13], [0.66, 0.38, 0.13], 0.018, yellow);
      // bungee cords across the corners
      const bungee = s.material(pick(['#2a2d33', '#1f4fb8', '#d8262c']), { roughness: 0.7 });
      for (const sy of [-1, 1]) for (const sx of [-1, 1]) s.tube([[sx * 0.76, boardY + sy * 0.3, 0.055], [sx * 0.7, boardY + sy * 0.4, front + 0.012], [sx * (BW / 2 + 0.01), boardY + sy * (BH / 2 + 0.012), front + 0.02], [sx * 0.42, boardY + sy * (BH / 2 + 0.03), 0.055]], 0.007, bungee);
      // a velcro square with a marker stuck to it, and a little label
      s.box([0.06, 0.06, 0.004], [-0.68, 0.7, 0.052], s.material('#9a9a90', { roughness: 1 }));
      const vm = s.cylinder(0.01, 0.01, 0.13, [-0.68, 0.7, 0.064], s.material(inks[1]), 10);
      vm.rotation.z = 0.4;
      s.label('CREW BOARD', 0.24, 0.04, [0, boardY + BH / 2 + 0.07, 0.056], '#1d1d1f', '#f4f1e6');
    }

    const energy = mood.energy;
    const restSwing = hang.rotation.z;
    const phase = random() * 6;
    return s.finish({
      update(_dt, time) {
        hang.rotation.z = restSwing + Math.sin(time * (1.1 + energy * 1.4) + phase) * 0.12 * (0.15 + energy);
        hang.rotation.x = Math.sin(time * 0.8 + phase) * 0.04 * (0.15 + energy);
      },
    });
  },
});
