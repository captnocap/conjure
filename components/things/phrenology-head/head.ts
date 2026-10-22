import * as THREE from 'three';
import { DEG, bump, lerp, placed, smooth } from './form';

/**
 * A bald human head in "head units": the braincase is about one unit in radius (roughly 90 mm),
 * the crown is at y = 0.9, the eyes near y = -0.15, the mouth near y = -0.8 and the chin near y = -1.3.
 * Longitude 0 is the middle of the face; the eyes sit at longitude ±24, latitude -9.
 */
export const HEAD_UNIT = 0.09;
export const EYE = { lon: 24, lat: -9 } as const;

export interface HeadOptions {
  /** 1 an ordinary nose; smaller flattens it. */
  nose?: number;
  /** The tip has been knocked off. */
  chipped?: boolean;
  /** 0 a closed mouth … 1 lips parted in an O. */
  gape?: number;
}

export function headShape(options: HeadOptions = {}) {
  const out = new THREE.Vector3();
  const noseScale = options.nose ?? 1, gape = options.gape ?? 0;
  return (d: THREE.Vector3, lon: number, lat: number) => {
    const front = smooth(-0.35, 0.45, d.z);
    const t = Math.max(0, -d.y);
    const ay = d.y >= 0 ? 0.9 : lerp(0.74, 1.42, front);
    const az = d.z < 0 ? 1.05 : 0.95;
    const n = 2 + 0.8 * front * smooth(0, 0.4, t);
    const yz = Math.pow(Math.pow(Math.abs(d.z) / az, n) + Math.pow(Math.abs(d.y) / ay, n), 2 / n);
    out.copy(d).multiplyScalar(1 / Math.sqrt((d.x / 0.8) ** 2 + yz));
    out.x *= 1 - 0.34 * smooth(0.3, 1, t) * front;
    const face = smooth(0, 0.3, d.z);
    if (face <= 0) return out;
    const x = lon * Math.cos(lat * DEG), ax = Math.abs(x);
    let h = 0;
    // Nose: a ridge that grows from the bridge to the tip, then tucks under.
    const u = (-6 - lat) / 28;
    let ridge = (0.05 + 0.27 * Math.pow(Math.max(0, u), 1.3)) * smooth(-0.2, 0.05, u) * smooth(1.12, 0.9, u);
    if (options.chipped) ridge = Math.min(ridge, 0.15 + 0.02 * Math.sin(lon * 1.7));
    h += noseScale * ridge * Math.exp(-((x / (4.2 + 5.2 * u * u)) ** 2));
    h += noseScale * 0.05 * Math.exp(-(((ax - 7.5) / 3.6) ** 2 + ((lat + 31) / 3.4) ** 2));
    // Eyes: a socket with the lidded ball inside it, under a brow.
    const ex = (ax - EYE.lon) * Math.cos(lat * DEG), ey = lat - EYE.lat;
    h -= 0.075 * Math.exp(-((ex / 11) ** 2 + (ey / 7.5) ** 2));
    h += 0.05 * Math.exp(-((ex / 6.5) ** 2 + (ey / 4.2) ** 2));
    h += 0.04 * bump(lat, 2.5, 5) * smooth(50, 30, ax);
    // Mouth, chin and cheekbones.
    const lip = smooth(18, 8, ax);
    h += 0.042 * Math.exp(-(((lat + 40.3 + gape * 1.4) / 2.2) ** 2)) * lip + 0.048 * Math.exp(-(((lat + 46 - gape * 1.6) / 2.5) ** 2)) * lip;
    h -= (0.022 + gape * 0.07) * Math.exp(-(((lat + 43.2) / (1.1 + gape * 1.8)) ** 2)) * smooth(15 - gape * 6, 5, ax);
    h -= 0.022 * Math.exp(-(((lat + 51) / 2.6) ** 2)) * lip;
    h += 0.055 * Math.exp(-(((lat + 58) / 7) ** 2)) * smooth(24, 8, ax);
    h += 0.03 * Math.exp(-(((ax - 42) / 14) ** 2 + ((lat + 20) / 12) ** 2));
    return out.addScaledVector(d, h * face);
  };
}

