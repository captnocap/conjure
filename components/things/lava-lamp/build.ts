import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const PAIRS = {
  'red-violet': 'Red wax in violet liquid, the classic dorm-room pair.',
  'orange-yellow': 'Orange wax in yellow liquid, like a slow sunrise.',
  'green-blue': 'Acid green wax in deep blue liquid, alien and aquatic.',
  'pink-clear': 'Bubblegum pink wax in clear water, sweet and girlish.',
  'white-blue': 'Milky white wax in pale blue, calm as a cloud.',
  'yellow-magenta': 'Yellow wax in hot magenta, loud and psychedelic.',
  'blue-clear': 'Electric blue wax in clear liquid, cold and clean.',
  'black-red': 'Black wax in blood red liquid, moody and gothic.',
} as const;
const PAIR: Record<keyof typeof PAIRS, [wax: string, liquid: string]> = {
  'red-violet': ['#ff3b2f', '#6a3fd0'],
  'orange-yellow': ['#ff7a1c', '#f4d53a'],
  'green-blue': ['#8dff3a', '#1c56d8'],
  'pink-clear': ['#ff5fae', '#e8eef2'],
  'white-blue': ['#f5f1e4', '#5fb0e8'],
  'yellow-magenta': ['#ffe23a', '#e0329a'],
  'blue-clear': ['#2f7cff', '#e6f0f4'],
  'black-red': ['#1c1418', '#d8202c'],
};

// The bottle's inner radius by height, for a lamp 0.44 m tall.
const BOTTLE: readonly (readonly [number, number])[] = [
  [0.052, 0.125], [0.066, 0.15], [0.07, 0.19], [0.064, 0.25], [0.05, 0.32], [0.036, 0.375], [0.03, 0.395],
];
const bottleRadius = (y: number) => {
  for (let i = 1; i < BOTTLE.length; i++)
    if (y <= BOTTLE[i][1]) {
      const [r0, y0] = BOTTLE[i - 1], [r1, y1] = BOTTLE[i];
      return mix(r0, r1, clamp01((y - y0) / (y1 - y0)));
    }
  return BOTTLE[BOTTLE.length - 1][0];
};

