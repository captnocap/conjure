import * as THREE from 'three';
import { type Sculpture, mix } from '@conjure/kit';

/** A slab of brown monsoon floodwater that the thing stands in, so it reads as flooded on any stage. */
export interface Flood {
  readonly level: number;
  /** Concentric rings where something breaks the surface. */
  ripple(x: number, z: number, radius: number, count?: number): void;
  /** A V of wake streaks trailing behind something that is drifting toward +x. */
  wake(x: number, z: number, length: number, spread: number): void;
  /** Sink an object so that `sunk` metres of it sit under the surface, never below the street. */
  float(object: THREE.Object3D, sunk: number): void;
  update(dt: number, time: number): void;
}

export function floodColour(s: Sculpture) {
  const { mood } = s.context;
  return new THREE.Color('#7a6650')
    .lerp(new THREE.Color('#a98c5f'), mood.cheer * 0.55)
    .lerp(new THREE.Color('#9a6f42'), mood.warmth * 0.3)
    .lerp(new THREE.Color('#5d564c'), (1 - mood.cheer) * 0.25);
}

export function flood(s: Sculpture, rx: number, rz: number, level: number): Flood {
  const { mood, random } = s.context;
  const phases = [random() * 6.28, random() * 6.28, random() * 6.28];
  const shape = new THREE.Shape();
  const steps = 64;
  const edge = (t: number) => 1 + 0.055 * Math.sin(2 * t + phases[0]) + 0.04 * Math.sin(3 * t + phases[1]) + 0.025 * Math.sin(5 * t + phases[2]);
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = Math.cos(t) * rx * edge(t), y = Math.sin(t) * rz * edge(t);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const bevel = Math.min(0.03, level * 0.2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: level - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  const colour = floodColour(s);
  const water = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.28, metalness: 0.05 }));
  water.receiveShadow = true;
  s.root.add(water);

  // Long glints and darker drifts lying on the surface, so it reads as water and not as mud.
  const inside = (x: number, z: number, margin: number) => (x / (rx - margin)) ** 2 + (z / (rz - margin)) ** 2 < 0.8;
  const glint = new THREE.MeshStandardMaterial({ color: colour.clone().lerp(new THREE.Color('#e9e4d2'), 0.5), roughness: 0.2 });
  const murk = new THREE.MeshStandardMaterial({ color: colour.clone().multiplyScalar(0.72), roughness: 0.4 });
  const streakCount = Math.round(mix(10, 26, mood.energy) * Math.min(3, Math.max(0.5, rx * rz * 0.5)));
  for (const [material, share, lift] of [[glint, 0.55, 0.004], [murk, 0.45, 0.003]] as const) {
    const count = Math.max(3, Math.round(streakCount * share));
    const mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14), material, count);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), scale = new THREE.Vector3(), at = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      let x = 0, z = 0;
      for (let attempt = 0; attempt < 8; attempt++) {
        x = (random() * 2 - 1) * rx; z = (random() * 2 - 1) * rz;
        if (inside(x, z, 0.25)) break;
        x = 0; z = 0;
      }
      const long = mix(0.08, 0.3, random()) * Math.min(rx, 2.2);
      scale.set(long, mix(0.008, 0.022, random()) * Math.min(rx, 2.2), 1);
      matrix.compose(at.set(x, level + lift, z), turn, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    s.root.add(mesh);
  }

  // Leaves and scraps: more of them when the scene is crowded.
  const scraps = Math.round(mix(4, 26, mood.density) * Math.min(2.5, Math.max(0.6, rx * rz * 0.4)));
  const leaf = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide }), scraps);
  const tints = ['#6f7a3a', '#8a7a35', '#59452c', '#a2893f', '#4c5a2e', '#b9b3a0'];
  {
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
    for (let i = 0; i < scraps; i++) {
      let x = 0, z = 0;
      for (let attempt = 0; attempt < 8; attempt++) {
        x = (random() * 2 - 1) * rx; z = (random() * 2 - 1) * rz;
        if (inside(x, z, 0.15)) break;
      }
      if (!inside(x, z, 0.15)) { x *= 0.4; z *= 0.4; }
      const size = mix(0.02, 0.05, random()) * Math.min(1.6, Math.max(0.8, rx * 0.6));
      turn.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, random() * 6.28));
      matrix.compose(at.set(x, level + 0.006, z), turn, scale.set(size * 1.7, size * 0.8, 1));
      leaf.setMatrixAt(i, matrix);
      leaf.setColorAt(i, new THREE.Color(tints[Math.floor(random() * tints.length)]));
    }
    leaf.instanceMatrix.needsUpdate = true;
    if (leaf.instanceColor) leaf.instanceColor.needsUpdate = true;
    s.root.add(leaf);
  }

  const rings: THREE.Mesh[] = [];
  const foam = new THREE.MeshStandardMaterial({ color: colour.clone().lerp(new THREE.Color('#efe9d6'), 0.62), roughness: 0.3, side: THREE.DoubleSide });
  return {
    level,
    ripple(x, z, radius, count = 2) {
      for (let i = 0; i < count; i++) {
        const r = radius * (1 + i * 0.42);
        const width = Math.max(0.006, radius * 0.045) * (1 - i * 0.25);
        const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + width, 40), foam);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, level + 0.005 + i * 0.0005, z);
        s.root.add(ring);
        rings.push(ring);
      }
    },
    wake(x, z, length, spread) {
      for (const side of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const streak = new THREE.Mesh(new THREE.CircleGeometry(1, 12), foam);
          streak.scale.set(length * (0.5 - i * 0.1), length * 0.02, 1);
          streak.rotation.set(-Math.PI / 2, 0, side * (0.22 + i * 0.12));
          streak.position.set(x - length * (0.45 + i * 0.12), level + 0.0045, z + side * spread * (0.5 + i * 0.5));
          s.root.add(streak);
        }
    },
    float(object, sunk) {
      object.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(object);
      object.position.y += Math.max(0.01, level - sunk) - box.min.y;
    },
    update(_dt, time) {
      const swell = mix(0.01, 0.07, mood.energy);
      rings.forEach((ring, index) => ring.scale.setScalar(1 + Math.sin(time * 1.3 + index * 1.7) * swell));
    },
  };
}
