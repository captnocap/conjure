import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, choice, defineWorld, diorama, mix, noul, paint, paintHex, score } from '@conjure/kit';

type P = [number, number, number];

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** A concrete apartment front: rows of windows and balconies, a few lit, plus the matching glow map. */
function facade(random: () => number, lit: number) {
  const cols = 5, rows = 8;
  const marks: { x: number; y: number; on: boolean }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) marks.push({ x: 10 + c * 24, y: 8 + r * 30, on: random() < lit });
  const map = canvasTexture(128, 256, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(90,70,50,${0.05 + random() * 0.1})`; g.fillRect(random() * 128, random() * 256, 30, 40); }
    for (const m of marks) { g.fillStyle = '#4a4440'; g.fillRect(m.x, m.y, 12, 16); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(m.x - 2, m.y + 17, 16, 3); }
  });
  const glow = canvasTexture(128, 256, (g) => {
    g.fillStyle = '#000000'; g.fillRect(0, 0, 128, 256);
    for (const m of marks) if (m.on) { g.fillStyle = '#ffc070'; g.fillRect(m.x, m.y, 12, 16); }
  });
  return { map, glow };
}

function puffMap() {
  return canvasTexture(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.4)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  });
}

export default defineWorld({
  questions: {
    river: choice('What is on the river?', {
      feluccas: 'White feluccas leaning under their slanting sails, a few rowboats.',
      partyboats: 'Gaudy party boats strung with neon and coloured bulbs, music across the water.',
      cruisers: 'Long white cruise boats moored along the far bank, a felucca or two between.',
      empty: 'Empty, glassy brown water, one fisherman in a skiff.',
    }),
    skyline: choice('What crowds the far bank?', {
      minarets: 'The old city: a forest of pencil minarets and domes over flat roofs.',
      towers: 'Hotel towers and office blocks along the corniche, signs on their tops.',
      both: 'Both: concrete towers in front, the minarets and domes rising behind.',
    }),
    pyramids: noul('Can the pyramids be made out on the far horizon?'),
    citadel: noul('Does the Citadel mosque stand on the ridge, its domes and needle minarets in silhouette?'),
    prayer: noul('Is the call to prayer sounding: loudspeakers on the nearest minaret, every balcony ring lit, birds lifting?'),
    coop: choice('What about the pigeon coop on the roof?', {
      flying: 'A tall wooden pigeon tower with the flock wheeling round it.',
      roosting: 'The pigeon tower with its birds lined up on the slats.',
      none: 'No coop, only tanks and dishes.',
    }),
    laundry: score('How much laundry hangs on the lines?', ['Bare lines', 'A few shirts', 'Lines full of sheets and clothes']),
    roof: choice('What else is on the roof?', {
      chairs: 'Plastic chairs round a tray of tea glasses.',
      lights: 'A string of coloured bulbs and a Ramadan lantern over a carpet.',
      junk: 'Junk: a broken sofa, crates and an old satellite receiver.',
      bare: 'Nothing more, bare concrete and rebar stubs.',
    }),
    cloth: paint('What colour dominates the laundry and the roof cloths?', ['white', 'red', 'blue', 'pink', 'yellow', 'green', 'turquoise', 'orange', 'purple']),
    neon: paint('What colour are the city\'s lights and the lotus tower at dusk?', ['blue', 'turquoise', 'magenta', 'green', 'amber', 'purple', 'red', 'white']),
  },

  build(a, context) {
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const glow = Math.min(1, Math.max(0, lowSun * 1.3 - 0.3));
    const dust = Math.min(1, 0.25 + mood.wear * 0.75);
    const warm = mood.warmth;

    // Sky and haze colours: pale and white-blue at noon, pink-gold toward first and last light, browner with dust.
    const horizon = new THREE.Color('#efe7d6').lerp(new THREE.Color('#f3c690'), lowSun * 0.85).lerp(new THREE.Color('#dcc19a'), dust * 0.35);
    horizon.lerp(new THREE.Color('#d8dee6'), (1 - warm) * 0.25 * (1 - lowSun));
    const zenith = new THREE.Color('#c9dae6').lerp(new THREE.Color('#e3a9a2'), lowSun * 0.8).lerp(new THREE.Color('#d6c3a4'), dust * 0.3);
    const haze = (base: THREE.ColorRepresentation, amount: number) => new THREE.Color(base).lerp(horizon, Math.min(0.96, amount));

    const HERO: [number, number] = [0.4, 1.3];
    const { art: s, world } = diorama(context, {
      background: horizon.getStyle(), floor: '#b9ab94', width: 14, depth: 10.5, pitch: 22, yaw: 20, maxHeight: 4.4, radius: 2.3,
      slots: [[HERO[0], HERO[1]], [-3.4, 2.7, 0, 0.8], [3.6, 2.9, 0, 0.8], [-2.0, -2.4, 0, 0.65], [2.4, -2.2, 0, 0.65], [-5.4, 3.8, 0, 0.55]],
      viewBox: [[-7, 0, -5.6], [7, 11.5, 5.4]],
    });
    const { root } = s;
    if (world.keyLight) world.keyLight.color.lerp(new THREE.Color('#ffc890'), lowSun * 0.6);

    // ---------- The roof ----------
    const concrete = s.material(new THREE.Color('#c9bba4').lerp(new THREE.Color('#8f8574'), mood.wear * 0.5), { roughness: 0.95 });
    const plaster = s.material(new THREE.Color('#d8c3a0').lerp(new THREE.Color('#9e8c74'), mood.wear * 0.5), { roughness: 0.95 });
    const steel = s.material('#9aa0a4', { metalness: 0.5, roughness: 0.45 });
    const dark = s.material('#2a2724', { roughness: 0.8 });
    const wood = s.material('#7a5a3c', { roughness: 0.85 });
    const clothHex = paintHex(a.cloth), neonHex = paintHex(a.neon);

    // Parapet round the back and sides, a stair hut, rebar stubs.
    s.box([14, 1.1, 0.3], [0, 0.55, -5.1], plaster);
    s.box([14.2, 0.12, 0.42], [0, 1.14, -5.1], concrete);
    for (const x of [-1, 1]) s.box([0.3, 0.9, 10.2], [x * 6.9, 0.45, 0], plaster);
    s.box([2.6, 2.5, 2.6], [-5.4, 1.25, -3.5], plaster);
    s.box([2.8, 0.15, 2.8], [-5.4, 2.55, -3.5], concrete);
    s.box([0.9, 1.9, 0.06], [-4.9, 0.95, -2.17], s.material('#4f6a6a', { roughness: 0.7 }));
    const rebar: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) rebar.push(new THREE.CylinderGeometry(0.02, 0.02, 0.5 + random() * 0.4, 5).translate(-6.5 + random() * 2.3, 2.85, -4.6 + random() * 2.2));
    // Water tanks on stands: on the hut and along the back.
    const tankColours = ['#2a2a2c', '#d8d0bc', '#3a5a7a'];
    const tank = (x: number, y: number, z: number, i: number) => {
      for (const dx of [-0.35, 0.35]) for (const dz of [-0.35, 0.35]) s.rod([x + dx, y, z + dz], [x + dx, y + 0.5, z + dz], 0.03, steel);
      s.cylinder(0.55, 0.55, 1.1, [x, y + 1.05, z], s.material(tankColours[i % 3], { roughness: 0.6 }), 18);
      s.cylinder(0.25, 0.3, 0.12, [x, y + 1.66, z], s.material(tankColours[i % 3]), 12);
    };
    tank(-6.0, 2.62, -3.6, 0); tank(-4.8, 2.62, -3.4, 1); tank(-2.9, 0, -4.4, 2); tank(-1.7, 0, -4.4, 0);
    // Satellite dishes on poles and brackets, all staring at the same patch of southern sky.
    const dishMat = s.material('#e4e2dc', { roughness: 0.5, side: THREE.DoubleSide });
    const dishGeo = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, 0.6);
    const dishSpots: P[] = [[-0.4, 1.2, -5.0], [0.9, 1.2, -5.0], [2.2, 1.2, -5.0], [3.5, 1.2, -5.0], [-4.4, 2.6, -2.4], [-6.3, 2.6, -2.4], [6.8, 0.9, 1.5], [6.8, 0.9, -1.2]];
    const dishes = Math.round(4 + mood.density * 4);
    for (let i = 0; i < Math.min(dishes, dishSpots.length); i++) {
      const [x, y, z] = dishSpots[i];
      const r = 0.38 + random() * 0.22;
      s.rod([x, y, z], [x, y + 0.7, z], 0.03, steel);
      const dish = s.mesh(dishGeo, dishMat, [x, y + 0.85, z + 0.1]);
      dish.scale.setScalar(r);
      dish.rotation.set(-1.0 - random() * 0.15, 0.6 + (random() - 0.5) * 0.2, 0, 'YXZ');
      s.rod([x, y + 0.85, z + 0.1], [x + 0.25, y + 1.15, z + 0.45], 0.012, steel);
    }
    // Laundry lines between poles, clothes from the paint answer and its neighbours.
    const lines: [P, P][] = [[[-6.6, 2.1, 0.5], [-1.9, 2.1, 0.3]], [[-6.6, 2.1, -0.9], [-1.9, 2.1, -1.1]]];
    for (const [p0, p1] of lines) { s.rod([p0[0], 0, p0[2]], p0, 0.035, steel); s.rod([p1[0], 0, p1[2]], p1, 0.035, steel); s.tube([p0, [(p0[0] + p1[0]) / 2, p0[1] - 0.18, (p0[2] + p1[2]) / 2], p1], 0.01, dark); }
    const laundry: THREE.Mesh[] = [];
    const clothColours = [clothHex, '#f4f2ec', clothHex, '#3a5a8a', '#e8c84a', '#c23a4a', '#f4f2ec'];
    const pieces = Math.round(a.laundry * 14);
    for (let i = 0; i < pieces; i++) {
      const [p0, p1] = lines[i % 2];
      const t = (Math.floor(i / 2) + 0.5) / 7;
      const x = mix(p0[0], p1[0], t), z = mix(p0[2], p1[2], t), y = p0[1] - Math.sin(t * Math.PI) * 0.18;
      const sheet = random() < 0.35;
      const w = sheet ? 0.75 : 0.45, h = sheet ? 1.1 : 0.55;
      const piece = s.mesh(new THREE.PlaneGeometry(w, h), s.material(clothColours[Math.floor(random() * clothColours.length)], { roughness: 0.95, side: THREE.DoubleSide }), [x, y - h / 2, z]);
      piece.geometry.translate(0, 0, 0);
      laundry.push(piece);
    }
    // The pigeon tower: a tall timber frame of slats with nest boxes, the flock round it.
    const birds: { mesh: THREE.Object3D; r: number; y: number; phase: number; speed: number }[] = [];
    if (a.coop !== 'none') {
      const cx = 5.4, cz = -3.3, H = 5.2;
      for (const dx of [-0.8, 0.8]) for (const dz of [-0.8, 0.8]) s.rod([cx + dx, 0, cz + dz], [cx + dx * 0.55, H, cz + dz * 0.55], 0.05, wood);
      const slats: THREE.BufferGeometry[] = [];
      for (let y = 0.6; y < H; y += 0.45) { const k = 1 - (y / H) * 0.45; slats.push(new THREE.BoxGeometry(1.7 * k, 0.04, 0.06).translate(cx, y, cz + 0.8 * k), new THREE.BoxGeometry(1.7 * k, 0.04, 0.06).translate(cx, y, cz - 0.8 * k), new THREE.BoxGeometry(0.06, 0.04, 1.7 * k).translate(cx + 0.8 * k, y, cz), new THREE.BoxGeometry(0.06, 0.04, 1.7 * k).translate(cx - 0.8 * k, y, cz)); }
      s.mesh(mergeGeometries(slats), wood);
      s.box([1.4, 1.0, 1.4], [cx, 1.3, cz], s.material('#8a6a4a', { roughness: 0.9 }));
      s.box([1.0, 0.06, 1.0], [cx, H + 0.03, cz], wood);
      s.rod([cx, H, cz], [cx, H + 1.4, cz], 0.025, wood);
      s.box([0.5, 0.35, 0.01], [cx + 0.27, H + 1.2, cz], s.material(clothHex, { side: THREE.DoubleSide }));
      const pigeonMat = s.material('#6a6c74', { side: THREE.DoubleSide });
      if (a.coop === 'roosting') s.scatter(new THREE.SphereGeometry(1, 6, 4), pigeonMat, Array.from({ length: 26 }, (_u, i) => { const y = 0.6 + (i % 9) * 0.45 + 0.08, k = 1 - (y / H) * 0.45; return { at: [cx + (random() - 0.5) * 1.4 * k, y, cz + 0.8 * k] as P, size: 0.09 }; }));
      else for (let i = 0; i < 22; i++) {
        const bird = new THREE.Group();
        for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.08), pigeonMat); wing.position.x = side * 0.1; wing.rotation.z = side * 0.35; bird.add(wing); }
        root.add(bird);
        birds.push({ mesh: bird, r: 1.5 + random() * 2.5, y: H + 0.5 + random() * 2.5, phase: random() * 6.3, speed: (0.5 + random() * 0.4) * (random() < 0.5 ? 1 : -1) });
      }
    }
    // What else is up here.
    if (a.roof === 'chairs') {
      const plastic = s.material(['#f4f2ec', '#c23a2a', '#2e6aa8'][Math.floor(random() * 3)], { roughness: 0.5 });
      for (let i = 0; i < 3; i++) {
        const x = -1.2 + i * 1.1, z = 3.9 + (i % 2) * 0.3;
        s.box([0.45, 0.05, 0.45], [x, 0.45, z], plastic);
        s.box([0.45, 0.5, 0.05], [x, 0.72, z - 0.22], plastic);
        for (const dx of [-0.2, 0.2]) for (const dz of [-0.2, 0.2]) s.rod([x + dx, 0, z + dz], [x + dx, 0.45, z + dz], 0.02, plastic);
      }
      s.cylinder(0.25, 0.25, 0.02, [-0.1, 0.5, 3.3], steel, 16);
      s.rod([-0.1, 0, 3.3], [-0.1, 0.5, 3.3], 0.03, steel);
      s.scatter(new THREE.CylinderGeometry(0.6, 0.5, 1, 8), s.material('#c86a2a', { transparent: true, opacity: 0.7 }), Array.from({ length: 4 }, () => ({ at: [-0.1 + (random() - 0.5) * 0.3, 0.55, 3.3 + (random() - 0.5) * 0.3] as P, size: 0.05 })));
    }
    if (a.roof === 'lights') {
      s.box([2.4, 0.02, 1.6], [-0.4, 0.01, 3.7], s.material(clothHex, { roughness: 1 }));
      const poleA: P = [-6.5, 2.6, 4.6], poleB: P = [6.5, 2.6, 4.6];
      s.rod([poleA[0], 0, poleA[2]], poleA, 0.03, steel); s.rod([poleB[0], 0, poleB[2]], poleB, 0.03, steel);
      const bulbs: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i <= 30; i++) { const t = i / 30; bulbs.push({ at: [mix(poleA[0], poleB[0], t), 2.6 - Math.sin(t * Math.PI) * 0.6, 4.6], size: 0.06, color: ['#ffd35a', '#ff5aa8', '#5ad2ff', '#a8ff5a', neonHex][i % 5] }); }
      s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe6a0', emissiveIntensity: mix(0.7, 2, glow) }), bulbs);
      s.lathe([[0, 0], [0.12, 0.04], [0.16, 0.22], [0.1, 0.4], [0.02, 0.5], [0, 0.52]], new THREE.MeshStandardMaterial({ color: '#f0c050', emissive: '#ffb030', emissiveIntensity: mix(0.6, 2, glow) }), [0.2, 1.6, 4.6]);
    }
    if (a.roof === 'junk') {
      s.box([2.0, 0.45, 0.8], [4.6, 0.32, 4.3], s.material('#6a4a5a', { roughness: 1 }));
      s.box([2.0, 0.6, 0.25], [4.6, 0.75, 4.0], s.material('#6a4a5a', { roughness: 1 }));
      s.scatter(new THREE.BoxGeometry(1, 1, 1), wood, Array.from({ length: 5 }, (_u, i) => ({ at: [-1 + (i % 3) * 0.55, 0.25 + Math.floor(i / 3) * 0.5, 4.2] as P, size: 0.5 })));
    }
    if (a.roof === 'bare') for (let i = 0; i < 12; i++) rebar.push(new THREE.CylinderGeometry(0.02, 0.02, 0.6 + random() * 0.4, 5).translate(-6 + i * 1.1, 1.5, -5.1));
    s.mesh(mergeGeometries(rebar), s.material('#6a4a3a'));
    // The building itself below the roof: top floors of a Zamalek block, balconies and shutters.
    {
      const { map } = facade(random, 0);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(4, 3);
      s.box([14.2, 24, 10.7], [0, -12.25, 0], new THREE.MeshStandardMaterial({ color: new THREE.Color('#d8c4a2').lerp(new THREE.Color('#9e8c74'), mood.wear * 0.5), map, roughness: 0.95 }));
    }

    // ---------- The view: layered flats attached to the camera after placement ----------
    const vista = new THREE.Group();
    root.add(vista);
    const V = (geo: THREE.BufferGeometry, mat: THREE.Material, at: P) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...at);
      vista.add(mesh);
      return mesh;
    };
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const B = (geo: THREE.BufferGeometry, mat: THREE.Material, at: P) => {
      const g = (geo.index ? geo.toNonIndexed() : geo).translate(...at);
      if (geo.index) geo.dispose();
      const list = batches.get(mat) ?? [];
      list.push(g);
      batches.set(mat, list);
    };
    const flat = (hex: THREE.ColorRepresentation, amount: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: haze(hex, amount), roughness: 0.95, emissive: haze(hex, amount), emissiveIntensity: 0.25 + amount * 0.5, ...extra });
    const shape = (pts: readonly (readonly [number, number])[]) => { const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath(); return new THREE.ShapeGeometry(sh); };

    // Sky: a gradient sheet with the sun low on the side the day is on.
    const sunSide = mood.daylight < 0.5 ? -1 : 1;
    const skyMap = canvasTexture(64, 256, (g) => {
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, `#${zenith.getHexString()}`); grad.addColorStop(0.75, `#${horizon.getHexString()}`); grad.addColorStop(1, `#${horizon.getHexString()}`);
      g.fillStyle = grad; g.fillRect(0, 0, 64, 256);
    });
    V(new THREE.PlaneGeometry(260, 160), new THREE.MeshBasicMaterial({ map: skyMap, depthWrite: false, toneMapped: false }), [0, 60, -560]).renderOrder = -10;
    const sunY = mix(52, 18, lowSun);
    V(new THREE.CircleGeometry(mix(3, 4.6, lowSun), 32), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6e0').lerp(new THREE.Color('#ffb070'), lowSun * 0.7), transparent: true, opacity: mix(0.55, 0.92, lowSun) * (1 - dust * 0.45), depthWrite: false, toneMapped: false }), [sunSide * mix(10, 38, lowSun), sunY, -540]);

    // Pyramids: pale triangles on the far desert line, nearly gone in heavy dust.
    if (a.pyramids) {
      const amount = 0.28 + dust * 0.6;
      const desert = flat('#d8b884', amount);
      V(new THREE.PlaneGeometry(90, 3), desert, [-20, 14.8, -470]);
      const pyr = (x: number, w: number, h: number, tone: string) => {
        V(shape([[x - w / 2, 0], [x, h], [x, 0]]), flat(tone, amount), [0, 15.5, -460]);
        V(shape([[x, 0], [x, h], [x + w / 2, 0]]), flat('#b89a6a', amount), [0, 15.5, -460]);
      };
      pyr(-40, 13, 8.2, '#e2c690'); pyr(-28, 12.4, 7.8, '#e2c690'); pyr(-19.5, 5.6, 3.4, '#e2c690');
    }
    // The Mokattam ridge and the Citadel on it.
    {
      const amount = 0.28 + dust * 0.38;
      const ridgePts: [number, number][] = [[-14, 0]];
      for (let i = 0; i <= 16; i++) { const x = -14 + i * 4.5; ridgePts.push([x, 5.2 + Math.sin(i * 1.7) * 0.6 + (i > 6 && i < 12 ? 1.6 : 0) + random() * 0.5]); }
      ridgePts.push([58, 0]);
      V(shape(ridgePts), flat('#c49c68', amount), [0, 14.5, -400]);
      if (a.citadel) {
        const stone = flat('#d8c4a0', amount), lead = flat('#8a9099', amount);
        const cx = 22, cy = 14.5 + 6.6;
        V(new THREE.PlaneGeometry(16, 1.6), flat('#b89a70', amount), [cx, cy + 0.2, -395]);
        V(new THREE.PlaneGeometry(5.5, 2.6), stone, [cx, cy + 2.2, -394]);
        V(new THREE.CircleGeometry(2.1, 24, 0, Math.PI), lead, [cx, cy + 3.5, -393]);
        for (const dx of [-2.6, 2.6]) V(new THREE.CircleGeometry(1.1, 16, 0, Math.PI), lead, [cx + dx, cy + 3.5, -393.5]);
        V(new THREE.PlaneGeometry(0.06, 1.0), flat('#c9a64a', amount * 0.6), [cx, cy + 6, -393]);
        for (const dx of [-3.4, 3.4]) {
          V(new THREE.PlaneGeometry(0.34, 9), stone, [cx + dx, cy + 4.5, -392]);
          V(shape([[-0.24, 0], [0, 1.8], [0.24, 0]]), lead, [cx + dx, cy + 9, -392]);
          V(new THREE.PlaneGeometry(0.6, 0.18), new THREE.MeshBasicMaterial({ color: neonHex, transparent: true, opacity: (a.prayer ? 0.9 : 0.55) * Math.max(glow, a.prayer ? 0.6 : 0), depthWrite: false }), [cx + dx, cy + 6.8, -391.5]);
        }
      }
    }
    // Dust veils between the far layers.
    const puff = puffMap();
    const veil = (y: number, z: number, opacity: number, w = 160, h = 12) => {
      if (opacity < 0.03) return;
      V(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: puff, color: horizon, transparent: true, opacity, depthWrite: false }), [(random() - 0.5) * 20, y, z]).renderOrder = -5;
    };
    for (let i = 0; i < 3; i++) veil(15.5 + i * 2, -430 + i * 6, 0.25 + dust * 0.35, 200, 14);

    // The old city: flat roofs, domes and a forest of pencil minarets.
    const minaretTips: THREE.Vector3[] = [];
    const ringMat = new THREE.MeshBasicMaterial({ color: neonHex, transparent: true, opacity: Math.min(0.95, (a.prayer ? 0.75 : 0.1) + glow * 0.6), depthWrite: false });
    if (a.skyline !== 'towers') {
      const amount = 0.2 + dust * 0.3;
      const roofs = flat('#c8b08a', amount), stone = flat('#dccaa8', amount), dome = flat('#9a9a92', amount);
      const roofPts: [number, number][] = [[-52, 0]];
      for (let x = -52; x <= 52; x += 2.2 + random() * 2) roofPts.push([x, 1.4 + random() * 2.2], [x + 1.8, 1.4 + random() * 2.2]);
      roofPts.push([52, 0]);
      V(shape(roofPts), roofs, [0, 14, -330]);
      for (let i = 0; i < 18; i++) {
        const x = -48 + random() * 96, base = 14 + 2.2;
        if (random() < 0.45) B(new THREE.CircleGeometry(0.9 + random() * 1.6, 18, 0, Math.PI), dome, [x, base + 0.6, -325]);
        else {
          const h = 4 + random() * 6;
          B(new THREE.PlaneGeometry(0.42, h), stone, [x, base + h / 2, -324]);
          for (const f of [0.55, 0.8]) { B(new THREE.PlaneGeometry(0.85, 0.22), stone, [x, base + h * f, -323.8]); B(new THREE.PlaneGeometry(0.8, 0.12), ringMat, [x, base + h * f + 0.18, -323.6]); }
          B(shape([[-0.3, 0], [0, 1.1], [0.3, 0]]), random() < 0.5 ? dome : stone, [x, base + h, -324]);
          minaretTips.push(new THREE.Vector3(x, base + h, -324));
        }
      }
    }
    // The mid-ground: concrete blocks on the far bank, the lotus tower, hotel towers.
    {
      const amount = 0.12 + dust * 0.25;
      const lit = 0.15 + glow * 0.6;
      const blocks = a.skyline === 'minarets' ? 9 : 15;
      for (let i = 0; i < blocks; i++) {
        const { map, glow: glowMap } = facade(random, lit);
        const tall = a.skyline !== 'minarets' && random() < 0.35;
        const x = -50 + (i + random() * 0.6) * (100 / blocks);
        const w = 3 + random() * 4, h = a.pyramids && x < -14 ? 1.5 + random() * 1.5 : tall ? 9 + random() * 9 : 2.5 + random() * 4;
        const tone = ['#d8c8a8', '#c9b08c', '#bcae9a', '#e0d4bc', '#a8988a'][Math.floor(random() * 5)];
        V(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: haze(tone, amount), map, emissive: new THREE.Color(neonHex).lerp(new THREE.Color('#ffc070'), 0.6), emissiveMap: glowMap, emissiveIntensity: mix(0.2, 1.5, glow), roughness: 0.95 }), [x, 14.6 + h / 2, -250 - i % 3]);
        if (tall && random() < 0.6) V(new THREE.PlaneGeometry(w * 0.7, 0.6), new THREE.MeshBasicMaterial({ color: neonHex, transparent: true, opacity: 0.35 + glow * 0.6, depthWrite: false }), [x, 14.6 + h + 0.5, -249]);
      }
      // The lotus tower: a slim lattice shaft swelling into a bud, a deck and a mast.
      const tx = -30, base = 14.6;
      const lattice = canvasTexture(32, 256, (g) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 32, 256);
        g.strokeStyle = 'rgba(90,80,70,0.55)'; g.lineWidth = 2;
        for (let y = -32; y < 256; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(32, y + 16); g.moveTo(32, y); g.lineTo(0, y + 16); g.stroke(); }
      });
      const towerMat = new THREE.MeshStandardMaterial({ color: haze('#d8ccb6', amount), map: lattice, emissive: neonHex, emissiveIntensity: glow * 0.9, roughness: 0.9 });
      V(new THREE.PlaneGeometry(1.4, 20), towerMat, [tx, base + 10, -246]);
      V(shape([[-0.7, 0], [-1.3, 1.6], [-1.15, 3], [1.15, 3], [1.3, 1.6], [0.7, 0]]), towerMat, [tx, base + 20, -246]);
      V(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshStandardMaterial({ color: '#3a3a3a', emissive: '#ffcf7a', emissiveIntensity: mix(0.2, 1.4, glow) }), [tx, base + 23.2, -245.8]);
      V(new THREE.PlaneGeometry(0.12, 4.5), flat('#c8c4bc', amount), [tx, base + 25.6, -246]);
    }
    // The far embankment and its palms.
    {
      const amount = 0.08 + dust * 0.2;
      V(new THREE.PlaneGeometry(130, 1.2), flat('#a89478', amount), [0, 14.2, -200]);
      const palm = flat('#4f6a3a', amount + 0.1), trunk = flat('#8a7a62', amount);
      for (let i = 0; i < 16; i++) {
        const x = -55 + i * 7 + random() * 3, h = 2 + random() * 1.2;
        B(new THREE.PlaneGeometry(0.14, h), trunk, [x, 14.6 + h / 2, -198]);
        B(new THREE.CircleGeometry(0.9, 10).scale(1, 0.45, 1), palm, [x, 14.6 + h, -197.5]);
      }
      if (a.river === 'cruisers') for (let i = 0; i < 4; i++) {
        const x = -40 + i * 22 + random() * 4;
        V(new THREE.PlaneGeometry(12, 1.4), flat('#f2efe6', amount), [x, 14.2, -190]);
        V(new THREE.PlaneGeometry(10, 0.9), flat('#f2efe6', amount), [x, 15.2, -190]);
        V(new THREE.PlaneGeometry(10, 0.25), new THREE.MeshBasicMaterial({ color: '#2a3a4a' }), [x, 14.6, -189.8]);
      }
    }
    // The river: a broad band of water with a path of sunlight on it.
    const water = new THREE.Color('#6f8f92').lerp(new THREE.Color('#8a7a5a'), dust * 0.3).lerp(horizon, 0.15).lerp(new THREE.Color('#c88a6a'), lowSun * 0.25);
    V(new THREE.PlaneGeometry(140, 17), new THREE.MeshStandardMaterial({ color: water, roughness: 0.3, metalness: 0.2, emissive: water, emissiveIntensity: 0.35 }), [0, 5.8, -150]);
    const ripple = flat('#e8ecea', 0.2, { transparent: true, opacity: 0.5 });
    for (let i = 0; i < 26; i++) { const y = 0.5 + random() * 13.5; B(new THREE.PlaneGeometry(3 + random() * 8, 0.08 + y * 0.004), ripple, [-55 + random() * 110, y, -149.5]); }
    const glitter = canvasTexture(64, 256, (g) => { for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,240,210,${0.3 + random() * 0.6})`; g.fillRect(random() * 64, random() * 256, 4 + random() * 14, 2); } });
    V(new THREE.PlaneGeometry(10, 14), new THREE.MeshBasicMaterial({ map: glitter, color: new THREE.Color('#fff0d0').lerp(new THREE.Color('#ffb070'), lowSun * 0.6), transparent: true, opacity: mix(0.3, 0.85, lowSun), depthWrite: false }), [sunSide * mix(10, 30, lowSun) * 0.7, 6.8, -148]);
    const boats: { mesh: THREE.Object3D; x0: number; speed: number }[] = [];
    const felucca = (x: number, y: number, k: number) => {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(shape([[-1.6, 0.25], [1.8, 0.35], [1.3, -0.15], [-1.3, -0.15]]), flat(['#2a4a7a', '#f2efe6', '#3a7a5a'][Math.floor(random() * 3)], 0.1));
      const sail = new THREE.Mesh(shape([[1.4, 0.4], [-1.6, 4.8], [-0.9, 0.6]]), flat('#f6f2e8', 0.12));
      sail.position.z = 0.05;
      g.add(hull, sail);
      g.scale.setScalar(k);
      g.position.set(x, y, -140 + y);
      vista.add(g);
      boats.push({ mesh: g, x0: x, speed: 0.15 + random() * 0.2 });
    };
    if (a.river === 'feluccas' || a.river === 'cruisers') for (let i = 0; i < (a.river === 'feluccas' ? 6 : 2); i++) { const y = 1 + random() * 11; felucca(-45 + random() * 90, y, mix(1.6, 0.6, y / 12)); }
    if (a.river === 'partyboats') for (let i = 0; i < 3; i++) {
      const y = 1.5 + i * 3.5 + random(), k = mix(1.8, 0.8, y / 12), x = -35 + i * 30 + random() * 8;
      const g = new THREE.Group();
      const hull = new THREE.Mesh(shape([[-3.4, 0.5], [3.9, 0.7], [3.1, -0.5], [-3.2, -0.5]]), flat('#f2efe6', 0.08));
      const portholes = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.22), new THREE.MeshStandardMaterial({ color: '#2a3440', emissive: '#ffc070', emissiveIntensity: glow }));
      portholes.position.set(0.2, 0.05, 0.02);
      const cabin = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.0), flat('#e8dcc0', 0.08));
      cabin.position.set(0, 1.2, -0.01);
      const canopy = new THREE.Mesh(shape([[-3, 1.7], [3, 1.7], [2.4, 2.5], [-2.4, 2.5]]), flat(neonHex, 0.05));
      g.add(hull, portholes, cabin, canopy);
      for (let b = 0; b < 12; b++) {
        const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), new THREE.MeshBasicMaterial({ color: ['#ffd35a', '#ff5aa8', '#5ad2ff', '#a8ff5a'][b % 4] }));
        const t = b / 11; bulb.position.set(-3 + t * 6.6, 0.65 - Math.sin(t * Math.PI) * 0.1 + (b % 2) * 1.95, 0.05);
        g.add(bulb);
      }
      g.scale.setScalar(k);
      g.position.set(x, y, -140 + y);
      vista.add(g);
      boats.push({ mesh: g, x0: x, speed: 0.1 });
    }
    if (a.river === 'empty') {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(shape([[-1.2, 0.2], [1.3, 0.25], [0.9, -0.1], [-0.9, -0.1]]), flat('#3a3028', 0.1)));
      const man = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), flat('#2a2622', 0.1)); man.position.set(0, 0.8, 0.02);
      const body = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), flat('#2a2622', 0.1)); body.position.set(0, 0.45, 0.02);
      g.add(man, body);
      g.position.set(12, 4, -136);
      vista.add(g);
      boats.push({ mesh: g, x0: 12, speed: 0.05 });
    }
    // Below the river line, beside our building: the lower roofs of the neighbours, their tanks and dishes.
    {
      const near = flat('#b8a88c', 0.04), nearDark = flat('#8f826e', 0.04), tankFlat = flat('#3a3a3c', 0.04), dishFlat = flat('#e4e2dc', 0.04);
      B(new THREE.PlaneGeometry(160, 60), nearDark, [0, -30.5, -112]);
      for (let i = 0; i < 26; i++) {
        const x = -78 + i * 6.2 + random() * 2, top = -1.5 - random() * 5, w = 5 + random() * 3;
        B(new THREE.PlaneGeometry(w, 40), random() < 0.5 ? near : flat('#c9b89a', 0.04), [x, top - 20, -111 + (i % 2) * 0.3]);
        if (random() < 0.6) B(new THREE.PlaneGeometry(1.1, 1.4), tankFlat, [x + (random() - 0.5) * w * 0.6, top + 0.7, -110.4]);
        if (random() < 0.5) B(new THREE.CircleGeometry(0.6, 12), dishFlat, [x + (random() - 0.5) * w * 0.6, top + 1.0, -110.3]);
      }
    }
    // Haze close over the river, thick with dust.
    veil(13, -180, 0.06 + dust * 0.22, 180, 6);

    // Call to prayer: loudspeaker horns on the nearest minaret tip.
    if (a.prayer && minaretTips.length) {
      const tip = minaretTips.reduce((best, t) => (Math.abs(t.x) < Math.abs(best.x) ? t : best));
      for (const dx of [-0.35, 0.35]) V(shape([[0, -0.15], [dx * 2, -0.3], [dx * 2, 0.3], [0, 0.15]]), flat('#5a5a5a', 0.2), [tip.x, tip.y - 1.2, -323.5]);
    }

    for (const [mat, list] of batches) V(mergeGeometries(list), mat, [0, 0, 0]);
    vista.traverse((node) => { node.castShadow = false; node.receiveShadow = false; });

    // Place the cast with the diorama, then hang the view behind the parapet in the camera's frame.
    const placeBase = world.place.bind(world);
    const VISTA_WIDTH = 100;
    world.place = (items: readonly Placeable[]) => {
      placeBase(items);
      const camera = world.camera as THREE.OrthographicCamera;
      camera.updateMatrixWorld(true);
      const parapet = new THREE.Vector3(0, 1.2, -5.2).applyMatrix4(camera.matrixWorldInverse);
      const width = (camera.right - camera.left) * 1.25;
      const k = width / VISTA_WIDTH;
      // Local y = 0 of the vista sits just under the parapet line; distance stays behind the whole roof.
      const anchor = new THREE.Vector3(0, parapet.y - 14 * k * 0.02 - 0.2 * k, -Math.max(20, -parapet.z + 8) - 0);
      const below = -(parapet.y - camera.bottom);
      void below;
      vista.scale.setScalar(k);
      vista.quaternion.copy(camera.quaternion);
      vista.position.copy(anchor.applyMatrix4(camera.matrixWorld));
      // Push the whole view back so even its nearest flat is far beyond the roof.
      vista.position.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), 0);
      // The vista's local z runs back to -560: keep it inside the camera's far plane.
      camera.far = Math.max(camera.far, -parapet.z + 20 + 600 * k);
      camera.updateProjectionMatrix();
      vista.updateMatrixWorld(true);
    };
    // The vista's flats sit 110+ local units back: shift them so local z -110 lands just behind the roof.
    vista.children.forEach((child) => { child.position.z += 100; });

    const energy = mood.energy;
    world.update = (_dt: number, time: number) => {
      for (const [i, piece] of laundry.entries()) { piece.rotation.x = Math.sin(time * (1 + energy * 2) + i) * 0.25 * (0.2 + energy); }
      for (const b of birds) { const t = time * b.speed * (0.5 + energy) + b.phase; b.mesh.position.set(5.4 + Math.cos(t) * b.r, b.y + Math.sin(t * 2) * 0.3, -3.3 + Math.sin(t) * b.r); b.mesh.rotation.y = -t; (b.mesh.children[0] as THREE.Mesh).rotation.z = 0.35 + Math.sin(time * 12 + b.phase) * 0.4; (b.mesh.children[1] as THREE.Mesh).rotation.z = -0.35 - Math.sin(time * 12 + b.phase) * 0.4; }
      for (const b of boats) b.mesh.position.x = b.x0 + Math.sin(time * 0.05 * b.speed) * 3;
    };
    world.update(0, 0);
    return world;
  },
});
