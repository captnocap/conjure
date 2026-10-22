import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    moment: choice('What moment is this?', {
      soaring: 'Aloft and level, hanging quietly under a full wing.',
      banking: 'Carving a steep turn, wing tilted, pilot swung out wide.',
      launching: 'The launch run: wing overhead, pilot leaning forward with feet still on the ground.',
      spread: 'Before launch: the wing laid out in a horseshoe on the grass, lines sorted, pilot standing ready.',
      tuck: 'Aloft with one wingtip folded under in a collapse, a bad second.',
    }),
    livery: choice('What colours is the wing?', {
      sunset: 'Hot orange with a white leading band and deep red tips.',
      lime: 'Acid lime with navy tips and a navy centre stripe.',
      rainbow: 'Broad rainbow bands across the span.',
      redwhite: 'Signal red with clean white tips.',
      candy: 'Pink, purple and teal diagonals from the 1990s.',
      plain: 'Plain white with a single sky-blue stripe.',
    }),
    sport: score('How sporty is the wing?', ['A fat, forgiving school wing', 'A weekend cross-country wing', 'A slender competition blade with dozens of cells']),
    pilot: choice('How does the pilot hang?', {
      seated: 'Sitting upright in an open harness, legs dangling.',
      pod: 'Lying back in a streamlined cocoon harness.',
      tandem: 'A tandem: pilot behind, passenger dangling in front.',
    }),
    below: choice('If it is aloft, what is beneath it?', {
      spur: 'A jagged rock spur it is skimming past.',
      firs: 'The pointed tops of dark firs.',
      cloud: 'A bank of white cloud.',
      knoll: 'A grassy launch knoll with a windsock.',
    }),
    trail: choice('What trails behind?', {
      nothing: 'Nothing.',
      streamer: 'A long ribbon streamer.',
      smoke: 'A plume of coloured display smoke.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const aloft = a.moment === 'soaring' || a.moment === 'banking' || a.moment === 'tuck';
    const flat = a.moment === 'spread';
    const R = mix(6.0, 7.2, a.sport), thetaMax = mix(0.82, 0.98, a.sport), c0 = mix(3.1, 2.1, a.sport), cells = Math.round(mix(14, 34, a.sport));
    const fadeTo = new THREE.Color('#d9d6cf');
    const col = (hex: string) => new THREE.Color(hex).lerp(fadeTo, mood.wear * 0.2);
    const palettes: Record<typeof a.livery, THREE.Color[]> = {
      sunset: [col('#ff7a1a'), col('#fff6e6'), col('#b3161c')],
      lime: [col('#9fd41a'), col('#182a5c'), col('#182a5c')],
      rainbow: ['#e3262d', '#ff8a1a', '#f6d21e', '#3fae4a', '#2f7fd6', '#7a3fb8'].map(col),
      redwhite: [col('#d8202a'), col('#ffffff'), col('#ffffff')],
      candy: [col('#ff5aa8'), col('#7a3fb8'), col('#22b8b0')],
      plain: [col('#f6f6f2'), col('#3d9be0'), col('#f6f6f2')],
    };
    const pal = palettes[a.livery];
    const colour = (u: number, x: number): THREE.Color => {
      const au = Math.abs(u);
      switch (a.livery) {
        case 'sunset': return au > 0.72 ? pal[2] : x < 0.22 ? pal[1] : pal[0];
        case 'lime': return au > 0.7 || au < 0.07 ? pal[1] : pal[0];
        case 'rainbow': return pal[Math.min(5, Math.floor((u + 1) / 2 * 6))];
        case 'redwhite': return au > 0.6 ? pal[1] : pal[0];
        case 'candy': return pal[((Math.floor((u + 1) * 3 + x * 2.2) % 3) + 3) % 3];
        default: return x > 0.3 && x < 0.5 ? pal[1] : pal[0];
      }
    };

    // The canopy: one skin swept across the span, pinched at every rib.
    const xs = [0, 0.04, 0.15, 0.35, 0.6, 0.85, 1, 0.85, 0.6, 0.35, 0.15, 0.04];
    const tuck = a.moment === 'tuck';
    const point = (u: number, k: number, rib: number, wobble = 0): THREE.Vector3 => {
      const x = xs[k], top = k <= 6;
      const c = c0 * Math.sqrt(Math.max(0.08, 1 - u * u * 0.92));
      let thick = (top ? 0.42 * (Math.sqrt(x) - x) + 0.01 : -0.03 * Math.sin(Math.PI * x)) * c * rib;
      if (flat) {
        const t = u * 1.15, Rg = R * 0.62;
        const dx = Math.sin(t), dz = -Math.cos(t), along = c * (0.5 - x);
        return new THREE.Vector3((Rg + along) * dx, Math.max(0.03, thick * 0.55 + 0.06 + wobble * 0.12), (Rg + along) * dz + Rg * 0.25);
      }
      const t = u * thetaMax;
      const p = new THREE.Vector3(R * Math.sin(t), R * Math.cos(t), c * (0.38 - x) - u * u * 0.45);
      if (tuck && u > 0.42) {
        const w = (u - 0.42) / 0.58;
        thick *= 1 - w * 0.75;
        p.x -= w * R * 0.3; p.y -= w * w * R * 0.5 + (top ? 0 : 0.0); p.z += wobble * w * 0.5 - w * 0.6;
      }
      p.x += Math.sin(t) * thick; p.y += Math.cos(t) * thick;
      return p;
    };
    const stations = cells * 2 + 1, M = xs.length;
    const pos: number[] = [], cols: number[] = [], idx: number[] = [];
    for (let i = 0; i < stations; i++) {
      const u = -1 + 2 * i / (stations - 1), rib = i % 2 === 0 ? 0.82 : 1.22, wob = random() - 0.5;
      for (let k = 0; k < M; k++) {
        const p = point(u, k, rib, wob); pos.push(p.x, p.y, p.z);
        const top = k <= 6;
        const cc = k === 11 || k === 0 ? new THREE.Color('#20232a') : colour(u, xs[k]).clone().multiplyScalar(top ? 1 : 0.78);
        cols.push(cc.r, cc.g, cc.b);
      }
    }
    for (let i = 0; i < stations - 1; i++) for (let k = 0; k < M; k++) {
      const a0 = i * M + k, a1 = i * M + (k + 1) % M, b0 = a0 + M, b1 = a1 + M;
      idx.push(a0, b0, a1, a1, b0, b1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const rig = new THREE.Group();
    const canopy = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55 }));
    canopy.castShadow = canopy.receiveShadow = true;
    rig.add(canopy);

    // Lines: two rows fanning from each riser.
    const lineMat = s.material('#2a2c31', { roughness: 0.6 });
    const risers = [-1, 1].map((d) => new THREE.Vector3(d * 0.22, flat ? 1.15 : 0, 0));
    const us = [0.1, 0.28, 0.46, 0.64, 0.8, 0.93];
    const add = <T extends THREE.Object3D>(g: THREE.Object3D, m: T) => { g.add(m); return m; };
    for (const d of [-1, 1]) for (const uu of us) for (const k of [10, 8]) {
      const p = point(d * uu, k, 0.82);
      add(rig, s.rod(risers[d < 0 ? 0 : 1].toArray() as P3, p.toArray() as P3, 0.014, lineMat, 0.008));
    }
    // Brake lines to the trailing edge.
    if (!flat) for (const d of [-1, 1]) for (const uu of [0.35, 0.7]) add(rig, s.rod([d * 0.3, 0.35, -0.05], point(d * uu, 6, 0.82).toArray() as P3, 0.009, lineMat, 0.006));

    // Pilot in silhouette.
    const dark = s.material('#1b1e23', { roughness: 0.7 });
    const accent = s.material(mood.cheer > 0.35 ? pal[0] : '#3a3d44', { roughness: 0.4 });
    const person = (g: THREE.Object3D, pose: 'seated' | 'pod' | 'run' | 'stand', size = 1) => {
      const P = (m: THREE.Mesh) => add(g, m);
      const seated = pose === 'seated' || pose === 'pod';
      const lean = pose === 'run' ? 0.22 : 0;
      const hip: P3 = seated ? [0, -1.22, -0.06] : [0, -1.22, -0.1 - lean];
      const neck: P3 = seated ? [0, -0.66, pose === 'pod' ? -0.16 : 0] : [0, -0.64, lean * 0.6];
      P(s.rod(hip, neck, 0.17, dark, 0.19));
      P(s.ball([0.13, 0.14, 0.14], [neck[0], neck[1] + 0.19, neck[2] + 0.03], accent, 12));
      P(s.ball([0.1, 0.06, 0.06], [neck[0], neck[1] + 0.17, neck[2] + 0.13], dark, 8));
      for (const d of [-1, 1]) {
        const hand: P3 = pose === 'stand' ? [d * 0.42, -0.95, 0.12] : pose === 'run' ? [d * 0.34, -0.3, -0.3] : [d * 0.32, -0.25, 0.08];
        const elbow: P3 = [(d * 0.24 + hand[0]) / 2 + d * 0.08, (neck[1] + hand[1]) / 2 - 0.05, (neck[2] + hand[2]) / 2 - 0.04];
        P(s.rod([d * 0.2, neck[1] - 0.04, neck[2]], elbow, 0.06, dark, 0.05)); P(s.rod(elbow, hand, 0.05, dark, 0.04));
        if (seated) {
          const knee: P3 = [d * 0.12, -1.2, 0.46], foot: P3 = pose === 'pod' ? [d * 0.08, -1.18, 0.98] : [d * 0.12, -1.68, 0.56];
          P(s.rod(hip, knee, 0.1, dark, 0.08)); P(s.rod(knee, foot, 0.075, dark, 0.06));
          P(s.ball([0.06, 0.05, 0.12], [foot[0], foot[1] - 0.02, foot[2] + 0.06], dark, 8));
        } else {
          const stride = pose === 'run' ? d * 0.42 : d * 0.03;
          const knee: P3 = [d * 0.11, -1.68, hip[2] + stride * 0.6 + (pose === 'run' ? 0.12 : 0)], foot: P3 = [d * 0.11, -2.12, hip[2] + stride - (pose === 'run' && d > 0 ? 0.1 : 0)];
          P(s.rod(hip, knee, 0.1, dark, 0.08)); P(s.rod(knee, foot, 0.075, dark, 0.06));
          P(s.ball([0.06, 0.05, 0.13], [foot[0], -2.15, foot[2] + 0.06], dark, 8));
        }
        // Riser from the hip carabiner up to the line fan.
        P(s.rod([d * 0.2, hip[1] + 0.25, hip[2] + 0.1], [d * 0.22, pose === 'stand' ? -0.95 : 0, pose === 'stand' ? 0.1 : 0], 0.02, accent));
      }
      if (pose === 'pod') { P(s.ball([0.24, 0.22, 0.72], [0, -1.24, 0.5], dark, 14)); P(s.cylinder(0.02, 0.2, 0.7, [0, -1.2, -0.55], dark, 10)).rotation.x = -Math.PI / 2 + 0.15; }
      else P(s.ball([0.25, 0.4, 0.2], [0, -1.0, -0.24 - lean], dark, 12));
      g.scale.setScalar(size);
    };
    const crew = new THREE.Group();
    const pose = aloft ? (a.pilot === 'pod' ? 'pod' : 'seated') : flat ? 'stand' : 'run';
    person(add(crew, new THREE.Group()), pose);
    if (a.pilot === 'tandem') { const guest = add(crew, new THREE.Group()); person(guest, aloft ? 'seated' : pose, 0.92); guest.position.set(0, aloft ? -0.22 : 0.0, 0.5); guest.position.y -= aloft ? 0 : 0.17; }

    // Trailing things.
    const puffs: THREE.Mesh[] = [];
    if (a.trail === 'streamer' && !flat) {
      const pts: P3[] = []; for (let i = 0; i < 7; i++) pts.push([Math.sin(i * 1.3) * 0.25, -1.3 - i * 0.12 + Math.cos(i * 1.7) * 0.12, -0.5 - i * 0.75]);
      add(crew, s.tube(pts, 0.035, s.material(pal[pal.length - 1].clone().lerp(new THREE.Color('#ff2a6a'), 0.5), { roughness: 0.6 })));
    } else if (a.trail === 'smoke' && !flat) {
      const smoke = new THREE.MeshBasicMaterial({ color: pal[0], transparent: true, opacity: 0.28, depthWrite: false });
      for (let i = 0; i < 9; i++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16 + i * 0.06, 10, 8), smoke); puff.position.set(Math.sin(i) * 0.2, -1.6 + i * 0.05, -0.5 - i * 0.6); crew.add(puff); puffs.push(puff); }
    }

    // Assemble for the moment.
    const flyer = new THREE.Group();
    flyer.add(rig, crew);
    s.root.add(flyer);
    const height = aloft ? 3.9 : 2.17;
    flyer.position.y = height;
    const bank = a.moment === 'banking' ? 0.5 : a.moment === 'tuck' ? -0.14 : 0;
    flyer.rotation.z = bank;
    if (a.moment === 'launching') { rig.rotation.x = -0.24; }
    if (flat) { flyer.position.y = 2.17; rig.position.y = -2.17; rig.rotation.y = Math.PI; crew.rotation.y = mood.energy > 0.5 ? Math.PI : 0; }

    // What is beneath an airborne wing, so it stands on something.
    const sways: THREE.Object3D[] = [];
    if (aloft) {
      const bx = -Math.sin(bank) * 3.2;
      if (a.below === 'spur') {
        const stone = s.material('#8a8984', { roughness: 0.95, flatShading: true });
        for (let i = 0; i < 5; i++) {
          const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position;
          for (let j = 0; j < p.count; j++) { const x = p.getX(j), y = p.getY(j), z = p.getZ(j); const r = 1 + 0.22 * Math.sin(x * 3.3 + i) * Math.cos(y * 2.9 + i * 2) + 0.14 * Math.sin(z * 5 + i); p.setXYZ(j, x * r, y * r, z * r); }
          g.computeVertexNormals();
          const h = i === 0 ? 1.9 : 0.6 + random() * 0.9;
          const m = s.mesh(g, stone, [bx + (i === 0 ? 0 : (random() - 0.5) * 2.6), h * 0.42, -1.5 + (i === 0 ? 0 : (random() - 0.5) * 1.8)]);
          m.scale.set(0.7 + random() * 0.5, h, 0.6 + random() * 0.5); m.rotation.y = random() * 6;
        }
      } else if (a.below === 'firs') {
        const leaf = s.material('#2f5a3a', { roughness: 1 }), trunk = s.material('#4a3a2c');
        for (let i = 0; i < 4 + Math.round(mood.density * 3); i++) {
          const x = bx + (random() - 0.5) * 3.4, z = -1.5 + (random() - 0.5) * 2.2, h = 1.5 + random() * 0.9;
          s.cylinder(0.06, 0.1, h * 0.4, [x, h * 0.2, z], trunk, 6);
          for (let j = 0; j < 4; j++) s.cylinder(0.02, 0.62 - j * 0.13, h * 0.3, [x, h * (0.3 + j * 0.2), z], leaf, 8);
        }
      } else if (a.below === 'cloud') {
        const cloud = s.material('#f4f6f8', { roughness: 1 });
        for (let i = 0; i < 12; i++) { const r = 0.5 + random() * 0.55; s.ball([r * 1.3, r * 0.8, r], [bx + (random() - 0.5) * 4.6, r * 0.62, -0.6 + (random() - 0.5) * 2.4], cloud, 12); }
      } else {
        s.ball([2.3, 0.95, 1.8], [bx, -0.2, -1.0], s.material('#6f9a45', { roughness: 1 }), 20);
        const tufts: { at: P3; size: number; color: string }[] = [];
        for (let i = 0; i < 70; i++) { const ang = random() * 6.3, r = Math.sqrt(random()) * 0.95, up = Math.sqrt(1 - r * r); tufts.push({ at: [bx + Math.cos(ang) * r * 2.3, -0.2 + up * 0.95 + 0.05, -1.0 + Math.sin(ang) * r * 1.8], size: 0.6 + random(), color: random() < 0.2 ? ['#f4d13a', '#ffffff', '#2c4fd6'][i % 3] : '#4f7e34' }); }
        s.scatter(new THREE.ConeGeometry(0.04, 0.2, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), tufts);
        const px = bx + 1.5, pz = -0.6;
        s.cylinder(0.03, 0.04, 2.2, [px, 1.3, pz], s.material('#e9e9e4'), 8);
        const sock = new THREE.Group(); sock.position.set(px, 2.35, pz);
        for (let i = 0; i < 5; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.17 - i * 0.022, 0.148 - i * 0.022, 0.22, 10, 1, true), new THREE.MeshStandardMaterial({ color: i % 2 ? '#f4f1e8' : '#e3362a', side: THREE.DoubleSide })); seg.rotation.z = Math.PI / 2; seg.position.x = -0.11 - i * 0.22; seg.castShadow = true; sock.add(seg); }
        sock.rotation.y = 0.5; s.root.add(sock); sways.push(sock);
      }
    } else {
      // A patch of launch grass with a few tufts, and the rucksack left behind.
      const tufts: { at: P3; size: number }[] = [];
      for (let i = 0; i < 30 + mood.density * 40; i++) tufts.push({ at: [(random() - 0.5) * 7, 0.07, (random() - 0.5) * 5 - 1], size: 0.6 + random() });
      s.scatter(new THREE.ConeGeometry(0.035, 0.18, 4), s.material('#5f8e3c', { roughness: 1 }), tufts);
      s.ball([0.26, 0.2, 0.36], [1.3, 0.16, 0.7], dark, 12); s.box([0.3, 0.06, 0.2], [1.3, 0.3, 0.7], accent);
    }

    const energy = mix(0.1, 1.4, mood.energy);
    return s.finish({
      footprint: aloft ? 2.4 : 3.2,
      update: (_dt, time) => {
        if (!flat) { flyer.rotation.z = bank + Math.sin(time * 1.3 * energy) * 0.05 * energy; crew.rotation.x = Math.sin(time * 1.7 * energy) * 0.04 * energy; }
        sways.forEach((n) => { n.rotation.y = 0.5 + Math.sin(time * 2 * energy) * 0.3; n.rotation.z = -0.25 + Math.sin(time * 5 * energy) * 0.08; });
        puffs.forEach((puff, i) => { puff.position.y = -1.6 + i * 0.05 + Math.sin(time * 2 + i) * 0.06; });
      },
    });
  },
});
