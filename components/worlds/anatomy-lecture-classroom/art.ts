/** Chalk and print drawings for the classroom: everything here paints onto a 2D canvas. */
type Ctx = CanvasRenderingContext2D;
type Random = () => number;

const HEAD: readonly (readonly [number, number])[] = [
  [0.62, 1.0], [0.66, 0.8], [0.84, 0.62], [0.9, 0.4], [0.78, 0.16], [0.56, 0.07], [0.36, 0.13], [0.27, 0.27], [0.25, 0.37], [0.27, 0.41],
  [0.2, 0.5], [0.14, 0.56], [0.2, 0.585], [0.22, 0.6], [0.19, 0.645], [0.235, 0.67], [0.2, 0.71], [0.215, 0.76], [0.21, 0.83], [0.27, 0.885], [0.38, 0.9], [0.41, 1.0],
];

/** A smooth open line through points given in a unit box, drawn into the rectangle x, y, w, h. */
function through(ctx: Ctx, points: readonly (readonly [number, number])[], x: number, y: number, w: number, h: number, wobble = 0, random: Random = () => 0.5) {
  const p = points.map(([px, py]) => [x + px * w + (random() - 0.5) * wobble, y + py * h + (random() - 0.5) * wobble]);
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
  ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
  ctx.stroke();
}

