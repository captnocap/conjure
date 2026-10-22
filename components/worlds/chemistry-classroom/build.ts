import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { choice, defineWorld, diorama, mix, noul } from '@conjure/kit';

type P = [number, number, number];
type Inst = { p: P; r?: P; s?: number; c?: THREE.ColorRepresentation };

const BOARDS = {
  equations: 'Rows of chemical equations under an underlined heading.',
  lines: 'One sentence written out over and over for detention.',
  farewell: 'A big goodbye and "have a great summer", with a drawn sun.',
  warning: 'EXPERIMENT IN PROGRESS: DO NOT TOUCH, boxed and underlined twice.',
  homework: 'HOMEWORK with page numbers and a test date.',
  diagram: 'A chalk diagram of apparatus: flask, burner, arrows and labels.',
  blank: 'Wiped clean, with only grey smears.',
} as const;

function boardTexture(kind: keyof typeof BOARDS, base: string, random: () => number, wear: number) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 360;
  const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, 1024, 360);
  for (let i = 0; i < 14 + wear * 30; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + random() * 0.04})`; g.beginPath(); g.ellipse(random() * 1024, random() * 360, 60 + random() * 200, 14 + random() * 40, (random() - 0.5) * 0.6, 0, 7); g.fill(); }
  const chalk = '#f2f0e6', pink = '#f2a0b8', yellow = '#f3e07a';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const text = (t: string, x: number, y: number, size: number, colour = chalk) => { g.fillStyle = colour; g.font = `${size}px "Comic Sans MS", "Segoe Print", cursive`; g.fillText(t, x, y); return x + g.measureText(t).width; };
  const stroke = (pts: number[][], w = 5, colour = chalk) => { g.strokeStyle = colour; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  if (kind === 'equations') {
    const e = text('Acids + Metals', 40, 70, 58, yellow); stroke([[40, 84], [e, 86]], 5, yellow);
    ['Zn + 2HCl → ZnCl₂ + H₂', '2Mg + O₂ → 2MgO', 'CuO + H₂SO₄ → CuSO₄ + H₂O', 'CaCO₃ → CaO + CO₂'].forEach((t, i) => text(t, 60 + (i % 2) * 480, 170 + Math.floor(i / 2) * 110, 46));
    text('pH < 7', 800, 70, 50, pink);
  } else if (kind === 'lines') {
    const t = ['I must not play with the gas taps.', 'I will not talk in class.', 'I must not eat in the laboratory.'][Math.floor(random() * 3)];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) if (i < 5 || j === 0) text(i === 5 ? t.slice(0, 14) : t, 30 + j * 500, 56 + i * 56, 32);
  } else if (kind === 'farewell') {
    text('Goodbye ' + ['4B', '3C', '5A'][Math.floor(random() * 3)] + '!', 80, 150, 130, yellow);
    text('have a great summer  x', 110, 260, 62);
    g.strokeStyle = pink; g.lineWidth = 7; g.beginPath(); g.arc(880, 150, 50, 0, 7); g.stroke();
    for (let i = 0; i < 10; i++) { const t = i * 0.628; stroke([[880 + Math.cos(t) * 66, 150 + Math.sin(t) * 66], [880 + Math.cos(t) * 92, 150 + Math.sin(t) * 92]], 6, pink); }
  } else if (kind === 'warning') {
    stroke([[60, 40], [964, 40], [964, 320], [60, 320], [60, 40]], 8, pink);
    text('EXPERIMENT IN PROGRESS', 110, 140, 66, yellow);
    const e = text('DO NOT TOUCH', 230, 260, 86); stroke([[230, 278], [e, 278]], 6); stroke([[230, 294], [e, 294]], 6);
  } else if (kind === 'homework') {
    const e = text('HOMEWORK', 50, 90, 84, yellow); stroke([[50, 106], [e, 106]], 6, yellow);
    text(`p. ${30 + Math.floor(random() * 150)}  Q1 – ${5 + Math.floor(random() * 6)}`, 70, 190, 60); text('due FRIDAY', 70, 280, 60);
    stroke([[610, 170], [980, 170], [980, 320], [610, 320], [610, 170]], 6, pink); text('TEST MON!', 640, 268, 60, pink);
  } else if (kind === 'diagram') {
    stroke([[260, 40], [260, 120], [180, 250], [400, 250], [320, 120], [320, 40]], 6); stroke([[205, 215], [250, 208], [300, 216], [375, 210]], 5, pink);
    stroke([[170, 270], [410, 270]], 6); stroke([[275, 340], [275, 290], [305, 290], [305, 340]], 6); stroke([[290, 286], [282, 274], [290, 258], [298, 274], [290, 286]], 5, yellow);
    stroke([[420, 180], [520, 150]], 4); text('flask', 530, 160, 44); stroke([[330, 310], [520, 300]], 4); text('bunsen', 530, 312, 44, yellow);
    text('1. heat gently', 720, 90, 40); text('2. observe', 720, 150, 40); text('3. record', 720, 210, 40);
  }
  if (kind !== 'blank' && wear > 0.5) for (let i = 0; i < 4; i++) { g.save(); g.translate(random() * 1024, random() * 360); g.rotate((random() - 0.5)); g.fillStyle = base; g.globalAlpha = 0.6; g.fillRect(-180, -30, 360, 60); g.restore(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default defineWorld({
  questions: {
    era: choice('What era is the laboratory?', {
      victorian: 'Victorian: dark wood panelling, teak benches, brass taps, cream distemper above.',
      thirties: 'Between the wars: green glazed tile dado, black bench tops, chrome fittings.',
      sixties: 'Post-war: pale green and cream gloss paint, blond wood benches, fluorescent tubes.',
      modern: 'Modern: white walls, grey laminate, blue plastic stools, strip lights.',
    }),
    moment: choice('What moment is this?', {
      lesson: 'A practical lesson in full swing: burners lit and glassware on every bench.',
      setup: 'Before the bell: apparatus laid out neatly at each place, stools tucked in.',
      detention: 'Detention: one stool pulled out, one exercise book open, everything else put away.',
      termend: 'The last afternoon of term: stools upturned on the benches, everything cleared.',
      summer: 'Deep in the summer holidays: dust sheets over the benches and nobody for weeks.',
      accident: 'Just after something went wrong: a scorched bench, smoke, foam on the floor, stools knocked over.',
      night: 'After dark: the room dim and blue with one lamp left on at the front.',
    }),
    board: choice('What is on the blackboard?', BOARDS),
    windows: choice('What do the tall windows show?', {
      clear: 'Open sky, with long patches of sun across the floor.',
      rain: 'Grey rain running down the panes.',
      blinds: 'Cream roller blinds pulled half way down, the light coming in under them.',
      trees: 'Green treetops moving just outside.',
      snow: 'White sky and snow heaped on the sills.',
    }),
    floor: choice('What is the floor?', {
      parquet: 'Worn herringbone parquet.',
      lino: 'Red-brown linoleum, polished by decades of feet.',
      tiles: 'Grey vinyl tiles.',
      checker: 'Black and cream chequered tiles.',
    }),
    cupboards: choice('What is in the glass-fronted cupboards?', {
      neat: 'Ordered ranks of brown reagent bottles with white labels.',
      jumble: 'A jumble of coloured jars, flasks and unlabelled powders.',
      sparse: 'Mostly empty shelves with a few dusty bottles.',
      vivid: 'Bright salts and solutions in clear glass: blues, greens, oranges, purples.',
    }),
    wall: choice('What hangs above the board?', {
      periodic: 'A long periodic table chart in coloured blocks.',
      rules: 'A red-bordered LABORATORY RULES notice.',
      portraits: 'A row of framed portraits of dead scientists.',
      bare: 'Nothing but the clock.',
    }),
    lights: noul('Are the lamps switched on?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const night = a.moment === 'night';
    const W = 13, D = 12, WH = 4.2, X0 = -W / 2, Z0 = -D / 2;
    const sky = night ? new THREE.Color('#33436a') : new THREE.Color('#f3d6c2').lerp(new THREE.Color('#cfe5f2'), 1 - Math.abs(mood.daylight - 0.5) * 2).lerp(new THREE.Color('#f0b488'), Math.max(0, mood.daylight - 0.6) * 2);
    if (!night && a.windows === 'rain') sky.set('#a9b3b8');
    if (!night && a.windows === 'snow') sky.set('#eef1f3');
    const floorColour = { parquet: '#a87a4a', lino: '#8a4a36', tiles: '#a9aca8', checker: '#c9c4b0' }[a.floor];
    const background = night ? '#8f97a8' : `#${new THREE.Color('#e6e6dc').lerp(sky, 0.25).getHexString()}`;
    const { art: s, world } = diorama(context, {
      background, floor: floorColour, width: W, depth: D, maxHeight: 2.6, radius: 1.1, pitch: 31, yaw: 31,
      slots: [[0, -3.3, 0.92, 0.72], [-4.9, -3.0, 0, 0.72], [4.9, -2.6, 0, 0.72], [5.0, 1.4, 0, 0.66], [0.1, 4.6, 0, 0.6], [-4.9, 1.2, 0, 0.62], [2.3, -0.35, 0.92, 0.36]],
    });
    if (night) {
      world.keyLight!.intensity = 1.5; world.keyLight!.color.set('#b9c8f2');
      s.root.traverse((n) => { if ((n as THREE.HemisphereLight).isHemisphereLight) (n as THREE.HemisphereLight).intensity = 1.0; });
    }
    const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, list: Inst[]) => {
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(list.length, 1));
      mesh.count = list.length;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      list.forEach((it, i) => {
        q.setFromEuler(e.set(...(it.r ?? [0, 0, 0])));
        m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3().setScalar(it.s ?? 1));
        mesh.setMatrixAt(i, m);
        if (it.c !== undefined) mesh.setColorAt(i, new THREE.Color(it.c));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      s.root.add(mesh);
      return mesh;
    };

    const E = {
      victorian: { wall: '#ddd3b8', dado: '#5a3a24', body: '#6a4428', top: '#33211a', metal: '#b08a3c', stool: '#7a4f2c', board: '#1c1f21', frame: '#4a2f1e' },
      thirties: { wall: '#e6e2d0', dado: '#3f6f5f', body: '#4a4d4a', top: '#17191b', metal: '#cfd5d7', stool: '#8a5a34', board: '#1c1f21', frame: '#2a2c2e' },
      sixties: { wall: '#e9e6d0', dado: '#9bbfa5', body: '#c49a62', top: '#5a3a24', metal: '#cfd5d7', stool: '#c49a62', board: '#2f5a44', frame: '#c49a62' },
      modern: { wall: '#f1f1ee', dado: '#dfe3e6', body: '#e8e8e4', top: '#3a3d42', metal: '#d5dadc', stool: '#2f6fb8', board: '#2f5a44', frame: '#c3c8ca' },
    }[a.era];
    const wall = s.material(E.wall, { roughness: 0.9 }), dado = s.material(E.dado, { roughness: a.era === 'thirties' ? 0.25 : 0.7 });
    const body = s.material(E.body, { roughness: 0.6 }), top = s.material(E.top, { roughness: 0.5 });
    const metal = s.material(E.metal, { metalness: 0.8, roughness: 0.3 });
    const white = s.material('#f1efe8', { roughness: 0.35 }), dark = s.material('#232527', { roughness: 0.7 });
    const frame = s.material(E.frame, { roughness: 0.6 });

    // Floor pattern.
    {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const g = c.getContext('2d')!;
      g.fillStyle = floorColour; g.fillRect(0, 0, 512, 512);
      if (a.floor === 'parquet') { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = `rgba(${40 + random() * 40},20,0,${0.06 + random() * 0.14})`; g.save(); g.translate(x * 32 + 16, y * 32 + 16); g.rotate((x + y) % 2 ? Math.PI / 4 : -Math.PI / 4); g.fillRect(-22, -7, 44, 14); g.restore(); } }
      else if (a.floor === 'checker') { g.fillStyle = '#2a2c2e'; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 2) g.fillRect(x * 32, y * 32, 32, 32); }
      else if (a.floor === 'tiles') { g.strokeStyle = 'rgba(60,60,60,0.3)'; g.lineWidth = 2; for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 512); g.moveTo(0, i * 32); g.lineTo(512, i * 32); g.stroke(); } for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,255,255,${random() * 0.12})`; g.fillRect(Math.floor(random() * 16) * 32, Math.floor(random() * 16) * 32, 32, 32); } }
      else for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,220,190,${random() * 0.08})`; g.beginPath(); g.ellipse(random() * 512, random() * 512, 30 + random() * 80, 10 + random() * 30, random() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < mood.wear * 40; i++) { g.fillStyle = `rgba(30,25,20,${0.05 + random() * 0.12})`; g.beginPath(); g.ellipse(random() * 512, random() * 512, 6 + random() * 40, 5 + random() * 24, random() * 3, 0, 7); g.fill(); }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const f = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: t, roughness: a.floor === 'lino' ? 0.35 : 0.75 }), [0, 0.004, 0]);
      f.rotation.x = -Math.PI / 2;
      f.castShadow = false;
    }

    // Front wall with the board, and the window wall on the left.
    s.box([W, WH, 0.24], [0, WH / 2, Z0 - 0.12], wall);
    s.box([W, 1.2, 0.04], [0, 0.6, Z0 + 0.02], dado);
    s.box([W, 0.07, 0.07], [0, 1.22, Z0 + 0.035], frame);
    const winW = 1.7, winY0 = 1.25, winY1 = 3.75, winZ = [-4.3, -1.45, 1.4, 4.25];
    s.box([0.24, winY0, D], [X0 - 0.12, winY0 / 2, 0], wall);
    s.box([0.04, 1.2, D], [X0 + 0.02, 0.6, 0], dado);
    s.box([0.24, WH - winY1, D], [X0 - 0.12, (WH + winY1) / 2, 0], wall);
    let edge = Z0;
    for (const z of [...winZ, 99]) {
      const to = z === 99 ? D / 2 : z - winW / 2;
      s.box([0.24, winY1 - winY0, to - edge], [X0 - 0.12, (winY0 + winY1) / 2, (to + edge) / 2], wall);
      edge = z + winW / 2;
    }
    // Panes: one painted view shared by every window.
    const pane = (() => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 384;
      const g = c.getContext('2d')!;
      const grad = g.createLinearGradient(0, 0, 0, 384);
      grad.addColorStop(0, `#${sky.clone().multiplyScalar(0.94).getHexString()}`); grad.addColorStop(1, `#${sky.clone().lerp(new THREE.Color('#ffffff'), 0.35).getHexString()}`);
      g.fillStyle = grad; g.fillRect(0, 0, 256, 384);
      if (night) { g.fillStyle = '#f4f1dc'; g.beginPath(); g.arc(180, 90, 26, 0, 7); g.fill(); g.fillStyle = `#${sky.getHexString()}`; g.beginPath(); g.arc(168, 82, 24, 0, 7); g.fill(); }
      if (a.windows === 'trees') for (let i = 0; i < 40; i++) { g.fillStyle = night ? '#1c2a3a' : ['#4f8a4a', '#6aa85a', '#3f7340', '#86b86a'][Math.floor(random() * 4)]; g.beginPath(); g.arc(random() * 256, 220 + random() * 180, 24 + random() * 34, 0, 7); g.fill(); }
      if (a.windows === 'rain') { g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; for (let i = 0; i < 70; i++) { const x = random() * 256, y = random() * 384; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y + 16 + random() * 40); g.stroke(); } }
      if (a.windows === 'snow') { g.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(random() * 256, random() * 384, 1.5 + random() * 3, 0, 7); g.fill(); } g.beginPath(); g.ellipse(128, 392, 170, 46, 0, 0, 7); g.fill(); }
      if (a.windows === 'blinds') { g.fillStyle = night ? '#8a8a84' : '#efe6c8'; g.fillRect(0, 0, 256, 210); g.fillStyle = 'rgba(120,100,60,0.25)'; g.fillRect(0, 200, 256, 10); g.strokeStyle = '#6a5a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(128, 210); g.lineTo(128, 250); g.stroke(); g.beginPath(); g.arc(128, 255, 6, 0, 7); g.stroke(); }
      g.strokeStyle = a.era === 'modern' ? '#7f8a90' : a.era === 'victorian' ? '#4a2f1e' : a.era === 'thirties' ? '#2a2c2e' : '#f6f4ea'; g.lineWidth = 10;
      g.strokeRect(5, 5, 246, 374); g.lineWidth = 7; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 384); g.moveTo(0, 128); g.lineTo(256, 128); g.moveTo(0, 256); g.lineTo(256, 256); g.stroke();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: night ? 0.45 : 0.6, roughness: 0.3 });
      return m;
    })();
    const sunny = !night && (a.windows === 'clear' || a.windows === 'blinds' || a.windows === 'trees');
    const shaft = new THREE.MeshBasicMaterial({ color: night ? '#b9c8f2' : '#fff3c8', transparent: true, opacity: night ? 0.16 : sunny ? mix(0.3, 0.42, mood.cheer) : 0.1, depthWrite: false });
    const reach = mix(2.2, 4.6, Math.abs(mood.daylight - 0.5) * 2), skew = (mood.daylight - 0.5) * 2.4;
    for (const z of winZ) {
      const w = s.mesh(new THREE.PlaneGeometry(winW, winY1 - winY0), pane, [X0 - 0.06, (winY0 + winY1) / 2, z]);
      w.rotation.y = Math.PI / 2;
      w.castShadow = false;
      s.box([0.34, 0.06, winW + 0.16], [X0 + 0.05, winY0 - 0.03, z], a.windows === 'snow' ? white : frame);
      // Radiator under each window.
      s.box([0.12, 0.7, winW - 0.3], [X0 + 0.12, 0.5, z], white);
      inst(new THREE.BoxGeometry(0.14, 0.66, 0.02), dado, Array.from({ length: 9 }, (_u, i) => ({ p: [X0 + 0.125, 0.5, z - 0.6 + i * 0.15] as P })));
      // Light on the floor.
      const lo = a.windows === 'blinds' ? 0.55 : 1;
      const geo = new THREE.BufferGeometry();
      const x0 = X0 + 0.4, x1 = X0 + 0.4 + reach * lo;
      geo.setAttribute('position', new THREE.Float32BufferAttribute([x0, 0.012, z - winW / 2 + skew * 0.2, x0, 0.012, z + winW / 2 + skew * 0.2, x1, 0.012, z + winW / 2 + skew * (0.2 + reach * 0.3), x1, 0.012, z - winW / 2 + skew * (0.2 + reach * 0.3)], 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      const patch = s.mesh(geo, shaft);
      patch.castShadow = patch.receiveShadow = false;
    }

    // Blackboard, clock and what hangs above.
    const bw = 5.2, bh = 1.7, by = 2.3, bz = Z0 + 0.03;
    s.box([bw + 0.2, bh + 0.2, 0.06], [0, by, bz], frame);
    s.mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshStandardMaterial({ map: boardTexture(a.board, E.board, random, mood.wear), roughness: 0.95 }), [0, by, bz + 0.032]).castShadow = false;
    s.box([bw, 0.05, 0.14], [0, by - bh / 2 - 0.08, bz + 0.08], frame);
    inst(new THREE.BoxGeometry(0.1, 0.03, 0.03), s.material('#f2f0e6', { roughness: 1 }), Array.from({ length: 5 }, () => ({ p: [(random() - 0.5) * bw * 0.8, by - bh / 2 - 0.04, bz + 0.09] as P, r: [0, random() * 3, 0] as P, c: ['#f2f0e6', '#f2a0b8', '#f3e07a'][Math.floor(random() * 3)] })));
    s.box([0.24, 0.08, 0.1], [bw * 0.3, by - bh / 2 - 0.02, bz + 0.09], s.material('#6a4a2a'));
    const clockX = a.wall === 'bare' ? 0 : bw / 2 + 0.7;
    const clock = s.cylinder(0.3, 0.3, 0.06, [clockX, 3.65, bz + 0.03], dark, 28);
    clock.rotation.x = Math.PI / 2;
    s.cylinder(0.26, 0.26, 0.062, [clockX, 3.65, bz + 0.034], white, 28).rotation.x = Math.PI / 2;
    const hour = random() * 6.283, hands: THREE.Mesh[] = [];
    for (const [len, ang] of [[0.14, hour], [0.21, hour * 12]] as const) { const hnd = s.box([0.022, len, 0.01], [clockX, 3.65, bz + 0.07], dark); hnd.geometry.translate(0, len / 2, 0); hnd.rotation.z = -ang; hands.push(hnd); }
    if (a.wall === 'periodic') {
      const c = document.createElement('canvas');
      c.width = 720; c.height = 300;
      const g = c.getContext('2d')!;
      g.fillStyle = '#f4f1e4'; g.fillRect(0, 0, 720, 300);
      const hues = ['#e8695a', '#f0a04a', '#f3d55a', '#8fc96a', '#5ab8c8', '#6a8fe0', '#b07ad8'];
      const rows = [[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1], [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]];
      for (let r = 0; r < 7; r++) for (let col = 0; col < 18; col++) if ((rows[r] ?? [])[col] ?? 1) { g.fillStyle = hues[col < 2 ? col : col < 12 ? 2 + (col % 2) : 4 + ((col - 12) >> 1)]; g.globalAlpha = mix(0.55, 1, mood.cheer); g.fillRect(12 + col * 38.8, 14 + r * 39, 35, 35); }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.PlaneGeometry(3.6, 0.72), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), [-0.3, 3.68, bz + 0.012]).castShadow = false;
      s.box([3.64, 0.04, 0.03], [-0.3, 4.05, bz + 0.015], frame);
    } else if (a.wall === 'rules') {
      s.box([2.3, 0.72, 0.03], [-0.3, 3.68, bz], s.material('#c0202a'));
      s.label('LABORATORY RULES', 2.1, 0.26, [-0.3, 3.85, bz + 0.02], '#c0202a', '#f4f1e4').castShadow = false;
      s.label('NO RUNNING · NO EATING · GOGGLES ON', 2.1, 0.2, [-0.3, 3.56, bz + 0.02], '#22262a', '#f4f1e4').castShadow = false;
    } else if (a.wall === 'portraits') {
      for (let i = 0; i < 5; i++) {
        const x = -2.3 + i * 0.95;
        s.box([0.62, 0.76, 0.05], [x, 3.68, bz], s.material(i % 2 ? '#4a2f1e' : '#b08a3c'));
        s.box([0.5, 0.64, 0.052], [x, 3.68, bz + 0.002], s.material(['#6a6a5a', '#7a6a50', '#5a6068'][i % 3]));
        s.ball([0.11, 0.13, 0.02], [x, 3.75, bz + 0.03], s.material('#d9c2a4'), 10);
        s.ball([0.2, 0.14, 0.02], [x, 3.5, bz + 0.03], dark, 10);
      }
    }

    // Glass-fronted cupboards either side of the board.
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d5ecef', transparent: true, opacity: 0.14, roughness: 0.03, depthWrite: false });
    const bottles: { at: P; size: number; color: THREE.ColorRepresentation }[] = [];
    const tints = { neat: ['#6b4320', '#5a3618', '#7a4c24'], jumble: ['#6b4320', '#c9dcd8', '#d8b02a', '#2c4f8a', '#8a3a2a', '#e8e4d6', '#3f8f5a'], sparse: ['#6b4320', '#9a9484', '#c9dcd8'], vivid: ['#1d86d8', '#3fb555', '#f08a24', '#8a45c8', '#e23b3b', '#f3d33b', '#28b8a8'] }[a.cupboards];
    for (const k of [-1, 1]) {
      const cx = k * 4.75, cw = 2.6, ch = 3.0, cd = 0.5, cz = Z0 + cd / 2;
      s.box([cw, 0.9, cd], [cx, 0.45, cz], body);
      s.box([cw + 0.06, 0.05, cd + 0.04], [cx, 0.925, cz], top);
      for (let i = 0; i < 3; i++) { s.box([cw / 3 - 0.06, 0.74, 0.02], [cx - cw / 3 + i * cw / 3, 0.47, cz + cd / 2 + 0.005], frame); }
      s.box([cw, ch - 0.95, 0.04], [cx, (ch + 0.95) / 2, Z0 + 0.02], s.material('#3a3f3c'));
      for (const x of [-1, 1]) s.box([0.05, ch - 0.95, cd - 0.1], [cx + x * (cw / 2 - 0.025), (ch + 0.95) / 2, cz - 0.05], frame);
      s.box([cw + 0.08, 0.1, cd], [cx, ch + 0.05, cz - 0.05], frame);
      for (let i = 0; i < 4; i++) {
        const y = 1.0 + i * 0.5;
        if (i) s.box([cw - 0.1, 0.03, cd - 0.14], [cx, y, cz - 0.05], frame);
        const n = a.cupboards === 'sparse' ? Math.floor(random() * 4) : Math.round(mix(7, 14, mood.density));
        for (let j = 0; j < n; j++) {
          const size = a.cupboards === 'neat' ? 1 : 0.7 + random() * 0.6;
          const x = a.cupboards === 'neat' ? cx - cw / 2 + 0.2 + j * (cw - 0.4) / Math.max(n - 1, 1) : cx - cw / 2 + 0.18 + random() * (cw - 0.36);
          bottles.push({ at: [x, y + 0.015 + 0.16 * size, cz - 0.05 + (random() - 0.5) * 0.1], size, color: new THREE.Color(tints[Math.floor(random() * tints.length)]).lerp(new THREE.Color('#77756c'), (1 - mood.cheer) * 0.3) });
        }
      }
      s.box([cw - 0.1, ch - 1.05, 0.01], [cx, (ch + 0.95) / 2, cz + cd / 2 - 0.1], glass);
      for (let i = 0; i <= 3; i++) s.box([0.05, ch - 0.95, 0.03], [cx - cw / 2 + 0.025 + i * (cw - 0.05) / 3, (ch + 0.95) / 2, cz + cd / 2 - 0.1], frame);
      s.box([cw, 0.05, 0.03], [cx, 0.975, cz + cd / 2 - 0.1], frame);
    }
    if (bottles.length) {
      const bottle = mergeGeometries([new THREE.CylinderGeometry(0.06, 0.06, 0.24, 10).translate(0, -0.04, 0), new THREE.CylinderGeometry(0.025, 0.055, 0.07, 8).translate(0, 0.115, 0), new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8).translate(0, 0.16, 0)])!;
      s.scatter(bottle, new THREE.MeshStandardMaterial({ roughness: 0.25 }), bottles);
      if (a.cupboards === 'neat') s.scatter(new THREE.BoxGeometry(0.08, 0.09, 0.01), white, bottles.map((b) => ({ at: [b.at[0], b.at[1] - 0.04, b.at[2] + 0.062] as P, size: b.size })));
    }

    // Lamps on the front wall.
    const lampOn = a.lights || night;
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: mood.warmth > 0.5 ? '#ffd88a' : '#eaf2ff', emissiveIntensity: lampOn ? 1.6 : 0.05, roughness: 0.4 });
    if (a.era === 'sixties' || a.era === 'modern') {
      for (const x of [-4.4, 0, 4.4]) { s.box([2.4, 0.08, 0.2], [x, 4.02, Z0 + 0.5], white); s.box([2.3, 0.05, 0.12], [x, 3.96, Z0 + 0.5], lampMat).castShadow = false; s.rod([x - 1, 4.02, Z0], [x - 1, 4.02, Z0 + 0.5], 0.015, metal); s.rod([x + 1, 4.02, Z0], [x + 1, 4.02, Z0 + 0.5], 0.015, metal); }
      for (const z of [-2.9, 2.85]) { s.box([0.2, 0.08, 1.8], [X0 + 0.5, 4.02, z], white); s.box([0.12, 0.05, 1.7], [X0 + 0.5, 3.96, z], lampMat).castShadow = false; s.rod([X0, 4.02, z], [X0 + 0.5, 4.02, z], 0.015, metal); }
    } else {
      const spots: P[] = [[-3.3, 3.9, Z0 + 0.55], [3.3, 3.9, Z0 + 0.55], [X0 + 0.55, 3.9, -2.9], [X0 + 0.55, 3.9, 0], [X0 + 0.55, 3.9, 2.85]];
      for (const p of spots) {
        const fromWall: P = p[2] < Z0 + 1 ? [p[0], p[1] + 0.2, Z0] : [X0, p[1] + 0.2, p[2]];
        s.tube([fromWall, [(fromWall[0] + p[0]) / 2, p[1] + 0.32, (fromWall[2] + p[2]) / 2], [p[0], p[1] + 0.2, p[2]]], 0.018, metal);
        s.ball([0.2, 0.2, 0.2], p, lampMat, 14).castShadow = false;
        s.cylinder(0.06, 0.1, 0.08, [p[0], p[1] + 0.2, p[2]], metal, 12);
      }
    }

    // Shared small parts.
    const stoolGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.17, 0.17, 0.045, 14).translate(0, 0.62, 0),
      ...[0, 1, 2, 3].map((i) => new THREE.CylinderGeometry(0.018, 0.018, 0.62, 6).rotateZ(0.13).translate(0.16, 0.31, 0).rotateY(i * Math.PI / 2 + Math.PI / 4)),
      new THREE.TorusGeometry(0.19, 0.012, 6, 16).rotateX(Math.PI / 2).translate(0, 0.2, 0),
    ])!;
    const gasGeo = mergeGeometries([new THREE.CylinderGeometry(0.028, 0.034, 0.13, 8).translate(0, 0.065, 0), new THREE.BoxGeometry(0.2, 0.03, 0.03).translate(0, 0.11, 0), new THREE.BoxGeometry(0.03, 0.03, 0.09).translate(0, 0.15, 0.02)])!;
    const tapGeo = mergeGeometries([new THREE.CylinderGeometry(0.022, 0.026, 0.34, 8).translate(0, 0.17, 0), new THREE.TorusGeometry(0.09, 0.02, 6, 12, Math.PI).rotateY(Math.PI / 2).translate(0, 0.34, 0.09)])!;
    const tripodGeo = mergeGeometries([new THREE.BoxGeometry(0.2, 0.012, 0.2).translate(0, 0.24, 0), ...[0, 1, 2].map((i) => new THREE.CylinderGeometry(0.008, 0.008, 0.25, 5).rotateZ(0.2).translate(0.1, 0.12, 0).rotateY(i * 2.094)), new THREE.CylinderGeometry(0.014, 0.04, 0.16, 8).translate(0, 0.08, 0)])!;
    const stools: Inst[] = [], gas: Inst[] = [], taps: Inst[] = [], tripods: Inst[] = [], beakers: Inst[] = [], flames: Inst[] = [], racks: Inst[] = [], books: Inst[] = [], bags: Inst[] = [];
    const sheets = a.moment === 'summer', BH = 0.92;
    const cloth = s.material('#e9e6da', { roughness: 1 });
    const liquids = ['#1d86d8', '#3fb555', '#f08a24', '#8a45c8', '#e23b3b', '#f3d33b', '#bfe0ea'];
    const stoolColour = () => (a.era === 'modern' ? ['#2f6fb8', '#2f6fb8', '#3f8f5a', '#d8642a'][Math.floor(random() * 4)] : E.stool);

    const bench = (x: number, z: number, w: number, demo: boolean) => {
      const d = demo ? 0.95 : 0.85;
      if (sheets && !demo) {
        const sheet = s.box([w + 0.25, BH + 0.06, d + 0.25], [x, (BH + 0.06) / 2, z], cloth);
        sheet.rotation.y = (random() - 0.5) * 0.03;
        for (let i = 0; i < 4; i++) s.box([0.5 + random() * 0.5, 0.02, d + 0.36], [x - w / 2 + random() * w, 0.012 + random() * 0.3, z], cloth).rotation.z = (random() - 0.5) * 0.2;
        return;
      }
      s.box([w, 0.1, d - 0.1], [x, 0.05, z], dark);
      s.box([w, BH - 0.16, d - 0.04], [x, 0.1 + (BH - 0.16) / 2, z], body);
      s.box([w + 0.08, 0.06, d + 0.06], [x, BH - 0.03, z], top);
      const doors = Math.round(w / 0.85);
      for (let i = 0; i < doors; i++) s.box([w / doors - 0.08, BH - 0.3, 0.02], [x - w / 2 + (i + 0.5) * w / doors, BH / 2 + 0.02, z + (demo ? -1 : 1) * (d / 2 - 0.015)], frame);
      // Sink at one end, gas taps along the middle.
      const sxn = x + (demo ? 1 : x < 0 ? -1 : 1) * (w / 2 - 0.4);
      s.box([0.5, 0.02, 0.42], [sxn, BH + 0.004, z], white);
      s.box([0.42, 0.012, 0.34], [sxn, BH + 0.012, z], s.material('#5f6a6c', { roughness: 0.2 }));
      taps.push({ p: [sxn, BH, z - 0.26], r: [0, 0, 0] });
      const places = demo ? [-0.9, 0.9] : [-0.75, 0.55];
      for (const px of places) gas.push({ p: [x + px + (demo ? 0 : x < 0 ? 0.35 : -0.35) * 0 + (sxn > x ? -0.2 : 0.2), BH, z - (demo ? 0.3 : 0.28)] });
      if (demo) return;
      // Stools and whatever the moment has left on the bench.
      const seats = [-1.2, -0.4, 0.4, 1.2].map((o) => x + o * (w / 3.4));
      seats.forEach((sx0, i) => {
        if (random() < mood.wear * 0.2) return;
        const colour = stoolColour();
        if (a.moment === 'termend') stools.push({ p: [sx0, BH + 0.645, z + (random() - 0.5) * 0.1], r: [Math.PI, random() * 3, 0], c: colour });
        else if (a.moment === 'accident' && Math.abs(x - 2.3) < 0.1 && z < 1) stools.push({ p: [sx0 + (random() - 0.5) * 0.6, 0.17, z + 1.0 + random() * 0.6], r: [Math.PI / 2, 0, random() * 6], c: colour });
        else if (a.moment === 'lesson' || a.moment === 'accident') stools.push({ p: [sx0 + (random() - 0.5) * 0.25, 0, z + 0.7 + random() * 0.35], r: [0, random() * 3, 0], c: colour });
        else if (a.moment === 'detention' && x < 0 && Math.abs(z - 1.9) < 0.1 && i === 2) stools.push({ p: [sx0 + 0.1, 0, z + 1.0], r: [0, 0.6, 0], c: colour });
        else stools.push({ p: [sx0, 0, z + 0.5], r: [0, random() * 3, 0], c: colour });
      });
      if (a.moment === 'lesson' || a.moment === 'setup' || a.moment === 'accident') {
        const live = a.moment !== 'setup';
        for (const o of [-0.95, 0.5]) {
          const ax = x + o + (sxn > x ? -0.15 : 0.35), az = z + (live ? (random() - 0.5) * 0.2 : 0.05);
          tripods.push({ p: [ax, BH, az], r: [0, random() * 3, 0] });
          beakers.push({ p: [ax, BH + 0.33, az], c: liquids[Math.floor(random() * liquids.length)] });
          if (live && random() < 0.85) flames.push({ p: [ax, BH + 0.2, az] });
          racks.push({ p: [ax + 0.42, BH + 0.06, az + (random() - 0.5) * 0.2], r: [0, live ? random() * 3 : 0, 0], c: liquids[Math.floor(random() * liquids.length)] });
          if (live) books.push({ p: [ax - 0.4, BH + 0.012, az + 0.2], r: [0, random() * 3, 0], c: ['#b8322e', '#2f5fa8', '#3f8f5a', '#f1efe8'][Math.floor(random() * 4)] });
          if (live && random() < mood.density) bags.push({ p: [ax + (random() - 0.5) * 0.5, 0.17, z + 0.55 + random() * 0.3], r: [0, random() * 3, 0], c: ['#2c3f6a', '#6a2c2c', '#3a4a3a', '#c8a02a', '#22262a'][Math.floor(random() * 5)] });
        }
      }
      if (a.moment === 'detention' && x < 0 && Math.abs(z - 1.9) < 0.1) { books.push({ p: [seats[2] + 0.05, BH + 0.012, z + 0.15], r: [0, 0.2, 0], c: '#f1efe8' }); bags.push({ p: [seats[2] + 0.5, 0.17, z + 0.9], r: [0, 1, 0], c: '#2c3f6a' }); }
    };
    bench(0, -3.3, 4.6, true);
    for (const z of [-0.35, 1.9, 4.15]) for (const x of [-2.3, 2.3]) bench(x, z, 3.4, false);
    // The teacher's end: a dais edge and a tall stool.
    s.box([6.2, 0.08, 1.9], [0, -0.035 + 0.04, -3.9], frame).position.y = 0.002;
    stools.push({ p: [1.6, 0, -4.15], r: [0, 0.4, 0], c: E.stool });

    inst(stoolGeo, new THREE.MeshStandardMaterial({ roughness: 0.55 }), stools);
    inst(gasGeo, metal, gas);
    inst(tapGeo, metal, taps);
    inst(tripodGeo, dark, tripods);
    inst(new THREE.CylinderGeometry(0.075, 0.075, 0.15, 12), new THREE.MeshStandardMaterial({ roughness: 0.2, emissive: '#ffffff', emissiveIntensity: 0.06 }), beakers);
    const flameMat = new THREE.MeshStandardMaterial({ color: '#4a9cff', emissive: '#4a9cff', emissiveIntensity: 2 });
    const flameMesh = inst(new THREE.ConeGeometry(0.035, 0.12, 8), flameMat, flames);
    flameMesh.castShadow = false;
    inst(mergeGeometries([new THREE.BoxGeometry(0.36, 0.03, 0.1).translate(0, -0.04, 0), new THREE.BoxGeometry(0.36, 0.02, 0.1).translate(0, 0.04, 0), ...[0, 1, 2, 3, 4].map((i) => new THREE.CylinderGeometry(0.018, 0.018, 0.2, 6).translate(-0.13 + i * 0.065, 0.06, 0))])!, new THREE.MeshStandardMaterial({ roughness: 0.4 }), racks);
    inst(new THREE.BoxGeometry(0.36, 0.02, 0.26), new THREE.MeshStandardMaterial({ roughness: 0.9 }), books);
    inst(new THREE.SphereGeometry(0.2, 10, 8).scale(1, 0.85, 0.7), new THREE.MeshStandardMaterial({ roughness: 0.85 }), bags);

    // Moment-specific dressing.
    let lamp: THREE.MeshStandardMaterial | null = null;
    const smoke: THREE.Mesh[] = [];
    if (a.moment === 'accident') {
      const bx = 2.3, bz2 = -0.35;
      s.box([1.5, 0.012, 0.8], [bx - 0.3, BH + 0.006, bz2], s.material('#121110', { roughness: 1 }));
      const soot = s.material('#5a5a58', { roughness: 1 });
      for (let i = 0; i < 12; i++) { const m = s.ball([0.2, 0.2, 0.2], [bx - 0.3 + (random() - 0.5) * 0.8, BH + 0.3 + i * 0.2, bz2 + (random() - 0.5) * 0.4], soot, 8); m.scale.setScalar(0.18 + i * 0.035); m.userData.i = i; m.userData.x = m.position.x; smoke.push(m); }
      const foam = s.material('#f4f4ee', { roughness: 1 });
      s.cylinder(0.9, 0.95, 0.03, [bx - 0.2, 0.02, bz2 + 1.3], foam, 20).scale.z = 0.6;
      for (let i = 0; i < 10; i++) s.ball([0.12 + random() * 0.1, 0.07, 0.12 + random() * 0.1], [bx - 0.9 + random() * 1.5, BH + 0.05, bz2 + (random() - 0.5) * 0.6], foam, 8);
      const ext = s.cylinder(0.1, 0.1, 0.5, [bx + 1.5, 0.1, bz2 + 1.6], s.material('#c0202a', { roughness: 0.35 }), 14);
      ext.rotation.set(Math.PI / 2, 0, 0.7);
      s.cylinder(0.03, 0.05, 0.12, [bx + 1.3, 0.1, bz2 + 1.83], dark, 8).rotation.set(Math.PI / 2, 0, 0.7);
    }
    if (a.moment === 'termend') {
      for (let i = 0; i < Math.round(mix(1, 4, mood.density)); i++) s.box([0.5, 0.36, 0.4], [-5.6 + i * 0.1, 0.18 + (i % 2) * 0.36, 5.0 - Math.floor(i / 2) * 0.55], s.material('#b98d5a', { roughness: 0.95 })).rotation.y = (random() - 0.5) * 0.3;
    }
    if (a.moment === 'summer') {
      s.box([4.9, 1.0, 1.2], [0, 0.5, -3.3], cloth).visible = false;
      const stack = Array.from({ length: 5 }, (_u, i) => ({ p: [5.6, i * 0.2, 5.0] as P, r: [0, i * 0.3, 0] as P, c: stoolColour() }));
      inst(stoolGeo, new THREE.MeshStandardMaterial({ roughness: 0.55 }), stack);
    }
    if (night) {
      lamp = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffc860', emissiveIntensity: 2.2 });
      s.cylinder(0.09, 0.11, 0.03, [-1.9, BH + 0.015, -3.3], dark, 12);
      s.tube([[-1.9, BH + 0.02, -3.3], [-1.95, BH + 0.4, -3.3], [-1.7, BH + 0.5, -3.3]], 0.014, metal);
      s.mesh(new THREE.ConeGeometry(0.14, 0.16, 12, 1, true), s.material('#2f6f4a', { side: THREE.DoubleSide }), [-1.68, BH + 0.48, -3.3]);
      s.ball([0.06, 0.06, 0.06], [-1.68, BH + 0.43, -3.3], lamp, 8).castShadow = false;
      const poolMat = new THREE.MeshBasicMaterial({ color: '#ffd88a', transparent: true, opacity: 0.4, depthWrite: false });
      const pool = s.cylinder(0.7, 0.7, 0.004, [-1.6, BH + 0.004, -3.3], poolMat, 20);
      pool.castShadow = pool.receiveShadow = false;
    }

    const speed = mix(4, 16, mood.energy);
    world.update = (_dt, time) => {
      flameMat.emissiveIntensity = 1.6 + Math.sin(time * speed) * 0.4 + Math.sin(time * speed * 2.3) * 0.25;
      hands[1].rotation.z = -hour * 12 - time * 0.02;
      smoke.forEach((m) => { const t = ((time * mix(0.05, 0.25, mood.energy) + m.userData.i / 12) % 1); m.position.y = BH + 0.3 + t * 2.6; m.position.x = m.userData.x + Math.sin(t * 5 + m.userData.i) * 0.2; m.scale.setScalar(0.16 + t * 0.5); });
      if (lamp) lamp.emissiveIntensity = 2.2 + Math.sin(time * 1.3) * 0.1;
    };
    return world;
  },
});
