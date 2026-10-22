import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul } from '@conjure/kit';
import { at, pick, pickSkin, rig } from './pose';

type P = [number, number, number];

export default defineThing({
  questions: {
    gone: choice('How far gone is he?', {
      nodding: 'Just nodding: chin dipping, still more or less upright, might wake at the hymn.',
      out: 'Out cold: head dropped on his chest, mouth open, one arm hanging loose.',
      slumped: 'Slumped sideways against the pew end, shoulder on the wood, dead to the world.',
    }),
    slipping: choice('What is slipping from his hands?', {
      hymnbook: 'A red hymn book sliding off his knee.',
      sheet: 'The folded order of service, about to flutter to the floor.',
      glasses: 'His reading glasses, dangling from one finger.',
      stick: 'His walking stick, tipping off the seat edge toward the aisle.',
      nothing: 'Nothing: hands folded in his lap.',
    }),
    coat: choice('What colour is his overcoat?', {
      camel: 'A camel wool overcoat, his good one.',
      navy: 'Navy blue, with a dark scarf.',
      herringbone: 'Grey herringbone tweed.',
      black: 'Black, funeral-smart.',
      loden: 'Green loden, old-fashioned.',
    }),
    beside: choice('What sits on the seat beside him?', {
      cap: 'His flat tweed cap.',
      gloves: 'His cap with a pair of leather gloves folded on it.',
      handbag: 'His wife\'s handbag, left while she sings in the choir.',
      sweets: 'His cap and an open paper bag of mints.',
    }),
    grandchild: noul('Is a grandchild beside him, poking his arm to wake him?'),
    pew: choice('What is the pew like?', {
      oak: 'Dark oak, worn pale on the seat.',
      pine: 'Plain yellow pine, a chapel pew.',
      painted: 'Painted white with a numbered door, box-pew style.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = pickSkin(random);
    const H = mix(1.6, 1.74, random());
    const coatColour = { camel: '#b8905a', navy: '#263252', herringbone: '#6e6c68', black: '#1f1f22', loden: '#3f5a3a' }[a.coat];
    const woodColour = { oak: '#3f2a18', pine: '#c09a62', painted: '#e9e4d6' }[a.pew];
    const wood = s.material(woodColour, { roughness: 0.55 });
    const seatWood = s.material(a.pew === 'oak' ? '#6b4a2e' : a.pew === 'pine' ? '#cfa978' : '#ddd6c6', { roughness: 0.6 });
    const slumped = a.gone === 'slumped';

    // ---- the grandfather, sitting, tipped forward or sideways by how far gone he is
    const person = figure(s, {
      height: H, build: random() < 0.5 ? 'heavy' : 'average', style: 'doll', skin,
      hair: random() < 0.55 ? 'none' : 'short', hairColor: '#e2dfd8',
      top: coatColour, bottom: pick(random, ['#2a2a30', '#3d4652', '#4a4038']), shoes: '#1d1a18', sleeves: 'long',
      pose: 'sitting', gaze: 'ahead',
    });
    s.root.add(person.root);
    const pose = rig(person);
    const lap = { forward: 26, out: 6, bend: 78, across: 24 };
    if (a.gone === 'nodding') { pose.bow(10); pose.look(34, 4, 3); pose.arm('left', lap); pose.arm('right', lap); }
    else if (a.gone === 'out') { pose.bow(22); pose.look(52, -6, 8); pose.arm('left', lap); pose.arm('right', { forward: 4, out: 14, bend: 8, across: 0 }); }
    else { pose.lean(0, 13); pose.bow(8, 10); pose.look(30, 20, 22); pose.arm('left', { forward: 14, out: 4, bend: 60, across: 30 }); pose.arm('right', { forward: 24, out: 10, bend: 70, across: 10 }); }
    pose.leg('left', { forward: 86, knee: 84, out: 8 });
    pose.leg('right', { forward: 84, knee: 88, out: 4 });
    person.settle();
    const seatTop = Math.max(0.42, person.hipHeight - 0.05);
    const himX = slumped ? -0.52 : -0.32;
    person.root.position.set(himX, 0, 0);
    person.root.updateMatrixWorld(true);

    // ---- the pew: seat, raked back with a top rail, shaped ends, book ledge behind, kneeler in front
    const seatZ = 0.0;
    s.box([2.0, 0.045, 0.42], [0, seatTop - 0.022, seatZ], seatWood);
    for (const x of [-0.62, 0.62]) s.box([0.05, seatTop - 0.05, 0.36], [x, (seatTop - 0.05) / 2, seatZ], wood);
    const back = s.box([2.0, 0.5, 0.04], [0, seatTop + 0.27, seatZ - 0.22], wood);
    back.rotation.x = -0.14;
    const rail = s.box([2.0, 0.06, 0.09], [0, seatTop + 0.53, seatZ - 0.26], wood);
    rail.rotation.x = -0.14;
    for (const x of [-1, 1]) {
      s.box([0.05, seatTop + 0.52, 0.5], [x, (seatTop + 0.52) / 2, seatZ - 0.05], wood);
      const cap = s.cylinder(0.25, 0.25, 0.05, [x, seatTop + 0.52, seatZ - 0.05], wood, 18);
      cap.rotation.z = Math.PI / 2;
      if (a.pew === 'painted') s.label(String(12 + Math.floor(random() * 30)), 0.12, 0.08, [x + (x > 0 ? 0.026 : -0.026), seatTop + 0.25, seatZ - 0.05], '#2a2a2a', '#f3efe2').rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    // Book ledge on the rear face of the back, a few hymn books in it.
    s.box([1.9, 0.03, 0.12], [0, seatTop + 0.36, seatZ - 0.34], wood);
    s.box([1.9, 0.07, 0.02], [0, seatTop + 0.4, seatZ - 0.4], wood);
    const books = Math.round(1 + mood.density * 4);
    for (let i = 0; i < books; i++) {
      const book = s.box([0.1, 0.14, 0.025], [-0.8 + i * 0.3 + random() * 0.08, seatTop + 0.44, seatZ - 0.36], s.material(pick(random, ['#8a1f24', '#1f2a5a', '#2a4a2a']), { roughness: 0.7 }));
      book.rotation.x = -0.1;
    }
    // The kneeler: a hinged pad on the floor in front, down for use.
    s.box([1.9, 0.07, 0.26], [0, 0.045, seatZ + 0.44], s.material(pick(random, ['#7a1f2a', '#2a3a6a', '#3a5a3a']), { roughness: 0.95 }));
    s.box([1.9, 0.02, 0.26], [0, 0.01, seatZ + 0.44], wood);

    // ---- the cap and company on the seat beside him
    const besideX = a.grandchild ? 0.12 : 0.3;
    const tweed = s.material(pick(random, ['#6e5a44', '#4a4a46', '#7a6a52']), { roughness: 0.95 });
    const capAt: P = [besideX, seatTop + 0.012, seatZ + 0.02];
    if (a.beside !== 'handbag') {
      const crown = s.mesh(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), tweed, capAt);
      crown.scale.set(1, 0.32, 0.95);
      s.box([0.2, 0.012, 0.09], [capAt[0], capAt[1] + 0.006, capAt[2] + 0.14], tweed);
    }
    if (a.beside === 'gloves') {
      const leather = s.material('#4a3020', { roughness: 0.7 });
      for (let i = 0; i < 2; i++) s.box([0.08, 0.018, 0.17], [capAt[0] + 0.03 - i * 0.04, capAt[1] + 0.045 + i * 0.016, capAt[2] - 0.02], leather).rotation.y = 0.25 + i * 0.3;
    } else if (a.beside === 'sweets') {
      const bag = s.box([0.08, 0.06, 0.06], [capAt[0] + 0.22, seatTop + 0.03, seatZ + 0.05], s.material('#e9e1cc', { roughness: 1 }));
      bag.rotation.y = 0.4;
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.4, 10), s.material('#f6f3ec', { roughness: 0.6 }), Array.from({ length: 4 }, () => ({ at: [capAt[0] + 0.22 + (random() - 0.5) * 0.14, seatTop + 0.004, seatZ + 0.05 + (random() - 0.5) * 0.12] as P, size: 0.011 })));
    } else if (a.beside === 'handbag') {
      const bagMat = s.material(pick(random, ['#2a1f1a', '#6a2a2a', '#1f2a4a']), { roughness: 0.45 });
      s.box([0.26, 0.2, 0.1], [besideX, seatTop + 0.1, seatZ], bagMat);
      s.ring(0.09, 0.012, [besideX, seatTop + 0.24, seatZ], bagMat, Math.PI).rotation.z = 0;
      s.ball([0.02, 0.02, 0.01], [besideX, seatTop + 0.2, seatZ + 0.055], s.material('#d4b24a', { metalness: 0.8, roughness: 0.3 }), 8);
    }

    // ---- what is slipping from his hands
    const knee = at(s, person.joints.knees.right);
    const hand = at(s, person.hands.right);
    const red = s.material('#8a1f24', { roughness: 0.6 });
    if (a.slipping === 'hymnbook') {
      const book = s.box([0.11, 0.028, 0.16], [knee.x + 0.02, knee.y + 0.02, knee.z + 0.07], red);
      book.rotation.set(0.75, 0.25, 0.1);
      s.box([0.1, 0.022, 0.15], [knee.x + 0.02, knee.y + 0.024, knee.z + 0.07], s.material('#f1ecdf', { roughness: 0.9 })).rotation.set(0.75, 0.25, 0.1);
    } else if (a.slipping === 'sheet') {
      const sheet = s.box([0.15, 0.003, 0.21], [knee.x + 0.04, knee.y - 0.02, knee.z + 0.12], s.material('#f6f3ea', { roughness: 0.95 }));
      sheet.rotation.set(1.1, 0.3, 0.2);
    } else if (a.slipping === 'glasses') {
      const wire = s.material('#c9b56a', { metalness: 0.8, roughness: 0.3 });
      const gx = hand.x + 0.02, gy = hand.y - 0.05, gz = hand.z + 0.03;
      for (const side of [-1, 1]) s.ring(0.022, 0.003, [gx + side * 0.028, gy, gz], wire).rotation.y = 0.3;
      s.rod([gx - 0.005, gy, gz], [gx + 0.005, gy, gz], 0.003, wire);
      s.rod([gx + 0.05, gy, gz], [gx + 0.09, gy + 0.04, gz - 0.02], 0.003, wire);
    } else if (a.slipping === 'stick') {
      const stick = s.rod([himX + 0.3, seatTop + 0.02, seatZ + 0.1], [himX + 0.52, 0.02, seatZ + 0.5], 0.012, s.material('#4a2c18', { roughness: 0.6 }), 0.016);
      void stick;
      s.ring(0.035, 0.012, [himX + 0.29, seatTop + 0.04, seatZ + 0.09], s.material('#4a2c18', { roughness: 0.6 }), Math.PI).rotation.set(Math.PI / 2, 0, 0.7);
    }
    // The tie and shirt, and a scarf with the navy coat; buttons down the front.
    const neck = at(s, person.joints.neck);
    const chest = new THREE.Vector3(neck.x, neck.y - 0.045 * H, neck.z + 0.064 * H);
    const spineTilt = person.joints.spine.rotation.x;
    s.box([0.065 * H, 0.075 * H, 0.004 * H], [chest.x, chest.y, chest.z - 0.002], s.material('#f4f1ea', { roughness: 0.9 })).rotation.x = spineTilt + 0.15;
    s.box([0.022 * H, 0.17 * H, 0.006 * H], [chest.x, chest.y - 0.07 * H, chest.z + 0.012 * H], s.material(pick(random, ['#7a1f2a', '#1f3a7a', '#5a3a1a', '#2a4a2a']), { roughness: 0.6 })).rotation.x = spineTilt + 0.2;
    if (a.coat === 'navy') {
      s.ring(0.062 * H, 0.018 * H, [neck.x, neck.y - 0.005 * H, neck.z], s.material('#4a3a3a', { roughness: 1 })).rotation.x = Math.PI / 2;
    } else {
      s.ring(0.058 * H, 0.012 * H, [neck.x, neck.y - 0.005 * H, neck.z], s.material(coatColour, { roughness: 0.9 })).rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 3; i++) s.ball([0.009, 0.009, 0.005], [chest.x + 0.03 * H, chest.y - 0.06 * H - i * 0.055 * H, chest.z + 0.018 * H - i * 0.01 * H], s.material('#1a1612', { roughness: 0.5 }), 6);

    // ---- the grandchild, sitting beside him, leaning over to poke his arm
    let child: Figure | null = null;
    if (a.grandchild) {
      const kid = figure(s, {
        height: mix(1.0, 1.2, random()), build: 'slight', style: 'doll', skin: random() < 0.6 ? skin : pickSkin(random),
        hair: pick(random, ['short', 'long', 'bun']), hairColor: pick(random, ['#2a1e18', '#6b4a2e', '#d8b86a', '#a04a2a']),
        top: pick(random, ['#b23a2e', '#2b5a9a', '#4a7a3a', '#f1efe6', '#d9a8a0']), bottom: pick(random, ['#2a2a30', '#55585e', '#8a3a3a']), shoes: '#1d1a18', sleeves: 'long',
        pose: 'sitting', gaze: 'ahead',
      });
      const kidPose = rig(kid);
      // Turned toward him, the near arm reaching across to his sleeve.
      kidPose.bow(6, -8, 28);
      kidPose.look(10, 48, 0);
      kidPose.arm('right', { forward: 62, out: -14, bend: 12, across: 0 });
      kidPose.arm('left', { forward: 20, out: 6, bend: 70, across: 20 });
      kidPose.leg('left', { forward: 80, knee: 60, out: 8 });
      kidPose.leg('right', { forward: 80, knee: 60, out: 2 });
      kid.settle();
      // Seat height is set by the grandfather; the child's feet dangle.
      kid.root.position.set(0.58, seatTop + 0.04 - kid.hipHeight, 0);
      s.root.add(kid.root);
      child = kid;
    }

    const energy = mood.energy;
    const baseNeck = person.joints.neck.rotation.x;
    const nod = a.gone === 'nodding' ? 0.09 : 0.02;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        child?.update(dt, time);
        // A slow sink and the little jerk back up, with the breathing.
        person.joints.neck.rotation.x = baseNeck + (Math.sin(time * mix(0.5, 1.4, energy)) * 0.5 + 0.5) * nod;
        if (child) child.joints.shoulders.right.rotation.x = child.joints.shoulders.right.rotation.x * 0.9 + (-62 * Math.PI / 180 + Math.sin(time * mix(2, 6, energy)) * 0.12) * 0.1;
      },
    });
  },
});
