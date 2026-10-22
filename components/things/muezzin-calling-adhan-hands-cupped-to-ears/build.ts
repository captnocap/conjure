import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { armPose, at, beard, legPose, skullcap } from './pose';

export default defineThing({
  questions: {
    coat: choice('What does he wear?', {
      black: 'A long black coat buttoned to the collar over dark trousers.',
      navy: 'A long navy coat with a white shirt collar showing.',
      brown: 'A plain brown wool robe, old and much worn.',
      grey: 'A grey overcoat with a scarf tucked in against the cold.',
      white: 'A white wide-sleeved robe, luminous in the light.',
    }),
    cap: choice('What is on his head?', {
      white: 'A plain white crocheted cap.',
      embroidered: 'A stiff white cap with a band of gold embroidery.',
      turban: 'A white turban wound round a red cap, the imam kind.',
      none: 'Bare: short grey hair.',
    }),
    beard: noul('Does he have a short beard?'),
    facing: choice('Where does he send the call?', {
      courtyard: 'Head level, calling out across the courtyard and the roofs below.',
      sky: 'Head tipped right back, calling straight up into the sky.',
    }),
    microphone: noul('Is there a microphone on a stand before him, wired to the loudspeakers?'),
    stand: choice('Where does he stand?', {
      ground: 'On the bare ground, nothing round him.',
      step: 'On a low stone step, raised a hand above the crowd.',
      balcony: 'At a stone balcony rail with turned balusters, the minaret kind.',
      parapet: 'Behind a low rooftop parapet, the city beyond it.',
    }),
    age: score('How old is he?', ['A young man, straight-backed', 'Middle-aged', 'Old, grey and a little stooped']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.8, 1.68, a.age);
    const build = a.age > 0.7 ? 'slight' : pick(['average', 'average', 'heavy'] as const);
    const skinTone = pick(['#d9b08c', '#c99a78', '#b5805a', '#e3c2a4', '#9a6b4b']);
    const coatColour = { black: '#1d1c20', navy: '#243352', brown: '#5a4330', grey: '#6b6d70', white: '#f1efe6' }[a.coat];
    const trouserColour = a.coat === 'white' ? '#e9e5d8' : a.coat === 'brown' ? '#4a3828' : '#24252a';
    const hairColour = new THREE.Color('#2a211b').lerp(new THREE.Color('#d8d4cc'), Math.max(0, a.age - 0.35) * 1.5);
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'standing', gaze: 'ahead', skin: skinTone,
      hair: 'short', hairColor: hairColour, top: coatColour, bottom: trouserColour, shoes: '#1c1a19', sleeves: 'long',
    });
    s.root.add(person.root);
    const { joints } = person;
    const headR = H * 0.064;
    const hipW = H * 0.075 * { slight: 0.85, average: 1, heavy: 1.3 }[build];

    // ---- the pose: feet together, elbows out, palms cupped behind the ears, head back
    legPose(person, 'left', { forward: 0, out: 1, knee: 0 });
    legPose(person, 'right', { forward: 0, out: 1, knee: 0 });
    for (const side of ['left', 'right'] as const) armPose(person, side, { forward: 4, out: 118, bend: 127, swing: 82 });
    const stoop = a.age * 0.14;
    joints.spine.rotation.x = -0.08 + stoop;
    joints.neck.rotation.x = (a.facing === 'sky' ? -0.62 : -0.22) - stoop * 0.5;
    person.settle();
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);

    // ---- the long coat: a skirt from the hips to the shin, a collar and a row of buttons
    const coat = s.material(coatColour, { roughness: 0.75 });
    const skirtTop = hips.y - 0.02, skirtBottom = a.coat === 'white' || a.coat === 'brown' ? 0.12 : 0.42;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(hipW * 1.16, hipW * 1.1 + 0.07, skirtTop - skirtBottom, 20, 1, true), coat);
    skirt.position.set(0, (skirtTop + skirtBottom) / 2 - hips.y, 0);
    skirt.castShadow = true;
    skirt.material = coat.clone();
    (skirt.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    person.pelvis.add(skirt);
    const torsoL = H * 0.28;
    const front = H * 0.036 * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.004;
    const buttons = s.material(a.coat === 'white' ? '#d8d2c0' : '#c9b26a', { metalness: 0.5, roughness: 0.4 });
    for (let i = 0; i < 5; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), buttons);
      button.position.set(0, torsoL * 0.12 + i * torsoL * 0.17, front);
      joints.spine.add(button);
    }
    const collar = new THREE.Mesh(new THREE.TorusGeometry(H * 0.036 * 1.05, 0.012, 6, 20), a.coat === 'navy' ? s.material('#f3f1ea', { roughness: 0.8 }) : coat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = torsoL + 0.004;
    joints.spine.add(collar);
    if (a.coat === 'grey') {
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(H * 0.036 * 1.25, 0.022, 8, 20), s.material(pick(['#7a2b2b', '#2b4a3a', '#b89a5a']), { roughness: 1 }));
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = torsoL - 0.02;
      joints.spine.add(scarf);
    }

    // ---- head: cap, turban, beard
    const white = s.material('#f3f1ea', { roughness: 0.95 });
    if (a.cap === 'white') skullcap(person.head, headR, white);
    if (a.cap === 'embroidered') skullcap(person.head, headR, white, { band: s.material('#c9a24a', { metalness: 0.6, roughness: 0.4 }), tall: 1.2 });
    if (a.cap === 'turban') {
      skullcap(person.head, headR, s.material('#8e2a2a', { roughness: 0.8 }), { tall: 1.3 });
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.98, headR * 0.34, 10, 24), white);
      wrap.rotation.x = Math.PI / 2;
      wrap.position.y = headR * 0.42;
      wrap.castShadow = true;
      person.head.add(wrap);
    }
    if (a.beard) beard(person.head, headR, s.material(`#${hairColour.getHexString()}`, { roughness: 0.95 }), 1.1);

    // ---- where he stands
    const stone = s.material(pick(['#cfcabd', '#bdb8aa', '#d9d2c2']), { roughness: 0.85 });
    if (a.stand === 'step') {
      s.box([0.9, 0.16, 0.7], [hips.x, 0.08, hips.z], stone);
      person.root.position.y += 0.16;
    }
    if (a.stand === 'balcony') {
      const railZ = hips.z + 0.36;
      s.box([1.3, 0.12, 0.16], [hips.x, 0.06, railZ], stone);
      s.box([1.3, 0.08, 0.16], [hips.x, 0.98, railZ], stone);
      const baluster = new THREE.LatheGeometry([[0.03, 0], [0.045, 0.03], [0.025, 0.1], [0.04, 0.3], [0.03, 0.42], [0.045, 0.55], [0.05, 0.62], [0.045, 0.72], [0.03, 0.8], [0.045, 0.82]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
      s.scatter(baluster, stone, Array.from({ length: 7 }, (_u, i) => ({ at: [hips.x - 0.6 + i * 0.2, 0.12, railZ] as const, size: 1 })));
      for (const x of [-0.65, 0.65]) s.box([0.1, 1.0, 0.18], [hips.x + x, 0.5, railZ], stone);
    }
    if (a.stand === 'parapet') {
      const wallZ = hips.z + 0.4;
      s.box([1.6, 0.46, 0.22], [hips.x, 0.23, wallZ], s.material(pick(['#c9b89a', '#b8a98c', '#d2c6ad']), { roughness: 0.95 }));
      s.box([1.66, 0.05, 0.28], [hips.x, 0.485, wallZ], stone);
    }

    // ---- the microphone on its stand
    if (a.microphone) {
      const chrome = s.material('#c7cccf', { metalness: 0.9, roughness: 0.25 });
      const mouth = person.head.localToWorld(new THREE.Vector3(0, -headR * 0.3, headR * 0.95));
      person.root.updateMatrixWorld(true);
      const mx = hips.x + 0.05, mz = hips.z + 0.42;
      const floorY = a.stand === 'step' ? 0.16 : 0;
      s.cylinder(0.14, 0.15, 0.02, [mx, floorY + 0.01, mz], s.material('#2a2a2c', { roughness: 0.6 }), 20);
      const poleTop = mouth.y - 0.22;
      s.rod([mx, floorY + 0.02, mz], [mx, poleTop, mz], 0.009, chrome);
      s.cylinder(0.014, 0.014, 0.04, [mx, poleTop, mz], chrome, 10);
      const micAt = new THREE.Vector3(mouth.x, mouth.y - 0.02, mouth.z + 0.1);
      s.rod([mx, poleTop, mz], [micAt.x, micAt.y, micAt.z], 0.007, chrome);
      const mic = s.cylinder(0.018, 0.016, 0.07, [micAt.x, micAt.y + 0.02, micAt.z - 0.02], s.material('#1f1f22', { roughness: 0.5 }), 12);
      mic.lookAt(mouth);
      mic.rotateX(Math.PI / 2);
      s.ball([0.024, 0.024, 0.024], [micAt.x, micAt.y + 0.05, micAt.z - 0.05], s.material('#4a4d52', { metalness: 0.4, roughness: 0.7 }), 10);
      // The cable trails off along the ground.
      s.tube([[mx, floorY + 0.015, mz + 0.05], [mx + 0.25, floorY + 0.01, mz + 0.2], [mx + 0.5, floorY + 0.01, mz + 0.15]], 0.005, s.material('#1a1a1c', { roughness: 0.6 }));
    }

    const breath = mix(0.3, 1, mood.energy);
    let rest = joints.neck.rotation.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        // The call rises and falls: the head lifts a little on each phrase.
        joints.neck.rotation.x = rest - Math.max(0, Math.sin(time * 0.9 * breath)) * 0.06;
      },
    });
  },
});
