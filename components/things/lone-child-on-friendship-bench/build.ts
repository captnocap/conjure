import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';
import { HAIR_COLOURS, SCHOOL_COLOURS, at, paint, pick, pickSkin, rig } from './pose';

const RAINBOW = ['#e8322a', '#ff8a1a', '#f2d21c', '#3aa655', '#2a63c8', '#7a3ac8'];

export default defineThing({
  questions: {
    paint: choice('How is the bench painted?', {
      rainbow: 'Rainbow stripes, a different colour on every slat, freshly done by the parents.',
      blue: 'Faded sky blue, peeling.',
      green: 'Municipal green, the park kind.',
      red: 'Pillar-box red.',
      bare: 'Bare weathered wood, the paint long gone.',
      yellow: 'Sunshine yellow with a painted sun on the end.',
    }),
    lettering: choice('What does the backrest say?', {
      friendship: 'FRIENDSHIP BENCH in big white capitals.',
      buddy: 'BUDDY BENCH.',
      talk: 'SIT HERE IF YOU WANT A FRIEND.',
      memorial: 'A small brass memorial plaque and no lettering.',
      worn: 'Lettering too worn to read.',
    }),
    hood: choice('What is on the child\'s head?', {
      down: 'Hood down, hair in their eyes.',
      up: 'Coat hood up, hiding inside it.',
      hat: 'A woolly hat pulled low.',
      short: 'Short hair, ears cold.',
    }),
    hands: choice('What are their hands doing?', {
      tucked: 'Tucked under the thighs.',
      lap: 'Clasped in the lap.',
      pockets: 'Shoved in the coat pockets.',
      hugging: 'Wrapped round themselves, sleeves pulled over the hands.',
    }),
    gaze: choice('Where are they looking?', {
      down: 'Down at their swinging feet.',
      across: 'Hopefully across the yard at the others.',
      along: 'Sideways along the bench at the empty seat.',
      up: 'Up at the sky, pretending not to care.',
    }),
    beside: choice('What is on the bench beside them?', {
      nothing: 'Nothing: the rest of the bench is empty.',
      lunchbox: 'A lunchbox, unopened.',
      book: 'A library book, face down.',
      bag: 'A school bag slumped against the armrest.',
      jumper: 'A jumper folded very neatly.',
    }),
    company: choice('Who else is there?', {
      nobody: 'No one.',
      approaching: 'A second child walking over, about to sit down.',
      farend: 'A second child at the far end, not talking either.',
      adult: 'A dinner lady standing by, about to say something.',
    }),
    size: score('How small is the child?', ['Tiny: feet nowhere near the ground', 'A small seven-year-old', 'Nine, toes almost touching']),
    school: choice('What is the school colour?', {
      navy: 'Navy blue.', maroon: 'Maroon.', green: 'Bottle green.', grey: 'Grey.', red: 'Bright red.', royal: 'Royal blue.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const school = SCHOOL_COLOURS[a.school];
    const L = 1.75, SEAT = 0.44, DEPTH = 0.42;
    const end = random() < 0.5 ? 1 : -1;

    // ---- the bench: cast-iron ends, three seat slats, two back slats and a lettered top plank
    const iron = s.material('#2a2c2e', { roughness: 0.6, metalness: 0.3 });
    const paintOf = (index: number) => {
      const colour = a.paint === 'rainbow' ? RAINBOW[index % RAINBOW.length] : { blue: '#7fb0d8', green: '#2f5a3a', red: '#c8322a', bare: '#9a8468', yellow: '#f2c21c' }[a.paint as 'blue' | 'green' | 'red' | 'bare' | 'yellow'];
      return s.material(colour, { roughness: a.paint === 'bare' ? 1 : 0.7 });
    };
    for (const sx of [-1, 1]) {
      const x = sx * (L / 2 - 0.05);
      s.box([0.06, SEAT, DEPTH], [x, SEAT / 2, 0], iron);
      s.box([0.06, 0.5, 0.08], [x, SEAT + 0.25, -DEPTH / 2 + 0.04], iron).rotation.x = -0.12;
      s.box([0.06, 0.05, DEPTH + 0.04], [x, SEAT + 0.24, 0.02], iron);
      s.box([0.07, 0.08, 0.1], [x, 0.04, -DEPTH / 2 + 0.05], iron);
      s.box([0.07, 0.08, 0.1], [x, 0.04, DEPTH / 2 - 0.05], iron);
    }
    for (let i = 0; i < 3; i++) s.box([L - 0.14, 0.035, 0.11], [0, SEAT, -DEPTH / 2 + 0.08 + i * 0.13], paintOf(i));
    for (let i = 0; i < 2; i++) {
      const slat = s.box([L - 0.14, 0.09, 0.03], [0, SEAT + 0.12 + i * 0.13, -DEPTH / 2 + 0.03 - i * 0.016], paintOf(3 + i));
      slat.rotation.x = -0.12;
    }
    // The top plank carries the lettering, painted on canvas and weathered by the scene's wear.
    const topColour = a.paint === 'rainbow' ? RAINBOW[5] : { blue: '#7fb0d8', green: '#2f5a3a', red: '#c8322a', bare: '#9a8468', yellow: '#f2c21c' }[a.paint as 'blue' | 'green' | 'red' | 'bare' | 'yellow'];
    const text = { friendship: 'FRIENDSHIP BENCH', buddy: 'BUDDY BENCH', talk: 'SIT HERE IF YOU WANT A FRIEND', memorial: '', worn: 'FRIENDSHIP BENCH' }[a.lettering];
    const plank = paint(1024, 128, (c) => {
      c.fillStyle = topColour; c.fillRect(0, 0, 1024, 128);
      if (a.paint !== 'bare') for (let i = 0; i < mood.wear * 60; i++) { c.fillStyle = 'rgba(150,130,100,0.6)'; c.fillRect(random() * 1024, random() * 128, 4 + random() * 30, 2 + random() * 8); }
      for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, random() * 128, 1024, 1); }
      if (text) {
        c.fillStyle = a.paint === 'bare' || a.paint === 'yellow' || a.paint === 'blue' ? '#2a2a2e' : '#f4f1e8';
        c.font = `bold ${text.length > 16 ? 56 : 82}px sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.globalAlpha = a.lettering === 'worn' ? 0.35 : 1 - mood.wear * 0.35;
        c.fillText(text, 512, 66, 960);
        if (a.lettering === 'worn') { c.globalAlpha = 0.9; c.fillStyle = topColour; for (let i = 0; i < 50; i++) c.fillRect(random() * 1024, random() * 128, 10 + random() * 40, 4 + random() * 12); }
        c.globalAlpha = 1;
      }
    });
    const top = s.mesh(new THREE.BoxGeometry(L - 0.14, 0.16, 0.03), new THREE.MeshStandardMaterial({ map: plank, roughness: 0.75 }), [0, SEAT + 0.41, -DEPTH / 2 - 0.004]);
    top.rotation.x = -0.12;
    if (a.lettering === 'memorial') {
      const plaque = s.label('IN MEMORY OF MRS OKAFOR', 0.3, 0.07, [0, SEAT + 0.41, -DEPTH / 2 + 0.013], '#3a2a10', '#c9a44a');
      plaque.rotation.x = -0.12;
    }
    if (a.paint === 'yellow') {
      const sun = paint(128, 128, (c) => { c.clearRect(0, 0, 128, 128); c.fillStyle = '#ff8a1a'; c.beginPath(); c.arc(64, 64, 30, 0, 7); c.fill(); c.strokeStyle = '#ff8a1a'; c.lineWidth = 6; for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4; c.beginPath(); c.moveTo(64 + Math.cos(ang) * 38, 64 + Math.sin(ang) * 38); c.lineTo(64 + Math.cos(ang) * 56, 64 + Math.sin(ang) * 56); c.stroke(); } });
      const face = s.mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: sun, transparent: true, roughness: 0.8, depthWrite: false }), [-end * (L / 2 - 0.3), SEAT + 0.25, -DEPTH / 2 + 0.03]);
      face.rotation.x = -0.12;
      face.castShadow = false;
    }

    // ---- the child at one end, lifted so the feet swing clear of the ground
    const H = mix(0.98, 1.3, a.size);
    const coat = a.hood === 'up' || a.hands === 'pockets';
    const coatColour = pick(random, ['#2a2f3a', '#8a1f2a', '#3a6a3a', '#d85a2a', '#2a4a9a']);
    const child = figure(s, {
      height: H, build: a.size < 0.4 ? 'slight' : 'average', style: 'doll', skin: pickSkin(random),
      hair: a.hood === 'up' ? 'hood' : a.hood === 'hat' ? 'hat' : a.hood === 'short' ? 'short' : 'long', hairColor: a.hood === 'hat' ? pick(random, ['#d83a4a', '#2a4a9a', '#f2c21c']) : pick(random, HAIR_COLOURS),
      top: coat ? coatColour : school, bottom: pick(random, ['#8a8d93', '#2a2f3a', '#3a3a3e']), shoes: pick(random, ['#1d1a18', '#f2f0ea', '#c8322a']), sleeves: 'long',
      pose: 'sitting', gaze: 'down',
    });
    s.root.add(child.root);
    const pose = rig(child);
    pose.leg('left', { forward: 86, out: 5, knee: 100, foot: 'flat' });
    pose.leg('right', { forward: 86, out: 5, knee: 100, foot: 'flat' });
    if (a.hands === 'tucked') { pose.arm('left', { forward: 52, out: 2, bend: 6 }); pose.arm('right', { forward: 52, out: 2, bend: 6 }); }
    else if (a.hands === 'lap') { pose.arm('left', { forward: 40, out: -2, bend: 60, across: 50 }); pose.arm('right', { forward: 40, out: -2, bend: 60, across: 50 }); }
    else if (a.hands === 'pockets') { pose.arm('left', { forward: 12, out: 4, bend: 30, across: 28 }); pose.arm('right', { forward: 12, out: 4, bend: 30, across: 28 }); }
    else { pose.arm('left', { forward: 35, out: -6, bend: 120, across: 75 }); pose.arm('right', { forward: 35, out: -6, bend: 120, across: 75 }); }
    pose.bow(a.gaze === 'up' ? 4 : 18, 0, 0);
    const look = { down: [30, 0], across: [-2, -end * 35], along: [8, end * 75], up: [-30, 0] }[a.gaze];
    pose.look(look[0], look[1]);
    child.settle();
    child.root.updateMatrixWorld(true);
    // Hips on the seat: lift the whole figure, then the shins hang below the slats.
    const hip = at(s, child.pelvis);
    child.root.position.set(end * (L / 2 - 0.4), SEAT + 0.03 * H - hip.y, 0.02);
    child.root.updateMatrixWorld(true);
    if (coat) {
      const hipNow = at(s, child.pelvis);
      const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * H, 0.12 * H, 0.14 * H, 16, 1, true), s.material(coatColour, { roughness: 0.9, side: THREE.DoubleSide }));
      hem.position.copy(hipNow).add(new THREE.Vector3(0, -0.02 * H, 0.02 * H));
      hem.castShadow = true;
      s.root.add(hem);
    }

    // ---- what sits beside them
    const bx = -end * 0.15, bz = 0.02;
    if (a.beside === 'lunchbox') s.box([0.24, 0.1, 0.17], [bx, SEAT + 0.07, bz], s.material(pick(random, ['#e8402a', '#2a7ad8', '#f2c21c', '#8a4ad8']), { roughness: 0.5 })).rotation.y = (random() - 0.5) * 0.6;
    if (a.beside === 'book') {
      const book = s.box([0.16, 0.03, 0.22], [bx, SEAT + 0.035, bz], s.material(pick(random, ['#1d3a7a', '#c81f2a', '#2a7a3a']), { roughness: 0.6 }));
      book.rotation.y = (random() - 0.5) * 0.8;
      s.box([0.15, 0.025, 0.21], [bx, SEAT + 0.036, bz], s.material('#f2eee2', { roughness: 0.9 })).rotation.copy(book.rotation);
    }
    if (a.beside === 'bag') {
      const bag = s.box([0.26, 0.3, 0.14], [-end * (L / 2 - 0.3), SEAT + 0.15, -0.05], s.material(pick(random, ['#d83a7a', '#2a63c8', '#3a9a5a', '#2a2a2e']), { roughness: 0.8 }));
      bag.rotation.set(-0.25, 0, end * 0.3);
    }
    if (a.beside === 'jumper') {
      const wool = s.material(school, { roughness: 0.95 });
      s.box([0.26, 0.06, 0.2], [bx, SEAT + 0.05, bz], wool);
      s.box([0.24, 0.05, 0.18], [bx, SEAT + 0.1, bz], wool);
    }

    // ---- who else is there
    const others: ReturnType<typeof figure>[] = [];
    if (a.company === 'approaching') {
      const other = figure(s, {
        height: H * mix(0.95, 1.1, random()), style: 'doll', skin: pickSkin(random), hair: pick(random, ['short', 'long', 'bun', 'cap'] as const), hairColor: pick(random, HAIR_COLOURS),
        top: school, bottom: pick(random, ['#8a8d93', '#2a2f3a']), shoes: '#1d1a18', sleeves: 'long', pose: 'walking', gaze: 'ahead',
      });
      s.root.add(other.root);
      other.root.position.set(-end * 1.1, 0, 0.85);
      other.root.rotation.y = Math.PI + end * 0.7;
      others.push(other);
    }
    if (a.company === 'farend') {
      const other = figure(s, {
        height: H * mix(0.95, 1.15, random()), style: 'doll', skin: pickSkin(random), hair: pick(random, ['short', 'long', 'hood', 'cap'] as const), hairColor: pick(random, HAIR_COLOURS),
        top: random() < 0.5 ? school : pick(random, ['#2a2f3a', '#8a1f2a']), bottom: pick(random, ['#8a8d93', '#2a2f3a']), shoes: '#1d1a18', sleeves: 'long', pose: 'sitting', gaze: 'left',
      });
      s.root.add(other.root);
      const op = rig(other);
      op.arm('left', { forward: 35, out: -4, bend: 118, across: 72 });
      op.arm('right', { forward: 35, out: -4, bend: 118, across: 72 });
      op.leg('left', { forward: 86, out: 5, knee: 100, foot: 'flat' });
      op.leg('right', { forward: 86, out: 5, knee: 100, foot: 'flat' });
      op.look(10, end * 40);
      other.settle();
      other.root.updateMatrixWorld(true);
      const ohip = at(s, other.pelvis);
      other.root.position.set(-end * (L / 2 - 0.4), SEAT + 0.03 * H - ohip.y, 0.02);
      others.push(other);
    }
    if (a.company === 'adult') {
      const AH = 1.64, heavy = random() < 0.5;
      const other = figure(s, {
        height: AH, build: heavy ? 'heavy' : 'average', style: 'doll', skin: pickSkin(random), hair: pick(random, ['bun', 'short', 'long'] as const), hairColor: pick(random, ['#c9c4bc', '#3b2a22', '#6b4a2e']),
        top: pick(random, ['#8a8a8e', '#9a7ab8', '#c9b89a']), bottom: '#2a2a30', shoes: '#1d1a18', sleeves: 'long', pose: 'hands-on-hips', gaze: 'down',
      });
      s.root.add(other.root);
      const op = rig(other);
      op.bow(12);
      op.look(32, end * 25);
      other.settle();
      other.root.position.set(end * 0.95, 0, 0.55);
      other.root.rotation.y = -end * 0.8;
      // The hi-vis tabard that makes her a dinner lady: an open flattened cylinder just outside the torso, with a silver band.
      // The figure's torso is shoulderW = H * 0.115 * wide across and about limb * 1.35 deep, so the tabard clears both.
      const wide = heavy ? 1.3 : 1, torsoL = AH * 0.28, r = AH * 0.125 * wide, depth = AH * 0.036 * wide * 1.35 * (heavy ? 1.25 : 1) * 1.2;
      const vis = s.material('#e8f52a', { roughness: 0.7, emissive: '#e8f52a', emissiveIntensity: 0.18, side: THREE.DoubleSide });
      const tab = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.08, torsoL * 0.82, 18, 1, true), vis);
      tab.scale.z = depth / r;
      tab.position.y = torsoL * 0.47;
      tab.castShadow = true;
      other.joints.spine.add(tab);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, torsoL * 0.09, 18, 1, true), s.material('#d8dde0', { roughness: 0.35, metalness: 0.3, side: THREE.DoubleSide }));
      band.scale.z = depth * 1.03 / r;
      band.position.y = torsoL * 0.5;
      other.joints.spine.add(band);
      others.push(other);
    }

    // ---- motion: the feet swing, out of time with each other
    const knees = child.joints.knees;
    const base = { left: knees.left.rotation.x, right: knees.right.rotation.x };
    const rate = mix(0.8, 2.6, mood.energy), swing = mix(0.06, 0.3, mood.energy);
    const phase = random() * Math.PI * 2;
    return s.finish({
      update(dt, time) {
        child.update(dt, time);
        for (const other of others) other.update(dt, time);
        knees.left.rotation.x = base.left + Math.sin(time * rate + phase) * swing;
        knees.right.rotation.x = base.right + Math.sin(time * rate + phase + 2.1) * swing;
        for (const side of ['left', 'right'] as const) child.joints.ankles[side].rotation.x = -(knees[side].rotation.x + child.joints.hips[side].rotation.x) + 0.3;
      },
    });
  },
});
