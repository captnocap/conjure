import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { type P, beanie, pick, pickSkin, rig, worldOf } from './rig';

/** Push every vertex a little along its normal, so a foil blanket crinkles under the light. */
function crinkle(geometry: THREE.BufferGeometry, random: () => number, amount: number) {
  geometry.computeVertexNormals();
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const push = (random() - 0.5) * amount;
    position.setXYZ(i, position.getX(i) + normal.getX(i) * push, position.getY(i) + normal.getY(i) * push, position.getZ(i) + normal.getZ(i) * push);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    phones: score('How many phones are charging on the strip?', ['Just his own, the strip otherwise empty', 'Two or three in a row', 'Five, every socket taken and a splitter besides']),
    wears: choice('What is he wearing?', {
      tracksuit: 'A navy tracksuit with a white stripe down the arms and legs.',
      suit: 'A creased suit jacket over a jumper, the clothes he left in.',
      foil: 'A silver foil blanket over his shoulders, still in it from the night.',
      parka: 'A parka with the hood up and the fur trim pulled close.',
    }),
    doing: choice('What is he doing right now?', {
      texting: 'Thumbs on his own phone, typing, head bent.',
      staring: 'Staring at the row of screens, phone loose in one hand.',
      asleep: 'Asleep on his heels, chin on his chest, phone held by habit.',
    }),
    charge: score('How charged are the phones?', ['Red: barely begun, screens dark', 'Amber: halfway, screens glowing', 'Green: nearly full, every screen lit']),
    surface: choice('What is the strip set up on?', {
      pallet: 'A wooden shipping pallet.',
      crate: 'An upturned plastic crate.',
      cardboard: 'A flattened cardboard box on the ground.',
      block: 'Two concrete blocks side by side.',
    }),
    kettle: noul('Does a small travel kettle share the power strip?'),
    generator: noul('Is the petrol generator visible behind, the cable running from it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.68, 1.86, random());
    const skin = pickSkin(random);
    const S = random() < 0.5 ? 1 : -1; // which side the strip is on
    const outfit = {
      tracksuit: { top: '#1f2a44', bottom: '#1f2a44', shoes: '#efece4', hair: 'short' as const },
      suit: { top: '#3a3a40', bottom: '#2b2b30', shoes: '#2a2a2c', hair: 'short' as const },
      foil: { top: pick(random, ['#5a5f6a', '#6a4a3a', '#3b4a6a']), bottom: '#3a3f4a', shoes: '#2a2a2c', hair: 'short' as const },
      parka: { top: pick(random, ['#4a5a3a', '#2b3a5a', '#3a3a3a']), bottom: '#3a3f4a', shoes: '#5a4030', hair: 'hood' as const },
    }[a.wears];
    const person = figure(s, {
      height: H, build: pick(random, ['slight', 'average']), style: 'doll', skin, hair: outfit.hair, hairColor: pick(random, ['#1d1d1f', '#2a1d16', '#4a3524', '#8a8a86']),
      top: outfit.top, bottom: outfit.bottom, shoes: outfit.shoes, sleeves: 'long', pose: 'crouching', gaze: 'ahead',
    });
    s.root.add(person.root);
    const joints = rig(person);
    // Elbows on the knees; the arms and head by what he is doing.
    if (a.doing === 'texting') { joints.arm('left', { forward: 58, out: 4, bend: 100, across: 38 }); joints.arm('right', { forward: 58, out: 4, bend: 100, across: 38 }); joints.look(42, 0); }
    if (a.doing === 'staring') { joints.arm('right', { forward: 60, out: 6, bend: 92, across: 18 }); joints.arm('left', { forward: 48, out: 10, bend: 45, across: 5 }); joints.look(24, S * 40); }
    if (a.doing === 'asleep') { joints.arm('right', { forward: 44, out: 6, bend: 38, across: 10 }); joints.arm('left', { forward: 44, out: 8, bend: 30, across: 4 }); joints.look(58, S * 10); joints.bow(10); }
    joints.settle();
    const limb = H * 0.036, shoulderW = H * 0.115, torsoL = H * 0.28, upperL = H * 0.17, thighL = H * 0.24, headR = H * 0.064;
    const add = (mesh: THREE.Mesh, at: P, parent: THREE.Object3D) => { mesh.position.set(...at); mesh.castShadow = true; parent.add(mesh); return mesh; };
    if (a.wears === 'tracksuit') {
      const stripe = s.material('#efece4', { roughness: 0.8 });
      for (const side of ['left', 'right'] as const) {
        const sign = side === 'left' ? 1 : -1;
        const shoulder = person.hands[side].parent!.parent!.parent!;
        add(new THREE.Mesh(new THREE.BoxGeometry(0.012, upperL * 0.9, 0.006), stripe), [sign * limb * 0.95, -upperL / 2, 0], shoulder);
      }
      const [, hipL, hipR] = person.pelvis.children.filter((c) => (c as THREE.Group).isGroup);
      for (const [hip, sign] of [[hipL, 1], [hipR, -1]] as const) add(new THREE.Mesh(new THREE.BoxGeometry(0.012, thighL * 0.9, 0.006), stripe), [sign * limb * 1.1, -thighL / 2, 0], hip);
    }
    if (a.wears === 'suit') {
      const jumper = s.material(pick(random, ['#8a2a2a', '#4a7a5a', '#c9a060', '#2b4a8a']), { roughness: 1 });
      add(new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 0.7, torsoL * 0.6, 0.012), jumper), [0, torsoL * 0.55, limb * 1.3], joints.spine);
      for (const side of [-1, 1]) { const lapel = add(new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 0.42, torsoL * 0.5, 0.008), s.material('#2b2b30', { roughness: 0.6 })), [side * shoulderW * 0.5, torsoL * 0.62, limb * 1.36], joints.spine); lapel.rotation.z = side * 0.3; }
    }
    if (a.wears === 'foil') {
      const foil = new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 0.9, roughness: 0.28, side: THREE.DoubleSide });
      const wrap = add(new THREE.Mesh(crinkle(new THREE.CylinderGeometry(shoulderW * 1.25, shoulderW * 1.9, torsoL * 1.15, 24, 8, true), random, 0.03), foil), [0, torsoL * 0.98 - torsoL * 1.15 / 2, -0.02], joints.spine);
      wrap.scale.z = 0.75;
    }
    if (a.wears === 'parka') { const fur = add(new THREE.Mesh(new THREE.TorusGeometry(headR * 1.25, headR * 0.22, 8, 20), s.material('#c9b8a0', { roughness: 1 })), [0, headR * 0.1, headR * 0.35], person.head); fur.rotation.x = Math.PI / 2 - 0.55; }
    if (a.wears !== 'parka' && random() < 0.5) beanie(person, s.material(pick(random, ['#2a2a2c', '#8a2a2a', '#4a4a44']), { roughness: 1 }), headR);
    person.root.updateMatrixWorld(true);
    const right = worldOf(person.hands.right), left = worldOf(person.hands.left);
    const hips = worldOf(person.pelvis);

    // His own phone, in the right hand (both hands when texting).
    const charge = a.charge;
    const screenGlow = new THREE.MeshStandardMaterial({ color: '#cfd8ff', emissive: '#8fa8ff', emissiveIntensity: mix(0.4, 1.8, charge) * mix(1.2, 0.7, mood.daylight) });
    const phoneBody = s.material('#1d1d1f', { roughness: 0.4 });
    const ownAt = a.doing === 'texting' ? new THREE.Vector3((left.x + right.x) / 2, (left.y + right.y) / 2 + 0.03, (left.z + right.z) / 2 + 0.02) : right.clone().add(new THREE.Vector3(0, 0.03, 0.03));
    const own = new THREE.Group();
    own.position.copy(ownAt);
    own.rotation.x = a.doing === 'asleep' ? -1.3 : -0.75;
    own.rotation.z = a.doing === 'asleep' ? 0.5 : 0;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.008), phoneBody);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.136, 0.002), a.doing === 'asleep' ? s.material('#2a2c30') : screenGlow);
    screen.position.z = 0.004;
    body.castShadow = true;
    own.add(body, screen);
    s.root.add(own);

    // The surface the strip sits on, beside him.
    const wood = s.material(new THREE.Color('#b08a5a').lerp(new THREE.Color('#6a5a4a'), mood.wear * 0.5), { roughness: 0.95 });
    const sx = hips.x + S * 0.72, sz = hips.z + 0.1;
    let top = 0.14;
    if (a.surface === 'pallet') {
      s.scatter(new THREE.BoxGeometry(0.1, 0.02, 1.2), wood, Array.from({ length: 7 }, (_u, i) => ({ at: [sx - 0.36 + i * 0.12, 0.13, sz] as P, size: 1 })));
      s.scatter(new THREE.BoxGeometry(0.8, 0.09, 0.1), wood, [-0.5, 0, 0.5].map((dz) => ({ at: [sx, 0.075, sz + dz] as P, size: 1 })));
      s.scatter(new THREE.BoxGeometry(0.1, 0.02, 1.2), wood, [-0.35, 0, 0.35].map((dx) => ({ at: [sx + dx, 0.015, sz] as P, size: 1 })));
    } else if (a.surface === 'crate') {
      top = 0.34;
      s.box([0.5, 0.34, 0.36], [sx, 0.17, sz], s.material(pick(random, ['#2f6fc4', '#c9402a', '#3a3a3a']), { roughness: 0.6 }));
      s.scatter(new THREE.BoxGeometry(0.48, 0.012, 0.012), s.material('#1d1d1f'), Array.from({ length: 5 }, (_u, i) => ({ at: [sx, 0.06 + i * 0.06, sz + 0.181] as P, size: 1 })));
    } else if (a.surface === 'cardboard') {
      top = 0.03;
      s.box([0.9, 0.03, 1.1], [sx, 0.015, sz], s.material('#b48a5a', { roughness: 1 }));
      s.box([0.02, 0.004, 1.1], [sx, 0.032, sz], s.material('#8a6a42'));
    } else {
      top = 0.2;
      for (const dz of [-0.22, 0.22]) { s.box([0.4, 0.2, 0.2], [sx, 0.1, sz + dz], s.material('#9a9a94', { roughness: 1 })); for (const dx of [-0.1, 0.1]) s.box([0.12, 0.202, 0.12], [sx + dx, 0.1, sz + dz], s.material('#5a5a56', { roughness: 1 })); }
    }

    // The power strip, its switch, and the phones in their row with cables.
    const stripX = sx - S * 0.16, stripZ = sz - 0.1;
    const white = s.material('#e8e6e0', { roughness: 0.5 });
    s.box([0.07, 0.04, 0.38], [stripX, top + 0.02, stripZ], white);
    s.scatter(new THREE.BoxGeometry(0.03, 0.004, 0.03), s.material('#2a2c30'), Array.from({ length: 5 }, (_u, i) => ({ at: [stripX, top + 0.041, stripZ - 0.14 + i * 0.07] as P, size: 1 })));
    s.box([0.02, 0.01, 0.02], [stripX, top + 0.045, stripZ + 0.17], new THREE.MeshStandardMaterial({ color: '#ff6a4a', emissive: '#ff2a10', emissiveIntensity: 1.2 }));
    const count = Math.round(mix(1, 5, a.phones));
    const led = charge < 0.34 ? '#ff2a2a' : charge < 0.67 ? '#ffa020' : '#30e060';
    const ledPaint = new THREE.MeshStandardMaterial({ color: led, emissive: led, emissiveIntensity: 2 });
    const cable = s.material(pick(random, ['#efece4', '#1d1d1f', '#2a2a2c']), { roughness: 0.7 });
    for (let i = 0; i < count; i++) {
      const px = sx + S * 0.12 + (random() - 0.5) * 0.03, pz = sz - 0.32 + i * 0.16 + (random() - 0.5) * 0.02;
      const phone = s.box([0.074, 0.008, 0.15], [px, top + 0.004, pz], phoneBody);
      phone.rotation.y = (random() - 0.5) * 0.3;
      const face = s.box([0.064, 0.002, 0.134], [px, top + 0.009, pz], charge < 0.34 && random() < 0.6 ? s.material('#2a2c30') : screenGlow);
      face.rotation.y = phone.rotation.y;
      face.castShadow = false;
      const dot = s.ball([0.005, 0.005, 0.005], [px - S * 0.025, top + 0.012, pz - 0.06], ledPaint, 6);
      dot.castShadow = false;
      s.tube([[px, top + 0.006, pz - 0.076], [px - S * 0.06, top + 0.03, pz - 0.05], [stripX + S * 0.035, top + 0.03, stripZ - 0.14 + (i % 5) * 0.07]], 0.004, cable);
    }
    if (a.kettle) {
      const kx = sx + S * 0.1, kz = sz + 0.42;
      const kettle = s.material(pick(random, ['#efece4', '#c9402a', '#9aa0a4']), { roughness: 0.45, metalness: 0.3 });
      s.lathe([[0, 0], [0.085, 0], [0.09, 0.03], [0.08, 0.14], [0.055, 0.17], [0, 0.17]], kettle, [kx, top, kz]);
      s.rod([kx - S * 0.08, top + 0.07, kz], [kx - S * 0.13, top + 0.15, kz], 0.014, kettle);
      s.rod([kx + S * 0.07, top + 0.1, kz], [kx + S * 0.11, top + 0.15, kz], 0.012, kettle);
      s.tube([[kx, top + 0.02, kz - 0.08], [kx - S * 0.1, top + 0.03, kz - 0.25], [stripX + S * 0.035, top + 0.03, stripZ + 0.14]], 0.005, cable);
    }
    // The cord away to the generator, behind.
    const genX = sx - S * 0.1, genZ = sz - 1.05;
    const away: P[] = [[stripX, top + 0.015, stripZ - 0.19], [stripX - S * 0.1, 0.015, stripZ - 0.45], [genX + S * 0.1, 0.01, genZ + 0.55], [genX + S * 0.2, 0.18, genZ + 0.22]];
    s.tube(a.generator ? away : away.slice(0, 3), 0.007, s.material('#e8601a', { roughness: 0.7 }));
    if (a.generator) {
      const paint = s.material(pick(random, ['#c93a2a', '#2b4f8a', '#d4a21c', '#3a3a3a']), { roughness: 0.5, metalness: 0.2 });
      const frame = s.material('#2a2c2e', { metalness: 0.5, roughness: 0.5 });
      s.box([0.5, 0.36, 0.34], [genX, 0.24, genZ], paint);
      s.box([0.3, 0.06, 0.3], [genX, 0.44, genZ], frame);
      s.cylinder(0.04, 0.04, 0.03, [genX - 0.1, 0.485, genZ - 0.06], s.material('#1d1d1f'), 12);
      s.rod([genX + 0.27, 0.3, genZ + 0.1], [genX + 0.27, 0.1, genZ + 0.1], 0.012, frame);
      for (const dx of [-0.28, 0.28]) for (const dz of [-0.2, 0.2]) s.rod([genX + dx, 0, genZ + dz], [genX + dx, 0.5, genZ + dz], 0.014, frame);
      for (const dz of [-0.2, 0.2]) s.rod([genX - 0.28, 0.5, genZ + dz], [genX + 0.28, 0.5, genZ + dz], 0.014, frame);
      s.box([0.1, 0.1, 0.08], [genX + 0.24, 0.12, genZ], s.material('#1d1d1f'));
      s.scatter(new THREE.BoxGeometry(0.004, 0.14, 0.14), frame, Array.from({ length: 5 }, (_u, i) => ({ at: [genX - 0.252, 0.2, genZ - 0.12 + i * 0.06] as P, size: 1 })));
    }
    if (mood.wear > 0.5) s.scatter(new THREE.CylinderGeometry(1, 1, 0.004, 8), s.material('#3a3328', { roughness: 1 }), Array.from({ length: 6 }, () => ({ at: [hips.x + (random() - 0.5) * 1.6, 0.003, hips.z + (random() - 0.5) * 1.2] as P, size: 0.04 + random() * 0.05 })));

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (a.doing === 'texting') joints.neck.rotation.z = Math.sin(time * 6) * 0.01 * energy;
      },
    });
  },
});
