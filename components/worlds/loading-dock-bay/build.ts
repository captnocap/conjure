import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;

function paint(w: number, h: number, draw: (c: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineWorld({
  questions: {
    place: choice('Whose loading dock is it?', {
      supermarket: 'The back of a supermarket: painted render with a colour band and shutters in the house colour.',
      distribution: 'A modern distribution shed: ribbed metal cladding and white sectional doors.',
      depot: 'An old brick freight depot or brewery with green shutters and tungsten light.',
      coldstore: 'A cold store: white insulated panels, blue-white light and mist rolling out.',
    }),
    doors: choice('What are the bay doors doing?', {
      crack: 'All down, with a line of light under just one.',
      one: 'One bay wide open and glowing, the rest shut.',
      half: 'One half raised, as if someone is about to duck under it.',
      all: 'Every door up: a shift in full swing.',
    }),
    vehicle: choice('What is backed up to the dock?', {
      none: 'Nothing: the apron is empty.',
      trailer: 'A dropped semi-trailer standing on its landing legs against a bay.',
      van: 'A box van reversed up to a bay, lights on.',
    }),
    ground: choice('What is the apron like underfoot?', {
      wet: 'Wet tarmac with puddles holding the lamp light.',
      dry: 'Dry pale concrete with faded yellow lines.',
      frost: 'Frosted over, white at the edges.',
      oily: 'Old stained concrete with dark oil patches.',
    }),
    clutter: choice('What stands along the edge of the yard?', {
      pallets: 'Stacks of empty pallets.',
      bins: 'Big wheeled bins and bales of flattened cardboard.',
      cages: 'A row of empty wire roll cages.',
      bare: 'Nothing but yellow bollards.',
    }),
    sign: choice('What does the sign on the canopy say?', {
      goods: 'GOODS IN',
      despatch: 'DESPATCH',
      receiving: 'RECEIVING',
      noparking: 'LOADING ONLY',
      staff: 'NO ENTRY',
    }),
    trace: choice('What sign of people is there on the dock?', {
      nobody: 'None: only a lamp that flickers.',
      chair: 'A plastic chair and a bucket by the wall: the smoking spot.',
      jackets: 'Hi-vis jackets hung on hooks between the bays.',
      mugs: 'A radio and two mugs left on the dock edge.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const wear = mood.wear;
    const lit = Math.abs(mood.daylight - 0.5) * 2;
    const dusk = mood.daylight > 0.5;
    const blend = (x: string, y: string, t: number) => '#' + new THREE.Color(x).lerp(new THREE.Color(y), t).getHexString();
    const skyTop = blend('#cdd6dc', dusk ? '#9790b6' : '#aab9d2', lit);
    const skyLow = blend('#e6e7df', dusk ? '#f4b783' : '#f3d2c4', lit);
    const groundHex = { wet: '#7f848b', dry: '#b0ada2', frost: '#c3cad0', oily: '#96948c' }[a.ground];
    const withVehicle = a.vehicle !== 'none';
    const DOCK = 1.2, EDGE = -2.9, WALL = -5.5, HALF = 6.3, PITCH = 4.0, DH = 1.3;
    const slots: [number, number, number?, number?][] = withVehicle
      ? [[0.5, 1.5], [0, -4.2, DOCK, 0.72], [PITCH, -4.2, DOCK, 0.72], [3.5, 3.7, 0, 0.8]]
      : [[0, 1.5], [-PITCH, -4.2, DOCK, 0.72], [PITCH, -4.2, DOCK, 0.72], [-3.6, 3.5, 0, 0.8], [3.4, 3.7, 0, 0.8], [0, -4.2, DOCK, 0.72]];
    const { art: s, world } = diorama(context, { background: skyTop, floor: groundHex, width: HALF * 2, depth: 11, maxHeight: 3.0, radius: 1.75, pitch: 13, yaw: 15, slots });
    const root = s.root;
    const floor = world.ground as THREE.Mesh;
    (floor.material as THREE.MeshStandardMaterial).roughness = a.ground === 'wet' ? 0.3 : 0.92;
    (floor.material as THREE.MeshStandardMaterial).metalness = a.ground === 'wet' ? 0.25 : 0;

    // Light: a low sky, a weak sun and sodium lamps doing the work.
    for (const child of root.children) {
      const hemi = child as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) { hemi.intensity = mix(1.45, 1.0, lit); hemi.color.set(blend('#f1f2ff', dusk ? '#c9b8e0' : '#c6d6f2', lit)); hemi.groundColor.set(blend('#777365', '#5f584f', lit)); }
    }
    const key = world.keyLight!;
    key.intensity = mix(2.6, 1.5, lit);
    key.color.set(blend('#fff6e6', dusk ? '#ffb27a' : '#ffd2c8', lit));
    const lampHex = a.place === 'coldstore' ? '#dff1ff' : blend('#ffd9a0', '#ff9a2e', mix(0.5, 1, mood.warmth));
    const glowHex = { supermarket: '#f6d083', distribution: '#f1f0d8', depot: '#f3b65c', coldstore: '#c4e8f6' }[a.place];

    const steel = s.material('#7d8488', { metalness: 0.7, roughness: 0.45 });
    const dark = s.material('#1d1f22', { roughness: 0.8 });
    const yellow = s.material('#e3b01c', { roughness: 0.65 });
    const concrete = s.material('#aeaba1', { roughness: 0.95 });
    const basic = (hex: string, scale = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(scale) });
    const flat = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = false; return mesh; };
    const wheelX = (r: number, w: number, at: P3, material: THREE.Material = dark) => { const m = s.cylinder(r, r, w, at, material, 18); m.rotation.z = Math.PI / 2; return m; };

    // The yard runs on past the stage, and a sky with a far skyline stands behind the building.
    const yard = flat(s.mesh(new THREE.PlaneGeometry(160, 70), floor.material as THREE.Material, [0, -0.004, 27]));
    yard.rotation.x = -Math.PI / 2;
    yard.renderOrder = 1;
    const yardMaterial = (floor.material as THREE.MeshStandardMaterial).clone();
    yardMaterial.depthWrite = false;
    yard.material = yardMaterial;
    const sky = paint(512, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, skyTop); g.addColorStop(0.3, skyTop); g.addColorStop(0.92, skyLow); g.addColorStop(1, skyLow);
      c.fillStyle = g; c.fillRect(0, 0, 512, 256);
      c.fillStyle = blend(skyLow, '#5d5f72', 0.3);
      let x = 0;
      while (x < 512) { const w = 10 + random() * 26, h = 20 + random() * 50; c.fillRect(x, 256 - h, w, h); if (random() < 0.25) c.fillRect(x + w * 0.4, 256 - h - 20 - random() * 24, 2, 50); x += w + random() * 12; }
      for (let i = 0; i < 7; i++) { const px = random() * 500; c.fillRect(px, 256 - 150, 1.5, 150); c.fillRect(px - 4, 256 - 152, 10, 3); }
      c.globalCompositeOperation = 'destination-out';
      const up = c.createLinearGradient(0, 0, 0, 70);
      up.addColorStop(0, 'rgba(0,0,0,1)'); up.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = up; c.fillRect(0, 0, 512, 70);
    });
    flat(s.mesh(new THREE.PlaneGeometry(90, 17), new THREE.MeshBasicMaterial({ map: sky, transparent: true, depthWrite: false }), [0, 8.5, -8.05]));

    // Wall with three door openings.
    const wallHex = { supermarket: mood.cheer > 0.5 ? '#e4dbc3' : '#cdc8ba', distribution: mood.cheer > 0.6 ? '#93b2c4' : '#98a2a9', depot: '#a65a41', coldstore: '#e3e6e4' }[a.place];
    const wallTexture = paint(256, 256, (c) => {
      c.fillStyle = wallHex; c.fillRect(0, 0, 256, 256);
      if (a.place === 'distribution') for (let x = 0; x < 256; x += 32) { c.fillStyle = 'rgba(0,0,0,0.26)'; c.fillRect(x, 0, 5, 256); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x + 5, 0, 4, 256); }
      else if (a.place === 'depot') {
        for (let row = 0; row < 12; row++) for (let i = -1; i < 4; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '60,20,10' : '255,200,160'},${random() * 0.22})`; c.fillRect(i * 64 + (row % 2) * 32 + 2, row * 21.33 + 2, 60, 18); }
        c.fillStyle = 'rgba(225,215,195,0.7)';
        for (let row = 0; row < 12; row++) { c.fillRect(0, row * 21.33, 256, 2.5); for (let i = 0; i < 5; i++) c.fillRect(i * 64 + (row % 2) * 32, row * 21.33, 2.5, 21.33); }
      } else if (a.place === 'coldstore') for (let x = 0; x < 256; x += 128) { c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x, 0, 3, 256); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x + 3, 0, 3, 256); }
      else for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${random() * 0.06})`; c.beginPath(); c.arc(random() * 256, random() * 256, 10 + random() * 30, 0, 7); c.fill(); }
      for (let i = 0; i < wear * 16; i++) { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, `rgba(50,35,20,${0.1 + wear * 0.28})`); g.addColorStop(1, 'rgba(50,35,20,0)'); c.fillStyle = g; c.fillRect(random() * 256, 0, 3 + random() * 12, 256); }
    });
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    const wallPiece = (x0: number, x1: number, y0: number, y1: number) => {
      const texture = wallTexture.clone();
      texture.repeat.set((x1 - x0) / (a.place === 'coldstore' ? 2 : 1), y1 - y0);
      texture.needsUpdate = true;
      return s.box([x1 - x0, y1 - y0, 0.5], [(x0 + x1) / 2, (y0 + y1) / 2, WALL - 0.25], new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: a.place === 'distribution' ? 0.25 : 0 }));
    };
    const HEAD = DOCK + 3.0, ROOF = 7.5;
    const bays = [-PITCH, 0, PITCH];
    const edges = [-HALF, ...bays.flatMap((x) => [x - DH, x + DH]), HALF];
    for (let i = 0; i < edges.length; i += 2) wallPiece(edges[i], edges[i + 1], DOCK, HEAD);
    wallPiece(-HALF, HALF, HEAD, ROOF);
    if (a.place === 'supermarket') {
      const band = s.material(mood.cheer > 0.5 ? '#2a62ad' : '#5d646b', { roughness: 0.8 });
      for (let i = 0; i < edges.length; i += 2) s.box([edges[i + 1] - edges[i] + 0.004, 0.6, 0.51], [(edges[i] + edges[i + 1]) / 2, DOCK + 0.3, WALL - 0.25], band);
    }
    // The building behind: back, roof and the dock mass under it.
    const shell = s.material('#3c4046', { roughness: 0.9 });
    s.box([HALF * 2, ROOF, 0.1], [0, ROOF / 2, WALL - 1.85], shell);
    s.box([HALF * 2 + 0.2, 0.12, 1.5], [0, ROOF + 0.06, WALL - 1.15], shell);
    for (const x of [-1, 1]) s.box([0.1, ROOF, 1.4], [x * (HALF - 0.05), ROOF / 2, WALL - 1.2], shell);
    s.box([HALF * 2 + 0.3, 0.1, 0.62], [0, ROOF + 0.05, WALL - 0.25], s.material('#565b61', { metalness: 0.4 }));

    // Dock platform, striped lip, bumpers, levellers.
    s.box([HALF * 2, DOCK, EDGE - WALL + 1.9], [0, DOCK / 2, (EDGE + WALL - 1.9) / 2], concrete);
    for (const y of [0.4, 0.8]) flat(s.box([HALF * 2, 0.012, 0.004], [0, y, EDGE + 0.003], s.material('#8f8c83')));
    const hazard = paint(256, 32, (c) => {
      c.fillStyle = '#eab71c'; c.fillRect(0, 0, 256, 32);
      c.fillStyle = '#1c1e21';
      for (let x = -32; x < 256; x += 64) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 32, 0); c.lineTo(x + 64, 0); c.lineTo(x + 32, 32); c.fill(); }
      for (let i = 0; i < wear * 40; i++) { c.fillStyle = 'rgba(150,145,135,0.8)'; c.fillRect(random() * 256, random() * 32, 4 + random() * 14, 2 + random() * 5); }
    });
    hazard.wrapS = THREE.RepeatWrapping;
    hazard.repeat.set(14, 1);
    s.box([HALF * 2 + 0.01, 0.16, 0.04], [0, DOCK - 0.08, EDGE + 0.02], new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.7 }));
    s.box([HALF * 2, 0.012, 0.14], [0, DOCK + 0.005, EDGE - 0.08], yellow);
    const rubber = s.material('#17181a', { roughness: 0.95 });
    const plate = s.material('#6f767a', { metalness: 0.7, roughness: 0.5 });
    for (const bx of bays) {
      for (const x of [-1.12, 1.12]) s.box([0.3, 0.55, 0.14], [bx + x, DOCK - 0.42, EDGE + 0.09], rubber);
      s.box([1.9, 0.025, 0.9], [bx, DOCK + 0.012, EDGE - 0.5], plate);
      const lip = s.box([1.9, 0.02, 0.3], [bx, DOCK - 0.1, EDGE + 0.1], plate);
      lip.rotation.x = 1.1;
    }
    for (const x of [-PITCH / 2, PITCH / 2]) {
      s.cylinder(0.09, 0.09, 1.0, [x, 0.5, EDGE + 0.55], yellow, 14);
      s.cylinder(0.092, 0.092, 0.1, [x, 0.75, EDGE + 0.55], dark, 14);
    }
    // Steel steps at the right-hand end.
    const sx = HALF - 0.6;
    for (let i = 0; i < 5; i++) s.box([0.8, 0.03, 0.27], [sx, DOCK - (i + 1) * 0.2 + 0.02, EDGE + 0.14 + i * 0.26], plate);
    for (const x of [-0.41, 0.41]) {
      s.rod([sx + x, DOCK - 0.1, EDGE], [sx + x, 0.05, EDGE + 1.4], 0.025, plate);
      s.rod([sx + x, DOCK + 0.95, EDGE], [sx + x, 1.0, EDGE + 1.4], 0.022, yellow);
      for (const t of [0, 1]) s.rod([sx + x, mix(DOCK, 0, t), EDGE + t * 1.4], [sx + x, mix(DOCK + 0.95, 1.0, t), EDGE + t * 1.4], 0.018, yellow);
    }

    // Doors and what glows behind them.
    const gaps = { crack: [0, 0.035, 0], one: [0, 0.96, 0], half: [0, 0.42, 0], all: [0.9, 0.96, 0.62 + random() * 0.3] }[a.doors].slice();
    if (a.doors !== 'all' && random() < 0.5) { const swap = gaps[1]; const to = random() < 0.5 ? 0 : 2; if (!(withVehicle && to === 0)) { gaps[1] = gaps[to]; gaps[to] = swap; } }
    if (withVehicle) gaps[0] = Math.max(gaps[0], a.doors === 'crack' ? 0 : 0.9);
    const panelled = a.place === 'distribution' || a.place === 'coldstore';
    const doorHex = { supermarket: mood.cheer > 0.5 ? '#2a62ad' : '#70777d', distribution: '#e4e3dc', depot: '#2f6a4c', coldstore: '#eef0ee' }[a.place];
    const doorTexture = paint(256, 512, (c) => {
      c.fillStyle = doorHex; c.fillRect(0, 0, 256, 512);
      if (panelled) {
        for (let i = 0; i < 5; i++) { const y = i * 102.4; c.fillStyle = 'rgba(0,0,0,0.32)'; c.fillRect(0, y, 256, 4); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, y + 4, 256, 3); c.fillStyle = 'rgba(0,0,0,0.07)'; for (const r of [34, 68]) c.fillRect(0, y + r, 256, 2); }
        for (let i = 0; i < 4; i++) { c.fillStyle = '#2a2d31'; c.fillRect(22 + i * 58, 232, 40, 44); c.fillStyle = glowHex; c.fillRect(26 + i * 58, 236, 32, 36); }
      } else for (let y = 0; y < 512; y += 16) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y, 256, 3); c.fillStyle = 'rgba(255,255,255,0.26)'; c.fillRect(0, y + 3, 256, 3); c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, y + 11, 256, 5); }
      for (let i = 0; i < 2 + wear * 22; i++) { const x = random() * 256, y = random() * 380, len = 40 + random() * 180; const g = c.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, `rgba(110,60,25,${0.2 + wear * 0.45})`); g.addColorStop(1, 'rgba(110,60,25,0)'); c.fillStyle = g; c.fillRect(x, y, 3 + random() * 9, len); }
    });
    const spillTexture = paint(64, 64, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      const side = c.createLinearGradient(0, 0, 64, 0);
      side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.22, 'rgba(0,0,0,0)'); side.addColorStop(0.78, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = side; c.fillRect(0, 0, 64, 64);
    });
    const stock = a.place === 'coldstore' ? ['#7b9bb0', '#9dbccd', '#5f8198'] : ['#8a6238', '#a67c48', '#6f4d2a', '#b98a55'];
    bays.forEach((bx, index) => {
      const gap = gaps[index] * 3.0, shown = 3.0 - gap;
      const texture = doorTexture.clone();
      texture.repeat.set(1, shown / 3.0);
      texture.needsUpdate = true;
      s.box([DH * 2, shown, 0.05], [bx, HEAD - shown / 2, WALL - 0.2], new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: panelled ? 0.1 : 0.4 }));
      s.box([DH * 2, 0.08, 0.08], [bx, DOCK + gap + 0.04, WALL - 0.2], dark);
      for (const x of [-1, 1]) s.box([0.1, 3.0, 0.1], [bx + x * (DH - 0.03), DOCK + 1.5, WALL - 0.16], steel);
      if (!panelled) s.box([DH * 2 + 0.3, 0.34, 0.3], [bx, HEAD + 0.17, WALL + 0.1], s.material(doorHex, { metalness: 0.4, roughness: 0.5 }));
      flat(s.mesh(new THREE.BoxGeometry(DH * 2, 3.0, 1.3), new THREE.MeshBasicMaterial({ color: glowHex, side: THREE.BackSide }), [bx, DOCK + 1.5, WALL - 1.0]));
      flat(s.box([DH * 2, 0.02, 1.6], [bx, DOCK + 0.012, WALL - 0.9], basic(glowHex, 0.72)));
      if (gap < 0.05) return;
      for (const x of [-0.8, 0.85]) {
        if (random() < 0.25) continue;
        const layers = 1 + Math.floor(random() * 4);
        for (let i = 0; i < layers; i++) flat(s.box([0.9 - random() * 0.12, 0.44, 0.5], [bx + x + (random() - 0.5) * 0.08, DOCK + 0.24 + i * 0.45, WALL - 1.2], basic(stock[Math.floor(random() * stock.length)])));
      }
      const strength = mix(0.3, 0.8, lit) * Math.min(1, 0.4 + gaps[index]);
      const spill = new THREE.MeshBasicMaterial({ map: spillTexture, color: glowHex, transparent: true, opacity: strength, depthWrite: false });
      const onDock = flat(s.mesh(new THREE.PlaneGeometry(DH * 2 + 1.2, EDGE - WALL), spill, [bx, DOCK + 0.03, (EDGE + WALL) / 2]));
      onDock.rotation.x = -Math.PI / 2;
      const reach = 2.5 + gaps[index] * 4.5;
      const onApron = flat(s.mesh(new THREE.PlaneGeometry(DH * 2 + 2, reach), new THREE.MeshBasicMaterial({ map: spillTexture, color: glowHex, transparent: true, opacity: strength * (a.ground === 'wet' ? 0.85 : 0.5), depthWrite: false }), [bx, 0.02, EDGE + reach / 2]));
      onApron.rotation.x = -Math.PI / 2;
      if (a.place === 'coldstore') {
        const mist = new THREE.MeshBasicMaterial({ color: '#eef8fb', transparent: true, opacity: 0.16, depthWrite: false });
        for (let i = 0; i < 7; i++) flat(s.ball([0.7 + random() * 0.8, 0.2 + random() * 0.2, 0.5 + random() * 0.6], [bx + (random() - 0.5) * 3, DOCK + 0.15 - (i > 3 ? random() * 1.1 : 0), WALL + 0.6 + random() * (i > 3 ? 3.6 : 2)], mist, 12));
      }
    });

    // Canopy with bay numbers, the sign and sodium lamps.
    const CAN = 5.05;
    const canopyHex = { supermarket: '#d9d6cc', distribution: '#4d5359', depot: '#3d4a41', coldstore: '#dfe3e4' }[a.place];
    const canopy = s.material(canopyHex, { roughness: 0.7, metalness: 0.2 });
    s.box([HALF * 2 + 0.4, 0.16, 3.2], [0, CAN + 0.08, WALL + 1.6 - 0.1], canopy);
    const fasciaZ = WALL + 3.1;
    s.box([HALF * 2 + 0.4, 0.6, 0.1], [0, CAN - 0.1, fasciaZ], canopy);
    for (const x of [-HALF + 0.1, -PITCH / 2, PITCH / 2, HALF - 0.1]) s.rod([x, CAN - 1.3, WALL + 0.02], [x, CAN - 0.02, WALL + 2.6], 0.045, steel);
    const firstBay = 1 + Math.floor(random() * (a.place === 'distribution' ? 60 : 9));
    const numberInk = a.place === 'distribution' || a.place === 'depot' ? '#f2c21c' : '#17181b';
    const numberPaper = a.place === 'distribution' || a.place === 'depot' ? '#17181b' : '#f2c21c';
    bays.forEach((bx, index) => flat(s.label(String(firstBay + index), 0.95, 0.5, [bx, CAN - 0.1, fasciaZ + 0.055], numberInk, numberPaper)));
    const signText = { goods: 'GOODS IN', despatch: 'DESPATCH', receiving: 'RECEIVING', noparking: 'LOADING ONLY', staff: 'NO ENTRY' }[a.sign];
    const alarm = a.sign === 'staff' || a.sign === 'noparking';
    const big = flat(s.label(signText, 5.6, 1.0, [0, 6.45, WALL + 0.03], alarm ? '#ffffff' : '#17181b', alarm ? '#b3261e' : '#f1eee4'));
    big.receiveShadow = true;
    s.box([5.8, 1.2, 0.05], [0, 6.45, WALL + 0.0], dark);
    // Upper wall furniture: louvres, a downpipe and two floodlights.
    for (const x of [-4.7, 4.7]) {
      s.box([1.1, 0.8, 0.08], [x, 6.4, WALL + 0.03], s.material('#5d646b', { metalness: 0.4 }));
      for (let i = 0; i < 6; i++) s.box([1.0, 0.03, 0.1], [x, 6.1 + i * 0.12, WALL + 0.06], dark);
    }
    s.cylinder(0.06, 0.06, ROOF - CAN, [-HALF + 0.35, (ROOF + CAN) / 2, WALL + 0.08], steel, 10);
    const flood = new THREE.MeshStandardMaterial({ color: lampHex, emissive: lampHex, emissiveIntensity: mix(0.6, 3, lit), roughness: 0.4 });
    for (const x of [-3.3, 3.3]) {
      s.rod([x, ROOF - 0.3, WALL], [x, ROOF - 0.15, WALL + 0.5], 0.03, steel);
      const head = s.box([0.5, 0.3, 0.16], [x, ROOF - 0.18, WALL + 0.55], dark);
      head.rotation.x = 0.7;
      const lens = s.box([0.42, 0.22, 0.02], [x, ROOF - 0.245, WALL + 0.615], flood);
      lens.rotation.x = 0.7;
    }
    const lamps: THREE.MeshStandardMaterial[] = [];
    const cones: THREE.MeshBasicMaterial[] = [];
    bays.forEach((bx) => {
      const lens = new THREE.MeshStandardMaterial({ color: lampHex, emissive: lampHex, emissiveIntensity: mix(0.7, 2.8, lit), roughness: 0.4 });
      lamps.push(lens);
      s.box([0.5, 0.12, 0.3], [bx, CAN - 0.06, WALL + 2.35], dark);
      s.box([0.42, 0.04, 0.24], [bx, CAN - 0.14, WALL + 2.35], lens);
      const haze = new THREE.MeshBasicMaterial({ color: lampHex, transparent: true, opacity: mix(0.03, 0.14, lit), depthWrite: false, side: THREE.DoubleSide });
      cones.push(haze);
      flat(s.mesh(new THREE.ConeGeometry(2.3, CAN - DOCK - 0.15, 24, 1, true), haze, [bx, (CAN + DOCK) / 2 - 0.08, WALL + 2.35]));
      const glow = new THREE.PointLight(lampHex, mix(6, 46, lit), 13, 1.8);
      glow.position.set(bx, CAN - 0.5, WALL + 2.6);
      root.add(glow);
    });

    // Apron: guide lines, puddles, frost and stains.
    const line = new THREE.MeshStandardMaterial({ color: blend('#dcb21f', groundHex, 0.15 + wear * 0.6), roughness: 0.8 });
    for (const bx of bays) for (const x of [-1.55, 1.55]) flat(s.box([0.11, 0.006, 8.4], [bx + x, 0.004, EDGE + 4.3], line)).receiveShadow = true;
    if (a.ground === 'wet') {
      const puddle = new THREE.MeshStandardMaterial({ color: blend('#4a5058', skyLow, 0.6), roughness: 0.04, metalness: 0.5, emissive: blend(skyLow, lampHex, 0.5), emissiveIntensity: 0.12 + lit * 0.2 });
      for (let i = 0; i < 9 + mood.density * 8; i++) {
        const x = (random() - 0.5) * 15, z = EDGE + 0.6 + random() * 8, r = 0.4 + random() * 0.9;
        const disc = flat(s.mesh(new THREE.CircleGeometry(r, 20), puddle, [x, 0.009 + i * 0.0004, z]));
        disc.rotation.x = -Math.PI / 2;
        disc.scale.set(1 + random(), 0.5 + random() * 0.5, 1);
        disc.rotation.z = random() * 3;
        disc.receiveShadow = true;
      }
    } else if (a.ground === 'frost') {
      const rime = new THREE.MeshStandardMaterial({ color: '#f1f5f7', roughness: 1, transparent: true, opacity: 0.75, depthWrite: false });
      for (let i = 0; i < 26; i++) {
        const edge = random() < 0.6;
        const patch = flat(s.mesh(new THREE.CircleGeometry(0.5 + random() * 1.3, 14), rime, [edge ? (random() < 0.5 ? -1 : 1) * (5.5 + random() * 2.4) : (random() - 0.5) * 15, 0.008, edge ? EDGE + random() * 8.6 : 3 + random() * 2.8]));
        patch.rotation.x = -Math.PI / 2;
        patch.scale.y = 0.4 + random() * 0.6;
      }
      for (const bx of bays) flat(s.box([0.9, 0.012, 0.25], [bx + (random() - 0.5), DOCK + 0.008, EDGE - 0.14], new THREE.MeshStandardMaterial({ color: '#f1f5f7', roughness: 1 })));
    } else if (a.ground === 'oily') {
      const oil = new THREE.MeshStandardMaterial({ color: '#3d3a35', roughness: 0.35, transparent: true, opacity: 0.7, depthWrite: false });
      for (let i = 0; i < 14; i++) {
        const bx = bays[Math.floor(random() * 3)];
        const stain = flat(s.mesh(new THREE.CircleGeometry(0.25 + random() * 0.7, 14), oil, [bx + (random() - 0.5) * 2, 0.008, EDGE + 0.8 + random() * 7]));
        stain.rotation.x = -Math.PI / 2;
        stain.scale.y = 0.5 + random() * 0.8;
      }
    }

    // Vehicle against the left bay.
    if (a.vehicle === 'trailer') {
      const vx = -PITCH, z0 = EDGE + 0.12, len = 7.9, deck = 1.25, high = 2.75;
      const skin = s.material(a.place === 'coldstore' ? '#eef0ee' : mood.cheer > 0.55 ? '#d8e2e6' : '#c9cbc6', { roughness: 0.55, metalness: 0.15 });
      s.box([2.55, high, len], [vx, deck + high / 2, z0 + len / 2], skin);
      const side = paint(512, 160, (c) => {
        c.fillStyle = '#' + (skin.color as THREE.Color).getHexString(); c.fillRect(0, 0, 512, 160);
        for (let x = 0; x < 512; x += 16) { c.fillStyle = 'rgba(0,0,0,0.07)'; c.fillRect(x, 0, 2, 160); }
        const hue = { supermarket: '#2a62ad', distribution: '#d8322c', depot: '#2f6a4c', coldstore: '#1f8fc2' }[a.place];
        c.fillStyle = hue; c.fillRect(0, 104, 512, 22);
        c.font = 'bold italic 54px sans-serif'; c.textBaseline = 'middle';
        c.fillText({ supermarket: 'FRESH DAILY', distribution: 'NORTHLINE FREIGHT', depot: 'BREWERY DRAYS', coldstore: 'POLAR CHILLED' }[a.place], 26, 60, 460);
        for (let i = 0; i < wear * 30; i++) { c.fillStyle = `rgba(70,60,50,${random() * 0.25})`; c.fillRect(random() * 512, 90 + random() * 70, 3 + random() * 8, 20 + random() * 50); }
      });
      const decal = flat(s.mesh(new THREE.PlaneGeometry(len - 0.1, high - 0.1), new THREE.MeshStandardMaterial({ map: side, roughness: 0.55 }), [vx + 1.28, deck + high / 2, z0 + len / 2]));
      decal.rotation.y = Math.PI / 2;
      decal.receiveShadow = true;
      for (const x of [-1.26, 1.26]) for (const y of [deck + 0.03, deck + high - 0.03]) s.box([0.06, 0.06, len + 0.02], [vx + x, y, z0 + len / 2], steel);
      if (a.place === 'coldstore') { s.box([1.9, 1.5, 0.4], [vx, deck + high - 0.8, z0 + len + 0.2], s.material('#dfe3e4', { roughness: 0.4 })); for (let i = 0; i < 6; i++) s.box([1.5, 0.03, 0.02], [vx, deck + high - 1.3 + i * 0.12, z0 + len + 0.41], dark); }
      s.box([1.1, 0.25, len - 1], [vx, deck - 0.13, z0 + len / 2 - 0.3], dark);
      for (const z of [z0 + 1.3, z0 + 2.6]) for (const x of [-1.05, 1.05]) { wheelX(0.5, 0.3, [vx + x, 0.5, z]); wheelX(0.26, 0.31, [vx + x, 0.5, z], steel); }
      s.box([2.5, 0.05, 2.7], [vx, 1.08, z0 + 1.95], dark);
      for (const x of [-0.8, 0.8]) { s.box([0.11, deck - 0.1, 0.11], [vx + x, (deck - 0.1) / 2 + 0.05, z0 + len - 2.3], steel); s.box([0.3, 0.04, 0.3], [vx + x, 0.02, z0 + len - 2.3], steel); }
      s.rod([vx - 0.8, 0.7, z0 + len - 2.3], [vx + 0.8, 0.7, z0 + len - 2.3], 0.03, steel);
      s.box([2.5, 0.12, 0.06], [vx, 0.75, z0 + 0.25], s.material('#c5302b'));
      const chock = s.box([0.24, 0.18, 0.3], [vx + 1.05, 0.08, z0 + 3.25], yellow);
      chock.rotation.x = -0.4;
    } else if (a.vehicle === 'van') {
      const vx = -PITCH, z0 = EDGE + 0.15;
      const white = s.material(mood.cheer > 0.6 ? '#f2c230' : '#e9e9e4', { roughness: 0.45, metalness: 0.15 });
      s.box([2.2, 2.3, 3.9], [vx, 1.0 + 1.15, z0 + 1.95], white);
      s.box([2.05, 1.55, 1.7], [vx, 0.55 + 0.775, z0 + 4.7], white);
      const glass = s.material('#27323b', { roughness: 0.1, metalness: 0.5 });
      const screen = s.box([1.85, 0.75, 0.05], [vx, 1.72, z0 + 5.52], glass);
      screen.rotation.x = -0.18;
      for (const x of [-1.03, 1.03]) s.box([0.02, 0.6, 0.9], [vx + x, 1.72, z0 + 4.9], glass);
      s.box([2.1, 0.3, 0.12], [vx, 0.62, z0 + 5.56], dark);
      const beam = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe9a8', emissiveIntensity: mix(0.5, 2.6, lit) });
      for (const x of [-0.75, 0.75]) s.box([0.34, 0.2, 0.05], [vx + x, 0.95, z0 + 5.56], beam);
      for (const z of [z0 + 0.9, z0 + 4.6]) for (const x of [-0.98, 0.98]) { wheelX(0.38, 0.26, [vx + x, 0.38, z]); wheelX(0.2, 0.27, [vx + x, 0.38, z], steel); }
      s.box([1.6, 0.3, 4.6], [vx, 0.6, z0 + 2.6], dark);
      const stripe = flat(s.label({ supermarket: 'FRESH DAILY', distribution: 'PARCELS', depot: 'DRAYS', coldstore: 'CHILLED' }[a.place], 3.2, 0.7, [vx + 1.105, 2.2, z0 + 1.95], '#ffffff', { supermarket: '#2a62ad', distribution: '#d8322c', depot: '#2f6a4c', coldstore: '#1f8fc2' }[a.place]));
      stripe.rotation.y = Math.PI / 2;
      const pool = flat(s.mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: spillTexture, color: '#ffe9a8', transparent: true, opacity: mix(0.1, 0.5, lit), depthWrite: false }), [vx, 0.022, z0 + 5.6 + 1.3]));
      pool.rotation.x = -Math.PI / 2;
    }

    // Yard-edge clutter along the right side and the far left corner.
    const amount = 2 + Math.round(mood.density * 3);
    const edgeX = HALF - 0.85;
    if (a.clutter === 'pallets') {
      const boards: { at: P3; size: P3; turn: number }[] = [];
      for (let k = 0; k < amount; k++) {
        const x = edgeX + (random() - 0.5) * 0.4, z = -0.6 + k * 1.35, turn = (random() - 0.5) * 0.25;
        const count = 3 + Math.floor(random() * 9);
        for (let i = 0; i < count; i++) {
          const y = i * 0.15, dx = (random() - 0.5) * 0.06;
          boards.push({ at: [x + dx, y + 0.135, z], size: [1.2, 0.028, 1.0], turn }, { at: [x + dx, y + 0.014, z], size: [1.2, 0.028, 1.0], turn });
          for (const o of [-0.45, 0, 0.45]) boards.push({ at: [x + dx, y + 0.075, z + o * Math.cos(turn)], size: [1.16, 0.094, 0.1], turn });
        }
      }
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), s.material('#c49a62', { roughness: 0.9 }), boards.length);
      const dummy = new THREE.Object3D();
      boards.forEach((board, index) => { dummy.position.set(...board.at); dummy.rotation.y = board.turn; dummy.scale.set(...board.size); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix); mesh.setColorAt(index, new THREE.Color(index % 3 ? '#c49a62' : '#a67c48')); });
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    } else if (a.clutter === 'bins') {
      const hues = ['#2f6a4c', '#2a62ad', '#55595e', '#8a2f2a'];
      for (let k = 0; k < amount; k++) {
        const x = edgeX, z = -0.8 + k * 1.5;
        if (k % 3 === 2) {
          const bale = s.box([1.1, 0.8, 0.8], [x, 0.4, z], s.material('#b98a55', { roughness: 1 }));
          bale.rotation.y = (random() - 0.5) * 0.4;
          for (const o of [-0.3, 0.3]) s.box([1.12, 0.82, 0.03], [x, 0.4, z + o], dark).rotation.y = bale.rotation.y;
          if (random() < 0.6) s.box([1.1, 0.8, 0.8], [x + (random() - 0.5) * 0.1, 1.2, z], s.material('#ad8250', { roughness: 1 })).rotation.y = bale.rotation.y + 0.1;
          continue;
        }
        const body = s.material(hues[Math.floor(random() * hues.length)], { roughness: 0.6 });
        s.box([1.25, 1.0, 1.0], [x, 0.72, z], body);
        const lid = s.cylinder(0.52, 0.52, 1.27, [x, 1.2, z], body, 16);
        lid.rotation.z = Math.PI / 2;
        lid.scale.set(1, 1, 0.45);
        if (random() < 0.4) lid.rotation.x = 0.5;
        for (const wx of [-0.5, 0.5]) for (const wz of [-0.4, 0.4]) wheelX(0.1, 0.05, [x + wx, 0.1, z + wz]);
        s.rod([x - 0.66, 1.0, z + 0.3], [x - 0.66, 1.0, z - 0.3], 0.02, dark);
      }
    } else if (a.clutter === 'cages') {
      const grid = paint(128, 256, (c) => {
        c.clearRect(0, 0, 128, 256);
        c.strokeStyle = '#c2c8ca'; c.lineWidth = 5;
        for (let x = 0; x <= 128; x += 21.33) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
        for (let y = 0; y <= 256; y += 51.2) { c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.stroke(); }
      });
      const wire = new THREE.MeshStandardMaterial({ map: grid, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.7, roughness: 0.4 });
      for (let k = 0; k < amount + 2; k++) {
        const x = edgeX + 0.2 + (random() - 0.5) * 0.15, z = -1.2 + k * 0.62;
        const cage = new THREE.Group();
        for (const side of [-1, 1]) { const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.5), wire); panel.position.set(side * 0.4, 0.95, 0); panel.rotation.y = Math.PI / 2; panel.castShadow = true; cage.add(panel); }
        const back = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), wire);
        back.position.set(0, 0.95, -0.35);
        back.castShadow = true;
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.72), steel);
        base.position.y = 0.19;
        cage.add(back, base);
        cage.position.set(x, 0, z);
        cage.rotation.y = -Math.PI / 2 + (random() - 0.5) * 0.12;
        root.add(cage);
        for (const wz of [-0.3, 0.3]) wheelX(0.06, 0.04, [x, 0.06, z + wz * 0.6]);
      }
    }
    for (const z of [0.8, 3.4]) { s.cylinder(0.09, 0.09, 1.0, [-HALF + 0.5, 0.5, z], yellow, 14); s.cylinder(0.092, 0.092, 0.1, [-HALF + 0.5, 0.75, z], dark, 14); }

    // Traces of people between the middle and right bays.
    const tx = PITCH / 2;
    if (a.trace === 'chair') {
      const plastic = s.material(mood.cheer > 0.5 ? '#f1eee4' : '#3f7a5a', { roughness: 0.5 });
      const cx = tx + 0.25, cz = WALL + 0.55;
      s.box([0.46, 0.04, 0.44], [cx, DOCK + 0.44, cz], plastic);
      s.box([0.46, 0.5, 0.04], [cx, DOCK + 0.72, cz - 0.22], plastic).rotation.x = -0.15;
      for (const x of [-0.2, 0.2]) for (const z of [-0.19, 0.19]) s.rod([cx + x, DOCK, cz + z * 1.15], [cx + x, DOCK + 0.44, cz + z], 0.018, plastic);
      s.cylinder(0.14, 0.11, 0.26, [cx - 0.6, DOCK + 0.13, cz + 0.1], s.material('#5d646b', { metalness: 0.5 }), 14);
      s.cylinder(0.035, 0.035, 0.09, [cx + 0.42, DOCK + 0.045, cz + 0.2], s.material('#f1eee4'), 10);
    } else if (a.trace === 'jackets') {
      const n = 2 + Math.round(mood.density * 2);
      for (let i = 0; i < n; i++) {
        const vis = s.material(random() < 0.6 ? '#e4ee22' : '#f37a18', { roughness: 0.85, emissive: '#5a5200', emissiveIntensity: 0.35 });
        const x = tx - 0.45 + i * (0.9 / Math.max(1, n - 1));
        s.box([0.3, 0.62 + random() * 0.1, 0.1], [x, DOCK + 1.45, WALL + 0.07], vis).rotation.z = (random() - 0.5) * 0.12;
        for (const y of [1.3, 1.42]) s.box([0.31, 0.04, 0.105], [x, DOCK + y, WALL + 0.07], s.material('#d5d8d6', { metalness: 0.6, roughness: 0.3 }));
        s.cylinder(0.012, 0.012, 0.1, [x, DOCK + 1.8, WALL + 0.05], steel, 8).rotation.x = Math.PI / 2;
      }
    } else if (a.trace === 'mugs') {
      const ex = tx - 0.2, ez = EDGE - 0.3;
      s.box([0.34, 0.2, 0.12], [ex, DOCK + 0.1, ez], dark);
      s.cylinder(0.06, 0.06, 0.012, [ex - 0.08, DOCK + 0.1, ez + 0.062], steel, 14).rotation.x = Math.PI / 2;
      s.rod([ex + 0.13, DOCK + 0.2, ez], [ex + 0.2, DOCK + 0.55, ez], 0.005, steel);
      for (const [dx, hue] of [[0.4, '#c5302b'], [0.56, '#f1eee4']] as const) s.cylinder(0.045, 0.04, 0.1, [ex + dx, DOCK + 0.05, ez + (random() - 0.5) * 0.15], s.material(hue, { roughness: 0.4 }), 12);
    }

    // Flicker.
    const base = lamps.map((lamp) => lamp.emissiveIntensity);
    const hazeBase = cones.map((cone) => cone.opacity);
    const faulty = a.trace === 'nobody' || wear > 0.6 ? Math.floor(random() * 3) : -1;
    const rate = mix(9, 31, mood.energy);
    world.update = (_dt, time) => {
      if (faulty < 0) return;
      const on = Math.sin(time * rate) * Math.sin(time * 2.7 + 1) > 0.35 ? 0.25 : 1;
      lamps[faulty].emissiveIntensity = base[faulty] * on;
      cones[faulty].opacity = hazeBase[faulty] * on;
    };
    return world;
  },
});
