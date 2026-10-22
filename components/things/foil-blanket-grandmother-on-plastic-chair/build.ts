import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul, score } from '@conjure/kit';
import { type P, headscarf, paint, pick, pickSkin, rig, worldOf } from './rig';

/** Push every vertex a little along its normal, so foil crinkles under the light. */
function crinkle(geometry: THREE.BufferGeometry, random: () => number, amount: number) {
  geometry.computeVertexNormals();
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const push = (random() - 0.5) * amount;
    position.setXYZ(i, position.getX(i) + normal.getX(i) * push, position.getY(i) + normal.getY(i) * push, position.getZ(i) + normal.getZ(i) * push);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    blanket: choice('What colour is the emergency blanket?', {
      silver: 'Silver foil, crinkled, catching every light.',
      gold: 'Gold foil, the other side out.',
    }),
    holds: choice('What does she hold?', {
      tea: 'A paper cup of tea in both hands, steam rising.',
      photograph: 'A small photograph, looked at and looked at.',
      cane: 'A walking cane, both hands on the handle.',
      grandchild: 'A grandchild\'s hand; the child stands beside the chair.',
    }),
    chair: choice('What is she sitting on?', {
      white: 'A white plastic monobloc chair.',
      red: 'A red plastic chair.',
      blue: 'A blue plastic chair.',
      green: 'A dark green plastic chair, one leg cracked.',
    }),
    beside: choice('What is beside her?', {
      empty: 'An empty chair, waiting for someone.',
      stack: 'A stack of the same chairs, not yet handed out.',
      nothing: 'Nothing; she is on her own.',
    }),
    covered: noul('Is her head covered with a scarf?'),
    bag: noul('Is there a bag at her feet, everything she could carry?'),
    sitting: score('How long has she been sitting here?', ['Just sat down, upright, the blanket fresh', 'Hours; sagging into it', 'All night: slumped, the cup gone cold']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.48, 1.62, random());
    const skin = pickSkin(random);
    const slump = a.sitting;
    const build = pick(random, ['slight', 'average', 'heavy'] as const);
    const person = figure(s, {
      height: H, build, style: 'doll', skin, hair: 'bun', hairColor: pick(random, ['#d9d4cc', '#b9b4ad', '#8a8680']),
      top: pick(random, ['#5a4a6a', '#6a4a3a', '#3a4a5a', '#8a3a3a']), bottom: pick(random, ['#3a3a3c', '#5a4a5a', '#6a5a4a']), shoes: pick(random, ['#e8b4b8', '#d9c9a1', '#8a6a6a']), sleeves: 'long',
      pose: 'sitting', gaze: 'down',
    });
    s.root.add(person.root);
    const joints = rig(person);
    if (a.holds === 'tea' || a.holds === 'photograph') { joints.arm('left', { forward: 28, out: -2, bend: 98, across: 42 }); joints.arm('right', { forward: 28, out: -2, bend: 98, across: 42 }); }
    if (a.holds === 'cane') { joints.arm('left', { forward: 30, out: 6, bend: 55, across: 30 }); joints.arm('right', { forward: 30, out: 6, bend: 55, across: 30 }); }
    if (a.holds === 'grandchild') { joints.arm('left', { forward: 28, out: -2, bend: 98, across: 42 }); joints.arm('right', { forward: 10, out: 28, bend: 20, across: 0 }); }
    joints.bow(mix(4, 24, slump));
    joints.look(mix(18, 42, slump), 0);
    joints.settle();
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const limb = H * 0.036 * wide, shoulderW = H * 0.115 * wide, torsoL = H * 0.28, headR = H * 0.064;
    const add = (mesh: THREE.Mesh, at: P, parent: THREE.Object3D = joints.spine) => { mesh.position.set(...at); mesh.castShadow = true; parent.add(mesh); return mesh; };
    // Slippers: soft, wide, pale.
    for (const side of ['left', 'right'] as const) { const foot = joints.foot(side); foot.scale.set(1.3, 1.05, 1.4); }
    if (a.covered) headscarf(person, s.material(pick(random, ['#1d1d1f', '#efece4', '#8a2a3a', '#4a6a8a', '#d9c9a1']), { roughness: 0.95 }), headR);
    person.root.updateMatrixWorld(true);
    const hips = worldOf(person.pelvis);
    const left = worldOf(person.hands.left), right = worldOf(person.hands.right);
    const seat = person.hipHeight - 0.02;

    // The plastic chair under her, and perhaps one beside.
    const chairColour = { white: '#eceae4', red: '#c9402a', blue: '#2f6fc4', green: '#2f5a3a' }[a.chair];
    const plastic = s.material(chairColour, { roughness: 0.45 });
    const chair = (x: number, z: number, lift: number, turn: number, cracked: boolean) => {
      const g = new THREE.Group();
      g.position.set(x, lift, z);
      g.rotation.y = turn;
      const mesh = (geometry: THREE.BufferGeometry, at: P, rot: P = [0, 0, 0]) => { const m = new THREE.Mesh(geometry, plastic); m.position.set(...at); m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
      mesh(new THREE.BoxGeometry(0.46, 0.035, 0.44), [0, seat, 0]);
      mesh(new THREE.BoxGeometry(0.44, 0.42, 0.03), [0, seat + 0.22, -0.2], [-0.12, 0, 0]);
      for (const dx of [-0.19, 0.19]) {
        mesh(new THREE.BoxGeometry(0.04, 0.03, 0.4), [dx * 1.15, seat + 0.2, 0.02]);
        mesh(new THREE.BoxGeometry(0.035, 0.2, 0.035), [dx * 1.15, seat + 0.1, 0.17]);
        for (const dz of [-0.19, 0.19]) {
          const leg = mesh(new THREE.CylinderGeometry(0.02, 0.028, seat, 10), [dx, seat / 2, dz]);
          leg.rotation.set(dz > 0 ? 0.06 : -0.06, 0, dx > 0 ? -0.06 : 0.06);
          if (cracked && dx > 0 && dz > 0) { leg.scale.y = 0.6; leg.position.y = seat * 0.7; mesh(new THREE.CylinderGeometry(0.022, 0.03, seat * 0.4, 10), [dx + 0.05, seat * 0.2, dz + 0.03], [0.1, 0, 0.5]); }
        }
      }
      s.root.add(g);
    };
    chair(hips.x, hips.z + 0.1, 0, 0, a.chair === 'green');
    if (a.beside === 'empty') chair(hips.x + 0.62, hips.z + 0.06, 0, (random() - 0.5) * 0.5, false);
    if (a.beside === 'stack') for (let i = 0; i < 4; i++) chair(hips.x + 0.7, hips.z - 0.2, i * 0.06, 0.3, false);

    // The foil blanket: a crinkled wrap round the shoulders and a crinkled throw over the lap.
    const foilColour = a.blanket === 'silver' ? '#dfe3e8' : '#e8c252';
    const foil = new THREE.MeshStandardMaterial({ color: foilColour, metalness: 0.92, roughness: 0.26, side: THREE.DoubleSide });
    const wrap = add(new THREE.Mesh(crinkle(new THREE.CylinderGeometry(shoulderW * 1.3, shoulderW * 1.8, torsoL * 1.05, 26, 8, true), random, 0.035), foil), [0, torsoL * 0.98 - torsoL * 1.05 / 2, -0.02]);
    wrap.scale.z = 0.8;
    const lap = s.mesh(crinkle(new THREE.PlaneGeometry(shoulderW * 3.4, 0.5, 14, 10), random, 0.03), foil, [hips.x, seat + 0.07 + limb * 1.2, hips.z + 0.27]);
    lap.rotation.x = -Math.PI / 2 + mix(0.05, 0.2, slump);
    const fall = s.mesh(crinkle(new THREE.PlaneGeometry(shoulderW * 3.2, 0.26, 12, 6), random, 0.03), foil, [hips.x, seat + 0.07 + limb * 1.2 - 0.13, hips.z + 0.5]);
    fall.rotation.x = -0.2;

    // What she holds.
    const grip = new THREE.Vector3((left.x + right.x) / 2, (left.y + right.y) / 2, (left.z + right.z) / 2);
    const puffs: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
    if (a.holds === 'tea') {
      const cup = s.cylinder(0.04, 0.032, 0.095, [grip.x, grip.y + 0.02, grip.z + 0.02], s.material('#f4f1e8', { roughness: 0.8 }), 14);
      void cup;
      s.cylinder(0.036, 0.036, 0.004, [grip.x, grip.y + 0.066, grip.z + 0.02], s.material('#6a4a2a', { roughness: 0.3 }), 14);
      if (slump < 0.7) for (let i = 0; i < 3; i++) {
        const size = 0.014 + random() * 0.01;
        const mesh = s.ball([size, size * 1.3, size], [grip.x + (random() - 0.5) * 0.04, grip.y + 0.1 + i * 0.03, grip.z + 0.02], new THREE.MeshStandardMaterial({ color: '#f4f2ee', transparent: true, opacity: 0.18, depthWrite: false, roughness: 1 }), 8);
        mesh.castShadow = false;
        puffs.push({ mesh, base: mesh.position.y, phase: random() * 6.3 });
      }
    }
    if (a.holds === 'photograph') {
      const photo = s.mesh(new THREE.PlaneGeometry(0.09, 0.12), new THREE.MeshStandardMaterial({ map: paint(64, 86, (c) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 64, 86); c.fillStyle = '#9c7f62'; c.fillRect(6, 6, 52, 68); c.fillStyle = '#c9ad8c'; c.beginPath(); c.ellipse(32, 36, 11, 14, 0, 0, 6.3); c.fill(); c.fillStyle = '#5a4332'; c.fillRect(14, 50, 36, 24); }), roughness: 0.8, side: THREE.DoubleSide }), [grip.x, grip.y + 0.05, grip.z + 0.02]);
      photo.rotation.x = -0.9;
    }
    if (a.holds === 'cane') {
      const wood = s.material('#5a3a22', { roughness: 0.6 });
      s.rod([grip.x, 0, grip.z + 0.1], [grip.x, grip.y + 0.01, grip.z + 0.02], 0.012, wood);
      const handle = s.ring(0.045, 0.012, [grip.x, grip.y + 0.03, grip.z + 0.06], wood, Math.PI);
      handle.rotation.set(0, Math.PI / 2, 0);
      s.cylinder(0.018, 0.018, 0.02, [grip.x, 0.01, grip.z + 0.1], s.material('#1d1d1f'), 10);
    }
    let child: Figure | null = null;
    if (a.holds === 'grandchild') {
      const Hc = mix(0.95, 1.15, random());
      child = figure(s, {
        height: Hc, build: 'slight', style: 'doll', skin, hair: pick(random, ['short', 'long', 'hood']), hairColor: '#2a1d16',
        top: pick(random, ['#b03a2e', '#2b3a5a', '#d4a21c', '#4a7a5a']), bottom: pick(random, ['#3a3f4a', '#6a4a3a']), shoes: '#2a2a2c', sleeves: 'long', pose: 'standing', gaze: 'ahead',
      });
      child.root.position.set(right.x - 0.1, 0, right.z - 0.05);
      child.root.rotation.y = 0.5;
      s.root.add(child.root);
      const cj = rig(child);
      cj.arm('left', { forward: 20, out: 50, bend: 20, across: 0 });
      cj.look(-10, 35);
      cj.settle(false);
      child.root.updateMatrixWorld(true);
      const small = worldOf(child.hands.left);
      child.root.position.x += right.x - small.x;
      child.root.position.z += right.z - small.z;
      // The lap cup still sits in her other hand.
      const cup = s.cylinder(0.04, 0.032, 0.095, [left.x, left.y + 0.02, left.z + 0.02], s.material('#f4f1e8', { roughness: 0.8 }), 14);
      void cup;
    }

    // The bag at her feet, and the wet ground under the chair.
    if (a.bag) {
      const bagX = hips.x + (random() < 0.5 ? -0.42 : 0.42), bagZ = hips.z + 0.35;
      if (random() < 0.5) {
        const bag = s.box([0.4, 0.26, 0.22], [bagX, 0.13, bagZ], s.material(pick(random, ['#2a2a2c', '#3a4a6a', '#5a3a2a', '#8a2a2a']), { roughness: 0.8 }));
        bag.rotation.y = (random() - 0.5) * 0.8;
        for (const dx of [-0.08, 0.08]) s.rod([bagX + dx, 0.26, bagZ], [bagX + dx * 0.4, 0.36, bagZ], 0.008, s.material('#1d1d1f'));
      } else {
        const bag = s.box([0.3, 0.34, 0.18], [bagX, 0.17, bagZ], s.material(pick(random, ['#efece4', '#2f6fc4', '#e8a020']), { roughness: 0.6 }));
        bag.rotation.set(0.1, (random() - 0.5) * 0.8, 0.12);
        s.ball([0.05, 0.04, 0.05], [bagX + 0.05, 0.36, bagZ], s.material('#c9402a'), 8);
      }
    }
    const wet = s.mesh(new THREE.CircleGeometry(0.6 + mood.wear * 0.3, 28), new THREE.MeshStandardMaterial({ color: '#5a6066', transparent: true, opacity: mix(0.18, 0.4, mood.wear), roughness: 0.08, metalness: 0.4, depthWrite: false }), [hips.x + 0.05, 0.004, hips.z + 0.2]);
    wet.rotation.x = -Math.PI / 2;
    wet.scale.x = 1.4;
    wet.castShadow = false;

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        child?.update(dt, time);
        for (const [i, puff] of puffs.entries()) {
          const t = (time * (0.3 + energy * 0.3) + puff.phase + i * 0.33) % 1;
          puff.mesh.position.y = puff.base + t * 0.1;
          (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.2 * (1 - t);
        }
      },
    });
  },
});
