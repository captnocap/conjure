import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
const SIGNS = {
  herald: 'THE DAILY HERALD',
  accuracy: 'ACCURACY  ACCURACY  ACCURACY',
  first: 'GET IT FIRST. GET IT RIGHT.',
  final: 'FINAL EDITION TONIGHT',
  smoking: 'NO SMOKING',
  dead: 'DEADLINE 11:55',
} as const;
const MOMENTS = {
  deadline: { lit: 1, haze: 1, paper: 1, bg: '#cdc6b4', key: 2.2, hemi: 1.2, time: 23 + 55 / 60 },
  election: { lit: 1, haze: 0.75, paper: 0.8, bg: '#cfcabd', key: 2.3, hemi: 1.25, time: 2 + 10 / 60 },
  afternoon: { lit: 0.35, haze: 0.3, paper: 0.4, bg: '#e6e2d4', key: 2.8, hemi: 1.45, time: 15 + 20 / 60 },
  night: { lit: 0.1, haze: 0.2, paper: 0.3, bg: '#a3a6aa', key: 1.35, hemi: 0.9, time: 4 + 5 / 60 },
  last: { lit: 0.2, haze: 0.1, paper: 0.12, bg: '#cbc6ba', key: 2.0, hemi: 1.15, time: 23 + 59 / 60 },
  strike: { lit: 0, haze: 0, paper: 0.08, bg: '#dad9d2', key: 2.5, hemi: 1.35, time: 10 + 10 / 60 },
} as const;

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default defineWorld({
  questions: {
    moment: choice('What is happening in the newsroom?', {
      deadline: 'Deadline: every lamp lit, paper everywhere, smoke hanging thick.',
      election: 'Election night: bunting strung up, everyone waiting on the count.',
      afternoon: 'A slow afternoon: half the lamps off, desks tidy, dust in the light.',
      night: 'The dead of night: a skeleton staff and one pool of light over the copy desk.',
      last: 'The last edition: boxes packed on the desks, chairs upturned, typewriters covered.',
      strike: 'A strike: the room is empty, placards left leaning on the desks.',
    }),
    board: choice('What covers the big board on the back wall?', {
      map: 'A city street map stuck with coloured pins.',
      tally: 'A blackboard of chalked vote tallies, ward by ward.',
      dummies: 'Tomorrow\'s pages pinned up as layout dummies.',
      chart: 'A circulation chart with one long line across it.',
    }),
    lamps: choice('What hangs over the desks?', {
      cone: 'Green enamel cone pendants on long rods.',
      globe: 'White glass schoolhouse globes.',
      tube: 'Long fluorescent troughs, buzzing.',
      bulb: 'Bare bulbs on twisted flex.',
    }),
    office: choice('What is going on in the glass-walled editor\'s office?', {
      lit: 'The lamp is on and the door stands open.',
      dark: 'Dark and empty.',
      blinds: 'The blinds are drawn with light leaking round them: a closed-door meeting.',
      cleared: 'Cleared out: a bare desk and a packed box.',
    }),
    floor: choice('What is the floor?', {
      checker: 'Green and cream linoleum squares.',
      boards: 'Dark oiled floorboards.',
      lino: 'Plain brown linoleum, scuffed in tracks between the desks.',
      concrete: 'Painted grey concrete.',
    }),
    desks: choice('What are the desks like?', {
      grey: 'Battleship grey steel tanker desks.',
      olive: 'Olive green government surplus.',
      wood: 'Old scarred oak, older than anyone here.',
      black: 'Black enamel and chrome.',
    }),
    sign: choice('What does the sign over the clocks say?', SIGNS),
    outside: choice('What is at the tall windows?', {
      sky: 'Open sky over the city.',
      rain: 'Rain running down the glass.',
      neon: 'A neon sign across the street, bleeding red into the room.',
      blinds: 'Venetian blinds shut tight.',
      brick: 'The brick wall of the building next door.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const moment = MOMENTS[a.moment];
    const floorColour = { checker: '#d8d2b8', boards: '#6f4d33', lino: '#8d6a4c', concrete: '#a7aaa6' }[a.floor];
    const { art: s, world } = diorama(context, {
      background: moment.bg, floor: floorColour, width: 14, depth: 11, maxHeight: 3.0, radius: 1.5, pitch: 34, yaw: 22,
      slots: [[0, 1.4], [-4.9, 3.6], [4.9, 3.6], [0, -3.3], [2.5, -2.5, 0, 0.7], [-2.5, -2.5, 0, 0.7]],
    });
    for (const child of s.root.children) if ((child as THREE.HemisphereLight).isHemisphereLight) (child as THREE.HemisphereLight).intensity = moment.hemi;
    if (world.keyLight) world.keyLight.intensity = moment.key;

    // Everything boxy goes through batches: one instanced mesh per material.
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const batches = new Map<THREE.Material, THREE.Matrix4[]>();
    const q = new THREE.Quaternion(), euler = new THREE.Euler();
    const put = (material: THREE.Material, size: P3, at: P3, turn = 0, tiltX = 0, tiltZ = 0) => {
      q.setFromEuler(euler.set(tiltX, turn, tiltZ, 'YXZ'));
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...at), q.clone(), new THREE.Vector3(...size));
      if (!batches.has(material)) batches.set(material, []);
      batches.get(material)!.push(matrix);
    };
    const frame = (x: number, z: number, turn: number) => (material: THREE.Material, size: P3, at: P3, spin = 0, tiltX = 0, tiltZ = 0) => {
      const c = Math.cos(turn), sn = Math.sin(turn);
      put(material, size, [x + at[0] * c + at[2] * sn, at[1], z - at[0] * sn + at[2] * c], turn + spin, tiltX, tiltZ);
    };

    const deskColour = { grey: '#8b9391', olive: '#66704a', wood: '#7a5230', black: '#2d2f32' }[a.desks];
    const steel = s.material(deskColour, { metalness: a.desks === 'wood' ? 0 : 0.35, roughness: 0.5 });
    const lino = s.material({ grey: '#5f6f66', olive: '#3f4a3c', wood: '#5d3d24', black: '#4a5054' }[a.desks], { roughness: 0.8 });
    const dark = s.material('#1d1f21', { roughness: 0.55 });
    const paper = s.material(mood.wear > 0.6 ? '#e6dcb9' : '#f3efe2', { roughness: 0.9 });
    const wood = s.material('#7a5232', { roughness: 0.6 });
    const card = s.material('#b08a5a', { roughness: 0.95 });
    const cover = s.material('#77736a', { roughness: 0.95 });
    const wall = s.material(mood.warmth > 0.5 ? '#d8cfb2' : '#c3cbc2', { roughness: 0.9 });
    const dado = s.material(mood.warmth > 0.5 ? '#8a7350' : '#6f8078', { roughness: 0.8 });
    const trim = s.material('#4a3423', { roughness: 0.6 });
    const chrome = s.material('#c9cdcf', { metalness: 0.8, roughness: 0.3 });
    const papers = Math.min(1, moment.paper * 0.75 + mood.density * 0.35);

    // Floor pattern.
    if (a.floor === 'checker') { const tile = s.material('#5f7a66', { roughness: 0.7 }); for (let x = 0; x < 14; x++) for (let z = 0; z < 11; z++) if ((x + z) % 2 === 0) put(tile, [0.98, 0.016, 0.98], [x - 6.5, 0.006, z - 5]); }
    else if (a.floor === 'boards') { const gap = s.material('#4a3120'); for (let z = -5.25; z < 5.5; z += 0.5) put(gap, [14, 0.012, 0.03], [0, 0.004, z]); }
    else if (a.floor === 'lino') { const scuff = s.material('#94714f', { roughness: 0.95 }); for (const [x, z, w, d] of [[0, 3.9, 9, 0.9], [-2.9, -1.5, 0.8, 6], [2.9, -1.5, 0.8, 5], [0, -2.2, 5, 0.8]] as const) put(scuff, [w, 0.01, d], [x, 0.004, z]); }

    // Walls: back and left, with a dado and skirting.
    put(wall, [14, 4.6, 0.22], [0, 2.3, -5.4]);
    put(wall, [0.22, 4.6, 10.8], [-6.9, 2.3, 0]);
    put(dado, [10.1, 1.1, 0.03], [-1.85, 0.55, -5.28]);
    put(dado, [0.03, 1.1, 10.6], [-6.78, 0.55, 0.1]);
    put(trim, [10.1, 0.07, 0.05], [-1.85, 1.12, -5.27]);
    put(trim, [0.05, 0.07, 10.6], [-6.77, 1.12, 0.1]);

    // Tall windows down the left wall, with radiators beneath.
    const dayTint = new THREE.Color().setHSL(mix(0.58, 0.07, Math.abs(mood.daylight - 0.5) * 2 * (mood.daylight > 0.5 ? 1 : 0.5)), 0.55, mix(0.55, 0.82, 1 - Math.abs(mood.daylight - 0.5) * 2));
    const dim = a.moment === 'night' || a.moment === 'deadline' || a.moment === 'election';
    const glassColour = { sky: dim ? new THREE.Color('#2c3f63') : dayTint, rain: new THREE.Color(dim ? '#34424f' : '#8d9aa3'), neon: new THREE.Color('#5a1a22'), blinds: new THREE.Color('#d9d0b4'), brick: new THREE.Color('#8a4b38') }[a.outside];
    const windowTexture = paint(128, 256, (g) => {
      g.fillStyle = `#${glassColour.getHexString()}`;
      g.fillRect(0, 0, 128, 256);
      if (a.outside === 'rain') { g.strokeStyle = 'rgba(230,240,250,0.55)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = random() * 128, y = random() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 14 + random() * 30); g.stroke(); } }
      else if (a.outside === 'neon') { g.fillStyle = '#ff3b3b'; g.font = '900 54px sans-serif'; g.textAlign = 'center'; ['H', 'O', 'T', 'E', 'L'].forEach((letter, index) => g.fillText(letter, 64, 52 + index * 48)); }
      else if (a.outside === 'brick') { g.strokeStyle = '#5d2f24'; g.lineWidth = 2; for (let y = 0; y < 256; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); for (let x = (y / 12) % 2 ? 0 : 16; x < 128; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 12); g.stroke(); } } }
      else if (a.outside === 'blinds') { g.fillStyle = 'rgba(80,70,50,0.45)'; for (let y = 0; y < 256; y += 9) g.fillRect(0, y, 128, 2); }
      else if (dim) { g.fillStyle = '#ffd98a'; for (let i = 0; i < 46; i++) g.fillRect(8 + Math.floor(random() * 14) * 8, 110 + Math.floor(random() * 17) * 8, 4, 5); g.fillStyle = '#1c2a44'; g.fillRect(0, 246, 128, 10); }
      else { g.fillStyle = 'rgba(70,80,95,0.5)'; for (let i = 0; i < 7; i++) { const w = 12 + random() * 22, h = 40 + random() * 110; g.fillRect(i * 19, 256 - h, w, h); } }
    });
    const paneGlow = a.outside === 'neon' ? 0.9 : a.outside === 'brick' ? 0.1 : a.outside === 'blinds' ? (dim ? 0.05 : 0.45) : dim ? 0.45 : 0.75;
    const pane = new THREE.MeshStandardMaterial({ map: windowTexture, emissive: '#ffffff', emissiveMap: windowTexture, emissiveIntensity: paneGlow, roughness: 0.3 });
    const rad = s.material('#b9b6a8', { metalness: 0.3, roughness: 0.5 });
    for (const z of [-3.75, -1.25, 1.25, 3.75]) {
      const glass = s.mesh(new THREE.PlaneGeometry(1.5, 2.6), pane, [-6.775, 2.75, z]);
      glass.rotation.y = Math.PI / 2;
      glass.castShadow = false;
      put(trim, [0.06, 2.76, 0.09], [-6.76, 2.75, z - 0.79]);
      put(trim, [0.06, 2.76, 0.09], [-6.76, 2.75, z + 0.79]);
      put(trim, [0.06, 0.09, 1.66], [-6.76, 4.09, z]);
      put(trim, [0.16, 0.07, 1.74], [-6.72, 1.41, z]);
      put(trim, [0.04, 2.6, 0.04], [-6.765, 2.75, z]);
      put(trim, [0.04, 0.04, 1.5], [-6.765, 2.75, z]);
      for (let i = 0; i < 9; i++) put(rad, [0.16, 0.62, 0.07], [-6.66, 0.42, z - 0.44 + i * 0.11]);
    }

    // The big board.
    const boardTexture = paint(512, 288, (g) => {
      if (a.board === 'map') {
        g.fillStyle = '#e4d9b6'; g.fillRect(0, 0, 512, 288);
        const blocks = ['#d6c99f', '#cfd6b0', '#dcc7a6', '#c9d1c0'];
        for (let i = 0; i < 16; i++) { g.fillStyle = blocks[i % 4]; g.fillRect(random() * 460, random() * 240, 60 + random() * 90, 40 + random() * 70); }
        g.strokeStyle = '#a2936b'; g.lineWidth = 2;
        for (let x = 20; x < 512; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, 288); g.stroke(); }
        for (let y = 16; y < 288; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y - 14); g.stroke(); }
        g.strokeStyle = '#6fa3c4'; g.lineWidth = 22; g.beginPath(); g.moveTo(-10, 60); g.bezierCurveTo(160, 20, 260, 240, 530, 190); g.stroke();
        for (let i = 0; i < 26; i++) { g.fillStyle = ['#c2261c', '#1f4fb5', '#e3b320', '#1c1c1c'][Math.floor(random() * 4)]; g.beginPath(); g.arc(20 + random() * 470, 16 + random() * 256, 6, 0, 7); g.fill(); }
      } else if (a.board === 'tally') {
        g.fillStyle = '#26352d'; g.fillRect(0, 0, 512, 288);
        g.fillStyle = '#e9ead8'; g.strokeStyle = '#e9ead8'; g.lineWidth = 3;
        g.font = 'bold 30px monospace';
        g.fillText('WARD', 20, 36); g.fillText('DEM', 200, 36); g.fillText('REP', 360, 36);
        g.beginPath(); g.moveTo(10, 48); g.lineTo(502, 48); g.moveTo(170, 8); g.lineTo(170, 280); g.moveTo(330, 8); g.lineTo(330, 280); g.stroke();
        g.font = 'bold 26px monospace';
        for (let row = 0; row < 7; row++) { g.fillText(String(row + 1), 60, 80 + row * 32); if (row < 3 + mood.energy * 4) { g.fillText(String(Math.floor(800 + random() * 4000)), 196, 80 + row * 32); g.fillText(String(Math.floor(800 + random() * 4000)), 356, 80 + row * 32); } }
      } else if (a.board === 'dummies') {
        g.fillStyle = '#b8935c'; g.fillRect(0, 0, 512, 288);
        for (let i = 0; i < 8; i++) {
          const x = 14 + (i % 4) * 124, y = 12 + Math.floor(i / 4) * 138;
          g.fillStyle = '#f3efe2'; g.fillRect(x, y, 108, 126);
          g.fillStyle = '#1c1c1e'; g.fillRect(x + 6, y + 6, 96, 12);
          g.fillStyle = '#8b8b88'; g.fillRect(x + 6 + (i % 2) * 44, y + 26, 50, 44);
          g.fillStyle = '#b9b7ae'; for (let c = 0; c < 4; c++) g.fillRect(x + 6 + c * 25, y + 76, 20, 44);
          g.strokeStyle = '#1f4fb5'; g.lineWidth = 3; if (i % 3 === 0) { g.beginPath(); g.moveTo(x + 8, y + 30); g.lineTo(x + 100, y + 118); g.stroke(); }
        }
      } else {
        g.fillStyle = '#efead8'; g.fillRect(0, 0, 512, 288);
        g.strokeStyle = '#c9c2a8'; g.lineWidth = 1;
        for (let x = 40; x < 512; x += 36) { g.beginPath(); g.moveTo(x, 16); g.lineTo(x, 256); g.stroke(); }
        for (let y = 16; y < 260; y += 30) { g.beginPath(); g.moveTo(40, y); g.lineTo(500, y); g.stroke(); }
        g.strokeStyle = '#1c1c1e'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 12); g.lineTo(40, 256); g.lineTo(504, 256); g.stroke();
        g.strokeStyle = '#c2261c'; g.lineWidth = 7; g.beginPath();
        let y = mood.cheer > 0.5 ? 220 : 60;
        for (let x = 40; x <= 500; x += 23) { g.lineTo(x, y); y += (mood.cheer > 0.5 ? -1 : 1) * (2 + random() * 12) + (random() - 0.5) * 18; y = Math.min(250, Math.max(22, y)); }
        g.stroke();
      }
    });
    put(trim, [4.56, 2.56, 0.08], [-4.2, 2.6, -5.26]);
    s.mesh(new THREE.PlaneGeometry(4.4, 2.4), new THREE.MeshStandardMaterial({ map: boardTexture, roughness: 0.85 }), [-4.2, 2.6, -5.215]);

    // Sign, clocks and their city plates.
    s.label(SIGNS[a.sign], 4.6, 0.46, [0.9, 4.18, -5.28], a.sign === 'smoking' ? '#b3261e' : '#22262a', '#efe6c8');
    const clockFace = paint(128, 128, (g) => {
      g.fillStyle = '#f4efdf'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#1c1c1e';
      for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 3 : 7; g.beginPath(); g.moveTo(64 + Math.sin(t) * 46, 64 - Math.cos(t) * 46); g.lineTo(64 + Math.sin(t) * 58, 64 - Math.cos(t) * 58); g.stroke(); }
    });
    const faceMaterial = new THREE.MeshStandardMaterial({ map: clockFace, roughness: 0.5, emissive: '#ffffff', emissiveMap: clockFace, emissiveIntensity: dim ? 0.3 : 0.05 });
    const secondHands: { hand: THREE.Object3D; phase: number }[] = [];
    const redHand = s.material('#c2261c');
    const cities: [string, number][] = [['NEW YORK', 0], ['LONDON', 5], ['PARIS', 6], ['MOSCOW', 8], ['TOKYO', 14]];
    cities.forEach(([name, offset], index) => {
      const x = -0.9 + index * 0.9, y = 3.3, z = -5.29;
      s.cylinder(0.33, 0.33, 0.07, [x, y, z + 0.035], dark, 28).rotation.x = Math.PI / 2;
      s.mesh(new THREE.CircleGeometry(0.29, 28), faceMaterial, [x, y, z + 0.072]);
      const hours = (moment.time + offset) % 12, minutes = (moment.time % 1) * 60;
      const hand = (length: number, width: number, angle: number, material: THREE.Material, lift: number) => {
        const geometry = new THREE.BoxGeometry(width, length, 0.008);
        geometry.translate(0, length * 0.4, 0);
        const mesh = s.mesh(geometry, material, [x, y, z + 0.078 + lift]);
        mesh.rotation.z = -angle;
        mesh.castShadow = false;
        return mesh;
      };
      hand(0.15, 0.03, hours / 12 * Math.PI * 2, dark, 0);
      hand(0.23, 0.02, minutes / 60 * Math.PI * 2, dark, 0.006);
      if (a.moment !== 'last') secondHands.push({ hand: hand(0.25, 0.008, 0, redHand, 0.012), phase: random() * 60 });
      s.label(name, 0.78, 0.15, [x, 2.82, z + 0.012], '#efe6c8', '#22262a');
    });

    // Wire machines under the clocks.
    for (let i = 0; i < 4; i++) {
      const f = frame(-0.75 + i * 1.05, -4.92, 0);
      f(steel, [0.55, 0.7, 0.42], [0, 0.35, 0]);
      f(dark, [0.5, 0.3, 0.38], [0, 0.85, 0]);
      f(paper, [0.22, 0.02, 0.3], [0, 1.02, 0.08], 0, 0.5);
      f(paper, [0.22, 0.5 + random() * 0.35, 0.01], [0, 0.7, 0.24], 0, 0.06);
      if (papers > 0.4) f(paper, [0.3, 0.012, 0.4], [0.05, 0.01, 0.5], random());
    }

    // The glass-walled editor's office in the back right corner.
    const officeLit = a.office === 'lit' || a.office === 'blinds';
    const glassWall = a.office === 'blinds'
      ? new THREE.MeshStandardMaterial({ color: '#d8cdaa', emissive: '#ffcf80', emissiveIntensity: 0.45, roughness: 0.8 })
      : new THREE.MeshStandardMaterial({ color: '#cfe0df', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false });
    const glowWall = new THREE.MeshStandardMaterial({ color: '#e9dfc0', emissive: '#ffcf80', emissiveIntensity: officeLit ? 0.55 : 0, roughness: 0.9 });
    put(glowWall, [3.6, 3.1, 0.03], [5.05, 1.56, -5.27]);
    put(dado, [3.75, 1.0, 0.1], [5.07, 0.5, -3.0]);
    put(dado, [0.1, 1.0, 2.3], [3.2, 0.5, -4.15]);
    const frontGlass = s.mesh(new THREE.BoxGeometry(2.6, 2.0, 0.04), glassWall, [5.6, 2.0, -3.0]);
    const sideGlass = s.mesh(new THREE.BoxGeometry(0.04, 2.0, 2.3), glassWall, [3.2, 2.0, -4.15]);
    frontGlass.castShadow = sideGlass.castShadow = false;
    put(trim, [3.75, 0.1, 0.12], [5.07, 3.05, -3.0]);
    put(trim, [0.12, 0.1, 2.3], [3.2, 3.05, -4.15]);
    put(trim, [0.12, 3.1, 0.12], [3.2, 1.55, -3.0]);
    for (const x of [4.3, 5.17, 6.03, 6.9]) put(trim, [0.07, 2.1, 0.08], [x, 2.0, -3.0]);
    for (const z of [-4.0, -4.9]) put(trim, [0.08, 2.1, 0.07], [3.2, 2.0, z]);
    if (a.office === 'blinds') for (let y = 1.1; y < 3; y += 0.12) { put(trim, [2.6, 0.012, 0.05], [5.6, y, -2.99]); put(trim, [0.05, 0.012, 2.3], [3.19, y, -4.15]); }
    // Door with a lettered pane.
    const open = a.office === 'lit' || a.office === 'cleared';
    const door = new THREE.Group();
    door.position.set(3.3, 0, -3.0);
    door.rotation.y = open ? 1.15 : 0;
    s.root.add(door);
    const doorPart = (mesh: THREE.Object3D) => { door.add(mesh); return mesh; };
    doorPart(s.box([0.95, 2.1, 0.06], [0.5, 1.05, 0], trim));
    doorPart(s.label(a.office === 'cleared' ? 'TO LET' : 'CITY EDITOR', 0.74, 0.8, [0.5, 1.5, 0.034], '#22262a', officeLit ? '#f4e6b8' : '#cfd3c8'));
    doorPart(s.ball([0.04, 0.04, 0.04], [0.86, 1.0, 0.06], chrome, 10));
    put(trim, [1.1, 0.95, 0.06], [3.77, 2.6, -3.0]);
    // Inside: a wooden desk, lamp, bookcase and hat stand, or what is left of them.
    const office = frame(5.5, -4.25, -0.25);
    office(wood, [1.9, 0.06, 0.95], [0, 0.76, 0]);
    office(wood, [0.5, 0.72, 0.85], [-0.65, 0.37, 0]);
    office(wood, [0.5, 0.72, 0.85], [0.65, 0.37, 0]);
    if (a.office === 'cleared') { office(card, [0.5, 0.36, 0.4], [0.3, 0.97, 0]); office(card, [0.5, 0.01, 0.2], [0.3, 1.16, 0.22], 0, -0.7); }
    else {
      office(paper, [0.5, 0.012, 0.36], [-0.2, 0.8, 0.05], 0.2);
      office(dark, [0.22, 0.1, 0.2], [0.6, 0.84, -0.1]);
      office(wood, [0.55, 0.06, 0.5], [0, 0.5, -0.85]);
      office(wood, [0.55, 0.6, 0.06], [0, 0.82, -1.1]);
      s.rod([5.0, 0.79, -4.0], [5.0, 1.12, -4.0], 0.014, chrome);
      const shade = s.cylinder(0.07, 0.07, 0.34, [5.0, 1.14, -4.0], new THREE.MeshStandardMaterial({ color: '#1f7a4d', emissive: '#35c57c', emissiveIntensity: officeLit ? 1.2 : 0, roughness: 0.25 }), 14);
      shade.rotation.z = Math.PI / 2;
    }
    put(wood, [1.3, 2.0, 0.34], [6.2, 1.0, -5.1]);
    for (let shelf = 0; shelf < 4; shelf++) put(a.office === 'cleared' ? dark : s.material(['#7a2a26', '#27477a', '#3f5d3a', '#8a6a2a'][shelf]), [1.14, 0.34, 0.03], [6.2, 0.3 + shelf * 0.46, -4.925]);
    s.rod([3.65, 0, -5.0], [3.65, 1.85, -5.0], 0.022, wood);
    if (a.office !== 'cleared') s.lathe([[0, 0.12], [0.07, 0.125], [0.1, 0.11], [0.105, 0.03], [0.19, 0.02], [0.2, 0.03], [0.19, 0.012], [0, 0.012]], s.material('#4a4138', { roughness: 0.95 }), [3.65, 1.82, -5.0]).rotation.z = 0.25;

    // Desk ranks.
    const boxed = a.moment === 'last', idle = a.moment === 'last' || a.moment === 'strike';
    const desk = (x: number, z: number, turn: number) => {
      const f = frame(x, z, turn);
      f(steel, [1.5, 0.045, 0.75], [0, 0.74, 0]);
      f(lino, [1.42, 0.008, 0.67], [0, 0.766, 0]);
      for (const side of [-1, 1]) { f(steel, [0.4, 0.56, 0.68], [side * 0.53, 0.44, 0]); f(dark, [0.34, 0.14, 0.6], [side * 0.53, 0.09, 0]); f(chrome, [0.14, 0.02, 0.015], [side * 0.53, 0.62, 0.345]); f(chrome, [0.14, 0.02, 0.015], [side * 0.53, 0.42, 0.345]); }
      f(steel, [0.66, 0.42, 0.02], [0, 0.5, -0.34]);
      const tx = (random() - 0.5) * 0.3;
      if (idle) f(cover, [0.46, 0.2, 0.36], [tx, 0.87, 0.05], (random() - 0.5) * 0.2);
      else {
        const spin = (random() - 0.5) * 0.3;
        f(dark, [0.38, 0.1, 0.32], [tx, 0.82, 0.08], spin);
        f(dark, [0.46, 0.07, 0.1], [tx, 0.9, -0.04], spin);
        f(paper, [0.2, 0.22, 0.006], [tx, 1.03, -0.07], spin, -0.15);
      }
      if (boxed && random() < 0.7) { f(card, [0.42, 0.32, 0.34], [-0.48, 0.93, -0.1], random() * 0.5); f(card, [0.42, 0.01, 0.17], [-0.48, 1.1, 0.14], 0, -0.6); }
      else {
        const pile = 0.01 + random() * 0.14 * papers;
        f(paper, [0.22, pile, 0.3], [-0.5, 0.77 + pile / 2, -0.12], (random() - 0.5) * 0.4);
        f(dark, [0.18, 0.09, 0.2], [0.52, 0.815, -0.16], (random() - 0.5) * 0.5);
        f(dark, [0.22, 0.035, 0.06], [0.52, 0.875, -0.16], (random() - 0.5) * 0.5);
        for (let i = 0; i < Math.round(papers * 4 * random()); i++) f(paper, [0.21, 0.004, 0.28], [(random() - 0.5) * 1.1, 0.772 + i * 0.004, 0.1 + (random() - 0.5) * 0.3], random() * 3);
      }
      // Chair.
      const cx = tx * 0.5, up = boxed && random() < 0.55;
      if (up) { f(wood, [0.44, 0.05, 0.44], [0.3, 0.8, 0.1], 0.4); f(wood, [0.44, 0.04, 0.42], [0.3, 0.99, 0.3], 0.4, Math.PI / 2 - 0.2); for (const lx of [-0.17, 0.17]) for (const lz of [-0.17, 0.17]) f(wood, [0.04, 0.42, 0.04], [0.3 + lx, 1.02, 0.1 + lz], 0.4); }
      else if (!(a.moment === 'strike' && random() < 0.3)) {
        const cz = a.moment === 'strike' ? 0.5 : 0.7 + random() * 0.2, spin = idle ? 0 : (random() - 0.5) * 1.2;
        f(wood, [0.44, 0.05, 0.44], [cx, 0.46, cz], spin);
        f(dark, [0.06, 0.44, 0.06], [cx, 0.23, cz]);
        f(dark, [0.5, 0.03, 0.07], [cx, 0.03, cz], spin + 0.6); f(dark, [0.07, 0.03, 0.5], [cx, 0.03, cz], spin + 0.6);
        f(wood, [0.42, 0.36, 0.04], [cx + Math.sin(spin) * 0.21, 0.72, cz + Math.cos(spin) * 0.21], spin, 0.1);
      }
    };
    const pendants: P3[] = [];
    const pair = (x: number, z: number) => { desk(x, z + 0.38, 0); desk(x, z - 0.38, Math.PI); };
    for (const z of [-3.85, -1.55]) { for (const x of [-5.85, -4.33]) pair(x, z); pendants.push([-5.1, 3.25, z]); }
    for (const x of [-5.85, -4.33]) desk(x, 0.72, 0);
    pendants.push([-5.1, 3.25, 0.7]);
    for (const x of [4.33, 5.85]) pair(x, -1.35);
    pendants.push([5.1, 3.25, -1.35]);
    for (const x of [4.33, 5.85]) desk(x, 0.9, 0);
    pendants.push([5.1, 3.25, 0.9]);

    // The city editor's horseshoe, open to the front, with the slot in the middle.
    const HX = 0, HZ = 1.4, RI = 1.72, RO = 2.4;
    const shoe = new THREE.Shape();
    shoe.absarc(0, 0, RO, -0.22, Math.PI + 0.22, false);
    shoe.absarc(0, 0, RI, Math.PI + 0.22, -0.22, true);
    const top = new THREE.ExtrudeGeometry(shoe, { depth: 0.06, bevelEnabled: false, curveSegments: 40 });
    top.rotateX(-Math.PI / 2);
    s.mesh(top, a.desks === 'wood' ? steel : wood, [HX, 0.72, HZ]);
    const blotter = new THREE.Shape();
    blotter.absarc(0, 0, RO - 0.1, -0.18, Math.PI + 0.18, false);
    blotter.absarc(0, 0, RI + 0.1, Math.PI + 0.18, -0.18, true);
    const pad = new THREE.ShapeGeometry(blotter, 40);
    pad.rotateX(-Math.PI / 2);
    s.mesh(pad, s.material('#35604a', { roughness: 0.85 }), [HX, 0.785, HZ]).castShadow = false;
    s.mesh(new THREE.CylinderGeometry(RO - 0.06, RO - 0.06, 0.72, 48, 1, true, Math.PI / 2 - 0.22, Math.PI + 0.44), new THREE.MeshStandardMaterial({ color: steel.color, roughness: 0.55, metalness: steel.metalness, side: THREE.DoubleSide }), [HX, 0.36, HZ]);
    const rim = (angle: number, radius: number): [number, number] => [HX + Math.cos(angle) * radius, HZ - Math.sin(angle) * radius];
    for (let i = 0; i < 7; i++) {
      const angle = 0.05 + i * (Math.PI - 0.1) / 6, mid = (RI + RO) / 2;
      const [px, pz] = rim(angle, mid), turn = angle - Math.PI / 2;
      const f = frame(px, pz, turn);
      const pile = 0.01 + random() * 0.12 * papers;
      if (!boxed) f(paper, [0.22, pile, 0.3], [0.12, 0.79 + pile / 2, 0], random() * 0.6);
      else if (i % 2) f(card, [0.4, 0.3, 0.34], [0, 0.94, 0], random() * 0.5);
      if (i % 2 === 0 && !boxed) {
        s.cylinder(0.05, 0.05, 0.02, [px - Math.cos(angle) * 0.18, 0.795, pz + Math.sin(angle) * 0.18], dark, 12);
        s.rod([px - Math.cos(angle) * 0.18, 0.8, pz + Math.sin(angle) * 0.18], [px - Math.cos(angle) * 0.18, 1.04, pz + Math.sin(angle) * 0.18], 0.006, chrome, 0.001);
        for (let k = 0; k < Math.round(1 + papers * 5); k++) f(paper, [0.16, 0.003, 0.2], [-0.18 * Math.cos(0), 0.83 + k * 0.022, 0.0], random() * 3, (random() - 0.5) * 0.2, (random() - 0.5) * 0.2);
      } else if (!boxed) { f(dark, [0.18, 0.09, 0.2], [-0.2, 0.83, 0.05], random()); f(dark, [0.22, 0.035, 0.06], [-0.2, 0.89, 0.05], random()); }
      // Rim chairs outside the horseshoe.
      if (i !== 3 || true) {
        const [cx, cz] = rim(angle, RO + 0.42 + (idle ? -0.1 : random() * 0.15));
        const c = frame(cx, cz, turn + (idle ? 0 : (random() - 0.5) * 0.8));
        if (!(a.moment === 'strike' && i % 3 === 0)) {
          c(wood, [0.44, 0.05, 0.44], [0, 0.46, 0]);
          c(dark, [0.06, 0.44, 0.06], [0, 0.23, 0]);
          c(dark, [0.5, 0.03, 0.07], [0, 0.03, 0], 0.6); c(dark, [0.07, 0.03, 0.5], [0, 0.03, 0], 0.6);
          c(wood, [0.42, 0.36, 0.04], [0, 0.72, -0.21], 0, -0.1);
        }
      }
    }
    for (const angle of [0.45, Math.PI / 2, Math.PI - 0.45]) { const [px, pz] = rim(angle, RO + 0.1); pendants.push([px, 3.45, pz]); }

    // Strike placards and election bunting.
    if (a.moment === 'strike') for (const [x, z, turn] of [[-3.3, 0.6, 0.5], [3.4, 0.2, -0.4], [-1.2, -1.5, 0.2], [1.6, 3.6, -0.2]] as const) {
      const placard = new THREE.Group();
      placard.position.set(x, 0, z);
      placard.rotation.set(-0.2, turn, (random() - 0.5) * 0.2, 'YXZ');
      placard.add(s.box([0.05, 1.7, 0.03], [0, 0.85, 0], wood));
      placard.add(s.label(random() < 0.5 ? 'ON STRIKE' : 'UNFAIR', 0.95, 0.6, [0, 1.6, 0.02], '#b3261e', '#f3efe2'));
      s.root.add(placard);
    }
    if (a.moment === 'election') {
      const flags = ['#c2261c', '#f3efe2', '#27477a'].map((colour) => s.material(colour, { roughness: 0.8 }));
      for (const [from, to] of [[[-6.7, 4.2, -5.0], [3.2, 3.2, -3.0]], [[-6.7, 4.2, 1.5], [3.2, 3.2, -3.0]], [[-6.7, 4.2, -2.0], [6.9, 3.3, -3.0]]] as [P3, P3][]) {
        const points: P3[] = [];
        for (let i = 0; i <= 28; i++) { const t = i / 28; points.push([mix(from[0], to[0], t), mix(from[1], to[1], t) - Math.sin(t * Math.PI) * 0.7, mix(from[2], to[2], t)]); }
        s.tube(points, 0.008, dark).castShadow = false;
        const turn = Math.atan2(-(to[2] - from[2]), to[0] - from[0]);
        points.forEach((point, index) => { if (index % 1 === 0 && index && index < 28) put(flags[index % 3], [0.2, 0.26, 0.008], [point[0], point[1] - 0.14, point[2]], turn, 0, (random() - 0.5) * 0.3); });
      }
    }

    // Hanging lamps, their pools of light, and conduit.
    const glow = (colour: string, intensity: number) => new THREE.MeshStandardMaterial({ color: intensity ? colour : '#8d8a7c', emissive: colour, emissiveIntensity: intensity, roughness: 0.4 });
    const beam = new THREE.MeshBasicMaterial({ color: '#fff0c2', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
    const enamel = s.material('#2f6b4d', { roughness: 0.35, side: THREE.DoubleSide });
    const flicker: THREE.MeshStandardMaterial[] = [];
    pendants.forEach(([x, y, z], index) => {
      const overShoe = index >= pendants.length - 3;
      const lit = a.moment === 'strike' ? false : overShoe ? true : random() < moment.lit;
      const bulb = glow(a.lamps === 'tube' ? '#eaf6ff' : '#ffdf9a', lit ? 1.8 : 0);
      if (lit && random() < 0.2 + mood.wear * 0.3) flicker.push(bulb);
      s.rod([x, y + 0.1, z], [x, 4.75, z], a.lamps === 'bulb' ? 0.008 : 0.014, dark);
      if (a.lamps === 'cone') { s.lathe([[0.04, 0.3], [0.09, 0.24], [0.5, 0], [0.52, 0.015], [0.1, 0.28]], enamel, [x, y - 0.1, z]); s.ball([0.11, 0.13, 0.11], [x, y - 0.03, z], bulb, 10); }
      else if (a.lamps === 'globe') { s.cylinder(0.06, 0.09, 0.08, [x, y + 0.1, z], chrome, 12); s.ball([0.3, 0.3, 0.3], [x, y - 0.18, z], bulb, 16); }
      else if (a.lamps === 'tube') { s.box([1.9, 0.08, 0.38], [x, y + 0.02, z], s.material('#e6e6de')); s.box([1.8, 0.06, 0.1], [x, y - 0.05, z - 0.09], bulb); s.box([1.8, 0.06, 0.1], [x, y - 0.05, z + 0.09], bulb); }
      else { s.cylinder(0.025, 0.03, 0.08, [x, y + 0.06, z], dark, 10); s.ball([0.11, 0.14, 0.11], [x, y - 0.07, z], bulb, 10); }
      if (lit) {
        const cone = s.mesh(new THREE.ConeGeometry(1.25, y - 0.82, 24, 1, true), beam, [x, (y - 0.82) / 2 + 0.78, z]);
        cone.castShadow = cone.receiveShadow = false;
      }
    });
    put(dark, [3.2, 0.03, 0.03], [-5.1, 4.75, -1.57], Math.PI / 2);
    put(dark, [3.4, 0.03, 0.03], [-5.1, 4.75, -1.6], Math.PI / 2);
    put(dark, [4.7, 0.03, 0.03], [-5.1, 4.75, -1.57], Math.PI / 2);
    put(dark, [2.3, 0.03, 0.03], [5.1, 4.75, -0.22], Math.PI / 2);
    put(dark, [3.6, 0.03, 0.03], [0, 4.75, pendants[pendants.length - 3][2]]);

    // Paper on the floor: balls and loose sheets.
    const balls: { at: P3; size: number }[] = [];
    for (let i = 0; i < Math.round(papers * 70); i++) {
      const x = (random() - 0.5) * 12.6, z = (random() - 0.5) * 9.6;
      if (Math.hypot(x - HX, z - HZ) < RI - 0.1 || (x > 3.1 && z < -2.9)) continue;
      balls.push({ at: [x, 0.04, z], size: 0.7 + random() * 0.6 });
      if (i % 5 === 0) put(paper, [0.21, 0.004, 0.28], [x + 0.3, 0.005, z + 0.2], random() * 3);
    }
    if (balls.length) s.scatter(new THREE.DodecahedronGeometry(0.055, 0), new THREE.MeshStandardMaterial({ color: '#efeadb', roughness: 0.95, flatShading: true }), balls);

    // Smoke haze: soft discs hanging at lamp height.
    const haze = Math.min(1, moment.haze * 0.8 + mood.energy * 0.25) * (a.moment === 'strike' ? 0 : 1);
    const hazeTexture = paint(128, 128, (g) => {
      const gradient = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.6, 'rgba(255,255,255,0.45)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gradient;
      g.fillRect(0, 0, 128, 128);
    });
    const hazeDiscs: THREE.Mesh[] = [];
    if (haze > 0.05) for (let i = 0; i < 7; i++) {
      const disc = s.mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: hazeTexture, color: mood.warmth > 0.5 ? '#b9b2a4' : '#aab1b8', transparent: true, opacity: haze * (0.16 + random() * 0.16), depthWrite: false, side: THREE.DoubleSide }), [(random() - 0.5) * 10, 2.5 + random() * 1.3, -3.5 + random() * 6.5]);
      disc.rotation.x = -Math.PI / 2;
      disc.scale.set(4 + random() * 4, 2.5 + random() * 3, 1);
      disc.castShadow = disc.receiveShadow = false;
      hazeDiscs.push(disc);
    } else hazeTexture.dispose();

    // Flush the batches.
    for (const [material, matrices] of batches) {
      const mesh = new THREE.InstancedMesh(unit, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    const drift = mix(0.02, 0.12, mood.energy);
    world.update = (_dt, time) => {
      hazeDiscs.forEach((disc, index) => { disc.position.x += Math.sin(time * 0.2 + index) * drift * 0.004; disc.rotation.z = Math.sin(time * 0.07 + index * 2) * 0.4; });
      for (const { hand, phase } of secondHands) hand.rotation.z = -Math.floor(phase + time) / 60 * Math.PI * 2;
      flicker.forEach((bulb, index) => { bulb.emissiveIntensity = Math.sin(time * (17 + index * 5)) > 0.92 - mood.wear * 0.3 ? 0.4 : 1.8; });
    };
    return world;
  },
});
