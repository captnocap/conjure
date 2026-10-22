/** Canvas helpers for the painted map: grain, stars, and the little marks a mapmaker scatters over land and sea. */

/** Faint woven grain over a painted ground, so it reads as canvas or vellum rather than plastic. */
export function weave(ctx: CanvasRenderingContext2D, width: number, height: number, random: () => number, ink: string, count: number) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const y = random() * height;
    ctx.globalAlpha = 0.04 + random() * 0.06;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + (random() - 0.5) * 2);
    ctx.stroke();
    const x = random() * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (random() - 0.5) * 2, height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A small four-pointed star, filled. */
export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? size : size * 0.32;
    const a = (i / 8) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** A row of hills: two humps with a shaded side. */
export function drawHills(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink: string, shade: string) {
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.quadraticCurveTo(x - size * 0.5, y - size * 1.1, x, y);
  ctx.quadraticCurveTo(x + size * 0.5, y - size * 0.9, x + size, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, size * 0.12);
  ctx.stroke();
}

/** A lollipop tree. */
export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink: string, leaf: string) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, size * 0.18);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - size);
  ctx.stroke();
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(x, y - size * 1.25, size * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.1);
  ctx.stroke();
}

/** A tiny walled town: a block with battlements and a tower. */
export function drawTown(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink: string, wall: string) {
  ctx.fillStyle = wall;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, size * 0.1);
  ctx.beginPath();
  ctx.rect(x - size, y - size * 0.7, size * 2, size * 0.7);
  ctx.fill();
  ctx.stroke();
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.rect(x + i * size * 0.7 - size * 0.18, y - size * 0.95, size * 0.36, size * 0.3);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(x - size * 0.25, y - size * 1.5, size * 0.5, size * 0.9);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.32, y - size * 1.5);
  ctx.lineTo(x, y - size * 1.95);
  ctx.lineTo(x + size * 0.32, y - size * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** A sea serpent: a wavy spine with a head and a forked tail. */
export function drawSerpent(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, ink: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, size * 0.16);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.quadraticCurveTo(-size * 0.5, -size * 0.7, 0, 0);
  ctx.quadraticCurveTo(size * 0.5, size * 0.7, size, 0);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(size * 1.05, 0, size * 0.22, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, size * 0.1);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(-size * 1.25, -size * 0.2);
  ctx.moveTo(-size, 0);
  ctx.lineTo(-size * 1.25, size * 0.2);
  ctx.stroke();
  ctx.restore();
}

/** A compass rose of alternating long and short points. */
export function drawRose(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink: string, gilt: string) {
  for (const [points, r, colour] of [[8, size, ink], [8, size * 0.55, gilt]] as const) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 === 0 ? r : r * 0.3;
      const a = (i / (points * 2)) * Math.PI * 2 + (points === 8 && r < size ? Math.PI / 8 : 0);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.72, 0, Math.PI * 2);
  ctx.stroke();
}

/** Flaked paint: bare ground showing through in soft patches. */
export function flake(ctx: CanvasRenderingContext2D, width: number, height: number, random: () => number, bare: string, count: number) {
  ctx.fillStyle = bare;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.5 + random() * 0.5;
    ctx.beginPath();
    ctx.ellipse(random() * width, random() * height, 6 + random() * 26, 4 + random() * 12, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
