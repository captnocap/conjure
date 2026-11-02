import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';

export type CrowPose = 'perched' | 'cawing' | 'preening' | 'takeoff' | 'staring' | 'hunched' | 'pecking';

export interface Crow {
  root: THREE.Group;
  head: THREE.Group;
  /** A point in front of the beak tip, in the crow's own space, for things it holds. */
  beak: THREE.Object3D;
  wings: THREE.Group[];
  pose: CrowPose;
}

function wingShape(length: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.02);
  shape.quadraticCurveTo(length * 0.35, 0.09, length * 0.6, 0.08);
  // Splayed primary feathers: the fingers of a crow's wing.
  const fingers = 5;
  for (let i = 0; i < fingers; i++) {
    const t = i / (fingers - 1);
    const x = length * (0.62 + 0.38 * Math.cos(t * 1.1));
    const y = 0.08 - t * 0.11;
    shape.lineTo(x, y + 0.012);
    shape.lineTo(x - length * 0.1, y - 0.006);
  }
  shape.quadraticCurveTo(length * 0.35, -0.06, 0, -0.03);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 4);
  // ShapeGeometry is in xy; lay it flat in xz with the leading edge toward +z.
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/**
 * A crow about 0.45 m beak to tail, standing on y = 0 at the origin facing +z. Glossy black with a
 * faint blue sheen. `look` is the yaw the head should turn (radians) relative to the body.
 */
