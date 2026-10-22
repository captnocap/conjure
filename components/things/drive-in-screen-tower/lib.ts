import * as THREE from 'three';

export type P3 = readonly [number, number, number];
export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** A locally painted canvas as a texture: no images, no fonts, no network. */
export function paintTexture(pxW: number, pxH: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(16, Math.round(pxW));
  canvas.height = Math.max(16, Math.round(pxH));
  draw(canvas.getContext('2d')!, canvas.width, canvas.height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

/** A flat plane carrying a painted canvas: signs, screens, menu boards, plates. */
export function painted(
  width: number,
  height: number,
  draw: Draw,
  options: { px?: number; glow?: number; roughness?: number; cutout?: boolean } = {},
) {
  const px = options.px ?? 384;
  const aspect = width / height;
  const map = paintTexture(aspect >= 1 ? px : px * aspect, aspect >= 1 ? px / aspect : px, draw);
  const material = new THREE.MeshStandardMaterial({ map, roughness: options.roughness ?? 0.8, side: THREE.DoubleSide });
  if (options.cutout) material.alphaTest = 0.5;
  if (options.glow) {
    material.emissive = new THREE.Color('#ffffff');
    material.emissiveMap = map;
    material.emissiveIntensity = options.glow;
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.receiveShadow = true;
  return mesh;
}

export function write(
  ctx: CanvasRenderingContext2D,
  words: string,
  x: number,
  y: number,
  size: number,
  colour: string,
  options: { font?: string; max?: number; tilt?: number; align?: CanvasTextAlign; outline?: string; face?: string } = {},
) {
  ctx.save();
  ctx.translate(x, y);
  if (options.tilt) ctx.rotate(options.tilt);
  ctx.font = `${options.font ?? 'bold'} ${size}px ${options.face ?? "'Arial Black', Impact, Arial, sans-serif"}`;
  ctx.textAlign = options.align ?? 'center';
  ctx.textBaseline = 'middle';
  if (options.outline) {
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = options.outline;
    ctx.lineJoin = 'round';
    ctx.strokeText(words, 0, 0, options.max);
  }
  ctx.fillStyle = colour;
  ctx.fillText(words, 0, 0, options.max);
  ctx.restore();
}

/** Speckle a canvas with grime, rust or stains; amount 0..1. */
export function grime(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, random: () => number, colour = '60,48,34') {
  const count = Math.round(amount * 90);
  for (let i = 0; i < count; i++) {
    const x = random() * w, y = random() * h, r = (0.01 + random() * 0.07) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${colour},${0.1 + random() * 0.25 * amount})`);
    g.addColorStop(1, `rgba(${colour},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < count / 3; i++) {
    const x = random() * w, y = random() * h * 0.6;
    ctx.fillStyle = `rgba(${colour},${0.08 + random() * 0.14})`;
    ctx.fillRect(x, y, 1 + random() * 3, (0.1 + random() * 0.4) * h);
  }
}

/** A box with rounded edges, centred on the origin. */
export function roundedBox(width: number, height: number, depth: number, radius: number, segments = 3) {
  const r = Math.min(radius, width / 2 - 1e-4, height / 2 - 1e-4);
  const w = width / 2 - r, h = height / 2 - r;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -height / 2);
  shape.lineTo(w, -height / 2);
  shape.absarc(w, -h, r, -Math.PI / 2, 0, false);
  shape.lineTo(width / 2, h);
  shape.absarc(w, h, r, 0, Math.PI / 2, false);
  shape.lineTo(-w, height / 2);
  shape.absarc(-w, h, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-width / 2, -h);
  shape.absarc(-w, -h, r, Math.PI, Math.PI * 1.5, false);
  const bevel = Math.min(r * 0.5, depth * 0.2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: segments });
  geometry.translate(0, 0, -(depth - bevel * 2) / 2);
  return geometry;
}

/** Points of a coiled cord sagging from one point to another. */
export function coil(from: P3, to: P3, turns: number, radius: number, sag: number): P3[] {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const axis = b.clone().sub(a).normalize();
  const side = new THREE.Vector3(0, 1, 0).cross(axis);
  if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
  side.normalize();
  const up = axis.clone().cross(side).normalize();
  const points: P3[] = [];
  const steps = Math.max(8, Math.round(turns * 8));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ease = Math.min(1, Math.min(t, 1 - t) * 8);
    const angle = t * turns * Math.PI * 2;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    p.addScaledVector(side, Math.cos(angle) * radius * ease).addScaledVector(up, Math.sin(angle) * radius * ease);
    points.push([p.x, p.y, p.z]);
  }
  return points;
}

export function tubeThrough(points: readonly P3[], radius: number, material: THREE.Material, radial = 6, perPoint = 3) {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, points.length * perPoint, radius, radial, false), material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Add a mesh to a parent with shadows on. */
export function put<T extends THREE.Object3D>(parent: THREE.Object3D, object: T, at: P3 = [0, 0, 0]): T {
  object.position.set(...at);
  object.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true;
  });
  parent.add(object);
  return object;
}

/** A see-through glow that measurement ignores. */
export function glowMaterial(colour: THREE.ColorRepresentation, opacity: number, additive = false) {
  return new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
}
