import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix } from '@conjure/kit';

type P3 = [number, number, number];
function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
interface Item { at: P3; size: P3; turn?: number; colour: THREE.ColorRepresentation }
function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly Item[], shadow = false) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  mesh.count = items.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  items.forEach((item, i) => {
    q.setFromAxisAngle(up, item.turn ?? 0);
    m.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...item.size));
    mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(item.colour));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadow; mesh.receiveShadow = shadow;
  mesh.frustumCulled = false;
  return mesh;
}

interface Era { wall: string; ceiling: string; shell: string; frame: string; accent: string; second: string; tube: string; floorA: string; floorB: string; grout: string; tile: number; ceil: number; word: string }
const ERAS: Record<'seventies' | 'warehouse' | 'depachika' | 'discount', Era> = {
  seventies: { wall: '#d8c49a', ceiling: '#e2d8be', shell: '#7a5232', frame: '#c9ced0', accent: '#d8641c', second: '#e0a81c', tube: '#fff0cc', floorA: '#e6dabc', floorB: '#b8986a', grout: '#8a7450', tile: 0.3, ceil: 3.2, word: 'FROZEN FOODS' },
  warehouse: { wall: '#9aa4ac', ceiling: '#6a727a', shell: '#b6bcbe', frame: '#8a9296', accent: '#d02a22', second: '#f07016', tube: '#eef6ff', floorA: '#b9bbb6', floorB: '#b2b4af', grout: '#8c8e8a', tile: 3, ceil: 6.6, word: 'FROZEN' },
  depachika: { wall: '#efe6d2', ceiling: '#f2ecde', shell: '#f4f0e6', frame: '#c9a878', accent: '#28386a', second: '#d8402a', tube: '#fff2d8', floorA: '#efe8d8', floorB: '#e8e0cc', grout: '#b4ac98', tile: 0.15, ceil: 2.8, word: 'ICE' },
  discount: { wall: '#f0d21c', ceiling: '#dcdcd4', shell: '#e6e6e0', frame: '#3a3e44', accent: '#1c1c20', second: '#e8201c', tube: '#f2fbff', floorA: '#c9c9c1', floorB: '#c2c2ba', grout: '#9a9a92', tile: 0.6, ceil: 3.5, word: 'FROZEN' },
};
const GOODS = [
  ['#c8281e', '#e85a1c', '#e8a81c', '#f0e6d2'], ['#1f5fb8', '#2f9ac8', '#e8eef2', '#16407a'], ['#2f8a4a', '#7ac23a', '#e8b81c', '#f0e6d2'],
  ['#f2b8c8', '#f6ecd2', '#6a4630', '#9ad8c8'], ['#7a2d82', '#e8a81c', '#c8281e', '#1c8f9a'], ['#c8281e', '#1f7a3a', '#f0e6d2', '#2a2a30'],
] as const;
const HALF = 1.9, DEPTH = 0.8, BAY = 0.76, BASE = 0.28, TOP = 2.0, HEAD = 2.3, FRONT = 12;
const SLOTS = [
  { x: -0.3, z: 2.4, r: 1.15, h: 2.3, min: 0.8, turn: 0.3 },
  { x: 0.95, z: -1.6, r: 0.8, h: 2.0, min: 0.62, turn: -0.35 },
  { x: -0.95, z: -5.4, r: 0.8, h: 2.0, min: 0.62, turn: 0.4 },
  { x: 0.6, z: -9.6, r: 0.85, h: 2.1, min: 0.62, turn: -0.2 },
] as const;

