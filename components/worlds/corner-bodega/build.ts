import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type G = CanvasRenderingContext2D;
const PLACES = {
  nyc: 'A New York bodega: cream walls, red and yellow signs, DELI GROCERY, lotto and cold beer.',
  tiendita: 'A Mexican tiendita: turquoise and pink paint, hand-lettered ABARROTES, refrescos and tortillas.',
  sari: 'A Manila sari-sari store: wood and green paint, a steel grille across the window, load and ice for sale.',
  shotengai: 'A shop on a Tokyo shotengai arcade: pale plaster and dark wood, a short curtain in the door, sake and tobacco.',
  offlicence: 'A British off-licence: bottle-green trim, wines and spirits, newspapers, lottery and top-ups.',
} as const;
const PLACE: Record<keyof typeof PLACES, { wall: string; trim: string; accent: string; sign: string; subs: string[]; open: string }> = {
  nyc: { wall: '#e9e2cf', trim: '#b3201c', accent: '#f6c81c', sign: 'DELI * GROCERY', subs: ['COLD BEER', 'LOTTO', 'ATM INSIDE', 'WE ACCEPT EBT', 'SANDWICHES'], open: 'OPEN' },
  tiendita: { wall: '#3fb0a8', trim: '#e8447a', accent: '#f6c81c', sign: 'ABARROTES LUPITA', subs: ['REFRESCOS', 'TORTILLAS', 'HIELO', 'HOY NO SE FIA', 'DULCES'], open: 'ABIERTO' },
  sari: { wall: '#d6c49a', trim: '#2f8f5a', accent: '#e8442a', sign: 'ALING NENA STORE', subs: ['LOAD HERE', 'ICE 4 SALE', 'SOFTDRINKS', 'BAWAL UTANG', 'TINGI'], open: 'OPEN' },
  shotengai: { wall: '#efe8d8', trim: '#3a2a20', accent: '#c4262a', sign: 'TANAKA SHOTEN', subs: ['SAKE', 'TABAKO', 'ICE', 'BENTO', 'MISO'], open: 'OPEN' },
  offlicence: { wall: '#e6dfd0', trim: '#1f5a3a', accent: '#c9a23a', sign: 'OFF LICENCE', subs: ['NEWS', 'LOTTERY', 'WINES & SPIRITS', 'TOP UP', 'NO CREDIT'], open: 'OPEN' },
};

