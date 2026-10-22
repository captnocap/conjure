import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { instanced, solid, stoneGeometry, stoneMaterial, tufts, type Dab } from './stone';

type V3 = THREE.Vector3;

function taperedTube(points: V3[], r0: number, r1: number, material: THREE.Material, tubular = 14, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const centre = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    curve.getPointAt(i / tubular, centre);
    const r = mix(r0, r1, i / tubular);
    for (let j = 0; j <= radial; j++) {
      const index = i * (radial + 1) + j;
      v.fromBufferAttribute(position, index).sub(centre).multiplyScalar(r).add(centre);
      position.setXYZ(index, v.x, v.y, v.z);
    }
  }
  geometry.computeVertexNormals();
  return solid(geometry, material);
}

const RAGS = {
  fresh: ['#d8263c', '#1f6fd0', '#f2c22a', '#f4f1e8', '#e45a9c', '#2f9a5a', '#f08a2a', '#7a45c2'],
  faded: ['#d9a3a8', '#a9bdd6', '#e3d9a6', '#eeeae0', '#d6b3c6', '#b3cdb6'],
  rotted: ['#8d8a82', '#6f6c66', '#a39f94', '#5d5850', '#7b7466'],
  white: ['#f4f1e8', '#ebe6d8', '#fbf9f2', '#ddd8c8'],
  mixed: ['#d8263c', '#8d8a82', '#f4f1e8', '#a9bdd6', '#6f6c66', '#f2c22a', '#a39f94', '#1f6fd0'],
} as const;

