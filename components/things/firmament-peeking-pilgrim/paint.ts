import * as THREE from 'three';

type Ctx = CanvasRenderingContext2D;

/**
 * A band of a sphere (|z| <= half) arching from the ground on the right, over the top, to the
 * ground on the left. Normals point outward, uv runs along the arch (u) and across the band (v).
 */
export function shellGeometry(R: number, cx: number, cy: number, half: number, segU: number, segV: number) {
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], index: number[] = [];
  for (let j = 0; j <= segV; j++) {
    const z = -half + (2 * half * j) / segV;
    const r = Math.sqrt(R * R - z * z);
    const u0 = Math.asin(Math.max(-1, Math.min(1, -cy / r)));
    for (let i = 0; i <= segU; i++) {
      const u = u0 + (Math.PI - 2 * u0) * (i / segU);
      const x = cx + r * Math.cos(u), y = cy + r * Math.sin(u);
      positions.push(x, Math.max(0, y), z);
      normals.push((x - cx) / R, (y - cy) / R, z / R);
      uvs.push(i / segU, j / segV);
    }
  }
  for (let j = 0; j < segV; j++)
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i, b = a + 1, c = a + segU + 1, d = c + 1;
      index.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  return geometry;
}

/** An eight-pointed star in the current fill. */
export function drawStar(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.38 : k % 4 ? r * 0.7 : r;
    ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** A sun or a full moon with a calm painted face. */
export function drawFace(ctx: Ctx, x: number, y: number, r: number, fill: string, ink: string, sun: boolean) {
  ctx.save();
  if (sun) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let k = 0; k < 32; k++) {
      const t = (k / 32) * Math.PI * 2, rr = k % 2 ? r * 1.15 : r * 1.55;
      ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = r * 0.06;
  ctx.stroke();
  ctx.fillStyle = ink;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + side * r * 0.35, y - r * 0.15, r * 0.1, r * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(x, y - r * 0.1); ctx.lineTo(x - r * 0.08, y + r * 0.22); ctx.lineTo(x + r * 0.05, y + r * 0.22); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y + r * 0.3, r * 0.28, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  ctx.restore();
}

/** Diagonal engraver's hatching over the whole sheet. */
export function hatch(ctx: Ctx, w: number, h: number, ink: string, alpha: number, spacing: number) {
  ctx.save();
  ctx.strokeStyle = ink; ctx.globalAlpha = alpha; ctx.lineWidth = 1.4;
  for (let k = -h; k < w; k += spacing) { ctx.beginPath(); ctx.moveTo(k, h); ctx.lineTo(k + h, 0); ctx.stroke(); }
  ctx.restore();
}

/** Branching cracks running out from a point. `reach` 0..1 scales how far they spread. */
export function drawCrack(ctx: Ctx, x: number, y: number, reach: number, random: () => number, colour: string, width: number) {
  ctx.save();
  ctx.strokeStyle = colour; ctx.lineCap = 'round';
  const branch = (px: number, py: number, angle: number, length: number, w: number, depth: number) => {
    let cx = px, cy = py, a = angle;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    const steps = 6;
    for (let k = 0; k < steps; k++) {
      a += (random() - 0.5) * 0.9;
      cx += Math.cos(a) * (length / steps); cy += Math.sin(a) * (length / steps);
      ctx.lineTo(cx, cy);
      if (depth < 2 && random() < 0.3) {
        ctx.stroke();
        branch(cx, cy, a + (random() < 0.5 ? 0.8 : -0.8), length * 0.5, w * 0.6, depth + 1);
        ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy);
      }
    }
    ctx.stroke();
  };
  const arms = 6 + Math.floor(random() * 4);
  for (let i = 0; i < arms; i++) branch(x, y, (i / arms) * Math.PI * 2 + random() * 0.5, (120 + random() * 220) * Math.max(0.3, reach), width, 0);
  ctx.restore();
}
