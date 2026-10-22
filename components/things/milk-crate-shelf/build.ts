import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const W = 0.36, H = 0.34, D = 0.3;
/** One crate lying on its side, opening toward +z, centred on the origin: frame beams and lattice bars in a single geometry. */
function crateGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const bar = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => parts.push(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z));
  const t = 0.014, hw = W / 2, hh = H / 2, hd = D / 2;
  // Twelve frame edges; the opening rim is heavier.
  for (const y of [-1, 1]) for (const z of [-1, 1]) bar(W, z > 0 ? 0.03 : t, z > 0 ? 0.022 : t, 0, y * (hh - (z > 0 ? 0.015 : t / 2)), z * (hd - (z > 0 ? 0.011 : t / 2)));
  for (const x of [-1, 1]) for (const z of [-1, 1]) bar(z > 0 ? 0.03 : t, H, z > 0 ? 0.022 : t, x * (hw - (z > 0 ? 0.015 : t / 2)), 0, z * (hd - (z > 0 ? 0.011 : t / 2)));
  for (const x of [-1, 1]) for (const y of [-1, 1]) bar(t, t, D, x * (hw - t / 2), y * (hh - t / 2), 0);
  const thin = 0.007, rib = 0.012;
  // Back.
  for (let i = 1; i < 6; i++) bar(rib, H, thin, -hw + i * W / 6, 0, -hd + thin / 2);
  for (let i = 1; i < 4; i++) bar(W, rib, thin, 0, -hh + i * H / 4, -hd + thin / 2);
  // Left and right walls, with a solid grip band.
  for (const x of [-1, 1]) {
    for (let i = 1; i < 5; i++) bar(thin, H, rib, x * (hw - thin / 2), 0, -hd + i * D / 5);
    for (let i = 1; i < 4; i++) bar(thin, i === 2 ? 0.05 : rib, D, x * (hw - thin / 2), -hh + i * H / 4, 0);
  }
  // Top and bottom walls.
  for (const y of [-1, 1]) {
    for (let i = 1; i < 6; i++) bar(rib, thin, D, -hw + i * W / 6, y * (hh - thin / 2), 0);
    for (let i = 1; i < 4; i++) bar(W, thin, rib, 0, y * (hh - thin / 2), -hd + i * D / 4);
  }
  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return merged;
}

const CRATE_COLOURS = {
  dairy: ['#c8302a', '#2456a8', '#2f8a4a', '#c8302a', '#e0a020'],
  black: ['#232529', '#2b2d31', '#1d1e22'],
  red: ['#c8302a', '#b82a26', '#d03a30'],
  bleached: ['#d9a6a0', '#a9bcd6', '#b9d0b0', '#e3d6a6', '#c9c5bd'],
  bluegrey: ['#2456a8', '#7d858f', '#3a6fc0', '#9aa2ab'],
  yellow: ['#e0a020', '#e8b830', '#232529'],
} as const;
type Fill = 'books' | 'records' | 'plant' | 'kitchen' | 'clothes' | 'box' | 'empty';
const MIXES: Record<string, Fill[]> = {
  mix: ['books', 'records', 'plant', 'kitchen', 'books', 'clothes', 'records'],
  books: ['books', 'books', 'books', 'plant', 'books'],
  records: ['records', 'records', 'records', 'books', 'records'],
  plants: ['plant', 'plant', 'books', 'plant', 'empty'],
  kitchen: ['kitchen', 'kitchen', 'books', 'kitchen', 'box'],
  clothes: ['clothes', 'clothes', 'clothes', 'books', 'box'],
};

