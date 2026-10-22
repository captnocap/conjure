import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { SKINS, anatomy, at, busSeat, joints, pick, pole, poseArm, poseLeg, reachArm, seatPalette } from './bus';

/** Sequins: a dense scatter of bright specks on a coloured ground. */
function sequins(random: () => number, colour: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)';
    ctx.fillRect(random() * 64, random() * 64, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

const DRESSES = {
  gold: 'Gold sequins.',
  silver: 'Silver sequins.',
  black: 'Black sequins.',
  red: 'Red sequins.',
  emerald: 'Emerald green sequins.',
} as const;
const DRESS_COLOUR: Record<keyof typeof DRESSES, string> = { gold: '#c9a030', silver: '#b8bcc4', black: '#1e1e24', red: '#b0202e', emerald: '#1f7a4a' };

export default defineThing({
  questions: {
    posture: choice('How is she?', {
      standing: 'Standing barefoot, one hand gripping the yellow pole, head bowed.',
      sitting: 'Sitting on the seat with her knees together, head bowed.',
      curled: 'Curled sideways on the seat with her legs drawn up, head down.',
    }),
    holding: choice('What does she hold besides the heels?', {
      clutch: 'A small clutch bag on a chain.',
      phone: 'Her phone, screen dark.',
      bouquet: 'A wilted bouquet, heads hanging.',
      nothing: 'Nothing: the other hand is empty.',
    }),
    dress: choice('What colour is the dress?', DRESSES),
    jacket: noul('Is a borrowed man\'s jacket draped over her shoulders?'),
    floor: choice('What is on the floor by her feet?', {
      nothing: 'Nothing but the floor.',
      wrapper: 'A kebab wrapper and a few chips.',
      spilled: 'A spilled clutch: lipstick, cards and coins across the floor.',
      flyer: 'A club flyer stuck to the floor.',
    }),
    streaks: noul('Has her mascara run?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random } = context;
    const H = mix(1.56, 1.72, random());
    const skin = pick(random, SKINS);
    const dressColour = DRESS_COLOUR[a.dress];
    const sequin = s.material('#ffffff', { map: sequins(random, dressColour), metalness: 0.7, roughness: 0.35 });
    const seated = a.posture !== 'standing';
    const person = figure(s, {
      height: H, build: 'slight', style: 'doll', pose: seated ? 'sitting' : 'standing', gaze: 'down', skin,
      hair: 'long', hairColor: pick(random, ['#2a1d18', '#3b2a22', '#c89a5a', '#8a2a2a', '#1f1a18', '#e8d2a0']),
      top: dressColour, bottom: skin, shoes: skin, sleeves: 'short',
    });
    s.root.add(person.root);
    const { limb, torsoL, headR, chestR, spine, torso, shoulderW } = anatomy(person, H, 'slight');
    const pelvisL = H * 0.07;
    torso.material = sequin;
    // The short dress: from the chest down over the hips, to mid-thigh when standing.
    const hem = seated ? pelvisL * 1.1 : pelvisL + H * 0.1;
    const dress = new THREE.Mesh(new THREE.CylinderGeometry(chestR * 1.02, (H * 0.075 * 0.85) * 1.25, torsoL * 0.75 + hem, 16, 1, true), sequin);
    dress.position.y = (torsoL * 0.75 - hem) / 2;
    dress.scale.x = torso.scale.x;
    dress.castShadow = true;
    spine.add(dress);
    if (a.jacket) {
      const cloth = s.material(pick(random, ['#2a2d35', '#1f2430', '#3a3a3e', '#4a3a3a']), { roughness: 0.8 });
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(chestR * 1.3, chestR * 1.4, torsoL * 1.05, 16, 1, true, 0.6, Math.PI * 2 - 1.2), cloth);
      coat.position.y = torsoL * 0.5;
      coat.scale.x = torso.scale.x * 1.05;
      coat.castShadow = true;
      spine.add(coat);
      // Empty sleeves hang beside the arms.
      for (const side of [-1, 1]) {
        const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(limb * 1.1, H * 0.22, 3, 8), cloth);
        sleeve.position.set(side * (shoulderW + limb * 1.6), torsoL * 0.62, -limb * 0.6);
        sleeve.rotation.z = side * 0.12;
        sleeve.castShadow = true;
        spine.add(sleeve);
      }
    }
    if (a.streaks) {
      const ink = s.material('#2a2024', { roughness: 0.6 });
      for (const side of [-1, 1]) {
        const streak = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.08, headR * 0.3, headR * 0.03), ink);
        streak.position.set(side * headR * 0.36, -headR * 0.12, headR * 0.95);
        person.head.add(streak);
      }
    }

    // ---- posture.
    const { neck } = joints(person, 'left');
    neck.rotation.set(0.62, (random() - 0.5) * 0.3, (random() - 0.5) * 0.2);
    spine.rotation.x = seated ? 0.2 : 0.1;
    let seatTop = 0.45;
    const palette = seatPalette(s, random);
    let hips: THREE.Vector3;
    if (a.posture === 'standing') {
      poseLeg(person, 'left', { forward: 2, knee: 4, out: 2 });
      poseLeg(person, 'right', { forward: -3, knee: 2, out: 6 });
      // One hand up on the pole, the other hanging with the heels.
      poseArm(person, 'left', { forward: 32, out: 62, bend: 22, inward: 0 });
      poseArm(person, 'right', { forward: 6, out: 8, bend: 8 });
      person.settle();
      hips = at(person.pelvis);
      const grip = at(person.hands.left);
      pole(s, palette.yellow, palette.steel, grip.x + 0.025, grip.z, 1.95);
    } else if (a.posture === 'sitting') {
      poseLeg(person, 'left', { forward: 88, knee: 92, out: -1 });
      poseLeg(person, 'right', { forward: 88, knee: 92, out: -1 });
      poseArm(person, 'right', { forward: 24, out: 10, bend: 6 });
      person.settle();
      hips = at(person.pelvis);
      seatTop = hips.y - 0.045 * H;
      busSeat(s, palette, { x: hips.x + 0.215, z: hips.z + 0.06, seatTop, aisle: 'right', cantilever: true });
    } else {
      // Curled: legs folded up onto the cushion, turned toward the window, the body sunk against the backrest.
      poseLeg(person, 'left', { forward: 100, knee: 138, out: -4 });
      poseLeg(person, 'right', { forward: 96, knee: 132, out: 8 });
      poseArm(person, 'right', { forward: 40, out: 4, bend: 60, inward: 30 });
      spine.rotation.set(0.3, 0, -0.04);
      neck.rotation.set(0.7, 0.3, 0.2);
      person.root.rotation.y = -0.38;
      person.settle();
      person.root.position.y += seatTop + limb * 1.1 - at(person.pelvis).y;
      person.root.updateMatrixWorld(true);
      hips = at(person.pelvis);
      busSeat(s, palette, { x: hips.x + 0.08, z: hips.z + 0.1, seatTop, aisle: 'right', cantilever: true });
    }
    person.root.updateMatrixWorld(true);

    // ---- the heels, dangling from two fingers (or set on the floor when she is curled up).
    const strap = s.material(dressColour === '#1e1e24' ? '#d4b060' : '#1e1e24', { roughness: 0.35, metalness: 0.3 });
    const heelColour = pick(random, ['#1e1e24', '#c9a030', '#b0202e', '#e8d0c0', '#b8bcc4']);
    const patent = s.material(heelColour, { roughness: 0.25, metalness: 0.2 });
    const makeShoe = (hang: boolean) => {
      const shoe = new THREE.Group();
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.2), patent);
      sole.position.set(0, 0, 0.0);
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), patent);
      toe.position.set(0, 0.012, 0.09);
      toe.scale.set(1, 0.6, 1);
      const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.1, 8), patent);
      spike.position.set(0, -0.05, -0.085);
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 14, Math.PI), strap);
      loop.position.set(0, 0.012, 0.03);
      loop.rotation.y = Math.PI / 2;
      shoe.add(sole, toe, spike, loop);
      shoe.traverse((node) => { node.castShadow = true; });
      if (hang) shoe.rotation.set(-Math.PI / 2 + 0.3, 0, 0);
      return shoe;
    };
    if (a.posture === 'curled') {
      for (let i = 0; i < 2; i++) {
        const shoe = makeShoe(false);
        shoe.position.set(hips.x + 0.45 + i * 0.08, 0.056, hips.z + 0.25 + i * 0.1);
        shoe.rotation.set(0, 0.5 + i * 0.8, i ? Math.PI / 2 : 0);
        if (i) shoe.position.y = 0.03;
        s.root.add(shoe);
      }
    } else {
      const hand = at(person.hands.right);
      for (let i = 0; i < 2; i++) {
        const shoe = makeShoe(true);
        shoe.position.set(hand.x - 0.015 + i * 0.035, hand.y - 0.13, hand.z + 0.02 + i * 0.03);
        shoe.rotation.y = (i ? 0.5 : -0.3) + (random() - 0.5) * 0.3;
        s.root.add(shoe);
      }
    }

    // ---- the other hand.
    if (a.holding !== 'nothing') {
      if (a.posture === 'standing') poseArm(person, 'left', { forward: 32, out: 62, bend: 22 });
      const side = a.posture === 'standing' ? 'right' : 'left';
      if (a.posture !== 'standing') {
        const shoulder = at(joints(person, side).shoulder);
        reachArm(person, side, H, hips.y + 0.1 - shoulder.y, hips.z + 0.22 - shoulder.z, 6, 30);
      }
      person.root.updateMatrixWorld(true);
      const hand = at(person.hands[a.posture === 'standing' ? 'right' : 'left']);
      const holdAt = a.posture === 'standing' ? new THREE.Vector3(hand.x - 0.04, hand.y + 0.02, hand.z + 0.04) : new THREE.Vector3(hand.x, hand.y + 0.03, hand.z + 0.02);
      if (a.holding === 'clutch') {
        const clutch = s.box([0.16, 0.08, 0.03], [holdAt.x, holdAt.y, holdAt.z], s.material(pick(random, ['#c9a030', '#1e1e24', '#e8d0c0', '#b0202e']), { roughness: 0.3, metalness: 0.4 }));
        clutch.rotation.set(0.2, 0.3, 0.1);
        s.rod([holdAt.x - 0.06, holdAt.y + 0.04, holdAt.z], [holdAt.x + 0.02, holdAt.y + 0.18, holdAt.z - 0.02], 0.003, s.material('#d4b060', { metalness: 0.8, roughness: 0.3 }));
      } else if (a.holding === 'phone') {
        s.box([0.075, 0.15, 0.009], [holdAt.x, holdAt.y, holdAt.z], s.material('#15161a', { roughness: 0.3 })).rotation.set(0.5, 0.2, 0);
      } else {
        const paper = s.material(pick(random, ['#e8dcc0', '#d8c0d0', '#f4f0e6']), { roughness: 0.95 });
        const cone = s.cylinder(0.02, 0.07, 0.3, [holdAt.x, holdAt.y - 0.13, holdAt.z + 0.03], paper, 10);
        cone.rotation.x = 0.2;
        const petals: { at: [number, number, number]; size: number; color: string }[] = [];
        const colour = pick(random, ['#e84d6a', '#f4d35e', '#f29e4c', '#e6e6f0', '#9b5de5']);
        for (let i = 0; i < 7; i++) petals.push({ at: [holdAt.x + (random() - 0.5) * 0.1, holdAt.y - 0.3 + random() * 0.05, holdAt.z + 0.06 + (random() - 0.5) * 0.08], size: 0.02 + random() * 0.012, color: i % 3 === 2 ? '#5a7a3a' : colour });
        s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.9 }), petals);
      }
    }

    // ---- the floor by her feet.
    const feetZ = a.posture === 'standing' ? hips.z + 0.2 : hips.z + 0.42;
    const fx = hips.x + (random() - 0.5) * 0.3 - 0.1;
    if (a.floor === 'wrapper') {
      s.box([0.2, 0.01, 0.16], [fx, 0.005, feetZ + 0.1], s.material('#c9ccd2', { metalness: 0.7, roughness: 0.35 })).rotation.y = random();
      s.scatter(new THREE.BoxGeometry(0.012, 0.012, 0.05), s.material('#e8b84a', { roughness: 0.8 }), Array.from({ length: 6 }, () => ({ at: [fx + (random() - 0.5) * 0.3, 0.006, feetZ + 0.1 + (random() - 0.5) * 0.25] as [number, number, number], size: 1 })));
    } else if (a.floor === 'spilled') {
      const clutch = s.box([0.16, 0.03, 0.08], [fx, 0.015, feetZ + 0.12], s.material(pick(random, ['#c9a030', '#1e1e24', '#e8d0c0']), { roughness: 0.3, metalness: 0.4 }));
      clutch.rotation.set(0, random(), 0.4);
      s.cylinder(0.008, 0.008, 0.07, [fx + 0.12, 0.008, feetZ + 0.05], s.material('#b0202e', { roughness: 0.3 }), 8).rotation.set(Math.PI / 2, 0, 0.5);
      for (let i = 0; i < 3; i++) s.box([0.055, 0.002, 0.085], [fx + (random() - 0.5) * 0.3, 0.002, feetZ + (random() - 0.3) * 0.3], s.material(pick(random, ['#2a6ad4', '#f4f4f0', '#d4303a']), { roughness: 0.4 })).rotation.y = random() * Math.PI;
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.2, 10), s.material('#c9a030', { metalness: 0.8, roughness: 0.3 }), Array.from({ length: 6 }, () => ({ at: [fx + (random() - 0.5) * 0.35, 0.002, feetZ + (random() - 0.4) * 0.35] as [number, number, number], size: 0.011 })));
    } else if (a.floor === 'flyer') {
      const flyer = s.label(pick(random, ['SATURDAYS', 'FREE ENTRY', 'NEON NITE', 'LAST ORDERS']), 0.15, 0.1, [fx, 0.003, feetZ + 0.15], '#f4f4f0', pick(random, ['#d93a6a', '#2a2a8a', '#1a1a1e']));
      flyer.rotation.set(-Math.PI / 2, 0, random());
    }

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
