import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { anatomy, at, bentwoodChair, bottleGeometry, clothTable, garment, glassGeometry, glassMaterial, moustache, pick, pickSkin, pocketSquare, reachHand, rig, shirtFront, slick } from './milonga';

export default defineThing({
  questions: {
    moment: choice('What is he doing right now?', {
      cabeceo: 'The cabeceo: upright, chin lifted, head turned across the room, holding a look until it is answered.',
      waiting: 'Waiting: chin down, hands folded, watching the floor and pretending not to.',
      toast: 'Raising his glass a little to someone across the room.',
      rising: 'The nod was answered: one hand on the table, weight forward, about to stand.',
    }),
    drink: choice('What is on the table?', {
      wine: 'A glass of red wine and the bottle.',
      espresso: 'A small espresso cup on its saucer and a glass of water.',
      both: 'An espresso and a glass of red, the long version of the evening.',
      water: 'Only a glass of water: he came to dance, not to drink.',
    }),
    hat: choice('Where is his hat?', {
      table: 'A felt hat set brim-down on the cloth beside the glass.',
      head: 'On his head, the brim low.',
      none: 'No hat.',
    }),
    chair: choice('How is his chair?', {
      tucked: 'Tucked in close to the table, settled for the evening.',
      pushed: 'Pushed back a hand-width from the table, ready to rise.',
    }),
    square: choice('What is in his breast pocket?', {
      white: 'A white pocket square folded sharp.',
      red: 'A red pocket square, the one flash of colour.',
      burgundy: 'A burgundy silk square.',
      none: 'Nothing.',
    }),
    hair: choice('What is his hair like?', {
      grey: 'Grey, short and combed back.',
      white: 'White, thin, carefully combed.',
      bald: 'Bald, with a polished scalp.',
      dark: 'Still dark, slicked back, dyed perhaps.',
    }),
    second: choice('What is beside him?', {
      empty: 'A second empty chair, waiting.',
      shawl: 'A second chair with a shawl left over its back.',
      none: 'Nothing: one chair, one man.',
    }),
    tie: noul('Is he wearing a tie?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.66, 1.8, random());
    const build = random() < 0.4 ? 'heavy' : 'average';
    const skin = pickSkin(random);
    const suitColour = pick(random, ['#23232a', '#2a2a36', '#3a3230', '#1d1d24']);
    const hairColour = { grey: pick(random, ['#b5b2ab', '#8a8780']), white: '#e3e0d8', bald: '#000000', dark: '#1f1612' }[a.hair];

    // ---- the man, sitting upright at the table
    const person = figure(s, {
      height: H, build, style: 'doll', skin, hair: a.hat === 'head' ? 'hat' : 'none', hairColor: '#2a2320',
      top: suitColour, bottom: suitColour, shoes: '#0e0d0f', sleeves: 'long', pose: 'sitting', gaze: 'right',
    });
    s.root.add(person.root);
    const pose = rig(person);
    const rising = a.moment === 'rising';
    const pushed = a.chair === 'pushed' || rising;
    pose.leg('left', { forward: rising ? 70 : 86, out: 6, knee: rising ? 80 : 88 });
    pose.leg('right', { forward: rising ? 96 : 86, out: 6, knee: rising ? 104 : 88 });
    pose.bow(rising ? 22 : a.moment === 'waiting' ? 8 : -5, 0, 0);
    const turn = a.moment === 'waiting' ? -14 : a.moment === 'rising' ? -30 : -46;
    pose.look(a.moment === 'cabeceo' ? -10 : a.moment === 'waiting' ? 22 : rising ? 2 : -4, turn, a.moment === 'cabeceo' ? -4 : 0);
    person.settle();
    const hip = at(s, person.pelvis);
    const { limb, headR, torsoL, chestR } = anatomy(H, build);

    // ---- the chair under him and the table before him, built to fit
    const wood = s.material(pick(random, ['#4a3222', '#5a3a26', '#3a2a1e']), { roughness: 0.55 });
    const cane = s.material('#c9b47a', { roughness: 0.9 });
    const seatH = person.hipHeight - limb * 1.1 - 0.01;
    bentwoodChair(s, hip.x, hip.z - 0.04, 0, wood, seatH, cane);
    const tableZ = hip.z + (pushed ? 0.62 : 0.5);
    const tableR = 0.36;
    const tableH = clothTable(s, hip.x, tableZ, { radius: tableR, height: 0.74 });
    const front = tableZ - tableR;

    // ---- hands: folded on the cloth, one on the glass, or one braced on the edge
    const glassAt = new THREE.Vector3(hip.x - 0.12, tableH, tableZ - 0.1);
    if (a.moment === 'toast') {
      reachHand(s, person, 'right', new THREE.Vector3(hip.x - 0.2, tableH + 0.24, front + 0.1), { outMin: 0, outMax: 40, forwardMax: 80 });
      reachHand(s, person, 'left', new THREE.Vector3(hip.x + 0.1, tableH + 0.02, front + 0.12), { outMin: -5, outMax: 30, forwardMax: 70 });
      s.root.updateMatrixWorld(true);
      glassAt.copy(at(s, person.hands.right)).add(new THREE.Vector3(0, -0.05, 0.03));
    } else if (rising) {
      reachHand(s, person, 'right', new THREE.Vector3(hip.x - 0.18, tableH + 0.02, front + 0.02), { outMin: 0, outMax: 40, forwardMax: 80 });
      reachHand(s, person, 'left', new THREE.Vector3(hip.x + 0.14, person.hipHeight + 0.1, hip.z + 0.3), { outMin: -5, outMax: 30, forwardMax: 70 });
    } else {
      reachHand(s, person, 'left', new THREE.Vector3(hip.x + 0.02, tableH + 0.02, front + 0.12), { across: true, outMin: -5, outMax: 30, forwardMax: 75 });
      reachHand(s, person, 'right', new THREE.Vector3(hip.x - 0.02, tableH + 0.055, front + 0.11), { across: true, outMin: -5, outMax: 30, forwardMax: 75 });
    }

    // ---- the suit: jacket with lapels, shirt, tie, pocket square; hair and a moustache
    const jacketMat = s.material(suitColour, { roughness: 0.85, side: THREE.DoubleSide });
    garment(person, H, build, jacketMat, { grow: 1.12, length: 1.02, open: 36, flare: 1.08, lift: -0.02 });
    for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(chestR * 0.34, torsoL * 0.44, 0.012), jacketMat);
      lapel.position.set(side * chestR * 0.42, torsoL * 0.72, chestR * 1.06);
      lapel.rotation.set(0, side * 0.5, side * 0.12);
      person.joints.spine.add(lapel);
    }
    shirtFront(s, person, H, build, { tie: a.tie ? 'tie' : 'none', tieColour: pick(random, ['#7a1f2a', '#1f2a4a', '#2a2a30', '#5a3a1a']) });
    if (a.square !== 'none') pocketSquare(person, H, build, s.material({ white: '#f1ece2', red: '#b3202c', burgundy: '#6a1a2e' }[a.square], { roughness: 0.9 }));
    const hairMat = s.material(hairColour, { roughness: 0.4 });
    if (a.hair !== 'bald' && a.hat !== 'head') slick(person, H, hairMat);
    if (random() < 0.6) moustache(person, H, s.material(a.hair === 'dark' ? '#1f1612' : '#9a9690', { roughness: 0.6 }));

    // ---- what is on the cloth
    const glass = glassMaterial('#eef3f0', 0.32);
    const wine = s.material('#5a0f1e', { roughness: 0.3 });
    const wineGlass = (x: number, y: number, z: number) => {
      s.mesh(glassGeometry('wine'), glass, [x, y, z]).castShadow = false;
      s.lathe([[0, 0.078], [0.029, 0.082], [0.034, 0.105], [0, 0.11]], wine, [x, y, z]);
    };
    const waterGlass = (x: number, z: number) => s.mesh(glassGeometry('tumbler'), glass, [x, tableH, z]).castShadow = false;
    const espresso = (x: number, z: number) => {
      const china = s.material('#f3efe6', { roughness: 0.4 });
      s.cylinder(0.055, 0.055, 0.006, [x, tableH + 0.003, z], china, 18);
      s.lathe([[0, 0.006], [0.02, 0.008], [0.028, 0.045], [0.03, 0.05], [0, 0.05]], china, [x, tableH + 0.004, z]);
      s.cylinder(0.022, 0.022, 0.004, [x, tableH + 0.046, z], s.material('#3a2416', { roughness: 0.5 }), 14);
      const handle = s.ring(0.012, 0.004, [x + 0.032, tableH + 0.032, z], china);
      handle.rotation.y = Math.PI / 2;
    };
    if (a.drink === 'wine' || a.drink === 'both') {
      wineGlass(glassAt.x, glassAt.y, glassAt.z);
      const bx = hip.x + 0.14, bz = tableZ + 0.08;
      s.mesh(bottleGeometry(0.3), s.material(pick(random, ['#1a2a1e', '#2a1a1a', '#14181a']), { roughness: 0.25 }), [bx, tableH, bz]);
      s.cylinder(0.038, 0.038, 0.07, [bx, tableH + 0.12, bz], s.material(pick(random, ['#d9c49a', '#b3202c', '#2a3a6a', '#e9e2cc']), { roughness: 0.8 }), 14);
    }
    if (a.drink === 'espresso' || a.drink === 'both') espresso(hip.x + (a.drink === 'both' ? -0.04 : 0.06), tableZ - 0.06);
    if (a.drink === 'espresso' || a.drink === 'water') waterGlass(hip.x - 0.1, tableZ + 0.02);
    if (a.hat === 'table') {
      const felt = s.material(pick(random, ['#2a2622', '#4a3a2e', '#3a3a3e']), { roughness: 0.95 });
      const hx = hip.x + 0.2, hz = tableZ - 0.02;
      s.cylinder(0.16, 0.16, 0.012, [hx, tableH + 0.006, hz], felt, 24);
      s.cylinder(0.085, 0.1, 0.1, [hx, tableH + 0.062, hz], felt, 20);
      s.cylinder(0.102, 0.102, 0.018, [hx, tableH + 0.022, hz], s.material('#1a1a1e', { roughness: 0.6 }), 20);
    }
    // A small vase or a candle, as the room allows.
    if (mood.density > 0.4) {
      const brass = s.material('#b89a4a', { metalness: 0.6, roughness: 0.4 });
      s.cylinder(0.012, 0.012, 0.07, [hip.x - 0.02, tableH + 0.035, tableZ + 0.14], s.material('#f1ebdc', { roughness: 0.9 }), 10);
      s.cylinder(0.03, 0.035, 0.012, [hip.x - 0.02, tableH + 0.006, tableZ + 0.14], brass, 12);
      s.ball([0.008, 0.016, 0.008], [hip.x - 0.02, tableH + 0.08, tableZ + 0.14], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9a2a', emissiveIntensity: 1.6 }), 8);
    }

    // ---- a second chair, with or without a shawl
    if (a.second !== 'none') {
      // Round the table at his left hand, angled toward the cloth: the place someone might take.
      const cx = hip.x + 0.66, cz = tableZ - 0.02;
      const chair = bentwoodChair(s, cx, cz, -Math.PI / 2 - 0.35, wood, 0.45, cane);
      if (a.second === 'shawl') {
        const shawl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.05), s.material(pick(random, ['#8a1f2e', '#2a4a6a', '#c9a23a', '#5a1f44']), { roughness: 0.95, side: THREE.DoubleSide }));
        shawl.position.set(0, 0.45 + 0.2, -0.19);
        shawl.rotation.x = 0.1;
        shawl.castShadow = true;
        chair.add(shawl);
        const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.03), shawl.material);
        fringe.position.set(0, 0.45 + 0.03, -0.2);
        chair.add(fringe);
      }
    }

    // ---- the slow nod, a finger tapping the cloth
    const energy = mood.energy;
    const neck = person.joints.neck;
    const restPitch = neck.rotation.x;
    // Seen from the room: he sits side-on to us with the table at his far hand, and turns his head toward the viewer.
    s.root.rotation.y = 62 * Math.PI / 180;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (a.moment === 'cabeceo') neck.rotation.x = restPitch + Math.max(0, Math.sin(time * mix(0.6, 1.4, energy))) ** 6 * 0.14;
      },
    });
  },
});
