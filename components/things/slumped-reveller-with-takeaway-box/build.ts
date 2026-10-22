import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { SKINS, anatomy, at, busSeat, closeEyes, garment, joints, openMouth, pick, poseArm, poseLeg, reachArm, seatPalette } from './bus';

/** Vertical stripes for a football shirt, painted on a canvas that wraps round the torso. */
function stripes(a: string, b: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = b;
  for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 16, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** Sequins: a dense scatter of bright specks on a dark ground. */
function sequins(random: () => number, colour: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.5)';
    ctx.fillRect(random() * 64, random() * 64, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

export default defineThing({
  questions: {
    outfit: choice('What is he wearing?', {
      office: 'A crumpled office shirt, tie yanked loose, suit trousers.',
      football: 'A striped football shirt and jeans.',
      sequins: 'A sequinned jacket over a black t-shirt.',
      stag: 'A white stag-do t-shirt with a pink sash.',
    }),
    knee: choice('What is balanced on his knee?', {
      chips: 'An open polystyrene box of chips.',
      kebab: 'A kebab in a torn foil wrapper.',
      cake: 'A slice of cake on a paper napkin.',
    }),
    can: noul('Does he still hold a can of drink?'),
    gone: score('How far gone is he?', ['Nodding, chin on chest', 'Out cold, head back, mouth open', 'About to slide off the seat sideways']),
    company: choice('What else came home with him?', {
      nothing: 'Nothing, just him.',
      cans: 'A carrier bag of cans on the floor by his feet.',
      cone: 'A stolen traffic cone on the seat beside him.',
      balloons: 'A bunch of foil balloons tied to the handrail.',
    }),
    shirt: choice('If it is a shirt, what colour?', {
      white: 'White, going grey with the night.',
      blue: 'Pale blue.',
      pink: 'Pink.',
      lilac: 'Lilac.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.68, 1.88, random());
    const build = random() < 0.4 ? 'heavy' : 'average';
    const skin = pick(random, SKINS);
    const shirtColour = { white: '#eceae2', blue: '#b9cce0', pink: '#e6b4bd', lilac: '#c6b6d8' }[a.shirt];
    const topColour = { office: shirtColour, football: '#ffffff', sequins: '#1a1a1e', stag: '#f2f0ea' }[a.outfit];
    const bottomColour = { office: pick(random, ['#2a2d35', '#3b3a40', '#1f2430']), football: '#3b4f72', sequins: '#1c1c20', stag: '#3b4f72' }[a.outfit];
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'up', skin,
      hair: pick(random, ['short', 'short', 'none', 'cap']), hairColor: pick(random, ['#2a1d18', '#3b2a22', '#6b4a2e', '#c89a5a', '#8a8a86']),
      top: topColour, bottom: bottomColour, shoes: a.outfit === 'office' ? '#1d1a18' : '#f1f1ee', sleeves: a.outfit === 'office' || a.outfit === 'football' ? 'long' : 'short',
    });
    s.root.add(person.root);
    const { limb, torsoL, headR, chestR, spine, torso, shoulderW } = anatomy(person, H, build);

    // ---- the outfit's telling details.
    if (a.outfit === 'office') {
      const tieColour = pick(random, ['#8a1f2a', '#1f3a7a', '#2a6a3a', '#5a2a6a', '#c8a030']);
      const tie = s.material(tieColour, { roughness: 0.6 });
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.02), tie);
      knot.position.set(0.03, torsoL * 0.84, chestR + 0.008);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, torsoL * 0.62, 0.008), tie);
      blade.position.set(0.045, torsoL * 0.52, chestR + 0.008);
      blade.rotation.z = 0.12;
      const collar = new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 1.1, 0.03, 0.02), s.material('#f6f4ee', { roughness: 0.7 }));
      collar.position.set(0, torsoL * 0.97, chestR * 0.8);
      collar.rotation.x = -0.4;
      for (const mesh of [knot, blade, collar]) { mesh.castShadow = true; spine.add(mesh); }
    } else if (a.outfit === 'football') {
      const [c1, c2] = pick(random, [['#c8102e', '#ffffff'], ['#1f4aa8', '#ffffff'], ['#6a1a3a', '#8ec8ff'], ['#121212', '#ffffff'], ['#0a7a3a', '#ffffff']]);
      const kit = s.material('#ffffff', { map: stripes(c1, c2), roughness: 0.8 });
      torso.material = kit;
      for (const side of ['left', 'right'] as const) for (const child of joints(person, side).shoulder.children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = kit;
    } else if (a.outfit === 'sequins') {
      const colour = pick(random, ['#b8902a', '#8a8f9a', '#9a2a6a', '#2a5a9a', '#2a8a5a']);
      const glitter = s.material('#ffffff', { map: sequins(random, colour), metalness: 0.75, roughness: 0.3 });
      garment(person, H, build, glitter, { open: 70, grow: 1.14, length: 1.0 });
      for (const side of ['left', 'right'] as const) {
        const { shoulder, elbow } = joints(person, side);
        for (const node of [shoulder, elbow]) for (const child of node.children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = glitter;
      }
    } else {
      const badge = s.label('STAG DO', 0.14, 0.05, [0, 0, 0], '#1a1a1e', '#f2f0ea');
      s.root.remove(badge);
      badge.position.set(0, torsoL * 0.66, chestR + 0.004);
      badge.castShadow = false;
      spine.add(badge);
      const sash = new THREE.Mesh(new THREE.BoxGeometry(0.07, torsoL * 1.05, 0.012), s.material('#ff5fb4', { roughness: 0.6 }));
      sash.position.set(0, torsoL * 0.5, chestR + 0.006);
      sash.rotation.z = 0.55;
      sash.castShadow = true;
      spine.add(sash);
    }

    // ---- the slump: nodding, out cold, or sliding off sideways.
    const gone = a.gone;
    const { neck } = joints(person, 'left');
    const nod = Math.max(0, 1 - gone * 3);
    const flat = Math.max(0, 1 - Math.abs(gone - 0.5) * 3);
    const slide = Math.max(0, (gone - 0.66) * 3);
    spine.rotation.set(mix(-0.1, -0.42, 1 - nod) + slide * 0.1, 0, -slide * 0.42);
    neck.rotation.set(nod * 0.75 - (1 - nod) * 0.55, (random() - 0.5) * 0.3, -slide * 0.35 + (random() - 0.5) * 0.1);
    closeEyes(person, headR);
    if (nod < 0.6) openMouth(person, headR, s.material('#3a2320', { roughness: 0.8 }), 1 + flat * 0.4);
    // Legs splayed, the aisle leg thrown out straight.
    poseLeg(person, 'left', { forward: mix(62, 48, slide), knee: 28, out: 26 + slide * 8 });
    poseLeg(person, 'right', { forward: 84, knee: 86, out: mix(10, 6, slide) });
    person.settle();
    const hips = at(person.pelvis);
    const seatTop = hips.y - 0.045 * H;
    const seatX = hips.x + 0.12 + slide * 0.1, seatZ = hips.z + 0.06 - slide * 0.1;

    // ---- the knee: the box of chips, the kebab or the cake, on the bent right leg.
    const knee = at(joints(person, 'right').knee);
    const kneeTop = new THREE.Vector3(knee.x, knee.y + limb * 1.05, knee.z - 0.05);
    const poly = s.material('#f3f1e8', { roughness: 0.95 });
    if (a.knee === 'chips') {
      const box = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.16), poly);
      base.position.y = 0.025;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.16), poly);
      lid.position.set(0, 0.08, -0.12);
      lid.rotation.x = -1.9;
      box.add(base, lid);
      const chip = new THREE.BoxGeometry(0.012, 0.012, 0.055);
      const chipMat = s.material('#e8b84a', { roughness: 0.8 });
      const chips = new THREE.InstancedMesh(chip, chipMat, 34);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 34; i++) {
        e.set((random() - 0.5) * 0.8, random() * Math.PI, (random() - 0.5) * 0.8);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3((random() - 0.5) * 0.16, 0.055 + random() * 0.035, (random() - 0.5) * 0.12), q, new THREE.Vector3(1, 1, 1));
        chips.setMatrixAt(i, m);
      }
      chips.castShadow = true;
      box.add(chips);
      box.position.copy(kneeTop);
      box.rotation.set(-0.25, 0.2, 0.1);
      box.traverse((node) => { node.castShadow = true; });
      s.root.add(box);
    } else if (a.knee === 'kebab') {
      const foil = s.material('#c9ccd2', { metalness: 0.8, roughness: 0.3 });
      const wrap = s.box([0.2, 0.03, 0.16], [kneeTop.x, kneeTop.y + 0.01, kneeTop.z], foil);
      wrap.rotation.set(-0.3, 0.3, 0.1);
      s.ball([0.07, 0.03, 0.05], [kneeTop.x, kneeTop.y + 0.035, kneeTop.z], s.material('#b8743a', { roughness: 0.9 }), 10);
      s.ball([0.05, 0.02, 0.04], [kneeTop.x + 0.03, kneeTop.y + 0.05, kneeTop.z + 0.02], s.material('#7fbf4a', { roughness: 1 }), 8);
      s.ball([0.03, 0.015, 0.03], [kneeTop.x - 0.03, kneeTop.y + 0.05, kneeTop.z - 0.02], s.material('#d93a3a', { roughness: 0.9 }), 8);
    } else {
      s.box([0.16, 0.004, 0.16], [kneeTop.x, kneeTop.y + 0.002, kneeTop.z], poly).rotation.set(-0.3, 0.4, 0.1);
      const wedge = new THREE.Shape([[0, 0], [0.1, -0.035], [0.1, 0.035]].map(([x, y]) => new THREE.Vector2(x, y)));
      const cake = s.mesh(new THREE.ExtrudeGeometry(wedge, { depth: 0.045, bevelEnabled: false }), s.material(pick(random, ['#d9b36a', '#5a2d1e', '#e8a0b0']), { roughness: 0.9 }), [kneeTop.x - 0.04, kneeTop.y + 0.004, kneeTop.z]);
      cake.rotation.set(-Math.PI / 2 - 0.3, 0.4, 0.1);
      s.box([0.1, 0.012, 0.07], [kneeTop.x + 0.01, kneeTop.y + 0.05, kneeTop.z - 0.02], s.material('#f8e6ee', { roughness: 0.7 })).rotation.set(-0.3, 0.4, 0.1);
    }

    // ---- arms: one hand on the box, the other dangling beside the seat, with or without a can.
    for (const side of ['right', 'left'] as const) {
      const shoulder = at(joints(person, side).shoulder);
      if (side === 'right') reachArm(person, side, H, kneeTop.y + 0.06 - shoulder.y, kneeTop.z - 0.06 - shoulder.z, 10, 10);
      else if (a.can) poseArm(person, side, { forward: 18, out: 22, bend: 30, inward: 10 });
      else poseArm(person, side, { forward: -6, out: 34, bend: 6 });
    }
    if (a.can) {
      person.root.updateMatrixWorld(true);
      const hand = at(person.hands.left);
      const canColour = pick(random, ['#c8102e', '#1f4aa8', '#e8c030', '#9aa0a6', '#2a8a5a']);
      s.cylinder(0.033, 0.033, 0.12, [hand.x, hand.y - 0.02, hand.z + 0.02], s.material(canColour, { metalness: 0.6, roughness: 0.35 }), 14);
      s.cylinder(0.03, 0.03, 0.004, [hand.x, hand.y + 0.042, hand.z + 0.02], s.material('#d4d6da', { metalness: 0.8, roughness: 0.3 }), 14);
    }

    // ---- one shoe half off: a sock on that foot, the shoe hanging from the toes.
    const { ankle } = joints(person, 'left');
    const foot = ankle.children.find((node) => (node as THREE.Mesh).isMesh) as THREE.Mesh;
    foot.material = s.material(pick(random, ['#e8e4dc', '#2a2a30', '#8a8a86']), { roughness: 1 });
    person.root.updateMatrixWorld(true);
    const toe = foot.localToWorld(new THREE.Vector3(0, limb * 1.4, 0));
    const shoe = s.mesh(new THREE.CapsuleGeometry(limb * 0.95, limb * 2.4, 3, 8), s.material(a.outfit === 'office' ? '#1d1a18' : '#f1f1ee', { roughness: 0.5 }), [toe.x + 0.01, Math.max(limb, toe.y - 0.03), toe.z + 0.06]);
    shoe.rotation.set(Math.PI / 2 + 0.5, 0.3, 0.6);

    // ---- the seat and his company.
    const palette = seatPalette(s, random);
    busSeat(s, palette, { x: seatX, z: seatZ, seatTop, aisle: 'right', cantilever: true });
    if (a.company === 'cans') {
      const bagMat = s.material('#f4f4f0', { roughness: 0.9, transparent: true, opacity: 0.85 });
      const bx = seatX + 0.5, bz = seatZ + 0.3;
      s.ball([0.14, 0.13, 0.12], [bx, 0.12, bz], bagMat, 12);
      for (let i = 0; i < 3; i++) s.cylinder(0.033, 0.033, 0.12, [bx + (i - 1) * 0.06, 0.15 + (i % 2) * 0.02, bz + (i - 1) * 0.02], s.material(pick(random, ['#c8102e', '#1f4aa8', '#e8c030']), { metalness: 0.6, roughness: 0.35 }), 12);
      s.cylinder(0.033, 0.033, 0.12, [bx - 0.2, 0.033, bz + 0.15], s.material('#9aa0a6', { metalness: 0.6, roughness: 0.35 }), 12).rotation.set(Math.PI / 2, 0, 0.6);
    } else if (a.company === 'cone') {
      const cx = seatX + 0.26, cz = seatZ + 0.02;
      s.box([0.3, 0.03, 0.3], [cx, seatTop + 0.015, cz], s.material('#1a1a1c', { roughness: 0.9 }));
      s.cylinder(0.03, 0.14, 0.5, [cx, seatTop + 0.28, cz], s.material('#ff6a1a', { roughness: 0.6 }), 16);
      s.cylinder(0.075, 0.095, 0.08, [cx, seatTop + 0.3, cz], s.material('#f4f4f0', { roughness: 0.4 }), 16);
    } else if (a.company === 'balloons') {
      const tieAt = new THREE.Vector3(seatX + 0.34, seatTop + 0.62, seatZ - 0.24);
      const string = s.material('#d8d8d4', { roughness: 1 });
      for (let i = 0; i < 3; i++) {
        const top = new THREE.Vector3(tieAt.x + (i - 1) * 0.14 + (random() - 0.5) * 0.08, tieAt.y + 0.55 + random() * 0.15, tieAt.z - 0.05 + (random() - 0.5) * 0.1);
        s.rod([tieAt.x, tieAt.y, tieAt.z], [top.x, top.y - 0.1, top.z], 0.002, string);
        s.ball([0.1, 0.12, 0.1], [top.x, top.y, top.z], s.material(pick(random, ['#d4a020', '#c8c8d0', '#d93a6a', '#2a8ad4']), { metalness: 0.85, roughness: 0.25 }), 14);
      }
    }

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
