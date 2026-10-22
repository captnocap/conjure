import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { strands } from './head';

const CLOWNS = {
  whiteface: 'A whiteface: elegant all-white face, thin arched brows, small red mouth, a pointed cone hat.',
  auguste: 'An auguste: pink face, huge white eyes and mouth, big grin, tufts of wild hair at the sides.',
  tramp: 'A sad tramp: stubble-grey jaw, white downturned mouth, drooping brows, a battered little hat.',
  pierrot: 'A pierrot: moon-white, one black teardrop, tiny dark lips, a black skullcap.',
  sinister: 'A sinister clown: black diamond eyes and a far-too-wide grin full of teeth.',
} as const;
const PALETTES = {
  classic: 'Classic circus: white, lipstick red, black, a touch of blue.',
  pastel: 'Soft pastels: pink, baby blue, lilac, lemon.',
  carnival: 'Loud primaries: red, yellow, blue and green.',
  mono: 'Black, white and greys only, like a silent film.',
  sickly: 'Sickly green, purple and dried-blood red.',
} as const;
const PAINT: Record<keyof typeof PALETTES, string[]> = {
  classic: ['#f4f1ea', '#d6202a', '#161616', '#2a56b8', '#e8b62c'],
  pastel: ['#f6efe9', '#f08fab', '#8fc7e6', '#b99be0', '#f3dc86'],
  carnival: ['#ffffff', '#e3262e', '#1f66d1', '#f6c81e', '#2aa84a'],
  mono: ['#f5f5f2', '#141414', '#4d4d4d', '#8f8f8f', '#d6d6d6'],
  sickly: ['#e6e9d6', '#a51f26', '#5d2a82', '#6c9a2c', '#1c1c1c'],
};

