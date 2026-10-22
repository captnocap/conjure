import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

const PALETTES = {
  cream: 'Cream enamel panels with grey-green trim, the classic 1950s power station.',
  eau: 'Pale eau-de-nil green panels, calm and clinical.',
  bluegrey: 'Cool blue-grey panels, naval and severe.',
  beige: 'Beige panels with brown trim, a late Soviet block.',
} as const;
const PALETTE_HEX: Record<keyof typeof PALETTES, [string, string, string]> = {
  cream: ['#e6dcc0', '#d2c9ab', '#5d6b62'], eau: ['#bcd2bd', '#a8c0ab', '#4f5f5a'], bluegrey: ['#a9b6be', '#95a3ac', '#414c55'], beige: ['#d8c7a3', '#c4b28c', '#6b4f3a'],
};
const SIGNS = { unit: 'UNIT 2 CONTROL', block: 'БЛОК 4', grid: 'GRID CONTROL', launch: 'LAUNCH CONTROL', none: '' } as const;
const LAMPS = { green: '#27e06a', amber: '#ffb02a', red: '#ff2f1f', white: '#fff3d2', off: '#4b514c' };
const PROFILE: [number, number][] = [[0.5, 0.7], [0.5, 0.76], [0.14, 0.76], [-0.22, 1.06], [-0.27, 1.42], [-0.5, 1.42], [-0.5, 0], [0.1, 0], [0.1, 0.7]];

