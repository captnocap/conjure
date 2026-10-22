import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type ArchSpot, type ToothKind, archPath, crownGeometry, sweep } from './teeth';

/** Arch-level helpers shared (by copy) between the dental components. Any unit; callers here work in millimetres. */
export const ARCH_REVISION = 'REV_arch_1';

/** Crown height and depth for each kind of tooth, millimetres. */
export const CROWN: Record<ToothKind, readonly [number, number]> = {
  incisor: [10.5, 7], canine: [11, 8], premolar: [8.2, 8], molar: [7.4, 10.2], fang: [16, 7], block: [10, 7],
};

export const LOWER: readonly (readonly [ToothKind, number])[] = [
  ['incisor', 5.6], ['incisor', 6.0], ['canine', 7.0], ['premolar', 7.0], ['premolar', 7.2], ['molar', 10.8], ['molar', 10.2],
];

export interface ToothPlan {
  kind?: ToothKind;
  skip?: boolean;
  /** Along the tooth's own long axis, away from the gum. */
  lift?: number;
  /** Outward from the arch. */
  push?: number;
  turn?: number;
  tilt?: number;
  lean?: number;
  tall?: number;
  wide?: number;
  deep?: number;
  worn?: number;
  shade?: (t: number, u: number, w: number) => THREE.ColorRepresentation;
}

export interface PlacedTooth { spot: ArchSpot; kind: ToothKind; matrix: THREE.Matrix4; width: number; height: number; depth: number }

/**
 * Every crown of an arch merged into one geometry. Necks sit at y = 0 and crowns rise to +y;
 * with `flip` they hang to -y instead (an upper arch), still facing outward.
 */
export function archTeeth(spots: readonly ArchSpot[], plan: (spot: ArchSpot) => ToothPlan, options: { scale?: number; flip?: boolean; detail?: number } = {}) {
  const scale = options.scale ?? 1, sign = options.flip ? -1 : 1;
  const parts: THREE.BufferGeometry[] = [];
  const placed: PlacedTooth[] = [];
  for (const spot of spots) {
    const p = plan(spot);
    if (p.skip) continue;
    const kind = p.kind ?? spot.kind;
    const lateral = spot.kind === 'incisor' && spot.order === 1 ? 0.9 : 1;
    const width = spot.width * (p.wide ?? 0.95), height = CROWN[kind][0] * scale * lateral * (p.tall ?? 1), depth = CROWN[kind][1] * scale * (p.deep ?? 1);
    const geometry = crownGeometry(kind, width, height, depth, { detail: options.detail ?? 5, worn: p.worn, shade: p.shade });
    const turn = spot.turn + (p.turn ?? 0);
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.tilt ?? 0, turn, (p.lean ?? 0) + (options.flip ? Math.PI : 0), 'YXZ'));
    const push = p.push ?? 0;
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(spot.x + Math.sin(spot.turn) * push, sign * (p.lift ?? 0), spot.z + Math.cos(spot.turn) * push), rotation, new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(matrix);
    parts.push(geometry);
    placed.push({ spot, kind, matrix, width, height, depth });
  }
  const geometry = parts.length ? mergeGeometries(parts) : null;
  parts.forEach((part) => part.dispose());
  return { geometry, placed };
}

/** A gum ridge following the arch: `high` and `thick` are full sizes; its top surface is at `top`. */
export function gumRidge(a: number, b: number, reach: number, top: number, high: number, thick: number, color: (t: number) => THREE.ColorRepresentation, options: { inset?: number; flip?: boolean; scallop?: number } = {}) {
  const y = options.flip ? top + high / 2 : top - high / 2;
  const waves = options.scallop ?? 0;
  return sweep(archPath(a, b, reach, y, 40, options.inset ?? 0), (t) => {
    const end = 1 - 0.35 * Math.pow(Math.abs(t - 0.5) * 2, 10);
    return [high / 2 * end * (1 + 0.05 * Math.cos(t * Math.PI * 2 * waves)), thick / 2 * end];
  }, { radial: 14, steps: 56, color });
}

/** A point on the front face of a placed tooth, `up` of the way from neck to edge, standing `out` proud of the enamel. */
export function facePoint(tooth: PlacedTooth, up = 0.5, out = 0, across = 0): THREE.Vector3 {
  const face = tooth.kind === 'molar' || tooth.kind === 'premolar' || tooth.kind === 'block' ? 0.44 : tooth.kind === 'fang' ? 0.3 : 0.4 - (up - 0.5) * 0.3;
  return new THREE.Vector3(across * tooth.width, tooth.height * up, tooth.depth * face + out).applyMatrix4(tooth.matrix);
}
