import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { parkBench } from './park';
import { at, hipsAt, joints, necktie, overTorso, pick, poseLeg, reachPoint, scarf, skinTones } from './pose';

/** A broadsheet page: columns of grey text and a headline. */
function newsprint(random: () => number, pink: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = pink ? '#eac3c6' : '#e9e5d8';
  c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#2a2a2c';
  c.fillRect(16, 14, 224, 22);
  c.fillStyle = pink ? '#eac3c6' : '#e9e5d8';
  for (let i = 0; i < 7; i++) c.fillRect(22 + i * 32, 18, 20 + random() * 6, 14);
  c.fillStyle = 'rgba(40,40,40,0.75)';
  c.fillRect(16, 44, 224, 7);
  c.fillRect(16, 56, 150, 7);
  for (let col = 0; col < 4; col++) for (let y = 74; y < 246; y += 6) {
    if (random() < 0.08) { y += 4; continue; }
    c.fillStyle = `rgba(50,50,50,${0.35 + random() * 0.3})`;
    c.fillRect(16 + col * 57, y, 48 - random() * 14, 2.5);
  }
  c.fillStyle = 'rgba(50,50,50,0.5)';
  c.fillRect(140, 74, 100, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    face: choice('What covers his face?', {
      newspaper: 'A broadsheet opened over his face like a tent.',
      racing: 'A pink racing paper over his face.',
      hat: 'A felt hat set over his face, crown to the sky.',
      nothing: 'Nothing: mouth open, face to the sky.',
    }),
    wears: choice('What is he wearing?', {
      suit: 'A dark suit and tie, the jacket buttoned.',
      overalls: 'Work overalls over a checked shirt.',
      layers: 'Layers of coats, one over another, and a scarf.',
      tracksuit: 'A tracksuit and trainers.',
    }),
    bottle: noul('Does a bottle in a paper bag stand under the bench?'),
    dog: noul('Does a dog sleep underneath the bench?'),
    bench: choice('What kind of bench?', {
      green: 'Green-painted slats on cast iron.',
      plain: 'Bare weathered timber slats.',
      blue: 'Blue municipal paint, flaking.',
    }),
    foot: choice('What has happened to his feet?', {
      dangling: 'One leg hangs off the bench, the shoe half off the foot.',
      crossed: 'Ankles crossed neatly on the bench.',
      bare: 'Shoes off and set side by side underneath, socks showing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.66, 1.84, random());
    const build = random() < 0.35 ? 'heavy' : random() < 0.25 ? 'slight' : 'average';
    const skin = pick(random, skinTones);
    const outfit = {
      suit: { top: pick(random, ['#2a2a30', '#3a3a3a', '#1f2a3a']), bottom: pick(random, ['#2a2a30', '#3a3a3a', '#1f2a3a']), shoes: '#1f1a18' },
      overalls: { top: pick(random, ['#b8302a', '#3a6a9a', '#5a7a4a']), bottom: '#2a4a7a', shoes: '#4a3328' },
      layers: { top: pick(random, ['#4a3f33', '#5a4a3a', '#3a3a3a']), bottom: pick(random, ['#3a3a40', '#4a4238']), shoes: '#2a211b' },
      tracksuit: { top: pick(random, ['#1f4fa0', '#1c1c1e', '#8a1f2a']), bottom: pick(random, ['#1f4fa0', '#1c1c1e', '#2e3440']), shoes: '#f0ede4' },
    }[a.wears];
    if (a.wears === 'suit') outfit.bottom = outfit.top;

    const bench = parkBench(s, { length: 1.95, wood: { green: '#4a6a4a', plain: '#8a7a5a', blue: '#3a5a8a' }[a.bench], iron: '#2a2e2c' });
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'lying', gaze: 'ahead', skin, sleeves: 'long',
      hair: random() < 0.7 ? 'short' : 'none', hairColor: pick(random, ['#1f1a18', '#3b2a22', '#6b6456', '#b8b0a4']),
      ...outfit,
    });
    s.root.add(person.root);
    // Lying on his back along the bench, head toward +x, left side to the front.
    person.root.position.y = bench.seatY + 0.005;
    hipsAt(person, -0.12, 0.0, -Math.PI / 2);
    const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const torsoL = H * 0.28;
    const { spine, neck } = joints(person, 'left');
    neck.rotation.x = 0.1;

    // ---- clothes
    const front = limb * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.004;
    if (a.wears === 'suit') {
      overTorso(s, person, H, build, s.material(outfit.top, { roughness: 0.8 }), { grow: 1.1, length: 0.98 });
      necktie(s, person, H, pick(random, ['#8a1f2a', '#1f3f8f', '#3a5a3a', '#d8a020']), front * 1.1 + 0.004);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.3, limb * 0.22, 6, 16), s.material('#f1efe6', { roughness: 0.6 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL + limb * 0.1;
      spine.add(collar);
    } else if (a.wears === 'overalls') {
      const denim = s.material('#2a4a7a', { roughness: 0.95 });
      const bib = overTorso(s, person, H, build, denim, { grow: 1.08, length: 0.7 });
      void bib;
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, torsoL * 0.4, 0.008), denim);
        strap.position.set(side * H * 0.04, torsoL * 0.85, front * 1.08);
        strap.rotation.z = side * 0.12;
        spine.add(strap);
      }
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(H * 0.07, H * 0.05, 0.006), denim);
      pocket.position.set(0, torsoL * 0.55, front * 1.08 + 0.006);
      spine.add(pocket);
    } else if (a.wears === 'layers') {
      overTorso(s, person, H, build, s.material(pick(random, ['#6b5a4a', '#2a2d33', '#4a5a4a']), { roughness: 1 }), { grow: 1.24, length: 1.02 });
      scarf(s, person, H, pick(random, ['#8a1f2a', '#d9c27a', '#4a6a8a']));
    } else {
      const stripe = s.material('#f1efe6', { roughness: 0.8 });
      for (const side of ['left', 'right'] as const) {
        const { shoulder } = joints(person, side);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.006, H * 0.16, 0.012), stripe);
        upper.position.set((side === 'left' ? 1 : -1) * limb * 0.98, -H * 0.085, 0);
        shoulder.add(upper);
      }
    }

    // ---- the pose: hands folded on the chest, one leg off the edge
    const spineAt = at(spine), headAt = at(person.head);
    const axis = headAt.clone().sub(spineAt).setY(0).normalize();
    const chest = spineAt.clone().addScaledVector(axis, torsoL * 0.62);
    chest.y += front + 0.045;
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? 1 : -1;
      reachPoint(person, side, { x: chest.x - sign * 0.01, y: chest.y, z: chest.z + sign * 0.03 }, { out: -2 }, 'hand', { forward: [0, 90], bend: [60, 170], across: [-100, 20] });
    }
    if (a.foot === 'dangling') {
      poseLeg(person, 'left', { forward: -2, out: 32, knee: 82, toes: 35 });
      poseLeg(person, 'right', { forward: 0, out: 2, knee: 0 });
    } else if (a.foot === 'crossed') {
      poseLeg(person, 'left', { forward: 0, out: -6, knee: 4 });
      poseLeg(person, 'right', { forward: 2, out: 6, knee: 0 });
    } else {
      poseLeg(person, 'left', { forward: 0, out: 4, knee: 0 });
      poseLeg(person, 'right', { forward: 0, out: 4, knee: 0 });
      const sock = s.material(pick(random, ['#e6e2d4', '#8a8478', '#3a3a3a']), { roughness: 0.95 });
      for (const side of ['left', 'right'] as const) {
        const ankle = joints(person, side).ankle;
        (ankle.children.find((node) => (node as THREE.Mesh).isMesh) as THREE.Mesh).material = sock;
      }
      const feet = at(joints(person, 'left').ankle);
      for (const dz of [-0.07, 0.07]) {
        const shoe = s.box([0.1, 0.045, 0.06], [feet.x + 0.02, 0.0225, dz], s.material(outfit.shoes, { roughness: 0.5 }));
        shoe.rotation.y = (random() - 0.5) * 0.3;
      }
    }
    if (a.foot === 'dangling') {
      // The shoe half off the dangling foot.
      const ankle = at(joints(person, 'left').ankle);
      const shoe = s.box([0.065, 0.045, 0.11], [ankle.x, ankle.y - 0.1, ankle.z + 0.04], s.material(outfit.shoes, { roughness: 0.5 }));
      shoe.rotation.set(0.9, 0, 0.1);
    }

    // ---- what covers the face
    const headR = H * 0.064;
    const faceY = headAt.y + headR * 0.95;
    if (a.face === 'newspaper' || a.face === 'racing') {
      const paper = new THREE.MeshStandardMaterial({ map: newsprint(random, a.face === 'racing'), roughness: 0.95, side: THREE.DoubleSide });
      const halfW = 0.3, along = 0.42;
      for (const side of [-1, 1]) {
        const page = s.mesh(new THREE.PlaneGeometry(along, halfW), paper, [headAt.x + 0.02, faceY + 0.04 - Math.sin(0.95) * halfW / 2, headAt.z + side * Math.cos(0.95) * halfW / 2]);
        page.rotation.set(side * (Math.PI / 2 - 0.95), 0, 0);
        page.castShadow = true;
      }
    } else if (a.face === 'hat') {
      const felt = s.material(pick(random, ['#3a3a3a', '#5a4a38', '#6b6456']), { roughness: 0.85 });
      s.cylinder(headR * 1.8, headR * 1.8, 0.012, [headAt.x, faceY + 0.01, headAt.z], felt, 22);
      s.cylinder(headR * 0.9, headR * 1.1, headR * 1.2, [headAt.x, faceY + 0.016 + headR * 0.6, headAt.z], felt, 22);
      s.cylinder(headR * 1.12, headR * 1.12, headR * 0.22, [headAt.x, faceY + 0.016 + headR * 0.25, headAt.z], s.material('#2a2320', { roughness: 0.6 }), 22);
    } else {
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.16, 8, 6), s.material('#4a2a24', { roughness: 0.6 }));
      mouth.position.set(0, -headR * 0.3, headR * 0.92);
      mouth.scale.set(1, 1.3, 0.5);
      person.head.add(mouth);
    }

    // ---- under the bench
    const underX = headAt.x - 0.55;
    if (a.bottle) {
      const bag = s.material('#a8805a', { roughness: 1 });
      s.cylinder(0.035, 0.05, 0.2, [underX + 0.45, 0.1, 0.05], bag, 10);
      s.cylinder(0.012, 0.016, 0.07, [underX + 0.45, 0.23, 0.05], s.material('#2a3a1a', { roughness: 0.3 }), 8);
      s.cylinder(0.014, 0.014, 0.012, [underX + 0.45, 0.27, 0.05], s.material('#b8b0a4', { metalness: 0.6, roughness: 0.4 }), 8);
    }
    if (a.dog) {
      const fur = s.material(pick(random, ['#8a6a4a', '#3a2e24', '#d9c27a', '#6b6259']), { roughness: 1 });
      const curl = s.ring(0.13, 0.085, [underX - 0.1, 0.085, 0.0], fur);
      curl.rotation.x = Math.PI / 2;
      curl.scale.set(1.15, 1, 0.9);
      const head = s.ball([0.085, 0.07, 0.09], [underX - 0.1 + 0.14, 0.12, 0.08], fur, 12);
      head.rotation.y = -0.6;
      s.ball([0.03, 0.025, 0.03], [underX - 0.1 + 0.21, 0.1, 0.14], s.material('#1a1a1c', { roughness: 0.4 }), 8);
      for (const side of [-1, 1]) {
        const ear = s.box([0.05, 0.015, 0.07], [underX - 0.1 + 0.11 + side * 0.07, 0.17, 0.08], fur);
        ear.rotation.z = side * 0.6;
      }
    }

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        // Slow breathing lifts the folded hands.
        const breath = Math.sin(time * (0.9 + energy * 0.6));
        spine.scale.z = 1 + breath * 0.02;
      },
    });
  },
});
