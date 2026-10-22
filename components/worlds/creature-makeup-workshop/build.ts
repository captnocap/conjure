import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, choice, defineWorld, diorama, mix, score } from '@conjure/kit';
import { headGeometry } from './head';

type Triple = [number, number, number];
const TAU = Math.PI * 2;

interface MaskRecipe {
  tint: string;
  half?: boolean;
  mouth?: string;
  muzzle?: string;
  nose?: string;
  horns?: string;
  feather?: string;
  beak?: string;
}

const SHOWS = {
  zombie: {
    title: 'DEAD SHIFT',
    lines: ['CALL 04:00', 'SC 42  6 ZOMBIES', 'HERO BITE x2', 'BLOOD: 9 LITRES'],
    tints: ['#8fa58a', '#7b8f9a', '#a59bb0', '#b5b08a'],
    hair: ['#3a332b', '#6b665a', '#1d1b1a'],
    pigments: ['#6f8a6a', '#5d2b6b', '#7a1016', '#b9a23c', '#2c3a2e', '#c9c2a8'],
    masks: [
      { tint: '#8fa58a', mouth: '#3a1518' },
      { tint: '#9aa0b5', mouth: '#3a1518' },
      { tint: '#b5b08a', mouth: '#2a1012' },
      { tint: '#6f8a7a', mouth: '#3a1518' },
    ] as MaskRecipe[],
  },
  ape: {
    title: 'APE EPIC',
    lines: ['CALL 03:30', 'GORILLA ARMY x12', 'HAIR PUNCH: 2 LEFT', 'CHIMP ELDER 11:00'],
    tints: ['#6b4a34', '#3a302c', '#b0703a', '#8a6a50'],
    hair: ['#2b2523', '#4a3324', '#b0581e'],
    pigments: ['#4a3324', '#b08d6a', '#2b2523', '#b0581e', '#d9b48a', '#7a4a2a'],
    masks: [
      { tint: '#4a3324', muzzle: '#b08d6a' },
      { tint: '#2b2523', muzzle: '#5a4a44' },
      { tint: '#b0581e', muzzle: '#d9b48a' },
      { tint: '#3a3230', muzzle: '#c0392b', nose: '#3a6ab0' },
    ] as MaskRecipe[],
  },
  opera: {
    title: 'OPERA  ACT III',
    lines: ['HALF HOUR 18:55', 'CHORUS WIGS x40', 'PHANTOM: LEFT SIDE', 'AGE THE BARON'],
    tints: ['#e6d6c2', '#d9b8a0', '#c9c2b0', '#e0c8b8'],
    hair: ['#f1ede2', '#d8d2c2', '#2a2220'],
    pigments: ['#f1ece0', '#b3202a', '#d4af37', '#1c1c20', '#e8b8a8', '#3a4a8a'],
    masks: [
      { tint: '#f1ece0', half: true },
      { tint: '#d4af37', half: true, feather: '#b3202a' },
      { tint: '#f1ece0', mouth: '#b3202a' },
      { tint: '#1c1c20', half: true },
    ] as MaskRecipe[],
  },
  haunted: {
    title: 'HAUNTED HOUSE',
    lines: ['DOORS 19:00', 'GHOUL ROOM x5', 'TOUCH UP HOURLY', 'NO REAL SCREAMING'],
    tints: ['#c9d3c0', '#b8b0c8', '#d6d0b0', '#9aa89a'],
    hair: ['#e6e2d6', '#3a332b', '#5d7a4a'],
    pigments: ['#c9d3c0', '#111114', '#5d7a4a', '#7a1016', '#e88a1e', '#6a4a8a'],
    masks: [
      { tint: '#f1efe6', mouth: '#111114' },
      { tint: '#c9d3c0', mouth: '#2a1012' },
      { tint: '#5d7a4a', nose: '#4a6a3a' },
      { tint: '#b3202a', horns: '#2a1a1a', mouth: '#111114' },
    ] as MaskRecipe[],
  },
  masquerade: {
    title: 'MASQUERADE BALL',
    lines: ['GUESTS 21:00', 'GILD 30 COLOMBINA', 'FEATHERS: PEACOCK', 'UNMASK AT 12'],
    tints: ['#e6d6c2', '#d8c0d8', '#c0d8d8', '#e8d8a8'],
    hair: ['#f1ede2', '#7a2a8a', '#1c1c20'],
    pigments: ['#7a2a8a', '#d4af37', '#2aa0a0', '#c21f2c', '#1f5a8a', '#f1ece0'],
    masks: [
      { tint: '#7a2a8a', half: true, feather: '#2aa0a0' },
      { tint: '#d4af37', half: true, feather: '#c21f2c' },
      { tint: '#f1ece0', beak: '#e6dcc6' },
      { tint: '#1f5a8a', half: true, feather: '#f1ece0' },
      { tint: '#c21f2c', half: true },
    ] as MaskRecipe[],
  },
  halloween: {
    title: 'HALLOWEEN STOCK',
    lines: ['OPEN 10 TO 9', 'MASKS 5 EACH', 'FANGS: REORDER', 'RETURNS: NO'],
    tints: ['#e8a05a', '#9ac08a', '#c9c2d8', '#e6d6c2'],
    hair: ['#e88a1e', '#5d9a4a', '#1c1c20'],
    pigments: ['#e88a1e', '#5d9a4a', '#111114', '#d01a1a', '#7a2a8a', '#f6f1e6'],
    masks: [
      { tint: '#e88a1e', mouth: '#2a1408' },
      { tint: '#f1efe6', mouth: '#111114' },
      { tint: '#5d9a4a', nose: '#4a8a3a' },
      { tint: '#f6f1e6', nose: '#d01a1a', mouth: '#d01a1a' },
      { tint: '#b3202a', horns: '#2a1a1a' },
    ] as MaskRecipe[],
  },
} as const;

const ERAS = {
  studio: { wall: '#d9cfb6', dado: '#5e4433', bench: '#6e4e34', top: '#8a6a48', floor: '#8a6b4a', leather: '#6a2424', accent: '#3f6b55', back: '#e2ddcf' },
  seventies: { wall: '#d6ae6e', dado: '#8a5a34', bench: '#9a6a3c', top: '#e6dcc0', floor: '#d9c9a0', leather: '#7c8a3c', accent: '#c8642a', back: '#e6dfc8' },
  garage: { wall: '#c4c2b8', dado: '#a8a69c', bench: '#c9a36e', top: '#d8bb8a', floor: '#a9a79d', leather: '#2a2a2e', accent: '#c8202a', back: '#dfe0da' },
  today: { wall: '#e8e8e3', dado: '#d2d6d6', bench: '#eceae4', top: '#f4f3ee', floor: '#bfc2c2', leather: '#4a5058', accent: '#2a9a94', back: '#e6e8e6' },
} as const;

