import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { at, ground, joints, poseArm, poseLeg } from './pose';

const WAISTCOAT_COLOUR = { tweed: '#6b4f33', black: '#1f1d20', green: '#2b4a38', pinstripe: '#55565c' } as const;

export default defineThing({
  questions: {
    doing: choice('What is he doing with the pipe?', {
      smoking: 'Drawing on it, eyes half closed, saying nothing.',
      pointing: 'Pointing the stem at someone across the room, mid-story.',
      resting: 'Holding it in his lap, unlit, waiting his turn.',
    }),
    lit: noul('Is the pipe lit, with a wisp of smoke rising?'),
    beside: choice('What sits on the floor beside him?', {
      snuff: 'A saucer of snuff.',
      stout: 'A glass of stout with a cream head.',
      stick: 'A blackthorn walking stick leaning on his knee.',
      everything: 'Snuff, stout and the stick, settled in for the night.',
      nothing: 'Nothing; the bare floor.',
    }),
    posture: choice('How does he sit?', {
      upright: 'Sitting straight, one hand flat on his knee.',
      back: 'Leaning back against a bit of whitewashed wall, legs stretched out.',
      forward: 'Hunched forward, elbows on his knees, cap pulled down.',
    }),
    head: choice('What is on his head?', {
      cap: 'A flat tweed cap.',
      bare: 'Bare: bald on top, a fringe of white at the sides.',
      hat: 'A battered felt hat with the brim turned down.',
    }),
    waistcoat: choice('What waistcoat does he wear?', {
      tweed: 'Brown tweed, worn shiny at the pockets.',
      black: 'Black, the funeral one.',
      green: 'Bottle green with brass buttons.',
      pinstripe: 'Grey pinstripe from a suit that no longer matches.',
    }),
    dog: noul('Does a sheepdog lie at his feet?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.62, 1.74, random());
    const build = random() < 0.4 ? 'heavy' : random() < 0.5 ? 'slight' : 'average';
    const shirt = pick(['#d9d4c4', '#b9c4cc', '#c9c2b0', '#aab3b8', '#cfc6ad']);
    const trousers = pick(['#3a3530', '#4a4238', '#2d2f33']);
    const skin = pick(['#e3c2a4', '#d9b08c', '#c99a78', '#e8c9ad']);
    const rolled = random() < 0.4;
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: a.posture === 'forward' ? 'down' : 'ahead', skin,
      hair: a.head === 'cap' ? 'cap' : a.head === 'hat' ? 'hat' : 'none',
      hairColor: a.head === 'cap' ? pick(['#5a4a38', '#3f3a33', '#6b6456']) : '#3a332c',
      top: shirt, bottom: trousers, shoes: '#2a211b', sleeves: rolled ? 'short' : 'long',
    });
    s.root.add(person.root);
    const side = random() < 0.5 ? 'right' : 'left';
    const other = side === 'right' ? 'left' : 'right';
    const { spine, neck } = joints(person, 'left');
    const headR = H * 0.064;
    const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const torsoL = H * 0.28;

    // Posture: the spine and the free hand.
    if (a.posture === 'back') {
      spine.rotation.x = 0.22;
      neck.rotation.x = -0.12;
      poseLeg(person, 'left', { forward: 75, knee: 55, out: 3 });
      poseLeg(person, 'right', { forward: 72, knee: 50, out: -2 });
      poseArm(person, other, { forward: 30, out: 6, bend: 30, inward: 5 });
    } else if (a.posture === 'forward') {
      spine.rotation.x = -0.85;
      neck.rotation.x = -0.25;
      poseArm(person, other, { forward: 85, out: 5, bend: 40, inward: 25 });
    } else {
      poseArm(person, other, { forward: 40, out: 4, bend: 40, inward: 6 });
    }
    // The pipe hand: to the mouth, held out across the room, or down in the lap.
    const pipeArm = { smoking: { forward: 60, out: 8, bend: 128, inward: 32 }, pointing: { forward: 70, out: 10, bend: 25, inward: 20 }, resting: { forward: 35, bend: 55, inward: 40 } }[a.doing];
    poseArm(person, side, a.posture === 'forward' && a.doing === 'smoking' ? { ...pipeArm, forward: 100, bend: 120 } : pipeArm);
    ground(person);
    const hips = at(person.pelvis);
    const hand = at(person.hands[side]);
    const mouth = person.head.localToWorld(new THREE.Vector3(0, -headR * 0.25, headR * 0.95));

    // ---- bald head, fringe and the hair under a hat
    if (a.head === 'bare') {
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 16, 8, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.25), s.material('#d9d4cc', { roughness: 0.9, side: THREE.DoubleSide }));
      fringe.position.y = headR * 0.1;
      person.head.add(fringe);
    }

    // ---- waistcoat over the shirt, buttons, collar stud and a watch chain
    const coat = s.material(WAISTCOAT_COLOUR[a.waistcoat], { roughness: 0.85 });
    const torso = spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh;
    const vest = new THREE.Mesh(new THREE.CapsuleGeometry(limb * 1.42 * (build === 'heavy' ? 1.25 : 1), torsoL * 0.98 - limb * 2.6, 4, 14), coat);
    vest.position.y = torsoL * 0.44;
    vest.scale.x = torso.scale.x * 1.02;
    vest.castShadow = true;
    spine.add(vest);
    const brass = s.material('#c2a35a', { metalness: 0.75, roughness: 0.3 });
    const front = limb * 1.42 * (build === 'heavy' ? 1.25 : 1) + 0.004;
    for (let i = 0; i < 4; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), a.waistcoat === 'green' ? brass : s.material('#2a2320'));
      button.position.set(0, torsoL * 0.2 + i * torsoL * 0.11, front);
      spine.add(button);
    }
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.0025, 6, 16, Math.PI), brass);
    chain.position.set(-0.03, torsoL * 0.38, front);
    chain.rotation.z = Math.PI;
    spine.add(chain);
    const stud = new THREE.Mesh(new THREE.TorusGeometry(limb * 0.95, 0.006, 6, 16), s.material('#f1ebdd'));
    stud.rotation.x = Math.PI / 2;
    stud.position.y = torsoL + 0.005;
    spine.add(stud);

    // ---- the three-legged stool
    const wood = s.material(pick(['#6b4a2e', '#4e3a28', '#7d6243']), { roughness: 0.7 });
    const seatTop = hips.y - 0.05 * H;
    const stoolAt = new THREE.Vector3(hips.x, 0, hips.z + 0.01);
    s.cylinder(0.17, 0.16, 0.035, [stoolAt.x, seatTop - 0.0175, stoolAt.z], wood, 18);
    for (let i = 0; i < 3; i++) {
      const angle = i * (Math.PI * 2 / 3) + Math.PI / 6;
      s.rod([stoolAt.x + Math.sin(angle) * 0.2, 0.01, stoolAt.z + Math.cos(angle) * 0.2], [stoolAt.x + Math.sin(angle) * 0.1, seatTop - 0.03, stoolAt.z + Math.cos(angle) * 0.1], 0.016, wood, 0.02);
    }

    // ---- the clay pipe, from the hand toward the mouth or out across the room
    const clay = s.material('#f6f3ea', { roughness: 0.45 });
    const stemLength = 0.3 + random() * 0.08;
    let from: THREE.Vector3, direction: THREE.Vector3;
    if (a.doing === 'smoking') {
      from = mouth;
      direction = hand.clone().sub(mouth);
      direction.y -= 0.04;
      direction.normalize();
    } else if (a.doing === 'pointing') {
      from = hand.clone().add(new THREE.Vector3(0, 0.02, -0.03));
      direction = new THREE.Vector3(side === 'right' ? 0.25 : -0.25, 0.05, 1).normalize();
    } else {
      from = hand.clone().add(new THREE.Vector3(side === 'right' ? 0.06 : -0.06, 0.01, -0.02));
      direction = new THREE.Vector3(side === 'right' ? -0.6 : 0.6, -0.15, 1).normalize();
    }
    const bowlAt = from.clone().addScaledVector(direction, stemLength);
    s.rod([from.x, from.y, from.z], [bowlAt.x, bowlAt.y, bowlAt.z], 0.009, clay, 0.006);
    s.cylinder(0.024, 0.016, 0.05, [bowlAt.x, bowlAt.y + 0.016, bowlAt.z], clay, 12);
    const smoking = a.lit && a.doing !== 'resting';
    const wisps: THREE.Mesh[] = [];
    if (smoking) {
      s.cylinder(0.018, 0.018, 0.006, [bowlAt.x, bowlAt.y + 0.04, bowlAt.z], new THREE.MeshStandardMaterial({ color: '#2a1a10', emissive: new THREE.Color().setHSL(mix(0.08, 0.03, mood.warmth), 1, 0.5), emissiveIntensity: mix(0.5, 1.4, mood.warmth) }), 10);
      const smoke = new THREE.MeshStandardMaterial({ color: '#e6e6e2', transparent: true, opacity: 0.45, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const wisp = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), smoke.clone());
        wisp.position.set(bowlAt.x, bowlAt.y + 0.05 + i * 0.045, bowlAt.z);
        wisp.scale.setScalar(0.012 + i * 0.006);
        s.root.add(wisp);
        wisps.push(wisp);
      }
    }

    // ---- on the floor beside him
    const floorSide = side === 'right' ? -1 : 1;
    const fx = hips.x + floorSide * 0.36, fz = hips.z + 0.1;
    const china = s.material('#efe9dc', { roughness: 0.4 });
    if (a.beside === 'snuff' || a.beside === 'everything') {
      s.cylinder(0.055, 0.045, 0.012, [fx, 0.006, fz + 0.12], china, 18);
      s.ball([0.03, 0.012, 0.03], [fx, 0.014, fz + 0.12], s.material('#5a3b22', { roughness: 1 }), 10);
    }
    if (a.beside === 'stout' || a.beside === 'everything') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
      s.cylinder(0.036, 0.03, 0.13, [fx, 0.065, fz - 0.06], glass, 14);
      s.cylinder(0.034, 0.029, 0.1, [fx, 0.05, fz - 0.06], s.material('#15100e', { roughness: 0.25 }), 14);
      s.cylinder(0.034, 0.034, 0.02, [fx, 0.11, fz - 0.06], s.material('#f1e6cd', { roughness: 0.8 }), 14);
    }
    if (a.beside === 'stick' || a.beside === 'everything') {
      const knee = at(joints(person, floorSide > 0 ? 'left' : 'right').knee);
      const stick = s.rod([fx + floorSide * 0.08, 0.005, fz + 0.3], [knee.x + floorSide * 0.05, knee.y + 0.12, knee.z + 0.02], 0.012, s.material('#2d2320', { roughness: 0.6 }), 0.016);
      void stick;
    }

    // ---- a wall to lean on
    if (a.posture === 'back') {
      const lime = s.material(pick(['#ece6d6', '#e3dccb', '#d8d4c4']), { roughness: 1 });
      s.box([0.85, 1.4, 0.08], [hips.x, 0.7, hips.z - 0.2 - 0.04], lime);
      s.box([0.85, 0.12, 0.02], [hips.x, 0.06, hips.z - 0.2 + 0.01], s.material('#5a4a3c', { roughness: 0.8 }));
    }

    // ---- a sheepdog asleep at his feet
    if (a.dog) {
      const dog = new THREE.Group();
      const fur = s.material(pick(['#1f1d1b', '#3a2e24', '#6b6259']), { roughness: 1 });
      const white = s.material('#e9e4d8', { roughness: 1 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 12), fur);
      body.rotation.z = Math.PI / 2;
      body.position.set(0, 0.1, 0);
      body.scale.y = 0.85;
      const bib = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), white);
      bib.position.set(0.22, 0.09, 0.0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), fur);
      head.position.set(0.3, 0.11, 0);
      head.scale.set(1.25, 0.9, 0.95);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), s.material('#111111', { roughness: 0.3 }));
      nose.position.set(0.4, 0.085, 0);
      const blaze = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), white);
      blaze.position.set(0.34, 0.13, 0);
      dog.add(body, bib, head, nose, blaze);
      for (const z of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 6), fur);
        ear.position.set(0.28, 0.17, z * 0.055);
        ear.rotation.z = 0.3;
        const paw = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.18, 3, 8), z > 0 ? white : fur);
        paw.rotation.z = Math.PI / 2;
        paw.position.set(0.28, 0.03, z * 0.07);
        dog.add(ear, paw);
      }
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.2, 3, 8), white);
      tail.rotation.z = Math.PI / 2 + 0.3;
      tail.position.set(-0.3, 0.05, 0.05);
      dog.add(tail);
      dog.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      dog.position.set(hips.x + (floorSide > 0 ? -0.28 : 0.3), 0, hips.z + 0.62);
      dog.rotation.y = (floorSide > 0 ? -1 : 1) * (0.9 + random() * 0.5);
      s.root.add(dog);
    }

    const drift = mix(0.2, 1.2, mood.energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        wisps.forEach((wisp, index) => {
          const phase = (time * drift * 0.25 + index * 0.2) % 1;
          wisp.position.y = bowlAt.y + 0.04 + phase * 0.3;
          wisp.position.x = bowlAt.x + Math.sin(time * 1.3 + index) * 0.02 * phase;
          wisp.scale.setScalar(0.014 + phase * 0.05);
          (wisp.material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - phase);
        });
      },
    });
  },
});
