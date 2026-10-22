import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul, score } from '@conjure/kit';
import { type P, beanie, headscarf, pick, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    coat: choice('What is the child wearing?', {
      puffer: 'A quilted puffer coat several sizes too big, sleeves past the hands.',
      woollen: 'A grown-up\'s woollen overcoat to the knees, buttoned to the chin.',
      jacket: 'A man\'s suit jacket hanging to the knees, shoulders drooping off the arms.',
      anorak: 'A bright nylon anorak, hood up, zipped to the nose.',
    }),
    colour: choice('What colour is the coat?', {
      red: 'Faded red.',
      navy: 'Navy blue.',
      olive: 'Olive drab.',
      pink: 'Pink, once somebody\'s favourite.',
      grey: 'Charcoal grey.',
      mustard: 'Mustard yellow.',
    }),
    feet: choice('What is on the child\'s feet?', {
      boots: 'Two odd boots, one black rubber and one brown, both too big.',
      sandals: 'Plastic sandals over bare feet.',
      bare: 'Bare feet on the cold ground.',
      trainers: 'Donated trainers, laces undone.',
    }),
    hat: choice('What is on the child\'s head?', {
      beanie: 'A knitted beanie pulled down over the ears.',
      hood: 'The coat\'s hood up.',
      scarf: 'A headscarf tied under the chin.',
      bare: 'Nothing; hair uncombed.',
    }),
    bowl: choice('What is happening with the bowl?', {
      empty: 'Held out empty, waiting to be filled.',
      full: 'Just filled, steaming, held carefully with both hands.',
      returning: 'Scraped clean and being handed back, tilted, a spoon rattling in it.',
    }),
    sibling: noul('Does a smaller sibling cling to the coat tail behind?'),
    size: score('How small is the child?', ['Barely walking, the coat sweeping the ground', 'About a metre tall, five or six years old', 'Eight or nine, all elbows and knees']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(0.84, 1.2, a.size);
    const skin = pickSkin(random);
    const coatColour = { red: '#b03a2e', navy: '#2b3a5a', olive: '#6a6a3a', pink: '#e59ab0', grey: '#5a5a58', mustard: '#d4a21c' }[a.colour];
    const trousers = pick(random, ['#3a3f4a', '#6a4a3a', '#2b2f3a', '#8a7a6a']);
    const hairColour = pick(random, ['#2a1d16', '#1d1d1f', '#4a3524', '#8a5a2a', '#c9a060']);
    const person = figure(s, {
      height: H, build: 'slight', style: 'doll', skin, hair: a.hat === 'hood' ? 'hood' : a.hat === 'bare' ? pick(random, ['short', 'long']) : 'short', hairColor: hairColour,
      top: coatColour, bottom: trousers, shoes: '#2a2a2c', sleeves: 'long', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const joints = rig(person);
    const returning = a.bowl === 'returning';
    const forward = returning ? 52 : 66;
    joints.arm('left', { forward, out: -3, bend: 12, across: 8 });
    joints.arm('right', { forward, out: -3, bend: 12, across: 8 });
    joints.look(-22, 0);
    joints.leg('left', { out: 6 });
    joints.leg('right', { out: 2 });
    joints.settle();

    // Measurements the kit uses, to size the coat and sleeves over the figure.
    const wide = 0.85;
    const limb = H * 0.036 * wide, shoulderW = H * 0.115 * wide, torsoL = H * 0.28, upperL = H * 0.17, foreL = H * 0.15, handL = H * 0.055, headR = H * 0.064;
    const cloth = s.material(coatColour, { roughness: a.coat === 'anorak' ? 0.4 : 0.95 });
    const lining = s.material('#2a2622', { roughness: 0.9 });
    const spec = {
      puffer: { top: 1.4, bottom: 1.55, length: torsoL + H * 0.17 },
      woollen: { top: 1.3, bottom: 1.6, length: torsoL + H * 0.3 },
      jacket: { top: 1.5, bottom: 1.5, length: torsoL + H * 0.35 },
      anorak: { top: 1.3, bottom: 1.42, length: torsoL + H * 0.13 },
    }[a.coat];
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(shoulderW * spec.top, shoulderW * spec.bottom, spec.length, 20), cloth);
    coat.position.y = torsoL * 0.96 - spec.length / 2;
    coat.scale.z = 0.72;
    coat.castShadow = coat.receiveShadow = true;
    joints.spine.add(coat);
    const hemY = torsoL * 0.96 - spec.length;
    const add = (mesh: THREE.Mesh, at: P, parent: THREE.Object3D = joints.spine) => { mesh.position.set(...at); mesh.castShadow = true; parent.add(mesh); return mesh; };
    if (a.coat === 'puffer') {
      for (let i = 0; i < 5; i++) {
        const t = (i + 0.5) / 5;
        const r = shoulderW * mix(spec.top, spec.bottom, t);
        const rib = add(new THREE.Mesh(new THREE.TorusGeometry(r, limb * 0.42, 6, 24), cloth), [0, torsoL * 0.96 - spec.length * t, 0]);
        rib.rotation.x = Math.PI / 2;
        rib.scale.y = 0.72;
      }
    }
    if (a.coat === 'woollen' || a.coat === 'jacket') {
      const collar = add(new THREE.Mesh(new THREE.TorusGeometry(headR * 0.95, limb * 0.5, 6, 18), a.coat === 'jacket' ? lining : cloth), [0, torsoL * 0.98, 0]);
      collar.rotation.x = Math.PI / 2 - 0.3;
      for (const side of [-1, 1]) {
        const lapel = add(new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 0.5, torsoL * 0.55, 0.006), a.coat === 'jacket' ? lining : cloth), [side * shoulderW * 0.42, torsoL * 0.62, shoulderW * spec.top * 0.72 + 0.004]);
        lapel.rotation.z = side * 0.35;
      }
      if (a.coat === 'woollen') for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.SphereGeometry(limb * 0.3, 8, 6), s.material('#1d1d1f')), [limb * 0.4, torsoL * 0.55 - i * H * 0.1, shoulderW * mix(spec.top, spec.bottom, 0.3 + i * 0.15) * 0.72 + 0.004]);
    }
    if (a.coat === 'anorak') {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.008, spec.length * 0.85, 0.004), s.material('#2a2a2c')), [0, torsoL * 0.96 - spec.length * 0.45, shoulderW * 1.36 * 0.72 + 0.004]);
      const hem = add(new THREE.Mesh(new THREE.TorusGeometry(shoulderW * spec.bottom, limb * 0.3, 6, 20), s.material('#2a2a2c')), [0, hemY + limb * 0.3, 0]);
      hem.rotation.x = Math.PI / 2;
      hem.scale.y = 0.72;
    }
    if (mood.wear > 0.45) {
      // A splashed hem.
      const mud = add(new THREE.Mesh(new THREE.CylinderGeometry(shoulderW * spec.bottom * 1.01, shoulderW * spec.bottom * 1.01, H * 0.04, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1, side: THREE.DoubleSide })), [0, hemY + H * 0.02, 0]);
      mud.scale.z = 0.72;
    }
    // Sleeves: too long, swallowing the hands.
    const sleeveR = limb * (a.coat === 'puffer' ? 1.9 : 1.5);
    for (const side of ['left', 'right'] as const) {
      const wrist = person.hands[side].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
      add(new THREE.Mesh(new THREE.CapsuleGeometry(sleeveR, upperL - sleeveR * 0.6, 4, 10), cloth), [0, -upperL / 2, 0], shoulder);
      const extra = a.coat === 'anorak' ? handL * 0.2 : handL * 0.65;
      add(new THREE.Mesh(new THREE.CapsuleGeometry(sleeveR * 0.95, foreL + extra - sleeveR, 4, 10), cloth), [0, -(foreL + extra) / 2, 0], elbow);
      if (a.coat === 'puffer') { const cuff = add(new THREE.Mesh(new THREE.TorusGeometry(sleeveR * 0.9, limb * 0.35, 6, 16), cloth), [0, -(foreL + extra) + limb * 0.4, 0], elbow); cuff.rotation.x = Math.PI / 2; }
    }
    // Head: a beanie, a scarf, or the hood the kit gave.
    if (a.hat === 'beanie') beanie(person, s.material(pick(random, ['#8a2a2a', '#2a3a5a', '#d4a21c', '#4a7a5a', '#e59ab0']), { roughness: 1 }), headR);
    if (a.hat === 'scarf') headscarf(person, s.material(pick(random, ['#e8d8a8', '#8a2a3a', '#4a6a8a', '#efece4']), { roughness: 0.95 }), headR);

    // Feet: odd boots, sandals, bare, or trainers.
    for (const side of ['left', 'right'] as const) {
      const foot = joints.foot(side);
      const ankle = foot.parent!;
      if (a.feet === 'boots') {
        foot.material = s.material(side === 'left' ? '#1d1d1f' : '#6a4a2e', { roughness: 0.5 });
        foot.scale.set(1.35, 1.45, 1.5);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.25, limb * 1.3, H * 0.11, 12), foot.material);
        shaft.position.set(0, H * 0.035, limb * 0.4);
        shaft.castShadow = true;
        ankle.add(shaft);
      } else if (a.feet === 'sandals') {
        foot.material = s.material(skin, { roughness: 0.6 });
        const sole = new THREE.Mesh(new THREE.BoxGeometry(limb * 2.2, limb * 0.5, limb * 4.6), s.material(side === 'left' ? '#2f6fc4' : '#2a2a2c', { roughness: 0.6 }));
        sole.position.set(0, -H * 0.03 - limb * 0.7, limb * 1.1);
        const strap = new THREE.Mesh(new THREE.BoxGeometry(limb * 2.3, limb * 0.3, limb * 0.6), sole.material);
        strap.position.set(0, -H * 0.03 + limb * 0.6, limb * 1.6);
        sole.castShadow = strap.castShadow = true;
        ankle.add(sole, strap);
      } else if (a.feet === 'bare') {
        foot.material = s.material(skin, { roughness: 0.6 });
        foot.scale.set(0.95, 1, 0.85);
      } else {
        foot.material = s.material(side === 'left' ? '#e8e4dc' : '#dfe4ea', { roughness: 0.7 });
        foot.scale.set(1.25, 1.25, 1.2);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(limb * 2.1, limb * 0.3, limb * 0.4), s.material(pick(random, ['#c9402a', '#2f6fc4', '#2a8a4a'])));
        stripe.position.set(0, -H * 0.03 + limb * 0.5, limb * 1.4);
        ankle.add(stripe);
      }
    }
    person.root.updateMatrixWorld(true);
    const left = worldOf(person.hands.left), right = worldOf(person.hands.right);
    const hips = worldOf(person.pelvis);

    // The tin bowl between the hands.
    const tin = s.material(mood.wear > 0.5 ? '#9a9c9a' : '#c4c8ca', { metalness: 0.75, roughness: mix(0.3, 0.6, mood.wear) });
    const bowlAt = new THREE.Vector3((left.x + right.x) / 2, (left.y + right.y) / 2 - 0.02, (left.z + right.z) / 2 + 0.01);
    const bowl = new THREE.Group();
    bowl.position.copy(bowlAt);
    const dish = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.085, 0.045], [0.09, 0.05], [0.078, 0.05], [0.045, 0.012], [0, 0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 24), tin);
    dish.castShadow = dish.receiveShadow = true;
    bowl.add(dish);
    if (a.bowl === 'full') {
      const stew = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.01, 20), s.material(pick(random, ['#c9742a', '#c8422a', '#f1ead6', '#6a4a2a']), { roughness: 0.4 }));
      stew.position.y = 0.04;
      bowl.add(stew);
    }
    if (returning) {
      bowl.rotation.x = 0.55;
      const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.09), tin);
      spoon.position.set(0.02, 0.02, 0.01);
      spoon.rotation.set(-0.4, 0.3, 0);
      bowl.add(spoon);
    }
    s.root.add(bowl);
    const puffs: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
    if (a.bowl === 'full') for (let i = 0; i < 3; i++) {
      const size = 0.02 + random() * 0.015;
      const mesh = s.ball([size, size * 1.3, size], [bowlAt.x + (random() - 0.5) * 0.08, bowlAt.y + 0.07 + i * 0.04, bowlAt.z + (random() - 0.5) * 0.06], new THREE.MeshStandardMaterial({ color: '#f4f2ee', transparent: true, opacity: 0.18, depthWrite: false, roughness: 1 }), 8);
      mesh.castShadow = false;
      puffs.push({ mesh, base: mesh.position.y, phase: random() * 6.3 });
    }

    // A smaller sibling behind, holding on to the coat tail.
    let sibling: Figure | null = null;
    if (a.sibling) {
      const Hs = H * mix(0.68, 0.8, random());
      const side = random() < 0.5 ? 1 : -1;
      sibling = figure(s, {
        height: Hs, build: 'slight', style: 'doll', skin, hair: pick(random, ['short', 'long', 'hood', 'cap']), hairColor: hairColour,
        top: pick(random, ['#8a6a4a', '#4a6a8a', '#b03a2e', '#efece4', '#6a4a7a']), bottom: pick(random, ['#3a3f4a', '#6a4a3a']), shoes: '#2a2a2c', sleeves: 'long', pose: 'standing', gaze: 'ahead',
      });
      sibling.root.position.set(hips.x + side * (shoulderW * spec.bottom * 0.72 + Hs * 0.1), 0, hips.z - 0.14);
      sibling.root.rotation.y = -side * 0.6;
      s.root.add(sibling.root);
      const sj = rig(sibling);
      // The near arm reaches across to the hem; the other thumb goes to the mouth.
      const near = side > 0 ? 'right' : 'left', far = side > 0 ? 'left' : 'right';
      sj.arm(near, { forward: 30, out: 55, bend: 35, across: 0 });
      sj.arm(far, { forward: 70, out: -8, bend: 125, across: 30 });
      sj.look(-12, side * 25);
      sj.settle(false);
    }

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        sibling?.update(dt, time);
        for (const [i, puff] of puffs.entries()) {
          const t = (time * (0.3 + energy * 0.3) + puff.phase + i * 0.33) % 1;
          puff.mesh.position.y = puff.base + t * 0.12;
          (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.2 * (1 - t);
        }
      },
    });
  },
});