/** Both ears as loose geometry, ready to fuse. */
export function earParts(sides: readonly number[] = [-1, 1]) {
  const parts: THREE.BufferGeometry[] = [];
  for (const side of sides) {
    const rim = new THREE.TorusGeometry(0.15, 0.04, 7, 22, Math.PI * 1.5);
    rim.rotateZ(Math.PI * 0.42);
    rim.scale(1, 1.45, 1);
    rim.rotateY(Math.PI / 2);
    const turn = side * 0.2;
    for (const g of [
      rim,
      placed(new THREE.SphereGeometry(1, 12, 8), [0, 0, 0], [0.035, 0.2, 0.13]),
      placed(new THREE.SphereGeometry(1, 10, 8), [0, -0.21, 0.02], [0.04, 0.075, 0.06]),
    ]) {
      g.rotateY(turn);
      g.translate(side * 0.775, -0.2, -0.05);
      parts.push(g);
    }
  }
  return parts;
}

export interface FacePaint {
  eyes: 'blank' | 'open' | 'wide' | 'closed';
  iris?: string;
  line: string;
  white?: string;
  brows?: string | null;
  lips?: string | null;
  mouth?: 'neutral' | 'smile' | 'open';
  /** Paint only one side: -1 or 1. */
  only?: number;
}

/** Eyes, brows and lips, painted on a skin measured in degrees. */
export function paintFace(ctx: CanvasRenderingContext2D, paint: FacePaint) {
  const sides = paint.only ? [paint.only] : [-1, 1];
  ctx.lineCap = 'round';
  for (const side of sides) {
    const cx = side * EYE.lon, cy = EYE.lat;
    if (paint.eyes === 'open' || paint.eyes === 'wide') {
      const wide = paint.eyes === 'wide';
      const rx = wide ? 7 : 6.6, ry = wide ? 4.9 : 3.1;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = paint.white ?? '#f6f3ea'; ctx.fillRect(cx - 9, cy - 7, 18, 14);
      ctx.fillStyle = paint.iris ?? '#3d6fa3'; ctx.beginPath(); ctx.arc(cx, cy + (wide ? 0 : 0.5), wide ? 2.9 : 3.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0c0c10'; ctx.beginPath(); ctx.arc(cx, cy + (wide ? 0 : 0.5), wide ? 1.1 : 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = paint.line; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0.12, Math.PI - 0.12); ctx.stroke();
    } else if (paint.eyes === 'closed') {
      ctx.strokeStyle = paint.line; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(cx, cy + 1.6, 6.4, 3, 0, Math.PI + 0.2, Math.PI * 2 - 0.2); ctx.stroke();
      ctx.lineWidth = 0.6;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 2.3, cy - 1.2 + Math.abs(k) * 0.5); ctx.lineTo(cx + k * 2.8, cy - 3 + Math.abs(k) * 0.5); ctx.stroke(); }
    } else {
      ctx.strokeStyle = paint.line; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.ellipse(cx, cy, 6.4, 3.2, 0, 0.1, Math.PI - 0.1); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, 6.4, 2.6, 0, Math.PI + 0.3, Math.PI * 2 - 0.3); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (paint.brows) {
      const raise = paint.eyes === 'wide' ? 4.5 : 0;
      ctx.strokeStyle = paint.brows; ctx.lineWidth = 2.1;
      ctx.beginPath(); ctx.moveTo(side * 13, 0.5 + raise * 0.6); ctx.quadraticCurveTo(side * 25, 5.5 + raise, side * 36, 0.5 + raise * 0.5); ctx.stroke();
    }
  }
  if (paint.lips) {
    const mouth = paint.mouth ?? 'neutral';
    const curl = mouth === 'smile' ? 2.6 : 0;
    const from = paint.only === 1 ? 0 : -15, to = paint.only === -1 ? 0 : 15;
    ctx.save();
    ctx.beginPath(); ctx.rect(from, -60, to - from, 40); ctx.clip();
    ctx.fillStyle = paint.lips;
    ctx.beginPath();
    ctx.moveTo(-15, -43 + curl); ctx.quadraticCurveTo(-6, -37.2, -2, -38.6); ctx.lineTo(0, -39.4); ctx.lineTo(2, -38.6);
    ctx.quadraticCurveTo(6, -37.2, 15, -43 + curl); ctx.quadraticCurveTo(0, -52.5, -15, -43 + curl); ctx.fill();
    if (mouth === 'open') { ctx.fillStyle = '#2a0f12'; ctx.beginPath(); ctx.ellipse(0, -43.3, 6.5, 3.4, 0, 0, Math.PI * 2); ctx.fill(); }
    else {
      ctx.strokeStyle = paint.line; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-15, -43 + curl); ctx.quadraticCurveTo(0, -43.6 - curl * 0.5, 15, -43 + curl); ctx.stroke();
    }
    ctx.restore();
  }
}
