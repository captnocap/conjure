import * as THREE from 'three';

export type Ctx = CanvasRenderingContext2D;

/** A canvas-painted colour texture. */
export function paint(width: number, height: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export const shade = (colour: string, amount: number) => {
  const c = new THREE.Color(colour);
  if (amount < 0) c.multiplyScalar(1 + amount);
  else c.lerp(new THREE.Color('#ffffff'), amount);
  return `#${c.getHexString()}`;
};

/** Vertical steel corrugation over a flat fill. */
export function corrugate(ctx: Ctx, w: number, h: number, colour: string, ribs: number) {
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
  const step = w / ribs;
  for (let i = 0; i < ribs; i++) {
    ctx.fillStyle = shade(colour, -0.2);
    ctx.fillRect(i * step, 0, step * 0.28, h);
    ctx.fillStyle = shade(colour, 0.14);
    ctx.fillRect(i * step + step * 0.5, 0, step * 0.2, h);
  }
}

/** Rust and dirt running down a painted face. amount 0..1. */
export function weather(ctx: Ctx, w: number, h: number, random: () => number, amount: number, rust = '#7a3b1c') {
  const count = Math.round(amount * amount * 60);
  for (let i = 0; i < count; i++) {
    const x = random() * w, y = random() * h * 0.7, length = (0.15 + random() * 0.6) * h * amount, width = 1.5 + random() * w * 0.007;
    const fade = ctx.createLinearGradient(0, y, 0, y + length);
    fade.addColorStop(0, rust);
    fade.addColorStop(1, 'rgba(90,50,25,0)');
    ctx.globalAlpha = 0.35 + random() * 0.45;
    ctx.fillStyle = fade;
    ctx.fillRect(x, y, width, length);
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y, width * (0.7 + random() * 0.7), width * (0.4 + random() * 0.4), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const grime = ctx.createLinearGradient(0, h * 0.6, 0, h);
  grime.addColorStop(0, 'rgba(40,34,28,0)');
  grime.addColorStop(1, `rgba(40,34,28,${0.12 + amount * 0.5})`);
  ctx.fillStyle = grime;
  ctx.fillRect(0, 0, w, h);
}

export function write(ctx: Ctx, text: string, x: number, y: number, size: number, colour: string, font = 'bold SIZEpx sans-serif', maxWidth?: number) {
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font.replace('SIZE', String(Math.round(size)));
  ctx.fillText(text, x, y, maxWidth);
}

/** Black and yellow hazard chevrons. */
export function chevrons(ctx: Ctx, w: number, h: number, a = '#f2c21a', b = '#1b1b1b') {
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = b;
  const step = h * 0.9;
  for (let x = -h; x < w + h; x += step * 2) {
    ctx.beginPath();
    ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.lineTo(x + h + step, 0); ctx.lineTo(x + step, h);
    ctx.fill();
  }
}

/** A material that glows on its own; reads as a lamp in every print. */
export const lamp = (colour: THREE.ColorRepresentation, intensity = 1.4) =>
  new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: intensity, roughness: 0.4 });

/** A soft see-through halo round a lamp. Ignored when the object is measured. */
export const halo = (colour: THREE.ColorRepresentation, opacity = 0.16) =>
  new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false });

/** A painted plane or box face material. */
export const skin = (map: THREE.Texture, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ map, roughness: 0.75, ...options });
