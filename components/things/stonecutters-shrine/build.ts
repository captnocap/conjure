import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const SURNAMES = ['ROSSI', 'BERTI', 'MENCONI', 'VANELLI', 'TONELLI', 'DAZZI', 'LATTANZI', 'FRUGOLI', 'PUCCI', 'BIGINI', 'CORSI', 'GIANNI', 'ORSINI', 'BRIZZI', 'LAZZONI', 'FABBRI'];

export default defineThing({
  questions: {
    tradition: choice('Who or what is in the niche?', {
      madonna: 'A small Madonna in a blue mantle against a starry blue niche.',
      barbara: 'Saint Barbara in red with her tower, patron of everyone who works with explosives.',
      plaque: 'No saint: a secular bronze plaque with a crossed hammer and chisel and a red star.',
      spirit: 'A folk spirit: a lumpy stone idol with shell eyes and red thread wound round it.',
      photograph: 'An oval enamel photograph of one man in his Sunday suit.',
    }),
    form: choice('How is the shrine made?', {
      pillar: 'A proper wayside pillar: stepped base, shaft, arched niche and a gabled cap with an iron cross.',
      boulder: 'A niche hollowed straight into a rough offcut block, drill flutes still on its side.',
      house: 'A little stone house with a pitched roof and a wire grille door, on a stack of blocks.',
      stack: 'Three unmatched offcuts stacked dry, the top one hollowed out.',
    }),
    tended: score('Is it tended?', ['Forgotten: dead stems, fallen candles, cobwebs, moss', 'Visited now and then', 'Tended daily: fresh flowers, swept step, every lamp lit']),
    names: score('How many names are cut into it?', ['One name', 'A handful', 'A long list that has run onto a second plaque']),
    offerings: choice('What have people left?', {
      lamps: 'Red glass votive lamps, rows of them.',
      flowers: 'Plastic flowers in cut-down bottles and jam jars, a riot of them.',
      tools: 'A hard hat, a mallet and chisels, work gloves.',
      bread: 'A bottle of wine, a glass and a loaf, as if for a guest.',
      stones: 'A cairn of marble chips, one added by each visitor.',
      photos: 'Small framed photographs and a rosary.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tended = a.tended;
    const neglect = Math.min(1, (1 - tended) * 0.8 + mood.wear * 0.4);
    const textures: THREE.Texture[] = [];
    const stoneHex = new THREE.Color('#eceae3').lerp(new THREE.Color('#a9a89c'), neglect * 0.6);
    const stone = s.material(stoneHex, { roughness: 0.9 });
    const stoneRough = s.material(stoneHex.clone().multiplyScalar(0.9), { roughness: 1, flatShading: true });
    const stoneDark = s.material(stoneHex.clone().multiplyScalar(0.8), { roughness: 1 });
    const iron = s.material('#3a3c3e', { metalness: 0.5, roughness: 0.6 });
    const gold = s.material('#d9b03c', { metalness: 0.7, roughness: 0.35 });
    const flame = new THREE.MeshStandardMaterial({ color: '#ffd67a', emissive: '#ffae2e', emissiveIntensity: 2 });

    // ---- Body ------------------------------------------------------------------------------
    const W = 0.86, D = 0.56;
    let nicheY = 0.95; // bottom of the niche block
    const NH = 0.86;
    let plaqueAt: P3 = [0, 0.55, D / 2 + 0.006];
    let plaqueSize: [number, number] = [0.6, 0.5];
    if (a.form === 'pillar') {
      s.box([1.25, 0.14, 0.95], [0, 0.07, 0.08], stone);
      s.box([1.02, 0.12, 0.74], [0, 0.2, 0.02], stone);
      s.box([W - 0.1, 0.72, D - 0.08], [0, 0.62, 0], stone);
      s.box([W + 0.08, 0.07, D + 0.08], [0, 0.985, 0], stone);
      nicheY = 1.02;
      plaqueAt = [0, 0.62, (D - 0.08) / 2 + 0.006];
      plaqueSize = [0.6, 0.56];
    } else if (a.form === 'boulder') {
      const lump = s.mesh(new THREE.DodecahedronGeometry(0.6, 1), stoneRough, [-0.5, 0.3, -0.2]);
      lump.scale.set(0.9, 0.75, 0.9);
      const lump2 = s.mesh(new THREE.DodecahedronGeometry(0.5, 0), stoneRough, [0.45, 0.62, -0.32]);
      lump2.scale.set(0.9, 1.5, 0.6);
      s.box([1.3, 0.66, 0.7], [0.05, 0.33, -0.02], stoneRough);
      for (let i = 0; i < 7; i++) s.cylinder(0.035, 0.035, 0.64, [0.705, 0.33, -0.3 + i * 0.1], stoneDark, 8);
      nicheY = 0.66;
      plaqueAt = [0.05, 0.36, 0.336];
      plaqueSize = [0.7, 0.46];
    } else if (a.form === 'house') {
      s.box([1.1, 0.34, 0.8], [0.03, 0.17, 0], stoneRough).rotation.y = 0.06;
      s.box([0.95, 0.32, 0.7], [-0.02, 0.5, 0], stone).rotation.y = -0.05;
      s.box([0.9, 0.28, 0.64], [0, 0.8, 0], stoneRough);
      nicheY = 0.94;
      plaqueAt = [-0.02, 0.5, 0.36];
      plaqueSize = [0.7, 0.26];
    } else {
      const b1 = s.box([1.15, 0.5, 0.78], [0.04, 0.25, 0], stoneRough); b1.rotation.y = 0.09;
      const b2 = s.box([0.92, 0.42, 0.66], [-0.05, 0.71, 0.02], stone); b2.rotation.y = -0.07;
      for (let i = 0; i < 6; i++) s.cylinder(0.03, 0.03, 0.42, [0.41, 0.71, -0.26 + i * 0.1], stoneDark, 8);
      nicheY = 0.92;
      plaqueAt = [0.02, 0.25, 0.41];
      plaqueSize = [0.8, 0.38];
    }
    // Niche block: a solid back and a front frame with an arched opening.
    const nw = 0.54, n0 = 0.1, n1 = 0.5, fd = 0.26;
    const tint = { madonna: '#2f5aa8', barbara: '#8a2a22', plaque: '#3a3f3a', spirit: '#b98a3a', photograph: '#d9d2bc' }[a.tradition];
    s.box([W, NH, D - fd], [0, nicheY + NH / 2, -fd / 2], stone);
    const backPaint = s.material(new THREE.Color(tint).lerp(stoneHex, neglect * 0.5), { roughness: 0.9 });
    s.box([nw + 0.04, NH - 0.12, 0.012], [0, nicheY + NH / 2 - 0.02, D / 2 - fd + 0.007], backPaint);
    const frame = new THREE.Shape();
    frame.moveTo(-W / 2, 0); frame.lineTo(W / 2, 0); frame.lineTo(W / 2, NH); frame.lineTo(-W / 2, NH); frame.closePath();
    const arch = new THREE.Path();
    arch.moveTo(-nw / 2, n0); arch.lineTo(nw / 2, n0); arch.lineTo(nw / 2, n1); arch.absarc(0, n1, nw / 2, 0, Math.PI, false); arch.lineTo(-nw / 2, n0);
    frame.holes.push(arch);
    s.mesh(new THREE.ExtrudeGeometry(frame, { depth: fd, bevelEnabled: false, curveSegments: 10 }), a.form === 'boulder' || a.form === 'stack' ? stoneRough : stone, [0, nicheY, D / 2 - fd]);
    const shelfY = nicheY + n0;
    const nz = D / 2 - fd / 2 + 0.05; // just forward of the middle of the niche
    if (a.tradition === 'madonna' && neglect < 0.8) {
      const stars: { at: P3; size: number }[] = [];
      for (let i = 0; i < 12; i++) stars.push({ at: [(random() - 0.5) * nw * 0.9, shelfY + 0.1 + random() * 0.55, D / 2 - fd + 0.016], size: 0.012 });
      s.scatter(new THREE.OctahedronGeometry(1, 0), gold, stars);
    }
    // Cap.
    const topY = nicheY + NH;
    let crossY = topY;
    if (a.form === 'pillar' || a.form === 'house') {
      const roof = new THREE.Shape();
      const over = a.form === 'house' ? 0.09 : 0.06, rise = a.form === 'house' ? 0.3 : 0.26;
      roof.moveTo(-W / 2 - over, 0); roof.lineTo(W / 2 + over, 0); roof.lineTo(W / 2 + over, 0.06); roof.lineTo(0, rise); roof.lineTo(-W / 2 - over, 0.06); roof.closePath();
      const roofMat = a.form === 'house' ? s.material(new THREE.Color('#a04e32').lerp(stoneHex, neglect * 0.3), { roughness: 0.9 }) : stone;
      s.mesh(new THREE.ExtrudeGeometry(roof, { depth: D + over * 2, bevelEnabled: false }), roofMat, [0, topY, -D / 2 - over]);
      if (a.form === 'house') for (let i = 0; i < 6; i++) for (const side of [-1, 1]) {
        const tile = s.box([0.012, 0.012, D + over * 2 + 0.02], [side * (0.08 + i * 0.09), topY + rise - 0.01 - (0.08 + i * 0.09) * ((rise - 0.06) / (W / 2 + over)), 0], stoneDark);
        void tile;
      }
      crossY = topY + rise;
    } else {
      const cap = s.mesh(new THREE.DodecahedronGeometry(0.4, 1), stoneRough, [0, topY + 0.04, 0]);
      cap.scale.set(1.1, 0.3, 0.75);
      crossY = topY + 0.16;
    }
    if (a.tradition !== 'plaque' && a.tradition !== 'spirit') {
      const cross = new THREE.Group();
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), iron), bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), iron);
      upright.position.y = 0.17; bar.position.y = 0.24;
      cross.add(upright, bar);
      cross.traverse((n) => { n.castShadow = true; });
      cross.position.set(0, crossY - 0.02, 0);
      cross.rotation.z = neglect > 0.6 ? 0.3 * (random() < 0.5 ? -1 : 1) : 0;
      s.root.add(cross);
    } else if (a.tradition === 'plaque') {
      const star = s.mesh(new THREE.OctahedronGeometry(0.09, 0), s.material('#c22a20', { roughness: 0.6 }), [0, crossY + 0.08, 0]);
      star.scale.z = 0.3;
    } else {
      // Ribbons tied to a stick for the spirit.
      s.rod([0.2, crossY - 0.05, 0], [0.26, crossY + 0.5, 0], 0.012, s.material('#6b4a2d'));
      for (let i = 0; i < 4; i++) s.box([0.03, 0.22, 0.004], [0.27 + i * 0.012, crossY + 0.38 - i * 0.05, 0.01 * i], new THREE.MeshStandardMaterial({ color: ['#d42a1e', '#f2c21a', '#f4f0e6', '#d42a1e'][i], roughness: 0.9, side: THREE.DoubleSide })).rotation.z = 0.2 + i * 0.12;
    }
    if (a.form === 'house') {
      // Wire grille door, ajar.
      const door = new THREE.Group();
      const dAdd = (mesh: THREE.Mesh) => { door.add(mesh); return mesh; };
      for (let i = 0; i <= 5; i++) dAdd(s.box([0.008, 0.62, 0.008], [i * (nw / 5), 0.31, 0], iron));
      for (let i = 0; i <= 4; i++) dAdd(s.box([nw, 0.008, 0.008], [nw / 2, i * 0.155, 0], iron));
      door.position.set(-nw / 2, shelfY, D / 2 + 0.01);
      door.rotation.y = -mix(1.9, 0.9, tended);
      s.root.add(door);
    }

    // ---- The occupant ----------------------------------------------------------------------
    const fy = shelfY;
    if (a.tradition === 'madonna') {
      s.cylinder(0.09, 0.1, 0.04, [0, fy + 0.02, nz], stone, 12);
      s.cylinder(0.03, 0.1, 0.34, [0, fy + 0.21, nz], s.material('#f4f1e8'), 12);
      const mantle = s.mesh(new THREE.CylinderGeometry(0.055, 0.125, 0.4, 12, 1, true, Math.PI * 0.5, Math.PI * 1.25), s.material('#2f62c0', { side: THREE.DoubleSide }), [0, fy + 0.24, nz]);
      mantle.rotation.y = Math.PI * 0.375;
      s.ball([0.045, 0.052, 0.045], [0, fy + 0.43, nz + 0.005], s.material('#e6c2a0'), 12);
      s.ball([0.056, 0.06, 0.056], [0, fy + 0.44, nz - 0.012], s.material('#2f62c0'), 12);
      s.ring(0.075, 0.008, [0, fy + 0.45, nz - 0.03], gold);
      s.ball([0.02, 0.03, 0.02], [0, fy + 0.3, nz + 0.07], s.material('#e6c2a0'), 8);
    } else if (a.tradition === 'barbara') {
      s.cylinder(0.03, 0.095, 0.34, [-0.05, fy + 0.19, nz], s.material('#c22a20'), 12);
      const cloak = s.mesh(new THREE.CylinderGeometry(0.05, 0.115, 0.36, 12, 1, true, Math.PI * 0.5, Math.PI * 1.2), s.material('#d9b03c', { side: THREE.DoubleSide }), [-0.05, fy + 0.2, nz]);
      cloak.rotation.y = Math.PI * 0.4;
      s.ball([0.043, 0.05, 0.043], [-0.05, fy + 0.41, nz], s.material('#e6c2a0'), 12);
      s.cylinder(0.04, 0.034, 0.03, [-0.05, fy + 0.47, nz], gold, 8);
      // Her tower with three windows, and a palm.
      s.cylinder(0.055, 0.06, 0.3, [0.13, fy + 0.15, nz], s.material('#f1eee4'), 10);
      s.cylinder(0.068, 0.055, 0.04, [0.13, fy + 0.32, nz], s.material('#f1eee4'), 10);
      for (let i = 0; i < 3; i++) s.box([0.018, 0.045, 0.01], [0.105 + i * 0.025, fy + 0.2, nz + 0.056], iron);
      s.rod([-0.12, fy + 0.2, nz + 0.07], [-0.17, fy + 0.46, nz + 0.05], 0.008, s.material('#4f8a3a'));
    } else if (a.tradition === 'plaque') {
      const bronze = s.material(new THREE.Color('#8a6a3a').lerp(new THREE.Color('#4f8a78'), neglect * 0.7), { metalness: 0.6, roughness: 0.5 });
      s.box([0.4, 0.48, 0.02], [0, fy + 0.3, D / 2 - fd + 0.03], bronze);
      const relief = s.material('#c9a45a', { metalness: 0.7, roughness: 0.4 });
      s.rod([-0.12, fy + 0.16, D / 2 - fd + 0.05], [0.12, fy + 0.44, D / 2 - fd + 0.05], 0.014, relief);
      s.box([0.11, 0.06, 0.03], [0.12, fy + 0.44, D / 2 - fd + 0.05], relief).rotation.z = 0.86;
      s.rod([0.12, fy + 0.16, D / 2 - fd + 0.055], [-0.12, fy + 0.44, D / 2 - fd + 0.055], 0.011, relief, 0.02);
      const star = s.mesh(new THREE.OctahedronGeometry(0.035, 0), s.material('#c22a20'), [0, fy + 0.5, D / 2 - fd + 0.05]);
      star.scale.z = 0.3;
    } else if (a.tradition === 'spirit') {
      const idol = s.material('#8f8a7c', { roughness: 1, flatShading: true });
      s.mesh(new THREE.DodecahedronGeometry(0.12, 0), idol, [0, fy + 0.11, nz]).scale.set(1, 1.1, 0.9);
      s.mesh(new THREE.DodecahedronGeometry(0.1, 0), idol, [0, fy + 0.29, nz]);
      s.mesh(new THREE.DodecahedronGeometry(0.075, 0), idol, [0, fy + 0.43, nz + 0.01]);
      for (const x of [-0.03, 0.03]) {
        s.ball([0.018, 0.018, 0.01], [x, fy + 0.445, nz + 0.07], s.material('#f6f3ea', { roughness: 0.3 }), 8);
        s.ball([0.007, 0.007, 0.006], [x, fy + 0.445, nz + 0.08], iron, 6);
      }
      for (let i = 0; i < 3; i++) s.ring(0.1 - i * 0.004, 0.006, [0, fy + 0.27 + i * 0.018, nz], new THREE.MeshStandardMaterial({ color: '#c22a20', roughness: 0.9 })).rotation.x = Math.PI / 2 + (random() - 0.5) * 0.3;
      for (let i = 0; i < 8; i++) s.cylinder(0.014, 0.014, 0.004, [(random() - 0.5) * 0.4, fy + 0.004, nz + 0.06 + random() * 0.05], gold, 8);
    } else {
      const oval = s.cylinder(0.14, 0.14, 0.02, [0, fy + 0.34, D / 2 - fd + 0.03], gold, 24);
      oval.rotation.x = Math.PI / 2; oval.scale.set(1, 1, 1.3);
      const sepia = s.cylinder(0.12, 0.12, 0.022, [0, fy + 0.34, D / 2 - fd + 0.034], s.material('#d9c9a4', { roughness: 0.4 }), 24);
      sepia.rotation.x = Math.PI / 2; sepia.scale.set(1, 1, 1.3);
      s.ball([0.045, 0.055, 0.008], [0, fy + 0.39, D / 2 - fd + 0.046], s.material('#6b5a44'), 10);
      s.ball([0.085, 0.08, 0.008], [0, fy + 0.27, D / 2 - fd + 0.046], s.material('#3a332a'), 10);
    }

    // ---- Names -----------------------------------------------------------------------------
    const count = Math.max(1, Math.round(mix(1, 16, a.names * a.names)));
    const namePlate = (names: string[], w: number, h: number, at: P3, header: string | null, ry = 0) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = Math.round(512 * h / w);
      const ctx = canvas.getContext('2d')!;
      const bg = new THREE.Color('#f3f1ea').lerp(new THREE.Color('#b9b6a8'), neglect * 0.7);
      ctx.fillStyle = `#${bg.getHexString()}`;
      ctx.fillRect(0, 0, 512, canvas.height);
      ctx.strokeStyle = '#8a8676'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 496, canvas.height - 16);
      ctx.fillStyle = neglect > 0.7 ? '#77746a' : '#2a2824';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let y = 30;
      if (header) { ctx.font = 'bold 34px serif'; ctx.fillText(header, 256, 44, 460); y = 84; }
      const cols = names.length > 6 ? 2 : 1;
      const rows = Math.ceil(names.length / cols);
      const lineH = Math.min(64, (canvas.height - y - 20) / rows);
      ctx.font = `${Math.min(lineH * 0.72, cols === 2 ? 26 : 44)}px serif`;
      names.forEach((name, i) => ctx.fillText(name, cols === 2 ? (i % 2 ? 380 : 132) : 256, y + lineH * (Math.floor(i / cols) + 0.5), cols === 2 ? 230 : 460));
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      const mesh = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }), at);
      mesh.rotation.y = ry;
      return mesh;
    };
    const names = Array.from({ length: count }, () => `${SURNAMES[Math.floor(random() * SURNAMES.length)]} ${'ABCDEFGLMNPRSUV'[Math.floor(random() * 15)]}.  ${1890 + Math.floor(random() * 95)}`);
    const header = a.tradition === 'plaque' ? 'AI CADUTI DEL LAVORO' : a.tradition === 'spirit' ? null : count === 1 ? 'IN MEMORIA' : 'AI NOSTRI CAVATORI';
    const first = names.slice(0, 10);
    const plate = namePlate(first, plaqueSize[0], plaqueSize[1], plaqueAt, header);
    if (a.form === 'stack') plate.rotation.y = 0.09;
    if (names.length > 10) {
      // The list ran on: a second slab leans against the foot.
      const extra = namePlate(names.slice(10), 0.42, 0.5, [-0.72, 0.26, 0.42], null, 0.3);
      extra.rotation.x = -0.28;
      const slab = s.box([0.46, 0.54, 0.05], [-0.72, 0.26, 0.39], stone);
      slab.rotation.set(-0.28, 0.3, 0);
    }

    // ---- Candles and flowers (always some) -----------------------------------------------------
    const stepY = a.form === 'pillar' ? 0.14 : 0;
    const frontZ = a.form === 'pillar' ? 0.42 : a.form === 'boulder' ? 0.46 : 0.5;
    const wax = s.material('#f1ead2', { roughness: 0.5 });
    const candle = (x: number, y: number, z: number, h: number, upright: boolean, lit: boolean) => {
      const c = s.cylinder(0.022, 0.026, h, [x, y + (upright ? h / 2 : 0.024), z], wax, 8);
      if (!upright) { c.rotation.z = Math.PI / 2; c.rotation.y = random() * 3; return; }
      s.ball([0.036, 0.008, 0.036], [x, y + 0.004, z], wax, 8);
      if (lit) s.ball([0.014, 0.028, 0.014], [x, y + h + 0.03, z], flame, 6);
    };
    const nCandles = 3 + Math.round(mood.density * 4);
    for (let i = 0; i < nCandles; i++) {
      const inNiche = i < 2;
      const x = inNiche ? (i ? 0.2 : -0.2) : (random() - 0.5) * 0.9;
      const upright = random() < 0.35 + tended * 0.75;
      candle(x, inNiche ? shelfY : stepY, inNiche ? nz + 0.07 : frontZ + random() * 0.12, 0.05 + random() * 0.12, upright || inNiche, random() < tended * 0.9);
    }
    const bloom = ['#e8452c', '#f2b12a', '#f4f0e6', '#d94a8c', '#7a5ad0', '#f28a2a'];
    const dead = ['#8a7a5a', '#6b6048', '#9a8f78'];
    const bouquet = (x: number, y: number, z: number, n: number, vessel: 'jar' | 'bottle' | 'tin') => {
      const vh = vessel === 'bottle' ? 0.14 : 0.1;
      const vesselMat = vessel === 'jar' ? new THREE.MeshStandardMaterial({ color: '#bfd9d9', roughness: 0.15, transparent: true, opacity: 0.75 }) : vessel === 'bottle' ? new THREE.MeshStandardMaterial({ color: '#7fc4e8', roughness: 0.2 }) : s.material('#9aa0a2', { metalness: 0.6 });
      s.cylinder(0.04, 0.036, vh, [x, y + vh / 2, z], vesselMat, 10);
      for (let i = 0; i < n; i++) {
        const fresh = random() < tended * 1.15;
        const lean = fresh ? 0.12 : 0.34;
        const tip: P3 = [x + (random() - 0.5) * lean, y + vh + (fresh ? 0.1 + random() * 0.12 : 0.03 + random() * 0.07), z + (random() - 0.5) * lean];
        s.rod([x, y + vh * 0.5, z], tip, 0.005, s.material(fresh ? '#3f8a3a' : '#7a6f4a'));
        s.ball([0.028, 0.024, 0.028], tip, new THREE.MeshStandardMaterial({ color: fresh ? bloom[Math.floor(random() * (2 + mood.cheer * 4))] : dead[Math.floor(random() * 3)], roughness: 0.7 }), 7);
      }
    };
    bouquet(0.34, stepY, frontZ + 0.05, 5, 'jar');
    if (tended > 0.3 || a.offerings === 'flowers') bouquet(-0.36, stepY, frontZ + 0.02, 6, 'bottle');

    // ---- What people have left -------------------------------------------------------------
    const gz = frontZ + 0.16;
    if (a.offerings === 'lamps') {
      const n = 5 + Math.round(mood.density * 6);
      for (let i = 0; i < n; i++) {
        const lit = random() < 0.25 + tended * 0.75;
        const row = i % 2;
        const x = -0.4 + (i / (n - 1)) * 0.8 + (random() - 0.5) * 0.04, z = gz + row * 0.1;
        const fallen = !lit && random() < neglect * 0.6;
        const lamp = s.cylinder(0.034, 0.03, 0.11, [x, stepY + (fallen ? 0.034 : 0.055), z], new THREE.MeshStandardMaterial({ color: '#c8201a', emissive: '#ff3a1a', emissiveIntensity: lit ? 1.1 : 0.05, roughness: 0.3 }), 10);
        if (fallen) lamp.rotation.z = Math.PI / 2;
        else s.cylinder(0.036, 0.036, 0.012, [x, stepY + 0.115, z], gold, 10);
      }
      for (const x of [-0.14, 0.14]) s.cylinder(0.03, 0.027, 0.1, [x, shelfY + 0.05, nz + 0.09], new THREE.MeshStandardMaterial({ color: '#c8201a', emissive: '#ff3a1a', emissiveIntensity: tended > 0.3 ? 1.1 : 0.05, roughness: 0.3 }), 10);
    } else if (a.offerings === 'flowers') {
      for (let i = 0; i < 5; i++) bouquet(-0.5 + i * 0.25 + (random() - 0.5) * 0.06, stepY, gz + (i % 2) * 0.12, 5 + Math.floor(random() * 4), (['jar', 'bottle', 'tin'] as const)[i % 3]);
      // A plastic wreath hung on the niche.
      const wreath = s.ring(0.13, 0.03, [0.3, nicheY + 0.72, D / 2 + 0.03], s.material(tended > 0.4 ? '#3f8a3a' : '#7a7a52', { roughness: 1 }));
      void wreath;
      for (let i = 0; i < 7; i++) s.ball([0.028, 0.028, 0.02], [0.3 + Math.cos(i * 0.9) * 0.13, nicheY + 0.72 + Math.sin(i * 0.9) * 0.13, D / 2 + 0.06], new THREE.MeshStandardMaterial({ color: tended > 0.4 ? bloom[i % 6] : dead[i % 3], roughness: 0.7 }), 7);
    } else if (a.offerings === 'tools') {
      const hat = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f2c21a' : '#e8e6de', roughness: 0.4 });
      s.mesh(new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hat, [-0.32, stepY + 0.02, gz + 0.06]).scale.set(1, 0.85, 1.15);
      s.cylinder(0.15, 0.15, 0.012, [-0.32, stepY + 0.02, gz + 0.09], hat, 16).scale.set(1, 1, 1.2);
      const helve = s.material('#8a623c');
      s.cylinder(0.05, 0.06, 0.12, [0.12, stepY + 0.06, gz + 0.08], helve, 10).rotation.z = Math.PI / 2;
      s.rod([0.12, stepY + 0.06, gz + 0.08], [0.16, stepY + 0.03, gz + 0.32], 0.016, helve);
      for (let i = 0; i < 3; i++) s.rod([0.3 + i * 0.05, stepY + 0.012, gz], [0.34 + i * 0.06, stepY + 0.012, gz + 0.24], 0.01, iron, 0.004);
      s.box([0.12, 0.03, 0.2], [-0.05, stepY + 0.015, gz + 0.12], s.material('#c9a45a', { roughness: 1 })).rotation.y = 0.4;
      s.box([0.12, 0.03, 0.2], [-0.02, stepY + 0.04, gz + 0.1], s.material('#b8934a', { roughness: 1 })).rotation.y = -0.2;
    } else if (a.offerings === 'bread') {
      const glassG = new THREE.MeshStandardMaterial({ color: '#2f4a2a', roughness: 0.2 });
      s.cylinder(0.038, 0.04, 0.2, [-0.25, stepY + 0.1, gz + 0.04], glassG, 12);
      s.cylinder(0.014, 0.034, 0.08, [-0.25, stepY + 0.24, gz + 0.04], glassG, 10);
      s.cylinder(0.016, 0.016, 0.02, [-0.25, stepY + 0.29, gz + 0.04], s.material('#b8934a'), 8);
      s.cylinder(0.034, 0.028, 0.08, [-0.1, stepY + 0.04, gz + 0.1], new THREE.MeshStandardMaterial({ color: '#7a1a24', roughness: 0.2 }), 10);
      s.ball([0.13, 0.06, 0.08], [0.16, stepY + 0.07, gz + 0.08], s.material('#c9944a', { roughness: 0.9 }), 12).rotation.y = 0.4;
      s.box([0.36, 0.008, 0.26], [0.14, stepY + 0.004, gz + 0.08], s.material('#f1ead2', { roughness: 1 })).rotation.y = 0.2;
      for (let i = 0; i < 3; i++) s.box([0.36, 0.009, 0.03], [0.14, stepY + 0.005, gz + i * 0.09], s.material('#c22a20', { roughness: 1 })).rotation.y = 0.2;
    } else if (a.offerings === 'stones') {
      const chip = s.material('#f4f2ea', { roughness: 0.9, flatShading: true });
      const pile: { at: P3; size: number }[] = [];
      const n = 30 + Math.round(mood.density * 50);
      for (let i = 0; i < n; i++) {
        const r = random() * 0.3, ang = random() * 6.283;
        pile.push({ at: [0.3 + Math.cos(ang) * r, stepY + 0.03 + (0.3 - r) * 0.9 * random(), gz + 0.14 + Math.sin(ang) * r * 0.8], size: 0.03 + random() * 0.035 });
      }
      s.scatter(new THREE.DodecahedronGeometry(1, 0), chip, pile);
      for (let i = 0; i < 4; i++) s.mesh(new THREE.DodecahedronGeometry(0.035, 0), s.material('#c22a20', { flatShading: true }), [0.3 + (random() - 0.5) * 0.3, stepY + 0.16 + random() * 0.1, gz + 0.14 + (random() - 0.5) * 0.2]);
    } else {
      for (let i = 0; i < 4; i++) {
        const x = -0.36 + i * 0.22, z = gz + 0.04 + (i % 2) * 0.05;
        const frameM = s.box([0.12, 0.15, 0.012], [x, stepY + 0.075, z], i % 2 ? gold : s.material('#3a2a1c'));
        frameM.rotation.x = -0.25;
        const pic = s.box([0.09, 0.12, 0.006], [x, stepY + 0.077, z + 0.007], s.material('#d9c9a4', { roughness: 0.4 }));
        pic.rotation.x = -0.25;
        s.ball([0.02, 0.024, 0.005], [x, stepY + 0.095, z + 0.006], s.material('#4a4034'), 8);
      }
      const beads: { at: P3; size: number }[] = [];
      for (let i = 0; i < 26; i++) { const ang = (i / 26) * 6.283; beads.push({ at: [0.02 + Math.cos(ang) * 0.1, shelfY + 0.012, nz + 0.1 + Math.sin(ang) * 0.03], size: 0.008 }); }
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#2a2622', { roughness: 0.4 }), beads);
    }

    // ---- Neglect -----------------------------------------------------------------------------
    if (neglect > 0.45) {
      const mossy: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < neglect * 46; i++) {
        const onTop = random() < 0.4;
        mossy.push({ at: onTop ? [(random() - 0.5) * W, topY + 0.05 + random() * 0.12, (random() - 0.5) * D] : [(random() - 0.5) * 1.2, stepY + 0.01, 0.3 + random() * 0.4], size: 0.03 + random() * 0.06, color: ['#566e34', '#6d7f3d', '#465f2c', '#9a9040'][Math.floor(random() * 4)] });
      }
      const blob = new THREE.SphereGeometry(1, 6, 4);
      blob.scale(1, 0.45, 1);
      s.scatter(blob, s.material('#ffffff', { roughness: 1 }), mossy);
      if (neglect > 0.65) {
        // Cobweb across the niche and dry leaves on the step.
        const web = new THREE.MeshStandardMaterial({ color: '#e8e8e2', roughness: 1 });
        const c: P3 = [nw / 2 - 0.03, shelfY + 0.5, D / 2 - 0.02];
        for (let i = 0; i < 6; i++) s.rod(c, [c[0] - 0.05 - i * 0.07, c[1] + 0.2 - i * 0.02, c[2]], 0.002, web);
        for (let i = 0; i < 5; i++) s.rod(c, [c[0] + 0.01, c[1] - 0.06 - i * 0.07, c[2]], 0.002, web);
        const leaves: { at: P3; size: number; color: string }[] = [];
        for (let i = 0; i < 30; i++) leaves.push({ at: [(random() - 0.5) * 1.3, stepY + 0.008, 0.3 + random() * 0.55], size: 0.02 + random() * 0.025, color: ['#a5773a', '#8a5a2a', '#b89a4a'][Math.floor(random() * 3)] });
        const leaf = new THREE.SphereGeometry(1, 5, 3);
        leaf.scale(1, 0.15, 0.6);
        s.scatter(leaf, s.material('#ffffff', { roughness: 1 }), leaves);
      }
    }

    const speed = mix(4, 14, mood.energy);
    const thing = s.finish({ update: (_dt, time) => { flame.emissiveIntensity = 1.7 + Math.sin(time * speed) * 0.4 + Math.sin(time * speed * 2.7) * 0.2; } });
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { textures.forEach((texture) => texture.dispose()); dispose(); } };
  },
});
