import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const WORDS = {
  child: ['LILY', 'AGE 6'],
  parent: ['MARCUS', 'OUR DAD'],
  everyone: ['EXIT 9', 'ALL OF US'],
  dog: ['BISCUIT', 'GOOD DOG'],
  stranger: ['UNKNOWN', 'WE STOPPED'],
  city: ['HERE WAS', 'A CITY'],
} as const;
const BLOOMS = { wild: ['#f4f1e6', '#f2d43a', '#e6e0f2'], roses: ['#c2262e', '#a51d2a', '#d8434a'], sunflowers: ['#f2c21f', '#e9a81a', '#f6d44a'], plastic: ['#ff3fa0', '#2fd0e8', '#ffe02a', '#ff6a1a'], lilies: ['#f6f3ea', '#f0e2e6', '#e9e6d6'] } as const;

export default defineThing({
  questions: {
    remembers: choice('Who or what does it commemorate?', {
      child: 'A child, by first name and age.',
      parent: 'A father, named by his children.',
      everyone: 'A whole community that lived off one exit.',
      dog: 'A dog who walked the road with them.',
      stranger: 'A stranger they found and never knew.',
      city: 'Not a person: the city itself.',
    }),
    tended: choice('How recently was it tended?', {
      today: 'This morning: fresh flowers in water and a candle burning.',
      season: 'Some weeks ago: the flowers have drooped and browned, the candle is a stub.',
      years: 'Not for years: dry stalks, a leaning marker, moss, and wild flowers seeding themselves among the stones.',
      disturbed: 'Something knocked it about: the marker is down, the jar is tipped, stones have rolled away.',
    }),
    marker: choice('What carries the painted words?', {
      cross: 'Two planks nailed into a cross.',
      board: 'One wide board on a stake.',
      roadsign: 'A round road sign on its pole, painted over white.',
      wheel: 'A steering wheel wired to a post above a small plank.',
    }),
    offering: choice('What was left at its foot?', {
      shoes: 'A pair of small shoes, set side by side.',
      toys: 'A toy car and a soft rabbit.',
      photo: 'A framed photograph propped against the stones.',
      cups: 'A bottle and two tin cups, one turned over.',
      collar: 'A collar with a tag and an empty bowl.',
      nothing: 'Nothing but the stones.',
    }),
    flowers: choice('What flowers were brought?', {
      wild: 'Roadside daisies and buttercups in a jam jar.',
      roses: 'Dark red roses.',
      sunflowers: 'Sunflowers.',
      plastic: 'Bright plastic flowers that never fade.',
      lilies: 'White lilies.',
    }),
    size: score('How big is the heap?', ['A dozen stones, one person\'s work', 'A knee-high cairn', 'A waist-high mound built by many hands over years']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const old = a.tended === 'years', knocked = a.tended === 'disturbed', fresh = a.tended === 'today';
    const wear = Math.max(mood.wear, old ? 0.8 : 0.2);
    const Rb = mix(0.36, 0.85, a.size), Hc = mix(0.22, 0.85, a.size);

    // Stones: three lumpy shapes, instanced, each its own grey.
    const rockGeo = () => { const g = new THREE.DodecahedronGeometry(1, 1); const p = g.attributes.position; const seen = new Map<string, number>(); for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(2)},${p.getY(i).toFixed(2)},${p.getZ(i).toFixed(2)}`; if (!seen.has(key)) seen.set(key, 0.8 + random() * 0.4); const k = seen.get(key)!; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return g; };
    const greys = ['#8f8c84', '#a19c90', '#7c7a75', '#b0a898', '#6f6c68', '#99907f'];
    const mossTint = new THREE.Color('#6f8a4a');
    const count = Math.round(mix(14, 80, a.size));
    const stones: { pos: THREE.Vector3; r: number }[] = [];
    for (let i = 0; i < count; i++) {
      const rr = Rb * Math.sqrt(random()) * (knocked && i % 6 === 0 ? 1.5 : 1), t = random() * 6.28;
      const h = Math.max(0, Hc * (1 - rr / Rb));
      const r = mix(0.07, 0.15, random()) * mix(1, 1.25, a.size);
      stones.push({ pos: new THREE.Vector3(Math.cos(t) * rr, Math.min(h, h * (0.5 + random() * 0.5)) + r * 0.45, Math.sin(t) * rr), r });
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let k = 0; k < 3; k++) {
      const mine = stones.filter((_, i) => i % 3 === k);
      const mesh = new THREE.InstancedMesh(rockGeo(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), mine.length);
      mine.forEach((st, i) => {
        e.set(random() * 6, random() * 6, random() * 6);
        m4.compose(st.pos, q.setFromEuler(e), new THREE.Vector3(st.r * (0.9 + random() * 0.5), st.r * (0.6 + random() * 0.3), st.r * (0.9 + random() * 0.4)));
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, new THREE.Color(greys[Math.floor(random() * greys.length)]).lerp(mossTint, random() < wear * 0.6 ? 0.25 + random() * 0.4 : 0));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    const topY = Hc + 0.04;

    // Hubcaps leaned into the heap.
    const chrome = s.material('#c9cdd0', { metalness: 0.85, roughness: wear > 0.6 ? 0.55 : 0.25 });
    const caps = 2 + Math.round(mood.density * 3);
    for (let i = 0; i < caps; i++) {
      const t = -0.9 + (i / Math.max(1, caps - 1)) * 3.9 + (random() - 0.5) * 0.3, rr = Rb * (0.78 + random() * 0.2);
      const g = new THREE.Group();
      const r = 0.17 + random() * 0.03;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.03, 20), chrome); disc.rotation.x = Math.PI / 2; g.add(disc);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.34, 0.05, 12), chrome); hub.rotation.x = Math.PI / 2; hub.position.z = 0.012; g.add(hub);
      for (let k = 0; k < 6; k++) { const slot = new THREE.Mesh(new THREE.BoxGeometry(r * 0.16, r * 0.3, 0.012), s.material('#3a3d40')); const tt = (k / 6) * 6.283; slot.position.set(Math.cos(tt) * r * 0.66, Math.sin(tt) * r * 0.66, 0.012); slot.rotation.z = tt + Math.PI / 2; g.add(slot); }
      g.traverse((n) => { n.castShadow = true; });
      const flat = knocked && i % 2 === 0;
      g.position.set(Math.sin(t) * rr, flat ? 0.02 : r * 0.93, Math.cos(t) * rr);
      g.rotation.order = 'YXZ'; g.rotation.y = t; g.rotation.x = flat ? -Math.PI / 2 : -0.35 - random() * 0.2;
      s.root.add(g);
    }

    // The marker and its hand-painted words.
    const [line1, line2] = WORDS[a.remembers];
    const painted = (text: string, w: number, h: number, base: string, ink: string) => {
      const c = document.createElement('canvas'); c.width = 384; c.height = Math.max(48, Math.round((384 * h) / w));
      const x = c.getContext('2d')!;
      x.fillStyle = base; x.fillRect(0, 0, c.width, c.height);
      x.strokeStyle = 'rgba(60,40,24,0.25)'; x.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const y = random() * c.height; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(120, y + random() * 8 - 4, 260, y + random() * 8 - 4, 384, y + random() * 6 - 3); x.stroke(); }
      x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
      const size = Math.min(c.height * 0.7, (384 / text.length) * 1.35);
      x.font = `bold ${size}px sans-serif`;
      const step = Math.min(size * 0.72, 350 / text.length);
      [...text].forEach((ch, i) => { x.save(); x.translate(192 + (i - (text.length - 1) / 2) * step, c.height / 2 + (random() - 0.5) * size * 0.14); x.rotate((random() - 0.5) * 0.16); x.globalAlpha = old ? 0.55 + random() * 0.3 : 0.95; x.fillText(ch, 0, 0); x.restore(); });
      x.globalAlpha = 0.9; for (let i = 0; i < 3; i++) x.fillRect(60 + random() * 260, c.height * 0.7, 3, c.height * 0.3 * random());
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
    };
    const woodHex = old ? '#8f8778' : '#a9855a';
    const wood = s.material(woodHex, { roughness: 1 });
    const mk = new THREE.Group();
    const M = <T extends THREE.Object3D>(m: T) => { mk.add(m); return m; };
    const board = (text: string, w: number, h: number, y: number, tilt: number, base = woodHex, ink = '#f4f1e6') => {
      const b = M(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.025), [wood, wood, wood, wood, painted(text, w, h, base, ink), wood]));
      b.position.set(0, y, 0.035); b.rotation.z = tilt; b.castShadow = true; return b;
    };
    const post = mix(1.0, 1.5, a.size);
    if (a.marker === 'cross') {
      M(s.box([0.09, post, 0.03], [0, post / 2, 0], wood));
      board(line1, 0.72, 0.15, post * 0.74, (random() - 0.5) * 0.08);
      board(line2, 0.42, 0.11, post * 0.74 - 0.2, (random() - 0.5) * 0.14);
      for (const dx of [-0.02, 0.02]) M(s.cylinder(0.008, 0.008, 0.01, [dx, post * 0.74, 0.05], s.material('#2a2a2a'), 6)).rotation.x = Math.PI / 2;
    } else if (a.marker === 'board') {
      M(s.box([0.07, post * 0.85, 0.04], [0, post * 0.425, -0.01], wood));
      board(line1, 0.8, 0.24, post * 0.78, (random() - 0.5) * 0.1);
      board(line2, 0.62, 0.16, post * 0.78 - 0.24, (random() - 0.5) * 0.1);
    } else if (a.marker === 'roadsign') {
      M(s.cylinder(0.025, 0.025, post + 0.2, [0, (post + 0.2) / 2, 0], s.material('#8d9494', { metalness: 0.6 }), 8));
      const face = painted(line1, 0.5, 0.5, '#e9e6da', '#1f1f1f');
      const disc = M(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 28), [s.material('#b3261e'), face, s.material('#8d9494')]));
      disc.rotation.x = Math.PI / 2; disc.rotation.y = Math.PI / 2; disc.position.set(0, post + 0.05, 0.035); disc.castShadow = true;
      M(s.ring(0.31, 0.022, [0, post + 0.05, 0.045], s.material('#b3261e')));
      board(line2, 0.5, 0.13, post - 0.4, (random() - 0.5) * 0.12);
    } else {
      M(s.box([0.07, post, 0.05], [0, post / 2, 0], wood));
      const rim = s.material('#1f1f20', { roughness: 0.6 });
      M(s.ring(0.19, 0.022, [0, post + 0.02, 0.05], rim));
      for (const t of [0.52, 2.62, -1.57]) M(s.rod([0, post + 0.02, 0.05], [Math.cos(t) * 0.18, post + 0.02 + Math.sin(t) * 0.18, 0.05], 0.014, rim));
      M(s.cylinder(0.05, 0.05, 0.03, [0, post + 0.02, 0.06], rim, 12)).rotation.x = Math.PI / 2;
      board(line1, 0.6, 0.16, post * 0.62, (random() - 0.5) * 0.1);
      board(line2, 0.5, 0.12, post * 0.62 - 0.19, (random() - 0.5) * 0.12);
    }
    // A ribbon tied round the post.
    const ribbon = s.material(mood.cheer > 0.5 ? '#f2c21f' : '#7a2a3a', { side: THREE.DoubleSide, roughness: 0.8 });
    const tails: THREE.Object3D[] = [];
    M(s.cylinder(0.05, 0.05, 0.04, [0, post * 0.5, 0], ribbon, 8));
    for (const dx of [-1, 1]) { const g = new THREE.Group(); g.position.set(dx * 0.04, post * 0.5, 0.03); const strip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.004), ribbon); strip.position.y = -0.15; g.add(strip); g.rotation.z = dx * 0.25; mk.add(g); tails.push(g); }
    mk.position.set(0, Hc * 0.35, -Rb * 0.25);
    if (knocked) { mk.rotation.set(-1.25, 0.5, 0.1); mk.position.set(Rb * 0.5, Hc * 0.25 + 0.05, -Rb * 0.9); }
    else mk.rotation.set(old ? -0.12 : -0.03, (random() - 0.5) * 0.2, old ? 0.2 + random() * 0.12 : (random() - 0.5) * 0.06);
    s.root.add(mk);

    // Flowers: a jar at the front, and the state of them tells the time.
    const palette = BLOOMS[a.flowers];
    const stay = a.flowers === 'plastic';
    const droop = stay ? 0 : fresh ? 0.05 : a.tended === 'season' ? 0.7 : 1;
    const jx = -Rb * 0.45, jz = Rb * 0.95;
    const jar = new THREE.Group(); jar.position.set(jx, 0, jz);
    const J = <T extends THREE.Object3D>(m: T) => { jar.add(m); return m; };
    J(s.mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.14, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#cfe3e6', roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide }), [0, 0.07, 0]));
    if (fresh) J(s.cylinder(0.052, 0.05, 0.08, [0, 0.045, 0], s.material('#7fa8b8', { roughness: 0.2 }), 12));
    const stemMat = s.material(droop > 0.5 ? '#8a7a4a' : '#4f8a3a', { roughness: 0.9 });
    const stems = a.flowers === 'sunflowers' ? 3 : 5 + Math.round(mood.density * 4);
    const brown = new THREE.Color('#6b5234');
    for (let i = 0; i < stems; i++) {
      const t = (i / stems) * 6.28 + random(), lean = 0.08 + random() * 0.12, h = (a.flowers === 'sunflowers' ? 0.55 : 0.32) + random() * 0.14;
      const mid: P = [Math.cos(t) * lean * 0.6, 0.12 + h * 0.6, Math.sin(t) * lean * 0.6];
      const tip: P = [Math.cos(t) * (lean + droop * 0.16), 0.12 + h * (1 - droop * 0.55), Math.sin(t) * (lean + droop * 0.16)];
      J(s.rod([0, 0.04, 0], mid, 0.005, stemMat)); J(s.rod(mid, tip, 0.005, stemMat));
      const colour = new THREE.Color(palette[i % palette.length]).lerp(brown, droop * 0.75);
      const headMat = new THREE.MeshStandardMaterial({ color: colour, roughness: stay ? 0.3 : 0.8 });
      const size = (a.flowers === 'sunflowers' ? 0.075 : a.flowers === 'lilies' ? 0.05 : 0.036) * (1 - droop * 0.3);
      const head = new THREE.Group(); head.position.set(...tip);
      if (a.flowers === 'roses') { const bud = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), headMat); bud.scale.y = 1.2; head.add(bud); }
      else if (a.flowers === 'lilies') { for (let k = 0; k < 5; k++) { const petal = new THREE.Mesh(new THREE.ConeGeometry(size * 0.45, size * 2, 4), headMat); const tt = (k / 5) * 6.283; petal.position.set(Math.cos(tt) * size * 0.6, size * 0.5, Math.sin(tt) * size * 0.6); petal.rotation.set(Math.sin(tt) * 0.9, 0, -Math.cos(tt) * 0.9); head.add(petal); } }
      else { const disc = new THREE.Mesh(new THREE.CylinderGeometry(size, size, size * 0.25, 10), headMat); head.add(disc); const eye = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 8, 6), new THREE.MeshStandardMaterial({ color: a.flowers === 'sunflowers' ? '#3a2616' : '#e9b82a', roughness: 0.9 })); eye.scale.y = 0.5; eye.position.y = size * 0.15; head.add(eye); }
      head.rotation.set(Math.sin(t) * (0.5 + droop * 1.6), 0, -Math.cos(t) * (0.5 + droop * 1.6));
      head.traverse((n) => { n.castShadow = true; });
      jar.add(head);
    }
    if (knocked) { jar.rotation.z = 1.45; jar.position.y = 0.06; }
    s.root.add(jar);
    // Fallen petals.
    if (droop > 0.3) { const pts: { at: P; size: number; color: string }[] = []; for (let i = 0; i < 16; i++) pts.push({ at: [jx + (random() - 0.5) * 0.5, 0.004, jz + (random() - 0.3) * 0.4], size: 0.012 + random() * 0.01, color: `#${new THREE.Color(palette[i % palette.length]).lerp(brown, 0.6).getHexString()}` }); const g = new THREE.SphereGeometry(1, 6, 4); g.scale(1, 0.2, 1.4); s.scatter(g, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), pts); }

    // Candles on a flat stone.
    let flame: THREE.MeshStandardMaterial | null = null;
    const cx = Rb * 0.5, cz = Rb * 0.9;
    s.ball([0.17, 0.035, 0.13], [cx, 0.03, cz], s.material('#8a877f', { roughness: 1, flatShading: true }), 8);
    const wax = s.material('#efe6cf', { roughness: 0.5 });
    const candleH = fresh ? 0.13 : a.tended === 'season' ? 0.04 : 0.02;
    for (const [dx, dz, k] of [[0, 0, 1], [0.09, 0.03, 0.7], [-0.08, 0.02, 0.5]] as const) {
      s.cylinder(0.02, 0.022, candleH * k, [cx + dx, 0.06 + (candleH * k) / 2, cz + dz], wax, 10);
      s.cylinder(0.035, 0.04, 0.008, [cx + dx, 0.062, cz + dz], wax, 10);
      if (fresh) { flame ??= new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffa02a', emissiveIntensity: mix(1.6, 3.2, mood.warmth) }); const f = s.mesh(new THREE.ConeGeometry(0.012, 0.045, 6), flame, [cx + dx, 0.06 + candleH * k + 0.028, cz + dz]); f.castShadow = false; }
    }

    // The offering, front and centre.
    const oz = Rb + 0.22;
    if (a.offering === 'shoes') {
      const colour = s.material(['#c9364a', '#3d7fc9', '#e9a0b8', '#e8c53a'][Math.floor(random() * 4)], { roughness: 0.8 });
      const white = s.material('#eeeae0', { roughness: 0.7 });
      for (const dx of [-0.055, 0.055]) {
        const g = new THREE.Group(); g.position.set(dx + 0.02, 0, oz); g.rotation.y = dx * 2.5 + (knocked ? random() * 2 : 0);
        const add = (m: THREE.Mesh) => { g.add(m); return m; };
        add(s.box([0.07, 0.016, 0.17], [0, 0.008, 0], white));
        add(s.ball([0.036, 0.03, 0.045], [0, 0.04, 0.045], white, 10));
        add(s.box([0.066, 0.05, 0.1], [0, 0.04, -0.03], colour));
        add(s.box([0.07, 0.014, 0.03], [0, 0.068, 0.0], white));
        add(s.mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.03, 10, 1, true), s.material('#3a2e2a', { side: THREE.DoubleSide }), [0, 0.075, -0.04]));
        s.root.add(g);
      }
    } else if (a.offering === 'toys') {
      const red = s.material('#d8362c', { roughness: 0.4, metalness: 0.2 });
      s.box([0.08, 0.035, 0.17], [-0.12, 0.035, oz], red); s.box([0.07, 0.03, 0.08], [-0.12, 0.065, oz - 0.01], s.material('#9fc4d8', { roughness: 0.2 }));
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) s.cylinder(0.02, 0.02, 0.014, [-0.12 + dx * 0.043, 0.02, oz + dz * 0.05], s.material('#161616'), 10).rotation.z = Math.PI / 2;
      const fur = s.material('#d9d2c4', { roughness: 1 });
      const rx = 0.12;
      s.ball([0.06, 0.07, 0.055], [rx, 0.07, oz], fur, 10); s.ball([0.05, 0.048, 0.05], [rx, 0.17, oz + 0.01], fur, 10);
      for (const dx of [-1, 1]) { s.ball([0.016, 0.07, 0.012], [rx + dx * 0.025, 0.26, oz], fur, 8).rotation.z = -dx * 0.25; s.ball([0.025, 0.02, 0.04], [rx + dx * 0.04, 0.02, oz + 0.05], fur, 8); s.ball([0.008, 0.008, 0.008], [rx + dx * 0.02, 0.18, oz + 0.055], s.material('#141414'), 6); }
    } else if (a.offering === 'photo') {
      const g = new THREE.Group(); g.position.set(0.02, 0.13, oz - 0.1); g.rotation.x = -0.4;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.02), s.material('#3a2a1e')); frame.castShadow = true; g.add(frame);
      const c = document.createElement('canvas'); c.width = 64; c.height = 84; const x = c.getContext('2d')!;
      x.fillStyle = '#c9c0a8'; x.fillRect(0, 0, 64, 84); x.fillStyle = '#7a8a90'; x.fillRect(0, 0, 64, 40);
      x.fillStyle = '#4a3e36'; for (const [px, r] of [[22, 9], [40, 11], [31, 6]]) { x.beginPath(); x.arc(px, 46 - r, r, 0, 7); x.fill(); x.fillRect(px - r, 46, r * 2, 40); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.22), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 })); pic.position.z = 0.011; g.add(pic);
      s.root.add(g);
    } else if (a.offering === 'cups') {
      s.cylinder(0.035, 0.04, 0.2, [0, 0.1, oz], s.material('#3f5a34', { roughness: 0.2 }), 12); s.cylinder(0.014, 0.03, 0.08, [0, 0.24, oz], s.material('#3f5a34', { roughness: 0.2 }), 10);
      const tin = new THREE.MeshStandardMaterial({ color: '#b9bdb8', metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide });
      s.mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.07, 12, 1, true), tin, [-0.13, 0.035, oz + 0.03]);
      s.mesh(new THREE.CylinderGeometry(0.034, 0.04, 0.07, 12), tin, [0.13, 0.035, oz + 0.05]);
    } else if (a.offering === 'collar') {
      s.ring(0.075, 0.012, [-0.1, 0.014, oz], s.material('#b3352a', { roughness: 0.8 })).rotation.x = Math.PI / 2;
      s.cylinder(0.02, 0.02, 0.004, [-0.1, 0.012, oz + 0.09], s.material('#d9b84a', { metalness: 0.8, roughness: 0.3 }), 12);
      s.mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.05, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#8fa3b0', metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), [0.13, 0.025, oz + 0.02]);
      s.cylinder(0.075, 0.075, 0.006, [0.13, 0.004, oz + 0.02], s.material('#8fa3b0', { metalness: 0.6 }), 16);
    }

    // What grows when nobody comes.
    const tuftN = Math.round((old ? 90 : 14) + wear * 40);
    const blade = new THREE.ConeGeometry(0.012, 0.3, 4); blade.translate(0, 0.15, 0);
    const grass = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), tuftN);
    for (let i = 0; i < tuftN; i++) {
      const t = random() * 6.28, rr = Rb * (0.5 + random() * 0.85);
      e.set((random() - 0.5) * 0.7, random() * 6, (random() - 0.5) * 0.7);
      const k = 0.5 + random() * (old ? 1.5 : 0.8);
      m4.compose(new THREE.Vector3(Math.cos(t) * rr, Math.max(0, Hc * (1 - rr / Rb)) * 0.6, Math.sin(t) * rr), q.setFromEuler(e), new THREE.Vector3(k, k, k));
      grass.setMatrixAt(i, m4); grass.setColorAt(i, new THREE.Color(['#5f8a3c', '#7a9a45', '#4d7a34', '#9aa04a'][i % 4]));
    }
    grass.castShadow = true; s.root.add(grass);
    if (old) {
      const wildPts: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < 26; i++) { const t = random() * 6.28, rr = Rb * (0.4 + random() * 0.9), y = Math.max(0, Hc * (1 - rr / Rb)) * 0.6 + 0.2 + random() * 0.2; wildPts.push({ at: [Math.cos(t) * rr, y, Math.sin(t) * rr], size: 0.022 + random() * 0.018, color: ['#f4f1e6', '#f2d43a', '#c9a0e6', '#e96a8a'][i % 4] }); s.rod([Math.cos(t) * rr, y - 0.3, Math.sin(t) * rr], [Math.cos(t) * rr, y, Math.sin(t) * rr], 0.004, s.material('#5f8a3c')); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), wildPts);
    }
    void topY;

    const breeze = mix(0.03, 0.3, mood.energy);
    return s.finish({
      footprint: Rb + 0.35,
      update: (_dt, time) => {
        tails.forEach((g, i) => { g.rotation.x = Math.sin(time * 2.2 + i * 1.7) * breeze; });
        if (flame) flame.emissiveIntensity = mix(1.6, 3.2, mood.warmth) * (0.85 + 0.15 * Math.sin(time * 11) * Math.sin(time * 3.7));
      },
    });
  },
});
