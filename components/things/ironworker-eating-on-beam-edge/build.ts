import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type Build, HAT_COLOURS, type P, RAD, STEEL, arm, beamGeometry, boots, harness, hardHat, leg, look, paint, pick, pickSkin, vest, worldOf } from './site';

export default defineThing({
  questions: {
    eating: choice('What is he eating?', {
      sandwich: 'A thick sandwich in wax paper, half gone.',
      noodles: 'Noodles from a plastic tub with a fork.',
      apple: 'An apple, bitten.',
      pizza: 'A folded slice of pizza.',
      nothing: 'Nothing yet: the pail is open and only the cup is in his hand.',
    }),
    hat: choice('What colour is his hard hat?', {
      white: 'White.', yellow: 'Safety yellow.', orange: 'Orange.', blue: 'Blue.', red: 'Red.', black: 'Black, covered in stickers.',
    }),
    clipped: noul('Is his harness lanyard clipped to the safety cable, rather than hanging loose?'),
    gaze: choice('Where does he look?', {
      down: 'Down between his boots at the city far below.',
      mate: 'Across at a mate, mid-conversation.',
      horizon: 'Out at the horizon, chewing.',
      food: 'At the food in his hand.',
    }),
    beam: choice('What is the beam like?', {
      primer: 'Red-oxide primer, fresh from the fabricator.',
      grey: 'Grey primer with a stencilled piece mark.',
      rust: 'Bare steel gone to rust.',
      galvanised: 'Dull galvanised silver.',
    }),
    pail: choice('What sits open beside him on the beam?', {
      pail: 'A dented metal lunch pail with the lid up.',
      bag: 'A brown paper bag and a crumpled foil wrapper.',
      cooler: 'A small soft cooler bag, unzipped.',
      nothing: 'Only the thermos.',
    }),
    shirt: choice('What is he wearing on top?', {
      flannel: 'A red plaid flannel shirt, sleeves rolled.',
      tee: 'A white t-shirt gone grey.',
      hoodie: 'A grey hoodie with the sleeves pushed up.',
      denim: 'A faded blue work shirt.',
      vest: 'A hi-vis vest over a dark shirt.',
    }),
    moment: choice('What is the moment?', {
      bite: 'The food raised to the mouth, mid-bite.',
      rest: 'Food resting on one knee, cup raised, looking out.',
      pour: 'Pouring from the thermos into the cup.',
      shout: 'Calling something out to a mate, food held out wide.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.7, 1.88, random());
    const build: Build = random() < 0.35 ? 'heavy' : 'average';
    const skin = pickSkin(random);
    const top = { flannel: '#b8302a', tee: '#d9d6cc', hoodie: '#6e7074', denim: '#5b7a9c', vest: '#3a3f46' }[a.shirt];
    const sleeves = a.shirt === 'hoodie' || a.shirt === 'vest' ? 'long' : 'short';

    // ---- the beam on two stacks of timber cribbing
    const steel = STEEL[a.beam];
    const paintSteel = s.material(steel.colour, { roughness: steel.roughness, metalness: steel.metalness });
    const L = 2.7, DEPTH = 0.3, FLANGE = 0.26;
    const cribTop = 0.45;
    const beamTop = cribTop + DEPTH;
    const zBack = -2.1, zFront = zBack + L;
    const beam = s.mesh(beamGeometry(L, DEPTH, FLANGE), paintSteel, [0, cribTop + DEPTH / 2, (zBack + zFront) / 2]);
    void beam;
    // Bolt holes at the free end and a stencilled piece mark on the web.
    const hole = s.material('#1c1c1e', { roughness: 0.6 });
    for (const x of [-0.08, 0.08]) for (const dz of [0.08, 0.2]) s.cylinder(0.012, 0.012, 0.004, [x, beamTop + 0.002, zFront - dz], hole, 8);
    if (a.beam === 'grey' || a.beam === 'primer') {
      const mark = paint(256, 64, (c) => {
        c.fillStyle = steel.colour; c.fillRect(0, 0, 256, 64);
        c.fillStyle = a.beam === 'grey' ? '#f2f0e8' : '#f5e9b8'; c.font = 'bold 34px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(`B${Math.floor(random() * 90 + 10)}-${Math.floor(random() * 9 + 1)}`, 128, 32);
      });
      s.mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshStandardMaterial({ map: mark, roughness: 0.75 }), [FLANGE * 0.07 + 0.002, cribTop + DEPTH / 2, zBack + 0.9]).rotation.y = Math.PI / 2;
    }
    const timber = s.material('#a8864f', { roughness: 0.9 });
    const timberDark = s.material('#8a6a3c', { roughness: 0.9 });
    for (const zc of [zBack + 0.4, zBack + 1.45]) {
      for (let layer = 0; layer < 3; layer++) {
        const y = 0.075 + layer * 0.15;
        const along = layer % 2 === 0;
        for (const offset of [-0.22, 0.22]) {
          const jitter = (random() - 0.5) * 0.04;
          if (along) s.box([0.15, 0.15, 0.7], [offset + jitter, y, zc], layer === 1 ? timberDark : timber);
          else s.box([0.7, 0.15, 0.15], [0, y, zc + offset + jitter], timberDark);
        }
      }
    }
    // A safety cable on two stanchions clamped to the far side of the beam.
    const dark = s.material('#3a3c40', { metalness: 0.6, roughness: 0.4 });
    const cableY = beamTop + 1.05, cableX = -0.19;
    for (const z of [zBack + 0.15, zFront - 0.2]) {
      s.box([0.06, 0.2, 0.08], [cableX, beamTop - 0.02, z], s.material('#f0b020', { roughness: 0.5 }));
      s.rod([cableX, beamTop, z], [cableX, cableY + 0.04, z], 0.018, dark);
    }
    s.rod([cableX, cableY, zBack + 0.15], [cableX, cableY, zFront - 0.2], 0.007, s.material('#9aa0a6', { metalness: 0.7, roughness: 0.35 }));

    // ---- the ironworker, sat at the free end with his legs over the drop
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', hair: 'none', skin, top, bottom: '#3f4a5c', shoes: '#5a4030', sleeves,
    });
    s.root.add(person.root);
    leg(person, 'left', { forward: 86, knee: 78, out: 7, foot: 32 });
    leg(person, 'right', { forward: 88, knee: 84, out: -2, foot: 28 });
    const foodSide = random() < 0.6 ? 'right' : 'left';
    const cupSide = foodSide === 'right' ? 'left' : 'right';
    const poses = {
      bite: { food: { forward: 62, out: 8, bend: 132, across: 26 }, cup: { forward: 50, out: 6, bend: 95, across: 8 } },
      rest: { food: { forward: 72, out: 6, bend: 92, across: 4 }, cup: { forward: 58, out: 10, bend: 118, across: 18 } },
      pour: { food: { forward: 56, out: 4, bend: 100, across: 30 }, cup: { forward: 50, out: 4, bend: 100, across: 34 } },
      shout: { food: { forward: 78, out: 48, bend: 18, across: 0 }, cup: { forward: 55, out: 8, bend: 100, across: 10 } },
    }[a.moment];
    arm(person, foodSide, poses.food);
    arm(person, cupSide, poses.cup);
    const yawSign = foodSide === 'right' ? -1 : 1;
    if (a.gaze === 'down') look(person, 38, 4);
    else if (a.gaze === 'mate') look(person, 4, 52 * (random() < 0.5 ? 1 : -1));
    else if (a.gaze === 'horizon') look(person, -6, -14 * yawSign);
    else look(person, a.moment === 'bite' ? 22 : 34, 16 * yawSign);
    if (a.moment === 'bite') person.joints.spine.rotation.x = 0.1;
    if (a.moment === 'shout') { person.joints.spine.rotation.x = -0.06; look(person, -4, 58 * yawSign); }
    person.settle();
    // Hips on the top flange, toes hanging past the beam end.
    person.root.position.set(0.01, beamTop + 0.02 - person.hipHeight, 0);
    person.root.updateMatrixWorld(true);
    const hips = worldOf(person.pelvis);
    person.root.position.z += zFront - 0.02 - hips.z;
    person.root.updateMatrixWorld(true);
    hardHat(s, person, H, HAT_COLOURS[a.hat], { tilt: a.gaze === 'horizon' ? 8 : 0 });
    if (a.shirt === 'vest') vest(s, person, H, build, '#ff7a14');
    const ring = harness(s, person, H, build, a.shirt === 'flannel' ? '#2a2a2c' : '#2a3a8a');
    boots(s, person, H, '#5a4030');
    person.root.updateMatrixWorld(true);
    const ringAt = worldOf(ring);
    const rope = s.material('#f0a020', { roughness: 0.85 });
    if (a.clipped) {
      const clip: P = [cableX, cableY, ringAt.z - 0.28];
      s.rod([ringAt.x, ringAt.y, ringAt.z], clip, 0.011, rope);
      s.ring(0.03, 0.007, clip, dark).rotation.y = Math.PI / 2;
    } else {
      const loose: P[] = [[ringAt.x, ringAt.y, ringAt.z], [ringAt.x + 0.12, ringAt.y - 0.25, ringAt.z - 0.12], [ringAt.x + 0.2, beamTop + 0.04, ringAt.z - 0.3]];
      s.tube(loose, 0.011, rope);
      const hook = s.ring(0.03, 0.007, [0.2, beamTop + 0.04, ringAt.z - 0.33], dark);
      hook.rotation.x = Math.PI / 2;
    }

    // ---- what is in his hands, in world space at the palms
    const foodAt = worldOf(person.hands[foodSide]);
    const cupAt = worldOf(person.hands[cupSide]);
    const chrome = s.material('#c9ced2', { metalness: 0.85, roughness: 0.25 });
    const cup = s.cylinder(0.04, 0.034, 0.075, [cupAt.x, cupAt.y + 0.02, cupAt.z + 0.01], a.moment === 'pour' ? chrome : s.material('#c93a2a', { roughness: 0.5 }), 14);
    void cup;
    if (a.moment === 'pour') {
      const thermos = s.cylinder(0.045, 0.045, 0.3, [foodAt.x, foodAt.y + 0.08, foodAt.z + 0.02], s.material('#2f7a3a', { roughness: 0.45 }), 16);
      thermos.rotation.set(0.5, 0, (foodSide === 'right' ? 1 : -1) * 0.9);
      s.rod([foodAt.x + (foodSide === 'right' ? -0.08 : 0.08), foodAt.y + 0.1, foodAt.z + 0.1], [cupAt.x, cupAt.y + 0.07, cupAt.z + 0.01], 0.005, s.material('#6b4a2a', { roughness: 0.3 }));
    } else if (a.eating === 'sandwich') {
      const bread = s.material('#d9b36a', { roughness: 0.9 });
      const wrap = s.box([0.13, 0.055, 0.11], [foodAt.x, foodAt.y + 0.01, foodAt.z + 0.02], s.material('#efe8d2', { roughness: 0.95 }));
      wrap.rotation.set(0.3, 0.2, 0.1);
      const bite = s.box([0.12, 0.05, 0.1], [foodAt.x, foodAt.y + 0.045, foodAt.z + 0.03], bread);
      bite.rotation.set(0.3, 0.2, 0.1);
      s.box([0.118, 0.014, 0.098], [foodAt.x, foodAt.y + 0.045, foodAt.z + 0.03], s.material('#b5473a', { roughness: 0.8 })).rotation.set(0.3, 0.2, 0.1);
    } else if (a.eating === 'noodles') {
      s.cylinder(0.06, 0.05, 0.085, [foodAt.x, foodAt.y + 0.03, foodAt.z + 0.02], s.material('#f2efe6', { roughness: 0.6 }), 16);
      s.cylinder(0.055, 0.055, 0.012, [foodAt.x, foodAt.y + 0.075, foodAt.z + 0.02], s.material('#e8c25a', { roughness: 0.7 }), 16);
      s.rod([foodAt.x + 0.02, foodAt.y + 0.07, foodAt.z + 0.02], [foodAt.x + 0.06, foodAt.y + 0.2, foodAt.z - 0.02], 0.004, chrome);
    } else if (a.eating === 'apple') {
      const apple = s.ball([0.04, 0.038, 0.04], [foodAt.x, foodAt.y + 0.03, foodAt.z + 0.02], s.material(mood.cheer > 0.5 ? '#c8302a' : '#8fb33a', { roughness: 0.4 }), 14);
      void apple;
      s.box([0.03, 0.03, 0.02], [foodAt.x + 0.03, foodAt.y + 0.035, foodAt.z + 0.035], s.material('#f3e9c8', { roughness: 0.9 }));
    } else if (a.eating === 'pizza') {
      const slice = new THREE.Shape();
      slice.moveTo(0, 0); slice.lineTo(-0.06, 0.16); slice.quadraticCurveTo(0, 0.19, 0.06, 0.16); slice.closePath();
      const pizza = s.mesh(new THREE.ExtrudeGeometry(slice, { depth: 0.012, bevelEnabled: false }), s.material('#d9a24a', { roughness: 0.85 }), [foodAt.x, foodAt.y + 0.02, foodAt.z + 0.02]);
      pizza.rotation.set(-1.2, 0, (foodSide === 'right' ? -1 : 1) * 0.5);
      s.ball([0.02, 0.01, 0.02], [foodAt.x, foodAt.y + 0.09, foodAt.z + 0.08], s.material('#c0392b', { roughness: 0.6 }), 8);
    }

    // ---- the lunch pail and thermos on the beam behind him
    const pailZ = hips.z - 0.36;
    if (a.pail === 'pail') {
      const tin = s.material('#8e9398', { metalness: 0.7, roughness: 0.4 });
      s.box([0.22, 0.13, 0.13], [0, beamTop + 0.065, pailZ], tin);
      const lid = s.mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.22, 12, 1, false, 0, Math.PI), tin, [0, beamTop + 0.15, pailZ - 0.1]);
      lid.rotation.set(1.9, 0, Math.PI / 2);
      s.cylinder(0.025, 0.025, 0.11, [0.05, beamTop + 0.17, pailZ], s.material('#2f7a3a', { roughness: 0.45 }), 10);
      s.box([0.08, 0.04, 0.09], [-0.05, beamTop + 0.15, pailZ + 0.01], s.material('#efe8d2', { roughness: 0.95 }));
    } else if (a.pail === 'bag') {
      const bag = s.box([0.14, 0.17, 0.09], [0.02, beamTop + 0.085, pailZ], s.material('#b48a5a', { roughness: 0.95 }));
      bag.rotation.z = 0.08;
      s.ball([0.05, 0.03, 0.045], [-0.08, beamTop + 0.03, pailZ + 0.14], s.material('#d4d8dc', { metalness: 0.8, roughness: 0.3 }), 8);
    } else if (a.pail === 'cooler') {
      s.box([0.26, 0.17, 0.17], [0, beamTop + 0.085, pailZ], s.material(pick(random, ['#2b4f8a', '#2a2a2c', '#b8302a']), { roughness: 0.85 }));
      const flap = s.box([0.26, 0.012, 0.17], [0, beamTop + 0.24, pailZ - 0.1], s.material('#2b4f8a', { roughness: 0.85 }));
      flap.rotation.x = -1.3;
      s.cylinder(0.03, 0.03, 0.1, [0.06, beamTop + 0.22, pailZ], s.material('#e8e4da', { roughness: 0.5 }), 10);
    }
    if (a.moment !== 'pour') s.cylinder(0.045, 0.045, 0.3, [0.0, beamTop + 0.15, pailZ - (a.pail === 'nothing' ? 0 : 0.26)], s.material('#2f7a3a', { roughness: 0.45 }), 16);
    s.cylinder(0.046, 0.046, 0.03, [0.0, beamTop + 0.315, pailZ - (a.pail === 'nothing' ? 0 : 0.26)], chrome, 16);

    // Turned so the beam reads at a three-quarter angle instead of receding straight behind him.
    s.root.rotation.y = 50 * RAD;
    const energy = mood.energy;
    const shoutArm = a.moment === 'shout' ? person.joints.elbows[foodSide] : null;
    const base = shoutArm ? shoutArm.rotation.x : 0;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (shoutArm) shoutArm.rotation.x = base + Math.sin(time * 3) * 0.08 * energy;
      },
    });
  },
});
