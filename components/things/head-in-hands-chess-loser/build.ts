import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { POSITIONS, ashtray, banknote, chessClock, chessTable, coffeeCup, layout, placePieces, sweptPieces } from './chess';
import { at, flatCap, hipsAt, joints, mouthOf, necktie, overTorso, pick, poseArm, reachPoint, reachTo, seat, skinTones } from './pose';

const LOST = layout('Ke1 Qd1 Rf1 Bc4 Ne5 c3 d4 a2 b2 f2 g2 h2', 'Kd7x Rf8 Nc6 Bb4 a7 b7 f7 g7 h7');
const STANDING = layout('Ke1 Qd1 Rf1 Bc4 Ne5 c3 d4 a2 b2 f2 g2 h2', 'Ke8 Rf8 Nc6 a7 b7 f7 g7 h7');
const SWEPT = layout('Ke1 Qd5', 'Kd7x');

export default defineThing({
  questions: {
    ruin: choice('What state is the board in?', {
      toppled: 'His king lies toppled on its side in front of him; the rest of the position still stands.',
      swept: 'The pieces have been swept to the ground around the table; two or three lie on the board.',
      set: 'The final position still stands untouched, the king upright; he has not moved since.',
    }),
    wears: choice('What is he wearing?', {
      shirt: 'A white shirt with the sleeves rolled and a tie pulled loose.',
      hoodie: 'A grey hoodie with the hood up.',
      cardigan: 'A brown cardigan over a checked shirt.',
      jacket: 'A creased suit jacket over an open collar.',
    }),
    head: choice('What is his hair like?', {
      dark: 'Dark, short, in need of a cut.',
      grey: 'Grey and thinning.',
      bald: 'Bald.',
      cap: 'A flat cap he has not taken off.',
    }),
    opponent: noul('Does the winner still sit across from him, leaning back with arms folded?'),
    wager: noul('Does a wager note lie by the clock, waiting to be taken?'),
    drink: choice('What is on the table besides the ashtray?', {
      beer: 'A beer bottle, half gone.',
      coffee: 'A paper coffee cup gone cold.',
      flask: 'A hip flask, cap off.',
      nothing: 'Nothing else: the board, the clock, the ashtray.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.62, 1.82, random());
    const build = random() < 0.3 ? 'heavy' : random() < 0.3 ? 'slight' : 'average';
    const skin = pick(random, skinTones);
    const outfit = {
      shirt: { top: '#f1efe6', bottom: pick(random, ['#2a2a30', '#3a3a40', '#4a4238']), shoes: '#2a211b', sleeves: 'short' as const },
      hoodie: { top: pick(random, ['#8a8a84', '#5a5a5e', '#3a3a3a']), bottom: pick(random, ['#2e3440', '#3a3a3a']), shoes: '#f0ede4', sleeves: 'long' as const },
      cardigan: { top: pick(random, ['#6b4a2e', '#8a6a44', '#4a4a3a']), bottom: pick(random, ['#4a4238', '#3a3a40']), shoes: '#2a211b', sleeves: 'long' as const },
      jacket: { top: pick(random, ['#2a2a30', '#3a3a3a', '#1f2a3a']), bottom: pick(random, ['#2a2a30', '#3a3a3a', '#1f2a3a']), shoes: '#2a211b', sleeves: 'long' as const },
    }[a.wears];
    const hair = a.wears === 'hoodie' ? 'hood' : a.head === 'bald' ? 'none' : a.head === 'cap' ? 'none' : 'short';
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'down', skin, hair,
      hairColor: a.head === 'grey' ? pick(random, ['#9a9690', '#b8b4ac']) : pick(random, ['#1f1a18', '#3b2a22', '#4a4038']),
      ...outfit,
    });
    s.root.add(person.root);
    hipsAt(person, 0, 0, 0);
    const hips0 = at(person.pelvis);
    const seatY = hips0.y - 0.045 * H;
    const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const torsoL = H * 0.28;
    const { spine, neck } = joints(person, 'left');

    // ---- the table, his bench behind him and the winner's across
    const tableZ = 0.62;
    const board = chessTable(s, { z: tableZ, kind: 'stone', seat: seatY, benches: ['far', 'near'], benchGap: 0.78 });

    // ---- clothes
    const front = limb * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.004;
    if (a.wears === 'shirt') {
      necktie(s, person, H, pick(random, ['#8a1f2a', '#1f3f8f', '#3a5a3a']), front + 0.004);
    } else if (a.wears === 'cardigan') {
      const check = s.material(pick(random, ['#d9c9a8', '#b8c9d9']), { roughness: 0.8 });
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.3, limb * 0.25, 6, 16), check);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL + limb * 0.1;
      spine.add(collar);
      const placket = new THREE.Mesh(new THREE.BoxGeometry(H * 0.02, torsoL * 0.8, 0.004), check);
      placket.position.set(0, torsoL * 0.48, front);
      spine.add(placket);
      for (let i = 0; i < 5; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#3a2a1a'));
        button.position.set(0, torsoL * (0.14 + i * 0.16), front + 0.003);
        spine.add(button);
      }
    } else if (a.wears === 'jacket') {
      const cloth = s.material(outfit.top, { roughness: 0.8 });
      overTorso(s, person, H, build, cloth, { grow: 1.12, length: 0.98 });
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.3, limb * 0.22, 6, 16), s.material('#e8e4d8', { roughness: 0.6 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL + limb * 0.1;
      spine.add(collar);
      for (const side of [-1, 1]) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, torsoL * 0.45, 0.006), s.material(new THREE.Color(outfit.top).multiplyScalar(0.8), { roughness: 0.8 }));
        lapel.position.set(side * H * 0.03, torsoL * 0.74, front * 1.12 * 1.0 + 0.006);
        lapel.rotation.z = side * 0.3;
        spine.add(lapel);
      }
    }
    if (a.head === 'cap' && a.wears !== 'hoodie') flatCap(s, person, H, pick(random, ['#4a4038', '#6b6456', '#3a3a3a']));
    if (a.head === 'grey' && hair === 'none') {
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(H * 0.064 * 1.05, 16, 8, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.25), s.material('#b8b4ac', { roughness: 0.9, side: THREE.DoubleSide }));
      fringe.position.y = H * 0.064 * 0.1;
      person.head.add(fringe);
    }

    // ---- the pose: hunched, elbows on the slab, face in both hands
    spine.rotation.x = 0.55;
    neck.rotation.x = 0.5;
    seat(person, hips0.y);
    const mouth = mouthOf(person, H);
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? 1 : -1;
      const forward = reachTo(person, side, board.top + 0.05, { out: 8, bend: 90, across: -60 }, 'elbow', [10, 100]);
      reachPoint(person, side, { x: mouth.x + sign * H * 0.03, y: mouth.y + H * 0.01, z: mouth.z + 0.01 }, { out: 8, forward }, 'hand', { forward: [forward, forward], bend: [60, 150], across: [-90, 10] });
    }

    // ---- the ruin on the board
    const colours = { white: '#ece4cf', black: '#2a2320' };
    if (a.ruin === 'toppled') placePieces(s, board, LOST, colours);
    else if (a.ruin === 'set') placePieces(s, board, STANDING, colours);
    else {
      placePieces(s, board, SWEPT, colours);
      sweptPieces(s, { x: 0, z: tableZ }, 14 + Math.floor(random() * 6), colours, 0.75);
    }

    // ---- the clock, stopped, a note beside it, the ashtray and the drink
    const clockAt: [number, number, number] = [-(board.square * 4 + 0.1), board.top, tableZ - 0.1];
    chessClock(s, clockAt, { pressed: 'left', yaw: -Math.PI / 2, body: pick(random, ['#5a3a22', '#2a2a2e']) });
    if (a.wager) banknote(s, [clockAt[0] + 0.01, board.top + 0.0015, clockAt[2] + 0.13], 0.2 + random() * 0.6);
    const tray = ashtray(s, [board.square * 4 + 0.1, board.top, tableZ - 0.14], mood);
    if (a.drink === 'beer') {
      const glass = s.material('#3a2a12', { roughness: 0.25 });
      s.cylinder(0.03, 0.032, 0.17, [board.square * 4 + 0.1, board.top + 0.085, tableZ + 0.1], glass, 14);
      s.cylinder(0.012, 0.03, 0.06, [board.square * 4 + 0.1, board.top + 0.2, tableZ + 0.1], glass, 12);
      s.box([0.055, 0.04, 0.001], [board.square * 4 + 0.1, board.top + 0.09, tableZ + 0.132], s.material('#d9c27a', { roughness: 0.8 }));
    } else if (a.drink === 'coffee') coffeeCup(s, [board.square * 4 + 0.1, board.top, tableZ + 0.1], '#d9c9a8');
    else if (a.drink === 'flask') {
      const steel = s.material('#b9bcbd', { metalness: 0.75, roughness: 0.35 });
      const flask = s.box([0.07, 0.11, 0.025], [board.square * 4 + 0.1, board.top + 0.055, tableZ + 0.1], steel);
      flask.rotation.y = 0.5;
      s.cylinder(0.012, 0.012, 0.01, [board.square * 4 + 0.16, board.top + 0.005, tableZ + 0.14], steel, 10);
    }

    // ---- the winner, leaning back across the table
    let other: ReturnType<typeof figure> | null = null;
    if (a.opponent) {
      const H2 = mix(1.6, 1.8, random());
      other = figure(s, {
        height: H2, build: random() < 0.4 ? 'heavy' : 'average', style: 'doll', pose: 'sitting', gaze: 'ahead', skin: pick(random, skinTones), sleeves: 'long',
        hair: pick(random, ['short', 'cap', 'hat', 'none'] as const), hairColor: pick(random, ['#1f1a18', '#3b2a22', '#6b6456', '#b8b0a4']),
        top: pick(random, ['#4a5a6a', '#6b4f33', '#2d3a2d', '#8a8a84', '#b89a6a']), bottom: pick(random, ['#2e3440', '#4a4238', '#3a3a3a']), shoes: '#2a211b',
      });
      s.root.add(other.root);
      hipsAt(other, (random() - 0.5) * 0.06, tableZ * 2 + 0.04, Math.PI);
      const them = joints(other, 'left');
      them.spine.rotation.x = -0.14;
      them.neck.rotation.x = 0.1;
      seat(other, seatY + 0.045 * H2);
      poseArm(other, 'left', { forward: 38, out: -2, bend: 118, inward: 68 });
      poseArm(other, 'right', { forward: 30, out: -2, bend: 112, inward: 62 });
    }

    const drift = mix(0.2, 1.1, mood.energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        other?.update(dt, time);
        tray.ember.scale.setScalar(0.004 * (1 + Math.sin(time * 9) * 0.25));
        tray.wisps.forEach((wisp, index) => {
          const phase = (time * drift * 0.22 + index * 0.25) % 1;
          wisp.position.set(tray.origin.x + Math.sin(time * 1.1 + index) * 0.015 * phase, tray.origin.y + phase * 0.22, tray.origin.z + Math.cos(time * 0.9 + index) * 0.01 * phase);
          wisp.scale.setScalar(0.008 + phase * 0.035);
          (wisp.material as THREE.MeshStandardMaterial).opacity = 0.45 * (1 - phase);
        });
      },
    });
  },
});