export default defineWorld({
  questions: {
    era: choice('What era and class of store is it?', {
      seventies: 'A 1970s supermarket: wood-grain freezer cabinets, orange and harvest-gold stripes, checkerboard floor, warm yellowed tubes.',
      warehouse: 'A big-box warehouse club: steel cases under towering pallet racking, bare concrete, high-bay lamps far overhead.',
      depachika: 'A Japanese department-store basement food hall: low ceiling, pale wood trim, small cream tiles, indigo banners, immaculate.',
      discount: 'A discount grocer: yellow walls, black and red price shouting, strip lights, scuffed vinyl.',
    }),
    hour: choice('What hour is it?', {
      three: '3 a.m.: half the ceiling lights off for the night, the freezer doors doing most of the lighting.',
      closing: 'Closing time: every light on, bright and flat, the last announcement echoing.',
      dawn: 'Just before opening: night mode still on, a first pink light coming from the far end.',
      afternoon: 'A dead mid-afternoon: full white light, ordinary and exposed.',
    }),
    state: choice('What state is the aisle in?', {
      ordinary: 'Ordinary: stocked, humming, nobody here.',
      waxed: 'Freshly waxed: the floor a mirror, every door doubled in it.',
      restock: 'Mid-restock: cartons stacked along the cases, a few doors propped open, cardboard on the floor.',
      storm: 'Stripped before a storm: shelves bare, doors left swinging, paper signs taped to the glass.',
      powercut: 'Power cut: the cases dark and fogged, meltwater creeping out, one emergency lamp at the far end.',
    }),
    end: choice('What is at the far end of the aisle?', {
      doors: 'Double swing doors to the stockroom, light in their porthole windows.',
      dairy: 'The back-wall dairy case, a bright white band of milk.',
      windows: 'The front windows, and the car park beyond them.',
      endless: 'Nothing: the aisle just keeps going into cold haze.',
    }),
    overhead: choice('What hangs over the aisle?', {
      marker: 'An aisle marker board with a number and a list of what is here.',
      banners: 'A string of sale banners down the middle.',
      mirror: 'A convex security mirror dome.',
      nothing: 'Nothing but the ceiling.',
    }),
    view: choice('Where are we standing?', {
      eye: 'At eye level in the mouth of the aisle, looking straight down it.',
      low: 'Low, at trolley-seat height, the doors towering.',
      cctv: 'High in the corner like the security camera.',
      glass: 'Close against one wall of doors, cheek almost on the glass, looking along it.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const era = ERAS[a.era];
    const root = new THREE.Group();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...options });
    const add = <T extends THREE.Object3D>(node: T) => { root.add(node); return node; };
    const box = (size: P3, at: P3, material: THREE.Material, shadow = false) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...at); mesh.castShadow = shadow; mesh.receiveShadow = true; return add(mesh); };
    const plane = (w: number, h: number, at: P3, material: THREE.Material, rot: P3 = [0, 0, 0]) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); mesh.position.set(...at); mesh.rotation.set(...rot); return add(mesh); };

    const power = a.state !== 'powercut', storm = a.state === 'storm', restock = a.state === 'restock';
    const endless = a.end === 'endless', warehouse = a.era === 'warehouse';
    const END = endless ? -52 : -16.5, LEN = FRONT - END, MID = (FRONT + END) / 2, CEIL = era.ceil;
    const night = a.hour === 'three' || a.hour === 'dawn';
    const amb = { three: 0.34, closing: 0.95, dawn: 0.58, afternoon: 1.05 }[a.hour] * (power ? 1 : 0.6);
    const tubeTint = new THREE.Color(era.tube).lerp(new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.7, 0.8), 0.3);
    const doorTint = new THREE.Color().setHSL(mix(0.57, 0.5, mood.warmth), 0.55, mix(0.88, 0.94, mood.cheer));
    const sky = new THREE.Color({ three: '#46547e', closing: '#7a84ac', dawn: '#f0b8a0', afternoon: '#d4e6f4' }[a.hour]);
    const shade = (colour: THREE.ColorRepresentation, k: number) => new THREE.Color(colour).multiplyScalar(k);
    const background = new THREE.Color(era.wall).lerp(new THREE.Color('#aab4c0'), 0.45).multiplyScalar(mix(0.62, 1, clamp01(amb)));
    if (!power) background.lerp(new THREE.Color('#566068'), 0.6);
    if (a.hour === 'three') background.lerp(new THREE.Color('#5a6680'), 0.35);

    // Floor: polished tile.
    const gloss = a.state === 'waxed' ? 1 : mix(0.75, 0.2, mood.wear);
    const floorArt = paint(256, 256, (ctx) => {
      ctx.fillStyle = era.floorA; ctx.fillRect(0, 0, 256, 256);
      if (a.era === 'seventies') { ctx.fillStyle = era.floorB; ctx.fillRect(0, 0, 128, 128); ctx.fillRect(128, 128, 128, 128); }
      else { ctx.fillStyle = era.floorB; for (let i = 0; i < 4; i++) ctx.fillRect(pick([0, 128]), pick([0, 128]), 128, 128); }
      for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '40,40,36' : '255,255,250'},${0.05 + random() * 0.12})`; ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2); }
      ctx.fillStyle = era.grout; ctx.globalAlpha = 0.75; const line = warehouse ? 2 : 3;
      ctx.fillRect(0, 0, 256, line); ctx.fillRect(0, 128, 256, line); ctx.fillRect(0, 0, line, 256); ctx.fillRect(128, 0, line, 256);
      ctx.globalAlpha = 1;
      for (let i = 0; i < mood.wear * 40; i++) { ctx.strokeStyle = `rgba(50,46,40,${0.08 + random() * 0.14})`; ctx.lineWidth = 1 + random() * 3; ctx.beginPath(); const x = random() * 256, y = random() * 256; ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 30, y + random() * 90); ctx.stroke(); }
    });
    floorArt.wrapS = floorArt.wrapT = THREE.RepeatWrapping; floorArt.repeat.set(2 * HALF / (era.tile * 2), LEN / (era.tile * 2));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF + 0.2, LEN).rotateX(-Math.PI / 2), std(!power ? '#98a2b0' : a.hour === 'three' ? '#9ea8c4' : a.hour === 'dawn' ? '#d8c8cc' : '#ffffff', { map: floorArt, roughness: mix(0.6, 0.12, gloss), metalness: 0.12 }));
    floor.position.set(0, 0, MID); floor.receiveShadow = true; add(floor);
    if (warehouse) for (const side of [-1, 1]) box([0.1, 0.004, LEN], [side * (HALF - 0.45), 0.002, MID], std('#e8c21c', { roughness: 0.5 }));

    // The doors' light lying on the floor, and the ceiling tubes mirrored down the middle.
    const glowArt = paint(64, 64, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, 64, 5); ctx.fillRect(0, 59, 64, 5);
    });
    glowArt.wrapT = THREE.RepeatWrapping; glowArt.repeat.set(1, LEN / BAY);
    const doorGlow = power ? mix(0.3, 0.75, gloss) * (night ? 1 : 0.6) : 0;
    const glowMats: THREE.MeshBasicMaterial[] = [];
    if (doorGlow > 0) for (const side of [-1, 1]) {
      const material = new THREE.MeshBasicMaterial({ map: glowArt, color: doorTint, transparent: true, opacity: doorGlow, depthWrite: false });
      const strip = plane(1.7, LEN, [side * (HALF - 0.85), 0.006, MID], material, [-Math.PI / 2, 0, 0]);
      strip.scale.x = -side; strip.renderOrder = 1; glowMats.push(material);
    }

    // Freezer runs down both walls.
    const bays = Math.ceil(LEN / BAY);
    const frameMat = std(era.frame, { metalness: 0.6, roughness: 0.35 });
    const shellMat = std(era.shell, { metalness: warehouse ? 0.6 : 0.05, roughness: 0.5 });
    const posts: Item[] = [], handles: Item[] = [], goods: Item[] = [], labels: Item[] = [], darks: Item[] = [], crates: Item[] = [], papers: Item[] = [];
    const fillBase = storm ? 0.07 : clamp01(mix(0.4, 1.02, mood.density) - mood.wear * 0.1);
    const openDoors: { side: number; z: number; angle: number }[] = [];
    const flicker: { side: number; z: number }[] = [];
    for (const side of [-1, 1]) {
      const x = side * HALF;
      box([DEPTH, BASE, LEN], [x + side * DEPTH / 2, BASE / 2, MID], std(shade(era.shell, 0.55)), true);
      box([0.02, 0.1, LEN], [x - side * 0.011, 0.05, MID], std('#1c1e22'));
      box([DEPTH, HEAD - TOP, LEN], [x + side * DEPTH / 2, (HEAD + TOP) / 2, MID], shellMat, true);
      box([0.012, 0.05, LEN], [x - side * 0.008, TOP + 0.05, MID], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: doorTint, emissiveIntensity: power ? 1.3 : 0.02 }));
      if (a.era === 'seventies') box([0.012, 0.07, LEN], [x - side * 0.008, TOP + 0.2, MID], std(era.accent));
      if (a.era === 'discount') box([0.012, 0.1, LEN], [x - side * 0.008, TOP + 0.2, MID], std(era.second));
      // Lit interior.
      plane(LEN, TOP - BASE, [x + side * (DEPTH - 0.08), (TOP + BASE) / 2, MID], new THREE.MeshBasicMaterial({ color: power ? shade(doorTint, 0.98) : '#1e252c' }), [0, -side * Math.PI / 2, 0]);
      for (let j = 0; j < 5; j++) box([DEPTH - 0.14, 0.018, LEN], [x + side * (DEPTH / 2), BASE + 0.04 + j * 0.33, MID], new THREE.MeshBasicMaterial({ color: power ? '#dfe8ee' : '#3a424a' }));
      for (const y of [BASE + 0.025, TOP - 0.025]) box([0.035, 0.05, LEN], [x, y, MID], frameMat);
      for (let i = 0; i <= bays; i++) {
        const z = FRONT - i * BAY, zc = z - BAY / 2;
        posts.push({ at: [x, (TOP + BASE) / 2, z], size: [0.04, TOP - BASE, 0.05], colour: era.frame });
        if (i === bays) break;
        const near = zc > -9 && zc < 8.5;
        const dead = !power || random() < mood.wear * 0.12;
        const canOpen = near && Math.abs(zc - SLOTS[0].z) > 1.6 && !SLOTS.some((slot) => Math.sign(slot.x) === side && Math.abs(slot.z - zc) < 1.3 && Math.abs(slot.x) > 0.5);
        const open = canOpen && ((restock && random() < 0.16) || (storm && random() < 0.2) || (!power && random() < 0.06));
        if (open) openDoors.push({ side, z, angle: 0.9 + random() * 0.8 });
        else handles.push({ at: [x - side * 0.045, 1.18, z - BAY + 0.09], size: [0.022, 0.5, 0.022], colour: a.era === 'depachika' ? era.frame : '#22262a' });
        if (dead && power) darks.push({ at: [x + side * (DEPTH - 0.1), (TOP + BASE) / 2, zc], size: [0.01, TOP - BASE, BAY], colour: '#2a323a' });
        else if (power && near && flicker.length < 2 && random() < 0.05 + mood.wear * 0.1) flicker.push({ side, z: zc });
        const lit = dead ? 0.3 : 1;
        const palette = GOODS[Math.floor(random() * GOODS.length)], fill = restock && random() < 0.25 ? fillBase * 0.4 : fillBase * mix(0.7, 1.1, random());
        const far = zc < -22;
        for (let j = 0; j < 5; j++) {
          const cols = far ? 1 : 3, y = BASE + 0.05 + j * 0.33;
          for (let c = 0; c < cols; c++) {
            if (random() > fill) continue;
            const h = far ? 0.24 : 0.14 + random() * 0.12, w = far ? BAY * 0.8 : 0.19;
            const zz = far ? zc : z - 0.13 - c * 0.25 + (random() - 0.5) * 0.03;
            const colour = shade(pick(palette), lit);
            goods.push({ at: [x + side * 0.2, y + h / 2, zz], size: [0.2, h, w], colour });
            if (zc > -7) labels.push({ at: [x + side * 0.097, y + h * 0.66, zz], size: [0.004, h * 0.34, w * 0.8], colour: shade('#f6f2e4', lit) });
          }
        }
        if (storm && near && random() < 0.22) papers.push({ at: [x - side * 0.012, 1.15 + random() * 0.4, zc], size: [0.004, 0.24, 0.3], turn: 0, colour: '#fbf8ea' });
      }
      // Glass, with whatever is on it.
      const fog = clamp01((power ? 0.1 : 0.8) + mood.wear * 0.3 + (a.state === 'ordinary' ? 0 : 0.05));
      const film = paint(128, 256, (ctx) => {
        ctx.clearRect(0, 0, 128, 256);
        const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, `rgba(236,244,248,${fog * 0.35})`); g.addColorStop(0.6, `rgba(236,244,248,${fog * 0.6})`); g.addColorStop(1, `rgba(240,248,250,${Math.min(0.96, fog * 1.2)})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 256);
        ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(44, 0); ctx.lineTo(14, 256); ctx.lineTo(0, 256); ctx.lineTo(0, 150); ctx.fill();
        if (fog > 0.45) { ctx.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 12; i++) { const fx = random() * 128, fy = 30 + random() * 120; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(fx, fy, 2, 30 + random() * 90); } }
      });
      film.wrapS = THREE.RepeatWrapping; film.repeat.set(LEN / BAY, 1);
      const glass = plane(LEN, TOP - BASE, [x - side * 0.004, (TOP + BASE) / 2, MID], new THREE.MeshBasicMaterial({ map: film, color: power ? '#ffffff' : '#6e7a86', transparent: true, depthWrite: false }), [0, -side * Math.PI / 2, 0]);
      glass.renderOrder = 2;
    }
    add(instances(new THREE.BoxGeometry(1, 1, 1), frameMat, posts));
    add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.4 }), handles));
    add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), goods));
    add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), labels));
    add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), darks));
    // Doors standing open.
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#dff2ff', transparent: true, opacity: 0.16, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
    for (const door of openDoors) {
      const leaf = new THREE.Group(); leaf.position.set(door.side * (HALF - 0.01), BASE, door.z);
      const w = BAY - 0.03, h = TOP - BASE;
      for (const [size, at] of [[[0.03, 0.045, w], [0, 0.022, -w / 2]], [[0.03, 0.045, w], [0, h - 0.022, -w / 2]], [[0.03, h, 0.045], [0, h / 2, -0.022]], [[0.03, h, 0.045], [0, h / 2, -w + 0.022]]] as [P3, P3][]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(...size), frameMat); bar.position.set(...at); bar.castShadow = true; leaf.add(bar); }
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateY(Math.PI / 2), glassMat); pane.position.set(0, h / 2, -w / 2); leaf.add(pane);
      leaf.rotation.y = -door.side * door.angle; add(leaf);
    }
    // Storm notices taped to the glass.
    if (papers.length) {
      const notice = paint(256, 200, (ctx) => { ctx.fillStyle = '#fbf8ea'; ctx.fillRect(0, 0, 256, 200); ctx.fillStyle = '#c8201c'; ctx.font = 'italic 900 60px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LIMIT 2', 128, 66, 236); ctx.fillStyle = '#1c2a8a'; ctx.font = 'italic 900 42px sans-serif'; ctx.fillText('PER FAMILY', 128, 138, 236); });
      const noticeMat = std('#ffffff', { map: notice, roughness: 0.9, side: THREE.DoubleSide });
      for (const paper of papers) { const sheet = plane(0.34, 0.27, paper.at, noticeMat, [0, paper.at[0] > 0 ? -Math.PI / 2 : Math.PI / 2, (random() - 0.5) * 0.14]); sheet.renderOrder = 3; }
    }
    // A bay that stutters.
    const flickMats = flicker.map((bay) => { const material = new THREE.MeshBasicMaterial({ color: '#10161c', transparent: true, opacity: 0, depthWrite: false }); const veil = plane(BAY, TOP - BASE, [bay.side * (HALF + 0.02), (TOP + BASE) / 2, bay.z], material, [0, -bay.side * Math.PI / 2, 0]); veil.renderOrder = 1; return material; });

    // Above the cases.
    if (warehouse) {
      const beams: Item[] = [], loads: Item[] = [];
      for (const side of [-1, 1]) {
        const x = side * (HALF + DEPTH / 2 + 0.1);
        box([0.2, CEIL, LEN], [side * (HALF + DEPTH + 0.5), CEIL / 2, MID], std(shade(era.wall, 0.8)));
        for (let z = FRONT; z > END; z -= 2.7) for (const dx of [-0.4, 0.4]) beams.push({ at: [x + dx, (CEIL - 0.4 + HEAD) / 2, z], size: [0.08, CEIL - 0.4 - HEAD, 0.08], colour: '#2a5cb0' });
        for (const y of [HEAD + 0.25, HEAD + 2.0, HEAD + 3.4]) {
          for (const dx of [-0.4, 0.4]) beams.push({ at: [x + dx, y, MID], size: [0.07, 0.12, LEN], colour: '#f07016' });
          for (let z = FRONT - 0.8; z > END + 1; z -= 1.35) {
            if (random() < mix(0.45, 0.05, mood.density) || (storm && random() < 0.5)) continue;
            const h = 0.6 + random() * 0.85;
            loads.push({ at: [x, y + 0.13, z], size: [1.0, 0.14, 1.15], colour: '#b08a58' });
            loads.push({ at: [x, y + 0.2 + h / 2, z], size: [0.95 + random() * 0.1, h, 1.05 + random() * 0.1], turn: (random() - 0.5) * 0.06, colour: pick(['#b88a54', '#c29660', '#e6e8e4', '#9cc8e8', '#b88a54', '#d8c8a0', '#c8281e']) });
          }
        }
      }
      add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.5, metalness: 0.2 }), beams));
      add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.75 }), loads, true));
    } else {
      const soffit = paint(512, 128, (ctx) => {
        ctx.fillStyle = a.era === 'seventies' ? '#7a5230' : era.wall; ctx.fillRect(0, 0, 512, 128);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (a.era === 'seventies') {
          for (let i = 0; i < 60; i++) { ctx.strokeStyle = `rgba(50,30,14,${0.15 + random() * 0.25})`; ctx.lineWidth = 1; const y = random() * 128; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(170, y + 4, 340, y - 4, 512, y); ctx.stroke(); }
          ctx.fillStyle = era.accent; ctx.fillRect(0, 92, 512, 12); ctx.fillStyle = era.second; ctx.fillRect(0, 106, 512, 8);
          ctx.fillStyle = '#f2dca8'; ctx.font = '900 44px serif'; ctx.fillText(era.word, 256, 50, 440);
        } else if (a.era === 'depachika') {
          ctx.fillStyle = '#c9a878'; for (let x = 0; x < 512; x += 12) ctx.fillRect(x, 0, 7, 128);
          ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fillRect(0, 118, 512, 10);
          for (const [x, colour] of [[128, era.accent], [384, era.second]] as const) {
            ctx.fillStyle = colour; ctx.fillRect(x - 86, 14, 172, 100);
            ctx.strokeStyle = '#f6f0e0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x - 44, 64, 26, 0, 7); ctx.stroke();
            ctx.lineCap = 'round'; ctx.lineWidth = 8; for (let k = 0; k < 3; k++) { const gx = x + 4 + k * 26; ctx.beginPath(); ctx.moveTo(gx - 8, 40 + random() * 8); ctx.lineTo(gx + 8, 44 + random() * 10); ctx.moveTo(gx, 36); ctx.lineTo(gx - 4 + random() * 8, 90); ctx.moveTo(gx - 9, 66 + random() * 10); ctx.lineTo(gx + 9, 62 + random() * 14); ctx.stroke(); }
          }
        } else {
          ctx.fillStyle = era.accent; ctx.fillRect(0, 0, 512, 10); ctx.fillRect(0, 118, 512, 10);
          ctx.font = 'italic 900 78px sans-serif'; ctx.fillText(era.word, 150, 66, 250);
          ctx.fillStyle = era.second; ctx.beginPath(); for (let i = 0; i < 28; i++) { const t = i * Math.PI / 14, r = i % 2 ? 58 : 44; ctx.lineTo(400 + Math.cos(t) * r * 1.5, 64 + Math.sin(t) * r); } ctx.fill();
          ctx.fillStyle = '#fff2a0'; ctx.font = 'italic 900 50px sans-serif'; ctx.fillText(pick(['99¢', '2 FOR $5', 'WOW!', '$1']), 400, 66, 130);
        }
      });
      soffit.wrapS = THREE.RepeatWrapping; soffit.repeat.set(LEN / ((CEIL - HEAD) * 4), 1);
      const soffitMat = std('#ffffff', { map: soffit, roughness: 0.85 });
      for (const side of [-1, 1]) plane(LEN, CEIL - HEAD, [side * (HALF + 0.02), (CEIL + HEAD) / 2, MID], soffitMat, [0, -side * Math.PI / 2, 0]);
    }

    // Ceiling and its lights.
    const tubes: { material: THREE.MeshStandardMaterial; base: number; stutter: boolean; pool: THREE.MeshBasicMaterial | null }[] = [];
    const ceilArt = paint(128, 128, (ctx) => { ctx.fillStyle = era.ceiling; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = 'rgba(0,0,0,0.05)'; for (let i = 0; i < 240; i++) ctx.fillRect(random() * 128, random() * 128, 1.5, 1.5); ctx.fillStyle = 'rgba(70,70,60,0.35)'; ctx.fillRect(0, 0, 128, 3); ctx.fillRect(0, 0, 3, 128); });
    ceilArt.wrapS = ceilArt.wrapT = THREE.RepeatWrapping; ceilArt.repeat.set(warehouse ? 2 : 2 * HALF / 0.6, LEN / (warehouse ? 2.7 : 0.6));
    const lid = plane(2 * (HALF + (warehouse ? DEPTH + 0.6 : 0.05)), LEN, [0, CEIL, MID], std(warehouse ? shade(era.ceiling, 0.85) : '#ffffff', { map: ceilArt, roughness: 0.95, emissive: tubeTint, emissiveIntensity: power ? 0.04 * amb : 0 }), [Math.PI / 2, 0, 0]);
    lid.receiveShadow = false;
    if (warehouse) for (let z = FRONT; z > END; z -= 2.7) box([2 * (HALF + DEPTH + 0.6), 0.3, 0.12], [0, CEIL - 0.2, z], std('#8a9298', { metalness: 0.4 }));
    const poolArt = paint(64, 64, (ctx) => { const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); });
    const spacing = warehouse ? 5.4 : a.era === 'depachika' ? 1.9 : 2.4;
    let index = 0;
    for (let z = FRONT - 1.6; z > END + 0.5; z -= spacing, index++) {
      const nightOff = night && index % 2 === 1;
      const broken = random() < mood.wear * 0.18;
      const lit = power && !nightOff && !broken;
      const base = lit ? mix(1.3, 2.1, mood.cheer) * (a.hour === 'three' ? 0.7 : 1) : 0.05;
      const material = new THREE.MeshStandardMaterial({ color: '#f6f8f6', emissive: tubeTint, emissiveIntensity: base, roughness: 0.4 });
      const hang = warehouse ? CEIL - 1.5 : CEIL;
      if (warehouse) { box([0.02, 1.4, 0.02], [0, CEIL - 0.75, z], std('#30343a')); const shadeMesh = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.32, 0.26, 20, 1, true), std('#c8ccce', { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }))); shadeMesh.position.set(0, hang + 0.05, z); const disc = add(new THREE.Mesh(new THREE.CircleGeometry(0.3, 20).rotateX(Math.PI / 2), material)); disc.position.set(0, hang - 0.07, z); }
      else if (a.era === 'depachika') for (const x of [-0.8, 0.8]) { const disc = add(new THREE.Mesh(new THREE.CircleGeometry(0.11, 18).rotateX(Math.PI / 2), material)); disc.position.set(x, CEIL - 0.006, z); }
      else if (a.era === 'discount') { box([0.12, 0.06, 1.5], [0, CEIL - 0.03, z], std('#e8e8e2')); for (const x of [-0.035, 0.035]) box([0.03, 0.03, 1.44], [x, CEIL - 0.075, z], material); }
      else { box([1.26, 0.03, 0.66], [0, CEIL - 0.012, z], std('#d8ceb4')); box([1.2, 0.012, 0.6], [0, CEIL - 0.03, z], material); }
      let pool: THREE.MeshBasicMaterial | null = null;
      if (lit && z > -24) { pool = new THREE.MeshBasicMaterial({ map: poolArt, color: tubeTint, transparent: true, opacity: mix(0.1, 0.5, gloss), depthWrite: false }); const spot = plane(1.5, 1.3, [0, 0.008, z], pool, [-Math.PI / 2, 0, 0]); spot.renderOrder = 1; }
      tubes.push({ material, base, stutter: lit && (random() < mood.wear * 0.3 || (mood.energy > 0.75 && random() < 0.15)), pool });
    }

    // The far end.
    const endLight = new THREE.Color('#fff2d0');
    if (!endless) {
      const wallW = 2 * (HALF + DEPTH + 0.7), wy = CEIL / 2;
      box([wallW, CEIL, 0.2], [0, wy, END - 0.1], std(a.end === 'windows' ? shade(era.wall, 0.7) : era.wall));
      if (a.end === 'doors') {
        box([2 * HALF, 0.34, 0.05], [0, 2.5, END + 0.03], std(warehouse ? era.accent : era.accent));
        const doorMat = std('#aab2b6', { metalness: 0.5, roughness: 0.4 });
        const port = new THREE.MeshBasicMaterial({ color: power ? '#ffe8a8' : '#3a4048' });
        for (const side of [-1, 1]) {
          box([0.98, 2.25, 0.06], [side * 0.5, 1.125, END + 0.04], doorMat);
          const win = add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), port)); win.position.set(side * 0.5, 1.55, END + 0.075);
          const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), std('#5a6268', { metalness: 0.6 }))); rim.position.copy(win.position);
          box([0.9, 0.32, 0.012], [side * 0.5, 0.3, END + 0.075], std('#6a7278', { metalness: 0.7, roughness: 0.3 }));
        }
        const tag = paint(256, 48, (ctx) => { ctx.fillStyle = era.accent; ctx.fillRect(0, 0, 256, 48); ctx.fillStyle = '#ffffff'; ctx.font = '900 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STAFF ONLY', 128, 25); });
        plane(1.6, 0.3, [0, 2.5, END + 0.06], std('#ffffff', { map: tag }));
      } else if (a.end === 'dairy') {
        const glow = new THREE.MeshBasicMaterial({ color: power ? '#f6fbff' : '#3a424a' });
        plane(wallW, 1.9, [0, 1.15, END + 0.02], glow);
        box([wallW, 0.5, 0.5], [0, 2.35, END + 0.25], std(era.shell)); box([wallW, 0.22, 0.6], [0, 0.11, END + 0.3], std(shade(era.shell, 0.6)));
        const milk: Item[] = [];
        for (let j = 0; j < 4; j++) { box([wallW, 0.03, 0.4], [0, 0.3 + j * 0.45, END + 0.2], new THREE.MeshBasicMaterial({ color: power ? '#dfe8ee' : '#4a525a' })); for (let x = -2.5; x < 2.5; x += 0.16) if (random() < fillBase) milk.push({ at: [x, 0.3 + j * 0.45 + 0.15, END + 0.3], size: [0.13, 0.27, 0.13], colour: shade(pick(['#f4f6f6', '#f4f6f6', '#2a62c8', '#c8281e', '#f0e0a0', '#2c8a4a']), power ? 1 : 0.35) }); }
        add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), milk));
        const tag = paint(256, 64, (ctx) => { ctx.fillStyle = era.shell; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = a.era === 'depachika' ? era.accent : a.era === 'seventies' ? '#f2dca8' : era.second; ctx.font = '900 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DAIRY', 128, 34); });
        plane(1.9, 0.44, [0, 2.36, END + 0.51], std('#ffffff', { map: tag }));
        endLight.set('#f2f8ff');
      } else {
        const view = paint(512, 256, (ctx) => {
          const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#' + sky.clone().multiplyScalar(0.8).getHexString()); g.addColorStop(0.62, '#' + sky.getHexString()); g.addColorStop(0.63, '#' + sky.clone().multiplyScalar(0.45).getHexString()); g.addColorStop(1, '#' + sky.clone().multiplyScalar(0.35).getHexString());
          ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
          const dark = a.hour !== 'afternoon';
          for (let i = 0; i < 4; i++) { const x = 70 + i * 124 + random() * 30; ctx.fillStyle = 'rgba(20,24,34,0.8)'; ctx.fillRect(x, 60, 4, 110); ctx.fillRect(x - 16, 58, 36, 5); if (dark) { const halo = ctx.createRadialGradient(x, 66, 2, x, 66, 60); halo.addColorStop(0, 'rgba(255,226,160,0.95)'); halo.addColorStop(1, 'rgba(255,226,160,0)'); ctx.fillStyle = halo; ctx.fillRect(x - 60, 6, 120, 120); const spill = ctx.createRadialGradient(x, 190, 4, x, 190, 80); spill.addColorStop(0, 'rgba(255,226,160,0.4)'); spill.addColorStop(1, 'rgba(255,226,160,0)'); ctx.fillStyle = spill; ctx.fillRect(x - 80, 160, 160, 60); } }
          const cars = Math.round(mix(0, 4, mood.density)) + (a.hour === 'afternoon' ? 2 : 0);
          for (let i = 0; i < cars; i++) { const x = 30 + random() * 420; ctx.fillStyle = pick(['#2a3040', '#5a2a2a', '#c8ccd0', '#2a4a5a']); ctx.beginPath(); ctx.roundRect(x, 150, 70, 22, 6); ctx.roundRect(x + 14, 136, 40, 18, 6); ctx.fill(); }
        });
        plane(2 * HALF + 1.6, 2.5, [0, 1.45, END + 0.02], new THREE.MeshBasicMaterial({ map: view }));
        for (let x = -2.4; x <= 2.4; x += 1.2) box([0.06, 2.6, 0.08], [x, 1.4, END + 0.06], frameMat);
        box([wallW, 0.08, 0.1], [0, 0.22, END + 0.06], frameMat); box([wallW, 0.5, 0.12], [0, CEIL > 3 ? 2.95 : 2.62, END + 0.05], std(era.accent));
        endLight.copy(sky).lerp(new THREE.Color('#ffffff'), 0.3);
      }
      if (!power) {
        box([0.34, 0.14, 0.1], [1.2, 2.2, END + 0.08], std('#e8e8e2'));
        for (const side of [-1, 1]) { const lamp = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: '#fff0c0' }))); lamp.position.set(1.2 + side * 0.13, 2.32, END + 0.14); }
        const exit = paint(128, 48, (ctx) => { ctx.fillStyle = '#0c2a14'; ctx.fillRect(0, 0, 128, 48); ctx.fillStyle = '#5cf07a'; ctx.font = '900 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', 64, 26); });
        plane(0.5, 0.19, [-1.1, 2.3, END + 0.06], new THREE.MeshBasicMaterial({ map: exit }));
      }
    }
    // Cold haze between here and there.
    const hazeLevel = (endless ? 0.2 : 0.07) + (power ? 0 : 0.1) + mood.wear * 0.04;
    const hazeMats: THREE.MeshBasicMaterial[] = [];
    const veils = endless ? 9 : 4;
    for (let i = 1; i <= veils; i++) {
      const material = new THREE.MeshBasicMaterial({ color: background, transparent: true, opacity: hazeLevel, depthWrite: false });
      const veil = plane(2 * (HALF + DEPTH + 0.8), CEIL, [0, CEIL / 2, mix(-3, END + 0.6, i / veils)], material); veil.renderOrder = 4; hazeMats.push(material);
    }
    if (endless) box([2 * (HALF + DEPTH + 0.8), CEIL, 0.1], [0, CEIL / 2, END], new THREE.MeshBasicMaterial({ color: background }));
    if (!power) for (let i = 0; i < 5; i++) { const mist = plane(2 * HALF, 0.5, [0, 0.25, 4 - i * 3.2], new THREE.MeshBasicMaterial({ color: '#e8f0f4', transparent: true, opacity: 0.1, depthWrite: false })); mist.renderOrder = 4; }

    // Overhead.
    if (a.overhead === 'marker') {
      const z = -0.4, y = Math.min(CEIL - 0.55, 3.1);
      const board = paint(384, 256, (ctx) => {
        ctx.fillStyle = a.era === 'seventies' ? '#7a5230' : a.era === 'depachika' ? '#f4eee0' : a.era === 'discount' ? era.wall : '#f2f4f4'; ctx.fillRect(0, 0, 384, 256);
        ctx.fillStyle = a.era === 'discount' ? era.accent : era.second === '#f07016' ? era.accent : a.era === 'seventies' ? era.accent : era.accent; ctx.beginPath(); ctx.arc(74, 128, 58, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 70px sans-serif'; ctx.fillText(String(3 + Math.floor(random() * 17)), 74, 132);
        ctx.fillStyle = a.era === 'seventies' ? '#f2dca8' : '#22262c'; ctx.textAlign = 'left'; ctx.font = '900 34px sans-serif';
        ['FROZEN MEALS', 'ICE CREAM', 'PIZZA', 'VEGETABLES'].forEach((line, i) => ctx.fillText(line, 150, 44 + i * 56, 222));
      });
      const sign = add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.04), [std('#888'), std('#888'), std('#888'), std('#888'), std('#ffffff', { map: board, roughness: 0.7, emissive: '#ffffff', emissiveMap: board, emissiveIntensity: 0.12 }), std('#aaa')]));
      sign.position.set(0, y, z);
      for (const x of [-0.6, 0.6]) box([0.015, CEIL - y - 0.5, 0.015], [x, (CEIL + y + 0.5) / 2, z], std('#888'));
    } else if (a.overhead === 'banners') {
      const flags: Item[] = [];
      const y = Math.min(CEIL - 0.5, 3.0);
      for (let z = 3.6; z > Math.max(END, -30); z -= 2.2) { flags.push({ at: [(random() - 0.5) * 0.2, y, z], size: [1.1, 0.5, 0.01], turn: (random() - 0.5) * 0.3, colour: pick([era.second, era.accent === '#1c1c20' ? '#e8201c' : era.accent, '#f5cb1c']) }); flags.push({ at: [0, y + 0.03, z + 0.012], size: [0.8, 0.16, 0.01], colour: '#fff6d0' }); }
      add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.8 }), flags));
      box([0.01, 0.01, LEN], [0, y + 0.26, MID], std('#888'));
    } else if (a.overhead === 'mirror') {
      const dome = add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std('#c8d4dc', { metalness: 1, roughness: 0.08, emissive: doorTint, emissiveIntensity: 0.25 })));
      const y = warehouse ? 4.2 : CEIL;
      dome.position.set(0.9, y, 1.2);
      if (warehouse) box([0.02, CEIL - y, 0.02], [0.9, (CEIL + y) / 2, 1.2], std('#30343a'));
      const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 28).rotateX(Math.PI / 2), std('#22262a'))); rim.position.copy(dome.position);
    }

    // State dressing along the walls, clear of where the cast stands.
    const spots = [[1, 5.2], [-1, 6.0], [-1, -0.6], [1, -4.2], [1, -7.2], [-1, -8.4], [1, -12], [-1, -11.6]] as const;
    if (restock) {
      for (const [side, z] of spots) {
        if (random() < 0.3) continue;
        const frozen = random() < 0.5, cols = 1 + Math.floor(random() * 2), x = side * (HALF - 0.36);
        for (let c = 0; c < cols; c++) { const stack = 1 + Math.floor(random() * mix(2, 5, mood.density)); for (let k = 0; k < stack; k++) { crates.push({ at: [x + (random() - 0.5) * 0.04, 0.15 + k * 0.3, z - c * 0.52], size: [0.42, 0.29, 0.48], turn: (random() - 0.5) * 0.1, colour: frozen ? pick(['#eef2f4', '#e4eaee']) : pick(['#b88a54', '#c29660', '#ad8250']) }); crates.push({ at: [x - side * 0.212, 0.15 + k * 0.3, z - c * 0.52], size: [0.004, 0.12, 0.3], colour: frozen ? '#2a7ad0' : '#f4f1e6' }); } }
      }
      for (let i = 0; i < 4; i++) crates.push({ at: [(random() < 0.5 ? -1 : 1) * (HALF - 0.5 - random() * 0.3), 0.006, 6.5 - i * 3.6 - random()], size: [0.6, 0.012, 0.85], turn: random() * 3, colour: '#b88a54' });
    } else if (storm) {
      for (let i = 0; i < 9; i++) { const side = random() < 0.5 ? -1 : 1; crates.push({ at: [side * (HALF - 0.25 - random() * 0.4), 0.03, 7 - i * 2.1 - random()], size: [0.2, 0.05, 0.26], turn: random() * 3, colour: pick(GOODS[i % GOODS.length]) }); }
      crates.push({ at: [HALF - 0.4, 0.2, 5.4], size: [0.5, 0.4, 0.4], turn: 0.3, colour: '#b88a54' });
    } else if (!power) {
      const melt = std('#8a9aa4', { roughness: 0.04, metalness: 0.5, transparent: true, opacity: 0.75 });
      for (const [side, z] of spots) { const blob = add(new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), melt)); blob.position.set(side * (HALF - 0.15), 0.005, z + random()); blob.scale.set(0.22 + random() * 0.2, 1, 0.7 + random() * 1.2); }
    }
    add(instances(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.8 }), crates, true));

    // Light: a soft wash, the tubes as key, the doors from both sides, and the hero's own pool.
    add(new THREE.HemisphereLight(tubeTint.clone().lerp(doorTint, 0.4).lerp(new THREE.Color('#8fa4d8'), a.hour === 'three' || !power ? 0.45 : 0), new THREE.Color(era.floorA).multiplyScalar(0.7), 0.95 * amb));
    const key = new THREE.DirectionalLight(power ? tubeTint : new THREE.Color('#aab8c8'), (a.hour === 'three' ? 0.42 : night ? 0.75 : 1.5) * (power ? 1 : 0.45));
    key.position.set(-2.2, 10, 7); key.target.position.set(0, 0, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = 0.03; key.shadow.bias = -0.0004;
    const cam = key.shadow.camera; cam.left = -4; cam.right = 4; cam.bottom = -14; cam.top = 10; cam.near = 1; cam.far = 30; cam.updateProjectionMatrix();
    add(key); add(key.target);
    const doorLights: THREE.DirectionalLight[] = [];
    if (power) for (const side of [-1, 1]) { const light = new THREE.DirectionalLight(doorTint, night ? 0.85 : 0.4); light.position.set(side * 5, 1.4, 1); light.target.position.set(0, 1, 0); add(light); add(light.target); doorLights.push(light); }
    const spot = new THREE.SpotLight(power ? doorTint : '#ffd9a0', power ? 22 : 12, 9, 0.6, 0.9, 1.3);
    spot.position.set(SLOTS[0].x - (power ? 1.4 : -0.6), Math.min(CEIL - 0.2, 3.2), SLOTS[0].z + (power ? 0.6 : -3)); spot.target.position.set(SLOTS[0].x, 0.6, SLOTS[0].z);
    add(spot); add(spot.target);
    const back = new THREE.DirectionalLight(endLight, a.hour === 'dawn' && a.end === 'windows' ? 0.9 : power ? 0.3 : 0.55);
    back.position.set(0.5, 2.2, -14); back.target.position.set(0, 1, 2); add(back); add(back.target);
    const front = new THREE.DirectionalLight('#e6ecf6', 0.38 * amb); front.position.set(1, 2.4, 12); add(front);
    const heroPool = plane(3.2, 3.2, [SLOTS[0].x, 0.01, SLOTS[0].z], new THREE.MeshBasicMaterial({ map: poolArt, color: power ? doorTint : '#ffe2b0', transparent: true, opacity: 0.4, depthWrite: false }), [-Math.PI / 2, 0, 0]);
    heroPool.renderOrder = 1;

    const views = {
      eye: { at: [0.3, 1.56, 9.2], to: [-0.1, 1.05, -2], fov: 40 },
      low: { at: [0.55, 0.6, 8.4], to: [-0.15, 1.15, 0], fov: 46 },
      cctv: { at: [1.45, Math.min(CEIL - 0.25, 3.3), 8.8], to: [-0.3, 0.5, 0.8], fov: 46 },
      glass: { at: [1.5, 1.5, 8.2], to: [-0.6, 1.0, 1.2], fov: 46 },
    } as const;
    const view = views[a.view];
    const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.3, 90);
    camera.position.set(view.at[0], view.at[1], view.at[2]);
    camera.lookAt(view.to[0], view.to[1], view.to[2]);

    const place = (items: readonly Placeable[]) => {
      items.forEach((item, i) => {
        const slot = SLOTS[i % SLOTS.length];
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        const fit = Math.min(slot.h / height, slot.r / radius);
        // True size when it fits the aisle; shrunk to fit when it does not; small things grow a little to hold the frame.
        const scale = Math.min(fit, Math.max(1, Math.min(slot.min / height, 3)));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, 0, slot.z);
        item.holder.rotation.y = slot.turn + (context.random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      });
      camera.updateMatrixWorld(true);
    };

    const pace = mix(0.5, 2.2, mood.energy);
    return {
      object: root, camera, background, capacity: SLOTS.length, ground: floor, keyLight: key, place,
      update(_dt, time) {
        tubes.forEach((tube, i) => {
          let on = 0.975 + 0.025 * Math.sin(time * 55 + i);
          if (tube.stutter) { const n = Math.sin(time * 31 * pace + i * 7) * Math.sin(time * 7.3 * pace + i) + Math.sin(time * 2.1 + i * 3) * 0.6; on = n > 0.7 ? 0.15 : 1; }
          tube.material.emissiveIntensity = tube.base * on;
          if (tube.pool) tube.pool.opacity = mix(0.1, 0.5, gloss) * on;
        });
        flickMats.forEach((material, i) => { const n = Math.sin(time * 27 * pace + i * 5) * Math.sin(time * 5.1 * pace + i * 2) + 0.5 * Math.sin(time * 1.7 + i); material.opacity = n > 0.45 ? 0.75 : 0; });
        const hum = 1 + 0.015 * Math.sin(time * 2.3);
        for (const material of glowMats) material.opacity = doorGlow * hum;
        for (const light of doorLights) light.intensity = (night ? 0.85 : 0.4) * hum;
        hazeMats.forEach((material, i) => { material.opacity = hazeLevel * (1 + 0.12 * Math.sin(time * 0.3 * pace + i * 1.3)); });
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
