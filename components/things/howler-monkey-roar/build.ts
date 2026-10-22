import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { type V3, blob, bough, coat, eye, leaves, settle, skin, sweep, tufts } from './beast';

export default defineThing({
  questions: {
    form: choice('Which colour form is it?', {
      black: 'A black howler, coal-dark all over.',
      red: 'A red howler, deep rust-orange fur that glows in sun.',
      mantled: 'A mantled howler: black with a fringe of golden-brown hair along its flanks.',
      golden: 'A pale golden-blonde howler with a dark face.',
    }),
    call: score('How hard is it calling?', ['A closed-mouth murmur', 'A rising grunt', 'A steady howl', 'The full dawn roar, eyes squeezed shut']),
    sound: choice('How is the sound shown?', {
      none: 'Not at all; only the pose says it is calling.',
      rings: 'Faint concentric rings spreading from its mouth.',
      leaves: 'Leaves shaken loose and drifting down around it.',
      both: 'Rings from the mouth and a shower of shaken leaves.',
    }),
    who: choice('Who is calling?', {
      male: 'A big male with a heavy beard and a ballooning throat.',
      female: 'A slimmer female with a short neat beard.',
      juvenile: 'A big-headed juvenile trying out its voice.',
      elder: 'A gaunt old male, grey in the muzzle and beard.',
    }),
    hold: choice('How does it hold on?', {
      clutch: 'Crouched forward, both hands clutching the branch, tail coiled round it.',
      perch: 'Sat back upright with hands on knees, tail hanging in a loose J.',
      dangle: 'Dangling under a high limb by its tail and one arm, legs loose.',
    }),
    target: choice('Where is the call aimed?', {
      sky: 'Straight up at the sky, head thrown right back.',
      valley: 'Out across the valley at a rival troop, head turned.',
      below: 'Down at an intruder on the forest floor.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const [base, streak] = { black: ['#2d2a28', '#4d4641'], red: ['#a8431f', '#6c2411'], mantled: ['#2b2826', '#4a423c'], golden: ['#d6b06a', '#a17b3a'] }[a.form];
    const fur = coat(context, new THREE.Color(base).offsetHSL((mood.warmth - 0.5) * 0.03, 0, 0), streak);
    const elder = a.who === 'elder';
    const beardFur = elder ? coat(context, '#9c968f', '#6f6a64') : fur;
    const mantle = coat(context, '#c1913f', '#8a6325');
    const bare = skin('#221d1c', { roughness: 0.55 });
    const mouthRed = skin('#5a1818');
    const size = { male: 1, female: 0.86, juvenile: 0.62, elder: 0.95 }[a.who];
    const beard = { male: 1, female: 0.55, juvenile: 0.2, elder: 0.9 }[a.who];
    const dangle = a.hold === 'dangle', clutch = a.hold === 'clutch';
    const rb = 0.047;

    // A limb rising from the ground: low for a perch, high and arching for a dangle.
    const limb: V3[] = dangle
      ? [[-0.36, 0, -0.1], [-0.36, 0.55, -0.05], [-0.22, 0.98, 0], [0.05, 1.08, 0], [0.3, 1.04, 0.02]]
      : [[-0.42, 0, -0.1], [-0.35, 0.25, -0.05], [-0.15, 0.4, 0], [0.05, 0.43, 0], [0.3, 0.45, 0.02]];
    bough(root, context, limb, (t) => mix(0.065, 0.04, t), { moss: mix(0.3, 1, mood.density), leafy: mix(0.2, 1, mood.density) });
    const anchor = limb[3];

    const m = new THREE.Group();
    m.position.set(anchor[0], dangle ? anchor[1] - 0.62 * size : anchor[1] + rb, anchor[2]);
    m.scale.setScalar(size);
    root.add(m);
    const cy = dangle ? 0.62 : -rb / size; // branch centre in the monkey's frame
    const lean = clutch ? 0.32 : 0;
    const torso = new THREE.Group();
    torso.rotation.x = lean;
    m.add(torso);
    const thin = elder ? 0.86 : 1;
    blob(torso, [0.12 * thin, 0.17, 0.11 * thin], [0, 0.18, 0], fur, [0, 0, 0], 22);
    blob(torso, [0.135, 0.1, 0.105], [0, 0.3, -0.012], fur, [0, 0, 0], 20);
    if (a.form === 'mantled') {
      const fringe = [];
      for (let i = 0; i < 44; i++) { const side = i % 2 ? -1 : 1, h = random(); fringe.push({ at: [side * (0.1 + 0.02 * Math.sin(h * 3)), 0.1 + h * 0.2, (random() - 0.5) * 0.1] as V3, dir: [side * 0.8, -1, 0] as V3, len: 0.05 + random() * 0.04, r: 0.012 }); }
      tufts(torso, fringe, mantle);
    }

    const coil = (startX: number, turns: number, from: V3[]): V3[] => {
      const out = [...from], steps = Math.round(turns * 9), reach = rb / size + 0.022;
      for (let i = 0; i <= steps; i++) { const phi = (i / 9) * Math.PI * 2 + (dangle ? Math.PI * 0.5 : 0); out.push([startX + i * 0.006, cy - Math.sin(phi) * reach, -Math.cos(phi) * reach]); }
      return out;
    };
    // Tail.
    const tailR = (t: number) => mix(0.028, 0.014, t);
    if (dangle) sweep(m, coil(0.02, 1.4, [[0, 0.03, -0.1], [0, 0.2, -0.17], [0.01, cy - 0.12, -0.12]]), tailR, fur, { segments: 60 });
    else if (clutch) sweep(m, coil(0.05, 1.5, [[0, 0.03, -0.1], [0.02, -0.02, -0.12]]), tailR, fur, { segments: 60 });
    else sweep(m, [[0, 0.03, -0.1], [0.01, -0.06, -0.14], [0.02, -0.26, -0.13], [0.03, -0.36, -0.08], [0.03, -0.33, -0.02]], tailR, fur, { segments: 40 });

    // Limbs.
    const lead = random() < 0.5 ? -1 : 1;
    for (const side of [-1, 1]) {
      const shoulder: V3 = [side * 0.115, 0.31 * Math.cos(lean), 0.02 + 0.31 * Math.sin(lean)];
      let arm: V3[], leg: V3[];
      if (dangle) {
        arm = side === lead ? [shoulder, [side * 0.15, 0.46, 0.02], [side * 0.14, cy - 0.01, 0.0]] : [shoulder, [side * 0.17, 0.17, 0.06], [side * 0.13, 0.03, 0.1]];
        leg = [[side * 0.08, 0.05, 0.03], [side * 0.11, -0.1, 0.12], [side * 0.1, -0.29 - random() * 0.04, 0.05]];
      } else {
        arm = clutch ? [shoulder, [side * 0.17, 0.18, 0.17], [side * 0.05, cy + rb / size + 0.01, 0.03]] : [shoulder, [side * 0.18, 0.18, 0.08], [side * 0.14, 0.2, 0.17]];
        leg = [[side * 0.08, 0.06, 0.03], [side * 0.145, 0.2, 0.16], [side * 0.12, cy + rb / size * 0.6, 0.075]];
      }
      sweep(m, arm, (t) => mix(0.042, 0.024, t), fur);
      blob(m, [0.028, 0.022, 0.034], arm[2], bare, [0, 0, 0], 10);
      sweep(m, leg, (t) => mix(0.05, 0.024, t), fur);
      blob(m, [0.026, 0.02, 0.045], leg[2], bare, [0.3, 0, 0], 10);
    }

    // Head: thrown back by the force of the call.
    const head = new THREE.Group();
    head.position.set(0, 0.42 * Math.cos(lean) - 0.02, 0.05 + 0.4 * Math.sin(lean));
    head.scale.setScalar(a.who === 'juvenile' ? 1.5 : 1.28);
    const turn = random() < 0.5 ? -1 : 1;
    const tilt = { sky: -(0.45 + a.call * 0.55), valley: -(0.12 + a.call * 0.2), below: 0.45 - a.call * 0.1 }[a.target];
    head.rotation.order = 'YXZ';
    head.rotation.set(tilt, a.target === 'valley' ? turn * 0.6 : (random() - 0.5) * 0.25, (random() - 0.5) * 0.1);
    m.add(head);
    blob(head, [0.07, 0.072, 0.078], [0, 0, 0], fur, [0, 0, 0], 22);
    blob(head, [0.05, 0.054, 0.03], [0, -0.004, 0.056], bare, [0, 0, 0], 18);
    sweep(head, [[-0.045, 0.03, 0.062], [0, 0.036, 0.078], [0.045, 0.03, 0.062]], 0.011, bare);
    const open = mix(0.006, 0.03, a.call);
    sweep(head, [[0, -0.022, 0.045], [0, -0.03, 0.085], [0, -0.034, 0.112 + a.call * 0.012]], (t) => mix(0.04, 0.022 + open * 0.55, t), bare, { radial: 14 });
    const lips = new THREE.Mesh(new THREE.TorusGeometry(open + 0.006, 0.009, 8, 22), bare);
    lips.position.set(0, -0.034, 0.118 + a.call * 0.012);
    lips.castShadow = true;
    head.add(lips);
    blob(head, [open + 0.003, open + 0.003, 0.006], [0, -0.034, 0.117 + a.call * 0.012], mouthRed, [0, 0, 0], 12);
    if (a.call > 0.5) for (const sx of [-1, 1]) blob(head, [0.003, 0.007, 0.003], [sx * open * 0.55, -0.034 + open * 0.55, 0.119 + a.call * 0.012], skin('#efe6cf'), [0, 0, 0], 6);
    for (const side of [-1, 1]) {
      eye(head, { at: [side * 0.023, 0.016, 0.07], r: 0.0095, look: [side * 0.15, 0, 1], iris: '#7a4a1e', irisSize: 0.85, pupil: 0.5, lid: Math.min(1, 0.15 + a.call * 0.85), lidMaterial: bare });
      blob(head, [0.012, 0.018, 0.008], [side * 0.071, 0.004, 0], bare, [0, 0, 0], 8);
    }
    // Swollen throat and beard.
    const swell = mix(0.75, 1.45, a.call) * mix(0.75, 1.1, beard);
    const throat = blob(head, [0.05 * swell, 0.046 * swell, 0.052 * swell], [0, -0.085, 0.012], beardFur, [0, 0, 0], 18);
    const hairs = [];
    for (let i = 0; i < Math.round(10 + beard * 40); i++) {
      const u = random() * Math.PI - Math.PI / 2;
      hairs.push({ at: [Math.sin(u) * 0.055, -0.045 - random() * 0.03, 0.02 + Math.cos(u) * 0.04] as V3, dir: [Math.sin(u) * 0.5, -1, 0.35] as V3, len: (0.03 + random() * 0.045) * (0.5 + beard), r: 0.009 });
    }
    for (let i = 0; i < 22; i++) { const az = random() * Math.PI * 2; hairs.push({ at: [Math.cos(az) * 0.062, 0.01 + random() * 0.04, Math.sin(az) * 0.06 - 0.02] as V3, dir: [Math.cos(az), 0.3, Math.sin(az) - 0.6] as V3, len: 0.03, r: 0.01 }); }
    tufts(head, hairs, beardFur);
    if (elder || mood.wear > 0.65) sweep(head, [[-0.03, 0.03, 0.07], [-0.035, 0.0, 0.068], [-0.028, -0.02, 0.07]], 0.002, skin('#8a5a50'));

    // Sound made visible.
    const rings: THREE.Mesh[] = [];
    if ((a.sound === 'rings' || a.sound === 'both') && a.call > 0.08) {
      const count = 2 + Math.round(a.call * 4);
      for (let i = 0; i < count; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06 + i * 0.05, 0.0055, 6, 40), new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffe9a8', emissiveIntensity: 0.7, transparent: true, opacity: 0.62 - i * 0.07, depthWrite: false }));
        ring.position.set(0, -0.034, 0.2 + i * 0.085);
        head.add(ring);
        rings.push(ring);
      }
    }
    const shower = new THREE.Group();
    root.add(shower);
    if (a.sound === 'leaves' || a.sound === 'both') {
      const top = anchor[1] + (dangle ? 0 : 0.5);
      const n = Math.round(mix(6, 22, a.call) * mix(0.7, 1.3, mood.density));
      leaves(shower, Array.from({ length: n }, () => ({ at: [(random() - 0.5) * 1.0, 0.08 + random() * top, (random() - 0.5) * 0.6] as V3, size: 0.035 + random() * 0.03, rot: [random() * 6, random() * 6, random() * 6] as V3, long: 1.4 })), new THREE.MeshStandardMaterial({ color: new THREE.Color('#5c9440').lerp(new THREE.Color('#b08a3a'), mood.wear * 0.7), roughness: 0.7 }));
    }

    settle(root);
    const speed = mix(0.5, 2.5, mood.energy);
    return {
      object: root,
      update(_dt, time) {
        const pulse = Math.sin(time * speed * 6) * 0.04 * a.call;
        throat.scale.set(0.05 * swell * (1 + pulse), 0.046 * swell * (1 + pulse), 0.052 * swell * (1 + pulse));
        rings.forEach((ring, i) => ring.scale.setScalar(1 + ((time * speed * 0.4 + i * 0.2) % 1) * 0.25));
        shower.position.y = -((time * speed * 0.03) % 0.05);
      },
      dispose: () => disposeTree(root),
    };
  },
});
