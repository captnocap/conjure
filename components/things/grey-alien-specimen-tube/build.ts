import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { HUMAN, facePoint, headGeometry, paint, part, rod, tube, type HeadSpec } from './head';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const FLUID = { green: '#58e07a', amber: '#f0b23a', blue: '#4ab8f0', pink: '#f07ab0', clear: '#cfe8ee', murky: '#7a8a4a' } as const;

export default defineThing({
  questions: {
    state: choice('What state is the specimen in?', {
      asleep: 'Floating asleep, eyes closed, limbs slack.',
      watching: 'Eyes open, head turned, watching you.',
      hand: 'Awake with one long-fingered hand pressed flat to the glass.',
      curled: 'Curled up small, knees drawn to its chest.',
      escaped: 'The tube is cracked and empty, fluid drained to a puddle, wet footprints leading away.',
    }),
    fluid: choice('What colour is the fluid?', {
      green: 'Luminous green.', amber: 'Formaldehyde amber.', blue: 'Cold cryo blue.', pink: 'Unsettling pink.', clear: 'Nearly clear.', murky: 'Murky olive, long unchanged.',
    }),
    base: choice('What style is the base?', {
      military: '1947 military: olive steel drum, rivets, a pressure gauge and valve wheel, a stencilled serial.',
      lab: 'A sleek white laboratory pod with a glowing ring and a small readout.',
      carnival: 'A carnival sideshow fake: painted red and yellow box, light bulbs, and the alien is a rubber suit with a visible zip.',
      brass: 'Victorian brass and mahogany, a cabinet of curiosities piece.',
    }),
    label: choice('What does the label on the base say?', {
      specimen: 'SPECIMEN 7', roswell: 'ROSWELL 1947', tap: 'DO NOT TAP GLASS', usaf: 'PROPERTY USAF', live: 'LIVE ALIEN 25¢', unknown: 'ORIGIN UNKNOWN',
    }),
    bubbles: score('How much is the fluid bubbling?', ['Perfectly still', 'An occasional bubble', 'A steady stream', 'Churning']),
    fittings: choice('What is fitted around the tube?', {
      bare: 'Nothing, clean glass.',
      hoses: 'Ribbed hoses running from the cap down to the base.',
      chains: 'Chains wrapped around it and padlocked.',
      frost: 'Frost creeping up the glass from a cold collar.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const R = 0.21, tubeH = 0.92;
    const fluidHex = FLUID[a.fluid];
    const escaped = a.state === 'escaped';
    const fake = a.base === 'carnival';
    const steel = new THREE.MeshStandardMaterial({ color: '#a4aaae', metalness: 0.8, roughness: 0.3 + wear * 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.6 });
    const baseHex = { military: '#5d6a45', lab: '#eef0ee', carnival: '#c8281e', brass: '#5a3320' }[a.base];
    const baseM = new THREE.MeshStandardMaterial({ color: new THREE.Color(baseHex).lerp(new THREE.Color('#6a5a48'), wear * 0.3), roughness: a.base === 'lab' ? 0.3 : 0.65, metalness: a.base === 'military' ? 0.4 : 0 });
    const trim = a.base === 'brass' ? new THREE.MeshStandardMaterial({ color: '#c9a04a', metalness: 0.85, roughness: 0.3 }) : a.base === 'carnival' ? new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.5 }) : steel;
    const glowM = new THREE.MeshStandardMaterial({ color: fluidHex, emissive: fluidHex, emissiveIntensity: mix(0.6, 2.2, mood.energy) });

    // Base.
    const baseH = a.base === 'lab' ? 0.2 : 0.26;
    const bulbs: THREE.MeshStandardMaterial[] = [];
    if (a.base === 'carnival' || a.base === 'brass') {
      part(s.root, new THREE.BoxGeometry(0.56, baseH, 0.56), baseM, 0, baseH / 2, 0);
      part(s.root, new THREE.BoxGeometry(0.6, 0.03, 0.6), trim, 0, 0.015, 0);
      part(s.root, new THREE.BoxGeometry(0.6, 0.03, 0.6), trim, 0, baseH - 0.015, 0);
      if (fake) for (let i = 0; i < 7; i++) {
        const m = new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffcf50', emissiveIntensity: 1.5 }); bulbs.push(m);
        part(s.root, new THREE.SphereGeometry(0.018, 10, 8), m, -0.24 + i * 0.08, baseH - 0.05, 0.29);
      } else for (const x of [-1, 1]) part(s.root, new THREE.CylinderGeometry(0.02, 0.02, baseH - 0.06, 12), trim, x * 0.26, baseH / 2, 0.26);
    } else if (a.base === 'military') {
      part(s.root, new THREE.CylinderGeometry(0.29, 0.31, baseH, 12), baseM, 0, baseH / 2, 0);
      for (const y of [0.03, baseH - 0.03]) part(s.root, new THREE.TorusGeometry(0.3, 0.012, 6, 12), steel, 0, y, 0).rotation.x = Math.PI / 2;
      const rivets = [] as { at: readonly [number, number, number]; size: number }[];
      for (let i = 0; i < 24; i++) { const t = i / 24 * 6.283; rivets.push({ at: [Math.cos(t) * 0.297, baseH - 0.07, Math.sin(t) * 0.297], size: 0.008 }); }
      s.scatter(new THREE.SphereGeometry(1, 6, 4), steel, rivets);
      // Gauge and valve wheel on the camera side.
      const g = new THREE.Group(); g.position.set(0.27, baseH * 0.55, 0.13); g.rotation.y = 1.1; s.root.add(g);
      part(g, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20), steel).rotation.x = Math.PI / 2;
      const dial = paint(128, 128, (c) => { c.fillStyle = '#f1ead6'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 4; for (let i = 0; i < 9; i++) { const t = Math.PI * (0.8 + i * 0.175); c.beginPath(); c.moveTo(64 + Math.cos(t) * 44, 64 + Math.sin(t) * 44); c.lineTo(64 + Math.cos(t) * 56, 64 + Math.sin(t) * 56); c.stroke(); } const n = Math.PI * (0.9 + random() * 1.2); c.strokeStyle = '#c8281e'; c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(n) * 46, 64 + Math.sin(n) * 46); c.stroke(); });
      part(g, new THREE.CircleGeometry(0.04, 20), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.4 }), 0, 0, 0.016);
      const wheel = part(s.root, new THREE.TorusGeometry(0.05, 0.008, 6, 20), new THREE.MeshStandardMaterial({ color: '#b02a1e', roughness: 0.6 }), -0.2, baseH * 0.5, 0.25); wheel.rotation.y = -0.65;
      rod(s.root, V(-0.18, baseH * 0.5, 0.22), V(-0.2, baseH * 0.5, 0.25), 0.01, steel);
    } else {
      part(s.root, new THREE.LatheGeometry([[0.001, 0], [0.3, 0], [0.31, 0.03], [0.27, 0.12], [0.25, baseH], [0.001, baseH]].map(([x, y]) => new THREE.Vector2(x, y)), 40), baseM);
      part(s.root, new THREE.TorusGeometry(0.262, 0.01, 8, 48), glowM, 0, baseH - 0.03, 0).rotation.x = Math.PI / 2;
    }
    const labelText = { specimen: 'SPECIMEN 7', roswell: 'ROSWELL 1947', tap: 'DO NOT TAP GLASS', usaf: 'PROPERTY USAF', live: 'LIVE ALIEN 25¢', unknown: 'ORIGIN UNKNOWN' }[a.label];
    const round = a.base === 'military' || a.base === 'lab';
    const lab = s.label(labelText, 0.3, 0.075, [0, baseH * (round ? 0.42 : 0.5), (round ? 0.3 : 0.283)], a.base === 'military' ? '#e8e2c8' : a.base === 'lab' ? '#22303a' : a.base === 'carnival' ? '#c8281e' : '#2a1a10', a.base === 'military' ? '#4a5636' : a.base === 'lab' ? '#dfe6e8' : a.base === 'carnival' ? '#f8e9a8' : '#c9a04a');
    if (round) { lab.position.z = a.base === 'lab' ? 0.288 : 0.305; lab.rotation.x = a.base === 'lab' ? -0.3 : -0.08; lab.scale.setScalar(0.8); }
    if (a.base === 'military') { const ser = s.label(`AF-${1000 + Math.floor(random() * 8999)}-${String.fromCharCode(65 + Math.floor(random() * 26))}`, 0.2, 0.04, [0, baseH * 0.78, 0.303], '#e8e2c8', '#4a5636'); ser.rotation.x = -0.08; }

    // Collar, glass, cap.
    part(s.root, new THREE.CylinderGeometry(R + 0.03, R + 0.04, 0.04, 36), trim, 0, baseH + 0.02, 0);
    const y0 = baseH + 0.04;
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff2f4', transparent: true, opacity: 0.16, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
    part(s.root, new THREE.CylinderGeometry(R, R, tubeH, 40, 1, true), glass, 0, y0 + tubeH / 2, 0).castShadow = false;
    const capY = y0 + tubeH;
    part(s.root, new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.05, 36), trim, 0, capY + 0.025, 0);
    if (a.base === 'lab') part(s.root, new THREE.SphereGeometry(R + 0.02, 32, 12, 0, 6.283, 0, Math.PI / 2), baseM, 0, capY + 0.05, 0).scale.y = 0.35;
    else { part(s.root, new THREE.CylinderGeometry(0.1, R + 0.01, 0.06, 24), a.base === 'military' ? baseM : trim, 0, capY + 0.08, 0); part(s.root, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 14), steel, 0, capY + 0.13, 0); }
    // Thin steel uprights so the glass reads as a cylinder in every print.
    for (let i = 0; i < 3; i++) { const t = 2.3 + i * 2.094; rod(s.root, V(Math.cos(t) * (R + 0.012), y0, Math.sin(t) * (R + 0.012)), V(Math.cos(t) * (R + 0.012), capY, Math.sin(t) * (R + 0.012)), 0.006, trim); }

    // Fluid.
    const level = escaped ? 0.1 : tubeH * mix(0.9, 0.97, random());
    const fluidM = new THREE.MeshStandardMaterial({ color: fluidHex, transparent: true, opacity: a.fluid === 'clear' ? 0.14 : a.fluid === 'murky' ? 0.42 : 0.3, emissive: fluidHex, emissiveIntensity: mix(0.08, 0.4, mood.energy), depthWrite: false, roughness: 0.2 });
    part(s.root, new THREE.CylinderGeometry(R - 0.008, R - 0.008, level, 36), fluidM, 0, y0 + level / 2, 0).castShadow = false;
    part(s.root, new THREE.CylinderGeometry(R - 0.012, R - 0.012, 0.012, 36), glowM, 0, y0 + 0.006, 0);

    // The alien.
    const o: HeadSpec = { ...HUMAN, W: 0.082, H: 0.105, D: 0.092, cranium: 0.34, jaw: 0.62, nose: 0.003, socket: 0.005, brow: 0.002, lips: 0, chin: 0.002, eyeY: -0.018, eyeX: 0.036 };
    const skinHex = fake ? '#8fa08a' : new THREE.Color('#9a9f9c').lerp(new THREE.Color(fluidHex), 0.12).getStyle();
    const skin = new THREE.MeshStandardMaterial({ color: skinHex, roughness: fake ? 0.5 : 0.62 });
    const eyeM = new THREE.MeshPhysicalMaterial({ color: '#050507', roughness: 0.06, clearcoat: 1 });
    const alien = new THREE.Group();
    const floatY = y0 + 0.05;
    const limbs: THREE.Group[] = [];
    let head: THREE.Group | null = null;
    if (!escaped) {
      alien.position.set(0, floatY, 0); alien.scale.setScalar(1.16); s.root.add(alien);
      alien.rotation.y = a.state === 'watching' ? 0.45 : a.state === 'hand' ? 0.25 : (random() - 0.5) * 0.5;
      const curl = a.state === 'curled';
      const limb = (parent: THREE.Object3D, pts: THREE.Vector3[], r: number) => { for (let i = 0; i < pts.length - 1; i++) { rod(parent, pts[i], pts[i + 1], r, skin, 8); part(parent, new THREE.SphereGeometry(r * 1.25, 8, 6), skin, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z); } };
      const torsoY = curl ? 0.3 : 0.34;
      const torso = part(alien, new THREE.CapsuleGeometry(0.05, 0.1, 4, 12), skin, 0, torsoY, curl ? -0.02 : 0); torso.scale.z = 0.75; torso.rotation.x = curl ? 0.5 : 0.05;
      part(alien, new THREE.SphereGeometry(0.055, 12, 10), skin, 0, torsoY - 0.085, curl ? -0.05 : -0.005).scale.set(1, 0.8, 0.8);
      part(alien, new THREE.CylinderGeometry(0.016, 0.02, 0.06, 10), skin, 0, torsoY + 0.115, curl ? 0.035 : 0.005);
      // Legs.
      for (const side of [-1, 1]) {
        const g = new THREE.Group(); g.position.set(side * 0.032, torsoY - 0.1, curl ? -0.05 : 0); alien.add(g); limbs.push(g);
        const pts = curl ? [V(0, 0, 0), V(side * 0.02, 0.07, 0.13), V(side * 0.01, -0.07, 0.11), V(side * 0.01, -0.09, 0.15)]
          : [V(0, 0, 0), V(side * 0.012, -0.12, 0.035 + random() * 0.03), V(side * 0.008, -0.235, -0.01), V(side * 0.01, -0.25, 0.04)];
        limb(g, pts, 0.014);
      }
      // Arms.
      for (const side of [-1, 1]) {
        const g = new THREE.Group(); g.position.set(side * 0.062, torsoY + 0.075, curl ? 0.02 : 0); alien.add(g); limbs.push(g);
        const reach = a.state === 'hand' && side > 0;
        const palm = V(0.02, 0.06, 0); 
        let pts: THREE.Vector3[];
        if (reach) { const target = V(R - 0.03 - g.position.x * 0, 0.03, 0); void target; pts = [V(0, 0, 0), V(side * 0.03, -0.05, 0.07), V(side * 0.01, 0.03, R - 0.045)]; }
        else if (curl) pts = [V(0, 0, 0), V(side * 0.03, -0.08, 0.06), V(-side * 0.02, -0.1, 0.15)];
        else pts = [V(0, 0, 0), V(side * 0.03, -0.12, 0.01 + random() * 0.03), V(side * 0.035, -0.235, 0.04 + random() * 0.03)];
        void palm;
        limb(g, pts, 0.011);
        const end = pts[pts.length - 1], prev = pts[pts.length - 2], dir = end.clone().sub(prev).normalize();
        for (let f = 0; f < 4; f++) {
          const spreadV = reach ? V((f - 1.5) * 0.014, 0.045 - Math.abs(f - 1.5) * 0.006, 0.004) : dir.clone().multiplyScalar(0.05).add(V((f - 1.5) * 0.008, 0, (f - 1.5) * 0.004));
          rod(g, end, end.clone().add(spreadV), 0.0042, skin, 6);
          if (reach) part(g, new THREE.SphereGeometry(0.0065, 8, 6), skin, end.x + spreadV.x, end.y + spreadV.y, end.z + spreadV.z + 0.002).scale.z = 0.5;
        }
      }
      // Head.
      head = new THREE.Group(); head.position.set(0, torsoY + 0.14 + 0.1, curl ? 0.06 : 0.01); alien.add(head);
      head.rotation.set(curl ? 0.55 : a.state === 'asleep' ? 0.22 : -0.05, a.state === 'watching' ? 0.25 : 0, a.state === 'asleep' ? (random() - 0.5) * 0.3 : 0.06);
      part(head, headGeometry(o), skin);
      for (const side of [-1, 1]) {
        const p = facePoint(o, side * o.eyeX, o.eyeY);
        const closed = a.state === 'asleep' || curl;
        const eye = part(head, new THREE.SphereGeometry(1, 20, 12), closed ? skin : eyeM, p.x, p.y, p.z - 0.004);
        eye.scale.set(0.029, 0.018, 0.009); eye.rotation.set(0, side * 0.5, side * 0.5, 'YXZ');
        if (closed) { const slit = part(head, new THREE.TorusGeometry(0.024, 0.003, 5, 16, Math.PI * 0.8), dark, p.x, p.y + 0.012, p.z + 0.004); slit.rotation.set(0, side * 0.5, Math.PI + side * 0.5 + 0.3, 'YXZ'); slit.scale.y = 0.55; }
        else if (fake) part(head, new THREE.SphereGeometry(0.004, 6, 5), new THREE.MeshStandardMaterial({ color: '#fff' }), p.x + 0.004, p.y + 0.004, p.z + 0.004);
        const nost = facePoint(o, side * 0.005, o.eyeY - 0.03); part(head, new THREE.SphereGeometry(0.002, 6, 5), dark, nost.x, nost.y, nost.z);
      }
      const mp = facePoint(o, 0, o.eyeY - 0.048);
      part(head, new THREE.BoxGeometry(0.02, 0.0018, 0.003), dark, 0, mp.y, mp.z);
      if (fake) {
        // The giveaway: a zip up the belly, a seam at the neck, a string to the cap.
        part(alien, new THREE.BoxGeometry(0.008, 0.19, 0.004), steel, 0, torsoY + 0.005, 0.04);
        for (let i = 0; i < 12; i++) part(alien, new THREE.BoxGeometry(0.014, 0.003, 0.005), steel, 0, torsoY - 0.085 + i * 0.016, 0.041);
        part(alien, new THREE.BoxGeometry(0.012, 0.022, 0.005), trim, 0.004, torsoY + 0.1, 0.045);
        part(alien, new THREE.TorusGeometry(0.02, 0.003, 5, 16), new THREE.MeshStandardMaterial({ color: '#6f7d6a', roughness: 0.7 }), 0, torsoY + 0.125, 0.005).rotation.x = Math.PI / 2;
        rod(alien, V(0, torsoY + 0.36, 0), V(0, (capY - floatY) / 1.16, 0), 0.0015, dark, 4);
      }
    } else {
      // Cracks, shards, puddle and footprints.
      const crackM = new THREE.MeshStandardMaterial({ color: '#f4fbff', roughness: 0.3 });
      const cy = y0 + 0.3 + random() * 0.2, ct = 0.9 + random() * 0.5;
      for (let i = 0; i < 9; i++) {
        let t = ct, y = cy; const pts = [V(Math.cos(t) * R, y, Math.sin(t) * R)]; const dt = (random() - 0.5) * 0.4, dy = (random() - 0.5) * 0.26;
        for (let k = 0; k < 5; k++) { t += dt + (random() - 0.5) * 0.12; y += dy + (random() - 0.5) * 0.05; y = Math.min(capY, Math.max(y0, y)); pts.push(V(Math.cos(t) * R, y, Math.sin(t) * R)); }
        tube(s.root, pts, 0.0035, crackM).castShadow = false;
      }
      const hole = part(s.root, new THREE.SphereGeometry(0.075, 7, 5), dark, Math.cos(ct) * R, cy, Math.sin(ct) * R); hole.scale.set(0.5, 1, 0.5); hole.rotation.y = -ct;
      const shardM = new THREE.MeshStandardMaterial({ color: '#d5eef2', roughness: 0.1, transparent: true, opacity: 0.75 });
      const outX = Math.cos(ct), outZ = Math.sin(ct);
      for (let i = 0; i < 14; i++) { const d = 0.36 + random() * 0.3, sp = (random() - 0.5) * 0.5; const sh = part(s.root, new THREE.ConeGeometry(0.02 + random() * 0.03, 0.004, 3), shardM, outX * d - outZ * sp, 0.003, outZ * d + outX * sp); sh.rotation.y = random() * 6; }
      const puddle = part(s.root, new THREE.CylinderGeometry(0.34, 0.34, 0.003, 28), new THREE.MeshStandardMaterial({ color: fluidHex, transparent: true, opacity: 0.55, roughness: 0.05, emissive: fluidHex, emissiveIntensity: 0.15, depthWrite: false }), outX * 0.4, 0.002, outZ * 0.4); puddle.scale.z = 0.7; puddle.rotation.y = -ct; puddle.castShadow = false;
      const wet = new THREE.MeshStandardMaterial({ color: new THREE.Color(fluidHex).multiplyScalar(0.45), roughness: 0.15 });
      for (let i = 0; i < 5; i++) {
        const d = 0.42 + i * 0.13, sideF = (i % 2 ? 1 : -1) * 0.05;
        const fx = outX * d - outZ * sideF, fz = outZ * d + outX * sideF;
        const pad = part(s.root, new THREE.CylinderGeometry(0.022, 0.022, 0.003, 10), wet, fx, 0.0018, fz); pad.scale.set(0.7, 1, 1.3); pad.rotation.y = -ct + Math.PI / 2;
        for (let tIdx = -1; tIdx <= 1; tIdx++) part(s.root, new THREE.CylinderGeometry(0.007, 0.007, 0.003, 6), wet, fx + outX * 0.04 - outZ * tIdx * 0.016, 0.0018, fz + outZ * 0.04 + outX * tIdx * 0.016);
      }
    }

    // Fittings.
    if (a.fittings === 'hoses') {
      const hoseM = new THREE.MeshStandardMaterial({ color: a.base === 'lab' ? '#d8dcdc' : '#26282b', roughness: 0.7 });
      for (const t of [2.6, 3.9, 5.0]) {
        const cx = Math.cos(t), cz = Math.sin(t);
        tube(s.root, [V(cx * 0.08, capY + 0.1, cz * 0.08), V(cx * (R + 0.09), capY + 0.07, cz * (R + 0.09)), V(cx * (R + 0.07), y0 + tubeH * 0.5, cz * (R + 0.07)), V(cx * (R + 0.1), baseH * 0.9, cz * (R + 0.1)), V(cx * 0.3, baseH * 0.5, cz * 0.3)], 0.018, hoseM);
      }
    } else if (a.fittings === 'chains') {
      const links: THREE.Matrix4[] = [];
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let loop = 0; loop < 3; loop++) {
        const tilt = (random() - 0.5) * 0.5, yy = y0 + tubeH * (0.25 + loop * 0.25), phase = random() * 6;
        for (let i = 0; i < 44; i++) { const t = i / 44 * 6.283; e.set(i % 2 ? Math.PI / 2 : 0, -t, 0, 'YXZ'); q.setFromEuler(e); links.push(m.clone().compose(V(Math.cos(t) * (R + 0.012), yy + Math.sin(t + phase) * tilt * 0.3, Math.sin(t) * (R + 0.012)), q, V(1, 1, 1))); }
      }
      const inst = new THREE.InstancedMesh(new THREE.TorusGeometry(0.018, 0.005, 5, 10), steel, links.length);
      links.forEach((mm, i) => inst.setMatrixAt(i, mm)); inst.castShadow = true; s.root.add(inst);
      part(s.root, new THREE.BoxGeometry(0.06, 0.055, 0.025), new THREE.MeshStandardMaterial({ color: '#c9a04a', metalness: 0.8, roughness: 0.35 }), 0.09, y0 + tubeH * 0.47, R + 0.03).rotation.y = 0.4;
      part(s.root, new THREE.TorusGeometry(0.02, 0.006, 6, 14, Math.PI), steel, 0.09, y0 + tubeH * 0.47 + 0.028, R + 0.03).rotation.y = 0.4;
    } else if (a.fittings === 'frost') {
      const frostM = new THREE.MeshStandardMaterial({ color: '#f2fbff', roughness: 0.95 });
      part(s.root, new THREE.CylinderGeometry(R + 0.045, R + 0.05, 0.07, 36), frostM, 0, y0 + 0.02, 0);
      const pts = [] as { at: readonly [number, number, number]; size: number }[];
      for (let i = 0; i < 420; i++) { const t = random() * 6.283, h = Math.pow(random(), 2.2) * tubeH * 0.55; pts.push({ at: [Math.cos(t) * (R + 0.002), y0 + 0.05 + h, Math.sin(t) * (R + 0.002)], size: 0.004 + random() * 0.007 * (1 - h / tubeH) }); }
      s.scatter(new THREE.OctahedronGeometry(1, 0), frostM, pts).castShadow = false;
    }

    // Bubbles.
    const count = escaped ? 0 : Math.round(a.bubbles * a.bubbles * 44) + (a.bubbles > 0.15 ? 5 : 0);
    const seeds = Array.from({ length: count }, () => [random(), random() * 6.283, 0.03 + random() * (R - 0.06), 0.5 + random(), 0.003 + random() * 0.005]);
    const bubbleMesh = count ? new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false, emissive: fluidHex, emissiveIntensity: 0.3 }), count) : null;
    const bm = new THREE.Matrix4();
    const placeBubbles = (time: number) => {
      if (!bubbleMesh) return;
      seeds.forEach(([ph, ang, rad, sp, size], i) => {
        const f = (ph + time * sp * 0.12) % 1;
        const wob = Math.sin(time * 2 + i) * 0.008;
        bm.makeScale(size, size, size).setPosition(Math.cos(ang) * rad + wob, y0 + 0.02 + f * (level - 0.03), Math.sin(ang) * rad + wob);
        bubbleMesh.setMatrixAt(i, bm);
      });
      bubbleMesh.instanceMatrix.needsUpdate = true;
    };
    if (bubbleMesh) { s.root.add(bubbleMesh); placeBubbles(0); }

    const speed = mix(0.5, 3, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        placeBubbles(time * speed * (0.5 + a.bubbles));
        if (!escaped) {
          alien.position.y = floatY + Math.sin(time * 0.6) * 0.012;
          alien.rotation.z = Math.sin(time * 0.4) * 0.03;
          limbs.forEach((g, i) => { g.rotation.x = Math.sin(time * 0.5 + i * 1.3) * 0.05; });
          if (head && a.state === 'watching') head.rotation.y = 0.25 + Math.sin(time * 0.3) * 0.2;
        }
        glowM.emissiveIntensity = mix(0.6, 2.2, mood.energy) * (0.85 + 0.15 * Math.sin(time * 1.7));
        bulbs.forEach((m, i) => { m.emissiveIntensity = Math.sin(time * 4 * speed + i * 1.6) > 0 ? 2 : 0.3; });
      },
    });
  },
});
