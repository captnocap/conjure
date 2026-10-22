import * as THREE from 'three';
import { choice, clamp01, defineThing, disposeTree, mix, noul, score, visibleBounds } from '@conjure/kit';
import { add, displace, instances, mat, mesh, noise, paint, range, settle, type Spot } from './lib';

const CRUST = {
  sulphide: ['#2a2a30', '#5a5148', '#c9a53a'],
  rust: ['#3a2a26', '#9a5230', '#d98b3a'],
  copper: ['#26302f', '#3f7f76', '#8fd0b4'],
  anhydrite: ['#4a4a4c', '#b9b6a8', '#f1eee0'],
  ochre: ['#3b3324', '#a98a35', '#e6cf58'],
} as const;

export default defineThing({
  questions: {
    height: score('How tall is the chimney?', ['A waist-high stump', 'Taller than a diver', 'A two-storey tower', 'A towering twelve-metre spire']),
    spires: choice('How many spires does it have?', {
      single: 'One lone fat chimney.',
      twin: 'Two spires leaning apart from a shared base.',
      cluster: 'A tight cluster of four or five uneven spires.',
      organ: 'Many thin pipes in a row like a church organ.',
      beehive: 'A squat bulbous mound ringed with flanges, more hive than tower.',
    }),
    state: choice('What is it doing right now?', {
      black: 'Venting dense black smoke, fully alive.',
      white: 'A white smoker, cooler, breathing pale milky plumes.',
      shimmer: 'No smoke, only a glowing throat and clear shimmering water.',
      dead: 'Dead and cold: no plume, the top broken open, rusting quietly.',
      toppled: 'One spire has snapped and lies in the rubble; the stump still vents.',
    }),
    vigour: score('If it is venting, how vigorous is the plume?', ['A thin wisp', 'A steady column', 'A fat rolling plume', 'A roaring billowing storm']),
    crust: choice('What mineral colour crusts it?', {
      sulphide: 'Black and grey sulphide dusted with yellow sulphur.',
      rust: 'Rust-orange iron oxides, like an old boiler.',
      copper: 'Copper greens and verdigris teal.',
      anhydrite: 'Pale grey and bone-white anhydrite.',
      ochre: 'Mustard ochre and gold staining.',
    }),
    colonists: choice('What lives on it?', {
      bare: 'Nothing; bare hot rock.',
      worms: 'Tufts of white tube worms with red tips on the ledges.',
      mats: 'White bacterial mats smeared down its flanks.',
      mussels: 'Beds of dark mussels packed around the base.',
      crabs: 'Pale blind crabs dotted over it.',
    }),
    glow: noul('Does the vent throat glow with heat?'),
    rubble: score('How much fallen rubble lies around its foot?', ['A clean base', 'A few blocks', 'A heaped talus mound']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random);
    const H = mix(1.4, 12, a.height * a.height * 0.6 + a.height * 0.4);
    const dead = a.state === 'dead';
    const [dark, mid, bright] = CRUST[a.crust].map((c) => new THREE.Color(c));
    const cold = new THREE.Color('#6d6a66');
    const wearMix = mood.wear * 0.25 + (dead ? 0.35 : 0);
    const rock = mat('#ffffff', { vertexColors: true, roughness: 0.92, flatShading: false });
    const hot = mat('#ff7a2a', { emissive: '#ff5a14', emissiveIntensity: mix(1.2, 2.6, mood.warmth), roughness: 0.5 });

    // Each spire: base point, height, base radius, lean.
    type Spire = { x: number; z: number; h: number; r: number; lx: number; lz: number; broken: boolean };
    const plan: Spire[] = [];
    const R = H * 0.085 + 0.1;
    if (a.spires === 'single') plan.push({ x: 0, z: 0, h: H, r: R * 1.3, lx: range(random, -0.06, 0.06), lz: range(random, -0.06, 0.06), broken: false });
    else if (a.spires === 'twin') {
      plan.push({ x: -R * 0.75, z: 0, h: H, r: R, lx: 0.02, lz: 0.13, broken: false });
      plan.push({ x: R * 0.8, z: R * 0.2, h: H * range(random, 0.55, 0.8), r: R * 0.85, lx: -0.04, lz: -0.16, broken: false });
    } else if (a.spires === 'cluster') {
      const count = 4 + Math.floor(random() * 2);
      for (let i = 0; i < count; i++) {
        const angle = i / count * 6.283 + random(), d = i === 0 ? 0 : R * range(random, 0.8, 1.25);
        plan.push({ x: Math.cos(angle) * d, z: Math.sin(angle) * d, h: H * (i === 0 ? 1 : range(random, 0.35, 0.85)), r: R * (i === 0 ? 0.95 : range(random, 0.5, 0.75)), lx: Math.sin(angle) * 0.1, lz: -Math.cos(angle) * 0.1, broken: false });
      }
    } else if (a.spires === 'organ') {
      const count = 6 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1) - 0.5;
        plan.push({ x: t * R * 4.6, z: range(random, -0.3, 0.3) * R, h: H * mix(1, 0.45, Math.abs(t) * 2) * range(random, 0.8, 1.05), r: R * 0.5, lx: range(random, -0.03, 0.03), lz: -t * 0.12, broken: false });
      }
    } else {
      plan.push({ x: 0, z: 0, h: H * 0.6, r: R * 2.6, lx: 0, lz: 0, broken: false });
      plan.push({ x: R * 1.1, z: -R * 0.3, h: H * 0.85, r: R * 0.6, lx: 0.05, lz: -0.1, broken: false });
    }
    if (a.state === 'toppled') plan[plan.length > 1 ? 1 : 0].broken = true;
    if (dead) for (const s of plan) s.broken = random() < 0.6;

    const vents: { top: THREE.Vector3; r: number }[] = [];
    const ledges: THREE.Vector3[] = [];
    const flankSpots: { p: THREE.Vector3; out: THREE.Vector3 }[] = [];
    const beehive = a.spires === 'beehive';

    plan.forEach((s, index) => {
      const group = new THREE.Group();
      group.position.set(s.x, 0, s.z);
      group.rotation.set(s.lx, random() * 6.283, s.lz);
      root.add(group);
      const cut = s.broken ? range(random, 0.38, 0.6) : 1;
      const h = s.h * cut;
      const bulge = Array.from({ length: 6 }, () => [range(random, 0.05, 0.8), range(random, 0.03, 0.08), range(random, 0.08, 0.22)] as const);
      const fat = beehive && index === 0;
      const radiusAt = (t: number) => {
        const full = t * cut;
        let r = fat ? s.r * Math.sqrt(Math.max(0.03, 1 - full * full)) * (1 + 0.09 * Math.sin(full * 26)) : s.r * (0.22 + 0.78 * Math.pow(1 - full, 1.15)) * (1 + 0.1 * Math.sin(full * 23 + index));
        for (const [at, width, amount] of bulge) r += s.r * amount * Math.exp(-Math.pow((full - at) / width, 2));
        return r;
      };
      const steps = 44;
      const profile: THREE.Vector2[] = [new THREE.Vector2(radiusAt(0) * 1.25, -0.3)];
      for (let i = 0; i <= steps; i++) profile.push(new THREE.Vector2(radiusAt(i / steps), (i / steps) * h));
      const rim = radiusAt(1);
      profile.push(new THREE.Vector2(rim * 0.6, h - rim * 0.25), new THREE.Vector2(rim * 0.5, h - rim * 1.2));
      const geometry = displace(new THREE.LatheGeometry(profile, 40), (p) => {
        const ragged = s.broken && p.y > h * 0.86 ? Math.abs(n(p.x, p.y, p.z, 5 / s.r)) * s.r * 0.5 : 0;
        return (n(p.x, p.y * 0.5, p.z, 2.2 / s.r) * 0.11 + n(p.x, p.y, p.z, 6 / s.r) * 0.07) * s.r * (p.y < 0 ? 0.3 : 1) + ragged;
      });
      paint(geometry, (p, c) => {
        const t = clamp01(p.y / s.h);
        const streak = n(p.x * 0.4, p.y * 0.15, p.z * 0.4, 3 / s.r) * 0.5 + 0.5;
        c.copy(mid).lerp(dark, clamp01(t * 1.5 - 0.25 + (streak - 0.5) * 0.5));
        c.lerp(bright, clamp01((streak - 0.62) * 3.2) * (1 - t * 0.5));
        c.lerp(cold, wearMix);
      });
      mesh(group, geometry, rock);
      // Flanges: mineral shelves that grow where hot fluid pools.
      const flangeCount = fat ? 5 + Math.floor(random() * 3) : Math.floor(random() * 2.4 + (s.r > R * 0.7 ? 1 : 0));
      for (let i = 0; i < flangeCount; i++) {
        const t = range(random, 0.12, 0.7), angle = random() * 6.283, r = radiusAt(t);
        const size = r * range(random, 0.35, 0.6);
        const flange = displace(new THREE.SphereGeometry(1, 12, 8), (p) => n(p.x, p.y, p.z, 2) * 0.22);
        paint(flange, (p, c) => { c.copy(p.y > 0 ? mid : dark).lerp(bright, p.y > 0.3 ? 0.55 : 0).lerp(cold, wearMix); });
        mesh(group, flange, rock, [Math.cos(angle) * r * 0.95, t * h, Math.sin(angle) * r * 0.95], [size, size * 0.2, size * 0.8], [0, angle, range(random, -0.2, 0.2)]);
        ledges.push(group.localToWorld(new THREE.Vector3(Math.cos(angle) * (r + size * 0.35), t * h + size * 0.2, Math.sin(angle) * (r + size * 0.35))));
      }
      group.updateMatrixWorld(true);
      for (let i = 0; i < 26; i++) {
        const t = range(random, 0.04, 0.92), angle = random() * 6.283, r = radiusAt(t) * 1.02;
        const local = new THREE.Vector3(Math.cos(angle) * r, t * h, Math.sin(angle) * r);
        flankSpots.push({ p: group.localToWorld(local.clone()), out: new THREE.Vector3(Math.cos(angle), 0.25, Math.sin(angle)).applyQuaternion(group.quaternion).normalize() });
      }
      const top = group.localToWorld(new THREE.Vector3(0, h, 0));
      if (!dead) {
        vents.push({ top, r: rim * 0.62 });
        if (a.glow || a.state === 'shimmer') {
          mesh(group, new THREE.CylinderGeometry(rim * 0.56, rim * 0.5, rim * 0.5, 14), hot, [0, h - rim * 0.55, 0]);
          mesh(group, new THREE.TorusGeometry(rim * 0.62, rim * 0.09, 6, 18), hot, [0, h - rim * 0.12, 0], 1, [Math.PI / 2, 0, 0]);
        }
      }
      if (s.broken && a.state === 'toppled') {
        // The snapped length lies beside the stump.
        const length = s.h * (1 - cut), fallen: THREE.Vector2[] = [];
        for (let i = 0; i <= 14; i++) fallen.push(new THREE.Vector2(s.r * (0.2 + 0.8 * Math.pow(1 - (cut + (1 - cut) * i / 14), 0.75)) * (1 + 0.12 * Math.sin(i)), (i / 14) * length));
        const log = displace(new THREE.LatheGeometry(fallen, 18), (p) => n(p.x, p.y, p.z, 3 / s.r) * s.r * 0.14);
        paint(log, (p, c) => { c.copy(dark).lerp(mid, n(p.x, p.y, p.z, 2 / s.r) * 0.5 + 0.5).lerp(cold, wearMix + 0.15); });
        const yaw = random() * 6.283, far = s.r * 1.6 + R;
        mesh(root, log, rock, [s.x + Math.cos(yaw) * far, s.r * 0.45, s.z + Math.sin(yaw) * far], 1, [Math.PI / 2 - 0.08, 0, yaw + Math.PI / 2 + 0.4]);
      }
    });

    // Talus and footing.
    const spread = Math.max(...plan.map((s) => Math.hypot(s.x, s.z) + s.r)) * 1.25;
    const mound = displace(new THREE.SphereGeometry(1, 28, 12, 0, 6.2832, 0, Math.PI / 2), (p) => n(p.x, p.y, p.z, 2.2) * 0.12);
    paint(mound, (p, c) => { c.copy(mid).lerp(dark, 0.55 + n(p.x, p.y, p.z, 4) * 0.3).lerp(cold, wearMix + 0.1); });
    mesh(root, mound, rock, [0, -0.02, 0], [spread * 1.05, H * mix(0.02, 0.07, a.rubble) + 0.06, spread * 1.05]);
    const blocks: Spot[] = [];
    const blockCount = Math.round(mix(3, 46, a.rubble) * mix(0.7, 1.3, mood.density));
    for (let i = 0; i < blockCount; i++) {
      const angle = random() * 6.283, d = spread * range(random, 0.55, 1.25), size = R * range(random, 0.1, 0.36);
      blocks.push({ at: [Math.cos(angle) * d, size * 0.35, Math.sin(angle) * d], scale: [size, size * range(random, 0.5, 0.9), size * range(random, 0.6, 1.1)], rot: [random() * 3, random() * 3, random() * 3], color: new THREE.Color().copy(random() < 0.3 ? bright : mid).lerp(dark, random() * 0.8).lerp(cold, wearMix) });
    }
    instances(root, new THREE.DodecahedronGeometry(1, 0), mat('#ffffff', { roughness: 0.95, flatShading: true }), blocks);

    // Knobs and nodules: the chimney grows by accretion, never smooth.
    const knobs: Spot[] = flankSpots.filter((_s, i) => i % 2 === 0).map((s) => {
      const size = R * range(random, 0.08, 0.2);
      return { at: [s.p.x, s.p.y, s.p.z] as const, scale: [size, size * range(random, 0.8, 1.5), size] as const, rot: [random() * 3, random() * 3, 0] as const, color: new THREE.Color().copy(random() < 0.35 ? bright : mid).lerp(dark, random() * 0.7).lerp(cold, wearMix) };
    });
    instances(root, new THREE.IcosahedronGeometry(1, 1), mat('#ffffff', { roughness: 0.95 }), knobs);

    // Colonists.
    const amount = mix(0.4, 1.3, mood.density) * (dead ? 0.35 : 1);
    if (a.colonists === 'worms') {
      const tubes: Spot[] = [], tips: Spot[] = [];
      const homes = [...ledges, ...flankSpots.filter((_s, i) => i % 7 === 1).map((s) => s.p)];
      for (const home of homes.slice(0, Math.round(14 * amount))) {
        const count = 5 + Math.floor(random() * 6);
        for (let i = 0; i < count; i++) {
          const length = R * range(random, 0.35, 0.8), x = home.x + range(random, -0.2, 0.2) * R, z = home.z + range(random, -0.2, 0.2) * R;
          const tilt: [number, number, number] = [range(random, -0.35, 0.35), 0, range(random, -0.35, 0.35)];
          tubes.push({ at: [x, home.y + length * 0.4, z], scale: [R * 0.035, length, R * 0.035], rot: tilt });
          tips.push({ at: [x - tilt[2] * length * 0.5, home.y + length * 0.92, z + tilt[0] * length * 0.5], scale: [R * 0.05, R * 0.12, R * 0.05], rot: tilt });
        }
      }
      instances(root, new THREE.CylinderGeometry(1, 1, 1, 6), mat('#ece8dc', { roughness: 0.6 }), tubes);
      instances(root, new THREE.SphereGeometry(1, 8, 6), mat('#c8242a', { emissive: '#7a0c10', emissiveIntensity: 0.5 }), tips);
    } else if (a.colonists === 'mats') {
      const patches: Spot[] = flankSpots.filter(() => random() < 0.55 * amount).map((s) => ({ at: [s.p.x, s.p.y, s.p.z] as const, scale: [R * range(random, 0.18, 0.4), R * range(random, 0.3, 0.9), R * range(random, 0.18, 0.4)] as const }));
      instances(root, new THREE.SphereGeometry(1, 10, 8), mat('#f3f1e4', { roughness: 1 }), patches);
    } else if (a.colonists === 'mussels') {
      const shells: Spot[] = [];
      const count = Math.round(130 * amount);
      for (let i = 0; i < count; i++) {
        const angle = random() * 6.283, d = spread * range(random, 0.45, 1.05), size = R * range(random, 0.07, 0.13);
        shells.push({ at: [Math.cos(angle) * d, H * 0.03 * (1.1 - d / spread) + size * 0.5, Math.sin(angle) * d], scale: [size * 0.55, size, size * 0.4], rot: [range(random, -0.6, 0.6), random() * 6.283, range(random, -0.6, 0.6)], color: random() < 0.25 ? '#8a7350' : '#3a2c3f' });
      }
      instances(root, new THREE.SphereGeometry(1, 8, 6), mat('#ffffff', { roughness: 0.45 }), shells);
    } else if (a.colonists === 'crabs') {
      const bodies: Spot[] = flankSpots.filter(() => random() < 0.4 * amount).map((s) => ({ at: [s.p.x + s.out.x * R * 0.05, s.p.y, s.p.z + s.out.z * R * 0.05] as const, scale: [R * 0.13, R * 0.07, R * 0.1] as const, rot: [0, random() * 6.283, 0] as const }));
      for (let i = 0; i < 6 * amount; i++) { const angle = random() * 6.283, d = spread * range(random, 0.7, 1.2); bodies.push({ at: [Math.cos(angle) * d, R * 0.1, Math.sin(angle) * d], scale: [R * 0.13, R * 0.07, R * 0.1], rot: [0, random() * 6.283, 0] }); }
      instances(root, new THREE.SphereGeometry(1, 8, 6), mat('#f0e6d6', { roughness: 0.5 }), bodies);
      const legs: Spot[] = bodies.flatMap((b) => [-1, 1].map((side) => ({ at: [b.at[0] + side * R * 0.1 * Math.cos(b.rot![1]), b.at[1] - R * 0.02, b.at[2] - side * R * 0.1 * Math.sin(b.rot![1])] as const, scale: [R * 0.11, R * 0.025, R * 0.13] as const, rot: b.rot })));
      instances(root, new THREE.SphereGeometry(1, 6, 4), mat('#e2d2bc', { roughness: 0.6 }), legs);
    }

    // The plume: opaque rolling puffs so it prints as a shape, rising and looping.
    const puffSpec: { vent: number; phase: number; side: number; turn: number; size: number }[] = [];
    let puffs: THREE.InstancedMesh | null = null;
    const smoking = a.state === 'black' || a.state === 'white' || a.state === 'toppled';
    const vigour = a.state === 'toppled' ? a.vigour * 0.45 : a.vigour;
    const perVent = Math.round(mix(7, 24, vigour) * (vents.length > 4 ? 0.5 : 1));
    const plumeH = H * mix(0.3, 1.05, vigour) + 0.4;
    const drift = new THREE.Vector3(range(random, -1, 1), 0, range(random, -1, 1)).normalize().multiplyScalar(H * mix(0.04, 0.22, mood.energy));
    if (smoking && vents.length) {
      vents.forEach((_v, vent) => { for (let i = 0; i < perVent; i++) puffSpec.push({ vent, phase: (i + random() * 0.6) / perVent, side: random() * 6.283, turn: random() * 6.283, size: range(random, 0.8, 1.25) }); });
      const smoke = a.state === 'white' ? mat('#e4e6df', { roughness: 1 }) : mat(a.state === 'toppled' ? '#4a4a4e' : '#1d1c20', { roughness: 1 });
      const lump = displace(new THREE.IcosahedronGeometry(1, 2), (p) => n(p.x, p.y, p.z, 1.4) * 0.18);
      puffs = instances(root, lump, smoke, puffSpec.map(() => ({ at: [0, 0, 0] as const })));
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    const pose = (time: number) => {
      if (!puffs) return;
      puffSpec.forEach((spec, i) => {
        const vent = vents[spec.vent], t = (spec.phase + time) % 1;
        const swell = (vent.r * 1.1 + t * H * mix(0.035, 0.16, vigour)) * spec.size * Math.min(1, (1 - t) * 2.2 + 0.35);
        const wobble = (vent.r + t * H * mix(0.02, 0.1, vigour)) * 0.8;
        pos.copy(vent.top).addScaledVector(drift, t * t).add(sc.set(Math.cos(spec.side + t * 3) * wobble, t * plumeH + vent.r * 0.3, Math.sin(spec.side + t * 3) * wobble));
        q.setFromEuler(e.set(spec.turn + t * 2, spec.turn * 2, t * 3));
        puffs!.setMatrixAt(i, m4.compose(pos, q, sc.setScalar(Math.max(swell, 1e-3))));
      });
      puffs.instanceMatrix.needsUpdate = true;
    };
    pose(0);
    add(root, new THREE.Group());
    settle(root, visibleBounds);
    const speed = mix(0.02, 0.16, mood.energy) * mix(0.6, 1.6, vigour);
    return {
      object: root,
      footprint: spread * 1.2,
      update: puffs ? (_dt, time) => pose(time * speed) : undefined,
      dispose: () => disposeTree(root),
    };
  },
});
