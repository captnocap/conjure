import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { armPose, at, beard, legPose, segmentOf, skullcap } from './pose';
import { marble } from './marble';

/** The top of a folded newspaper: a masthead bar and columns of grey text. */
function newspaperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 224;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#e4e1d8';
  c.fillRect(0, 0, 128, 224);
  c.fillStyle = '#1f1f22';
  c.fillRect(10, 10, 108, 22);
  c.fillStyle = '#5a5a5e';
  for (let y = 44; y < 214; y += 7) {
    c.fillRect(10, y, 50 - (y % 3) * 4, 3);
    c.fillRect(68, y, 50 - (y % 5) * 3, 3);
  }
  c.fillStyle = '#8a8a8e';
  c.fillRect(10, 60, 50, 36);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    beads: choice('What are the prayer beads?', {
      amber: 'Honey amber beads that glow where the light comes through, with a silk tassel.',
      wood: 'Dark olive-wood beads worn smooth by forty years of thumbs.',
      black: 'Black onyx beads with a silver tassel.',
      turquoise: 'Turquoise beads strung on a red cord.',
      pearl: 'Pale mother-of-pearl beads, a gift, kept for best.',
    }),
    hat: choice('What is on his head?', {
      flat: 'A flat tweed cap.',
      skullcap: 'A white crocheted prayer cap.',
      fedora: 'An old brimmed felt hat.',
      none: 'Bare: a bald crown ringed with white hair.',
    }),
    clothes: choice('What is he wearing?', {
      cardigan: 'A buttoned cardigan over a white shirt.',
      suit: 'An old grey suit jacket with a small-knotted tie.',
      overcoat: 'A heavy dark overcoat with the collar up.',
      waistcoat: 'Shirtsleeves and a waistcoat, in the warmth.',
    }),
    gaze: choice('Where is he looking?', {
      beads: 'Down at the beads passing through his fingers.',
      away: 'Off across the square, at the fountain, at the people, at nothing.',
      dozing: 'Eyes shut, chin sunk, the beads stopped in his hand.',
    }),
    stick: noul('Is a walking stick leaning against the bench beside him?'),
    newspaper: noul('Is there a folded newspaper on the bench beside him?'),
    bench: choice('What is he sitting on?', {
      stone: 'A plain grey stone slab on two block legs.',
      marble: 'A white marble bench with scrolled ends.',
      wooden: 'A slatted wooden bench with cast-iron ends and a back.',
      wall: 'The coping of a low wall.',
    }),
    waiting: score('How long has he been sitting here?', ['Just sat down, straight-backed', 'A good while: settled, shoulders rounded', 'All afternoon, sunk into the bench']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.62, 1.72, random());
    const build = pick(['slight', 'average', 'heavy'] as const);
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const skinTone = pick(['#d9b08c', '#c99a78', '#b5805a', '#e3c2a4', '#9a6b4b']);
    const shirt = a.clothes === 'overcoat' ? '#2a2a30' : '#f1efe8';
    const outfit = {
      cardigan: { top: pick(['#6b4f33', '#5a5a3a', '#7a3a3a', '#3a4a5a']), bottom: pick(['#4a4a4e', '#6d6f70', '#3a3c44']) },
      suit: { top: '#5a5c60', bottom: '#4a4c50' },
      overcoat: { top: '#2a2a30', bottom: '#2f2f33' },
      waistcoat: { top: shirt, bottom: '#4a4238' },
    }[a.clothes];
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'down', skin: skinTone,
      hair: a.hat === 'fedora' ? 'hat' : a.hat === 'skullcap' ? 'short' : 'none',
      hairColor: a.hat === 'fedora' ? pick(['#3a3a3a', '#5a4a3a', '#6b6456']) : '#dedbd2',
      top: outfit.top, bottom: outfit.bottom, shoes: pick(['#2a211b', '#4a3324', '#1c1a19']), sleeves: 'long',
    });
    s.root.add(person.root);
    const { joints } = person;
    const headR = H * 0.064, limb = H * 0.036 * wide, torsoL = H * 0.28;
    const front = limb * 1.35 * (build === 'heavy' ? 1.25 : 1);

    // ---- the pose: knees apart, forearms on the thighs, hands meeting between the knees
    const slump = a.waiting;
    for (const side of ['left', 'right'] as const) legPose(person, side, { forward: 86, out: mix(10, 18, slump), knee: 84 });
    joints.spine.rotation.x = mix(0.08, 0.4, slump) + (a.gaze === 'dozing' ? 0.1 : 0);
    joints.neck.rotation.x = a.gaze === 'beads' ? 0.5 : a.gaze === 'dozing' ? 0.7 : 0.05;
    joints.neck.rotation.y = a.gaze === 'away' ? 0.55 : 0;
    const forward = mix(30, 36, slump), bend = mix(24, 32, slump);
    armPose(person, 'left', { forward, out: 2, bend, swing: -38 });
    armPose(person, 'right', { forward, out: 2, bend, swing: -38 });
    person.settle();
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);

    // ---- head
    const white = s.material('#f3f1ea', { roughness: 0.95 });
    if (a.hat === 'skullcap') skullcap(person.head, headR, white);
    if (a.hat === 'flat') {
      // A tweed flat cap: a low, wide crown pulled forward over the brow, with a short stiff peak.
      const capMat = s.material(pick(['#5a4a38', '#3f3a33', '#6b6456', '#4a4f44']), { roughness: 0.95 });
      const crown = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
      crown.scale.set(1.06, 0.56, 1.2);
      crown.position.set(0, headR * 0.64, headR * 0.06);
      crown.rotation.x = 0.14;
      crown.castShadow = true;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.08, headR * 1.08, headR * 0.16, 20), capMat);
      band.scale.z = 1.12;
      band.position.set(0, headR * 0.58, headR * 0.05);
      band.rotation.x = 0.14;
      const peak = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.82, headR * 0.82, headR * 0.07, 18, 1, false, -Math.PI / 2, Math.PI), capMat);
      peak.scale.z = 0.62;
      peak.position.set(0, headR * 0.54, headR * 1.02);
      peak.rotation.x = 0.2;
      peak.castShadow = true;
      person.head.add(crown, band, peak);
    }
    if (a.hat === 'none' || a.hat === 'flat') {
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 16, 8, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.24), s.material('#dedbd2', { roughness: 0.9, side: THREE.DoubleSide }));
      fringe.position.y = headR * 0.1;
      person.head.add(fringe);
    }
    if (random() < 0.5) beard(person.head, headR, s.material('#e9e6df', { roughness: 1 }), 0.9);

    // ---- clothes: buttons, collar, tie, vest
    const cloth = s.material(outfit.top, { roughness: 0.85 });
    const shirtMat = s.material(shirt, { roughness: 0.8 });
    if (a.clothes !== 'waistcoat') {
      const buttons = s.material(a.clothes === 'overcoat' ? '#1a1a1c' : '#3a2a1a', { roughness: 0.5 });
      const count = a.clothes === 'overcoat' ? 3 : 5;
      for (let i = 0; i < count; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), buttons);
        button.position.set(0, torsoL * 0.14 + i * torsoL * (a.clothes === 'overcoat' ? 0.2 : 0.14), front + 0.004);
        joints.spine.add(button);
      }
    }
    const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.05, a.clothes === 'overcoat' ? 0.02 : 0.011, 6, 20), a.clothes === 'overcoat' ? cloth : shirtMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = torsoL + (a.clothes === 'overcoat' ? 0.012 : 0.004);
    joints.spine.add(collar);
    if (a.clothes === 'cardigan') {
      for (const sign of [-1, 1]) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.006), shirtMat);
        lapel.position.set(sign * 0.022, torsoL * 0.82, front + 0.003);
        lapel.rotation.z = sign * 0.45;
        joints.spine.add(lapel);
      }
    }
    if (a.clothes === 'suit') {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.028, torsoL * 0.5, 0.008), s.material(pick(['#7a1f2b', '#1f3a7a', '#2f5a3a', '#8a6a2a'])));
      tie.position.set(0, torsoL * 0.62, front + 0.006);
      joints.spine.add(tie);
    }
    if (a.clothes === 'waistcoat') {
      const torso = segmentOf(joints.spine);
      const vest = new THREE.Mesh(new THREE.CapsuleGeometry(limb * 1.42 * (build === 'heavy' ? 1.25 : 1), torsoL * 0.98 - limb * 2.6, 4, 14), s.material(pick(['#6b4f33', '#1f1d20', '#5a6a3a', '#4a3a5a']), { roughness: 0.85 }));
      vest.position.y = torsoL * 0.44;
      vest.scale.x = torso.scale.x * 1.02;
      vest.castShadow = true;
      joints.spine.add(vest);
      for (let i = 0; i < 4; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#2a2320'));
        button.position.set(0, torsoL * 0.2 + i * torsoL * 0.11, limb * 1.42 * (build === 'heavy' ? 1.25 : 1) + 0.004);
        joints.spine.add(button);
      }
    }

    // ---- the beads: a loop hanging from both hands, thirty-three beads on a cord, a tassel at the bottom
    const look = {
      amber: { bead: s.material('#d9821a', { roughness: 0.2, emissive: '#6a3000', emissiveIntensity: 0.35 }), cord: '#6b3a1a', tassel: '#c98a2e' },
      wood: { bead: s.material('#4a3320', { roughness: 0.45 }), cord: '#2a2320', tassel: '#2a2320' },
      black: { bead: s.material('#111214', { roughness: 0.15 }), cord: '#1a1a1c', tassel: '#c7c9cc' },
      turquoise: { bead: s.material('#2aa0a8', { roughness: 0.3 }), cord: '#8e2a22', tassel: '#8e2a22' },
      pearl: { bead: s.material('#efe9e2', { roughness: 0.15 }), cord: '#d9d2c4', tassel: '#c9a24a' },
    }[a.beads];
    const hL = at(person.hands.left), hR = at(person.hands.right);
    const pivot = hL.clone().add(hR).multiplyScalar(0.5);
    const loop = new THREE.Group();
    loop.position.copy(pivot);
    s.root.add(loop);
    const l = hL.clone().sub(pivot), r = hR.clone().sub(pivot);
    const drop = a.gaze === 'dozing' ? 0.16 : 0.25;
    const curve = new THREE.CatmullRomCurve3([
      l.clone().add(new THREE.Vector3(0, 0.012, 0.012)),
      l.clone().add(new THREE.Vector3(0.012, -drop * 0.5, 0.03)),
      new THREE.Vector3(0, -drop, 0.04),
      r.clone().add(new THREE.Vector3(-0.012, -drop * 0.5, 0.03)),
      r.clone().add(new THREE.Vector3(0, 0.012, 0.012)),
    ]);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0026, 5, false), s.material(look.cord, { roughness: 0.8 }));
    cord.castShadow = true;
    loop.add(cord);
    const beadR = 0.0095;
    const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(beadR, 10, 8), look.bead, 33);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 33; i++) {
      const p = curve.getPointAt((i + 0.5) / 33);
      m.makeTranslation(p.x, p.y, p.z);
      beads.setMatrixAt(i, m);
    }
    beads.instanceMatrix.needsUpdate = true;
    beads.castShadow = beads.receiveShadow = true;
    loop.add(beads);
    const low = curve.getPointAt(0.5);
    const tasselMat = s.material(look.tassel, { roughness: 0.7 });
    const imame = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.03, 8), tasselMat);
    imame.position.set(low.x, low.y - 0.022, low.z);
    imame.castShadow = true;
    loop.add(imame);
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.05, 10), tasselMat);
    tassel.position.set(low.x, low.y - 0.062, low.z);
    tassel.castShadow = true;
    loop.add(tassel);

    // ---- the bench, with him sitting toward one end of it
    const seatY = Math.max(0.25, person.hipHeight - 0.045 * H);
    const benchL = 1.7, benchD = 0.46;
    const bx = hips.x - 0.32, bz = hips.z - 0.03;
    const stoneMat = s.material(pick(['#9a978f', '#8c8a84', '#a8a49a']), { roughness: 0.9 });
    const marbleMat = s.material('#ffffff', { map: marble(random, '#e4e1d9', '#c9c6be'), roughness: 0.5 });
    const wood = s.material(pick(['#6b4a2e', '#4e3a28', '#8a6a44']), { roughness: 0.6 });
    const iron = s.material('#2e2f33', { metalness: 0.5, roughness: 0.6 });
    if (a.bench === 'stone' || a.bench === 'marble') {
      const mat = a.bench === 'stone' ? stoneMat : marbleMat;
      s.box([benchL, 0.09, benchD], [bx, seatY - 0.045, bz], mat);
      for (const e of [-1, 1]) s.box([0.26, seatY - 0.09, benchD - 0.08], [bx + e * (benchL / 2 - 0.2), (seatY - 0.09) / 2, bz], mat);
      if (a.bench === 'marble') for (const e of [-1, 1]) {
        const scroll = s.cylinder(0.07, 0.07, benchD, [bx + e * (benchL / 2 - 0.07), seatY + 0.065, bz], mat, 16);
        scroll.rotation.x = Math.PI / 2;
      }
    }
    if (a.bench === 'wooden') {
      for (let i = 0; i < 5; i++) s.box([benchL, 0.035, 0.075], [bx, seatY - 0.0175, bz - benchD / 2 + 0.05 + i * 0.09], wood);
      for (const e of [-1, 1]) {
        const x = bx + e * (benchL / 2 - 0.05);
        for (const dz of [-0.15, 0.15]) s.box([0.05, seatY - 0.035, 0.06], [x, (seatY - 0.035) / 2, bz + dz], iron);
        s.box([0.05, 0.05, benchD], [x, seatY - 0.06, bz], iron);
        const upright = s.box([0.05, 0.5, 0.05], [x, seatY + 0.24, bz - benchD / 2 - 0.04], iron);
        upright.rotation.x = -0.15;
      }
      for (const y of [0.17, 0.35]) {
        const slat = s.box([benchL, 0.09, 0.03], [bx, seatY + y, bz - benchD / 2 - 0.04 - y * 0.15], wood);
        slat.rotation.x = -0.15;
      }
    }
    if (a.bench === 'wall') {
      s.box([2.3, seatY - 0.05, 0.5], [bx, (seatY - 0.05) / 2, bz], s.material(pick(['#c9b89a', '#b8a98c', '#d2c6ad']), { roughness: 0.95 }));
      s.box([2.36, 0.05, 0.56], [bx, seatY - 0.025, bz], stoneMat);
    }

    // ---- the stick against the bench, and the paper on the free end
    if (a.stick) {
      const cane = s.material(pick(['#4a3320', '#2a2320', '#8a6a44']), { roughness: 0.5 });
      const foot: [number, number, number] = [hips.x + 0.44, 0.01, bz + benchD / 2 + 0.22];
      const head: [number, number, number] = [hips.x + 0.37, seatY + 0.36, bz + benchD / 2 - 0.1];
      s.rod(foot, head, 0.011, cane);
      const crook = s.ring(0.038, 0.011, [head[0] - 0.038, head[1], head[2]], cane, Math.PI);
      void crook;
      s.cylinder(0.014, 0.012, 0.02, [foot[0], 0.01, foot[2]], s.material('#1a1a1c', { roughness: 0.8 }), 10);
    }
    if (a.newspaper) {
      const plain = s.material('#d2cfc6', { roughness: 0.95 });
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.022, 0.3), [plain, plain, new THREE.MeshStandardMaterial({ map: newspaperTexture(), roughness: 0.95 }), plain, plain, plain]);
      paper.position.set(bx - benchL / 2 + 0.3, seatY + 0.011, bz + 0.02);
      paper.rotation.y = 0.2;
      paper.castShadow = paper.receiveShadow = true;
      s.root.add(paper);
    }

    // Three-quarter view: the bench runs across, the hands and beads toward the camera.
    s.root.rotation.y = -0.35;
    const swing = a.gaze === 'dozing' ? 0 : mix(0.02, 0.07, mood.energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (swing) {
          loop.rotation.z = Math.sin(time * 1.4) * swing;
          loop.rotation.x = Math.sin(time * 0.9 + 1) * swing * 0.5;
        }
      },
    });
  },
});
