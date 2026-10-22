import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const NOTES = {
  none: 'No notice at all.',
  order: 'OUT OF ORDER, taped on crooked.',
  refill: 'PLEASE REFILL, in a passive-aggressive hand.',
  cups: 'CUPS 5¢, penny-pinching management.',
  boil: 'DO NOT DRINK, a worrying warning.',
  meeting: 'ALL STAFF 4PM, an ominous memo.',
} as const;
const NOTE_TEXT: Record<keyof typeof NOTES, string> = {
  none: '', order: 'OUT OF ORDER', refill: 'PLEASE REFILL', cups: 'CUPS 5¢', boil: 'DO NOT DRINK', meeting: 'ALL STAFF 4PM',
};

/** Bottle profile, base on y = 0 and neck at the top; flipped when it sits in the cooler. */
const BOTTLE: [number, number][] = [
  [0, 0], [0.11, 0], [0.135, 0.02], [0.135, 0.1], [0.128, 0.115], [0.135, 0.13], [0.135, 0.2], [0.128, 0.215], [0.135, 0.23],
  [0.135, 0.32], [0.12, 0.36], [0.06, 0.41], [0.03, 0.43], [0.03, 0.47],
];
const BOTTLE_H = 0.47;

export default defineThing({
  questions: {
    stand: choice('What kind of cooler is it?', {
      tower: 'The classic white plastic floor tower with a recessed tap bay.',
      beige: 'A yellowed beige 1980s cabinet with a wood-grain front panel.',
      steel: 'A brushed stainless steel industrial cooler, factory or hospital.',
      crock: 'A ceramic crock with a blue stripe on a little wooden stand, homely.',
      slim: 'A slim charcoal modern unit with a glowing indicator strip.',
    }),
    level: score('How much water is left in the bottle?', ['Bone dry', 'Dregs', 'Half', 'Freshly full']),
    bottle: choice('What is the bottle like?', {
      blue: 'The standard translucent blue jug.',
      clear: 'A pale clear jug, almost colourless.',
      green: 'A green-tinted old glass carboy.',
      missing: 'No bottle at all: the stand stands open and useless.',
    }),
    cups: choice('How do people get a cup?', {
      cones: 'A tube of paper cones fixed to the side.',
      stack: 'A sleeve of plastic cups balanced on top beside the bottle neck.',
      mug: 'Somebody has left their own mug on the drip tray.',
      none: 'There are no cups to be had.',
    }),
    around: choice('What is on the floor around it?', {
      clean: 'Nothing, the floor is clear.',
      crumpled: 'Crumpled paper cups dropped and never picked up.',
      puddle: 'A spreading puddle and a yellow wet-floor sign.',
      spares: 'Full spare bottles lined up waiting.',
      empties: 'A cluster of empty bottles nobody has returned.',
      bin: 'A small wastebasket overflowing with cups.',
    }),
    moment: choice('What is happening right now?', {
      idle: 'Nothing. It hums and waits.',
      glug: 'Someone just filled a cup: big bubbles are rising through the bottle.',
      drip: 'A tap is dripping steadily into the tray.',
      abandoned: 'A full cup sits forgotten on the tray, its owner called away.',
    }),
    note: choice('If a notice is taped to the front, what does it say?', NOTES),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const crock = a.stand === 'crock';
    const bodyColour = { tower: '#eeeeea', beige: '#d8cba6', steel: '#c5cccd', crock: '#f1ece0', slim: '#565d66' }[a.stand];
    const body = s.material(new THREE.Color(bodyColour).lerp(new THREE.Color('#c9b77c'), a.stand === 'steel' || a.stand === 'slim' ? 0 : mood.wear * 0.35), {
      metalness: a.stand === 'steel' ? 0.3 : 0.05, roughness: a.stand === 'steel' ? 0.38 : 0.55,
    });
    const dark = s.material('#2c3034');
    const grey = s.material('#9a9d9c');
    const paper = s.material('#f6f3ea', { roughness: 0.9 });
    const w = a.stand === 'slim' ? 0.28 : 0.33;
    let top = 0.98; // where the bottle neck enters
    const tapZ = crock ? 0.17 : w / 2 - 0.05;
    let tapY = 0.72;
    let trayY = 0.56;

    if (crock) {
      const wood = s.material('#7b5433');
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * 0.17, 0, z * 0.17], [x * 0.13, 0.62, z * 0.13], 0.018, wood);
      s.box([0.34, 0.03, 0.34], [0, 0.63, 0], wood);
      s.box([0.3, 0.02, 0.3], [0, 0.25, 0], wood);
      s.lathe([[0, 0], [0.14, 0], [0.155, 0.03], [0.16, 0.25], [0.15, 0.3], [0.09, 0.32], [0.09, 0.335]], body, [0, 0.645, 0]);
      for (const y of [0.74, 0.9]) s.cylinder(0.162, 0.162, 0.02, [0, y, 0], s.material('#2f58a3'), 32);
      tapY = 0.71; trayY = 0.645; top = 0.975;
      s.rod([0, tapY, 0.15], [0, tapY, 0.21], 0.014, grey);
      s.box([0.012, 0.05, 0.03], [0, tapY + 0.03, 0.2], s.material('#2f58a3'));
    } else {
      const h = 0.95;
      s.box([w, h, w], [0, h / 2 + 0.02, 0], body);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.02, 0.02, 0.03, [x * (w / 2 - 0.04), 0.015, z * (w / 2 - 0.04)], dark, 10);
      // Tap bay: a dark recess with a ledge for the drip tray.
      s.box([w * 0.8, 0.27, 0.02], [0, 0.71, w / 2 - 0.004], dark);
      s.box([w * 0.86, 0.035, 0.12], [0, trayY, w / 2 + 0.04], a.stand === 'steel' ? body : grey);
      for (let i = 0; i < 7; i++) s.box([0.008, 0.006, 0.1], [-0.09 + i * 0.03, trayY + 0.02, w / 2 + 0.04], dark);
      const taps: [number, string][] = a.stand === 'steel' ? [[0, '#2f6fd0']] : [[-0.07, '#2f6fd0'], [0.07, '#d03a2f']];
      for (const [x, colour] of taps) {
        s.box([0.045, 0.05, 0.07], [x, tapY + 0.07, w / 2 + 0.02], body);
        s.cylinder(0.012, 0.015, 0.04, [x, tapY + 0.03, w / 2 + 0.04], grey, 10);
        s.box([0.05, 0.014, 0.06], [x, tapY + 0.1, w / 2 + 0.05], s.material(colour, { emissive: colour, emissiveIntensity: 0.25 }));
      }
      // Lower front: louvres, a wood panel or an indicator strip.
      if (a.stand === 'beige') s.box([w * 0.82, 0.36, 0.01], [0, 0.28, w / 2 + 0.003], s.material('#7a5231'));
      else if (a.stand === 'slim') s.box([0.02, 0.3, 0.008], [0, 0.3, w / 2 + 0.003], s.material('#58d7ff', { emissive: '#58d7ff', emissiveIntensity: mix(0.3, 1.6, mood.energy) }));
      else for (let i = 0; i < 6; i++) s.box([w * 0.7, 0.012, 0.008], [0, 0.13 + i * 0.04, w / 2 + 0.003], grey);
      s.box([w * 0.7, 0.36, 0.012], [0, 0.3, -w / 2 - 0.004], dark);
      // Collar the bottle sits in.
      s.lathe([[w * 0.46, 0], [w * 0.46, 0.012], [0.06, 0.03], [0.045, 0.012]], a.stand === 'slim' ? dark : body, [0, 0.97, 0]);
      top = 0.985;
    }

    // The bottle: an opaque column of water inside a translucent shell.
    const tint = { blue: '#4aa3e6', clear: '#cfe6ee', green: '#74b88c', missing: '#4aa3e6' }[a.bottle];
    const shell = new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: 0.42, roughness: 0.15, side: THREE.DoubleSide });
    const water = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).lerp(new THREE.Color('#1c63b8'), 0.45), roughness: 0.2, emissive: tint, emissiveIntensity: 0.12 });
    const bubbles: THREE.Mesh[] = [];
    let waterTop = 0;
    const waterBase = top - 0.045;
    const makeBottle = (x: number, z: number, y: number, fill: number, inverted: boolean, lean = 0) => {
      const group = new THREE.Group();
      const jug = new THREE.Mesh(new THREE.LatheGeometry(BOTTLE.map(([r, h]) => new THREE.Vector2(r, h)), 28), shell);
      jug.castShadow = true;
      group.add(jug);
      if (fill > 0.02) {
        // Water settles toward whichever end is down.
        const depth = fill * BOTTLE_H * 0.97;
        const inside = BOTTLE.map(([r, h]) => [r * 0.93, h] as [number, number]);
        const profile = inverted
          ? [[0, BOTTLE_H - depth] as [number, number], ...inside.filter(([, h]) => h > BOTTLE_H - depth).map(([r, h], i) => (i === 0 ? [r, BOTTLE_H - depth] as [number, number] : [r, h] as [number, number])), [0, BOTTLE_H] as [number, number]]
          : [...inside.filter(([, h]) => h < depth), [inside.filter(([, h]) => h < depth).at(-1)?.[0] ?? 0.1, depth] as [number, number], [0, depth] as [number, number]];
        if (inverted) {
          const first = inside.find(([, h]) => h > BOTTLE_H - depth) ?? inside[inside.length - 1];
          profile.splice(1, 0, [first[0], BOTTLE_H - depth]);
        }
        const liquid = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 28), water);
        liquid.material.side = THREE.DoubleSide;
        group.add(liquid);
      }
      if (!inverted) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.025, 14), new THREE.MeshStandardMaterial({ color: '#f4f4f0' }));
        cap.position.y = BOTTLE_H;
        group.add(cap);
      }
      if (inverted) { group.rotation.x = Math.PI; group.position.set(x, y + BOTTLE_H, z); }
      else { group.position.set(x, y, z); group.rotation.z = lean; }
      s.root.add(group);
      return group;
    };
    if (a.bottle !== 'missing') {
      makeBottle(0, 0, waterBase, a.level, true);
      waterTop = waterBase + a.level * BOTTLE_H * 0.97;
      const count = a.level < 0.06 ? 0 : a.moment === 'glug' ? 9 : Math.round(mix(1, 4, mood.energy));
      const foam = new THREE.MeshStandardMaterial({ color: '#f2fbff', emissive: '#bfe6ff', emissiveIntensity: 0.5, roughness: 0.2 });
      for (let i = 0; i < count; i++) {
        const size = (a.moment === 'glug' ? mix(0.012, 0.03, random()) : mix(0.006, 0.013, random()));
        const bubble = s.ball([size, size, size], [(random() - 0.5) * 0.14, mix(waterBase + 0.06, Math.max(waterBase + 0.07, waterTop), random()), 0.06 + random() * 0.065], foam, 10);
        bubble.userData.speed = mix(0.08, 0.3, random());
        bubbles.push(bubble);
      }
    } else {
      s.cylinder(0.03, 0.03, 0.004, [0, top + 0.01, 0], dark, 16);
    }

    // Cups.
    const frontZ = crock ? 0.24 : w / 2 + 0.05;
    const cup = (x: number, y: number, z: number, full: boolean) => {
      s.cylinder(0.034, 0.024, 0.075, [x, y + 0.0375, z], paper, 14);
      if (full) s.cylinder(0.031, 0.031, 0.004, [x, y + 0.07, z], water, 14);
    };
    if (a.cups === 'cones') {
      const side = w / 2 + 0.045;
      const tubeMat = new THREE.MeshStandardMaterial({ color: '#dfe9ee', transparent: true, opacity: 0.55, roughness: 0.2 });
      s.cylinder(0.042, 0.042, 0.34, [side, 0.76, 0.02], tubeMat, 16);
      s.cylinder(0.046, 0.046, 0.02, [side, 0.935, 0.02], grey, 16);
      s.box([0.03, 0.05, 0.05], [w / 2 + 0.01, 0.8, 0.02], grey);
      const stock = Math.round(mix(1, 7, mood.density));
      for (let i = 0; i < stock; i++) {
        const cone = s.mesh(new THREE.ConeGeometry(0.036, 0.1, 14), paper, [side, 0.585 + i * 0.03, 0.02]);
        cone.rotation.x = Math.PI;
      }
    } else if (a.cups === 'stack' && !crock) {
      const n = 4 + Math.floor(mix(2, 12, mood.density) * random());
      for (let i = 0; i < n; i++) s.cylinder(0.034, 0.024, 0.075, [w / 2 - 0.05, 0.97 + 0.0375 + i * 0.012, -w / 2 + 0.05], paper, 14);
    } else if (a.cups === 'stack') {
      for (let i = 0; i < 6; i++) s.cylinder(0.034, 0.024, 0.075, [0.12, 0.645 + 0.0375 + i * 0.012, 0.12], paper, 14);
    } else if (a.cups === 'mug') {
      const mugMat = s.material(mood.cheer > 0.5 ? '#e0563a' : '#3d5a6e');
      const mx = crock ? 0.11 : 0.07, my = crock ? 0.645 : trayY + 0.02;
      s.cylinder(0.035, 0.035, 0.08, [mx, my + 0.04, frontZ], mugMat, 16);
      const handle = s.ring(0.022, 0.006, [mx + 0.04, my + 0.04, frontZ], mugMat);
      handle.rotation.y = 0;
    }
    if (a.moment === 'abandoned') cup(crock ? -0.1 : -0.07, crock ? 0.645 : trayY + 0.02, frontZ, true);
    let drop: THREE.Mesh | null = null;
    if (a.moment === 'drip') {
      const dx = crock ? 0 : a.stand === 'steel' ? 0 : -0.07;
      const dz = crock ? 0.2 : w / 2 + 0.04;
      drop = s.ball([0.007, 0.011, 0.007], [dx, tapY - 0.02, dz], water, 8);
      s.cylinder(0.03, 0.03, 0.004, [dx, trayY + 0.025, dz], water, 14);
    }

    // The floor around it.
    const ring = (min: number, max: number) => {
      const angle = mix(-0.4, Math.PI + 0.4, random()), r = mix(min, max, random());
      return [Math.cos(angle) * r, Math.sin(angle) * r] as const;
    };
    const crumple = (x: number, y: number, z: number) => {
      const wad = s.mesh(new THREE.IcosahedronGeometry(0.035, 0), paper, [x, y + 0.025, z]);
      wad.scale.set(mix(0.7, 1.2, random()), mix(0.5, 0.9, random()), mix(0.7, 1.2, random()));
      wad.rotation.set(random() * 3, random() * 3, random() * 3);
    };
    if (a.around === 'crumpled') {
      const n = Math.round(mix(3, 11, mood.density));
      for (let i = 0; i < n; i++) { const [x, z] = ring(0.26, 0.5); crumple(x, 0, z); }
    } else if (a.around === 'puddle') {
      const pool = new THREE.MeshStandardMaterial({ color: '#5d93b8', roughness: 0.05, metalness: 0.3 });
      for (let i = 0; i < 4; i++) {
        const blob = s.cylinder(1, 1, 0.006, [mix(-0.15, 0.2, random()), 0.003, 0.28 + random() * 0.2], pool, 20);
        blob.scale.set(mix(0.1, 0.24, random()), 1, mix(0.08, 0.18, random()));
      }
      const yellow = s.material('#f2c21b');
      for (const side of [-1, 1]) {
        const board = s.box([0.26, 0.6, 0.012], [-0.42, 0.29, 0.3 + side * 0.09], yellow);
        board.rotation.x = -side * 0.3;
        const sign = s.label('WET FLOOR', 0.2, 0.12, [-0.42, 0.36, 0.3 + side * 0.092 + side * 0.008], '#1b1b1b', '#f2c21b');
        sign.rotation.x = -side * 0.3;
      }
    } else if (a.around === 'spares' || a.around === 'empties') {
      const n = 1 + Math.round(mix(1, 3, mood.density));
      for (let i = 0; i < n; i++) {
        const tipped = a.around === 'empties' && random() < 0.35;
        const group = makeBottle(-w / 2 - 0.19 - (i % 2) * 0.05, 0.1 - i * 0.29 + (n - 1) * 0.1, 0, a.around === 'spares' ? 0.95 : 0, false);
        if (tipped) { group.rotation.z = Math.PI / 2; group.position.y = 0.135; group.position.x -= 0.1; group.rotation.y = random() * 0.8; }
      }
    } else if (a.around === 'bin') {
      const [bx, bz] = [-w / 2 - 0.2, 0.08];
      s.lathe([[0, 0], [0.1, 0], [0.13, 0.28], [0.125, 0.28], [0.097, 0.012], [0, 0.012]], s.material('#56606b'), [bx, 0, bz]);
      for (let i = 0; i < 7; i++) crumple(bx + (random() - 0.5) * 0.14, 0.2 + random() * 0.1, bz + (random() - 0.5) * 0.14);
      for (let i = 0; i < Math.round(mix(1, 5, mood.density)); i++) crumple(bx + (random() - 0.5) * 0.4, 0, bz + 0.15 + random() * 0.25);
    }

    if (a.note !== 'none') {
      const at: [number, number, number] = crock ? [0, 0.82, 0.163] : [0.01, 0.36, w / 2 + 0.012];
      const note = s.label(NOTE_TEXT[a.note], crock ? 0.16 : 0.22, crock ? 0.07 : 0.1, at, '#b3261e', '#fbf8ec');
      note.rotation.z = (random() - 0.5) * 0.25;
      s.box([0.05, 0.016, 0.002], [at[0], at[1] + (crock ? 0.035 : 0.05), at[2] + 0.002], s.material('#d9cf9a'));
    }
    // Grime where hands and drips have been.
    if (mood.wear > 0.55 && !crock) {
      const stain = new THREE.MeshStandardMaterial({ color: '#8a7a55', transparent: true, opacity: mix(0, 0.22, mood.wear), depthWrite: false });
      for (let i = 0; i < 4; i++) s.box([0.02 + random() * 0.03, 0.1 + random() * 0.25, 0.002], [(random() - 0.5) * w * 0.8, 0.3 + random() * 0.2, w / 2 + 0.008], stain);
    }

    const speed = mix(0.4, 1.8, mood.energy) * (a.moment === 'glug' ? 1.6 : 1);
    return s.finish({
      update: (dt, time) => {
        for (const bubble of bubbles) {
          bubble.position.y += dt * bubble.userData.speed * speed;
          if (bubble.position.y > waterTop - 0.01) bubble.position.y = waterBase + 0.06;
          bubble.visible = waterTop - waterBase > 0.09;
        }
        if (drop) drop.position.y = tapY - 0.02 - ((time * speed * 0.8) % 1) * (tapY - trayY - 0.05);
      },
    });
  },
});
