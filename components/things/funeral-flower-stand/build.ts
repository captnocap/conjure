import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { panel, pick, write } from './lib';

const WORDS = {
  mother: 'BELOVED MOTHER', peace: 'REST IN PEACE', home: 'GONE HOME', pastor: 'OUR PASTOR', sympathy: 'DEEPEST SYMPATHY',
  class: 'CLASS OF 1974', brother: 'BROTHER & FRIEND', baby: 'OUR ANGEL', forever: 'FOREVER IN OUR HEARTS',
} as const;

const PALETTES = {
  'white-lilies': { main: ['#fbf8f0', '#f4efe2', '#ffffff'], accent: ['#fbf8f0', '#f6e9a8'], leaf: '#3f6a3a' },
  'red-roses': { main: ['#b3161e', '#c8262c', '#8f1018', '#fbf8f0'], accent: ['#b3161e', '#fbf8f0'], leaf: '#2f5a34' },
  'yellow-mums': { main: ['#f0c22a', '#f4d84a', '#e8a81e', '#fbf8f0'], accent: ['#f08a1e', '#f4e04a'], leaf: '#4a7a3a' },
  'bright-mixed': { main: ['#d93f87', '#f08a1e', '#f4e04a', '#7a4fc0', '#e8452d', '#fbf8f0'], accent: ['#f4e04a', '#d93f87'], leaf: '#3f7a3a' },
  'blue-white': { main: ['#2f6fd0', '#5a8fe0', '#fbf8f0', '#fbf8f0'], accent: ['#fbf8f0', '#2f6fd0'], leaf: '#3a6a44' },
  'pink-lavender': { main: ['#f2a6c0', '#e8c0e0', '#b89ad8', '#fbf8f0'], accent: ['#f2a6c0', '#fbf8f0'], leaf: '#5a8a5a' },
  silk: { main: ['#d8504a', '#e8e0c8', '#d8a8b8', '#c8b84a'], accent: ['#e8e0c8', '#d8504a'], leaf: '#4a8a5a' },
} as const;