export default defineThing({
  questions: {
    season: choice('What season is the tree in?', {
      bare: 'Winter: bare black twigs, the rags its only leaves.',
      blossom: 'May: smothered in white blossom.',
      leaf: 'Summer: dense small green leaves.',
      haws: 'Autumn: thinning yellow leaves and clusters of dark red haws.',
    }),
    bend: score('How hard has the wind shaped it?', ['Upright, only a little swept', 'Leaning well over', 'Bent almost flat, streaming like a flag']),
    cloths: score('How many rags are tied to it?', ['A first few strips', 'Dozens on every reachable branch', 'Smothered: more cloth than tree']),
    rags: choice('What are the rags like?', {
      fresh: 'New and bright: ribbons in every colour, tied this week.',
      faded: 'Sun-bleached to soft pastels.',
      rotted: 'Rotted grey and green, in tatters; whatever was asked for is long settled.',
      white: 'Plain white linen strips, torn from clothing in the old way.',
      mixed: 'Every age together: bright new ribbons among grey shreds.',
    }),
    tokens: choice('What else hangs among the rags?', {
      none: 'Nothing but cloth.',
      shoes: "Children's shoes and socks hung by their laces.",
      rosaries: 'Rosary beads, crosses and holy medals.',
      coins: 'Coins hammered edge-on into the bark until the trunk is scaled with them.',
      toys: 'Soft toys and dummies, left for sick children.',
      notes: 'Photographs, cards and handwritten notes in plastic sleeves.',
    }),
    beside: choice('What is beside the tree?', {
      nothing: 'Nothing; it stands alone.',
      well: 'A holy well: a stone-rimmed spring with a tin cup.',
      cross: 'A small weathered stone cross.',
      bullaun: 'A boulder with a water-filled hollow, and candle stubs.',
      fence: 'A wire fence and a stile; people climb over to reach it.',
      sign: 'A council sign asking visitors not to tie plastic.',
    }),
    stems: choice('What is the trunk like?', {
      single: 'One thick fluted trunk.',
      twin: 'Two trunks twisted round each other from the root.',
      hulk: 'An ancient hollow hulk, split open, still alive on one side.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const T = mix(3.0, 4.4, random());
    const frost = mood.warmth < 0.3 ? mix(0.8, 0, mood.warmth / 0.3) : 0;
    const bark = new THREE.MeshStandardMaterial({ color: new THREE.Color('#40352c').lerp(new THREE.Color('#9aa39c'), frost * 0.3), roughness: 1 });
    const wind = new THREE.Vector3(1, 0.02, mix(-0.15, 0.15, random())).normalize();
    const bias = mix(0.12, 0.62, a.bend);
    const twigs: { from: V3; to: V3; r: number }[] = [];
    const anchors: { p: V3; depth: number }[] = [];
    const trunkLine: { p: V3; r: number }[] = [];
    const jitter = new THREE.Vector3();
    const maxDepth = 4;

    const grow = (start: V3, dir: V3, length: number, radius: number, depth: number) => {
      const points = [start.clone()];
      const d = dir.clone();
      let p = start.clone();
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        jitter.set(random() - 0.5, (random() - 0.5) * 0.7, random() - 0.5).multiplyScalar(depth === 0 ? 0.25 : 0.5);
        d.addScaledVector(wind, bias * (0.35 + i * 0.15) * (depth === 0 ? 0.7 : 1)).add(jitter);
        if (d.y < -0.05 && p.y < T * 0.35) d.y = 0.1;
        d.normalize();
        p = p.clone().addScaledVector(d, length / steps);
        points.push(p);
      }
      const tip = radius * 0.6;
      if (depth <= 1) {
        s.root.add(taperedTube(points, radius, tip, bark, 12, depth === 0 ? 10 : 7));
        if (depth === 0) points.forEach((point, i) => trunkLine.push({ p: point, r: mix(radius, tip, i / steps) }));
      } else for (let i = 0; i < steps; i++) twigs.push({ from: points[i], to: points[i + 1], r: mix(radius, tip, (i + 0.5) / steps) });
      if (depth >= 1) for (let i = 1; i <= steps; i++) anchors.push({ p: points[i], depth });
      if (depth >= maxDepth) return;
      const children = depth === 0 ? 4 : 2 + (random() < 0.45 ? 1 : 0);
      for (let k = 0; k < children; k++) {
        const from = points[depth === 0 ? 2 + (k % 3) : 1 + Math.floor(random() * steps)];
        const child = d.clone().add(jitter.set(random() - 0.5, random() * 0.7 - 0.1, random() - 0.5).multiplyScalar(1.5)).normalize();
        grow(from, child, length * mix(0.6, 0.78, random()), radius * 0.56, depth + 1);
      }
    };
    const lean = mix(0.08, 0.5, a.bend);
    const trunkR = T * (a.stems === 'hulk' ? 0.075 : 0.05);
    const origins = a.stems === 'twin' ? [new THREE.Vector3(-T * 0.04, -0.1, T * 0.03), new THREE.Vector3(T * 0.05, -0.1, -T * 0.03)] : [new THREE.Vector3(0, -0.1, 0)];
    origins.forEach((origin, i) => grow(origin, new THREE.Vector3(Math.sin(lean) + (i ? 0.15 : 0), Math.cos(lean), i ? -0.2 : 0.05).normalize(), T * (a.stems === 'twin' ? 0.4 : 0.46), trunkR * (a.stems === 'twin' ? 0.75 : 1), 0));
    if (a.stems === 'hulk') {
      // A dark hollow in the old trunk, and a dead spar.
      const hollow = s.ball([trunkR * 0.55, T * 0.09, trunkR * 0.4], [trunkLine[1].p.x * 0.6, T * 0.08, trunkR * 0.75], new THREE.MeshStandardMaterial({ color: '#0e0b09', roughness: 1 }), 10);
      hollow.castShadow = false;
      s.rod([trunkLine[1].p.x, trunkLine[1].p.y, 0], [trunkLine[1].p.x - T * 0.12, trunkLine[1].p.y + T * 0.22, -T * 0.05], trunkR * 0.45, bark, trunkR * 0.12);
    }
    // Buttress roots.
    for (let i = 0; i < 5; i++) {
      const angle = i * 1.26 + random() * 0.5;
      s.root.add(taperedTube([new THREE.Vector3(0, T * 0.05, 0), new THREE.Vector3(Math.cos(angle) * T * 0.07, T * 0.012, Math.sin(angle) * T * 0.07), new THREE.Vector3(Math.cos(angle) * T * 0.17, -T * 0.01, Math.sin(angle) * T * 0.17)], trunkR * 0.7, trunkR * 0.18, bark, 8, 6));
    }

    // Twigs as one instanced mesh.
    {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.75, 1, 1, 5), bark, twigs.length);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), mid = new THREE.Vector3(), scale = new THREE.Vector3();
      twigs.forEach((twig, i) => {
        dir.subVectors(twig.to, twig.from);
        const len = dir.length();
        q.setFromUnitVectors(up, dir.normalize());
        mid.addVectors(twig.from, twig.to).multiplyScalar(0.5);
        matrix.compose(mid, q, scale.set(twig.r, len * 1.05, twig.r));
        mesh.setMatrixAt(i, matrix);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      s.root.add(mesh);
    }

    // Leaves, blossom, berries.
    const outer = anchors.filter((anchor) => anchor.depth >= 3);
    if (a.season !== 'bare') {
      const dabs: Dab[] = [];
      const tints = a.season === 'blossom' ? ['#f6f4ea', '#f1eee2', '#fbfaf4', '#e9ecd6', '#7c9a4c'] : a.season === 'leaf' ? ['#4f7334', '#5f8540', '#44642e', '#6d8f48'] : ['#b79a32', '#9a8a3a', '#c9a640', '#7a7a3a'];
      const share = a.season === 'haws' ? 0.3 : a.season === 'leaf' ? 0.5 : 0.6;
      for (const anchor of outer) {
        if (random() > share) continue;
        const u = T * mix(0.025, 0.045, random());
        dabs.push({ at: [anchor.p.x + (random() - 0.5) * u, anchor.p.y + u * mix(0.6, 1.4, random()), anchor.p.z + (random() - 0.5) * u], scale: [u * 1.4, u * 0.6, u * 1.2], turn: [random(), random() * 6, random()], color: tints[Math.floor(random() * tints.length)] });
      }
      s.root.add(instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), dabs));
      if (a.season === 'haws') {
        const berries: Dab[] = [];
        for (const anchor of outer) if (random() < 0.5) for (let i = 0; i < 3; i++) berries.push({ at: [anchor.p.x + (random() - 0.5) * 0.12, anchor.p.y - random() * 0.1, anchor.p.z + (random() - 0.5) * 0.12], scale: T * 0.009 });
        s.root.add(instanced(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#8f1d1a', roughness: 0.4 }), berries));
      }
    }

    // The rags: strips hung from every branch a hand could reach, and a few it could not.
    const palette = RAGS[a.rags];
    const grey = new THREE.Color('#8d8a82');
    const hangers = anchors.filter((anchor) => anchor.depth >= 1 && anchor.depth <= 3 && anchor.p.y < T * 0.95);
    const ragCount = Math.min(560, Math.round(mix(14, 360, a.cloths ** 1.2) * mix(0.75, 1.3, mood.density)));
    const strip = new THREE.PlaneGeometry(1, 1, 1, 4);
    strip.translate(0, -0.5, 0);
    {
      const position = strip.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getY(i) * 5) * 0.06);
      strip.computeVertexNormals();
    }
    const cloth = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide });
    const ragMesh = new THREE.InstancedMesh(strip, cloth, Math.max(1, ragCount));
    ragMesh.count = ragCount;
    ragMesh.castShadow = true;
    ragMesh.frustumCulled = false;
    const rags: { p: V3; yaw: number; w: number; len: number; phase: number; slack: number }[] = [];
    const tint = new THREE.Color();
    for (let i = 0; i < ragCount; i++) {
      const anchor = hangers[Math.floor(random() * hangers.length)];
      const tattered = a.rags === 'rotted' || (a.rags === 'mixed' && i % 2 === 1);
      const len = T * mix(0.08, 0.22, random()) * (tattered ? 0.65 : 1);
      rags.push({ p: anchor.p.clone().add(jitter.set((random() - 0.5) * 0.1, -0.01, (random() - 0.5) * 0.1)), yaw: random() * Math.PI, w: T * mix(0.018, 0.034, random()), len, phase: random() * 6.28, slack: mix(0.6, 1.2, random()) });
      tint.set(palette[Math.floor(random() * palette.length)]).lerp(grey, mood.wear * (a.rags === 'fresh' ? 0.25 : 0.5));
      if (frost > 0.4) tint.lerp(new THREE.Color('#eef4f7'), 0.25);
      ragMesh.setColorAt(i, tint);
    }
    if (ragMesh.instanceColor) ragMesh.instanceColor.needsUpdate = true;
    const blow = mix(0.12, 1.05, mood.energy), flutter = mix(0.03, 0.3, mood.energy), speed = mix(0.8, 5, mood.energy);
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
    const pose = (time: number) => {
      rags.forEach((rag, i) => {
        e.set(Math.sin(time * speed * 0.7 + rag.phase) * flutter * 0.6, rag.yaw, blow * rag.slack + Math.sin(time * speed + rag.phase) * flutter, 'ZXY');
        q.setFromEuler(e);
        matrix.compose(rag.p, q, sc.set(rag.w, rag.len, rag.w));
        ragMesh.setMatrixAt(i, matrix);
      });
      ragMesh.instanceMatrix.needsUpdate = true;
    };
    pose(0);
    s.root.add(ragMesh);

    // Tokens.
    const low = hangers.filter((anchor) => anchor.p.y < T * 0.75);
    const hang = () => low[Math.floor(random() * low.length)].p;
    const tokenCount = Math.round(mix(4, 12, mood.density));
    const string = s.material('#d8d2bf');
    if (a.tokens === 'shoes') {
      const tints = ['#c8321f', '#f4f1e8', '#2a4fa8', '#e45a9c', '#3a3a3a'];
      for (let i = 0; i < tokenCount; i++) {
        const p = hang(), drop = T * mix(0.05, 0.12, random());
        s.rod([p.x, p.y, p.z], [p.x, p.y - drop, p.z], T * 0.002, string);
        const paint = s.material(tints[Math.floor(random() * tints.length)]);
        const shoe = s.ball([T * 0.03, T * 0.014, T * 0.014], [p.x + T * 0.008, p.y - drop - T * 0.012, p.z], paint, 10);
        shoe.rotation.z = -0.9 + random() * 0.5;
        s.ball([T * 0.013, T * 0.016, T * 0.013], [p.x - T * 0.006, p.y - drop, p.z], paint, 8);
      }
    } else if (a.tokens === 'rosaries') {
      const bead = s.material('#2a2320'), silver = s.material('#cfd3d6', { metalness: 0.85, roughness: 0.25 });
      for (let i = 0; i < tokenCount; i++) {
        const p = hang(), r = T * mix(0.018, 0.03, random());
        const loop = s.ring(r, T * 0.0028, [p.x, p.y - r * 1.4, p.z], random() < 0.3 ? s.material('#3d6aa8') : bead);
        loop.scale.set(0.7, 1.4, 1);
        loop.rotation.y = random() * 3;
        s.box([T * 0.004, T * 0.03, T * 0.003], [p.x, p.y - r * 2.8 - T * 0.02, p.z], silver);
        s.box([T * 0.016, T * 0.004, T * 0.003], [p.x, p.y - r * 2.8 - T * 0.014, p.z], silver);
      }
    } else if (a.tokens === 'coins') {
      const dabs: Dab[] = [];
      const metals = ['#b9773a', '#c9a23a', '#c9ccd0', '#7a8a5a'];
      for (let i = 0; i < Math.round(mix(40, 140, mood.density)); i++) {
        const t = random() * (trunkLine.length - 2), k = Math.floor(t), f = t - k;
        const centre = trunkLine[k].p.clone().lerp(trunkLine[k + 1].p, f), r = mix(trunkLine[k].r, trunkLine[k + 1].r, f);
        const angle = random() * 6.28;
        dabs.push({ at: [centre.x + Math.cos(angle) * r * 1.02, centre.y, centre.z + Math.sin(angle) * r * 1.02], scale: [T * 0.008, T * 0.0016, T * 0.008], turn: [random() * 0.4, -angle, Math.PI / 2 + (random() - 0.5) * 0.5], color: metals[Math.floor(random() * metals.length)] });
      }
      s.root.add(instanced(new THREE.CylinderGeometry(1, 1, 1, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.85 }), dabs));
    } else if (a.tokens === 'toys') {
      const furs = ['#b98a55', '#e8d9b8', '#d98aa0', '#8a6a48'];
      for (let i = 0; i < Math.round(tokenCount * 0.7); i++) {
        const p = hang(), u = T * mix(0.02, 0.03, random()), drop = u * 3;
        const fur = s.material(furs[Math.floor(random() * furs.length)], { roughness: 1 });
        s.rod([p.x, p.y, p.z], [p.x, p.y - drop + u * 1.6, p.z], T * 0.002, string);
        s.ball([u, u * 1.2, u * 0.85], [p.x, p.y - drop - u * 0.8, p.z], fur, 10);
        s.ball([u * 0.8, u * 0.75, u * 0.75], [p.x, p.y - drop + u * 0.85, p.z], fur, 10);
        for (const side of [-1, 1]) { s.ball([u * 0.3, u * 0.3, u * 0.2], [p.x + side * u * 0.6, p.y - drop + u * 1.5, p.z], fur, 6); s.ball([u * 0.3, u * 0.5, u * 0.3], [p.x + side * u * 0.95, p.y - drop - u * 0.4, p.z], fur, 6); s.ball([u * 0.35, u * 0.5, u * 0.35], [p.x + side * u * 0.5, p.y - drop - u * 1.9, p.z], fur, 6); }
      }
    } else if (a.tokens === 'notes') {
      const dabs: Dab[] = [];
      for (let i = 0; i < tokenCount * 2; i++) {
        const p = hang(), h = T * mix(0.03, 0.045, random());
        dabs.push({ at: [p.x, p.y - h * 0.9, p.z], scale: [h * 0.72, h, T * 0.001], turn: [0, random() * 3, (random() - 0.5) * 0.5 + blow * 0.3], color: random() < 0.25 ? '#f6e27a' : random() < 0.4 ? '#c9d6e6' : '#fbfaf4' });
        dabs.push({ at: [p.x, p.y - h * 0.9, p.z], scale: [h * 0.5, h * 0.36, T * 0.0016], turn: [0, dabs[dabs.length - 1].turn![1], dabs[dabs.length - 1].turn![2]], color: random() < 0.5 ? '#6a5a4c' : '#4a6a8a' });
      }
      s.root.add(instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), dabs));
    }

    // What stands beside it, on the sheltered side.
    const rock = new THREE.Color('#8f8a80');
    const patches = [{ color: '#b8bd9c', amount: 0.4, scale: 2 }, { color: '#4f6a2f', amount: 0.3, scale: 1.3, up: 2 }];
    const bx = -T * 0.3, bz = T * 0.26;
    if (a.beside === 'well') {
      const dabs: Dab[] = [];
      const wr = T * 0.12;
      for (let course = 0; course < 2; course++) for (let i = 0; i < 11; i++) {
        const angle = ((i + course * 0.5) / 11) * Math.PI * 2;
        if (course === 1 && Math.abs(angle - Math.PI / 2) < 0.7) continue;
        dabs.push({ at: [bx + Math.cos(angle) * wr, course * wr * 0.3, bz + Math.sin(angle) * wr], scale: [wr * 0.55, wr * 0.36, wr * 0.42], turn: [0, -angle + Math.PI / 2, 0] });
      }
      s.root.add(instanced(stoneGeometry(random, { size: [1, 1, 1], round: 0.45, rough: 0.05, base: rock, patches, frost, segments: 5 }), stoneMaterial(), dabs));
      const water = s.cylinder(wr * 0.86, wr * 0.86, 0.012, [bx, wr * 0.2, bz], new THREE.MeshStandardMaterial({ color: mood.daylight > 0.8 ? '#7a5140' : '#1f2d33', roughness: 0.05, metalness: 0.6 }), 20);
      water.castShadow = false;
      s.mesh(stoneGeometry(random, { size: [wr * 1.3, wr * 0.16, wr * 0.7], round: 0.3, base: rock, patches, frost, segments: 5 }), stoneMaterial(), [bx, 0, bz + wr * 1.45]);
      s.cylinder(wr * 0.14, wr * 0.11, wr * 0.2, [bx + wr * 0.4, wr * 0.26, bz + wr * 1.4], s.material('#b9bec2', { metalness: 0.8, roughness: 0.35 }), 12);
    } else if (a.beside === 'cross') {
      const material = stoneMaterial();
      const h = T * 0.42, w = T * 0.04;
      const part = (size: readonly [number, number, number], at: readonly [number, number, number]) => { const mesh = s.mesh(stoneGeometry(random, { size, round: 0.25, taper: 0.95, rough: T * 0.004, base: rock, patches, frost, damp: 0.5, segments: 6 }), material, [bx + at[0], at[1], bz + at[2]]); return mesh; };
      part([w * 1.3, h, w], [0, -0.05, 0]).rotation.z = 0.06;
      part([w * 5, w * 1.2, w * 0.9], [0.02, h * 0.66, 0]).rotation.z = 0.06;
      const halo = s.ring(w * 1.9, w * 0.22, [bx + 0.03, h * 0.73, bz], new THREE.MeshStandardMaterial({ color: rock, roughness: 1 }));
      halo.rotation.z = 0.06;
      part([w * 3.2, w * 1.2, w * 2.6], [0, -0.03, 0]);
    } else if (a.beside === 'bullaun') {
      const br = T * 0.13;
      s.mesh(stoneGeometry(random, { size: [br * 2.2, br * 1.1, br * 1.7], round: 0.75, taper: 0.8, rough: br * 0.05, base: rock, patches, frost, damp: 0.5, segments: 9 }), stoneMaterial(), [bx, -br * 0.2, bz]);
      const water = s.cylinder(br * 0.42, br * 0.42, 0.012, [bx, br * 0.86, bz], new THREE.MeshStandardMaterial({ color: '#27353b', roughness: 0.05, metalness: 0.6 }), 16);
      water.castShadow = false;
      const flame = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9d2e', emissiveIntensity: mix(1, 2.6, mood.warmth) });
      for (let i = 0; i < 4; i++) {
        const angle = i * 1.4 + random(), h = br * mix(0.12, 0.3, random());
        const x = bx + Math.cos(angle) * br * 0.72, z = bz + Math.sin(angle) * br * 0.55;
        s.cylinder(br * 0.06, br * 0.07, h, [x, br * 0.8 + h / 2, z], s.material('#efe6cf'), 8);
        if (random() < mix(0.3, 1, mood.warmth)) s.ball([br * 0.04, br * 0.09, br * 0.04], [x, br * 0.8 + h + br * 0.07, z], flame, 8).castShadow = false;
      }
    } else if (a.beside === 'fence') {
      const post = s.material('#6b5a48'), wire = s.material('#8a8d90', { metalness: 0.7, roughness: 0.4 });
      const fz = -T * 0.3, span = T * 1.1;
      for (let i = 0; i < 4; i++) s.cylinder(T * 0.016, T * 0.02, T * 0.3, [-span * 0.5 + (i * span) / 3 + T * 0.2, T * 0.15, fz + (random() - 0.5) * 0.05], post, 7).rotation.z = (random() - 0.5) * 0.12;
      for (const y of [0.09, 0.17, 0.25]) s.rod([-span * 0.5 + T * 0.2, T * y, fz], [span * 0.5 + T * 0.2, T * y, fz], T * 0.0025, wire);
      const stile = s.box([T * 0.2, T * 0.012, T * 0.07], [T * 0.2 - span * 0.32, T * 0.11, fz + T * 0.05], post);
      stile.rotation.y = 0.1;
      s.box([T * 0.2, T * 0.012, T * 0.07], [T * 0.2 - span * 0.32, T * 0.11, fz - T * 0.05], post);
    } else if (a.beside === 'sign') {
      const post = s.material('#6b5a48');
      s.rod([bx, 0, bz], [bx, T * 0.3, bz], T * 0.012, post);
      const board = s.label('PLEASE: NO PLASTIC', T * 0.2, T * 0.1, [bx, T * 0.31, bz + T * 0.008], '#f2eedf', '#3d5c48');
      board.rotation.y = 0.25;
      s.box([T * 0.21, T * 0.11, T * 0.008], [bx, T * 0.31, bz], post).rotation.y = 0.25;
    }

    // Trodden earth where people circle the tree, and rough grass beyond.
    const worn = s.cylinder(T * 0.3, T * 0.3, 0.012, [T * 0.03, 0.006, 0], new THREE.MeshStandardMaterial({ color: frost > 0.4 ? '#8d8a80' : '#5a4a38', roughness: 1 }), 24);
    worn.scale.set(1.15, 1, 0.9);
    worn.castShadow = false;
    const green = frost > 0.3 ? ['#a9bdb0', '#8fa894', '#c3d2cc'] : mood.warmth > 0.65 ? ['#a7a25a', '#8c9450', '#c2b56b'] : ['#5f7d3c', '#6f8a45', '#4d6b35'];
    const blades: [number, number, number][] = [];
    for (let i = 0; i < Math.round(mix(40, 110, mood.density)); i++) { const angle = random() * 6.28, d = T * mix(0.3, 0.5, random()); blades.push([T * 0.03 + Math.cos(angle) * d * 1.15, 0, Math.sin(angle) * d * 0.9]); }
    s.root.add(tufts(random, blades, green, T * 0.05));

    return s.finish({ footprint: T * 0.42, update: (_dt, time) => pose(time) });
  },
});
