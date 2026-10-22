import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    model: choice('What model of arm is it?', {
      chrome: 'Mirror chrome, an expensive showpiece.',
      military: 'Olive-drab military surplus with angular armour plates and stencilled numbers.',
      painted: 'Lacquered and hand-painted with flowers and gold lines, loved by its owner.',
      child: 'Child-sized, in bright toy-coloured plastic with star stickers.',
      skeletal: 'A bare budget frame: struts and pistons with no shell at all.',
      ceramic: 'Smooth white medical ceramic with thin glowing seams.',
    }),
    story: choice('What is its story right now?', {
      'mid-repair': 'Mid-repair: panel open, tendons pulled out, a hot soldering iron and a diagnostic box wired in.',
      pawned: 'Pawned: a paper ticket tied to the wrist and a price card propped beside it.',
      abandoned: 'Abandoned and stripped for parts: fingers missing, cables cut, tools gone.',
      ready: 'Finished and waiting for collection: panel shut, polished, a claim tag and a steady green light.',
    }),
    pose: choice('How is it held?', {
      cradled: 'Lying palm-up across two padded yokes.',
      upright: 'Clamped upright in a bench stand, hand raised.',
    }),
    hand: choice('What is the hand doing?', {
      open: 'Relaxed and half open, fingers gently curled.',
      fist: 'Closed in a tight fist.',
      pointing: 'Index finger extended, the rest curled.',
      splayed: 'Fingers spread stiff and wide, as if reaching.',
    }),
    bench: choice('What is it resting on?', {
      steel: 'A stainless surgical tray.',
      wood: 'A scarred wooden board with burn marks.',
      mat: 'A green cutting mat printed with a grid.',
      cloth: 'A stained towel folded square.',
    }),
    tools: noul('Is a roll of tools laid out beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const on = <T extends THREE.Object3D>(group: THREE.Object3D, mesh: T) => { group.add(mesh); return mesh; };
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const abandoned = a.story === 'abandoned';
    const open = a.story === 'mid-repair' || abandoned;

    // --- Materials ------------------------------------------------------------------------
    const paintLacquer = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const c = canvas.getContext('2d')!;
      c.fillStyle = pick(['#7a1420', '#14323a', '#1c1a24', '#3a1c4a']); c.fillRect(0, 0, 256, 128);
      c.strokeStyle = '#d9b44a'; c.lineWidth = 3;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 20 + i * 30 + random() * 10); c.bezierCurveTo(80, random() * 128, 170, random() * 128, 256, 20 + i * 30); c.stroke(); }
      for (let i = 0; i < 9; i++) {
        const x = random() * 256, y = random() * 128, r = 8 + random() * 9;
        c.fillStyle = pick(['#f4a6c0', '#ffffff', '#ffd23a', '#ff6a4c', '#8fd6e8']);
        for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.257) * r, y + Math.sin(p * 1.257) * r, r * 0.62, 0, 6.28); c.fill(); }
        c.fillStyle = '#d9b44a'; c.beginPath(); c.arc(x, y, r * 0.4, 0, 6.28); c.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };
    const dull = abandoned ? 0.25 : 0;
    const shellLook = {
      chrome: { color: '#d3d9de', metalness: 0.8, roughness: 0.18 + dull },
      military: { color: '#5c6641', metalness: 0.1, roughness: 0.8 },
      painted: { color: '#ffffff', metalness: 0.1, roughness: 0.28 + dull },
      child: { color: mood.warmth > 0.5 ? '#ffb52e' : '#3fb6e8', metalness: 0, roughness: 0.4 + dull },
      skeletal: { color: '#8f969b', metalness: 0.6, roughness: 0.45 },
      ceramic: { color: '#eeeeea', metalness: 0, roughness: 0.25 + dull },
    }[a.model];
    const shell = s.material(shellLook.color, { metalness: shellLook.metalness, roughness: shellLook.roughness, side: THREE.DoubleSide, map: a.model === 'painted' ? paintLacquer() : null });
    const joint = s.material(a.model === 'child' ? '#e8423f' : '#2a2c31', { roughness: 0.5, metalness: 0.4 });
    const steel = s.material('#aab0b5', { metalness: 0.7, roughness: 0.3 });
    const dark = s.material('#1b1c20', { roughness: 0.7 });
    const brass = s.material('#c79a3a', { metalness: 0.7, roughness: 0.3 });
    const seamColour = a.story === 'ready' ? '#3dff7a' : a.story === 'mid-repair' ? '#ffb020' : a.story === 'pawned' ? '#39b8ff' : '#551a1a';
    const seam = new THREE.MeshStandardMaterial({ color: seamColour, emissive: seamColour, emissiveIntensity: abandoned ? 0.1 : 1.5 });

    // --- The arm, built along +x from the elbow -------------------------------------------
    const arm = new THREE.Group();
    const size = (a.model === 'child' ? 0.7 : 1) * 1.22;
    const L = 0.27, r0 = a.model === 'military' ? 0.056 : 0.05, r1 = 0.034;
    const sides = a.model === 'military' ? 6 : 24;
    const gap = Math.PI * 0.62;
    const alongX = (mesh: THREE.Mesh) => { mesh.rotation.z = -Math.PI / 2; return mesh; };
    // Elbow socket.
    on(arm, s.ball([0.04, 0.04, 0.04], [-0.01, 0, 0], joint, 16));
    on(arm, alongX(s.cylinder(0.046, 0.04, 0.03, [0.015, 0, 0], steel, 20)));
    for (let i = 0; i < 6; i++) on(arm, s.rod([-0.045, Math.cos(i * 1.047) * 0.018, Math.sin(i * 1.047) * 0.018], [-0.062 - random() * 0.01, Math.cos(i * 1.047) * 0.018, Math.sin(i * 1.047) * 0.018], 0.004, brass));
    // Skeleton and internals.
    for (const z of [-0.014, 0.014]) on(arm, s.rod([0.02, -0.012, z], [L, -0.008, z * 0.8], 0.007, steel));
    on(arm, alongX(s.cylinder(0.013, 0.013, 0.1, [0.09, 0.006, -0.012], brass, 12)));
    on(arm, alongX(s.cylinder(0.006, 0.006, 0.09, [0.18, 0.006, -0.012], steel, 8)));
    on(arm, s.box([0.085, 0.004, 0.03], [0.15, 0.0, 0.016], s.material('#1f6b45', { roughness: 0.5 })));
    for (let i = 0; i < 4; i++) on(arm, s.box([0.008, 0.006, 0.008], [0.12 + i * 0.02, 0.004, 0.016], i === 1 ? seam : dark));
    const tendonColours = ['#d8352c', '#f0c22a', '#2f7fd0', '#e9e9e4', '#2aa860'];
    const cutEnds: number[] = [];
    tendonColours.forEach((colour, index) => {
      const material = s.material(colour, { roughness: 0.6 });
      const z = (index - 2) * 0.008, loose = open && (index === 1 || index === 3 || (abandoned && index === 0));
      if (loose) {
        // Pulled out through the open panel and left trailing.
        const reach = 0.06 + random() * 0.08;
        on(arm, s.tube([[0.04, 0.018, z], [0.08, 0.05, z + 0.03], [0.13 + random() * 0.04, 0.075, 0.06], [0.12 + reach, 0.03, 0.09 + random() * 0.03]], 0.0035, material));
        on(arm, s.tube([[L - 0.01, 0.014, z], [L - 0.05, 0.03, z + 0.01]], 0.0035, material));
        cutEnds.push(index);
      } else on(arm, s.tube([[0.03, 0.016, z], [0.1, 0.022 + random() * 0.006, z * 1.5], [0.2, 0.018, z * 1.2], [L, 0.012, z]], 0.0035, material));
    });
    // Shell: open along the top unless it is the bare-frame model.
    if (a.model !== 'skeletal') {
      const start = Math.PI * 1.4 + gap; // gap faces up and a little towards the viewer
      const body = on(arm, alongX(s.mesh(new THREE.CylinderGeometry(r1, r0, L - 0.03, sides, 1, true, start, Math.PI * 2 - gap), shell, [L / 2 + 0.015, 0, 0])));
      body.castShadow = true;
      const lid = new THREE.Group();
      lid.add(alongX(s.mesh(new THREE.CylinderGeometry(r1 + 0.001, r0 + 0.001, L - 0.06, sides, 1, true, Math.PI * 1.4 + 0.03, gap - 0.06), shell, [L / 2 + 0.015, 0, 0])));
      arm.add(lid);
      if (open) {
        if (abandoned && random() < 0.6) { lid.position.set(0.05, -0.105, 0.19); lid.rotation.set(2.4, 0.3, 0); } // lying loose on the tray
        else { lid.position.set(0, 0.012, -0.03); lid.rotation.x = -1.25; }
      } else if (a.story === 'pawned') { lid.rotation.x = -0.22; lid.position.y = 0.006; }
      for (const x of [0.035, L - 0.005]) on(arm, alongX(s.cylinder((x < 0.1 ? r0 : r1) + 0.004, (x < 0.1 ? r0 : r1) + 0.004, 0.014, [x, 0, 0], a.model === 'ceramic' ? seam : joint, sides)));
      if (a.model === 'military') {
        on(arm, s.box([0.13, 0.012, 0.06], [0.13, -0.052, 0], shell));
        const stencil = on(arm, s.label('M7-' + Math.floor(100 + random() * 899), 0.09, 0.028, [0.14, -0.02, 0.0505], '#d9d6c0', '#5c6641'));
        stencil.rotation.x = -0.12;
      }
      if (a.model === 'child') for (let i = 0; i < 3; i++) on(arm, s.ball([0.012, 0.004, 0.012], [0.08 + i * 0.06, -0.01, 0.046 - i * 0.004], s.material(pick(['#ffffff', '#ff5fa2', '#ffe14a'])), 5)).rotation.x = Math.PI / 2;
    } else {
      for (const x of [0.04, 0.12, 0.2, L - 0.01]) on(arm, alongX(s.mesh(new THREE.TorusGeometry(mix(r0, r1, x / L), 0.005, 6, 24), shell, [x, 0, 0]))).rotation.set(0, Math.PI / 2, 0);
      for (let i = 0; i < 3; i++) on(arm, s.rod([0.04, Math.cos(i * 2.1 + 2) * r0, Math.sin(i * 2.1 + 2) * r0], [L - 0.01, Math.cos(i * 2.1 + 2) * r1, Math.sin(i * 2.1 + 2) * r1], 0.004, shell));
    }
    // Wrist and hand, palm up.
    on(arm, s.ball([0.028, 0.028, 0.03], [L + 0.018, 0, 0], joint, 14));
    const hand = new THREE.Group();
    hand.position.set(L + 0.035, 0, 0);
    arm.add(hand);
    on(hand, s.box([0.08, 0.026, 0.082], [0.045, 0, 0], shell));
    on(hand, s.box([0.06, 0.004, 0.06], [0.045, 0.015, 0], dark));
    const curls = { open: [0.35, 0.45, 0.5, 0.6], fist: [1.45, 1.5, 1.5, 1.5], pointing: [0.05, 1.45, 1.5, 1.5], splayed: [-0.08, -0.05, -0.05, -0.1] }[a.hand];
    const lengths = [[0.04, 0.026, 0.02], [0.044, 0.03, 0.022], [0.041, 0.028, 0.021], [0.032, 0.022, 0.018]];
    const twitchers: { group: THREE.Group; rest: number }[] = [];
    const lost = abandoned ? [1 + Math.floor(random() * 2), random() < 0.5 ? 3 : 0] : [];
    for (let f = 0; f < 4; f++) {
      const z = (1.5 - f) * 0.021, spread = (a.hand === 'splayed' ? 0.22 : 0.05) * (1.5 - f);
      let parent: THREE.Object3D = hand;
      let at = new THREE.Vector3(0.087, 0, z);
      for (let k = 0; k < 3; k++) {
        const knuckle = new THREE.Group();
        knuckle.position.copy(at);
        knuckle.rotation.z = curls[f] * (k === 0 ? 0.8 : 1) + (random() - 0.5) * 0.08;
        if (k === 0) knuckle.rotation.y = spread;
        parent.add(knuckle);
        on(knuckle, s.ball([0.0105, 0.0105, 0.0105], [0, 0, 0], joint, 10));
        if (lost.includes(f) && k === 0) { on(knuckle, s.rod([0, 0, 0], [0.012, 0.004, 0], 0.003, s.material('#d8352c'))); break; }
        const length = lengths[f][k];
        on(knuckle, alongX(s.cylinder(0.0075 - k * 0.0008, 0.009 - k * 0.0008, length - 0.006, [length / 2, 0, 0], shell, 10)));
        if (k === 2) on(knuckle, s.ball([0.0075, 0.0068, 0.0075], [length - 0.002, 0, 0], a.model === 'ceramic' ? seam : joint, 8));
        if (k === 0 && f === 0) twitchers.push({ group: knuckle, rest: knuckle.rotation.z });
        parent = knuckle; at = new THREE.Vector3(length, 0, 0);
      }
    }
    // Thumb.
    const thumb = new THREE.Group();
    thumb.position.set(0.025, 0.002, 0.043); thumb.rotation.set(0.5, -0.75, a.hand === 'fist' ? 0.9 : 0.3);
    hand.add(thumb);
    on(thumb, s.ball([0.012, 0.012, 0.012], [0, 0, 0], joint, 10));
    on(thumb, alongX(s.cylinder(0.009, 0.0105, 0.036, [0.02, 0, 0], shell, 10)));
    const tip = new THREE.Group(); tip.position.set(0.04, 0, 0); tip.rotation.z = a.hand === 'fist' ? 1.0 : 0.3; thumb.add(tip);
    on(tip, s.ball([0.0105, 0.0105, 0.0105], [0, 0, 0], joint, 10));
    on(tip, alongX(s.cylinder(0.0075, 0.009, 0.026, [0.015, 0, 0], shell, 10)));
    hand.rotation.z = a.hand === 'fist' ? 0.25 : 0.08;
    hand.scale.setScalar(1.25);
    arm.scale.setScalar(size);
    s.root.add(arm);

    // --- Bench and cradle -------------------------------------------------------------------
    const benchW = 0.66, benchD = 0.3;
    if (a.bench === 'steel') {
      s.box([benchW, 0.012, benchD], [0, 0.006, 0], steel);
      for (const z of [-1, 1]) s.box([benchW, 0.022, 0.01], [0, 0.017, z * benchD / 2], steel);
      for (const x of [-1, 1]) s.box([0.01, 0.022, benchD], [x * benchW / 2, 0.017, 0], steel);
    } else if (a.bench === 'wood') {
      s.box([benchW, 0.024, benchD], [0, 0.012, 0], s.material('#8a5d38', { roughness: 0.85 }));
      for (let i = 0; i < 5; i++) s.cylinder(0.012 + random() * 0.014, 0.012, 0.002, [(random() - 0.5) * 0.5, 0.0245, (random() - 0.5) * 0.22], s.material('#2a1a10', { roughness: 1 }), 10);
    } else if (a.bench === 'mat') {
      s.box([benchW, 0.006, benchD], [0, 0.003, 0], s.material('#2f7a5a', { roughness: 0.8 }));
      const grid = s.material('#bfe3cf');
      for (let i = 1; i < 12; i++) s.box([0.002, 0.001, benchD - 0.02], [-benchW / 2 + i * benchW / 12, 0.0066, 0], grid);
      for (let i = 1; i < 6; i++) s.box([benchW - 0.02, 0.001, 0.002], [0, 0.0066, -benchD / 2 + i * benchD / 6], grid);
    } else {
      const towel = s.material('#cfc8b8', { roughness: 1 });
      s.box([benchW, 0.014, benchD], [0, 0.007, 0], towel);
      s.box([benchW * 0.98, 0.012, benchD * 0.96], [0.006, 0.02, 0.004], towel).rotation.y = 0.03;
      for (let i = 0; i < 4; i++) s.cylinder(0.02 + random() * 0.03, 0.02, 0.002, [(random() - 0.5) * 0.5, 0.027, (random() - 0.5) * 0.2], s.material(pick(['#7a4a2a', '#5a2a2a', '#3a3a3a']), { roughness: 1 }), 12);
    }
    const deck = { steel: 0.012, wood: 0.024, mat: 0.006, cloth: 0.026 }[a.bench];
    const pad = s.material('#30343a', { roughness: 0.9 });
    const armLength = (L + 0.2) * size;
    let ticketAnchor: [number, number, number];
    if (a.pose === 'cradled') {
      const h = deck + 0.15;
      arm.position.set(-armLength / 2 + 0.05, h, -0.02);
      arm.rotation.x = -0.25;
      for (const x of [0.06, 0.22]) {
        const px = arm.position.x + x * size;
        s.cylinder(0.008, 0.01, h - 0.06 * size, [px, deck + (h - 0.06 * size) / 2 - deck / 2, -0.02], steel, 10);
        s.box([0.05, 0.008, 0.07], [px, deck + 0.004, -0.02], steel);
        const yoke = s.ring(0.058 * size, 0.008, [px, h, -0.02], pad, Math.PI);
        yoke.rotation.set(0, Math.PI / 2, 0); yoke.rotation.z = Math.PI;
      }
      ticketAnchor = [arm.position.x + (L + 0.02) * size, h - 0.03, 0.01];
    } else {
      arm.rotation.z = Math.PI / 2; arm.rotation.y = -0.5;
      arm.position.set(-0.08, deck + 0.11, -0.04);
      s.box([0.16, 0.02, 0.14], [-0.08, deck + 0.01, -0.06], dark);
      s.cylinder(0.011, 0.011, 0.3, [-0.08, deck + 0.15, -0.13], steel, 10);
      const clampY = arm.position.y + 0.1 * size;
      s.rod([-0.08, clampY, -0.13], [-0.08, clampY, -0.04 - 0.05 * size], 0.008, steel);
      s.ring(0.052 * size, 0.009, [-0.08, clampY, -0.04], pad).rotation.x = Math.PI / 2;
      s.cylinder(0.014, 0.014, 0.03, [-0.08, clampY, -0.145], brass, 8).rotation.x = Math.PI / 2;
      s.cylinder(0.03, 0.035, 0.035, [-0.08, deck + 0.04, -0.04], pad, 14);
      ticketAnchor = [-0.08, arm.position.y + (L + 0.02) * size, -0.04];
    }

    // --- Story dressing ---------------------------------------------------------------------
    let smoke: THREE.Mesh[] = [];
    if (a.story === 'mid-repair') {
      // Soldering iron on a coil stand, tip glowing.
      const ix = 0.2, iz = 0.07;
      s.box([0.06, 0.01, 0.05], [ix, deck + 0.005, iz], dark);
      for (let i = 0; i < 6; i++) s.ring(0.012, 0.002, [ix - 0.02 + i * 0.008, deck + 0.03 + i * 0.004, iz], steel).rotation.y = Math.PI / 2;
      s.rod([ix + 0.11, deck + 0.09, iz], [ix + 0.02, deck + 0.045, iz], 0.009, s.material('#2f6fd0', { roughness: 0.5 }));
      s.rod([ix + 0.02, deck + 0.045, iz], [ix - 0.035, deck + 0.02, iz], 0.004, steel);
      s.rod([ix - 0.035, deck + 0.02, iz], [ix - 0.05, deck + 0.013, iz], 0.003, new THREE.MeshStandardMaterial({ color: '#ffb070', emissive: '#ff5a1c', emissiveIntensity: 1.8 }), 0.001);
      s.tube([[ix + 0.11, deck + 0.09, iz], [ix + 0.16, deck + 0.03, iz + 0.03], [ix + 0.1, deck + 0.006, iz + 0.07], [benchW / 2 + 0.02, 0.004, iz + 0.05]], 0.003, dark);
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#dfe6ea', transparent: true, opacity: 0.2, depthWrite: false }));
        puff.scale.setScalar(0.001); s.root.add(puff); smoke.push(puff);
      }
      // Diagnostic box wired to the elbow.
      const bx = -0.22, bz = 0.09;
      s.box([0.09, 0.03, 0.06], [bx, deck + 0.015, bz], s.material('#3a3d44', { roughness: 0.5 }));
      const screen = s.label(pick(['ERR 4F', '0x3A7', 'SYNC…', '62%']), 0.07, 0.035, [bx, deck + 0.0305, bz], '#7dffb0', '#0c1a14');
      screen.rotation.x = -Math.PI / 2;
      (screen.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#2a8a55');
      const elbow = arm.position.clone().add(new THREE.Vector3(a.pose === 'cradled' ? -0.06 * size : 0, a.pose === 'cradled' ? 0 : -0.06 * size, 0));
      s.tube([[bx, deck + 0.02, bz - 0.03], [bx - 0.03, deck + 0.05, 0.03], [elbow.x - 0.02, elbow.y - 0.02, elbow.z + 0.02], [elbow.x, elbow.y, elbow.z]], 0.004, s.material('#e9e9e4'));
      for (let i = 0; i < 5; i++) s.cylinder(0.004, 0.004, 0.004, [0.02 + random() * 0.14, deck + 0.002, 0.08 + random() * 0.05], brass, 6);
    } else if (a.story === 'pawned' || a.story === 'ready') {
      const pawn = a.story === 'pawned';
      const [tx, ty, tz] = ticketAnchor;
      s.tube([[tx, ty + 0.03, tz], [tx + 0.02, ty - 0.02, tz + 0.04], [tx + 0.03, Math.max(deck + 0.02, ty - 0.07), tz + 0.07]], 0.0015, s.material('#b3372a'));
      const tag = s.label(pawn ? 'No. ' + Math.floor(1000 + random() * 8999) : 'PAID', 0.07, 0.035, [tx + 0.04, Math.max(deck + 0.006, ty - 0.09), tz + 0.09], pawn ? '#3a2a1a' : '#1f6b45', pawn ? '#e3c877' : '#f1ead8');
      tag.rotation.set(-Math.PI / 2 + 0.2, 0, 0.5);
      if (pawn) {
        const card = s.label(pick(['¥48,000', '₩ 9,900', '300 cr', 'OFFERS']), 0.11, 0.06, [-0.2, deck + 0.034, 0.1], '#b3261e', '#f4f1e6');
        card.rotation.x = -0.35; card.rotation.y = 0.25;
        s.box([0.05, 0.004, 0.03], [-0.2, deck + 0.002, 0.085], dark);
      } else {
        s.cylinder(0.012, 0.012, 0.004, [0.22, deck + 0.002, 0.09], seam, 12);
        const cloth = s.box([0.1, 0.008, 0.07], [0.2, deck + 0.004, 0.1], s.material('#f0d24a', { roughness: 1 })); cloth.rotation.y = 0.4;
      }
    } else {
      for (let i = 0; i < 6; i++) s.cylinder(0.004, 0.004, 0.004, [(random() - 0.5) * 0.5, deck + 0.002, (random() - 0.2) * 0.2], brass, 6);
      s.tube([[0.15, deck + 0.004, 0.08], [0.2, deck + 0.004, 0.11], [0.24, deck + 0.004, 0.07]], 0.0035, s.material('#f0c22a'));
    }

    // --- Tool roll ---------------------------------------------------------------------------
    if (a.tools && !abandoned) {
      const z = benchD / 2 + 0.1, w = 0.36;
      const canvasCloth = s.material(mood.warmth > 0.5 ? '#8a5a32' : '#4a5a52', { roughness: 0.95 });
      s.box([w, 0.005, 0.15], [0, 0.0025, z], canvasCloth).rotation.y = 0;
      s.box([w, 0.004, 0.05], [0, 0.007, z + 0.03], s.material('#2f2a24', { roughness: 0.95 }));
      const roll = s.cylinder(0.022, 0.022, 0.15, [-w / 2 - 0.018, 0.022, z], canvasCloth, 14); roll.rotation.x = Math.PI / 2;
      s.tube([[w / 2, 0.004, z], [w / 2 + 0.05, 0.004, z + 0.03], [w / 2 + 0.09, 0.004, z - 0.02]], 0.003, s.material('#2f2a24'));
      const handles = ['#d8352c', '#f0c22a', '#2f7fd0', '#22262b', '#2aa860', '#e9e9e4'];
      const count = 4 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const x = -w / 2 + 0.04 + i * (w - 0.07) / (count - 1), lean = (random() - 0.5) * 0.12;
        if (random() < 0.15 && a.story === 'mid-repair') continue; // one is in use
        const group = new THREE.Group(); group.position.set(x, 0.012, z + 0.03); group.rotation.y = lean; s.root.add(group);
        const kind = i % 4;
        on(group, s.rod([0, 0, 0.03], [0, 0, -0.02], 0.007, s.material(handles[i % handles.length], { roughness: 0.5 })));
        if (kind === 0) on(group, s.rod([0, 0, -0.02], [0, 0, -0.085], 0.0025, steel));
        else if (kind === 1) { on(group, s.rod([0, 0, -0.02], [0.006, 0, -0.07], 0.003, steel)); on(group, s.rod([0, 0, -0.02], [-0.006, 0, -0.07], 0.003, steel)); }
        else if (kind === 2) on(group, s.rod([0, 0, -0.02], [0, 0, -0.07], 0.004, steel, 0.0008));
        else { on(group, s.rod([0, 0, -0.02], [0, 0, -0.06], 0.003, steel)); on(group, s.box([0.014, 0.004, 0.012], [0, 0, -0.064], steel)); }
      }
    }

    const energy = mood.energy;
    const live = a.story === 'mid-repair';
    return s.finish({
      footprint: 0.34,
      update: (_dt, time) => {
        if (a.story === 'ready') seam.emissiveIntensity = 1.3 + 0.3 * Math.sin(time * 2);
        if (live) {
          seam.emissiveIntensity = Math.sin(time * 6) > 0 ? 1.6 : 0.2;
          for (const twitcher of twitchers) twitcher.group.rotation.z = twitcher.rest + Math.max(0, Math.sin(time * mix(1, 5, energy))) ** 6 * 0.5;
          smoke.forEach((puff, index) => {
            const t = (time * 0.25 + index / smoke.length) % 1;
            puff.position.set(0.15 - s.root.position.x * 0 + Math.sin(t * 5 + index) * 0.01, deck + 0.02 + t * 0.2, 0.07);
            puff.scale.setScalar(0.006 + t * 0.02);
            (puff.material as THREE.MeshStandardMaterial).opacity = 0.3 * (1 - t);
          });
        }
      },
    });
  },
});