export default defineThing({
  questions: {
    stack: choice('How are the crates arranged?', {
      tower: 'A single tower three or four crates tall.',
      wall: 'A wall two crates wide and three high.',
      pyramid: 'A stepped pyramid, three then two then one.',
      low: 'A low row of three along the floor, used like a sideboard.',
      planks: 'Two columns of crates holding up scavenged planks, a brick-and-board bookcase.',
      single: 'One crate turned upside down as a bedside table.',
    }),
    colours: choice('What colours are the crates?', {
      dairy: 'A mismatched haul of red, blue, green and yellow dairy crates.',
      black: 'All matt black, bought rather than borrowed.',
      red: 'All the same red, clearly from one dairy.',
      bleached: 'Sun-bleached pastels that have been outdoors for years.',
      bluegrey: 'Blues and greys.',
      yellow: 'Bright yellow with the odd black one.',
    }),
    contents: choice('What are they mostly filled with?', {
      mix: 'A bit of everything: paperbacks, records, a plant, mugs.',
      books: 'Paperbacks, spines out, crammed in rows.',
      records: 'Vinyl records, hundreds of thin sleeves.',
      plants: 'House plants, trailing down the fronts.',
      kitchen: 'The kitchen: plates, mugs, noodles, a pan.',
      clothes: 'Folded clothes, because there is no wardrobe.',
    }),
    state: choice('How settled is it?', {
      unpacked: 'Just moved in: half the crates still hold taped boxes or nothing at all.',
      settled: 'Lived-in and arranged with some care.',
      overflowing: 'Overflowing: crammed full with more piled on top.',
      leaving: 'Being packed up to go: mostly emptied, a roll of tape and a box waiting beside it.',
    }),
    top: choice('What stands on top?', {
      kettle: 'A kettle and a mug.',
      plant: 'A pot plant.',
      turntable: 'A record player.',
      lamp: 'A small lamp, switched on.',
      photo: 'A framed photograph and a candle.',
      nothing: 'Nothing.',
    }),
    fullness: score('How full are the crates?', ['Sparse, a few things each', 'Half full', 'Comfortably full', 'Packed tight']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const sat = mix(0.55, 1.05, mood.cheer);
    const fade = mood.wear * 0.35;
    const tone = (hex: THREE.ColorRepresentation) => new THREE.Color(hex).lerp(new THREE.Color('#b5ada0'), fade);
    const bright = () => new THREE.Color().setHSL(random(), mix(0.3, 0.7, random()) * sat, mix(0.28, 0.62, random()));

    // Shared instanced parts: every book, sleeve and folded shirt is one box; every leaf one flattened ball.
    const blocks: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const leaves: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const local = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const into = (list: typeof blocks, g: THREE.Object3D, pos: [number, number, number], size: [number, number, number], rot: [number, number, number], colour: THREE.Color) => {
      g.updateMatrix();
      local.compose(new THREE.Vector3(...pos), q.setFromEuler(e.set(...rot)), new THREE.Vector3(...size));
      list.push({ m: g.matrix.clone().multiply(local), c: colour });
    };
    const put = (g: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };

    const fullness = Math.min(1, Math.max(0.12, a.fullness * 0.8 + mood.density * 0.25 + (a.state === 'overflowing' ? 0.25 : a.state === 'leaving' ? -0.35 : 0)));
    const terracotta = s.material('#b8623f', { roughness: 0.9 });
    const china = s.material('#ecebe4', { roughness: 0.35 });
    const card = s.material('#b98d5c', { roughness: 0.95 });

    interface Span { x0: number; x1: number; y0: number; h: number; zf: number; depth: number }
    const books = (g: THREE.Object3D, sp: Span, amount: number) => {
      let x = sp.x0 + 0.004;
      const end = sp.x0 + (sp.x1 - sp.x0) * Math.min(1, amount + 0.1);
      while (x < end - 0.02) {
        const th = 0.014 + random() * 0.028, h = Math.min(sp.h - 0.02, 0.15 + random() * 0.08), dp = 0.1 + random() * 0.04;
        into(blocks, g, [x + th / 2, sp.y0 + h / 2, sp.zf - dp / 2 - random() * 0.025], [th, h, dp], [0, 0, (random() - 0.5) * 0.05], random() < 0.25 ? new THREE.Color('#e9e2cf') : bright());
        x += th + 0.0015;
      }
      if (sp.x1 - x > 0.09) {
        // A leaner, then a little horizontal pile in the gap.
        into(blocks, g, [x + 0.035, sp.y0 + 0.085, sp.zf - 0.07], [0.02, 0.18, 0.12], [0, 0, -0.33], bright());
        let y = sp.y0;
        const px = Math.min(sp.x1 - 0.07, x + 0.16);
        if (sp.x1 - x > 0.2) for (let i = 0; i < 1 + Math.floor(random() * 3); i++) { const th = 0.018 + random() * 0.02; into(blocks, g, [px, y + th / 2, sp.zf - 0.09], [0.12, th, 0.17], [0, (random() - 0.5) * 0.5, 0], bright()); y += th; }
      }
    };
    const records = (g: THREE.Object3D, sp: Span, amount: number) => {
      let x = sp.x0 + 0.004;
      const end = sp.x0 + (sp.x1 - sp.x0) * Math.min(1, amount + 0.15);
      const size = Math.min(0.305, sp.h - 0.004);
      let lean = 0;
      while (x < end - 0.008) {
        const th = 0.004 + random() * 0.003;
        lean = end < sp.x1 - 0.03 ? Math.max(lean, (x - sp.x0) / (end - sp.x0) > 0.75 ? -0.2 * random() : 0) : 0;
        const c = random() < 0.2 ? new THREE.Color('#ece6d4') : random() < 0.25 ? new THREE.Color('#17171b') : bright();
        into(blocks, g, [x + th / 2 - lean * size * 0.4, sp.y0 + size / 2, sp.zf - size / 2 + 0.03], [th, size, size], [0, 0, lean + (random() - 0.5) * 0.02], c);
        x += th + 0.0012;
      }
    };
    const clothes = (g: THREE.Object3D, sp: Span, amount: number) => {
      const piles = sp.x1 - sp.x0 > 0.5 ? 2 : 1;
      for (let k = 0; k < piles; k++) {
        const cx = piles === 1 ? (sp.x0 + sp.x1) / 2 : mix(sp.x0 + 0.15, sp.x1 - 0.15, k);
        let y = sp.y0;
        const n = 1 + Math.round(amount * 6);
        for (let i = 0; i < n && y < sp.y0 + sp.h - 0.05; i++) {
          const th = 0.028 + random() * 0.02;
          into(blocks, g, [cx + (random() - 0.5) * 0.02, y + th / 2, sp.zf - 0.13 + (random() - 0.5) * 0.02], [0.27, th, 0.23], [0, (random() - 0.5) * 0.1, 0], random() < 0.3 ? new THREE.Color(pick(['#e9e6df', '#23262c', '#8f9296'])) : bright());
          y += th;
        }
      }
    };
    const mug = (g: THREE.Object3D, x: number, y: number, z: number) => {
      const m = new THREE.MeshStandardMaterial({ color: random() < 0.4 ? new THREE.Color('#ecebe4') : bright(), roughness: 0.4 });
      put(g, new THREE.CylinderGeometry(0.04, 0.035, 0.09, 16), m, x, y + 0.045, z);
      put(g, new THREE.TorusGeometry(0.026, 0.007, 6, 14), m, x + 0.045, y + 0.045, z);
    };
    const plant = (g: THREE.Object3D, x: number, y: number, z: number, room: number, drop: number) => {
      const r = 0.06 + random() * 0.02;
      put(g, new THREE.CylinderGeometry(r, r * 0.72, r * 1.5, 16), random() < 0.6 ? terracotta : china, x, y + r * 0.75, z);
      put(g, new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.008, 14), s.material('#3a2a1e', { roughness: 1 }), x, y + r * 1.5, z);
      const style = room < 0.2 ? 'trail' : pick(['trail', 'trail', 'spike', 'bush'] as const);
      const dead = mood.wear > 0.7 && random() < 0.6;
      const green = () => dead ? new THREE.Color().setHSL(0.1, 0.35, 0.3 + random() * 0.15) : new THREE.Color().setHSL(0.27 + random() * 0.1, 0.5 * sat + 0.15, 0.25 + random() * 0.2);
      const topY = y + r * 1.5;
      if (style === 'spike') {
        for (let i = 0; i < 6 + Math.floor(random() * 4); i++) { const h = Math.min(room - 0.02, 0.12 + random() * 0.2), ang = random() * 6.28, lean = random() * 0.3; into(leaves, g, [x + Math.cos(ang) * r * 0.35 + Math.cos(ang) * lean * h * 0.4, topY + h / 2, z + Math.sin(ang) * r * 0.35 + Math.sin(ang) * lean * h * 0.4], [0.022, h / 2, 0.008], [Math.sin(ang) * lean, -ang, -Math.cos(ang) * lean], green()); }
      } else if (style === 'bush') {
        for (let i = 0; i < 26; i++) { const ang = random() * 6.28, up = random(), rad = r * (0.4 + up * 1.2); into(leaves, g, [x + Math.cos(ang) * rad, topY + 0.02 + up * Math.min(room - 0.05, 0.16), z + Math.sin(ang) * rad], [0.035, 0.008, 0.022], [random(), ang, random() - 0.5], green()); }
      } else {
        const vines = 3 + Math.floor(random() * 4);
        for (let v = 0; v < vines; v++) {
          const ang = (random() - 0.5) * 2.4 + Math.PI / 2, len = drop * (0.4 + random() * 0.6);
          const n = 5 + Math.floor(len / 0.035);
          for (let i = 0; i < n; i++) {
            const u = i / n, out = r * (0.6 + Math.min(u * 3, 1) * 1.1);
            const fall = Math.max(0, u - 0.25) * len / 0.75;
            const px = x + Math.cos(ang) * out + (random() - 0.5) * 0.02, pz = z + Math.sin(ang) * out + (random() - 0.5) * 0.015;
            into(leaves, g, [px, topY + 0.02 * (1 - u * 4 < 0 ? 0 : 1 - u * 4) - fall, pz], [0.028, 0.006, 0.02], [0.9 + random() * 0.5, random() * 3, random() - 0.5], green());
          }
        }
      }
    };
    const box = (g: THREE.Object3D, sp: Span) => {
      const w = Math.min(0.3, sp.x1 - sp.x0 - 0.02), h = Math.min(0.26, sp.h - 0.03), d = 0.26;
      const cx = (sp.x0 + sp.x1) / 2;
      put(g, new THREE.BoxGeometry(w, h, d), card, cx, sp.y0 + h / 2, sp.zf - d / 2);
      put(g, new THREE.BoxGeometry(0.05, h + 0.002, d + 0.002), s.material('#d7c08a', { roughness: 0.35 }), cx, sp.y0 + h / 2, sp.zf - d / 2);
      const tag = s.label(pick(['BOOKS', 'MISC', 'KITCHEN', 'KEEP', 'MUM', 'CABLES', 'WINTER', '???']), w * 0.8, h * 0.4, [0, 0, 0], '#1d1d22', '#b98d5c');
      s.root.remove(tag); tag.position.set(cx + (random() - 0.5) * 0.02, sp.y0 + h * 0.5, sp.zf + 0.0015); tag.rotation.z = (random() - 0.5) * 0.15; tag.castShadow = false; g.add(tag);
    };
    const kitchen = (g: THREE.Object3D, sp: Span, amount: number) => {
      const cx = (sp.x0 + sp.x1) / 2;
      const plates = 2 + Math.floor(amount * 6);
      for (let i = 0; i < plates; i++) put(g, new THREE.CylinderGeometry(0.085, 0.06, 0.012, 20), i % 3 === 2 ? new THREE.MeshStandardMaterial({ color: bright(), roughness: 0.4 }) : china, cx - 0.06, sp.y0 + 0.008 + i * 0.011, sp.zf - 0.11);
      const cups = 1 + Math.floor(amount * 2.5);
      for (let i = 0; i < cups; i++) mug(g, cx + 0.09, sp.y0 + (i > 1 ? 0.09 : 0), sp.zf - 0.06 - (i % 2) * 0.11);
      if (amount > 0.4) for (let i = 0; i < 2; i++) { put(g, new THREE.CylinderGeometry(0.048, 0.036, 0.1, 16), s.material(pick(['#d2372b', '#e8a22c', '#f1efe8'])), cx - 0.06 + i * 0.01, sp.y0 + plates * 0.011 + 0.06 + i * 0.03, sp.zf - 0.11); }
    };
    const fill = (g: THREE.Object3D, kind: Fill, sp: Span) => {
      const amount = Math.min(1, fullness * mix(0.75, 1.25, random()));
      if (kind === 'books') books(g, sp, amount);
      else if (kind === 'records') records(g, sp, amount);
      else if (kind === 'clothes') clothes(g, sp, amount);
      else if (kind === 'kitchen') kitchen(g, sp, amount);
      else if (kind === 'box') box(g, sp);
      else if (kind === 'plant') {
        plant(g, (sp.x0 + sp.x1) / 2 + (sp.x1 - sp.x0 > 0.5 ? 0.15 : -0.04), sp.y0, sp.zf - 0.1, sp.h - 0.13, 0.3);
        if (sp.x1 - sp.x0 > 0.5 || amount > 0.5) books(g, { ...sp, x0: sp.x1 - 0.12 }, 1);
      }
    };
    const pool = MIXES[a.contents];
    let turn = Math.floor(random() * pool.length);
    const nextFill = (): Fill => {
      const roll = random();
      if (a.state === 'unpacked' && roll < 0.5) return roll < 0.3 ? 'box' : 'empty';
      if (a.state === 'leaving' && roll < 0.7) return roll < 0.45 ? 'empty' : 'box';
      return pool[turn++ % pool.length];
    };

    // ----- Crates -----
    const geometry = crateGeometry();
    const palette = CRATE_COLOURS[a.colours];
    const plastics = palette.map((hex) => new THREE.MeshStandardMaterial({ color: tone(hex), roughness: 0.55 + mood.wear * 0.3 }));
    const cells: { x: number; y: number }[] = [];
    const rows = (n: number) => Array.from({ length: n }, (_unused, i) => i);
    if (a.stack === 'tower') for (const r of rows(mood.density > 0.6 || random() < 0.4 ? 4 : 3)) cells.push({ x: 0, y: r });
    else if (a.stack === 'wall') for (const r of rows(3)) for (const c of [-0.5, 0.5]) cells.push({ x: c, y: r });
    else if (a.stack === 'pyramid') { for (const c of [-1, 0, 1]) cells.push({ x: c, y: 0 }); for (const c of [-0.5, 0.5]) cells.push({ x: c, y: 1 }); cells.push({ x: 0, y: 2 }); }
    else if (a.stack === 'low') for (const c of [-1, 0, 1]) cells.push({ x: c, y: 0 });
    else if (a.stack === 'planks') for (const r of rows(mood.density > 0.5 ? 3 : 2)) for (const c of [-1.42, 1.42]) cells.push({ x: c, y: r });

    const gap = a.stack === 'planks' ? 0.024 : 0;
    const tops: { x: number; y: number; w: number }[] = [];
    const interior: Span = { x0: -W / 2 + 0.018, x1: W / 2 - 0.018, y0: -H / 2 + 0.014, h: H - 0.03, zf: D / 2, depth: D };
    const stamp = paint(256, 40, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pick(['PROPERTY OF DAIRY', 'RETURN TO DEPOT', 'NOT FOR RESALE', 'UNITED DAIRIES', 'USE BY OTHERS ILLEGAL']), w / 2, h / 2, w - 8);
    });
    const stampMaterial = new THREE.MeshStandardMaterial({ map: stamp, transparent: true, roughness: 0.6, depthWrite: false });
    if (a.stack === 'single') {
      const g = new THREE.Group();
      g.position.set(0, D / 2, 0);
      g.rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.3);
      put(g, geometry, pick(plastics));
      s.root.add(g);
      tops.push({ x: 0, y: D, w: W });
    } else {
      const maxRow = Math.max(...cells.map((c) => c.y));
      for (const cell of cells) {
        const g = new THREE.Group();
        const settle = a.state === 'settled' ? 0.4 : 1;
        g.position.set(cell.x * (W + 0.004) + (random() - 0.5) * 0.02 * settle, H / 2 + cell.y * (H + gap), (random() - 0.5) * 0.03 * settle);
        g.rotation.y = (random() - 0.5) * 0.09 * settle;
        // Now and then a crate is turned to stand on its short side.
        put(g, geometry, pick(plastics));
        if (random() < 0.6) { const label = put(g, new THREE.PlaneGeometry(0.26, 0.026), stampMaterial, 0, H / 2 - 0.015, D / 2 + 0.0012); label.castShadow = false; }
        s.root.add(g);
        fill(g, nextFill(), interior);
        const covered = cells.some((o) => o.y === cell.y + 1 && Math.abs(o.x - cell.x) < 0.9);
        if (!covered && a.stack !== 'planks') tops.push({ x: g.position.x, y: (cell.y + 1) * H, w: W });
        if (cell.y === maxRow && a.stack === 'planks') { /* planks carry the top */ }
      }
      if (a.stack === 'planks') {
        const wood = s.material(pick(['#c9a56c', '#a8845c', '#d9c9a2', '#7a5a3a']), { roughness: 0.85 });
        const span = 1.42 * (W + 0.004);
        for (let r = 0; r <= maxRow; r++) {
          const y = (r + 1) * H + r * gap;
          const plank = s.box([span * 2 + W + 0.12 + random() * 0.1, gap - 0.002, D + 0.02], [(random() - 0.5) * 0.04, y + gap / 2, 0], wood);
          plank.rotation.y = (random() - 0.5) * 0.03;
          if (r < maxRow) {
            const g = new THREE.Group(); g.position.set(0, y + gap, 0); s.root.add(g);
            fill(g, nextFill(), { x0: -span + W / 2 + 0.01, x1: span - W / 2 - 0.01, y0: 0, h: H - 0.01, zf: D / 2 - 0.01, depth: D });
          }
        }
        // And the floor between the columns.
        const g = new THREE.Group(); s.root.add(g);
        fill(g, nextFill(), { x0: -span + W / 2 + 0.01, x1: span - W / 2 - 0.01, y0: 0, h: H - 0.01, zf: D / 2 - 0.01, depth: D });
        const topY = (maxRow + 1) * (H + gap);
        tops.push({ x: -0.3, y: topY, w: 0.4 }, { x: 0.3, y: topY, w: 0.4 }, { x: 0, y: topY, w: 0.3 });
      }
    }
    tops.sort((p, r) => r.y - p.y || random() - 0.5);

    // ----- What stands on top -----
    let spin: THREE.Object3D | null = null;
    let glow: THREE.MeshStandardMaterial | null = null;
    const used = new Set<number>();
    const spot = (index = 0) => { const i = Math.min(index, tops.length - 1); used.add(i); return tops[i]; };
    const at = (t: { x: number; y: number }) => { const g = new THREE.Group(); g.position.set(t.x, t.y + 0.001, 0); g.rotation.y = (random() - 0.5) * 0.5; s.root.add(g); return g; };
    if (a.top === 'kettle') {
      const g = at(spot());
      const steel = random() < 0.5;
      const shell = steel ? s.material('#c9cdd1', { metalness: 0.85, roughness: 0.25 }) : s.material(pick(['#ecebe4', '#2a2c30', '#c8302a', '#a9cdbf']), { roughness: 0.4 });
      const k = new THREE.Group(); k.position.set(-0.06, 0, 0); g.add(k);
      put(k, new THREE.CylinderGeometry(0.082, 0.082, 0.02, 20), s.material('#2a2c30'), 0, 0.01, 0);
      put(k, new THREE.LatheGeometry([[0.001, 0.02], [0.078, 0.02], [0.08, 0.06], [0.07, 0.17], [0.058, 0.215], [0.001, 0.22]].map(([x, y]) => new THREE.Vector2(x, y)), 24), shell);
      put(k, new THREE.SphereGeometry(0.014, 10, 8), s.material('#2a2c30'), 0, 0.228, 0);
      const spout = put(k, new THREE.CylinderGeometry(0.012, 0.026, 0.07, 10), shell, -0.078, 0.18, 0); spout.rotation.z = 0.9;
      const handle = put(k, new THREE.TorusGeometry(0.065, 0.011, 8, 18, Math.PI), s.material('#2a2c30', { roughness: 0.5 }), 0.07, 0.12, 0); handle.rotation.z = -Math.PI / 2;
      put(k, new THREE.BoxGeometry(0.012, 0.06, 0.02), s.material('#7fc8e8', { emissive: '#3fa8ff', emissiveIntensity: 0.5, roughness: 0.2 }), 0, 0.1, 0.077);
      mug(g, 0.1, 0, 0.04);
    } else if (a.top === 'plant') {
      const g = at(spot());
      plant(g, 0, 0, 0, 0.5, 0.45);
    } else if (a.top === 'turntable') {
      const g = at(spot());
      g.rotation.y *= 0.3;
      put(g, new THREE.BoxGeometry(0.4, 0.07, 0.32), s.material(pick(['#6a4a30', '#2a2c30', '#d9d3c2', '#8a2f2a']), { roughness: 0.5 }), 0, 0.035, 0);
      put(g, new THREE.CylinderGeometry(0.14, 0.14, 0.014, 32), s.material('#9a9da2', { metalness: 0.7, roughness: 0.3 }), -0.04, 0.077, 0);
      const disc = new THREE.Group(); disc.position.set(-0.04, 0.086, 0); g.add(disc);
      put(disc, new THREE.CylinderGeometry(0.135, 0.135, 0.004, 32), s.material('#131316', { roughness: 0.3 }));
      put(disc, new THREE.CylinderGeometry(0.045, 0.045, 0.005, 20), new THREE.MeshStandardMaterial({ color: bright(), roughness: 0.6 }));
      put(disc, new THREE.BoxGeometry(0.03, 0.006, 0.008), s.material('#f1efe8'), 0.025, 0, 0);
      spin = disc;
      put(g, new THREE.CylinderGeometry(0.015, 0.015, 0.03, 12), s.material('#c9cdd1', { metalness: 0.8 }), 0.15, 0.085, -0.11);
      const arm = put(g, new THREE.CylinderGeometry(0.004, 0.004, 0.22, 8), s.material('#c9cdd1', { metalness: 0.8 }), 0.105, 0.1, -0.01); arm.rotation.set(Math.PI / 2, 0, 0.42);
      put(g, new THREE.BoxGeometry(0.02, 0.012, 0.035), s.material('#2a2c30'), 0.06, 0.097, 0.09);
    } else if (a.top === 'lamp') {
      const g = at(spot());
      const shade = new THREE.Color().setHSL(mix(0.14, 0.07, mood.warmth), 0.85, 0.72);
      put(g, new THREE.CylinderGeometry(0.06, 0.07, 0.02, 18), s.material('#2f3238'), 0, 0.01, 0);
      put(g, new THREE.CylinderGeometry(0.007, 0.007, 0.2, 8), s.material('#c9a23a', { metalness: 0.7 }), 0, 0.12, 0);
      glow = new THREE.MeshStandardMaterial({ color: shade, emissive: shade, emissiveIntensity: 1, roughness: 0.8, side: THREE.DoubleSide });
      put(g, new THREE.CylinderGeometry(0.06, 0.105, 0.14, 20, 1, true), glow, 0, 0.27, 0);
      const halo = put(g, new THREE.CircleGeometry(0.3, 28), new THREE.MeshBasicMaterial({ color: shade, transparent: true, opacity: 0.2, depthWrite: false }), 0, 0.004, 0);
      halo.rotation.x = -Math.PI / 2; halo.castShadow = false;
    } else if (a.top === 'photo') {
      const g = at(spot());
      const photo = paint(96, 128, (ctx, w, h) => {
        ctx.fillStyle = pick(['#a9c4d9', '#d9c4a0', '#b9c9a9', '#9a9a9a']); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = pick(['#6f8f5a', '#8a7a5a', '#5a6a7a']); ctx.fillRect(0, h * 0.62, w, h);
        const people = 1 + Math.floor(random() * 3);
        for (let i = 0; i < people; i++) { const x = w * (0.5 + (i - (people - 1) / 2) * 0.27); ctx.fillStyle = pick(['#3a2a22', '#5a3a2a', '#2a2a30']); ctx.beginPath(); ctx.arc(x, h * 0.42, 11, 0, 7); ctx.fill(); ctx.fillStyle = `hsl(${random() * 360},${45 * sat}%,45%)`; ctx.fillRect(x - 13, h * 0.5, 26, h * 0.5); }
      });
      const frame = put(g, new THREE.BoxGeometry(0.13, 0.17, 0.012), s.material(pick(['#2a2c30', '#c9a23a', '#ecebe4', '#6a4a30'])), -0.06, 0.083, -0.02);
      frame.rotation.x = -0.22;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.145), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.4 })); pic.position.z = 0.0065; frame.add(pic);
      put(g, new THREE.CylinderGeometry(0.025, 0.025, 0.07 * mix(1, 0.4, mood.wear), 14), s.material('#efe6cf', { roughness: 0.5 }), 0.08, 0.035 * mix(1, 0.4, mood.wear), 0.04);
      glow = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb030', emissiveIntensity: 1.6 });
      const flame = put(g, new THREE.SphereGeometry(0.009, 8, 8), glow, 0.08, 0.07 * mix(1, 0.4, mood.wear) + 0.016, 0.04); flame.scale.y = 1.8; flame.castShadow = false;
    }
    // Overflow: the surplus goes on top of whatever is left.
    if (a.state === 'overflowing' || (mood.density > 0.75 && a.state === 'settled')) {
      tops.forEach((t, i) => {
        if (used.has(i) && tops.length > 1) return;
        const g = new THREE.Group(); g.position.set(t.x + (used.has(i) ? 0.2 : 0), t.y, 0); s.root.add(g);
        const kind = pick(['books', 'records', 'clothes'] as const);
        if (kind === 'clothes') clothes(g, { x0: -0.15, x1: 0.15, y0: 0, h: 0.3, zf: 0.13, depth: D }, 0.6);
        else { let y = 0; for (let k = 0; k < 3 + Math.floor(random() * 6); k++) { const th = kind === 'records' ? 0.006 : 0.02 + random() * 0.02; const sz = kind === 'records' ? 0.31 : 0.13 + random() * 0.03; into(blocks, g, [(random() - 0.5) * 0.03, y + th / 2, (random() - 0.5) * 0.02], [sz, th, kind === 'records' ? sz : 0.2], [0, (random() - 0.5) * 0.6, 0], bright()); y += th; } }
      });
    }
    // Leaving: tape, a box, a bin bag.
    if (a.state === 'leaving' || a.state === 'unpacked') {
      const extent = Math.max(...cells.map((c) => Math.abs(c.x)), 0) * W + W / 2;
      const g = new THREE.Group(); g.position.set(extent + 0.24, 0, 0.1); g.rotation.y = (random() - 0.5) * 0.6; s.root.add(g);
      box(g, { x0: -0.15, x1: 0.15, y0: 0, h: 0.3, zf: 0.13, depth: D });
      const roll = put(s.root, new THREE.TorusGeometry(0.04, 0.018, 8, 20), s.material('#b98d5c', { roughness: 0.3 }), extent + 0.2, 0.018, 0.36); roll.rotation.x = Math.PI / 2;
      if (a.state === 'leaving') {
        const bag = put(s.root, new THREE.IcosahedronGeometry(0.2, 1), s.material('#1b1c1f', { roughness: 0.3, flatShading: true }), -extent - 0.26, 0.15, 0.08);
        bag.scale.set(1, 0.8, 0.9); bag.rotation.y = random() * 3;
        put(s.root, new THREE.ConeGeometry(0.05, 0.1, 6), s.material('#1b1c1f', { roughness: 0.3, flatShading: true }), -extent - 0.26, 0.33, 0.08);
      }
    }

    const instanced = (list: typeof blocks, geo: THREE.BufferGeometry, roughness: number) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness }), list.length);
      list.forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.c); });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      s.root.add(mesh);
    };
    instanced(blocks, new THREE.BoxGeometry(1, 1, 1), 0.8);
    instanced(leaves, new THREE.SphereGeometry(1, 8, 6), 0.7);

    const speed = mix(0.6, 3.5, mood.energy);
    return s.finish({
      update: (dt, time) => {
        if (spin) spin.rotation.y -= dt * speed;
        if (glow && a.top === 'photo') glow.emissiveIntensity = 1.4 + 0.4 * Math.sin(time * 9) * Math.sin(time * 5.3);
      },
    });
  },
});
