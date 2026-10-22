import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';

const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export default defineThing({
  questions: {
    blanket: choice('What is the main blanket?', {
      patchwork: 'A patchwork quilt in faded squares, borrowed from a bed.',
      tartan: 'A red tartan picnic rug.',
      floral: 'A flowery bedsheet, thin enough to glow.',
      white: 'A plain white sheet lit from inside like a paper lantern.',
      army: 'A scratchy olive army blanket.',
    }),
    state: choice('How is the fort holding up?', {
      proud: 'Just finished: taut, square and proud.',
      sagging: 'Lived in for days: the roof sags deep and the pegs are slipping.',
      collapsed: 'One chair has gone over and that side has slumped to the floor.',
    }),
    sign: choice('What does the hand-drawn sign say, if there is one?', {
      'keep-out': 'KEEP OUT in angry red crayon.',
      'no-grown-ups': 'NO GROWN UPS.',
      password: 'PASSWORD? with a question mark.',
      club: 'SECRET CLUB HQ.',
      skull: 'Just a wobbly skull and crossbones.',
      none: 'There is no sign.',
    }),
    entrance: choice('What can be seen at the entrance?', {
      torch: 'A torch lying on the floor, pointing in.',
      feet: 'A pair of feet in striped socks sticking out.',
      teddy: 'A teddy bear posted as guard.',
      supplies: 'A stack of comics, a biscuit tin and a cup.',
      empty: 'Nothing; whoever built it has gone.',
    }),
    light: choice('What light is there inside?', {
      torch: 'Warm yellow torchlight.',
      fairy: 'A string of coloured fairy lights along the front.',
      blue: 'A cold bluish glow, like a screen or a night light.',
      dark: 'None; it is dark inside.',
    }),
    floor: choice('What is it built on?', {
      rug: 'A patterned living-room rug.',
      cushions: 'Sofa cushions dragged onto the floor.',
      lawn: 'A groundsheet on the lawn, shoes left outside.',
      bare: 'The bare floor.',
    }),
    throwOver: noul('Is a second, smaller blanket thrown over the top?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const tex = (size: number, draw: (g: CanvasRenderingContext2D, size: number) => void) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      draw(canvas.getContext('2d')!, size);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };
    const fabrics = {
      patchwork: () => tex(256, (g) => {
        const tones = ['#c9584a', '#e2b866', '#6f9a8a', '#d9cdb0', '#5f7fa8', '#b87a9a', '#8aa55a', '#e8e0cf'];
        for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { g.fillStyle = pick(tones); g.fillRect(x * 32, y * 32, 32, 32); if (random() > 0.6) { g.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 4; k++) g.fillRect(x * 32 + k * 8, y * 32, 3, 32); } }
        g.strokeStyle = 'rgba(250,245,230,0.8)'; g.lineWidth = 2; g.setLineDash([4, 3]);
        for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 256); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke(); }
      }),
      tartan: () => tex(256, (g) => {
        g.fillStyle = '#b8322b'; g.fillRect(0, 0, 256, 256);
        for (const [at, w, c] of [[20, 28, 'rgba(20,60,40,0.6)'], [84, 10, 'rgba(15,20,40,0.7)'], [148, 28, 'rgba(20,60,40,0.6)'], [212, 6, 'rgba(240,220,120,0.8)']] as const) { g.fillStyle = c; g.fillRect(at, 0, w, 256); g.fillRect(0, at, 256, w); }
      }),
      floral: () => tex(256, (g) => {
        g.fillStyle = '#f3e6dc'; g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 46; i++) { const x = random() * 256, y = random() * 256, c = pick(['#d9627a', '#e89ab0', '#7f9fd0', '#e2b84a']); g.fillStyle = c; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.257) * 7, y + Math.sin(p * 1.257) * 7, 5, 0, 7); g.fill(); } g.fillStyle = '#f6e9a0'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
        for (let i = 0; i < 30; i++) { g.fillStyle = '#7fa66a'; g.beginPath(); g.ellipse(random() * 256, random() * 256, 6, 3, random() * 3, 0, 7); g.fill(); }
      }),
      white: () => tex(128, (g) => { g.fillStyle = '#f7f3e8'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(190,180,160,0.5)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(random() * 128, 0); g.lineTo(random() * 128, 128); g.stroke(); } }),
      army: () => tex(128, (g) => { g.fillStyle = '#6b7048'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#c9c39a'; g.fillRect(0, 14, 128, 6); g.fillRect(0, 26, 128, 3); g.fillStyle = 'rgba(40,45,25,0.25)'; for (let i = 0; i < 200; i++) g.fillRect(random() * 128, random() * 128, 2, 2); }),
    };
    const glowColour = { torch: '#ffcf7a', fairy: '#ffd9a0', blue: '#9fc4ff', dark: '#000000' }[a.light];
    const lit = a.light !== 'dark';
    const translucent = a.blanket === 'white' || a.blanket === 'floral';
    const fabric = (map: THREE.Texture, glow: number) => new THREE.MeshStandardMaterial({ map, roughness: 1, side: THREE.DoubleSide, emissive: lit ? glowColour : '#000000', emissiveMap: map, emissiveIntensity: lit ? glow : 0 });

    const sagDepth = a.state === 'sagging' ? mix(0.26, 0.4, mood.wear) : a.state === 'collapsed' ? 0.2 : 0.07;
    const slumpSide = random() > 0.5 ? 1 : -1;
    const zf = 0.47, zr = -0.55, half = 1.22, top = 1.13, bar = 0.99;
    const phase = [random() * 6, random() * 6, random() * 6];
    const roof = (x: number, z: number) => {
      let h: number;
      if (z >= zr) { const t = (z - zr) / (zf - zr); h = mix(top, bar, t) - sagDepth * Math.sin(Math.PI * t) * (1 - smooth(0.3, 0.75, Math.abs(x)) * 0.8); }
      else h = top * Math.pow(clamp01(1 - (zr - z) / 0.62), 0.85);
      const ax = Math.abs(x);
      const side = ax <= 0.62 ? 1 : ax <= 1.06 ? mix(1, 0.5, (ax - 0.62) / 0.44) : mix(0.5, 0, clamp01((ax - 1.06) / 0.14));
      const slump = a.state === 'collapsed' ? mix(1, 0.32, smooth(0.0, 0.8, x * slumpSide)) : 1;
      const y = h * side * slump;
      return Math.max(0.012, y + Math.sin(x * 9 + phase[0]) * Math.sin(z * 7 + phase[1]) * 0.018 * clamp01(y * 4));
    };
    const sheet = (u0: number, u1: number, v0: number, v1: number, lift: number, material: THREE.Material, valance: boolean) => {
      const nu = 44, nv = 34;
      const geo = new THREE.PlaneGeometry(1, 1, nu, nv);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = mix(u0, u1, pos.getX(i) + 0.5), v = mix(v0, v1, pos.getY(i) + 0.5);
        if (v <= zf || !valance) pos.setXYZ(i, x, roof(x, Math.min(v, zf)) + lift, Math.min(v, zf));
        else {
          const drop = mix(0.1 + 0.03 * Math.sin(x * 11 + phase[2]), 1.2, smooth(0.3, 0.6, Math.abs(x))) * (v - zf) / (v1 - zf);
          pos.setXYZ(i, x, Math.max(0.012, roof(x, zf) - drop) + lift, zf + 0.015 + (v - zf) * 0.1);
        }
      }
      geo.computeVertexNormals();
      return s.mesh(geo, material);
    };
    const main = sheet(-half, half, -1.2, zf + 0.3, 0, fabric(fabrics[a.blanket](), translucent ? 0.45 : 0.12), true);
    void main;
    if (a.throwOver) {
      const other = pick((['patchwork', 'tartan', 'army', 'floral'] as const).filter((k) => k !== a.blanket));
      const off = (random() - 0.5) * 0.5;
      sheet(-0.6 + off, 0.6 + off, -0.85 + random() * 0.2, 0.1 + random() * 0.2, 0.022, fabric(fabrics[other](), 0.05), false);
    }

    // The furniture underneath.
    const wood = s.material(pick(['#8a5a34', '#a8743f', '#6b4428', '#d9cdb0']), { roughness: 0.6 });
    const chair = (x: number, z: number, facing: number, fallen: boolean) => {
      const g = new THREE.Group();
      const add = (size: [number, number, number], at: [number, number, number]) => { const m = s.box(size, at, wood); g.add(m); return m; };
      add([0.44, 0.04, 0.42], [0.22, 0.45, 0]);
      for (const [lx, lz] of [[0.03, -0.18], [0.03, 0.18], [0.41, -0.18], [0.41, 0.18]]) add([0.04, lx < 0.1 ? 0.97 : 0.45, 0.04], [lx, lx < 0.1 ? 0.485 : 0.225, lz]);
      for (const y of [0.62, 0.76, 0.92]) add([0.025, 0.07, 0.36], [0.03, y, 0]);
      g.position.set(x, 0, z); g.scale.x = facing;
      if (fallen) { g.rotation.x = 1.5; g.position.y = 0.2; g.position.z += 0.1; g.position.x += facing * 0.12; }
      s.root.add(g);
    };
    for (const sx of [-1, 1]) chair(sx * 0.62, 0.45, sx, a.state === 'collapsed' && sx === slumpSide);
    const pole = s.material('#c9a56a', { roughness: 0.7 });
    if (a.state === 'collapsed') s.rod([-slumpSide * 0.66, bar - 0.01, zf - 0.02], [slumpSide * 0.7, 0.2, zf + 0.06], 0.014, pole);
    else s.rod([-0.72, bar - 0.012, zf - 0.02], [0.72, bar - 0.012, zf - 0.02], 0.014, pole);
    const airer = s.material('#eef0ee', { roughness: 0.5 });
    const airTop = (sx: number) => roof(sx * 0.45, zr) - 0.03;
    for (const sx of [-1, 1]) { s.rod([sx * 0.45, 0, -0.27], [sx * 0.45, airTop(sx), zr], 0.012, airer); s.rod([sx * 0.45, 0, -0.84], [sx * 0.45, airTop(sx), zr], 0.012, airer); }
    for (const t of [0.35, 0.65, 1]) s.rod([-0.45, airTop(-1) * t, mix(-0.27, zr, t)], [0.45, airTop(1) * t, mix(-0.27, zr, t)], 0.008, airer);

    // Pegs holding it together; fewer and more crooked as it ages.
    const pegTints = ['#e2412f', '#2f86d6', '#f4c62c', '#3aa66a', '#d1b07a'];
    const pegCount = Math.round(mix(7, 3, a.state === 'proud' ? 0 : 0.8));
    for (let i = 0; i < pegCount; i++) {
      const x = mix(-0.66, 0.66, (i + 0.5) / pegCount) + (random() - 0.5) * 0.08;
      const y = roof(x, zf);
      if (y < 0.5) continue;
      const peg = s.box([0.02, 0.085, 0.024], [x, y - 0.012, zf + 0.012], s.material(pegTints[i % pegTints.length], { roughness: 0.5 }));
      peg.rotation.z = (random() - 0.5) * (a.state === 'proud' ? 0.2 : 0.9);
    }

    // Inside: a glowing back wall of light, and a pool of it spilling out of the door.
    if (lit) {
      const glow = tex(128, (g) => { const grad = g.createRadialGradient(64, 80, 4, 64, 80, 70); grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.35, glowColour); grad.addColorStop(1, '#3a2a1a'); g.fillStyle = grad; g.fillRect(0, 0, 128, 128); });
      const wall = s.mesh(new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshStandardMaterial({ map: glow, emissive: '#ffffff', emissiveMap: glow, emissiveIntensity: mix(0.7, 1.2, mood.cheer), roughness: 1 }), [0, 0.42, -0.2]);
      if (a.state === 'collapsed') { wall.scale.set(0.5, 0.65, 1); wall.position.set(-slumpSide * 0.32, 0.28, -0.2); }
      wall.castShadow = false;
      const spill = s.mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: glowColour, emissive: glowColour, emissiveIntensity: 0.55, roughness: 1 }), [0, 0.016, 0.42]);
      spill.rotation.x = -Math.PI / 2; spill.scale.set(0.3, 0.45, 1); spill.castShadow = false;
    } else {
      const back = s.mesh(new THREE.PlaneGeometry(1.1, 0.8), s.material('#2a2622', { roughness: 1 }), [0, 0.42, -0.2]);
      if (a.state === 'collapsed') { back.scale.set(0.5, 0.65, 1); back.position.set(-slumpSide * 0.32, 0.28, -0.2); }
    }
    const bulbs: THREE.Mesh[] = [];
    if (a.light === 'fairy') {
      const hues = ['#ff5a4a', '#ffd24a', '#5ad27a', '#5aa8ff', '#ff8ad0'];
      for (let i = 0; i < 13; i++) {
        const x = mix(-0.6, 0.6, i / 12), y = roof(x, zf) - 0.07 - Math.sin(i / 12 * Math.PI * 3) * 0.03;
        if (y < 0.3) continue;
        bulbs.push(s.ball([0.022, 0.028, 0.022], [x, y, zf + 0.04], new THREE.MeshStandardMaterial({ color: hues[i % 5], emissive: hues[i % 5], emissiveIntensity: 1.2 }), 8));
      }
    }

    // Who or what is at the door.
    const dark = s.material('#24262a');
    if (a.entrance === 'torch') {
      const body = s.cylinder(0.028, 0.028, 0.2, [0.16, 0.035, 0.62], s.material(pick(['#d8352f', '#2f6fd0', '#f0c12e'])), 12); body.rotation.set(Math.PI / 2, 0, 0.5);
      const head = s.cylinder(0.042, 0.03, 0.06, [0.1, 0.035, 0.51], dark, 12); head.rotation.set(Math.PI / 2, 0, 0.5);
      const lens = s.cylinder(0.038, 0.038, 0.008, [0.085, 0.035, 0.483], new THREE.MeshStandardMaterial({ color: '#fff6d0', emissive: '#fff0b0', emissiveIntensity: lit ? 1.5 : 0 }), 12); lens.rotation.set(Math.PI / 2, 0, 0.5);
    } else if (a.entrance === 'feet') {
      const pyjama = s.material(pick(['#7fa6d8', '#e8a0b0', '#9fcf9a']), { roughness: 1 });
      for (const sx of [-1, 1]) {
        const x = sx * 0.09 + 0.05, turn = sx * 0.2 + (random() - 0.5) * 0.2;
        s.rod([x, 0.06, 0.2], [x + turn * 0.3, 0.06, 0.7], 0.05, pyjama);
        const canvasTex = tex(32, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fbfaf5' : '#e2412f'; g.fillRect(0, i * 4, 32, 4); } });
        const sock = s.ball([0.05, 0.1, 0.055], [x + turn * 0.33, 0.1, 0.74], new THREE.MeshStandardMaterial({ map: canvasTex, roughness: 1 }), 12);
        sock.rotation.z = turn; sock.rotation.x = -0.2;
      }
    } else if (a.entrance === 'teddy') {
      const fur = s.material('#b9853f', { roughness: 1 }), g = new THREE.Group();
      const part = (size: [number, number, number], at: [number, number, number], m: THREE.Material = fur) => { const b = s.ball(size, at, m, 12); g.add(b); return b; };
      part([0.1, 0.12, 0.09], [0, 0.12, 0]); part([0.085, 0.08, 0.08], [0, 0.3, 0.01]); part([0.035, 0.03, 0.035], [0, 0.285, 0.08], s.material('#e3c690'));
      for (const sx of [-1, 1]) { part([0.032, 0.032, 0.02], [sx * 0.065, 0.37, 0]); part([0.035, 0.075, 0.035], [sx * 0.115, 0.15, 0.03]).rotation.z = sx * 0.5; part([0.042, 0.042, 0.085], [sx * 0.06, 0.04, 0.1]); part([0.012, 0.012, 0.012], [sx * 0.03, 0.315, 0.075], dark); }
      g.position.set(-0.32, 0, 0.66); g.rotation.y = 0.3; s.root.add(g);
    } else if (a.entrance === 'supplies') {
      const covers = ['#e2412f', '#f4c62c', '#2f86d6', '#3aa66a', '#f08a2a'];
      for (let i = 0; i < 5; i++) s.box([0.2, 0.012, 0.27], [-0.28 + (random() - 0.5) * 0.03, 0.012 + i * 0.013, 0.66], s.material(covers[i])).rotation.y = (random() - 0.5) * 0.5;
      s.cylinder(0.1, 0.1, 0.09, [0.2, 0.05, 0.68], s.material('#2f5aa8', { metalness: 0.5, roughness: 0.3 }), 18);
      s.cylinder(0.103, 0.103, 0.02, [0.3, 0.012, 0.82], s.material('#c9a23a', { metalness: 0.5, roughness: 0.3 }), 18);
      s.cylinder(0.04, 0.03, 0.09, [0.0, 0.045, 0.78], s.material('#f08a2a', { roughness: 0.4 }), 12);
    }

    // The sign: crayon on a torn sheet of paper, pegged to the front chair.
    if (a.sign !== 'none') {
      const words = { 'keep-out': ['KEEP', 'OUT'], 'no-grown-ups': ['NO', 'GROWN', 'UPS'], password: ['PASS', 'WORD?'], club: ['SECRET', 'CLUB HQ'], skull: [] }[a.sign] as string[];
      const paper = tex(256, (g) => {
        g.fillStyle = '#f6f1e2'; g.fillRect(0, 0, 256, 256);
        const ink = a.sign === 'keep-out' ? '#d0261f' : pick(['#2a4fb0', '#d0261f', '#2f8a4a', '#7a3fb0']);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (!words.length) {
          g.strokeStyle = '#26262a'; g.lineWidth = 9; g.lineCap = 'round';
          g.beginPath(); g.moveTo(40, 60); g.lineTo(216, 210); g.moveTo(216, 60); g.lineTo(40, 210); g.stroke();
          g.fillStyle = '#f6f1e2'; g.beginPath(); g.ellipse(128, 112, 62, 58, 0, 0, 7); g.fill(); g.stroke(); g.fillRect(98, 150, 60, 40); g.strokeRect(98, 150, 60, 40);
          g.fillStyle = '#26262a'; g.beginPath(); g.ellipse(104, 110, 15, 18, 0, 0, 7); g.ellipse(152, 110, 15, 18, 0, 0, 7); g.fill();
          for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(98 + i * 15, 150); g.lineTo(98 + i * 15, 190); g.stroke(); }
        } else words.forEach((word, row) => {
          const size = Math.min(220 / words.length, 330 / word.length);
          [...word].forEach((letter, i) => {
            g.save();
            g.translate(128 + (i - (word.length - 1) / 2) * size * 0.62, 128 + (row - (words.length - 1) / 2) * (210 / words.length) + (random() - 0.5) * 10);
            g.rotate((random() - 0.5) * 0.3);
            g.font = `bold ${size * (0.85 + random() * 0.25)}px sans-serif`; g.fillStyle = ink; g.fillText(letter, 0, 0);
            g.restore();
          });
        });
        g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 2; g.lineTo(128 + Math.cos(t) * (116 + random() * 6) * Math.min(1.08, 1 / Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t)))) * 0.92, 128 + Math.sin(t) * (116 + random() * 6) * Math.min(1.08, 1 / Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t)))) * 0.92); } g.stroke();
      });
      const side = a.state === 'collapsed' ? -slumpSide : pick([-1, 1]);
      const sign = s.mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshStandardMaterial({ map: paper, roughness: 1, side: THREE.DoubleSide }), [side * 0.84, 0.62, zf + 0.23]);
      sign.rotation.set(-0.08, side * -0.15, (random() - 0.5) * 0.25);
      s.box([0.02, 0.08, 0.024], [side * 0.84, 0.82, zf + 0.235], s.material(pick(pegTints)));
    }

    // What it stands on.
    if (a.floor === 'rug') {
      const rug = tex(256, (g) => {
        const [c1, c2, c3] = pick([['#8a2f2a', '#d9c08a', '#2f3f5a'], ['#2f5a6a', '#e3d3b0', '#b8562f'], ['#6a4a7a', '#e8dcc8', '#c9a23a']] as const);
        g.fillStyle = c1; g.fillRect(0, 0, 256, 256); g.strokeStyle = c2; g.lineWidth = 10; g.strokeRect(16, 16, 224, 224); g.lineWidth = 4; g.strokeStyle = c3; g.strokeRect(34, 34, 188, 188);
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { g.fillStyle = (i + j) % 2 ? c2 : c3; g.beginPath(); g.moveTo(64 + i * 32, 52 + j * 32); g.lineTo(76 + i * 32, 64 + j * 32); g.lineTo(64 + i * 32, 76 + j * 32); g.lineTo(52 + i * 32, 64 + j * 32); g.fill(); }
      });
      s.box([3.0, 0.014, 2.5], [0, 0.007, -0.15], new THREE.MeshStandardMaterial({ map: rug, roughness: 1 })).rotation.y = (random() - 0.5) * 0.12;
    } else if (a.floor === 'cushions') {
      const tone = s.material(pick(['#8a7a5a', '#6f7f8a', '#a85a4a', '#7a8a5a']), { roughness: 1 });
      for (const [x, z, r] of [[-0.35, 0.95, 0.2], [0.5, 1.0, -0.3], [-1.45, -0.2, 1.4], [1.45, -0.5, 1.7]]) { const c = s.mesh(new THREE.BoxGeometry(0.6, 0.14, 0.55, 4, 2, 4), tone, [x, 0.07, z]); c.rotation.y = r + (random() - 0.5) * 0.3; c.scale.y = 0.9 + random() * 0.3; }
    } else if (a.floor === 'lawn') {
      s.box([2.7, 0.01, 2.3], [0, 0.005, -0.2], s.material('#3f6f8f', { roughness: 0.6 })).rotation.y = (random() - 0.5) * 0.1;
      for (let i = 0; i < 2; i++) { const shoe = s.ball([0.05, 0.04, 0.1], [0.55 + i * 0.14, 0.04, 1.0 + random() * 0.1], s.material('#e2412f'), 10); shoe.rotation.y = (random() - 0.5) * 1.2; }
    }

    const flicker = mix(0.2, 1, mood.energy);
    return s.finish({
      update: (_dt, time) => { bulbs.forEach((bulb, i) => { (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9 + 0.6 * Math.sin(time * 3 * flicker + i * 1.7); }); },
    });
  },
});
