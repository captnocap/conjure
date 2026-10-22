import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { glow, paint, pick, pickSkin, rig, seat, worldOf } from './rig';

export default defineThing({
  questions: {
    people: choice('Who is on the sofa?', {
      'two-slumped': 'Two people slumped side by side, heads tipped together.',
      'one-lying': 'One person lying along it, feet over the armrest.',
      'one-sitting': 'One person sitting forward, elbows on knees, staring at the floor.',
      'three-squeezed': 'Three squeezed on, the middle one asleep on a shoulder.',
      empty: 'Nobody: a dent in the cushions and a blanket left behind.',
    }),
    asleep: noul('Is anyone asleep?'),
    fabric: choice('What is the sofa covered in?', {
      velvet: 'Threadbare red velvet.',
      floral: 'A faded floral print.',
      leather: 'Cracked brown leather.',
      corduroy: 'Mustard corduroy.',
      grey: 'Stained grey fabric, a cheap flat-pack sofa.',
    }),
    blanket: choice('What blanket is on it?', {
      tartan: 'A red tartan blanket.',
      foil: 'A silver foil blanket, crinkled.',
      fleece: 'A pink fleece throw.',
      sleeping: 'An unzipped sleeping bag.',
      none: 'No blanket.',
    }),
    litter: choice('What is on the floor around it?', {
      cans: 'Empty beer cans and a crushed water bottle.',
      balloons: 'Deflated balloons, a silver canister and a few cans.',
      flyers: 'Flyers, cigarette ends and a water bottle.',
      everything: 'Everything: cans, balloons, flyers, a shoe.',
      tidy: 'Someone has tidied: one water bottle and a bin bag.',
    }),
    sunlight: noul('Does a shaft of morning sunlight from a window land across the sofa?'),
    glowing: choice('What is still going from the night before?', {
      balloon: 'A helium balloon still drifting on its string, tied to the arm.',
      glowstick: 'A glowstick still faintly glowing on the cushion.',
      both: 'A balloon and a glowstick.',
      nothing: 'Nothing, it is all over.',
    }),
    jacket: noul('Is a jacket thrown over the armrest?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const SW = 2.0, SD = 0.9, SEAT = 0.44, ARM_H = 0.62, BACK_H = 0.85;
    const base = { velvet: '#8a1f2a', floral: '#d9c9a8', leather: '#5a3a24', corduroy: '#c9962a', grey: '#7a7a7e' }[a.fabric];
    const map = paint(256, 256, (c, w, h) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      if (a.fabric === 'floral') { for (let i = 0; i < 40; i++) { const x = random() * w, y = random() * h; c.fillStyle = pick(random, ['#b85a6a', '#8a9a5a', '#d9a06a']); for (let p = 0; p < 5; p++) { c.beginPath(); c.ellipse(x + Math.cos(p * 1.26) * 8, y + Math.sin(p * 1.26) * 8, 7, 4, p * 1.26, 0, 7); c.fill(); } c.fillStyle = '#f2e21c'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } }
      if (a.fabric === 'corduroy') { c.fillStyle = 'rgba(0,0,0,0.22)'; for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 2, h); }
      if (a.fabric === 'leather') { c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; for (let i = 0; i < 60; i++) { c.beginPath(); const x = random() * w, y = random() * h; c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 40, y + (random() - 0.5) * 40); c.stroke(); } c.fillStyle = 'rgba(255,220,180,0.12)'; c.fillRect(0, 0, w, h * 0.3); }
      if (a.fabric === 'velvet') { c.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 20; i++) c.fillRect(random() * w, random() * h, 30, 2); }
      if (a.fabric === 'grey') { c.fillStyle = 'rgba(60,50,40,0.25)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(random() * w, random() * h, 20 + random() * 20, 12 + random() * 12, random() * 3, 0, 7); c.fill(); } }
      // The mood's wear stains everything a little.
      c.fillStyle = `rgba(40,30,20,${mood.wear * 0.3})`; c.fillRect(0, 0, w, h);
    });
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(2, 2);
    const cover = new THREE.MeshStandardMaterial({ map, roughness: a.fabric === 'leather' ? 0.45 : 0.95 });
    const cushion = cover;
    const legMat = s.material('#3a2a1c', { roughness: 0.8 });

    // The frame: base, back, arms, cushions sagging in the middle.
    const sag = mix(0.02, 0.07, mood.wear);
    s.box([SW, SEAT - 0.16, SD], [0, 0.1 + (SEAT - 0.16) / 2, 0], cover);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.cylinder(0.03, 0.025, 0.1, [sx * (SW / 2 - 0.08), 0.05, sz * (SD / 2 - 0.08)], legMat, 10);
    const backBox = s.box([SW, BACK_H - 0.1, 0.22], [0, 0.1 + (BACK_H - 0.1) / 2, -SD / 2 + 0.11], cover);
    backBox.rotation.x = -0.06;
    for (const sx of [-1, 1]) {
      s.box([0.22, ARM_H - 0.1, SD], [sx * (SW / 2 - 0.11), 0.1 + (ARM_H - 0.1) / 2, 0], cover);
      s.cylinder(0.11, 0.11, SD, [sx * (SW / 2 - 0.11), ARM_H, 0], cover, 16).rotation.x = Math.PI / 2;
    }
    const cushions = a.people === 'three-squeezed' ? 3 : 2;
    const cw = (SW - 0.44) / cushions - 0.02;
    for (let i = 0; i < cushions; i++) {
      const x = -SW / 2 + 0.22 + cw / 2 + i * (cw + 0.02);
      const dent = a.people === 'empty' && i === Math.floor(cushions / 2) ? 0.03 : 0;
      s.box([cw, 0.14 - sag - dent, SD - 0.3], [x, SEAT - 0.07 - sag / 2 - dent / 2, 0.04], cushion);
      const backC = s.box([cw, 0.4, 0.14], [x, SEAT + 0.22, -SD / 2 + 0.28], cushion);
      backC.rotation.x = -0.18 - (random() - 0.5) * 0.1;
    }
    // A cushion kicked off onto the floor.
    if (random() < 0.5 || a.people === 'one-lying') { const fallen = s.box([0.4, 0.12, 0.4], [SW / 2 + 0.1, 0.06, SD / 2 + 0.25], cushion); fallen.rotation.y = random() * 1.2; }

    // People.
    const persons: ReturnType<typeof figure>[] = [];
    const make = (x: number, pose: 'slumped' | 'sitting' | 'lying', asleepNow: boolean, mirror: boolean) => {
      const H = mix(1.58, 1.84, random());
      const skin = pickSkin(random);
      const person = figure(s, {
        height: H, style: 'doll', skin, pose, gaze: asleepNow ? 'down' : 'ahead', face: asleepNow ? 'blank' : 'dots', mirror,
        hair: pick(random, ['short', 'long', 'bun', 'cap', 'hood'] as const), hairColor: pick(random, ['#1d1d1f', '#3b2a22', '#c9b071', '#8a3a2a']),
        top: pick(random, ['#e8e2d0', '#1d1d1f', '#6b2d8a', '#2a6b3a', '#ff3fb0', '#f2e21c', '#2bb5b0']), bottom: pick(random, ['#2a3a5a', '#1d1d1f', '#5a4a3a', '#8a8a8e']), shoes: pick(random, ['#f4f1e8', '#1d1d1f']),
        sleeves: random() < 0.5 ? 'short' : 'long', build: pick(random, ['slight', 'average', 'heavy'] as const),
      });
      s.root.add(person.root);
      persons.push(person);
      return { person, H, joints: rig(person) };
    };
    if (a.people === 'two-slumped' || a.people === 'three-squeezed') {
      const n = a.people === 'three-squeezed' ? 3 : 2;
      const xs = n === 3 ? [-0.6, 0, 0.6] : [-0.42, 0.42];
      xs.forEach((x, i) => {
        const middle = n === 3 && i === 1;
        const sleeping = a.asleep && (middle || i === 0);
        const { person, H, joints } = make(x, 'slumped', sleeping, i % 2 === 1);
        const toward = i === 0 ? 1 : -1;
        joints.bow(sleeping ? 32 : 22);
        joints.look(sleeping ? 35 : 15, 0, toward * (sleeping ? 28 : 14));
        joints.arm('left', { forward: 15, out: 10, bend: 50, across: 20 });
        joints.arm('right', { forward: 10, out: 14, bend: 35 });
        if (i === 0 && n === 2) joints.arm('right', { forward: 30, out: 95, bend: 40, across: -20 }); // an arm along the back behind the other
        joints.leg('left', { forward: 70, out: 14, knee: 75 });
        joints.leg('right', { forward: 76, out: 6, knee: 85 });
        joints.settle();
        seat(person, x, SEAT - sag + 0.03 * H, 0.0);
        person.root.rotation.y = (random() - 0.5) * 0.15;
      });
    } else if (a.people === 'one-sitting') {
      const x = (random() - 0.5) * 0.6;
      const { person, H, joints } = make(x, 'sitting', false, random() < 0.5);
      joints.bow(38); joints.look(a.asleep ? 50 : 28, 0, a.asleep ? 20 : 0);
      joints.arm('left', { forward: 95, out: 6, bend: 105, across: 10 });
      joints.arm('right', { forward: 95, out: 6, bend: 105, across: 10 });
      joints.leg('left', { forward: 84, out: 18, knee: 100 });
      joints.leg('right', { forward: 84, out: 18, knee: 100 });
      joints.settle();
      seat(person, x, SEAT - sag + 0.03 * H, 0.06);
      // A can held between the knees.
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 12), s.material(pick(random, ['#d8262c', '#2b6fb8', '#f2c21c', '#f4f1e8'])));
      can.position.y = -0.03;
      person.hands.right.add(can);
    } else if (a.people === 'one-lying') {
      const { person, H, joints } = make(0, 'lying', a.asleep, false);
      if (a.asleep) joints.arm('left', { forward: 150, out: 20, bend: 120, across: 40 }); // an arm thrown over the face
      else joints.arm('left', { forward: 90, out: 10, bend: 40, across: 20 });
      joints.arm('right', { forward: 20, out: 30, bend: 30 });
      joints.leg('right', { forward: 10, out: 8, knee: 30 });
      joints.look(a.asleep ? 10 : -15, 30, 0);
      joints.settle();
      person.root.rotation.y = -Math.PI / 2 + (random() - 0.5) * 0.1;
      joints.settle(true);
      person.root.position.set(0.05, SEAT - sag, -0.02);
      person.root.updateMatrixWorld(true);
      // A rolled jacket or cushion under the head.
      const headAt = worldOf(person.head);
      s.ball([0.18, 0.1, 0.22], [headAt.x, SEAT - sag + 0.02, headAt.z], cushion, 12);
    }

    // The blanket: a slab draped across laps or the back, with a fold hanging down the front.
    if (a.blanket !== 'none') {
      const blanketMap = paint(256, 256, (c, w, h) => {
        if (a.blanket === 'tartan') { c.fillStyle = '#8a1f24'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(20,40,20,0.5)'; for (let i = 0; i < w; i += 48) { c.fillRect(i, 0, 18, h); c.fillRect(0, i, w, 18); } c.fillStyle = 'rgba(240,220,120,0.6)'; for (let i = 24; i < w; i += 48) { c.fillRect(i, 0, 3, h); c.fillRect(0, i, w, 3); } }
        else if (a.blanket === 'foil') { c.fillStyle = '#c9ccd2'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '90,95,110'},${0.3 + random() * 0.4})`; c.beginPath(); c.moveTo(random() * w, random() * h); c.lineTo(random() * w, random() * h); c.lineTo(random() * w, random() * h); c.fill(); } }
        else if (a.blanket === 'fleece') { c.fillStyle = '#f08ab8'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.15)'; for (let i = 0; i < 300; i++) c.fillRect(random() * w, random() * h, 2, 2); }
        else { c.fillStyle = '#2a4a8a'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 3); c.fillStyle = '#c9c9c9'; c.fillRect(w * 0.48, 0, 6, h); }
      });
      const blanketMat = new THREE.MeshStandardMaterial({ map: blanketMap, roughness: a.blanket === 'foil' ? 0.2 : 1, metalness: a.blanket === 'foil' ? 0.6 : 0, side: THREE.DoubleSide });
      const onLaps = a.people !== 'empty';
      const bw = a.blanket === 'sleeping' ? 1.5 : 1.2;
      const bx = onLaps ? (random() - 0.5) * 0.4 : SW / 2 - 0.5;
      if (onLaps && a.people !== 'one-lying') {
        // Over the knees only, so the people stay in view, with a fold hanging down the front.
        const slab = s.box([bw * 0.8, 0.03, 0.4], [bx, SEAT + 0.14, 0.24], blanketMat);
        slab.rotation.set(-0.3, 0, (random() - 0.5) * 0.1);
        s.box([bw * 0.75, 0.3, 0.025], [bx + 0.03, SEAT - 0.1, SD / 2 - 0.02], blanketMat).rotation.x = 0.08;
      } else if (a.people === 'one-lying') {
        s.box([0.9, 0.03, 0.5], [-0.5, SEAT + 0.13, 0.02], blanketMat).rotation.set(0.05, 0, 0.06);
        s.box([0.85, 0.3, 0.025], [-0.5, SEAT - 0.1, SD / 2 - 0.02], blanketMat);
      } else {
        const heap = s.box([bw, 0.1, 0.5], [bx, SEAT + 0.05, 0.1], blanketMat);
        heap.rotation.y = 0.3;
        s.box([0.5, 0.06, 0.3], [bx - 0.3, SEAT + 0.13, 0.0], blanketMat).rotation.set(0.1, -0.4, 0.2);
        s.box([bw * 0.8, 0.35, 0.025], [bx, SEAT - 0.15, SD / 2 - 0.02], blanketMat).rotation.x = 0.1;
      }
    }

    // The jacket over the armrest.
    if (a.jacket) {
      const jacket = s.material(pick(random, ['#1d1d1f', '#4a5a3a', '#7a2a2a', '#2a3a6a', '#c9c2b0']), { roughness: 0.95 });
      const sx = random() < 0.5 ? -1 : 1;
      const ax = sx * (SW / 2 - 0.11);
      s.box([0.26, 0.05, 0.55], [ax, ARM_H + 0.12, 0.05], jacket).rotation.y = 0.1;
      s.box([0.04, 0.45, 0.5], [ax + sx * 0.13, ARM_H - 0.12, 0.05], jacket).rotation.z = sx * 0.06;
      s.box([0.08, 0.35, 0.09], [ax + sx * 0.14, ARM_H - 0.3, 0.3], jacket).rotation.z = sx * 0.25;
    }

    // Litter.
    const canMat = s.material('#c9ccd0', { metalness: 0.6, roughness: 0.35 });
    const litter: { at: [number, number, number]; size: number; color?: string }[] = [];
    const scatterAround = (count: number, into: (x: number, z: number) => void) => {
      for (let i = 0; i < count; i++) {
        const x = (random() - 0.5) * (SW + 0.5);
        const z = SD / 2 + 0.08 + random() * 0.5;
        into(x, z);
      }
    };
    const cansWanted = { cans: 7, balloons: 3, flyers: 1, everything: 9, tidy: 0 }[a.litter] + Math.round(mood.density * 4);
    scatterAround(cansWanted, (x, z) => litter.push({ at: [x, random() < 0.6 ? 0.06 : 0.033, z], size: 1, color: pick(random, ['#d8262c', '#2b6fb8', '#f2c21c', '#c9ccd0', '#2ec24a']) }));
    const cans = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 10), canMat, Math.max(1, litter.length));
    const m = new THREE.Matrix4();
    litter.forEach((item, i) => {
      const standing = item.at[1] > 0.05;
      m.makeRotationFromEuler(new THREE.Euler(standing ? 0 : Math.PI / 2, random() * 3, standing ? 0 : 0)).setPosition(...item.at);
      cans.setMatrixAt(i, m);
      cans.setColorAt(i, new THREE.Color(item.color!));
    });
    cans.count = litter.length;
    cans.castShadow = true;
    s.root.add(cans);
    // The shared water bottle.
    const bottleAt: [number, number, number] = [(random() - 0.5) * 0.8, 0.1, SD / 2 + 0.25];
    s.cylinder(0.034, 0.032, 0.2, bottleAt, new THREE.MeshPhysicalMaterial({ color: '#d7ecff', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }), 12);
    s.cylinder(0.032, 0.032, 0.07, [bottleAt[0], 0.035, bottleAt[2]], new THREE.MeshPhysicalMaterial({ color: '#9ccfff', transparent: true, opacity: 0.6, roughness: 0.2, depthWrite: false }), 12);
    s.cylinder(0.014, 0.014, 0.02, [bottleAt[0], 0.21, bottleAt[2]], s.material('#2b6cc4'), 8);
    if (a.litter === 'balloons' || a.litter === 'everything') {
      const flat: { at: [number, number, number]; size: number; color: string }[] = [];
      scatterAround(6, (x, z) => flat.push({ at: [x, 0.012, z], size: 1, color: pick(random, ['#ff3fb0', '#f2e21c', '#2b6cc4', '#2ec24a', '#f4f1e8']) }));
      const balloons = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), s.material('#ffffff', { roughness: 0.5 }), flat.length);
      flat.forEach((b, i) => { m.makeScale(0.09, 0.022, 0.06).setPosition(...b.at); balloons.setMatrixAt(i, m); balloons.setColorAt(i, new THREE.Color(b.color)); });
      balloons.castShadow = true;
      s.root.add(balloons);
      s.cylinder(0.035, 0.035, 0.16, [SW / 2 + 0.2, 0.035, SD / 2 + 0.5], s.material('#b9bec3', { metalness: 0.8, roughness: 0.3 }), 12).rotation.z = Math.PI / 2;
    }
    if (a.litter === 'flyers' || a.litter === 'everything') {
      const flyerMap = paint(128, 128, (c, w, h) => { c.fillStyle = pick(random, ['#ff3fb0', '#f2e21c', '#2bb5b0']); c.fillRect(0, 0, w, h); c.fillStyle = '#1d1d1f'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.fillText('ALL NIGHT', w / 2, h * 0.4); c.font = '14px sans-serif'; c.fillText('secret location', w / 2, h * 0.65); });
      const flyerMat = new THREE.MeshStandardMaterial({ map: flyerMap, roughness: 0.9 });
      for (let i = 0; i < 5; i++) { const f = s.box([0.15, 0.003, 0.21], [(random() - 0.5) * (SW + 0.5), 0.0015 + i * 0.002, SD / 2 + 0.08 + random() * 0.5], flyerMat); f.rotation.y = random() * 3; }
      const butts = Array.from({ length: 10 }, () => ({ at: [(random() - 0.5) * (SW + 0.5), 0.004, SD / 2 + 0.08 + random() * 0.5] as [number, number, number], size: 1 }));
      const buttGeometry = new THREE.CylinderGeometry(0.004, 0.004, 0.025, 6);
      buttGeometry.rotateZ(Math.PI / 2);
      s.scatter(buttGeometry, s.material('#e8e2d0'), butts);
    }
    if (a.litter === 'everything') {
      const shoe = s.box([0.1, 0.08, 0.27], [-SW / 2 - 0.15, 0.04, SD / 2 + 0.3], s.material(pick(random, ['#f4f1e8', '#1d1d1f', '#d8262c'])));
      shoe.rotation.set(0, 0.7, 0.9);
    }
    if (a.litter === 'tidy') {
      const bag = s.ball([0.26, 0.28, 0.24], [SW / 2 + 0.3, 0.27, 0.35], s.material('#1d1d1f', { roughness: 0.45 }), 12);
      bag.rotation.z = 0.1;
      s.ball([0.07, 0.06, 0.07], [SW / 2 + 0.3, 0.55, 0.35], s.material('#1d1d1f', { roughness: 0.45 }), 8);
    }

    // What is still going.
    let balloon: THREE.Mesh | null = null;
    if (a.glowing === 'balloon' || a.glowing === 'both') {
      const sx = random() < 0.5 ? -1 : 1;
      const tie: [number, number, number] = [sx * (SW / 2 - 0.11), ARM_H + 0.1, -0.25];
      const top: [number, number, number] = [tie[0] + sx * 0.12, 1.15 + random() * 0.2, tie[2] - 0.08];
      s.rod(tie, top, 0.002, s.material('#e8e2d0'));
      balloon = s.ball([0.16, 0.2, 0.16], [top[0], top[1] + 0.18, top[2]], s.material(pick(random, ['#ff3fb0', '#f2e21c', '#2b6cc4', '#c9ccd0', '#ff6a1a']), { roughness: 0.3, metalness: 0.2 }), 16);
    }
    let glowstick: THREE.MeshStandardMaterial | null = null;
    if (a.glowing === 'glowstick' || a.glowing === 'both') {
      glowstick = glow(pick(random, ['#5aff2a', '#ff3fb0', '#3c8cff']), 1.4);
      const stick = s.mesh(new THREE.CapsuleGeometry(0.008, 0.16, 3, 8), glowstick, [(random() - 0.5) * 1.2, SEAT - sag + 0.01, 0.2]);
      stick.rotation.set(Math.PI / 2, 0, random() * 2);
      stick.castShadow = false;
    }

    // The shaft of sunlight: a slab of warm light from high on one side and a bright patch where it lands.
    if (a.sunlight) {
      const sunMat = new THREE.MeshBasicMaterial({ color: '#ffe1a8', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const fromX = -SW / 2 - 0.6, fromY = 2.4;
      const slab = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.4), sunMat);
      slab.position.set((fromX + 0.5) / 2, fromY / 2 + 0.1, 0.05);
      slab.rotation.set(0, 0, Math.atan2(fromX - 0.5, fromY) );
      slab.castShadow = false;
      s.root.add(slab);
      const slab2 = slab.clone();
      slab2.rotation.y = Math.PI / 2;
      slab2.rotation.z = slab.rotation.z;
      slab2.scale.x = 0.5;
      s.root.add(slab2);
      const patchMap = paint(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(255,225,160,0.55)'; c.fillRect(0, 0, w, h); c.clearRect(w * 0.47, 0, w * 0.06, h); c.clearRect(0, h * 0.47, w, h * 0.06); });
      const patch = s.mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshBasicMaterial({ map: patchMap, transparent: true, depthWrite: false, toneMapped: false }), [0.5, 0.006, SD / 2 + 0.45]);
      patch.rotation.set(-Math.PI / 2, 0, 0.35);
      patch.castShadow = false;
      const patch2 = s.mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ map: patchMap, transparent: true, depthWrite: false, toneMapped: false }), [0.3, SEAT - sag + 0.08, 0.05]);
      patch2.rotation.set(-Math.PI / 2, 0, 0.35);
      patch2.castShadow = false;
    }

    const energy = mood.energy;
    const bob = mix(0.004, 0.02, energy);
    const balloonY = balloon?.position.y ?? 0;
    return s.finish({
      update: (dt, time) => {
        for (const p of persons) p.update(dt, time);
        if (balloon) { balloon.position.y = balloonY + Math.sin(time * 0.8) * bob; balloon.position.x += Math.sin(time * 0.5) * dt * 0.01; }
        if (glowstick) glowstick.emissiveIntensity = 1.1 + Math.sin(time * 1.5) * 0.3;
      },
    });
  },
});
