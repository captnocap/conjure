import * as THREE from 'three';

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
type Point = readonly [number, number, number];

/** A flat plane carrying a locally painted canvas: signs, panels, posters, notes. */
export function painted(
  width: number,
  height: number,
  draw: Draw,
  options: { px?: number; glow?: number; roughness?: number; cutout?: boolean } = {},
) {
  const canvas = document.createElement('canvas');
  const px = options.px ?? 384;
  const aspect = width / height;
  canvas.width = aspect >= 1 ? px : Math.max(32, Math.round(px * aspect));
  canvas.height = aspect >= 1 ? Math.max(32, Math.round(px / aspect)) : px;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, canvas.width, canvas.height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  // Every painted plane shares one shader variant (cutout + self-lit), which keeps first-frame compile short.
  const material = new THREE.MeshStandardMaterial({
    map, roughness: options.roughness ?? 0.8, side: THREE.DoubleSide, alphaTest: 0.5,
    emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: options.glow ?? 0,
  });
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
  options: { font?: string; max?: number; tilt?: number; align?: CanvasTextAlign; outline?: string } = {},
) {
  ctx.save();
  ctx.translate(x, y);
  if (options.tilt) ctx.rotate(options.tilt);
  ctx.font = `${options.font ?? 'bold'} ${size}px ${options.font?.includes('italic') ? 'Georgia, serif' : "'Arial Black', Impact, Arial, sans-serif"}`;
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

/** Marker-pen handwriting: uneven baseline and size. */
export function scrawl(ctx: CanvasRenderingContext2D, lines: readonly string[], w: number, h: number, colour: string, random: () => number) {
  const size = Math.min(h / (lines.length + 0.6), (w / Math.max(...lines.map((line) => line.length), 1)) * 1.55);
  lines.forEach((line, index) => {
    ctx.save();
    ctx.translate(w / 2, (h / (lines.length + 1)) * (index + 1) + (random() - 0.5) * size * 0.15);
    ctx.rotate((random() - 0.5) * 0.07);
    ctx.font = `bold ${size}px 'Comic Sans MS', 'Segoe Print', cursive, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colour;
    ctx.fillText(line, 0, 0, w * 0.92);
    ctx.restore();
  });
}

/** Streaks, blotches and rust: amount 0 clean … 1 filthy. */
export function grime(ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number, amount: number, colour = '#5a3d24') {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  for (let i = 0; i < amount * 46; i++) {
    ctx.globalAlpha = 0.08 + random() * 0.3 * amount;
    const x = random() * w, y = random() * h, r = (0.02 + random() * 0.09) * Math.min(w, h);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + random()), random() * 3, 0, Math.PI * 2);
    ctx.fill();
    if (random() < 0.5) {
      ctx.lineWidth = r * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - 0.5) * r, y + r * (2 + random() * 5));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Points along a path wound into a spring, for coiled air hoses and phone cords. */
export function coil(path: readonly Point[], radius: number, turns: number, steps = 14): Point[] {
  const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
  const out: Point[] = [];
  const total = Math.max(2, Math.round(turns * steps));
  const up = new THREE.Vector3(0.31, 0.9, 0.3).normalize();
  for (let i = 0; i <= total; i++) {
    const t = i / total;
    const p = curve.getPoint(t), tangent = curve.getTangent(t);
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const lift = new THREE.Vector3().crossVectors(side, tangent).normalize();
    const angle = t * turns * Math.PI * 2;
    const ease = Math.min(1, t * 8, (1 - t) * 8);
    p.addScaledVector(side, Math.cos(angle) * radius * ease).addScaledVector(lift, Math.sin(angle) * radius * ease);
    out.push([p.x, p.y, p.z]);
  }
  return out;
}

/** A fat corrugated hose: a tube with instanced ribs along it. */
export function ribbed(path: readonly Point[], radius: number, material: THREE.Material, rib: THREE.Material, spacing = 0.035) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, path.length * 10, radius, 10), material);
  tube.castShadow = tube.receiveShadow = true;
  const count = Math.max(2, Math.floor(curve.getLength() / spacing));
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(radius * 1.04, radius * 0.16, 5, 14), rib, count);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), z = new THREE.Vector3(0, 0, 1), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    q.setFromUnitVectors(z, curve.getTangentAt(t));
    rings.setMatrixAt(i, matrix.compose(curve.getPointAt(t), q, one));
  }
  rings.castShadow = true;
  group.add(tube, rings);
  return group;
}
