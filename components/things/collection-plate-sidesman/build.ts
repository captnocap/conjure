import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { at, pick, pickSkin, rig } from './pose';

type P = [number, number, number];

export default defineThing({
  questions: {
    holds: choice('What does he hold out?', {
      plate: 'A round brass collection plate lined with red velvet.',
      pole: 'A long-handled cloth collection bag on a wooden pole, reached along the pew.',
      basket: 'A shallow wicker basket.',
    }),
    takings: choice('What is in it?', {
      coins: 'A few coins and a button.',
      notes: 'Folded notes and envelopes, a good collection.',
      empty: 'Nothing yet: the velvet bare.',
      heap: 'Heaped with coins, notes and envelopes.',
    }),
    hand: choice('What is his free hand doing?', {
      behind: 'Tucked behind his back, patient.',
      extended: 'Extended a little toward the pew, palm up, inviting.',
      cuff: 'Fiddling with his cuff, awkward.',
    }),
    flower: noul('Does he wear a flower in his buttonhole, as for a wedding?'),
    suit: choice('What suit is he wearing?', {
      grey: 'A mid-grey suit, pressed for Sunday.',
      navy: 'A navy blazer and grey flannels.',
      tweed: 'A brown tweed three-piece.',
      black: 'A black suit and black tie, funeral-correct.',
      shirtsleeves: 'No jacket: shirt-sleeves and a knitted tie, a summer service.',
    }),
    age: score('How old is he?', ['A young man in his first suit', 'Middle-aged, grey at the temples', 'Old and upright, white hair, done this for decades']),
    pew: choice('What is the pew end beside him like?', {
      oak: 'A dark oak pew end with a carved poppy-head top.',
      pine: 'A plain pale pine pew end.',
      chair: 'No pew: a row of stacking chairs, the end one with a hymn book on it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.68, 1.82, random()) * (a.age > 0.8 ? 0.97 : 1);
    const skin = pickSkin(random);
    const suit = {
      grey: { top: '#6f7278', bottom: '#6f7278' },
      navy: { top: '#243052', bottom: '#8a8c90' },
      tweed: { top: '#6b5438', bottom: '#6b5438' },
      black: { top: '#1c1c20', bottom: '#1c1c20' },
      shirtsleeves: { top: '#eef0f2', bottom: '#4a4f5a' },
    }[a.suit];
    const hairColor = a.age > 0.75 ? '#e2dfd8' : a.age > 0.4 ? '#7a7068' : pick(random, ['#2a1e18', '#4a3222', '#8a5a2a']);
    const person = figure(s, {
      height: H, build: a.age > 0.4 && random() < 0.4 ? 'heavy' : 'average', style: 'doll', skin,
      hair: a.age > 0.75 && random() < 0.4 ? 'none' : 'short', hairColor,
      top: suit.top, bottom: suit.bottom, shoes: '#1a1816', sleeves: a.suit === 'shirtsleeves' ? 'short' : 'long',
      pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const pose = rig(person);
    // The pew is on his right; the plate goes out that way, and his head turns to it.
    if (a.holds === 'pole') pose.arm('right', { forward: 36, out: 30, bend: 10, across: 0 });
    else pose.arm('right', { forward: 48, out: 34, bend: 22, across: 0 });
    if (a.hand === 'behind') pose.arm('left', { forward: -32, out: 6, bend: 70, across: 55 });
    else if (a.hand === 'extended') pose.arm('left', { forward: 34, out: 10, bend: 58, across: 28 });
    else pose.arm('left', { forward: 30, out: 8, bend: 110, across: 60 });
    pose.look(a.age > 0.75 ? 4 : 10, -44, 0);
    if (a.age > 0.75) pose.bow(5);
    pose.leg('left', { out: 5 });
    pose.leg('right', { out: 5 });
    person.settle();
    person.root.rotation.y = 0.22;
    person.root.updateMatrixWorld(true);

    const neck = at(s, person.joints.neck);
    const chest = new THREE.Vector3(neck.x, neck.y - 0.045 * H, neck.z + 0.066 * H);
    const white = s.material('#f4f2ec', { roughness: 0.9 });
    // Shirt, tie, lapel badge and the wedding buttonhole.
    if (a.suit !== 'shirtsleeves') s.box([0.06 * H, 0.08 * H, 0.004 * H], [chest.x, chest.y - 0.005 * H, chest.z - 0.004 * H], white).rotation.x = 0.1;
    const tie = s.material(a.suit === 'black' ? '#141416' : pick(random, ['#7a1f2a', '#1f3a7a', '#3a5a3a', '#8a6a2a']), { roughness: 0.6 });
    s.box([0.024 * H, 0.2 * H, 0.006 * H], [chest.x, chest.y - 0.09 * H, chest.z + 0.004 * H], tie).rotation.x = 0.12;
    s.ring(0.05 * H, 0.011 * H, [neck.x, neck.y + 0.005 * H, neck.z], white).rotation.x = Math.PI / 2;
    const badge = s.box([0.028 * H, 0.012 * H, 0.004 * H], [chest.x - 0.05 * H, chest.y - 0.02 * H, chest.z + 0.006 * H], s.material('#d9d2b8', { roughness: 0.4 }));
    badge.rotation.x = 0.1;
    s.box([0.022 * H, 0.004 * H, 0.002 * H], [chest.x - 0.05 * H, chest.y - 0.02 * H, chest.z + 0.009 * H], s.material('#2a2a3a', { roughness: 1 }));
    if (a.flower) {
      const petals = s.material(pick(random, ['#f6f1e8', '#f2b7c6', '#f2c94c']), { roughness: 0.8 });
      s.ball([0.022 * H, 0.022 * H, 0.018 * H], [chest.x + 0.05 * H, chest.y - 0.015 * H, chest.z + 0.012 * H], petals, 10);
      s.ball([0.012 * H, 0.02 * H, 0.008 * H], [chest.x + 0.062 * H, chest.y - 0.035 * H, chest.z + 0.012 * H], s.material('#3f6a3a', { roughness: 0.9 }), 8);
    }

    // ---- what he holds: plate, pole bag or basket, and what is in it
    const brass = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 });
    const velvet = s.material('#7a1424', { roughness: 1 });
    const hand = at(s, person.hands.right);
    const coins = (centre: THREE.Vector3, radius: number, count: number, lift: number) => {
      if (!count) return;
      const brassCoin = new THREE.CylinderGeometry(0.011, 0.011, 0.002, 10);
      s.scatter(brassCoin, s.material('#d8c27a', { metalness: 0.7, roughness: 0.35 }), Array.from({ length: count }, (_u, i) => {
        const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * radius;
        return { at: [centre.x + Math.cos(angle) * r, centre.y + lift + (i % 3) * 0.002, centre.z + Math.sin(angle) * r] as P, size: 0.8 + random() * 0.6, color: i % 3 ? '#d8c27a' : '#c8c8cc' };
      }));
    };
    const notes = (centre: THREE.Vector3, radius: number, count: number, lift: number) => {
      for (let i = 0; i < count; i++) {
        const note = s.box([0.05, 0.004, 0.028], [centre.x + (random() - 0.5) * radius * 1.4, centre.y + lift + i * 0.004, centre.z + (random() - 0.5) * radius * 1.4], s.material(pick(random, ['#d9e2c8', '#e9d9c0', '#c9d3e0']), { roughness: 0.9 }));
        note.rotation.y = random() * Math.PI;
      }
    };
    const fill = { coins: [6, 0], notes: [2, 4], empty: [0, 0], heap: [18, 6] }[a.takings];
    if (a.holds === 'plate' || a.holds === 'basket') {
      const dish = new THREE.Vector3(hand.x + 0.03 * H, hand.y - 0.02 * H, hand.z + 0.02 * H);
      if (a.holds === 'plate') {
        s.lathe([[0, 0], [0.1, 0], [0.14, 0.012], [0.165, 0.03], [0.17, 0.034], [0.16, 0.034], [0.13, 0.016], [0.1, 0.006], [0, 0.006]], brass, dish.toArray() as P);
        s.cylinder(0.1, 0.1, 0.004, [dish.x, dish.y + 0.008, dish.z], velvet, 24);
      } else {
        const wicker = s.material('#b8905a', { roughness: 1 });
        s.lathe([[0, 0], [0.12, 0], [0.17, 0.05], [0.175, 0.06], [0.165, 0.06], [0.115, 0.012], [0, 0.012]], wicker, dish.toArray() as P);
        for (let i = 0; i < 3; i++) s.ring(0.135 + i * 0.015, 0.004, [dish.x, dish.y + 0.018 + i * 0.016, dish.z], s.material('#8a6a3a', { roughness: 1 })).rotation.x = Math.PI / 2;
        s.cylinder(0.11, 0.11, 0.004, [dish.x, dish.y + 0.012, dish.z], s.material('#5a4a3a', { roughness: 1 }), 24);
      }
      coins(dish, 0.08, fill[0], 0.014);
      notes(dish, 0.07, fill[1], 0.014);
      if (a.takings === 'coins') s.cylinder(0.009, 0.009, 0.003, [dish.x + 0.04, dish.y + 0.014, dish.z - 0.03], s.material('#2a2a2e', { roughness: 0.6 }), 10);
    } else {
      // The pole bag: a long rod from the hand, a ring and a cloth bag at the far end, reaching into the pew.
      const pole = s.material('#5a3a22', { roughness: 0.6 });
      const tip = new THREE.Vector3(hand.x - 0.95, hand.y - 0.1, hand.z + 0.1);
      s.rod([hand.x + 0.1, hand.y + 0.01, hand.z - 0.01], tip.toArray() as P, 0.012, pole);
      s.ring(0.1, 0.008, [tip.x - 0.08, tip.y - 0.01, tip.z + 0.01], brass).rotation.x = Math.PI / 2;
      const bag = s.mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.18, 16), velvet, [tip.x - 0.08, tip.y - 0.1, tip.z + 0.01]);
      void bag;
      s.ball([0.075, 0.03, 0.075], [tip.x - 0.08, tip.y - 0.19, tip.z + 0.01], velvet, 12);
      if (a.takings === 'heap' || a.takings === 'notes') for (let i = 0; i < 3; i++) s.box([0.05, 0.004, 0.028], [tip.x - 0.08 + (random() - 0.5) * 0.08, tip.y - 0.015, tip.z + 0.01 + (random() - 0.5) * 0.08], s.material('#d9e2c8', { roughness: 0.9 })).rotation.y = random();
    }

    // ---- the pew end beside him: the end panel and a short run of seat and back
    const hip = at(s, person.pelvis);
    const px = hip.x - 0.62;
    if (a.pew !== 'chair') {
      const woodColour = a.pew === 'oak' ? '#3f2a18' : '#c09a62';
      const wood = s.material(woodColour, { roughness: 0.55 });
      const pz = hip.z - 0.05;
      s.box([0.06, 0.98, 0.5], [px, 0.49, pz], wood);
      if (a.pew === 'oak') {
        s.ball([0.06, 0.1, 0.12], [px, 1.02, pz], wood, 10);
        s.box([0.065, 0.05, 0.1], [px, 0.94, pz], wood);
      } else {
        s.cylinder(0.25, 0.25, 0.06, [px, 0.98, pz], wood, 18).rotation.z = Math.PI / 2;
      }
      s.box([0.9, 0.045, 0.42], [px - 0.46, 0.44, pz + 0.05], s.material(a.pew === 'oak' ? '#6b4a2e' : '#cfa978', { roughness: 0.6 }));
      const back = s.box([0.9, 0.5, 0.04], [px - 0.46, 0.73, pz - 0.17], wood);
      back.rotation.x = -0.14;
      s.box([0.9, 0.06, 0.09], [px - 0.46, 0.99, pz - 0.21], wood).rotation.x = -0.14;
      s.box([0.9, 0.07, 0.26], [px - 0.46, 0.045, pz + 0.49], s.material(pick(random, ['#7a1f2a', '#2a3a6a']), { roughness: 0.95 }));
      // A hymn book or two left on the seat.
      for (let i = 0; i < Math.round(mood.density * 2); i++) s.box([0.1, 0.025, 0.15], [px - 0.3 - i * 0.3, 0.475, pz + 0.05 + (random() - 0.5) * 0.1], s.material(pick(random, ['#8a1f24', '#1f2a5a']), { roughness: 0.7 })).rotation.y = (random() - 0.5) * 0.6;
    } else {
      const frame = s.material('#3a3a3e', { metalness: 0.5, roughness: 0.4 });
      const pad = s.material(pick(random, ['#6a2a2a', '#2a4a5a', '#5a5a3a']), { roughness: 0.95 });
      for (let i = 0; i < 2; i++) {
        const cx = px - 0.25 - i * 0.52, cz = hip.z - 0.05;
        for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([cx + x * 0.2, 0, cz + z * 0.2], [cx + x * 0.2, 0.44, cz + z * 0.2], 0.012, frame);
        s.box([0.44, 0.05, 0.44], [cx, 0.46, cz], pad);
        s.box([0.44, 0.3, 0.04], [cx, 0.72, cz - 0.2], pad).rotation.x = -0.12;
        if (i === 0) s.box([0.1, 0.025, 0.15], [cx, 0.5, cz + 0.02], s.material('#8a1f24', { roughness: 0.7 })).rotation.y = 0.3;
      }
    }

    const energy = mood.energy;
    const baseNeck = person.joints.neck.rotation.y;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        person.joints.neck.rotation.y = baseNeck + Math.sin(time * mix(0.4, 1.2, energy)) * 0.08 * (0.3 + energy);
      },
    });
  },
});
