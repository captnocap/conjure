import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score, visibleBounds } from '@conjure/kit';
import { HAIR_COLOURS, RAD, SCHOOL_COLOURS, at, pick, pickSkin, rig, segmentOf } from './pose';
import { type WallFinish, wall } from './wall';

const TRAINERS = { white: '#f2f0ea', black: '#1d1a18', red: '#c8322a', blue: '#2a63c8', neon: '#9ae82a', velcro: '#4a4a9a' } as const;

export default defineThing({
  questions: {
    legs: choice('What are his legs doing?', {
      both: 'Both heels resting on the wall, legs straight, the proper way.',
      kicked: 'One leg kicked out away from the wall, bent at the knee, wobbling.',
      split: 'Legs split wide against the wall, showing off.',
      bent: 'Both knees bent and the feet flat against the brick, halfway to a crab.',
    }),
    shirt: choice('What has his shirt done?', {
      slid: 'Slid right down to his chin, belly out.',
      tucked: 'Tucked in and staying put.',
      vest: 'A PE vest, so nothing to slide.',
    }),
    trainers: choice('What colour are his trainers?', {
      white: 'White trainers, scuffed at the toe.',
      black: 'Black school shoes.',
      red: 'Red trainers.',
      blue: 'Blue trainers.',
      neon: 'Neon green trainers with flashing heels.',
      velcro: 'Purple velcro trainers.',
    }),
    company: choice('Who is with him?', {
      none: 'Nobody: a handstand for its own sake.',
      watching: 'A friend standing by with arms folded, unimpressed.',
      counting: 'A friend crouched beside him counting on their fingers.',
      fallen: 'A friend flat on their back on the ground, having just fallen out of their own.',
    }),
    jumper: noul('Is there a crumpled jumper on the ground where he took it off?'),
    finish: choice('What is the wall?', {
      brick: 'Victorian red brick with a stone coping.',
      painted: 'Brick painted cream, chipped at the corners.',
      block: 'Grey breeze block, a sports hall or a yard.',
      fence: 'A close-boarded garden fence.',
    }),
    age: score('How old is he?', ['Six and small', 'Seven', 'Nine', 'Eleven and lanky']),
    school: choice('What colour is his top?', {
      navy: 'Navy blue.', maroon: 'Maroon.', green: 'Bottle green.', grey: 'Grey.', red: 'Bright red.', royal: 'Royal blue.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.05, 1.4, a.age);
    const skin = pickSkin(random);
    const shirt = SCHOOL_COLOURS[a.school];
    const shorts = pick(random, ['#2a2f3a', '#3a3a3e', '#1d2a4a', '#5a5d63']);
    const slid = a.shirt === 'slid';

    // ---- the wall, face at z = 0 looking +z; the boy is in front of it
    const wallWidth = 1.6 + random() * 0.5, wallHeight = 1.6;
    const finish: WallFinish = { brick: 'red-brick', painted: 'painted-brick', block: 'breeze-block', fence: 'fence' }[a.finish] as WallFinish;
    wall(s, {
      width: wallWidth, height: wallHeight, finish, wear: mood.wear, random, at: [0, 0, 0],
      marks(c, w, h) {
        // Trainer scuffs where heels have landed before.
        const px = w / wallWidth;
        for (let i = 0; i < 6 + mood.wear * 14; i++) { c.fillStyle = `rgba(30,25,20,${0.15 + random() * 0.25})`; c.fillRect(w * 0.3 + random() * w * 0.4, h - (1.1 + random() * 0.45) * px, 8 + random() * 16, 3 + random() * 4); }
      },
    });

    // ---- the boy: posed standing with arms overhead, then flipped about z and stood on his palms
    const person = figure(s, {
      height: H, build: a.age < 0.3 ? 'slight' : 'average', style: 'doll', skin,
      hair: 'short', hairColor: pick(random, HAIR_COLOURS),
      top: slid ? skin : shirt, bottom: shorts, shoes: TRAINERS[a.trainers], sleeves: 'short', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const pose = rig(person);
    pose.arm('left', { forward: 176, out: 8, bend: 2 });
    pose.arm('right', { forward: 176, out: 8, bend: 2 });
    // Palms flat: the wrists bend so the hands lie along the ground, fingers pointing away from the wall.
    for (const side of ['left', 'right'] as const) person.hands[side].parent!.rotation.x = -Math.PI / 2;
    if (a.legs === 'both') { pose.leg('left', { forward: -2, out: 3, knee: 0, foot: -8 }); pose.leg('right', { forward: -2, out: 3, knee: 0, foot: -8 }); }
    if (a.legs === 'kicked') { pose.leg('left', { forward: -2, out: 3, knee: 0, foot: -8 }); pose.leg('right', { forward: 38, out: 6, knee: 62, foot: 10 }); }
    if (a.legs === 'split') { pose.leg('left', { forward: -2, out: 34, knee: 0, foot: -8 }); pose.leg('right', { forward: -2, out: 34, knee: 0, foot: -8 }); }
    if (a.legs === 'bent') { pose.leg('left', { forward: 24, out: 4, knee: 70, foot: 50 }); pose.leg('right', { forward: 24, out: 4, knee: 70, foot: 50 }); }
    pose.bow(-8);
    pose.look(-38, 0, 0);
    // Upside down: hands below, feet above, still facing +z; tilted a little so the hands sit out from the wall.
    person.joints.body.rotation.set(-11 * RAD, 0, Math.PI);
    person.measure();
    if (slid || a.shirt === 'vest') {
      // The shirt proper covers only the upper arms (and, for a vest, nothing); the bunched hem hangs round the chin.
      for (const side of ['left', 'right'] as const) { const upper = segmentOf(person.joints.shoulders[side]); if (upper && slid) upper.material = s.material(shirt, { roughness: 0.6 }); }
      const bunch = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * H, 0.072 * H, 0.15 * H, 16, 1, true), s.material(shirt, { roughness: 0.7, side: THREE.DoubleSide }));
      bunch.position.set(0, (slid ? 0.285 : 0.2) * H, 0);
      bunch.castShadow = true;
      person.joints.spine.add(bunch);
      if (a.shirt === 'vest') {
        bunch.scale.set(0.8, 0.75, 0.8);
        bunch.position.y = 0.16 * H;
        const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.066 * H, 0.062 * H, 0.2 * H, 14, 1, true), s.material('#f2f0ea', { roughness: 0.8, side: THREE.DoubleSide }));
        vest.position.y = 0.14 * H;
        person.joints.spine.add(vest);
        for (const side of ['left', 'right'] as const) { const upper = segmentOf(person.joints.shoulders[side]); if (upper) upper.material = s.material(skin, { roughness: 0.45 }); }
      }
    } else {
      // Tucked in: a belt line where the shirt meets the shorts.
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.065 * H, 0.008 * H, 6, 18), s.material('#1d1a18', { roughness: 0.6 }));
      belt.rotation.x = Math.PI / 2;
      belt.position.y = 0.02 * H;
      person.joints.spine.add(belt);
    }
    // Stand him on his palms with the heels at the wall face.
    person.root.updateMatrixWorld(true);
    const bounds = visibleBounds(person.root);
    const heel = at(s, person.joints.ankles.left);
    person.root.position.y -= bounds.min.y;
    person.root.position.z += 0.045 * H - heel.z;
    if (a.legs === 'kicked' || a.legs === 'bent') person.root.position.z += 0.02 * H;
    person.root.position.x = (random() - 0.5) * 0.2;
    person.root.updateMatrixWorld(true);

    // ---- a friend
    const friends: ReturnType<typeof figure>[] = [];
    const side = random() < 0.5 ? -1 : 1;
    const friendTop = pick(random, Object.values(SCHOOL_COLOURS).filter((c) => c !== shirt));
    const makeFriend = (pose: 'arms-crossed' | 'crouching' | 'lying', x: number, z: number, yaw: number) => {
      const friend = figure(s, {
        height: H * mix(0.9, 1.05, random()), style: 'doll', skin: pickSkin(random), hair: pick(random, ['short', 'long', 'bun', 'cap'] as const), hairColor: pick(random, HAIR_COLOURS),
        top: friendTop, bottom: pick(random, ['#8a8d93', '#2a2f3a', '#3a3a3e']), shoes: pick(random, Object.values(TRAINERS)), sleeves: random() < 0.5 ? 'long' : 'short', pose, gaze: pose === 'lying' ? 'up' : 'left',
      });
      s.root.add(friend.root);
      friend.root.position.set(x, 0, z);
      friend.root.rotation.y = yaw;
      friends.push(friend);
      return friend;
    };
    if (a.company === 'watching') {
      const friend = makeFriend('arms-crossed', side * 0.85 * H, 0.35 * H, -side * 0.9);
      rig(friend).look(6, 0, 0);
    }
    if (a.company === 'counting') {
      const friend = makeFriend('crouching', side * 0.75 * H, 0.3 * H, -side * 1.1);
      const fr = rig(friend);
      fr.arm('left', { forward: 95, out: 10, bend: 110, across: 30 });
      fr.look(-4, 0, 0);
      friend.settle();
      friend.root.position.y = 0;
    }
    if (a.company === 'fallen') {
      const friend = makeFriend('lying', side * 0.9 * H, 0.5 * H, side * 0.6 + Math.PI / 2);
      friend.root.position.y = 0;
    }
    if (a.jumper) {
      const wool = s.material(friendTop, { roughness: 0.95 });
      const jx = -side * 0.55 * H + (random() - 0.5) * 0.2, jz = 0.45 * H + random() * 0.2;
      s.ball([0.2, 0.06, 0.15], [jx, 0.055, jz], wool, 12);
      s.ball([0.11, 0.045, 0.13], [jx + 0.13, 0.04, jz - 0.07], wool, 10);
      s.ball([0.07, 0.035, 0.09], [jx - 0.13, 0.03, jz + 0.05], wool, 8);
    }

    // ---- motion: the legs wobble and the handstand trembles with the energy of the scene
    const wobble = mix(0.004, 0.03, mood.energy);
    const phase = random() * Math.PI * 2;
    const baseBody = person.joints.body.rotation.z;
    const baseKnee = person.joints.knees.right.rotation.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        for (const friend of friends) friend.update(dt, time);
        person.joints.body.rotation.z = baseBody + Math.sin(time * 3.1 + phase) * wobble;
        if (a.legs === 'kicked') person.joints.knees.right.rotation.x = baseKnee + Math.sin(time * 2.2 + phase) * 0.12 * (0.3 + mood.energy);
      },
    });
  },
});
