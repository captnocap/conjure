import { write } from './lib';

type Ctx = CanvasRenderingContext2D;

export function western(ctx: Ctx, w: number, h: number, random: () => number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#f08a3c'); sky.addColorStop(0.55, '#f7c65a'); sky.addColorStop(1, '#f3dd9a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(w * 0.68, h * 0.5, h * 0.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#a8492c';
  for (let i = 0; i < 4; i++) {
    const x = w * (0.02 + i * 0.27 + random() * 0.08), bw = w * (0.1 + random() * 0.1), bh = h * (0.2 + random() * 0.22), y = h * 0.74;
    ctx.beginPath(); ctx.moveTo(x - bw * 0.2, y); ctx.lineTo(x, y - bh); ctx.lineTo(x + bw, y - bh * (0.9 + random() * 0.15)); ctx.lineTo(x + bw * 1.25, y); ctx.fill();
  }
  ctx.fillStyle = '#4a2318'; ctx.fillRect(0, h * 0.74, w, h * 0.26);
  ctx.fillStyle = '#20100c';
  // Saguaro.
  const cx = w * 0.14, cy = h * 0.8;
  ctx.fillRect(cx - w * 0.008, cy - h * 0.36, w * 0.016, h * 0.36);
  ctx.fillRect(cx - w * 0.03, cy - h * 0.24, w * 0.03, h * 0.025); ctx.fillRect(cx - w * 0.034, cy - h * 0.32, w * 0.01, h * 0.1);
  ctx.fillRect(cx, cy - h * 0.18, w * 0.03, h * 0.025); ctx.fillRect(cx + w * 0.024, cy - h * 0.28, w * 0.01, h * 0.12);
  // Rider on a horse, in silhouette against the sun.
  const rx = w * 0.5, ry = h * 0.7, u = h * 0.085;
  ctx.beginPath(); ctx.ellipse(rx, ry - u * 2, u * 1.6, u * 0.7, 0, 0, 7); ctx.fill();
  for (const leg of [-1.2, -0.8, 0.9, 1.3]) ctx.fillRect(rx + leg * u - u * 0.12, ry - u * 1.8, u * 0.26, u * 2.2);
  ctx.beginPath(); ctx.moveTo(rx + u * 1.1, ry - u * 2.3); ctx.lineTo(rx + u * 2.1, ry - u * 3.7); ctx.lineTo(rx + u * 2.9, ry - u * 3.3); ctx.lineTo(rx + u * 2.5, ry - u * 3); ctx.lineTo(rx + u * 1.7, ry - u * 1.8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(rx - u * 1.5, ry - u * 2.2); ctx.quadraticCurveTo(rx - u * 2.4, ry - u * 2, rx - u * 2.2, ry - u * 0.8); ctx.lineTo(rx - u * 1.9, ry - u * 0.9); ctx.quadraticCurveTo(rx - u * 1.9, ry - u * 1.8, rx - u * 1.3, ry - u * 1.8); ctx.fill();
  ctx.fillRect(rx - u * 0.35, ry - u * 4.3, u * 0.75, u * 1.9);
  ctx.beginPath(); ctx.arc(rx, ry - u * 4.7, u * 0.36, 0, 7); ctx.fill();
  ctx.fillRect(rx - u * 0.8, ry - u * 5.0, u * 1.6, u * 0.14); ctx.fillRect(rx - u * 0.4, ry - u * 5.4, u * 0.8, u * 0.45);
}

export function monster(ctx: Ctx, w: number, h: number, random: () => number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#12343a'); sky.addColorStop(1, '#5fae7d');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e9f3c0'; ctx.beginPath(); ctx.arc(w * 0.16, h * 0.24, h * 0.13, 0, 7); ctx.fill();
  // The creature: a hunched lizard with back plates, wading through the skyline.
  const mx = w * 0.6, my = h * 0.95, u = h * 0.1;
  ctx.fillStyle = '#0c1c1b';
  ctx.beginPath(); ctx.ellipse(mx, my - u * 3, u * 2.2, u * 3.4, 0.25, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(mx - u * 2.3, my - u * 6.6, u * 1.5, u * 0.95, -0.3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(mx - u * 1.4, my - u * 5.9); ctx.lineTo(mx - u * 0.2, my - u * 6.4); ctx.lineTo(mx + u * 0.9, my - u * 4); ctx.lineTo(mx - u * 1.4, my - u * 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(mx - u * 3.6, my - u * 6.3); ctx.lineTo(mx - u * 2.2, my - u * 5.5); ctx.lineTo(mx - u * 3.3, my - u * 5.6); ctx.fill();
  for (let i = 0; i < 6; i++) { const t = i / 5, px = mx - u * 0.8 + t * u * 3.4, py = my - u * 6.9 + t * t * u * 4.4; ctx.beginPath(); ctx.moveTo(px - u * 0.35, py + u * 0.4); ctx.lineTo(px + u * 0.25, py - u * 0.8); ctx.lineTo(px + u * 0.6, py + u * 0.5); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(mx - u * 1.6, my - u * 4.4); ctx.lineTo(mx - u * 3.5, my - u * 3.6); ctx.lineTo(mx - u * 3.7, my - u * 3.1); ctx.lineTo(mx - u * 1.5, my - u * 3.5); ctx.fill();
  ctx.fillStyle = '#f6e04a'; ctx.beginPath(); ctx.arc(mx - u * 2.6, my - u * 6.9, u * 0.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#10201f';
  for (let x = 0; x < w;) {
    const bw = w * (0.03 + random() * 0.05), bh = h * (0.12 + random() * 0.3);
    ctx.fillStyle = '#10201f'; ctx.fillRect(x, h - bh, bw, bh);
    ctx.fillStyle = '#f6e04a';
    for (let wy = h - bh + 6; wy < h - 6; wy += 12) for (let wx = x + 4; wx < x + bw - 5; wx += 9) if (random() < 0.35) ctx.fillRect(wx, wy, 4, 6);
    x += bw + 2;
  }
  write(ctx, 'IT CAME AT DUSK', w * 0.3, h * 0.56, h * 0.13, '#f6e04a', { outline: '#7a1010', tilt: -0.07, max: w * 0.5 });
}

export function intermission(ctx: Ctx, w: number, h: number, random: () => number) {
  ctx.fillStyle = '#1d2f7a'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { ctx.fillStyle = ['#f6d743', '#ff8fb0', '#ffffff'][i % 3]; const x = random() * w, y = random() * h, r = h * 0.012; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.4 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.fill(); }
  write(ctx, 'INTERMISSION', w * 0.5, h * 0.2, h * 0.2, '#f6d743', { outline: '#c02a2a', max: w * 0.8 });
  // Countdown clock.
  const minutes = 2 + Math.floor(random() * 8);
  const cx = w * 0.5, cy = h * 0.6, r = h * 0.25;
  ctx.fillStyle = '#fdf6dc'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#e2453c'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r * 0.92, -Math.PI / 2, -Math.PI / 2 + (minutes / 10) * Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d2f7a'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 7); ctx.fill();
  write(ctx, String(minutes), cx, cy, r * 0.75, '#fdf6dc');
  write(ctx, 'MINUTES', cx, cy + r * 1.22, h * 0.09, '#fdf6dc');
  // A striped popcorn box and a soda cup marching to the snack bar.
  const bx = w * 0.18, by = h * 0.86;
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#fdf6dc' : '#e2453c'; ctx.beginPath(); ctx.moveTo(bx + (i - 2.5) * h * 0.05, by - h * 0.34); ctx.lineTo(bx + (i - 1.5) * h * 0.05, by - h * 0.34); ctx.lineTo(bx + (i - 1.5) * h * 0.04, by); ctx.lineTo(bx + (i - 2.5) * h * 0.04, by); ctx.fill(); }
  ctx.fillStyle = '#fbe9a0'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(bx + (random() - 0.5) * h * 0.22, by - h * (0.36 + random() * 0.08), h * 0.04, 0, 7); ctx.fill(); }
  const sx = w * 0.82;
  ctx.fillStyle = '#fdf6dc'; ctx.beginPath(); ctx.moveTo(sx - h * 0.09, by - h * 0.36); ctx.lineTo(sx + h * 0.09, by - h * 0.36); ctx.lineTo(sx + h * 0.065, by); ctx.lineTo(sx - h * 0.065, by); ctx.fill();
  ctx.fillStyle = '#e2453c'; ctx.fillRect(sx - h * 0.085, by - h * 0.25, h * 0.17, h * 0.1);
  ctx.strokeStyle = '#fdf6dc'; ctx.lineWidth = h * 0.02; ctx.beginPath(); ctx.moveTo(sx + h * 0.02, by - h * 0.36); ctx.lineTo(sx + h * 0.08, by - h * 0.52); ctx.stroke();
}

export function leader(ctx: Ctx, w: number, h: number, random: () => number) {
  ctx.fillStyle = '#b9b6ab'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r = h * 0.42;
  ctx.fillStyle = '#8f8c82'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, w, -Math.PI / 2, -Math.PI / 2 + (0.2 + random() * 0.7) * Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b2b2a'; ctx.lineWidth = h * 0.012;
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
  for (const k of [1, 0.82]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 7); ctx.stroke(); }
  write(ctx, String(2 + Math.floor(random() * 7)), cx, cy + h * 0.02, h * 0.6, '#2b2b2a');
  for (let i = 0; i < 14; i++) { ctx.strokeStyle = 'rgba(30,30,30,0.5)'; ctx.lineWidth = 1 + random() * 2; const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (random() - 0.5) * 8, h); ctx.stroke(); }
}

export function theEnd(ctx: Ctx, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, w * 0.6);
  g.addColorStop(0, '#8c8a86'); g.addColorStop(1, '#1b1b1d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  write(ctx, 'The End', w / 2, h * 0.5, h * 0.36, '#f5f1e4', { font: 'italic bold', face: 'Georgia, serif', max: w * 0.7 });
  ctx.strokeStyle = '#f5f1e4'; ctx.lineWidth = h * 0.012; ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.74); ctx.quadraticCurveTo(w * 0.5, h * 0.8, w * 0.7, h * 0.74); ctx.stroke();
}

