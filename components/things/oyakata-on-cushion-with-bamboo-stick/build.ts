import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type P, at, belly, paint, pick, pickSkin, reach, rig, sitCrossLegged } from './pose';

const CUSHIONS = {
  purple: 'Deep purple silk, the colour of rank.',
  indigo: 'Dark indigo cotton, plain and worn.',
  maroon: 'Maroon with a gold thread border.',
  mustard: 'Mustard yellow, faded on top.',
  grey: 'A grey office-chair grey, no ceremony at all.',
} as const;
const CUSHION_COLOUR: Record<keyof typeof CUSHIONS, string> = { purple: '#4a2a6a', indigo: '#263352', maroon: '#6a2430', mustard: '#c9a23a', grey: '#7a7a7c' };

/** Woven tatami: fine straw stripes with a dark cloth border. */
function tatami(random: () => number, wear: number) {
  return paint(512, 384, (c) => {
    c.fillStyle = `hsl(${54 - wear * 14}, ${38 - wear * 15}%, ${62 - wear * 14}%)`;
    c.fillRect(0, 0, 512, 384);
    for (let y = 0; y < 384; y += 3) {
      c.fillStyle = `rgba(80,70,30,${0.12 + random() * 0.18})`;
      c.fillRect(0, y, 512, 1);
    }
    c.fillStyle = '#23252c';
    c.fillRect(0, 0, 512, 22);
    c.fillRect(0, 362, 512, 22);
    c.fillRect(0, 0, 18, 384);
    c.fillRect(494, 0, 18, 384);
  });
}

