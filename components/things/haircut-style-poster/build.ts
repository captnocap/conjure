import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
interface Pen { ctx: Ctx; hair: string; back: boolean; rnd: () => number }
type Style = readonly [string, (p: Pen) => void];

/** Hair on the skull: from the temples up over the crown and back along the hairline. Unit head, face 0.6 × 0.78. */
function cap({ ctx, hair }: Pen, h: number, w: number, flat = false, line = -0.4, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(-w, 0.02);
  if (flat) { ctx.lineTo(-w * 1.02, -h); ctx.lineTo(w * 1.02, -h); }
  else { ctx.lineTo(-w, -h * 0.5); ctx.bezierCurveTo(-w, -h * 1.2, w, -h * 1.2, w, -h * 0.5); }
  ctx.lineTo(w, 0.02); ctx.lineTo(0.57, 0.02);
  ctx.quadraticCurveTo(0.52, line, 0, line);
  ctx.quadraticCurveTo(-0.52, line, -0.57, 0.02);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
}
const blob = ({ ctx, hair }: Pen, x: number, y: number, rx: number, ry: number, turn = 0, tint = hair) => { ctx.fillStyle = tint; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2); ctx.fill(); };
const stroke = ({ ctx }: Pen, tint: string, width: number, pts: number[]) => { ctx.strokeStyle = tint; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 4) ctx.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]); ctx.stroke(); };
const sides = (p: Pen, to: number, w: number, out = 0.74) => { for (const s of [-1, 1]) { p.ctx.fillStyle = p.hair; p.ctx.beginPath(); p.ctx.moveTo(s * 0.52, -0.3); p.ctx.lineTo(s * out, -0.3); p.ctx.lineTo(s * (out + w * 0.2), to); p.ctx.lineTo(s * (out - w), to); p.ctx.closePath(); p.ctx.fill(); } };
const spikes = (p: Pen, count: number, from: number, to: number, len: number, base = 0.6) => { p.ctx.fillStyle = p.hair; for (let i = 0; i < count; i++) { const a = mix(from, to, count === 1 ? 0.5 : i / (count - 1)), c = Math.cos(a), s = Math.sin(a), w = 0.11; p.ctx.beginPath(); p.ctx.moveTo(c * base - s * w, s * base * 1.2 + c * w - 0.05); p.ctx.lineTo(c * (base + len), s * (base + len) * 1.15 - 0.05); p.ctx.lineTo(c * base + s * w, s * base * 1.2 - c * w - 0.05); p.ctx.fill(); } };
const fadeSides = (p: Pen) => { const g = p.ctx.createLinearGradient(0, -0.5, 0, 0.1); g.addColorStop(0, p.hair); g.addColorStop(1, 'rgba(0,0,0,0)'); p.ctx.fillStyle = g; for (const s of [-1, 1]) p.ctx.fillRect(s > 0 ? 0.5 : -0.64, -0.5, 0.14, 0.6); };
const light = '#00000000';
void light;

