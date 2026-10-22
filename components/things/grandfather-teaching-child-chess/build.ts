import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { POSITIONS, chessTable, pieceGeometries, placePieces, squareAt } from './chess';
import { at, brimmedHat, flatCap, hipsAt, joints, mouthOf, overTorso, pick, poseArm, reachPoint, reachTo, seat, skinTones } from './pose';

export default defineThing({
  questions: {
    height: score('How big is the child?', ['A small child whose feet dangle well off the ground', 'A child of about eight', 'A lanky twelve-year-old']),
    winning: choice('Who is winning?', {
      child: 'The child: most of the grandfather\'s pieces are gone and the old man is letting it happen.',
      grandfather: 'The grandfather, gently: the child has a few pieces left and a lesson coming.',
      early: 'Nobody yet: the opening, nearly every piece still standing.',
    }),
    teaching: choice('What is the grandfather doing?', {
      pointing: 'Leaning in and pointing at a piece with one finger.',
      moving: 'Lifting a piece to show the move.',
      waiting: 'Hands folded on the table, letting the child think.',
    }),
    child: choice('What is the child doing?', {
      chin: 'Chin in both hands, elbows on the table, staring at the board.',
      reaching: 'Reaching out to touch a piece, not sure yet.',
      looking: 'Looking up at the grandfather, waiting for the answer.',
    }),
    wears: choice('What does the grandfather wear?', {
      cardigan: 'A buttoned cardigan over a shirt.',
      jacket: 'An old suit jacket with a tie.',
      tracksuit: 'A zipped tracksuit top.',
      coat: 'A heavy overcoat and a scarf.',
    }),
    head: choice('What is on the grandfather\'s head?', {
      cap: 'A flat cap.',
      bald: 'Nothing: bald on top with a white fringe.',
      white: 'A full head of white hair.',
      hat: 'A felt hat.',
    }),
    thermos: noul('Do a thermos and two cups stand on the table?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random } = context;
    const H = mix(1.62, 1.78, random());
    const build = random() < 0.4 ? 'heavy' : random() < 0.3 ? 'slight' : 'average';
    const skin = pick(random, skinTones);
    const childSkin = random() < 0.6 ? skin : pick(random, skinTones);
    const outfit = {
      cardigan: { top: pick(random, ['#6b4a2e', '#4a5a3a', '#8a7a4a', '#5a4a5a']), bottom: pick(random, ['#4a4238', '#3a3a40', '#6b6456']), shoes: '#2a211b' },
      jacket: { top: pick(random, ['#3a3a3a', '#4a4a52', '#5a4a40']), bottom: pick(random, ['#3a3a3a', '#4a4a52', '#5a4a40']), shoes: '#2a211b' },
      tracksuit: { top: pick(random, ['#1f4fa0', '#8a1f2a', '#2d3a2d']), bottom: pick(random, ['#2e3440', '#3a3a3a']), shoes: '#f0ede4' },
      coat: { top: pick(random, ['#4a3f33', '#2a2d33', '#5a4a3a']), bottom: pick(random, ['#3a3a40', '#4a4238']), shoes: '#2a211b' },
    }[a.wears];
    if (a.wears === 'jacket') outfit.bottom = outfit.top;

    // ---- the grandfather, sitting at -z and facing the child
    const grandfather = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'down', skin, sleeves: 'long',
      hair: a.head === 'white' ? 'short' : 'none', hairColor: '#e8e4dc',
      ...outfit,
    });
    s.root.add(grandfather.root);
    hipsAt(grandfather, 0, 0, 0);
    const hips0 = at(grandfather.pelvis);
    const seatY = hips0.y - 0.045 * H;
    const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const torsoL = H * 0.28;
    const tableZ = 0.64;
    const board = chessTable(s, { z: tableZ, kind: 'stone', seat: seatY, benches: ['far', 'near'], benchGap: 0.8 });
    const { spine, neck } = joints(grandfather, 'left');
    const front = limb * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.004;

    // ---- his clothes and head
    if (a.wears === 'cardigan') {
      const shirt = s.material(pick(random, ['#e8e4d8', '#c9d3e0', '#d9c9a8']), { roughness: 0.8 });
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.3, limb * 0.25, 6, 16), shirt);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL + limb * 0.1;
      spine.add(collar);
      const placket = new THREE.Mesh(new THREE.BoxGeometry(H * 0.016, torsoL * 0.8, 0.004), shirt);
      placket.position.set(0, torsoL * 0.48, front);
      spine.add(placket);
      for (let i = 0; i < 5; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#3a2a1a'));
        button.position.set(0, torsoL * (0.14 + i * 0.16), front + 0.003);
        spine.add(button);
      }
    } else if (a.wears === 'jacket') {
      overTorso(s, grandfather, H, build, s.material(outfit.top, { roughness: 0.8 }), { grow: 1.12, length: 0.98 });
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.3, limb * 0.22, 6, 16), s.material('#e8e4d8', { roughness: 0.6 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL + limb * 0.1;
      spine.add(collar);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(H * 0.02, torsoL * 0.5, 0.006), s.material(pick(random, ['#8a1f2a', '#1f3f8f', '#3a5a3a']), { roughness: 0.45 }));
      tie.position.set(0, torsoL * 0.66, front * 1.12 + 0.006);
      spine.add(tie);
    } else if (a.wears === 'tracksuit') {
      const stripe = s.material('#f1efe6', { roughness: 0.8 });
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.008, torsoL * 0.9, 0.004), stripe);
      zip.position.set(0, torsoL * 0.5, front);
      spine.add(zip);
      for (const side of ['left', 'right'] as const) {
        const { shoulder } = joints(grandfather, side);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.006, H * 0.16, 0.012), stripe);
        upper.position.set((side === 'left' ? 1 : -1) * limb * 0.98, -H * 0.085, 0);
        shoulder.add(upper);
      }
    } else {
      overTorso(s, grandfather, H, build, s.material(outfit.top, { roughness: 0.95 }), { grow: 1.18, length: 1.0 });
      const wool = s.material(pick(random, ['#8a1f2a', '#d9c27a', '#4a6a8a', '#c9c2b2']), { roughness: 1 });
      const loop = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.7, limb * 0.5, 8, 18), wool);
      loop.rotation.x = Math.PI / 2;
      loop.position.y = torsoL + limb * 0.2;
      loop.scale.x = 1.5;
      spine.add(loop);
    }
    if (a.head === 'cap') flatCap(s, grandfather, H, pick(random, ['#4a4038', '#6b6456', '#3a3a3a', '#5a4a38']));
    if (a.head === 'hat') brimmedHat(s, grandfather, H, pick(random, ['#3a3a3a', '#5a4a38', '#6b6456']), 0.05);
    if (a.head === 'bald' || a.head === 'cap') {
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(H * 0.064 * 1.05, 16, 8, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.24), s.material('#e8e4dc', { roughness: 0.9, side: THREE.DoubleSide }));
      fringe.position.y = H * 0.064 * 0.1;
      grandfather.head.add(fringe);
    }

    // ---- the child, across the table, facing him
    const Hc = mix(0.95, 1.45, a.height);
    const childTop = pick(random, ['#d8452c', '#2b6fb8', '#f2c21c', '#2e8b57', '#8a3a8a', '#f1efe6']);
    const child = figure(s, {
      height: Hc, build: 'slight', style: 'doll', pose: 'sitting', gaze: 'down', skin: childSkin, sleeves: random() < 0.5 ? 'long' : 'short',
      hair: pick(random, ['short', 'long', 'bun', 'cap'] as const), hairColor: pick(random, ['#1f1a18', '#3b2a22', '#6b4a2e', '#b8884a', '#a04a2a']),
      top: childTop, bottom: pick(random, ['#2e3440', '#4a6a8a', '#3a3a3a', '#8a6a44']), shoes: pick(random, ['#f0ede4', '#d8452c', '#2a211b']),
    });
    s.root.add(child.root);
    hipsAt(child, (random() - 0.5) * 0.04, tableZ * 2, Math.PI);
    seat(child, seatY + 0.05 * Hc);
    const kid = joints(child, 'left');
    const childMouth = () => mouthOf(child, Hc);
    if (a.child === 'chin') {
      kid.spine.rotation.x = 0.35;
      kid.neck.rotation.x = 0.3;
      const mouth = childMouth();
      for (const side of ['left', 'right'] as const) {
        const sign = side === 'left' ? 1 : -1;
        const forward = reachTo(child, side, board.top + 0.04, { out: 10, bend: 90, across: -60 }, 'elbow', [20, 110]);
        reachPoint(child, side, { x: mouth.x + sign * Hc * 0.025, y: mouth.y - Hc * 0.01, z: mouth.z - 0.01 }, { out: 10, forward }, 'hand', { forward: [forward, forward], bend: [40, 150], across: [-90, 10] });
      }
    } else if (a.child === 'reaching') {
      kid.spine.rotation.x = 0.3;
      kid.neck.rotation.x = 0.25;
      const target = squareAt(board, 3 + Math.floor(random() * 2), 3);
      reachPoint(child, 'right', { x: target.x, y: target.y + 0.045, z: target.z }, { out: 6 }, 'hand', { forward: [20, 120], bend: [0, 60] });
      reachTo(child, 'left', board.top + 0.04, { out: 10, bend: 90, across: -60 }, 'elbow', [20, 110]);
    } else {
      kid.spine.rotation.x = 0.12;
      kid.neck.rotation.x = -0.3;
      reachTo(child, 'left', board.top + 0.04, { out: 10, bend: 90, across: -60 }, 'elbow', [20, 110]);
      reachTo(child, 'right', board.top + 0.04, { out: 10, bend: 90, across: -60 }, 'elbow', [20, 110]);
    }

    // ---- the grandfather's lesson
    spine.rotation.x = a.teaching === 'waiting' ? 0.2 : 0.42;
    neck.rotation.x = a.child === 'looking' ? 0.05 : 0.3;
    seat(grandfather, hips0.y);
    const pieces = { child: POSITIONS.blackCrushing, grandfather: POSITIONS.whiteCrushing, early: POSITIONS.opening }[a.winning];
    const lifted = a.teaching === 'moving' ? pieces.find((piece) => !piece.white && piece.type !== 'king' && piece.rank >= 4) ?? null : null;
    placePieces(s, board, lifted ? pieces.filter((piece) => piece !== lifted) : pieces, { white: '#ece4cf', black: '#2a2320' });
    if (a.teaching === 'pointing') {
      const target = squareAt(board, 2 + Math.floor(random() * 4), 2 + Math.floor(random() * 3));
      reachPoint(grandfather, 'right', { x: target.x + 0.02, y: target.y + 0.05, z: target.z - 0.03 }, { out: 4 }, 'hand', { forward: [20, 120], bend: [0, 50] });
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, H * 0.05, 6), s.material(skin, { roughness: 0.45 }));
      finger.position.y = -H * 0.02;
      grandfather.hands.right.add(finger);
      reachTo(grandfather, 'left', board.top + 0.045, { out: 10, bend: 90, across: -60 }, 'elbow', [10, 100]);
    } else if (a.teaching === 'moving' && lifted) {
      const target = squareAt(board, lifted.file, lifted.rank);
      reachPoint(grandfather, 'right', { x: target.x, y: target.y + 0.1, z: target.z }, { out: 4 }, 'hand', { forward: [20, 120], bend: [0, 50] });
      const geometries = pieceGeometries();
      const held = new THREE.Mesh(geometries[lifted.type], s.material('#2a2320', { roughness: 0.42 }));
      for (const type of Object.keys(geometries) as (keyof typeof geometries)[]) if (type !== lifted.type) geometries[type].dispose();
      held.position.set(0, -H * 0.06, 0.01);
      held.castShadow = true;
      grandfather.hands.right.add(held);
      reachTo(grandfather, 'left', board.top + 0.045, { out: 10, bend: 90, across: -60 }, 'elbow', [10, 100]);
    } else {
      reachTo(grandfather, 'left', board.top + 0.045, { out: 6, bend: 90, across: -70 }, 'elbow', [10, 100]);
      reachTo(grandfather, 'right', board.top + 0.045, { out: 6, bend: 90, across: -70 }, 'elbow', [10, 100]);
    }

    // ---- the thermos and two cups at the side of the board
    if (a.thermos) {
      const steel = s.material(pick(random, ['#b9bcbd', '#3a5a3a', '#8a1f2a']), { metalness: 0.5, roughness: 0.4 });
      const tx = -(board.square * 4 + 0.12), tz = tableZ + 0.12;
      s.cylinder(0.045, 0.045, 0.26, [tx, board.top + 0.13, tz], steel, 16);
      s.cylinder(0.04, 0.04, 0.05, [tx, board.top + 0.285, tz], s.material('#2a2320', { roughness: 0.5 }), 16);
      const china = s.material('#f1ece0', { roughness: 0.4 });
      for (const dz of [-0.14, -0.26]) {
        s.lathe([[0.012, 0], [0.028, 0.002], [0.032, 0.03], [0.034, 0.055], [0.029, 0.052], [0.026, 0.01]], china, [tx + 0.01, board.top, tz + dz]);
        s.cylinder(0.026, 0.026, 0.004, [tx + 0.01, board.top + 0.048, tz + dz], s.material('#b48a5a', { roughness: 0.4 }), 12);
      }
    }

    // Seen side-on, so both the pointing finger and the chin in hands read.
    s.root.rotation.y = (random() < 0.5 ? 1 : -1) * Math.PI / 2;
    return s.finish({
      update(dt, time) {
        grandfather.update(dt, time);
        child.update(dt, time);
      },
    });
  },
});
