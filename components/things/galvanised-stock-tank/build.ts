import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    fill: score('How full is it?', ['Dry, a cracked mud bottom', 'A few inches left', 'Half full', 'Brim full']),
    water: choice('What is the water like?', {
      clear: 'Clear, with the ribbed bottom showing through.',
      green: 'A green film of algae across the surface.',
      scum: 'Brown scum, straw and dust floating on it.',
      ice: 'Frozen over with a skin of grey ice.',
    }),
    floating: choice('What is floating in it?', {
      nothing: 'Nothing.',
      bird: 'A drowned bird, wings spread.',
      can: 'A crushed beer can.',
      frog: 'A fat frog sitting on the float ball.',
      carcass: 'Something small and dead, bloated and turning.',
    }),
    visitor: choice('Who is at the tank?', {
      nobody: 'Nobody.',
      cow: 'A cow with its head down over the rim, drinking.',
      grazer: 'A six-legged alien grazer with a trunk in the water.',
      birds: 'Small birds perched along the rim.',
    }),
    supply: choice('How is it fed?', {
      float: 'A float valve on a pipe hooked over the rim.',
      standpipe: 'A tall standpipe with a tap dripping into it.',
      hose: 'A garden hose thrown over the edge.',
      nothing: 'Nothing feeds it any more; the pipe is gone.',
    }),
    size: score('How big is the tank?', ['A small round trough', 'A standard eight-foot tank', 'A wide ten-foot tank']),
    mud: score('How churned is the ground around it?', ['Firm dry ground', 'A ring of hoofprints', 'A wide mud wallow']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random, mood } = context;
    const R = mix(0.75, 1.55, a.size), H = 0.62;
    const zinc = s.material('#aeb6b8', { metalness: 0.65, roughness: 0.42 });
    const zincDark = s.material('#8e9598', { metalness: 0.6, roughness: 0.5 });

    // The tank: one lathe up the outside, over a rolled rim and down the inside to the floor.
    const wall = 0.02;
    const profile: [number, number][] = [[0, 0.01], [R, 0.01], [R, H - 0.03], [R + 0.03, H - 0.015], [R + 0.03, H + 0.01], [R - wall, H], [R - wall, 0.04], [0, 0.04]];
    const tank = s.lathe(profile, zinc);
    tank.material = new THREE.MeshStandardMaterial({ color: zinc.color, metalness: 0.65, roughness: 0.42, side: THREE.DoubleSide });
    for (const y of [0.16, 0.32, 0.48]) s.ring(R + 0.012, 0.012, [0, y, 0], zincDark).rotation.x = Math.PI / 2;
    // A scum line where the water usually stands.
    s.ring(R - wall - 0.006, 0.01, [0, H - 0.1, 0], s.material('#5e5b46', { roughness: 1 })).rotation.x = Math.PI / 2;
    // Rust streaks under the rim and at the base, more with wear.
    const rustN = Math.round(mood.wear * 16);
    if (rustN) {
      const rust = s.material('#7a4a2e', { roughness: 0.95 });
      const streaks: { at: P3; size: number }[] = [];
      for (let i = 0; i < rustN; i++) {
        const ang = random() * Math.PI * 2, top = random() < 0.6;
        streaks.push({ at: [Math.sin(ang) * (R + 0.035), top ? H - 0.12 - random() * 0.1 : 0.08 + random() * 0.06, Math.cos(ang) * (R + 0.035)], size: mix(0.04, 0.1, random()) });
      }
      const streak = new THREE.BoxGeometry(0.5, 1.6, 0.1);
      s.scatter(streak, rust, streaks);
    }

    // Water, or the cracked mud floor of an empty tank.
    const level = a.fill < 0.08 ? 0 : mix(0.08, H - 0.05, a.fill);
    const waterTone = { clear: '#5d8590', green: '#5a8c3a', scum: '#6b6245', ice: '#c4ccce' }[a.water];
    const waterMat = s.material(waterTone, {
      roughness: a.water === 'ice' ? 0.45 : a.water === 'clear' ? 0.08 : 0.55,
      metalness: a.water === 'clear' ? 0.3 : 0,
      emissive: a.water === 'green' ? '#2f5a14' : '#000000', emissiveIntensity: a.water === 'green' ? 0.2 : 0,
    });
    if (level > 0) {
      const water = s.cylinder(R - wall - 0.004, R - wall - 0.004, 0.012, [0, level, 0], waterMat, 36);
      water.castShadow = false;
      if (a.water === 'scum') {
        const straw = s.material('#c9b36a', { roughness: 1 });
        const bits: { at: P3; size: number }[] = [];
        for (let i = 0; i < 22; i++) { const ang = random() * Math.PI * 2, d = random() * (R - 0.1); bits.push({ at: [Math.sin(ang) * d, level + 0.008, Math.cos(ang) * d], size: mix(0.02, 0.05, random())}); }
        const bit = new THREE.BoxGeometry(2.5, 0.2, 0.5);
        s.scatter(bit, straw, bits);
      }
      if (a.water === 'green') for (let i = 0; i < 6; i++) {
        const ang = random() * Math.PI * 2, d = random() * (R - 0.25);
        s.cylinder(mix(0.05, 0.18, random()), mix(0.05, 0.18, random()), 0.006, [Math.sin(ang) * d, level + 0.008, Math.cos(ang) * d], s.material('#7fae46', { roughness: 0.9 }), 10).castShadow = false;
      }
      if (a.water === 'ice') for (let i = 0; i < 5; i++) {
        const ang = random() * Math.PI * 2;
        s.box([R * mix(0.4, 1.2, random()), 0.004, 0.012], [Math.sin(ang) * 0.1, level + 0.009, Math.cos(ang) * 0.1], s.material('#f0f4f5')).rotation.y = ang;
      }
    } else {
      const mudFloor = s.material('#6e5a46', { roughness: 1 });
      s.cylinder(R - wall - 0.004, R - wall - 0.004, 0.012, [0, 0.05, 0], mudFloor, 36);
      for (let i = 0; i < 14; i++) {
        const ang = random() * Math.PI * 2, d = random() * (R - 0.15);
        s.box([mix(0.1, 0.3, random()), 0.004, 0.012], [Math.sin(ang) * d, 0.058, Math.cos(ang) * d], s.material('#4a3b2c')).rotation.y = random() * 3;
      }
    }

    // What floats.
    const top = Math.max(level, 0.05);
    if (a.floating === 'bird') {
      const feather = s.material('#3a3632', { roughness: 1 });
      const bx = (random() - 0.5) * R, bz = (random() - 0.5) * R;
      s.ball([0.05, 0.03, 0.08], [bx, top + 0.015, bz], feather, 10);
      s.ball([0.03, 0.025, 0.03], [bx, top + 0.02, bz + 0.09], feather, 8);
      for (const sx of [-1, 1]) s.box([0.14, 0.004, 0.06], [bx + sx * 0.1, top + 0.012, bz], feather).rotation.y = sx * 0.3;
    } else if (a.floating === 'can') {
      const can = s.cylinder(0.033, 0.033, 0.11, [(random() - 0.5) * R, top + 0.015, (random() - 0.5) * R], s.material('#c9c3bb', { metalness: 0.7, roughness: 0.35 }), 12);
      can.rotation.set(Math.PI / 2 + 0.2, random() * 3, 0.2);
      can.scale.set(0.8, 1, 1.1);
    } else if (a.floating === 'carcass') {
      const dead = s.material('#8a7f72', { roughness: 0.9 });
      const cx = (random() - 0.5) * R * 0.8, cz = (random() - 0.5) * R * 0.8;
      s.ball([0.1, 0.07, 0.17], [cx, top + 0.02, cz], dead, 12).rotation.y = random() * 3;
      for (let k = 0; k < 4; k++) s.rod([cx + (k % 2 ? 0.08 : -0.08), top + 0.03, cz + (k < 2 ? 0.08 : -0.08)], [cx + (k % 2 ? 0.16 : -0.16), top + 0.06, cz + (k < 2 ? 0.14 : -0.14)], 0.012, dead);
    }

    // Supply: a float valve, a standpipe or a hose.
    const pipe = s.material('#6f6a62', { metalness: 0.6, roughness: 0.5 });
    const px = R * 0.75, pz = -R * 0.55;
    if (a.supply === 'float' || a.floating === 'frog') {
      // Pipe up the outside, over the rim, and a lever arm out to a ball float on the water.
      s.rod([R + 0.08, 0, pz], [R + 0.08, H + 0.1, pz], 0.022, pipe);
      s.rod([R + 0.08, H + 0.1, pz], [R - 0.12, H + 0.1, pz], 0.022, pipe);
      s.box([0.08, 0.07, 0.07], [R - 0.14, H + 0.08, pz], pipe);
      const floatY = level > 0 ? level + 0.04 : 0.12;
      s.rod([R - 0.16, H + 0.06, pz], [R - 0.5, floatY, pz], 0.01, pipe);
      s.ball([0.09, 0.08, 0.09], [R - 0.52, floatY, pz], s.material('#c9c2a8', { roughness: 0.7 }), 12);
      if (a.floating === 'frog') {
        const frog = s.material('#5a7a2a', { roughness: 0.8 });
        s.ball([0.05, 0.035, 0.06], [R - 0.52, floatY + 0.095, pz], frog, 10);
        s.ball([0.035, 0.028, 0.035], [R - 0.52, floatY + 0.125, pz + 0.045], frog, 8);
        for (const sx of [-1, 1]) s.ball([0.01, 0.01, 0.01], [R - 0.52 + sx * 0.02, floatY + 0.145, pz + 0.06], s.material('#1a1a14'), 6);
      }
    }
    if (a.supply === 'standpipe') {
      const sp = 1.35;
      s.rod([px + 0.3, 0, pz], [px + 0.3, sp, pz], 0.03, pipe);
      s.rod([px + 0.3, sp, pz], [px - 0.1, sp, pz], 0.025, pipe);
      s.rod([px - 0.1, sp, pz], [px - 0.1, sp - 0.12, pz], 0.025, pipe);
      s.box([0.06, 0.03, 0.12], [px + 0.3, sp - 0.14, pz], s.material('#b3302a', { roughness: 0.5 }));
      s.rod([px - 0.1, sp - 0.14, pz], [px - 0.1, Math.max(level, 0.05) + 0.02, pz], 0.006, s.material('#9fc3cc', { roughness: 0.1, metalness: 0.3 }), 0.003);
    }
    if (a.supply === 'hose') {
      const hoseMat = s.material('#2f6b35', { roughness: 0.6 });
      const pts: P3[] = [[R + 1.4, 0.02, 0.9], [R + 0.9, 0.02, 0.3], [R + 0.3, 0.02, -0.2], [R + 0.05, H + 0.04, -0.3], [R - 0.3, Math.max(level, 0.05) + 0.03, -0.4]];
      s.tube(pts, 0.02, hoseMat);
      s.ring(0.3, 0.02, [R + 1.5, 0.02, 1.1], hoseMat).rotation.x = Math.PI / 2;
    }

    // The ground: a mud ring trampled by whatever drinks here.
    const mudR = R + mix(0.15, 1.3, a.mud);
    const mud = s.material(new THREE.Color('#5c4a38').lerp(new THREE.Color('#8b7a62'), 1 - a.mud), { roughness: 1 });
    const ring = s.cylinder(mudR, mudR * 1.04, 0.02, [0, 0.01, 0], mud, 36);
    ring.scale.z = mix(0.85, 1, random());
    if (a.mud > 0.2) {
      const prints: { at: P3; size: number }[] = [];
      const n = Math.round(mix(14, 70, a.mud));
      for (let i = 0; i < n; i++) {
        const ang = random() * Math.PI * 2, d = R + 0.08 + random() * (mudR - R - 0.08);
        prints.push({ at: [Math.sin(ang) * d, 0.022, Math.cos(ang) * d * ring.scale.z], size: mix(0.05, 0.09, random()) });
      }
      const hoof = new THREE.CylinderGeometry(1, 1, 0.12, 7);
      s.scatter(hoof, s.material('#3f3226', { roughness: 1 }), prints);
      for (let i = 0; i < Math.round(a.mud * 10); i++) {
        const ang = random() * Math.PI * 2, d = R + 0.1 + random() * (mudR - R - 0.1);
        s.ball([0.08, 0.04, 0.07], [Math.sin(ang) * d, 0.03, Math.cos(ang) * d * ring.scale.z], mud, 7).rotation.y = random() * 3;
      }
    }

    // A visitor at the rim.
    if (a.visitor === 'cow' || a.visitor === 'grazer') {
      const alien = a.visitor === 'grazer';
      const hideTone = alien ? ['#5f6b78', '#8c4a2e', '#6b7046'][Math.floor(random() * 3)] : ['#3a2e28', '#9a6a42', '#e6dfd0', '#7a4a32'][Math.floor(random() * 4)];
      const hide = s.material(hideTone, { roughness: 0.9 });
      const g = new THREE.Group();
      const C = 0.9; // creature scale
      const put = (m: THREE.Object3D) => { g.add(m); return m; };
      put(s.ball([0.5 * C, 0.48 * C, 1.0 * C], [0, 1.0 * C, 0], hide, 16));
      const legZ = alien ? [0.65, 0, -0.65] : [0.6, -0.6];
      for (const z of legZ) for (const sx of [-1, 1]) {
        put(s.rod([sx * 0.36 * C, 0.75 * C, z * C], [sx * 0.4 * C, 0.05 * C, z * C], 0.08 * C, hide, 0.06 * C));
        put(s.cylinder(0.08 * C, 0.09 * C, 0.08 * C, [sx * 0.4 * C, 0.04 * C, z * C], s.material('#2d2a2a'), 8));
      }
      // Neck down over the rim, head to the water.
      const headY = (Math.max(level, 0.05) + 0.2), headZ = 1.45 * C;
      put(s.rod([0, 1.1 * C, 0.9 * C], [0, headY + 0.15, headZ], 0.17 * C, hide, 0.13 * C));
      put(s.ball([0.22 * C, 0.2 * C, 0.32 * C], [0, headY + 0.1, headZ + 0.1], hide, 12));
      for (const sx of [-1, 1]) put(s.ball([0.05 * C, 0.11 * C, 0.07 * C], [sx * 0.22 * C, headY + 0.2, headZ], hide, 8)).rotation.z = sx * 0.6;
      if (alien) {
        put(s.tube([[0, headY + 0.05, headZ + 0.35 * C], [0, headY - 0.1, headZ + 0.5 * C], [0, Math.max(level, 0.05) + 0.01, headZ + 0.55 * C]], 0.05 * C, hide));
        const plate = s.material('#9aa0a3', { roughness: 0.7, flatShading: true });
        const shell = new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
        for (let i = 0; i < 6; i++) {
          const z = (0.75 - i * 0.3) * C, top = 1.0 * C + 0.48 * C * Math.sqrt(Math.max(0, 1 - (z / C) ** 2));
          const m = put(s.mesh(shell, plate, [0, top - 0.05 * C, z]));
          m.scale.set(0.3 * C, 0.12 * C, 0.18 * C);
          m.rotation.x = -0.3;
        }
      } else {
        for (const sx of [-1, 1]) put(s.cylinder(0.015 * C, 0.04 * C, 0.16 * C, [sx * 0.14 * C, headY + 0.28, headZ - 0.05], s.material('#d9ccb0'), 8)).rotation.z = sx * -0.5;
        put(s.rod([0, 1.1 * C, -1.0 * C], [0.05 * C, 0.45 * C, -1.15 * C], 0.03 * C, hide, 0.02 * C));
      }
      // Stand it on the far side of the rim, facing in.
      const ang = mix(0.7, 1.6, random()) * (random() < 0.5 ? 1 : -1) + Math.PI;
      g.position.set(Math.sin(ang) * (R + 1.35 * C), 0, Math.cos(ang) * (R + 1.35 * C));
      g.rotation.y = ang;
      s.root.add(g);
    }
    if (a.visitor === 'birds') {
      const n = 3 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const ang = random() * Math.PI * 2, tone = s.material(['#6e6358', '#8d8276', '#3f3a36'][i % 3], { roughness: 1 });
        const bx = Math.sin(ang) * (R + 0.01), bz = Math.cos(ang) * (R + 0.01);
        const body = s.ball([0.035, 0.035, 0.055], [bx, H + 0.05, bz], tone, 8);
        body.rotation.y = ang + Math.PI;
        s.ball([0.025, 0.025, 0.025], [bx - Math.sin(ang) * 0.04, H + 0.085, bz - Math.cos(ang) * 0.04], tone, 8);
        s.box([0.012, 0.008, 0.07], [bx + Math.sin(ang) * 0.06, H + 0.06, bz + Math.cos(ang) * 0.06], tone).rotation.y = ang;
      }
    }

    // Still water keeps a slow shimmer; ice and mud do not.
    const shimmer = level > 0 && a.water !== 'ice' ? waterMat : null;
    const speed = mix(0.2, 1.5, mood.energy);
    return s.finish({
      update: (_dt, time) => { if (shimmer) shimmer.roughness = (a.water === 'clear' ? 0.08 : 0.55) + Math.sin(time * speed * 2) * 0.03; },
    });
  },
});
