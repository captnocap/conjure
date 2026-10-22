import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];

/** A paper order chit: a header block and scribbled lines. */
function chitTexture(random: () => number, printed: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 192);
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(8, 8, 48, printed ? 10 : 4);
  ctx.strokeStyle = printed ? '#3a3a44' : '#27408a';
  ctx.lineWidth = printed ? 3 : 2.5;
  for (let y = 30; y < 180; y += printed ? 12 : 17) {
    if (random() < 0.15) continue;
    ctx.beginPath();
    ctx.moveTo(8, y);
    const end = 22 + random() * 34;
    if (printed) ctx.lineTo(end, y);
    else for (let x = 8; x < end; x += 5) ctx.lineTo(x, y + (random() - 0.5) * 7);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    lamps: choice('What kind of heat lamps hang over the pass?', {
      domes: 'Spun aluminium dome lamps on coiled cords, the diner classic.',
      copper: 'Polished copper bell shades on rods, a smart open kitchen.',
      strip: 'A long infrared strip heater bolted under the top shelf, pure canteen.',
      bulbs: 'Bare red heat bulbs in wire cages.',
    }),
    lit: noul('Are the heat lamps switched on?'),
    rail: score('How full is the ticket rail?', ['Bare: no orders at all', 'Two or three chits', 'A steady row', 'Jammed end to end and spilling off, deep in the weeds']),
    tickets: choice('What are the order chits like?', {
      printed: 'White thermal printer slips, curling.',
      dupes: 'Handwritten duplicate-pad chits in white, pink and yellow.',
      stained: 'Greasy, thumbed and sauce-spotted slips.',
    }),
    plates: choice('What is on the pass right now?', {
      bare: 'Nothing. Steel wiped down and shining.',
      one: 'A single finished plate waiting for hands.',
      row: 'A full row of plates just called, ready to run.',
      dying: 'Plates left far too long: sauce skinned over, food gone dull, nobody coming.',
      stacks: 'Only stacks of clean warm plates waiting to be filled.',
      family: 'One big steel pan of staff family meal with a stack of mismatched bowls.',
    }),
    dish: choice('If there is food, what is it?', {
      burger: 'Burgers and fries.',
      pasta: 'Twirled nests of pasta with red sauce.',
      steak: 'Steak with greens and a spoon of mash.',
      salad: 'Bright leafy salads.',
      dessert: 'Slices of cake with cream and a berry.',
      soup: 'Bowls of orange soup.',
    }),
    extra: choice('What else sits at the end of the pass?', {
      bell: 'Just the chrome call bell.',
      spike: 'The bell and a ticket spike stacked thick with finished orders.',
      printer: 'The bell and a ticket printer spitting a long tongue of paper.',
      bottles: 'The bell, squeeze bottles of sauce and a folded side towel.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.9, D = 0.56, TOP = 0.92, SHELF = 1.5, RAIL = 2.0;
    const steel = s.material('#c3c8c8', { metalness: 0.78, roughness: 0.32 });
    const steelDark = s.material('#8f9596', { metalness: 0.7, roughness: 0.45 });
    const dark = s.material('#202224', { roughness: 0.7 });
    const china = s.material('#f3f1ea', { roughness: 0.35 });
    const hot = a.lit;
    const glowTint = new THREE.Color().setHSL(mix(0.085, 0.035, mood.warmth), 1, 0.52);

    // Base: legs, a lower shelf and the pass counter.
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.box([0.045, RAIL, 0.045], [x * (W / 2 - 0.03), RAIL / 2, z * (D / 2 - 0.03)], steel);
      s.cylinder(0.03, 0.035, 0.03, [x * (W / 2 - 0.03), 0.015, z * (D / 2 - 0.03)], dark, 10);
    }
    s.box([W, 0.05, D + 0.12], [0, TOP - 0.025, 0], steel);
    s.box([W, 0.09, 0.02], [0, TOP - 0.075, D / 2 + 0.05], steelDark);
    s.box([W - 0.06, 0.025, D - 0.06], [0, 0.28, 0], steelDark);
    s.box([W - 0.06, 0.5, 0.012], [0, 0.6, -D / 2 + 0.03], steelDark);
    // Top shelf, overhead bar.
    s.box([W, 0.035, 0.26], [0, SHELF, -0.14], steel);
    s.box([W, 0.05, 0.02], [0, SHELF - 0.02, -0.015], steelDark);
    s.rod([-W / 2 + 0.03, RAIL - 0.02, 0], [W / 2 - 0.03, RAIL - 0.02, 0], 0.016, steel);
    for (const z of [-1, 1]) s.rod([-W / 2 + 0.03, RAIL - 0.02, z * (D / 2 - 0.03)], [W / 2 - 0.03, RAIL - 0.02, z * (D / 2 - 0.03)], 0.012, steel);

    // Heat lamps.
    const lampX = [-0.6, 0, 0.6];
    const bulb = new THREE.MeshStandardMaterial({ color: hot ? '#ffd7a0' : '#6a4a3c', emissive: hot ? glowTint : new THREE.Color('#000000'), emissiveIntensity: hot ? 2.2 : 0, roughness: 0.4 });
    const beam = new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const pool = new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: 0.5, depthWrite: false });
    const lampGroups: THREE.Group[] = [];
    if (a.lamps === 'strip') {
      s.box([W - 0.3, 0.07, 0.16], [0, SHELF - 0.06, 0.08], steelDark);
      s.box([W - 0.36, 0.02, 0.1], [0, SHELF - 0.1, 0.08], bulb).castShadow = false;
      for (const x of [-0.7, 0.7]) s.rod([x, SHELF, 0.08], [x, RAIL - 0.02, 0], 0.008, steel);
      if (hot) {
        const sheet = s.box([W - 0.36, SHELF - 0.12 - TOP, 0.3], [0, (SHELF - 0.1 + TOP) / 2, 0.04], beam);
        sheet.castShadow = sheet.receiveShadow = false;
      }
    } else {
      const shadeMat = a.lamps === 'copper' ? s.material('#c9753c', { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide }) : s.material(a.lamps === 'bulbs' ? '#3b3d3f' : '#d5d9d9', { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide });
      for (const x of lampX) {
        const g = new THREE.Group();
        const drop = a.lamps === 'copper' ? 0.42 : 0.4 + random() * 0.1;
        g.position.set(x, RAIL - 0.02, 0.09);
        const add = (mesh: THREE.Mesh) => { mesh.castShadow = true; g.add(mesh); return mesh; };
        if (a.lamps === 'domes') {
          // Coiled cord.
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= 40; i++) pts.push(new THREE.Vector3(Math.cos(i * 1.3) * 0.016, -i / 40 * (drop - 0.1), Math.sin(i * 1.3) * 0.016));
          add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.005, 5), dark));
        } else {
          const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, drop - 0.1, 6), a.lamps === 'copper' ? shadeMat : dark));
          rod.position.y = -(drop - 0.1) / 2;
        }
        const profile = a.lamps === 'copper'
          ? [[0.03, 0], [0.05, -0.04], [0.09, -0.15], [0.15, -0.22], [0.16, -0.23]]
          : a.lamps === 'bulbs' ? [[0.035, 0], [0.04, -0.06], [0.04, -0.07]] : [[0.035, 0], [0.06, -0.02], [0.13, -0.09], [0.17, -0.17], [0.175, -0.18]];
        const shade = add(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([px, py]) => new THREE.Vector2(px, py)), 24), shadeMat));
        shade.position.y = -(drop - 0.1);
        const shadeBottom = -(drop - 0.1) + profile[profile.length - 1][1];
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(a.lamps === 'bulbs' ? 0.06 : 0.05, 14, 10), bulb);
        lamp.position.y = a.lamps === 'bulbs' ? shadeBottom - 0.06 : shadeBottom + 0.05;
        g.add(lamp);
        if (a.lamps === 'bulbs') {
          const cage = add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 5), new THREE.MeshStandardMaterial({ color: '#9aa0a0', wireframe: true })));
          cage.position.y = shadeBottom - 0.065;
        }
        if (hot) {
          const bottom = RAIL - 0.02 + shadeBottom;
          const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, bottom - TOP, 20, 1, true), beam);
          cone.position.y = shadeBottom - (bottom - TOP) / 2;
          g.add(cone);
        }
        s.root.add(g);
        lampGroups.push(g);
      }
    }
    if (hot) for (const x of a.lamps === 'strip' ? [-0.55, 0, 0.55] : lampX) {
      const disc = s.cylinder(0.3, 0.3, 0.002, [x, TOP + 0.003, 0.1], pool, 24);
      disc.castShadow = disc.receiveShadow = false;
    }

    // Ticket rail and chits.
    const railY = SHELF + 0.02, railZ = D / 2 - 0.01;
    s.box([W - 0.1, 0.03, 0.022], [0, railY, railZ], s.material('#d9dddd', { metalness: 0.85, roughness: 0.2 }));
    const printed = a.tickets !== 'dupes';
    const textures = [0, 1, 2].map(() => chitTexture(random, printed));
    const paperTints = a.tickets === 'dupes' ? ['#ffffff', '#f6b8c6', '#f5e58a', '#ffffff'] : a.tickets === 'stained' ? ['#e9dcb8', '#d9c494', '#efe6cc'] : ['#ffffff', '#f6f4ee'];
    const chitMats = paperTints.flatMap((tint) => textures.map((map) => new THREE.MeshStandardMaterial({ map, color: tint, roughness: 0.9, side: THREE.DoubleSide })));
    const chitGeo = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0);
    const chits: { mesh: THREE.Mesh; lean: number; phase: number }[] = [];
    const count = a.rail < 0.08 ? 0 : Math.round(mix(1, 22, a.rail) + random() * 2);
    const slotW = (W - 0.2) / 22;
    const order = Array.from({ length: 22 }, (_u, i) => i).sort(() => random() - 0.5).slice(0, Math.min(count, 22)).sort((p, q) => p - q);
    const hang = (x: number, z: number) => {
      const mesh = new THREE.Mesh(chitGeo, chitMats[Math.floor(random() * chitMats.length)]);
      const len = printed ? mix(0.13, 0.34, random()) : mix(0.13, 0.17, random());
      mesh.scale.set(0.08, len, 1);
      mesh.position.set(x, railY + 0.005, z);
      const lean = 0.06 + random() * 0.18;
      mesh.rotation.set(lean, 0, (random() - 0.5) * 0.12);
      mesh.castShadow = true;
      s.root.add(mesh);
      chits.push({ mesh, lean, phase: random() * 6 });
    };
    // A clear rail fills from the left like a real one; a slammed rail is packed.
    (a.rail > 0.6 ? order : order.map((_v, i) => i)).forEach((slot) => hang(-W / 2 + 0.1 + slotW * (slot + 0.5) + (random() - 0.5) * 0.01, railZ + 0.013));
    if (a.rail > 0.8) {
      for (let i = 0; i < 6; i++) hang(-W / 2 + 0.15 + random() * (W - 0.3), railZ + 0.02);
      for (let i = 0; i < 5; i++) {
        const fallen = new THREE.Mesh(chitGeo, chitMats[Math.floor(random() * chitMats.length)]);
        fallen.scale.set(0.072, 0.18, 1);
        fallen.position.set((random() - 0.5) * W * 0.9, 0.004 + i * 0.001, D / 2 + 0.12 + random() * 0.25);
        fallen.rotation.set(-Math.PI / 2, 0, random() * 6);
        s.root.add(fallen);
      }
    }

    // Plates and food.
    const plateGeo = new THREE.LatheGeometry([[0, 0.006], [0.085, 0.006], [0.135, 0.024], [0.14, 0.026], [0.136, 0.018], [0.085, 0], [0, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
    const dead = a.plates === 'dying';
    const tone = (hex: string) => { const c = new THREE.Color(hex); if (dead) c.lerp(new THREE.Color('#6b5a44'), 0.55); return new THREE.MeshStandardMaterial({ color: c, roughness: dead ? 0.95 : 0.6 }); };
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: V3, scale: V3 = [1, 1, 1], rot: V3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.scale.set(...scale); mesh.rotation.set(...rot);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const blob = new THREE.IcosahedronGeometry(1, 1), round = new THREE.SphereGeometry(1, 14, 10), disc = new THREE.CylinderGeometry(1, 1, 1, 20);
    const serve = (x: number, z: number) => {
      const g = new THREE.Group();
      g.position.set(x, TOP, z);
      g.rotation.y = random() * 6;
      if (a.dish !== 'soup') part(g, plateGeo, china, [0, 0, 0]);
      if (a.dish === 'burger') {
        part(g, disc, tone('#c98a44'), [-0.03, 0.03, 0], [0.055, 0.02, 0.055]);
        part(g, disc, tone('#4a2a1a'), [-0.03, 0.05, 0], [0.058, 0.02, 0.058]);
        part(g, new THREE.BoxGeometry(0.11, 0.006, 0.11), tone('#f2b632'), [-0.03, 0.063, 0], [1, 1, 1], [0, 0.6, 0]);
        part(g, disc, tone('#4f9a3a'), [-0.03, 0.068, 0], [0.062, 0.006, 0.062]);
        part(g, round, tone('#c98a44'), [-0.03, 0.07, 0], [0.057, 0.04, 0.057]);
        const fries = tone('#e8b84a');
        for (let i = 0; i < 12; i++) part(g, new THREE.BoxGeometry(0.01, 0.01, 0.065), fries, [0.06 + (random() - 0.5) * 0.04, 0.025 + random() * 0.03, (random() - 0.5) * 0.08], [1, 1, 1], [(random() - 0.5) * 0.8, random() * 3, 0]);
      } else if (a.dish === 'pasta') {
        part(g, new THREE.TorusKnotGeometry(0.04, 0.011, 60, 5, 3, 7), tone('#ecd27a'), [0, 0.045, 0], [1, 1, 0.7], [Math.PI / 2, 0, 0]);
        part(g, new THREE.TorusKnotGeometry(0.03, 0.011, 60, 5, 2, 5), tone('#ecd27a'), [0, 0.065, 0], [1, 1, 0.7], [Math.PI / 2, 0, 1]);
        part(g, blob, tone('#c0321f'), [0, 0.085, 0], [0.035, 0.018, 0.035]);
        part(g, blob, tone('#3f8a35'), [0.01, 0.103, 0], [0.014, 0.006, 0.02]);
      } else if (a.dish === 'steak') {
        part(g, blob, tone('#5a2f1c'), [-0.02, 0.035, 0.02], [0.065, 0.02, 0.045]);
        for (let i = 0; i < 4; i++) part(g, new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), tone('#4f9a3a'), [0.04 + i * 0.012, 0.03, -0.02], [1, 1, 1], [Math.PI / 2, 0, 0.3]);
        part(g, round, tone('#f1e6c0'), [-0.03, 0.035, -0.06], [0.04, 0.025, 0.035]);
      } else if (a.dish === 'salad') {
        for (let i = 0; i < 12; i++) part(g, blob, tone(['#4f9a3a', '#7ab648', '#35702c', '#a9c95a'][i % 4]), [(random() - 0.5) * 0.12, 0.03 + random() * 0.045, (random() - 0.5) * 0.12], [0.035, 0.012, 0.03], [random() * 3, random() * 3, random()]);
        for (let i = 0; i < 4; i++) part(g, round, tone('#d6362a'), [(random() - 0.5) * 0.1, 0.07, (random() - 0.5) * 0.1], [0.014, 0.014, 0.014]);
      } else if (a.dish === 'dessert') {
        part(g, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12, 1, false, 0, 0.75), tone('#5a3423'), [-0.04, 0.05, -0.03]);
        part(g, new THREE.CylinderGeometry(0.1, 0.1, 0.012, 12, 1, false, 0, 0.75), tone('#f3ead6'), [-0.04, 0.05, -0.03]);
        part(g, round, tone('#fbf7ea'), [0.05, 0.035, 0.04], [0.03, 0.022, 0.03]);
        part(g, round, tone('#c4233a'), [0.05, 0.062, 0.04], [0.012, 0.012, 0.012]);
      } else {
        part(g, new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.1, 0.06], [0.105, 0.062]].map(([px, py]) => new THREE.Vector2(px, py)), 24), new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.35, side: THREE.DoubleSide }), [0, 0.0, 0]);
        part(g, disc, tone('#e2812a'), [0, 0.047, 0], [0.09, 0.004, 0.09]);
        part(g, blob, tone('#f6f0dc'), [0.01, 0.05, 0.01], [0.03, 0.003, 0.012], [0, 0.6, 0]);
      }
      s.root.add(g);
    };
    const stack = (x: number, z: number, n: number, y = TOP) => { for (let i = 0; i < n; i++) s.mesh(plateGeo, china, [x + (random() - 0.5) * 0.006, y + i * 0.012, z + (random() - 0.5) * 0.006]); };
    const rowX = [-0.66, -0.33, 0, 0.33];
    if (a.plates === 'one') serve(rowX[Math.floor(random() * 4)], 0.08);
    else if (a.plates === 'row' || a.plates === 'dying') {
      const keep = a.plates === 'dying' ? 2 + Math.floor(random() * 2) : 4;
      rowX.slice(0, keep).forEach((x) => serve(x + (random() - 0.5) * 0.04, 0.08 + (random() - 0.5) * 0.06));
    } else if (a.plates === 'stacks') {
      for (const x of rowX) stack(x, 0.06, 5 + Math.floor(random() * 9));
    } else if (a.plates === 'family') {
      const pan = s.material('#b5baba', { metalness: 0.75, roughness: 0.35 });
      s.box([0.54, 0.09, 0.34], [-0.42, TOP + 0.045, 0.05], pan);
      s.box([0.5, 0.02, 0.3], [-0.42, TOP + 0.085, 0.05], tone({ burger: '#a8622c', pasta: '#d9693a', steak: '#6b3f25', salad: '#5c9a3c', dessert: '#b9864a', soup: '#e2812a' }[a.dish]));
      for (let i = 0; i < 9; i++) s.ball([0.03, 0.015, 0.03], [-0.42 + (random() - 0.5) * 0.42, TOP + 0.097, 0.05 + (random() - 0.5) * 0.22], tone(['#e8c06a', '#c0321f', '#4f9a3a'][i % 3]), 8);
      s.rod([-0.3, TOP + 0.1, 0.1], [-0.12, TOP + 0.2, 0.26], 0.01, steel);
      const bowlTints = ['#f3f1ea', '#7fa8c9', '#f3f1ea', '#d9a05a', '#8fb58a', '#f3f1ea'];
      for (let i = 0; i < 6; i++) s.lathe([[0, 0], [0.05, 0], [0.085, 0.045], [0.088, 0.047]], s.material(bowlTints[i], { roughness: 0.4, side: THREE.DoubleSide }), [0.12 + (random() - 0.5) * 0.008, TOP + i * 0.022, 0.06]);
    }
    // Clean plates on the upper and lower shelves, by density.
    const spare = Math.round(mix(0, 4, mood.density));
    for (let i = 0; i < spare; i++) stack(-0.75 + i * 0.32, -0.05, 4 + Math.floor(random() * 10), 0.293);
    if (mood.density > 0.4) stack(0.72, -0.08, 3 + Math.floor(random() * 6), SHELF + 0.018);

    // End of the pass: bell and friends.
    const ex = 0.72;
    s.cylinder(0.055, 0.06, 0.012, [ex, TOP + 0.006, 0.12], dark, 20);
    s.ball([0.05, 0.036, 0.05], [ex, TOP + 0.014, 0.12], s.material('#e3e6e6', { metalness: 0.95, roughness: 0.12 }), 20);
    s.cylinder(0.008, 0.008, 0.02, [ex, TOP + 0.055, 0.12], dark, 8);
    if (a.extra === 'spike') {
      s.cylinder(0.045, 0.05, 0.012, [ex - 0.05, TOP + 0.006, -0.1], dark, 14);
      s.rod([ex - 0.05, TOP, -0.1], [ex - 0.05, TOP + 0.2, -0.1], 0.003, steel, 0.001);
      const done = 5 + Math.floor(mix(0, 20, a.rail));
      for (let i = 0; i < Math.min(done, 14); i++) {
        const slip = s.box([0.072, 0.004, 0.13], [ex - 0.05, TOP + 0.018 + i * 0.008, -0.1], chitMats[i % chitMats.length]);
        slip.rotation.y = random() * 3;
      }
    } else if (a.extra === 'printer') {
      s.box([0.15, 0.11, 0.19], [ex - 0.02, TOP + 0.055, -0.1], dark);
      const tongue = new THREE.Mesh(chitGeo, chitMats[0]);
      tongue.scale.set(0.072, mix(0.15, 0.7, a.rail), 1);
      tongue.position.set(ex - 0.02, TOP + 0.1, -0.0);
      tongue.rotation.x = 0.25;
      tongue.castShadow = true;
      s.root.add(tongue);
      chits.push({ mesh: tongue, lean: 0.25, phase: 1 });
    } else if (a.extra === 'bottles') {
      ['#d6362a', '#e8c531', '#f3f1ea', '#5a8f3a'].slice(0, 2 + Math.floor(random() * 3)).forEach((tint, i) => {
        const m = s.material(tint, { roughness: 0.5 });
        s.cylinder(0.026, 0.028, 0.14, [ex - 0.12 + i * 0.065, TOP + 0.07, -0.12], m, 12);
        s.cylinder(0.004, 0.02, 0.05, [ex - 0.12 + i * 0.065, TOP + 0.165, -0.12], m, 10);
      });
      s.box([0.2, 0.025, 0.12], [ex - 0.28, TOP + 0.0125, 0.16], s.material('#eef0ee', { roughness: 0.95 })).rotation.y = 0.2;
      s.box([0.2, 0.004, 0.02], [ex - 0.28, TOP + 0.027, 0.16], s.material('#3c6fb0')).rotation.y = 0.2;
    }

    // Wear: smears on the steel and sauce spots.
    for (let i = 0; i < Math.round(mood.wear * 10); i++) {
      const smear = s.cylinder(0.02 + random() * 0.04, 0.02 + random() * 0.04, 0.002, [(random() - 0.5) * (W - 0.2), TOP + 0.002, (random() - 0.3) * 0.4], s.material(['#6b3a1c', '#8a2a1a', '#4a4a3a'][i % 3], { roughness: 0.9 }), 9);
      smear.castShadow = false;
    }

    const sway = mix(0.01, 0.09, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const chit of chits) chit.mesh.rotation.x = chit.lean + Math.sin(time * 2.1 + chit.phase) * sway;
        lampGroups.forEach((g, i) => { g.rotation.z = Math.sin(time * 1.3 + i * 2) * sway * 0.35; });
        if (hot) bulb.emissiveIntensity = 2.2 + Math.sin(time * 9) * 0.08;
      },
    });
  },
});
