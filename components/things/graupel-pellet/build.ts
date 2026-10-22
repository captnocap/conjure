import * as THREE from 'three';
import { choice, defineThing, mix } from '@conjure/kit';
import { Bag, V, WOOL, aim, crimp, finish, flake, flakePlan, ice, matte, tube, xf } from './bits';

export default defineThing({
  questions: {
    form: choice('What shape is the pellet?', {
      bead: 'A round bead, as if it fell out of a beanbag.',
      cone: 'A blunt cone with a rounded base, the way graupel falls point up.',
      lump: 'An irregular knuckly lump, several pellets frozen into one.',
      starred: 'A snowflake so thickly rimed that only the stubs of its six arms still poke out of the ball.',
    }),
    surface: choice('What is its surface like?', {
      sugar: 'Fine as caster sugar, a soft matt bloom.',
      beaded: 'Coarse round droplets frozen on like tapioca.',
      spiky: 'Bristling with little ice spikes.',
      smooth: 'Packed and smooth, faintly glazed, like a polystyrene ball.',
    }),
    count: choice('How many are there?', {
      single: 'One.',
      pair: 'Two, a big one and a small one touching.',
      scatter: 'A scatter of them, different sizes, as they fell.',
      heap: 'A little heaped pile, like shot.',
    }),
    state: choice('What has happened to it?', {
      whole: 'Nothing: it is whole.',
      split: 'It has split in two, showing rings inside like an onion round a tiny crystal seed.',
      crumbling: 'It is crumbling: bites missing and a skirt of loose grains round it.',
      slushy: 'It is going to slush: sagging, grey and glassy at the bottom, in its own puddle.',
    }),
    ground: choice('What is it lying on?', {
      bare: 'Nothing in particular.',
      wool: 'A bed of dark wool fibres.',
      snow: 'A dimple in older snow.',
      tarmac: 'A chip of black road tarmac with grit in it.',
      leaf: 'A curled brown dead leaf.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const snow = new Bag(), rime = new Bag(), under = new Bag(), wet = new Bag(), cut = new Bag(), stub = new Bag();
    const cold = new THREE.Color('#8196ad').offsetHSL((mood.warmth - 0.5) * 0.06, 0, 0), bright = new THREE.Color('#f1f5f9');
    const crumble = a.state === 'crumbling' ? 1 : Math.max(0, mood.wear - 0.55) * 1.6;

    /** One pellet. Returns its radius-at-direction function so rime can sit on the true surface. */
    const pellet = (at: THREE.Vector3, r: number, turn: THREE.Euler, half = false, sag = 0) => {
      const geometry = half ? new THREE.SphereGeometry(1, 30, 20, 0, Math.PI) : new THREE.SphereGeometry(1, 30, 20);
      const p = geometry.getAttribute('position'), colours = new Float32Array(p.count * 3), c = new THREE.Color();
      const ph = [random() * 6, random() * 6, random() * 6, random() * 6], knuckle = a.form === 'lump' ? 0.2 : a.form === 'bead' ? 0.05 : 0.09;
      const bites = Array.from({ length: Math.round(crumble * 4) }, () => V(random() - 0.5, random() * 0.8, random() - 0.5).normalize());
      const radius = (d: THREE.Vector3) => {
        let k = 1 + knuckle * Math.sin(d.x * 3.1 + ph[0]) * Math.sin(d.y * 2.7 + ph[1]) * Math.sin(d.z * 3.3 + ph[2]) * 2 + 0.035 * Math.sin(d.x * 9 + ph[3]) * Math.sin(d.y * 11 + ph[0]) * Math.sin(d.z * 10 + ph[1]);
        for (const bite of bites) k -= Math.max(0, d.dot(bite) - 0.8) * 1.5;
        return k;
      };
      const shape = (d: THREE.Vector3, k: number) => {
        const q = d.clone().multiplyScalar(k);
        if (a.form === 'cone') { const up = Math.max(0, q.y); q.x *= 1 - up * 0.5; q.z *= 1 - up * 0.5; q.y *= q.y > 0 ? 1.25 : 0.8; }
        if (sag) { q.y *= 1 - sag * 0.3; if (q.y < 0) { q.x *= 1 + sag * 0.25; q.z *= 1 + sag * 0.25; } }
        return q;
      };
      const d = V();
      for (let i = 0; i < p.count; i++) {
        d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
        const k = radius(d), q = shape(d, k);
        p.setXYZ(i, q.x, q.y, q.z);
        c.copy(cold).lerp(bright, Math.min(1, Math.max(0, (k - 0.93) * 6)) * (1 - Math.max(0, -d.y) * 0.45));
        if (sag) c.lerp(new THREE.Color('#8fa3b8'), Math.max(0, -d.y) * 0.8);
        colours.set([c.r, c.g, c.b], i * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      const m = xf(at, r, turn);
      snow.add(geometry, null, m);
      const on = (dir: THREE.Vector3, out = 1) => shape(dir, radius(dir) * out).applyMatrix4(m);
      const dress = (count: number, size: number, spikes = false) => {
        for (let i = 0; i < count; i++) {
          const dir = V(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
          if (half && dir.z < 0.08) continue;
          if (spikes) rime.add(new THREE.ConeGeometry(r * 0.045, r * (0.16 + random() * 0.2), 5).translate(0, r * 0.1, 0), '#eef5fb', aim(on(dir, 0.98), on(dir, 1.4)));
          else rime.add(new THREE.IcosahedronGeometry(1, size > 0.08 ? 1 : 0), i % 3 ? '#f6f9fc' : '#b9c9d9', xf(on(dir, 1.0), r * size * (0.6 + random() * 0.8)));
        }
      };
      const amount = Math.min(1.6, r / 0.08);
      if (a.surface === 'sugar') dress(Math.round(150 * amount), 0.045);
      else if (a.surface === 'beaded') dress(Math.round(60 * amount), 0.11);
      else if (a.surface === 'spiky') { dress(Math.round(46 * amount), 0, true); dress(Math.round(40 * amount), 0.05); }
      else dress(Math.round(16 * amount), 0.04);
      if (a.form === 'starred' && !half) {
        const tilt = new THREE.Euler(-Math.PI / 2 + 0.2, 0, random());
        const { tips } = flake(stub, flakePlan('sector', 0.2, random), { matrix: xf(at, r * 1.8, tilt), tone: (depth) => ['#5f9fd6', '#9ccbec', '#d2e8f7', '#4f8fc8'][depth], thick: 0.14, random, rough: 0.5 });
        for (const tip of tips) for (let k = 0; k < 4; k++) rime.add(new THREE.IcosahedronGeometry(1, 1), '#ffffff', xf(at.clone().lerp(tip, 0.6 + random() * 0.4).add(V(0, r * 0.05, 0)), r * (0.05 + random() * 0.06)));
      }
      if (half) {
        // The cut face: growth rings round the seed crystal.
        const face = m.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI));
        const rings = 5;
        for (let i = 0; i < rings; i++) cut.add(new THREE.RingGeometry((i / rings) * 0.93, ((i + 1) / rings) * 0.93, 26), i % 2 ? '#93a9bf' : '#eef3f8', face);
        cut.add(new THREE.CircleGeometry(0.15, 6), '#3f7fc0', face.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.004)));
      }
      return on;
    };
    const grains = (centre: THREE.Vector3, spread: number, count: number, size: number) => {
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, dist = spread * (0.75 + random() ** 1.5 * 0.9), s = size * (0.4 + random() * 1.2);
        snow.add(new THREE.IcosahedronGeometry(1, 1), cold.clone().lerp(bright, 0.5 + random() * 0.5), xf(V(centre.x + Math.cos(angle) * dist, s * 0.7, centre.z + Math.sin(angle) * dist), V(s, s * 0.8, s), new THREE.Euler(random(), random(), random())));
      }
    };

    const sag = a.state === 'slushy' ? 1 : 0;
    const lift = (r: number) => r * (a.form === 'cone' ? 0.78 : 0.92) * (1 - sag * 0.28);
    const spots: { at: THREE.Vector3; r: number }[] = [];
    if (a.count === 'single') spots.push({ at: V(0, 0, 0), r: 0.115 });
    else if (a.count === 'pair') { spots.push({ at: V(-0.035, 0, 0), r: 0.1 }); spots.push({ at: V(0.105, 0, 0.05), r: 0.055 }); }
    else if (a.count === 'scatter') {
      const count = Math.round(mix(5, 10, mood.density));
      spots.push({ at: V(0, 0, 0), r: 0.09 });
      for (let i = 0, tries = 0; i < count && tries < 200; tries++) {
        const r = 0.03 + random() * 0.035, angle = random() * Math.PI * 2, dist = 0.12 + random() * 0.14, at = V(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        if (spots.every((s) => s.at.distanceTo(at) > s.r + r + 0.008)) { spots.push({ at, r }); i++; }
      }
    } else {
      const r = 0.05;
      for (let i = 0; i < 6; i++) spots.push({ at: V(Math.cos(i * 1.047) * r * 1.85, 0, Math.sin(i * 1.047) * r * 1.85), r: r * (0.9 + random() * 0.2) });
      spots.push({ at: V(0, 0, 0), r });
      for (let i = 0; i < 3; i++) spots.push({ at: V(Math.cos(i * 2.094 + 0.5) * r * 1.05, r * 1.5, Math.sin(i * 2.094 + 0.5) * r * 1.05), r: r * (0.9 + random() * 0.2) });
      spots.push({ at: V(0, r * 3.05, 0), r: r * 0.95 });
    }
    // In a heap the broken one lies out in front, where the cut face can be seen.
    if (a.state === 'split' && a.count === 'heap') spots.push({ at: V(0.2, 0, 0.13), r: 0.055 });
    const splitIndex = a.count === 'heap' ? spots.length - 1 : 0;
    spots.forEach((spot, index) => {
      const at = spot.at.clone().add(V(0, lift(spot.r), 0)), turn = new THREE.Euler(a.form === 'cone' ? (random() - 0.5) * 0.5 : random() * 3, random() * 6, a.form === 'cone' ? (random() - 0.5) * 0.5 : random() * 3);
      if (a.state === 'split' && index === splitIndex) {
        const r = spot.r, gap = r * 0.75;
        pellet(V(spot.at.x - gap, r * 0.52, spot.at.z), r, new THREE.Euler(Math.PI / 2 - 0.35, 0, 0.5 + random() * 0.4), true);
        pellet(V(spot.at.x + gap * 1.15, r * 0.9, spot.at.z - r * 0.2), r, new THREE.Euler(0.15, Math.PI * 0.9 + random() * 0.3, 0.1), true);
        grains(V(spot.at.x, 0, spot.at.z + r * 0.5), r * 0.5, 14, r * 0.07);
      } else pellet(at, spot.r, turn, false, sag);
      if (crumble > 0) grains(spot.at, spot.r * 1.1, Math.round(crumble * mix(14, 34, mood.density) * Math.min(1.4, spot.r / 0.07)), spot.r * 0.1);
      if (crumble > 0.6 && index === 0) for (let i = 0; i < 3; i++) { const angle = random() * 6.28, s = spot.r * (0.2 + random() * 0.14); snow.add(new THREE.DodecahedronGeometry(1, 1), bright.clone().lerp(cold, random() * 0.5), xf(V(spot.at.x + Math.cos(angle) * spot.r * 1.5, s * 0.7, spot.at.z + Math.sin(angle) * spot.r * 1.5), s, new THREE.Euler(random(), random(), random()))); }
      if (sag) wet.add(new THREE.SphereGeometry(1, 24, 10), '#a9c4da', xf(V(spot.at.x + spot.r * 0.15, 0.002, spot.at.z + spot.r * 0.1), V(spot.r * (1.5 + random() * 0.4), spot.r * 0.07, spot.r * (1.3 + random() * 0.3))));
    });

    // What it landed on: a mid-tone bed so the white reads.
    const reach = a.count === 'single' ? 0.17 : a.count === 'pair' ? 0.2 : 0.3;
    if (a.ground === 'wool') {
      const dye = new THREE.Color(Object.values(WOOL)[Math.floor(random() * 5)]);
      under.add(new THREE.CylinderGeometry(reach * 0.96, reach, 0.012, 28), dye.clone().multiplyScalar(0.7), xf(V(0, -0.006, 0)));
      for (let i = 0; i < 70; i++) {
        const angle = random() * Math.PI * 2, dist = Math.sqrt(random()) * reach, from = V(Math.cos(angle) * dist, 0, Math.sin(angle) * dist), flat = random() < 0.55;
        const to = from.clone().add(flat ? V((random() - 0.5) * 0.16, 0.006, (random() - 0.5) * 0.16) : V((random() - 0.5) * 0.05, 0.03 + random() * 0.06, (random() - 0.5) * 0.05));
        if (to.length() > reach * 1.05) continue;
        under.add(tube(crimp(from, to, 0.005, 3 + random() * 3, random, 0.1), flat ? 0.004 : 0.002, { sides: 5 }), dye.clone().offsetHSL(0, 0, (random() - 0.3) * 0.14));
      }
    } else if (a.ground === 'snow') {
      const ring = new THREE.SphereGeometry(1, 36, 12), p = ring.getAttribute('position');
      for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getZ(i)); p.setY(i, Math.max(0, p.getY(i)) * (0.35 + 0.65 * Math.min(1, Math.max(0, (d - 0.3) * 2.2))) * (1 + Math.sin(p.getX(i) * 7) * Math.sin(p.getZ(i) * 6) * 0.25)); }
      ring.computeVertexNormals();
      under.add(ring, '#a9bbcc', xf(V(0, -0.002, 0), V(reach * 1.1, 0.05, reach * 1.1)));
    } else if (a.ground === 'tarmac') {
      const slab = new THREE.CylinderGeometry(reach, reach * 1.06, 0.03, 9), p = slab.getAttribute('position');
      for (let i = 0; i < p.count; i++) { const s = 1 + Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 3 + 1) * 0.12; p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s * 0.85); }
      slab.computeVertexNormals();
      under.add(slab, '#34373c', xf(V(0, -0.015, 0)));
      for (let i = 0; i < 60; i++) { const angle = random() * 6.28, dist = Math.sqrt(random()) * reach * 0.82; under.add(new THREE.DodecahedronGeometry(1, 0), ['#55595f', '#6f6a62', '#44474c'][i % 3], xf(V(Math.cos(angle) * dist, 0.001, Math.sin(angle) * dist * 0.85), V(0.012, 0.005, 0.012).multiplyScalar(0.5 + random()), new THREE.Euler(0, random() * 3, 0))); }
    } else if (a.ground === 'leaf') {
      const leaf = new THREE.SphereGeometry(1, 32, 12), p = leaf.getAttribute('position');
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setZ(i, z * (1 - Math.abs(x) ** 2.2) * (1 + Math.sin(x * 16) * 0.06)); p.setY(i, p.getY(i) * 0.5 + Math.abs(z) * 0.9 * (0.4 + Math.abs(x) * 0.6) + x * x * 0.5); }
      leaf.computeVertexNormals();
      const brown = new THREE.Color('#8a5a34').offsetHSL(random() * 0.04, 0, (random() - 0.5) * 0.1);
      under.add(leaf, brown, xf(V(0, 0.004, 0), V(reach * 1.15, 0.03, reach * 0.72), new THREE.Euler(0, 0.4, 0)));
      under.add(tube([V(-reach * 1.2, 0.02, 0), V(0, 0.006, 0), V(reach * 1.1, 0.02, 0)], 0.004, { sides: 5, smooth: 12 }), brown.clone().multiplyScalar(0.7), new THREE.Matrix4().makeRotationY(0.4));
    }

    snow.into(root, matte({ roughness: a.surface === 'smooth' ? 0.55 : 0.95, emissive: '#8196ad', emissiveIntensity: mix(0.03, 0.1, mood.cheer) }));
    rime.into(root, matte({ roughness: 0.8, emissive: '#aebfd0', emissiveIntensity: 0.08, flatShading: true }));
    cut.into(root, matte({ roughness: 0.8, side: THREE.DoubleSide }));
    stub.into(root, ice(0.08));
    wet.into(root, new THREE.MeshPhysicalMaterial({ roughness: 0.04, clearcoat: 1, emissive: '#6f9fc4', emissiveIntensity: 0.15 }));
    under.into(root, matte({ roughness: 0.95 }));
    return finish(root);
  },
});
