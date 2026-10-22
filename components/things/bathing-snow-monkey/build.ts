import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
type Eyes = 'closed' | 'half' | 'open';

const unitBall = new THREE.SphereGeometry(1, 14, 10);
const ball = (parent: THREE.Object3D, size: P3, at: P3, material: THREE.Material) => {
  const mesh = new THREE.Mesh(unitBall, material);
  mesh.scale.set(...size);
  mesh.position.set(...at);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};
const limb = (parent: THREE.Object3D, from: P3, to: P3, radius: number, material: THREE.Material) => {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(d.length(), 0.001), 4, 10), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
};

export default defineThing({
  questions: {
    pose: choice('What is the monkey doing?', {
      dozing: 'Dozing upright, head sunk forward, eyes shut, all but asleep.',
      chin: 'Slumped at the edge with its arms folded on a rim stone and its chin resting on them.',
      watching: 'Sitting tall and alert, eyes open, head turned to watch something outside the pool.',
      cradling: 'A mother holding a small dark infant against her chest, looking down at it.',
      grooming: 'Being groomed: a second monkey sits close behind it, picking through the fur of its head.',
    }),
    company: choice('How many others share the pool?', {
      alone: 'None: it has the pool to itself.',
      pair: 'One companion soaking shoulder to shoulder with it.',
      troop: 'A whole troop of different sizes scattered through the water.',
    }),
    snow: score('How much snow has settled on it and the stones?', ['None, a clear cold day', 'A dusting on its head', 'A thick cap on its head and every rock', 'Heaped deep: it has not moved for hours']),
    towel: noul('Does it wear a small folded towel on its head like a human bather?'),
    fur: choice('What is its winter coat like?', {
      buff: 'Thick grey-buff fur, the usual winter coat.',
      silver: 'Pale silver-grey, an old one.',
      dark: 'Dark brown and sleek with wet.',
      golden: 'Warm golden tan.',
    }),
    water: choice('What is the water like?', {
      milky: 'Opaque milky blue-white mineral water.',
      jade: 'Cloudy jade green.',
      dark: 'Dark and clear, almost black against the snow.',
      rust: 'Iron-rich and tea-brown.',
    }),
    rim: choice('What rings the pool?', {
      boulders: 'Dark rounded river boulders.',
      flagstones: 'Flat pale cut flagstones laid by people.',
      snowbank: 'Nothing but a deep bank of snow the heat has melted a hole in.',
    }),
    nearby: choice('What else is in the picture?', {
      nothing: 'Nothing else.',
      yuzu: 'A few yellow yuzu citrus bobbing in the water.',
      apple: 'A red apple with a bite out of it left on the rim.',
      sake: 'A floating wooden tray with a sake flask and cup, as if it were a paying guest.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();

    const furTone = new THREE.Color({ buff: '#a59684', silver: '#cbc5bb', dark: '#6b5a4c', golden: '#b99562' }[a.fur]);
    const fur = s.material(furTone, { roughness: 1 });
    const furPale = s.material(furTone.clone().lerp(new THREE.Color('#efe6d8'), 0.4), { roughness: 1 });
    const furDark = s.material(furTone.clone().multiplyScalar(0.72), { roughness: 1 });
    const babyFur = s.material('#4d3d33', { roughness: 1 });
    const skinTone = new THREE.Color('#d48a7d').lerp(new THREE.Color('#e2463c'), mix(0.25, 1, mood.warmth));
    const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.7 });
    const skinPale = new THREE.MeshStandardMaterial({ color: skinTone.clone().lerp(new THREE.Color('#f0c4b4'), 0.45), roughness: 0.7 });
    const ink = new THREE.MeshStandardMaterial({ color: '#2a1d1a', roughness: 0.5 });
    const amber = new THREE.MeshStandardMaterial({ color: '#b9772a', roughness: 0.3 });
    const hand = new THREE.MeshStandardMaterial({ color: '#6a4f48', roughness: 0.8 });
    const snow = new THREE.MeshStandardMaterial({ color: '#f6f9fb', roughness: 0.95 });
    const waterTone = { milky: '#cfe5ea', jade: '#9ccbb4', dark: '#3d5a66', rust: '#b98f62' }[a.water];
    const water = new THREE.MeshStandardMaterial({ color: waterTone, roughness: 0.15, emissive: waterTone, emissiveIntensity: a.water === 'dark' ? 0.05 : 0.2 });
    const ripple = new THREE.MeshStandardMaterial({ color: new THREE.Color(waterTone).lerp(new THREE.Color('#ffffff'), 0.6), roughness: 0.3 });

    const WL = 0.07; // waterline
    const HR = 0.105; // an adult's head radius
    const heads: { head: THREE.Group; y: number; phase: number; nod: number }[] = [];

    /** One macaque from the chest up, its origin on the waterline, facing +z. */
    const monkey = (o: { size?: number; eyes: Eyes; rise?: number; tilt?: P3; snow?: number; towel?: boolean; baby?: boolean }) => {
      const h = HR * (o.size ?? 1), coat = o.baby ? babyFur : fur;
      const outer = new THREE.Group();
      const body = new THREE.Group();
      body.position.y = 0.8 * h;
      outer.add(body);
      ball(body, [1.5 * h, 1.9 * h, 1.25 * h], [0, -0.75 * h, -0.15 * h], coat);
      ball(body, [1.72 * h, 0.75 * h, 1.2 * h], [0, 0.35 * h, -0.2 * h], coat); // shoulders
      ball(body, [1.0 * h, 1.0 * h, 0.6 * h], [0, -0.35 * h, 0.75 * h], o.baby ? babyFur : furPale); // chest
      const head = new THREE.Group();
      head.position.set(0, (o.rise ?? 1.55) * h, 0.15 * h);
      head.rotation.set(...(o.tilt ?? [0, 0, 0]));
      body.add(head);
      ball(head, [1.04 * h, 1.0 * h, 1.0 * h], [0, 0, 0], coat);
      // The winter ruff: tufts ringing the bare face.
      const tufts = o.baby ? 9 : 13;
      for (let i = 0; i < tufts; i++) {
        const t = (i / tufts) * Math.PI * 2 + 0.24, low = Math.sin(t) < -0.3;
        const d = (low ? 0.82 : 0.92) * h, sz = (low ? 0.36 : 0.34) * h * r(0.9, 1.15);
        ball(head, [sz, sz, sz * 1.15], [Math.cos(t) * d, Math.sin(t) * d * 0.95, 0.28 * h], i % 3 === 0 ? (o.baby ? babyFur : furDark) : coat);
      }
      ball(head, [0.74 * h, 0.8 * h, 0.4 * h], [0, -0.02 * h, 0.7 * h], skin);
      ball(head, [0.4 * h, 0.31 * h, 0.36 * h], [0, -0.3 * h, 0.9 * h], skinPale);
      ball(head, [0.62 * h, 0.15 * h, 0.22 * h], [0, 0.3 * h, 0.9 * h], o.baby ? babyFur : furDark); // brow
      for (const side of [-1, 1]) {
        const ex = side * 0.27 * h, ey = 0.1 * h, ez = 1.0 * h;
        if (o.eyes === 'closed') {
          const lid = new THREE.Mesh(new THREE.TorusGeometry(0.11 * h, 0.022 * h, 5, 10, Math.PI), ink);
          lid.position.set(ex, ey + 0.03 * h, ez + 0.02 * h);
          lid.rotation.z = Math.PI + side * 0.12;
          head.add(lid);
        } else {
          const big = o.baby ? 1.35 : 1;
          ball(head, [0.105 * h * big, 0.105 * h * big, 0.06 * h], [ex, ey, ez], o.baby ? ink : amber);
          if (!o.baby) ball(head, [0.055 * h, 0.055 * h, 0.03 * h], [ex, ey, ez + 0.045 * h], ink);
          if (o.eyes === 'half') ball(head, [0.14 * h, 0.085 * h, 0.075 * h], [ex, ey + 0.065 * h, ez], skin);
        }
        ball(head, [0.03 * h, 0.04 * h, 0.02 * h], [side * 0.08 * h, -0.2 * h, 1.22 * h], ink);
        ball(head, [0.07 * h, 0.2 * h, 0.17 * h], [side * 1.08 * h, 0.12 * h, 0.2 * h], skinPale); // ear
      }
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.17 * h, 0.014 * h, 4, 10, Math.PI * 0.7), ink);
      mouth.position.set(0, -0.27 * h, 1.2 * h);
      mouth.rotation.z = Math.PI * 1.15;
      head.add(mouth);
      const load = o.snow ?? 0;
      if (o.towel) {
        const cloth = new THREE.MeshStandardMaterial({ color: '#f3f0e8', roughness: 0.95 });
        const fold = new THREE.Mesh(new THREE.BoxGeometry(1.1 * h, 0.2 * h, 0.75 * h), cloth);
        fold.position.set(0, 1.05 * h, 0);
        fold.rotation.y = r(-0.3, 0.3);
        fold.castShadow = true;
        head.add(fold);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.12 * h, 0.06 * h, 0.14 * h), new THREE.MeshStandardMaterial({ color: '#33558f' }));
        stripe.position.set(0, 1.05 * h, 0.25 * h);
        stripe.rotation.y = fold.rotation.y;
        head.add(stripe);
        if (load > 0.4) ball(head, [0.45 * h, 0.14 * h * load + 0.04 * h, 0.32 * h], [0, 1.18 * h, 0], snow);
      } else if (load > 0.12) {
        ball(head, [0.78 * h, (0.14 + 0.42 * load) * h, 0.76 * h], [0, (0.88 + 0.12 * load) * h, -0.05 * h], snow);
        if (load > 0.55) ball(head, [0.45 * h, 0.3 * load * h, 0.45 * h], [r(-0.2, 0.2) * h, (1.15 + 0.3 * load) * h, -0.05 * h], snow);
      }
      if (load > 0.5) for (const side of [-1, 1]) ball(body, [0.55 * h, 0.2 * load * h, 0.5 * h], [side * 1.05 * h, 0.95 * h, -0.3 * h], snow);
      // The water parts around the chest.
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05 * h, 0.035 * h, 4, 36), ripple);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.006;
      ring.scale.set(1, 0.9, 0.3);
      outer.add(ring);
      heads.push({ head, y: head.position.y, phase: r(0, 6.3), nod: o.eyes === 'closed' ? 1 : 0.4 });
      s.root.add(outer);
      return { body: outer, inner: body, head, h };
    };
    const arm = (m: { inner: THREE.Group; h: number }, side: number, elbow: P3, wrist: P3, baby = false) => {
      const h = m.h, coat = baby ? babyFur : fur;
      const shoulder: P3 = [side * 1.25 * h, 0.5 * h, 0];
      const e: P3 = [elbow[0] * h, elbow[1] * h, elbow[2] * h], w: P3 = [wrist[0] * h, wrist[1] * h, wrist[2] * h];
      limb(m.inner, shoulder, e, 0.36 * h, coat);
      limb(m.inner, e, w, 0.3 * h, coat);
      ball(m.inner, [0.3 * h, 0.2 * h, 0.36 * h], w, hand);
    };

    const extras = a.company === 'alone' ? 0 : a.company === 'pair' ? 1 : Math.round(mix(3, 5, mood.density));
    const PR = a.company === 'alone' ? 0.36 : a.company === 'pair' ? 0.47 : 0.7;
    const load = a.snow;

    // The hero.
    const yaw = r(-0.25, 0.4);
    if (a.pose === 'chin') {
      const z = PR - 0.15, top = WL + 1.62 * HR;
      const m = monkey({ eyes: 'closed', rise: 1.45, tilt: [0.12, r(-0.2, 0.2), r(-0.22, 0.22)], snow: load, towel: a.towel });
      m.body.position.set(0, WL, z);
      m.head.position.z = 1.15 * HR;
      const slab = s.material('#4c4f55', { roughness: 0.95, flatShading: true });
      const stone = s.mesh(new THREE.IcosahedronGeometry(1, 1), slab, [0, top - 0.15, z + 0.3]);
      stone.scale.set(0.3, 0.15, 0.17);
      arm(m, -1, [-1.5, 0.75, 1.3], [0.5, 0.78, 1.75]);
      arm(m, 1, [1.5, 0.75, 1.4], [-0.4, 0.95, 1.95]);
    } else if (a.pose === 'dozing') {
      const m = monkey({ eyes: 'closed', rise: 1.4, tilt: [0.32, r(-0.15, 0.15), r(-0.2, 0.2)], snow: load, towel: a.towel });
      m.body.position.set(0, WL, 0.06);
      m.body.rotation.y = yaw;
    } else if (a.pose === 'watching') {
      const m = monkey({ eyes: 'open', rise: 1.85, tilt: [-0.08, r(0.35, 0.8) * (random() < 0.5 ? -1 : 1), 0], snow: load, towel: a.towel });
      m.body.position.set(0, WL + 0.3 * HR, 0.04);
      m.body.rotation.y = yaw;
    } else if (a.pose === 'cradling') {
      const m = monkey({ eyes: 'half', rise: 1.8, tilt: [0.38, 0.12, 0.1], snow: load, towel: a.towel });
      m.body.position.set(0, WL + 0.25 * HR, 0);
      m.body.rotation.y = yaw;
      const baby = monkey({ size: 0.55, eyes: 'open', rise: 1.5, tilt: [-0.15, r(-0.4, 0.4), 0], baby: true });
      baby.body.position.set(0.012, WL + 0.02, 0.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      baby.body.rotation.y = yaw + r(-0.2, 0.2);
      arm(m, -1, [-1.55, 0.05, 1.0], [-0.35, 0.3, 1.85]);
      arm(m, 1, [1.6, 0.0, 0.9], [0.75, 0.15, 1.6]);
    } else {
      const m = monkey({ eyes: 'closed', rise: 1.4, tilt: [0.3, 0, 0.1], snow: load * 0.4, towel: a.towel });
      m.body.position.set(0.1, WL, 0.1);
      m.body.rotation.y = 0.75;
      const g = monkey({ size: 0.96, eyes: 'half', rise: 1.95, tilt: [0.4, 0, 0], snow: load });
      g.body.position.set(-0.115, WL + 0.5 * HR, -0.1);
      g.body.rotation.y = 0.78;
      arm(g, -1, [-1.4, 1.3, 0.9], [-0.45, 2.15, 1.75]);
      arm(g, 1, [1.4, 1.2, 0.9], [0.5, 1.9, 1.7]);
    }

    // Company, kept to the back and sides so the hero's face stays clear.
    for (let i = 0; i < extras; i++) {
      const t = extras === 1 ? Math.PI * r(0.95, 1.1) : Math.PI * mix(0.75, 2.2, (i + r(0.2, 0.8)) / extras);
      const d = extras === 1 ? 0.27 : PR * r(0.55, 0.72);
      const size = extras === 1 ? r(0.82, 0.95) : r(0.55, 1.0);
      const eyes: Eyes = (['closed', 'half', 'closed', 'open'] as const)[Math.floor(random() * 4)];
      const m = monkey({ size, eyes, rise: r(1.35, 1.75), tilt: [r(0, 0.3), r(-0.4, 0.4), r(-0.15, 0.15)], snow: load * r(0.5, 1), baby: size < 0.66 });
      m.body.position.set(Math.cos(t) * d, WL, -Math.sin(t) * d * 0.9 - (extras === 1 ? 0 : 0.05));
      m.body.rotation.y = r(-0.5, 0.7);
    }

    // The pool and its rim.
    s.cylinder(PR + 0.06, PR + 0.06, WL, [0, WL / 2, 0], water, 48).castShadow = false;
    const rock = s.material(a.rim === 'flagstones' ? '#9a9b97' : '#4a4d53', { roughness: 0.95, flatShading: true });
    const rockGeometry = new THREE.IcosahedronGeometry(1, 1);
    const n = Math.round((Math.PI * 2 * (PR + 0.12)) / (a.rim === 'flagstones' ? 0.3 : 0.25));
    const chinGap = a.pose === 'chin' ? 0.3 / (PR + 0.1) : 0;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 + r(-0.04, 0.04), front = Math.sin(t) > 0.2 ? 0.6 : 1;
      if (chinGap && Math.abs(t - Math.PI / 2) < chinGap) continue;
      const d = PR + 0.13 + r(-0.03, 0.04);
      const x = Math.cos(t) * d, z = Math.sin(t) * d;
      if (a.rim === 'flagstones') {
        const slab = s.box([r(0.24, 0.3), r(0.07, 0.1), r(0.2, 0.26)], [x, 0.045, z], rock);
        slab.rotation.y = -t + Math.PI / 2 + r(-0.12, 0.12);
        if (load > 0.3 && random() < load) ball(s.root, [0.11, 0.025 + 0.05 * load, 0.09], [x, 0.1, z], snow);
      } else if (a.rim === 'snowbank') {
        ball(s.root, [r(0.18, 0.26), r(0.12, 0.22) * front * mix(0.7, 1.3, load), r(0.17, 0.24)], [x * 1.04, 0.03, z * 1.04], snow);
      } else {
        const w = r(0.11, 0.17), tall = r(0.1, 0.26) * front, deep = r(0.1, 0.15);
        const stone = s.mesh(rockGeometry, rock, [x, tall * 0.45, z]);
        stone.scale.set(w, tall, deep);
        stone.rotation.y = -t + r(-0.5, 0.5);
        if (load > 0.25) ball(s.root, [w * 0.82, 0.02 + tall * 0.3 * load + 0.05 * load, deep * 0.82], [x, tall * 1.38, z], snow);
      }
    }
    if (load > 0.2 || a.rim === 'snowbank') {
      // A skirt of settled snow around the stones.
      const drift = new THREE.Shape();
      for (let i = 0; i <= 36; i++) {
        const t = (i / 36) * Math.PI * 2, d = PR + 0.3 + Math.sin(t * 3 + 1) * 0.05 + Math.sin(t * 7) * 0.025;
        if (i) drift.lineTo(Math.cos(t) * d, Math.sin(t) * d); else drift.moveTo(d, 0);
      }
      const hole = new THREE.Path();
      hole.absarc(0, 0, PR + 0.04, 0, Math.PI * 2, true);
      drift.holes.push(hole);
      const skirt = new THREE.ExtrudeGeometry(drift, { depth: 0.035 + 0.03 * load, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.025, bevelSegments: 2 }).rotateX(-Math.PI / 2);
      s.mesh(skirt, snow, [0, 0.02, 0]);
    }

    // Company of other kinds.
    const fx = -PR * 0.62, fz = PR * 0.5;
    if (a.nearby === 'yuzu') {
      const peel = s.material('#f2c230', { roughness: 0.6 });
      for (let i = 0, k = 2 + Math.round(mood.density * 4); i < k; i++) {
        const t = r(0.55, 1.0) * Math.PI + (i % 2 ? 0 : -Math.PI * 0.75), d = PR * r(0.72, 0.9);
        ball(s.root, [0.045, 0.039, 0.045], [Math.cos(t) * d, WL + 0.012, Math.abs(Math.sin(t)) * d * (i % 2 ? 1 : 0.9)], peel);
      }
    } else if (a.nearby === 'apple') {
      const t = Math.PI * 0.22, d = PR + 0.13;
      const red = s.material('#c32b2b', { roughness: 0.35 });
      const apple = new THREE.Group();
      ball(apple, [0.042, 0.04, 0.042], [0, 0, 0], red);
      ball(apple, [0.022, 0.024, 0.014], [0.012, 0.004, 0.034], s.material('#f1e6c4'));
      limb(apple, [0, 0.035, 0], [0.006, 0.055, 0], 0.003, ink);
      apple.position.set(Math.cos(t) * d, a.rim === 'flagstones' ? 0.13 : 0.2, Math.sin(t) * d);
      s.root.add(apple);
      const perch = s.mesh(rockGeometry, a.rim === 'snowbank' ? snow : rock, [apple.position.x, 0.07, apple.position.z]);
      perch.scale.set(0.13, a.rim === 'flagstones' ? 0.02 : 0.1, 0.12);
    } else if (a.nearby === 'sake') {
      s.cylinder(0.095, 0.088, 0.02, [fx, WL + 0.012, fz], s.material('#7b2a1f', { roughness: 0.35 }), 24);
      const clay = s.material('#ece8dc', { roughness: 0.4 });
      s.lathe([[0, 0], [0.028, 0], [0.034, 0.04], [0.024, 0.07], [0.011, 0.082], [0.011, 0.1], [0.018, 0.108]], clay, [fx - 0.03, WL + 0.022, fz - 0.01]);
      s.cylinder(0.019, 0.012, 0.022, [fx + 0.05, WL + 0.033, fz + 0.03], clay, 12);
    }

    // Steam, kept thin and behind so faces read.
    const mist = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.24, depthWrite: false, roughness: 1, emissive: '#aebccb', emissiveIntensity: 0.35 });
    const puffGeometry = new THREE.IcosahedronGeometry(1, 2);
    const puffCount = Math.round(mix(5, 11, mood.energy) * (PR / 0.4));
    const puffs = Array.from({ length: puffCount }, (_unused, i) => {
      const mesh = new THREE.Mesh(puffGeometry, mist);
      s.root.add(mesh);
      const t = r(0, Math.PI * 2), d = PR * r(0.6, 1.0);
      return { mesh, x: Math.cos(t) * d, z: -Math.abs(Math.sin(t)) * d * 0.9 - 0.05, phase: (i + random()) / puffCount, size: r(0.07, 0.13), sway: r(0, 6.3) };
    });
    const lean = r(-0.2, 0.2);
    const pose = (time: number) => {
      for (const p of puffs) {
        const t = (p.phase + time * 0.06 * mix(0.6, 1.8, mood.energy)) % 1;
        p.mesh.position.set(p.x + (lean * t + Math.sin(p.sway + t * 4) * 0.04) * t, WL + 0.04 + t * 0.75, p.z + Math.cos(p.sway + t * 3) * 0.04 * t);
        p.mesh.scale.setScalar(p.size * (0.5 + t * 1.5) * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.5 + 0.001);
      }
      for (const m of heads) m.head.position.y = m.y + Math.sin(time * mix(0.6, 1.6, mood.energy) + m.phase) * 0.004 * m.nod;
    };
    pose(0);
    return s.finish({ footprint: PR + 0.28, update: (_dt, time) => pose(time) });
  },
});