export default defineThing({
  questions: {
    form: choice('What shape is the arrangement on the easel?', {
      spray: 'A tall standing spray: a diamond-shaped fan of blooms and long leaves.',
      wreath: 'A round wreath with an open centre.',
      heart: 'A solid heart packed with blooms.',
      'open-heart': 'An open heart outline, hollow in the middle.',
      cross: 'A cross of flowers.',
    }),
    flowers: choice('What are the flowers?', {
      'white-lilies': 'All white: lilies, roses and carnations, formal and still.',
      'red-roses': 'Deep red roses with a few white ones.',
      'yellow-mums': 'Yellow and gold chrysanthemums, cheerful in spite of themselves.',
      'bright-mixed': 'A loud mix of pink, orange, yellow and purple for a celebration of life.',
      'blue-white': 'Blue-dyed carnations and white, in a team\'s or a lodge\'s colours.',
      'pink-lavender': 'Soft pink and lavender, for someone young or gentle.',
      silk: 'Artificial silk flowers, slightly shiny, colours a little off, meant to last on a grave.',
    }),
    ribbon: choice('What do the gold letters on the satin ribbon say?', {
      mother: 'BELOVED MOTHER', peace: 'REST IN PEACE', home: 'GONE HOME', pastor: 'OUR PASTOR', sympathy: 'DEEPEST SYMPATHY', class: 'CLASS OF 1974',
      brother: 'BROTHER & FRIEND', baby: 'OUR ANGEL', forever: 'FOREVER IN OUR HEARTS',
    }),
    satin: choice('What colour is the ribbon?', {
      white: 'White satin.', purple: 'Royal purple.', red: 'Red.', black: 'Black.', blue: 'Pale blue.', gold: 'Gold lamé.',
    }),
    where: choice('Where is the stand now, and what has happened to it?', {
      service: 'At the service: upright and perfect, a florist\'s card tucked in.',
      graveside: 'At the graveside the day after: its legs pushed into a mound of fresh dirt, petals dropping.',
      'blown-over': 'Blown over by the wind and left lying, blooms scattered around it.',
      roadside: 'By the road where it happened: beside a small white cross with candles and a stuffed bear.',
      stripped: 'Weeks later: flowers gone or dead, bare green foam and wire, only the ribbon still bright.',
    }),
    beside: choice('What stands beside it?', {
      photo: 'A framed photograph on its own small easel.',
      lily: 'A potted peace lily in foil wrap.',
      second: 'A second, smaller arrangement on a shorter stand.',
      nothing: 'Nothing: it stands alone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stripped = a.where === 'stripped';
    const wilt = Math.min(1, mood.wear * (a.flowers === 'silk' ? 0.35 : 1) + (a.where === 'graveside' ? 0.2 : 0) + (stripped ? 0.6 : 0));
    const palette = PALETTES[a.flowers];
    const brown = new THREE.Color('#8a6a3e');
    const faded = (hex: string, extra = 0) => `#${new THREE.Color(hex).lerp(brown, Math.min(0.85, wilt * wilt * 0.75 + extra)).getHexString()}`;

    // Everything on the easel lives in one group so the whole stand can fall over.
    const stand = new THREE.Group();
    s.root.add(stand);
    const put = <T extends THREE.Object3D>(node: T) => { stand.add(node); return node; };
    const rod = (from: readonly [number, number, number], to: readonly [number, number, number], radius: number, material: THREE.Material) => { const mesh = s.rod(from, to, radius, material); stand.add(mesh); return mesh; };

    const scale = mix(0.85, 1.2, mood.density);
    const wire = s.material('#2f3a30', { metalness: 0.4, roughness: 0.5 });
    const apex: [number, number, number] = [0, 1.62, -0.06];
    rod(apex, [-0.36, 0, 0.2], 0.008, wire);
    rod(apex, [0.36, 0, 0.2], 0.008, wire);
    rod(apex, [0, 0, -0.55], 0.008, wire);
    rod([-0.2, 0.72, 0.085], [0.2, 0.72, 0.085], 0.007, wire);
    rod([-0.3, 0.27, 0.156], [0.3, 0.27, 0.156], 0.007, wire);
    rod([0, 0.72, 0.085], [0, 0.5, -0.38], 0.006, wire);
    for (const x of [-0.12, 0.12]) rod([x, 0.72, 0.085], [x, 0.76, 0.14], 0.007, wire);

    // ---- The form: which points of a jittered grid carry a bloom
    const inside = (x: number, y: number): boolean => {
      if (a.form === 'spray') { const t = (y + 0.68) / 1.36; return t > 0 && t < 1 && Math.abs(x) < 0.4 * Math.sin(Math.PI * t ** 0.8) ** 0.9; }
      if (a.form === 'wreath') { const r = Math.hypot(x, y); return r > 0.25 && r < 0.47; }
      if (a.form === 'cross') return (Math.abs(x) < 0.11 && Math.abs(y) < 0.62) || (Math.abs(y - 0.2) < 0.11 && Math.abs(x) < 0.38);
      const heart = (k: number) => { const hx = x / k, hy = (y + 0.06) / k; return (hx * hx + hy * hy - 1) ** 3 - hx * hx * hy * hy * hy < 0; };
      return a.form === 'heart' ? heart(0.42) : heart(0.46) && !heart(0.3);
    };
    const tilt = -0.2;
    const centre = new THREE.Vector3(0, 1.08, 0.16);
    const frame = new THREE.Group();
    frame.position.copy(centre); frame.rotation.x = tilt; frame.scale.setScalar(scale);
    put(frame);

    type Spot = { x: number; y: number; edge: [number, number] | null };
    const spots: Spot[] = [];
    const step = 0.085;
    for (let gy = -0.75; gy <= 0.75; gy += step) for (let gx = -0.55; gx <= 0.55; gx += step) {
      const x = gx + (random() - 0.5) * step * 0.6 + (Math.round(gy / step) % 2 ? step / 2 : 0), y = gy + (random() - 0.5) * step * 0.6;
      if (!inside(x, y)) continue;
      let ex = 0, ey = 0;
      for (let k = 0; k < 8; k++) { const dx = Math.cos(k * Math.PI / 4), dy = Math.sin(k * Math.PI / 4); if (!inside(x + dx * 0.1, y + dy * 0.1)) { ex += dx; ey += dy; } }
      spots.push({ x, y, edge: ex || ey ? [ex, ey] : null });
    }

    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, items: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; c: string }[], parent: THREE.Object3D) => {
      if (!items.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      const m = new THREE.Matrix4();
      items.forEach((item, i) => { m.compose(item.p, item.q, item.s); mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(item.c)); });
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
    };
    const Q = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
    const sheen = a.flowers === 'silk' ? 0.3 : 0.75;
    const petalMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: sheen, flatShading: true });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, flatShading: true, side: THREE.DoubleSide });

    // foam form behind the flowers (all you see once it is stripped)
    instanced(new THREE.BoxGeometry(0.1, 0.1, 0.05), s.material('#ffffff', { roughness: 1 }), spots.map((spot) => ({ p: new THREE.Vector3(spot.x, spot.y, -0.02), q: Q(0, 0, random()), s: new THREE.Vector3(1, 1, 1), c: pick(random, ['#4f8a5a', '#5a9464', '#467a50']) })), frame);

    // leaves radiate from the edge
    const leaves = spots.filter((spot) => spot.edge && random() < (stripped ? 0.25 : 0.8)).map((spot) => {
      const angle = Math.atan2(spot.edge![1], spot.edge![0]) + (random() - 0.5) * 0.5;
      const long = (a.form === 'spray' ? 0.3 : 0.17) * (0.7 + random() * 0.6);
      return { p: new THREE.Vector3(spot.x + Math.cos(angle) * long * 0.45, spot.y + Math.sin(angle) * long * 0.45 - wilt * 0.03, 0.0), q: Q(0, 0, angle - Math.PI / 2).multiply(Q(-0.25 - wilt * 0.5, 0, 0)), s: new THREE.Vector3(0.05, long, 0.012), c: faded(palette.leaf, random() * 0.15) };
    });
    instanced(new THREE.ConeGeometry(1, 1, 4), leafMat, leaves, frame);

    // blooms
    const keep = stripped ? 0.14 : 1;
    const focal = new THREE.Vector2(0, a.form === 'spray' ? -0.12 : a.form === 'cross' ? 0.2 : 0.3);
    const blooms: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; c: string }[] = [];
    const trumpets: typeof blooms = [];
    const fallen: { at: readonly [number, number, number]; size: number; color: string }[] = [];
    for (const spot of spots) {
      if (random() > keep) continue;
      const near = Math.hypot(spot.x - focal.x, spot.y - focal.y) < 0.2;
      const size = (near ? 0.058 : 0.046) * (0.8 + random() * 0.45) * mix(1, 0.72, wilt);
      const droop = wilt * (0.02 + random() * 0.06);
      const colour = faded(pick(random, near ? palette.accent : palette.main), random() * wilt * 0.4);
      if (wilt > 0.25 && random() < wilt * 0.35) { fallen.push({ at: [(random() - 0.5) * 0.9, 0.012, 0.2 + random() * 0.7], size: 0.03 + random() * 0.02, color: colour }); if (random() < 0.6) continue; }
      const p = new THREE.Vector3(spot.x, spot.y - droop, 0.04 + random() * 0.035 + (near ? 0.02 : 0));
      if ((near || random() < 0.16) && a.flowers !== 'yellow-mums') trumpets.push({ p, q: Q(Math.PI / 2 + (random() - 0.5) * 0.5 + wilt * 0.8, 0, random() * 6), s: new THREE.Vector3(size * 1.25, size * 1.2, size * 1.25), c: colour });
      else blooms.push({ p, q: Q(random() * 6, random() * 6, 0), s: new THREE.Vector3(size, size * 0.8, size), c: colour });
    }
    instanced(new THREE.IcosahedronGeometry(1, 1), petalMat, blooms, frame);
    instanced(new THREE.ConeGeometry(1, 1, 6, 1, true), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: sheen, flatShading: true, side: THREE.DoubleSide }), trumpets, frame);
    // gladiolus spikes on a spray
    if (a.form === 'spray' && !stripped) {
      const spikes: typeof blooms = [];
      for (let i = 0; i < 9; i++) {
        const angle = Math.PI / 2 + (i - 4) * 0.36 + (random() - 0.5) * 0.1 + (i - 4) * wilt * 0.08;
        const reach = (i === 4 ? 0.86 : 0.62 - Math.abs(i - 4) * 0.04) * (1 - wilt * 0.12);
        const colour = faded(pick(random, palette.main));
        for (let k = 0; k < 6; k++) { const d = 0.3 + (reach - 0.3) * k / 5; spikes.push({ p: new THREE.Vector3(Math.cos(angle) * d * 0.75, Math.sin(angle) * d - 0.05, 0.03), q: Q(random(), random(), 0), s: new THREE.Vector3(1, 1, 1).multiplyScalar(0.04 - k * 0.0045), c: colour }); }
      }
      instanced(new THREE.IcosahedronGeometry(1, 0), petalMat, spikes, frame);
    }
    // baby's breath
    if (!stripped && a.flowers !== 'silk') {
      const dots = spots.filter(() => random() < 0.3).map((spot) => ({ p: new THREE.Vector3(spot.x + (random() - 0.5) * 0.06, spot.y + (random() - 0.5) * 0.06, 0.09 + random() * 0.03), q: Q(0, 0, 0), s: new THREE.Vector3(1, 1, 1).multiplyScalar(0.011), c: faded('#ffffff') }));
      instanced(new THREE.IcosahedronGeometry(1, 0), petalMat, dots, frame);
    }

    // ---- Satin ribbon: a diagonal sash with gold letters, a bow and tails
    const satinHex = { white: '#f7f4ea', purple: '#5a2a8a', red: '#b3161e', black: '#1c1a1e', blue: '#a8c8e8', gold: '#d9b84a' }[a.satin];
    const ink = a.satin === 'gold' ? '#3a2a10' : a.satin === 'white' || a.satin === 'blue' ? '#b08a1e' : '#e8c85a';
    const satin = s.material(satinHex, { roughness: 0.3, metalness: a.satin === 'gold' ? 0.5 : 0.05 });
    const text = WORDS[a.ribbon];
    const sashLength = a.form === 'cross' ? 0.78 : 1.02;
    const sash = panel(sashLength, 0.14, (ctx, w, h) => {
      ctx.fillStyle = satinHex; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, h * 0.08, w, h * 0.12);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, h * 0.82, w, h * 0.1);
      write(ctx, text, w / 2, h * 0.52, h * 0.62, ink, { max: w * 0.92, font: 'bold', face: "Georgia, 'Times New Roman', serif" });
    }, { px: 512, roughness: 0.35 });
    sash.castShadow = true;
    sash.position.set(0, a.form === 'cross' ? 0.2 : -0.02, 0.135);
    sash.rotation.z = a.form === 'cross' ? 0 : -0.5 + (random() - 0.5) * 0.1;
    frame.add(sash);
    const end = new THREE.Vector3(-sashLength / 2, 0, 0).applyEuler(sash.rotation).add(sash.position);
    for (const side of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), satin); loop.scale.set(0.09, 0.055, 0.03); loop.position.set(end.x + side * 0.075, end.y + 0.03, 0.14); loop.rotation.z = side * 0.5; loop.castShadow = true; frame.add(loop);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.006), satin); tail.position.set(end.x + side * 0.05, end.y - 0.22, 0.13); tail.rotation.z = side * 0.14 + (random() - 0.5) * 0.1; tail.castShadow = true; frame.add(tail);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), satin); knot.position.set(end.x, end.y + 0.02, 0.15); frame.add(knot);

    // florist's card on a pick
    if (a.where === 'service') {
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.004), s.material('#fbf8f0')); card.position.set(0.24, -0.42, 0.14); card.rotation.z = 0.2; frame.add(card);
    }

    // ---- What happened to it
    if (a.where === 'blown-over') {
      stand.rotation.set(0, 0, 0);
      stand.rotation.x = Math.PI / 2 - 0.12;
      stand.rotation.z = (random() - 0.5) * 0.6;
      stand.position.set(0, 0.12, -0.7);
      for (let i = 0; i < 16; i++) fallen.push({ at: [(random() - 0.5) * 1.6, 0.03, 0.4 + random() * 1.3], size: 0.035 + random() * 0.025, color: faded(pick(random, palette.main)) });
    } else {
      stand.rotation.z = (random() - 0.5) * 0.05 * (1 + mood.wear * 3);
    }
    if (fallen.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.8, flatShading: true }), fallen.map((item) => ({ ...item, at: [item.at[0], item.at[1] + item.size * 0.3, item.at[2]] as const })));

    if (a.where === 'graveside') {
      s.ball([0.75, 0.2, 1.25], [0, -0.02, -0.75], s.material('#8a4a2e', { roughness: 1 }), 16);
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#7a3f26', { roughness: 1, flatShading: true }), Array.from({ length: 30 }, () => ({ at: [(random() - 0.5) * 1.5, 0.04, -0.75 + (random() - 0.5) * 2.4] as const, size: 0.03 + random() * 0.05 })));
      s.rod([0.5, 0, 0.35], [0.5, 0.38, 0.35], 0.006, s.material('#c9cdd0', { metalness: 0.5 }));
      s.box([0.2, 0.11, 0.01], [0.5, 0.4, 0.35], s.material('#d5d9dc', { metalness: 0.4 }));
    } else if (a.where === 'roadside') {
      const white = s.material('#f4f1e6');
      const cx = -0.75;
      s.box([0.09, 1.05, 0.05], [cx, 0.52, 0.05], white).rotation.z = (random() - 0.5) * 0.12;
      s.box([0.6, 0.09, 0.05], [cx, 0.78, 0.055], white);
      const bear = s.material(pick(random, ['#b98a5a', '#e8d9c0', '#8a6a4a']), { roughness: 1 });
      s.ball([0.1, 0.12, 0.09], [cx + 0.25, 0.12, 0.3], bear, 10); s.ball([0.075, 0.075, 0.07], [cx + 0.25, 0.28, 0.31], bear, 10);
      for (const dx of [-0.06, 0.06]) { s.ball([0.03, 0.03, 0.02], [cx + 0.25 + dx, 0.35, 0.31], bear, 8); s.ball([0.035, 0.035, 0.06], [cx + 0.25 + dx * 1.6, 0.08, 0.39], bear, 8); }
      for (let i = 0; i < 4; i++) { const x = cx - 0.2 + i * 0.16 + (random() - 0.5) * 0.05, z = 0.42 + random() * 0.15; s.cylinder(0.035, 0.035, 0.16, [x, 0.08, z], new THREE.MeshStandardMaterial({ color: pick(random, ['#f6e6c0', '#d8504a', '#8fb7d4']), roughness: 0.2, emissive: '#ffb14a', emissiveIntensity: mix(0.2, 0.9, Math.abs(mood.daylight - 0.5) * 2) }), 10); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#8f8a80', { flatShading: true }), Array.from({ length: 14 }, () => ({ at: [(random() - 0.5) * 2.0, 0.02, 0.7 + random() * 0.4] as const, size: 0.02 + random() * 0.03 })));
    }

    // ---- Companion
    const bx = 0.78;
    if (a.beside === 'photo') {
      const gold = s.material('#c9a23a', { metalness: 0.5, roughness: 0.4 });
      for (const x of [-0.16, 0.16]) s.rod([bx + x, 0, 0.25], [bx, 1.05, 0.02], 0.012, s.material('#5a3a22'));
      s.rod([bx, 0, -0.3], [bx, 1.05, 0.02], 0.012, s.material('#5a3a22'));
      s.box([0.36, 0.02, 0.05], [bx, 0.52, 0.16], s.material('#5a3a22'));
      const picture = s.box([0.36, 0.46, 0.025], [bx, 0.77, 0.12], gold); picture.rotation.x = -0.2;
      const photo = panel(0.28, 0.38, (ctx, w, h) => { ctx.fillStyle = '#d9d2c4'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#5a4a3e'; ctx.beginPath(); ctx.arc(w / 2, h * 0.38, w * 0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(w / 2, h * 0.98, w * 0.38, h * 0.34, 0, 0, 7); ctx.fill(); }, { px: 128 });
      photo.position.set(bx, 0.775, 0.136); photo.rotation.x = -0.2; s.root.add(photo);
    } else if (a.beside === 'lily') {
      s.cylinder(0.14, 0.1, 0.2, [bx, 0.1, 0.2], s.material(pick(random, ['#b3161e', '#d9b84a', '#5a2a8a', '#2f8a4f']), { metalness: 0.4, roughness: 0.3 }), 12);
      for (let i = 0; i < 9; i++) { const angle = i * 0.7 + random(), lean = 0.12 + random() * 0.16; const leaf = s.mesh(new THREE.ConeGeometry(0.05, 0.42, 4), s.material(faded('#2f6a34')), [bx + Math.cos(angle) * lean, 0.38, 0.2 + Math.sin(angle) * lean]); leaf.scale.z = 0.25; leaf.rotation.set(Math.sin(angle) * 0.5, -angle, -Math.cos(angle) * 0.5); }
      for (let i = 0; i < 3; i++) { s.rod([bx, 0.2, 0.2], [bx + (i - 1) * 0.07, 0.68 - wilt * 0.12, 0.2 + (random() - 0.5) * 0.1], 0.005, s.material('#3f6a3a')); const spathe = s.mesh(new THREE.ConeGeometry(0.035, 0.12, 5), s.material(faded('#fbf8f0')), [bx + (i - 1) * 0.07, 0.73 - wilt * 0.12, 0.2]); spathe.scale.z = 0.4; }
    } else if (a.beside === 'second') {
      for (const x of [-0.2, 0.2]) s.rod([bx + x, 0, 0.3], [bx, 0.95, 0.05], 0.007, wire);
      s.rod([bx, 0, -0.25], [bx, 0.95, 0.05], 0.007, wire);
      const basket = s.cylinder(0.17, 0.11, 0.16, [bx, 0.55, 0.16], s.material('#b08a4a'), 12); basket.rotation.x = -0.15;
      const posy = Array.from({ length: stripped ? 5 : 26 }, () => { const angle = random() * 6.3, r = Math.sqrt(random()) * 0.2; return { at: [bx + Math.cos(angle) * r, 0.68 + (0.2 - r) * 0.5 - wilt * 0.04, 0.17 + Math.sin(angle) * r * 0.8] as const, size: 0.035 + random() * 0.02, color: faded(pick(random, palette.main)) }; });
      s.scatter(new THREE.IcosahedronGeometry(1, 1), petalMat.clone(), posy);
    }

    return s.finish();
  },
});