function paintEgg(type: keyof typeof CLOWNS, pal: string[], wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const c = canvas.getContext('2d')!;
  const cx = 256, cy = 215, flesh = '#efb597', white = pal[0], lip = pal[1], ink = type === 'sinister' || type === 'pierrot' ? '#121212' : pal[2];
  const oval = (x: number, y: number, rx: number, ry: number, fill: string, turn = 0) => { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2); c.fill(); };
  const arc = (x: number, y: number, r: number, from: number, to: number, stroke: string, width: number, squash = 1) => { c.strokeStyle = stroke; c.lineWidth = width; c.lineCap = 'round'; c.beginPath(); c.ellipse(x, y, r, r * squash, 0, from, to); c.stroke(); };
  c.fillStyle = type === 'auguste' || type === 'tramp' ? flesh : white;
  c.fillRect(0, 0, 1024, 512);
  if (type === 'whiteface') {
    for (const k of [1, -1]) { arc(cx + k * 70, cy - 40, 34, Math.PI * 1.15, Math.PI * 1.85, ink, 7, 1.2); oval(cx + k * 68, cy - 28, 9, 14, ink); oval(cx + k * 105, cy + 40, 15, 15, lip); c.fillStyle = pal[3]; c.beginPath(); c.moveTo(cx + k * 68, cy - 2); c.lineTo(cx + k * 78, cy + 22); c.lineTo(cx + k * 58, cy + 22); c.fill(); }
    oval(cx, cy + 86, 30, 13, lip); oval(cx, cy + 20, 13, 13, lip);
  } else if (type === 'auguste') {
    for (const k of [1, -1]) { oval(cx + k * 68, cy - 42, 48, 60, white); oval(cx + k * 66, cy - 32, 11, 15, '#141414'); arc(cx + k * 68, cy - 78, 30, Math.PI * 1.1, Math.PI * 1.9, '#141414', 8, 0.8); oval(cx + k * 120, cy + 36, 18, 18, pal[3]); }
    oval(cx, cy + 82, 112, 58, white); arc(cx, cy + 58, 76, Math.PI * 0.12, Math.PI * 0.88, lip, 20, 0.75); oval(cx, cy + 16, 32, 32, lip);
  } else if (type === 'tramp') {
    oval(cx, cy + 105, 170, 105, '#56514d'); oval(cx, cy + 88, 78, 44, white);
    arc(cx, cy + 122, 48, Math.PI * 1.2, Math.PI * 1.8, '#141414', 9, 0.7);
    for (const k of [1, -1]) { oval(cx + k * 66, cy - 36, 30, 34, white); oval(cx + k * 66, cy - 30, 9, 12, '#141414'); c.strokeStyle = '#141414'; c.lineWidth = 9; c.beginPath(); c.moveTo(cx + k * 34, cy - 92); c.lineTo(cx + k * 104, cy - 66); c.stroke(); }
    oval(cx, cy + 16, 26, 26, lip);
  } else if (type === 'pierrot') {
    for (const k of [1, -1]) { arc(cx + k * 68, cy - 48, 32, Math.PI * 1.2, Math.PI * 1.8, ink, 6, 0.6); oval(cx + k * 68, cy - 30, 12, 9, ink); oval(cx + k * 112, cy + 46, 20, 14, pal[1] + '55'); }
    c.fillStyle = ink; c.beginPath(); c.moveTo(cx + 68, cy - 10); c.quadraticCurveTo(cx + 92, cy + 52, cx + 68, cy + 58); c.quadraticCurveTo(cx + 44, cy + 52, cx + 68, cy - 10); c.fill();
    oval(cx, cy + 86, 15, 10, ink); oval(cx, cy + 20, 5, 5, '#b9b4ac');
  } else {
    for (const k of [1, -1]) { c.fillStyle = ink; c.beginPath(); c.moveTo(cx + k * 68, cy - 112); c.lineTo(cx + k * 100, cy - 34); c.lineTo(cx + k * 68, cy + 34); c.lineTo(cx + k * 36, cy - 34); c.fill(); oval(cx + k * 68, cy - 34, 9, 9, pal[3]); }
    c.fillStyle = lip; c.beginPath(); c.moveTo(cx - 150, cy + 22); c.quadraticCurveTo(cx, cy + 190, cx + 150, cy + 22); c.quadraticCurveTo(cx, cy + 96, cx - 150, cy + 22); c.fill();
    c.fillStyle = '#f6f1dc'; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(cx + i * 22 - 10, cy + 84 - Math.abs(i) * 7); c.lineTo(cx + i * 22 + 10, cy + 84 - Math.abs(i) * 7); c.lineTo(cx + i * 22, cy + 116 - Math.abs(i) * 8); c.fill(); }
    oval(cx, cy + 18, 15, 15, ink);
  }
  // Signature and registration number on the back of the shell.
  c.fillStyle = '#5b5348'; c.font = 'italic bold 40px serif'; c.textAlign = 'center';
  c.fillText('No.' + Math.round(100 + wear * 870), 768, 240);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    clown: choice('What kind of clown does this kit make?', CLOWNS),
    palette: choice('What colours are the greasepaints?', PALETTES),
    worn: score('How worn down are the sticks?', ['New and full length in their gold wrappers', 'Used but healthy', 'Half gone', 'Worn to stubs after forty seasons']),
    nose: choice('Where is the red nose?', {
      box: 'Nestled in its own little box.',
      mirror: 'Hooked on the edge of the mirror, waiting.',
      egg: 'Balanced on the painted egg’s face.',
      loose: 'Rolled away across the table.',
    }),
    mirror: choice('What is the mirror like?', {
      round: 'A round swivel shaving mirror on a brass stand.',
      bulbs: 'A dressing-room mirror ringed with glowing bulbs.',
      cracked: 'A cracked hand mirror propped against the tin lid.',
    }),
    story: choice('What moment is this?', {
      before: 'Before the show: laid out in order with a folded towel.',
      during: 'Mid-makeup: sticks out on the table, a smeared rag, powder in the air.',
      retired: 'Retired: closed down for good, a black ribbon and a dried flower left on the tin.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = PAINT[a.palette];
    const W = 0.25, D = 0.15, H = 0.032, T = 0.004;
    const tin = s.material('#31524d', { metalness: 0.65, roughness: 0.4 });
    const tinInside = s.material('#c9c1a6', { metalness: 0.6, roughness: 0.45 });
    const brass = s.material('#cfa544', { metalness: 0.85, roughness: 0.3 });
    const glassy = new THREE.MeshStandardMaterial({ color: '#d5e3e6', metalness: 1, roughness: 0.06 });

    // Tin and lid.
    s.box([W, T, D], [0, T / 2, 0], tin);
    for (const z of [-1, 1]) s.box([W, H, T], [0, H / 2, z * (D - T) / 2], tin);
    for (const x of [-1, 1]) s.box([T, H, D], [x * (W - T) / 2, H / 2, 0], tin);
    s.box([W - 2 * T, 0.002, D - 2 * T], [0, T + 0.001, 0], tinInside);
    const lid = new THREE.Group();
    lid.position.set(0, H, -D / 2);
    lid.rotation.x = -1.85;
    s.root.add(lid);
    lid.add(s.box([W, T, D], [0, T / 2, D / 2], tin));
    const inner = s.label('GREASEPAINT', W * 0.86, D * 0.5, [0, -0.0008, D * 0.55], '#c8a13a', '#1e3632');
    inner.rotation.x = Math.PI / 2;
    lid.add(inner);
    const sub = s.label(`Nos. 1-${5 + Math.floor(random() * 7)}  CARMINE & WHITE`, W * 0.8, D * 0.14, [0, -0.0008, D * 0.2], '#e9dfc0', '#1e3632');
    sub.rotation.x = Math.PI / 2;
    lid.add(sub);

    // Sticks: gold-wrapped, colour showing at the working end.
    const wrap = s.material('#d9bb62', { metalness: 0.5, roughness: 0.4 });
    const stick = (x: number, y: number, z: number, turn: number, tint: string, fraction: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.y = turn;
      const full = 0.105, length = full * fraction, bare = Math.min(length * 0.45, 0.022);
      const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0082, length - bare, 12), wrap);
      paper.rotation.x = Math.PI / 2; paper.position.z = -(length - bare) / 2;
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0074, bare, 12), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.35 }));
      core.rotation.x = Math.PI / 2; core.position.z = bare / 2;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.008, 12), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.5 }));
      band.rotation.x = Math.PI / 2; band.position.z = -(length - bare) * 0.8;
      for (const m of [paper, core, band]) { m.castShadow = true; g.add(m); }
      s.root.add(g);
    };
    const out = a.story === 'during' ? 3 : 0;
    const count = 10;
    for (let i = 0; i < count; i++) {
      const fraction = mix(1, 0.24, a.worn) * mix(0.75, 1.08, random());
      const tint = pal[i % pal.length];
      if (i >= count - out) stick(mix(-0.1, 0.08, random()), 0.0085, D / 2 + mix(0.04, 0.09, random()), random() * 6.3, tint, fraction);
      else stick(-W / 2 + 0.02 + i * (W - 0.04) / (count - 1), T + 0.0105, 0.045 - (1 - fraction) * 0.02, Math.PI + (random() - 0.5) * 0.12, tint, Math.min(fraction, 1));
    }

    // The registered face: a painted egg on its stand.
    const ex = W / 2 + 0.085, ez = 0.045;
    const wood = s.material('#5a3a24', { roughness: 0.45 });
    s.lathe([[0, 0], [0.034, 0], [0.036, 0.006], [0.012, 0.014], [0.009, 0.04], [0.02, 0.05], [0.026, 0.066], [0.022, 0.067], [0, 0.058]], wood, [ex, 0, ez]);
    const eggGeo = new THREE.SphereGeometry(1, 40, 28);
    const ep = eggGeo.attributes.position;
    for (let i = 0; i < ep.count; i++) { const y = ep.getY(i), k = y > 0 ? 1 - 0.2 * y * y : 1; ep.setXYZ(i, ep.getX(i) * 0.031 * k, y * (y > 0 ? 0.045 : 0.037), ep.getZ(i) * 0.031 * k); }
    eggGeo.computeVertexNormals();
    const egg = s.mesh(eggGeo, new THREE.MeshStandardMaterial({ map: paintEgg(a.clown, pal, random()), roughness: 0.35 }), [ex, 0.094, ez]);
    egg.rotation.y = -0.2 + (random() - 0.5) * 0.2;
    const onEgg = <T extends THREE.Object3D>(node: T) => { egg.add(node); return node; };
    const felt = (tint: string) => new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9 });
    if (a.clown === 'whiteface') { const hat = onEgg(new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.05, 16), felt(pal[0]))); hat.position.set(0.004, 0.064, 0); hat.rotation.z = -0.12; hat.castShadow = true; for (let i = 0; i < 3; i++) { const pom = onEgg(new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), felt(pal[1]))); pom.position.set(0.003 - i * 0.0005, 0.05 + i * 0.012, 0.014 - i * 0.004); } }
    if (a.clown === 'tramp') { const brim = onEgg(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.003, 20), felt('#2b2927'))); brim.position.set(0, 0.036, 0); brim.rotation.z = 0.2; const crown = onEgg(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.02, 16), felt('#2b2927'))); crown.position.set(-0.003, 0.046, 0); crown.rotation.z = 0.2; crown.castShadow = true; }
    if (a.clown === 'pierrot') { const cap = onEgg(new THREE.Mesh(new THREE.SphereGeometry(0.0275, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.36), felt('#141414'))); cap.scale.y = 1.5; cap.position.y = 0.004; }
    if (a.clown === 'auguste' || a.clown === 'sinister') {
      const hairs: Parameters<typeof strands>[0][number][] = [];
      for (const k of [1, -1]) for (let i = 0; i < 46; i++) { const up = mix(-0.2, 0.9, random()); hairs.push({ at: new THREE.Vector3(k * 0.028 * Math.cos(up * 0.9), 0.006 + up * 0.026, (random() - 0.6) * 0.022), dir: new THREE.Vector3(k, 0.35 + up * 0.8, (random() - 0.5) * 0.8), length: mix(0.014, 0.028, random()), width: 0.004 }); }
      onEgg(strands(hairs, felt(a.clown === 'sinister' ? pal[3] : a.palette === 'mono' ? '#8f8f8f' : '#e8751f')));
    }

    // The nose.
    const noseMat = new THREE.MeshStandardMaterial({ color: a.palette === 'mono' ? '#2a2a2a' : a.palette === 'sickly' ? '#8f1d24' : '#e3222c', roughness: 0.75 });
    const nx = -0.085, nz = D / 2 + 0.065;
    const boxMat = s.material('#efe9d8');
    s.box([0.062, 0.004, 0.062], [nx, 0.002, nz], boxMat);
    for (const k of [-1, 1]) { s.box([0.062, 0.03, 0.003], [nx, 0.015, nz + k * 0.03], boxMat); s.box([0.003, 0.03, 0.062], [nx + k * 0.03, 0.015, nz], boxMat); }
    s.box([0.05, 0.004, 0.05], [nx, 0.006, nz], s.material('#c8b9d8'));
    const nose = s.ball([0.024, 0.024, 0.024], [nx, 0.03, nz], noseMat, 22);
    let mirrorTop: [number, number, number] = [0, 0, 0];

    // Mirror.
    const mx = -W / 2 - 0.09, mz = -0.04;
    const spark: THREE.MeshStandardMaterial[] = [];
    if (a.mirror === 'round') {
      s.cylinder(0.045, 0.055, 0.012, [mx, 0.006, mz], brass, 24);
      s.rod([mx, 0.01, mz], [mx, 0.11, mz], 0.005, brass);
      const frame = s.ring(0.075, 0.006, [mx, 0.19, mz], brass);
      frame.rotation.set(-0.18, 0.35, 0);
      const face = s.cylinder(0.073, 0.073, 0.004, [mx, 0.19, mz], glassy, 32);
      face.rotation.set(Math.PI / 2 - 0.18, 0, -0.35); face.rotation.order = 'YXZ'; face.rotation.set(Math.PI / 2 - 0.18, 0.35, 0);
      mirrorTop = [mx + 0.03, 0.262, mz + 0.012];
    } else if (a.mirror === 'bulbs') {
      const frame = s.box([0.2, 0.25, 0.016], [mx, 0.135, mz], s.material('#e9e3d3'));
      frame.rotation.set(-0.12, 0.35, 0); frame.rotation.order = 'YXZ';
      const face = s.box([0.15, 0.2, 0.004], [mx + 0.004, 0.136, mz + 0.01], glassy);
      face.rotation.copy(frame.rotation);
      const warm = new THREE.Color('#ffe9a8');
      for (let i = 0; i < 12; i++) {
        const along = i < 4 ? [-0.088, -0.09 + i * 0.06] : i < 8 ? [0.088, -0.09 + (i - 4) * 0.06] : [-0.066 + (i - 8) * 0.044, 0.112];
        const lit = random() > mood.wear * 0.5;
        const m = new THREE.MeshStandardMaterial({ color: lit ? warm : '#8d8a7c', emissive: warm, emissiveIntensity: lit ? mix(0.5, 1.6, mood.daylight < 0.5 ? 1 : 0.6) : 0 });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), m);
        bulb.position.set(along[0], along[1], 0.014);
        frame.add(bulb);
        if (lit) spark.push(m);
      }
      mirrorTop = [mx + 0.05, 0.272, mz - 0.002];
    } else {
      const hand = new THREE.Group();
      hand.position.set(mx + 0.05, 0, mz + 0.03);
      hand.rotation.set(-0.55, 0.3, 0.12); hand.rotation.order = 'YXZ';
      s.root.add(hand);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.008, 28), s.material('#7a5a3a'));
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.15;
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.009, 28), glassy);
      face.rotation.x = Math.PI / 2; face.position.set(0, 0.15, 0.001);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.1, 10), s.material('#7a5a3a'));
      grip.position.y = 0.045;
      hand.add(rim, face, grip);
      for (const m of [rim, grip]) m.castShadow = true;
      const crack = new THREE.MeshStandardMaterial({ color: '#2a2f33' });
      for (let i = 0; i < 4; i++) { const line = new THREE.Mesh(new THREE.BoxGeometry(0.0012, mix(0.03, 0.06, random()), 0.001), crack); line.position.set(0.012, 0.16, 0.0062); line.rotation.z = i * 1.4 + random(); line.geometry.translate(0, 0.02, 0); hand.add(line); }
      mirrorTop = [mx + 0.065, 0.165, mz - 0.035];
    }
    if (a.nose === 'mirror') nose.position.set(...mirrorTop);
    else if (a.nose === 'egg') { nose.position.set(ex + Math.sin(egg.rotation.y) * 0.036, 0.097, ez + Math.cos(egg.rotation.y) * 0.036); nose.scale.setScalar(0.013); }
    else if (a.nose === 'loose') nose.position.set(0.06 + random() * 0.06, 0.024, D / 2 + 0.1 + random() * 0.03);

    // Powder sock with its halo of dust.
    const px = 0.03, pz = D / 2 + 0.06;
    const sock = s.material('#f1ece0');
    s.ball([0.034, 0.027, 0.034], [px, 0.025, pz], sock, 18);
    s.cylinder(0.008, 0.012, 0.012, [px + 0.008, 0.052, pz], s.material('#b23a3a'), 10);
    const tail = s.cylinder(0.016, 0.008, 0.035, [px + 0.018, 0.068, pz], sock, 10); tail.rotation.z = -0.5;
    const dusty = a.story === 'during' ? 1 : a.story === 'retired' ? 0.15 : 0.45;
    s.cylinder(0.05 + dusty * 0.03, 0.05 + dusty * 0.03, 0.001, [px, 0.0006, pz], new THREE.MeshStandardMaterial({ color: '#fbf8f0', roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }), 24);
    s.scatter(new THREE.SphereGeometry(1, 5, 4), sock, Array.from({ length: Math.round(10 + dusty * 40) }, () => { const t = random() * 6.3, r = 0.03 + random() * 0.09 * dusty + 0.02; return { at: [px + Math.cos(t) * r, 0.0012, pz + Math.sin(t) * r] as [number, number, number], size: mix(0.001, 0.003, random()) }; }));

    if (a.story === 'before') {
      s.box([0.11, 0.014, 0.075], [W / 2 + 0.075, 0.007, D / 2 + 0.085], s.material('#e8e2d2'));
      s.box([0.112, 0.003, 0.012], [W / 2 + 0.075, 0.0155, D / 2 + 0.1], s.material(pal[1]));
    } else if (a.story === 'during') {
      const rag = s.ball([0.06, 0.012, 0.045], [W / 2 + 0.07, 0.008, D / 2 + 0.09], s.material('#e3dccb'), 14);
      rag.rotation.y = random();
      for (let i = 0; i < 5; i++) s.ball([0.012 + random() * 0.01, 0.003, 0.008], [W / 2 + 0.07 + (random() - 0.5) * 0.07, 0.019, D / 2 + 0.09 + (random() - 0.5) * 0.04], new THREE.MeshStandardMaterial({ color: pal[(i + 1) % pal.length], roughness: 0.6 }), 8).rotation.y = random() * 3;
    } else {
      const ribbon = s.material('#141416');
      s.box([0.02, H + 0.004, D + 0.004], [0.06, H / 2, 0], ribbon);
      for (const k of [1, -1]) { const loop = s.ring(0.014, 0.004, [0.06 + k * 0.014, H + 0.006, D / 2 + 0.002], ribbon); loop.scale.z = 0.5; }
      s.rod([-0.11, H + 0.012, 0.02], [-0.03, H + 0.008, 0.06], 0.0016, s.material('#6b6a3a'));
      s.ball([0.012, 0.008, 0.012], [-0.115, H + 0.014, 0.018], s.material('#8a4a52'), 10);
    }

    return s.finish({
      update: (_dt, time) => { spark.forEach((m, i) => { m.emissiveIntensity = 1.1 + Math.sin(time * (2 + i * 0.37) * mix(0.3, 3, mood.energy)) * 0.25 * mood.energy; }); },
    });
  },
});
