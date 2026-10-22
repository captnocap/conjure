import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const PALETTES = {
  neon: ['#ff2f8e', '#ffe02e', '#22c8ff', '#5fe04a', '#ff7a1e', '#a24dff'],
  pastel: ['#ffb3d1', '#fff0a6', '#a8e4ff', '#bff0b0', '#ffd0a8', '#d6baff'],
  red: ['#d8262c', '#f0f0ee', '#b81e28', '#e8443a', '#f6f2e8', '#c8202a'],
  metallic: ['#e8c048', '#d4d8de', '#e0a838', '#c0c6ce', '#f0d470', '#b8bcc4'],
} as const;

function paint(w: number, h: number, alpha: boolean, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d')!;
  if (!alpha) { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); }
  draw(c, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function star(outer: number, inner: number, points = 5) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer, t = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(t) * r, Math.sin(t) * r);
    else shape.lineTo(Math.cos(t) * r, Math.sin(t) * r);
  }
  shape.closePath();
  return shape;
}

export default defineThing({
  questions: {
    state: choice('What state is the basket in?', {
      untouched: 'Neatly packed and untouched: nobody has dared yet.',
      rummaged: 'Rummaged: a few pieces pulled out and set down beside it.',
      scattered: 'Tipped on its side, instruments strewn everywhere mid-party.',
      picked: 'Nearly empty: everything is in somebody’s hands, one reject left behind.',
    }),
    tambourines: choice('What kind of tambourines?', {
      star: 'Star-shaped plastic tambourines.',
      moon: 'Half-moon tambourines with a grip bar.',
      round: 'Classic round tambourines with a skin.',
      mixed: 'A jumble of stars, half-moons and rounds.',
    }),
    amount: score('How many noise-makers are there?', ['A token pair', 'A handful', 'Plenty for a group', 'A heap for a whole office party']),
    maracas: noul('Are there maracas among them?'),
    wand: choice('What light-up toy is in there?', {
      none: 'None.',
      star: 'A glowing star wand.',
      penlight: 'Idol-concert penlights with long glowing blades.',
      glowsticks: 'A fistful of thin glow sticks.',
    }),
    novelty: choice('What silly dress-up piece comes with it?', {
      none: 'Nothing: instruments only.',
      afro: 'A rainbow afro wig.',
      bob: 'A shiny platinum bob wig.',
      hats: 'A stack of cone party hats.',
      boa: 'A feather boa trailing over the rim.',
    }),
    palette: choice('What colours are the instruments?', {
      neon: 'Loud neon plastic in every colour.',
      pastel: 'Soft candy pastels.',
      red: 'Red and white, a matching set.',
      metallic: 'Gold and silver glitter.',
    }),
    container: choice('What are they kept in?', {
      lattice: 'A plastic lattice basket with handles, like a bathhouse basket.',
      wicker: 'A woven wicker basket.',
      crate: 'A stout plastic bottle crate.',
      cardboard: 'A cardboard box with its flaps open and PARTY marker-penned on the side.',
    }),
    tag: choice('What does the tag on the front say?', {
      none: 'No tag.',
      free: 'FREE TO USE',
      back: 'PLEASE RETURN',
      room: 'A room number.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tints = PALETTES[a.palette];
    const shiny = a.palette === 'metallic';
    const pick = () => tints[Math.floor(random() * tints.length)];
    const plastic = (tint: string) => s.material(tint, { roughness: shiny ? 0.3 : 0.42, metalness: shiny ? 0.55 : 0 });
    const steel = new THREE.MeshStandardMaterial({ color: '#e6e9ee', metalness: 0.6, roughness: 0.22, emissive: '#ffffff', emissiveIntensity: 0.06 });
    const put = (g: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    const jingles: THREE.Object3D[] = [];
    const glows: THREE.MeshStandardMaterial[] = [];
    const jingleAt = (g: THREE.Object3D, x: number, y: number) => {
      if (random() < mood.wear * 0.35) return;
      for (const z of [-0.009, 0.009]) {
        const slot = new THREE.Object3D();
        slot.position.set(x, y, z);
        g.add(slot);
        jingles.push(slot);
      }
    };

    // Instruments, each built centred, lying in the XY plane (tambourines) or standing on y = 0 (the rest).
    const tambourine = (kind: 'star' | 'moon' | 'round') => {
      const g = new THREE.Group();
      const body = plastic(pick());
      const t = 0.04;
      if (kind === 'star') {
        const shape = star(0.14, 0.08);
        shape.holes.push(star(0.098, 0.05));
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
        geometry.translate(0, 0, -t / 2);
        put(g, geometry, body);
        for (let i = 0; i < 5; i++) {
          const th = ((i + 0.5) / 5) * Math.PI * 2 + Math.PI / 2;
          jingleAt(g, Math.cos(th) * 0.066, Math.sin(th) * 0.066);
        }
      } else if (kind === 'moon') {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, 0.14, 0, Math.PI, false);
        shape.lineTo(-0.14, -0.04); shape.lineTo(0.14, -0.04); shape.closePath();
        const hole = new THREE.Path();
        hole.absarc(0, 0, 0.1, 0, Math.PI, false);
        hole.closePath();
        shape.holes.push(hole);
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
        geometry.translate(0, -0.05, -t / 2);
        put(g, geometry, body);
        for (let i = 0; i < 6; i++) {
          const th = ((i + 0.5) / 6) * Math.PI;
          jingleAt(g, Math.cos(th) * 0.12, Math.sin(th) * 0.12 - 0.05);
        }
      } else {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, 0.13, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, 0.116, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: 24 });
        geometry.translate(0, 0, -0.025);
        put(g, geometry, body);
        put(g, new THREE.CircleGeometry(0.128, 28), s.material('#f1e8d2', { roughness: 0.8, side: THREE.DoubleSide }), [0, 0, 0.024]);
        for (let i = 0; i < 6; i++) {
          const th = (i / 6) * Math.PI * 2;
          jingleAt(g, Math.cos(th) * 0.127, Math.sin(th) * 0.127);
        }
      }
      return g;
    };
    const maraca = () => {
      const g = new THREE.Group();
      const tint = pick();
      put(g, new THREE.CylinderGeometry(0.012, 0.009, 0.15, 10), s.material(shiny ? '#3a3024' : '#c89858', { roughness: 0.6 }), [0, 0.075, 0]);
      const head = put(g, new THREE.SphereGeometry(1, 18, 12), plastic(tint), [0, 0.19, 0]);
      head.scale.set(0.05, 0.062, 0.05);
      const band = put(g, new THREE.TorusGeometry(0.047, 0.006, 6, 20), plastic(pick()), [0, 0.2, 0]);
      band.rotation.x = Math.PI / 2;
      put(g, new THREE.TorusGeometry(0.03, 0.005, 6, 16), plastic('#ffffff'), [0, 0.148, 0]).rotation.x = Math.PI / 2;
      return g;
    };
    const glowMat = (tint: string) => {
      const m = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: mix(0.5, 1.6, mood.cheer), roughness: 0.3 });
      glows.push(m);
      return m;
    };
    const wand = () => {
      const g = new THREE.Group();
      if (a.wand === 'star') {
        put(g, new THREE.CylinderGeometry(0.008, 0.008, 0.24, 8), plastic('#f4f4f4'), [0, 0.12, 0]);
        const geometry = new THREE.ExtrudeGeometry(star(0.07, 0.034), { depth: 0.022, bevelEnabled: false });
        geometry.translate(0, 0, -0.011);
        put(g, geometry, glowMat(shiny ? '#ffe680' : pick()), [0, 0.28, 0]);
      } else if (a.wand === 'penlight') {
        put(g, new THREE.CylinderGeometry(0.016, 0.014, 0.1, 10), plastic('#22242a'), [0, 0.05, 0]);
        put(g, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 10), glowMat(pick()), [0, 0.2, 0]);
        put(g, new THREE.SphereGeometry(0.012, 10, 8), glowMat(pick()), [0, 0.3, 0]);
      } else put(g, new THREE.CylinderGeometry(0.006, 0.006, 0.26, 8), glowMat(PALETTES.neon[Math.floor(random() * 6)]), [0, 0.13, 0]);
      return g;
    };
    const novelty = () => {
      const g = new THREE.Group();
      if (a.novelty === 'afro') {
        const count = 90;
        const curls = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), count);
        const m = new THREE.Matrix4();
        for (let i = 0; i < count; i++) {
          const v = new THREE.Vector3(random() - 0.5, random() * 0.75 - 0.08, random() - 0.5).normalize().multiplyScalar(0.105 + random() * 0.03);
          const size = 0.034 + random() * 0.02;
          m.makeScale(size, size, size).setPosition(v.x, Math.max(v.y, -0.02) + 0.06, v.z);
          curls.setMatrixAt(i, m);
          curls.setColorAt(i, new THREE.Color().setHSL(((Math.atan2(v.z, v.x) / (Math.PI * 2)) + 1.5) % 1, 0.85, 0.55));
        }
        curls.castShadow = true;
        g.add(curls);
        put(g, new THREE.SphereGeometry(0.1, 14, 10), s.material('#2a2030'), [0, 0.06, 0]);
      } else if (a.novelty === 'bob') {
        const profile = [[0.002, 0.2], [0.06, 0.19], [0.1, 0.15], [0.115, 0.09], [0.12, 0.03], [0.128, 0]].map(([x, y]) => new THREE.Vector2(x, y));
        put(g, new THREE.LatheGeometry(profile, 24), new THREE.MeshStandardMaterial({ color: '#f1ead2', roughness: 0.25, metalness: 0.25, side: THREE.DoubleSide }));
        put(g, new THREE.SphereGeometry(0.1, 14, 10), s.material('#2a2030'), [0, 0.07, 0]);
        put(g, new THREE.BoxGeometry(0.15, 0.03, 0.02), s.material('#fbf6e4', { roughness: 0.3 }), [0, 0.125, 0.105]).rotation.x = 0.3;
      } else if (a.novelty === 'hats') {
        const n = 3 + Math.floor(random() * 3);
        for (let i = 0; i < n; i++) put(g, new THREE.ConeGeometry(0.065, 0.19, 18, 1, true), new THREE.MeshStandardMaterial({ color: pick(), roughness: 0.5, side: THREE.DoubleSide }), [0, 0.095 + i * 0.028, 0]);
        put(g, new THREE.SphereGeometry(0.016, 8, 6), s.material('#ffffff'), [0, 0.2 + (n - 1) * 0.028, 0]);
      }
      return g;
    };

    // The container.
    const kind = a.container;
    const W = 0.46, D = 0.32, H = kind === 'crate' ? 0.17 : kind === 'cardboard' ? 0.16 : 0.14;
    const taper = kind === 'lattice' || kind === 'wicker' ? 0.84 : 1;
    const hue = kind === 'lattice' ? (mood.warmth > 0.5 ? '#ff6f9e' : '#3fb6e0') : kind === 'crate' ? (mood.warmth > 0.5 ? '#d8362c' : '#2a5ac8') : kind === 'wicker' ? '#b88a4e' : '#b08a5a';
    const wallMap = paint(256, 128, kind === 'lattice' || kind === 'crate', (c, w, h) => {
      if (kind === 'lattice') {
        c.fillStyle = hue;
        for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 7, h);
        for (const y of [0, 54, 104]) c.fillRect(0, y, w, y === 54 ? 12 : 24);
      } else if (kind === 'crate') {
        c.fillStyle = hue; c.fillRect(0, 0, w, h);
        c.clearRect(96, 16, 64, 22);
        for (let x = 14; x < w; x += 30) c.clearRect(x, 62, 14, 40);
      } else if (kind === 'wicker') {
        c.fillStyle = '#8a6030'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 10) for (let x = (y / 10) % 2 ? 0 : 12; x < w; x += 24) {
          c.fillStyle = ['#c89a58', '#b88a4e', '#d4a868'][Math.floor(random() * 3)];
          c.fillRect(x, y + 1, 21, 8);
        }
      } else {
        c.fillStyle = hue; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(90,60,30,0.25)';
        for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 1, h);
        c.fillStyle = '#1c1c20'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.save(); c.translate(w / 2, h / 2 + 6); c.rotate(-0.06); c.fillText('PARTY', 0, 0); c.restore();
      }
    });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallMap, roughness: kind === 'cardboard' || kind === 'wicker' ? 0.9 : 0.4, side: THREE.DoubleSide, alphaTest: 0.5 });
    const basket = new THREE.Group();
    const corner = (sx: number, sz: number, top: boolean): P => [sx * (W / 2) * (top ? 1 : taper), top ? H : 0, sz * (D / 2) * (top ? 1 : taper)];
    {
      const pos: number[] = [], uv: number[] = [];
      const ring: [number, number][] = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
      for (let i = 0; i < 4; i++) {
        const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % 4];
        const a0 = corner(ax, az, false), b0 = corner(bx, bz, false), a1 = corner(ax, az, true), b1 = corner(bx, bz, true);
        pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
        uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.computeVertexNormals();
      if (kind === 'cardboard') {
        wallMat.side = THREE.FrontSide;
        put(basket, geometry, s.material('#a07c4e', { roughness: 0.9, side: THREE.BackSide }));
      }
      put(basket, geometry, wallMat);
    }
    const solid = s.material(hue, { roughness: kind === 'cardboard' || kind === 'wicker' ? 0.9 : 0.4 });
    put(basket, new THREE.BoxGeometry(W * taper, 0.008, D * taper), solid, [0, 0.004, 0]);
    if (kind !== 'cardboard') {
      const r = kind === 'wicker' ? 0.012 : 0.008;
      for (const z of [-1, 1]) put(basket, new THREE.BoxGeometry(W + r * 2, r * 2, r * 2), solid, [0, H, (z * D) / 2]);
      for (const x of [-1, 1]) put(basket, new THREE.BoxGeometry(r * 2, r * 2, D + r * 2), solid, [(x * W) / 2, H, 0]);
      if (kind !== 'crate') for (const x of [-1, 1]) {
        const handle = put(basket, new THREE.TorusGeometry(0.055, 0.007, 6, 14, Math.PI), solid, [(x * W) / 2 + x * 0.004, H, 0]);
        handle.rotation.y = Math.PI / 2;
        handle.rotation.x = x * mix(0.2, 1.3, random());
        handle.rotation.order = 'YXZ';
      }
    } else {
      const flap = s.material(hue, { roughness: 0.9, side: THREE.DoubleSide });
      for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const pivot = new THREE.Group();
        pivot.position.set((sx * W) / 2, H, (sz * D) / 2);
        const open = mix(0.3, 1.5, random());
        if (sx) pivot.rotation.z = -sx * open; else pivot.rotation.x = sz * open;
        put(pivot, new THREE.BoxGeometry(sx ? 0.003 : W, D / 3, sx ? D : 0.003), flap, [0, D / 6, 0]);
        basket.add(pivot);
      }
    }
    if (a.tag !== 'none') {
      const text = { free: 'FREE TO USE', back: 'PLEASE RETURN', room: `ROOM ${1 + Math.floor(random() * 28)}` }[a.tag];
      const tag = s.label(text, 0.2, 0.06, [0, H * 0.55, (D / 2) * mix(taper, 1, 0.55) + 0.006], '#c81e2a', '#fffbe8');
      tag.rotation.z = (random() - 0.5) * 0.16;
      tag.rotation.x = -Math.atan2((D / 2) * (1 - taper), H);
      basket.add(tag);
    }
    const tipped = a.state === 'scattered';
    const stand = new THREE.Group();
    if (tipped) { basket.rotation.x = Math.PI / 2; basket.position.set(0, D / 2 + 0.012, -H / 2); }
    stand.rotation.y = (random() - 0.5) * 0.5;
    stand.add(basket);
    s.root.add(stand);

    // What there is, and where it has ended up.
    type Item = { g: THREE.Group; type: 'tambourine' | 'maraca' | 'wand' };
    const items: Item[] = [];
    const kinds = ['star', 'moon', 'round'] as const;
    const nT = Math.max(1, Math.round(mix(2, 9, a.amount) + mood.density * 2));
    for (let i = 0; i < nT; i++) items.push({ g: tambourine(a.tambourines === 'mixed' ? kinds[Math.floor(random() * 3)] : a.tambourines), type: 'tambourine' });
    if (a.maracas) for (let i = 0; i < 2 + Math.round(a.amount * 2) * 2; i++) items.push({ g: maraca(), type: 'maraca' });
    if (a.wand !== 'none') for (let i = 0; i < (a.wand === 'glowsticks' ? 5 : 1 + Math.round(a.amount * 2)); i++) items.push({ g: wand(), type: 'wand' });
    // Shuffle so the kinds mingle.
    for (let i = items.length - 1; i > 0; i--) { const k = Math.floor(random() * (i + 1)); [items[i], items[k]] = [items[k], items[i]]; }

    const outShare = { untouched: 0, rummaged: 0.3, scattered: 0.75, picked: 0 }[a.state];
    const kept = a.state === 'picked' ? items.slice(0, Math.max(2, Math.round(items.length * 0.25))) : items;
    const outCount = Math.round(kept.length * outShare);
    const inside = kept.slice(outCount), outside = kept.slice(0, outCount);
    inside.forEach((item, i) => {
      const n = inside.length, perRow = Math.ceil(n / 2);
      const row = i % 2, col = Math.floor(i / 2);
      const x = n === 1 ? (random() - 0.5) * 0.2 : mix(-W / 2 + 0.06, W / 2 - 0.06, perRow === 1 ? 0.5 : col / (perRow - 1)) * taper;
      const z = (row ? 0.07 : -0.07) * (n > 1 ? 1 : 0) + (random() - 0.5) * 0.03;
      const g = item.g;
      if (item.type === 'tambourine') {
        g.rotation.set((random() - 0.5) * 0.3, Math.PI / 2 + (random() - 0.5) * 0.9, (random() - 0.5) * 0.5);
        g.position.set(x, 0.012 + 0.13 + random() * 0.03, z);
      } else {
        g.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5);
        g.position.set(x, 0.015, z);
      }
      basket.add(g);
    });
    outside.forEach((item, i) => {
      const n = outside.length;
      const arc = tipped ? Math.PI * 1.25 : Math.PI * 1.1;
      const centreAngle = Math.PI / 2;
      const angle = centreAngle + (n === 1 ? 0 : ((i + 0.5) / n - 0.5) * arc) + (random() - 0.5) * 0.18;
      const reach = (tipped ? 0.3 : 0.4) + (i % 2) * 0.24 + random() * 0.05;
      const outer = new THREE.Group();
      outer.position.set(Math.cos(angle) * reach * 1.1, 0, Math.sin(angle) * reach);
      outer.rotation.y = random() * Math.PI * 2;
      const g = item.g;
      if (item.type === 'tambourine') { g.rotation.x = -Math.PI / 2; g.position.y = 0.021 + i * 0.0015; }
      else if (item.type === 'maraca') { g.rotation.z = Math.PI / 2 - 0.2; g.position.set(0.1, 0.014, 0); }
      else { g.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.position.set(0.14, 0.012, 0); }
      outer.add(g);
      stand.add(outer);
    });

    if (a.novelty === 'boa') {
      const tint = shiny ? '#f2f0ea' : pick();
      const fromIn: P = tipped ? [-0.08, 0.05, -0.08] : [-0.08, H * 0.6, 0.02];
      const over: P = tipped ? [-0.02, 0.04, 0.1] : [0.02, H + 0.03, D / 2 + 0.01];
      const path = new THREE.CatmullRomCurve3([fromIn, over, [over[0] + 0.04, 0.05, over[2] + 0.12], [over[0] + 0.22, 0.03, over[2] + 0.2], [over[0] + 0.4, 0.03, over[2] + 0.08], [over[0] + 0.5, 0.03, over[2] + 0.22]].map((p) => new THREE.Vector3(...(p as P))));
      const count = 70;
      const fluff = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ roughness: 0.95 }), count);
      const m = new THREE.Matrix4(), base = new THREE.Color(tint);
      for (let i = 0; i < count; i++) {
        const p = path.getPoint(i / (count - 1));
        const size = 0.026 + random() * 0.016;
        m.makeScale(size, size, size).setPosition(p.x + (random() - 0.5) * 0.012, Math.max(size, p.y + (random() - 0.5) * 0.012), p.z + (random() - 0.5) * 0.012);
        fluff.setMatrixAt(i, m);
        fluff.setColorAt(i, base.clone().multiplyScalar(mix(0.75, 1.1, random())));
      }
      fluff.castShadow = true;
      stand.add(fluff);
    } else if (a.novelty !== 'none') {
      const g = novelty();
      if (a.state === 'untouched' || a.state === 'picked') {
        g.position.set(W / 2 - 0.11, a.state === 'picked' ? 0.012 : H - 0.02, a.state === 'picked' ? 0 : -0.04);
        g.rotation.set(0.15, random() * 3, a.state === 'picked' ? 0.1 : -0.3);
        basket.add(g);
      } else {
        g.position.set(tipped ? -W / 2 - 0.16 : W / 2 + 0.2, a.novelty === 'hats' ? 0.065 : 0, tipped ? 0.05 : -0.05);
        if (a.novelty === 'hats') g.rotation.z = Math.PI / 2;
        g.rotation.y = random() * 3;
        stand.add(g);
      }
    }

    // Every jingle is one instance; update rocks them on their pins.
    s.root.updateWorldMatrix(true, true);
    const bases = jingles.map((slot) => slot.matrixWorld.clone());
    const phases = bases.map(() => [random() * 6.3, mix(5, 13, random())] as const);
    const disc = new THREE.CylinderGeometry(0.025, 0.025, 0.004, 12);
    disc.rotateX(Math.PI / 2);
    const bells = new THREE.InstancedMesh(disc, steel, Math.max(1, bases.length));
    bells.count = bases.length;
    bases.forEach((matrix, i) => bells.setMatrixAt(i, matrix));
    bells.castShadow = true;
    s.root.add(bells);
    const spin = new THREE.Matrix4(), out = new THREE.Matrix4();
    const amp = mix(0, 0.9, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (amp > 0.01) {
          for (let i = 0; i < bases.length; i++) {
            spin.makeRotationX(Math.sin(time * phases[i][1] + phases[i][0]) * amp);
            bells.setMatrixAt(i, out.multiplyMatrices(bases[i], spin));
          }
          bells.instanceMatrix.needsUpdate = true;
        }
        const pulse = mix(0.5, 1.6, mood.cheer) * (1 + Math.sin(time * mix(1, 9, mood.energy)) * 0.3);
        for (const m of glows) m.emissiveIntensity = pulse;
      },
    });
  },
});
