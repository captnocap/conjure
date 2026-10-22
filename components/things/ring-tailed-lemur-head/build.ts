import * as THREE from 'three';
import { type BuildContext, choice, clamp01, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { type V3, blob, coat, eye, settle, skin, sweep, tufts } from './beast';

type Pose = 'sun' | 'alert' | 'huddle' | 'scent';
type Tail = 'question' | 'draped' | 'wrapped';
type Eyes = 'startled' | 'calm' | 'sleepy' | 'glare';
type Mouth = 'shut' | 'yap' | 'tongue';
type Gaze = 'viewer' | 'side' | 'sky';
interface Spec { pose: Pose; tail: Tail; eyes: Eyes; mouth: Mouth; gaze: Gaze; age: number; turn: number }

function ringTexture(context: BuildContext, rings: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 8; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const band = 256 / (rings * 2);
  for (let i = 0; i < rings * 2; i++) {
    ctx.fillStyle = i % 2 ? '#f1ede2' : '#1d1b1a';
    ctx.fillRect(0, 256 - (i + 1) * band, 8, band + 1);
  }
  ctx.fillStyle = '#1d1b1a';
  ctx.fillRect(0, 256 - band * 0.4, 8, band);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  void context;
  return texture;
}

export default defineThing({
  questions: {
    pose: choice('What is it doing?', {
      sun: 'Sun-worshipping: sat bolt upright, arms resting open on its knees, white belly turned to the light.',
      alert: 'An alert stare, hands planted on the ground between its feet.',
      huddle: 'Hunched and huddled against the cold, arms folded in, chin tucked.',
      scent: 'Scent-marking: its tail pulled forward through its wrists and waved over its head.',
    }),
    tail: choice('If its tail is free, how is it carried?', {
      question: 'Raised straight up behind it and hooked over like a question mark.',
      draped: 'Draped along the ground in a lazy curve round to the front.',
      wrapped: 'Wrapped round its own body like a striped scarf.',
    }),
    age: score('How old is it?', ['A bug-eyed infant', 'A sleek young adult', 'A full adult', 'A ragged thin elder']),
    faces: choice('How many faces are there?', {
      one: 'One lemur alone.',
      pair: 'A stacked pair: an infant riding on its back, peering over its shoulder.',
      ball: 'A lemur ball: three pressed together in a huddle, heads at different heights.',
    }),
    eyes: choice('What mood are the orange eyes in?', {
      startled: 'Round and startled, pupils shrunk to dots.',
      calm: 'Calm and level.',
      sleepy: 'Sleepy slits, nearly shut.',
      glare: 'A hard glare under lowered brows.',
    }),
    mouth: choice('What is its mouth doing?', {
      shut: 'Closed, muzzle neat.',
      yap: 'Open in a yapping alarm bark.',
      tongue: 'Pink tongue out, mid-groom.',
    }),
    gaze: choice('Where is it facing?', {
      viewer: 'Straight at the viewer.',
      side: 'Head snapped to one side at a sound.',
      sky: 'Tipped up, watching the sky for a hawk.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const warm = (hex: string) => new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * 0.04, 0, 0);
    const grey = coat(context, warm('#9b958f'), '#6d6862');
    const brown = coat(context, warm('#9a8474'), '#6e5c50');
    const white = coat(context, '#f2efe6', '#cfc9bb');
    const black = skin('#1c1a19', { roughness: 0.8 });
    const pink = skin('#d98a8a');
    const rings = new THREE.MeshStandardMaterial({ map: ringTexture(context, 13), roughness: 0.9 });
    const sways: { mesh: THREE.Object3D; amount: number; phase: number }[] = [];

    const lemur = (spec: Spec) => {
      const g = new THREE.Group();
      const young = 1 - clamp01(spec.age * 3), old = clamp01((spec.age - 0.72) / 0.28);
      const huddle = spec.pose === 'huddle';
      const thin = 1 - old * 0.22;
      const backCoat = old > 0.5 || mood.wear > 0.7 ? brown : grey;
      const top = huddle ? 0.3 : 0.365;
      // Torso, belly and haunches.
      blob(g, [0.085 * thin, huddle ? 0.125 : 0.15, 0.082], [0, huddle ? 0.15 : 0.175, huddle ? 0.01 : 0], backCoat, [huddle ? 0.3 : -0.05, 0, 0], 22);
      blob(g, [0.064 * thin, huddle ? 0.1 : 0.125, 0.05], [0, huddle ? 0.14 : 0.165, 0.038], white, [huddle ? 0.3 : 0, 0, 0], 18);
      for (const side of [-1, 1]) {
        blob(g, [0.058, 0.075, 0.09], [side * 0.075, 0.07, 0.02], backCoat, [0, 0, 0], 16);
        const splay = spec.pose === 'sun' ? 0.05 : 0;
        sweep(g, [[side * 0.08, 0.09, 0.05], [side * (0.115 + splay), 0.15, 0.11], [side * (0.1 + splay), 0.03, 0.16]], (t) => mix(0.034, 0.018, t), backCoat);
        blob(g, [0.017, 0.012, 0.035], [side * (0.1 + splay), 0.014, 0.185], black, [0, side * 0.2, 0], 10);
        // Arms.
        const shoulder: V3 = [side * 0.068 * thin, top - 0.095, 0.02];
        let elbow: V3, hand: V3;
        if (spec.pose === 'sun') { elbow = [side * 0.15, 0.21, 0.04]; hand = [side * (0.125 + splay), 0.168, 0.12]; }
        else if (spec.pose === 'alert') { elbow = [side * 0.085, 0.15, 0.08]; hand = [side * 0.035, 0.014, 0.13]; }
        else if (huddle) { elbow = [side * 0.1, 0.13, 0.07]; hand = [-side * 0.02, 0.16 + side * 0.012, 0.105]; }
        else { elbow = [side * 0.1, 0.19, 0.09]; hand = [side * 0.03, 0.235, 0.135]; }
        sweep(g, [shoulder, elbow, hand], (t) => mix(0.026, 0.014, t), backCoat);
        blob(g, [0.014, 0.011, 0.02], hand, black, [0, 0, 0], 10);
      }

      // Tail.
      let path: V3[];
      const j = (random() - 0.5) * 0.06;
      if (spec.pose === 'scent') path = [[0, 0.03, -0.08], [0.1, 0.03, 0.0], [0.07, 0.1, 0.12], [0.02, 0.26, 0.15], [0, 0.46, 0.11], [j, 0.585, 0.0], [j * 2, 0.57, -0.1]];
      else if (spec.tail === 'question') path = [[0, 0.03, -0.08], [0, 0.05, -0.2], [j, 0.26, -0.27], [j, 0.5, -0.24], [j * 2, 0.635, -0.15], [j * 2, 0.625, -0.04], [j * 2, 0.545, -0.03]];
      else if (spec.tail === 'draped') path = [[0, 0.03, -0.08], [0.08, 0.024, -0.2], [0.22, 0.024, -0.15 + j], [0.275, 0.024, 0.03], [0.2 + j, 0.024, 0.2], [0.04, 0.024, 0.25]];
      else path = Array.from({ length: 12 }, (_u, i) => { const turn = -Math.PI / 2 - i * 0.62, r = 0.125 - i * 0.002; return [Math.cos(turn) * r * (i === 0 ? 0.4 : 1), 0.03 + i * 0.02, Math.sin(turn) * r * 0.95 + 0.02] as V3; });
      if (old > 0.5) path = path.slice(0, -1);
      const tail = sweep(g, path, (t) => 0.023 * (1 - old * 0.25) * (t > 0.96 ? 0.6 : 1), rings, { segments: 70, radial: 9 });
      if (spec.pose === 'scent' || spec.tail === 'question') sways.push({ mesh: tail, amount: spec.pose === 'scent' ? 0.07 : 0.03, phase: random() * 6 });

      // Head.
      const head = new THREE.Group();
      head.position.set(0, top, huddle ? 0.055 : 0.03);
      head.scale.setScalar(mix(1, 1.45, young));
      head.rotation.order = 'YXZ';
      head.rotation.set((huddle ? 0.35 : 0) + (spec.gaze === 'sky' ? -0.55 : spec.pose === 'sun' ? -0.18 : 0), spec.gaze === 'side' ? spec.turn * 0.85 : (random() - 0.5) * 0.2, (random() - 0.5) * 0.15);
      g.add(head);
      blob(head, [0.054, 0.049, 0.054], [0, 0, 0], white, [0, 0, 0], 22);
      blob(head, [0.052, 0.034, 0.05], [0, 0.022, -0.012], backCoat, [0.25, 0, 0], 20);
      sweep(head, [[0, -0.008, 0.03], [0, -0.016, 0.066], [0, -0.022, 0.094]], (t) => mix(0.027, 0.012, t), white, { radial: 12 });
      blob(head, [0.016, 0.012, 0.015], [0, -0.019, 0.087], black, [0, 0, 0], 12);
      const big = mix(1, 1.3, young);
      const lid = { startled: 0, calm: 0.28, sleepy: 0.8, glare: 0.42 }[spec.eyes];
      for (const side of [-1, 1]) {
        blob(head, [0.021, 0.019, 0.012], [side * 0.024, 0.006, 0.042], black, [0, side * 0.35, side * 0.5], 14);
        eye(head, { at: [side * 0.0235, 0.007, 0.043], r: 0.0115 * big, look: [side * 0.3, 0, 1], iris: '#f08a1a', irisSize: 0.9, pupil: spec.eyes === 'startled' ? 0.22 : 0.42, white: '#f08a1a', lid, lidMaterial: black });
        if (spec.eyes === 'glare') blob(head, [0.02, 0.006, 0.01], [side * 0.022, 0.021, 0.05], black, [0, 0, -side * 0.45], 8);
        blob(head, [0.02, 0.027, 0.008], [side * 0.043, 0.047, -0.008], white, [0, side * 0.4, -side * 0.45], 12);
        blob(head, [0.012, 0.018, 0.006], [side * 0.043, 0.046, -0.003], black, [0, side * 0.4, -side * 0.45], 10);
      }
      if (old > 0.3 || mood.wear > 0.5) {
        const ragged = Array.from({ length: 18 }, () => { const az = random() * Math.PI * 2; return { at: [Math.cos(az) * 0.045, 0.01 + random() * 0.03, Math.sin(az) * 0.045 - 0.01] as V3, dir: [Math.cos(az), 0.4 + random(), Math.sin(az) - 0.4] as V3, len: 0.018 + random() * 0.02, r: 0.005 }; });
        tufts(head, ragged, backCoat);
      }
      if (spec.mouth === 'yap') {
        blob(head, [0.012, 0.014, 0.014], [0, -0.036, 0.07], skin('#4a1c1c'), [0, 0, 0], 10);
        blob(head, [0.012, 0.008, 0.024], [0, -0.05, 0.062], white, [0.5, 0, 0], 10);
        for (const side of [-1, 1]) blob(head, [0.0025, 0.005, 0.0025], [side * 0.007, -0.03, 0.082], skin('#f6f0dc'), [0, 0, 0], 6);
      } else if (spec.mouth === 'tongue') blob(head, [0.007, 0.004, 0.014], [0, -0.034, 0.088], pink, [0.7, 0, 0], 10);
      else sweep(head, [[-0.011, -0.03, 0.075], [0, -0.033, 0.09], [0.011, -0.03, 0.075]], 0.0015, black, { segments: 8, radial: 5 });
      g.scale.setScalar(mix(1, 0.5, young) * (1 - old * 0.06));
      return g;
    };

    const turn = random() < 0.5 ? -1 : 1;
    const main = lemur({ pose: a.pose, tail: a.tail, eyes: a.eyes, mouth: a.mouth, gaze: a.gaze, age: a.age, turn });
    root.add(main);
    const mainScale = main.scale.x;
    if (a.faces === 'pair') {
      const rider = lemur({ pose: 'huddle', tail: 'wrapped', eyes: 'startled', mouth: 'shut', gaze: 'viewer', age: 0, turn });
      rider.position.set(turn * 0.075 * mainScale, 0.2 * mainScale, -0.085 * mainScale);
      rider.rotation.set(0.25, -turn * 0.25, turn * 0.2);
      root.add(rider);
    } else if (a.faces === 'ball') {
      for (const side of [-1, 1]) {
        const other = lemur({ pose: 'huddle', tail: 'wrapped', eyes: side > 0 ? 'sleepy' : a.eyes, mouth: 'shut', gaze: side > 0 ? 'viewer' : 'side', age: mix(0.35, 0.9, random()), turn: side });
        other.position.set(side * 0.15 * mainScale, 0, -0.05 - random() * 0.03);
        other.rotation.set(0, -side * 0.35, -side * 0.16);
        root.add(other);
      }
    }

    settle(root);
    const speed = mix(0.4, 2.4, mood.energy);
    return {
      object: root,
      update(_dt, time) { for (const s of sways) s.mesh.rotation.z = Math.sin(time * speed * 2 + s.phase) * s.amount; },
      dispose: () => disposeTree(root),
    };
  },
});
