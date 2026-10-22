import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const WOODS = { walnut: '#7a4a28', mahogany: '#5a2418', oak: '#c0935a', cream: '#e6dcc0', black: '#2b2622' } as const;

// Cabinet proportions and where the grille and dial opening sit on the front, in metres.
const CABINETS = {
  cathedral: { w: 0.36, h: 0.44, d: 0.2, grille: [0, 0.28, 0.2, 0.2, 1], dial: [0, 0.105, 0.11, 0.055] },
  tombstone: { w: 0.31, h: 0.46, d: 0.2, grille: [0, 0.32, 0.2, 0.19, 0], dial: [0, 0.14, 0.12, 0.075] },
  table: { w: 0.48, h: 0.27, d: 0.2, grille: [-0.11, 0.14, 0.2, 0.17, 0], dial: [0.12, 0.16, 0.17, 0.09] },
  midcentury: { w: 0.52, h: 0.25, d: 0.2, grille: [0, 0.15, 0.44, 0.11, 0], dial: [0, 0.055, 0.4, 0.04] },
  utility: { w: 0.34, h: 0.33, d: 0.19, grille: [0, 0.21, 0.19, 0.19, 1], dial: [0, 0.07, 0.15, 0.05] },
} as const;

function cabinetShape(style: keyof typeof CABINETS, w: number, h: number) {
  const x = w / 2, sh = new THREE.Shape();
  sh.moveTo(-x, 0);
  if (style === 'cathedral') {
    sh.lineTo(-x, h * 0.45);
    sh.bezierCurveTo(-x, h * 0.85, -x * 0.45, h, 0, h);
    sh.bezierCurveTo(x * 0.45, h, x, h * 0.85, x, h * 0.45);
  } else if (style === 'tombstone') {
    for (const side of [-1, 1]) {
      const pts: [number, number][] = [[x, 0.84], [x * 0.84, 0.84], [x * 0.84, 0.93], [x * 0.55, 0.93], [x * 0.55, 1]];
      for (const [px, py] of side < 0 ? pts : pts.slice().reverse()) sh.lineTo(side * px, py * h);
    }
  } else if (style === 'utility') {
    sh.lineTo(-x, h); sh.lineTo(x, h);
  } else {
    const r = style === 'table' ? h * 0.3 : h * 0.1;
    sh.lineTo(-x, h - r); sh.quadraticCurveTo(-x, h, -x + r, h);
    sh.lineTo(x - r, h); sh.quadraticCurveTo(x, h, x, h - r);
  }
  sh.lineTo(x, 0);
  sh.closePath();
  return sh;
}

