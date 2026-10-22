import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

function sheetTexture(kind: 'rota' | 'delivery' | 'drawing', random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f7f5ec';
  ctx.fillRect(0, 0, 192, 256);
  if (kind === 'rota') {
    ctx.fillStyle = '#2a2f3a'; ctx.fillRect(10, 10, 172, 22);
    const tints = ['#f2c14e', '#7fb7e0', '#e58a7a', '#9fd19a', '#f7f5ec', '#f7f5ec'];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 7; c++) {
      ctx.fillStyle = tints[Math.floor(random() * tints.length)];
      ctx.fillRect(34 + c * 21, 40 + r * 23, 19, 20);
    }
    ctx.fillStyle = '#2a2f3a';
    for (let r = 0; r < 9; r++) ctx.fillRect(10, 46 + r * 23, 18, 8);
    ctx.strokeStyle = '#c4201a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(34 + Math.floor(random() * 7) * 21 + 10, 40 + Math.floor(random() * 9) * 23 + 10, 16, 15, 0, 0, 7); ctx.stroke();
  } else if (kind === 'delivery') {
    ctx.fillStyle = '#f3c9d0'; ctx.fillRect(0, 0, 192, 256);
    ctx.fillStyle = '#2a2f3a'; ctx.fillRect(12, 12, 110, 16);
    ctx.strokeStyle = '#3a3d44'; ctx.lineWidth = 4;
    for (let y = 52; y < 244; y += 19) {
      ctx.beginPath(); ctx.moveTo(34, y); ctx.lineTo(70 + random() * 70, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(160, y); ctx.lineTo(178, y); ctx.stroke();
      if (random() < 0.7) { ctx.save(); ctx.strokeStyle = '#1f3f8f'; ctx.beginPath(); ctx.moveTo(12, y - 4); ctx.lineTo(18, y + 3); ctx.lineTo(28, y - 9); ctx.stroke(); ctx.restore(); }
    }
  } else {
    const crayon = ['#e2452f', '#2f7fd0', '#3fa04a', '#f2b632', '#8a4fc0'];
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.strokeStyle = '#f2b632'; ctx.beginPath(); ctx.arc(150, 44, 22, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#3fa04a'; ctx.beginPath(); ctx.moveTo(8, 226); for (let x = 8; x < 190; x += 10) ctx.lineTo(x, 226 + (random() - 0.5) * 12); ctx.stroke();
    [60, 112].forEach((x, i) => {
      ctx.strokeStyle = crayon[Math.floor(random() * crayon.length)];
      const h = i ? 60 : 90;
      ctx.beginPath(); ctx.arc(x, 220 - h - 18, 16, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 220 - h); ctx.lineTo(x, 190); ctx.lineTo(x - 14, 220); ctx.moveTo(x, 190); ctx.lineTo(x + 14, 220); ctx.moveTo(x - 20, 220 - h + 22); ctx.lineTo(x + 20, 220 - h + 22); ctx.stroke();
    });
    // A tall white hat on the big figure.
    ctx.strokeStyle = '#7a7f88'; ctx.strokeRect(46, 70, 28, 26);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    door: choice('How does the door stand?', {
      shut: 'Shut tight and latched, humming to itself.',
      ajar: 'Ajar by a hand-width, cold fog curling out along the floor and a blade of light.',
      open: 'Swung wide, strip curtain swaying, shelves visible inside, light spilling out.',
      propped: 'Propped half open with a crate while a delivery goes in.',
    }),
    finish: choice('What are the wall and door made of?', {
      white: 'White embossed insulated panels, the standard box.',
      steel: 'Brushed stainless steel, expensive and cold.',
      galvanised: 'Dull grey galvanised sheet with rivets, a back-of-house workhorse.',
      cream: 'Old cream enamel with chrome trim, a butcher shop survivor.',
    }),
    temp: choice('What does the thermometer say?', {
      cold: 'A safe 3 degrees, green light, all well.',
      freezer: 'Minus 18: this is the freezer, and it bites.',
      failing: 'Climbing past 11 with a red alarm lamp on and meltwater creeping under the door.',
    }),
    frost: score('How much frost and ice has built up on it?', ['None, dry and clean', 'A rime along the seal', 'Thick frost and a few icicles', 'Crusted white, the door half iced shut']),
    paper: choice('What is taped to the door?', {
      none: 'Nothing.',
      rota: 'The weekly staff rota, colour-blocked, one shift ringed in red.',
      delivery: 'A pink delivery checklist, ticked down the margin.',
      sign: 'A stern sign: KEEP THIS DOOR SHUT.',
      drawing: "A child's crayon drawing of a parent in a tall white hat.",
    }),
    inside: choice('If you can see in, what is on the shelves?', {
      produce: 'Green crates of leaves, boxes of tomatoes and lemons.',
      dairy: 'Milk crates, tubs of cream, blocks of butter.',
      meat: 'Hanging sides and joints on hooks, red and white.',
      kegs: 'Steel beer kegs and crates of bottles.',
      bare: 'Almost nothing: one lonely box. A closed restaurant, or the night before the order lands.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 2.3, H = 2.45, T = 0.1, DEPTH = 0.95;
    const OW = 0.95, OH = 2.02, OX = -0.12;
    const tint = { white: '#eceee9', steel: '#c1c6c7', galvanised: '#a3a8a6', cream: '#e6dcc0' }[a.finish];
    const metal = a.finish === 'steel' ? 0.75 : a.finish === 'galvanised' ? 0.55 : 0.1;
    const panel = s.material(tint, { metalness: metal, roughness: a.finish === 'steel' ? 0.35 : 0.55 });
    const seam = s.material(new THREE.Color(tint).multiplyScalar(0.72), { roughness: 0.6 });
    const chrome = s.material('#d9dddd', { metalness: 0.9, roughness: 0.2 });
    const dark = s.material('#1d1f21', { roughness: 0.7 });
    const open = a.door !== 'shut';
    const angle = { shut: 0, ajar: 0.22 + random() * 0.1, open: 1.45 + random() * 0.3, propped: 0.95 + random() * 0.2 }[a.door];
    const cold = a.temp === 'failing' ? 0.15 : a.temp === 'freezer' ? 1 : 0.6;
    const frost = Math.min(1, a.frost + (a.temp === 'freezer' ? 0.15 : 0));
    const left = OX - OW / 2, right = OX + OW / 2;

    // Panel wall around the opening.
    s.box([left + W / 2, H, T], [(left - W / 2) / 2, H / 2, 0], panel);
    s.box([W / 2 - right, H, T], [(right + W / 2) / 2, H / 2, 0], panel);
    s.box([OW, H - OH, T], [OX, (H + OH) / 2, 0], panel);
    for (let x = -W / 2 + 0.575; x < W / 2 - 0.1; x += 0.575) if (x < left - 0.08 || x > right + 0.08) s.box([0.012, H, 0.006], [x, H / 2, T / 2 + 0.002], seam);
    s.box([W, 0.05, T + 0.03], [0, H - 0.025, 0], seam);
    s.box([W, 0.09, T + 0.03], [0, 0.045, 0], a.finish === 'cream' ? chrome : seam);
    if (a.finish === 'galvanised') for (let x = -W / 2 + 0.08; x < W / 2; x += 0.19) for (const y of [0.2, H - 0.15]) if (x < left - 0.05 || x > right + 0.05) s.cylinder(0.012, 0.012, 0.008, [x, y, T / 2 + 0.003], chrome, 8).rotation.x = Math.PI / 2;
    // The box behind: a stub of the cooler.
    const inner = new THREE.MeshStandardMaterial({ color: '#dfe9ee', roughness: 0.6, emissive: '#bfe3f5', emissiveIntensity: open ? mix(0.25, 0.6, cold) : 0.05 });
    s.box([T, H, DEPTH], [-W / 2 + T / 2, H / 2, -DEPTH / 2 - T / 2], panel);
    s.box([T, H, DEPTH], [W / 2 - T / 2, H / 2, -DEPTH / 2 - T / 2], panel);
    s.box([W, H, T], [0, H / 2, -DEPTH - T / 2], panel);
    s.box([W, T, DEPTH + T], [0, H - T / 2, -DEPTH / 2 - T / 2], panel);
    s.box([W - 2 * T, 0.04, DEPTH], [0, 0.02, -DEPTH / 2 - T / 2], inner);
    s.box([W - 2 * T, H - T - 0.04, 0.02], [0, (H - T) / 2 + 0.02, -DEPTH - 0.01 + 0.02], inner).castShadow = false;
    // Door frame with a heater-strip gasket.
    s.box([0.06, OH + 0.06, 0.03], [left - 0.03, OH / 2 + 0.03, T / 2 + 0.01], seam);
    s.box([0.06, OH + 0.06, 0.03], [right + 0.03, OH / 2 + 0.03, T / 2 + 0.01], seam);
    s.box([OW + 0.12, 0.06, 0.03], [OX, OH + 0.03, T / 2 + 0.01], seam);
    s.box([OW, 0.02, T + 0.06], [OX, 0.01, 0.02], chrome);

    // Shelves and stock, seen through the opening.
    const shelfZ = -DEPTH + 0.2;
    const wireMat = s.material('#aab0b0', { metalness: 0.7, roughness: 0.4 });
    if (a.inside !== 'meat') for (const y of [0.45, 1.0, 1.55]) s.box([1.5, 0.025, 0.4], [OX, y, shelfZ], wireMat);
    for (const x of [OX - 0.74, OX + 0.74]) s.box([0.03, 1.95, 0.03], [x, 0.98, shelfZ + 0.18], wireMat);
    const stock = (size: V3, at: V3, colour: string) => s.box(size, at, s.material(colour, { roughness: 0.8 })).rotation.y = (random() - 0.5) * 0.15;
    if (a.inside === 'produce') {
      for (const y of [0.46, 1.01, 1.56]) for (let i = 0; i < 3; i++) {
        if (random() < 0.15) continue;
        const x = OX - 0.5 + i * 0.5;
        const crate = random() < 0.5;
        stock([0.42, 0.24, 0.32], [x, y + 0.133, shelfZ], crate ? '#3f8a4a' : '#b9935e');
        const fill = ['#5aa544', '#d6362a', '#f2d532', '#7ab648', '#e8872b'][Math.floor(random() * 5)];
        for (let k = 0; k < 7; k++) s.ball([0.06, 0.05, 0.06], [x + (random() - 0.5) * 0.3, y + 0.27, shelfZ + (random() - 0.5) * 0.2], s.material(fill, { roughness: 0.7 }), 8);
      }
    } else if (a.inside === 'dairy') {
      for (const y of [0.46, 1.01, 1.56]) for (let i = 0; i < 3; i++) {
        const x = OX - 0.5 + i * 0.5;
        const kind = Math.floor(random() * 3);
        if (kind === 0) { stock([0.36, 0.3, 0.33], [x, y + 0.163, shelfZ], ['#2f62b0', '#c8452f', '#3f8a4a'][Math.floor(random() * 3)]); for (let k = 0; k < 4; k++) s.cylinder(0.04, 0.05, 0.08, [x - 0.1 + (k % 2) * 0.2, y + 0.35, shelfZ - 0.07 + Math.floor(k / 2) * 0.14], s.material('#fbfbf6'), 10); }
        else if (kind === 1) for (let k = 0; k < 2; k++) s.cylinder(0.11, 0.1, 0.2, [x - 0.11 + k * 0.23, y + 0.113, shelfZ], s.material('#f6f3e6', { roughness: 0.5 }), 16);
        else for (let k = 0; k < 4; k++) stock([0.2, 0.07, 0.12], [x + (random() - 0.5) * 0.04, y + 0.05 + k * 0.072, shelfZ], '#f2d98a');
      }
    } else if (a.inside === 'meat') {
      s.rod([OX - 0.74, 1.95, shelfZ + 0.1], [OX + 0.74, 1.95, shelfZ + 0.1], 0.018, chrome);
      for (let i = 0; i < 4; i++) {
        const x = OX - 0.54 + i * 0.36 + (random() - 0.5) * 0.05;
        const len = mix(0.55, 1.1, random());
        s.rod([x, 1.95, shelfZ + 0.1], [x, 1.8, shelfZ + 0.1], 0.008, chrome);
        s.ball([0.13, len / 2, 0.09], [x, 1.8 - len / 2, shelfZ + 0.1], s.material('#a32a2c', { roughness: 0.6 }), 12);
        s.ball([0.132, len / 3.2, 0.06], [x + 0.01, 1.82 - len / 2, shelfZ + 0.15], s.material('#f0dfcf', { roughness: 0.7 }), 10);
      }
    } else if (a.inside === 'kegs') {
      const keg = s.material('#b9bfc0', { metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 3; i++) { const x = OX - 0.48 + i * 0.48; s.cylinder(0.19, 0.19, 0.5, [x, 0.29, shelfZ + 0.15], keg, 20); for (const y of [0.16, 0.42]) s.ring(0.192, 0.012, [x, y, shelfZ + 0.15], keg).rotation.x = Math.PI / 2; }
      for (let i = 0; i < 3; i++) { const x = OX - 0.5 + i * 0.5; stock([0.4, 0.26, 0.3], [x, 1.14, shelfZ], ['#c8452f', '#3f8a4a', '#e8b23c'][i]); for (let k = 0; k < 6; k++) s.cylinder(0.012, 0.03, 0.1, [x - 0.12 + (k % 3) * 0.12, 1.31, shelfZ - 0.06 + Math.floor(k / 3) * 0.12], s.material('#5a3a1c'), 8); }
    } else stock([0.4, 0.25, 0.3], [OX + 0.3, 1.14, shelfZ], '#b9935e');
    // Evaporator fan unit under the ceiling.
    s.box([0.8, 0.22, 0.3], [OX, H - T - 0.13, -DEPTH + 0.2], wireMat);

    // The door itself, hinged on the left.
    const DW = OW + 0.09, DH = OH + 0.05, DT = 0.11;
    const door = new THREE.Group();
    door.position.set(left - 0.045, 0.02, T / 2 + 0.025);
    door.rotation.y = -angle;
    s.root.add(door);
    const on = (geometry: THREE.BufferGeometry, material: THREE.Material, at: V3, rot: V3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.rotation.set(...rot);
      mesh.castShadow = mesh.receiveShadow = true;
      door.add(mesh);
      return mesh;
    };
    on(new THREE.BoxGeometry(DW, DH, DT), panel, [DW / 2, DH / 2, DT / 2]);
    on(new THREE.BoxGeometry(DW - 0.05, DH - 0.05, 0.02), dark, [DW / 2, DH / 2, -0.008]);
    on(new THREE.BoxGeometry(DW - 0.12, 0.012, 0.006), seam, [DW / 2, DH * 0.62, DT + 0.002]);
    on(new THREE.BoxGeometry(DW - 0.12, 0.012, 0.006), seam, [DW / 2, DH * 0.33, DT + 0.002]);
    // Kick plate.
    const kick = s.material(a.finish === 'cream' ? '#c9cdcd' : '#8d9394', { metalness: 0.7, roughness: 0.5 });
    on(new THREE.BoxGeometry(DW - 0.04, 0.34, 0.008), kick, [DW / 2, 0.2, DT + 0.004]);
    for (let i = 0; i < 3; i++) for (let k = 0; k < 9; k++) on(new THREE.BoxGeometry(0.05, 0.008, 0.004), chrome, [0.1 + k * 0.105 + (i % 2) * 0.05, 0.1 + i * 0.1, DT + 0.01], [0, 0, i % 2 ? 0.7 : -0.7]);
    // Hinges.
    for (const y of [0.3, DH / 2, DH - 0.3]) {
      on(new THREE.BoxGeometry(0.18, 0.09, 0.02), chrome, [0.07, y, DT + 0.01]);
      on(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 10), chrome, [-0.01, y, DT + 0.005]);
    }
    // Lever latch.
    const ly = 1.08;
    on(new THREE.BoxGeometry(0.1, 0.22, 0.03), chrome, [DW - 0.08, ly, DT + 0.015]);
    on(new THREE.CylinderGeometry(0.02, 0.02, 0.09, 10), chrome, [DW - 0.08, ly, DT + 0.06], [Math.PI / 2, 0, 0]);
    const lever = on(new THREE.BoxGeometry(0.34, 0.045, 0.028), chrome, [DW - 0.2, ly + (open ? 0.04 : 0), DT + 0.1], [0, 0, open ? -0.35 : 0]);
    void lever;
    on(new THREE.SphereGeometry(0.03, 10, 8), dark, [DW - 0.37, ly + (open ? 0.1 : 0), DT + 0.1]);
    s.box([0.07, 0.14, 0.05], [right + 0.085, ly + 0.02, T / 2 + 0.03], chrome);
    // Paper on the door.
    if (a.paper !== 'none') {
      const py = 1.55 + (random() - 0.5) * 0.08, px = DW / 2 + (random() - 0.5) * 0.15, tilt = (random() - 0.5) * 0.12;
      if (a.paper === 'sign') {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#f2c81e'; ctx.fillRect(0, 0, 256, 128);
        ctx.strokeStyle = '#111'; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 244, 116);
        ctx.fillStyle = '#111'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center';
        ctx.fillText('KEEP THIS', 128, 54); ctx.fillText('DOOR SHUT', 128, 98);
        const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
        on(new THREE.PlaneGeometry(0.44, 0.22), new THREE.MeshStandardMaterial({ map, roughness: 0.7 }), [px, py, DT + 0.004], [0, 0, tilt * 0.3]);
      } else {
        on(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({ map: sheetTexture(a.paper, random), roughness: 0.9 }), [px, py, DT + 0.004], [0, 0, tilt]);
        for (const side of [-1, 1]) on(new THREE.BoxGeometry(0.06, 0.02, 0.002), s.material('#9fb8c8', { roughness: 0.7 }), [px + side * 0.12, py + 0.19, DT + 0.006], [0, 0, tilt + side * 0.5]);
      }
    }

    // Thermometer dial, light switch and pilot lamp on the latch side.
    const tx = right + 0.36, ty = 1.62;
    const dial = s.cylinder(0.085, 0.085, 0.03, [tx, ty, T / 2 + 0.015], chrome, 24);
    dial.rotation.x = Math.PI / 2;
    const face = s.cylinder(0.073, 0.073, 0.004, [tx, ty, T / 2 + 0.031], s.material('#fbfbf6', { roughness: 0.4 }), 24);
    face.rotation.x = Math.PI / 2;
    const needleAngle = { cold: 0.4, freezer: 1.7, failing: -0.9 }[a.temp];
    const needle = s.box([0.006, 0.062, 0.003], [tx - Math.sin(needleAngle) * 0.028, ty + Math.cos(needleAngle) * 0.028, T / 2 + 0.035], s.material('#c4201a'));
    needle.rotation.z = needleAngle;
    s.label({ cold: '3 C', freezer: '-18 C', failing: '11 C' }[a.temp], 0.2, 0.075, [tx, ty - 0.15, T / 2 + 0.004], a.temp === 'failing' ? '#ffffff' : '#1d1f21', a.temp === 'failing' ? '#c4201a' : '#f1efe4');
    s.box([0.09, 0.14, 0.04], [tx, 1.2, T / 2 + 0.02], s.material('#d9d9d2'));
    s.box([0.02, 0.04, 0.02], [tx, 1.2 + (open ? 0.01 : -0.01), T / 2 + 0.045], dark);
    const lampTint = a.temp === 'failing' ? '#ff2a1a' : '#39e06a';
    const lamp = new THREE.MeshStandardMaterial({ color: lampTint, emissive: lampTint, emissiveIntensity: 1.8, roughness: 0.4 });
    s.ball([0.03, 0.03, 0.02], [tx, 1.33, T / 2 + 0.01], lamp, 12);

    // Frost and icicles.
    const ice = new THREE.MeshStandardMaterial({ color: '#f6fbff', roughness: 0.9, emissive: '#cfe9f7', emissiveIntensity: 0.2 });
    const rime = Math.round(frost * 90);
    for (let i = 0; i < rime; i++) {
      const edge = Math.floor(random() * 3);
      const along = random();
      const size = mix(0.015, 0.02 + frost * 0.045, random());
      const at: V3 = edge === 0 ? [right + 0.03 + (random() - 0.5) * frost * 0.12, along * OH, T / 2 + 0.03] : edge === 1 ? [left + along * OW, OH + 0.03 + (random() - 0.3) * frost * 0.12, T / 2 + 0.03] : [left + along * OW, 0.04 + random() * frost * 0.25, T / 2 + 0.035];
      s.ball([size, size * mix(0.6, 1.2, random()), 0.012], at, ice, 7).castShadow = false;
    }
    if (frost > 0.4) for (let i = 0; i < Math.round(frost * 12); i++) {
      const len = mix(0.05, 0.3, random()) * frost;
      s.cylinder(0.016, 0.001, len, [(random() - 0.5) * (W - 0.1), H - 0.05 - len / 2, T / 2 + 0.03], ice, 6);
    }
    if (frost > 0.6 && !open) for (let i = 0; i < 12; i++) on(new THREE.SphereGeometry(1, 7, 5), ice, [random() * DW, random() * DH, DT]).scale.set(0.04 + random() * 0.1, 0.03 + random() * 0.06, 0.004);

    // Strip curtain, light spill and fog: see-through, so they are not measured as solid.
    const strips: THREE.Mesh[] = [];
    const stripMat = new THREE.MeshStandardMaterial({ color: '#d9efc9', transparent: true, opacity: 0.42, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const stripCount = 8;
    for (let i = 0; i < stripCount; i++) {
      if (random() < mood.wear * 0.3 || (a.door === 'propped' && i > 1 && i < 5)) continue;
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(OW / stripCount * 1.25, OH - 0.08 - random() * mood.wear * 0.5).translate(0, -(OH - 0.08) / 2, 0), stripMat);
      strip.position.set(left + (i + 0.5) * OW / stripCount, OH - 0.02, -T / 2 - 0.01 - (i % 2) * 0.012);
      strip.rotation.y = (random() - 0.5) * 0.3;
      s.root.add(strip);
      strips.push(strip);
    }
    s.box([OW, 0.04, 0.03], [OX, OH - 0.02, -T / 2 - 0.015], chrome);
    const puffs: { mesh: THREE.Mesh; x: number; phase: number; speed: number }[] = [];
    if (open) {
      const reach = a.door === 'ajar' ? 0.25 : 1;
      const spill = new THREE.Shape();
      const hingeOut = Math.min(0.9, Math.tan(Math.min(angle, 1.2)) * 0.6);
      spill.moveTo(right, -T / 2); spill.lineTo(right + 0.5, -1.5); spill.lineTo(right - OW * reach - hingeOut * reach, -1.5); spill.lineTo(right - OW * reach, -T / 2);
      const glow = s.mesh(new THREE.ShapeGeometry(spill), new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }), [0, 0.004, 0]);
      glow.rotation.x = -Math.PI / 2;
      glow.castShadow = glow.receiveShadow = false;
      const fogMat = new THREE.MeshStandardMaterial({ color: '#f2fbff', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
      const fogGeo = new THREE.SphereGeometry(1, 10, 8);
      const n = Math.round(mix(0, 16, cold) * (a.door === 'ajar' ? 0.7 : 1));
      for (let i = 0; i < n; i++) {
        const mesh = new THREE.Mesh(fogGeo, fogMat);
        s.root.add(mesh);
        puffs.push({ mesh, x: right - random() * OW * Math.max(reach, 0.3), phase: random(), speed: mix(0.06, 0.16, random()) });
      }
    }
    if (a.temp === 'failing') {
      const water = new THREE.MeshStandardMaterial({ color: '#8fa9b5', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6, depthWrite: false });
      for (let i = 0; i < 4; i++) s.cylinder(0.2 + random() * 0.25, 0.2 + random() * 0.25, 0.004, [OX + (random() - 0.5) * 0.7, 0.003, 0.25 + random() * 0.4], water, 16).castShadow = false;
    }
    // The prop.
    if (a.door === 'propped') {
      const cx = door.position.x + Math.cos(angle) * (DW - 0.25) + Math.sin(angle) * 0.3, cz = door.position.z + Math.sin(angle) * (DW - 0.25) - Math.cos(angle) * 0.3 + 0.38;
      const crateTint = mood.cheer > 0.5 ? '#c8452f' : '#2f62b0';
      const crate = s.box([0.34, 0.28, 0.34], [cx, 0.14, cz], s.material(crateTint, { roughness: 0.6 }));
      crate.rotation.y = -angle;
      for (let k = 0; k < 2; k++) s.box([0.35, 0.03, 0.35], [cx, 0.09 + k * 0.1, cz], dark).rotation.y = -angle;
      for (let i = 0; i < 3; i++) stock([0.4, 0.22, 0.3], [right + 0.5 + (random() - 0.5) * 0.06, 0.11 + i * 0.22, 0.45], '#b9935e');
    }

    const setFog = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * puff.speed * mix(0.5, 1.5, mood.energy)) % 1;
        const size = mix(0.1, 0.34, t);
        puff.mesh.scale.set(size * 1.3, size * 0.55, size);
        puff.mesh.position.set(puff.x + Math.sin(t * 4 + puff.phase * 8) * 0.12, 0.06 + size * 0.3, T / 2 + t * 1.25);
      }
    };
    setFog(0);
    const sway = mix(0.02, 0.14, mood.energy) * (open ? 1 : 0.15);
    return s.finish({
      update: (_dt, time) => {
        setFog(time);
        strips.forEach((strip, i) => { strip.rotation.x = Math.sin(time * 1.6 + i * 1.3) * sway; });
        if (a.temp === 'failing') lamp.emissiveIntensity = Math.sin(time * 6) > 0 ? 2.4 : 0.3;
      },
    });
  },
});
