import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
interface Item { at: [number, number, number]; size: [number, number, number]; turn?: number; tilt?: number; roll?: number; local?: [number, number, number]; colour: THREE.ColorRepresentation }
function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly Item[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  mesh.count = items.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3();
  items.forEach((item, i) => {
    q.setFromEuler(e.set(item.tilt ?? 0, item.turn ?? 0, item.roll ?? 0, 'YXZ'));
    p.set(...(item.local ?? [0, 0, 0])).applyQuaternion(q).add(new THREE.Vector3(...item.at));
    m.compose(p, q, new THREE.Vector3(...item.size));
    mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(item.colour));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
const NAMES = { turkeys: 'TURKEYS', fish: 'WHOLE FISH', popsicles: 'ICE POPS', dumplings: 'DUMPLINGS', icecream: 'ICE CREAM', peas: 'GARDEN PEAS', jumble: 'BARGAINS', bare: 'SOLD OUT' } as const;

export default defineThing({
  questions: {
    holds: choice('What is heaped in the bin?', {
      turkeys: 'Shrink-wrapped frozen turkeys, pale and heavy as boulders, each with a bright label.',
      fish: 'Whole silver fish, stiff and frosted, some in clear bags.',
      popsicles: 'Boxes of ice lollies and loose popsicles in lurid colours.',
      dumplings: 'Soft white pillow bags of dumplings and gyoza with red labels.',
      icecream: 'Pastel ice cream tubs and tubs of sorbet, lids up.',
      peas: 'Green bags of peas and sweetcorn in a slumped drift.',
      jumble: 'A bargain jumble: whatever did not sell, all thrown in together.',
      bare: 'Nothing. A white frosted pit with one forgotten item at the bottom.',
    }),
    lid: choice('How is the sliding glass lid?', {
      shut: 'Both glass panels slid shut, the goods sealed under them.',
      half: 'One panel slid back over the other, half the bin open to reach in.',
      off: 'The panels lifted off and leaned against the end of the cabinet.',
      open: 'No lid at all: an open-top bin with a low glass rail round it.',
    }),
    card: choice('What does the hand-lettered price card say?', {
      perlb: 'A price per pound in fat red marker.',
      special: "MANAGER'S SPECIAL.",
      bogo: 'BUY 1 GET 1 FREE.',
      last: 'LAST ONES! with three underlines.',
      limit: 'LIMIT 2 PER FAMILY, written in a hurry.',
      none: 'No card: just the bare wire holder.',
    }),
    state: choice('What state is the freezer in?', {
      clean: 'Running clean, a light dusting of frost.',
      crusted: 'A thick crust of old frost built up round the inside of the rim.',
      iced: 'Iced solid: the goods half buried in a slab of white ice.',
      thawed: 'Failed and thawed: everything slumped in grey meltwater, leaking onto the floor.',
    }),
    style: choice('What does the cabinet look like?', {
      white: 'White enamel with a red bumper rail, the supermarket standard.',
      icecream: 'Sky-blue with a wavy white stripe, an ice cream brand freezer.',
      steel: 'Plain stainless steel, a cash-and-carry or fishmonger.',
      woodgrain: 'Brown wood-grain panels with a chrome rail, 1970s.',
    }),
    front: choice('What is on the front panel?', {
      plain: 'Nothing, just the vent grille.',
      snowflakes: 'A row of big printed snowflakes.',
      penguin: 'A cheerful cartoon penguin.',
      burst: 'A starburst sticker shouting FROZEN.',
    }),
    rummaged: noul('Has somebody rummaged through it and left things out on the rim and floor?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const L = 1.9, D = 0.95, H = 0.86, WALL = 0.07, FOOT = 0.1;
    const bodyColour = { white: '#eef0ec', icecream: '#5ab4e8', steel: '#b6bcbe', woodgrain: '#7c5434' }[a.style];
    const railColour = { white: '#d02a22', icecream: '#f4f6f6', steel: '#8a9296', woodgrain: '#d0d4d6' }[a.style];
    const body = s.material(bodyColour, { metalness: a.style === 'steel' ? 0.7 : 0.05, roughness: a.style === 'steel' ? 0.36 : 0.5 });
    const rail = s.material(railColour, { metalness: a.style === 'white' || a.style === 'icecream' ? 0.05 : 0.7, roughness: 0.4 });
    const liner = s.material('#f2f6f8', { roughness: 0.7 });
    const dark = s.material('#22262a');
    const thawed = a.state === 'thawed';

    // Cabinet: plinth, four walls round a well, bumper rail.
    s.box([L - 0.06, FOOT, D - 0.06], [0, FOOT / 2, 0], dark);
    s.box([L - WALL * 2, 0.06, D - WALL * 2], [0, FOOT + 0.03, 0], liner);
    for (const side of [-1, 1]) {
      s.box([L, H - FOOT, WALL], [0, (H + FOOT) / 2, side * (D - WALL) / 2], body);
      s.box([WALL, H - FOOT, D - WALL * 2], [side * (L - WALL) / 2, (H + FOOT) / 2, 0], body);
      s.box([L - WALL * 2, H - FOOT - 0.08, 0.008], [0, (H + FOOT) / 2 + 0.03, side * (D / 2 - WALL - 0.004)], liner);
      s.box([0.008, H - FOOT - 0.08, D - WALL * 2], [side * (L / 2 - WALL - 0.004), (H + FOOT) / 2 + 0.03, 0], liner);
      s.box([L + 0.05, 0.06, 0.1], [0, H - 0.01, side * (D / 2 - 0.035)], rail);
      s.box([0.1, 0.06, D + 0.05], [side * (L / 2 - 0.035), H - 0.01, 0], rail);
    }
    for (let i = 0; i < 5; i++) s.box([0.5, 0.012, 0.008], [L / 2 - 0.4, FOOT + 0.07 + i * 0.026, D / 2 + 0.002], dark);
    if (a.style === 'woodgrain') for (let i = 0; i < 22; i++) s.box([L * (0.3 + random() * 0.7), 0.004, 0.004], [(random() - 0.5) * 0.3, FOOT + 0.05 + random() * (H - FOOT - 0.16), D / 2 + 0.002], s.material('#5c3c22'));
    // Front panel graphic.
    const decal = paint(512, 160, (ctx) => {
      ctx.clearRect(0, 0, 512, 160);
      if (a.style === 'icecream') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 16; ctx.beginPath(); for (let x = 0; x <= 512; x += 8) ctx.lineTo(x, 132 + Math.sin(x / 36) * 9); ctx.stroke(); }
      const inkC = a.style === 'icecream' ? '#ffffff' : a.style === 'woodgrain' ? '#f0d8a0' : '#2a7ad0';
      if (a.front === 'snowflakes') { ctx.strokeStyle = inkC; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let n = 0; n < 4; n++) { const x = 70 + n * 124, y = 62 + (n % 2) * 14, r = 34 - (n % 2) * 8; for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); ctx.stroke(); for (const d of [-0.5, 0.5]) { ctx.beginPath(); ctx.moveTo(x + Math.cos(t) * r * 0.6, y + Math.sin(t) * r * 0.6); ctx.lineTo(x + Math.cos(t + d) * r * 0.9, y + Math.sin(t + d) * r * 0.9); ctx.stroke(); } } } }
      else if (a.front === 'penguin') {
        const x = 250, y = 78; ctx.fillStyle = '#1c2230'; ctx.beginPath(); ctx.ellipse(x, y, 44, 62, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y + 12, 28, 46, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x - 14, y - 30, 11, 0, 7); ctx.arc(x + 14, y - 30, 11, 0, 7); ctx.fill();
        ctx.fillStyle = '#1c2230'; ctx.beginPath(); ctx.arc(x - 12, y - 30, 4.5, 0, 7); ctx.arc(x + 12, y - 30, 4.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#f09a1c'; ctx.beginPath(); ctx.moveTo(x - 10, y - 18); ctx.lineTo(x + 10, y - 18); ctx.lineTo(x, y - 4); ctx.fill(); ctx.fillRect(x - 30, y + 56, 24, 9); ctx.fillRect(x + 6, y + 56, 24, 9);
        ctx.fillStyle = '#1c2230'; ctx.beginPath(); ctx.ellipse(x - 50, y + 4, 10, 30, 0.5, 0, 7); ctx.ellipse(x + 50, y + 4, 10, 30, -0.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#d02a22'; ctx.fillRect(x - 30, y - 12, 60, 10);
      } else if (a.front === 'burst') {
        const x = 256, y = 76; ctx.fillStyle = '#ffd81c'; ctx.beginPath(); for (let i = 0; i < 32; i++) { const t = i * Math.PI / 16, r = i % 2 ? 150 : 110; ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r * 0.46); } ctx.fill();
        ctx.fillStyle = '#d02a22'; ctx.font = 'italic 900 54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FROZEN', x, y + 3);
      }
    });
    s.mesh(new THREE.PlaneGeometry(L * 0.86, L * 0.86 * 160 / 512), new THREE.MeshStandardMaterial({ map: decal, transparent: true, alphaTest: 0.3, roughness: 0.5 }), [-0.08, FOOT + 0.36, D / 2 + 0.004]).castShadow = false;

    // The heap.
    const bare = a.holds === 'bare';
    const level = bare ? 0.2 : mix(0.4, 0.74, clamp01(mood.density * 1.1)) - (thawed ? 0.06 : 0);
    const IX = L / 2 - WALL - 0.02, IZ = D / 2 - WALL - 0.02;
    const bedColour = thawed ? '#8a969c' : '#eef4f7';
    const bed = s.box([IX * 2, level - FOOT, IZ * 2], [0, (level + FOOT) / 2, 0], thawed ? new THREE.MeshStandardMaterial({ color: bedColour, roughness: 0.05, metalness: 0.4 }) : s.material(bedColour, { roughness: 0.95 }));
    bed.castShadow = false;
    const balls: Item[] = [], boxes: Item[] = [], cyls: Item[] = [], cones: Item[] = [], discs: Item[] = [];
    const LOUD = ['#e8281e', '#f07a1c', '#f5cb1c', '#5cc21f', '#1d7fd0', '#b03ac8', '#ff5fb4', '#16b8a8'];
    const sink = a.state === 'iced' ? 0.75 : thawed ? 0.55 : 0.2;
    const make = (kind: Exclude<typeof a.holds, 'jumble' | 'bare'>, x: number, y: number, z: number, loose = false) => {
      const turn = kind === 'fish' ? (random() - 0.5) * 0.8 + (random() < 0.5 ? Math.PI : 0) : random() * Math.PI * 2, tilt = (random() - 0.5) * (loose ? 0.3 : 0.7), roll = (random() - 0.5) * (loose ? 0.3 : 0.7);
      const at: [number, number, number] = [x, y, z];
      if (kind === 'turkeys') {
        balls.push({ at, size: [0.2, 0.135, 0.155], turn, tilt, roll, colour: pick(['#ecdcc4', '#e6d2b8', '#f0e4d0']) });
        for (const side of [-1, 1]) balls.push({ at, local: [0.16, 0.03, side * 0.07], size: [0.075, 0.05, 0.05], turn, tilt, roll, colour: '#e8d6bc' });
        discs.push({ at, local: [-0.02, 0.125, 0], size: [0.085, 0.02, 0.085], turn, tilt, roll, colour: pick(['#f5cb1c', '#e8281e', '#1d7fd0']) });
        return 0.13;
      }
      if (kind === 'fish') {
        const len = 0.2 + random() * 0.1, colour = pick(['#6e8494', '#5a7286', '#8496a2', '#6a8a84', '#c05a4a']);
        balls.push({ at, size: [len, 0.04, 0.075], turn, tilt: tilt * 0.3, roll: roll * 0.3, colour });
        balls.push({ at, local: [0, -0.012, 0], size: [len * 0.9, 0.034, 0.07], turn, tilt: tilt * 0.3, roll: roll * 0.3, colour: '#dfe6ea' });
        cones.push({ at, local: [-len - 0.03, 0, 0], size: [0.016, 0.11, 0.1], turn, tilt: tilt * 0.3, roll: -Math.PI / 2 + roll * 0.3, colour: '#3e5060' });
        balls.push({ at, local: [len * 0.72, 0.018, 0.035], size: [0.016, 0.016, 0.016], turn, tilt: tilt * 0.3, roll: roll * 0.3, colour: '#15181c' });
        return 0.03;
      }
      if (kind === 'popsicles') {
        const colour = pick(LOUD);
        if (random() < 0.55) { boxes.push({ at, size: [0.22, 0.07, 0.13], turn, tilt, roll, colour }); boxes.push({ at, local: [0, 0.036, 0], size: [0.15, 0.004, 0.08], turn, tilt, roll, colour: '#f8f4e6' }); return 0.05; }
        boxes.push({ at, size: [0.05, 0.022, 0.12], turn, tilt, roll, colour }); boxes.push({ at, local: [0, 0, 0.085], size: [0.012, 0.005, 0.06], turn, tilt, roll, colour: '#d8bc8a' });
        return 0.012;
      }
      if (kind === 'dumplings') {
        balls.push({ at, size: [0.15, 0.045, 0.11], turn, tilt: tilt * 0.5, roll: roll * 0.5, colour: pick(['#f4f0e6', '#ece6da', '#f8f6f0']) });
        boxes.push({ at, local: [0, 0.042, 0], size: [0.13, 0.006, 0.07], turn, tilt: tilt * 0.5, roll: roll * 0.5, colour: pick(['#d02a22', '#d02a22', '#1f7a3a', '#e8a81c']) });
        return 0.04;
      }
      if (kind === 'icecream') {
        const colour = pick(['#f2b8c8', '#f6ecd2', '#7a5238', '#9ad8c8', '#f4d86a', '#d83a5a', '#a88ae0']);
        cyls.push({ at, size: [0.085, 0.13, 0.085], turn, tilt: tilt * 0.5, roll: roll * 0.5, colour });
        discs.push({ at, local: [0, 0.07, 0], size: [0.09, 0.022, 0.09], turn, tilt: tilt * 0.5, roll: roll * 0.5, colour: pick(['#f8f4e6', '#2a2a30', '#d8b84a']) });
        return 0.065;
      }
      balls.push({ at, size: [0.12, 0.05, 0.16], turn, tilt: tilt * 0.5, roll: roll * 0.5, colour: pick(['#3f9a3a', '#58b040', '#e8b81c', '#2f8a4a']) });
      boxes.push({ at, local: [0, 0.047, 0], size: [0.1, 0.006, 0.07], turn, tilt: tilt * 0.5, roll: roll * 0.5, colour: '#f6f2e4' });
      return 0.045;
    };
    const kinds = ['turkeys', 'fish', 'popsicles', 'dumplings', 'icecream', 'peas'] as const;
    const kindOf = () => a.holds === 'jumble' || a.holds === 'bare' ? pick(kinds) : a.holds;
    if (bare) make(kindOf(), (random() - 0.5) * IX, level + 0.03, (random() - 0.5) * IZ, true);
    else {
      const big = a.holds === 'turkeys', long = a.holds === 'fish', nx = big ? 5 : long ? 5 : 8, nz = big ? 3 : 4, layers = big || long ? 2 : 3;
      for (let layer = 0; layer < layers; layer++) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        if (layer > 0 && random() > mix(0.25, 0.8, mood.density) / layer) continue;
        const x = (i + 0.5) / nx * 2 * IX - IX + (random() - 0.5) * 0.1, z = (j + 0.5) / nz * 2 * IZ - IZ + (random() - 0.5) * 0.08;
        const mound = Math.cos(x / IX * 1.3) * Math.cos(z / IZ * 1.2) * 0.07;
        const kind = kindOf(), rise = big ? 0.12 : 0.045;
        make(kind, THREE.MathUtils.clamp(x, -IX + (kind === 'fish' ? 0.36 : 0.14), IX - (kind === 'fish' ? 0.36 : 0.14)), level + (layer === 0 ? (kind === 'turkeys' ? 0.13 : 0.04) * (1 - sink) : layer * rise + mound * layer + 0.03), THREE.MathUtils.clamp(z, -IZ + (kind === 'fish' ? 0.2 : 0.1), IZ - (kind === 'fish' ? 0.2 : 0.1)));
      }
    }
    // Frost: dusting, crust on the rim, or a slab.
    const frostMat = s.material('#f6fafc', { roughness: 0.95 });
    const crust = thawed ? 0 : (a.state === 'crusted' ? 1 : a.state === 'iced' ? 0.8 : 0.15) + mood.wear * 0.4;
    const lumps = Array.from({ length: Math.round(crust * 90) }, () => {
      const along = random() < 0.66, side = random() < 0.5 ? -1 : 1;
      return { at: [along ? (random() - 0.5) * 2 * IX : side * (IX - random() * 0.03), H - 0.1 - random() * (H - level - 0.12) * 0.8, along ? side * (IZ - random() * 0.03) : (random() - 0.5) * 2 * IZ] as const, size: 0.02 + random() * 0.045 * Math.min(1, crust) };
    });
    if (lumps.length) s.scatter(new THREE.SphereGeometry(1, 8, 6), frostMat, lumps).castShadow = false;
    if (a.state === 'iced') for (let i = 0; i < 26; i++) balls.push({ at: [(random() - 0.5) * 2 * (IX - 0.1), level + 0.01, (random() - 0.5) * 2 * (IZ - 0.08)], size: [0.14 + random() * 0.14, 0.035 + random() * 0.03, 0.12 + random() * 0.1], turn: random() * 3, colour: '#f2f8fb' });

    // Rummaged: strays on the rim and the floor.
    if (a.rummaged && !bare) {
      for (let i = 0; i < 3; i++) { const kind = kindOf(); make(kind, (random() - 0.5) * (L - 0.4), H + 0.03 + (kind === 'turkeys' ? 0.1 : 0.02), D / 2 - 0.03 + random() * 0.03, true); }
      for (let i = 0; i < 2; i++) { const kind = kindOf(); make(kind, (random() - 0.5) * L, kind === 'turkeys' ? 0.13 : 0.04, D / 2 + 0.2 + random() * 0.25, true); }
    }
    const goods = () => new THREE.MeshStandardMaterial({ roughness: thawed ? 0.25 : 0.5 });
    s.root.add(instances(new THREE.SphereGeometry(1, 16, 10), goods(), balls), instances(new THREE.BoxGeometry(1, 1, 1), goods(), boxes), instances(new THREE.CylinderGeometry(0.5, 0.42, 1, 16), goods(), cyls), instances(new THREE.ConeGeometry(1, 1, 3), goods(), cones), instances(new THREE.CylinderGeometry(0.5, 0.5, 1, 16), goods(), discs));

    // Lids.
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d8f0ff', transparent: true, opacity: 0.16 + mood.wear * 0.12, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const lidFrame = s.material(a.style === 'woodgrain' || a.style === 'steel' ? '#c8ced0' : '#e6e9ea', { metalness: 0.6, roughness: 0.35 });
    const PL = L / 2 + 0.02, PD = D - 0.12;
    const pane = () => {
      const g = new THREE.Group();
      const add = (size: [number, number, number], at: [number, number, number], m: THREE.Material) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), m); mesh.position.set(...at); mesh.castShadow = m !== glass; g.add(mesh); };
      add([PL, 0.006, PD], [0, 0, 0], glass);
      for (const side of [-1, 1]) { add([PL, 0.02, 0.025], [0, 0, side * PD / 2], lidFrame); add([0.025, 0.02, PD], [side * PL / 2, 0, 0], lidFrame); }
      add([0.03, 0.03, 0.3], [PL / 2 - 0.06, 0.02, 0], dark);
      s.root.add(g); return g;
    };
    if (a.lid === 'shut' || a.lid === 'half') {
      const first = pane(), second = pane();
      first.position.set(-PL / 2 + 0.02, H + 0.03, 0); second.position.set(PL / 2 - 0.02, H + 0.055, 0); second.rotation.y = Math.PI;
      if (a.lid === 'half') first.position.x = PL / 2 - 0.08 - random() * 0.25;
    } else if (a.lid === 'off') {
      for (let i = 0; i < 2; i++) { const g = pane(); g.rotation.set(0, Math.PI / 2, 0); g.rotateX(0); g.rotation.z = Math.PI / 2 - 0.2 - i * 0.07; g.position.set(-L / 2 - 0.1 - i * 0.07, PL / 2 * Math.cos(0.2) + 0.01, (random() - 0.5) * 0.1); }
    } else {
      const railY = H + 0.2;
      for (const side of [-1, 1]) {
        const front = s.box([L - 0.04, 0.2, 0.006], [0, H + 0.11, side * (D / 2 - 0.03)], glass); front.castShadow = false;
        const end = s.box([0.006, 0.2, D - 0.06], [side * (L / 2 - 0.03), H + 0.11, 0], glass); end.castShadow = false;
        s.box([L - 0.02, 0.018, 0.018], [0, railY + 0.01, side * (D / 2 - 0.03)], lidFrame); s.box([0.018, 0.018, D - 0.04], [side * (L / 2 - 0.03), railY + 0.01, 0], lidFrame);
        for (const end2 of [-1, 1]) s.box([0.018, 0.22, 0.018], [end2 * (L / 2 - 0.03), H + 0.11, side * (D / 2 - 0.03)], lidFrame);
      }
    }

    // Price card on a wire stalk.
    const cx = L / 2 - 0.42 - random() * 0.5, stalk = 0.42;
    const wire = s.material('#c8ccd0', { metalness: 0.8, roughness: 0.3 });
    s.rod([cx, H, -D / 2 + 0.04], [cx, H + stalk, -D / 2 + 0.04], 0.006, wire);
    s.box([0.08, 0.012, 0.03], [cx, H + 0.012, -D / 2 + 0.04], wire);
    if (a.card !== 'none') {
      const paper = mood.cheer > 0.66 ? '#ffe81c' : mood.cheer > 0.33 ? '#ff8ac0' : '#f4f0e2';
      const price = pick(['99¢', '79¢', '$1.29', '49¢', '$2.99']);
      const lines = { perlb: [NAMES[a.holds], price, a.holds === 'turkeys' || a.holds === 'fish' ? 'per lb' : 'each'], special: ["MANAGER'S", 'SPECIAL', NAMES[a.holds]], bogo: ['BUY 1', 'GET 1', 'FREE'], last: ['LAST', 'ONES!', ''], limit: ['LIMIT 2', 'PER FAMILY', NAMES[a.holds]] }[a.card];
      const art = paint(256, 200, (ctx) => {
        ctx.fillStyle = paper; ctx.fillRect(0, 0, 256, 200);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        lines.forEach((line, i) => {
          const bigLine = (a.card === 'perlb' && i === 1) || (a.card !== 'perlb' && i < 2 && a.card !== 'limit') || (a.card === 'limit' && i === 0);
          ctx.save(); ctx.translate(128 + (random() - 0.5) * 10, [44, 104, 164][i] + (a.card === 'last' ? 22 : 0)); ctx.rotate((random() - 0.5) * 0.09);
          ctx.fillStyle = bigLine ? '#d0201c' : '#1c2a6a'; ctx.font = `italic 900 ${bigLine ? (a.card === 'perlb' ? 78 : 56) : 34}px sans-serif`; ctx.fillText(line, 0, 0, 236); ctx.restore();
        });
        if (a.card === 'last') { ctx.strokeStyle = '#d0201c'; ctx.lineWidth = 5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(40, 166 + i * 10); ctx.lineTo(216 - i * 14, 162 + i * 10); ctx.stroke(); } }
      });
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.006), [liner, liner, liner, liner, new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 }), liner]);
      card.position.set(cx, H + stalk + 0.1, -D / 2 + 0.046); card.castShadow = true; s.root.add(card);
      card.rotation.z = (random() - 0.5) * 0.12 * (1 + mood.wear);
      card.rotation.x = -0.12;
    }
    // Thawed: meltwater creeping out across the floor.
    if (thawed) {
      const shape = new THREE.Shape(); const phase = random() * 6;
      for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 2, r = 1 + 0.12 * Math.sin(t * 3 + phase) + 0.08 * Math.sin(t * 7 + phase); const x = Math.cos(t) * r * (L / 2 + 0.2), y = Math.sin(t) * r * (D / 2 + 0.24); if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
      s.mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8c9ca4', roughness: 0.04, metalness: 0.5, transparent: true, opacity: 0.8 }), [0.1, 0.004, 0.12]).castShadow = false;
    }
    return s.finish();
  },
});
