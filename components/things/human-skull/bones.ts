import * as THREE from 'three';
import { fuse, lerp, painted, placed, sweep } from './form';

/**
 * Jaws and teeth in "skull units": one unit is the cranium's radius, about 92 mm in a person.
 * The teeth meet near y = -1.11; +z is the front of the face.
 */
export const UNIT = 0.092;

/** A dental arch seen from above: a half ellipse that flares at the back toward the jaw joints. */
export interface Arch { a: number; flare: number; L: number }
export function archAt(arch: Arch, theta: number): [number, number] {
  const k = Math.abs(theta) / (Math.PI / 2);
  return [(arch.a + arch.flare * k * k * k) * Math.sin(theta), arch.L * Math.cos(theta)];
}
/** The angle along the arch that lies a given distance from the midline. */
function thetaAtDistance(arch: Arch, distance: number) {
  let travelled = 0, theta = 0;
  let [px, pz] = archAt(arch, 0);
  while (travelled < distance && theta < Math.PI / 2) {
    theta += 0.004;
    const [x, z] = archAt(arch, theta);
    travelled += Math.hypot(x - px, z - pz);
    px = x; pz = z;
  }
  return theta;
}

export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar' | 'gap';
export interface Tooth { w: number; h: number; kind: ToothKind }
const t = (kind: ToothKind, w: number, h: number): Tooth => ({ kind, w, h });
export const HUMAN_UPPER: readonly Tooth[] = [t('incisor', 0.094, 0.13), t('incisor', 0.074, 0.115), t('canine', 0.084, 0.14), t('premolar', 0.076, 0.1), t('premolar', 0.074, 0.095), t('molar', 0.11, 0.09), t('molar', 0.105, 0.085), t('molar', 0.09, 0.075)];
export const HUMAN_LOWER: readonly Tooth[] = [t('incisor', 0.064, 0.11), t('incisor', 0.068, 0.11), t('canine', 0.078, 0.13), t('premolar', 0.076, 0.1), t('premolar', 0.076, 0.095), t('molar', 0.118, 0.09), t('molar', 0.11, 0.085), t('molar', 0.1, 0.075)];

/** Teeth standing along an arch from a gum line. `grow` is +1 for a lower row, -1 for an upper. */
export function toothRow(
  arch: Arch, row: readonly Tooth[], gum: number, grow: 1 | -1, random: () => number,
  keep: (side: number, index: number) => boolean = () => true, fang = 1,
) {
  const out: { geometry: THREE.BufferGeometry; side: number; index: number }[] = [];
  for (const side of [-1, 1]) {
    let distance = 0;
    row.forEach((tooth, index) => {
      const mid = distance + tooth.w / 2;
      distance += tooth.w;
      if (tooth.kind === 'gap' || !keep(side, index)) return;
      const theta = thetaAtDistance(arch, mid) * side;
      const [x, z] = archAt(arch, theta);
      const [x2, z2] = archAt(arch, theta + 0.01);
      const yaw = Math.atan2(-(z2 - z), x2 - x);
      const canine = tooth.kind === 'canine';
      const h = tooth.h * (canine ? fang : 1) * (0.92 + random() * 0.16);
      const shape = { incisor: [0.5, 0.4, 0.062, 6], canine: [fang > 1.5 ? 0.08 : 0.2, 0.5, 0.085, 7], premolar: [0.42, 0.5, 0.09, 7], molar: [0.47, 0.5, 0.115, 8], gap: [0, 0, 0, 3] }[tooth.kind];
      const g = new THREE.CylinderGeometry(shape[0], shape[1], 1, shape[3]);
      g.translate(0, 0.5, 0);
      g.scale(tooth.w * 0.96, h, shape[2] * (canine && fang > 1.5 ? 1.3 : 1));
      if (grow < 0) g.rotateX(Math.PI);
      g.rotateZ((random() - 0.5) * 0.1);
      g.rotateY(yaw);
      g.translate(x, gum, z);
      out.push({ geometry: g, side, index });
    });
  }
  return out;
}

