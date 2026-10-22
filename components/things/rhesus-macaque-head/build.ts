import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { monkeyHead, sittingBody, tufts, type Mouth, type V3 } from './primate';

export default defineThing({
  questions: {
    expression: choice('What is its face doing?', {
      bored: 'Heavy-lidded and blank, mouth shut, looking past you.',
      threat: 'The open-mouth threat stare: eyes wide, brows up, jaw dropped to show the canines.',
      lipsmack: 'Lip-smacking appeasement: lips pursed forward, tongue flicking, eyes soft.',
      grimace: 'A fear grimace: lips pulled right back off a clenched fence of teeth.',
    }),
    pouches: score('How full are its cheek pouches?', ['Empty and flat', 'A little something stored', 'Lopsided lumps', 'Bulging like a mumps patient']),
    rank: choice('Who is it in the troop?', {
      male: 'A heavy scarred male, thick neck, torn ear, owns the staircase.',
      female: 'A nursing female, slighter, with a dark infant clamped to her belly.',
      juvenile: 'A lanky juvenile, all ears and elbows, small and quick.',
    }),
    stolen: choice('What has it stolen?', {
      nothing: 'Nothing: empty hands resting on its knees.',
      sunglasses: 'A pair of sunglasses, held up and being tested with its teeth.',
      phone: 'A smartphone, screen still lit, turned over in one hand.',
      marigold: 'A marigold pulled from a garland, about to be eaten.',
      lolly: 'A bright ice lolly on a stick, dripping down its wrist.',
    }),
    posture: choice('How does it sit on its perch?', {
      hunched: 'Curled over its drawn-up knees, hands on kneecaps, a furry boulder.',
      upright: 'Sitting tall and alert, head turned to watch something off to one side.',
      lounging: 'Slouched with one leg dangling off the edge and an arm propped, at ease.',
    }),
    perch: choice('What is it sitting on?', {
      plinth: 'A carved stone plinth with a lotus-petal rim.',
      wall: 'The top of a whitewashed brick wall.',
      crate: 'A wooden fruit crate from the offering stalls.',
      drum: 'A dented blue oil drum.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const build = { male: { h: 0.34, girth: 1.22, head: 0.108, limb: 1.15 }, female: { h: 0.29, girth: 1, head: 0.096, limb: 0.95 }, juvenile: { h: 0.21, girth: 0.82, head: 0.084, limb: 0.8 } }[a.rank];
    const furColour = new THREE.Color('#8a7250').lerp(new THREE.Color('#a8752f'), mood.warmth * 0.35).lerp(new THREE.Color('#6d665c'), mood.wear * 0.4);
    const fur = `#${furColour.getHexString()}`, tip = `#${furColour.clone().lerp(new THREE.Color('#e2cf9f'), 0.55).getHexString()}`;
    const skin = a.rank === 'male' ? '#d2705f' : a.rank === 'juvenile' ? '#e6a898' : '#dd8a7a';

    // Perch.
    let top = 0.3;
    if (a.perch === 'plinth') {
      const stone = s.material('#b9ae98');
      s.lathe([[0, 0], [0.24, 0], [0.24, 0.05], [0.18, 0.08], [0.16, 0.2], [0.2, 0.24], [0.24, 0.3], [0.22, 0.34], [0, 0.34]], stone);
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        const petal = s.ball([0.045, 0.04, 0.028], [Math.sin(t) * 0.235, 0.285, Math.cos(t) * 0.235], stone, 8);
        petal.rotation.y = t;
      }
      top = 0.34;
    } else if (a.perch === 'wall') {
      const white = s.material('#e9e4d6'), brick = s.material('#a8553c');
      s.box([0.9, 0.34, 0.26], [0, 0.17, 0], white);
      s.box([0.96, 0.05, 0.32], [0, 0.365, 0], white);
      for (let i = 0; i < 5 + Math.round(mood.wear * 8); i++) s.box([0.11, 0.045, 0.01], [mix(-0.38, 0.38, random()), mix(0.04, 0.3, random()), 0.131], brick);
      top = 0.39;
    } else if (a.perch === 'crate') {
      const wood = s.material('#b98b54'), darkWood = s.material('#8a6238');
      for (let i = 0; i < 3; i++) for (const z of [-0.2, 0.2]) s.box([0.56, 0.075, 0.018], [0, 0.05 + i * 0.1, z], wood);
      for (let i = 0; i < 3; i++) for (const x of [-0.28, 0.28]) s.box([0.018, 0.075, 0.4], [x, 0.05 + i * 0.1, 0], wood);
      for (const x of [-0.26, 0.26]) for (const z of [-0.18, 0.18]) s.box([0.035, 0.3, 0.035], [x, 0.15, z], darkWood);
      for (let i = 0; i < 5; i++) s.box([0.1, 0.014, 0.42], [-0.22 + i * 0.11, 0.3, 0], wood);
      top = 0.307;
    } else {
      const blue = s.material('#2f62a3', { metalness: 0.4, roughness: 0.5 });
      s.cylinder(0.2, 0.2, 0.42, [0, 0.21, 0], blue, 28);
      for (const y of [0.01, 0.14, 0.28, 0.41]) s.ring(0.203, 0.01, [0, y, 0], blue).rotation.x = Math.PI / 2;
      for (let i = 0; i < Math.round(mood.wear * 7); i++) s.ball([0.04, 0.05, 0.01], [Math.sin(i * 2.1) * 0.2, 0.08 + random() * 0.28, Math.cos(i * 2.1) * 0.2], s.material('#8c4a2a'), 8).rotation.y = i * 2.1;
      top = 0.42;
    }

    // The animal.
    const monkey = new Sculpture(context);
    const hunch = { hunched: 0.95, upright: 0.15, lounging: 0.5 }[a.posture];
    const holding = a.stolen !== 'nothing';
    const toMouth = a.stolen === 'lolly' || a.stolen === 'marigold' || a.stolen === 'sunglasses';
    const rightHand: V3 | undefined = holding ? (toMouth ? [0.2, 0.98 + hunch * 0.05, 0.5 + hunch * 0.22] : [0.22, 0.66, 0.52 + hunch * 0.1]) : undefined;
    const body = sittingBody(monkey, {
      height: build.h, girth: build.girth, fur, tip, belly: tip, skin, hunch, limbWidth: build.limb, rightHand, dangle: a.posture === 'lounging',
      ragged: 0.25 + mood.wear * 0.4, furLength: 0.14 + mood.wear * 0.08,
    });
    // Russet hindquarters, the rhesus signature.
    tufts(monkey, { centre: [0, 0.24 * build.h, -0.05 * build.h], radii: [0.38 * build.h * build.girth, 0.3 * build.h, 0.37 * build.h * build.girth], count: 120, colour: '#b0672a', tip: '#d18a3c', length: 0.05, width: 0.012, comb: [0, -1, -0.3], combAmount: 0.6, keep: (d) => d.z < 0.3 });

    const mouth: Mouth = { bored: 'closed', threat: 'threat', lipsmack: 'smack', grimace: 'grimace' }[a.expression] as Mouth;
    const head = monkeyHead(context, {
      skin, fur, tip, iris: '#c9821b', ear: a.rank === 'juvenile' ? 1.35 : 1, muzzle: a.rank === 'male' ? 1.15 : a.rank === 'juvenile' ? 0.75 : 0.95,
      brow: a.rank === 'male' ? 0.9 : 0.4, eyeOpen: { bored: 0.5, threat: 1.3, lipsmack: 0.8, grimace: 1.1 }[a.expression], mouth,
      cheek: a.pouches, furLength: 0.3, furCount: 300, scars: a.rank === 'male', ragged: 0.25 + mood.wear * 0.4, eyeSize: a.rank === 'juvenile' ? 1.15 : 1,
    });
    const R = build.head;
    head.scale.setScalar(R);
    head.position.set(body.neck[0], body.neck[1] + R * 0.55, body.neck[2] + R * 0.35);
    head.rotation.set(mix(-0.12, 0.1, hunch) + (a.expression === 'threat' ? -0.15 : 0), a.posture === 'upright' ? 0.45 * (random() < 0.5 ? -1 : 1) : (random() - 0.5) * 0.3, a.posture === 'lounging' ? 0.15 : 0);
    monkey.root.add(head);

    // Tail: medium length, down the back of the perch.
    const tailSide = random() < 0.5 ? -1 : 1;
    const tail = monkey.tube([[0, 0.08 * build.h, -0.3 * build.h], [tailSide * 0.05, 0.02, -0.42 * build.h], [tailSide * 0.09, -0.1, -0.44 * build.h], [tailSide * 0.1, -0.2, -0.4 * build.h]], 0.016 * build.limb, monkey.material(fur));

    if (a.rank === 'female') {
      // The infant: a dark head and two pink ears pressed into her belly, her arm around it.
      const baby = monkey.material('#3b2c22'), babySkin = monkey.material('#e9b3a4');
      const bx = 0.02, by = 0.42 * build.h, bz = 0.25 * build.h + hunch * 0.03;
      monkey.ball([0.05, 0.048, 0.045], [bx, by, bz + 0.03], baby, 14);
      monkey.ball([0.032, 0.034, 0.02], [bx, by - 0.008, bz + 0.065], babySkin, 12);
      for (const side of [-1, 1]) {
        monkey.ball([0.008, 0.022, 0.018], [bx + side * 0.052, by + 0.008, bz + 0.03], babySkin, 8);
        monkey.ball([0.006, 0.006, 0.004], [bx + side * 0.013, by, bz + 0.083], monkey.material('#1a1210'), 6);
      }
      monkey.ball([0.055, 0.075, 0.05], [bx, by - 0.09, bz + 0.0], baby, 12);
    }

    const [hx, hy, hz] = body.rightHand;
    if (a.stolen === 'sunglasses') {
      const frame = monkey.material('#15171a', { roughness: 0.25, metalness: 0.3 });
      const lens = monkey.material(mood.cheer > 0.5 ? '#e0932b' : '#1f2d3a', { roughness: 0.1, metalness: 0.6 });
      const glasses = new Sculpture(context);
      for (const side of [-1, 1]) {
        glasses.cylinder(0.026, 0.026, 0.006, [side * 0.031, 0, 0], lens, 16).rotation.x = Math.PI / 2;
        glasses.ring(0.027, 0.005, [side * 0.031, 0, 0], frame);
        glasses.rod([side * 0.058, 0, 0], [side * 0.062, -0.004, -0.1], 0.004, frame);
      }
      glasses.rod([-0.008, 0.008, 0], [0.008, 0.008, 0], 0.004, frame);
      glasses.root.position.set(hx - 0.03, hy + 0.015, hz + 0.03);
      glasses.root.rotation.set(0.3, -0.4, 0.5);
      monkey.root.add(glasses.root);
    } else if (a.stolen === 'phone') {
      const phone = monkey.box([0.07, 0.14, 0.009], [hx, hy + 0.06, hz + 0.01], monkey.material('#16181c', { roughness: 0.3 }));
      phone.rotation.set(-0.5, -0.3, 0.25);
      const screen = monkey.box([0.062, 0.128, 0.002], [0, 0, -0.0056], monkey.material('#9fd6ff', { emissive: '#7cc4ff', emissiveIntensity: mix(0.5, 1.4, mood.energy), roughness: 0.2 }));
      monkey.root.remove(screen);
      phone.add(screen);
      screen.position.set(0, 0, -0.0056);
      for (let i = 0; i < 4; i++) {
        const tile = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.001), monkey.material(['#ff5a5f', '#ffd23f', '#3ddc97', '#ffffff'][i], { emissive: ['#ff5a5f', '#ffd23f', '#3ddc97', '#ffffff'][i], emissiveIntensity: 0.6 }));
        tile.position.set(-0.015 + (i % 2) * 0.03, 0.02 - Math.floor(i / 2) * 0.035, -0.007);
        phone.add(tile);
      }
    } else if (a.stolen === 'marigold') {
      const orange = monkey.material('#f28a12', { emissive: '#c85a00', emissiveIntensity: 0.25 });
      for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 10 - ring * 2; i++) {
        const t = (i / (10 - ring * 2)) * Math.PI * 2 + ring;
        monkey.ball([0.012, 0.01, 0.012], [hx + Math.cos(t) * (0.028 - ring * 0.009), hy + 0.05 + ring * 0.008, hz + Math.sin(t) * (0.028 - ring * 0.009)], ring === 1 ? monkey.material('#ffb52e') : orange, 8);
      }
      monkey.rod([hx, hy, hz], [hx, hy + 0.045, hz], 0.004, monkey.material('#4f7a2c'));
    } else if (a.stolen === 'lolly') {
      const ice = ['#ff3d6e', '#ff8a1e', '#39c6e8', '#8bd43a'][Math.floor(random() * 4)];
      const lolly = new Sculpture(context);
      lolly.rod([0, -0.02, 0], [0, 0.06, 0], 0.005, lolly.material('#e6cf9c'));
      const bar = lolly.mesh(new THREE.CapsuleGeometry(0.024, 0.07, 6, 14), lolly.material(ice, { roughness: 0.25, emissive: ice, emissiveIntensity: 0.25 }), [0, 0.105, 0]);
      bar.scale.z = 0.55;
      lolly.ball([0.012, 0.02, 0.008], [0.016, 0.05, 0.012], lolly.material(ice, { roughness: 0.2 }), 8);
      lolly.root.position.set(hx, hy + 0.02, hz);
      lolly.root.rotation.set(0.1, 0, 0.45);
      monkey.root.add(lolly.root);
      monkey.rod([hx, hy - 0.01, hz], [hx + 0.02, hy - 0.09, hz - 0.03], 0.006, monkey.material(ice, { roughness: 0.2 }), 0.003);
    }

    // Leavings on the perch grow with density.
    const litter = Math.round(mood.density * 4);
    for (let i = 0; i < litter; i++) {
      const t = random() * Math.PI * 2, r = 0.14 + random() * 0.06;
      const peel = monkey.ball([0.03, 0.006, 0.014], [Math.cos(t) * r, 0.006, Math.sin(t) * r * 0.6], monkey.material(i % 2 ? '#e8c53a' : '#f28a12'), 8);
      peel.rotation.y = t;
    }

    monkey.root.position.y = top;
    monkey.root.rotation.y = (random() - 0.5) * 0.3;
    s.root.add(monkey.root);

    const pace = mix(0.2, 2.2, mood.energy), baseYaw = head.rotation.y;
    return s.finish({
      update: (_dt, time) => {
        head.rotation.y = baseYaw + Math.sin(time * pace) * 0.12 * mood.energy;
        tail.rotation.y = Math.sin(time * pace * 1.7) * 0.1 * mood.energy;
      },
    });
  },
});
