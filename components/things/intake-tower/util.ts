import * as THREE from 'three';

export type P2 = readonly [number, number];

/** Extrude a side profile given as [z, y] pairs across a width in x, centred on x = 0. */
export function extrudeX(profile: readonly P2[], width: number) {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(-z, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 4 });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-width / 2, 0, 0);
  return geometry;
}

/** Extrude a plan outline given as [x, z] pairs upward from y = 0. */
export function extrudeY(profile: readonly P2[], height: number) {
  const shape = new THREE.Shape(profile.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 4 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** A ribbon lying on a polyline surface ([z, y] pairs), lifted by a thickness. */
export function ribbon(surface: readonly P2[], thickness: number | ((index: number) => number), width: number) {
  const t = (index: number) => (typeof thickness === 'number' ? thickness : thickness(index));
  const top = surface.map(([z, y], index) => [z, y + t(index)] as P2).reverse();
  return extrudeX([...surface, ...top], width);
}

/** Board-marked, weather-streaked concrete painted on a canvas. Tiles every `span` metres on extrusions. */
export function concrete(random: () => number, wear: number, tone = '#b9b5a8', span = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 3);
  }
  ctx.fillStyle = 'rgba(40,36,30,0.16)';
  for (let y = 0; y < 256; y += 51) ctx.fillRect(0, y, 256, 2);
  const streaks = Math.round(4 + wear * 26);
  for (let i = 0; i < streaks; i++) {
    const x = random() * 256, w = 2 + random() * 9, h = 60 + random() * 190;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const dark = random() > 0.3;
    g.addColorStop(0, dark ? `rgba(38,34,26,${0.18 + wear * 0.3})` : 'rgba(245,242,230,0.3)');
    g.addColorStop(1, 'rgba(40,36,28,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / span, 1 / span);
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
}

export interface PlateOptions {
  ink?: string;
  paper?: string;
  border?: string;
  font?: string;
  /** Relative size of each line; defaults to 1 for all. */
  sizes?: readonly number[];
  paint?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  emissive?: number;
}

/** A painted sign or plaque with several lines of lettering. Returns a plane facing +z. */
export function plate(lines: readonly string[], width: number, height: number, options: PlateOptions = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(48, Math.round((512 * height) / width));
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = options.paper ?? '#f3ecd6';
  ctx.fillRect(0, 0, W, H);
  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.lineWidth = Math.max(6, W * 0.025);
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, W - ctx.lineWidth * 2, H - ctx.lineWidth * 2);
  }
  options.paint?.(ctx, W, H);
  ctx.fillStyle = options.ink ?? '#1f2326';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const sizes = lines.map((_line, index) => options.sizes?.[index] ?? 1);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  let y = H * 0.1;
  lines.forEach((line, index) => {
    const band = (H * 0.8 * sizes[index]) / total;
    const size = Math.min(band * 0.78, (W * 0.86 * 1.7) / Math.max(line.length, 1));
    ctx.font = `bold ${size}px ${options.font ?? 'sans-serif'}`;
    ctx.fillText(line, W / 2, y + band / 2, W * 0.88);
    y += band;
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide });
  if (options.emissive) {
    material.emissive = new THREE.Color('#ffffff');
    material.emissiveMap = texture;
    material.emissiveIntensity = options.emissive;
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** How strongly lamps should glow: bright at dawn and dusk, faint at noon. */
export const lampGlow = (daylight: number) => 0.15 + Math.min(1, Math.abs(daylight - 0.5) * 2.4) * 1.6;
