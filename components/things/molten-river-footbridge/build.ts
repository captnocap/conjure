import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = { x: number; y: number };

export default defineThing({
  questions: {
    state: choice('What condition is the bridge in?', {
      intact: 'Whole and taut enough: it can be crossed.',
      burning: 'On fire in the middle, planks charring and flames licking the cables.',
      broken: 'The central span is gone; two torn halves hang down toward the lava.',
      frayed: 'One handrail has snapped and several planks are missing, but it holds.',
      mended: 'Recently mended: a bright patch of new planks and lashings in the middle.',
    }),
    sag: score('How much does it sag?', ['Nearly taut', 'A gentle dip', 'A deep belly', 'Drooping almost into the lava']),
    deck: choice('What is the walkway made of?', {
      ceramic: 'Pale ceramic tiles threaded on cables.',
      slabs: 'Thick dark heat-shield slabs, spaced like stepping stones.',
      grating: 'Continuous steel grating, industrial.',
      scavenged: 'Mismatched scavenged planks and rope, built by desperate hands.',
    }),
    anchors: choice('What holds each end?', {
      pylons: 'Plain ceramic pylons in pairs.',
      aframes: 'Steel A-frames with back-stays.',
      totems: 'Carved stone totems, older than the bridge.',
      bolts: 'Nothing above ground: cables bolted straight into the rock.',
    }),
    span: choice('How wide is the channel?', {
      short: 'A short hop of a few strides.',
      medium: 'A proper crossing, a dozen careful steps.',
      long: 'Long and lonely, a thread across a wide river.',
    }),
    lava: choice('How high is the lava running?', {
      low: 'Low in the channel, a sullen crusted trickle far below.',
      mid: 'Halfway up the banks, flowing steadily.',
      brim: 'Brimming, licking at the top of the banks.',
    }),
    trace: choice('What has been left at the bridgehead?', {
      nothing: 'Nothing.',
      lantern: 'A lit lantern hanging from a post.',
      pack: 'A traveller\'s pack and staff, set down before crossing.',
      sign: 'A warning sign.',
      flags: 'Small prayer flags tied along the handrail.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const seed = random() * 30;
    const L = { short: 3.4, medium: 5.2, long: 7.6 }[a.span];
    const hb = 1.85, depth = 2.9, bank = 1.7;
    const level = { low: 0.3, mid: 0.85, brim: 1.5 }[a.lava];
    const sag = Math.min(mix(0.12, 1.5, a.sag) * (L / 5.2), a.state === 'burning' ? 9 : Math.max(0.14, hb - level - 0.12));
    const hot = mix(0.9, 1.7, mood.warmth);

    // Banks: two rough basalt shoulders.
    const rock = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3d3a3d').lerp(new THREE.Color('#5a4b44'), mood.wear * 0.5), roughness: 0.95, flatShading: true });
    for (const side of [-1, 1]) {
      const g = new THREE.BoxGeometry(bank, hb, depth, 5, 3, 8);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const n = Math.sin(x * 2.3 + seed * side) * Math.cos(z * 1.9 + seed) + Math.sin((y + z) * 3.1 + seed * 2) * 0.5;
        const top = y > hb / 2 - 0.01;
        p.setXYZ(i, x + n * 0.14 + (x * -side > 0 ? -side * (hb / 2 - y) * 0.12 : 0), y + (top ? n * 0.05 : 0), z + n * 0.12);
      }
      g.computeVertexNormals();
      s.mesh(g, rock, [side * (L / 2 + bank / 2 - 0.1), hb / 2, 0]);
    }
    // The river.
    const lavaMat = new THREE.MeshStandardMaterial({ color: '#ee5a16', emissive: '#d63c0a', emissiveIntensity: hot * 0.6, roughness: 0.6 });
    const bright = new THREE.MeshStandardMaterial({ color: '#ffb83a', emissive: '#ff9a1e', emissiveIntensity: hot * 0.8, roughness: 0.5 });
    s.box([L + 0.5, level, depth * 0.97], [0, level / 2, 0], lavaMat);
    for (let i = 0; i < 3; i++) {
      const cx = (i - 1) * L * 0.26 + (random() - 0.5) * 0.4;
      const stream = s.tube(Array.from({ length: 6 }, (_u, j) => [cx + Math.sin(j * 1.4 + seed + i) * L * 0.06, 0, -depth * 0.47 + (j / 5) * depth * 0.94] as const), L * 0.035 + 0.05, bright);
      stream.scale.y = 0.08;
      stream.position.y = level + 0.004;
    }
    const crustCount = Math.round(L * { low: 9, mid: 5, brim: 2.5 }[a.lava]);
    const crust = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.1, 0.06, 6), new THREE.MeshStandardMaterial({ color: '#2b2526', roughness: 1, flatShading: true }), crustCount);
    const rafts = Array.from({ length: crustCount }, () => ({ x: (random() - 0.5) * (L - 0.5), z: random(), size: 0.14 + random() * 0.28, spin: random() * 3, speed: 0.6 + random() * 0.8 }));
    const matrix = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler();
    const drift = (time: number) => {
      rafts.forEach((raft, i) => {
        const z = ((raft.z + time * raft.speed * 0.03) % 1) * depth * 0.9 - depth * 0.45;
        crust.setMatrixAt(i, matrix.compose(new THREE.Vector3(raft.x, level + 0.02, z), quat.setFromEuler(euler.set(0, raft.spin, 0)), new THREE.Vector3(raft.size, 1, raft.size * 0.8)));
      });
      crust.instanceMatrix.needsUpdate = true;
    };
    drift(0);
    s.root.add(crust);

    // Walkway runs: one for a whole bridge, two torn halves for a broken one.
    const runs: P[][] = [];
    if (a.state === 'broken') {
      for (const side of [-1, 1]) {
        const length = L * (0.26 + random() * 0.14), run: P[] = [];
        for (let i = 0; i <= 14; i++) {
          const u = i / 14, drop = Math.min(length * 0.95, hb - level + 0.2);
          run.push({ x: side * (L / 2 - length * 0.8 * u), y: hb + 0.04 - drop * Math.pow(u, 1.8) });
        }
        runs.push(run);
      }
    } else runs.push(Array.from({ length: 29 }, (_u, i) => { const x = -L / 2 + (L * i) / 28; return { x, y: hb + 0.04 - sag * (1 - (2 * x / L) ** 2) }; }));

    const rope = a.deck === 'scavenged';
    const cable = s.material(rope ? '#a58a58' : '#3b3d42', { roughness: rope ? 1 : 0.5, metalness: rope ? 0 : 0.5 });
    const charred = new THREE.Color('#1d1a19');
    const plankSize = { ceramic: [0.26, 0.05, 1.0], slabs: [0.5, 0.1, 0.84], grating: [0.36, 0.03, 0.92], scavenged: [0.28, 0.04, 0.95] }[a.deck];
    const pitch = { ceramic: 0.34, slabs: 0.74, grating: 0.365, scavenged: 0.36 }[a.deck];
    const plankColour = () => new THREE.Color(a.deck === 'ceramic' ? '#e9e3d3' : a.deck === 'slabs' ? '#3f424c' : a.deck === 'grating' ? '#8d949a' : ['#8a6a44', '#b08a5a', '#4a6f8a', '#9a4a2a', '#c9c2b0'][Math.floor(random() * 5)]).multiplyScalar(0.85 + random() * 0.3);
    type Plank = { at: THREE.Vector3; angle: number; colour: THREE.Color; yaw: number; wide: number };
    const planks: Plank[] = [];
    const flames: THREE.Mesh[] = [];
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffb52e', emissive: '#ff7a12', emissiveIntensity: 2, roughness: 0.6 });
    const railHeight = 0.95;
    const hangers: [THREE.Vector3, THREE.Vector3][] = [];
    const cutSide = random() < 0.5 ? -1 : 1;

    for (const run of runs) {
      if (run.length < 2) continue;
      const normal = (i: number) => { const p = run[Math.max(0, i - 1)], q = run[Math.min(run.length - 1, i + 1)]; const d = Math.hypot(q.x - p.x, q.y - p.y) || 1; return { nx: -(q.y - p.y) / d * Math.sign(q.x - p.x || 1), ny: Math.abs(q.x - p.x) / d, angle: Math.atan2(q.y - p.y, q.x - p.x) }; };
      for (const z of [-0.47, 0.47]) {
        s.tube(run.map((p) => [p.x, p.y - 0.04, z] as const), 0.025, cable);
        const rail = run.map((p, i) => { const n = normal(i); return [p.x + n.nx * railHeight, p.y + n.ny * railHeight, z * 1.06] as const; });
        if (a.state === 'frayed' && Math.sign(z) === cutSide && rail.length > 20) {
          const left = rail.slice(0, 10), right = rail.slice(17);
          s.tube([...left, [left[9][0] + 0.15, left[9][1] - 0.6, z * 1.3], [left[9][0] + 0.1, left[9][1] - 1.15, z * 1.35]], 0.02, cable);
          s.tube([[right[0][0] - 0.1, right[0][1] - 1.0, z * 1.3], [right[0][0] - 0.12, right[0][1] - 0.5, z * 1.25], ...right], 0.02, cable);
        } else s.tube(rail, 0.02, cable);
      }
      // Planks at even spacing along the run.
      let carried = pitch * 0.6, index = 0;
      for (let i = 0; i < run.length - 1; i++) {
        const p = run[i], q = run[i + 1], seg = Math.hypot(q.x - p.x, q.y - p.y), angle = Math.atan2(q.y - p.y, q.x - p.x);
        while (carried < seg) {
          const t = carried / seg, x = mix(p.x, q.x, t), y = mix(p.y, q.y, t);
          const middle = Math.abs(x) < L * 0.17;
          let colour = plankColour(), keep = true;
          if (a.state === 'burning' && Math.abs(x) < L * 0.24) {
            colour = middle ? charred.clone() : colour.lerp(charred, 0.6);
            if (middle && random() < 0.3) keep = false;
            if (keep && random() < 0.75) {
              const tall = 0.3 + random() * 0.6;
              const flame = s.mesh(new THREE.ConeGeometry(0.11 + random() * 0.08, tall, 6).translate(0, tall / 2, 0), flameMat, [x, y + 0.02, (random() - 0.5) * 0.7]);
              flames.push(flame);
            }
          } else if (a.state === 'frayed' && Math.abs(x) < L * 0.3 && random() < 0.35) keep = false;
          else if (a.state === 'mended' && middle) colour = new THREE.Color(a.deck === 'scavenged' ? '#e9e3d3' : '#d9a64a').multiplyScalar(0.9 + random() * 0.2);
          else if (mood.wear > 0.6 && random() < (mood.wear - 0.6) * 0.5) keep = false;
          if (keep) planks.push({ at: new THREE.Vector3(x, y, 0), angle, colour, yaw: rope ? (random() - 0.5) * 0.12 : 0, wide: rope ? 0.8 + random() * 0.4 : 1 });
          if (index % (a.deck === 'slabs' ? 1 : 3) === 0) {
            const n = normal(i);
            for (const z of [-0.47, 0.47]) if (!(a.state === 'frayed' && Math.sign(z) === cutSide && Math.abs(x) < L * 0.15)) hangers.push([new THREE.Vector3(x, y - 0.04, z), new THREE.Vector3(x + n.nx * railHeight, y + n.ny * railHeight, z * 1.06)]);
          }
          index++;
          carried += pitch;
        }
        carried -= seg;
      }
    }
    const deck = new THREE.InstancedMesh(new THREE.BoxGeometry(plankSize[0], plankSize[1], plankSize[2]), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.deck === 'ceramic' ? 0.4 : 0.8, metalness: a.deck === 'grating' ? 0.5 : 0 }), Math.max(1, planks.length));
    planks.forEach((plank, i) => {
      deck.setMatrixAt(i, matrix.compose(plank.at, quat.setFromEuler(euler.set(0, plank.yaw, plank.angle)), new THREE.Vector3(plank.wide, 1, 1)));
      deck.setColorAt(i, plank.colour);
    });
    deck.count = planks.length;
    deck.castShadow = deck.receiveShadow = true;
    if (deck.instanceColor) deck.instanceColor.needsUpdate = true;
    s.root.add(deck);
    const ties = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), cable, Math.max(1, hangers.length));
    const upAxis = new THREE.Vector3(0, 1, 0);
    hangers.forEach(([from, to], i) => {
      const d = to.clone().sub(from), length = d.length();
      ties.setMatrixAt(i, matrix.compose(from.clone().addScaledVector(d, 0.5), quat.setFromUnitVectors(upAxis, d.normalize()), new THREE.Vector3(1, length, 1)));
    });
    ties.count = hangers.length;
    ties.castShadow = true;
    s.root.add(ties);
    if (a.state === 'mended') for (const z of [-0.5, 0.5]) for (const x of [-L * 0.17, L * 0.17]) s.ball([0.07, 0.07, 0.07], [x, hb + 0.02 - sag * (1 - (2 * x / L) ** 2), z], s.material('#c7682c'), 8);

    // Anchors.
    const ceramic = s.material('#e3dccb', { roughness: 0.5 }), steel = s.material('#6c7379', { metalness: 0.5, roughness: 0.5 }), carved = s.material('#6a625c', { roughness: 0.95, flatShading: true });
    const eyeGlow = new THREE.MeshStandardMaterial({ color: '#ffb040', emissive: '#ff8a20', emissiveIntensity: 1.6 });
    for (const side of [-1, 1]) for (const z of [-0.5, 0.5]) {
      const x = side * (L / 2 + 0.25), stay = [side * (L / 2 + bank - 0.45), hb, z * 1.6] as const;
      if (a.anchors === 'pylons') { s.cylinder(0.09, 0.13, 1.3, [x, hb + 0.65, z], ceramic, 10); s.ball([0.12, 0.08, 0.12], [x, hb + 1.32, z], steel, 10); s.rod([x, hb + 1.2, z], stay, 0.018, cable); }
      else if (a.anchors === 'aframes') { s.rod([x - 0.35, hb, z], [x, hb + 1.45, z], 0.05, steel); s.rod([x + 0.35, hb, z], [x, hb + 1.45, z], 0.05, steel); s.box([0.42, 0.05, 0.05], [x, hb + 0.7, z], steel); s.rod([x, hb + 1.4, z], stay, 0.018, cable); }
      else if (a.anchors === 'totems') {
        s.box([0.34, 1.5, 0.34], [x, hb + 0.75, z], carved).rotation.y = (random() - 0.5) * 0.2;
        s.box([0.44, 0.26, 0.44], [x, hb + 1.2, z], carved);
        s.box([0.4, 0.12, 0.4], [x, hb + 0.55, z], carved);
        for (const e of [-1, 1]) s.box([0.02, 0.06, 0.08], [x - side * 0.225, hb + 1.2, z + e * 0.1], eyeGlow);
      } else { s.cylinder(0.07, 0.07, 0.1, [x, hb + 0.05, z], steel, 8); s.rod([x, hb + 0.1, z], [x - side * 0.25, hb + 0.95, z * 1.06], 0.02, cable); }
    }

    // What was left at the near bridgehead.
    const hx = -(L / 2 + 0.9);
    if (a.trace === 'lantern') {
      s.rod([hx, hb, 1.0], [hx, hb + 1.5, 1.0], 0.035, steel); s.rod([hx, hb + 1.5, 1.0], [hx + 0.35, hb + 1.5, 1.0], 0.025, steel);
      s.box([0.16, 0.22, 0.16], [hx + 0.35, hb + 1.3, 1.0], new THREE.MeshStandardMaterial({ color: '#ffe19a', emissive: '#ffc04a', emissiveIntensity: 2 }));
      s.box([0.2, 0.03, 0.2], [hx + 0.35, hb + 1.43, 1.0], steel); s.box([0.2, 0.03, 0.2], [hx + 0.35, hb + 1.18, 1.0], steel);
    } else if (a.trace === 'pack') {
      s.ball([0.24, 0.32, 0.2], [hx, hb + 0.3, 1.0], s.material('#7a5a34'), 12); s.box([0.3, 0.12, 0.22], [hx, hb + 0.6, 1.0], s.material('#b23b2a'));
      s.rod([hx + 0.4, hb, 0.9], [hx + 0.25, hb + 1.45, 1.05], 0.022, s.material('#9a7a4a'));
    } else if (a.trace === 'sign') {
      s.rod([hx, hb, 1.1], [hx, hb + 1.2, 1.1], 0.03, steel);
      s.label(['ONE AT A TIME', 'NO CROSSING', 'DO NOT LOOK DOWN', 'TOLL: 1 PRAYER'][Math.floor(random() * 4)], 1.0, 0.36, [hx, hb + 1.2, 1.14], '#1d1d1d', '#e8c53a');
    } else if (a.trace === 'flags' && runs[0].length > 2) {
      const hues = ['#d8372f', '#f0b429', '#2d7fc4', '#3a9a56', '#f2efe6'];
      const flags = [];
      for (const run of runs) for (let i = 1; i < run.length - 1; i++) flags.push(run[i]);
      const cloth = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.2).translate(0, -0.1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.9 }), flags.length);
      flags.forEach((p, i) => { cloth.setMatrixAt(i, matrix.compose(new THREE.Vector3(p.x, p.y + railHeight * 0.98, 0.5), quat.setFromEuler(euler.set((random() - 0.5) * 0.5, 0, 0)), new THREE.Vector3(1, 1, 1))); cloth.setColorAt(i, new THREE.Color(hues[i % hues.length])); });
      if (cloth.instanceColor) cloth.instanceColor.needsUpdate = true;
      s.root.add(cloth);
    }

    const pace = mix(0.4, 2.2, mood.energy);
    return s.finish({
      footprint: L / 2 + bank * 0.8,
      update: (_dt, time) => {
        drift(time * pace);
        lavaMat.emissiveIntensity = hot * 0.6 * (1 + Math.sin(time * 0.8) * 0.08);
        flames.forEach((flame, i) => { flame.scale.set(1 + Math.sin(time * 9 + i) * 0.15, 1 + Math.sin(time * 7 * pace + i * 1.7) * 0.3, 1); });
      },
    });
  },
});
