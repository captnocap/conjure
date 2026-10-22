import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    type: choice('What kind of spout is it?', {
      plain: 'A single upright bamboo post with one slim spout pouring into the basin: the quiet hand-washing kind.',
      scarer: 'A deer-scarer: a pivoting bamboo arm that fills from a spout, tips, empties and swings back to knock on a stone.',
      tiered: 'A cascade of three sloping bamboo troughs on crossed stands, water zigzagging down from one to the next.',
    }),
    basin: choice('What is the basin stone?', {
      boulder: 'A low rough granite boulder with a round hollow worn into its top.',
      coin: 'A round carved stone shaped like an old coin, with a square pool in the middle.',
      block: 'A tall square-cut block with crisp edges and a round bowl.',
      mossy: 'A squat natural rock gone green with moss, the hollow almost hidden.',
    }),
    flow: score('How much water is running?', ['Dry: the pipe has stopped', 'A slow drip', 'A thin bright thread', 'A steady stream', 'Gushing, the basin spilling over']),
    cycle: choice('If it has a tipping arm, where is it in its cycle?', {
      filling: 'Mouth raised under the spout, slowly filling, tail resting on the stone.',
      tipping: 'Tipped forward at the bottom of its swing, emptying in a rush.',
      struck: 'Just swung back: the tail has this instant knocked the stone.',
    }),
    ladle: noul('Is a bamboo ladle laid across the basin?'),
    landed: choice('What has ended up in the basin?', {
      nothing: 'Nothing but water.',
      maple: 'A red maple leaf turning slowly on the surface.',
      camellia: 'A whole red camellia flower that dropped in.',
      ice: 'A skin of ice with a hole melted where the water lands.',
      coins: 'A few coins on the bottom, left as wishes.',
    }),
    setting: choice('What is on the ground around it?', {
      bare: 'Nothing: it stands on whatever floor it is given.',
      pebbles: 'A bed of dark rounded river pebbles for the overflow to drain through.',
      moss: 'A cushion of deep green moss with a fern or two.',
      snow: 'Fresh snow, capping the stone and the bamboo.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();

    const caneTone = new THREE.Color('#86a548').lerp(new THREE.Color('#c9ad68'), Math.min(1, mood.wear * 1.2));
    const cane = new THREE.MeshStandardMaterial({ color: caneTone, roughness: 0.45 });
    const node = new THREE.MeshStandardMaterial({ color: caneTone.clone().multiplyScalar(0.62), roughness: 0.6 });
    const hollow = new THREE.MeshStandardMaterial({ color: '#2b2a1c', roughness: 1 });
    const twine = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1 });
    const stoneTone = { boulder: '#8b8b88', coin: '#9c9a92', block: '#77797c', mossy: '#6f7468' }[a.basin];
    const stone = s.material(stoneTone, { roughness: 0.95, flatShading: a.basin === 'boulder' || a.basin === 'mossy' });
    const rock = s.material('#55585c', { roughness: 0.95, flatShading: true });
    const moss = new THREE.MeshStandardMaterial({ color: '#5d7a35', roughness: 1 });
    const snow = new THREE.MeshStandardMaterial({ color: '#f6f9fb', roughness: 0.95 });
    const waterTone = new THREE.Color('#9fc9d2').lerp(new THREE.Color('#c9dcc0'), mood.warmth * 0.5);
    const water = new THREE.MeshStandardMaterial({ color: waterTone, roughness: 0.1, emissive: waterTone, emissiveIntensity: 0.15 });
    const stream = new THREE.MeshStandardMaterial({ color: '#e2f4f8', roughness: 0.15, emissive: '#bfe6f0', emissiveIntensity: 0.4 });
    const snowy = a.setting === 'snow';

    /** A cane from one point to another, with its ringed nodes; open ends show dark. */
    const bamboo = (from: P3, to: P3, radius: number, parent: THREE.Object3D = s.root, open: 'none' | 'tip' | 'both' = 'tip') => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p), L = d.length();
      const g = new THREE.Group();
      g.position.copy(p);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, L, 12), cane);
      shaft.position.y = L / 2;
      shaft.castShadow = shaft.receiveShadow = true;
      g.add(shaft);
      const count = Math.max(1, Math.round(L / 0.24));
      for (let k = 0; k < count; k++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.03, radius * 0.13, 5, 14), node);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = ((k + 0.5 + r(-0.15, 0.15)) / count) * L;
        g.add(ring);
      }
      for (const end of open === 'both' ? [0, 1] : open === 'tip' ? [1] : []) {
        const mouth = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.8, 12), hollow);
        mouth.rotation.x = end ? -Math.PI / 2 : Math.PI / 2;
        mouth.position.y = end ? L + 0.001 : -0.001;
        g.add(mouth);
      }
      parent.add(g);
      return g;
    };
    const lash = (at: P3, radius: number, axis: 'x' | 'y' | 'z' = 'y') => {
      const band = s.cylinder(radius, radius, 0.035, at, twine, 10);
      if (axis === 'x') band.rotation.z = Math.PI / 2;
      if (axis === 'z') band.rotation.x = Math.PI / 2;
      return band;
    };

    // The basin. Everything else is arranged around where its water is.
    const scarer = a.type === 'scarer';
    const bx = scarer ? -0.36 : 0.08, bz = 0.1;
    const BR = { boulder: 0.3, coin: 0.29, block: 0.2, mossy: 0.32 }[a.basin];
    const BH = { boulder: 0.3, coin: 0.24, block: 0.46, mossy: 0.26 }[a.basin];
    const bowl = BR * (a.basin === 'coin' ? 0.42 : a.basin === 'block' ? 0.78 : 0.6);
    const dry = a.flow < 0.08;
    const surface = BH - (dry ? 0.07 : mix(0.035, 0.008, a.flow));
    if (a.basin === 'block') {
      s.box([BR * 2, BH, BR * 2], [bx, BH / 2, bz], stone);
      s.cylinder(bowl + 0.012, bowl + 0.012, 0.01, [bx, BH + 0.001, bz], rock, 28);
    } else {
      const wobble = a.basin === 'coin' ? 0 : 1;
      const k1 = r(0, 6), k2 = r(0, 6);
      const profile: [number, number][] = a.basin === 'coin'
        ? [[0, 0], [BR * 0.96, 0], [BR, 0.03], [BR, BH - 0.02], [BR * 0.97, BH], [0, BH]]
        : [[0, 0], [BR * 0.8, 0], [BR, BH * 0.3], [BR * 0.95, BH * 0.75], [bowl + 0.05, BH], [bowl, BH - 0.02], [bowl * 0.7, BH - 0.1], [0, BH - 0.12]];
      const lathe = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), a.basin === 'coin' ? 40 : 14);
      if (wobble) {
        const pos = lathe.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), t = Math.atan2(z, x), d = Math.hypot(x, z);
          if (d < bowl + 0.02) continue;
          const f = 1 + 0.1 * Math.sin(t * 2 + k1) + 0.07 * Math.sin(t * 5 + k2 + y * 9);
          pos.setX(i, x * f);
          pos.setZ(i, z * f);
        }
        lathe.computeVertexNormals();
      }
      s.mesh(lathe, stone, [bx, 0, bz]);
      if (a.basin === 'coin') {
        s.box([bowl * 2 + 0.03, 0.012, bowl * 2 + 0.03], [bx, BH + 0.001, bz], rock);
        // Four worn characters around the square pool, as raised bars.
        for (let i = 0; i < 4; i++) {
          const t = (i / 4) * Math.PI * 2, d = BR * 0.72;
          const mark = s.box([0.07, 0.008, 0.012], [bx + Math.cos(t) * d, BH + 0.003, bz + Math.sin(t) * d], rock);
          mark.rotation.y = -t;
          const tick = s.box([0.012, 0.008, 0.05], [bx + Math.cos(t) * d, BH + 0.003, bz + Math.sin(t) * d], rock);
          tick.rotation.y = -t;
        }
      }
    }
    if (!dry || a.landed === 'ice') {
      const top = a.landed === 'ice' ? new THREE.MeshStandardMaterial({ color: '#e9f3f6', roughness: 0.35 }) : water;
      if (a.basin === 'coin') s.box([bowl * 2, 0.012, bowl * 2], [bx, surface + (a.basin === 'coin' ? 0.012 : 0), bz], top).castShadow = false;
      else s.cylinder(bowl, bowl, 0.012, [bx, a.basin === 'block' ? BH + 0.006 : surface, bz], top, 28).castShadow = false;
    }
    const wy = a.basin === 'block' || a.basin === 'coin' ? BH + 0.014 : surface + 0.007; // where things float

    if (a.basin === 'mossy' || mood.wear > 0.5 || a.setting === 'moss') {
      const n = a.basin === 'mossy' ? 26 : Math.round(mix(4, 14, mood.wear));
      for (let i = 0; i < n; i++) {
        const t = r(0, 6.3), up = r(0.15, 1), d = (a.basin === 'block' ? BR * 1.02 / Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t))) : BR * mix(1, 0.75, up * up));
        s.ball([r(0.04, 0.09), r(0.02, 0.04), r(0.04, 0.08)], [bx + Math.cos(t) * d, BH * up * 0.95, bz + Math.sin(t) * d], moss, 7);
      }
    }

    // Where water lands, and what pours it.
    const streams: { mesh: THREE.Mesh; when: 'always' | 'pour' }[] = [];
    const pour = (from: P3, to: P3, width: number, when: 'always' | 'pour' = 'always', lead: P3 = [0, 0, 0]) => {
      const mid: P3 = [from[0] + (to[0] - from[0]) * 0.55 + lead[0], from[1] - 0.012, from[2] + (to[2] - from[2]) * 0.55 + lead[2]];
      const path = new THREE.CatmullRomCurve3([new THREE.Vector3(...from), new THREE.Vector3(...mid), new THREE.Vector3(...to)]);
      const mesh = s.mesh(new THREE.TubeGeometry(path, 14, width, 6), stream);
      mesh.castShadow = false;
      streams.push({ mesh, when });
      const ring = s.ring(width * 3 + 0.012, 0.004, [to[0], to[1] + 0.002, to[2]], stream);
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = false;
      streams.push({ mesh: ring, when });
    };
    const width = mix(0.003, 0.016, a.flow);
    const drip = (at: P3) => { for (let i = 0; i < 2; i++) s.ball([0.007, 0.011, 0.007], [at[0], at[1] - 0.05 - i * 0.12, at[2]], stream, 6); };
    const run = (from: P3, to: P3) => { if (dry) return; if (a.flow < 0.3) drip(from); else pour(from, to, width); };

    let pivot: THREE.Group | null = null;
    let knock: P3 = [0, 0, 0];
    if (a.type === 'plain') {
      const px = bx - BR - 0.14, pz = bz - 0.12, PH = BH + 0.5;
      bamboo([px, 0, pz], [px, PH, pz], 0.045, s.root, 'none');
      s.cylinder(0.047, 0.047, 0.012, [px, PH, pz], node, 12);
      const tip: P3 = [bx - bowl * 0.25, BH + 0.2, bz - 0.01];
      bamboo([px - 0.07, PH - 0.1, pz - 0.02], tip, 0.02);
      lash([px, PH - 0.115, pz], 0.05);
      run(tip, [bx - bowl * 0.1, wy, bz]);
      if (snowy) s.ball([0.05, 0.035, 0.05], [px, PH + 0.02, pz], snow, 10);
    } else if (scarer) {
      // Feed post and spout on the left, the arm on its two-post pivot in the middle, the knock stone on the right.
      const fx = bx - BR - 0.16, fz = bz - 0.16, mouth: P3 = [-0.3, 0.63, bz];
      bamboo([fx, 0, fz], [fx, 0.92, fz], 0.042, s.root, 'none');
      s.cylinder(0.044, 0.044, 0.012, [fx, 0.92, fz], node, 12);
      const tip: P3 = [mouth[0] - 0.02, 0.78, bz];
      bamboo([fx - 0.06, 0.86, fz - 0.02], tip, 0.019);
      lash([fx, 0.845, fz], 0.047);
      const px = 0.1, py = 0.44;
      for (const side of [-1, 1]) {
        bamboo([px, 0, bz + side * 0.085], [px, py + 0.12, bz + side * 0.085], 0.026, s.root, 'none');
        if (snowy) s.ball([0.03, 0.022, 0.03], [px, py + 0.135, bz + side * 0.085], snow, 8);
      }
      const axle = s.cylinder(0.009, 0.009, 0.24, [px, py, bz], twine, 8);
      axle.rotation.x = Math.PI / 2;
      pivot = new THREE.Group();
      pivot.position.set(px, py, bz);
      s.root.add(pivot);
      const armCane = bamboo([0.34, 0, 0], [-0.46, 0, 0], 0.04, pivot);
      armCane.children[0].castShadow = true;
      // The mouth is cut on a long slant.
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.09, 12, 1, true, 0, Math.PI), cane);
      lip.rotation.z = Math.PI / 2;
      lip.rotation.x = Math.PI;
      lip.position.set(-0.5, 0, 0);
      pivot.add(lip);
      knock = [px + 0.33, 0, bz];
      const anvil = s.mesh(new THREE.IcosahedronGeometry(1, 1), rock, [knock[0] + 0.03, 0.13, knock[2]]);
      anvil.scale.set(0.17, 0.15, 0.15);
      anvil.rotation.y = r(0, 3);
      if (snowy) s.ball([0.1, 0.03, 0.09], [knock[0] + 0.06, 0.275, knock[2] - 0.03], snow, 8);
      if (!dry) {
        if (a.flow < 0.3) drip(tip); else pour(tip, [tip[0] + 0.01, 0.62, tip[2]], width);
        pour([px - 0.47, 0.2, bz], [bx + 0.04, wy, bz], 0.02, 'pour', [-0.03, 0, 0]);
      }
    } else {
      // Three troughs on crossed stands, each lower than the last, the bottom one over the basin.
      const zs = [bz - 0.14, bz - 0.07, bz];
      const runs: [P3, P3][] = [
        [[bx - 0.75, BH + 0.78, zs[0]], [bx - 0.08, BH + 0.66, zs[0]]],
        [[bx + 0.2, BH + 0.52, zs[1]], [bx - 0.5, BH + 0.41, zs[1]]],
        [[bx - 0.62, BH + 0.3, zs[2]], [bx - bowl * 0.3, BH + 0.17, zs[2]]],
      ];
      runs.forEach(([hi, lo], i) => {
        const dir = Math.sign(lo[0] - hi[0]);
        bamboo([hi[0] - dir * 0.05, hi[1] + 0.008, hi[2]], [lo[0] + dir * 0.04, lo[1] - 0.006, lo[2]], 0.034, s.root, 'both');
        for (const f of [0.14, 0.8]) {
          const x = hi[0] + (lo[0] - hi[0]) * f, y = hi[1] + (lo[1] - hi[1]) * f - 0.035, z = hi[2];
          bamboo([x - 0.03, 0, z - 0.17], [x + 0.01, y + 0.13, z + 0.07], 0.015, s.root, 'none');
          bamboo([x + 0.03, 0, z + 0.17], [x - 0.01, y + 0.13, z - 0.07], 0.015, s.root, 'none');
          lash([x, y - 0.012, z], 0.022, 'x');
        }
        const next = runs[i + 1];
        const fall: P3 = next ? [lo[0] + dir * 0.05, next[0][1] + (next[1][1] - next[0][1]) * 0.12 + 0.03, next[0][2]] : [bx - bowl * 0.1, wy, bz];
        run([lo[0] + dir * 0.04, lo[1] - 0.02, lo[2]], fall);
        if (snowy) for (let k = 0; k < 3; k++) { const f = r(0.1, 0.9); s.ball([r(0.05, 0.1), 0.022, 0.03], [hi[0] + (lo[0] - hi[0]) * f, hi[1] + (lo[1] - hi[1]) * f + 0.035, hi[2]], snow, 8); }
      });
      if (!dry) drip([runs[0][0][0], runs[0][0][1] + 0.1, runs[0][0][2]]);
    }
    // Overflow down the stone when it gushes.
    if (a.flow > 0.82) {
      const wet = new THREE.MeshStandardMaterial({ color: '#dff1f5', roughness: 0.1, transparent: true, opacity: 0.6, depthWrite: false });
      for (let i = 0; i < 3; i++) {
        const t = r(0.1, 1.3) + i * 0.5;
        const d = a.basin === 'block' ? BR + 0.005 : BR * 1.02;
        const sheet = s.box([0.07, BH * 0.9, 0.008], [bx + Math.sin(t) * d, BH * 0.5, bz + Math.cos(t) * d], wet);
        sheet.rotation.y = a.basin === 'block' ? Math.round(t / (Math.PI / 2)) * (Math.PI / 2) : t;
        if (a.basin === 'block') sheet.position.set(bx + Math.sin(sheet.rotation.y) * d + Math.cos(sheet.rotation.y) * r(-0.1, 0.1), BH * 0.5, bz + Math.cos(sheet.rotation.y) * d);
        sheet.castShadow = false;
      }
    }

    // The ladle, laid on two slim canes across the rim or straight on the stone.
    if (a.ladle) {
      const y = BH + 0.03, z0 = bz + (a.basin === 'coin' ? BR * 0.62 : bowl * 0.45);
      if (a.basin !== 'coin') for (const dz of [-0.035, 0.035]) bamboo([bx - BR * 0.92, y - 0.012, z0 + dz], [bx + BR * 0.92, y - 0.012, z0 + dz], 0.009, s.root, 'none');
      const g = new THREE.Group();
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.07, 14), cane);
      cup.castShadow = true;
      const inside = new THREE.Mesh(new THREE.CircleGeometry(0.031, 12), hollow);
      inside.rotation.x = -Math.PI / 2;
      inside.position.y = 0.0355;
      g.add(cup, inside);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.36, 6), cane);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(0.2, 0.008, 0);
      handle.castShadow = true;
      g.add(handle);
      g.position.set(bx - BR * 0.45, y + 0.035, z0);
      g.rotation.y = r(-0.12, 0.12);
      s.root.add(g);
    }

    // What has landed in the water.
    const lx = bx + bowl * 0.35, lz = bz + bowl * 0.2;
    if (a.landed === 'maple' && !dry) {
      const leaf = new THREE.Shape();
      for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2, d = i % 2 ? 0.35 : 1; if (i) leaf.lineTo(Math.cos(t) * d, Math.sin(t) * d); else leaf.moveTo(d, 0); }
      const flat = s.mesh(new THREE.ShapeGeometry(leaf).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c8321e', roughness: 0.8, side: THREE.DoubleSide }), [lx, wy + 0.002, lz]);
      flat.scale.setScalar(0.055);
      flat.rotation.y = r(0, 6);
    } else if (a.landed === 'camellia' && !dry) {
      const petal = new THREE.MeshStandardMaterial({ color: '#c4203a', roughness: 0.6 });
      for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; s.ball([0.028, 0.012, 0.028], [lx + Math.cos(t) * 0.022, wy + 0.01, lz + Math.sin(t) * 0.022], petal, 8); }
      s.ball([0.016, 0.014, 0.016], [lx, wy + 0.022, lz], new THREE.MeshStandardMaterial({ color: '#f2cb3b' }), 8);
    } else if (a.landed === 'ice') {
      s.cylinder(0.045, 0.045, 0.014, [bx - bowl * 0.1, wy, bz], water, 12);
      for (let i = 0; i < 4; i++) { const crack = s.box([bowl * r(0.5, 0.9), 0.003, 0.004], [bx + r(-0.05, 0.05), wy + 0.001, bz + r(-0.05, 0.05)], water); crack.rotation.y = r(0, 3); }
    } else if (a.landed === 'coins' && !dry) {
      const brass = new THREE.MeshStandardMaterial({ color: '#d2a53c', metalness: 0.8, roughness: 0.3, emissive: '#6b4e10', emissiveIntensity: 0.4 });
      for (let i = 0; i < 5; i++) s.cylinder(0.016, 0.016, 0.004, [bx + r(-0.6, 0.6) * bowl, wy + 0.002, bz + r(-0.6, 0.6) * bowl], brass, 10).rotation.z = r(-0.2, 0.2);
    }

    // The ground it keeps.
    const spanL = a.type === 'tiered' ? bx - 0.85 : scarer ? bx - BR - 0.3 : bx - BR - 0.3;
    const spanR = scarer ? 0.66 : bx + BR + 0.2;
    const cx = (spanL + spanR) / 2, rx = (spanR - spanL) / 2 + 0.08, rz = BR + 0.36;
    if (a.setting !== 'bare') {
      const patch = new THREE.Shape();
      for (let i = 0; i <= 36; i++) {
        const t = (i / 36) * Math.PI * 2, f = 1 + Math.sin(t * 3 + 1) * 0.06 + Math.sin(t * 5) * 0.04;
        if (i) patch.lineTo(Math.cos(t) * rx * f, Math.sin(t) * rz * f); else patch.moveTo(rx * f, 0);
      }
      const tone = { pebbles: '#6d6f70', moss: '#55742f', snow: '#f6f9fb' }[a.setting];
      const bed = new THREE.ExtrudeGeometry(patch, { depth: a.setting === 'pebbles' ? 0.012 : 0.03, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 2 }).rotateX(-Math.PI / 2);
      s.mesh(bed, new THREE.MeshStandardMaterial({ color: tone, roughness: 1 }), [cx, 0.012, bz]);
      if (a.setting === 'pebbles') {
        const tints = ['#3f4245', '#5a5d60', '#787a7a', '#2f3234'];
        const pebbles = Array.from({ length: Math.round(mix(70, 170, mood.density)) }, () => {
          const t = r(0, 6.3), d = Math.sqrt(random()) * 0.94;
          return { at: [cx + Math.cos(t) * d * rx, 0.036, bz + Math.sin(t) * d * rz] as P3, size: r(0.018, 0.034), color: tints[Math.floor(random() * 4)] };
        });
        s.scatter(new THREE.SphereGeometry(1, 7, 5).scale(1, 0.55, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), pebbles);
      } else if (a.setting === 'moss') {
        for (let i = 0; i < 9; i++) { const t = r(0, 6.3), d = r(0.5, 0.95); s.ball([r(0.08, 0.14), r(0.03, 0.05), r(0.08, 0.13)], [cx + Math.cos(t) * d * rx, 0.045, bz + Math.sin(t) * d * rz], moss, 8); }
        const frond = new THREE.MeshStandardMaterial({ color: '#3f7a3a', roughness: 0.8, side: THREE.DoubleSide });
        for (let f = 0; f < 2; f++) {
          const fx = f ? spanR - 0.02 : spanL + 0.16, fz = bz + (f ? 0.2 : 0.26);
          for (let i = 0; i < 7; i++) {
            const t = (i / 7) * Math.PI * 2 + r(-0.2, 0.2);
            const blade = s.mesh(new THREE.ConeGeometry(0.03, 0.26, 4).translate(0, 0.13, 0).scale(1, 1, 0.2), frond, [fx, 0.04, fz]);
            blade.rotation.set(0, t, 0);
            blade.rotateX(r(0.7, 1.05));
          }
        }
      } else {
        // Snow sits on the stone's shoulders too.
        for (let i = 0; i < 6; i++) {
          const t = r(Math.PI * 0.9, Math.PI * 2.1), d = a.basin === 'block' ? BR * 0.85 : (bowl + BR) * 0.5;
          if (a.basin === 'coin') continue;
          s.ball([r(0.05, 0.085), 0.03, r(0.04, 0.07)], [bx + Math.cos(t) * d, BH + (a.basin === 'block' ? 0.015 : -0.03), bz + Math.sin(t) * d], snow, 8);
        }
      }
    }

    // The deer-scarer's swing: a long fill, a quick tip, a pour, and the knock home.
    const REST = -0.4, TIPPED = 0.62;
    const swing = (p: number) => {
      if (p < 0.03) return REST + Math.sin((p / 0.03) * Math.PI) * 0.07; // the bounce off the stone
      if (p < 0.7) return REST;
      if (p < 0.78) return mix(REST, TIPPED, ((p - 0.7) / 0.08) ** 2);
      if (p < 0.92) return TIPPED;
      return mix(TIPPED, REST, ((p - 0.92) / 0.08) ** 2);
    };
    const start = { filling: 0.35, tipping: 0.84, struck: 0.012 }[a.cycle];
    const period = mix(14, 3.5, a.flow) / mix(0.7, 1.5, mood.energy);
    const pose = (time: number) => {
      const p = dry ? 0.35 : (start + time / period) % 1;
      if (pivot) pivot.rotation.z = swing(p);
      for (const item of streams) if (item.when === 'pour') item.mesh.visible = p > 0.76 && p < 0.93;
    };
    pose(0);
    if (scarer && a.cycle === 'struck' && !dry) {
      // The knock, drawn: two short ticks above the stone.
      for (const side of [-1, 1]) { const tick = s.box([0.01, 0.07, 0.01], [knock[0] + 0.06 + side * 0.09, 0.42, knock[2]], twine); tick.rotation.z = -side * 0.5; }
    }
    return s.finish({ update: (_dt, time) => pose(time) });
  },
});
