import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    places: choice('How many people are eating?', {
      one: 'One place: eating alone on the floor.',
      two: 'Two places facing each other.',
      several: 'Four or five places in a ring: the friends who helped carry.',
    }),
    eaten: score('How much of the pizza has been eaten?', ['Untouched, just opened', 'A couple of slices gone', 'Half', 'One cold slice left', 'Only crusts and grease']),
    topping: choice('What kind of pizza is it?', {
      margherita: 'Plain margherita with a few basil leaves.',
      pepperoni: 'Pepperoni, glistening red discs.',
      veg: 'Peppers, olives and mushrooms.',
      hawaiian: 'Ham and pineapple.',
    }),
    drink: choice('What are they drinking?', {
      beer: 'Bottles of beer.',
      fizz: 'A bottle of sparkling wine and plastic cups: a toast.',
      wine: 'Red wine out of mugs, the glasses being packed.',
      cans: 'Cans of cola.',
      tea: 'Tea from a flask.',
    }),
    table: choice('What is standing in for a table?', {
      milkcrate: 'An upturned plastic milk crate.',
      winecrate: 'An upturned wooden crate.',
      box: 'A taped moving box, label upside down.',
      books: 'A stack of big books.',
    }),
    light: choice('What lights the meal?', {
      tealight: 'A single tealight.',
      many: 'A scatter of tealights and a candle in a jar.',
      lamp: 'A bare-bulb lamp standing on the floor, its flex trailing away.',
      daylight: 'Nothing: it is daytime, a break between loads.',
    }),
    around: choice('What is waiting around them?', {
      boxes: 'Sealed boxes not yet unpacked: the first night.',
      bags: 'Tied bin bags and a broom: the last night.',
      sleeping: 'Rolled sleeping bags: staying over on the floor.',
      nothing: 'Nothing at all, only bare boards.',
    }),
    seats: choice('What do they sit on?', {
      cushions: 'Mismatched cushions.',
      cardboard: 'Flattened cardboard.',
      blanket: 'One big blanket spread like a picnic rug.',
      floor: 'The bare floor.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const put = <O extends THREE.Object3D>(o: O, x: number, y: number, z: number, parent: THREE.Object3D = s.root) => { o.position.set(x, y, z); parent.add(o); o.traverse((n) => { if ((n as THREE.Mesh).isMesh) n.castShadow = n.receiveShadow = true; }); return o; };
    const lit = a.light !== 'daylight';
    const flames: THREE.Mesh[] = [];

    // --- pizza texture
    const pc = document.createElement('canvas'); pc.width = pc.height = 256; const c = pc.getContext('2d')!;
    c.fillStyle = '#c98d47'; c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#b5371f'; c.beginPath(); c.arc(128, 128, 108, 0, 7); c.fill();
    for (let i = 0; i < 90; i++) { c.fillStyle = i % 3 ? '#f0cf6a' : '#f6e3a0'; const an = random() * 6.3, r = Math.sqrt(random()) * 98; c.beginPath(); c.ellipse(128 + Math.cos(an) * r, 128 + Math.sin(an) * r, 9 + random() * 14, 7 + random() * 10, random() * 3, 0, 7); c.fill(); }
    for (let i = 0; i < 26; i++) {
      const an = random() * 6.3, r = Math.sqrt(random()) * 92, x = 128 + Math.cos(an) * r, y = 128 + Math.sin(an) * r;
      if (a.topping === 'pepperoni') { c.fillStyle = '#a3261b'; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill(); c.fillStyle = '#c2452e'; c.beginPath(); c.arc(x - 2, y - 2, 6, 0, 7); c.fill(); }
      else if (a.topping === 'margherita') { if (i % 3 === 0) { c.fillStyle = '#2f7a3a'; c.beginPath(); c.ellipse(x, y, 11, 6, an, 0, 7); c.fill(); } }
      else if (a.topping === 'veg') { c.fillStyle = ['#2f7a3a', '#1c1a1a', '#d8c9a8', '#d8a020'][i % 4]; c.beginPath(); if (i % 4 === 1) { c.arc(x, y, 6, 0, 7); c.fill(); c.fillStyle = '#f0cf6a'; c.beginPath(); c.arc(x, y, 2.5, 0, 7); } else c.ellipse(x, y, 12, 5, an, 0, 7); c.fill(); }
      else { c.fillStyle = i % 2 ? '#f2d24a' : '#e08f8a'; c.beginPath(); if (i % 2) { c.moveTo(x, y - 9); c.lineTo(x + 9, y + 6); c.lineTo(x - 9, y + 6); } else c.rect(x - 8, y - 6, 16, 12); c.fill(); }
    }
    c.strokeStyle = 'rgba(90,40,20,0.55)'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(128 + Math.cos(k * 0.785) * 124, 128 + Math.sin(k * 0.785) * 124); c.lineTo(128 - Math.cos(k * 0.785) * 124, 128 - Math.sin(k * 0.785) * 124); c.stroke(); }
    const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
    const pizzaMat = new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.6 });
    const crustMat = s.material('#c98d47', { roughness: 0.8 });
    const wedge = (slices: number, start: number, r = 0.15) => {
      const g = new THREE.Group(); const arc = slices * Math.PI / 4;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 40, 1, false, start, arc), [crustMat, pizzaMat, crustMat]); g.add(top);
      const crust = new THREE.Mesh(new THREE.TorusGeometry(r - 0.008, 0.011, 6, 40, arc), crustMat); crust.rotation.x = Math.PI / 2; crust.rotation.z = -(start + arc) + Math.PI / 2; crust.position.y = 0.006; g.add(crust);
      return g;
    };
    const crustBit = () => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 5, 10, 0.5 + random() * 0.4), crustMat); m.rotation.x = Math.PI / 2; m.rotation.z = random() * 6; return m; };

    // --- the box
    const card = s.material('#e9e2d0', { roughness: 0.9 }), kraft = s.material('#b98d5c', { roughness: 0.92 });
    const box = new THREE.Group(); const B = 0.42;
    const lidTex = (() => { const q = document.createElement('canvas'); q.width = q.height = 256; const x = q.getContext('2d')!; x.fillStyle = '#eee7d6'; x.fillRect(0, 0, 256, 256); const ink = mood.cheer > 0.5 ? '#c8281e' : '#1d6a3a'; x.strokeStyle = ink; x.lineWidth = 8; x.strokeRect(14, 14, 228, 228); x.fillStyle = ink; x.beginPath(); x.arc(128, 104, 52, 0, 7); x.fill(); x.fillStyle = '#eee7d6'; x.beginPath(); x.moveTo(128, 104); x.arc(128, 104, 40, -0.4, 0.5); x.fill(); x.fillStyle = ink; x.font = 'bold 44px Arial, sans-serif'; x.textAlign = 'center'; x.fillText('PIZZA', 128, 208); x.font = 'bold 15px Arial, sans-serif'; x.fillText('HOT & FRESH', 128, 232); const t = new THREE.CanvasTexture(q); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const lidMat = new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.9 });
    put(new THREE.Mesh(new THREE.BoxGeometry(B, 0.004, B), card), 0, 0.002, 0, box);
    for (const [x, z, w, d] of [[0, B / 2, B, 0.004], [0, -B / 2, B, 0.004], [B / 2, 0, 0.004, B], [-B / 2, 0, 0.004, B]] as const) put(new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), card), x, 0.02, z, box);
    const lid = new THREE.Group(); const openAngle = mix(1.75, 2.5, random());
    const lidPanel = new THREE.Mesh(new THREE.BoxGeometry(B, 0.004, B), [card, card, card, lidMat, card, card]); put(lidPanel, 0, 0, B / 2, lid);
    put(new THREE.Mesh(new THREE.BoxGeometry(B, 0.035, 0.004), card), 0, 0.018, B, lid);
    for (const sx of [-1, 1]) put(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.035, B * 0.9), card), sx * B / 2, 0.018, B / 2, lid);
    lid.rotation.x = -openAngle; put(lid, 0, 0.04, -B / 2, box);
    const left = Math.max(0, Math.min(8, Math.round(8 * (1 - a.eaten))));
    if (left > 0) put(wedge(left, random() * 6, 0.19), 0, 0.011, 0, box);
    // grease and crumbs where slices were
    for (let i = 0; i < (8 - left) * 2; i++) { const an = random() * 6.3, r = random() * 0.17; put(new THREE.Mesh(new THREE.CylinderGeometry(0.012 + random() * 0.02, 0.012, 0.001, 8), s.material('#cdbb8c', { roughness: 0.4 })), Math.cos(an) * r, 0.005, Math.sin(an) * r, box); }
    if (left < 3) for (let i = 0; i < 3 + Math.round(random() * 3); i++) put(crustBit(), (random() - 0.5) * 0.14, 0.012, (random() - 0.5) * 0.14, box);
    box.rotation.y = (random() - 0.5) * 0.5; put(box, 0, 0, 0);

    // --- places in a ring
    const n = a.places === 'one' ? 1 : a.places === 'two' ? 2 : 4 + (mood.density > 0.5 ? 1 : 0);
    const plateMat = s.material('#f7f5ee', { roughness: 0.85 });
    const seatHex = ['#b5563c', '#3f6f8c', '#d8a531', '#6d7f52', '#8a5a7a'];
    const glassBrown = s.material('#5a3516', { roughness: 0.2, metalness: 0.2 }), glassGreen = s.material('#2d5a34', { roughness: 0.2, metalness: 0.2 });
    const bottle = (kind: 'beer' | 'wine' | 'fizz') => {
      const h = kind === 'beer' ? 0.23 : 0.31, r = kind === 'beer' ? 0.03 : 0.038;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [r, 0], [r, h * 0.55], [r * 0.9, h * 0.63], [r * 0.38, h * 0.8], [r * 0.36, h], [0, h]].map(([x, y]) => new THREE.Vector2(x, y)), 16), kind === 'beer' ? (random() < 0.5 ? glassBrown : glassGreen) : glassGreen); g.add(body);
      const label = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.001, r + 0.001, h * 0.25, 16), s.material(kind === 'beer' ? '#e8dfc0' : kind === 'wine' ? '#f1ebdc' : '#1c1c1c')); label.position.y = h * 0.32; g.add(label);
      if (kind === 'fizz') { const foil = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.5, h * 0.2, 12), s.material('#c9a53a', { metalness: 0.8, roughness: 0.3 })); foil.position.y = h * 0.9; g.add(foil); }
      return g;
    };
    const tipped = (o: THREE.Object3D, r: number) => { o.rotation.z = Math.PI / 2; o.rotation.y = random() * 6; o.position.y = r; };
    const cup = (kind: 'plastic' | 'mug' | 'can' | 'flaskcup') => {
      if (kind === 'can') { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 16), s.material('#c8201c', { metalness: 0.5, roughness: 0.35 }))); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.006, 16), s.material('#c9cdd0', { metalness: 0.9, roughness: 0.3 })); top.position.y = 0.062; g.add(top); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0325, 0.0325, 0.03, 16), s.material('#f4f4f4')); g.add(band); g.children.forEach((k) => (k.position.y += 0.06)); return g; }
      const g = new THREE.Group();
      if (kind === 'plastic') { g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.026, 0.1, 14, 1, true), s.material('#f3f6f6', { roughness: 0.3, side: THREE.DoubleSide }))); const drinkTop = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.03, 0.05, 14), s.material('#ecd98a', { roughness: 0.2, emissive: '#e6c860', emissiveIntensity: 0.2 })); drinkTop.position.y = -0.02; g.add(drinkTop); g.children.forEach((k) => (k.position.y += 0.05)); }
      else { const col = kind === 'mug' ? seatHex[Math.floor(random() * 5)] : '#c9cdd0'; g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.037, 0.09, 16), s.material(col, { roughness: 0.4, metalness: kind === 'mug' ? 0 : 0.7 }))); const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.004, 14), s.material(kind === 'mug' ? '#4a1420' : '#8a5a34', { roughness: 0.2 })); liquid.position.y = 0.044; g.add(liquid); const handle = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 6, 12), g.children[0] instanceof THREE.Mesh ? (g.children[0] as THREE.Mesh).material : plateMat); handle.position.x = 0.045; g.add(handle); g.children.forEach((k) => (k.position.y += 0.045)); }
      return g;
    };
    if (a.seats === 'blanket') { const rug = put(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.012, 1.45), s.material(mood.warmth > 0.5 ? '#a8443a' : '#48668a', { roughness: 1 })), 0, 0.006, 0.05); rug.rotation.y = (random() - 0.5) * 0.3; for (let i = -3; i <= 3; i++) { const stripe = put(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.002, 0.03), s.material('#e9dfc4', { roughness: 1 })), 0, 0.0125, 0, rug); stripe.position.set(0, 0.0065, i * 0.21); } }
    const lift = a.seats === 'blanket' ? 0.012 : 0;
    box.position.y = lift;
    const base = random() * 6;
    for (let i = 0; i < n; i++) {
      const an = n === 1 ? 0.5 : n === 2 ? i * Math.PI + 0.35 : base + (i / n) * Math.PI * 2 + (random() - 0.5) * 0.3;
      const dir = new THREE.Vector3(Math.sin(an), 0, Math.cos(an)), sideways = new THREE.Vector3(Math.cos(an), 0, -Math.sin(an));
      const at = (r: number, off = 0) => dir.clone().multiplyScalar(r).addScaledVector(sideways, off);
      // seat
      const sp = at(0.7);
      if (a.seats === 'cushions') { const cu = put(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), s.material(seatHex[(i + Math.floor(base)) % 5], { roughness: 1 })), sp.x, 0.05, sp.z); cu.scale.set(0.2, 0.055, 0.2); cu.rotation.y = random() * 3; if (i % 2) { cu.scale.set(0.21, 0.05, 0.17); } }
      if (a.seats === 'cardboard') { const sheet = put(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.008, 0.4), kraft), sp.x, 0.004, sp.z); sheet.rotation.y = an + (random() - 0.5) * 0.5; }
      // plate with a slice, a crust or crumbs
      const pp = at(0.45, (random() - 0.5) * 0.08);
      const plate = new THREE.Group();
      plate.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.075, 0], [0.108, 0.012], [0.112, 0.012], [0.075, 0.004], [0, 0.004]].map(([x, y]) => new THREE.Vector2(x, y)), 22), plateMat));
      const state = a.eaten < 0.12 ? (i === 0 ? 1 : 0) : a.eaten > 0.85 ? 2 : random() < 0.6 ? 1 : 2;
      if (state === 1) { const sl = wedge(1, 0, 0.15); sl.scale.setScalar(0.9); sl.rotation.y = random() * 6; sl.position.set(Math.sin(sl.rotation.y + 0.4) * -0.06, 0.012, Math.cos(sl.rotation.y + 0.4) * -0.06); plate.add(sl); }
      if (state === 2) { for (let k = 0; k < 1 + Math.round(random()); k++) { const cb = crustBit(); cb.position.set((random() - 0.5) * 0.06, 0.016, (random() - 0.5) * 0.06); cb.scale.setScalar(0.8); plate.add(cb); } const nap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), s.material('#f1ede2', { roughness: 1, flatShading: true })); nap.position.set(0.05, 0.03, 0.04); plate.add(nap); }
      put(plate, pp.x, lift, pp.z);
      // drink
      const dp = at(0.47, 0.19 + random() * 0.04);
      const empty = a.eaten > 0.6 && random() < 0.35 + mood.energy * 0.3;
      if (a.drink === 'beer') { const b = put(bottle('beer'), dp.x, lift, dp.z); if (empty) tipped(b, 0.03 + lift); if (mood.density > 0.6 && random() < 0.6) { const b2 = put(bottle('beer'), dp.x + sideways.x * 0.1, lift, dp.z + sideways.z * 0.1); if (random() < 0.5) tipped(b2, 0.03 + lift); } }
      else if (a.drink === 'fizz') put(cup('plastic'), dp.x, lift, dp.z);
      else if (a.drink === 'wine') put(cup('mug'), dp.x, lift, dp.z);
      else if (a.drink === 'cans') { const cn = put(cup('can'), dp.x, lift, dp.z); if (empty) { cn.rotation.z = Math.PI / 2; cn.position.y = 0.032 + lift; cn.rotation.y = random() * 6; cn.children.forEach((k) => (k.position.y -= 0.06)); } }
      else put(cup('flaskcup'), dp.x, lift, dp.z);
    }

    // --- the stand-in table, set back from the box
    const tx = -0.55, tz = -0.36; let th = 0.3;
    const tableG = new THREE.Group();
    if (a.table === 'milkcrate') {
      const pl = s.material(mood.cheer > 0.6 ? '#d8362f' : mood.cheer > 0.3 ? '#2a5ea8' : '#3d4a45', { roughness: 0.55 }); th = 0.28; const w = 0.36;
      put(new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, w), pl), 0, th - 0.01, 0, tableG);
      for (const y of [0.015, th * 0.5, th - 0.04]) for (const [x, z, bw, bd] of [[0, w / 2, w, 0.018], [0, -w / 2, w, 0.018], [w / 2, 0, 0.018, w], [-w / 2, 0, 0.018, w]] as const) put(new THREE.Mesh(new THREE.BoxGeometry(bw, 0.03, bd), pl), x, y, z, tableG);
      for (let k = -2; k <= 2; k++) for (const [ax, sgn] of [[0, 1], [0, -1], [1, 1], [1, -1]] as const) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.018, th, 0.018), pl); put(post, ax ? sgn * w / 2 : k * w / 4.2, th / 2, ax ? k * w / 4.2 : sgn * w / 2, tableG); }
    } else if (a.table === 'winecrate') {
      const wood = s.material('#c9a36a', { roughness: 0.9 }), wood2 = s.material('#b88f58', { roughness: 0.9 }); th = 0.27; const w = 0.46, d = 0.32;
      for (let k = 0; k < 4; k++) put(new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d / 4 - 0.008), k % 2 ? wood : wood2), 0, th - 0.006, -d / 2 + d / 8 + k * d / 4, tableG);
      for (let k = 0; k < 3; k++) for (const sz of [-1, 1]) put(new THREE.Mesh(new THREE.BoxGeometry(w, th / 3 - 0.012, 0.012), k % 2 ? wood2 : wood), 0, th / 6 + k * th / 3 - 0.006, sz * d / 2, tableG);
      for (const sx of [-1, 1]) put(new THREE.Mesh(new THREE.BoxGeometry(0.014, th - 0.012, d), wood2), sx * w / 2, th / 2 - 0.006, 0, tableG);
      const stencil = s.label(['BORDEAUX', 'ORANGES', 'APPLES', 'MALBEC'][Math.floor(random() * 4)], 0.3, 0.07, [0, 0, 0], '#3a2a1c', '#c9a36a'); stencil.position.set(0, th * 0.5, d / 2 + 0.008); stencil.rotation.z = Math.PI; tableG.add(stencil);
    } else if (a.table === 'box') {
      th = 0.34; put(new THREE.Mesh(new THREE.BoxGeometry(0.46, th, 0.4), kraft), 0, th / 2, 0, tableG);
      put(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.404), s.material('#8a5a2b', { roughness: 0.45 })), 0, th + 0.001, 0, tableG);
      const text = s.label(['KITCHEN', 'BOOKS', 'MISC', 'BEDROOM'][Math.floor(random() * 4)], 0.34, 0.12, [0, 0, 0], '#161616', '#b98d5c'); text.position.set(0, th * 0.5, 0.203); text.rotation.z = Math.PI; tableG.add(text);
    } else {
      th = 0; const cols = ['#7a2e2a', '#23405f', '#d9d2bd', '#2f5a45', '#c2912e', '#3a3a3d'];
      for (let k = 0; k < 6 + Math.round(mood.density * 3); k++) { const bh = 0.028 + random() * 0.03, bw = 0.3 - random() * 0.06; const bk = put(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.23 - random() * 0.03), s.material(cols[k % 6])), (random() - 0.5) * 0.02, th + bh / 2, (random() - 0.5) * 0.02, tableG); bk.rotation.y = (random() - 0.5) * 0.35; const pages = put(new THREE.Mesh(new THREE.BoxGeometry(bw - 0.012, bh - 0.008, 0.005), s.material('#efe9d8')), 0, 0, 0.113, bk); void pages; th += bh; }
    }
    tableG.rotation.y = 0.3 + (random() - 0.5) * 0.4; put(tableG, tx, 0, tz);
    const onTable = (o: THREE.Object3D, dx: number, dz: number) => put(o, tx + dx, th, tz + dz);

    // --- light
    const tealight = (x: number, y: number, z: number, burning: boolean) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.019, 0.016, 14), s.material('#c9cdd0', { metalness: 0.85, roughness: 0.3 })));
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 14), s.material('#f6f1e2', { emissive: '#ffcf7a', emissiveIntensity: burning ? 0.6 : 0 })); wax.position.y = 0.008; g.add(wax);
      if (burning) { const flame = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), new THREE.MeshStandardMaterial({ color: '#ffd58a', emissive: '#ffb347', emissiveIntensity: 2.2 })); flame.scale.set(1, 2.1, 1); flame.position.y = 0.03; g.add(flame); flames.push(flame);
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffc46b', transparent: true, opacity: 0.16, depthWrite: false })); halo.position.y = 0.03; g.add(halo); }
      put(g, x, y + 0.008, z); return g;
    };
    if (a.light === 'tealight') tealight(tx + 0.02, th, tz + 0.03, true);
    if (a.light === 'many') {
      tealight(tx - 0.08, th, tz + 0.06, true);
      const jar = new THREE.Group(); jar.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#f6e7c0', transparent: true, opacity: 0.35, depthWrite: false, emissive: '#ffb347', emissiveIntensity: 0.5 }))); const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), s.material('#f6f1e2', { emissive: '#ffcf7a', emissiveIntensity: 0.5 })); stub.position.y = -0.025; jar.add(stub); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), new THREE.MeshStandardMaterial({ color: '#ffd58a', emissive: '#ffb347', emissiveIntensity: 2.2 })); fl.scale.set(1, 2.2, 1); fl.position.y = 0.018; jar.add(fl); flames.push(fl); onTable(jar, 0.07, -0.04).position.y += 0.05;
      for (let i = 0; i < 4 + Math.round(mood.density * 5); i++) { const an = random() * 6.3, r = 0.24 + random() * 0.14; tealight(Math.cos(an) * r, lift, Math.sin(an) * r, random() > 0.15); }
    }
    if (a.light === 'lamp') {
      const lx = 0.62, lz = -0.48, brass = s.material('#b8963f', { metalness: 0.7, roughness: 0.35 });
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.03, 20), brass), lx, 0.015, lz);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 10), brass), lx, 0.2, lz);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10), s.material('#2a2a2a')), lx, 0.39, lz);
      const bulb = put(new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#ffd27a', emissiveIntensity: 1.8 })), lx, 0.455, lz); flames.push(bulb);
      put(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffd89a', transparent: true, opacity: 0.14, depthWrite: false })), lx, 0.455, lz);
      s.tube([[lx, 0.008, lz - 0.08], [lx + 0.2, 0.008, lz - 0.2], [lx + 0.1, 0.008, lz - 0.45], [lx + 0.4, 0.008, lz - 0.6]], 0.006, s.material('#e9e4d6'));
    }

    // --- what shares the table
    if (a.drink === 'fizz') { onTable(bottle('fizz'), 0.1, 0.05); const cork = onTable(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.03, 8), s.material('#c9a36a')), -0.1, 0.1); cork.rotation.z = 1.4; cork.position.y += 0.012; }
    else if (a.drink === 'wine') onTable(bottle('wine'), 0.1, 0.05);
    else if (a.drink === 'tea') { const flask = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 16), s.material(mood.cheer > 0.5 ? '#c8372d' : '#2f5a45', { metalness: 0.4, roughness: 0.4 })); body.position.y = 0.12; flask.add(body); const capm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.05, 14), s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 })); capm.position.y = 0.265; flask.add(capm); onTable(flask, 0.1, 0.04); }
    else if (a.drink === 'beer') { const opener = onTable(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.03), s.material('#c9cdd0', { metalness: 0.9, roughness: 0.3 })), 0.1, 0.06); opener.rotation.y = 0.7; opener.position.y += 0.003; for (let i = 0; i < 3; i++) { const capm = put(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.005, 10), s.material('#c9a53a', { metalness: 0.7 })), tx + 0.3 + random() * 0.2, 0.003, tz + 0.3 + random() * 0.2); void capm; } }
    // kitchen roll, the only tableware
    const roll = put(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 18), s.material('#f5f3ec', { roughness: 1 })), 0.38, 0.11 + lift, -0.32); void roll;
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.222, 10), s.material('#9a7a52')), 0.38, 0.11 + lift, -0.32);

    // --- what waits around them
    if (a.around === 'boxes') {
      const tape = s.material('#8a5a2b', { roughness: 0.45 }); let y = 0;
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) { const col = i < 3 ? 0 : 1; if (i === 3) y = 0; const w = 0.5 - random() * 0.06, h = 0.3 + random() * 0.08; const bx = put(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), kraft), 0.2 + col * 0.56, y + h / 2, -0.8 + (random() - 0.5) * 0.05); bx.rotation.y = (random() - 0.5) * 0.15; put(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.402), tape), 0, h / 2 + 0.001, 0, bx); const text = s.label(['KITCHEN', 'BOOKS', 'MISC', 'BEDROOM', 'PLATES'][i % 5], w * 0.8, h * 0.4, [0, 0, 0], '#161616', '#b98d5c'); text.position.set(0, 0, 0.203); bx.add(text); y += h + 0.004; }
    } else if (a.around === 'bags') {
      const bag = s.material('#1f2224', { roughness: 0.35 });
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) { const r = 0.2 + random() * 0.07, x = 0.15 + i * 0.36, z = -0.78 + (random() - 0.5) * 0.15; const b = put(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), bag), x, r * 0.85, z); b.scale.set(r, r * 0.95, r * 0.9); put(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), bag), x, r * 1.8 + 0.03, z).rotation.x = Math.PI; }
      // the broom laid down beside them
      s.rod([0.78, 0.035, -0.42], [0.95, 0.02, 0.62], 0.013, s.material('#c9a36a'));
      const head = put(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.045, 0.05), s.material('#3f6f8c')), 0.78, 0.045, -0.44); head.rotation.y = -0.16;
      const bristles = put(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.07), s.material('#c9b37a', { roughness: 1 })), 0.775, 0.016, -0.49); bristles.rotation.y = -0.16;
    } else if (a.around === 'sleeping') {
      for (let i = 0; i < Math.max(1, Math.min(n, 3)); i++) { const col = s.material(seatHex[(i * 2 + 1) % 5], { roughness: 0.9 }); const r = 0.13; const bagm = put(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.42, 16), col), 0.1 + i * 0.46, r, -0.78 + (random() - 0.5) * 0.12); bagm.rotation.z = Math.PI / 2; bagm.rotation.y = (random() - 0.5) * 0.6; for (const dx of [-0.1, 0.1]) { const strap = new THREE.Mesh(new THREE.TorusGeometry(r + 0.003, 0.006, 5, 20), s.material('#1c1c1c')); strap.rotation.x = Math.PI / 2; strap.position.y = dx; bagm.add(strap); } }
      const pillow = put(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), s.material('#efece2', { roughness: 1 })), -0.42, 0.07, -0.8); pillow.scale.set(0.28, 0.07, 0.18); pillow.rotation.y = 0.3;
    }

    const flick = mix(0.05, 0.3, mood.energy), phases = flames.map(() => random() * 6);
    void lit;
    return s.finish({ update: (_dt, time) => { flames.forEach((f, i) => { const k = 1 + Math.sin(time * 9 + phases[i]) * flick * 0.5 + Math.sin(time * 23 + phases[i] * 2) * flick * 0.5; f.scale.y = (f.geometry.type === 'SphereGeometry' && f.scale.x === 1 && f.position.y < 0.1 ? 2.1 : 1) * k; }); } });
  },
});
