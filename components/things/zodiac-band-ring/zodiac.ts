/** The twelve astrological glyphs as stroke paths, drawn in a 100-unit box centred on the origin. */
export const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'] as const;
export const SIGN_NAMES: Record<(typeof SIGNS)[number], string> = {
  aries: 'ARIES', taurus: 'TAVRVS', gemini: 'GEMINI', cancer: 'CANCER', leo: 'LEO', virgo: 'VIRGO',
  libra: 'LIBRA', scorpio: 'SCORPIVS', sagittarius: 'SAGITTARIVS', capricorn: 'CAPRICORNVS', aquarius: 'AQVARIVS', pisces: 'PISCES',
};

/** Draw one glyph, stroking as it goes. The caller sets the stroke style, width and transform. */
export function drawSign(ctx: CanvasRenderingContext2D, sign: (typeof SIGNS)[number]) {
  const p = ctx;
  p.lineCap = 'round';
  p.lineJoin = 'round';
  p.beginPath();
  switch (sign) {
    case 'aries':
      p.moveTo(-30, -6); p.quadraticCurveTo(-32, -40, -8, -34); p.quadraticCurveTo(0, -28, 0, -6); p.lineTo(0, 34);
      p.moveTo(30, -6); p.quadraticCurveTo(32, -40, 8, -34); p.quadraticCurveTo(0, -28, 0, -6);
      break;
    case 'taurus':
      p.arc(0, 12, 20, 0, Math.PI * 2);
      p.moveTo(-20, -34); p.arc(0, -30, 20, Math.PI, 0, true);
      break;
    case 'gemini':
      p.moveTo(-14, -24); p.lineTo(-14, 24); p.moveTo(14, -24); p.lineTo(14, 24);
      p.moveTo(-30, -30); p.quadraticCurveTo(0, -42, 30, -30);
      p.moveTo(-30, 30); p.quadraticCurveTo(0, 42, 30, 30);
      break;
    case 'cancer':
      p.moveTo(-9, 12); p.arc(-18, 12, 9, 0, Math.PI * 2);
      p.moveTo(27, -12); p.arc(18, -12, 9, 0, Math.PI * 2);
      p.moveTo(-30, -6); p.quadraticCurveTo(-8, -34, 30, -22);
      p.moveTo(30, 6); p.quadraticCurveTo(8, 34, -30, 22);
      break;
    case 'leo':
      p.moveTo(-12, 16); p.arc(-20, 16, 8, 0, Math.PI * 2);
      p.moveTo(-12, 16); p.quadraticCurveTo(-10, -34, 10, -24); p.quadraticCurveTo(30, -12, 14, 18); p.quadraticCurveTo(10, 34, 26, 32);
      break;
    case 'virgo':
      p.moveTo(-34, 28); p.lineTo(-34, -14); p.quadraticCurveTo(-25, -32, -16, -14); p.lineTo(-16, 28);
      p.moveTo(-16, -14); p.quadraticCurveTo(-7, -32, 2, -14); p.lineTo(2, 14); p.quadraticCurveTo(8, 36, 30, 22);
      p.moveTo(2, 14); p.quadraticCurveTo(20, 2, 30, 22); p.quadraticCurveTo(26, 38, 12, 38);
      break;
    case 'libra':
      p.moveTo(-14, 14); p.lineTo(-32, 14); p.moveTo(14, 14); p.lineTo(32, 14);
      p.moveTo(-14, 14); p.arc(0, 0, 20, 0.78 * Math.PI, 2.22 * Math.PI);
      p.moveTo(-32, 32); p.lineTo(32, 32);
      break;
    case 'scorpio':
      p.moveTo(-34, 24); p.lineTo(-34, -16); p.quadraticCurveTo(-25, -34, -16, -16); p.lineTo(-16, 24);
      p.moveTo(-16, -16); p.quadraticCurveTo(-7, -34, 2, -16); p.lineTo(2, 14); p.quadraticCurveTo(6, 30, 26, 28);
      p.moveTo(18, 18); p.lineTo(30, 28); p.lineTo(20, 38);
      break;
    case 'sagittarius':
      p.moveTo(-26, 26); p.lineTo(26, -26); p.moveTo(2, -26); p.lineTo(26, -26); p.lineTo(26, -2);
      p.moveTo(-22, 0); p.lineTo(0, 22);
      break;
    case 'capricorn':
      p.moveTo(-32, -18); p.lineTo(-18, 22); p.lineTo(-2, -22); p.lineTo(8, 16);
      p.quadraticCurveTo(12, 36, 26, 30); p.quadraticCurveTo(38, 22, 26, 12); p.quadraticCurveTo(14, 6, 10, 20);
      break;
    case 'aquarius':
      for (const y of [-8, 12]) {
        p.moveTo(-34, y); p.lineTo(-22, y - 12); p.lineTo(-10, y); p.lineTo(2, y - 12); p.lineTo(14, y); p.lineTo(26, y - 12); p.lineTo(34, y - 4);
      }
      break;
    case 'pisces':
      p.moveTo(-36 + 28 * Math.cos(-0.32 * Math.PI), 28 * Math.sin(-0.32 * Math.PI)); p.arc(-36, 0, 28, -0.32 * Math.PI, 0.32 * Math.PI);
      p.moveTo(36 + 28 * Math.cos(0.68 * Math.PI), 28 * Math.sin(0.68 * Math.PI)); p.arc(36, 0, 28, 0.68 * Math.PI, 1.32 * Math.PI);
      p.moveTo(-22, 0); p.lineTo(22, 0);
      break;
  }
  p.stroke();
}

/** A small four-pointed star. */
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

/** Faint woven grain over a painted ground, so the band reads as canvas rather than plastic. */
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
