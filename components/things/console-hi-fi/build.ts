import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    lid: choice('Is the lid open or shut?', {
      shut: 'Shut flat, a sideboard that happens to contain a stereo.',
      slid: 'The left half slid aside over the right, the turntable well showing.',
      lifted: 'The lid lifted on its stay, propped open for a long evening.',
    }),
    platter: choice('If the lid is open, what is on the turntable?', {
      empty: 'A bare rubber mat, nothing playing.',
      album: 'One LP turning, the arm down in the groove.',
      stack: 'A stack of singles on the changer spindle, waiting to drop one by one.',
    }),
    style: choice('What style is the cabinet?', {
      danish: 'Clean walnut on splayed tapered legs, Scandinavian and modern.',
      mediterranean: 'Heavy dark oak on a plinth, with arched grille frames and spindles like a Spanish confessional.',
      colonial: 'Honey maple with turned legs and a scalloped apron, pretending to be an antique.',
    }),
    grille: choice('What is the speaker cloth like?', {
      gold: 'Oatmeal tweed shot through with gold thread.',
      burlap: 'Coarse brown burlap.',
      avocado: 'Olive-green basket weave.',
      rust: 'Burnt-orange slub weave.',
    }),
    records: choice('What records are beside it?', {
      none: 'None in sight.',
      leaning: 'A handful of LPs leaning against the end of the cabinet.',
      crate: 'A full crate of albums parked beside it.',
      strewn: 'Sleeves strewn across the floor in front, one disc out of its jacket.',
    }),
    on: noul('Is it switched on, with the tuner dial glowing?'),
    top: choice('What has ended up on top of it?', {
      bare: 'Nothing, polished and clear.',
      lamp: 'A lace doily and a ceramic table lamp.',
      photos: 'A row of framed family photographs.',
      party: 'Party leftovers: tumblers, a bottle and a full ashtray.',
      storage: 'A cardboard box and a pile of magazines, the stereo demoted to a shelf.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = { danish: '#6e4426', mediterranean: '#3d2617', colonial: '#a8682f' }[a.style];
    const grain = (base: string) => paint(256, 128, (ctx, w, h) => {
      const c = new THREE.Color(base).lerp(new THREE.Color('#8f8a80'), mood.wear * 0.14);
      ctx.fillStyle = `#${c.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        ctx.strokeStyle = random() < 0.6 ? 'rgba(30,14,4,0.13)' : 'rgba(255,214,160,0.07)';
        ctx.lineWidth = 0.6 + random() * 1.6;
        const y = random() * h, bend = (random() - 0.5) * 10;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + bend, w * 0.7, y - bend, w, y + bend * 0.4); ctx.stroke();
      }
    });
    const wood = new THREE.MeshStandardMaterial({ map: grain(tone), roughness: mix(0.35, 0.8, mood.wear) });
    const trim = s.material(new THREE.Color(tone).multiplyScalar(0.6), { roughness: 0.5 });
    const dark = s.material('#1a1816', { roughness: 0.7 });
    const brass = s.material('#b8923f', { metalness: 0.8, roughness: 0.3 });
    const chrome = s.material('#d6d9da', { metalness: 0.9, roughness: 0.2 });
    const clothTone = { gold: '#b9a37a', burlap: '#7a5a3a', avocado: '#6f7438', rust: '#b0582c' }[a.grille];
    const weave = paint(128, 128, (ctx, w, h) => {
      ctx.fillStyle = clothTone;
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
        ctx.fillStyle = (x + y) % 8 === 0 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 2, 2);
        if (a.grille === 'gold' && random() < 0.07) { ctx.fillStyle = '#f1cf6a'; ctx.fillRect(x, y, 3, 1); }
      }
    });
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    weave.repeat.set(3, 2);
    const cloth = new THREE.MeshStandardMaterial({ map: weave, roughness: 1 });

    const W = 1.72, D = 0.46, legs = a.style === 'mediterranean' ? 0.09 : 0.2, H = 0.5, top = legs + H, well = 0.1;
    // Carcass: a solid lower body with a rim around two wells under the lid.
    s.box([W, H - well, D], [0, legs + (H - well) / 2, 0], wood);
    s.box([W, well, 0.025], [0, top - well / 2, D / 2 - 0.0125], wood);
    s.box([W, well, 0.025], [0, top - well / 2, -D / 2 + 0.0125], wood);
    for (const x of [-W / 2 + 0.0125, 0, W / 2 - 0.0125]) s.box([0.025, well, D], [x, top - well / 2, 0], wood);
    s.box([W - 0.04, 0.004, D - 0.04], [0, top - well + 0.002, 0], dark);

    // Front: a speaker each side, tuner and record cupboard in the middle.
    const grilleW = 0.52, grilleH = H - 0.1, front = D / 2;
    for (const side of [-1, 1]) {
      const x = side * (W / 2 - grilleW / 2 - 0.05);
      s.box([grilleW, grilleH, 0.012], [x, legs + H / 2 - 0.01, front + 0.004], cloth);
      for (const edge of [-1, 1]) {
        s.box([0.028, grilleH + 0.03, 0.03], [x + edge * grilleW / 2, legs + H / 2 - 0.01, front + 0.01], trim);
        s.box([grilleW + 0.03, 0.028, 0.03], [x, legs + H / 2 - 0.01 + edge * grilleH / 2, front + 0.01], trim);
      }
      if (a.style === 'mediterranean') {
        const arch = s.ring(grilleW / 2 - 0.03, 0.016, [x, legs + H / 2 + 0.02, front + 0.02], trim, Math.PI);
        arch.scale.y = 0.55;
        for (let i = 0; i < 6; i++) s.cylinder(0.011, 0.011, grilleH * 0.62, [x - grilleW / 2 + 0.07 + i * (grilleW - 0.14) / 5, legs + H / 2 - 0.09, front + 0.02], trim, 8);
      } else if (a.style === 'colonial') {
        for (let i = 1; i < 3; i++) s.box([0.014, grilleH, 0.02], [x - grilleW / 2 + i * grilleW / 3, legs + H / 2 - 0.01, front + 0.014], trim);
        s.box([grilleW, 0.014, 0.02], [x, legs + H / 2 - 0.01, front + 0.014], trim);
      }
    }
    const glow = a.on ? mix(0.9, 1.8, mood.cheer) : 0;
    const amber = new THREE.Color().setHSL(mix(0.14, 0.07, mood.warmth), 0.95, 0.6);
    const scale = paint(512, 96, (ctx, w, h) => {
      ctx.fillStyle = a.on ? '#ffd58a' : '#6b5a3c';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2a1a08';
      for (let i = 0; i <= 40; i++) ctx.fillRect(20 + i * 11.8, i % 5 === 0 ? 14 : 26, 2, i % 5 === 0 ? 30 : 14);
      ctx.font = 'bold 24px monospace';
      ['88', '92', '96', '100', '104', '108'].forEach((mark, i) => ctx.fillText(mark, 22 + i * 86, 80));
    });
    const dial = new THREE.MeshStandardMaterial({ map: scale, emissiveMap: scale, emissive: amber, emissiveIntensity: glow, roughness: 0.4 });
    const dialY = top - 0.2;
    s.box([0.46, 0.09, 0.012], [0, dialY, front + 0.006], dial);
    s.box([0.5, 0.125, 0.008], [0, dialY, front + 0.001], chrome);
    s.box([0.006, 0.085, 0.004], [mix(-0.2, 0.2, random()), dialY, front + 0.014], s.material('#c8261c', { emissive: '#c8261c', emissiveIntensity: glow * 0.5 }));
    for (let i = 0; i < 5; i++) {
      const knob = s.cylinder(0.02, 0.023, 0.03, [-0.2 + i * 0.1, dialY - 0.1, front + 0.015], i === 0 || i === 4 ? chrome : dark, 16);
      knob.rotation.x = Math.PI / 2;
    }
    for (const side of [-1, 1]) {
      s.box([0.235, 0.15, 0.014], [side * 0.122, legs + 0.115, front + 0.005], wood);
      s.ball([0.012, 0.012, 0.012], [side * 0.03, legs + 0.115, front + 0.02], brass, 10);
    }
    s.box([W + 0.02, 0.03, D + 0.02], [0, legs + 0.015, 0], trim);

    // Legs or plinth.
    if (a.style === 'danish') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * (W / 2 - 0.12), legs, z * (D / 2 - 0.07)], [x * (W / 2 - 0.05), 0, z * (D / 2 - 0.03)], 0.014, trim, 0.026);
      for (const z of [-1, 1]) s.box([W - 0.3, 0.03, 0.02], [0, legs - 0.02, z * (D / 2 - 0.07)], trim);
    } else if (a.style === 'colonial') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.lathe([[0, 0], [0.018, 0], [0.03, 0.04], [0.018, 0.08], [0.034, 0.13], [0.022, 0.17], [0.032, legs], [0, legs]], trim, [x * (W / 2 - 0.07), 0, z * (D / 2 - 0.06)]);
      for (let i = 0; i < 9; i++) s.cylinder(0.085, 0.085, 0.016, [-W / 2 + 0.16 + i * (W - 0.32) / 8, legs + 0.01, front - 0.008], wood, 16).rotation.x = Math.PI / 2;
    } else {
      s.box([W - 0.08, legs, D - 0.06], [0, legs / 2, 0], trim);
      for (const x of [-1, 1]) s.box([0.09, legs + 0.02, D + 0.03], [x * (W / 2 - 0.02), legs / 2 + 0.01, 0], trim);
    }

    // The works in the wells.
    const deckY = top - well + 0.004, tx = -W / 4 - 0.02;
    s.box([0.4, 0.02, 0.34], [tx, deckY + 0.01, 0], s.material('#4b4741', { metalness: 0.4, roughness: 0.5 }));
    const spinner = new THREE.Group();
    spinner.position.set(tx - 0.03, deckY + 0.02, 0);
    s.root.add(spinner);
    const hold = (mesh: THREE.Mesh) => { spinner.add(mesh); return mesh; };
    hold(s.cylinder(0.15, 0.15, 0.016, [0, 0.008, 0], chrome, 40));
    hold(s.cylinder(0.143, 0.143, 0.004, [0, 0.018, 0], dark, 40));
    hold(s.cylinder(0.004, 0.004, a.platter === 'stack' ? 0.09 : 0.03, [0, 0.03, 0], chrome, 8));
    const labelTone = ['#d2452c', '#e3b23c', '#2f6f8f', '#7a3f8f', '#3c8f5a'];
    const disc = (y: number, radius: number) => {
      const vinyl = hold(s.cylinder(radius, radius, 0.003, [0, y, 0], s.material('#0d0d0f', { roughness: 0.25 }), 40));
      hold(s.cylinder(radius * 0.34, radius * 0.34, 0.0036, [0, y, 0], s.material(labelTone[Math.floor(random() * labelTone.length)], { roughness: 0.7 }), 24));
      hold(s.box([radius * 0.4, 0.0038, 0.008], [radius * 0.12, y, 0], s.material('#f1ead6')));
      return vinyl;
    };
    if (a.platter === 'album') disc(0.022, 0.148);
    if (a.platter === 'stack') { disc(0.022, 0.088); for (let i = 0; i < 4; i++) disc(0.075 + i * 0.006, 0.088); }
    const armAngle = a.platter === 'album' ? 0.42 : 0.02;
    const arm = new THREE.Group();
    arm.position.set(tx + 0.16, deckY + 0.02, -0.12);
    arm.rotation.y = -armAngle;
    s.root.add(arm);
    arm.add(s.cylinder(0.02, 0.024, 0.04, [0, 0.02, 0], chrome, 16));
    arm.add(s.rod([0, 0.045, -0.04], [0, 0.04, 0.22], 0.005, chrome));
    arm.add(s.box([0.022, 0.012, 0.04], [0, 0.036, 0.23], dark));
    arm.add(s.cylinder(0.014, 0.014, 0.03, [0, 0.045, -0.05], dark, 10));
    // Radio chassis in the right well.
    s.box([0.62, 0.03, 0.3], [W / 4, deckY + 0.015, 0], s.material('#3a3632', { metalness: 0.3 }));
    for (let i = 0; i < 4; i++) s.cylinder(0.022, 0.022, 0.03, [W / 4 - 0.21 + i * 0.14, deckY + 0.045, 0.06], chrome, 16);
    s.box([0.5, 0.004, 0.07], [W / 4, deckY + 0.032, -0.07], dial);

    // Lid: two halves, the left one moves.
    const lidT = 0.024, half = W / 2;
    s.box([half + 0.01, lidT, D + 0.02], [half / 2, top + lidT / 2, 0], wood);
    const lid = new THREE.Group();
    s.root.add(lid);
    const leaf = s.box([half + 0.01, lidT, D + 0.02], [0, 0, 0], wood);
    lid.add(leaf);
    if (a.lid === 'shut') lid.position.set(-half / 2, top + lidT / 2, 0);
    else if (a.lid === 'slid') lid.position.set(-half / 2 + half * mix(0.72, 0.9, random()), top + lidT * 1.5 + 0.002, 0);
    else {
      leaf.position.set(0, 0, D / 2 + 0.01);
      lid.position.set(-half / 2, top + lidT / 2, -D / 2 - 0.01);
      lid.rotation.x = -mix(1.0, 1.3, random());
      const tip = new THREE.Vector3(-half / 2 - half / 2 + 0.03, 0, D * 0.6).applyEuler(new THREE.Euler(lid.rotation.x, 0, 0)).add(lid.position);
      s.rod([-W / 2 + 0.03, top - 0.02, -D / 2 + 0.06], [-W / 2 + 0.03, tip.y, tip.z], 0.005, brass);
    }

    // Things on top always sit on the fixed right half.
    const topY = top + lidT, rx = (f: number) => mix(0.12, W / 2 - 0.12, f);
    if (a.top === 'lamp') {
      s.cylinder(0.17, 0.17, 0.004, [rx(0.5), topY + 0.002, 0], s.material('#efe8d6'), 14);
      s.lathe([[0, 0], [0.07, 0], [0.075, 0.02], [0.04, 0.06], [0.085, 0.16], [0.07, 0.25], [0.025, 0.3], [0.02, 0.36], [0, 0.36]], s.material(mood.cheer > 0.5 ? '#c96a2c' : '#5d6b4a', { roughness: 0.3 }), [rx(0.5), topY, 0]);
      s.mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#ead9b4', emissive: '#ffcf87', emissiveIntensity: a.on ? 0.7 : 0.05, side: THREE.DoubleSide, roughness: 0.9 }), [rx(0.5), topY + 0.45, 0]);
    } else if (a.top === 'photos') {
      const count = 3 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const w = 0.09 + random() * 0.06, h = w * (random() < 0.5 ? 1.3 : 0.78), x = rx((i + 0.5) / count), z = -0.06 + random() * 0.1;
        const frame = s.box([w + 0.025, h + 0.025, 0.012], [x, topY + h / 2 + 0.012, z], i % 2 ? brass : trim);
        const face = s.box([w, h, 0.004], [x, topY + h / 2 + 0.012, z + 0.006], s.material(['#c9b79a', '#9db0b8', '#d8c3a0', '#b59a86'][i % 4]));
        const sitter = s.ball([w * 0.2, h * 0.22, 0.003], [x, topY + h * 0.55 + 0.012, z + 0.009], s.material('#5a4636'));
        for (const part of [frame, face, sitter]) { part.rotation.x = -0.2; part.rotation.y = (i - count / 2) * 0.12; }
      }
    } else if (a.top === 'party') {
      const glass = new THREE.MeshStandardMaterial({ color: '#d9e6e8', transparent: true, opacity: 0.45, roughness: 0.1 });
      const count = 3 + Math.floor(mood.density * 4);
      for (let i = 0; i < count; i++) {
        const x = rx(random()), z = (random() - 0.5) * 0.3;
        s.cylinder(0.034, 0.028, 0.085, [x, topY + 0.0425, z], glass, 14);
        s.cylinder(0.03, 0.026, 0.02 + random() * 0.03, [x, topY + 0.022, z], s.material('#b8742a', { roughness: 0.2 }), 14);
      }
      s.lathe([[0, 0], [0.04, 0], [0.04, 0.17], [0.014, 0.23], [0.014, 0.29], [0, 0.29]], s.material('#3f5a2c', { roughness: 0.2 }), [rx(0.85), topY, -0.12]);
      s.cylinder(0.06, 0.05, 0.022, [rx(0.3), topY + 0.011, 0.12], s.material('#a8611f', { roughness: 0.2 }), 18);
      for (let i = 0; i < 5; i++) s.rod([rx(0.3) - 0.03 + random() * 0.06, topY + 0.026, 0.1 + random() * 0.04], [rx(0.3) - 0.03 + random() * 0.06, topY + 0.03, 0.1 + random() * 0.04], 0.005, s.material('#e8e2d2'));
    } else if (a.top === 'storage') {
      const card = s.box([0.36, 0.22, 0.3], [rx(0.35), topY + 0.11, -0.02], s.material('#b08b5a'));
      card.rotation.y = (random() - 0.5) * 0.4;
      s.box([0.37, 0.006, 0.07], [rx(0.35), topY + 0.223, -0.02], s.material('#c9b58a')).rotation.y = card.rotation.y;
      const pile = 5 + Math.floor(random() * 6);
      for (let i = 0; i < pile; i++) s.box([0.21, 0.008, 0.28], [rx(0.85) + (random() - 0.5) * 0.02, topY + 0.004 + i * 0.008, 0.02 + (random() - 0.5) * 0.03], s.material(['#d8d2c2', '#b33a2a', '#d6a93a', '#4a6a7a'][i % 4])).rotation.y = (random() - 0.5) * 0.2;
    }

    // Record sleeves.
    const sleeves = Array.from({ length: 5 }, (_unused, index) => new THREE.MeshStandardMaterial({
      roughness: 0.7,
      map: paint(128, 128, (ctx, w, h) => {
        const inks = ['#d9772b', '#f0e3c0', '#3d2a4c', '#2f6f6a', '#c23b2a', '#e2b23a', '#1d1d22', '#7fa3b5'];
        const pick = () => inks[Math.floor(random() * inks.length)];
        ctx.fillStyle = pick();
        ctx.fillRect(0, 0, w, h);
        if (index % 3 === 0) for (let r = 54; r > 6; r -= 12) { ctx.fillStyle = pick(); ctx.beginPath(); ctx.arc(w / 2, h * 0.56, r, 0, 7); ctx.fill(); }
        else if (index % 3 === 1) for (let i = 0; i < 6; i++) { ctx.fillStyle = pick(); ctx.fillRect(0, 34 + i * 14, w, 9); }
        else { ctx.fillStyle = pick(); ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w * 0.5, 30); ctx.lineTo(w, h); ctx.fill(); ctx.fillStyle = pick(); ctx.beginPath(); ctx.arc(w * 0.72, 44, 18, 0, 7); ctx.fill(); }
        ctx.fillStyle = pick();
        ctx.fillRect(10, 10, 60 + random() * 40, 9);
      }),
    }));
    const sleeve = (index: number) => new THREE.Mesh(new THREE.BoxGeometry(0.315, 0.315, 0.006), sleeves[index % sleeves.length]);
    const put = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; s.root.add(mesh); return mesh; };
    if (a.records === 'leaning') {
      const count = 3 + Math.floor(random() * 5);
      for (let i = 0; i < count; i++) {
        const lp = put(sleeve(i));
        lp.rotation.order = 'YXZ';
        lp.rotation.y = Math.PI / 2;
        lp.rotation.x = -0.2 - i * 0.012;
        lp.position.set(W / 2 + 0.045 + i * 0.012, 0.155, 0.02 + (random() - 0.5) * 0.04);
      }
    } else if (a.records === 'crate') {
      const cx = W / 2 + 0.24, crate = s.material(['#c4452c', '#3e6ea8', '#d0a23a'][Math.floor(random() * 3)], { roughness: 0.6 });
      for (const z of [-1, 1]) for (const y of [0.04, 0.14, 0.24]) s.box([0.36, 0.045, 0.012], [cx, y, z * 0.17], crate);
      for (const x of [-1, 1]) for (const y of [0.04, 0.14, 0.24]) s.box([0.012, 0.045, 0.35], [cx + x * 0.18, y, 0], crate);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.022, 0.27, 0.022], [cx + x * 0.175, 0.135, z * 0.165], crate);
      s.box([0.36, 0.01, 0.34], [cx, 0.01, 0], crate);
      const count = 9 + Math.floor(mood.density * 8);
      for (let i = 0; i < count; i++) {
        const lp = put(sleeve(i));
        lp.position.set(cx + (random() - 0.5) * 0.02, 0.175 + random() * 0.012, -0.14 + i * 0.28 / count);
        lp.rotation.x = (random() - 0.5) * 0.16;
      }
    } else if (a.records === 'strewn') {
      const count = 4 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const lp = put(sleeve(i));
        lp.rotation.order = 'YXZ';
        lp.rotation.x = -Math.PI / 2;
        lp.rotation.y = random() * 3;
        lp.position.set(-0.7 + random() * 1.4, 0.004 + i * 0.007, D / 2 + 0.2 + random() * 0.2);
      }
      const loose = s.cylinder(0.15, 0.15, 0.003, [0.3 - random() * 0.9, 0.06, D / 2 + 0.3], s.material('#0d0d0f', { roughness: 0.25 }), 36);
      s.cylinder(0.05, 0.05, 0.0034, loose.position.toArray() as [number, number, number], s.material(labelTone[Math.floor(random() * 5)]), 20);
    }

    // Dust sheet of neglect on the fixed half when it has been left alone.
    if (mood.wear > 0.6) s.box([half - 0.04, 0.002, D - 0.04], [half / 2, topY + 0.001, 0], new THREE.MeshStandardMaterial({ color: '#b9b3a6', transparent: true, opacity: (mood.wear - 0.6) * 1.2, roughness: 1, depthWrite: false }));

    const turning = a.on && a.platter !== 'empty' && a.lid !== 'shut';
    const speed = mix(2.2, 4.6, mood.energy);
    return s.finish({ update: (dt, time) => { if (turning) spinner.rotation.y -= dt * speed; dial.emissiveIntensity = glow * (1 + Math.sin(time * 9) * 0.03); } });
  },
});
