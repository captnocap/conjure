import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A sculpted human head and bust as displaced surfaces with vertex colour. Copied per component. */

export const bell = (x: number, s: number) => Math.exp(-(x * x) / (2 * s * s));
export const ramp = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (x: number, y: number, z: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Smooth value noise in 0..1. */
export function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}
export const fbm = (x: number, y: number, z: number) =>
  noise3(x, y, z) * 0.55 + noise3(x * 2.1 + 7, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3 + 3, z * 4.3) * 0.15;

type Tint = THREE.ColorRepresentation;

export interface HeadOpts {
  /** Half the height of the head, metres. */
  size: number;
  res?: number;
  /** 0 an egg, 1 crisply carved. May vary over the face (X right, Y up, on the unit sphere). */
  crisp?: number | ((X: number, Y: number, Z: number) => number);
  jaw?: number; nose?: number; noseWide?: number; lips?: number; smile?: number; brow?: number;
  cheek?: number; chin?: number; socket?: number; long?: number;
  eyes?: 'closed' | 'open' | 'blank' | 'hollow';
  beard?: number; moustache?: number;
  hair?: 'bald' | 'crop' | 'curls' | 'parted';
  /** 0 intact, 1 the nose is gone to the root. */
  noseBreak?: number;
  /** Planes (unit normal, offset, head units) beyond which the stone has been sheared away. */
  cuts?: readonly { n: readonly [number, number, number]; d: number }[];
  /** Flatten everything behind this depth: a face mask rather than a head. */
  maskCut?: number;
  lumpy?: number; lumpScale?: number;
  seed?: number;
  ears?: boolean;
  base: Tint; hairTint?: Tint; scar?: Tint; cavity?: Tint; cavityAmount?: number; mottle?: Tint; mottleAmount?: number;
}

