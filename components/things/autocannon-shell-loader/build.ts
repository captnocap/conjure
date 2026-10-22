import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type V, add, ball, box, cyl, decal, group, hazard, paint, rod, stencil, tube } from './h';

export default defineThing({
  questions: {
    ordnance: choice('What is it carrying?', {
      live: 'Live rounds: brass cases, olive shells with a yellow band and red tips.',
      practice: 'Practice rounds painted training blue with a white band.',
      paint: 'Paint-marker rounds with fat coloured noses, and splashes of the stuff on the cart.',
      empties: 'Only spent casings, tarnished and open-mouthed, tumbled in a heap.',
    }),
    loading: choice('What is it doing right now?', {
      parked: 'Parked and waiting: arm retracted and lowered, the belt lying in its tray.',
      feeding: 'Mid-load: arm raised and the belt climbing it shell by shell toward a breech above.',
      single: 'Hand-loading: one shell sits alone in the raised cradle.',
      done: 'Finished: tray nearly empty, arm still up, a few stray rounds left over.',
    }),
    stock: score('How much is on the tray?', ['A last few rounds', 'Half a belt', 'A full belt', 'Stacked two deep']),
    body: choice('What colour is the cart?', {
      yellow: 'Ground-equipment yellow.', olive: 'Olive drab.', grey: 'Deck grey with white lettering.', red: 'Ordnance red, impossible to miss.',
    }),
    drive: choice('How is it moved?', {
      tiller: 'A walk-behind battery tug with a long tiller handle.',
      seat: 'A ride-on tractor end with a seat and steering wheel.',
      towed: 'No motor: a tow bar and a locker of spare links.',
    }),
    stencil: choice('What is stencilled on its flank?', {
      danger: 'DANGER EXPLOSIVES', smoking: 'NO SMOKING', eggs: 'HANDLE LIKE EGGS', number: 'Just a bay number.',
    }),
    beacon: noul('Is its amber beacon flashing?'),
    chocks: noul('Are the wheels chocked?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = s.root;
    const tone = { yellow: '#dba91c', olive: '#5f6d47', grey: '#7d878e', red: '#b0301f' }[a.body];
    const body = s.material(tone, { roughness: 0.55, metalness: 0.2 });
    const dark = s.material('#24272a', { roughness: 0.7, metalness: 0.3 });
    const steel = s.material('#8e9599', { roughness: 0.4, metalness: 0.8 });
    const chrome = s.material('#d5d9db', { roughness: 0.2, metalness: 0.9 });
    const rubber = s.material('#18191a', { roughness: 0.95 });
    const stripe = new THREE.MeshStandardMaterial({ map: hazard(a.body === 'yellow' ? '#f1efe6' : '#e8b21c', a.body === 'yellow' ? '#c22a1e' : '#1d1d1b', 10), roughness: 0.7 });

    // Chassis: a low deck on four fat wheels with striped skirts.
    box(R, [3.3, 0.26, 1.3], [0, 0.52, 0], body);
    for (const sz of [-1, 1]) box(R, [3.32, 0.2, 0.03], [0, 0.5, sz * 0.665], stripe);
    for (const sx of [-1, 1]) box(R, [0.1, 0.3, 1.36], [sx * 1.7, 0.5, 0], dark);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 1.05, z = sz * 0.74;
      cyl(R, 0.33, 0.33, 0.26, [x, 0.33, z], rubber, [Math.PI / 2, 0, 0], 18);
      cyl(R, 0.17, 0.17, 0.28, [x, 0.33, z], body, [Math.PI / 2, 0, 0], 10);
      box(R, [0.86, 0.05, 0.34], [x, 0.72, z], dark);
      if (a.chocks && sz === 1) for (const t of [-1, 1]) box(R, [0.2, 0.16, 0.24], [x + t * 0.42, 0.07, z], s.material('#d8a21c'), [0, 0, t * 0.5]);
    }

    // Stencil on the flank.
    const bay = `${1 + Math.floor(random() * 9)}`;
    const words = { danger: 'DANGER EXPLOSIVES', smoking: 'NO SMOKING', eggs: 'HANDLE LIKE EGGS', number: `BAY ${bay}` }[a.stencil];
    const ink = a.body === 'yellow' ? '#1d1d1b' : '#f1efe6';
    const sign = paint(512, 80, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); stencil(ctx, words, w / 2, h / 2 + 3, words.length > 12 ? 50 : 64, ink, 'center', w - 24); });

    // Tray: a shallow rack with side rails where the belt lies.
    const tx0 = -0.75, tx1 = 0.85;
    box(R, [tx1 - tx0 + 0.2, 0.06, 1.24], [(tx0 + tx1) / 2, 0.68, 0], dark);
    for (const sz of [-1, 1]) {
      box(R, [tx1 - tx0 + 0.2, 0.3, 0.05], [(tx0 + tx1) / 2, 0.84, sz * 0.62], body);
      rod(R, [tx0 - 0.1, 1.02, sz * 0.62], [tx1 + 0.1, 1.02, sz * 0.62], 0.025, steel);
    }
    decal(R, sign, 1.6, 0.25, [(tx0 + tx1) / 2, 0.84, 0.648]);

    // One shell: brass case and a painted projectile, lathed once and instanced.
    const caseGeometry = new THREE.LatheGeometry([[0.001, 0], [0.108, 0], [0.108, 0.025], [0.096, 0.035], [0.1, 0.5], [0.084, 0.57], [0.084, 0.62]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const tipGeometry = new THREE.LatheGeometry([[0.084, 0.62], [0.086, 0.8], [0.07, 0.92], [0.04, 1.0], [0.001, 1.03]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    for (const g of [caseGeometry, tipGeometry]) { g.translate(0, -0.5, 0); g.rotateX(Math.PI / 2); }
    const bands = paint(4, 64, (ctx, w, h) => {
      const fill = (colour: string, from: number, to: number) => { ctx.fillStyle = colour; ctx.fillRect(0, h * (1 - to), w, h * (to - from)); };
      if (a.ordnance === 'practice') { fill('#2f86cf', 0, 1); fill('#f1efe6', 0.18, 0.3); }
      else if (a.ordnance === 'paint') { fill('#f1efe6', 0, 1); fill('#ffffff', 0.5, 1); fill('#30343a', 0.08, 0.14); }
      else { fill('#4d5936', 0, 1); fill('#e8c11f', 0.16, 0.28); fill('#c22a1e', 0.72, 1); }
    });
    bands.magFilter = THREE.NearestFilter;
    const spent = a.ordnance === 'empties';
    const brass = new THREE.MeshStandardMaterial({ color: spent ? '#8a6a30' : '#c79a35', metalness: 0.85, roughness: spent ? 0.6 : mix(0.25, 0.5, mood.wear), side: THREE.DoubleSide });
    const tipPaint = new THREE.MeshStandardMaterial({ map: bands, roughness: 0.5 });
    const marker = ['#e8338a', '#3fc24a', '#f29a1c', '#2fb7d6', '#f2e21c'];
    const shells: { at: V; rot: V; tint?: string }[] = [];

    const pitch = 0.235;
    const slots = Math.floor((tx1 - tx0) / pitch) + 1;
    const fullness = a.loading === 'done' ? 0.12 : a.stock;
    let onTray = Math.max(a.loading === 'done' ? 1 : 2, Math.round(mix(2, slots * 2 - 1, fullness)));
    const links: V[] = [];
    for (let i = 0; i < onTray; i++) {
      const upper = i >= slots;
      const k = upper ? i - slots : i;
      const x = tx1 - 0.05 - k * pitch - (upper ? pitch / 2 : 0);
      const y = 0.82 + (upper ? 0.2 : 0);
      if (spent) shells.push({ at: [x + (random() - 0.5) * 0.1, y + random() * 0.05, (random() - 0.5) * 0.12], rot: [(random() - 0.5) * 0.25, (random() - 0.5) * 0.9 + (random() < 0.4 ? Math.PI : 0), random() * 3] });
      else { shells.push({ at: [x, y, (random() - 0.5) * 0.02], rot: [0, 0, 0], tint: marker[Math.floor(random() * marker.length)] }); links.push([x, y, 0]); }
    }
    if (!spent && onTray > 1) {
      // The belt links: two dark strips riding over each layer.
      const layer = (from: number, to: number, y: number, shift: number) => {
        if (to <= from) return;
        const xa = tx1 - 0.05 - from * pitch - shift, xb = tx1 - 0.05 - (to - 1) * pitch - shift;
        for (const z of [-0.26, 0.08]) box(R, [xa - xb + 0.16, 0.025, 0.09], [(xa + xb) / 2, y + 0.108, z], dark);
      };
      layer(0, Math.min(onTray, slots), 0.82, 0);
      layer(0, onTray - slots, 1.02, pitch / 2);
    }

    // The feed arm: twin beams on a pivot, a ram beneath, a level cradle at the tip.
    const raised = a.loading !== 'parked';
    const angle = raised ? mix(0.75, 1.05, random()) : 0.2;
    const pivot: V = [1.15, 0.86, 0];
    const boomL = raised ? 2.3 : 1.25;
    cyl(R, 0.13, 0.13, 1.0, pivot, steel, [Math.PI / 2, 0, 0], 12);
    for (const sz of [-1, 1]) box(R, [0.3, 0.4, 0.08], [pivot[0], 0.74, sz * 0.46], body);
    const boom = group(R, pivot, [0, 0, angle]);
    for (const sz of [-1, 1]) {
      box(boom, [boomL, 0.14, 0.07], [boomL / 2, 0, sz * 0.4], body);
      box(boom, [boomL * 0.5, 0.05, 0.075], [boomL * 0.7, 0.045, sz * 0.4], stripe);
      if (!raised) box(boom, [1.0, 0.1, 0.05], [0.55, -0.02, sz * 0.34], steel);
    }
    for (let i = 0; i <= 6; i++) cyl(boom, 0.04, 0.04, 0.8, [0.2 + i * (boomL - 0.3) / 6, 0.02, 0], steel, [Math.PI / 2, 0, 0], 8);
    const tip: V = [pivot[0] + Math.cos(angle) * boomL, pivot[1] + Math.sin(angle) * boomL, 0];
    const ramTo: V = [pivot[0] + Math.cos(angle) * boomL * 0.5, pivot[1] + Math.sin(angle) * boomL * 0.5 - 0.06, 0];
    const ramFrom: V = [1.6, 0.6, 0];
    rod(R, ramFrom, [mix(ramFrom[0], ramTo[0], 0.5), mix(ramFrom[1], ramTo[1], 0.5), 0], 0.075, dark, 10);
    rod(R, ramFrom, ramTo, 0.04, chrome, 8);
    const cradle = group(R, tip);
    box(cradle, [0.34, 0.05, 1.1], [0.05, -0.06, 0], dark);
    for (const sx of [-1, 1]) box(cradle, [0.05, 0.16, 1.1], [0.05 + sx * 0.16, 0.0, 0], steel, [0, 0, -sx * 0.4]);
    cyl(R, 0.08, 0.08, 0.95, tip, steel, [Math.PI / 2, 0, 0], 10);
    if (!spent && (a.loading === 'feeding' || a.loading === 'single')) shells.push({ at: [tip[0] + 0.05, tip[1] + 0.09, 0], rot: [0, 0, 0], tint: marker[0] });
    if (!spent && a.loading === 'feeding') {
      const riders = 6;
      for (let i = 1; i <= riders; i++) {
        const d = (i / (riders + 1)) * (boomL - 0.1);
        const nx = -Math.sin(angle), ny = Math.cos(angle);
        shells.push({ at: [pivot[0] + Math.cos(angle) * d + nx * 0.17, pivot[1] + Math.sin(angle) * d + ny * 0.17, 0], rot: [0, 0, 0], tint: marker[i % marker.length] });
      }
      for (const z of [-0.26, 0.08]) box(boom, [boomL - 0.1, 0.025, 0.09], [boomL / 2, 0.28, z], dark);
      box(R, [0.5, 0.025, 0.09], [tx1 + 0.12, 0.95, -0.26], dark, [0, 0, 0.3]);
    }
    if (spent || a.loading === 'done') {
      // Strays on the ground: brass rolls where it likes.
      const strays = 2 + Math.round(mood.density * 4);
      for (let i = 0; i < strays; i++) shells.push({ at: [-1.2 + random() * 3.2, 0.105, 1.0 + random() * 0.6], rot: [0, random() * Math.PI, 0], tint: marker[i % marker.length] });
    }

    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    const cases = new THREE.InstancedMesh(caseGeometry, brass, shells.length);
    const tips = new THREE.InstancedMesh(tipGeometry, tipPaint, shells.length);
    shells.forEach((shell, i) => {
      e.set(shell.rot[0], shell.rot[1], shell.rot[2]);
      matrix.compose(new THREE.Vector3(...shell.at), q.setFromEuler(e), one);
      cases.setMatrixAt(i, matrix);
      tips.setMatrixAt(i, matrix);
      if (a.ordnance === 'paint') tips.setColorAt(i, new THREE.Color(shell.tint ?? '#ffffff'));
    });
    cases.castShadow = cases.receiveShadow = tips.castShadow = tips.receiveShadow = true;
    R.add(cases);
    if (!spent) R.add(tips);
    if (a.ordnance === 'paint') {
      for (let i = 0; i < 7; i++) {
        const splat = new THREE.MeshStandardMaterial({ color: marker[i % marker.length], roughness: 0.4 });
        if (i < 4) ball(R, [0.1 + random() * 0.12, 0.08 + random() * 0.1, 0.006], [-1.5 + random() * 3, 0.5 + (random() - 0.5) * 0.12, 0.682], splat, 10);
        else cyl(R, 0.15 + random() * 0.15, 0.15, 0.008, [-1.4 + random() * 3, 0.004, 1.0 + random() * 0.5], splat, [0, 0, 0], 12);
      }
    }

    // The drive end.
    const ex = -1.25;
    if (a.drive === 'towed') {
      box(R, [0.7, 0.5, 1.2], [ex, 0.9, 0], body);
      box(R, [0.74, 0.05, 1.24], [ex, 1.17, 0], dark);
      box(R, [0.03, 0.1, 0.16], [ex, 0.95, 0.61], chrome);
      rod(R, [-1.7, 0.45, 0.4], [-2.6, 0.3, 0], 0.04, dark); rod(R, [-1.7, 0.45, -0.4], [-2.6, 0.3, 0], 0.04, dark);
      add(R, new THREE.TorusGeometry(0.09, 0.03, 6, 14), steel, [-2.68, 0.3, 0], [Math.PI / 2, 0, 0]);
    } else {
      box(R, [0.75, 0.6, 1.24], [ex, 0.95, 0], body);
      for (let i = 0; i < 5; i++) box(R, [0.5, 0.03, 0.02], [ex, 0.78 + i * 0.08, 0.625], dark);
      box(R, [0.2, 0.14, 0.02], [ex - 0.2, 1.12, 0.625], s.material('#f1efe6'));
      if (a.drive === 'tiller') {
        rod(R, [-1.65, 0.9, 0], [-2.35, 1.25, 0], 0.035, dark);
        rod(R, [-2.35, 1.25, -0.25], [-2.35, 1.25, 0.25], 0.035, rubber);
        box(R, [0.14, 0.1, 0.2], [-2.3, 1.27, 0], s.material('#c22a1e'));
      } else {
        box(R, [0.5, 0.1, 0.5], [ex, 1.3, 0], dark);
        box(R, [0.1, 0.5, 0.5], [ex - 0.28, 1.55, 0], dark, [0, 0, 0.15]);
        rod(R, [ex + 0.3, 1.25, 0], [ex + 0.2, 1.7, 0], 0.025, steel);
        add(R, new THREE.TorusGeometry(0.17, 0.022, 6, 16), dark, [ex + 0.19, 1.72, 0], [Math.PI / 2, 0.22, 0]);
      }
    }
    // Fire extinguisher, control pendant and beacon.
    cyl(R, 0.07, 0.07, 0.4, [ex + 0.2, 1.45 - (a.drive === 'seat' ? 0.55 : 0), -0.5], s.material('#c22a1e', { roughness: 0.4 }), [0, 0, 0], 10);
    cyl(R, 0.025, 0.03, 0.1, [ex + 0.2, 1.7 - (a.drive === 'seat' ? 0.55 : 0), -0.5], dark, [0, 0, 0], 8);
    tube(R, [[0.95, 0.95, 0.66], [0.9, 0.6, 0.85], [0.6, 0.25, 0.95], [0.35, 0.5, 0.9]], 0.015, rubber);
    box(R, [0.1, 0.2, 0.06], [0.33, 0.56, 0.9], s.material('#e8b21c'), [0, 0, 0.5]);
    const lamp = new THREE.MeshStandardMaterial({ color: '#f19a1c', emissive: '#f19a1c', emissiveIntensity: a.beacon ? 1.6 : 0, roughness: 0.3 });
    rod(R, [ex - 0.25, 1.2, 0.5], [ex - 0.25, 1.75, 0.5], 0.02, steel);
    cyl(R, 0.07, 0.08, 0.13, [ex - 0.25, 1.8, 0.5], lamp, [0, 0, 0], 10);

    return s.finish({
      update: (_dt, time) => { if (a.beacon) lamp.emissiveIntensity = Math.sin(time * mix(3, 9, mood.energy)) > 0 ? 2.4 : 0.3; },
    });
  },
});
