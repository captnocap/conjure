import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default defineThing({
  questions: {
    style: choice('What style is the cage?', {
      gilded: 'Gilded old-world: polished brass bars, an arched window, dark carved wood and cream marble, a crest on top.',
      modern: 'Bulletproof modern: a thick green-tinted glass pane, brushed steel, a speak-through grille and a red LED sign.',
      deco: 'Art deco: chrome bars in a sunburst, cream and black stripes, a glowing neon header.',
      frontier: 'Frontier bank: black wrought-iron bars set in rough oak planks, a painted board sign.',
    }),
    tray: choice('What sits in the pass-through tray?', {
      mountain: 'A mountain of chips heaped up and spilling over the sill, a big night being cashed out.',
      three: 'Three sad chips, the last of it.',
      watch: 'A gold wristwatch pushed across to be pawned.',
      payout: 'Banded bricks of banknotes being paid out, a few loose bills fanned on top.',
      cup: 'A plastic cup of coins from the slots.',
      empty: 'Nothing; the tray is bare and polished.',
    }),
    position: choice('Is this position open?', {
      open: 'Open, the lamp lit, ready to pay.',
      closed: 'Closed: a blind pulled down behind the bars and a CLOSED sign hung on them.',
      next: 'Unattended, a NEXT WINDOW PLEASE card propped in the opening.',
    }),
    stock: choice('What is stacked behind the bars?', {
      chips: 'Racks and racks of coloured chips.',
      cash: 'Bricks of banded banknotes piled high.',
      both: 'Chip racks on one side, bricks of cash on the other.',
      bare: 'Almost nothing, the shelves nearly emptied out.',
    }),
    sign: choice('What does the header sign say?', {
      cashier: 'CASHIER',
      cage: 'THE CAGE',
      cashout: 'CASH OUT',
      change: 'CHANGE',
      credit: 'CREDIT OFFICE',
    }),
    camera: noul('Is a dark security camera dome watching the window?'),
    bell: choice('What waits on the sill beside the tray?', {
      none: 'Nothing.',
      bell: 'A brass desk bell to ring for service.',
      pen: 'A pen on a chain and a pad of slips.',
      rope: 'A stack of forgotten paper coin cups.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const open = a.position === 'open';
    const glow = mix(0.5, 1.2, mood.cheer);
    const P = {
      gilded: { body: '#4a2416', metal: '#d9a93a', stone: '#e9e2d0', vein: '#a89a82', signInk: '#f0c85a', signPaper: '#14382a' },
      modern: { body: '#4a5059', metal: '#c5cace', stone: '#2a2c31', vein: '#55585f', signInk: '#ff3524', signPaper: '#120406' },
      deco: { body: '#e8dcc0', metal: '#dfe3e6', stone: '#1c1c20', vein: '#6a6a70', signInk: '#ff5fb0', signPaper: '#14121a' },
      frontier: { body: '#7a5632', metal: '#22201f', stone: '#8a8478', vein: '#5f5a50', signInk: '#2a1a10', signPaper: '#d9c79a' },
    }[a.style];
    const body = s.material(P.body, { roughness: a.style === 'modern' ? 0.4 : 0.6, metalness: a.style === 'modern' ? 0.5 : 0 });
    const metal = s.material(P.metal, { metalness: a.style === 'frontier' ? 0.5 : 0.92, roughness: a.style === 'frontier' ? 0.6 : 0.22 });
    const dark = s.material('#17181c', { roughness: 0.6 });
    const brass = s.material('#d9a93a', { metalness: 0.92, roughness: 0.25 });
    const stoneTexture = paint(256, 128, (c) => {
      c.fillStyle = P.stone; c.fillRect(0, 0, 256, 128);
      c.strokeStyle = P.vein; c.globalAlpha = 0.6;
      for (let i = 0; i < 14; i++) { c.lineWidth = 0.6 + random() * 2; c.beginPath(); let x = random() * 256, y = random() * 128; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += 20 + random() * 30; y += (random() - 0.5) * 40; c.lineTo(x, y); } c.stroke(); }
    });
    const stone = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.25 });
    const SILL = 1.1, TOP = 2.4, BZ = 0.12;

    // Counter front with panels, kick plate and the sill.
    s.box([2.0, 1.04, 0.5], [0, 0.56, 0], body);
    s.box([2.06, 0.1, 0.56], [0, 0.05, 0], a.style === 'modern' ? metal : dark);
    for (let i = 0; i < 4; i++) {
      const x = -0.705 + i * 0.47;
      if (a.style === 'frontier') { s.box([0.02, 0.9, 0.02], [x + 0.235, 0.58, 0.252], dark); continue; }
      s.box([0.38, 0.72, 0.03], [x, 0.58, 0.25], a.style === 'deco' ? dark : a.style === 'modern' ? metal : s.material('#3a1c12'));
      if (a.style !== 'modern') s.box([0.3, 0.64, 0.03], [x, 0.58, 0.262], body);
      if (a.style === 'deco') for (let k = 0; k < 3; k++) s.box([0.3, 0.025, 0.035], [x, 0.4 + k * 0.18, 0.265], metal);
    }
    s.mesh(new THREE.BoxGeometry(2.24, 0.07, 0.86), stone, [0, SILL - 0.035, 0.03]);
    s.box([2.2, 0.03, 0.82], [0, SILL - 0.085, 0.03], metal);

    // Pillars, side wings and header.
    for (const x of [-1, 1]) {
      s.box([0.14, TOP - SILL, 0.14], [x, (TOP + SILL) / 2, BZ], body);
      s.box([0.18, 0.06, 0.18], [x, SILL + 0.03, BZ], metal);
      s.box([0.18, 0.06, 0.18], [x, TOP - 0.03, BZ], metal);
      s.box([0.1, 1.04, 0.5], [x, 0.56, -0.5], body);
      s.box([0.1, 0.1, 0.9], [x, TOP + 0.05, -0.3], body);
      s.box([0.12, TOP - SILL, 0.12], [x, (TOP + SILL) / 2, -0.72], body);
      s.box([0.06, 0.07, 0.56], [x, SILL - 0.035, -0.52], body);
    }
    s.box([2.24, 0.34, 0.24], [0, TOP + 0.17, BZ], body);
    s.box([2.3, 0.05, 0.3], [0, TOP + 0.365, BZ], metal);
    const signText = { cashier: 'CASHIER', cage: 'THE CAGE', cashout: 'CASH OUT', change: 'CHANGE', credit: 'CREDIT OFFICE' }[a.sign];
    const lit = a.style === 'modern' || a.style === 'deco';
    const signTexture = paint(512, 96, (c) => {
      c.fillStyle = P.signPaper; c.fillRect(0, 0, 512, 96);
      c.strokeStyle = P.signInk; c.lineWidth = 4; c.strokeRect(8, 8, 496, 80);
      c.fillStyle = P.signInk; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${Math.min(62, 660 / signText.length)}px ${a.style === 'modern' ? 'monospace' : 'serif'}`;
      c.fillText(signText, 256, 51, 470);
    });
    const signMesh = s.mesh(new THREE.PlaneGeometry(1.5, 0.26), new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.5, emissive: '#ffffff', emissiveMap: signTexture, emissiveIntensity: lit ? glow * (a.position === 'closed' ? 0.35 : 1) : 0.12 }), [0, TOP + 0.17, BZ + 0.122]);
    signMesh.castShadow = false;
    if (a.style === 'gilded') {
      s.ring(0.5, 0.035, [0, TOP + 0.39, BZ], metal, Math.PI);
      s.ball([0.1, 0.1, 0.06], [0, TOP + 0.62, BZ], metal);
      for (const x of [-1.05, 1.05]) s.lathe([[0.06, 0], [0.03, 0.05], [0.07, 0.12], [0.02, 0.2], [0, 0.24]], metal, [x, TOP + 0.39, BZ]);
    } else if (a.style === 'deco') {
      for (let i = 0; i < 5; i++) s.box([0.5 - i * 0.09, 0.05, 0.26 - i * 0.03], [0, TOP + 0.415 + i * 0.05, BZ], i % 2 ? dark : body);
    } else if (a.style === 'frontier') {
      s.box([1.7, 0.2, 0.04], [0, TOP + 0.49, BZ], body);
    }

    // Bars, or armoured glass.
    const HW = 0.3, HH = 0.46;
    const bars: { at: readonly [number, number, number]; h: number }[] = [];
    const arched = a.style === 'gilded';
    if (a.style === 'modern') {
      s.box([1.86, TOP - SILL - 0.3, 0.045], [0, (TOP + SILL) / 2 + 0.15, BZ], new THREE.MeshPhysicalMaterial({ color: '#9fd6c0', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }));
      s.box([1.86, 0.04, 0.07], [0, SILL + 0.3, BZ], metal);
      for (const x of [-0.45, 0.45]) s.box([0.04, TOP - SILL, 0.07], [x, (TOP + SILL) / 2, BZ], metal);
      for (const x of [-0.7, 0.7]) s.box([0.46, 0.3, 0.03], [x, SILL + 0.15, BZ], metal);
      s.cylinder(0.11, 0.11, 0.05, [0, SILL + 0.72, BZ + 0.01], metal, 24).rotation.x = Math.PI / 2;
      for (let i = 0; i < 7; i++) s.cylinder(0.014, 0.014, 0.06, [Math.cos(i * 0.9) * (i ? 0.06 : 0), SILL + 0.72 + Math.sin(i * 0.9) * (i ? 0.06 : 0), BZ + 0.012], dark, 8).rotation.x = Math.PI / 2;
      s.box([0.66, 0.035, 0.1], [0, SILL + 0.3, BZ + 0.05], metal);
    } else {
      for (let i = 0; i <= 18; i++) {
        const x = -0.9 + i * 0.1;
        const from = Math.abs(x) < HW - 0.01 ? SILL + HH + (arched ? Math.sqrt(Math.max(0, HW * HW - x * x)) : 0) : SILL;
        bars.push({ at: [x, (from + TOP) / 2, BZ], h: TOP - from });
      }
      for (const x of [-1, 1]) for (let i = 0; i < 7; i++) bars.push({ at: [x, (SILL + TOP) / 2, BZ - 0.12 - i * 0.1], h: TOP - SILL });
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(a.style === 'frontier' ? 0.014 : 0.012, a.style === 'frontier' ? 0.014 : 0.012, 1, 8), metal, bars.length);
      const matrix = new THREE.Matrix4();
      bars.forEach((bar, i) => { matrix.makeScale(1, bar.h, 1).setPosition(...bar.at); mesh.setMatrixAt(i, matrix); });
      mesh.castShadow = true;
      s.root.add(mesh);
      s.box([1.86, 0.03, 0.035], [0, SILL + 0.95, BZ], metal);
      for (const x of [-0.6, 0.6]) s.box([0.62, 0.03, 0.035], [x, SILL + HH, BZ], metal);
      for (const x of [-HW, HW]) s.box([0.035, HH, 0.035], [x, SILL + HH / 2, BZ], metal);
      if (arched) s.ring(HW, 0.018, [0, SILL + HH, BZ], metal, Math.PI);
      else s.box([HW * 2, 0.03, 0.035], [0, SILL + HH, BZ], metal);
      if (a.style === 'deco') for (let i = 0; i < 7; i++) { const t = 0.3 + i * 0.42; s.rod([0, SILL + HH, BZ + 0.01], [Math.cos(t) * 0.5, SILL + HH + Math.sin(t) * 0.42, BZ + 0.01], 0.01, metal); }
    }

    // Back wall of shelves, and the working counter behind the bars.
    s.box([2.1, TOP - 0.1, 0.12], [0, TOP / 2 - 0.05, -0.84], a.style === 'modern' ? s.material('#6a707a') : s.material('#2f1f1a'));
    const shelf = a.style === 'modern' ? metal : body;
    const levels = [SILL - 0.0, 1.45, 1.8];
    for (const y of levels.slice(1)) s.box([1.9, 0.03, 0.26], [0, y, -0.66], shelf);
    const channel = paint(128, 8, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 8); c.fillStyle = '#00000066'; for (let i = 0; i < 128; i += 5) c.fillRect(i, 0, 1.4, 8); });
    const rackGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12).rotateZ(Math.PI / 2);
    const racks: { at: [number, number, number]; color: string }[] = [];
    const bricks: [number, number, number][] = [];
    const CHIPS = ['#c4162a', '#1e8a4a', '#17171b', '#7a2e9a', '#e8a01c', '#1c4fb0', '#f2ede0', '#e86a9a'];
    const amount = a.stock === 'bare' ? 0.12 : mix(0.55, 1, mood.density);
    const zone = (x: number, y: number, z: number, kind: 'chips' | 'cash', height: number) => {
      if (kind === 'chips') {
        const rows = Math.round(height / 0.062 * amount * mix(0.6, 1, random()));
        for (let r = 0; r < rows; r++) for (let k = 0; k < 2; k++) if (random() < 0.92) racks.push({ at: [x, y + 0.032 + r * 0.062, z - 0.035 + k * 0.064], color: CHIPS[Math.floor(random() * 8)] });
      } else {
        for (let col = 0; col < 2; col++) {
          const rows = Math.round(height / 0.05 * amount * mix(0.5, 1, random()));
          for (let r = 0; r < rows; r++) bricks.push([x - 0.1 + col * 0.2 + (random() - 0.5) * 0.015, y + 0.025 + r * 0.05, z + (random() - 0.5) * 0.02]);
        }
      }
    };
    const kindAt = (i: number): 'chips' | 'cash' => a.stock === 'chips' ? 'chips' : a.stock === 'cash' ? 'cash' : (a.stock === 'both' ? i < 2 : random() < 0.5) ? 'chips' : 'cash';
    levels.forEach((y, level) => { for (let i = 0; i < 4; i++) zone(-0.7 + i * 0.467, y + 0.015, -0.66, kindAt(i), level === 2 ? 0.5 : 0.3); });
    for (const i of [0, 3]) zone(i ? 0.66 : -0.66, SILL, -0.2, kindAt(i), 0.36);
    if (racks.length) {
      const mesh = new THREE.InstancedMesh(rackGeometry, new THREE.MeshStandardMaterial({ map: channel, roughness: 0.55 }), racks.length);
      const matrix = new THREE.Matrix4(), colour = new THREE.Color();
      racks.forEach((rack, i) => { matrix.makeTranslation(...rack.at); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, colour.set(rack.color)); });
      mesh.castShadow = mesh.receiveShadow = true; s.root.add(mesh);
    }
    const note = s.material('#8fb58a', { roughness: 0.9 });
    const band = s.material('#f1dc7a', { roughness: 0.8 });
    const brickGeometry = new THREE.BoxGeometry(0.17, 0.046, 0.075);
    if (bricks.length) {
      s.scatter(brickGeometry, note, bricks.map((at) => ({ at, size: 1 })));
      s.scatter(new THREE.BoxGeometry(0.035, 0.05, 0.079), band, bricks.map((at) => ({ at, size: 1 })));
    }
    // Banker's lamp.
    if (a.style !== 'modern') {
      s.cylinder(0.05, 0.06, 0.015, [0.42, SILL + 0.008, -0.22], brass, 14);
      s.rod([0.42, SILL, -0.22], [0.42, SILL + 0.2, -0.22], 0.008, brass);
      const shade = s.cylinder(0.045, 0.045, 0.2, [0.42, SILL + 0.21, -0.2], s.material('#1f7a4a', { emissive: '#3fd08a', emissiveIntensity: open ? glow * 0.9 : 0, roughness: 0.3 }), 14);
      shade.rotation.z = Math.PI / 2;
    } else {
      s.box([0.34, 0.24, 0.03], [0.45, SILL + 0.2, -0.2], dark).rotation.y = -0.4;
      s.box([0.3, 0.2, 0.01], [0.443, SILL + 0.2, -0.183], s.material('#1c3a5a', { emissive: '#3f8fe0', emissiveIntensity: open ? glow : 0 })).rotation.y = -0.4;
    }

    // Pass-through tray and what is in it.
    const TZ = 0.2, TY = SILL + 0.012;
    s.box([0.5, 0.016, 0.34], [0, SILL + 0.004, TZ], metal);
    s.box([0.44, 0.006, 0.28], [0, SILL + 0.013, TZ], a.style === 'modern' ? dark : s.material('#b98a2a', { metalness: 0.8, roughness: 0.45 }));
    const chips: { at: [number, number, number]; flat: boolean; color: string }[] = [];
    if (a.tray === 'mountain') {
      for (let i = 0; i < 150; i++) {
        const r = Math.sqrt(random()) * 0.2, t = random() * 6.3;
        chips.push({ at: [Math.cos(t) * r * 1.15, TY + 0.008 + (1 - r / 0.2) * 0.14 * random(), TZ + Math.sin(t) * r * 0.8], flat: random() < 0.75, color: CHIPS[Math.floor(random() * 6)] });
      }
      for (let i = 0; i < 12; i++) chips.push({ at: [(random() - 0.5) * 0.7, SILL + 0.006, 0.36 + random() * 0.07], flat: true, color: CHIPS[Math.floor(random() * 6)] });
    } else if (a.tray === 'three') {
      chips.push({ at: [-0.06, TY + 0.007, TZ + 0.02], flat: true, color: CHIPS[0] }, { at: [0.03, TY + 0.007, TZ - 0.03], flat: true, color: CHIPS[0] }, { at: [0.09, TY + 0.03, TZ + 0.06], flat: false, color: CHIPS[5] });
    } else if (a.tray === 'watch') {
      const gold = s.material('#f0c040', { metalness: 1, roughness: 0.2, emissive: '#6a4a08', emissiveIntensity: 0.5 });
      const strap = s.ring(0.055, 0.012, [0, TY + 0.025, TZ], gold);
      strap.rotation.y = 0.5; strap.scale.set(1, 0.7, 1.6);
      const dial = paint(64, 64, (c) => { c.fillStyle = '#fbf8ee'; c.beginPath(); c.arc(32, 32, 30, 0, 7); c.fill(); c.strokeStyle = '#16181c'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(32 + Math.cos(i * 0.5236) * 23, 32 + Math.sin(i * 0.5236) * 23); c.lineTo(32 + Math.cos(i * 0.5236) * 28, 32 + Math.sin(i * 0.5236) * 28); c.stroke(); } c.beginPath(); c.moveTo(32, 32); c.lineTo(32, 12); c.moveTo(32, 32); c.lineTo(46, 38); c.stroke(); });
      s.cylinder(0.05, 0.05, 0.016, [0, TY + 0.07, TZ], gold, 24);
      const faceMesh = s.mesh(new THREE.CircleGeometry(0.043, 24), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.3 }), [0, TY + 0.0785, TZ]);
      faceMesh.rotation.x = -Math.PI / 2; faceMesh.castShadow = false;
    } else if (a.tray === 'payout') {
      for (let i = 0; i < 5; i++) { const at: [number, number, number] = [(i % 2 ? 0.1 : -0.1) + (random() - 0.5) * 0.02, TY + 0.026 + Math.floor(i / 2) * 0.047, TZ - 0.03]; s.mesh(brickGeometry, note, at); s.box([0.035, 0.05, 0.079], at, band); }
      for (let i = 0; i < 5; i++) s.box([0.16, 0.002, 0.07], [-0.08 + i * 0.03, TY + 0.004 + i * 0.002, TZ + 0.09], note).rotation.y = -0.5 + i * 0.25;
    } else if (a.tray === 'cup') {
      s.mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.13, 16, 1, true), s.material('#e8dcc0', { side: THREE.DoubleSide }), [0.04, TY + 0.065, TZ]);
      s.ball([0.056, 0.02, 0.056], [0.04, TY + 0.125, TZ], brass, 12);
      for (let i = 0; i < 9; i++) s.cylinder(0.014, 0.014, 0.004, [-0.12 + random() * 0.1, TY + 0.004, TZ - 0.08 + random() * 0.18], brass, 10);
    }
    if (chips.length) {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.009, 16), new THREE.MeshStandardMaterial({ roughness: 0.5 }), chips.length);
      const matrix = new THREE.Matrix4(), colour = new THREE.Color(), turn = new THREE.Euler(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      chips.forEach((chip, i) => {
        turn.set(chip.flat ? (random() - 0.5) * 0.5 : 1.2 + random() * 0.5, random() * 6, chip.flat ? (random() - 0.5) * 0.5 : 0);
        matrix.compose(new THREE.Vector3(...chip.at), q.setFromEuler(turn), one); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, colour.set(chip.color));
      });
      mesh.castShadow = mesh.receiveShadow = true; s.root.add(mesh);
    }

    // Sill clutter.
    if (a.bell === 'bell') {
      s.cylinder(0.06, 0.065, 0.012, [-0.6, SILL + 0.006, 0.26], dark, 16);
      s.ball([0.052, 0.04, 0.052], [-0.6, SILL + 0.02, 0.26], brass, 16);
      s.cylinder(0.008, 0.008, 0.03, [-0.6, SILL + 0.068, 0.26], brass, 8);
    } else if (a.bell === 'pen') {
      s.box([0.12, 0.012, 0.16], [-0.6, SILL + 0.006, 0.26], s.material('#f4f1e6')).rotation.y = 0.2;
      s.rod([-0.52, SILL + 0.012, 0.3], [-0.62, SILL + 0.02, 0.22], 0.006, dark);
      s.tube([[-0.52, SILL + 0.012, 0.3], [-0.42, SILL + 0.004, 0.33], [-0.36, SILL + 0.004, 0.24], [-0.33, SILL + 0.02, 0.13]], 0.003, metal);
    } else if (a.bell === 'rope') {
      for (let i = 0; i < 6; i++) s.mesh(new THREE.CylinderGeometry(0.045, 0.034, 0.09, 14, 1, true), s.material(i % 2 ? '#e8dcc0' : '#c4162a', { side: THREE.DoubleSide }), [-0.6, SILL + 0.045 + i * 0.022, 0.26]);
    }

    // Closed, or unattended.
    if (a.position === 'closed') {
      s.box([1.84, TOP - SILL - 0.04, 0.02], [0, (TOP + SILL) / 2, BZ - 0.06], s.material(a.style === 'modern' ? '#8d9299' : '#2d4a3a', { roughness: 0.8 }));
      if (a.style === 'modern') for (let i = 0; i < 12; i++) s.box([1.84, 0.012, 0.03], [0, SILL + 0.1 + i * 0.1, BZ - 0.055], metal);
      const closed = s.label('CLOSED', 0.4, 0.15, [0.02, SILL + 0.72, BZ + 0.04], '#f4ecc8', '#a3161f');
      closed.rotation.z = (random() - 0.5) * 0.2;
      s.rod([-0.12, SILL + 0.79, BZ + 0.03], [0, SILL + 0.93, BZ + 0.02], 0.003, dark); s.rod([0.16, SILL + 0.79, BZ + 0.03], [0, SILL + 0.93, BZ + 0.02], 0.003, dark);
    } else if (a.position === 'next') {
      const card = s.label('NEXT WINDOW', 0.42, 0.2, [0, SILL + 0.12, BZ - 0.03], '#16181c', '#f4ecc8');
      card.rotation.x = -0.25;
    }
    if (a.camera) {
      s.rod([0.8, TOP + 0.3, BZ + 0.1], [0.8, TOP + 0.22, BZ + 0.42], 0.016, dark);
      s.cylinder(0.075, 0.075, 0.03, [0.8, TOP + 0.21, BZ + 0.42], s.material('#e8e8e4'), 16);
      const dome = s.mesh(new THREE.SphereGeometry(0.065, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), s.material('#0c0d10', { roughness: 0.1, metalness: 0.4 }), [0.8, TOP + 0.2, BZ + 0.42]);
      dome.castShadow = true;
      s.ball([0.008, 0.008, 0.008], [0.8, TOP + 0.15, BZ + 0.47], s.material('#ff2a2a', { emissive: '#ff2a2a', emissiveIntensity: 2 }), 6);
    }
    return s.finish();
  },
});
