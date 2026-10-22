import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul, score } from '@conjure/kit';
import { type P, headscarf, paint, pick, pickSkin, rig, worldOf } from './rig';

/** The red-white-blue chequered laundry bag that carries half the world's belongings. */
function chequer(a: string, b: string) {
  return paint(128, 128, (c) => {
    c.fillStyle = '#f1ede4';
    c.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      c.fillStyle = (x + y) % 2 ? a : b;
      c.fillRect(x * 16, y * 16, 16, 16);
    }
  });
}

export default defineThing({
  questions: {
    scarf: choice('What colour is her headscarf?', {
      black: 'Plain black.',
      white: 'White cotton.',
      red: 'Deep red.',
      green: 'Dark green.',
      blue: 'Pale blue.',
      dotted: 'Cream with a small dotted pattern.',
    }),
    coat: choice('What is the coat like?', {
      black: 'A long black wool coat.',
      brown: 'A brown coat, worn at the cuffs.',
      grey: 'A grey quilted coat.',
      burgundy: 'A burgundy coat with a fur collar.',
      green: 'A dark green parka.',
    }),
    holds: choice('What does her free hand hold?', {
      card: 'A folded paper ration card.',
      bowl: 'An empty plastic bowl.',
      phone: 'A phone, held up, screen glowing.',
      nothing: 'Nothing; the hand hangs at her side.',
    }),
    looks: choice('Where is she looking?', {
      baby: 'Down at the baby.',
      ahead: 'Ahead, at the back of the queue in front.',
      shoulder: 'Over her shoulder, at something behind.',
    }),
    child: noul('Does a second, older child hold her other hand?'),
    bags: noul('Are her bags at her feet: a chequered laundry bag and a holdall?'),
    waiting: score('How long has she been standing here?', ['Just arrived, upright and alert', 'An hour: weight shifted to one hip', 'All day: sagging, head down, the baby the only thing holding her up']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.56, 1.72, random());
    const skin = pickSkin(random);
    const coatColour = { black: '#1f1f22', brown: '#5a4030', grey: '#6e6e6c', burgundy: '#6a1f2a', green: '#3a4a34' }[a.coat];
    const scarfColour = { black: '#1d1d1f', white: '#efece4', red: '#8a1f24', green: '#2f4a34', blue: '#a8c4dc', dotted: '#efe4c8' }[a.scarf];
    const side = random() < 0.5 ? 1 : -1; // which side the baby's head and her cupping hand are on
    const babyHand = side > 0 ? 'left' : 'right', freeHand = side > 0 ? 'right' : 'left';
    const build = pick(random, ['slight', 'average'] as const);
    const person = figure(s, {
      height: H, build, style: 'doll', skin, hair: 'short', hairColor: '#2a1d16',
      top: coatColour, bottom: pick(random, ['#2b2f3a', '#3a3a3a', '#5a4a3a']), shoes: pick(random, ['#2a2a2c', '#5a4030', '#8a8a86']), sleeves: 'long', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const joints = rig(person);
    const tired = a.waiting;
    // Weight on one hip: the body rolls over the standing leg and the other leg relaxes outward.
    joints.roll(side * mix(1.5, 6, tired));
    joints.leg(freeHand, { out: mix(4, 14, tired), knee: mix(0, 8, tired) });
    joints.leg(babyHand, { out: 0 });
    joints.bow(mix(0, 9, tired));
    joints.arm(babyHand, { forward: 36, out: -14, bend: 138, across: 38 });
    if (a.child) joints.arm(freeHand, { forward: 4, out: 22, bend: 8, across: 0 });
    else if (a.holds === 'phone') joints.arm(freeHand, { forward: 42, out: -6, bend: 105, across: 30 });
    else if (a.holds === 'nothing') joints.arm(freeHand, { forward: 2, out: 6, bend: 10, across: 0 });
    else joints.arm(freeHand, { forward: 16, out: 4, bend: 62, across: 24 });
    const lookPitch = a.looks === 'baby' ? 34 : a.holds === 'phone' && !a.child ? 22 : mix(0, 12, tired);
    joints.look(a.looks === 'shoulder' ? -4 : lookPitch, a.looks === 'shoulder' ? -side * 95 : a.looks === 'baby' ? side * 18 : 0);
    joints.settle();

    const wide = build === 'slight' ? 0.85 : 1;
    const limb = H * 0.036 * wide, shoulderW = H * 0.115 * wide, torsoL = H * 0.28, upperL = H * 0.17, foreL = H * 0.15, headR = H * 0.064;
    const cloth = s.material(coatColour, { roughness: a.coat === 'grey' ? 0.8 : 0.95 });
    const add = (mesh: THREE.Mesh, at: P, parent: THREE.Object3D = joints.spine) => { mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    // The long coat, to the shins, over the kit's torso and legs; sleeves over the arms.
    const coatLen = torsoL + H * 0.44;
    const coat = add(new THREE.Mesh(new THREE.CylinderGeometry(shoulderW * 1.18, shoulderW * 1.62, coatLen, 22), cloth), [0, torsoL * 0.96 - coatLen / 2, 0]);
    coat.scale.z = 0.7;
    if (a.coat === 'grey') for (let i = 0; i < 6; i++) { const r = shoulderW * mix(1.18, 1.62, (i + 0.5) / 6); const rib = add(new THREE.Mesh(new THREE.TorusGeometry(r, limb * 0.2, 6, 24), cloth), [0, torsoL * 0.96 - coatLen * (i + 0.5) / 6, 0]); rib.rotation.x = Math.PI / 2; rib.scale.y = 0.7; }
    if (a.coat === 'burgundy') { const fur = add(new THREE.Mesh(new THREE.TorusGeometry(headR * 1.05, limb * 0.75, 8, 20), s.material('#c9b8a0', { roughness: 1 })), [0, torsoL * 0.98, -0.01]); fur.rotation.x = Math.PI / 2 - 0.25; }
    for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.SphereGeometry(limb * 0.26, 8, 6), s.material(a.coat === 'black' ? '#3a3a3c' : '#1d1d1f')), [0, torsoL * 0.6 - i * H * 0.1, shoulderW * mix(1.18, 1.62, 0.3 + i * 0.12) * 0.7 + 0.004]);
    for (const hand of ['left', 'right'] as const) {
      const wrist = person.hands[hand].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
      add(new THREE.Mesh(new THREE.CapsuleGeometry(limb * 1.4, upperL - limb * 0.5, 4, 10), cloth), [0, -upperL / 2, 0], shoulder);
      add(new THREE.Mesh(new THREE.CapsuleGeometry(limb * 1.3, foreL - limb * 1.2, 4, 10), cloth), [0, -foreL / 2, 0], elbow);
    }
    // Headscarf over the bun, tied under the chin.
    const scarfPaint = a.scarf === 'dotted'
      ? new THREE.MeshStandardMaterial({ map: paint(128, 128, (c) => { c.fillStyle = scarfColour; c.fillRect(0, 0, 128, 128); c.fillStyle = '#8a2a3a'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.beginPath(); c.arc(x * 16 + (y % 2) * 8 + 4, y * 16 + 8, 2.6, 0, 6.3); c.fill(); } }), roughness: 0.95 })
      : s.material(scarfColour, { roughness: 0.95 });
    headscarf(person, scarfPaint, headR);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.22, 8, 6), scarfPaint);
    knot.position.set(0, -headR * 1.05, headR * 0.55);
    person.head.add(knot);

    // The sling: a band over one shoulder, across the chest and under the other arm, with the bundle in it.
    const wrap = s.material(pick(random, ['#c9a27a', '#8a3a4a', '#4a6a8a', '#d9c9a1', '#6a7a5a']), { roughness: 0.95 });
    const frontR = limb * 1.35;
    const loop: P[] = [
      [side * shoulderW * 0.75, torsoL + 0.01, 0],
      [side * shoulderW * 0.2, torsoL * 0.55, frontR + 0.07],
      [-side * shoulderW * 0.9, torsoL * 0.12, frontR * 0.3],
      [-side * shoulderW * 0.5, torsoL * 0.3, -frontR - 0.02],
      [side * shoulderW * 0.3, torsoL * 0.75, -frontR - 0.02],
    ];
    const band = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop.map((p) => new THREE.Vector3(...p)), true), 48, 0.028, 8, true), wrap);
    band.castShadow = true;
    joints.spine.add(band);
    const bundleAt: P = [side * 0.03, torsoL * 0.4, frontR + 0.09];
    const bundle = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), wrap), bundleAt);
    bundle.scale.set(0.095, 0.14, 0.085);
    bundle.rotation.z = -side * 0.25;
    const babyHead = add(new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 9), s.material(skin, { roughness: 0.6 })), [bundleAt[0] + side * 0.035, bundleAt[1] + 0.145, bundleAt[2] - 0.01]);
    void babyHead;
    const bonnet = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), s.material(pick(random, ['#efece4', '#e59ab0', '#a8c4dc', '#d4a21c']), { roughness: 1 })), [bundleAt[0] + side * 0.035, bundleAt[1] + 0.15, bundleAt[2] - 0.015]);
    bonnet.rotation.z = -side * 0.3;

    person.root.updateMatrixWorld(true);
    const free = worldOf(person.hands[freeHand]);
    const hips = worldOf(person.pelvis);
    // What the free hand holds.
    if (a.holds === 'card' || a.child) {
      const card = s.box([0.075, 0.1, 0.004], [free.x + side * -0.01, free.y + 0.02, free.z + 0.025], s.material('#efe8d6', { roughness: 0.9 }));
      card.rotation.set(-0.3, side * 0.2, side * 0.15);
      s.box([0.05, 0.004, 0.006], [free.x + side * -0.01, free.y + 0.055, free.z + 0.03], s.material('#8a2a2a')).rotation.copy(card.rotation);
    }
    if (a.holds === 'bowl' && !a.child) {
      const bowl = s.lathe([[0, 0], [0.05, 0], [0.085, 0.05], [0.078, 0.05], [0.045, 0.01], [0, 0.01]], s.material(pick(random, ['#2f6fc4', '#e8e2d2', '#c9402a']), { roughness: 0.6 }), [free.x, free.y - 0.03, free.z + 0.04]);
      bowl.rotation.z = side * 0.35;
    }
    if (a.holds === 'phone' && !a.child) {
      const phone = s.box([0.07, 0.14, 0.008], [free.x, free.y + 0.03, free.z + 0.02], s.material('#1d1d1f', { roughness: 0.4 }));
      phone.rotation.set(-0.5, 0, 0);
      const screen = s.box([0.06, 0.12, 0.002], [free.x, free.y + 0.032, free.z + 0.025], new THREE.MeshStandardMaterial({ color: '#dfe8ff', emissive: '#9fb8ff', emissiveIntensity: mix(0.8, 1.6, 1 - mood.daylight) }));
      screen.rotation.set(-0.5, 0, 0);
    }

    // The second child, hand in hand.
    let child: Figure | null = null;
    if (a.child) {
      const Hc = mix(0.9, 1.1, random());
      child = figure(s, {
        height: Hc, build: 'slight', style: 'doll', skin, hair: pick(random, ['short', 'long', 'hood', 'cap']), hairColor: '#2a1d16',
        top: pick(random, ['#b03a2e', '#2b3a5a', '#d4a21c', '#6a4a7a', '#4a7a5a']), bottom: pick(random, ['#3a3f4a', '#6a4a3a']), shoes: '#2a2a2c', sleeves: 'long', pose: 'standing', gaze: 'up',
      });
      child.root.position.set(hips.x - side * (shoulderW * 1.62 * 0.7 + Hc * 0.16), 0, hips.z + 0.02);
      child.root.rotation.y = side * 0.35;
      s.root.add(child.root);
      const cj = rig(child);
      const near = side > 0 ? 'left' : 'right';
      cj.arm(near, { forward: 18, out: 48, bend: 25, across: 0 });
      cj.arm(side > 0 ? 'right' : 'left', { forward: 8, out: 8, bend: 15, across: 0 });
      cj.look(-18, side * 30);
      cj.settle(false);
      child.root.updateMatrixWorld(true);
      const small = worldOf(child.hands[near]);
      // Bring the small hand up to hers.
      child.root.position.x += free.x - small.x - side * 0.01;
      child.root.position.z += free.z - small.z;
    }
    // Bags at her feet.
    if (a.bags) {
      const bagX = hips.x + side * 0.42, bagZ = hips.z + 0.08;
      const chequered = new THREE.MeshStandardMaterial({ map: chequer('#c73b3b', '#2f5fb0'), roughness: 0.6 });
      const bag = s.box([0.5, 0.36, 0.26], [bagX, 0.18, bagZ], chequered);
      bag.rotation.y = (random() - 0.5) * 0.6;
      for (const dx of [-0.08, 0.08]) s.rod([bagX + dx, 0.36, bagZ], [bagX + dx * 0.5, 0.46, bagZ], 0.008, s.material('#e8e2d2'));
      const holdall = s.box([0.42, 0.24, 0.22], [bagX - side * 0.12, 0.12, bagZ - 0.36], s.material(pick(random, ['#2a2a2c', '#3a4a6a', '#5a3a2a']), { roughness: 0.8 }));
      holdall.rotation.y = (random() - 0.5) * 0.8;
      holdall.rotation.z = 0.08;
    }
    // Mud on the hem when the ground is bad.
    if (mood.wear > 0.5) { const mud = add(new THREE.Mesh(new THREE.CylinderGeometry(shoulderW * 1.63, shoulderW * 1.63, H * 0.035, 22, 1, true), new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1, side: THREE.DoubleSide })), [0, torsoL * 0.96 - coatLen + H * 0.018, 0]); mud.scale.z = 0.7; }

    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        child?.update(dt, time);
        // A slow rock to keep the baby asleep.
        joints.body.rotation.z = side * mix(1.5, 6, tired) * Math.PI / 180 + Math.sin(time * (0.6 + mood.energy * 0.5)) * 0.012;
      },
    });
  },
});
