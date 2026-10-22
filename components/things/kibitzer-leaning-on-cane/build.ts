import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { POSITIONS, chessTable, placePieces } from './chess';
import { at, brimmedHat, coatSkirt, flatCap, furHat, ground, hipsAt, joints, pick, reachPoint, reachTo, seat, skinTones } from './pose';

export default defineThing({
  questions: {
    hat: choice('What is on his head?', {
      fedora: 'A felt fedora tilted back.',
      cap: 'A flat tweed cap.',
      fur: 'A tall fur hat.',
      none: 'Nothing: white hair, or none.',
    }),
    hands: choice('What are his hands doing?', {
      cane: 'Both stacked on the cane, keeping his opinion to himself for now.',
      pointing: 'One hand on the cane, the other pointing at the board with the advice.',
      chin: 'One on the cane, the other stroking his chin.',
    }),
    coat: choice('What does he wear?', {
      camel: 'A camel overcoat down to the knees.',
      anorak: 'A nylon anorak zipped up.',
      cardigan: 'A buttoned cardigan over a shirt and tie.',
      raincoat: 'A long grey raincoat, belted.',
    }),
    second: noul('Does a second kibitzer stand beside him, arms folded?'),
    game: choice('What is he looking down at?', {
      players: 'A stone chess table with two players hunched over the game.',
      empty: 'A stone chess table mid-game, both benches empty: the players have stepped away.',
      none: 'Something out of frame; he stands alone with the newspaper.',
    }),
    paper: choice('What is under his arm?', {
      newspaper: 'A folded broadsheet newspaper.',
      racing: 'A racing paper, pink.',
      umbrella: 'A furled umbrella.',
      nothing: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random } = context;
    const H = mix(1.6, 1.76, random());
    const build = random() < 0.35 ? 'slight' : random() < 0.5 ? 'heavy' : 'average';
    const skin = pick(random, skinTones);
    const top = { camel: pick(random, ['#c2a070', '#b89a6a']), anorak: pick(random, ['#2a5a8a', '#3a6a3a', '#8a2a2a', '#1f1f22']), cardigan: pick(random, ['#6b4a2e', '#4a5a3a', '#5a4a5a']), raincoat: pick(random, ['#8a8a84', '#6b6b66']) }[a.coat];
    const hairColor = pick(random, ['#d8d4cc', '#b8b4ac', '#8a8680']);
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'standing', gaze: 'down', skin, sleeves: 'long',
      hair: a.hat === 'none' ? (random() < 0.6 ? 'short' : 'none') : 'short', hairColor,
      top, bottom: pick(random, ['#3a3a40', '#4a4238', '#2a2a30', '#6b6456']), shoes: '#2a211b',
    });
    s.root.add(person.root);
    hipsAt(person, 0, 0, 0);
    const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const torsoL = H * 0.28;
    const { spine, neck } = joints(person, 'left');

    // ---- the coat and the hat
    const cloth = s.material(top, { roughness: a.coat === 'anorak' ? 0.4 : 0.9 });
    if (a.coat === 'camel' || a.coat === 'raincoat') {
      coatSkirt(s, person, H, build, cloth, 0.3);
      const front = limb * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.004;
      for (const side of [-1, 1]) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, torsoL * 0.45, 0.006), s.material(new THREE.Color(top).multiplyScalar(0.85), { roughness: 0.9 }));
        lapel.position.set(side * H * 0.03, torsoL * 0.74, front);
        lapel.rotation.z = side * 0.3;
        spine.add(lapel);
      }
      if (a.coat === 'raincoat') {
        const belt = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.4, 0.012, 6, 24), cloth);
        belt.rotation.x = Math.PI / 2;
        belt.position.y = torsoL * 0.08;
        belt.scale.x = (H * 0.115 * { slight: 0.85, average: 1, heavy: 1.3 }[build] * 2) / (limb * 2.7);
        spine.add(belt);
      }
    } else if (a.coat === 'cardigan') {
      const shirt = s.material('#e8e4d8', { roughness: 0.8 });
      const front = limb * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.004;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.3, limb * 0.22, 6, 16), shirt);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL + limb * 0.1;
      spine.add(collar);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(H * 0.018, torsoL * 0.45, 0.005), s.material(pick(random, ['#8a1f2a', '#1f3f8f', '#3a5a3a']), { roughness: 0.45 }));
      tie.position.set(0, torsoL * 0.7, front);
      spine.add(tie);
      for (let i = 0; i < 4; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#3a2a1a'));
        button.position.set(0, torsoL * (0.14 + i * 0.13), front + 0.002);
        spine.add(button);
      }
    } else {
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.008, torsoL * 0.92, 0.004), s.material('#d8d4cc', { roughness: 0.5 }));
      zip.position.set(0, torsoL * 0.5, limb * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.003);
      spine.add(zip);
      const hood = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.5, limb * 0.45, 8, 18, Math.PI), cloth);
      hood.rotation.set(Math.PI / 2, 0, Math.PI);
      hood.position.set(0, torsoL + limb * 0.25, -limb * 0.3);
      spine.add(hood);
    }
    if (a.hat === 'fedora') brimmedHat(s, person, H, pick(random, ['#3a3a3a', '#5a4a38', '#6b6456', '#8a7a5a']), 0.22);
    if (a.hat === 'cap') flatCap(s, person, H, pick(random, ['#4a4038', '#6b6456', '#3a3a3a', '#5a5a4a']));
    if (a.hat === 'fur') furHat(s, person, H, pick(random, ['#3a2e24', '#6b6259', '#1f1d1b']));

    // ---- the stoop over the board, hands on the cane
    spine.rotation.x = 0.26;
    neck.rotation.x = 0.42;
    ground(person);
    const hips = at(person.pelvis);
    const caneTop = new THREE.Vector3(hips.x + 0.02, hips.y + 0.02, hips.z + 0.3);
    reachPoint(person, 'right', { x: caneTop.x - 0.01, y: caneTop.y + 0.03, z: caneTop.z }, { out: 8 }, 'hand', { forward: [10, 80], bend: [0, 60], across: [-70, 0] });
    if (a.hands === 'cane') reachPoint(person, 'left', { x: caneTop.x + 0.01, y: caneTop.y + 0.085, z: caneTop.z - 0.01 }, { out: 8 }, 'hand', { forward: [10, 80], bend: [0, 70], across: [-80, 0] });
    else if (a.hands === 'pointing') {
      reachPoint(person, 'left', { x: hips.x + 0.12, y: hips.y - 0.02, z: hips.z + 0.62 }, { out: 6 }, 'hand', { forward: [30, 110], bend: [0, 30] });
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, H * 0.05, 6), s.material(skin, { roughness: 0.45 }));
      finger.position.y = -H * 0.02;
      person.hands.left.add(finger);
    } else {
      const chin = person.head.localToWorld(new THREE.Vector3(0, -H * 0.064 * 0.8, H * 0.064 * 0.7));
      reachPoint(person, 'left', { x: chin.x + 0.02, y: chin.y - 0.02, z: chin.z + 0.01 }, { out: 10 }, 'hand', { forward: [20, 90], bend: [60, 150], across: [-90, 0] });
    }
    const hand = at(person.hands.right);
    const wood = s.material(pick(random, ['#4a2f1b', '#2a2320', '#6b4a2e']), { roughness: 0.55 });
    const foot: [number, number, number] = [hand.x + 0.04, 0.005, hand.z + 0.06];
    s.rod(foot, [hand.x, hand.y - 0.055, hand.z], 0.011, wood, 0.013);
    const handle = s.cylinder(0.014, 0.014, 0.1, [hand.x - 0.02, hand.y - 0.05, hand.z], wood, 10);
    handle.rotation.z = Math.PI / 2;
    s.cylinder(0.016, 0.014, 0.02, [foot[0], 0.01, foot[2]], s.material('#1f1a18', { roughness: 0.8 }), 8);

    // ---- what is under the other arm
    if (a.paper !== 'nothing') {
      const { shoulder } = joints(person, 'left');
      if (a.paper === 'umbrella') {
        const brolly = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.72, 10), s.material('#1f1f22', { roughness: 0.6 }));
        brolly.position.set(limb * 1.6, -H * 0.09, 0.02);
        brolly.rotation.x = Math.PI / 2 - 0.25;
        brolly.castShadow = true;
        shoulder.add(brolly);
      } else {
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), s.material(a.paper === 'racing' ? '#e8b8c0' : '#e8e4d8', { roughness: 0.95 }));
        paper.position.set(limb * 1.55, -H * 0.085, 0.06);
        paper.rotation.x = -0.12;
        paper.castShadow = true;
        shoulder.add(paper);
        const masthead = new THREE.Mesh(new THREE.BoxGeometry(0.061, 0.03, 0.14), s.material('#2a2320', { roughness: 0.9 }));
        masthead.position.set(limb * 1.55, -H * 0.045, 0.12);
        masthead.rotation.x = -0.12;
        shoulder.add(masthead);
      }
    }

    // ---- the second kibitzer
    let other: ReturnType<typeof figure> | null = null;
    if (a.second) {
      const H2 = mix(1.58, 1.76, random());
      other = figure(s, {
        height: H2, build: random() < 0.5 ? 'heavy' : 'average', style: 'doll', pose: 'arms-crossed', gaze: 'down', skin: pick(random, skinTones), sleeves: 'long',
        hair: pick(random, ['hat', 'cap', 'short', 'none'] as const), hairColor: pick(random, ['#d8d4cc', '#b8b4ac', '#3b2a22']),
        top: pick(random, ['#4a5a6a', '#6b4f33', '#2d3a2d', '#8a8a84', '#1f1f22']), bottom: pick(random, ['#2e3440', '#4a4238', '#3a3a3a']), shoes: '#2a211b',
      });
      s.root.add(other.root);
      const side = random() < 0.5 ? -1 : 1;
      hipsAt(other, side * 0.62, -0.08, -side * 0.35);
      joints(other, 'left').spine.rotation.x = 0.15;
      joints(other, 'left').neck.rotation.x = 0.3;
      ground(other);
    }

    // ---- the table he is studying, seen from its side
    let players: ReturnType<typeof figure>[] = [];
    if (a.game !== 'none') {
      const tableZ = hips.z + 0.86;
      const seatY = 0.44;
      const board = chessTable(s, { z: tableZ, kind: 'stone', seat: seatY, benches: ['near', 'far'], benchAxis: 'x', benchGap: 0.8 });
      placePieces(s, board, pick(random, [POSITIONS.middlegame, POSITIONS.scramble, POSITIONS.opening]), { white: '#ece4cf', black: '#2a2320' });
      if (a.game === 'players') {
        for (const side of [-1, 1]) {
          const Hp = mix(1.6, 1.78, random());
          const player = figure(s, {
            height: Hp, build: random() < 0.4 ? 'heavy' : 'average', style: 'doll', pose: 'sitting', gaze: 'down', skin: pick(random, skinTones), sleeves: 'long',
            hair: pick(random, ['short', 'cap', 'hood', 'none'] as const), hairColor: pick(random, ['#1f1a18', '#3b2a22', '#6b6456', '#b8b0a4']),
            top: pick(random, ['#4a5a6a', '#6b4f33', '#2d3a2d', '#8a8a84', '#b89a6a', '#2a5a8a']), bottom: pick(random, ['#2e3440', '#4a4238', '#3a3a3a']), shoes: '#2a211b',
          });
          s.root.add(player.root);
          hipsAt(player, side * 0.62, tableZ, side * Math.PI / 2);
          const pj = joints(player, 'left');
          pj.spine.rotation.x = 0.45;
          pj.neck.rotation.x = 0.35;
          seat(player, seatY + 0.045 * Hp);
          reachTo(player, 'left', board.top + 0.045, { out: 10, bend: 90, across: -60 }, 'elbow', [10, 100]);
          reachTo(player, 'right', board.top + 0.045, { out: 10, bend: 90, across: -60 }, 'elbow', [10, 100]);
          players.push(player);
        }
      }
    }

    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        other?.update(dt, time);
        for (const player of players) player.update(dt, time);
      },
    });
  },
});
