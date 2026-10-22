import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { HUMAN, faceEllipse, faceLine, facePoint, headGeometry, paint, part, rod, tube, type HeadSpec } from './head';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const GLOW = { cyan: '#35e0ff', amber: '#ffae2a', red: '#ff3524', white: '#f2f6ff', green: '#4dff7c', violet: '#b06bff' } as const;

export default defineThing({
  questions: {
    open: choice('How far is the head opened up?', {
      cheek: 'Just one cheek panel swung ajar on its hinge, the rest of the face intact.',
      visor: 'The whole face plate swung wide on a side hinge like a door, mechanism bare beneath.',
      removed: 'The face lifted off completely and set down beside the stand, looking up.',
      cap: 'The skull cap removed, electronics exposed on top, the face still on.',
      all: 'Face off and skull cap off: a bare mechanical skull with the shells laid by.',
    }),
    skin: choice('What is its skin?', {
      ceramic: 'A glossy white ceramic shell with fine panel seams.',
      silicone: 'Lifelike silicone skin with lips, brows and a faint flush.',
      metal: 'Brushed bare metal, industrial.',
      cracked: 'White shell crazed with cracks and a chip missing.',
      black: 'Matte black carbon composite with thin luminous seams.',
    }),
    expression: choice('What expression is on the synthetic face?', {
      serene: 'Serene: mouth closed, eyes level, perfectly calm.',
      speaking: 'Caught mid-speech, lips parted on a word.',
      tracking: 'One eye turned to follow you while the other stays ahead.',
      asleep: 'Lids lowered, shut down in something like sleep.',
    }),
    glow: choice('What colour do its eyes and indicators glow?', {
      cyan: 'Cool cyan.', amber: 'Warm amber.', red: 'Warning red.', white: 'Clinical white.', green: 'Terminal green.', violet: 'Soft violet.',
    }),
    status: choice('What is its status?', {
      booting: 'Booting: indicator racing, eyes flickering up.',
      awaiting: 'Awaiting a part: one eye lens missing, a tag tied on, a loose connector hanging.',
      decommissioned: 'Decommissioned: dark, a red strap across the brow, dust settling.',
      running: 'Running diagnostics: steady light, a cable plugged into the temple.',
    }),
    stand: choice('What holds it?', {
      clamp: 'A lab neck clamp on a steel post and heavy round base.',
      vice: 'A workshop bench vice gripping the neck stump.',
      cradle: 'A padded service cradle with a status ring around the collar.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const o: HeadSpec = { ...HUMAN, nose: 0.019, socket: 0.009, jaw: 0.44 };
    const wear = mood.wear;
    const glowHex = GLOW[a.glow];
    const dead = a.status === 'decommissioned';
    const power = dead ? 0.06 : a.expression === 'asleep' ? 0.35 : 1;
    const faceOff = a.open === 'removed' || a.open === 'all';
    const capOff = a.open === 'cap' || a.open === 'all';

    const skinHex = { ceramic: '#f1f0ec', silicone: ['#e8b896', '#c98f66', '#8a5a3c', '#f0cdb4'][Math.floor(random() * 4)], metal: '#aeb3b6', cracked: '#eceae2', black: '#1f2023' }[a.skin];
    const W = 1024, Hc = 512;
    const skinMap = paint(W, Hc, (c) => {
      c.fillStyle = skinHex; c.fillRect(0, 0, W, Hc);
      if (a.skin === 'metal') for (let i = 0; i < 500; i++) { c.strokeStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,45,50'},0.12)`; c.lineWidth = 1; const y = random() * Hc; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + (random() - 0.5) * 6); c.stroke(); }
      const seam = a.skin === 'black' ? glowHex : a.skin === 'silicone' ? 'rgba(90,50,40,0.25)' : 'rgba(50,55,60,0.6)';
      // Eye apertures.
      for (const side of [-1, 1]) { c.fillStyle = '#0b0c0e'; faceEllipse(c, o, side * o.eyeX, o.eyeY, 0.0135, a.expression === 'asleep' ? 0.0035 : 0.0085); c.fill(); }
      if (a.skin === 'silicone') {
        c.strokeStyle = 'rgba(60,40,30,0.85)'; c.lineWidth = 5; c.lineCap = 'round';
        for (const side of [-1, 1]) { faceLine(c, o, [[side * 0.017, o.eyeY + 0.02], [side * 0.031, o.eyeY + 0.024], [side * 0.046, o.eyeY + 0.02]]); c.stroke(); }
        for (const side of [-1, 1]) { c.fillStyle = 'rgba(210,90,80,0.16)'; faceEllipse(c, o, side * 0.04, -0.03, 0.016, 0.012); c.fill(); }
      }
      // Mouth.
      const my = o.eyeY - 0.07;
      const lip = a.skin === 'silicone' ? 'rgba(160,70,70,0.9)' : a.skin === 'black' ? '#34363a' : 'rgba(120,125,130,0.55)';
      c.fillStyle = lip; faceEllipse(c, o, 0, my, 0.02, a.expression === 'speaking' ? 0.0085 : 0.0048); c.fill();
      if (a.expression === 'speaking') { c.fillStyle = '#0d0d10'; faceEllipse(c, o, 0, my, 0.012, 0.0048); c.fill(); }
      else { c.strokeStyle = 'rgba(20,20,25,0.7)'; c.lineWidth = 2; faceLine(c, o, [[-0.019, my + 0.0005], [0, my - 0.0005], [0.019, my + 0.0005]]); c.stroke(); }
      // Panel seams.
      c.strokeStyle = seam; c.lineWidth = a.skin === 'black' ? 2.5 : 2;
      for (const side of [-1, 1]) {
        faceLine(c, o, [[side * 0.014, -0.1], [side * 0.022, -0.062], [side * 0.05, -0.04], [side * 0.058, 0.0]]); c.stroke();
        faceLine(c, o, [[side * 0.006, 0.09], [side * 0.008, 0.04], [side * 0.012, 0.03]]); c.stroke();
      }
      c.fillStyle = a.skin === 'black' ? '#8a8f96' : 'rgba(40,45,50,0.7)'; c.font = 'bold 13px monospace';
      const [tx, ty] = [0.25 * W + 46, Math.acos(0.07 / o.H) / Math.PI * Hc];
      c.fillText(`U-${100 + Math.floor(random() * 899)}`, tx, ty);
      if (a.skin === 'cracked') {
        c.strokeStyle = 'rgba(40,36,30,0.85)';
        for (let n = 0; n < 9; n++) {
          let x = (0.08 + random() * 0.34) * W, y = (0.15 + random() * 0.7) * Hc; c.lineWidth = 1 + random() * 1.6; c.beginPath(); c.moveTo(x, y);
          let dir = random() * 6.28;
          for (let k = 0; k < 14; k++) { dir += (random() - 0.5) * 1.2; x += Math.cos(dir) * 16; y += Math.sin(dir) * 12; c.lineTo(x, y); if (random() < 0.2) { c.lineTo(x + (random() - 0.5) * 40, y + (random() - 0.5) * 30); c.moveTo(x, y); } }
          c.stroke();
        }
        c.fillStyle = '#3a3c40'; const cx = (0.3 + random() * 0.1) * W, cy = (0.55 + random() * 0.1) * Hc; c.beginPath();
        for (let k = 0; k < 7; k++) { const t = k / 7 * 6.28; c.lineTo(cx + Math.cos(t) * (14 + random() * 16), cy + Math.sin(t) * (12 + random() * 14)); } c.fill();
      }
      for (let i = 0; i < (wear + (dead ? 0.5 : 0)) * 50; i++) { c.fillStyle = `rgba(60,52,44,${0.05 + random() * 0.1})`; c.beginPath(); c.arc(random() * W, random() * Hc, 5 + random() * 26, 0, 7); c.fill(); }
    });
    const emissiveSeams = a.skin === 'black';
    const skin = new THREE.MeshStandardMaterial({
      map: skinMap, side: THREE.DoubleSide,
      roughness: Math.min(1, { ceramic: 0.16, silicone: 0.6, metal: 0.38, cracked: 0.4, black: 0.7 }[a.skin] + wear * 0.3),
      metalness: a.skin === 'metal' ? 0.65 : 0,
      ...(emissiveSeams ? { emissive: new THREE.Color(glowHex), emissiveMap: skinMap, emissiveIntensity: 0.5 * power } : {}),
    });
    const chassis = new THREE.MeshStandardMaterial({ color: '#33373c', metalness: 0.6, roughness: 0.45 });
    const steel = new THREE.MeshStandardMaterial({ color: '#aab0b4', metalness: 0.8, roughness: 0.3 + wear * 0.3 });
    const black = new THREE.MeshStandardMaterial({ color: '#141517', roughness: 0.5 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a04a', metalness: 0.8, roughness: 0.3 });
    const glow = new THREE.MeshStandardMaterial({ color: glowHex, emissive: glowHex, emissiveIntensity: 2 * power });
    const status = new THREE.MeshStandardMaterial({ color: dead ? '#5a1a14' : glowHex, emissive: dead ? '#ff2010' : glowHex, emissiveIntensity: dead ? 0.3 : 2 });

    // Stand.
    const neckR = 0.036;
    let neckBottom = 0.13;
    if (a.stand === 'clamp') {
      part(s.root, new THREE.CylinderGeometry(0.1, 0.11, 0.022, 36), black, 0, 0.011, 0);
      part(s.root, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 14), steel, 0, 0.12, -0.07);
      part(s.root, new THREE.BoxGeometry(0.03, 0.03, 0.03), black, 0, 0.165, -0.07);
      part(s.root, new THREE.BoxGeometry(0.02, 0.02, 0.05), steel, 0, 0.165, -0.048);
      for (const side of [-1, 1]) {
        const jaw = part(s.root, new THREE.TorusGeometry(neckR + 0.008, 0.008, 8, 20, Math.PI * 0.9), steel, 0, 0.165, 0);
        jaw.rotation.set(Math.PI / 2, 0, side > 0 ? -Math.PI / 2 + 0.15 : Math.PI / 2 + 0.15);
      }
      rod(s.root, V(neckR + 0.012, 0.165, 0.03), V(neckR + 0.05, 0.165, 0.04), 0.004, steel);
      part(s.root, new THREE.BoxGeometry(0.008, 0.03, 0.01), black, neckR + 0.052, 0.165, 0.041);
    } else if (a.stand === 'vice') {
      const iron = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2e5a8a').lerp(new THREE.Color('#5a4a3a'), wear * 0.6), roughness: 0.6, metalness: 0.3 });
      part(s.root, new THREE.BoxGeometry(0.2, 0.02, 0.13), iron, 0, 0.01, 0);
      part(s.root, new THREE.BoxGeometry(0.07, 0.09, 0.09), iron, 0, 0.06, 0);
      for (const side of [-1, 1]) { part(s.root, new THREE.BoxGeometry(0.022, 0.07, 0.1), iron, side * (neckR + 0.012), 0.135, 0); part(s.root, new THREE.BoxGeometry(0.006, 0.03, 0.1), steel, side * (neckR + 0.002), 0.155, 0); }
      rod(s.root, V(neckR + 0.02, 0.115, 0), V(0.17, 0.115, 0), 0.008, steel);
      rod(s.root, V(0.165, 0.06, 0), V(0.165, 0.17, 0), 0.004, steel);
      for (const y of [0.06, 0.17]) part(s.root, new THREE.SphereGeometry(0.008, 10, 8), steel, 0.165, y, 0);
    } else {
      const pad = new THREE.MeshStandardMaterial({ color: '#3a3f46', roughness: 0.95 });
      part(s.root, new THREE.CylinderGeometry(0.085, 0.1, 0.05, 32), new THREE.MeshStandardMaterial({ color: '#e6e7e4', roughness: 0.35 }), 0, 0.025, 0);
      part(s.root, new THREE.CylinderGeometry(0.06, 0.075, 0.09, 28), pad, 0, 0.09, 0);
      part(s.root, new THREE.TorusGeometry(0.064, 0.006, 8, 40), status, 0, 0.138, 0).rotation.x = Math.PI / 2;
      part(s.root, new THREE.TorusGeometry(0.086, 0.004, 8, 40), status, 0, 0.05, 0).rotation.x = Math.PI / 2;
    }
    // Neck: skin sleeve above, exposed vertebra rings below, cables out of the stump.
    const headY = 0.335;
    part(s.root, new THREE.CylinderGeometry(neckR, neckR * 1.05, 0.07, 24), skin.clone(), 0, headY - 0.125, -0.004).material = new THREE.MeshStandardMaterial({ color: skinHex, roughness: skin.roughness, metalness: skin.metalness });
    for (let i = 0; i < 5; i++) part(s.root, new THREE.CylinderGeometry(neckR * 0.9, neckR * 0.9, 0.012, 20), i % 2 ? steel : chassis, 0, neckBottom + 0.008 + i * 0.013, -0.004);
    if (a.stand !== 'cradle') {
      const cols = ['#d8402c', '#f2c230', '#2f5fa8', '#e8e2d4', '#2a2a2e'];
      for (let i = 0; i < 5; i++) {
        const ang = random() * 6.28, r0 = random() * 0.02, out = 0.05 + random() * 0.07;
        tube(s.root, [V(Math.cos(ang) * r0, neckBottom, Math.sin(ang) * r0 - 0.004), V(Math.cos(ang) * r0 * 1.5, neckBottom - 0.05, Math.sin(ang) * r0), V(Math.cos(ang) * out * 0.6, 0.035, -0.02 + Math.sin(ang) * out * 0.5), V(Math.cos(ang) * out, 0.026, -0.03 - Math.abs(Math.sin(ang)) * out)], 0.0022, new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.6 }));
      }
    }
    // Status light on the collar.
    const led = part(s.root, new THREE.SphereGeometry(0.006, 10, 8), status, 0, headY - 0.15, neckR + 0.002);
    part(s.root, new THREE.TorusGeometry(neckR + 0.003, 0.004, 6, 24), black, 0, headY - 0.15, -0.004).rotation.x = Math.PI / 2;

    // Head: inner mechanical skull.
    const head = new THREE.Group(); head.position.set(0, headY, 0); s.root.add(head);
    head.rotation.y = (random() - 0.5) * 0.2;
    const inner: HeadSpec = { ...o, nose: 0.004, lips: 0, chin: 0.003, brow: 0.002, socket: 0.014 };
    part(head, headGeometry(inner, 0, Math.PI * 2, 0, Math.PI, 0.86), chassis);
    // Jaw bar, teeth-like speaker grille, nose cavity, cheek actuators.
    const jawDrop = a.expression === 'speaking' ? 0.012 : 0;
    const mouthP = facePoint(inner, 0, o.eyeY - 0.07, 0.86);
    part(head, new THREE.BoxGeometry(0.044, 0.016, 0.01), black, 0, mouthP.y - jawDrop * 0.5, mouthP.z + 0.002);
    for (let i = 0; i < 9; i++) part(head, new THREE.BoxGeometry(0.0025, 0.014 + jawDrop, 0.004), steel, (i - 4) * 0.0048, mouthP.y - jawDrop * 0.5, mouthP.z + 0.008);
    const noseP = facePoint(inner, 0, o.eyeY - 0.03, 0.86);
    const noseHole = part(head, new THREE.ConeGeometry(0.008, 0.018, 3), black, 0, noseP.y, noseP.z + 0.002); noseHole.rotation.y = Math.PI; noseHole.scale.z = 0.4;
    for (const side of [-1, 1]) {
      const top = facePoint(inner, side * 0.045, o.eyeY - 0.012, 0.88), bottom = facePoint(inner, side * 0.026, o.eyeY - 0.085 - jawDrop, 0.9);
      rod(head, top, bottom.clone().lerp(top, 0.45), 0.0055, brass, 12);
      rod(head, top.clone().lerp(bottom, 0.5), bottom, 0.0028, steel);
      part(head, new THREE.SphereGeometry(0.005, 8, 6), steel, top.x, top.y, top.z);
      part(head, new THREE.SphereGeometry(0.005, 8, 6), steel, bottom.x, bottom.y, bottom.z);
      const b1 = facePoint(inner, side * 0.02, o.eyeY + 0.03, 0.88), b2 = facePoint(inner, side * 0.05, o.eyeY + 0.024, 0.88);
      rod(head, b1, b2, 0.003, brass);
      // Temple wiring loom.
      const cols = ['#d8402c', '#f2c230', '#2f5fa8'];
      for (let k = 0; k < 3; k++) tube(head, [facePoint(inner, side * 0.05, o.eyeY + 0.006 + k * 0.004, 0.88), V(side * (0.066 - k * 0.001), o.eyeY - 0.02 - k * 0.004, 0.03), V(side * 0.058, -0.06, 0.02 - k * 0.004), V(side * 0.03, -0.1, 0.0)], 0.0016, new THREE.MeshStandardMaterial({ color: cols[k], roughness: 0.6 }));
    }
    for (let i = 0; i < 6; i++) { const bp = facePoint(inner, (i % 2 ? 1 : -1) * (0.012 + (i >> 1) * 0.02), 0.05 + (i >> 1) * 0.012, 0.865); part(head, new THREE.CylinderGeometry(0.0028, 0.0028, 0.003, 6), steel, bp.x, bp.y, bp.z).rotation.x = Math.PI / 2; }

    // Lens eyes.
    const missingEye = a.status === 'awaiting' ? (random() < 0.5 ? -1 : 1) : 0;
    const eyeGroups: THREE.Group[] = [];
    const eyeMats: THREE.MeshStandardMaterial[] = [];
    for (const side of [-1, 1]) {
      const surf = facePoint(o, side * o.eyeX, o.eyeY);
      const eg = new THREE.Group(); eg.position.set(side * o.eyeX, o.eyeY, surf.z - 0.02); head.add(eg);
      part(eg, new THREE.CylinderGeometry(0.016, 0.016, 0.012, 20), black, 0, 0, -0.012).rotation.x = Math.PI / 2;
      if (side === missingEye) {
        tube(head, [V(side * o.eyeX, o.eyeY, surf.z - 0.02), V(side * o.eyeX * 1.1, o.eyeY - 0.02, surf.z + 0.012), V(side * o.eyeX * 1.2, o.eyeY - 0.05, surf.z + 0.01)], 0.0018, new THREE.MeshStandardMaterial({ color: '#d8402c', roughness: 0.6 }));
        part(head, new THREE.BoxGeometry(0.007, 0.01, 0.005), new THREE.MeshStandardMaterial({ color: '#e8e2d4' }), side * o.eyeX * 1.2, o.eyeY - 0.054, surf.z + 0.01);
        continue;
      }
      const m = glow.clone(); eyeMats.push(m);
      const barrel = part(eg, new THREE.CylinderGeometry(0.0125, 0.0135, 0.026, 24), black, 0, 0, 0.008); barrel.rotation.x = Math.PI / 2;
      for (const z of [0.004, 0.012]) part(eg, new THREE.TorusGeometry(0.0132, 0.0012, 6, 24), steel, 0, 0, z);
      part(eg, new THREE.TorusGeometry(0.0082, 0.0028, 8, 24), m, 0, 0, 0.021);
      const glass = part(eg, new THREE.SphereGeometry(0.0085, 16, 10), new THREE.MeshStandardMaterial({ color: '#0a1016', roughness: 0.05, metalness: 0.4 }), 0, 0, 0.017); glass.scale.z = 0.6;
      part(eg, new THREE.SphereGeometry(0.0028, 8, 6), m, 0, 0, 0.0225);
      if (a.expression === 'tracking' && side === (missingEye === 1 ? -1 : 1)) eg.rotation.set(-0.12, 0.5, 0);
      eyeGroups.push(eg);
    }

    // Skull-top electronics.
    const brainY = o.H * 0.86 * 0.78;
    const brain = new THREE.Group(); brain.position.set(0, brainY, -0.006); head.add(brain);
    part(brain, new THREE.CylinderGeometry(0.052, 0.058, 0.012, 24), black, 0, 0.004, 0);
    part(brain, new THREE.BoxGeometry(0.06, 0.003, 0.05), new THREE.MeshStandardMaterial({ color: '#1f7a48', roughness: 0.5 }), 0, 0.013, 0);
    part(brain, new THREE.BoxGeometry(0.022, 0.006, 0.022), black, -0.008, 0.017, 0);
    for (let i = 0; i < 5; i++) part(brain, new THREE.BoxGeometry(0.004, 0.012, 0.03), steel, 0.012 + i * 0.006, 0.02, 0);
    const brainLeds: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) brainLeds.push(part(brain, new THREE.SphereGeometry(0.0025, 6, 5), glow, -0.024 + i * 0.006, 0.016, 0.02));

    // Outer shells.
    const F0 = Math.PI / 2 - 1.08, FL = 2.16, T0 = 0.62, T1 = 2.78;
    const shells = new THREE.Group(); head.add(shells);
    part(shells, headGeometry(o, F0 + FL, Math.PI * 2 - FL, T0, Math.PI - T0), skin);
    part(shells, headGeometry(o, F0, FL, T1, Math.PI - T1), skin);
    const capGeo = headGeometry(o, 0, Math.PI * 2, 0, T0);
    if (!capOff) part(shells, capGeo, skin);
    const lay = (geo: THREE.BufferGeometry, x: number, z: number, lift: number, rx: number, ry: number) => {
      const g = new THREE.Group(); const m = part(g, geo, skin);
      geo.computeBoundingBox(); const bb = geo.boundingBox!;
      m.position.set(0, -(bb.min.y + bb.max.y) / 2, -bb.min.z);
      g.rotation.set(rx, ry, 0, 'YXZ'); g.position.set(x, lift, z);
      s.root.add(g);
    };
    if (capOff) lay(capGeo, -0.16, 0.08, 0.035, Math.PI * 0.5 + 0.2, random() * 2);
    if (a.open === 'cheek') {
      const split = Math.PI / 2 + 0.3, cheekT = 1.5;
      part(shells, headGeometry(o, F0, split - F0, T0, T1 - T0, 1.012), skin);
      part(shells, headGeometry(o, split, F0 + FL - split, T0, cheekT - T0, 1.012), skin);
      const edge = new THREE.Vector3(o.W * Math.sin(1.08) * 0.93, -0.03, o.D * Math.cos(1.08) * 0.9);
      const hinge = new THREE.Group(); hinge.position.copy(edge); shells.add(hinge);
      const panel = part(hinge, headGeometry(o, split, F0 + FL - split, cheekT, T1 - cheekT, 1.012), skin); panel.position.copy(edge).negate();
      hinge.rotation.y = mix(0.75, 1.15, random());
      for (const y of [0.0, -0.05]) part(shells, new THREE.CylinderGeometry(0.003, 0.003, 0.014, 8), steel, edge.x + 0.001, y - 0.005, edge.z);
    } else {
      const faceGeo = headGeometry(o, F0, FL, T0, T1 - T0, 1.012);
      if (!faceOff && a.open !== 'visor') part(shells, faceGeo, skin);
      else if (a.open === 'visor') {
        const pivot = V(-o.W * Math.sin(1.08) * 0.97, 0, o.D * Math.cos(1.08) * 0.95);
        const hinge = new THREE.Group(); hinge.position.copy(pivot); shells.add(hinge);
        part(hinge, faceGeo, skin).position.copy(pivot).negate();
        hinge.rotation.y = -mix(1.5, 2.0, random());
        for (const y of [0.04, -0.03]) part(shells, new THREE.CylinderGeometry(0.004, 0.004, 0.018, 8), steel, pivot.x - 0.002, y, pivot.z);
      } else lay(faceGeo, 0.17, 0.09, 0.008, -Math.PI / 2 + 0.28, -0.5 + random() * 0.4);
    }

    // Status dressing.
    if (a.status === 'awaiting') {
      const tag = s.label(['PART ON ORDER', 'AWAITING L-EYE', 'HOLD FOR PARTS'][Math.floor(random() * 3)], 0.075, 0.04, [-0.07, headY - 0.2, 0.05], '#2a2622', '#e8d9a8');
      tag.rotation.set(-0.2, 0.3, 0.12);
      rod(s.root, V(-0.035, headY - 0.15, 0.015), V(-0.06, headY - 0.182, 0.048), 0.0008, black, 4);
    } else if (dead) {
      const strap = part(head, headGeometry(o, F0 - 0.3, FL + 0.6, 0.95, 0.22, 1.03), new THREE.MeshStandardMaterial({ color: '#c8281e', roughness: 0.7, side: THREE.DoubleSide }));
      strap.visible = !faceOff && a.open !== 'visor';
      const tag = s.label('DECOMMISSIONED', 0.11, 0.035, [0.02, headY - 0.185, neckR + 0.022], '#f4efe0', '#c8281e');
      tag.rotation.set(-0.15, 0, -0.06);
    } else if (a.status === 'running') {
      part(head, new THREE.BoxGeometry(0.012, 0.012, 0.018), black, -0.07, 0.01, -0.01);
      tube(s.root, [V(-0.08, headY + 0.01, -0.01), V(-0.14, headY - 0.03, 0), V(-0.17, 0.1, 0.03), V(-0.16, 0.012, 0.09), V(-0.1, 0.008, 0.15)], 0.004, new THREE.MeshStandardMaterial({ color: '#e8e8e4', roughness: 0.5 }));
    }

    const rate = mix(1.2, 5, mood.energy) * (a.status === 'booting' ? 2.2 : 1);
    const base = mix(1.0, 2.6, mood.energy) * power;
    return s.finish({
      update: (_dt, time) => {
        if (dead) { status.emissiveIntensity = 0.25 + 0.1 * Math.sin(time * 0.8); return; }
        const pulse = 0.5 + 0.5 * Math.sin(time * rate);
        status.emissiveIntensity = 0.6 + 2 * (a.status === 'booting' ? (pulse > 0.5 ? 1 : 0.1) : pulse);
        led.scale.setScalar(0.9 + 0.2 * pulse);
        eyeMats.forEach((m, i) => {
          const flick = a.status === 'booting' ? (Math.sin(time * 23 + i * 5) > 0.2 ? 1 : 0.25) : 0.8 + 0.2 * Math.sin(time * rate * 0.5 + i);
          m.emissiveIntensity = base * flick;
        });
        glow.emissiveIntensity = base * (0.6 + 0.4 * Math.sin(time * rate * 1.7));
        if (a.expression === 'tracking' && eyeGroups.length) eyeGroups[eyeGroups.length - 1].rotation.y = 0.35 + 0.25 * Math.sin(time * 0.7);
      },
    });
  },
});
