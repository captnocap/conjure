import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Tradition = 'wayang' | 'karagoz' | 'piying' | 'nursery';
type Role = 'hero' | 'demon' | 'lover' | 'clown';
const FW = 256, FH = 384, U = 318, CX = 118;
const INK = '#1c130d';
const PALETTES: Record<Tradition, Record<'body' | 'skirt' | 'skin' | 'trim' | 'demon', string>> = {
  wayang: { body: '#d9a936', skirt: '#8a3a22', skin: '#f1e6c8', trim: '#c2262b', demon: '#b3262b' },
  karagoz: { body: '#2f9a55', skirt: '#d8a02a', skin: '#e9b48c', trim: '#c2262b', demon: '#7a3fb0' },
  piying: { body: '#c8262e', skirt: '#2a5fb0', skin: '#f3e2cf', trim: '#e3b53a', demon: '#1f7a6a' },
  nursery: { body: '#2a2622', skirt: '#2a2622', skin: '#2a2622', trim: '#2a2622', demon: '#2a2622' },
};

/** One flat puppet facing right, as a silhouette or painted. Returns where its raised hand is, in canvas pixels. */
function drawFigure(tradition: Tradition, role: Role, painted: boolean, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = FW; canvas.height = FH;
  const g = canvas.getContext('2d')!;
  const X = (x: number) => CX + x * U, Y = (y: number) => FH - 8 - y * U;
  const pal = PALETTES[tradition];
  const col = (k: keyof typeof pal) => (painted ? (k === 'body' && role === 'demon' ? pal.demon : pal[k]) : INK);
  const poly = (pts: (readonly [number, number])[], fill: string) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); g.fillStyle = fill; g.fill(); };
  const oval = (x: number, y: number, rx: number, ry: number, fill: string) => { g.beginPath(); g.ellipse(X(x), Y(y), rx * U, ry * U, 0, 0, 7); g.fillStyle = fill; g.fill(); };
  const line = (pts: (readonly [number, number])[], w: number, stroke: string) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.lineWidth = w * U; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = stroke; g.stroke(); };
  const T = { hero: 1, lover: 0.94, demon: 1.02, clown: 0.72 }[role];
  const B = { hero: 1, lover: 0.9, demon: 1.75, clown: 1.5 }[role];
  const hr = { hero: 0.052, lover: 0.048, demon: 0.085, clown: 0.074 }[role];
  const hip = 0.45 * T, sh = 0.72 * T, hy = sh + 0.035 + hr;
  const animal = tradition === 'nursery';

  // Back arm first so the body overlaps it.
  line([[-0.07 * B, sh - 0.01], [-0.07 * B - 0.035, sh - 0.17 * T], [-0.07 * B + 0.02, sh - 0.3 * T]], 0.02, col('skin'));
  if (role === 'clown') {
    poly([[-0.07, 0], [-0.005, 0], [-0.01, 0.26 * T], [-0.07, 0.26 * T]], col('skirt'));
    poly([[0.02, 0], [0.12, 0], [0.07, 0.04], [0.07, 0.26 * T], [0.02, 0.26 * T]], col('skirt'));
    oval(0.02, 0.43 * T, 0.125, 0.2 * T, col('body'));
  } else {
    poly([[-0.06 * B, 0], [0.11 * B, 0], [0.07 * B, 0.25 * T], [0.05 * B, hip], [-0.05 * B, hip], [-0.13 * B - 0.02, 0.32 * T], [-0.085 * B, 0.18 * T]], col('skirt'));
    if (tradition === 'wayang') poly([[-0.05 * B, hip], [-0.2, hip - 0.02], [-0.24, hip + 0.06], [-0.17, hip + 0.03], [-0.05 * B, hip + 0.05]], col('trim'));
  }
  poly([[-0.047 * B, hip - 0.01], [0.047 * B, hip - 0.01], [0.04 * B, 0.6 * T], [0.078 * B, sh], [-0.078 * B, sh], [-0.035 * B, 0.6 * T]], col('body'));
  poly([[-0.016, sh - 0.01], [0.022, sh - 0.01], [0.022, hy], [-0.016, hy]], col('skin'));
  // Head and what it wears.
  if (tradition === 'wayang') {
    if (role === 'demon') { oval(-hr * 0.8, hy + 0.01, hr * 0.95, hr * 1.25, col('trim')); for (let i = 0; i < 7; i++) { const t = 1.6 + i * 0.42; poly([[-hr * 0.8 + Math.cos(t) * hr * 0.8, hy + Math.sin(t) * hr], [-hr * 0.8 + Math.cos(t + 0.2) * hr * 0.8, hy + Math.sin(t + 0.2) * hr], [-hr * 0.8 + Math.cos(t + 0.1) * hr * 1.7, hy + Math.sin(t + 0.1) * hr * 1.9]], col('trim')); } }
    else line([[-0.005, hy + hr * 0.7], [-0.05, hy + hr + 0.055], [-0.105, hy + hr + 0.05], [-0.125, hy + hr - 0.01], [-0.09, hy + hr - 0.035]], 0.032, col('body'));
  } else if (tradition === 'karagoz') {
    oval(-0.005, hy + hr * 0.85, hr * 1.25, hr * 0.62, role === 'demon' ? col('body') : col('trim'));
    poly([[hr * 0.1, hy - hr * 0.6], [hr * 1.05, hy - hr * 0.45], [hr * 0.75, hy - hr * 2.0]], painted ? '#2a2420' : INK);
  } else if (tradition === 'piying') {
    for (const k of [0, 1]) line([[0, hy + hr * 0.8], [-0.04 - k * 0.02, hy + hr + 0.11 - k * 0.03], [-0.15 - k * 0.02, hy + hr + 0.16 - k * 0.06]], 0.012, col('trim'));
    poly([[-hr, hy + hr * 0.5], [hr * 0.9, hy + hr * 0.5], [hr * 0.6, hy + hr * 1.5], [0, hy + hr * 1.15], [-hr * 0.6, hy + hr * 1.5]], col('trim'));
    oval(-hr * 0.9, hy - hr * 0.1, hr * 0.5, hr * 0.9, painted ? '#1e1a1a' : INK);
  } else if (role === 'hero' || role === 'lover') { for (const k of [-1, 1]) { g.save(); g.translate(X(k * hr * 0.35 - 0.01), Y(hy + hr * 1.7)); g.rotate(k * 0.18 - 0.15); g.beginPath(); g.ellipse(0, 0, hr * 0.3 * U, hr * 1.2 * U, 0, 0, 7); g.fillStyle = INK; g.fill(); g.restore(); } }
  else if (role === 'demon') { for (const k of [-1, 1]) poly([[k * hr * 0.7 - hr * 0.3, hy + hr * 0.5], [k * hr * 0.6, hy + hr * 1.7], [k * hr * 0.2 + hr * 0.1, hy + hr * 0.8]], INK); poly([[hr * 0.4, hy + hr * 0.5], [hr * 2.1, hy - hr * 0.05], [hr * 2.0, hy - hr * 0.4], [hr * 0.4, hy - hr * 0.75]], INK); }
  else for (const k of [-1, 1]) oval(k * hr * 0.75, hy + hr * 0.8, hr * 0.42, hr * 0.42, INK);
  oval(0.008, hy, hr, hr * 0.92, role === 'demon' && painted ? pal.demon : col('skin'));
  if (!animal) {
    if (role === 'demon' || role === 'clown') oval(hr + 0.012, hy - hr * 0.05, hr * 0.38, hr * 0.34, role === 'demon' && painted ? pal.demon : col('skin'));
    else poly([[hr * 0.6, hy + hr * 0.42], [hr + (tradition === 'wayang' ? 0.06 : 0.025), hy - hr * 0.22], [hr * 0.7, hy - hr * 0.4]], col('skin'));
  }
  if (role === 'demon') for (const k of [0, 1]) poly([[hr * (0.5 + k * 0.45), hy - hr * 0.5], [hr * (0.8 + k * 0.45), hy - hr * 0.5], [hr * (0.68 + k * 0.45), hy - hr * 1.15]], painted ? '#f6f1e2' : INK);
  // Front arm, raised toward whoever it faces.
  const raise = { hero: 0.06, demon: 0.15, lover: -0.01, clown: 0.02 }[role] * T + (random() - 0.5) * 0.04;
  const elbow: [number, number] = [0.075 * B + 0.075, sh - 0.14 * T];
  const hand: [number, number] = [0.075 * B + 0.165, sh - 0.05 * T + raise];
  line([[0.07 * B, sh - 0.012], elbow, hand], 0.02, col('skin'));
  oval(hand[0], hand[1], 0.017, 0.014, col('skin'));
  if (role === 'demon') for (let k = 0; k < 3; k++) line([hand, [hand[0] + 0.035, hand[1] + (k - 1) * 0.025 + 0.01]], 0.008, col('skin'));
  if (painted) { line([[-0.05 * B, hip], [0.05 * B, hip]], 0.016, pal.trim); line([[-0.07 * B, sh - 0.012], [0.07 * B, sh - 0.012]], 0.012, pal.trim); }
  // Piercings let the lamp through.
  g.globalCompositeOperation = 'destination-out';
  if (role === 'demon') oval(hr * 0.35, hy + hr * 0.2, hr * 0.3, hr * 0.3, '#000'); else oval(hr * 0.4, hy + hr * 0.15, hr * 0.3, hr * 0.11, '#000');
  if (!animal) {
    const n = role === 'clown' ? 4 : 6;
    for (let i = 0; i < n; i++) { const t = i / (n - 1); if (role === 'clown') oval(0.02 + Math.cos(t * 6.3) * 0.06, 0.43 * T + Math.sin(t * 6.3) * 0.09 * T, 0.012, 0.012, '#000'); else { oval(mix(0.03, 0.0, t) * B, mix(0.05, hip - 0.05, t), 0.011 * B, 0.014, '#000'); if (i % 2) oval(mix(0.07, 0.03, t) * B, mix(0.05, hip - 0.05, t), 0.007, 0.009, '#000'); } }
    for (const y of [0.52, 0.6, 0.67]) { g.save(); g.translate(X(0), Y(y * T)); g.rotate(Math.PI / 4); g.fillRect(-0.011 * U * B, -0.011 * U * B, 0.022 * U * B, 0.022 * U * B); g.restore(); }
  }
  g.globalCompositeOperation = 'source-over';
  if (role === 'demon') oval(hr * 0.4, hy + hr * 0.2, hr * 0.12, hr * 0.12, painted ? '#17120e' : INK);
  return { canvas, hand: [X(hand[0]), Y(hand[1])] as const };
}

