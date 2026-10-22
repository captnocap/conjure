import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    form: choice('What shape is the vault?', {
      cube: 'A stone-like cube on a plinth course, blunt as a mausoleum.',
      drum: 'An upright armoured cylinder with ribs and a domed cap.',
      seed: 'A seed-shaped pod, swollen low and pointed at the top, standing on short fins.',
      stele: 'A thick standing slab with a rounded head, a gravestone the size of a house.',
    }),
    door: choice('What state is its one small door in?', {
      sealed: 'Sealed tight: straps across it and an unbroken seal.',
      ajar: 'Ajar, with warm light still on inside.',
      forced: 'Forced: the door lies on the ground and the opening is black and scorched.',
      welded: 'Welded shut with crude bars by someone who came later.',
    }),
    script: choice('What language is the inscription in?', {
      wedges: 'Rows of small wedge marks, like cuneiform.',
      pictures: 'Rows of little pictures: suns, figures, waves, eyes.',
      binary: 'Dots and dashes, a machine code meant to be decoded.',
      diagram: 'A star map of radiating lines and circles, with rows of ticks beneath.',
      many: 'Every row in a different script, the same message over and over.',
      worn: 'Whatever it was, it has been worn almost smooth.',
    }),
    reader: choice('Who was it meant for, to judge by the plaque over the door?', {
      kin: 'Their own descendants: a row of handprints, large and small.',
      strangers: 'Any stranger: an arrow, an open hand, steps and a guide lamp to welcome them.',
      later: 'Themselves, later: a countdown dial that stopped long ago.',
      nobody: 'Nobody: a warning cross and a ring of spikes to keep everyone out.',
    }),
    pulse: noul('Does the beacon on top still give a faint pulse?'),
    offerings: noul('Have later visitors left small offerings at the door?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = { cube: '#9a917f', drum: '#676d73', seed: '#a2714a', stele: '#4a4c50' }[a.form];
    const ink = { cube: '#332e26', drum: '#c3c9cd', seed: '#4f3220', stele: '#aeb1b3' }[a.form];
    const hull = s.material(tone, { roughness: a.form === 'drum' ? 0.55 : 0.92, metalness: a.form === 'drum' ? 0.45 : a.form === 'seed' ? 0.25 : 0 });
    const trim = s.material(new THREE.Color(tone).multiplyScalar(0.62), { roughness: 0.7, metalness: a.form === 'drum' ? 0.5 : 0.1 });
    const iron = s.material('#3a3c40', { metalness: 0.6, roughness: 0.5 });

    // The inscription: rows of marks painted on a canvas the colour of the hull.
    const inscribe = (width: number, height: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = Math.max(128, Math.round(1024 * height / width));
      const W = 1024, H = canvas.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = tone; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 900; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(random() * W, random() * H, 2 + random() * 26, 2 + random() * 8); }
      ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineCap = 'round';
      const row = 1024 / width * 0.17, top = row * 0.8;
      const rows = Math.floor((H - top * 2) / row);
      const mark = (style: string, x: number, y: number, h: number) => {
        ctx.lineWidth = h * 0.13;
        if (style === 'wedges') {
          const n = 1 + Math.floor(random() * 3);
          for (let k = 0; k < n; k++) { const vx = x + k * h * 0.28, flat = random() < 0.35; ctx.beginPath(); if (flat) { ctx.moveTo(vx, y); ctx.lineTo(vx + h * 0.2, y - h * 0.12); ctx.lineTo(vx + h * 0.2, y + h * 0.12); } else { ctx.moveTo(vx, y - h * 0.4); ctx.lineTo(vx + h * 0.24, y - h * 0.4); ctx.lineTo(vx + h * 0.12, y + h * 0.4); } ctx.fill(); }
          return n * h * 0.28 + h * 0.25;
        }
        if (style === 'binary') { const long = random() < 0.4; ctx.fillRect(x, y - h * 0.14, long ? h * 0.7 : h * 0.26, h * 0.28); return (long ? h * 0.7 : h * 0.26) + h * (random() < 0.15 ? 0.7 : 0.22); }
        if (style === 'pictures') {
          const kind = Math.floor(random() * 6);
          ctx.beginPath();
          if (kind === 0) { ctx.arc(x + h * 0.4, y, h * 0.2, 0, 7); ctx.stroke(); for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(x + h * 0.4 + Math.cos(k * 0.785) * h * 0.28, y + Math.sin(k * 0.785) * h * 0.28); ctx.lineTo(x + h * 0.4 + Math.cos(k * 0.785) * h * 0.42, y + Math.sin(k * 0.785) * h * 0.42); ctx.stroke(); } }
          if (kind === 1) { ctx.arc(x + h * 0.4, y - h * 0.28, h * 0.11, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + h * 0.4, y - h * 0.16); ctx.lineTo(x + h * 0.4, y + h * 0.12); ctx.moveTo(x + h * 0.16, y - h * 0.05); ctx.lineTo(x + h * 0.64, y - h * 0.05); ctx.moveTo(x + h * 0.4, y + h * 0.12); ctx.lineTo(x + h * 0.2, y + h * 0.42); ctx.moveTo(x + h * 0.4, y + h * 0.12); ctx.lineTo(x + h * 0.6, y + h * 0.42); ctx.stroke(); }
          if (kind === 2) { for (let k = 0; k < 3; k++) { ctx.moveTo(x + k * h * 0.26, y + h * 0.1); ctx.quadraticCurveTo(x + k * h * 0.26 + h * 0.13, y - h * 0.3, x + k * h * 0.26 + h * 0.26, y + h * 0.1); } ctx.stroke(); }
          if (kind === 3) { ctx.ellipse(x + h * 0.4, y, h * 0.36, h * 0.2, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x + h * 0.4, y, h * 0.1, 0, 7); ctx.fill(); }
          if (kind === 4) { ctx.moveTo(x + h * 0.1, y + h * 0.35); ctx.lineTo(x + h * 0.4, y - h * 0.38); ctx.lineTo(x + h * 0.7, y + h * 0.35); ctx.closePath(); ctx.stroke(); }
          if (kind === 5) { ctx.arc(x + h * 0.4, y, h * 0.3, 0.6, 5.6); ctx.stroke(); ctx.beginPath(); ctx.arc(x + h * 0.52, y - h * 0.05, h * 0.06, 0, 7); ctx.fill(); }
          return h * 1.05;
        }
        if (style === 'loops') { ctx.beginPath(); ctx.moveTo(x, y + h * 0.2); ctx.bezierCurveTo(x + h * 0.1, y - h * 0.6, x + h * 0.35, y + h * 0.7, x + h * 0.45, y - h * 0.1 - random() * h * 0.3); ctx.stroke(); return h * (0.42 + (random() < 0.2 ? 0.4 : 0)); }
        // 'letters': angular strokes.
        ctx.beginPath(); const n = 2 + Math.floor(random() * 2);
        for (let k = 0; k < n; k++) { ctx.moveTo(x + random() * h * 0.4, y - h * 0.38 + random() * h * 0.3); ctx.lineTo(x + random() * h * 0.4, y + h * 0.38 - random() * h * 0.3); }
        ctx.stroke();
        return h * (0.6 + (random() < 0.18 ? 0.5 : 0));
      };
      const styles = ['wedges', 'loops', 'binary', 'letters', 'pictures'];
      let first = 0;
      if (a.script === 'diagram') {
        const cx = W * 0.5, cy = Math.min(H * 0.34, W * 0.3), reach = Math.min(cy * 0.85, W * 0.28);
        ctx.lineWidth = 5;
        for (let k = 0; k < 14; k++) { const t = random() * Math.PI * 2, len = reach * (0.35 + random() * 0.65); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t) * len, cy + Math.sin(t) * len); ctx.stroke(); for (let j = 0; j < 5; j++) { const d = len * (0.5 + j * 0.1); ctx.fillRect(cx + Math.cos(t) * d - 3, cy + Math.sin(t) * d - 3, 6, 6); } }
        ctx.beginPath(); ctx.arc(cx, cy, reach * 0.09, 0, 7); ctx.fill();
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + side * reach * 1.35, cy, reach * 0.22, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + side * reach * 1.35, cy, reach * 0.05, 0, 7); ctx.fill(); }
        first = Math.ceil((cy + reach - top) / row) + 1;
      }
      for (let r = first; r < rows; r++) {
        const style = a.script === 'many' ? styles[r % styles.length] : a.script === 'diagram' ? 'binary' : a.script === 'worn' ? 'letters' : a.script;
        const y = top + (r + 0.5) * row, h = row * 0.68;
        for (let x = W * 0.05; x < W * 0.95;) x += mark(style, x, y, h);
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(W * 0.04, top + (r + 1) * row - 2, W * 0.92, 3); ctx.fillStyle = ink;
      }
      // Wear: patches rubbed back to bare hull, and long drip stains.
      const rubs = a.script === 'worn' ? 260 : Math.round(mood.wear * 70);
      ctx.fillStyle = tone;
      for (let i = 0; i < rubs; i++) { ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.ellipse(random() * W, random() * H, 20 + random() * 90, 10 + random() * 40, random() * 3, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 6 + mood.wear * 22; i++) { const x = random() * W, len = H * (0.15 + random() * 0.5); const g = ctx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(20,18,16,0.3)'); g.addColorStop(1, 'rgba(20,18,16,0)'); ctx.fillStyle = g; ctx.fillRect(x, 0, 6 + random() * 16, len); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = THREE.RepeatWrapping;
      map.anisotropy = 4;
      return new THREE.MeshStandardMaterial({ map, roughness: hull.roughness, metalness: hull.metalness });
    };

    // The hull. `front` is how far the door wall stands from the axis; `crown` is the top.
    let front = 1.3, crown = 2.9;
    if (a.form === 'cube') {
      s.box([3.0, 0.3, 3.0], [0, 0.15, 0], trim);
      s.box([2.6, 2.4, 2.6], [0, 1.5, 0], hull);
      s.box([2.85, 0.2, 2.85], [0, 2.8, 0], trim);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.3, 2.4, 0.3], [x * 1.22, 1.5, z * 1.22], trim);
      const face = inscribe(2.05, 2.15);
      for (let k = 0; k < 4; k++) { const panel = s.mesh(new THREE.PlaneGeometry(2.05, 2.15), face, [Math.sin(k * Math.PI / 2) * 1.305, 1.5, Math.cos(k * Math.PI / 2) * 1.305]); panel.rotation.y = k * Math.PI / 2; }
      front = 1.3; crown = 2.9;
    } else if (a.form === 'drum') {
      const skin = inscribe(1.3 * Math.PI * 2, 2.5);
      s.cylinder(1.3, 1.3, 2.5, [0, 1.5, 0], skin, 48);
      s.cylinder(1.42, 1.5, 0.25, [0, 0.125, 0], trim, 48);
      const cap = s.ball([1.36, 0.5, 1.36], [0, 2.75, 0], hull, 32);
      cap.castShadow = true;
      for (const y of [0.3, 1.1, 1.95, 2.72]) { const hoop = s.ring(1.32, 0.06, [0, y, 0], trim); hoop.rotation.x = Math.PI / 2; }
      for (let k = 0; k < 12; k++) { if (k === 0 || random() < mood.wear * 0.25) continue; const t = k * Math.PI / 6; s.box([0.09, 2.45, 0.09], [Math.sin(t) * 1.33, 1.5, Math.cos(t) * 1.33], trim).rotation.y = t; }
      front = 1.3; crown = 3.22;
    } else if (a.form === 'seed') {
      const profile: [number, number][] = [[0, 0.25], [0.55, 0.3], [0.98, 0.62], [1.2, 1.15], [1.22, 1.6], [1.05, 2.2], [0.72, 2.8], [0.38, 3.25], [0.12, 3.55], [0, 3.62]];
      s.lathe(profile, inscribe(1.2 * Math.PI * 2, 3.6));
      for (let k = 0; k < 6; k++) { const t = k * Math.PI / 3 + Math.PI / 6; s.tube(profile.slice(1, -1).map(([r, y]) => [Math.sin(t) * (r + 0.02), y, Math.cos(t) * (r + 0.02)] as [number, number, number]), 0.045, trim); }
      for (let k = 0; k < 3; k++) { const t = k * Math.PI * 2 / 3 + Math.PI; const fin = s.box([0.12, 0.75, 0.9], [Math.sin(t) * 1.0, 0.375, Math.cos(t) * 1.0], trim); fin.rotation.y = t; }
      const hoop = s.ring(1.24, 0.06, [0, 1.38, 0], trim); hoop.rotation.x = Math.PI / 2;
      front = 1.02; crown = 3.6;
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(-1.15, 0); shape.lineTo(1.15, 0); shape.lineTo(1.15, 2.5); shape.absarc(0, 2.5, 1.15, 0, Math.PI, false); shape.lineTo(-1.15, 0);
      const slab = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 20 }), hull, [0, 0.4, -0.45]);
      slab.castShadow = true;
      s.box([3.1, 0.2, 1.7], [0, 0.1, 0], trim);
      s.box([2.7, 0.2, 1.3], [0, 0.3, 0], trim);
      const face = inscribe(1.9, 1.7);
      s.mesh(new THREE.PlaneGeometry(1.9, 1.7), face, [0, 2.75, 0.508]);
      s.mesh(new THREE.PlaneGeometry(1.9, 1.7), face, [0, 2.75, -0.508]).rotation.y = Math.PI;
      front = 0.5; crown = 4.05;
    }

    // Door casing standing proud of the hull, so the opening needs no hole cut.
    const base = a.form === 'cube' ? 0.3 : a.form === 'stele' ? 0.4 : a.form === 'seed' ? 0.3 : 0.25;
    const dw = 0.62, dh = 1.05, z0 = front - 0.12, z1 = front + 0.2;
    const mid = (z0 + z1) / 2, deep = z1 - z0;
    s.box([0.14, dh + 0.14, deep], [-dw / 2 - 0.07, base + dh / 2 + 0.07, mid], trim);
    s.box([0.14, dh + 0.14, deep], [dw / 2 + 0.07, base + dh / 2 + 0.07, mid], trim);
    s.box([dw + 0.28, 0.16, deep + 0.04], [0, base + dh + 0.1, mid], trim);
    s.box([dw + 0.4, 0.08, deep + 0.14], [0, base + 0.02, mid + 0.05], trim);
    const warm = new THREE.Color().setHSL(mix(0.14, 0.07, mood.warmth), 0.95, 0.62);
    const inner = new THREE.MeshStandardMaterial({ color: a.door === 'ajar' ? warm : '#0b0b0d', emissive: a.door === 'ajar' ? warm : '#000000', emissiveIntensity: a.door === 'ajar' ? 1.3 : 0, roughness: 1 });
    s.box([dw, dh, 0.04], [0, base + dh / 2 + 0.04, z0 + 0.06], inner);
    const door = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, 0.07), iron);
    leaf.position.set(dw / 2, dh / 2, 0);
    leaf.castShadow = true;
    door.add(leaf);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 6, 18), s.material('#8c8473', { metalness: 0.6 }));
    wheel.position.set(dw / 2, dh * 0.55, 0.06);
    door.add(wheel);
    for (let k = 0; k < 3; k++) { const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.02), wheel.material); spoke.position.copy(wheel.position); spoke.rotation.z = k * Math.PI / 3; door.add(spoke); }
    for (const y of [0.18, dh - 0.18]) { const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), trim); hinge.position.set(0, y, 0.03); door.add(hinge); }
    door.position.set(-dw / 2, base + 0.04, z1 - 0.03);
    s.root.add(door);
    if (a.door === 'ajar') {
      door.rotation.y = -mix(0.9, 1.7, random());
      const spill = new THREE.Mesh(new THREE.CircleGeometry(1.25, 24, Math.PI * 1.3, Math.PI * 0.4), new THREE.MeshBasicMaterial({ color: warm, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
      spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.012, z1 - 0.2);
      s.root.add(spill);
    }
    if (a.door === 'forced') {
      door.position.set(-0.2 - random() * 0.5, 0.06, z1 + 0.95 + random() * 0.4);
      door.rotation.set(-Math.PI / 2 + 0.06, 0, 0.5 + random() * 1.2);
      for (let k = 0; k < 9; k++) { const t = k / 9 * Math.PI * 2; const scorch = s.mesh(new THREE.CircleGeometry(0.07 + random() * 0.12, 10), new THREE.MeshBasicMaterial({ color: '#141210', transparent: true, opacity: 0.4, depthWrite: false }), [Math.cos(t) * (dw / 2 + 0.16), base + dh / 2 + Math.sin(t) * (dh / 2 + 0.14), z1 + 0.012]); scorch.castShadow = false; }
      s.rod([dw / 2 + 0.02, base + 0.3, z1], [dw / 2 + 0.28, base + 0.18, z1 + 0.3], 0.025, iron);
      s.rod([dw / 2 + 0.02, base + dh - 0.2, z1], [dw / 2 + 0.2, base + dh + 0.05, z1 + 0.22], 0.025, iron);
    }
    if (a.door === 'sealed') {
      const strap = s.material('#7a6a46', { metalness: 0.5 });
      for (const y of [0.3, 0.78]) s.box([dw + 0.3, 0.07, 0.03], [0, base + y, z1 + 0.03], strap);
      s.cylinder(0.09, 0.09, 0.03, [dw / 2 + 0.02, base + 0.3, z1 + 0.055], s.material('#a3261d', { roughness: 0.5 }), 14).rotation.x = Math.PI / 2;
    }
    if (a.door === 'welded') {
      const bar = s.material('#6b4a36', { roughness: 0.9, metalness: 0.4 });
      for (let k = 0; k < 4; k++) { const y = base + 0.15 + k * 0.26 + random() * 0.06, slant = (random() - 0.5) * 0.3; s.rod([-dw / 2 - 0.2, y - slant, z1 + 0.05], [dw / 2 + 0.2, y + slant, z1 + 0.05], 0.03, bar); for (const x of [-1, 1]) s.ball([0.05, 0.05, 0.04], [x * (dw / 2 + 0.12), y + x * slant * 0.8, z1 + 0.05], bar, 8); }
    }

    // The plaque over the door says who the vault was for.
    {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#c9b98f'; ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = '#3a2f22'; ctx.fillStyle = '#3a2f22'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.strokeRect(10, 10, 492, 236);
      const hand = (x: number, y: number, size: number) => { ctx.beginPath(); ctx.ellipse(x, y, size * 0.5, size * 0.55, 0, 0, 7); ctx.fill(); for (let k = 0; k < 5; k++) { const t = -2.5 + k * 0.48; ctx.lineWidth = size * 0.2; ctx.beginPath(); ctx.moveTo(x + Math.cos(t) * size * 0.4, y + Math.sin(t) * size * 0.4); ctx.lineTo(x + Math.cos(t) * size * (k === 0 ? 0.85 : 1.15), y + Math.sin(t) * size * (k === 0 ? 0.85 : 1.15)); ctx.stroke(); } };
      if (a.reader === 'kin') { [[90, 60], [200, 42], [300, 56], [390, 34], [456, 24]].forEach(([x, size]) => hand(x, 150 + (60 - size) * 0.6, size)); }
      if (a.reader === 'strangers') { hand(390, 140, 58); ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(60, 128); ctx.lineTo(250, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(190, 70); ctx.lineTo(262, 128); ctx.lineTo(190, 186); ctx.stroke(); }
      if (a.reader === 'later') { ctx.lineWidth = 9; for (const r of [96, 66, 36]) { ctx.beginPath(); ctx.arc(256, 128, r, 0, 7); ctx.stroke(); } for (let k = 0; k < 24; k++) { const t = k * Math.PI / 12; ctx.beginPath(); ctx.moveTo(256 + Math.cos(t) * 80, 128 + Math.sin(t) * 80); ctx.lineTo(256 + Math.cos(t) * 96, 128 + Math.sin(t) * 96); ctx.stroke(); } const t = random() * 6; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(256, 128); ctx.lineTo(256 + Math.cos(t) * 74, 128 + Math.sin(t) * 74); ctx.stroke(); }
      if (a.reader === 'nobody') { ctx.strokeStyle = '#a3261d'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(170, 50); ctx.lineTo(342, 206); ctx.moveTo(342, 50); ctx.lineTo(170, 206); ctx.stroke(); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const plaque = s.mesh(new THREE.BoxGeometry(0.92, 0.46, 0.05), [iron, iron, iron, iron, new THREE.MeshStandardMaterial({ map, roughness: 0.6, metalness: 0.3 }), iron] as unknown as THREE.Material, [0, base + dh + 0.48, z1 - 0.02]);
      plaque.rotation.x = -0.12;
      plaque.rotation.z = (random() - 0.5) * mood.wear * 0.3;
    }
    if (a.reader === 'strangers') {
      for (let k = 0; k < 3; k++) s.box([1.5 - k * 0.25, 0.1, 0.36], [0, 0.05 + k * 0.1, z1 + 0.75 - k * 0.3], trim);
      s.rod([0.95, 0, z1 + 0.5], [0.95, 0.9, z1 + 0.5], 0.03, iron);
      s.ball([0.1, 0.1, 0.1], [0.95, 0.98, z1 + 0.5], new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffcc66', emissiveIntensity: mix(0.3, 1.5, mood.cheer) }), 12);
    }
    if (a.reader === 'nobody') {
      const reach = Math.max(front, a.form === 'cube' ? 1.6 : 1.3) + 0.55;
      for (let k = 0; k < 18; k++) { const t = k / 18 * Math.PI * 2 + 0.17; if (Math.abs(Math.sin(t)) < 0.25 && Math.cos(t) > 0) continue; const x = Math.sin(t) * reach * (a.form === 'stele' ? 1.5 : 1.15), z = Math.cos(t) * reach; const lean = 0.35 + random() * 0.3; s.rod([x, 0, z], [x * (1 + lean * 0.35), 0.75 + random() * 0.7, z * (1 + lean * 0.35)], 0.07, iron, 0.004); }
    }

    // The beacon: a mast, a cage and a lamp that is dead or very nearly.
    const lampMat = new THREE.MeshStandardMaterial({ color: a.pulse ? '#7a2a1c' : '#2a2e33', emissive: '#ff5a2e', emissiveIntensity: 0, roughness: 0.3 });
    const mast = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.8, 8), iron);
    pole.position.y = 0.4; pole.castShadow = true;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), lampMat);
    lamp.position.y = 0.88;
    mast.add(pole, lamp);
    for (let k = 0; k < 4; k++) { const bar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 5, 14, Math.PI), iron); bar.position.y = 0.88; bar.rotation.set(0, k * Math.PI / 4, Math.PI / 2); mast.add(bar); }
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.1, 16, 1, true), s.material('#8a8d90', { side: THREE.DoubleSide, metalness: 0.4 }));
    dish.position.y = 0.66;
    mast.add(dish);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshBasicMaterial({ color: '#ff6a3a', transparent: true, opacity: 0, depthWrite: false }));
    glow.position.y = 0.88;
    mast.add(glow);
    mast.position.set(a.form === 'cube' ? 0.7 : 0, crown - 0.04, a.form === 'cube' ? -0.6 : 0);
    mast.rotation.z = mood.wear * 0.45 * (random() < 0.5 ? -1 : 1);
    s.root.add(mast);

    if (a.offerings) {
      const stone = s.material('#8f8a82', { roughness: 1, flatShading: true });
      const cx = -0.75, cz = z1 + 0.45;
      for (let k = 0; k < 4; k++) { const rock = s.mesh(new THREE.IcosahedronGeometry(0.15 - k * 0.028, 0), stone, [cx + (random() - 0.5) * 0.03, 0.09 + k * 0.17, cz]); rock.scale.y = 0.6; rock.rotation.y = random() * 3; }
      const n = 3 + Math.round(mood.density * 5);
      for (let k = 0; k < n; k++) {
        const x = -0.35 + random() * 1.3, z = z1 + 0.35 + random() * 0.55;
        if (k % 3 === 0) { s.cylinder(0.035, 0.035, 0.12 + random() * 0.1, [x, 0.08, z], s.material('#efe8d6'), 8); s.ball([0.022, 0.04, 0.022], [x, 0.2, z], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb53a', emissiveIntensity: 1.4 }), 8); }
        else if (k % 3 === 1) { s.cylinder(0.05, 0.035, 0.08, [x, 0.04, z], s.material(['#3e6f8a', '#b5533c', '#d8cfb4'][k % 3 + 0]), 10); }
        else { s.rod([x, 0, z], [x + 0.03, 0.2, z], 0.008, s.material('#4f6b3a')); s.ball([0.045, 0.045, 0.045], [x + 0.03, 0.22, z], s.material(['#d9a3c0', '#e6d37a', '#e9e4dc'][Math.floor(random() * 3)]), 8); }
      }
    }

    const pace = mix(0.5, 1.6, mood.energy);
    return s.finish({
      update(_dt, time) {
        if (!a.pulse) return;
        const beat = Math.pow(Math.max(0, Math.sin(time * 0.9 * pace)), 6);
        lampMat.emissiveIntensity = 0.25 + beat * 1.6;
        (glow.material as THREE.MeshBasicMaterial).opacity = 0.05 + beat * 0.22;
      },
    });
  },
});
