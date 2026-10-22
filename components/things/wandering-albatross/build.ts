import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { afloat, ringBand, seaColour, waterPatch } from './sea';

const PLUMAGE = {
  snowy: 'An old bird, almost pure white, only the wingtips and trailing edges black.',
  adult: 'White body with black upper wings and a white wedge near the shoulders.',
  juvenile: 'A young bird: chocolate brown all over with a clean white face.',
  sooty: 'Smoke-dark all over with a pale crescent by the eye, slender and ghostly.',
} as const;

export default defineThing({
  questions: {
    pose: choice('What is it doing?', {
      gliding: 'Gliding on locked wings just above a wave, not a feather moving.',
      resting: 'Sitting on the water with its long wings folded, riding the swell.',
      takeoff: 'Pattering across the surface to take off, wings lifted, feet slapping.',
      feeding: 'Settled on the water with wings half raised, bill stabbing down at something.',
    }),
    bank: score('If it is gliding, how are the wings angled?', ['Dead level', 'Tilted in a lazy turn', 'Banked steeply, one wingtip slicing the wave']),
    bill: choice('What is it carrying in its bill?', {
      nothing: 'Nothing.',
      squid: 'A pink squid, tentacles dangling.',
      fish: 'A silver fish held crosswise.',
      plastic: 'A bright strand of plastic line with a bottle cap on it.',
      ring: 'Something small and gold that glints: a ring.',
      grass: 'A beakful of tussock grass for a nest thousands of miles away.',
    }),
    plumage: choice('What plumage does it wear?', PLUMAGE),
    tagged: noul('Does it carry a researcher’s satellite tag, a little box and antenna on its back?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const b = new Sculpture(context);
    s.root.add(b.root);
    const { mood, random } = context;
    const white = new THREE.Color('#f4f2ea'), black = new THREE.Color('#22252a'), brown = new THREE.Color('#4d3b30'), soot = new THREE.Color('#5a5552');
    const bodyTint = a.plumage === 'juvenile' ? brown : a.plumage === 'sooty' ? soot : white;
    const body = new THREE.MeshStandardMaterial({ color: bodyTint, roughness: 0.75 });
    const headM = new THREE.MeshStandardMaterial({ color: a.plumage === 'sooty' ? soot.clone().multiplyScalar(0.8) : white, roughness: 0.75 });
    const darkM = new THREE.MeshStandardMaterial({ color: a.plumage === 'juvenile' ? brown : a.plumage === 'sooty' ? soot.clone().multiplyScalar(0.8) : black, roughness: 0.8 });
    const billM = new THREE.MeshStandardMaterial({ color: a.plumage === 'sooty' ? '#2a2a2c' : '#f0b9a6', roughness: 0.5 });
    const flying = a.pose === 'gliding' || a.pose === 'takeoff';

    // Body: a lathe laid along z, tail at −z.
    const hull = new THREE.LatheGeometry([[0, -0.6], [0.05, -0.5], [0.11, -0.3], [0.17, -0.05], [0.18, 0.15], [0.15, 0.3], [0.1, 0.4], [0, 0.46]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    hull.rotateX(Math.PI / 2);
    b.mesh(hull, body).scale.y = 0.9;
    const tail = b.mesh(new THREE.ConeGeometry(0.11, 0.26, 8), a.plumage === 'snowy' ? darkM : a.plumage === 'adult' ? darkM : body, [0, 0.01, -0.62]);
    tail.rotation.x = -Math.PI / 2;
    tail.scale.z = 0.25;

    // Neck, head and the long hooked bill.
    const head: [number, number, number] = a.pose === 'resting' ? [0, 0.34, 0.42] : a.pose === 'feeding' ? [0, 0.1, 0.62] : a.pose === 'takeoff' ? [0, 0.12, 0.66] : [0, 0.03, 0.64];
    b.rod([0, 0.02, 0.3], head, 0.1, a.plumage === 'juvenile' ? body : headM, 0.075);
    b.ball([0.085, 0.085, 0.095], head, headM, 16);
    const pitch = a.pose === 'feeding' ? 1.0 : a.pose === 'resting' ? 0.12 : 0.2;
    const beak = new Sculpture(context);
    beak.root.position.set(head[0], head[1] - 0.005, head[2] + 0.05);
    beak.root.rotation.x = pitch;
    b.root.add(beak.root);
    beak.rod([0, 0, 0], [0, -0.005, 0.2], 0.036, billM, 0.024);
    beak.ball([0.024, 0.03, 0.03], [0, -0.022, 0.205], billM, 10);
    for (const side of [-1, 1]) {
      b.ball([0.014, 0.014, 0.014], [side * 0.068, head[1] + 0.02, head[2] + 0.045], new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.2 }), 8);
      if (a.plumage === 'sooty') b.ball([0.008, 0.02, 0.022], [side * 0.074, head[1] + 0.022, head[2] + 0.02], new THREE.MeshStandardMaterial({ color: '#f1efe6' }), 8);
    }

    // Wings: narrow cambered ribbons, painted by span and chord.
    const span = 1.55;
    const wingColour = (t: number, c: number, out: THREE.Color) => {
      if (a.plumage === 'juvenile') return out.copy(brown).offsetHSL(0, 0, -t * 0.04);
      if (a.plumage === 'sooty') return out.copy(soot).multiplyScalar(mix(0.95, 0.7, t));
      if (a.plumage === 'snowy') return out.copy(t > 0.74 || c > 0.8 ? black : white);
      return out.copy(t < 0.42 && c < 0.75 * (1 - t / 0.42) ? white : black);
    };
    const lift = a.pose === 'takeoff' ? 0.75 : a.pose === 'feeding' ? 0.55 : 0;
    const wingGeometry = (side: number) => {
      const N = 22, C = 5;
      const positions: number[] = [], colours: number[] = [], index: number[] = [];
      const tint = new THREE.Color();
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const chord = 0.36 * Math.max(0.02, 1 - t ** 2.6) ** 0.6;
        const lead = 0.17 + 0.07 * Math.sin(t * Math.PI * 0.85) - 0.3 * t * t;
        // Locked wings bow slightly down at the tips; lifted wings kink up at the wrist.
        const y = lift ? Math.sin(Math.min(t, 0.55) / 0.55 * Math.PI / 2) * lift * 0.55 + Math.max(0, t - 0.55) * lift * 0.5 : 0.07 * Math.sin(t * Math.PI) - 0.13 * t * t;
        const reach = lift ? t * span * mix(1, 0.78, lift) : t * span;
        for (let k = 0; k < C; k++) {
          const c = k / (C - 1);
          positions.push(side * reach, y + 0.028 * Math.sin(c * Math.PI) * (1 - t * 0.6), lead - c * chord);
          wingColour(t, c, tint);
          colours.push(tint.r, tint.g, tint.b);
          if (i < N && k < C - 1) {
            const p = i * C + k, q = p + C;
            side > 0 ? index.push(p, q, p + 1, p + 1, q, q + 1) : index.push(p, p + 1, q, p + 1, q + 1, q);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return geometry;
    };
    const wingMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
    const pivots: THREE.Group[] = [];
    if (a.pose === 'resting') {
      // Folded: long dark blades crossed over the tail.
      for (const side of [-1, 1]) {
        const folded = b.ball([0.055, 0.12, 0.5], [side * 0.15, 0.07, -0.16], a.plumage === 'snowy' ? body : darkM, 14);
        folded.rotation.set(0.08, side * 0.12, side * 0.25);
        const tip = b.ball([0.03, 0.05, 0.2], [side * 0.07, 0.07, -0.58], darkM, 10);
        tip.rotation.y = -side * 0.22;
      }
    } else for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.13, 0.07, 0.1);
      const wing = new THREE.Mesh(wingGeometry(side), wingMaterial);
      wing.castShadow = wing.receiveShadow = true;
      pivot.add(wing);
      b.root.add(pivot);
      pivots.push(pivot);
    }

    // Feet.
    const pink = new THREE.MeshStandardMaterial({ color: '#e9b7ae', roughness: 0.6 });
    if (a.pose === 'takeoff') for (const side of [-1, 1]) {
      b.rod([side * 0.07, -0.08, -0.15], [side * 0.09, -0.3, -0.42 - side * 0.12], 0.018, pink);
      b.ball([0.07, 0.012, 0.1], [side * 0.09, -0.31, -0.5 - side * 0.12], pink, 8).rotation.x = -0.5;
    }
    if (a.tagged) {
      b.box([0.05, 0.025, 0.09], [0, 0.175, 0.05], b.material('#2e3133'));
      b.rod([0, 0.18, 0.02], [0, 0.36, -0.2], 0.004, b.material('#1c1d1f'));
    }

    // What the bill holds.
    const tipAt: [number, number, number] = [0, -0.035, 0.16];
    if (a.bill === 'squid') {
      const flesh = new THREE.MeshStandardMaterial({ color: '#e58fa0', roughness: 0.4 });
      const mantle = beak.mesh(new THREE.ConeGeometry(0.035, 0.16, 10), flesh, [0.08, -0.05, 0.16]);
      mantle.rotation.z = -1.2;
      for (let i = 0; i < 5; i++) beak.tube([[-0.01, -0.04, 0.16], [-0.05 - i * 0.012, -0.1, 0.16 + (i - 2) * 0.015], [-0.06 - i * 0.02, -0.2 - random() * 0.06, 0.16 + (i - 2) * 0.03]], 0.006, flesh);
    } else if (a.bill === 'fish') {
      const scale = new THREE.MeshStandardMaterial({ color: '#c9d3d8', metalness: 0.7, roughness: 0.3 });
      beak.ball([0.13, 0.035, 0.018], [0, -0.03, 0.15], scale, 12);
      beak.mesh(new THREE.ConeGeometry(0.04, 0.06, 4), scale, [-0.15, -0.03, 0.15]).rotation.z = -Math.PI / 2;
    } else if (a.bill === 'plastic') {
      const line = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#2f8fe0' : '#e0432f', roughness: 0.4 });
      beak.tube([tipAt, [0.04, -0.14, 0.14], [-0.03, -0.26, 0.17], [0.05, -0.38, 0.13], [0.0, -0.5, 0.16]], 0.007, line);
      beak.cylinder(0.03, 0.03, 0.018, [0.0, -0.5, 0.16], new THREE.MeshStandardMaterial({ color: '#f2c21a' }), 12).rotation.x = 1.1;
    } else if (a.bill === 'ring') {
      const ring = beak.ring(0.028, 0.007, [0, -0.06, 0.17], new THREE.MeshStandardMaterial({ color: '#f1c44a', metalness: 1, roughness: 0.15, emissive: '#b8860b', emissiveIntensity: 0.6 }));
      ring.rotation.y = 0.5;
    } else if (a.bill === 'grass') {
      const blade = new THREE.MeshStandardMaterial({ color: '#8aa043', roughness: 0.9 });
      for (let i = 0; i < 9; i++) beak.rod([mix(-0.03, 0.03, random()), -0.03, 0.15], [mix(-0.3, 0.3, random()), mix(-0.14, 0.03, random()), 0.14 + mix(-0.08, 0.08, random())], 0.005, blade, 0.002);
    }

    // Pose over the water.
    const bank = a.pose === 'gliding' ? mix(0, 1.05, a.bank) * (random() < 0.5 ? -1 : 1) : 0;
    const height = a.pose === 'gliding' ? 0.42 + Math.abs(Math.sin(bank)) * span * 0.93 : a.pose === 'takeoff' ? 0.42 : a.pose === 'feeding' ? 0.1 : 0.07;
    b.root.position.y = height;
    b.root.rotation.set(a.pose === 'takeoff' ? -0.28 : a.pose === 'gliding' ? -0.04 : 0, 0.25 * (random() - 0.5), bank);

    // Sea: a swell to skim, a seat of ripples to sit in, or a line of splashes to run on.
    const sea = seaColour(mood);
    if (flying) {
      waterPatch(s, 1.9, 1.3, { rings: 1, foam: 4 });
      const ridge = s.ball([1.75, mix(0.1, 0.3, mood.energy), 0.55], [0, 0, -0.1], new THREE.MeshStandardMaterial({ color: sea.clone().offsetHSL(0, 0, 0.03), roughness: 0.25, metalness: 0.15 }), 24);
      ridge.rotation.y = 0.2;
      ridge.castShadow = false;
      if (mood.energy > 0.35) s.mesh(ringBand(1.5, 0.3, 0.05, 0.06, random() * 6, mix(0.1, 0.3, mood.energy) * 0.92, Math.PI * 1.15, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: '#f4f8f8', roughness: 0.8 }), [0, 0, -0.1]).castShadow = false;
    } else waterPatch(s, 0.95, 0.8, { rings: 3, foam: a.pose === 'feeding' ? 8 : 0 });
    const spray = new THREE.MeshStandardMaterial({ color: '#f4f8f8', roughness: 0.8 });
    if (a.pose === 'takeoff') {
      s.scatter(new THREE.SphereGeometry(1, 8, 6), spray, Array.from({ length: 22 }, (_u, i) => {
        const step = Math.floor(i / 4);
        return { at: [(step % 2 ? 0.1 : -0.1) + (random() - 0.5) * 0.12, random() * 0.14, -0.4 - step * 0.26 + (random() - 0.5) * 0.1] as const, size: mix(0.02, 0.055, random()) * (1 - step * 0.1) };
      })).castShadow = false;
    } else if (a.pose === 'gliding' && a.bank > 0.75) {
      const sign = Math.sign(bank), x = -sign * (Math.cos(bank) * span + 0.13) ;
      s.scatter(new THREE.SphereGeometry(1, 8, 6), spray, Array.from({ length: 12 }, (_u, i) => ({ at: [x + (random() - 0.5) * 0.08, 0.02 + random() * 0.08 + (mood.energy > 0.35 ? 0.05 : 0), -0.1 - i * 0.07] as const, size: mix(0.015, 0.04, random()) }))).castShadow = false;
    }

    const flap = a.pose === 'takeoff' ? mix(0.25, 0.5, mood.energy) : a.pose === 'feeding' ? 0.08 : mix(0.004, 0.03, mood.energy);
    const beat = a.pose === 'takeoff' ? mix(5, 9, mood.energy) : 1.1;
    const restY = height;
    return afloat(s, {
      footprint: flying ? 1.7 : 0.9,
      update: (_dt, time) => {
        pivots.forEach((pivot, i) => { pivot.rotation.z = (i ? 1 : -1) * Math.sin(time * beat) * flap; });
        b.root.position.y = restY + Math.sin(time * mix(0.6, 1.6, mood.energy)) * (flying ? 0.04 : 0.025);
        if (a.pose === 'gliding') b.root.rotation.z = bank + Math.sin(time * 0.5) * 0.04;
      },
    });
  },
});
