import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    vessel: choice('What serves as the ashtray?', {
      'coffee-tin': 'An instant coffee tin with a faded red and gold label.',
      'pickle-jar': 'A big glass pickle jar with brown water at the bottom.',
      can: 'A food can with the label peeled off and a jagged rim.',
      'sardine-tin': 'A flat sardine tin with its lid rolled back.',
      bottle: 'The cut-off bottom of a blue plastic bottle.',
      saucer: 'A chipped china saucer from a set long since broken.',
    }),
    stand: choice('What does it stand on?', {
      stool: 'A round wooden stool with splayed legs, brought out from a kitchen.',
      ledge: 'A concrete window ledge under frosted glass bricks.',
      crate: 'An upturned plastic bottle crate.',
      step: 'The edge of a concrete stair step.',
    }),
    fullness: score('How full of cigarette ends is it?', ['Just emptied, two or three', 'A week’s worth', 'Packed to the rim', 'Heaped over and spilling']),
    smoke: choice('Is anything burning?', {
      lit: 'A lit cigarette rests on the rim, a thin thread of smoke rising straight.',
      stubbed: 'Just stubbed out: a faint curl still rises from inside.',
      cold: 'Nothing: everything in it is cold.',
    }),
    beside: choice('What lies beside it?', {
      matchbox: 'A box of matches, half open, with spent matches around.',
      lighter: 'A cheap bright disposable lighter.',
      pack: 'A crumpled soft pack with one cigarette left.',
      glasses: 'Reading glasses on a folded newspaper.',
      tea: 'A glass of tea in a metal holder, gone cold.',
      nothing: 'Nothing beside it.',
    }),
    ritual: choice('Whose habit is this?', {
      solitary: 'One person: every end is the same orange filter, smoked to the same length.',
      pair: 'Two people: orange filters and slim white ones, some marked with lipstick.',
      crowd: 'The whole floor: mixed brands, and ends dropped around the stand as well.',
      rollups: 'Someone who rolls their own: thin unfiltered ends and a pouch habit.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random, scale } = context;
    const close = scale === 'macro';
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // The stand: T is the height of the surface, (hx, hz) the usable half extents.
    let T = 0, hx = 0.15, hz = 0.15;
    if (a.stand === 'stool') {
      const wood = s.material(pick(['#9b6b3f', '#7a5236', '#b98a52', '#c7c2b4']), { roughness: 0.7 });
      T = close ? 0.03 : 0.43; hx = hz = 0.125;
      s.cylinder(0.165, 0.16, 0.03, [0, T - 0.015, 0], wood, 28);
      if (!close) {
        for (let k = 0; k < 3; k++) {
          const ang = (k / 3) * Math.PI * 2 + 0.5;
          s.rod([Math.cos(ang) * 0.1, T - 0.03, Math.sin(ang) * 0.1], [Math.cos(ang) * 0.17, 0, Math.sin(ang) * 0.17], 0.016, wood, 0.02);
          const next = ((k + 1) / 3) * Math.PI * 2 + 0.5;
          s.rod([Math.cos(ang) * 0.145, 0.15, Math.sin(ang) * 0.145], [Math.cos(next) * 0.145, 0.15, Math.sin(next) * 0.145], 0.009, wood);
        }
      }
    } else if (a.stand === 'ledge') {
      T = close ? 0.05 : 0.34; hx = 0.2; hz = 0.1;
      const concrete = s.material('#b3afa3', { roughness: 0.95 });
      s.box([0.58, 0.05, 0.3], [0, T - 0.025, 0], concrete);
      if (!close) s.box([0.54, T - 0.05, 0.16], [0, (T - 0.05) / 2, -0.07], s.material(pick(['#8c9a6a', '#a3bac4', '#c7a252']), { roughness: 0.5 }));
      const glass = new THREE.MeshStandardMaterial({ color: '#cfe3da', roughness: 0.25, transparent: true, opacity: 0.72, emissive: '#dff0e6', emissiveIntensity: mix(0.05, 0.3, 1 - Math.abs(mood.daylight - 0.5) * 2) });
      const grout = s.material('#8f8c84');
      const rowsUp = close ? 1 : 2;
      s.box([0.53, rowsUp * 0.19 + 0.01, 0.05], [0, T + (rowsUp * 0.19 + 0.01) / 2, -0.115], grout);
      for (let r = 0; r < rowsUp; r++) for (let c = 0; c < 3; c++) s.box([0.16, 0.175, 0.075], [(c - 1) * 0.172, T + 0.097 + r * 0.19, -0.115], glass);
    } else if (a.stand === 'crate') {
      T = close ? 0.03 : 0.3; hx = 0.17; hz = 0.13;
      const plastic = s.material(pick(['#c23b2e', '#2f6fb0', '#d9a520', '#3d8a56']), { roughness: 0.6 });
      s.box([0.42, 0.025, 0.32], [0, T - 0.0125, 0], plastic);
      if (!close) {
        for (const y of [0.02, T * 0.5]) { for (const z of [-1, 1]) s.box([0.42, 0.04, 0.016], [0, y, z * 0.152], plastic); for (const x of [-1, 1]) s.box([0.016, 0.04, 0.32], [x * 0.202, y, 0], plastic); }
        for (const x of [-1, -0.33, 0.33, 1]) for (const z of [-1, 1]) s.box([0.02, T, 0.018], [x * 0.2, T / 2, z * 0.152], plastic);
        for (const z of [-0.5, 0.5]) for (const x of [-1, 1]) s.box([0.018, T, 0.02], [x * 0.202, T / 2, z * 0.15], plastic);
      }
    } else {
      T = 0.17; hx = 0.18; hz = 0.1;
      const concrete = s.material('#aeaa9e', { roughness: 0.95 });
      s.box([0.48, 0.17, 0.28], [0, 0.085, 0], concrete);
      if (!close) { s.box([0.48, 0.34, 0.2], [0, 0.17, -0.24], concrete); s.box([0.05, 0.6, 0.48], [-0.265, 0.3, -0.1], s.material(pick(['#8c9a6a', '#a3bac4', '#c7a252']), { roughness: 0.5 })); }
      s.box([0.48, 0.012, 0.03], [0, 0.171, 0.126], s.material('#6d5a44', { roughness: 0.6 }));
    }

    // The vessel. R is its inner radius, vh its height, cx its place on the surface.
    const cx = a.beside === 'nothing' ? 0 : -Math.min(0.05, hx * 0.3), cz = 0;
    let R = 0.05, vh = 0.12, floorY = T + 0.004;
    const tinMat = s.material('#b9bcbc', { metalness: 0.7, roughness: mix(0.3, 0.7, mood.wear), side: THREE.DoubleSide });
    const cup = (radius: number, height: number, material: THREE.Material, flare = 0) =>
      s.lathe([[0.001, 0.002], [radius, 0.002], [radius + flare, height], [radius + flare - 0.003, height], [radius - 0.003, 0.006], [0.001, 0.006]], material, [cx, T, cz]);
    if (a.vessel === 'coffee-tin') {
      R = 0.05; vh = 0.125; cup(R, vh, tinMat);
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#8f1f1c'; g.fillRect(0, 0, 512, 160);
      g.fillStyle = '#d7ae4c'; g.fillRect(0, 12, 512, 8); g.fillRect(0, 140, 512, 8);
      g.font = 'bold 64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const x of [128, 384]) { g.fillStyle = '#e9c765'; g.fillText(pick(['KAVA', 'KAWA', 'CAFÉ', 'KÁVÉ']), x, 72); g.font = 'italic 22px serif'; g.fillText('instant · 200 g', x, 118); g.font = 'bold 64px serif'; }
      for (let k = 0; k < mood.wear * 60; k++) { g.fillStyle = `rgba(${150 + random() * 60},${130 + random() * 40},${110},${0.3 + random() * 0.5})`; g.fillRect(random() * 512, random() * 160, 4 + random() * 30, 2 + random() * 10); }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.CylinderGeometry(R + 0.0008, R + 0.0008, vh * 0.8, 32, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), [cx, T + vh * 0.5, cz]).rotation.y = random() * 6;
      s.ring(R, 0.0025, [cx, T + vh, cz], tinMat).rotation.x = Math.PI / 2;
    } else if (a.vessel === 'pickle-jar') {
      R = 0.058; vh = 0.165;
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1ea', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      s.lathe([[0.001, 0.003], [R, 0.003], [R + 0.002, 0.02], [R + 0.002, vh - 0.035], [R - 0.008, vh - 0.018], [R - 0.008, vh]], glass, [cx, T, cz]).castShadow = false;
      const rim = s.material('#cfe0da', { roughness: 0.15 });
      for (const y of [vh - 0.012, vh - 0.004]) s.ring(R - 0.007, 0.0028, [cx, T + y, cz], rim).rotation.x = Math.PI / 2;
      s.ring(R + 0.001, 0.003, [cx, T + 0.004, cz], rim).rotation.x = Math.PI / 2;
      s.cylinder(R - 0.002, R - 0.002, 0.03, [cx, T + 0.02, cz], s.material('#5a4326', { roughness: 0.15 }), 24);
      floorY = T + 0.034;
      const label = s.mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.06, 20, 1, true, random() * 6, 1.4 + random()), s.material('#e3dcc3', { side: THREE.DoubleSide, roughness: 0.95 }), [cx, T + 0.075, cz]);
      label.castShadow = false;
    } else if (a.vessel === 'can') {
      R = 0.042; vh = 0.105; cup(R, vh, tinMat);
      for (const y of [0.025, 0.04, 0.055, 0.07, 0.085]) s.ring(R + 0.0005, 0.0018, [cx, T + y, cz], tinMat).rotation.x = Math.PI / 2;
      const lid = s.cylinder(R - 0.003, R - 0.003, 0.0015, [cx - R * 0.9, T + vh + R * 0.55, cz], tinMat, 20);
      lid.rotation.z = -1.1;
    } else if (a.vessel === 'sardine-tin') {
      R = 0.04; vh = 0.026;
      const body = s.mesh(new THREE.CylinderGeometry(0.045, 0.043, vh, 28, 1, true), tinMat, [cx, T + vh / 2, cz]);
      body.scale.set(1.35, 1, 0.9);
      const base = s.cylinder(0.043, 0.043, 0.003, [cx, T + 0.0015, cz], tinMat, 28); base.scale.set(1.35, 1, 0.9);
      const roll = s.cylinder(0.011, 0.011, 0.07, [cx - 0.055, T + vh + 0.008, cz], s.material('#c9a23c', { metalness: 0.6, roughness: 0.35 }), 12);
      roll.rotation.x = Math.PI / 2;
      s.rod([cx - 0.055, T + vh + 0.008, cz + 0.035], [cx - 0.055, T + vh + 0.008, cz + 0.055], 0.002, tinMat);
    } else if (a.vessel === 'bottle') {
      R = 0.045; vh = 0.085;
      const pet = new THREE.MeshPhysicalMaterial({ color: '#5aa7d6', transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
      s.lathe([[0.001, 0.008], [R * 0.6, 0.002], [R, 0.014], [R, vh]], pet, [cx, T, cz]).castShadow = false;
      s.ring(R, 0.0015, [cx, T + vh, cz], s.material('#3d86b5')).rotation.x = Math.PI / 2;
      s.ring(R, 0.0015, [cx, T + 0.03, cz], s.material('#3d86b5')).rotation.x = Math.PI / 2;
    } else {
      R = 0.06; vh = 0.018;
      const china = s.material('#eeeade', { roughness: 0.25, side: THREE.DoubleSide });
      s.lathe([[0.001, 0.004], [0.035, 0.004], [0.075, 0.018], [0.078, 0.02], [0.036, 0.0], [0.001, 0.0]], china, [cx, T, cz]);
      s.ring(0.07, 0.0016, [cx, T + 0.0185, cz], s.material(pick(['#2f5fa8', '#b23a3a', '#c9a23c']))).rotation.x = Math.PI / 2;
      floorY = T + 0.006;
    }

    // Cigarette ends, instanced: filter and burnt paper stub.
    const shallow = vh < 0.03;
    const fillTop = shallow ? floorY + 0.004 + a.fullness * 0.02 : mix(floorY + 0.008, T + vh + (a.fullness > 0.8 ? 0.012 : -0.004), Math.min(1, a.fullness * 1.15));
    const visibleThrough = a.vessel === 'pickle-jar' || a.vessel === 'bottle';
    const inside = Math.round(mix(3, visibleThrough ? 150 : 60, a.fullness) * (shallow ? 0.35 : 1));
    const spilled = Math.round((a.fullness > 0.8 ? 8 : 0) + (a.ritual === 'crowd' ? 10 + mood.density * 14 : mood.density * 3));
    const total = inside + spilled;
    const thin = a.ritual === 'rollups';
    const filterGeo = new THREE.CylinderGeometry(thin ? 0.0028 : 0.004, thin ? 0.0028 : 0.004, 0.016, 8);
    filterGeo.translate(0, 0.008, 0);
    const stubGeo = new THREE.CylinderGeometry(thin ? 0.0026 : 0.0038, thin ? 0.003 : 0.0042, 0.012, 8);
    stubGeo.translate(0, 0.022, 0);
    const paperMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
    const filters = new THREE.InstancedMesh(filterGeo, paperMat, total);
    const stubs = new THREE.InstancedMesh(stubGeo, paperMat, total);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const orange = new THREE.Color('#d9903d'), white = new THREE.Color('#efece2'), lipstick = new THREE.Color('#d0486a'), brown = new THREE.Color('#c9b48a');
    for (let i = 0; i < total; i++) {
      const out = i >= inside;
      if (!out) {
        const rr = Math.sqrt(random()) * (R - 0.008), ang = random() * Math.PI * 2;
        const level = visibleThrough ? mix(floorY, fillTop, random()) : mix(Math.max(floorY, fillTop - 0.02), fillTop, random());
        p.set(cx + Math.cos(ang) * rr, level, cz + Math.sin(ang) * rr);
        e.set((random() - 0.5) * (shallow ? 3.1 : 1.4) + (shallow ? Math.PI / 2 : 0), random() * 6.3, (random() - 0.5) * (shallow ? 0.3 : 1.4));
      } else {
        const onStand = random() < 0.5;
        const ang = random() * Math.PI * 2, rr = R + 0.02 + random() * 0.08;
        if (onStand) p.set(Math.max(-hx, Math.min(hx, cx + Math.cos(ang) * rr)), T + 0.004, Math.max(-hz, Math.min(hz, cz + Math.sin(ang) * rr)));
        else p.set(Math.cos(ang) * (hx + 0.08 + random() * 0.14), 0.004, Math.abs(Math.sin(ang)) * (hz + 0.06 + random() * 0.16));
        e.set(Math.PI / 2, 0, random() * 6.3);
      }
      const len = 0.7 + random() * 0.8;
      q.setFromEuler(e); sc.set(1, 1, 1);
      mtx.compose(p, q, sc);
      filters.setMatrixAt(i, mtx);
      sc.set(1, len, 1); mtx.compose(p, q, sc);
      stubs.setMatrixAt(i, mtx);
      const pairWhite = a.ritual === 'pair' && random() < 0.45;
      const tone = thin ? brown : a.ritual === 'solitary' ? orange : pairWhite ? (random() < 0.5 ? lipstick : white) : a.ritual === 'crowd' ? pick([orange, orange, white, brown]) : orange;
      filters.setColorAt(i, tone.clone().multiplyScalar(0.85 + random() * 0.15));
      stubs.setColorAt(i, new THREE.Color().setHSL(0.1, 0.1, 0.3 + random() * 0.55));
    }
    filters.castShadow = stubs.castShadow = true;
    s.root.add(filters, stubs);
    // Ash bed.
    if (!visibleThrough) s.cylinder(R - 0.004, R - 0.004, 0.003, [cx, Math.max(floorY, fillTop - 0.022), cz], s.material('#5d5a56', { roughness: 1 }), 20);

    // Smoke: a thin see-through thread that wavers.
    let sx = cx, sy = fillTop + 0.01, sz = cz;
    const ember = s.material('#ff6a1e', { emissive: '#ff5a10', emissiveIntensity: 2 });
    if (a.smoke === 'lit') {
      const rimY = T + vh + 0.004;
      const from: [number, number, number] = [cx + R * 0.55, rimY - 0.006, cz + R * 0.3], to: [number, number, number] = [cx + R + 0.045, rimY + 0.012, cz + R * 0.55];
      const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
      const mid = new THREE.Vector3(...from).addScaledVector(dir, 0.28).toArray() as [number, number, number];
      const tipA = new THREE.Vector3(...from).addScaledVector(dir, 0.86).toArray() as [number, number, number];
      s.rod(from, mid, 0.004, s.material(thin ? '#e9e3d2' : '#d9903d'));
      s.rod(mid, tipA, 0.0039, s.material('#f1eee6'));
      s.rod(tipA, to, 0.0039, s.material('#8d8a85'), 0.003);
      s.ball([0.004, 0.004, 0.004], tipA, ember, 8);
      [sx, sy, sz] = to;
    }
    let smokeMesh: THREE.Mesh | null = null, basePositions: Float32Array | null = null;
    const smokeH = a.smoke === 'lit' ? 0.42 : 0.2;
    if (a.smoke !== 'cold') {
      const pts = Array.from({ length: 9 }, (_u, k) => new THREE.Vector3(0, (k / 8) * smokeH, 0));
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 1, 6, false);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) {
        const y = pos.getY(k) / smokeH;
        const w = mix(0.0015, a.smoke === 'lit' ? 0.012 : 0.02, Math.max(0, y) ** 1.5);
        pos.setXYZ(k, pos.getX(k) * w, pos.getY(k), pos.getZ(k) * w);
      }
      basePositions = (pos.array as Float32Array).slice();
      smokeMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#f4f6f8', transparent: true, opacity: a.smoke === 'lit' ? 0.5 : 0.28, depthWrite: false }));
      smokeMesh.position.set(sx, sy, sz);
      s.root.add(smokeMesh);
    }

    // What lies beside it.
    const bx = Math.min(hx - 0.04, cx + R + 0.075), by = T, bz = 0.02 + (random() - 0.5) * 0.04;
    const turn = (random() - 0.5) * 1.2;
    const group = new THREE.Group();
    group.position.set(bx, by, bz); group.rotation.y = turn;
    s.root.add(group);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, at: [number, number, number], rot?: [number, number, number]) => {
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(...at); if (rot) mesh.rotation.set(...rot);
      mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    if (a.beside === 'matchbox') {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 88;
      const g = canvas.getContext('2d')!;
      g.fillStyle = pick(['#e8c53a', '#d8483a', '#3d78c2']); g.fillRect(0, 0, 128, 88);
      g.fillStyle = '#f5f1e2'; g.beginPath(); g.ellipse(64, 44, 44, 30, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c22a22'; g.beginPath(); g.moveTo(64, 20); g.quadraticCurveTo(84, 44, 64, 66); g.quadraticCurveTo(46, 46, 64, 20); g.fill();
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const side = s.material('#5b3a26', { roughness: 1 });
      const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
      add(new THREE.BoxGeometry(0.052, 0.016, 0.036), side, [0, 0.008, 0]);
      add(new THREE.PlaneGeometry(0.052, 0.036), topMat, [0, 0.0162, 0], [-Math.PI / 2, 0, 0]);
      add(new THREE.BoxGeometry(0.03, 0.012, 0.033), s.material('#d9cfae'), [0.03, 0.007, 0]);
      const stick = s.material('#e2cf9a'), head = s.material('#b3261e'), burnt = s.material('#1e1b19');
      for (let k = 0; k < 5; k++) { add(new THREE.BoxGeometry(0.02, 0.002, 0.002), stick, [0.036, 0.0135, -0.012 + k * 0.006]); add(new THREE.SphereGeometry(0.0022, 6, 5), head, [0.046, 0.0135, -0.012 + k * 0.006]); }
      for (let k = 0; k < 2 + Math.floor(random() * 4); k++) {
        const mx = (random() - 0.5) * 0.09, mz = 0.035 + random() * 0.04, r = random() * 3;
        add(new THREE.BoxGeometry(0.036, 0.002, 0.002), stick, [mx, 0.002, mz], [0, r, 0]);
        add(new THREE.SphereGeometry(0.0026, 6, 5), burnt, [mx + Math.cos(r) * 0.018, 0.002, mz - Math.sin(r) * 0.018]);
      }
    } else if (a.beside === 'lighter') {
      const body = s.material(pick(['#e23d6d', '#2bb673', '#f2c230', '#3e7be0', '#ff7a1a']), { roughness: 0.25, emissive: '#ffffff', emissiveIntensity: 0.03 });
      add(new THREE.BoxGeometry(0.062, 0.012, 0.024), body, [0, 0.006, 0]);
      add(new THREE.BoxGeometry(0.016, 0.013, 0.022), s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 }), [0.039, 0.0065, 0]);
      add(new THREE.CylinderGeometry(0.005, 0.005, 0.01, 10), s.material('#55585a', { metalness: 0.6 }), [0.044, 0.012, 0.004], [Math.PI / 2, 0, 0]);
    } else if (a.beside === 'pack') {
      const pack = s.material(pick(['#c8332b', '#2d4f8f', '#e9e3d0', '#b88a2e']), { roughness: 0.8 });
      const m = add(new THREE.BoxGeometry(0.056, 0.02, 0.085), pack, [0, 0.011, 0], [0.05, 0, 0.12]);
      m.scale.set(1, 0.8 + random() * 0.3, 1);
      add(new THREE.BoxGeometry(0.057, 0.021, 0.02), s.material('#f1eee4'), [0, 0.0115, -0.02], [0.05, 0, 0.12]);
      add(new THREE.BoxGeometry(0.03, 0.014, 0.012), s.material('#c9cdd0', { metalness: 0.6, roughness: 0.4 }), [0.008, 0.012, -0.046], [0.2, 0, 0.12]);
      add(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), s.material('#f1eee6'), [-0.008, 0.014, -0.06], [Math.PI / 2 - 0.2, 0, 0.1]);
    } else if (a.beside === 'glasses') {
      const paper = s.label('GAZETA', 0.15, 0.11, [0, 0, 0], '#2a2a2a', '#d9d5c6');
      paper.removeFromParent(); paper.rotation.x = -Math.PI / 2; paper.position.set(0, 0.0105, 0); group.add(paper);
      add(new THREE.BoxGeometry(0.15, 0.01, 0.11), s.material('#cfcabb', { roughness: 1 }), [0, 0.005, 0]);
      const frame = s.material('#3a2c22', { roughness: 0.4 });
      for (const side of [-1, 1]) {
        add(new THREE.TorusGeometry(0.02, 0.0025, 6, 20), frame, [side * 0.026, 0.013, 0.01], [Math.PI / 2, 0, 0]);
        add(new THREE.BoxGeometry(0.003, 0.003, 0.06), frame, [side * 0.048, 0.016, -0.02], [0.1, side * 0.2, 0]);
      }
      add(new THREE.BoxGeometry(0.012, 0.003, 0.003), frame, [0, 0.014, 0.004]);
    } else if (a.beside === 'tea') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
      add(new THREE.CylinderGeometry(0.033, 0.028, 0.09, 20), glass, [0, 0.05, 0]).castShadow = false;
      add(new THREE.CylinderGeometry(0.03, 0.027, 0.03 + random() * 0.04, 20), s.material('#8a4a1c', { roughness: 0.2 }), [0, 0.035, 0]);
      const holder = s.material('#b9b3a2', { metalness: 0.8, roughness: 0.35 });
      add(new THREE.CylinderGeometry(0.034, 0.032, 0.045, 20, 1, true), holder, [0, 0.0275, 0]).material.side = THREE.DoubleSide;
      add(new THREE.CylinderGeometry(0.036, 0.036, 0.005, 20), holder, [0, 0.0025, 0]);
      add(new THREE.TorusGeometry(0.022, 0.004, 6, 16, Math.PI), holder, [0.034, 0.035, 0], [0, 0, -Math.PI / 2]);
      add(new THREE.BoxGeometry(0.003, 0.11, 0.006), holder, [-0.012, 0.06, 0.01], [0.2, 0, 0.25]);
    }

    const sway = mix(0.15, 1, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (!smokeMesh || !basePositions) return;
        const pos = smokeMesh.geometry.attributes.position as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        for (let k = 0; k < pos.count; k++) {
          const y = basePositions[k * 3 + 1] / smokeH;
          const amp = y * y * 0.035 * (0.5 + sway);
          arr[k * 3] = basePositions[k * 3] + Math.sin(y * 9 - time * (1 + sway * 2)) * amp + Math.sin(y * 3.1 + time * 0.7) * amp * 0.8;
          arr[k * 3 + 2] = basePositions[k * 3 + 2] + Math.cos(y * 7 - time * (0.8 + sway)) * amp * 0.7;
        }
        pos.needsUpdate = true;
        ember.emissiveIntensity = 1.6 + Math.sin(time * 3.1) * 0.6;
      },
    });
  },
});
