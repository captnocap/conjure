import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { at, ground, joints, poseArm } from './pose';

/** Apron cloth painted on a canvas: small flowers, stripes, or a plain faded cotton. */
function apronCloth(random: () => number, kind: 'floral' | 'striped' | 'plain') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = kind === 'plain' ? ['#d9cfb8', '#c9d3d9', '#d8c4bd'][Math.floor(random() * 3)] : '#efe8d6';
  ctx.fillRect(0, 0, 128, 128);
  if (kind === 'floral') {
    const petals = ['#c75a6a', '#6a8ac7', '#d9a54a', '#8a5a9a'];
    for (let i = 0; i < 40; i++) {
      const x = random() * 128, y = random() * 128, r = 3 + random() * 2.5;
      ctx.fillStyle = '#6f8a5a';
      ctx.fillRect(x + r, y + r * 0.5, r * 1.6, 1.5);
      ctx.fillStyle = petals[i % petals.length];
      for (let p = 0; p < 5; p++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(p * 1.257) * r * 0.7, y + Math.sin(p * 1.257) * r * 0.7, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f4e28a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'striped') {
    ctx.fillStyle = ['#3f6a9a', '#a04a44', '#4a7a5a'][Math.floor(random() * 3)];
    for (let x = 3; x < 128; x += 14) ctx.fillRect(x, 0, 5, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

export default defineThing({
  questions: {
    carries: choice('What is she carrying?', {
      sandwiches: 'A stacked plate of triangle ham sandwiches in one hand and a brown teapot in the other.',
      cups: 'A tray of cups and saucers held in both hands.',
      cake: 'A big fruit cake on a plate, held in both hands.',
      kettle: 'A black kettle in one hand and a plate of sandwiches in the other.',
    }),
    stack: score('How high is the sandwich stack?', ['A few left on the plate', 'A decent plateful', 'A tower of sandwiches, enough for the parish']),
    apron: choice('What is the apron like?', {
      floral: 'A floral print apron, small flowers on cream.',
      striped: 'A striped butcher-style apron.',
      plain: 'A plain faded cotton apron.',
    }),
    motion: choice('What is she doing right now?', {
      walking: 'Mid-stride, crossing the room with purpose.',
      stopped: 'Stopped to talk, head turned to someone beside her.',
      checking: 'Paused, looking down at the plate to count what is left.',
    }),
    towel: noul('Is a tea towel thrown over her shoulder?'),
    dress: choice('What is under the apron?', {
      black: 'A black dress, the mourning one.',
      navy: 'A navy dress with a white collar.',
      cardigan: 'A brown cardigan over a grey skirt.',
      housecoat: 'A faded pink housecoat.',
    }),
    hair: choice('What about her hair?', {
      bun: 'Grey-brown hair in a tight bun.',
      scarf: 'A headscarf tied at the back of the neck.',
      set: 'A fresh dark perm, tight to the head.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.58, 1.7, random());
    const build = random() < 0.5 ? 'heavy' : 'average';
    const skin = pick(['#e3c2a4', '#d9b08c', '#e8c9ad', '#c99a78']);
    const dress = { black: { top: '#1d1c20', bottom: '#1d1c20' }, navy: { top: '#243451', bottom: '#243451' }, cardigan: { top: '#6b4a33', bottom: '#5a5a5e' }, housecoat: { top: '#c9a0a0', bottom: '#c9a0a0' } }[a.dress];
    const person = figure(s, {
      height: H, build, style: 'doll', pose: a.motion === 'walking' ? 'walking' : 'standing', skin, sleeves: random() < 0.5 ? 'short' : 'long',
      gaze: a.motion === 'stopped' ? (random() < 0.5 ? 'left' : 'right') : a.motion === 'checking' ? 'down' : 'ahead',
      hair: a.hair === 'bun' ? 'bun' : 'short', hairColor: a.hair === 'set' ? '#2a1f1a' : pick(['#6b5a4a', '#8a8378', '#5a4a3e']),
      top: dress.top, bottom: dress.bottom, shoes: '#2a2320',
    });
    s.root.add(person.root);
    const twoHanded = a.carries === 'cups' || a.carries === 'cake';
    const plateSide = random() < 0.5 ? 'right' : 'left';
    const potSide = plateSide === 'right' ? 'left' : 'right';
    if (twoHanded) {
      poseArm(person, 'left', { forward: 30, out: 2, bend: 62, inward: 6 });
      poseArm(person, 'right', { forward: 30, out: 2, bend: 62, inward: 6 });
    } else {
      poseArm(person, plateSide, { forward: 32, out: 10, bend: 75, inward: 12 });
      poseArm(person, potSide, { forward: 12, out: 14, bend: 18 });
    }
    const { spine, neck } = joints(person, 'left');
    if (a.motion === 'walking') spine.rotation.x -= 0.06;
    if (a.motion === 'checking') neck.rotation.x -= 0.2;
    ground(person);
    const headR = H * 0.064;
    const torsoL = H * 0.28;
    const limb = H * 0.036 * (build === 'heavy' ? 1.3 : 1);
    const front = limb * 1.35 * (build === 'heavy' ? 1.25 : 1);

    // ---- collar, headscarf, apron and its bow, the tea towel
    if (a.dress === 'navy') {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.0, 0.012, 6, 18), s.material('#f3f1ea', { roughness: 0.8 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL + 0.004;
      spine.add(collar);
    }
    if (a.hair === 'scarf') {
      const scarfMat = s.material(pick(['#8a3a3a', '#3a4a7a', '#5a6a4a', '#d9c9a1']), { roughness: 0.95, side: THREE.DoubleSide });
      const crown = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.34), scarfMat);
      const drape = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 18, 12, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.7), scarfMat);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.2, 8, 6), scarfMat);
      knot.position.set(0, -headR * 0.6, -headR * 0.9);
      crown.castShadow = drape.castShadow = true;
      person.head.add(crown, drape, knot);
    }
    const cloth = s.material('#ffffff', { map: apronCloth(random, a.apron), roughness: 0.95, side: THREE.DoubleSide });
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.19, torsoL * 0.56, 0.008), cloth);
    bib.position.set(0, torsoL * 0.4, front + 0.012);
    spine.add(bib);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.15, 0.006, 5, 16, Math.PI), cloth);
    strap.position.set(0, torsoL * 0.72, 0);
    strap.rotation.x = Math.PI / 2;
    spine.add(strap);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.36, H * 0.36, 0.01), cloth);
    skirt.position.set(0, -H * 0.1, limb * 1.65 + 0.012);
    person.pelvis.add(skirt);
    for (const side of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.012), cloth);
      loop.position.set(side * 0.045, 0.012, -limb * 1.5 - 0.01);
      loop.rotation.z = side * 0.5;
      person.pelvis.add(loop);
    }
    if (a.towel) {
      const towelMat = s.material(pick(['#f1ece0', '#d9e0e6']), { roughness: 1, side: THREE.DoubleSide });
      const side = twoHanded ? 1 : potSide === 'left' ? 1 : -1;
      const shoulder = joints(person, side > 0 ? 'left' : 'right').shoulder.position;
      for (const z of [1, -1]) {
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.008), towelMat);
        flap.position.set(shoulder.x * 0.85, shoulder.y - 0.1, z * (limb * 1.1 + 0.03));
        flap.rotation.x = z * -0.12;
        spine.add(flap);
      }
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, limb * 2.4 + 0.06), towelMat);
      fold.position.set(shoulder.x * 0.85, shoulder.y + 0.012, 0);
      spine.add(fold);
    }

    // ---- what she carries
    const china = s.material(pick(['#f1ece0', '#e8eef0', '#efe6d0']), { roughness: 0.4 });
    const bread = s.material('#efe3c6', { roughness: 0.95 });
    const crust = s.material('#c99a5a', { roughness: 0.95 });
    const ham = s.material('#e39a96', { roughness: 0.8 });
    const brown = s.material('#6e3b2a', { roughness: 0.45 });
    const sandwiches = (plate: THREE.Vector3, count: number) => {
      s.cylinder(0.12, 0.1, 0.012, [plate.x, plate.y, plate.z], china, 24);
      const wedge = new THREE.CylinderGeometry(1, 1, 1, 3);
      const breadSpots: { at: [number, number, number]; size: number }[] = [];
      const hamSpots: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < count; i++) {
        const y = plate.y + 0.012 + i * 0.03;
        const jitter = (random() - 0.5) * 0.02;
        breadSpots.push({ at: [plate.x + jitter, y + 0.006, plate.z + jitter], size: 1 }, { at: [plate.x + jitter, y + 0.024, plate.z + jitter], size: 1 });
        hamSpots.push({ at: [plate.x + jitter, y + 0.015, plate.z + jitter], size: 1 });
      }
      const stack = (spots: typeof breadSpots, material: THREE.Material, height: number, radius: number) => {
        const mesh = s.scatter(wedge, material, spots);
        const matrix = new THREE.Matrix4();
        spots.forEach((spot, index) => {
          const turn = (Math.floor(index / (material === ham ? 1 : 2)) % 2) * Math.PI / 3 + 0.4;
          matrix.makeRotationY(turn).scale(new THREE.Vector3(radius, height, radius)).setPosition(...spot.at);
          mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      };
      stack(breadSpots, random() < 0.5 ? bread : crust, 0.012, 0.075);
      stack(hamSpots, ham, 0.006, 0.07);
    };
    const teapot = (at: THREE.Vector3, hanging: boolean) => {
      const y = hanging ? at.y - 0.15 : at.y;
      s.lathe([[0.035, 0], [0.085, 0.012], [0.095, 0.085], [0.07, 0.135], [0.035, 0.14], [0.035, 0.155], [0.015, 0.16], [0.001, 0.16]], brown, [at.x, y, at.z]);
      s.rod([at.x + 0.08, y + 0.07, at.z], [at.x + 0.15, y + 0.15, at.z], 0.012, brown, 0.008);
      const handle = s.ring(0.05, 0.01, [at.x - 0.085, y + 0.09, at.z], brown, Math.PI * 1.4);
      handle.rotation.z = Math.PI * 0.3;
      void handle;
    };
    const count = 2 + Math.round(a.stack * 7);
    if (twoHanded) {
      const hl = at(person.hands.left), hr = at(person.hands.right);
      const hands = hl.clone().add(hr).multiplyScalar(0.5);
      if (a.carries === 'cups') {
        const tin = s.material(pick(['#a9adb0', '#b89550']), { metalness: 0.7, roughness: 0.35 });
        s.cylinder(0.22, 0.22, 0.008, [hands.x, hands.y + 0.02, hands.z + 0.04], tin, 28);
        s.ring(0.215, 0.009, [hands.x, hands.y + 0.028, hands.z + 0.04], tin).rotation.x = Math.PI / 2;
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + 0.3;
          const cx = hands.x + Math.cos(angle) * 0.13, cz = hands.z + 0.04 + Math.sin(angle) * 0.11;
          s.cylinder(0.05, 0.05, 0.005, [cx, hands.y + 0.027, cz], china, 16);
          s.lathe([[0.01, 0], [0.03, 0.003], [0.036, 0.03], [0.038, 0.052], [0.032, 0.012], [0.01, 0.006]], china, [cx, hands.y + 0.03, cz]);
        }
      } else {
        s.cylinder(0.17, 0.15, 0.012, [hands.x, hands.y + 0.02, hands.z + 0.04], china, 28);
        s.cylinder(0.13, 0.13, 0.08, [hands.x, hands.y + 0.066, hands.z + 0.04], s.material('#4a2e1a', { roughness: 0.95 }), 24);
        s.cylinder(0.135, 0.135, 0.015, [hands.x, hands.y + 0.113, hands.z + 0.04], s.material('#f3eadc', { roughness: 0.8 }), 24);
        s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#c0392b', { roughness: 0.5 }), Array.from({ length: 8 }, (_, i) => ({ at: [hands.x + Math.cos(i * 0.8) * 0.09, hands.y + 0.125, hands.z + 0.04 + Math.sin(i * 0.8) * 0.09] as [number, number, number], size: 0.012 })));
      }
    } else {
      const plateHand = at(person.hands[plateSide]);
      const potHand = at(person.hands[potSide]);
      sandwiches(new THREE.Vector3(plateHand.x, plateHand.y + 0.012, plateHand.z + 0.03), count);
      if (a.carries === 'sandwiches') teapot(potHand, true);
      else {
        const iron = s.material('#1f1f22', { roughness: 0.35, metalness: 0.5 });
        const y = potHand.y - 0.17;
        s.lathe([[0.04, 0], [0.11, 0.01], [0.12, 0.07], [0.09, 0.14], [0.05, 0.15], [0.05, 0.165], [0.025, 0.17], [0.001, 0.17]], iron, [potHand.x, y, potHand.z]);
        s.rod([potHand.x + 0.1, y + 0.08, potHand.z], [potHand.x + 0.17, y + 0.17, potHand.z], 0.014, iron, 0.01);
        s.ring(0.09, 0.012, [potHand.x, y + 0.14, potHand.z], iron, Math.PI).rotation.z = 0;
      }
    }

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
