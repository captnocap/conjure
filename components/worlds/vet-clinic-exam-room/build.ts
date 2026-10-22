import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix } from '@conjure/kit';
import { canvasTexture, poster, type Poster } from './paint';

const W = 4.4, D = 3.8, H = 2.5;
const SCHEMES = {
  mint: { wall: '#eef3ee', dado: '#bcd8c8', cab: '#f4f4f0', accent: '#3f8f7a' },
  blue: { wall: '#eef1f4', dado: '#b9cfe0', cab: '#f2f4f6', accent: '#3a6ea8' },
  peach: { wall: '#f6efe6', dado: '#edc9aa', cab: '#c9a374', accent: '#c8683f' },
  grey: { wall: '#e6e3da', dado: '#c4bfb0', cab: '#d8d4c8', accent: '#77756c' },
  teal: { wall: '#f1f3f1', dado: '#4f9a9e', cab: '#f4f4f0', accent: '#e0a030' },
} as const;

interface Slot { at: [number, number, number]; height: number; radius: number; yaw: number }
const SLOTS: Slot[] = [
  { at: [0, 0.9, 0.1], height: 0.85, radius: 0.46, yaw: 0.35 }, // on the table, under the lamp
  { at: [1.32, 0.055, 1.05], height: 0.75, radius: 0.4, yaw: 0.5 }, // on the floor scale
  { at: [-1.62, 0.47, 0.95], height: 0.58, radius: 0.25, yaw: 0.95 }, // on the owner's chair
  { at: [1.4, 0.92, -1.5], height: 0.52, radius: 0.27, yaw: 0.3 }, // on the counter
  { at: [-0.45, 0, 1.45], height: 0.55, radius: 0.36, yaw: 0.2 }, // on the floor by the table
];

