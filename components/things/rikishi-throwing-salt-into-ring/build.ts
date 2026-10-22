import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { BELTS, BELT_COLOUR, type P, at, belly, hairdo, mawashi, pickSkin, rig, sheen, sizes } from './pose';

export default defineThing({
  questions: {
    arc: score('How far has the salt travelled?', ['Just leaving the fingers, a white burst at the hand', 'Mid-air, an arc hanging over the ring edge', 'Spent: the grains are falling and pattering onto the clay']),
    throw: choice('What kind of throw is it?', {
      pinch: 'A modest pinch tossed low and quick, eyes on the opponent.',
      handful: 'A full handful swept out at shoulder height.',
      fistful: 'A showman\'s great fistful flung high toward the roof, the crowd\'s favourite.',
    }),
    stance: choice('How does he stand?', {
      narrow: 'Feet together, upright, almost formal.',
      square: 'Feet at shoulder width, knees soft.',
      wide: 'A wide low stance, thighs spread, settled into the clay.',
    }),
    belt: choice('What colour is his mawashi?', BELTS),
    hair: choice('What is his hair like?', {
      oicho: 'The formal ginkgo-leaf fan topknot of a ranked man.',
      chonmage: 'A plain oiled topknot folded over the crown.',
      cropped: 'Cropped short: a newcomer imitating the gesture.',
    }),
    stand: choice('What holds the salt at his feet?', {
      lacquer: 'A shallow wooden dish on a black lacquered stand.',
      red: 'A dish on a vermilion lacquered stand, shrine-like.',
      cedar: 'A plain pale cedar box of salt on a low plank.',
      ground: 'A dish set straight on a folded cloth on the floor.',
    }),
    towel: noul('Is a folded towel tucked into the belt at his hip?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.82, 1.92, random());
    const skin = pickSkin(random);
    const person = figure(s, {
      height: H, build: 'heavy', style: 'doll', hair: 'short', hairColor: '#1a1512', skin, top: skin, bottom: skin, shoes: skin, sleeves: 'short', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    belly(person, H, s.material(skin, { roughness: 0.45 }));
    mawashi(s, person, H, 'heavy', BELT_COLOUR[a.belt]);
    hairdo(s, person, H, a.hair);
    if (mood.energy > 0.5) sheen(s, person, skin, 0.3);
    const { limb, hipW, pelvisL } = sizes(H, 'heavy');

    // ---- the stance, the hip hand and the throwing arm
    const pose = rig(person);
    const spread = { narrow: 4, square: 14, wide: 30 }[a.stance];
    const knee = { narrow: 2, square: 12, wide: 32 }[a.stance];
    for (const side of ['left', 'right'] as const) pose.leg(side, { forward: knee * 0.55, out: spread, knee, foot: 'flat' });
    pose.lean(a.stance === 'wide' ? 6 : 2, 0);
    const high = { pinch: 0, handful: 0.5, fistful: 1 }[a.throw];
    // The body opens toward the throw: a twist to the right and a touch of lean back when it is flung high.
    pose.bow(-2 - high * 6, 2, -14 - high * 8);
    pose.look(-2 - high * 10, -14);
    pose.arm('left', { forward: -10, out: 40, bend: 96, across: 58 });
    // Right arm swept out to the side and forward, rising with the throw, elbow nearly straight.
    pose.arm('right', { forward: 28 + high * 10, out: 62 + high * 42, bend: 24 - high * 10, across: -8 });
    person.settle();
    person.root.updateMatrixWorld(true);

    // The open hand: a flat palm and five spread fingers on the throwing hand.
    const hand = person.hands.right;
    const flesh = s.material(skin, { roughness: mood.energy > 0.5 ? 0.3 : 0.45 });
    const palm = new THREE.Mesh(new THREE.BoxGeometry(limb * 1.6, limb * 0.5, limb * 1.5), flesh);
    palm.position.set(0, -limb * 0.2, 0);
    palm.castShadow = true;
    hand.add(palm);
    for (let i = 0; i < 5; i++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(limb * 0.17, limb * (i === 0 ? 0.6 : 0.9), 2, 6), flesh);
      const spreadAngle = (i - 2) * 0.28;
      finger.position.set(Math.sin(spreadAngle) * limb * 0.9 + (i === 0 ? limb * 0.4 : 0), -limb * 0.5 - Math.cos(spreadAngle) * limb * 0.55, 0);
      finger.rotation.z = -spreadAngle;
      finger.castShadow = true;
      hand.add(finger);
    }

    // ---- the salt: an arc of grains leaving the hand, further along the throw the more time has passed
    const origin = at(s, person.hands.right).add(new THREE.Vector3(-limb * 0.6, -limb * 0.8, 0));
    const grains = { pinch: 34, handful: 70, fistful: 120 }[a.throw];
    const speed = { pinch: 2.4, handful: 3.4, fistful: 4.6 }[a.throw];
    const launch = new THREE.Vector3(-0.55, 0.45 + high * 0.55, 0.7).normalize();
    const T = 0.06 + a.arc * (0.42 + high * 0.3);
    const points: { at: P; size: number }[] = [];
    for (let i = 0; i < grains; i++) {
      const t = T * (0.15 + random() * 0.85) * (a.arc < 0.1 ? random() : 1);
      const v = launch.clone().add(new THREE.Vector3((random() - 0.5) * 0.3, (random() - 0.5) * 0.35, (random() - 0.5) * 0.3)).multiplyScalar(speed * (0.7 + random() * 0.5));
      const p = origin.clone().addScaledVector(v, t);
      p.y -= 4.9 * t * t;
      if (p.y < 0.008) { p.y = 0.006; }
      points.push({ at: p.toArray() as P, size: 0.011 + random() * 0.012 });
    }
    const salt = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: '#fff7e8', emissiveIntensity: 0.25 });
    s.scatter(new THREE.SphereGeometry(1, 6, 4), salt, points);
    // Where the throw has landed, a pale dusting on the floor along the arc's reach.
    if (a.arc > 0.55) {
      // A sprinkle of grains already on the clay where the throw has come down, not a solid patch.
      const reach = speed * T * 0.9;
      const along = new THREE.Vector3(launch.x, 0, launch.z).normalize();
      const across = new THREE.Vector3(-along.z, 0, along.x);
      const spot = origin.clone().addScaledVector(along, reach * 0.8);
      const fallen = s.scatter(new THREE.SphereGeometry(1, 5, 4), salt, Array.from({ length: 24 + Math.round(high * 30) }, () => {
        const u = (random() + random() - 1) * (0.35 + high * 0.3), v = (random() + random() - 1) * (0.14 + high * 0.08);
        const p = spot.clone().addScaledVector(along, u).addScaledVector(across, v);
        return { at: [p.x, 0.005, p.z] as P, size: 0.009 + random() * 0.01 };
      }));
      fallen.scale.y = 0.5;
    }

    // ---- the salt dish at his feet, to his right and a little forward
    const dishAt: P = [-0.6 - (a.stance === 'wide' ? 0.12 : 0), 0, 0.28];
    const saltMat = s.material('#f6f4ee', { roughness: 0.95 });
    const dishWood = s.material('#c9ad7a', { roughness: 0.75 });
    const dish = (x: number, y: number, z: number, r: number) => {
      s.lathe([[0, 0], [r * 0.7, 0], [r * 0.95, 0.03], [r, 0.055], [r * 0.9, 0.055], [r * 0.85, 0.015], [0, 0.015]], dishWood, [x, y, z]);
      const heap = s.ball([r * 0.72, 0.045, r * 0.72], [x, y + 0.03, z], saltMat, 12);
      void heap;
    };
    if (a.stand === 'lacquer' || a.stand === 'red') {
      const lacquer = s.material(a.stand === 'red' ? '#a8321e' : '#1a1818', { roughness: 0.22 });
      s.lathe([[0, 0], [0.17, 0], [0.17, 0.02], [0.07, 0.03], [0.045, 0.08], [0.045, 0.3], [0.07, 0.34], [0.18, 0.36], [0.18, 0.375], [0, 0.375]], lacquer, dishAt);
      dish(dishAt[0], 0.375, dishAt[2], 0.15);
    } else if (a.stand === 'cedar') {
      s.box([0.5, 0.05, 0.36], [dishAt[0], 0.025, dishAt[2]], s.material('#d6bb8e', { roughness: 0.8 }));
      const box = s.box([0.3, 0.16, 0.3], [dishAt[0], 0.13, dishAt[2]], s.material('#e3cfa4', { roughness: 0.75 }));
      void box;
      s.box([0.26, 0.012, 0.26], [dishAt[0], 0.21, dishAt[2]], s.material('#4a3a2a'));
      s.ball([0.11, 0.045, 0.11], [dishAt[0], 0.215, dishAt[2]], saltMat, 12);
    } else {
      const cloth = s.box([0.42, 0.02, 0.38], [dishAt[0], 0.01, dishAt[2]], s.material('#3a3f6a', { roughness: 0.95 }));
      cloth.rotation.y = (random() - 0.5) * 0.4;
      dish(dishAt[0], 0.02, dishAt[2], 0.16);
    }

    // ---- a towel folded over the belt at the left hip
    if (a.towel) {
      // A folded towel hangs from the belt at the left hip, long enough to read: down to mid-thigh.
      const cloth = s.material('#f1ede4', { roughness: 0.95 });
      const fold = new THREE.Mesh(new THREE.BoxGeometry(hipW * 0.75, pelvisL * 4.2, limb * 0.55), cloth);
      fold.position.set(hipW * 1.35, -pelvisL * 1.9, limb * 0.1);
      fold.rotation.set(0.08, 0, 0.1);
      fold.castShadow = true;
      const lip = new THREE.Mesh(new THREE.BoxGeometry(hipW * 0.8, pelvisL * 0.9, limb * 1.3), cloth);
      lip.position.set(hipW * 1.35, pelvisL * 0.25, limb * 0.1);
      lip.castShadow = true;
      person.pelvis.add(fold, lip);
    }

    // Clay on the soles when the hall has been worked in.
    if (mood.wear > 0.35) {
      const dust = s.material('#cfc3a8', { roughness: 1 });
      for (const side of ['left', 'right'] as const) {
        const smear = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), dust);
        smear.scale.set(limb * 1.0, limb * 0.3, limb * 1.6);
        smear.position.set(0, -H * 0.03 - limb * 0.55, limb * 1.1);
        person.joints.ankles[side].add(smear);
      }
    }

    const energy = mood.energy;
    const restOut = person.joints.shoulders.right.rotation.z;
    const phase = random() * 6.28;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        person.joints.shoulders.right.rotation.z = restOut + Math.sin(time * mix(1.5, 4, energy) + phase) * 0.02 * (0.3 + energy);
      },
    });
  },
});
