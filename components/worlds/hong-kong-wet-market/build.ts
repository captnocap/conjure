import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

type V3 = [number, number, number];
interface Item { p: V3; s: V3; c: THREE.ColorRepresentation; r?: number; tilt?: number }

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const PITCH = 2.6, FRONT = 1.5, WALL = 3.5, NEAR = 10.5, FAR = -15;
const BAYS = [5.0, 2.4, -0.2, -2.8, -5.4, -8.0, -10.6, -13.2];
const SLOTS = [
  { x: -1.15, z: 3.2, r: 1.2, h: 2.1, turn: 0.6, side: 0, bay: -1 },
  { x: 1.9, z: -0.2, r: 1.25, h: 2.3, turn: -0.85, side: 1, bay: 2 },
  { x: -1.9, z: -2.8, r: 1.25, h: 2.3, turn: 0.85, side: -1, bay: 3 },
  { x: 1.9, z: -5.4, r: 1.25, h: 2.3, turn: -0.85, side: 1, bay: 4 },
  { x: 1.1, z: 5.1, r: 0.5, h: 1.0, turn: -0.5, side: 0, bay: -1 },
] as const;

export default defineWorld({
  questions: {
    cover: choice('What covers the lane?', {
      tarps: 'A street market: patched red-white-blue tarps and canvas awnings sagging between tenements, a strip of sky down the middle.',
      hall: 'A municipal market hall: low concrete ceiling, fluorescent tubes, ceiling fans and pipes.',
      tin: 'A corrugated tin roof on steel trusses with bright skylight strips.',
    }),
    hour: choice('What moment of the market day is it?', {
      setup: 'Before dawn: half the shutters still down, deliveries stacked in the aisle, the first lamps on.',
      rush: 'The morning rush: every stall open, every lamp lit, goods spilling into the aisle.',
      lull: 'Late morning lull: picked over, gaps on the counters, a few stalls already shutting.',
      closing: 'Closing: shutters coming down, crates stacked, the floor being flooded clean.',
    }),
    trade: choice('What do the stalls along the lane mostly sell?', {
      fish: 'Fish: sloped trays of ice and silver, polystyrene boxes everywhere.',
      greens: 'Vegetables: stepped heaps of green, orange and white in baskets.',
      meat: 'Meat: rails of red and pink cuts over tiled counters.',
      dried: 'Dried goods: sacks of mushrooms, shrimp and beans, shelves of jars.',
      mixed: 'Everything, stall by stall.',
    }),
    floor: choice('What is the floor?', {
      quarry: 'Small red-brown quarry tiles, glossy with water.',
      mosaic: 'Old cream and green mosaic, cracked and patched.',
      concrete: 'Bare grooved concrete, dark where it is wet.',
    }),
    lamps: choice('How are the red lamps?', {
      blazing: 'Every one lit, a tunnel of red glare.',
      patchy: 'Lit stall by stall, dark stretches between.',
      few: 'Only a handful on, the rest cold red plastic.',
    }),
    end: choice('What is at the far end of the lane?', {
      street: 'Daylight: the lane opens onto a bright street of tower blocks.',
      deeper: 'More market, dissolving into steam and lamp dots.',
      shrine: 'A dead end: a shuttered wall with a small red shrine glowing at its foot.',
      truck: 'A delivery truck backed up to the lane, doors open, tail lights on.',
    }),
    aisle: choice('What has been left in the aisle?', {
      trolley: 'A grandmother’s plaid shopping trolley, parked while she argues about a fish.',
      delivery: 'A sack truck stacked with polystyrene boxes.',
      hose: 'A green hose snaking down the middle, still running.',
      cat: 'The market cat, sitting on an upturned crate, watching the fish.',
      nothing: 'Nothing. A clear run down the lane.',
    }),
    view: choice('Where are we standing?', {
      eye: 'In the mouth of the lane at eye level.',
      low: 'Low, at basket height, the lamps and signs towering.',
      high: 'Raised, as if from a step or a footbridge, looking down the lane.',
    }),
    bayMarkers: choice('How are the market bays numbered?', { none: 'No separate bay markers.', enamel: 'Small blue enamel number plates on the front posts.', round: 'Round cream number discs.', hanging: 'Narrow numbered boards hanging beside each opening.' }),
    drainCover: choice('What covers the lane drain?', { slots: 'The usual slotted metal cover.', bars: 'Heavy transverse grate bars.', plates: 'Square steel access plates along the channel.', stone: 'Pale stone covers with narrow joints.' }),
    overheadUtility: choice('What service line runs above the stalls?', { none: 'No additional line.', cable: 'A supported black cable tray.', pipes: 'Twin painted water pipes with valve boxes.', duct: 'A broad metal ventilation duct.' }),
    entranceFrame: choice('What frames the market entrance?', { open: 'An open mouth to the lane.', posts: 'Two square tiled entrance piers.', roller: 'A rolled shutter overhead between narrow posts.', folding: 'Folded lattice gates at the two sides.' }),
    threshold: choice('How is the entry floor marked?', { plain: 'The same floor continues out.', stripe: 'A faded yellow line across the entrance.', chevrons: 'Two striped corner panels leave the centre clear.', mosaic: 'A broad cream mosaic threshold.' }),
    wallServices: choice('What fittings serve the stall row?', { plain: 'Unadorned wall panels.', taps: 'Wall taps over small wash basins.', meters: 'Electric meter boxes and vertical conduits.', vents: 'Louvred extraction grilles high on the walls.' }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const flat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: V3, cast = false, parent: THREE.Object3D = root) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at); m.castShadow = cast; m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const box = (size: V3, at: V3, material: THREE.Material | THREE.Material[], cast = false, parent: THREE.Object3D = root) => mesh(new THREE.BoxGeometry(...size), material, at, cast, parent);
    const wearTint = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#857c6c'), mood.wear * 0.25);
    const glyph = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      // Brush strokes arranged the way characters are: bars, uprights, a box, two falling sweeps.
      ctx.lineWidth = size * 0.11; ctx.lineCap = 'square';
      const line = (x0: number, y0: number, x1: number, y1: number) => { ctx.beginPath(); ctx.moveTo(x + x0 * size, y + y0 * size); ctx.lineTo(x + x1 * size, y + y1 * size); ctx.stroke(); };
      const bars = 2 + Math.floor(random() * 2);
      for (let i = 0; i < bars; i++) { const h = 0.12 + (i / bars) * 0.75 + random() * 0.08, inset = random() * 0.2; line(0.08 + inset, h, 0.92 - inset * random(), h - 0.03); }
      line(0.3 + random() * 0.4, 0.05, 0.3 + random() * 0.4, 0.95);
      if (random() < 0.6) { const bx = random() < 0.5 ? 0.1 : 0.52, by = 0.15 + random() * 0.4; ctx.strokeRect(x + bx * size, y + by * size, size * 0.36, size * 0.3); }
      if (random() < 0.7) { line(0.5, 0.45, 0.1, 0.95); line(0.5, 0.45, 0.92, 0.93); }
    };

    const dawn = new THREE.Color('#c9d3d8'), noon = new THREE.Color('#e9e6dc'), dusk = new THREE.Color('#ecd6c2');
    const sky = mood.daylight < 0.5 ? dawn.clone().lerp(noon, mood.daylight * 2) : noon.clone().lerp(dusk, (mood.daylight - 0.5) * 2);
    const background = sky.clone().lerp(new THREE.Color('#f2e2d6'), mood.warmth * 0.25);
    const open = { setup: 0.62, rush: 1, lull: 0.8, closing: 0.35 }[a.hour];
    const stock = { setup: 0.55, rush: 1, lull: 0.45, closing: 0.2 }[a.hour] * mix(0.75, 1, mood.density);
    const wetness = { setup: 0.5, rush: 0.65, lull: 0.4, closing: 1 }[a.hour];

    // Lights.
    root.add(new THREE.HemisphereLight(a.lamps === 'few' ? '#f6f6f2' : '#fff0ea', a.lamps === 'blazing' ? '#a8807a' : '#8a7f78', a.cover === 'hall' ? 1.5 : 1.7));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.4, 0.9), 2.1);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.04; key.shadow.bias = -0.0004;
    key.position.set(mix(-5, 5, mood.daylight), 13, 9);
    key.target.position.set(0, 0, -1);
    const shadow = key.shadow.camera;
    shadow.left = -9; shadow.right = 9; shadow.top = 12; shadow.bottom = -12; shadow.near = 1; shadow.far = 40;
    shadow.updateProjectionMatrix();
    root.add(key, key.target);

    // Floor.
    const palette = { quarry: ['#a8553e', '#9a4a36', '#b56248', '#8e4433'], mosaic: ['#e6dcc0', '#dcd2b4', '#6f9a80', '#ece4cc', '#5f8a70'], concrete: ['#8f918c', '#898b86', '#94968f'] }[a.floor];
    const floorArt = paint(256, 256, (ctx) => {
      ctx.fillStyle = a.floor === 'concrete' ? '#7c7e79' : '#5a504a'; ctx.fillRect(0, 0, 256, 256);
      const n = a.floor === 'mosaic' ? 32 : a.floor === 'quarry' ? 16 : 2, size = 256 / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { ctx.fillStyle = pick(palette); ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2); }
      if (a.floor === 'concrete') { ctx.fillStyle = 'rgba(40,40,38,0.3)'; for (let y = 0; y < 256; y += 8) ctx.fillRect(0, y, 256, 1.5); }
      for (let i = 0; i < 30 + mood.wear * 120; i++) { ctx.fillStyle = `rgba(40,32,28,${random() * 0.2})`; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 4 + random() * 26, 3 + random() * 12, random() * 3, 0, 7); ctx.fill(); }
    });
    floorArt.wrapS = floorArt.wrapT = THREE.RepeatWrapping;
    floorArt.repeat.set((WALL * 2) / 1.6, (NEAR - FAR) / 1.6);
    const floor = mesh(new THREE.PlaneGeometry(WALL * 2, NEAR - FAR).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorArt, roughness: mix(0.5, 0.16, wetness), metalness: 0.12 }), [0, 0, (NEAR + FAR) / 2]);
    // Drain channel down the middle.
    const drainArt = paint(32, 64, (ctx) => { ctx.fillStyle = '#3a3d3c'; ctx.fillRect(0, 0, 32, 64); ctx.fillStyle = '#16181a'; for (let y = 4; y < 64; y += 16) ctx.fillRect(5, y, 22, 8); });
    drainArt.wrapT = THREE.RepeatWrapping; drainArt.repeat.set(1, (NEAR - FAR) / 0.4);
    mesh(new THREE.PlaneGeometry(0.2, NEAR - FAR).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: drainArt, roughness: 0.4, metalness: 0.4 }), [-0.15, 0.004, (NEAR + FAR) / 2]);
    // Standing water.
    const waterMaterial = new THREE.MeshStandardMaterial({ color: sky.clone().multiplyScalar(0.8), roughness: 0.03, metalness: 0.7, transparent: true, opacity: 0.26, depthWrite: false });
    for (let i = 0; i < Math.round(mix(4, 16, wetness)); i++) {
      const puddle = mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), waterMaterial, [(random() - 0.5) * 2.6, 0.006, mix(8, -12, random())]);
      puddle.scale.set(0.2 + random() * 0.4, 1, 0.3 + random() * 0.8); puddle.receiveShadow = false;
    }
    if (a.hour === 'closing') { const sheet = mesh(new THREE.PlaneGeometry(2.6, 14).rotateX(-Math.PI / 2), waterMaterial, [0, 0.007, 0]); sheet.receiveShadow = false; }

    // Side walls: tile below, tenement or plain wall above.
    const wallArt = paint(512, 1024, (ctx) => {
      ctx.fillStyle = a.cover === 'tarps' ? '#c9c2b4' : '#d6d3c8'; ctx.fillRect(0, 0, 512, 1024);
      if (a.cover === 'tarps') {
        // 10 m of facade over 5.2 m of lane: windows, air conditioners, pipes, stains.
        for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
          const x = 40 + col * 160, y = 40 + row * 165;
          ctx.fillStyle = pick(['#4f6a74', '#5d7a80', '#3f5560', '#e8d9a0']); ctx.fillRect(x, y, 100, 90);
          ctx.strokeStyle = '#8a8f8a'; ctx.lineWidth = 4; ctx.strokeRect(x, y, 100, 90); ctx.beginPath(); ctx.moveTo(x + 50, y); ctx.lineTo(x + 50, y + 90); ctx.stroke();
          if (random() < 0.6) { ctx.fillStyle = '#b9bcb4'; ctx.fillRect(x + 10, y + 96, 60, 34); ctx.fillStyle = '#7d817a'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 14, y + 100 + k * 6, 52, 2); }
          ctx.fillStyle = 'rgba(70,60,50,0.18)'; ctx.fillRect(x + 20 + random() * 40, y + 130, 10 + random() * 14, 40 + random() * 40);
        }
        ctx.fillStyle = '#8a8d86'; ctx.fillRect(18, 0, 8, 680); ctx.fillRect(490, 0, 6, 680);
      }
      // Bottom 3.4 m: white tile with a coloured band.
      const top = 1024 - 348;
      ctx.fillStyle = '#6d7270'; ctx.fillRect(0, top, 512, 348);
      for (let y = top; y < 1024; y += 16) for (let x = 0; x < 512; x += 16) { ctx.fillStyle = y > top + 180 && y < top + 215 ? '#3f8a6a' : pick(['#f1f0e8', '#e9e8de', '#f5f4ee']); ctx.fillRect(x + 1, y + 1, 14, 14); }
      for (let i = 0; i < mood.wear * 90; i++) { ctx.fillStyle = `rgba(80,60,40,${random() * 0.18})`; ctx.fillRect(random() * 512, top + random() * 348, 6 + random() * 30, 10 + random() * 60); }
    });
    wallArt.wrapS = THREE.RepeatWrapping; wallArt.repeat.set((NEAR - FAR) / 5.2, 1);
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallArt, roughness: 0.75 });
    const WALL_H = 10;
    for (const side of [-1, 1]) mesh(new THREE.PlaneGeometry(NEAR - FAR, WALL_H).rotateY(-side * Math.PI / 2), wallMaterial, [side * WALL, WALL_H / 2, (NEAR + FAR) / 2]);

    // Everything small is gathered into two instanced meshes.
    const cubes: Item[] = [], balls: Item[] = [];
    const steel = flat('#aeb4b6', { metalness: 0.6, roughness: 0.45 });
    const crateColours = ['#c9372c', '#2f6fb3', '#e0a52a', '#3f9a5a', '#d6622c'];
    const foamStack = (x: number, z: number, count: number, y0 = 0) => { let x1 = x, z1 = z; for (let i = 0; i < count; i++) { x1 += (random() - 0.5) * 0.05; z1 += (random() - 0.5) * 0.05; cubes.push({ p: [x1, y0 + 0.135 + i * 0.275, z1], s: [0.58, 0.265, 0.4], c: pick(['#f4f4ef', '#ecece6', '#f8f8f4']), r: (random() - 0.5) * 0.25 }); cubes.push({ p: [x1, y0 + 0.245 + i * 0.275, z1], s: [0.6, 0.045, 0.42], c: '#fbfbf8', r: cubes.at(-1)!.r }); } };
    const crateStack = (x: number, z: number, count: number) => { for (let i = 0; i < count; i++) { const c = pick(crateColours), r = (random() - 0.5) * 0.3; cubes.push({ p: [x, 0.14 + i * 0.285, z], s: [0.56, 0.27, 0.4], c, r }); cubes.push({ p: [x, 0.14 + i * 0.285, z], s: [0.5, 0.12, 0.41], c: '#2a2020', r }); } };

    const shutterArt = paint(128, 256, (ctx) => { ctx.fillStyle = '#9aa0a0'; ctx.fillRect(0, 0, 128, 256); for (let y = 0; y < 256; y += 10) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, y, 128, 3); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, y + 6, 128, 3); } ctx.fillStyle = '#c21f1f'; ctx.font = '900 22px sans-serif'; ctx.textAlign = 'center'; ctx.save(); ctx.scale(1, 0.6); ctx.fillText(pick(['A12', 'B7', '38', 'C4', '21']), 64, 150); ctx.restore(); });
    const shutterMaterial = new THREE.MeshStandardMaterial({ map: shutterArt, roughness: 0.5, metalness: 0.4 });
    const tiled = (colours: string[]) => { const map = paint(64, 64, (ctx) => { ctx.fillStyle = '#6d7270'; ctx.fillRect(0, 0, 64, 64); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = pick(colours); ctx.fillRect(x * 16 + 1, y * 16 + 1, 14, 14); } }); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(9, 3); return new THREE.MeshStandardMaterial({ map, color: wearTint('#ffffff'), roughness: 0.45 }); };
    const counterMaterials = [tiled(['#f1f0e8', '#e9e8de', '#f5f4ee']), flat('#b9c0c2', { metalness: 0.6, roughness: 0.4 }), tiled(['#4f8d6a', '#458060', '#e9e2c6', '#5a9a74']), tiled(['#e4d8b8', '#dccfae', '#c9b78e'])];
    const slotBays = new Map<string, number>();
    SLOTS.forEach((slot, index) => { if (slot.bay >= 0) slotBays.set(`${slot.side}:${slot.bay}`, index); });

    const signArts = Array.from({ length: 6 }, (_u, i) => {
      const vertical = i % 2 === 0;
      const [bg, ink] = pick([['#c21f1f', '#f8e7a0'], ['#f3ead0', '#c21f1f'], ['#f2c21a', '#b01818'], ['#1f6a4a', '#f6efd4'], ['#f6f3ea', '#1f3f8a'], ['#b01818', '#ffffff']] as const);
      return paint(vertical ? 128 : 384, vertical ? 384 : 128, (ctx) => {
        ctx.fillStyle = bg; ctx.fillRect(0, 0, 384, 384);
        ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.strokeRect(6, 6, (vertical ? 128 : 384) - 12, (vertical ? 384 : 128) - 12);
        for (let g = 0; g < 3; g++) glyph(ctx, vertical ? 22 : 30 + g * 115, vertical ? 26 + g * 115 : 22, 86);
      });
    });
    const cardArts = Array.from({ length: 5 }, () => paint(128, 96, (ctx) => {
      const yellow = random() < 0.35;
      ctx.fillStyle = yellow ? '#f3ee3a' : pick(['#f7f5ee', '#f3e9c8', '#fbe3e0']); ctx.fillRect(0, 0, 128, 96);
      ctx.strokeStyle = ctx.fillStyle = yellow ? '#16181c' : '#d01f26';
      glyph(ctx, 8, 6, 34); glyph(ctx, 48, 6, 34);
      ctx.font = '900 46px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(pick(['$18', '$25', '$38', '$6', '$12', '$88', '$3']), 64, 86, 120);
    }));
    const cardMaterials = cardArts.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide }));
    const signMaterials = signArts.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.12 }));

    const produce = { greens: ['#4f9a3a', '#6ab04a', '#3f7f34', '#8fc060', '#e9ead8', '#e88a2a', '#7a3a7a', '#d6322c'], dried: ['#8a5a30', '#c9a45a', '#5a3a22', '#d8862a', '#b0342a', '#e6d8a8'] };
    const trades = ['fish', 'greens', 'meat', 'dried'] as const;
    const fishColours = ['#cfd6da', '#b9c3ca', '#d8452c', '#e0b63a', '#3f7f8c', '#e3e8ea'];

    const fillers: THREE.Group[] = [], stands: THREE.Group[] = [];
    for (const side of [-1, 1]) BAYS.forEach((z0, bay) => {
      const X = (x: number) => side * x;
      // Posts and the stall back.
      box([0.07, 3.1, 0.07], [X(FRONT), 1.55, z0 + PITCH / 2], steel, true);
      const slotIndex = slotBays.get(`${side}:${bay}`);
      const trade = a.trade === 'mixed' ? pick(trades) : random() < 0.8 ? a.trade : pick(trades);
      const shut = slotIndex === undefined && random() > open;
      // Stall name board along the top of the bay.
      const board = mesh(new THREE.PlaneGeometry(PITCH - 0.2, 0.45).rotateY(-side * Math.PI / 2), signMaterials[1 + 2 * Math.floor(random() * 3)], [X(FRONT + 0.02), 3.02, z0]);
      board.castShadow = false;
      if (shut) {
        mesh(new THREE.PlaneGeometry(PITCH - 0.08, 2.8).rotateY(-side * Math.PI / 2), shutterMaterial, [X(FRONT + 0.04), 1.4, z0], true);
        if (bay > 1 && random() < 0.7) crateStack(X(FRONT - 0.3), z0 + (random() - 0.5) * 1.4, 1 + Math.floor(random() * 4));
        if (bay > 1 && random() < 0.5) foamStack(X(FRONT - 0.32), z0 + (random() - 0.5) * 1.4, 1 + Math.floor(random() * 3));
        return;
      }
      // Dim interior behind every open stall.
      mesh(new THREE.PlaneGeometry(PITCH, 1.2).rotateY(-side * Math.PI / 2), flat('#6f6a62'), [X(WALL - 0.03), 2.6, z0]);
      box([0.04, 0.04, PITCH], [X(2.6), 2.2, z0], steel);
      if (slotIndex !== undefined) {
        // A cleared bay for the cast, with something modest to show if nobody takes it.
        const filler = new THREE.Group();
        const fx = X(2.2);
        const cm = pick(counterMaterials);
        box([1.2, 0.8, PITCH - 0.5], [fx, 0.4, z0], cm, true, filler);
        box([1.26, 0.04, PITCH - 0.44], [fx, 0.82, z0], steel, true, filler);
        for (let i = 0; i < 3; i++) box([0.55, 0.26, 0.4], [fx + (random() - 0.5) * 0.3, 0.97 + (i > 1 ? 0.27 : 0), z0 - 0.6 + (i % 2) * 1.1], flat(pick(['#f4f4ef', ...crateColours])), true, filler);
        root.add(filler);
        fillers[slotIndex] = filler;
        const stand = new THREE.Group();
        box([0.6, 0.3, 0.44], [0, 0.15, 0], flat(pick(crateColours)), true, stand);
        box([0.6, 0.3, 0.44], [0, 0.45, 0], flat(pick(crateColours)), true, stand).rotation.y = 0.15;
        box([0.9, 0.04, 0.7], [0, 0.62, 0], flat('#b9966a'), true, stand);
        stand.visible = false;
        root.add(stand);
        stands[slotIndex] = stand;
        return;
      }
      // An open, dressed stall.
      const cx = X(2.1), depth = 1.15, top = 0.78;
      box([depth, top, PITCH - 0.3], [cx, top / 2, z0], pick(counterMaterials), true);
      const rows = Math.round(mix(1, 4, stock));
      if (trade === 'fish') {
        const slab = box([depth, 0.1, PITCH - 0.36], [cx, top + 0.12, z0], flat('#eef5f7', { roughness: 0.35 }), true);
        slab.rotation.z = side * 0.22;
        for (let i = 0; i < 26 * stock; i++) {
          const u = random() - 0.5, v = random() - 0.5;
          balls.push({ p: [cx + u * (depth - 0.15), top + 0.2 - side * u * (depth - 0.15) * 0.22 + 0.02, z0 + v * (PITCH - 0.6)], s: [0.15 + random() * 0.08, 0.028, 0.045 + random() * 0.03], c: pick(fishColours), r: (random() - 0.5) * 0.5 });
        }
        foamStack(X(FRONT - 0.28), z0 + (random() - 0.5) * 1.2, Math.round(random() * 3 * stock + 0.4));
        if (random() < 0.6) cubes.push({ p: [X(FRONT - 0.2), 0.15, z0 + 0.8 * (random() < 0.5 ? -1 : 1)], s: [0.45, 0.3, 0.45], c: '#2a72c4' });
      } else if (trade === 'greens') {
        for (let step = 0; step < 3; step++) {
          const sx = cx + side * (step - 1) * 0.36, sy = top + step * 0.2;
          cubes.push({ p: [sx, sy - 0.02 + 0.1, z0], s: [0.36, 0.2, PITCH - 0.4], c: pick(['#b9966a', '#8a6a48', ...crateColours]) });
          if (step >= rows) continue;
          for (let k = 0; k < 5; k++) {
            const colour = pick(produce.greens), zc = z0 - 0.95 + k * 0.47;
            for (let i = 0; i < 7; i++) balls.push({ p: [sx + (random() - 0.5) * 0.24, sy + 0.2 + random() * 0.09, zc + (random() - 0.5) * 0.32], s: [0.07, 0.06, 0.07].map((v) => v * mix(0.8, 1.3, random())) as V3, c: new THREE.Color(colour).offsetHSL(0, 0, (random() - 0.5) * 0.08) });
          }
        }
        for (let k = 0; k < 2 * stock; k++) { const bx = X(FRONT - 0.3), bz = z0 - 0.7 + k * 1.2; cubes.push({ p: [bx, 0.16, bz], s: [0.5, 0.32, 0.5], c: pick(crateColours) }); for (let i = 0; i < 9; i++) balls.push({ p: [bx + (random() - 0.5) * 0.36, 0.34 + random() * 0.06, bz + (random() - 0.5) * 0.36], s: [0.08, 0.07, 0.08], c: pick(produce.greens) }); }
      } else if (trade === 'meat') {
        box([0.03, 0.03, PITCH - 0.2], [X(FRONT + 0.25), 2.25, z0], steel);
        for (let i = 0; i < Math.round(8 * stock); i++) {
          const length = 0.3 + random() * 0.35;
          cubes.push({ p: [X(FRONT + 0.25), 2.15 - length / 2, z0 - 1.05 + i * 0.3 + (random() - 0.5) * 0.06], s: [0.06, length, 0.14 + random() * 0.1], c: pick(['#c2504e', '#e39a92', '#a81d1a', '#8e3a12', '#f0d8c8', '#b03030']), r: (random() - 0.5) * 0.4 });
        }
        for (let i = 0; i < 6 * stock; i++) cubes.push({ p: [cx + (random() - 0.5) * 0.7, top + 0.05, z0 + (random() - 0.5) * 1.8], s: [0.3, 0.08, 0.2], c: pick(['#c2504e', '#e39a92', '#f0d8c8']), r: random() * 3 });
        cubes.push({ p: [cx - side * 0.2, top + 0.07, z0 + 0.7], s: [0.4, 0.14, 0.4], c: '#c79a62', r: 0.4 });
      } else {
        for (let k = 0; k < 4; k++) {
          const sx = X(FRONT + 0.3 + (k % 2) * 0.5), sz = z0 - 0.9 + k * 0.6, colour = pick(produce.dried);
          cubes.push({ p: [sx, 0.3 + top * 0, sz], s: [0.42, 0.6, 0.42], c: pick(['#b99a6a', '#a88a5a', '#c9b27c']), r: random() });
          if (k < rows + 1) for (let i = 0; i < 8; i++) balls.push({ p: [sx + (random() - 0.5) * 0.28, 0.62 + random() * 0.07, sz + (random() - 0.5) * 0.28], s: [0.07, 0.05, 0.07], c: new THREE.Color(colour).offsetHSL(0, 0, (random() - 0.5) * 0.1) });
        }
        for (let shelf = 0; shelf < 3; shelf++) {
          cubes.push({ p: [X(WALL - 0.25), 1.2 + shelf * 0.45, z0], s: [0.3, 0.03, PITCH - 0.4], c: '#8a6a48' });
          for (let i = 0; i < 8 * stock; i++) cubes.push({ p: [X(WALL - 0.25), 1.32 + shelf * 0.45, z0 - 1 + i * 0.27 + random() * 0.05], s: [0.14, 0.22, 0.14], c: pick(['#c9a45a', '#b0342a', '#e6d8a8', '#5a3a22', '#d8862a', '#7fa0a8']) });
        }
      }
      // Price cards hung on strings across the stall front.
      const cardCount = Math.round(mix(0.5, 3.2, stock));
      for (let i = 0; i < cardCount; i++) {
        const card = mesh(new THREE.PlaneGeometry(0.3, 0.225), pick(cardMaterials), [X(FRONT + 0.15 + random() * 0.7), 1.55 + random() * 0.45, z0 - 1 + (i + random()) * (2 / cardCount)]);
        card.rotation.set((random() - 0.5) * 0.2, -side * 0.5 + (random() - 0.5) * 0.4, (random() - 0.5) * 0.16);
        box([0.004, 2.2 - card.position.y - 0.1, 0.004], [card.position.x, (2.2 + card.position.y + 0.1) / 2, card.position.z], steel);
      }
      // Overflow into the aisle.
      if (a.hour !== 'closing' && !(side < 0 && bay < 2) && random() < stock * 0.6) (random() < 0.5 ? foamStack : crateStack)(X(FRONT - 0.32), z0 + (random() - 0.5) * 1.6, 1 + Math.floor(random() * 3));
    });
    // Stacks of crates beside the shutters at closing, deliveries before dawn.
    if (a.hour === 'setup') for (let i = 0; i < 4; i++) foamStack((random() < 0.5 ? -1 : 1) * (0.7 + random() * 0.3), mix(-4, -12, random()), 2 + Math.floor(random() * 4));
    if (a.hour === 'closing') for (let i = 0; i < 5; i++) crateStack((random() < 0.5 ? -1 : 1) * (1.0 + random() * 0.2), mix(-6, -13, random()), 3 + Math.floor(random() * 4));

    // Projecting signs, the vertical kind that crowd a Hong Kong street.
    BAYS.forEach((z0, bay) => {
      for (const side of [-1, 1]) {
        if (random() < 0.25) continue;
        const vertical = random() < 0.65;
        const material = signMaterials[(vertical ? 0 : 1) + 2 * Math.floor(random() * 3)];
        const w = vertical ? 0.42 : 1.15, h = vertical ? 1.25 : 0.4;
        const y = a.cover === 'hall' ? 3.1 - h / 2 + random() * 0.2 : 3.5 + random() * (vertical ? 1.3 : 0.7) + (bay % 2) * 0.25;
        const x = side * (WALL - 0.25 - w / 2 - (a.cover === 'hall' ? 0.8 : random() * 0.5));
        const sign = box([w, h, 0.07], [x, y, z0 + PITCH / 2 - 0.2 + (random() - 0.5) * 0.3], [flat('#3a3d3f'), flat('#3a3d3f'), flat('#3a3d3f'), flat('#3a3d3f'), material, material]);
        sign.castShadow = false;
        box([Math.abs(side * WALL - x) + w / 2, 0.035, 0.035], [(x + side * WALL) / 2 - side * w / 4, y + h / 2 - 0.05, sign.position.z], steel);
      }
    });

    // Cover.
    const fans: THREE.Object3D[] = [];
    const glowers: { material: THREE.MeshStandardMaterial; base: number; phase: number }[] = [];
    if (a.cover === 'tarps') {
      const tarpArts = [
        paint(96, 32, (ctx) => { ['#d8322c', '#f3efe2', '#2f5fc2', '#f3efe2'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, 0, 96, 32); }); for (let i = 0; i < 12; i++) { ctx.fillStyle = ['#d8322c', '#f3efe2', '#2f5fc2', '#f3efe2'][i % 4]; ctx.fillRect(i * 8, 0, 8, 32); } }),
        paint(8, 8, (ctx) => { ctx.fillStyle = '#3f8a5a'; ctx.fillRect(0, 0, 8, 8); }),
        paint(8, 8, (ctx) => { ctx.fillStyle = '#e88a2a'; ctx.fillRect(0, 0, 8, 8); }),
        paint(32, 8, (ctx) => { for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#f3efe2' : '#2f6fc2'; ctx.fillRect(i * 8, 0, 8, 8); } }),
        paint(8, 8, (ctx) => { ctx.fillStyle = '#d9d2bc'; ctx.fillRect(0, 0, 8, 8); }),
      ];
      const tarpMaterials = tarpArts.map((map, i) => { map.wrapS = map.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: i === 0 ? 0.3 : 0.22 }); });
      for (const side of [-1, 1]) BAYS.forEach((z0) => {
        const inner = 0.25 + random() * 0.55, lowY = 3.15 + random() * 0.45, highY = 3.9 + random() * 0.5;
        const geometry = new THREE.PlaneGeometry(WALL - inner, PITCH + 0.1, 6, 3);
        const position = geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) { const u = position.getX(i) / (WALL - inner) + 0.5, v = position.getY(i) / PITCH; position.setZ(i, -Math.sin(u * Math.PI) * (0.12 + random() * 0.04) - Math.cos(v * Math.PI) * 0.1); }
        geometry.computeVertexNormals();
        const tarp = mesh(geometry, random() < 0.55 ? tarpMaterials[0] : pick(tarpMaterials), [side * (WALL + inner) / 2, (lowY + highY) / 2, z0]);
        tarp.rotation.set(-Math.PI / 2, side * Math.atan2(highY - lowY, WALL - inner), 0, 'YXZ');
        tarp.rotation.order = 'XYZ'; tarp.rotation.set(-Math.PI / 2, -side * Math.atan2(highY - lowY, WALL - inner), 0);
        tarp.receiveShadow = false;
        box([WALL - inner, 0.03, 0.03], [side * (WALL + inner) / 2, (lowY + highY) / 2 - 0.02, z0 + PITCH / 2], steel).rotation.z = side * Math.atan2(highY - lowY, WALL - inner);
      });
    } else if (a.cover === 'hall') {
      const ceiling = mesh(new THREE.PlaneGeometry(WALL * 2, NEAR - FAR).rotateX(Math.PI / 2), flat('#cfccc2', { emissive: '#fff8e8', emissiveIntensity: 0.06 }), [0, 3.9, (NEAR + FAR) / 2]);
      ceiling.receiveShadow = false;
      BAYS.forEach((z0, bay) => {
        box([WALL * 2, 0.35, 0.3], [0, 3.73, z0 + PITCH / 2], flat('#bdb9ae'));
        const tubeMaterial = new THREE.MeshStandardMaterial({ color: '#f6fbff', emissive: new THREE.Color().setHSL(mix(0.55, 0.12, mood.warmth), 0.6, 0.8), emissiveIntensity: 1.8 });
        glowers.push({ material: tubeMaterial, base: 1.8, phase: random() * 6 });
        for (const x of [-0.9, 0.9]) { box([0.12, 0.05, 1.3], [x, 3.82, z0], flat('#e8e8e2')); box([0.05, 0.035, 1.22], [x, 3.785, z0], tubeMaterial); }
        if (bay % 2 === 0) {
          const fan = new THREE.Group();
          fan.position.set(0, 3.45, z0);
          for (let i = 0; i < 3; i++) { const blade = box([0.7, 0.012, 0.13], [0.38, 0, 0], flat('#e6e2d4'), false, new THREE.Group()); blade.parent!.rotation.y = (i / 3) * Math.PI * 2; fan.add(blade.parent!); }
          mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12), flat('#d8d4c6'), [0, 0, 0], false, fan);
          root.add(fan); fans.push(fan);
          box([0.03, 0.4, 0.03], [0, 3.68, z0], steel);
        }
      });
      for (const x of [-2.8, 2.9]) mesh(new THREE.CylinderGeometry(0.07, 0.07, NEAR - FAR, 8).rotateX(Math.PI / 2), flat(x < 0 ? '#3f8a6a' : '#b9bcb4'), [x, 3.5, (NEAR + FAR) / 2]);
    } else {
      const tinArt = paint(64, 64, (ctx) => { ctx.fillStyle = '#a9b0b0'; ctx.fillRect(0, 0, 64, 64); for (let x = 0; x < 64; x += 8) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, 0, 3, 64); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 5, 0, 2, 64); } for (let i = 0; i < 20 + mood.wear * 60; i++) { ctx.fillStyle = `rgba(140,80,40,${random() * 0.35})`; ctx.fillRect(random() * 64, random() * 64, 3 + random() * 10, 2 + random() * 6); } });
      tinArt.wrapS = tinArt.wrapT = THREE.RepeatWrapping; tinArt.repeat.set(8, 4);
      const tin = new THREE.MeshStandardMaterial({ map: tinArt, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
      const light = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: sky, emissiveIntensity: 1.3, side: THREE.DoubleSide });
      const pitch = 0.3, run = WALL / Math.cos(pitch);
      for (const side of [-1, 1]) {
        const slope = mesh(new THREE.PlaneGeometry(run, NEAR - FAR).rotateX(-Math.PI / 2), tin, [side * WALL / 2, 4.0 + Math.tan(pitch) * WALL / 2, (NEAR + FAR) / 2]);
        slope.rotation.z = -side * pitch; slope.receiveShadow = false;
        const strip = mesh(new THREE.PlaneGeometry(0.5, NEAR - FAR).rotateX(-Math.PI / 2), light, [side * WALL * 0.55, 4.0 + Math.tan(pitch) * WALL * 0.45 - 0.02, (NEAR + FAR) / 2]);
        strip.rotation.z = -side * pitch; strip.receiveShadow = false;
      }
      BAYS.forEach((z0) => {
        const z = z0 + PITCH / 2;
        box([WALL * 2, 0.06, 0.06], [0, 4.0, z], steel);
        for (const side of [-1, 1]) { const rafter = box([run, 0.06, 0.06], [side * WALL / 2, 4.0 + Math.tan(pitch) * WALL / 2, z], steel); rafter.rotation.z = -side * pitch; const web = box([0.04, 0.55, 0.04], [side * WALL * 0.5, 4.27, z], steel); web.rotation.z = side * 0.5; }
      });
    }

    // The red lamps: one pipe rail each side, shades and bulbs instanced.
    const railY = 2.78, lampX = 1.32, drop = 0.42;
    for (const side of [-1, 1]) mesh(new THREE.CylinderGeometry(0.018, 0.018, 21, 6).rotateX(Math.PI / 2), steel, [side * lampX, railY, -3.5]);
    for (const side of [-1, 1]) BAYS.forEach((z0) => box([FRONT - lampX + 0.1, 0.03, 0.03], [side * (lampX + FRONT) / 2, railY, z0 + PITCH / 2], steel));
    const lampSpots: { x: number; y: number; z: number; lit: boolean }[] = [];
    const patch = Array.from({ length: BAYS.length * 2 }, () => random() < 0.55);
    for (const side of [-1, 1]) for (let z = 5.7; z > -13.8; z -= 0.87) {
      const bay = Math.min(BAYS.length - 1, Math.max(0, Math.round((5.0 - z) / PITCH)));
      const lit = a.lamps === 'blazing' ? random() > mood.wear * 0.15 : a.lamps === 'patchy' ? patch[bay * 2 + (side > 0 ? 1 : 0)] : random() < 0.18;
      lampSpots.push({ x: side * (lampX + (random() - 0.5) * 0.08), y: railY - drop - random() * 0.12, z: z + (random() - 0.5) * 0.15, lit });
    }
    const shadeGeometry = new THREE.LatheGeometry([[0.035, 0.17], [0.05, 0.16], [0.09, 0.1], [0.2, 0], [0.205, -0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
    const shadeMaterial = new THREE.MeshStandardMaterial({ color: '#d3202a', roughness: 0.4, emissive: '#b0141c', emissiveIntensity: mix(0.3, 0.6, mood.cheer), side: THREE.DoubleSide });
    const shades = new THREE.InstancedMesh(shadeGeometry, shadeMaterial, lampSpots.length);
    const cords = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), flat('#2a2c2e'), lampSpots.length);
    const litSpots = lampSpots.filter((spot) => spot.lit);
    const bulbMaterial = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: new THREE.Color().setHSL(mix(0.11, 0.05, mood.warmth), 1, 0.6), emissiveIntensity: mix(2, 3.4, mood.cheer) });
    glowers.push({ material: bulbMaterial, base: bulbMaterial.emissiveIntensity, phase: 0 });
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 8), bulbMaterial, Math.max(1, lampSpots.length));
    const pools = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff5a3c', transparent: true, opacity: mix(0.1, 0.22, wetness), depthWrite: false, blending: THREE.AdditiveBlending }), Math.max(1, litSpots.length));
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), dead = new THREE.Color('#6a5a52'), live = new THREE.Color('#ffffff');
    lampSpots.forEach((spot, index) => {
      shades.setMatrixAt(index, matrix.makeTranslation(spot.x, spot.y - 0.17, spot.z));
      shades.setColorAt(index, spot.lit ? live : new THREE.Color('#a86a6a'));
      cords.setMatrixAt(index, matrix.compose(new THREE.Vector3(spot.x, (railY + spot.y) / 2, spot.z), quaternion, new THREE.Vector3(1, railY - spot.y, 1)));
      bulbs.setMatrixAt(index, matrix.makeTranslation(spot.x, spot.y - 0.15, spot.z));
      bulbs.setColorAt(index, spot.lit ? live : dead);
    });
    litSpots.forEach((spot, index) => pools.setMatrixAt(index, matrix.compose(new THREE.Vector3(spot.x * 0.92, 0.009 + index * 0.0002, spot.z + 0.25), quaternion, new THREE.Vector3(0.5, 1, 0.95))));
    pools.count = litSpots.length;
    root.add(shades, cords, bulbs, pools);
    // Unlit bulbs must not glow: the shared material glows, so dead ones are tinted nearly black.
    lampSpots.forEach((spot, index) => { if (!spot.lit) bulbs.setColorAt(index, new THREE.Color('#1a1614')); });

    // Far end.
    const endZ = FAR + 0.6;
    if (a.end === 'street') {
      const glare = mesh(new THREE.PlaneGeometry(WALL * 2, 11), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: background, emissiveIntensity: 1.1 }), [0, 5.5, endZ - 6]);
      glare.receiveShadow = false;
      for (let i = 0; i < 6; i++) { const w = 0.9 + random() * 1.2, h = 4 + random() * 6; box([w, h, 0.2], [-3 + i * 1.2 + random() * 0.4, h / 2, endZ - 5 + random()], flat(new THREE.Color('#aeb8be').lerp(background, 0.4 + random() * 0.3))); }
      box([WALL * 2, 0.02, 6], [0, 0.0, endZ - 3], flat('#b9b6ac'));
      box([1.6, 2.6, 0.4], [1.2, 1.5, endZ - 2.6], flat('#c9372c'));
      box([1.5, 0.5, 0.42], [1.2, 2.0, endZ - 2.6], flat('#dfe6e6'));
    } else if (a.end === 'deeper') {
      box([WALL * 2, 6, 0.2], [0, 3, endZ - 4], flat(background.clone().multiplyScalar(0.92)));
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: '#ff7a5a' }), 26);
      for (let i = 0; i < 26; i++) dots.setMatrixAt(i, matrix.makeTranslation((i % 2 ? 1 : -1) * (0.9 + random() * 0.5), 1.9 + random() * 0.5, endZ - random() * 3.6));
      root.add(dots);
    } else if (a.end === 'shrine') {
      mesh(new THREE.PlaneGeometry(WALL * 2, 3.4), shutterMaterial, [0, 1.7, endZ]);
      box([WALL * 2, 6.6, 0.2], [0, 6.7, endZ - 0.1], flat('#c9c2b4'));
      const shrine = flat('#c21f1f', { emissive: '#ff3a1a', emissiveIntensity: 0.5 });
      box([0.5, 0.55, 0.3], [0.9, 0.28, endZ + 0.2], shrine, true);
      box([0.6, 0.08, 0.4], [0.9, 0.58, endZ + 0.2], flat('#8e1414'), true);
      box([0.3, 0.3, 0.02], [0.9, 0.3, endZ + 0.36], flat('#f2c21a', { emissive: '#f2a01a', emissiveIntensity: 0.8 }));
      for (let i = 0; i < 3; i++) { box([0.012, 0.3, 0.012], [0.82 + i * 0.08, 0.2, endZ + 0.5], flat('#b8442a')); balls.push({ p: [0.82 + i * 0.08, 0.36, endZ + 0.5], s: [0.02, 0.02, 0.02], c: '#ffb040' }); }
      for (let i = 0; i < 3; i++) balls.push({ p: [1.2 + i * 0.09, 0.06, endZ + 0.5], s: [0.05, 0.045, 0.05], c: '#f08a1e' });
    } else {
      box([WALL * 2, 11, 0.2], [0, 5.5, endZ - 7], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: background, emissiveIntensity: 1 }));
      const body = flat('#e9e6dc');
      box([2.3, 2.3, 0.1], [0, 3.55, endZ - 0.4], body);
      for (const side of [-1, 1]) { box([0.1, 2.4, 3], [side * 1.15, 2.3, endZ - 1.9], body, true); const door = box([1.1, 2.3, 0.06], [side * 1.7, 2.3, endZ - 0.1], body, true); door.rotation.y = side * 0.5; box([0.2, 0.14, 0.05], [side * 0.95, 0.95, endZ - 0.38], new THREE.MeshStandardMaterial({ color: '#ff2a1a', emissive: '#ff2a1a', emissiveIntensity: 2.2 })); box([0.3, 0.75, 0.6], [side * 0.9, 0.38, endZ - 1.2], flat('#1c1e20')); }
      box([2.3, 0.14, 3], [0, 1.08, endZ - 1.9], flat('#5a5d5f'));
      box([2.3, 0.1, 3], [0, 3.5, endZ - 1.9], body);
      box([2.2, 2.3, 0.1], [0, 2.3, endZ - 3.3], flat('#6f6a62'));
      for (let i = 0; i < 4; i++) foamStack(-0.75 + i * 0.5, endZ - 1.2 - (i % 2) * 0.5, 1 + Math.floor(random() * 4), 1.15);
      foamStack(-0.5, endZ + 0.6, 3); foamStack(0.3, endZ + 0.9, 2);
    }
    // Steam and haze hanging in the lane.
    const hazeMaterial = new THREE.MeshBasicMaterial({ color: background, transparent: true, opacity: mix(0.18, 0.32, 1 - mood.warmth) * (a.end === 'deeper' ? 1.5 : 1), depthWrite: false });
    for (const z of [-7, -11.5]) mesh(new THREE.PlaneGeometry(WALL * 2, 7), hazeMaterial, [0, 3.5, z]).receiveShadow = false;

    // Left in the aisle.
    const ax = -0.55 + random() * 0.3, az = 0.6 + random() * 1.2;
    if (a.aisle === 'trolley') {
      const plaid = paint(64, 64, (ctx) => { const [c1, c2] = pick([['#b02a2a', '#2a3f7a'], ['#2a5a3a', '#b02a2a'], ['#2a3f7a', '#e0b030']] as const); ctx.fillStyle = c1; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = c2; ctx.globalAlpha = 0.6; for (let i = 0; i < 64; i += 16) { ctx.fillRect(i, 0, 7, 64); ctx.fillRect(0, i, 64, 7); } ctx.globalAlpha = 1; ctx.fillStyle = '#f3efe2'; for (let i = 12; i < 64; i += 16) { ctx.fillRect(i, 0, 1.5, 64); ctx.fillRect(0, i, 64, 1.5); } });
      const g = new THREE.Group();
      box([0.34, 0.56, 0.24], [0, 0.44, 0], new THREE.MeshStandardMaterial({ map: plaid, roughness: 0.9 }), true, g);
      box([0.36, 0.12, 0.26], [0, 0.74, 0.01], new THREE.MeshStandardMaterial({ map: plaid, roughness: 0.9 }), true, g).rotation.x = 0.2;
      for (const x of [-0.17, 0.17]) { box([0.02, 1.0, 0.02], [x, 0.56, -0.14], steel, true, g); const wheel = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12).rotateZ(Math.PI / 2), flat('#26282a'), [x * 1.15, 0.075, -0.12], true, g); wheel.receiveShadow = false; }
      box([0.36, 0.02, 0.02], [0, 1.06, -0.14], flat('#26282a'), true, g);
      box([0.3, 0.02, 0.2], [0, 0.15, 0.02], steel, true, g);
      for (let i = 0; i < 3; i++) box([0.03, 0.3, 0.03], [-0.08 + i * 0.07, 0.9, 0.02], flat(pick(['#4f9a3a', '#6ab04a', '#e9ead8'])), true, g).rotation.z = (i - 1) * 0.25;
      g.position.set(ax, 0, az); g.rotation.set(-0.12, 0.5 + random() * 0.6, 0);
      root.add(g);
    } else if (a.aisle === 'delivery') {
      foamStack(ax, az, 4 + Math.floor(random() * 2), 0.04);
      for (const x of [-0.22, 0.22]) { const rail = box([0.025, 1.4, 0.025], [ax + x, 0.7, az - 0.26], steel, true); rail.rotation.x = -0.06; mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 12).rotateZ(Math.PI / 2), flat('#26282a'), [ax + x * 1.3, 0.11, az - 0.27], true); }
      box([0.5, 0.015, 0.3], [ax, 0.035, az], steel, true);
    } else if (a.aisle === 'hose') {
      const points = Array.from({ length: 9 }, (_u, i) => new THREE.Vector3(-1.2 + Math.sin(i * 1.3) * 0.5 + i * 0.12, 0.022, 4.5 - i * 0.9));
      points[0].set(-1.45, 0.7, 4.9); points[1].set(-1.4, 0.03, 4.6);
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 60, 0.02, 6), flat('#3f9a5a', { roughness: 0.5 }), [0, 0, 0], true);
      const last = points.at(-1)!;
      const spill = mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), waterMaterial, [last.x + 0.1, 0.008, last.z - 0.4]);
      spill.scale.set(0.6, 1, 0.9); spill.receiveShadow = false;
    } else if (a.aisle === 'cat') {
      const fur = flat(pick(['#d98a3a', '#3a3a3c', '#e9e2d2', '#8a8780']), { roughness: 0.95 });
      crateStack(ax, az, 1);
      const cat = new THREE.Group();
      const part = (size: V3, at: V3) => { const m = mesh(new THREE.SphereGeometry(1, 12, 8), fur, at, true, cat); m.scale.set(...size); return m; };
      part([0.1, 0.13, 0.12], [0, 0.13, 0]); part([0.085, 0.1, 0.09], [0, 0.2, 0.05]); part([0.065, 0.06, 0.06], [0, 0.33, 0.08]);
      for (const x of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(0.025, 0.05, 4), fur, [x * 0.035, 0.395, 0.07], true, cat); ear.rotation.z = x * -0.2; part([0.022, 0.07, 0.03], [x * 0.04, 0.07, 0.1]); }
      const tail = mesh(new THREE.TorusGeometry(0.1, 0.016, 6, 12, Math.PI * 1.1).rotateX(Math.PI / 2), fur, [0.03, 0.03, -0.03], true, cat);
      tail.rotation.y = 0.6;
      cat.position.set(ax, 0.285, az); cat.rotation.y = -1.9;
      root.add(cat);
    }

    // Build the two instanced swarms.
    const swarm = (geometry: THREE.BufferGeometry, list: Item[], material: THREE.Material) => {
      const instanced = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
      instanced.count = list.length;
      const euler = new THREE.Euler();
      list.forEach((item, index) => {
        quaternion.setFromEuler(euler.set(0, item.r ?? 0, item.tilt ?? 0));
        instanced.setMatrixAt(index, matrix.compose(new THREE.Vector3(...item.p), quaternion, new THREE.Vector3(...item.s)));
        instanced.setColorAt(index, wearTint('#' + new THREE.Color(item.c).getHexString()));
      });
      quaternion.identity();
      instanced.castShadow = instanced.receiveShadow = true;
      root.add(instanced);
    };
    swarm(new THREE.BoxGeometry(1, 1, 1), cubes, new THREE.MeshStandardMaterial({ roughness: 0.75 }));
    swarm(new THREE.SphereGeometry(1, 8, 6), balls, new THREE.MeshStandardMaterial({ roughness: 0.5 }));

    for (const index of [0, 4]) {
      const stand = new THREE.Group();
      box([0.6, 0.3, 0.44], [0, 0.15, 0], flat(pick(crateColours)), true, stand);
      if (index === 0) box([0.6, 0.3, 0.44], [0, 0.45, 0], flat(pick(crateColours)), true, stand).rotation.y = 0.15;
      box([0.9, 0.04, 0.7], [0, index === 0 ? 0.62 : 0.32, 0], flat('#b9966a'), true, stand);
      stand.visible = false;
      root.add(stand);
      stands[index] = stand;
    }

    // Fixed entrance and service details remain when a bay receives a cast object.
    const serviceDark=flat('#4b5353'),enamel=flat('#d6ddce'),ochre=flat('#c6ab57');
    const tube=(points:V3[],radius:number,material:THREE.Material)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*5),radius,6,false),material,[0,0,0]);
    if(a.bayMarkers!=='none')for(const side of[-1,1])BAYS.forEach((z,index)=>{
      const x=side*1.53,y=a.bayMarkers==='hanging'?2.32:1.7;
      const map=paint(64,96,ctx=>{ctx.fillStyle=a.bayMarkers==='enamel'?'#3b617d':'#e7ddbb';ctx.fillRect(0,0,64,96);ctx.fillStyle=a.bayMarkers==='enamel'?'#f4ecd9':'#5f4c32';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(String(index+1+(side>0?8:0)),32,66);});
      if(a.bayMarkers==='round'){const plaque=mesh(new THREE.CircleGeometry(.14,20),new THREE.MeshStandardMaterial({map,side:THREE.DoubleSide}),[x,y,z+1.03]);plaque.rotation.y=side*Math.PI/2;}
      else {const plaque=box([.035,a.bayMarkers==='hanging'?.44:.22,.19],[x,y,z+1.03],new THREE.MeshStandardMaterial({map}));if(a.bayMarkers==='hanging'){box([.035,.18,.025],[x,y+.31,z+1.03],steel);box([.22,.025,.025],[x+side*.1,y+.4,z+1.03],steel);}else box([.13,.03,.04],[x+side*.04,y,z+1.03],steel);}
    });
    if(a.drainCover!=='slots') {
      const count=a.drainCover==='bars'?80:a.drainCover==='plates'?32:26;
      for(let i=0;i<count;i++) {
        const z=FAR+(i+.5)*(NEAR-FAR)/count;
        if(a.drainCover==='bars')box([.24,.012,.035],[-.15,.006,z],steel);
        else {box([.22,.009,(NEAR-FAR)/count-.025],[-.15,.0045,z],a.drainCover==='plates'?steel:flat('#c9c3ae'));if(a.drainCover==='plates')for(const dx of[-.075,.075])box([.014,.004,.09],[-.15+dx,.011,z],serviceDark);}
      }
    }
    if(a.overheadUtility!=='none')for(const side of[-1,1]) {
      const x=side*2.85,y=a.cover==='hall'?2.82:3.05;
      if(a.overheadUtility==='cable'){box([.2,.06,22],[x,y,-4],serviceDark);for(const dx of[-.09,.09])box([.018,.1,22],[x+dx,y+.06,-4],steel);}
      else if(a.overheadUtility==='pipes')for(const dx of[-.085,.085])tube([[x+dx,y,6.5],[x+dx,y,-14.5]],.035,dx>0?flat('#759789'):flat('#b99b79'));
      else {box([.45,.25,22],[x,y,-4],steel);for(let i=0;i<8;i++)box([.46,.26,.03],[x,y,5.7-i*2.65],serviceDark);}
      for(let i=0;i<8;i++){const z=5-i*2.6;box([WALL-Math.abs(x),.035,.035],[side*(WALL+Math.abs(x))/2,y-.06,z],steel);}
    }
    if(a.entranceFrame!=='open') {
      const x=2.6,z=6.35,top=3.15;
      for(const side of[-1,1])box([a.entranceFrame==='posts'?.32:.12,top,.22],[side*x,top/2,z],a.entranceFrame==='posts'?enamel:steel);
      if(a.entranceFrame==='roller'){box([5.3,.32,.34],[0,top-.04,z],steel);for(let i=0;i<8;i++)box([5.28,.016,.012],[0,top-.18+i*.04,z+.177],serviceDark);}
      else if(a.entranceFrame==='folding')for(const side of[-1,1])for(let i=0;i<5;i++){const gx=side*(x-.08-i*.07);box([.025,2.65,.035],[gx,1.325,z],steel);for(let j=0;j<6;j++){const bar=box([.11,.018,.025],[gx, .28+j*.42,z],steel);bar.rotation.z=(i%2?1:-1)*.7;}}
    }
    if(a.threshold==='stripe')box([4.5,.004,.12],[0,.002,6.8],ochre);
    else if(a.threshold==='mosaic')for(let i=0;i<20;i++)for(let j=0;j<3;j++)box([.219,.004,.14],[-2.1375+i*.225,.002,6.55+j*.15],(i+j)%4?enamel:serviceDark);
    else if(a.threshold==='chevrons')for(const side of[-1,1])for(let i=0;i<6;i++){const panel=box([.09,.004,.4],[side*(1.6+i*.12),.002,6.7],i%2?serviceDark:ochre);panel.rotation.y=side*.45;}
    if(a.wallServices!=='plain')for(const side of[-1,1])for(const z of[3.7,-1.5,-6.7,-11.9]) {
      const x=side*(WALL-.08);
      if(a.wallServices==='meters'){box([.16,.48,.32],[x,1.9,z],enamel);box([.012,.12,.2],[x-side*.09,1.97,z],serviceDark);tube([[x,2.14,z],[x,2.8,z]],.018,steel);}
      else if(a.wallServices==='vents'){box([.08,.42,.8],[x,2.5,z],serviceDark);for(let i=0;i<7;i++)box([.1,.025,.75],[x-side*.03,2.34+i*.05,z],steel);}
      else {box([.3,.12,.42],[x-side*.12,.9,z],steel);tube([[x,1.2,z],[x-side*.2,1.2,z],[x-side*.2,1.08,z]],.025,steel);tube([[x-side*.12,.85,z],[x-side*.12,.5,z],[x,.5,z]],.035,serviceDark);}
    }

    // Merge rigid untextured metalwork. Moving fans, removable bay fillers,
    // raised stands, lights, painted signs and transparent water keep their
    // original objects and materials.
    const staticGroups=new Map<THREE.Material,Map<string,THREE.Mesh[]>>();
    root.updateMatrixWorld(true);
    const originalBounds=new THREE.Box3().setFromObject(root,true);
    for(const child of root.children){
      const part=child as THREE.Mesh;
      if(!part.isMesh||(part as THREE.InstancedMesh).isInstancedMesh||part===floor||Array.isArray(part.material))continue;
      const material=part.material as THREE.MeshStandardMaterial;
      if(material.map||material.transparent||material.vertexColors)continue;
      const flags=String(part.castShadow)+String(part.receiveShadow);
      const bucket=staticGroups.get(material)??new Map<string,THREE.Mesh[]>();
      const list=bucket.get(flags)??[];list.push(part);bucket.set(flags,list);staticGroups.set(material,bucket);
    }
    const removedGeometry=new Set<THREE.BufferGeometry>();
    for(const [material,bucket]of staticGroups)for(const list of bucket.values())if(list.length>1){
      const parts=list.map(part=>{
        part.updateMatrix();const clone=part.geometry.clone(),geometry=clone.index?clone.toNonIndexed():clone;
        if(geometry!==clone)clone.dispose();
        for(const attribute of Object.keys(geometry.attributes))if(attribute!=='position'&&attribute!=='normal')geometry.deleteAttribute(attribute);
        geometry.applyMatrix4(part.matrix);return geometry;
      });
      const geometry=mergeGeometries(parts);
      if(!geometry)throw new Error('Market static merge failed');
      const joined=new THREE.Mesh(geometry,material);joined.castShadow=list[0].castShadow;joined.receiveShadow=list[0].receiveShadow;
      for(const part of list){removedGeometry.add(part.geometry);root.remove(part);}
      root.add(joined);for(const part of parts)part.dispose();
    }
    root.updateMatrixWorld(true);
    const mergedBounds=new THREE.Box3().setFromObject(root,true);
    if(originalBounds.min.distanceTo(mergedBounds.min)>1e-5||originalBounds.max.distanceTo(mergedBounds.max)>1e-5)throw new Error('Market merge changed bounds');
    const retainedGeometry=new Set<THREE.BufferGeometry>();
    root.traverse(node=>{if((node as THREE.Mesh).isMesh)retainedGeometry.add((node as THREE.Mesh).geometry);});
    for(const geometry of removedGeometry)if(!retainedGeometry.has(geometry))geometry.dispose();

    // Camera.
    const view = { eye: { at: [0.35, 1.6, 8.2], to: [-0.15, 1.25, -3], fov: 56 }, low: { at: [0.5, 0.85, 8.1], to: [-0.2, 1.4, -3], fov: 58 }, high: { at: [0.25, 2.45, 8.7], to: [-0.1, 0.8, -3], fov: 54 } }[a.view];
    const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.3, 80);
    camera.position.set(view.at[0], view.at[1], view.at[2]);
    camera.lookAt(view.to[0], view.to[1], view.to[2]);

    const place = (items: readonly Placeable[]) => {
      fillers.forEach((filler) => { filler.visible = true; });
      stands.forEach((stand) => { stand.visible = false; });
      items.forEach((item, index) => {
        const slotIndex = index % SLOTS.length, slot = SLOTS[slotIndex];
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        const fit = Math.min(slot.h / height, slot.r / radius);
        // True size when it fits the bay; shrunk when it does not; small things grow a little.
        const scale = Math.min(fit, Math.max(1, Math.min(0.55 / height, 2.5)));
        let y = 0, x: number = slot.x;
        if (slot.bay >= 0) fillers[slotIndex].visible = false;
        if (height * scale < 0.75 && radius * scale < 0.55) {
          // Tabletop things go up on a board over crates so they are not lost on the floor.
          const stand = stands[slotIndex];
          if (slot.bay >= 0) x = slot.side * 1.75;
          stand.visible = true;
          stand.position.set(x, 0, slot.z);
          stand.rotation.y = slot.turn;
          y = slotIndex === 4 ? 0.34 : 0.64;
        }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y, slot.z);
        item.holder.rotation.y = slot.turn + (context.random() - 0.5) * 0.25;
        item.holder.updateMatrixWorld(true);
      });
      camera.updateMatrixWorld(true);
    };

    const pace = mix(0.5, 2, mood.energy);
    return {
      object: root, camera, background, capacity: SLOTS.length, ground: floor, keyLight: key, place,
      update(dt, time) {
        for (const fan of fans) fan.rotation.y += dt * pace * 3;
        for (const glow of glowers) glow.material.emissiveIntensity = glow.base * (0.96 + 0.04 * Math.sin(time * 9 * pace + glow.phase));
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
