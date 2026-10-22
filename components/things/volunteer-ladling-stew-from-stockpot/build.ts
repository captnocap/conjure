import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul, score } from '@conjure/kit';
import { type P, beanie, pick, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    contents: choice('What is in the pot?', {
      lentils: 'Thick orange lentil stew, chunks of carrot showing.',
      rice: 'A heap of white rice steaming under the lid.',
      soup: 'Thin red tomato soup, glossy and hot.',
      tea: 'Dark sweet tea brewed by the bucket.',
    }),
    age: choice('How old is the volunteer?', {
      young: 'A student, early twenties, quick and eager.',
      middle: 'Forty-something, steady, has done this before.',
      older: 'Grey-haired and slower, but will not sit down.',
    }),
    build: choice('What is their build?', {
      slight: 'Slight and wiry.',
      average: 'Average.',
      heavy: 'Broad and heavy, a cook\'s build.',
    }),
    apron: choice('What colour is the apron?', {
      white: 'A plain white cook\'s apron.',
      navy: 'A navy bib apron.',
      red: 'A red apron with a front pocket.',
      green: 'A dark green apron.',
      striped: 'A butcher\'s blue-and-white striped apron.',
    }),
    hat: choice('What is on their head?', {
      beanie: 'A knitted beanie pulled down to the ears.',
      cap: 'A baseball cap, peak forward.',
      hairnet: 'A hairnet over tied-back hair.',
      bare: 'Nothing; short hair.',
    }),
    stage: score('How far through the service is it?', ['The lid just lifted, the pot full to the brim', 'Half served, a steady rhythm', 'Scraping the bottom for the last bowls']),
    helper: noul('Is a second person on the other side holding out a bowl to be filled?'),
    lit: noul('Is the gas ring lit, blue flames under the pot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = pickSkin(random);
    const H = { young: mix(1.62, 1.78, random()), middle: mix(1.64, 1.84, random()), older: mix(1.56, 1.7, random()) }[a.age];
    const headR = H * 0.064;
    const jumper = pick(random, ['#5a5f6a', '#3b4a6a', '#6a4a3a', '#2f5a4a', '#7a3a3a', '#9a8a6a']);
    const person = figure(s, {
      height: H, build: a.build, style: 'doll', skin,
      hair: a.hat === 'cap' ? 'cap' : a.hat === 'hairnet' ? 'bun' : 'short',
      hairColor: a.hat === 'cap' ? pick(random, ['#1f2a44', '#8a2a2a', '#2a2a2c']) : a.age === 'older' ? '#b9b4ad' : pick(random, ['#2a1d16', '#4a3524', '#1d1d1f', '#8a5a2a']),
      top: jumper, bottom: pick(random, ['#3a3f4a', '#2b2f3a', '#4a4a44', '#2e3a5a']), shoes: '#2a2a2c', sleeves: 'long',
      pose: 'standing', gaze: 'down',
    });
    s.root.add(person.root);
    const joints = rig(person);
    const stoop = a.age === 'older' ? 6 : 0;
    joints.lean(4);
    joints.bow(16 + stoop);
    joints.look(26, -8);
    // The right hand holds the top of the ladle handle at chest height; the left rests on the near rim.
    joints.arm('right', { forward: 55, out: -6, bend: 58, across: 30 });
    joints.arm('left', { forward: 28, out: 4, bend: 25, across: 10 });
    joints.leg('left', { out: 5 });
    joints.leg('right', { out: 5 });
    joints.settle();

    // Beanie, hairnet, and the apron tied over the jumper.
    const apronColour = { white: '#efece4', navy: '#2b3a5a', red: '#a8302a', green: '#2f5a3a', striped: '#dfe6ee' }[a.apron];
    const cloth = s.material(apronColour, { roughness: 0.9 });
    if (a.hat === 'beanie') beanie(person, s.material(pick(random, ['#8a2a2a', '#2a3a5a', '#4a4a44', '#6a5a2a', '#1d1d1f']), { roughness: 1 }), headR);
    if (a.hat === 'hairnet') {
      const net = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: '#e8e6e0', transparent: true, opacity: 0.45, roughness: 1, depthWrite: false }));
      net.position.y = headR * 0.12;
      net.scale.y = 1.12;
      person.head.add(net);
    }
    const torsoL = H * 0.28, limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[a.build], shoulderW = H * 0.115 * { slight: 0.85, average: 1, heavy: 1.3 }[a.build];
    const front = limb * 1.5 * (a.build === 'heavy' ? 1.2 : 1);
    const bib = new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 1.15, torsoL * 0.5, 0.01), cloth);
    bib.position.set(0, torsoL * 0.62, front);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 2.1, torsoL * 0.42 + H * 0.22, 0.01), cloth);
    skirt.position.set(0, torsoL * 0.36 - (torsoL * 0.42 + H * 0.22) / 2 + 0.02, front + 0.004);
    bib.castShadow = skirt.castShadow = true;
    joints.spine.add(bib, skirt);
    if (a.apron === 'striped') for (let i = 0; i < 6; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, torsoL * 0.42 + H * 0.2, 0.004), s.material('#3a5a8a'));
      stripe.position.set(-shoulderW * 0.9 + i * shoulderW * 0.36, skirt.position.y, front + 0.012);
      joints.spine.add(stripe);
    }
    if (a.apron === 'red') { const pocket = new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 0.9, H * 0.07, 0.008), s.material('#8a2420')); pocket.position.set(0, -H * 0.02, front + 0.012); joints.spine.add(pocket); }
    const strap = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.75, 0.006, 6, 18), cloth);
    strap.position.set(0, torsoL * 0.98, 0);
    strap.rotation.x = Math.PI / 2 + 0.4;
    joints.spine.add(strap);
    // Rubber gloves over the hands, cuffs up the sleeves.
    const gloveColour = pick(random, ['#e9c21a', '#2f6fc4', '#2a7a5a', '#e2607a']);
    const glove = s.material(gloveColour, { roughness: 0.55 });
    const handL = H * 0.055;
    for (const side of ['left', 'right'] as const) {
      const mitt = new THREE.Mesh(new THREE.CapsuleGeometry(limb * 0.86, handL * 0.9, 4, 10), glove);
      mitt.position.y = handL * 0.5;
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(limb * 0.98, limb * 0.9, H * 0.05, 12), glove);
      cuff.position.y = handL + H * 0.02;
      mitt.castShadow = cuff.castShadow = true;
      person.hands[side].add(mitt, cuff);
    }
    person.root.updateMatrixWorld(true);
    const hips = worldOf(person.pelvis);
    const left = worldOf(person.hands.left);
    const right = worldOf(person.hands.right);

    // The gas-ring stand and the stockpot on it, placed so the left hand rests near the rim.
    const R = 0.25, potH = 0.42, standH = 0.46, rim = standH + potH;
    const pot: P = [hips.x + 0.02, standH, Math.max(left.z + R * 0.6, right.z + 0.08)];
    const steel = s.material('#b9bdc0', { metalness: 0.7, roughness: 0.32 });
    const dullSteel = s.material('#7d8286', { metalness: 0.6, roughness: 0.5 });
    const black = s.material('#2a2c2e', { roughness: 0.7 });
    for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2 + Math.PI / 4;
      s.rod([pot[0] + Math.cos(t) * 0.27, 0, pot[2] + Math.sin(t) * 0.27], [pot[0] + Math.cos(t) * 0.23, standH, pot[2] + Math.sin(t) * 0.23], 0.012, black);
    }
    s.ring(0.24, 0.012, [pot[0], standH - 0.01, pot[2]], black).rotation.x = Math.PI / 2;
    s.ring(0.26, 0.01, [pot[0], 0.16, pot[2]], black).rotation.x = Math.PI / 2;
    s.ring(0.11, 0.022, [pot[0], standH - 0.06, pot[2]], dullSteel).rotation.x = Math.PI / 2;
    s.rod([pot[0], standH - 0.2, pot[2]], [pot[0], standH - 0.07, pot[2]], 0.02, dullSteel);
    if (a.lit) {
      const flame = new THREE.MeshStandardMaterial({ color: '#9fd0ff', emissive: '#2f7fff', emissiveIntensity: mix(1.6, 2.6, mood.energy), transparent: true, opacity: 0.9, depthWrite: false });
      const flames = s.scatter(new THREE.ConeGeometry(0.012, 0.045, 6), flame, Array.from({ length: 14 }, (_u, i) => { const t = i / 14 * Math.PI * 2; return { at: [pot[0] + Math.cos(t) * 0.11, standH - 0.025, pot[2] + Math.sin(t) * 0.11] as P, size: 1 }; }));
      flames.castShadow = false;
    }
    // Gas hose to a propane bottle at the side.
    const bottle: P = [pot[0] - 0.62 * (random() < 0.5 ? 1 : -1), 0, pot[2] - 0.1];
    const bottlePaint = s.material(pick(random, ['#d9541e', '#3a6fb0', '#9aa0a4', '#c9b23a']), { roughness: 0.5, metalness: 0.2 });
    s.lathe([[0, 0], [0.13, 0], [0.15, 0.03], [0.15, 0.36], [0.12, 0.42], [0.05, 0.45], [0.05, 0.5], [0.03, 0.5], [0, 0.5]], bottlePaint, bottle);
    s.ring(0.09, 0.012, [bottle[0], 0.52, bottle[2]], bottlePaint).rotation.x = Math.PI / 2;
    s.tube([[bottle[0], 0.5, bottle[2]], [bottle[0] * 0.6 + pot[0] * 0.4, 0.3, bottle[2] + 0.1], [pot[0] + (bottle[0] < pot[0] ? -0.1 : 0.1), standH - 0.22, pot[2]]], 0.011, s.material('#d9541e', { roughness: 0.8 }));
    // The pot: a lathe with an inner wall, two loop handles, the contents and the lid leaning against a leg.
    const potPaint = s.material('#c4c8cb', { metalness: 0.65, roughness: 0.38 });
    const fill = mix(0.86, 0.14, a.stage);
    const level = standH + 0.02 + (potH - 0.04) * fill;
    s.lathe([[0, 0], [R - 0.012, 0], [R, 0.015], [R, potH], [R + 0.014, potH + 0.012], [R - 0.016, potH + 0.012], [R - 0.016, (level - standH) - 0.005], [0, (level - standH) - 0.005]], potPaint, [pot[0], standH, pot[2]]);
    for (const side of [-1, 1]) {
      // A half torus lying flat, its ends on the pot wall and its loop bulging outward.
      const handle = s.ring(0.05, 0.011, [pot[0] + side * (R + 0.01), standH + potH - 0.06, pot[2]], potPaint, Math.PI);
      handle.rotation.set(-Math.PI / 2, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    const foodColour = { lentils: '#c9742a', rice: '#f1ead6', soup: '#c8422a', tea: '#4a2a14' }[a.contents];
    const food = s.material(foodColour, { roughness: a.contents === 'rice' ? 0.95 : 0.3, metalness: a.contents === 'tea' ? 0.2 : 0 });
    if (a.contents === 'rice') {
      const heap = s.ball([R - 0.025, 0.05, R - 0.025], [pot[0], level, pot[2]], food, 14);
      void heap;
    } else {
      const surface = s.cylinder(R - 0.018, R - 0.018, 0.012, [pot[0], level, pot[2]], food, 28);
      void surface;
      if (a.contents === 'lentils') s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#e8922a', { roughness: 0.7 }), Array.from({ length: 9 }, () => { const t = random() * 6.3, d = random() * (R - 0.06); return { at: [pot[0] + Math.cos(t) * d, level + 0.008, pot[2] + Math.sin(t) * d] as P, size: 0.016 + random() * 0.01 }; }));
    }
    const lid = s.cylinder(R + 0.01, R + 0.01, 0.012, [pot[0] - (R + 0.2) * (bottle[0] < pot[0] ? -1 : 1), 0.2, pot[2] + 0.12], potPaint, 28);
    lid.rotation.set(0.2, 0, (bottle[0] < pot[0] ? -1 : 1) * 1.25);
    const knob = s.ball([0.03, 0.03, 0.03], [lid.position.x + (bottle[0] < pot[0] ? -0.03 : 0.03), 0.2, pot[2] + 0.12], black, 8);
    void knob;

    // The ladle, lifted from the pot, held in the right fist, dripping.
    const target = new THREE.Vector3(pot[0] + 0.02, rim + 0.14, pot[2] - 0.02);
    const dir = target.clone().sub(right);
    const span = dir.length();
    dir.normalize();
    const bowlAt = span < 0.3 ? right.clone().addScaledVector(dir, 0.3) : target;
    const top = right.clone().addScaledVector(dir, -0.09);
    s.rod([top.x, top.y, top.z], [bowlAt.x, bowlAt.y, bowlAt.z], 0.008, steel);
    s.ball([0.012, 0.012, 0.012], [top.x, top.y, top.z], steel, 8);
    const ladle = s.lathe([[0, 0], [0.04, 0], [0.058, 0.025], [0.062, 0.05], [0.052, 0.05], [0.048, 0.03], [0.03, 0.01], [0, 0.01]], steel, [bowlAt.x, bowlAt.y - 0.03, bowlAt.z]);
    void ladle;
    if (a.contents !== 'rice') s.cylinder(0.045, 0.045, 0.008, [bowlAt.x, bowlAt.y + 0.012, bowlAt.z], food, 16);
    const drips = Math.round(mix(1, 4, 1 - a.stage));
    for (let i = 0; i < drips; i++) {
      const d = s.ball([0.008, 0.016 + i * 0.004, 0.008], [bowlAt.x + (random() - 0.5) * 0.05, bowlAt.y - 0.05 - i * 0.045 - random() * 0.02, bowlAt.z + (random() - 0.5) * 0.04], food, 8);
      d.castShadow = false;
    }

    // Steam: soft puffs rising from the surface, more when the ring is lit.
    const puffs: { mesh: THREE.Mesh; base: number; x: number; size: number; phase: number; drift: number }[] = [];
    const steamCount = (a.lit ? 7 : 4) - (a.stage > 0.7 ? 2 : 0);
    for (let i = 0; i < steamCount; i++) {
      const size = 0.05 + random() * 0.06;
      const steamPaint = new THREE.MeshStandardMaterial({ color: '#f4f2ee', transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 });
      const mesh = s.ball([size, size * 1.2, size], [pot[0] + (random() - 0.5) * 0.25, level + 0.08 + i * 0.09, pot[2] + (random() - 0.5) * 0.25], steamPaint, 8);
      mesh.castShadow = false;
      puffs.push({ mesh, base: mesh.position.y, x: mesh.position.x, size, phase: random() * 6.3, drift: (random() - 0.5) * 0.08 });
    }

    // A crate of bowls beside the pot, and a stack of the ones already used.
    const crateX = pot[0] + (bottle[0] < pot[0] ? 0.7 : -0.7);
    const crate = s.box([0.5, 0.3, 0.36], [crateX, 0.15, pot[2] + 0.05], s.material(pick(random, ['#2f6fc4', '#3a3a3a', '#c9402a']), { roughness: 0.6 }));
    void crate;
    const bowlPaint = s.material(pick(random, ['#e8e2d2', '#dfe7ea', '#f0d8a8']), { roughness: 0.6 });
    const stack = Math.round(mix(14, 3, a.stage)) + Math.round(random() * 2);
    s.scatter(new THREE.CylinderGeometry(0.085, 0.055, 0.045, 16, 1, true), new THREE.MeshStandardMaterial({ color: bowlPaint.color, roughness: 0.6, side: THREE.DoubleSide }), Array.from({ length: stack }, (_u, i) => ({ at: [crateX + (random() - 0.5) * 0.01, 0.3 + 0.024 + i * 0.016, pot[2] + 0.05] as P, size: 1 })));
    const used = Math.round(a.stage * 5);
    if (used) s.scatter(new THREE.CylinderGeometry(0.085, 0.055, 0.045, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#c9bfae', roughness: 0.7, side: THREE.DoubleSide }), Array.from({ length: used }, (_u, i) => ({ at: [crateX + 0.22 * (crateX > pot[0] ? 1 : -1), 0.024 + i * 0.03, pot[2] + 0.3] as P, size: 1 })));
    // Spills on the ground once the service has been going a while.
    if (a.stage > 0.35 || mood.wear > 0.5) s.scatter(new THREE.CylinderGeometry(1, 1, 0.004, 10), food, Array.from({ length: 4 }, () => ({ at: [pot[0] + (random() - 0.5) * 0.7, 0.003, pot[2] + 0.2 + random() * 0.4] as P, size: 0.03 + random() * 0.04 })));

    // Someone holding out a bowl from the other side.
    let helper: Figure | null = null;
    if (a.helper) {
      helper = figure(s, {
        height: mix(1.5, 1.75, random()), build: 'slight', style: 'doll', skin: pickSkin(random), hair: pick(random, ['hood', 'short', 'long', 'cap']),
        top: pick(random, ['#6a7a8a', '#8a6a4a', '#3a3a44', '#b06a4a']), bottom: '#3a3f4a', shoes: '#2a2a2c', sleeves: 'long', pose: 'standing', gaze: 'down',
      });
      // They stand at the side of the pot, in profile, so neither figure hides the other.
      const side = bottle[0] < pot[0] ? -1 : 1;
      helper.root.position.set(pot[0] + side * 0.74, 0, pot[2] + 0.32);
      helper.root.rotation.y = -side * Math.PI / 2 + 0.25;
      s.root.add(helper.root);
      const hj = rig(helper);
      hj.arm('left', { forward: 48, out: 2, bend: 45, across: 35 });
      hj.arm('right', { forward: 48, out: 2, bend: 45, across: 35 });
      hj.look(18, 0);
      hj.settle(false);
      const hl = worldOf(helper.hands.left), hr = worldOf(helper.hands.right);
      const bowl = s.lathe([[0, 0], [0.05, 0], [0.085, 0.045], [0.075, 0.045], [0.045, 0.01], [0, 0.01]], bowlPaint, [(hl.x + hr.x) / 2, (hl.y + hr.y) / 2 - 0.02, (hl.z + hr.z) / 2]);
      void bowl;
    }

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        helper?.update(dt, time);
        for (const [i, puff] of puffs.entries()) {
          const t = (time * (0.25 + energy * 0.35) + puff.phase + i * 0.4) % 1;
          puff.mesh.position.y = puff.base + t * 0.5;
          puff.mesh.position.x = puff.x + Math.sin(time * 0.7 + puff.phase) * puff.drift * t;
          const grow = puff.size * (1 + t * 1.6);
          puff.mesh.scale.set(grow, grow * 1.2, grow);
          (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.18 * (1 - t);
        }
      },
    });
  },
});
