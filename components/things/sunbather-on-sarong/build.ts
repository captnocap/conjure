import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { paint, pickSkin, rig, worldOf } from './rig';

const SWIM: Record<string, string> = { red: '#d8262c', black: '#1d1d1f', white: '#f4f1e8', yellow: '#f2c21c', turquoise: '#2bb5b0', leopard: '#c98a3a' };

export default defineThing({
  questions: {
    doing: choice('What are they doing?', {
      reading: 'Reading, the paperback held up with both hands against the sun.',
      asleep: 'Asleep, the book face down on the chest, head rolled to one side.',
      phone: 'Scrolling a phone held up over the face with one hand.',
      propped: 'Propped up on both elbows, watching the water and the people.',
    }),
    sarong: choice('What print is the sarong?', {
      tropical: 'A tropical print: big leaves and red flowers on a dark green ground.',
      stripes: 'Broad bright stripes.',
      plain: 'One plain colour, faded by salt and sun.',
      club: 'Hooped football-club stripes in red and black.',
      batik: 'A blue and white batik of wavy lines and dots.',
    }),
    swimwear: choice('What colour is the swimwear?', {
      red: 'Red.', black: 'Black.', white: 'White.', yellow: 'Yellow.', turquoise: 'Turquoise.', leopard: 'Leopard-print tan.',
    }),
    who: choice('Who is sunbathing?', {
      lean: 'A lean twenty-something in a bikini or trunks.',
      broad: 'A broad, heavy man in trunks, belly to the sky.',
      older: 'An older woman in a one-piece, careful and still.',
      teen: 'A teenager, all elbows, half in the shade of the hat.',
    }),
    head: choice('What is on their head?', {
      long: 'Long hair spread on the sarong.',
      bun: 'Hair tied in a bun.',
      short: 'Short hair.',
      'straw-hat': 'A straw hat laid over the face.',
    }),
    extras: noul('Are a straw bag and a green coconut with a straw sitting beside them?'),
    friend: noul('Does a friend lie alongside on their own towel, turned the other way?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = pickSkin(random);
    const colour = SWIM[a.swimwear];
    const H = { lean: 1.74, broad: 1.8, older: 1.62, teen: 1.56 }[a.who];
    const build = { lean: 'slight', broad: 'heavy', older: 'average', teen: 'slight' }[a.who] as 'slight' | 'heavy' | 'average';
    const trunks = a.who === 'broad' || (a.who !== 'older' && random() < 0.4);
    const sleeping = a.doing === 'asleep';
    const hair = a.head === 'straw-hat' ? 'short' : a.head;
    const person = figure(s, {
      height: H, build, style: 'doll', skin, hair, hairColor: ['#241a14', '#4a3222', '#b48a4a', '#e2c27a', '#8a8a8a'][Math.floor(random() * 5)],
      top: trunks ? skin : colour, bottom: colour, shoes: skin, sleeves: 'short', pose: 'lying', gaze: 'ahead',
    });
    s.root.add(person.root);
    const joints = rig(person);
    const headR = H * 0.064;

    // Arms: holding the book or phone up, resting at the sides, or propping the torso on the elbows.
    if (a.doing === 'reading') {
      joints.arm('left', { forward: 78, out: 10, bend: 55, across: 18 });
      joints.arm('right', { forward: 78, out: 10, bend: 55, across: 18 });
    } else if (a.doing === 'phone') {
      joints.arm('right', { forward: 85, out: 6, bend: 50, across: 24 });
      joints.arm('left', { forward: 6, out: 18, bend: 6 });
    } else if (a.doing === 'propped') {
      joints.bow(44);
      joints.arm('left', { forward: -42, out: 22, bend: 92, across: 0 });
      joints.arm('right', { forward: -42, out: 22, bend: 92, across: 0 });
      joints.look(38, 0);
      joints.leg('left', { forward: 20, knee: 40, foot: 'flat' });
    } else {
      joints.arm('left', { forward: 4, out: 22, bend: 10 });
      joints.arm('right', { forward: 10, out: 8, bend: 30, across: 10 });
      joints.look(4, 26);
      joints.leg('right', { out: 12 });
    }
    joints.settle();
    person.root.updateMatrixWorld(true);

    // Sunglasses as a dark band across the eyes, or the hat laid over the face.
    const dark = s.material('#1f2124', { roughness: 0.5 });
    if (a.head === 'straw-hat') {
      const straw = s.material('#d9bf7a', { roughness: 0.95 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.9, headR * 1.9, headR * 0.08, 22), straw);
      brim.rotation.x = Math.PI / 2;
      brim.position.set(0, 0, headR * 1.1);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.0, headR * 1.1, headR * 0.7, 22), straw);
      crown.rotation.x = Math.PI / 2;
      crown.position.set(0, 0, headR * 1.45);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.12, headR * 1.12, headR * 0.16, 22), dark);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 0, headR * 1.2);
      brim.castShadow = crown.castShadow = true;
      person.head.add(brim, crown, band);
    } else {
      const band = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.56, headR * 0.36, headR * 0.5), dark);
      band.position.set(0, headR * 0.14, headR * 0.78);
      band.castShadow = true;
      person.head.add(band);
    }

    // The paperback, held up or face down on the chest; or the phone.
    const bookPaint = paint(128, 192, (c) => {
      const tone = ['#e8562a', '#2b6fb8', '#f2c21c', '#2e8b57', '#f0a8b8'][Math.floor(random() * 5)];
      c.fillStyle = tone; c.fillRect(0, 0, 128, 192);
      c.fillStyle = '#f7f2e4'; c.fillRect(14, 24, 100, 36); c.fillRect(14, 140, 100, 18);
      c.fillStyle = '#2a2320'; for (let i = 0; i < 3; i++) c.fillRect(20, 30 + i * 9, 50 + (i * 23) % 40, 4);
      c.fillRect(20, 145, 60, 5);
    });
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.18), [s.material('#f4efe0'), s.material('#f4efe0'), new THREE.MeshStandardMaterial({ map: bookPaint, roughness: 0.85 }), s.material('#f4efe0'), s.material('#f4efe0'), s.material('#f4efe0')]);
    book.castShadow = true;
    const chest = worldOf(person.pelvis).add(new THREE.Vector3(0, H * 0.075, -H * 0.2));
    if (a.doing === 'reading') {
      const hands = [worldOf(person.hands.left), worldOf(person.hands.right)];
      book.position.set((hands[0].x + hands[1].x) / 2, (hands[0].y + hands[1].y) / 2 + 0.02, (hands[0].z + hands[1].z) / 2);
      book.rotation.set(-0.9, 0, 0);
      s.root.add(book);
    } else if (a.doing === 'asleep') {
      book.position.set(chest.x + 0.02, chest.y + 0.02, chest.z + 0.02);
      book.rotation.set(Math.PI, 0.2, 0);
      s.root.add(book);
    } else if (a.doing === 'phone') {
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.145), dark);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.13), new THREE.MeshStandardMaterial({ color: '#dfe9f2', emissive: '#a9c4e0', emissiveIntensity: 0.5 }));
      screen.rotation.x = Math.PI / 2;
      screen.position.y = -0.0045;
      const hand = worldOf(person.hands.right);
      phone.position.set(hand.x, hand.y - 0.02, hand.z);
      phone.rotation.set(-0.35, 0, 0);
      phone.add(screen);
      phone.castShadow = true;
      s.root.add(phone);
    } else {
      book.position.set(chest.x - 0.3, 0.0125, chest.z + 0.35);
      book.rotation.set(0, 0.6, 0);
      s.root.add(book);
    }

    // The sarong: a flat painted rectangle, with the figure a little off its centre.
    const sarong = (print: typeof a.sarong, w: number, d: number, x: number, z: number, turn: number) => {
      const map = paint(256, 160, (c) => {
        if (print === 'tropical') {
          c.fillStyle = '#1e5a3a'; c.fillRect(0, 0, 256, 160);
          for (let i = 0; i < 14; i++) {
            c.fillStyle = i % 3 ? '#3d8f52' : '#8fc46b'; c.save(); c.translate(random() * 256, random() * 160); c.rotate(random() * 6.3);
            c.beginPath(); c.ellipse(0, 0, 34, 11, 0, 0, 7); c.fill(); c.restore();
          }
          for (let i = 0; i < 7; i++) {
            c.fillStyle = '#e0392e'; const x = random() * 256, y = random() * 160;
            for (let p = 0; p < 5; p++) { c.beginPath(); c.ellipse(x + Math.cos(p * 1.26) * 9, y + Math.sin(p * 1.26) * 9, 8, 5, p * 1.26, 0, 7); c.fill(); }
            c.fillStyle = '#f2c21c'; c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill();
          }
        } else if (print === 'stripes') {
          const tones = ['#f2c21c', '#e0392e', '#2b6fb8', '#f4f1e8', '#2e8b57'];
          for (let i = 0; i < 10; i++) { c.fillStyle = tones[i % tones.length]; c.fillRect(0, i * 16, 256, 16); }
        } else if (print === 'plain') {
          c.fillStyle = ['#d9775f', '#6f9ac2', '#c9b36b', '#8fb59c'][Math.floor(random() * 4)]; c.fillRect(0, 0, 256, 160);
          c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, 0, 256, 20); c.fillRect(0, 140, 256, 20);
        } else if (print === 'club') {
          for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#1d1d1f' : '#d8262c'; c.fillRect(0, i * 20, 256, 20); }
        } else {
          c.fillStyle = '#1f3f7a'; c.fillRect(0, 0, 256, 160);
          c.strokeStyle = '#f4f1e8'; c.lineWidth = 3;
          for (let r = 0; r < 8; r++) { c.beginPath(); for (let x = 0; x <= 256; x += 8) c.lineTo(x, r * 20 + 10 + Math.sin(x * 0.08 + r) * 5); c.stroke(); }
          c.fillStyle = '#f4f1e8'; for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(random() * 256, random() * 160, 2, 0, 7); c.fill(); }
        }
        // Fringe along the short ends.
        c.fillStyle = 'rgba(255,255,255,0.5)'; for (let y = 0; y < 160; y += 6) { c.fillRect(0, y, 6, 3); c.fillRect(250, y, 6, 3); }
      });
      const cloth = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
      cloth.color.lerp(new THREE.Color('#b9b2a4'), mood.wear * 0.35);
      const mesh = s.mesh(new THREE.PlaneGeometry(w, d), cloth, [x, 0.004, z]);
      mesh.rotation.set(-Math.PI / 2, 0, turn);
      mesh.castShadow = false;
      return mesh;
    };
    const centre = worldOf(person.pelvis);
    sarong(a.sarong, 1.15, H * 1.15, centre.x + 0.05, centre.z - H * 0.02, 0.08 + (random() - 0.5) * 0.1);

    // Sunscreen bottle and flip-flops beside, kicked off.
    const sideX = centre.x + 0.72;
    const bottleColour = ['#f0a020', '#f4f1e8', '#2bb5b0'][Math.floor(random() * 3)];
    s.cylinder(0.028, 0.03, 0.15, [sideX, 0.075, centre.z - 0.2], s.material(bottleColour, { roughness: 0.4 }), 14);
    s.cylinder(0.018, 0.018, 0.03, [sideX, 0.165, centre.z - 0.2], s.material('#f4f1e8'), 10);
    s.label('SPF 50', 0.05, 0.05, [sideX, 0.08, centre.z - 0.2 + 0.031], '#1f3f7a', bottleColour).rotation.y = 0;
    const flipColour = s.material(['#1d1d1f', '#f2c21c', '#d8262c', '#2b6fb8'][Math.floor(random() * 4)]);
    for (const i of [0, 1]) {
      const fx = sideX - 0.1 + i * 0.14, fz = centre.z + 0.55 + (i ? 0.08 : 0);
      const sole = s.box([0.1, 0.014, 0.26], [fx, 0.007, fz], flipColour);
      sole.rotation.y = (random() - 0.5) * 0.6 + (i ? 0.3 : -0.2);
      s.rod([fx, 0.014, fz + 0.06], [fx + 0.04, 0.03, fz - 0.02], 0.004, flipColour);
      s.rod([fx, 0.014, fz + 0.06], [fx - 0.04, 0.03, fz - 0.02], 0.004, flipColour);
    }

    if (a.extras) {
      const straw = s.material('#d2b06a', { roughness: 0.95 });
      const bx = centre.x - 0.72, bz = centre.z - 0.25;
      s.box([0.36, 0.26, 0.16], [bx, 0.13, bz], straw).rotation.y = 0.3;
      s.ring(0.09, 0.012, [bx, 0.3, bz], straw).rotation.y = 0.3;
      const coconut = s.ball([0.1, 0.11, 0.1], [bx + 0.05, 0.1, bz + 0.38], s.material('#5aa04a', { roughness: 0.6 }), 14);
      void coconut;
      s.cylinder(0.035, 0.035, 0.01, [bx + 0.05, 0.205, bz + 0.38], s.material('#f4f1e8'), 10);
      s.rod([bx + 0.06, 0.2, bz + 0.38], [bx + 0.1, 0.33, bz + 0.34], 0.004, s.material('#d8262c'));
    }

    // A friend alongside, head to feet, on their own towel.
    let friend: ReturnType<typeof figure> | null = null;
    if (a.friend) {
      const H2 = mix(1.55, 1.8, random());
      const friendColour = SWIM[(['red', 'black', 'white', 'yellow', 'turquoise'] as const)[Math.floor(random() * 5)]];
      const friendSkin = pickSkin(random);
      friend = figure(s, {
        height: H2, build: random() < 0.5 ? 'slight' : 'average', style: 'doll', skin: friendSkin, hair: (['short', 'long', 'bun', 'cap'] as const)[Math.floor(random() * 4)],
        top: random() < 0.5 ? friendSkin : friendColour, bottom: friendColour, shoes: friendSkin, sleeves: 'short', pose: 'lying', gaze: 'ahead',
      });
      friend.root.position.set(centre.x - 1.05, 0, centre.z);
      friend.root.rotation.y = Math.PI + (random() - 0.5) * 0.2;
      s.root.add(friend.root);
      const friendRig = rig(friend);
      friendRig.arm('left', { forward: 150, out: 30, bend: 110, across: 30 });
      friendRig.arm('right', { forward: 150, out: 30, bend: 110, across: 30 });
      friendRig.look(2, -15);
      friendRig.settle(false);
      const glasses = new THREE.Mesh(new THREE.BoxGeometry(H2 * 0.064 * 1.56, H2 * 0.064 * 0.36, H2 * 0.064 * 0.5), dark);
      glasses.position.set(0, H2 * 0.064 * 0.14, H2 * 0.064 * 0.78);
      friend.head.add(glasses);
      const prints = ['stripes', 'plain', 'tropical', 'batik', 'club'] as const;
      sarong(prints[Math.floor(random() * prints.length)], 0.95, H2 * 1.1, centre.x - 1.05, centre.z, Math.PI + 0.05);
    }

    const energy = mood.energy;
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        friend?.update(dt, time);
        if (a.doing === 'reading') book.rotation.x = -0.9 + Math.sin(time * 0.6) * 0.03 * (0.2 + energy);
        if (sleeping) joints.neck.rotation.z = Math.sin(time * 0.3) * 0.01;
      },
    });
  },
});