const SETS: Record<string, { title: string; paper: string; ink: string; accent: string; styles: Style[] }> = {
  fifties: { title: 'OFFICIAL HAIR STYLES for MEN & BOYS', paper: '#efe4c4', ink: '#2a2f52', accent: '#b8322c', styles: [
    ['FLAT TOP', (p) => { if (!p.back) cap(p, 1.04, 0.63, true); }],
    ['DUCKTAIL', (p) => { if (!p.back) { cap(p, 1.05, 0.68, false, -0.36); blob(p, 0.1, -0.86, 0.42, 0.24, -0.2); stroke(p, 'rgba(255,255,255,0.35)', 0.03, [-0.3, -0.75, 0.1, -1.0, 0.45, -0.8]); } }],
    ['CREW CUT', (p) => { if (!p.back) cap(p, 0.9, 0.61); }],
    ['IVY LEAGUE', (p) => { if (!p.back) { cap(p, 0.96, 0.64, false, -0.34); stroke(p, 'rgba(255,255,255,0.5)', 0.025, [-0.28, -0.4, -0.3, -0.7, -0.2, -0.9]); } }],
    ['POMPADOUR', (p) => { if (!p.back) { cap(p, 1.0, 0.66); blob(p, 0, -0.95, 0.5, 0.36); stroke(p, 'rgba(255,255,255,0.3)', 0.03, [-0.3, -0.9, 0, -1.25, 0.3, -0.9]); } }],
    ['BUTCH', (p) => { if (!p.back) cap(p, 0.84, 0.6, false, -0.46, 0.6); }],
    ['FLAT TOP w/ FENDERS', (p) => { if (!p.back) { cap(p, 1.0, 0.7, true, -0.36); sides(p, 0.1, 0.16, 0.7); } }],
    ['PROFESSIONAL', (p) => { if (!p.back) { cap(p, 0.98, 0.66, false, -0.3); stroke(p, 'rgba(255,255,255,0.5)', 0.025, [0.25, -0.34, 0.3, -0.7, 0.22, -0.9]); } }],
  ] },
  eighties: { title: 'FRESH CUTS · PICK YOUR NUMBER', paper: '#f2e6d2', ink: '#1d1b26', accent: '#d4368a', styles: [
    ['HI-TOP FADE', (p) => { if (!p.back) { cap(p, 1.55, 0.58, true, -0.42); fadeSides(p); } }],
    ['LOW FADE', (p) => { if (!p.back) { cap(p, 0.92, 0.6, false, -0.42); fadeSides(p); } }],
    ['GUMBY', (p) => { if (!p.back) { p.ctx.fillStyle = p.hair; p.ctx.beginPath(); p.ctx.moveTo(-0.6, 0); p.ctx.lineTo(-0.62, -1.1); p.ctx.lineTo(0.62, -1.5); p.ctx.lineTo(0.6, 0); p.ctx.lineTo(0.55, 0); p.ctx.quadraticCurveTo(0.5, -0.42, 0, -0.42); p.ctx.quadraticCurveTo(-0.5, -0.42, -0.55, 0); p.ctx.fill(); } }],
    ['JHERI CURL', (p) => { if (p.back) for (let i = 0; i < 26; i++) blob(p, (p.rnd() - 0.5) * 1.7, -0.6 + p.rnd() * 1.3, 0.16, 0.16); else { cap(p, 1.0, 0.7); for (let i = 0; i < 10; i++) blob(p, (p.rnd() - 0.5) * 1.2, -0.6 - p.rnd() * 0.35, 0.14, 0.14); } }],
    ['PARTS & LINES', (p) => { if (!p.back) { cap(p, 0.95, 0.61, false, -0.42); fadeSides(p); for (const y of [-0.62, -0.5]) stroke(p, '#e9d9c0', 0.035, [0.2, y - 0.12, 0.42, y - 0.05, 0.6, y + 0.1]); } }],
    ['WAVES', (p) => { if (!p.back) { cap(p, 0.9, 0.6, false, -0.42); for (let i = 0; i < 4; i++) stroke(p, 'rgba(255,255,255,0.3)', 0.02, [-0.4, -0.5 - i * 0.1, 0, -0.62 - i * 0.1, 0.4, -0.5 - i * 0.1]); } }],
    ['MULLET', (p) => { if (p.back) { p.ctx.fillStyle = p.hair; p.ctx.fillRect(-0.72, -0.3, 1.44, 1.35); } else { cap(p, 1.08, 0.7, false, -0.36); spikes(p, 5, -2.2, -0.94, 0.16, 0.66); } }],
    ['BOX FADE', (p) => { if (!p.back) { cap(p, 1.2, 0.6, true, -0.42); fadeSides(p); } }],
  ] },
  seventies: { title: 'STYLES OF TODAY · unisex', paper: '#ead9b0', ink: '#4a2c14', accent: '#c96a1b', styles: [
    ['THE SHAG', (p) => { if (p.back) { spikes(p, 9, 0.2, 2.94, 0.3, 0.72); } else { cap(p, 1.08, 0.82, false, -0.2); spikes(p, 6, 0.5, 2.64, 0.2, 0.7); } }],
    ['NATURAL', (p) => { if (p.back) blob(p, 0, -0.38, 1.12, 1.08); else cap(p, 0.9, 0.62, false, -0.4); }],
    ['FEATHERED', (p) => { if (p.back) { for (const s of [-1, 1]) blob(p, s * 0.72, 0.1, 0.34, 0.6, s * -0.5); } else { cap(p, 1.08, 0.86, false, -0.3); stroke(p, 'rgba(255,255,255,0.35)', 0.03, [0, -0.5, -0.5, -0.5, -0.86, 0]); stroke(p, 'rgba(255,255,255,0.35)', 0.03, [0, -0.5, 0.5, -0.5, 0.86, 0]); } }],
    ['LONG & STRAIGHT', (p) => { if (p.back) { p.ctx.fillStyle = p.hair; p.ctx.fillRect(-0.8, -0.5, 1.6, 1.75); } else { cap(p, 1.02, 0.8, false, -0.5); p.ctx.fillStyle = p.hair; for (const s of [-1, 1]) p.ctx.fillRect(s > 0 ? 0.5 : -0.82, -0.2, 0.32, 1.4); stroke(p, 'rgba(255,255,255,0.4)', 0.02, [0, -0.5, 0, -0.8, 0, -1.02]); } }],
    ['PAGEBOY', (p) => { if (!p.back) { cap(p, 1.02, 0.8, false, -0.16); sides(p, 0.42, 0.3, 0.8); } }],
    ['SIDEBURNS', (p) => { if (!p.back) { cap(p, 1.02, 0.72, false, -0.34); sides(p, 0.5, 0.2, 0.62); } }],
    ['PERM', (p) => { if (p.back) for (let i = 0; i < 30; i++) blob(p, (p.rnd() - 0.5) * 1.8, -0.9 + p.rnd() * 1.1, 0.2, 0.2); else for (let i = 0; i < 12; i++) blob(p, (p.rnd() - 0.5) * 1.1, -0.62 - p.rnd() * 0.3, 0.16, 0.16); }],
    ['THE WEDGE', (p) => { if (!p.back) { cap(p, 1.05, 0.84, false, -0.22); p.ctx.fillStyle = p.hair; p.ctx.beginPath(); p.ctx.moveTo(-0.84, 0); p.ctx.lineTo(-0.56, 0.4); p.ctx.lineTo(-0.5, 0); p.ctx.moveTo(0.84, 0); p.ctx.lineTo(0.56, 0.4); p.ctx.lineTo(0.5, 0); p.ctx.fill(); } }],
  ] },
  punk: { title: 'CUTS £3 — NO REFUNDS', paper: '#e9e4d4', ink: '#141414', accent: '#e02f6b', styles: [
    ['MOHAWK', (p) => { if (!p.back) { cap(p, 0.84, 0.6, false, -0.46, 0.3); p.ctx.fillStyle = p.hair; p.ctx.beginPath(); p.ctx.moveTo(-0.13, -0.42); p.ctx.lineTo(-0.2, -1.75); p.ctx.lineTo(0, -1.9); p.ctx.lineTo(0.2, -1.75); p.ctx.lineTo(0.13, -0.42); p.ctx.fill(); } }],
    ['LIBERTY SPIKES', (p) => { if (p.back) spikes(p, 7, -2.75, -0.39, 0.85, 0.55); else cap(p, 0.86, 0.6, false, -0.44, 0.35); }],
    ['No. 1 CROP', (p) => { if (!p.back) cap(p, 0.83, 0.6, false, -0.47, 0.45); }],
    ['DEVILOCK', (p) => { if (!p.back) { cap(p, 0.92, 0.62, false, -0.4); p.ctx.fillStyle = p.hair; p.ctx.beginPath(); p.ctx.moveTo(-0.16, -0.5); p.ctx.quadraticCurveTo(0.02, 0.2, 0.04, 0.72); p.ctx.quadraticCurveTo(0.14, 0.2, 0.18, -0.5); p.ctx.fill(); } }],
    ['BIHAWK', (p) => { if (!p.back) { cap(p, 0.84, 0.6, false, -0.46, 0.3); for (const s of [-1, 1]) { p.ctx.fillStyle = p.hair; p.ctx.beginPath(); p.ctx.moveTo(s * 0.18, -0.5); p.ctx.lineTo(s * 0.34, -1.5); p.ctx.lineTo(s * 0.46, -0.52); p.ctx.fill(); } } }],
    ['CHELSEA', (p) => { if (!p.back) { cap(p, 0.83, 0.6, false, -0.47, 0.35); p.ctx.fillStyle = p.hair; p.ctx.fillRect(-0.44, -0.5, 0.88, 0.22); for (const s of [-1, 1]) p.ctx.fillRect(s > 0 ? 0.52 : -0.64, -0.3, 0.12, 0.9); } }],
    ['SPIKY TOP', (p) => { if (!p.back) { cap(p, 0.9, 0.63, false, -0.42); spikes(p, 8, -2.6, -0.54, 0.34, 0.6); } }],
    ['FLAT & TRAMLINES', (p) => { if (!p.back) { cap(p, 1.0, 0.62, true, -0.42); for (const y of [-0.55, -0.42]) stroke(p, '#e9d9c0', 0.03, [-0.62, y, -0.5, y - 0.03, -0.38, y]); } }],
  ] },
  beards: { title: 'MOUSTACHES & BEARDS · A GENTLEMAN’S GUIDE', paper: '#ece2c6', ink: '#2c2218', accent: '#7a1f1f', styles: [
    ['HANDLEBAR', (p) => { if (!p.back) { cap(p, 0.94, 0.63, false, -0.36); for (const s of [-1, 1]) stroke(p, p.hair, 0.09, [0, 0.27, s * 0.25, 0.36, s * 0.4, 0.14]); } }],
    ['WALRUS', (p) => { if (!p.back) { cap(p, 0.9, 0.62, false, -0.44); blob(p, -0.16, 0.36, 0.2, 0.14, 0.5); blob(p, 0.16, 0.36, 0.2, 0.14, -0.5); } }],
    ['GOATEE', (p) => { if (!p.back) { cap(p, 0.94, 0.63, false, -0.36); blob(p, 0, 0.64, 0.17, 0.18); stroke(p, p.hair, 0.06, [-0.16, 0.3, 0, 0.24, 0.16, 0.3]); } }],
    ['CHIN STRAP', (p) => { if (!p.back) { cap(p, 0.94, 0.63, false, -0.4); stroke(p, p.hair, 0.09, [-0.57, 0, -0.56, 0.72, 0, 0.75, 0.56, 0.72, 0.57, 0]); } }],
    ['MUTTON CHOPS', (p) => { if (!p.back) { cap(p, 0.98, 0.68, false, -0.36); for (const s of [-1, 1]) { blob(p, s * 0.5, 0.3, 0.2, 0.38, s * 0.2); stroke(p, p.hair, 0.08, [s * 0.4, 0.4, s * 0.2, 0.36, 0, 0.27]); } } }],
    ['FULL BEARD', (p) => { if (!p.back) { cap(p, 0.98, 0.66, false, -0.36); p.ctx.fillStyle = p.hair; p.ctx.beginPath(); p.ctx.moveTo(-0.6, -0.05); p.ctx.quadraticCurveTo(-0.7, 1.0, 0, 1.1); p.ctx.quadraticCurveTo(0.7, 1.0, 0.6, -0.05); p.ctx.quadraticCurveTo(0.4, 0.2, 0.22, 0.22); p.ctx.lineTo(-0.22, 0.22); p.ctx.quadraticCurveTo(-0.4, 0.2, -0.6, -0.05); p.ctx.fill(); stroke(p, '#8a3a34', 0.035, [-0.12, 0.42, 0, 0.46, 0.12, 0.42]); } }],
    ['PENCIL', (p) => { if (!p.back) { cap(p, 0.96, 0.64, false, -0.32); stroke(p, p.hair, 0.035, [-0.22, 0.3, 0, 0.24, 0.22, 0.3]); } }],
    ['IMPERIAL', (p) => { if (!p.back) { cap(p, 0.9, 0.62, false, -0.44); for (const s of [-1, 1]) stroke(p, p.hair, 0.08, [0, 0.27, s * 0.3, 0.3, s * 0.62, -0.1]); blob(p, 0, 0.6, 0.07, 0.14); } }],
  ] },
};

