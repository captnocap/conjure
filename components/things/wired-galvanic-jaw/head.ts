import * as THREE from 'three';
import { paint } from './lab';

/** Proportions of a sculpted head. Half extents in metres; everything else is 0..1 strength. */
export interface HeadShape {
  w: number;
  h: number;
  d: number;
  jaw?: number;
  flat?: number;
  brow?: number;
  nose?: number;
  socket?: number;
  cheek?: number;
  chin?: number;
  muzzle?: number;
  lips?: number;
  /** pulls the crown up into a point or ridge */
  crest?: number;
}

const bell = (x: number, s: number) => Math.exp(-(x * x) / (2 * s * s));
const ramp = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface Surf { p: THREE.Vector3; n: THREE.Vector3 }

/**
 * A head as one smooth surface. Directions are azimuth (0 at the face, positive toward the
 * head's +x) and polar angle theta (0 at the crown). UVs put the face centre at u = 0.5.
 */
export function headForm(shape: HeadShape) {
  const S = { jaw: 0.4, flat: 0, brow: 0.4, nose: 0.6, socket: 0.6, cheek: 0.4, chin: 0.4, muzzle: 0, lips: 0.5, crest: 0, ...shape };

  const raw = (az: number, theta: number, out: THREE.Vector3) => {
    const Y = Math.cos(theta), sin = Math.sin(theta);
    const X = Math.sin(az) * sin, Z = Math.cos(az) * sin;
    const low = Math.max(0, -Y);
    let x = X, z = Z;
    if (S.flat > 0 && Y > 0) {
      const k = ramp(0.05, 0.7, Y) * S.flat;
      x = Math.sign(X) * Math.pow(Math.abs(X), 1 - 0.42 * k);
      z = Math.sign(Z) * Math.pow(Math.abs(Z), 1 - 0.32 * k);
    }
    const wide = (1 - S.jaw * 0.42 * Math.pow(low, 1.5)) * (1 - 0.1 * low);
    const deep = Z < 0 ? 1 - 0.4 * Math.pow(low, 1.3) : 1 - 0.1 * low * low;
    const y = Y - S.flat * 0.95 * Math.pow(Math.max(0, Y - 0.5), 1.25) + S.crest * 0.3 * Math.pow(Math.max(0, Y), 4);
    const front = ramp(0, 0.4, Z), ax = Math.abs(X);
    let bump = S.brow * 0.11 * bell(Y - 0.2, 0.075) * (1 - 0.5 * X * X);
    bump -= S.socket * 0.12 * bell(ax - 0.36, 0.15) * bell(Y - 0.06, 0.1);
    const ridge = Y > -0.24 ? ramp(0.22, -0.24, Y) : ramp(-0.36, -0.24, Y);
    bump += S.nose * 0.34 * ridge * bell(X, 0.07 + 0.07 * ramp(0.1, -0.25, Y));
    bump += S.cheek * 0.07 * bell(ax - 0.5, 0.2) * bell(Y + 0.12, 0.15);
    bump += S.lips * 0.05 * bell(X, 0.3) * bell(Y + 0.47, 0.1);
    bump += S.chin * 0.1 * bell(X, 0.25) * bell(Y + 0.82, 0.14);
    bump += S.muzzle * 0.55 * bell(X, 0.3) * bell(Y + 0.32, 0.28);
    return out.set(x * wide * S.w, y * S.h, (z * deep + bump * front) * S.d);
  };

  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e = new THREE.Vector3();
  const surf = (az: number, theta: number, lift = 0): Surf => {
    const t = Math.min(Math.PI - 0.03, Math.max(0.03, theta)), eps = 0.012;
    raw(az + eps, t, a); raw(az - eps, t, b); raw(az, t + eps, c); raw(az, t - eps, e);
    const n = a.clone().sub(b).cross(e.clone().sub(c)).normalize();
    const p = raw(az, theta, new THREE.Vector3());
    if (!Number.isFinite(n.x) || n.lengthSq() < 0.5) n.copy(p).normalize();
    return { p: p.addScaledVector(n, lift), n };
  };
  /** A point on the face from flat face coordinates: x across (-1..1), y up (-1..1). */
  const face = (x: number, y: number, lift = 0) => surf(Math.atan2(x, Math.sqrt(Math.max(0.0001, 1 - x * x - y * y))), Math.acos(Math.max(-1, Math.min(1, y))), lift);
  const uv = (x: number, y: number): [number, number] => [Math.atan2(x, Math.sqrt(Math.max(0.0001, 1 - x * x - y * y))) / (Math.PI * 2) + 0.5, Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI];

  /** Any patch of the surface, optionally lifted off it: the whole head, a hair cap, a bandage band. */
  const grid = (o: { az?: [number, number]; top?: (az: number) => number; bottom?: (az: number) => number; nu?: number; nv?: number; lift?: number; skip?: (x: number, y: number, az: number, theta: number) => boolean } = {}) => {
    const [az0, az1] = o.az ?? [-Math.PI, Math.PI], nu = o.nu ?? 72, nv = o.nv ?? 48;
    const positions: number[] = [], normals: number[] = [], uvs: number[] = [], index: number[] = [];
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const az = az0 + (az1 - az0) * (i / nu);
        const t0 = o.top ? o.top(az) : 0, t1 = o.bottom ? o.bottom(az) : Math.PI;
        const theta = t0 + (t1 - t0) * (j / nv);
        const { p, n } = surf(az, theta, o.lift ?? 0);
        positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z);
        uvs.push(az / (Math.PI * 2) + 0.5, 1 - theta / Math.PI);
      }
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const p = j * (nu + 1) + i, q = p + nu + 1;
        if (o.skip) {
          const az = az0 + (az1 - az0) * ((i + 0.5) / nu);
          const t0 = o.top ? o.top(az) : 0, t1 = o.bottom ? o.bottom(az) : Math.PI;
          const theta = t0 + (t1 - t0) * ((j + 0.5) / nv);
          if (o.skip(Math.sin(az) * Math.sin(theta), Math.cos(theta), az, theta)) continue;
        }
        index.push(p, q, p + 1, p + 1, q, q + 1);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index);
    return geometry;
  };
  return { S, surf, face, uv, grid };
}
export type Head = ReturnType<typeof headForm>;

