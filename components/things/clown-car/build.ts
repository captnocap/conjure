import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const PAINTS = {
  'red-yellow': 'Tomato red with yellow: the classic clown car.',
  'yellow-blue': 'Custard yellow with bright blue.',
  'pink-green': 'Bubblegum pink with lime green.',
  'purple-orange': 'Purple with orange, loud and sour.',
  'white-red': 'White with red, like a nose on greasepaint.',
  'teal-cream': 'Faded teal with cream, a tired seaside show.',
} as const;
const HUES: Record<keyof typeof PAINTS, [string, string]> = {
  'red-yellow': ['#d8322a', '#f6c92b'],
  'yellow-blue': ['#f3c82a', '#2459b8'],
  'pink-green': ['#f079a8', '#7cc43a'],
  'purple-orange': ['#7a3aa6', '#f2882a'],
  'white-red': ['#f1ede2', '#d3262c'],
  'teal-cream': ['#3f9a94', '#f0e3bf'],
};

export default defineThing({
  questions: {
    body: choice('What kind of little car is it?', {
      bubble: 'A round bubble car with a domed glass cabin, like a wind-up toy.',
      'fire-engine': 'A miniature fire engine with a ladder on top, a bell and a hose reel.',
      bathtub: 'A cast-iron bathtub on wheels with taps, a shower pipe and a steering wheel.',
      jalopy: 'A boxy open jalopy with a folded canvas hood and a crank handle.',
    }),
    spill: choice('What is spilling out of it?', {
      shoes: 'Far too many enormous clown shoes tumbling from the door in a heap.',
      scarves: 'An endless string of knotted coloured scarves trailing out across the ground.',
      smoke: 'Smoke pouring from under the bonnet: it has broken down.',
      balloon: 'One sad balloon on a string tied to the back.',
      balloons: 'A big cheerful bunch of balloons tied to the back.',
      nothing: 'Nothing: it sits empty.',
    }),
    paint: choice('What colours is it painted?', PAINTS),
    pattern: choice('What is painted over the bodywork?', {
      dots: 'Big polka dots.',
      patches: 'Mismatched patch panels, as if repaired from other cars.',
      flames: 'Hot-rod flames licking back from the nose.',
      checks: 'A band of chequers along the side.',
      plain: 'Plain paint with a single stripe.',
    }),
    state: choice('What state is it in?', {
      parked: 'Parked and ready, sitting level.',
      overloaded: 'Overloaded: sagging low on its springs and leaning to one side.',
      wrecked: 'A wheel has come off and rolled away; the car slumps on its axle.',
    }),
    horn: choice('What is the oversized horn?', {
      bulb: 'One huge brass bulb horn with a black rubber squeeze ball.',
      triple: 'A cluster of three brass trumpets of different lengths.',
      gramophone: 'A flared gramophone horn in painted tin, far too big.',
    }),
    topper: choice('What is on top?', {
      nothing: 'Nothing.',
      umbrella: 'A small open umbrella stuck on a pole.',
      propeller: 'A spinning beanie propeller.',
      lamp: 'A flashing lamp like a toy police car.',
      luggage: 'A teetering pile of battered suitcases tied on with rope.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const car = new Sculpture(context);
    const { mood, random } = context;
    const [main, second] = HUES[a.paint];
    const rough = 0.4 + mood.wear * 0.45;
    const flowerHues = ['#d8322a', '#f6c92b', '#2459b8', '#7cc43a', '#f079a8', '#f2882a', '#7a3aa6'];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const bodyMap = paint(512, 256, (c, w, h) => {
      c.fillStyle = main;
      c.fillRect(0, 0, w, h);
      c.fillStyle = second;
      if (a.pattern === 'dots') for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(((i % 7) + (Math.floor(i / 7) % 2) * 0.5) * 80 + 20, Math.floor(i / 7) * 68 + 34, 20 + random() * 8, 0, 7); c.fill(); }
      else if (a.pattern === 'patches') for (let i = 0; i < 9; i++) {
        c.fillStyle = pick([second, '#8d8f8c', '#f1ede2', pick(flowerHues)]);
        const x = random() * w, y = random() * h, pw = 50 + random() * 90, ph = 40 + random() * 70;
        c.fillRect(x, y, pw, ph);
        c.fillStyle = '#2a2a2a';
        for (let k = 0; k < 6; k++) { c.fillRect(x + 6 + (k * (pw - 16)) / 5, y + 5, 4, 4); c.fillRect(x + 6 + (k * (pw - 16)) / 5, y + ph - 9, 4, 4); }
      }
      else if (a.pattern === 'flames') for (let k = 0; k < 4; k++) {
        const y0 = 30 + k * 60;
        c.beginPath();
        c.moveTo(w, y0 - 26); c.quadraticCurveTo(w * 0.55, y0 - 40, w * 0.25 + random() * 60, y0); c.quadraticCurveTo(w * 0.6, y0 + 4, w, y0 + 26);
        c.fill();
      }
      else if (a.pattern === 'checks') for (let i = 0; i < 32; i++) for (let j = 0; j < 3; j++) { c.fillStyle = (i + j) % 2 ? second : '#1c1c1e'; c.fillRect(i * 16, 100 + j * 16, 16, 16); }
      else c.fillRect(0, 108, w, 26);
      for (let i = 0; i < 10 + mood.wear * 90; i++) {
        c.fillStyle = pick(['#7a4a2a', '#8d8f8c', '#5a3a26']);
        c.beginPath();
        c.ellipse(random() * w, random() * h, 3 + random() * (6 + mood.wear * 14), 2 + random() * 7, random() * 3, 0, 7);
        c.fill();
      }
      // Dents drawn as dark crescents with a pale lip.
      for (let i = 0; i < 5; i++) {
        const x = random() * w, y = random() * h, r = 12 + random() * 16;
        c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r, 0.3, 2.6); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y + 3, r, 3.6, 5.8); c.stroke();
      }
    });
    const body = new THREE.MeshStandardMaterial({ map: bodyMap, roughness: rough, metalness: 0.15, side: THREE.DoubleSide });
    const mainPaint = car.material(main, { roughness: rough });
    const secondPaint = car.material(second, { roughness: rough });
    const chrome = car.material('#d9dde0', { metalness: 0.85, roughness: 0.25 });
    const brass = car.material('#d8a93a', { metalness: 0.75, roughness: 0.3 });
    const black = car.material('#1b1b1e', { roughness: 0.85 });
    const glass = car.material('#bfe3ee', { metalness: 0.3, roughness: 0.12 });

    // Per-body dimensions. The car is built along x with its nose toward +x.
    const dims = {
      bubble: { len: 1.7, floor: 0.34, w: 0.86, nose: 0.62, top: 1.28 },
      'fire-engine': { len: 2.0, floor: 0.4, w: 0.84, nose: 0.9, top: 1.2 },
      bathtub: { len: 1.75, floor: 0.38, w: 0.8, nose: 0.75, top: 0.9 },
      jalopy: { len: 1.85, floor: 0.4, w: 0.84, nose: 0.75, top: 1.2 },
    }[a.body];
    const { len, floor, w } = dims;
    const half = len / 2;
    let doorAt: P3 = [0, 0.6, w / 2], bonnet: P3 = [half * 0.6, 0.8, 0], roofY = dims.top, tail: P3 = [-half, 0.7, 0];

    if (a.body === 'bubble') {
      car.ball([half, 0.36, w / 2], [0, floor + 0.3, 0], body, 28);
      car.mesh(new THREE.SphereGeometry(0.5, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), glass, [-0.12, floor + 0.44, 0]).scale.set(1.05, 1, 0.8);
      car.mesh(new THREE.SphereGeometry(0.51, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.2), mainPaint, [-0.12, floor + 0.44, 0]).scale.set(1.05, 1, 0.8);
      for (const turn of [0, Math.PI / 2]) {
        const hoop = car.ring(0.505, 0.022, [-0.12, floor + 0.44, 0], secondPaint, Math.PI);
        hoop.rotation.y = turn;
        hoop.scale.set(turn ? 0.8 : 1.05, 1, 1);
      }
      car.ring(0.4, 0.03, [0, floor + 0.3, 0], chrome).rotation.x = Math.PI / 2;
      doorAt = [-0.1, floor + 0.3, w / 2 - 0.05];
      bonnet = [half * 0.62, floor + 0.52, 0];
      roofY = floor + 0.95;
      tail = [-half + 0.05, floor + 0.35, 0];
    } else if (a.body === 'fire-engine') {
      car.box([len, 0.42, w], [0, floor + 0.21, 0], body);
      car.box([0.6, 0.5, w - 0.04], [0.25, floor + 0.67, 0], mainPaint);
      car.box([0.62, 0.3, w - 0.1], [0.25, floor + 0.7, 0], glass);
      car.box([0.66, 0.05, w + 0.04], [0.25, floor + 0.94, 0], secondPaint);
      car.box([0.5, 0.3, w - 0.1], [half - 0.22, floor + 0.5, 0], mainPaint);
      car.box([0.03, 0.22, w - 0.2], [half + 0.04, floor + 0.5, 0], chrome);
      // Ladder on brackets, bell and hose reel.
      for (const z of [-0.14, 0.14]) car.rod([-half - 0.1, floor + 0.66, z], [0.75, floor + 1.12, z], 0.025, chrome);
      for (let i = 0; i < 8; i++) { const t = i / 7; car.rod([mix(-half - 0.05, 0.7, t), mix(floor + 0.68, floor + 1.1, t), -0.14], [mix(-half - 0.05, 0.7, t), mix(floor + 0.68, floor + 1.1, t), 0.14], 0.016, chrome); }
      car.rod([-half + 0.15, floor + 0.42, 0], [-half + 0.15, floor + 0.72, 0], 0.03, secondPaint);
      const reel = car.ring(0.2, 0.07, [-0.45, floor + 0.62, w / 2 + 0.02], car.material('#c9b27a'));
      reel.castShadow = true;
      car.cylinder(0.08, 0.08, 0.16, [-0.45, floor + 0.62, w / 2 + 0.02], chrome, 12).rotation.x = Math.PI / 2;
      car.mesh(new THREE.SphereGeometry(0.11, 14, 8, 0, 7, 0, Math.PI / 2), brass, [0.62, floor + 0.98, 0.2]);
      doorAt = [0.25, floor + 0.3, w / 2];
      bonnet = [half - 0.22, floor + 0.65, 0];
      roofY = floor + 0.97;
      tail = [-half, floor + 0.42, 0];
    } else if (a.body === 'bathtub') {
      const enamel = car.material('#f4f1ea', { roughness: 0.25 });
      const tub = car.mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), body, [0, floor + 0.5, 0]);
      tub.scale.set(half, 0.5, w / 2);
      const inner = car.mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), enamel, [0, floor + 0.5, 0]);
      inner.scale.set(half - 0.04, 0.46, w / 2 - 0.04);
      (inner.material as THREE.MeshStandardMaterial).side = THREE.BackSide;
      const rim = car.ring(1, 0.05, [0, floor + 0.5, 0], enamel);
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(half, w / 2, 1);
      // Taps at the tail, a shower pipe arching over, a steering wheel and a duck.
      for (const z of [-0.12, 0.12]) { car.cylinder(0.025, 0.03, 0.2, [-half + 0.1, floor + 0.6, z], brass, 10); car.ball([0.05, 0.03, 0.05], [-half + 0.1, floor + 0.72, z], z < 0 ? car.material('#c9222c') : car.material('#2459b8'), 8); }
      car.tube([[-half + 0.08, floor + 0.5, 0], [-half + 0.06, floor + 1.3, 0], [-half + 0.3, floor + 1.45, 0], [-half + 0.55, floor + 1.36, 0]], 0.025, chrome);
      car.mesh(new THREE.ConeGeometry(0.13, 0.12, 14), chrome, [-half + 0.57, floor + 1.32, 0]).rotation.z = -0.4;
      car.rod([0.35, floor + 0.3, 0], [0.15, floor + 0.78, 0], 0.02, black);
      const wheel = car.ring(0.17, 0.022, [0.14, floor + 0.8, 0], black);
      wheel.rotation.set(0, Math.PI / 2, 0.4, 'YXZ');
      const duck = car.material('#f6c92b');
      car.ball([0.09, 0.07, 0.07], [half - 0.3, floor + 0.57, 0.1], duck, 10);
      car.ball([0.05, 0.05, 0.05], [half - 0.24, floor + 0.67, 0.1], duck, 10);
      car.mesh(new THREE.ConeGeometry(0.02, 0.05, 6), car.material('#f2882a'), [half - 0.18, floor + 0.66, 0.1]).rotation.z = -Math.PI / 2;
      doorAt = [-0.1, floor + 0.55, w / 2 - 0.02];
      bonnet = [half - 0.12, floor + 0.5, 0];
      roofY = floor + 0.52;
      tail = [-half + 0.06, floor + 0.3, 0];
    } else {
      car.box([len * 0.55, 0.5, w], [-len * 0.2, floor + 0.25, 0], body);
      car.box([len * 0.42, 0.36, w * 0.7], [len * 0.28, floor + 0.2, 0], mainPaint);
      const hoodTop = car.cylinder(w * 0.35, w * 0.35, len * 0.42, [len * 0.28, floor + 0.38, 0], secondPaint, 16);
      hoodTop.rotation.z = Math.PI / 2;
      hoodTop.scale.set(0.5, 1, 1);
      car.box([0.05, 0.4, w * 0.7], [half - 0.04, floor + 0.24, 0], chrome);
      for (let i = 0; i < 6; i++) car.box([0.02, 0.34, 0.02], [half - 0.005, floor + 0.24, (i - 2.5) * 0.09], black);
      car.box([0.04, 0.36, w * 0.9], [0.08, floor + 0.7, 0], glass).rotation.z = -0.2;
      car.box([0.45, 0.12, w * 0.9], [-0.28, floor + 0.5, 0], car.material('#6a3a26'));
      car.box([0.1, 0.4, w * 0.9], [-0.52, floor + 0.66, 0], car.material('#6a3a26'));
      for (let i = 0; i < 4; i++) car.cylinder(0.07, 0.07, w + 0.04, [-half + 0.1 - i * 0.02, floor + 0.56 + i * 0.07, 0], car.material('#2c2a28'), 8).rotation.x = Math.PI / 2;
      car.rod([half, floor + 0.05, 0], [half + 0.16, floor + 0.05, 0], 0.02, chrome);
      car.rod([half + 0.16, floor + 0.05, 0], [half + 0.16, floor - 0.1, 0.06], 0.02, chrome);
      for (const z of [-1, 1]) { car.ball([0.1, 0.1, 0.1], [half - 0.08, floor + 0.42, z * (w / 2 - 0.02)], brass, 12); car.ball([0.08, 0.08, 0.04], [half + 0.0, floor + 0.42, z * (w / 2 - 0.02)], car.material('#fff3c0', { emissive: '#ffe9a0', emissiveIntensity: 0.5 }), 10); }
      doorAt = [-0.3, floor + 0.25, w / 2];
      bonnet = [len * 0.28, floor + 0.56, 0];
      roofY = floor + 0.9;
      tail = [-half + 0.02, floor + 0.3, 0];
    }

    // Headlamps like eyes and a red nose on the front (the jalopy has its own lamps).
    if (a.body !== 'jalopy') for (const z of [-1, 1]) {
      const nx = a.body === 'fire-engine' ? half + 0.02 : half * (a.body === 'bubble' ? 0.86 : 0.9);
      const ny = floor + (a.body === 'bathtub' ? 0.3 : 0.36);
      car.ball([0.09, 0.09, 0.09], [nx, ny, z * w * 0.27], chrome, 12);
      car.ball([0.06, 0.06, 0.06], [nx + 0.05, ny, z * w * 0.27], car.material('#fff3c0', { emissive: '#ffe9a0', emissiveIntensity: 0.5 }), 10);
    }
    car.ball([0.09, 0.09, 0.09], [half + (a.body === 'bathtub' || a.body === 'bubble' ? -0.02 : 0.07), floor + (a.body === 'bathtub' ? 0.2 : 0.24), 0], car.material('#e0202a', { roughness: 0.3 }), 14);
    car.box([0.05, 0.07, w + 0.16], [half * (a.body === 'bubble' ? 0.9 : 1) + 0.03, floor + 0.04, 0], chrome);
    car.box([0.05, 0.07, w + 0.1], [-half * (a.body === 'bubble' ? 0.9 : 1) - 0.03, floor + 0.04, 0], chrome);

    // Doors that do not fit: the wrong colour, the wrong size, hanging ajar on one hinge.
    if (a.body !== 'bathtub') for (const z of [1, -1]) {
      const door = new Sculpture(context);
      const wrong = car.material(z > 0 ? second : pick(flowerHues), { roughness: rough });
      door.box([0.52, 0.44 + (z > 0 ? 0.06 : -0.04), 0.04], [-0.26, 0, 0], wrong);
      door.box([0.08, 0.03, 0.05], [-0.42, 0.04, z * 0.03], chrome);
      door.root.position.set(doorAt[0] + 0.28, doorAt[1] + (z > 0 ? -0.03 : 0.04), z * (doorAt[2] + 0.02));
      door.root.rotation.set(0, z > 0 ? -(0.55 + random() * 0.4) : 0.12, z * (0.04 + random() * 0.07), 'YXZ');
      car.root.add(door.root);
    }

    // The daisy on the bonnet, on a springy stalk.
    const daisy = new Sculpture(context);
    const lean = (random() - 0.5) * 0.3;
    daisy.tube([[0, 0, 0], [lean * 0.4, 0.18, 0.02], [lean, 0.34, 0]], 0.016, car.material('#3f8a3a'));
    const petal = car.material('#fbf7ee'), heart = car.material('#f3b81f');
    const head = new Sculpture(context);
    for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2; const p = head.ball([0.075, 0.016, 0.034], [Math.cos(an) * 0.085, 0, Math.sin(an) * 0.085], petal, 8); p.rotation.y = -an; }
    head.ball([0.05, 0.03, 0.05], [0, 0.01, 0], heart, 10);
    head.root.position.set(lean, 0.35, 0);
    head.root.rotation.set(0.5, 0, -0.5 - lean);
    daisy.root.add(head.root);
    daisy.root.position.set(...bonnet);
    car.root.add(daisy.root);

    // The horn, far too big, on the driver's side.
    const horn = new Sculpture(context);
    const bell = (length: number, mouth: number, mat: THREE.Material) => {
      const g = new Sculpture(context);
      g.lathe([[0.02, 0], [0.03, length * 0.5], [mouth * 0.45, length * 0.82], [mouth, length], [mouth * 1.04, length + 0.01]], mat).material.side = THREE.DoubleSide;
      return g.root;
    };
    if (a.horn === 'bulb') {
      const b = bell(0.6, 0.24, brass);
      b.rotation.z = -Math.PI / 2 + 0.25;
      horn.root.add(b);
      horn.ball([0.13, 0.12, 0.12], [-0.1, -0.03, 0], black, 14);
      horn.ring(0.09, 0.03, [0.22, 0.11, 0], brass).rotation.y = Math.PI / 2;
    } else if (a.horn === 'triple') {
      [0.66, 0.5, 0.36].forEach((length, i) => { const b = bell(length, 0.13 + (2 - i) * 0.02, brass); b.rotation.z = -Math.PI / 2 + 0.12; b.position.set(0, i * 0.15 - 0.1, (i - 1) * 0.06); horn.root.add(b); });
      horn.box([0.1, 0.42, 0.14], [0, 0.05, 0], black);
    } else {
      const b = bell(0.7, 0.36, new THREE.MeshStandardMaterial({ color: second, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }));
      b.rotation.z = -Math.PI / 2 + 0.7;
      horn.root.add(b);
      horn.rod([0, 0, 0], [0, -0.2, 0], 0.03, brass);
    }
    horn.root.position.set(a.body === 'bubble' ? 0.3 : a.body === 'bathtub' ? 0.3 : 0.55, floor + (a.body === 'bathtub' ? 0.66 : a.body === 'bubble' ? 0.6 : 0.66), w / 2 + (a.body === 'bubble' ? -0.04 : 0.1));
    car.root.add(horn.root);

    // Four wheels that do not match in size, colour or style.
    const wrecked = a.state === 'wrecked';
    const wheels: THREE.Object3D[] = [];
    const radii = [0.26, 0.2, 0.31, 0.17].sort(() => random() - 0.5);
    const makeWheel = (r: number, k: number) => {
      const g = new Sculpture(context);
      const hub = car.material(pick(flowerHues));
      g.ring(r - 0.05, 0.055, [0, 0, 0], black);
      if (k % 2) { for (let i = 0; i < 5; i++) g.box([(r - 0.05) * 2, 0.035, 0.03], [0, 0, 0], k === 1 ? chrome : hub).rotation.z = (i * Math.PI) / 5; }
      else g.cylinder(r - 0.05, r - 0.05, 0.05, [0, 0, 0], hub, 18).rotation.x = Math.PI / 2;
      g.cylinder(0.05, 0.05, 0.13, [0, 0, 0], chrome, 10).rotation.x = Math.PI / 2;
      return g.root;
    };
    [[half * 0.62, 1], [half * 0.62, -1], [-half * 0.6, 1], [-half * 0.6, -1]].forEach(([x, z], k) => {
      const r = radii[k];
      const wheel = makeWheel(r, k);
      if (wrecked && k === 0) {
        wheel.position.set(x + 0.1 + random() * 0.25, 0.07, w / 2 + 0.5 + random() * 0.15);
        wheel.rotation.set(Math.PI / 2 - 0.12, 0, random() * 6);
        car.rod([x, r, w / 2 - 0.1], [x, r, w / 2 + 0.16], 0.03, chrome);
      } else {
        wheel.position.set(x, r, z * (w / 2 + 0.07));
        wheel.rotation.z = random() * 6;
        wheels.push(wheel);
      }
      car.root.add(wheel);
      // Mudguard arch over each wheel.
      const guard = car.ring(r + 0.05, 0.035, [x, r, z * (w / 2 + 0.07)], secondPaint, Math.PI);
      guard.scale.z = 3;
    });

    // What is on top.
    const topAt: P3 = [a.body === 'bubble' ? -0.12 : a.body === 'fire-engine' ? 0.25 : a.body === 'bathtub' ? 0.5 : -0.3, roofY, a.body === 'fire-engine' ? -0.25 : 0];
    let spinner: THREE.Object3D | null = null;
    let beacon: THREE.MeshStandardMaterial | null = null;
    if (a.topper === 'umbrella') {
      car.rod(topAt, [topAt[0], topAt[1] + 0.7, topAt[2]], 0.015, black);
      const brolly = paint(128, 16, (c, cw, ch) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? main : second; c.fillRect((i * cw) / 8, 0, cw / 8, ch); } });
      car.mesh(new THREE.ConeGeometry(0.5, 0.2, 8, 1, true), new THREE.MeshStandardMaterial({ map: brolly, side: THREE.DoubleSide, roughness: 0.7 }), [topAt[0], topAt[1] + 0.68, topAt[2]]);
    } else if (a.topper === 'propeller') {
      car.rod(topAt, [topAt[0], topAt[1] + 0.22, topAt[2]], 0.02, chrome);
      const prop = new Sculpture(context);
      prop.box([0.7, 0.02, 0.1], [0, 0, 0], car.material('#d8322a')).rotation.x = 0.3;
      prop.box([0.1, 0.02, 0.7], [0, 0, 0], car.material('#f6c92b')).rotation.z = 0.3;
      prop.ball([0.05, 0.05, 0.05], [0, 0.02, 0], car.material('#2459b8'), 8);
      prop.root.position.set(topAt[0], topAt[1] + 0.23, topAt[2]);
      prop.root.rotation.y = random() * 3;
      car.root.add(prop.root);
      spinner = prop.root;
    } else if (a.topper === 'lamp') {
      beacon = new THREE.MeshStandardMaterial({ color: '#3a7ae0', emissive: '#2a6aff', emissiveIntensity: 1.4, roughness: 0.3 });
      car.cylinder(0.09, 0.1, 0.05, [topAt[0], topAt[1] + 0.02, topAt[2]], chrome, 12);
      car.mesh(new THREE.SphereGeometry(0.09, 12, 8, 0, 7, 0, Math.PI / 2), beacon, [topAt[0], topAt[1] + 0.04, topAt[2]]).scale.y = 1.5;
    } else if (a.topper === 'luggage') {
      let y = topAt[1];
      const cases = 2 + Math.floor(mood.density * 3);
      for (let i = 0; i < cases; i++) {
        const cw = 0.5 - i * 0.07, ch = 0.14 + random() * 0.08;
        const box = car.box([cw, ch, 0.34 - i * 0.03], [topAt[0] + (random() - 0.5) * 0.12, y + ch / 2, topAt[2] + (random() - 0.5) * 0.08], car.material(pick(['#7a4a2a', '#3f5a3a', '#8a2a2a', '#c9a55a', '#2f3f6a'])));
        box.rotation.y = (random() - 0.5) * 0.6;
        box.rotation.z = (random() - 0.5) * 0.12;
        car.box([cw + 0.01, 0.025, 0.05], [box.position.x, y + ch / 2, box.position.z], car.material('#c9b27a')).rotation.y = box.rotation.y;
        y += ch;
      }
      car.rod([topAt[0], topAt[1], 0.2], [topAt[0], y + 0.01, 0], 0.01, car.material('#c9b27a'));
      car.rod([topAt[0], topAt[1], -0.2], [topAt[0], y + 0.01, 0], 0.01, car.material('#c9b27a'));
    }

    // Stance: level, sagging, or slumped on a missing wheel.
    car.root.rotation.order = 'YXZ';
    if (a.state === 'overloaded') { car.root.rotation.x = 0.09; car.root.position.y = -0.06; }
    if (wrecked) { car.root.rotation.z = -0.1; car.root.rotation.x = 0.1; car.root.position.y = -0.03; }
    // Turned so the nose points toward the viewer's right and the side reads clearly.
    const turn = new THREE.Group();
    turn.add(car.root);
    turn.rotation.y = -0.55;
    s.root.add(turn);
    const t = new Sculpture(context);
    turn.add(t.root);

    // What spills out (in the car's own frame, on the ground beside the open door).
    const puffs: { mesh: THREE.Mesh; home: THREE.Vector3; phase: number }[] = [];
    const floaters: { group: THREE.Object3D; phase: number }[] = [];
    if (a.spill === 'shoes') {
      const count = 9 + Math.floor(mood.density * 12);
      for (let i = 0; i < count; i++) {
        const shoe = new Sculpture(context);
        const hue = t.material(pick(flowerHues), { roughness: 0.4 });
        shoe.ball([0.2, 0.08, 0.1], [0.05, 0.08, 0], hue, 12);
        shoe.ball([0.13, 0.12, 0.12], [0.18, 0.11, 0], hue, 12);
        shoe.cylinder(0.075, 0.08, 0.1, [-0.1, 0.14, 0], t.material('#f1ede2'), 10);
        shoe.box([0.42, 0.025, 0.2], [0.06, 0.012, 0], t.material('#2a2422'));
        const spread = i / count;
        const an = random() * Math.PI - 0.2, reach = 0.15 + spread * 0.95 * random() + 0.1;
        const pile = Math.max(0, 0.42 - reach * 0.5) * random();
        shoe.root.position.set(doorAt[0] - 0.1 + Math.cos(an) * reach, pile, w / 2 + 0.3 + Math.sin(an) * reach * 0.9);
        shoe.root.rotation.set((random() - 0.5) * (pile > 0.05 ? 1.6 : 0.3), random() * 6, (random() - 0.5) * (pile > 0.05 ? 1.2 : 0.2));
        shoe.root.scale.setScalar(0.85 + random() * 0.35);
        t.root.add(shoe.root);
      }
    } else if (a.spill === 'scarves') {
      const start: P3 = [doorAt[0], a.body === 'bathtub' ? floor + 0.55 : doorAt[1] + 0.25, w / 2 + 0.02];
      const pts: P3[] = [start, [start[0] - 0.05, start[1] * 0.5, w / 2 + 0.3]];
      const n = 10 + Math.floor(mood.density * 6);
      for (let i = 0; i < n; i++) pts.push([start[0] - 0.1 + Math.sin(i * 0.9 + random()) * 0.45 - i * 0.02, 0.035, w / 2 + 0.5 + i * 0.13]);
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const segs = n + 2;
      for (let i = 0; i < segs; i++) {
        const from = curve.getPoint(i / segs), to = curve.getPoint((i + 0.86) / segs), mid = curve.getPoint((i + 0.43) / segs);
        t.tube([from.toArray() as P3, mid.toArray() as P3, to.toArray() as P3], 0.035, t.material(flowerHues[i % flowerHues.length], { roughness: 0.6 })).scale.y = 1;
        t.ball([0.045, 0.045, 0.045], to.toArray() as P3, t.material('#f1ede2'), 8);
      }
    } else if (a.spill === 'smoke') {
      const smoke = t.material('#d5d2cc', { roughness: 1 }), soot = t.material('#77736f', { roughness: 1 });
      const n = 10 + Math.floor(mood.density * 6);
      for (let i = 0; i < n; i++) {
        const u = i / n;
        const home = new THREE.Vector3(bonnet[0] + (random() - 0.5) * 0.4 * (0.5 + u) - u * 0.5, bonnet[1] + 0.05 + u * 1.5, (random() - 0.5) * 0.5 * (0.5 + u));
        const size = 0.13 + u * 0.22 + random() * 0.06;
        const mesh = t.ball([size, size * 0.9, size], home.toArray() as P3, i % 3 ? smoke : soot, 10);
        puffs.push({ mesh, home, phase: random() * 6 });
      }
      const lid = t.box([0.5, 0.03, w * 0.6], [bonnet[0] + 0.05, bonnet[1] + 0.12, 0], secondPaint);
      lid.rotation.z = 0.6;
    } else if (a.spill === 'balloon' || a.spill === 'balloons') {
      const many = a.spill === 'balloons';
      const count = many ? 7 + Math.floor(mood.density * 6) : 1;
      for (let i = 0; i < count; i++) {
        const g = new Sculpture(context);
        const sad = !many && mood.cheer < 0.6;
        const height = many ? 1.1 + random() * 0.7 : sad ? 0.55 : 1.2;
        const dx = many ? (random() - 0.5) * 0.9 - 0.2 : -0.35, dz = many ? (random() - 0.5) * 0.8 : 0.1;
        g.rod([0, 0, 0], [dx, height, dz], 0.008, t.material('#f1ede2'));
        const hue = many ? pick(flowerHues) : sad ? '#5a7fb8' : '#d8322a';
        const size = sad ? 0.17 : 0.2;
        g.ball([size, size * (sad ? 1.05 : 1.2), size], [dx, height + size, dz], t.material(hue, { roughness: 0.25 }), 14);
        g.mesh(new THREE.ConeGeometry(0.03, 0.05, 6), t.material(hue), [dx, height, dz]);
        g.root.position.set(...tail);
        t.root.add(g.root);
        floaters.push({ group: g.root, phase: random() * 6 });
      }
    }

    const lively = mix(0.2, 1.8, mood.energy);
    return s.finish({
      update: (dt, time) => {
        if (spinner) spinner.rotation.y += dt * lively * 9;
        if (beacon) beacon.emissiveIntensity = 0.5 + 1.4 * Math.max(0, Math.sin(time * lively * 6));
        head.root.rotation.z = -0.5 - lean + Math.sin(time * lively * 3) * 0.12;
        for (const puff of puffs) {
          puff.mesh.position.y = puff.home.y + Math.sin(time * lively + puff.phase) * 0.06;
          puff.mesh.position.x = puff.home.x + Math.cos(time * lively * 0.7 + puff.phase) * 0.04;
        }
        for (const f of floaters) { f.group.rotation.z = Math.sin(time * lively + f.phase) * 0.07; f.group.rotation.x = Math.cos(time * lively * 0.8 + f.phase) * 0.05; }
      },
    });
  },
});
