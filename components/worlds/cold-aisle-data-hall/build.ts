import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
interface Item { at: P3; size?: P3; rot?: P3; colour?: THREE.ColorRepresentation }
function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly Item[], shadow = false) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  mesh.count = items.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  items.forEach((item, i) => {
    e.set(...(item.rot ?? [0, 0, 0]));
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...(item.size ?? [1, 1, 1])));
    mesh.setMatrixAt(i, m);
    if (item.colour !== undefined) mesh.setColorAt(i, new THREE.Color(item.colour));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

interface Hall { cabinet: string; door: string; dots: string; trim: string; floorA: string; floorB: string; wall: string; ceiling: string; panel: string; word: string }
const HALLS: Record<'hyperscale' | 'colo' | 'legacy' | 'crypto', Hall> = {
  hyperscale: { cabinet: '#e6e8ea', door: '#454a52', dots: '#15171a', trim: '#2a7fd8', floorA: '#b8bcc2', floorB: '#a9adb3', wall: '#d2d6dc', ceiling: '#5a6068', panel: '#dfeeff', word: 'COLD AISLE 07' },
  colo: { cabinet: '#1f2124', door: '#2a2c30', dots: '#08090b', trim: '#f2a21c', floorA: '#8c9096', floorB: '#7e8288', wall: '#8a8f98', ceiling: '#2a2d33', panel: '#eaf2ff', word: 'CAGE 12  ROW C' },
  legacy: { cabinet: '#c9c0a8', door: '#a89e86', dots: '#4a4538', trim: '#5a7a9a', floorA: '#c4bfae', floorB: '#b4ae9c', wall: '#cfc9b6', ceiling: '#6a665a', panel: '#fff3d8', word: 'ROW 4' },
  crypto: { cabinet: '#8a8e92', door: '#6a6e72', dots: '#1c1c1e', trim: '#e86a1c', floorA: '#9a9a96', floorB: '#8e8e8a', wall: '#a8a49a', ceiling: '#4a4640', panel: '#f0ecdc', word: 'FARM 3' },
};
const VIEWS = {
  eye: { at: [0.15, 1.55, 7.2], to: [0, 1.15, -3], fov: 42 },
  low: { at: [0.3, 0.5, 6.6], to: [-0.05, 1.0, -3], fov: 46 },
  high: { at: [-0.3, 2.3, 7.0], to: [0.1, 0.7, -2], fov: 46 },
  side: { at: [-0.72, 1.5, 6.5], to: [0.3, 1.1, -3], fov: 44 },
} as const;
const HALF = 1.0, CAB = 0.6, CAB_H = 2.2, CAB_D = 1.2, CEIL = 3.2, FRONT = 7.8;
const SLOTS = [
  { x: 0, z: 0.4, r: 0.75, h: 2.1, turn: 0.15, lift: 0 },
  { x: -0.58, z: -1.7, r: 0.4, h: 1.9, turn: 0.55, lift: 0 },
  { x: 0.6, z: 1.8, r: 0.4, h: 1.9, turn: -0.55, lift: 0 },
  { x: -0.3, z: -3.9, r: 0.28, h: 1.3, turn: 0.2, lift: 0.035 },
] as const;

