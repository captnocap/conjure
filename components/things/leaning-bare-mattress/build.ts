import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    size: choice('Whose bed was it?', {
      single: 'A narrow single mattress: one person, a student, a spare room.',
      double: 'A wide double mattress: a couple, or someone who used to be one.',
      cot: "A small child's cot mattress.",
    }),
    cover: choice('What is the mattress covered in?', {
      ticking: 'Old-fashioned blue and cream striped ticking with tufted buttons.',
      quilted: 'White diamond-quilted cotton, a modern sprung mattress.',
      floral: 'Faded pink floral damask from decades ago.',
      foam: 'A bare yellowed slab of foam with no cover at all.',
    }),
    pose: choice('How has the mattress been left?', {
      landscape: 'On its long edge, leaning neatly against the wall.',
      portrait: 'Stood up on end, tall and precarious.',
      slumped: 'Bowing and sliding down the wall, about to fall over.',
      floor: 'Flat on the bare floor as a bed, with a pillow: sleeping here anyway.',
    }),
    frame: choice('What is left of the bed frame beside it?', {
      pine: 'A pine frame taken apart: headboard, side rails and a stack of slats.',
      metal: 'A tubular metal bedstead with hooped head and foot ends, nested together.',
      divan: 'An upholstered divan base tipped on its side, castors in the air.',
      none: 'Nothing: the mattress was always on the floor.',
    }),
    wall: choice('What is the wall behind it like?', {
      magnolia: 'Plain cream paint with a paler rectangle where the headboard stood.',
      wallpaper: 'Old striped floral wallpaper, peeling at a seam.',
      nursery: "Sky blue with a few star stickers and pencilled height marks: a child's room.",
      plaster: 'Stripped back to bare pink plaster and filler patches.',
    }),
    bedding: choice('What bedding is still with it?', {
      none: 'None, completely bare.',
      sheet: 'A fitted sheet still clinging to one corner.',
      pillow: 'A single bare pillow slumped against it.',
      duvet: 'A duvet rolled up and tied beside it.',
    }),
    sign: choice('What does the paper taped to the mattress say, if anything?', {
      none: 'Nothing is taped to it.',
      free: 'FREE',
      keep: 'KEEP',
      bulky: 'A council BULKY WASTE collection notice.',
      sorry: 'SORRY',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [mw, ml, mt] = { single: [0.9, 1.9, 0.2], double: [1.4, 1.95, 0.24], cot: [0.6, 1.2, 0.1] }[a.size] as [number, number, number];
    const t = a.cover === 'foam' ? mt * 0.7 : mt;
    const upright = a.pose === 'portrait' || (a.pose === 'slumped' && a.size !== 'double');
    const flat = a.pose === 'floor';
    const [bw, bh] = upright ? [mw, ml] : [ml, mw]; // box as it stands: horizontal extent, leaned height

    // --- the mattress face
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = Math.round(640 * mw / ml);
    const c = canvas.getContext('2d')!; const CW = 640, CH = canvas.height;
    const base = { ticking: '#e9e1cc', quilted: '#f1efe8', floral: '#ead3cd', foam: '#dcc572' }[a.cover];
    c.fillStyle = base; c.fillRect(0, 0, CW, CH);
    if (a.cover === 'ticking') {
      for (let y = 6; y < CH; y += 26) { c.fillStyle = '#4f6688'; c.fillRect(0, y, CW, 7); c.fillRect(0, y + 11, CW, 2); c.fillRect(0, y - 5, CW, 2); }
    } else if (a.cover === 'quilted') {
      c.strokeStyle = 'rgba(120,125,135,0.5)'; c.lineWidth = 2.5;
      for (let k = -CH; k < CW + CH; k += 44) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + CH, CH); c.moveTo(k, CH); c.lineTo(k + CH, 0); c.stroke(); }
    } else if (a.cover === 'floral') {
      for (let i = 0; i < 70; i++) {
        const x = random() * CW, y = random() * CH, r = 9 + random() * 8;
        c.fillStyle = '#7f9a78'; c.beginPath(); c.ellipse(x + r, y + r * 0.6, r, r * 0.4, 0.6, 0, 7); c.fill();
        c.fillStyle = i % 2 ? '#c66f7c' : '#d99aa0'; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.257) * r * 0.55, y + Math.sin(p * 1.257) * r * 0.55, r * 0.5, 0, 7); c.fill(); }
        c.fillStyle = '#e8c96a'; c.beginPath(); c.arc(x, y, r * 0.3, 0, 7); c.fill();
      }
    } else {
      for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(120,95,30,${random() * 0.2})`; c.fillRect(random() * CW, random() * CH, 2, 2); }
    }
    // the stain map: tide-lined continents
    const stains = 1 + Math.round(mood.wear * 2.4 + random());
    for (let i = 0; i < stains; i++) {
      const x = CW * (0.2 + random() * 0.6), y = CH * (0.2 + random() * 0.6), r = CH * (0.08 + random() * 0.13) * (0.7 + mood.wear * 0.6);
      const tone = random() < 0.75 ? '150,110,45' : '120,70,60';
      c.beginPath();
      for (let k = 0; k <= 24; k++) { const an = k / 24 * 6.283, rr = r * (0.75 + 0.35 * Math.sin(an * 3 + i) + 0.2 * Math.sin(an * 5 + i * 2)); c.lineTo(x + Math.cos(an) * rr * 1.5, y + Math.sin(an) * rr); }
      c.closePath(); c.fillStyle = `rgba(${tone},${0.09 + mood.wear * 0.07})`; c.fill(); c.strokeStyle = `rgba(${tone},${0.28 + mood.wear * 0.14})`; c.lineWidth = 2; c.stroke();
    }
    if (a.cover !== 'foam') {
      const cols = a.size === 'cot' ? 4 : 6, rows = a.size === 'double' ? 4 : 3;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = (i + 0.5) * CW / cols, y = (j + 0.5) * CH / rows;
        const g = c.createRadialGradient(x, y, 1, x, y, 26); g.addColorStop(0, 'rgba(40,35,30,0.4)'); g.addColorStop(1, 'rgba(40,35,30,0)'); c.fillStyle = g; c.fillRect(x - 26, y - 26, 52, 52);
        c.fillStyle = a.cover === 'ticking' ? '#3d5072' : '#d9d6cc'; c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill();
      }
    }
    c.fillStyle = `rgba(110,95,70,${mood.wear * 0.22})`; c.fillRect(0, 0, CW, CH);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    if (upright) { tex.center.set(0.5, 0.5); tex.rotation = Math.PI / 2; }
    const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    const sideMat = s.material(a.cover === 'ticking' ? '#b9b7a8' : base, { roughness: 1 });

    const sag = a.pose === 'slumped' ? 0.13 + random() * 0.08 : 0;
    const shape = (x: number, y: number, z: number) => {
      const u = x / bw, v = y / bh; // -0.5..0.5
      const f = (1 - (2 * u) ** 8) * (1 - (2 * v) ** 8);
      const k = a.cover === 'foam' ? 1 : 0.78 + 0.22 * f;
      return new THREE.Vector3(x, y + bh / 2, z * k + t / 2 + sag * Math.sin((v + 0.5) * Math.PI));
    };
    const geo = new THREE.BoxGeometry(bw, bh, t, 14, 14, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const q = shape(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, q.x, q.y, q.z); }
    geo.computeVertexNormals();
    const mattress = new THREE.Group();
    const body = new THREE.Mesh(geo, [sideMat, sideMat, sideMat, sideMat, faceMat, faceMat]);
    body.castShadow = body.receiveShadow = true; mattress.add(body);
    if (a.cover !== 'foam') {
      const pipe = s.material(a.cover === 'ticking' ? '#3d5072' : '#cfc9bb', { roughness: 0.9 });
      for (const zz of [-t / 2, t / 2]) {
        const pts: THREE.Vector3[] = [];
        const hx = bw / 2 - 0.004, hy = bh / 2 - 0.004;
        for (let k = 0; k < 10; k++) pts.push(shape(-hx + (2 * hx * k) / 10, -hy, zz));
        for (let k = 0; k < 10; k++) pts.push(shape(hx, -hy + (2 * hy * k) / 10, zz));
        for (let k = 0; k < 10; k++) pts.push(shape(hx - (2 * hx * k) / 10, hy, zz));
        for (let k = 0; k < 10; k++) pts.push(shape(-hx, hy - (2 * hy * k) / 10, zz));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.05), 120, 0.009, 5, true), pipe);
        tube.castShadow = true; mattress.add(tube);
      }
      // the law label
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.002), s.material('#f6f3ea')); tag.position.set(bw / 2 - 0.12, 0.05, t * 0.92); mattress.add(tag);
    }
    if (a.sign !== 'none') {
      const text = { free: 'FREE', keep: 'KEEP', bulky: 'BULKY WASTE', sorry: 'SORRY' }[a.sign];
      const note = s.label(text, a.sign === 'bulky' ? 0.42 : 0.34, 0.2, [0, 0, 0], a.sign === 'bulky' ? '#111' : '#1d2b55', a.sign === 'bulky' ? '#f0d93a' : '#f6f3ea');
      note.position.set((random() - 0.5) * bw * 0.3, bh * (0.55 + random() * 0.15), t + sag + 0.006); note.rotation.z = (random() - 0.5) * 0.25; mattress.add(note);
      for (const sx of [-1, 1]) { const tp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.002), s.material('#b99a63')); tp.position.set(note.position.x + sx * 0.15, note.position.y + 0.09, note.position.z + 0.002); tp.rotation.z = sx * -0.6; mattress.add(tp); }
    }
    if (a.bedding === 'sheet') {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.42, bh * 0.36, t * 1.06), s.material(mood.cheer > 0.6 ? '#9fc4d8' : '#f3f1ea', { roughness: 1 }));
      sheet.position.set(-bw / 2 + bw * 0.2, bh - bh * 0.17, t / 2 + sag * 0.3); sheet.castShadow = true; mattress.add(sheet);
      const drape = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.16, bh * 0.4, 7, 1, true), sheet.material); drape.position.set(-bw / 2 + bw * 0.36, bh * 0.52, t + 0.02 + sag); drape.scale.z = 0.25; drape.castShadow = true; mattress.add(drape);
    }
    s.root.add(mattress);

    // --- layout along the wall
    const frameW = a.frame === 'none' ? 0 : a.frame === 'divan' ? 0.75 : 1.05;
    const span = (flat ? ml : bw) + frameW + 0.5;
    const wallH = flat ? 1.35 : Math.min(2.3, Math.max(1.35, bh + 0.35));
    const wallX = 0;
    const mx = -span / 2 + 0.22 + (flat ? ml : bw) / 2;
    const lean = a.pose === 'slumped' ? 0.5 + random() * 0.12 : 0.13 + random() * 0.07;
    if (flat) {
      mattress.rotation.x = -Math.PI / 2; mattress.position.set(mx, 0, 0.35 + (upright ? 0 : bh));
      if (upright) mattress.rotation.z = Math.PI / 2;
      mattress.rotation.y = 0; mattress.position.z += (random()) * 0.15;
    } else {
      mattress.rotation.x = -lean; mattress.position.set(mx, 0, bh * Math.sin(lean) + 0.02); mattress.rotation.z = a.pose === 'slumped' ? 0 : (random() - 0.5) * 0.03;
    }

    // --- the wall section
    const wc = document.createElement('canvas'); wc.width = 512; wc.height = Math.round(512 * wallH / span);
    const w = wc.getContext('2d')!; const WW = 512, WH = wc.height;
    const wallBase = { magnolia: '#e9dfc4', wallpaper: '#e3d6c0', nursery: '#b9d6e6', plaster: '#d9b3a0' }[a.wall];
    w.fillStyle = wallBase; w.fillRect(0, 0, WW, WH);
    if (a.wall === 'magnolia') {
      w.fillStyle = `rgba(120,100,60,${0.1 + mood.wear * 0.15})`; w.fillRect(0, 0, WW, WH);
      w.fillStyle = '#f1e9d3'; const gx = (mx / span + 0.5) * WW; w.fillRect(gx - WW * 0.22, WH * 0.28, WW * 0.44, WH * 0.72);
      w.fillStyle = '#f4edd9'; w.fillRect(WW * 0.82, WH * 0.12, WW * 0.1, WH * 0.2);
      w.fillStyle = '#7b6b4a'; w.fillRect(WW * 0.865, WH * 0.1, 5, 7);
    } else if (a.wall === 'wallpaper') {
      for (let x = 0; x < WW; x += 34) { w.fillStyle = '#c9b497'; w.fillRect(x, 0, 12, WH); for (let y = 10 + (x % 3) * 9; y < WH; y += 42) { w.fillStyle = '#a8626a'; w.beginPath(); w.arc(x + 23, y, 6, 0, 7); w.fill(); w.fillStyle = '#6f8a66'; w.fillRect(x + 21, y + 6, 4, 10); } }
      w.fillStyle = '#cdbfa6'; w.beginPath(); w.moveTo(WW * 0.7, 0); w.lineTo(WW * 0.78, 0); w.lineTo(WW * 0.72, WH * 0.3); w.fill();
    } else if (a.wall === 'nursery') {
      for (let i = 0; i < 9; i++) { const x = random() * WW, y = random() * WH * 0.6, r = 7 + random() * 6; w.fillStyle = '#eef39a'; w.beginPath(); for (let k = 0; k < 10; k++) { const an = k * 0.6283 - 1.57, rr = k % 2 ? r * 0.45 : r; w.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } w.fill(); }
      w.strokeStyle = '#555'; w.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const y = WH * (0.72 - i * 0.075 - random() * 0.02); w.beginPath(); w.moveTo(WW * 0.9, y); w.lineTo(WW * 0.96, y + 1); w.stroke(); }
    } else {
      for (let i = 0; i < 9; i++) { w.fillStyle = i % 2 ? '#efe9dc' : '#c9a08c'; w.beginPath(); w.ellipse(random() * WW, random() * WH, 14 + random() * 40, 8 + random() * 22, random() * 3, 0, 7); w.fill(); }
      w.strokeStyle = 'rgba(90,60,50,0.5)'; w.lineWidth = 1.5; w.beginPath(); let cx = WW * 0.3, cy = 0; w.moveTo(cx, cy); for (let i = 0; i < 9; i++) { cx += (random() - 0.4) * 30; cy += WH / 12; w.lineTo(cx, cy); } w.stroke();
    }
    const wallTex = new THREE.CanvasTexture(wc); wallTex.colorSpace = THREE.SRGBColorSpace;
    const wallSide = s.material('#cfc8b8');
    const wall = new THREE.Mesh(new THREE.BoxGeometry(span, wallH, 0.1), [wallSide, wallSide, wallSide, wallSide, new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }), wallSide]);
    wall.position.set(wallX, wallH / 2, -0.05); wall.castShadow = wall.receiveShadow = true; s.root.add(wall);
    const white = s.material('#f3f0e6');
    s.box([span, 0.13, 0.02], [0, 0.065, 0.01], white); s.box([span, 0.02, 0.028], [0, 0.14, 0.014], white);

    // --- the frame, in the gap to the right
    const fx = mx + (flat ? ml : bw) / 2 + 0.2 + frameW / 2 - 0.1;
    const propped = (mesh: THREE.Object3D, height: number, tilt: number, x: number) => { const g = new THREE.Group(); g.add(mesh); g.rotation.x = -tilt; g.position.set(x, 0, height * Math.sin(tilt) + 0.03); s.root.add(g); return g; };
    if (a.frame === 'pine') {
      const pine = s.material('#d2a86a'), dark = s.material('#b98e52');
      const head = new THREE.Group();
      const hw = mw + 0.08, hh = a.size === 'cot' ? 0.7 : 0.95;
      for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, hh, 0.06), pine); post.position.set(sx * hw / 2, hh / 2, 0.03); post.castShadow = true; head.add(post); }
      for (let i = 0; i < 4; i++) { const rail = new THREE.Mesh(new THREE.BoxGeometry(hw, 0.09, 0.022), i % 2 ? pine : dark); rail.position.set(0, hh - 0.08 - i * 0.14, 0.03); rail.castShadow = true; head.add(rail); }
      head.rotation.z = Math.PI / 2; // stood on its side to fit
      const hg = new THREE.Group(); hg.add(head); head.position.set(hh / 2, hw / 2 + 0.03, 0);
      propped(hg, hw, 0.16, fx - 0.2);
      for (let i = 0; i < 2; i++) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.13, ml, 0.025), pine); rail.position.set(0, ml / 2, 0.012 + i * 0.03); rail.castShadow = true; const g = propped(rail, Math.min(ml, wallH * 1.02), 0.2 + i * 0.05, fx + 0.36 + i * 0.1); g.rotation.z = (i - 0.5) * 0.08; if (ml > wallH) g.rotation.x = -Math.asin(Math.min(0.9, wallH * 0.9 / ml)) + Math.PI / 2 - 1.2; }
      const n = a.size === 'cot' ? 7 : 11;
      for (let i = 0; i < n; i++) { const slat = s.box([mw - 0.04, 0.016, 0.068], [fx, 0.008 + Math.floor(i / 2) * 0.017, 0.75 + (i % 2) * 0.08], i % 3 ? pine : dark); slat.rotation.y = 0.5 + (random() - 0.5) * 0.12; }
      s.rod([fx + 0.4, 0.006, 0.95], [fx + 0.5, 0.006, 0.98], 0.005, s.material('#555', { metalness: 0.8 }));
      s.rod([fx + 0.5, 0.006, 0.98], [fx + 0.49, 0.006, 1.02], 0.005, s.material('#555', { metalness: 0.8 }));
    } else if (a.frame === 'metal') {
      const iron = s.material(mood.cheer > 0.55 ? '#e9e4d6' : '#2b2d30', { metalness: 0.5, roughness: 0.45 });
      [0, 1].forEach((i) => {
        const w2 = mw + 0.04, h2 = i ? 0.75 : 1.05, g = new THREE.Group();
        const pts: THREE.Vector3[] = [new THREE.Vector3(-w2 / 2, 0, 0), new THREE.Vector3(-w2 / 2, h2 - 0.2, 0)];
        for (let k = 1; k < 8; k++) pts.push(new THREE.Vector3(-Math.cos(k / 8 * Math.PI) * w2 / 2, h2 - 0.2 + Math.sin(k / 8 * Math.PI) * 0.2, 0));
        pts.push(new THREE.Vector3(w2 / 2, h2 - 0.2, 0), new THREE.Vector3(w2 / 2, 0, 0));
        const hoop = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 60, 0.016, 8), iron); hoop.castShadow = true; g.add(hoop);
        const bars = Math.round(w2 / 0.14);
        for (let k = 1; k < bars; k++) { const x = -w2 / 2 + k * w2 / bars; const top = h2 - 0.2 + Math.sin(Math.acos(Math.max(-1, Math.min(1, -x / (w2 / 2))))) * 0.2; const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, top - 0.3, 6), iron); bar.position.set(x, 0.3 + (top - 0.3) / 2, 0); bar.castShadow = true; g.add(bar); }
        const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w2, 6), iron); cross.rotation.z = Math.PI / 2; cross.position.y = 0.3; g.add(cross);
        g.rotation.z = Math.PI / 2; const hg = new THREE.Group(); hg.add(g); g.position.set(h2 / 2, w2 / 2 + 0.02, i * 0.05);
        propped(hg, w2, 0.14 + i * 0.07, fx - 0.05 + i * 0.12);
      });
      for (let i = 0; i < 2; i++) { const rail = s.box([0.04, 0.04, ml], [fx + 0.3 + i * 0.09, 0.02 + i * 0.01, 0.9], iron); rail.rotation.y = Math.PI / 2 - 0.25 - i * 0.12; rail.position.x = fx; rail.position.z = 0.7 + i * 0.14; }
    } else if (a.frame === 'divan') {
      const cloth = s.material(a.cover === 'floral' ? '#c9a9a4' : '#7d8894', { roughness: 1 });
      const dl = Math.min(ml * 0.5, 1), dh = 0.32;
      const g = new THREE.Group();
      const boxm = new THREE.Mesh(new THREE.BoxGeometry(dh, mw, dl), cloth); boxm.position.set(0, mw / 2, 0); boxm.castShadow = true; g.add(boxm);
      const under = new THREE.Mesh(new THREE.BoxGeometry(0.01, mw - 0.04, dl - 0.04), s.material('#2a2a2a')); under.position.set(dh / 2 + 0.004, mw / 2, 0); g.add(under);
      for (const y of [0.1, mw - 0.1]) for (const z of [-dl / 2 + 0.1, dl / 2 - 0.1]) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), s.material('#888', { metalness: 0.7 })); stem.rotation.z = Math.PI / 2; stem.position.set(dh / 2 + 0.03, y, z); g.add(stem);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.022, 12), s.material('#1c1c1c')); wheel.position.set(dh / 2 + 0.065, y, z); wheel.rotation.x = Math.PI / 2; wheel.castShadow = true; g.add(wheel);
      }
      g.position.set(fx - 0.1, 0, dl / 2 + 0.06); g.rotation.y = 0.12; s.root.add(g);
    }

    // --- loose bedding on the floor
    const linen = s.material(mood.cheer > 0.6 ? '#e8d9a8' : '#efece2', { roughness: 1 });
    if (a.bedding === 'pillow' || flat) {
      const pillow = s.ball([0.33, 0.085, 0.21], [0, 0, 0], linen, 18);
      if (flat) { pillow.position.set(mx - ml / 2 + 0.3, t + 0.07, 0.35 + mw / 2 + 0.1); pillow.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.4; }
      else { pillow.position.set(mx - bw * 0.2, 0.17, bh * Math.sin(lean) + t + 0.2); pillow.rotation.x = -0.9; pillow.rotation.y = 0.2; }
    }
    if (flat) { // a blanket thrown across the foot
      const blanket = s.box([ml * 0.45, 0.05, mw * 1.05], [mx + ml * 0.2, t + 0.03, 0.4 + mw / 2 + 0.05], s.material(mood.warmth > 0.5 ? '#b5563c' : '#4f6f8c', { roughness: 1 })); blanket.rotation.y = (random() - 0.5) * 0.3;
    }
    if (a.bedding === 'duvet') {
      const roll = s.cylinder(0.2, 0.2, 0.7, [mx + bw * 0.15, 0.2, (flat ? 0.5 + mw : bh * Math.sin(lean) + t + sag) + 0.5], linen, 16); roll.rotation.z = Math.PI / 2; roll.rotation.y = 0.3; roll.scale.z = 0.85;
      for (const dx of [-0.18, 0.18]) { const band = s.ring(0.203, 0.008, [roll.position.x + dx * Math.cos(0.3), 0.2, roll.position.z - dx * Math.sin(0.3)], s.material('#b3262b')); band.rotation.y = Math.PI / 2 + 0.3; band.scale.y = 0.85; band.scale.x = 0.85; band.scale.set(0.87, 1, 1); }
    }
    return s.finish();
  },
});