export default defineWorld({
  questions: {
    status: choice('What is happening in the control room?', {
      quiet: 'The night watch: every lamp steady green, nothing to do but watch the dials.',
      routine: 'An ordinary working shift: mostly green with a few amber cautions.',
      alarm: 'Alarm: red windows lit across the wall, beacons turning, the board flashing.',
      blackout: 'Station blackout: the room lights have failed and only scattered instrument lamps glow in the gloom.',
      abandoned: 'Abandoned: every lamp dead, papers on the floor, chairs where they fell.',
    }),
    wall: choice('What dominates the curved panel wall?', {
      gauges: 'Rank upon rank of round dial gauges.',
      mimic: 'A painted mimic diagram of pipes, vessels and valves running the whole length of the wall.',
      lamps: 'Dense matrices of small indicator lamps, like a telephone exchange.',
      map: 'A big illuminated sector map in the centre, flanked by gauges.',
    }),
    palette: choice('What colour is the enamel?', PALETTES),
    floor: choice('What is the raised floor covered in?', {
      checker: 'Green and cream checkerboard linoleum tiles.',
      speckle: 'Plain speckled grey-green linoleum with brass seams.',
      oxblood: 'Dark red-brown linoleum, polished by decades of shoes.',
      terrazzo: 'Pale terrazzo squares.',
    }),
    clock: choice('What does the wall clock say?', {
      night: 'Seven minutes past three in the morning.',
      noon: 'Just after noon.',
      stopped: 'Stopped at 1:23, and nobody has wound it since.',
      none: 'There is no clock.',
    }),
    operators: choice('What have the operators left behind?', {
      tucked: 'Nothing: the chairs are tucked in square and the desks are clear.',
      stepped: 'Jackets on chair backs and mugs on the desks, as if they have just stepped out.',
      fled: 'Chairs shoved back and overturned, a coat on the floor.',
    }),
    sign: choice('What lettering runs above the panel wall?', {
      unit: 'UNIT 2 CONTROL', block: 'БЛОК 4, in Cyrillic.', grid: 'GRID CONTROL', launch: 'LAUNCH CONTROL', none: 'No lettering.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const [panelHex, insetHex, trimHex] = PALETTE_HEX[a.palette];
    const gloom = a.status === 'blackout';
    const dead = a.status === 'abandoned';
    const floorHex = { checker: '#93a888', speckle: '#93a091', oxblood: '#7d4236', terrazzo: '#b9b2a1' }[a.floor];
    const { art: s, world } = diorama(context, {
      background: gloom ? '#8b918d' : dead ? '#cfcdc0' : a.status === 'alarm' ? '#e2d6cc' : '#e3e5da',
      floor: floorHex, width: 13.4, depth: 9.6, maxHeight: 2.3, radius: 1.15, pitch: 21, yaw: 10,
      slots: [[0, -0.8], [-5.2, 1.5, 0, 0.9], [5.2, 1.5, 0, 0.9], [-3.3, 3.7, 0, 0.72], [3.3, 3.7, 0, 0.72]],
    });
    for (const child of s.root.children) {
      const light = child as THREE.Light;
      if (!light.isLight) continue;
      if (gloom) { light.intensity *= 0.42; if ((light as THREE.DirectionalLight).isDirectionalLight) light.color.lerp(new THREE.Color('#ffb48a'), 0.4); }
      else if (a.status === 'alarm' && (light as THREE.DirectionalLight).isDirectionalLight) light.color.lerp(new THREE.Color('#ffc9b0'), 0.35);
      else if (a.status === 'quiet') light.intensity *= 0.88;
    }

    const panel = s.material(panelHex, { roughness: 0.5, metalness: 0.1 });
    const trim = s.material(trimHex, { roughness: 0.55 });
    const dark = s.material('#22272a', { roughness: 0.6 });
    const chrome = s.material('#cfd4d5', { metalness: 0.8, roughness: 0.3 });
    const glowMaterials: THREE.MeshStandardMaterial[] = [];
    const lampHex = () => {
      const r = random();
      if (dead) return LAMPS.off;
      if (a.status === 'quiet') return r < 0.86 ? LAMPS.green : r < 0.92 ? LAMPS.white : LAMPS.off;
      if (a.status === 'routine') return r < 0.6 ? LAMPS.green : r < 0.78 ? LAMPS.amber : r < 0.88 ? LAMPS.white : LAMPS.off;
      if (a.status === 'alarm') return r < 0.5 ? LAMPS.red : r < 0.75 ? LAMPS.amber : r < 0.88 ? LAMPS.green : LAMPS.off;
      return r < 0.68 ? LAMPS.off : r < 0.88 ? LAMPS.amber : LAMPS.red;
    };
    const tileShare = { quiet: 0.03, routine: 0.08, alarm: 0.55, blackout: 0.18, abandoned: 0 }[a.status];

    /** Paint a face twice: once as it looks, once as what glows. */
    const face = (w: number, h: number, draw: (c: CanvasRenderingContext2D, lamp: (x: number, y: number, r: number, hex?: string, square?: [number, number]) => void) => void) => {
      const make = () => { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return canvas; };
      const base = make(), glow = make();
      const c = base.getContext('2d')!, g = glow.getContext('2d')!;
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      draw(c, (x, y, r, hex = lampHex(), square) => {
        for (const ctx of [c, g]) {
          if (ctx === g && hex === LAMPS.off) continue;
          ctx.fillStyle = hex;
          if (square) ctx.fillRect(x, y, square[0], square[1]);
          else { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
        }
        if (!square) { c.strokeStyle = '#22272a'; c.lineWidth = Math.max(1.5, r * 0.3); c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); }
      });
      const textures = [base, glow].map((canvas) => { const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture; });
      const material = new THREE.MeshStandardMaterial({ map: textures[0], emissiveMap: textures[1], emissive: '#ffffff', emissiveIntensity: gloom ? 1.5 : 1, roughness: 0.55 });
      glowMaterials.push(material);
      return material;
    };
    const grime = (c: CanvasRenderingContext2D, w: number, h: number) => {
      const n = (mood.wear + (dead ? 0.5 : 0)) * 14;
      for (let i = 0; i < n; i++) { c.fillStyle = `rgba(80,60,35,${0.05 + random() * 0.1})`; c.beginPath(); c.ellipse(random() * w, random() * h, 20 + random() * 60, 30 + random() * 120, 0, 0, 7); c.fill(); }
    };
    const dial = (c: CanvasRenderingContext2D, x: number, y: number, r: number) => {
      c.fillStyle = '#22272a'; c.beginPath(); c.arc(x, y, r * 1.12, 0, 7); c.fill();
      c.fillStyle = '#f2eedf'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.lineWidth = r * 0.16; c.strokeStyle = '#3d9a52'; c.beginPath(); c.arc(x, y, r * 0.78, Math.PI * 1.1, Math.PI * 1.7); c.stroke();
      c.strokeStyle = '#cf2a1e'; c.beginPath(); c.arc(x, y, r * 0.78, Math.PI * 1.7, Math.PI * 2.1); c.stroke();
      const value = dead ? 0 : a.status === 'alarm' ? (random() < 0.5 ? 0.98 : random()) : gloom ? random() * 0.3 : 0.35 + random() * 0.25;
      const q = Math.PI * (0.8 + value * 1.4);
      c.strokeStyle = '#17191a'; c.lineWidth = r * 0.1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(q) * r * 0.85, y + Math.sin(q) * r * 0.85); c.stroke();
    };

    // --- The curved panel wall -------------------------------------------------------------
    const R = 7.6, N = 9, sweep = 100 * Math.PI / 180, step = sweep / N, zBack = -4.5;
    const SW = 2 * R * Math.tan(step / 2) + 0.02, WH = 3.0, CW = 384, CH = 576;
    for (let i = 0; i < N; i++) {
      const theta = -sweep / 2 + (i + 0.5) * step;
      const bay = new THREE.Group();
      bay.position.set(R * Math.sin(theta), 0, zBack + R * (1 - Math.cos(theta)));
      bay.rotation.y = -theta;
      s.root.add(bay);
      const add = <T extends THREE.Object3D>(child: T) => { bay.add(child); return child; };
      add(s.box([SW, WH, 0.4], [0, WH / 2, -0.2], panel));
      add(s.box([SW + 0.01, 0.16, 0.44], [0, 0.08, -0.2], dark));
      add(s.box([SW + 0.01, 0.42, 0.46], [0, WH + 0.21, -0.2], trim));
      add(s.box([0.03, WH, 0.03], [-SW / 2, WH / 2, 0.005], trim));
      const centre = Math.abs(i - (N - 1) / 2);
      const kind = a.wall === 'map' ? (centre <= 1 ? 'map' : 'gauges') : a.wall;
      const material = face(CW, CH, (c, lamp) => {
        c.fillStyle = insetHex; c.fillRect(0, 0, CW, CH);
        c.strokeStyle = trimHex; c.lineWidth = 4; c.strokeRect(6, 6, CW - 12, CH - 12);
        c.fillStyle = 'rgba(30,40,35,0.16)'; c.fillRect(14, 128, CW - 28, 280);
        // Annunciator windows along the top.
        c.fillStyle = '#22272a'; c.fillRect(14, 16, CW - 28, 100);
        for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
          const lit = random() < tileShare;
          const hex = lit ? (random() < (a.status === 'alarm' ? 0.7 : 0.3) ? LAMPS.red : random() < 0.6 ? LAMPS.amber : LAMPS.white) : LAMPS.off;
          if (lit) lamp(20 + col * 43.4, 21 + row * 23.5, 0, hex, [39, 20]);
          else { c.fillStyle = dead ? '#8d8c80' : '#a9aba1'; c.fillRect(20 + col * 43.4, 21 + row * 23.5, 39, 20); }
        }
        // The main field.
        if (kind === 'gauges') {
          for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) { dial(c, 74 + col * 118, 176 + row * 92, 36); lamp(74 + col * 118 + 48, 176 + row * 92 + 36, 8); }
        } else if (kind === 'lamps') {
          c.fillStyle = '#30363a'; c.fillRect(22, 132, CW - 44, 272);
          for (let row = 0; row < 10; row++) for (let col = 0; col < 13; col++) lamp(40 + col * 25.3, 150 + row * 26.5, 7.5);
        } else if (kind === 'mimic') {
          c.fillStyle = '#efe9d6'; c.fillRect(0, 132, CW, 272);
          const pipes: [number, string][] = [[176, '#cf3a24'], [262, '#2a6fb5'], [348, '#2f9050']];
          c.lineWidth = 13;
          for (const [y, hex] of pipes) { c.strokeStyle = hex; c.beginPath(); c.moveTo(0, y); c.lineTo(CW, y); c.stroke(); }
          const [y0, hex0] = pipes[i % 3], [y1] = pipes[(i + 1) % 3];
          const vx = 70 + random() * 180;
          c.strokeStyle = hex0; c.beginPath(); c.moveTo(vx + 40, y0); c.lineTo(vx + 40, y1); c.stroke();
          c.fillStyle = '#dfe3e2'; c.strokeStyle = '#22272a'; c.lineWidth = 5;
          c.beginPath(); c.roundRect(vx, Math.min(y0, y1) - 26, 80, Math.abs(y1 - y0) + 52, 30); c.fill(); c.stroke();
          for (const [y] of pipes) { const x = 30 + random() * (CW - 60); c.fillStyle = '#22272a'; c.beginPath(); c.moveTo(x - 16, y - 12); c.lineTo(x + 16, y + 12); c.lineTo(x + 16, y - 12); c.lineTo(x - 16, y + 12); c.fill(); lamp(x, y - 26, 8); }
          lamp(vx + 40, (y0 + y1) / 2, 10);
        } else {
          // Sector map continuing across the three centre bays.
          const u = (i - (N - 1) / 2 + 1) * CW;
          c.fillStyle = '#23323d'; c.fillRect(0, 132, CW, 272);
          c.strokeStyle = 'rgba(160,200,210,0.35)'; c.lineWidth = 1.5;
          for (let k = 0; k < 40; k++) { const x = k * 48 - u % 48; c.beginPath(); c.moveTo(x, 132); c.lineTo(x, 404); c.stroke(); }
          for (let y = 150; y < 404; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(CW, y); c.stroke(); }
          c.fillStyle = '#7f9a86';
          const lands: [number, number, number, number][] = [[210, 230, 190, 70], [520, 300, 150, 60], [800, 220, 230, 80], [980, 330, 120, 50], [380, 340, 90, 36]];
          for (const [x, y, rx, ry] of lands) { c.beginPath(); c.ellipse(x - u, y, rx, ry, 0.2, 0, 7); c.fill(); }
          c.strokeStyle = '#ffb02a'; c.lineWidth = 2;
          for (const rr of [60, 120, 180]) { c.beginPath(); c.arc(576 - u, 268, rr, 0, 7); c.stroke(); }
          for (let k = 0; k < 5; k++) lamp(20 + random() * (CW - 40), 150 + random() * 240, 6);
        }
        // Lower field: chart windows, knobs and lamps.
        for (let col = 0; col < 2; col++) {
          const x = 26 + col * 176;
          c.fillStyle = '#22272a'; c.fillRect(x, 420, 150, 84);
          c.fillStyle = '#f2eedf'; c.fillRect(x + 6, 426, 138, 72);
          c.strokeStyle = dead ? '#9a9588' : '#c0261c'; c.lineWidth = 2.5; c.beginPath();
          for (let k = 0; k <= 138; k += 6) { const y = 462 + (a.status === 'alarm' && k > 80 ? (random() - 0.5) * 60 : (random() - 0.5) * 8); if (k) c.lineTo(x + 6 + k, y); else c.moveTo(x + 6 + k, y); }
          c.stroke();
        }
        for (let col = 0; col < 9; col++) { c.fillStyle = '#22272a'; c.beginPath(); c.arc(36 + col * 39, 536, 10, 0, 7); c.fill(); lamp(36 + col * 39, 514, 6.5); }
        grime(c, CW, CH);
      });
      add(s.mesh(new THREE.PlaneGeometry(SW - 0.06, WH - 0.36), material, [0, 0.2 + (WH - 0.36) / 2 + 0.1, 0.004])).castShadow = false;
      // A bench ledge at the foot of each bay.
      const ledge = add(s.box([SW, 0.05, 0.34], [0, 0.74, 0.15], panel));
      ledge.rotation.x = 0.28;
      add(s.box([SW, 0.7, 0.24], [0, 0.35, 0.1], panel));
      add(s.box([SW - 0.3, 0.3, 0.01], [0, 0.36, 0.223], trim));
      if (a.status === 'alarm' || mood.density > 0.5) {
        if (i === 2 || i === N - 3) {
          const beacon = new THREE.MeshStandardMaterial({ color: '#d8301f', emissive: '#ff2a12', emissiveIntensity: a.status === 'alarm' ? 1.5 : 0.05, roughness: 0.25 });
          beacon.userData.beacon = true;
          glowMaterials.push(beacon);
          add(s.cylinder(0.11, 0.12, 0.07, [0, WH + 0.455, -0.1], dark, 16));
          add(s.lathe([[0.1, 0], [0.1, 0.12], [0.075, 0.19], [0.035, 0.22], [0, 0.225]], beacon, [0, WH + 0.49, -0.1]));
        }
      }
    }
    // Lettering and clock over the centre bay.
    if (a.sign !== 'none') s.label(SIGNS[a.sign], 1.42, 0.3, [0, WH + 0.21, zBack + 0.04], '#f1ead2', trimHex).castShadow = false;
    if (a.clock !== 'none') {
      const [hour, minute] = { night: [3, 7], noon: [12, 2], stopped: [1, 23] }[a.clock];
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#f4f0e2'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
      c.strokeStyle = '#17191a';
      for (let k = 0; k < 12; k++) { const q = k * Math.PI / 6; c.lineWidth = k % 3 ? 5 : 10; c.beginPath(); c.moveTo(128 + Math.cos(q) * 98, 128 + Math.sin(q) * 98); c.lineTo(128 + Math.cos(q) * 116, 128 + Math.sin(q) * 116); c.stroke(); }
      const hand = (turn: number, length: number, width: number) => { const q = turn * Math.PI * 2 - Math.PI / 2; c.lineWidth = width; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(q) * length, 128 + Math.sin(q) * length); c.stroke(); };
      hand((hour % 12 + minute / 60) / 12, 62, 12); hand(minute / 60, 96, 8);
      if (a.clock === 'stopped') { c.lineWidth = 3; c.beginPath(); c.moveTo(60, 30); c.lineTo(120, 110); c.lineTo(100, 150); c.lineTo(170, 230); c.stroke(); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      s.cylinder(0.5, 0.5, 0.1, [0, WH + 0.95, zBack - 0.1], dark, 36).rotation.x = Math.PI / 2;
      s.mesh(new THREE.CircleGeometry(0.44, 36), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4 }), [0, WH + 0.95, zBack - 0.045]).castShadow = false;
    }

    // --- The floor ---------------------------------------------------------------------------
    {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
      const c = canvas.getContext('2d')!;
      c.fillStyle = floorHex; c.fillRect(0, 0, 512, 512);
      if (a.floor === 'checker') { c.fillStyle = '#cfc8ab'; for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) if ((x + y) % 2) c.fillRect(x * 64, y * 64, 64, 64); }
      else if (a.floor === 'terrazzo') { c.strokeStyle = '#968f80'; c.lineWidth = 3; for (let k = 0; k <= 4; k++) { c.beginPath(); c.moveTo(k * 128, 0); c.lineTo(k * 128, 512); c.moveTo(0, k * 128); c.lineTo(512, k * 128); c.stroke(); } }
      else { c.strokeStyle = a.floor === 'speckle' ? '#b79a4a' : '#6f3a2f'; c.lineWidth = 3; for (let k = 0; k <= 2; k++) { c.beginPath(); c.moveTo(k * 256, 0); c.lineTo(k * 256, 512); c.stroke(); } }
      for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,40,30'},${0.05 + random() * 0.1})`; c.fillRect(random() * 512, random() * 512, 2 + random() * 3, 2 + random() * 3); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(a.floor === 'checker' ? 3.5 : 4, a.floor === 'checker' ? 2.5 : 3); texture.anisotropy = 8;
      const sheet = s.mesh(new THREE.PlaneGeometry(13.4, 9.6), new THREE.MeshStandardMaterial({ map: texture, roughness: a.floor === 'oxblood' ? 0.35 : 0.6 }), [0, 0.004, 0]);
      sheet.rotation.x = -Math.PI / 2; sheet.castShadow = false;
      // The raised floor's skirt, a step and a brass nosing along the front.
      s.box([13.5, 0.5, 9.7], [0, -0.37, 0], s.material('#6f756f', { roughness: 0.8 }));
      s.box([13.4, 0.02, 0.07], [0, 0.012, 4.76], s.material('#b8913f', { metalness: 0.7, roughness: 0.35 }));
      s.box([3, 0.24, 0.6], [0, -0.38, 5.1], s.material('#6f756f', { roughness: 0.8 }));
      // Lift-out floor panels with ring pulls, where the cables run.
      for (const x of [-1.5, 1.5]) { s.box([0.9, 0.012, 0.9], [x, 0.008, 3.5], s.material('#7d857f', { metalness: 0.4, roughness: 0.5 })); s.ring(0.05, 0.01, [x + 0.3, 0.02, 3.8], chrome).rotation.x = Math.PI / 2; }
    }

    // --- The horseshoe of consoles, open toward the viewer, with the centre left for the hero -
    const shape = new THREE.Shape();
    PROFILE.forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
    const HR = 3.2, deskZ = -0.8, DW = 2.0;
    const chairs: [number, number, number][] = [];
    for (const angle of [-74, -37, 37, 74]) {
      const theta = angle * Math.PI / 180;
      const desk = new THREE.Group();
      desk.position.set(HR * Math.sin(theta), 0, deskZ + HR * (1 - Math.cos(theta)));
      desk.rotation.y = -theta;
      s.root.add(desk);
      const add = <T extends THREE.Object3D>(child: T) => { desk.add(child); return child; };
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: DW, bevelEnabled: false });
      geometry.rotateY(-Math.PI / 2); geometry.translate(DW / 2, 0, 0);
      add(s.mesh(geometry, panel));
      for (const side of [-1, 1]) add(s.box([0.04, 1.44, 1.02], [side * DW / 2, 0.72, 0], trim));
      add(s.box([DW - 0.1, 0.5, 0.01], [0, 0.4, 0.102], trim));
      add(s.box([DW, 0.014, 0.03], [0, 0.762, 0.49], chrome));
      const board = (length: number, rows: number, dials: boolean) => face(512, Math.round(512 * length / DW), (c, lamp) => {
        const h = Math.round(512 * length / DW);
        c.fillStyle = insetHex; c.fillRect(0, 0, 512, h);
        c.strokeStyle = trimHex; c.lineWidth = 3;
        for (let k = 0; k < 4; k++) c.strokeRect(8 + k * 126, 6, 118, h - 12);
        if (dials) for (let k = 0; k < 4; k++) dial(c, 67 + k * 126, h * 0.58, h * 0.27);
        for (let row = 0; row < rows; row++) for (let col = 0; col < 20; col++) {
          const x = 22 + col * 24.6, y = (dials ? 12 : 16) + row * (dials ? 0 : (h - 30) / rows);
          lamp(x, y, 5.5);
          if (!dials) { c.fillStyle = '#22272a'; c.fillRect(x - 3, y + 9, 6, 11); }
        }
        grime(c, 512, h);
      });
      const slope = add(new THREE.Group()); slope.position.set(0, 0.76, 0.14); slope.rotation.x = -Math.atan2(0.36, 0.3);
      const top = s.mesh(new THREE.PlaneGeometry(DW - 0.08, 0.44), board(0.44, 3, false), [0, 0.2345, 0.004]); top.castShadow = false; slope.add(top);
      const upright = add(new THREE.Group()); upright.position.set(0, 1.06, -0.22); upright.rotation.x = -Math.atan2(0.05, 0.36);
      const back = s.mesh(new THREE.PlaneGeometry(DW - 0.08, 0.33), board(0.33, 1, true), [0, 0.18, 0.004]); back.castShadow = false; upright.add(back);
      if (a.operators === 'stepped' || mood.density > 0.6) {
        add(s.cylinder(0.04, 0.035, 0.09, [-0.5 + random(), 0.81, 0.34], s.material('#f1eee4', { roughness: 0.4 }), 12));
        add(s.box([0.24, 0.03, 0.3], [0.2 + random() * 0.5, 0.78, 0.33], s.material('#2f5a44', { roughness: 0.7 }))).rotation.y = (random() - 0.5) * 0.5;
      }
      const inward = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
      if (Math.abs(angle) < 60 || mood.density > 0.4) chairs.push([desk.position.x + inward.x * 0.95, desk.position.z + inward.z * 0.95, -theta + Math.PI]);
    }
    chairs.push([0, 0.75, Math.PI]);
    const vinyl = s.material(a.palette === 'beige' ? '#5b3b2a' : '#3f5a4b', { roughness: 0.55 });
    chairs.forEach(([x, z, turn], index) => {
      const chair = new THREE.Group();
      for (let k = 0; k < 5; k++) chair.add(s.rod([0, 0.07, 0], [Math.cos(k * 1.257) * 0.3, 0.04, Math.sin(k * 1.257) * 0.3], 0.02, chrome));
      chair.add(s.cylinder(0.03, 0.03, 0.4, [0, 0.27, 0], chrome, 10), s.box([0.48, 0.08, 0.46], [0, 0.5, 0], vinyl), s.box([0.44, 0.38, 0.06], [0, 0.86, -0.22], vinyl), s.rod([0, 0.48, -0.2], [0, 0.72, -0.24], 0.016, chrome));
      const fled = a.operators === 'fled' || dead;
      if (a.operators === 'stepped' && index % 2 === 0) chair.add(s.box([0.5, 0.42, 0.1], [0, 0.88, -0.24], s.material(index % 4 ? '#4a4038' : '#3c4f6a', { roughness: 0.9 })));
      const push = fled ? 0.6 + random() * 0.9 : a.operators === 'stepped' ? 0.3 * random() : 0;
      const inwardX = -x, inwardZ = 2.6 - z, length = Math.hypot(inwardX, inwardZ) || 1;
      chair.position.set(x + inwardX / length * push + (fled ? (random() - 0.5) * 0.6 : 0), 0, z + inwardZ / length * push);
      chair.rotation.y = turn + (fled ? (random() - 0.5) * 3 : a.operators === 'stepped' ? (random() - 0.5) * 1.2 : 0);
      if (fled && random() < 0.55) { chair.rotation.z = Math.PI / 2; chair.position.y = 0.25; }
      if (index === chairs.length - 1 && !fled) chair.position.z = 0.95;
      s.root.add(chair);
    });

    // --- Lights, litter and the small furniture of a long shift --------------------------------
    const lit = !gloom && !dead;
    const tube = new THREE.MeshStandardMaterial({ color: lit ? '#fffbe6' : '#b9b8aa', emissive: '#fff6c4', emissiveIntensity: lit ? (a.status === 'quiet' ? 0.5 : 0.9) : 0, roughness: 0.5 });
    for (const x of [-4.2, 4.2]) {
      const fallen = dead && x > 0;
      const fitting = new THREE.Group();
      fitting.add(s.box([2.6, 0.1, 0.5], [0, 0, 0], s.material('#d9d6c8')), s.box([2.5, 0.03, 0.42], [0, -0.06, 0], tube));
      if (fallen) { fitting.position.set(x - 1.2, 0.2, 2.8); fitting.rotation.set(0.1, 0.7, 0.12); }
      else { fitting.position.set(x, 3.75, -0.4); fitting.rotation.y = x > 0 ? -0.35 : 0.35; for (const dx of [-1, 1]) fitting.add(s.rod([dx, 0.05, 0], [dx, 0.9, 0], 0.012, dark)); }
      s.root.add(fitting);
    }
    const extinguisherX = 6.2;
    s.cylinder(0.09, 0.09, 0.5, [extinguisherX, 0.28, 0.2], s.material('#c8261c', { roughness: 0.35 }), 14);
    s.cylinder(0.03, 0.05, 0.1, [extinguisherX, 0.58, 0.2], dark, 10);
    // Coat stand by the left end of the wall.
    s.cylinder(0.02, 0.02, 1.8, [-6.2, 0.9, 0.3], dark, 8);
    s.cylinder(0.22, 0.24, 0.03, [-6.2, 0.015, 0.3], dark, 16);
    if (a.operators !== 'fled' && !dead) { s.ball([0.2, 0.42, 0.12], [-6.08, 1.3, 0.36], s.material('#4a4038', { roughness: 0.95 }), 12); s.cylinder(0.16, 0.17, 0.02, [-6.2, 1.82, 0.3], s.material('#3a332c'), 16); s.cylinder(0.09, 0.1, 0.1, [-6.2, 1.87, 0.3], s.material('#3a332c'), 14); }
    else s.ball([0.4, 0.07, 0.3], [-2 + random() * 4, 0.06, 2.6 + random()], s.material('#4a4038', { roughness: 0.95 }), 12);
    const sheets = Math.round((a.operators === 'fled' ? 14 : 0) + (dead ? 34 : 0) + (a.status === 'alarm' ? 8 : 0) + mood.density * 6);
    if (sheets > 0) {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.21, 0.004, 0.3), s.material('#f1ecdc', { roughness: 0.9 }), sheets);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      for (let k = 0; k < sheets; k++) { q.setFromAxisAngle(up, random() * 6.283); m.compose(new THREE.Vector3((random() - 0.5) * 8, 0.012 + k * 0.0004, 0.4 + random() * 4), q, new THREE.Vector3(1, 1, 1)); mesh.setMatrixAt(k, m); }
      mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    const rate = mix(2.5, 8, mood.energy);
    if (a.status === 'alarm' || gloom) {
      const base = gloom ? 1.5 : 1;
      world.update = (_dt, time) => {
        const on = Math.sin(time * rate) > 0;
        for (const material of glowMaterials) {
          if (material.userData.beacon) material.emissiveIntensity = a.status === 'alarm' ? (Math.sin(time * rate * 0.6) > -0.3 ? 1.6 : 0.2) : 0.05;
          else material.emissiveIntensity = a.status === 'alarm' ? (on ? 1.25 : 0.7) : base * (0.85 + 0.15 * Math.sin(time * 13.7) * Math.sin(time * 2.3));
        }
      };
    }
    return world;
  },
});