/** A mottled bone surface: blotches of stain over a base colour. Works on any UV layout. */
export function boneTexture(random: () => number, base: THREE.ColorRepresentation, stainColour: THREE.ColorRepresentation, amount: number) {
  const b = new THREE.Color(base), s = new THREE.Color(stainColour);
  return painted(256, 256, (ctx, w, h) => {
    ctx.fillStyle = `#${b.getHexString()}`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = random() * w, y = random() * h, r = 10 + random() * 46;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const c = random() < 0.75 ? s : b.clone().lerp(new THREE.Color('#fffaf0'), 0.5);
      const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
      g.addColorStop(0, `rgba(${rgb},${(0.1 + random() * 0.5) * amount})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.fillStyle = `rgba(${Math.round(s.r * 255)},${Math.round(s.g * 255)},${Math.round(s.b * 255)},${0.5 * amount})`;
    for (let i = 0; i < 260; i++) ctx.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2);
  });
}

export interface JawSpec {
  arch: Arch;
  /** y of the gum line and of the lower border at the chin. */
  top: number;
  bottom: number;
  /** Body height at the back as a fraction of the height at the chin. */
  taper: number;
  thickness: number;
  /** Outline of each ramus as [z, y] points, counter-clockwise. */
  ramus: readonly (readonly [number, number])[];
  /** 0 a receding ape chin … 1 a jutting human one. */
  chin: number;
}

export const HUMAN_ARCH: Arch = { a: 0.42, flare: 0.1, L: 0.9 };
export function humanRamus(top: number, bottom: number, joint = -0.53): [number, number][] {
  return [
    [-0.15, bottom + 0.03], [-0.2, bottom + 0.2], [-0.17, lerp(bottom, joint, 0.6)], [-0.15, joint - 0.1],
    [-0.16, joint - 0.01], [-0.09, joint + 0.02], [-0.03, joint - 0.05], [0.03, joint - 0.2], [0.11, joint - 0.2],
    [0.18, joint - 0.07], [0.23, joint - 0.04], [0.27, joint - 0.16], [0.3, lerp(joint, top, 0.6)], [0.36, top + 0.02],
    [0.44, top - 0.04], [0.4, bottom + 0.01], [0.1, bottom - 0.02],
  ];
}
export const HUMAN_JAW: JawSpec = { arch: HUMAN_ARCH, top: -1.24, bottom: -1.52, taper: 0.9, thickness: 0.13, ramus: humanRamus(-1.24, -1.52), chin: 1 };

/** The bone of a lower jaw: horseshoe body, two rami with their coronoid points and joint knuckles, and a chin. */
export function mandibleParts(spec: JawSpec) {
  const { arch } = spec;
  const points: THREE.Vector3[] = [];
  const count = 28, reach = Math.PI / 2 * 0.985;
  const heightAt = (k: number) => (spec.top - spec.bottom) * lerp(1, spec.taper, Math.abs(k * 2 - 1));
  for (let i = 0; i <= count; i++) {
    const k = i / count, theta = lerp(-reach, reach, k);
    const [x, z] = archAt(arch, theta);
    points.push(new THREE.Vector3(x, spec.top - heightAt(k) / 2, z));
  }
  const parts: THREE.BufferGeometry[] = [];
  parts.push(sweep(points, (k) => [spec.thickness / 2 * lerp(1, 0.8, Math.abs(k * 2 - 1)), heightAt(k) / 2], { steps: 64, sides: 12 }));
  const outline = new THREE.CatmullRomCurve3(spec.ramus.map(([z, y]) => new THREE.Vector3(z, y, 0)), true, 'catmullrom', 0.4).getPoints(72);
  const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, p.y)));
  const plate = spec.thickness * 0.5;
  const [rx] = archAt(arch, Math.PI / 2);
  for (const side of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: plate, bevelEnabled: true, bevelSize: plate * 0.3, bevelThickness: plate * 0.3, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -plate / 2);
    g.rotateY(-Math.PI / 2);
    g.rotateY(side * -0.1);
    g.translate(side * (rx + 0.005), 0, 0);
    parts.push(g);
    // The joint knuckle at the top of the back edge.
    const joint = spec.ramus.reduce((best, p) => (p[1] > best[1] && p[0] < 0 ? p : best), [-1, -9] as readonly [number, number]);
    parts.push(placed(new THREE.SphereGeometry(1, 10, 8), [side * (rx + 0.01), joint[1] - 0.025, joint[0] - 0.02], [0.105, 0.05, 0.055]));
  }
  if (spec.chin > 0) parts.push(placed(new THREE.SphereGeometry(1, 14, 10), [0, spec.bottom + 0.085, arch.L + 0.005], [0.19, 0.105, 0.045 + 0.045 * spec.chin]));
  return parts;
}

export function mandible(spec: JawSpec, material: THREE.Material) {
  return fuse(mandibleParts(spec), material);
}
