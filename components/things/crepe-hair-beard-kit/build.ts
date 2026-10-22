import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { strands } from './head';

const CHARACTERS = {
  santa: 'Santa Claus: a huge snowy beard, walrus moustache and bushy brows.',
  pirate: 'A pirate: a forked black beard and long drooping moustache.',
  villain: 'A Victorian villain: a waxed handlebar to twirl and a sharp little goatee.',
  sage: 'An old sage or wizard: a waist-long thin beard, trailing moustache and long brows.',
  werewolf: 'A werewolf mid-change: shaggy mutton-chop sideburns and one heavy brow.',
  groucho: 'A vaudeville comic: a fat block moustache and thick slanted eyebrows.',
} as const;
type Character = keyof typeof CHARACTERS;
const HAIR = {
  black: 'Jet black.',
  brown: 'Chestnut brown.',
  ginger: 'Bright ginger.',
  blond: 'Straw blond.',
  grey: 'Iron grey.',
  white: 'Snow white.',
} as const;
const TINT: Record<keyof typeof HAIR, string> = { black: '#1d1b1c', brown: '#5e3b22', ginger: '#bd5a1f', blond: '#d9b65c', grey: '#8d8d8e', white: '#f3f0e8' };
type Dot = [number, number, number];

/** Each piece is a symmetrical run of tufts on the card plane: [x, up, tuft size]. */
function piece(kind: string): Dot[] {
  const dots: Dot[] = [];
  const run = (points: [number, number][], from: number, to: number, both = true) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    const count = 9;
    for (let i = 0; i <= count; i++) {
      const p = curve.getPoint(i / count), size = mix(from, to, i / count);
      dots.push([p.x, p.y, size]);
      if (both) dots.push([-p.x, p.y, size]);
    }
  };
  if (kind === 'handlebar') run([[0.002, 0], [0.016, -0.004], [0.03, -0.003], [0.037, 0.008], [0.031, 0.014]], 0.0065, 0.0022);
  else if (kind === 'walrus') run([[0.002, 0.005], [0.014, 0.001], [0.025, -0.01], [0.028, -0.022]], 0.0085, 0.0045);
  else if (kind === 'pencil') run([[0.002, 0], [0.014, 0.001], [0.027, -0.002]], 0.003, 0.002);
  else if (kind === 'chevron') run([[0.002, 0.004], [0.014, 0], [0.027, -0.009]], 0.0075, 0.005);
  else if (kind === 'fumanchu') run([[0.002, 0.008], [0.013, 0.006], [0.018, -0.006], [0.019, -0.03]], 0.0045, 0.002);
  else if (kind === 'block') { for (let x = -2; x <= 2; x++) for (let y = -1; y <= 1; y++) dots.push([x * 0.0055, y * 0.005, 0.0062]); }
  else if (kind === 'brows') { run([[0.008, 0], [0.018, 0.005], [0.031, 0]], 0.0048, 0.0026); }
  else if (kind === 'bushy-brows') { run([[0.007, -0.002], [0.019, 0.006], [0.034, 0.004]], 0.007, 0.004); }
  else if (kind === 'unibrow') { run([[0, 0], [0.016, 0.004], [0.033, -0.002]], 0.0065, 0.0035); }
  else if (kind === 'chops') { run([[0.014, 0.022], [0.014, 0.002], [0.02, -0.014], [0.03, -0.02]], 0.0045, 0.009); }
  else if (kind === 'goatee') { for (let row = 0; row < 6; row++) for (let x = -(5 - row) / 2; x <= (5 - row) / 2; x++) dots.push([x * 0.0058, 0.014 - row * 0.0068, 0.0055]); }
  else if (kind === 'soul-patch') { for (let row = 0; row < 3; row++) dots.push([0, 0.006 - row * 0.006, 0.005 - row * 0.001]); }
  return dots;
}
const CARD: Record<Character, string[]> = {
  santa: ['walrus', 'bushy-brows', 'chevron', 'walrus', 'bushy-brows', 'chops', 'goatee', 'handlebar', 'brows', 'chevron', 'soul-patch', 'bushy-brows'],
  pirate: ['fumanchu', 'handlebar', 'brows', 'goatee', 'chevron', 'fumanchu', 'chops', 'bushy-brows', 'pencil', 'goatee', 'soul-patch', 'walrus'],
  villain: ['handlebar', 'goatee', 'pencil', 'handlebar', 'brows', 'soul-patch', 'handlebar', 'chevron', 'goatee', 'pencil', 'brows', 'fumanchu'],
  sage: ['fumanchu', 'bushy-brows', 'fumanchu', 'goatee', 'walrus', 'bushy-brows', 'fumanchu', 'brows', 'goatee', 'chops', 'bushy-brows', 'soul-patch'],
  werewolf: ['chops', 'unibrow', 'chops', 'bushy-brows', 'unibrow', 'chops', 'walrus', 'chops', 'bushy-brows', 'goatee', 'unibrow', 'chevron'],
  groucho: ['block', 'bushy-brows', 'block', 'unibrow', 'bushy-brows', 'block', 'pencil', 'chevron', 'bushy-brows', 'block', 'handlebar', 'brows'],
};
const WORD: Record<Character, string> = { santa: 'ST. NICK', pirate: 'PIRATES', villain: 'VILLAINS', sage: 'WIZARDS', werewolf: 'WOLF MAN', groucho: 'COMEDY' };