export default defineWorld({
  questions: {
    hall: choice('What kind of data hall is it?', {
      hyperscale: 'A modern hyperscale hall: white cabinets, blue-white light, immaculate and anonymous.',
      colo: 'A colocation cage: black cabinets with mesh doors, orange trim, tenant labels.',
      legacy: 'A 2000s enterprise computer room: beige cabinets, yellowed tiles, warm tubes.',
      crypto: 'A crypto mining shed: open steel shelves of grey miner boxes with big fans, plywood and orange trim.',
    }),
    hour: choice('What hour and state is the hall in?', {
      day: 'Mid-shift: every panel on, flat bright blue-white.',
      night: 'Night shift: half the panels dimmed, the cabinet LEDs doing most of the lighting.',
      outage: 'An outage: emergency lighting only, most LEDs dark, a red beacon turning.',
      maintenance: 'A maintenance window: a tray open, a cart in the aisle, tools about.',
    }),
    end: choice('What is at the far end of the aisle?', {
      door: 'A glass containment door with a green EXIT sign above it.',
      doors: 'Double glass doors with a card reader glowing red.',
      cylinders: 'A blank wall with a bank of red gas-suppression cylinders.',
      endless: 'Nothing: the aisle goes on into blue haze.',
    }),
    overhead: choice('What runs overhead?', {
      trays: 'Wire-mesh cable trays and a yellow fibre duct.',
      ladders: 'Black cable ladders heavy with bundles.',
      ducts: 'Big silver cooling ducts and a single tray.',
      everything: 'Trays, ladders, ducts, a busbar and conduits: barely any ceiling left.',
    }),
    signs: choice('What signage is there?', {
      markers: 'Aisle markers hanging from the ceiling.',
      warnings: 'Warning signs on the cabinet ends: NO FOOD OR DRINK, AUTHORISED ONLY.',
      tenants: 'Little tenant badges on every cabinet door.',
      none: 'No signs at all.',
    }),
    dressing: choice('What has been left in the aisle?', {
      nothing: 'Nothing: a clean cold aisle.',
      cart: 'A crash cart with a console monitor and keyboard.',
      ladder: 'A step ladder under an open tray.',
      pallet: 'A pallet of new servers still in shrink wrap.',
      wet: 'A yellow wet-floor sign and a mop bucket.',
    }),
    view: choice('Where are we standing?', {
      eye: 'At eye level in the mouth of the aisle, looking straight down it.',
      low: 'Low near the floor grilles, the cabinets towering.',
      high: 'High up by the cable trays, looking down the aisle.',
      side: 'Slightly to one side, the near cabinet faces close.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const hall = HALLS[a.hall];
    const root = new THREE.Group();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...options });
    const add = <T extends THREE.Object3D>(node: T) => { root.add(node); return node; };
    const box = (size: P3, at: P3, material: THREE.Material, shadow = false) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...at); mesh.castShadow = shadow; mesh.receiveShadow = true; return add(mesh); };
    const plane = (w: number, h: number, at: P3, material: THREE.Material, rot: P3 = [0, 0, 0]) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); mesh.position.set(...at); mesh.rotation.set(...rot); mesh.receiveShadow = true; return add(mesh); };
    const label = (text: string, width: number, height: number, at: P3, ink: string, paper: string, rot: P3 = [0, 0, 0]) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = Math.max(64, Math.round(512 * height / width));
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.min(canvas.height * 0.6, 512 / Math.max(text.length, 1) * 1.5)}px sans-serif`;
      ctx.fillText(text, 256, canvas.height / 2, 480);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return plane(width, height, at, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide }), rot);
    };

    const outage = a.hour === 'outage', night = a.hour === 'night', maintenance = a.hour === 'maintenance';
    const endless = a.end === 'endless';
    const END = endless ? -30 : -15, LEN = FRONT - END, MID = (FRONT + END) / 2;
    const level = outage ? 0.3 : night ? 0.55 : 1;
    const tint = new THREE.Color(hall.panel).lerp(new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.6, 0.85), 0.35);
    if (outage) tint.lerp(new THREE.Color('#ff8a60'), 0.35);
    const background = new THREE.Color(hall.wall).lerp(new THREE.Color('#7f8ca0'), 0.4).multiplyScalar(mix(0.55, 1, level));

    // Raised floor: tiles in a 600 mm grid, perforated down the aisle.
    const tiles = paint(384, 384, (ctx) => {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x = c * 128, y = r * 128;
        ctx.fillStyle = (r + c) % 2 ? hall.floorA : hall.floorB;
        ctx.fillRect(x, y, 128, 128);
        for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '20,20,24' : '255,255,255'},${0.04 + random() * 0.08})`; ctx.fillRect(x + random() * 128, y + random() * 128, 1 + random() * 2, 1 + random() * 2); }
        if ((r * 3 + c) % 3 !== 1) {
          ctx.fillStyle = hall.dots;
          for (let py = 10; py < 124; py += 8) for (let px = 10; px < 124; px += 8) { ctx.beginPath(); ctx.arc(x + px, y + py, 2, 0, 7); ctx.fill(); }
        }
        for (let i = 0; i < mood.wear * 6; i++) { ctx.fillStyle = `rgba(40,36,30,${0.1 + random() * 0.2})`; ctx.beginPath(); ctx.ellipse(x + random() * 128, y + random() * 128, 6 + random() * 20, 3 + random() * 10, random() * 3, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(30,30,34,0.7)';
        ctx.fillRect(x, y, 128, 2); ctx.fillRect(x, y, 2, 128);
      }
    });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
    tiles.repeat.set(4.4 / 1.8, LEN / 1.8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.6, LEN).rotateX(-Math.PI / 2), std('#ffffff', { map: tiles, roughness: 0.6, metalness: 0.05 }));
    floor.position.set(0, 0, MID);
    floor.receiveShadow = true;
    add(floor);
    // Cold air: a faint pale haze lying over the grilles.
    const haze = plane(2 * HALF, LEN, [0, 0.01, MID], new THREE.MeshBasicMaterial({ color: '#cfe4ff', transparent: true, opacity: outage ? 0.04 : 0.1, depthWrite: false }), [-Math.PI / 2, 0, 0]);
    haze.renderOrder = 1;

    // Ceiling and its panels.
    plane(4.6, LEN, [0, CEIL, MID], std(hall.ceiling, { roughness: 0.95 }), [Math.PI / 2, 0, 0]);
    const panelMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: tint, emissiveIntensity: outage ? 0.05 : 1.2, roughness: 0.4 });
    const panelItems: Item[] = [];
    const stutter: number[] = [];
    for (let z = FRONT - 1; z > END + 1; z -= 2.4) {
      panelItems.push({ at: [0, CEIL - 0.03, z], size: [0.32, 0.05, 1.2] });
      if (night && random() < 0.5) stutter.push(panelItems.length - 1);
    }
    const panels = instances(new THREE.BoxGeometry(1, 1, 1), panelMat, panelItems);
    add(panels);
    const dimmed = new THREE.Color('#ffffff'), dim = new THREE.Color('#404850');
    panelItems.forEach((_p, i) => panels.setColorAt(i, night && i % 2 ? dim : dimmed));
    if (panels.instanceColor) panels.instanceColor.needsUpdate = true;
    if (outage) {
      const emergency = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff2c0', emissiveIntensity: 2.5 });
      for (let z = FRONT - 3; z > END + 1; z -= 6) box([0.3, 0.08, 0.12], [HALF - 0.1, CEIL - 0.06, z], emergency);
    }

    // The cabinets, or the mining shelves.
    const cabinets: Item[] = [], doors: Item[] = [], handles: Item[] = [], leds: Item[] = [], badges: Item[] = [], units: Item[] = [], open: Item[] = [];
    const ledColours: { base: THREE.Color; busy: boolean }[] = [];
    const green = new THREE.Color('#2cff5c'), amber = new THREE.Color('#ffb020'), red = new THREE.Color('#ff3020'), blue = new THREE.Color('#3a8cff'), off = new THREE.Color('#141618');
    const count = Math.ceil((FRONT + 1 - END) / CAB);
    const doorArt = paint(128, 512, (ctx) => {
      ctx.fillStyle = hall.door; ctx.fillRect(0, 0, 128, 512);
      ctx.fillStyle = hall.dots;
      if (a.hall !== 'legacy') for (let y = 14; y < 500; y += 6) for (let x = 10 + (Math.floor(y / 6) % 2) * 3; x < 120; x += 6) { ctx.beginPath(); ctx.arc(x, y, 1.7, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = '#2a3038'; ctx.fillRect(28, 40, 72, 300); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(34, 46, 20, 288); }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, 128, 4); ctx.fillRect(0, 508, 128, 4); ctx.fillRect(0, 0, 4, 512); ctx.fillRect(124, 0, 4, 512);
    });
    const doorMat = new THREE.MeshStandardMaterial({ map: doorArt, roughness: 0.55, metalness: 0.3 });
    const ledPitch = 0.14;
    for (const side of [-1, 1]) {
      const cx = side * (HALF + CAB_D / 2), face = side * HALF;
      for (let i = 0; i < count; i++) {
        const z = FRONT + 1 - CAB / 2 - i * CAB;
        if (z < END + CAB / 2) break;
        const near = z > -9;
        if (a.hall === 'crypto') {
          // Open shelving: posts, six shelves, two miners per shelf with a fan on the aisle face.
          for (const dz of [-0.28, 0.28]) for (const dx of [0.03, 0.68]) cabinets.push({ at: [side * (HALF + dx), CAB_H / 2, z + dz], size: [0.04, CAB_H, 0.04], colour: '#5a5e64' });
          for (let k = 0; k < 6; k++) {
            const y = 0.2 + k * 0.38;
            cabinets.push({ at: [side * (HALF + 0.355), y, z], size: [0.7, 0.03, 0.6], colour: hall.cabinet });
            if (random() < mix(0.6, 1, mood.density)) for (const dz of [-0.15, 0.15]) {
              units.push({ at: [side * (HALF + 0.3), y + 0.1, z + dz], size: [0.5, 0.17, 0.26], colour: pick(['#9a9ea2', '#8a8e92', '#b0b4b8']) });
              if (near) {
                doors.push({ at: [side * (HALF + 0.048), y + 0.1, z + dz], size: [0.17, 0.17, 1], rot: [0, -side * Math.PI / 2, 0] });
                leds.push({ at: [side * (HALF + 0.046), y + 0.17, z + dz + 0.1], size: [0.006, 0.006, 0.01] });
                ledColours.push({ base: mood.cheer > 0.4 ? green : amber, busy: random() < 0.5 });
              }
            }
          }
          continue;
        }
        cabinets.push({ at: [cx, CAB_H / 2, z], size: [CAB_D, CAB_H, CAB - 0.01], colour: hall.cabinet });
        const doorless = near && random() < mood.wear * 0.18;
        if (doorless) {
          open.push({ at: [face - side * 0.004, CAB_H / 2, z], size: [0.008, CAB_H - 0.1, CAB - 0.06], colour: '#0e0f12' });
          for (let k = 0; k < 9; k++) if (random() < 0.8) units.push({ at: [face - side * 0.02, 0.25 + k * 0.21, z], size: [0.03, 0.16, CAB - 0.1], colour: pick(['#2a2c30', '#3a3d42', '#c9ccd0']) });
        } else {
          doors.push({ at: [face - side * 0.003, CAB_H / 2, z], size: [CAB - 0.07, CAB_H - 0.12, 1], rot: [0, -side * Math.PI / 2, 0] });
          handles.push({ at: [face - side * 0.015, CAB_H * 0.5, z + 0.2], size: [0.012, 0.3, 0.02] });
        }
        if (a.signs === 'tenants') badges.push({ at: [face - side * 0.008, CAB_H - 0.15, z], size: [0.004, 0.08, 0.14], rot: [0, 0, 0], colour: pick(['#f2f2ea', '#f2a21c', '#2a7fd8', '#e8302a']) });
        if (near) {
          const rows = Math.round(mix(8, 13, mood.density));
          for (let k = 0; k < rows; k++) for (const dz of [-0.2, 0.17]) {
            const dead = outage ? random() < 0.85 : random() < mood.wear * 0.25;
            const base = dead ? off : random() < (mood.cheer > 0.5 ? 0.04 : 0.16) ? (random() < 0.6 ? amber : red) : random() < 0.08 ? blue : green;
            leds.push({ at: [doorless ? face - side * 0.04 : face - side * 0.012, 0.28 + k * ledPitch, z + dz + (random() - 0.5) * 0.006], size: [0.01, 0.008, 0.022] });
            ledColours.push({ base, busy: !dead && random() < mix(0.15, 0.7, mood.energy) });
          }
        }
      }
    }
    add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.55, metalness: 0.25 }), cabinets, true));
    if (a.hall === 'crypto') {
      const fan = paint(128, 128, (ctx) => {
        ctx.fillStyle = '#3a3c40'; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#121214'; ctx.beginPath(); ctx.arc(64, 64, 54, 0, 7); ctx.fill();
        ctx.fillStyle = '#5a5e64'; for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(64, 64); ctx.rotate(i * Math.PI * 2 / 7); ctx.beginPath(); ctx.ellipse(28, 0, 22, 9, 0.5, 0, 7); ctx.fill(); ctx.restore(); }
        ctx.strokeStyle = '#8a8e92'; ctx.lineWidth = 3; for (let r = 18; r < 56; r += 12) { ctx.beginPath(); ctx.arc(64, 64, r, 0, 7); ctx.stroke(); }
      });
      add(instances(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: fan, roughness: 0.6 }), doors));
    } else add(instances(new THREE.PlaneGeometry(1, 1), doorMat, doors));
    add(instances(new THREE.BoxGeometry(1, 1, 1), std('#1a1b1e', { metalness: 0.6, roughness: 0.4 }), handles));
    if (open.length) add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff'), open));
    if (units.length) add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.5, metalness: 0.3 }), units, a.hall === 'crypto'));
    if (badges.length) add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff'), badges));
    const ledMesh = instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), leds.map((led, i) => ({ ...led, colour: ledColours[i].base })));
    add(ledMesh);
    // Trim band along the cabinet tops and the cage line.
    for (const side of [-1, 1]) {
      box([0.06, 0.06, LEN], [side * HALF, CAB_H + 0.03, MID], std(hall.trim, { roughness: 0.5 }));
      if (a.hall === 'crypto') box([0.02, 0.6, LEN], [side * (HALF + 1.2), CAB_H + 0.3, MID], std('#b08a5a', { roughness: 0.9 }));
    }

    // Overhead: trays, ladders, ducts, rods, the fibre duct, the busbar.
    const galv = std('#b4b9bd', { metalness: 0.7, roughness: 0.45 });
    const blackSteel = std('#1e1f22', { metalness: 0.5, roughness: 0.5 });
    const rods: Item[] = [], rungs: Item[] = [];
    const tray = (x: number, y: number, width: number) => {
      const meshArt = paint(64, 64, (ctx) => { ctx.clearRect(0, 0, 64, 64); ctx.strokeStyle = '#c8ccd0'; ctx.lineWidth = 3; for (let k = 0; k <= 64; k += 16) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 64); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(64, k); ctx.stroke(); } });
      meshArt.wrapS = meshArt.wrapT = THREE.RepeatWrapping; meshArt.repeat.set(width / 0.1, LEN / 0.1);
      plane(width, LEN, [x, y, MID], new THREE.MeshStandardMaterial({ map: meshArt, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }), [-Math.PI / 2, 0, 0]);
      for (const sx of [-1, 1]) box([0.012, 0.1, LEN], [x + sx * width / 2, y + 0.05, MID], galv);
      for (let z = FRONT; z > END; z -= 1.5) for (const sx of [-1, 1]) rods.push({ at: [x + sx * (width / 2 + 0.03), (CEIL + y) / 2, z], size: [0.012, CEIL - y, 0.012] });
      // Bundles lying in the tray.
      const bundles: Item[] = [];
      for (let k = 0; k < Math.round(mix(2, 5, mood.density)); k++) bundles.push({ at: [x + (random() - 0.5) * (width - 0.08), y + 0.03, MID], size: [0.04, 0.04, LEN], colour: pick(['#2a6fd6', '#f08a1c', '#2a6fd6', '#e8e8e8', '#30b84a']) });
      add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.6 }), bundles));
    };
    const ladder = (x: number, y: number) => {
      for (const sx of [-1, 1]) box([0.03, 0.08, LEN], [x + sx * 0.2, y, MID], blackSteel);
      for (let z = FRONT; z > END; z -= 0.3) rungs.push({ at: [x, y, z], size: [0.4, 0.03, 0.03] });
      for (let z = FRONT; z > END; z -= 2) rods.push({ at: [x, (CEIL + y) / 2, z], size: [0.014, CEIL - y, 0.014] });
      const bundles: Item[] = [];
      for (let k = 0; k < Math.round(mix(3, 7, mood.density)); k++) bundles.push({ at: [x + (random() - 0.5) * 0.34, y + 0.06 + (k % 2) * 0.05, MID], size: [0.05, 0.05, LEN], colour: pick(['#1c1c1e', '#2a6fd6', '#f08a1c', '#6a6a6e', '#e8e8e8']) });
      add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.6 }), bundles));
    };
    const straps: Item[] = [];
    const duct = (x: number, y: number, r: number) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, LEN, 20).rotateX(Math.PI / 2), std('#c9ced2', { metalness: 0.6, roughness: 0.35 }));
      mesh.position.set(x, y, MID); mesh.castShadow = true; add(mesh);
      for (let z = FRONT; z > END; z -= 2.4) { straps.push({ at: [x, y, z], size: [r + 0.012, r + 0.012, 1] }); rods.push({ at: [x, (CEIL + y + r) / 2, z], size: [0.016, CEIL - y - r, 0.016] }); }
    };
    if (a.overhead === 'trays' || a.overhead === 'everything') { tray(-0.55, 2.78, 0.3); tray(0.6, 2.8, 0.3); box([0.1, 0.1, LEN], [0, 2.9, MID], std('#f2d21c', { roughness: 0.5 })); }
    if (a.overhead === 'ladders' || a.overhead === 'everything') { ladder(a.overhead === 'everything' ? 0.05 : 0, 2.6); ladder(-1.4, 2.7); ladder(1.4, 2.7); }
    if (a.overhead === 'ducts' || a.overhead === 'everything') { duct(-1.5, 2.85, 0.3); duct(1.5, 2.85, 0.3); if (a.overhead === 'ducts') tray(0, 2.85, 0.3); }
    if (a.overhead === 'everything') {
      box([0.14, 0.18, LEN], [0.95, 2.95, MID], std('#e86a1c', { roughness: 0.5 }));
      for (const x of [-0.9, -0.75, 0.3]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, LEN, 8).rotateX(Math.PI / 2), galv); c.position.set(x, CEIL - 0.08, MID); add(c); }
    }
    add(instances(new THREE.BoxGeometry(1, 1, 1), galv, rods));
    if (straps.length) add(instances(new THREE.TorusGeometry(1, 0.012, 6, 24), blackSteel, straps));
    if (rungs.length) add(instances(new THREE.BoxGeometry(1, 1, 1), blackSteel, rungs));
    // Fire suppression: a red pipe down the aisle with a nozzle every few metres, and a beacon.
    const redPaint = std('#c8202a', { roughness: 0.45, metalness: 0.3 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, LEN, 10).rotateX(Math.PI / 2), redPaint);
    pipe.position.set(-0.25, CEIL - 0.2, MID); add(pipe);
    const nozzles: Item[] = [];
    for (let z = FRONT - 2; z > END; z -= 4) { nozzles.push({ at: [-0.25, CEIL - 0.3, z], size: [0.06, 0.1, 0.06] }); nozzles.push({ at: [-0.25, CEIL - 0.37, z], size: [0.12, 0.02, 0.12] }); }
    add(instances(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), std('#b0b4b8', { metalness: 0.8, roughness: 0.3 }), nozzles));
    label('FM-200', 0.3, 0.1, [-0.25, CEIL - 0.42, FRONT - 6.08], '#ffffff', '#c8202a');
    const beaconMat = new THREE.MeshStandardMaterial({ color: '#ff3020', emissive: '#ff2010', emissiveIntensity: outage ? 2 : 0.1, roughness: 0.3 });
    box([0.12, 0.16, 0.12], [HALF - 0.07, CAB_H + 0.15, 1.8], std('#2a2c30'));
    const beacon = box([0.09, 0.1, 0.09], [HALF - 0.07, CAB_H + 0.28, 1.8], beaconMat);
    void beacon;

    // The far end.
    const alu = std('#c9ced2', { metalness: 0.7, roughness: 0.3 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dfeeff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
    if (!endless) {
      box([4.6, CEIL, 0.2], [0, CEIL / 2, END - 0.1], std(hall.wall, { roughness: 0.9 }));
      if (a.end === 'door' || a.end === 'doors') {
        const w = a.end === 'door' ? 1.0 : 2.0;
        box([w + 0.1, 0.08, 0.1], [0, 2.44, END + 0.05], alu);
        for (const sx of [-1, 1]) box([0.06, 2.4, 0.1], [sx * (w / 2 + 0.03), 1.2, END + 0.05], alu);
        const pane = box([w, 2.36, 0.02], [0, 1.2, END + 0.05], glass);
        pane.castShadow = false;
        if (a.end === 'doors') { box([0.03, 2.36, 0.08], [0, 1.2, END + 0.05], alu); for (const sx of [-1, 1]) box([0.4, 0.04, 0.05], [sx * 0.3, 1.05, END + 0.1], alu); }
        else box([0.5, 0.04, 0.05], [0.1, 1.05, END + 0.1], alu);
        if (a.end === 'door') label('EXIT', 0.5, 0.2, [0, 2.7, END + 0.12], '#ffffff', '#1fa84a');
        if (a.end === 'doors') box([0.1, 0.16, 0.04], [w / 2 + 0.25, 1.2, END + 0.12], new THREE.MeshStandardMaterial({ color: '#2a2c30', emissive: '#ff2020', emissiveIntensity: 1.5 }));
        if (a.end === 'door') box([0.5, 0.2, 0.04], [0, 2.7, END + 0.1], new THREE.MeshStandardMaterial({ color: '#1fa84a', emissive: '#30ff70', emissiveIntensity: 0.9 }));
        // The hall beyond the glass: a bright wash so the door reads as glass.
        plane(w, 2.3, [0, 1.2, END - 0.01], new THREE.MeshBasicMaterial({ color: new THREE.Color(hall.panel).multiplyScalar(0.9) }));
      } else {
        const tanks: Item[] = [];
        for (let i = 0; i < 8; i++) tanks.push({ at: [-1.4 + i * 0.4, 0.9, END + 0.3], size: [0.3, 1.8, 0.3] });
        add(instances(new THREE.CylinderGeometry(1, 1, 1, 16), redPaint, tanks, true));
        box([3.4, 0.08, 0.1], [0, 1.4, END + 0.42], alu);
        label('FM-200  DO NOT ENTER WHEN ALARM SOUNDS', 2.4, 0.26, [0, 2.5, END + 0.12], '#ffffff', '#c8202a');
      }
    } else {
      // The aisle fades: a sheet of the background colour half way down and a darker one at the end.
      plane(4.6, CEIL, [0, CEIL / 2, END + 0.3], new THREE.MeshBasicMaterial({ color: background }));
      plane(2.2, CEIL - 0.2, [0, CEIL / 2, -20], new THREE.MeshBasicMaterial({ color: background, transparent: true, opacity: 0.6, depthWrite: false }));
    }

    // Signs.
    if (a.signs === 'markers') for (const z of [1.6, -5.6]) {
      label(hall.word, 1.1, 0.3, [0, 2.55, z], '#ffffff', a.hall === 'hyperscale' ? '#2a7fd8' : '#1c1c1e');
      for (const x of [-0.45, 0.45]) box([0.01, CEIL - 2.7, 0.01], [x, 2.7 + (CEIL - 2.7) / 2, z], blackSteel);
    }
    if (a.signs === 'warnings') {
      label('NO FOOD OR DRINK', 0.5, 0.18, [-HALF + 0.01, 1.7, 4.2], '#1c1c1e', '#f2d21c', [0, Math.PI / 2, 0]);
      label('AUTHORISED PERSONNEL ONLY', 0.52, 0.18, [HALF - 0.01, 1.75, 3.4], '#ffffff', '#c8202a', [0, -Math.PI / 2, 0]);
      label('COLD AISLE - KEEP DOORS SHUT', 0.5, 0.14, [-HALF + 0.01, 1.4, -0.8], '#1c1c1e', '#f2f2ea', [0, Math.PI / 2, 0]);
    }

    // The lifted tile with a slot on it, and the hole it came out of.
    const hole = SLOTS[3];
    const holeAt: P3 = [hole.x + 0.62, 0, hole.z];
    box([0.6, 0.3, 0.6], [holeAt[0], -0.16, holeAt[2]], std('#0a0b0d'));
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6).rotateZ(Math.PI / 2), std(pick(['#2a6fd6', '#f08a1c', '#1c1c1e']))); c.position.set(holeAt[0], -0.1 - k * 0.03, holeAt[2] - 0.2 + k * 0.12); add(c); }
    const liftedTile = box([0.6, 0.035, 0.6], [hole.x, 0.0175, hole.z], std(hall.floorA, { roughness: 0.6 }), true);
    liftedTile.rotation.y = 0.08;
    box([0.08, 0.02, 0.08], [hole.x + 0.4, 0.045, hole.z - 0.42], std('#e8302a'));
    box([0.1, 0.02, 0.02], [hole.x + 0.4, 0.07, hole.z - 0.42], std('#1c1c1e'));
    if (maintenance) {
      for (const [x, z] of [[-0.3, 3.0], [0.3, -6.2]]) { box([0.6, 0.3, 0.6], [x, -0.16, z], std('#0a0b0d')); const t = box([0.6, 0.035, 0.6], [x + 0.45, 0.25, z], std(hall.floorA, { roughness: 0.6 }), true); t.rotation.z = -1.2; }
      box([0.5, 0.12, 0.3], [-0.6, 0.06, -6.8], std('#e8302a'));
    }

    // Dressing in the aisle, placed clear of the slots.
    if (a.dressing === 'cart' || (maintenance && a.dressing === 'nothing')) {
      box([0.5, 0.9, 0.5], [-0.55, 0.45, -6.0], std('#3a3d42', { metalness: 0.4 }), true);
      box([0.45, 0.3, 0.05], [-0.55, 1.1, -6.2], std('#1c1c1e'));
      box([0.42, 0.27, 0.01], [-0.55, 1.1, -6.17], new THREE.MeshStandardMaterial({ color: '#dfeeff', emissive: '#9ac8ff', emissiveIntensity: 1 }));
      box([0.42, 0.02, 0.15], [-0.55, 0.92, -5.85], std('#2a2b30'));
      for (const dx of [-0.2, 0.2]) for (const dz of [-0.2, 0.2]) box([0.06, 0.06, 0.06], [-0.55 + dx, 0.03, -6.0 + dz], std('#1c1c1e'));
    }
    if (a.dressing === 'ladder') {
      const ladderMat = std('#e8d02a', { roughness: 0.5 });
      for (const sx of [-1, 1]) { const rail = box([0.04, 2.0, 0.04], [-0.5 + sx * 0.22, 0.95, -5.8], ladderMat, true); rail.rotation.x = -0.25; }
      for (let k = 0; k < 7; k++) { const rung = box([0.44, 0.03, 0.08], [-0.5, 0.2 + k * 0.28, -5.8 + (0.95 - (0.2 + k * 0.28)) * 0.255], ladderMat, true); void rung; }
      box([0.5, 0.3, 0.4], [-0.5, 1.2, -6.9], std('#3a3d42'));
    }
    if (a.dressing === 'pallet') {
      box([1.0, 0.12, 0.8], [0.4, 0.06, -6.0], std('#b08a5a', { roughness: 0.9 }), true);
      for (let k = 0; k < 4; k++) box([0.9, 0.22, 0.7], [0.4, 0.23 + k * 0.23, -6.0], std('#c9b89a', { roughness: 0.85 }), true);
      box([0.94, 0.94, 0.74], [0.4, 0.6, -6.0], new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.2, depthWrite: false }));
    }
    if (a.dressing === 'wet') {
      const sign = std('#f2d21c', { roughness: 0.5 });
      for (const sx of [-1, 1]) { const leaf = box([0.3, 0.6, 0.02], [0.4, 0.3, -5.6 + sx * 0.12], sign, true); leaf.rotation.x = sx * 0.35; }
      label('WET FLOOR', 0.26, 0.1, [0.4, 0.4, -5.47], '#1c1c1e', '#f2d21c', [-0.35, 0, 0]);
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.4, 14), sign); bucket.position.set(-0.55, 0.2, -6.4); bucket.castShadow = true; add(bucket);
      const mop = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6), std('#8a6a4a')); mop.position.set(-0.5, 0.9, -6.5); mop.rotation.z = 0.25; add(mop);
    }

    // Stands that small things are lifted onto, so a coffee cup does not vanish into the grilles.
    const standMat = std('#3a3d42', { metalness: 0.4 });
    const stands = SLOTS.map(() => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), standMat);
      body.castShadow = body.receiveShadow = true;
      group.add(body);
      group.visible = false;
      root.add(group);
      return { group, body };
    });

    // Light: a cold wash, a key from the panels above, a pool on the hero.
    const sky = new THREE.Color(tint);
    root.add(new THREE.HemisphereLight(sky, '#3c4450', 0.9 * level + 0.25));
    const key = new THREE.DirectionalLight(sky, 1.3 * level + 0.3);
    key.position.set(-2, 10, 6);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.03; key.shadow.bias = -0.0004;
    const shadow = key.shadow.camera;
    shadow.left = -4; shadow.right = 4; shadow.bottom = -9; shadow.top = 9; shadow.near = 1; shadow.far = 30;
    shadow.updateProjectionMatrix();
    root.add(key, key.target);
    const spot = new THREE.SpotLight(outage ? '#ffd0b0' : sky, outage ? 8 : 18, 8, 0.55, 0.8, 1.3);
    spot.position.set(SLOTS[0].x, CEIL - 0.15, SLOTS[0].z + 0.4);
    spot.target.position.set(SLOTS[0].x, 0, SLOTS[0].z);
    root.add(spot, spot.target);

    const view = VIEWS[a.view];
    const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.3, 80);
    camera.position.set(view.at[0], view.at[1], view.at[2]);
    camera.lookAt(view.to[0], view.to[1], view.to[2]);

    const place = (items: readonly Placeable[]) => {
      for (const stand of stands) stand.group.visible = false;
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length], stand = stands[index % SLOTS.length];
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        const fit = Math.min(slot.h / height, slot.r / radius);
        const scale = Math.min(fit, Math.max(1, Math.min(0.5 / height, 3)));
        const small = height * scale < 0.7 && radius * scale < 0.5 && slot.lift === 0;
        let y: number = slot.lift;
        if (small) {
          y = THREE.MathUtils.clamp(0.95 - height * scale * 0.5, 0.45, 0.8);
          const side = Math.max(0.4, radius * scale * 2 + 0.1);
          stand.group.visible = true;
          stand.group.position.set(slot.x, 0, slot.z);
          stand.group.rotation.y = slot.turn;
          stand.body.scale.set(side, y, side);
        }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, y, slot.z);
        item.holder.rotation.y = slot.turn + (context.random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      });
      camera.updateMatrixWorld(true);
    };

    const pace = mix(0.5, 2.5, mood.energy);
    const scratch = new THREE.Color();
    let lastTick = -1;
    return {
      object: root, camera, background, capacity: SLOTS.length, ground: floor, keyLight: key, place,
      update(_dt, time) {
        const tick = Math.floor(time * mix(2, 8, mood.energy));
        if (tick !== lastTick) {
          lastTick = tick;
          ledColours.forEach((led, i) => {
            if (!led.busy) return;
            const on = ((tick * 7 + i * 13) % 11) > 3;
            scratch.copy(led.base).multiplyScalar(on ? 1 : 0.15);
            ledMesh.setColorAt(i, scratch);
          });
          ledMesh.instanceColor!.needsUpdate = true;
        }
        if (stutter.length) {
          for (const i of stutter) {
            const n = Math.sin(time * 23 * pace + i * 7) * Math.sin(time * 5.3 * pace + i);
            panels.setColorAt(i, n > 0.6 ? dim : dimmed);
          }
          panels.instanceColor!.needsUpdate = true;
        }
        if (outage) beaconMat.emissiveIntensity = 1.2 + Math.sin(time * 6 * pace) * 1.1;
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
