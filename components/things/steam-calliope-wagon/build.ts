import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;
function paint(w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const FINISHES = {
  'red-gilt': 'Circus red panels with every carving gilded: the parade classic.',
  gilt: 'Gilded all over, a wagon of solid gold leaf.',
  'bare-wood': 'Bare unpainted carved wood, oiled or stripped: honest, unfinished, or scraped back for restoration.',
  'white-gold': 'White enamel with gold carving, wedding-cake grand.',
  'blue-silver': 'Midnight blue with silver-leafed carving.',
  'green-gilt': 'Deep green with gilt, an old European show.',
} as const;
const HUES: Record<keyof typeof FINISHES, { panel: string; carve: string; shade: string; metal: number }> = {
  'red-gilt': { panel: '#b81f2a', carve: '#e9b930', shade: '#8a6412', metal: 0.5 },
  gilt: { panel: '#c99a28', carve: '#f2cc4a', shade: '#8a6412', metal: 0.6 },
  'bare-wood': { panel: '#8a623a', carve: '#b98a54', shade: '#5a3d22', metal: 0 },
  'white-gold': { panel: '#f1ede2', carve: '#dcae36', shade: '#8a6412', metal: 0.5 },
  'blue-silver': { panel: '#1b2a6a', carve: '#d9dee6', shade: '#7c8490', metal: 0.6 },
  'green-gilt': { panel: '#1d5f44', carve: '#e3b83a', shade: '#8a6412', metal: 0.5 },
};
const BOARDS = { calliope: 'CALLIOPE', steam: 'STEAM PIANO', music: 'MUSIC OF THE SPHERES', circus: 'GRAND CIRCUS', last: 'LAST PARADE' } as const;

export default defineThing({
  questions: {
    carving: choice('What are the carvings on the wagon sides?', {
      lions: 'Roaring lion heads with flaring manes.',
      mermaids: 'Mermaids with curling scaled tails among waves.',
      cherubs: 'Winged cherub faces blowing trumpets.',
      dragons: 'Coiling dragons with spiked backs.',
      suns: 'Sun faces with long rays, and crescent moons.',
    }),
    finish: choice('How is the wagon finished?', FINISHES),
    state: choice('What is the calliope doing?', {
      playing: 'Playing at full steam: puffs of white steam burst from the whistles and smoke from the stack.',
      simmering: 'Simmering between tunes: one thin wisp from the stack, a single whistle leaking steam.',
      cold: 'Cold and silent, standing ready.',
      sheeted: 'Cold and half covered with a roped-down tarpaulin.',
      derelict: 'Derelict: whistles missing or bent, a wheel sunk, weeds growing through the spokes.',
    }),
    whistles: score('How many whistles does it carry?', ['A modest single rank', 'Two full ranks', 'A towering organ-like crowd of whistles']),
    board: choice('What is lettered on the sky-board along the top?', {
      calliope: 'CALLIOPE', steam: 'STEAM PIANO', music: 'MUSIC OF THE SPHERES', circus: 'GRAND CIRCUS', last: 'LAST PARADE',
    }),
    wheels: choice('How are the sunburst wheels painted?', {
      sunburst: 'Red and yellow sunburst spokes with gilt rims.',
      white: 'White with gold pinstriping.',
      matching: 'In the same colours as the wagon body.',
    }),
    player: choice('What is at the keyboard?', {
      stool: 'An empty stool pulled up to the keys.',
      sheet: 'A stool and sheet music clipped above the keys.',
      gloves: 'A pair of white gloves and a bowler hat left on the stool.',
      nothing: 'Nothing, not even a stool.',
    }),
    lanterns: noul('Do lit carriage lanterns hang at the corners?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const f = HUES[a.finish];
    const derelict = a.state === 'derelict';
    const L = 3.7, W = 1.55, FLOOR = 1.0, BODY = 1.0;
    const TOP = FLOOR + BODY;
    const rough = 0.42 + mood.wear * 0.4 + (derelict ? 0.15 : 0);
    const wearMarks = (c: Ctx, w: number, h: number, n: number) => {
      const count = n * (mood.wear + (derelict ? 0.7 : 0));
      for (let i = 0; i < count; i++) {
        c.fillStyle = random() < 0.5 ? 'rgba(90,70,50,0.8)' : 'rgba(150,140,125,0.8)';
        c.beginPath();
        c.ellipse(random() * w, random() * h, 3 + random() * 14, 2 + random() * 8, random() * 3, 0, 7);
        c.fill();
      }
    };
    const scroll = (c: Ctx, x: number, y: number, r: number, flip: number) => {
      c.beginPath();
      for (let t = 0; t < 4.2 * Math.PI; t += 0.2) { const rr = r * (1 - t / (4.6 * Math.PI)); c.lineTo(x + flip * Math.cos(t) * rr, y + Math.sin(t) * rr); }
      c.stroke();
    };
    const motif = (c: Ctx, x: number, y: number, r: number) => {
      c.fillStyle = f.carve; c.strokeStyle = f.shade; c.lineWidth = 4;
      if (a.carving === 'lions') {
        for (let i = 0; i < 16; i++) { const an = (i / 16) * 7; c.beginPath(); c.moveTo(x + Math.cos(an - 0.22) * r * 0.6, y + Math.sin(an - 0.22) * r * 0.6); c.lineTo(x + Math.cos(an) * r * 1.1, y + Math.sin(an) * r * 1.1); c.lineTo(x + Math.cos(an + 0.22) * r * 0.6, y + Math.sin(an + 0.22) * r * 0.6); c.fill(); c.stroke(); }
        c.beginPath(); c.arc(x, y, r * 0.62, 0, 7); c.fill(); c.stroke();
        c.fillStyle = f.shade;
        c.beginPath(); c.arc(x - r * 0.24, y - r * 0.14, r * 0.08, 0, 7); c.arc(x + r * 0.24, y - r * 0.14, r * 0.08, 0, 7); c.fill();
        c.beginPath(); c.moveTo(x - r * 0.12, y + r * 0.05); c.lineTo(x + r * 0.12, y + r * 0.05); c.lineTo(x, y + r * 0.2); c.fill();
        c.beginPath(); c.ellipse(x, y + r * 0.38, r * 0.22, r * 0.14, 0, 0, 7); c.fill();
      } else if (a.carving === 'mermaids') {
        c.lineWidth = r * 0.34; c.strokeStyle = f.carve; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.5); c.bezierCurveTo(x + r * 0.6, y - r * 0.6, x - r * 0.7, y + r * 0.7, x + r * 0.6, y + r * 0.6); c.stroke();
        c.lineWidth = 4; c.strokeStyle = f.shade;
        for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x - r * 0.1 + i * r * 0.1, y + r * 0.15 + i * r * 0.07, r * 0.12, 0.5, 2.6); c.stroke(); }
        c.beginPath(); c.moveTo(x + r * 0.6, y + r * 0.6); c.lineTo(x + r * 1.05, y + r * 0.25); c.lineTo(x + r * 0.85, y + r * 0.65); c.lineTo(x + r * 1.05, y + r * 0.95); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.arc(x - r * 0.62, y - r * 0.62, r * 0.24, 0, 7); c.fill(); c.stroke();
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x - r * 0.9 + i * r * 0.9, y + r * 0.95, r * 0.4, Math.PI, 0); c.stroke(); }
      } else if (a.carving === 'cherubs') {
        for (const d of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x + d * r * (0.55 + i * 0.16), y - r * 0.1 + i * r * 0.16, r * 0.42, r * 0.15, d * (0.5 - i * 0.2), 0, 7); c.fill(); c.stroke(); }
        c.beginPath(); c.arc(x, y, r * 0.42, 0, 7); c.fill(); c.stroke();
        c.fillStyle = f.shade;
        c.beginPath(); c.arc(x - r * 0.15, y - r * 0.06, r * 0.05, 0, 7); c.arc(x + r * 0.15, y - r * 0.06, r * 0.05, 0, 7); c.fill();
        c.beginPath(); c.arc(x, y + r * 0.16, r * 0.07, 0, 7); c.fill();
        for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x - r * 0.3 + i * r * 0.15, y - r * 0.4, r * 0.1, 0, 7); c.stroke(); }
      } else if (a.carving === 'dragons') {
        c.lineWidth = r * 0.26; c.strokeStyle = f.carve; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - r, y + r * 0.5);
        for (let i = 0; i <= 20; i++) c.lineTo(x - r + (i / 20) * r * 2, y + Math.sin(i * 0.75) * r * 0.5);
        c.stroke();
        c.fillStyle = f.carve; c.strokeStyle = f.shade; c.lineWidth = 3;
        for (let i = 1; i < 20; i += 2) { const px = x - r + (i / 20) * r * 2, py = y + Math.sin(i * 0.75) * r * 0.5; c.beginPath(); c.moveTo(px - r * 0.07, py - r * 0.1); c.lineTo(px, py - r * 0.34); c.lineTo(px + r * 0.07, py - r * 0.1); c.fill(); c.stroke(); }
        c.beginPath(); c.moveTo(x + r * 0.9, y + r * 0.1); c.lineTo(x + r * 1.35, y + r * 0.2); c.lineTo(x + r * 0.95, y + r * 0.55); c.closePath(); c.fill(); c.stroke();
      } else {
        for (let i = 0; i < 12; i++) { const an = (i / 12) * 7; c.beginPath(); c.moveTo(x + Math.cos(an - 0.14) * r * 0.5, y + Math.sin(an - 0.14) * r * 0.5); c.lineTo(x + Math.cos(an) * r * (i % 2 ? 0.85 : 1.15), y + Math.sin(an) * r * (i % 2 ? 0.85 : 1.15)); c.lineTo(x + Math.cos(an + 0.14) * r * 0.5, y + Math.sin(an + 0.14) * r * 0.5); c.fill(); c.stroke(); }
        c.beginPath(); c.arc(x, y, r * 0.5, 0, 7); c.fill(); c.stroke();
        c.fillStyle = f.shade;
        c.beginPath(); c.arc(x - r * 0.17, y - r * 0.08, r * 0.05, 0, 7); c.arc(x + r * 0.17, y - r * 0.08, r * 0.05, 0, 7); c.fill();
        c.lineWidth = 4; c.beginPath(); c.arc(x, y + r * 0.08, r * 0.2, 0.3, 2.8); c.stroke();
      }
    };
    const sideMap = paint(1024, 320, (c, w, h) => {
      c.fillStyle = f.panel;
      c.fillRect(0, 0, w, h);
      // Three framed panels with a carved figure in each, scrollwork in the spandrels.
      c.strokeStyle = f.carve; c.lineWidth = 14;
      c.strokeRect(10, 10, w - 20, h - 20);
      for (let i = 0; i < 3; i++) {
        const x0 = 30 + i * ((w - 60) / 3), pw = (w - 60) / 3 - 16;
        c.strokeStyle = f.carve; c.lineWidth = 9;
        c.strokeRect(x0 + 8, 34, pw, h - 68);
        c.strokeStyle = f.shade; c.lineWidth = 3;
        c.strokeRect(x0 + 16, 42, pw - 16, h - 84);
        motif(c, x0 + 8 + pw / 2, h / 2, 82);
        c.strokeStyle = f.carve; c.lineWidth = 7;
        for (const [sx, sy, fl] of [[x0 + 50, 78, 1], [x0 + pw - 34, 78, -1], [x0 + 50, h - 78, 1], [x0 + pw - 34, h - 78, -1]] as const) scroll(c, sx, sy, 26, fl);
      }
      wearMarks(c, w, h, 220);
    });
    const endMap = paint(256, 256, (c, w, h) => {
      c.fillStyle = f.panel; c.fillRect(0, 0, w, h);
      c.strokeStyle = f.carve; c.lineWidth = 12; c.strokeRect(10, 10, w - 20, h - 20);
      motif(c, w / 2, h / 2, 70);
      wearMarks(c, w, h, 60);
    });
    const carve = s.material(f.carve, { metalness: f.metal, roughness: 0.35 + mood.wear * 0.3 });
    const panel = s.material(f.panel, { roughness: rough });
    const sidePaint = new THREE.MeshStandardMaterial({ map: sideMap, roughness: rough, metalness: f.metal * 0.3 });
    const endPaint = new THREE.MeshStandardMaterial({ map: endMap, roughness: rough, metalness: f.metal * 0.3 });
    const brass = s.material(derelict ? '#8a8a5a' : '#dcae3c', { metalness: 0.8, roughness: derelict ? 0.7 : 0.25 });
    const iron = s.material('#26262a', { metalness: 0.6, roughness: 0.5 });
    const wood = s.material('#6a4628');

    // Wagon body: carved sides and ends, cornice, sill, corner posts.
    s.mesh(new THREE.BoxGeometry(L, BODY, W), [endPaint, endPaint, panel, panel, sidePaint, sidePaint] as unknown as THREE.Material, [0, FLOOR + BODY / 2, 0]);
    s.box([L + 0.16, 0.1, W + 0.16], [0, TOP + 0.03, 0], carve);
    s.box([L + 0.1, 0.1, W + 0.1], [0, FLOOR - 0.02, 0], carve);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.cylinder(0.07, 0.07, BODY, [x * (L / 2), FLOOR + BODY / 2, z * (W / 2)], carve, 12);
      s.ball([0.1, 0.1, 0.1], [x * (L / 2), TOP + 0.16, z * (W / 2)], carve, 12);
    }
    // Raised carved bosses over the painted figures, so the relief catches the light.
    for (let i = 0; i < 3; i++) for (const z of [-1, 1]) s.ball([0.2, 0.2, 0.05], [(i - 1) * ((L - 0.24) / 3), FLOOR + BODY / 2, z * (W / 2 + 0.005)], carve, 16).visible = a.carving === 'lions' || a.carving === 'suns';
    s.box([L - 0.3, 0.2, 0.9], [0, FLOOR - 0.15, 0], iron);

    // Sky-board with lettering along the top edge, both sides.
    const text = BOARDS[a.board];
    const boardMap = paint(1024, 128, (c, w, h) => {
      c.fillStyle = f.panel; c.fillRect(0, 0, w, h);
      c.strokeStyle = f.carve; c.lineWidth = 10; c.strokeRect(6, 6, w - 12, h - 12);
      c.fillStyle = f.carve; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${Math.min(84, (w * 1.5) / text.length)}px Georgia, serif`;
      c.fillText(text, w / 2, h / 2 + 4, w - 60);
      wearMarks(c, w, h, 60);
    });
    const boardPaint = new THREE.MeshStandardMaterial({ map: boardMap, roughness: rough });
    const board = s.mesh(new THREE.BoxGeometry(L * 0.8, 0.3, 0.05), [panel, panel, carve, panel, boardPaint, boardPaint] as unknown as THREE.Material, [0, TOP + 0.23, W / 2 + 0.02]);
    board.castShadow = false;
    for (const x of [-1, 1]) s.ring(0.14, 0.035, [x * (L * 0.4 + 0.1), TOP + 0.2, W / 2 + 0.02], carve);

    // Wheels: big sunburst rears, smaller fronts, on iron axles.
    const spokeA = a.wheels === 'sunburst' ? '#d3262c' : a.wheels === 'white' ? '#f3efe4' : f.panel;
    const spokeB = a.wheels === 'sunburst' ? '#f4c531' : a.wheels === 'white' ? '#d9ae3a' : f.carve;
    const matA = s.material(spokeA), matB = s.material(spokeB, { metalness: 0.3 });
    const wheels: THREE.Object3D[] = [];
    const sunk = derelict ? (random() < 0.5 ? 0 : 2) : -1;
    [[L / 2 - 0.75, 0.52], [-L / 2 + 0.85, 0.7]].forEach(([x, r], pair) => {
      s.rod([x, r, -W / 2 - 0.1], [x, r, W / 2 + 0.1], 0.05, iron);
      for (const z of [-1, 1]) {
        const g = new Sculpture(context);
        g.ring(r - 0.04, 0.05, [0, 0, 0], matB);
        g.ring(r, 0.025, [0, 0, 0], iron);
        const spokes = 12;
        for (let i = 0; i < spokes; i++) {
          const spoke = g.mesh(new THREE.ConeGeometry(0.055, r - 0.1, 6), i % 2 ? matA : matB, [0, 0, 0]);
          spoke.geometry.translate(0, (r - 0.1) / 2 + 0.06, 0);
          spoke.rotation.z = (i / spokes) * Math.PI * 2;
          spoke.scale.z = 0.5;
        }
        g.cylinder(0.12, 0.12, 0.16, [0, 0, 0], matB, 16).rotation.x = Math.PI / 2;
        g.ball([0.07, 0.07, 0.05], [0, 0, z * 0.09], matA, 10);
        const index = pair * 2 + (z > 0 ? 0 : 1);
        g.root.position.set(x, r, z * (W / 2 + 0.12));
        g.root.rotation.z = random() * 6;
        if (index === sunk) { g.root.rotation.x = z * 0.22; g.root.position.y = r - 0.12; }
        s.root.add(g.root);
        wheels.push(g.root);
      }
    });
    s.rod([L / 2 - 0.2, FLOOR - 0.3, 0], [L / 2 + 0.8, 0.42, 0], 0.045, wood);
    s.rod([L / 2 + 0.76, 0.42, -0.4], [L / 2 + 0.76, 0.42, 0.4], 0.035, wood);

    // Boiler and smokestack at the front of the deck.
    const BX = L / 2 - 0.62;
    s.cylinder(0.42, 0.42, 1.0, [BX, TOP + 0.58, 0], s.material('#2c2d31', { metalness: 0.55, roughness: 0.45 }), 24);
    s.ball([0.42, 0.2, 0.42], [BX, TOP + 1.08, 0], s.material('#2c2d31', { metalness: 0.55, roughness: 0.45 }), 20);
    for (const y of [0.2, 0.58, 0.96]) s.ring(0.425, 0.022, [BX, TOP + y, 0], brass).rotation.x = Math.PI / 2;
    s.cylinder(0.11, 0.13, 0.95, [BX, TOP + 1.65, 0], iron, 16);
    s.lathe([[0.11, 0], [0.2, 0.16], [0.21, 0.2], [0.15, 0.22]], brass, [BX, TOP + 2.08, 0]).material.side = THREE.DoubleSide;
    s.box([0.2, 0.24, 0.03], [BX, TOP + 0.36, 0.42], brass);
    s.cylinder(0.07, 0.07, 0.03, [BX - 0.2, TOP + 0.8, 0.4], s.material('#f3efe4'), 14).rotation.x = Math.PI / 2;
    const STACK: P3 = [BX, TOP + 2.35, 0];

    // Whistle ranks on a brass manifold: stepped like organ pipes.
    const ranks = a.whistles < 0.34 ? 1 : a.whistles < 0.75 ? 2 : 3;
    const per = 9 + Math.round(a.whistles * 4);
    const X0 = -L / 2 + 0.75, X1 = BX - 0.7;
    const whistleTops: P3[] = [];
    const sheeted = a.state === 'sheeted';
    for (let r = 0; r < ranks; r++) {
      const z = (r - (ranks - 1) / 2) * 0.36;
      s.rod([X0 - 0.1, TOP + 0.16, z], [X1 + 0.1, TOP + 0.16, z], 0.05, brass);
      for (let i = 0; i < per; i++) {
        if (derelict && random() < 0.28) continue;
        const t = i / (per - 1), x = mix(X0, X1, t);
        const h = mix(1.25, 0.34, Math.pow(t, 0.8)) * (1 - r * 0.16) + (r === 1 ? 0.06 : 0);
        const rad = mix(0.07, 0.035, t);
        const g = new Sculpture(context);
        g.mesh(new THREE.LatheGeometry([[0.001, 0], [rad, 0], [rad, h * 0.3 - 0.02], [rad * 1.3, h * 0.3 - 0.02], [rad * 1.3, h * 0.3 + 0.02], [rad, h * 0.3 + 0.02], [rad, h], [rad * 1.25, h], [0.001, h + rad * 1.6]].map(([px, py]) => new THREE.Vector2(px, py)), 12), brass);
        g.box([rad * 1.3, rad * 0.9, 0.01], [0, h * 0.3 + rad * 1.5, rad], iron);
        g.root.position.set(x, TOP + 0.18, z);
        if (derelict && random() < 0.3) g.root.rotation.set((random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.7);
        s.root.add(g.root);
        whistleTops.push([x, TOP + 0.18 + h + rad * 1.6, z]);
      }
    }

    // Keyboard on the rear end with the player's stool on a little platform.
    const KX = -L / 2 - 0.12;
    const keyMap = paint(256, 64, (c, w, h) => {
      c.fillStyle = '#f6f2e6'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1a1a1c';
      for (let i = 0; i < 22; i++) { c.fillRect(i * (w / 22), 0, 1.5, h); if (![2, 6].includes(i % 7)) c.fillRect(i * (w / 22) + 7, 0, 7, h * 0.6); }
    });
    s.box([0.34, 0.5, 1.2], [KX - 0.05, TOP - 0.3, 0], panel);
    keyMap.center.set(0.5, 0.5);
    keyMap.rotation = Math.PI / 2;
    s.mesh(new THREE.BoxGeometry(0.24, 0.05, 1.1), [wood, wood, new THREE.MeshStandardMaterial({ map: keyMap, roughness: 0.4 }), wood, wood, wood] as unknown as THREE.Material, [KX - 0.18, TOP - 0.02, 0]);
    s.box([0.06, 0.34, 1.2], [KX + 0.06, TOP + 0.2, 0], carve);
    s.box([0.9, 0.08, 1.3], [KX - 0.5, FLOOR - 0.04, 0], wood);
    for (const z of [-0.55, 0.55]) s.rod([KX - 0.9, FLOOR - 0.04, z], [KX - 0.2, FLOOR - 0.5, z], 0.025, iron);
    if (a.player !== 'nothing') {
      const SXp = KX - 0.6;
      s.cylinder(0.2, 0.2, 0.07, [SXp, FLOOR + 0.52, 0], s.material('#7a1c26'), 16);
      s.cylinder(0.03, 0.03, 0.5, [SXp, FLOOR + 0.25, 0], iron, 8);
      for (let i = 0; i < 3; i++) s.rod([SXp, FLOOR + 0.2, 0], [SXp + Math.cos(i * 2.1) * 0.22, FLOOR + 0.01, Math.sin(i * 2.1) * 0.22], 0.02, iron);
      if (a.player === 'sheet') {
        const sheet = paint(128, 96, (c, w, h) => { c.fillStyle = '#f4ecd4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a2420'; for (let k = 0; k < 4; k++) for (let l = 0; l < 5; l++) { c.beginPath(); c.moveTo(6, 10 + k * 22 + l * 3); c.lineTo(w - 6, 10 + k * 22 + l * 3); c.stroke(); } c.fillStyle = '#2a2420'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(10 + random() * (w - 20), 10 + Math.floor(random() * 4) * 22 + random() * 12, 2.4, 0, 7); c.fill(); } });
        const page = s.mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshStandardMaterial({ map: sheet, side: THREE.DoubleSide, roughness: 0.9 }), [KX + 0.02, TOP + 0.24, 0]);
        page.rotation.set(0, -Math.PI / 2, 0.15, 'YXZ');
      } else if (a.player === 'gloves') {
        s.cylinder(0.1, 0.1, 0.11, [SXp, FLOOR + 0.61, 0.02], s.material('#1a191c'), 16).scale.set(1, 1, 0.85);
        s.cylinder(0.16, 0.16, 0.015, [SXp, FLOOR + 0.563, 0.02], s.material('#1a191c'), 16);
        for (const z of [-0.1, 0.08]) s.ball([0.05, 0.02, 0.09], [SXp - 0.12, FLOOR + 0.575, z], s.material('#f6f3ea'), 8);
      }
    }

    if (a.lanterns) {
      const glow = new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffb93a', emissiveIntensity: mix(0.8, 2.2, 1 - mood.daylight * 0.5) });
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const at: P3 = [x * (L / 2 + 0.05), TOP - 0.2, z * (W / 2 + 0.16)];
        s.rod([x * (L / 2), TOP - 0.02, z * (W / 2)], [at[0], at[1] + 0.2, at[2]], 0.015, iron);
        s.box([0.12, 0.2, 0.12], at, glow);
        s.mesh(new THREE.ConeGeometry(0.11, 0.09, 4), brass, [at[0], at[1] + 0.14, at[2]]).rotation.y = Math.PI / 4;
        s.box([0.14, 0.02, 0.14], [at[0], at[1] - 0.11, at[2]], brass);
      }
    }

    // Tarpaulin thrown over the rear two thirds, roped to the sill.
    if (sheeted) {
      const tarpMap = paint(256, 256, (c, w, h) => {
        c.fillStyle = '#7d7a5c'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 60; i++) { c.fillStyle = random() < 0.5 ? 'rgba(60,58,44,0.25)' : 'rgba(170,165,130,0.25)'; c.beginPath(); c.ellipse(random() * w, random() * h, 10 + random() * 40, 6 + random() * 20, random() * 3, 0, 7); c.fill(); }
        c.strokeStyle = 'rgba(50,48,36,0.5)'; c.lineWidth = 2;
        for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, i * 64 + 20); c.lineTo(w, i * 64 + 20); c.stroke(); }
      });
      const len = L * 0.62, drop = 2.6;
      const geo = new THREE.BoxGeometry(len, drop, W + 0.36, 14, 8, 6);
      const pos = geo.attributes.position;
      const peak = TOP + 1.45 * (1 - (ranks - 1) * 0.0) - FLOOR - 0.35;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const u = x / len + 0.5, v = y / drop + 0.5;
        // Tent-like over the whistles: tall at the rear, falling toward the front edge.
        const ridge = 1 - Math.abs(z) / (W / 2 + 0.18);
        let ny = y;
        if (v > 0.95) ny = -drop / 2 + drop * (0.55 + 0.45 * (ridge * 0.45 + 0.55) * mix(1, 0.74, u)) + Math.sin(x * 9) * 0.03;
        const flare = v < 0.5 ? (0.5 - v) * 0.14 : 0;
        pos.setXYZ(i, x + Math.sin(y * 7 + z * 5) * 0.02, ny + (v < 0.05 ? Math.sin(x * 11 + z * 9) * 0.09 : 0), z * (1 + flare) + Math.sin(x * 8 + y * 6) * 0.03 * (v < 0.9 ? 1 : 0));
      }
      geo.computeVertexNormals();
      const tarp = s.mesh(geo, new THREE.MeshStandardMaterial({ map: tarpMap, roughness: 1, side: THREE.DoubleSide }), [-L / 2 + len / 2 - 0.2, FLOOR + 0.3 + drop / 2, 0]);
      tarp.name = `peak ${peak}`;
      const cord = s.material('#d8caa0');
      for (let i = 0; i < 4; i++) {
        const x = -L / 2 + 0.1 + i * (len / 3.4);
        s.tube([[x, FLOOR + 0.3, W / 2 + 0.26], [x + 0.04, TOP + mix(1.72, 1.3, i / 3), W / 4], [x, TOP + mix(1.95, 1.48, i / 3), 0], [x - 0.04, TOP + mix(1.72, 1.3, i / 3), -W / 4], [x, FLOOR + 0.3, -W / 2 - 0.26]], 0.016, cord);
      }
    }

    // Weeds and a sagging stance when derelict.
    if (derelict) {
      const green = s.material('#5d7a3a'), dry = s.material('#a39a5a');
      const blade = new THREE.ConeGeometry(0.03, 0.6, 4);
      blade.translate(0, 0.3, 0);
      const pts: { at: P3; size: number }[] = [];
      for (let i = 0; i < 70; i++) pts.push({ at: [(random() - 0.5) * (L + 1), 0, (random() < 0.5 ? -1 : 1) * (W / 2 + 0.1 + random() * 0.45)], size: 0.5 + random() * 1.3 });
      s.scatter(blade, green, pts.slice(0, 40));
      s.scatter(blade, dry, pts.slice(40));
    }

    // Steam and smoke.
    const puffs: { mesh: THREE.Mesh; home: THREE.Vector3; phase: number; size: number }[] = [];
    const steam = s.material('#f4f4f1', { roughness: 1 });
    const smoke = s.material('#8e8a86', { roughness: 1 });
    const plume = (from: P3, count: number, rise: number, mat: THREE.Material, size: number) => {
      for (let i = 0; i < count; i++) {
        const u = (i + 1) / count;
        const home = new THREE.Vector3(from[0] - u * rise * 0.35 + (random() - 0.5) * 0.2 * u, from[1] + u * rise, from[2] + (random() - 0.5) * 0.25 * u);
        const sz = size * (0.5 + u * 0.9) * (0.8 + random() * 0.4);
        puffs.push({ mesh: s.ball([sz, sz * 0.9, sz], home.toArray() as P3, mat, 10), home, phase: random() * 6, size: sz });
      }
    };
    if (a.state === 'playing') {
      plume(STACK, 6, 1.5, smoke, 0.3);
      const notes = Math.min(whistleTops.length, 5 + Math.floor(mood.energy * 5));
      const order = whistleTops.map((top) => ({ top, key: random() })).sort((x, y) => x.key - y.key).slice(0, notes);
      for (const { top } of order) plume(top, 3, 0.55 + random() * 0.4, steam, 0.15);
    } else if (a.state === 'simmering') {
      plume(STACK, 3, 0.8, smoke, 0.16);
      if (whistleTops.length) plume(whistleTops[Math.floor(random() * whistleTops.length)], 2, 0.4, steam, 0.1);
    }

    const lively = mix(0.3, 2.2, mood.energy);
    const thing = s.finish({
      update: (_dt, time) => {
        for (const puff of puffs) {
          const beat = 0.75 + 0.35 * Math.sin(time * lively * 3 + puff.phase);
          puff.mesh.scale.set(puff.size * beat, puff.size * 0.9 * beat, puff.size * beat);
          puff.mesh.position.y = puff.home.y + Math.sin(time * lively + puff.phase) * 0.05;
        }
      },
    });
    if (derelict) s.root.rotation.z = (random() - 0.5) * 0.05;
    return thing;
  },
});