export default defineWorld({
  questions: {
    place: choice('Where in the world is this corner shop?', PLACES),
    hour: choice('What hour is it?', {
      dawn: 'Dawn: cool light, the morning delivery stacked inside the door.',
      noon: 'Midday: hard sun through the door, the awning throwing its colour on the floor.',
      evening: 'Early evening: gold light, the neon just switched on, the after-work rush.',
      late: 'Two in the morning: blue dark outside, fluorescent tubes and neon doing all the work.',
    }),
    floor: choice('What is the floor?', {
      checker: 'Black and cream checkerboard tiles.',
      terracotta: 'Square red clay tiles.',
      lino: 'Green linoleum worn grey along the path to the counter.',
      concrete: 'Bare painted concrete.',
    }),
    hanging: choice('What hangs from the ceiling clips?', {
      chips: 'Clip strips of crisps and snack bags.',
      pinatas: 'Star piñatas and paper streamers.',
      sachets: 'Long strings of single-serve sachets, shampoo and coffee by the packet.',
      lanterns: 'Paper lanterns, red and white.',
      housewares: 'Plastic buckets, feather dusters and coils of clothesline.',
      produce: 'Bunches of plantains, braids of garlic and net bags of oranges.',
    }),
    awning: choice('What is the awning outside like?', {
      redyellow: 'Red and yellow stripes.',
      greenwhite: 'Green and white stripes.',
      blue: 'Solid blue with a white edge.',
      faded: 'Sun-bleached canvas, patched and sagging.',
    }),
    till: choice('What is posted behind the register?', {
      tab: 'The credit list: names and amounts owed, to be paid on Friday.',
      nocredit: 'A blunt NO CREDIT sign.',
      regulars: 'A wall of snapshots of the regulars.',
      winner: 'A banner boasting that a winning lottery ticket was sold here.',
    }),
    aisle: choice('What is in the way in the aisle?', {
      nothing: 'Nothing: the aisle is clear.',
      boxes: 'Unopened delivery cartons stacked shoulder high.',
      mop: 'A mop bucket and a yellow wet-floor sign.',
      truck: 'A hand truck loaded with crates of soda.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const P = PLACE[a.place];
    const X0 = -3.6, X1 = 5, Z0 = -4.2, Z1 = 2.5, FY = 0.12, WALL = 3.0, FRONT = 2.7;
    const background = { dawn: '#dde3e8', noon: '#e6e7df', evening: '#eadfcd', late: '#b3bac8' }[a.hour];
    const { art: s, world } = diorama(context, {
      background, floor: a.hour === 'late' ? '#a3a6aa' : '#bdbbb2', width: 10, depth: 8.4, maxHeight: 2.0, radius: 0.95, pitch: 30, yaw: 28,
      slots: [[0.3, 0.95, FY], [-2.15, 1.45, FY], [3.35, 0.3, FY], [2.7, 3.4], [-4.3, 3.2, 0, 0.8], [4.35, -2.72, 1.09, 0.42]],
    });
    for (const child of s.root.children) {
      const light = child as THREE.HemisphereLight;
      if (!light.isHemisphereLight) continue;
      light.intensity *= { dawn: 0.95, noon: 1, evening: 0.95, late: 0.8 }[a.hour];
      light.color.set({ dawn: '#dfe9ff', noon: '#f1f2ff', evening: '#ffe9cf', late: '#cfd8ff' }[a.hour]);
    }
    const glow = { dawn: 0.5, noon: 0.35, evening: 0.95, late: 1.35 }[a.hour] * mix(0.75, 1.2, mood.cheer);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const texture = (w: number, h: number, draw: (g: G) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };
    const write = (g: G, value: string, x: number, y: number, size: number, colour: string, max?: number) => { g.fillStyle = colour; g.font = `bold ${size}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(value, x, y, max); };
    const lit = (map: THREE.Texture, strength = 1) => new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow * strength, roughness: 0.5, side: THREE.DoubleSide });
    const wall = s.material(P.wall, { roughness: 0.9 }), trim = s.material(P.trim), accent = s.material(P.accent);
    const steel = s.material('#aeb5b4', { metalness: 0.5, roughness: 0.4 });
    const dark = s.material('#26282b');
    const card = s.material('#b88d54', { roughness: 0.95 });

    // Instanced goods: every packet, can and bottle in the shop is one of two draw calls.
    const stock: Record<'box' | 'can', { m: THREE.Matrix4; c: THREE.Color }[]> = { box: [], can: [] };
    const put = (kind: 'box' | 'can', x: number, y: number, z: number, w: number, h: number, d: number, colour: THREE.ColorRepresentation, turn = 0) => {
      stock[kind].push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)), new THREE.Vector3(w, h, d)), c: new THREE.Color(colour) });
    };
    const loud = () => new THREE.Color().setHSL(random(), mix(0.7, 0.95, random()), mix(0.3, 0.5, random()));
    const fill = mix(0.55, 1, mood.density);
    /** A run of products along x on one shelf, facing +z (or -z), each product repeated for a few facings. */
    const stockRun = (x0: number, x1: number, y: number, z: number, room: number, facing = 1) => {
      let x = x0 + 0.03;
      while (x < x1 - 0.06) {
        const kind = random() < 0.42 ? 'can' : 'box';
        const w = kind === 'can' ? mix(0.07, 0.11, random()) : mix(0.1, 0.22, random());
        const h = Math.min(room - 0.04, kind === 'can' ? mix(0.11, 0.3, random()) : mix(0.14, 0.32, random()));
        const colour = random() < 0.12 ? new THREE.Color('#f1efe6') : loud();
        const facings = 2 + Math.floor(random() * 4), gone = random() > fill;
        for (let i = 0; i < facings && x < x1 - w; i++) {
          if (!gone && random() < fill + 0.25) {
            put(kind, x + w / 2, y, z, w * 0.92, h, kind === 'can' ? w * 0.92 : mix(0.06, 0.14, random()), colour, (random() - 0.5) * mood.wear * 0.5);
            if (kind === 'can' && h < room / 2 - 0.03 && random() < mood.density) put(kind, x + w / 2, y + h, z, w * 0.92, h, w * 0.92, colour);
            if (random() < 0.5) put(kind, x + w / 2, y, z - facing * 0.14, w * 0.92, h, kind === 'can' ? w * 0.92 : 0.1, colour);
          }
          x += w + 0.008;
        }
        if (x >= x1 - w) x += w;
      }
    };
    const shelving = (x0: number, x1: number, z: number, height: number, levels: number, depth: number, facing: 1 | 0) => {
      // facing 1: single-sided against a wall, goods face +z. facing 0: a double-sided gondola.
      const cx = (x0 + x1) / 2, width = x1 - x0, step = (height - 0.16) / levels;
      s.box([width, height, 0.03], [cx, FY + height / 2, facing ? z - depth / 2 : z], s.material('#d9d6cc'));
      s.box([width, 0.14, facing ? depth : depth * 2], [cx, FY + 0.07, facing ? z : z], dark);
      for (let x = x0; x <= x1 + 0.01; x += width / Math.max(1, Math.round(width / 1.2))) s.box([0.035, height + 0.04, facing ? depth : depth * 2], [x, FY + height / 2, z], steel);
      for (let level = 0; level < levels; level++) {
        const y = FY + 0.14 + level * step;
        s.box([width, 0.022, facing ? depth : depth * 2 + 0.02], [cx, y, z], s.material('#eceae2'));
        s.box([width, 0.035, 0.008], [cx, y - 0.005, z + (facing ? depth / 2 : depth) + 0.004], accent);
        stockRun(x0, x1, y + 0.011, z + (facing ? depth / 2 - 0.09 : depth - 0.09), step, 1);
        if (!facing) { s.box([width, 0.035, 0.008], [cx, y - 0.005, z - depth - 0.004], accent); stockRun(x0, x1, y + 0.011, z - depth + 0.09, step, -1); }
      }
      if (mood.density > 0.4) stockRun(x0, x1, FY + height + 0.005, z, 0.34, 1);
    };

    // Interior floor slab, one step up from the sidewalk.
    s.box([X1 - X0, FY, Z1 - Z0], [(X0 + X1) / 2, FY / 2, (Z0 + Z1) / 2], s.material('#8d8a82'));
    const tilesX = 22, tilesZ = 17, px = 16;
    const floorMap = texture(tilesX * px, tilesZ * px, (g) => {
      const w = tilesX * px, h = tilesZ * px;
      for (let i = 0; i < tilesX; i++) for (let k = 0; k < tilesZ; k++) {
        const j = (random() - 0.5) * 14;
        const base = a.floor === 'checker' ? ((i + k) % 2 ? [36, 36, 40] : [226, 216, 190]) : a.floor === 'terracotta' ? [178, 96, 66] : a.floor === 'lino' ? [96, 140, 108] : [168, 166, 158];
        g.fillStyle = `rgb(${base[0] + j},${base[1] + j},${base[2] + j})`;
        g.fillRect(i * px, k * px, px, px);
        if (a.floor === 'terracotta' || a.floor === 'checker') { g.strokeStyle = a.floor === 'checker' ? 'rgba(90,88,80,0.5)' : 'rgba(110,60,44,0.8)'; g.lineWidth = 1; g.strokeRect(i * px + 0.5, k * px + 0.5, px, px); }
      }
      // The worn path from the door round to the counter.
      const worn = mix(0.12, 0.6, mood.wear) * (a.floor === 'lino' ? 1.4 : 1);
      g.strokeStyle = `rgba(150,146,136,${Math.min(0.85, worn)})`; g.lineWidth = px * 2.3; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(0, h * 0.84); g.lineTo(w * 0.42, h * 0.72); g.lineTo(w * 0.72, h * 0.5); g.lineTo(w * 0.8, h * 0.36); g.stroke();
      if (a.floor === 'concrete') { g.strokeStyle = '#d9b82a'; g.lineWidth = 3; g.strokeRect(w * 0.04, h * 0.44, w * 0.5, h * 0.5); }
      for (let i = 0; i < mood.wear * 26; i++) { g.fillStyle = `rgba(60,52,44,${0.1 + random() * 0.2})`; g.beginPath(); g.ellipse(random() * w, random() * h, 4 + random() * 14, 3 + random() * 8, random() * 3, 0, 7); g.fill(); }
    });
    const floor = s.mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), new THREE.MeshStandardMaterial({ map: floorMap, roughness: mix(0.35, 0.85, mood.wear) }), [(X0 + X1) / 2, FY + 0.002, (Z0 + Z1) / 2]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    s.box([X1 - X0, 0.03, 0.05], [(X0 + X1) / 2, FY - 0.015, Z1 + 0.025], trim);
    for (let x = -4.4; x < 5; x += 1.5) s.box([0.02, 0.004, 1.7], [x, 0.002, 3.35], s.material('#8e8c84'));
    s.box([10, 0.004, 0.02], [0, 0.002, 4.05], s.material('#8e8c84'));

    // Back wall with the shop sign band.
    s.box([X1 - X0 + 0.2, WALL, 0.2], [(X0 + X1) / 2 - 0.1, WALL / 2, Z0 - 0.1], wall);
    s.box([X1 - X0, 0.46, 0.04], [(X0 + X1) / 2, WALL - 0.25, Z0 + 0.02], trim);
    s.label(P.sign, 4.6, 0.38, [-0.6, WALL - 0.25, Z0 + 0.045], P.accent, P.trim);

    // Storefront wall on the left: window, open door, and the awning beyond it.
    const DOOR0 = 0.95, DOOR1 = 2.15, WIN0 = -2.9, WIN1 = 0.35, SILL = FY + 0.95, HEAD = 2.25;
    const front = (z0: number, z1: number, y0: number, y1: number, material: THREE.Material = wall) => s.box([0.18, y1 - y0, z1 - z0], [X0 - 0.09, (y0 + y1) / 2, (z0 + z1) / 2], material);
    front(Z0 - 0.2, WIN0, 0, FRONT);
    front(WIN0, WIN1, 0, SILL);
    front(WIN1, DOOR0, 0, FRONT);
    front(DOOR1, Z1, 0, FRONT);
    front(WIN0, DOOR1, HEAD, FRONT);
    front(WIN0, WIN1, SILL - 0.05, SILL, trim);
    front(Z0 - 0.2, Z1, FRONT - 0.1, FRONT + 0.02, trim);
    const pane = s.box([0.02, HEAD - SILL, WIN1 - WIN0], [X0 - 0.09, (SILL + HEAD) / 2, (WIN0 + WIN1) / 2], new THREE.MeshStandardMaterial({ color: a.hour === 'late' ? '#5a6a8a' : '#dff2f0', transparent: true, opacity: a.hour === 'late' ? 0.45 : 0.16, roughness: 0.05, depthWrite: false }));
    pane.castShadow = false;
    for (const z of [WIN0 + (WIN1 - WIN0) / 3, WIN0 + (WIN1 - WIN0) * 2 / 3]) s.box([0.05, HEAD - SILL, 0.04], [X0 - 0.09, (SILL + HEAD) / 2, z], trim);
    if (a.place === 'sari' || a.hour === 'late') {
      // A steel grille over the window: always in a sari-sari store, pulled down at night elsewhere.
      const grille = texture(128, 64, (g) => { g.clearRect(0, 0, 128, 64); g.strokeStyle = '#70777a'; g.lineWidth = 3; for (let x = 4; x < 128; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); } for (let y = 6; y < 64; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); } });
      const bars = s.mesh(new THREE.PlaneGeometry(WIN1 - WIN0, HEAD - SILL), new THREE.MeshStandardMaterial({ map: grille, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }), [X0 + 0.01, (SILL + HEAD) / 2, (WIN0 + WIN1) / 2]);
      bars.rotation.y = Math.PI / 2;
    }
    // Neon and window cards, seen from inside.
    const neon = (text: string, z: number, y: number, colour: string, width: number) => {
      const map = texture(256, 96, (g) => { g.fillStyle = '#15161a'; g.fillRect(0, 0, 256, 96); g.strokeStyle = colour; g.lineWidth = 5; g.strokeRect(8, 8, 240, 80); g.shadowColor = colour; g.shadowBlur = 14; write(g, text, 128, 50, 54, colour, 220); });
      const sign = s.mesh(new THREE.PlaneGeometry(width, width * 0.375), lit(map, 1.4), [X0 + 0.02, y, z]);
      sign.rotation.y = Math.PI / 2;
      sign.castShadow = false;
    };
    neon(P.open, WIN0 + 0.75, HEAD - 0.32, '#ff4a5a', 1.1);
    neon(P.subs[1], WIN1 - 0.7, HEAD - 0.3, '#4ae0ff', 0.95);
    for (let i = 0; i < 3; i++) {
      const cardSign = s.label(P.subs[(i + 2) % P.subs.length], 0.9, 0.24, [X0 + 0.012, FY + 0.3 + (i % 2) * 0.32, WIN0 + 0.6 + i * 0.95], i % 2 ? P.trim : '#16161a', i % 2 ? '#f6efcf' : P.accent);
      cardSign.rotation.set(0, Math.PI / 2, (random() - 0.5) * 0.08);
    }
    // The door leaf, propped open inward.
    const leaf = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.08, DOOR1 - DOOR0 - 0.04), trim);
    frame.position.set(0, 1.04, -(DOOR1 - DOOR0) / 2);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.052, 1.75, DOOR1 - DOOR0 - 0.24), new THREE.MeshStandardMaterial({ color: '#dff2f0', transparent: true, opacity: 0.35, roughness: 0.05 }));
    glass.position.set(0, 1.12, -(DOOR1 - DOOR0) / 2);
    const push = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, DOOR1 - DOOR0 - 0.3), steel);
    push.position.set(0.02, 1.0, -(DOOR1 - DOOR0) / 2);
    leaf.add(frame, glass, push);
    leaf.position.set(X0 + 0.02, FY, DOOR1);
    leaf.rotation.y = -1.9 + random() * 0.2;
    frame.castShadow = true;
    s.root.add(leaf);
    if (a.place === 'shotengai') {
      // A split noren curtain in the doorway.
      for (let i = 0; i < 3; i++) {
        const strip = s.box([0.012, 0.6, 0.37], [X0 - 0.02, HEAD - 0.36, DOOR0 + 0.2 + i * 0.4], s.material('#24406e', { side: THREE.DoubleSide }));
        strip.rotation.x = (random() - 0.5) * 0.12;
        s.cylinder(0.09, 0.09, 0.004, [X0 - 0.01, HEAD - 0.36, DOOR0 + 0.2 + i * 0.4], s.material('#f3f1ea'), 18).rotation.z = Math.PI / 2;
      }
    }
    // Awning over the sidewalk outside the storefront; its top shows beyond the wall.
    const stripes = { redyellow: ['#d8262a', '#f6c81c'], greenwhite: ['#1f7a46', '#f3f1ea'], blue: ['#2452b8', '#2452b8'], faded: ['#b9a58a', '#cdbfa6'] }[a.awning];
    const awningMap = texture(256, 64, (g) => {
      for (let i = 0; i < 16; i++) { g.fillStyle = stripes[i % 2]; g.fillRect(i * 16, 0, 16, 64); }
      if (a.awning === 'blue') { g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, 256, 9); }
      if (a.awning === 'faded') for (let i = 0; i < 5; i++) { g.fillStyle = pick(['#8f8a80', '#d9d2c2', '#a89a80']); g.fillRect(random() * 230, random() * 44, 14 + random() * 22, 10 + random() * 14); }
    });
    const canvasCloth = new THREE.MeshStandardMaterial({ map: awningMap, roughness: 0.85, side: THREE.DoubleSide });
    const slope = Math.atan2(0.55, 1.45), awningLength = DOOR1 - WIN0 + 0.7, awningZ = (WIN0 + DOOR1) / 2;
    const sheet = s.box([0.03, 1.56, awningLength], [X0 - 0.2 - 0.72, FRONT - 0.33 - (a.awning === 'faded' ? 0.06 : 0), awningZ], canvasCloth);
    sheet.rotation.z = Math.PI / 2 + slope;
    s.box([0.03, 0.26, awningLength], [X0 - 0.2 - 1.45, FRONT - 0.72, awningZ], canvasCloth);
    for (const z of [awningZ - awningLength / 2, awningZ + awningLength / 2]) s.rod([X0 - 0.2, FRONT - 0.62, z], [X0 - 1.65, FRONT - 0.62, z], 0.018, steel);
    // Light through the door, tinted by the awning.
    const sun = { dawn: 0.5, noon: 1, evening: 0.85, late: 0.3 }[a.hour];
    const tint = a.hour === 'late' ? new THREE.Color('#ff5a6a') : new THREE.Color({ dawn: '#dfeaff', noon: '#fff3c9', evening: '#ffc98a', late: '#ffffff' }[a.hour]).lerp(new THREE.Color(stripes[1]), 0.22);
    const beam = new THREE.Shape();
    beam.moveTo(X0, -DOOR0 + 0.05); beam.lineTo(X0, -DOOR1 - 0.05); beam.lineTo(X0 + 4.6, -2.3); beam.lineTo(X0 + 4.2, 0.1); beam.closePath();
    const patch = s.mesh(new THREE.ShapeGeometry(beam), new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.8 * sun, transparent: true, opacity: 0.6 * sun, depthWrite: false }), [0, FY + 0.006, 0]);
    patch.rotation.x = -Math.PI / 2;
    patch.castShadow = false;

    // Drinks cooler, then wall shelving along the back; a gondola in front makes the one narrow aisle.
    const coolerX0 = X0 + 0.15, coolerX1 = coolerX0 + 1.9, coolerZ = Z0 + 0.36;
    s.box([1.9, 2.3, 0.7], [(coolerX0 + coolerX1) / 2, FY + 1.15, coolerZ], s.material('#e6e8e6'));
    s.box([1.9, 0.26, 0.72], [(coolerX0 + coolerX1) / 2, FY + 2.17, coolerZ], accent);
    s.label(pick(['COLD DRINKS', 'ICE COLD', P.subs[0]]), 1.7, 0.2, [(coolerX0 + coolerX1) / 2, FY + 2.17, coolerZ + 0.365], P.trim, P.accent);
    const inside = new THREE.MeshStandardMaterial({ color: '#f4fbff', emissive: '#dff4ff', emissiveIntensity: 0.5 * glow, roughness: 0.6 });
    s.box([1.78, 1.8, 0.02], [(coolerX0 + coolerX1) / 2, FY + 1.1, coolerZ + 0.2], inside).castShadow = false;
    for (let level = 0; level < 5; level++) {
      const y = FY + 0.24 + level * 0.36;
      s.box([1.78, 0.015, 0.14], [(coolerX0 + coolerX1) / 2, y, coolerZ + 0.28], steel);
      for (let x = coolerX0 + 0.1; x < coolerX1 - 0.08; x += 0.095) if (random() < fill + 0.2) put('can', x, y + 0.008, coolerZ + 0.29, 0.075, level > 2 ? 0.16 : 0.27, 0.075, pick(['#d8262a', '#f28a1c', '#3ab85a', '#2a8ae0', '#f6c81c', '#6a3a1c', '#f3f1ea', '#8a4ad0']));
    }
    for (const x of [coolerX0, (coolerX0 + coolerX1) / 2, coolerX1]) s.box([0.05, 1.86, 0.04], [x, FY + 1.1, coolerZ + 0.36], dark);
    const doors = s.box([1.8, 1.8, 0.012], [(coolerX0 + coolerX1) / 2, FY + 1.1, coolerZ + 0.365], new THREE.MeshStandardMaterial({ color: '#dff2f0', transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false }));
    doors.castShadow = false;
    shelving(coolerX1 + 0.1, 1.9, Z0 + 0.24, 2.3, 5, 0.42, 1);
    const GZ = -2.3;
    shelving(-2.9, 1.1, GZ, 1.45, 4, 0.3, 0);
    // End cap facing the counter: a rack of crisps.
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) if (random() < fill + 0.2) put('box', 1.19, FY + 0.2 + r * 0.31, GZ - 0.2 + c * 0.2, 0.06, 0.24, 0.17, loud());
    s.box([0.03, 1.4, 0.62], [1.14, FY + 0.72, GZ], steel);

    // Counter at the back right: deli case, register, lotto and the wall behind.
    const CX0 = 2.35, CX1 = 4.85, CZ = -2.72, CTOP = FY + 0.97;
    s.box([CX1 - CX0, 0.95, 0.72], [(CX0 + CX1) / 2, FY + 0.475, CZ], trim);
    s.box([CX1 - CX0 + 0.06, 0.04, 0.8], [(CX0 + CX1) / 2, CTOP - 0.02, CZ], steel);
    for (let r = 0; r < 3; r++) for (let x = CX0 + 0.12; x < CX1 - 0.1; x += 0.105) if (random() < fill + 0.25) put('box', x, FY + 0.2 + r * 0.22, CZ + 0.38, 0.09, 0.05, 0.07, loud());
    for (let r = 0; r < 3; r++) s.box([CX1 - CX0 - 0.12, 0.012, 0.09], [(CX0 + CX1) / 2, FY + 0.195 + r * 0.22, CZ + 0.4], steel);
    const caseGlass = new THREE.MeshStandardMaterial({ color: '#dff2f0', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false });
    s.box([1.2, 0.42, 0.6], [CX0 + 0.66, CTOP + 0.21, CZ], caseGlass).castShadow = false;
    s.box([1.24, 0.03, 0.64], [CX0 + 0.66, CTOP + 0.435, CZ], steel);
    for (let i = 0; i < 5; i++) if (random() < fill + 0.3) {
      const meat = s.cylinder(0.07, 0.07, 0.34, [CX0 + 0.2 + i * 0.23, CTOP + 0.08, CZ], s.material(pick(['#d98a90', '#7d2a22', '#e6aaa2', '#f0a02e', '#f3df8c'])), 14);
      meat.rotation.x = Math.PI / 2;
    }
    s.box([0.34, 0.2, 0.36], [CX0 + 1.62, CTOP + 0.1, CZ], dark);
    const till = s.box([0.3, 0.22, 0.03], [CX0 + 1.62, CTOP + 0.3, CZ - 0.05], dark);
    till.rotation.x = -0.25;
    const tillScreen = s.mesh(new THREE.PlaneGeometry(0.26, 0.17), lit(texture(64, 40, (g) => { g.fillStyle = '#0c2a18'; g.fillRect(0, 0, 64, 40); write(g, `${(random() * 20).toFixed(2)}`, 32, 21, 22, '#5dff8e'); }), 1.1), [CX0 + 1.62, CTOP + 0.3, CZ - 0.032]);
    tillScreen.rotation.x = -0.25;
    tillScreen.castShadow = false;
    const tall = new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: 0.3, roughness: 0.05 });
    s.box([0.22, 0.42, 0.14], [CX0 + 1.18, CTOP + 0.21, CZ + 0.22], tall);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) put('box', CX0 + 1.13 + c * 0.1, CTOP + 0.02 + r * 0.1, CZ + 0.22, 0.085, 0.085, 0.1, loud());
    // Cigarette and bottle wall, menu and the story board behind the register.
    const wallZ = Z0 + 0.03;
    s.box([2.5, 0.03, 0.2], [3.6, FY + 1.5, Z0 + 0.1], steel);
    s.box([2.5, 0.03, 0.2], [3.6, FY + 1.86, Z0 + 0.1], steel);
    for (let x = 2.45; x < 4.8; x += 0.075) { if (random() < fill + 0.3) put('box', x, FY + 1.515, Z0 + 0.12, 0.062, 0.1, 0.03, pick(['#f3f1ea', '#c4262a', '#1f5a3a', '#16161a', '#2452b8', '#c9a23a'])); }
    for (let x = 2.45; x < 4.8; x += 0.105) if (random() < fill + 0.3) put('can', x, FY + 1.875, Z0 + 0.12, 0.075, 0.3, 0.075, pick(['#6a3a1c', '#1f5a3a', '#c9a23a', '#f3f1ea', '#8a1f2a', '#2a3a4a']));
    const board = { tab: [0.8, 0.95], nocredit: [1.1, 0.5], regulars: [1.2, 0.8], winner: [1.5, 0.45] }[a.till];
    const names = ['MANNY', 'ROSA', 'DEVON', 'MRS K', 'TITO', 'LUPE', 'OLD SAM', 'JOJO'];
    const storyMap = texture(256, Math.round(256 * board[1] / board[0]), (g) => {
      const w = 256, h = Math.round(256 * board[1] / board[0]);
      if (a.till === 'tab') { g.fillStyle = '#f6f1dc'; g.fillRect(0, 0, w, h); g.fillStyle = '#8a8d92'; g.fillRect(88, 0, 80, 22); write(g, 'TAB', 128, 46, 34, '#b3201c'); g.textAlign = 'left'; g.font = 'bold 22px monospace'; names.slice(0, 7).forEach((name, i) => { const y = 84 + i * 30; g.fillStyle = '#1b2d7a'; g.fillText(name, 16, y); g.textAlign = 'right'; g.fillText((1 + random() * 30).toFixed(2), 242, y); g.textAlign = 'left'; if (random() < 0.3) { g.strokeStyle = '#b3201c'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, y); g.lineTo(246, y - 3); g.stroke(); } }); write(g, 'PAY FRIDAY', 128, h - 18, 22, '#b3201c'); }
      if (a.till === 'nocredit') { g.fillStyle = '#f6efcf'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b3201c'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); write(g, a.place === 'tiendita' ? 'HOY NO SE FIA' : a.place === 'sari' ? 'BAWAL UTANG' : 'NO CREDIT', 128, h * 0.4, 30, '#b3201c', 230); write(g, a.place === 'tiendita' ? 'MAÑANA SI' : "DON'T ASK", 128, h * 0.74, 22, '#16161a', 230); }
      if (a.till === 'regulars') { g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, w, h); for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { g.save(); g.translate(30 + c * 49, 30 + r * 54); g.rotate((random() - 0.5) * 0.3); g.fillStyle = '#f6f4ea'; g.fillRect(-20, -23, 40, 46); g.fillStyle = pick(['#7aa6c8', '#c8a67a', '#8ab88a', '#c88a8a', '#a89ac8']); g.fillRect(-16, -19, 32, 30); g.fillStyle = pick(['#6a4630', '#c98f64', '#3a2a20', '#e3b890']); g.beginPath(); g.arc(0, -7, 8, 0, 7); g.fill(); g.beginPath(); g.ellipse(0, 12, 12, 9, 0, Math.PI, 0); g.fill(); g.restore(); } }
      if (a.till === 'winner') { g.fillStyle = '#f6d21c'; g.fillRect(0, 0, w, h); write(g, 'WINNER SOLD HERE', 128, h * 0.32, 24, '#b3201c', 240); write(g, pick(['$10,000', '$5,000', '$50,000']), 128, h * 0.7, 34, '#16161a', 240); }
    });
    const story = s.mesh(new THREE.PlaneGeometry(board[0], board[1]), new THREE.MeshStandardMaterial({ map: storyMap, roughness: 0.9 }), [4.1, FY + 0.92 + (a.till === 'tab' ? 0 : 0.15), wallZ + 0.004]);
    story.rotation.z = (random() - 0.5) * 0.05;
    const menu = s.mesh(new THREE.PlaneGeometry(1.1, 0.75), new THREE.MeshStandardMaterial({ map: texture(176, 120, (g) => { g.fillStyle = '#16181a'; g.fillRect(0, 0, 176, 120); write(g, P.subs[4], 88, 16, 17, P.accent, 160); g.font = 'bold 11px monospace'; for (let i = 0; i < 6; i++) { g.fillStyle = '#f4f2ea'; g.textAlign = 'left'; g.fillRect(10, 36 + i * 13, 70 + random() * 40, 5); g.fillRect(140, 36 + i * 13, 24, 5); } }), roughness: 0.9 }), [2.95, FY + 1.0, wallZ + 0.004]);
    menu.castShadow = false;
    s.box([1.16, 0.81, 0.02], [2.95, FY + 1.0, wallZ - 0.008], s.material('#9a6a3a'));
    // Clock and a calendar above the shelves.
    s.cylinder(0.17, 0.17, 0.04, [2.3, FY + 2.3, wallZ + 0.02], s.material('#f3f1ea'), 24).rotation.x = Math.PI / 2;
    const hourHand = { dawn: 5.5, noon: 12.2, evening: 6.3, late: 2.1 }[a.hour];
    for (const [turns, length] of [[hourHand / 12, 0.08], [hourHand % 1, 0.13]] as const) {
      const angle = turns * Math.PI * 2;
      s.rod([2.3, FY + 2.3, wallZ + 0.045], [2.3 + Math.sin(angle) * length, FY + 2.3 + Math.cos(angle) * length, wallZ + 0.045], 0.008, dark);
    }

    // The hour: a dawn delivery inside the door.
    if (a.hour === 'dawn') {
      for (let i = 0; i < 3; i++) s.box([0.6, 0.14, 0.44], [-3.0, FY + 0.07 + i * 0.15, -0.6], s.material(pick(['#3d6fb5', '#b3302a', '#3d8f5a']))).rotation.y = (random() - 0.5) * 0.15;
      for (let i = 0; i < 5; i++) put('box', -3.2 + i * 0.1, FY + 0.47, -0.6, 0.09, 0.1, 0.26, pick(['#f6f3ea', '#c98f4a', '#f6f3ea']));
      for (let i = 0; i < 2; i++) { s.box([0.32, 0.2, 0.4], [-3.05, FY + 0.1 + i * 0.2, -1.5 - i * 0.03], s.material('#e6e1d2', { roughness: 1 })); s.box([0.33, 0.21, 0.03], [-3.05, FY + 0.1 + i * 0.2, -1.5], s.material('#c9a23a')); }
    }

    // In the aisle.
    const AX = 1.9, AZ = -1.25;
    if (a.aisle === 'boxes') for (let i = 0; i < 4 + Math.floor(random() * 3); i++) {
      const col = i % 2, row = Math.floor(i / 2);
      s.box([0.5, 0.36, 0.4], [AX + col * 0.52 + (random() - 0.5) * 0.05, FY + 0.18 + row * 0.365, AZ + (random() - 0.5) * 0.06], card).rotation.y = (random() - 0.5) * 0.2;
      s.box([0.51, 0.05, 0.08], [AX + col * 0.52, FY + 0.35 + row * 0.365, AZ], s.material('#c9b58a'));
    }
    if (a.aisle === 'mop') {
      s.cylinder(0.19, 0.16, 0.3, [AX, FY + 0.15, AZ], s.material('#f2c21b', { roughness: 0.5 }), 16);
      s.box([0.2, 0.16, 0.14], [AX, FY + 0.36, AZ - 0.1], s.material('#f2c21b'));
      s.rod([AX + 0.03, FY + 0.1, AZ + 0.05], [AX + 0.5, FY + 1.45, AZ - 0.35], 0.016, s.material('#c9a56a'));
      for (const side of [-1, 1]) { const flap = s.label('CAUTION', 0.3, 0.62, [AX + 0.75, FY + 0.3, AZ + 0.5 + side * 0.09], '#16161a', '#f6c81c'); flap.rotation.x = -side * 0.28; }
      const wet = s.cylinder(0.55, 0.55, 0.003, [AX + 0.4, FY + 0.006, AZ + 0.3], new THREE.MeshStandardMaterial({ color: '#9fb4c0', transparent: true, opacity: 0.35, roughness: 0.02, depthWrite: false }), 24);
      wet.castShadow = false;
    }
    if (a.aisle === 'truck') {
      const red = s.material('#b3302a', { metalness: 0.4 });
      s.box([0.46, 0.02, 0.3], [AX, FY + 0.06, AZ + 0.12], red);
      for (const x of [-0.21, 0.21]) { s.rod([AX + x, FY + 0.06, AZ - 0.05], [AX + x, FY + 1.3, AZ - 0.2], 0.016, red); s.cylinder(0.1, 0.1, 0.05, [AX + x * 1.2, FY + 0.1, AZ - 0.09], dark, 16).rotation.z = Math.PI / 2; }
      s.rod([AX - 0.21, FY + 1.3, AZ - 0.2], [AX + 0.21, FY + 1.3, AZ - 0.2], 0.016, red);
      for (let i = 0; i < 3; i++) { s.box([0.44, 0.26, 0.32], [AX, FY + 0.2 + i * 0.27, AZ + 0.1 - i * 0.02], s.material(pick(['#d8262a', '#2452b8', '#1f7a46']))); for (let c = 0; c < 4; c++) put('can', AX - 0.15 + c * 0.1, FY + 0.33 + i * 0.27, AZ + 0.2 - i * 0.02, 0.07, 0.02, 0.07, '#d9dbd6'); }
    }
    // Overflow on the floor when the shop is packed.
    if (mood.density > 0.55) for (let i = 0; i < Math.round(mood.density * 6); i++) {
      const x = -2.6 + i * 0.62, z = GZ + 0.62;
      s.box([0.46, 0.3, 0.34], [x, FY + 0.15, z], card).rotation.y = (random() - 0.5) * 0.2;
      for (let c = 0; c < 4; c++) put(random() < 0.5 ? 'can' : 'box', x - 0.15 + c * 0.1, FY + 0.3, z, 0.08, 0.14 + random() * 0.08, 0.08, loud());
    }

    // Ceiling wires with tube lights and everything that hangs from a clip.
    const WY = 2.68, wires = [-1.05, 0.35, 1.7];
    const wire = s.material('#3a3d40');
    for (const z of wires) { s.rod([X0, WY, z], [X1 - 0.02, WY, z], 0.006, wire); s.rod([X1 - 0.02, FY, z], [X1 - 0.02, WY + 0.04, z], 0.02, steel); }
    const tubeMaterial = new THREE.MeshStandardMaterial({ color: '#fbfdff', emissive: new THREE.Color().setHSL(mix(0.58, 0.12, mood.warmth), 0.6, 0.8), emissiveIntensity: glow * 1.1 });
    for (const [x, z] of [[-1.2, wires[0]], [3.0, wires[0]], [0.9, wires[2]]]) {
      s.box([1.5, 0.05, 0.16], [x, WY - 0.05, z], s.material('#e6e8e6'));
      s.box([1.42, 0.035, 0.05], [x, WY - 0.09, z], tubeMaterial).castShadow = false;
    }
    const swingers: THREE.Group[] = [];
    const hang = (x: number, z: number) => {
      const group = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = true; group.add(mesh); return mesh; };
      const string = (length: number) => add(new THREE.CylinderGeometry(0.003, 0.003, length, 4), wire, [0, -length / 2, 0]);
      const paint = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, ...options });
      if (a.hanging === 'chips') {
        string(0.5);
        for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.17, 0.11, 0.05), paint(loud(), { roughness: 0.3, metalness: 0.2 }), [(random() - 0.5) * 0.02, -0.1 - i * 0.115, 0.02]).rotation.x = 0.2;
      } else if (a.hanging === 'pinatas') {
        string(0.12);
        const colours = [loud(), loud()];
        add(new THREE.IcosahedronGeometry(0.11, 0), paint(colours[0], { flatShading: true }), [0, -0.27, 0]);
        for (let i = 0; i < 6; i++) {
          const t = i / 6 * Math.PI * 2, cone = add(new THREE.ConeGeometry(0.05, 0.17, 6), paint(colours[i % 2]), [Math.cos(t) * 0.15, -0.27 + (i % 2 ? 0.04 : -0.04), Math.sin(t) * 0.15]);
          cone.rotation.set(Math.sin(t) * 1.57, 0, -Math.cos(t) * 1.57);
        }
        add(new THREE.ConeGeometry(0.05, 0.14, 6), paint(colours[1]), [0, -0.43, 0]).rotation.x = Math.PI;
      } else if (a.hanging === 'sachets') {
        const chain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.07, 0.008), paint('#ffffff', { roughness: 0.25, metalness: 0.45 }), 21);
        const colour = [loud(), new THREE.Color('#d9dde0'), loud()];
        for (let c = 0; c < 3; c++) for (let i = 0; i < 7; i++) { chain.setMatrixAt(c * 7 + i, new THREE.Matrix4().makeRotationY(random() * 0.6).setPosition((c - 1) * 0.075, -0.05 - i * 0.068, 0)); chain.setColorAt(c * 7 + i, i % 3 === 2 ? colour[1] : colour[c === 1 ? 2 : 0]); }
        chain.castShadow = true;
        group.add(chain);
      } else if (a.hanging === 'lanterns') {
        string(0.1);
        const red = random() < 0.6, shade = paint(red ? '#d8262a' : '#f6f1e2', { emissive: red ? '#d8262a' : '#fff0c0', emissiveIntensity: glow * 0.5 });
        const body = add(new THREE.SphereGeometry(0.15, 14, 10), shade, [0, -0.27, 0]);
        body.scale.y = red ? 0.9 : 1.25;
        for (const y of [-0.13, -0.41]) add(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), paint('#16161a'), [0, red ? y : y * 1.12 + 0.03, 0]);
      } else if (a.hanging === 'housewares') {
        const kind = Math.floor(random() * 3);
        string(0.14);
        if (kind === 0) for (let i = 0; i < 2; i++) add(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 14, 1, true), paint(pick(['#e8442a', '#2a8ae0', '#f6c81c', '#3ab85a', '#f06aa8']), { side: THREE.DoubleSide }), [0, -0.25 - i * 0.06, 0]);
        if (kind === 1) { add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), paint('#c9a56a'), [0, -0.2, 0]); add(new THREE.SphereGeometry(0.1, 10, 8), paint(pick(['#f06aa8', '#f6c81c', '#58b9b2', '#8a4ad0']), { roughness: 1 }), [0, -0.37, 0]).scale.set(0.8, 1.3, 0.8); }
        if (kind === 2) for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.11, 0.016, 6, 16), paint(pick(['#f3f1ea', '#2a8ae0', '#f6c81c'])), [0, -0.27, (i - 1) * 0.03]);
      } else {
        const kind = Math.floor(random() * 3);
        string(0.1);
        if (kind === 0) for (let i = 0; i < 6; i++) { const banana = add(new THREE.TorusGeometry(0.13, 0.026, 6, 8, 1.5), paint(random() < 0.6 ? '#e6c22e' : '#7f9a2e'), [0, -0.12, 0]); banana.rotation.set(0, i / 6 * Math.PI * 2, -2.3); }
        if (kind === 1) for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.04, 8, 6), paint('#f1ebdc'), [(i % 2 ? 1 : -1) * 0.03, -0.13 - i * 0.055, 0]);
        if (kind === 2) for (let i = 0; i < 7; i++) add(new THREE.SphereGeometry(0.052, 9, 7), paint(pick(['#f28a1c', '#f5781a', '#e8a81c'])), [(random() - 0.5) * 0.12, -0.18 - (i % 4) * 0.075, (random() - 0.5) * 0.12]);
      }
      group.position.set(x, WY, z);
      group.userData.phase = random() * 9;
      s.root.add(group);
      swingers.push(group);
    };
    const clips = Math.round(mix(8, 22, mood.density));
    for (let i = 0; i < clips; i++) {
      const z = wires[i % 3];
      const x = mix(X0 + 0.5, X1 - 0.5, (Math.floor(i / 3) + 0.2 + random() * 0.6) / Math.ceil(clips / 3));
      hang(x, z);
    }
    if (a.place === 'tiendita' || mood.cheer > 0.8) {
      // Paper bunting along the front wire.
      const flags = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.22), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), 30);
      for (let i = 0; i < 30; i++) { flags.setMatrixAt(i, new THREE.Matrix4().makeRotationX((random() - 0.5) * 0.3).setPosition(X0 + 0.3 + i * 0.28, WY - 0.13, wires[1] + 0.7)); flags.setColorAt(i, new THREE.Color(['#e83a8a', '#f2c53a', '#2a9ad0', '#3ab85a', '#f2742a', '#8a4ad0'][i % 6])); }
      s.root.add(flags);
      s.rod([X0, WY, wires[1] + 0.7], [X1 - 0.02, WY, wires[1] + 0.7], 0.004, wire);
    }

    // Commit the goods.
    const geometries = { box: new THREE.BoxGeometry(1, 1, 1), can: new THREE.CylinderGeometry(0.5, 0.5, 1, 10) };
    for (const kind of ['box', 'can'] as const) {
      const list = stock[kind];
      const mesh = new THREE.InstancedMesh(geometries[kind], new THREE.MeshStandardMaterial({ roughness: 0.5 }), Math.max(1, list.length));
      mesh.count = list.length;
      list.forEach((entry, index) => { mesh.setMatrixAt(index, entry.m); mesh.setColorAt(index, entry.c); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    const sway = mix(0.01, 0.09, mood.energy), speed = mix(0.5, 2.2, mood.energy);
    world.update = (_dt, time) => {
      for (const group of swingers) { const p = group.userData.phase as number; group.rotation.set(Math.sin(time * speed + p) * sway, 0, Math.cos(time * speed * 0.8 + p) * sway); }
      tubeMaterial.emissiveIntensity = glow * 1.1 * (1 - (Math.sin(time * 31) * Math.sin(time * 4.7) > 0.8 ? mood.wear * 0.5 : 0));
    };
    return world;
  },
});
