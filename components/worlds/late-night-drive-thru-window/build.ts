import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type V3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: { at: V3; rot?: V3; size?: V3 }[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  items.forEach((item, index) => {
    e.set(...(item.rot ?? [0, 0, 0]));
    q.setFromEuler(e);
    matrix.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...(item.size ?? [1, 1, 1])));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

const CHAINS = {
  burger: { name: 'BURGER BARN', band: '#c8282c', accent: '#f2c21b', wall: '#e6dcc4' },
  chicken: { name: 'CLUCK HOUSE', band: '#b8201c', accent: '#f6f1e4', wall: '#f1ece0' },
  taco: { name: 'TACO RANCHO', band: '#5a2d82', accent: '#f28a1c', wall: '#d9c7a3' },
  coffee: { name: 'DRIVE BREW', band: '#1f5a3a', accent: '#e8dcc0', wall: '#cfc9b8' },
  diner: { name: 'MOON DINER', band: '#2a9d8f', accent: '#f1f1ec', wall: '#e9e4d8' },
} as const;

// Where the set stands: the wall's front face, the lane and the lamp.
const WALL = -3.1, ROOF = 3.6, KERB = -2.6, LAMP: V3 = [3.6, 0, 2.6];

export default defineWorld({
  questions: {
    chain: choice('What kind of place is it?', {
      burger: 'A burger box: red band, yellow accents, cream cladding.',
      chicken: 'A fried chicken place: red and white.',
      taco: 'A taco drive-thru: purple and orange over tan stucco.',
      coffee: 'A coffee drive-thru: dark green and cream.',
      diner: 'A retro diner: teal band and chrome.',
    }),
    hour: choice('What time of night is it?', {
      closing: 'Closing in ten minutes: a hand-written sign in the window, half the lights already off.',
      dead: 'The dead middle of the night: nobody, nothing moving, every sound loud.',
      rush: 'The after-bar rush: every light on, cones out, bags piling on the shelf inside.',
      predawn: 'Just before dawn: the sky going grey, the lights still on, the first delivery due.',
    }),
    window: choice('What is the pickup window doing?', {
      open: 'Slid open, warm light pouring out, a hand about to appear.',
      'card-only': 'Open, with a hand-written CARD ONLY sign taped to the glass.',
      closed: 'Shut, with a CLOSED sign and the glow behind it.',
    }),
    lot: choice('What is in the empty lot?', {
      empty: 'Nothing: painted bays and the dark.',
      'one-car': 'One car parked under the streetlight, lights off.',
      cones: 'A row of traffic cones blocking a bay.',
      trolley: 'A stray shopping trolley left at the kerb.',
      puddles: 'Puddles after rain reflecting the lights.',
    }),
    weather: choice('What is the weather doing?', {
      clear: 'Clear and still.',
      rain: 'Light rain: a wet shine on the asphalt.',
      snow: 'A thin dusting of snow on the kerb, roof and bays.',
    }),
    sign: choice('What does the sign on the roof say?', {
      open24: 'OPEN 24 HRS',
      drive: 'DRIVE THRU',
      late: 'LATE NITE',
      pickup: 'PICK UP HERE',
    }),
    board: choice('What is the menu board at the back doing?', {
      lit: 'Glowing steadily.',
      dark: 'Dark: switched off for the night.',
      flicker: 'Flickering and buzzing.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const chain = CHAINS[a.chain];
    const wet = a.weather === 'rain' || a.lot === 'puddles';
    const predawn = a.hour === 'predawn';
    const background = predawn ? '#8a93a6' : a.hour === 'dead' ? '#59627a' : a.hour === 'rush' ? '#5a6178' : '#636b80';
    const { art: s, world } = diorama(context, {
      background, floor: null, width: 12, depth: 8, maxHeight: 3.0, radius: 1.5, pitch: 21, yaw: 20, scale: [0.8, 1.35],
      slots: [[1.3, -0.9], [-3.4, -0.7], [4.2, -0.4], [-4.4, 2.3], [4.9, 2.9], [0.2, 2.8]],
    });
    const { root } = s;

    // ---- night lighting: a dim blue key, a warm pool at the window, a sodium lamp
    const key = world.keyLight!;
    key.intensity = predawn ? 1.3 : 0.75;
    key.color.set(predawn ? '#b9c2d6' : '#8d9ec4');
    for (const child of root.children) {
      if ((child as THREE.HemisphereLight).isHemisphereLight) { const h = child as THREE.HemisphereLight; h.intensity = predawn ? 0.9 : 0.6; h.color.set('#7f8ba8'); h.groundColor.set('#3a3b42'); }
      else if ((child as THREE.DirectionalLight).isDirectionalLight && child !== key) (child as THREE.DirectionalLight).intensity = 0.15;
    }
    const warm = new THREE.Color().setHSL(mix(0.1, 0.07, mood.warmth), 0.75, 0.7);
    const glowStrength = a.hour === 'dead' ? 0.6 : a.hour === 'closing' ? 0.75 : 1;
    const windowLight = new THREE.PointLight(warm, 14 * glowStrength * mix(0.7, 1.2, mood.cheer), 9, 2);
    windowLight.position.set(0, 1.9, WALL + 0.6);
    root.add(windowLight);
    const sodium = new THREE.Color('#ff9a2e');
    const lampLight = new THREE.PointLight(sodium, 26, 14, 2);
    lampLight.position.set(LAMP[0] - 1.1, 5.4, LAMP[2]);
    root.add(lampLight);

    // ---- the lot: one painted texture carries the lane, bays, arrows, pools of light and the fade into dark
    const FW = 13, FD = 9;
    const px = (x: number) => (x + FW / 2) / FW * 1024, pz = (z: number) => (z + FD / 2) / FD * 716;
    const lotArt = paint(1024, 716, (ctx) => {
      ctx.fillStyle = wet ? '#42464e' : a.weather === 'snow' ? '#5a5d64' : '#4c4f57';
      ctx.fillRect(0, 0, 1024, 716);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 2600; i++) ctx.fillRect(random() * 1024, random() * 716, 2, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let i = 0; i < 1200; i++) ctx.fillRect(random() * 1024, random() * 716, 3, 2);
      // The lane along the building, a touch paler where tyres have polished it.
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, pz(KERB), 1024, pz(1.0) - pz(KERB));
      ctx.fillStyle = mood.wear > 0.5 ? 'rgba(240,230,200,0.5)' : '#e9e4cf';
      ctx.setLineDash([]);
      ctx.fillRect(0, pz(1.05), 1024, 5);
      ctx.fillRect(0, pz(KERB + 0.45), 1024, 4);
      // Arrows down the lane and the words at the stop line.
      const arrow = (x: number, z: number, yellow: boolean) => {
        ctx.fillStyle = yellow ? (mood.wear > 0.5 ? 'rgba(240,215,70,0.55)' : '#f0d746') : '#e9e4cf';
        ctx.beginPath();
        ctx.moveTo(px(x - 1.1), pz(z - 0.18)); ctx.lineTo(px(x + 0.2), pz(z - 0.18)); ctx.lineTo(px(x + 0.2), pz(z - 0.45)); ctx.lineTo(px(x + 1.1), pz(z));
        ctx.lineTo(px(x + 0.2), pz(z + 0.45)); ctx.lineTo(px(x + 0.2), pz(z + 0.18)); ctx.lineTo(px(x - 1.1), pz(z + 0.18));
        ctx.closePath();
        ctx.fill();
      };
      arrow(-4.8, -0.7, true);
      arrow(3.4, -0.7, true);
      ctx.fillStyle = '#e9e4cf';
      ctx.font = '900 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STOP', px(-2.2), pz(-0.75));
      ctx.fillRect(px(-1.2), pz(KERB + 0.5), 6, pz(1.0) - pz(KERB + 0.5));
      // Parking bays on the lot side.
      ctx.strokeStyle = a.weather === 'snow' ? 'rgba(255,255,255,0.35)' : 'rgba(233,228,207,0.75)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const x = 1.4 + i * 2.4;
        ctx.beginPath(); ctx.moveTo(px(x), pz(1.9)); ctx.lineTo(px(x), pz(4.4)); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(px(-7.5), pz(1.9)); ctx.lineTo(px(-4.0), pz(1.9)); ctx.stroke();
      for (let i = 0; i < 2; i++) { const x = -6.4 + i * 2.4; ctx.beginPath(); ctx.moveTo(px(x), pz(1.9)); ctx.lineTo(px(x), pz(4.4)); ctx.stroke(); }
      // Oil stains and gum.
      ctx.fillStyle = 'rgba(20,18,16,0.35)';
      for (let i = 0; i < 6 + mood.wear * 12; i++) { ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 716, 10 + random() * 30, 6 + random() * 14, random() * 3, 0, Math.PI * 2); ctx.fill(); }
      if (a.weather === 'snow') {
        ctx.fillStyle = 'rgba(245,247,250,0.8)';
        for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 716, 20 + random() * 60, 8 + random() * 25, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      // Pools of light: warm under the window, sodium under the lamp.
      const pool = (x: number, z: number, r: number, colour: string, strength: number) => {
        const g = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r);
        g.addColorStop(0, colour.replace('A', String(strength)));
        g.addColorStop(1, colour.replace('A', '0'));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1024, 716);
      };
      pool(0, KERB + 0.6, 170, 'rgba(255,190,110,A)', 0.4 * glowStrength);
      pool(LAMP[0] - 1.1, LAMP[2], 230, 'rgba(255,160,60,A)', 0.42);
      // The edges of the lot fall away into the dark.
      const fade = ctx.createRadialGradient(px(0.5), pz(-0.5), 200, px(0.5), pz(-0.5), 640);
      fade.addColorStop(0, 'rgba(10,12,20,0)');
      fade.addColorStop(1, `rgba(10,12,20,${predawn ? 0.35 : 0.72})`);
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, 1024, 716);
    });
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: lotArt, roughness: wet ? 0.25 : 0.95, metalness: wet ? 0.25 : 0 }));
    lot.receiveShadow = true;
    root.add(lot);
    world.ground = lot;

    // ---- the building: a cladded box with a flat roof, the pickup window and a dark dining-room window
    const wall = s.material(chain.wall, { roughness: 0.9 });
    const band = s.material(chain.band, { roughness: 0.6 });
    const steel = s.material('#aeb3b6', { metalness: 0.7, roughness: 0.35 });
    const dark = s.material('#24262b', { roughness: 0.7 });
    const BW = 11, BD = 2.6, OX = 0.7, OB = 1.05, OT = 2.15;
    const wallBox = (size: V3, at: V3, material = wall) => s.box(size, at, material);
    wallBox([BW / 2 - OX, ROOF, BD], [-(OX + (BW / 2 - OX) / 2), ROOF / 2, WALL - BD / 2]);
    wallBox([BW / 2 - OX, ROOF, BD], [OX + (BW / 2 - OX) / 2, ROOF / 2, WALL - BD / 2]);
    wallBox([OX * 2, OB, 0.3], [0, OB / 2, WALL - 0.15]);
    wallBox([OX * 2, ROOF - OT, 0.3], [0, OT + (ROOF - OT) / 2, WALL - 0.15]);
    // Roof slab and parapet, the colour band and the base course.
    wallBox([BW + 0.2, 0.25, BD + 0.2], [0, ROOF + 0.1, WALL - BD / 2], s.material('#8d8880', { roughness: 0.95 }));
    wallBox([BW + 0.24, 0.36, 0.1], [0, ROOF - 0.5, WALL + 0.05], band);
    wallBox([BW + 0.24, 0.5, 0.06], [0, 0.25, WALL + 0.03], s.material('#9a948a', { roughness: 0.95 }));
    for (let i = 1; i < 7; i++) s.box([BW, 0.012, 0.02], [0, i * 0.45 + 0.5, WALL + 0.005], s.material('#b9b2a2'));
    if (mood.wear > 0.4) for (let i = 0; i < mood.wear * 14; i++) s.box([mix(0.3, 1.2, random()), 0.2 + random() * 0.4, 0.004], [jitter(BW * 0.9), 0.5 + random() * 0.5, WALL + 0.02], s.material('#6f6a5e', { roughness: 1 }));
    // The lit room behind the window.
    const glow = new THREE.MeshStandardMaterial({ color: '#f1e3c3', emissive: warm, emissiveIntensity: 0.45 * glowStrength, roughness: 0.9 });
    s.box([3.0, ROOF - 0.3, 0.1], [0, (ROOF - 0.3) / 2, WALL - BD + 0.1], glow);
    for (const side of [-1, 1]) s.box([0.1, ROOF - 0.3, BD], [side * 1.5, (ROOF - 0.3) / 2, WALL - BD / 2], glow);
    s.box([3.0, 0.1, BD], [0, ROOF - 0.35, WALL - BD / 2], s.material('#f3efe4'));
    s.box([1.2, 0.05, 0.14], [0, ROOF - 0.42, WALL - 1.0], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff3d0', emissiveIntensity: 1.1 * glowStrength }));
    s.box([2.6, 0.03, 0.35], [0, 1.75, WALL - 1.9], steel);
    const bags = a.hour === 'rush' ? 6 : a.hour === 'dead' ? 1 : 3;
    for (let i = 0; i < bags; i++) s.box([0.2, 0.22, 0.12], [-1.0 + i * 0.4 + jitter(0.08), 1.88, WALL - 1.9 + jitter(0.1)], s.material('#b98a5a', { roughness: 0.95 }));
    s.box([0.9, 0.9, 0.5], [-0.9, 0.45, WALL - 1.4], steel);
    s.box([0.5, 0.3, 0.3], [0.9, 1.2, WALL - 2.2], dark);
    // The sliding window: a steel frame, a sill, and the pane open or shut.
    s.box([OX * 2 + 0.16, 0.06, 0.42], [0, OB - 0.03, WALL + 0.1], steel);
    for (const side of [-1, 1]) s.box([0.06, OT - OB + 0.06, 0.08], [side * (OX + 0.04), (OB + OT) / 2, WALL + 0.06], steel);
    s.box([OX * 2 + 0.16, 0.06, 0.08], [0, OT + 0.03, WALL + 0.06], steel);
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d6e8ee', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false });
    if (a.window === 'closed') {
      s.mesh(new THREE.BoxGeometry(OX * 2, OT - OB, 0.02), glass, [0, (OB + OT) / 2, WALL + 0.07]);
      s.box([0.02, OT - OB, 0.04], [0, (OB + OT) / 2, WALL + 0.07], steel);
      const closed = s.label(pick(['CLOSED', 'USE FRONT DOOR', 'BACK IN 5', 'SORRY CLOSED']), 0.6, 0.22, [0.1, OB + 0.55, WALL + 0.09], '#2a2a2a', '#f7f1dd');
      closed.rotation.z = jitter(0.15);
    } else {
      const paneSide = random() < 0.5 ? -1 : 1;
      s.mesh(new THREE.BoxGeometry(OX - 0.02, OT - OB, 0.02), glass, [paneSide * OX / 2, (OB + OT) / 2, WALL + 0.07]);
      s.box([0.02, OT - OB, 0.04], [paneSide * 0.02, (OB + OT) / 2, WALL + 0.07], steel);
      if (a.window === 'card-only') {
        const card = s.label(pick(['CARD ONLY', 'NO CASH', 'CARD ONLY SORRY']), 0.5, 0.2, [paneSide * OX / 2, OB + 0.35, WALL + 0.09], '#1a1a1a', '#f7f1dd');
        card.rotation.z = jitter(0.2);
      }
    }
    if (a.hour === 'closing') s.label(pick(['CLOSING IN 10', 'LAST ORDERS', 'KITCHEN CLOSING']), 0.6, 0.18, [-OX - 0.5, OB + 0.6, WALL + 0.02], '#b02a2a', '#f7f1dd').rotation.z = jitter(0.2);
    // An awning over the window and the lit sign above the roof line.
    const awningArt = paint(128, 32, (ctx) => {
      ctx.fillStyle = chain.band; ctx.fillRect(0, 0, 128, 32);
      ctx.fillStyle = chain.accent; for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 16, 32);
    });
    awningArt.wrapS = awningArt.wrapT = THREE.RepeatWrapping; awningArt.repeat.set(4, 1);
    const awning = s.mesh(new THREE.BoxGeometry(2.4, 0.05, 0.8), new THREE.MeshStandardMaterial({ map: awningArt, roughness: 0.8 }), [0, OT + 0.42, WALL + 0.4]);
    awning.rotation.x = 0.35;
    s.box([2.4, 0.14, 0.05], [0, OT + 0.35, WALL + 0.08], band);
    const signText = { open24: 'OPEN 24 HRS', drive: 'DRIVE THRU', late: 'LATE NITE', pickup: 'PICK UP HERE' }[a.sign];
    const signLit = a.hour !== 'dead' || random() < 0.5;
    s.box([3.4, 0.7, 0.2], [0.2, ROOF + 0.6, WALL - 0.2], dark);
    const sign = s.label(signText, 3.2, 0.52, [0.2, ROOF + 0.6, WALL - 0.09], signLit ? '#fff6dc' : '#6a6050', signLit ? chain.band : '#3a2a2a');
    const signMaterial = sign.material as THREE.MeshStandardMaterial;
    if (signLit) { signMaterial.emissive = new THREE.Color('#ffffff'); signMaterial.emissiveMap = signMaterial.map; signMaterial.emissiveIntensity = mix(0.5, 0.9, mood.cheer); }
    for (const x of [-1.2, 1.6]) s.box([0.06, 0.4, 0.06], [x, ROOF + 0.2, WALL - 0.2], steel);
    s.label(chain.name, 2.6, 0.32, [-3.2, ROOF - 0.5, WALL + 0.11], chain.accent, chain.band);
    // The dark dining room window to the right, chairs already up on the tables inside.
    const dining = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.04), new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.1, metalness: 0.5, emissive: a.hour === 'rush' ? warm : '#000000', emissiveIntensity: 0.18 }));
    dining.position.set(-3.2, 1.95, WALL + 0.02);
    root.add(dining);
    for (const x of [-4.2, -3.2, -2.2]) s.box([0.05, 1.5, 0.06], [x, 1.95, WALL + 0.03], steel);
    // A back door with a bulkhead light by the corral.
    s.box([0.95, 2.1, 0.06], [2.3, 1.05, WALL + 0.03], s.material('#5c6168', { roughness: 0.7 }));
    s.box([0.2, 0.14, 0.14], [2.3, 2.35, WALL + 0.08], new THREE.MeshStandardMaterial({ color: '#fff4d0', emissive: '#ffe8a0', emissiveIntensity: 0.9 }));

    // ---- the kerb along the building
    const concrete = s.material(a.weather === 'snow' ? '#dfe1e3' : '#a8a49a', { roughness: 0.95 });
    s.box([BW + 1, 0.16, 0.36], [0, 0.08, KERB - 0.1], concrete);
    s.box([BW + 1, 0.04, 0.5], [0, 0.17, KERB - 0.2], concrete);
    for (let i = 0; i < 3; i++) s.box([1.2, 0.17, 0.02], [-1.3 + i * 1.3, 0.085, KERB + 0.09], s.material(chain.accent === '#f2c21b' ? '#f0d746' : '#d8262c', { roughness: 0.8 }));

    // ---- the speaker post and menu board further back down the lane
    const boardX = -4.3, boardZ = KERB - 0.12;
    for (const x of [-0.45, 0.45]) s.box([0.08, 2.4, 0.08], [boardX + x, 1.2, boardZ], steel);
    s.box([1.6, 1.5, 0.14], [boardX, 1.85, boardZ], dark);
    const boardArt = paint(256, 256, (ctx) => {
      ctx.fillStyle = a.chain === 'coffee' ? '#2c3a2e' : '#f6f1e4'; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = chain.band; ctx.fillRect(0, 0, 256, 44);
      ctx.fillStyle = chain.accent; ctx.font = '900 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(chain.name, 128, 22, 240);
      const inks = a.chain === 'coffee' ? '#f1e6c8' : '#2a2a2a';
      for (let i = 0; i < 5; i++) {
        const y = 58 + i * 38;
        ctx.fillStyle = ['#f0b23c', '#c0392b', '#6fa83c', '#d8a45c', '#2b7bd6'][i]; ctx.fillRect(12, y, 30, 28);
        ctx.fillStyle = inks; ctx.fillRect(52, y + 6, 90 + random() * 60, 7); ctx.fillRect(52, y + 18, 40 + random() * 30, 5);
        ctx.fillStyle = chain.band === '#1f5a3a' ? '#f3d36a' : chain.band; ctx.font = '900 18px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(`$${(2 + random() * 8).toFixed(2)}`, 244, y + 14);
      }
    });
    const boardLit = a.board !== 'dark' && a.hour !== 'dead';
    const boardMaterial = new THREE.MeshStandardMaterial({ map: boardArt, color: boardLit ? '#e8e8e4' : '#4a4a4a', emissive: warm, emissiveMap: boardArt, emissiveIntensity: boardLit ? 0.5 : 0, roughness: 0.4 });
    const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4), boardMaterial);
    boardFace.position.set(boardX, 1.85, boardZ + 0.071);
    root.add(boardFace);
    const speakerX = boardX + 1.5, speakerZ = KERB + 0.1;
    s.box([0.08, 1.05, 0.08], [speakerX, 0.52, speakerZ], steel);
    s.box([0.34, 0.4, 0.26], [speakerX, 1.22, speakerZ], dark);
    s.label('ORDER HERE', 0.34, 0.08, [speakerX, 1.46, speakerZ + 0.1], '#ffffff', chain.band);
    s.box([0.34, 0.05, 0.2], [speakerX, 1.44, speakerZ], dark);
    s.ball([0.02, 0.02, 0.02], [speakerX + 0.12, 1.3, speakerZ + 0.131], new THREE.MeshStandardMaterial({ color: '#ff3030', emissive: '#ff2020', emissiveIntensity: boardLit ? 1.5 : 0 }), 8);

    // ---- the dumpster corral at the far end of the wall
    const corralX = 4.2, corralZ = KERB - 0.1;
    const slat = s.material('#5a4a38', { roughness: 0.95 });
    const slats: { at: V3; rot?: V3; size?: V3 }[] = [];
    for (let i = 0; i < 18; i++) slats.push({ at: [corralX - 1.3 + i * 0.15, 0.8, corralZ - 1.3] });
    for (let i = 0; i < 9; i++) slats.push({ at: [corralX - 1.35, 0.8, corralZ - 1.25 + i * 0.15] });
    for (let i = 0; i < 9; i++) slats.push({ at: [corralX + 1.35, 0.8, corralZ - 1.25 + i * 0.15] });
    root.add(instances(new THREE.BoxGeometry(0.1, 1.6, 0.03), slat, slats));
    for (const [x, z] of [[-1.35, -1.3], [1.35, -1.3], [-1.35, 0.05], [1.35, 0.05]] as const) s.box([0.1, 1.7, 0.1], [corralX + x, 0.85, corralZ + z], steel);
    s.box([2.7, 0.08, 0.08], [corralX, 1.64, corralZ - 1.3], steel);
    const binPaint = s.material(pick(['#3f6a4e', '#2f5a86', '#5a5a5a']), { metalness: 0.3, roughness: 0.6 });
    s.box([1.8, 1.05, 1.0], [corralX, 0.62, corralZ - 0.6], binPaint);
    const lid = s.box([1.82, 0.06, 1.04], [corralX, 1.17, corralZ - 0.6], dark);
    lid.rotation.x = a.hour === 'rush' ? -0.6 : -0.12;
    const bagCount = Math.round(mix(1, 6, mood.density)) + (a.hour === 'rush' ? 3 : 0);
    for (let i = 0; i < bagCount; i++) s.ball([0.3, 0.26, 0.28], [corralX + jitter(2.2), 0.24, corralZ - 0.1 + jitter(0.5)], dark, 10);
    if (mood.density > 0.5) for (let i = 0; i < mood.density * 10; i++) {
      const litter = s.box([0.1, 0.01, 0.08], [jitter(11), 0.01, KERB + 0.3 + random() * 2.5], s.material(pick(['#f3eee2', chain.band, '#d9c9a1'])));
      litter.rotation.y = random() * 3;
    }

    // ---- the sodium streetlight and its moths
    const poleH = 5.6;
    s.cylinder(0.07, 0.11, poleH, [LAMP[0], poleH / 2, LAMP[2]], steel, 10);
    s.cylinder(0.25, 0.3, 0.12, [LAMP[0], 0.06, LAMP[2]], concrete, 12);
    const arm = s.rod([LAMP[0], poleH - 0.1, LAMP[2]], [LAMP[0] - 1.1, poleH + 0.1, LAMP[2]], 0.05, steel);
    void arm;
    s.box([0.7, 0.18, 0.32], [LAMP[0] - 1.1, poleH + 0.1, LAMP[2]], dark);
    s.box([0.5, 0.04, 0.22], [LAMP[0] - 1.1, poleH, LAMP[2]], new THREE.MeshStandardMaterial({ color: '#ffd080', emissive: sodium, emissiveIntensity: 2.2, roughness: 0.3 }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshBasicMaterial({ color: sodium, transparent: true, opacity: 0.13, depthWrite: false }));
    halo.position.set(LAMP[0] - 1.1, poleH - 0.1, LAMP[2]);
    root.add(halo);
    const mothCount = a.weather === 'snow' ? 0 : 14;
    const moths = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: '#f4ead0', emissive: '#f4ead0', emissiveIntensity: 0.6 }), Math.max(1, mothCount));
    moths.count = mothCount;
    const mothPhase = Array.from({ length: mothCount }, () => ({ a: random() * Math.PI * 2, r: 0.3 + random() * 0.7, h: jitter(0.6), speed: 0.6 + random() * 1.2 }));
    root.add(moths);
    const mothMatrix = new THREE.Matrix4();
    const placeMoths = (time: number) => {
      mothPhase.forEach((m, i) => {
        const t = time * m.speed * mix(0.6, 1.6, mood.energy) + m.a;
        mothMatrix.makeRotationY(t).setPosition(LAMP[0] - 1.1 + Math.cos(t) * m.r, poleH - 0.1 + m.h + Math.sin(t * 2.3) * 0.15, LAMP[2] + Math.sin(t * 1.3) * m.r);
        moths.setMatrixAt(i, mothMatrix);
      });
      moths.instanceMatrix.needsUpdate = true;
    };
    placeMoths(0);

    // ---- what is in the lot
    if (a.lot === 'one-car') {
      const carPaint = s.material(pick(['#4a4f58', '#6a2a2a', '#3a4a6a', '#8a8a86']), { metalness: 0.3, roughness: 0.5 });
      const cx = LAMP[0] + 2.0, cz = LAMP[2] + 0.6;
      const car = new THREE.Group();
      car.position.set(cx, 0, cz);
      car.rotation.y = Math.PI / 2 + jitter(0.2);
      root.add(car);
      for (const [size, at] of [[[1.7, 0.6, 4.2], [0, 0.6, 0]], [[1.5, 0.55, 2.2], [0, 1.15, -0.2]]] as [V3, V3][]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(...size), carPaint);
        m.position.set(...at);
        m.castShadow = m.receiveShadow = true;
        car.add(m);
      }
      const glassBox = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.4, 2.1), new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.2, metalness: 0.4 }));
      glassBox.position.set(0, 1.2, -0.2);
      car.add(glassBox);
      for (const x of [-0.8, 0.8]) for (const z of [-1.3, 1.3]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 14), dark);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.33, z);
        wheel.castShadow = true;
        car.add(wheel);
      }
    } else if (a.lot === 'cones') {
      const cone = new THREE.ConeGeometry(0.2, 0.7, 10);
      const cones = Array.from({ length: 4 + Math.round(random() * 2) }, (_, i) => ({ at: [2.4 + i * 0.9 + jitter(0.2), 0.35, 2.2 + jitter(0.4)] as V3 }));
      root.add(instances(cone, s.material('#f26a1c', { roughness: 0.6 }), cones));
      root.add(instances(new THREE.BoxGeometry(0.5, 0.04, 0.5), dark, cones.map((c) => ({ at: [c.at[0], 0.02, c.at[2]] as V3 }))));
      root.add(instances(new THREE.CylinderGeometry(0.11, 0.14, 0.1, 10), s.material('#f4f4f0'), cones.map((c) => ({ at: [c.at[0], 0.4, c.at[2]] as V3 }))));
    } else if (a.lot === 'trolley') {
      const tx = 2.6 + jitter(1), tz = 1.6 + jitter(0.4);
      const trolley = new THREE.Group();
      trolley.position.set(tx, 0, tz);
      trolley.rotation.y = random() * Math.PI;
      root.add(trolley);
      const wire = new THREE.MeshStandardMaterial({ color: '#c9ced0', metalness: 0.7, roughness: 0.35 });
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: '#c9ced0', metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.45, depthWrite: false }));
      basket.position.set(0, 0.75, 0);
      trolley.add(basket);
      for (const [x, z] of [[-0.3, -0.45], [0.3, -0.45], [-0.3, 0.45], [0.3, 0.45]] as const) {
        const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6), wire);
        legMesh.position.set(x, 0.5, z);
        trolley.add(legMesh);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8).rotateZ(Math.PI / 2), dark);
        wheel.position.set(x, 0.06, z);
        trolley.add(wheel);
      }
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.64, 8).rotateZ(Math.PI / 2), s.material('#c0392b'));
      handle.position.set(0, 1.0, -0.5);
      trolley.add(handle);
      for (const m of trolley.children) m.castShadow = true;
    }
    if (wet) {
      const puddle = new THREE.MeshStandardMaterial({ color: '#2a3140', roughness: 0.03, metalness: 0.6, transparent: true, opacity: 0.75, depthWrite: false });
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(new THREE.CircleGeometry(mix(0.5, 1.4, random()), 20), puddle);
        p.rotation.x = -Math.PI / 2;
        p.position.set(jitter(11), 0.004, 1.3 + random() * 2.8);
        p.scale.set(mix(0.8, 1.8, random()), 1, 1);
        root.add(p);
      }
    }
    let weatherMesh: THREE.InstancedMesh | null = null;
    let drops: { x: number; y: number; z: number; v: number }[] = [];
    if (a.weather !== 'clear') {
      const rain = a.weather === 'rain';
      drops = Array.from({ length: rain ? 160 : 120 }, () => ({ x: jitter(14), y: random() * 6, z: jitter(9), v: rain ? 6 + random() * 3 : 0.5 + random() * 0.4 }));
      weatherMesh = new THREE.InstancedMesh(rain ? new THREE.BoxGeometry(0.012, 0.35, 0.012) : new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshStandardMaterial({ color: rain ? '#c9d6e4' : '#ffffff', transparent: true, opacity: rain ? 0.35 : 0.85, depthWrite: false, emissive: '#dfe6f0', emissiveIntensity: 0.3 }), drops.length);
      root.add(weatherMesh);
    }
    const dropMatrix = new THREE.Matrix4();
    const placeDrops = () => {
      if (!weatherMesh) return;
      drops.forEach((d, i) => { dropMatrix.makeTranslation(d.x, d.y, d.z); weatherMesh!.setMatrixAt(i, dropMatrix); });
      weatherMesh.instanceMatrix.needsUpdate = true;
    };
    placeDrops();
    if (a.weather === 'snow') {
      s.box([BW + 0.3, 0.08, BD + 0.3], [0, ROOF + 0.26, WALL - BD / 2], s.material('#f1f3f6', { roughness: 1 }));
      s.box([0.7, 0.05, 0.36], [LAMP[0] - 1.1, poleH + 0.22, LAMP[2]], s.material('#f1f3f6', { roughness: 1 }));
    }

    // ---- the night beyond the building: a tree line and a far sign
    const trees = Array.from({ length: 11 }, (_, i) => ({ at: [-6.5 + i * 1.3 + jitter(0.5), 1.6 + random() * 1.2, WALL - BD - 0.9 - random() * 0.6] as V3, size: [mix(1.1, 1.9, random()), mix(1.4, 2.6, random()), 1.1] as V3 }));
    root.add(instances(new THREE.SphereGeometry(1, 10, 7), new THREE.MeshStandardMaterial({ color: predawn ? '#4a5262' : '#2e3442', roughness: 1 }), trees));

    const energy = mood.energy;
    const flicker = a.board === 'flicker' && boardLit;
    world.update = (dt, time) => {
      placeMoths(time);
      if (weatherMesh) {
        for (const d of drops) { d.y -= d.v * dt; if (a.weather === 'snow') d.x += Math.sin(time + d.z) * dt * 0.3; if (d.y < 0) { d.y = 6; d.x = jitter(14); d.z = jitter(9); } }
        placeDrops();
      }
      if (flicker) {
        const n = Math.sin(time * 17) * Math.sin(time * 4.3 + 1) + Math.sin(time * 37);
        boardMaterial.emissiveIntensity = n > 0.25 - energy * 0.5 ? 0.5 : 0.05;
      }
    };
    return world;
  },
});
