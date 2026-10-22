import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix } from '@conjure/kit';
import { type Bit, type StoneShape, buildHand, clods, flexHand, grass, headstone, lettered, limb, many, mottled, mound, paint, put, shade, turfSlabs } from './grave';

const EPITAPHS = {
  rip: ['R.I.P.'],
  beloved: ['BELOVED', 'HUSBAND', '& FATHER'],
  back: ['BACK', 'SOON'],
  disturb: ['DO NOT', 'DISTURB'],
  told: ['I TOLD YOU', 'I WAS', 'ILL'],
  later: ['SEE YOU', 'LATER'],
  peace: ['AT PEACE', 'AT LAST'],
  blank: [''],
} as const;

export default defineThing({
  questions: {
    out: choice('How far out of the grave has it got?', {
      fingertips: 'Only a hand and a little forearm have broken the surface so far.',
      head: 'The head is out to the chin, with one hand up and the other gripping the turf.',
      shoulders: 'Head, shoulders and both arms are out, elbows on the grass, heaving.',
      waist: 'Out to the waist, propped on one arm and nearly free.',
    }),
    decay: choice('How decayed is it?', {
      fresh: 'Buried last week: pale, bluish and waxy but all there.',
      ripe: 'Green and blotched, a cheek split open over the teeth, one eye swollen.',
      far: 'Long gone: grey-brown leather, bare skull showing, an empty socket and no nose.',
    }),
    clothes: choice('What was it buried in?', {
      suit: 'A dark Sunday suit with a white shirt and tie.',
      wedding: 'A wedding dress with puffed sleeves and a veil.',
      uniform: 'A dress uniform with brass buttons, epaulettes and a sash.',
      shroud: 'A plain linen winding sheet and hood.',
    }),
    expression: choice('What is the look on its face?', {
      furious: 'Furious: brows down, teeth bared.',
      bewildered: 'Bewildered: one brow up, a small round mouth, where am I?',
      delighted: 'Delighted: a huge toothy grin, thrilled to be back.',
      tired: 'Tired: heavy lids and a flat mouth, it did not want to get up.',
    }),
    clutch: choice('What is it holding up in its raised hand?', {
      nothing: 'Nothing: the hand is a bare claw.',
      flowers: 'The bunch of flowers that was left on its grave.',
      hat: 'Its own hat, raised politely.',
      phone: 'A glowing phone, held up looking for signal.',
    }),
    stone: choice('What kind of headstone stands behind it?', {
      round: 'A plain round-topped slab.',
      shoulder: 'An old slate with a round head and square shoulders.',
      gothic: 'A pointed gothic arch.',
      cross: 'A stone cross.',
      slab: 'A blunt square block.',
    }),
    epitaph: choice('What does the headstone say?', {
      rip: 'R.I.P.',
      beloved: 'BELOVED HUSBAND & FATHER',
      back: 'BACK SOON',
      disturb: 'DO NOT DISTURB',
      told: 'I TOLD YOU I WAS ILL',
      later: 'SEE YOU LATER',
      peace: 'AT PEACE AT LAST',
      blank: 'Nothing: worn smooth.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const dirt = mood.wear;
    const s = random() < 0.5 ? 1 : -1; // the raised arm's side
    const hex = (c: THREE.Color) => `#${c.getHexString()}`;
    const ball = (w = 16, h = 12) => new THREE.SphereGeometry(1, w, h);

    // Flesh.
    const base = { fresh: '#bccbc6', ripe: '#8fa868', far: '#8d8468' }[a.decay];
    const skinTone = shade(shade(base, mood.warmth > 0.5 ? '#c9b98a' : '#a9c0d6', Math.abs(mood.warmth - 0.5) * 0.45), '#4a3c2a', dirt * 0.25);
    const skin = paint('#ffffff', { roughness: 0.75, map: mottled(random, skinTone, a.decay === 'fresh'
      ? [{ color: '#7d8fb0', count: 12, size: 0.02, alpha: 0.35, line: true }, { color: '#8f7f9a', count: 8, size: 0.07, alpha: 0.2 }, { color: '#4a3a2a', count: Math.round(6 + dirt * 30), size: 0.03, alpha: 0.5 }]
      : [{ color: '#4c5a34', count: 24, size: 0.07, alpha: 0.4 }, { color: '#2f2a22', count: 18, size: 0.03, alpha: 0.55 }, { color: '#c8be82', count: 8, size: 0.03, alpha: 0.45 }, { color: '#4a3a2a', count: Math.round(dirt * 30), size: 0.03, alpha: 0.5 }]) });
    const bone = paint(shade('#ebe4cb', '#8d7a55', dirt * 0.4), { roughness: 0.6 });
    const dark = paint('#17110f', { roughness: 1 });
    const nail = paint(a.decay === 'fresh' ? '#7f8496' : '#352f24', { roughness: 0.4 });

    // Cloth.
    const clothTone = shade({ suit: '#25262e', wedding: '#efe9dc', uniform: mood.cheer > 0.5 ? '#2f4a7a' : '#4d5a3a', shroud: '#cfc4a2' }[a.clothes], '#5a4a36', dirt * 0.4);
    const cloth = paint('#ffffff', { roughness: 0.95, side: THREE.DoubleSide, map: mottled(random, clothTone, [{ color: '#3a2c1e', count: Math.round(8 + dirt * 40), size: 0.05, alpha: 0.45 }, { color: '#000000', count: 20, size: 0.012, alpha: 0.25, line: true }]) });
    const gold = paint('#d9ad3a', { metalness: 0.85, roughness: 0.3, emissive: '#4a3205', emissiveIntensity: 0.4 });

    const cut = { fingertips: 0.7, head: 0.5, shoulders: 0.29, waist: 0.03 }[a.out];
    const FS = 1.3;
    const figure = new THREE.Group();
    figure.position.set(0, -cut * FS, 0.12);
    figure.scale.setScalar(FS);
    figure.rotation.y = (random() - 0.5) * 0.3;
    root.add(figure);

    // Torso.
    put(figure, ball(20, 14), cloth, [0, 0.27, 0], [0, 0, 0], [0.2, 0.28, 0.125]);
    for (const x of [-1, 1]) put(figure, ball(14, 10), a.clothes === 'wedding' ? cloth : cloth, [x * 0.2, 0.44, 0], [0, 0, 0], a.clothes === 'wedding' ? [0.1, 0.085, 0.095] : [0.085, 0.07, 0.085]);
    put(figure, new THREE.CylinderGeometry(0.042, 0.052, 0.12, 12), skin, [0, 0.545, 0.005]);
    if (a.clothes === 'suit') {
      const shirt = paint(shade('#f1ede2', '#8a7a5c', dirt * 0.5));
      put(figure, ball(12, 10), shirt, [0, 0.36, 0.075], [0, 0, 0], [0.075, 0.17, 0.06]);
      put(figure, new THREE.BoxGeometry(0.035, 0.2, 0.012), paint(mood.cheer > 0.5 ? '#b3262e' : '#2a2a3a'), [(random() - 0.5) * 0.04, 0.36, 0.137], [0.1, 0, (random() - 0.5) * 0.5]);
      for (const x of [-1, 1]) {
        put(figure, new THREE.BoxGeometry(0.06, 0.24, 0.02), cloth, [x * 0.085, 0.38, 0.118], [0.12, 0, x * 0.3]);
        put(figure, new THREE.BoxGeometry(0.05, 0.05, 0.012), shirt, [x * 0.04, 0.5, 0.075], [0.2, 0, x * -0.6]);
      }
      if (mood.cheer > 0.6) put(figure, ball(8, 6), paint('#c8102e'), [0.1, 0.42, 0.125], [0, 0, 0], [0.018, 0.018, 0.012]);
    } else if (a.clothes === 'wedding') {
      put(figure, ball(14, 10), skin, [0, 0.46, 0.02], [0, 0, 0], [0.15, 0.07, 0.1]);
      put(figure, new THREE.TorusGeometry(0.07, 0.007, 5, 20), paint('#f6f2e6', { roughness: 0.3 }), [0, 0.475, 0.06], [1.15, 0, 0]);
      for (let i = 0; i < 6; i++) put(figure, new THREE.TorusGeometry(0.19 - i * 0.004, 0.012, 5, 22), cloth, [0, 0.1 + i * 0.045, 0.004], [Math.PI / 2, 0, 0], [1, 0.66, 1]);
    } else if (a.clothes === 'uniform') {
      for (let i = 0; i < 5; i++) put(figure, ball(8, 6), gold, [0, 0.16 + i * 0.065, 0.118 + Math.sin((i + 1) / 6 * Math.PI) * 0.012], [0, 0, 0], 0.013);
      for (const x of [-1, 1]) {
        put(figure, new THREE.BoxGeometry(0.11, 0.018, 0.075), gold, [x * 0.2, 0.512, 0], [0, 0, x * -0.12]);
        for (let i = 0; i < 5; i++) limb(figure, [x * 0.25, 0.505, -0.03 + i * 0.015], [x * 0.262, 0.455, -0.03 + i * 0.015], 0.005, 0.004, gold, 4);
      }
      put(figure, new THREE.TorusGeometry(0.2, 0.022, 4, 24), paint(mood.cheer > 0.5 ? '#b3262e' : '#7a2a2a'), [0, 0.3, 0], [Math.PI / 2 - 0.2, 0.95, 0], [1, 0.66, 1.25]);
      put(figure, new THREE.CylinderGeometry(0.022, 0.022, 0.006, 5), gold, [-0.09, 0.36, 0.118], [Math.PI / 2 - 0.2, 0, 0]);
      put(figure, new THREE.CylinderGeometry(0.058, 0.062, 0.05, 14), cloth, [0, 0.535, 0.005]);
    } else {
      for (let i = 0; i < 6; i++) put(figure, new THREE.TorusGeometry(0.185, 0.016, 5, 22), cloth, [0, 0.08 + i * 0.07, 0], [Math.PI / 2 + (random() - 0.5) * 0.25, 0, (random() - 0.5) * 0.2], [1 - Math.abs(i - 2.5) * 0.04, 0.66, 1]);
    }

    // Head.
    const head = new THREE.Group();
    head.position.set(0, 0.67, 0.02);
    const pose = { furious: [0.12, 0], bewildered: [-0.12, 0.22], delighted: [-0.2, -0.08], tired: [0.3, 0.12] }[a.expression];
    head.rotation.set(pose[0], (random() - 0.5) * 0.3, pose[1] * s);
    figure.add(head);
    const HS = 1.3;
    if (a.out === 'fingertips') head.visible = false;
    head.scale.setScalar(HS);
    put(head, ball(24, 16), skin, [0, 0.01, 0], [0, 0, 0], [0.098, 0.116, 0.106]);
    put(head, ball(18, 12), skin, [0, -0.068, 0.022], [0, 0, 0], [0.074, 0.06, 0.074]);
    const side = -s; // the worse side of the face
    for (const x of [-1, 1]) {
      if (!(a.decay === 'far' && x === side)) put(head, ball(10, 8), skin, [x * 0.098, -0.008, 0], [0, 0, x * -0.2], [0.014, 0.03, 0.02]);
      put(head, ball(12, 8), dark, [x * 0.04, 0.012, 0.086], [0, 0, 0], [0.03, 0.028, 0.018]);
      const gone = a.decay === 'far' && x === side;
      const big = a.decay === 'ripe' && x === side ? 1.3 : a.expression === 'bewildered' && x === s ? 1.2 : 1;
      if (!gone) {
        const white = paint(a.decay === 'fresh' ? '#f2f0e6' : '#e8dc9a', { roughness: 0.3 });
        put(head, ball(12, 10), white, [x * 0.04, 0.012, 0.09], [0, 0, 0], 0.02 * big);
        put(head, ball(8, 6), paint(a.expression === 'furious' ? '#b3161e' : '#16110f', { emissive: a.expression === 'furious' ? '#7a0a10' : '#000000', emissiveIntensity: 0.7 }), [x * 0.04 + (a.expression === 'bewildered' ? 0.004 : 0), 0.012 + (a.expression === 'tired' ? -0.005 : 0), 0.09 + 0.017 * big], [0, 0, 0], 0.0075 * big);
        if (a.expression === 'tired' || a.expression === 'furious') put(head, new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), skin, [x * 0.04, 0.012, 0.09], [a.expression === 'tired' ? 0.25 : -0.15, 0, x * (a.expression === 'tired' ? -0.25 : 0.45)], 0.0225 * big);
      }
      const brow = { furious: [0.5, 0.038], bewildered: [-0.15, x === s ? 0.066 : 0.046], delighted: [-0.25, 0.06], tired: [-0.4, 0.046] }[a.expression];
      put(head, new THREE.CapsuleGeometry(0.0075, 0.036, 3, 8), paint(shade(skinTone, '#2a2218', 0.6)), [x * 0.04, brow[1], 0.1], [0, 0, Math.PI / 2 + x * brow[0]]);
    }
    if (a.decay === 'far') for (const x of [-1, 1]) put(head, ball(8, 6), dark, [x * 0.009, -0.022, 0.104], [0, 0, x * -0.3], [0.008, 0.017, 0.008]);
    else put(head, ball(10, 8), skin, [0, -0.02, 0.106], [0, 0, 0], [0.017, 0.024, 0.02]);
    // Mouth and teeth.
    const mouth = { furious: [0.046, 0.026, -0.076], bewildered: [0.017, 0.02, -0.08], delighted: [0.058, 0.03, -0.07], tired: [0.036, 0.008, -0.08] }[a.expression];
    put(head, ball(14, 10), dark, [0, mouth[2], 0.082], [0, 0, 0], [mouth[0], mouth[1], 0.02]);
    const teeth: Bit[] = [];
    const tooth = (x: number, y: number, h: number) => teeth.push({ p: [x, y, 0.078 + Math.sqrt(Math.max(0, 1 - (x / (mouth[0] * 1.2)) ** 2)) * 0.024], s: [0.0085, h, 0.006], c: hex(shade('#f3ecd0', '#a8904a', random() * 0.4 + dirt * 0.3)) });
    if (a.expression !== 'bewildered' && a.expression !== 'tired') {
      const n = a.expression === 'delighted' ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) / n * mouth[0] * 1.7, edge = Math.sqrt(Math.max(0.05, 1 - (x / mouth[0]) ** 2)) * mouth[1];
        if (random() > 0.12 + dirt * 0.2) tooth(x, mouth[2] + edge * 0.62, 0.017);
        if (random() > 0.25 + dirt * 0.2) tooth(x + 0.004, mouth[2] - edge * 0.62, 0.015);
      }
    } else if (a.expression === 'tired') tooth(0.012 * s, mouth[2] - 0.004, 0.014);
    if (a.decay !== 'fresh') {
      put(head, ball(10, 8), dark, [side * 0.066, -0.05, 0.062], [0, side * 0.7, 0], [0.022, 0.026, 0.012]);
      for (let i = 0; i < 3; i++) teeth.push({ p: [side * (0.062 + i * 0.008), -0.05 + (i % 2) * 0.012, 0.074 - i * 0.008], s: [0.008, 0.016, 0.006], c: '#efe6c6' });
    }
    many(head, new THREE.BoxGeometry(1, 1, 1), paint('#ffffff', { roughness: 0.4 }), teeth);
    if (a.decay === 'far') put(head, new THREE.SphereGeometry(1, 16, 10, side > 0 ? -0.6 : Math.PI - 0.8, 1.4, 0.1, 0.95), bone, [0, 0.01, 0], [0, 0, 0], [0.101, 0.119, 0.109]);
    // Hair, veil or hood.
    const hairTone = ['#2a2420', '#8a8a86', '#7a3a1e', '#c8c2b0'][Math.floor(random() * 4)];
    const hair = paint(shade(hairTone, '#5a4a36', dirt * 0.3), { roughness: 1, side: THREE.DoubleSide });
    if (a.clothes === 'shroud') {
      put(head, new THREE.SphereGeometry(1, 20, 14, 0.5, Math.PI * 2 - 1.0, 0, 2.3), cloth, [0, 0.004, -0.006], [0, -Math.PI / 2, 0], [0.118, 0.132, 0.118]);
    } else if (a.decay === 'fresh') {
      put(head, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, 1.25), hair, [0, 0.012, -0.012], [-0.35, 0, 0], [0.104, 0.12, 0.112]);
      if (a.clothes === 'wedding') for (const x of [-1, 1]) limb(head, [x * 0.09, 0.02, -0.02], [x * 0.11, -0.2, -0.01], 0.03, 0.02, hair, 7);
    } else {
      const strands = a.decay === 'ripe' ? 16 : 6;
      for (let i = 0; i < strands; i++) {
        const t = random() * Math.PI * 2, up = 0.35 + random() * 0.8, len = 0.04 + random() * (a.clothes === 'wedding' ? 0.16 : 0.07);
        const p: [number, number, number] = [Math.sin(t) * Math.sin(up) * 0.095, 0.01 + Math.cos(up) * 0.112, Math.cos(t) * Math.sin(up) * 0.1 - 0.02];
        limb(head, p, [p[0] * 1.25, p[1] + (a.clothes === 'wedding' ? -len : len * 0.5), p[2] * 1.25 - 0.01], 0.009, 0.002, hair, 4);
      }
    }
    if (a.clothes === 'wedding') {
      const tulle = new THREE.MeshStandardMaterial({ color: shade('#fbf8f0', '#9a8a6a', dirt * 0.4), transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
      const veil = new THREE.ConeGeometry(0.2, 0.42, 14, 4, true, Math.PI * 0.55, Math.PI * 0.9);
      put(head, veil, tulle, [0, -0.08, -0.03], [0.12, 0, 0]).castShadow = false;
      put(head, new THREE.TorusGeometry(0.07, 0.012, 5, 18), paint('#f4efe2'), [0, 0.105, -0.015], [Math.PI / 2 - 0.25, 0, 0]);
      for (let i = 0; i < 6; i++) put(head, ball(6, 5), paint(i % 2 ? '#f2c8d2' : '#f8f4e8'), [Math.cos(i * 1.05) * 0.07, 0.112, -0.015 + Math.sin(i * 1.05) * 0.068], [0, 0, 0], 0.014);
    }

    // Arms.
    const cuff = a.clothes === 'suit' ? paint(shade('#f1ede2', '#8a7a5c', dirt * 0.5)) : a.clothes === 'uniform' ? gold : cloth;
    const sleeved = a.clothes !== 'wedding';
    const arm = (from: readonly [number, number, number], elbow: readonly [number, number, number], wrist: readonly [number, number, number]) => {
      limb(figure, from, elbow, sleeved ? 0.062 : 0.045, sleeved ? 0.052 : 0.04, sleeved ? cloth : skin, 10);
      put(figure, ball(10, 8), sleeved ? cloth : skin, elbow, [0, 0, 0], sleeved ? 0.053 : 0.041);
      const d = new THREE.Vector3(...wrist).sub(new THREE.Vector3(...elbow));
      const stop = new THREE.Vector3(...elbow).addScaledVector(d, sleeved ? 0.78 : 1).toArray() as [number, number, number];
      limb(figure, elbow, wrist, 0.04, 0.032, skin, 10);
      if (sleeved) {
        limb(figure, elbow, stop, 0.052, 0.05, cloth, 10);
        const end = new THREE.Vector3(...elbow).addScaledVector(d, 0.84).toArray() as [number, number, number];
        limb(figure, stop, end, 0.045, 0.045, cuff, 10);
      }
    };
    const grip = a.clutch !== 'nothing';
    const curls = (grip ? [0.7, 1.15, 1.2, 1.2, 1.15] : [0.4, 0.55, 0.65, 0.6, 0.5]).map((c) => c + (random() - 0.5) * 0.15);
    const bareBits = a.decay === 'far' ? [false, true, false, true, random() < 0.5] : a.decay === 'ripe' ? [false, false, random() < 0.5, false, true] : [false, false, false, false, false];
    const K = 1.35;
    const up = buildHand({ curls, spread: grip ? 0.1 : 1, flesh: skin, bone, nail, bare: bareBits, skeleton: false, nailLength: grip ? 0.004 : 0.014, size: K, left: s < 0 });
    const S1: [number, number, number] = [s * 0.2, 0.44, 0], E1: [number, number, number] = [s * 0.4, 0.6, 0.1], W1: [number, number, number] = [s * 0.43, 0.9, 0.18];
    arm(S1, E1, W1);
    const wrist = new THREE.Group();
    wrist.position.set(...W1);
    wrist.rotation.set(grip ? 0.05 : 0.3, s * -0.25, s * 0.1);
    figure.add(wrist);
    wrist.add(up.group);

    const down = buildHand({ curls: [0.2, 0.5, 0.55, 0.55, 0.5], spread: 0.7, flesh: skin, bone, nail, bare: [...bareBits].reverse(), skeleton: false, nailLength: 0.01, size: K, left: s > 0 });
    if (a.out !== 'fingertips') {
      const T: [number, number, number] = [-s * 0.36, cut + 0.045, 0.27];
      if (a.out !== 'head') arm([-s * 0.2, 0.44, 0], [-s * 0.42, cut + Math.min(0.24, (0.44 - cut) * 0.55 + 0.08), 0.08], [T[0], T[1] + 0.01, T[2] - 0.04]);
      down.group.position.set(...T);
      down.group.rotation.set(Math.PI / 2 - (a.out === 'head' ? 0.35 : 0.12), 0, s * 0.3);
      figure.add(down.group);
    }

    // What it clutches.
    if (a.clutch === 'flowers') {
      const bunch = new THREE.Group();
      bunch.position.set(0, 0.085 * K, 0.035 * K);
      bunch.rotation.set(-0.1, 0, (random() - 0.5) * 0.3);
      up.group.add(bunch);
      const stem = paint('#3f6a36');
      put(bunch, new THREE.ConeGeometry(0.06, 0.2, 10, 1, true), paint(shade('#e9e2cc', '#7a6a4a', dirt * 0.5), { side: THREE.DoubleSide }), [0, 0.02, 0], [Math.PI, 0, 0]);
      const wilt = 1 - mood.cheer;
      const petals = mood.cheer > 0.5 ? ['#f2d24a', '#f08ab0', '#f6f2e8', '#e85a3a'] : ['#b8a25a', '#8a4a5a', '#c8c2b0', '#7a3a2a'];
      for (let i = 0; i < 7; i++) {
        const t = i * 0.9, r = 0.02 + (i % 3) * 0.018, top: [number, number, number] = [Math.cos(t) * r * 2.2, 0.17 + (i % 2) * 0.04 - wilt * 0.05 * (i % 3), Math.sin(t) * r * 2.2];
        limb(bunch, [Math.cos(t) * r * 0.4, 0, Math.sin(t) * r * 0.4], top, 0.004, 0.003, stem, 4);
        put(bunch, ball(8, 6), paint(petals[i % 4], { roughness: 0.7 }), top, [wilt * 0.8, t, 0], [0.032, 0.02, 0.032]);
        put(bunch, ball(6, 4), paint('#5a3a1a'), [top[0], top[1] + 0.012, top[2]], [0, 0, 0], 0.011);
      }
    } else if (a.clutch === 'hat') {
      const hat = new THREE.Group();
      hat.position.set(0, 0.13 * K, 0.05 * K);
      hat.rotation.set(-0.5, random() * 3, s * 0.25);
      up.group.add(hat);
      if (a.clothes === 'uniform') {
        put(hat, new THREE.CylinderGeometry(0.115, 0.095, 0.06, 20), cloth, [0, 0.05, 0]);
        put(hat, new THREE.CylinderGeometry(0.097, 0.097, 0.028, 20), paint('#7a2a2a'), [0, 0.014, 0]);
        put(hat, new THREE.CylinderGeometry(0.1, 0.1, 0.008, 20, 1, false, -0.9, 1.8), paint('#15151a', { roughness: 0.25 }), [0, 0.002, 0.07], [0.25, 0, 0]);
        put(hat, ball(8, 6), gold, [0, 0.045, 0.1], [0, 0, 0], 0.018);
      } else if (a.clothes === 'wedding') {
        const straw = paint(shade('#f1e6c2', '#8a7a5a', dirt * 0.4), { side: THREE.DoubleSide });
        put(hat, new THREE.CylinderGeometry(0.2, 0.2, 0.008, 24), straw);
        put(hat, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), straw, [0, 0, 0], [0, 0, 0], [0.095, 0.075, 0.095]);
        put(hat, new THREE.TorusGeometry(0.096, 0.014, 5, 20), paint('#e88aa8'), [0, 0.014, 0], [Math.PI / 2, 0, 0]);
      } else {
        const felt = paint(shade('#1e1d22', '#5a5048', dirt * 0.5), { roughness: 1, side: THREE.DoubleSide });
        const tall = a.clothes === 'shroud';
        put(hat, new THREE.CylinderGeometry(0.15, 0.15, 0.01, 24), felt);
        if (tall) put(hat, new THREE.CylinderGeometry(0.098, 0.09, 0.19, 20), felt, [0, 0.095, 0], [0, 0, dirt * 0.15]);
        else put(hat, new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), felt, [0, 0, 0], [0, 0, 0], [0.098, 0.105, 0.105]);
        put(hat, new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20), paint('#5a5a66'), [0, 0.02, 0]);
      }
    } else if (a.clutch === 'phone') {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#dff4ff'; ctx.fillRect(0, 0, 64, 128);
      ctx.fillStyle = '#1a2a3a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('NO', 32, 56); ctx.fillText('SIGNAL', 32, 74);
      for (let i = 0; i < 4; i++) { ctx.globalAlpha = i === 0 ? 1 : 0.25; ctx.fillRect(18 + i * 8, 30 - i * 4, 5, 4 + i * 4); }
      ctx.globalAlpha = 1;
      const screen = new THREE.CanvasTexture(canvas);
      screen.colorSpace = THREE.SRGBColorSpace;
      const phone = new THREE.Group();
      phone.position.set(0, 0.115 * K, 0.04 * K);
      phone.rotation.set(-0.1, s * 0.2, s * -0.15);
      up.group.add(phone);
      put(phone, new THREE.BoxGeometry(0.085, 0.17, 0.012), paint('#15161a', { roughness: 0.3 }));
      put(phone, new THREE.PlaneGeometry(0.075, 0.155), new THREE.MeshStandardMaterial({ map: screen, emissive: '#bfe8ff', emissiveMap: screen, emissiveIntensity: 1.3, roughness: 0.2 }), [0, 0, 0.0065]).castShadow = false;
    }

    // Anything wholly under the ground is not built into the picture.
    figure.updateMatrixWorld(true);
    const box = new THREE.Box3();
    figure.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      node.updateWorldMatrix(true, false);
      box.setFromObject(node);
      if (box.max.y < -0.03) node.visible = false;
    });

    // The broken ground.
    const soilBase = shade('#5a4030', mood.warmth > 0.5 ? '#7a4a2c' : '#3f3a38', Math.abs(mood.warmth - 0.5) * 0.9);
    const soils = [hex(soilBase), hex(shade(soilBase, '#1c1512', 0.4)), hex(shade(soilBase, '#a08060', 0.3))];
    const soil = paint(soilBase, { roughness: 1, map: mottled(random, '#ffffff', [{ color: '#000000', count: 60, size: 0.03, alpha: 0.25 }, { color: '#ffffff', count: 20, size: 0.015, alpha: 0.3 }]) });
    const greens = mood.cheer > 0.5 ? ['#5f8f3c', '#7aa648', '#4c7a34'] : ['#566b3a', '#6d7343', '#4a5a36'];
    const reach = { fingertips: 0.34, head: 0.42, shoulders: 0.5, waist: 0.52 }[a.out];
    put(root, new THREE.CylinderGeometry(0.74, 0.77, 0.05, 36), paint(shade(greens[0], '#6f6a3c', dirt * 0.5), { roughness: 1 }), [0, -0.012, -0.02], [0, 0, 0], [1, 1, 1.12]);
    mound(root, random, reach, a.out === 'head' ? 0.07 : 0.12, reach * 0.85, soil, [0, 0.01, 0.12], 0.3);
    clods(root, random, Math.round(mix(40, 110, mood.density)), 0.12, reach * 1.45, 0.03, soils, [0, 0.015, 0.12]);
    turfSlabs(root, random, 7, reach * 0.95, 0.19, paint(soils[1], { roughness: 1 }), paint(greens[1]), [0, 0.03, 0.12], 0.9);
    grass(root, random, Math.round(mix(140, 340, mood.density)), 0.72, 0.07, greens, (x, z) => Math.hypot(x, z - 0.12) > reach * 0.9, [0, 0.012, 0]);

    // Its own headstone, shoved back as it comes up.
    const stoneTone = shade(shade('#9a9c98', mood.warmth > 0.5 ? '#b0a48a' : '#8490a0', Math.abs(mood.warmth - 0.5) * 0.5), '#5f6650', dirt * 0.5);
    const stoneMat = paint('#ffffff', { roughness: 1, map: mottled(random, stoneTone, [{ color: '#4a5a34', count: Math.round(dirt * 30), size: 0.07, alpha: 0.4 }, { color: '#d8d4b0', count: Math.round(dirt * 14), size: 0.04, alpha: 0.4 }, { color: '#2e2e2c', count: 30, size: 0.012, alpha: 0.4 }]) });
    const lines = EPITAPHS[a.epitaph];
    const face = a.epitaph === 'blank' ? null : lettered(lines, { paper: hex(stoneTone), ink: hex(shade(stoneTone, '#000000', 0.72)), grime: dirt, random, width: 256, height: a.stone === 'cross' ? 384 : 256 });
    const stone = headstone(root, a.stone as StoneShape, a.stone === 'cross' ? 0.62 : 0.66, a.stone === 'cross' ? 1.2 : a.stone === 'slab' ? 0.85 : 1.02, 0.13, stoneMat, face);
    stone.position.set((random() - 0.5) * 0.1, -0.06, -0.56);
    stone.rotation.set(-0.06 - dirt * 0.14 - (a.out === 'waist' ? 0.1 : 0), (random() - 0.5) * 0.2, (random() - 0.5) * (0.08 + dirt * 0.25));
    put(root, new THREE.BoxGeometry(0.86, 0.1, 0.3), stoneMat, [stone.position.x, 0.03, -0.56], [0, stone.rotation.y, 0]);

    const energy = mood.energy;
    const headRest = head.rotation.z, wristRest = wrist.rotation.z;
    return {
      object: root,
      footprint: 0.82,
      update(_dt, time) {
        const heave = Math.sin(time * (1.2 + energy * 3));
        figure.position.y = -cut * FS + heave * 0.012 * (0.3 + energy);
        figure.rotation.z = heave * 0.025 * (0.3 + energy);
        head.rotation.z = headRest + Math.sin(time * (0.9 + energy * 2.2) + 1) * 0.06 * (0.3 + energy);
        wrist.rotation.z = wristRest + Math.sin(time * (1.6 + energy * 4)) * (a.clutch === 'hat' || a.clutch === 'phone' ? 0.16 : 0.07) * (0.3 + energy);
        flexHand(up, time, grip ? 0.04 : 0.2 * (0.25 + energy), 1.2 + energy * 5);
        flexHand(down, time + 2, 0.08 * (0.25 + energy), 1 + energy * 4);
      },
      dispose: () => disposeTree(root),
    };
  },
});
