import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];
const TARPS = { blue: '#2f6fb0', orange: '#d9742a', olive: '#6b7044', silver: '#b9bdb8', none: '#000000' } as const;

export default defineThing({
  questions: {
    valued: choice('What did its owner value enough to carry?', {
      books: 'Books: tied stacks of them, far too heavy, taken anyway.',
      water: 'Water and fuel: jerrycans and a big clear bottle, nothing sentimental.',
      music: 'A guitar strapped upright and a small radio.',
      childhood: 'A child\'s things: a bear riding on top and a pinwheel that still spins.',
      tools: 'Tools: a spade, a saw, rope and a steel toolbox, someone who means to build.',
      pictures: 'Framed pictures and a mantel clock, a home in pieces.',
    }),
    plant: choice('What is growing in the pot lashed to the front?', {
      tomato: 'A staked tomato plant with red fruit.',
      sapling: 'A fruit-tree sapling, a promise years long.',
      sunflower: 'One tall sunflower.',
      herbs: 'A crowded pot of kitchen herbs.',
      dead: 'A dry brown stick: it died, and they still carry the pot.',
      none: 'No plant at all.',
    }),
    owner: choice('Where is its owner right now?', {
      parked: 'Close by: the cart is propped level and neatly lashed, ready to go.',
      dropped: 'Gone in a hurry: the handle is dropped on the ground and the cart tips forward.',
      tipped: 'Not coming back: the cart lies on its side with the load spilled out.',
    }),
    tarp: choice('What covers the load?', {
      blue: 'A bright blue plastic tarp.',
      orange: 'A faded orange tarp.',
      olive: 'An olive canvas groundsheet.',
      silver: 'A crinkled silver emergency blanket.',
      none: 'Nothing: everything is open to the weather.',
    }),
    wheels: choice('What wheels does it run on?', {
      bicycle: 'A matched pair of tall spoked bicycle wheels.',
      mismatched: 'One tall bicycle wheel and one smaller one from a child\'s bike, with a block to level it.',
      fat: 'Chunky knobbly mountain-bike wheels.',
    }),
    mast: choice('What rides on its mast?', {
      none: 'No mast.',
      pennant: 'A scrap of red cloth on a whip aerial.',
      lantern: 'A storm lantern that is still lit.',
      cans: 'A string of tin cans to rattle a warning.',
      solar: 'A small solar panel angled at the sky.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.max(0.3, mood.wear);
    const cart = new THREE.Group();
    s.root.add(cart);
    const add = <T extends THREE.Object3D>(m: T, g: THREE.Object3D = cart) => { g.add(m); return m; };
    const steel = s.material('#a4a9a8', { metalness: 0.7, roughness: 0.4 });
    const rust = s.material('#7a4b2e', { roughness: 0.95 });
    const rubber = s.material('#1b1b1c', { roughness: 0.95 });
    const tube = () => (random() < wear * 0.6 ? rust : steel);

    // Wire mesh, drawn once and tiled.
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x2 = c.getContext('2d')!;
    x2.strokeStyle = wear > 0.6 ? '#8a6a52' : '#b3b8b6'; x2.lineWidth = 7;
    x2.strokeRect(0, 0, 64, 64);
    const wire = (u: number, v: number) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(u, v); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 }); };

    // Basket (cart space: y = 0 at the axle, +z toward the puller).
    const BW = 0.6, BL = 1.0, B0 = 0.06, B1 = 0.62, BH = B1 - B0;
    for (const sx of [-1, 1]) add(s.mesh(new THREE.PlaneGeometry(BL, BH), wire(12, 7), [sx * BW / 2, (B0 + B1) / 2, 0])).rotation.y = Math.PI / 2;
    for (const sz of [-1, 1]) add(s.mesh(new THREE.PlaneGeometry(BW, BH), wire(8, 7), [0, (B0 + B1) / 2, sz * BL / 2]));
    add(s.mesh(new THREE.PlaneGeometry(BW, BL), wire(8, 12), [0, B0, 0])).rotation.x = Math.PI / 2;
    for (const y of [B0, B1]) for (const sx of [-1, 1]) add(s.rod([sx * BW / 2, y, -BL / 2], [sx * BW / 2, y, BL / 2], 0.014, tube()));
    for (const y of [B0, B1]) for (const sz of [-1, 1]) add(s.rod([-BW / 2, y, sz * BL / 2], [BW / 2, y, sz * BL / 2], 0.014, tube()));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(s.rod([sx * BW / 2, B0, sz * BL / 2], [sx * BW / 2, B1, sz * BL / 2], 0.014, steel));
    // The trolley's own push handle, still with its plastic grip and coin lock.
    const grip = s.material(mood.cheer > 0.5 ? '#d8362c' : '#2c5fa8', { roughness: 0.5 });
    for (const sx of [-1, 1]) add(s.rod([sx * BW / 2, B1, -BL / 2], [sx * BW / 2, B1 + 0.2, -BL / 2 - 0.16], 0.016, steel));
    add(s.rod([-BW / 2, B1 + 0.2, -BL / 2 - 0.16], [BW / 2, B1 + 0.2, -BL / 2 - 0.16], 0.024, grip));
    add(s.box([0.09, 0.06, 0.05], [0.12, B1 + 0.22, -BL / 2 - 0.16], grip));

    // Axle, welded brackets and wheels.
    const R = a.wheels === 'fat' ? 0.3 : 0.335;
    const wheel = (sx: number, r: number, colour: string) => {
      const g = new THREE.Group();
      const tyre = a.wheels === 'fat' ? 0.045 : 0.022;
      add(s.mesh(new THREE.TorusGeometry(r - tyre, tyre, 8, 28), rubber), g);
      add(s.mesh(new THREE.TorusGeometry(r - tyre * 2 - 0.006, 0.01, 6, 28), s.material(colour, { metalness: 0.6, roughness: 0.4 })), g);
      add(s.cylinder(0.03, 0.03, 0.09, [0, 0, 0], steel, 10), g).rotation.x = Math.PI / 2;
      const n = a.wheels === 'fat' ? 8 : 12;
      for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; add(s.rod([0, 0, i % 2 ? 0.03 : -0.03], [Math.cos(t) * (r - tyre * 2), Math.sin(t) * (r - tyre * 2), 0], 0.003, steel), g); }
      if (a.wheels === 'fat') for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2; add(s.box([0.03, 0.03, 0.08], [Math.cos(t) * (r + 0.004), Math.sin(t) * (r + 0.004), 0], rubber), g).rotation.z = t; }
      g.rotation.y = Math.PI / 2;
      g.rotation.x = random() * 6;
      const drop = R - r;
      g.position.set(sx * (BW / 2 + 0.21), -drop, 0);
      cart.add(g);
      add(s.rod([sx * BW / 2, B0, 0.12], [sx * (BW / 2 + 0.17), -drop, 0], 0.014, rust));
      add(s.rod([sx * BW / 2, B0, -0.12], [sx * (BW / 2 + 0.17), -drop, 0], 0.014, rust));
      add(s.rod([sx * BW / 2, B1, 0], [sx * (BW / 2 + 0.17), -drop, 0], 0.012, rust));
      return g;
    };
    add(s.rod([-BW / 2 - 0.25, 0, 0], [BW / 2 + 0.25, 0, 0], 0.014, steel));
    wheel(-1, R, '#c9cdd0');
    const small = a.wheels === 'mismatched';
    wheel(1, small ? 0.25 : R, small ? '#d94a8a' : '#c9cdd0');

    // Drawbar: bicycle forks and a length of pipe, a taped T-grip, a prop leg.
    const hz = 1.55, hy = 0.5;
    for (const sx of [-1, 1]) add(s.rod([sx * BW / 2, B0, BL / 2], [0, 0.3, 1.0], 0.016, tube()));
    add(s.rod([0, 0.3, 1.0], [0, hy, hz], 0.018, steel));
    add(s.rod([-0.2, hy, hz], [0.2, hy, hz], 0.02, s.material('#2a2a2a', { roughness: 0.9 })));
    for (const sx of [-1, 1]) add(s.cylinder(0.026, 0.026, 0.1, [sx * 0.16, hy, hz], s.material('#c9b23a', { roughness: 0.9 }), 8)).rotation.z = Math.PI / 2;
    add(s.rod([0, 0.3, 1.0], [0, B0 + 0.02, BL / 2], 0.012, rust));
    if (a.owner === 'parked') { add(s.rod([0, 0.3, 1.0], [0.05, -R + 0.05, 1.08], 0.014, rust)); add(s.cylinder(0.05, 0.05, 0.035, [0.05, -R + 0.05, 1.08], rubber, 12)).rotation.z = Math.PI / 2; }

    // Load. Everything is placed in cart space so it tips with the cart.
    const load = new THREE.Group(); cart.add(load);
    const L = <T extends THREE.Object3D>(m: T) => add(m, load);
    const full = mix(0.6, 1, mood.density);
    const jerry = (at: P, colour: string, turn = 0) => {
      const g = new THREE.Group(); g.position.set(...at); g.rotation.y = turn;
      const m = s.material(colour, { roughness: 0.6, metalness: 0.2 });
      add(s.box([0.34, 0.4, 0.14], [0, 0.2, 0], m), g);
      add(s.box([0.24, 0.05, 0.03], [0, 0.44, 0], m), g);
      for (const dx of [-0.11, 0.11]) add(s.box([0.02, 0.05, 0.03], [dx, 0.41, 0], m), g);
      add(s.cylinder(0.025, 0.03, 0.06, [0.13, 0.42, 0], s.material('#222'), 8), g).rotation.z = -0.5;
      for (const r of [-1, 1]) add(s.box([0.3, 0.012, 0.15], [0, 0.2, 0], s.material(new THREE.Color(colour).multiplyScalar(0.75))), g).rotation.z = r * 0.85;
      load.add(g); return g;
    };
    const bookStack = (at: P, n: number) => {
      const covers = ['#8a2f2a', '#2f4f6f', '#3f6a45', '#b08a3a', '#5a3a5f', '#d9d2c0', '#a3582e'];
      let y = at[1];
      for (let i = 0; i < n; i++) { const h = 0.025 + random() * 0.035; const b = L(s.box([0.15 + random() * 0.03, h, 0.21 + random() * 0.03], [at[0], y + h / 2, at[2]], s.material(covers[Math.floor(random() * covers.length)]))); b.rotation.y = (random() - 0.5) * 0.25; L(s.box([0.14, h * 0.7, 0.005], [at[0], y + h / 2, at[2] + 0.115], s.material('#efe8d2'))).rotation.y = b.rotation.y; y += h; }
      L(s.box([0.012, y - at[1] + 0.01, 0.24], [at[0], (y + at[1]) / 2, at[2]], s.material('#c9b98a')));
      L(s.box([0.19, y - at[1] + 0.01, 0.012], [at[0], (y + at[1]) / 2, at[2]], s.material('#c9b98a')));
      return y;
    };
    // Baseline: boxes and bundles to the rim, a bedroll, one jerrycan on the side.
    L(s.box([BW - 0.06, BH * 0.75, BL - 0.08], [0, B0 + BH * 0.38, 0], s.material('#8a6f4a', { roughness: 1 })));
    L(s.box([BW - 0.1, 0.2, 0.4], [0.02, B1 - 0.03, -0.25], s.material('#a58a5c', { roughness: 1 }))).rotation.y = 0.08;
    let top = B1 + 0.07;
    if (a.tarp !== 'none') {
      const tarp = new THREE.MeshStandardMaterial({ color: new THREE.Color(TARPS[a.tarp]).lerp(new THREE.Color('#a9a89a'), wear * 0.3), roughness: a.tarp === 'silver' ? 0.3 : 0.75, metalness: a.tarp === 'silver' ? 0.7 : 0, flatShading: true });
      const geo = new THREE.SphereGeometry(1, 9, 6);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * (1 + (random() - 0.5) * 0.18), pos.getY(i) * (1 + (random() - 0.5) * 0.3), pos.getZ(i) * (1 + (random() - 0.5) * 0.18));
      geo.computeVertexNormals();
      const lump = L(s.mesh(geo, tarp, [0, B1 - 0.02, -0.06]));
      lump.scale.set(BW / 2 + 0.07, 0.26 * full, BL / 2 * 0.86);
      // Skirt of tarp hanging over the rim on one side, and the rope that holds it.
      L(s.box([0.015, 0.3, BL * 0.7], [-BW / 2 - 0.02, B1 - 0.13, -0.05], tarp)).rotation.z = -0.08;
      const rope = s.material('#d9c27a', { roughness: 1 });
      for (const z of [-0.3, 0.1]) { const r = L(s.ring(BW / 2 + 0.085, 0.009, [0, B1 - 0.02, z], rope)); r.scale.y = (0.26 * full + 0.03) / (BW / 2 + 0.085); }
      top = B1 + 0.24 * full;
    }
    const roll = L(s.cylinder(0.11, 0.11, BW + 0.1, [0, top + 0.07, -0.3], s.material('#5f6b4a', { roughness: 1 }), 12)); roll.rotation.z = Math.PI / 2;
    for (const dx of [-0.2, 0.2]) L(s.ring(0.113, 0.008, [dx, top + 0.07, -0.3], s.material('#2a2a2a'))).rotation.y = Math.PI / 2;
    jerry([-BW / 2 - 0.09, 0.1, -0.2], '#5d6a3f', Math.PI / 2);
    // A blackened pot and a coil of rope hung off the back corner.
    L(s.cylinder(0.11, 0.09, 0.11, [BW / 2 + 0.1, 0.42, -0.36], s.material('#232221', { metalness: 0.4 }), 12));
    L(s.ring(0.12, 0.022, [BW / 2 + 0.03, 0.3, 0.3], s.material('#c9a86a', { roughness: 1 }))).rotation.y = Math.PI / 2;

    // What they valued.
    const spin: THREE.Object3D[] = [];
    const hero: P = [0.02, top - 0.03, 0.12];
    if (a.valued === 'books') {
      bookStack([-0.14, top - 0.04, 0.16], 7 + Math.round(random() * 4)); bookStack([0.12, top - 0.05, 0.12], 5 + Math.round(random() * 4)); bookStack([0, top - 0.05, -0.08], 3);
      bookStack([0.1, top - 0.05, -0.1], 4);
    } else if (a.valued === 'water') {
      jerry([BW / 2 + 0.09, 0.1, 0.12], '#2f5f9a', Math.PI / 2); jerry([-BW / 2 - 0.09, 0.1, 0.2], '#b3352a', Math.PI / 2); jerry([0, top - 0.06, 0.16], '#5d6a3f', 0.2);
      const bottle = new THREE.MeshStandardMaterial({ color: '#8fc4e0', roughness: 0.15, transparent: true, opacity: 0.75 });
      L(s.cylinder(0.13, 0.13, 0.34, [0.0, B1 + 0.05, BL / 2 + 0.16], bottle, 14)); L(s.cylinder(0.04, 0.1, 0.07, [0, B1 + 0.255, BL / 2 + 0.16], bottle, 12)); L(s.cylinder(0.035, 0.035, 0.03, [0, B1 + 0.3, BL / 2 + 0.16], s.material('#2f5f9a'), 10));
      L(s.box([0.3, 0.02, 0.3], [0, B1 - 0.13, BL / 2 + 0.16], steel));
    } else if (a.valued === 'music') {
      const wood = s.material('#b9773a', { roughness: 0.4 });
      const g = new THREE.Group(); g.position.set(-0.05, top - 0.12, -BL / 2 + 0.06); g.rotation.x = -0.14; g.rotation.z = 0.08;
      const lower = add(s.ball([0.19, 0.2, 0.05], [0, 0.2, 0], wood, 16), g); void lower;
      add(s.ball([0.145, 0.15, 0.048], [0, 0.46, 0], wood, 16), g);
      add(s.cylinder(0.05, 0.05, 0.012, [0, 0.36, 0.05], s.material('#1c1410'), 14), g).rotation.x = Math.PI / 2;
      add(s.box([0.05, 0.5, 0.025], [0, 0.82, 0.02], s.material('#3a2a1e')), g);
      add(s.box([0.075, 0.15, 0.03], [0, 1.13, 0.01], s.material('#2a1e16')), g);
      add(s.box([0.1, 0.02, 0.02], [0, 0.14, 0.05], s.material('#2a1e16')), g);
      for (const dx of [-0.012, 0, 0.012]) add(s.rod([dx, 0.14, 0.055], [dx, 1.1, 0.035], 0.0015, steel), g);
      load.add(g);
      L(s.box([0.26, 0.16, 0.09], [0.1, top + 0.05, 0.2], s.material('#7a3b2e')));
      L(s.cylinder(0.05, 0.05, 0.01, [0.05, top + 0.05, 0.248], s.material('#1a1a1a'), 14)).rotation.x = Math.PI / 2;
      L(s.rod([0.2, top + 0.13, 0.2], [0.3, top + 0.55, 0.16], 0.004, steel));
    } else if (a.valued === 'childhood') {
      const fur = s.material('#b98a54', { roughness: 1 });
      const [bx, by, bz] = hero;
      L(s.ball([0.12, 0.14, 0.1], [bx, by + 0.15, bz], fur, 12)); L(s.ball([0.1, 0.1, 0.095], [bx, by + 0.35, bz + 0.01], fur, 12));
      L(s.ball([0.045, 0.04, 0.045], [bx, by + 0.33, bz + 0.09], s.material('#e3cfa4'), 8));
      for (const dx of [-1, 1]) { L(s.ball([0.04, 0.04, 0.025], [bx + dx * 0.08, by + 0.44, bz], fur, 8)); L(s.ball([0.045, 0.1, 0.045], [bx + dx * 0.14, by + 0.2, bz + 0.03], fur, 8)).rotation.z = dx * 0.6; L(s.ball([0.05, 0.05, 0.1], [bx + dx * 0.08, by + 0.05, bz + 0.1], fur, 8)); L(s.ball([0.013, 0.013, 0.013], [bx + dx * 0.035, by + 0.37, bz + 0.09], s.material('#141414'), 6)); }
      const pw = new THREE.Group(); pw.position.set(BW / 2 - 0.02, B1 + 0.75, BL / 2 - 0.05);
      L(s.rod([BW / 2 - 0.02, B1, BL / 2 - 0.02], [BW / 2 - 0.02, B1 + 0.75, BL / 2 - 0.08], 0.008, s.material('#e9e2cf')));
      ['#e8483a', '#f2c81f', '#3d8fc9', '#58a85a'].forEach((colour, i) => { const v = add(s.mesh(new THREE.ConeGeometry(0.06, 0.18, 3), s.material(colour, { side: THREE.DoubleSide }), [Math.cos(i * 1.571) * 0.09, Math.sin(i * 1.571) * 0.09, 0]), pw); v.rotation.z = i * 1.571 - Math.PI / 2 + 0.5; v.scale.z = 0.25; });
      load.add(pw); spin.push(pw);
      L(s.label('ME + DAD', 0.3, 0.2, [-BW / 2 - 0.012, 0.36, 0.22], '#2a4f9a', '#f4f0e2')).rotation.y = -Math.PI / 2;
    } else if (a.valued === 'tools') {
      const ash = s.material('#b79a6a', { roughness: 0.9 });
      const hx = -0.18;
      L(s.rod([hx, B0 + 0.05, -0.38], [hx - 0.06, B1 + 0.85, -0.44], 0.018, ash)); L(s.box([0.18, 0.26, 0.012], [hx - 0.065, B1 + 0.98, -0.445], steel)).rotation.x = -0.07;
      L(s.rod([hx + 0.12, B0 + 0.05, -0.4], [hx + 0.2, B1 + 0.7, -0.46], 0.016, ash)); for (let i = 0; i < 6; i++) L(s.rod([hx + 0.1 + i * 0.04, B1 + 0.7, -0.46], [hx + 0.1 + i * 0.04, B1 + 0.82, -0.44], 0.005, rust)); L(s.rod([hx + 0.08, B1 + 0.7, -0.46], [hx + 0.32, B1 + 0.7, -0.46], 0.008, rust));
      L(s.box([0.42, 0.16, 0.2], [0.03, top + 0.04, 0.16], s.material('#b3352a', { metalness: 0.3 }))); L(s.box([0.44, 0.03, 0.22], [0.03, top + 0.13, 0.16], s.material('#8a2a22'))); L(s.ring(0.05, 0.008, [0.03, top + 0.16, 0.16], steel));
      const saw = L(s.box([0.012, 0.13, 0.55], [BW / 2 + 0.02, 0.36, 0.05], steel)); saw.rotation.x = 0.1; L(s.box([0.03, 0.12, 0.1], [BW / 2 + 0.025, 0.39, -0.26], ash));
      L(s.ring(0.13, 0.03, [0.0, top + 0.05, -0.02], s.material('#d9c27a', { roughness: 1 }))).rotation.x = Math.PI / 2;
    } else {
      const gilt = s.material('#b8963c', { metalness: 0.5, roughness: 0.4 });
      const pics = ['#7f9fb0', '#a8b58a', '#c9a58a', '#5a6a7a'];
      for (let i = 0; i < 4; i++) { const w = 0.3 + random() * 0.16, h = 0.24 + random() * 0.2, z = 0.34 - i * 0.07; const f = L(s.box([w, h, 0.03], [(random() - 0.5) * 0.08, top - 0.08 + h / 2, z], i % 2 ? s.material('#3a2a1e') : gilt)); f.rotation.x = -0.14; L(s.box([w - 0.07, h - 0.07, 0.006], [f.position.x, f.position.y, z + 0.016], s.material(pics[i]))).rotation.x = -0.14; }
      const cx = 0.05, cy = top + 0.02, cz = -0.02;
      L(s.box([0.26, 0.2, 0.1], [cx, cy + 0.1, cz], s.material('#4a2e1e', { roughness: 0.4 }))); L(s.cylinder(0.13, 0.13, 0.1, [cx, cy + 0.2, cz], s.material('#4a2e1e', { roughness: 0.4 }), 16)).rotation.x = Math.PI / 2;
      L(s.cylinder(0.09, 0.09, 0.012, [cx, cy + 0.2, cz + 0.052], s.material('#f1ead6'), 16)).rotation.x = Math.PI / 2;
      L(s.rod([cx, cy + 0.2, cz + 0.06], [cx + 0.035, cy + 0.25, cz + 0.06], 0.005, s.material('#111'))); L(s.rod([cx, cy + 0.2, cz + 0.06], [cx - 0.06, cy + 0.2, cz + 0.06], 0.004, s.material('#111')));
    }

    // The pot lashed at the front.
    if (a.plant !== 'none') {
      const px = BW / 2 - 0.13, pz = BL / 2 + 0.13, py = B1 - 0.32;
      L(s.box([0.3, 0.02, 0.3], [px, py - 0.01, pz], rust));
      L(s.cylinder(0.13, 0.095, 0.22, [px, py + 0.11, pz], s.material('#b5623c', { roughness: 0.9 }), 14)); L(s.cylinder(0.14, 0.14, 0.035, [px, py + 0.22, pz], s.material('#b5623c', { roughness: 0.9 }), 14)); L(s.cylinder(0.12, 0.12, 0.01, [px, py + 0.235, pz], s.material('#3a2a1e', { roughness: 1 }), 12));
      const green = s.material('#4f8a3a', { roughness: 0.9 }), dark = s.material('#3d6e30', { roughness: 0.9 });
      const y0 = py + 0.24;
      if (a.plant === 'tomato') {
        L(s.rod([px, y0, pz], [px, y0 + 0.75, pz], 0.008, s.material('#c9b98a'))); L(s.rod([px + 0.02, y0, pz], [px + 0.03, y0 + 0.65, pz + 0.02], 0.01, green));
        for (let i = 0; i < 9; i++) { const t = i * 2.4, h = 0.12 + i * 0.065; L(s.ball([0.09, 0.02, 0.05], [px + Math.cos(t) * 0.1, y0 + h, pz + Math.sin(t) * 0.1], i % 2 ? green : dark, 8)).rotation.y = -t; }
        for (let i = 0; i < 5; i++) { const t = i * 1.9; L(s.ball([0.034, 0.032, 0.034], [px + Math.cos(t) * 0.09, y0 + 0.16 + i * 0.09, pz + Math.sin(t) * 0.09], s.material(i === 4 ? '#b7c24a' : '#d83a2a', { roughness: 0.3 }), 10)); }
      } else if (a.plant === 'sapling') {
        L(s.rod([px, y0, pz], [px + 0.03, y0 + 0.95, pz], 0.014, s.material('#6a5238'), 0.006));
        for (let i = 0; i < 7; i++) { const t = i * 2.1, h = 0.45 + i * 0.09; L(s.rod([px + 0.02, y0 + h - 0.08, pz], [px + Math.cos(t) * 0.16, y0 + h, pz + Math.sin(t) * 0.16], 0.005, s.material('#6a5238'))); L(s.ball([0.08, 0.06, 0.08], [px + Math.cos(t) * 0.17, y0 + h + 0.02, pz + Math.sin(t) * 0.17], i % 2 ? green : dark, 8)); }
        L(s.ball([0.03, 0.03, 0.03], [px + 0.14, y0 + 0.62, pz + 0.05], s.material('#e9a03a', { roughness: 0.4 }), 8));
      } else if (a.plant === 'sunflower') {
        L(s.rod([px, y0, pz], [px + 0.02, y0 + 1.05, pz + 0.03], 0.012, green));
        for (let i = 0; i < 4; i++) { const t = i * 1.9; L(s.ball([0.1, 0.015, 0.06], [px + Math.cos(t) * 0.1, y0 + 0.25 + i * 0.17, pz + Math.sin(t) * 0.1], green, 8)).rotation.y = -t; }
        const head = new THREE.Group(); head.position.set(px + 0.02, y0 + 1.07, pz + 0.06); head.rotation.x = 0.35;
        add(s.cylinder(0.075, 0.075, 0.03, [0, 0, 0], s.material('#4a2e1a', { roughness: 1 }), 14), head).rotation.x = Math.PI / 2;
        for (let i = 0; i < 14; i++) { const t = (i / 14) * 6.283; add(s.ball([0.05, 0.02, 0.008], [Math.cos(t) * 0.115, Math.sin(t) * 0.115, 0], s.material('#f2c21f', { roughness: 0.6 }), 6), head).rotation.z = t; }
        load.add(head);
      } else if (a.plant === 'herbs') {
        for (let i = 0; i < 16; i++) { const t = random() * 6.28, r = random() * 0.1, h = 0.1 + random() * 0.18; L(s.rod([px + Math.cos(t) * r, y0, pz + Math.sin(t) * r], [px + Math.cos(t) * (r + 0.05), y0 + h, pz + Math.sin(t) * (r + 0.05)], 0.004, dark)); L(s.ball([0.035, 0.03, 0.035], [px + Math.cos(t) * (r + 0.05), y0 + h, pz + Math.sin(t) * (r + 0.05)], i % 3 ? green : s.material('#8aa05a'), 6)); }
      } else {
        const dry = s.material('#7a5f42', { roughness: 1 });
        L(s.rod([px, y0, pz], [px + 0.05, y0 + 0.5, pz - 0.02], 0.008, dry, 0.004));
        L(s.rod([px + 0.03, y0 + 0.3, pz], [px - 0.09, y0 + 0.42, pz + 0.05], 0.004, dry)); L(s.rod([px + 0.04, y0 + 0.38, pz], [px + 0.14, y0 + 0.46, pz - 0.04], 0.004, dry));
        L(s.ball([0.035, 0.008, 0.02], [px + 0.1, y0 + 0.012, pz + 0.03], dry, 6));
      }
    }

    // Mast.
    let lamp: THREE.MeshStandardMaterial | null = null;
    const flutter: THREE.Object3D[] = [];
    if (a.mast !== 'none') {
      const mx = -BW / 2, mz = -BL / 2, mh = a.mast === 'solar' ? 1.05 : 1.6;
      add(s.rod([mx, B0, mz], [mx, B0 + mh, mz - (a.mast === 'pennant' ? 0.12 : 0)], 0.012, steel, a.mast === 'pennant' ? 0.004 : 0.012));
      const ty = B0 + mh;
      if (a.mast === 'pennant') {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.2, 0, -0.4, -0.1, 0], 3)); geo.computeVertexNormals();
        const g = new THREE.Group(); g.position.set(mx, ty, mz - 0.12);
        add(s.mesh(geo, s.material('#c7281e', { side: THREE.DoubleSide })), g); g.rotation.y = 0.5; cart.add(g); flutter.push(g);
      } else if (a.mast === 'lantern') {
        add(s.rod([mx, ty, mz], [mx + 0.2, ty, mz], 0.008, steel));
        lamp = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: mix(1.2, 2.8, mood.warmth), roughness: 0.3 });
        const g = new THREE.Group(); g.position.set(mx + 0.2, ty, mz);
        add(s.cylinder(0.05, 0.06, 0.13, [0, -0.17, 0], lamp, 10), g); add(s.cylinder(0.065, 0.07, 0.04, [0, -0.25, 0], s.material('#3a3f3a', { metalness: 0.5 }), 10), g); add(s.cylinder(0.03, 0.065, 0.05, [0, -0.08, 0], s.material('#3a3f3a', { metalness: 0.5 }), 10), g); add(s.ring(0.04, 0.004, [0, -0.03, 0], steel), g);
        cart.add(g); flutter.push(g);
      } else if (a.mast === 'cans') {
        add(s.rod([mx, ty, mz], [BW / 2, B1 + 0.2, -BL / 2 - 0.16], 0.003, s.material('#c9b98a')));
        for (let i = 0; i < 5; i++) { const t = (i + 1) / 6; const g = new THREE.Group(); g.position.set(mix(mx, BW / 2, t), mix(ty, B1 + 0.2, t), mix(mz, -BL / 2 - 0.16, t)); add(s.cylinder(0.035, 0.035, 0.09, [0, -0.09, 0], i % 2 ? steel : rust, 10), g); add(s.rod([0, 0, 0], [0, -0.05, 0], 0.002, steel), g); cart.add(g); flutter.push(g); }
      } else {
        const panel = add(s.box([0.5, 0.02, 0.36], [mx + 0.14, ty + 0.02, mz + 0.05], s.material('#1c2c4a', { metalness: 0.5, roughness: 0.25 }))); panel.rotation.set(0.45, 0.3, 0);
        const frame = add(s.box([0.53, 0.012, 0.39], [mx + 0.14, ty + 0.012, mz + 0.05], steel)); frame.rotation.copy(panel.rotation);
        add(s.rod([mx, ty - 0.1, mz], [-0.1, B1, 0], 0.004, s.material('#111')));
      }
    }

    // Pose.
    cart.position.y = R;
    const loose: P[] = [];
    if (a.owner === 'dropped') { cart.rotation.x = Math.asin((R - 0.03) / Math.hypot(hy, hz)) + Math.atan2(hy, hz); cart.rotation.y = 0.12; }
    else if (a.owner === 'tipped') {
      cart.rotation.z = -1.42; cart.rotation.y = 0.25; cart.position.y = BW / 2 + 0.22;
      for (let i = 0; i < 9; i++) loose.push([0.9 + random() * 1.0, 0, -0.5 + random() * 1.2]);
    } else if (small) { cart.rotation.z = 0; }
    loose.forEach(([x, , z], i) => {
      if (a.valued === 'books' || i % 3 === 0) { const b = s.box([0.15, 0.035, 0.21], [x, 0.018, z], s.material(['#8a2f2a', '#2f4f6f', '#3f6a45', '#b08a3a'][i % 4])); b.rotation.y = random() * 6; }
      else if (i % 3 === 1) { const t = s.cylinder(0.037, 0.037, 0.1, [x, 0.037, z], steel, 10); t.rotation.set(Math.PI / 2, 0, random() * 6); }
      else s.ball([0.1 + random() * 0.1, 0.03, 0.1], [x, 0.03, z], s.material(['#d9d2c0', '#b84a3a', '#3f5f8a'][i % 3]), 8);
    });

    const breeze = mix(0.3, 3, mood.energy);
    return s.finish({
      footprint: 1.1,
      update: (dt, time) => {
        for (const p of spin) p.rotation.z += dt * breeze * 2.2;
        flutter.forEach((g, i) => { g.rotation.z = Math.sin(time * (1.5 + breeze) + i) * 0.12 * (0.4 + mood.energy); });
        if (lamp) lamp.emissiveIntensity = mix(1.2, 2.8, mood.warmth) * (0.9 + 0.1 * Math.sin(time * 9));
      },
    });
  },
});
