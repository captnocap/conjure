import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    table: choice('What is the food laid out on?', {
      pedestal: 'A round alabaster table on a single flaring foot.',
      slab: 'A low rectangular stone slab with a spout, carved like a mat with a loaf.',
      mat: 'A woven reed mat spread straight on the floor.',
      stand: 'A tall openwork wooden stand with a square tray top.',
      wicker: 'A wide wicker tray balanced on a pottery ring stand.',
    }),
    meal: choice('What kind of meal is it?', {
      bread: 'A poor family\'s offering: bread and onions and little else.',
      feast: 'A rich funeral feast: bread piled with meat, fruit and cucumbers.',
      garden: 'Garden produce: tall lettuces, onions, figs, grapes and a melon.',
      canonical: 'The table as it is drawn in reliefs: a neat comb of tall slender half-loaves standing upright in a row.',
    }),
    loaves: choice('What shape are most of the loaves?', {
      conical: 'Tall white cones, moulded in pots.',
      round: 'Flat round loaves, stacked.',
      triangular: 'Triangular wedges.',
      mixed: 'Every shape together.',
    }),
    centrepiece: choice('What sits on top of the heap?', {
      goose: 'A plucked trussed goose, neck curled back over its body.',
      haunch: 'A foreleg of beef, the choicest cut.',
      fruit: 'A basket of figs with a bunch of grapes.',
      none: 'Nothing; only the bread.',
    }),
    jars: choice('What drink stands beside it?', {
      beer: 'A pair of red beer jars with grey mud stoppers.',
      wine: 'A tall two-handled wine jar leaning in a ring stand, garlanded.',
      libation: 'A row of slender spouted libation vases.',
      none: 'No drink.',
    }),
    lotus: noul('Are blue lotus flowers laid across the offerings?'),
    story: choice('What has happened to the meal?', {
      laid: 'Just laid: everything plump, bright and in its place.',
      ages: 'Untouched for three thousand years: shrivelled to dark husks, collapsed and dusty.',
      mice: 'Mice have been at it: gnawed loaves, crumbs everywhere, a jar knocked over, one mouse still there.',
      ritual: 'A rite is in progress: an incense burner smoking and water just poured out at the foot.',
      shared: 'Someone living has sat and eaten here: a loaf torn in half, a cup, a small lamp left burning.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sh = clamp01(({ laid: 0, ages: 0.85, mice: 0.3, ritual: 0, shared: 0.1 }[a.story]) + mood.wear * 0.3);
    const food = (colour: string, rough = 0.85) => s.material(new THREE.Color(colour).lerp(new THREE.Color('#55463a'), sh * 0.85), { roughness: rough });
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const ball = (parent: THREE.Object3D, material: THREE.Material, at: P3, size: P3, seg = 14) => { const m = put(parent, new THREE.SphereGeometry(1, seg, Math.max(6, seg / 2)), material, at); m.scale.set(...size); return m; };
    const lathe = (pts: [number, number][], seg = 18) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    const squash = 1 - sh * 0.5, shrink = 1 - sh * 0.22;

    const bread = food('#d9b06a'), crust = food('#b9823f'), white = food('#eadfbe'), clay = s.material('#ab5f3c', { roughness: 0.85 }), mud = s.material('#77706a', { roughness: 1 });
    // ---- food pieces: each returns [group, radius, height] ----
    type Piece = [THREE.Group, number, number];
    const cone = (): Piece => { const g = new THREE.Group(), h = 0.2 + random() * 0.06; put(g, lathe([[0, 0], [0.062, 0], [0.066, 0.02], [0.03, h * 0.8], [0.012, h], [0, h]], 14), white); return [g, 0.066, h]; };
    const round = (): Piece => { const g = new THREE.Group(), r = 0.075 + random() * 0.025; ball(g, random() < 0.5 ? bread : crust, [0, 0.026, 0], [r, 0.028, r]); ball(g, crust, [0, 0.05, 0], [r * 0.3, 0.008, r * 0.3], 8); return [g, r, 0.055]; };
    const wedge = (): Piece => { const g = new THREE.Group(), m = put(g, new THREE.ConeGeometry(0.075, 0.15, 3), bread, [0, 0.075, 0]); m.scale.z = 0.45; m.rotation.y = random() * 3; return [g, 0.065, 0.15]; };
    const slice = (): Piece => { const g = new THREE.Group(), h = 0.26 + random() * 0.03; ball(g, bread, [0, h / 2, 0], [0.018, h / 2, 0.05]); return [g, 0.02, h]; };
    const loaf = (): Piece => { const kind = a.loaves === 'mixed' ? ['conical', 'round', 'triangular'][Math.floor(random() * 3)] : a.loaves; return kind === 'conical' ? cone() : kind === 'round' ? round() : wedge(); };
    const onion = (): Piece => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { ball(g, food('#efe9da'), [(i - 1) * 0.035, 0.022, 0], [0.022, 0.022, 0.022], 8); const leaf = put(g, new THREE.CylinderGeometry(0.004, 0.008, 0.26, 5), food('#6f9a4c'), [(i - 1) * 0.02, 0.03, -0.14]); leaf.rotation.x = Math.PI / 2 - 0.08; } return [g, 0.06, 0.05]; };
    const lettuce = (): Piece => { const g = new THREE.Group(), h = 0.3 + random() * 0.06; put(g, lathe([[0, 0], [0.02, 0], [0.055, h * 0.45], [0.045, h * 0.85], [0.012, h]], 10), food('#79a84e')); put(g, lathe([[0, 0], [0.03, 0.03], [0.062, h * 0.4], [0.05, h * 0.7]], 6), food('#5d8c3e')); return [g, 0.06, h]; };
    const melon = (): Piece => { const g = new THREE.Group(); ball(g, food('#8fae56'), [0, 0.06, 0], [0.1, 0.06, 0.065]); return [g, 0.09, 0.12]; };
    const cucumber = (): Piece => { const g = new THREE.Group(); const m = put(g, new THREE.CapsuleGeometry(0.018, 0.12, 3, 8), food('#5f9148'), [0, 0.018, 0]); m.rotation.set(Math.PI / 2, 0, random() * 3); return [g, 0.05, 0.04]; };
    const goose = (): Piece => {
      const g = new THREE.Group(), skin = food('#dcb88c');
      ball(g, skin, [0, 0.075, 0], [0.085, 0.07, 0.15]); ball(g, skin, [0, 0.07, -0.13], [0.045, 0.035, 0.05]);
      for (const side of [-1, 1]) { ball(g, skin, [side * 0.075, 0.07, 0.0], [0.03, 0.045, 0.1]); const leg = put(g, new THREE.CylinderGeometry(0.01, 0.014, 0.09, 6), food('#d98c3c'), [side * 0.04, 0.05, -0.19]); leg.rotation.x = 1.3; }
      const neck = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.09, 0.13), new THREE.Vector3(0, 0.15, 0.2), new THREE.Vector3(0.03, 0.17, 0.11), new THREE.Vector3(0.05, 0.15, 0.0)]), 14, 0.018, 7), skin); neck.castShadow = true; g.add(neck);
      ball(g, skin, [0.052, 0.15, -0.012], [0.024, 0.022, 0.03], 8);
      const beak = put(g, new THREE.ConeGeometry(0.012, 0.045, 6), food('#d98c3c'), [0.056, 0.146, -0.055]); beak.rotation.x = -Math.PI / 2;
      return [g, 0.13, 0.17];
    };
    const haunch = (): Piece => {
      const g = new THREE.Group(), meat = food('#a8452f');
      ball(g, meat, [0, 0.06, -0.06], [0.08, 0.06, 0.13]); ball(g, food('#e8d9c0'), [0, 0.06, -0.185], [0.045, 0.04, 0.02], 8);
      const shank = put(g, new THREE.CylinderGeometry(0.022, 0.04, 0.2, 8), meat, [0, 0.07, 0.13]); shank.rotation.x = Math.PI / 2 - 0.25;
      put(g, new THREE.CylinderGeometry(0.02, 0.018, 0.05, 8), food('#2a2420'), [0, 0.1, 0.245]).rotation.x = Math.PI / 2 - 0.25;
      return [g, 0.13, 0.13];
    };
    const fruit = (): Piece => {
      const g = new THREE.Group();
      put(g, lathe([[0, 0], [0.06, 0], [0.1, 0.06], [0.105, 0.065], [0.09, 0.02], [0, 0.015]]), s.material('#c9a45c', { roughness: 0.95, side: THREE.DoubleSide }));
      const figs = Array.from({ length: 14 }, () => { const an = random() * 6.3, r = Math.sqrt(random()) * 0.07; return { at: [Math.cos(an) * r, 0.055 + random() * 0.03 * squash, Math.sin(an) * r] as P3, size: 0.02 * shrink, color: new THREE.Color(random() < 0.5 ? '#6a3a6e' : '#8a5a3a').lerp(new THREE.Color('#463a30'), sh * 0.8) }; });
      const grapes = Array.from({ length: 24 }, (_u, i) => { const row = Math.floor(Math.sqrt(i)); return { at: [0.14 + (i - row * row - row) * 0.014, 0.014 + (random() * 0.016), 0.02 + row * 0.019] as P3, size: 0.012 * shrink, color: new THREE.Color('#33407c').lerp(new THREE.Color('#3a302a'), sh * 0.8) }; });
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.6 }), figs.length + grapes.length), m = new THREE.Matrix4();
      [...figs, ...grapes].forEach((b, i) => { m.makeScale(b.size, b.size * squash, b.size).setPosition(...b.at); mesh.setMatrixAt(i, m); mesh.setColorAt(i, b.color); });
      mesh.castShadow = true; g.add(mesh);
      return [g, 0.13, 0.1];
    };

    // ---- the table ----
    const stone = s.material('#e6dcc2', { roughness: 0.5 });
    let topY = 0, R = 0.36, rect = false;
    if (a.table === 'pedestal') { topY = 0.3; s.lathe([[0, 0], [0.16, 0], [0.17, 0.02], [0.07, 0.1], [0.055, 0.24], [0.36, 0.265], [0.375, 0.3], [0, 0.3]], s.material('#ece0c2', { roughness: 0.35, emissive: '#5c421c', emissiveIntensity: 0.18 })); }
    else if (a.table === 'slab') {
      topY = 0.2; rect = true; R = 0.34;
      s.box([0.84, 0.2, 0.58], [0, 0.1, 0], stone); s.box([0.15, 0.14, 0.13], [0, 0.07, 0.35], stone); s.box([0.04, 0.012, 0.26], [0, 0.201, 0.27], s.material('#a2957a'));
      for (const side of [-1, 1]) { s.box([0.86, 0.03, 0.03], [0, 0.2, side * 0.28], stone); s.box([0.03, 0.03, 0.6], [side * 0.42, 0.2, 0], stone); }
    } else if (a.table === 'mat') {
      topY = 0.014; rect = true; R = 0.46;
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128; const c = canvas.getContext('2d')!;
      c.fillStyle = '#c9ad66'; c.fillRect(0, 0, 256, 128); for (let x = 0; x < 256; x += 5) { c.fillStyle = random() < 0.5 ? '#b3954f' : '#d9c07c'; c.fillRect(x, 0, 3, 128); } c.fillStyle = '#7a5a2c'; for (const y of [14, 62, 110]) c.fillRect(0, y, 256, 4);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.BoxGeometry(1.15, 0.014, 0.78), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }), [0, 0.007, 0]);
    } else if (a.table === 'stand') {
      topY = 0.62; rect = true; R = 0.27;
      const wood = s.material('#7d5632', { roughness: 0.75 }), pale = s.material('#e9e0c8');
      s.box([0.62, 0.035, 0.62], [0, 0.6, 0], wood); s.box([0.56, 0.008, 0.56], [0, 0.62, 0], pale);
      for (const x of [-1, 1]) for (const z of [-1, 1]) { s.rod([x * 0.27, 0.6, z * 0.27], [x * 0.3, 0, z * 0.3], 0.02, wood); }
      for (const side of [-1, 1]) { s.rod([-0.285, 0.2, side * 0.285], [0.285, 0.2, side * 0.285], 0.012, wood); s.rod([side * 0.285, 0.2, -0.285], [side * 0.285, 0.2, 0.285], 0.012, wood); s.rod([-0.28, 0.22, side * 0.28], [0.27, 0.58, side * 0.27], 0.009, wood); s.rod([0.28, 0.22, side * 0.28], [-0.27, 0.58, side * 0.27], 0.009, wood); }
    } else {
      topY = 0.42; R = 0.38;
      s.lathe([[0.15, 0], [0.16, 0.02], [0.09, 0.2], [0.13, 0.38], [0.14, 0.39]], clay);
      s.lathe([[0, 0.39], [0.3, 0.39], [0.4, 0.44], [0.405, 0.45], [0.3, 0.42], [0, 0.42]], s.material('#c7a45e', { roughness: 0.95, side: THREE.DoubleSide }));
    }

    // ---- heap the food ----
    const pieces: Piece[] = [];
    const n = 4 + Math.round(mood.density * 9);
    if (a.meal === 'canonical') { /* comb handled below */ for (let i = 0; i < Math.round(n / 3); i++) pieces.push(round()); }
    else if (a.meal === 'bread') { for (let i = 0; i < n + 2; i++) pieces.push(loaf()); pieces.push(onion(), onion()); }
    else if (a.meal === 'feast') { for (let i = 0; i < n; i++) pieces.push(loaf()); for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) pieces.push(cucumber()); pieces.push(melon(), onion()); if (a.centrepiece !== 'haunch') pieces.push(haunch()); if (a.centrepiece !== 'fruit') pieces.push(fruit()); }
    else { for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) pieces.push(lettuce()); pieces.push(melon(), onion(), onion(), fruit()); for (let i = 0; i < Math.round(n / 3); i++) pieces.push(loaf()); for (let i = 0; i < 2; i++) pieces.push(cucumber()); }
    const top: Piece | null = a.centrepiece === 'goose' ? goose() : a.centrepiece === 'haunch' ? haunch() : a.centrepiece === 'fruit' ? fruit() : null;
    const FS = 1.3; R /= FS; const heap = new THREE.Group(); heap.position.y = topY; heap.scale.setScalar(FS); s.root.add(heap);
    const comb = a.meal === 'canonical';
    let heapTop = 0.02;
    if (comb) {
      const count = 7 + Math.round(mood.density * 7), span = Math.min(R * 1.5, 0.62);
      for (let i = 0; i < count; i++) { const [g, , h] = slice(); g.position.set((i - (count - 1) / 2) * span / (count - 1), 0, -0.02); g.scale.set(shrink, squash, shrink); if (sh > 0.5 || (a.story === 'mice' && random() < 0.3)) { g.rotation.z = (random() - 0.5) * 2.4 * sh + (random() < 0.3 ? Math.PI / 2 : 0); g.position.y = Math.abs(Math.sin(g.rotation.z)) * 0.02; } heap.add(g); heapTop = Math.max(heapTop, h * squash * 0.5); }
    }
    pieces.forEach(([g, r, h], i) => {
      const t = (i + 0.6) / pieces.length, rad = (comb ? 0.5 + t * 0.4 : Math.sqrt(t)) * (R - r * 0.8) * (top && !comb ? 1 : 0.92) + (top && !comb ? 0.07 * (1 - t) : 0), an = i * 2.4 + random() * 0.5;
      let x = Math.cos(an) * rad * (rect ? 1.2 : 1), z = Math.sin(an) * rad * (rect ? 0.72 : 1);
      if (comb) z = Math.abs(z) * 0.6 + 0.1;
      g.position.set(x, 0, z); g.rotation.y = random() * 6.3; g.scale.set(shrink, squash, shrink);
      if (sh > 0.6 && h > 0.12) { g.rotation.z = Math.PI / 2 * (random() < 0.5 ? 1 : -1) * (0.7 + random() * 0.3); g.position.y = r * 0.8; }
      heap.add(g);
      if (rad < R * 0.45) heapTop = Math.max(heapTop, Math.min(h, 0.09) * squash);
    });
    if (top && !comb) { const [g] = top; g.position.set(0, heapTop * 0.75, 0); g.rotation.y = 0.9 + (random() - 0.5) * 0.6; g.rotation.z = (random() - 0.5) * 0.15; g.scale.set(1.15 * shrink, 1.15 * squash, 1.15 * shrink); heap.add(g); heapTop += 0.15 * squash; }
    else if (top) { const [g] = top; g.position.set(0, 0, 0.16); g.rotation.y = 1.2; g.scale.set(shrink, squash, shrink); heap.add(g); }

    if (a.lotus) {
      const stemMat = food('#5c8a48'), petal = food('#5a82d2'), heart = food('#e9c94a');
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
        const an = 0.5 + i * 1.1 + random() * 0.4, r0 = R * 0.15, r1 = R * (rect ? 0.75 : 0.98), y0 = heapTop + 0.03, droop = topY > 0.1 ? -0.1 - sh * 0.1 : 0.03;
        const p = (r: number, y: number) => new THREE.Vector3(Math.cos(an) * r, y, Math.sin(an) * r * (rect ? 0.75 : 1));
        const stem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p(-r0, y0 * 0.6), p(r0, y0), p(r1 * 0.75, 0.07), p(r1 * 1.08, droop)]), 14, 0.006, 5), stemMat); stem.castShadow = true; heap.add(stem);
        const flower = new THREE.Group(); flower.position.copy(p(r1 * 1.1, droop)); flower.rotation.set(0, -an, -Math.PI / 2 - 0.5 - sh * 0.6, 'YXZ');
        for (let k = 0; k < 7; k++) { const pet = put(flower, new THREE.ConeGeometry(0.014, 0.085, 4), petal, [Math.cos(k * 0.9) * 0.017, 0.04, Math.sin(k * 0.9) * 0.017]); pet.rotation.set(Math.sin(k * 0.9) * (0.3 + sh * 0.5), 0, -Math.cos(k * 0.9) * (0.3 + sh * 0.5)); }
        ball(flower, heart, [0, 0.03, 0], [0.012, 0.02, 0.012], 6);
        heap.add(flower);
      }
    }

    R *= FS;
    // ---- drink, standing on the floor beside the table ----
    const edge = (rect ? (a.table === 'stand' ? 0.34 : a.table === 'mat' ? 0.62 : 0.46) : (a.table === 'pedestal' ? 0.4 : 0.44)) + 0.07;
    const beerJar = (stopper: boolean) => { const g = new THREE.Group(); put(g, lathe([[0, 0], [0.03, 0], [0.085, 0.14], [0.09, 0.24], [0.05, 0.34], [0.055, 0.38], [0.04, 0.38]]), clay); if (stopper) put(g, lathe([[0, 0.37], [0.062, 0.37], [0.05, 0.45], [0.02, 0.5], [0, 0.5]], 12), mud); return g; };
    const tipped = a.story === 'mice' || (a.story === 'ages' && random() < 0.6);
    if (a.jars === 'beer') {
      for (let i = 0; i < 2; i++) { const g = beerJar(!(tipped && i === 1)); g.position.set(-edge - i * 0.2 + 0.02, 0, 0.12 - i * 0.16); if (tipped && i === 1) { g.rotation.z = Math.PI / 2 - 0.12; g.position.y = 0.088; g.position.x -= 0.1; s.cylinder(0.11, 0.11, 0.004, [g.position.x - 0.34, 0.002, g.position.z], s.material('#4a3526', { roughness: 0.4 }), 18).scale.z = 0.6; } s.root.add(g); }
    } else if (a.jars === 'wine') {
      const g = new THREE.Group();
      put(g, lathe([[0, 0.02], [0.03, 0.06], [0.1, 0.3], [0.11, 0.5], [0.06, 0.66], [0.045, 0.8], [0.06, 0.83]]), clay);
      for (const side of [-1, 1]) { const handle = put(g, new THREE.TorusGeometry(0.055, 0.012, 6, 12, Math.PI), clay, [side * 0.075, 0.66, 0]); handle.rotation.z = -side * Math.PI / 2; }
      put(g, lathe([[0, 0.81], [0.055, 0.81], [0.04, 0.88], [0, 0.89]], 10), mud);
      if (sh < 0.6) put(g, new THREE.TorusGeometry(0.085, 0.016, 6, 16), food('#5f8a4a'), [0, 0.6, 0]).rotation.x = Math.PI / 2;
      g.rotation.z = 0.08; g.position.set(-edge - 0.04, 0.05, 0.05); s.root.add(g);
      s.lathe([[0.1, 0], [0.11, 0.01], [0.075, 0.1], [0.085, 0.16], [0.09, 0.165]], s.material('#8d6a48', { roughness: 0.9, side: THREE.DoubleSide }), [-edge - 0.03, 0, 0.05]);
    } else if (a.jars === 'libation') {
      const metal = s.material(mood.cheer > 0.5 ? '#d9ae40' : '#3f8fa8', { metalness: 0.55, roughness: 0.35 });
      for (let i = 0; i < 3 + Math.round(mood.density); i++) { const x = -edge + 0.02 - (i % 2) * 0.1, z = -0.2 + i * 0.13, fallen = tipped && i === 0; const g = new THREE.Group(); put(g, lathe([[0, 0], [0.028, 0], [0.022, 0.03], [0.05, 0.2], [0.045, 0.27], [0.02, 0.31], [0.03, 0.34], [0.012, 0.37], [0, 0.37]], 14), metal); const spout = put(g, new THREE.CylinderGeometry(0.006, 0.008, 0.1, 6), metal, [0.05, 0.27, 0]); spout.rotation.z = -0.9; g.position.set(x, 0, z); if (fallen) { g.rotation.x = Math.PI / 2 - 0.1; g.position.y = 0.05; } g.rotation.y = random() * 6; s.root.add(g); }
    }

    // ---- what happened ----
    const smoke: THREE.Mesh[] = []; const flames: THREE.MeshStandardMaterial[] = [];
    if (sh > 0.25 || a.story === 'mice') {
      const crumbs = Array.from({ length: 30 + Math.round(sh * 50) }, () => { const an = random() * 6.3, r = Math.sqrt(random()) * (R + 0.14); const on = r < R * 0.85; return { at: [Math.cos(an) * r * (rect ? 1.2 : 1), (on ? topY : 0) + 0.005, Math.sin(an) * r * (rect ? 0.75 : 1)] as P3, size: 0.006 + random() * 0.012, color: random() < 0.5 ? '#6a5540' : '#a58a60' }; });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), crumbs);
    }
    if (a.story === 'mice') {
      const fur = s.material('#8a7a6a', { roughness: 1 }), g = new THREE.Group();
      ball(g, fur, [0, 0.02, 0], [0.018, 0.018, 0.034], 10); ball(g, fur, [0, 0.022, 0.034], [0.011, 0.011, 0.016], 8);
      for (const side of [-1, 1]) ball(g, s.material('#c9a79a'), [side * 0.011, 0.034, 0.028], [0.007, 0.008, 0.003], 6);
      const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.015, -0.03), new THREE.Vector3(0.02, 0.008, -0.06), new THREE.Vector3(-0.005, 0.006, -0.09)]), 8, 0.0025, 4), s.material('#c9a79a')); g.add(tail);
      const an = random() * 6.3; g.position.set(Math.cos(an) * R * 0.78 * (rect ? 1.1 : 1), topY, Math.sin(an) * R * 0.78 * (rect ? 0.7 : 1)); g.rotation.y = an + 2; g.scale.setScalar(1.5); s.root.add(g);
      const g2 = g.clone(); g2.position.set(edge * 0.7, 0, 0.5); g2.rotation.y = random() * 6; s.root.add(g2);
    }
    if (a.story === 'ritual') {
      const bx = edge + 0.02, bz = 0.14;
      s.lathe([[0.06, 0], [0.065, 0.01], [0.025, 0.1], [0.02, 0.3], [0.07, 0.36], [0.075, 0.37], [0.05, 0.33], [0, 0.33]], s.material('#b8863a', { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), [bx, 0, bz]);
      const ember = new THREE.MeshStandardMaterial({ color: '#2b1c16', emissive: '#ff6a1c', emissiveIntensity: mix(0.6, 1.8, mood.warmth), roughness: 1 }); flames.push(ember);
      s.ball([0.05, 0.02, 0.05], [bx, 0.355, bz], ember, 10);
      const haze = new THREE.MeshStandardMaterial({ color: '#e9e4da', transparent: true, opacity: 0.18, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 7; i++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(0.03 + i * 0.012, 10, 8), haze); puff.position.set(bx + Math.sin(i * 1.3) * 0.03 * i * 0.4, 0.42 + i * 0.1, bz); puff.userData.base = puff.position.clone(); puff.userData.phase = i; s.root.add(puff); smoke.push(puff); }
      s.cylinder(0.2, 0.2, 0.004, [0.05, 0.002, (rect ? 0.48 : R + 0.12) + 0.16], s.material('#6f7f86', { roughness: 0.15, metalness: 0.2 }), 20).scale.z = 0.55;
    }
    if (a.story === 'shared') {
      const cx = edge * 0.55, cz = (rect ? 0.42 : R) + 0.22;
      const half = ball(s.root, bread, [cx - 0.3, 0.025, cz], [0.07, 0.026, 0.07]); half.rotation.y = 0.4; ball(s.root, food('#f0e4c4'), [cx - 0.262, 0.026, cz + 0.02], [0.042, 0.022, 0.06]).rotation.y = 0.4;
      s.lathe([[0, 0], [0.025, 0], [0.04, 0.06], [0.043, 0.062], [0.03, 0.01], [0, 0.008]], clay, [cx - 0.1, 0, cz + 0.05]);
      s.lathe([[0, 0], [0.03, 0], [0.05, 0.022], [0.052, 0.026], [0, 0.02]], clay, [cx + 0.08, 0, cz]);
      const flame = new THREE.MeshStandardMaterial({ color: '#ffc24a', emissive: '#ff9a2a', emissiveIntensity: mix(0.8, 2.2, mood.warmth), roughness: 1 }); flames.push(flame);
      s.mesh(new THREE.ConeGeometry(0.012, 0.05, 8), flame, [cx + 0.115, 0.05, cz]).castShadow = false;
    }
    const speed = mix(0.15, 0.7, mood.energy);
    const update = smoke.length || flames.length ? (_dt: number, time: number) => {
      for (const puff of smoke) { const cycle = (time * speed + puff.userData.phase / 7) % 1; puff.position.y = 0.4 + cycle * 0.75; puff.position.x = (puff.userData.base as THREE.Vector3).x + Math.sin(cycle * 6 + puff.userData.phase) * 0.05; puff.scale.setScalar(0.6 + cycle * 1.6); }
      for (const flame of flames) flame.emissiveIntensity = mix(0.8, 2, mood.warmth) * (0.82 + 0.18 * Math.sin(time * 13) * Math.sin(time * 4.3));
    } : undefined;
    return s.finish({ update });
  },
});
