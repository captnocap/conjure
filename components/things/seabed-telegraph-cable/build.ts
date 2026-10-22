import * as THREE from 'three';
import { choice, clamp01, defineThing, disposeTree, mix, noul, visibleBounds } from '@conjure/kit';
import { displace, instances, mat, mesh, noise, paint, range, rod, type Spot, type V3 } from './lib';

// radius m, sheath colours [base, stripe], core, conductor, emissive conductor
const ERA = {
  victorian: { r: 0.11, sheath: ['#2b2620', '#7a4a2c'], core: '#5a3a22', wire: '#d98a4a', armour: '#8a4a2a', stripes: 9 },
  interwar: { r: 0.095, sheath: ['#70757a', '#b09a52'], core: '#3a3630', wire: '#e09a52', armour: '#9aa0a4', stripes: 5 },
  coldwar: { r: 0.08, sheath: ['#1b1c1f', '#2c2e33'], core: '#e6e2d4', wire: '#d98a4a', armour: '#5d6468', stripes: 14 },
  fibre: { r: 0.065, sheath: ['#191a1c', '#e0b81c'], core: '#f1efe6', wire: '#9fe4ff', armour: '#aab2b6', stripes: 2 },
} as const;

export default defineThing({
  questions: {
    era: choice('What era is the cable from?', {
      victorian: 'Victorian: fat tarred hemp over iron armour wires, gutta-percha and a copper heart.',
      interwar: 'Interwar: grey lead sheath wound with brass tape.',
      coldwar: 'Cold War coaxial: smooth black polythene with a torpedo-shaped repeater spliced into the line.',
      fibre: 'Modern fibre-optic: thin, black with a yellow tracer, glass threads inside.',
    }),
    condition: choice('What condition is it in?', {
      intact: 'Intact and unbroken.',
      split: 'The sheath has split and the armour has birdcaged open, baring the core.',
      severed: 'Severed clean through: two frayed ends lying apart.',
      spliced: 'Carries a fat old repair splice, bound and tarred.',
      bitten: 'Gnawed in places; a shark tooth is still stuck in it.',
    }),
    lay: choice('How does it lie?', {
      straight: 'A straight taut run across the silt.',
      sinuous: 'In slack lazy curves.',
      coil: 'With a dropped coil of loops in the middle of the run.',
      draped: 'Draped over a boulder, hanging clear of the bottom on either side.',
      buried: 'Mostly buried, surfacing from the silt in humps.',
    }),
    growth: choice('What has grown on it?', {
      bare: 'Nothing; it is bare.',
      anemones: 'Pale anemones sitting along it like candles.',
      barnacles: 'A crust of barnacles and limpets.',
      sponges: 'Glass sponges, white vases standing on the sheath.',
      stars: 'Brittle stars wrapped around it with their arms.',
      lilies: 'Sea lilies on thin stalks, feathered crowns open.',
    }),
    signal: noul('Is a signal still somehow travelling along it?'),
    beside: choice('What lies beside it?', {
      nothing: 'Nothing.',
      grapnel: 'A cable-ship grapnel that once dragged for it and was lost.',
      tag: 'A brass tag on a wire, stamped with a number.',
      weight: 'A cast-iron mushroom anchor holding it down.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random);
    const era = ERA[a.era], r = era.r;
    const run = 2.5;
    const rust = new THREE.Color('#7a4a30');

    // The path.
    const pts: V3[] = [];
    const samples = 28;
    let rock: { x: number; h: number } | null = null;
    if (a.lay === 'coil') {
      for (let i = 0; i <= 5; i++) pts.push([-run / 2 + i * (run * 0.32) / 5, r * 0.75, range(random, -0.03, 0.03)]);
      const loops = 2.4, cr = 0.44;
      for (let i = 1; i <= 26; i++) { const u = i / 26, ang = -Math.PI / 2 + u * loops * 6.283, rr = cr * (1 - u * 0.12); pts.push([-run * 0.12 + Math.cos(ang) * rr + u * run * 0.22, r * 0.75 + r * 1.7 * u * loops * 0.55, cr + Math.sin(ang) * rr * 0.9]); }
      const last = pts[pts.length - 1];
      for (let i = 1; i <= 5; i++) pts.push([last[0] + (run / 2 - last[0]) * i / 5, mix(last[1], r * 0.75, Math.min(1, i / 2.5)), mix(last[2], 0, i / 5)]);
    } else for (let i = 0; i <= samples; i++) {
      const u = i / samples, x = (u - 0.5) * run;
      let y = r * 0.75, z = n(u * 2, 0, 0) * 0.05;
      if (a.lay === 'sinuous') z = Math.sin(u * 6.283 * 1.15 + 0.4) * 0.34 * (0.6 + 0.4 * Math.sin(u * 3)) + n(u * 3, 1, 0) * 0.08;
      if (a.lay === 'draped') { rock = rock ?? { x: range(random, -0.25, 0.1) * run, h: range(random, 0.42, 0.62) }; const d = (x - rock.x) / 0.5; y = r * 0.75 + rock.h * Math.exp(-d * d * 1.5); z += Math.sin(u * 5) * 0.12; }
      if (a.lay === 'buried') y = r * 0.75 + (Math.sin(u * 6.283 * 1.6 + 1) * 0.5 - 0.22) * r * 3.2;
      pts.push([x, y, z]);
    }
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    const length = curve.getLength();
    const sub = (t0: number, t1: number, steps = 0) => { const count = steps || Math.max(6, Math.round((t1 - t0) * 90)); return new THREE.CatmullRomCurve3(Array.from({ length: count + 1 }, (_u, i) => curve.getPointAt(mix(t0, t1, i / count)))); };

    // Sheath texture: helical armour or tape.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = era.sheath[0]; ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = era.sheath[1]; ctx.lineWidth = a.era === 'fibre' ? 9 : a.era === 'coldwar' ? 2 : 128 / era.stripes * 0.42;
    if (a.era === 'fibre') { ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(128, 30); ctx.stroke(); }
    else for (let i = -era.stripes; i < era.stripes * 2; i++) { ctx.beginPath(); ctx.moveTo(i * 128 / era.stripes, 0); ctx.lineTo(i * 128 / era.stripes + (a.era === 'coldwar' ? 0 : 128), 128); ctx.stroke(); }
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 220 * (0.3 + mood.wear); i++) { ctx.fillStyle = random() < 0.5 ? '#6f6a5c' : `#${rust.getHexString()}`; ctx.fillRect(random() * 128, random() * 128, 2 + random() * 7, 1 + random() * 3); }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(Math.round(length / (r * 5)), 1);
    const sheath = new THREE.MeshStandardMaterial({ map: texture, roughness: a.era === 'coldwar' || a.era === 'fibre' ? 0.45 : 0.85, metalness: a.era === 'interwar' ? 0.35 : 0 });
    const coreMat = mat(era.core, { roughness: 0.5 });
    const armour = mat(new THREE.Color(era.armour).lerp(rust, mood.wear * 0.6), { roughness: 0.6, metalness: 0.5 });
    const live = a.signal;
    const wire = mat(era.wire, { roughness: 0.3, metalness: a.era === 'fibre' ? 0 : 0.8, emissive: a.era === 'fibre' ? '#39b8ff' : '#ff7a2a', emissiveIntensity: a.era === 'fibre' ? (live ? 2.2 : 0.5) : live ? 0.9 : 0.12 });
    const piece = (t0: number, t1: number, radius: number, material: THREE.Material, radial = 12) => mesh(root, new THREE.TubeGeometry(sub(t0, t1), Math.max(8, Math.round((t1 - t0) * 150)), radius, radial, false), material);
    const frame = (t: number) => { const p = curve.getPointAt(t), tan = curve.getTangentAt(t).normalize(); const side = new THREE.Vector3(0, 1, 0).cross(tan).normalize(); if (side.lengthSq() < 0.01) side.set(0, 0, 1); const up = tan.clone().cross(side).normalize(); return { p, tan, side, up }; };
    /** A frayed end at t, opening toward +1 or -1 along the cable. */
    const fray = (t: number, dir: number, splay = 1) => {
      const f = frame(t), out = f.tan.clone().multiplyScalar(dir);
      for (let i = 0; i < 11; i++) {
        const ang = (i / 11) * 6.283, radial = f.side.clone().multiplyScalar(Math.cos(ang)).addScaledVector(f.up, Math.sin(ang));
        const from = f.p.clone().addScaledVector(radial, r * 0.86), reach = r * range(random, 1.2, 3.2) * splay;
        const to = from.clone().addScaledVector(out, reach).addScaledVector(radial, reach * range(random, 0.3, 0.95));
        if (to.y < r * 0.15) to.y = r * 0.15;
        rod(root, from.toArray() as unknown as V3, to.toArray() as unknown as V3, r * 0.085, armour, r * 0.06, 5);
      }
      const coreEnd = f.p.clone().addScaledVector(out, r * 2.2), wireEnd = f.p.clone().addScaledVector(out, r * 3.8);
      rod(root, f.p.toArray() as unknown as V3, coreEnd.toArray() as unknown as V3, r * 0.5, coreMat, r * 0.46, 10);
      for (let i = 0; i < 7; i++) rod(root, coreEnd.toArray() as unknown as V3, wireEnd.clone().add(new THREE.Vector3(range(random, -1, 1), range(random, -0.4, 1), range(random, -1, 1)).multiplyScalar(r * 0.7)).toArray() as unknown as V3, r * 0.075, wire, r * 0.05, 5);
      return wireEnd;
    };

    // Where the damage is.
    const tb = a.lay === 'coil' ? 0.9 : a.lay === 'draped' ? 0.8 : range(random, 0.42, 0.6);
    const sparks: THREE.Vector3[] = [];
    let limit = 1;
    if (a.condition === 'intact') piece(0, 1, r, sheath);
    else if (a.condition === 'severed') {
      const gap = r * 1.4 / length;
      piece(0, tb - gap, r, sheath); piece(tb + gap, 1, r, sheath);
      sparks.push(fray(tb - gap, 1)); fray(tb + gap, -1);
      limit = tb - gap;
    } else if (a.condition === 'spliced') {
      piece(0, 1, r, sheath);
      const f = frame(tb), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.tan);
      const joint = mesh(root, new THREE.LatheGeometry([[1, -4], [1.5, -3.3], [1.9, -2], [2, 0], [1.9, 2], [1.5, 3.3], [1, 4]].map(([x, y]) => new THREE.Vector2(x * r, y * r)), 16), mat('#2a2622', { roughness: 0.9 }), f.p.toArray() as unknown as V3);
      joint.quaternion.copy(q);
      for (const o of [-2.6, -1.3, 0, 1.3, 2.6]) { const band = mesh(root, new THREE.TorusGeometry(r * (2.02 - Math.abs(o) * 0.14), r * 0.11, 6, 18), armour, f.p.clone().addScaledVector(f.tan, o * r).toArray() as unknown as V3); band.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))); }
    } else {
      // split or bitten: lengths of sheath peeled back to gutta-percha, and that peeled to the conductor.
      const wounds = a.condition === 'split' ? [[tb, 2.7]] : [[tb, 1.2], [clamp01(tb - 0.24), 0.9], [Math.min(0.93, tb + 0.2), 1]];
      let cursor = 0;
      for (const [t, half] of [...wounds].sort((x, y) => x[0] - y[0])) {
        const h = half * r / length;
        piece(cursor, t - h, r, sheath); cursor = t + h;
        piece(t - h, t - h * 0.4, r * 0.52, coreMat, 10); piece(t + h * 0.4, t + h, r * 0.52, coreMat, 10);
        piece(t - h * 0.5, t + h * 0.5, r * 0.26, wire, 8);
        sparks.push(curve.getPointAt(t));
        // Armour wires bowing out round the wound like a birdcage.
        const fa = frame(t - h), fb = frame(t + h), fm = frame(t);
        for (let i = 0; i < 9; i++) {
          if (a.condition === 'bitten' && i % 3 === 0) continue;
          const ang = (i / 9) * 6.283 + random() * 0.3, bow = r * (a.condition === 'split' ? range(random, 1.5, 2.6) : range(random, 1.05, 1.4));
          const at = (f: ReturnType<typeof frame>, rad: number, twist: number) => f.p.clone().addScaledVector(f.side, Math.cos(ang + twist) * rad).addScaledVector(f.up, Math.sin(ang + twist) * rad);
          const mid = at(fm, bow, 0.5); if (mid.y < r * 0.1) mid.y = r * 0.1;
          mesh(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([at(fa, r * 0.9, 0), mid, at(fb, r * 0.9, 1)]), 10, r * 0.08, 5), armour);
        }
        if (a.condition === 'bitten' && t === tb) mesh(root, new THREE.ConeGeometry(r * 0.4, r * 1.3, 4), mat('#f4f1e4', { roughness: 0.3 }), fm.p.clone().addScaledVector(fm.up, r * 1.0).toArray() as unknown as V3, [1, 1, 0.35], [0.3, 0.5, Math.PI + 0.3]);
      }
      piece(cursor, 1, r, sheath);
    }
    // Cut faces at the two ends of the run.
    for (const t of [0, 1]) { const f = frame(t), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.tan); const cap = mesh(root, new THREE.CylinderGeometry(r * 0.98, r * 0.98, r * 0.06, 14), coreMat, f.p.toArray() as unknown as V3); cap.quaternion.copy(q); const dot = mesh(root, new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 0.1, 10), wire, f.p.toArray() as unknown as V3); dot.quaternion.copy(q); }

    // Cold War repeater: a torpedo in the line.
    if (a.era === 'coldwar') {
      const t = a.lay === 'coil' ? 0.1 : tb > 0.5 ? 0.24 : 0.76, f = frame(t), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.tan);
      const body = mesh(root, new THREE.LatheGeometry([[1, -9], [1.3, -8.4], [2.6, -5.5], [2.8, -4.8], [2.8, 4.8], [2.6, 5.5], [1.3, 8.4], [1, 9]].map(([x, y]) => new THREE.Vector2(x * r, y * r)), 18), mat(new THREE.Color('#9a8a5a').lerp(rust, mood.wear * 0.5), { roughness: 0.5, metalness: 0.6 }), f.p.clone().setY(Math.max(f.p.y, r * 2.2)).toArray() as unknown as V3);
      body.quaternion.copy(q);
      for (const o of [-4.2, 0, 4.2]) { const band = mesh(root, new THREE.TorusGeometry(r * 2.84, r * 0.14, 6, 20), armour, f.p.clone().setY(Math.max(f.p.y, r * 2.2)).addScaledVector(f.tan, o * r).toArray() as unknown as V3); band.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))); }
    }

    // Seabed dressing: the boulder, silt drifts.
    const siltMat = mat('#ffffff', { vertexColors: true, roughness: 1 });
    const drift = (x: number, z: number, sx: number, sy: number, sz: number) => {
      const g = displace(new THREE.SphereGeometry(1, 20, 8, 0, 6.2832, 0, Math.PI / 2), (p) => n(p.x + x, p.y, p.z + z, 2.5) * 0.14);
      paint(g, (p, c) => { c.set('#74787c').lerp(new THREE.Color('#8f9292'), clamp01(p.y * 1.4 + n(p.x, 0, p.z, 4) * 0.3)); });
      mesh(root, g, siltMat, [x, -0.01, z], [sx, sy, sz]);
    };
    if (rock) {
      const rk = rock as { x: number; h: number };
      const g = displace(new THREE.IcosahedronGeometry(1, 3), (p) => n(p.x, p.y, p.z, 1.6) * 0.2 + n(p.x, p.y, p.z, 4) * 0.06);
      paint(g, (p, c) => { c.set('#2e3036').lerp(new THREE.Color('#585a5c'), clamp01(n(p.x, p.y, p.z, 3) * 0.6 + 0.4 + p.y * 0.2)); });
      const at = curve.getPointAt(0.5); void at;
      mesh(root, g, mat('#ffffff', { vertexColors: true, roughness: 0.95 }), [rk.x, rk.h * 0.42, 0.02], [0.46, rk.h * 0.62, 0.44]);
    }
    if (a.lay === 'buried') for (let i = 0; i <= 10; i++) { const p = curve.getPointAt(i / 10); if (p.y < r * 0.6) drift(p.x, p.z, 0.2, r * 1.2, 0.2); }
    else for (let i = 0; i < 3 + Math.round(mood.wear * 4); i++) { const p = curve.getPointAt(range(random, 0.05, 0.95)); if (p.y < r * 1.5) drift(p.x, p.z + range(random, -0.1, 0.1), range(random, 0.16, 0.3), r * range(random, 0.3, 0.7), range(random, 0.12, 0.2)); }

    // Growth, seated on top of the sheath.
    const crowd = mix(0.45, 1.5, mood.density);
    const seats: { p: THREE.Vector3; up: THREE.Vector3; side: THREE.Vector3; tan: THREE.Vector3 }[] = [];
    const want = Math.round({ bare: 0, anemones: 12, barnacles: 70, sponges: 7, stars: 6, lilies: 6 }[a.growth] * crowd);
    for (let i = 0; i < want; i++) { const t = range(random, 0.03, 0.97); if (Math.abs(t - tb) < 0.07 && a.condition !== 'intact') continue; const f = frame(t); if (f.p.y < r * 0.3) continue; seats.push(f); }
    const swayers: THREE.Object3D[] = [];
    if (a.growth === 'anemones') {
      const stalks: Spot[] = [], crowns: Spot[] = [], palette = ['#fff4ea', '#f6c9c0', '#f0a070', '#e9e2f4'];
      const tint = palette[Math.floor(random() * palette.length)];
      for (const s of seats) { const k = r * range(random, 0.7, 1.4), lean = range(random, -0.5, 0.5); const base = s.p.clone().addScaledVector(s.up, r * 0.85).addScaledVector(s.side, lean * r * 0.5); stalks.push({ at: [base.x, base.y + k * 0.8, base.z], scale: [k * 0.5, k * 1.7, k * 0.5] }); crowns.push({ at: [base.x, base.y + k * 1.9, base.z], scale: [k * 1.15, k * 0.6, k * 1.15], rot: [0, random() * 3, 0] }); }
      instances(root, new THREE.CylinderGeometry(0.75, 1, 1, 9), mat(tint, { roughness: 0.55 }), stalks);
      const crownGeometry = new THREE.ConeGeometry(1, 1, 12, 1, true).rotateX(Math.PI);
      instances(root, crownGeometry, mat('#ffffff', { roughness: 0.5, side: THREE.DoubleSide, emissive: tint, emissiveIntensity: 0.35 }), crowns);
    } else if (a.growth === 'barnacles') {
      const cones: Spot[] = seats.map((s) => { const ang = range(random, -1.2, 1.2), k = r * range(random, 0.14, 0.3); const p = s.p.clone().addScaledVector(s.up, Math.cos(ang) * r * 0.95).addScaledVector(s.side, Math.sin(ang) * r * 0.95); return { at: [p.x, p.y, p.z] as const, scale: [k, k * 0.8, k] as const, rot: [0, 0, -ang * 0.8] as const, color: random() < 0.3 ? '#b9a98a' : '#e9e4d6' }; });
      instances(root, new THREE.CylinderGeometry(0.45, 1, 1, 7), mat('#ffffff', { roughness: 0.8 }), cones);
    } else if (a.growth === 'sponges') {
      for (const s of seats) { const k = r * range(random, 1.3, 2.4); const vase = mesh(root, new THREE.LatheGeometry([[0.12, 0], [0.18, 0.3], [0.42, 0.75], [0.5, 1], [0.44, 0.98], [0.36, 0.75], [0.1, 0.3]].map(([x, y]) => new THREE.Vector2(x * k, y * k)), 12), mat('#f4f1e2', { roughness: 0.7, side: THREE.DoubleSide, emissive: '#5a5a4a', emissiveIntensity: 0.3 }), s.p.clone().addScaledVector(s.up, r * 0.8).toArray() as unknown as V3); vase.rotation.set(range(random, -0.2, 0.2), 0, range(random, -0.2, 0.2)); swayers.push(vase); }
    } else if (a.growth === 'stars') {
      const armMat = mat('#e0a070', { roughness: 0.6 });
      for (const s of seats) {
        const c = s.p.clone().addScaledVector(s.up, r * 1.02); mesh(root, new THREE.SphereGeometry(1, 10, 6), mat('#c8703a', { roughness: 0.6 }), c.toArray() as unknown as V3, [r * 0.42, r * 0.16, r * 0.42]);
        for (let k = 0; k < 5; k++) { const ang = k / 5 * 6.283 + random(), dir = s.tan.clone().multiplyScalar(Math.cos(ang)).addScaledVector(s.side, Math.sin(ang)); const reach = r * range(random, 1.6, 2.6); const p1 = c.clone().addScaledVector(dir, reach * 0.45), p2 = c.clone().addScaledVector(dir, reach).addScaledVector(s.up, -r * Math.abs(Math.sin(ang)) * 1.6 - r * 0.2); if (p2.y < r * 0.08) p2.y = r * 0.08; mesh(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([c.clone(), p1, p2]), 8, r * 0.07, 5), armMat); }
      }
    } else if (a.growth === 'lilies') {
      const pale = mat('#f1e2c4', { roughness: 0.6 }), feather = mat('#f4c84a', { roughness: 0.6, emissive: '#6a4a10', emissiveIntensity: 0.4 });
      for (const s of seats) {
        const g = new THREE.Group(), h = r * range(random, 2.4, 4.5); g.position.copy(s.p).addScaledVector(s.up, r * 0.8); root.add(g); swayers.push(g);
        rod(g, [0, 0, 0], [0, h, 0], r * 0.07, pale, r * 0.05, 5);
        for (let k = 0; k < 8; k++) { const ang = k / 8 * 6.283, reach = r * 1.7; mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, h, 0), new THREE.Vector3(Math.cos(ang) * reach * 0.7, h + reach * 0.5, Math.sin(ang) * reach * 0.7), new THREE.Vector3(Math.cos(ang) * reach * 0.5, h + reach * 1.2, Math.sin(ang) * reach * 0.5)]), 6, r * 0.09, 4), feather); }
      }
    }

    // What lies beside it.
    const besideAt = curve.getPointAt(tb > 0.5 ? 0.3 : 0.7);
    if (a.beside === 'grapnel') {
      const g = new THREE.Group(), iron = mat(new THREE.Color('#4a4038').lerp(rust, 0.4 + mood.wear * 0.4), { roughness: 0.85, metalness: 0.3 });
      rod(g, [0, 0, 0], [0, 0.62, 0], 0.03, iron, 0.022);
      mesh(g, new THREE.TorusGeometry(0.06, 0.016, 6, 14), iron, [0, 0.68, 0]);
      for (let k = 0; k < 4; k++) { const ang = k * 1.5708; mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(Math.cos(ang) * 0.14, -0.03, Math.sin(ang) * 0.14), new THREE.Vector3(Math.cos(ang) * 0.24, 0.08, Math.sin(ang) * 0.24), new THREE.Vector3(Math.cos(ang) * 0.22, 0.2, Math.sin(ang) * 0.22)]), 10, 0.022, 6), iron); }
      for (let k = 0; k < 5; k++) mesh(g, new THREE.TorusGeometry(0.04, 0.012, 5, 10), iron, [0, 0.76 + k * 0.065, 0], 1, [0, k % 2 ? Math.PI / 2 : 0, 0]);
      g.position.set(besideAt.x, 0.2, besideAt.z + 0.5); g.rotation.set(Math.PI / 2 - 0.12, 0, range(random, 0.6, 2.4)); root.add(g);
      g.traverse((node) => { node.castShadow = true; });
    } else if (a.beside === 'tag') {
      const brass = mat('#c9a03a', { roughness: 0.4, metalness: 0.7 });
      const c2 = document.createElement('canvas'); c2.width = 128; c2.height = 64; const x2 = c2.getContext('2d')!; x2.fillStyle = '#c9a03a'; x2.fillRect(0, 0, 128, 64); x2.fillStyle = '#4a3a10'; x2.font = 'bold 34px monospace'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(`No ${100 + Math.floor(random() * 899)}`, 64, 34);
      const tagTexture = new THREE.CanvasTexture(c2); tagTexture.colorSpace = THREE.SRGBColorSpace;
      const plate = mesh(root, new THREE.BoxGeometry(0.3, 0.012, 0.15), [brass, brass, new THREE.MeshStandardMaterial({ map: tagTexture, roughness: 0.4, metalness: 0.5 }), brass, brass, brass] as unknown as THREE.Material, [besideAt.x + 0.05, 0.03, besideAt.z + 0.34], 1, [0.08, range(random, -0.5, 0.5), 0]);
      void plate;
      rod(root, [besideAt.x, besideAt.y + r, besideAt.z], [besideAt.x + 0.02, 0.03, besideAt.z + 0.26], 0.006, brass);
    } else if (a.beside === 'weight') {
      const iron = mat(new THREE.Color('#3a3632').lerp(rust, 0.3 + mood.wear * 0.5), { roughness: 0.9 });
      mesh(root, new THREE.LatheGeometry([[0, 0], [0.3, 0.02], [0.34, 0.08], [0.2, 0.2], [0.06, 0.26], [0.05, 0.6], [0.08, 0.62], [0, 0.64]].map(([x, y]) => new THREE.Vector2(x, y)), 18), iron, [besideAt.x, 0, besideAt.z + 0.42], 1, [range(random, -0.1, 0.1), 0, range(random, -0.2, 0.2)]);
      mesh(root, new THREE.TorusGeometry(0.06, 0.015, 6, 12), iron, [besideAt.x, 0.68, besideAt.z + 0.42]);
      rod(root, [besideAt.x, 0.62, besideAt.z + 0.42], [besideAt.x, besideAt.y + r, besideAt.z], 0.012, iron);
    }

    // The signal: pulses of light running the line and dying at the break.
    const pulses: THREE.Mesh[] = [];
    const glow = mat('#fff2c0', { emissive: a.era === 'fibre' ? '#39b8ff' : '#ffb040', emissiveIntensity: 2.4 });
    const halo = new THREE.MeshBasicMaterial({ color: a.era === 'fibre' ? '#39b8ff' : '#ffb040', transparent: true, opacity: 0.16, depthWrite: false });
    if (live) {
      for (let i = 0; i < 3; i++) { const ring = mesh(root, new THREE.TorusGeometry(r * 1.12, r * 0.16, 6, 16), glow); ring.castShadow = false; pulses.push(ring); }
      for (const s of sparks) { const h = new THREE.Mesh(new THREE.SphereGeometry(r * 3.2, 14, 10), halo); h.position.copy(s); root.add(h); mesh(root, new THREE.SphereGeometry(r * 0.4, 10, 8), glow, s.toArray() as unknown as V3); }
    }
    const q = new THREE.Quaternion(), flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), yAxis = new THREE.Vector3(0, 1, 0);
    const place = (time: number) => pulses.forEach((ring, i) => { const t = ((time + i / pulses.length) % 1) * limit; ring.position.copy(curve.getPointAt(t)); ring.quaternion.copy(q.setFromUnitVectors(yAxis, curve.getTangentAt(t).normalize())).multiply(flat); ring.scale.setScalar(t > limit - 0.03 ? Math.max(0.01, (limit - t) / 0.03) : 1); });
    place(0.13);

    const all = visibleBounds(root), mid = all.getCenter(new THREE.Vector3());
    root.position.set(-mid.x, 0, -mid.z);
    const energy = mix(0.25, 1.5, mood.energy);
    return {
      object: root,
      update(_dt, time) {
        if (live) { place(time * 0.12 * energy + 0.13); glow.emissiveIntensity = 2.4 * (0.75 + 0.25 * Math.sin(time * 9)); }
        swayers.forEach((s, i) => { s.rotation.z = Math.sin(time * 0.8 * energy + i) * 0.08; });
      },
      dispose: () => disposeTree(root),
    };
  },
});
