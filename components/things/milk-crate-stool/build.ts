import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type G = CanvasRenderingContext2D;

export default defineThing({
  questions: {
    colour: choice('What colour is the milk crate?', {
      red: 'Dairy red.',
      blue: 'Royal blue.',
      green: 'Bottle green.',
      black: 'Black, a bakery crate.',
      orange: 'Safety orange.',
      yellow: 'Sun-bleached yellow.',
    }),
    seat: choice('What is the seat padded with?', {
      cardboard: 'A couple of flattened cardboard boxes, folded.',
      carpet: 'A square of leftover carpet over cardboard.',
      foam: 'A foam pad wrapped in silver duct tape.',
      bare: 'Nothing: bare plastic lattice.',
    }),
    radio: choice('What is playing beside the crate?', {
      none: 'Nothing: just the street.',
      transistor: 'A small silver transistor radio with its aerial up.',
      boombox: 'A twin-speaker boombox with a cassette door.',
      tv: 'A tiny portable television with rabbit ears.',
    }),
    drink: choice('What is there to drink?', {
      none: 'Nothing.',
      coffee: 'A blue-and-white paper deli coffee cup with a lid.',
      foam: 'A white foam cup, bitten around the rim.',
      bag: 'A bottle in a twisted brown paper bag.',
      thermos: 'A steel thermos with a red cup for a lid.',
    }),
    paper: choice('What is there to read?', {
      none: 'Nothing.',
      tabloid: 'A tabloid with one enormous headline.',
      numbers: 'A page of lottery numbers and race results circled in red pen.',
      diario: 'A Spanish-language daily.',
      crossword: 'A crossword half finished, a pen on top.',
    }),
    sitter: choice('Where is the person who sits here?', {
      moment: 'Just stepped inside: the coffee is steaming and a cigarette burns in a tin.',
      sign: 'Gone for a few minutes, a cardboard BACK IN 5 sign propped against the crate.',
      night: 'Gone home: everything is piled on the crate under a plastic bag and a bungee cord.',
      gone: 'Gone for good: a candle, a bunch of flowers and a note where they used to sit.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const texture = (w: number, h: number, draw: (g: G) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };
    const text = (g: G, value: string, x: number, y: number, size: number, colour: string, max?: number) => { g.fillStyle = colour; g.font = `bold ${size}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(value, x, y, max); };

    // The crate, upturned: open face down, base lattice as the seat.
    const hue = new THREE.Color({ red: '#c4262a', blue: '#2452b8', green: '#1f7a46', black: '#26272b', orange: '#ee6a1c', yellow: '#e8c22a' }[a.colour]);
    hue.lerp(new THREE.Color('#b9b3a6'), mood.wear * 0.2);
    const css = `#${hue.getHexString()}`, shade = `#${hue.clone().multiplyScalar(0.72).getHexString()}`;
    const CW = 0.34, CH = 0.28;
    const sideMap = texture(136, 112, (g) => {
      g.fillStyle = css; g.fillRect(0, 0, 136, 112);
      g.globalCompositeOperation = 'destination-out';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) g.fillRect(12 + c * 24, 26 + r * 22, 16, 15);
      g.fillRect(44, 92, 48, 11);
      g.globalCompositeOperation = 'source-over';
      text(g, 'ILLEGAL USE PROHIBITED', 68, 12, 9, shade, 124);
    });
    const topMap = texture(128, 128, (g) => {
      g.fillStyle = css; g.fillRect(0, 0, 128, 128);
      g.globalCompositeOperation = 'destination-out';
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) g.fillRect(10 + c * 19, 10 + r * 19, 13, 13);
    });
    const plastic = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 });
    const solid = new THREE.MeshStandardMaterial({ color: hue, roughness: 0.5 });
    const crate = new Sculpture(context);
    for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2;
      const wall = crate.mesh(new THREE.PlaneGeometry(CW, CH), plastic(sideMap), [Math.sin(t) * CW / 2, CH / 2, Math.cos(t) * CW / 2]);
      wall.rotation.y = t;
      const post = crate.box([0.028, CH, 0.028], [Math.sin(t + Math.PI / 4) * CW * 0.69, CH / 2, Math.cos(t + Math.PI / 4) * CW * 0.69], solid);
      post.rotation.y = 0;
      for (const y of [0.012, CH - 0.012]) crate.box([i % 2 ? 0.02 : CW, 0.024, i % 2 ? CW : 0.02], [Math.sin(t) * CW / 2, y, Math.cos(t) * CW / 2], solid);
    }
    crate.mesh(new THREE.PlaneGeometry(CW, CW), plastic(topMap), [0, CH - 0.002, 0]).rotation.x = -Math.PI / 2;
    crate.root.rotation.y = (random() - 0.5) * 0.5;
    s.root.add(crate.root);
    let seatY = CH;

    const card = s.material('#b98f58', { roughness: 0.95 });
    if (a.seat !== 'bare') {
      const layers = a.seat === 'cardboard' ? 3 : 1;
      for (let i = 0; i < layers; i++) {
        const sheet = s.box([0.4 - i * 0.02, 0.011, 0.34 - i * 0.015], [(random() - 0.5) * 0.02, seatY + 0.006, (random() - 0.5) * 0.02], card);
        sheet.rotation.y = crate.root.rotation.y + (random() - 0.5) * 0.25;
        seatY += 0.012;
      }
      if (a.seat === 'carpet') { s.box([0.37, 0.022, 0.33], [0, seatY + 0.011, 0], s.material(pick(['#7a2a34', '#2f5a4a', '#5a4a7a', '#8a6a3a']), { roughness: 1 })).rotation.y = crate.root.rotation.y; seatY += 0.022; }
      if (a.seat === 'foam') {
        s.box([0.35, 0.05, 0.32], [0, seatY + 0.025, 0], s.material('#e3d37a', { roughness: 1 })).rotation.y = crate.root.rotation.y;
        const tape = s.material('#a9adb0', { metalness: 0.5, roughness: 0.4 });
        for (const x of [-0.09, 0.07]) s.box([0.05, 0.054, 0.324], [x, seatY + 0.025, 0], tape).rotation.y = crate.root.rotation.y;
        seatY += 0.05;
      }
    }

    const night = a.sitter === 'night', gone = a.sitter === 'gone';
    const puffs: THREE.Mesh[] = [];
    const steamMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false });
    const steam = (x: number, y: number, z: number, n: number, size: number) => {
      for (let i = 0; i < n; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), steamMaterial);
        puff.userData = { x, y, z, phase: i / n + random() * 0.1 };
        s.root.add(puff);
        puffs.push(puff);
      }
    };

    // Something to read, on the seat (or yellowing on the ground once nobody sits here).
    if (a.paper !== 'none') {
      const page = texture(160, 200, (g) => {
        g.fillStyle = gone ? '#d9cfa8' : '#eeeade'; g.fillRect(0, 0, 160, 200);
        const ink = '#1b1b1e';
        const columns = (top: number) => { g.fillStyle = '#8a8880'; for (let c = 0; c < 3; c++) for (let y = top; y < 192; y += 6) g.fillRect(8 + c * 50, y, 42 - random() * 10, 2.5); };
        if (a.paper === 'tabloid') { g.fillStyle = '#c4162a'; g.fillRect(0, 0, 160, 26); text(g, 'DAILY POST', 80, 14, 18, '#ffffff'); const head = pick([['RENT', 'UP AGAIN'], ['HEAT', 'WAVE'], ['WE', 'WIN!'], ['BLACK', 'OUT'], ['SUBWAY', 'CHAOS']]); text(g, head[0], 80, 58, 44, ink, 150); text(g, head[1], 80, 100, 38, ink, 150); g.fillStyle = '#77756e'; g.fillRect(10, 126, 140, 66); }
        if (a.paper === 'diario') { text(g, 'EL DIARIO', 80, 16, 24, '#1b3f9c'); g.fillStyle = '#1b3f9c'; g.fillRect(6, 30, 148, 3); text(g, pick(['¡GANAMOS!', 'SUBE LA RENTA', 'LLEGA EL CALOR', 'FIESTA HOY']), 80, 56, 26, ink, 148); g.fillStyle = '#77756e'; g.fillRect(8, 76, 80, 60); columns(142); g.fillStyle = '#8a8880'; for (let y = 78; y < 136; y += 6) g.fillRect(96, y, 56, 2.5); }
        if (a.paper === 'numbers') { text(g, 'RESULTS', 80, 14, 20, ink); g.font = 'bold 13px monospace'; for (let r = 0; r < 11; r++) for (let c = 0; c < 5; c++) { g.fillStyle = ink; g.fillText(String(Math.floor(random() * 90) + 10), 20 + c * 30, 38 + r * 15); } g.strokeStyle = '#d0202a'; g.lineWidth = 2.5; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(20 + Math.floor(random() * 5) * 30, 38 + Math.floor(random() * 11) * 15, 13, 9, 0, 0, 7); g.stroke(); } }
        if (a.paper === 'crossword') { text(g, 'CROSSWORD', 80, 14, 18, ink); for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const black = random() < 0.22; g.fillStyle = black ? ink : '#ffffff'; g.fillRect(12 + c * 15, 30 + r * 15, 14, 14); if (!black && random() < 0.45) { g.fillStyle = '#1c3ea8'; g.font = 'bold 11px monospace'; g.fillText('ABCDEILNORST'[Math.floor(random() * 12)], 19 + c * 15, 38 + r * 15); } } columns(172); }
      });
      const onSeat = !gone && !night;
      const at: [number, number, number] = onSeat ? [0.02, seatY + 0.008, 0.01] : [-0.38, 0.008, 0.2];
      s.box([0.25, 0.014, 0.31], at, s.material('#e6e1d2', { roughness: 0.95 })).rotation.y = onSeat ? 0.35 : -0.5;
      const front = s.mesh(new THREE.PlaneGeometry(0.25, 0.31), new THREE.MeshStandardMaterial({ map: page, roughness: 0.95 }), [at[0], at[1] + 0.0075, at[2]]);
      front.rotation.set(-Math.PI / 2, 0, onSeat ? 0.35 : -0.5);
      if (a.paper === 'crossword' || a.paper === 'numbers') s.rod([at[0] + 0.05, at[1] + 0.014, at[2] + 0.06], [at[0] + 0.15, at[1] + 0.014, at[2] - 0.02], 0.005, s.material(a.paper === 'numbers' ? '#d0202a' : '#1c3ea8'));
    }

    // Something to drink.
    const cupAt: [number, number, number] = night ? [0.05, 0, 0] : [-0.3 + random() * 0.06, 0, 0.16 + random() * 0.08];
    if (a.drink !== 'none' && !night) {
      const [x, , z] = cupAt;
      if (a.drink === 'coffee') {
        const wrap = texture(128, 64, (g) => { g.fillStyle = '#2a5fb8'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#ffffff'; g.fillRect(0, 6, 128, 5); g.fillRect(0, 53, 128, 5); g.strokeStyle = '#f2c53a'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.strokeRect(4 + i * 16, 14, 9, 9); } text(g, 'HAPPY TO', 32, 34, 9, '#ffffff'); text(g, 'SERVE YOU', 32, 45, 9, '#ffffff'); text(g, 'HAPPY TO', 96, 34, 9, '#ffffff'); text(g, 'SERVE YOU', 96, 45, 9, '#ffffff'); });
        const cup = s.cylinder(0.043, 0.03, 0.11, [x, 0.055, z], new THREE.MeshStandardMaterial({ map: wrap, roughness: 0.7 }), 18);
        if (gone) { cup.rotation.z = Math.PI / 2; cup.position.y = 0.04; s.ball([0.09, 0.002, 0.06], [x + 0.11, 0.002, z], s.material('#4a3020', { roughness: 0.3 }), 12); }
        else s.cylinder(0.045, 0.045, 0.012, [x, 0.115, z], s.material('#f4f2ea'), 18);
      }
      if (a.drink === 'foam') { s.cylinder(0.042, 0.028, 0.1, [x, 0.05, z], s.material('#f6f5f0', { roughness: 0.9 }), 18); s.cylinder(0.038, 0.038, 0.004, [x, 0.092, z], s.material('#4a3020', { roughness: 0.2 }), 14); }
      if (a.drink === 'bag') {
        const bag = s.mesh(new THREE.IcosahedronGeometry(1, 1), s.material('#9a7448', { roughness: 1, flatShading: true }), [x, 0.1, z]);
        bag.scale.set(0.045, 0.1, 0.045);
        s.cylinder(0.032, 0.026, 0.05, [x, 0.215, z], s.material('#9a7448', { roughness: 1, flatShading: true }), 7);
        s.cylinder(0.012, 0.016, 0.06, [x, 0.26, z], s.material('#2f6a3a', { roughness: 0.15 }), 10);
      }
      if (a.drink === 'thermos') {
        s.cylinder(0.04, 0.04, 0.24, [x, 0.12, z], s.material('#b9bfc0', { metalness: 0.85, roughness: 0.3 }), 18);
        s.cylinder(0.042, 0.042, 0.02, [x, 0.07, z], s.material('#1f5a3a'), 18);
        if (a.sitter === 'moment') s.cylinder(0.04, 0.034, 0.05, [x + 0.11, 0.025, z + 0.04], s.material('#c4262a'), 16);
        else s.cylinder(0.043, 0.038, 0.06, [x, 0.27, z], s.material('#c4262a'), 16);
      }
      if (a.sitter === 'moment' && a.drink !== 'bag') steam(a.drink === 'thermos' ? x + 0.11 : x, a.drink === 'thermos' ? 0.06 : 0.13, a.drink === 'thermos' ? z + 0.04 : z, 4, 0.02);
    }

    // The radio or television, on the ground or on an upturned bucket when the corner is busy.
    let screen: THREE.MeshStandardMaterial | null = null;
    const bob = new THREE.Group();
    if (a.radio !== 'none') {
      const perch = mood.density > 0.5 && !night;
      const rx = night ? 0 : 0.46, ry = night ? seatY : perch ? 0.27 : 0, rz = night ? 0 : -0.04;
      if (perch) { s.cylinder(0.14, 0.12, 0.27, [rx, 0.135, rz], s.material(pick(['#f1efe6', '#e8782a', '#3a6fb5']), { roughness: 0.6 }), 18); s.ring(0.142, 0.008, [rx, 0.012, rz], s.material('#d9d7ce')).rotation.x = Math.PI / 2; }
      const set = new Sculpture(context);
      const chrome = set.material('#cfd4d6', { metalness: 0.85, roughness: 0.25 });
      const dark = set.material('#1c1d20');
      const on = a.sitter === 'moment' || a.sitter === 'sign';
      if (a.radio === 'transistor') {
        set.box([0.2, 0.125, 0.05], [0, 0.0625, 0], chrome);
        set.mesh(new THREE.PlaneGeometry(0.19, 0.115), new THREE.MeshStandardMaterial({ map: texture(128, 80, (g) => { g.fillStyle = '#c9ced0'; g.fillRect(0, 0, 128, 80); g.fillStyle = '#2a2c30'; for (let x = 0; x < 13; x++) for (let y = 0; y < 9; y++) g.fillRect(8 + x * 6, 22 + y * 6, 3, 3); g.fillStyle = '#f3e7b0'; g.fillRect(8, 6, 112, 11); g.fillStyle = '#c4162a'; g.fillRect(20 + random() * 80, 6, 2, 11); g.fillStyle = '#2a2c30'; g.beginPath(); g.arc(104, 50, 15, 0, 7); g.fill(); g.fillStyle = '#8a8d92'; g.beginPath(); g.arc(104, 50, 4, 0, 7); g.fill(); }), roughness: 0.4, metalness: 0.3 }), [0, 0.0625, 0.0255]);
        set.rod([0.09, 0.125, -0.01], [0.2, 0.42, -0.06], 0.003, chrome);
        set.ring(0.05, 0.004, [-0.03, 0.125, 0], dark, Math.PI);
      }
      if (a.radio === 'boombox') {
        set.box([0.46, 0.22, 0.11], [0, 0.11, 0], set.material(pick(['#2a2c30', '#b9bfc0', '#b3201c'])));
        set.mesh(new THREE.PlaneGeometry(0.45, 0.21), new THREE.MeshStandardMaterial({ map: texture(256, 120, (g) => { g.fillStyle = '#3a3d42'; g.fillRect(0, 0, 256, 120); for (const x of [52, 204]) { g.fillStyle = '#16171a'; g.beginPath(); g.arc(x, 68, 42, 0, 7); g.fill(); g.strokeStyle = '#c9ced0'; g.lineWidth = 4; g.beginPath(); g.arc(x, 68, 42, 0, 7); g.stroke(); g.fillStyle = '#5a5e64'; g.beginPath(); g.arc(x, 68, 15, 0, 7); g.fill(); } g.fillStyle = '#16171a'; g.fillRect(100, 48, 56, 40); g.fillStyle = '#d9d2b0'; g.fillRect(106, 56, 44, 16); g.fillStyle = '#f3e7b0'; g.fillRect(100, 10, 56, 12); g.fillStyle = '#c4162a'; g.fillRect(118, 10, 2, 12); g.fillStyle = '#c9ced0'; for (let i = 0; i < 5; i++) g.fillRect(102 + i * 11, 96, 8, 12); if (on) { g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(128, 34, 4, 0, 7); g.fill(); } }), roughness: 0.5 }), [0, 0.11, 0.056]);
        set.tube([[-0.19, 0.22, 0], [-0.19, 0.3, 0], [0.19, 0.3, 0], [0.19, 0.22, 0]], 0.008, dark);
        set.rod([0.2, 0.22, -0.03], [0.36, 0.5, -0.08], 0.003, chrome);
      }
      if (a.radio === 'tv') {
        set.box([0.26, 0.22, 0.24], [0, 0.11, 0], set.material(pick(['#e8e0c8', '#b3201c', '#2a2c30'])));
        const picture = texture(96, 80, (g) => { g.fillStyle = '#1a2a22'; g.fillRect(0, 0, 96, 80); if (on) { g.fillStyle = '#3f8a4a'; g.fillRect(0, 44, 96, 36); g.fillStyle = '#c9a56a'; g.beginPath(); g.moveTo(48, 40); g.lineTo(80, 62); g.lineTo(48, 80); g.lineTo(16, 62); g.fill(); g.fillStyle = '#f3f1ea'; for (const [x, y] of [[48, 44], [76, 62], [20, 62], [48, 60]]) g.fillRect(x - 2, y - 6, 4, 8); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${random() * 0.35})`; g.fillRect(random() * 96, random() * 80, 2, 1); } } });
        screen = new THREE.MeshStandardMaterial({ map: picture, emissive: on ? '#ffffff' : '#000000', emissiveMap: on ? picture : null, emissiveIntensity: 0.8, roughness: 0.2 });
        set.mesh(new THREE.PlaneGeometry(0.17, 0.15), screen, [-0.03, 0.115, 0.121]).castShadow = false;
        for (const y of [0.16, 0.1]) set.cylinder(0.014, 0.014, 0.012, [0.095, y, 0.124], dark, 12).rotation.x = Math.PI / 2;
        for (const x of [-1, 1]) set.rod([0, 0.22, -0.05], [x * 0.17, 0.5, -0.07], 0.003, chrome);
        set.ball([0.02, 0.012, 0.02], [0, 0.224, -0.05], dark, 10);
      }
      set.root.position.set(rx, ry, rz);
      set.root.rotation.y = night ? 0.2 : -0.35 + (random() - 0.5) * 0.2;
      bob.add(set.root);
      s.root.add(bob);
    }

    // Where the sitter is.
    if (a.sitter === 'moment') {
      const tx = 0.24, tz = 0.26;
      s.cylinder(0.036, 0.036, 0.045, [tx, 0.0225, tz], s.material('#b9bfc0', { metalness: 0.8, roughness: 0.35 }), 14);
      s.rod([tx - 0.03, 0.05, tz], [tx + 0.045, 0.058, tz + 0.02], 0.004, s.material('#f4f2ea'));
      s.ball([0.005, 0.005, 0.005], [tx + 0.047, 0.058, tz + 0.021], new THREE.MeshStandardMaterial({ color: '#ff5a1c', emissive: '#ff5a1c', emissiveIntensity: 2 }), 6);
      steam(tx + 0.047, 0.07, tz + 0.021, 3, 0.012);
    }
    if (a.sitter === 'sign') {
      const board = s.label(pick(['BACK IN 5', 'BACK IN 5 MIN', 'ASK INSIDE', 'RIGHT BACK']), 0.36, 0.2, [0.02, 0.105, CW / 2 + 0.07], '#17130f', '#b98f58');
      board.rotation.set(-0.3, crate.root.rotation.y * 0.5, (random() - 0.5) * 0.08);
    }
    if (night) {
      const bag = s.mesh(new THREE.IcosahedronGeometry(1, 1), s.material('#eeeeea', { roughness: 0.4, flatShading: true }), [0, seatY + 0.13, 0]);
      bag.scale.set(0.24, a.radio === 'none' ? 0.1 : 0.17, 0.2);
      const cord = s.material(pick(['#e8442a', '#2a9a4a', '#e8c22a']));
      for (const z of [-0.07, 0.08]) s.tube([[-0.19, 0.05, z], [-0.21, seatY + 0.1, z], [0, seatY + (a.radio === 'none' ? 0.24 : 0.31), z], [0.21, seatY + 0.1, z], [0.19, 0.05, z]], 0.006, cord);
    }
    if (gone) {
      const cx = 0.26, cz = 0.24;
      s.cylinder(0.031, 0.031, 0.2, [cx, 0.1, cz], new THREE.MeshStandardMaterial({ color: '#f4efe0', roughness: 0.3, emissive: '#ffb04a', emissiveIntensity: 0.35 }), 16);
      const flame = s.ball([0.01, 0.024, 0.01], [cx, 0.225, cz], new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffa01c', emissiveIntensity: 2.4 }), 8);
      flame.castShadow = false;
      puffs.push(flame);
      flame.userData = { flame: true };
      const wrap = s.mesh(new THREE.ConeGeometry(0.075, 0.34, 10, 1, true), s.material('#f1ede2', { side: THREE.DoubleSide }), [-0.02, seatY + 0.06, 0.02]);
      wrap.rotation.set(0, 0.4, Math.PI / 2 - 0.12);
      const blooms = Array.from({ length: 9 }, () => ({ at: [-0.19 + random() * 0.06, seatY + 0.06 + random() * 0.07, 0.07 + (random() - 0.5) * 0.12] as [number, number, number], size: 0.03 + random() * 0.012, color: pick(['#c4162a', '#f3f1ea', '#f2c53a', '#e83a8a']) }));
      s.scatter(new THREE.SphereGeometry(1, 9, 6), new THREE.MeshStandardMaterial({ roughness: 0.8 }), blooms);
      const note = s.label(pick(['WE MISS YOU', 'REST EASY PAPO', 'SIEMPRE AQUI', 'HIS SEAT']), 0.3, 0.12, [0, 0.14, CW / 2 + 0.012], '#1b1b1e', '#f6f1dc');
      note.rotation.set(0, crate.root.rotation.y, (random() - 0.5) * 0.1);
      note.position.x = Math.sin(crate.root.rotation.y) * (CW / 2 + 0.012);
      note.position.z = Math.cos(crate.root.rotation.y) * (CW / 2 + 0.012);
    }

    // Shells, butts and bottle caps by wear and density.
    const litter = Array.from({ length: Math.round(mood.wear * mix(10, 60, mood.density)) }, () => {
      const t = random() * 7, r = 0.24 + random() * 0.4;
      return { at: [Math.cos(t) * r, 0.003, Math.sin(t) * r * 0.8 + 0.08] as [number, number, number], size: 0.006 + random() * 0.007, color: pick(['#d9cfb0', '#2a2622', '#e8dcc0', '#c9773a', '#f1efe6']) };
    });
    if (litter.length) s.scatter(new THREE.BoxGeometry(1.6, 0.5, 0.8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), litter);

    const speed = mix(0.15, 0.6, mood.energy), beat = mix(2, 9, mood.energy);
    const playing = a.radio !== 'none' && (a.sitter === 'moment' || a.sitter === 'sign');
    const place = (time: number) => {
      for (const puff of puffs) {
        const d = puff.userData;
        if (d.flame) { puff.scale.set(0.01, 0.024 * (1 + Math.sin(time * beat * 2) * 0.2), 0.01); continue; }
        const t = (d.phase + time * speed) % 1;
        puff.position.set(d.x + Math.sin(t * 5 + d.phase * 20) * 0.025, d.y + t * 0.26, d.z);
        puff.scale.setScalar(0.6 + t * 1.5);
      }
    };
    place(0);
    return s.finish({
      update: (_dt, time) => {
        place(time);
        if (playing) bob.position.y = Math.abs(Math.sin(time * beat)) * 0.004 * mood.energy;
        if (screen && playing) screen.emissiveIntensity = 0.7 + Math.sin(time * 23) * 0.12;
      },
    });
  },
});
