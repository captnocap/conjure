import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COLLECTIONS = {
  venetian: 'Venetian carnival: white jut-chinned bautas, feathered colombina half-masks, gilded full faces and belled jesters.',
  plague: 'Plague doctors: long leather beaks with round glass lenses under wide black hats.',
  'noh-oni': 'Japanese theatre and festival: pale serene noh faces, horned red oni demons and white fox masks.',
  luchador: 'Lucha libre: bright full-head wrestling hoods with flame eyes and emblems.',
  halloween: 'Rubber Halloween monsters: green flat-top monster, pumpkin, skull, witch and wolf.',
  medical: 'Faces of emergency: surgical masks, cup respirators and twin-lens gas masks with canisters.',
  'paper-plate': 'Children’s paper-plate animals: lion, cat, rabbit, pig, frog and bear on elastic.',
  mixed: 'A collector’s jumble of everything, no two alike.',
} as const;
const KINDS: Record<keyof typeof COLLECTIONS, string[]> = {
  venetian: ['bauta', 'colombina', 'volto', 'jester', 'colombina'],
  plague: ['plague', 'plague', 'bauta', 'plague'],
  'noh-oni': ['oni', 'noh', 'fox', 'noh', 'oni'],
  luchador: ['hood'],
  halloween: ['frank', 'pumpkin', 'skull', 'witch', 'wolf'],
  medical: ['gas', 'surgical', 'respirator', 'surgical', 'gas'],
  'paper-plate': ['lion', 'cat', 'rabbit', 'pig', 'frog', 'bear'],
  mixed: ['plague', 'oni', 'hood', 'colombina', 'pumpkin', 'gas', 'lion', 'bauta', 'skull', 'fox', 'jester', 'noh', 'frank', 'rabbit', 'witch'],
};
const NATURAL: Record<string, [string, string, string]> = {
  bauta: ['#f1ede2', '#141414', '#d2a93c'], colombina: ['#7a1f4a', '#1f3f7a', '#d2a93c'], volto: ['#f4f0e6', '#b0222c', '#d2a93c'], jester: ['#f1ede2', '#b0222c', '#2c7a4a'],
  plague: ['#3a2a20', '#161413', '#b98a3a'], noh: ['#f0e6cf', '#1a1a1a', '#b3262c'], oni: ['#c0222a', '#f0e6cf', '#e0b53c'], fox: ['#f6f3ea', '#c0222a', '#e0b53c'],
  hood: ['#1f8fd6', '#f2f2f2', '#e8c22c'], frank: ['#7fa35a', '#161616', '#9aa0a4'], pumpkin: ['#e8791c', '#2a1c10', '#4d7a2c'], skull: ['#ece5d0', '#141414', '#141414'],
  witch: ['#6f9a3a', '#161616', '#7a3a8a'], wolf: ['#6b4a30', '#2a1c14', '#e8c22c'], gas: ['#3b4034', '#9aa0a4', '#5c6a4a'], surgical: ['#a9d3e6', '#f2f2f2', '#f2f2f2'],
  respirator: ['#f2f0ea', '#e8c22c', '#9aa0a4'], lion: ['#f0b23c', '#b5651d', '#3a2414'], cat: ['#8d8d92', '#f0a3b3', '#1c1c1c'], rabbit: ['#f6f4ee', '#f0a3b3', '#1c1c1c'],
  pig: ['#f2a6b6', '#e07f97', '#1c1c1c'], frog: ['#6fbf4a', '#f6f4ee', '#1c1c1c'], bear: ['#8a5a34', '#d9b88a', '#1c1c1c'],
};