export default defineThing({
  questions: {
    tradition: choice('Which shadow theatre is it?', {
      wayang: 'Javanese wayang kulit: elongated gilded leather figures with needle noses and curling headdresses, black shadows, a green banana trunk.',
      karagoz: 'Turkish Karagöz: squat turbaned and bearded comics in translucent coloured camel hide, so the shadows are coloured.',
      piying: 'Chinese piying: red and blue robed opera figures with pheasant-feather crowns, coloured shadows, red lacquer frame.',
      nursery: 'A nursery theatre: a bedsheet pegged in a pine frame with plain black cut-paper animals.',
    }),
    scene: choice('Which figures are pressed to the screen?', {
      duel: 'A slim hero facing a huge fanged demon, arms raised.',
      lovers: 'Two slender lovers leaning toward each other.',
      clowns: 'Two round-bellied clowns squaring up to argue.',
      lone: 'A single figure alone in the middle of the light.',
      empty: 'None yet: the screen glows empty, everyone still staked in the trunk.',
    }),
    scenery: choice('What scenery piece shares the screen?', {
      none: 'None.',
      tree: 'A tall leaf-shaped tree of life in the centre.',
      moon: 'A bright full moon high in one corner.',
      palace: 'The stepped roofs of a palace at one edge.',
    }),
    lamp: choice('What colour is the lamplight?', {
      amber: 'Deep amber, coconut-oil flame.',
      white: 'Pale straw white, a pressure lantern.',
      red: 'Blood red, as for a battle or hell.',
      green: 'Sea green, underwater or ghostly.',
      violet: 'Violet dusk.',
    }),
    cloth: choice('What state is the screen cloth in?', {
      clean: 'Clean and tight as a drum.',
      patched: 'Carefully patched with squares of other cloth.',
      torn: 'Torn: a long rip down from the top and a corner hanging open.',
      stained: 'Water-stained and sooty above the lamp.',
    }),
    side: choice('Which side of the screen faces us?', {
      shadow: 'The audience side: only the glowing cloth and its shadows.',
      puppeteer: "The puppeteer's side: the lamp, the gilded painted puppets themselves, their rods and the trunk of spares.",
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tradition = a.tradition as Tradition;
    const SWm = 1.9, SHm = 1.07, y0 = 0.52, top = y0 + SHm, PX = 539;
    const PW = 0.62, PH = PW * FH / FW;
    const coloured = tradition === 'karagoz' || tradition === 'piying';

    // Cast.
    const roles: Role[] = { duel: ['hero', 'demon'], lovers: ['lover', 'lover'], clowns: ['clown', 'clown'], lone: [tradition === 'karagoz' ? 'clown' : 'hero'], empty: [] }[a.scene] as Role[];
    const spread = { duel: 0.36, lovers: 0.23, clowns: 0.3, lone: 0, empty: 0 }[a.scene] + (a.scenery === 'tree' && roles.length === 2 ? 0.12 : 0);
    type Actor = { x: number; flip: boolean; size: number; shadow: HTMLCanvasElement; paint: HTMLCanvasElement; hand: readonly [number, number]; lean: number; spare: boolean };
    const actors: Actor[] = [];
    const make = (role: Role, x: number, flip: boolean, size: number, spare: boolean, lean = 0) => {
      const seed = random();
      let k = 0; const r1 = () => ((seed * 9301 + ++k * 49297) % 233280) / 233280; k = 0;
      const shadow = drawFigure(tradition, role, false, r1); k = 0;
      const paint = drawFigure(tradition, role, true, r1);
      actors.push({ x, flip, size, shadow: shadow.canvas, paint: paint.canvas, hand: shadow.hand, lean, spare });
    };
    const spareCount = 1 + Math.round(mood.density * 3) + (a.scene === 'empty' ? 1 : 0);
    const pool: Role[] = ['hero', 'clown', 'lover', 'demon', 'hero', 'clown'];
    for (const side of [-1, 1]) for (let i = 0; i < spareCount; i++) make(pool[Math.floor(random() * pool.length)], side * (0.56 + i * 0.1), side > 0, 0.7, true, side * (0.06 + i * 0.07));
    roles.forEach((role, i) => make(role, roles.length === 1 ? 0 : (i ? spread : -spread), i === 1, 1, false));

    // The cloth, with the light and the shadows painted in.
    const lamp = { amber: '#ffb040', white: '#fff0c4', red: '#ff5038', green: '#7fe6bd', violet: '#b79cff' }[a.lamp];
    const cloth = document.createElement('canvas');
    cloth.width = 1024; cloth.height = 576;
    const g = cloth.getContext('2d')!;
    const glow = g.createRadialGradient(512, 300, 20, 512, 300, 620);
    const lampColour = new THREE.Color(lamp);
    glow.addColorStop(0, '#' + lampColour.clone().lerp(new THREE.Color('#ffffff'), 0.6).getHexString());
    glow.addColorStop(0.35, lamp);
    glow.addColorStop(1, '#' + lampColour.clone().multiplyScalar(0.42).getHexString());
    g.fillStyle = glow; g.fillRect(0, 0, 1024, 576);
    g.globalAlpha = 0.05; g.fillStyle = '#000';
    for (let i = 0; i < 1024; i += 4) g.fillRect(i, 0, 1, 576);
    for (let j = 0; j < 576; j += 4) g.fillRect(0, j, 1024, 1);
    g.globalAlpha = 1;
    if (a.cloth === 'patched' || mood.wear > 0.7) for (let i = 0; i < 4; i++) {
      const x = 60 + random() * 820, y = 30 + random() * 400, w = 60 + random() * 80, h = 50 + random() * 70;
      g.fillStyle = ['rgba(120,90,60,0.28)', 'rgba(60,80,120,0.22)', 'rgba(255,255,255,0.2)'][i % 3]; g.fillRect(x, y, w, h);
      g.setLineDash([7, 6]); g.strokeStyle = 'rgba(40,25,15,0.8)'; g.lineWidth = 2.5; g.strokeRect(x + 3, y + 3, w - 6, h - 6); g.setLineDash([]);
    }
    if (a.cloth === 'stained' || mood.wear > 0.6) {
      for (let i = 0; i < 4; i++) { const x = random() * 1024, y = random() * 576, r = 30 + random() * 60; const stain = g.createRadialGradient(x, y, r * 0.6, x, y, r); stain.addColorStop(0, 'rgba(90,60,30,0.07)'); stain.addColorStop(0.85, 'rgba(70,45,20,0.17)'); stain.addColorStop(1, 'rgba(70,45,20,0)'); g.fillStyle = stain; g.fillRect(x - r, y - r, r * 2, r * 2); }
      const soot = g.createLinearGradient(0, 0, 0, 260); soot.addColorStop(0, 'rgba(20,15,10,0.6)'); soot.addColorStop(1, 'rgba(20,15,10,0)'); g.fillStyle = soot; g.beginPath(); g.ellipse(512, 0, 150, 260, 0, 0, 7); g.fill();
    }
    const stamp = (image: HTMLCanvasElement, actor: Actor, alpha: number, blur: number, op: GlobalCompositeOperation = 'source-over') => {
      const dw = PW * PX * actor.size, dh = PH * PX * actor.size;
      g.save();
      g.translate((actor.x / SWm + 0.5) * 1024, 576 - 0.012 * PX);
      g.rotate(-actor.lean);
      if (actor.flip) g.scale(-1, 1);
      g.globalAlpha = alpha; g.globalCompositeOperation = op; g.filter = blur ? `blur(${blur}px)` : 'none';
      g.drawImage(image, -dw / 2, -dh, dw, dh);
      g.restore();
    };
    // Scenery shadows.
    g.fillStyle = INK;
    if (a.scenery === 'tree') {
      g.save(); g.filter = 'blur(1.5px)'; g.globalAlpha = 0.9;
      g.beginPath(); g.moveTo(512, 96); g.bezierCurveTo(640, 250, 640, 430, 560, 520); g.lineTo(464, 520); g.bezierCurveTo(384, 430, 384, 250, 512, 96); g.fill();
      g.fillRect(498, 500, 28, 76);
      g.globalCompositeOperation = 'destination-out'; g.filter = 'none';
      for (let i = 0; i < 26; i++) { const t = i / 25, y = 170 + t * 320, w = 20 + Math.sin(t * 3.1) * 62; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(512 + k * w * (0.35 + (i % 3) * 0.3), y, 7, 4, k * 0.6, 0, 7); g.fill(); } }
      g.beginPath(); g.ellipse(512, 450, 16, 26, 0, 0, 7); g.fill();
      g.restore();
      // destination-out left holes in the cloth itself: fill them back with light.
      g.save(); g.globalCompositeOperation = 'destination-over'; g.fillStyle = glow; g.fillRect(0, 0, 1024, 576); g.restore();
    } else if (a.scenery === 'moon') { g.save(); g.filter = 'blur(3px)'; g.fillStyle = 'rgba(255,255,245,0.85)'; g.beginPath(); g.arc(840, 120, 62, 0, 7); g.fill(); g.restore(); }
    else if (a.scenery === 'palace') { g.save(); g.filter = 'blur(1.5px)'; g.globalAlpha = 0.9; for (let k = 0; k < 3; k++) { const w = 200 - k * 55, y = 576 - 120 - k * 85; g.fillRect(0, y, w * 0.8, 130); g.beginPath(); g.moveTo(-20, y); g.lineTo(w + 30, y); g.lineTo(w - 10, y - 26); g.lineTo(0, y - 40); g.fill(); } g.restore(); }
    for (const actor of actors) {
      if (coloured) { stamp(actor.paint, actor, actor.spare ? 0.6 : 0.95, actor.spare ? 3 : 1, 'multiply'); stamp(actor.shadow, actor, actor.spare ? 0.25 : 0.4, actor.spare ? 3 : 1); }
      else stamp(actor.shadow, actor, actor.spare ? 0.62 : 0.96, actor.spare ? 3.5 : 1.2);
    }
    g.fillStyle = `rgba(70,55,35,${mood.wear * 0.22})`; g.fillRect(0, 0, 1024, 576);
    const torn = a.cloth === 'torn';
    if (torn) {
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      const rx = 180 + random() * 660;
      g.beginPath(); g.moveTo(rx - 26, 0); g.lineTo(rx + 30, 0); g.lineTo(rx + 12, 120); g.lineTo(rx + 26, 210); g.lineTo(rx - 4, 330 + random() * 120); g.lineTo(rx - 2, 200); g.lineTo(rx - 16, 110); g.fill();
      const left = random() < 0.5;
      g.beginPath(); g.moveTo(left ? 0 : 1024, 576); g.lineTo(left ? 190 : 834, 576); g.lineTo(left ? 120 : 904, 520); g.lineTo(left ? 60 : 964, 470); g.lineTo(left ? 0 : 1024, 380); g.fill();
      for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(100 + random() * 820, 60 + random() * 440, 8 + random() * 16, 5 + random() * 10, random() * 3, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'source-over';
    }
    const clothTexture = new THREE.CanvasTexture(cloth);
    clothTexture.colorSpace = THREE.SRGBColorSpace;
    const baseGlow = mix(0.62, 0.9, mood.warmth * 0.5 + 0.25);
    const clothMat = new THREE.MeshStandardMaterial({ map: clothTexture, emissive: '#ffffff', emissiveMap: clothTexture, emissiveIntensity: baseGlow, roughness: 1, side: THREE.DoubleSide, alphaTest: torn ? 0.5 : 0 });
    s.mesh(new THREE.PlaneGeometry(SWm, SHm), clothMat, [0, y0 + SHm / 2, 0]);

    // Frame.
    const frameColour = { wayang: '#4a2f1e', karagoz: '#d9d2c0', piying: '#a3211f', nursery: '#d9bd8a' }[tradition];
    const frame = s.material(frameColour, { roughness: 0.6 });
    const gold = s.material('#d9a936', { metalness: 0.7, roughness: 0.35 });
    const half = SWm / 2 + 0.035;
    for (const x of [-1, 1]) {
      s.box([0.07, top + 0.07, 0.07], [x * half, (top + 0.07) / 2, 0], frame);
      s.box([0.1, 0.06, 0.74], [x * half, 0.03, 0], frame);
      for (const z of [-1, 1]) s.rod([x * half, 0.5, 0], [x * half, 0.05, z * 0.33], 0.018, frame);
      if (tradition === 'wayang' || tradition === 'piying') s.lathe([[0.001, 0], [0.04, 0], [0.05, 0.03], [0.02, 0.06], [0.035, 0.1], [0.001, 0.16]], gold, [x * half, top + 0.07, 0]);
      s.box([0.07, 0.04, 0.2], [x * half, y0 - 0.19, 0.1], frame);
    }
    s.box([SWm + 0.14, 0.07, 0.07], [0, top + 0.035, 0], frame);
    s.box([SWm + 0.14, 0.07, 0.07], [0, y0 - 0.035, 0], frame);
    if (tradition === 'wayang') { const crest = s.mesh(new THREE.ConeGeometry(0.42, 0.2, 3, 1), frame, [0, top + 0.17, 0]); crest.scale.z = 0.08; s.ball([0.035, 0.035, 0.02], [0, top + 0.14, 0.02], gold, 10); }
    if (tradition === 'karagoz' || tradition === 'piying') {
      const valance = s.material(tradition === 'piying' ? '#e3b53a' : '#b8323a', { roughness: 0.9 });
      for (const z of [-0.042, 0.042]) { s.box([SWm, 0.12, 0.006], [0, top - 0.05, z], valance); for (let i = 0; i < 19; i++) s.cylinder(0.05, 0.05, 0.006, [-SWm / 2 + 0.05 + i * 0.1, top - 0.11, z], i % 2 ? valance : frame, 12).rotation.x = Math.PI / 2; }
    }
    if (tradition === 'nursery') for (let i = 0; i < 7; i++) s.box([0.02, 0.07, 0.085], [-0.84 + i * 0.28 + (random() - 0.5) * 0.06, top + 0.03, 0], s.material(['#d8343a', '#3a78c9', '#f2cf3a', '#3fa55a'][i % 4]));

    // Trunk of spares (or a ledge).
    const ty = y0 - 0.13, tz = 0.1;
    if (tradition === 'wayang') {
      const trunk = s.cylinder(0.055, 0.062, SWm + 0.1, [0, ty, tz], s.material('#a9b35a', { roughness: 0.6 }), 16); trunk.rotation.z = Math.PI / 2;
      for (let i = 0; i < 9; i++) { const ringMesh = s.ring(0.06, 0.004, [-0.88 + i * 0.22 + (random() - 0.5) * 0.08, ty, tz], s.material('#7d8a3a')); ringMesh.rotation.y = Math.PI / 2; }
      for (const x of [-1, 1]) s.cylinder(0.05, 0.05, 0.004, [x * (SWm / 2 + 0.052), ty, tz], s.material('#e9e3b8'), 16).rotation.z = Math.PI / 2;
    } else s.box([SWm + 0.1, 0.06, 0.13], [0, ty, tz], frame);

    // The puppets themselves, on the puppeteer's side.
    const rod = s.material(tradition === 'nursery' ? '#c9a878' : '#3a2a1c', { roughness: 0.5 });
    actors.forEach((actor, index) => {
      const texture = new THREE.CanvasTexture(actor.paint);
      texture.colorSpace = THREE.SRGBColorSpace;
      const w = PW * actor.size, h = PH * actor.size;
      const holder = new THREE.Group();
      const z = actor.spare ? tz - 0.02 + (index % 5) * 0.012 : 0.022 + index * 0.001;
      holder.position.set(actor.x, y0 + 0.012, z);
      holder.rotation.z = actor.lean;
      s.root.add(holder);
      const mesh = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, metalness: tradition === 'wayang' ? 0.35 : 0, emissive: coloured ? '#ffffff' : '#000000', emissiveMap: coloured ? texture : null, emissiveIntensity: 0.25 }), [0, h / 2, 0]);
      if (actor.flip) mesh.scale.x = -1;
      holder.add(mesh);
      const dir = actor.flip ? -1 : 1;
      const cx = dir * (CX - FW / 2) / FW * w;
      const spine = s.rod([cx, -0.2, 0.012], [cx, h * 0.72, 0.006], 0.007, rod, 0.004); holder.add(spine);
      if (!actor.spare) {
        const hx = dir * (actor.hand[0] - FW / 2) / FW * w, hyy = (1 - actor.hand[1] / FH) * h;
        holder.add(s.rod([hx + dir * 0.05, -0.24 - random() * 0.05, 0.05], [hx, hyy, 0.008], 0.0045, rod));
      }
    });

    // The lamp, hanging on the puppeteer's side.
    const lz = 0.42, ly = y0 + SHm * 0.52;
    const bronze = s.material('#8a6a32', { metalness: 0.75, roughness: 0.4 });
    s.rod([0, top + 0.07, 0], [0, top + 0.14, lz], 0.014, frame);
    s.rod([0, top + 0.14, lz], [0, ly + 0.1, lz], 0.004, bronze);
    const flameMat = new THREE.MeshStandardMaterial({ color: lamp, emissive: lamp, emissiveIntensity: 2.2, roughness: 0.4 });
    let flame: THREE.Mesh;
    if (tradition === 'wayang' || tradition === 'karagoz') {
      s.lathe([[0.001, 0], [0.05, 0.01], [0.085, 0.05], [0.09, 0.075], [0.07, 0.08], [0.04, 0.045], [0.001, 0.04]], bronze, [0, ly - 0.03, lz]);
      const spout = s.cylinder(0.012, 0.022, 0.1, [0, ly + 0.035, lz - 0.085], bronze, 10); spout.rotation.x = -1.0;
      for (const k of [-1, 1]) s.rod([k * 0.08, ly + 0.045, lz], [0, ly + 0.1, lz], 0.003, bronze);
      flame = s.mesh(new THREE.ConeGeometry(0.022, 0.085, 10), flameMat, [0, ly + 0.11, lz - 0.125]);
    } else {
      s.cylinder(0.05, 0.06, 0.04, [0, ly - 0.07, lz], bronze, 14);
      s.cylinder(0.045, 0.03, 0.03, [0, ly + 0.085, lz], bronze, 14);
      s.cylinder(0.05, 0.045, 0.12, [0, ly + 0.01, lz], new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false, roughness: 0.1 }), 16);
      for (const k of [-1, 1]) s.rod([k * 0.055, ly - 0.06, lz], [k * 0.055, ly + 0.09, lz], 0.003, bronze);
      flame = s.mesh(new THREE.ConeGeometry(0.02, 0.07, 10), flameMat, [0, ly - 0.005, lz]);
    }
    const halo = s.ball([0.16, 0.16, 0.16], flame.position.toArray() as [number, number, number], new THREE.MeshBasicMaterial({ color: lamp, transparent: true, opacity: 0.16, depthWrite: false }), 16);
    halo.castShadow = halo.receiveShadow = false; flame.castShadow = false;

    if (a.side === 'shadow') s.root.rotation.y = Math.PI;
    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        const f = (Math.sin(time * 13.1) + Math.sin(time * 7.3 + 1.3) + Math.sin(time * 23.7 + 0.4)) / 3;
        clothMat.emissiveIntensity = baseGlow * (1 + f * mix(0.03, 0.3, energy));
        flame.scale.set(1 + f * 0.15 * energy, 1 + f * mix(0.05, 0.45, energy), 1);
        halo.scale.setScalar(0.16 * (1 + f * 0.2 * energy));
      },
    });
  },
});
