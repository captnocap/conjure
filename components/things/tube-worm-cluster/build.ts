import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { choice, clamp01, defineThing, disposeTree, mix, score, visibleBounds } from '@conjure/kit';
import { displace, instances, mat, mesh, noise, paint, range, settle, type Spot } from './lib';

const PLUME = {
  blood: ['#c81822', '#7a0810'],
  pink: ['#f0708a', '#b03a58'],
  orange: ['#f0762a', '#a8400e'],
  maroon: ['#7a1630', '#3d0818'],
  ghost: ['#f1e6e0', '#c9b6b0'],
  glow: ['#6ef0e0', '#18a8b8'],
} as const;

export default defineThing({
  questions: {
    colony: choice('How large is the colony?', {
      trio: 'Three or four lone stragglers.',
      bouquet: 'A tight bouquet of a dozen.',
      thicket: 'A dense thicket, tubes jostling for the warm water.',
      hedge: 'A sprawling hedge, a whole reef of them.',
    }),
    height: score('How tall are the tubes?', ['Finger-length sprouts', 'Knee high', 'Waist high', 'Taller than a person']),
    plume: choice('What colour are the plumes?', {
      blood: 'Blood red, rich with haemoglobin.',
      pink: 'Soft coral pink.',
      orange: 'Rusty orange.',
      maroon: 'Dark maroon, almost black.',
      ghost: 'Bleached, ghostly white.',
      glow: 'An eerie luminous teal.',
    }),
    state: choice('What are the worms doing?', {
      extended: 'Fully extended, plumes fanned out and feeding.',
      shy: 'Half withdrawn, only the tips peeking out.',
      startled: 'Mostly snapped back inside; a few slow ones still out.',
      retracted: 'All retracted: a stand of blank white pipes.',
      dead: 'Dead: empty, broken, browning tubes, the vent gone cold.',
    }),
    form: choice('How do the tubes grow?', {
      straight: 'Straight and parallel like organ pipes.',
      splayed: 'Splaying outward like a bunch of flowers in a vase.',
      tangled: 'Twisting and tangled round each other like roots.',
      leaning: 'All bent the same way by a steady current.',
    }),
    tubes: choice('What are the tubes like?', {
      white: 'Clean chalk-white chitin.',
      ringed: 'Banded with growth rings like bamboo.',
      rusty: 'Stained rust and brown from the vent minerals.',
      crusted: 'Crusted with limpets and small mussels.',
    }),
    base: choice('What do they grow from?', {
      basalt: 'A crack in black pillow basalt.',
      glowing: 'A fissure that glows orange with heat below.',
      mussels: 'A bed of golden-brown mussels.',
      sulphide: 'A knobbly yellow-grey sulphide mound.',
    }),
    visitor: choice('Who is visiting?', {
      none: 'Nobody.',
      crab: 'A white vent crab climbing the tubes.',
      fish: 'A pale eelpout hanging among the plumes.',
      shrimp: 'A flickering swarm of tiny pale shrimp.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random);
    const H = mix(0.1, 2.1, a.height * a.height * 0.5 + a.height * 0.5);
    const dead = a.state === 'dead';
    const count = Math.round({ trio: 3.5, bouquet: 12, thicket: 34, hedge: 70 }[a.colony] * mix(0.75, 1.3, mood.density));
    const tubeR = H * 0.028 + 0.002;
    const Rc = Math.max(tubeR * 2.2 * Math.sqrt(count), H * 0.1) * (a.colony === 'hedge' ? 1.15 : 1);
    const [plumeA, plumeB] = PLUME[a.plume].map((c) => new THREE.Color(c));
    const lean = new THREE.Vector3(range(random, -1, 1), 0, range(random, -1, 1)).normalize();
    const chalk = new THREE.Color(a.tubes === 'rusty' ? '#c9a27a' : '#f0ece0'), rust = new THREE.Color('#8a5a36'), brown = new THREE.Color('#6d5a48');

    // Tubes, merged into one mesh.
    type Tip = { p: THREE.Vector3; dir: THREE.Vector3; out: number; phase: number; size: number };
    const tips: Tip[] = [], geometries: THREE.BufferGeometry[] = [], limpets: Spot[] = [];
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996 + random() * 0.5, d = Rc * Math.sqrt((i + 0.5) / count) * (a.colony === 'hedge' ? 1 : 0.85);
      const bx = Math.cos(angle) * d * (a.colony === 'hedge' ? 1.5 : 1), bz = Math.sin(angle) * d * (a.colony === 'hedge' ? 0.65 : 1);
      const h = H * range(random, 0.55, 1.05) * (1 - (d / Rc) * 0.3) * (dead && random() < 0.5 ? range(random, 0.25, 0.6) : 1);
      const outward = new THREE.Vector3(bx, 0, bz).multiplyScalar(1 / Math.max(Rc, 1e-3));
      const dir = new THREE.Vector3(0, 1, 0);
      if (a.form === 'splayed') dir.addScaledVector(outward, 0.75);
      else if (a.form === 'straight') dir.addScaledVector(outward, 0.12);
      else if (a.form === 'leaning') dir.addScaledVector(lean, 0.6).addScaledVector(outward, 0.15);
      else dir.addScaledVector(outward, 0.4);
      dir.normalize();
      const twist = a.form === 'tangled' ? 0.3 : 0.07, phase = random() * 6.283;
      const points: THREE.Vector3[] = [];
      for (let k = 0; k <= 5; k++) {
        const u = k / 5;
        const p = new THREE.Vector3(bx, -H * 0.04, bz).addScaledVector(dir, u * h * 1.04);
        p.x += Math.sin(u * 5 + phase) * h * twist * u; p.z += Math.cos(u * 4 + phase * 1.7) * h * twist * u;
        if (a.form === 'leaning') p.addScaledVector(lean, u * u * h * 0.3);
        points.push(p);
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const r = tubeR * range(random, 0.75, 1.15);
      const geometry = new THREE.TubeGeometry(curve, 12, r, 7, false);
      const shade = random();
      paint(geometry, (p, c) => {
        const u = clamp01(p.y / Math.max(h, 1e-3));
        c.copy(chalk).lerp(rust, a.tubes === 'rusty' ? clamp01(0.75 - u * 0.7 + shade * 0.3) : clamp01(0.3 - u * 0.5) * 0.7);
        if (a.tubes === 'ringed') c.multiplyScalar(0.72 + 0.28 * Math.round(0.5 + 0.5 * Math.sin(p.y / tubeR * 1.6 + shade * 6)));
        c.lerp(brown, (dead ? 0.6 : 0) + mood.wear * 0.25 * shade);
      });
      geometries.push(geometry);
      const end = curve.getPoint(1), tangent = curve.getTangent(1);
      const out = dead ? 0 : a.state === 'extended' ? 1 : a.state === 'shy' ? range(random, 0.2, 0.45) : a.state === 'startled' ? (random() < 0.22 ? 1 : 0) : 0;
      tips.push({ p: end, dir: tangent, out, phase: random() * 6.283, size: r });
      if (a.tubes === 'crusted') for (let k = 0; k < 4; k++) {
        const q = curve.getPoint(range(random, 0.1, 0.85)), s = r * range(random, 0.35, 0.6), ang = random() * 6.283;
        limpets.push({ at: [q.x + Math.cos(ang) * r, q.y, q.z + Math.sin(ang) * r], scale: [s, s * 0.6, s], color: random() < 0.4 ? '#8a6a3a' : '#d8cfba' });
      }
    }
    const merged = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    mesh(root, merged, mat('#ffffff', { vertexColors: true, roughness: 0.55 }));
    if (limpets.length) instances(root, new THREE.SphereGeometry(1, 8, 6), mat('#ffffff', { roughness: 0.6 }), limpets);

    // Dark mouths on every tube, so a retracted one still reads as hollow.
    const up = new THREE.Vector3(0, 1, 0), quat = new THREE.Quaternion(), euler = new THREE.Euler();
    const facing = (dir: THREE.Vector3): [number, number, number] => { euler.setFromQuaternion(quat.setFromUnitVectors(up, dir)); return [euler.x, euler.y, euler.z]; };
    instances(root, new THREE.CylinderGeometry(0.78, 0.78, 0.3, 8), mat('#2a1c1c', { roughness: 1 }), tips.map((t) => ({ at: [t.p.x, t.p.y, t.p.z] as const, scale: t.size, rot: facing(t.dir) })));

    // Plumes: ribbed red spindles that slide in and out.
    const out = tips.filter((t) => t.out > 0);
    const spindle: THREE.Vector2[] = [];
    for (let k = 0; k <= 26; k++) { const u = k / 26; spindle.push(new THREE.Vector2(Math.sin(Math.pow(u, 0.8) * Math.PI) * (0.82 + 0.18 * Math.cos(k * Math.PI)) + 0.02, u)); }
    const plumeGeometry = new THREE.LatheGeometry(spindle, 10);
    plumeGeometry.scale(1, 1, 0.55);
    const glowing = a.plume === 'glow';
    const plumeMat = mat('#ffffff', { roughness: 0.5, emissive: glowing ? '#18a8b8' : plumeB, emissiveIntensity: glowing ? 1.4 : 0.35 });
    const plumes = out.length ? instances(root, plumeGeometry, plumeMat, out.map(() => ({ at: [0, 0, 0] as const, color: plumeA.clone().lerp(plumeB, random() * 0.6) }))) : null;
    const collars = out.length ? instances(root, new THREE.CylinderGeometry(0.9, 0.75, 1, 8), mat('#f4d9cf', { roughness: 0.5 }), out.map(() => ({ at: [0, 0, 0] as const }))) : null;
    const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), sway = new THREE.Vector3();
    const energy = mix(0.25, 1.5, mood.energy);
    const pose = (time: number) => {
      if (!plumes || !collars) return;
      out.forEach((t, i) => {
        const pulse = t.out * (0.86 + 0.14 * Math.sin(time * 0.7 * energy + t.phase));
        sway.copy(t.dir).addScaledVector(lean, Math.sin(time * 1.1 * energy + t.phase) * 0.18).normalize();
        quat.setFromUnitVectors(up, sway);
        const length = t.size * 7 * pulse;
        plumes.setMatrixAt(i, m4.compose(pos.copy(t.p).addScaledVector(t.dir, -t.size * 0.3), quat, sc.set(t.size * 1.5, length, t.size * 1.5)));
        collars.setMatrixAt(i, m4.compose(pos.copy(t.p).addScaledVector(t.dir, t.size * 0.3 * pulse), quat, sc.set(t.size * 0.72, t.size * 0.9 * pulse, t.size * 0.72)));
      });
      plumes.instanceMatrix.needsUpdate = collars.instanceMatrix.needsUpdate = true;
    };
    pose(0);

    // Base.
    const baseColour = { basalt: ['#2c2e33', '#4a4d52'], glowing: ['#25262a', '#45413e'], mussels: ['#3a352c', '#5a5040'], sulphide: ['#6d6648', '#b9a654'] }[a.base].map((c) => new THREE.Color(c));
    const spread = Rc * 1.25 + tubeR * 3;
    const hedge = a.colony === 'hedge';
    const rock = displace(new THREE.SphereGeometry(1, 30, 12, 0, 6.2832, 0, Math.PI / 2), (p) => n(p.x, p.y, p.z, 2.4) * 0.16 + (a.base === 'basalt' || a.base === 'glowing' ? Math.abs(n(p.x, p.y, p.z, 5)) * 0.08 : 0));
    paint(rock, (p, c) => { c.copy(baseColour[0]).lerp(baseColour[1], clamp01(n(p.x, p.y, p.z, 3) * 0.7 + 0.5)); });
    mesh(root, rock, mat('#ffffff', { vertexColors: true, roughness: 0.9 }), [0, -H * 0.02, 0], [spread * (hedge ? 1.5 : 1), H * 0.09 + tubeR, spread * (hedge ? 0.7 : 1)]);
    if (a.base === 'glowing' && !dead) {
      const hot = mat('#ff8a3a', { emissive: '#ff5a14', emissiveIntensity: mix(1.4, 2.8, mood.warmth) });
      for (let k = 0; k < 3; k++) { const ang = random() * 3.14; mesh(root, new THREE.BoxGeometry(spread * range(random, 0.9, 1.6), H * 0.02, tubeR * 0.9), hot, [range(random, -0.2, 0.2) * spread, H * 0.062 + tubeR * 0.7, range(random, -0.2, 0.2) * spread], 1, [0, ang, 0]); }
    }
    if (a.base === 'mussels') {
      const shells: Spot[] = [];
      for (let k = 0; k < Math.round(70 * mix(0.6, 1.4, mood.density)); k++) {
        const ang = random() * 6.283, d = spread * Math.sqrt(random()), s = tubeR * range(random, 1.2, 2.2);
        shells.push({ at: [Math.cos(ang) * d * (hedge ? 1.5 : 1), (H * 0.09 + tubeR) * Math.sqrt(Math.max(0, 1 - (d / spread) ** 2)) + s * 0.2, Math.sin(ang) * d * (hedge ? 0.7 : 1)], scale: [s * 0.5, s * 0.42, s], rot: [range(random, -0.5, 0.5), random() * 6.283, range(random, -0.5, 0.5)], color: random() < 0.5 ? '#b08a3a' : '#7a5a2a' });
      }
      instances(root, new THREE.SphereGeometry(1, 8, 6), mat('#ffffff', { roughness: 0.4 }), shells);
    }
    if (dead) {
      // Snapped lengths lying around the foot.
      const bits: Spot[] = [];
      for (let k = 0; k < 6 + count * 0.3; k++) { const ang = random() * 6.283, d = spread * range(random, 0.6, 1.2); bits.push({ at: [Math.cos(ang) * d, tubeR + H * 0.02, Math.sin(ang) * d], scale: [tubeR, H * range(random, 0.15, 0.4), tubeR], rot: [Math.PI / 2, 0, random() * 3], color: chalk.clone().lerp(brown, 0.5 + random() * 0.4) }); }
      instances(root, new THREE.CylinderGeometry(1, 1, 1, 7, 1, true), mat('#ffffff', { roughness: 0.7, side: THREE.DoubleSide }), bits);
    }

    // Visitors.
    const movers: { object: THREE.Object3D; base: THREE.Vector3; phase: number }[] = [];
    const pale = mat('#f4efe6', { roughness: 0.45 });
    const host = tips[Math.floor(random() * tips.length)];
    if (a.visitor === 'crab' && host) {
      const g = new THREE.Group(), s = tubeR * 2.2;
      mesh(g, new THREE.SphereGeometry(1, 12, 8), pale, [0, 0, 0], [s, s * 0.55, s * 0.8]);
      for (const side of [-1, 1]) { for (const f of [-0.6, -0.1, 0.4]) mesh(g, new THREE.BoxGeometry(s * 1.5, s * 0.14, s * 0.16), pale, [side * s * 1.3, -s * 0.2, f * s], 1, [0, f * side * 0.5, side * -0.5]); mesh(g, new THREE.SphereGeometry(s * 0.34, 8, 6), pale, [side * s * 0.9, 0, s * 0.95]); }
      g.position.copy(host.p).addScaledVector(host.dir, -host.size * 6).add(new THREE.Vector3(host.size * 1.6, 0, host.size * 1.6));
      g.rotation.set(-1.1, random() * 6, 0);
      root.add(g);
    } else if (a.visitor === 'fish' && host) {
      const g = new THREE.Group(), s = Math.max(H * 0.22, tubeR * 5);
      const points = [0, 1, 2, 3, 4].map((k) => new THREE.Vector3(Math.sin(k * 0.9) * s * 0.12, 0, -k * s * 0.28));
      mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, s * 0.07, 8), mat('#e9d9d6', { roughness: 0.4 }));
      mesh(g, new THREE.SphereGeometry(s * 0.1, 12, 8), mat('#f1e4e0', { roughness: 0.4 }), [0, 0, s * 0.03], [1, 0.9, 1.3]);
      g.position.copy(host.p).add(new THREE.Vector3(Rc * 0.5, host.size * 9, Rc * 0.4));
      g.rotation.y = random() * 6.283;
      root.add(g);
      g.traverse((node) => { node.castShadow = true; });
      movers.push({ object: g, base: g.position.clone(), phase: random() * 6 });
    } else if (a.visitor === 'shrimp') {
      const swarm: Spot[] = [];
      for (let k = 0; k < Math.round(40 * mix(0.6, 1.5, mood.density)); k++) { const t = tips[Math.floor(random() * tips.length)], s = tubeR * range(random, 0.35, 0.6); swarm.push({ at: [t.p.x + range(random, -1, 1) * tubeR * 5, t.p.y * range(random, 0.3, 1.25), t.p.z + range(random, -1, 1) * tubeR * 5], scale: [s * 0.45, s * 0.45, s * 1.6], rot: [random() * 3, random() * 6, 0] }); }
      const im = instances(root, new THREE.SphereGeometry(1, 6, 5), mat('#fff4ea', { roughness: 0.4, emissive: '#5a4a40', emissiveIntensity: 0.5 }), swarm);
      movers.push({ object: im, base: im.position.clone(), phase: 0 });
    }

    settle(root, visibleBounds);
    return {
      object: root,
      footprint: spread * (hedge ? 1.3 : 1),
      update(_dt, time) {
        pose(time);
        for (const m of movers) m.object.position.set(m.base.x + Math.sin(time * 0.5 * energy + m.phase) * tubeR * 2, m.base.y + Math.sin(time * 0.8 * energy + m.phase) * tubeR * 1.5, m.base.z);
      },
      dispose: () => disposeTree(root),
    };
  },
});
