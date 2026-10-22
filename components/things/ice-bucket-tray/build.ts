import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    bucket: choice('What is the ice bucket like?', {
      woodgrain: 'Wood-grain vinyl with gold bands, the classic motel bucket.',
      clear: 'Clear ribbed plastic, cheap and see-through.',
      chrome: 'A flared chrome bucket with a ball finial, a notch above the room rate.',
    }),
    contents: choice('What is in the bucket?', {
      ice: 'Heaped with fresh ice straight from the machine.',
      meltwater: 'Meltwater and a few last slivers, hours later.',
      bottle: 'A bottle chilling neck-up in the ice.',
      empty: 'Empty and dry, the lid still on, never touched.',
    }),
    glasses: choice('What about the two tumblers?', {
      capped: 'Both upside-down under pleated paper caps, sanitized.',
      'one-used': 'One uncapped and half full of water, its paper cap crumpled beside it.',
      lipstick: 'One with a lipstick print on the rim and a finger of something amber left.',
      both: 'Both used and standing close together.',
    }),
    card: choice('What does the folded tent card say?', {
      welcome: 'WELCOME',
      sanitized: 'SANITIZED',
      nosmoking: 'NO SMOKING',
      thankyou: 'THANK YOU',
      checkout: 'OUT BY 11',
    }),
    added: choice('What has the guest added to the tray?', {
      nothing: 'Nothing.',
      whiskey: 'A bottle of whiskey and its cap.',
      flowers: 'Roadside flowers standing in a tumbler.',
      change: 'A scatter of loose change and a car key.',
      cigarettes: 'A soft pack of cigarettes and a disposable lighter.',
    }),
    tray: choice('What is the tray like?', {
      brown: 'Brown pebbled plastic with a raised rim.',
      wicker: 'A shallow woven wicker tray.',
      steel: 'An oval stainless bar tray.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const TW = 0.46, TD = 0.32, y0 = 0.012;
    const chrome = s.material('#dadde0', { metalness: 0.92, roughness: 0.18 });
    const gold = s.material('#c9a24a', { metalness: 0.8, roughness: 0.3 });
    const paper = s.material('#f5f2e8', { roughness: 1 });
    const dark = s.material('#262422');
    const glass = new THREE.MeshStandardMaterial({ color: '#dcecef', transparent: true, opacity: 0.38, roughness: 0.05, side: THREE.DoubleSide });
    const iceMat = new THREE.MeshStandardMaterial({ color: '#eaf6fb', transparent: true, opacity: 0.86, roughness: 0.08, emissive: '#bfe0f0', emissiveIntensity: 0.15 });

    // ---------- tray ----------
    const trayShape = (w: number, d: number, r: number) => {
      const sh = new THREE.Shape();
      sh.moveTo(-w / 2 + r, -d / 2); sh.lineTo(w / 2 - r, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
      sh.lineTo(w / 2, d / 2 - r); sh.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); sh.lineTo(-w / 2 + r, d / 2);
      sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); sh.lineTo(-w / 2, -d / 2 + r); sh.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
      return sh;
    };
    const trayMat = a.tray === 'steel' ? chrome : a.tray === 'wicker'
      ? (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; g.fillStyle = '#b08a52'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = (x + y) % 2 ? '#8a6534' : '#c9a468'; g.fillRect(x * 8 + 1, y * 8 + 1, 6, 6); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); })()
      : s.material('#5b3a26', { roughness: 0.55 });
    const round = a.tray === 'steel' ? TD / 2 - 0.001 : 0.045;
    const base = new THREE.ExtrudeGeometry(trayShape(TW, TD, round), { depth: 0.008, bevelEnabled: false }); base.rotateX(-Math.PI / 2);
    s.mesh(base, trayMat, [0, 0.004, 0]);
    const rimShape = trayShape(TW, TD, round); rimShape.holes.push(trayShape(TW - 0.024, TD - 0.024, Math.max(round - 0.012, 0.01)));
    const rim = new THREE.ExtrudeGeometry(rimShape, { depth: 0.022, bevelEnabled: false }); rim.rotateX(-Math.PI / 2);
    s.mesh(rim, trayMat, [0, 0.004, 0]);
    if (mood.wear > 0.35) for (let i = 0; i < Math.round(mood.wear * 4); i++) s.ring(0.032, 0.0025, [(random() - 0.5) * 0.3, y0 + 0.001, (random() - 0.5) * 0.18], s.material('#c9c2ae', { roughness: 1 })).rotation.x = Math.PI / 2;

    // ---------- bucket ----------
    const bx = -0.115, bz = -0.035, R = 0.085, BH = 0.17;
    const bucket = new THREE.Group(); bucket.position.set(bx, y0, bz); s.root.add(bucket);
    const b = (m: THREE.Mesh) => { bucket.add(m); return m; };
    let lidMat: THREE.Material = dark;
    if (a.bucket === 'woodgrain') {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d')!;
      g.fillStyle = '#7a4a26'; g.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${random() > 0.5 ? '30,15,5' : '230,170,100'},${0.1 + random() * 0.2})`; g.lineWidth = 1 + random() * 2; const x = random() * 256; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + random() * 10 - 5, 40, x + random() * 10 - 5, 90, x, 128); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      b(s.mesh(new THREE.CylinderGeometry(R, R * 0.9, BH, 32, 1, true), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, side: THREE.DoubleSide }), [0, BH / 2, 0]));
      for (const y of [0.012, BH - 0.012]) b(s.cylinder(R * (y < 0.1 ? 0.91 : 1) + 0.003, R * (y < 0.1 ? 0.905 : 1) + 0.003, 0.016, [0, y, 0], gold, 32));
      b(s.cylinder(R * 0.9, R * 0.9, 0.006, [0, 0.003, 0], dark, 24));
      lidMat = s.material('#3b2416', { roughness: 0.4 });
    } else if (a.bucket === 'clear') {
      b(s.mesh(new THREE.CylinderGeometry(R, R * 0.86, BH, 32, 1, true), glass, [0, BH / 2, 0]));
      for (let i = 0; i < 16; i++) { const ang = i / 16 * Math.PI * 2; b(s.rod([Math.cos(ang) * R * 0.865, 0.004, Math.sin(ang) * R * 0.865], [Math.cos(ang) * R * 1.003, BH, Math.sin(ang) * R * 1.003], 0.002, s.material('#f2f8fa', { transparent: true, opacity: 0.7 }))); }
      b(s.cylinder(R * 0.86, R * 0.86, 0.005, [0, 0.003, 0], s.material('#cfe0e4', { transparent: true, opacity: 0.6 }), 24));
      b(s.ring(R, 0.004, [0, BH, 0], paper)).rotation.x = Math.PI / 2;
      lidMat = s.material('#e9eef0', { transparent: true, opacity: 0.75, roughness: 0.1 });
    } else {
      b(s.lathe([[0.058, 0], [0.06, 0.01], [0.066, 0.06], [0.08, 0.14], [0.092, BH], [0.088, BH], [0.076, 0.14], [0.06, 0.012], [0, 0.012]], chrome));
      for (const side of [-1, 1]) b(s.ring(0.018, 0.004, [side * 0.094, BH - 0.035, 0], chrome)).rotation.y = Math.PI / 2;
      lidMat = chrome;
    }
    const lid = new THREE.Group();
    const lidDisc = s.lathe([[0, 0.022], [0.03, 0.02], [R * 0.98, 0.006], [R + 0.004, 0], [R + 0.004, -0.006], [0, -0.006]], lidMat);
    const knob = a.bucket === 'chrome' ? s.ball([0.016, 0.016, 0.016], [0, 0.04, 0], chrome, 14) : s.cylinder(0.014, 0.018, 0.022, [0, 0.032, 0], gold, 14);
    lid.add(lidDisc, knob);
    if (a.contents === 'empty') { lid.position.set(bx, y0 + BH + 0.006, bz); s.root.add(lid); }
    else { lid.position.set(bx - 0.03, y0 + R * 0.7, bz - R - 0.045); lid.rotation.x = 1.15; lid.rotation.z = 0.2; s.root.add(lid); }

    const cubes = (count: number, place: (i: number) => [number, number, number], size = 0.022) => {
      const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), iceMat, count);
      const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < count; i++) { e.set(random() * 3, random() * 3, random() * 3); q.setFromEuler(e); const k = size * (0.75 + random() * 0.5); mat.compose(new THREE.Vector3(...place(i)), q, new THREE.Vector3(k, k * 0.8, k)); m.setMatrixAt(i, mat); }
      m.castShadow = true; return m;
    };
    const inR = () => { const r = Math.sqrt(random()) * R * 0.78, ang = random() * 6.3; return [Math.cos(ang) * r, Math.sin(ang) * r] as const; };
    if (a.contents === 'ice' || a.contents === 'bottle') {
      const n = 60 + Math.round(mood.density * 50);
      bucket.add(cubes(n, () => { const [x, z] = inR(); const dome = 1 - (x * x + z * z) / (R * R); return [x, BH - 0.02 + dome * 0.035 * random() + random() * 0.012, z]; }));
      if (a.bucket === 'clear') bucket.add(cubes(90, (i) => { const ang = i * 0.7; return [Math.cos(ang) * R * 0.76, 0.02 + (i / 90) * (BH - 0.05), Math.sin(ang) * R * 0.76]; }));
      // A few escaped cubes melting on the tray.
      const loose = Math.round(1 + mood.energy * 4);
      s.root.add(cubes(loose, () => [bx + (random() - 0.3) * 0.2, y0 + 0.009, bz + R + 0.03 + random() * 0.05]));
    } else if (a.contents === 'meltwater') {
      b(s.cylinder(R * 0.93, R * 0.9, 0.004, [0, BH * 0.45, 0], s.material('#9fc4d4', { roughness: 0.03, metalness: 0.2 }), 28));
      bucket.add(cubes(5, () => { const [x, z] = inR(); return [x, BH * 0.45 + 0.004, z]; }, 0.014));
      if (a.bucket === 'clear') b(s.cylinder(R * 0.92, R * 0.87, BH * 0.44, [0, BH * 0.225, 0], s.material('#a9cddc', { transparent: true, opacity: 0.55, roughness: 0.05 }), 28));
      s.cylinder(0.05, 0.05, 0.002, [bx + 0.07, y0 + 0.001, bz + R + 0.02], s.material('#8fb4c4', { roughness: 0.03, metalness: 0.2 }), 18).scale.z = 0.6;
    }
    if (a.contents === 'bottle') {
      const green = s.material('#1f4a2c', { roughness: 0.12 });
      const bt = b(s.lathe([[0, 0], [0.036, 0], [0.038, 0.16], [0.03, 0.2], [0.014, 0.25], [0.014, 0.31], [0, 0.31]], green, [0.015, 0.02, 0.0]));
      bt.rotation.z = -0.22; bt.rotation.x = 0.1;
      const foil = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.07, 14), gold); foil.position.y = 0.285; bt.add(foil);
      const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0385, 0.0385, 0.06, 20, 1, true), paper); lab.position.y = 0.19; bt.add(lab);
    }

    // Tongs.
    const tg = new THREE.Group(); tg.position.set(bx + 0.04, y0 + 0.008, bz + R + 0.07); tg.rotation.y = 0.2 + (random() - 0.5) * 0.5; s.root.add(tg);
    for (const side of [-1, 1]) { const arm = s.box([0.15, 0.003, 0.012], [0, 0.006 * (side + 1), side * 0.012], chrome); arm.rotation.y = side * 0.13; tg.add(arm); const claw = s.box([0.02, 0.01, 0.018], [0.075, 0.006 * (side + 1), side * 0.022], chrome); tg.add(claw); }
    tg.add(s.cylinder(0.008, 0.008, 0.016, [-0.075, 0.006, 0], chrome, 10));

    // ---------- tumblers ----------
    const tumbler: [number, number][] = [[0.08, 0.04], [0.02, 0.085]];
    const used = [a.glasses === 'one-used' || a.glasses === 'lipstick' || a.glasses === 'both', a.glasses === 'both'];
    const flowersIn = a.added === 'flowers';
    const GH = 0.095, GR = 0.034;
    const profile: [number, number][] = [[0, 0], [GR * 0.86, 0], [GR, GH], [GR - 0.003, GH], [GR * 0.82, 0.008], [0, 0.008]];
    tumbler.forEach(([x, z], i) => {
      const upright = used[i] || (flowersIn && i === 1);
      const gm = s.lathe(profile, glass, [x, y0, z]);
      if (!upright) {
        gm.rotation.x = Math.PI; gm.position.y = y0 + GH;
        // Pleated paper cap.
        const cap = s.mesh(new THREE.CylinderGeometry(GR + 0.004, GR + 0.009, 0.03, 20, 1, false), paper, [x, y0 + GH - 0.012, z]);
        const pos = cap.geometry.attributes.position;
        for (let k = 0; k < pos.count; k++) if (pos.getY(k) < 0) { const ang = Math.atan2(pos.getZ(k), pos.getX(k)); const f = 1 + Math.cos(ang * 10) * 0.08; pos.setX(k, pos.getX(k) * f); pos.setZ(k, pos.getZ(k) * f); }
        cap.geometry.computeVertexNormals();
      } else if (flowersIn && i === 1) {
        s.cylinder(GR * 0.82, GR * 0.76, GH * 0.5, [x, y0 + 0.008 + GH * 0.25, z], s.material('#b9d6dc', { transparent: true, opacity: 0.6, roughness: 0.05 }), 14);
        const n = 4 + Math.round(mood.density * 5);
        for (let k = 0; k < n; k++) {
          const lean = [(random() - 0.5) * 0.09, 0.15 + random() * 0.08, (random() - 0.5) * 0.09] as const;
          s.rod([x, y0 + 0.02, z], [x + lean[0], y0 + lean[1], z + lean[2]], 0.002, s.material('#4d7a3a'));
          const bloom = new THREE.Color().setHSL(mood.cheer > 0.5 ? 0.12 + random() * 0.05 : 0.72 + random() * 0.1, 0.8, mix(0.45, 0.62, mood.cheer));
          const droop = mood.wear > 0.6 ? 0.03 : 0;
          s.ball([0.016, 0.008, 0.016], [x + lean[0], y0 + lean[1] - droop, z + lean[2]], s.material(bloom, { roughness: 0.8 }), 8);
          s.ball([0.006, 0.006, 0.006], [x + lean[0], y0 + lean[1] + 0.004 - droop, z + lean[2]], s.material('#5a3a12'), 6);
        }
      } else {
        const amber = a.glasses === 'lipstick' || a.added === 'whiskey';
        const level = amber ? 0.022 : 0.045 + random() * 0.02;
        s.cylinder(GR * 0.84, GR * 0.78, level, [x, y0 + 0.008 + level / 2, z], s.material(amber ? '#b8651c' : '#b9d6dc', { transparent: true, opacity: amber ? 0.9 : 0.6, roughness: 0.05 }), 14);
        if (a.glasses === 'lipstick' && i === 0) { const kiss = s.ring(GR, 0.004, [x, y0 + GH - 0.002, z], s.material('#c2183a', { roughness: 0.4 }), 1.1); kiss.rotation.x = Math.PI / 2; kiss.rotation.z = 0.4; }
        // The discarded paper cap, crumpled.
        const crumple = s.mesh(new THREE.IcosahedronGeometry(0.022, 0), s.material('#f5f2e8', { roughness: 1, flatShading: true }), [x + 0.07 + random() * 0.03, y0 + 0.016, z + 0.03 - i * 0.07]);
        crumple.scale.y = 0.6; crumple.rotation.set(random() * 3, random() * 3, 0);
      }
    });

    // ---------- soap, packets, tent card ----------
    const soap = s.box([0.055, 0.016, 0.035], [0.17, y0 + 0.008, 0.09], paper); soap.rotation.y = 0.3;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.0165, 0.0355), s.material(mood.cheer > 0.5 ? '#3fa79a' : '#8a6a3a')); soap.add(band);
    const packets = 3 + Math.round(mood.density * 5);
    const tints = ['#f5f2e8', '#f2a7b8', '#f5f2e8', '#9fc0e8', '#f2e08a', '#8a5a3a'];
    for (let i = 0; i < packets; i++) { const pk = s.box([0.032, 0.004, 0.05], [0.15 + (i % 4) * 0.012, y0 + 0.003 + i * 0.0035, -0.01 + Math.floor(i / 4) * 0.045 + (random() - 0.5) * 0.01], s.material(tints[i % tints.length], { roughness: 0.9 })); pk.rotation.y = -0.5 + i * 0.16 + (random() - 0.5) * 0.2; }
    const text = { welcome: 'WELCOME', sanitized: 'SANITIZED', nosmoking: 'NO SMOKING', thankyou: 'THANK YOU', checkout: 'OUT BY 11' }[a.card];
    const tent = new THREE.Group(); tent.position.set(0.13, y0, -0.105); tent.rotation.y = -0.25 + (random() - 0.5) * 0.2; s.root.add(tent);
    const ink = a.card === 'nosmoking' ? '#b8201c' : a.card === 'sanitized' ? '#1c5a8a' : '#3a2a16';
    for (const side of [-1, 1]) { const face = s.label(text, 0.13, 0.07, [0, 0.033, side * 0.016], ink, '#f4efdc'); face.rotation.x = -side * 0.42; if (side < 0) face.rotation.y = Math.PI, face.rotation.x = -0.42; tent.add(face); }
    if (mood.wear > 0.7) { tent.rotation.z = Math.PI / 2 - 0.42; tent.position.y = y0 + 0.02; }

    // ---------- what the guest added ----------
    if (a.added === 'whiskey') {
      const wx = TW / 2 + 0.07, wz = -0.03;
      const amber = s.material('#8a4a12', { roughness: 0.1, transparent: true, opacity: 0.92 });
      const full = mix(0.85, 0.2, mood.wear);
      s.lathe([[0, 0], [0.04, 0], [0.04, 0.17], [0.014, 0.215], [0.014, 0.26], [0, 0.26]], s.material('#d9c9a8', { transparent: true, opacity: 0.35, roughness: 0.05 }), [wx, 0, wz]);
      s.cylinder(0.037, 0.037, 0.165 * full, [wx, 0.004 + 0.165 * full / 2, wz], amber, 16);
      s.label('RYE', 0.06, 0.05, [wx, 0.09, wz + 0.0405], '#1c1410', '#e8dcb8');
      s.cylinder(0.016, 0.016, 0.014, [0.03, y0 + 0.007, -0.02], dark, 12);
    } else if (a.added === 'change') {
      for (let i = 0; i < 6 + Math.round(mood.density * 8); i++) s.cylinder(0.009 + (i % 3) * 0.002, 0.009 + (i % 3) * 0.002, 0.0018, [-0.02 + random() * 0.14, y0 + 0.001 + i * 0.0004, -0.11 + random() * 0.06], i % 3 ? chrome : s.material('#b87333', { metalness: 0.8, roughness: 0.35 }), 12);
      const key = s.box([0.012, 0.003, 0.055], [0.0, y0 + 0.003, -0.07], chrome); key.rotation.y = 0.9;
      const head = s.cylinder(0.014, 0.014, 0.004, [-0.024, y0 + 0.003, -0.088], dark, 12); void head;
    } else if (a.added === 'cigarettes') {
      const pack = s.box([0.055, 0.022, 0.085], [0.02, y0 + 0.011, -0.08], s.material('#f5f2e8')); pack.rotation.y = 0.4;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.0225, 0.03), s.material('#c4261f')); stripe.position.z = 0.02; pack.add(stripe);
      for (let i = 0; i < 2; i++) { const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 8), paper); cig.rotation.x = Math.PI / 2; cig.position.set(-0.012 + i * 0.012, 0.004, -0.05); pack.add(cig); }
      const lighter = s.box([0.024, 0.012, 0.075], [-0.04, y0 + 0.006, -0.1], s.material(new THREE.Color().setHSL(random(), 0.8, 0.5), { roughness: 0.3 })); lighter.rotation.y = -0.6;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.014), chrome); top.position.z = -0.044; lighter.add(top);
    }

    return s.finish();
  },
});
