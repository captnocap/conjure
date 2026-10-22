import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    style: choice('What kind of pod is it?', {
      clinical: 'A smooth white medical capsule, rounded like a pill, hospital-clean.',
      military: 'An olive drab box with ribs and stencils, built like an ammunition crate.',
      brass: 'A riveted brass and copper cylinder with a round porthole, like a diving bell.',
      budget: 'A cheap bright plastic economy pod with a sponsor stripe down the side.',
    }),
    window: choice('What does the window show?', {
      frosted: 'Frosted over completely: white ferns of ice, nothing visible behind.',
      face: 'A face dimly visible, eyes closed, lit faintly blue.',
      empty: 'Empty: a dented pillow and loose straps, nobody inside.',
      cracked: 'Cracked: a star of fractures and a plume of escaping frost.',
      hand: 'A handprint wiped in the frost from the inside.',
    }),
    light: choice('What is the status light doing?', {
      green: 'Steady green: all is well.',
      amber: 'Amber: something needs attention and nobody is coming.',
      red: 'Blinking red.',
      dead: 'Dead. No light at all.',
    }),
    stencil: choice('What is written on the lid?', {
      number: 'Only a berth number.',
      wake: 'DO NOT WAKE.',
      fragile: 'FRAGILE, like freight.',
      name: 'A first name, painted by hand.',
      return: 'RETURN TO SENDER.',
    }),
    left: choice('What has been left on it?', {
      nothing: 'Nothing.',
      flowers: 'A small bunch of flowers taped to the lid.',
      drawing: "A child's crayon drawing taped beside the window.",
      hoses: 'Torn umbilical hoses still trailing from one end.',
      counter: 'A glowing countdown that is still running.',
    }),
    tumbling: noul('Is it tumbling end over end, rather than lying still?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pod = new THREE.Group();
    const roll = new THREE.Group();
    pod.add(roll);
    s.root.add(pod);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: V3 = [0, 0, 0], parent: THREE.Object3D = roll) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const round = a.style !== 'military';
    const L = a.style === 'brass' ? 1.9 : 2.15, R = a.style === 'budget' ? 0.36 : 0.4, FLAT = 0.82;
    const lidColour = { clinical: '#eceef0', military: '#66704a', brass: '#b98a3e', budget: mood.cheer > 0.5 ? '#f0b429' : '#2d9c9a' }[a.style];
    const lid = s.material(lidColour, a.style === 'brass' ? { metalness: 0.85, roughness: 0.35 } : { roughness: a.style === 'clinical' ? 0.35 : 0.7 });
    const tub = s.material({ clinical: '#8e98a3', military: '#4c5438', brass: '#7c4f2c', budget: '#e9e6dc' }[a.style], a.style === 'brass' ? { metalness: 0.8, roughness: 0.45 } : { roughness: 0.6 });
    const dark = s.material('#20242a', { roughness: 0.55 });
    const steel = s.material('#aeb4ba', { metalness: 0.85, roughness: 0.3 });
    const top = round ? R * FLAT : 0.3;

    if (round) {
      // Lid and tub are the two halves of one capsule lying along x.
      const half = (upper: boolean, material: THREE.Material) => {
        const geometry = new THREE.CapsuleGeometry(R, L - R * 2, 10, 28);
        geometry.rotateZ(Math.PI / 2);
        const mesh = add(geometry, material);
        mesh.scale.set(1, FLAT, 1);
        material.clippingPlanes = null;
        // Keep one half by flattening the other onto the seam.
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) if (upper ? p.getY(i) < 0 : p.getY(i) > 0) p.setY(i, 0);
        geometry.computeVertexNormals();
        return mesh;
      };
      half(true, lid);
      half(false, tub).scale.set(1.03, FLAT * 1.03, 1.03);
      const seam = new THREE.CapsuleGeometry(R * 1.045, L - R * 2, 4, 28);
      seam.rotateZ(Math.PI / 2);
      add(seam, dark).scale.set(1, 0.07, 1);
      if (a.style === 'brass') for (const x of [-0.62, -0.2, 0.62]) {
        const hoop = add(new THREE.TorusGeometry(R * 1.02, 0.022, 8, 36), tub, [x, 0, 0]);
        hoop.rotation.y = Math.PI / 2; hoop.scale.set(1, FLAT, 1);
        const rivets = Array.from({ length: 16 }, (_unused, i) => ({ at: [x, Math.sin((i / 16) * Math.PI * 2) * R * FLAT * 1.05, Math.cos((i / 16) * Math.PI * 2) * R * 1.05] as V3, size: 0.014 }));
        roll.add(s.scatter(new THREE.SphereGeometry(1, 6, 4), steel, rivets));
      }
      if (a.style === 'budget') {
        const band = new THREE.CapsuleGeometry(R * 1.012, L - R * 2, 4, 28, 1);
        band.rotateZ(Math.PI / 2);
        const stripe = add(band, s.material('#d6392f', { roughness: 0.6 }), [0, 0.11, 0]);
        stripe.scale.set(1, 0.09, 1);
        roll.add(s.label('SLEEP·EZ', 0.5, 0.09, [-0.3, 0.15, R * 1.0], '#ffffff', '#d6392f'));
      }
    } else {
      add(new THREE.BoxGeometry(L, 0.3, 0.8), lid, [0, 0.15, 0]);
      add(new THREE.BoxGeometry(L + 0.04, 0.3, 0.84), tub, [0, -0.15, 0]);
      add(new THREE.BoxGeometry(L + 0.06, 0.04, 0.86), dark);
      for (let i = 0; i < 6; i++) { const x = -L / 2 + 0.12 + i * ((L - 0.24) / 5); add(new THREE.BoxGeometry(0.05, 0.64, 0.88), tub, [x, -0.005, 0]); }
      for (const x of [-1, 1]) for (const z of [-1, 1]) add(new THREE.BoxGeometry(0.1, 0.66, 0.1), dark, [x * (L / 2), 0, z * 0.4]);
      for (const z of [-1, 1]) for (const x of [-0.5, 0.5]) add(new THREE.BoxGeometry(0.09, 0.12, 0.03), steel, [x, 0, z * 0.435]);
    }

    // Carrying rails, like the handles on a coffin.
    for (const z of [-1, 1]) {
      const zr = (round ? R : 0.42) + 0.07;
      const rail = add(new THREE.CylinderGeometry(0.018, 0.018, L * 0.52, 8), steel, [-0.05, -0.07, z * zr]);
      rail.rotation.z = Math.PI / 2;
      for (const x of [-0.5, 0, 0.42]) add(new THREE.BoxGeometry(0.03, 0.03, 0.09), dark, [x - 0.05, -0.07, z * (zr - 0.04)]);
    }
    // End caps: a coupling at the head, vents and ports at the foot.
    const cap = add(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 20), dark, [L / 2 + (round ? -0.01 : 0.04), round ? 0 : -0.02, 0]);
    cap.rotation.z = -Math.PI / 2;
    add(new THREE.TorusGeometry(0.1, 0.018, 6, 20, Math.PI), steel, [L / 2 + 0.04, 0, 0]).rotation.set(0, 0, -Math.PI / 2);
    const foot = -L / 2 - (round ? -0.02 : 0.03);
    for (const [y, z] of [[0.08, -0.12], [0.08, 0.12], [-0.1, 0]] as const) add(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 12), steel, [foot, y, z]).rotation.z = Math.PI / 2;

    // Viewport housing and the window itself.
    const wx = L / 2 - 0.66;
    const glassW = a.style === 'brass' ? 0.46 : 0.42, glassL = a.style === 'brass' ? 0.46 : 0.6;
    add(new THREE.BoxGeometry(glassL + 0.14, 0.09, glassW + 0.14), a.style === 'brass' ? tub : dark, [wx, top - 0.02, 0]);
    const pane = document.createElement('canvas');
    pane.width = 320; pane.height = 256;
    const g = pane.getContext('2d')!;
    // Interior first: canvas x runs toward the head.
    const inside = g.createLinearGradient(0, 0, 320, 0);
    inside.addColorStop(0, '#070c13'); inside.addColorStop(1, '#122338');
    g.fillStyle = inside; g.fillRect(0, 0, 320, 256);
    g.fillStyle = '#8fa0b0'; g.beginPath(); g.ellipse(215, 128, 82, 96, 0, 0, Math.PI * 2); g.fill();
    if (a.window === 'empty') {
      g.fillStyle = '#9aa7b3'; g.beginPath(); g.ellipse(215, 128, 46, 52, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3a3f46'; g.lineWidth = 12; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 60); g.quadraticCurveTo(80, 90, 120, 40); g.stroke();
      g.beginPath(); g.moveTo(0, 200); g.quadraticCurveTo(70, 150, 130, 215); g.stroke();
      g.fillStyle = '#c8ccd0'; g.fillRect(112, 28, 22, 26); g.fillRect(122, 204, 22, 26);
    } else if (a.window !== 'frosted') {
      g.fillStyle = '#5b6f86'; g.fillRect(0, 62, 140, 132);
      const skin = ['#c9a98f', '#8d5f43', '#e4c4a8', '#6f4a36'][Math.floor(random() * 4)];
      g.fillStyle = skin; g.fillRect(120, 104, 40, 48);
      g.beginPath(); g.ellipse(212, 128, 62, 50, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = ['#2b2420', '#d9d5cc', '#7a4a2a', '#11100f'][Math.floor(random() * 4)];
      g.beginPath(); g.ellipse(262, 128, 26, 54, 0, -Math.PI / 2, Math.PI / 2); g.fill();
      g.strokeStyle = 'rgba(30,20,20,0.75)'; g.lineWidth = 5; g.lineCap = 'round';
      for (const y of [106, 150]) { g.beginPath(); g.arc(222, y, 11, Math.PI * 0.6, Math.PI * 1.4); g.stroke(); }
      g.beginPath(); g.moveTo(178, 118); g.lineTo(178, 138); g.stroke();
      g.fillStyle = 'rgba(60,130,220,0.18)'; g.fillRect(0, 0, 320, 256);
    }
    // Frost creeping in from the edges; total when frosted over.
    const frostAmount = a.window === 'frosted' ? 1 : a.window === 'hand' ? 0.94 : mix(0.15, 0.4, 1 - mood.warmth);
    const hazeEdge = g.createRadialGradient(160, 128, a.window === 'frosted' || a.window === 'hand' ? 0 : 105, 160, 128, 215);
    hazeEdge.addColorStop(0, `rgba(226,238,246,${a.window === 'frosted' || a.window === 'hand' ? 0.93 : 0})`); hazeEdge.addColorStop(1, a.window === 'frosted' || a.window === 'hand' ? 'rgba(240,247,252,0.98)' : 'rgba(232,242,250,0.8)');
    g.fillStyle = hazeEdge; g.fillRect(0, 0, 320, 256);
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.6;
    for (let i = 0; i < 70 * frostAmount; i++) {
      // Ice ferns: a stem with short barbs, growing in from an edge.
      const edge = Math.floor(random() * 4), along = random();
      let x = edge === 0 ? 0 : edge === 1 ? 320 : along * 320, y = edge === 2 ? 0 : edge === 3 ? 256 : along * 256;
      let heading = Math.atan2(128 - y, 160 - x) + (random() - 0.5) * 1.2;
      const length = 6 + random() * 16 * frostAmount;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < length; k++) {
        heading += (random() - 0.5) * 0.4; x += Math.cos(heading) * 7; y += Math.sin(heading) * 7; g.lineTo(x, y);
        const barb = heading + (k % 2 ? 1 : -1) * 1.0; g.lineTo(x + Math.cos(barb) * 7, y + Math.sin(barb) * 7); g.moveTo(x, y);
      }
      g.stroke();
    }
    if (a.window === 'hand') {
      g.save(); g.translate(170, 130); g.rotate(-Math.PI / 2 + (random() - 0.5) * 0.4);
      g.fillStyle = 'rgba(16,30,46,0.9)';
      g.beginPath(); g.ellipse(0, 18, 30, 34, 0, 0, Math.PI * 2); g.fill();
      [-27, -10, 8, 25].forEach((x, i) => { g.beginPath(); g.ellipse(x, -34 - (i === 1 || i === 2 ? 12 : 2), 8.5, 30, x * 0.006, 0, Math.PI * 2); g.fill(); });
      g.beginPath(); g.ellipse(-40, 16, 9, 24, -0.9, 0, Math.PI * 2); g.fill();
      // Drips where the palm dragged.
      for (let i = 0; i < 4; i++) g.fillRect(-20 + i * 13, 44, 4, 20 + random() * 44);
      g.restore();
    }
    if (a.window === 'cracked') {
      const cx = 120 + random() * 60, cy = 90 + random() * 70;
      g.strokeStyle = '#ffffff'; g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        let x = cx, y = cy, heading = (i / 9) * Math.PI * 2 + random() * 0.4;
        g.lineWidth = 2.5 + random() * 2; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 9; k++) { heading += (random() - 0.5) * 0.7; x += Math.cos(heading) * 22; y += Math.sin(heading) * 22; g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = '#05080c'; g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill();
    }
    const glassMap = new THREE.CanvasTexture(pane);
    glassMap.colorSpace = THREE.SRGBColorSpace;
    const glow = a.light === 'dead' ? 0.08 : 0.3;
    const glass = add(a.style === 'brass' ? new THREE.CircleGeometry(glassW / 2, 36) : new THREE.PlaneGeometry(glassL, glassW),
      new THREE.MeshStandardMaterial({ map: glassMap, emissiveMap: glassMap, emissive: '#ffffff', emissiveIntensity: glow, roughness: 0.25 }), [wx, top + 0.027, 0]);
    glass.rotation.x = -Math.PI / 2;
    if (a.style === 'brass') { const bezel = add(new THREE.TorusGeometry(glassW / 2 + 0.01, 0.025, 8, 36), lid, [wx, top + 0.03, 0]); bezel.rotation.x = Math.PI / 2; }
    if (a.window === 'cracked') {
      // Escaping frost: a loose plume of ice crystals above the glass.
      const plume = Array.from({ length: 90 }, () => { const h = random() ** 0.7; return { at: [wx + (random() - 0.5) * (0.12 + h * 0.5), top + 0.05 + h * 0.75, (random() - 0.5) * (0.1 + h * 0.45)] as V3, size: 0.008 + random() * 0.02 * (1 - h * 0.5) }; });
      roll.add(s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#f3f9fd', emissive: '#bfe0f5', emissiveIntensity: 0.4, roughness: 0.5 }), plume));
    }

    // Status panel beside the window.
    const px = wx - glassL / 2 - 0.2;
    add(new THREE.BoxGeometry(0.2, 0.06, 0.3), dark, [px, top - 0.015, 0]);
    const lightColour = { green: '#3ee07a', amber: '#ffae2b', red: '#ff3a2e', dead: '#3a3d42' }[a.light];
    const lamp = new THREE.MeshStandardMaterial({ color: lightColour, emissive: lightColour, emissiveIntensity: a.light === 'dead' ? 0 : 2.6, roughness: 0.4 });
    add(new THREE.SphereGeometry(0.045, 16, 12), lamp, [px, top + 0.02, 0.07]);
    add(new THREE.TorusGeometry(0.05, 0.01, 6, 18), steel, [px, top + 0.018, 0.07]).rotation.x = Math.PI / 2;
    const live = a.light !== 'dead';
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.12, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: '#16303a', emissive: '#49c7d8', emissiveIntensity: live && random() > 0.3 ? 0.9 : 0 }), [px, top + 0.016, -0.02 - i * 0.045]);

    // Lettering on the foot end of the lid.
    const names = ['MARA', 'JONAH', 'ODETTE', 'SAM', 'IRIS', 'TOBY', 'NOOR'];
    const text = { number: `BERTH ${String(Math.floor(random() * 90 + 10))}`, wake: 'DO NOT WAKE', fragile: 'FRAGILE', name: names[Math.floor(random() * names.length)], return: 'RETURN TO SENDER' }[a.stencil];
    const ink = a.stencil === 'name' ? '#c8322b' : a.style === 'clinical' || a.style === 'budget' ? '#27303a' : '#e9e2c8';
    const plate = s.label(text, 0.62, 0.2, [-L / 2 + 0.62, top + 0.004, round ? 0 : -0.14], ink, a.style === 'brass' ? '#6a4526' : lidColour);
    plate.rotation.x = -Math.PI / 2;
    plate.rotation.z = a.stencil === 'name' ? (random() - 0.5) * 0.25 : 0;
    roll.add(plate);
    if (round) add(new THREE.BoxGeometry(0.66, 0.03, 0.24), a.style === 'brass' ? tub : lid, [-L / 2 + 0.62, top - 0.012, 0]);

    // What was left behind: on the near shoulder of the lid, clear of the panel and the lettering.
    const perch = new THREE.Group();
    if (round) { perch.position.set(-L / 2 + 0.62, FLAT * R * 0.694, R * 0.72); perch.rotation.x = 0.705; } else perch.position.set(-L / 2 + 0.62, top, 0.27);
    roll.add(perch);
    if (a.left === 'flowers') {
      const bunch = new THREE.Group();
      bunch.position.set(0, 0.02, 0);
      bunch.rotation.y = 0.5 + random() * 0.6;
      perch.add(bunch);
      const stem = s.material('#4d7a45'), petals = ['#f2e9dc', '#e58aa2', '#f1c84b', '#b9a6e8'].map((c) => s.material(new THREE.Color(c).lerp(new THREE.Color('#8a7a5c'), mood.wear * 0.5)));
      for (let i = 0; i < 7; i++) {
        const z = (i - 3) * 0.022, lift = 0.02 + random() * 0.03;
        const rod = s.rod([-0.16, 0.01, z * 0.3], [0.14, lift, z], 0.006, stem); bunch.add(rod);
        add(new THREE.IcosahedronGeometry(0.03 + random() * 0.014, 1), petals[i % petals.length], [0.16, lift + 0.01, z * 1.2], bunch).scale.y = 0.7;
      }
      add(new THREE.BoxGeometry(0.06, 0.012, 0.2), s.material('#d9d2b8', { roughness: 0.9 }), [-0.08, 0.02, 0], bunch);
    } else if (a.left === 'drawing') {
      const page = document.createElement('canvas'); page.width = 160; page.height = 120;
      const c = page.getContext('2d')!;
      c.fillStyle = '#f6f1e3'; c.fillRect(0, 0, 160, 120);
      c.fillStyle = '#f2c230'; c.beginPath(); c.arc(130, 26, 15, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#3f8f4f'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 104); c.lineTo(160, 100); c.stroke();
      [[40, '#c8322b', 44], [72, '#2f5fae', 30], [98, '#7a4ea0', 20]].forEach(([x, col, h]) => { c.strokeStyle = col as string; c.lineWidth = 4; const X = x as number, Hh = h as number; c.beginPath(); c.arc(X, 96 - Hh - 8, 8, 0, Math.PI * 2); c.moveTo(X, 96 - Hh); c.lineTo(X, 86); c.moveTo(X - 10, 96 - Hh * 0.7); c.lineTo(X + 10, 96 - Hh * 0.7); c.moveTo(X, 86); c.lineTo(X - 7, 100); c.moveTo(X, 86); c.lineTo(X + 7, 100); c.stroke(); });
      const tex = new THREE.CanvasTexture(page); tex.colorSpace = THREE.SRGBColorSpace;
      const sheet = add(new THREE.PlaneGeometry(0.3, 0.225), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }), [0, 0.012, 0], perch);
      sheet.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.5);
      for (const dx of [-0.13, 0.13]) add(new THREE.BoxGeometry(0.06, 0.006, 0.025), s.material('#cfc8a8'), [dx, 0.016, -0.1], perch);
    } else if (a.left === 'hoses') {
      const rubber = [s.material('#2b2e33'), s.material('#b03a30'), s.material('#3b6ea8')];
      for (let i = 0; i < 3; i++) {
        const z = (i - 1) * 0.12, y = i === 1 ? -0.1 : 0.08;
        const pts = [[foot, y, z], [foot - 0.25, y + (random() - 0.5) * 0.2, z * 1.6], [foot - 0.5, y + (random() - 0.5) * 0.5, z * 2 + (random() - 0.5) * 0.3], [foot - 0.62 - random() * 0.25, y + (random() - 0.5) * 0.7, z * 2 + (random() - 0.5) * 0.5]].map((p) => new THREE.Vector3(...(p as V3)));
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.028, 7), rubber[i]);
        add(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 8), steel, pts[3].toArray() as V3).rotation.set(random() * 3, 0, random() * 3);
      }
    } else if (a.left === 'counter') {
      const digits = `${Math.floor(random() * 900 + 100)}:${Math.floor(random() * 50 + 10)}:${Math.floor(random() * 50 + 10)}`;
      const readout = s.label(digits, 0.42, 0.12, [0, 0.03, 0], '#ff6a3a', '#140a08');
      readout.rotation.x = -Math.PI / 2;
      (readout.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#ffffff');
      (readout.material as THREE.MeshStandardMaterial).emissiveMap = (readout.material as THREE.MeshStandardMaterial).map;
      (readout.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.1;
      perch.add(readout);
      add(new THREE.BoxGeometry(0.46, 0.05, 0.16), dark, [0, 0.002, 0], perch);
    }

    // Rime on the lid, heavier when the scene is cold and old.
    const rimeCount = Math.round(mix(8, 70, (1 - mood.warmth) * 0.6 + mood.wear * 0.4));
    const rime = Array.from({ length: rimeCount }, () => {
      const x = (random() < 0.6 ? wx + (random() - 0.5) * 0.9 : (random() - 0.5) * (L - 0.5)), z = (random() - 0.5) * (round ? R * 1.9 : 0.78);
      const y = round ? FLAT * Math.sqrt(Math.max(0, R * R - z * z)) : 0.3;
      return { at: [x, y, z] as V3, size: 0.008 + random() ** 2 * 0.022 };
    });
    const ice = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#f1f7fb', roughness: 0.4, flatShading: true }), rime);
    roll.add(ice);

    // Lid turned a little toward the viewer; then end over end if it tumbles.
    roll.rotation.x = 0.55;
    pod.rotation.set(0, 0.45 + (random() - 0.5) * 0.5, a.tumbling ? 0.55 + random() * 0.5 : (random() - 0.5) * 0.08);
    const rate = a.tumbling ? mix(0.05, 0.6, mood.energy) : 0;
    let clock = random() * 2;
    return s.finish({
      update: (dt) => {
        pod.rotation.z += dt * rate;
        clock += dt;
        if (a.light === 'red') lamp.emissiveIntensity = clock % 1.4 < 0.5 ? 3.2 : 0.15;
        if (a.light === 'amber') lamp.emissiveIntensity = 1.8 + Math.sin(clock * 2) * 0.6;
      },
    });
  },
});