export default defineThing({
  questions: {
    collection: choice('What masks hang on the board?', COLLECTIONS),
    count: score('How many masks are there?', ['Three or four, each given room', 'A couple of rows', 'A crowded board of fifteen']),
    colour: choice('How are they coloured?', {
      traditional: 'Each in its proper traditional colours.',
      gilded: 'All ivory white and gold, a matched ceremonial set.',
      'scarlet-black': 'Scarlet and black with gold, theatrical and dangerous.',
      rainbow: 'Every mask a different loud colour.',
      faded: 'Sun-bleached and dusty, colours nearly gone.',
    }),
    gap: choice('Which peg is empty?', {
      none: 'None: the set is complete.',
      centre: 'The pride-of-place peg in the middle: a clean outline where the best one hung.',
      corner: 'A top corner peg, its ribbon still dangling.',
      several: 'Several pegs scattered across the board, as if a party just left with them.',
    }),
    board: choice('What is the board like?', {
      pegboard: 'Brown workshop pegboard full of holes.',
      white: 'A painted white shop panel.',
      velvet: 'Deep red velvet in a gilt frame.',
      slate: 'A dark charcoal museum panel.',
    }),
    labels: choice('How are the masks marked?', {
      none: 'Not at all: a private collection.',
      price: 'Little hanging price tags: a shop.',
      numbered: 'Stencilled inventory numbers: a prop store.',
      museum: 'Small printed cards under each: a museum.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = 4 + Math.round(a.count * 11);
    const cols = count <= 4 ? 2 : count <= 6 ? 3 : count <= 9 ? 3 : count <= 12 ? 4 : 5;
    const rows = Math.ceil(count / cols);
    const CW = 0.31, CH = 0.36;
    const BW = cols * CW + 0.1, BH = rows * CH + 0.1, BY = 0.62;
    const mats = new Map<string, THREE.MeshStandardMaterial>();
    const mat = (tint: string, options: THREE.MeshStandardMaterialParameters = {}) => {
      const key = tint + JSON.stringify(options);
      if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6, ...options }));
      return mats.get(key)!;
    };
    const dark = mat('#101012', { roughness: 0.9 }), gold = mat('#d2a93c', { metalness: 0.8, roughness: 0.3 }), steel = mat('#9aa0a4', { metalness: 0.8, roughness: 0.3 });
    const glass = mat('#b9d3d6', { metalness: 0.9, roughness: 0.1 });
    const SPHERE = new THREE.SphereGeometry(1, 18, 12), FRONT = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI), BOX = new THREE.BoxGeometry(1, 1, 1);
    const CONE = new THREE.ConeGeometry(1, 1, 12), TRI = new THREE.ConeGeometry(1, 1, 3), DISC = new THREE.CylinderGeometry(1, 1, 1, 26);

    const tints = (kind: string): [string, string, string] => {
      const natural = NATURAL[kind];
      if (a.colour === 'gilded') return ['#f3efe4', '#d2a93c', '#d2a93c'];
      if (a.colour === 'scarlet-black') return random() < 0.5 ? ['#b01c24', '#141414', '#d2a93c'] : ['#18181a', '#b01c24', '#d2a93c'];
      if (a.colour === 'rainbow') { const h = random(); return [`#${new THREE.Color().setHSL(h, 0.75, 0.52).getHexString()}`, `#${new THREE.Color().setHSL((h + 0.45) % 1, 0.8, 0.6).getHexString()}`, '#f2e23c']; }
      if (a.colour === 'faded') return natural.map((tint) => `#${new THREE.Color(tint).lerp(new THREE.Color('#d6cfbf'), 0.58).getHexString()}`) as [string, string, string];
      if (kind === 'hood') { const h = random(); return [`#${new THREE.Color().setHSL(h, 0.8, 0.48).getHexString()}`, random() < 0.5 ? '#f2f2f2' : '#141414', `#${new THREE.Color().setHSL((h + 0.5) % 1, 0.85, 0.55).getHexString()}`]; }
      if (kind === 'colombina') { const h = random(); return [`#${new THREE.Color().setHSL(h, 0.6, 0.36).getHexString()}`, `#${new THREE.Color().setHSL((h + 0.3) % 1, 0.7, 0.5).getHexString()}`, '#d2a93c']; }
      if (kind === 'oni' && random() < 0.35) return ['#2c5fa8', natural[1], natural[2]];
      return natural;
    };

    function mask(kind: string) {
      const g = new THREE.Group();
      const [c1, c2, c3] = tints(kind);
      const m1 = mat(c1), m2 = mat(c2), m3 = mat(c3);
      const add = (geo: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], size: [number, number, number], turn: [number, number, number] = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(...at); mesh.scale.set(...size); mesh.rotation.set(...turn);
        mesh.castShadow = mesh.receiveShadow = true;
        g.add(mesh);
        return mesh;
      };
      const eyes = (y: number, z: number, w = 0.02, h = 0.012, gap = 0.034, slant = 0, material: THREE.Material = dark) => { for (const k of [1, -1]) add(SPHERE, material, [k * gap, y, z], [w, h, 0.006], [0, 0, k * slant]); };
      const plate = (tint: THREE.Material, r = 0.105) => { add(DISC, tint, [0, 0, 0.004], [r, 0.006, r], [Math.PI / 2, 0, 0]); add(new THREE.TorusGeometry(r, 0.005, 5, 28), mat('#f4f1e8'), [0, 0, 0.006], [1, 1, 1]); };
      switch (kind) {
        case 'bauta':
          add(FRONT, m1, [0, 0.02, 0], [0.085, 0.095, 0.05]);
          add(BOX, m1, [0, -0.07, 0.04], [0.105, 0.075, 0.07], [0.55, 0, 0]);
          add(BOX, m1, [0, 0.0, 0.052], [0.022, 0.06, 0.03], [-0.35, 0, 0]);
          eyes(0.035, 0.044, 0.02, 0.011);
          add(new THREE.TorusGeometry(0.08, 0.004, 5, 20, Math.PI), m3, [0, 0.03, 0.012], [1, 1.15, 1]);
          break;
        case 'colombina':
          add(FRONT, m1, [0, 0.02, 0], [0.1, 0.048, 0.04]);
          add(new THREE.TorusGeometry(1, 0.045, 5, 28), m3, [0, 0.02, 0.004], [0.098, 0.046, 0.05]);
          eyes(0.022, 0.034, 0.024, 0.012, 0.04, 0.2);
          add(CONE, m1, [0, 0.0, 0.042], [0.012, 0.035, 0.014], [0.3, 0, 0]);
          for (let i = 0; i < 6; i++) add(CONE, i % 2 ? m2 : m3, [0.085 + Math.sin(i * 0.3 - 0.3) * 0.05, 0.085 + Math.cos(i * 0.3 - 0.3) * 0.05, 0.01], [0.016, 0.16 + (i % 3) * 0.02, 0.004], [0, 0, -(i * 0.3 - 0.3) - 0.35]);
          add(SPHERE, m3, [0.088, 0.045, 0.02], [0.014, 0.014, 0.01]);
          break;
        case 'volto':
        case 'jester':
          add(FRONT, m1, [0, 0, 0], [0.08, 0.108, 0.05]);
          eyes(0.03, 0.043, 0.02, 0.01);
          add(BOX, m1, [0, 0.0, 0.05], [0.018, 0.05, 0.022], [-0.3, 0, 0]);
          add(SPHERE, m2, [0, -0.052, 0.042], [0.018, 0.007, 0.006]);
          add(BOX, m2, [0.045, -0.02, 0.036], [0.022, 0.022, 0.004], [0, 0.5, Math.PI / 4]);
          add(new THREE.TorusGeometry(0.078, 0.004, 5, 20, Math.PI), gold, [0, 0.03, 0.012], [1, 1.05, 1]);
          if (kind === 'jester') for (let i = -1; i <= 1; i++) { add(CONE, i ? m3 : m2, [i * 0.07, 0.13 - Math.abs(i) * 0.03, 0.01], [0.03, 0.12, 0.02], [0, 0, -i * 0.75]); add(SPHERE, gold, [i * 0.115, 0.185 - Math.abs(i) * 0.05, 0.01], [0.012, 0.012, 0.012]); }
          break;
        case 'plague':
          add(FRONT, m1, [0, 0.01, 0], [0.078, 0.092, 0.05]);
          add(CONE, m1, [0, -0.05, 0.12], [0.038, 0.22, 0.045], [1.85, 0, 0]);
          for (const k of [1, -1]) { add(new THREE.TorusGeometry(0.023, 0.006, 6, 18), m3, [k * 0.037, 0.035, 0.046], [1, 1, 1]); add(DISC, glass, [k * 0.037, 0.035, 0.044], [0.021, 0.004, 0.021], [Math.PI / 2, 0, 0]); }
          add(DISC, m2, [0, 0.1, 0.0], [0.13, 0.008, 0.11], [-0.25, 0, 0]);
          add(DISC, m2, [0, 0.13, -0.008], [0.06, 0.07, 0.055], [-0.25, 0, 0]);
          for (let i = 0; i < 4; i++) add(SPHERE, m3, [0.012, -0.03 - i * 0.012, 0.075 + i * 0.03], [0.004, 0.004, 0.004]);
          break;
        case 'noh':
          add(FRONT, m1, [0, 0, 0], [0.07, 0.108, 0.042]);
          eyes(0.022, 0.037, 0.016, 0.0035, 0.03, -0.08);
          eyes(0.07, 0.03, 0.012, 0.007, 0.028, 0, mat('#6f6a60'));
          add(SPHERE, m3, [0, -0.052, 0.036], [0.014, 0.0065, 0.006]);
          add(BOX, m1, [0, -0.005, 0.041], [0.014, 0.04, 0.016], [-0.3, 0, 0]);
          add(new THREE.TorusGeometry(0.064, 0.007, 5, 20, Math.PI), m2, [0, 0.045, 0.006], [1, 1.05, 1]);
          break;
        case 'oni':
          add(FRONT, m1, [0, 0, 0], [0.09, 0.1, 0.055]);
          for (const k of [1, -1]) { add(CONE, m2, [k * 0.045, 0.125, 0.02], [0.016, 0.075, 0.016], [0.2, 0, -k * 0.3]); add(BOX, m3, [k * 0.036, 0.05, 0.047], [0.04, 0.012, 0.012], [0, 0, -k * 0.5]); add(SPHERE, m3, [k * 0.035, 0.026, 0.047], [0.014, 0.012, 0.008]); add(SPHERE, dark, [k * 0.035, 0.026, 0.054], [0.005, 0.005, 0.004]); }
          add(SPHERE, m1, [0, -0.008, 0.058], [0.022, 0.018, 0.016]);
          add(BOX, dark, [0, -0.052, 0.045], [0.075, 0.026, 0.01]);
          for (const k of [1, -1]) { add(CONE, m2, [k * 0.028, -0.048, 0.052], [0.006, 0.024, 0.006]); add(CONE, m2, [k * 0.012, -0.055, 0.052], [0.005, 0.018, 0.005], [Math.PI, 0, 0]); }
          break;
        case 'fox':
          add(FRONT, m1, [0, 0.01, 0], [0.07, 0.085, 0.045]);
          add(CONE, m1, [0, -0.03, 0.07], [0.034, 0.1, 0.03], [1.75, 0, 0]);
          add(SPHERE, dark, [0, -0.045, 0.118], [0.008, 0.007, 0.007]);
          for (const k of [1, -1]) { add(TRI, m1, [k * 0.048, 0.115, 0.005], [0.03, 0.075, 0.008], [0, 0, -k * 0.2]); add(TRI, m2, [k * 0.048, 0.108, 0.011], [0.016, 0.045, 0.004], [0, 0, -k * 0.2]); add(BOX, m2, [k * 0.05, -0.012, 0.03], [0.03, 0.006, 0.004], [0, k * 0.5, k * 0.5]); }
          eyes(0.03, 0.037, 0.018, 0.005, 0.03, 0.4);
          add(SPHERE, m2, [0, 0.065, 0.034], [0.006, 0.014, 0.004]);
          break;
        case 'hood': {
          add(SPHERE, m1, [0, 0, 0], [0.085, 0.108, 0.075]);
          add(DISC, m1, [0, -0.11, 0], [0.066, 0.045, 0.058]);
          for (const k of [1, -1]) { add(SPHERE, m2, [k * 0.036, 0.03, 0.062], [0.034, 0.02, 0.012], [0, k * 0.35, k * 0.45]); add(SPHERE, dark, [k * 0.034, 0.026, 0.068], [0.017, 0.009, 0.008], [0, k * 0.35, k * 0.3]); }
          add(SPHERE, m2, [0, -0.052, 0.062], [0.032, 0.02, 0.012]);
          add(SPHERE, dark, [0, -0.052, 0.068], [0.018, 0.008, 0.008]);
          add(BOX, m2, [0, -0.012, 0.073], [0.012, 0.03, 0.008]);
          const emblem = Math.floor(random() * 3);
          if (emblem === 0) { add(BOX, m3, [0, 0.078, 0.052], [0.012, 0.04, 0.006], [-0.6, 0, 0]); add(BOX, m3, [0, 0.082, 0.05], [0.036, 0.012, 0.006], [-0.6, 0, 0]); }
          else if (emblem === 1) add(new THREE.OctahedronGeometry(1), m3, [0, 0.08, 0.052], [0.02, 0.02, 0.005], [-0.6, 0, 0]);
          else for (const k of [1, -1]) add(TRI, m3, [k * 0.03, 0.085, 0.045], [0.016, 0.05, 0.004], [-0.6, k * 0.3, k * 0.5]);
          break;
        }
        case 'frank':
          add(FRONT, m1, [0, 0, 0], [0.08, 0.105, 0.05]);
          add(BOX, m2, [0, 0.092, 0.012], [0.165, 0.045, 0.085]);
          for (let i = -2; i <= 2; i++) add(TRI, m2, [i * 0.03, 0.064, 0.045], [0.014, 0.03, 0.004], [Math.PI, 0, 0]);
          add(BOX, m1, [0, 0.045, 0.045], [0.12, 0.016, 0.02]);
          eyes(0.026, 0.044, 0.018, 0.008);
          for (const k of [1, -1]) add(DISC, m3, [k * 0.085, -0.05, 0.005], [0.01, 0.035, 0.01], [0, 0, Math.PI / 2]);
          add(BOX, dark, [0, -0.055, 0.042], [0.045, 0.005, 0.006]);
          add(BOX, dark, [0.03, 0.068, 0.044], [0.004, 0.035, 0.004], [0, 0, 0.5]);
          break;
        case 'pumpkin':
          add(SPHERE, m1, [0, 0, 0], [0.1, 0.09, 0.055]);
          for (const k of [1, -1]) { add(SPHERE, m1, [k * 0.05, 0, 0.006], [0.062, 0.086, 0.052]); add(TRI, m2, [k * 0.036, 0.022, 0.054], [0.02, 0.03, 0.004]); }
          add(TRI, m2, [0, -0.006, 0.058], [0.01, 0.014, 0.004]);
          for (let i = -3; i <= 3; i++) add(TRI, m2, [i * 0.016, -0.04 - (9 - i * i) * 0.0012, 0.054], [0.011, 0.02, 0.004], [i % 2 ? Math.PI : 0, 0, 0]);
          add(DISC, m3, [0.004, 0.098, 0], [0.012, 0.03, 0.012], [0, 0, -0.25]);
          break;
        case 'skull':
          add(FRONT, m1, [0, 0.02, 0], [0.08, 0.085, 0.052]);
          add(BOX, m1, [0, -0.065, 0.02], [0.085, 0.05, 0.045]);
          eyes(0.03, 0.045, 0.024, 0.024, 0.034);
          add(TRI, dark, [0, -0.012, 0.052], [0.011, 0.02, 0.004]);
          add(BOX, dark, [0, -0.062, 0.044], [0.07, 0.004, 0.004]);
          for (let i = -3; i <= 3; i++) add(BOX, dark, [i * 0.011, -0.062, 0.044], [0.0025, 0.03, 0.004]);
          break;
        case 'witch':
          add(FRONT, m1, [0, 0, 0], [0.075, 0.1, 0.045]);
          add(CONE, m1, [0, -0.015, 0.07], [0.016, 0.1, 0.02], [1.9, 0, 0.1]);
          add(SPHERE, m3, [0.006, 0.0, 0.075], [0.005, 0.005, 0.005]);
          add(CONE, m1, [0, -0.095, 0.03], [0.022, 0.06, 0.02], [2.6, 0, 0]);
          eyes(0.03, 0.04, 0.016, 0.008, 0.03, 0.3);
          add(BOX, dark, [0, -0.055, 0.038], [0.04, 0.005, 0.006], [0, 0, 0.12]);
          add(DISC, m2, [0, 0.085, 0.0], [0.14, 0.008, 0.12], [-0.2, 0, 0]);
          add(CONE, m2, [0.01, 0.2, -0.02], [0.062, 0.24, 0.06], [-0.2, 0, -0.1]);
          add(DISC, m3, [0, 0.1, -0.003], [0.064, 0.02, 0.062], [-0.2, 0, 0]);
          break;
        case 'wolf':
          add(FRONT, m1, [0, 0, 0], [0.085, 0.095, 0.05]);
          add(BOX, m1, [0, -0.035, 0.07], [0.05, 0.042, 0.08]);
          add(SPHERE, dark, [0, -0.018, 0.112], [0.014, 0.01, 0.01]);
          add(BOX, dark, [0, -0.052, 0.085], [0.046, 0.008, 0.06]);
          for (const k of [1, -1]) { add(TRI, m1, [k * 0.055, 0.105, 0.0], [0.03, 0.075, 0.012], [0, 0, -k * 0.35]); add(SPHERE, m3, [k * 0.033, 0.032, 0.045], [0.013, 0.008, 0.006], [0, 0, k * 0.4]); add(CONE, mat('#f1ead2'), [k * 0.018, -0.056, 0.108], [0.005, 0.02, 0.005], [Math.PI, 0, 0]); for (let i = 0; i < 4; i++) add(TRI, m2, [k * (0.075 + (i % 2) * 0.01), -0.05 + i * 0.03, 0.01], [0.012, 0.045, 0.004], [0, 0, k * (-1.2 - i * 0.15)]); }
          break;
        case 'gas':
          add(FRONT, m1, [0, 0, 0], [0.08, 0.1, 0.06]);
          for (const k of [1, -1]) { add(DISC, m2, [k * 0.035, 0.03, 0.05], [0.03, 0.016, 0.03], [Math.PI / 2, 0, 0]); add(DISC, glass, [k * 0.035, 0.03, 0.058], [0.024, 0.004, 0.024], [Math.PI / 2, 0, 0]); add(BOX, m1, [k * 0.075, 0.06, -0.01], [0.012, 0.012, 0.09], [0.3, k * 0.5, 0]); }
          add(DISC, m3, [0, -0.055, 0.075], [0.042, 0.06, 0.042], [1.2, 0, 0]);
          add(DISC, m2, [0, -0.07, 0.106], [0.036, 0.006, 0.036], [1.2, 0, 0]);
          break;
        case 'surgical':
          add(new THREE.CylinderGeometry(1, 1, 1, 18, 1, true, -0.95, 1.9), mat(c1, { side: THREE.DoubleSide, roughness: 0.9 }), [0, -0.01, -0.02], [0.085, 0.1, 0.07]);
          for (let i = -1; i <= 1; i++) add(new THREE.CylinderGeometry(1, 1, 1, 18, 1, true, -0.93, 1.86), mat('#7fb3cc', { side: THREE.DoubleSide }), [0, -0.01 + i * 0.024, -0.02], [0.0865, 0.004, 0.0712]);
          for (const k of [1, -1]) add(new THREE.TorusGeometry(0.04, 0.0025, 5, 18, Math.PI), m2, [k * 0.085, -0.01, 0.01], [1, 1, 1], [0, 0, -k * Math.PI / 2]);
          add(BOX, m2, [0, 0.036, 0.048], [0.05, 0.004, 0.004]);
          break;
        case 'respirator':
          add(FRONT, m1, [0, 0, 0], [0.065, 0.06, 0.05]);
          add(DISC, m3, [0.02, -0.01, 0.045], [0.018, 0.008, 0.018], [Math.PI / 2 - 0.2, 0, -0.4]);
          for (const y of [0.025, -0.02]) add(new THREE.TorusGeometry(0.075, 0.003, 5, 22), m2, [0, y, -0.03], [1, 0.3, 1], [Math.PI / 2 - 0.15, 0, 0]);
          add(BOX, steel, [0, 0.045, 0.03], [0.04, 0.005, 0.004]);
          break;
        case 'lion':
          for (let i = 0; i < 14; i++) add(TRI, m2, [Math.sin(i / 14 * 6.283) * 0.11, Math.cos(i / 14 * 6.283) * 0.11, 0], [0.032, 0.07, 0.004], [0, 0, -i / 14 * 6.283]);
          plate(m1); eyes(0.03, 0.01, 0.014, 0.014, 0.038);
          add(TRI, m3, [0, -0.015, 0.012], [0.018, 0.02, 0.004], [Math.PI, 0, 0]);
          for (const k of [1, -1]) add(new THREE.TorusGeometry(0.018, 0.003, 4, 12, Math.PI), m3, [k * 0.018, -0.03, 0.01], [1, 1, 1], [0, 0, Math.PI]);
          break;
        case 'cat':
        case 'bear':
        case 'pig':
          plate(m1); eyes(0.03, 0.01, 0.014, kind === 'cat' ? 0.02 : 0.014, 0.038);
          for (const k of [1, -1]) {
            if (kind === 'bear') { add(DISC, m1, [k * 0.08, 0.085, 0], [0.036, 0.005, 0.036], [Math.PI / 2, 0, 0]); add(DISC, m2, [k * 0.08, 0.085, 0.004], [0.02, 0.005, 0.02], [Math.PI / 2, 0, 0]); }
            else { add(TRI, m1, [k * 0.07, 0.1, 0], [0.04, 0.07, 0.004], [0, 0, -k * 0.35 + (kind === 'pig' ? k * 2.2 : 0)]); if (kind === 'cat') add(TRI, m2, [k * 0.07, 0.097, 0.005], [0.02, 0.04, 0.003], [0, 0, -k * 0.35]); }
            if (kind === 'cat') for (let i = -1; i <= 1; i++) add(BOX, m3, [k * 0.062, -0.028 + i * 0.008, 0.012], [0.06, 0.002, 0.002], [0, 0, k * i * 0.18]);
          }
          if (kind === 'pig') { add(DISC, m2, [0, -0.028, 0.02], [0.034, 0.028, 0.03], [Math.PI / 2, 0, 0]); for (const k of [1, -1]) add(SPHERE, m3, [k * 0.012, -0.028, 0.035], [0.006, 0.009, 0.004]); }
          else if (kind === 'bear') { add(DISC, m2, [0, -0.032, 0.01], [0.042, 0.006, 0.034], [Math.PI / 2, 0, 0]); add(SPHERE, m3, [0, -0.022, 0.016], [0.014, 0.01, 0.006]); }
          else add(TRI, m2, [0, -0.02, 0.012], [0.012, 0.012, 0.004], [Math.PI, 0, 0]);
          break;
        case 'rabbit':
          for (const k of [1, -1]) { add(SPHERE, m1, [k * 0.04, 0.17, 0], [0.028, 0.095, 0.004], [0, 0, -k * 0.12]); add(SPHERE, m2, [k * 0.04, 0.165, 0.004], [0.013, 0.07, 0.003], [0, 0, -k * 0.12]); }
          plate(m1); eyes(0.03, 0.01, 0.014, 0.014, 0.038);
          add(SPHERE, m2, [0, -0.015, 0.012], [0.013, 0.009, 0.005]);
          add(BOX, mat('#ffffff'), [0, -0.05, 0.012], [0.024, 0.026, 0.003]);
          add(BOX, m3, [0, -0.05, 0.014], [0.002, 0.026, 0.002]);
          break;
        case 'frog':
          plate(m1);
          for (const k of [1, -1]) { add(SPHERE, m1, [k * 0.05, 0.095, 0.004], [0.036, 0.036, 0.008]); add(SPHERE, m2, [k * 0.05, 0.098, 0.012], [0.024, 0.024, 0.006]); add(SPHERE, m3, [k * 0.05, 0.098, 0.018], [0.011, 0.011, 0.004]); }
          add(new THREE.TorusGeometry(0.06, 0.004, 4, 20, Math.PI), m3, [0, 0, 0.01], [1, 0.6, 1], [0, 0, Math.PI]);
          eyes(0.012, 0.01, 0.005, 0.005, 0.012);
          break;
      }
      return g;
    }

    // Board texture: surface, holes, numbers or cards.
    const surface = { pegboard: '#a9814f', white: '#eeebe2', velvet: '#7d1626', slate: '#3b3e42' }[a.board];
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = Math.round(1024 * BH / BW);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = surface; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const px = canvas.width / BW;
    if (a.board === 'pegboard') { ctx.fillStyle = '#5e4526'; for (let x = 0.0125; x < BW; x += 0.025) for (let y = 0.0125; y < BH; y += 0.025) { ctx.beginPath(); ctx.arc(x * px, y * px, 2.6, 0, 6.3); ctx.fill(); } }
    if (a.board === 'velvet') for (let i = 0; i < 900; i++) { ctx.fillStyle = random() < 0.5 ? '#8f1d2f' : '#6a1120'; ctx.fillRect(random() * canvas.width, random() * canvas.height, 3, 14); }

    const slots: { x: number; y: number; index: number }[] = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols), inRow = row === rows - 1 ? count - row * cols : cols;
      slots.push({ x: ((i % cols) - (inRow - 1) / 2) * CW, y: BY + BH - 0.05 - (row + 0.5) * CH, index: i });
    }
    const centre = slots.reduce((best, slot) => (Math.hypot(slot.x, slot.y - (BY + BH / 2)) < Math.hypot(best.x, best.y - (BY + BH / 2)) ? slot : best), slots[0]);
    const empty = new Set<number>();
    if (a.gap === 'centre') empty.add(centre.index);
    if (a.gap === 'corner') empty.add(random() < 0.5 ? 0 : Math.min(cols, count) - 1);
    if (a.gap === 'several') for (const slot of slots) if (random() < 0.3 && empty.size < count - 2) empty.add(slot.index);
    if (a.gap === 'several' && !empty.size) empty.add(count - 1);

    const kinds = KINDS[a.collection];
    const start = Math.floor(random() * kinds.length);
    const hung: { node: THREE.Group; rest: number; phase: number }[] = [];
    const ghost = new THREE.Color(surface).lerp(new THREE.Color(a.board === 'white' ? '#bdb7a8' : '#ffffff'), 0.22).getStyle();
    const tagMat = mat('#f0e6c4'), string = mat(a.board === 'white' || a.collection === 'paper-plate' ? '#b03030' : '#d8d0bc');
    const pegs: { at: [number, number, number]; size: number }[] = [];
    for (const slot of slots) {
      const cx = (slot.x + BW / 2) * px, cy = (BY + BH - slot.y) * px;
      const pegY = slot.y + 0.135;
      pegs.push({ at: [slot.x, pegY, 0.045], size: 0.011 });
      ctx.fillStyle = a.board === 'slate' || a.board === 'velvet' ? '#e9e2cc' : '#3a3226';
      ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
      if (a.labels === 'numbered') ctx.fillText(`M-${String(slot.index + 1 + Math.floor(start * 7)).padStart(3, '0')}`, cx, cy + 0.165 * px);
      if (a.labels === 'museum') { ctx.fillStyle = '#f4f1e6'; ctx.fillRect(cx - 0.05 * px, cy + 0.14 * px, 0.1 * px, 0.03 * px); ctx.fillStyle = '#55504a'; for (let i = 0; i < 2; i++) ctx.fillRect(cx - 0.04 * px, cy + (0.148 + i * 0.01) * px, (0.08 - i * 0.03) * px, 3); }
      if (empty.has(slot.index)) {
        ctx.fillStyle = ghost; ctx.beginPath(); ctx.ellipse(cx, cy, 0.085 * px, 0.105 * px, 0, 0, 6.3); ctx.fill();
        if (a.gap === 'corner') s.rod([slot.x, pegY, 0.047], [slot.x + 0.01, pegY - 0.16, 0.03], 0.003, string);
        continue;
      }
      const kind = kinds[(start + slot.index) % kinds.length];
      const node = mask(slot.index === centre.index && a.gap !== 'centre' ? kinds[0] : kind);
      const scale = slot.index === centre.index ? 1.12 : mix(0.92, 1.04, random());
      node.scale.setScalar(scale);
      // Hang from the peg: pivot at the peg so it can swing.
      const pivot = new THREE.Group();
      pivot.position.set(slot.x, pegY, 0.035);
      node.position.set(0, -0.135, 0.012);
      pivot.add(node);
      const rest = (random() - 0.5) * mix(0.06, 0.4, mood.wear);
      pivot.rotation.z = rest;
      for (const k of [1, -1]) { const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 1, 4), string); const from = new THREE.Vector3(0, 0, 0.01), to = new THREE.Vector3(k * 0.07 * scale, -0.115, 0.005); cord.position.copy(from).add(to).multiplyScalar(0.5); cord.scale.y = from.distanceTo(to); cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize()); pivot.add(cord); }
      if (a.labels === 'price') { const tag = new THREE.Mesh(BOX, tagMat); tag.scale.set(0.04, 0.026, 0.002); tag.position.set(0.075, -0.25, 0.03); tag.rotation.z = (random() - 0.5) * 0.8; tag.castShadow = true; pivot.add(tag); }
      s.root.add(pivot);
      hung.push({ node: pivot, rest, phase: random() * 6.3 });
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const frameMat = s.material({ pegboard: '#6b4a2a', white: '#d9d4c6', velvet: '#c9a23c', slate: '#1f2124' }[a.board], a.board === 'velvet' ? { metalness: 0.7, roughness: 0.35 } : {});
    s.box([BW, BH, 0.03], [0, BY + BH / 2, 0], frameMat);
    s.mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }), [0, BY + BH / 2, 0.0155]);
    const fw = a.board === 'velvet' ? 0.06 : 0.035;
    for (const k of [1, -1]) { s.box([fw, BH + fw, 0.05], [k * (BW / 2 + fw / 2 - 0.005), BY + BH / 2, 0.005], frameMat); s.box([BW + fw * 2 - 0.01, fw, 0.05], [0, BY + BH / 2 + k * (BH / 2 + fw / 2 - 0.005), 0.005], frameMat); }
    // Legs and feet.
    const leg = s.material('#4a4138');
    for (const k of [1, -1]) { s.box([0.045, BY + BH * 0.6, 0.035], [k * (BW / 2 - 0.08), (BY + BH * 0.6) / 2, -0.03], leg); s.box([0.07, 0.035, 0.52], [k * (BW / 2 - 0.08), 0.0175, 0], leg); s.rod([k * (BW / 2 - 0.08), 0.03, -0.24], [k * (BW / 2 - 0.08), BY * 0.9, -0.04], 0.012, leg); }
    s.box([BW - 0.16, 0.035, 0.03], [0, BY * 0.45, -0.03], leg);
    s.scatter(new THREE.SphereGeometry(1, 8, 6), a.board === 'velvet' ? gold : steel, pegs);
    // One has fallen when things are worn.
    if (mood.wear > 0.6 && empty.size) { const fallen = mask(kinds[(start + 1) % kinds.length]); fallen.rotation.set(-Math.PI / 2 + 0.1, 0, random() * 2); fallen.position.set((random() - 0.5) * BW * 0.6, 0.02, 0.2); s.root.add(fallen); }

    return s.finish({
      footprint: Math.max(BW / 2, 0.3),
      update: (_dt, time) => { for (const item of hung) item.node.rotation.z = item.rest + Math.sin(time * 1.6 + item.phase) * 0.06 * mood.energy; },
    });
  },
});