export default defineThing({
  questions: {
    character: choice('Which character is the kit building?', CHARACTERS),
    hair: choice('What colour is most of the hair?', HAIR),
    missing: score('How many pieces are gone from the specimen card?', ['A full card, never used', 'Two or three gaps', 'Half picked over', 'Nearly bare: only pins and pencil outlines']),
    hook: noul('Is a full beard hanging on a hook beside the box?'),
    box: choice('What kind of box is it?', {
      wood: 'An old wooden makeup box with brass corners.',
      tin: 'A dented enamel tin case in theatre blue.',
      card: 'A plain cardboard shoebox with a handwritten label.',
      red: 'A lacquered red travelling case, a professional’s.',
    }),
    state: choice('What is going on with the kit right now?', {
      neat: 'Packed and tidy, everything in its place.',
      applying: 'Mid-application: the spirit gum is open with its brush out, scissors and a moustache waiting on the table.',
      ransacked: 'Ransacked in a quick change: pieces and braids spilled across the table.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.36, D = 0.23, H = 0.075, T = 0.008;
    const shell = { wood: '#7b5331', tin: '#3e6485', card: '#b89565', red: '#a3222a' }[a.box];
    const body = s.material(shell, a.box === 'tin' ? { metalness: 0.5, roughness: 0.45 } : a.box === 'red' ? { roughness: 0.3 } : {});
    const lining = s.material(a.box === 'card' ? '#c7a877' : '#3b2a2e');
    const brass = s.material('#cfa544', { metalness: 0.85, roughness: 0.3 });
    const steel = s.material('#aeb4b8', { metalness: 0.8, roughness: 0.3 });
    const main = new THREE.Color(TINT[a.hair]);
    const hairKeys = Object.keys(TINT) as (keyof typeof HAIR)[];
    const other = () => new THREE.Color(TINT[hairKeys[Math.floor(random() * hairKeys.length)]]);

    // Tray.
    s.box([W, T, D], [0, T / 2, 0], body);
    for (const z of [-1, 1]) s.box([W, H, T], [0, H / 2, z * (D - T) / 2], body);
    for (const x of [-1, 1]) s.box([T, H, D], [x * (W - T) / 2, H / 2, 0], body);
    s.box([W - 2 * T, 0.003, D - 2 * T], [0, T + 0.0015, 0], lining);
    s.box([T * 0.7, H * 0.8, D - 2 * T], [0.085, H * 0.45, 0], body);
    if (a.box === 'wood' || a.box === 'red') for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.022, 0.022, 0.022], [x * (W / 2 - 0.009), 0.011, z * (D / 2 - 0.009)], brass);
    if (a.box !== 'card') { s.box([0.03, 0.02, 0.006], [0, H * 0.7, D / 2 + 0.003], brass); }
    const plate = s.label(WORD[a.character], 0.12, 0.028, [-0.09, H * 0.5, D / 2 + 0.0015], '#2b2622', a.box === 'card' ? '#efe6cf' : '#e6d6a2');
    plate.rotation.z = a.box === 'card' ? (random() - 0.5) * 0.12 : 0;

    // Lid, standing open, with the specimen card inside it.
    const lid = new THREE.Group();
    lid.position.set(0, H, -D / 2);
    lid.rotation.x = -mix(1.72, 1.95, random());
    s.root.add(lid);
    const put = (mesh: THREE.Object3D, parent: THREE.Object3D = lid) => { parent.add(mesh); return mesh; };
    const lidTop = s.box([W, T, D], [0, T / 2, D / 2], body); put(lidTop);
    for (const x of [-1, 1]) put(s.box([T, 0.022, D], [x * (W - T) / 2, -0.011 + T, D / 2], body));
    put(s.box([W, 0.022, T], [0, -0.011 + T, D - T / 2], body));
    // Card texture: ruled slots, numbers, pencil outlines.
    const cols = 4, rows = 3, cw = W - 0.04, cd = D - 0.03;
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = Math.round(768 * cd / cw);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = mood.wear > 0.55 ? '#e2d5b3' : '#f2ead6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#9a8b6c'; ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    const kinds = CARD[a.character];
    const gone = new Set<number>();
    const want = Math.round(a.missing * 11);
    const order = Array.from({ length: 12 }, (_u, i) => i).sort(() => random() - 0.5);
    for (let i = 0; i < want; i++) gone.add(order[i]);
    const sx = canvas.width / cols, sy = canvas.height / rows;
    ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
    for (let i = 0; i < 12; i++) {
      const cx = (i % cols + 0.5) * sx, cy = (Math.floor(i / cols) + 0.5) * sy;
      ctx.fillStyle = '#6d6048';
      ctx.fillText(`No.${i + 1} ${kinds[i].toUpperCase()}`, cx, cy + sy * 0.42, sx - 14);
      if (gone.has(i)) {
        ctx.setLineDash([8, 7]); ctx.strokeStyle = '#8f8163'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(cx, cy - 8, sx * 0.36, sy * 0.2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(cw, cd), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }));
    card.rotation.x = Math.PI / 2;
    card.position.set(0, -0.0015, D / 2);
    card.receiveShadow = true;
    lid.add(card);

    const tuft = new THREE.IcosahedronGeometry(1, 1);
    const fuzz = new THREE.MeshStandardMaterial({ roughness: 0.95 });
    const pinned: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const loose: typeof pinned = [];
    const pins: { at: [number, number, number]; size: number }[] = [];
    let spot = 0;
    for (let i = 0; i < 12; i++) {
      const cx = ((i % cols) + 0.5) / cols * cw - cw / 2, cz = D / 2 + cd / 2 - (Math.floor(i / cols) + 0.45) / rows * cd;
      const tint = random() < 0.2 ? other() : main.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08);
      for (const x of [-1, 1]) pins.push({ at: [cx + x * 0.03, -0.006, cz + 0.017], size: 0.0022 });
      if (!gone.has(i)) for (const [x, y, size] of piece(kinds[i])) pinned.push({ at: [cx + x, -0.003 - size * 0.5, cz + y], size, color: tint });
      else if (a.state === 'ransacked' && spot < 5) {
        const tx = mix(-0.18, 0.2, random()), tz = D / 2 + mix(0.035, 0.11, random()), turn = random() * 6.3;
        for (const [x, y, size] of piece(kinds[i])) loose.push({ at: [tx + x * Math.cos(turn) - y * Math.sin(turn), size * 0.6, tz + x * Math.sin(turn) + y * Math.cos(turn)], size, color: tint });
        spot++;
      }
    }
    if (a.state === 'applying') for (const [x, y, size] of piece(kinds[0])) loose.push({ at: [-0.02 + x * 1.3, size * 0.7, D / 2 + 0.06 - y * 1.3], size: size * 1.3, color: main });
    if (pinned.length) put(s.scatter(tuft, fuzz, pinned));
    if (loose.length) s.scatter(tuft, fuzz, loose);
    put(s.scatter(new THREE.SphereGeometry(1, 6, 5), steel, pins));

    // Crepe wool braids: twisted ropes coiled in the tray.
    const braid = (points: [number, number, number][], tint: THREE.Color) => {
      const spine = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const material = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.95 });
      const turns = Math.round(spine.getLength() / 0.022);
      for (const phase of [0, Math.PI]) {
        const ply: [number, number, number][] = [];
        const steps = turns * 6;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps, p = spine.getPoint(t), angle = t * turns * Math.PI * 2 + phase;
          ply.push([p.x, p.y + Math.cos(angle) * 0.005, p.z + Math.sin(angle) * 0.005]);
        }
        s.tube(ply, 0.0062, material);
      }
    };
    const braids = 2 + Math.round(mood.density * 2) + (a.state === 'ransacked' ? 1 : 0);
    for (let i = 0; i < braids; i++) {
      const tint = i === 0 ? main : other();
      const z = -0.07 + i * 0.036 + (random() - 0.5) * 0.008, y = T + 0.014 + (i > 3 ? 0.014 : 0);
      if (i === braids - 1 && a.state !== 'neat') braid([[-0.15, y, z - 0.02], [-0.06, y + 0.01, 0.02], [-0.03, H + 0.012, D / 2 - 0.004], [-0.02 - random() * 0.05, 0.03, D / 2 + 0.02], [-0.08, 0.012, D / 2 + 0.1 + random() * 0.03]], tint);
      else braid([[-0.155, y, z], [-0.04, y + 0.004, z + (random() - 0.5) * 0.012], [0.068, y, z]], tint);
    }
    // Spirit gum, in its compartment or out on the table.
    const gumOut = a.state === 'applying';
    const gx = gumOut ? 0.1 : 0.13, gz = gumOut ? D / 2 + 0.06 : -0.04, gy = gumOut ? 0 : T;
    const amber = new THREE.MeshStandardMaterial({ color: '#8a4a16', roughness: 0.15, transparent: true, opacity: 0.86 });
    s.lathe([[0, 0], [0.019, 0], [0.02, 0.004], [0.02, 0.045], [0.012, 0.055], [0.009, 0.065], [0, 0.065]], amber, [gx, gy, gz]);
    s.label('SPIRIT GUM', 0.03, 0.02, [gx, gy + 0.026, gz + 0.0205], '#3b2a1c', '#efe3bf');
    const cap = s.material('#1c1c1e');
    if (gumOut) {
      s.cylinder(0.011, 0.011, 0.016, [gx + 0.045, 0.008, gz + 0.02], cap, 14);
      s.rod([gx + 0.045, 0.012, gz + 0.02], [gx + 0.085, 0.004, gz + 0.03], 0.002, cap);
      s.ball([0.004, 0.003, 0.006], [gx + 0.088, 0.004, gz + 0.031], new THREE.MeshStandardMaterial({ color: '#c98a2e', roughness: 0.2 }), 8);
      // Scissors.
      for (const t of [0.35, -0.35]) {
        const blade = s.box([0.004, 0.002, 0.07], [-0.13 + Math.sin(t) * 0.01, 0.003, D / 2 + 0.07], steel);
        blade.rotation.y = t + 0.6;
        s.ring(0.011, 0.0025, [-0.13 + (t > 0 ? -0.03 : -0.012), 0.003, D / 2 + 0.07 + (t > 0 ? 0.03 : 0.042)], cap).rotation.x = Math.PI / 2;
      }
    } else s.cylinder(0.011, 0.011, 0.016, [gx, gy + 0.073, gz], cap, 14);
    // A powder tin and comb share the small compartment.
    s.cylinder(0.022, 0.022, 0.02, [0.13, T + 0.01, 0.045], s.material('#d9c9b0', { metalness: 0.4 }), 20);
    s.box([0.012, 0.004, 0.07], [0.105, T + 0.006, 0.01], s.material('#2c2622'));

    // The beard on its hook.
    const swing: THREE.Object3D[] = [];
    if (a.hook) {
      const hx = W / 2 + 0.11, top = 0.36;
      s.cylinder(0.05, 0.06, 0.014, [hx, 0.007, -0.02], s.material('#3a2c22'), 24);
      s.rod([hx, 0.01, -0.02], [hx, top, -0.02], 0.005, brass);
      s.tube([[hx, top, -0.02], [hx, top + 0.02, 0], [hx, top + 0.012, 0.03], [hx, top - 0.008, 0.035]], 0.003, brass);
      const beard = new THREE.Group();
      beard.position.set(hx, top - 0.006, 0.035);
      s.root.add(beard);
      const w = { santa: 0.075, pirate: 0.055, villain: 0.035, sage: 0.045, werewolf: 0.075, groucho: 0.05 }[a.character];
      const long = (u: number) => ({
        santa: 0.15 * (1 - 0.55 * u * u), pirate: 0.03 + 0.1 * Math.max(0, 1 - Math.abs(Math.abs(u) - 0.3) * 2.6), villain: 0.02 + 0.075 * (1 - Math.abs(u)) ** 1.4,
        sage: 0.03 + 0.21 * (1 - Math.abs(u)) ** 1.6, werewolf: 0.05 + 0.03 * Math.abs(u), groucho: 0.03,
      })[a.character];
      const hairs: Parameters<typeof strands>[0][number][] = [];
      for (let i = 0; i < 420; i++) {
        const u = mix(-1, 1, random()), depth = random();
        const x = u * w, y = -0.05 - 0.06 * Math.sqrt(1 - u * u) + 0.012 * depth;
        const length = long(u) * mix(0.55, 1, random());
        hairs.push({ at: new THREE.Vector3(x, y, 0.01 + (1 - u * u) * 0.022 - depth * 0.012), dir: new THREE.Vector3(u * 0.12 + (random() - 0.5) * (a.character === 'werewolf' ? 0.7 : 0.18), -1, 0.06), length, width: mix(0.005, 0.009, random()) });
      }
      const coat = a.character === 'santa' && a.hair === 'black' ? main : main;
      beard.add(strands(hairs, new THREE.MeshStandardMaterial({ color: coat, roughness: 0.95 })));
      const loop = new THREE.Mesh(new THREE.TorusGeometry(w * 0.98, 0.0016, 5, 24, Math.PI), s.material('#d8d2c2'));
      loop.scale.y = 0.05 / (w * 0.98);
      loop.position.y = -0.052;
      loop.castShadow = true;
      beard.add(loop);
      swing.push(beard);
    }

    return s.finish({
      update: (_dt, time) => { for (const node of swing) node.rotation.z = Math.sin(time * 1.4) * 0.07 * mood.energy; },
    });
  },
});
