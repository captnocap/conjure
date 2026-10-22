import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Rail { y: number; z: number; x0: number; x1: number; level: number }

export default defineThing({
  questions: {
    frame: choice('What kind of rack is it?', {
      aframe: 'A tall A-frame of crossed poles, pitched like a roof, with rails up both slopes.',
      flat: 'A flat rack: a table of rails carried high on posts, the fish hanging beneath like a ceiling.',
      'lean-to': 'A single sloping rack, high at the back and low at the front.',
      household: 'A small household rack: two tripods of poles with a couple of rails between them.',
    }),
    stage: choice('Where is the drying season?', {
      bare: 'Bare poles: the rack stands empty, waiting or finished.',
      first: 'The first catch is up: only the lowest rails are hung.',
      full: 'Every rail is heavy with fish from end to end.',
      'taking-down': 'Being stripped: a few top rails are left, and tied bundles are stacked below.',
    }),
    cure: choice('What do the fish look like?', {
      fresh: 'Freshly split and wet: silver-grey skins and pale pink flesh.',
      curing: 'Half dried: greying, yellowing at the edges.',
      stockfish: 'Fully dried stockfish: stiff as boards, the colour of old gold.',
      heads: 'Cod heads strung in knobbly brown bunches, the cheap end of the catch.',
    }),
    visitors: choice('Who is watching the fish?', {
      none: 'Nobody.',
      gulls: 'White gulls perched along the top, waiting their chance.',
      ravens: 'A pair of black ravens.',
      cat: 'A cat sitting underneath, looking up.',
    }),
    extras: choice('What stands beside the rack?', {
      nothing: 'Nothing.',
      ladder: 'A pole ladder leaned against it.',
      baskets: 'Wicker baskets of fish waiting to be hung.',
      barrels: 'Two salt barrels and a gutting bench.',
    }),
    ground: choice('What is it standing on?', {
      rock: 'Bare grey sea rock.',
      snow: 'Trodden snow, with snow lying on the poles.',
      turf: 'Rough coastal turf.',
      shingle: 'Beach shingle.',
    }),
    length: score('How long is the rack?', ['A couple of frames', 'A family\'s rack', 'A long village rack']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const poleTones = mood.wear > 0.5 ? ['#8f8a7f', '#7d786e', '#a09a8c'] : ['#8a6f4c', '#9c7f58', '#77603f'];
    const poles: { a: P3; b: P3; r: number; c: string }[] = [];
    const pole = (from: P3, to: P3, r = 0.045) => poles.push({ a: from, b: to, r, c: pick(poleTones) });
    const rails: Rail[] = [];
    const small = a.frame === 'household';
    const L = small ? mix(1.8, 2.8, a.length) : mix(3, 9.5, a.length);
    const bays = Math.max(1, Math.round(L / 2.2));
    const wobble = () => (random() - 0.5) * mix(0.03, 0.14, mood.wear);
    let top = 3.2, halfDepth = 1.6;
    let perches: P3[] = [];

    if (a.frame === 'aframe') {
      top = 3.3; halfDepth = 1.65;
      for (let i = 0; i <= bays; i++) {
        const x = -L / 2 + (i / bays) * L;
        for (const side of [-1, 1]) pole([x + wobble(), 0, side * halfDepth], [x + wobble(), top + 0.35, -side * 0.18], 0.06);
      }
      pole([-L / 2 - 0.35, top + 0.02, 0], [L / 2 + 0.35, top + 0.02, 0], 0.055);
      rails.push({ y: top + 0.02, z: 0, x0: -L / 2, x1: L / 2, level: 1 });
      for (const side of [-1, 1]) for (let k = 0; k < 5; k++) {
        const f = 0.3 + k * 0.14, y = f * top, z = side * (halfDepth - f * (halfDepth + 0.05) + 0.06);
        pole([-L / 2 - 0.3, y + wobble(), z], [L / 2 + 0.3, y + wobble(), z], 0.04);
        rails.push({ y, z, x0: -L / 2 - 0.15, x1: L / 2 + 0.15, level: f });
      }
      for (const side of [-1, 1]) pole([-L / 2, 0.3, side * halfDepth * 0.9], [-L / 2 + Math.min(2.2, L), top * 0.9, side * 0.2], 0.035);
      perches = Array.from({ length: 6 }, () => [(random() - 0.5) * L, top + 0.08, 0] as P3);
    }
    if (a.frame === 'flat') {
      top = 2.5; halfDepth = 1.3;
      for (let i = 0; i <= bays; i++) {
        const x = -L / 2 + (i / bays) * L;
        for (const side of [-1, 1]) pole([x + wobble(), 0, side * halfDepth + wobble()], [x + wobble(), top + 0.15, side * halfDepth], 0.07);
        pole([x, top, -halfDepth - 0.3], [x, top, halfDepth + 0.3], 0.055);
        if (i < bays) for (const side of [-1, 1]) pole([x, top * 0.55, side * halfDepth], [x + 0.9, top - 0.03, side * halfDepth], 0.035);
      }
      for (let k = 0; k < 8; k++) {
        const z = -halfDepth + (k / 7) * halfDepth * 2, y = top + 0.09;
        pole([-L / 2 - 0.3, y + wobble() * 0.3, z], [L / 2 + 0.3, y + wobble() * 0.3, z], 0.04);
        rails.push({ y, z, x0: -L / 2 - 0.15, x1: L / 2 + 0.15, level: k % 2 ? 0.4 : 0.9 });
      }
      perches = Array.from({ length: 6 }, () => [(random() - 0.5) * L, top + 0.14, pick([-halfDepth, 0, halfDepth * 0.43])] as P3);
    }
    if (a.frame === 'lean-to') {
      top = 3.0; halfDepth = 1.4;
      const low = 1.15;
      for (let i = 0; i <= bays; i++) {
        const x = -L / 2 + (i / bays) * L;
        pole([x + wobble(), 0, -halfDepth], [x + wobble(), top + 0.2, -halfDepth], 0.065);
        pole([x + wobble(), 0, halfDepth], [x + wobble(), low + 0.15, halfDepth], 0.06);
        pole([x, top, -halfDepth - 0.25], [x, low - 0.12, halfDepth + 0.3], 0.05);
        pole([x, 0.2, -halfDepth + 1.1], [x, top * 0.8, -halfDepth], 0.035);
      }
      for (let k = 0; k < 7; k++) {
        const f = k / 6, z = -halfDepth + f * halfDepth * 2, y = mix(top, low - 0.05, f) + 0.09;
        pole([-L / 2 - 0.3, y, z], [L / 2 + 0.3, y, z], 0.04);
        rails.push({ y, z, x0: -L / 2 - 0.15, x1: L / 2 + 0.15, level: 1 - f });
      }
      perches = Array.from({ length: 6 }, () => [(random() - 0.5) * L, top + 0.14, -halfDepth] as P3);
    }
    if (small) {
      top = 2.1; halfDepth = 0.7;
      for (const x of [-L / 2, L / 2]) for (let k = 0; k < 3; k++) {
        const angle = (k / 3) * Math.PI * 2 + 0.5;
        pole([x + Math.cos(angle) * 0.55, 0, Math.sin(angle) * 0.7], [x - Math.cos(angle) * 0.07, top + 0.3, -Math.sin(angle) * 0.07], 0.045);
      }
      pole([-L / 2 - 0.3, top + 0.03, 0], [L / 2 + 0.3, top + 0.03, 0], 0.04);
      rails.push({ y: top + 0.03, z: 0, x0: -L / 2 + 0.1, x1: L / 2 - 0.1, level: 1 });
      pole([-L / 2 - 0.1, top * 0.66, 0.22], [L / 2 + 0.1, top * 0.66, 0.22], 0.035);
      rails.push({ y: top * 0.66, z: 0.22, x0: -L / 2 + 0.2, x1: L / 2 - 0.2, level: 0.3 });
      perches = Array.from({ length: 4 }, () => [(random() - 0.5) * L * 0.8, top + 0.07, 0] as P3);
    }

    // The structure, as one instanced mesh.
    const wood = s.material('#ffffff');
    const poleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.85, 1, 1, 7), wood, poles.length);
    const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4();
    poles.forEach((p, i) => {
      const from = new THREE.Vector3(...p.a), dir = new THREE.Vector3(...p.b).sub(from), length = dir.length();
      q.setFromUnitVectors(up, dir.normalize());
      m.compose(from.addScaledVector(dir, length / 2), q, new THREE.Vector3(p.r, length, p.r));
      poleMesh.setMatrixAt(i, m);
      poleMesh.setColorAt(i, new THREE.Color(p.c));
    });
    poleMesh.castShadow = poleMesh.receiveShadow = true;
    s.root.add(poleMesh);

    // Fish: one tapered split body with a tail fin, hanging from the origin.
    const heads = a.cure === 'heads';
    const bodyProfile = heads
      ? [[0.012, 0], [0.05, -0.12], [0.11, -0.45], [0.12, -0.8], [0.07, -1], [0, -1]]
      : [[0.014, 0], [0.04, -0.25], [0.085, -0.7], [0.095, -0.88], [0.06, -1], [0, -1]];
    const body = new THREE.LatheGeometry(bodyProfile.map(([x, y]) => new THREE.Vector2(x, y)), 6);
    const fin = new THREE.ConeGeometry(0.06, 0.13, 4);
    fin.rotateX(Math.PI); fin.translate(0, 0.07, 0);
    const fishGeometry = mergeGeometries([body, fin])!;
    body.dispose(); fin.dispose();
    const palette = {
      fresh: ['#c9ccd0', '#e3c2bb', '#aab3bb', '#d8cfc9'],
      curing: ['#c2bda9', '#b3ad98', '#cfc19a', '#a9a595'],
      stockfish: ['#c9a85c', '#b8974e', '#d6bb78', '#a88a4a'],
      heads: ['#8a7355', '#75624a', '#9a8463', '#6a5843'],
    }[a.cure];
    const fishAt: { p: P3; len: number; lean: number; spin: number; phase: number; c: string }[] = [];
    const spacing = mix(0.3, 0.15, mood.density) * (heads ? 1.5 : 1);
    for (const rail of rails) {
      const filled = { bare: 0, first: rail.level < 0.5 ? 0.9 : 0, full: 1, 'taking-down': rail.level > 0.8 ? 0.7 : rail.level > 0.6 ? 0.15 : 0 }[a.stage];
      if (!filled) continue;
      let gap = 0;
      for (let x = rail.x0; x < rail.x1; x += spacing * (0.8 + random() * 0.4)) {
        if (gap > 0) { gap--; continue; }
        if (random() > filled) { gap = 1 + Math.floor(random() * 6); continue; }
        for (const side of [-1, 1]) fishAt.push({
          p: [x + (random() - 0.5) * 0.04, rail.y - 0.02, rail.z + side * 0.05],
          len: (heads ? 0.42 : mix(0.5, 0.8, random())) * (small ? 0.85 : 1),
          lean: side * (0.05 + random() * 0.08), spin: (random() - 0.5) * 0.9, phase: random() * 6.3, c: pick(palette),
        });
      }
    }
    let fishMesh: THREE.InstancedMesh | null = null;
    const euler = new THREE.Euler(), scale = new THREE.Vector3(), at = new THREE.Vector3();
    const swing = mix(0.01, 0.16, mood.energy);
    const poseFish = (time: number) => {
      if (!fishMesh) return;
      fishAt.forEach((fish, i) => {
        euler.set(fish.lean + Math.sin(time * 1.6 + fish.phase + fish.p[0] * 0.8) * swing, fish.spin, 0, 'XYZ');
        q.setFromEuler(euler);
        const stiff = a.cure === 'stockfish' ? 0.3 : 0.45;
        m.compose(at.set(...fish.p), q, scale.set(fish.len, fish.len, fish.len * stiff));
        fishMesh!.setMatrixAt(i, m);
      });
      fishMesh.instanceMatrix.needsUpdate = true;
    };
    if (fishAt.length) {
      fishMesh = new THREE.InstancedMesh(fishGeometry, s.material('#ffffff', { roughness: a.cure === 'fresh' ? 0.35 : 0.8 }), fishAt.length);
      fishAt.forEach((fish, i) => fishMesh!.setColorAt(i, new THREE.Color(fish.c)));
      fishMesh.castShadow = fishMesh.receiveShadow = true;
      poseFish(0);
      s.root.add(fishMesh);
    } else fishGeometry.dispose();

    // Ground patch.
    const groundColour = { rock: '#8b8d8c', snow: '#eef1f3', turf: '#7c8456', shingle: '#9c9a92' }[a.ground];
    const groundMat = s.material(groundColour);
    const gx = L / 2 + 1.1, gz = halfDepth + 1.0;
    if (a.ground === 'rock') {
      for (let i = 0; i < 9; i++) s.ball([gx * (0.3 + random() * 0.35), 0.1 + random() * 0.1, gz * (0.3 + random() * 0.35)], [(random() - 0.5) * gx * 1.1, 0, (random() - 0.5) * gz * 1.1], s.material(pick(['#8b8d8c', '#7b7e80', '#9a9b97'])), 9).rotation.y = random() * 3;
    } else {
      s.ball([gx, a.ground === 'snow' ? 0.16 : 0.09, gz], [0, 0, 0], groundMat, 22);
    }
    if (a.ground === 'shingle') {
      const pebbles = Array.from({ length: 140 }, () => ({ at: [(random() - 0.5) * gx * 1.7, 0.06, (random() - 0.5) * gz * 1.7] as P3, size: 0.04 + random() * 0.07, color: pick(['#8b8d8c', '#b5b2a8', '#6f7273', '#a39a8c']) }));
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#ffffff'), pebbles.filter((p) => (p.at[0] / gx) ** 2 + (p.at[2] / gz) ** 2 < 0.85));
    }
    if (a.ground === 'turf') {
      const tuft = new THREE.ConeGeometry(0.03, 0.3, 4);
      tuft.translate(0, 0.15, 0);
      const tufts = Array.from({ length: Math.round(mix(40, 120, mood.density)) }, () => ({ at: [(random() - 0.5) * gx * 1.6, 0.05, (random() - 0.5) * gz * 1.6] as P3, size: 0.6 + random(), color: pick(['#8a9258', '#a3a46a', '#6c7a48']) }));
      s.scatter(tuft, s.material('#ffffff'), tufts.filter((p) => (p.at[0] / gx) ** 2 + (p.at[2] / gz) ** 2 < 0.8));
    }
    if (a.ground === 'snow') {
      const snow = s.material('#f6f8fa');
      for (const rail of rails.filter((r) => r.level > 0.85 || a.frame === 'flat')) {
        const cap = s.cylinder(0.05, 0.05, rail.x1 - rail.x0 + 0.3, [0, rail.y + 0.06, rail.z], snow, 7);
        cap.rotation.z = Math.PI / 2;
        cap.scale.set(1, 1, 1.2);
      }
      for (let i = 0; i < 5; i++) s.ball([0.5 + random() * 0.6, 0.14 + random() * 0.12, 0.4 + random() * 0.4], [(random() - 0.5) * gx * 1.5, 0.08, (random() < 0.5 ? -1 : 1) * gz * (0.6 + random() * 0.3)], snow, 10);
    }
    const floorY = a.ground === 'snow' ? 0.14 : 0.07;

    // Visitors.
    const bird = (spot: P3, bodyColour: string, wingColour: string, beak: string, size: number) => {
      const g = new Sculpture(context);
      g.ball([0.1, 0.085, 0.17], [0, 0.12, 0], s.material(bodyColour), 10).rotation.x = -0.35;
      for (const side of [-1, 1]) g.ball([0.03, 0.06, 0.16], [side * 0.08, 0.14, -0.04], s.material(wingColour), 8).rotation.x = -0.25;
      g.ball([0.055, 0.055, 0.06], [0, 0.24, 0.12], s.material(bodyColour), 10);
      g.cylinder(0, 0.018, 0.08, [0, 0.235, 0.2], s.material(beak), 6).rotation.x = Math.PI / 2;
      g.box([0.05, 0.02, 0.13], [0, 0.1, -0.2], s.material(wingColour)).rotation.x = 0.3;
      for (const side of [-1, 1]) g.rod([side * 0.03, 0.06, 0.02], [side * 0.03, 0, 0.03], 0.008, s.material(beak));
      g.root.scale.setScalar(size);
      g.root.position.set(...spot);
      g.root.rotation.y = (random() - 0.5) * 2.5 + (random() < 0.3 ? Math.PI : 0);
      s.root.add(g.root);
    };
    if (a.visitors === 'gulls') for (const spot of perches.slice(0, 2 + Math.round(mood.density * 3))) bird(spot, '#f2f2ee', '#9aa3ab', '#e2b23a', 1.5);
    if (a.visitors === 'ravens') for (const spot of perches.slice(0, 2)) bird(spot, '#1c1c20', '#15151a', '#2a2a2e', 1.8);
    if (a.visitors === 'cat') {
      const g = new Sculpture(context);
      const fur = s.material(pick(['#c98a45', '#3a3632', '#b9b4aa', '#8a7a66']));
      g.lathe([[0, 0], [0.11, 0.01], [0.13, 0.1], [0.1, 0.24], [0.07, 0.33], [0, 0.35]], fur);
      g.ball([0.075, 0.07, 0.07], [0, 0.4, 0.05], fur, 12).rotation.x = -0.5;
      for (const side of [-1, 1]) {
        g.cylinder(0, 0.03, 0.06, [side * 0.045, 0.475, 0.02], fur, 4);
        g.cylinder(0.022, 0.026, 0.2, [side * 0.05, 0.1, 0.1], fur, 8);
      }
      g.tube([[0.08, 0.03, -0.08], [0.2, 0.03, -0.05], [0.24, 0.04, 0.1], [0.16, 0.05, 0.2]], 0.02, fur);
      g.root.scale.setScalar(1.25);
      g.root.position.set((random() - 0.5) * L * 0.5, floorY, halfDepth + 0.35);
      g.root.rotation.y = Math.PI + (random() - 0.5) * 0.8;
      s.root.add(g.root);
    }

    // Things beside the rack.
    const side = random() < 0.5 ? -1 : 1;
    if (a.extras === 'ladder') {
      const x = side * L * 0.2, footZ = halfDepth + 0.9, headZ = a.frame === 'aframe' ? halfDepth * 0.25 : halfDepth * (small ? 0.1 : 0.95), headY = a.frame === 'lean-to' ? 1.5 : top * 0.92;
      for (const dx of [-0.22, 0.22]) s.rod([x + dx, floorY, footZ], [x + dx, headY, headZ], 0.03, s.material('#9c7f58'));
      for (let i = 1; i < 8; i++) s.rod([x - 0.24, mix(floorY, headY, i / 8), mix(footZ, headZ, i / 8)], [x + 0.24, mix(floorY, headY, i / 8), mix(footZ, headZ, i / 8)], 0.02, s.material('#8a6f4c'));
    }
    if (a.extras === 'baskets') {
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
        const x = side * (L * 0.15 + i * 0.75) - side * 0.4, z = halfDepth + 0.6 + random() * 0.3;
        s.lathe([[0, 0], [0.22, 0], [0.3, 0.34], [0.32, 0.36], [0.27, 0.34], [0.2, 0.04], [0, 0.04]], s.material('#b08d57'), [x, floorY, z]);
        for (const y of [0.1, 0.2, 0.3]) s.ring(0.235 + y * 0.23, 0.012, [x, floorY + y, z], s.material('#8f7040')).rotation.x = Math.PI / 2;
        for (let f = 0; f < 6; f++) {
          const fish = s.ball([0.05, 0.05, 0.22], [x + (random() - 0.5) * 0.25, floorY + 0.33 + random() * 0.05, z + (random() - 0.5) * 0.25], s.material(pick(palette)), 8);
          fish.rotation.set((random() - 0.5) * 0.6, random() * 3, 0);
        }
      }
    }
    if (a.extras === 'barrels') {
      for (let i = 0; i < 2; i++) {
        const x = side * (L * 0.25 + i * 0.75), z = halfDepth + 0.7;
        s.lathe([[0, 0], [0.24, 0], [0.3, 0.2], [0.31, 0.4], [0.3, 0.6], [0.24, 0.8], [0.2, 0.8], [0.2, 0.76], [0, 0.76]], s.material('#7a5d3c'), [x, floorY, z]);
        for (const y of [0.08, 0.3, 0.52, 0.73]) s.ring(0.262 + (y > 0.2 && y < 0.6 ? 0.05 : 0), 0.012, [x, floorY + y, z], s.material('#4f3d2a')).rotation.x = Math.PI / 2;
        if (i === 0) s.cylinder(0.2, 0.2, 0.03, [x, floorY + 0.77, z], s.material('#eef0ee'), 14);
      }
      const bx = -side * L * 0.2, bz = halfDepth + 0.8;
      s.box([1.3, 0.06, 0.5], [bx, floorY + 0.75, bz], s.material('#9c7f58'));
      for (const dx of [-0.55, 0.55]) for (const dz of [-0.18, 0.18]) s.rod([bx + dx * 1.1, floorY, bz + dz * 1.4], [bx + dx, floorY + 0.74, bz + dz], 0.03, s.material('#8a6f4c'));
      s.ball([0.07, 0.04, 0.3], [bx - 0.2, floorY + 0.81, bz], s.material(pick(palette)), 8).rotation.y = 0.4;
      s.box([0.03, 0.01, 0.22], [bx + 0.35, floorY + 0.79, bz + 0.05], s.material('#b9bdc1', { metalness: 0.7, roughness: 0.3 })).rotation.y = -0.5;
    }
    if (a.stage === 'taking-down') {
      const gold = a.cure === 'fresh' ? palette : ['#c9a85c', '#b8974e', '#d6bb78'];
      for (let i = 0; i < 5 + Math.round(mood.density * 4); i++) {
        const layer = i < 4 ? 0 : i < 7 ? 1 : 2, x = -side * (L * 0.2) + ((i % 4) - 1.5) * 0.36 + layer * 0.18, z = halfDepth + 0.4 + (layer % 2) * 0.05;
        const bundle = s.cylinder(0.16, 0.17, 0.75, [x, floorY + 0.16 + layer * 0.3, z], s.material(pick(gold)), 9);
        bundle.rotation.x = Math.PI / 2;
        bundle.rotation.z = (random() - 0.5) * 0.2;
        for (const dz of [-0.2, 0.2]) s.ring(0.172, 0.012, [x, floorY + 0.16 + layer * 0.3, z + dz], s.material('#4f3d2a'));
      }
    }

    return s.finish({ footprint: Math.max(L / 2, halfDepth) + 0.5, update: fishMesh && swing > 0.02 ? (_dt, time) => poseFish(time) : undefined });
  },
});
