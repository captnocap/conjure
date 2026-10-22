import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, diorama, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];
const W = 6.6, D = 5.6, H = 3.4, BACK = -D / 2, LEFT = -W / 2;
const COLS = 6, ROWS = 3, PITCH_X = 0.8, PITCH_Y = 0.68, BANK_Y = 0.16, FRONT = BACK + 0.56;
const SIGNS = { county: 'COUNTY MORGUE', quiet: 'QUIET PLEASE', smoking: 'NO SMOKING', hands: 'WASH YOUR HANDS', ring: 'RING BELL FOR ATTENDANT', none: '' } as const;
/** x, z, standing height, tallest allowed, widest radius allowed, largest scale. */
const SLOTS: [number, number, number, number, number, number][] = [
  [0, 1.1, 0.93, 1.3, 0.8, 3.2],
  [-2.1, -0.1, 0.86, 1.15, 0.62, 2.6],
  [2.1, -0.1, 0.86, 1.15, 0.62, 2.6],
  [-1.95, 2.15, 0, 1.6, 0.55, 2],
  [1.95, 2.15, 0, 1.6, 0.55, 2],
];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const hex = (c: THREE.Color) => `#${c.getHexString()}`;

export default defineWorld({
  questions: {
    era: choice('What era and kind of cold room is it?', {
      fifties: 'A 1950s county morgue: seafoam green tile, stainless drawers, a round wall clock.',
      twenties: 'A 1920s mortuary: white tile with a black band, oak ice-box doors with brass latches.',
      seventies: 'A 1970s hospital: mustard-beige tile, brushed steel, an orange stripe and a square clock.',
      basement: 'A makeshift basement: painted brick, chipped white enamel doors, exposed pipes.',
    }),
    open: choice('How many drawers stand open?', {
      none: 'None: every door latched.',
      one: 'One, its tray pulled out.',
      three: 'Three, a busy night.',
      most: 'Most of the wall stands open, trays out like a filing cabinet being searched.',
    }),
    pushed: noul('Has one drawer been pushed open from the inside, a sheet dragged to the floor and wet footprints leading away?'),
    left: choice('What did the night shift leave out by the wall?', {
      nothing: 'Nothing: the room is squared away.',
      mop: 'A mop, a wringer bucket and a yellow wet-floor sign.',
      lunch: 'A chair with a thermos, a half-eaten sandwich and a folded newspaper.',
      paperwork: 'A steel desk with a typewriter, a green lamp and a stack of forms.',
      radio: 'A chair with a coat over the back and a transistor radio playing to nobody.',
      cards: 'A card game on an upturned crate, one more hand dealt than there are stools.',
    }),
    clock: choice('What does the wall clock say?', {
      midnight: 'Midnight exactly.',
      three: 'Ten past three, the dead of night.',
      six: 'Nearly six: the shift is almost over.',
      stopped: 'Stopped and cracked, hanging crooked.',
    }),
    light: choice('What lights the room?', {
      tube: 'A single buzzing fluorescent tube over the drawers.',
      pair: 'Two fluorescent tubes, bright and even.',
      lamp: 'A round surgical lamp on a stand over the table, as well as a tube.',
    }),
    floor: choice('What is the floor?', {
      terrazzo: 'Pale speckled terrazzo.',
      checker: 'Pale grey and white checker tile.',
      concrete: 'Sealed grey concrete with a painted border.',
      green: 'Sheet linoleum in institutional green.',
    }),
    wet: noul('Has the floor just been hosed down, with puddles standing around the drain?'),
    sign: choice('What does the sign on the wall say?', {
      county: 'COUNTY MORGUE', quiet: 'QUIET PLEASE', smoking: 'NO SMOKING', hands: 'WASH YOUR HANDS', ring: 'RING BELL FOR ATTENDANT', none: 'There is no sign.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const { art: s, world } = diorama(context, {
      background: '#e3e8e3', floor: '#d2d2ca', width: W, depth: D, maxHeight: 1, radius: 0.6, pitch: 23, yaw: 9,
      slots: SLOTS.map(([x, z]) => [x, z] as const),
    });
    const wear = mood.wear, grim = 1 - mood.cheer;
    const pal = {
      fifties: { tile: '#8fbf9f', grout: '#6f9a80', plaster: '#cdd3c4', door: '#b9c3c6', frame: '#8f9b9f', trim: '#5f8a72', handle: '#7c888c' },
      twenties: { tile: '#c9cac2', grout: '#8f928a', plaster: '#cfccbf', door: '#9a7448', frame: '#6e5030', trim: '#2c2f33', handle: '#c9a44e' },
      seventies: { tile: '#c9b27a', grout: '#9c8a5c', plaster: '#d3cfbf', door: '#c3c6c2', frame: '#9a9d98', trim: '#d9792b', handle: '#6f7476' },
      basement: { tile: '#a3b0b6', grout: '#7f8b90', plaster: '#bfc3bb', door: '#e4e4da', frame: '#a9aaa0', trim: '#7e8f98', handle: '#6f6f68' },
    }[a.era];
    const tileBase = new THREE.Color(pal.tile).lerp(new THREE.Color('#a9ada6'), grim * 0.3);
    const metal = a.era !== 'twenties';
    const doorM = s.material(pal.door, metal ? { metalness: a.era === 'basement' ? 0.05 : 0.5, roughness: 0.42 } : { roughness: 0.6 });
    const frameM = s.material(pal.frame, { metalness: metal ? 0.45 : 0, roughness: 0.5 });
    const handleM = s.material(pal.handle, { metalness: 0.7, roughness: 0.35 });
    const steel = s.material('#b5bfc2', { metalness: 0.55, roughness: 0.38 });
    const steelDark = s.material('#7d898d', { metalness: 0.5, roughness: 0.5 });
    const black = s.material('#22262a', { roughness: 0.7 });
    const white = s.material('#d9d9d2', { roughness: 0.95 });
    const sheetM = s.material('#c2c2bc', { roughness: 1 });
    const rust = s.material('#8a5a34', { roughness: 0.95 });
    const plaster = s.material(pal.plaster, { roughness: 0.95 });
    const trimM = s.material(pal.trim, { roughness: 0.6 });

    // Floor texture on the stage itself.
    const floorTint = { terrazzo: '#b9b7ab', checker: '#bdbdb5', concrete: '#a3a5a0', green: '#8fb093' }[a.floor];
    const floorTex = paint(1024, 1024, (ctx) => {
      ctx.fillStyle = floorTint; ctx.fillRect(0, 0, 1024, 1024);
      if (a.floor === 'terrazzo') {
        for (let i = 0; i < 2600; i++) { ctx.fillStyle = ['#b9b5a6', '#e9e6dc', '#a7aba6', '#c4b6a4'][Math.floor(random() * 4)]; ctx.fillRect(random() * 1024, random() * 1024, 2 + random() * 5, 2 + random() * 4); }
        ctx.strokeStyle = 'rgba(150,140,110,0.6)'; ctx.lineWidth = 3;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 256, 0); ctx.lineTo(i * 256, 1024); ctx.moveTo(0, i * 256); ctx.lineTo(1024, i * 256); ctx.stroke(); }
      } else if (a.floor === 'checker') {
        for (let x = 0; x < 16; x++) for (let y = 0; y < 14; y++) { ctx.fillStyle = (x + y) % 2 ? '#8f9996' : '#c9c9c1'; ctx.fillRect(x * 64 + 1, y * 74 + 1, 62, 72); }
      } else if (a.floor === 'concrete') {
        for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '90,95,95' : '225,225,220'},0.12)`; ctx.beginPath(); ctx.arc(random() * 1024, random() * 1024, 4 + random() * 30, 0, 7); ctx.fill(); }
        ctx.strokeStyle = '#d9c24a'; ctx.lineWidth = 14; ctx.strokeRect(60, 60, 904, 904);
      } else {
        ctx.strokeStyle = 'rgba(80,110,85,0.35)'; ctx.lineWidth = 3;
        for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 341, 0); ctx.lineTo(i * 341, 1024); ctx.stroke(); }
        for (let i = 0; i < 900; i++) { ctx.fillStyle = 'rgba(235,240,230,0.35)'; ctx.fillRect(random() * 1024, random() * 1024, 3, 2); }
      }
      // Wear: scuffs, trolley tracks and old stains.
      for (let i = 0; i < wear * 46; i++) { ctx.fillStyle = `rgba(${random() < 0.4 ? '120,80,50' : '70,75,72'},${0.1 + random() * 0.18})`; ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 1024, 10 + random() * 60, 6 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
      if (a.wet) {
        const g = ctx.createRadialGradient(650, 760, 20, 650, 760, 420);
        g.addColorStop(0, 'rgba(70,90,95,0.42)'); g.addColorStop(1, 'rgba(70,90,95,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
      }
    });
    const groundMat = (world.ground as THREE.Mesh).material as THREE.MeshStandardMaterial;
    groundMat.map = floorTex; groundMat.color.set('#ffffff'); groundMat.roughness = a.wet ? 0.35 : 0.8;

    // Tiled walls, each tile painted once so cracks and missing tiles never repeat.
    const wallTex = (cols: number, rows: number) => paint(cols * 32, rows * 32, (ctx) => {
      ctx.fillStyle = pal.grout; ctx.fillRect(0, 0, cols * 32, rows * 32);
      const brick = a.era === 'basement';
      for (let y = 0; y < rows; y++) for (let x = -1; x < cols; x++) {
        const c = tileBase.clone().offsetHSL(0, 0, (random() - 0.5) * 0.045);
        const roll = random();
        if (roll < wear * 0.07) c.set('#9a9c92');
        else if (roll < wear * 0.2) c.lerp(new THREE.Color('#b0a27c'), 0.45);
        if (brick && y >= rows - 4) c.lerp(new THREE.Color('#7e8f98'), 0.55);
        ctx.fillStyle = hex(c);
        if (brick) ctx.fillRect(x * 32 + (y % 2) * 16 + 1, y * 32 + 1, 30, 30 / 2 - 1), ctx.fillRect(x * 32 + ((y + 1) % 2) * 16 + 1, y * 32 + 17, 30, 14);
        else ctx.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
      }
      if (a.era === 'twenties') { ctx.fillStyle = '#2c2f33'; ctx.fillRect(0, 32, cols * 32, 20); }
      if (a.era === 'seventies') { ctx.fillStyle = pal.trim; ctx.fillRect(0, 64, cols * 32, 32); }
      // Grime runs down from the top with wear.
      for (let i = 0; i < wear * 26; i++) { const x = random() * cols * 32; ctx.fillStyle = `rgba(95,85,60,${0.12 + random() * 0.14})`; ctx.fillRect(x, random() * rows * 12, 3 + random() * 7, 40 + random() * rows * 14); }
    });
    const tileH = 2.56;
    s.box([W + 0.2, H, 0.2], [-0.1, H / 2, BACK - 0.1], plaster);
    s.box([0.2, H, D], [LEFT - 0.1, H / 2, 0], plaster);
    s.mesh(new THREE.PlaneGeometry(W, tileH), new THREE.MeshStandardMaterial({ map: wallTex(33, 13), roughness: 0.45 }), [0, tileH / 2, BACK + 0.004]);
    const sideTiles = s.mesh(new THREE.PlaneGeometry(D, tileH), new THREE.MeshStandardMaterial({ map: wallTex(28, 13), roughness: 0.45 }), [LEFT + 0.004, tileH / 2, 0]);
    sideTiles.rotation.y = Math.PI / 2;
    s.box([W, 0.07, 0.035], [0, tileH + 0.035, BACK + 0.018], trimM);
    s.box([0.035, 0.07, D], [LEFT + 0.018, tileH + 0.035, 0], trimM);
    s.box([W, 0.12, 0.03], [0, 0.06, BACK + 0.015], trimM);
    s.box([0.03, 0.12, D], [LEFT + 0.015, 0.06, 0], trimM);

    // The drawer bank.
    const bankW = COLS * PITCH_X + 0.16, bankH = ROWS * PITCH_Y + 0.14;
    s.box([bankW, bankH, 0.56], [0, BANK_Y + bankH / 2 - 0.05, BACK + 0.28], frameM);
    s.box([bankW + 0.08, 0.08, 0.6], [0, BANK_Y + bankH - 0.05, BACK + 0.3], frameM);
    s.box([bankW + 0.04, BANK_Y - 0.04, 0.5], [0, (BANK_Y - 0.04) / 2, BACK + 0.25], black);
    const doorAt = (col: number, row: number): V3 => [(col - (COLS - 1) / 2) * PITCH_X, BANK_Y + 0.05 + row * PITCH_Y + PITCH_Y / 2 - 0.02, FRONT];
    const total = COLS * ROWS;
    const openCount = { none: 0, one: 1, three: 3, most: 9 + Math.floor(random() * 4) }[a.open];
    const order = Array.from({ length: total }, (_u, i) => i).sort(() => random() - 0.5);
    const pushedIndex = a.pushed ? COLS + 2 + Math.floor(random() * 2) : -1;
    const isOpen = new Set(order.filter((i) => i !== pushedIndex).slice(0, openCount));
    if (pushedIndex >= 0) isOpen.add(pushedIndex);
    const DW = 0.72, DH = 0.58;
    const closed = total - isOpen.size;
    const leafGeo = new THREE.BoxGeometry(DW, DH, 0.05), handleGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06);
    const leaves = new THREE.InstancedMesh(leafGeo, doorM, Math.max(1, closed)), handles = new THREE.InstancedMesh(handleGeo, handleM, Math.max(1, closed));
    leaves.count = handles.count = closed;
    leaves.castShadow = leaves.receiveShadow = handles.castShadow = true;
    s.root.add(leaves, handles);
    const plates = paint(COLS * 64, ROWS * 40, (ctx) => {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 30px monospace';
      for (let i = 0; i < total; i++) {
        const x = (i % COLS) * 64, y = Math.floor(i / COLS) * 40;
        ctx.fillStyle = a.era === 'twenties' ? '#d8bb6a' : a.era === 'basement' ? '#2b2f33' : '#f1eedf'; ctx.fillRect(x, y, 64, 40);
        ctx.fillStyle = a.era === 'basement' ? '#f1eedf' : '#20252a';
        // Numbering runs along each row from the top; a worn room has lost a plate or two.
        const n = (ROWS - 1 - Math.floor(i / COLS)) * COLS + (i % COLS) + 1;
        if (random() > wear * 0.18) ctx.fillText(String(n), x + 32, y + 22);
      }
    });
    const plateMat = new THREE.MeshStandardMaterial({ map: plates, roughness: 0.7 });
    const plateGeo = (i: number) => {
      const g = new THREE.PlaneGeometry(0.17, 0.105);
      const uv = g.attributes.uv as THREE.BufferAttribute, c = i % COLS, r = Math.floor(i / COLS);
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (c + uv.getX(k)) / COLS, 1 - (r + 1 - uv.getY(k)) / ROWS);
      return g;
    };
    const matrix = new THREE.Matrix4();
    let slot = 0;
    const trayEnds: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < total; i++) {
      const col = i % COLS, row = Math.floor(i / COLS), [x, y, z] = doorAt(col, row);
      if (!isOpen.has(i)) {
        leaves.setMatrixAt(slot, matrix.makeTranslation(x, y, z + 0.025));
        handles.setMatrixAt(slot++, matrix.makeTranslation(x + DW / 2 - 0.09, y, z + 0.075));
        s.mesh(plateGeo(i), plateMat, [x - 0.17, y + 0.16, z + 0.052]);
        if (wear > 0.3 && random() < wear * 0.7) s.box([0.02 + random() * 0.03, 0.12 + random() * 0.2, 0.004], [x + DW / 2 - 0.09 + (random() - 0.5) * 0.04, y - 0.2, z + 0.052], rust);
        continue;
      }
      const pushed = i === pushedIndex;
      s.box([DW - 0.04, DH - 0.04, 0.02], [x, y, z - 0.02], black);
      const door = new THREE.Group();
      door.position.set(x - DW / 2, y, z + 0.03);
      door.rotation.y = -(pushed ? 2.3 + random() * 0.3 : 1.55 + random() * 0.5);
      const leaf = new THREE.Mesh(leafGeo, doorM); leaf.position.x = DW / 2;
      const handle = new THREE.Mesh(handleGeo, handleM); handle.position.set(DW - 0.09, 0, 0.05);
      const plate = new THREE.Mesh(plateGeo(i), plateMat); plate.position.set(DW / 2 - 0.17, 0.16, 0.027);
      door.add(leaf, handle, plate);
      door.traverse((m) => { m.castShadow = m.receiveShadow = true; });
      s.root.add(door);
      const pull = pushed ? 1.25 : 0.75 + random() * 0.6;
      const tray = new THREE.Group();
      tray.position.set(x, y - DH / 2 + 0.07, z - 0.5);
      if (pushed) tray.rotation.y = (random() - 0.5) * 0.2;
      const add = (mesh: THREE.Mesh, at: V3) => { mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; tray.add(mesh); return mesh; };
      add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 1.9), steel), [0, 0, pull - 0.45]);
      for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 1.9), steel), [sx * 0.31, 0.03, pull - 0.45]);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.02), steel), [0, 0.03, pull + 0.5]);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.05), steelDark), [0, 0, pull + 0.535]);
      if (!pushed && random() < 0.6) {
        const ball = new THREE.SphereGeometry(1, 16, 10);
        add(new THREE.Mesh(ball, sheetM), [0, 0.03, pull - 0.25]).scale.set(0.25, 0.17 + random() * 0.06, 0.62);
        add(new THREE.Mesh(ball, sheetM), [0, 0.06, pull - 0.85]).scale.set(0.12, 0.13, 0.14);
        for (const sx of [-1, 1]) add(new THREE.Mesh(ball, sheetM), [sx * 0.08, 0.07, pull + 0.36]).scale.set(0.06, 0.13, 0.07);
        if (random() < 0.5) add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.004), s.material('#e6d49c')), [0.17, 0.12, pull + 0.4]).rotation.z = 0.3;
      } else if (pushed) {
        add(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.025, 0.5), sheetM), [0.03, 0.03, pull + 0.2]).rotation.y = 0.2;
      }
      s.root.add(tray);
      trayEnds.push({ x, y: y - DH / 2 + 0.07, z: z - 0.5 + pull + 0.5 });
      if (pushed) {
        // The sheet pours off the end of the tray and trails across the floor.
        const end = trayEnds[trayEnds.length - 1];
        s.box([0.52, end.y, 0.03], [end.x + 0.03, end.y / 2, end.z + 0.03], sheetM).rotation.z = 0.04;
        const trail = s.box([0.6, 0.03, 0.95], [end.x + 0.12, 0.016, end.z + 0.48], sheetM);
        trail.rotation.y = -0.3;
        s.ball([0.2, 0.06, 0.24], [end.x + 0.25, 0.04, end.z + 0.85], sheetM, 12);
        const tag = s.label('?', 0.14, 0.08, [end.x - 0.32, 0.012, end.z + 0.4], '#2a2420', '#ead9a6');
        tag.rotation.set(-Math.PI / 2, 0, 0.5);
        // Wet bare footprints, round the table and out past the camera.
        const wetM = s.material('#43575b', { roughness: 0.25 });
        const way: [number, number][] = [[end.x + 0.25, end.z + 1.0], [1.08, 0.42], [1.12, 1.5], [1.3, 2.7]];
        const path = new THREE.CatmullRomCurve3(way.map(([px, pz]) => new THREE.Vector3(px, 0, pz)));
        const steps = 13;
        for (let k = 0; k < steps; k++) {
          const u = (k + 0.3) / steps, p = path.getPoint(u), t = path.getTangent(u), side = k % 2 ? 1 : -1;
          const ang = Math.atan2(t.x, t.z);
          const fx = p.x + Math.cos(ang) * side * 0.1, fz = p.z - Math.sin(ang) * side * 0.1;
          const fade = 1 - u * 0.45;
          const sole = s.ball([0.065 * fade, 0.004, 0.135 * fade], [fx, 0.004, fz], wetM, 10);
          sole.rotation.y = ang + side * 0.12; sole.castShadow = false;
          s.ball([0.058 * fade, 0.004, 0.05 * fade], [fx + Math.sin(ang) * 0.13, 0.004, fz + Math.cos(ang) * 0.13], wetM, 8).castShadow = false;
        }
      }
    }
    leaves.instanceMatrix.needsUpdate = handles.instanceMatrix.needsUpdate = true;

    // Clock, sign and lights on the wall above the bank.
    const clockAngle = a.clock === 'stopped' ? 0.22 : 0;
    const clock = new THREE.Group();
    clock.position.set(-1.7, 2.98, BACK + 0.05);
    clock.rotation.z = clockAngle;
    const square = a.era === 'seventies';
    const rim = new THREE.Mesh(square ? new THREE.BoxGeometry(0.5, 0.5, 0.08) : new THREE.CylinderGeometry(0.27, 0.27, 0.08, 32), a.era === 'twenties' ? s.material('#5b3a26') : black);
    if (!square) rim.rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(square ? new THREE.PlaneGeometry(0.44, 0.44) : new THREE.CircleGeometry(0.24, 32), new THREE.MeshStandardMaterial({
      roughness: 0.6,
      map: paint(256, 256, (ctx) => {
        ctx.fillStyle = '#f5f2e6'; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#1c2024'; ctx.lineCap = 'round';
        for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; ctx.lineWidth = i % 3 ? 4 : 9; ctx.beginPath(); ctx.moveTo(128 + Math.sin(t) * 98, 128 - Math.cos(t) * 98); ctx.lineTo(128 + Math.sin(t) * 114, 128 - Math.cos(t) * 114); ctx.stroke(); }
        const [hour, minute] = { midnight: [12, 0], three: [3, 10], six: [5, 52], stopped: [3 + Math.floor(random() * 8), Math.floor(random() * 60)] }[a.clock];
        const hand = (turn: number, length: number, width: number) => { ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(turn * Math.PI * 2) * length, 128 - Math.cos(turn * Math.PI * 2) * length); ctx.stroke(); };
        hand((hour + minute / 60) / 12, 58, 12); hand(minute / 60, 92, 8);
        if (a.clock === 'stopped') { ctx.lineWidth = 3; ctx.strokeStyle = '#555'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(90, 60); ctx.lineTo(90 + (random() - 0.3) * 240, 60 + random() * 200); ctx.stroke(); } }
      }),
    }));
    face.position.z = 0.045;
    clock.add(rim, face);
    s.root.add(clock);
    if (a.sign !== 'none') {
      const text = SIGNS[a.sign];
      const sign = s.label(text, Math.min(2.3, 0.3 + text.length * 0.1), 0.3, [1.35, 2.98, BACK + 0.03], a.era === 'twenties' ? '#f1ead2' : '#23303a', a.era === 'twenties' ? '#2c2f33' : '#f1ead2');
      sign.rotation.z = wear > 0.6 ? -0.04 : 0;
    }
    const tubes: THREE.MeshStandardMaterial[] = [];
    const tubeAt = (x: number, tilt: number) => {
      const glow = new THREE.MeshStandardMaterial({ color: '#f6fff4', emissive: new THREE.Color('#eaffe6').lerp(new THREE.Color('#fff3cf'), mood.warmth * 0.6), emissiveIntensity: 1.1 });
      tubes.push(glow);
      const fixture = new THREE.Group();
      fixture.position.set(x, 3.28, BACK + 0.2); fixture.rotation.z = tilt;
      const housing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.2), white), tube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.46, 10), glow);
      tube.rotation.z = Math.PI / 2; tube.position.set(0, -0.06, 0.03);
      fixture.add(housing, tube);
      for (const sx of [-1, 1]) { const cap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.08), steelDark); cap.position.set(sx * 0.75, -0.05, 0.03); fixture.add(cap); }
      s.root.add(fixture);
    };
    if (a.light === 'pair') { tubeAt(-0.1 - 0.9, 0); tubeAt(0.9 + 1.9, 0); } else tubeAt(0.35, wear > 0.55 ? -0.035 : 0);
    if (a.era === 'basement' || wear > 0.7) {
      const pipe = s.material('#8d9698', { metalness: 0.4, roughness: 0.6 });
      s.rod([LEFT, 2.74, BACK + 0.1], [W / 2, 2.74, BACK + 0.1], 0.04, pipe);
      s.rod([2.75, 2.74, BACK + 0.1], [2.75, 0, BACK + 0.1], 0.04, pipe);
      for (const x of [-2.6, -0.4, 1.9]) s.cylinder(0.055, 0.055, 0.06, [x, 2.74, BACK + 0.1], steelDark, 10).rotation.z = Math.PI / 2;
    }

    // The table for the hero and two gurneys.
    const stand = (build: (p: Sculpture) => void, at: V3, turn = 0) => {
      const piece = new Sculpture(context);
      build(piece);
      piece.root.position.set(...at); piece.root.rotation.y = turn;
      s.root.add(piece.root);
    };
    const [tx, tz] = SLOTS[0];
    stand((p) => {
      p.box([2.0, 0.06, 0.86], [0, 0.88, 0], steel);
      for (const z of [-1, 1]) p.box([2.0, 0.05, 0.03], [0, 0.925, z * 0.415], steel);
      for (const x of [-1, 1]) p.box([0.03, 0.05, 0.86], [x * 0.985, 0.925, 0], steel);
      p.box([0.5, 0.78, 0.36], [0, 0.46, 0], steelDark);
      p.box([0.95, 0.07, 0.6], [0, 0.035, 0], steelDark);
      p.rod([0.6, 0.85, 0.2], [0.6, 0.02, 0.4], 0.02, black);
      p.cylinder(0.05, 0.05, 0.06, [-0.86, 0.94, -0.3], steelDark, 12);
    }, [tx, 0, tz], (random() - 0.5) * 0.05);
    for (const index of [1, 2]) {
      const [gx, gz] = SLOTS[index];
      stand((p) => {
        p.box([1.75, 0.04, 0.66], [0, 0.8, 0], steel);
        p.box([1.66, 0.04, 0.58], [0, 0.84, 0], p.material('#a9bdb2', { roughness: 0.9 }));
        p.box([1.5, 0.02, 0.5], [0, 0.3, 0], steel);
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          p.rod([x * 0.78, 0.8, z * 0.28], [x * 0.78, 0.1, z * 0.28], 0.016, steelDark);
          p.cylinder(0.055, 0.055, 0.035, [x * 0.78, 0.055, z * 0.28], black, 12).rotation.x = Math.PI / 2;
        }
        const end = index === 1 ? -1 : 1;
        p.tube([[end * 0.87, 0.8, -0.28], [end * 1.02, 0.98, -0.28], [end * 1.02, 0.98, 0.28], [end * 0.87, 0.8, 0.28]], 0.014, steelDark);
      }, [gx, 0, gz], (random() - 0.5) * 0.14);
    }

    // Floor drain, puddles and the hose.
    const drain: V3 = [0.86, 0.004, 1.95];
    s.cylinder(0.16, 0.16, 0.008, drain, steelDark, 24);
    for (let i = -2; i <= 2; i++) s.box([0.24 - Math.abs(i) * 0.04, 0.004, 0.022], [drain[0], 0.01, drain[2] + i * 0.05], black);
    if (a.wet) {
      const water = new THREE.MeshStandardMaterial({ color: '#8fa6aa', transparent: true, opacity: 0.4, roughness: 0.03, depthWrite: false });
      for (let i = 0; i < 6; i++) {
        const puddle = s.cylinder(1, 1, 0.004, [drain[0] + (random() - 0.5) * 2.6, 0.006, drain[2] + (random() - 0.6) * 1.6], water, 20);
        puddle.scale.set(0.2 + random() * 0.45, 1, 0.14 + random() * 0.3); puddle.castShadow = false;
      }
      const hose = s.material('#3f6b4a', { roughness: 0.6 });
      for (let i = 0; i < 3; i++) s.ring(0.19 + i * 0.012, 0.022, [LEFT + 0.07 + i * 0.03, 1.15, -1.75], hose).rotation.y = Math.PI / 2;
      s.tube([[LEFT + 0.1, 0.97, -1.75], [LEFT + 0.25, 0.3, -1.6], [LEFT + 0.6, 0.03, -1.3], [LEFT + 1.0, 0.03, -1.45]], 0.022, hose);
    }

    // Left wall: sink and the door out.
    stand((p) => {
      p.box([0.46, 0.24, 0.7], [0.25, 0.82, 0], steel);
      p.box([0.38, 0.03, 0.6], [0.25, 0.935, 0], steelDark);
      p.box([0.04, 0.5, 0.7], [0.03, 1.1, 0], steel);
      p.tube([[0.05, 1.12, 0], [0.2, 1.22, 0], [0.26, 1.08, 0]], 0.016, handleM);
      for (const z of [-1, 1]) p.rod([0.42, 0.7, z * 0.3], [0.42, 0, z * 0.3], 0.018, steelDark);
      p.rod([0.2, 0.7, 0], [0.08, 0.1, 0], 0.03, steelDark);
    }, [LEFT, 0, -2.2 + 0.05]);
    s.box([0.05, 2.1, 0.96], [LEFT + 0.025, 1.05, -0.55], a.era === 'twenties' ? s.material('#8a6a44') : s.material('#c9d2cf', { metalness: 0.2, roughness: 0.5 }));
    s.box([0.07, 2.2, 0.08], [LEFT + 0.035, 1.1, -1.07], frameM); s.box([0.07, 2.2, 0.08], [LEFT + 0.035, 1.1, -0.03], frameM); s.box([0.07, 0.08, 1.12], [LEFT + 0.035, 2.19, -0.55], frameM);
    const port = s.cylinder(0.17, 0.17, 0.03, [LEFT + 0.05, 1.55, -0.55], new THREE.MeshStandardMaterial({ color: '#f3f1dc', emissive: '#fff2c0', emissiveIntensity: mix(0.15, 0.7, mood.daylight > 0.5 ? 1 - mood.daylight : mood.daylight) + 0.2 }), 24);
    port.rotation.z = Math.PI / 2;
    s.ring(0.17, 0.02, [LEFT + 0.06, 1.55, -0.55], frameM).rotation.y = Math.PI / 2;
    s.box([0.04, 0.3, 0.12], [LEFT + 0.07, 1.05, -0.2], handleM);

    // A hanging scale at the right end of the bank.
    stand((p) => {
      p.cylinder(0.2, 0.24, 0.05, [0, 0.025, 0], steelDark, 20);
      p.rod([0, 0, 0], [0, 2.0, 0], 0.022, steelDark);
      p.rod([0, 1.98, 0], [0, 1.98, 0.5], 0.018, steelDark);
      p.cylinder(0.17, 0.17, 0.07, [0, 1.72, 0.5], white, 24).rotation.x = Math.PI / 2;
      const dial = p.label('0', 0.22, 0.22, [0, 1.72, 0.537], '#b3262c', '#f5f2e6');
      dial.scale.setScalar(0.9);
      p.rod([0, 1.98, 0.5], [0, 1.88, 0.5], 0.008, steelDark);
      for (const sx of [-1, 1]) p.rod([0, 1.55, 0.5], [sx * 0.2, 1.22, 0.5], 0.005, steelDark);
      p.lathe([[0, 0], [0.14, 0.02], [0.22, 0.07], [0.235, 0.1]], p.material('#b5bfc2', { metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide }), [0, 1.13, 0.5]);
    }, [W / 2 - 0.42, 0, -1.75]);

    // The surgical lamp.
    let lampGlow: THREE.MeshStandardMaterial | null = null;
    if (a.light === 'lamp') {
      lampGlow = new THREE.MeshStandardMaterial({ color: '#fffbe6', emissive: '#fff4c2', emissiveIntensity: 1.3 });
      const glow = lampGlow;
      stand((p) => {
        p.cylinder(0.3, 0.34, 0.06, [0, 0.03, 0], steelDark, 20);
        p.rod([0, 0, 0], [0, 2.65, 0], 0.03, steelDark);
        p.rod([0, 2.62, 0], [0, 2.75, 0.62], 0.024, steelDark);
        p.lathe([[0.05, 0.16], [0.26, 0.1], [0.42, 0]], p.material('#c9d0cc', { metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }), [0, 2.52, 0.7]);
        p.cylinder(0.38, 0.38, 0.02, [0, 2.525, 0.7], glow, 24);
      }, [tx - 0.2, 0, tz - 0.72]);
    }

    // What the night shift left by the left wall.
    const chair = (p: Sculpture, tint: string) => {
      const m = p.material(tint, { roughness: 0.7 });
      p.box([0.44, 0.04, 0.44], [0, 0.46, 0], m);
      for (const x of [-1, 1]) for (const z of [-1, 1]) p.rod([x * 0.19, 0.46, z * 0.19], [x * 0.2, 0, z * 0.2], 0.018, steelDark);
      for (const z of [-1, 1]) p.rod([-0.2, 0.46, z * 0.19], [-0.24, 0.95, z * 0.19], 0.018, steelDark);
      p.box([0.04, 0.26, 0.44], [-0.235, 0.82, 0], m);
    };
    const vx = LEFT + 0.55, vz = 1.75;
    if (a.left === 'mop') {
      stand((p) => {
        const yellow = p.material('#e3c53a', { roughness: 0.6 });
        p.cylinder(0.2, 0.17, 0.32, [0, 0.21, 0], yellow, 18);
        for (const x of [-1, 1]) for (const z of [-1, 1]) p.ball([0.035, 0.035, 0.035], [x * 0.13, 0.035, z * 0.13], black, 8);
        p.box([0.26, 0.14, 0.14], [0, 0.43, -0.08], yellow);
        p.rod([-0.25, 0.02, 0.5], [-0.5, 1.5, 0.1], 0.016, p.material('#b08a5a'));
        p.ball([0.16, 0.06, 0.2], [-0.24, 0.05, 0.52], p.material('#d8d6c8', { roughness: 1 }), 10);
        for (const d of [-1, 1]) { const flap = p.box([0.32, 0.6, 0.02], [0.75, 0.29, 0.25 + d * 0.11], yellow); flap.rotation.x = d * -0.36; }
        p.label('CAUTION', 0.26, 0.09, [0.75, 0.36, 0.385], '#20252a', '#e3c53a').rotation.x = -0.36;
      }, [vx, 0, vz]);
    } else if (a.left === 'lunch' || a.left === 'radio') {
      stand((p) => {
        chair(p, a.left === 'lunch' ? '#8a5a3a' : '#5f7f72');
        if (a.left === 'lunch') {
          p.cylinder(0.045, 0.045, 0.26, [0.05, 0.61, -0.08], p.material('#b3262c', { roughness: 0.4 }), 14);
          p.cylinder(0.035, 0.04, 0.05, [0.05, 0.765, -0.08], steel, 14);
          p.box([0.2, 0.006, 0.2], [0.02, 0.484, 0.1], p.material('#efe9d6'));
          p.box([0.11, 0.045, 0.1], [0.02, 0.51, 0.1], p.material('#d9b77a'));
          p.box([0.115, 0.012, 0.105], [0.02, 0.51, 0.1], p.material('#7fae5a'));
          p.box([0.34, 0.03, 0.26], [0.55, 0.015, 0.2], p.material('#d9d6c8')).rotation.y = 0.4;
        } else {
          p.box([0.3, 0.2, 0.1], [0.02, 0.58, 0.02], p.material('#c9b08a', { roughness: 0.5 })).rotation.y = 0.5;
          p.cylinder(0.07, 0.07, 0.012, [0.035, 0.58, 0.08], black, 16).rotation.set(Math.PI / 2, 0, -0.5);
          p.rod([0.12, 0.68, -0.03], [0.3, 1.2, -0.1], 0.005, steel);
          p.box([0.1, 0.5, 0.5], [-0.27, 0.74, 0], p.material('#3f4a55', { roughness: 0.95 }));
          p.cylinder(0.045, 0.04, 0.09, [0.5, 0.045, 0.3], p.material('#e9e6da'), 12);
        }
      }, [vx - 0.05, 0, vz], 0.25 + (random() - 0.5) * 0.4);
    } else if (a.left === 'paperwork') {
      stand((p) => {
        const desk = p.material('#9aa6a3', { metalness: 0.3, roughness: 0.5 });
        p.box([0.7, 0.04, 1.4], [0, 0.76, 0], desk);
        p.box([0.64, 0.6, 0.42], [0, 0.44, -0.46], desk);
        for (const x of [-1, 1]) p.rod([x * 0.3, 0.76, 0.62], [x * 0.3, 0, 0.62], 0.02, steelDark);
        for (let i = 0; i < 3; i++) p.box([0.02, 0.14, 0.34], [0.325, 0.25 + i * 0.19, -0.46], steelDark);
        p.box([0.34, 0.12, 0.36], [0.02, 0.84, 0.1], black);
        p.box([0.3, 0.03, 0.12], [0.2, 0.83, 0.1], p.material('#d9d6c8'));
        p.box([0.03, 0.22, 0.3], [-0.14, 0.97, 0.1], p.material('#f1eee2'));
        const stack = 3 + Math.round(mood.density * 9);
        for (let i = 0; i < stack; i++) p.box([0.24, 0.012, 0.31], [0.05 + (random() - 0.5) * 0.03, 0.786 + i * 0.012, -0.42 + (random() - 0.5) * 0.03], p.material(i % 4 === 3 ? '#e6d49c' : '#f1eee2')).rotation.y = (random() - 0.5) * 0.2;
        p.cylinder(0.07, 0.09, 0.02, [-0.2, 0.79, 0.5], p.material('#b8934a', { metalness: 0.7, roughness: 0.4 }), 14);
        p.rod([-0.2, 0.79, 0.5], [-0.2, 1.08, 0.5], 0.012, p.material('#b8934a', { metalness: 0.7, roughness: 0.4 }));
        p.box([0.14, 0.09, 0.3], [-0.14, 1.11, 0.5], p.material('#2f7a4d', { roughness: 0.35, emissive: '#1f6a3a', emissiveIntensity: 0.5 }));
        p.box([0.1, 0.01, 0.26], [-0.14, 1.062, 0.5], new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#fff0b0', emissiveIntensity: 1.2 }));
      }, [LEFT + 0.42, 0, vz + 0.1]);
      stand((p) => chair(p, '#5f7f72'), [LEFT + 1.2, 0, vz + 0.15], Math.PI + (random() - 0.5) * 0.6);
    } else if (a.left === 'cards') {
      stand((p) => {
        const wood = p.material('#a98a5c', { roughness: 0.9 });
        p.box([0.6, 0.42, 0.45], [0, 0.21, 0], wood);
        for (let i = 0; i < 4; i++) p.box([0.61, 0.012, 0.012], [0, 0.07 + i * 0.1, 0.226], p.material('#7a6240'));
        const card = p.material('#f5f2e6'), back = p.material('#b3262c');
        for (let hand = 0; hand < 3; hand++) for (let i = 0; i < 4; i++) {
          const c = p.box([0.06, 0.004, 0.085], [-0.2 + hand * 0.2 + i * 0.022, 0.424 + i * 0.002, hand === 1 ? -0.13 : 0.12], hand === 2 ? back : card);
          c.rotation.y = (i - 1.5) * 0.18 + (random() - 0.5) * 0.2;
        }
        p.box([0.065, 0.03, 0.09], [0.22, 0.435, -0.14], back);
        for (const [x, z] of [[-0.55, 0.15], [0.6, -0.05]] as const) {
          p.cylinder(0.16, 0.16, 0.04, [x, 0.46, z], p.material('#5f7f72'), 16);
          for (let k = 0; k < 3; k++) p.rod([x + Math.cos(k * 2.1) * 0.1, 0.45, z + Math.sin(k * 2.1) * 0.1], [x + Math.cos(k * 2.1) * 0.16, 0, z + Math.sin(k * 2.1) * 0.16], 0.014, steelDark);
        }
      }, [vx + 0.35, 0, vz + 0.2], (random() - 0.5) * 0.3);
    }

    // Clutter that comes with a full, busy room.
    if (mood.density > 0.35) {
      stand((p) => {
        p.cylinder(0.3, 0.24, 0.7, [0, 0.42, 0], p.material('#d8d2bd', { roughness: 1 }), 16);
        for (const k of [0, 1, 2, 3]) p.rod([Math.cos(k * 1.57 + 0.78) * 0.3, 0.8, Math.sin(k * 1.57 + 0.78) * 0.3], [Math.cos(k * 1.57 + 0.78) * 0.26, 0, Math.sin(k * 1.57 + 0.78) * 0.26], 0.014, steelDark);
        p.ball([0.26, 0.14, 0.26], [0, 0.78, 0], sheetM, 12);
        p.box([0.3, 0.3, 0.03], [0.1, 0.62, 0.27], sheetM).rotation.x = 0.12;
      }, [W / 2 - 0.5, 0, 0.95]);
    }
    if (mood.density > 0.65) {
      const card = s.material('#b99a6a', { roughness: 0.95 });
      for (let i = 0; i < 4; i++) s.box([0.42, 0.3, 0.36], [W / 2 - 0.35 - (i % 2) * 0.05, 0.15 + Math.floor(i / 2) * 0.3, 2.0 + (i % 2) * 0.42 - Math.floor(i / 2) * 0.1], card).rotation.y = (random() - 0.5) * 0.25;
      s.cylinder(0.16, 0.13, 0.28, [LEFT + 0.35, 0.14, 0.4], steel, 14);
    }
    if (wear > 0.5) for (let i = 0; i < 5; i++) s.box([0.012, 0.25 + random() * 0.6, 0.004], [(random() - 0.5) * (W - 0.4), 2.3 - random() * 0.5, BACK + 0.008], rust);

    // Place the cast on the table, the gurneys and the open floor.
    const frame = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      frame(items);
      items.forEach((item, index) => {
        const [x, z, y, tall, wide, most] = SLOTS[index % SLOTS.length];
        const scale = Math.min(tall / Math.max(item.height, 0.05), wide / Math.max(item.radius, 0.05), most);
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y, z);
        item.holder.updateMatrixWorld(true);
      });
    };
    world.capacity = SLOTS.length;

    const energy = mood.energy, phase = random() * 9;
    const dying = wear > 0.45 || a.light === 'tube';
    world.update = (_dt, time) => {
      tubes.forEach((tube, index) => {
        const t = time * mix(4, 22, energy) + phase + index * 3.7;
        const buzz = Math.sin(t) * Math.sin(t * 2.3 + 1) * Math.sin(t * 0.31);
        const drop = dying && index === 0 && buzz > mix(0.72, 0.2, Math.max(energy, wear)) ? 0.25 : 1;
        tube.emissiveIntensity = (1.05 + Math.sin(t * 7) * 0.05) * drop;
      });
      if (lampGlow) lampGlow.emissiveIntensity = 1.3;
    };
    return world;
  },
});