export function headForm(o: HeadOpts) {
  const S = {
    res: 1, crisp: 1, jaw: 0.5, nose: 1, noseWide: 1, lips: 1, smile: 0, brow: 1, cheek: 1, chin: 1, socket: 1, long: 1,
    eyes: 'blank', beard: 0, moustache: 0, hair: 'bald', noseBreak: 0, lumpy: 0, lumpScale: 5, seed: 1, ears: true,
    cavityAmount: 0, mottleAmount: 0, ...o,
  } as Required<Omit<HeadOpts, 'cuts' | 'maskCut' | 'hairTint' | 'scar' | 'cavity' | 'mottle'>> & HeadOpts;
  const sd = (S.seed % 977) * 1.37;
  const base = new THREE.Color(S.base), hairTint = new THREE.Color(S.hairTint ?? S.base), scar = new THREE.Color(S.scar ?? S.base);
  const cavity = new THREE.Color(S.cavity ?? S.base), mottle = new THREE.Color(S.mottle ?? S.base);
  const info = { hair: 0, scar: 0, recess: 0 };

  const surf = (az: number, th: number, out: THREE.Vector3) => {
    const Y = Math.cos(th), sn = Math.sin(th), X = Math.sin(az) * sn, Z = Math.cos(az) * sn;
    const low = Math.max(0, -Y);
    const wx = 0.76 * (1 - (0.44 - 0.28 * S.jaw) * Math.pow(low, 1.7));
    const wz = Z > 0 ? 0.86 * (1 - 0.1 * low) : 0.96 * (1 - 0.42 * Math.pow(low, 1.3));
    let x = X * wx, y = Y * S.long, z = Z * wz - 0.04;
    const F = typeof S.crisp === 'number' ? S.crisp : S.crisp(X, Y, Z);
    const wf = ramp(0.02, 0.45, Z);
    const ax = Math.abs(X);
    let dz = 0, recess = 0, scarred = 0;

    // Eye sockets, brow and lids.
    const eyeX = ax - 0.31;
    const sock = -0.115 * S.socket * bell(eyeX, 0.15) * bell(Y - 0.09, 0.105);
    dz += sock;
    dz += 0.07 * S.brow * bell(Y - 0.27, 0.07) * ramp(0.72, 0.4, ax) * (1 - 0.35 * bell(X, 0.07));
    const ball = bell(eyeX, 0.115) * bell(Y - 0.075, 0.062);
    if (S.eyes === 'hollow') dz -= 0.09 * ball;
    else {
      dz += 0.075 * ball;
      if (S.eyes === 'closed') dz -= 0.022 * bell(Y - 0.045, 0.02) * bell(eyeX, 0.11);
      else dz += 0.03 * bell(Y - 0.135, 0.022) * bell(eyeX, 0.13) - 0.02 * bell(Y - 0.015, 0.022) * bell(eyeX, 0.11);
    }
    recess += Math.max(0, -sock) * 5;

    // Nose: a ridge that grows to the tip and is cut under sharply.
    const t = Math.min(1, Math.max(0, (0.22 - Y) / 0.52));
    const under = Y < -0.3 ? bell(Y + 0.3, 0.04) : 1;
    let nose = S.nose * (0.05 + 0.27 * Math.pow(t, 1.25)) * bell(X, (0.05 + 0.075 * t) * S.noseWide) * under * (Y < 0.3 ? 1 : 0);
    nose += S.nose * 0.085 * bell(ax - 0.105 * S.noseWide, 0.055) * bell(Y + 0.265, 0.05);
    if (S.noseBreak > 0) {
      const limit = 0.3 * (1 - S.noseBreak) + 0.035 + 0.035 * noise3(X * 22 + sd, Y * 22, 3);
      if (nose * F > limit && Y < 0.12) { scarred = 1; nose = limit / Math.max(F, 0.2); }
    }
    dz += nose;

    // Mouth, chin and cheekbones.
    const my = Y + 0.535 - S.smile * (X * X * 1.6 - 0.02);
    dz += 0.075 * bell(Y + 0.52, 0.2) * bell(X, 0.3);
    dz += 0.05 * S.lips * bell(my - 0.055, 0.04) * bell(X, 0.19) + 0.055 * S.lips * bell(my + 0.065, 0.045) * bell(X, 0.15);
    const groove = 0.05 * bell(my, 0.022) * bell(X, 0.22);
    dz -= groove + 0.03 * bell(Y + 0.72, 0.04) * bell(X, 0.18);
    dz += 0.1 * S.chin * bell(Y + 0.86, 0.12) * bell(X, 0.2) + 0.05 * S.cheek * bell(ax - 0.5, 0.15) * bell(Y + 0.1, 0.14);
    dz -= 0.03 * S.cheek * bell(ax - 0.42, 0.14) * bell(Y + 0.45, 0.14);
    recess += groove * 9;
    z += dz * wf * F;

    // Hair: lifted off the skull above a hairline that drops behind the ears.
    let hair = 0;
    if (S.hair !== 'bald') {
      const line = Z > 0 ? 0.62 * Math.pow(Z, 0.75) + 0.02 : -0.6 * Math.pow(-Z, 0.8) + 0.02;
      hair = ramp(line - 0.03, line + 0.05, Y);
      if (hair > 0) {
        let lock: number;
        if (S.hair === 'curls') lock = 0.35 + 0.65 * Math.pow(noise3(x * 11 + sd, y * 11, z * 11), 1.6) * 1.6;
        else if (S.hair === 'parted') lock = 0.55 + 0.3 * Math.sin(Math.atan2(Y - 0.2, Z + 0.3) * 13 + Math.sin(ax * 9) * 1.2) - 0.5 * bell(X, 0.035) * ramp(-0.2, 0.3, Z);
        else lock = 0.3 + 0.35 * Math.sin(az * 15 + Math.sin(Y * 12 + sd) * 2.2) * Math.sin(Y * 15 + az * 2);
        const lift = hair * (0.055 + 0.07 * lock) * (S.hair === 'crop' ? 0.75 : 1.15);
        x += X * lift; y += Y * lift; z += Z * lift;
        recess += hair * Math.max(0, 0.55 - lock) * 0.9;
      }
    }
    // Beard and moustache push the lower face out and down in clumps.
    if (S.beard > 0 || S.moustache > 0) {
      const clump = 0.55 + 0.45 * Math.sin(az * 17 + Math.sin(Y * 15 + sd) * 2.5) * Math.sin(Y * 19 - az * 3);
      const mouthGap = 1 - bell(X, 0.13) * bell(Y + 0.55, 0.055);
      const area = ramp(-0.22, -0.48, Y) * ramp(-0.35, 0.0, Z) * mouthGap * (1 - 0.75 * bell(X, 0.2) * bell(Y + 0.4, 0.1));
      const amount = S.beard * area * (0.12 + 0.16 * clump);
      x += X * amount * 0.8; z += (Z * 0.7 + 0.25) * amount; y -= amount * (0.5 + 1.3 * S.beard * ramp(-0.55, -0.95, Y));
      const tash = S.moustache * bell(Y + 0.44 + ax * 0.25, 0.045) * ramp(0.34, 0.2, ax) * wf;
      z += tash * (0.07 + 0.05 * clump);
      const fur = Math.min(1, S.beard * area * 1.6 + tash * 1.5);
      hair = Math.max(hair, fur);
      recess += fur * Math.max(0, 0.6 - clump) * 0.8;
    }
    if (S.lumpy > 0) {
      const push = (fbm(x * S.lumpScale + sd, y * S.lumpScale, z * S.lumpScale) - 0.5) * S.lumpy;
      x += X * push; y += Y * push; z += Z * push;
      recess += Math.max(0, -push) * 4;
    }
    for (const cut of S.cuts ?? []) {
      const over = x * cut.n[0] + y * cut.n[1] + z * cut.n[2] - cut.d;
      if (over > 0) {
        const keep = 0.05 * noise3(x * 14 + sd, y * 14, z * 14) + 0.03 * noise3(x * 40, y * 40, z * 40);
        const pull = over - Math.min(over, keep);
        x -= cut.n[0] * pull; y -= cut.n[1] * pull; z -= cut.n[2] * pull;
        scarred = Math.max(scarred, ramp(0, 0.03, over));
      }
    }
    if (S.maskCut !== undefined && z < S.maskCut) z = S.maskCut;
    info.hair = hair; info.scar = scarred; info.recess = Math.min(1, recess);
    return out.set(x * S.size, y * S.size, z * S.size);
  };

  const nu = Math.round(132 * S.res), nv = Math.round(104 * S.res);
  const position = new Float32Array((nu + 1) * (nv + 1) * 3), colour = new Float32Array((nu + 1) * (nv + 1) * 3), uv = new Float32Array((nu + 1) * (nv + 1) * 2);
  const p = new THREE.Vector3(), c = new THREE.Color();
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const a = (i / nu) * 2 - 1;
      // Samples crowd toward the face, where the detail is.
      const az = Math.PI * (0.5 * a + 0.5 * a * a * a);
      const th = (j / nv) * Math.PI;
      surf(az, th, p);
      const k = i + j * (nu + 1);
      p.toArray(position, k * 3);
      uv[k * 2] = az / (Math.PI * 2) + 0.5; uv[k * 2 + 1] = 1 - j / nv;
      c.copy(base).lerp(hairTint, info.hair);
      const grime = fbm(p.x / S.size * 2.3 + sd, p.y / S.size * 2.3, p.z / S.size * 2.3);
      c.lerp(mottle, S.mottleAmount * ramp(0.35, 0.75, grime));
      c.lerp(cavity, Math.min(1, info.recess * S.cavityAmount * (0.6 + grime)));
      c.lerp(scar, info.scar);
      c.toArray(colour, k * 3);
    }
  const index: number[] = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const k = i + j * (nu + 1);
      index.push(k, k + nu + 1, k + 1, k + 1, k + nu + 1, k + nu + 2);
    }
  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  for (let j = 0; j <= nv; j++) {
    const k0 = j * (nu + 1), k1 = k0 + nu;
    const n = new THREE.Vector3().fromBufferAttribute(normal, k0).add(new THREE.Vector3().fromBufferAttribute(normal, k1)).normalize();
    normal.setXYZ(k0, n.x, n.y, n.z); normal.setXYZ(k1, n.x, n.y, n.z);
  }
  if (S.ears && S.maskCut === undefined) {
    const parts = [geometry];
    for (const side of [-1, 1]) {
      const ear = new THREE.SphereGeometry(1, 12, 10);
      ear.applyMatrix4(new THREE.Matrix4().makeRotationY(side * 0.35).multiply(new THREE.Matrix4().makeRotationZ(side * -0.12)).multiply(new THREE.Matrix4().makeScale(0.055, 0.2, 0.12)));
      ear.translate(side * 0.76, -0.02, -0.12);
      const inCut = (S.cuts ?? []).some((cut) => side * 0.76 * cut.n[0] - 0.02 * cut.n[1] - 0.12 * cut.n[2] - cut.d > -0.1);
      if (inCut) { ear.dispose(); continue; }
      ear.scale(S.size, S.size * S.long, S.size);
      const count = ear.attributes.position.count, tint = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) base.toArray(tint, i * 3);
      ear.setAttribute('color', new THREE.BufferAttribute(tint, 3));
      parts.push(ear);
    }
    const merged = mergeGeometries(parts, false)!;
    for (const part of parts) part.dispose();
    geometry = merged;
  }

  /** A point on the face and its outward normal, from face coordinates on the unit sphere. */
  const at = (X: number, Y: number) => {
    const point = (px: number, py: number, out: THREE.Vector3) => {
      const Z = Math.sqrt(Math.max(0.0001, 1 - px * px - py * py));
      return surf(Math.atan2(px, Z), Math.acos(Math.max(-1, Math.min(1, py))), out);
    };
    const here = point(X, Y, new THREE.Vector3());
    const dx = point(X + 0.02, Y, new THREE.Vector3()).sub(here), dy = point(X, Y + 0.02, new THREE.Vector3()).sub(here);
    return { p: here, n: dx.cross(dy).normalize() };
  };
  return { geometry, at };
}

