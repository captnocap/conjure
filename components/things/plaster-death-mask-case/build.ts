import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { headForm, paint } from './head';

const NAMES = {
  poets: ['Poet, d. 1821', 'Lyric poet', 'A satirist', 'Poetess, 1861', 'Ballad-maker', 'Unknown poet', 'Laureate', 'Minor poet'],
  inconnue: ['Unknown girl', 'Found in river', 'Unclaimed', 'No name given', 'A boatman', 'Unknown man', 'Drowned, 1880s', 'Unknown'],
  criminals: ['No. 12 Forger', 'No. 31 Poisoner', 'No. 7 Highwayman', 'No. 44 Hanged', 'No. 19 Coiner', 'No. 3 Garrotter', 'No. 58 Arsonist', 'No. 60 Innocent?'],
  composer: ['The composer', 'His teacher', 'A rival', 'His copyist', 'Tenor, 1839', 'Organist', 'The librettist', 'A patron'],
  mixed: ['A general', 'An actress', 'Unknown', 'A physician', 'The founder', 'A child', 'Astronomer', 'A stranger'],
} as const;

export default defineThing({
  questions: {
    count: choice('How many masks are in the case?', {
      one: 'One mask alone in the middle of the cloth.',
      three: 'Three in a row.',
      five: 'Five, in two ranks.',
      eight: 'Eight, two full ranks, a crowded case.',
    }),
    who: choice('Who were they?', {
      poets: 'Poets: fine-boned, high-browed faces, a dried laurel sprig laid beside them.',
      inconnue: 'A drowned unknown girl with a faint, secret smile, with other nameless dead from the river.',
      criminals: 'Executed criminals: heavy jaws, shaved heads, numbered labels and an iron shackle.',
      composer: 'A great composer, scowling under a storm of hair, and his circle, with a scrap of manuscript.',
      mixed: 'A mixed collection of the notable and the unknown.',
    }),
    arrangement: choice('How are they arranged?', {
      ranked: 'In neat ranked rows, evenly spaced and squared up.',
      pride: 'One larger mask given pride of place, the rest gathered smaller around it.',
      jumbled: 'Jumbled: turned at odd angles and crowding each other, as if the case had been moved carelessly.',
    }),
    patina: choice('What finish do the masks have?', {
      chalk: 'Chalk white raw plaster.',
      ivory: 'Waxed ivory, yellowed and faintly shiny.',
      bronzed: 'Bronzed: painted or cast dark metallic brown.',
      grey: 'Grey with handling and soot.',
    }),
    missing: noul('Is one mask missing, its place holding only a label and a clean outline in the dust?'),
    lid: choice('What state is the glass lid in?', {
      closed: 'Closed and locked.',
      propped: 'Propped open on a stay, for study.',
      broken: 'Broken: a jagged hole in the pane and shards lying on the cloth.',
      draped: 'Half covered by a cloth thrown over one end of the case.',
    }),
    cloth: choice('What are they laid on?', {
      black: 'Black velvet.', green: 'Dark green baize.', burgundy: 'Faded burgundy plush.', navy: 'Navy blue serge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const seed = context.seed;
    const W = 1.36, D = 0.8, hf = 0.82, hb = 1.24, tray = 0.15;
    const slope = Math.atan2(hb - hf, D), L = Math.hypot(D, hb - hf);
    const wood = s.material(mood.warmth > 0.5 ? '#5a3a24' : '#3d2c22', { roughness: 0.55 });
    const brass = s.material('#c9a240', { metalness: 0.85, roughness: 0.3 });

    // Body: a trapezoid cabinet on four legs.
    const shape = new THREE.Shape();
    const sink = tray / Math.cos(slope);
    shape.moveTo(D / 2, hf - sink - 0.13); shape.lineTo(D / 2, hf - sink); shape.lineTo(-D / 2, hb - sink); shape.lineTo(-D / 2, hf - sink - 0.13); shape.closePath();
    const bodyGeometry = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
    bodyGeometry.rotateY(-Math.PI / 2); bodyGeometry.translate(W / 2, 0, 0);
    s.mesh(bodyGeometry, wood);
    const legTop = hf - sink - 0.13;
    for (const x of [-1, 1]) for (const z of [-1, 1])
      s.lathe([[0, 0], [0.03, 0], [0.034, 0.03], [0.022, 0.07], [0.03, legTop * 0.45], [0.024, legTop * 0.8], [0.04, legTop * 0.86], [0.04, legTop]], wood, [x * (W / 2 - 0.06), 0, z * (D / 2 - 0.06)]);
    s.box([W - 0.16, 0.03, 0.04], [0, 0.18, 0], wood);
    for (const x of [-1, 1]) s.box([0.04, 0.03, D - 0.14], [x * (W / 2 - 0.06), 0.18, 0], wood);

    // Deck: local x across, y up the slope, z out of the cloth.
    const deck = new THREE.Group();
    deck.position.set(0, (hf + hb) / 2, 0);
    deck.rotation.x = -(Math.PI / 2 - slope);
    s.root.add(deck);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = deck) => { node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); parent.add(node); return node; };
    const cw = W - 0.1, cl = L - 0.1;

    const n = { one: 1, three: 3, five: 5, eight: 8 }[a.count];
    const places = n + (a.missing && n === 1 ? 1 : 0);
    const rows = places > 4 ? 2 : 1;
    const perRow = [Math.ceil(places / rows), Math.floor(places / rows)];
    const slots: { x: number; y: number; scale: number; turn: number }[] = [];
    for (let r = 0, i = 0; r < rows; r++)
      for (let c = 0; c < perRow[r]; c++, i++) {
        const pitch = Math.min(0.31, cw / perRow[r]);
        const jumble = a.arrangement === 'jumbled' ? 1 : 0.12;
        slots.push({
          x: (c - (perRow[r] - 1) / 2) * pitch + (random() - 0.5) * 0.07 * jumble,
          y: (rows === 1 ? 0.04 : r === 0 ? 0.22 : -0.16) + (random() - 0.5) * 0.08 * jumble,
          scale: rows === 1 ? (places <= 2 ? 1.25 : 1) : 0.88,
          turn: (random() - 0.5) * 1.5 * jumble,
        });
      }
    const hero = Math.floor((perRow[0] - 1) / 2);
    if (a.arrangement === 'pride' && places > 1) slots.forEach((slot, i) => { slot.scale *= i === hero ? 1.3 : 0.78; if (i === hero) slot.y += 0.01; });
    const gap = a.missing ? (places === 2 ? 1 : (hero + 1 + Math.floor(random() * (places - 1))) % places) : -1;

    const clothColour = { black: '#18171a', green: '#1f3a2c', burgundy: '#5a2330', navy: '#1b2440' }[a.cloth];
    const dustiness = mix(0.1, 0.5, mood.wear);
    const cloth = paint(1024, Math.round(1024 * cl / cw), (ctx, w, h) => {
      ctx.fillStyle = clothColour; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(215,208,190,${random() * dustiness * 0.5})`; ctx.fillRect(random() * w, random() * h, 2 + random() * 5, 2 + random() * 5); }
      ctx.fillStyle = `rgba(200,194,178,${dustiness * 0.55})`; ctx.fillRect(0, 0, w, h);
      // Where a mask lay the cloth is still clean; the dust keeps its outline.
      slots.forEach((slot, i) => {
        const px = (slot.x / cw + 0.5) * w, py = (0.5 - slot.y / cl) * h, rx = 0.092 * slot.scale / cw * w, ry = 0.128 * slot.scale / cl * h;
        ctx.save(); ctx.translate(px, py); ctx.rotate(-slot.turn);
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = clothColour; ctx.fill();
        if (i === gap) { ctx.strokeStyle = 'rgba(232,226,208,0.75)'; ctx.lineWidth = 5; ctx.stroke(); }
        ctx.restore();
      });
    });
    const clothMesh = add(new THREE.Mesh(new THREE.PlaneGeometry(cw, cl), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.97 })));
    clothMesh.position.z = -tray + 0.004;

    // The masks.
    const patina = { chalk: { base: '#f3f0e8', cavity: '#b3ab9a', rough: 0.9, metal: 0 }, ivory: { base: '#e7d6a6', cavity: '#a3824a', rough: 0.36, metal: 0 }, bronzed: { base: '#7c5a32', cavity: '#33261a', rough: 0.36, metal: 0.75 }, grey: { base: '#aaa69d', cavity: '#5f5b54', rough: 0.85, metal: 0 } }[a.patina];
    const maskMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: patina.rough, metalness: patina.metal });
    const size = 0.108, cut = 0.08;
    const labels = NAMES[a.who];
    slots.forEach((slot, i) => {
      const star = i === hero;
      const card = paint(256, 84, (ctx, w, h) => {
        ctx.fillStyle = mood.wear > 0.5 ? '#e2d3a8' : '#efe6cc'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#3b2c20'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'italic 30px "Brush Script MT", "Segoe Script", cursive';
        ctx.fillText(star && a.who === 'inconnue' ? 'L’Inconnue' : labels[(i + (star ? 0 : 1)) % labels.length], w / 2, h / 2 - 4, w - 20);
        ctx.strokeStyle = 'rgba(59,44,32,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, h - 16); ctx.quadraticCurveTo(w / 2, h - 10, w - 50, h - 18); ctx.stroke();
      });
      const label = add(new THREE.Mesh(new THREE.PlaneGeometry(0.15 * slot.scale, 0.05 * slot.scale), new THREE.MeshStandardMaterial({ map: card, roughness: 0.9 })));
      label.position.set(slot.x + Math.sin(slot.turn) * 0.17 * slot.scale, slot.y - Math.cos(slot.turn) * 0.165 * slot.scale, -tray + 0.008);
      label.rotation.z = slot.turn + (random() - 0.5) * 0.12;
      if (i === gap) return;
      const v = () => random();
      const type = a.who;
      const head = headForm({
        size: size * slot.scale, seed: seed + i * 31, res: 0.55, maskCut: cut, eyes: 'closed', ears: false,
        base: patina.base, cavity: patina.cavity, cavityAmount: mix(0.7, 1.4, mood.wear), mottle: patina.cavity, mottleAmount: mix(0.05, 0.35, mood.wear),
        jaw: type === 'criminals' ? mix(0.7, 1, v()) : type === 'poets' ? mix(0.1, 0.5, v()) : v(),
        brow: type === 'criminals' || (type === 'composer' && star) ? mix(1.2, 1.7, v()) : mix(0.6, 1.2, v()),
        nose: mix(0.85, 1.25, v()), noseWide: mix(0.85, 1.3, v()), lips: mix(0.7, 1.2, v()), chin: mix(0.6, 1.3, v()), cheek: mix(0.6, 1.5, v()),
        long: type === 'poets' ? mix(1.02, 1.12, v()) : mix(0.94, 1.06, v()),
        smile: type === 'inconnue' && star ? 0.55 : type === 'composer' && star ? -0.5 : mix(-0.3, 0.15, v()),
        hair: type === 'composer' && star ? 'curls' : type === 'inconnue' && star ? 'parted' : 'bald',
        beard: type === 'mixed' && v() < 0.3 ? 0.6 : 0, noseBreak: type === 'criminals' && v() < 0.4 ? 0.35 : 0,
        socket: mix(0.9, 1.4, v()), lumpy: 0.02, crisp: star && type === 'inconnue' ? 0.8 : 0.95,
      });
      const mask = add(new THREE.Mesh(head.geometry, maskMaterial));
      mask.position.set(slot.x, slot.y, -tray + 0.004 - cut * size * slot.scale);
      mask.rotation.z = slot.turn;
    });

    // The telling object laid beside them.
    const px = cw / 2 - 0.1, py = -cl / 2 + 0.07, pz = -tray + 0.012;
    if (a.who === 'poets') {
      const leaf = new THREE.SphereGeometry(1, 6, 4); leaf.scale(0.03, 0.011, 0.003);
      const sprig = new THREE.InstancedMesh(leaf, new THREE.MeshStandardMaterial({ color: '#7a7a45', roughness: 0.8 }), 12);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 12; i++) { m.makeRotationZ(0.5 + (i % 2 ? 0.7 : -0.7)).setPosition(px - 0.11 + i * 0.016, py + i * 0.008 + (i % 2 ? 0.014 : -0.014), pz); sprig.setMatrixAt(i, m); }
      add(sprig);
    } else if (a.who === 'inconnue') {
      const rose = add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.022, 0), new THREE.MeshStandardMaterial({ color: '#6b2a2f', roughness: 0.9 })));
      rose.position.set(px, py + 0.02, pz + 0.012);
      const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.16, 5), new THREE.MeshStandardMaterial({ color: '#4d5a35' })));
      stem.position.set(px - 0.07, py - 0.005, pz); stem.rotation.z = Math.PI / 2 - 0.3;
    } else if (a.who === 'criminals') {
      const iron = new THREE.MeshStandardMaterial({ color: '#3b3836', roughness: 0.6, metalness: 0.7 });
      for (const dx of [0, -0.075]) add(new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.007, 6, 18), iron)).position.set(px + dx, py + 0.01, pz + 0.004);
      const link = add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.008), iron)); link.position.set(px - 0.037, py + 0.01, pz + 0.004);
    } else if (a.who === 'composer') {
      const sheet = paint(256, 180, (ctx, w, h) => {
        ctx.fillStyle = '#eadfbe'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#3b2c20'; ctx.lineWidth = 1.5;
        for (let st = 0; st < 3; st++) for (let l = 0; l < 5; l++) { ctx.beginPath(); ctx.moveTo(10, 24 + st * 54 + l * 7); ctx.lineTo(w - 10, 24 + st * 54 + l * 7); ctx.stroke(); }
        ctx.fillStyle = '#2a1f17';
        for (let k = 0; k < 40; k++) { const x = 20 + random() * (w - 40), st = Math.floor(random() * 3), y = 22 + st * 54 + random() * 30; ctx.beginPath(); ctx.ellipse(x, y, 5, 3.5, -0.4, 0, 7); ctx.fill(); ctx.fillRect(x + 4, y - 20, 1.5, 20); }
      });
      const page = add(new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14), new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.9 })));
      page.position.set(px - 0.03, py + 0.03, pz - 0.003); page.rotation.z = 0.25;
    }

    // Rim, glass and lid.
    const rim = (w: number, l: number, x: number, y: number) => { const bar = add(new THREE.Mesh(new THREE.BoxGeometry(w, l, tray + 0.02), wood)); bar.position.set(x, y, -tray / 2); return bar; };
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff0f2', transparent: true, opacity: 0.14, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const lid = new THREE.Group();
    lid.position.set(0, L / 2, 0.02);
    const lidBar = (w: number, l: number, x: number, y: number) => { const bar = add(new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.03), wood), lid); bar.position.set(x, y, 0); };
    lidBar(W, 0.06, 0, -0.03); lidBar(W, 0.06, 0, -L + 0.03); lidBar(0.06, L, -W / 2 + 0.03, -L / 2); lidBar(0.06, L, W / 2 - 0.03, -L / 2);
    rim(W, 0.03, 0, L / 2 - 0.015); rim(W, 0.03, 0, -L / 2 + 0.015);
    const pane = (points: [number, number][]) => {
      const sh = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(sh), glass); lid.add(mesh); return mesh;
    };
    const gw = W / 2 - 0.06, gl = L - 0.06;
    if (a.lid === 'broken') {
      const cx = (random() - 0.5) * 0.5, cy = -L / 2 + (random() - 0.5) * 0.2;
      const hole: [number, number][] = Array.from({ length: 9 }, (_u, i) => { const t = i / 9 * Math.PI * 2, r = 0.14 + random() * 0.16; return [cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.8] as [number, number]; });
      const corners: [number, number][] = [[gw, -0.06], [-gw, -0.06], [-gw, -gl], [gw, -gl]];
      // Fan the remaining glass from the frame to the jagged edge of the hole.
      for (let i = 0; i < 9; i++) {
        const p = hole[i], q = hole[(i + 1) % 9];
        const t = (i + 0.5) / 9 * Math.PI * 2;
        const far: [number, number] = [Math.max(-gw, Math.min(gw, cx + Math.cos(t) * 3)), Math.max(-gl, Math.min(-0.06, cy + Math.sin(t) * 3))];
        const t2 = (i + 1.5) / 9 * Math.PI * 2;
        const far2: [number, number] = [Math.max(-gw, Math.min(gw, cx + Math.cos(t2) * 3)), Math.max(-gl, Math.min(-0.06, cy + Math.sin(t2) * 3))];
        const corner = corners.find(([x, y]) => (x === far[0] || y === far[1]) && (x === far2[0] || y === far2[1]) && !(far[0] === far2[0] || far[1] === far2[1]));
        pane(corner ? [p, far, corner, far2, q] : [p, far, far2, q]);
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.004, Math.hypot(far[0] - p[0], far[1] - p[1]), 0.002), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
        crack.position.set((far[0] + p[0]) / 2, (far[1] + p[1]) / 2, 0.001); crack.rotation.z = Math.atan2(far[1] - p[1], far[0] - p[0]) - Math.PI / 2; lid.add(crack);
      }
      const shardMaterial = new THREE.MeshStandardMaterial({ color: '#e9f6f7', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.75 });
      for (let i = 0; i < 9; i++) {
        const shard = add(new THREE.Mesh(new THREE.ConeGeometry(0.02 + random() * 0.03, 0.004, 3), shardMaterial));
        shard.rotation.x = Math.PI / 2; shard.rotation.z = random() * 6;
        shard.position.set(cx + (random() - 0.5) * 0.5, cy + L / 2 + (random() - 0.5) * 0.4, -tray + 0.012 + random() * 0.01); shard.scale.set(1 + random(), 1, 1);
      }
    } else {
      pane([[gw, -0.06], [-gw, -0.06], [-gw, -gl], [gw, -gl]]);
      for (let i = 0; i < 2; i++) { const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.07 + i * 0.05, L * 1.15), glint); streak.position.set(-W * 0.22 + i * 0.16, -L / 2, 0.002); streak.rotation.z = 0.5; lid.add(streak); }
    }
    if (a.lid === 'propped') {
      lid.rotation.x = -0.62;
      // The stay runs from the side rail up to the lifted frame.
      const from = new THREE.Vector3(W / 2 - 0.03, -0.05, 0.02), to = new THREE.Vector3(W / 2 - 0.03, L / 2 - Math.cos(0.62) * 0.45, 0.02 + Math.sin(0.62) * 0.45);
      const stay = add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, from.distanceTo(to), 6), brass));
      stay.position.copy(from).add(to).multiplyScalar(0.5); stay.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    }
    deck.add(lid);
    for (const x of [-1, 1]) rim(0.03, L, x * (W / 2 - 0.015), 0);
    // Lock plate and number.
    s.box([0.05, 0.07, 0.006], [0, hf - sink - 0.06, D / 2 + 0.003], brass);
    s.cylinder(0.007, 0.007, 0.01, [0, hf - sink - 0.07, D / 2 + 0.008], s.material('#1b1b1b'), 8).rotation.x = Math.PI / 2;
    s.label('CASE ' + (1 + Math.floor(random() * 30)), 0.2, 0.05, [-W / 2 + 0.17, hf - sink - 0.06, D / 2 + 0.004], '#3b2c20', '#c9a240');

    if (a.lid === 'draped') {
      // A cloth thrown over one end, hanging down the side.
      const side = random() < 0.5 ? -1 : 1;
      const nx = 16, ny = 22;
      const geometry = new THREE.PlaneGeometry(1, 1, nx, ny);
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      const cover = W * mix(0.3, 0.48, random());
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) + 0.5, v = pos.getY(i) + 0.5;
        const along = u * (cover + 0.5);
        const zc = (v - 0.5) * (D + 0.3);
        const onTop = Math.max(0, Math.min(1, (Math.abs(zc) - D / 2) / 0.02));
        let x = W / 2 - cover + along, y = (hf + hb) / 2 - zc * Math.tan(slope) + 0.045 + 0.012 * Math.sin(u * 9 + v * 7);
        let z = zc;
        if (along > cover) { const drop = along - cover; x = W / 2 + 0.03 + 0.02 * Math.sin(v * 14); y -= drop; }
        if (onTop > 0) { const over = Math.abs(zc) - D / 2; z = Math.sign(zc) * (D / 2 + 0.03 + 0.015 * Math.sin(u * 12)); y -= over * 1.2 + (zc < 0 ? 0 : 0); }
        pos.setXYZ(i, side * x, y, z);
      }
      geometry.computeVertexNormals();
      s.mesh(geometry, new THREE.MeshStandardMaterial({ color: '#d9d4c6', roughness: 0.92, side: THREE.DoubleSide }));
    }
    if (mood.density > 0.55) {
      // A reading glass left on the lid.
      const lens = new THREE.Group();
      add(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 24), brass), lens);
      const handle = add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.1, 8), s.material('#2a1f1a')), lens); handle.position.set(0, -0.095, 0);
      lens.position.set(-W / 2 + 0.2, -L / 2 + 0.16, a.lid === 'propped' || a.lid === 'broken' ? -tray + 0.02 : 0.045); lens.rotation.z = 0.7;
      deck.add(lens);
    }
    return s.finish();
  },
});