export function eyeTexture(pupil: 'round' | 'slit', inner: string, outer: string, bloodshot: number, random: () => number, sclera = '#f3eee0') {
  return paint(512, 256, (ctx, w, h) => {
    const cx = w * 0.25, cy = h * 0.5;
    ctx.fillStyle = sclera;
    ctx.fillRect(0, 0, w, h);
    const veins = 6 + Math.round(bloodshot * 26);
    for (let i = 0; i < veins; i++) {
      let r = 120 + random() * 30, ang = random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(170,30,30,${0.3 + bloodshot * 0.5})`;
      ctx.lineWidth = 1 + random() * 1.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
      const reach = 62 - bloodshot * 14 + random() * 20;
      while (r > reach) { r -= 8 + random() * 6; ang += (random() - 0.5) * 0.3; ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); }
      ctx.stroke();
    }
    const R = 50;
    ctx.fillStyle = '#17120e';
    ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.fill();
    const disc = ctx.createRadialGradient(cx, cy, 6, cx, cy, R);
    disc.addColorStop(0, inner); disc.addColorStop(0.8, outer); disc.addColorStop(1, '#141414');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    if (pupil === 'slit') ctx.ellipse(cx, cy, 8, R * 0.9, 0, 0, Math.PI * 2); else ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.ellipse(cx - 17, cy - 19, 10, 7, -0.5, 0, Math.PI * 2); ctx.fill();
  });
}

/**
 * An eye with lids, facing +z. `open` runs 0 shut … 1 staring. Returns the group, the globe
 * (turn it to aim the gaze) and the upper lid (turn its x to blink).
 */
export function makeEye(radius: number, map: THREE.Texture | null, lid: THREE.Material, open: number, glow = 0, plain: THREE.ColorRepresentation = '#efe9da') {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ map: map ?? undefined, color: map ? '#ffffff' : plain, roughness: 0.2, emissive: glow ? '#ffffff' : '#000000', emissiveMap: glow && map ? map : undefined, emissiveIntensity: glow });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
  globe.rotation.order = 'YXZ';
  const half = new THREE.SphereGeometry(radius * 1.09, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const upper = new THREE.Mesh(half, lid), lower = new THREE.Mesh(half, lid);
  const openAngle = (amount: number) => 0.6 - amount * 1.0;
  upper.rotation.x = openAngle(open);
  lower.rotation.x = Math.PI + 0.52 - (1 - open) * 0.1;
  upper.castShadow = lower.castShadow = true;
  group.add(globe, upper, lower);
  return { group, globe, upper, openAngle };
}

/** An outer ear for the head's +x side, lying in its own xy plane (x toward the back of the head). */
export function makeEar(size: number, skin: THREE.Material, inner: THREE.Material, pointed = 0) {
  const outline = new THREE.Shape();
  const w = size * 0.5, h = size;
  outline.moveTo(-w * 0.35, -h * 0.5);
  outline.bezierCurveTo(w * 0.3, -h * 0.62, w * 0.75, -h * 0.2, w * 0.8, h * 0.12);
  outline.bezierCurveTo(w * 0.9, h * (0.45 + pointed * 0.2), w * (0.5 + pointed * 0.5), h * (0.55 + pointed * 0.55), w * (0.1 + pointed * 0.6), h * (0.52 + pointed * 0.6));
  outline.bezierCurveTo(-w * 0.45, h * 0.5, -w * 0.55, h * 0.15, -w * 0.4, -h * 0.1);
  outline.closePath();
  const group = new THREE.Group();
  const flap = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: size * 0.05, bevelEnabled: true, bevelThickness: size * 0.05, bevelSize: size * 0.05, bevelSegments: 2, curveSegments: 10 }), skin);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), inner);
  bowl.scale.set(w * 0.42, h * 0.3, size * 0.05);
  bowl.position.set(w * 0.12, h * 0.02, size * 0.12);
  flap.castShadow = true;
  group.add(flap, bowl);
  return group;
}

/** Fasten an ear group to a head side: side is +1 for the head's +x. */
export function mountEar(ear: THREE.Group, at: THREE.Vector3, side: number, flare = 0.45) {
  const pivot = new THREE.Group();
  pivot.position.copy(at);
  pivot.rotation.y = side * (Math.PI / 2 - flare);
  ear.scale.x = -side;
  pivot.add(ear);
  return pivot;
}

/** Small solids laid across a path on a surface: stitches, staples, zip teeth. One draw call. */
export function ticks(path: readonly Surf[], material: THREE.Material, size: [number, number, number], lift = 0, slant = 0) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), material, Math.max(path.length, 1));
  const matrix = new THREE.Matrix4(), tangent = new THREE.Vector3(), across = new THREE.Vector3(), along = new THREE.Vector3();
  path.forEach((point, index) => {
    const next = path[Math.min(index + 1, path.length - 1)].p, prev = path[Math.max(index - 1, 0)].p;
    tangent.copy(next).sub(prev).normalize();
    across.crossVectors(point.n, tangent).normalize();
    along.crossVectors(across, point.n).normalize();
    if (slant) { across.addScaledVector(along, slant).normalize(); along.crossVectors(across, point.n).normalize(); }
    matrix.makeBasis(across, point.n, along).setPosition(point.p.x + point.n.x * lift, point.p.y + point.n.y * lift, point.p.z + point.n.z * lift);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.count = path.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

/** A thin cord through surface points. */
export function cord(path: readonly Surf[], radius: number, material: THREE.Material, lift = 0, closed = false) {
  const curve = new THREE.CatmullRomCurve3(path.map(({ p, n }) => p.clone().addScaledVector(n, lift)), closed);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, path.length * 3), radius, 6, closed), material);
  mesh.castShadow = true;
  return mesh;
}
