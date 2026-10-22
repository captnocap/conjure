import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

/** Columns of brush-stroke marks that read as carved characters without being any real text. */
function glyphs(random: () => number, cols: number, rows: number, ink: string, paper: string | null) {
  const cell = 64;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell; canvas.height = rows * cell;
  const ctx = canvas.getContext('2d')!;
  if (paper) { ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.strokeStyle = ink; ctx.lineCap = 'round';
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const ox = c * cell + 10, oy = r * cell + 10, span = cell - 20;
    for (let k = 0; k < 6; k++) {
      ctx.lineWidth = 4 + random() * 3.5;
      const x0 = ox + random() * span, y0 = oy + random() * span, kind = random();
      ctx.beginPath(); ctx.moveTo(x0, y0);
      if (kind < 0.4) ctx.lineTo(ox + random() * span, y0 + (random() - 0.5) * 6);
      else if (kind < 0.75) ctx.lineTo(x0 + (random() - 0.5) * 6, oy + random() * span);
      else ctx.lineTo(Math.min(ox + span, x0 + random() * 24), Math.min(oy + span, y0 + 12 + random() * 16));
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    plan: choice('What form does the pavilion take?', {
      square: 'Four posts and a square roof with four flying corners.',
      hexagon: 'Six posts and a six-cornered roof, light and pointed.',
      double: 'An eight-sided pavilion with two tiers of upturned eaves, grand for its size.',
      thatch: 'A rustic round hut of bare poles under a conical thatch, a hermit\'s version.',
    }),
    roof: choice('What is the roof covered with, if it is tiled?', {
      grey: 'Charcoal-grey clay tile.',
      jade: 'Glazed jade-green tile.',
      amber: 'Glazed amber-yellow tile.',
      moss: 'Old tile gone green-brown with moss.',
    }),
    perch: choice('What does it stand on?', {
      boulder: 'A broad rough boulder at the water\'s edge.',
      terrace: 'A neat terrace of dressed stone with steps up to it.',
      stilts: 'A timber deck on posts, standing out over the water.',
      crag: 'A tall narrow crag, high above everything.',
    }),
    table: choice('What is on the stone table inside?', {
      wine: 'A wine jug and cups for two.',
      game: 'A board game left in the middle of play.',
      writing: 'An inkstone, a brush and a sheet of paper.',
      lamp: 'A single oil lamp.',
      leaves: 'Nothing but a few fallen leaves.',
    }),
    tablet: choice('What is the inscription tablet like?', {
      stele: 'A tall grey stele with columns of characters picked out in red.',
      tortoise: 'A stele rising from the back of a stone tortoise.',
      boards: 'No stone: a pair of painted couplet boards hang on the front posts.',
      fallen: 'A stele that has cracked and fallen, half its text face down.',
    }),
    company: choice('Who is there?', {
      nobody: 'Nobody. The seats are empty.',
      friends: 'Two friends in long robes sitting across the table.',
      gazer: 'One figure standing at the rail, looking out.',
      sleeper: 'Someone asleep along the bench, a jug tipped over beside them.',
    }),
    lanterns: noul('Are lanterns hung from the eave corners?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusk = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    const rustic = a.plan === 'thatch';
    const N = { square: 4, hexagon: 6, double: 8, thatch: 20 }[a.plan];
    const R = { square: 2.0, hexagon: 2.1, double: 2.5, thatch: 1.9 }[a.plan];
    const stone = new THREE.MeshStandardMaterial({ color: new THREE.Color('#878a82').lerp(new THREE.Color('#7f8a6c'), mood.wear * 0.4), roughness: 1, flatShading: true });
    const dressed = s.material('#b9b6a8', { roughness: 0.9 });
    const red = s.material(new THREE.Color('#a52c20').lerp(new THREE.Color('#d1382a'), mood.cheer * 0.6), { roughness: 0.6 });
    const timber = s.material('#6b4a30');
    const post = rustic ? timber : red;
    const roofTone = rustic ? '#b89a55' : { grey: '#3f4447', jade: '#3f8a6b', amber: '#c9962e', moss: '#5c6144' }[a.roof];
    const roofMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(roofTone).lerp(new THREE.Color('#6b6a55'), mood.wear * 0.3), roughness: rustic || a.roof === 'grey' || a.roof === 'moss' ? 0.9 : 0.35, side: THREE.DoubleSide, flatShading: rustic });
    const ridgeMat = s.material(rustic ? '#8f7640' : a.roof === 'grey' || a.roof === 'moss' ? '#2b2e30' : roofTone, { roughness: 0.5 });
    const corner = (k: number, rad: number): [number, number] => { const phi = Math.PI / N + (k * 2 * Math.PI) / N; return [Math.sin(phi) * rad, Math.cos(phi) * rad]; };

    // --- Perch ---
    const rock = (cx: number, cz: number, rr: number, hh: number, flat: number) => {
      const SEG = 22, RINGS = 9, ph = random() * 6.28;
      const pos: number[] = [], idx: number[] = [];
      for (let j = 0; j <= RINGS; j++) {
        const t = j / RINGS;
        const prof = Math.pow(Math.max(0, 1 - Math.pow(t, flat)), 0.35) + 0.25 * Math.pow(1 - t, 3);
        for (let i = 0; i <= SEG; i++) {
          const th = (i / SEG) * 6.283;
          const lump = 1 + 0.12 * Math.sin(2 * th + ph) + 0.08 * Math.sin(3 * th + ph * 2 + t * 4) + 0.06 * Math.sin(5 * th + ph * 3 - t * 6);
          const jit = i === SEG || t === 1 ? 0 : (random() - 0.5) * 0.14 * rr;
          const r = j === RINGS ? 0 : rr * prof * lump + (i === SEG ? 0 : jit);
          pos.push(cx + Math.sin(th) * r, t * hh, cz + Math.cos(th) * r);
        }
      }
      for (let j = 0; j <= RINGS; j++) { const b = j * (SEG + 1); pos[(b + SEG) * 3] = pos[b * 3]; pos[(b + SEG) * 3 + 2] = pos[b * 3 + 2]; }
      for (let j = 0; j < RINGS; j++) for (let i = 0; i < SEG; i++) { const p = j * (SEG + 1) + i, q = p + SEG + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      return s.mesh(g, stone);
    };
    let y0 = 0;
    const padR = R + 0.5;
    if (a.perch === 'boulder') {
      y0 = mix(1.5, 2.3, random());
      rock(0.6, 0, 4.9, y0 + 0.25, 7);
      rock(-3.6, 1.6, 1.6, y0 * 0.55, 3); rock(4.4, -1.8, 1.3, y0 * 0.4, 3);
    } else if (a.perch === 'crag') {
      y0 = mix(3.6, 5, random());
      rock(0.5, 0, 4.4, y0 + 0.25, 9);
      rock(-3.2, 1.2, 2.1, y0 * 0.6, 4); rock(3.9, -1.5, 1.7, y0 * 0.42, 3);
      const leaf = new THREE.MeshStandardMaterial({ color: '#4c7a3a', roughness: 1, flatShading: true });
      for (let k = 0; k < 16; k++) { const th = random() * 6.28, t = mix(0.25, 0.85, random()); s.mesh(new THREE.IcosahedronGeometry(mix(0.3, 0.6, random()), 0), leaf, [0.5 + Math.sin(th) * 4.1 * (1 - t * 0.15), y0 * t, Math.cos(th) * 4.1 * (1 - t * 0.15)]); }
    } else if (a.perch === 'terrace') {
      y0 = 1.1;
      s.cylinder(4.6, 4.8, y0, [0.5, y0 / 2, 0], dressed, 8).rotation.y = Math.PI / 8;
      s.cylinder(4.75, 4.75, 0.12, [0.5, y0 - 0.02, 0], s.material('#a5a294'), 8).rotation.y = Math.PI / 8;
      for (let k = 0; k < 4; k++) s.box([1.8, 0.28, 0.4], [-0.6, y0 - 0.14 - k * 0.27, 4.35 + k * 0.38], dressed);
    } else {
      y0 = 1.5;
      s.box([8.6, 0.16, 6.2], [0.6, y0 - 0.08, 0], s.material('#7d5e41'));
      for (let k = 0; k < 15; k++) s.box([0.03, 0.17, 6.2], [-3.6 + k * 0.6, y0 - 0.075, 0], s.material('#4f3a28'));
      for (const x of [-3.4, -0.7, 2.0, 4.6]) for (const z of [-2.8, 0, 2.8]) s.cylinder(0.11, 0.13, y0 + 0.5, [x, y0 / 2 - 0.25, z], timber, 8);
      for (const z of [-2.8, 2.8]) { s.rod([-3.4, 0.2, z], [-0.7, y0 - 0.2, z], 0.05, timber); s.rod([2.0, y0 - 0.2, z], [4.6, 0.2, z], 0.05, timber); }
    }

    // --- Platform, posts, seats ---
    const plinth = 0.3;
    s.cylinder(padR, padR + 0.08, plinth, [0, y0 + plinth / 2, 0], rustic ? s.material('#8a8474') : dressed, rustic ? 20 : N).rotation.y = rustic ? 0 : Math.PI / N;
    const floor = y0 + plinth;
    const postH = rustic ? 2.2 : 2.7;
    const posts = rustic ? 6 : N;
    const postAt = (k: number): [number, number] => { const phi = Math.PI / posts + (k * 2 * Math.PI) / posts; return [Math.sin(phi) * R * 0.92, Math.cos(phi) * R * 0.92]; };
    const frieze = s.material(rustic ? '#6b4a30' : '#2f6a6a');
    for (let k = 0; k < posts; k++) {
      const [x, z] = postAt(k), [x2, z2] = postAt(k + 1);
      s.cylinder(rustic ? 0.07 : 0.1, rustic ? 0.085 : 0.11, postH, [x, floor + postH / 2, z], post, 10);
      if (!rustic) s.cylinder(0.15, 0.17, 0.14, [x, floor + 0.07, z], dressed, 10);
      s.rod([x, floor + postH - 0.12, z], [x2, floor + postH - 0.12, z2], rustic ? 0.05 : 0.09, frieze);
      if (!rustic) s.rod([x, floor + postH - 0.42, z], [x2, floor + postH - 0.42, z2], 0.04, red);
      // Bench and rail on every side except the front (the side facing +z).
      const midZ = (z + z2) / 2, midX = (x + x2) / 2;
      const front = midZ > R * 0.6 && Math.abs(midX) < 0.4;
      if (!front) {
        s.rod([x, floor + 0.45, z], [x2, floor + 0.45, z2], 0.07, rustic ? timber : s.material('#7a3a2a'));
        s.rod([x, floor + 0.85, z], [x2, floor + 0.85, z2], 0.03, post);
        s.rod([midX, floor, midZ], [midX, floor + 0.85, midZ], 0.025, post);
      }
    }

    // --- Roof ---
    const roof = (sides: number, rad: number, eaveY: number, height: number, upturn: number) => {
      const A = sides >= 16 ? sides : sides * 10, M = 10;
      const half = Math.PI / sides;
      const pos: number[] = [], idx: number[] = [];
      const point = (phi: number, u: number): P3 => {
        let d = ((phi % (2 * half)) + 2 * half) % (2 * half); if (d > half) d -= 2 * half;
        const r = (rad * Math.cos(half)) / Math.cos(d) * u;
        const c = Math.max(0, (1 / Math.cos(d) - 1) / (1 / Math.cos(half) - 1));
        const y = eaveY + height * (Math.pow(Math.max(0, 1 - u), 2.2) * 0.8 + (1 - u) * 0.2) + upturn * Math.pow(u, 4) * Math.pow(c, 1.5) + (rustic ? Math.sin(u * 3.1) * 0.12 : 0);
        return [Math.sin(phi) * r, y, Math.cos(phi) * r];
      };
      for (let i = 0; i <= A; i++) for (let j = 0; j <= M; j++) pos.push(...point((i / A) * 2 * Math.PI, j / M));
      for (let i = 0; i < A; i++) for (let j = 0; j < M; j++) { const p = i * (M + 1) + j, q = p + M + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      s.mesh(g, roofMat);
      const tips: P3[] = [];
      if (sides < 16) for (let k = 0; k < sides; k++) {
        const phi = half + k * 2 * half;
        const line: P3[] = [];
        for (let j = 0; j <= 8; j++) { const p = point(phi, 0.06 + (j / 8) * 0.98); line.push([p[0], p[1] + 0.05, p[2]]); }
        s.tube(line, 0.07, ridgeMat);
        tips.push(line[8]);
      }
      return tips;
    };
    const eave = floor + postH - 0.05;
    let tips: P3[] = [];
    let apex = 0;
    if (a.plan === 'double') {
      tips = roof(8, R * 1.5, eave, 1.0, 0.75);
      for (let k = 0; k < 8; k++) { const [x, z] = corner(k, R * 0.5); s.cylinder(0.06, 0.06, 0.8, [x, eave + 1.25, z], red, 8); }
      s.cylinder(R * 0.5, R * 0.5, 0.25, [0, eave + 0.95, 0], frieze, 8).rotation.y = Math.PI / 8;
      roof(8, R * 0.95, eave + 1.6, 1.5, 0.55);
      apex = eave + 3.1;
    } else if (rustic) {
      roof(20, R * 1.45, eave - 0.25, 2.3, 0);
      apex = eave + 2.05;
    } else {
      tips = roof(N, R * 1.6, eave, a.plan === 'hexagon' ? 2.1 : 1.7, a.plan === 'square' ? 1.0 : 0.85);
      apex = eave + (a.plan === 'hexagon' ? 2.1 : 1.7);
    }
    if (rustic) s.mesh(new THREE.ConeGeometry(0.3, 0.6, 10), ridgeMat, [0, apex + 0.2, 0]);
    else { s.cylinder(0.12, 0.2, 0.3, [0, apex + 0.1, 0], ridgeMat, 10); s.ball([0.17, 0.2, 0.17], [0, apex + 0.42, 0], s.material('#c9a13a', { metalness: 0.6, roughness: 0.35 }), 12); s.mesh(new THREE.ConeGeometry(0.06, 0.3, 8), s.material('#c9a13a', { metalness: 0.6 }), [0, apex + 0.72, 0]); }

    const swing: THREE.Object3D[] = [];
    if (a.lanterns) {
      const hang: P3[] = tips.length ? tips : Array.from({ length: 4 }, (_u, k) => { const phi = k * 1.57 + 0.5; return [Math.sin(phi) * R * 1.3, eave + 0.05, Math.cos(phi) * R * 1.3] as P3; });
      const paper = new THREE.MeshStandardMaterial({ color: '#e8452c', emissive: '#ff6a2a', emissiveIntensity: mix(0.5, 2.6, dusk), roughness: 0.8 });
      hang.forEach((t, k) => {
        if (a.plan === 'double' && k % 2) return;
        const g = new THREE.Group(); g.position.set(t[0] * 0.93, t[1] - 0.05, t[2] * 0.93); s.root.add(g); swing.push(g);
        const add = (m: THREE.Mesh) => { m.removeFromParent(); g.add(m); };
        add(s.rod([0, 0, 0], [0, -0.3, 0], 0.008, s.material('#222222')));
        add(s.ball([0.15, 0.19, 0.15], [0, -0.48, 0], paper, 10));
        add(s.rod([0, -0.66, 0], [0, -0.85, 0], 0.012, s.material('#c9a13a')));
      });
    }

    // --- Table and stools ---
    s.cylinder(0.5, 0.5, 0.09, [0, floor + 0.72, 0], dressed, 20);
    s.cylinder(0.2, 0.3, 0.7, [0, floor + 0.35, 0], dressed, 12);
    const stools: P3[] = [[-0.9, floor, 0], [0.9, floor, 0], [0, floor, -0.9]];
    for (const p of stools) s.lathe([[0.001, 0], [0.16, 0], [0.22, 0.2], [0.16, 0.42], [0.001, 0.42]], dressed, p);
    const tt = floor + 0.765;
    if (a.table === 'wine') {
      s.lathe([[0.001, 0], [0.07, 0], [0.1, 0.1], [0.05, 0.2], [0.03, 0.3], [0.045, 0.32]], s.material('#e9e6dc', { roughness: 0.3 }), [0.08, tt, -0.12]);
      s.ring(0.06, 0.012, [0.19, tt + 0.16, -0.12], s.material('#e9e6dc'), Math.PI).rotation.z = -Math.PI / 2;
      for (const x of [-0.22, 0.25]) s.cylinder(0.045, 0.03, 0.05, [x, tt + 0.025, 0.12], s.material('#3f6fa8', { roughness: 0.3 }), 10);
    } else if (a.table === 'game') {
      s.box([0.55, 0.05, 0.55], [0, tt + 0.025, 0], s.material('#c9a45a'));
      const stonesOn: { at: P3; size: number; color: string }[] = [];
      for (let k = 0; k < 26; k++) stonesOn.push({ at: [(Math.floor(random() * 9) - 4) * 0.055, tt + 0.058, (Math.floor(random() * 9) - 4) * 0.055], size: 0.022, color: random() < 0.5 ? '#111111' : '#f4f2ea' });
      s.scatter(new THREE.SphereGeometry(1, 8, 6).scale(1, 0.45, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), stonesOn);
      for (const x of [-0.38, 0.38]) s.cylinder(0.07, 0.06, 0.06, [x, tt + 0.03, 0.2 * Math.sign(x)], s.material('#5a3a26'), 10);
    } else if (a.table === 'writing') {
      const sheet = s.box([0.5, 0.006, 0.34], [-0.05, tt + 0.004, 0.05], new THREE.MeshStandardMaterial({ map: glyphs(random, 5, 3, '#1c1c1c', '#f1ecdb'), roughness: 0.9 }));
      sheet.rotation.y = 0.2;
      s.box([0.16, 0.035, 0.11], [0.3, tt + 0.018, -0.2], s.material('#26282b'));
      s.rod([0.1, tt + 0.03, -0.3], [0.36, tt + 0.05, 0.02], 0.009, s.material('#7a5a2e'));
      s.box([0.04, 0.03, 0.04], [-0.33, tt + 0.015, 0.1], s.material('#7d8a7a'));
    } else if (a.table === 'lamp') {
      s.cylinder(0.09, 0.06, 0.04, [0, tt + 0.02, 0], s.material('#7a5a2e', { metalness: 0.4 }), 12);
      s.rod([0, tt + 0.03, 0], [0, tt + 0.18, 0], 0.012, s.material('#7a5a2e'));
      s.cylinder(0.06, 0.03, 0.03, [0, tt + 0.19, 0], s.material('#7a5a2e'), 10);
      s.ball([0.03, 0.06, 0.03], [0, tt + 0.25, 0], new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: '#ffad2e', emissiveIntensity: mix(1.2, 3.5, dusk) }), 8);
    } else for (let k = 0; k < 6; k++) s.box([0.1, 0.004, 0.035], [(random() - 0.5) * 0.7, tt + 0.003, (random() - 0.5) * 0.7], s.material(random() < 0.5 ? '#c4a23a' : '#a8562c')).rotation.y = random() * 3;

    // --- Company ---
    const robes = ['#d9d4c2', '#5a6f8c', '#7c8f7a', '#8a5a5a'];
    const person = (at: P3, turn: number, pose: 'sit' | 'stand' | 'lie') => {
      const g = new Sculpture(context);
      g.root.position.set(...at); g.root.rotation.y = turn; s.root.add(g.root);
      const robe = g.material(robes[Math.floor(random() * robes.length)]), skin = g.material('#d2a67e'), hair = g.material('#1a1a1c');
      if (pose === 'lie') {
        g.ball([0.24, 0.17, 0.75], [0, 0.17, 0], robe, 12);
        g.ball([0.11, 0.11, 0.12], [0, 0.22, 0.8], skin, 10); g.ball([0.06, 0.06, 0.06], [0, 0.32, 0.86], hair, 8);
        g.rod([0.1, 0.2, 0.4], [0.3, 0.05, 0.75], 0.06, robe);
        return;
      }
      const hgt = pose === 'sit' ? 0.62 : 1.38;
      g.cylinder(0.17, pose === 'sit' ? 0.36 : 0.3, hgt, [0, hgt / 2, 0], robe, 12);
      g.ball([0.21, 0.12, 0.17], [0, hgt, 0], robe, 10);
      g.ball([0.105, 0.115, 0.105], [0, hgt + 0.19, 0.01], skin, 12);
      g.ball([0.11, 0.09, 0.11], [0, hgt + 0.25, -0.03], hair, 10); g.ball([0.05, 0.06, 0.05], [0, hgt + 0.36, -0.03], hair, 8);
      for (const side of [-1, 1]) g.rod([side * 0.2, hgt - 0.04, 0], [side * 0.16, hgt - 0.38, 0.26], 0.075, robe, 0.09);
    };
    if (a.company === 'friends') { person([-0.9, floor + 0.3, 0], Math.PI / 2, 'sit'); person([0.9, floor + 0.3, 0], -Math.PI / 2, 'sit'); }
    else if (a.company === 'gazer') { const [x, z] = postAt(1); const [x2, z2] = postAt(2); person([(x + x2) / 2 * 0.72, floor, (z + z2) / 2 * 0.72], Math.atan2(x + x2, z + z2), 'stand'); }
    else if (a.company === 'sleeper') {
      const k = Math.floor(posts / 2); const [x, z] = postAt(k), [x2, z2] = postAt(k + 1);
      person([(x + x2) / 2 * 0.86, floor + 0.5, (z + z2) / 2 * 0.86], Math.atan2(x2 - x, z2 - z), 'lie');
      const jug = s.lathe([[0.001, 0], [0.07, 0], [0.1, 0.1], [0.05, 0.2], [0.03, 0.3], [0.045, 0.32]], s.material('#8a5a3a', { roughness: 0.4 }), [0.5, floor + 0.1, 0.7]);
      jug.rotation.z = Math.PI / 2 - 0.1; jug.rotation.y = random() * 3;
    }

    // --- Inscription ---
    const carved = (w: number, h: number, cols: number, rows: number, ink: string, paper: string) => new THREE.MeshStandardMaterial({ map: glyphs(random, cols, rows, ink, paper), roughness: 0.9 });
    const slabTone = '#8f938f';
    const sx = a.perch === 'crag' ? R + 1.05 : R + 1.55, sz = 1.35;
    if (a.tablet === 'boards') {
      const front = Array.from({ length: posts }, (_u, k) => postAt(k)).sort((p, q) => q[1] - p[1]).slice(0, 2);
      for (const [x, z] of front) {
        const n = new THREE.Vector3(x, 0, z).normalize();
        const board = s.box([0.3, 1.5, 0.04], [x + n.x * 0.14, floor + 1.45, z + n.z * 0.14], [timber, timber, timber, timber, carved(0.3, 1.5, 1, 5, '#d9b23a', '#3a2418'), timber] as unknown as THREE.Material);
        board.rotation.y = Math.atan2(n.x, n.z);
      }
      s.box([1.5, 0.42, 0.05], [0, eave - 0.32, R * 0.92 * Math.cos(Math.PI / posts) + 0.12], [timber, timber, timber, timber, carved(1.5, 0.42, 3, 1, '#e3c04a', '#1f3a4a'), timber] as unknown as THREE.Material);
    } else {
      const g = new Sculpture(context);
      g.root.position.set(sx, y0, sz); g.root.rotation.y = -0.35 + (random() - 0.5) * 0.2; s.root.add(g.root);
      const slab = new THREE.MeshStandardMaterial({ color: slabTone, roughness: 0.95 });
      const face = carved(0.9, 2.0, 3, 7, '#b3261c', slabTone);
      const mats = [slab, slab, slab, slab, face, slab] as unknown as THREE.Material;
      if (a.tablet === 'fallen') {
        const lower = g.box([0.95, 0.9, 0.2], [0, 0.6, 0], mats); lower.rotation.z = 0.06;
        g.box([1.2, 0.3, 0.5], [0, 0.15, 0], slab);
        const upper = g.box([0.95, 1.3, 0.2], [0.5, 0.12, 1.0], mats); upper.rotation.x = -Math.PI / 2 + 0.08; upper.rotation.z = 0.5;
        g.mesh(new THREE.DodecahedronGeometry(0.16, 0), stone, [-0.4, 0.1, 0.7]);
      } else {
        let baseY = 0.3;
        if (a.tablet === 'tortoise') {
          baseY = 0.55;
          g.ball([0.75, 0.32, 0.95], [0, 0.3, 0.1], stone, 10);
          g.ball([0.2, 0.18, 0.28], [0, 0.42, 1.1], stone, 8);
          for (const x of [-0.65, 0.65]) for (const z of [-0.45, 0.65]) g.ball([0.2, 0.12, 0.24], [x, 0.1, z], stone, 6);
        } else g.box([1.25, 0.3, 0.55], [0, 0.15, 0], slab);
        g.box([0.95, 2.1, 0.2], [0, baseY + 1.05, 0], mats);
        const cap = g.cylinder(0.475, 0.475, 0.2, [0, baseY + 2.1, 0], slab, 20); cap.rotation.x = Math.PI / 2; cap.scale.y = 1; cap.scale.z = 0.7;
      }
    }

    const amp = mix(0.01, 0.2, mood.energy), speed = mix(0.4, 2.2, mood.energy);
    return s.finish({ update: (_dt, time) => { swing.forEach((g, i) => { g.rotation.z = Math.sin(time * speed + i * 1.3) * amp; }); } });
  },
});
