import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { BELTS, BELT_COLOUR, type P, belly, bottle, bucket, hairdo, mawashi, paint, pickSkin, reach, rig, sandals, sheen, towel } from './pose';

export default defineThing({
  questions: {
    build: choice('Who is at the pole?', {
      apprentice: 'A slight new apprentice, all elbows, still learning the rhythm.',
      average: 'A solid mid-ranker, thick through the shoulders.',
      veteran: 'A heavy veteran with a great belly, every strike landing the same.',
    }),
    belt: choice('What colour is his mawashi?', BELTS),
    strike: score('How far through the strike is he?', ['Palm drawn back to the shoulder, about to land', 'Mid-swing, the hand a span from the wood', 'Palm flat on the pole, arm driven straight, weight behind it']),
    pole: choice('What is the pole like?', {
      cedar: 'Pale fresh cedar, newly set.',
      dark: 'Old wood gone dark and grey with handprints.',
      wrapped: 'Bound with rope at shoulder height where the palms land.',
    }),
    hair: choice('What is his hair like?', {
      chonmage: 'An oiled topknot folded over the crown.',
      cropped: 'Cropped short, not yet long enough to tie.',
      oicho: 'The formal fan topknot of a ranked man.',
    }),
    chalk: noul('Is there chalk dust on the base and the sand around the pole?'),
    floor: choice('What lies at the foot of the pole?', {
      nothing: 'Nothing: bare sand and the base.',
      towel: 'A damp towel dropped in a heap.',
      bottle: 'A plastic water bottle, half empty.',
      bucket: 'A wooden bucket of water with a ladle across it.',
      sandals: 'A pair of flat sandals kicked off side by side.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const build = { apprentice: 'slight', average: 'average', veteran: 'heavy' }[a.build] as 'slight' | 'average' | 'heavy';
    const H = { apprentice: mix(1.7, 1.78, random()), average: mix(1.78, 1.86, random()), veteran: mix(1.84, 1.92, random()) }[a.build];
    const skin = pickSkin(random);

    // ---- the pole: a tapered post with a strike band, set in a square timber base
    const poleH = 2.4, poleZ = 0.42;
    const woodTone = a.pole === 'dark' ? ['#6b5a46', '#4f4337'] : ['#d9b98a', '#bf9a66'];
    const bandY0 = 1.22, bandY1 = 1.62;
    const grain = paint(256, 1024, (c) => {
      c.fillStyle = woodTone[0];
      c.fillRect(0, 0, 256, 1024);
      for (let i = 0; i < 70; i++) {
        c.fillStyle = `rgba(60,40,20,${0.08 + random() * 0.12})`;
        const x = random() * 256;
        c.fillRect(x, 0, 1 + random() * 3, 1024);
      }
      // The darkened band where the palms land: canvas rows run from the top of the pole.
      const top = (1 - bandY1 / poleH) * 1024, bottom = (1 - bandY0 / poleH) * 1024;
      const g = c.createLinearGradient(0, top - 40, 0, bottom + 40);
      g.addColorStop(0, 'rgba(50,30,15,0)');
      g.addColorStop(0.3, `rgba(50,30,15,${0.45 + mood.wear * 0.35})`);
      g.addColorStop(0.7, `rgba(50,30,15,${0.45 + mood.wear * 0.35})`);
      g.addColorStop(1, 'rgba(50,30,15,0)');
      c.fillStyle = g;
      c.fillRect(0, top - 40, 256, bottom - top + 80);
      // Pale palm prints in the band.
      for (let i = 0; i < 12; i++) {
        c.fillStyle = `rgba(230,210,180,${0.08 + random() * 0.1})`;
        c.beginPath();
        c.ellipse(random() * 256, top + random() * (bottom - top), 14, 22, random(), 0, Math.PI * 2);
        c.fill();
      }
    });
    const poleMat = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.75 });
    const pole = s.mesh(new THREE.CylinderGeometry(0.085, 0.11, poleH, 24), poleMat, [0, poleH / 2 + 0.1, poleZ]);
    void pole;
    s.cylinder(0.085, 0.085, 0.03, [0, poleH + 0.115, poleZ], s.material(woodTone[1], { roughness: 0.7 }), 24);
    const base = s.material('#8a7355', { roughness: 0.85 });
    s.box([0.56, 0.14, 0.56], [0, 0.07, poleZ], base);
    s.box([0.62, 0.04, 0.62], [0, 0.02, poleZ], s.material('#6e5a44', { roughness: 0.9 }));
    if (a.pole === 'wrapped') {
      const rope = s.material('#c9b58a', { roughness: 0.95 });
      for (let i = 0; i < 9; i++) s.ring(0.104 - (i / 9) * 0.006, 0.014, [0, bandY0 + 0.05 + i * 0.045, poleZ], rope).rotation.x = Math.PI / 2;
    }
    if (a.chalk) {
      const chalk = s.material('#f1eee6', { roughness: 1 });
      s.cylinder(0.3, 0.3, 0.006, [0.05, 0.143, poleZ + 0.02], chalk, 20).scale.z = 0.8;
      s.scatter(new THREE.SphereGeometry(1, 6, 4), chalk, Array.from({ length: 26 }, () => {
        const angle = random() * Math.PI * 2, r = 0.3 + random() * 0.35;
        return { at: [Math.cos(angle) * r, 0.006, poleZ + Math.sin(angle) * r] as P, size: 0.015 + random() * 0.02 };
      })).scale.y = 0.35;
    }

    // ---- the wrestler, facing the pole
    const person = figure(s, {
      height: H, build, style: 'doll', hair: 'short', hairColor: '#1a1512', skin, top: skin, bottom: skin, shoes: skin, sleeves: 'short', pose: 'standing', gaze: 'down',
    });
    person.root.position.set(0.02, 0, -0.5);
    s.root.add(person.root);
    if (build !== 'slight') belly(person, H, s.material(skin, { roughness: 0.45 }), build === 'heavy' ? 1 : 0.7);
    mawashi(s, person, H, build, BELT_COLOUR[a.belt]);
    hairdo(s, person, H, a.hair);
    if (mood.energy > 0.45 || a.strike > 0.6) sheen(s, person, skin, 0.3);

    const pose = rig(person);
    const drive = a.strike;
    // Front foot forward and bent, rear leg long with the foot sliding, body leaning into the pole.
    pose.leg('left', { forward: 26 + drive * 10, out: 8, knee: 36 + drive * 14, foot: 'flat' });
    pose.leg('right', { forward: -(14 + drive * 12), out: 6, knee: 6, foot: 'flat' });
    pose.lean(8 + drive * 10, 0);
    pose.bow(10 + drive * 6, 0, 8 - drive * 16);
    pose.look(20, 0);
    // The free arm drawn back to the hip, elbow bent, ready for the next strike.
    pose.arm('left', { forward: -(18 + drive * 14), out: 10, bend: 100 - drive * 20, across: 10 });
    person.root.updateMatrixWorld(true);
    // The striking palm: on the wood when driven home, drawn back along the line of the strike before that.
    const face = new THREE.Vector3(-0.04, mix(bandY0 + 0.1, bandY1 - 0.08, random()), poleZ - 0.1);
    const back = face.clone().add(new THREE.Vector3(-0.1, 0.06, -0.38));
    reach(person, 'right', face.clone().lerp(back, 1 - drive), -0.35 + drive * 0.2, 0.85);
    person.settle();
    person.root.position.set(0.02, 0, -0.5 - (1 - drive) * 0.04);

    // ---- what lies at the foot of the pole
    const side = random() < 0.5 ? -0.5 : 0.5;
    if (a.floor === 'towel') {
      const heap = towel(s, [side, 0, poleZ + 0.1], '#ebe6da', random() * 3);
      heap.scale.set(1, 0.8, 1.2);
    }
    if (a.floor === 'bottle') bottle(s, [side * 0.9, 0, poleZ + 0.2], random() < 0.3);
    if (a.floor === 'bucket') bucket(s, [side * 1.2, 0, poleZ + 0.15], random() * 3);
    if (a.floor === 'sandals') sandals(s, [side * 0.9, 0, poleZ + 0.3], random() - 0.5);

    // Turn the pair so the wrestler stands beside the pole in the picture instead of behind it.
    s.root.rotation.y = -0.8;
    const energy = mood.energy;
    const restLean = person.joints.body.rotation.x;
    const phase = random() * 6.28;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        person.joints.body.rotation.x = restLean + Math.sin(time * mix(1.5, 5, energy) + phase) * 0.02 * energy;
      },
    });
  },
});
