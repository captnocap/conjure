import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { armPose, segmentOf, skullcap } from './pose';

type Ctx = CanvasRenderingContext2D;
const canvasTexture = (w: number, h: number, draw: (c: Ctx) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

interface Palette { field: string; border: string; pale: string; accent: string }
type PaletteName = 'red' | 'green' | 'blue';
const PALETTES: Record<PaletteName, Palette> = {
  red: { field: '#8e2a22', border: '#1f2c52', pale: '#ead9b0', accent: '#c98a2e' },
  green: { field: '#2f5a3a', border: '#c9a24a', pale: '#efe8d2', accent: '#8e2a22' },
  blue: { field: '#2a4a8e', border: '#8e2a22', pale: '#e8dcc0', accent: '#d9a441' },
};

/** The outside of a rolled rug: the border wraps each end as a band, the field runs between them. u goes round the roll, v along it. */
function rollTexture(random: () => number, p: Palette) {
  return canvasTexture(256, 256, (c) => {
    c.fillStyle = p.field;
    c.fillRect(0, 0, 256, 256);
    for (const y of [10, 222]) {
      c.fillStyle = p.border;
      c.fillRect(0, y, 256, 24);
      c.fillStyle = p.pale;
      c.fillRect(0, y - 4, 256, 3);
      c.fillRect(0, y + 25, 256, 3);
      c.fillStyle = p.accent;
      for (let x = 4; x < 256; x += 20) {
        c.beginPath();
        c.moveTo(x, y + 12);
        c.lineTo(x + 7, y + 5);
        c.lineTo(x + 14, y + 12);
        c.lineTo(x + 7, y + 19);
        c.closePath();
        c.fill();
      }
    }
    c.strokeStyle = p.pale;
    c.lineWidth = 2;
    c.strokeRect(-4, 48, 264, 160);
    // The arch of the mihrab going round the roll, and a scatter of small flowers.
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(0, 150);
    c.quadraticCurveTo(128, 60, 256, 150);
    c.stroke();
    for (let i = 0; i < 18; i++) {
      c.fillStyle = i % 2 ? p.pale : p.accent;
      const x = random() * 256, y = 60 + random() * 134;
      c.beginPath();
      c.moveTo(x, y - 5);
      c.lineTo(x + 5, y);
      c.lineTo(x, y + 5);
      c.lineTo(x - 5, y);
      c.closePath();
      c.fill();
    }
  });
}

/** The end of a roll: the rug seen edge-on, wound in a spiral. */
function endTexture(p: Palette) {
  return canvasTexture(128, 128, (c) => {
    c.fillStyle = p.field;
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = p.pale;
    c.lineWidth = 3;
    c.beginPath();
    for (let t = 0; t < Math.PI * 9; t += 0.1) {
      const r = 4 + t * 2.05;
      const x = 64 + Math.cos(t) * r, y = 64 + Math.sin(t) * r;
      if (t === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    c.strokeStyle = p.border;
    c.lineWidth = 7;
    c.beginPath();
    c.arc(64, 64, 59, 0, Math.PI * 2);
    c.stroke();
  });
}

/** Fringe: cream threads with gaps between them, cut out by alpha. */
function fringeTexture(colour: string) {
  return canvasTexture(128, 32, (c) => {
    c.clearRect(0, 0, 128, 32);
    c.fillStyle = colour;
    for (let x = 0; x < 128; x += 4) c.fillRect(x, 0, 2, 32);
  });
}

const RUG_R = 0.05, RUG_L = 0.64;
/** How a bundle of n rolls packs under an arm, as [across, up] offsets in roll diameters. */
const LAYOUTS: Record<number, readonly (readonly [number, number])[]> = {
  2: [[0, 0.5], [0, -0.5]],
  3: [[0, 0.55], [-0.5, -0.4], [0.5, -0.4]],
  4: [[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]],
  5: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 1.4]],
  6: [[-0.5, -1], [0.5, -1], [-0.5, 0], [0.5, 0], [-0.5, 1], [0.5, 1]],
};

export default defineThing({
  questions: {
    pattern: choice('What colour are the rugs?', {
      red: 'Deep madder red rugs with navy borders.',
      green: 'Bottle green rugs with gold borders.',
      blue: 'Blue rugs with red borders.',
      mixed: 'A mixed armful: red, green and blue together, nothing matching.',
    }),
    count: score('How many rugs is he carrying?', ['Three: two under the arm and one against the chest', 'Five, a proper armful', 'Seven, more than he can manage']),
    head: choice('What is on his head?', {
      knitted: 'A knitted wool cap pulled down over his ears.',
      white: 'A small white crocheted prayer cap.',
      none: 'Bare head, dark hair.',
      hood: 'The hood of his jacket up.',
    }),
    clothes: choice('What is he wearing?', {
      jacket: 'A zipped puffy jacket and jeans.',
      shirt: 'A striped shirt tucked into trousers.',
      tracksuit: 'A dark tracksuit with white stripes down the arms and legs.',
      tunic: 'A long pale tunic over loose trousers.',
    }),
    slipping: noul('Is one rug slipping loose from the bundle, about to drop?'),
    pace: choice('What is he doing?', {
      walking: 'Walking steadily, head turned to see past the bundle.',
      hurrying: 'Hurrying, leaning forward, nearly running.',
      stopped: 'Stopped, looking back over his shoulder for whoever sent him.',
    }),
    age: score('How big is the child?', ['A small child of five or six', 'About nine', 'A gangly teenager']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.02, 1.46, a.age);
    const build = a.age < 0.35 ? 'average' : pick(['slight', 'slight', 'average'] as const);
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const skinTone = pick(['#d9b08c', '#c99a78', '#b5805a', '#e3c2a4', '#9a6b4b']);
    const outfit = {
      jacket: { top: pick(['#3a5a8a', '#8e2a22', '#2f6a4a', '#d98a2e']), bottom: '#3a3f55' },
      shirt: { top: '#e9e4d6', bottom: pick(['#3a3c44', '#6d6f70', '#4a4238']) },
      tracksuit: { top: pick(['#1f2d4a', '#1a1a1c', '#8e2a22']), bottom: pick(['#1f2d4a', '#1a1a1c']) },
      tunic: { top: '#efe9dc', bottom: '#e5dfd0' },
    }[a.clothes];
    const person = figure(s, {
      height: H, build, style: 'doll', skin: skinTone,
      pose: a.pace === 'hurrying' ? 'running' : a.pace === 'stopped' ? 'standing' : 'walking',
      gaze: a.pace === 'stopped' ? 'over-shoulder' : 'right',
      hair: a.head === 'hood' ? 'hood' : 'short', hairColor: '#2a211b',
      top: outfit.top, bottom: outfit.bottom, shoes: pick(['#f0ede6', '#f0ede6', '#2b3a6b']),
      sleeves: a.clothes === 'shirt' || a.clothes === 'tunic' ? pick(['long', 'short'] as const) : 'long',
    });
    s.root.add(person.root);
    const { joints } = person;
    const headR = H * 0.064, limb = H * 0.036 * wide, torsoL = H * 0.28, upperL = H * 0.17;
    const shoulderW = H * 0.115 * wide, hipW = H * 0.075 * wide;
    const front = limb * 1.35;

    // ---- the rugs: one texture set per colour, one geometry for every roll
    const grey = new THREE.Color('#9a9184');
    const fade = mood.wear * 0.3;
    const tone = (hex: string) => `#${new THREE.Color(hex).lerp(grey, fade).getHexString()}`;
    const sets = new Map<PaletteName, THREE.Material[]>();
    const materialsFor = (name: PaletteName) => {
      let set = sets.get(name);
      if (!set) {
        const p = PALETTES[name];
        const faded = { field: tone(p.field), border: tone(p.border), pale: tone(p.pale), accent: tone(p.accent) };
        const side = new THREE.MeshStandardMaterial({ map: rollTexture(random, faded), roughness: 0.95 });
        const end = new THREE.MeshStandardMaterial({ map: endTexture(faded), roughness: 0.95 });
        set = [side, end, end];
        sets.set(name, set);
      }
      return set;
    };
    const fringe = new THREE.MeshStandardMaterial({ map: fringeTexture(tone('#efe6cf')), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
    const rollGeometry = new THREE.CylinderGeometry(RUG_R, RUG_R, RUG_L, 18);
    const collarGeometry = new THREE.CylinderGeometry(RUG_R * 1.06, RUG_R * 1.16, 0.034, 18, 1, true);
    const names: readonly PaletteName[] = ['red', 'green', 'blue'];
    const roll = () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(rollGeometry, materialsFor(a.pattern === 'mixed' ? pick(names) : a.pattern));
      body.castShadow = body.receiveShadow = true;
      body.rotation.y = random() * Math.PI * 2;
      g.add(body);
      for (const sign of [1, -1]) {
        const collar = new THREE.Mesh(collarGeometry, fringe);
        collar.position.y = sign * (RUG_L / 2 + 0.015);
        collar.castShadow = true;
        g.add(collar);
      }
      return g;
    };

    // ---- the bundle under the left arm, against the hip, rolls pointing the way he walks
    const under = Math.round(mix(2, 6, a.count));
    const layout = LAYOUTS[under] ?? LAYOUTS[4]!;
    const d = RUG_R * 2 + 0.004;
    const xs = layout.map((p) => p[0]), ys = layout.map((p) => p[1]);
    const bw = (Math.max(...xs) - Math.min(...xs) + 1) * d / 2;
    const bh = (Math.max(...ys) - Math.min(...ys) + 1) * d / 2;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const bundle = new THREE.Group();
    bundle.position.set(hipW + bw + 0.012, 0.03, 0.04);
    joints.pelvis.add(bundle);
    let loose: THREE.Group | null = null;
    layout.forEach(([dx, dy], index) => {
      const r = roll();
      r.rotation.x = Math.PI / 2;
      r.position.set((dx - cx) * d, (dy - cy) * d, (random() - 0.5) * 0.05);
      if (a.slipping && index === layout.length - 1) {
        // The last roll has slid backward and droops, its front end lifting out of the bundle.
        r.position.y -= 0.045;
        r.position.z -= 0.12;
        r.position.x += 0.02;
        r.rotation.x = Math.PI / 2 - 0.32;
        loose = r;
      }
      bundle.add(r);
    });
    // The arm wraps over the top of the bundle: wider bundles push the elbow out and up.
    const out = Math.asin(Math.min(0.95, Math.max(0.3, (hipW + 2 * bw + 0.015 + limb * 0.5 - shoulderW) / upperL))) * 180 / Math.PI;
    armPose(person, 'left', { forward: 10, out, bend: 84, swing: -16 });

    // ---- the fifth rug held upright against the chest with the right arm
    const chest = roll();
    // Hugged slantwise across the chest, the top end toward the left shoulder, so it never hides his face.
    chest.position.set(0.01, torsoL * 0.4, front + RUG_R + 0.008);
    chest.rotation.z = -0.82 - random() * 0.12;
    chest.rotation.x = -0.1;
    joints.spine.add(chest);
    armPose(person, 'right', { forward: 52, out: 6, bend: 104, swing: -58 });

    // ---- clothes and head
    const cloth = s.material(outfit.top, { roughness: 0.85 });
    if (a.clothes === 'jacket') {
      const torso = segmentOf(joints.spine);
      torso.scale.z *= 1.18;
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.006, torsoL * 0.8, 0.004), s.material('#c9c9c9', { metalness: 0.6, roughness: 0.4 }));
      zip.position.set(0, torsoL * 0.5, front * 1.18 + 0.001);
      joints.spine.add(zip);
    }
    if (a.clothes === 'shirt') {
      const stripe = pick(['#8e2a22', '#2a4a8e', '#2f6a4a', '#3a3a40']);
      const map = canvasTexture(64, 128, (c) => {
        c.fillStyle = tone(outfit.top);
        c.fillRect(0, 0, 64, 128);
        c.fillStyle = tone(stripe);
        for (let y = 0; y < 128; y += 12) c.fillRect(0, y, 64, 5);
      });
      segmentOf(joints.spine).material = new THREE.MeshStandardMaterial({ map, roughness: 0.85 });
    }
    if (a.clothes === 'tracksuit') {
      const white = s.material('#f1efe8', { roughness: 0.9 });
      const pairs: [THREE.Object3D, number, number][] = [
        [joints.shoulders.left, upperL, limb], [joints.shoulders.right, upperL, limb],
        [joints.elbows.left, H * 0.15, limb * 0.9], [joints.elbows.right, H * 0.15, limb * 0.9],
        [joints.hips.left, H * 0.24, limb * 1.15], [joints.hips.right, H * 0.24, limb * 1.15],
        [joints.knees.left, H * 0.23, limb], [joints.knees.right, H * 0.23, limb],
      ];
      pairs.forEach(([joint, length, radius], i) => {
        const sign = i % 2 === 0 ? 1 : -1;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.006, length * 0.86, 0.014), white);
        stripe.position.set(sign * radius, -length / 2, 0);
        joint.add(stripe);
      });
    }
    if (a.clothes === 'tunic') {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(hipW * 1.12, hipW * 1.1 + 0.05, H * 0.26, 18, 1, true), s.material(outfit.top, { roughness: 0.8, side: THREE.DoubleSide }));
      skirt.position.set(0, -H * 0.13 + 0.02, 0);
      skirt.castShadow = true;
      joints.pelvis.add(skirt);
    }
    if (a.head === 'knitted') skullcap(person.head, headR, s.material(pick(['#3a3a40', '#8e2a22', '#2f3b33', '#c9a24a']), { roughness: 1 }), { tall: 1.3, band: s.material('#e9e4d6', { roughness: 1 }) });
    if (a.head === 'white') skullcap(person.head, headR, s.material('#f3f1ea', { roughness: 0.95 }));
    // Trainers: a pale sole under each foot.
    for (const side of ['left', 'right'] as const) {
      const foot = segmentOf(joints.ankles[side]);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(limb * 1.9, 0.012, limb * 4.2), s.material(pick(['#f5f3ee', '#2b3a6b', '#c0392b'])));
      sole.position.set(foot.position.x, foot.position.y - limb * 0.95 + 0.004, foot.position.z);
      joints.ankles[side].add(sole);
    }
    void cloth;

    person.settle();
    // Three-quarter view with the bundle toward the camera.
    s.root.rotation.y = -0.4;
    const restY = joints.body.position.y;
    const stride = a.pace === 'stopped' ? 0 : mix(0.3, 1, mood.energy) * (a.pace === 'hurrying' ? 1.6 : 1);
    const looseRoll = loose as THREE.Group | null;
    const looseRest = looseRoll ? looseRoll.rotation.x : 0;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (stride) joints.body.position.y = restY + Math.abs(Math.sin(time * 5 * stride)) * 0.012 * stride;
        if (looseRoll) looseRoll.rotation.x = looseRest + Math.sin(time * 3.1) * 0.05 * (0.3 + mood.energy);
      },
    });
  },
});
