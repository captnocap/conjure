import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Xf = { p: [number, number, number]; r: [number, number, number]; s?: [number, number, number]; c: THREE.Color };

function instances(root: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: Xf[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const d = new THREE.Object3D();
  d.rotation.order = 'YXZ';
  list.forEach((it, i) => {
    d.position.set(...it.p);
    d.rotation.set(...it.r);
    d.scale.set(...(it.s ?? [1, 1, 1]));
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    mesh.setColorAt(i, it.c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}

export default defineThing({
  questions: {
    deck: choice('What is the walkway made of?', {
      planks: 'Two long narrow planks laid side by side with a gap between, silvered by weather.',
      sleepers: 'Old railway sleepers laid crosswise, black with creosote, heavy and square.',
      logs: 'Split logs laid crosswise like a corduroy road, an ancient trackway.',
      decking: 'Neat new decking boards with a wire-mesh grip and kick rails: a nature-reserve path.',
      single: 'A single plank, one boot wide, bending under any weight.',
    }),
    course: choice('What line does it take?', {
      straight: 'Dead straight, as if it knows where it is going.',
      dogleg: 'Straight, then a sharp kink to one side.',
      curve: 'A slow curve bending away out of sight.',
    }),
    ending: choice('How does it end?', {
      abrupt: 'It simply stops, the last boards sticking out over the water.',
      collapsed: 'The last span has dropped at one corner and slid down into the pool.',
      sunk: 'It goes on, lower and lower, until the boards disappear under black water.',
      unfinished: 'Bare posts carry on ahead of the last boards: it was never finished.',
      gap: 'A span is missing; one more stranded section stands beyond the gap.',
      platform: 'It opens into a small square platform with a bench: someone wanted you to stop here.',
    }),
    rail: choice('Is there anything to hold on to?', {
      none: 'Nothing: just the boards.',
      rope: 'A slack rope strung between posts on one side.',
      timber: 'A single timber handrail on one side.',
    }),
    ground: choice('What does it cross?', {
      water: 'Open black water with a few spreading rings.',
      moss: 'A lawn of red and green sphagnum with small dark pools.',
      rushes: 'Shallow water crowded with clumps of rushes.',
      mud: 'Bare brown peat mud with standing puddles.',
    }),
    left: choice('What has been left on it?', {
      nothing: 'Nothing.',
      boots: 'A pair of boots standing neatly at the very end.',
      lantern: 'A storm lantern, still lit.',
      sign: 'A signpost at the start.',
      flowers: 'A bunch of flowers tied to a post.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => lo + (hi - lo) * random();
    const C = (hex: string) => new THREE.Color(hex);
    const wear = mood.wear;

    const crosswise = a.deck === 'sleepers' || a.deck === 'logs' || a.deck === 'decking';
    const width = { planks: 0.56, sleepers: 0.95, logs: 0.85, decking: 0.95, single: 0.3 }[a.deck];
    const bay = a.deck === 'single' ? 1.1 : 1.35;
    const bays = 5 + (a.ending === 'gap' ? 1 : 0);
    const h0 = a.deck === 'decking' ? 0.55 : 0.46;

    // Centreline: one bearer at each end of every bay.
    const bearers: { x: number; z: number; y: number; roll: number; heading: number }[] = [];
    let x = 0, z = 0;
    const turn = random() < 0.5 ? -1 : 1;
    for (let i = 0; i <= bays; i++) {
      const heading = a.course === 'straight' ? 0 : a.course === 'dogleg' ? (i <= 2 ? 0 : turn * 0.55) : turn * (i - 1) * 0.17;
      if (i > 0) { x += Math.cos(heading) * bay; z += Math.sin(heading) * bay; }
      let y = h0 - wear * rr(0, 0.2), roll = rr(-1, 1) * wear * 0.16;
      const fromEnd = bays - i;
      if (a.ending === 'collapsed' && fromEnd === 0) { y = -0.02; roll = turn * rr(0.25, 0.4); }
      if (a.ending === 'sunk') { if (fromEnd === 2) y = Math.min(y, 0.22); if (fromEnd === 1) y = 0.07; if (fromEnd === 0) y = -0.16; }
      bearers.push({ x, z, y, roll, heading });
    }
    const skip = (i: number) => (a.ending === 'gap' && i === bays - 2) || (a.ending === 'unfinished' && i >= bays - 2);

    // Timber.
    const timber = C({ planks: '#9a9282', sleepers: '#3d312a', logs: '#75604a', decking: '#b99a62', single: '#a59a84' }[a.deck]);
    timber.lerp(C('#8c8a80'), wear * (a.deck === 'sleepers' ? 0.25 : 0.5));
    timber.lerp(C('#a07a50'), (mood.warmth - 0.5) * 0.15);
    const tone = () => { const c = timber.clone().offsetHSL(rr(-0.01, 0.01), 0, rr(-0.06, 0.06)); if (random() < wear * 0.35) c.lerp(C('#5f7a35'), rr(0.3, 0.6)); return c; };
    const boards: Xf[] = [], posts: Xf[] = [], beams: Xf[] = [];
    const lateral = (b: { heading: number }, k: number): [number, number] => [-Math.sin(b.heading) * k, Math.cos(b.heading) * k];
    let deckEnd = bearers[bays];

    for (let i = 0; i < bays; i++) {
      const p = bearers[i], q = bearers[i + 1];
      const heading = Math.atan2(q.z - p.z, q.x - p.x), len = Math.hypot(q.x - p.x, q.z - p.z);
      const slope = Math.atan2(q.y - p.y, len);
      if (skip(i)) continue;
      deckEnd = q;
      if (!crosswise) {
        const rows = a.deck === 'single' ? [0] : [-0.15, 0.15];
        for (const off of rows) {
          if (random() < wear * 0.12 && i > 0) continue;
          const [lx, lz] = lateral({ heading }, off);
          const mx = (p.x + q.x) / 2 + lx, mz = (p.z + q.z) / 2 + lz, my = (p.y + q.y) / 2 + 0.065;
          const over = i === bays - 1 || skip(i + 1) ? 0.35 : 0.12;
          boards.push({ p: [mx + Math.cos(heading) * over / 2, my + Math.sin(slope) * over / 2 + off * (p.roll + q.roll) / 2, mz + Math.sin(heading) * over / 2], r: [(p.roll + q.roll) / 2 + rr(-0.03, 0.03), -heading + rr(-0.02, 0.02) * (1 + wear * 3), slope], s: [len + over + 0.1, 1, a.deck === 'single' ? 1.3 : 1], c: tone() });
        }
      } else {
        const pitchLen = a.deck === 'sleepers' ? 0.3 : a.deck === 'logs' ? 0.2 : 0.15;
        const n = Math.floor(len / pitchLen);
        for (let k = 0; k < n; k++) {
          if (random() < wear * 0.14) continue;
          const u = (k + 0.5) / n;
          const dip = -Math.sin(u * Math.PI) * wear * 0.05;
          boards.push({ p: [mix(p.x, q.x, u), mix(p.y, q.y, u) + 0.07 + dip + (a.deck === 'sleepers' ? 0.035 : 0), mix(p.z, q.z, u)], r: [mix(p.roll, q.roll, u) + rr(-0.02, 0.02) * (1 + wear * 2), -heading + rr(-0.03, 0.03) * (1 + wear * 4), slope], s: [1, 1, rr(0.94, 1.04)], c: tone() });
        }
        // Stringers under the boards.
        for (const off of [-width * 0.36, width * 0.36]) {
          const [lx, lz] = lateral({ heading }, off);
          beams.push({ p: [(p.x + q.x) / 2 + lx, (p.y + q.y) / 2 + 0.01, (p.z + q.z) / 2 + lz], r: [0, -heading, slope], s: [len + 0.05, 1, 0.6], c: timber.clone().multiplyScalar(0.7) });
        }
        if (a.deck === 'decking') for (const off of [-width / 2 + 0.03, width / 2 - 0.03]) {
          const [lx, lz] = lateral({ heading }, off);
          beams.push({ p: [(p.x + q.x) / 2 + lx, (p.y + q.y) / 2 + 0.13, (p.z + q.z) / 2 + lz], r: [0, -heading, slope], s: [len, 0.6, 0.5], c: timber.clone().multiplyScalar(0.9) });
        }
      }
    }
    // Bearers and posts.
    const railSide = turn;
    const railTops: THREE.Vector3[] = [];
    bearers.forEach((b, i) => {
      const lonely = a.ending === 'unfinished' && i > bays - 2;
      const drowned = b.y < 0.0;
      if (!drowned && !lonely) beams.push({ p: [b.x, b.y, b.z], r: [b.roll, -b.heading, 0], s: [0.09, 1, (width + 0.24) / 0.1], c: timber.clone().multiplyScalar(0.75) });
      for (const side of [-1, 1]) {
        const [lx, lz] = lateral(b, side * (width / 2 + 0.06));
        const railed = a.rail !== 'none' && side === railSide && !lonely && b.y > 0.2;
        const top = (lonely ? rr(0.3, 0.6) : b.y + 0.06) + (railed ? 0.95 : 0) + side * b.roll * width * 0.5;
        const leanX = rr(-1, 1) * wear * 0.14 + (drowned ? 0.3 : 0), leanZ = rr(-1, 1) * wear * 0.14;
        const h = top + 0.3;
        if (top < 0.05) continue;
        posts.push({ p: [b.x + lx, -0.3, b.z + lz], r: [leanX, 0, leanZ], s: [1, h, 1], c: timber.clone().multiplyScalar(rr(0.65, 0.85)) });
        if (railed) railTops.push(new THREE.Vector3(b.x + lx - Math.sin(leanZ) * h, top - 0.04, b.z + lz + Math.sin(leanX) * h));
      }
    });

    const cross = crosswise ? (a.deck === 'sleepers' ? new THREE.BoxGeometry(0.26, 0.13, width) : a.deck === 'logs' ? new THREE.CylinderGeometry(0.095, 0.095, width, 8, 1, false, 0, Math.PI) : new THREE.BoxGeometry(0.135, 0.035, width)) : new THREE.BoxGeometry(1, 0.045, 0.21);
    if (a.deck === 'logs') { cross.rotateX(Math.PI / 2); cross.rotateZ(Math.PI / 2); cross.rotateY(0); }
    instances(s.root, cross, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: a.deck === 'logs' }), boards);
    const post = new THREE.CylinderGeometry(0.045, 0.055, 1, 6);
    post.translate(0, 0.5, 0);
    instances(s.root, post, new THREE.MeshStandardMaterial({ roughness: 1 }), posts);
    instances(s.root, new THREE.BoxGeometry(1, 0.08, 0.1), new THREE.MeshStandardMaterial({ roughness: 1 }), beams);

    // Handrail.
    if (railTops.length > 1) {
      if (a.rail === 'rope') {
        const rope = s.material('#b9a57a', { roughness: 1 });
        for (let i = 0; i < railTops.length - 1; i++) {
          const p = railTops[i], q = railTops[i + 1], mid = p.clone().lerp(q, 0.5);
          mid.y -= mix(0.1, 0.3, wear);
          s.tube([p.toArray() as [number, number, number], mid.toArray() as [number, number, number], q.toArray() as [number, number, number]], 0.014, rope);
        }
      } else for (let i = 0; i < railTops.length - 1; i++) {
        if (random() < wear * 0.3) continue;
        s.rod(railTops[i].toArray() as [number, number, number], railTops[i + 1].toArray() as [number, number, number], 0.03, s.material(timber.clone().multiplyScalar(0.9), { roughness: 1 }));
      }
    }

    // The end platform.
    const end = deckEnd, ex = Math.cos(end.heading), ez = Math.sin(end.heading);
    const wood = s.material(timber, { roughness: 0.95 });
    if (a.ending === 'platform') {
      const g = new THREE.Group();
      g.position.set(end.x + ex * 0.95, end.y + 0.07, end.z + ez * 0.95);
      g.rotation.y = -end.heading;
      s.root.add(g);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
      for (let k = 0; k < 9; k++) add(new THREE.BoxGeometry(0.19, 0.04, 1.8), s.material(tone(), { roughness: 0.95 }), [-0.8 + k * 0.2, 0, 0]);
      for (const px of [-0.8, 0.8]) for (const pz of [-0.85, 0.85]) add(new THREE.CylinderGeometry(0.05, 0.06, end.y + 0.5, 6), wood, [px, -(end.y + 0.5) / 2, pz]);
      // Bench facing out over the water.
      add(new THREE.BoxGeometry(0.3, 0.05, 1.3), wood, [0.5, 0.42, 0]);
      for (const pz of [-0.5, 0.5]) add(new THREE.BoxGeometry(0.26, 0.4, 0.06), wood, [0.5, 0.2, pz]);
      for (const pz of [-0.88, 0.88]) add(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 6), wood, [0.88, 0.47, pz]);
      add(new THREE.BoxGeometry(0.06, 0.06, 1.85), wood, [0.88, 0.93, 0]);
    }

    // Firm ground at the start.
    const start = bearers[0];
    const xs = bearers.map((b) => b.x), zs = bearers.map((b) => b.z);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2 + (a.ending === 'platform' ? 0.6 : 0.2), cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + (a.ending === 'platform' ? 1.7 : 0.9), rz = (Math.max(...zs) - Math.min(...zs)) / 2 + 1.05;
    const heath = C('#4d4a2c').lerp(C('#5e3848'), mood.cheer * 0.5);
    const bank = s.ball([1.0, h0 + 0.1, 1.2], [start.x - 0.55, 0, start.z], new THREE.MeshStandardMaterial({ color: heath, roughness: 1 }), 16);
    bank.castShadow = false;
    const palette = ['#5e4229', '#5c2f3c', '#4c5527', '#73582f', mood.cheer > 0.6 ? '#8a4a70' : '#522b38', '#6d7a35'];
    s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), Array.from({ length: Math.round(mix(25, 50, mood.density)) }, () => {
      const th = random() * 6.28, k = Math.sqrt(random()) * 0.95;
      const px = Math.cos(th) * k * 1.0, pz = Math.sin(th) * k * 1.2;
      if (px > 0.3 && Math.abs(pz) < width * 0.6) return { at: [start.x - 1.3, 0.1, start.z + pz] as const, size: 0.1, color: palette[0] };
      return { at: [start.x - 0.55 + px, (h0 + 0.1) * Math.sqrt(Math.max(0, 1 - k * k)) + 0.03, start.z + pz] as const, size: rr(0.08, 0.18), color: palette[Math.floor(random() * palette.length)] };
    }));

    // The wet ground.
    const waterMaterial = new THREE.MeshStandardMaterial({ color: a.ground === 'mud' ? '#4a3a2c' : a.ground === 'moss' ? '#3a3a22' : '#1a2328', roughness: a.ground === 'water' || a.ground === 'rushes' ? 0.08 : a.ground === 'mud' ? 0.45 : 0.7, metalness: a.ground === 'water' || a.ground === 'rushes' ? 0.15 : 0 });
    const water = s.cylinder(1, 1, 0.03, [cx, 0.015, cz], waterMaterial, 44);
    water.scale.set(rx, 1, rz);
    water.castShadow = false;
    const inside = () => { const th = random() * 6.28, k = Math.sqrt(random()) * 0.97; return [cx + Math.cos(th) * k * rx, cz + Math.sin(th) * k * rz] as const; };
    const pool = new THREE.MeshStandardMaterial({ color: '#1a2328', roughness: 0.08, metalness: 0.15 });
    const ringMaterial = new THREE.MeshStandardMaterial({ color: '#8f9aa0', roughness: 0.2 });
    if (a.ground === 'water' || a.ground === 'rushes') {
      for (let i = 0; i < Math.round(mix(3, 12, mood.energy)); i++) { const [px, pz] = inside(); const ring = s.ring(rr(0.08, 0.3), 0.006, [px, 0.033, pz], ringMaterial); ring.rotation.x = Math.PI / 2; ring.castShadow = false; }
    }
    if (a.ground === 'moss') {
      const moss: Xf[] = [];
      const tints = ['#7d3a33', '#667230', '#8f5038', '#7f8a3e', '#9a7a3c', '#55622c', '#6c2f38'];
      const pools = Array.from({ length: 5 }, () => [...inside(), rr(0.3, 0.7)] as const);
      for (const [px, pz, r] of pools) { const m = s.cylinder(r, r, 0.012, [px, 0.034, pz], pool, 16); m.scale.z = rr(0.6, 1); m.castShadow = false; }
      for (let i = 0; i < Math.round(mix(280, 460, mood.density)); i++) {
        const [px, pz] = inside();
        if (pools.some(([qx, qz, r]) => Math.hypot(px - qx, pz - qz) < r * 0.9)) continue;
        const size = rr(0.06, 0.14);
        moss.push({ p: [px, 0.03, pz], r: [0, rr(0, 3), 0], s: [size, size * 0.45, size], c: C(tints[Math.floor(random() * tints.length)]).offsetHSL(0, 0, rr(-0.04, 0.04)) });
      }
      instances(s.root, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75 }), moss);
    } else if (a.ground === 'mud') {
      for (let i = 0; i < 7; i++) { const [px, pz] = inside(); const r = rr(0.2, 0.55); const m = s.cylinder(r, r, 0.012, [px, 0.034, pz], pool, 14); m.scale.z = rr(0.5, 1); m.castShadow = false; }
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#3a2c22', { roughness: 0.6, flatShading: true }), Array.from({ length: 40 }, () => { const [px, pz] = inside(); return { at: [px, 0.04, pz] as const, size: rr(0.04, 0.1) }; }));
    }
    // Rushes: sparse at every edge, dense where the question asks for them.
    const blades: Xf[] = [];
    const clumps = a.ground === 'rushes' ? Math.round(mix(30, 60, mood.density)) : a.ground === 'mud' ? 6 : 12;
    for (let c = 0; c < clumps; c++) {
      let [px, pz] = inside();
      if (a.ground !== 'rushes') { const th = random() * 6.28; px = cx + Math.cos(th) * rx * 0.96; pz = cz + Math.sin(th) * rz * 0.96; }
      const tall = rr(0.5, 1.1);
      const tint = C(mood.warmth > 0.6 ? '#9a8a45' : '#62733a').offsetHSL(0, 0, rr(-0.05, 0.05));
      for (let i = 0; i < 9; i++) blades.push({ p: [px + rr(-0.07, 0.07), 0.02, pz + rr(-0.07, 0.07)], r: [rr(-0.25, 0.25), 0, rr(-0.25, 0.25)], s: [1, tall * rr(0.6, 1.1), 1], c: tint });
    }
    const blade = new THREE.ConeGeometry(0.014, 1, 4);
    blade.translate(0, 0.5, 0);
    instances(s.root, blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), blades);

    // What was left.
    let flame: THREE.Mesh | null = null;
    const tip: [number, number, number] = [end.x + ex * (a.ending === 'platform' ? 1.5 : 0.05), end.y + (a.ending === 'platform' ? 0.1 : 0.1), end.z + ez * (a.ending === 'platform' ? 1.5 : 0.05)];
    const visibleEnd = end.y > 0.05 ? tip : ([bearers[bays - 2].x, bearers[bays - 2].y + 0.1, bearers[bays - 2].z] as [number, number, number]);
    if (a.left === 'boots') {
      const leather = s.material(mood.cheer > 0.6 ? '#c7a51f' : '#3a2a20', { roughness: 0.5 });
      for (const side of [-1, 1]) {
        const [lx, lz] = lateral(end, side * 0.1);
        const g = new THREE.Group();
        g.position.set(visibleEnd[0] + lx - ex * 0.15, visibleEnd[1], visibleEnd[2] + lz - ez * 0.15);
        g.rotation.y = -end.heading + Math.PI / 2 + rr(-0.15, 0.15);
        s.root.add(g);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.26, 10), leather);
        leg.position.y = 0.16;
        const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), leather);
        foot.scale.set(0.055, 0.045, 0.12);
        foot.position.set(0, 0.045, 0.06);
        leg.castShadow = foot.castShadow = true;
        g.add(leg, foot);
      }
    } else if (a.left === 'lantern') {
      const iron = s.material('#2a2c2e', { metalness: 0.6, roughness: 0.5 });
      const [lx, ly, lz] = [visibleEnd[0] - ex * 0.2, visibleEnd[1], visibleEnd[2] - ez * 0.2];
      s.cylinder(0.07, 0.08, 0.05, [lx, ly + 0.025, lz], iron, 12);
      s.cylinder(0.055, 0.055, 0.14, [lx, ly + 0.12, lz], new THREE.MeshStandardMaterial({ color: '#fff0c0', transparent: true, opacity: 0.3, depthWrite: false }), 12);
      s.cylinder(0.03, 0.07, 0.06, [lx, ly + 0.22, lz], iron, 12);
      s.ring(0.07, 0.006, [lx, ly + 0.25, lz], iron, Math.PI);
      for (const k of [-1, 1]) s.rod([lx + k * 0.06, ly + 0.05, lz], [lx + k * 0.06, ly + 0.2, lz], 0.005, iron);
      flame = s.ball([0.02, 0.04, 0.02], [lx, ly + 0.1, lz], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb23a', emissiveIntensity: 2.4 }), 8);
      const halo = s.ball([0.35, 0.35, 0.35], [lx, ly + 0.12, lz], new THREE.MeshBasicMaterial({ color: '#ffc45a', transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending }), 12);
      halo.castShadow = false;
    } else if (a.left === 'sign') {
      const [lx, lz] = lateral(start, -(width / 2 + 0.5));
      const px = start.x - 0.3 + lx, pz = start.z + lz;
      const pole = s.cylinder(0.035, 0.04, 1.5, [px, 0.9, pz], wood, 6);
      pole.rotation.z = rr(-0.08, 0.08) * (1 + wear * 2);
      const danger = mood.cheer < 0.5;
      const plate = s.label(danger ? 'DANGER DEEP BOG' : 'BOG TRAIL >', 0.8, 0.26, [px, 1.4, pz + 0.045], danger ? '#f4f0e0' : '#2f4a2c', danger ? '#b3261e' : '#e8dfc0');
      s.box([0.84, 0.3, 0.03], [px, 1.4, pz + 0.025], wood);
      plate.rotation.z = pole.rotation.z;
    } else if (a.left === 'flowers') {
      const at = railTops.length ? railTops[railTops.length - 1].clone() : new THREE.Vector3(visibleEnd[0], visibleEnd[1] + 0.02, visibleEnd[2]);
      const cols = mood.cheer > 0.4 ? ['#d94a3a', '#f1c93a', '#f4f0e6', '#b05ab8'] : ['#9a8a80', '#b9b08a', '#d8d4c8'];
      for (let k = 0; k < 8; k++) {
        const hx = at.x + rr(-0.08, 0.08), hz = at.z + rr(-0.08, 0.08) + 0.1, hy = at.y + (railTops.length ? rr(-0.05, 0.12) : rr(0.02, 0.08));
        s.rod([at.x, at.y - (railTops.length ? 0.25 : 0), at.z + 0.06], [hx, hy, hz], 0.005, s.material('#5c7a3a'));
        s.ball([0.04, 0.035, 0.04], [hx, hy, hz], s.material(cols[k % cols.length], { emissive: cols[k % cols.length], emissiveIntensity: 0.15 }), 8);
      }
      s.box([0.1, 0.04, 0.1], [at.x, at.y - (railTops.length ? 0.2 : -0.02), at.z + 0.06], s.material('#e9e2cf'));
    }

    const flicker = mix(0.1, 0.5, mood.energy);
    return s.finish({
      footprint: Math.min(3, rx * 0.8),
      update: flame ? (_dt, time) => { flame!.scale.y = 0.04 * (1 + Math.sin(time * 11) * flicker * 0.4 + Math.sin(time * 23) * flicker * 0.2); } : undefined,
    });
  },
});
