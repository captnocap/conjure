import * as THREE from 'three';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** A canvas-painted texture: everything is drawn here, no fonts or images are fetched. */
export function paint(width: number, height: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function stencil(ctx: Ctx, text: string, x: number, y: number, size: number, colour: string, maxWidth?: number, font = 'sans-serif') {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(size)}px ${font}`;
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

export type SignKind = 'magnet' | 'pacemaker' | 'metal' | 'ears' | 'watch';

/** A workplace safety sign: a pictogram over a caption. */
export function safetySign(kind: SignKind, caption: string) {
  return paint(200, 260, (ctx, w) => {
    ctx.fillStyle = '#f7f4ea'; ctx.fillRect(0, 0, w, 260);
    ctx.strokeStyle = '#1d1d1b'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, w - 4, 256);
    const cx = w / 2, cy = 98, r = 70;
    if (kind === 'magnet') {
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r * 0.78); ctx.lineTo(cx - r, cy + r * 0.78); ctx.closePath();
      ctx.fillStyle = '#f2c230'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.stroke();
      ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy + 6, 19, Math.PI, 0); ctx.lineTo(cx + 19, cy + 36); ctx.moveTo(cx - 19, cy + 6); ctx.lineTo(cx - 19, cy + 36); ctx.stroke();
      ctx.lineWidth = 3;
      for (const k of [1, 2]) { ctx.beginPath(); ctx.arc(cx, cy + 36, 8 + k * 9, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke(); }
    } else if (kind === 'ears') {
      ctx.fillStyle = '#2361a8'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy + 6, 27, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy + 4, 42, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.fillRect(cx - 52, cy - 10, 17, 36); ctx.fillRect(cx + 35, cy - 10, 17, 36);
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1d1d1b'; ctx.strokeStyle = '#1d1d1b';
      if (kind === 'pacemaker') {
        ctx.beginPath(); ctx.moveTo(cx, cy + 28); ctx.bezierCurveTo(cx - 46, cy - 4, cx - 22, cy - 40, cx, cy - 16); ctx.bezierCurveTo(cx + 22, cy - 40, cx + 46, cy - 4, cx, cy + 28); ctx.fill();
      } else if (kind === 'metal') {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.75);
        ctx.fillRect(-6, -18, 12, 52); ctx.beginPath(); ctx.arc(0, -26, 16, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(-6, -46, 12, 20); ctx.restore();
      } else {
        ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, TAU); ctx.stroke();
        ctx.fillRect(cx - 11, cy - 46, 22, 22); ctx.fillRect(cx - 11, cy + 24, 22, 22);
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 12); ctx.moveTo(cx, cy); ctx.lineTo(cx + 9, cy + 4); ctx.stroke();
      }
      ctx.strokeStyle = '#c8261e'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.arc(cx, cy, r - 7, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - (r - 7) * 0.7, cy - (r - 7) * 0.7); ctx.lineTo(cx + (r - 7) * 0.7, cy + (r - 7) * 0.7); ctx.stroke();
    }
    const lines = caption.split('\n');
    lines.forEach((line, i) => stencil(ctx, line, cx, 204 + i * 27 - (lines.length - 1) * 13, 22, '#1d1d1b', w - 18));
  });
}

/** A blackboard of field equations, with a chalk frog. */
export function blackboard(random: () => number, wear: number) {
  return paint(1024, 340, (ctx, w, h) => {
    ctx.fillStyle = '#26352d'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 10 + wear * 30; i++) {
      ctx.fillStyle = `rgba(230,236,226,${0.025 + random() * 0.04})`;
      ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 40 + random() * 120, 14 + random() * 40, random() * 3, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(240,240,228,0.9)'; ctx.strokeStyle = 'rgba(240,240,228,0.9)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const lines = ['B = μ₀ n I', 'F = (χ V / μ₀) B ∇B', 'χ(water) ≈ −9 × 10⁻⁶', 'B∇B > 1400 T²/m  →  it floats'];
    lines.forEach((line, i) => { ctx.font = `italic ${i === 3 ? 34 : 40}px serif`; ctx.fillText(line, 34 + random() * 10, 50 + i * 74); });
    // The frog, mid-air over a coil.
    const fx = 830, fy = 130;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(fx, fy, 52, 34, 0, 0, TAU); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(fx + s * 26, fy - 36, 13, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx + s * 26, fy - 36, 3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx + s * 40, fy + 20); ctx.lineTo(fx + s * 78, fy + 44); ctx.lineTo(fx + s * 66, fy + 70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx + s * 30, fy + 26); ctx.lineTo(fx + s * 36, fy + 56); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(fx, fy - 6, 18, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(fx, fy + 150, 90, 22, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(fx, fy + 150, 30, 8, 0, 0, TAU); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx + s * 110, fy + 130); ctx.lineTo(fx + s * 110, fy - 10); ctx.lineTo(fx + s * 100, fy + 6); ctx.moveTo(fx + s * 110, fy - 10); ctx.lineTo(fx + s * 120, fy + 6); ctx.stroke(); }
    ctx.font = 'italic 34px serif'; ctx.fillText('?!', fx + 70, fy - 50);
    ctx.font = 'italic 28px serif'; ctx.fillText('16 T', fx - 40, fy + 196);
    ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, w - 14, h - 14);
  });
}

/** A poster of the frog that flew. */
export function frogPoster() {
  return paint(360, 460, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#162a4a'); g.addColorStop(1, '#0d1626');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const halo = ctx.createRadialGradient(cx, 230, 10, cx, 230, 150); halo.addColorStop(0, 'rgba(140,220,255,0.45)'); halo.addColorStop(1, 'rgba(140,220,255,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 60, w, 340);
    ctx.fillStyle = '#c0703c'; ctx.beginPath(); ctx.ellipse(cx, 368, 120, 30, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0d1626'; ctx.beginPath(); ctx.ellipse(cx, 362, 40, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6cc04a';
    ctx.beginPath(); ctx.ellipse(cx, 230, 56, 38, 0, 0, TAU); ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(cx + s * 26, 192, 14, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#6cc04a'; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + s * 40, 250); ctx.lineTo(cx + s * 88, 276); ctx.lineTo(cx + s * 76, 312); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + s * 30, 258); ctx.lineTo(cx + s * 38, 296); ctx.stroke();
    }
    ctx.fillStyle = '#10200e'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * 26, 190, 5, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx + s * (70 + i * 14), 300 + i * 6); ctx.lineTo(cx + s * (70 + i * 14), 330 + i * 6); ctx.stroke(); }
    stencil(ctx, 'IT FLEW', cx, 70, 66, '#ffd23a', w - 30);
    stencil(ctx, 'DIAMAGNETIC LEVITATION', cx, 118, 20, '#e8eef6', w - 30);
    stencil(ctx, 'NIJMEGEN · 1997 · 16 T', cx, 428, 22, '#e8eef6', w - 30);
  });
}

/** A yellowing newspaper clipping. */
export function clipping(headline: string, random: () => number) {
  return paint(240, 300, (ctx, w, h) => {
    ctx.fillStyle = '#efe6cc'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d1d1b'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '900 24px serif';
    const words = headline.split(' ');
    let line = '', y = 12;
    for (const word of words) {
      if (ctx.measureText(`${line} ${word}`).width > w - 24 && line) { ctx.fillText(line, 12, y); y += 28; line = word; } else line = line ? `${line} ${word}` : word;
    }
    ctx.fillText(line, 12, y); y += 38;
    ctx.fillStyle = '#9a9a92'; ctx.fillRect(12, y, w * 0.48, 90);
    ctx.fillStyle = '#5c9a40'; ctx.beginPath(); ctx.ellipse(12 + w * 0.24, y + 44, 22, 15, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(30,30,30,0.55)';
    for (let i = 0; i < 16; i++) ctx.fillRect(i < 6 ? w * 0.56 : 12, y + 4 + i * 11 - (i < 6 ? 0 : 0), (i < 6 ? w * 0.38 : w - 24) * (0.6 + random() * 0.4), 4);
  });
}

/** A tool pegboard with painted outlines, almost every tool gone (to the magnet). */
export function pegboard(random: () => number) {
  return paint(900, 360, (ctx, w, h) => {
    ctx.fillStyle = '#b48c5a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(60,40,20,0.55)';
    for (let y = 14; y < h; y += 22) for (let x = 14; x < w; x += 22) { ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
    stencil(ctx, 'RETURN TOOLS HERE — NOT TO THE MAGNET', w / 2, 30, 30, '#b3261e', w - 40);
    const outline = (draw: () => void, present: boolean) => {
      ctx.save(); ctx.fillStyle = present ? '#3b3f42' : 'rgba(250,250,245,0.9)'; ctx.strokeStyle = present ? '#3b3f42' : 'rgba(250,250,245,0.9)'; draw(); ctx.restore();
    };
    const spots = 9, present = Math.floor(random() * spots);
    for (let i = 0; i < spots; i++) {
      const x = 60 + i * 95, y = 200, kind = i % 4, here = i === present;
      outline(() => {
        ctx.translate(x, y);
        if (kind === 0) { ctx.fillRect(-7, -70, 14, 120); ctx.beginPath(); ctx.arc(0, -78, 20, 0, TAU); ctx.fill(); }
        else if (kind === 1) { ctx.fillRect(-6, -40, 12, 110); ctx.fillRect(-36, -64, 72, 26); }
        else if (kind === 2) { ctx.fillRect(-5, -80, 10, 70); ctx.fillRect(-11, -10, 22, 80); }
        else { ctx.rotate(0.14); ctx.fillRect(-14, -70, 9, 120); ctx.rotate(-0.28); ctx.fillRect(5, -70, 9, 120); }
      }, here);
    }
    ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
  });
}

/** A blue engineering drawing of a Bitter plate. */
export function blueprint(title: string, random: () => number) {
  return paint(420, 300, (ctx, w, h) => {
    ctx.fillStyle = '#28538f'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(235,242,255,0.85)'; ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    const cx = 140, cy = 140;
    for (const r of [24, 110]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 18 + ring * 6; i++) {
      const a = (i / (18 + ring * 6)) * TAU, r = 42 + ring * 22;
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5, 2, a, 0, TAU); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx - 110, cy + 125); ctx.lineTo(cx + 110, cy + 125); ctx.stroke();
    ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx, 270); ctx.moveTo(20, cy); ctx.lineTo(260, cy); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 9; i++) ctx.strokeRect(290, 30 + i * 16, 100, 8 + random() * 4);
    ctx.strokeRect(280, 200, 120, 80);
    ctx.fillStyle = 'rgba(235,242,255,0.9)'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText(title, 340, 230, 110); ctx.fillText('REV C', 340, 256);
  });
}

export function clockFace() {
  return paint(128, 128, (ctx) => {
    ctx.fillStyle = '#1d1d1b'; ctx.beginPath(); ctx.arc(64, 64, 63, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f5f2e8'; ctx.beginPath(); ctx.arc(64, 64, 56, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1d1d1b';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.lineWidth = i % 3 ? 2 : 4; ctx.beginPath(); ctx.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); ctx.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54); ctx.stroke(); }
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + 26, 64 - 14); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 - 8, 64 - 44); ctx.stroke();
  });
}
