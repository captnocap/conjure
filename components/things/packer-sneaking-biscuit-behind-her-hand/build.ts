import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { HAIRS, type P, SKINS, anatomy, at, biscuitGeometry, biscuitMaterial, biscuitRows, bow, coatSkirt, conveyor, ground, hairnet, joints, lean, look, mug, pick, poseLeg, reach } from './rig';

const OVERALLS = { white: '#efece4', blue: '#4e6f9c', mint: '#9fc4b4', pink: '#d9a0b0' } as const;

export default defineThing({
  questions: {
    biscuit: choice('What has she taken?', {
      plain: 'A plain golden round.',
      chocolate: 'A chocolate-coated one, the good ones.',
      cream: 'A custard cream, oblong and sandwiched.',
    }),
    overall: choice('What colour is her overall?', {
      white: 'A white overall coat.',
      blue: 'A mid-blue overall coat.',
      mint: 'A pale mint-green overall coat.',
      pink: 'A faded pink overall coat.',
    }),
    moment: choice('What exactly is she doing?', {
      bite: 'Mid-bite: the hand cupped over her mouth, the biscuit half gone.',
      pocket: 'Slipping it into her overall pocket, the hand low and flat.',
    }),
    glance: choice('Where is she looking?', {
      back: 'Back over her shoulder at the line, checking for the supervisor.',
      ahead: 'Straight ahead, bland, as if nothing is happening.',
    }),
    belt: choice('What is on the belt beside her?', {
      rows: 'Full rows of biscuits going by.',
      gap: 'A row with one gap in it, where she took hers.',
      empty: 'An empty belt: the run has finished.',
    }),
    age: choice('How old is she?', {
      young: 'A teenager, all elbows.',
      middle: 'Thirties or forties, done this before.',
      older: 'Older, grey under the net, unrepentant.',
    }),
    tea: noul('Is a second worker\'s mug of tea standing on the rail?'),
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
      pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const cloth = s.material(overall, { roughness: 0.9 });
    coatSkirt(person, H, build, cloth, 0.2);
    hairnet(s, person, H);
    const { torsoL, chestR, headR } = anatomy(H, build);
    const { spine } = joints(person, 'left');
    for (let i = 0; i < 4; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#d8d2c4'));
      button.position.set(0, torsoL * (0.2 + i * 0.2), chestR + 0.002);
      spine.add(button);
    }
    // The overall's hip pocket, on her right.
    const pocketMesh = new THREE.Mesh(new THREE.BoxGeometry(H * 0.08, H * 0.07, 0.008), cloth);
    pocketMesh.position.set(-H * 0.07, torsoL * 0.02, chestR + 0.004);
    spine.add(pocketMesh);

    // The end of the belt, running left to right and stopping at her.
    const beltZ = 0.46, beltLength = 1.3;
    const belt = conveyor(s, { length: beltLength, width: 0.6, height: 0.9, at: [0.25, 0, beltZ], endRoller: 'right' });
    const top = belt.top;
    const kind = a.biscuit === 'plain' ? 'round' : a.biscuit === 'chocolate' ? 'chocolate' : 'cream';
    if (a.belt !== 'empty') {
      const rows = kind === 'cream' ? 3 : 4;
      const mesh = biscuitRows(s, kind, { from: [0.25 - beltLength / 2 + 0.02, top, beltZ], length: beltLength - 0.06, width: 0.44, rows, pitch: kind === 'cream' ? 0.075 : 0.085, gaps: 0.03, random });
      if (a.belt === 'gap' && mesh) {
        // Pull one biscuit from the nearest row at the end, where her hand was.
        const m = new THREE.Matrix4();
        const nearest = { i: -1, score: -Infinity };
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, m);
          const p = new THREE.Vector3().setFromMatrixPosition(m);
          const score = -p.x - p.z * 2;
          if (score > nearest.score) nearest.i = i, nearest.score = score;
        }
        if (nearest.i >= 0) { m.makeScale(0.0001, 0.0001, 0.0001); mesh.setMatrixAt(nearest.i, m); mesh.instanceMatrix.needsUpdate = true; }
      }
    } else if (mood.wear > 0.3) {
      const crumbs = s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#c9a06a', { roughness: 1 }), Array.from({ length: 14 }, () => ({ at: [0.25 + (random() - 0.5) * 1.1, top + 0.004, beltZ + (random() - 0.5) * 0.4] as P, size: 0.004 + random() * 0.006 })));
      crumbs.castShadow = false;
    }
    if (a.tea) mug(s, [-0.2, top + 0.065, beltZ - 0.285], { tea: true, colour: pick(random, ['#f1ede4', '#d9c9a8', '#6a8aa8', '#c9402a']), yaw: random() * 6.3 });

    // Half-turned from the line, shoulders hunched, the left hand still on the near rail.
    const bite = a.moment === 'bite';
    person.root.rotation.y = -1.1;
    lean(person, 3);
    bow(person, bite ? 12 : 8);
    poseLeg(person, 'left', { out: 4, forward: 4 });
    poseLeg(person, 'right', { out: 6, forward: -4 });
    person.root.position.set(0, 0, 0);
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);
    person.root.position.x = -0.42 - hips.x;
    person.root.position.z = beltZ - 0.3 - 0.2 - hips.z;
    person.root.updateMatrixWorld(true);
    reach(person, 'left', new THREE.Vector3(-0.22, top + 0.075, beltZ - 0.29), { forward: [-20, 90], out: [-10, 60], bend: [0, 90], across: [-60, 40] });
    // The hand cupped to the mouth, or dropping to the pocket.
    const mouth = person.head.localToWorld(new THREE.Vector3(0, -headR * 0.25, headR * 0.95));
    const facing = new THREE.Vector3(Math.sin(person.root.rotation.y), 0, Math.cos(person.root.rotation.y));
    if (bite) {
      const target = mouth.clone().addScaledVector(facing, 0.06).add(new THREE.Vector3(0, -0.03, 0));
      reach(person, 'right', target, { forward: [40, 140], out: [-10, 40], bend: [60, 140], across: [0, 70] });
    } else {
      const pocketWorld = spine.localToWorld(new THREE.Vector3(-H * 0.07, torsoL * 0.02, chestR + 0.06));
      reach(person, 'right', pocketWorld, { forward: [-10, 60], out: [-10, 30], bend: [0, 90], across: [-10, 60] });
    }
    // Hunched: shoulders rolled up and in.
    for (const side of ['left', 'right'] as const) joints(person, side).shoulder.position.y += H * 0.012;
    if (a.glance === 'back') look(person, bite ? 4 : 8, 95, -6);
    else look(person, bite ? 6 : 2, 8);
    ground(person);

    // The biscuit: at the mouth with a bite out of it, or disappearing into the pocket.
    const biscuit = kind === 'cream' ? new THREE.BoxGeometry(0.062, 0.011, 0.042) : new THREE.CylinderGeometry(0.034, 0.034, 0.009, 16, 1, false, 0, bite ? Math.PI * 1.45 : Math.PI * 2);
    const paint = biscuitMaterial(s, kind);
    if (bite) {
      const m = person.head.localToWorld(new THREE.Vector3(0, -headR * 0.25, headR * 0.95));
      const held = s.mesh(biscuit, paint, [m.x + facing.x * 0.035, m.y - 0.005, m.z + facing.z * 0.035]);
      held.rotation.set(Math.PI / 2, person.root.rotation.y, 0.4);
    } else {
      const right = at(person.hands.right);
      const held = s.mesh(biscuit, paint, [right.x + facing.x * 0.02, right.y + 0.03, right.z + facing.z * 0.02]);
      held.rotation.set(Math.PI / 2 + 0.3, person.root.rotation.y, 0);
    }
    void biscuitGeometry;

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
