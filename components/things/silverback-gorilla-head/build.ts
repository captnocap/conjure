import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { blob, bust, eye, fur, jaw } from './ape';

export default defineThing({
  questions: {
    face: choice('What mood is on the face?', {
      chewing: 'Calm, jaw working slowly on a mouthful, one cheek bulging, eyes half attentive.',
      warning: 'A sidelong warning glance: head turned away, eyes cut back at you, lips pressed tight.',
      roar: 'A full open roar: jaw dropped wide, long canines and pink tongue on show.',
      sleepy: 'Sleepy: lids nearly shut, head sunk into the shoulders, mouth slack.',
    }),
    who: choice('Which gorilla is it?', {
      silverback: 'A mature silverback: tall pointed crest, enormous neck, a saddle of silver-grey over the back.',
      female: 'An adult female: smooth rounded head with no crest, slighter shoulders, all black.',
      juvenile: 'A juvenile: small round fluffy head, big shining eyes, short muzzle.',
    }),
    plant: choice('What is in its mouth?', {
      none: 'Nothing.',
      stem: 'A long green stem of wild celery or bamboo jutting from the corner of the mouth.',
      leaves: 'A wad of leaves, half of them still sticking out between the lips.',
    }),
    coat: choice('What state is the coat in?', {
      dry: 'Dry and full, soft matte black.',
      damp: 'Damp from mist: beaded with droplets, a little flattened.',
      soaked: 'Rain-soaked: hair clumped into dripping points, water running off the brow.',
    }),
    looks: choice('Where is it looking?', {
      viewer: 'Directly at the viewer.',
      away: 'Away to one side, showing its profile, pointedly ignoring you.',
      down: 'Down at the ground or at something in its hands.',
      past: 'Up and past you into the distance.',
    }),
    posture: choice('How are the shoulders held?', {
      squared: 'Squared and broad, the full bulk on show.',
      hunched: 'Hunched high around the ears, withdrawn, sitting out the weather.',
      chestbeat: 'Reared up with both fists raised to the chest, mid chest-beat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const silver = a.who === 'silverback', young = a.who === 'juvenile';
    const K = young ? 0.6 : silver ? 1 : 0.84;
    const wet = a.coat === 'soaked' ? 1 : a.coat === 'damp' ? 0.45 : 0;
    const coat = new THREE.Color(young ? '#1f1c1b' : '#15151a').lerp(new THREE.Color('#3d362f'), mood.wear * 0.35);
    const skin = s.material('#34323a', { roughness: mix(0.5, 0.25, wet) });
    const skin2 = s.material('#4b4850', { roughness: mix(0.45, 0.22, wet) });
    const under = s.material(coat, { roughness: 0.95 });
    const gum = s.material('#b85a62', { roughness: 0.4 });
    const tooth = s.material('#efe6c8', { roughness: 0.35 });
    const tongue = s.material('#d8707c', { roughness: 0.45 });
    const hair = (o: Parameters<typeof fur>[1]) => fur(s, {
      ...o,
      count: Math.round(o.count * mix(1, 0.55, wet)),
      width: mix(0.4, 0.75, wet), droop: mix(o.droop ?? 0.5, 0.85, wet), rough: mix(0.92, 0.3, wet),
      mess: 0.2 + mood.wear * 0.4,
    });

    const hunched = a.posture === 'hunched', beat = a.posture === 'chestbeat';
    const sw = young ? 0.3 : silver ? 0.46 : 0.38, sh = (hunched ? 0.44 : beat ? 0.4 : 0.34) * (young ? 0.85 : 1), sd = 0.3;
    s.root.add(bust(s, [sw, sh, sd], under));
    const furLen = (young ? 0.085 : 0.06);
    hair({ at: [0, 0, 0], radii: [sw, sh, sd], count: 1100, length: furLen * 1.1, color: coat, keep: (d) => d.y > 0.03, colorAt: (d) => (silver && d.z < -0.15 && d.y < 0.75 ? '#a9adb0' : undefined) });
    // Trapezius hump rising behind the head.
    if (!young) { blob(s, [sw * 0.62, 0.17, 0.2], [0, sh * 0.82, -0.1], under); hair({ at: [0, sh * 0.82, -0.1], radii: [sw * 0.62, 0.17, 0.2], count: 320, length: furLen, color: coat, keep: (d) => d.y > -0.2 && d.z < 0.5 }); }

    const head = new THREE.Group();
    const headY = sh + (hunched ? 0.06 : 0.17) + (young ? 0.02 : 0);
    head.position.set(0, headY, 0.1);
    s.root.add(head);
    const turn = random() < 0.5 ? -1 : 1;
    const headYaw = { viewer: 0, away: 0.85 * turn, down: 0.1 * turn, past: -0.25 * turn }[a.looks] + (a.face === 'warning' ? 0.5 * turn : 0);
    const headPitch = { viewer: -0.28, away: -0.2, down: 0.12, past: -0.5 }[a.looks] + (a.face === 'sleepy' ? 0.2 : 0);
    head.rotation.set(headPitch, headYaw, a.face === 'sleepy' ? 0.14 * turn : (random() - 0.5) * 0.08);
    const gaze: [number, number] = a.face === 'warning' ? [-0.75 * turn, 0.05] : a.looks === 'down' ? [0, -0.4] : a.looks === 'past' ? [0, 0.25] : [0, 0];
    const hs = young ? 1.3 : 1.18; // a young head is big for its body
    head.scale.setScalar(hs);

    // Skull, crest and coat.
    blob(s, [0.15, 0.155, 0.165], [0, 0.03, -0.02], under, [0, 0, 0], head);
    const crest = silver ? 0.15 : young ? 0 : 0.04;
    if (crest > 0) blob(s, [0.115, 0.1 + crest, 0.15], [0, 0.085, -0.06], under, [-0.35, 0, 0], head);
    hair({
      parent: head, at: [0, 0.03, -0.02], radii: [0.15, 0.155, 0.165], count: 900, length: furLen * (young ? 0.9 : 0.6), color: coat,
      keep: (d) => d.z < 0.35 || d.y > 0.72, colorAt: (d) => (!young && d.y > 0.55 && d.z > -0.3 ? '#2b211d' : undefined),
    });
    if (crest > 0) hair({ parent: head, at: [0, 0.085, -0.06], radii: [0.112, 0.085 + crest, 0.148], count: 520, length: furLen * 0.45, color: '#2b211d', droop: 0.55, keep: (d) => d.y > -0.1 });

    // Leathery face plate, heavy brow, deep small eyes.
    blob(s, [0.118, 0.125, 0.07], [0, -0.005, 0.105], skin, [0, 0, 0], head);
    const lidBase = { chewing: 0.3, warning: 0.12, roar: 0.05, sleepy: 0.88 }[a.face];
    const browDrop = a.face === 'warning' || a.face === 'roar' ? -0.01 : 0;
    blob(s, [0.135, 0.034, 0.05], [0, 0.058 + browDrop, 0.142], skin2, [0.3, 0, 0], head);
    for (const side of [-1, 1]) {
      blob(s, [0.058, 0.032, 0.04], [side * 0.058, 0.066 + browDrop, 0.15], skin, [0.3, 0, side * (a.face === 'warning' ? 0.22 : -0.08)], head, 16);
      blob(s, [0.036, 0.03, 0.02], [side * 0.05, 0.022, 0.15], skin2, [0, 0, 0], head, 14);
      eye(s, { parent: head, at: [side * 0.05, 0.022, 0.158], r: young ? 0.021 : 0.0165, iris: young ? '#8a5522' : '#a8621e', gaze, lid: lidBase, lidMat: skin, sclera: a.face === 'warning' ? '#8a7260' : '#2a1c14' });
    }
    for (const side of [-1, 1]) blob(s, [0.014, 0.03, 0.022], [side * 0.15, 0.03, -0.01], skin, [0, side * 0.5, 0], head, 12);

    // Muzzle and the wide heart-shaped nose.
    const gape = { chewing: 0.06, warning: 0, roar: 0.95, sleepy: 0.14 }[a.face];
    const mL = young ? 0.14 : 0.2, mW = young ? 0.17 : 0.225;
    const j = jaw(s, {
      parent: head, hinge: [0, -0.085, 0.045], length: mL, width: mW, slope: 0.12,
      upperHeight: 0.07, lowerHeight: young ? 0.055 : 0.075, gape, lift: 0.3,
      upper: skin2, lower: skin2, gum, tooth, lip: skin, lipRadius: 0.007,
      canine: young ? 0.012 : silver ? 0.05 : 0.03, lowerCanine: young ? 0.01 : 0.032, incisor: 0.016, teeth: 'whole', tongue,
    });
    const nose = new THREE.Group();
    nose.position.set(0, 0.052, mL * 0.72);
    nose.rotation.x = 0.55;
    j.upper.add(nose);
    blob(s, [0.062, 0.04, 0.03], [0, 0, 0], skin, [0, 0, 0], nose, 18);
    for (const side of [-1, 1]) {
      const ring = s.mesh(new THREE.TorusGeometry(0.021, 0.0085, 8, 18), skin2);
      ring.position.set(side * 0.03, -0.004, 0.022);
      ring.rotation.set(0, side * 0.35, 0);
      nose.add(ring);
      blob(s, [0.017, 0.015, 0.008], [side * 0.03, -0.004, 0.025], s.material('#050405'), [0, side * 0.35, 0], nose, 10);
    }
    blob(s, [0.02, 0.05, 0.02], [0, 0.04, -0.012], skin, [0, 0, 0], nose, 10);
    if (a.face === 'chewing' || a.plant === 'leaves') blob(s, [0.05, 0.05, 0.05], [turn * mW * 0.36, -0.01, mL * 0.42], skin2, [0, 0, 0], j.lower, 14);

    // Something to chew.
    const green = s.material('#6f9a34', { roughness: 0.7 });
    if (a.plant === 'stem') {
      const from: [number, number, number] = [-turn * mW * 0.3, 0.0, mL * 0.8];
      const to: [number, number, number] = [-turn * (mW * 0.5 + 0.2), -0.1, mL * 0.8 + 0.2];
      j.lower.add(s.rod(from, to, 0.013, s.material('#a9c26a', { roughness: 0.6 }), 0.009));
      for (let i = 0; i < 4; i++) {
        const t = 0.55 + i * 0.15;
        const leaf = blob(s, [0.016, 0.004, 0.055], [mix(from[0], to[0], t) + (random() - 0.5) * 0.04, mix(from[1], to[1], t) + 0.02, mix(from[2], to[2], t)], green, [random(), random() * 3, random()], j.lower, 8);
        leaf.castShadow = true;
      }
    }
    if (a.plant === 'leaves') {
      for (let i = 0; i < 9; i++) blob(s, [0.02, 0.004, 0.05 + random() * 0.03], [(random() - 0.5) * mW * 0.6, 0.004 + random() * 0.012, mL * (0.92 + random() * 0.14)], i % 3 ? green : s.material('#8fb84a'), [(random() - 0.5) * 1.2, (random() - 0.5) * 1.6, random()], j.lower, 8);
    }

    // Fists for a chest-beat.
    if (beat) {
      for (const side of [-1, 1]) {
        const up = side === turn ? 0.07 : -0.02;
        const fist: [number, number, number] = [side * sw * 0.3, sh * 0.62 + up, sd + 0.07];
        s.tube([[side * sw * 0.86, sh * 0.5, 0.02], [side * (sw + 0.06), sh * 0.12, sd * 0.75], [side * sw * 0.62, sh * 0.34 + up, sd + 0.1], fist], young ? 0.045 : 0.07, under);
        hair({ at: [side * (sw + 0.02), sh * 0.25, sd * 0.7], radii: [0.1, sh * 0.42, 0.16], count: 260, length: furLen, color: coat });
        blob(s, [0.075, 0.068, 0.06], fist, skin);
        for (let f = 0; f < 4; f++) blob(s, [0.019, 0.026, 0.024], [fist[0] - side * 0.045 + side * f * 0.03, fist[1] + 0.03, fist[2] + 0.034], skin2, [0, 0, 0], undefined, 8);
      }
    }

    // Rain: beads on the coat, drips off the brow.
    if (wet > 0) {
      const water = new THREE.MeshStandardMaterial({ color: '#9fb9cc', roughness: 0.08, metalness: 0.3 });
      const beads: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < Math.round(70 * wet); i++) {
        const u = random() * Math.PI * 2, v = random() * 0.9;
        const r = Math.sqrt(1 - v * v);
        beads.push({ at: [Math.cos(u) * r * (sw + 0.05), v * (sh + 0.05), Math.sin(u) * r * (sd + 0.05)], size: 0.004 + random() * 0.004 });
      }
      s.scatter(new THREE.SphereGeometry(1, 6, 5), water, beads);
      const drops: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < Math.round(26 * wet); i++) {
        const u = random() * Math.PI * 2, v = random();
        const r = Math.sqrt(1 - v * v);
        drops.push({ at: [Math.cos(u) * r * 0.16, 0.03 + v * (0.17 + crest), -0.02 + Math.sin(u) * r * 0.175], size: 0.004 + random() * 0.004 });
      }
      for (let i = 0; i < Math.round(9 * wet); i++) drops.push({ at: [(random() - 0.5) * 0.24, 0.03 + browDrop - random() * 0.02, 0.19], size: 0.008 });
      head.add(s.scatter(new THREE.SphereGeometry(1, 6, 5), water, drops));
      if (wet === 1) for (let i = 0; i < 5; i++) { const x = (random() - 0.5) * 0.22; head.add(s.rod([x, 0.035 + browDrop, 0.19], [x, -0.01 - random() * 0.03, 0.192], 0.0045, water, 0.002)); }
    }

    s.root.scale.setScalar(K);
    let t0 = random() * 10;
    const rest = head.rotation.clone(), restJaw = j.lower.rotation.x;
    const speed = mix(0.5, 2, mood.energy);
    return s.finish({
      update: (dt) => {
        t0 += dt * speed;
        head.rotation.y = rest.y + Math.sin(t0 * 0.5) * 0.03;
        if (a.face === 'chewing') { j.lower.rotation.x = restJaw + (Math.sin(t0 * 2.2) * 0.5 + 0.5) * 0.09; j.lower.position.x = Math.sin(t0 * 1.1) * 0.006; }
        if (a.face === 'roar') j.lower.rotation.x = restJaw * (1 + Math.sin(t0 * 6) * 0.04);
      },
    });
  },
});
