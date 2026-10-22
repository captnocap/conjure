import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SEG: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };

export default defineThing({
  questions: {
    phone: choice('What kind of telephone is it?', {
      rotary: 'A heavy beige rotary phone with a finger-wheel dial.',
      pushbutton: 'A chunky 1980s push-button phone with a grid of square keys.',
      red: 'A red push-button phone, oddly urgent for a motel.',
    }),
    phoneState: choice('What state is the phone in?', {
      hook: 'On the hook, waiting.',
      'off-hook': 'Off the hook, the handset lying on its side with the coiled cord trailing over the edge.',
      message: 'On the hook with the red message light blinking.',
      unplugged: 'On the hook, its cord pulled out and looped on the table.',
    }),
    clock: choice('What does the clock radio show?', {
      late: '3:07, the dead middle of the night.',
      checkout: '11:00, checkout time.',
      blinking: 'A blinking 12:00, never set since the last power cut.',
      alarm: '5:59, a minute before the alarm.',
      dead: 'Nothing: the display is dark.',
    }),
    item: choice('What else is in or on it?', {
      book: 'Only the thick black book, the drawer pulled further open on it.',
      matchbook: 'A matchbook from somewhere else and a burnt match.',
      pills: 'A tipped-over pill bottle with a few pills spilled.',
      ring: 'A wedding ring, taken off and set down by itself.',
      notepad: 'A notepad with a phone number written on it and a pen.',
    }),
    lampOn: noul('Is the lamp switched on?'),
    shade: choice('What is the lampshade like?', {
      pleated: 'A neat pleated drum shade.',
      cone: 'A wide flared cone in coarse burlap.',
      crooked: 'A pleated shade knocked crooked with a scorch mark.',
      bare: 'No shade at all: a bare bulb on the harp.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.8, D = 0.48, H = 0.6;
    const lamTone = mood.warmth > 0.5 ? '#9a6a3a' : '#8a7860';
    const lamMap = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d')!;
      g.fillStyle = lamTone; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 80; i++) { g.strokeStyle = `rgba(${random() > 0.5 ? '40,20,5' : '255,220,170'},${0.05 + random() * 0.12})`; g.lineWidth = 1 + random() * 2; const y = random() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(90, y + random() * 12 - 6, 170, y + random() * 12 - 6, 256, y); g.stroke(); }
      for (let i = 0; i < Math.round(mood.wear * 7); i++) { const x = random() * 256, y = random() * 256; g.fillStyle = 'rgba(25,15,8,0.75)'; g.beginPath(); g.ellipse(x, y, 4 + random() * 5, 3, random() * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(240,230,210,0.35)'; g.lineWidth = 3; g.beginPath(); g.arc(random() * 256, random() * 256, 16, 0, 7); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const lam = new THREE.MeshStandardMaterial({ map: lamMap, roughness: 0.4 + mood.wear * 0.4 });
    const edge = s.material('#33261c');
    const dark = s.material('#242220');
    const brass = s.material('#c9a24a', { metalness: 0.75, roughness: 0.3 });
    const chrome = s.material('#d5d9dc', { metalness: 0.85, roughness: 0.25 });
    const paper = s.material('#f1ecdc', { roughness: 0.95 });

    // Carcass, open shelf, drawer.
    s.box([W, 0.03, D], [0, H - 0.015, 0], lam);
    s.box([W + 0.012, 0.012, D + 0.012], [0, H - 0.034, 0], edge);
    for (const x of [-1, 1]) s.box([0.025, H - 0.04, D - 0.02], [x * (W / 2 - 0.0125), (H - 0.04) / 2, 0], lam);
    s.box([W - 0.04, H - 0.06, 0.015], [0, (H - 0.06) / 2 + 0.01, -D / 2 + 0.02], lam);
    s.box([W - 0.05, 0.02, D - 0.03], [0, 0.07, 0], lam);
    s.box([W - 0.05, 0.02, D - 0.03], [0, 0.36, 0], lam);
    s.box([W - 0.06, 0.06, D - 0.08], [0, 0.03, -0.01], edge);
    const pull = a.item === 'book' ? 0.2 : 0.06 + random() * 0.05;
    const drawer = new THREE.Group();
    drawer.position.set(0, 0.47, pull);
    drawer.rotation.y = (random() - 0.5) * mood.wear * 0.08;
    s.root.add(drawer);
    const d = (m: THREE.Mesh) => { drawer.add(m); return m; };
    d(s.box([W - 0.06, 0.17, 0.02], [0, 0, D / 2 - 0.01], lam));
    d(s.box([W - 0.08, 0.012, D - 0.06], [0, -0.07, 0], edge));
    for (const x of [-1, 1]) d(s.box([0.012, 0.13, D - 0.06], [x * (W / 2 - 0.045), -0.01, 0], edge));
    d(s.box([0.16, 0.018, 0.022], [0, 0, D / 2 + 0.012], brass));
    // The book in the drawer.
    const book = d(s.box([0.2, 0.055, 0.14], [-0.08 + random() * 0.14, -0.035, D / 2 - 0.1], s.material('#1c1b1e', { roughness: 0.5 })));
    book.rotation.y = (random() - 0.5) * 0.5;
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.042, 0.142), s.material('#d9b85a', { metalness: 0.5, roughness: 0.4 })); pages.position.x = 0.006; book.add(pages);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.06), brass); cross.position.set(-0.02, 0.028, 0); book.add(cross);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.002, 0.012), brass); bar.position.set(-0.02, 0.028, -0.012); book.add(bar);
    // Shelf clutter: a phone directory.
    if (mood.density > 0.3) { const dir = s.box([0.24, 0.05, 0.3], [0.12, 0.105, 0.02], s.material('#e8c832')); dir.rotation.y = 0.1; s.box([0.22, 0.04, 0.29], [0.125, 0.105, 0.03], paper).rotation.y = 0.1; }

    // ---------- lamp, bolted down ----------
    const lx = -W / 2 + 0.17, lz = -D / 2 + 0.17;
    s.cylinder(0.085, 0.09, 0.015, [lx, H + 0.0075, lz], brass, 24);
    for (let i = 0; i < 4; i++) s.cylinder(0.008, 0.008, 0.008, [lx + Math.cos(i * 1.57 + 0.78) * 0.07, H + 0.018, lz + Math.sin(i * 1.57 + 0.78) * 0.07], dark, 6);
    const glaze = s.material(new THREE.Color().setHSL(mix(0.52, 0.07, mood.warmth), mix(0.25, 0.6, mood.cheer), 0.45), { roughness: 0.25 });
    s.lathe([[0.03, 0], [0.07, 0.03], [0.085, 0.1], [0.06, 0.2], [0.028, 0.26], [0.022, 0.3], [0, 0.3]], glaze, [lx, H + 0.015, lz]);
    s.cylinder(0.01, 0.01, 0.16, [lx, H + 0.39, lz], brass, 8);
    const lit = a.lampOn;
    const bulb = new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#ffd88a', emissiveIntensity: lit ? 2.2 : 0.05, roughness: 0.3 });
    s.ball([0.03, 0.04, 0.03], [lx, H + 0.44, lz], bulb, 12);
    const shadeY = H + 0.47;
    if (a.shade !== 'bare') {
      const cone = a.shade === 'cone';
      const rTop = cone ? 0.075 : 0.13, rBot = cone ? 0.2 : 0.155, sh = cone ? 0.2 : 0.22;
      const tex = (() => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 64;
        const g = c.getContext('2d')!;
        g.fillStyle = cone ? '#c9b086' : '#efe4c6'; g.fillRect(0, 0, 256, 64);
        if (cone) for (let i = 0; i < 900; i++) { g.fillStyle = random() > 0.5 ? 'rgba(90,60,20,0.2)' : 'rgba(255,240,200,0.2)'; g.fillRect(random() * 256, random() * 64, 3, 1); }
        else for (let i = 0; i < 64; i++) { g.fillStyle = i % 2 ? 'rgba(120,90,40,0.28)' : 'rgba(255,255,255,0.18)'; g.fillRect(i * 4, 0, 2, 64); }
        if (a.shade === 'crooked') { const r = g.createRadialGradient(140, 20, 2, 140, 20, 34); r.addColorStop(0, 'rgba(40,20,5,0.95)'); r.addColorStop(1, 'rgba(90,50,10,0)'); g.fillStyle = r; g.fillRect(100, 0, 90, 64); }
        g.fillStyle = '#6a5030'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 60, 256, 4);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
      })();
      const shadeMat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffcf80', emissiveIntensity: lit ? 0.85 : 0, roughness: 0.9, side: THREE.DoubleSide });
      const shade = s.mesh(new THREE.CylinderGeometry(rTop, rBot, sh, cone ? 28 : 48, 1, true), shadeMat, [lx, shadeY, lz]);
      if (!cone) { const pos = shade.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const ang = Math.atan2(pos.getZ(i), pos.getX(i)); const k = 1 + Math.cos(ang * 24) * 0.035; pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); } shade.geometry.computeVertexNormals(); }
      if (a.shade === 'crooked') { shade.rotation.z = 0.22 + random() * 0.12; shade.rotation.y = 0.8; shade.position.x += 0.02; }
    } else {
      s.ring(0.07, 0.004, [lx, H + 0.44, lz], brass).scale.y = 1.4;
    }
    s.tube([[lx, H + 0.03, lz - 0.08], [lx - 0.02, H + 0.01, -D / 2 - 0.01], [lx - 0.03, H - 0.3, -D / 2 - 0.02], [lx, 0.02, -D / 2 - 0.03]], 0.005, dark);

    // ---------- clock radio ----------
    const cx = 0.03, cz = -D / 2 + 0.1;
    const digits = { late: ' 307', checkout: '1100', blinking: '1200', alarm: ' 559', dead: '    ' }[a.clock];
    const face = document.createElement('canvas'); face.width = 256; face.height = 96;
    const fg = face.getContext('2d')!;
    fg.fillStyle = '#140606'; fg.fillRect(0, 0, 256, 96);
    const seg = (x: number, ch: string) => {
      const on = SEG[ch] ?? '';
      const w = 30, h = 30, t = 8, y = 14;
      const R: Record<string, [number, number, number, number]> = { a: [x + t, y, w, t], g: [x + t, y + h, w, t], d: [x + t, y + h * 2, w, t], f: [x, y + t / 2, t, h], b: [x + w + t, y + t / 2, t, h], e: [x, y + h + t / 2, t, h], c: [x + w + t, y + h + t / 2, t, h] };
      for (const k of 'abcdefg') { fg.fillStyle = on.includes(k) ? '#ff2a1a' : '#2a0c0a'; fg.fillRect(...R[k]); }
    };
    [...digits].forEach((ch, i) => seg(14 + i * 58 + (i > 1 ? 14 : 0), ch));
    if (a.clock !== 'dead') { fg.fillStyle = '#ff2a1a'; fg.fillRect(130, 30, 8, 8); fg.fillRect(130, 58, 8, 8); fg.beginPath(); fg.arc(246, 86, 4, 0, 7); fg.fill(); }
    const faceTex = new THREE.CanvasTexture(face); faceTex.colorSpace = THREE.SRGBColorSpace;
    const display = new THREE.MeshStandardMaterial({ map: faceTex, emissiveMap: faceTex, emissive: '#ffffff', emissiveIntensity: a.clock === 'dead' ? 0 : 1.6, roughness: 0.2 });
    const radio = new THREE.Group(); radio.position.set(cx, H, cz); radio.rotation.y = 0.1 + (random() - 0.5) * 0.2; radio.scale.setScalar(1.3); s.root.add(radio);
    const r = (m: THREE.Mesh) => { radio.add(m); return m; };
    r(s.box([0.26, 0.085, 0.13], [0, 0.0425, 0], s.material('#3b2a1e', { roughness: 0.45 })));
    r(s.box([0.26, 0.012, 0.132], [0, 0.085, 0], dark));
    r(s.mesh(new THREE.PlaneGeometry(0.15, 0.056), display, [-0.045, 0.045, 0.0655]));
    for (let i = 0; i < 6; i++) r(s.box([0.07, 0.004, 0.004], [0.085, 0.022 + i * 0.01, 0.066], dark));
    for (let i = 0; i < 4; i++) r(s.box([0.03, 0.008, 0.02], [-0.09 + i * 0.045, 0.094, 0.03], chrome));
    r(s.box([0.08, 0.012, 0.03], [0.07, 0.096, 0.03], s.material('#c8c4b8')));

    // ---------- telephone ----------
    const px = W / 2 - 0.15, pz = D / 2 - 0.13;
    const shell = s.material({ rotary: '#d8ccac', pushbutton: '#cfc5aa', red: '#c4261f' }[a.phone], { roughness: 0.35 });
    const phone = new THREE.Group(); phone.position.set(px, H, pz); phone.rotation.y = -0.25 + (random() - 0.5) * 0.3; s.root.add(phone);
    const p = (m: THREE.Mesh) => { phone.add(m); return m; };
    const bodyShape = new THREE.Shape(); bodyShape.moveTo(-0.1, 0); bodyShape.lineTo(0.1, 0); bodyShape.lineTo(0.1, 0.03); bodyShape.lineTo(-0.1, 0.085); bodyShape.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
    bodyGeo.rotateY(-Math.PI / 2); bodyGeo.translate(0.1, 0, 0);
    p(s.mesh(bodyGeo, shell));
    const slope = Math.atan2(0.055, 0.2);
    if (a.phone === 'rotary') {
      const dial = p(s.cylinder(0.062, 0.062, 0.012, [0, 0.062, 0.02], chrome, 28)); dial.rotation.x = -slope;
      const inner = p(s.cylinder(0.03, 0.03, 0.016, [0, 0.064, 0.02], paper, 20)); inner.rotation.x = -slope;
      for (let i = 0; i < 10; i++) { const ang = 0.6 + i * 0.5; const hole = p(s.cylinder(0.009, 0.009, 0.014, [Math.cos(ang) * 0.046, 0.064 - Math.sin(ang) * 0.046 * Math.sin(slope), 0.02 + Math.sin(ang) * 0.046], dark, 10)); hole.rotation.x = -slope; }
    } else {
      for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) { const k = p(s.box([0.026, 0.01, 0.022], [(col - 1) * 0.036, 0.071 - row * 0.0085, -0.02 + row * 0.032], a.phone === 'red' ? dark : paper)); k.rotation.x = slope; }
    }
    // Dialling card on the faceplate.
    const card = p(s.label('DIAL 0 DESK', 0.16, 0.035, [0, 0.036, 0.094], '#27372e', '#f1ecdc')); card.rotation.x = -Math.PI / 2 + slope; card.position.set(0, 0.035, 0.093);
    // Message light.
    const lampMat = new THREE.MeshStandardMaterial({ color: '#ff3020', emissive: '#ff3020', emissiveIntensity: a.phoneState === 'message' ? 2.5 : 0.05, roughness: 0.3 });
    p(s.ball([0.012, 0.008, 0.012], [0.075, 0.05, 0.07], lampMat, 10));
    // Cradle and handset.
    for (const x of [-1, 1]) p(s.box([0.03, 0.03, 0.05], [x * 0.07, 0.095, -0.075], shell));
    const handset = new THREE.Group();
    const hs = (m: THREE.Mesh) => { handset.add(m); return m; };
    const grip = hs(s.box([0.15, 0.028, 0.034], [0, 0.012, 0], shell)); void grip;
    for (const x of [-1, 1]) { hs(s.cylinder(0.032, 0.028, 0.04, [x * 0.09, 0, 0], shell, 16)); hs(s.cylinder(0.024, 0.024, 0.004, [x * 0.09, -0.021, 0], dark, 12)); }
    const coil = (from: THREE.Vector3, to: THREE.Vector3, sag: number, turns: number) => {
      const pts: [number, number, number][] = [];
      const n = turns * 8;
      const dir = to.clone().sub(from);
      const side = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
      for (let i = 0; i <= n; i++) {
        const t = i / n, ang = t * turns * Math.PI * 2;
        const c = from.clone().addScaledVector(dir, t);
        c.y -= Math.sin(t * Math.PI) * sag;
        c.addScaledVector(side, Math.cos(ang) * 0.012); c.y += Math.sin(ang) * 0.012;
        pts.push([c.x, c.y, c.z]);
      }
      return s.tube(pts, 0.0035, shell);
    };
    const world = (v: THREE.Vector3) => v.applyEuler(phone.rotation).add(phone.position);
    if (a.phoneState === 'off-hook') {
      handset.position.set(-W / 2 + 0.36, H + 0.036, D / 2 - 0.07);
      handset.rotation.set(Math.PI / 2 + 0.1, 0, 0.5 + random() * 0.6);
      s.root.add(handset);
      const over = new THREE.Vector3(px - 0.26, H - 0.2, D / 2 + 0.05);
      const end = handset.position.clone().add(new THREE.Vector3(-0.08, -0.01, 0.04));
      coil(world(new THREE.Vector3(-0.1, 0.02, 0.05)), over, 0.03, 9);
      coil(over, end, -0.12, 7);
    } else {
      handset.position.set(0, 0.128, -0.075);
      phone.add(handset);
      coil(world(new THREE.Vector3(-0.1, 0.02, 0.05)), world(new THREE.Vector3(-0.1, 0.11, -0.075)), -0.06, 8);
    }
    // Line cord.
    if (a.phoneState === 'unplugged') {
      const pts: [number, number, number][] = [];
      for (let i = 0; i < 14; i++) pts.push([px - 0.22 + Math.cos(i * 0.9) * (0.05 + i * 0.002), H + 0.006 + i * 0.0006, pz - 0.14 + Math.sin(i * 0.9) * (0.04 + i * 0.002)]);
      s.tube(pts, 0.004, paper);
      s.box([0.014, 0.01, 0.018], [pts[13][0], H + 0.012, pts[13][2]], s.material('#e8e4d4', { transparent: true, opacity: 0.9 }));
    } else s.tube([[px + 0.02, H + 0.02, pz - 0.11], [px + 0.06, H + 0.01, -D / 2 - 0.01], [px + 0.07, 0.3, -D / 2 - 0.03], [px + 0.02, 0.02, -D / 2 - 0.03]], 0.004, paper);

    // ---------- the telling item ----------
    const ix = -W / 2 + 0.2, iz = D / 2 - 0.1;
    const item = new THREE.Group(); item.position.set(ix, H, iz); item.rotation.y = (random() - 0.5) * 0.8; s.root.add(item);
    const it = (m: THREE.Mesh) => { item.add(m); return m; };
    if (a.item === 'matchbook') {
      it(s.box([0.05, 0.006, 0.045], [0, 0.003, 0], s.material(new THREE.Color().setHSL(random(), 0.7, 0.4))));
      const flap = it(s.box([0.05, 0.003, 0.04], [0, 0.02, -0.03], s.material('#f1ecdc'))); flap.rotation.x = -1.0;
      for (let i = 0; i < 6; i++) it(s.box([0.004, 0.004, 0.035], [-0.018 + i * 0.007, 0.008, 0], s.material(i % 2 ? '#c22a2a' : '#e8d8a8')));
      const burnt = it(s.box([0.003, 0.003, 0.04], [0.07, 0.002, 0.02], dark)); burnt.rotation.y = 0.9;
      it(s.lathe([[0, 0.003], [0.045, 0.003], [0.055, 0.02], [0.048, 0.02], [0.04, 0.008], [0, 0.008]], s.material('#9fb8b0', { roughness: 0.1, transparent: true, opacity: 0.8 }), [-0.02, 0, -0.1]));
    } else if (a.item === 'pills') {
      const amber = s.material('#d8801c', { roughness: 0.2, transparent: true, opacity: 0.85 });
      const bottle = it(s.cylinder(0.022, 0.022, 0.06, [0, 0.022, 0], amber, 14)); bottle.rotation.z = Math.PI / 2;
      const lbl = it(s.cylinder(0.0225, 0.0225, 0.035, [0, 0.022, 0], paper, 14)); lbl.rotation.z = Math.PI / 2;
      it(s.cylinder(0.024, 0.024, 0.014, [-0.09, 0.007, 0.03], paper, 14));
      const n = 3 + Math.round(mood.density * 9);
      const pts = []; for (let i = 0; i < n; i++) pts.push({ at: [0.04 + random() * 0.1, 0.004, (random() - 0.5) * 0.1] as const, size: 0.007 });
      it(s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material(mood.cheer > 0.5 ? '#f4f4f0' : '#6aa0d8'), pts)).scale.y = 0.6;
    } else if (a.item === 'ring') {
      const ring = it(s.ring(0.011, 0.0028, [0, 0.003, 0], s.material('#e8c040', { metalness: 0.95, roughness: 0.15 }))); ring.rotation.x = Math.PI / 2;
      // A pale circle where a glass stood, so the ring reads as alone.
      it(s.cylinder(0.06, 0.06, 0.0015, [0, 0.0008, 0], s.material('#f1ecdc', { roughness: 1 }), 20));
    } else if (a.item === 'notepad') {
      it(s.box([0.11, 0.012, 0.15], [0, 0.006, 0], paper));
      it(s.box([0.11, 0.014, 0.02], [0, 0.007, -0.065], s.material('#2f5a8a')));
      const num = it(s.label('555-0142', 0.1, 0.035, [0, 0.0125, 0.01], '#1c2a6b', '#f1ecdc')); num.rotation.x = -Math.PI / 2;
      const pen = it(s.cylinder(0.005, 0.005, 0.14, [0.09, 0.005, 0.02], s.material('#1c2a6b'), 8)); pen.rotation.set(Math.PI / 2, 0, 0.5);
    }
    if (mood.density > 0.6) {
      const glass = s.lathe([[0, 0], [0.03, 0], [0.035, 0.1], [0.032, 0.1], [0.028, 0.006], [0, 0.006]], s.material('#cfe0e4', { roughness: 0.05, transparent: true, opacity: 0.45 }), [-0.02, H, -0.02]); void glass;
      s.cylinder(0.027, 0.027, 0.04, [-0.02, H + 0.026, -0.02], s.material('#b8d4e0', { roughness: 0.05, transparent: true, opacity: 0.6 }), 14);
    }

    const blinkClock = a.clock === 'blinking', blinkMsg = a.phoneState === 'message';
    return s.finish({
      update: (_dt, time) => {
        if (blinkClock) display.emissiveIntensity = (time % 1) < 0.5 ? 1.6 : 0.08;
        if (blinkMsg) lampMat.emissiveIntensity = (time * (0.8 + mood.energy)) % 1 < 0.45 ? 2.5 : 0.1;
      },
    });
  },
});
