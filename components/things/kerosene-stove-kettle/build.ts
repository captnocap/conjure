import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    state: choice('What is the stove doing right now?', {
      kettle: 'Burning steadily with a kettle steaming on top.',
      mochi: 'Rice cakes toasting and puffing on a wire net over the top plate.',
      potatoes: 'Foil-wrapped sweet potatoes baking slowly on top.',
      pot: 'A lidded pot of stew simmering, a ladle hooked on its rim.',
      drying: 'Lit with nothing on top, wet mittens and socks hung around it to dry.',
      off: 'Cold and unlit, the kettle standing dry on a dark burner.',
    }),
    shape: choice('What shape is the heater?', {
      tall: 'A tall slim cylinder like a lantern.',
      squat: 'A wide low drum with a broad top plate.',
    }),
    enamel: choice('What colour is its enamel?', {
      ivory: 'Ivory white with chrome, the classroom standard.',
      avocado: 'Avocado green, straight out of the 1970s.',
      burgundy: 'Deep wine red.',
      black: 'Black with brass trim, old-fashioned and serious.',
      sky: 'Pale sky blue, a cherished imported model.',
    }),
    kettle: choice('If there is a kettle, which kind?', {
      alumite: 'A dented golden aluminium kettle, the school kind.',
      iron: 'A heavy black cast-iron kettle with a hobnail pattern.',
      enamel: 'A red enamel kettle with white dots.',
      steel: 'A shiny stainless whistling kettle.',
    }),
    beside: choice('What is on the floor beside it?', {
      nothing: 'Nothing; it stands alone.',
      can: 'A red plastic kerosene can with a hand siphon pump.',
      cat: 'A cat curled as close to the heat as it dares.',
      matches: 'A big box of matches and a folded newspaper under a drip tray.',
    }),
    fence: noul('Is there a square wire safety fence around it, as in a house with small children?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lit = a.state !== 'off';
    const squat = a.shape === 'squat';
    const R = squat ? 0.19 : 0.145;
    const tankR = R + 0.05, tankH = squat ? 0.09 : 0.11;
    const burnH = squat ? 0.15 : 0.22;
    const enamelColour = { ivory: '#ece4cf', avocado: '#7a8a3f', burgundy: '#7a1f2a', black: '#1c1b1a', sky: '#9cc3d8' }[a.enamel];
    const enamel = s.material(enamelColour, { roughness: 0.35, metalness: 0.1 });
    const trim = s.material(a.enamel === 'black' ? '#b8963a' : '#cfd3d2', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#23211f', { roughness: 0.7, metalness: 0.3 });

    // --- Tank, feet and controls ------------------------------------------------------------
    const foot = 0.025;
    s.cylinder(tankR + 0.03, tankR + 0.03, 0.008, [0, 0.004, 0], trim, 32);
    for (let k = 0; k < 3; k++) s.cylinder(0.018, 0.022, foot, [Math.cos(k * 2.094 + 0.5) * tankR * 0.8, foot / 2, Math.sin(k * 2.094 + 0.5) * tankR * 0.8], dark, 10);
    s.lathe([[0, foot], [tankR - 0.01, foot], [tankR, foot + 0.02], [tankR, foot + tankH - 0.02], [tankR - 0.02, foot + tankH], [R, foot + tankH + 0.012], [0, foot + tankH + 0.012]], enamel);
    const y1 = foot + tankH + 0.012;
    s.ring(tankR, 0.005, [0, foot + tankH * 0.5, 0], trim).rotation.x = Math.PI / 2;
    // Wick knob, fuel gauge and filler cap.
    s.cylinder(0.028, 0.028, 0.03, [0, foot + tankH * 0.5, tankR + 0.012], dark, 16).rotation.x = Math.PI / 2;
    s.box([0.008, 0.04, 0.006], [0, foot + tankH * 0.5, tankR + 0.03], trim);
    s.cylinder(0.022, 0.022, 0.006, [tankR * 0.62, foot + tankH + 0.004, tankR * 0.62], s.material('#f4f1e6'), 14);
    s.box([0.003, 0.004, 0.02], [tankR * 0.62, foot + tankH + 0.008, tankR * 0.62], s.material('#c0282c')).rotation.y = random() * 2;
    s.cylinder(0.02, 0.02, 0.016, [-tankR * 0.66, foot + tankH + 0.008, tankR * 0.5], trim, 12);

    // --- Burner housing, mesh and guard ---------------------------------------------------------
    const lowerH = 0.07;
    s.cylinder(R, R, lowerH, [0, y1 + lowerH / 2, 0], enamel, 32);
    const y2 = y1 + lowerH;
    const heat = lit ? mix(1.1, 3.2, mood.warmth) : 0;
    const meshCanvas = document.createElement('canvas'); meshCanvas.width = 256; meshCanvas.height = 128;
    const mc = meshCanvas.getContext('2d')!;
    const fire = mc.createLinearGradient(0, 0, 0, 128);
    if (lit) { fire.addColorStop(0, '#ff9a3a'); fire.addColorStop(0.5, '#ff5a1c'); fire.addColorStop(1, '#c8300f'); }
    else { fire.addColorStop(0, '#5a5650'); fire.addColorStop(1, '#3a3632'); }
    mc.fillStyle = fire; mc.fillRect(0, 0, 256, 128);
    mc.strokeStyle = lit ? 'rgba(90,20,0,0.75)' : 'rgba(20,18,16,0.8)'; mc.lineWidth = 2;
    for (let x = -128; x < 256; x += 10) { mc.beginPath(); mc.moveTo(x, 0); mc.lineTo(x + 128, 128); mc.stroke(); mc.beginPath(); mc.moveTo(x + 128, 0); mc.lineTo(x, 128); mc.stroke(); }
    const meshMap = new THREE.CanvasTexture(meshCanvas); meshMap.colorSpace = THREE.SRGBColorSpace; meshMap.wrapS = THREE.RepeatWrapping; meshMap.repeat.x = 2;
    const ember = new THREE.MeshStandardMaterial({ map: meshMap, emissive: lit ? '#ffffff' : '#000000', emissiveMap: lit ? meshMap : null, emissiveIntensity: heat, roughness: 0.8 });
    s.mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.66, burnH, 28, 1, true), ember, [0, y2 + burnH / 2, 0]);
    s.cylinder(R * 0.3, R * 0.3, burnH, [0, y2 + burnH / 2, 0], dark, 12);
    const bars = squat ? 20 : 16;
    for (let k = 0; k < bars; k++) { const ang = (k / bars) * Math.PI * 2; s.rod([Math.cos(ang) * (R - 0.006), y2, Math.sin(ang) * (R - 0.006)], [Math.cos(ang) * (R - 0.006), y2 + burnH, Math.sin(ang) * (R - 0.006)], 0.0035, trim); }
    for (const t of [0.33, 0.66]) s.ring(R - 0.006, 0.0035, [0, y2 + burnH * t, 0], trim).rotation.x = Math.PI / 2;
    const y3 = y2 + burnH;
    const capH = 0.05;
    s.lathe([[0, y3], [R, y3], [R + 0.012, y3 + 0.01], [R + 0.012, y3 + capH - 0.012], [R - 0.02, y3 + capH], [0, y3 + capH]], enamel);
    const top = y3 + capH;
    s.cylinder(R - 0.03, R - 0.03, 0.006, [0, top + 0.003, 0], dark, 28);
    for (let k = 0; k < 10; k++) s.box([0.012, 0.004, R * 0.5], [Math.cos(k * 0.628) * R * 0.45, top + 0.007, Math.sin(k * 0.628) * R * 0.45], trim).rotation.y = -k * 0.628 + Math.PI / 2;
    // Carry handle folded down behind, and a maker's plate.
    const bail = s.ring(R + 0.03, 0.005, [0, y2 + burnH * 0.55, 0], trim, Math.PI);
    bail.rotation.set(Math.PI / 2 - 0.5, 0, Math.PI);
    s.box([0.07, 0.03, 0.004], [0, y1 + lowerH * 0.5, R + 0.001], trim);
    const plateTop = top + 0.009;

    // --- Steam and other moving parts -------------------------------------------------------
    const vapour = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.34, depthWrite: false });
    const puffs: { mesh: THREE.Mesh; from: [number, number, number]; offset: number; reach: number }[] = [];
    const steam = (from: [number, number, number], count: number, reach = 0.3) => {
      for (let k = 0; k < count; k++) {
        const mesh = s.ball([0.02, 0.026, 0.02], from, vapour, 8);
        mesh.castShadow = mesh.receiveShadow = false;
        puffs.push({ mesh, from, offset: k / count + random() * 0.1, reach });
      }
    };

    // --- What is on the top plate ------------------------------------------------------------
    const kettleOn = a.state === 'kettle' || a.state === 'off';
    if (kettleOn) {
      const kind = a.kettle;
      const metal = kind === 'alumite' ? s.material('#d9a83a', { metalness: 0.75, roughness: 0.38 })
        : kind === 'iron' ? s.material('#1e1d1c', { roughness: 0.85, metalness: 0.3 })
        : kind === 'enamel' ? s.material('#c0282c', { roughness: 0.25 })
        : s.material('#d5dadb', { metalness: 0.95, roughness: 0.16 });
      const kr = kind === 'iron' ? 0.085 : 0.1, kh = kind === 'iron' ? 0.1 : 0.115;
      const body = s.lathe([[0, 0], [kr * 0.78, 0], [kr, kh * 0.28], [kr * 0.98, kh * 0.55], [kr * 0.7, kh * 0.9], [kr * 0.5, kh], [0, kh]], metal, [0, plateTop, 0]);
      body.rotation.y = random() * 6;
      s.cylinder(kr * 0.5, kr * 0.52, 0.012, [0, plateTop + kh + 0.006, 0], metal, 20);
      s.ball([0.014, 0.014, 0.014], [0, plateTop + kh + 0.024, 0], kind === 'iron' ? metal : dark, 10);
      const dir = 0.6 + random() * 0.8, dx = Math.cos(dir), dz = Math.sin(dir);
      const spoutTip: [number, number, number] = [dx * (kr + 0.075), plateTop + kh * 1.0, dz * (kr + 0.075)];
      s.tube([[dx * kr * 0.8, plateTop + kh * 0.35, dz * kr * 0.8], [dx * (kr + 0.03), plateTop + kh * 0.5, dz * (kr + 0.03)], [dx * (kr + 0.06), plateTop + kh * 0.85, dz * (kr + 0.06)], spoutTip], kind === 'iron' ? 0.014 : 0.011, metal);
      const arch = s.ring(kr * 0.78, kind === 'iron' ? 0.006 : 0.007, [0, plateTop + kh * 0.92, 0], kind === 'alumite' || kind === 'iron' ? metal : dark, Math.PI);
      arch.rotation.y = -dir;
      if (kind !== 'iron') { const grip = s.ring(kr * 0.78, 0.011, [0, plateTop + kh * 0.92, 0], dark, 0.9); grip.rotation.set(0, -dir, 0); grip.rotateZ(Math.PI / 2 - 0.45); }
      if (kind === 'enamel') for (let k = 0; k < 14; k++) { const ang = k * 0.45, yy = plateTop + kh * (0.25 + (k % 3) * 0.2), rr = kr * (k % 3 === 2 ? 0.86 : 0.99); s.ball([0.008, 0.008, 0.003], [Math.cos(ang) * rr, yy, Math.sin(ang) * rr], s.material('#f6f3ea'), 6).lookAt(Math.cos(ang) * 2, yy, Math.sin(ang) * 2); }
      if (kind === 'iron') for (let k = 0; k < 40; k++) { const ang = k * 0.61, yy = plateTop + kh * (0.2 + (k % 4) * 0.13); s.ball([0.005, 0.005, 0.005], [Math.cos(ang) * kr * 0.99, yy, Math.sin(ang) * kr * 0.99], metal, 6); }
      if (lit) steam([spoutTip[0], spoutTip[1] + 0.02, spoutTip[2]], 5, 0.34);
    } else if (a.state === 'mochi') {
      const net = R + 0.03;
      for (let k = -3; k <= 3; k++) { s.rod([k * net / 3.4, plateTop + 0.012, -net], [k * net / 3.4, plateTop + 0.012, net], 0.0025, trim); s.rod([-net, plateTop + 0.014, k * net / 3.4], [net, plateTop + 0.014, k * net / 3.4], 0.0025, trim); }
      for (const [x0, z0, x1, z1] of [[-net, -net, net, -net], [net, -net, net, net], [net, net, -net, net], [-net, net, -net, -net]]) s.rod([x0, plateTop + 0.013, z0], [x1, plateTop + 0.013, z1], 0.004, trim);
      const cakes = 3 + Math.floor(random() * 2 + mood.density * 2);
      for (let k = 0; k < cakes; k++) {
        const ang = k / cakes * 6.283 + random() * 0.4, rr = cakes > 4 && k === 0 ? 0 : R * 0.5;
        const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr, turn = random() * 3;
        const toast = random();
        const cake = s.box([0.058, 0.018, 0.038], [x, plateTop + 0.026, z], s.material(new THREE.Color('#f8f4e8').lerp(new THREE.Color('#c99a5a'), toast * 0.35), { roughness: 0.8 }));
        cake.rotation.y = turn;
        if (toast > 0.35) {
          const puff = s.ball([0.022 + toast * 0.012, 0.018 + toast * 0.02, 0.018], [x, plateTop + 0.04, z], s.material('#fbf8ee', { roughness: 0.7 }), 12);
          puff.rotation.y = turn;
          s.ball([0.012, 0.004, 0.01], [x, plateTop + 0.057 + toast * 0.02, z], s.material('#9a6a2c', { roughness: 0.9 }), 8);
        }
      }
      s.rod([net * 0.9, plateTop + 0.02, -net * 0.2], [net * 0.5 + 0.22, plateTop + 0.05, net * 0.9], 0.003, s.material('#5a3a22'));
      s.rod([net * 0.9, plateTop + 0.02, -net * 0.12], [net * 0.5 + 0.23, plateTop + 0.05, net * 0.8], 0.003, s.material('#5a3a22'));
      steam([0, plateTop + 0.08, 0], 2, 0.16);
    } else if (a.state === 'potatoes') {
      const foil = s.material('#d8dcdc', { metalness: 0.9, roughness: 0.42, flatShading: true });
      const count = 2 + Math.floor(random() * 2);
      for (let k = 0; k < count; k++) {
        const ang = k / count * 6.283 + random(), rr = R * 0.42;
        const potato = s.ball([0.075, 0.03, 0.032], [Math.cos(ang) * rr, plateTop + 0.03, Math.sin(ang) * rr], k === 0 ? s.material('#7a2a4a', { roughness: 0.8 }) : foil, 7);
        potato.rotation.y = ang + 1.2;
        if (k === 0) {
          const flesh = s.ball([0.03, 0.026, 0.028], [Math.cos(ang) * rr + Math.sin(ang + 1.2) * -0.0 + Math.cos(-ang - 1.2) * 0.05, plateTop + 0.032, Math.sin(ang) * rr + Math.sin(-ang - 1.2) * 0.05], s.material('#f0c23a', { roughness: 0.7 }), 10);
          flesh.rotation.y = ang + 1.2;
          const wrap = s.ball([0.08, 0.008, 0.05], [Math.cos(ang) * rr, plateTop + 0.006, Math.sin(ang) * rr], foil, 7);
          wrap.rotation.y = ang + 1.2;
        }
      }
      steam([0, plateTop + 0.07, 0], 2, 0.16);
    } else if (a.state === 'pot') {
      const alu = s.material('#c9cdcc', { metalness: 0.8, roughness: 0.4 });
      const pr = Math.min(R - 0.01, 0.13);
      s.mesh(new THREE.CylinderGeometry(pr, pr * 0.94, 0.11, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#c9cdcc', metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide }), [0, plateTop + 0.055, 0]);
      s.cylinder(pr * 0.94, pr * 0.94, 0.004, [0, plateTop + 0.002, 0], alu, 28);
      s.cylinder(pr * 0.97, pr * 0.97, 0.004, [0, plateTop + 0.09, 0], s.material('#8a5a2c', { roughness: 0.5 }), 28);
      for (const x of [-1, 1]) s.ring(0.022, 0.005, [x * (pr + 0.016), plateTop + 0.09, 0], dark, Math.PI).rotation.set(Math.PI / 2, 0, x > 0 ? -Math.PI / 2 : Math.PI / 2);
      const lid = s.lathe([[0, 0.02], [pr * 0.5, 0.016], [pr + 0.004, 0], [pr + 0.004, -0.004], [0, -0.004]], alu, [0.03, plateTop + 0.118, -0.02]);
      lid.rotation.z = -0.16;
      s.ball([0.014, 0.012, 0.014], [0.026, plateTop + 0.147, -0.02], dark, 10);
      s.rod([-pr * 0.5, plateTop + 0.085, pr * 0.3], [-pr - 0.07, plateTop + 0.2, pr * 0.6], 0.004, alu);
      for (let k = 0; k < 4; k++) s.ball([0.02, 0.012, 0.02], [-pr * 0.5 + k * 0.035, plateTop + 0.094, (random() - 0.5) * 0.08], s.material(['#f6f1e6', '#d9822b', '#6a4a2a', '#e6c25a'][k], { roughness: 0.7 }), 8);
      steam([-pr * 0.6, plateTop + 0.13, 0.02], 5, 0.32);
    }
    // Soot and a scorch ring on older stoves.
    if (mood.wear > 0.45) s.cylinder(R - 0.02, R - 0.02, 0.002, [0, top + 0.0075, 0], s.material('#3a2a20', { roughness: 1 }), 24);

    // --- Safety fence and laundry ------------------------------------------------------------
    const fenced = a.fence || a.state === 'drying';
    const F = tankR + 0.16, FH = top * 0.92;
    if (fenced) {
      const wire = s.material('#d5d8d6', { metalness: 0.8, roughness: 0.35 });
      const corners: [number, number][] = [[-F, -F], [F, -F], [F, F], [-F, F]];
      corners.forEach(([x, z], k) => {
        const [nx, nz] = corners[(k + 1) % 4];
        s.rod([x, 0, z], [x, FH, z], 0.006, wire);
        for (const y of [0.04, FH * 0.5, FH]) s.rod([x, y, z], [nx, y, nz], 0.004, wire);
        for (let b = 1; b < 7; b++) { const t = b / 7; s.rod([mix(x, nx, t), 0.04, mix(z, nz, t)], [mix(x, nx, t), FH, mix(z, nz, t)], 0.0025, wire); }
      });
    }
    if (a.state === 'drying') {
      const wool = ['#c0282c', '#2f4a7a', '#e6c25a', '#f3f1ea', '#5a8a6a', '#7a5a8a'];
      const items = 3 + Math.floor(mood.density * 4);
      for (let k = 0; k < items; k++) {
        const side = k % 4, along = (random() - 0.5) * F * 1.3;
        const [x, z] = side === 0 ? [along, F] : side === 1 ? [F, along] : side === 2 ? [-F, along] : [along, -F];
        const cloth = s.material(wool[Math.floor(random() * wool.length)], { roughness: 1 });
        const sock = random() < 0.5;
        const group = new THREE.Group();
        group.position.set(x, FH, z);
        group.rotation.y = side % 2 === 0 ? 0 : Math.PI / 2;
        const drop = sock ? 0.2 : 0.13;
        for (const face of [-1, 1]) {
          const flap = new THREE.Mesh(new THREE.BoxGeometry(sock ? 0.07 : 0.1, drop * (face > 0 ? 1 : 0.6), 0.012), cloth);
          flap.position.set(0, -drop * (face > 0 ? 0.5 : 0.3) + 0.004, face * 0.012);
          flap.castShadow = true; group.add(flap);
        }
        if (!sock) { const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.012), cloth); thumb.position.set(0.06, -drop * 0.55, 0.012); thumb.rotation.z = -0.5; thumb.castShadow = true; group.add(thumb); }
        s.root.add(group);
      }
    }

    // --- Beside it ---------------------------------------------------------------------------
    const edge = fenced ? F + 0.16 : tankR + 0.17;
    if (a.beside === 'can') {
      const poly = s.material('#c8301f', { roughness: 0.5 });
      s.box([0.2, 0.3, 0.14], [-edge - 0.04, 0.15, 0.05], poly).rotation.y = 0.25;
      s.box([0.1, 0.03, 0.03], [-edge - 0.04, 0.325, 0.05], poly).rotation.y = 0.25;
      s.cylinder(0.026, 0.026, 0.03, [-edge + 0.03, 0.315, 0.03], s.material('#f1ebdc'), 12);
      // Siphon pump: bulb, stiff tube and a floppy hose.
      s.ball([0.03, 0.04, 0.03], [-edge - 0.1, 0.39, 0.07], s.material('#d93a2a', { roughness: 0.4 }), 12);
      s.rod([-edge - 0.1, 0.3, 0.07], [-edge - 0.1, 0.36, 0.07], 0.008, s.material('#e9e4d2'));
      s.tube([[-edge - 0.1, 0.42, 0.07], [-edge - 0.16, 0.44, 0.12], [-edge - 0.2, 0.3, 0.18], [-edge - 0.17, 0.02, 0.24], [-edge - 0.05, 0.012, 0.3]], 0.007, s.material('#e9e4d2', { roughness: 0.5 }));
    } else if (a.beside === 'cat') {
      const fur = s.material(['#e8dfd0', '#d98a3a', '#3a3632', '#9a9690'][Math.floor(random() * 4)], { roughness: 1 });
      const cx = edge * 0.55, cz = edge + 0.04;
      s.ball([0.16, 0.08, 0.12], [cx, 0.078, cz], fur, 18).rotation.y = -0.4;
      s.ball([0.06, 0.054, 0.058], [cx - 0.13, 0.07, cz + 0.05], fur, 14);
      for (const side of [-1, 1]) s.mesh(new THREE.ConeGeometry(0.02, 0.04, 4), fur, [cx - 0.13 + side * 0.03, 0.125, cz + 0.05 + side * 0.012]);
      s.tube([[cx + 0.13, 0.04, cz - 0.04], [cx + 0.17, 0.04, cz + 0.06], [cx + 0.08, 0.04, cz + 0.14], [cx - 0.05, 0.04, cz + 0.14]], 0.015, fur);
    } else if (a.beside === 'matches') {
      s.box([tankR * 2.9, 0.004, tankR * 2.6], [0, 0.002, 0.02], s.material('#d9d3c0', { roughness: 1 })).rotation.y = 0.12;
      s.box([0.11, 0.035, 0.07], [edge + 0.02, 0.0175, 0.08], s.material('#e6c25a', { roughness: 0.7 })).rotation.y = -0.5;
      s.box([0.112, 0.02, 0.05], [edge + 0.02, 0.0176, 0.08], s.material('#b0242c', { roughness: 0.7 })).rotation.y = -0.5;
    }

    const glowBase = heat;
    const pace = mix(0.25, 0.9, mood.energy);
    return s.finish({
      update(_dt, time) {
        if (lit) ember.emissiveIntensity = glowBase * (0.9 + 0.1 * Math.sin(time * 3.1) * Math.sin(time * 1.3));
        for (const { mesh, from, offset, reach } of puffs) {
          const k = (time * pace + offset) % 1;
          mesh.position.set(from[0] + Math.sin(k * 5 + offset * 9) * 0.03 * k, from[1] + k * reach, from[2] + Math.cos(k * 4 + offset * 7) * 0.02 * k);
          mesh.scale.setScalar(0.02 * (0.8 + k * 2.4));
        }
      },
    });
  },
});
