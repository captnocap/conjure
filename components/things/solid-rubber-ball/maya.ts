import * as THREE from 'three';

/** Shared painting helpers for the ball-court set. Copied into each component folder. */
export type Rand = () => number;
type Ctx = CanvasRenderingContext2D;

export const PAINT = {
  red: '#b4392a',
  blue: '#3b9ea8',
  ochre: '#d8a43a',
  cream: '#e9dcbd',
  green: '#3f9160',
  black: '#2b2522',
} as const;

export const lerpHex = (from: string, to: string, amount: number) =>
  '#' + new THREE.Color(from).lerp(new THREE.Color(to), Math.min(1, Math.max(0, amount))).getHexString();

/** Fresh lime stucco at wear 0, grey weathered limestone at wear 1. */
export const stoneTone = (wear: number) => lerpHex('#dccfb2', '#8d8c7e', wear);

export function paintCanvas(width: number, height: number, draw: (ctx: Ctx, width: number, height: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Mottled masonry: speckle, optional coursed joints, then lichen, moss, streaks and cracks by wear. */
export function stone(ctx: Ctx, w: number, h: number, random: Rand, options: { base: string; wear: number; course?: number; block?: number }) {
  const { base, wear, course = 0, block = 0 } = options;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(40,32,22,0.07)' : 'rgba(255,250,235,0.08)';
    const size = 3 + random() * 16;
    ctx.fillRect(random() * w, random() * h, size, size * (0.4 + random()));
  }
  if (course > 0) {
    ctx.strokeStyle = 'rgba(45,36,26,0.5)';
    ctx.lineWidth = 2;
    for (let y = 0, row = 0; y < h; y += course, row++) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      const step = block || course * 2;
      for (let x = (row % 2) * step * 0.5 + random() * 8; x < w; x += step * (0.8 + random() * 0.4)) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + course); ctx.stroke();
      }
    }
  }
  weather(ctx, w, h, random, wear);
}

export function weather(ctx: Ctx, w: number, h: number, random: Rand, wear: number) {
  if (wear < 0.25) return;
  const amount = (wear - 0.25) / 0.75;
  for (let i = 0; i < amount * 14; i++) {
    const x = random() * w, length = h * (0.2 + random() * 0.6);
    const streak = ctx.createLinearGradient(0, 0, 0, length);
    streak.addColorStop(0, 'rgba(30,34,26,0.45)');
    streak.addColorStop(1, 'rgba(30,34,26,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(x, 0, 6 + random() * 22, length);
  }
  for (let i = 0; i < amount * 70; i++) {
    const pale = random() < 0.6;
    ctx.fillStyle = pale ? `rgba(196,204,176,${0.35 + random() * 0.3})` : `rgba(206,150,52,${0.3 + random() * 0.3})`;
    const x = random() * w, y = random() * h, r = 4 + random() * 16;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + (random() - 0.5) * r * 2, y + (random() - 0.5) * r * 2, r * (0.4 + random() * 0.6), 0, 7); ctx.fill(); }
  }
  for (let i = 0; i < amount * 60; i++) {
    ctx.fillStyle = `rgba(${52 + random() * 26},${84 + random() * 30},${40 + random() * 14},${0.4 + random() * 0.4})`;
    const x = random() * w, y = h - random() * random() * h, r = 5 + random() * 15;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + (random() - 0.5) * r * 2.4, y + (random() - 0.5) * r, r * (0.3 + random() * 0.6), 0, 7); ctx.fill(); }
  }
  ctx.strokeStyle = 'rgba(28,24,20,0.75)';
  for (let i = 0; i < amount * 4; i++) {
    let x = random() * w, y = random() * h * 0.3;
    ctx.lineWidth = 1.5 + random() * 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 9; k++) { x += (random() - 0.5) * w * 0.12; y += h * 0.09 * random(); ctx.lineTo(x, y); }
    ctx.stroke();
  }
}