export interface BustOpts {
  size: number; broad?: number; drape?: number; seed?: number; nude?: boolean;
  base: Tint; cavity?: Tint; cavityAmount?: number; mottle?: Tint; mottleAmount?: number;
  cuts?: readonly { n: readonly [number, number, number]; d: number }[]; scar?: Tint;
}

/** Neck, shoulders and chest of a classical bust, in the same space as headForm. Bottom at y = -2.85 × size. */
export function bustForm(o: BustOpts) {
  const broad = o.broad ?? 1, drape = o.drape ?? 1, sd = ((o.seed ?? 1) % 977) * 1.37;
  const base = new THREE.Color(o.base), cavity = new THREE.Color(o.cavity ?? o.base), mottle = new THREE.Color(o.mottle ?? o.base), scar = new THREE.Color(o.scar ?? o.base);
  const profile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.4, -0.5, 0.44), new THREE.Vector3(0.4, -0.95, 0.44), new THREE.Vector3(0.45, -1.3, 0.46),
    new THREE.Vector3(0.85 * broad, -1.5, 0.56), new THREE.Vector3(1.3 * broad, -1.8, 0.72), new THREE.Vector3(1.32 * broad, -2.2, 0.8),
    new THREE.Vector3(1.0 * broad, -2.58, 0.68), new THREE.Vector3(0.5, -2.79, 0.42), new THREE.Vector3(0.3, -2.85, 0.3),
  ], false, 'catmullrom', 0.4);
  const nu = 72, nv = 56;
  const count = (nu + 1) * (nv + 1) + 1;
  const position = new Float32Array(count * 3), colour = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const r = new THREE.Vector3(), c = new THREE.Color();
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    profile.getPoint(v, r);
    for (let i = 0; i <= nu; i++) {
      const az = (i / nu) * Math.PI * 2, sx = Math.sin(az), cz = Math.cos(az);
      const body = ramp(-1.35, -1.7, r.y) * ramp(-2.84, -2.6, r.y);
      const fold = Math.sin(Math.abs(sx) * 9 + (r.y + 2) * 5.5 + Math.sin(az * 3 + sd) * 1.2 + (cz < 0 ? 2 : 0));
      const swell = 1 + body * drape * (0.05 * fold + 0.03) + (o.nude ? 0 : 0);
      // Square the section a little so the shoulders read as shoulders, with a fuller chest.
      const sq = 1 / Math.pow(Math.pow(Math.abs(sx), 2.6) + Math.pow(Math.abs(cz), 2.6), 1 / 2.6);
      let x = sx * r.x * sq * swell, y = r.y + body * 0.12 * (1 - Math.abs(sx)) * (cz > 0 ? 1 : 0.3), z = cz * r.z * sq * swell * (cz > 0 ? 1.12 : 1) - 0.1 - body * 0.06;
      let scarred = 0;
      for (const cut of o.cuts ?? []) {
        const over = x * cut.n[0] + y * cut.n[1] + z * cut.n[2] - cut.d;
        if (over > 0) {
          const keep = 0.05 * noise3(x * 14 + sd, y * 14, z * 14);
          const pull = over - Math.min(over, keep);
          x -= cut.n[0] * pull; y -= cut.n[1] * pull; z -= cut.n[2] * pull;
          scarred = ramp(0, 0.03, over);
        }
      }
      const k = i + j * (nu + 1);
      position[k * 3] = x * o.size; position[k * 3 + 1] = y * o.size; position[k * 3 + 2] = z * o.size;
      uv[k * 2] = i / nu; uv[k * 2 + 1] = 1 - v;
      const grime = fbm(x * 2.3 + sd, y * 2.3, z * 2.3);
      c.copy(base).lerp(mottle, (o.mottleAmount ?? 0) * ramp(0.35, 0.75, grime));
      c.lerp(cavity, Math.min(1, body * drape * Math.max(0, -fold) * (o.cavityAmount ?? 0) * (0.5 + grime)));
      c.lerp(scar, scarred);
      c.toArray(colour, k * 3);
    }
  }
  const last = count - 1;
  position[last * 3 + 1] = -2.85 * o.size; position[last * 3 + 2] = -0.1 * o.size;
  base.toArray(colour, last * 3);
  const index: number[] = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const k = i + j * (nu + 1);
      index.push(k, k + nu + 1, k + 1, k + 1, k + nu + 1, k + nu + 2);
    }
  for (let i = 0; i < nu; i++) index.push(nv * (nu + 1) + i, last, nv * (nu + 1) + i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  for (let j = 0; j <= nv; j++) {
    const k0 = j * (nu + 1), k1 = k0 + nu;
    const n = new THREE.Vector3().fromBufferAttribute(normal, k0).add(new THREE.Vector3().fromBufferAttribute(normal, k1)).normalize();
    normal.setXYZ(k0, n.x, n.y, n.z); normal.setXYZ(k1, n.x, n.y, n.z);
  }
  return geometry;
}

/** A canvas painted once and used as a colour map. */
export function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