const SKINS = ['#f0c9a4', '#e3b088', '#c98e62', '#a8703f', '#7c4f2c', '#5a3a22'];
const HAIRS = ['#1b1512', '#3a2414', '#6a3f1c', '#a8742c', '#d9b25a', '#8f2f1a', '#77736e'];
const PUNK = ['#e0246b', '#2bbf4a', '#2f6fe0', '#f2c21a', '#141414', '#f25a1c'];

function head(ctx: Ctx, cx: number, cy: number, r: number, style: Style, skin: string, hair: string, ink: string, rnd: () => number) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(r, r);
  const pen: Pen = { ctx, hair, back: true, rnd };
  style[1](pen);
  // Shoulders, neck, ears, face.
  ctx.fillStyle = '#f4f1e8'; ctx.beginPath(); ctx.moveTo(-1.15, 1.45); ctx.quadraticCurveTo(-1.05, 0.95, -0.3, 0.9); ctx.lineTo(0.3, 0.9); ctx.quadraticCurveTo(1.05, 0.95, 1.15, 1.45); ctx.fill();
  ctx.fillStyle = skin; ctx.fillRect(-0.24, 0.5, 0.48, 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(-0.24, 0.7, 0.48, 0.12);
  ctx.fillStyle = skin;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 0.6, 0.02, 0.1, 0.17, 0, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, 0, 0.6, 0.78, 0, 0, 7); ctx.fill();
  ctx.fillStyle = ink;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 0.23, -0.06, 0.055, 0.04, 0, 0, 7); ctx.fill(); ctx.fillRect(s * 0.23 - 0.12, -0.2, 0.24, 0.035); }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0.02, -0.02); ctx.lineTo(-0.06, 0.2); ctx.lineTo(0.05, 0.2); ctx.stroke();
  ctx.strokeStyle = '#8a3a34'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.14, 0.42); ctx.quadraticCurveTo(0, 0.47, 0.14, 0.42); ctx.stroke();
  pen.back = false;
  style[1](pen);
  ctx.restore();
}