export default defineThing({
  questions: {
    cabinet: choice('What era and shape is the wooden cabinet?', {
      cathedral: 'An early-1930s cathedral set: a tall pointed gothic arch with a round cloth grille.',
      tombstone: 'A mid-1930s tombstone: an upright slab with stepped art-deco shoulders.',
      table: 'A 1940s table set: low and wide with rounded corners, speaker on the left and dial on the right.',
      midcentury: 'A 1950s set: long, low and blond on little splayed legs with a wide slit dial.',
      utility: 'A wartime utility set: a plain square box, no ornament at all.',
    }),
    wood: choice('What is the cabinet finished in?', {
      walnut: 'Warm brown walnut veneer.',
      mahogany: 'Dark red mahogany, french polished.',
      oak: 'Pale golden oak.',
      cream: 'Painted cream, a kitchen radio.',
      black: 'Ebonised black with a dull shine.',
    }),
    apart: score('How far has it been taken apart?', [
      'Chassis just slid out and still wired to the speaker inside',
      'Chassis out, speaker unbolted and lying cone-up on the bench',
      'Knobs pulled, valves unplugged and laid out, sockets empty',
    ]),
    valves: choice('What are the valves doing?', {
      glowing: 'All alive, heaters glowing a steady orange.',
      'one-dead': 'All glowing but one, which stays dark: the fault.',
      gassy: 'One valve glowing an unhealthy violet-blue among the orange.',
      dead: 'All cold and dark, the set is unplugged.',
    }),
    station: choice('Where on the dial is the pointer?', {
      longwave: 'Right down at the bottom of the band, a far-off long-wave station.',
      home: 'On the home service, a third of the way up, where it always sat.',
      static: 'Stuck between stations, nothing but hiss.',
      shortwave: 'Up at the top end, short wave, foreign voices at night.',
      slumped: 'The dial cord has snapped and the pointer hangs slumped at an angle.',
    }),
    grille: choice('What does the speaker grille look like?', {
      sunburst: 'A sunburst of wooden rays over gold cloth.',
      bars: 'Plain vertical wooden bars.',
      lattice: 'A diamond lattice fretwork.',
      cloth: 'Bare woven cloth with a faint stripe.',
    }),
    saucer: noul('Have the screws been set aside carefully in a saucer, rather than scattered loose on the bench?'),
    note: noul('Is there a paper tag tied to the chassis with the fault written on it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cab = CABINETS[a.cabinet];
    const woodColour = new THREE.Color(WOODS[a.wood]);
    const wood = s.material(woodColour, { roughness: a.wood === 'cream' ? 0.6 : 0.38 });
    const woodDark = s.material(woodColour.clone().multiplyScalar(0.6), { roughness: 0.5 });
    const dark = s.material('#1b1a18', { roughness: 0.8 });
    const bakelite = s.material('#3a2418', { roughness: 0.3 });
    const brass = s.material('#b8913f', { metalness: 0.7, roughness: 0.35 });
    const steel = s.material('#a9aeb0', { metalness: 0.6, roughness: 0.45 });
    const alu = s.material('#cfd3d2', { metalness: 0.5, roughness: 0.35 });
    const paper = s.material('#c9b089', { roughness: 0.9 });
    const stage = Math.min(2, Math.floor(a.apart * 3));
    const powered = a.valves !== 'dead';
    const warm = mix(0.9, 1.8, mood.warmth);

    // ---- Cabinet: an empty shell standing behind, front to the viewer.
    const shell = new Sculpture(context);
    const body = shell.mesh(new THREE.ExtrudeGeometry(cabinetShape(a.cabinet, cab.w, cab.h), { depth: cab.d, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }), wood, [0, 0, -cab.d / 2]);
    body.geometry.computeVertexNormals();
    const fz = cab.d / 2 + 0.007;
    shell.box([cab.w + 0.02, 0.02, cab.d + 0.03], [0, 0.01, 0], woodDark);
    if (a.cabinet === 'midcentury') for (const x of [-1, 1]) for (const z of [-1, 1]) shell.rod([x * cab.w * 0.38, 0, z * cab.d * 0.3], [x * cab.w * 0.45, -0.07, z * cab.d * 0.42], 0.012, woodDark, 0.007);
    const [gx, gy, gw, gh, round] = cab.grille;
    const cloth = paint(256, 256, (ctx) => {
      ctx.fillStyle = a.wood === 'cream' ? '#8c6f3e' : '#b89a55';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(60,40,15,0.35)';
      for (let i = 0; i < 256; i += 6) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
      ctx.strokeStyle = '#' + woodColour.getHexString();
      ctx.lineCap = 'butt';
      if (a.grille === 'sunburst') {
        ctx.lineWidth = 13;
        for (let i = 0; i <= 8; i++) { const t = Math.PI * (i / 8); ctx.beginPath(); ctx.moveTo(128, 250); ctx.lineTo(128 - Math.cos(t) * 330, 250 - Math.sin(t) * 330); ctx.stroke(); }
        ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(128, 256, 46, 0, Math.PI * 2); ctx.fill();
      } else if (a.grille === 'bars') {
        ctx.lineWidth = 20;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(28 + i * 50, 0); ctx.lineTo(28 + i * 50, 256); ctx.stroke(); }
      } else if (a.grille === 'lattice') {
        ctx.lineWidth = 11;
        for (let i = -256; i < 512; i += 52) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.moveTo(i, 256); ctx.lineTo(i + 256, 0); ctx.stroke(); }
      } else {
        ctx.fillStyle = 'rgba(90,50,20,0.4)';
        for (let i = 0; i < 4; i++) ctx.fillRect(0, 40 + i * 58, 256, 10);
      }
      // Age: a sagging tear in the cloth.
      if (mood.wear > 0.6) { ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.ellipse(60 + random() * 130, 90 + random() * 80, 26, 12 + mood.wear * 16, random() * 3, 0, Math.PI * 2); ctx.fill(); }
    });
    const clothMaterial = new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.95 });
    if (round) {
      shell.mesh(new THREE.CircleGeometry(gw / 2, 40), clothMaterial, [gx, gy, fz]);
      shell.ring(gw / 2, 0.008, [gx, gy, fz], woodDark);
    } else {
      shell.mesh(new THREE.PlaneGeometry(gw, gh), clothMaterial, [gx, gy, fz]);
      for (const side of [-1, 1]) {
        shell.box([gw + 0.016, 0.008, 0.008], [gx, gy + side * gh / 2, fz], woodDark);
        shell.box([0.008, gh + 0.016, 0.008], [gx + side * gw / 2, gy, fz], woodDark);
      }
    }
    // The dial opening is an empty dark hole: the dial left with the chassis.
    const [dx, dy, dw, dh] = cab.dial;
    shell.box([dw + 0.014, dh + 0.014, 0.004], [dx, dy, fz - 0.003], brass);
    shell.box([dw, dh, 0.005], [dx, dy, fz - 0.001], dark);
    const knobCount = a.cabinet === 'midcentury' || a.cabinet === 'table' ? 4 : 3;
    const holeY = a.cabinet === 'midcentury' ? 0.2 : 0.045;
    for (let i = 0; i < knobCount; i++) {
      const hx = a.cabinet === 'midcentury' ? 0.2 : a.cabinet === 'table' ? dx + (i - 1.5) * 0.045 : (i - 1) * cab.w * 0.27;
      const hy = a.cabinet === 'midcentury' ? 0.04 + i * 0.045 : holeY;
      if (a.cabinet === 'midcentury' && i > 1) continue;
      shell.mesh(new THREE.CircleGeometry(0.008, 12), dark, [a.cabinet === 'midcentury' ? (i ? 0.235 : -0.235) : hx, a.cabinet === 'midcentury' ? 0.2 : hy, fz]);
    }
    // Veneer chips and a water ring on top when worn.
    for (let i = 0; i < Math.floor(mood.wear * 5); i++)
      shell.box([0.02 + random() * 0.03, 0.012 + random() * 0.02, 0.002], [(random() - 0.5) * cab.w * 0.8, 0.03 + random() * 0.05, fz - 0.001], s.material('#d8c39a', { roughness: 0.9 }));
    shell.root.position.set(-0.12, a.cabinet === 'midcentury' ? 0.07 : 0, -0.14);
    shell.root.rotation.y = 0.12 + (random() - 0.5) * 0.12;
    s.root.add(shell.root);

    // The perforated back panel, leaning against the cabinet's side.
    const backTexture = paint(256, 256, (ctx) => {
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#2a1d12';
      for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { ctx.beginPath(); ctx.ellipse(34 + c * 24, 40 + r * 22, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#e9dcb8'; ctx.fillRect(70, 186, 116, 44);
      ctx.fillStyle = '#5a1e14'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
      ctx.fillText('DANGER', 128, 204); ctx.fillText('HIGH VOLTAGE', 128, 222);
    });
    const back = s.box([cab.w * 0.9, cab.h * 0.8, 0.006], [0, 0, 0], new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.9 }));
    back.rotation.order = 'YXZ';
    back.rotation.set(-0.3, Math.PI / 2 + 0.25, 0);
    back.position.set(-0.12 + cab.w / 2 + 0.09, cab.h * 0.38, -0.2);

    // ---- Chassis: pulled out in front.
    const c = new Sculpture(context);
    const CW = Math.min(cab.w - 0.06, 0.34), CD = 0.14, CH = 0.045;
    c.box([CW, CH, CD], [0, CH / 2, 0], steel);
    c.box([CW + 0.004, 0.004, CD + 0.004], [0, CH, 0], alu);
    const glass = new THREE.MeshStandardMaterial({ color: '#e4efe9', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false });
    const glassLit = new THREE.MeshStandardMaterial({ color: '#ffd7a0', emissive: '#ff7a1c', emissiveIntensity: 1.1 * warm, transparent: true, opacity: 0.62, roughness: 0.1, depthWrite: false });
    const glassGas = new THREE.MeshStandardMaterial({ color: '#c9b8ff', emissive: '#7a48ff', emissiveIntensity: 1.3, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false });
    const plate = s.material('#5f6466', { metalness: 0.5, roughness: 0.5 });
    const heater = new THREE.MeshStandardMaterial({ color: '#ffb060', emissive: '#ff6a10', emissiveIntensity: 2.6 * warm });
    const heaterGas = new THREE.MeshStandardMaterial({ color: '#b9a0ff', emissive: '#7040ff', emissiveIntensity: 2.6 });
    const silver = s.material('#d9dcdc', { metalness: 0.9, roughness: 0.15 });
    const lit: THREE.MeshStandardMaterial[] = [glassLit, heater, glassGas, heaterGas];

    const valve = (kind: number, state: 'on' | 'off' | 'gas') => {
      const g = new THREE.Group();
      const put = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => {
        const m = new THREE.Mesh(geometry, material); m.position.y = y; m.castShadow = true; g.add(m); return m;
      };
      const tall = [0.085, 0.066, 0.1][kind];
      put(new THREE.CylinderGeometry(0.0155, 0.0155, 0.02, 14), bakelite, 0.01);
      const profile = kind === 0
        ? [[0.012, 0], [0.0125, 0.02], [0.021, 0.04], [0.021, 0.058], [0.013, 0.076], [0.0001, 0.085]]
        : kind === 1 ? [[0.0145, 0], [0.0145, 0.052], [0.01, 0.063], [0.0001, 0.066]]
          : [[0.014, 0], [0.019, 0.03], [0.019, 0.075], [0.012, 0.094], [0.0001, 0.1]];
      put(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 16), state === 'on' ? glassLit : state === 'gas' ? glassGas : glass, 0.018);
      put(new THREE.CylinderGeometry(0.0075, 0.0075, tall * 0.55, 10), plate, 0.018 + tall * 0.4);
      put(new THREE.CylinderGeometry(0.0035, 0.0035, tall * 0.2, 6), state === 'on' ? heater : state === 'gas' ? heaterGas : plate, 0.018 + tall * 0.74);
      put(new THREE.SphereGeometry(0.008, 10, 6, 0, Math.PI * 2, 0, 1.1), silver, 0.018 + tall - 0.012);
      if (kind === 2) put(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 8), brass, 0.018 + tall + 0.004);
      return g;
    };

    const valveCount = Math.min(6, Math.max(4, Math.round(CW / 0.06)));
    const faulty = Math.floor(random() * valveCount);
    const pulled: THREE.Group[] = [];
    for (let i = 0; i < valveCount; i++) {
      const vx = -CW / 2 + 0.035 + i * ((CW - 0.15) / (valveCount - 1)), vz = -0.035 + (i % 2) * 0.018;
      const kind = Math.floor(random() * 3);
      c.cylinder(0.018, 0.018, 0.006, [vx, CH + 0.005, vz], bakelite, 14);
      const out = stage === 2 && random() < 0.6;
      const state = out || !powered ? 'off' : a.valves === 'one-dead' && i === faulty ? 'off' : a.valves === 'gassy' && i === faulty ? 'gas' : 'on';
      const v = valve(kind, state);
      if (out) pulled.push(v); else { v.position.set(vx, CH + 0.006, vz); v.scale.setScalar(1.35); v.rotation.z = (random() - 0.5) * 0.06; c.root.add(v); }
    }
    // Mains transformer with a copper winding, at the right-hand end.
    c.box([0.07, 0.065, 0.075], [CW / 2 - 0.05, CH + 0.0325, -0.02], dark);
    c.box([0.085, 0.04, 0.05], [CW / 2 - 0.05, CH + 0.035, -0.02], s.material('#a5562a', { metalness: 0.4, roughness: 0.5 }));
    // IF cans and the smoothing capacitor.
    c.box([0.03, 0.06, 0.03], [-CW / 2 + 0.03, CH + 0.03, 0.035], alu);
    c.box([0.03, 0.06, 0.03], [-CW / 2 + 0.075, CH + 0.03, 0.04], alu);
    c.cylinder(0.016, 0.016, 0.075, [CW / 2 - 0.11, CH + 0.0375, -0.045], s.material('#2f5a8a', { roughness: 0.4 }), 14);
    // Tuning capacitor: a gang of half-moon vanes behind the dial.
    const vane = new THREE.CylinderGeometry(0.024, 0.024, 0.0012, 16, 1, false, 0, Math.PI);
    for (let i = 0; i < 9; i++) {
      const m = c.mesh(vane, alu, [0.0, CH + 0.03, 0.018 - i * 0.006]);
      m.rotation.set(Math.PI / 2, 0, i % 2 ? 0.5 : -1.2);
    }
    c.box([0.06, 0.012, 0.062], [0, CH + 0.006, -0.006], steel);
    // The dial glass stands at the front edge, lit from behind when the set is live.
    const pos = { longwave: 0.07, home: 0.34, static: 0.53, shortwave: 0.92, slumped: 0.6 }[a.station];
    const dialTexture = paint(384, 192, (ctx) => {
      ctx.fillStyle = powered ? '#ffe9a8' : '#cdbf96'; ctx.fillRect(0, 0, 384, 192);
      ctx.strokeStyle = '#3a2412'; ctx.fillStyle = '#3a2412'; ctx.lineWidth = 3;
      for (const [row, label] of [[46, 'LW'], [96, 'MW'], [146, 'SW']] as const) {
        ctx.beginPath(); ctx.moveTo(52, row); ctx.lineTo(364, row); ctx.stroke();
        for (let i = 0; i <= 24; i++) { ctx.beginPath(); ctx.moveTo(52 + i * 13, row); ctx.lineTo(52 + i * 13, row - (i % 4 ? 8 : 18)); ctx.stroke(); }
        ctx.font = 'bold 22px monospace'; ctx.fillText(label, 8, row + 4);
      }
      ctx.font = 'bold 15px monospace';
      ['PARIS', 'HOME', 'ROMA', 'OSLO', 'WIEN'].forEach((name, i) => ctx.fillText(name, 60 + i * 62, 68 + (i % 2) * 52));
      ctx.strokeStyle = '#c4201a'; ctx.lineWidth = 7; ctx.beginPath();
      if (a.station === 'slumped') { ctx.moveTo(52 + pos * 312, 10); ctx.lineTo(52 + pos * 312 + 90, 185); }
      else { ctx.moveTo(52 + pos * 312, 6); ctx.lineTo(52 + pos * 312, 186); }
      ctx.stroke();
      if (mood.wear > 0.55) { ctx.strokeStyle = 'rgba(40,30,20,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(250, 80); ctx.lineTo(280, 120); ctx.lineTo(230, 192); ctx.stroke(); }
    });
    const dialW = Math.min(0.17, CW * 0.6), dialH = dialW * 0.5;
    const dialMaterial = new THREE.MeshStandardMaterial({ map: dialTexture, emissiveMap: dialTexture, emissive: '#ffffff', emissiveIntensity: powered ? 0.75 : 0, roughness: 0.3, side: THREE.DoubleSide });
    c.box([dialW + 0.012, dialH + 0.012, 0.006], [0, CH + dialH / 2 + 0.012, CD / 2 + 0.004], brass);
    c.mesh(new THREE.PlaneGeometry(dialW, dialH), dialMaterial, [0, CH + dialH / 2 + 0.012, CD / 2 + 0.0075]);
    // Magic-eye tuning indicator: bright green on a station, dull when lost.
    const tuned = powered && a.station !== 'static' && a.station !== 'slumped';
    c.cylinder(0.011, 0.011, 0.03, [dialW / 2 + 0.03, CH + 0.05, CD / 2 - 0.004], dark, 12).rotation.x = Math.PI / 2;
    c.mesh(new THREE.CircleGeometry(0.009, 16), new THREE.MeshStandardMaterial({ color: powered ? '#58e07a' : '#31403a', emissive: '#30ff70', emissiveIntensity: tuned ? 1.6 : powered ? 0.35 : 0 }), [dialW / 2 + 0.03, CH + 0.05, CD / 2 + 0.0115]);
    // Control shafts, with knobs until they are pulled.
    const knobs: P[] = [];
    for (let i = 0; i < 3; i++) {
      const kx = (i - 1) * CW * 0.34;
      c.rod([kx, CH * 0.5, CD / 2], [kx, CH * 0.5, CD / 2 + 0.04], 0.003, silver);
      if (stage < 2) {
        c.cylinder(0.017, 0.02, 0.016, [kx, CH * 0.5, CD / 2 + 0.04], bakelite, 18).rotation.x = Math.PI / 2;
        c.cylinder(0.008, 0.008, 0.018, [kx, CH * 0.5, CD / 2 + 0.041], brass, 10).rotation.x = Math.PI / 2;
      } else knobs.push([0, 0, 0]);
    }
    // Underside wiring spilling out of the end.
    const wireColours = ['#b8322a', '#d6b530', '#2c5fa8', '#2d7a48', '#1c1c1c'];
    for (let i = 0; i < 3 + Math.floor(mood.density * 4); i++) {
      const z = (random() - 0.5) * CD * 0.8;
      c.tube([[-CW / 2, 0.02, z], [-CW / 2 - 0.02 - random() * 0.03, 0.03 + random() * 0.03, z + (random() - 0.5) * 0.05], [-CW / 2 - 0.03 - random() * 0.05, 0.004, z + (random() - 0.5) * 0.1]], 0.0022, s.material(wireColours[i % 5], { roughness: 0.5 }));
    }
    if (a.note) {
      const words = { glowing: 'HUM?', 'one-dead': 'V3 DEAD', gassy: 'GASSY', dead: 'NO HT' }[a.valves];
      const tag = c.label(words, 0.085, 0.04, [CW / 2 + 0.035, 0.022, 0.05 + random() * 0.03], '#b0221c', '#efe2bd');
      tag.rotation.set(-Math.PI / 2 + 0.25, 0, 0.35 + random() * 0.3);
      c.rod([CW / 2, CH, 0.03], [CW / 2 + 0.02, 0.03, 0.05], 0.0012, paper);
    }
    c.root.position.set(0.1, 0, 0.14);
    c.root.rotation.y = -0.22 + (random() - 0.5) * 0.14;
    s.root.add(c.root);

    // ---- Speaker: still in the cabinet, or unbolted and lying cone-up.
    if (stage >= 1) {
      const sp = new Sculpture(context);
      const R = Math.min(0.085, (round ? gw : gh) * 0.46);
      const cone = sp.mesh(new THREE.LatheGeometry([[0.018, 0.012], [R * 0.5, 0.03], [R * 0.93, 0.05], [R, 0.052]].map(([x, y]) => new THREE.Vector2(x, y)), 28), s.material(mood.wear > 0.6 ? '#6c5a44' : '#3d3a35', { roughness: 0.95, side: THREE.DoubleSide }));
      cone.position.y = 0.02;
      sp.ball([0.02, 0.012, 0.02], [0, 0.034, 0], s.material('#2a2724'), 14);
      sp.ring(R, 0.006, [0, 0.072, 0], steel).rotation.x = Math.PI / 2;
      sp.cylinder(0.034, 0.034, 0.03, [0, 0.015, 0], dark, 18);
      for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + 0.4; sp.rod([Math.cos(t) * 0.03, 0.02, Math.sin(t) * 0.03], [Math.cos(t) * R, 0.07, Math.sin(t) * R], 0.004, steel); }
      if (mood.wear > 0.7) sp.box([R * 0.7, 0.002, 0.006], [R * 0.45, 0.058, 0.01], dark).rotation.set(0, 0.5, 0.35);
      sp.root.position.set(-0.24, 0, 0.15);
      sp.root.rotation.set(0.0, random() * 3, 0);
      s.root.add(sp.root);
      s.tube([[-0.2, 0.03, 0.16], [-0.17, 0.006, 0.22], [-0.12, 0.005, 0.2], [-0.07, 0.02, 0.17]], 0.003, s.material('#6d4a2a', { roughness: 0.9 }));
    } else {
      s.tube([[-0.07, 0.02, 0.17], [-0.2, 0.005, 0.12], [-0.36, 0.005, -0.02], [-0.3, 0.06, -0.24]], 0.003, s.material('#6d4a2a', { roughness: 0.9 }));
    }

    // ---- Small parts set aside in front.
    const sx = 0.3, sz = 0.14;
    const screwSpots: { at: P; size: number }[] = [];
    const screws = 5 + Math.floor(random() * 4) + Math.floor(mood.density * 5);
    if (a.saucer) {
      s.lathe([[0, 0.002], [0.028, 0.002], [0.05, 0.014], [0.052, 0.014], [0.03, 0], [0, 0]], s.material('#e9e6dc', { roughness: 0.25 }), [sx, 0, sz]);
      s.ring(0.05, 0.0015, [sx, 0.014, sz], s.material('#2c5fa8')).rotation.x = Math.PI / 2;
      for (let i = 0; i < screws; i++) { const t = random() * 6.28, r = random() * 0.024; screwSpots.push({ at: [sx + Math.cos(t) * r, 0.007, sz + Math.sin(t) * r], size: 1 }); }
    } else for (let i = 0; i < screws; i++) screwSpots.push({ at: [-0.3 + random() * 0.7, 0.003, 0.22 + random() * 0.1], size: 1 });
    s.scatter(new THREE.CylinderGeometry(0.0045, 0.002, 0.007, 8), brass, screwSpots);
    knobs.forEach((_k, i) => {
      const kx = a.saucer ? sx - 0.09 - i * 0.045 : 0.2 + random() * 0.18, kz = a.saucer ? sz + 0.13 + (random() - 0.5) * 0.02 : 0.24 + random() * 0.08;
      s.cylinder(0.017, 0.02, 0.016, [kx, 0.008, kz], bakelite, 18);
      s.cylinder(0.008, 0.008, 0.018, [kx, 0.009, kz], brass, 10);
    });
    pulled.forEach((v, i) => {
      v.scale.setScalar(1.35); v.rotation.set(0, 0, Math.PI / 2);
      v.rotation.y = 0.3 + (random() - 0.5) * 1.2;
      v.position.set(-0.16 + i * 0.085 + (random() - 0.5) * 0.02, 0.028, 0.3 + (random() - 0.5) * 0.04);
      s.root.add(v);
    });
    // A screwdriver left where it was last put down.
    const driver = new Sculpture(context);
    driver.cylinder(0.011, 0.009, 0.09, [0, 0.011, -0.045], s.material(mood.cheer > 0.5 ? '#c8a11e' : '#8c2a22', { roughness: 0.35 }), 10).rotation.x = Math.PI / 2;
    driver.rod([0, 0.011, 0], [0, 0.011, 0.11], 0.003, silver);
    driver.root.position.set(0.3, 0, 0.0);
    driver.root.rotation.y = 0.5 + random() * 1.5;
    s.root.add(driver.root);

    const energy = mood.energy, phase = random() * 10;
    return s.finish({
      footprint: 0.42,
      update: powered ? (_dt, time) => {
        const f = 1 + Math.sin(time * 9 + phase) * 0.05 * energy + (a.valves === 'gassy' ? Math.sin(time * 23) * 0.25 : 0);
        lit[0].emissiveIntensity = 1.1 * warm * f;
        lit[2].emissiveIntensity = 1.3 * (0.8 + Math.sin(time * 17 + phase) * 0.3);
      } : undefined,
    });
  },
});
