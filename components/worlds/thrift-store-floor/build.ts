import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];
interface Item { matrix: THREE.Matrix4; colour: THREE.Color; }

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const KINDS = {
  rummage: { wall: '#cfe0c8', accent: '#8a5a2a', height: 2.9 },
  warehouse: { wall: '#d3ccb6', accent: '#2f5fa8', height: 3.6 },
  boutique: { wall: '#2f5a5a', accent: '#e8b84a', height: 3.3 },
  recycle: { wall: '#ebe6d6', accent: '#e2231a', height: 3.3 },
  estate: { wall: '#d9c9a8', accent: '#7a3b2e', height: 2.8 },
} as const;
const CLOTHES = ['#27324a', '#b08a5b', '#3a3a3d', '#5b6240', '#6e2630', '#8c8f93', '#b33a2c', '#c9bfa8', '#3f5d4f', '#19b3b0', '#ff6f59', '#ffd23f', '#ff4f9a', '#2f6fe0', '#f4f0e1', '#b23ad1', '#e8862a', '#7ed321'];
const WARES = ['#f1eee4', '#3f5fa8', '#7a5234', '#8a9a4a', '#d9a521', '#e7b3bd', '#2f6f6a', '#b5452f', '#c9ced2', '#1d1d20', '#e23b2e', '#f4d13a', '#8fc5ee', '#6a4a8a'];
const WOODS = ['#6b4a2e', '#8a6238', '#4a2f1e', '#a67c4e', '#3a2a20', '#c9a36c'];
const TAGS = { yellow: '#f4d21f', pink: '#f25c9a', green: '#35a852', blue: '#2f7fe0', orange: '#f28a1e' } as const;