export default defineThing({
  questions: {
    era: choice('Which era and culture of haircuts does the chart show?', {
      fifties: 'Fifties America: flattops, crew cuts, ducktails and pompadours on navy-and-cream card.',
      eighties: 'Eighties Black barbershop: hi-top fades, parts and lines, waves and curls.',
      seventies: 'Seventies unisex salon: shags, naturals, feathered wings and long straight hair in browns and orange.',
      punk: 'Punk and skinhead London: mohawks, liberty spikes and number-one crops in dyed colours.',
      beards: 'A gentleman’s guide to moustaches and beards: handlebar, walrus, mutton chops.',
    }),
    count: choice('How many styles are on it?', {
      six: 'Six big heads, two by three.',
      twelve: 'A dozen, three by four.',
      twenty: 'Twenty small heads, a dense catalogue.',
    }),
    faded: score('How sun-bleached is the print?', ['Fresh and saturated, just delivered', 'A little pale', 'Blue-shifted and washed out from years in a south window', 'Almost a ghost']),
    marked: choice('Has anyone marked it?', {
      none: 'No marks.',
      circled: 'One style is circled in red marker.',
      crossed: 'One style is crossed out with “NO” scrawled beside it.',
      usual: 'An arrow points at one head with “THE USUAL” written by hand.',
      photo: 'A customer’s snapshot is taped over one of the heads.',
    }),
    frame: choice('How is it framed?', {
      black: 'A thin black metal frame under glass.',
      wood: 'A chunky varnished wooden frame.',
      gold: 'A tarnished gilt frame, too grand for it.',
      taped: 'No frame: stuck up with yellowed tape, corners curling.',
    }),
    mount: choice('Where is it?', {
      propped: 'Propped on the floor, leaning back, waiting to be rehung.',
      plaster: 'Hung on a slab of painted plaster wall with a paler rectangle around it.',
      tile: 'Hung on a slab of white-tiled wall.',
      pegboard: 'Hung on a pegboard panel with a few hooks.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const set = SETS[a.era];
    const [cols, rows] = { six: [2, 3], twelve: [3, 4], twenty: [4, 5] }[a.count];
    const W = 0.6, H = 0.84;

    const canvas = document.createElement('canvas');
    canvas.width = 720; canvas.height = 1008;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = set.paper; ctx.fillRect(0, 0, 720, 1008);
    ctx.strokeStyle = set.ink; ctx.lineWidth = 6; ctx.strokeRect(18, 18, 684, 972);
    ctx.lineWidth = 2; ctx.strokeRect(28, 28, 664, 952);
    ctx.fillStyle = set.ink; ctx.fillRect(40, 40, 640, 84);
    ctx.fillStyle = set.paper; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px Georgia, serif'; ctx.fillText(set.title, 360, 84, 610);
    const gridTop = 140, gridH = 820, cellW = 640 / cols, cellH = gridH / rows;
    const marked = Math.floor(random() * cols * rows);
    const order = set.styles.map((_unused, index) => index).sort(() => random() - 0.5);
    let markAt: [number, number, number] = [0, 0, 0];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const style = set.styles[order[index % order.length]];
      const cx = 40 + (col + 0.5) * cellW, cy = gridTop + (row + 0.5) * cellH - cellH * 0.1, r = Math.min(cellW, cellH) * 0.27;
      ctx.fillStyle = index % 2 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.18)';
      ctx.fillRect(40 + col * cellW + 4, gridTop + row * cellH + 4, cellW - 8, cellH - 8);
      const dark = a.era === 'eighties';
      const skin = SKINS[Math.min(5, Math.floor(random() * (dark ? 3 : 4)) + (dark ? 3 : 0))];
      const hair = a.era === 'punk' ? PUNK[Math.floor(random() * PUNK.length)] : dark ? HAIRS[Math.floor(random() * 2)] : HAIRS[Math.floor(random() * HAIRS.length)];
      head(ctx, cx, cy, r, style, skin, hair, set.ink, random);
      // Number roundel and name.
      ctx.fillStyle = set.accent; ctx.beginPath(); ctx.arc(40 + col * cellW + cellW * 0.16, gridTop + row * cellH + cellH * 0.14, Math.min(cellW, cellH) * 0.09, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(Math.min(cellW, cellH) * 0.11)}px Georgia, serif`; ctx.fillText(String(index + 1), 40 + col * cellW + cellW * 0.16, gridTop + row * cellH + cellH * 0.145);
      ctx.fillStyle = set.ink; ctx.font = `bold ${Math.round(cellH * 0.085)}px Georgia, serif`; ctx.fillText(style[0], cx, gridTop + (row + 1) * cellH - cellH * 0.09, cellW - 14);
      if (index === marked) markAt = [cx, cy, Math.min(cellW, cellH) * 0.42];
    }
    // Sun-bleaching: reds go first, so wash toward pale blue-cream.
    if (a.faded > 0.02) {
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `hsla(200, 20%, 60%, ${Math.min(0.9, a.faded * 0.85)})`; ctx.fillRect(0, 0, 720, 1008);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(214, 226, 226, ${a.faded * 0.42})`; ctx.fillRect(0, 0, 720, 1008);
      const sun = ctx.createLinearGradient(0, 0, 720, 1008); sun.addColorStop(0, `rgba(255,252,235,${a.faded * 0.3})`); sun.addColorStop(0.6, 'rgba(255,252,235,0)');
      ctx.fillStyle = sun; ctx.fillRect(0, 0, 720, 1008);
    }
    // Stains and foxing with wear.
    for (let i = 0; i < mood.wear * 26; i++) { ctx.fillStyle = `rgba(120, 84, 40, ${0.05 + random() * 0.12})`; ctx.beginPath(); ctx.ellipse(random() * 720, random() * 1008, 6 + random() * 40, 6 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
    // Marks are newer than the fading, so they stay vivid.
    const [mx, my, mr] = markAt;
    ctx.lineCap = 'round';
    if (a.marked === 'circled') { ctx.strokeStyle = '#d3202a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(mx, my + mr * 0.1, mr * 1.02, mr * 1.12, 0.2, 0.3, Math.PI * 2 + 0.9); ctx.stroke(); }
    if (a.marked === 'crossed') { ctx.strokeStyle = '#111'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(mx - mr, my - mr); ctx.lineTo(mx + mr, my + mr); ctx.moveTo(mx + mr, my - mr); ctx.lineTo(mx - mr, my + mr); ctx.stroke(); ctx.fillStyle = '#111'; ctx.font = `bold ${Math.round(mr * 0.7)}px cursive`; ctx.fillText('NO', mx + mr * 0.7, my - mr * 0.9); }
    if (a.marked === 'usual') { ctx.strokeStyle = '#1b3fae'; ctx.fillStyle = '#1b3fae'; ctx.lineWidth = 7; const fx = mx > 360 ? mx - mr * 1.7 : mx + mr * 1.7; ctx.beginPath(); ctx.moveTo(fx, my - mr * 1.1); ctx.quadraticCurveTo((fx + mx) / 2, my - mr * 1.5, mx + Math.sign(fx - mx) * mr * 0.5, my - mr * 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(mx + Math.sign(fx - mx) * mr * 0.5, my - mr * 0.6, 9, 0, 7); ctx.fill(); ctx.font = `bold ${Math.round(mr * 0.42)}px cursive`; ctx.save(); ctx.translate(fx, my - mr * 1.3); ctx.rotate(-0.12); ctx.fillText('THE USUAL', 0, 0); ctx.restore(); }
    if (a.marked === 'photo') { ctx.save(); ctx.translate(mx, my); ctx.rotate((random() - 0.5) * 0.3); ctx.fillStyle = '#fbfaf4'; ctx.fillRect(-mr * 0.8, -mr, mr * 1.6, mr * 1.9); ctx.fillStyle = '#5c7f95'; ctx.fillRect(-mr * 0.68, -mr * 0.88, mr * 1.36, mr * 1.36); ctx.fillStyle = '#c98e62'; ctx.beginPath(); ctx.ellipse(0, -mr * 0.2, mr * 0.3, mr * 0.38, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(0, -mr * 0.48, mr * 0.33, mr * 0.2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#e8d9a6'; ctx.globalAlpha = 0.85; ctx.fillRect(-mr * 0.3, -mr * 1.12, mr * 0.6, mr * 0.24); ctx.restore(); }
    if (a.frame !== 'taped' && mood.wear > 0.7) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; const ox = random() * 500 + 100, oy = random() * 600 + 200; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(ox, oy); let x = ox, y = oy; const ang = i * 1.05 + random(); for (let k = 0; k < 5; k++) { x += Math.cos(ang + (random() - 0.5)) * 90; y += Math.sin(ang + (random() - 0.5)) * 90; ctx.lineTo(x, y); } ctx.stroke(); } }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    // The poster group: built upright on y = 0, facing +z, then leaned or hung.
    const piece = new Sculpture(context);
    s.root.add(piece.root);
    const print = new THREE.MeshStandardMaterial({ map: texture, roughness: a.frame === 'taped' ? 0.9 : 0.35 });
    if (a.frame === 'taped') {
      const sheet = piece.mesh(new THREE.PlaneGeometry(W, H, 12, 16), print, [0, H / 2, 0.004]);
      (sheet.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      const p = sheet.geometry.attributes.position;
      const curl = mix(0.02, 0.07, mood.wear);
      for (let i = 0; i < p.count; i++) { const u = Math.abs(p.getX(i)) / (W / 2), v = Math.abs(p.getY(i)) / (H / 2); p.setZ(i, (u * v) ** 3 * curl + Math.sin(p.getY(i) * 9) * 0.002); }
      sheet.geometry.computeVertexNormals();
      const tape = s.material('#d9c98a', { roughness: 0.6, transparent: true, opacity: 0.85 });
      for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) if (!(y < 0 && mood.wear > 0.6 && x > 0)) piece.box([0.07, 0.025, 0.001], [x * (W / 2 - 0.02), H / 2 + y * (H / 2 - 0.015), 0.008], tape).rotation.z = x * y * -0.7;
    } else {
      const tint = { black: '#1b1b1d', wood: '#6b4424', gold: '#b08d3c' }[a.frame];
      const bar = { black: 0.018, wood: 0.05, gold: 0.06 }[a.frame];
      const depth = { black: 0.02, wood: 0.035, gold: 0.045 }[a.frame];
      const moulding = s.material(tint, { metalness: a.frame === 'wood' ? 0 : 0.6, roughness: a.frame === 'gold' ? 0.45 : 0.5 });
      piece.box([W + bar * 2, bar, depth], [0, H + bar * 1.5, depth / 2], moulding);
      piece.box([W + bar * 2, bar, depth], [0, bar / 2, depth / 2], moulding);
      for (const x of [-1, 1]) piece.box([bar, H, depth], [x * (W + bar) / 2, H / 2 + bar, depth / 2], moulding);
      if (a.frame === 'gold') for (const x of [-1, 1]) for (const y of [0, 1]) piece.ball([bar * 0.75, bar * 0.75, depth * 0.7], [x * (W + bar) / 2, y * (H + bar) + bar / 2, depth * 0.6], moulding, 12);
      if (a.frame === 'wood') { const inner = s.material('#e8dcc0'); piece.box([W + 0.004, 0.006, 0.012], [0, H + bar - 0.003, 0.012], inner); piece.box([W + 0.004, 0.006, 0.012], [0, bar + 0.003, 0.012], inner); }
      piece.box([W + bar, H + bar, 0.006], [0, H / 2 + bar, 0.003], s.material('#8a7a5c', { roughness: 0.9 }));
      piece.mesh(new THREE.PlaneGeometry(W, H), print, [0, H / 2 + bar, 0.0075]);
    }
    const frameH = H + (a.frame === 'taped' ? 0 : { black: 0.036, wood: 0.1, gold: 0.12 }[a.frame]);

    if (a.mount === 'propped') {
      piece.root.rotation.x = -mix(0.12, 0.22, random());
      piece.root.rotation.y = (random() - 0.5) * 0.3;
      // A strip of skirting and floor-shadow hint behind keeps it grounded: a kick-stand batten.
      s.rod([0.12, frameH * 0.7 * Math.cos(0.17), -frameH * 0.7 * Math.sin(0.17) - 0.004], [0.12, 0.005, -0.36], 0.012, s.material('#7a5a34'));
      s.rod([-0.12, frameH * 0.7 * Math.cos(0.17), -frameH * 0.7 * Math.sin(0.17) - 0.004], [-0.12, 0.005, -0.36], 0.012, s.material('#7a5a34'));
      piece.root.rotation.y = 0;
    } else {
      const wallW = 1.15, wallH = 1.7, hang = 0.55;
      piece.root.position.set(0, hang, 0.012);
      piece.root.rotation.z = (random() - 0.5) * mix(0.01, 0.12, mood.wear);
      if (a.mount === 'plaster') {
        const paint = new THREE.Color().setHSL(mix(0.5, 0.11, mood.warmth), 0.28, 0.72);
        s.box([wallW, wallH, 0.08], [0, wallH / 2, -0.04], s.material(paint, { roughness: 0.95 }));
        s.box([W + 0.2, frameH + 0.16, 0.002], [0.03, hang + frameH / 2 - 0.02, 0.001], s.material(paint.clone().offsetHSL(0, 0.05, 0.08), { roughness: 0.95 }));
        s.box([wallW, 0.12, 0.02], [0, 0.06, 0.01], s.material('#e9e3d2'));
      } else if (a.mount === 'tile') {
        const tiles = document.createElement('canvas'); tiles.width = tiles.height = 256;
        const t = tiles.getContext('2d')!; t.fillStyle = '#b9bcb4'; t.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { t.fillStyle = random() < mood.wear * 0.2 ? '#d6d2bf' : '#f1f1ea'; t.fillRect(x * 32 + 1.5, y * 32 + 1.5, 29, 29); }
        const map = new THREE.CanvasTexture(tiles); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(1.15, 1.7);
        s.box([wallW, wallH, 0.08], [0, wallH / 2, -0.04], new THREE.MeshStandardMaterial({ map, roughness: 0.25 }));
        s.box([wallW, 0.05, 0.012], [0, 1.02, 0.004], s.material(mood.cheer > 0.5 ? '#2f8f8a' : '#27344f', { roughness: 0.25 }));
      } else {
        const peg = document.createElement('canvas'); peg.width = peg.height = 128;
        const t = peg.getContext('2d')!; t.fillStyle = '#b08a5a'; t.fillRect(0, 0, 128, 128); t.fillStyle = '#4a3622';
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { t.beginPath(); t.arc(x * 16 + 8, y * 16 + 8, 2.4, 0, 7); t.fill(); }
        const map = new THREE.CanvasTexture(peg); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(4.6, 6.8);
        s.box([wallW, wallH, 0.03], [0, wallH / 2, -0.015], new THREE.MeshStandardMaterial({ map, roughness: 0.85 }));
        const steel = s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 });
        for (const x of [-0.45, 0.45]) { s.rod([x, 0.42, 0], [x, 0.4, 0.05], 0.004, steel); s.rod([x, 0.4, 0.05], [x, 0.42, 0.055], 0.004, steel); }
        // A comb and scissors hang from the hooks.
        s.box([0.03, 0.18, 0.004], [-0.45, 0.3, 0.05], s.material('#17171a'));
        s.ring(0.018, 0.004, [0.45, 0.385, 0.05], steel); s.rod([0.45, 0.37, 0.05], [0.44, 0.22, 0.05], 0.005, steel, 0.001); s.rod([0.45, 0.37, 0.05], [0.47, 0.22, 0.05], 0.005, steel, 0.001);
      }
      // Nail and wire.
      if (a.frame !== 'taped') { s.rod([-W * 0.3, hang + frameH - 0.02, 0.008], [0, hang + frameH + 0.07, 0.008], 0.0025, s.material('#555')); s.rod([W * 0.3, hang + frameH - 0.02, 0.008], [0, hang + frameH + 0.07, 0.008], 0.0025, s.material('#555')); s.ball([0.008, 0.008, 0.008], [0, hang + frameH + 0.07, 0.01], s.material('#333'), 8); }
    }
    return s.finish();
  },
});
