import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = readonly [number, number, number];
type Inst = { p: V3; r?: V3; s?: V3; c?: THREE.ColorRepresentation };

function instances(s: Sculpture, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], list: Inst[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(list.length, 1));
  mesh.count = list.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  list.forEach((it, i) => {
    const r = it.r ?? [0, 0, 0], k = it.s ?? [1, 1, 1];
    q.setFromEuler(e.set(r[0], r[1], r[2], 'YXZ'));
    m.compose(v.set(it.p[0], it.p[1], it.p[2]), q, sc.set(k[0], k[1], k[2]));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(it.c ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  s.root.add(mesh);
  return mesh;
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A cloth hanging off the table edge all the way round, with soft folds and an uneven hem. */
function skirt(L: number, W: number, top: number, drop: number, ripple: number, ragged: number, phase: number) {
  const per = 2 * (L + W), n = 220, rows = 4;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const d = ((i % n) / n) * per;
    let x: number, z: number, nx: number, nz: number;
    if (d < L) { x = -L / 2 + d; z = W / 2; nx = 0; nz = 1; }
    else if (d < L + W) { x = L / 2; z = W / 2 - (d - L); nx = 1; nz = 0; }
    else if (d < 2 * L + W) { x = L / 2 - (d - L - W); z = -W / 2; nx = 0; nz = -1; }
    else { x = -L / 2; z = -W / 2 + (d - 2 * L - W); nx = -1; nz = 0; }
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const off = 0.006 + ripple * t * (0.5 + 0.5 * Math.sin(d * 21 + phase + Math.sin(d * 5.3) * 1.4));
      const hem = drop * t * (1 + ragged * Math.sin(d * 3.1 + phase * 2) + ragged * 0.6 * Math.sin(d * 11.7));
      pos.push(x + nx * off, top - hem, z + nz * off);
      uv.push((i / n) * per / 0.09, t * drop / 0.09);
    }
  }
  for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) {
    const a = i * (rows + 1) + r, b = a + rows + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export default defineThing({
  questions: {
    spread: choice('What kind of spread has been laid on?', {
      triangles: 'The classic funeral tea: white and brown sandwich triangles on tiered plates, sausage rolls, a bowl of crisps.',
      potluck: 'Dishes people brought from home: mismatched casseroles, a slow cooker, foil-covered trays, a salad bowl.',
      sweets: 'Sweet things only: an iced cake on a stand, traybakes cut in squares, fairy cakes, plates of biscuits.',
      deli: 'Cold platters: rolled ham, cubes of cheese, tomatoes and lettuce, a bowl of coleslaw, buttered rolls.',
      meagre: 'Almost nothing: a plate of biscuits, one shop-bought cake still in its box, a single bowl. Few people came, or nobody thought to cater.',
    }),
    eaten: score('How much of it has been eaten?', [
      'Untouched, the cling film still on',
      'Politely picked at',
      'Half gone',
      'Crumbs, empty plates and the last curling sandwich',
    ]),
    cloth: choice('What covers the table?', {
      paper: 'White paper banqueting roll, cut short with an uneven edge, the steel legs showing.',
      linen: 'A pressed white linen cloth falling in folds almost to the floor.',
      gingham: 'A wipe-clean checked cloth in red and white, cheerful, borrowed from the summer fete.',
      mourning: 'A dark plum cloth to the floor, formal and sombre.',
      bare: 'No cloth: bare wooden boards on trestles with a paper runner down the middle.',
    }),
    length: score('How long is the table?', ['One small card table', 'A six-foot trestle', 'Two trestles end to end']),
    centre: choice('What stands at the back of the table among the food?', {
      none: 'Nothing but food.',
      vase: 'A vase of cut flowers.',
      photo: 'A small framed photograph of the person being remembered.',
      candles: 'A pair of candlesticks with lit candles.',
    }),
    left: choice('What has been left on the table besides the food?', {
      nothing: 'Nothing: it is exactly as the caterers set it.',
      plate: 'A single paper plate with a half-eaten sandwich and a crumpled napkin, put down mid-conversation and forgotten.',
      orders: 'A little pile of order-of-service booklets.',
      parcels: 'Foil-wrapped parcels of leftovers made up for people to take home, with the roll of foil beside them.',
      cards: 'A row of sympathy cards standing open.',
      glasses: 'A sherry bottle and a cluster of small empty glasses.',
    }),
    napkins: choice('What are the napkins like?', {
      white: 'Plain white paper napkins in a square stack.',
      black: 'Black napkins, chosen for the occasion.',
      floral: 'Pastel floral napkins left over from a christening.',
      festive: 'Bright red and green napkins, the only ones in the cupboard.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const e = a.eaten;
    const keep = () => random() > e * 0.94;
    const L = mix(1.3, 3.6, a.length), W = 0.86, T = 0.74, Y = T + 0.002;

    const steel = s.material('#9aa1a4', { metalness: 0.7, roughness: 0.35 });
    const dark = s.material('#2b2a2c');
    const boxes: Inst[] = [], discs: Inst[] = [], tris: Inst[] = [], lumps: Inst[] = [];
    const box = (p: V3, size: V3, c: THREE.ColorRepresentation, r?: V3) => boxes.push({ p, s: size, c, r });
    const disc = (p: V3, radius: number, h: number, c: THREE.ColorRepresentation, sz = 1, r?: V3) => discs.push({ p, s: [radius, h, radius * sz], c, r });
    const lump = (p: V3, size: V3, c: THREE.ColorRepresentation) => lumps.push({ p, s: size, c, r: [rnd(0, 3), rnd(0, 3), 0] });
    const jit = (hex: string, amount = 0.06) => new THREE.Color(hex).offsetHSL(rnd(-0.01, 0.01), 0, rnd(-amount, amount));

    // ---- table, legs and cloth ----
    const warmTint = new THREE.Color('#ffffff').lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffe9c4' : '#dfe8f2'), Math.abs(mood.warmth - 0.5) * 0.5);
    const clothHex = { paper: '#f6f4ee', linen: '#f3eee2', gingham: '#ffffff', mourning: '#4a2b45', bare: '#b48d5c' }[a.cloth];
    const clothColour = new THREE.Color(clothHex).multiply(a.cloth === 'gingham' || a.cloth === 'bare' ? new THREE.Color('#ffffff') : warmTint);
    const gingham = a.cloth === 'gingham' ? canvasTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#f7f3ea'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = mood.cheer > 0.45 ? 'rgba(200,40,45,0.55)' : 'rgba(60,80,120,0.55)';
      ctx.fillRect(0, 0, 32, 64); ctx.fillRect(0, 0, 64, 32);
    }) : null;
    if (gingham) { gingham.wrapS = gingham.wrapT = THREE.RepeatWrapping; }
    const clothMat = s.material(clothColour, { roughness: a.cloth === 'gingham' ? 0.45 : 0.9, side: THREE.DoubleSide, map: gingham });
    const legXs = L > 2.5 ? [-L / 2 + 0.28, -0.12, 0.12, L / 2 - 0.28] : [-L / 2 + 0.24, L / 2 - 0.24];
    if (a.cloth === 'bare') {
      const wood = s.material('#b48d5c'), woodDark = s.material('#8a6840');
      for (let i = 0; i < 4; i++) s.box([L, 0.03, W / 4 - 0.006], [0, T - 0.015, -W / 2 + W / 8 + i * W / 4], i % 2 ? wood : woodDark);
      for (const x of legXs) {
        for (const side of [-1, 1]) {
          s.rod([x - 0.2, 0, side * 0.34], [x, T - 0.06, side * 0.3], 0.022, woodDark);
          s.rod([x + 0.2, 0, side * 0.34], [x, T - 0.06, side * 0.3], 0.022, woodDark);
        }
        s.box([0.07, 0.06, W - 0.06], [x, T - 0.06, 0], wood);
        s.box([0.03, 0.03, W - 0.12], [x - 0.11, 0.33, 0], woodDark);
      }
      const runner = s.box([L * 0.94, 0.004, 0.42], [0, T + 0.001, 0], s.material('#f1eee4'));
      runner.rotation.y = rnd(-0.01, 0.01);
    } else {
      const top = s.box([L + 0.012, 0.016, W + 0.012], [0, T - 0.008, 0], clothMat);
      if (gingham) {
        const uv = top.geometry.getAttribute('uv');
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 0.09, uv.getY(i) * W / 0.09);
      }
      const drop = { paper: rnd(0.16, 0.26), linen: 0.66, gingham: rnd(0.26, 0.36), mourning: 0.7 }[a.cloth];
      const ripple = { paper: 0.008, linen: 0.04, gingham: 0.02, mourning: 0.045 }[a.cloth];
      s.mesh(skirt(L, W, T - 0.002, drop, ripple, a.cloth === 'paper' ? 0.14 : 0.03, rnd(0, 6)), clothMat);
      s.box([L - 0.04, 0.03, W - 0.04], [0, T - 0.032, 0], s.material('#8d8f8c'));
      for (const x of legXs) {
        for (const side of [-1, 1]) s.rod([x, 0, side * 0.34], [x, T - 0.04, side * 0.3], 0.014, steel);
        s.rod([x, 0.02, -0.34], [x, 0.02, 0.34], 0.014, steel);
        s.rod([x, 0.36, -0.34], [x, 0.36, 0.34], 0.01, steel);
      }
    }

    // Stains and crumbs sit on a clear overlay so the cloth pattern stays crisp beneath.
    const mess = canvasTexture(1024, 256, (ctx) => {
      const stains = Math.round(mood.wear * 14 + e * 4);
      for (let i = 0; i < stains; i++) {
        const x = rnd(0, 1024), y = rnd(0, 256), r = rnd(8, 26);
        ctx.strokeStyle = `rgba(120,80,40,${rnd(0.18, 0.4)})`; ctx.lineWidth = rnd(1.5, 4);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * rnd(1.2, 2)); ctx.stroke();
        if (random() < 0.4) { ctx.fillStyle = `rgba(140,90,50,${rnd(0.08, 0.2)})`; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r, rnd(0, 3), 0, 7); ctx.fill(); }
      }
      const crumbs = Math.round(e * e * 900 + mood.wear * 120);
      for (let i = 0; i < crumbs; i++) {
        ctx.fillStyle = pick(['rgba(190,140,80,0.9)', 'rgba(230,200,150,0.9)', 'rgba(120,80,50,0.85)']);
        ctx.fillRect(rnd(0, 1024), rnd(0, 256), rnd(1.5, 4), rnd(1.5, 4));
      }
    });
    const overlay = s.mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshStandardMaterial({ map: mess, transparent: true, depthWrite: false, roughness: 0.9 }), [0, T + 0.004, 0]);
    overlay.rotation.x = -Math.PI / 2;
    overlay.castShadow = false;

    // ---- the food ----
    // Food is drawn a quarter over life size so a sandwich still reads from across the hall.
    const K = 1.25, LF = L / K;
    const fd = new Sculpture(context);
    fd.root.scale.setScalar(K);
    fd.root.position.y = Y - Y * K;
    s.root.add(fd.root);
    const plate = (x: number, z: number, r: number, c: THREE.ColorRepresentation = '#f6f4ee', sz = 1) => {
      disc([x, Y + 0.004, z], r, 0.008, c, sz);
      disc([x, Y + 0.01, z], r * 0.78, 0.006, new THREE.Color(c).multiplyScalar(0.93), sz);
    };
    const sandwich = (x: number, y: number, z: number, turn: number, flat = false) => {
      tris.push({ p: [x, flat ? y + 0.018 : y, z], r: flat ? [-Math.PI / 2, turn, 0] : [0, turn, 0], c: random() < 0.38 ? '#c39a63' : '#fffaf0' });
    };
    const film = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.34, roughness: 0.08, metalness: 0.2, depthWrite: false });
    const foil = s.material('#cfd3d6', { metalness: 0.85, roughness: 0.32, flatShading: true });
    const wrapped = e < 0.22;

    const platter = (x: number, z: number) => {
      plate(x, z, 0.21, random() < 0.5 ? '#cdd1d3' : '#f6f4ee', 0.72);
      const lean = rnd(-0.15, 0.15);
      for (const dz of [-0.052, 0.052]) for (let i = 0; i < 8; i++) {
        if (!keep()) continue;
        const flat = e > 0.55 && random() < 0.5;
        sandwich(x + (i - 3.5) * 0.043 * Math.cos(lean), Y + 0.016, z + dz + (i - 3.5) * 0.043 * Math.sin(lean), Math.PI / 2 + lean + rnd(-0.12, 0.12) + (flat ? rnd(0, 3) : 0), flat);
      }
      if (wrapped) { const f = fd.ball([0.2, 0.05, 0.145], [x, Y + 0.05, z], film, 14); f.castShadow = false; }
    };
    const tiered = (x: number, z: number, kind: 'sandwich' | 'cake') => {
      const radii = [0.19, 0.14, 0.095], heights = [0, 0.15, 0.29];
      radii.forEach((r, tier) => {
        const y = Y + heights[tier];
        disc([x, y + 0.006, z], r, 0.012, '#f7f5ef');
        disc([x, y + 0.001, z], r * 0.4, 0.004, '#d8c58a');
        const n = Math.floor((Math.PI * 2 * r * 0.66) / (kind === 'sandwich' ? 0.042 : 0.058));
        for (let i = 0; i < n; i++) {
          if (!keep()) continue;
          const t = (i / n) * Math.PI * 2 + tier;
          const px = x + Math.cos(t) * r * 0.66, pz = z + Math.sin(t) * r * 0.66;
          if (kind === 'sandwich') sandwich(px, y + 0.012, pz, -t + Math.PI / 2 + rnd(-0.2, 0.2));
          else {
            disc([px, y + 0.026, pz], 0.022, 0.028, jit('#d9b06a'));
            disc([px, y + 0.046, pz], 0.025, 0.014, pick(['#f6c1d0', '#fff4e0', '#c8e6c0', '#f7e28c', '#6b3f26']));
          }
        }
      });
      fd.rod([x, Y, z], [x, Y + 0.4, z], 0.006, s.material('#c9b26b', { metalness: 0.8, roughness: 0.3 }));
      const loop = fd.ring(0.024, 0.005, [x, Y + 0.42, z], s.material('#c9b26b', { metalness: 0.8, roughness: 0.3 }));
      loop.rotation.y = rnd(0, 3);
    };
    const rolls = (x: number, z: number) => {
      plate(x, z, 0.17);
      const spots: V3[] = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) spots.push([(i - 1) * 0.085, 0.032, (j - 1) * 0.05]);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) spots.push([(i - 0.5) * 0.085, 0.066, (j - 0.5) * 0.05]);
      spots.push([0, 0.1, 0]);
      for (const [dx, dy, dz] of spots) {
        if (!keep()) continue;
        box([x + dx + rnd(-0.01, 0.01), Y + dy, z + dz], [0.078, 0.032, 0.04], jit('#cf9647', 0.08), [0, rnd(-0.25, 0.25), 0]);
      }
    };
    const bowl = (x: number, z: number, food: 'crisps' | 'salad' | 'slaw' | 'trifle') => {
      const body = pick(['#f4f1e8', '#cfe3ea', '#e9d7b8', '#f4f1e8']);
      fd.lathe([[0.001, 0.012], [0.06, 0.012], [0.07, 0], [0.085, 0.004], [0.14, 0.085], [0.155, 0.11], [0.146, 0.112], [0.128, 0.085], [0.07, 0.022], [0.001, 0.022]],
        s.material(body, { roughness: 0.3, side: THREE.DoubleSide }), [x, Y, z]);
      const level = mix(1, 0.2, e) * rnd(0.85, 1);
      const colour = { crisps: '#e9c35a', salad: '#6f9a45', slaw: '#efe6c6', trifle: '#e9a0b0' }[food];
      lump([x, Y + 0.03 + 0.07 * level, z], [0.085 + 0.05 * level, 0.02 + 0.035 * level, 0.085 + 0.05 * level], colour);
      if (food === 'salad' && level > 0.4) for (let i = 0; i < 5; i++) disc([x + rnd(-0.08, 0.08), Y + 0.105 + rnd(0, 0.02), z + rnd(-0.08, 0.08)], 0.018, 0.012, '#d2402f');
      if (food === 'trifle' && level > 0.4) disc([x, Y + 0.115, z], 0.1 * level, 0.02, '#fff6e6');
      if (wrapped) { const f = fd.cylinder(0.162, 0.158, 0.012, [x, Y + 0.118, z], film, 20); f.castShadow = false; }
      else if (random() < 0.6) fd.rod([x + 0.03, Y + 0.06, z], [x + 0.19, Y + 0.17, z + rnd(-0.08, 0.08)], 0.006, steel);
    };
    const traybake = (x: number, z: number) => {
      const turn = rnd(-0.12, 0.12), cs = Math.cos(turn), sn = Math.sin(turn);
      box([x, Y + 0.006, z], [0.38, 0.012, 0.28], '#a9afb2', [0, turn, 0]);
      const [base, icing] = pick([['#6b4024', '#3d2616'], ['#d8b062', '#f6efe0'], ['#e8d27a', '#fff8d8'], ['#7a4a2a', '#f3b7c6'], ['#c99a52', '#c99a52']] as const);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        if (!keep()) continue;
        const dx = (i - 1.5) * 0.088, dz = (j - 1) * 0.082;
        const px = x + dx * cs + dz * sn, pz = z - dx * sn + dz * cs;
        box([px, Y + 0.03, pz], [0.08, 0.036, 0.074], jit(base, 0.03), [0, turn, 0]);
        box([px, Y + 0.052, pz], [0.082, 0.008, 0.076], icing, [0, turn, 0]);
      }
      for (const side of [-1, 1]) box([x + side * 0.19 * cs, Y + 0.025, z - side * 0.19 * sn], [0.008, 0.05, 0.28], '#a9afb2', [0, turn, 0]);
      for (const side of [-1, 1]) box([x + side * 0.14 * sn, Y + 0.025, z + side * 0.14 * cs], [0.38, 0.05, 0.008], '#a9afb2', [0, turn, 0]);
    };
    const casserole = (x: number, z: number) => {
      const glaze = pick(['#c8552e', '#2f5d8a', '#ece6d6', '#6b8f4e', '#d9a23a', '#7a2f3a']);
      const stretch = rnd(1.15, 1.5), turn = rnd(-0.3, 0.3);
      const dish = fd.lathe([[0.001, 0], [0.1, 0], [0.128, 0.075], [0.142, 0.08], [0.142, 0.092], [0.118, 0.09], [0.094, 0.016], [0.001, 0.016]],
        s.material(glaze, { roughness: 0.28, side: THREE.DoubleSide }), [x, Y, z]);
      dish.scale.set(stretch, 1, 1); dish.rotation.y = turn;
      const level = mix(1, 0.15, e) * rnd(0.8, 1);
      const food = pick(['#c98a3c', '#b4472b', '#dcc36f', '#7f5a36', '#d9c9a0']);
      if (wrapped && random() < 0.7) {
        const lid = fd.mesh(new THREE.IcosahedronGeometry(1, 1), foil, [x, Y + 0.094, z]);
        lid.scale.set(0.15 * stretch, 0.014, 0.15); lid.rotation.y = turn;
      } else {
        const fill = fd.mesh(new THREE.IcosahedronGeometry(1, 2), s.material(food, { flatShading: true }), [x, Y + 0.02 + 0.06 * level, z]);
        fill.scale.set((0.095 + 0.03 * level) * stretch, 0.012, 0.095 + 0.03 * level); fill.rotation.y = turn;
        fd.rod([x + 0.02, Y + 0.04 + 0.05 * level, z + 0.02], [x + rnd(0.16, 0.24), Y + 0.17, z + rnd(0.05, 0.14)], 0.007, steel);
      }
      for (const side of [-1, 1]) box([x + side * 0.155 * stretch * Math.cos(turn), Y + 0.08, z - side * 0.155 * stretch * Math.sin(turn)], [0.04, 0.014, 0.07], glaze, [0, turn, 0]);
    };
    const cooker = (x: number, z: number) => {
      const shell = pick(['#8a1f1f', '#2c2c2e', '#c9ccce', '#e9e2cf']);
      fd.cylinder(0.16, 0.15, 0.19, [x, Y + 0.095, z], s.material(shell, { roughness: 0.35, metalness: shell === '#c9ccce' ? 0.7 : 0.1 }), 28);
      fd.cylinder(0.164, 0.164, 0.014, [x, Y + 0.193, z], dark, 28);
      const lid = fd.ball([0.155, 0.05, 0.155], [x, Y + 0.2, z], new THREE.MeshStandardMaterial({ color: '#dfe8ea', transparent: true, opacity: 0.55, roughness: 0.1 }), 20);
      lid.castShadow = true;
      disc([x, Y + 0.262, z], 0.022, 0.03, '#1f1f20');
      for (const side of [-1, 1]) box([x + side * 0.175, Y + 0.14, z], [0.04, 0.025, 0.08], '#1f1f20');
      disc([x, Y + 0.05, z + 0.152], 0.026, 0.02, '#1f1f20', 1, [Math.PI / 2, 0, 0]);
      box([x, Y + 0.008, z + 0.01], [0.3, 0.016, 0.3], '#1f1f20');
    };
    const cake = (x: number, z: number) => {
      fd.lathe([[0.001, 0], [0.085, 0], [0.075, 0.012], [0.02, 0.03], [0.02, 0.085], [0.16, 0.098], [0.16, 0.108], [0.001, 0.108]], s.material('#f5f3ee', { roughness: 0.25 }), [x, Y, z]);
      const [sponge, icing] = pick([['#e2bd76', '#fbf7ee'], ['#5a3520', '#3b2314'], ['#e7c98a', '#f4b9c8'], ['#4a2e22', '#f6f1e4'], ['#e9d48a', '#fff3b8']] as const);
      const sweep = Math.PI * 2 * mix(1, 0.14, e);
      const start = rnd(0, 6);
      const body = fd.mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.085, 28, 1, false, start, sweep), s.material(sponge, { side: THREE.DoubleSide }), [x, Y + 0.151, z]);
      body.rotation.y = 0;
      fd.mesh(new THREE.CylinderGeometry(0.121, 0.121, 0.016, 28, 1, false, start, sweep), s.material(icing, { side: THREE.DoubleSide, roughness: 0.4 }), [x, Y + 0.2, z]);
      fd.mesh(new THREE.CylinderGeometry(0.1195, 0.1195, 0.012, 28, 1, true, start, sweep), s.material('#f8f4ea', { side: THREE.DoubleSide }), [x, Y + 0.151, z]);
      const dots = Math.floor((sweep / (Math.PI * 2)) * 8);
      for (let i = 0; i < dots; i++) {
        const t = start + (i + 0.5) * (sweep / Math.max(dots, 1));
        disc([x + Math.sin(t) * 0.09, Y + 0.214, z + Math.cos(t) * 0.09], 0.013, 0.016, '#c22a3a');
      }
      if (e > 0.15) { fd.rod([x + 0.02, Y + 0.118, z + 0.05], [x + 0.2, Y + 0.125, z + 0.15], 0.006, steel); }
    };
    const boxedCake = (x: number, z: number) => {
      const turn = rnd(-0.3, 0.3);
      box([x, Y + 0.05, z], [0.26, 0.1, 0.26], '#f3efe6', [0, turn, 0]);
      box([x, Y + 0.101, z], [0.18, 0.004, 0.18], '#8fb7c4', [0, turn, 0]);
      box([x, Y + 0.06, z + 0.001], [0.264, 0.03, 0.264], pick(['#c7352f', '#2e6e4b', '#274d8c']), [0, turn, 0]);
    };
    const biscuits = (x: number, z: number) => {
      plate(x, z, 0.15);
      const n = 14;
      for (let i = 0; i < n; i++) {
        if (!keep()) continue;
        const t = (i / n) * Math.PI * 2;
        const c = pick(['#d2a55e', '#c9964c', '#5d3a22', '#e3c58d']);
        if (random() < 0.3) box([x + Math.cos(t) * 0.085, Y + 0.022, z + Math.sin(t) * 0.085], [0.07, 0.012, 0.028], '#f0b8c4', [0.2, -t, 0]);
        else disc([x + Math.cos(t) * 0.085, Y + 0.022, z + Math.sin(t) * 0.085], 0.03, 0.01, c, 1, [0.3, -t + Math.PI / 2, 0]);
      }
      if (keep()) for (let i = 0; i < 4; i++) disc([x, Y + 0.02 + i * 0.011, z], 0.03, 0.01, '#5d3a22');
    };
    const coldcuts = (x: number, z: number) => {
      plate(x, z, 0.22, '#cdd1d3', 0.72);
      lump([x, Y + 0.018, z], [0.18, 0.008, 0.12], '#7fae52');
      for (let i = 0; i < 7; i++) if (keep()) box([x - 0.13 + i * 0.042, Y + 0.036, z - 0.05], [0.036, 0.022, 0.08], jit('#e79aa0'), [0.25, rnd(-0.1, 0.1), 0]);
      for (let i = 0; i < 12; i++) if (keep()) box([x + rnd(-0.14, 0.02), Y + 0.034 + rnd(0, 0.02), z + rnd(0.02, 0.1)], [0.024, 0.024, 0.024], pick(['#f0c64a', '#f3d98a', '#e89a3a']), [0, rnd(0, 3), 0]);
      for (let i = 0; i < 6; i++) if (keep()) disc([x + rnd(0.05, 0.15), Y + 0.034, z + rnd(0, 0.09)], 0.02, 0.018, '#cf3b2c');
    };

    const menus: Record<typeof a.spread, readonly (() => (x: number, z: number) => void)[]> = {
      triangles: [() => (x, z) => tiered(x, z, 'sandwich'), () => platter, () => rolls, () => (x, z) => bowl(x, z, 'crisps'), () => platter, () => traybake, () => rolls, () => platter],
      potluck: [() => casserole, () => cooker, () => (x, z) => bowl(x, z, 'salad'), () => casserole, () => traybake, () => casserole, () => (x, z) => bowl(x, z, 'slaw'), () => rolls],
      sweets: [() => cake, () => (x, z) => tiered(x, z, 'cake'), () => traybake, () => biscuits, () => cake, () => traybake, () => (x, z) => bowl(x, z, 'trifle'), () => biscuits],
      deli: [() => coldcuts, () => (x, z) => bowl(x, z, 'slaw'), () => platter, () => coldcuts, () => (x, z) => bowl(x, z, 'salad'), () => rolls, () => cake, () => coldcuts],
      meagre: [() => boxedCake, () => biscuits, () => (x, z) => bowl(x, z, 'crisps')],
    };
    const menu = menus[a.spread];
    const from = -LF / 2 + 0.52, to = LF / 2 - 0.26;
    const fit = Math.max(1, Math.floor((to - from) / 0.4) + 1);
    const count = a.spread === 'meagre' ? Math.min(fit, 2 + (mood.density > 0.6 ? 1 : 0)) : Math.max(1, Math.min(8, Math.round(fit * mix(0.78, 1.15, mood.density))));
    const order = menu.map((_m, i) => i);
    // Keep the signature dish first, shuffle the rest so two tables with one menu differ.
    for (let i = order.length - 1; i > 1; i--) { const j = 1 + Math.floor(random() * i); [order[i], order[j]] = [order[j], order[i]]; }
    const hasCentre = a.centre !== 'none';
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? (from + to) / 2 : from + ((to - from) * i) / (count - 1) + rnd(-0.03, 0.03);
      const z = hasCentre && Math.abs(x) < 0.3 ? 0.14 : rnd(-0.06, 0.08);
      menu[order[i % order.length]]()(x, z);
    }

    // ---- plates and napkins at the head of the line ----
    const hx = -LF / 2 + 0.17;
    const stack = Math.round(mix(16, 3, e) * rnd(0.8, 1.1));
    disc([hx, Y + stack * 0.003, -0.16], 0.105, stack * 0.006, '#f5f3ed');
    disc([hx, Y + stack * 0.006 + 0.003, -0.16], 0.085, 0.004, '#e4e1d9');
    const napkinColours = { white: ['#f7f5f0', '#f7f5f0'], black: ['#1d1c1f', '#2a2930'], floral: ['#f3c7d3', '#cfe5c8'], festive: ['#c32b2b', '#2b7a45'] }[a.napkins];
    const sheets = Math.round(mix(9, 2, e));
    for (let i = 0; i < sheets; i++) box([hx + rnd(-0.006, 0.006), Y + 0.006 + i * 0.011, 0.14 + rnd(-0.006, 0.006)], [0.16, 0.011, 0.16], napkinColours[i % 2], [0, rnd(-0.12, 0.12) + i * 0.03, 0]);
    if (e > 0.5) for (let i = 0; i < Math.round(e * 5); i++) lump([rnd(-LF / 2 + 0.2, LF / 2 - 0.2), Y + 0.02, pick([-0.3, 0.3]) + rnd(-0.04, 0.04)], [0.035, 0.022, 0.03], napkinColours[i % 2]);

    // ---- centrepiece ----
    const cz = -0.25;
    if (a.centre === 'vase') {
      fd.lathe([[0.001, 0], [0.05, 0], [0.075, 0.07], [0.06, 0.17], [0.035, 0.22], [0.05, 0.26], [0.001, 0.26]], s.material(pick(['#e9eef0', '#3f6f8a', '#f2ead7']), { roughness: 0.2 }), [0, Y, cz]);
      const green = s.material('#4f7a3a');
      const bright = mood.cheer > 0.55;
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2 + rnd(-0.3, 0.3), reach = rnd(0.06, 0.16), h = rnd(0.42, 0.58);
        const tip: V3 = [Math.cos(t) * reach, Y + h, cz + Math.sin(t) * reach * 0.7];
        fd.rod([0, Y + 0.22, cz], tip, 0.004, green);
        lump(tip, [0.04, 0.035, 0.04], bright ? pick(['#e8432e', '#f2b632', '#e96aa0', '#8c5cc4']) : pick(['#fbf9f2', '#f4efdf', '#f1e3ea']));
        if (random() < 0.6) lump([tip[0] * 0.6, tip[1] - 0.12, cz + (tip[2] - cz) * 0.6], [0.045, 0.012, 0.025], '#5b8a41');
      }
    } else if (a.centre === 'photo') {
      const portrait = canvasTexture(128, 160, (ctx) => {
        ctx.fillStyle = mood.warmth > 0.5 ? '#c9b18c' : '#aab3b8'; ctx.fillRect(0, 0, 128, 160);
        ctx.fillStyle = '#4a4744'; ctx.beginPath(); ctx.ellipse(64, 170, 54, 60, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#d8b79a'; ctx.beginPath(); ctx.ellipse(64, 72, 26, 32, 0, 0, 7); ctx.fill();
        ctx.fillStyle = pick(['#e8e6e0', '#5b4a3c', '#2c2a28']); ctx.beginPath(); ctx.ellipse(64, 52, 29, 20, 0, Math.PI, 0); ctx.fill();
      });
      const frame = fd.box([0.2, 0.25, 0.018], [0, Y + 0.122, cz], s.material(pick(['#2a2422', '#b89a52', '#d9d6cf']), { roughness: 0.35 }));
      frame.rotation.x = -0.18;
      const face = fd.mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.6 }), [0, Y + 0.122, cz + 0.011]);
      face.rotation.x = -0.18;
      fd.rod([0, Y + 0.2, cz - 0.02], [0, Y, cz - 0.1], 0.006, dark);
    } else if (a.centre === 'candles') {
      const brass = s.material('#c2a14e', { metalness: 0.8, roughness: 0.3 });
      for (const side of [-1, 1]) {
        const x = side * 0.2;
        fd.lathe([[0.001, 0], [0.055, 0], [0.05, 0.015], [0.014, 0.03], [0.02, 0.09], [0.012, 0.13], [0.03, 0.155], [0.03, 0.165], [0.001, 0.165]], brass, [x, Y, cz]);
        const tall = rnd(0.12, 0.24);
        fd.cylinder(0.012, 0.012, tall, [x, Y + 0.165 + tall / 2, cz], s.material('#f7f1df'), 10);
        const flame = fd.ball([0.012, 0.028, 0.012], [x, Y + 0.19 + tall, cz], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 1.6 }), 10);
        flame.castShadow = false;
      }
    }

    // ---- what was left behind ----
    const rx = LF / 2 - 0.2;
    if (a.left === 'plate') {
      const px = rnd(-LF * 0.25, LF * 0.3);
      disc([px, Y + 0.005, 0.29], 0.085, 0.01, '#f8f6f0');
      sandwich(px - 0.01, Y + 0.012, 0.29, rnd(0, 3), true);
      lump([px + 0.07, Y + 0.03, 0.31], [0.04, 0.028, 0.035], napkinColours[0]);
      box([px + 0.02, Y + 0.014, 0.33], [0.14, 0.004, 0.012], '#e9e9e4', [0, rnd(-0.5, 0.5), 0]);
    } else if (a.left === 'orders') {
      for (let i = 0; i < 5; i++) {
        const turn = rnd(-0.25, 0.25);
        box([rx + rnd(-0.01, 0.01), Y + 0.004 + i * 0.006, 0.2], [0.15, 0.006, 0.21], '#f3efe3', [0, turn, 0]);
        if (i === 4) { box([rx, Y + 0.031, 0.17], [0.07, 0.002, 0.085], '#8b8f96', [0, turn, 0]); box([rx, Y + 0.031, 0.26], [0.1, 0.002, 0.012], '#35353a', [0, turn, 0]); }
      }
    } else if (a.left === 'parcels') {
      for (let i = 0; i < 6; i++) {
        const p = fd.mesh(new THREE.IcosahedronGeometry(1, 1), foil, [rx + rnd(-0.14, 0.1), Y + 0.03 + (i > 3 ? 0.05 : 0), rnd(-0.26, 0.26)]);
        p.scale.set(rnd(0.06, 0.09), 0.032, rnd(0.05, 0.075)); p.rotation.y = rnd(0, 3);
      }
      box([rx - 0.26, Y + 0.03, -0.28], [0.34, 0.055, 0.055], '#2b55a4', [0, rnd(-0.2, 0.2), 0]);
    } else if (a.left === 'cards') {
      const n = Math.max(3, Math.round(LF / 0.5));
      for (let i = 0; i < n; i++) {
        const x = -LF / 2 + 0.5 + i * ((LF - 0.8) / Math.max(n - 1, 1)) + rnd(-0.04, 0.04), turn = rnd(-0.35, 0.35), h = rnd(0.13, 0.18);
        const c = pick(['#f6f2e8', '#e6eef3', '#f3e4ea', '#eef0dc', '#d9d2ea']);
        box([x, Y + h / 2, -0.31 + Math.sin(turn) * 0.01], [0.115, h, 0.004], c, [-0.22, turn, 0]);
        box([x, Y + h / 2, -0.345], [0.115, h, 0.004], c, [0.22, turn, 0]);
        box([x, Y + h * 0.55, -0.303], [0.06, h * 0.4, 0.003], pick(['#8fa7b8', '#c59aa8', '#9aae8a', '#b8a36a']), [-0.22, turn, 0]);
      }
    } else if (a.left === 'glasses') {
      fd.lathe([[0.001, 0], [0.036, 0], [0.036, 0.17], [0.014, 0.23], [0.014, 0.29], [0.001, 0.29]], s.material('#4a2a18', { roughness: 0.15 }), [rx, Y, -0.24]);
      box([rx, Y + 0.09, -0.24 + 0.0365], [0.05, 0.07, 0.002], '#efe6c9');
      const glass = new THREE.MeshStandardMaterial({ color: '#dfeef0', transparent: true, opacity: 0.6, roughness: 0.05 });
      for (let i = 0; i < 6; i++) {
        const g = fd.lathe([[0.001, 0], [0.022, 0], [0.004, 0.008], [0.004, 0.05], [0.022, 0.07], [0.024, 0.1]], glass, [rx - 0.1 + rnd(-0.1, 0.12), Y, -0.1 + rnd(-0.1, 0.14)]);
        (g.material as THREE.Material).side = THREE.DoubleSide;
        if (random() < 0.25) { g.rotation.z = Math.PI / 2; g.position.y = Y + 0.024; }
      }
    }

    // ---- under the table, when the cloth is short enough to see ----
    if ((a.cloth === 'paper' || a.cloth === 'gingham' || a.cloth === 'bare') && mood.density > 0.45) {
      const ux = rnd(-L * 0.2, L * 0.2);
      s.box([0.42, 0.3, 0.32], [ux, 0.15, rnd(-0.1, 0.1)], s.material('#b89364')).rotation.y = rnd(-0.3, 0.3);
      if (L > 2) {
        s.box([0.46, 0.3, 0.3], [ux + 0.62, 0.15, 0], s.material('#2d6fb0'));
        s.box([0.48, 0.06, 0.32], [ux + 0.62, 0.33, 0], s.material('#f1f1ee'));
      }
    }

    instances(fd, new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { roughness: 0.75 }), boxes);
    instances(fd, new THREE.CylinderGeometry(1, 1, 1, 18), s.material('#ffffff', { roughness: 0.55 }), discs);
    instances(fd, new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.85, flatShading: true }), lumps);
    const tri = new THREE.Shape();
    tri.moveTo(-0.056, 0); tri.lineTo(0.056, 0); tri.lineTo(0, 0.062); tri.closePath();
    const prism = new THREE.ExtrudeGeometry(tri, { depth: 0.034, bevelEnabled: false });
    prism.translate(0, 0, -0.017);
    instances(fd, prism, [s.material('#ffffff', { roughness: 0.9 }), s.material(pick(['#e7b9a8', '#f0dc8c', '#d6c9a0']), { roughness: 0.8 })], tris);

    return s.finish();
  },
});