/** One glyph block: a rounded cartouche holding a few bars, dots, curls or a profile. */
export function glyph(ctx: Ctx, x: number, y: number, size: number, random: Rand, ink: string, fill?: string) {
  const r = size * 0.22;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.roundRect(x + size * 0.06, y + size * 0.06, size * 0.88, size * 0.88, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.stroke();
  ctx.fillStyle = ink;
  const kind = Math.floor(random() * 5);
  const cx = x + size / 2, cy = y + size / 2;
  if (kind === 0) {
    ctx.beginPath(); ctx.arc(cx, cy - size * 0.05, size * 0.22, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - size * 0.05, size * 0.07, 0, 7); ctx.fill();
    ctx.fillRect(x + size * 0.22, y + size * 0.72, size * 0.56, size * 0.07);
  } else if (kind === 1) {
    for (let i = 0; i < 3; i++) ctx.fillRect(x + size * 0.2, y + size * (0.24 + i * 0.2), size * 0.6, size * 0.09);
  } else if (kind === 2) {
    ctx.beginPath(); ctx.arc(cx - size * 0.05, cy, size * 0.25, 0.4, 5.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + size * 0.05, cy + size * 0.02, size * 0.1, 0, 5); ctx.stroke();
  } else if (kind === 3) {
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + size * (0.28 + i * 0.22), y + size * 0.3, size * 0.07, 0, 7); ctx.fill(); }
    ctx.fillRect(x + size * 0.2, y + size * 0.48, size * 0.6, size * 0.09);
    ctx.fillRect(x + size * 0.2, y + size * 0.66, size * 0.6, size * 0.09);
  } else {
    ctx.beginPath(); ctx.moveTo(x + size * 0.25, y + size * 0.75); ctx.quadraticCurveTo(x + size * 0.2, y + size * 0.2, cx + size * 0.1, y + size * 0.22);
    ctx.quadraticCurveTo(x + size * 0.85, y + size * 0.45, cx + size * 0.05, y + size * 0.55); ctx.lineTo(x + size * 0.7, y + size * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, y + size * 0.36, size * 0.05, 0, 7); ctx.fill();
  }
}

/** A stepped-fret (xicalcoliuhqui) band, the border pattern of painted Mesoamerican walls. */
export function fret(ctx: Ctx, x: number, y: number, w: number, h: number, ink: string) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2, h * 0.12);
  const unit = h * 1.5;
  for (let at = x; at < x + w - unit * 0.5; at += unit) {
    ctx.beginPath();
    ctx.moveTo(at, y + h * 0.85); ctx.lineTo(at, y + h * 0.15); ctx.lineTo(at + unit * 0.7, y + h * 0.15);
    ctx.lineTo(at + unit * 0.7, y + h * 0.62); ctx.lineTo(at + unit * 0.35, y + h * 0.62); ctx.lineTo(at + unit * 0.35, y + h * 0.4);
    ctx.stroke();
  }
}

export function textured(texture: THREE.Texture, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: 1.2, roughness: 0.88, ...options });
}

/** A leaf blade for ferns, plumes and vines: a flat pointed strip from the origin along +y, bending toward +z. */
export function bladeGeometry(length: number, width: number, bend: number, segments = 6) {
  const positions: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const half = width * 0.5 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)) * (1 - t * 0.35);
    const angle = bend * t;
    const y = length * (bend === 0 ? t : Math.sin(angle) / bend), z = length * (bend === 0 ? 0 : (1 - Math.cos(angle)) / bend);
    positions.push(-half, y, z, half, y, z);
    if (i < segments) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A tuft of fern or weed blades as one instanced mesh, rooted at a point. */
export function tuft(random: Rand, at: readonly [number, number, number], size: number, colour: string, count = 9) {
  const material = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(bladeGeometry(1, 0.22, 1.5), material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(...at);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.rotateX(0.15 + random() * 0.7);
    dummy.scale.setScalar(size * (0.6 + random() * 0.7));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/**
 * A straight run of masonry with a constant cross-section: `profile` is a closed loop of [z, y]
 * points, swept along x for `width` metres and centred on x = 0. UVs are in metres times `uv`.
 */
export function prism(profile: readonly (readonly [number, number])[], width: number, uv = 0.4) {
  const positions: number[] = [], uvs: number[] = [];
  const half = width / 2;
  let run = 0;
  for (let i = 0; i < profile.length; i++) {
    const [z0, y0] = profile[i], [z1, y1] = profile[(i + 1) % profile.length];
    const length = Math.hypot(z1 - z0, y1 - y0);
    const quad = [[-half, y0, z0, -half * uv, run * uv], [half, y0, z0, half * uv, run * uv], [half, y1, z1, half * uv, (run + length) * uv], [-half, y1, z1, -half * uv, (run + length) * uv]];
    for (const index of [0, 1, 2, 0, 2, 3]) { positions.push(quad[index][0], quad[index][1], quad[index][2]); uvs.push(quad[index][3], quad[index][4]); }
    run += length;
  }
  const outline = profile.map(([z, y]) => new THREE.Vector2(z, y));
  for (const face of THREE.ShapeUtils.triangulateShape(outline, []))
    for (const x of [-half, half])
      for (const index of face) { positions.push(x, profile[index][1], profile[index][0]); uvs.push(profile[index][0] * uv, profile[index][1] * uv); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}
