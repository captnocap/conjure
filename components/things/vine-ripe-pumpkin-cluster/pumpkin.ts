import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';

export interface PumpkinShape {
  /** Radius at the widest point, metres. */
  radius: number;
  /** Height without the stem, metres. */
  height: number;
  /** Number of lobes. */
  ribs: number;
  /** 0 smooth … 1 deep grooves. */
  groove: number;
  /** Warts per pumpkin (goblin type). */
  warts?: number;
  /** Squash and lean: 0 upright and even, 1 slumped and lopsided. */
  slump?: number;
  /** Rind colour. */
  color: THREE.ColorRepresentation;
  /** How much darker the grooves are. */
  shade?: number;
  roughness?: number;
}

/** A ribbed pumpkin body as one surface with darker grooves; its base sits at y = 0. Returns the mesh and the top of the body (where the stem goes). */
export function pumpkin(s: Sculpture, shape: PumpkinShape, random: () => number) {
  const { radius: R, height: H, ribs, groove } = shape;
  const slump = shape.slump ?? 0;
  const warts = Array.from({ length: shape.warts ?? 0 }, () => ({ u: random(), v: 0.22 + random() * 0.6, r: 0.025 + random() * 0.04, h: 0.03 + random() * 0.05 }));
  const leanX = (random() - 0.5) * 0.12 * slump, leanZ = (random() - 0.5) * 0.12 * slump;
  const phase = random();
  const point = (u: number, v: number, target: THREE.Vector3) => {
    const a = u * Math.PI * 2;
    const sv = Math.sin(Math.PI * v);
    const lobe = Math.pow(Math.abs(Math.cos(a * ribs / 2)), 0.35);
    // Lobes swell irregularly around the body so it is not a perfect gear.
    const swell = 1 + 0.05 * Math.sin(a * 3 + phase * 9) + 0.04 * Math.sin(a * 2 + phase * 4);
    let r = R * Math.pow(sv, 0.75) * (1 - groove * 0.16 * (1 - lobe)) * swell;
    let y = H * (0.5 - 0.5 * Math.cos(Math.PI * v));
    // Dimples at the stem and the blossom end.
    const pole = Math.pow(1 - sv, 2.6);
    y += v > 0.5 ? -pole * H * 0.2 : pole * H * 0.1;
    // A slumped pumpkin spreads at the bottom under its own weight.
    if (slump > 0) r *= 1 + slump * 0.22 * Math.pow(Math.max(0, 1 - v * 1.6), 1.5);
    for (const w of warts) {
      const du = Math.min(Math.abs(u - w.u), 1 - Math.abs(u - w.u)) * Math.PI * 2 * sv, dv = (v - w.v) * Math.PI;
      const d2 = (du * du + dv * dv) / (w.r * w.r);
      if (d2 < 9) r += R * w.h * Math.exp(-d2);
    }
    target.set(Math.cos(a) * r + leanX * y, y, Math.sin(a) * r + leanZ * y);
  };
  const material = s.material(shape.color, { roughness: shape.roughness ?? 0.5, vertexColors: true });
  const mesh = s.surface(point, material, { segments: [ribs * 8, 22], wrap: true, flip: true });
  // Darken the grooves and the poles through vertex colours so the shading survives a repaint.
  const geometry = mesh.geometry;
  const uv = geometry.getAttribute('uv');
  const colors = new Float32Array(uv.count * 3);
  const shade = shape.shade ?? 0.45;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const lobe = Math.pow(Math.abs(Math.cos(u * Math.PI * ribs)), 0.5);
    const sv = Math.sin(Math.PI * v);
    const k = 1 - shade * groove * (1 - lobe) - 0.25 * Math.pow(1 - sv, 3);
    colors.set([k, k, k], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const top = H * 0.8;
  return { mesh, top, topAt: new THREE.Vector3(leanX * top, top, leanZ * top) };
}

/** A woody, slightly curved pumpkin stem rising from `base`. */
export function stem(s: Sculpture, base: THREE.Vector3, length: number, thick: number, material: THREE.Material, random: () => number) {
  const bend = new THREE.Vector3((random() - 0.5) * length * 0.8, length, (random() - 0.5) * length * 0.8);
  const mid = base.clone().add(new THREE.Vector3(bend.x * 0.3, length * 0.55, bend.z * 0.3));
  const tip = base.clone().add(bend);
  const curve = new THREE.CatmullRomCurve3([base.clone().add(new THREE.Vector3(0, -length * 0.15, 0)), mid, tip]);
  const geometry = new THREE.TubeGeometry(curve, 10, thick, 7, false);
  // Taper: thick flared base to a narrower cut tip.
  const pos = geometry.getAttribute('position');
  const centre = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / 8) / 10;
    curve.getPointAt(Math.min(1, ring), centre);
    p.fromBufferAttribute(pos, i).sub(centre).multiplyScalar(1.35 - ring * 0.55).add(centre);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  const mesh = s.mesh(geometry, material);
  s.cylinder(thick * 0.75, thick * 0.75, thick * 0.3, tip.toArray() as [number, number, number], material, 7);
  return mesh;
}

/** A broad, ragged, lobed pumpkin leaf as a gently cupped shape; lies flat in xz around its stalk point. */
export function leafGeometry(size: number, random: () => number, tatter = 0) {
  const shape = new THREE.Shape();
  const points: THREE.Vector2[] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * Math.PI * 2;
    // Five shallow lobes with a notch at the stalk.
    const lobes = 0.78 + 0.22 * Math.abs(Math.cos(a * 2.5));
    const notch = 1 - 0.45 * Math.exp(-Math.pow((a - Math.PI * 1.5) / 0.35, 2));
    const rag = 1 - tatter * random() * 0.35 - random() * 0.06;
    const r = size * lobes * notch * rag;
    points.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r + size * 0.9));
  }
  shape.setFromPoints(points);
  const geometry = new THREE.ShapeGeometry(shape, 2);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z + size * 0.9) / size;
    // Cupped edges and a little crinkle.
    pos.setY(i, d * d * size * 0.18 + Math.sin(x * 23 + z * 17) * size * 0.03);
  }
  geometry.computeVertexNormals();
  return geometry;
}
