import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { grime, painted, scrawl, write } from './paint';

const W = 1.9, D = 0.9, LEG = 0.12, KNEE = 0.82, TOP = 1.5, LIP = 0.05;

export default defineThing({
  questions: {
    lettering: choice('How is the front lettered?', {
      frosty: 'Big blue ICE letters capped with snow and hung with painted icicles.',
      block: 'Plain bold block letters, ICE, nothing else.',
      penguin: 'A cheerful cartoon penguin beside the word ICE.',
      bear: 'A white polar bear on a deep blue panel.',
      retro: 'Red mid-century script: "Ice Cold" with a starburst.',
      stencil: 'Hand-stencilled ICE with a price sprayed underneath.',
    }),
    doors: choice('How do the doors stand?', {
      closed: 'Both shut tight.',
      ajar: 'One door ajar, cold fog spilling down the front.',
      open: 'One door flung wide, bags of cubes in plain view.',
      both: 'Both doors open, someone is loading or looting it.',
    }),
    fill: score('How full of bags is it?', ['Empty but for frost', 'A few bags in the bottom', 'Half full', 'Stacked to the doors']),
    leaning: choice('What leans against or sits beside it?', {
      nothing: 'Nothing.',
      firewood: 'Shrink-wrapped bundles of firewood stacked beside it.',
      propane: 'A white propane cylinder left beside it.',
      cooler: 'A forgotten red picnic cooler with its lid askew.',
      bait: 'A hand-painted LIVE BAIT board propped against the end.',
      rods: 'Two fishing rods and a tackle box, set down for a minute.',
    }),
    locked: noul('Is it padlocked for the night?'),
    body: choice('What is the cabinet finish?', {
      white: 'Glossy white enamel.',
      steel: 'Brushed stainless all over.',
      blue: 'Pale glacier blue.',
      red: 'Red ends with a white front, like a soda cooler.',
    }),
    price: choice('Is there a price or notice on it?', {
      none: 'No notice.',
      price: 'A printed price card: $2.99 a bag.',
      inside: 'A card that says PAY INSIDE FIRST.',
      deal: 'A starburst sticker: 2 FOR $5.',
      soldout: 'A handwritten note: NO ICE TIL FRIDAY.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const tint = { white: '#f1f0ea', steel: '#b9bfc0', blue: '#bfdcec', red: '#f1f0ea' }[a.body];
    const body = s.material(tint, { metalness: a.body === 'steel' ? 0.75 : 0.1, roughness: a.body === 'steel' ? 0.38 : 0.42 });
    const ends = a.body === 'red' ? s.material('#c9281f', { roughness: 0.45 }) : body;
    const steel = s.material('#c3c9cb', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#1c2023', { roughness: 0.8 });
    const inner = s.material('#dfe9ee', { roughness: 0.6, emissive: '#9fc6dc', emissiveIntensity: 0.25 });
    const night = Math.abs(mood.daylight - 0.5) * 2;

    // Shell built from slabs so an open door shows a real cavity.
    const profile = new THREE.Shape([
      new THREE.Vector2(-D / 2, LEG), new THREE.Vector2(D / 2, LEG), new THREE.Vector2(D / 2, KNEE),
      new THREE.Vector2(LIP, TOP), new THREE.Vector2(-D / 2, TOP),
    ]);
    for (const x of [-1, 1]) {
      const g = new THREE.ExtrudeGeometry(profile, { depth: 0.06, bevelEnabled: false });
      g.rotateY(-Math.PI / 2);
      s.mesh(g, ends, [x * (W / 2 - 0.03) + 0.03, 0, 0]);
    }
    s.box([W, 0.06, D], [0, LEG + 0.03, 0], body);
    s.box([W, TOP - LEG, 0.06], [0, (TOP + LEG) / 2, -D / 2 + 0.03], body);
    s.box([W, KNEE - LEG, 0.06], [0, (KNEE + LEG) / 2, D / 2 - 0.03], body);
    s.box([W, 0.06, D / 2 + LIP], [0, TOP - 0.03, (LIP - D / 2) / 2], body);
    // Liner.
    s.box([W - 0.14, 0.02, D - 0.14], [0, LEG + 0.07, 0], inner);
    s.box([W - 0.14, TOP - LEG - 0.1, 0.02], [0, (TOP + LEG) / 2, -D / 2 + 0.07], inner);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.07, LEG, 0.07], [x * (W / 2 - 0.08), LEG / 2, z * (D / 2 - 0.08)], dark);
    s.box([W + 0.02, 0.035, D + 0.02], [0, LEG + 0.02, 0], steel);

    // Compressor housing on the roof with louvres and a fan grille.
    s.box([0.72, 0.24, 0.42], [W / 2 - 0.42, TOP + 0.12, -0.2], s.material('#c9cdcb', { metalness: 0.4, roughness: 0.5 }));
    for (let i = 0; i < 7; i++) s.box([0.5, 0.012, 0.01], [W / 2 - 0.42, TOP + 0.04 + i * 0.027, 0.012], dark);
    const fan = new THREE.Group();
    for (let i = 0; i < 4; i++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.06), dark); blade.rotation.y = i * Math.PI / 2; blade.position.set(Math.cos(i * Math.PI / 2) * 0.1, 0, -Math.sin(i * Math.PI / 2) * 0.1); fan.add(blade); }
    fan.position.set(W / 2 - 0.42, TOP + 0.245, -0.2); s.root.add(fan);
    s.ring(0.14, 0.012, [W / 2 - 0.42, TOP + 0.245, -0.2], dark).rotation.x = Math.PI / 2;

    // Lettered front.
    const frontW = W - 0.08, frontH = KNEE - LEG - 0.08;
    const art = painted(frontW, frontH, (ctx, w, h) => {
      const blue = '#1f74c9', deep = '#0e3f86';
      const paper = a.lettering === 'bear' ? deep : a.lettering === 'retro' ? '#f6efd9' : a.body === 'blue' ? '#d6ebf5' : '#f6f6f1';
      ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
      const icicles = (colour: string, n: number, len: number) => {
        ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(0, 0);
        for (let i = 0; i < n; i++) { const x0 = (i / n) * w, x1 = ((i + 1) / n) * w, l = len * h * (0.35 + random() * 0.65); ctx.lineTo(x0, h * 0.03); ctx.lineTo((x0 + x1) / 2, l); }
        ctx.lineTo(w, h * 0.03); ctx.lineTo(w, 0); ctx.fill();
      };
      const snowcap = (cx: number, cy: number, tw: number) => {
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#a9d2ee'; ctx.lineWidth = h * 0.012;
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) ctx.ellipse(cx - tw / 2 + (tw * i) / 8, cy + Math.sin(i * 2.1) * h * 0.012, tw * 0.09, h * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 5; i++) { const x = cx - tw / 2 + tw * (0.1 + 0.2 * i); ctx.beginPath(); ctx.moveTo(x - tw * 0.03, cy + h * 0.03); ctx.lineTo(x, cy + h * (0.1 + random() * 0.12)); ctx.lineTo(x + tw * 0.03, cy + h * 0.03); ctx.fill(); }
      };
      if (a.lettering === 'frosty') {
        write(ctx, 'ICE', w / 2, h * 0.58, h * 0.7, '#2f8fe0', { outline: deep });
        const tw = h * 0.7 * 1.7;
        snowcap(w / 2, h * 0.3, tw);
        icicles('#bfe3f7', 26, 0.2);
      } else if (a.lettering === 'block') {
        write(ctx, 'ICE', w / 2, h * 0.54, h * 0.82, blue);
        ctx.fillStyle = blue; ctx.fillRect(w * 0.04, h * 0.06, w * 0.92, h * 0.04); ctx.fillRect(w * 0.04, h * 0.92, w * 0.92, h * 0.04);
      } else if (a.lettering === 'penguin') {
        write(ctx, 'ICE', w * 0.62, h * 0.55, h * 0.7, blue, { outline: '#ffffff' });
        const px = w * 0.2, py = h * 0.55, r = h * 0.3;
        ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.ellipse(px, py, r * 0.72, r * 1.25, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px - r * 0.8, py + r * 0.1, r * 0.16, r * 0.6, 0.5, 0, 7); ctx.ellipse(px + r * 0.85, py - r * 0.25, r * 0.16, r * 0.6, -1.0, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(px, py + r * 0.25, r * 0.48, r * 0.9, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(px - r * 0.22, py - r * 0.7, r * 0.17, 0, 7); ctx.arc(px + r * 0.22, py - r * 0.7, r * 0.17, 0, 7); ctx.fill();
        ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.arc(px - r * 0.2, py - r * 0.68, r * 0.07, 0, 7); ctx.arc(px + r * 0.24, py - r * 0.68, r * 0.07, 0, 7); ctx.fill();
        ctx.fillStyle = '#f39a1e'; ctx.beginPath(); ctx.moveTo(px - r * 0.18, py - r * 0.48); ctx.lineTo(px + r * 0.18, py - r * 0.48); ctx.lineTo(px, py - r * 0.22); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px - r * 0.32, py + r * 1.22, r * 0.3, r * 0.1, 0, 0, 7); ctx.ellipse(px + r * 0.32, py + r * 1.22, r * 0.3, r * 0.1, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#d9262b'; ctx.fillRect(px - r * 0.5, py - r * 0.36, r, r * 0.16); ctx.fillRect(px + r * 0.2, py - r * 0.3, r * 0.18, r * 0.6);
        icicles('#bfe3f7', 22, 0.14);
      } else if (a.lettering === 'bear') {
        write(ctx, 'ICE', w * 0.68, h * 0.55, h * 0.66, '#ffffff');
        const bx = w * 0.23, by = h * 0.62, r = h * 0.25;
        ctx.fillStyle = '#f7fbfd';
        ctx.beginPath(); ctx.ellipse(bx, by, r * 1.5, r * 0.85, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + r * 1.45, by - r * 0.55, r * 0.6, r * 0.5, -0.2, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + r * 2.0, by - r * 0.4, r * 0.3, r * 0.2, 0.1, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + r * 1.2, by - r * 1.0, r * 0.16, 0, 7); ctx.arc(bx + r * 1.65, by - r * 1.0, r * 0.14, 0, 7); ctx.fill();
        for (const dx of [-1.0, -0.45, 0.5, 1.05]) ctx.fillRect(bx + dx * r - r * 0.2, by + r * 0.3, r * 0.42, r * 0.95);
        ctx.fillStyle = '#10151c'; ctx.beginPath(); ctx.arc(bx + r * 2.25, by - r * 0.42, r * 0.08, 0, 7); ctx.arc(bx + r * 1.6, by - r * 0.62, r * 0.05, 0, 7); ctx.fill();
        ctx.fillStyle = '#cfe9f8'; ctx.fillRect(0, h * 0.92, w, h * 0.08);
        icicles('#e9f6fd', 24, 0.16);
      } else if (a.lettering === 'retro') {
        ctx.fillStyle = '#d2382b';
        ctx.beginPath(); for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2, r = i % 2 ? h * 0.3 : h * 0.44; ctx.lineTo(w * 0.83 + Math.cos(t) * r, h * 0.5 + Math.sin(t) * r); } ctx.fill();
        write(ctx, 'Ice Cold', w * 0.4, h * 0.5, h * 0.52, '#d2382b', { font: 'italic bold', max: w * 0.66 });
        write(ctx, 'ICE', w * 0.83, h * 0.5, h * 0.22, '#ffffff');
        ctx.strokeStyle = '#2a7fa8'; ctx.lineWidth = h * 0.03; ctx.beginPath(); ctx.moveTo(w * 0.06, h * 0.86); ctx.lineTo(w * 0.7, h * 0.86); ctx.stroke();
      } else {
        ctx.save(); ctx.globalAlpha = 0.86;
        write(ctx, 'I C E', w * 0.45, h * 0.44, h * 0.62, '#16407a', { font: 'bold', tilt: -0.02 });
        write(ctx, '$3 BAG', w * 0.72, h * 0.84, h * 0.2, '#b3261d', { tilt: 0.03 });
        ctx.restore();
        for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(22,64,122,${random() * 0.25})`; ctx.fillRect(w * (0.12 + random() * 0.7), h * (0.1 + random() * 0.7), 3, 3); }
      }
      ctx.fillStyle = `rgba(226,220,200,${wear * 0.4})`; ctx.fillRect(0, 0, w, h);
      grime(ctx, w, h, random, wear * 0.45);
    }, { px: 640, roughness: 0.5, glow: mix(0, 0.12, night) });
    art.position.set(0, (KNEE + LEG) / 2, D / 2 + 0.002); s.root.add(art);
    for (const x of [-1, 1]) {
      const side = painted(0.5, 0.36, (ctx, w, h) => { ctx.fillStyle = a.body === 'red' ? '#c9281f' : '#f6f6f1'; ctx.fillRect(0, 0, w, h); write(ctx, 'ICE', w / 2, h / 2, h * 0.8, a.body === 'red' ? '#ffffff' : '#1f74c9'); grime(ctx, w, h, random, wear * 0.6); }, { px: 192 });
      side.position.set(x * (W / 2 + 0.002), 0.75, -0.02); side.rotation.y = x * Math.PI / 2; s.root.add(side);
    }

    // Slanted door deck.
    const slantLen = Math.hypot(D / 2 - LIP, TOP - KNEE);
    const deck = new THREE.Group();
    deck.position.set(0, KNEE, D / 2);
    deck.rotation.x = -Math.atan2(D / 2 - LIP, TOP - KNEE);
    s.root.add(deck);
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D, at: [number, number, number]) => { mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    add(new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, 0.06), body), deck, [0, 0.03, -0.03]);
    add(new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, 0.06), body), deck, [0, slantLen - 0.03, -0.03]);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.06, slantLen, 0.06), body), deck, [0, slantLen / 2, -0.03]);
    const doorW = W / 2 - 0.06, doorH = slantLen - 0.08;
    const swing = { closed: [0, 0], ajar: [0, 0.5], open: [1.9, 0], both: [1.7, 1.95] }[a.doors].map((v) => v * (v ? mix(0.85, 1.1, random()) : 1));
    if (a.doors !== 'closed' && a.doors !== 'both' && random() < 0.5) swing.reverse();
    [-1, 1].forEach((side, index) => {
      const hinge = new THREE.Group();
      hinge.position.set(side * (W / 2 - 0.03), slantLen / 2, 0.005);
      hinge.rotation.y = side * swing[index];
      deck.add(hinge);
      add(new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.05), steel), hinge, [-side * doorW / 2, 0, 0.025]);
      add(new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.12, doorH - 0.12, 0.012), s.material('#d9dedf', { metalness: 0.7, roughness: 0.45 })), hinge, [-side * doorW / 2, 0, 0.055]);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, doorH * 0.5, 8), dark);
      add(grip, hinge, [-side * (doorW - 0.09), 0, 0.085]);
      for (const y of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.05), dark), hinge, [-side * (doorW - 0.09), y * doorH * 0.22, 0.065]);
      for (const y of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.03), dark), hinge, [0, y * doorH * 0.3, 0.02]);
    });
    // Hasp and padlock where the doors meet.
    add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.012), dark), deck, [0, 0.07, 0.062]);
    if (a.locked) {
      const shut = a.doors === 'closed';
      const lock = new THREE.Group();
      const brass = s.material('#c9a13a', { metalness: 0.8, roughness: 0.35 });
      const bodyLock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.03), brass); bodyLock.castShadow = true;
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 14, Math.PI), steel); shackle.position.y = 0.03;
      lock.add(bodyLock, shackle);
      lock.position.set(shut ? 0 : 0.06, shut ? 0.03 : 0.0, 0.085); lock.rotation.z = shut ? 0 : 0.6;
      deck.add(lock);
    }

    // Bags of cubes, one instanced mesh.
    const cavityW = W - 0.2, cavityD = D - 0.2;
    const layers = Math.round(mix(0, 5.4, a.fill));
    const bagGeometry = new THREE.SphereGeometry(1, 10, 7);
    const bags: { at: [number, number, number]; size: number; color: string }[] = [];
    const bagsMesh = new THREE.InstancedMesh(bagGeometry, s.material('#eef6fa', { roughness: 0.28, emissive: '#bfe1f2', emissiveIntensity: 0.35 }), Math.max(1, layers * 15 + 4));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let n = 0;
    for (let layer = 0; layer < layers; layer++) {
      const y = LEG + 0.16 + layer * 0.17;
      const depthHere = y > KNEE ? cavityD * mix(1, 0.5, (y - KNEE) / (TOP - KNEE)) : cavityD;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
        if (layer === layers - 1 && random() < 0.35) continue;
        const z = -cavityD / 2 + 0.13 + j * 0.26;
        if (z > -cavityD / 2 + depthHere - 0.08) continue;
        e.set((random() - 0.5) * 0.3, random() * 0.6 - 0.3, (random() - 0.5) * 0.3);
        m.compose(new THREE.Vector3(-cavityW / 2 + 0.17 + i * 0.34 + (random() - 0.5) * 0.05, y, z + (random() - 0.5) * 0.04), q.setFromEuler(e), new THREE.Vector3(0.18, 0.095, 0.135));
        bagsMesh.setMatrixAt(n, m);
        bagsMesh.setColorAt(n, new THREE.Color().setHSL(0.56, 0.5, 0.86 + random() * 0.1));
        n++;
      }
    }
    void bags;
    bagsMesh.count = n; bagsMesh.castShadow = true;
    if (n) { bagsMesh.instanceMatrix.needsUpdate = true; s.root.add(bagsMesh); } else bagGeometry.dispose();
    // Frost drifts when it is empty.
    if (layers === 0) for (let i = 0; i < 5; i++) s.ball([0.18 + random() * 0.2, 0.03, 0.12], [(random() - 0.5) * cavityW * 0.8, LEG + 0.1, (random() - 0.5) * cavityD * 0.6], inner, 10);

    // Cold fog out of an open door.
    const puffs: THREE.Mesh[] = [];
    if (a.doors !== 'closed') {
      const fog = new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: mix(0.1, 0.19, 1 - mood.warmth * 0.5), depthWrite: false, roughness: 1 });
      const openSides = [-1, 1].filter((_side, index) => swing[index] > 0);
      for (const side of openSides) for (let i = 0; i < 6; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), fog);
        puff.scale.set(0.22 + random() * 0.18, 0.12 + random() * 0.1, 0.18 + random() * 0.12);
        puff.position.set(side * (0.2 + random() * 0.55), mix(1.2, 0.4, i / 5), D / 2 - 0.1 + i * 0.09 + random() * 0.1);
        puff.userData.phase = random() * 6; puff.userData.x = puff.position.x; puff.userData.y = puff.position.y;
        s.root.add(puff); puffs.push(puff);
      }
    }

    // Price card or note.
    const cardAt: [number, number, number] = [-W / 2 + 0.35, 0.06 + slantLen * 0.5, 0.078];
    if (a.price !== 'none') {
      const hand = a.price === 'soldout';
      const card = painted(hand ? 0.34 : 0.26, hand ? 0.24 : 0.2, (ctx, w, h) => {
        if (hand) { ctx.fillStyle = '#f3efdf'; ctx.fillRect(0, 0, w, h); scrawl(ctx, ['NO ICE', 'TIL FRIDAY'], w, h, '#1d2a6b', random); return; }
        if (a.price === 'deal') { ctx.fillStyle = '#ffd92e'; ctx.fillRect(0, 0, w, h); write(ctx, '2 FOR', w / 2, h * 0.3, h * 0.3, '#c2201b'); write(ctx, '$5', w / 2, h * 0.68, h * 0.48, '#c2201b'); return; }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#1f74c9'; ctx.lineWidth = h * 0.08; ctx.strokeRect(0, 0, w, h);
        if (a.price === 'price') { write(ctx, '$2.99', w / 2, h * 0.42, h * 0.42, '#16181a', { max: w * 0.85 }); write(ctx, 'PER BAG', w / 2, h * 0.78, h * 0.16, '#1f74c9'); }
        else { write(ctx, 'PAY INSIDE', w / 2, h * 0.36, h * 0.24, '#c2201b', { max: w * 0.85 }); write(ctx, 'FIRST', w / 2, h * 0.7, h * 0.26, '#c2201b'); }
      }, { px: 256 });
      const closedSide = swing[0] > 0 && swing[1] === 0 ? 1 : -1;
      if (a.doors === 'both') { card.position.set(-W / 2 + 0.3, 0.55, D / 2 + 0.006); s.root.add(card); }
      else { card.position.set(cardAt[0] * -closedSide * -1, cardAt[1], cardAt[2]); card.position.x = closedSide * (W / 2 - 0.42); card.rotation.z = (random() - 0.5) * (hand ? 0.3 : 0.08); deck.add(card); }
    }

    // What leans against it.
    const bx = -W / 2 - 0.32;
    if (a.leaning === 'firewood') {
      const bark = s.material('#6d4a2f', { roughness: 0.95 }), cut = s.material('#d9b784', { roughness: 0.9 }), band = s.material('#f1ede2', { roughness: 0.4, transparent: true, opacity: 0.85 });
      const stack = 2 + Math.floor(random() * 3);
      for (let b = 0; b < stack; b++) {
        const cx = bx - (b > 1 ? 0.02 : 0) + (b % 2) * 0.03, cy = 0.15 + (b === 2 ? 0.27 : 0) + (b === 3 ? 0.27 : 0), cz = (b === 0 ? -0.18 : b === 1 ? 0.2 : b === 2 ? 0.0 : 0.02) + (b === 3 ? 0.3 : 0);
        const yaw = (random() - 0.5) * 0.3;
        const group = new THREE.Group(); group.position.set(cx, b === 3 ? 0.15 : cy, b === 3 ? 0.55 : cz); group.rotation.y = yaw; s.root.add(group);
        for (let i = 0; i < 6; i++) {
          const t = (i / 6) * Math.PI * 2, r = i === 0 ? 0 : 0.085;
          const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055 + random() * 0.012, 0.055, 0.42, 7), bark); log.rotation.x = Math.PI / 2; log.position.set(Math.cos(t) * r, Math.sin(t) * r, 0); log.castShadow = true; group.add(log);
          const end = new THREE.Mesh(new THREE.CircleGeometry(0.05, 7), cut); end.position.set(Math.cos(t) * r, Math.sin(t) * r, 0.212); group.add(end);
        }
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.2, 12), band); wrap.rotation.x = Math.PI / 2; group.add(wrap);
      }
    } else if (a.leaning === 'propane') {
      s.lathe([[0.1, 0], [0.105, 0.03], [0.1, 0.05], [0.155, 0.06], [0.155, 0.33], [0.13, 0.4], [0.07, 0.43], [0.11, 0.43], [0.11, 0.52], [0.1, 0.52]], s.material('#eeece4', { roughness: 0.45, side: THREE.DoubleSide }), [bx + 0.05, 0, 0.15]);
      s.cylinder(0.025, 0.025, 0.07, [bx + 0.05, 0.46, 0.15], s.material('#c9a13a', { metalness: 0.7 }), 8);
    } else if (a.leaning === 'cooler') {
      s.box([0.6, 0.34, 0.36], [bx - 0.05, 0.17, 0.25], s.material('#cf2f25', { roughness: 0.45 }));
      const lid = s.box([0.62, 0.07, 0.38], [bx - 0.02, 0.385, 0.22], s.material('#f3f1ea', { roughness: 0.45 })); lid.rotation.y = 0.2 + random() * 0.3; lid.rotation.z = 0.08;
      s.rod([bx - 0.36, 0.26, 0.25], [bx - 0.36, 0.12, 0.25], 0.012, s.material('#f3f1ea'));
    } else if (a.leaning === 'bait') {
      const board = painted(0.6, 0.8, (ctx, w, h) => {
        ctx.fillStyle = '#e9e2c6'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#7a5a36'; ctx.lineWidth = 2;
        for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, (h * i) / 5); ctx.lineTo(w, (h * i) / 5); ctx.stroke(); }
        write(ctx, 'LIVE', w / 2, h * 0.2, h * 0.2, '#b3261d'); write(ctx, 'BAIT', w / 2, h * 0.42, h * 0.2, '#b3261d');
        scrawl(ctx, ['WORMS', 'MINNOWS'], w, h * 0.5, '#1e3a2b', random); ctx.drawImage(ctx.canvas, 0, 0);
        ctx.clearRect(0, 0, 0, 0);
        grime(ctx, w, h, random, 0.2 + wear * 0.6);
      }, { px: 256 });
      const lean = new THREE.Group(); lean.position.set(bx + 0.15, 0, 0.1); lean.rotation.y = -Math.PI / 2 + 0.25; s.root.add(lean);
      board.position.set(0, 0.39, 0); board.rotation.x = -0.24; lean.add(board);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.02), s.material('#8a6a44')); back.position.set(0, 0.388, -0.012); back.rotation.x = -0.24; back.castShadow = true; lean.add(back);
    } else if (a.leaning === 'rods') {
      const rod = s.material('#2b3a33', { roughness: 0.5 }), cork = s.material('#b98c58');
      for (let i = 0; i < 2; i++) {
        const z = -0.1 + i * 0.22, tipY = 1.75 + i * 0.25;
        s.rod([bx + 0.02, 0.01, z + 0.12], [bx + 0.3, tipY, z], 0.012, rod, 0.003);
        s.rod([bx + 0.02, 0.01, z + 0.12], [bx + 0.06, 0.26, z + 0.1], 0.018, cork);
        s.cylinder(0.035, 0.035, 0.03, [bx + 0.05, 0.32, z + 0.13], steel, 10).rotation.x = Math.PI / 2;
      }
      s.box([0.36, 0.2, 0.2], [bx - 0.12, 0.1, 0.35], s.material('#3d6b4a', { roughness: 0.5 }));
      s.box([0.38, 0.03, 0.22], [bx - 0.12, 0.21, 0.35], s.material('#d9d2b8'));
      s.ring(0.05, 0.008, [bx - 0.12, 0.25, 0.35], dark, Math.PI);
    }

    const spin = mix(2, 14, mood.energy), drift = mix(0.2, 1, mood.energy);
    return s.finish({
      update: (dt, time) => {
        fan.rotation.y += dt * spin;
        for (const puff of puffs) {
          puff.position.x = puff.userData.x + Math.sin(time * 0.5 * drift + puff.userData.phase) * 0.06;
          puff.position.y = puff.userData.y + Math.sin(time * 0.8 * drift + puff.userData.phase * 2) * 0.03;
        }
      },
    });
  },
});