export default defineWorld({
  questions: {
    kind: choice('What kind of secondhand place is it?', {
      rummage: 'A church basement rummage sale: folding tables under tablecloths, checkerboard lino, painted block walls and a coffee urn.',
      warehouse: 'A Goodwill-style warehouse in a former supermarket: polished concrete, long rack rows, gondola shelving, a checkout by the door.',
      boutique: 'A curated vintage boutique: wooden floor, a rug, deep-coloured walls, a glowing sign, a few racks sorted by colour.',
      recycle: 'A Japanese recycle shop: bright white light, red and yellow price banners, steel shelving packed tight with appliances and ceramics.',
      estate: 'An estate sale in a dead person\'s living room: carpet, wallpaper, a fireplace, every object tagged, pale patches where pictures hung.',
    }),
    picked: score('How picked over is it?', ['Freshly stocked, every rail and shelf full', 'Browsed, a few gaps', 'Well picked over, half the hangers bare', 'Nearly stripped: bare fixtures and the things nobody wanted']),
    moment: choice('What moment is this?', {
      opening: 'Just opened: everything straightened, all the lights on, nobody in yet.',
      rush: 'Mid-afternoon rush: carts and baskets abandoned in the aisles, clothes dropped on the floor, donation boxes piling up.',
      closing: 'Closing time: half the lights already off, a mop bucket and a wet-floor sign out.',
      liquidation: 'The last week before it shuts for good: EVERYTHING MUST GO banners and stacked boxes.',
    }),
    furniture: choice('What dominates the corner of unsold furniture?', {
      sofa: 'A sagging floral three-seater sofa and an armchair that does not match.',
      dining: 'A dining table ringed with chairs from four different sets.',
      piano: 'An upright piano nobody will ever move, with a sign on it.',
      exercise: 'A treadmill, an exercise bike and a stack of old tube televisions.',
      nursery: 'A cot, a highchair and a pram, outgrown.',
    }),
    banner: choice('What does the big sign on the back wall say?', {
      thrift: 'THRIFT STORE',
      donations: 'DONATIONS WELCOME',
      final: 'ALL SALES FINAL',
      chances: 'SECOND CHANCES',
      bag: 'FILL A BAG $5',
    }),
    tag: choice('Which colour of price tag is on sale this week?', {
      yellow: 'Yellow tags, sunny and cheap.',
      pink: 'Hot pink tags.',
      green: 'Green tags.',
      blue: 'Blue tags.',
      orange: 'Orange tags.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const kind = KINDS[a.kind];
    const X = 8, Z = 6, H = kind.height;
    const { art: s, world } = diorama(context, {
      background: a.kind === 'boutique' ? '#e3ddd2' : a.kind === 'estate' ? '#e6dfd0' : '#e2e4dc', floor: '#c6c3b4', width: X * 2, depth: Z * 2,
      maxHeight: 2.45, radius: 1.25, pitch: 30, yaw: 26,
      slots: [[0.3, 1.6], [-3.7, -0.2], [3.9, 0], [-3.9, 3.5], [3.6, 3.7], [0.2, -2.1]],
    });
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const tag = TAGS[a.tag];
    const liquidation = a.moment === 'liquidation';
    const stock = clamp01(1 - a.picked * 0.82 + (mood.density - 0.5) * 0.25 - (liquidation ? 0.3 : 0));
    const grey = new THREE.Color('#8b8275'), hsl = { h: 0, s: 0, l: 0 };
    const ink = (hex: THREE.ColorRepresentation) => {
      const c = new THREE.Color(hex); c.getHSL(hsl);
      return c.setHSL(hsl.h, clamp01(hsl.s * mix(0.65, 1.1, mood.cheer)), hsl.l).lerp(grey, mood.wear * 0.22);
    };

    // Everything boxy, round or lumpy in the set is batched into a few instanced meshes.
    const boxes: Item[] = [], rounds: Item[] = [], lumps: Item[] = [], glows: Item[] = [];
    let frame = new THREE.Matrix4();
    const push = (list: Item[], size: P3, at: P3, colour: THREE.ColorRepresentation, turn: P3 = [0, 0, 0], raw = false) => list.push({
      colour: raw ? new THREE.Color(colour) : ink(colour),
      matrix: frame.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(turn[0], turn[1], turn[2], 'YXZ')), new THREE.Vector3(...size))),
    });
    const box = (size: P3, at: P3, colour: THREE.ColorRepresentation, turn?: P3) => push(boxes, size, at, colour, turn);
    const cyl = (radius: number, height: number, at: P3, colour: THREE.ColorRepresentation, turn?: P3) => push(rounds, [radius, height, radius], at, colour, turn);
    const lump = (size: P3, at: P3, colour: THREE.ColorRepresentation, turn?: P3) => push(lumps, size, at, colour, turn);
    const glow = (size: P3, at: P3, colour: THREE.ColorRepresentation) => push(glows, size, at, colour, [0, 0, 0], true);
    const within = (x: number, z: number, turn: number, build: () => void, y = 0) => {
      const outer = frame;
      frame = outer.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn), new THREE.Vector3(1, 1, 1)));
      build();
      frame = outer;
    };
    const sign = (text: string, wide: number, tall: number, at: P3, inkColour: string, paper: string, turn = 0) => {
      const p = new THREE.Vector3(...at).applyMatrix4(frame);
      const card = s.label(text, wide, tall, [p.x, p.y, p.z], inkColour, paper);
      card.rotation.y = turn + Math.atan2(frame.elements[8], frame.elements[10]);
      card.castShadow = false;
      return card;
    };
    const steel = '#aeb4b8', dark = '#2a2a2d';

    // ---- Fixtures -------------------------------------------------------------------------
    const garments = (length: number, railY: number, palette: readonly string[], sorted = false) => {
      const n = Math.floor(length / 0.075);
      for (let i = 0; i < n; i++) {
        const x = -length / 2 + (i + 0.5) * length / n;
        if (random() > mix(0.12, 1, stock)) { if (random() < 0.5) box([0.012, 0.03, 0.38], [x, railY - 0.05, 0], '#d9d9d4', [0, (random() - 0.5) * 0.5, 0]); continue; }
        const long = mix(0.5, 1.05, random());
        const colour = sorted ? new THREE.Color().setHSL(i / n * 0.85, 0.6, 0.5) : pick(palette);
        box([0.05, long, mix(0.36, 0.46, random())], [x, railY - 0.06 - long / 2, 0], colour, [0, (random() - 0.5) * 0.3, 0]);
      }
    };
    const rail = (length: number, palette: readonly string[] = CLOTHES, sorted = false, topper = '') => {
      for (const sx of [-1, 1]) { cyl(0.022, 1.55, [sx * length / 2, 0.8, 0], steel); box([0.05, 0.04, 0.6], [sx * length / 2, 0.05, 0], steel); }
      box([length, 0.035, 0.035], [0, 1.56, 0], steel); box([length, 0.03, 0.03], [0, 0.12, 0], steel);
      garments(length - 0.1, 1.56, palette, sorted);
      if (topper) { cyl(0.012, 0.4, [0, 1.76, 0], steel); sign(topper, 0.7, 0.24, [0, 2.04, 0], '#ffffff', tag === TAGS.yellow ? '#c8322b' : tag); }
    };
    const carousel = (palette: readonly string[]) => {
      cyl(0.025, 1.7, [0, 0.85, 0], steel); box([1.0, 0.035, 0.05], [0, 0.06, 0], steel, [0, 0.78, 0]); box([1.0, 0.035, 0.05], [0, 0.06, 0], steel, [0, -0.78, 0]);
      for (let i = 0; i < 16; i++) box([0.14, 0.02, 0.02], [Math.sin(i * 0.3927) * 0.5, 1.45, Math.cos(i * 0.3927) * 0.5], steel, [0, i * 0.3927 + Math.PI / 2, 0]);
      for (let i = 0; i < 30; i++) {
        if (random() > mix(0.15, 1, stock)) continue;
        const t = i / 30 * Math.PI * 2, long = mix(0.5, 0.95, random());
        box([0.36, long, 0.05], [Math.sin(t) * 0.5, 1.4 - long / 2, Math.cos(t) * 0.5], pick(palette), [0, t - Math.PI / 2, 0]);
      }
      cyl(0.2, 0.012, [0, 1.78, 0], tag, [Math.PI / 2, 0, 0]);
    };
    const ware = (x: number, y: number, z: number) => {
      const r = random(), colour = pick(WARES);
      if (r < 0.3) { const h = mix(0.1, 0.3, random()); cyl(mix(0.04, 0.09, random()), h, [x, y + h / 2, z], colour); }
      else if (r < 0.45) { cyl(0.1, 0.04, [x, y + 0.02, z], colour); cyl(0.1, 0.04, [x, y + 0.065, z], pick(WARES)); cyl(0.1, 0.04, [x, y + 0.11, z], pick(WARES)); }
      else if (r < 0.6) lump([0.09, 0.11, 0.09], [x, y + 0.11, z], colour);
      else if (r < 0.75) { const h = mix(0.18, 0.3, random()); for (let k = 0; k < 4; k++) box([0.035, h * mix(0.8, 1, random()), 0.16], [x - 0.06 + k * 0.04, y + h / 2, z], pick(WARES)); }
      else { const h = mix(0.1, 0.26, random()); box([mix(0.12, 0.24, random()), h, mix(0.12, 0.2, random())], [x, y + h / 2, z], colour, [0, (random() - 0.5) * 0.5, 0]); }
    };
    const shelving = (wide: number, tall: number, deep: number, body: string, back = true, levels = 5, cards = false) => {
      for (const sx of [-1, 1]) box([0.05, tall, deep], [sx * wide / 2, tall / 2, 0], body);
      if (back) box([wide, tall, 0.03], [0, tall / 2, -deep / 2], body);
      for (let i = 0; i < levels; i++) {
        const y = 0.12 + i * (tall - 0.2) / levels;
        box([wide, 0.035, deep], [0, y, 0], body);
        for (let x = -wide / 2 + 0.18; x < wide / 2 - 0.1; x += 0.27) {
          if (random() < mix(0.1, 0.97, stock)) ware(x + (random() - 0.5) * 0.05, y + 0.018, (random() - 0.5) * 0.12);
          if (cards && random() < 0.5) box([0.1, 0.07, 0.008], [x, y - 0.03, deep / 2 + 0.006], random() < 0.6 ? tag : '#fff6d0');
        }
      }
    };
    const table = (wide: number, deep: number, cloth: string | null, heap = true) => {
      box([wide, 0.04, deep], [0, 0.74, 0], cloth ?? '#b9b3a2');
      if (cloth) { for (const sz of [-1, 1]) box([wide + 0.02, 0.5, 0.02], [0, 0.5, sz * deep / 2], cloth); for (const sx of [-1, 1]) box([0.02, 0.5, deep], [sx * wide / 2, 0.5, 0], cloth); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.02, 0.74, [sx * (wide / 2 - 0.08), 0.37, sz * (deep / 2 - 0.08)], dark);
      if (heap) for (let x = -wide / 2 + 0.16; x < wide / 2 - 0.1; x += 0.24) for (const z of [-deep / 4, deep / 4]) if (random() < mix(0.15, 0.95, stock)) ware(x, 0.76, z + (random() - 0.5) * 0.08);
    };
    const carton = (x: number, z: number, size: number, y = 0) => { box([size, size * 0.8, size * 0.9], [x, y + size * 0.4, z], '#b58e5c', [0, random(), 0]); box([size * 0.9, 0.02, 0.06], [x, y + size * 0.8, z], '#d9c3a0', [0, random(), 0]); };
    const cart = () => {
      box([0.55, 0.4, 0.85], [0, 0.72, 0], '#b8bec2'); box([0.5, 0.36, 0.8], [0, 0.75, 0], pick(CLOTHES)); box([0.6, 0.03, 0.03], [0, 1.0, 0.5], tag);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { cyl(0.012, 0.5, [sx * 0.22, 0.3, sz * 0.36], steel); cyl(0.05, 0.03, [sx * 0.22, 0.05, sz * 0.36], dark, [0, 0, Math.PI / 2]); }
      lump([0.2, 0.12, 0.25], [0, 0.95, 0], pick(CLOTHES));
    };
    const baskets = (n: number) => { for (let i = 0; i < n; i++) { box([0.45, 0.06, 0.32], [0, 0.04 + i * 0.07, 0], '#d8342c', [0, (random() - 0.5) * 0.15, 0]); } box([0.45, 0.18, 0.32], [0, 0.1 + n * 0.07, 0], '#d8342c'); };
    const lamp = (shade: string) => { cyl(0.16, 0.03, [0, 0.015, 0], dark); cyl(0.015, 1.5, [0, 0.75, 0], '#8a6a2a'); cyl(0.2, 0.3, [0, 1.6, 0], shade); glow([0.22, 0.02, 0.22], [0, 1.44, 0], '#ffe9b0'); };
    const chair = (colour: string) => { box([0.42, 0.04, 0.42], [0, 0.45, 0], colour); box([0.42, 0.5, 0.04], [0, 0.72, -0.2], colour); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.018, 0.45, [sx * 0.18, 0.225, sz * 0.18], colour); box([0.07, 0.05, 0.004], [0.1, 0.92, -0.17], '#fffdf2'); };
    const armchair = (colour: string) => { box([0.85, 0.4, 0.8], [0, 0.26, 0], colour); box([0.85, 0.55, 0.2], [0, 0.72, -0.32], colour); for (const sx of [-1, 1]) box([0.18, 0.5, 0.8], [sx * 0.42, 0.42, 0], colour); lump([0.3, 0.1, 0.3], [0, 0.5, 0.05], colour); box([0.08, 0.06, 0.004], [0.42, 0.62, 0.41], '#fffdf2'); };
    const bags = (n: number) => { for (let i = 0; i < n; i++) lump([mix(0.25, 0.38, random()), mix(0.22, 0.34, random()), mix(0.25, 0.35, random())], [(random() - 0.5) * 1.3, 0.22 + (i > 3 ? 0.35 : 0), (random() - 0.5) * 0.5], random() < 0.75 ? '#1f1f24' : '#e9e6dc'); };

    // The corner of unsold furniture, in the far corner where both walls meet.
    const furnitureCorner = () => within(-5.9, -4.4, 0.3, () => {
      if (a.furniture === 'sofa') {
        const c = pick(['#a85f6a', '#7d8a5a', '#b08a5b', '#5f7a9a']);
        box([2.1, 0.4, 0.9], [0, 0.28, 0], c); box([2.1, 0.6, 0.24], [0, 0.72, -0.34], c); for (const sx of [-1, 1]) box([0.24, 0.55, 0.9], [sx * 1.05, 0.45, 0], c);
        for (let i = 0; i < 3; i++) lump([0.33, mix(0.07, 0.12, random()), 0.36], [-0.62 + i * 0.62, 0.5, 0.06], new THREE.Color(c).offsetHSL(0.02, 0, 0.08)); lump([0.2, 0.2, 0.1], [0.7, 0.7, -0.15], pick(CLOTHES), [0.3, 0, 0.3]);
        box([0.14, 0.09, 0.004], [1.05, 0.66, 0.46], '#fffdf2');
        within(2.0, 0.9, -0.9, () => armchair(pick(['#3f5d4f', '#b3642a', '#6e2630'])));
      } else if (a.furniture === 'dining') {
        box([1.7, 0.06, 0.95], [0, 0.76, 0], pick(WOODS)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.04, 0.74, [sx * 0.72, 0.37, sz * 0.36], pick(WOODS));
        [[-0.5, 0.75, Math.PI], [0.5, 0.78, Math.PI + 0.2], [-0.45, -0.75, 0.1], [0.5, -0.78, -0.15], [1.25, 0, -Math.PI / 2 + 0.3]].forEach(([x, z, t]) => within(x, z, t, () => chair(pick([...WOODS, '#e9e6dc', '#3f5d4f', '#b33a2c']))));
        for (let i = 0; i < 5; i++) if (random() < stock + 0.3) ware(-0.6 + i * 0.3, 0.79, (random() - 0.5) * 0.4);
      } else if (a.furniture === 'piano') {
        const c = pick(['#3a2418', '#1c1c1f', '#5a3a22']);
        box([1.5, 1.25, 0.6], [0, 0.625, 0], c); box([1.42, 0.12, 0.3], [0, 0.7, 0.42], c); box([1.34, 0.02, 0.15], [0, 0.77, 0.47], '#f4f0e1'); box([1.3, 0.025, 0.07], [0, 0.785, 0.43], '#16161a');
        for (const sx of [-1, 1]) box([0.08, 0.62, 0.1], [sx * 0.68, 0.33, 0.5], c);
        box([0.55, 0.06, 0.32], [0, 0.5, 1.0], '#6e2630'); for (const sx of [-1, 1]) box([0.04, 0.48, 0.28], [sx * 0.22, 0.24, 1.0], c);
        sign('FREE - YOU MOVE IT', 1.1, 0.26, [0, 1.02, 0.305], '#b3202a', '#fff6d0').rotation.z = -0.04;
        ware(-0.4, 1.26, 0); ware(0.3, 1.26, 0.05);
        within(1.6, 0.4, -0.5, () => lamp('#d9b98a'));
      } else if (a.furniture === 'exercise') {
        box([0.75, 0.16, 1.7], [-0.7, 0.14, 0.2], '#3a3a3d'); box([0.6, 0.02, 1.5], [-0.7, 0.23, 0.2], '#16161a'); for (const sx of [-1, 1]) cyl(0.025, 1.15, [-0.7 + sx * 0.34, 0.75, -0.5], steel, [0.2, 0, 0]); box([0.75, 0.25, 0.08], [-0.7, 1.3, -0.62], '#55585c');
        cyl(0.26, 0.05, [0.75, 0.3, 0.6], steel, [0, 0, Math.PI / 2]); box([0.06, 0.06, 1.0], [0.75, 0.55, 0.2], '#c8322b', [0.5, 0, 0]); cyl(0.02, 0.7, [0.75, 0.75, -0.15], steel); box([0.24, 0.05, 0.3], [0.75, 1.1, -0.15], dark); cyl(0.02, 0.6, [0.75, 0.85, 0.5], steel); box([0.5, 0.04, 0.04], [0.75, 1.15, 0.5], dark);
        for (let i = 0; i < 3; i++) { const sz = 0.62 - i * 0.07, y = [0.31, 0.9, 1.42][i]; box([sz * 1.1, sz * 0.9, sz], [2.1, y, -0.3], pick(['#b9b3a2', '#55585c', '#3a3a3d']), [0, (random() - 0.5) * 0.3, 0]); box([sz * 0.85, sz * 0.66, 0.02], [2.1, y, -0.3 + sz / 2 + 0.01], '#78868a'); }
      } else {
        const w = '#f1ede2';
        box([1.25, 0.08, 0.68], [0, 0.5, 0], w); box([1.15, 0.1, 0.6], [0, 0.6, 0], pick(['#f6c9d6', '#c9def2', '#fff0a8']));
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) box([0.05, 1.0, 0.05], [sx * 0.62, 0.5, sz * 0.33], w);
        for (const sz of [-1, 1]) { box([1.25, 0.04, 0.04], [0, 0.98, sz * 0.33], w); for (let i = 0; i < 11; i++) cyl(0.012, 0.44, [-0.55 + i * 0.11, 0.76, sz * 0.33], w); }
        lump([0.12, 0.1, 0.1], [0.3, 0.72, 0], '#b98b56');
        within(1.5, 0.5, -0.4, () => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) box([0.03, 0.75, 0.03], [sx * 0.24, 0.36, sz * 0.24], w, [sz * 0.16, 0, -sx * 0.16]); box([0.38, 0.04, 0.38], [0, 0.6, 0], w); box([0.38, 0.4, 0.04], [0, 0.8, -0.18], w); box([0.5, 0.03, 0.3], [0, 0.78, 0.26], w); });
        within(-1.5, 0.7, 0.5, () => { lump([0.42, 0.26, 0.26], [0, 0.72, 0], '#27324a'); lump([0.3, 0.26, 0.26], [-0.14, 0.9, 0], '#27324a'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.16, 0.03, [sx * 0.3, 0.16, sz * 0.26], '#d9d9d4', [Math.PI / 2, 0, 0]); cyl(0.015, 0.7, [0.5, 0.85, 0], steel, [0, 0, -0.7]); });
      }
    });

    // ---- Shell: floor, two walls, and whatever passes for a ceiling -----------------------
    const floorMap = paint(1024, 768, (ctx) => {
      const px = 64;
      if (a.kind === 'rummage') { const c1 = '#e9e2c8', c2 = pick(['#4f7d5f', '#8a3b3b', '#3f5f8a']); for (let i = 0; i < 32; i++) for (let j = 0; j < 24; j++) { ctx.fillStyle = (i + j) % 2 ? c1 : c2; ctx.fillRect(i * 32, j * 32, 32, 32); } }
      else if (a.kind === 'warehouse') { ctx.fillStyle = '#8e8b80'; ctx.fillRect(0, 0, 1024, 768); for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(${i % 2 ? '255,255,255' : '90,88,80'},0.07)`; ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 768, 30 + random() * 90, 20 + random() * 50, random() * 3, 0, 7); ctx.fill(); } ctx.strokeStyle = 'rgba(80,78,70,0.5)'; ctx.lineWidth = 2; for (let x = 0; x < 1024; x += 256) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 768); ctx.stroke(); } ctx.fillStyle = '#e3c22a'; ctx.fillRect(90, 250, 840, 7); }
      else if (a.kind === 'boutique') { for (let j = 0; j < 64; j++) { let x = -random() * 200; while (x < 1024) { const w = 140 + random() * 160; ctx.fillStyle = pick(['#8a6238', '#7a5630', '#96703f', '#6b4a2e', '#a67c4e']); ctx.fillRect(x, j * 12, w - 1.5, 11); x += w; } }
        const rx = 512 + 0.3 * px, rz = 384 + 1.6 * px; ctx.fillStyle = '#7a1f2b'; ctx.fillRect(rx - 210, rz - 140, 420, 280); ctx.strokeStyle = '#e8c98a'; ctx.lineWidth = 8; ctx.strokeRect(rx - 190, rz - 120, 380, 240); ctx.fillStyle = '#1f3a5a'; ctx.fillRect(rx - 160, rz - 90, 320, 180); ctx.fillStyle = '#e8c98a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(rx - 120 + i * 60, rz, 18, 44, 0, 0, 7); ctx.fill(); } }
      else if (a.kind === 'recycle') { ctx.fillStyle = '#d9d3bd'; ctx.fillRect(0, 0, 1024, 768); ctx.strokeStyle = 'rgba(120,116,100,0.6)'; ctx.lineWidth = 1.5; for (let x = 0; x < 1024; x += 38.4) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 768); ctx.stroke(); } for (let y = 0; y < 768; y += 38.4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); } ctx.fillStyle = '#e2231a'; ctx.fillRect(0, 620, 1024, 10); }
      else { const c = pick(['#a39a6a', '#b59a86', '#8a9a8f', '#a8786a']); ctx.fillStyle = c; ctx.fillRect(0, 0, 1024, 768); for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${i % 2 ? '255,255,255' : '40,30,20'},0.08)`; ctx.fillRect(random() * 1024, random() * 768, 3, 3); } ctx.fillStyle = 'rgba(60,50,40,0.14)'; ctx.beginPath(); ctx.ellipse(560, 470, 420, 120, -0.3, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,250,235,0.3)'; ctx.fillRect(120, 80, 150, 90); ctx.fillRect(620, 70, 120, 70); }
      for (let i = 0; i < mood.wear * 40; i++) { ctx.fillStyle = 'rgba(60,50,40,0.12)'; ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 768, 10 + random() * 40, 8 + random() * 22, random() * 3, 0, 7); ctx.fill(); }
    });
    const slab = world.ground as THREE.Mesh;
    const edge = slab.material as THREE.Material;
    slab.material = [edge, edge, new THREE.MeshStandardMaterial({ map: floorMap, roughness: a.kind === 'warehouse' ? 0.45 : 0.9 }), edge, edge, edge];

    const wallMap = (wide: number, side: boolean) => paint(1024, 256, (ctx) => {
      ctx.fillStyle = `#${ink(kind.wall).getHexString()}`; ctx.fillRect(0, 0, 1024, 256);
      const m = 1024 / wide, y = (metres: number) => 256 - metres * 256 / H;
      if (a.kind === 'rummage') { ctx.strokeStyle = 'rgba(70,90,70,0.3)'; ctx.lineWidth = 1.5; for (let r = 0; r < 14; r++) { ctx.beginPath(); ctx.moveTo(0, r * 18.5); ctx.lineTo(1024, r * 18.5); ctx.stroke(); for (let x = (r % 2) * 13; x < 1024; x += 26) { ctx.beginPath(); ctx.moveTo(x, r * 18.5); ctx.lineTo(x, r * 18.5 + 18.5); ctx.stroke(); } } ctx.fillStyle = '#7d9a80'; ctx.fillRect(0, y(1.1), 1024, 256); }
      if (a.kind === 'warehouse') { ctx.fillStyle = kind.accent; ctx.fillRect(0, y(2.75), 1024, 14); ctx.fillRect(0, y(2.5), 1024, 5); }
      if (a.kind === 'recycle') { ctx.fillStyle = '#e2231a'; ctx.fillRect(0, y(2.95), 1024, 16); ctx.fillStyle = '#f4d21f'; ctx.fillRect(0, y(2.7), 1024, 10); }
      if (a.kind === 'boutique' && !side) { for (let r = 0; r < 26; r++) for (let x = (r % 2) * 16 - 16; x < 1024; x += 32) { ctx.fillStyle = pick(['#8a4a3a', '#7a3f32', '#96553f', '#6b382c']); ctx.fillRect(x, r * 10, 30.5, 8.5); } }
      if (a.kind === 'estate') { for (let x = 0; x < 1024; x += 22) { ctx.fillStyle = 'rgba(150,110,70,0.25)'; ctx.fillRect(x, 0, 8, 256); ctx.fillStyle = 'rgba(160,70,80,0.5)'; for (let yy = (x / 22 % 2) * 14; yy < 256; yy += 28) { ctx.beginPath(); ctx.arc(x + 15, yy, 3, 0, 7); ctx.fill(); } } ctx.fillStyle = 'rgba(255,250,230,0.55)'; for (const [gx, gw, gh] of side ? [[2.5, 0.7, 0.9], [8.2, 1.1, 0.8], [9.8, 0.5, 0.6]] : [[2.2, 0.9, 0.7], [11.5, 0.6, 0.8], [13.2, 1.2, 0.9], [14.8, 0.5, 0.5]]) ctx.fillRect(gx * m, y(1.2 + gh), gw * m, gh * 256 / H); ctx.fillStyle = '#f1ead8'; ctx.fillRect(0, y(0.14), 1024, 40); }
      ctx.fillStyle = `rgba(70,60,45,${0.05 + mood.wear * 0.2})`; ctx.fillRect(0, y(0.35), 1024, 256);
    });
    const backFace = new THREE.MeshStandardMaterial({ map: wallMap(X * 2, false), roughness: 0.92 }), sideFace = new THREE.MeshStandardMaterial({ map: wallMap(Z * 2, true), roughness: 0.92 });
    const plainWall = s.material(kind.wall, { roughness: 0.92 });
    s.box([X * 2, H, 0.2], [0, H / 2, -Z - 0.1], [plainWall, plainWall, plainWall, plainWall, backFace, plainWall] as unknown as THREE.Material);
    s.box([0.2, H, Z * 2 + 0.2], [-X - 0.1, H / 2, -0.1], [sideFace, plainWall, plainWall, plainWall, plainWall, plainWall] as unknown as THREE.Material);

    const lit = (index: number) => !(a.moment === 'closing' && index % 2 === 0) && !(mood.wear > 0.45 && random() < mood.wear * 0.3);
    const tubeColours = ['#ffd98a', '#bfe0ff', '#c8ffb8', '#ffc0dc', '#fff3d0', '#a9d0ff'];
    if (a.kind === 'rummage' || a.kind === 'warehouse' || a.kind === 'recycle') {
      // A cut-away drop ceiling: a margin of tiles on the two walls, bare runners, and strip lights that do not match.
      const tiles = (missing: number) => new THREE.MeshStandardMaterial({ roughness: 0.95, map: paint(512, 64, (ctx) => {
        ctx.fillStyle = '#eceae0'; ctx.fillRect(0, 0, 512, 64);
        for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { if (random() < missing) { ctx.fillStyle = '#3a3a38'; ctx.fillRect(i * 32, j * 32, 32, 32); } else if (random() < 0.12 + mood.wear * 0.4) { ctx.fillStyle = 'rgba(150,110,50,0.4)'; ctx.beginPath(); ctx.ellipse(i * 32 + 16, j * 32 + 16, 12, 8, random() * 3, 0, 7); ctx.fill(); } }
        ctx.strokeStyle = '#a8a69c'; ctx.lineWidth = 2; for (let i = 0; i <= 16; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 64); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(512, 32); ctx.stroke();
      }) });
      s.box([X * 2, 0.04, 1.2], [0, H - 0.05, -Z + 0.6], tiles(0.03 + mood.wear * 0.12));
      const strip = s.box([Z * 2 - 1.2, 0.04, 1.2], [-X + 0.6, H - 0.05, 0.6], tiles(0.03 + mood.wear * 0.12)); strip.rotation.y = Math.PI / 2;
      for (const x of [-4, 0, 4]) box([0.04, 0.04, Z * 2 - 1.2], [x, H - 0.03, 0.6], '#d9d9d2');
      for (const z of [-2.6, 1.8]) box([X * 2 - 1.2, 0.04, 0.04], [0.6, H - 0.03, z], '#d9d9d2');
      let index = 0;
      for (const x of [-4, 0, 4]) for (const z of [-2.6, 1.8]) {
        const y = H - 0.55, on = lit(index++), colour = on ? tubeColours[Math.floor(random() * tubeColours.length)] : '#7f8588';
        // A troffer seen from above: a dull housing with the lit diffuser showing as a rim beneath it.
        box([2.3, 0.07, 0.3], [x, y, z], '#7d858a');
        if (on) glow([2.42, 0.05, 0.5], [x, y - 0.06, z], colour); else box([2.42, 0.05, 0.5], [x, y - 0.06, z], colour);
        for (const sx of [-1, 1]) cyl(0.008, 0.52, [x + sx * 0.9, H - 0.28, z], dark);
      }
    } else if (a.kind === 'boutique') {
      let index = 0;
      for (const [x, z] of [[-4.5, -3.4], [-1.5, -4.2], [2, -3.6], [5.2, -4.4], [-6.2, 0.5], [-6.4, 3.4]] as const) {
        const drop = mix(0.5, 1.1, random()), on = lit(index++);
        cyl(0.005, drop, [x, H + 0.3 - drop / 2, z], dark); cyl(0.04, 0.07, [x, H + 0.3 - drop, z], '#b08a3a');
        if (on) push(glows, [0.09, 0.09, 0.09], [x, H + 0.2 - drop, z], '#ffd98a', [0, 0, 0], true); else lump([0.09, 0.09, 0.09], [x, H + 0.2 - drop, z], '#8a8478');
      }
    } else {
      cyl(0.006, 0.5, [-5.5, H + 0.1, -3.2], dark); cyl(0.32, 0.22, [-5.5, H - 0.25, -3.2], '#e8d9b0'); glow([0.4, 0.02, 0.4], [-5.5, H - 0.37, -3.2], '#ffe9b0');
    }

    // ---- Layouts --------------------------------------------------------------------------
    const bannerText = liquidation ? 'EVERYTHING MUST GO' : { thrift: 'THRIFT STORE', donations: 'DONATIONS WELCOME', final: 'ALL SALES FINAL', chances: 'SECOND CHANCES', bag: 'FILL A BAG $5' }[a.banner];
    const bannerY = Math.min(H - 1.2, 2.35);
    if (a.kind === 'boutique') {
      const neon = s.label(bannerText, 5.2, 0.7, [1.6, bannerY, -Z + 0.03], '#fff3f8', '#2a1a2a');
      (neon.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#ff5fa8'); (neon.material as THREE.MeshStandardMaterial).emissiveMap = (neon.material as THREE.MeshStandardMaterial).map; (neon.material as THREE.MeshStandardMaterial).emissiveIntensity = mix(0.5, 1.1, mood.cheer);
    } else sign(bannerText, a.kind === 'estate' ? 3.4 : 6.2, a.kind === 'estate' ? 0.5 : 0.8, [a.kind === 'estate' ? 4.6 : 1.8, bannerY, -Z + 0.03], liquidation ? '#fff200' : a.kind === 'rummage' ? '#3a2a1a' : '#ffffff', liquidation ? '#c8102e' : a.kind === 'rummage' ? '#f4ecd2' : kind.accent);
    furnitureCorner();

    if (a.kind === 'warehouse') {
      ['WOMENS', 'MENS', 'KIDS'].forEach((name, i) => { const x = -1.9 + i * 3.1; within(x, -5.15, 0, () => rail(2.6, CLOTHES, false, name)); within(x + 0.3, -4.0, 0, () => rail(2.6, CLOTHES, false, i === 1 ? '50% OFF' : '')); });
      for (let i = 0; i < 4; i++) within(-7.55, -2.2 + i * 2.0, Math.PI / 2, () => shelving(1.85, 1.9, 0.45, i === 3 ? '#8a6238' : '#d9d6cc'));
      sign('HOUSEWARES', 2.4, 0.34, [-X + 0.03, 2.3, 0.8], '#ffffff', kind.accent, Math.PI / 2);
      within(6.6, -1.6, -Math.PI / 2, () => { box([2.2, 0.95, 0.7], [0, 0.475, 0], '#d9d6cc'); box([2.2, 0.05, 0.75], [0, 0.97, 0], kind.accent); box([0.4, 0.3, 0.35], [-0.5, 1.15, 0], dark); box([0.3, 0.22, 0.02], [-0.5, 1.4, -0.1], '#55585c', [-0.3, 0, 0]); for (let i = 0; i < 6; i++) box([0.3, 0.02, 0.35], [0.6, 1.0 + i * 0.02, 0], '#f1eee4'); sign('PAY HERE', 1.2, 0.3, [0, 0.55, 0.36], '#ffffff', kind.accent); });
      within(6.7, 2.4, 0.2, () => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) box([0.03, 0.8, 0.03], [sx * 0.55, 0.45, sz * 0.4], steel); box([1.15, 0.03, 0.85], [0, 0.1, 0], steel); for (let j = 0; j < 4; j++) { box([1.15, 0.015, 0.015], [0, 0.25 + j * 0.2, 0.42], steel); box([1.15, 0.015, 0.015], [0, 0.25 + j * 0.2, -0.42], steel); box([0.015, 0.015, 0.85], [0.57, 0.25 + j * 0.2, 0], steel); box([0.015, 0.015, 0.85], [-0.57, 0.25 + j * 0.2, 0], steel); } for (let i = 0; i < 18 * stock + 3; i++) lump([0.14, 0.12, 0.12], [(random() - 0.5) * 0.9, 0.2 + random() * 0.6 * stock, (random() - 0.5) * 0.6], pick(['#b98b56', '#f6b0cb', '#a9d6f2', '#8a5a33', '#fff0a0', '#e9e6dc'])); sign('TOYS $1', 0.8, 0.26, [0, 1.15, 0.43], '#b3202a', tag); });
      within(4.4, -3.1, 0.5, () => carousel(CLOTHES));
      within(-7.2, 5.3, 0.4, () => baskets(4));
      within(-5.9, 5.0, 0.2, () => carousel(CLOTHES));
      for (const [x, turn] of [[-1.6, 0.04], [1.7, -0.05]] as const) within(x, 5.35, turn, () => { table(1.9, 0.7, null, false); box([1.9, 0.12, 0.7], [0, 0.8, 0], '#d9d6cc'); for (let i = 0; i < 16; i++) if (random() < mix(0.2, 1, stock)) box([0.1, 0.09, 0.26], [-0.8 + (i % 8) * 0.23, 0.9, -0.16 + Math.floor(i / 8) * 0.32], pick(['#3a2a20', '#1d1d20', '#f1eee4', '#b33a2c', '#8a6238', '#2f6fe0']), [0, (random() - 0.5) * 0.6, 0]); sign('SHOES $3', 1.0, 0.24, [0, 0.45, 0.36], '#ffffff', tag); });
    } else if (a.kind === 'rummage') {
      const cloths = ['#f1ede2', '#c9def2', '#f6e3a8', '#e9c9c9', '#cfe0c8'];
      for (let i = 0; i < 4; i++) within(-2.6 + i * 2.5, -5.0, (random() - 0.5) * 0.08, () => table(2.0, 0.8, pick(cloths)));
      for (let i = 0; i < 3; i++) within(-7.2, -1.6 + i * 2.5, Math.PI / 2 + (random() - 0.5) * 0.08, () => table(2.0, 0.8, i === 1 ? null : pick(cloths)));
      within(2.5, -3.7, 0.05, () => rail(2.4, CLOTHES, false, 'COATS $2'));
      within(6.6, -2.0, -Math.PI / 2, () => { table(1.8, 0.75, '#f1ede2', false); cyl(0.16, 0.42, [-0.4, 0.97, 0], '#c9ced2'); cyl(0.17, 0.03, [-0.4, 1.2, 0], dark); box([0.05, 0.05, 0.1], [-0.4, 0.86, 0.19], dark); for (let i = 0; i < 10; i++) cyl(0.04, 0.09, [0.05 + (i % 5) * 0.11, 0.81, -0.12 + Math.floor(i / 5) * 0.18], '#f4f1e6'); box([0.3, 0.2, 0.22], [0.55, 0.86, 0.2], '#8a5a2a'); sign('COFFEE 25c', 1.3, 0.3, [0, 0.45, 0.39], '#3a2a1a', '#f4ecd2'); });
      for (let i = 0; i < 7; i++) box([0.48, 0.9, 0.05], [-7.5 + i * 0.07, 0.52, 5.2], i % 2 ? '#8a6a3a' : '#7a5a30', [0.12, Math.PI / 2, 0]);
      cyl(0.05, X * 2, [0, H - 0.75, -Z + 0.12], '#b9c9b4', [0, 0, Math.PI / 2]);
      box([1.4, 0.9, 0.04], [5.4, 1.6, -Z + 0.03], '#b08a5b'); for (let i = 0; i < 9; i++) box([0.22, 0.28, 0.01], [4.9 + (i % 4) * 0.33, 1.35 + Math.floor(i / 4) * 0.33, -Z + 0.06], pick(['#fff6d0', '#f6c9d6', '#c9def2', '#ffffff', tag]), [0, 0, (random() - 0.5) * 0.3]);
      within(6.7, 2.6, 0.3, () => { carton(0, 0, 0.6); carton(0.7, 0.2, 0.5); carton(0.2, 0.1, 0.45, 0.48); for (let i = 0; i < 5; i++) lump([0.2, 0.1, 0.16], [(random() - 0.5) * 0.5, 0.56, (random() - 0.5) * 0.3], pick(CLOTHES)); sign('BAG SALE', 0.9, 0.28, [0.3, 0.28, 0.6], '#3a2a1a', tag); });
    } else if (a.kind === 'boutique') {
      within(1.2, -5.0, 0, () => rail(2.4, CLOTHES, true)); within(4.8, -4.9, -0.12, () => rail(2.0, CLOTHES, true));
      within(-2.2, -5.2, 0, () => shelving(1.6, 2.1, 0.4, '#3a2a20', true, 4));
      box([0.8, 1.9, 0.06], [6.9, 0.98, -5.5], '#c9a23a', [-0.12, -0.3, 0]); box([0.66, 1.76, 0.02], [6.89, 0.98, -5.46], '#cfe3ee', [-0.12, -0.3, 0]);
      within(-7.0, 1.6, Math.PI / 2, () => { box([2.6, 0.95, 0.65], [0, 0.475, 0], '#3a2a20'); glow([2.5, 0.3, 0.02], [0, 0.72, 0.33], '#e9f4f4'); for (let i = 0; i < 9; i++) lump([0.05, 0.04, 0.05], [-1.0 + i * 0.25, 0.72, 0.36], pick(['#e8c44a', '#d9d9d4', '#c8322b', '#2f7fe0'])); box([0.42, 0.34, 0.4], [0.8, 1.14, 0], '#8a6a2a'); box([0.38, 0.1, 0.36], [0.8, 1.36, 0], '#b08a3a'); cyl(0.14, 0.3, [-0.9, 1.1, 0], '#b5452f'); for (let i = 0; i < 6; i++) lump([0.16, 0.26, 0.16], [-0.9 + (random() - 0.5) * 0.3, 1.5 + random() * 0.3, (random() - 0.5) * 0.3], '#3f7d4a'); });
      for (const [x, z] of [[-7.2, 4.6], [7.0, -3.4]] as const) within(x, z, 0, () => { cyl(0.26, 0.5, [0, 0.25, 0], '#b5642f'); for (let i = 0; i < 9; i++) lump([0.3, 0.42, 0.3], [(random() - 0.5) * 0.6, 0.9 + random() * 0.9, (random() - 0.5) * 0.6], pick(['#3f7d4a', '#2f6a3f', '#5a9a5a'])); });
      within(-7.1, -1.8, Math.PI / 2, () => { cyl(0.03, 0.9, [0, 0.45, 0], dark); cyl(0.2, 0.02, [0, 0.01, 0], dark); lump([0.2, 0.34, 0.14], [0, 1.2, 0], '#cdbb98'); box([0.42, 0.5, 0.22], [0, 1.15, 0], pick(['#d81b78', '#12908e', '#e6b422'])); cyl(0.02, 0.1, [0, 1.58, 0], '#6d4a2c'); });
      within(6.6, 1.2, -Math.PI / 2, () => { table(1.5, 0.6, null, false); for (let i = 0; i < 5; i++) { cyl(0.13, 0.03, [-0.55 + i * 0.28, 0.78, 0], pick(['#d8b877', '#2b2b30', '#b8452f', '#e9dcc0'])); cyl(0.07, 0.08, [-0.55 + i * 0.28, 0.83, 0], pick(['#d8b877', '#2b2b30', '#b8452f'])); } });
    } else if (a.kind === 'recycle') {
      for (let i = 0; i < 4; i++) { within(-2.6 + i * 2.5, -5.45, 0, () => shelving(2.3, 2.3, 0.5, '#c9ced2', false, 6, true)); within(-1.6 + i * 2.5, -3.95, 0, () => shelving(2.3, 1.5, 0.5, '#c9ced2', false, 4, true)); }
      for (let i = 0; i < 4; i++) within(-7.5, -2.3 + i * 2.1, Math.PI / 2, () => shelving(1.95, 2.2, 0.5, '#c9ced2', false, 6, true));
      for (let i = 0; i < 4; i++) { const x = 6.9, z = -2.6 + i * 2.2, c = i % 2 ? '#f4d21f' : '#e2231a'; cyl(0.02, 2.5, [x, 1.25, z], steel); cyl(0.14, 0.06, [x, 0.03, z], '#3a3a3d'); box([0.02, 1.7, 0.55], [x, 1.6, z + 0.3], c); sign(pick(['¥100', '¥300', 'SALE', '¥500', '50%']), 0.5, 0.5, [x - 0.012, 1.95, z + 0.3], i % 2 ? '#c8102e' : '#fff200', c, -Math.PI / 2); }
      for (const x of [-3.2, 0.4, 4]) { cyl(0.004, 0.5, [x - 0.7, H - 0.25, -3.1], dark); cyl(0.004, 0.5, [x + 0.7, H - 0.25, -3.1], dark); sign(pick(['¥100 ~', 'RECYCLE', 'USED OK', 'SALE']), 1.6, 0.42, [x, H - 0.7, -3.1], '#fff200', '#e2231a'); }
      within(6.4, 4.9, 0.3, () => baskets(6)); within(5.6, 5.2, -0.2, () => baskets(3));
      within(-6.9, 5.2, 0.5, () => { for (let i = 0; i < 4; i++) { cyl(0.2, 0.05, [(i % 2) * 0.5, 0.42 + Math.floor(i / 2) * 0.5, 0], '#d9d9d4', [Math.PI / 2, 0.4, 0]); cyl(0.05, 0.7 + Math.floor(i / 2) * 0.5, [(i % 2) * 0.5, 0.2 + Math.floor(i / 2) * 0.25, -0.05], steel); } });
    } else {
      // The living room: the fireplace, the window, the cabinet, and tables of tagged lots where the family used to sit.
      within(0.6, -5.75, 0, () => { box([2.0, 1.3, 0.4], [0, 0.65, 0], '#efe9da'); box([1.0, 0.8, 0.1], [0, 0.4, 0.17], '#1c1a18'); box([2.3, 0.08, 0.5], [0, 1.34, 0.02], '#5a3a22'); cyl(0.11, 0.26, [0, 1.51, 0], '#8a6a2a'); for (const sx of [-1, 1]) { cyl(0.03, 0.3, [sx * 0.8, 1.53, 0], '#c9a23a'); box([0.07, 0.05, 0.004], [sx * 0.8 + 0.05, 1.45, 0.06], '#fffdf2'); } box([1.2, 0.9, 0.04], [0, 2.05, -0.15], '#c9a23a'); box([1.06, 0.76, 0.02], [0, 2.05, -0.12], '#cfe3ee'); });
      within(-7.85, 1.6, Math.PI / 2, () => { box([2.0, 1.5, 0.06], [0, 1.6, 0], '#efe9da'); glow([1.8, 1.3, 0.02], [0, 1.6, 0.03], '#f4f8f0'); box([0.05, 1.3, 0.04], [0, 1.6, 0.04], '#efe9da'); box([1.8, 0.05, 0.04], [0, 1.6, 0.04], '#efe9da'); const c = pick(['#8a3b3b', '#5a7a5a', '#c9a45a']); for (const sx of [-1, 1]) box([0.45, 2.0, 0.08], [sx * 1.15, 1.45, 0.08], c); box([2.9, 0.08, 0.1], [0, 2.5, 0.08], '#5a3a22'); });
      within(-3.0, -5.6, 0, () => shelving(1.5, 2.1, 0.42, '#5a3a22', true, 5));
      within(-7.55, -1.6, Math.PI / 2, () => { shelving(1.6, 0.95, 0.5, '#4a2f1e', true, 2); box([1.6, 1.1, 0.4], [0, 1.52, -0.04], '#4a2f1e'); glow([1.3, 0.9, 0.02], [0, 1.52, 0.17], '#e3ead8'); for (let i = 0; i < 8; i++) cyl(0.08, 0.02, [-0.5 + (i % 4) * 0.33, 1.25 + Math.floor(i / 4) * 0.4, 0.19], pick(['#f1eee4', '#3f5fa8', '#e7b3bd']), [Math.PI / 2 - 0.2, 0, 0]); });
      within(3.6, -4.9, 0.04, () => table(2.0, 0.8, '#f1ede2')); within(6.4, -4.2, -0.5, () => rail(1.8, ['#27324a', '#3a3a3d', '#8c8f93', '#c9bfa8', '#6e2630', '#b08a5b', '#f4f0e1']));
      within(-7.0, 4.6, Math.PI / 2, () => table(1.8, 0.75, null));
      within(6.6, 0.8, -Math.PI / 2 + 0.2, () => armchair(pick(['#7d8a5a', '#a85f6a', '#b08a5b']))); within(6.9, -0.6, 0, () => lamp('#e8d9b0'));
      within(6.5, 3.4, -0.5, () => { cyl(0.02, 1.7, [0, 0.85, 0], '#4a2f1e'); for (let i = 0; i < 3; i++) box([0.5, 0.03, 0.05], [0, 0.02, 0], '#4a2f1e', [0, i * 2.09, 0]); for (let i = 0; i < 4; i++) box([0.4, 0.9, 0.08], [Math.sin(i * 1.57) * 0.14, 1.15, Math.cos(i * 1.57) * 0.14], pick(['#27324a', '#b08a5b', '#3a3a3d', '#6e2630']), [0, i * 1.57, 0]); cyl(0.17, 0.1, [0, 1.75, 0], '#3a3a3d'); });
      sign('ESTATE SALE', 1.5, 0.4, [5.4, 0.95, 5.3], '#ffffff', '#c8102e', -0.3); for (const sx of [-1, 1]) cyl(0.015, 0.8, [5.4 + sx * 0.5, 0.4, 5.3 + sx * 0.16], steel);
    }

    // ---- The moment -----------------------------------------------------------------------
    if (a.moment === 'rush') {
      within(5.9, 4.9, 0.7, cart); within(-5.9, 1.9, -0.3, cart); within(1.8, 5.4, 1.4, () => baskets(1));
      for (let i = 0; i < 9; i++) lump([mix(0.16, 0.3, random()), 0.05, mix(0.14, 0.22, random())], [-3 + random() * 9, 0.04, -3.5 + random() * 0.4], pick(CLOTHES), [0, random() * 3, 0]);
      within(7.0, 5.2, 0.2, () => { carton(0, 0, 0.55); carton(-0.6, 0.1, 0.5); carton(-0.2, 0, 0.45, 0.44); bags(4); });
    }
    if (a.moment === 'closing') {
      within(5.4, 4.8, 0.3, () => { box([0.4, 0.34, 0.5], [0, 0.22, 0], '#f2c21b'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.04, 0.03, [sx * 0.17, 0.04, sz * 0.2], dark, [0, 0, Math.PI / 2]); cyl(0.015, 1.3, [0.05, 0.8, -0.05], '#8a6238', [0.25, 0, 0.1]); lump([0.12, 0.08, 0.12], [0.02, 0.3, 0.1], '#d9d9d4'); });
      within(4.2, 5.3, -0.4, () => { for (const sz of [-1, 1]) box([0.3, 0.62, 0.02], [0, 0.3, sz * 0.1], '#f4d21f', [sz * -0.3, 0, 0]); });
      box([1.6, 0.004, 1.0], [4.6, 0.004, 4.4], '#9fb4c0', [0, 0.3, 0]);
    }
    if (liquidation) {
      for (const [x, z, t] of [[-3.5, -3.2, 0], [3.2, -3.0, 0]] as const) { cyl(0.004, 0.6, [x - 1.1, H - 0.3, z], dark); cyl(0.004, 0.6, [x + 1.1, H - 0.3, z], dark); sign(pick(['70% OFF', 'STORE CLOSING', 'FINAL DAYS']), 2.4, 0.6, [x, H - 0.85, z], '#fff200', '#c8102e', t); }
      within(6.9, 4.6, 0.2, () => { carton(0, 0, 0.6); carton(-0.7, 0, 0.6); carton(-0.3, 0, 0.55, 0.48); carton(0, 0.6, 0.5); });
      within(-6.9, 5.3, 0, () => { for (let i = 0; i < 3; i++) box([1.2, 0.04, 0.35], [0, 0.03 + i * 0.045, 0], '#d9d6cc'); });
    }
    // Donation bags by the back door, whatever the hour.
    if (a.kind !== 'estate' && a.kind !== 'boutique') within(7.1, -5.4, 0, () => { bags(3 + Math.floor(mood.density * 5)); sign('DONATIONS', 1.3, 0.3, [0, 1.75, -0.57], '#ffffff', '#3a3a3d'); });

    const batch = (items: Item[], geometry: THREE.BufferGeometry, material: THREE.Material, shadows = true) => {
      if (!items.length) { geometry.dispose(); material.dispose(); return; }
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      items.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.colour); });
      mesh.castShadow = mesh.receiveShadow = shadows; mesh.frustumCulled = false;
      s.root.add(mesh);
    };
    batch(boxes, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }));
    batch(rounds, new THREE.CylinderGeometry(1, 1, 1, 14), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.15 }));
    batch(lumps, new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ roughness: 0.95 }));
    batch(glows, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), false);

    // The light a place like this actually has: flatter and cooler under tubes, warmer at home, dimmer at closing.
    const dim = a.moment === 'closing' ? 0.72 : 1;
    if (world.keyLight) world.keyLight.intensity *= dim * (a.kind === 'boutique' || a.kind === 'estate' ? 0.95 : 0.85);
    s.root.traverse((node) => { const light = node as THREE.HemisphereLight; if (light.isHemisphereLight) { light.intensity *= dim * 1.08; if (a.kind === 'boutique' || a.kind === 'estate') light.color.set('#fff0d8'); } });
    return world;
  },
});