export default defineWorld({
  questions: {
    visit: choice('What kind of visit is this room set for?', {
      checkup: 'A routine check-up: clipboard, a few treats on the table, a roll of good-patient stickers.',
      emergency: 'An emergency: a drip stand by the table, torn gauze wrappers and gloves on the floor.',
      goodbye: 'A last goodbye: a soft blanket on the table, a small candle on the counter, tissues by the chair.',
      puppy: 'A first visit: a balloon tied to the chair, a welcome pack on the counter, a squeaky toy on the floor.',
    }),
    scheme: choice('What colours is the room?', {
      mint: 'Pale mint and white, the standard calming clinic.',
      blue: 'Clinical pale blue and steel.',
      peach: 'Warm peach walls and oak cabinets, a kindly family practice.',
      grey: 'Tired institutional beige-grey.',
      teal: 'White with a strong teal dado band and yellow accents, newly refitted.',
    }),
    poster: choice('What poster is on the wall?', {
      breeds: 'A chart of dog breeds, rows of heads with different ears.',
      anatomy: 'A cutaway dog showing skeleton and coloured organs with labels.',
      cats: 'A cat body-condition chart, thin to fat, numbered one to five.',
      teeth: 'Stages of dental disease, teeth going from white to brown.',
    }),
    board: choice('What hangs beside the poster, over the chair?', {
      cards: 'A corkboard of thank-you cards and pet photographs.',
      certificates: 'Framed diplomas with gold seals.',
      whiteboard: 'A whiteboard listing the day in marker, half rubbed out.',
      nothing: 'A bare wall with a row of coat hooks.',
    }),
    door: choice('How is the door?', {
      closed: 'Closed.',
      ajar: 'Ajar, the corridor showing through the gap.',
      quiet: 'Closed, with a paper QUIET PLEASE sign taped to it.',
      coat: 'Closed, with a white coat and a stethoscope hanging on its hook.',
    }),
    floor: choice('What is the floor?', {
      vinyl: 'Speckled grey sheet vinyl, coved up the wall.',
      checker: 'Small two-tone checker tiles.',
      pawprints: 'Pale vinyl with a printed trail of paw prints leading from the door to the table.',
      terrazzo: 'Terrazzo with coloured chips.',
    }),
    table: choice('What covers the exam table?', {
      bare: 'Bare wiped steel.',
      mat: 'A ribbed rubber non-slip mat.',
      paper: 'A fresh sheet of paper pulled from a roll at the end.',
      towel: 'A towel spread out so the steel is not cold.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const C = SCHEMES[a.scheme];
    const busy = (mood.energy + mood.density) / 2;
    const background = new THREE.Color(C.wall).lerp(new THREE.Color('#d9dde2'), 0.35).lerp(new THREE.Color('#f0e2cc'), mood.warmth * 0.25);
    const { art: s, world } = diorama(context, {
      background: `#${background.getHexString()}`, floor: null, width: W, depth: D, maxHeight: 0.6, radius: 0.35, pitch: 29, yaw: 31,
      slots: SLOTS.map((slot) => [slot.at[0], slot.at[2]] as const),
    });
    const { root } = s;
    const wear = mood.wear;
    if (world.keyLight) world.keyLight.intensity = mix(1.9, 2.7, busy);
    const group = (x: number, y: number, z: number, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g); return g; };
    const into = <T extends THREE.Object3D>(parent: THREE.Object3D, mesh: T) => { parent.add(mesh); return mesh; };

    // --- Floor.
    const px = (x: number, w: number) => ((x + W / 2) / W) * w, pz = (z: number, h: number) => ((z + D / 2) / D) * h;
    const lino = canvasTexture(1024, 884, (g, w, h) => {
      const base = { vinyl: '#b4bbba', checker: '#dedbd0', pawprints: '#d3cdbd', terrazzo: '#c9c3b4' }[a.floor];
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      if (a.floor === 'checker') { const t = w / 15; for (let i = 0; i < 15; i++) for (let j = 0; j < 14; j++) if ((i + j) % 2) { g.fillStyle = new THREE.Color(C.dado).lerp(new THREE.Color('#8f9aa0'), 0.25 + (random() - 0.5) * 0.08).getStyle(); g.fillRect(i * t, j * t, t - 1, t - 1); } }
      else if (a.floor === 'terrazzo') { const chips = ['#b9806a', '#6f7f8a', '#f5f1e6', '#3f4347', C.accent, '#c9b58a']; for (let i = 0; i < 1500; i++) { g.fillStyle = chips[Math.floor(random() * chips.length)]; g.beginPath(); g.ellipse(random() * w, random() * h, 2 + random() * 7, 2 + random() * 4, random() * 3, 0, 7); g.fill(); } }
      else for (let i = 0; i < 2600; i++) { g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(60,68,74,0.4)'; g.fillRect(random() * w, random() * h, 2, 2); }
      const paw = (x: number, y: number, ang: number, size: number, colour: string) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = colour; g.beginPath(); g.ellipse(0, 4 * size, 8 * size, 6.5 * size, 0, 0, 7); g.fill(); for (const t of [-1.1, -0.38, 0.38, 1.1]) { g.beginPath(); g.ellipse(Math.sin(t) * 11 * size, -Math.cos(t) * 11 * size + 3 * size, 3.4 * size, 4.6 * size, t, 0, 7); g.fill(); } g.restore(); };
      const trail = (colour: string, size: number, wobble: number) => { for (let i = 0; i < 15; i++) { const t = i / 14, x = mix(-1.4, -0.35, t) + Math.sin(t * 5) * 0.2, z = mix(-1.55, 0.95, t); paw(px(x, w) + (i % 2 ? 15 : -15) * size + (random() - 0.5) * wobble, pz(z, h), Math.PI - 0.35 + Math.cos(t * 5) * 0.4, size, colour); } };
      if (a.floor === 'pawprints') trail(C.accent, 1.5, 0);
      // Real muddy prints and scuffs arrive with wear and traffic.
      if (wear * busy > 0.2) trail(`rgba(110,86,60,${mix(0.15, 0.6, wear * busy)})`, 1.05, 16);
      for (let i = 0; i < wear * 70; i++) { g.strokeStyle = `rgba(60,58,54,${random() * 0.22})`; g.lineWidth = 1 + random() * 4; const x = random() * w, y = random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 120, y + (random() - 0.5) * 40); g.stroke(); }
      const shade = g.createLinearGradient(0, 0, 0, h * 0.16); shade.addColorStop(0, 'rgba(40,44,48,0.22)'); shade.addColorStop(1, 'rgba(40,44,48,0)'); g.fillStyle = shade; g.fillRect(0, 0, w, h * 0.16);
    });
    const edge = new THREE.MeshStandardMaterial({ color: '#a9aba6', roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.24, D), [edge, edge, new THREE.MeshStandardMaterial({ map: lino, roughness: mix(0.6, 0.9, wear) }), edge, edge, edge]);
    floor.position.y = -0.12; floor.receiveShadow = true;
    root.add(floor);
    world.ground = floor;

    // --- Walls: white above, a wipe-clean coloured dado below, coved skirting.
    const wallMat = s.material(C.wall, { roughness: 0.92 }), dado = s.material(C.dado, { roughness: 0.6 }), trim = s.material('#f7f6f1', { roughness: 0.5 });
    const steel = s.material('#c5cacd', { metalness: 0.7, roughness: 0.32 }), dark = s.material('#2c3034', { roughness: 0.5 }), accent = s.material(C.accent, { roughness: 0.55 });
    const white = s.material('#f6f5f0', { roughness: 0.6 });
    const BZ = -D / 2, LX = -W / 2;
    s.box([W + 0.12, H, 0.12], [-0.06, H / 2, BZ - 0.06], wallMat);
    s.box([0.12, H, D], [LX - 0.06, H / 2, 0], wallMat);
    s.box([W, 1.0, 0.012], [0, 0.5, BZ + 0.006], dado); s.box([0.012, 1.0, D], [LX + 0.006, 0.5, 0], dado);
    s.box([W, 0.035, 0.03], [0, 1.02, BZ + 0.015], trim); s.box([0.03, 0.035, D], [LX + 0.015, 1.02, 0], trim);
    s.box([W, 0.1, 0.025], [0, 0.05, BZ + 0.0125], s.material('#8d9396')); s.box([0.025, 0.1, D], [LX + 0.0125, 0.05, 0], s.material('#8d9396'));
    for (let i = 0; i < wear * 12; i++) s.box([0.004, 0.02 + random() * 0.05, 0.1 + random() * 0.3], [LX + 0.014, 0.12 + random() * 0.5, -1.5 + random() * 3.2], s.material('#7d8083'));

    // --- Door in the back wall, with its narrow window onto the corridor.
    const corridorLit = mood.energy > 0.3 || a.door === 'ajar';
    const corridor = new THREE.MeshStandardMaterial({ color: corridorLit ? '#fff3d2' : '#3d4854', emissive: corridorLit ? '#ffe9b8' : '#1a2430', emissiveIntensity: corridorLit ? mix(0.5, 1.1, busy) : 0.25, roughness: 0.4 });
    const DX = -1.4, DW = 0.9, DH = 2.05;
    s.box([DW, DH, 0.006], [DX, DH / 2, BZ + 0.004], a.door === 'ajar' ? corridor : dark);
    for (const x of [-1, 1]) s.box([0.07, DH + 0.07, 0.05], [DX + x * (DW / 2 + 0.035), (DH + 0.07) / 2, BZ + 0.025], trim);
    s.box([DW + 0.14, 0.07, 0.05], [DX, DH + 0.035, BZ + 0.025], trim);
    const leaf = group(DX - DW / 2, 0, BZ + 0.035, a.door === 'ajar' ? -0.62 : 0);
    const doorMat = s.material(new THREE.Color(C.cab).lerp(new THREE.Color(C.dado), 0.45), { roughness: 0.55 });
    into(leaf, s.box([DW, DH, 0.045], [DW / 2, DH / 2, 0], doorMat));
    into(leaf, s.box([0.17, 0.82, 0.05], [DW - 0.2, 1.45, 0], trim));
    into(leaf, s.box([0.12, 0.76, 0.054], [DW - 0.2, 1.45, 0], corridor));
    into(leaf, s.box([DW - 0.02, 0.24, 0.05], [DW / 2, 0.13, 0], steel));
    into(leaf, s.box([0.05, 0.14, 0.012], [DW - 0.08, 1.02, 0.03], steel));
    into(leaf, s.rod([DW - 0.08, 1.04, 0.06], [DW - 0.22, 1.04, 0.06], 0.012, steel));
    if (a.door === 'quiet') { const sign = into(leaf, s.label('QUIET PLEASE', 0.4, 0.13, [DW / 2 - 0.1, 1.52, 0.026], '#394049', '#fbf7ea')); sign.rotation.z = (random() - 0.5) * 0.08; into(leaf, s.box([0.06, 0.02, 0.002], [DW / 2 - 0.1, 1.59, 0.027], s.material('#d9cfa0'))); }
    if (a.door === 'coat') {
      into(leaf, s.rod([0.3, 1.78, 0.02], [0.3, 1.78, 0.08], 0.01, steel));
      const coat = into(leaf, s.box([0.42, 0.85, 0.07], [0.3, 1.32, 0.07], white)); coat.rotation.z = 0.02;
      for (const x of [-1, 1]) { const sleeve = into(leaf, s.box([0.11, 0.62, 0.075], [0.3 + x * 0.25, 1.36, 0.072], white)); sleeve.rotation.z = x * 0.09; }
      into(leaf, s.box([0.012, 0.8, 0.074], [0.3, 1.3, 0.072], s.material('#d5d6d0')));
      into(leaf, s.tube([[0.2, 1.72, 0.11], [0.19, 1.4, 0.115], [0.3, 1.22, 0.115], [0.41, 1.4, 0.115], [0.4, 1.72, 0.11]], 0.008, dark));
      into(leaf, s.cylinder(0.028, 0.028, 0.014, [0.3, 1.2, 0.118], steel, 14)).rotation.x = Math.PI / 2;
    }

    // --- Counter and wall cabinet along the back wall.
    const cab = s.material(C.cab, { roughness: 0.6 }), top = s.material(a.scheme === 'peach' ? '#e9e4d8' : '#b9bfc3', { metalness: a.scheme === 'peach' ? 0 : 0.5, roughness: 0.4 });
    const CX0 = 0.22, CX1 = W / 2 - 0.02, CL = CX1 - CX0, CM = (CX0 + CX1) / 2, CZ = BZ + 0.3;
    s.box([CL, 0.78, 0.56], [CM, 0.49, CZ], cab); s.box([CL, 0.1, 0.5], [CM, 0.05, CZ - 0.03], dark);
    s.box([CL + 0.02, 0.04, 0.62], [CM, 0.9, CZ + 0.01], top);
    s.box([CL, 0.1, 0.02], [CM, 0.97, BZ + 0.012], top);
    for (let i = 0; i < 4; i++) { const x = CX0 + (i + 0.5) * (CL / 4); s.box([CL / 4 - 0.02, i === 3 ? 0.2 : 0.7, 0.02], [x, i === 3 ? 0.74 : 0.49, CZ + 0.285], cab); s.box([0.014, 0.014, 0.16].map((v, k) => (k === (i === 3 ? 0 : 1) ? 0.16 : v)) as [number, number, number], [x + (i === 3 ? 0 : (i % 2 ? -1 : 1) * (CL / 8 - 0.06)), i === 3 ? 0.74 : 0.74, CZ + 0.3], steel); }
    for (let i = 0; i < 2; i++) s.box([CL / 4 - 0.02, 0.22, 0.02], [CX0 + 3.5 * (CL / 4), 0.5 - i * 0.24, CZ + 0.285], cab);
    // Sink and tap at the door end.
    s.box([0.4, 0.012, 0.34], [CX0 + 0.3, 0.921, CZ + 0.02], s.material('#7f888d', { metalness: 0.7, roughness: 0.3 }));
    s.box([0.34, 0.008, 0.28], [CX0 + 0.3, 0.924, CZ + 0.02], s.material('#4c5357', { metalness: 0.6, roughness: 0.35 }));
    s.tube([[CX0 + 0.3, 0.92, CZ - 0.2], [CX0 + 0.3, 1.16, CZ - 0.2], [CX0 + 0.3, 1.2, CZ - 0.12], [CX0 + 0.3, 1.12, CZ - 0.06]], 0.014, steel);
    s.rod([CX0 + 0.38, 0.92, CZ - 0.2], [CX0 + 0.44, 0.99, CZ - 0.16], 0.01, steel);
    s.box([0.09, 0.17, 0.07], [CX0 + 0.06, 1.33, BZ + 0.05], white); s.box([0.05, 0.03, 0.05], [CX0 + 0.06, 1.23, BZ + 0.06], accent);
    // Jars: treats, swabs and cotton balls.
    const glass = new THREE.MeshPhysicalMaterial({ color: '#e4f2f4', transparent: true, opacity: 0.3, roughness: 0.06, depthWrite: false });
    const jarX = CX0 + 0.62;
    for (let j = 0; j < 3; j++) {
      const x = jarX + j * 0.16, z = CZ - 0.15 + (j % 2) * 0.03, h = [0.2, 0.17, 0.15][j], r = 0.06;
      const lidOff = j === 0 && a.visit === 'checkup';
      const jar = s.cylinder(r, r, h, [x, 0.92 + h / 2, z], glass, 18); jar.castShadow = false;
      s.cylinder(r * 0.93, r * 0.93, h * (j === 0 ? mix(0.25, 0.8, mood.cheer) : 0.7), [x, 0.925 + h * (j === 0 ? mix(0.25, 0.8, mood.cheer) : 0.7) / 2, z], s.material(['#a8723c', '#f6f4ec', '#fbfaf6'][j], { roughness: 1 }), 14);
      if (j === 1) for (let k = 0; k < 9; k++) s.rod([x + (random() - 0.5) * 0.07, 0.95, z + (random() - 0.5) * 0.07], [x + (random() - 0.5) * 0.09, 0.92 + h * 1.05, z + (random() - 0.5) * 0.09], 0.003, s.material('#d9c39a'));
      if (lidOff) s.cylinder(r * 1.05, r * 1.05, 0.02, [x + 0.02, 0.93, z + 0.2], steel, 18);
      else { s.cylinder(r * 1.05, r * 1.05, 0.02, [x, 0.93 + h, z], steel, 18); s.ball([0.016, 0.016, 0.016], [x, 0.955 + h, z], steel, 10); }
    }
    // Spray bottle and glove boxes at the far end.
    const SX = CX1 - 0.2;
    s.cylinder(0.035, 0.04, 0.16, [SX, 1.0, CZ - 0.12], s.material('#5aa7d8', { transparent: true, opacity: 0.75, roughness: 0.2 }), 14);
    s.box([0.03, 0.05, 0.09], [SX, 1.11, CZ - 0.1], white); s.box([0.014, 0.05, 0.014], [SX, 1.085, CZ - 0.07], white);
    for (let i = 0; i < 3; i++) { s.box([0.24, 0.085, 0.04], [SX - 0.05, 1.12 + i * 0.1, BZ + 0.03], s.material(['#8a6fc2', '#4a8fd0', '#58b0a0'][i])); s.box([0.1, 0.035, 0.004], [SX - 0.05, 1.12 + i * 0.1, BZ + 0.052], white); }
    // Wall cabinet with glazed doors.
    const KX0 = 0.85, KL = CX1 - KX0, KM = (KX0 + CX1) / 2, KY = 1.95;
    s.box([KL, 0.66, 0.32], [KM, KY, BZ + 0.16], cab);
    for (let i = 0; i < 3; i++) {
      const x = KX0 + (i + 0.5) * (KL / 3);
      s.box([KL / 3 - 0.08, 0.5, 0.012], [x, KY, BZ + 0.326], s.material('#aebfc6', { roughness: 0.15, metalness: 0.2 }));
      for (let k = 0; k < 2; k++) for (let m = 0; m < 3; m++) if (random() < 0.4 + mood.density * 0.6) s.box([0.09, 0.1 + random() * 0.08, 0.004], [x - 0.12 + m * 0.12, KY - 0.17 + k * 0.25 + 0.03, BZ + 0.334], s.material(new THREE.Color().setHSL(random(), 0.35, 0.72)));
      s.box([KL / 3 - 0.02, 0.012, 0.014], [x, KY + 0.005, BZ + 0.335], cab);
      s.box([0.014, 0.12, 0.016], [x + (KL / 6 - 0.03), KY - 0.2, BZ + 0.34], steel);
    }
    // Strip light over the cabinet and a sharps bin by the door.
    const tubeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: new THREE.Color().setHSL(mix(0.58, 0.11, mood.warmth), 0.6, 0.86), emissiveIntensity: mix(0.3, 1.25, busy), roughness: 0.3 });
    s.box([1.3, 0.05, 0.09], [KM - 0.3, 2.4, BZ + 0.05], white); s.box([1.24, 0.035, 0.05], [KM - 0.3, 2.375, BZ + 0.1], tubeMat);
    s.box([0.2, 0.26, 0.13], [-0.55, 1.3, BZ + 0.07], s.material('#e8c62f', { roughness: 0.5 })); s.box([0.21, 0.07, 0.14], [-0.55, 1.46, BZ + 0.07], s.material('#c9302b', { roughness: 0.5 }));
    s.box([0.13, 0.1, 0.004], [-0.55, 1.28, BZ + 0.137], white);

    // --- Left wall: the poster, and whatever hangs over the owner's chair.
    const hang = (map: THREE.Texture, w: number, h: number, y: number, z: number, frame: THREE.Material | null) => {
      if (frame) s.box([0.022, h + 0.05, w + 0.05], [LX + 0.012, y, z], frame);
      const sheet = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.85 }), [LX + (frame ? 0.025 : 0.014), y, z]);
      sheet.rotation.y = Math.PI / 2; sheet.castShadow = false;
      return sheet;
    };
    hang(poster(a.poster as Poster, C.accent, random), 0.84, 1.12, 1.68, -0.72, steel).rotation.x = (random() - 0.5) * 0.02 * (1 + wear * 3);
    const BZc = 0.92;
    if (a.board === 'cards') {
      hang(canvasTexture(512, 384, (g, w, h) => {
        g.fillStyle = '#c69a62'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,60,30,${random() * 0.25})`; g.fillRect(random() * w, random() * h, 3, 2); }
        const n = 4 + Math.round(mood.density * 9);
        for (let i = 0; i < n; i++) {
          const x = 30 + random() * (w - 130), y = 20 + random() * (h - 130), photo = random() < 0.5;
          g.save(); g.translate(x + 45, y + 50); g.rotate((random() - 0.5) * 0.5);
          g.fillStyle = photo ? '#fbfaf5' : new THREE.Color().setHSL(random(), mix(0.15, 0.7, mood.cheer), 0.78).getStyle(); g.fillRect(-42, -48, 84, 96);
          if (photo) { g.fillStyle = new THREE.Color().setHSL(0.08 + random() * 0.3, 0.3, 0.5).getStyle(); g.fillRect(-36, -42, 72, 66); g.fillStyle = ['#d9b377', '#3a3431', '#f1ece0', '#c9762f'][Math.floor(random() * 4)]; g.beginPath(); g.ellipse(0, -4, 20, 18, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(-16, -22, 8, 12, -0.4, 0, 7); g.ellipse(16, -22, 8, 12, 0.4, 0, 7); g.fill(); }
          else { g.fillStyle = '#c9453c'; g.font = '34px serif'; g.textAlign = 'center'; g.fillText('♥', 0, -4); g.fillStyle = 'rgba(60,60,70,0.6)'; for (let k = 0; k < 3; k++) g.fillRect(-28, 14 + k * 10, 56 - k * 12, 3); }
          g.fillStyle = '#d23b3b'; g.beginPath(); g.arc(0, -42, 5, 0, 7); g.fill();
          g.restore();
        }
      }), 0.95, 0.7, 1.72, BZc, s.material('#a37b4c'));
    } else if (a.board === 'certificates') {
      for (let i = 0; i < 3; i++) hang(canvasTexture(192, 256, (g, w, h) => {
        g.fillStyle = '#f7f1df'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b89a4a'; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24);
        g.fillStyle = '#40444c'; g.fillRect(40, 44, w - 80, 9); for (let k = 0; k < 6; k++) g.fillRect(34 + (k % 2) * 10, 80 + k * 16, w - 68 - (k % 2) * 20, 4);
        g.fillStyle = '#d8a52c'; g.beginPath(); for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2, r = k % 2 ? 22 : 17; g.lineTo(w - 54 + Math.cos(t) * r, h - 58 + Math.sin(t) * r); } g.fill();
      }), 0.3, 0.4, 1.85 - (i === 1 ? 0.12 : 0), BZc - 0.4 + i * 0.4, s.material(i === 1 ? '#2e2a26' : '#6b4a33')).rotation.x = (random() - 0.5) * 0.05 * (1 + wear * 2);
    } else if (a.board === 'whiteboard') {
      hang(canvasTexture(512, 384, (g, w, h) => {
        g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#30343a'; g.lineWidth = 3; g.beginPath(); g.moveTo(120, 20); g.lineTo(120, h - 20); g.moveTo(20, 70); g.lineTo(w - 20, 70); g.stroke();
        const pens = ['#2a4fa8', '#c0392b', '#2e8b57', '#222'];
        const rows = 3 + Math.round(busy * 5);
        for (let r = 0; r < 8; r++) {
          const y = 100 + r * 34, rubbed = r >= rows;
          g.strokeStyle = pens[Math.floor(random() * pens.length)]; g.globalAlpha = rubbed ? 0.1 : 0.9; g.lineWidth = 4; g.lineCap = 'round';
          for (const [x0, x1] of [[30, 100], [140, 240 + random() * 200]]) { g.beginPath(); g.moveTo(x0, y); for (let x = x0; x < x1; x += 12) g.lineTo(x + 6, y + (random() - 0.5) * 14); g.stroke(); }
          if (!rubbed && random() < mood.cheer) { g.beginPath(); g.moveTo(470, y - 4); g.lineTo(478, y + 6); g.lineTo(494, y - 12); g.stroke(); }
        }
        g.globalAlpha = 1;
      }), 0.95, 0.7, 1.72, BZc, steel);
      s.box([0.05, 0.02, 0.5], [LX + 0.04, 1.34, BZc], steel);
      for (let i = 0; i < 3; i++) s.cylinder(0.01, 0.01, 0.11, [LX + 0.045, 1.36, BZc - 0.15 + i * 0.13], s.material(['#2a4fa8', '#c0392b', '#222'][i]), 8).rotation.x = Math.PI / 2;
    } else {
      s.box([0.02, 0.07, 0.8], [LX + 0.012, 1.7, BZc], trim);
      for (let i = 0; i < 4; i++) { s.rod([LX + 0.02, 1.7, BZc - 0.3 + i * 0.2], [LX + 0.08, 1.71, BZc - 0.3 + i * 0.2], 0.008, steel); s.ball([0.012, 0.012, 0.012], [LX + 0.085, 1.715, BZc - 0.3 + i * 0.2], steel, 8); }
      if (busy > 0.45) { s.tube([[LX + 0.08, 1.7, BZc - 0.1], [LX + 0.09, 1.3, BZc - 0.13], [LX + 0.09, 1.0, BZc - 0.1], [LX + 0.09, 1.3, BZc - 0.07], [LX + 0.08, 1.7, BZc - 0.1]], 0.009, accent); }
    }

    // --- The owner's chair.
    const chairSlot = SLOTS[2];
    const chair = group(chairSlot.at[0], 0, chairSlot.at[2], chairSlot.yaw);
    const shell = s.material(new THREE.Color(C.accent).lerp(new THREE.Color('#ffffff'), 0.15), { roughness: 0.5 });
    into(chair, s.box([0.46, 0.035, 0.44], [0, 0.445, 0], shell));
    const back = into(chair, s.box([0.44, 0.4, 0.03], [0, 0.74, -0.225], shell)); back.rotation.x = -0.14;
    for (const x of [-1, 1]) { into(chair, s.rod([x * 0.2, 0, 0.19], [x * 0.19, 0.44, 0.17], 0.012, steel)); into(chair, s.rod([x * 0.2, 0, -0.2], [x * 0.19, 0.93, -0.25], 0.012, steel)); }
    // A second chair beside it when the clinic is busy; the waiting never happens alone.
    if (mood.density > 0.55) { const second = chair.clone(true); second.position.set(chairSlot.at[0] - 0.12, 0, chairSlot.at[2] - 0.72); second.rotation.y = chairSlot.yaw - 0.15; root.add(second); }

    // --- Lift table: stainless top on a scissor base.
    const T = SLOTS[0].at, TW = 1.3, TD = 0.64;
    const table = group(T[0], 0, T[2], 0.04);
    const brushed = s.material('#d3d7da', { metalness: 0.75, roughness: mix(0.22, 0.45, wear) });
    into(table, s.box([TW, 0.03, TD], [0, T[1] - 0.016, 0], brushed));
    for (const z of [-1, 1]) into(table, s.box([TW, 0.022, 0.02], [0, T[1] + 0.008, z * (TD / 2 - 0.01)], brushed));
    for (const x of [-1, 1]) into(table, s.box([0.02, 0.022, TD], [x * (TW / 2 - 0.01), T[1] + 0.008, 0], brushed));
    into(table, s.box([0.95, 0.05, 0.46], [0, 0.085, 0], dark));
    into(table, s.box([0.95, 0.04, 0.42], [0, T[1] - 0.06, 0], dark));
    for (const z of [-1, 1]) { into(table, s.rod([-0.42, 0.11, z * 0.19], [0.42, T[1] - 0.08, z * 0.19], 0.02, steel)); into(table, s.rod([0.42, 0.11, z * 0.17], [-0.42, T[1] - 0.08, z * 0.17], 0.02, steel)); }
    into(table, s.rod([0, 0.48, -0.2], [0, 0.48, 0.2], 0.016, steel));
    into(table, s.rod([-0.3, 0.12, 0], [0.12, 0.62, 0], 0.035, s.material('#9aa1a6', { metalness: 0.6, roughness: 0.3 })));
    for (const x of [-1, 1]) for (const z of [-1, 1]) into(table, s.cylinder(0.035, 0.035, 0.03, [x * 0.43, 0.035, z * 0.2], dark, 12)).rotation.x = Math.PI / 2;
    into(table, s.box([0.16, 0.025, 0.1], [0.5, 0.05, 0.3], accent)).rotation.z = 0.2;
    if (a.table === 'mat') { into(table, s.box([TW - 0.1, 0.008, TD - 0.08], [0, T[1] + 0.004, 0], s.material('#3b4146', { roughness: 0.95 }))); for (let i = 0; i < 14; i++) into(table, s.box([0.012, 0.004, TD - 0.1], [-0.55 + i * 0.085, T[1] + 0.009, 0], s.material('#4a5157'))); }
    else if (a.table === 'paper') { into(table, s.box([TW - 0.12, 0.004, TD - 0.1], [-0.03, T[1] + 0.002, 0], s.material('#fbfaf4', { roughness: 1 }))); into(table, s.cylinder(0.06, 0.06, TD - 0.08, [TW / 2 + 0.05, T[1] - 0.03, 0], s.material('#fbfaf4', { roughness: 1 }), 16)).rotation.x = Math.PI / 2; }
    else if (a.table === 'towel') { const towel = s.material(new THREE.Color().setHSL(mix(0.56, 0.07, mood.warmth), 0.35, 0.74), { roughness: 1 }); into(table, s.box([0.86, 0.012, TD - 0.03], [-0.05, T[1] + 0.006, 0], towel)).rotation.y = 0.06; into(table, s.box([0.86, 0.006, 0.05], [-0.05, T[1] + 0.014, 0.2], white)).rotation.y = 0.06; }

    // --- Exam lamp on a floor stand, its head over the table.
    const lampTint = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.7, 0.88);
    s.cylinder(0.22, 0.25, 0.04, [-0.95, 0.02, -0.75], dark, 20);
    s.rod([-0.95, 0.04, -0.75], [-0.95, 2.0, -0.75], 0.022, steel);
    s.rod([-0.95, 2.0, -0.75], [-0.3, 2.22, -0.2], 0.018, steel);
    s.rod([-0.3, 2.22, -0.2], [T[0], 2.12, T[2]], 0.016, steel);
    s.ball([0.035, 0.035, 0.035], [-0.3, 2.22, -0.2], dark, 10);
    s.lathe([[0.03, 0.12], [0.1, 0.1], [0.23, 0.02], [0.24, 0], [0.2, 0.0]], white, [T[0], 2.0, T[2]]);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: lampTint, emissiveIntensity: 1.3, roughness: 0.3 });
    s.cylinder(0.19, 0.19, 0.012, [T[0], 2.0, T[2]], lampMat, 24);
    const spot = new THREE.SpotLight(lampTint, mix(2.2, 4, 1 - busy * 0.5), 3.2, 0.42, 0.8, 1.4);
    spot.position.set(T[0], 1.99, T[2]); spot.target.position.set(T[0], 0.9, T[2]);
    root.add(spot, spot.target);

    // --- Floor scale with its readout.
    const S = SLOTS[1].at;
    const scale = group(S[0], 0, S[2], -0.12);
    into(scale, s.box([1.0, 0.04, 0.62], [0, 0.02, 0], steel));
    into(scale, s.box([0.94, 0.014, 0.56], [0, 0.047, 0], s.material('#2f3438', { roughness: 0.95 })));
    into(scale, s.rod([0.56, 0, -0.3], [0.56, 1.0, -0.3], 0.016, steel)); into(scale, s.cylinder(0.09, 0.1, 0.02, [0.56, 0.01, -0.3], dark, 14));
    into(scale, s.box([0.2, 0.12, 0.05], [0.56, 1.04, -0.29], dark)).rotation.x = -0.3;
    const reading = into(scale, s.label(`${(2 + random() * 38).toFixed(1)} kg`, 0.17, 0.07, [0.56, 1.045, -0.262], '#7dffb0', '#0d1a14')); reading.rotation.x = -0.3;
    (reading.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#2f8f5a'); (reading.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;

    // --- Vet's stool and pedal bin.
    s.cylinder(0.17, 0.17, 0.06, [0.78, 0.5, -0.72], dark, 20); s.cylinder(0.02, 0.02, 0.42, [0.78, 0.27, -0.72], steel, 10);
    for (let i = 0; i < 5; i++) { const t = (i / 5) * Math.PI * 2 + 0.3; s.rod([0.78, 0.07, -0.72], [0.78 + Math.cos(t) * 0.24, 0.05, -0.72 + Math.sin(t) * 0.24], 0.014, steel); s.ball([0.025, 0.025, 0.025], [0.78 + Math.cos(t) * 0.24, 0.025, -0.72 + Math.sin(t) * 0.24], dark, 8); }
    s.cylinder(0.15, 0.13, 0.42, [-0.42, 0.21, BZ + 0.22], steel, 18); s.cylinder(0.155, 0.155, 0.03, [-0.42, 0.435, BZ + 0.22], dark, 18); s.box([0.1, 0.02, 0.06], [-0.42, 0.02, BZ + 0.4], dark);

    // --- The visit.
    const bobbers: THREE.Object3D[] = [];
    if (a.visit === 'checkup') {
      const clip = into(table, s.box([0.2, 0.01, 0.28], [-0.5, T[1] + 0.008, 0.14], s.material('#8a6a48'))); clip.rotation.y = 0.3;
      const sheet = into(table, s.box([0.18, 0.004, 0.24], [-0.5, T[1] + 0.015, 0.15], white)); sheet.rotation.y = 0.3;
      into(table, s.box([0.08, 0.02, 0.02], [-0.535, T[1] + 0.022, 0.035], steel)).rotation.y = 0.3;
      for (let i = 0; i < 3 + mood.cheer * 4; i++) into(table, s.box([0.03, 0.008, 0.012], [0.42 + random() * 0.16, T[1] + 0.004, -0.2 + random() * 0.4], s.material('#a8723c'))).rotation.y = random() * 3;
      const roll = s.cylinder(0.05, 0.05, 0.04, [1.05, 0.94, CZ + 0.18], s.material('#ffd24a'), 18); roll.rotation.x = 0.0;
      s.cylinder(0.02, 0.02, 0.042, [1.05, 0.94, CZ + 0.18], s.material('#8a6a48'), 10);
    } else if (a.visit === 'emergency') {
      const ix = T[0] + 0.85, iz = T[2] - 0.45;
      s.rod([ix, 0.03, iz], [ix, 1.95, iz], 0.014, steel);
      for (let i = 0; i < 5; i++) { const t = (i / 5) * Math.PI * 2; s.rod([ix, 0.05, iz], [ix + Math.cos(t) * 0.24, 0.03, iz + Math.sin(t) * 0.24], 0.012, steel); }
      s.rod([ix - 0.12, 1.95, iz], [ix + 0.12, 1.95, iz], 0.008, steel);
      const bag = s.box([0.12, 0.2, 0.035], [ix - 0.1, 1.8, iz], new THREE.MeshPhysicalMaterial({ color: '#dff0f5', transparent: true, opacity: 0.55, roughness: 0.1 })); bag.rotation.z = 0.04;
      s.box([0.07, 0.06, 0.037], [ix - 0.1, 1.8, iz], white);
      s.tube([[ix - 0.1, 1.7, iz], [ix - 0.12, 1.3, iz + 0.05], [ix - 0.4, 1.0, iz + 0.3], [T[0] + 0.3, 0.95, T[2] - 0.05]], 0.004, s.material('#e9f3f5', { roughness: 0.2 }));
      s.cylinder(0.014, 0.014, 0.06, [ix - 0.11, 1.52, iz + 0.02], white, 8);
      for (let i = 0; i < 5 + mood.density * 8; i++) { const w = s.mesh(new THREE.IcosahedronGeometry(0.035 + random() * 0.02, 0), s.material(random() < 0.25 ? '#c0453f' : random() < 0.5 ? '#7fb7d6' : '#f6f4ee', { roughness: 1, flatShading: true }), [T[0] - 0.9 + random() * 1.9, 0.025, T[2] + 0.45 + random() * 0.45]); w.scale.y = 0.5; w.rotation.y = random() * 3; }
      into(table, s.box([0.26, 0.03, 0.16], [-0.48, T[1] + 0.015, -0.18], steel));
    } else if (a.visit === 'goodbye') {
      const blanket = s.material(new THREE.Color().setHSL(mix(0.62, 0.05, mood.warmth), 0.3, 0.7), { roughness: 1 });
      for (let i = 0; i < 3; i++) into(table, s.box([0.26 - i * 0.01, 0.035, 0.36], [0.48, T[1] + 0.018 + i * 0.036, -0.08], blanket)).rotation.y = (random() - 0.5) * 0.08;
      const cx = 1.1, cz = CZ + 0.17;
      s.cylinder(0.035, 0.035, 0.09, [cx, 0.965, cz], s.material('#f5efe0', { roughness: 0.7 }), 14);
      const flame = s.mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: 2 }), [cx, 1.03, cz]); flame.scale.y = 1.9; flame.castShadow = false; bobbers.push(flame);
      const tx = chairSlot.at[0] - 0.05, tz = chairSlot.at[2] - 0.62;
      s.box([0.36, 0.5, 0.36], [tx, 0.25, tz], cab); s.box([0.4, 0.03, 0.4], [tx, 0.515, tz], top);
      s.box([0.24, 0.08, 0.12], [tx, 0.57, tz], s.material(C.dado)).rotation.y = 0.9;
      s.mesh(new THREE.ConeGeometry(0.05, 0.1, 5, 1, true), s.material('#fbfaf6', { roughness: 1, side: THREE.DoubleSide, flatShading: true }), [tx, 0.65, tz]).rotation.x = Math.PI;
      for (let i = 0; i < 2 + (1 - mood.cheer) * 4; i++) s.mesh(new THREE.IcosahedronGeometry(0.03, 0), s.material('#f6f4ee', { roughness: 1, flatShading: true }), [chairSlot.at[0] + 0.3 + random() * 0.4, 0.02, chairSlot.at[2] + 0.2 + random() * 0.5]);
    } else {
      const hueA = new THREE.Color().setHSL(random(), 0.7, 0.58);
      const b = group(chairSlot.at[0] - 0.22, 0, chairSlot.at[2] - 0.3);
      into(b, s.tube([[0, 0.9, 0], [0.03, 1.3, 0.02], [-0.02, 1.7, 0.0], [0.0, 2.05, 0.0]], 0.003, white));
      const balloon = into(b, s.ball([0.16, 0.19, 0.16], [0, 2.22, 0], s.material(hueA, { roughness: 0.25 }), 18)); bobbers.push(balloon);
      const bagX = 1.05, bagZ = CZ + 0.15;
      s.box([0.2, 0.24, 0.1], [bagX, 1.04, bagZ], s.material(hueA.clone().offsetHSL(0.5, 0, 0.1), { roughness: 0.7 }));
      s.tube([[bagX - 0.06, 1.16, bagZ], [bagX - 0.04, 1.24, bagZ], [bagX + 0.04, 1.24, bagZ], [bagX + 0.06, 1.16, bagZ]], 0.005, white);
      s.label('WELCOME', 0.16, 0.05, [bagX, 1.05, bagZ + 0.052], '#ffffff', `#${hueA.getHexString()}`);
      const toy = group(0.35, 0.03, 1.5, random() * 3);
      into(toy, s.rod([-0.06, 0, 0], [0.06, 0, 0], 0.018, s.material('#f0c232', { roughness: 0.4 })));
      for (const x of [-1, 1]) for (const z of [-1, 1]) into(toy, s.ball([0.026, 0.026, 0.026], [x * 0.065, 0, z * 0.018], s.material('#f0c232', { roughness: 0.4 }), 10));
    }
    // A carrier waiting by the door when the clinic is busy.
    if (busy > 0.6) {
      const c = group(-1.55, 0, -1.25, 0.5);
      into(c, s.box([0.36, 0.3, 0.5], [0, 0.15, 0], s.material('#d9d6cc'))); into(c, s.box([0.37, 0.14, 0.51], [0, 0.27, 0], accent));
      for (let i = 0; i < 5; i++) into(c, s.box([0.012, 0.22, 0.012], [-0.12 + i * 0.06, 0.16, 0.256], steel));
      into(c, s.tube([[-0.07, 0.34, 0], [-0.05, 0.4, 0], [0.05, 0.4, 0], [0.07, 0.34, 0]], 0.012, dark));
    }
    // Shed hair drifts into the corners with wear and traffic.
    const tufts = Math.round(wear * mix(4, 22, mood.density));
    if (tufts > 0) s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#b9b2a4', { roughness: 1, flatShading: true }), Array.from({ length: tufts }, () => ({ at: [LX + 0.15 + random() * (W - 0.4), 0.012, BZ + 0.2 + random() * (D - 0.5)] as [number, number, number], size: 0.015 + random() * 0.025 })));

    // --- Placement: the kit frames the room; then each cast member is lifted onto its own surface.
    const frame = world.place.bind(world);
    world.capacity = SLOTS.length;
    world.place = (items: readonly Placeable[]) => {
      frame(items);
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length];
        const size = Math.min(slot.height / Math.max(item.height, 0.05), slot.radius / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(size);
        item.holder.position.set(...slot.at);
        item.holder.rotation.y = slot.yaw + (random() - 0.5) * 0.25;
        item.holder.updateMatrixWorld(true);
      });
    };
    const flicker = wear * 0.5, baseTube = tubeMat.emissiveIntensity;
    world.update = (_dt, time) => {
      const n = Math.sin(time * 31) * Math.sin(time * 7.3 + 1) * Math.sin(time * 2.1);
      tubeMat.emissiveIntensity = baseTube * (n > 0.5 ? 1 - flicker : 1);
      bobbers.forEach((b, i) => { if (a.visit === 'puppy') { b.position.x = Math.sin(time * mix(0.4, 1.6, mood.energy) + i) * 0.03; } else b.scale.set(1 + Math.sin(time * 9) * 0.08, 1.9 + Math.sin(time * 13) * 0.25, 1); });
    };
    return world;
  },
});