function note(ctx: Ctx, text: string, x: number, y: number, size: number, toX?: number, toY?: number) {
  ctx.font = `italic ${size}px serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  if (toX !== undefined && toY !== undefined) {
    const from = toX < x ? x - 8 : x + ctx.measureText(text).width + 8;
    ctx.save(); ctx.lineWidth = Math.max(1.5, size * 0.07);
    ctx.beginPath(); ctx.moveTo(from, y); ctx.lineTo(toX, toY); ctx.stroke(); ctx.restore();
  }
}

export function headProfile(ctx: Ctx, x: number, y: number, w: number, h: number, random: Random, detail = true) {
  through(ctx, HEAD, x, y, w, h, 3, random);
  if (!detail) return;
  // eye, ear, jaw line, the skull inside
  ctx.beginPath(); ctx.ellipse(x + 0.34 * w, y + 0.42 * h, 0.04 * w, 0.018 * h, 0, 0, Math.PI * 2); ctx.stroke();
  through(ctx, [[0.6, 0.47], [0.66, 0.44], [0.69, 0.5], [0.66, 0.58], [0.61, 0.6]], x, y, w, h);
  through(ctx, [[0.62, 0.6], [0.56, 0.78], [0.4, 0.85], [0.26, 0.86]], x, y, w, h);
  ctx.save(); ctx.setLineDash([10, 9]);
  through(ctx, [[0.3, 0.3], [0.45, 0.16], [0.68, 0.2], [0.8, 0.42], [0.66, 0.56]], x, y, w, h);
  through(ctx, [[0.24, 0.6], [0.4, 0.62], [0.52, 0.56]], x, y, w, h);
  ctx.restore();
}

export function skullFront(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.2, r * 0.78, r * 0.82, 0, Math.PI * 0.87, Math.PI * 2.13); ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + side * r * 0.32, cy - r * 0.02, r * 0.21, r * 0.17, side * 0.15, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + side * r * 0.74, cy + r * 0.2); ctx.quadraticCurveTo(cx + side * r * 0.62, cy + r * 0.5, cx + side * r * 0.5, cy + r * 0.56); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + side * r * 0.62, cy + r * 0.5); ctx.quadraticCurveTo(cx + side * r * 0.58, cy + r * 1.0, cx + side * r * 0.3, cy + r * 1.12); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.12); ctx.lineTo(cx - r * 0.1, cy + r * 0.38); ctx.lineTo(cx + r * 0.1, cy + r * 0.38); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy + r * 1.12); ctx.quadraticCurveTo(cx, cy + r * 1.2, cx + r * 0.3, cy + r * 1.12); ctx.stroke();
  ctx.strokeRect(cx - r * 0.4, cy + r * 0.56, r * 0.8, r * 0.26);
  ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy + r * 0.69); ctx.lineTo(cx + r * 0.4, cy + r * 0.69);
  for (let i = 1; i < 8; i++) { ctx.moveTo(cx - r * 0.4 + i * r * 0.1, cy + r * 0.56); ctx.lineTo(cx - r * 0.4 + i * r * 0.1, cy + r * 0.82); }
  ctx.stroke();
}

export type BoardSubject = 'head' | 'skull' | 'lesson' | 'wiped' | 'doodle';

export function chalkboard(ctx: Ctx, w: number, h: number, board: string, subject: BoardSubject, wear: number, random: Random) {
  ctx.fillStyle = board; ctx.fillRect(0, 0, w, h);
  const smear = (count: number, alpha: number) => {
    for (let i = 0; i < count; i++) {
      ctx.strokeStyle = `rgba(235,235,225,${alpha * (0.4 + random() * 0.6)})`;
      ctx.lineWidth = 50 + random() * 70; ctx.lineCap = 'round';
      const x = random() * w, y = random() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (random() - 0.5) * 300, y + (random() - 0.5) * 120, x + (random() - 0.5) * 420, y + (random() - 0.5) * 80); ctx.stroke();
    }
  };
  smear(10 + Math.round(wear * 14), 0.035 + wear * 0.03);
  ctx.strokeStyle = ctx.fillStyle = 'rgba(244,243,232,0.92)';
  ctx.lineWidth = 5; ctx.lineCap = ctx.lineJoin = 'round';
  if (subject === 'head' || subject === 'wiped') {
    if (subject === 'wiped') ctx.strokeStyle = ctx.fillStyle = 'rgba(244,243,232,0.16)';
    headProfile(ctx, w * 0.3, h * 0.05, h * 0.86, h * 0.92, random);
    note(ctx, 'frontal', w * 0.1, h * 0.2, 40, w * 0.4, h * 0.24);
    note(ctx, 'nasal', w * 0.08, h * 0.5, 40, w * 0.37, h * 0.5);
    note(ctx, 'mandible', w * 0.06, h * 0.8, 40, w * 0.42, h * 0.78);
    note(ctx, 'occipital', w * 0.74, h * 0.3, 40, w * 0.62, h * 0.4);
    note(ctx, 'mastoid', w * 0.76, h * 0.62, 40, w * 0.6, h * 0.58);
    if (subject === 'head') {
      // the duster has been through the back of the head and the notes on the right
      ctx.strokeStyle = board; ctx.globalAlpha = 0.86; ctx.lineWidth = 105;
      ctx.beginPath(); ctx.moveTo(w * 0.52, h * 0.02); ctx.quadraticCurveTo(w * 0.7, h * 0.3, w * 0.6, h * 0.62); ctx.quadraticCurveTo(w * 0.8, h * 0.5, w * 0.98, h * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.7, h * 0.1); ctx.lineTo(w * 0.98, h * 0.36); ctx.stroke();
      ctx.globalAlpha = 1;
      smear(5, 0.09);
    }
  } else if (subject === 'skull') {
    skullFront(ctx, w * 0.36, h * 0.42, h * 0.36);
    note(ctx, 'orbit', w * 0.62, h * 0.3, 42, w * 0.44, h * 0.4);
    note(ctx, 'zygomatic', w * 0.64, h * 0.52, 42, w * 0.5, h * 0.56);
    note(ctx, 'maxilla', w * 0.66, h * 0.72, 42, w * 0.42, h * 0.68);
    note(ctx, 'I. cranium  14 bones', w * 0.04, h * 0.12, 34);
  } else if (subject === 'lesson') {
    ctx.font = 'bold 62px serif'; ctx.textBaseline = 'middle';
    ctx.fillText('MUSCLES of EXPRESSION', w * 0.06, h * 0.16);
    ctx.fillRect(w * 0.06, h * 0.25, w * 0.66, 5);
    ['1. orbicularis oculi — blink, squint', '2. zygomaticus major — smile', '3. corrugator — frown', '4. risorius — grin', '5. mentalis — doubt'].forEach((line, i) => note(ctx, line, w * 0.08, h * (0.37 + i * 0.12), 40));
    ctx.save(); ctx.translate(w * 0.86, h * 0.6);
    ctx.beginPath(); ctx.arc(0, 0, h * 0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, h * 0.02, h * 0.11, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-h * 0.07, -h * 0.05, 5, 0, Math.PI * 2); ctx.arc(h * 0.07, -h * 0.05, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else {
    // someone has been at the board after the lecturer left
    ctx.save(); ctx.translate(w * 0.3, h * 0.5);
    ctx.beginPath(); ctx.arc(0, 0, h * 0.34, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-h * 0.12, -h * 0.08, h * 0.05, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(h * 0.12, -h * 0.1, h * 0.07, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-h * 0.11, -h * 0.07, 6, 0, Math.PI * 2); ctx.arc(h * 0.14, -h * 0.09, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, h * 0.06, h * 0.17, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.fillStyle = 'rgba(232,150,160,0.9)';
    ctx.beginPath(); ctx.ellipse(h * 0.02, h * 0.26, h * 0.06, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(244,243,232,0.92)';
    ctx.font = 'bold 74px sans-serif'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.translate(w * 0.56, h * 0.36); ctx.rotate(-0.06); ctx.fillText('EXAM FRIDAY', 0, 0); ctx.fillRect(0, 48, 430, 6); ctx.restore();
    note(ctx, 'bring your own skull', w * 0.58, h * 0.66, 44);
  }
}

export type ChartSubject = 'muscles' | 'skull' | 'eye';

export function wallChart(ctx: Ctx, w: number, h: number, subject: ChartSubject, wear: number, random: Random) {
  ctx.fillStyle = '#e9dfc2'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 12 + wear * 30; i++) {
    ctx.fillStyle = `rgba(120,95,50,${0.03 + random() * 0.07 * (0.4 + wear)})`;
    ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 20 + random() * 90, 20 + random() * 70, random() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#2a2520'; ctx.fillStyle = '#2a2520'; ctx.lineWidth = 4; ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.font = 'bold 38px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText({ muscles: 'MUSCULI FACIEI', skull: 'CRANIUM', eye: 'OCULUS' }[subject], w / 2, 58);
  ctx.font = 'italic 22px serif'; ctx.fillText(`Tab. ${['II', 'IV', 'VII', 'IX', 'XII'][Math.floor(random() * 5)]}`, w / 2, h - 44);
  const cx = w / 2, cy = h * 0.5;
  const pointer = (n: number, fromX: number, fromY: number, toLeft: boolean) => {
    const tx = toLeft ? 46 : w - 46;
    ctx.save(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(tx + (toLeft ? 16 : -16), fromY - 14); ctx.stroke(); ctx.restore();
    ctx.font = 'bold 24px serif'; ctx.fillText(String(n), tx, fromY - 14);
  };
  if (subject === 'muscles') {
    const red = '#b0392e', deep = '#7e211c';
    ctx.fillStyle = '#e2b79a';
    ctx.beginPath(); ctx.ellipse(cx, cy - 20, 150, 200, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillRect(cx - 62, cy + 150, 124, 120); ctx.strokeRect(cx - 62, cy + 150, 124, 120);
    ctx.lineWidth = 5;
    for (let i = -6; i <= 6; i++) { ctx.strokeStyle = i % 2 ? red : deep; ctx.beginPath(); ctx.moveTo(cx + i * 19, cy - 205 + Math.abs(i) * 6); ctx.lineTo(cx + i * 16, cy - 120); ctx.stroke(); }
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) { ctx.strokeStyle = k % 2 ? red : deep; ctx.beginPath(); ctx.ellipse(cx + side * 62, cy - 62, 30 + k * 9, 20 + k * 7, 0, 0, Math.PI * 2); ctx.stroke(); }
      for (let k = 0; k < 5; k++) { ctx.strokeStyle = k % 2 ? red : deep; ctx.beginPath(); ctx.moveTo(cx + side * (112 + k * 6), cy - 10 + k * 8); ctx.lineTo(cx + side * (40 + k * 4), cy + 78 + k * 5); ctx.stroke(); }
      for (let k = 0; k < 5; k++) { ctx.strokeStyle = k % 2 ? red : deep; ctx.beginPath(); ctx.moveTo(cx + side * (128 - k * 8), cy + 20); ctx.lineTo(cx + side * (106 - k * 8), cy + 128 - k * 4); ctx.stroke(); }
      ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.ellipse(cx + side * 62, cy - 62, 17, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2520'; ctx.beginPath(); ctx.arc(cx + side * 62, cy - 62, 6, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 4; k++) { ctx.strokeStyle = k % 2 ? red : deep; ctx.beginPath(); ctx.moveTo(cx + side * (18 + k * 12), cy + 170); ctx.lineTo(cx + side * (26 + k * 10), cy + 268); ctx.stroke(); }
    }
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = k % 2 ? red : deep; ctx.beginPath(); ctx.ellipse(cx, cy + 96, 30 + k * 9, 12 + k * 7, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = '#2a2520'; ctx.fillStyle = '#2a2520'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy - 40); ctx.lineTo(cx - 20, cy + 40); ctx.lineTo(cx + 20, cy + 40); ctx.stroke();
    pointer(1, cx - 60, cy - 170, true); pointer(2, cx - 96, cy - 62, true); pointer(3, cx - 100, cy + 40, true); pointer(4, cx + 40, cy + 96, false); pointer(5, cx + 118, cy + 80, false); pointer(6, cx + 40, cy + 220, false);
  } else if (subject === 'skull') {
    ctx.fillStyle = '#efe7cf';
    ctx.beginPath(); ctx.ellipse(cx + 20, cy - 70, 170, 150, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 132, cy - 30); ctx.lineTo(cx - 150, cy + 70); ctx.lineTo(cx - 120, cy + 110); ctx.lineTo(cx - 20, cy + 110); ctx.lineTo(cx + 10, cy + 40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 128, cy + 126); ctx.lineTo(cx - 104, cy + 190); ctx.lineTo(cx + 20, cy + 172); ctx.lineTo(cx + 60, cy + 40); ctx.lineTo(cx + 26, cy + 34); ctx.lineTo(cx - 6, cy + 128); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2520';
    ctx.beginPath(); ctx.ellipse(cx - 84, cy - 20, 34, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 140, cy + 20); ctx.lineTo(cx - 122, cy + 56); ctx.lineTo(cx - 146, cy + 56); ctx.fill();
    for (let i = 0; i < 7; i++) ctx.strokeRect(cx - 130 + i * 16, cy + 110, 16, 18);
    ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i <= 26; i++) ctx.lineTo(cx - 30 + i * 3 + (i % 2 ? 7 : -7), cy - 210 + i * 8); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i <= 22; i++) ctx.lineTo(cx + 60 + i * 5, cy - 20 + (i % 2 ? 6 : -6) - i * 2); ctx.stroke();
    pointer(1, cx + 60, cy - 150, false); pointer(2, cx - 84, cy - 20, true); pointer(3, cx - 110, cy + 120, true); pointer(4, cx + 20, cy + 150, false);
  } else {
    ctx.fillStyle = '#f4efe2';
    ctx.beginPath(); ctx.arc(cx + 10, cy, 170, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b0392e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx + 10, cy, 158, -2.4, 2.4); ctx.stroke();
    ctx.strokeStyle = '#2a2520'; ctx.lineWidth = 4;
    ctx.fillStyle = '#cfe2ea'; ctx.beginPath(); ctx.ellipse(cx - 150, cy, 44, 92, 0, Math.PI / 2, Math.PI * 1.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8d9a0'; ctx.beginPath(); ctx.ellipse(cx - 110, cy, 26, 60, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3f6fa8'; ctx.fillRect(cx - 142, cy - 96, 12, 44); ctx.fillRect(cx - 142, cy + 52, 12, 44);
    ctx.fillStyle = '#e3c23f'; ctx.fillRect(cx + 170, cy - 22, 80, 44); ctx.strokeRect(cx + 170, cy - 22, 80, 44);
    ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
    for (const dy of [-60, 0, 60]) { ctx.beginPath(); ctx.moveTo(40, cy + dy); ctx.lineTo(cx - 110, cy + dy * 0.5); ctx.lineTo(cx + 166, cy - dy * 0.12); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.fillStyle = '#2a2520';
    pointer(1, cx - 170, cy - 60, true); pointer(2, cx - 110, cy + 40, true); pointer(3, cx + 90, cy - 120, false); pointer(4, cx + 210, cy + 22, false);
  }
  ctx.textAlign = 'left';
}
