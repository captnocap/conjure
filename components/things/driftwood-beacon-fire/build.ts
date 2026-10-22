import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Rod { a: P3; b: P3; r: number; c: string; flat?: boolean }

function rods(parent: THREE.Object3D, material: THREE.Material, list: Rod[], taper = 0.6, segments = 6) {
  if (!list.length) return null;
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(taper, 1, 1, segments), material, list.length);
  const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4();
  list.forEach((o, i) => {
    const a = new THREE.Vector3(...o.a), b = new THREE.Vector3(...o.b), d = b.clone().sub(a);
    const length = Math.max(d.length(), 1e-4);
    q.setFromUnitVectors(up, d.normalize());
    m.compose(a.add(b).multiplyScalar(0.5), q, o.flat ? new THREE.Vector3(o.r * 2.4, length, o.r * 0.45) : new THREE.Vector3(o.r, length, o.r));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(o.c));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export default defineThing({
  questions: {
    fire: choice('What is the fire doing right now?', {
      unlit: 'Unlit: the wood is stacked and waiting, pale and dry.',
      catching: 'Just catching: small flames at the foot and a first thread of smoke.',
      roaring: 'Roaring: a tower of flame taller than the stack, throwing sparks.',
      embers: 'Burned down: a collapsed heap of charred logs glowing red, a wisp of smoke.',
      cold: 'Dead and cold: black charcoal and grey ash, nothing more.',
    }),
    stack: choice('How is the wood built up?', {
      teepee: 'A cone of long poles leaned together at the top.',
      crib: 'A square crib of logs laid crosswise, layer on layer.',
      heap: 'A great loose heap, thrown together in a hurry.',
      tower: 'A tall narrow tower built round four upright posts.',
    }),
    wood: choice('What is being burned?', {
      silver: 'Sun-bleached driftwood, silver-white and twisted.',
      dark: 'Sea-soaked dark logs and tarred timber.',
      wreck: 'The broken planks and ribs of a boat.',
    }),
    hearth: choice('What does it stand on?', {
      ring: 'A ring of rounded boulders.',
      cairn: 'A raised flat-topped platform of dry-laid stone.',
      slab: 'One great flat slab of rock.',
      scorch: 'Bare ground, scorched black in a circle.',
    }),
    purpose: choice('What is the fire for?', {
      signal: 'A signal: a watchman\'s horn hangs on a post beside a stack of spare wood.',
      funeral: 'A funeral: a shield and sword are laid before it and a shrouded bier rests on the wood.',
      welcome: 'A welcome: log benches drawn up around it and a cauldron on a tripod.',
      plain: 'No sign of its purpose: only the fire.',
    }),
    size: score('How big is the pyre?', ['A knee-high cooking fire', 'Chest high', 'Taller than a man', 'A towering beacon']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const burnt = a.fire === 'embers' || a.fire === 'cold';
    const lit = a.fire === 'catching' || a.fire === 'roaring';
    const fullH = mix(0.7, 4.8, a.size) * (a.stack === 'tower' ? 1.2 : 1);
    const H = burnt ? fullH * 0.28 : fullH;
    const R = Math.max(0.45, fullH * (a.stack === 'tower' ? 0.2 : a.stack === 'heap' ? 0.48 : 0.36));
    const thick = mix(0.035, 0.1, a.size);
    const char = ['#1b1815', '#26211c', '#14110f', '#332a22'];
    const tones = burnt ? char : { silver: ['#cfc9bb', '#bdb7a8', '#dcd7ca', '#a9a394', '#c4bca9'], dark: ['#4f4136', '#3d332b', '#5f5043', '#463c33'], wreck: ['#5a4630', '#4a3626', '#6b5540', '#8a3a30', '#3b2a1e'] }[a.wood];
    const scorch = a.fire === 'roaring' ? 0.55 : a.fire === 'catching' ? 0.2 : 0;
    const tone = (height01: number) => new THREE.Color(pick(tones)).lerp(new THREE.Color('#1b1815'), scorch * (1 - height01) * (0.5 + random() * 0.5)).getStyle();
    const flat = () => a.wood === 'wreck' && random() < 0.6;

    // Hearth.
    const hearthR = R + 0.45;
    let base = 0.05;
    const stoneTones = ['#8b8d8c', '#7b7e80', '#9a9b97', '#6f7273'];
    const stone = () => s.material(new THREE.Color(pick(stoneTones)).lerp(new THREE.Color('#2a2623'), lit || burnt ? 0.25 : 0), { flatShading: true });
    if (a.hearth === 'ring') {
      const n = Math.max(7, Math.round(hearthR * 5));
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * 6.283 + random() * 0.2, r = 0.2 + random() * 0.12;
        s.mesh(new THREE.IcosahedronGeometry(1, 1), stone(), [Math.cos(angle) * hearthR, r * 0.5, Math.sin(angle) * hearthR]).scale.set(r * 1.3, r * 0.9, r);
      }
      s.cylinder(hearthR, hearthR, 0.06, [0, 0.03, 0], s.material('#3a332c'), 24);
      base = 0.06;
    }
    if (a.hearth === 'cairn') {
      const top = mix(0.3, 0.75, a.size);
      s.cylinder(hearthR, hearthR * 1.12, top, [0, top / 2, 0], s.material('#84868a', { flatShading: true }), 11);
      for (let layer = 0; layer < 3; layer++) {
        const n = Math.round(hearthR * 6);
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * 6.283 + layer * 0.3, r = hearthR * (1.11 - layer * 0.04);
          const block = s.box([0.5 + random() * 0.25, top / 3 - 0.02, 0.26], [Math.cos(angle) * r, top * (layer + 0.5) / 3, Math.sin(angle) * r], stone());
          block.rotation.y = -angle + Math.PI / 2;
        }
      }
      base = top;
    }
    if (a.hearth === 'slab') {
      const slab = s.mesh(new THREE.CylinderGeometry(hearthR * 1.15, hearthR * 1.25, 0.28, 7), s.material('#8f9192', { flatShading: true }), [0, 0.14, 0]);
      slab.scale.set(1.15, 1, 0.9);
      slab.rotation.y = random() * 3;
      base = 0.28;
    }
    if (a.hearth === 'scorch') {
      s.cylinder(hearthR * 1.1, hearthR * 1.15, 0.04, [0, 0.02, 0], s.material('#2a2623'), 22);
      base = 0.04;
    }

    // The stack.
    const wood: Rod[] = [];
    if (burnt) {
      const n = Math.round(mix(14, 40, a.size));
      for (let i = 0; i < n; i++) {
        const angle = random() * 6.3, r = random() * R * 0.9, len = (0.4 + random() * 0.9) * Math.min(1.6, R * 1.6), dir = random() * 6.3, y = base + 0.05 + random() * H * (1 - r / R) * 0.6;
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        wood.push({ a: [x - Math.cos(dir) * len / 2, y, z - Math.sin(dir) * len / 2], b: [x + Math.cos(dir) * len / 2, y + (random() - 0.3) * 0.25, z + Math.sin(dir) * len / 2], r: thick * (0.6 + random() * 0.6), c: pick(char) });
      }
      if (a.stack === 'teepee' || a.stack === 'tower') for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * 6.283 + random();
        wood.push({ a: [Math.cos(angle) * R * 0.8, base, Math.sin(angle) * R * 0.8], b: [Math.cos(angle) * R * 0.1, base + fullH * (0.35 + random() * 0.2), Math.sin(angle) * R * 0.1], r: thick * 0.8, c: pick(char) });
      }
      s.ball([R * 0.95, H * 0.3 + 0.05, R * 0.95], [0, base, 0], s.material(a.fire === 'cold' ? '#8d8a84' : '#6f6a64'), 14);
    } else if (a.stack === 'teepee') {
      const n = Math.round(mix(10, 26, a.size) * mix(0.8, 1.25, mood.density));
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * 6.283 + random() * 0.3, r = R * (0.75 + random() * 0.3), over = 0.08 + random() * 0.22;
        wood.push({ a: [Math.cos(angle) * r, base, Math.sin(angle) * r], b: [-Math.cos(angle) * R * over + (random() - 0.5) * 0.1, base + H * (0.95 + random() * 0.15), -Math.sin(angle) * R * over], r: thick * (0.7 + random() * 0.7), c: tone(0.5), flat: flat() });
      }
      for (let i = 0; i < n; i++) {
        const angle = random() * 6.3, r = R * (0.5 + random() * 0.6), len = 0.4 + random() * R;
        wood.push({ a: [Math.cos(angle) * r, base + random() * 0.15, Math.sin(angle) * r], b: [Math.cos(angle + 0.8) * (r - len * 0.5), base + 0.1 + random() * H * 0.25, Math.sin(angle + 0.8) * (r - len * 0.5)], r: thick * 0.5, c: tone(0.1) });
      }
    } else if (a.stack === 'crib' || a.stack === 'tower') {
      const layerH = thick * 2.1, layers = Math.max(3, Math.round((H * (a.stack === 'tower' ? 0.92 : 0.8)) / layerH));
      for (let layer = 0; layer < layers; layer++) {
        const shrink = a.stack === 'tower' ? 1 : 1 - (layer / layers) * 0.45, half = R * shrink, y = base + thick + layer * layerH;
        const across = layer % 2 === 0;
        const count = a.stack === 'tower' ? 2 : 2 + (layer % 3 === 0 ? 1 : 0);
        for (let i = 0; i < count; i++) {
          const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2 * half * 0.86, over = half * (1.05 + random() * 0.25), skew = (random() - 0.5) * 0.12;
          wood.push(across
            ? { a: [-over, y + skew * 0.3, offset + skew], b: [over, y, offset - skew], r: thick * (0.85 + random() * 0.3), c: tone(layer / layers), flat: flat() }
            : { a: [offset + skew, y + skew * 0.3, -over], b: [offset - skew, y, over], r: thick * (0.85 + random() * 0.3), c: tone(layer / layers), flat: flat() });
        }
      }
      if (a.stack === 'tower') {
        for (const x of [-1, 1]) for (const z of [-1, 1]) wood.push({ a: [x * R * 1.02, base, z * R * 1.02], b: [x * R * 0.96, base + H * 1.08, z * R * 0.96], r: thick * 1.1, c: tone(0.5) });
        for (let i = 0; i < 10; i++) { const x = (random() - 0.5) * R * 1.4, z = (random() - 0.5) * R * 1.4; wood.push({ a: [x, base + H * 0.5, z], b: [x + (random() - 0.5) * 0.4, base + H * (1.0 + random() * 0.2), z + (random() - 0.5) * 0.4], r: thick * 0.5, c: tone(1) }); }
      } else {
        for (let i = 0; i < 8; i++) { const x = (random() - 0.5) * R * 0.7, z = (random() - 0.5) * R * 0.7; wood.push({ a: [x, base + H * 0.5, z], b: [x + (random() - 0.5) * 0.5, base + H * (0.9 + random() * 0.2), z + (random() - 0.5) * 0.5], r: thick * 0.55, c: tone(1) }); }
      }
    } else {
      const n = Math.round(mix(26, 80, a.size) * mix(0.8, 1.25, mood.density));
      for (let i = 0; i < n; i++) {
        const level = Math.pow(random(), 1.6), y = base + thick + level * H * 0.85, reach = R * (1 - level * 0.85);
        const angle = random() * 6.3, r = random() * reach * 0.7, dir = random() * 6.3, len = (0.5 + random() * 0.8) * Math.max(0.6, reach * 1.5);
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r, tilt = (random() - 0.4) * len * 0.5;
        wood.push({ a: [x - Math.cos(dir) * len / 2, y - tilt / 2, z - Math.sin(dir) * len / 2], b: [x + Math.cos(dir) * len / 2, y + tilt / 2, z + Math.sin(dir) * len / 2], r: thick * (0.6 + random() * 0.8), c: tone(level), flat: flat() });
      }
    }
    if (a.wood === 'wreck' && !burnt) {
      // A curved rib and a stem post give the boat away.
      const rib = s.tube([[R * 0.9, base, 0.2], [R * 0.75, base + H * 0.3, 0.15], [R * 0.3, base + H * 0.62, 0.05], [-R * 0.1, base + H * 0.78, 0]], thick * 0.7, s.material('#5a4630'));
      rib.rotation.y = random() * 6.3;
      const stem = s.tube([[-R * 1.0, base, -0.3], [-R * 0.8, base + H * 0.45, -0.2], [-R * 0.55, base + H * 0.9, -0.1], [-R * 0.62, base + H * 1.08, -0.08]], thick * 0.9, s.material('#4a3626'));
      stem.rotation.y = random() * 6.3;
    }
    rods(s.root, s.material('#ffffff'), wood.filter((w) => !w.flat));
    rods(s.root, s.material('#ffffff'), wood.filter((w) => w.flat), 0.95, 4);

    // Fire, embers, sparks and smoke.
    const hot = new THREE.Color('#f2541b').lerp(new THREE.Color('#ff9a2a'), 1 - mood.warmth);
    const flames: { mesh: THREE.Mesh; phase: number; tall: number }[] = [];
    const flameShape = new THREE.LatheGeometry([[0, 0], [0.5, 0.12], [0.62, 0.3], [0.45, 0.6], [0.18, 0.86], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 9);
    const flameMaterials = [hot.getStyle(), '#ff8a1c', '#ffc02e'].map((colour) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.55, roughness: 1 }));
    const addFlame = (x: number, y: number, z: number, width: number, tall: number, layer: number) => {
      const mesh = new THREE.Mesh(flameShape, flameMaterials[layer]);
      mesh.position.set(x, y, z);
      mesh.scale.set(width, tall, width);
      mesh.rotation.set((random() - 0.5) * 0.3, random() * 6.3, (random() - 0.5) * 0.3);
      s.root.add(mesh);
      flames.push({ mesh, phase: random() * 6.3, tall });
    };
    const blaze = mix(0.75, 1.35, mood.energy);
    if (a.fire === 'roaring') {
      const n = Math.round(mix(5, 11, a.size));
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * 6.283 + random(), r = R * (0.15 + random() * 0.5);
        addFlame(Math.cos(angle) * r, base + H * (0.15 + random() * 0.35), Math.sin(angle) * r, R * (0.4 + random() * 0.3), fullH * (0.7 + random() * 0.6) * blaze, i % 2);
      }
      addFlame(0, base + H * 0.45, 0, R * 0.75, fullH * 1.25 * blaze, 0);
      addFlame(0, base + H * 0.5, 0, R * 0.45, fullH * 0.9 * blaze, 2);
      const sparks = Array.from({ length: Math.round(mix(20, 60, mood.energy)) }, () => ({ at: [(random() - 0.5) * R * 2.2, base + H + random() * fullH * 1.3 * blaze, (random() - 0.5) * R * 2.2] as P3, size: 0.018 + random() * 0.03 * mix(0.6, 1.4, a.size), color: pick(['#ffd27a', '#ff9a2e', '#fff1c0']) }));
      s.scatter(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff9a2e', emissiveIntensity: 2 }), sparks);
    }
    if (a.fire === 'catching') {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * 6.283 + random(), r = R * (0.5 + random() * 0.35);
        addFlame(Math.cos(angle) * r, base + 0.02, Math.sin(angle) * r, Math.max(0.14, R * 0.2), Math.max(0.35, fullH * 0.22) * (0.7 + random() * 0.6) * blaze, i % 3);
      }
    }
    if (a.fire === 'embers') {
      const glow = new THREE.MeshStandardMaterial({ color: '#ff5a1a', emissive: '#ff3a0a', emissiveIntensity: mix(0.9, 2.2, mood.energy), roughness: 1 });
      const coals = Array.from({ length: Math.round(mix(25, 70, a.size)) }, () => { const angle = random() * 6.3, r = Math.sqrt(random()) * R * 0.85; return { at: [Math.cos(angle) * r, base + 0.06 + (1 - r / R) * H * 0.42, Math.sin(angle) * r] as P3, size: thick * (0.5 + random() * 0.9), color: pick(['#ffffff', '#ffd9a0', '#ff9c66']) }; });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), glow, coals);
      for (let i = 0; i < 2; i++) addFlame((random() - 0.5) * R * 0.6, base + H * 0.3, (random() - 0.5) * R * 0.6, 0.12, 0.3 * blaze, 1);
    }
    const smoke: THREE.Mesh[] = [];
    if (a.fire === 'catching' || a.fire === 'embers') {
      const smokeMaterial = new THREE.MeshStandardMaterial({ color: '#8c8c8a', transparent: true, opacity: 0.26, depthWrite: false, roughness: 1 });
      const drift = (random() - 0.5) * 0.6;
      for (let i = 0; i < 9; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), smokeMaterial);
        const t = i / 8;
        puff.position.set(drift * t * fullH * 1.2 + (random() - 0.5) * 0.15, base + H * 0.6 + t * Math.max(1.6, fullH * 1.5), (random() - 0.5) * 0.2 + t * 0.4);
        puff.scale.setScalar(mix(0.12, 0.42, t) * mix(0.8, 1.4, a.size));
        s.root.add(puff);
        smoke.push(puff);
      }
    }

    // What the fire is for.
    const out = hearthR + 0.9;
    if (a.purpose === 'signal') {
      const px = out * 0.9, pz = out * 0.5, timber = s.material('#6b5540');
      s.rod([px, 0, pz], [px, 1.9, pz], 0.05, timber);
      s.rod([px - 0.05, 1.75, pz], [px - 0.45, 1.75, pz], 0.03, timber);
      s.tube([[px - 0.4, 1.7, pz], [px - 0.42, 1.45, pz], [px - 0.36, 1.25, pz + 0.05], [px - 0.2, 1.12, pz + 0.12], [px - 0.02, 1.12, pz + 0.2]], 0.035, s.material('#d8cdb0'));
      s.cylinder(0.075, 0.04, 0.12, [px + 0.03, 1.13, pz + 0.23], s.material('#9a7a34', { metalness: 0.5 }), 10).rotation.set(1.2, 0, -1.1);
      const spare: Rod[] = [];
      const sx = -out * 0.95, rows = 3 + Math.round(mood.density * 2);
      for (let row = 0; row < rows; row++) for (let i = 0; i < 6 - row; i++) spare.push({ a: [sx - 0.1 + random() * 0.1, 0.09 + row * 0.15, -0.9 + (i + row * 0.5) * 0.17], b: [sx + 1.2 + random() * 0.3, 0.09 + row * 0.15, -0.9 + (i + row * 0.5) * 0.17 + (random() - 0.5) * 0.06], r: 0.075, c: pick(a.wood === 'silver' ? ['#cfc9bb', '#bdb7a8', '#dcd7ca'] : ['#4f4136', '#5f5043', '#6b5540']) });
      rods(s.root, s.material('#ffffff'), spare, 0.8, 7);
    }
    if (a.purpose === 'funeral') {
      const steel = s.material('#b9bdc1', { metalness: 0.75, roughness: 0.3 });
      const disc = s.cylinder(0.45, 0.45, 0.04, [0.2, 0.05, out], s.material(pick(['#b3312a', '#2f5d8c', '#d9b441'])), 22);
      disc.rotation.x = 0.06;
      s.ball([0.09, 0.07, 0.09], [0.2, 0.09, out], s.material('#6b6e72', { metalness: 0.6 }), 10);
      s.box([0.82, 0.012, 0.055], [-0.55, 0.03, out + 0.1], steel).rotation.y = 0.3;
      s.box([0.03, 0.035, 0.2], [-0.94, 0.035, out + 0.22], s.material('#9a7a34', { metalness: 0.6 })).rotation.y = 0.3;
      if (!burnt && a.stack !== 'teepee') {
        const top = base + H * (a.stack === 'heap' ? 0.8 : 0.95);
        s.box([1.9, 0.08, 0.75], [0, top + 0.04, 0], s.material('#8a6f4c'));
        s.ball([0.85, 0.16, 0.28], [0, top + 0.22, 0], s.material(a.fire === 'roaring' ? '#5a4a40' : '#d9d2bf'), 12);
        s.ball([0.15, 0.14, 0.15], [0.86, top + 0.24, 0], s.material(a.fire === 'roaring' ? '#5a4a40' : '#d9d2bf'), 10);
      }
    }
    if (a.purpose === 'welcome') {
      const bark = s.material('#6b5540');
      for (let i = 0; i < 3; i++) {
        const angle = 0.5 + i * 1.1 + (random() - 0.5) * 0.2, x = Math.cos(angle) * (out + 0.5), z = Math.sin(angle) * (out + 0.5);
        const log = s.cylinder(0.2, 0.22, 1.7, [x, 0.21, z], bark, 10);
        log.rotation.set(Math.PI / 2, 0, angle);
        log.rotation.order = 'YXZ';
        log.rotation.set(Math.PI / 2, -angle, 0);
      }
      const cx = -out * 0.85, cz = -out * 0.35, iron = s.material('#2f3033', { metalness: 0.5, roughness: 0.6 });
      for (let i = 0; i < 3; i++) { const angle = (i / 3) * 6.283 + 0.3; s.rod([cx + Math.cos(angle) * 0.55, 0, cz + Math.sin(angle) * 0.55], [cx - Math.cos(angle) * 0.05, 1.5, cz - Math.sin(angle) * 0.05], 0.03, iron); }
      s.rod([cx, 1.42, cz], [cx, 0.85, cz], 0.012, iron);
      s.lathe([[0, 0], [0.16, 0.02], [0.26, 0.14], [0.28, 0.3], [0.24, 0.42], [0.27, 0.45], [0.22, 0.4], [0.24, 0.3], [0.2, 0.12], [0, 0.08]], iron, [cx, 0.42, cz]);
    }

    const flicker = mix(0.5, 1.6, mood.energy);
    return s.finish({
      footprint: hearthR + 0.3,
      update: flames.length || smoke.length ? (_dt, time) => {
        for (const flame of flames) {
          const pulse = 1 + Math.sin(time * 7 * flicker + flame.phase) * 0.14 + Math.sin(time * 13 * flicker + flame.phase * 2) * 0.07;
          flame.mesh.scale.y = flame.tall * pulse;
          flame.mesh.rotation.z = Math.sin(time * 3 * flicker + flame.phase) * 0.12;
        }
        smoke.forEach((puff, i) => { puff.position.x += Math.sin(time * 0.8 + i) * 0.0008; });
      } : undefined,
    });
  },
});
