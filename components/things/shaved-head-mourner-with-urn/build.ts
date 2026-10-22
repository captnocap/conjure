import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];
const RAD = Math.PI / 180;

/** Reach the figure's joints through its hands and pelvis, so a pose can be adjusted after it is built. */
function rig(person: Figure) {
  const isJoint = (node: THREE.Object3D) => (node as THREE.Group).isGroup;
  const arm = (side: 'left' | 'right') => {
    const wrist = person.hands[side].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
    return { shoulder, elbow, wrist };
  };
  const spine = person.pelvis.children.find((node) => isJoint(node) && node.position.y > 0)!;
  return { spine, left: arm('left'), right: arm('right') };
}

export default defineThing({
  questions: {
    pours: choice('What pours from the urn?', {
      ashes: 'A thin grey stream of ash and bone-grit, a small grey drift where it lands.',
      marigolds: 'Marigold petals, orange and yellow tumbling onto grey stone.',
      milk: 'Milk, white and quick, pooling pale on the stone.',
      water: 'River water carried up and given back, dark where it wets the step.',
    }),
    stance: choice('How does he stand?', {
      standing: 'Standing, bent a little at the waist, the urn held out over the ground.',
      kneeling: 'Kneeling on the wet stone, the urn tipped almost at the ground.',
    }),
    companion: noul('Does a second relative stand behind him with a hand on his shoulder?'),
    wears: choice('What does he wear?', {
      dhoti: 'A white dhoti and a bare chest, a sacred thread across it.',
      kurta: 'A white kurta over a white dhoti.',
      shawl: 'A white dhoti and a beige shawl drawn round the shoulders.',
    }),
    age: score('How old is he?', ['A boy of ten', 'A young man', 'Middle-aged', 'Old and stooped']),
    leafcup: noul('Does a leaf-cup lamp with a small flame float at his feet?'),
    feet: choice('What lies at his feet?', {
      nothing: 'Nothing: bare wet stone.',
      garland: 'The marigold garland from the bier, lying in a loop.',
      sandals: 'His sandals, taken off and set side by side.',
      shards: 'A clay pot broken into shards, as the rite requires.',
      plate: 'A brass plate of rice balls and a folded white cloth.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.25, 1.72, Math.min(1, a.age * 1.4)) * (a.age > 0.8 ? 0.96 : 1);
    const white = '#ebe6da', beige = '#d8c7a4';
    const skin = ['#6b4a33', '#8a5a3c', '#5a3a28', '#a06c48'][Math.floor(random() * 4)];
    const fade = 1 - mood.cheer * 0.5;
    const petalColour = (base: string) => new THREE.Color(base).lerp(new THREE.Color('#8f8a80'), (1 - mood.cheer) * 0.45 * fade);
    const person = figure(s, {
      height: H, build: a.age > 0.8 ? 'slight' : 'average', style: 'doll', hair: 'none', skin,
      pose: a.stance === 'kneeling' ? 'kneeling' : 'standing',
      top: a.wears === 'kurta' ? white : skin, bottom: white, shoes: skin, sleeves: a.wears === 'kurta' ? 'long' : 'short',
      gaze: 'up', // the kit's neck tilts the other way from its name: 'up' lowers the head
    });
    s.root.add(person.root);
    const joints = rig(person);
    // Both hands forward and low, meeting on the urn; a bend at the waist; a stoop with age.
    const stoop = a.age > 0.75 ? 10 : 0;
    joints.spine.rotation.x = (a.stance === 'kneeling' ? 22 : 14 + stoop) * RAD;
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? 1 : -1;
      joints[side].shoulder.rotation.set(-(a.stance === 'kneeling' ? 48 : 38) * RAD, 0, sign * -4 * RAD);
      joints[side].elbow.rotation.set(-(a.stance === 'kneeling' ? 10 : 28) * RAD, sign * 22 * RAD, 0);
    }
    person.root.updateMatrixWorld(true);
    const left = person.hands.left.getWorldPosition(new THREE.Vector3());
    const right = person.hands.right.getWorldPosition(new THREE.Vector3());
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    const headWorld = person.head.getWorldPosition(new THREE.Vector3());
    const headR = H * 0.064;

    const brass = s.material('#c9962e', { metalness: 0.75, roughness: 0.3 });
    const cloth = s.material(white, { roughness: 0.9 });
    // Sacred thread, or a shawl.
    if (a.wears === 'dhoti') {
      const thread = s.box([0.012, 0.44 * H / 1.7, 0.012], [hips.x - 0.03, hips.y + 0.23 * H / 1.7, hips.z + 0.075 * H / 1.7], s.material('#f4f1e6'));
      thread.rotation.set(0.15, 0, 0.5);
    }
    if (a.wears === 'shawl') {
      const neckY = headWorld.y - headR * 1.3;
      const shawl = s.mesh(new THREE.ConeGeometry(0.2 * H / 1.7, 0.34 * H / 1.7, 18, 1, true), s.material(beige, { roughness: 0.95, side: THREE.DoubleSide }), [hips.x, neckY - 0.14 * H / 1.7, hips.z - 0.01]);
      shawl.rotation.x = joints.spine.rotation.x * 0.6;
      shawl.scale.z = 0.8;
    }

    // The urn, tipped from the hands, and whatever falls from it.
    const urnAt = new THREE.Vector3().addVectors(left, right).multiplyScalar(0.5);
    urnAt.y -= 0.03; urnAt.z += 0.04;
    const urn = new THREE.Group();
    const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.045, 0], [0.07, 0.03], [0.075, 0.08], [0.06, 0.12], [0.045, 0.14], [0.055, 0.16], [0.06, 0.165], [0.045, 0.165], [0.04, 0.15], [0, 0.15]].map(([x, y]) => new THREE.Vector2(x, y)), 24), brass);
    body.castShadow = true;
    urn.add(body);
    urn.position.copy(urnAt);
    urn.rotation.x = 62 * RAD;
    urn.rotation.z = -0.1;
    s.root.add(urn);
    urn.updateMatrixWorld(true);
    const mouth = new THREE.Vector3(0, 0.165, 0).applyMatrix4(urn.matrixWorld);
    const landing: P = [mouth.x + 0.02, 0, mouth.z + 0.14];
    const drop = Math.max(0.05, mouth.y);
    const streamColour = { ashes: '#b9b4a8', marigolds: '#e8882a', milk: '#f5f1e6', water: '#9fb6bb' }[a.pours];
    const stream = s.mesh(new THREE.CylinderGeometry(0.004, a.pours === 'ashes' ? 0.022 : 0.012, drop, 8, 1, true), new THREE.MeshStandardMaterial({ color: streamColour, transparent: true, opacity: a.pours === 'marigolds' ? 0.25 : 0.5, depthWrite: false, side: THREE.DoubleSide }), [(mouth.x + landing[0]) / 2, mouth.y / 2, (mouth.z + landing[2]) / 2]);
    stream.castShadow = false;
    stream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(mouth.x - landing[0], mouth.y, mouth.z - landing[2]).normalize());
    const petals: THREE.InstancedMesh | null = a.pours === 'marigolds' || a.feet === 'garland' ? new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), 26) : null;
    const falling: { x: number; y: number; z: number; size: number; phase: number }[] = [];
    if (petals) {
      const matrix = new THREE.Matrix4();
      let index = 0;
      const put = (x: number, y: number, z: number, size: number, colour: THREE.Color) => {
        matrix.makeScale(size, size * 0.5, size).setPosition(x, y, z);
        petals.setMatrixAt(index, matrix);
        petals.setColorAt(index, colour);
        index++;
      };
      if (a.pours === 'marigolds') for (let i = 0; i < 12; i++) {
        const t = random();
        falling.push({ x: mix(mouth.x, landing[0], t) + (random() - 0.5) * 0.04, y: mix(mouth.y, 0.01, t), z: mix(mouth.z, landing[2], t) + (random() - 0.5) * 0.04, size: 0.012 + random() * 0.008, phase: random() * 6.3 });
      }
      for (const petal of falling) put(petal.x, petal.y, petal.z, petal.size, petalColour(random() < 0.6 ? '#f0831a' : '#f2b21c'));
      if (a.feet === 'garland') for (let i = 0; i < 14; i++) {
        const t = (i / 14) * Math.PI * 2;
        put(hips.x + 0.3 + Math.cos(t) * 0.16, 0.014, hips.z + 0.42 + Math.sin(t) * 0.1, 0.02, petalColour(i % 3 ? '#f0831a' : '#f2b21c'));
      }
      petals.count = index;
      petals.instanceMatrix.needsUpdate = true;
      if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
      petals.castShadow = true;
      s.root.add(petals);
    }
    // Where it lands: a drift of ash, a heap of petals, a pale pool, a dark wet patch.
    if (a.pours === 'ashes') s.ball([0.1, 0.02, 0.08], [landing[0], 0.012, landing[2]], s.material('#b0aa9c', { roughness: 1 }), 10);
    if (a.pours === 'marigolds') s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material(petalColour('#ec7a1a'), { roughness: 0.8 }), Array.from({ length: 10 }, () => ({ at: [landing[0] + (random() - 0.5) * 0.14, 0.012, landing[2] + (random() - 0.5) * 0.12] as P, size: 0.012 + random() * 0.008 })));
    if (a.pours === 'milk' || a.pours === 'water') {
      const pool = s.mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshStandardMaterial({ color: a.pours === 'milk' ? '#f3efe4' : '#5f6d6c', transparent: true, opacity: a.pours === 'milk' ? 0.85 : 0.45, depthWrite: false, roughness: 0.2 }), [landing[0], 0.004, landing[2]]);
      pool.rotation.x = -Math.PI / 2;
      pool.scale.x = 1.4;
      pool.castShadow = false;
    }

    // At his feet.
    const footZ = hips.z + 0.3;
    if (a.feet === 'sandals') for (const x of [-1, 1]) {
      s.box([0.08, 0.015, 0.22], [hips.x - 0.3 + x * 0.05, 0.008, footZ + 0.05], s.material('#5a3a22'));
      s.rod([hips.x - 0.3 + x * 0.05 - 0.035, 0.016, footZ + 0.1], [hips.x - 0.3 + x * 0.05 + 0.035, 0.016, footZ + 0.1], 0.004, s.material('#2a1a10'));
    }
    if (a.feet === 'shards') s.scatter(new THREE.TetrahedronGeometry(1, 0), s.material('#9a5a3a', { roughness: 0.95 }), Array.from({ length: 9 }, () => ({ at: [hips.x + 0.35 + (random() - 0.5) * 0.3, 0.02, footZ + 0.1 + (random() - 0.5) * 0.3] as P, size: 0.03 + random() * 0.03 })));
    if (a.feet === 'plate') {
      s.cylinder(0.13, 0.14, 0.012, [hips.x + 0.4, 0.006, footZ + 0.05], brass, 20);
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#f1ead8', { roughness: 1 }), Array.from({ length: 5 }, (_u, i) => ({ at: [hips.x + 0.4 + Math.cos(i * 1.26) * 0.06, 0.035, footZ + 0.05 + Math.sin(i * 1.26) * 0.06] as P, size: 0.028 })));
      s.box([0.22, 0.04, 0.16], [hips.x - 0.42, 0.02, footZ], cloth);
    }
    // A leaf-cup lamp with a tiny flame, set down on the stone.
    let flame: THREE.Mesh | null = null;
    if (a.leafcup) {
      const cup = s.cylinder(0.06, 0.045, 0.03, [hips.x + 0.08, 0.015, footZ + 0.3], s.material('#6f8a3a', { roughness: 0.8, side: THREE.DoubleSide }), 8);
      cup.scale.z = 0.75;
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material(petalColour('#f0831a')), Array.from({ length: 5 }, () => ({ at: [hips.x + 0.08 + (random() - 0.5) * 0.06, 0.034, footZ + 0.3 + (random() - 0.5) * 0.05] as P, size: 0.01 })));
      s.cylinder(0.008, 0.008, 0.02, [hips.x + 0.08, 0.04, footZ + 0.3], s.material('#f4ecd8'), 8);
      flame = s.mesh(new THREE.ConeGeometry(0.012, 0.04, 7), new THREE.MeshStandardMaterial({ color: '#ffe08a', emissive: '#ff9a1a', emissiveIntensity: 2.2, transparent: true, opacity: 0.9, depthWrite: false }), [hips.x + 0.08, 0.07, footZ + 0.3]);
      flame.castShadow = false;
    }

    // The relative behind, one hand on his shoulder.
    let other: Figure | null = null;
    if (a.companion) {
      const H2 = mix(1.55, 1.75, random());
      other = figure(s, { height: H2, style: 'doll', hair: random() < 0.5 ? 'none' : 'short', skin: ['#6b4a33', '#8a5a3c', '#a06c48'][Math.floor(random() * 3)], pose: 'standing', top: white, bottom: white, shoes: '#3a2a20', sleeves: 'long', gaze: 'up' });
      other.root.position.set(hips.x - 0.26 * H / 1.7, 0, hips.z - 0.36);
      other.root.rotation.y = 0.35;
      s.root.add(other.root);
      const joints2 = rig(other);
      // Reach the near shoulder: forward and across, lower when the mourner kneels.
      const shoulderY = headWorld.y - headR * 1.6;
      const reach = Math.atan2(Math.max(0.05, shoulderY - (H2 * 0.82 - 0.03)), 0.42) * 180 / Math.PI;
      joints2.left.shoulder.rotation.set(-(42 + reach) * RAD, 0, -22 * RAD);
      joints2.left.elbow.rotation.set(-15 * RAD, 0, 0);
      joints2.right.shoulder.rotation.set(-6 * RAD, 0, 4 * RAD);
    }

    const energy = mood.energy;
    const matrix = new THREE.Matrix4();
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        other?.update(dt, time);
        if (flame) flame.scale.y = 1 + Math.sin(time * 11) * 0.12 * (0.3 + energy);
        if (petals && falling.length) {
          for (const [index, petal] of falling.entries()) {
            const sway = Math.sin(time * (1.2 + energy * 2) + petal.phase) * 0.012 * (0.2 + energy);
            matrix.makeScale(petal.size, petal.size * 0.5, petal.size).setPosition(petal.x + sway, petal.y, petal.z + sway * 0.6);
            petals.setMatrixAt(index, matrix);
          }
          petals.instanceMatrix.needsUpdate = true;
        }
      },
    });
  },
});
