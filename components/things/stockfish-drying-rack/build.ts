import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    size: score('How large is the rack?', ['One small family frame', 'A village rack a few bays long', 'A cathedral of poles running along the shore']),
    load: score('How much fish hangs on it?', ['Bare poles', 'A few rows', 'Half hung', 'Every pole heavy with fish']),
    catch: choice('What is hanging?', {
      cod: 'Whole split cod tied in pairs by the tail, the export grade.',
      heads: 'Bundles of cod heads strung on cords, dark and toothy, bound for soup far away.',
      mixed: 'Cod bodies on the upper poles and strings of heads below.',
    }),
    stage: choice('How far along is the drying?', {
      fresh: 'Just hung: wet, heavy, silver-grey, still dripping.',
      curing: 'Weeks in: stiffening and turning pale gold.',
      harvest: 'Ready: bone-dry straw-coloured fish being taken down, a ladder up and bundles stacked below.',
      forgotten: 'Never collected: blackened leathery remnants on a rack nobody tends.',
    }),
    birds: choice('What birds attend it?', {
      none: 'None.',
      gulls: 'White gulls perched along the ridge waiting for a chance.',
      ravens: 'Ravens, black and patient.',
    }),
    ground: choice('What does it stand on?', {
      rock: 'Bare grey rock at the edge of the sea.',
      grass: 'Rough green turf with boulders weighting the feet.',
      snow: 'Hard late-winter snow.',
    }),
    net: noul('Is a bird net draped over one side?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.max(mood.wear, a.stage === 'forgotten' ? 0.75 : 0);
    const bays = Math.max(1, Math.round(mix(1, 6, a.size)));
    const bay = mix(2.6, 3.2, random());
    const length = bays * bay;
    const H = mix(4.6, 8.2, a.size), half = H * 0.42;
    const poleTone = () => new THREE.Color('#8f8a80').offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.12);
    const pole = s.material('#8f8a80', { roughness: 1 });
    const poleDark = s.material('#6b655c', { roughness: 1 });
    void poleTone;

    // Ground pad.
    const groundColour = { rock: '#85878a', grass: '#6f8448', snow: '#eef2f4' }[a.ground];
    const phase = random() * 6;
    const padGeometry = new THREE.IcosahedronGeometry(1, 3);
    const padPosition = padGeometry.attributes.position;
    for (let i = 0; i < padPosition.count; i++) {
      const px0 = padPosition.getX(i), pz0 = padPosition.getZ(i);
      const bump = 1 + Math.sin(px0 * 9 + phase) * Math.cos(pz0 * 7 + phase * 1.7) * (a.ground === 'rock' ? 0.09 : 0.03);
      padPosition.setXYZ(i, padPosition.getX(i) * bump, Math.max(padPosition.getY(i), -0.2) * bump, padPosition.getZ(i) * bump);
    }
    padGeometry.computeVertexNormals();
    const pad = s.mesh(padGeometry, new THREE.MeshStandardMaterial({ color: groundColour, roughness: 1, flatShading: a.ground === 'rock' }), [0, -0.05, 0]);
    pad.scale.set(length / 2 + 2.2, 0.38, half + 2);
    const groundY = (x: number, z: number) => 0.38 * Math.sqrt(Math.max(0, 1 - (x / (length / 2 + 2.2)) ** 2 - (z / (half + 2)) ** 2)) - 0.08;

    // A-frames: crossed poles, the ends running past the crossing.
    const lean = (random() - 0.5) * wear * 0.5;
    const frameX: number[] = [];
    for (let i = 0; i <= bays; i++) {
      const x = -length / 2 + i * bay;
      frameX.push(x);
      const tilt = lean + (random() - 0.5) * 0.15 * wear;
      for (const side of [-1, 1]) {
        if (wear > 0.8 && random() < 0.12) continue;
        const foot: [number, number, number] = [x + (random() - 0.5) * 0.1, groundY(x, side * half) - 0.1, side * half];
        const topPoint: [number, number, number] = [x + tilt + side * 0.07, H * 1.09, -side * half * 0.09];
        s.rod(foot, topPoint, 0.11, i % 2 ? pole : poleDark, 0.07);
        // Foot stones.
        for (let k = 0; k < 3; k++) s.ball([0.28 + random() * 0.15, 0.2, 0.26 + random() * 0.15], [foot[0] + (random() - 0.5) * 0.6, foot[1] + 0.2, foot[2] + side * 0.2 + (random() - 0.5) * 0.5], s.material(['#77797a', '#8e8e89', '#6a6c6c'][k]), 8);
      }
      // Tie beam.
      s.rod([x, H * 0.4, -half * 0.6], [x, H * 0.4, half * 0.6], 0.07, poleDark);
    }
    // Ridge pole and end braces.
    s.rod([-length / 2 - 0.9, H + 0.02, 0], [length / 2 + 0.9 + lean, H + 0.02, 0], 0.1, poleDark, 0.07);
    for (const end of [-1, 1]) for (const side of [-1, 1]) s.rod([end * (length / 2 + 1.8), groundY(end * (length / 2 + 1.8), 0) - 0.1, side * 0.3], [end * (length / 2 - 0.2), H * 0.8, side * half * 0.2], 0.08, pole, 0.05);

    // Hanging rails on both slopes, each carrying its own swinging row.
    const levels = Math.max(3, Math.round(H / 1.25));
    const fishColour = { fresh: ['#9aa3a6', '#b3babb', '#878f93', '#c2c5c0'], curing: ['#d9c58c', '#cdb67a', '#e3d3a4', '#bfa86e'], harvest: ['#e6d8a8', '#d9c78e', '#efe5c2', '#c9b57c'], forgotten: ['#4a4038', '#5c5046', '#3a332d', '#6b5d4c'] }[a.stage];
    const headColour = ['#6b5a44', '#7d6a4f', '#57483a', '#8a7758'];
    const body = new THREE.ConeGeometry(0.11, 0.85, 5);
    body.scale(1, 1, 0.42);
    body.translate(0, -0.47, 0);
    const tail = new THREE.ConeGeometry(0.07, 0.14, 3);
    tail.scale(1, 1, 0.3);
    tail.rotateX(Math.PI);
    tail.translate(0, 0.02, 0);
    const bunch = new THREE.IcosahedronGeometry(0.2, 0);
    bunch.scale(0.8, 1.5, 0.8);
    bunch.translate(0, -0.42, 0);
    const rows: THREE.Object3D[] = [];
    const filled = a.stage === 'forgotten' ? Math.min(a.load, 0.35) * 0.6 + 0.08 : a.load;
    for (const side of [-1, 1])
      for (let level = 0; level < levels; level++) {
        const t = (level + 1) / (levels + 0.6);
        const y = H * t, z = side * half * (1 - t) * 0.985 + side * 0.13;
        const sagging = wear > 0.6 && random() < 0.25;
        s.rod([-length / 2 - 0.5, y, z], [length / 2 + 0.5, y - (sagging ? 0.4 : 0), z], 0.055, level % 2 ? pole : poleDark);
        // Fill from the top down; the harvest strips the lower poles first.
        const order = (levels - 1 - level) / levels;
        const share = Math.max(0, Math.min(1, (filled * 1.15 - order * 0.75) * (a.stage === 'harvest' && side > 0 && level < levels / 2 ? 0.15 : 1)));
        if (share <= 0.02 || sagging) continue;
        const heads = a.catch === 'heads' || (a.catch === 'mixed' && level < levels / 2);
        const step = heads ? 0.42 : 0.2;
        const points: { x: number; drop: number; turn: number; scale: number }[] = [];
        // Fish go up a section at a time, so gaps come in runs.
        let run = 0, on = true;
        for (let x = -length / 2 - 0.3; x < length / 2 + 0.3; x += step) {
          if (run <= 0) { on = random() < share; run = 3 + Math.floor(random() * 10); }
          run--;
          if (!on) continue;
          for (const pair of heads ? [0] : [-1, 1]) points.push({ x: x + (random() - 0.5) * 0.05, drop: pair * 0.07, turn: (random() - 0.5) * 0.7, scale: 1 + random() * 0.5 });
        }
        if (!points.length) continue;
        const material = new THREE.MeshStandardMaterial({ roughness: a.stage === 'fresh' ? 0.35 : 0.9, flatShading: true });
        const palette = heads ? headColour : fishColour;
        const row = new THREE.Group();
        row.position.set(0, y - 0.03, z);
        const add = (geometry: THREE.BufferGeometry) => {
          const mesh = new THREE.InstancedMesh(geometry, material, points.length);
          const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
          points.forEach((p, index) => {
            e.set(0, p.turn, 0);
            q.setFromEuler(e);
            m.compose(new THREE.Vector3(p.x, 0, p.drop), q, new THREE.Vector3(p.scale, p.scale, p.scale));
            mesh.setMatrixAt(index, m);
            mesh.setColorAt(index, new THREE.Color(palette[Math.floor(random() * palette.length)]));
          });
          mesh.castShadow = mesh.receiveShadow = true;
          row.add(mesh);
        };
        add(heads ? bunch : body);
        if (!heads) add(tail);
        s.root.add(row);
        rows.push(row);
      }

    if (a.net) {
      const slopeLen = Math.hypot(H, half);
      const net = new THREE.Mesh(new THREE.PlaneGeometry(length + 0.6, slopeLen * 0.8, Math.round(length * 2), 12), new THREE.MeshStandardMaterial({ color: '#2f6f6a', wireframe: true }));
      net.rotation.x = -Math.atan2(half, H) + Math.PI;
      net.position.set(0, H * 0.56, -half * 0.44 - 0.32);
      net.rotation.y = Math.PI;
      net.rotation.x = Math.atan2(half, H);
      s.root.add(net);
    }
    if (a.stage === 'fresh') {
      // Drip stains darken the ground beneath.
      for (let i = 0; i < 10; i++) s.cylinder(0.3 + random() * 0.4, 0.3, 0.02, [(random() - 0.5) * length, groundY(0, 0) + 0.02, (random() - 0.5) * half], s.material('#4d5356', { roughness: 0.3 }), 10);
    }
    if (a.stage === 'harvest') {
      // Ladder against the stripped side, bundles stacked on a pallet.
      const lx = mix(-length / 2 + 0.6, length / 2 - 0.6, random()), top = H * 0.62;
      const lz0 = half + 1.2, lz1 = half * (1 - 0.62) + 0.3;
      for (const dx of [-0.25, 0.25]) s.rod([lx + dx, groundY(lx, lz0), lz0], [lx + dx, top, lz1], 0.035, s.material('#c9ad7e'));
      for (let i = 1; i < 12; i++) s.rod([lx - 0.25, mix(0.1, top, i / 12), mix(lz0, lz1, i / 12)], [lx + 0.25, mix(0.1, top, i / 12), mix(lz0, lz1, i / 12)], 0.022, s.material('#c9ad7e'));
      const px = lx + (lx > 0 ? -2.2 : 2.2), pz = half + 1.1, py = groundY(px, pz) + 0.05;
      s.box([1.3, 0.14, 1.1], [px, py + 0.07, pz], s.material('#a58a62'));
      const stacks = 2 + Math.round(mood.density * 4);
      for (let i = 0; i < stacks; i++) {
        const bundle = s.cylinder(0.22, 0.26, 1, [px - 0.35 + (i % 2) * 0.6, py + 0.38 + Math.floor(i / 2) * 0.44, pz + (random() - 0.5) * 0.1], s.material(fishColour[i % 4]), 7);
        bundle.rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.3);
        s.ring(0.25, 0.02, [bundle.position.x, bundle.position.y, bundle.position.z], s.material('#3a3a3a'));
      }
    }
    if (a.birds !== 'none') {
      const colour = a.birds === 'gulls' ? '#f1f1ec' : '#131314';
      const feather = s.material(colour, { roughness: 0.8 });
      const count = 3 + Math.round(mood.density * 7);
      for (let i = 0; i < count; i++) {
        const x = (random() - 0.5) * (length + 1.4);
        const turn = random() * Math.PI * 2;
        const bird = s.ball([0.12, 0.14, 0.27], [x, H + 0.27, 0], feather, 8);
        bird.rotation.y = turn;
        s.ball([0.08, 0.08, 0.09], [x + Math.sin(turn) * 0.2, H + 0.44, Math.cos(turn) * 0.2], feather, 6);
        if (a.birds === 'gulls') s.ball([0.1, 0.05, 0.2], [x - Math.sin(turn) * 0.12, H + 0.3, -Math.cos(turn) * 0.12], s.material('#8d9499'), 6).rotation.y = turn;
      }
    }
    if (a.ground === 'snow' || mood.warmth < 0.2) for (const x of frameX) s.ball([0.5, 0.12, 0.22], [x, H * 1.09 + 0.03, 0], s.material('#f3f5f7'), 8);

    const wind = mix(0.02, 0.2, mood.energy);
    return s.finish({
      footprint: Math.max(length / 2 + 1, half + 1),
      update: (_dt, time) => { rows.forEach((row, index) => { row.rotation.x = Math.sin(time * mix(0.6, 2.4, mood.energy) + index * 0.9) * wind; }); },
    });
  },
});