export default defineThing({
  questions: {
    colours: choice('What colour are the wax and the liquid?', PAIRS),
    state: choice('What is the lamp doing right now?', {
      flowing: 'Fully warmed up: fat blobs rise, stretch, split and sink in a slow loop.',
      waking: 'Switched on an hour ago: a lumpy stalagmite of wax is just starting to reach upward.',
      cold: 'Switched off and cold: the wax sits in a hard dull lump at the bottom, nothing glows.',
      overheated: 'Left on for days: one great blob is stuck at the top and the rest has broken into tiny beads.',
    }),
    shape: choice('What shape is the lamp?', {
      rocket: 'The classic rocket: a flared hourglass base and a pointed cap.',
      finned: 'A real toy rocket, standing on three swept tail fins with a sharp nose cone.',
      squat: 'Short and fat, more like a glowing gourd than a rocket.',
      slender: 'Tall and thin as a candle flame.',
    }),
    metal: choice('What is the base and cap made of?', {
      silver: 'Spun aluminium, bright and space-age.',
      gold: 'Brassy gold, a seventies hand-me-down.',
      black: 'Matte black, a goth or gamer bedroom.',
      copper: 'Warm copper going brown at the edges.',
      starlight: 'Dark metal pierced with tiny star holes that leak light.',
    }),
    size: score('How big is it?', ['A small nightstand lamp', 'The usual forty centimetres', 'A waist-high floor-standing showpiece']),
    wax: score('If it is flowing, how is the wax divided?', ['Two or three great slow blobs', 'A handful of mixed blobs', 'A crowd of small beads']),
    beside: choice('What is left beside it?', {
      nothing: 'Nothing, the lamp stands alone.',
      cord: 'Its power cord trails off with a chunky inline rocker switch.',
      incense: 'A wooden incense holder with a burnt-down stick and a line of ash.',
      discs: 'A slipping stack of CDs in their cases.',
      bulb: 'A spare appliance bulb, the last one having blown.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [waxColour, liquidColour] = PAIR[a.colours];
    const lit = a.state !== 'cold';
    const glow = lit ? mix(0.55, 1.15, mood.cheer) : 0;
    const wide = { rocket: 1, finned: 0.95, squat: 1.35, slender: 0.78 }[a.shape];
    const tall = { rocket: 1, finned: 1.08, squat: 0.74, slender: 1.3 }[a.shape];

    const metalColour = { silver: '#c9cfd2', gold: '#c9a046', black: '#26272b', copper: '#b8693c', starlight: '#2c3350' }[a.metal];
    const metal = s.material(metalColour, { metalness: a.metal === 'black' ? 0.3 : 0.85, roughness: mix(0.25, 0.6, mood.wear) + (a.metal === 'black' ? 0.3 : 0), side: THREE.DoubleSide });
    const wax = new THREE.MeshStandardMaterial({
      color: new THREE.Color(waxColour).multiplyScalar(lit ? 1 : 0.6), roughness: lit ? 0.3 : 0.85,
      emissive: waxColour, emissiveIntensity: glow * (a.colours === 'black-red' ? 0 : 0.75),
    });
    const liquid = new THREE.MeshStandardMaterial({
      color: liquidColour, transparent: true, opacity: lit ? 0.42 : 0.3 + mood.wear * 0.25, roughness: 0.15,
      emissive: liquidColour, emissiveIntensity: glow * 0.5, depthWrite: false, side: THREE.DoubleSide,
    });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, roughness: 0.04, depthWrite: false });

    const lamp = new THREE.Group();
    s.root.add(lamp);
    const add = <T extends THREE.Object3D>(node: T) => { node.traverse((n) => { n.castShadow = true; }); lamp.add(node); return node; };
    const lathe = (profile: readonly (readonly [number, number])[], material: THREE.Material, segments = 36) =>
      add(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments), material));

    // Base: a flared foot pinching to a waist, then opening into the cup that holds the bottle.
    const footY = a.shape === 'finned' ? 0.045 : 0;
    lathe([[0.001, footY], [0.082, footY], [0.084, footY + 0.008], [0.06, 0.055], [0.044, 0.085], [0.05, 0.105], [0.072, 0.14], [0.075, 0.15], [0.07, 0.15], [0.052, 0.125], [0.001, 0.125]], metal);
    if (a.shape === 'finned') {
      const fin = new THREE.Shape();
      fin.moveTo(0.045, 0.15); fin.quadraticCurveTo(0.1, 0.12, 0.135, 0.0); fin.lineTo(0.1, 0.0); fin.quadraticCurveTo(0.085, 0.05, 0.045, 0.06); fin.closePath();
      const geometry = new THREE.ExtrudeGeometry(fin, { depth: 0.014, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1 });
      geometry.translate(0, 0, -0.007);
      for (let i = 0; i < 3; i++) {
        const mesh = add(new THREE.Mesh(i === 0 ? geometry : geometry.clone(), metal));
        mesh.rotation.y = (i / 3) * Math.PI * 2 + 0.5;
      }
    }
    if (a.metal === 'starlight') {
      const stars = [];
      for (let i = 0; i < 46; i++) {
        const y = mix(0.012, 0.135, random()), angle = random() * Math.PI * 2;
        const r = (y < 0.085 ? mix(0.084, 0.044, y / 0.085) : mix(0.044, 0.073, (y - 0.085) / 0.055)) + 0.0015;
        stars.push({ at: [Math.cos(angle) * r, y + footY * (1 - y / 0.14), Math.sin(angle) * r] as const, size: mix(0.0018, 0.004, random()) });
      }
      const dots = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff3c0', emissive: lit ? '#ffe9a0' : '#3a3a40', emissiveIntensity: lit ? 1.4 : 0.2 }), stars);
      dots.castShadow = false;
      lamp.add(dots);
    }
    // Cap: a rocket nose that sits over the bottle's neck.
    const nose = a.shape === 'finned' ? 0.085 : a.shape === 'squat' ? 0.035 : 0.055;
    lathe([[0.037, 0.37], [0.038, 0.378], [0.034, 0.395], [0.024, 0.395 + nose * 0.55], [0.01, 0.395 + nose * 0.92], [0.001, 0.395 + nose]], metal);
    lathe([[0.039, 0.368], [0.041, 0.372], [0.039, 0.376]], metal, 24);

    // Bottle: liquid body inside a clear shell.
    lathe([[0.001, 0.127], ...BOTTLE, [0.001, 0.396]], liquid);
    lathe(BOTTLE.map(([r, y]) => [r + 0.004, y] as const), glass);
    // A bright rim where the bulb shines up through the bottom of the bottle.
    if (lit) add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.004, 28), new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff0c0', emissiveIntensity: 1.1 }))).position.y = 0.148;

    // Wax. Blobs are plain spheres, reshaped every frame to stay inside the glass.
    const sphere = new THREE.SphereGeometry(1, 20, 14);
    type Blob = { mesh: THREE.Mesh; r: number; low: number; high: number; phase: number; rate: number; angle: number; off: number; still: boolean };
    const blobs: Blob[] = [];
    const blob = (r: number, low: number, high: number, still = false) => {
      const mesh = add(new THREE.Mesh(sphere, wax));
      blobs.push({ mesh, r, low, high, phase: random(), rate: mix(0.7, 1.3, random()), angle: random() * Math.PI * 2, off: random(), still });
    };
    const bed = (height: number, lumps: number) => {
      const mesh = add(new THREE.Mesh(sphere, wax));
      mesh.scale.set(0.062, height, 0.062);
      mesh.position.y = 0.152;
      for (let i = 0; i < lumps; i++) {
        const lump = add(new THREE.Mesh(sphere, wax));
        const angle = random() * Math.PI * 2, reach = random() * 0.03, size = mix(0.014, 0.026, random());
        lump.scale.set(size, size * mix(0.7, 1.2, random()), size);
        lump.position.set(Math.cos(angle) * reach, 0.152 + height * mix(0.55, 0.95, random()), Math.sin(angle) * reach);
      }
    };
    if (a.state === 'cold') {
      bed(0.05, 5 + Math.floor(random() * 4));
      // A few beads that froze where they fell.
      for (let i = 0; i < 2 + Math.floor(random() * 3); i++) blob(mix(0.008, 0.014, random()), 0.2, 0.2 + random() * 0.012, true);
    } else if (a.state === 'waking') {
      bed(0.04, 3);
      // The stalagmite: stacked lumps leaning as they climb.
      const top = mix(0.25, 0.33, random()), lean = (random() - 0.5) * 0.03, turn = random() * 6.28;
      for (let i = 0; i < 7; i++) {
        const t = i / 6, y = mix(0.17, top, t);
        const piece = add(new THREE.Mesh(sphere, wax));
        const r = mix(0.034, 0.014, t) * mix(0.85, 1.2, random()) * (i === 6 ? 1.5 : 1);
        piece.scale.set(r, r * 1.5, r);
        piece.position.set(Math.cos(turn) * lean * t * t * 3, y, Math.sin(turn) * lean * t * t * 3);
      }
      blob(0.012, 0.3, 0.38);
      blob(0.009, 0.26, 0.37);
    } else if (a.state === 'overheated') {
      bed(0.012, 0);
      const cap = add(new THREE.Mesh(sphere, wax));
      cap.scale.set(0.04, 0.05, 0.04);
      cap.position.y = 0.345;
      for (let i = 0; i < 26; i++) blob(mix(0.005, 0.011, random()), 0.17, 0.3);
    } else {
      bed(0.022, 2);
      const count = Math.round(mix(3, 13, a.wax) + mood.density * 2);
      for (let i = 0; i < count; i++) blob(mix(0.036, 0.013, a.wax) * mix(0.7, 1.25, random()), 0.175, 0.365);
    }

    const pose = (time: number) => {
      for (const b of blobs) {
        const t = b.still ? b.phase : b.phase + time * b.rate;
        const wave = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
        const speed = b.still ? 0 : Math.abs(Math.sin(t * Math.PI * 2));
        const y = mix(b.low, b.high, b.still ? b.phase : wave);
        const room = bottleRadius(y) * 0.9;
        const r = Math.min(b.r, room);
        const squeeze = b.r / r;
        const reach = Math.max(0, room - r) * b.off;
        b.mesh.position.set(Math.cos(b.angle + t * 0.6) * reach, y, Math.sin(b.angle + t * 0.6) * reach);
        b.mesh.scale.set(r, r * squeeze * squeeze * (1 + speed * 0.35), r);
      }
    };
    pose(0);

    lamp.scale.set(wide, tall, wide);
    const size = mix(0.62, 2.6, a.size * a.size);
    s.root.scale.setScalar(size);

    // What keeps it company, at lamp scale.
    const plastic = s.material('#e8e2d2', { roughness: 0.5 });
    if (a.beside === 'cord') {
      const turn = random() * 0.8 + 0.4;
      const points: [number, number, number][] = [[0, 0.02, -0.07 * wide]];
      for (let i = 1; i <= 7; i++) points.push([Math.sin(i * turn) * 0.05 + i * 0.03, 0.004, -0.08 * wide - 0.02 + Math.cos(i * turn * 1.3) * 0.045 + i * 0.012]);
      s.tube(points, 0.0028, s.material('#2a2a2c'));
      const [x, , z] = points[4];
      const rocker = s.box([0.05, 0.014, 0.022], [x, 0.007, z], plastic);
      rocker.rotation.y = random() * 3;
      s.box([0.014, 0.006, 0.012], [x, 0.016, z], s.material(lit ? '#d8402c' : '#5a2a26', { emissive: lit ? '#ff4020' : '#000000', emissiveIntensity: 0.6 })).rotation.y = rocker.rotation.y;
    } else if (a.beside === 'incense') {
      const wood = s.material('#8a5a34');
      const holder = s.box([0.24, 0.008, 0.035], [0.02, 0.004, 0.13 * wide], wood);
      holder.rotation.y = (random() - 0.5) * 0.7;
      s.rod([0.1, 0.008, 0.13 * wide], [0.0, 0.07, 0.13 * wide], 0.0012, s.material('#4a3526'));
      s.ball([0.004, 0.004, 0.004], [0.0, 0.07, 0.13 * wide], s.material('#ff7030', { emissive: '#ff5010', emissiveIntensity: lit ? 1.2 : 0 }), 8);
      for (let i = 0; i < 9; i++) s.ball([0.006, 0.002, 0.005], [-0.06 + i * 0.012 + random() * 0.006, 0.009, 0.13 * wide + (random() - 0.5) * 0.01], s.material('#b9b6ae'), 6);
    } else if (a.beside === 'discs') {
      const count = 4 + Math.floor(random() * 5 + mood.density * 4);
      const tints = ['#d83a4a', '#2c6fd0', '#e8c63a', '#1e1e22', '#3aa870', '#e8e4da', '#8a3ac0'];
      for (let i = 0; i < count; i++) {
        const cd = s.box([0.142, 0.01, 0.125], [0.15 * wide + 0.03 + (random() - 0.5) * 0.02, 0.005 + i * 0.0102, 0.02 + (random() - 0.5) * 0.02], s.material(tints[Math.floor(random() * tints.length)], { roughness: 0.25 }));
        cd.rotation.y = (random() - 0.5) * 0.5;
      }
    } else if (a.beside === 'bulb') {
      const bulb = new THREE.Group();
      const glassBulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshStandardMaterial({ color: '#d9d6cc', roughness: 0.2 }));
      glassBulb.scale.set(1, 1.25, 1);
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.024, 12), s.material('#b89a50', { metalness: 0.8, roughness: 0.4 }));
      screw.position.y = -0.034;
      bulb.add(glassBulb, screw);
      bulb.traverse((n) => { n.castShadow = true; });
      bulb.rotation.z = Math.PI / 2;
      bulb.rotation.y = random() * 3;
      bulb.position.set(0.13 * wide, 0.022, 0.07);
      s.root.add(bulb);
    }

    const speed = mix(0.012, 0.06, mood.energy);
    return s.finish({ footprint: 0.1 * wide * size, update: lit ? (_dt, time) => pose(time * speed) : undefined });
  },
});
