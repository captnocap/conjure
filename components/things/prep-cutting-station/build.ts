import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
interface Bit { p: V3; r?: V3; s?: V3 | number; c?: THREE.ColorRepresentation }

function strew(parent: THREE.Object3D, geometry: THREE.BufferGeometry, bits: readonly Bit[], roughness = 0.75) {
  if (!bits.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness }), bits.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), po = new THREE.Vector3();
  bits.forEach((bit, i) => {
    e.set(...(bit.r ?? [0, 0, 0]));
    q.setFromEuler(e);
    if (typeof bit.s === 'number') sc.setScalar(bit.s); else sc.set(...(bit.s ?? [1, 1, 1]));
    m.compose(po.set(...bit.p), q, sc);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(bit.c ?? '#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function paperTexture(kind: 'recipe' | 'list' | 'allergy' | 'photo', random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = kind === 'list' ? '#f6efc4' : '#f7f4ea';
  ctx.fillRect(0, 0, 192, 256);
  if (kind === 'photo') {
    ctx.fillStyle = '#8fc0de'; ctx.fillRect(14, 14, 164, 180);
    ctx.fillStyle = '#6fa85a'; ctx.fillRect(14, 140, 164, 54);
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath(); ctx.arc(76, 104, 26, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(124, 118, 19, 0, 7); ctx.fill();
    ctx.fillStyle = '#c8452f'; ctx.fillRect(52, 130, 48, 64);
    ctx.fillStyle = '#e8c531'; ctx.fillRect(108, 137, 34, 57);
  } else if (kind === 'allergy') {
    ctx.fillStyle = '#c4201a'; ctx.fillRect(0, 0, 192, 70);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ALLERGY', 96, 50);
    ctx.fillStyle = '#c4201a'; ctx.font = 'bold 44px monospace';
    ctx.fillText(`TBL ${1 + Math.floor(random() * 30)}`, 96, 130);
    ctx.fillText(['NUTS', 'SHELL', 'GLUTEN', 'DAIRY'][Math.floor(random() * 4)], 96, 200);
  } else {
    ctx.fillStyle = '#23262b';
    ctx.fillRect(18, 18, kind === 'recipe' ? 120 : 90, 14);
    ctx.strokeStyle = kind === 'recipe' ? '#3a3d44' : '#1f3f8f';
    ctx.lineWidth = 5;
    for (let y = 58; y < 240; y += 22) {
      const end = 60 + random() * 110;
      ctx.beginPath(); ctx.moveTo(kind === 'list' ? 40 : 18, y);
      if (kind === 'recipe') ctx.lineTo(end, y); else for (let x = 40; x < end; x += 8) ctx.lineTo(x, y + (random() - 0.5) * 8);
      ctx.stroke();
      if (kind === 'list') {
        ctx.strokeRect(16, y - 8, 14, 14);
        if (random() < 0.55) { ctx.save(); ctx.strokeStyle = '#c4201a'; ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(end + 8, y - 3); ctx.stroke(); ctx.restore(); }
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    chop: choice('What is being cut on the board right now?', {
      onions: 'Onions: a halved one and a growing heap of fine white dice.',
      herbs: 'A bunch of herbs and a green drift of chopped leaves.',
      fish: 'A whole silver fish, half broken down into pink fillets.',
      carrots: 'Carrots, with a neat line of orange coins.',
      meat: 'A slab of red meat being cubed.',
      tomatoes: 'Ripe tomatoes, halves and slices, juice on the board.',
      lemons: 'Lemons cut into wedges for the bar and the pass.',
      nothing: 'Nothing. The board is wiped and the knife laid square: ready, or finished.',
    }),
    board: choice('What is the cutting board?', {
      wood: 'A thick end-grain butcher block, scarred and oiled.',
      white: 'A big white poly board, scored grey with cuts.',
      green: 'A green colour-coded board for vegetables.',
      red: 'A red colour-coded board for raw meat.',
      blue: 'A blue colour-coded board for fish.',
    }),
    order: score('How orderly is the mise en place?', ['Chaos: tipped tubs, lids off, scraps everywhere', 'Scrappy but working', 'Tidy', 'Immaculate: everything squared, labelled, facing forward']),
    knives: choice('What hangs on the magnetic strip?', {
      one: "A single chef's knife; the rest are in use or stolen.",
      kit: 'A full personal kit: chef, slicer, boning, paring, bread, steel.',
      butcher: 'A heavy cleaver, a scimitar and a bone saw.',
    }),
    paper: choice('What is taped up on the backsplash?', {
      none: 'Nothing.',
      recipe: 'A printed recipe, splashed.',
      list: 'A handwritten prep list on yellow paper, half crossed off.',
      allergy: 'A red ALLERGY alert for a table.',
      photo: 'A snapshot of someone at home.',
    }),
    plasters: choice('Is the plaster box out?', {
      none: 'No, no sign of it.',
      closed: 'A blue plaster box sits ready at the corner.',
      open: 'The box is torn open, blue plasters spilled, a red spot on the towel.',
    }),
    under: choice('What is kept under the table?', {
      nothing: 'A bare lower shelf.',
      tubs: 'Stacked grey bus tubs and a white bucket.',
      sacks: 'Net sacks of onions and potatoes.',
      pots: 'Big stock pots nested upside down.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.5, D = 0.7, TOP = 0.9;
    const mess = 1 - a.order;
    const steel = s.material('#c5caca', { metalness: 0.78, roughness: 0.32 });
    const steelDull = s.material('#9ba0a1', { metalness: 0.7, roughness: 0.48 });
    const dark = s.material('#1f2123', { roughness: 0.65 });
    const j = (amount: number) => (random() - 0.5) * amount;

    // Table.
    s.box([W, 0.04, D], [0, TOP - 0.02, 0], steel);
    s.box([W, 0.06, 0.02], [0, TOP - 0.07, D / 2 - 0.01], steelDull);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.cylinder(0.022, 0.022, TOP - 0.04, [x * (W / 2 - 0.05), (TOP - 0.04) / 2, z * (D / 2 - 0.05)], steel, 12);
      s.cylinder(0.03, 0.034, 0.03, [x * (W / 2 - 0.05), 0.015, z * (D / 2 - 0.05)], dark, 12);
    }
    s.box([W - 0.08, 0.02, D - 0.08], [0, 0.26, 0], steelDull);
    // Backsplash with a magnetic strip.
    const backZ = -D / 2 + 0.01, backTop = TOP + 0.5;
    s.box([W, 0.5, 0.02], [0, TOP + 0.25, backZ], steel);
    s.box([W, 0.02, 0.05], [0, backTop, backZ + 0.015], steelDull);
    const stripY = TOP + 0.36, stripX = -0.34;
    s.box([0.66, 0.045, 0.016], [stripX, stripY, backZ + 0.018], dark);

    // Knives.
    const bladeMat = s.material('#e3e7e8', { metalness: 0.92, roughness: 0.16 });
    const handleMat = s.material(mood.cheer > 0.6 ? '#7a4a2a' : '#191a1c', { roughness: 0.6 });
    const knife = (length: number, depth: number, kind: 'chef' | 'cleaver' | 'thin' | 'steel' | 'saw') => {
      const g = new THREE.Group();
      const shape = new THREE.Shape();
      if (kind === 'cleaver') { shape.moveTo(0, 0); shape.lineTo(length, 0); shape.lineTo(length, -depth); shape.lineTo(0, -depth); }
      else if (kind === 'saw') { shape.moveTo(0, 0); shape.lineTo(length, 0); shape.lineTo(length, -depth); shape.lineTo(0, -depth); }
      else { shape.moveTo(0, 0); shape.lineTo(length * 0.75, 0); shape.quadraticCurveTo(length * 0.95, -depth * 0.2, length, -depth * 0.75); shape.quadraticCurveTo(length * 0.6, -depth, 0, -depth); }
      shape.closePath();
      const blade = new THREE.Mesh(kind === 'steel' ? new THREE.CylinderGeometry(0.005, 0.004, length, 8).rotateZ(Math.PI / 2).translate(length / 2, -0.008, 0) : new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false }), bladeMat);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.115, kind === 'thin' ? 0.02 : 0.026, 0.02), handleMat);
      handle.position.set(-0.057, kind === 'steel' ? -0.008 : -0.014, 0.0015);
      blade.castShadow = handle.castShadow = true;
      g.add(blade, handle);
      if (kind === 'saw') { const bow = new THREE.Mesh(new THREE.TorusGeometry(length / 2, 0.006, 6, 16, Math.PI), bladeMat); bow.position.set(length / 2, 0, 0.0015); bow.scale.y = 0.35; g.add(bow); }
      return g;
    };
    const kit: [number, number, 'chef' | 'cleaver' | 'thin' | 'steel' | 'saw'][] = a.knives === 'one' ? [[0.24, 0.05, 'chef']]
      : a.knives === 'kit' ? [[0.25, 0.052, 'chef'], [0.28, 0.03, 'thin'], [0.16, 0.022, 'thin'], [0.09, 0.02, 'thin'], [0.24, 0.032, 'thin'], [0.26, 0, 'steel']]
      : [[0.2, 0.1, 'cleaver'], [0.3, 0.05, 'chef'], [0.32, 0.03, 'saw']];
    const slots = kit.length;
    // The chef's knife comes off the strip when something is being cut.
    const working = a.chop !== 'nothing' || a.knives !== 'one';
    kit.forEach(([length, depth, kind], i) => {
      if (i === 0 && a.chop !== 'nothing') return;
      const g = knife(length, depth, kind);
      g.position.set(stripX - 0.27 + (i + 0.5) * (0.54 / slots) + j(0.01), stripY + 0.02, backZ + 0.028);
      g.rotation.z = -Math.PI / 2 + j(0.04 + mess * 0.12);
      s.root.add(g);
    });
    void working;

    // Paper taped up.
    if (a.paper !== 'none') {
      const photo = a.paper === 'photo';
      const sheet = s.mesh(new THREE.PlaneGeometry(photo ? 0.12 : 0.2, photo ? 0.15 : 0.27), new THREE.MeshStandardMaterial({ map: paperTexture(a.paper, random), roughness: 0.9 }), [0.33 + j(0.1), TOP + 0.27 + j(0.04), backZ + 0.013]);
      sheet.rotation.z = j(0.16);
      const tape = s.material('#3c6fb0', { roughness: 0.8 });
      s.box([0.05, 0.018, 0.002], [sheet.position.x, sheet.position.y + (photo ? 0.075 : 0.135), backZ + 0.015], tape).rotation.z = sheet.rotation.z + j(0.2);
    }

    // Cutting board on a damp towel.
    const boardTint = { wood: '#b07a45', white: '#eeeee8', green: '#3f9a4c', red: '#c9382d', blue: '#2f6fc0' }[a.board];
    const bw = 0.62, bd = 0.42, bh = a.board === 'wood' ? 0.065 : 0.028;
    const bx = -0.2, bz = 0.08;
    const towelMat = s.material('#e9ebe6', { roughness: 1 });
    s.box([bw - 0.1, 0.006, bd + 0.05], [bx, TOP + 0.003, bz], towelMat);
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 256; boardCanvas.height = 176;
    const bctx = boardCanvas.getContext('2d')!;
    bctx.fillStyle = boardTint;
    bctx.fillRect(0, 0, 256, 176);
    if (a.board === 'wood') for (let x = 0; x < 8; x++) for (let y = 0; y < 6; y++) { bctx.fillStyle = `rgba(${random() < 0.5 ? '70,40,15' : '230,190,130'},${0.08 + random() * 0.22})`; bctx.fillRect(x * 32, y * 30, 31, 29); }
    bctx.strokeStyle = a.board === 'wood' ? 'rgba(60,35,15,0.5)' : 'rgba(60,60,60,0.35)';
    bctx.lineWidth = 1;
    for (let i = 0; i < 20 + mood.wear * 140; i++) { const x = random() * 256, y = random() * 176, l = 10 + random() * 50, t = (random() - 0.5) * 0.8; bctx.beginPath(); bctx.moveTo(x, y); bctx.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l); bctx.stroke(); }
    const boardMap = new THREE.CanvasTexture(boardCanvas);
    boardMap.colorSpace = THREE.SRGBColorSpace;
    const sideMat = s.material(boardTint, { roughness: 0.7 });
    const topMat = new THREE.MeshStandardMaterial({ map: boardMap, roughness: 0.75 });
    const board = s.mesh(new THREE.BoxGeometry(bw, bh, bd), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat] as unknown as THREE.Material, [bx, TOP + 0.006 + bh / 2, bz]);
    board.rotation.y = j(mess * 0.12);
    const BY = TOP + 0.006 + bh;

    // What is being cut.
    const cube = new THREE.BoxGeometry(1, 1, 1), round = new THREE.SphereGeometry(1, 16, 12), disc = new THREE.CylinderGeometry(1, 1, 1, 16), half = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lump = new THREE.IcosahedronGeometry(1, 1), wedge = new THREE.SphereGeometry(1, 6, 10, 0, Math.PI / 3);
    const cubes: Bit[] = [], rounds: Bit[] = [], discs: Bit[] = [], halves: Bit[] = [], lumps: Bit[] = [], wedges: Bit[] = [];
    const heap = (cx: number, cz: number, n: number, radius: number, size: V3, tints: string[], list = cubes) => {
      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(random()) * radius, t = random() * 6.3;
        list.push({ p: [cx + Math.cos(t) * r, BY + size[1] * 0.5 + (1 - r / radius) * radius * 0.35 * random(), cz + Math.sin(t) * r * 0.8], r: [random() * 3, random() * 3, random() * 3], s: size, c: tints[Math.floor(random() * tints.length)] });
      }
    };
    const L = bx - 0.16, R = bx + 0.14;
    const amount = mix(0.5, 1.3, mood.density);
    if (a.chop === 'onions') {
      halves.push({ p: [L, BY, bz + 0.02], s: [0.05, 0.045, 0.05], c: '#f4eedc' }, { p: [L - 0.08, BY, bz - 0.1], s: [0.048, 0.043, 0.048], c: '#e9d9b8' });
      rounds.push({ p: [L - 0.02, BY + 0.045, bz + 0.14], s: [0.048, 0.045, 0.048], c: '#c98a3a' });
      heap(R, bz + 0.02, Math.round(110 * amount), 0.1, [0.012, 0.01, 0.012], ['#fbf8ea', '#f1ecd4', '#e9e2c2']);
      for (let i = 0; i < 6; i++) discs.push({ p: [L + j(0.2), BY + 0.002, bz + j(0.3)], r: [0, random() * 3, 0], s: [0.03, 0.002, 0.018], c: '#c98a3a' });
    } else if (a.chop === 'herbs') {
      for (let i = 0; i < 14; i++) cubes.push({ p: [L + j(0.03), BY + 0.012 + random() * 0.015, bz + j(0.03)], r: [0, 0.4 + j(0.25), 0], s: [0.004, 0.004, 0.2], c: '#5a8f3a' });
      for (let i = 0; i < 16; i++) lumps.push({ p: [L - 0.05 + j(0.07), BY + 0.02 + random() * 0.02, bz - 0.08 + j(0.07)], r: [random() * 3, random() * 3, 0], s: [0.028, 0.006, 0.02], c: ['#3f8a35', '#56a544', '#2f6f2a'][i % 3] });
      heap(R, bz + 0.02, Math.round(160 * amount), 0.11, [0.012, 0.003, 0.008], ['#3f8a35', '#56a544', '#2f6f2a', '#6fb650']);
    } else if (a.chop === 'fish') {
      rounds.push({ p: [L + 0.03, BY + 0.03, bz - 0.06], r: [0, 0.15, 0], s: [0.17, 0.03, 0.055], c: '#aebbc4' }, { p: [L - 0.09, BY + 0.034, bz - 0.078], s: [0.012, 0.012, 0.012], c: '#15181a' });
      lumps.push({ p: [L + 0.22, BY + 0.03, bz - 0.09], r: [0, 0.15, Math.PI / 2], s: [0.05, 0.006, 0.04], c: '#8f9ea8' });
      rounds.push({ p: [R + 0.02, BY + 0.012, bz + 0.1], r: [0, -0.2, 0], s: [0.13, 0.012, 0.04], c: '#ef9a8a' }, { p: [R + 0.05, BY + 0.012, bz + 0.0], r: [0, 0.1, 0], s: [0.12, 0.012, 0.038], c: '#f2a898' });
      for (let i = 0; i < 5; i++) discs.push({ p: [L + j(0.3), BY + 0.001, bz + 0.12 + j(0.08)], s: [0.012 + random() * 0.02, 0.002, 0.01 + random() * 0.015], c: '#b9c4cb' });
    } else if (a.chop === 'carrots') {
      for (let i = 0; i < 3; i++) {
        const z = bz - 0.1 + i * 0.05;
        const c = s.cylinder(0.006, 0.019, 0.2, [L + 0.02 + j(0.03), BY + 0.019, z], s.material('#e8872b'), 10);
        c.rotation.z = Math.PI / 2 + j(0.2); c.rotation.y = j(0.3);
        for (let k = 0; k < 3; k++) cubes.push({ p: [L + 0.14 + random() * 0.05, BY + 0.02, z + j(0.03)], r: [0, j(0.8), j(0.6)], s: [0.09, 0.004, 0.008], c: '#4f9a3a' });
      }
      for (let i = 0; i < Math.round(22 * amount); i++) discs.push({ p: [R - 0.08 + (i % 11) * 0.019, BY + 0.004 + Math.floor(i / 11) * 0.007, bz + 0.08 + Math.floor(i / 11) * 0.03 + j(0.008)], r: [j(0.3), 0, j(0.5)], s: [0.016, 0.006, 0.016], c: i % 3 ? '#f0953a' : '#e07a22' });
    } else if (a.chop === 'meat') {
      lumps.push({ p: [L + 0.02, BY + 0.03, bz], r: [0, 0.3, 0], s: [0.12, 0.03, 0.08], c: '#a8262a' }, { p: [L + 0.02, BY + 0.05, bz - 0.04], r: [0, 0.3, 0], s: [0.09, 0.012, 0.02], c: '#f2e3d2' });
      heap(R, bz + 0.03, Math.round(26 * amount), 0.09, [0.028, 0.026, 0.028], ['#a8262a', '#b9343a', '#8f1f24']);
      discs.push({ p: [L + 0.03, BY + 0.001, bz + 0.03], s: [0.15, 0.002, 0.1], c: '#7a1a1c' });
    } else if (a.chop === 'tomatoes') {
      for (let i = 0; i < 3; i++) rounds.push({ p: [L - 0.05 + i * 0.07 + j(0.02), BY + 0.035, bz - 0.1 + j(0.05)], s: [0.04, 0.035, 0.04], c: '#d6362a' });
      halves.push({ p: [L + 0.03, BY, bz + 0.07], s: [0.04, 0.035, 0.04], c: '#e0453a' });
      for (let i = 0; i < Math.round(9 * amount); i++) discs.push({ p: [R - 0.08 + i * 0.022, BY + 0.006 + i * 0.001, bz + 0.03 + j(0.01)], r: [0, 0, 0.35], s: [0.036, 0.007, 0.036], c: i % 2 ? '#e0453a' : '#ef6a55' });
      discs.push({ p: [bx, BY + 0.001, bz + 0.04], s: [0.16, 0.002, 0.09], c: '#e58a7a' });
    } else if (a.chop === 'lemons') {
      for (let i = 0; i < 3; i++) rounds.push({ p: [L - 0.04 + i * 0.075 + j(0.02), BY + 0.032, bz - 0.09 + j(0.05)], r: [0, random() * 3, 0], s: [0.045, 0.033, 0.033], c: '#f2d532' });
      halves.push({ p: [L + 0.04, BY, bz + 0.08], s: [0.034, 0.04, 0.034], c: '#f6e37a' });
      for (let i = 0; i < Math.round(12 * amount); i++) wedges.push({ p: [R - 0.07 + (i % 4) * 0.05 + j(0.015), BY + 0.012, bz - 0.04 + Math.floor(i / 4) * 0.07 + j(0.015)], r: [Math.PI / 2, 0, random() * 6], s: [0.034, 0.045, 0.034], c: i % 2 ? '#f2d532' : '#f6e37a' });
    }
    strew(s.root, cube, cubes); strew(s.root, round, rounds, 0.45); strew(s.root, disc, discs); strew(s.root, half, halves, 0.5); strew(s.root, lump, lumps); strew(s.root, wedge, wedges, 0.5);

    // The knife in use.
    if (a.chop !== 'nothing') {
      const g = knife(0.25, 0.052, a.knives === 'butcher' ? 'cleaver' : 'chef');
      g.rotation.set(-Math.PI / 2, 0, 0);
      const holder = new THREE.Group();
      holder.add(g);
      holder.position.set(bx + 0.05, BY + 0.006, bz + 0.15);
      holder.rotation.y = 0.25 + j(0.3 + mess * 0.8);
      s.root.add(holder);
    }

    // Folded side towel.
    const tx = bx + j(0.1), tz = D / 2 - 0.07;
    const towel = s.box([0.24, 0.022, 0.1], [tx, TOP + 0.011, tz], towelMat);
    towel.rotation.y = j(0.1 + mess * 0.5);
    const stripe = s.box([0.24, 0.002, 0.014], [tx, TOP + 0.023, tz], s.material('#3c6fb0'));
    stripe.rotation.y = towel.rotation.y;

    // Deli containers along the back and right.
    const fills = ['#c0321f', '#4f9a3a', '#e8c531', '#f3ead6', '#7a3f8a', '#e8872b', '#5a3320', '#9ac4d9', '#2f6f2a', '#f0c8d0'];
    const shell = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false });
    const lidMat = s.material('#f1f1ec', { roughness: 0.5 });
    const count = Math.round(mix(4, 9, mood.density));
    for (let i = 0; i < count; i++) {
      const quart = random() < 0.45;
      const h = quart ? 0.14 : 0.085;
      const col = Math.floor(i / 2), row = i % 2;
      let x = 0.24 + col * 0.125 + j(mess * 0.07), z = -0.2 + row * 0.13 + j(mess * 0.08);
      if (x > W / 2 - 0.07) x = W / 2 - 0.07 - random() * 0.05;
      const tint = fills[Math.floor(random() * fills.length)];
      const level = mix(0.25, 0.95, random());
      const tipped = mess > 0.65 && random() < 0.3;
      const g = new THREE.Group();
      g.position.set(x, TOP, z);
      const add = (mesh: THREE.Mesh, cast = true) => { mesh.castShadow = cast; g.add(mesh); return mesh; };
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, h * level, 16).translate(0, h * level / 2 + 0.003, 0), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6 })));
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.045, h, 16, 1, true).translate(0, h / 2, 0), shell), false);
      const lidOff = !tipped && random() < mess * 0.6;
      if (!lidOff && !tipped) add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 16).translate(0, h + 0.004, 0), lidMat));
      if (a.order > 0.3) {
        const tapeTag = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.002), s.material(a.order > 0.7 ? '#f6f4ea' : '#e9d9a0')));
        tapeTag.position.set(0, h * 0.55, 0.052);
        if (a.order < 0.7) tapeTag.rotation.z = j(0.5);
      }
      if (tipped) {
        g.rotation.z = Math.PI / 2;
        g.position.y = TOP + 0.05;
        s.cylinder(0.09, 0.1, 0.004, [x - h - 0.03, TOP + 0.002, z], new THREE.MeshStandardMaterial({ color: tint, roughness: 0.4 }), 12).castShadow = false;
      }
      s.root.add(g);
    }
    // A stack of spare deli lids when tidy, scraps when not.
    if (a.order > 0.6) for (let i = 0; i < 6; i++) s.cylinder(0.06, 0.06, 0.007, [-0.62, TOP + 0.004 + i * 0.008, -0.2], lidMat, 16);
    const scrapBits: Bit[] = [];
    for (let i = 0; i < Math.round(mess * 40 + mood.wear * 10); i++) {
      const onFloor = random() < 0.4;
      scrapBits.push({ p: onFloor ? [j(W), 0.004, D / 2 + random() * 0.3] : [j(W - 0.1), TOP + 0.004, j(D - 0.1)], r: [0, random() * 3, 0], s: [0.012 + random() * 0.02, 0.004, 0.008 + random() * 0.012], c: ['#c98a3a', '#4f9a3a', '#f1ecd4', '#e8872b', '#c0321f'][Math.floor(random() * 5)] });
    }
    strew(s.root, cube, scrapBits);

    // Plaster box.
    if (a.plasters !== 'none') {
      const px = -0.62, pz = 0.2;
      const blue = s.material('#2f62b0', { roughness: 0.6 });
      const box = s.box([0.13, 0.05, 0.085], [px, TOP + 0.025, pz], blue);
      box.rotation.y = 0.3;
      const cross = s.label('+', 0.045, 0.045, [px + 0.012, TOP + 0.027, pz + 0.046], '#ffffff', '#2f62b0');
      cross.rotation.y = 0.3;
      if (a.plasters === 'open') {
        const flap = s.box([0.13, 0.003, 0.085], [px - 0.01, TOP + 0.085, pz - 0.05], blue);
        flap.rotation.set(-1.0, 0.3, 0);
        for (let i = 0; i < 6; i++) s.box([0.075, 0.002, 0.022], [px + 0.1 + random() * 0.14, TOP + 0.002 + i * 0.001, pz + j(0.16)], s.material('#3f86e0', { roughness: 0.5 })).rotation.y = random() * 3;
        const spot = s.cylinder(0.022, 0.022, 0.002, [tx + 0.05, TOP + 0.024, tz], s.material('#a0171a', { roughness: 0.8 }), 10);
        spot.castShadow = false;
        s.cylinder(0.008, 0.008, 0.002, [tx + 0.1, TOP + 0.001, tz - 0.07], s.material('#a0171a'), 8).castShadow = false;
      }
    }

    // Under the table.
    if (a.under === 'tubs') {
      const tub = s.material('#7c8286', { roughness: 0.7 });
      const n = 2 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) s.box([0.5, 0.13, 0.38], [-0.38 + j(0.02), 0.335 + i * 0.1, j(0.02)], tub).rotation.y = j(0.08);
      s.cylinder(0.15, 0.12, 0.34, [0.35, 0.44, 0], s.material('#f1f1ec', { roughness: 0.5 }), 20);
      s.cylinder(0.155, 0.155, 0.02, [0.35, 0.62, 0], s.material('#f1f1ec'), 20);
    } else if (a.under === 'sacks') {
      const net = [['#c98a3a', '#b9722a'], ['#b79a6a', '#a08050']];
      [-0.38, 0.3].forEach((x, k) => {
        s.ball([0.26, 0.2, 0.22], [x, 0.44, 0], s.material(k ? '#c9a878' : '#c0502a', { roughness: 0.9 }), 14);
        const bits: Bit[] = [];
        for (let i = 0; i < 26; i++) { const t = random() * 6.3, e = random() * 1.3; bits.push({ p: [x + Math.cos(t) * Math.cos(e) * 0.24, 0.44 + Math.sin(e) * 0.19, Math.sin(t) * Math.cos(e) * 0.2], s: [0.05, 0.045, 0.05], c: net[k][i % 2] }); }
        strew(s.root, round, bits);
        s.cylinder(0.02, 0.05, 0.08, [x, 0.66, 0], s.material('#e9e3d2'), 8);
      });
    } else if (a.under === 'pots') {
      const pot = s.material('#b9bebe', { metalness: 0.8, roughness: 0.35 });
      [[-0.4, 0.2, 0.3], [0.05, 0.16, 0.26], [0.45, 0.13, 0.2]].forEach(([x, r, h]) => {
        s.cylinder(r, r, h, [x, 0.27 + h / 2, 0], pot, 24);
        for (const side of [-1, 1]) s.ring(0.035, 0.007, [x + side * (r + 0.01), 0.27 + h * 0.3, 0], pot).rotation.x = Math.PI / 2;
      });
    }

    return s.finish();
  },
});
