import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, type FigureStyle, mix, score } from '@conjure/kit';

type P = [number, number, number];
type G = CanvasRenderingContext2D;
const RAD = Math.PI / 180;

function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SUITS = {
  blue: { top: '#2f4f8a', bottom: '#2f4f8a', shoes: '#2a2a2c', note: 'A royal-blue flight suit with a flag patch on the sleeve.' },
  orange: { top: '#e8651c', bottom: '#e8651c', shoes: '#2a2a2c', note: 'A bright orange launch-and-entry suit, round mission patch on the chest.' },
  white: { top: '#e9e7e0', bottom: '#8d9298', shoes: '#4a4e55', note: 'A white station polo and grey work trousers, a name tape on the chest.' },
  olive: { top: '#5b6442', bottom: '#5b6442', shoes: '#2f2a24', note: 'An olive military coverall with a subdued tan name tape.' },
  teal: { top: '#2c6e6a', bottom: '#2c6e6a', shoes: '#2a2a2c', note: 'A teal crew jumpsuit with a yellow shoulder stripe.' },
} as const;

interface Pose { spine: number; neck: number; armF: number; armOut: number; elbow: number; foreIn: number; legF: number; knee: number; legOut: number; roll: number; }
const POSES: Record<'hands' | 'knees' | 'floor' | 'curled', Pose> = {
  hands: { spine: 26, neck: 30, armF: 118, armOut: 6, elbow: 132, foreIn: 48, legF: 88, knee: 88, legOut: 8, roll: 0 },
  knees: { spine: 58, neck: 28, armF: 95, armOut: 2, elbow: 125, foreIn: 55, legF: 88, knee: 88, legOut: 6, roll: 0 },
  floor: { spine: 20, neck: 42, armF: 58, armOut: 8, elbow: 78, foreIn: 6, legF: 88, knee: 88, legOut: 10, roll: 0 },
  curled: { spine: 22, neck: 26, armF: 110, armOut: 4, elbow: 128, foreIn: 50, legF: 96, knee: 118, legOut: 4, roll: 90 },
};
const HUG_LEGS = { legF: 130, knee: 160, legOut: 6 };

function applyPose(person: Figure, p: Pose, jitter: () => number) {
  const j = person.joints;
  for (const side of ['left', 'right'] as const) {
    const sign = side === 'left' ? 1 : -1;
    const wobble = (jitter() - 0.5) * 8;
    j.shoulders[side].rotation.set(-(p.armF + wobble) * RAD, 0, sign * p.armOut * RAD);
    j.elbows[side].rotation.set(-p.elbow * RAD, -sign * p.foreIn * RAD, 0);
    j.hips[side].rotation.set(-p.legF * RAD, 0, sign * (p.legOut + (jitter() - 0.5) * 6) * RAD);
    j.knees[side].rotation.set(p.knee * RAD, 0, 0);
    j.ankles[side].rotation.x = -(j.knees[side].rotation.x + j.hips[side].rotation.x);
  }
  j.spine.rotation.set(p.spine * RAD, 0, 0);
  j.neck.rotation.set(p.neck * RAD, (jitter() - 0.5) * 0.3, 0);
  j.body.rotation.set(0, 0, p.roll * RAD);
  person.settle();
}

