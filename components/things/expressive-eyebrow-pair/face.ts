import * as THREE from 'three';

/** Lids, lashes and a slip of skin around a painted eyeball. Copied between this owner's face-part components. */

export const SKIN_TONES = {
  porcelain: 'Very pale, cool porcelain with a pink flush.',
  fair: 'Fair and warm, lightly freckled.',
  olive: 'Olive, golden in the light.',
  tan: 'Warm tan brown.',
  umber: 'Deep umber brown.',
  ebony: 'Very dark, blue-black in the shadows.',
} as const;
export const SKIN_COLOUR: Record<keyof typeof SKIN_TONES, string> = {
  porcelain: '#f1d6c8', fair: '#e6bc9c', olive: '#c99a6c', tan: '#a8734a', umber: '#734628', ebony: '#3f2a20',
};

export function almond(x: number, y: number, half: number, up: number, down: number) {
  const path = new THREE.Path();
  path.moveTo(x - half, y);
  path.bezierCurveTo(x - half * 0.5, y + up * 1.3, x + half * 0.5, y + up * 1.3, x + half, y);
  path.bezierCurveTo(x + half * 0.5, y - down * 1.3, x - half * 0.5, y - down * 1.3, x - half, y);
  return path;
}

/** A flat slip of skin with its front face on z = 0. */
export function skinPlate(outline: THREE.Shape, depth: number, material: THREE.Material) {
  const soft = depth * 0.45;
  const geometry = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: true, bevelThickness: soft, bevelSize: soft, bevelSegments: 3, curveSegments: 28 });
  geometry.translate(0, 0, -depth - soft);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export interface LashSpec {
  count: number;
  /** In eye radii. */
  length: number;
  colour: string;
  /** 0 straight out … 1 swept right up. */
  curl: number;
  /** 0 even … 1 gathered into spidery clumps. */
  clump?: number;
  thick?: number;
}

export interface SocketSpec {
  r: number;
  skin: THREE.Material;
  /** Painted lid, if it differs from the skin. */
  lid?: THREE.Material;
  eye: { group: THREE.Group; ball: THREE.Group };
  /** Radians the upper lid is rolled shut: about -0.65 startled, -0.38 open, 0 half, equal to `lower` when closed. */
  upper: number;
  /** Radians the lower lid is dropped: 0.55 slack, 0.45 normal, 0.2 squinting. */
  lower: number;
  /** Slant of the upper lid in the face plane: positive drops the +x end. */
  tilt?: number;
  lash?: LashSpec;
  lowerLash?: LashSpec;
  rim?: string;
  /** Thickness of the lid margin in radii. */
  rimThick?: number;
  /** Which way the nose is: -1 puts the tear duct on -x. */
  nose: 1 | -1;
  random: () => number;
}

/** Depth of the eye centre behind the skin, in radii. */
export const SET_BACK = 0.62;
export const LID = 1.12;

export function makeSocket(spec: SocketSpec) {
  const { r } = spec;
  const R = r * LID;
  const group = new THREE.Group();
  const centre = new THREE.Group();
  centre.position.z = -r * SET_BACK;
  group.add(centre);
  centre.add(spec.eye.group);

  // Wet lining that shows at the corners of the opening, and the pink bead by the nose.
  const lining = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: '#9c4a4c', roughness: 0.35 }));
  lining.scale.set(r * 1.5, r * 0.9, r * 0.3);
  lining.position.z = -r * 0.42;
  const duct = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 10, 8), new THREE.MeshStandardMaterial({ color: '#d98a8a', roughness: 0.25 }));
  duct.position.set(spec.nose * r * 1.02, -r * 0.04, -r * 0.14);
  group.add(lining, duct);

  const rimPaint = new THREE.MeshStandardMaterial({ color: spec.rim ?? '#c58b80', roughness: 0.45 });
  const lidPaint = spec.lid ?? spec.skin;
  const build = (flip: 1 | -1, lash?: LashSpec) => {
    const lid = new THREE.Group();
    lid.rotation.order = 'ZXY';
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2), flip === 1 ? lidPaint : spec.skin);
    dome.scale.y = flip;
    if (flip === -1) (dome.material as THREE.Material).side = THREE.DoubleSide;
    dome.castShadow = dome.receiveShadow = true;
    const edge = new THREE.Mesh(new THREE.TorusGeometry(R, r * (spec.rimThick ?? 0.055), 6, 36, Math.PI), rimPaint);
    edge.rotation.x = Math.PI / 2;
    lid.add(dome, edge);
    if (lash && lash.count > 0) {
      const long = lash.length * r;
      const hair = new THREE.ConeGeometry(r * (lash.thick ?? 0.028), long, 4);
      hair.translate(0, long / 2, 0);
      const hairs = new THREE.InstancedMesh(hair, new THREE.MeshStandardMaterial({ color: lash.colour, roughness: 0.5 }), lash.count);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), size = new THREE.Vector3();
      for (let i = 0; i < lash.count; i++) {
        let along = (i + 0.5) / lash.count;
        if (lash.clump) along = mix(along, (Math.floor(along * 7) + 0.5) / 7, lash.clump * 0.75);
        const angle = mix(0.42, Math.PI - 0.42, along) + (spec.random() - 0.5) * 0.04;
        const root = new THREE.Vector3(Math.cos(angle) * R, 0, Math.sin(angle) * R);
        // Lashes fan outward and sweep away from the eye; the outer ones lean toward the temple.
        const aim = new THREE.Vector3(Math.cos(angle) * 0.7 - spec.nose * 0.22, flip * (0.25 + lash.curl * 1.1), Math.sin(angle) * 0.9).normalize();
        const grow = 0.7 + 0.3 * Math.sin(along * Math.PI) + (spec.random() - 0.5) * 0.2;
        matrix.compose(root, turn.setFromUnitVectors(up, aim), size.set(1, grow, 1));
        hairs.setMatrixAt(i, matrix);
      }
      hairs.castShadow = true;
      lid.add(hairs);
    }
    centre.add(lid);
    return lid;
  };
  const upperLid = build(1, spec.lash);
  const lowerLid = build(-1, spec.lowerLash);
  const tilt = spec.tilt ?? 0;
  const setUpper = (angle: number) => upperLid.rotation.set(angle, 0, -tilt);
  const setLower = (angle: number) => lowerLid.rotation.set(angle, 0, -tilt * 0.3);
  setUpper(spec.upper);
  setLower(spec.lower);
  return { group, centre, upperLid, lowerLid, setUpper, setLower };
}

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

/** A soft crease or wrinkle drawn on the skin as a thin dark thread through the given points. */
export function crease(points: readonly (readonly [number, number, number])[], radius: number, material: THREE.Material) {
  const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 20, radius, 5), material);
  mesh.scale.z = 0.5;
  return mesh;
}