/** A plaster life-cast: head, nose, neck and a cut-off pair of shoulders, standing on y = 0. */
function bustGeometry() {
  const head = headGeometry(() => new THREE.Color('#ffffff'), 26);
  head.deleteAttribute('color');
  head.translate(0, 0.262, 0.004);
  const nose = new THREE.SphereGeometry(1, 10, 8);
  nose.scale(0.014, 0.03, 0.02);
  nose.translate(0, 0.243, 0.098);
  const neck = new THREE.LatheGeometry([[0.001, 0], [0.118, 0], [0.122, 0.022], [0.1, 0.045], [0.05, 0.075], [0.04, 0.11], [0.04, 0.19]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  neck.scale(1, 1, 0.72);
  const merged = mergeGeometries([head, nose, neck])!;
  for (const part of [head, nose, neck]) part.dispose();
  merged.computeVertexNormals();
  return merged;
}

export default defineWorld({
  questions: {
    production: choice('What production is this workshop building faces for?', {
      zombie: 'A zombie film: grey-green rotting faces, buckets of stage blood, a severed arm waiting its turn.',
      ape: 'An ape epic: brown hair-punched chimp and gorilla faces, a fur suit hanging on its stand.',
      opera: 'An opera house: powdered wigs, white and gold half masks, a costume dress-form in crimson.',
      haunted: 'A haunted-house attraction: pale ghouls, a green witch, a red devil and a coffin leaning in the corner.',
      masquerade: 'A masquerade ball: jewel-coloured feathered Venetian masks, a plague-doctor beak, a vase of peacock plumes.',
      halloween: 'The back room of a Halloween shop: orange pumpkins, cheap rubber monster masks and cardboard stock boxes.',
    }),
    era: choice('What era is the workshop?', {
      studio: 'A 1930s studio makeup department: cream plaster, dark wood wainscot and bench, floorboards, an oxblood leather chair.',
      seventies: 'The 1970s: mustard walls, brown panelling, checkered lino and an avocado vinyl chair.',
      garage: 'A 1980s practical-effects garage: grey block walls, a plywood bench, stained concrete and a black vinyl chair.',
      today: 'A present-day effects studio: white walls, white laminate, pale resin floor, a grey chair and teal trim.',
    }),
    state: choice('What state is the bench in?', {
      build: 'Mid-build: a clay sculpt on its stand, plaster buckets, offcuts and dust on the floor, everything out at once.',
      ready: 'Ready for the 4 a.m. call: tidy, lamps and mirror bulbs lit, towels folded, a thermos waiting.',
      wrapped: 'Packed up after wrap: lamps off, flight cases stacked, shelves half emptied into boxes, tape on everything.',
    }),
    lamp: choice('What daylight lamp hangs over the bench?', {
      tube: 'A long daylight tube box on wall brackets, flat and even.',
      ring: 'A big glowing ring light on a swing arm.',
      enamel: 'A pair of enamel cone shades on jointed arms.',
    }),
    board: choice('What is on the board above the bench?', {
      photos: 'A cork board crowded with pinned reference photographs.',
      sketches: 'Three pencil design sketches of a face taped up side by side.',
      schedule: 'A chalkboard with the production name and the call times.',
      clock: 'A big wall clock showing four o’clock beside a typed call sheet.',
    }),
    chair: choice('What is in the actor’s chair?', {
      empty: 'Nothing: the chair stands empty, waiting.',
      cape: 'A striped barber’s cape thrown over the back.',
      cast: 'A plaster life-cast propped on the seat as a stand-in for the actor.',
      sheet: 'A dust sheet draped over the whole chair like a ghost.',
    }),
    casts: score('How many plaster life-casts stare down from the shelves?', ['Three or four', 'A dozen', 'Every shelf crowded shoulder to shoulder']),
  },

  build(a, context) {
    const { mood, random } = context;
    const show = SHOWS[a.production], era = ERAS[a.era];
    const W = 9, D = 6.6, H = 4.0, BT = 0.92, BZ = -2.3;
    const BACK = -D / 2 + 0.2, LEFT = -W / 2 + 0.2;
    // [x, z, y, tallest, widest radius]
    const SLOTS: readonly (readonly [number, number, number, number, number])[] = [
      [0, -2.2, BT, 1.5, 0.7],
      [-2.25, -2.25, BT, 1.1, 0.52],
      [2.25, -2.25, BT, 1.1, 0.52],
      [2.3, 1.5, 0, 1.8, 0.85],
      [-0.7, 2.25, 0.82, 0.8, 0.36],
    ];
    const { art: s, world } = diorama(context, {
      background: era.back, floor: era.floor, width: W, depth: D, pitch: 27, yaw: 33, maxHeight: 1, radius: 0.5,
      slots: SLOTS.map(([x, z]) => [x, z] as const),
    });
    const lit = a.state !== 'wrapped';
    const build = a.state === 'build', wrapped = a.state === 'wrapped';
    const dim = Math.abs(mood.daylight - 0.5) * 2;
    const glowLevel = lit ? mix(1.0, 1.7, dim) : 0.04;
    const warmGlow = new THREE.Color().setHSL(mix(0.58, 0.11, mood.warmth), 0.55, 0.8);
    const dayGlow = new THREE.Color('#eef4ff').lerp(new THREE.Color('#fff1d6'), mood.warmth * 0.5);
    const glows: THREE.MeshStandardMaterial[] = [];
    const glow = (tint: THREE.Color) => {
      const material = new THREE.MeshStandardMaterial({ color: lit ? '#ffffff' : '#b9b9b2', emissive: tint, emissiveIntensity: glowLevel, roughness: 0.4 });
      glows.push(material);
      return material;
    };
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const grouped = (at: Triple, turn = 0) => {
      const group = new THREE.Group();
      group.position.set(...at);
      group.rotation.y = turn;
      s.root.add(group);
      return group;
    };

    // ---- Floor ----
    {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 384;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = era.floor;
      ctx.fillRect(0, 0, 512, 384);
      if (a.era === 'studio') {
        ctx.strokeStyle = 'rgba(40,24,12,0.45)'; ctx.lineWidth = 1.5;
        for (let y = 0; y < 384; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
        for (let i = 0; i < 60; i++) { const x = random() * 512, y = Math.floor(random() * 24) * 16; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); }
      } else if (a.era === 'seventies') {
        ctx.fillStyle = '#a4703e';
        const size = 512 / 15;
        for (let x = 0; x < 15; x++) for (let y = 0; y < 12; y++) if ((x + y) % 2) ctx.fillRect(x * size, y * size, size, size);
      } else if (a.era === 'garage') {
        ctx.strokeStyle = 'rgba(60,60,55,0.5)'; ctx.lineWidth = 2;
        for (const x of [170, 341]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 384); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(0, 192); ctx.lineTo(512, 192); ctx.stroke();
      } else {
        for (let i = 0; i < 900; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(90,100,100,0.25)'; ctx.fillRect(random() * 512, random() * 384, 1.5, 1.5); }
      }
      const spot = (x: number, y: number, r: number, tint: string) => {
        const fade = ctx.createRadialGradient(x, y, 0, x, y, r);
        fade.addColorStop(0, tint); fade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fade;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * mix(0.5, 1, random()), random() * 3, 0, TAU); ctx.fill();
      };
      for (let i = 0; i < Math.round(mood.wear * 26); i++) spot(random() * 512, random() * 384, mix(8, 40, random()), 'rgba(50,38,28,0.4)');
      // Plaster dust drifts out from under the bench; paint from the production gets everywhere.
      for (let i = 0; i < (build ? 16 : 5) + Math.round(mood.wear * 8); i++) spot(random() * 512, mix(70, 170, random()), mix(10, 34, random()), 'rgba(250,248,240,0.6)');
      for (let i = 0; i < Math.round((build ? 14 : 4) * mix(0.4, 1.4, mood.density)); i++) {
        ctx.fillStyle = pick(show.pigments);
        ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.ellipse(random() * 512, mix(90, 370, random()), mix(1.5, 6, random()), mix(1.5, 5, random()), random() * 3, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const floorMat = (world.ground as THREE.Mesh).material as THREE.MeshStandardMaterial;
      floorMat.map = texture;
      floorMat.color.set('#ffffff').lerp(new THREE.Color('#8b8275'), mood.wear * 0.15);
    }

    // ---- Walls ----
    const wallTint = new THREE.Color(era.wall).lerp(new THREE.Color('#a9a79f'), (1 - mood.cheer) * 0.22);
    const wall = s.material(wallTint, { roughness: 0.95 });
    const dado = s.material(era.dado, { roughness: 0.8 });
    const wood = s.material(era.bench, { roughness: 0.7 });
    const topMat = s.material(era.top, { roughness: a.era === 'today' ? 0.35 : 0.65 });
    const steel = s.material('#aab0b2', { metalness: 0.75, roughness: 0.35 });
    const dark = s.material('#1c1c20', { roughness: 0.6 });
    const accent = s.material(era.accent, { roughness: 0.5 });
    const plaster = s.material('#efeae0', { roughness: 0.95 });
    const card = s.material('#b99a6a', { roughness: 0.95 });
    s.box([W, H, 0.2], [0, H / 2, -D / 2 + 0.1], wall);
    s.box([0.2, H, D], [-W / 2 + 0.1, H / 2, 0], wall);
    s.box([W - 0.2, 1.15, 0.05], [0.1, 0.575, BACK + 0.025], dado);
    s.box([0.05, 1.15, D - 0.2], [LEFT + 0.025, 0.575, 0.1], dado);
    s.box([W - 0.2, 0.06, 0.08], [0.1, 1.17, BACK + 0.04], a.era === 'today' ? accent : dado);
    s.box([0.08, 0.06, D - 0.2], [LEFT + 0.04, 1.17, 0.1], a.era === 'today' ? accent : dado);
    if (a.era === 'garage') {
      // Breeze-block courses.
      const joint = s.material('#9a988e');
      for (let y = 1.5; y < H; y += 0.42) { s.box([W - 0.2, 0.02, 0.01], [0.1, y, BACK + 0.006], joint); s.box([0.01, 0.02, D - 0.2], [LEFT + 0.006, y, 0.1], joint); }
    }
    if (a.era === 'seventies') for (let x = -W / 2 + 0.6; x < W / 2; x += 0.5) s.box([0.02, 1.1, 0.012], [x, 0.58, BACK + 0.056], s.material('#6e4526'));

    // ---- The bench ----
    const BL = 6.7, BD = 1.5;
    s.box([BL, 0.08, BD], [0, BT - 0.04, BZ], topMat);
    s.box([BL, 0.05, 0.04], [0, BT - 0.045, BZ + BD / 2 + 0.01], a.era === 'seventies' || a.era === 'today' ? accent : wood);
    for (const x of [-1, 1]) {
      s.box([1.35, BT - 0.1, BD - 0.12], [x * (BL / 2 - 0.7), (BT - 0.1) / 2, BZ], wood);
      for (let i = 0; i < 3; i++) {
        s.box([1.2, 0.22, 0.03], [x * (BL / 2 - 0.7), 0.16 + i * 0.26, BZ + BD / 2 - 0.05], topMat);
        s.box([0.3, 0.03, 0.04], [x * (BL / 2 - 0.7), 0.16 + i * 0.26, BZ + BD / 2 - 0.02], steel);
      }
    }
    for (const x of [-0.9, 0.9]) s.box([0.09, BT - 0.08, 0.09], [x, (BT - 0.08) / 2, BZ + BD / 2 - 0.12], wood);
    s.box([4, 0.05, BD - 0.3], [0, 0.24, BZ - 0.05], wood);
    // Under the bench: plaster buckets and boxes.
    const bucketTints = ['#e9e6dc', '#3d5a80', '#c9c5b8', era.accent];
    for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) {
      const x = mix(-1.7, 1.7, random()), z = BZ + mix(-0.2, 0.35, random());
      if (random() < 0.6) {
        s.cylinder(0.17, 0.14, 0.34, [x, 0.44, z], s.material(pick(bucketTints)), 16);
        s.cylinder(0.15, 0.15, 0.02, [x, 0.6, z], plaster, 16);
      } else s.box([0.42, 0.3, 0.36], [x, 0.415, z], card).rotation.y = (random() - 0.5) * 0.5;
    }
    // A riser at the back of the bench carries the pigment jars.
    const RZ = BACK + 0.11;
    s.box([BL, 0.26, 0.16], [0, BT + 0.13, RZ], wood);
    {
      const count = Math.round(mix(10, 34, mood.density) * (wrapped ? 0.4 : 1));
      const jars: { at: Triple; size: number; color: string }[] = [], lids: { at: Triple; size: number; color: string }[] = [];
      const general = ['#c98a4a', '#8a3a22', '#e8c8a8', '#f1ece0', '#1c1c20', '#d8b03a'];
      for (let i = 0; i < count; i++) {
        const upper = random() < 0.62;
        const x = mix(-BL / 2 + 0.12, BL / 2 - 0.12, (i + random() * 0.8) / count);
        const size = mix(0.8, 1.25, random());
        const y = upper ? BT + 0.26 : BT, z = upper ? RZ : RZ + 0.17 + random() * 0.05;
        if (!upper && Math.abs(x) < 0.75) continue;
        jars.push({ at: [x, y + 0.075 * size, z], size, color: random() < 0.6 ? pick(show.pigments) : pick(general) });
        lids.push({ at: [x, y + 0.158 * size, z], size, color: random() < 0.5 ? '#2a2a2c' : '#d9d9d2' });
      }
      s.scatter(new THREE.CylinderGeometry(0.055, 0.055, 0.15, 12), new THREE.MeshStandardMaterial({ roughness: 0.25 }), jars);
      s.scatter(new THREE.CylinderGeometry(0.058, 0.058, 0.025, 12), new THREE.MeshStandardMaterial({ roughness: 0.5 }), lids);
    }
    // Between the standing places: brushes on one side, the state of the work on the other.
    {
      const bx = 1.2, bz = BZ - 0.15;
      s.cylinder(0.075, 0.065, 0.17, [bx, BT + 0.085, bz], s.material(a.era === 'studio' ? '#e9e6dc' : era.accent), 14);
      for (let i = 0; i < 7; i++) {
        const lean = (random() - 0.5) * 0.14, away = (random() - 0.5) * 0.14, tall = mix(0.3, 0.42, random());
        s.rod([bx + lean * 0.3, BT + 0.1, bz + away * 0.3], [bx + lean, BT + tall, bz + away], 0.007, wood);
        s.ball([0.012, 0.03, 0.012], [bx + lean * 1.06, BT + tall + 0.02, bz + away * 1.06], s.material(pick(show.pigments)), 8);
      }
      const lx = -1.2;
      if (build) {
        s.cylinder(0.17, 0.11, 0.1, [lx, BT + 0.05, bz], s.material('#7a8a9a'), 18);
        s.cylinder(0.155, 0.155, 0.015, [lx, BT + 0.095, bz], plaster, 18);
        s.rod([lx + 0.05, BT + 0.09, bz], [lx + 0.24, BT + 0.2, bz + 0.12], 0.012, wood);
        for (let i = 0; i < 4; i++) s.box([0.02, 0.012, 0.2], [lx + 0.3 + i * 0.05, BT + 0.006, bz + 0.35 + random() * 0.05], i % 2 ? steel : wood).rotation.y = (random() - 0.5) * 0.6;
        for (let i = 0; i < 5; i++) s.ball([0.05, 0.035, 0.045], [lx + (random() - 0.5) * 0.5, BT + 0.03, bz + 0.3 + random() * 0.25], s.material('#7d8f77'), 8);
      } else if (a.state === 'ready') {
        for (let i = 0; i < 3; i++) s.box([0.36, 0.05, 0.26], [lx, BT + 0.025 + i * 0.052, bz + 0.2], s.material(i === 1 ? era.accent : '#f4f2ea')).rotation.y = (random() - 0.5) * 0.08;
        s.cylinder(0.05, 0.055, 0.28, [lx + 0.34, BT + 0.14, bz + 0.05], steel, 14);
        s.cylinder(0.04, 0.05, 0.05, [lx + 0.34, BT + 0.3, bz + 0.05], accent, 14);
      } else {
        s.box([0.5, 0.3, 0.38], [lx, BT + 0.15, bz + 0.15], card).rotation.y = 0.2;
        s.box([0.52, 0.01, 0.07], [lx, BT + 0.302, bz + 0.15], s.material('#c8b060')).rotation.y = 0.2;
        s.ring(0.07, 0.025, [lx + 0.42, BT + 0.025, bz + 0.3], s.material('#c8b060')).rotation.x = Math.PI / 2;
      }
    }

    // ---- The daylight lamp over the hero place ----
    const lampY = 2.82, lampZ = -2.15;
    if (a.lamp === 'tube') {
      for (const x of [-0.7, 0.7]) { s.rod([x, lampY + 0.12, BACK], [x, lampY + 0.12, lampZ], 0.02, steel); s.rod([x, lampY - 0.25, BACK], [x, lampY + 0.1, lampZ + 0.3], 0.014, steel); }
      s.box([1.9, 0.12, 0.42], [0, lampY + 0.05, lampZ], s.material(a.era === 'studio' ? era.accent : '#e3e3de', { roughness: 0.4 }));
      s.box([1.78, 0.03, 0.32], [0, lampY - 0.02, lampZ], glow(dayGlow));
    } else if (a.lamp === 'ring') {
      s.rod([0, lampY + 0.5, BACK], [0, lampY + 0.35, lampZ - 0.15], 0.022, steel);
      s.rod([0, lampY + 0.35, lampZ - 0.15], [0, lampY + 0.08, lampZ], 0.018, steel);
      const ring = s.mesh(new THREE.TorusGeometry(0.52, 0.065, 12, 48), glow(dayGlow), [0, lampY, lampZ]);
      ring.rotation.x = Math.PI / 2 - 0.5;
      const rim = s.mesh(new THREE.TorusGeometry(0.52, 0.08, 8, 48), dark, [0, lampY + 0.03, lampZ - 0.02]);
      rim.rotation.x = Math.PI / 2 - 0.5;
    } else {
      for (const x of [-0.75, 0.75]) {
        s.rod([x * 1.5, 2.4, BACK], [x * 1.3, lampY + 0.45, lampZ - 0.5], 0.016, steel);
        s.rod([x * 1.3, lampY + 0.45, lampZ - 0.5], [x, lampY + 0.12, lampZ], 0.016, steel);
        const shade = s.lathe([[0.05, 0.14], [0.07, 0.1], [0.24, 0], [0.25, -0.02]], s.material(a.era === 'today' ? '#e3e3de' : era.accent, { roughness: 0.3, side: THREE.DoubleSide }), [x, lampY, lampZ]);
        shade.rotation.z = x * 0.35;
        s.ball([0.09, 0.09, 0.09], [x * 0.97, lampY - 0.01, lampZ], glow(dayGlow), 12);
      }
    }
    if (lit) {
      const bulb = new THREE.PointLight(dayGlow, mix(2, 3.4, dim), 6, 2);
      bulb.position.set(0, lampY - 0.25, lampZ + 0.3);
      s.root.add(bulb);
    }

    // ---- The board above the bench ----
    {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.textBaseline = 'middle';
      if (a.board === 'photos') {
        ctx.fillStyle = '#b98a52'; ctx.fillRect(0, 0, 512, 256);
        for (let i = 0; i < Math.round(mix(7, 18, mood.density)); i++) {
          const w = mix(54, 84, random()), h = w * mix(1.1, 1.35, random());
          ctx.save();
          ctx.translate(mix(50, 462, random()), mix(60, 196, random()));
          ctx.rotate((random() - 0.5) * 0.4);
          ctx.fillStyle = '#f6f3ea'; ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.fillStyle = random() < 0.5 ? '#3a3a3c' : '#6a6258'; ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 18);
          ctx.fillStyle = pick(show.tints);
          ctx.beginPath(); ctx.ellipse(0, -4, w * 0.24, h * 0.3, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#c21f2c'; ctx.beginPath(); ctx.arc(0, -h / 2 + 4, 4, 0, TAU); ctx.fill();
          ctx.restore();
        }
      } else if (a.board === 'sketches') {
        ctx.fillStyle = era.dado; ctx.fillRect(0, 0, 512, 256);
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.translate(92 + i * 164, 128); ctx.rotate((random() - 0.5) * 0.08);
          ctx.fillStyle = '#f3ecd8'; ctx.fillRect(-70, -108, 140, 216);
          ctx.strokeStyle = '#3a3630'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(0, -8, 40 + i * 4, 62, 0, 0, TAU); ctx.stroke();
          for (const ex of [-17, 17]) { ctx.beginPath(); ctx.ellipse(ex, -22, 9, 5 + i * 2, 0, 0, TAU); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(-18, 24); ctx.quadraticCurveTo(0, 24 + (i - 1) * 14, 18, 24); ctx.stroke();
          ctx.strokeStyle = pick(show.pigments); ctx.lineWidth = 5; ctx.globalAlpha = 0.7;
          for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(mix(-36, 36, random()), mix(-60, 40, random())); ctx.lineTo(mix(-36, 36, random()), mix(-60, 40, random())); ctx.stroke(); }
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#d8c98a'; ctx.fillRect(-16, -114, 32, 12);
          ctx.restore();
        }
      } else if (a.board === 'schedule') {
        ctx.fillStyle = '#26302c'; ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = era.bench; ctx.lineWidth = 14; ctx.strokeRect(0, 0, 512, 256);
        ctx.fillStyle = '#f1efe6'; ctx.textAlign = 'center';
        ctx.font = 'bold 44px monospace'; ctx.fillText(show.title, 256, 50, 460);
        ctx.font = 'bold 28px monospace'; ctx.textAlign = 'left';
        show.lines.forEach((line, i) => { ctx.fillStyle = i === 0 ? '#f6e27a' : '#e6e4da'; ctx.fillText(wrapped && i === 0 ? 'THAT’S A WRAP' : line, 34, 104 + i * 38, 440); });
      } else {
        ctx.fillStyle = wallTint.getStyle(); ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = '#f6f4ec'; ctx.strokeStyle = '#1c1c20'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(128, 128, 108, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 5;
        for (let i = 0; i < 12; i++) { const t = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(128 + Math.sin(t) * 84, 128 - Math.cos(t) * 84); ctx.lineTo(128 + Math.sin(t) * 98, 128 - Math.cos(t) * 98); ctx.stroke(); }
        ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(TAU / 3) * 56, 128 - Math.cos(TAU / 3) * 56); ctx.stroke();
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128, 38); ctx.stroke();
        ctx.fillStyle = '#f3ecd8'; ctx.fillRect(280, 22, 200, 212);
        ctx.fillStyle = '#2a2622'; ctx.textAlign = 'center';
        ctx.font = 'bold 24px monospace'; ctx.fillText(show.title, 380, 50, 180);
        ctx.font = 'bold 15px monospace';
        show.lines.forEach((line, i) => ctx.fillText(line, 380, 92 + i * 30, 180));
        ctx.fillStyle = '#c21f2c'; ctx.fillRect(366, 14, 28, 12);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.PlaneGeometry(2.1, 1.05), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }), [0, 3.42, BACK + 0.012]);
    }

    // ---- Shelves of life-casts ----
    const bust = bustGeometry();
    {
      const spots: Triple[] = [];
      for (const side of [-1, 1])
        for (const y of [2.32, 3.12]) {
          s.box([2.4, 0.05, 0.44], [side * 2.75, y, BACK + 0.22], wood);
          for (const bx of [-1, 1]) s.box([0.04, 0.22, 0.36], [side * 2.75 + bx * 1.05, y - 0.13, BACK + 0.18], wood);
          for (const dx of [-0.87, -0.29, 0.29, 0.87]) spots.push([side * 2.75 + dx, y + 0.025, BACK + 0.22]);
        }
      for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      const count = Math.max(2, Math.round(mix(3, 16, a.casts) * (wrapped ? 0.45 : 1)));
      const heads = new THREE.InstancedMesh(bust, new THREE.MeshStandardMaterial({ roughness: 0.92 }), count);
      const caps: { at: Triple; size: number; color: string }[] = [];
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), size = new THREE.Vector3(), at = new THREE.Vector3();
      const white = new THREE.Color('#f1ece2').lerp(new THREE.Color('#b8ae98'), mood.wear * 0.45);
      for (let i = 0; i < count; i++) {
        const scale = mix(1.6, 1.85, random());
        turn.setFromEuler(new THREE.Euler(0.16, (random() - 0.5) * 0.7, 0, 'YXZ'));
        matrix.compose(at.set(...spots[i]), turn, size.setScalar(scale));
        heads.setMatrixAt(i, matrix);
        const painted = random() < 0.4;
        heads.setColorAt(i, painted ? new THREE.Color(pick(show.tints)) : white);
        if (random() < 0.3) caps.push({ at: [spots[i][0], spots[i][1] + 0.3 * scale, spots[i][2] - 0.015], size: scale, color: pick(show.hair) });
      }
      heads.instanceMatrix.needsUpdate = true;
      if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
      heads.castShadow = heads.receiveShadow = true;
      s.root.add(heads);
      if (caps.length) {
        const cap = new THREE.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI * 0.55);
        cap.scale(0.086, 0.095, 0.105);
        s.scatter(cap, new THREE.MeshStandardMaterial({ roughness: 1 }), caps);
      }
      // Emptied places are taken by packing boxes.
      if (wrapped) for (let i = count; i < Math.min(spots.length, count + 5); i++) s.box([0.42, 0.3, 0.34], [spots[i][0], spots[i][1] + 0.15, spots[i][2]], card).rotation.y = (random() - 0.5) * 0.3;
    }

    // ---- Masks hanging on the left wall ----
    const swinging: { node: THREE.Object3D; phase: number }[] = [];
    {
      const places: Triple[] = [];
      for (const y of [1.75, 2.5, 3.25]) for (const z of [-2.5, -1.75, -1.0, -0.25]) places.push([LEFT + 0.04, y, z]);
      for (let i = places.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [places[i], places[j]] = [places[j], places[i]]; }
      if (a.era === 'garage') s.box([0.03, 2.5, 3.2], [LEFT + 0.015, 2.5, -1.37], s.material('#b89c6c'));
      const count = Math.round(mix(5, 12, mood.density) * (wrapped ? 0.6 : 1));
      const shell = new THREE.SphereGeometry(1, 20, 14, 0, Math.PI);
      const upper = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI, Math.PI * 0.18, Math.PI * 0.4);
      const dot = new THREE.SphereGeometry(1, 10, 8);
      const hole = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.8 });
      const saturation = mix(0.55, 1, mood.cheer);
      for (let i = 0; i < count; i++) {
        const recipe = show.masks[i % show.masks.length];
        const tint = new THREE.Color(recipe.tint);
        const hsl = { h: 0, s: 0, l: 0 };
        tint.getHSL(hsl); tint.setHSL(hsl.h, hsl.s * saturation, hsl.l);
        const skin = s.material(tint, { roughness: 0.55, side: THREE.DoubleSide });
        const mask = grouped(places[i], Math.PI / 2);
        const face = new THREE.Group();
        face.rotation.z = (random() - 0.5) * 0.25;
        face.scale.setScalar(1.25);
        mask.add(face);
        const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: Triple, size: Triple) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(...at); mesh.scale.set(...size);
          mesh.castShadow = true;
          face.add(mesh);
          return mesh;
        };
        put(recipe.half ? upper : shell, skin, [0, recipe.half ? -0.06 : 0, 0], [0.21, 0.29, 0.13]);
        for (const ex of [-1, 1]) put(dot, hole, [ex * 0.08, 0.05, 0.105], [0.042, recipe.half ? 0.024 : 0.03, 0.02]);
        if (recipe.mouth) put(dot, new THREE.MeshStandardMaterial({ color: recipe.mouth, roughness: 0.6 }), [0, -0.14, 0.09], [0.075, 0.028, 0.02]);
        if (recipe.muzzle) put(dot, s.material(recipe.muzzle, { roughness: 0.7 }), [0, -0.1, 0.09], [0.11, 0.1, 0.08]);
        if (recipe.nose) put(dot, s.material(recipe.nose, { roughness: 0.4 }), [0, -0.03, recipe.muzzle ? 0.17 : 0.14], [0.04, 0.045, 0.04]);
        if (recipe.beak) { const beak = put(new THREE.ConeGeometry(1, 1, 12), s.material(recipe.beak), [0, -0.09, 0.26], [0.06, 0.34, 0.06]); beak.rotation.x = Math.PI / 2 + 0.35; }
        if (recipe.horns) for (const ex of [-1, 1]) put(new THREE.ConeGeometry(1, 1, 8), s.material(recipe.horns), [ex * 0.11, 0.29, 0.03], [0.035, 0.16, 0.035]).rotation.z = -ex * 0.4;
        if (recipe.feather) for (let k = 0; k < 3; k++) put(new THREE.ConeGeometry(1, 1, 6), s.material(recipe.feather, { roughness: 0.9 }), [0.14 + k * 0.03, 0.2 + k * 0.03, 0.02], [0.03, 0.3 - k * 0.04, 0.008]).rotation.z = -0.35 - k * 0.3;
        s.cylinder(0.012, 0.012, 0.06, [places[i][0] + 0.02, places[i][1] + (recipe.half ? 0.14 : 0.3), places[i][2]], steel, 6).rotation.z = Math.PI / 2;
        swinging.push({ node: face, phase: random() * 9 });
      }
    }

    // ---- Mirror with bulbs, and the chair ----
    const MZ = 1.75;
    s.box([0.07, 1.3, 1.7], [LEFT + 0.035, 2.0, MZ], a.era === 'today' ? s.material('#f4f3ee') : wood);
    s.box([0.02, 1.02, 1.42], [LEFT + 0.075, 2.0, MZ], new THREE.MeshStandardMaterial({ color: '#c4d6da', metalness: 0.85, roughness: 0.12 }));
    {
      const bulbs: { at: Triple; size: number }[] = [];
      for (let i = 0; i < 6; i++) bulbs.push({ at: [LEFT + 0.1, 2.58, MZ - 0.7 + i * 0.28], size: 0.055 });
      for (const y of [2.3, 2.0, 1.7]) for (const z of [-0.78, 0.78]) bulbs.push({ at: [LEFT + 0.1, y, MZ + z], size: 0.055 });
      s.scatter(new THREE.SphereGeometry(1, 10, 8), glow(warmGlow), bulbs).castShadow = false;
    }
    s.box([0.34, 0.05, 1.7], [LEFT + 0.17, 1.28, MZ], topMat);
    for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) s.cylinder(0.035, 0.04, mix(0.08, 0.2, random()), [LEFT + 0.16 + (random() - 0.5) * 0.12, 1.37, MZ - 0.7 + random() * 1.4], s.material(pick(show.pigments)), 10);

    const chair = grouped([-2.35, 0, 1.55], 0.95);
    {
      const leather = s.material(era.leather, { roughness: 0.45 });
      const chrome = s.material('#d9dee0', { metalness: 0.85, roughness: 0.22 });
      const part = (mesh: THREE.Mesh) => { chair.add(mesh); return mesh; };
      part(s.cylinder(0.4, 0.44, 0.06, [0, 0.03, 0], chrome, 28));
      part(s.cylinder(0.09, 0.12, 0.44, [0, 0.28, 0], chrome, 16));
      part(s.box([0.66, 0.16, 0.64], [0, 0.58, 0], leather));
      part(s.box([0.62, 0.82, 0.13], [0, 1.05, -0.34], leather)).rotation.x = -0.14;
      part(s.box([0.32, 0.18, 0.11], [0, 1.6, -0.44], leather)).rotation.x = -0.14;
      part(s.rod([0, 1.4, -0.4], [0, 1.56, -0.43], 0.02, chrome));
      for (const x of [-1, 1]) {
        part(s.box([0.09, 0.07, 0.56], [x * 0.37, 0.86, -0.02], leather));
        part(s.rod([x * 0.37, 0.6, 0.2], [x * 0.37, 0.84, 0.2], 0.022, chrome));
        part(s.rod([x * 0.2, 0.5, 0.3], [x * 0.2, 0.22, 0.6], 0.02, chrome));
      }
      part(s.box([0.5, 0.04, 0.22], [0, 0.22, 0.62], chrome)).rotation.x = 0.25;
      part(s.rod([0.42, 0.3, -0.1], [0.62, 0.62, -0.1], 0.018, chrome));
      part(s.ball([0.04, 0.04, 0.04], [0.62, 0.62, -0.1], dark, 10));
      const cloth = s.material('#f1eee6', { roughness: 0.95 });
      if (a.chair === 'cape') {
        part(s.box([0.7, 0.9, 0.05], [0, 1.1, -0.25], cloth)).rotation.x = -0.14;
        part(s.box([0.7, 0.05, 0.3], [0, 1.52, -0.4], cloth));
        part(s.box([0.7, 0.5, 0.04], [0, 1.26, -0.52], cloth));
        for (let i = 0; i < 5; i++) part(s.box([0.05, 0.86, 0.012], [-0.28 + i * 0.14, 1.1, -0.218], accent)).rotation.x = -0.14;
      } else if (a.chair === 'cast') {
        const standIn = part(s.mesh(bust, plaster, [0, 0.66, 0.02]));
        standIn.scale.setScalar(1.75);
        standIn.rotation.y = (random() - 0.5) * 0.5;
        part(s.box([0.5, 0.03, 0.4], [0, 0.675, 0.02], accent));
      } else if (a.chair === 'sheet') {
        const sheet = part(s.mesh(new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI * 0.55), cloth, [0, 1.3, -0.25]));
        sheet.scale.set(0.5, 0.55, 0.42);
        part(s.mesh(new THREE.CylinderGeometry(0.5, 0.66, 1.25, 20, 1, true), s.material('#f1eee6', { roughness: 0.95, side: THREE.DoubleSide }), [0, 0.63, -0.05])).scale.z = 0.95;
        part(s.box([0.72, 0.03, 0.5], [0, 0.69, 0.22], cloth));
      }
    }

    // ---- Trolley for the fifth standing place ----
    {
      const [tx, tz, ty] = SLOTS[4];
      for (const y of [0.2, 0.5, ty - 0.015]) s.box([0.84, 0.03, 0.56], [tx, y, tz], y > 0.6 ? topMat : steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) { s.rod([tx + x * 0.39, 0.06, tz + z * 0.25], [tx + x * 0.39, ty, tz + z * 0.25], 0.014, steel); s.ball([0.035, 0.035, 0.035], [tx + x * 0.39, 0.035, tz + z * 0.25], dark, 8); }
      for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) s.cylinder(0.04, 0.04, mix(0.1, 0.2, random()), [tx - 0.3 + i * 0.14, 0.6, tz + (random() - 0.5) * 0.3], s.material(pick(show.pigments)), 10);
    }

    // ---- What the production leaves in the corner ----
    const sway: THREE.Object3D[] = [];
    {
      const cx = 4.0, cz = -2.5;
      if (a.production === 'zombie') {
        s.cylinder(0.3, 0.3, 0.85, [cx, 0.425, cz], s.material('#8a1a1e', { roughness: 0.5 }), 20);
        s.ring(0.3, 0.018, [cx, 0.6, cz], dark).rotation.x = Math.PI / 2;
        s.cylinder(0.27, 0.27, 0.02, [cx, 0.85, cz], new THREE.MeshStandardMaterial({ color: '#7a0c12', roughness: 0.1 }), 20);
        s.label('BLOOD', 0.42, 0.16, [cx - 0.05, 0.38, cz + 0.305], '#f1ece0', '#8a1a1e').rotation.y = 0.25;
        const flesh = s.material('#8fa58a', { roughness: 0.7 });
        s.tube([[cx - 0.05, 0.8, cz], [cx - 0.02, 1.15, cz + 0.02], [cx + 0.06, 1.42, cz + 0.08], [cx + 0.05, 1.62, cz + 0.2]], 0.05, flesh);
        s.ball([0.07, 0.09, 0.04], [cx + 0.05, 1.7, cz + 0.24], flesh, 10);
        for (let k = 0; k < 4; k++) s.rod([cx + 0.0 + k * 0.035, 1.76, cz + 0.25], [cx - 0.02 + k * 0.045, 1.9 - Math.abs(k - 1.5) * 0.03, cz + 0.3], 0.013, flesh);
      } else if (a.production === 'ape') {
        s.cylinder(0.26, 0.3, 0.05, [cx, 0.025, cz], dark, 16);
        s.rod([cx, 0, cz], [cx, 2.25, cz], 0.025, steel);
        s.rod([cx - 0.42, 2.1, cz], [cx + 0.42, 2.1, cz], 0.02, steel);
        const fur = s.material(pick(['#3a2a20', '#2b2523', '#6b3f1e']), { roughness: 1 });
        const suit = grouped([cx, 2.08, cz + 0.06]);
        const body = (mesh: THREE.Mesh) => { suit.add(mesh); return mesh; };
        body(s.ball([0.36, 0.55, 0.2], [0, -0.6, 0], fur, 14));
        for (const x of [-1, 1]) {
          body(s.ball([0.13, 0.6, 0.13], [x * 0.42, -0.72, 0.02], fur, 10)).rotation.z = x * 0.12;
          body(s.ball([0.15, 0.55, 0.15], [x * 0.17, -1.45, 0], fur, 10));
          body(s.ball([0.1, 0.13, 0.07], [x * 0.5, -1.36, 0.04], s.material('#2a2220'), 8));
        }
        body(s.ball([0.2, 0.22, 0.2], [0, 0.1, -0.02], fur, 12));
        sway.push(suit);
      } else if (a.production === 'opera') {
        s.cylinder(0.24, 0.28, 0.05, [cx, 0.025, cz], dark, 16);
        s.rod([cx, 0, cz], [cx, 1.0, cz], 0.025, steel);
        s.lathe([[0.001, 0], [0.34, 0], [0.3, 0.2], [0.2, 0.42], [0.27, 0.72], [0.3, 0.86], [0.1, 0.95], [0.07, 1.06], [0.001, 1.06]], s.material('#9a1a2a', { roughness: 0.6 }), [cx, 0.95, cz]).scale.z = 0.72;
        s.lathe([[0.36, 0], [0.62, -0.9], [0.64, -0.92]], s.material('#7a1420', { roughness: 0.8, side: THREE.DoubleSide }), [cx, 0.98, cz]).scale.z = 0.8;
        for (let k = 0; k < 5; k++) s.ball([0.03, 0.03, 0.03], [cx, 1.2 + k * 0.13, cz + 0.2 - Math.abs(k - 2) * 0.012], s.material('#d4af37', { metalness: 0.7, roughness: 0.3 }), 8);
        const wig = s.material('#f1ede2', { roughness: 1 });
        s.ball([0.2, 0.3, 0.2], [cx, 2.3, cz], wig, 12);
        for (const x of [-1, 1]) for (let k = 0; k < 3; k++) s.cylinder(0.055, 0.055, 0.2, [cx + x * 0.2, 2.24 - k * 0.11, cz + 0.03], wig, 10).rotation.x = Math.PI / 2;
      } else if (a.production === 'haunted') {
        const shape = new THREE.Shape();
        [[-0.2, 0], [0.2, 0], [0.37, 1.5], [0.23, 2.0], [-0.23, 2.0], [-0.37, 1.5]].forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
        const coffin = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), s.material('#4a3324', { roughness: 0.7 }), [cx, 0, cz - 0.3]);
        coffin.rotation.x = -0.12;
        const lid = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }), s.material('#5e4230', { roughness: 0.6 }), [cx - 0.45, 0, cz + 0.05]);
        lid.rotation.set(-0.1, 0.5, 0);
        s.box([0.05, 0.6, 0.02], [cx - 0.335, 1.35, cz + 0.2], s.material('#c9b060', { metalness: 0.6 })).rotation.set(-0.1, 0.5, 0);
        s.box([0.3, 0.05, 0.02], [cx - 0.335, 1.48, cz + 0.2], s.material('#c9b060', { metalness: 0.6 })).rotation.set(-0.1, 0.5, 0);
      } else if (a.production === 'masquerade') {
        s.lathe([[0.001, 0], [0.16, 0], [0.24, 0.3], [0.2, 0.6], [0.1, 0.8], [0.13, 0.9]], s.material('#1f5a8a', { roughness: 0.25 }), [cx, 0, cz]);
        for (let k = 0; k < 9; k++) {
          const t = k / 9 * TAU + random(), lean = mix(0.15, 0.55, random()), tall = mix(1.7, 2.5, random());
          const tip: Triple = [cx + Math.cos(t) * lean, tall, cz + Math.sin(t) * lean * 0.5 + 0.1];
          s.rod([cx, 0.85, cz], tip, 0.008, s.material('#3a6a4a'));
          s.ball([0.07, 0.12, 0.02], tip, s.material('#2aa0a0', { roughness: 0.6 }), 10);
          s.ball([0.035, 0.05, 0.022], tip, s.material('#1f2a8a', { roughness: 0.5 }), 8);
        }
      } else {
        s.box([0.7, 0.5, 0.55], [cx, 0.25, cz], card).rotation.y = 0.12;
        s.box([0.62, 0.42, 0.5], [cx + 0.03, 0.71, cz], card).rotation.y = -0.1;
        s.label('MASKS', 0.5, 0.2, [cx + 0.03, 0.72, cz + 0.262], '#2a2622', '#b99a6a').rotation.y = -0.1;
        const pumpkin = s.material('#e8801a', { roughness: 0.6 });
        for (const [x, z, size] of [[cx - 0.75, cz + 0.9, 0.26], [cx - 0.1, cz + 1.2, 0.2], [cx + 0.02, 1.2 - 2.55, 0.17]] as const) {
          const y = z < cz + 0.5 ? 0.92 : 0;
          for (let k = 0; k < 4; k++) s.ball([size, size * 0.8, size * 0.62], [x, y + size * 0.8, z], pumpkin, 12).rotation.y = k * Math.PI / 4;
          s.cylinder(0.025, 0.035, 0.1, [x, y + size * 1.62, z], s.material('#4a6a2a'), 6);
        }
      }
    }

    // ---- What the state of the job leaves on the floor ----
    {
      const fx = 3.85, fz = -0.45;
      if (build) {
        // A clay sculpt on a modelling stand.
        for (let k = 0; k < 3; k++) { const t = k / 3 * TAU + 0.5; s.rod([fx + Math.cos(t) * 0.38, 0, fz + Math.sin(t) * 0.38], [fx, 0.75, fz], 0.022, wood); }
        s.rod([fx, 0.7, fz], [fx, 1.12, fz], 0.03, steel);
        s.cylinder(0.24, 0.24, 0.04, [fx, 1.14, fz], wood, 20);
        const clay = s.mesh(bust, s.material('#7d8f77', { roughness: 0.8 }), [fx, 1.16, fz]);
        clay.scale.setScalar(1.7);
        clay.rotation.y = -0.5;
        for (const [x, z] of [[fx - 0.75, fz - 0.6], [fx - 0.2, fz - 0.95]] as const) {
          s.cylinder(0.2, 0.16, 0.36, [x, 0.18, z], s.material(pick(bucketTints)), 16);
          s.cylinder(0.18, 0.18, 0.02, [x, 0.36, z], plaster, 16);
        }
        const scraps = Array.from({ length: Math.round(mix(14, 60, mood.density)) }, () => ({
          at: [mix(-3.4, 3.6, random()), 0.012, mix(-1.4, 2.9, random())] as Triple, size: mix(0.03, 0.08, random()), color: pick([...show.pigments, '#efeae0', '#efeae0']),
        }));
        const scrap = new THREE.IcosahedronGeometry(1, 0);
        scrap.scale(1, 0.25, 0.7);
        s.scatter(scrap, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), scraps);
      } else if (a.state === 'ready') {
        s.cylinder(0.2, 0.2, 0.06, [fx, 0.66, fz], dark, 18);
        s.cylinder(0.035, 0.035, 0.62, [fx, 0.33, fz], steel, 10);
        s.cylinder(0.24, 0.26, 0.03, [fx, 0.015, fz], steel, 18);
        s.box([0.3, 0.012, 0.42], [fx, 0.698, fz], s.material('#f6f3ea')).rotation.y = 0.3;
      } else {
        const caseMat = s.material('#2c2f33', { roughness: 0.6 });
        const stack: readonly [number, number, number, number, number][] = [[fx, fz, 0, 1.0, 0.62], [fx - 0.03, fz, 0.62, 0.92, 0.5], [fx - 1.05, fz - 0.7, 0, 0.8, 0.55]];
        stack.forEach(([x, z, y, w, h], i) => {
          s.box([w, h, 0.6], [x, y + h / 2, z], caseMat).rotation.y = i === 1 ? 0.08 : 0;
          for (const edge of [-1, 1]) s.box([w + 0.02, 0.04, 0.62], [x, y + h / 2 + edge * (h / 2 - 0.02), z], steel).rotation.y = i === 1 ? 0.08 : 0;
          s.box([0.14, 0.08, 0.02], [x, y + h / 2, z + 0.31], steel);
        });
        s.label('WRAP', 0.5, 0.2, [fx, 0.3, fz + 0.308], '#2a2622', '#e8d9a0');
        s.label(show.title, 0.7, 0.14, [fx - 0.03, 0.9, fz + 0.31], '#2a2622', '#f1ece0').rotation.y = 0.08;
      }
    }

    // ---- Standing places ----
    const frame = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      frame(items);
      items.forEach((item, index) => {
        const [x, z, y, tall, wide] = SLOTS[index % SLOTS.length];
        const scale = Math.min(tall / Math.max(item.height, 0.05), wide / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y, z);
        item.holder.updateMatrixWorld(true);
      });
    };
    world.capacity = SLOTS.length;

    const energy = mood.energy, phase = random() * 9;
    const failing = mood.wear > 0.6;
    world.update = (_dt, time) => {
      const t = time * mix(3, 16, energy) + phase;
      const buzz = Math.sin(t) * Math.sin(t * 2.3 + 1) * Math.sin(t * 0.31);
      const drop = lit && failing && buzz > mix(0.7, 0.3, energy) ? 0.35 : 1;
      for (const material of glows) material.emissiveIntensity = glowLevel * drop * (1 + Math.sin(t * 5) * 0.03 * energy);
      for (const { node, phase: offset } of swinging) node.rotation.x = Math.sin(time * 1.3 + offset) * 0.05 * energy;
      for (const node of sway) node.rotation.z = Math.sin(time * 0.9 + phase) * 0.06 * energy;
    };
    return world;
  },
});
