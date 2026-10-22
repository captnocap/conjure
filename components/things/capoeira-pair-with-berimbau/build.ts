import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { RAD, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    move: choice('What move is the leading player in?', {
      cartwheel: 'Upside down mid-cartwheel, one hand on the ground, legs scissored in the air.',
      kick: 'A high spinning kick, one leg thrown up past head height, arms flung for balance.',
      sweep: 'A low sweep: crouched on one bent leg, the other leg scything out along the ground.',
      handstand: 'A still handstand, both hands planted, legs straight up and slightly apart.',
    }),
    time: choice('Who keeps time?', {
      berimbau: 'A musician seated on a cooler playing a berimbau, the tall bow with a gourd.',
      drum: 'A drummer seated at a tall conical atabaque drum.',
      clapping: 'A standing player clapping the rhythm and singing.',
    }),
    trousers: choice('What are the trousers like?', {
      white: 'Plain white trousers all round.',
      corded: 'White trousers with coloured cord belts at the waist.',
      mixed: 'Mixed: white, black and faded blue.',
    }),
    shirts: choice('Shirts on or off?', {
      on: 'White shirts on.',
      off: 'Shirts off, bare backs shining.',
      mixed: 'Some on, some off.',
    }),
    who: choice('Who is playing?', {
      men: 'Two grown men at full stretch.',
      mixed: 'A man and a woman with her hair in a bun.',
      kids: 'Two children, small and quick.',
      master: 'An old master in a white cap at the berimbau, two young students in the ring.',
    }),
    onlookers: noul('Does a loose ring of three onlookers crouch around the game?'),
    heat: score('How far into the game are they?', ['Warming up, the moves small and careful', 'In full flow', 'Breathless, the last fast exchange before the song ends']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const people: ReturnType<typeof figure>[] = [];
    const white = '#f4f1e8';
    const trouserColours = { white: [white, white, white], corded: [white, white, white], mixed: [white, '#1d1d1f', '#6e86a8'] }[a.trousers];
    const cordColours = ['#2e8b57', '#f2c21c', '#2b6fb8', '#d8262c', '#f4f1e8'];
    const heights = { men: [1.78, 1.74], mixed: [1.78, 1.64], kids: [1.22, 1.3], master: [1.7, 1.66] }[a.who];
    const shirtOn = (index: number) => (a.shirts === 'on' ? true : a.shirts === 'off' ? false : index % 2 === 0);
    const skins = [pickSkin(random), pickSkin(random), pickSkin(random)];

    const player = (index: number, options: NonNullable<Parameters<typeof figure>[1]>) => {
      const skin = skins[index % 3];
      const person = figure(s, {
        style: 'doll', skin, sleeves: 'short', shoes: skin, build: a.who === 'kids' ? 'slight' : 'average',
        top: shirtOn(index) ? white : skin, bottom: trouserColours[index % 3],
        hair: a.who === 'mixed' && index === 1 ? 'bun' : 'short', hairColor: '#241a14',
        ...options,
      });
      s.root.add(person.root);
      people.push(person);
      if (a.trousers === 'corded') {
        const cord = new THREE.Mesh(new THREE.TorusGeometry((options.height ?? 1.7) * 0.09, (options.height ?? 1.7) * 0.006, 6, 20), s.material(cordColours[(index + Math.floor(random() * 3)) % cordColours.length]));
        cord.rotation.x = Math.PI / 2;
        cord.position.y = (options.height ?? 1.7) * 0.03;
        person.pelvis.add(cord);
      }
      return person;
    };

    // The leading player, in the air or low to the ground.
    const H0 = heights[0];
    const spread = mix(0.6, 1, a.heat);
    const mover = player(0, { height: H0, pose: 'standing', gaze: 'ahead' });
    const rigA = rig(mover);
    if (a.move === 'cartwheel') {
      rigA.arm('left', { forward: 172, out: 30, bend: 4 });
      rigA.arm('right', { forward: 168, out: 36, bend: 8 });
      rigA.leg('left', { out: 42 * spread, knee: 6, foot: 30 });
      rigA.leg('right', { out: 44 * spread, forward: 8, knee: 10, foot: 30 });
      rigA.look(-10, 0);
      mover.root.rotation.set(0, 0.35, 150 * RAD);
    } else if (a.move === 'kick') {
      rigA.leg('right', { forward: mix(112, 140, spread), out: 14, knee: 6, foot: 20 });
      rigA.leg('left', { forward: -8, out: 4, knee: 4 });
      rigA.arm('left', { forward: -45, out: 45, bend: 20 });
      rigA.arm('right', { forward: 20, out: 80, bend: 20 });
      rigA.lean(-20);
      rigA.bow(-6);
      rigA.look(-10, 10);
      mover.root.rotation.y = 0.5;
    } else if (a.move === 'sweep') {
      rigA.leg('left', { forward: 110, out: 8, knee: 150 });
      rigA.leg('right', { forward: 15, out: 88 * spread, knee: 4, foot: 10 });
      rigA.arm('left', { forward: 62, out: 20, bend: 4 });
      rigA.arm('right', { forward: 10, out: 70, bend: 30, across: 10 });
      rigA.lean(22);
      rigA.look(-30, 15);
      mover.root.rotation.y = 0.3;
    } else {
      rigA.arm('left', { forward: 176, out: 10, bend: 2 });
      rigA.arm('right', { forward: 176, out: 10, bend: 2 });
      rigA.leg('left', { out: 10 * spread, knee: 4, foot: 15 });
      rigA.leg('right', { out: 10 * spread, forward: 12, knee: 24, foot: 15 });
      rigA.look(-35, 0);
      mover.root.rotation.set(0, 0.3, Math.PI);
    }
    mover.root.position.set(-0.4, 0, 0.1);
    rigA.settle();

    // The partner, crouched low on one hand and one foot, watching the move.
    const H1 = heights[1];
    const partner = player(1, { height: H1, pose: 'crouching', gaze: 'ahead', mirror: true });
    const rigB = rig(partner);
    rigB.arm('right', { forward: 75, out: 18, bend: 2 });
    rigB.arm('left', { forward: 50, out: 20, bend: 70, across: 10 });
    rigB.leg('left', { forward: 30, out: 55, knee: 10, foot: 'flat' });
    rigB.look(-24, 0);
    partner.root.position.set(0.7, 0, -0.1);
    partner.root.rotation.y = -Math.PI / 2 - 0.35 + (random() - 0.5) * 0.3;
    rigB.settle();

    // The musician on a cooler: berimbau, drum or clapping.
    const H2 = a.who === 'master' ? 1.62 : a.who === 'kids' ? 1.7 : mix(1.66, 1.8, random());
    const seated = a.time !== 'clapping';
    const musician = player(2, {
      height: H2, pose: seated ? 'sitting' : 'standing', gaze: 'ahead',
      hair: a.who === 'master' ? 'cap' : 'short', hairColor: a.who === 'master' ? white : '#241a14',
    });
    musician.root.position.set(0.05, 0, -1.05);
    musician.root.rotation.y = 0.15;
    const rigC = rig(musician);
    const wood = s.material('#a0742f', { roughness: 0.55 });
    const dark = s.material('#2a2320');
    if (a.time === 'berimbau') {
      rigC.arm('left', { forward: 30, out: 18, bend: 80, across: 20 });
      rigC.arm('right', { forward: 40, out: 6, bend: 90, across: 20 });
    } else if (a.time === 'drum') {
      rigC.arm('left', { forward: 50, out: 24, bend: 30 });
      rigC.arm('right', { forward: 58, out: 30, bend: 30 });
      rigC.bow(10);
    } else {
      rigC.arm('left', { forward: 65, out: 10, bend: 80, across: 45 });
      rigC.arm('right', { forward: 65, out: 10, bend: 80, across: 45 });
      rigC.look(-8, 0);
    }
    rigC.settle();
    musician.root.updateMatrixWorld(true);
    if (seated) {
      const seat = worldOf(musician.pelvis);
      const coolerH = Math.max(0.2, musician.hipHeight - 0.03 * H2);
      const coolerColour = ['#2d6fb6', '#d8262c', '#f4f1e8', '#2e8b57'][Math.floor(random() * 4)];
      const box = s.box([0.46 * H2 / 1.75, coolerH, 0.3 * H2 / 1.75], [seat.x, coolerH / 2, seat.z - 0.03], s.material(coolerColour, { roughness: 0.45 }));
      box.rotation.y = 0.15;
      const lid = s.box([0.48 * H2 / 1.75, 0.035, 0.32 * H2 / 1.75], [seat.x, coolerH + 0.017, seat.z - 0.03], s.material(white));
      lid.rotation.y = 0.15;
    }
    let gourdGlow: THREE.Mesh | null = null;
    if (a.time === 'berimbau') {
      // The bow stands in the left hand, gourd low against the belly, stick in the right.
      const left = worldOf(musician.hands.left), right = worldOf(musician.hands.right);
      const base: [number, number, number] = [left.x, left.y - 0.3 * H2, left.z + 0.06];
      const top: [number, number, number] = [left.x + 0.08, left.y + 0.78 * H2, left.z + 0.05];
      const bowed = s.tube([base, [left.x - 0.1, (base[1] + top[1]) / 2, left.z + 0.11], top], 0.014, wood);
      void bowed;
      s.rod(base, top, 0.003, s.material('#d9d2c2', { metalness: 0.6 }));
      gourdGlow = s.lathe([[0, 0], [0.07, 0.02], [0.1, 0.07], [0.09, 0.13], [0.05, 0.17], [0, 0.17]], s.material('#c99a4f', { roughness: 0.8 }), [left.x - 0.02, left.y - 0.18 * H2, left.z + 0.1]);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.32, 6), wood);
      stick.position.set(0, -0.05, 0.08);
      stick.rotation.x = 1.1;
      musician.hands.right.add(stick);
      const caxixi = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 8), s.material('#c9b27e', { roughness: 0.95 }));
      caxixi.position.set(0.03, -0.06, 0.03);
      caxixi.rotation.x = Math.PI;
      musician.hands.right.add(caxixi);
    } else if (a.time === 'drum') {
      const hands = [worldOf(musician.hands.left), worldOf(musician.hands.right)];
      const cx = (hands[0].x + hands[1].x) / 2, cz = (hands[0].z + hands[1].z) / 2 + 0.05;
      const drumH = Math.max(0.6, (hands[0].y + hands[1].y) / 2 - 0.02);
      const drum = s.lathe([[0.1, 0], [0.12, 0.05], [0.15, drumH * 0.5], [0.17, drumH * 0.9], [0.17, drumH], [0, drumH]], s.material('#7a4a26', { roughness: 0.6 }), [cx, 0, cz]);
      drum.rotation.y = 0;
      s.cylinder(0.165, 0.165, 0.01, [cx, drumH + 0.004, cz], s.material('#e3cfa6', { roughness: 0.9 }), 24);
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * Math.PI * 2;
        s.rod([cx + Math.sin(t) * 0.16, drumH * 0.55, cz + Math.cos(t) * 0.16], [cx + Math.sin(t + 0.5) * 0.175, drumH * 0.92, cz + Math.cos(t + 0.5) * 0.175], 0.006, s.material('#d9c9a0'));
      }
      s.ring(0.165, 0.012, [cx, drumH * 0.55, cz], dark).rotation.x = Math.PI / 2;
    }

    // Onlookers crouched round the ring, drawn in.
    if (a.onlookers) {
      const spots: [number, number, number][] = [[-1.15, -0.5, 0.9], [1.2, -0.7, -1.0], [-0.85, 0.95, 2.6]];
      const tops = ['#f2c21c', '#2b6fb8', '#f0a8b8', '#f4f1e8', '#2e8b57', '#d8262c'];
      for (const [x, z, turn] of spots) {
        const watcher = figure(s, {
          height: mix(1.5, 1.82, random()), style: 'doll', skin: pickSkin(random), hair: (['short', 'long', 'cap', 'bun'] as const)[Math.floor(random() * 4)],
          top: tops[Math.floor(random() * tops.length)], bottom: ['#2c3a55', '#f4f1e8', '#3b3b3f'][Math.floor(random() * 3)], shoes: '#2a2a2c', sleeves: 'short',
          pose: 'crouching', gaze: 'ahead', mirror: random() < 0.5,
        });
        watcher.root.position.set(x + (random() - 0.5) * 0.2, 0, z + (random() - 0.5) * 0.2);
        watcher.root.rotation.y = turn + (random() - 0.5) * 0.3;
        s.root.add(watcher.root);
        people.push(watcher);
      }
    }

    const energy = mood.energy;
    const tempo = mix(0.6, 1.4, a.heat) * mix(0.5, 1.5, energy);
    const rightArm = musician.hands.right.parent!.parent!;
    const baseBend = rightArm.rotation.x;
    const moverBase = mover.root.rotation.z;
    return s.finish({
      update: (dt, time) => {
        for (const person of people) person.update(dt, time);
        // The stick hand keeps time; the cartwheel and kick breathe with the rhythm.
        rightArm.rotation.x = baseBend + Math.sin(time * 6 * tempo) * 0.12;
        if (a.move === 'cartwheel') mover.root.rotation.z = moverBase + Math.sin(time * 1.5 * tempo) * 0.03;
        if (gourdGlow) gourdGlow.rotation.y = Math.sin(time * 2) * 0.05;
      },
    });
  },
});
