import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { paint, pickSkin, rig, worldOf } from './rig';

const FLAGS = { green: '#1f9a4c', yellow: '#f4c60f', red: '#d42620', 'red-yellow': '#d42620' } as const;

export default defineThing({
  questions: {
    state: choice('What is the lifeguard doing right now?', {
      alert: 'Standing square to the water, one hand flat above the eyes against the glare, scanning.',
      relaxed: 'Weight on one hip, a hand resting on the hip, the can hanging loose, half watching.',
      whistle: 'Whistle clamped in the teeth, one arm flung out pointing at a swimmer who has gone too far.',
      running: 'Mid-stride down the sand toward the water, the can swinging on its strap.',
    }),
    hold: choice('What is in the free hand?', {
      nothing: 'Nothing: the hand is free to shade the eyes, point or rest on the hip.',
      binoculars: 'Black binoculars raised to the eyes with both hands.',
      megaphone: 'A red megaphone held down at the hip, ready.',
      radio: 'A handheld radio held up to the mouth.',
    }),
    flag: choice('What flag is on the pole stuck in the sand beside them?', {
      green: 'Green: calm water, swim freely.',
      yellow: 'Yellow: caution, a current is running.',
      red: 'Red: no swimming today.',
      'red-yellow': 'Red over yellow, the patrolled-area flag.',
      none: 'A bare pole with no flag, or no pole at all.',
    }),
    head: choice('What is on their head?', {
      cap: 'A red cap with the peak forward.',
      visor: 'A white sun visor over sun-bleached hair.',
      sunglasses: 'Dark wraparound sunglasses and no hat.',
      bucket: 'A wide white bucket hat.',
      bare: 'Nothing: short hair, bleached by the sun.',
    }),
    outfit: choice('What are they wearing?', {
      yellow: 'A yellow vest over red shorts, the classic.',
      red: 'All red: vest and shorts.',
      white: 'A white tank top and red shorts.',
      'bare-chest': 'No shirt: red shorts and a whistle cord on bare skin.',
      swimsuit: 'A red one-piece swimsuit.',
    }),
    who: choice('Who is on duty?', {
      teen: 'A lanky teenager on a summer job.',
      veteran: 'A broad, heavy veteran with decades of shifts behind them.',
      wiry: 'A short, wiry swimmer.',
      average: 'Someone of average build, unremarkable and reliable.',
    }),
    second: noul('Does a second lifeguard sit on a cooler behind them, off duty?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = pickSkin(random);
    const hairColour = ['#2a1d16', '#4a3222', '#b48a4a', '#e2c27a', '#1d1a18'][Math.floor(random() * 5)];
    const H = { teen: 1.82, veteran: 1.84, wiry: 1.64, average: 1.74 }[a.who];
    const build = { teen: 'slight', veteran: 'heavy', wiry: 'slight', average: 'average' }[a.who] as 'slight' | 'heavy' | 'average';
    const red = '#d8262c';
    const top = { yellow: '#f2c21c', red, white: '#f3efe6', 'bare-chest': skin, swimsuit: red }[a.outfit];
    const barefoot = random() < 0.6;
    const person = figure(s, {
      height: H, build, style: 'doll', skin, hairColor: a.head === 'cap' ? red : a.head === 'bucket' ? '#f4f1e8' : hairColour,
      hair: a.head === 'bare' || a.head === 'sunglasses' ? 'short' : a.head === 'cap' ? 'cap' : a.head === 'bucket' ? 'hat' : 'short',
      top, bottom: red, shoes: barefoot ? skin : '#2a2a2c', sleeves: 'short',
      pose: a.state === 'running' ? 'running' : 'standing',
      gaze: a.state === 'relaxed' ? 'left' : 'ahead',
      mirror: false,
    });
    s.root.add(person.root);
    const joints = rig(person);
    const headR = H * 0.064;
    const free: 'left' | 'right' = 'right';
    const other: 'left' | 'right' = 'left';

    // The pose: the free (right) hand shades, points, or rests; the left arm holds the strap.
    if (a.state === 'alert') {
      joints.arm(free, { forward: 118, out: 12, bend: 126, across: 62 });
      joints.arm(other, { forward: 8, out: 8, bend: 20 });
      joints.leg('left', { out: 6 });
      joints.leg('right', { out: 6 });
      joints.lean(3);
    } else if (a.state === 'relaxed') {
      joints.arm(free, { forward: -8, out: 32, bend: 48, across: 78 });
      joints.arm(other, { forward: 20, out: 4, bend: 55, across: 15 });
      joints.leg('left', { out: 14, forward: 4 });
      joints.leg('right', { out: 0, knee: 8 });
      joints.body.rotation.z = -0.05;
    } else if (a.state === 'whistle') {
      joints.arm(free, { forward: 82, out: 36, bend: 6 });
      joints.arm(other, { forward: 24, out: 6, bend: 60, across: 10 });
      joints.leg('left', { out: 8 });
      joints.leg('right', { out: 8, forward: 10 });
      joints.lean(4);
      joints.look(-4, -18);
    } else {
      joints.lean(12);
    }
    if (a.hold === 'binoculars') {
      for (const side of ['left', 'right'] as const) joints.arm(side, { forward: 110, out: 8, bend: 128, across: 18 });
    } else if (a.hold === 'radio') {
      joints.arm(free, { forward: 60, out: 12, bend: 140, across: 30 });
    } else if (a.hold === 'megaphone' && a.state !== 'whistle') {
      joints.arm(free, { forward: 6, out: 14, bend: 22, across: 0 });
    }
    joints.settle();

    const dark = s.material('#1f2124', { roughness: 0.5 });
    const brass = s.material('#d9b24a', { metalness: 0.7, roughness: 0.3 });
    const white = s.material('#f4f1e8');
    const canRed = s.material('#f0601e', { roughness: 0.42 });

    // Head gear: sunglasses band, visor, or the cap's colour.
    if (a.head === 'sunglasses') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.55, headR * 0.34, headR * 0.5), dark);
      band.position.set(0, headR * 0.14, headR * 0.78);
      band.castShadow = true;
      person.head.add(band);
    }
    if (a.head === 'visor') {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.08, headR * 1.08, headR * 0.3, 20, 1, true), white);
      ring.position.y = headR * 0.42;
      ring.castShadow = true;
      const peak = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.9, headR * 1.9, headR * 0.08, 22, 1, false, Math.PI * 0.55, Math.PI * 0.9), white);
      peak.position.set(0, headR * 0.5, headR * 0.1);
      peak.castShadow = true;
      person.head.add(ring, peak);
    }
    // Whistle: at the lips when blowing, otherwise on its cord against the chest.
    const whistleAt = (parent: THREE.Object3D, at: THREE.Vector3, rot: THREE.Euler) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.16, headR * 0.16, headR * 0.22, 12), brass);
      body.rotation.x = Math.PI / 2;
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.34, headR * 0.12, headR * 0.16), brass);
      mouth.position.set(headR * 0.22, 0, 0);
      const group = new THREE.Group();
      group.add(body, mouth);
      group.position.copy(at);
      group.rotation.copy(rot);
      body.castShadow = mouth.castShadow = true;
      parent.add(group);
    };
    const cordMaterial = s.material('#2c2f3a');
    if (a.state === 'whistle') {
      whistleAt(person.head, new THREE.Vector3(-headR * 0.2, -headR * 0.34, headR * 1.02), new THREE.Euler(0, Math.PI, 0));
      const cord = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.9, headR * 0.04, 6, 24), cordMaterial);
      cord.position.set(0, -headR * 1.15, headR * 0.1);
      cord.rotation.x = Math.PI / 2;
      person.head.add(cord);
    } else {
      const chest = worldOf(person.pelvis).add(new THREE.Vector3(0, H * 0.22, H * 0.075));
      s.rod([chest.x - H * 0.06, chest.y + H * 0.12, chest.z], [chest.x + H * 0.01, chest.y - H * 0.02, chest.z + 0.01], H * 0.004, cordMaterial);
      s.rod([chest.x + H * 0.06, chest.y + H * 0.12, chest.z], [chest.x + H * 0.01, chest.y - H * 0.02, chest.z + 0.01], H * 0.004, cordMaterial);
      whistleAt(s.root, new THREE.Vector3(chest.x + H * 0.01, chest.y - H * 0.04, chest.z + 0.012), new THREE.Euler(0, 0, -0.4));
    }

    // The rescue can: a red torpedo on a strap over the left shoulder, hanging at the right hip behind.
    const hip = worldOf(person.pelvis);
    const canLength = H * 0.42;
    const canAt = new THREE.Vector3(hip.x + H * 0.2, hip.y - H * 0.03, hip.z - H * 0.05);
    const can = new THREE.Group();
    can.position.copy(canAt);
    const canTilt = a.state === 'running' ? -0.5 : -0.22;
    can.rotation.set(0.1, 0, canTilt);
    s.root.add(can);
    const tube = new THREE.Mesh(new THREE.CapsuleGeometry(H * 0.045, canLength - H * 0.09, 6, 16), canRed);
    tube.castShadow = true;
    can.add(tube);
    for (const y of [-1, 1]) {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.047, H * 0.047, H * 0.02, 16), white);
      stripe.position.y = y * canLength * 0.28;
      stripe.castShadow = true;
      can.add(stripe);
    }
    const grip = new THREE.Mesh(new THREE.TorusGeometry(H * 0.05, H * 0.006, 6, 16, Math.PI), cordMaterial);
    grip.position.set(0, 0, H * 0.02);
    grip.rotation.set(0, Math.PI / 2, 0);
    can.add(grip);
    const strapPaint = s.material('#e9e1cc');
    s.root.updateMatrixWorld(true);
    const canTop = can.localToWorld(new THREE.Vector3(0, canLength / 2, 0));
    const shoulderR = worldOf(person.hands.right.parent!.parent!.parent!);
    // One strap over the right shoulder, across the chest and down the back to the can at the left hip.
    s.tube([[shoulderR.x + H * 0.01, shoulderR.y + H * 0.035, shoulderR.z + H * 0.03], [hip.x, hip.y + H * 0.2, hip.z + H * 0.1], [canTop.x - H * 0.01, canTop.y + H * 0.01, canTop.z + H * 0.03]], H * 0.009, strapPaint);
    s.tube([[shoulderR.x + H * 0.01, shoulderR.y + H * 0.035, shoulderR.z - H * 0.03], [hip.x, hip.y + H * 0.2, hip.z - H * 0.09], [canTop.x - H * 0.01, canTop.y + H * 0.01, canTop.z - H * 0.03]], H * 0.009, strapPaint);

    // The free hand's prop.
    const hand = person.hands[free];
    if (a.hold === 'binoculars') {
      const bin = new THREE.Group();
      for (const x of [-1, 1]) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.22, headR * 0.26, headR * 0.7, 12), dark);
        barrel.position.set(x * headR * 0.34, 0, 0);
        barrel.rotation.x = Math.PI / 2;
        barrel.castShadow = true;
        bin.add(barrel);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.16, headR * 0.3), dark);
      bin.add(bridge);
      bin.position.set(0, headR * 0.12, headR * 1.25);
      person.head.add(bin);
    } else if (a.hold === 'megaphone' && a.state !== 'whistle') {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.075, H * 0.022, H * 0.2, 18, 1, true), s.material('#e23b2a', { side: THREE.DoubleSide }));
      horn.rotation.x = -Math.PI / 2 + 0.3;
      horn.position.set(0, -H * 0.02, H * 0.12);
      horn.castShadow = true;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(H * 0.02, H * 0.07, H * 0.025), dark);
      handle.position.set(0, -H * 0.03, H * 0.03);
      hand.add(horn, handle);
    } else if (a.hold === 'radio') {
      const radio = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.4, headR * 0.9, headR * 0.3), dark);
      radio.position.set(0, -headR * 0.1, headR * 0.15);
      radio.castShadow = true;
      const aerial = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.03, headR * 0.03, headR * 0.7, 6), dark);
      aerial.position.set(headR * 0.12, headR * 0.65, headR * 0.15);
      hand.add(radio, aerial);
    }

    // A signal flag on a pole pushed into a small heap of sand beside them.
    const sand = s.material('#e8d9b4', { roughness: 1 });
    let flag: THREE.Mesh | null = null;
    const poleX = -(H * 0.3), poleZ = H * 0.22;
    if (a.flag !== 'none' || random() < 0.5) {
      const mound = s.ball([H * 0.16, H * 0.035, H * 0.16], [poleX, 0, poleZ], sand, 14);
      void mound;
      const poleH = H * 0.95;
      s.rod([poleX, -0.05, poleZ], [poleX + 0.02, poleH, poleZ], H * 0.011, white);
      s.ball([H * 0.016, H * 0.016, H * 0.016], [poleX + 0.02, poleH + H * 0.012, poleZ], brass, 8);
      if (a.flag !== 'none') {
        const map = paint(64, 48, (c) => {
          c.fillStyle = FLAGS[a.flag as keyof typeof FLAGS];
          c.fillRect(0, 0, 64, 48);
          if (a.flag === 'red-yellow') { c.fillStyle = '#f4c60f'; c.fillRect(0, 24, 64, 24); }
        });
        flag = new THREE.Mesh(new THREE.PlaneGeometry(H * 0.3, H * 0.2, 10, 3), new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.8 }));
        flag.geometry.translate(H * 0.15, 0, 0);
        flag.position.set(poleX + 0.02, poleH - H * 0.12, poleZ);
        flag.castShadow = true;
        s.root.add(flag);
      }
    }

    // A second lifeguard off duty on a cooler behind, elbows on knees.
    let mate: ReturnType<typeof figure> | null = null;
    if (a.second) {
      const H2 = H * mix(0.92, 1.02, random());
      mate = figure(s, {
        height: H2, style: 'doll', skin: pickSkin(random), hair: random() < 0.5 ? 'cap' : 'short', hairColor: a.head === 'cap' ? red : '#3a2a1e',
        top: a.outfit === 'bare-chest' ? skin : top, bottom: red, shoes: skin, sleeves: 'short', pose: 'sitting', gaze: 'left', mirror: true,
      });
      mate.root.position.set(H * 0.5, 0, -H * 0.42);
      mate.root.rotation.y = -0.5;
      s.root.add(mate.root);
      const coolerH = Math.max(0.2, mate.hipHeight - 0.03 * H2);
      const seat = worldOf(mate.pelvis);
      const cooler = s.box([0.46 * H2 / 1.75, coolerH, 0.3 * H2 / 1.75], [seat.x, coolerH / 2, seat.z - 0.03], s.material('#2d6fb6', { roughness: 0.45 }));
      cooler.rotation.y = -0.5;
      const lid = s.box([0.48 * H2 / 1.75, 0.035, 0.32 * H2 / 1.75], [seat.x, coolerH + 0.017, seat.z - 0.03], white);
      lid.rotation.y = -0.5;
    }

    const energy = mood.energy;
    const base = flag ? Float32Array.from(flag.geometry.attributes.position.array) : null;
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        mate?.update(dt, time);
        can.rotation.z = canTilt + Math.sin(time * 1.3) * 0.03 * energy;
        if (!flag || !base) return;
        const position = flag.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
          const x = base[i * 3];
          position.setZ(i, Math.sin(x * 14 - time * mix(1.5, 8, energy)) * x * mix(0.08, 0.25, energy));
          position.setY(i, base[i * 3 + 1] - x * x * mix(0.9, 0.1, energy));
        }
        position.needsUpdate = true;
      },
    });
  },
});
