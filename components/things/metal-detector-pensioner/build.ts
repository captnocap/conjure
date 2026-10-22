import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { paint, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    doing: choice('What is he doing right now?', {
      sweeping: 'Walking slowly, sweeping the coil low from side to side, eyes on the ground.',
      digging: 'Crouched over a signal, trowel in hand, the detector laid down beside him.',
      sitting: 'Sitting on a rock with the detector across his knees, resting, looking out.',
      listening: 'Stopped dead, one hand to the headphones, the coil held still over a beep.',
    }),
    found: choice('What has he found so far?', {
      nothing: 'Nothing: the bag hangs empty and flat.',
      coins: 'A few coins, laid out on a cloth for a look.',
      ring: 'A gold ring, held up to the light between finger and thumb.',
      caps: 'A collection of bottle caps and ring-pulls spread out beside him.',
      junk: 'A rusty horseshoe, a spoon and a bent nail.',
    }),
    hat: choice('What hat is he wearing?', {
      bucket: 'A faded khaki bucket hat.',
      'flat-cap': 'A tweed flat cap.',
      straw: 'A straw hat with a wide brim.',
      bare: 'No hat: a bald, sunburnt head.',
    }),
    shirt: choice('What is his shirt like?', {
      floral: 'A loose floral holiday shirt.',
      white: 'A plain white short-sleeved shirt, tucked in.',
      faded: 'A faded blue work shirt.',
      khaki: 'A khaki shirt with pockets, matching the shorts.',
    }),
    detector: choice('What kind of detector is it?', {
      modern: 'A modern detector: black shaft, armrest cuff, a control box with a little screen.',
      old: 'An old one: a chrome tube, a big round coil and a wooden handle.',
      homemade: 'A homemade one: a broom handle, a frying-pan coil and a biscuit tin of electronics.',
    }),
    barefoot: noul('Has he taken his shoes off and left them in the sand?'),
    dog: noul('Does a small dog wait beside him?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = pickSkin(random);
    const H = mix(1.62, 1.76, random());
    const headR = H * 0.064;
    const shirt = { floral: '#2a6f8f', white: '#f3efe6', faded: '#7f9bb8', khaki: '#b6a67c' }[a.shirt];
    const shorts = a.shirt === 'khaki' ? '#b6a67c' : ['#6b6150', '#3d4652', '#8a7a5a'][Math.floor(random() * 3)];
    const sitting = a.doing === 'sitting';
    const digging = a.doing === 'digging';
    const person = figure(s, {
      height: H, build: random() < 0.4 ? 'heavy' : 'average', style: 'doll', skin,
      hair: a.hat === 'bare' ? 'none' : a.hat === 'bucket' || a.hat === 'straw' ? 'hat' : 'cap',
      hairColor: a.hat === 'bucket' ? '#9a9372' : a.hat === 'straw' ? '#d9bf7a' : '#6b5a46',
      top: shirt, bottom: shorts, shoes: a.barefoot ? skin : '#5a4a3a', sleeves: 'short',
      pose: sitting ? 'sitting' : digging ? 'crouching' : a.doing === 'sweeping' ? 'walking' : 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const joints = rig(person);
    const floral = a.shirt === 'floral';
    if (floral) {
      const map = paint(128, 128, (c) => {
        c.fillStyle = shirt; c.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 26; i++) {
          c.fillStyle = ['#f2c21c', '#e85a3a', '#f4f1e8', '#8fd0a8'][i % 4];
          c.beginPath(); c.arc(random() * 128, random() * 128, 5 + random() * 6, 0, 7); c.fill();
        }
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(2, 2);
      // The torso mesh carries the shared shirt material.
      const torso = joints.spine.children[0] as THREE.Mesh;
      const material = torso.material as THREE.MeshStandardMaterial;
      material.map = map;
      material.needsUpdate = true;
    }

    // The pose around the detector.
    if (a.doing === 'sweeping') {
      joints.arm('right', { forward: 28, out: 12, bend: 34, across: 20 });
      joints.arm('left', { forward: 2, out: 10, bend: 20 });
      joints.lean(6);
      joints.look(34, 0);
    } else if (a.doing === 'listening') {
      joints.arm('right', { forward: 22, out: 12, bend: 30, across: 20 });
      joints.arm('left', { forward: 60, out: 36, bend: 138, across: 40 });
      joints.look(26, 12);
    } else if (digging) {
      joints.arm('right', { forward: 58, out: 20, bend: 20 });
      joints.arm('left', { forward: 48, out: 14, bend: 40, across: 10 });
      joints.look(30, 0);
    } else {
      joints.arm('left', { forward: 16, out: 14, bend: 60, across: 20 });
      joints.arm('right', { forward: 16, out: 14, bend: 60, across: 20 });
      joints.look(-4, 20);
    }
    joints.settle();
    const hip = worldOf(person.pelvis);

    const dark = s.material('#2b2d30', { roughness: 0.5 });
    const chrome = s.material('#cfd4d6', { metalness: 0.85, roughness: 0.25 });
    const wood = s.material('#9a7342', { roughness: 0.7 });
    const canvas = s.material('#b8ad8a', { roughness: 1 });

    // Headphones over the hat: a band and two cups.
    const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.08, headR * 0.07, 6, 20, Math.PI), dark);
    band.position.y = headR * 0.12;
    band.rotation.z = 0;
    person.head.add(band);
    for (const x of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.36, headR * 0.36, headR * 0.26, 14), dark);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(x * headR * 1.08, headR * 0.05, 0);
      cup.castShadow = true;
      person.head.add(cup);
    }
    const chin = worldOf(person.head).add(new THREE.Vector3(0, -headR * 1.3, 0));
    s.tube([[chin.x + headR * 1.08, chin.y + headR * 1.2, chin.z], [chin.x + headR * 1.1, chin.y, chin.z - headR * 0.4], [hip.x + H * 0.08, hip.y + H * 0.22, hip.z + H * 0.05]], H * 0.004, dark);

    // The detector: shaft, grip, armrest, control box and the disc coil.
    const detector = new THREE.Group();
    s.root.add(detector);
    const shaftLength = H * 0.78;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.011, H * 0.012, shaftLength, 10), a.detector === 'modern' ? dark : a.detector === 'old' ? chrome : wood);
    shaft.position.y = -shaftLength / 2;
    shaft.castShadow = true;
    detector.add(shaft);
    const coilR = a.detector === 'homemade' ? H * 0.1 : H * 0.12;
    const coil = new THREE.Mesh(
      a.detector === 'old' ? new THREE.TorusGeometry(coilR, coilR * 0.18, 8, 28) : new THREE.CylinderGeometry(coilR, coilR, H * 0.012, 28),
      a.detector === 'homemade' ? chrome : a.detector === 'old' ? dark : s.material('#1f2a44', { roughness: 0.5 }),
    );
    coil.position.set(0, -shaftLength, H * 0.08);
    if (a.detector === 'old') coil.rotation.x = Math.PI / 2;
    else coil.scale.set(1, 1, 1.2);
    coil.castShadow = true;
    detector.add(coil);
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, H * 0.04, H * 0.06), dark);
    hinge.position.set(0, -shaftLength + H * 0.02, H * 0.03);
    detector.add(hinge);
    if (a.detector === 'modern') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(H * 0.07, H * 0.06, H * 0.05), dark);
      box.position.set(0, -H * 0.1, H * 0.03);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(H * 0.045, H * 0.03), new THREE.MeshStandardMaterial({ color: '#9fd8c8', emissive: '#6fc4a8', emissiveIntensity: 0.6 }));
      screen.position.set(0, 0.002, H * 0.0255);
      box.add(screen);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(H * 0.045, H * 0.008, 6, 16, Math.PI), dark);
      cuff.position.set(0, H * 0.02, -H * 0.03);
      cuff.rotation.set(Math.PI / 2, 0, 0);
      detector.add(box, cuff);
    } else if (a.detector === 'old') {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.016, H * 0.016, H * 0.12, 10), wood);
      grip.position.set(0, -H * 0.02, 0);
      const box = new THREE.Mesh(new THREE.BoxGeometry(H * 0.06, H * 0.05, H * 0.08), s.material('#8a7a62', { roughness: 0.8 }));
      box.position.set(0, -H * 0.16, H * 0.03);
      detector.add(grip, box);
    } else {
      const tin = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.04, H * 0.04, H * 0.05, 14), s.material('#c9343a', { metalness: 0.4, roughness: 0.5 }));
      tin.position.set(0, -H * 0.14, H * 0.035);
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(coilR * 0.9, coilR * 0.8, H * 0.025, 20), chrome);
      pan.position.set(0, -shaftLength + H * 0.01, H * 0.08);
      detector.add(tin, pan);
    }
    // Where the detector is: in the hand, laid flat, or across the knees.
    if (a.doing === 'sweeping' || a.doing === 'listening') {
      const hand = worldOf(person.hands.right);
      detector.position.set(hand.x, hand.y + H * 0.02, hand.z);
      detector.rotation.set(-0.42, 0, a.doing === 'sweeping' ? 0.12 : 0);
    } else if (digging) {
      detector.position.set(hip.x + H * 0.2, H * 0.035, hip.z + H * 0.25);
      detector.rotation.set(-Math.PI / 2 + 0.08, 1.25, 0);
    } else {
      detector.position.set(hip.x - H * 0.3, hip.y + H * 0.02, hip.z + H * 0.16);
      detector.rotation.set(0, 0, -Math.PI / 2 + 0.1);
    }

    // Trowel and the dug hole when digging.
    if (digging) {
      const trowel = new THREE.Group();
      const tHandle = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.01, H * 0.01, H * 0.08, 8), s.material('#d8352c'));
      tHandle.position.y = -H * 0.02;
      const tBlade = new THREE.Mesh(new THREE.ConeGeometry(H * 0.03, H * 0.1, 4), chrome);
      tBlade.position.y = -H * 0.12;
      tBlade.rotation.x = Math.PI;
      tBlade.scale.z = 0.3;
      tHandle.castShadow = tBlade.castShadow = true;
      trowel.add(tHandle, tBlade);
      person.hands.right.add(trowel);
      const hole = s.cylinder(H * 0.07, H * 0.05, 0.02, [hip.x + H * 0.05, 0.004, hip.z + H * 0.3], s.material('#8f7a52', { roughness: 1 }), 16);
      void hole;
      s.ball([H * 0.09, H * 0.035, H * 0.08], [hip.x + H * 0.17, 0, hip.z + H * 0.33], s.material('#d9c69a', { roughness: 1 }), 12);
    }

    // The rock he sits on.
    if (sitting) {
      const seat = worldOf(person.pelvis);
      const rockH = Math.max(0.2, person.hipHeight - 0.03 * H);
      const rock = s.ball([0.34, rockH * 0.62, 0.3], [seat.x, rockH * 0.5, seat.z - 0.04], s.material('#8d8a80', { roughness: 0.95 }), 9);
      rock.rotation.y = 0.5;
      const rock2 = s.ball([0.22, rockH * 0.4, 0.2], [seat.x + 0.3, rockH * 0.22, seat.z + 0.15], s.material('#9b968a', { roughness: 0.95 }), 8);
      void rock2;
    }

    // The finds bag at the hip, and whatever he has found so far.
    const bagAt: [number, number, number] = [hip.x - H * 0.12, hip.y - H * 0.02, hip.z + H * 0.02];
    s.box([H * 0.1, H * 0.12, H * 0.05], bagAt, canvas).rotation.z = 0.05;
    s.box([H * 0.105, H * 0.04, H * 0.055], [bagAt[0], bagAt[1] + H * 0.05, bagAt[2]], s.material('#9f946f', { roughness: 1 }));
    const shoulderL = worldOf(person.hands.left.parent!.parent!.parent!);
    const shoulderR = worldOf(person.hands.right.parent!.parent!.parent!);
    s.tube([[shoulderR.x, shoulderR.y + H * 0.03, shoulderR.z], [hip.x, hip.y + H * 0.2, hip.z + H * 0.09], [bagAt[0], bagAt[1] + H * 0.06, bagAt[2] + H * 0.02]], H * 0.006, s.material('#6b5a46'));
    s.tube([[shoulderR.x, shoulderR.y + H * 0.03, shoulderR.z], [hip.x, hip.y + H * 0.2, hip.z - H * 0.08], [bagAt[0], bagAt[1] + H * 0.06, bagAt[2] - H * 0.02]], H * 0.006, s.material('#6b5a46'));
    void shoulderL;
    const brass = s.material('#d9b24a', { metalness: 0.75, roughness: 0.3 });
    const rust = s.material('#8a4a2a', { roughness: 0.9 });
    const spotX = hip.x + (digging ? -H * 0.3 : H * 0.36), spotZ = hip.z + H * 0.28;
    if (a.found === 'coins') {
      s.box([0.24, 0.004, 0.2], [spotX, 0.002, spotZ], s.material('#e8dcc0')).rotation.y = 0.3;
      for (let i = 0; i < 6; i++) s.cylinder(0.014, 0.014, 0.003, [spotX + (random() - 0.5) * 0.16, 0.006, spotZ + (random() - 0.5) * 0.12], i % 2 ? brass : chrome, 10);
    } else if (a.found === 'caps') {
      s.scatter(new THREE.CylinderGeometry(0.016, 0.014, 0.004, 10), s.material('#b8b2a8', { metalness: 0.5, roughness: 0.5 }), Array.from({ length: 14 }, (_u, i) => ({ at: [spotX + (random() - 0.5) * 0.3, 0.003, spotZ + (random() - 0.5) * 0.26] as const, size: 1, color: ['#c9343a', '#2b6fb8', '#d9b24a', '#9ea5a8'][i % 4] })));
    } else if (a.found === 'junk') {
      const shoe = s.ring(0.06, 0.012, [spotX, 0.012, spotZ], rust, Math.PI * 1.5);
      shoe.rotation.x = Math.PI / 2; shoe.rotation.z = 0.4;
      s.rod([spotX + 0.12, 0.005, spotZ - 0.08], [spotX + 0.25, 0.005, spotZ + 0.02], 0.006, s.material('#9ea5a8', { metalness: 0.6 }));
      s.ball([0.02, 0.006, 0.03], [spotX + 0.26, 0.006, spotZ + 0.03], s.material('#9ea5a8', { metalness: 0.6 }), 8);
      s.rod([spotX - 0.1, 0.004, spotZ + 0.1], [spotX - 0.02, 0.03, spotZ + 0.16], 0.004, rust);
    } else if (a.found === 'ring') {
      const held = !digging && !sitting ? person.hands.left : person.hands.right;
      if (a.doing !== 'sitting' && !digging) joints.arm('left', { forward: 100, out: 20, bend: 100, across: 30 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 16), brass);
      ring.position.set(0, -H * 0.02, H * 0.01);
      held.add(ring);
    }
    if (a.barefoot && !a.dog) {
      for (const sx of [-1, 1]) s.box([0.1, 0.05, 0.27], [hip.x - H * 0.45 + sx * 0.07, 0.025, hip.z - H * 0.2 + sx * 0.03], s.material('#5a4a3a')).rotation.y = sx * 0.3;
    }

    // A small dog, sitting and waiting: capsules and a ball, no face.
    let tail: THREE.Mesh | null = null;
    if (a.dog) {
      const dogAt = new THREE.Vector3(hip.x - H * 0.5, 0, hip.z + H * 0.05);
      const fur = s.material(['#c9a06a', '#f1ebdc', '#3a2d24', '#8a6a4a'][Math.floor(random() * 4)], { roughness: 0.95 });
      const body = s.ball([0.1, 0.11, 0.16], [dogAt.x, 0.19, dogAt.z], fur, 12);
      body.rotation.x = -0.5;
      s.ball([0.08, 0.08, 0.09], [dogAt.x, 0.34, dogAt.z + 0.08], fur, 12);
      for (const sx of [-1, 1]) {
        const ear = s.ball([0.025, 0.05, 0.015], [dogAt.x + sx * 0.055, 0.39, dogAt.z + 0.05], fur, 8);
        ear.rotation.z = -sx * 0.4;
      }
      s.ball([0.03, 0.025, 0.04], [dogAt.x, 0.32, dogAt.z + 0.15], fur, 8);
      s.ball([0.014, 0.012, 0.012], [dogAt.x, 0.325, dogAt.z + 0.19], dark, 6);
      for (const sx of [-1, 1]) {
        s.rod([dogAt.x + sx * 0.05, 0.14, dogAt.z + 0.08], [dogAt.x + sx * 0.055, 0.02, dogAt.z + 0.11], 0.016, fur);
        s.ball([0.045, 0.035, 0.07], [dogAt.x + sx * 0.07, 0.035, dogAt.z - 0.02], fur, 8);
      }
      tail = s.rod([dogAt.x, 0.1, dogAt.z - 0.1], [dogAt.x + 0.08, 0.06, dogAt.z - 0.22], 0.012, fur, 0.006);
      s.ring(0.045, 0.006, [dogAt.x, 0.28, dogAt.z + 0.06], s.material('#d8352c')).rotation.x = Math.PI / 2 + 0.3;
    }

    const energy = mood.energy;
    const sweep = a.doing === 'sweeping' ? 0.32 : 0;
    const baseZ = detector.rotation.z;
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        if (sweep) detector.rotation.z = baseZ + Math.sin(time * mix(0.8, 2, energy)) * sweep;
        if (tail) tail.rotation.y = Math.sin(time * mix(2, 7, energy)) * 0.3;
      },
    });
  },
});
