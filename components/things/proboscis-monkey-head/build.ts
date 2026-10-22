import * as THREE from 'three';
import { choice, clamp01, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { type V3, blob, bough, coat, eye, leaves, settle, skin, sweep, tufts } from './beast';

export default defineThing({
  questions: {
    nose: choice('How big is the nose?', {
      snub: 'A small upturned juvenile snub, almost cute.',
      point: 'A neat forward-pointing female nose, sharp and tidy.',
      droop: 'A big drooping male nose that hangs over the mouth.',
      colossal: 'An absurd swollen cucumber of a nose reaching past the chin, a dominant old male.',
    }),
    expression: choice('What is its face doing?', {
      smug: 'Smug calm, lips pressed in a faint smile, eyes half lidded.',
      honk: 'A honking alarm call, mouth open and the nose swinging.',
      chew: 'Chewing a mouthful of leaves with one stalk sticking out.',
      doze: 'Dozing upright with its eyes shut.',
      scowl: 'A sour down-turned scowl under a heavy brow.',
    }),
    age: score('How old is it?', ['A blue-faced infant', 'A lanky juvenile', 'A prime adult', 'A grizzled grey elder']),
    wet: choice('Has it been swimming?', {
      dry: 'Dry and fluffy, fur standing soft.',
      damp: 'Damp from drizzle, fur clumping a little.',
      soaked: 'Just out of the river: dark slick fur in spikes, dripping.',
    }),
    gaze: choice('What is it looking at?', {
      viewer: 'Down at the viewer below, chin tucked.',
      rival: 'Off to one side at a rival on another branch.',
      rain: 'Up at the rain, face lifted.',
      ahead: 'Straight ahead at nothing in particular.',
    }),
    belly: score('How big is its belly?', ['Lean and hungry', 'Comfortably round', 'A vast fermenting pot belly']),
    hands: choice('What are its hands doing?', {
      knees: 'Both hands resting on its knees like a judge.',
      scratch: 'One hand scratching its belly.',
      sprig: 'One hand lifting a leafy sprig toward its mouth.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const grown = clamp01(a.age * 3), elder = clamp01((a.age - 0.7) / 0.3);
    const wet = { dry: 0, damp: 0.5, soaked: 1 }[a.wet];
    const dark = new THREE.Color('#2b1d16'), grey = new THREE.Color('#b9b4aa');
    const tone = (hex: string) => new THREE.Color(hex).lerp(grey, elder * 0.38).lerp(dark, wet * 0.45).offsetHSL((mood.warmth - 0.5) * 0.03, 0, 0);
    const gloss = { roughness: mix(0.92, 0.35, wet) };
    const back = coat(context, tone('#9c5230'), tone('#6a3119'), gloss);
    const cap = coat(context, tone('#cf6a2a'), tone('#8e3d16'), gloss);
    const cream = coat(context, tone('#e6dac2'), tone('#b9a98a'), gloss);
    const limb = coat(context, tone('#a39d93'), tone('#75706a'), gloss);
    const face = skin(new THREE.Color('#dc9d7e').lerp(new THREE.Color('#40507a'), 1 - grown).lerp(new THREE.Color('#b98a78'), elder * 0.5));
    const faceDark = skin(new THREE.Color('#b87459').lerp(new THREE.Color('#2c3757'), 1 - grown));
    const mouthDark = skin('#3a1a18');
    const leaf = new THREE.MeshStandardMaterial({ color: '#4c8a3f', roughness: 0.7 });

    bough(root, context, [[-0.27, 0.075, 0.01], [-0.09, 0.083, -0.01], [0.1, 0.075, 0.01], [0.27, 0.086, -0.015]], (t) => 0.078 - t * 0.012, { moss: mix(0.3, 1, mood.density), leafy: mood.density * 0.8 });

    const k = mix(0.55, 1, grown);
    const body = new THREE.Group();
    body.position.set(0, 0.148, 0);
    body.scale.setScalar(k);
    root.add(body);
    const b = mix(0.78, 1.32, a.belly);
    const belly = blob(body, [0.15 * b, 0.17, 0.135 * b], [0, 0.16, 0.02], back, [0, 0, 0], 24);
    blob(body, [0.125 * b, 0.145, 0.12 * b], [0, 0.15, 0.055], cream, [0, 0, 0], 24);
    blob(body, [0.008, 0.008, 0.006], [0, 0.11, 0.055 + 0.12 * b], faceDark, [0, 0, 0], 8);
    blob(body, [0.125, 0.12, 0.1], [0, 0.33, -0.005], back, [0.1, 0, 0]);
    blob(body, [0.09, 0.055, 0.085], [0, 0.435, 0.015], cream);
    for (const side of [-1, 1]) blob(body, [0.055, 0.05, 0.055], [side * 0.12, 0.385, -0.01], back, [0, 0, 0], 14);

    // Legs dangle over the front of the branch; the tail drapes behind.
    for (const side of [-1, 1]) {
      sweep(body, [[side * 0.08, 0.06, 0.04], [side * 0.14, 0.11, 0.17 * b], [side * 0.13, -0.02, 0.2 * b], [side * 0.12, -0.11, 0.17 * b]], (t) => mix(0.05, 0.022, t), limb);
      blob(body, [0.024, 0.016, 0.05], [side * 0.12, -0.12, 0.2 * b], faceDark, [0.4, 0, 0], 12);
    }
    sweep(body, [[0, 0.04, -0.12], [0.03, -0.03, -0.2], [0.09 + random() * 0.05, -0.125, -0.25], [0.24, -0.135, -0.2 - random() * 0.08]], (t) => mix(0.022, 0.011, t), cream);

    const hand = (side: number, at: V3) => {
      sweep(body, [[side * 0.14, 0.38, 0], [side * (0.19 + (at[1] > 0.3 ? 0.02 : 0)), 0.24, 0.07], at], (t) => mix(0.04, 0.022, t), t0(side));
      blob(body, [0.026, 0.02, 0.032], at, faceDark, [0.3, 0, 0], 12);
    };
    const t0 = (_side: number) => limb;
    const knee = (side: number): V3 => [side * 0.14, 0.15, 0.19 * b];
    const lead = random() < 0.5 ? -1 : 1;
    if (a.hands === 'knees') { hand(-1, knee(-1)); hand(1, knee(1)); }
    else if (a.hands === 'scratch') { hand(lead, [lead * 0.04, 0.2, 0.06 + 0.125 * b]); hand(-lead, knee(-lead)); }
    else {
      const at: V3 = [lead * 0.07, 0.43, 0.16];
      hand(lead, at); hand(-lead, knee(-lead));
      sweep(body, [[at[0], at[1] - 0.04, at[2]], [at[0] - lead * 0.01, at[1] + 0.05, at[2] + 0.01], [at[0] - lead * 0.03, at[1] + 0.11, at[2]]], 0.004, leaf);
      leaves(body, Array.from({ length: 6 }, (_u, i) => ({ at: [at[0] - lead * 0.005 * i + (i % 2 ? 0.03 : -0.03), at[1] + 0.02 + i * 0.018, at[2] + 0.005] as V3, size: 0.04 + random() * 0.015, rot: [0.2, 0, (i % 2 ? -1 : 1) * (1 + random() * 0.4)] as V3, long: 1.2 })), leaf);
    }

    // Head.
    const head = new THREE.Group();
    head.position.set(0, 0.545, 0.04);
    head.scale.setScalar(mix(1.55, 1.3, grown));
    const turn = random() < 0.5 ? -1 : 1;
    head.rotation.set({ viewer: 0.36, rival: 0.05, rain: -0.52, ahead: 0 }[a.gaze], a.gaze === 'rival' ? turn * 0.75 : (random() - 0.5) * 0.2, (random() - 0.5) * 0.12);
    body.add(head);
    blob(head, [0.076, 0.082, 0.08], [0, 0, 0], back, [0, 0, 0], 24);
    blob(head, [0.074, 0.05, 0.078], [0, 0.042, -0.006], cap, [0, 0, 0], 24);
    blob(head, [0.052, 0.06, 0.03], [0, -0.004, 0.058], face, [0, 0, 0], 22);
    blob(head, [0.037, 0.03, 0.032], [0, -0.04, 0.064], face, [0, 0, 0], 18);
    const scowl = a.expression === 'scowl' ? 1 : 0;
    sweep(head, [[-0.046, 0.03 + scowl * 0.006, 0.066], [0, 0.036 - scowl * 0.008, 0.083], [0.046, 0.03 + scowl * 0.006, 0.066]], 0.009 + elder * 0.003 + scowl * 0.002, faceDark);
    const lidLevel = { smug: 0.5, honk: 0.05, chew: 0.3, doze: 1, scowl: 0.35 }[a.expression] + elder * 0.1;
    const lids = skin(new THREE.Color('#f0d9c4').lerp(new THREE.Color('#8fa0c4'), 1 - grown));
    const look: V3 = a.gaze === 'rival' ? [turn * 0.35, 0, 1] : a.gaze === 'viewer' ? [0, -0.25, 1] : a.gaze === 'rain' ? [0, 0.3, 1] : [0, 0, 1];
    for (const side of [-1, 1]) {
      eye(head, { at: [side * 0.024, 0.013, 0.076], r: 0.0115, look, iris: '#6a4320', irisSize: 0.82, pupil: 0.5, lid: Math.min(1, lidLevel), lidMaterial: lids });
      blob(head, [0.032, 0.046, 0.04], [side * 0.06, -0.03, 0.018], cream, [0, 0, side * 0.2], 16);
      blob(head, [0.01, 0.017, 0.007], [side * 0.077, 0.008, 0.002], faceDark, [0, 0, 0], 10);
    }
    // Ruff, cap tufts: fluffy when dry, clumped spikes when wet.
    const spikes = [];
    const capCount = Math.round(mix(46, 18, wet));
    for (let i = 0; i < capCount; i++) {
      const az = random() * Math.PI * 2, el = 0.25 + random() * 1.1, d: V3 = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el) - 0.25];
      if (d[2] > 0.55 && el < 0.7) continue;
      const out: V3 = wet > 0.6 ? [d[0] * 0.7, d[1] - 0.9, d[2] - 0.5] : [d[0], d[1] + 0.2, d[2] - 0.35];
      spikes.push({ at: [d[0] * 0.07, 0.04 + d[1] * 0.045, -0.006 + d[2] * 0.074] as V3, dir: out, len: mix(0.022, 0.05, wet) * (0.7 + random() * 0.6), r: mix(0.009, 0.006, wet) });
    }
    tufts(head, spikes, cap);
    const ruff = [];
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? -1 : 1, t = random();
      ruff.push({ at: [side * mix(0.035, 0.08, t), mix(-0.07, -0.01, t), mix(0.04, -0.01, t)] as V3, dir: [side * mix(0.5, 1, t), -1 - wet, 0.1] as V3, len: mix(0.03, 0.05, random()) * (1 + wet * 0.4), r: 0.008 });
    }
    tufts(head, ruff, cream);

    // Nose: its own group so it can swing.
    const nose = new THREE.Group();
    nose.position.set(0, 0.004, 0.084);
    head.add(nose);
    const ns = mix(0.75, 1.15, grown);
    nose.scale.setScalar(ns);
    let tip: V3;
    if (a.nose === 'snub') {
      blob(nose, [0.014, 0.012, 0.014], [0, -0.008, 0.004], face, [0, 0, 0], 14);
      blob(nose, [0.011, 0.01, 0.011], [0, -0.001, 0.014], face, [0, 0, 0], 12);
      tip = [0, -0.006, 0.02];
    } else if (a.nose === 'point') {
      sweep(nose, [[0, 0.006, -0.006], [0, -0.004, 0.022], [0, -0.012, 0.05], [0, -0.016, 0.062]], (t) => mix(0.016, 0.006, t), face);
      tip = [0, -0.02, 0.056];
    } else {
      const big = a.nose === 'colossal' ? 1.45 : 1;
      const drop = -0.082 * big, fat = 0.025 * (a.nose === 'colossal' ? 1.4 : 1);
      sweep(nose, [[0, 0.01, -0.008], [0, -0.006, 0.026], [0, drop * 0.55, 0.04 * big], [0, drop, 0.03 * big]], (t) => mix(0.013, fat, Math.min(1, t * 1.5)), face, { radial: 14 });
      blob(nose, [fat, fat * 1.15, fat], [0, drop - fat * 0.2, 0.03 * big], face, [0, 0, 0], 16);
      tip = [0, drop - fat * 1.1, 0.03 * big];
    }
    for (const side of [-1, 1]) blob(nose, [0.0035, 0.0045, 0.003], [side * 0.006, tip[1] + 0.004, tip[2] + 0.002], mouthDark, [0, 0, 0], 8);

    // Mouth.
    const my = -0.05, mz = 0.092;
    const jaw = new THREE.Group();
    head.add(jaw);
    if (a.expression === 'honk') {
      blob(head, [0.022, 0.024, 0.012], [0, my - 0.012, mz - 0.004], mouthDark, [0, 0, 0], 14);
      blob(jaw, [0.03, 0.016, 0.026], [0, my - 0.034, mz - 0.03], face, [0, 0, 0], 14);
      blob(jaw, [0.012, 0.006, 0.012], [0, my - 0.024, mz - 0.006], skin('#c96a6a'), [0, 0, 0], 10);
      for (let i = -2; i <= 2; i++) blob(head, [0.0032, 0.004, 0.003], [i * 0.007, my + 0.006, mz - 0.002 - Math.abs(i) * 0.002], skin('#efe6cf'), [0, 0, 0], 6);
    } else {
      const curl = a.expression === 'smug' ? 0.007 + mood.cheer * 0.004 : a.expression === 'scowl' ? -0.008 : a.expression === 'doze' ? -0.001 : 0.002;
      sweep(head, [[-0.024, my + curl, mz - 0.012], [-0.012, my - curl * 0.4, mz + 0.002], [0.012, my - curl * 0.4, mz + 0.002], [0.024, my + curl, mz - 0.012]], 0.0026, mouthDark);
      if (a.expression === 'chew') {
        blob(head, [0.016, 0.014, 0.014], [turn * 0.03, my + 0.002, mz - 0.016], face, [0, 0, 0], 12);
        leaves(jaw, [0, 1, 2].map((i) => ({ at: [turn * (0.014 + i * 0.012), my - 0.002 - i * 0.006, mz + 0.004] as V3, size: 0.022, rot: [0.3, 0, turn * (-0.9 - i * 0.3)] as V3, long: 1.3 })), leaf);
      }
    }

    // Water: drops hanging from chin, nose, elbows and cap.
    if (wet > 0) {
      const water = new THREE.MeshStandardMaterial({ color: '#bfe3ee', roughness: 0.05, metalness: 0.2 });
      const n = Math.round(wet * 9);
      for (let i = 0; i < n; i++) {
        const at: V3 = i === 0 ? [tip[0], tip[1] * ns - 0.004, 0.084 + tip[2] * ns] : [(random() - 0.5) * 0.15, -0.075 - random() * 0.02, random() * 0.06];
        blob(head, [0.004, 0.0065, 0.004], at, water, [0, 0, 0], 8);
      }
    }
    // A hard life: scars and bald patches.
    if (mood.wear > 0.55) {
      sweep(head, [[0.03, 0.03, 0.074], [0.04, 0.0, 0.07], [0.036, -0.022, 0.07]], 0.002, skin('#7c3b34'));
      blob(body, [0.04, 0.03, 0.02], [-0.09, 0.36, 0.07], faceDark, [0, 0, 0], 10);
    }

    settle(root);
    const speed = mix(0.5, 2.2, mood.energy);
    const swing = a.expression === 'honk' ? 0.42 : a.expression === 'chew' ? 0.06 : 0.025;
    return {
      object: root,
      update(_dt, time) {
        nose.rotation.z = Math.sin(time * speed * (a.expression === 'honk' ? 5 : 1.5)) * swing;
        jaw.position.y = a.expression === 'chew' || a.expression === 'honk' ? Math.sin(time * speed * 4) * 0.003 : 0;
        belly.scale.z = 0.135 * b * (1 + Math.sin(time * speed * 1.2) * 0.02);
      },
      dispose: () => disposeTree(root),
    };
  },
});
