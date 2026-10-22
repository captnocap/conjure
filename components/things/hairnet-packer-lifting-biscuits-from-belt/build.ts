import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { HAIRS, type P, SKINS, at, biscuitGeometry, biscuitMaterial, biscuitRows, bow, coatSkirt, conveyor, ground, hairnet, joints, lean, look, pick, poseLeg, radio, reach, trayStack } from './rig';

const OVERALLS = { white: '#efece4', blue: '#4e6f9c', mint: '#9fc4b4' } as const;

export default defineThing({
  questions: {
    biscuits: choice('What is coming down the belt?', {
      round: 'Plain round golden biscuits, digestives or rich tea.',
      rectangular: 'Oblong biscuits with crimped edges, custard creams or bourbons.',
      chocolate: 'Chocolate-coated rounds, dark and glossy.',
    }),
    overall: choice('What colour is her overall?', {
      white: 'A white overall coat, the standard issue.',
      blue: 'A mid-blue overall coat.',
      mint: 'A pale mint-green overall coat.',
    }),
    action: choice('What is she doing this instant?', {
      lifting: 'Mid-lift: a handful of biscuits between both hands, moving them to the tray.',
      resting: 'Resting her wrists on the rail, watching the biscuits go by.',
    }),
    belt: choice('What is the belt like in front of her?', {
      steady: 'Full even rows, the line running as it should.',
      thin: 'Gappy rows: the oven upstream is behind.',
      pileup: 'A pile-up: biscuits bunched and overlapping where someone stopped.',
    }),
    trays: score('How many empty trays are stacked beside her?', ['One tray, the shift just started', 'A few trays', 'A tall stack of trays']),
    age: choice('How old is she?', {
      young: 'A teenager on her first job, slight and quick.',
      middle: 'Thirties or forties, steady and practised.',
      older: 'Grey-haired, been here since the place opened.',
    }),
    radio: noul('Is a transistor radio propped on the belt frame?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = { young: mix(1.52, 1.64, random()), middle: mix(1.56, 1.72, random()), older: mix(1.5, 1.64, random()) }[a.age];
    const build = a.age === 'young' ? 'slight' : random() < 0.4 ? 'heavy' : 'average';
    const skin = pick(random, SKINS);
    const overall = OVERALLS[a.overall];
    const person = figure(s, {
      height: H, build, style: 'doll', skin, sleeves: 'long',
      hair: 'bun', hairColor: a.age === 'older' ? pick(random, ['#c9c4bc', '#a8a39c', '#e0dcd4']) : pick(random, HAIRS),
      top: overall, bottom: pick(random, ['#2e3440', '#3a3a3a', '#4a4238', '#5a5a60']), shoes: '#26262a',
      pose: 'standing', gaze: 'down',
    });
    s.root.add(person.root);
    const cloth = s.material(overall, { roughness: 0.9 });
    coatSkirt(person, H, build, cloth, 0.2);
    hairnet(s, person, H);
    // A row of overall buttons down the front.
    const { spine } = joints(person, 'left');
    const torsoL = H * 0.28, chestR = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build] * 1.35 * (build === 'heavy' ? 1.25 : 1);
    for (let i = 0; i < 4; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#d8d2c4'));
      button.position.set(0, torsoL * (0.2 + i * 0.2), chestR + 0.002);
      spine.add(button);
    }

    // The belt in front of her, running left to right.
    const belt = conveyor(s, { length: 1.9, width: 0.6, height: 0.9, at: [0, 0, 0.44], endRoller: 'none' });
    const top = belt.top;
    const beltZ = 0.44;
    const gaps = { steady: 0.04, thin: 0.45, pileup: 0.08 }[a.belt];
    biscuitRows(s, a.biscuits, { from: [-0.93, top, beltZ], length: 1.86, width: 0.44, rows: a.biscuits === 'round' || a.biscuits === 'chocolate' ? 4 : 3, pitch: a.biscuits === 'round' || a.biscuits === 'chocolate' ? 0.085 : 0.075, gaps, random });
    if (a.belt === 'pileup') {
      // A heap where the rows bunched up, biscuits tipped at angles.
      const heapX = -0.35 + random() * 0.3;
      const mesh = s.scatter(biscuitGeometry(a.biscuits), biscuitMaterial(s, a.biscuits), Array.from({ length: 22 }, () => ({ at: [heapX + (random() - 0.5) * 0.3, top + random() * 0.05, beltZ + (random() - 0.5) * 0.4] as P, size: 1 })));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 22; i++) {
        mesh.getMatrixAt(i, m);
        const p = new THREE.Vector3().setFromMatrixPosition(m);
        e.set((random() - 0.5) * 1.2, random() * 6.3, (random() - 0.5) * 1.2);
        m.compose(p, q.setFromEuler(e), new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // She stands at the near side, a little stooped over the belt.
    const lifting = a.action === 'lifting';
    lean(person, lifting ? 4 : 2);
    bow(person, lifting ? 14 : 8);
    look(person, lifting ? 32 : 22, lifting ? -6 : 10);
    poseLeg(person, 'left', { out: 4 });
    poseLeg(person, 'right', { out: 4 });
    person.root.position.set(0, 0, 0);
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);
    person.root.position.z = beltZ - 0.3 - 0.14 - hips.z;
    person.root.updateMatrixWorld(true);

    // The tray on the belt's near rail, where the handful is going.
    const trayX = 0.3, trayZ = beltZ - 0.18;
    const card = s.material('#b9915c', { roughness: 0.95 });
    s.box([0.3, 0.008, 0.22], [trayX, top + 0.075, trayZ], card);
    for (const side of [-1, 1]) {
      s.box([0.3, 0.04, 0.008], [trayX, top + 0.095, trayZ + side * 0.106], card);
      s.box([0.008, 0.04, 0.22], [trayX + side * 0.146, top + 0.095, trayZ], card);
    }
    const packed = Math.floor(random() * 10) + 2;
    s.scatter(biscuitGeometry(a.biscuits), biscuitMaterial(s, a.biscuits), Array.from({ length: packed }, (_u, i) => ({ at: [trayX - 0.11 + (i % 4) * 0.07, top + 0.08 + Math.floor(i / 4) * 0.01, trayZ - 0.06 + Math.floor(i / 4) * 0.06] as P, size: 1 })));

    if (lifting) {
      // Both hands meet over the belt holding a small stack, on its way to the tray.
      const meet = new THREE.Vector3(0.08, top + 0.16, beltZ - 0.14);
      reach(person, 'left', meet.clone().add(new THREE.Vector3(0.06, 0.01, 0)), { forward: [20, 90], out: [-5, 25], bend: [10, 110], across: [0, 50] });
      reach(person, 'right', meet.clone().add(new THREE.Vector3(-0.06, -0.01, 0)), { forward: [20, 90], out: [-5, 25], bend: [10, 110], across: [0, 50] });
      const l = at(person.hands.left), r = at(person.hands.right);
      const mid = l.clone().add(r).multiplyScalar(0.5);
      const held = s.scatter(biscuitGeometry(a.biscuits), biscuitMaterial(s, a.biscuits), Array.from({ length: 4 }, (_u, i) => ({ at: [mid.x - 0.03 + i * 0.02, mid.y - 0.01 + i * 0.004, mid.z + (i % 2) * 0.01] as P, size: 1 })));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, Math.PI / 2 - 0.3));
      for (let i = 0; i < 4; i++) { held.getMatrixAt(i, m); const p = new THREE.Vector3().setFromMatrixPosition(m); m.compose(p, q, new THREE.Vector3(1, 1, 1)); held.setMatrixAt(i, m); }
      held.instanceMatrix.needsUpdate = true;
    } else {
      // Wrists on the near rail, hands hanging over the belt.
      for (const side of ['left', 'right'] as const) {
        const x = side === 'left' ? 0.17 : -0.17;
        reach(person, side, new THREE.Vector3(x, top + 0.08, beltZ - 0.27), { forward: [10, 80], out: [-5, 20], bend: [0, 90], across: [-10, 30] });
      }
    }
    ground(person);

    // Empty trays stacked on a low steel stand at her left hand, and the radio on the rail.
    const stand = s.material('#8e9497', { metalness: 0.6, roughness: 0.45 });
    const standX = 0.78, standZ = beltZ - 0.45;
    s.box([0.4, 0.03, 0.3], [standX, 0.5, standZ], stand);
    for (const dx of [-0.17, 0.17]) for (const dz of [-0.12, 0.12]) s.box([0.03, 0.5, 0.03], [standX + dx, 0.25, standZ + dz], stand);
    const trays = 1 + Math.round(a.trays * 11);
    trayStack(s, [standX, 0.515, standZ], trays, { random, width: 0.3, depth: 0.22 });
    if (a.radio) radio(s, [-0.62, top + 0.065, beltZ - 0.285], 0.15, pick(random, ['#c8c2b0', '#8a2a2a', '#2a3a5a', '#d9c28a']));
    // Crumbs along the belt edge once the shift has worn on.
    if (mood.wear > 0.35) {
      const crumbs = s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#c9a06a', { roughness: 1 }), Array.from({ length: Math.round(mix(4, 16, mood.wear)) }, () => ({ at: [(random() - 0.5) * 1.6, top + 0.004, beltZ - 0.33 + (random() - 0.5) * 0.1] as P, size: 0.005 + random() * 0.006 })));
      crumbs.castShadow = false;
    }

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