export default defineThing({
  questions: {
    suit: choice('What are they wearing?', Object.fromEntries(Object.entries(SUITS).map(([key, value]) => [key, value.note])) as Record<keyof typeof SUITS, string>),
    pose: choice('How are they sitting?', {
      hands: 'Hunched forward with both hands pressed over the face.',
      knees: 'Folded right down, forehead almost on the knees, arms wrapped round the head.',
      floor: 'Upright but sagging, forearms on the thighs, staring at the floor between the feet.',
      curled: 'Lying curled on their side, knees drawn up, hands at the face.',
    }),
    seat: choice('What are they sitting on?', {
      couch: 'A padded medical exam couch with restraint straps and a raised headrest, feet dangling.',
      bench: 'A plain slatted aluminium bench.',
      floor: 'The bare floor, knees hugged up.',
    }),
    blanket: choice('Is there a blanket over the shoulders?', {
      none: 'No blanket.',
      fleece: 'A grey fleece blanket draped over the shoulders.',
      foil: 'A crinkled silver emergency blanket wrapped round them.',
    }),
    tears: score('How much are they crying?', ['Dry-eyed, just folded up', 'A tear or two', 'A steady trickle of drops', 'A whole drifting cloud of tears']),
    hair: choice('What is their hair like?', {
      short: 'Short cropped hair.', long: 'Long hair falling over the face.', bun: 'Hair tied back in a bun.', none: 'A shaved head.', cap: 'A knitted cap pulled down.', hood: 'A hood pulled up over the head.',
    }),
    beside: choice('What is beside them?', {
      nothing: 'Nothing: just them and the seat.',
      tablet: 'A tablet face down on the seat, the message still open.',
      photo: 'A printed photograph dropped beside them.',
      tissues: 'A scatter of crumpled tissues on the seat and the floor.',
      headset: 'A radio headset pulled off and dropped, its coiled lead trailing.',
      cup: 'An untouched drink pouch with a straw.',
    }),
    style: choice('What kind of figure is it?', {
      person: 'A simplified clothed person with two dot eyes.',
      mannequin: 'A jointed wooden artist mannequin, faceless.',
      silhouette: 'A flat dark silhouette, like a cut-out against the light.',
      toy: 'A blocky toy figure with square limbs.',
    }),
    age: score('Who is it?', ['A small child', 'A teenager', 'An adult', 'A big tall adult']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const suit = SUITS[a.suit];
    const style: FigureStyle = ({ person: 'doll', mannequin: 'mannequin', silhouette: 'silhouette', toy: 'blocky' } as const)[a.style];
    const H = mix(1.05, 1.95, a.age);
    const skin = pick(['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b', '#5a3a28']);
    const person = figure(s, {
      height: H, style, skin, hair: a.hair, hairColor: pick(['#2a1e18', '#5a3a22', '#c8a060', '#8a8a86', '#1a1a1a']),
      top: suit.top, bottom: suit.bottom, shoes: suit.shoes, sleeves: a.suit === 'white' ? 'short' : 'long',
      pose: 'sitting', mirror: random() < 0.5, build: a.age > 0.8 ? 'heavy' : 'average',
    });
    s.root.add(person.root);
    const base = { ...POSES[a.pose] };
    if (a.seat === 'floor' && a.pose !== 'curled') Object.assign(base, HUG_LEGS, { armF: Math.max(base.armF, 80), spine: Math.max(base.spine, 24) });
    applyPose(person, base, random);
    person.root.updateMatrixWorld(true);

    // ---- a patch, tape or stripe on the suit (torso is in the spine group, roughly limb*1.35 deep) ----
    const limb = H * 0.036, torsoL = H * 0.28, shoulderW = H * 0.115;
    if (style !== 'silhouette') {
      const front = limb * 1.4;
      if (a.suit === 'orange' || a.suit === 'blue') {
        const patchMap = paint(64, 64, (g, w, h) => {
          g.fillStyle = a.suit === 'orange' ? '#1c2f6b' : '#b22222'; g.beginPath(); g.arc(w / 2, h / 2, 30, 0, 7); g.fill();
          g.strokeStyle = '#f2e9c8'; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, h / 2, 24, 0, 7); g.stroke();
          g.fillStyle = '#f2e9c8'; g.beginPath(); g.arc(w / 2, h / 2, 7, 0, 7); g.fill();
        });
        const patch = s.mesh(new THREE.CircleGeometry(0.045 * H, 16), new THREE.MeshStandardMaterial({ map: patchMap, roughness: 0.8 }), [0, 0, 0]);
        patch.position.set(shoulderW * 0.45, torsoL * 0.72, front);
        person.joints.spine.add(patch);
      }
      if (a.suit === 'white' || a.suit === 'olive') {
        const tape = s.label(pick(['HALE', 'OKAFOR', 'LINDQVIST', 'SATO', 'MBEKI', 'ROSSI', 'NAIR', 'KOVAC']), 0.09 * H, 0.022 * H, [0, 0, 0], a.suit === 'white' ? '#1d1d1f' : '#3a3222', a.suit === 'white' ? '#f4f1e6' : '#b8a888');
        tape.position.set(-shoulderW * 0.45, torsoL * 0.74, front);
        person.joints.spine.add(tape);
      }
      if (a.suit === 'teal') {
        for (const side of [-1, 1]) {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(limb * 1.2, limb * 0.5, limb * 2.1), s.material('#f0c419', { roughness: 0.7 }));
          stripe.position.set(side * shoulderW * 0.95, torsoL - limb * 0.3, 0);
          person.joints.spine.add(stripe);
        }
      }
    }

    // ---- blanket over the shoulders: an open-fronted shell around the torso ----
    if (a.blanket !== 'none') {
      const cloth = a.blanket === 'foil'
        ? new THREE.MeshStandardMaterial({ color: '#d9d9d2', metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide, flatShading: true })
        : new THREE.MeshStandardMaterial({ color: '#7f8488', roughness: 1, side: THREE.DoubleSide });
      const rx = shoulderW * 1.45, rz = limb * 2.4;
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.08, torsoL * 1.05, 18, 3, true, Math.PI * 0.32, Math.PI * 1.36), cloth);
      shell.scale.set(rx, 1, rz);
      shell.position.y = torsoL * 0.48;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 8, Math.PI * 0.82, Math.PI * 1.36, 0, Math.PI * 0.5), cloth);
      cap.scale.set(rx, limb * 2.2, rz);
      cap.position.y = torsoL * 1.0;
      shell.castShadow = cap.castShadow = true;
      if (a.blanket === 'foil') {
        const wrinkle = shell.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < wrinkle.count; i++) wrinkle.setXYZ(i, wrinkle.getX(i) * (1 + (random() - 0.5) * 0.08), wrinkle.getY(i), wrinkle.getZ(i) * (1 + (random() - 0.5) * 0.08));
        shell.geometry.computeVertexNormals();
      }
      person.joints.spine.add(shell, cap);
    }

    // ---- the seat ----
    person.root.updateMatrixWorld(true);
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    const thighL = H * 0.24;
    const curled = a.pose === 'curled';
    const seatTop = a.seat === 'couch' ? mix(0.6, 0.72, random()) : a.seat === 'bench' ? Math.max(0.3, person.hipHeight - 0.03) : 0;
    const frontZ = curled ? hips.z + 0.2 * H : hips.z + thighL * 0.8;
    if (a.seat === 'couch') {
      const L = 1.95, W = 0.74;
      const cx = curled ? 0 : hips.x - 0.3, cz = frontZ - W / 2;
      const frame = s.material('#a9aeb4', { metalness: 0.6, roughness: 0.4 });
      const pad = s.material(pick(['#3d6a8a', '#4b5f6e', '#6a8a7a', '#8a5a5e']), { roughness: 0.55 });
      s.box([L * 0.5, seatTop - 0.18, W * 0.6], [cx, (seatTop - 0.18) / 2, cz], s.material('#dfe2e0', { roughness: 0.8 }));
      s.box([L, 0.05, W], [cx, seatTop - 0.155, cz], frame);
      for (let i = 0; i < 3; i++) s.box([L / 3 - 0.02, 0.13, W], [cx - L / 3 + i * (L / 3), seatTop - 0.065, cz], pad);
      const headrest = s.box([0.42, 0.11, W - 0.1], [cx - L / 2 + 0.24, seatTop + 0.045, cz], pad);
      headrest.rotation.z = -0.22;
      for (const x of [-L / 2 + 0.12, L / 2 - 0.12]) s.box([0.05, 0.03, W + 0.08], [cx + x, seatTop - 0.14, cz], frame);
      // Restraint straps across the pad, with a buckle, wherever nobody is sitting.
      const webbing = s.material('#3a3d44', { roughness: 0.9 });
      const buckle = s.material('#c9ccd0', { metalness: 0.7, roughness: 0.3 });
      const strapsAt = curled ? [L / 2 - 0.25] : [-L / 2 + 0.55, -L / 2 + 0.2 + L * 0.5, L / 2 - 0.2].filter((x) => Math.abs(cx + x - hips.x) > 0.26 * H);
      for (const x of strapsAt) {
        s.box([0.05, 0.01, W + 0.02], [cx + x, seatTop + 0.006, cz], webbing);
        s.box([0.06, 0.02, 0.07], [cx + x, seatTop + 0.012, cz + (random() - 0.5) * 0.3], buckle);
      }
      if (curled) {
        // One strap lies loosely over the hip of the curled figure.
        const over = s.box([0.05, 0.01, W + 0.02], [hips.x + 0.05 * H, seatTop + 0.17 * H, cz], webbing);
        over.rotation.x = 0.1;
      }
      s.box([0.5, 0.1, 0.12], [cx + 0.3, 0.05, cz + W / 2 + 0.03], frame); // foot rail
    }
    if (a.seat === 'bench') {
      const L = curled ? 1.9 : 1.5, W = 0.42, cx = curled ? 0 : hips.x - 0.2, cz = frontZ - W / 2;
      const alu = s.material('#b4b8bc', { metalness: 0.5, roughness: 0.45 });
      for (let i = 0; i < 4; i++) s.box([L, 0.03, W / 4 - 0.02], [cx, seatTop - 0.015, cz - W / 2 + W / 8 + i * (W / 4)], alu);
      for (const x of [-L / 2 + 0.2, L / 2 - 0.2]) {
        s.box([0.05, seatTop - 0.03, W - 0.04], [cx + x, (seatTop - 0.03) / 2, cz], alu);
        s.box([0.3, 0.03, W], [cx + x, 0.015, cz], alu);
      }
    }
    person.root.position.y = curled && a.seat !== 'floor' ? seatTop : a.seat === 'floor' ? 0 : seatTop - person.hipHeight + 0.03 * H;
    person.root.updateMatrixWorld(true);

    // ---- what is beside them ----
    const sideX = hips.x + (random() < 0.5 ? -1 : 1) * (curled ? 0.45 * H : 0.3 * H);
    const restY = a.seat === 'floor' ? 0 : seatTop;
    const restZ = a.seat === 'floor' ? hips.z + 0.1 : frontZ - 0.2;
    if (a.beside === 'tablet') {
      s.box([0.17, 0.012, 0.24], [sideX, restY + 0.006, restZ], s.material('#1d1f24', { roughness: 0.4 })).rotation.y = (random() - 0.5) * 0.8;
    }
    if (a.beside === 'photo') {
      const photoMap = paint(96, 72, (g, w, h) => {
        g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h);
        g.fillStyle = pick(['#7fb2d8', '#c8c0a0', '#8ab07a']); g.fillRect(6, 6, w - 12, h - 12);
        g.fillStyle = '#d9b08c'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(24 + i * 22, 30, 8, 0, 7); g.fill(); g.fillStyle = pick(['#d9573f', '#2f4f8a', '#e2d6a8']); g.fillRect(17 + i * 22, 38, 14, 20); g.fillStyle = '#d9b08c'; }
      });
      const photo = s.mesh(new THREE.PlaneGeometry(0.15, 0.11), new THREE.MeshStandardMaterial({ map: photoMap, roughness: 0.85, side: THREE.DoubleSide }), [sideX, restY + 0.004, restZ]);
      photo.rotation.set(-Math.PI / 2 + 0.05, 0, (random() - 0.5) * 1.2);
    }
    if (a.beside === 'tissues') {
      const tissue = s.material('#f6f4ee', { roughness: 1 });
      const count = 4 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const onFloor = a.seat !== 'floor' && random() < 0.5;
        const at: P = onFloor ? [hips.x + (random() - 0.5) * 0.9, 0.03, frontZ + 0.1 + random() * 0.3] : [sideX + (random() - 0.5) * 0.25, restY + 0.03, restZ + (random() - 0.5) * 0.25];
        const ball = s.mesh(new THREE.IcosahedronGeometry(0.035, 0), tissue, at);
        ball.scale.set(1, 0.7, 1.1); ball.rotation.set(random() * 3, random() * 3, 0);
      }
    }
    if (a.beside === 'headset') {
      const dark = s.material('#2a2d33', { roughness: 0.6 });
      const band = s.ring(0.085, 0.009, [sideX, restY + 0.01, restZ], dark);
      band.rotation.x = Math.PI / 2;
      s.cylinder(0.03, 0.03, 0.025, [sideX + 0.085, restY + 0.02, restZ], dark, 14).rotation.z = Math.PI / 2;
      s.rod([sideX + 0.1, restY + 0.02, restZ], [sideX + 0.16, restY + 0.01, restZ + 0.08], 0.005, dark);
      const lead: P[] = [[sideX + 0.1, restY + 0.01, restZ + 0.03]];
      for (let i = 1; i < 7; i++) lead.push([sideX + 0.1 + i * 0.06, restY + 0.012 + (i % 2) * 0.012, restZ + 0.03 + Math.sin(i) * 0.04]);
      s.tube(lead, 0.004, dark);
    }
    if (a.beside === 'cup') {
      const pouch = s.box([0.08, 0.13, 0.035], [sideX, restY + 0.065, restZ], s.material(pick(['#c0392b', '#e8a317', '#8e44ad', '#2e8a4a']), { roughness: 0.6 }));
      pouch.rotation.y = (random() - 0.5) * 0.6;
      s.rod([sideX + 0.02, restY + 0.12, restZ], [sideX + 0.05, restY + 0.2, restZ + 0.02], 0.004, s.material('#f4f1e6'));
    }

    // ---- tears: small drops drifting from the face ----
    const head = person.head.getWorldPosition(new THREE.Vector3());
    const tearCount = Math.round(a.tears * 9);
    const tearMat = new THREE.MeshStandardMaterial({ color: '#a9cdea', emissive: '#6fa4d8', emissiveIntensity: 0.35, roughness: 0.05, transparent: true, opacity: 0.85, depthWrite: false });
    const drops: { mesh: THREE.Mesh; home: THREE.Vector3; phase: number; drift: THREE.Vector3 }[] = [];
    const headR = H * 0.064;
    for (let i = 0; i < tearCount; i++) {
      const spread = i / Math.max(1, tearCount - 1);
      const home = new THREE.Vector3(
        head.x + (random() - 0.5) * headR * 1.4 + (curled ? 0 : 0),
        head.y - headR * 0.6 - spread * headR * 2.2 - random() * headR * 1.5,
        head.z + headR * 0.9 + random() * headR * 1.6 + spread * headR,
      );
      const drop = s.mesh(new THREE.SphereGeometry(headR * mix(0.08, 0.16, random()), 10, 8), tearMat, home.toArray() as P);
      drop.scale.y = 1.3;
      drop.castShadow = false;
      drops.push({ mesh: drop, home, phase: random() * Math.PI * 2, drift: new THREE.Vector3((random() - 0.5) * 0.02, -0.01 - random() * 0.02, 0.01 + random() * 0.02) });
    }

    // ---- sobbing: the shoulders hitch and the torso jerks on a slow irregular rhythm ----
    const shoulderRest = { left: person.joints.shoulders.left.position.y, right: person.joints.shoulders.right.position.y };
    const spineRest = person.joints.spine.rotation.x;
    const energy = mood.energy;
    const sobRate = mix(0.9, 2.2, energy);
    return s.finish({
      update(_dt, time) {
        const pulse = Math.pow(Math.max(0, Math.sin(time * sobRate)), 7) * (0.4 + energy) + Math.pow(Math.max(0, Math.sin(time * sobRate * 1.9 + 1.3)), 11) * 0.3;
        person.joints.shoulders.left.position.y = shoulderRest.left + pulse * 0.022 * H;
        person.joints.shoulders.right.position.y = shoulderRest.right + pulse * 0.02 * H;
        person.joints.spine.rotation.x = spineRest + pulse * 0.06;
        person.update(_dt, time);
        for (const drop of drops) {
          const t = (time * 0.3 + drop.phase) % 4;
          drop.mesh.position.copy(drop.home).addScaledVector(drop.drift, t * mix(0.5, 2, energy));
          drop.mesh.position.x += Math.sin(time * 0.8 + drop.phase) * 0.004;
        }
      },
    });
  },
});
