import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { at, hem, pick, pickSkin, rig } from './pose';

export default defineThing({
  questions: {
    cassock: choice('What colour is the cassock?', {
      red: 'Scarlet, the classic cathedral choir.',
      purple: 'Deep purple, for a bishop\'s church.',
      blue: 'Royal blue, a parish or school choir.',
      black: 'Black, plain and old-fashioned.',
      green: 'Bottle green, a village choir.',
    }),
    age: score('How old is the chorister?', ['A boy treble of eight, swamped by the surplice', 'A girl of twelve', 'A student alto', 'A middle-aged tenor', 'An old bass with white hair, fifty years in the back row']),
    folder: choice('What is the music folder doing?', {
      open: 'Held open at chest height, the pages lit.',
      shut: 'Clasped shut against the chest.',
      down: 'Held open but low, at the waist, resting between pieces.',
    }),
    posture: choice('What is the chorister doing right now?', {
      singing: 'Singing: head lifted, chin up, holding a long note.',
      waiting: 'Waiting: folder down, eyes on the conductor, still.',
      turning: 'Turning a page, head bent to the folder.',
      yawning: 'Head tipped back and hidden behind the folder, mid-yawn.',
    }),
    collar: choice('What is at the neck?', {
      ruff: 'A pleated white ruff, the full cathedral kind.',
      plain: 'A plain white collar.',
      bow: 'A black bow tie under a soft collar.',
      none: 'Nothing: the surplice neck open.',
    }),
    medal: noul('Does a head chorister\'s medal hang on a ribbon round the neck?'),
    step: choice('What does the chorister stand on?', {
      step: 'A low wooden choir step.',
      stalls: 'The raised floor of a carved choir stall, a book ledge in front.',
      floor: 'The bare floor, no step.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.2, 1.82, a.age);
    const old = a.age > 0.82;
    const skin = pickSkin(random);
    const cassockColour = { red: '#a3202a', purple: '#4a2a6a', blue: '#243f8a', black: '#1e1e22', green: '#1f4a34' }[a.cassock];
    const cloth = s.material(cassockColour, { roughness: 0.85, side: THREE.DoubleSide });
    const linen = s.material('#f4f1ea', { roughness: 0.9, side: THREE.DoubleSide });
    const hairColour = old ? '#e2dfd8' : pick(random, ['#2a1e18', '#4a3222', '#d8b86a', '#8a5a2a', '#1a1512']);
    const lift = { step: 0.14, stalls: 0.22, floor: 0 }[a.step];

    const person = figure(s, {
      height: H, build: old && random() < 0.5 ? 'heavy' : a.age < 0.35 ? 'slight' : 'average', style: 'doll', skin,
      hair: old ? (random() < 0.5 ? 'none' : 'short') : a.age < 0.5 && random() < 0.5 ? 'long' : 'short', hairColor: hairColour,
      top: '#f4f1ea', bottom: cassockColour, shoes: '#1c1a18', sleeves: 'long', pose: 'standing', gaze: 'ahead',
    });
    person.root.position.y = lift;
    s.root.add(person.root);
    const pose = rig(person);
    // The folder's height sets the arms: chest high to sing, waist low to wait, one hand up to turn.
    const low = a.folder === 'down' || a.posture === 'waiting';
    const forward = low ? 28 : 58, bend = low ? 55 : 82;
    pose.arm('left', { forward, out: 4, bend, across: 30 });
    pose.arm('right', { forward: a.posture === 'turning' ? forward + 22 : forward, out: 4, bend: a.posture === 'turning' ? bend + 10 : bend, across: a.posture === 'turning' ? 55 : 30 });
    if (a.posture === 'singing') pose.look(-24, 0, 0);
    else if (a.posture === 'turning') pose.look(30, -6, 0);
    else if (a.posture === 'yawning') pose.look(-40, 0, 4);
    else pose.look(2, 8, 0);
    if (old) { pose.bow(8); pose.look(-12, 0, 0); }
    pose.leg('left', { out: 3 });
    pose.leg('right', { out: 3 });
    person.settle();

    const hip = at(s, person.pelvis);
    const shoulder = at(s, person.joints.shoulders.left);
    const neck = at(s, person.joints.neck);
    hem(s, cloth, new THREE.Vector3(hip.x, hip.y + 0.02 * H, hip.z), 0.075 * H, 0.15 * H, hip.y - lift - 0.035 * H, 0.75);
    hem(s, linen, new THREE.Vector3(hip.x, shoulder.y - 0.02 * H, hip.z), 0.1 * H, 0.21 * H, shoulder.y - hip.y + 0.15 * H, 0.75);
    for (const side of ['left', 'right'] as const) {
      const elbow = at(s, person.joints.elbows[side]);
      const upper = at(s, person.joints.shoulders[side]);
      const mid = upper.clone().lerp(elbow, 0.55);
      const sleeve = s.mesh(new THREE.CylinderGeometry(0.03 * H, 0.08 * H, upper.distanceTo(elbow) * 1.05, 14, 1, true), linen, mid.toArray() as [number, number, number]);
      sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), upper.clone().sub(elbow).normalize());
    }
    // Collar: a pleated ruff is a flattened, low-segment torus; the others are small bands.
    const neckAt: [number, number, number] = [neck.x, neck.y + 0.012 * H, neck.z];
    if (a.collar === 'ruff') {
      const ruff = s.mesh(new THREE.TorusGeometry(0.07 * H, 0.03 * H, 6, 14), linen, neckAt);
      ruff.rotation.x = Math.PI / 2;
      ruff.scale.y = 0.45;
      const pleats = s.mesh(new THREE.TorusGeometry(0.085 * H, 0.012 * H, 4, 22), linen, [neckAt[0], neckAt[1] - 0.005 * H, neckAt[2]]);
      pleats.rotation.x = Math.PI / 2;
    } else if (a.collar === 'plain') {
      s.ring(0.045 * H, 0.012 * H, neckAt, linen).rotation.x = Math.PI / 2;
    } else if (a.collar === 'bow') {
      s.ring(0.045 * H, 0.01 * H, neckAt, linen).rotation.x = Math.PI / 2;
      const bow = s.material('#1a1a1e', { roughness: 0.6 });
      s.box([0.03 * H, 0.016 * H, 0.012 * H], [neckAt[0] - 0.022 * H, neckAt[1] - 0.012 * H, neckAt[2] + 0.045 * H], bow).rotation.z = 0.3;
      s.box([0.03 * H, 0.016 * H, 0.012 * H], [neckAt[0] + 0.022 * H, neckAt[1] - 0.012 * H, neckAt[2] + 0.045 * H], bow).rotation.z = -0.3;
    }
    if (a.medal) {
      const ribbon = s.material(a.cassock === 'blue' ? '#a3202a' : '#243f8a', { roughness: 0.8 });
      const chest = new THREE.Vector3(neck.x, neck.y - 0.13 * H, neck.z + 0.065 * H);
      for (const side of [-1, 1]) s.rod([neck.x + side * 0.05 * H, neck.y - 0.005 * H, neck.z + 0.03 * H], [chest.x, chest.y, chest.z], 0.005 * H, ribbon);
      s.cylinder(0.022 * H, 0.022 * H, 0.004 * H, [chest.x, chest.y - 0.02 * H, chest.z], s.material('#d4b24a', { metalness: 0.8, roughness: 0.3 }), 16).rotation.x = Math.PI / 2 - 0.2;
    }

    // The music folder, black card with a pale page block, held between the hands.
    const left = at(s, person.hands.left), right = at(s, person.hands.right);
    const centre = left.clone().add(right).multiplyScalar(0.5);
    centre.z += 0.02 * H;
    const black = s.material('#0c0c0e', { roughness: 0.9 });
    const paper = s.material('#f7f4ec', { roughness: 0.95 });
    const folder = new THREE.Group();
    folder.position.copy(centre);
    const open = a.folder !== 'shut';
    const w = 0.23 * H, h = 0.3 * H;
    if (open) {
      for (const side of [-1, 1]) {
        const leaf = new THREE.Group();
        leaf.rotation.y = side * (a.posture === 'yawning' ? 0.1 : 0.35);
        const card = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006 * H), black);
        card.position.x = side * w / 2;
        const page = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.94, 0.004 * H), paper);
        page.position.set(side * w / 2, 0, 0.005 * H);
        card.castShadow = page.castShadow = true;
        leaf.add(card, page);
        folder.add(leaf);
      }
      // A page caught mid-turn stands up between the leaves.
      if (a.posture === 'turning') {
        const turning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.92, 0.003 * H), paper);
        turning.position.set(w * 0.12, 0, 0.09 * H);
        turning.rotation.y = -1.25;
        turning.castShadow = true;
        folder.add(turning);
      }
    } else {
      const card = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h, 0.03 * H), black);
      card.position.x = -w * 0.02;
      const pages = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.94, 0.02 * H), paper);
      pages.position.x = w * 0.06;
      card.castShadow = pages.castShadow = true;
      folder.add(card, pages);
    }
    // Lean the folder back toward the face so the pages can be read, more when yawning behind it.
    folder.rotation.x = a.posture === 'yawning' ? -0.9 : low ? -0.75 : -0.5;
    folder.position.y += open ? h * 0.2 : h * 0.1;
    s.root.add(folder);

    // What the chorister stands on: a wooden step, or the stall floor with its carved book ledge.
    const wood = s.material(pick(random, ['#5a3b22', '#7a5230', '#3e2a1a']), { roughness: 0.6 });
    if (a.step === 'step') {
      s.box([0.95, 0.14, 0.62], [hip.x, 0.07, hip.z], wood);
      s.box([0.99, 0.02, 0.66], [hip.x, 0.15, hip.z], s.material('#6b4a2e', { roughness: 0.55 }));
    } else if (a.step === 'stalls') {
      s.box([1.1, 0.22, 0.75], [hip.x, 0.11, hip.z - 0.05], wood);
      // The ledge in front: a slanted desk on turned uprights with a row of hymn books.
      const ledgeZ = hip.z + 0.38;
      for (const x of [-0.5, 0.5]) s.cylinder(0.028, 0.034, 0.75, [hip.x + x, 0.375, ledgeZ], wood, 10);
      const desk = s.box([1.12, 0.03, 0.26], [hip.x, 0.78, ledgeZ], wood);
      desk.rotation.x = 0.35;
      s.box([1.12, 0.04, 0.03], [hip.x, 0.73, ledgeZ + 0.12], wood);
      const books = Math.round(2 + mood.density * 4);
      for (let i = 0; i < books; i++) {
        const book = s.box([0.1, 0.015, 0.15], [hip.x - 0.45 + i * (0.9 / Math.max(1, books - 1)), 0.81 + i % 2 * 0.004, ledgeZ - 0.02], s.material(pick(random, ['#8a1f24', '#1f2a5a', '#2a4a2a']), { roughness: 0.7 }));
        book.rotation.x = 0.35;
      }
      // A carved finial on the stall end beside.
      s.box([0.06, 0.95, 0.55], [hip.x - 0.58, 0.475, hip.z - 0.05], wood);
      s.ball([0.05, 0.06, 0.05], [hip.x - 0.58, 1.0, hip.z - 0.05], wood, 10);
    }

    const energy = mood.energy;
    const sway = a.posture === 'singing' ? 0.02 : 0.006;
    const baseX = folder.rotation.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        folder.rotation.x = baseX + Math.sin(time * (0.8 + energy)) * sway;
      },
    });
  },
});