export function crow(s: Sculpture, pose: CrowPose, random: () => number, options: { size?: number; look?: number; glint?: boolean } = {}): Crow {
  const black = s.material('#16171c', { roughness: 0.32, metalness: 0.15, emissive: '#0a0c18', emissiveIntensity: 0.4 });
  const beakMat = s.material('#22232a', { roughness: 0.4 });
  const root = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = root) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const upright = pose === 'pecking' ? -0.1 : pose === 'cawing' ? -0.8 : pose === 'hunched' ? -0.45 : pose === 'takeoff' ? -0.3 : -0.7;
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.075, 0);
  bodyGroup.rotation.x = upright;
  root.add(bodyGroup);
  const body = add(new THREE.SphereGeometry(1, 16, 12), black, bodyGroup);
  body.scale.set(0.085, pose === 'hunched' ? 0.1 : 0.088, 0.16);
  body.position.set(0, 0.06, 0);
  // Tail: a tapered wedge behind.
  const tail = add(new THREE.CylinderGeometry(0.045, 0.012, 0.17, 4, 1), black, bodyGroup);
  tail.scale.set(1, 0.25, 1);
  tail.rotation.set(Math.PI / 2, 0, Math.PI / 4);
  tail.position.set(0, 0.03, -0.21);
  tail.rotation.x = Math.PI / 2 + 0.25;
  // Folded wings along the flanks.
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.06, 0.09, 0.06);
    bodyGroup.add(pivot);
    if (pose === 'takeoff') {
      const wing = add(wingShape(0.36), black, pivot);
      wing.scale.x = side;
      (wing.material as THREE.Material).side = THREE.DoubleSide;
      pivot.rotation.z = side * (0.5 + random() * 0.4);
      pivot.rotation.x = -upright;
    } else {
      const folded = add(new THREE.SphereGeometry(1, 12, 8), black, pivot);
      folded.scale.set(0.035, 0.07, 0.17);
      folded.position.set(side * 0.01, -0.02, -0.08);
      folded.rotation.x = -0.1;
      if (pose === 'hunched') pivot.rotation.z = side * 0.25;
    }
    wings.push(pivot);
  }
  // Head on a neck pivot so it can bob and turn.
  const head = new THREE.Group();
  // The head sits on the front-top of the tilted body.
  head.position.set(0, 0.075 + 0.07 * Math.cos(upright) - 0.15 * Math.sin(upright) + 0.03, 0.07 * Math.sin(upright) + 0.15 * Math.cos(upright));
  root.add(head);
  add(new THREE.SphereGeometry(0.06, 14, 10), black, head).scale.set(0.95, 1, 1.15);
  const beak = new THREE.Group();
  beak.position.set(0, -0.005, 0.05);
  head.add(beak);
  const upper = add(new THREE.ConeGeometry(0.024, 0.095, 8), beakMat, beak);
  upper.rotation.x = Math.PI / 2;
  upper.scale.set(1, 1, 0.75);
  upper.position.set(0, 0.004, 0.04);
  if (pose === 'cawing') {
    upper.rotation.x = Math.PI / 2 - 0.25;
    const lower = add(new THREE.ConeGeometry(0.016, 0.075, 8), beakMat, beak);
    lower.rotation.x = Math.PI / 2 + 0.35;
    lower.position.set(0, -0.012, 0.034);
  }
  const tip = new THREE.Object3D();
  tip.position.set(0, -0.005, 0.085);
  beak.add(tip);
  // Eyes: dark beads, with a glint when staring.
  const eyeMat = options.glint ? s.material('#f2efe2', { emissive: '#f2efe2', emissiveIntensity: 0.6 }) : s.material('#3a3328', { roughness: 0.2 });
  for (const side of [-1, 1]) {
    const eye = add(new THREE.SphereGeometry(0.009, 8, 6), eyeMat, head);
    eye.position.set(side * 0.045, 0.015, 0.03);
  }
  // Legs and toes.
  if (pose !== 'takeoff') {
    for (const side of [-1, 1]) {
      const leg = add(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 5), beakMat);
      leg.position.set(side * 0.03, 0.045, 0.01);
      for (const turn of [-0.5, 0, 0.5]) {
        const toe = add(new THREE.CylinderGeometry(0.004, 0.003, 0.05, 4), beakMat);
        toe.rotation.set(Math.PI / 2, 0, 0);
        toe.rotation.y = turn;
        toe.position.set(side * 0.03 + Math.sin(turn) * 0.02, 0.004, 0.01 + Math.cos(turn) * 0.02);
      }
    }
  } else {
    for (const side of [-1, 1]) {
      const leg = add(new THREE.CylinderGeometry(0.006, 0.005, 0.1, 5), beakMat);
      leg.rotation.x = 0.7;
      leg.position.set(side * 0.03, 0.04, -0.03);
    }
  }
  // Pose the head.
  if (pose === 'cawing') { head.rotation.x = -0.5; }
  if (pose === 'preening') { head.rotation.set(0.6, (random() < 0.5 ? 1 : -1) * 2.3, 0); head.position.z -= 0.06; head.position.y -= 0.03; }
  if (pose === 'hunched') { head.position.y -= 0.04; }
  if (pose === 'pecking') { head.rotation.x = 1.1; head.position.y -= 0.05; head.position.z += 0.03; }
  if (options.look !== undefined && pose !== 'preening') head.rotation.y = options.look;
  root.scale.setScalar(options.size ?? 1);
  return { root, head, beak: tip, wings, pose };
}

/** Make a crow move: heads bob and turn now and then; a crow taking off flaps. */
export function animateCrows(crows: Crow[], energy: number) {
  const rests = crows.map((c) => ({ y: c.head.position.y, ry: c.head.rotation.y, wings: c.wings.map((w) => w.rotation.z) }));
  return (time: number) => {
    crows.forEach((c, i) => {
      const r = rests[i];
      const bob = Math.max(0, Math.sin(time * (2 + energy * 5) + i * 1.7));
      c.head.position.y = r.y - bob * bob * 0.012 * (0.3 + energy);
      if (c.pose !== 'preening') c.head.rotation.y = r.ry + Math.sin(time * 0.6 + i * 2.1) * 0.25 * energy;
      if (c.pose === 'takeoff') c.wings.forEach((w, k) => { w.rotation.z = r.wings[k] + Math.sin(time * (6 + energy * 10)) * 0.5 * (k ? 1 : -1); });
    });
  };
}
