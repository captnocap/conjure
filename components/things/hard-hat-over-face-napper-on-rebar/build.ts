import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type Build, HAT_COLOURS, type P, RAD, VEST_COLOURS, arm, boots, leg, paint, pick, pickSkin, vest, worldOf } from './site';

export default defineThing({
  questions: {
    face: choice('What covers his face?', {
      hat: 'His hard hat, tipped down over the eyes.',
      cap: 'A baseball cap pulled over the face.',
      newspaper: 'A folded newspaper laid over the face.',
      arm: 'The crook of one arm thrown over the eyes.',
      nothing: 'Nothing: face to the sky, mouth open.',
    }),
    bed: choice('What does he lie on?', {
      rebar: 'A banded bundle of rebar.',
      timber: 'A stack of timber planks.',
      plywood: 'A flat pile of plywood sheets.',
      cement: 'A row of cement sacks.',
    }),
    lunchbox: noul('Does a lunchbox sit by his boots?'),
    boots: choice('How do his legs lie?', {
      crossed: 'Boots crossed at the ankle.',
      splayed: 'Legs splayed, toes pointing out.',
      knee: 'One knee drawn up.',
    }),
    vest: choice('What is he wearing on top?', {
      orange: 'An orange hi-vis vest hanging open over a t-shirt.',
      yellow: 'A yellow hi-vis vest hanging open.',
      none: 'No vest: shirt off, a grey t-shirt rolled under the head.',
      overalls: 'Dusty overalls with the top half tied at the waist.',
    }),
    hat: choice('What colour is his hard hat?', {
      white: 'White.', yellow: 'Yellow.', orange: 'Orange.', blue: 'Blue.', red: 'Red.',
    }),
    beside: choice('What is beside his head?', {
      jacket: 'A rolled jacket for a pillow.',
      radio: 'A battered site radio playing.',
      phone: 'A phone on his chest, headphones in.',
      bottle: 'A big water bottle and a crumpled bag.',
      nothing: 'Nothing: head straight on the steel.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.68, 1.88, random());
    const build: Build = random() < 0.4 ? 'heavy' : 'average';
    const skin = pickSkin(random);
    const bare = a.vest === 'none';
    const overalls = a.vest === 'overalls';
    const overallColour = pick(random, ['#3a5a8a', '#f07a1a', '#6e7074', '#8a7a5a']);
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'lying', hair: 'short', hairColor: pick(random, ['#2a2320', '#4a3222', '#6b4a2e', '#a8a09a']),
      skin, top: bare ? skin : overalls ? '#d9d6cc' : pick(random, ['#8a8c8e', '#3a4a6a', '#b8302a']), bottom: overalls ? overallColour : '#3f4a5c', shoes: '#5a4030', sleeves: 'short',
    });
    s.root.add(person.root);

    // ---- the bed he lies on: its top height decides where he is
    const bedLength = 2.4, bedTop = { rebar: 0.37, timber: 0.42, plywood: 0.24, cement: 0.3 }[a.bed];
    const bedW = { rebar: 0.55, timber: 0.6, plywood: 1.22, cement: 0.75 }[a.bed];
    if (a.bed === 'rebar') {
      const rebar = s.material(new THREE.Color('#7a4a32').lerp(new THREE.Color('#4a3a30'), mood.wear * 0.5), { roughness: 0.95 });
      const bar = new THREE.CylinderGeometry(1, 1, 1, 7);
      const rows = 6, cols = 9;
      const matrix = new THREE.Matrix4();
      const along = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      const mesh = new THREE.InstancedMesh(bar, rebar, rows * cols);
      let index = 0;
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const r = 0.014 + random() * 0.004;
        const x = (col - (cols - 1) / 2) * 0.058 + (row % 2) * 0.025 + (random() - 0.5) * 0.01;
        const y = 0.08 + r + row * 0.052;
        const z = (random() - 0.5) * 0.3;
        matrix.compose(new THREE.Vector3(x, y, z), along, new THREE.Vector3(r, bedLength + random() * 0.4, r));
        mesh.setMatrixAt(index++, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      // Banding wire round the bundle, and the dunnage under it.
      const wire = s.material('#9aa0a6', { metalness: 0.7, roughness: 0.4 });
      for (const z of [-0.8, 0, 0.8]) { const band = s.ring(0.3, 0.006, [0, 0.235, z], wire); band.scale.x = 0.95; band.scale.y = 0.56; }
      for (const z of [-0.9, 0.9]) s.box([0.7, 0.08, 0.1], [0, 0.04, z], s.material('#a8864f', { roughness: 0.9 }));
    } else if (a.bed === 'timber') {
      const wood = s.material('#c9a66b', { roughness: 0.9 });
      const ends = s.material('#b08a50', { roughness: 0.95 });
      for (let layer = 0; layer < 6; layer++) for (let i = 0; i < 4; i++) {
        s.box([0.14, 0.07, bedLength + (random() - 0.5) * 0.15], [(i - 1.5) * 0.15, 0.035 + layer * 0.07, (random() - 0.5) * 0.08], layer % 2 ? ends : wood);
      }
      for (const z of [-0.9, 0.9]) s.box([0.7, 0.04, 0.08], [0, 0.02, z], s.material('#a8864f', { roughness: 0.9 }));
    } else if (a.bed === 'plywood') {
      const ply = new THREE.MeshStandardMaterial({ map: paint(128, 256, (c) => { c.fillStyle = '#c9a66b'; c.fillRect(0, 0, 128, 256); for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(120,80,40,${0.1 + random() * 0.12})`; c.lineWidth = 1 + random() * 2; c.beginPath(); const x = random() * 128; c.moveTo(x, 0); c.bezierCurveTo(x + 10, 80, x - 10, 170, x + 5, 256); c.stroke(); } }), roughness: 0.9 });
      for (let i = 0; i < 12; i++) s.box([bedW, 0.018, bedLength], [(random() - 0.5) * 0.03, 0.009 + i * 0.019, (random() - 0.5) * 0.04], ply);
      for (const z of [-0.9, 0.9]) s.box([1.3, 0.04, 0.08], [0, 0.02, z], s.material('#a8864f', { roughness: 0.9 }));
    } else {
      const sack = s.material(pick(random, ['#d8cfb8', '#e2dccb', '#c9b89a']), { roughness: 1 });
      for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 4; i++) {
        const bag = s.box([0.6, 0.14, 0.52], [0, 0.07 + layer * 0.145, (i - 1.5) * 0.56 + (layer ? 0.1 : 0)], sack);
        bag.rotation.y = (random() - 0.5) * 0.08;
        bag.scale.set(1, 1, 1);
      }
      for (let i = 0; i < 4; i++) s.box([0.5, 0.02, 0.12], [0, 0.3, (i - 1.5) * 0.56 + 0.1], s.material('#b8302a', { roughness: 0.9 }));
    }

    // ---- the sleeper, laid along the bed
    const knee = a.boots === 'knee' ? (random() < 0.5 ? 'left' : 'right') : null;
    const crossTop = random() < 0.5 ? 'left' : 'right';
    for (const side of ['left', 'right'] as const) {
      if (a.boots === 'crossed') leg(person, side, { forward: side === crossTop ? 4 : 0, out: side === crossTop ? -11 : 6, knee: side === crossTop ? 6 : 0, foot: 10 });
      else if (a.boots === 'splayed') leg(person, side, { forward: 0, out: 9, knee: 0, foot: 20 });
      else leg(person, side, side === knee ? { forward: 70, out: 4, knee: 110, foot: 'flat' } : { forward: 0, out: 7, knee: 0, foot: 15 });
    }
    const eyeArm = a.face === 'arm' ? (random() < 0.5 ? 'left' : 'right') : null;
    for (const side of ['left', 'right'] as const) {
      if (side === eyeArm) arm(person, side, { forward: 150, out: 20, bend: 120, across: 40 });
      else arm(person, side, { forward: 60, out: 4, bend: 108, across: 44 });
    }
    person.joints.neck.rotation.set(-0.08, (random() - 0.5) * 0.4, 0);
    person.settle();
    // On the bed, head toward +z, slightly off the centre line.
    person.root.rotation.y = Math.PI + (random() - 0.5) * 0.08;
    person.root.position.set((random() - 0.5) * 0.06, bedTop + 0.01, 0);
    person.root.updateMatrixWorld(true);
    boots(s, person, H, '#5a4030');
    if (!bare && !overalls) vest(s, person, H, build, VEST_COLOURS[a.vest]);
    if (overalls) {
      // Bib straps hanging loose at the waist.
      const strap = s.material(overallColour, { roughness: 0.9 });
      for (const sign of [-1, 1]) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.012), strap);
        tie.position.set(sign * 0.14, 0.12, H * 0.036 * 1.35 + 0.01);
        tie.rotation.z = sign * 0.9;
        person.joints.spine.add(tie);
      }
    }
    const head = worldOf(person.head);
    const headR = H * 0.064;
    const chest = worldOf(person.pelvis);
    chest.y += 0.1;
    chest.z += H * 0.2;
    const side = random() < 0.5 ? 1 : -1;

    // ---- what covers the face: the hat sits where the face is, lying on its back
    const hatColour = HAT_COLOURS[a.hat];
    if (a.face === 'hat') {
      const shell = s.material(hatColour, { roughness: 0.35 });
      const group = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.16, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), shell);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.36, headR * 1.4, headR * 0.08, 24), shell);
      const peak = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.2, headR * 0.08, headR * 0.7), shell);
      peak.position.z = headR * 1.4;
      dome.position.y = rim.position.y = 0;
      for (const mesh of [dome, rim, peak]) { mesh.castShadow = true; group.add(mesh); }
      // Over the face: the open side on the face, the dome to the sky, the peak dipping toward the chest.
      group.position.set(head.x, head.y + headR * 0.72, head.z - headR * 0.05);
      group.rotation.set(-14 * RAD, Math.PI, 0);
      s.root.add(group);
    } else {
      // The hat lies on the bed beside the head.
      const shell = s.material(hatColour, { roughness: 0.35 });
      const spare = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.16, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), shell);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.36, headR * 1.4, headR * 0.08, 24), shell);
      dome.castShadow = rim.castShadow = true;
      spare.add(dome, rim);
      spare.position.set(head.x + side * (bedW / 2 + 0.2), headR * 0.08, head.z - 0.1);
      spare.rotation.set(Math.PI, random() * 3, 0.1);
      s.root.add(spare);
    }
    if (a.face === 'cap') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.08, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), s.material(pick(random, ['#2a2a2c', '#2b4f8a', '#b8302a']), { roughness: 0.9 }));
      cap.position.set(head.x, head.y + headR * 0.7, head.z);
      cap.rotation.set(-10 * RAD, Math.PI, 0);
      cap.castShadow = true;
      s.root.add(cap);
      const peak = s.box([headR * 1.3, headR * 0.1, headR * 0.9], [head.x, head.y + headR * 0.72, head.z - headR * 1.3], s.material('#2a2a2c', { roughness: 0.9 }));
      peak.rotation.x = 0.35;
    }
    if (a.face === 'newspaper') {
      const news = new THREE.MeshStandardMaterial({ map: paint(128, 96, (c) => {
        c.fillStyle = '#eee9dc'; c.fillRect(0, 0, 128, 96);
        c.fillStyle = '#2a2a2c'; c.fillRect(8, 6, 112, 14);
        for (let i = 0; i < 18; i++) { c.fillStyle = `rgba(40,40,44,${0.5 + random() * 0.3})`; c.fillRect(8 + (i % 3) * 40, 26 + Math.floor(i / 3) * 11, 32 - random() * 10, 3); }
        c.fillStyle = '#6a6a6e'; c.fillRect(60, 28, 56, 36);
      }), roughness: 0.95, side: THREE.DoubleSide });
      const sheet = s.mesh(new THREE.BoxGeometry(headR * 2.6, 0.004, headR * 2.2), news, [head.x, head.y + headR * 1.08, head.z + headR * 0.2]);
      sheet.rotation.set(0.15, 0.05, 0.02);
      sheet.castShadow = true;
    }

    // ---- by the head and by the boots
    const feet = worldOf(person.joints.ankles.left);
    const footZ = feet.z - 0.3;
    if (a.beside === 'jacket') {
      const roll = s.cylinder(0.09, 0.09, 0.36, [head.x, bedTop + 0.07, head.z - 0.02], s.material(pick(random, ['#3a4a6a', '#6b5a48', '#2a2a2c']), { roughness: 0.95 }), 12);
      roll.rotation.z = Math.PI / 2;
      roll.scale.y = 0.65;
    }
    if (a.beside === 'radio') {
      const rx = head.x + side * (bedW / 2 + 0.25);
      const radio = s.box([0.3, 0.16, 0.14], [rx, 0.08, head.z - 0.05], s.material('#f2c21c', { roughness: 0.6 }));
      void radio;
      s.box([0.1, 0.1, 0.004], [rx - 0.07, 0.08, head.z + 0.022], s.material('#2a2a2c', { roughness: 0.6 }));
      s.rod([rx + 0.1, 0.16, head.z - 0.05], [rx + 0.2, 0.45, head.z - 0.1], 0.004, s.material('#9aa0a6', { metalness: 0.7 }));
    }
    if (a.beside === 'phone') {
      const phone = s.box([0.07, 0.008, 0.14], [chest.x, chest.y + 0.03, chest.z], s.material('#1f2124', { roughness: 0.4 }));
      phone.rotation.y = 0.3;
      s.rod([chest.x, chest.y + 0.03, chest.z - 0.05], [head.x + headR * 0.9, head.y + headR * 0.3, head.z], 0.003, s.material('#f2f1ea'));
      s.rod([chest.x, chest.y + 0.03, chest.z - 0.05], [head.x - headR * 0.9, head.y + headR * 0.3, head.z], 0.003, s.material('#f2f1ea'));
    }
    if (a.beside === 'bottle') {
      const bx = head.x + side * (bedW / 2 + 0.2);
      s.cylinder(0.055, 0.055, 0.28, [bx, 0.14, head.z + 0.1], new THREE.MeshPhysicalMaterial({ color: '#bfe0ff', transparent: true, opacity: 0.5, roughness: 0.1, depthWrite: false }), 12);
      s.cylinder(0.05, 0.05, 0.1, [bx, 0.05, head.z + 0.1], s.material('#a8d4f8', { roughness: 0.2, transparent: true, opacity: 0.8 }), 12);
      s.cylinder(0.02, 0.02, 0.03, [bx, 0.295, head.z + 0.1], s.material('#2b6fb8', { roughness: 0.5 }), 10);
      s.ball([0.07, 0.05, 0.06], [bx + side * 0.12, 0.05, head.z - 0.15], s.material('#b48a5a', { roughness: 0.95 }), 8);
    }
    if (a.lunchbox) {
      const boxColour = pick(random, ['#2b4f8a', '#b8302a', '#8e9398', '#2f8a4a']);
      const lunch = s.box([0.3, 0.17, 0.17], [feet.x + side * (bedW / 2 + 0.2), 0.085, footZ + 0.1], s.material(boxColour, { roughness: 0.55 }));
      lunch.rotation.y = (random() - 0.5) * 0.6;
      s.box([0.1, 0.02, 0.05], [lunch.position.x, 0.18, lunch.position.z], s.material('#2a2a2c', { roughness: 0.6 })).rotation.y = lunch.rotation.y;
    }

    // ---- the chest rises and falls
    const torso = person.joints.spine;
    const energy = mood.energy;
    const hands: P[] = [];
    void hands;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        torso.position.y = Math.sin(time * (0.9 + energy * 0.6)) * 0.004;
      },
    });
  },
});
