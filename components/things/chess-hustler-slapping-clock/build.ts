import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { POSITIONS, banknote, chessClock, chessTable, coffeeCup, placePieces, pocketRadio } from './chess';
import { at, beanie, cigaretteBehindEar, handMesh, hipsAt, joints, overTorso, pick, poseArm, reachPoint, reachTo, seat, skinTones, torsoMesh, necktie } from './pose';

export default defineThing({
  questions: {
    stage: choice('What stage is the game at?', {
      opening: 'The opening: nearly every piece still on the board, a few moved out.',
      scramble: 'A time scramble: a handful of pieces left and both players rushing.',
      checkmate: 'Checkmate: the opponent\'s king lies toppled on its side.',
    }),
    moment: choice('What is he doing this instant?', {
      slap: 'Slapping the chess clock, arm out, the move already made.',
      hover: 'Hand hovering over a piece, about to move.',
      lean: 'Leaning back with his arms crossed, waiting for the opponent to lose.',
    }),
    gear: choice('What is he wearing?', {
      puffer: 'A loud puffer vest over a long-sleeved top.',
      trench: 'A belted trench coat, collar up.',
      tracksuit: 'A striped tracksuit, zipped to the neck.',
      suit: 'A three-piece suit with the waistcoat buttoned.',
    }),
    hat: choice('What is on his head?', {
      cap: 'A baseball cap, peak forward.',
      beanie: 'A knitted beanie pulled down over the ears.',
      bare: 'Nothing: close-cropped hair.',
    }),
    opponent: noul('Does an opponent sit across the table from him, hunched over the board?'),
    extras: choice('What sits on the table besides the board and the clock?', {
      coffee: 'A takeaway coffee cup, lid on.',
      radio: 'A pocket radio with its aerial up.',
      stack: 'A small stack of folded banknotes, the day\'s winnings.',
      everything: 'Coffee, the radio and a stack of notes: he has been here all day.',
      nothing: 'Only the board, the clock and one note under it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.64, 1.8, random());
    const build = random() < 0.45 ? 'heavy' : 'average';
    const skin = pick(random, skinTones);
    const loud = pick(random, ['#d8452c', '#1f3f8f', '#e0a020', '#2a2a2c', '#6b8f3a']);
    const outfit = {
      puffer: { top: pick(random, ['#3b3f46', '#5a5f66', '#2d2d33']), bottom: pick(random, ['#2e3440', '#3a3a3a', '#4a4238']), shoes: '#f0ede4' },
      trench: { top: pick(random, ['#b89a6a', '#a08860']), bottom: '#3a3a40', shoes: '#2a211b' },
      tracksuit: { top: pick(random, ['#1f4fa0', '#1c1c1e', '#8a1f2a']), bottom: pick(random, ['#1f4fa0', '#1c1c1e', '#8a1f2a']), shoes: '#f0ede4' },
      suit: { top: pick(random, ['#2a2a30', '#3a3030', '#1f2a3a']), bottom: pick(random, ['#2a2a30', '#3a3030', '#1f2a3a']), shoes: '#2a211b' },
    }[a.gear];
    if (a.gear === 'tracksuit') outfit.bottom = outfit.top;
    if (a.gear === 'suit') outfit.bottom = outfit.top;

    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', skin, sleeves: 'long',
      gaze: a.moment === 'lean' ? 'ahead' : 'down',
      hair: a.hat === 'cap' ? 'cap' : a.hat === 'bare' ? (random() < 0.5 ? 'short' : 'none') : 'short',
      hairColor: a.hat === 'cap' ? pick(random, ['#1f1f22', '#8a1f2a', '#1f3f8f', '#3a3a3a']) : pick(random, ['#1f1a18', '#3b2a22', '#4a4038']),
      ...outfit,
    });
    s.root.add(person.root);
    person.root.updateMatrixWorld(true);
    const hips0 = at(person.pelvis);
    const seatY = hips0.y - 0.045 * H;
    const limb = H * 0.036 * (build === 'heavy' ? 1.3 : 1);
    const torsoL = H * 0.28;

    // ---- the table he owns, with his bench behind him and the opponent's across
    hipsAt(person, 0, 0, 0);
    const tableZ = 0.62;
    const board = chessTable(s, { z: tableZ, kind: 'stone', seat: seatY, benches: ['far', 'near'], benchGap: 0.78 });
    const { spine, neck } = joints(person, 'left');

    // ---- gear over the figure
    if (a.gear === 'puffer') {
      const vest = overTorso(s, person, H, build, s.material(loud, { roughness: 0.55 }), { grow: 1.3, length: 0.95 });
      const quilt = s.material(new THREE.Color(loud).multiplyScalar(0.7), { roughness: 0.7 });
      for (let i = 0; i < 4; i++) {
        const seam = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.35 * 1.3 * (build === 'heavy' ? 1.25 : 1) + 0.003, 0.004, 6, 24), quilt);
        seam.rotation.x = Math.PI / 2;
        seam.position.y = torsoL * (0.2 + i * 0.18);
        seam.scale.x = vest.scale.x;
        spine.add(seam);
      }
    } else if (a.gear === 'trench') {
      const cloth = s.material(outfit.top, { roughness: 0.85 });
      const front = limb * 1.35 * 1.1 * (build === 'heavy' ? 1.25 : 1);
      for (const side of [-1, 1]) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(H * 0.028, torsoL * 0.5, 0.008), s.material(new THREE.Color(outfit.top).multiplyScalar(0.85), { roughness: 0.85 }));
        lapel.position.set(side * H * 0.03, torsoL * 0.72, front * torsoMesh(person).scale.x * 0.95);
        lapel.rotation.z = side * 0.25;
        spine.add(lapel);
      }
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.45, limb * 0.35, 6, 18, Math.PI * 1.5), cloth);
      collar.rotation.set(Math.PI / 2, 0, Math.PI * 0.75);
      collar.position.y = torsoL + limb * 0.3;
      spine.add(collar);
      const belt = new THREE.Mesh(new THREE.TorusGeometry(front * 1.05, 0.012, 6, 24), cloth);
      belt.rotation.x = Math.PI / 2;
      belt.position.y = torsoL * 0.08;
      belt.scale.x = torsoMesh(person).scale.x;
      spine.add(belt);
    } else if (a.gear === 'tracksuit') {
      const stripe = s.material('#f1efe6', { roughness: 0.8 });
      for (const side of ['left', 'right'] as const) {
        const { shoulder, elbow } = joints(person, side);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.006, H * 0.16, 0.012), stripe);
        upper.position.set((side === 'left' ? 1 : -1) * limb * 0.98, -H * 0.085, 0);
        shoulder.add(upper);
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.006, H * 0.13, 0.012), stripe);
        lower.position.set((side === 'left' ? 1 : -1) * limb * 0.88, -H * 0.075, 0);
        elbow.add(lower);
      }
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.008, torsoL * 0.9, 0.004), stripe);
      zip.position.set(0, torsoL * 0.5, limb * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.002);
      spine.add(zip);
    } else {
      const waistcoat = overTorso(s, person, H, build, s.material(pick(random, ['#4a4a52', '#5a4a40', '#3a4a5a']), { roughness: 0.7 }), { grow: 1.06, length: 0.88 });
      void waistcoat;
      const front = limb * 1.35 * 1.06 * (build === 'heavy' ? 1.25 : 1) + 0.004;
      necktie(s, person, H, pick(random, ['#8a1f2a', '#1f3f8f', '#d8a020']), front + 0.004);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.3, limb * 0.22, 6, 16), s.material('#f1efe6', { roughness: 0.6 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL + limb * 0.1;
      spine.add(collar);
      for (let i = 0; i < 4; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), s.material('#1f1a18'));
        button.position.set(0, torsoL * (0.18 + i * 0.13), front);
        spine.add(button);
      }
    }
    if (a.hat === 'beanie') beanie(s, person, H, pick(random, ['#1f1f22', '#8a1f2a', '#3a5a3a', '#d8a020']));
    // Fingerless gloves: dark hands with the fingertips showing.
    const glove = s.material('#2b2b2e', { roughness: 0.95 });
    for (const side of ['left', 'right'] as const) {
      handMesh(person, side).material = glove;
      const tips = new THREE.Mesh(new THREE.SphereGeometry(limb * 0.55, 8, 6), s.material(skin, { roughness: 0.45 }));
      tips.position.y = -H * 0.052;
      joints(person, side).wrist.add(tips);
    }
    cigaretteBehindEar(s, person, H, random() < 0.5 ? 'left' : 'right');

    // ---- the pose: leaning over the board, one hand on the clock
    const clockSide = -1;
    let clockAt: [number, number, number];
    if (a.moment === 'lean') {
      spine.rotation.x = -0.12;
      neck.rotation.x = 0.05;
      poseArm(person, 'left', { forward: 38, out: -2, bend: 118, inward: 68 });
      poseArm(person, 'right', { forward: 30, out: -2, bend: 112, inward: 62 });
      clockAt = [clockSide * (board.square * 4 + 0.1), board.top, tableZ - 0.1];
    } else {
      spine.rotation.x = 0.42;
      neck.rotation.x = 0.3;
      seat(person, hips0.y);
      if (a.moment === 'slap') {
        reachPoint(person, 'right', { y: board.top + 0.09, z: tableZ - 0.08 }, { out: 14 }, 'hand', { forward: [20, 110], bend: [0, 60] });
        const hand = at(person.hands.right);
        const x = Math.min(hand.x, -(board.square * 4 + 0.07));
        clockAt = [x, board.top, Math.min(Math.max(hand.z + 0.035, tableZ - board.half + 0.08), tableZ + 0.1)];
      } else {
        reachPoint(person, 'right', { y: board.y + 0.05, z: tableZ - 0.06, x: -0.08 }, { out: 2 }, 'hand', { forward: [20, 110], bend: [0, 60] });
        clockAt = [clockSide * (board.square * 4 + 0.1), board.top, tableZ - 0.1];
      }
      reachTo(person, 'left', board.top + 0.045, { out: 12, bend: 90, across: -62 }, 'elbow', [10, 100]);
    }
    chessClock(s, clockAt, { pressed: a.moment === 'slap' ? 'right' : 'left', yaw: -Math.PI / 2, body: pick(random, ['#5a3a22', '#2a2a2e', '#8a3a2a']) });
    banknote(s, [clockAt[0] + 0.035, clockAt[1] + 0.0015, clockAt[2] + 0.03], 0.35 + random() * 0.4);

    // ---- the game
    const pieces = { opening: POSITIONS.opening, scramble: POSITIONS.scramble, checkmate: POSITIONS.backRankMate }[a.stage];
    placePieces(s, board, pieces, { white: '#ece4cf', black: '#2a2320' });

    // ---- the rest of the table
    const leftX = board.square * 4 + 0.1;
    if (a.extras === 'coffee' || a.extras === 'everything') coffeeCup(s, [leftX + 0.01, board.top, tableZ - 0.12], pick(random, ['#f1ebdc', '#d9c9a8']));
    if (a.extras === 'radio' || a.extras === 'everything') pocketRadio(s, [leftX, board.top, tableZ + 0.18], -0.7 + random() * 0.3);
    if (a.extras === 'stack' || a.extras === 'everything') {
      for (let i = 0; i < 4; i++) banknote(s, [clockAt[0] + (random() - 0.5) * 0.02, board.top + 0.004 + i * 0.0045, tableZ + 0.2 + (random() - 0.5) * 0.02], (random() - 0.5) * 0.5);
    }

    // ---- the opponent, hunched over the board with his back to us
    let other: ReturnType<typeof figure> | null = null;
    if (a.opponent) {
      const H2 = mix(1.6, 1.78, random());
      other = figure(s, {
        height: H2, build: random() < 0.3 ? 'slight' : 'average', style: 'doll', pose: 'sitting', gaze: 'down', skin: pick(random, skinTones), sleeves: 'long',
        hair: pick(random, ['short', 'hood', 'cap', 'none'] as const), hairColor: pick(random, ['#1f1a18', '#3b2a22', '#6b6456', '#b8b0a4']),
        top: pick(random, ['#4a5a6a', '#6b4f33', '#2d3a2d', '#8a8a84']), bottom: pick(random, ['#2e3440', '#4a4238', '#3a3a3a']), shoes: '#2a211b',
      });
      s.root.add(other.root);
      hipsAt(other, (random() - 0.5) * 0.06, tableZ * 2, Math.PI);
      const them = joints(other, 'left');
      them.spine.rotation.x = 0.5;
      them.neck.rotation.x = 0.35;
      seat(other, seatY + 0.045 * H2);
      reachTo(other, 'left', board.top + 0.045, { out: 10, bend: 90, across: -60 }, 'elbow', [10, 100]);
      reachTo(other, 'right', board.top + 0.045, { out: 10, bend: 90, across: -60 }, 'elbow', [10, 100]);
    }

    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        other?.update(dt, time);
      },
    });
  },
});
