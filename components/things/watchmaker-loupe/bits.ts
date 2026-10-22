import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';

/** Watchmaking vocabulary. Everything here is in millimetres; the caller scales its root by 0.001. */
export type P3 = readonly [number, number, number];

/** A toothed disc outline. `lean` skews the teeth into the hooked club teeth of an escape wheel. */
export function gearShape(outer: number, root: number, teeth: number, lean = 0, tip = 0.3) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const at = (radius: number, angle: number, first = false) => {
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (first) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  };
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    at(root, a, i === 0);
    at(root, a + step * (0.5 - tip - 0.14));
    at(outer, a + step * (0.5 - tip / 2 + lean));
    at(outer, a + step * (0.5 + tip / 2 + lean));
    at(root, a + step * (0.5 + tip + 0.14));
  }
  shape.closePath();
  return shape;
}

export function circleHole(radius: number, x = 0, y = 0) {
  const path = new THREE.Path();
  path.absarc(x, y, radius, 0, Math.PI * 2, true);
  return path;
}

/** Cut `count` wedge windows out of a wheel, leaving spokes: the crossings of a watch wheel. */
export function crossings(shape: THREE.Shape, inner: number, outer: number, count: number, spoke = 0.22) {
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const a0 = i * step + spoke * (outer / inner) * 0.5, a1 = (i + 1) * step - spoke * (outer / inner) * 0.5;
    const b0 = i * step + spoke * 0.5, b1 = (i + 1) * step - spoke * 0.5;
    const hole = new THREE.Path();
    hole.absarc(0, 0, inner, a0, a1, false);
    hole.absarc(0, 0, outer, b1, b0, true);
    hole.closePath();
    shape.holes.push(hole);
  }
  return shape;
}

/** Extrude an outline drawn in plan so it lies flat, `depth` thick, with its underside at y. */
export function slab(s: Sculpture, shape: THREE.Shape, depth: number, material: THREE.Material, y = 0, bevel = 0.04) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - bevel * 2, 0.01), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 20,
  });
  geometry.translate(0, 0, bevel);
  geometry.rotateX(-Math.PI / 2);
  return s.mesh(geometry, material, [0, y, 0]);
}

/** A flat spiral in plan, from r0 out to r1. `kink` bends it out of true like a damaged spring. */
export function spiral(turns: number, r0: number, r1: number, y: number, random?: () => number, kink = 0, phase = 0): P3[] {
  const points: P3[] = [];
  const count = Math.ceil(turns * 18);
  for (let i = 0; i <= count; i++) {
    const t = i / count, angle = phase + t * turns * Math.PI * 2;
    const wobble = kink && random ? (random() - 0.5) * kink * (r1 - r0) * (0.3 + t) : 0;
    const radius = r0 + (r1 - r0) * t + wobble;
    points.push([Math.cos(angle) * radius, y + (kink && random ? (random() - 0.5) * kink * 1.2 * t : 0), Math.sin(angle) * radius]);
  }
  return points;
}

/** A ribbon spring: a flat strip stood on edge, `thickness` across and `height` tall, following the path. */
export function ribbon(s: Sculpture, points: readonly P3[], thickness: number, height: number, material: THREE.Material) {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const count = points.length * 3;
  const positions: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), tangent = new THREE.Vector3(), at = new THREE.Vector3();
  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i <= count; i++) {
    path.getPoint(i / count, at);
    path.getTangent(i / count, tangent);
    side.crossVectors(up, tangent);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize().multiplyScalar(thickness / 2);
    const lift = new THREE.Vector3().crossVectors(tangent, side).normalize().multiplyScalar(height / 2);
    rings.push([
      at.clone().sub(side).sub(lift), at.clone().add(side).sub(lift), at.clone().add(side).add(lift), at.clone().sub(side).add(lift),
    ]);
  }
  for (let i = 0; i < count; i++)
    for (let k = 0; k < 4; k++) {
      const a = rings[i][k], b = rings[i][(k + 1) % 4], c = rings[i + 1][(k + 1) % 4], d = rings[i + 1][k];
      positions.push(a.x, a.y, a.z, d.x, d.y, d.z, b.x, b.y, b.z, b.x, b.y, b.z, d.x, d.y, d.z, c.x, c.y, c.z);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const mesh = s.mesh(geometry, material);
  (material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  return mesh;
}

/** A slotted screw head seen from above. */
export function screw(s: Sculpture, at: P3, radius: number, material: THREE.Material, turn = 0, parent: THREE.Object3D = s.root) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius, radius * 0.5, 18), material);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.9, radius * 0.2, radius * 0.28), new THREE.MeshStandardMaterial({ color: '#0d1220', roughness: 0.7 }));
  slot.position.y = radius * 0.2;
  head.castShadow = head.receiveShadow = true;
  group.add(head, slot);
  group.position.set(at[0], at[1] + radius * 0.25, at[2]);
  group.rotation.y = turn;
  parent.add(group);
  return group;
}

/** Brass with Geneva stripes, perlage or a plain brushed grain, painted on a canvas. */
export function finishTexture(kind: 'stripes' | 'perlage' | 'brushed' | 'sunburst', base: string, random: () => number, wear = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const colour = new THREE.Color(base);
  const tone = (amount: number) => `#${colour.clone().multiplyScalar(amount).getHexString()}`;
  ctx.fillStyle = tone(1);
  ctx.fillRect(0, 0, 256, 256);
  if (kind === 'stripes') {
    for (let i = 0; i < 8; i++) {
      const gradient = ctx.createLinearGradient(i * 32, 0, i * 32 + 32, 0);
      gradient.addColorStop(0, tone(0.72));
      gradient.addColorStop(0.5, tone(1.18));
      gradient.addColorStop(1, tone(0.86));
      ctx.fillStyle = gradient;
      ctx.fillRect(i * 32, 0, 32, 256);
    }
  } else if (kind === 'perlage') {
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
      const cx = x * 32 + (y % 2) * 16, cy = y * 28;
      const gradient = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 20);
      gradient.addColorStop(0, tone(1.2));
      gradient.addColorStop(0.8, tone(0.85));
      gradient.addColorStop(1, tone(0.68));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'sunburst') {
    ctx.translate(128, 128);
    for (let i = 0; i < 120; i++) {
      ctx.rotate((Math.PI * 2) / 120);
      ctx.fillStyle = tone(0.8 + random() * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(190, -5);
      ctx.lineTo(190, 5);
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = tone(0.85 + random() * 0.3);
      ctx.fillRect(0, random() * 256, 256, 1);
    }
  }
  // Tarnish and fingerprints gather with wear.
  for (let i = 0; i < wear * 40; i++) {
    ctx.fillStyle = `rgba(${70 + random() * 30},${60 + random() * 30},${30 + random() * 20},${0.05 + random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(random() * 256, random() * 256, 2 + random() * 9, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Extruded shapes carry plan coordinates as UVs; this sets how many millimetres one tile covers. */
export function tile(texture: THREE.Texture, millimetres: number, turn = 0.5) {
  texture.repeat.set(1 / millimetres, 1 / millimetres);
  texture.rotation = turn;
  return texture;
}

/** Round lettering engraved around a disc or straight across it, as a texture for a flat plate. */
export function engraving(size: number, paper: string, ink: string, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, radius: number, centreAngle: number, spacing: number) {
  const start = centreAngle - ((text.length - 1) * spacing) / 2;
  for (let i = 0; i < text.length; i++) {
    const angle = start + i * spacing;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
}
