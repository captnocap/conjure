import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';

/** Shared sculpting vocabulary for primate heads: blobs, half domes, fur, eyes and a hinged toothed jaw. */
export type P3 = readonly [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export function blob(s: Sculpture, size: P3, at: P3, mat: THREE.Material, rot: P3 = [0, 0, 0], parent?: THREE.Object3D, seg = 28) {
  const m = s.ball(size, at, mat, seg);
  m.rotation.set(rot[0], rot[1], rot[2]);
  if (parent) parent.add(m);
  return m;
}

/** Half an ellipsoid with a flat capped face. `down` hangs it below its origin instead of above. */
export function dome(s: Sculpture, size: P3, at: P3, mat: THREE.Material, cap: THREE.Material, parent: THREE.Object3D, down = false) {
  const g = new THREE.Group();
  g.position.set(at[0], at[1], at[2]);
  const shell = s.mesh(new THREE.SphereGeometry(1, 30, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  shell.scale.set(size[0], size[1], size[2]);
  const lid = s.mesh(new THREE.CircleGeometry(1, 30), cap);
  lid.scale.set(size[0] * 0.985, size[2] * 0.985, 1);
  lid.rotation.x = Math.PI / 2;
  g.add(shell, lid);
  if (down) g.rotation.x = Math.PI;
  parent.add(g);
  return g;
}

export interface FurOptions {
  at: P3; radii: P3; count: number; length: number; color: THREE.ColorRepresentation;
  width?: number; droop?: number; mess?: number; rough?: number;
  keep?: (d: THREE.Vector3) => boolean;
  lengthAt?: (d: THREE.Vector3) => number;
  colorAt?: (d: THREE.Vector3) => THREE.ColorRepresentation | undefined;
  parent?: THREE.Object3D;
}

/** A coat of instanced spikes over an ellipsoid. One draw call however many tufts. */
export function fur(s: Sculpture, o: FurOptions) {
  const random = s.context.random;
  const geometry = new THREE.ConeGeometry(0.5, 1, 5, 1, true);
  geometry.translate(0, 0.5, 0);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: o.rough ?? 0.92, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geometry, material, o.count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), d = new THREE.Vector3(), n = new THREE.Vector3(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const base = new THREE.Color(o.color), tint = new THREE.Color();
  const droop = o.droop ?? 0.4, mess = o.mess ?? 0.25, width = o.width ?? 0.4;
  let placed = 0;
  for (let tries = 0; placed < o.count && tries < o.count * 30; tries++) {
    const z = random() * 2 - 1, phi = random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    d.set(r * Math.cos(phi), z, r * Math.sin(phi));
    if (o.keep && !o.keep(d)) continue;
    p.set(d.x * o.radii[0], d.y * o.radii[1], d.z * o.radii[2]);
    n.set(d.x / o.radii[0], d.y / o.radii[1], d.z / o.radii[2]).normalize();
    n.multiplyScalar(1 - droop).add(new THREE.Vector3((random() - 0.5) * mess, -droop + (random() - 0.5) * mess, (random() - 0.5) * mess)).normalize();
    q.setFromUnitVectors(UP, n);
    const len = o.length * (o.lengthAt ? o.lengthAt(d) : 1) * (0.7 + random() * 0.6);
    sc.set(o.length * width, len, o.length * width);
    p.multiplyScalar(0.94).add(new THREE.Vector3(o.at[0], o.at[1], o.at[2]));
    m.compose(p, q, sc);
    mesh.setMatrixAt(placed, m);
    tint.set(o.colorAt?.(d) ?? base).offsetHSL(0, 0, (random() - 0.5) * 0.09);
    mesh.setColorAt(placed, tint);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  (o.parent ?? s.root).add(mesh);
  return mesh;
}

export interface EyeOptions {
  at: P3; r: number; iris: THREE.ColorRepresentation; gaze: readonly [number, number];
  /** 0 wide open … 1 shut. */
  lid: number; lidMat: THREE.Material; sclera?: THREE.ColorRepresentation; parent: THREE.Object3D; pupil?: number;
}

export function eye(s: Sculpture, o: EyeOptions) {
  const g = new THREE.Group();
  g.position.set(o.at[0], o.at[1], o.at[2]);
  o.parent.add(g);
  const r = o.r;
  blob(s, [r, r, r], [0, 0, 0], new THREE.MeshStandardMaterial({ color: o.sclera ?? '#3a261a', roughness: 0.25 }), [0, 0, 0], g, 18);
  const look = new THREE.Group();
  look.rotation.set(-o.gaze[1], o.gaze[0], 0);
  g.add(look);
  blob(s, [r * 0.66, r * 0.66, r * 0.2], [0, 0, r * 0.86], new THREE.MeshStandardMaterial({ color: o.iris, roughness: 0.2, emissive: o.iris, emissiveIntensity: 0.12 }), [0, 0, 0], look, 16);
  const pr = r * (o.pupil ?? 0.34);
  blob(s, [pr, pr, r * 0.14], [0, 0, r * 0.95], new THREE.MeshStandardMaterial({ color: '#070504', roughness: 0.15 }), [0, 0, 0], look, 14);
  blob(s, [r * 0.13, r * 0.13, r * 0.06], [r * 0.28, r * 0.34, r * 0.98], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.7, roughness: 0.1 }), [0, 0, 0], g, 8);
  const cap = () => new THREE.SphereGeometry(r * 1.13, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const upper = s.mesh(cap(), o.lidMat);
  upper.rotation.x = -0.62 + clamp(o.lid) * 1.75;
  const lower = s.mesh(cap(), o.lidMat);
  lower.rotation.x = Math.PI + 0.62 - clamp(o.lid) * 0.25;
  g.add(upper, lower);
  return g;
}

export type Teeth = 'whole' | 'broken' | 'stumps' | 'none';

export interface JawOptions {
  parent: THREE.Object3D;
  hinge: P3; length: number; width: number;
  /** Radians the mouth line tips downward toward the front. */
  slope?: number;
  upperHeight: number; lowerHeight: number;
  /** Radians of opening. */
  gape: number;
  /** Share of the gape taken by the upper jaw lifting. */
  lift?: number;
  upper: THREE.Material; lower: THREE.Material; gum: THREE.Material; tooth: THREE.Material;
  lip?: THREE.Material; lipRadius?: number;
  canine: number; lowerCanine?: number; incisor: number; molars?: number;
  teeth: Teeth;
  /** Lips drawn back so clenched teeth show even when shut. */
  bared?: boolean;
  tongue?: THREE.Material | null;
  /** Number of ridges across the palate. */
  ridges?: number;
}

/** A muzzle split along the mouth line: upper half fixed, lower half swinging on a hinge, teeth around both rims. */
export function jaw(s: Sculpture, o: JawOptions) {
  const random = s.context.random;
  const frame = new THREE.Group();
  frame.position.set(o.hinge[0], o.hinge[1], o.hinge[2]);
  frame.rotation.x = o.slope ?? 0;
  o.parent.add(frame);
  const lift = o.lift ?? 0.15;
  const upper = new THREE.Group(), lower = new THREE.Group();
  upper.rotation.x = -o.gape * lift;
  lower.rotation.x = o.gape * (1 - lift);
  frame.add(upper, lower);
  const L = o.length, W = o.width, cz = L / 2;
  dome(s, [W / 2, o.upperHeight, L / 2], [0, 0, cz], o.upper, o.gum, upper);
  dome(s, [W / 2 * 0.95, o.lowerHeight, L / 2 * 0.97], [0, 0, cz * 0.97], o.lower, o.gum, lower, true);

  if (o.gape > 0.12) {
    const dark = new THREE.MeshStandardMaterial({ color: '#2a0d10', roughness: 0.8 });
    blob(s, [W * 0.34, Math.max(0.002, L * Math.sin(o.gape) * 0.3), W * 0.26], [0, -L * Math.sin(o.gape * (1 - lift)) * 0.12, L * 0.1], dark, [0, 0, 0], frame, 14);
  }
  if (o.tongue && o.gape > 0.1)
    blob(s, [W * 0.27, o.lowerHeight * 0.22, L * 0.34], [0, 0.003, L * 0.5], o.tongue, [0, 0, 0], lower, 16);
  if (o.ridges && o.gape > 0.2) {
    const ridge = new THREE.MeshStandardMaterial({ color: '#8d4a4c', roughness: 0.6 });
    for (let i = 0; i < o.ridges; i++) {
      const t = (i + 0.5) / o.ridges, z = L * (0.18 + t * 0.6);
      const half = (W / 2) * Math.sqrt(Math.max(0.05, 1 - ((z - cz) / (L / 2)) ** 2)) * 0.62;
      const bar = s.box([half * 2, L * 0.012, L * 0.022], [0, -L * 0.006, z], ridge);
      upper.add(bar);
    }
  }

  const show = o.bared ? 1 : clamp((o.gape - 0.04) / 0.3);
  if (o.teeth !== 'none' && show > 0.05) {
    const inset = o.bared ? W * 0.012 : W * 0.085;
    const a = W / 2 - inset, b = L / 2 - inset;
    const stump = o.teeth === 'stumps';
    const stumpMat = new THREE.MeshStandardMaterial({ color: '#7a5a34', roughness: 0.8 });
    const mat = stump ? stumpMat : o.tooth;
    const tw = W * 0.105;
    const molars = o.molars ?? 3;
    const angles: { t: number; kind: 'i' | 'c' | 'm' }[] = [];
    for (const side of [-1, 1]) {
      angles.push({ t: side * 0.12, kind: 'i' }, { t: side * 0.34, kind: 'i' }, { t: side * 0.58, kind: 'c' });
      for (let k = 0; k < molars; k++) angles.push({ t: side * (0.86 + k * (0.75 / molars)), kind: 'm' });
    }
    const brokenAt = o.teeth === 'broken' ? (random() < 0.5 ? -1 : 1) : 0;
    const row = (group: THREE.Group, dir: number, canine: number) => {
      for (const { t, kind } of angles) {
        if (o.bared && kind === 'm' && Math.abs(t) > 1.25) continue;
        if (stump && random() < 0.22) continue;
        if (o.teeth === 'broken' && kind === 'i' && dir < 0 && t * brokenAt > 0.2) continue;
        const x = a * Math.sin(t), z = cz + b * Math.cos(t);
        let h = (kind === 'c' ? canine : kind === 'i' ? o.incisor : o.incisor * 0.75) * show;
        if (stump) h *= kind === 'c' ? 0.28 : 0.5 + random() * 0.3;
        let snapped = false;
        if (kind === 'c' && dir < 0 && o.teeth === 'broken' && t * brokenAt > 0) { h *= 0.4; snapped = true; }
        if (h < 0.0008) continue;
        let mesh: THREE.Mesh;
        if (kind === 'c' && !stump) {
          const base = tw * (0.5 + canine * show * 3.2);
          const geo = snapped ? new THREE.CylinderGeometry(base * 0.42, Math.min(base, tw), h, 8) : new THREE.ConeGeometry(Math.min(base, tw * 1.25) * 0.5, h, 8);
          mesh = s.mesh(geo, snapped ? stumpMat : mat, [x, dir * h / 2, z]);
          if (dir < 0) mesh.rotation.x = Math.PI;
          mesh.rotation.z = (dir < 0 ? 1 : -1) * Math.sign(t) * 0.06;
        } else {
          const wide = kind === 'm' ? tw * 1.15 : tw * 0.9;
          mesh = s.mesh(new THREE.BoxGeometry(wide, h, kind === 'm' ? tw * 1.1 : tw * 0.55), mat, [x, dir * h / 2, z]);
          mesh.rotation.y = t;
        }
        group.add(mesh);
      }
    };
    row(upper, -1, o.canine);
    row(lower, 1, o.lowerCanine ?? o.canine * 0.6);
    if (o.bared) {
      // A band of gum behind the clenched teeth so they read as a grin, not a seam.
      const points: THREE.Vector3[] = [];
      for (let t = -1.2; t <= 1.2001; t += 0.2) points.push(new THREE.Vector3((a - tw * 0.3) * Math.sin(t), 0, cz + (b - tw * 0.3) * Math.cos(t)));
      const band = s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, o.incisor * 1.15, 8), o.gum);
      frame.add(band);
    }
  }

  if (o.lip) {
    const lr = o.lipRadius ?? W * 0.035;
    for (const [group, y, k] of [[upper, lr * 0.4, 1], [lower, -lr * 0.4, 0.95]] as const) {
      const points: THREE.Vector3[] = [];
      for (let t = -1.75; t <= 1.7501; t += 0.25) points.push(new THREE.Vector3((W / 2) * k * Math.sin(t), y, cz * (k === 1 ? 1 : 0.97) + (L / 2) * k * Math.cos(t)));
      const tube = s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, lr, 6), o.lip);
      group.add(tube);
    }
  }
  return { frame, upper, lower, tip: new THREE.Vector3(0, 0, L) };
}

/** The solid half-ellipsoid mass of neck and shoulders a head sits on, flat on the ground. */
export function bust(s: Sculpture, size: P3, mat: THREE.Material) {
  const shell = s.mesh(new THREE.SphereGeometry(1, 30, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  shell.scale.set(size[0], size[1], size[2]);
  return shell;
}
