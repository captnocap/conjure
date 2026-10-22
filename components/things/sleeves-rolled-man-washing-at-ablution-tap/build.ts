import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { armPose, at, cuff, legPose, segmentOf, skullcap } from './pose';
import { marble } from './marble';

export default defineThing({
  questions: {
    washing: choice('What is he washing?', {
      foot: 'One bare foot raised onto the ledge under the tap, both hands rubbing it, trousers rolled to the knee.',
      forearm: 'A forearm held out under the stream, the other hand rubbing it up to the elbow.',
      face: 'Both hands cupped full of water lifted to the face, elbows out, eyes shut.',
    }),
    tap: choice('What is the tap like?', {
      brass: 'A polished brass tap with a cross handle, the fountain kind.',
      steel: 'A plain chromed steel tap with a lever, municipal and new.',
      bronze: 'Old bronze gone green, the handle worn smooth by thousands of hands.',
    }),
    cap: choice('What is on his head?', {
      none: 'Bare head, short dark hair.',
      white: 'A white crocheted prayer cap.',
      knitted: 'A knitted cap in dark wool.',
      embroidered: 'A stiff embroidered cap with a pattern of small gold stitches.',
    }),
    water: noul('Is the tap running, a thin stream falling into the drain?'),
    watch: noul('Has he set his wristwatch on the ledge beside him?'),
    clothes: choice('What is he wearing?', {
      office: 'A white shirt and dark office trousers, straight from work.',
      checked: 'A checked flannel shirt and worn work trousers.',
      polo: 'A pale blue polo shirt and grey trousers.',
      tunic: 'A long cream tunic and loose trousers.',
    }),
    age: score('How old is he?', ['A young man, quick about it', 'Middle-aged', 'Old and slow and careful']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.8, 1.66, a.age);
    const build = a.age > 0.6 ? pick(['slight', 'heavy'] as const) : pick(['average', 'average', 'heavy'] as const);
    const skinTone = pick(['#d9b08c', '#c99a78', '#b5805a', '#e3c2a4', '#9a6b4b']);
    const outfit = {
      office: { top: '#f1efe8', bottom: '#2e3038' },
      checked: { top: '#8a4a3a', bottom: '#4a4238' },
      polo: { top: '#9fb8cc', bottom: '#6d6f70' },
      tunic: { top: '#e6dcc3', bottom: '#e6dcc3' },
    }[a.clothes];
    const hairColour = new THREE.Color('#2c221c').lerp(new THREE.Color('#d6d2c8'), Math.max(0, a.age - 0.45) * 1.8);
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'down', skin: skinTone,
      hair: 'short', hairColor: hairColour, top: outfit.top, bottom: outfit.bottom, shoes: skinTone, sleeves: 'short',
    });
    s.root.add(person.root);
    const skin = s.material(skinTone, { roughness: 0.45 });
    const cloth = s.material(outfit.top, { roughness: 0.6 });
    const trouser = s.material(outfit.bottom, { roughness: 0.6 });
    const headR = H * 0.064;
    const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const { joints } = person;

    // ---- the pose: a low stool, one foot up on the ledge, bent over the washing
    const ledgeTop = 0.36 + 0.04 * H;
    const upSide = random() < 0.5 ? 'left' : 'right';
    const downSide = upSide === 'left' ? 'right' : 'left';
    legPose(person, downSide, { forward: 96, out: 10, knee: 100 });
    if (a.washing === 'foot') {
      legPose(person, upSide, { forward: 122, out: 8, knee: 66, flat: false });
      joints.ankles[upSide].rotation.x = -0.5;
      joints.spine.rotation.x = mix(0.5, 0.62, a.age);
      joints.neck.rotation.x = 0.45;
      armPose(person, upSide, { forward: 78, out: 2, bend: 48, swing: -24 });
      armPose(person, downSide, { forward: 72, out: 6, bend: 42, swing: -34 });
      // Trousers rolled to the knee on the raised leg, the other leg rolled too.
      for (const side of ['left', 'right'] as const) {
        segmentOf(joints.knees[side]).material = skin;
        cuff(joints.knees[side], limb * 1.08, trouser, 0.03);
      }
    } else if (a.washing === 'forearm') {
      legPose(person, upSide, { forward: 92, out: 14, knee: 96 });
      joints.spine.rotation.x = 0.32;
      joints.neck.rotation.x = 0.4;
      armPose(person, upSide, { forward: 84, out: 4, bend: 8, swing: 0 });
      armPose(person, downSide, { forward: 70, out: 2, bend: 58, swing: -46 });
      segmentOf(joints.knees[upSide]).material = skin;
      cuff(joints.knees[upSide], limb * 1.08, trouser, 0.03);
    } else {
      legPose(person, upSide, { forward: 94, out: 14, knee: 98 });
      joints.spine.rotation.x = 0.3;
      joints.neck.rotation.x = 0.28;
      armPose(person, 'left', { forward: 88, out: 18, bend: 128, swing: -38 });
      armPose(person, 'right', { forward: 88, out: 18, bend: 128, swing: -38 });
    }
    for (const side of ['left', 'right'] as const) cuff(joints.elbows[side], limb * 0.92, cloth, 0.025);
    person.settle();
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);

    // ---- head: hair or a cap
    if (a.cap !== 'none') {
      const capMat = { white: s.material('#f3f1ea', { roughness: 0.95 }), knitted: s.material(pick(['#3a3a40', '#4a3a2a', '#2f3b33']), { roughness: 1 }), embroidered: s.material('#e9dcb6', { roughness: 0.8 }), none: cloth }[a.cap];
      skullcap(person.head, headR, capMat, a.cap === 'embroidered' ? { band: s.material('#c9a24a', { metalness: 0.6, roughness: 0.4 }), tall: 1.15 } : {});
    }

    // ---- the marble: stool, ledge and the tap wall
    const stone = s.material('#ffffff', { map: marble(random, pick(['#e4e1d9', '#dcd9d2', '#e8e3d6']), '#c9c6be'), roughness: 0.55 });
    const seat = Math.max(0.2, person.hipHeight - 0.045 * H);
    s.cylinder(0.15 * H / 1.7, 0.17 * H / 1.7, seat, [hips.x, seat / 2, hips.z + 0.01], stone, 24);
    s.cylinder(0.165 * H / 1.7, 0.165 * H / 1.7, 0.02, [hips.x, seat - 0.01, hips.z + 0.01], stone, 24);
    const footUp = at(joints.ankles[upSide]);
    const ledgeZ = a.washing === 'foot' ? footUp.z + 0.02 : hips.z + 0.62 * H / 1.7;
    const ledgeW = 0.95, ledgeD = 0.4;
    const top = a.washing === 'foot' ? new THREE.Box3().setFromObject(segmentOf(joints.ankles[upSide])).min.y - 0.005 : ledgeTop;
    s.box([ledgeW, top, ledgeD], [0, top / 2, ledgeZ + ledgeD / 2 - 0.12], stone);
    s.box([ledgeW + 0.04, 0.035, ledgeD + 0.04], [0, top + 0.0175, ledgeZ + ledgeD / 2 - 0.12], stone);
    // A narrow marble pier carries the tap, so the man and the water stay in view from every side.
    const wallZ = ledgeZ + ledgeD - 0.12;
    const wallH = top + 0.62;
    const pierW = 0.46;
    s.box([pierW, wallH, 0.16], [0, wallH / 2, wallZ + 0.08], stone);
    s.box([pierW + 0.08, 0.06, 0.24], [0, wallH + 0.03, wallZ + 0.08], stone);
    s.box([pierW + 0.06, 0.05, 0.22], [0, top + 0.06, wallZ + 0.08], stone);
    // A shallow pointed-arch panel carved into the pier, the fountain's decoration.
    const panel = s.material('#d4d0c6', { roughness: 0.7 });
    s.box([0.3, 0.3, 0.02], [0, top + 0.26, wallZ - 0.005], panel);
    const point = s.mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 3), panel, [0, top + 0.46, wallZ - 0.005]);
    point.rotation.x = Math.PI / 2;
    point.rotation.z = Math.PI;
    point.scale.set(0.72, 1, 0.55);
    // The drain channel along the foot of the ledge.
    s.box([ledgeW, 0.03, 0.14], [0, 0.015, ledgeZ - 0.14], s.material('#8d8a82', { roughness: 0.9 }));
    s.box([ledgeW - 0.06, 0.02, 0.07], [0, 0.021, ledgeZ - 0.14], s.material('#3c3a36', { roughness: 0.9 }));

    // ---- the tap
    const metal = {
      brass: s.material('#c9a44a', { metalness: 0.85, roughness: 0.28 }),
      steel: s.material('#d8dcdf', { metalness: 0.9, roughness: 0.22 }),
      bronze: s.material('#6f8a72', { metalness: 0.5, roughness: 0.55 }),
    }[a.tap];
    const spoutX = a.washing === 'foot' ? footUp.x + (upSide === 'left' ? -0.14 : 0.14) : at(person.hands[upSide]).x + (a.washing === 'forearm' ? 0 : 0.05);
    const tapY = top + 0.3;
    s.cylinder(0.05, 0.05, 0.02, [spoutX, tapY, wallZ - 0.01], metal, 16);
    s.rod([spoutX, tapY, wallZ], [spoutX, tapY, wallZ - 0.12], 0.016, metal);
    s.rod([spoutX, tapY, wallZ - 0.12], [spoutX, tapY - 0.07, wallZ - 0.15], 0.015, metal, 0.012);
    const spout = new THREE.Vector3(spoutX, tapY - 0.075, wallZ - 0.15);
    if (a.tap === 'steel') {
      s.rod([spoutX, tapY + 0.01, wallZ - 0.05], [spoutX, tapY + 0.07, wallZ - 0.12], 0.008, metal);
      s.box([0.03, 0.012, 0.07], [spoutX, tapY + 0.07, wallZ - 0.13], metal);
    } else {
      s.rod([spoutX, tapY + 0.01, wallZ - 0.05], [spoutX, tapY + 0.05, wallZ - 0.05], 0.009, metal);
      s.box([0.075, 0.012, 0.012], [spoutX, tapY + 0.055, wallZ - 0.05], metal);
      s.box([0.012, 0.012, 0.075], [spoutX, tapY + 0.055, wallZ - 0.05], metal);
    }
    // The drain under the spout, cut into the ledge.
    s.cylinder(0.035, 0.035, 0.004, [spoutX, top + 0.037, wallZ - 0.15], s.material('#3c3a36', { roughness: 0.9 }), 16);

    // ---- the water
    let stream: THREE.Mesh | null = null, splash: THREE.Mesh | null = null;
    if (a.water) {
      const water = new THREE.MeshPhysicalMaterial({ color: '#dff2fb', transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false, emissive: '#bfe3f4', emissiveIntensity: 0.1 });
      const fall = spout.y - (top + 0.04);
      stream = s.cylinder(0.006, 0.009, fall, [spout.x, spout.y - fall / 2, spout.z], water, 8);
      splash = s.cylinder(0.05, 0.05, 0.006, [spout.x, top + 0.041, spout.z], water, 18);
      // Wet marble: a darker patch around the drain and down the ledge front.
      s.box([0.32, 0.002, 0.2], [spout.x, top + 0.0365, spout.z + 0.02], new THREE.MeshStandardMaterial({ color: '#9a9890', transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.2 }));
    }

    // ---- sandals and the watch
    const sandalSide = upSide === 'left' ? 1 : -1;
    const leather = s.material(pick(['#5a3a22', '#2a2320', '#8a6a4a']), { roughness: 0.6 });
    for (const [i, dx] of [0, 1].entries()) {
      const sx = hips.x + sandalSide * (0.3 + i * 0.13) + (random() - 0.5) * 0.03, sz = hips.z + 0.15 + dx * 0.04 + (random() - 0.5) * 0.06;
      const sole = s.ball([0.052, 0.012, 0.13], [sx, 0.012, sz], leather, 12);
      sole.rotation.y = sandalSide * 0.3 + (random() - 0.5) * 0.4;
      const strap = s.ring(0.045, 0.008, [sx, 0.03, sz + 0.02], leather, Math.PI);
      strap.rotation.y = sole.rotation.y;
      strap.rotation.z = 0;
      strap.rotation.x = 0;
      strap.rotation.set(0, sole.rotation.y + Math.PI / 2, 0);
    }
    if (a.watch) {
      const wx = spoutX + (upSide === 'left' ? 0.28 : -0.28), wz = wallZ - 0.2;
      const steel = s.material('#cfd3d6', { metalness: 0.85, roughness: 0.3 });
      s.cylinder(0.019, 0.019, 0.008, [wx, top + 0.039, wz], steel, 16);
      s.cylinder(0.015, 0.015, 0.002, [wx, top + 0.044, wz], s.material('#f1ede2', { roughness: 0.4 }), 16);
      const band = s.ring(0.034, 0.006, [wx, top + 0.04, wz], leather, Math.PI * 1.6);
      band.rotation.x = Math.PI / 2;
    }

    // Turn the whole scene so the ledge stands to his left-front and he is seen in three-quarter profile.
    s.root.rotation.y = -Math.PI * 0.4;
    const flow = mix(0.4, 1.6, mood.energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (stream) stream.scale.x = stream.scale.z = 1 + Math.sin(time * 9 * flow) * 0.18;
        if (splash) splash.scale.setScalar(1 + Math.sin(time * 6 * flow + 1) * 0.12);
      },
    });
  },
});
