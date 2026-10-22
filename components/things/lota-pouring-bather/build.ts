import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, noul } from '@conjure/kit';

type P = [number, number, number];
const RAD = Math.PI / 180;

/** Reach the figure's arm joints through its hands, so the arms can be re-posed after it is built. */
function rig(person: Figure) {
  const arm = (side: 'left' | 'right') => {
    const wrist = person.hands[side].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
    // Bend first, then swing the bent forearm round the upper arm, so hands can meet.
    elbow.rotation.order = 'YXZ';
    return { shoulder, elbow, wrist };
  };
  return { left: arm('left'), right: arm('right') };
}

export default defineThing({
  questions: {
    who: choice('Who is bathing?', {
      man: 'A man in a wet dhoti, bare-chested, solid and unhurried.',
      old: 'An old thin man, grey and slow, the cloth tied to the knee.',
      woman: 'A young woman in a wet sari clinging to her, hair down her back.',
      pilgrim: 'A pilgrim with a shaved head and a sacred thread across his chest.',
      boy: 'A skinny boy, shivering and grinning.',
    }),
    pot: choice('Where is the pot in the pour?', {
      pouring: 'Tipped right over the head, water sheeting down the shoulders.',
      lifted: 'Just lifted full and held high, the first drop not yet fallen.',
      empty: 'Held up empty, the last drops running off the elbows.',
    }),
    cloth: choice('What colour is the wet cloth?', {
      white: 'White gone grey and clinging.',
      saffron: 'Saffron orange, darkened by water.',
      checked: 'A blue-green checked lungi.',
      red: 'Red with a gold border.',
      yellow: 'Turmeric yellow.',
    }),
    towel: noul('Do a folded towel and a pair of sandals wait on the step?'),
    beads: noul('Is a string of beads round the neck?'),
    stone: choice('What does the bather stand on?', {
      ghat: 'Broad worn sandstone, dark where it is wet.',
      concrete: 'A concrete bathing platform with a drain hole.',
      tiles: 'White tiles, a few cracked.',
      rock: 'A smooth river boulder.',
    }),
    around: choice('What else is on the step?', {
      soap: 'A tin of soap and a plastic mug.',
      bucket: 'A plastic bucket full to the brim.',
      clothes: 'A heap of dry clothes weighed down with a stone.',
      nothing: 'Nothing: they came down with the pot alone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = { man: 1.74, old: 1.62, woman: 1.62, pilgrim: 1.7, boy: 1.25 }[a.who];
    const skin = { man: '#8a5a3c', old: '#7a5a46', woman: '#a06c48', pilgrim: '#6b4a33', boy: '#8f5f3f' }[a.who];
    const wet = new THREE.Color({ white: '#d9d6cc', saffron: '#c85f12', checked: '#2f6a6a', red: '#9a2a2a', yellow: '#c99a1a' }[a.cloth]).getStyle();
    const person = figure(s, {
      height: H, build: a.who === 'man' ? 'average' : 'slight', style: 'doll', skin,
      hair: a.who === 'woman' ? 'long' : a.who === 'pilgrim' || a.who === 'old' ? 'none' : 'short',
      hairColor: a.who === 'old' ? '#8a8078' : '#2a1d14',
      pose: 'standing', gaze: a.pot === 'pouring' ? 'ahead' : 'down', // the kit's 'down' lifts the chin
      top: a.who === 'woman' ? wet : skin, bottom: wet, shoes: skin, sleeves: 'short',
    });
    s.root.add(person.root);
    const joints = rig(person);
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? 1 : -1;
      joints[side].shoulder.rotation.set(-152 * RAD, 0, sign * 24 * RAD);
      joints[side].elbow.rotation.set(-108 * RAD, -sign * 62 * RAD, 0);
    }
    person.root.updateMatrixWorld(true);
    const left = person.hands.left.getWorldPosition(new THREE.Vector3());
    const right = person.hands.right.getWorldPosition(new THREE.Vector3());
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    const head = person.head.getWorldPosition(new THREE.Vector3());
    const headR = H * 0.064;

    // Stone to stand on.
    const stoneColour = { ghat: '#b3a58d', concrete: '#9d9c94', tiles: '#e6e3da', rock: '#8f8c84' }[a.stone];
    const stone = s.material(new THREE.Color(stoneColour).lerp(new THREE.Color('#5a5a52'), mood.wear * 0.4), { roughness: 0.9 });
    const slabY = 0.07;
    if (a.stone === 'rock') {
      const boulder = s.ball([0.9, 0.22, 0.8], [hips.x, -0.14, hips.z], stone, 18);
      void boulder;
    } else s.box([1.5, slabY, 1.3], [hips.x, slabY / 2, hips.z], stone);
    if (a.stone === 'tiles') for (let i = 0; i < 6; i++) s.box([0.5, 0.004, 0.004], [hips.x, slabY + 0.002, hips.z - 0.6 + i * 0.25], s.material('#a9a69c'));
    if (a.stone === 'concrete') s.cylinder(0.05, 0.05, 0.01, [hips.x + 0.45, slabY + 0.003, hips.z + 0.35], s.material('#3a3a36'), 12);
    const standY = a.stone === 'rock' ? 0.08 : slabY;
    person.root.position.y = standY;

    // The pot above the head, and the water.
    const brass = s.material('#c9962e', { metalness: 0.75, roughness: 0.3 });
    const potAt = new THREE.Vector3().addVectors(left, right).multiplyScalar(0.5);
    potAt.y += standY + 0.02;
    const pot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.09, 0.04], [0.085, 0.1], [0.05, 0.125], [0.058, 0.15], [0.07, 0.165], [0.056, 0.165], [0.045, 0.15], [0.04, 0.125], [0, 0.125]].map(([x, y]) => new THREE.Vector2(x, y)), 24), brass);
    pot.castShadow = true;
    pot.position.copy(potAt);
    pot.rotation.x = a.pot === 'pouring' ? 118 * RAD : a.pot === 'empty' ? 150 * RAD : 8 * RAD;
    s.root.add(pot);
    const water = new THREE.MeshStandardMaterial({ color: '#cfe9f0', emissive: '#7fbfd0', emissiveIntensity: 0.35, transparent: true, opacity: 0.62, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const drops: THREE.Mesh[] = [];
    if (a.pot === 'pouring') {
      const top = head.y + standY + headR * 1.05;
      const stream = s.mesh(new THREE.CylinderGeometry(0.03, 0.065, potAt.y - top + 0.06, 10, 1, true), water, [head.x, (potAt.y + top) / 2 + 0.02, head.z + 0.02]);
      stream.castShadow = false;
      // A sheet of water over the shoulders and chest, flaring out as it runs down.
      const sheet = s.mesh(new THREE.ConeGeometry(0.2 * H / 1.7, 0.5 * H / 1.7, 20, 1, true), water, [hips.x, head.y + standY - headR * 1.4 - 0.22 * H / 1.7, hips.z + 0.01]);
      sheet.castShadow = false;
      sheet.scale.z = 0.7;
      // Splash rings where the water breaks on the shoulders and the stone.
      const crown = s.mesh(new THREE.TorusGeometry(headR * 1.25, 0.014, 6, 20), water, [head.x, top - 0.02, head.z]);
      crown.rotation.x = Math.PI / 2; crown.castShadow = false;
      for (let i = 0; i < 3; i++) { const ring = s.mesh(new THREE.TorusGeometry(0.1 + i * 0.09, 0.008, 5, 24), water, [hips.x + 0.03, standY + 0.008, hips.z + 0.05]); ring.rotation.x = Math.PI / 2; ring.castShadow = false; }
      for (let i = 0; i < 9; i++) {
        const drop = s.ball([0.012, 0.02, 0.012], [hips.x + (random() - 0.5) * 0.5, standY + 0.2 + random() * (head.y - 0.2), hips.z + 0.09 + random() * 0.12], water, 6);
        drop.castShadow = false;
        drops.push(drop);
      }
    }
    if (a.pot === 'empty') for (let i = 0; i < 6; i++) {
      const drop = s.ball([0.01, 0.018, 0.01], [hips.x + (i % 2 ? 1 : -1) * 0.25 + (random() - 0.5) * 0.1, standY + 0.6 + random() * 0.7, hips.z + 0.05 + random() * 0.1], water, 6);
      drop.castShadow = false;
      drops.push(drop);
    }
    // The puddle: wide and spreading after a pour, a damp patch otherwise.
    const puddle = s.mesh(new THREE.CircleGeometry(a.pot === 'lifted' ? 0.22 : 0.42, 24), new THREE.MeshStandardMaterial({ color: a.stone === 'tiles' ? '#b9c6c6' : '#4e5a58', transparent: true, opacity: a.pot === 'lifted' ? 0.3 : 0.5, roughness: 0.1, metalness: 0.2, depthWrite: false }), [hips.x + 0.03, standY + 0.004, hips.z + 0.05]);
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.x = 1.3;
    puddle.castShadow = false;

    // Beads, a sacred thread.
    if (a.beads) {
      const beads = s.mesh(new THREE.TorusGeometry(headR * 1.15, 0.012, 6, 24), s.material('#5a3a24', { roughness: 0.6 }), [head.x, head.y + standY - headR * 1.55, head.z + 0.01]);
      beads.rotation.x = Math.PI / 2 - 0.35;
    }
    if (a.who === 'pilgrim') {
      const thread = s.box([0.012, 0.42 * H / 1.7, 0.012], [hips.x - 0.03, hips.y + standY + 0.22 * H / 1.7, hips.z + 0.075 * H / 1.7], s.material('#f4f1e6'));
      thread.rotation.set(0.15, 0, 0.5);
    }
    // Lungi check: a few darker bands painted as thin rings round the lower cloth.
    if (a.cloth === 'checked') for (let i = 0; i < 3; i++) {
      const band = s.mesh(new THREE.TorusGeometry(H * 0.04, 0.006, 6, 20), s.material('#1f3f4a'), [hips.x + (i % 2 ? 1 : -1) * H * 0.056, hips.y + standY - 0.16 - i * 0.1, hips.z]);
      band.rotation.x = Math.PI / 2;
    }

    // What waits on the step.
    const side = random() < 0.5 ? -1 : 1;
    const sx = hips.x + side * 0.5, sz = hips.z + 0.3;
    if (a.towel) {
      s.box([0.26, 0.06, 0.2], [sx, standY + 0.03, sz - 0.12], s.material(['#d9c7a0', '#c2d4d8', '#e8dfd0'][Math.floor(random() * 3)], { roughness: 0.95 }));
      s.box([0.24, 0.02, 0.18], [sx, standY + 0.07, sz - 0.12], s.material('#efe8dc', { roughness: 0.95 }));
      for (const x of [-1, 1]) s.box([0.08, 0.014, 0.22], [sx + x * 0.055, standY + 0.007, sz + 0.16], s.material('#5a3a22'));
    }
    if (a.around === 'soap') {
      s.cylinder(0.04, 0.04, 0.025, [sx - side * 0.22, standY + 0.012, sz + 0.1], s.material('#9fb6c9', { metalness: 0.5, roughness: 0.4 }), 12);
      s.cylinder(0.05, 0.045, 0.09, [sx - side * 0.1, standY + 0.045, sz + 0.14], s.material(mood.cheer > 0.5 ? '#2b7bd1' : '#8c4a4a', { roughness: 0.5 }), 12);
    }
    if (a.around === 'bucket') {
      s.cylinder(0.14, 0.12, 0.3, [sx - side * 0.2, standY + 0.15, sz + 0.1], s.material('#c82f2a', { roughness: 0.5 }), 14);
      const brim = s.cylinder(0.13, 0.13, 0.01, [sx - side * 0.2, standY + 0.296, sz + 0.1], water, 14);
      brim.castShadow = false;
    }
    if (a.around === 'clothes') {
      s.box([0.3, 0.07, 0.24], [sx - side * 0.2, standY + 0.035, sz + 0.08], s.material(['#9a2a2a', '#2a4a8a', '#e3c45a'][Math.floor(random() * 3)], { roughness: 0.95 }));
      s.box([0.22, 0.04, 0.18], [sx - side * 0.2, standY + 0.09, sz + 0.08], s.material('#efe8dc', { roughness: 0.95 }));
      s.ball([0.06, 0.04, 0.05], [sx - side * 0.2, standY + 0.14, sz + 0.08], s.material('#7a766c'), 10);
    }

    const energy = mood.energy;
    const base = drops.map((drop) => drop.position.y);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        for (const [i, drop] of drops.entries()) drop.position.y = base[i] - ((time * (0.6 + energy * 1.2) + i * 0.37) % 0.5);
      },
    });
  },
});
