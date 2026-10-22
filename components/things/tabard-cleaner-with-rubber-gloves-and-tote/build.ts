import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { SKINS, anatomy, at, busSeat, closeEyes, garment, joints, pick, pole, poseLeg, reachArm, seatPalette } from './bus';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TABARDS = {
  blue: 'A royal blue tabard.',
  green: 'A bottle green tabard.',
  maroon: 'A maroon tabard.',
  grey: 'A grey tabard with a company logo.',
  pink: 'A pink tabard.',
} as const;
const TABARD_COLOUR: Record<keyof typeof TABARDS, string> = { blue: '#2a4fb8', green: '#1f5a3a', maroon: '#6a2232', grey: '#7a7e86', pink: '#d4789a' };

export default defineThing({
  questions: {
    tabard: choice('What colour is her tabard?', TABARDS),
    bag: choice('What sticks out of the tote bag between her feet?', {
      gloves: 'A pair of yellow rubber gloves.',
      mop: 'A grey mop head on a short handle, and the gloves.',
      thermos: 'A steel Thermos flask and the gloves.',
      everything: 'Gloves, a mop head and a Thermos, the bag straining.',
    }),
    holding: choice('What does she hold in her lap?', {
      book: 'A small prayer book, open in both hands.',
      phone: 'A phone, held low, screen lit.',
      hands: 'Nothing: her hands folded on her knees.',
    }),
    eyes: noul('Are her eyes open?'),
    head: choice('What is on her head?', {
      scarf: 'A printed headscarf knotted under the chin.',
      grey: 'Short grey hair, neatly set.',
      hat: 'A knitted woolly hat.',
    }),
    company: choice('What travels beside her?', {
      nothing: 'Nothing: the bare floor.',
      bucket: 'A bucket with a mop handle leaning on the seat.',
      groceries: 'A carrier bag of groceries with a loaf on top.',
      umbrella: 'A folded umbrella dripping against the seat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.52, 1.66, random());
    const build = random() < 0.5 ? 'heavy' : 'average';
    const skin = pick(random, SKINS);
    const cardigan = pick(random, ['#c9b89a', '#6a6a66', '#5a4030', '#8a6a8a', '#3a4a6a']);
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'ahead', skin,
      hair: a.head === 'grey' ? 'short' : 'none', hairColor: pick(random, ['#c9c6c0', '#dad8d2', '#9a9892']),
      top: cardigan, bottom: pick(random, ['#2a2a30', '#3a3540', '#4a4238']), shoes: '#1d1a18', sleeves: 'long',
    });
    s.root.add(person.root);
    const { torsoL, headR, chestR, spine, shoulderW } = anatomy(person, H, build);

    // ---- the tabard over the cardigan: a flat-fronted body with a pocket, cardigan sleeves showing.
    const tabard = s.material(TABARD_COLOUR[a.tabard], { roughness: 0.85 });
    garment(person, H, build, tabard, { grow: 1.1, length: 0.96, lift: -0.02 });
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(chestR * 1.4, torsoL * 0.2, 0.012), tabard);
    pocket.position.set(0, torsoL * 0.3, chestR * 1.1);
    pocket.castShadow = true;
    spine.add(pocket);
    if (a.tabard === 'grey') {
      const logo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.004), s.material('#2a9ad4'));
      logo.position.set(-shoulderW * 0.4, torsoL * 0.8, chestR * 1.1 + 0.004);
      spine.add(logo);
    }
    // Head: scarf, set hair, or hat.
    if (a.head === 'scarf') {
      const print = pick(random, ['#8a2a4a', '#2a4a8a', '#b86a2a', '#4a6a3a']);
      const scarf = s.material(print, { roughness: 1 });
      const wrap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 16, 12, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.8), scarf);
      wrap.position.set(0, headR * 0.05, -headR * 0.05);
      wrap.castShadow = true;
      const knot = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.22, 8, 6), scarf);
      knot.position.set(0, -headR * 0.95, headR * 0.5);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.5, headR * 0.1), scarf);
      tail.position.set(headR * 0.1, -headR * 1.2, headR * 0.45);
      tail.rotation.z = 0.3;
      person.head.add(wrap, knot, tail);
    } else if (a.head === 'hat') {
      const wool = s.material(pick(random, ['#6a2a2a', '#2d3b5e', '#6a6a66', '#8a6a3a']), { roughness: 1 });
      const hat = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), wool);
      hat.position.y = headR * 0.1;
      hat.scale.y = 1.1;
      hat.castShadow = true;
      person.head.add(hat);
    }
    if (!a.eyes) closeEyes(person, headR);

    // ---- bolt upright: straight spine, knees together, feet flat.
    spine.rotation.set(-0.04, 0, 0);
    joints(person, 'left').neck.rotation.set(0, (random() - 0.5) * 0.1, 0);
    poseLeg(person, 'left', { forward: 88, knee: 90, out: 0 });
    poseLeg(person, 'right', { forward: 88, knee: 90, out: 0 });
    person.settle();
    const hips = at(person.pelvis);
    const seatTop = hips.y - 0.045 * H;
    const lap = new THREE.Vector3(hips.x, hips.y + 0.05, hips.z + 0.26);
    for (const side of ['left', 'right'] as const) {
      const shoulder = at(joints(person, side).shoulder);
      const spread = a.holding === 'hands' ? 0.1 : 0.04;
      reachArm(person, side, H, lap.y + 0.06 - shoulder.y, lap.z - 0.06 - shoulder.z, 4, a.holding === 'hands' ? 20 : 40);
      void spread;
    }
    person.root.updateMatrixWorld(true);
    const handL = at(person.hands.left), handR = at(person.hands.right);
    const between = handL.clone().add(handR).multiplyScalar(0.5);
    if (a.holding === 'book') {
      const cover = s.material(pick(random, ['#1a1a1e', '#3a1a1a', '#1f2a4a']), { roughness: 0.5 });
      const pages = s.material('#f1ead6', { roughness: 0.9 });
      for (const side of [-1, 1]) {
        const half = s.box([0.07, 0.006, 0.1], [between.x + side * 0.034, between.y + 0.012, between.z], cover);
        half.rotation.set(-0.6, 0, -side * 0.25);
        const leaf = s.box([0.064, 0.008, 0.094], [between.x + side * 0.033, between.y + 0.019, between.z], pages);
        leaf.rotation.set(-0.6, 0, -side * 0.25);
      }
      s.box([0.002, 0.012, 0.09], [between.x, between.y + 0.012, between.z], s.material('#c8a040', { metalness: 0.5 })).rotation.x = -0.6;
    } else if (a.holding === 'phone') {
      const phone = s.box([0.075, 0.009, 0.15], [between.x, between.y + 0.012, between.z], s.material('#15161a', { roughness: 0.3 }));
      phone.rotation.x = -0.5;
      const screen = s.box([0.066, 0.002, 0.138], [between.x, between.y + 0.017, between.z + 0.003], new THREE.MeshStandardMaterial({ color: '#dfe8ff', emissive: '#bcd0ff', emissiveIntensity: mix(0.6, 1.6, 1 - mood.daylight) }));
      screen.rotation.x = -0.5;
    }

    // ---- the seat, a pole on the aisle side.
    const palette = seatPalette(s, random);
    const seatX = hips.x, seatZ = hips.z + 0.06;
    busSeat(s, palette, { x: seatX, z: seatZ, seatTop, width: 0.46, aisle: 'right', cantilever: true });
    pole(s, palette.yellow, palette.steel, seatX + 0.4, seatZ + 0.12, 1.85);

    // ---- the tote bag between her feet, and what pokes out of it.
    const feetZ = hips.z + 0.4;
    const tote = s.material(pick(random, ['#d8cfb4', '#2b2f3a', '#8a3a3a', '#5a6a8a', '#e8e4dc']), { roughness: 1 });
    const bag = s.mesh(new RoundedBoxGeometry(0.3, 0.34, 0.2, 3, 0.04), tote, [hips.x, 0.17, feetZ]);
    bag.scale.set(1.08, 1, 1.15);
    bag.rotation.y = (random() - 0.5) * 0.3;
    s.ring(0.07, 0.009, [hips.x - 0.06, 0.36, feetZ - 0.07], tote, Math.PI).rotation.y = 0.2;
    s.ring(0.07, 0.009, [hips.x + 0.06, 0.36, feetZ + 0.07], tote, Math.PI).rotation.y = -0.2;
    const rubber = s.material('#f2c230', { roughness: 0.4 });
    const gloveAt = new THREE.Vector3(hips.x + 0.06, 0.37, feetZ);
    for (let i = 0; i < 2; i++) {
      const glove = s.mesh(new THREE.CapsuleGeometry(0.03, 0.11, 3, 8), rubber, [gloveAt.x + i * 0.05, gloveAt.y + 0.02 + i * 0.02, gloveAt.z + (i ? 0.03 : -0.03)]);
      glove.scale.z = 0.5;
      glove.rotation.set(0.2 + i * 0.2, 0, -0.35 + i * 0.7);
      for (let f = 0; f < 3; f++) {
        const finger = s.cylinder(0.008, 0.008, 0.05, [gloveAt.x + i * 0.05 - 0.016 + f * 0.016 + (i ? 0.03 : -0.03), gloveAt.y + 0.1 + i * 0.02, gloveAt.z + (i ? 0.03 : -0.03)], rubber, 6);
        finger.rotation.set(0.2 + i * 0.2, 0, -0.35 + i * 0.7);
      }
    }
    if (a.bag === 'mop' || a.bag === 'everything') {
      const handle = s.rod([hips.x - 0.08, 0.3, feetZ - 0.02], [hips.x - 0.16, 0.72, feetZ - 0.1], 0.012, s.material('#a07a4a', { roughness: 0.7 }));
      void handle;
      const strands = s.material('#b8b4a8', { roughness: 1 });
      for (let i = 0; i < 9; i++) s.rod([hips.x - 0.16, 0.72, feetZ - 0.1], [hips.x - 0.16 + (random() - 0.5) * 0.14, 0.58 + random() * 0.06, feetZ - 0.1 + (random() - 0.5) * 0.14], 0.006, strands);
    }
    if (a.bag === 'thermos' || a.bag === 'everything') {
      const steel = s.material('#b8bcc2', { metalness: 0.8, roughness: 0.3 });
      const flask = s.cylinder(0.04, 0.04, 0.26, [hips.x + (a.bag === 'everything' ? 0.0 : -0.06), 0.36, feetZ + 0.04], steel, 14);
      flask.rotation.set(-0.15, 0, 0.2);
      s.cylinder(0.042, 0.04, 0.05, [flask.position.x - 0.025, 0.49, feetZ + 0.02], s.material('#2a2a2e', { roughness: 0.5 }), 14).rotation.set(-0.15, 0, 0.2);
    }

    // ---- beside her on the floor.
    const sideX = hips.x + 0.42;
    if (a.company === 'bucket') {
      const bucketMat = s.material(pick(random, ['#d4303a', '#2a6ad4', '#3a3a3e', '#f0e020']), { roughness: 0.5 });
      s.cylinder(0.14, 0.11, 0.28, [sideX, 0.14, seatZ + 0.25], bucketMat, 16);
      s.cylinder(0.11, 0.11, 0.02, [sideX, 0.28, seatZ + 0.25], s.material('#6a7a86', { roughness: 0.9 }), 16);
      s.rod([sideX + 0.02, 0.28, seatZ + 0.25], [sideX + 0.1, 1.3, seatZ - 0.05], 0.012, s.material('#a07a4a', { roughness: 0.7 }));
    } else if (a.company === 'groceries') {
      const carrier = s.material(pick(random, ['#f4f4f0', '#e8702a', '#2a6a3a']), { roughness: 0.9 });
      s.box([0.26, 0.28, 0.2], [sideX, 0.14, seatZ + 0.22], carrier).rotation.y = 0.3;
      s.ring(0.06, 0.008, [sideX, 0.3, seatZ + 0.22], carrier, Math.PI).rotation.y = 0.3;
      const loaf = s.mesh(new THREE.CapsuleGeometry(0.05, 0.14, 4, 10), s.material('#d9a85a', { roughness: 0.9 }), [sideX, 0.32, seatZ + 0.22]);
      loaf.rotation.set(0, 0.3, Math.PI / 2);
    } else if (a.company === 'umbrella') {
      const brolly = s.material(pick(random, ['#1a1a1e', '#2a3a8a', '#8a1a2a', '#3a6a3a']), { roughness: 0.4 });
      const tip = s.rod([sideX - 0.06, 0.01, seatZ + 0.3], [sideX + 0.02, 0.62, seatZ - 0.12], 0.02, brolly, 0.03);
      void tip;
      s.cylinder(0.012, 0.012, 0.1, [sideX + 0.03, 0.68, seatZ - 0.18], s.material('#3a2a20', { roughness: 0.6 }), 8).rotation.set(0.6, 0, 0.1);
      s.cylinder(0.08, 0.1, 0.004, [sideX - 0.06, 0.002, seatZ + 0.3], new THREE.MeshStandardMaterial({ color: '#8a9aa8', roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.6, depthWrite: false }), 16);
    }

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