export default defineThing({
  questions: {
    dress: choice('What is he wearing?', {
      yukata: 'A dark indigo yukata with wide sleeves, the collar crossed.',
      tracksuit: 'A navy tracksuit top with white stripes down the sleeves.',
      polo: 'A white polo shirt and grey slacks, off duty.',
      jacket: 'A grey suit jacket over a white shirt, straight from a meeting.',
    }),
    hair: choice('What is on his head?', {
      cap: 'A baseball cap pulled low.',
      grey: 'Short grey hair.',
      black: 'Short black hair, still thick.',
      bald: 'A shaved or bald head.',
    }),
    holds: choice('What does he hold?', {
      lap: 'A bamboo stick laid across his lap, both hands on it.',
      planted: 'A bamboo stick planted upright beside him, one hand gripping it.',
      fan: 'A folded paper fan tapping his knee.',
      nothing: 'Nothing: both hands flat on his knees.',
    }),
    posture: choice('How does he sit?', {
      severe: 'Upright and severe, chin level, utterly still.',
      bored: 'Slumped and bored, shoulders down, chin sunk.',
      intent: 'Leaning forward over his knees, about to speak.',
      crossed: 'Arms folded across his chest, head tilted, unimpressed.',
    }),
    drink: choice('What is on the tray beside him?', {
      tea: 'A small teacup and an iron teapot.',
      cigarette: 'A glass ashtray; a cigarette burns in his fingers.',
      both: 'Tea, an ashtray and a lit cigarette.',
      nothing: 'No tray at all; the tatami is bare.',
    }),
    cushion: choice('What colour is the cushion?', CUSHIONS),
    notebook: noul('Does a notebook lie open on the tatami beside him, a pen across it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.68, 1.78, random());
    const skin = pickSkin(random);
    const clothes = {
      yukata: { top: '#2a2d3e', bottom: '#2a2d3e', sleeves: 'long' as const },
      tracksuit: { top: '#1f2e5a', bottom: '#1f2e5a', sleeves: 'long' as const },
      polo: { top: '#ecebe4', bottom: '#45464a', sleeves: 'short' as const },
      jacket: { top: '#4b4b52', bottom: '#2e2e34', sleeves: 'long' as const },
    }[a.dress];
    const hairColor = { cap: '#1e2230', grey: '#9a9892', black: '#1a1512', bald: '#000000' }[a.hair];
    const person = figure(s, {
      height: H, build: 'heavy', style: 'doll', skin, hair: a.hair === 'cap' ? 'cap' : a.hair === 'bald' ? 'none' : 'short', hairColor,
      shoes: a.dress === 'yukata' ? skin : '#efece4', pose: 'sitting', gaze: 'ahead', ...clothes,
    });
    s.root.add(person.root);
    belly(person, H, s.material(clothes.top, { roughness: 0.6 }), 0.8);

    // ---- the cross-legged sit, then the posture on top of it
    sitCrossLegged(person, 50);
    const pose = rig(person);
    const bow = { severe: 0, bored: 16, intent: 24, crossed: -4 }[a.posture];
    pose.bow(bow, 0, 0);
    const pitch = { severe: 12, bored: 24, intent: 6, crossed: 10 }[a.posture];
    pose.look(pitch, 28, a.posture === 'crossed' ? 8 : 0);
    person.root.updateMatrixWorld(true);
    const kneeL = person.joints.knees.left.getWorldPosition(new THREE.Vector3());
    const kneeR = person.joints.knees.right.getWorldPosition(new THREE.Vector3());
    const lift = new THREE.Vector3(0, 0.06, 0);
    const stick = a.holds === 'lap' || a.holds === 'planted';
    if (a.posture === 'crossed') {
      pose.arm('left', { forward: 35, out: -4, bend: 115, across: 70 });
      pose.arm('right', { forward: 35, out: -4, bend: 115, across: 70 });
    } else if (a.posture === 'intent') {
      // Forearms on the thighs, hands together between the knees.
      const between = kneeL.clone().lerp(kneeR, 0.5).add(new THREE.Vector3(0, 0.1, 0.1));
      reach(person, 'left', between.clone().add(new THREE.Vector3(0.05, 0, 0)), -0.6, 0.6);
      reach(person, 'right', between.clone().add(new THREE.Vector3(-0.05, 0, 0)), 0.6, 0.6);
    } else {
      reach(person, 'left', kneeL.clone().add(lift).add(new THREE.Vector3(0.02, 0, 0.02)), -0.5, 0.6);
      if (a.holds === 'planted') reach(person, 'right', kneeR.clone().add(new THREE.Vector3(-0.3, 0.32, -0.02)), 0.4, 0.6);
      else reach(person, 'right', kneeR.clone().add(lift).add(new THREE.Vector3(-0.02, 0, 0.02)), 0.5, 0.6);
    }
    person.settle();

    // ---- riser, cushion and seat
    const riserH = 0.14, cushionH = 0.065;
    const riserW = 1.7, riserD = 1.15;
    const seatY = riserH + cushionH;
    person.root.position.set(0.12, seatY, 0);
    person.root.updateMatrixWorld(true);
    const mat = new THREE.MeshStandardMaterial({ map: tatami(random, mood.wear), roughness: 0.9 });
    const riser = s.mesh(new THREE.BoxGeometry(riserW, riserH, riserD), mat, [0, riserH / 2, 0]);
    void riser;
    s.box([riserW + 0.04, 0.05, riserD + 0.04], [0, 0.025, 0], s.material('#3a2a1c', { roughness: 0.7 }));
    const cushionMat = s.material(CUSHION_COLOUR[a.cushion], { roughness: 0.85 });
    const cushion = s.box([0.68, cushionH, 0.68], [0.12, riserH + cushionH / 2, 0.02], cushionMat);
    cushion.rotation.y = (random() - 0.5) * 0.1;
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.ball([0.03, 0.02, 0.03], [0.12 + x * 0.3, riserH + cushionH, 0.02 + z * 0.3], cushionMat, 8);

    // ---- clothing details: crossed collar and wide sleeves for the yukata, stripes for the tracksuit, a shirt for the jacket
    const neck = at(s, person.joints.neck);
    const chest = new THREE.Vector3(neck.x, neck.y - 0.06 * H, neck.z + 0.075 * H);
    if (a.dress === 'yukata') {
      const lapel = s.material('#3c4258', { roughness: 0.8 });
      for (const side of [-1, 1]) {
        const strip = s.box([0.03 * H, 0.16 * H, 0.008 * H], [chest.x + side * 0.02 * H, chest.y - 0.03 * H, chest.z], lapel);
        strip.rotation.set(0.15, 0, side * 0.5);
      }
      s.box([0.05 * H, 0.03 * H, 0.008 * H], [chest.x, chest.y + 0.035 * H, chest.z - 0.004 * H], s.material('#ece6d8'));
      const sleeveMat = s.material(clothes.top, { roughness: 0.9, side: THREE.DoubleSide });
      for (const side of ['left', 'right'] as const) {
        const upper = at(s, person.joints.shoulders[side]);
        const elbow = at(s, person.joints.elbows[side]);
        const mid = upper.clone().lerp(elbow, 0.62);
        const sleeve = s.mesh(new THREE.CylinderGeometry(0.035 * H, 0.09 * H, upper.distanceTo(elbow) * 1.05, 14, 1, true), sleeveMat, mid.toArray() as P);
        sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), upper.clone().sub(elbow).normalize());
      }
      // The robe falls over the folded legs.
      const hips = at(s, person.pelvis);
      const lap = s.mesh(new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), s.material(clothes.top, { roughness: 0.9 }), [hips.x, hips.y - 0.12, hips.z + 0.17]);
      lap.scale.set(0.58, 0.22, 0.52);
    } else if (a.dress === 'tracksuit') {
      const white = s.material('#eeeeea', { roughness: 0.7 });
      for (const side of ['left', 'right'] as const) {
        const shoulder = person.joints.shoulders[side];
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012 * H, 0.15 * H, 0.012 * H), white);
        stripe.position.set((side === 'left' ? 1 : -1) * 0.04 * H, -0.085 * H, 0.012 * H);
        shoulder.add(stripe);
      }
      s.box([0.06 * H, 0.02 * H, 0.01 * H], [chest.x, chest.y + 0.04 * H, chest.z - 0.004 * H], white);
    } else if (a.dress === 'jacket') {
      const shirt = s.material('#f1efe8', { roughness: 0.7 });
      s.box([0.06 * H, 0.13 * H, 0.008 * H], [chest.x, chest.y - 0.02 * H, chest.z], shirt);
      s.box([0.02 * H, 0.1 * H, 0.006 * H], [chest.x, chest.y - 0.03 * H, chest.z + 0.004 * H], s.material(pick(random, ['#6a2a30', '#2a3a6a', '#3a5a3a']), { roughness: 0.6 }));
    } else {
      s.box([0.055 * H, 0.035 * H, 0.008 * H], [chest.x, chest.y + 0.035 * H, chest.z], s.material('#d9d6cc', { roughness: 0.7 }));
    }

    // ---- the stick, the fan
    const bamboo = s.material('#c9b26a', { roughness: 0.55 });
    const handL = at(s, person.hands.left);
    const handR = at(s, person.hands.right);
    if (a.holds === 'lap') {
      const from = handL.clone(), to = handR.clone();
      const dir = to.clone().sub(from).normalize();
      const rod = s.rod(from.clone().addScaledVector(dir, -0.3).toArray() as P, to.clone().addScaledVector(dir, 0.3).toArray() as P, 0.017, bamboo);
      void rod;
      for (let i = 0; i < 4; i++) s.ring(0.016, 0.004, from.clone().lerp(to, 0.15 + i * 0.22).toArray() as P, s.material('#5a4a30')).quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    } else if (a.holds === 'planted') {
      const foot: P = [handR.x, riserH, handR.z];
      s.rod(foot, [handR.x, riserH + 1.1, handR.z], 0.017, bamboo);
      for (let i = 0; i < 5; i++) s.ring(0.016, 0.004, [handR.x, riserH + 0.15 + i * 0.2, handR.z], s.material('#5a4a30')).rotation.x = Math.PI / 2;
    } else if (a.holds === 'fan') {
      const fan = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.26, 0.012), s.material('#e9dcc0', { roughness: 0.8 }));
      fan.position.set(0, -0.08, 0.03);
      fan.rotation.x = -0.5;
      fan.castShadow = true;
      person.hands.right.add(fan);
    }

    // ---- the tray, tea and cigarette; the notebook
    const trayAt: P = [-0.55, riserH, 0.12];
    const smokes: THREE.Mesh[] = [];
    if (a.drink !== 'nothing') {
      const lacquer = s.material('#1c1a1a', { roughness: 0.25 });
      s.box([0.34, 0.018, 0.24], [trayAt[0], trayAt[1] + 0.009, trayAt[2]], lacquer);
      s.box([0.34, 0.03, 0.012], [trayAt[0], trayAt[1] + 0.024, trayAt[2] - 0.114], lacquer);
      s.box([0.34, 0.03, 0.012], [trayAt[0], trayAt[1] + 0.024, trayAt[2] + 0.114], lacquer);
    }
    if (a.drink === 'tea' || a.drink === 'both') {
      const cup = s.lathe([[0, 0], [0.028, 0], [0.036, 0.04], [0.038, 0.06], [0.032, 0.06], [0.03, 0.012], [0, 0.012]], s.material('#e8e2d4', { roughness: 0.4 }), [trayAt[0] + 0.1, trayAt[1] + 0.018, trayAt[2] + 0.04]);
      void cup;
      s.cylinder(0.03, 0.03, 0.004, [trayAt[0] + 0.1, trayAt[1] + 0.066, trayAt[2] + 0.04], s.material('#8a9a4a', { roughness: 0.5 }), 14);
      const iron = s.material('#2a2a2c', { roughness: 0.6, metalness: 0.3 });
      s.lathe([[0, 0], [0.06, 0], [0.075, 0.04], [0.07, 0.09], [0.04, 0.1], [0.04, 0.105], [0, 0.105]], iron, [trayAt[0] - 0.08, trayAt[1] + 0.018, trayAt[2] - 0.02]);
      s.ring(0.05, 0.006, [trayAt[0] - 0.08, trayAt[1] + 0.13, trayAt[2] - 0.02], iron, Math.PI).rotation.z = 0;
      s.cylinder(0.01, 0.014, 0.05, [trayAt[0] - 0.015, trayAt[1] + 0.08, trayAt[2] - 0.02], iron, 10).rotation.z = -Math.PI / 2 + 0.3;
    }
    if (a.drink === 'cigarette' || a.drink === 'both') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dfe8ea', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });
      s.cylinder(0.05, 0.045, 0.025, [trayAt[0] + (a.drink === 'both' ? 0.0 : 0.05), trayAt[1] + 0.03, trayAt[2] + (a.drink === 'both' ? 0.07 : 0.0)], glass, 16);
      const hand = a.holds === 'fan' || a.holds === 'planted' ? person.hands.left : person.hands.right;
      const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 8), s.material('#f3f0e8'));
      cig.rotation.x = Math.PI / 2 + 0.6;
      cig.position.set(0, -0.015, 0.045);
      const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.008, 8), new THREE.MeshStandardMaterial({ color: '#ff6a20', emissive: '#ff4a10', emissiveIntensity: 1.2 }));
      ember.position.set(0, 0.044, 0);
      cig.add(ember);
      hand.add(cig);
      const smoke = new THREE.MeshStandardMaterial({ color: '#d9d6cf', transparent: true, opacity: 0.28, depthWrite: false });
      const tip = at(s, ember);
      for (let i = 0; i < 4; i++) {
        const size = 0.028 + i * 0.014;
        const puff = s.ball([size, size, size], [tip.x + (random() - 0.5) * 0.03, tip.y + 0.07 + i * 0.075, tip.z + (random() - 0.5) * 0.03], smoke, 8);
        puff.castShadow = false;
        puff.userData.size = size;
        smokes.push(puff);
      }
    }
    if (a.notebook) {
      const nbAt: P = [0.62, riserH, 0.34];
      s.box([0.26, 0.012, 0.19], [nbAt[0], nbAt[1] + 0.006, nbAt[2]], s.material('#2d2a30', { roughness: 0.6 }));
      const page = s.material('#f3f1ea', { roughness: 0.9 });
      s.box([0.12, 0.006, 0.18], [nbAt[0] - 0.065, nbAt[1] + 0.015, nbAt[2]], page);
      s.box([0.12, 0.006, 0.18], [nbAt[0] + 0.065, nbAt[1] + 0.015, nbAt[2]], page);
      const ink = s.material('#2a2a3a', { roughness: 1 });
      for (let i = 0; i < 5; i++) s.box([0.08 - (i % 2) * 0.02, 0.002, 0.006], [nbAt[0] - 0.065, nbAt[1] + 0.019, nbAt[2] - 0.06 + i * 0.03], ink);
      s.cylinder(0.005, 0.005, 0.15, [nbAt[0] + 0.04, nbAt[1] + 0.024, nbAt[2] + 0.02], s.material('#1a3a7a', { roughness: 0.4 }), 8).rotation.set(Math.PI / 2, 0, 0.5);
    }

    const energy = mood.energy;
    const phase = random() * 6.28;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        for (const [i, puff] of smokes.entries()) {
          puff.position.x += Math.sin(time * 0.9 + i) * 0.0005 * (0.3 + energy);
          // Breathe around the puff's own size: a bare setScalar(1) would blow it up to a metre.
          puff.scale.setScalar((puff.userData.size as number) * (1 + Math.sin(time * 1.2 + i * 0.8) * 0.1));
        }
      },
    });
  },
});
