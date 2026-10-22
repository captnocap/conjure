import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';
import { type PigeonSpot, parkBench, pigeons, trolleyBag } from './park';
import { at, headscarf, hipsAt, joints, overTorso, pick, reachPoint, seat, skinTones, smile } from './pose';

export default defineThing({
  questions: {
    flock: choice('How many pigeons has she drawn?', {
      few: 'Three or four, the early ones.',
      dozen: 'A dozen or so, crowding her shoes.',
      flock: 'A whole flock, thirty of them, the ground grey with birds.',
    }),
    coat: choice('What does she wear?', {
      camel: 'A camel wool coat buttoned to the neck.',
      black: 'A black wool coat and thick stockings.',
      red: 'A red quilted coat, too bright for her.',
      green: 'A bottle-green raincoat.',
      purple: 'A purple padded coat with a fur collar.',
    }),
    head: choice('What covers her head?', {
      floral: 'A floral headscarf knotted under the chin.',
      plain: 'A plain dark headscarf.',
      knitted: 'A knitted hat.',
      bare: 'Nothing: grey hair pinned in a bun.',
    }),
    feed: choice('What does she feed them from?', {
      bag: 'A brown paper bag of crumbs held in her lap.',
      loaf: 'The heel of a loaf she tears with her fingers.',
      tin: 'A seed tin she shakes out.',
    }),
    look: choice('How does she look at them?', {
      smiles: 'Smiling down at the birds, talking to them.',
      stares: 'Staring past them at nothing, the hand scattering on its own.',
      watches: 'Watching one particular pigeon as if she knows it.',
    }),
    bag: choice('What stands beside her?', {
      trolley: 'A tartan shopping trolley bag.',
      handbag: 'A black handbag set on the bench.',
      stick: 'A walking stick hooked over the bench arm.',
      nothing: 'Nothing: she brought only the bread.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.5, 1.64, random());
    const build = random() < 0.55 ? 'heavy' : 'average';
    const skin = pick(random, skinTones);
    const coat = { camel: '#c2a070', black: '#1f1f22', red: '#b8302a', green: '#2d4a3a', purple: '#5a3a6a' }[a.coat];
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', skin, sleeves: 'long',
      gaze: a.look === 'stares' ? 'ahead' : 'down',
      hair: a.head === 'bare' ? 'bun' : 'short', hairColor: pick(random, ['#b8b4ac', '#d8d4cc', '#8a8680']),
      top: coat, bottom: a.coat === 'black' ? '#2a2a2c' : pick(random, ['#3a3a40', '#4a4238', '#5a4a5a']), shoes: '#2a211b',
    });
    s.root.add(person.root);
    const bench = parkBench(s, { length: 1.7, wood: pick(random, ['#8a6a44', '#6b5a3a', '#5a7a5a']), iron: '#2f3a34' });
    const sitX = (random() - 0.5) * 0.3;
    hipsAt(person, sitX, 0.02, 0);
    seat(person, bench.seatY + 0.045 * H);
    const limb = H * 0.036 * (build === 'heavy' ? 1.3 : 1);
    const torsoL = H * 0.28;
    const { spine, neck } = joints(person, 'left');

    // ---- coat and head
    if (a.coat === 'red' || a.coat === 'purple') {
      overTorso(s, person, H, build, s.material(coat, { roughness: 0.6 }), { grow: 1.22, length: 0.98 });
      if (a.coat === 'purple') {
        const fur = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.7, limb * 0.5, 8, 18), s.material('#8a7a6a', { roughness: 1 }));
        fur.rotation.x = Math.PI / 2;
        fur.position.y = torsoL + limb * 0.15;
        fur.scale.x = 1.4;
        spine.add(fur);
      }
    } else {
      const buttons = a.coat === 'green' ? 3 : 5;
      for (let i = 0; i < buttons; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), s.material(a.coat === 'camel' ? '#5a3a1a' : '#1a1a1c'));
        button.position.set(0, torsoL * (0.15 + i * 0.16), limb * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.004);
        spine.add(button);
      }
    }
    if (a.head === 'floral' || a.head === 'plain') headscarf(s, person, H, a.head === 'floral' ? pick(random, ['#c9a0b8', '#d9c27a', '#8ab0c9']) : pick(random, ['#2a2a30', '#4a3a3a', '#3a4a5a']));
    if (a.head === 'knitted') {
      const headR = H * 0.064;
      const wool = s.material(pick(random, ['#8a1f2a', '#4a6a8a', '#d9c27a', '#6b4a2e']), { roughness: 1 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), wool);
      dome.position.y = headR * 0.05;
      dome.scale.y = 1.12;
      const bobble = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.3, 8, 6), wool);
      bobble.position.y = headR * 1.25;
      dome.castShadow = true;
      person.head.add(dome, bobble);
    }
    if (a.look === 'smiles') smile(s, person, H);
    spine.rotation.x = a.look === 'stares' ? 0.05 : 0.28;
    neck.rotation.x = a.look === 'stares' ? -0.05 : a.look === 'watches' ? 0.45 : 0.35;
    neck.rotation.y = a.look === 'watches' ? 0.4 : 0;

    // ---- the scattering hand, and the bread in the lap
    const hips = at(person.pelvis);
    const throwSide = random() < 0.5 ? 'right' : 'left';
    const holdSide = throwSide === 'right' ? 'left' : 'right';
    const sign = throwSide === 'right' ? -1 : 1;
    reachPoint(person, throwSide, { x: hips.x + sign * 0.36, y: hips.y + 0.08, z: hips.z + 0.45 }, { out: 30 }, 'hand', { forward: [20, 90], bend: [0, 40] });
    reachPoint(person, holdSide, { x: hips.x - sign * 0.08, y: hips.y + 0.1, z: hips.z + 0.3 }, { out: 6 }, 'hand', { forward: [20, 90], bend: [30, 120], across: [-60, 0] });
    const hold = at(person.hands[holdSide]);
    if (a.feed === 'bag') {
      const bag = s.box([0.1, 0.13, 0.07], [hold.x, hold.y - 0.02, hold.z + 0.02], s.material('#b89060', { roughness: 1 }));
      bag.rotation.set(-0.3, (random() - 0.5) * 0.4, 0);
      s.box([0.1, 0.03, 0.03], [hold.x, hold.y + 0.05, hold.z + 0.04], s.material('#a8805a', { roughness: 1 })).rotation.x = -0.3;
    } else if (a.feed === 'loaf') {
      const crust = s.material('#b87a3a', { roughness: 0.95 });
      s.ball([0.045, 0.035, 0.06], [hold.x, hold.y - 0.01, hold.z + 0.02], crust, 10);
      s.ball([0.035, 0.025, 0.035], [hold.x - sign * 0.03, hold.y - 0.02, hold.z + 0.04], s.material('#e8d8b0', { roughness: 1 }), 8);
    } else {
      const tin = s.material('#b8bcbd', { metalness: 0.6, roughness: 0.4 });
      s.cylinder(0.035, 0.035, 0.09, [hold.x, hold.y - 0.01, hold.z + 0.02], tin, 12);
      s.cylinder(0.036, 0.036, 0.008, [hold.x, hold.y + 0.04, hold.z + 0.02], s.material('#8a1f2a', { roughness: 0.5 }), 12);
    }
    // Crumbs in the air and on the ground in front of her.
    const crumb = s.material('#d9c27a', { roughness: 1 });
    const throwing = at(person.hands[throwSide]);
    s.scatter(new THREE.SphereGeometry(1, 5, 4), crumb, Array.from({ length: 10 }, (_u, i) => ({ at: [throwing.x + sign * (0.05 + i * 0.05) + (random() - 0.5) * 0.08, throwing.y - 0.02 - i * i * 0.006 + random() * 0.02, throwing.z + 0.06 + i * 0.05 + (random() - 0.5) * 0.08] as const, size: 0.006 + random() * 0.004 })));
    s.scatter(new THREE.CylinderGeometry(1, 1, 0.3, 6), crumb, Array.from({ length: 40 + Math.round(mood.density * 40) }, () => ({ at: [hips.x + (random() - 0.5) * 1.8, 0.003, 0.3 + random() * 1.1] as const, size: 0.007 + random() * 0.006 })));

    // ---- the pigeons
    const count = { few: 3 + Math.floor(random() * 2), dozen: 10 + Math.floor(random() * 4), flock: 26 + Math.floor(random() * 8) }[a.flock];
    const spots: PigeonSpot[] = [];
    for (let tries = 0; tries < 400 && spots.length < count; tries++) {
      const radius = a.flock === 'flock' ? 1.3 : 0.9;
      const angle = (random() - 0.5) * Math.PI * 1.1;
      const distance = 0.3 + random() * radius;
      const x = hips.x + sign * 0.15 + Math.sin(angle) * distance, z = 0.25 + Math.cos(angle) * distance;
      if (spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < 0.17)) continue;
      const toward = Math.atan2(hips.x - x, 0.3 - z);
      spots.push({ x, z, yaw: toward + (random() - 0.5) * 1.6, pecking: random() < 0.45 });
    }
    // The bold one on the bench arm, facing her.
    const armSide = random() < 0.5 ? -1 : 1;
    spots.push({ x: armSide * (bench.length / 2 - 0.08), z: -0.02, y: bench.armY + 0.012, yaw: -armSide * Math.PI / 2 + (random() - 0.5) * 0.5, colour: '#e8e6e0' });
    pigeons(s, spots);

    // ---- what she brought
    const bagSide = -armSide;
    if (a.bag === 'trolley') trolleyBag(s, [bagSide * (bench.length / 2 + 0.28), 0, 0.12], bagSide * 0.5, pick(random, ['#5a2a3a', '#2a3a5a', '#3a4a2a']));
    else if (a.bag === 'handbag') {
      const leather = s.material('#1f1a18', { roughness: 0.5 });
      const bx = hips.x + bagSide * 0.42;
      s.box([0.26, 0.18, 0.1], [bx, bench.seatY + 0.09, 0.02], leather);
      s.ring(0.07, 0.008, [bx, bench.seatY + 0.2, 0.02], leather, Math.PI).rotation.z = 0;
    } else if (a.bag === 'stick') {
      const stickX = bagSide * (bench.length / 2 - 0.08);
      s.rod([stickX + bagSide * 0.05, 0.01, 0.3], [stickX + bagSide * 0.03, bench.armY + 0.02, 0.0], 0.011, s.material('#4a2f1b', { roughness: 0.6 }), 0.013);
      s.ring(0.03, 0.01, [stickX + bagSide * 0.03, bench.armY + 0.03, 0.0], s.material('#4a2f1b', { roughness: 0.6 }), Math.PI).rotation.y = Math.PI / 2;
    }

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        const hand = person.hands[throwSide].parent as THREE.Object3D;
        hand.rotation.z = Math.sin(time * (1.5 + energy * 3)) * 0.25 * (0.3 + energy);
      },
    });
  },
});
