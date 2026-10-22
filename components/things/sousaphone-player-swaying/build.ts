import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { paint, pick, pickSkin, reach, rig } from './rig';

export default defineThing({
  questions: {
    brass: choice('What state is the brass in?', {
      polished: 'Polished to a mirror, catching the sun.',
      dull: 'Dull and dented, forty years of parades in it.',
      silver: 'Silver-plated, cool and bright.',
      white: 'A white fibreglass sousaphone, the school-band kind.',
    }),
    bell: choice('What is in or on the bell?', {
      plain: 'Plain, nothing painted.',
      name: 'The band name painted in a ring round the inside of the bell.',
      crepe: 'A black crepe ribbon tied at the bell for the dead.',
      flower: 'A single flower stuck in the bell, a carnation or a lily.',
      sign: 'A hand-lettered sign taped inside: TIPS, or the band name.',
    }),
    hat: choice('What is on his head?', {
      cap: 'A black band cap with a peak.',
      bare: 'Bare head, hair cropped close.',
      bandana: 'A bandana tied over the head.',
      straw: 'A straw hat against the sun.',
    }),
    towel: noul('Is a towel tucked at the collar to catch the sweat?'),
    lean: choice('Which way is he leaning?', {
      left: 'Rolled to the left, the bell swinging wide.',
      right: 'Rolled to the right, under the weight.',
      upright: 'Standing square, planted, blowing straight ahead.',
    }),
    shirt: choice('What is he wearing on top?', {
      white: 'A white shirt, sleeves rolled.',
      black: 'A black band shirt.',
      club: 'A bright club T-shirt, yellow or red.',
      uniform: 'A full band tunic with brass buttons.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.74, 1.88, random());
    const wide = 1.3;
    const limb = H * 0.036 * wide, torsoL = H * 0.28, shoulderW = H * 0.115 * wide, headR = H * 0.064, neckL = H * 0.03;
    const shirtHex = { white: '#f1ede4', black: '#1d1c22', club: pick(random, ['#e2b43a', '#c42a2a', '#2a6ad8']), uniform: pick(random, ['#8a1f2a', '#1f2a5a', '#1f4a3a']) }[a.shirt];
    const hair = a.hat === 'cap' ? 'cap' : a.hat === 'bare' ? 'none' : 'short';
    const person = figure(s, {
      height: H, build: 'heavy', style: 'doll', skin: pickSkin(random), hair, hairColor: a.hat === 'cap' ? '#17161a' : '#1a1512',
      top: shirtHex, bottom: '#1d1c22', shoes: pick(random, ['#141416', '#f1ede4']), sleeves: a.shirt === 'uniform' ? 'long' : 'short', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const r = rig(person);
    const roll = a.lean === 'left' ? 9 : a.lean === 'right' ? -9 : 0;
    r.leg('left', { forward: 0, out: a.lean === 'left' ? 16 : 6, knee: 0 });
    r.leg('right', { forward: 0, out: a.lean === 'right' ? 16 : 6, knee: 0 });
    r.lean(-2, roll);
    r.bow(-4, roll * 0.5, 0);
    r.look(-4, -roll * 0.6, 0);

    // Materials: the brass, bright or beaten.
    const metalHex = { polished: '#d9b23a', dull: '#9a7a30', silver: '#d8dce0', white: '#f1efe8' }[a.brass];
    const brass = new THREE.MeshStandardMaterial({ color: metalHex, metalness: a.brass === 'white' ? 0.05 : a.brass === 'dull' ? 0.6 : 0.9, roughness: a.brass === 'dull' ? 0.55 : a.brass === 'white' ? 0.5 : 0.22 });
    const brassDouble = brass.clone();
    brassDouble.side = THREE.DoubleSide;

    // The instrument lives in the torso's frame so it rolls with the sway.
    const spine = person.joints.spine;
    const horn = new THREE.Group();
    spine.add(horn);
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D = horn) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    // Main coil: a ring over the left shoulder and under the right arm, hugging the chest.
    const R = 0.235 * H;
    const tilt = new THREE.Group();
    tilt.position.set(0.02, torsoL * 0.48, 0.01);
    tilt.rotation.z = -0.56;
    horn.add(tilt);
    const ring = new THREE.Group();
    ring.rotation.y = Math.PI / 2;
    ring.scale.set(0.62, 1, 1);
    tilt.add(ring);
    add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.045 * H / 1.8, 10, 40), brass), ring);
    // A second, tighter loop of tubing inside the first, as the coil doubles back.
    const inner = add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.78, 0.03 * H / 1.8, 8, 36), brass), ring);
    inner.position.set(0.04, 0, 0);
    // Where the coil tops the shoulder, an elbow turns up into the bell.
    const top = new THREE.Vector3(0, R, 0).applyEuler(new THREE.Euler(0, 0, -0.56)).add(tilt.position);
    const bellBase = top.clone().add(new THREE.Vector3(0.02, 0.04, 0.06));
    const elbow = add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.04 * H / 1.8, 8, 16, Math.PI / 2), brass));
    elbow.position.set(top.x + 0.02, top.y + 0.02, top.z + 0.03);
    elbow.rotation.set(0, Math.PI / 2, 0);
    // The bell: a lathe flaring to a wide mouth, tilted forward above the left shoulder.
    const bellL = 0.3 * H, mouthR = 0.19 * H;
    const profile = [[0.03, 0], [0.034, 0.3], [0.045, 0.55], [0.07, 0.72], [0.12, 0.84], [0.2, 0.92], [0.3, 0.97], [0.34, 1]].map(([x, y]) => new THREE.Vector2(x * mouthR / 0.34, y * bellL));
    const nameMap = a.bell === 'name' || a.bell === 'sign' ? paint(1024, 256, (c) => {
      c.fillStyle = metalHex;
      c.fillRect(0, 0, 1024, 256);
      c.fillStyle = a.bell === 'sign' ? '#f3efe6' : a.brass === 'white' ? '#c42a2a' : '#1a1a1e';
      c.fillRect(0, 150, 1024, 60);
      c.fillStyle = a.bell === 'sign' ? '#1a1a1e' : '#f3efe6';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = 'bold 44px sans-serif';
      const name = a.bell === 'sign' ? pick(random, ['TIPS', 'THANK YOU', 'HOT 8', 'REBIRTH']) : pick(random, ['TREME BRASS BAND', 'HOT 8 BRASS BAND', 'REBIRTH', 'OLYMPIA BRASS BAND', 'TO BE CONTINUED']);
      for (let i = 0; i < 3; i++) c.fillText(name, 170 + i * 342, 180);
    }) : null;
    const bellMaterial = nameMap ? new THREE.MeshStandardMaterial({ map: nameMap, metalness: brass.metalness * 0.8, roughness: brass.roughness, side: THREE.DoubleSide }) : brassDouble;
    const bell = add(new THREE.Mesh(new THREE.LatheGeometry(profile, 36), bellMaterial));
    bell.position.copy(bellBase);
    bell.rotation.set(0.5, 0, -0.08);
    const rim = add(new THREE.Mesh(new THREE.TorusGeometry(mouthR, 0.012 * H / 1.8, 8, 40), brass));
    rim.position.set(0, bellL, 0);
    rim.rotation.x = Math.PI / 2;
    bell.add(rim);
    if (a.bell === 'crepe') {
      const crepe = new THREE.MeshStandardMaterial({ color: '#141216', roughness: 1, side: THREE.DoubleSide });
      const bow = new THREE.Mesh(new THREE.TorusGeometry(mouthR * 0.98, 0.025, 6, 40), crepe);
      bow.position.y = bellL - 0.05;
      bow.rotation.x = Math.PI / 2;
      const streamer = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.5), crepe);
      streamer.position.set(mouthR * 0.9, bellL - 0.3, 0.02);
      streamer.rotation.set(0.1, 0.2, 0.05);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), crepe);
      knot.position.set(mouthR * 0.95, bellL - 0.05, 0);
      bell.add(bow, streamer, knot);
    }
    if (a.bell === 'flower') {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.35, 6), s.material('#3a6a2a'));
      stem.position.set(0.03, bellL - 0.1, 0);
      stem.rotation.z = 0.25;
      const lily = random() < 0.5;
      const head = new THREE.Mesh(lily ? new THREE.ConeGeometry(0.05, 0.09, 6, 1, true) : new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: lily ? '#f6f2ea' : pick(random, ['#f3efe6', '#c42a2a', '#e8a0b8']), roughness: 1, side: THREE.DoubleSide }));
      head.position.set(0.075, bellL + 0.07, 0);
      if (lily) head.rotation.z = Math.PI + 0.3;
      bell.add(stem, head);
    }
    // Valve section at the chest, with three piston caps, and the lead pipe up to the mouth.
    const valves = new THREE.Group();
    valves.position.set(-0.06 * H / 1.8, torsoL * 0.62, 0.17 * H / 1.8);
    valves.rotation.set(0.2, 0, 0.1);
    horn.add(valves);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.018 * H / 1.8, 0.018 * H / 1.8, 0.11 * H / 1.8, 12), brass), valves).rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const casing = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014 * H / 1.8, 0.014 * H / 1.8, 0.075 * H / 1.8, 12), brass), valves);
      casing.position.set((i - 1) * 0.034 * H / 1.8, 0.01, 0);
      const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.011 * H / 1.8, 0.011 * H / 1.8, 0.012, 10), s.material('#f1ede4', { roughness: 0.3 })), valves);
      cap.position.set((i - 1) * 0.034 * H / 1.8, 0.055 * H / 1.8, 0);
    }
    const tube = (points: THREE.Vector3[], radius: number) => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, radius, 8), brass));
    // From the valves a branch drops to the coil; from the valves a lead pipe climbs to the mouthpiece.
    const valvesAt = valves.position.clone();
    tube([valvesAt.clone().add(new THREE.Vector3(-0.06, -0.03, 0)), valvesAt.clone().add(new THREE.Vector3(-0.12, -0.12, 0.02)), new THREE.Vector3(-R * 0.5, torsoL * 0.2, 0.17 * H / 1.8)], 0.018 * H / 1.8);
    person.root.updateMatrixWorld(true);
    const mouth = spine.worldToLocal(person.head.localToWorld(new THREE.Vector3(0, -headR * 0.25, headR * 1.0)));
    const lead = tube([valvesAt.clone().add(new THREE.Vector3(0.05, 0.02, 0)), valvesAt.clone().add(new THREE.Vector3(0.1, 0.1, 0.02)), mouth.clone().add(new THREE.Vector3(0.03, -0.06, 0.08)), mouth.clone().add(new THREE.Vector3(0, 0, 0.02))], 0.009 * H / 1.8);
    void lead;
    const mouthpiece = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.009, 0.03, 10), brass));
    mouthpiece.position.copy(mouth).add(new THREE.Vector3(0, 0, 0.02));
    mouthpiece.rotation.x = Math.PI / 2;

    // Hands: right on the valve caps, left steadying the coil at the hip.
    person.root.updateMatrixWorld(true);
    reach(person, 'right', valves.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.05, 0.02)), { forward: 60, out: 20, bend: 100, across: 30 });
    reach(person, 'left', spine.localToWorld(new THREE.Vector3(R * 0.62 * 0.9, torsoL * 0.1, 0.16 * H / 1.8)), { forward: 30, out: 25, bend: 60, across: 20 });
    person.settle();

    // Headgear beyond the kit's cap, and the towel.
    if (a.hat === 'bandana') {
      const cloth = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.08, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), s.material(pick(random, ['#c42a2a', '#2a3a7a', '#1a1a1e', '#e2b43a']), { roughness: 1 }));
      cloth.position.y = headR * 0.12;
      const knot = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.25, headR * 0.3), cloth.material);
      knot.position.set(0, headR * 0.2, -headR * 1.0);
      cloth.castShadow = true;
      person.head.add(cloth, knot);
    }
    if (a.hat === 'straw') {
      const straw = s.material('#d8c27a', { roughness: 1 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 2.1, headR * 2.1, headR * 0.08, 24), straw);
      brim.position.y = headR * 0.7;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.95, headR * 1.05, headR * 0.9, 20), straw);
      crown.position.y = headR * 1.15;
      brim.castShadow = crown.castShadow = true;
      person.head.add(brim, crown);
    }
    if (a.towel) {
      const towel = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.0, limb * 0.42, 8, 20, Math.PI * 1.4), s.material('#f3efe6', { roughness: 1 }));
      towel.position.set(0, torsoL + neckL * 0.2, 0.01);
      towel.rotation.set(Math.PI / 2, 0, Math.PI * 0.8);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(limb * 1.1, torsoL * 0.3, 0.015), towel.material);
      tail.position.set(-shoulderW * 0.45, torsoL * 0.88, -limb * 1.4);
      tail.rotation.x = 0.2;
      towel.castShadow = tail.castShadow = true;
      spine.add(towel, tail);
    }
    if (a.shirt === 'uniform') {
      const button = s.material('#e2b43a', { metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 4; i++) for (const x of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), button);
        b.position.set(x * 0.04, torsoL * (0.35 + i * 0.16), limb * 1.35 * 1.25 + 0.004);
        spine.add(b);
      }
    }

    // Sway: a slow roll with the bass line, the bell swinging a little wider than the body.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const body = person.joints.body;
    const restRoll = body.rotation.z;
    const restBellZ = bell.rotation.z;
    return s.finish({
      update(dt, time) {
        const sway = Math.sin(time * mix(0.6, 1.8, energy) + phase);
        body.rotation.z = restRoll + sway * mix(0.01, 0.07, energy);
        bell.rotation.z = restBellZ + sway * 0.04 * energy;
        person.update(dt, time);
      },
    });
  },
});
