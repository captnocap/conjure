import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
const LIQUOR = ['#b8691e', '#7a3b12', '#d9a441', '#8f1f2a', '#3f8f52', '#e9dfc0'];

export default defineThing({
  questions: {
    stock: score('How stocked or drained is the cart?', ['Bone dry, nothing but empties', 'Running low, an inch left in each', 'Comfortably stocked', 'Loaded for a party']),
    lastDrink: choice('What was the last drink poured, still sitting on the cart?', {
      none: 'Nothing: every glass is clean and put away.',
      neat: 'Two fingers of whiskey, neat, in a heavy lowball.',
      martini: 'A martini in a stemmed glass with an olive on a pick.',
      highball: 'A tall highball with ice and a wheel of lemon.',
      tiki: 'Something orange and sweet with a paper umbrella and a cherry.',
      'bloody-mary': 'A red Bloody Mary with a celery stalk, the morning after.',
      spilled: 'A tumbler knocked on its side in a spreading puddle.',
    }),
    company: choice('How many glasses have been used?', {
      one: 'Just one. Someone is drinking alone.',
      pair: 'Two, set close together.',
      crowd: 'A crowd of mismatched tumblers left wherever people put them down.',
    }),
    metal: choice('What is the frame made of?', {
      brass: 'Bright polished brass.',
      chrome: 'Cool mirror chrome.',
      bronze: 'Dark antiqued bronze.',
      gold: 'Rich yellow gold plate, a little too much.',
    }),
    glass: choice('What are the shelves?', {
      smoked: 'Smoked grey-brown glass.',
      amber: 'Amber glass the colour of the whiskey.',
      mirror: 'Mirrored glass that doubles every bottle.',
      green: 'Thick clear glass with a green edge.',
    }),
    shape: choice('What shape is the cart?', {
      gallery: 'A boxy two-tier trolley with gallery rails and a push handle.',
      hoops: 'Two big brass hoops for ends, the shelves slung between them.',
      trolley: 'A tea-trolley with two large spoked wheels and a long raked handle.',
    }),
    ice: noul('Is the ice bucket open, with ice in it?'),
    garnish: choice('What else is out on the cart?', {
      nothing: 'Nothing else.',
      citrus: 'A little board with a cut lemon, a lime and a paring knife.',
      nuts: 'A bowl of mixed nuts.',
      shaker: 'A cocktail shaker and a long bar spoon.',
      ashtray: 'A glass ashtray with a cigarette burning down.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const metalTone = new THREE.Color({ brass: '#c9a04a', chrome: '#d4d8da', bronze: '#6e5334', gold: '#e2b736' }[a.metal]).lerp(new THREE.Color('#6b6048'), mood.wear * 0.45);
    const metal = new THREE.MeshStandardMaterial({ color: metalTone, metalness: 0.85, roughness: mix(0.2, 0.6, mood.wear) });
    const chrome = new THREE.MeshStandardMaterial({ color: '#d7dbdc', metalness: 0.9, roughness: 0.2 });
    const rubber = s.material('#1c1b1a');
    const shelfMat = a.glass === 'mirror'
      ? new THREE.MeshStandardMaterial({ color: '#c3ced3', metalness: 0.35, roughness: 0.12 })
      : new THREE.MeshPhysicalMaterial({ color: { smoked: '#4a423a', amber: '#a8641c', green: '#9fc4b0' }[a.glass], transparent: true, opacity: a.glass === 'green' ? 0.5 : 0.74, roughness: 0.06 });
    const crystal = new THREE.MeshPhysicalMaterial({ color: '#dcebef', transparent: true, opacity: 0.55, roughness: 0.05 });
    const tinted = (tone: string) => new THREE.MeshPhysicalMaterial({ color: tone, transparent: true, opacity: 0.42, roughness: 0.05 });
    const liquid = (tone: string) => new THREE.MeshStandardMaterial({ color: tone, roughness: 0.15, emissive: tone, emissiveIntensity: 0.12 });

    const L = 0.8, Dp = 0.42, topY = 0.72, lowY = 0.26, R = 0.011;
    const hx = L / 2, hz = Dp / 2;
    for (const y of [topY, lowY]) {
      s.box([L - 0.02, 0.012, Dp - 0.02], [0, y - 0.006, 0], shelfMat);
      for (const z of [-hz, hz]) s.rod([-hx, y - 0.006, z], [hx, y - 0.006, z], R, metal);
      for (const x of [-hx, hx]) s.rod([x, y - 0.006, -hz], [x, y - 0.006, hz], R, metal);
    }
    const caster = (x: number, z: number, from: number) => {
      s.rod([x, from, z], [x, 0.07, z], R * 0.8, metal);
      s.cylinder(0.03, 0.03, 0.02, [x, 0.03, z], rubber, 14).rotation.x = Math.PI / 2;
      s.ball([0.016, 0.016, 0.016], [x, 0.065, z], metal, 8);
    };
    if (a.shape === 'gallery') {
      for (const x of [-hx, hx]) for (const z of [-hz, hz]) { s.rod([x, 0.06, z], [x, topY + 0.07, z], R, metal); s.ball([0.018, 0.018, 0.018], [x, topY + 0.08, z], metal, 10); caster(x, z, 0.1); }
      for (const y of [topY + 0.055, lowY + 0.055]) {
        for (const z of [-hz, hz]) s.rod([-hx, y, z], [hx, y, z], R * 0.7, metal);
        s.rod([hx, y, -hz], [hx, y, hz], R * 0.7, metal);
        s.rod([-hx, y, -hz], [-hx, y, hz], R * 0.7, metal);
      }
      s.tube([[-hx, topY + 0.02, -hz], [-hx - 0.1, topY + 0.1, -hz], [-hx - 0.13, topY + 0.13, -hz * 0.6], [-hx - 0.13, topY + 0.13, hz * 0.6], [-hx - 0.1, topY + 0.1, hz], [-hx, topY + 0.02, hz]], R, metal);
    } else if (a.shape === 'hoops') {
      const cy = (topY + lowY) / 2 + 0.02, hr = Math.hypot(hz, (topY - lowY) / 2 + 0.02);
      for (const x of [-hx, hx]) {
        s.ring(hr, R * 1.2, [x, cy, 0], metal).rotation.y = Math.PI / 2;
        s.ring(hr * 0.5, R * 0.7, [x, cy, 0], metal).rotation.y = Math.PI / 2;
        for (const z of [-0.13, 0.13]) caster(x, z, cy - Math.sqrt(hr * hr - z * z));
      }
      for (const z of [-hz, hz]) s.rod([-hx, topY + 0.05, z * 0.86], [hx, topY + 0.05, z * 0.86], R * 0.7, metal);
    } else {
      for (const z of [-hz, hz]) {
        s.rod([hx, 0.14, z], [hx, topY + 0.06, z], R, metal);
        s.rod([-hx, 0.06, z], [-hx, topY + 0.06, z], R, metal);
        caster(-hx, z, 0.1);
        const wheelZ = z + Math.sign(z) * 0.03;
        s.ring(0.14, 0.012, [hx, 0.152, wheelZ], rubber);
        s.ring(0.126, 0.008, [hx, 0.152, wheelZ], metal);
        for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4 + 0.2; s.rod([hx, 0.152, wheelZ], [hx + Math.cos(t) * 0.126, 0.152 + Math.sin(t) * 0.126, wheelZ], 0.004, metal); }
        s.cylinder(0.02, 0.02, 0.03, [hx, 0.152, wheelZ], metal, 12).rotation.x = Math.PI / 2;
        s.rod([-hx, topY + 0.06, z], [hx, topY + 0.06, z], R * 0.7, metal);
        s.rod([-hx, topY, z], [-hx - 0.2, topY + 0.2, z], R, metal);
      }
      s.rod([hx, 0.152, -hz - 0.03], [hx, 0.152, hz + 0.03], 0.008, metal);
      s.rod([hx, topY + 0.06, -hz], [hx, topY + 0.06, hz], R * 0.7, metal);
      s.rod([-hx - 0.2, topY + 0.2, -hz], [-hx - 0.2, topY + 0.2, hz], R * 1.5, s.material('#3a2416', { roughness: 0.4 }));
    }

    // Decanters along the back of the top shelf.
    const level = (base: number) => Math.max(0, Math.min(1, a.stock * 1.05 * mix(0.6, 1.15, random()) + base));
    const decanter = (kind: number, at: P3, tone: string) => {
      const [x, y, z] = at, fill = level(0.02);
      if (kind === 0) {
        s.mesh(new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.058, 0.02], [0.058, 0.13], [0.02, 0.16], [0.018, 0.2], [0.026, 0.205]].map(([r, h]) => new THREE.Vector2(r, h)), 4), crystal, at).rotation.y = Math.PI / 4;
        if (fill > 0.03) s.box([0.07, 0.125 * fill, 0.07], [x, y + 0.008 + 0.0625 * fill, z], liquid(tone));
        s.box([0.03, 0.035, 0.03], [x, y + 0.225, z], crystal).rotation.y = Math.PI / 4;
      } else if (kind === 1) {
        s.mesh(new THREE.LatheGeometry([[0, 0], [0.075, 0], [0.08, 0.015], [0.03, 0.12], [0.016, 0.14], [0.016, 0.21], [0.024, 0.215]].map(([r, h]) => new THREE.Vector2(r, h)), 10), crystal, at);
        if (fill > 0.03) s.cylinder(mix(0.07, 0.03, fill), 0.07, 0.1 * fill, [x, y + 0.008 + 0.05 * fill, z], liquid(tone), 10);
        s.ball([0.022, 0.026, 0.022], [x, y + 0.24, z], crystal, 8);
      } else {
        s.mesh(new THREE.LatheGeometry([[0, 0], [0.04, 0], [0.052, 0.04], [0.052, 0.15], [0.036, 0.19], [0.015, 0.21], [0.015, 0.25], [0.022, 0.255]].map(([r, h]) => new THREE.Vector2(r, h)), 8), crystal, at);
        if (fill > 0.03) s.cylinder(0.043, 0.036, 0.17 * fill, [x, y + 0.008 + 0.085 * fill, z], liquid(tone), 8);
        s.mesh(new THREE.OctahedronGeometry(0.024), crystal, [x, y + 0.285, z]);
      }
    };
    const decanters = 1 + Math.round(a.stock * 2 + mood.density * 0.6);
    const order = [0, 1, 2].sort(() => random() - 0.5);
    for (let i = 0; i < Math.min(3, decanters); i++) decanter(order[i], [-0.29 + i * 0.16 + (random() - 0.5) * 0.02, topY, -0.1 + (random() - 0.5) * 0.03], LIQUOR[Math.floor(random() * 4)]);

    // Soda siphon.
    const sx = 0.27, sz = -0.09;
    s.lathe([[0, 0], [0.045, 0], [0.052, 0.02], [0.052, 0.16], [0.03, 0.22], [0.022, 0.24], [0, 0.24]], tinted(['#5f93b8', '#6fae8a', '#c9d6d8'][Math.floor(random() * 3)]), [sx, topY, sz]);
    for (let i = 0; i < 6; i++) s.ring(0.054, 0.0025, [sx, topY + 0.03 + i * 0.026, sz], chrome).rotation.x = Math.PI / 2;
    s.cylinder(0.026, 0.03, 0.05, [sx, topY + 0.265, sz], chrome, 14);
    s.rod([sx, topY + 0.275, sz], [sx + 0.07, topY + 0.25, sz + 0.02], 0.007, chrome, 0.004);
    s.rod([sx, topY + 0.29, sz], [sx - 0.06, topY + 0.3, sz - 0.01], 0.008, chrome);
    s.ball([0.012, 0.012, 0.012], [sx, topY + 0.297, sz], chrome, 8);

    // Ice bucket.
    const bx = -0.25, bz = 0.09;
    const bucket = a.metal === 'chrome' ? chrome : metal;
    s.mesh(new THREE.CylinderGeometry(0.078, 0.064, 0.14, 24, 1, true), new THREE.MeshStandardMaterial({ color: bucket.color, metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide }), [bx, topY + 0.07, bz]);
    s.cylinder(0.064, 0.064, 0.008, [bx, topY + 0.004, bz], bucket, 24);
    s.ring(0.08, 0.006, [bx, topY + 0.14, bz], bucket).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) s.ring(0.018, 0.004, [bx + side * 0.086, topY + 0.1, bz], bucket).rotation.y = Math.PI / 2;
    if (a.ice) {
      const frost = new THREE.MeshStandardMaterial({ color: '#eef7fa', roughness: 0.15, emissive: '#bfe3ee', emissiveIntensity: 0.15 });
      const meltdown = mix(0.14, 0.07, mood.warmth);
      for (let i = 0; i < 14; i++) {
        const cube = s.box([0.028, 0.028, 0.028], [bx + (random() - 0.5) * 0.1, topY + meltdown + random() * 0.02, bz + (random() - 0.5) * 0.1], frost);
        cube.rotation.set(random() * 3, random() * 3, random() * 3);
      }
      const lid = s.lathe([[0, 0.03], [0.03, 0.028], [0.07, 0.012], [0.082, 0], [0, 0]], bucket, [bx + 0.03, topY + 0.07, bz + 0.105]);
      lid.rotation.x = 1.25;
      s.rod([bx + 0.05, topY + 0.13, bz - 0.03], [bx + 0.1, topY + 0.24, bz - 0.09], 0.005, chrome);
      s.rod([bx + 0.03, topY + 0.13, bz - 0.04], [bx + 0.09, topY + 0.24, bz - 0.1], 0.005, chrome);
    } else {
      s.lathe([[0, 0.035], [0.03, 0.03], [0.07, 0.012], [0.082, 0], [0, 0]], bucket, [bx, topY + 0.14, bz]);
      s.ball([0.016, 0.016, 0.016], [bx, topY + 0.185, bz], s.material('#1c1b1a'), 10);
    }

    // Glasses.
    const tumbler = (at: P3, radius: number, height: number, tone: string | null, fill: number, glass: THREE.Material = crystal) => {
      s.mesh(new THREE.CylinderGeometry(radius, radius * 0.85, height, 14, 1, true), glass, [at[0], at[1] + height / 2, at[2]]);
      s.cylinder(radius * 0.85, radius * 0.85, 0.008, [at[0], at[1] + 0.004, at[2]], glass, 14);
      if (tone && fill > 0) s.cylinder(radius * 0.92, radius * 0.82, height * fill, [at[0], at[1] + 0.008 + height * fill / 2, at[2]], liquid(tone), 14);
    };
    const dx = 0.02, dz = 0.11, drink: P3 = [dx, topY, dz];
    const cubes = (at: P3, y: number, n: number) => { for (let i = 0; i < n; i++) s.box([0.02, 0.02, 0.02], [at[0] + (random() - 0.5) * 0.03, y + i * 0.012, at[2] + (random() - 0.5) * 0.03], new THREE.MeshStandardMaterial({ color: '#eef7fa', roughness: 0.15 })).rotation.set(random(), random(), random()); };
    if (a.lastDrink === 'neat') tumbler(drink, 0.04, 0.085, '#b8691e', 0.3);
    else if (a.lastDrink === 'martini') {
      s.cylinder(0.035, 0.035, 0.004, [dx, topY + 0.002, dz], crystal, 16);
      s.rod([dx, topY, dz], [dx, topY + 0.09, dz], 0.004, crystal);
      s.mesh(new THREE.ConeGeometry(0.055, 0.06, 20, 1, true), crystal, [dx, topY + 0.12, dz]).rotation.x = Math.PI;
      s.mesh(new THREE.ConeGeometry(0.044, 0.048, 20), liquid('#e3e6cf'), [dx, topY + 0.118, dz]).rotation.x = Math.PI;
      s.rod([dx - 0.04, topY + 0.115, dz], [dx + 0.05, topY + 0.165, dz], 0.002, chrome);
      s.ball([0.012, 0.012, 0.012], [dx, topY + 0.139, dz], s.material('#6f7d2a'), 10);
    } else if (a.lastDrink === 'highball') {
      tumbler(drink, 0.034, 0.14, '#e2c56a', 0.7);
      cubes(drink, topY + 0.08, 3);
      s.cylinder(0.026, 0.026, 0.005, [dx + 0.03, topY + 0.14, dz], s.material('#f1d23a', { emissive: '#f1d23a', emissiveIntensity: 0.2 }), 16).rotation.z = Math.PI / 2;
    } else if (a.lastDrink === 'tiki') {
      s.lathe([[0, 0], [0.03, 0], [0.024, 0.03], [0.042, 0.09], [0.046, 0.14]], tinted('#f0e6d8'), drink);
      s.lathe([[0, 0.005], [0.027, 0.005], [0.022, 0.03], [0.039, 0.09], [0.042, 0.125], [0, 0.125]], liquid('#e8632a'), drink);
      s.rod([dx + 0.01, topY + 0.1, dz], [dx + 0.05, topY + 0.21, dz - 0.02], 0.002, s.material('#d8c9a0'));
      s.mesh(new THREE.ConeGeometry(0.05, 0.025, 10), s.material('#e84a8a', { emissive: '#e84a8a', emissiveIntensity: 0.25 }), [dx + 0.05, topY + 0.215, dz - 0.02]).rotation.z = -0.35;
      s.ball([0.012, 0.012, 0.012], [dx - 0.02, topY + 0.135, dz + 0.01], s.material('#c2172c', { roughness: 0.2 }), 10);
    } else if (a.lastDrink === 'bloody-mary') {
      tumbler(drink, 0.036, 0.15, '#b3261c', 0.85);
      s.rod([dx - 0.01, topY + 0.02, dz], [dx + 0.035, topY + 0.24, dz - 0.01], 0.008, s.material('#8fb84a'));
      for (let i = 0; i < 3; i++) s.ball([0.02, 0.012, 0.012], [dx + 0.035 + (i - 1) * 0.02, topY + 0.25 + (i % 2) * 0.012, dz - 0.01], s.material('#5f9a35'), 8);
    } else if (a.lastDrink === 'spilled') {
      const fallen = s.mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.085, 14, 1, true), crystal, [dx, topY + 0.04, dz]);
      fallen.rotation.z = Math.PI / 2;
      fallen.rotation.y = 0.5;
      const pool = new THREE.Shape();
      for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2, r = 0.09 + Math.sin(t * 3 + random()) * 0.025 + random() * 0.015; if (i) pool.lineTo(Math.cos(t) * r * 1.5, Math.sin(t) * r); else pool.moveTo(Math.cos(t) * r * 1.5, Math.sin(t) * r); }
      const puddle = s.mesh(new THREE.ShapeGeometry(pool), new THREE.MeshStandardMaterial({ color: '#c47a22', roughness: 0.05, emissive: '#c47a22', emissiveIntensity: 0.2 }), [dx + 0.09, topY + 0.002, dz]);
      puddle.rotation.x = -Math.PI / 2;
      cubes([dx + 0.1, topY, dz + 0.03], topY + 0.012, 2);
    }
    const used = { one: 0, pair: 1, crowd: 4 + Math.floor(mood.density * 4) }[a.company];
    const tints = ['#e6f0f2', '#d9a441', '#7fa88f', '#c98a8a', '#8fb0c9'];
    for (let i = 0; i < used; i++) {
      const low = a.company === 'crowd' && i > 3;
      const at: P3 = a.company === 'pair' ? [dx + 0.09, topY, dz + 0.01] : low ? [-0.3 + random() * 0.6, lowY, 0.1 + random() * 0.06] : [[0.15, 0.13], [0.3, 0.1], [-0.1, 0.13], [0.2, 0.02]][i].concat() as unknown as P3;
      const spot: P3 = low || a.company === 'pair' ? at : [at[0] + (random() - 0.5) * 0.03, topY, (at as unknown as number[])[1] + (random() - 0.5) * 0.03];
      const tall = random() < 0.4;
      tumbler(spot, tall ? 0.032 : 0.04, tall ? 0.13 : 0.08, random() < 0.75 ? LIQUOR[Math.floor(random() * 3)] : null, random() * 0.35, a.company === 'crowd' ? tinted(tints[Math.floor(random() * tints.length)]) : crystal);
    }

    // Garnish and tools.
    const gx = 0.31, gz = 0.1;
    if (a.garnish === 'citrus') {
      s.box([0.16, 0.012, 0.11], [gx - 0.02, topY + 0.006, gz + 0.03], s.material('#a8763c'));
      s.ball([0.03, 0.026, 0.026], [gx - 0.05, topY + 0.036, gz + 0.03], s.material('#f1d23a', { roughness: 0.4 }), 12);
      s.ball([0.024, 0.022, 0.022], [gx + 0.01, topY + 0.032, gz + 0.05], s.material('#7fb83a', { roughness: 0.4 }), 12);
      s.cylinder(0.026, 0.026, 0.006, [gx + 0.02, topY + 0.016, gz], s.material('#f6e27a'), 14);
      s.rod([gx - 0.08, topY + 0.016, gz + 0.07], [gx + 0.03, topY + 0.016, gz + 0.075], 0.004, chrome);
    } else if (a.garnish === 'nuts') {
      s.lathe([[0, 0], [0.03, 0], [0.07, 0.04], [0.074, 0.045]], tinted('#d9a441'), [gx - 0.02, topY, gz + 0.03]);
      for (let i = 0; i < 18; i++) s.ball([0.012, 0.009, 0.01], [gx - 0.02 + (random() - 0.5) * 0.08, topY + 0.03 + random() * 0.015, gz + 0.03 + (random() - 0.5) * 0.08], s.material(['#8a5a2c', '#c9a46a', '#6b4020'][i % 3]), 6);
    } else if (a.garnish === 'shaker') {
      s.lathe([[0, 0], [0.036, 0], [0.044, 0.14], [0.04, 0.16], [0.022, 0.2], [0.022, 0.23], [0, 0.23]], chrome, [gx - 0.02, topY, gz + 0.03]);
      s.rod([gx - 0.1, topY + 0.008, gz + 0.09], [gx + 0.06, topY + 0.008, gz + 0.1], 0.003, chrome);
      s.ball([0.014, 0.004, 0.01], [gx + 0.065, topY + 0.008, gz + 0.1], chrome, 8);
    } else if (a.garnish === 'ashtray') {
      s.cylinder(0.055, 0.045, 0.022, [gx - 0.02, topY + 0.011, gz + 0.03], tinted('#b8691e'), 6);
      s.rod([gx - 0.05, topY + 0.026, gz + 0.03], [gx + 0.03, topY + 0.03, gz + 0.05], 0.004, s.material('#f2eee2'));
      s.ball([0.005, 0.005, 0.005], [gx - 0.05, topY + 0.026, gz + 0.03], s.material('#ff6a2a', { emissive: '#ff5a1a', emissiveIntensity: 1.5 }), 6);
    }

    // Bottles on the lower shelf: standing while there is stock, lying empty when there is not.
    const bottleTones = ['#2f4a22', '#5a3516', '#1d2a3a', '#d8dfe0', '#7a1f1f', '#3a5a4a'];
    const bottles = 2 + Math.round(a.stock * 4 + mood.density * 2);
    for (let i = 0; i < bottles; i++) {
      const x = -0.31 + i * (0.62 / Math.max(1, bottles - 1)) + (random() - 0.5) * 0.02, z = -0.08 + (i % 2) * 0.07 + (random() - 0.5) * 0.02;
      const tall = 0.24 + random() * 0.07, wide = 0.034 + random() * 0.01, tone = bottleTones[Math.floor(random() * bottleTones.length)];
      const empty = random() > a.stock * 1.4 + 0.15;
      const body = s.lathe([[0, 0], [wide, 0], [wide, tall * 0.6], [wide * 0.4, tall * 0.78], [wide * 0.36, tall], [0, tall]], tinted(tone), [x, lowY, z]);
      (body.material as THREE.MeshPhysicalMaterial).opacity = empty ? 0.4 : 0.9;
      const label = s.mesh(new THREE.CylinderGeometry(wide + 0.001, wide + 0.001, tall * 0.26, 14, 1, true), s.material(['#efe6cc', '#c23b2a', '#e2b23a', '#1d1d22'][Math.floor(random() * 4)]), [x, lowY + tall * 0.32, z]);
      const cap = s.cylinder(wide * 0.42, wide * 0.42, 0.02, [x, lowY + tall + 0.008, z], random() < 0.5 ? metal : s.material('#1c1b1a'), 10);
      if (empty && a.stock < 0.4) {
        const group = new THREE.Group();
        group.position.set(0.02 + random() * 0.26, lowY + wide, 0.04 + random() * 0.1);
        for (const part of [body, label, cap]) { part.position.set(0, part.position.y - lowY, 0); group.add(part); }
        cap.visible = false;
        group.rotation.set(0, (random() - 0.5) * 0.5, Math.PI / 2);
        const inner = new THREE.Group();
        s.root.add(inner);
        inner.add(group);
      }
    }

    return s.finish();
  },
});
