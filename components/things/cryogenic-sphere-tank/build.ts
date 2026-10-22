import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch } from './batch';

type P = [number, number, number];

export default defineThing({
  questions: {
    contents: choice('What is stencilled on the tank?', {
      lox: 'LOX, liquid oxygen, with a yellow oxidiser diamond.',
      lh2: 'LH2, liquid hydrogen, with a red flammable diamond.',
      ln2: 'LN2, liquid nitrogen, with a green diamond.',
      methane: 'CH4, liquid methane, in a new company typeface.',
      empty: 'EMPTY, sprayed on by hand.',
      blank: 'Nothing at all.',
    }),
    venting: choice('What is coming off the vent stack?', {
      quiet: 'Nothing, sealed and still.',
      wisp: 'A thin white wisp of boil-off.',
      plume: 'A big rolling plume of cold vapour drifting downwind.',
      flare: 'A burning flare at the stack tip, hydrogen being burnt off.',
      fog: 'Heavy cold fog spilling down the sphere and pooling round the legs.',
    }),
    skin: choice('What is the surface of the sphere like?', {
      painted: 'Smooth white paint, seamless.',
      panelled: 'Insulation panels with visible seams like a football.',
      peeling: 'Insulation peeling off in sheets, orange foam and dark steel showing through.',
      rimed: 'Entirely furred with white frost.',
    }),
    fill: score('How full is it?', ['Empty and warm, no frost', 'A third: frost round the bottom', 'Half: frost to the equator', 'Brim full: frosted nearly to the top']),
    access: choice('How do you climb it?', {
      spiral: 'A spiral stair winding round the sphere to the top.',
      ladder: 'A straight caged ladder up one side.',
      tower: 'A separate zigzag stair tower with a bridge to the crown.',
    }),
    surround: choice('What surrounds it?', {
      berm: 'A grassy earth berm in a ring.',
      dike: 'A square concrete spill wall.',
      skid: 'A bare slab with a valve skid and pump house.',
      tanker: 'A tanker truck coupled up, filling it.',
    }),
    size: score('How big is the sphere?', ['Modest', 'Large', 'Enormous']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const wear = a.skin === 'peeling' ? Math.max(mood.wear, 0.5) : mood.wear;
    const rust = new THREE.Color('#84441f');
    const paint = (hex: string, chance = 1) => {
      const c = new THREE.Color(hex);
      if (random() < wear * 0.75 * chance) c.lerp(rust, mix(0.2, 0.85, random()) * wear);
      else c.offsetHSL(0, 0, (random() - 0.5) * 0.04);
      return c;
    };
    const R = mix(8, 13, a.size);
    const CY = R + mix(5, 7, random());
    const on = (lat: number, ang: number, r = R): P => [Math.sin(ang) * Math.cos(lat) * r, CY + Math.sin(lat) * r, Math.cos(ang) * Math.cos(lat) * r];
    const skinHex = a.skin === 'rimed' ? '#eef6fa' : '#f1f1ec';
    const shell = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinHex).lerp(rust, wear * 0.1), roughness: a.skin === 'rimed' ? 1 : 0.5 });
    s.ball([R, R, R], [0, CY, 0], shell, 40);
    const patch = (ang: number, angLength: number, latTop: number, latLength: number, material: THREE.Material, lift = 0.05) => {
      const skin = s.mesh(new THREE.SphereGeometry(R + lift, Math.max(4, Math.round(angLength * 10)), Math.max(3, Math.round(latLength * 8)), ang + Math.PI / 2, angLength, Math.PI / 2 - latTop, latLength), material, [0, CY, 0]);
      skin.castShadow = false;
      return skin;
    };

    // Legs: a ring of columns meeting the sphere at its equator, cross-braced.
    const legs = Math.round(mix(8, 12, a.size));
    for (let i = 0; i < legs; i++) {
      const t0 = (i / legs) * Math.PI * 2, t1 = ((i + 1) / legs) * Math.PI * 2;
      const foot: P = [Math.sin(t0) * R * 0.96, 0, Math.cos(t0) * R * 0.96], next: P = [Math.sin(t1) * R * 0.96, 0, Math.cos(t1) * R * 0.96];
      b.cyl(0.5, 0.5, CY, [foot[0], CY / 2, foot[2]], paint('#e4e4de'), 10);
      b.cyl(1, 1.1, 0.7, [foot[0], 0.35, foot[2]], '#aeaba0', 10);
      const top = CY - R * 0.62;
      b.rod([foot[0], 0.8, foot[2]], [next[0], top, next[2]], 0.16, paint('#d8d8d2'), 0.16, 5);
      b.rod([next[0], 0.8, next[2]], [foot[0], top, foot[2]], 0.16, paint('#d8d8d2'), 0.16, 5);
    }

    // Surface treatment.
    if (a.skin === 'panelled' || a.skin === 'peeling') {
      const seam = s.material('#9a9d9c', { roughness: 0.8 });
      for (let m = 0; m < 6; m++) { const ring = s.mesh(new THREE.TorusGeometry(R + 0.02, 0.07, 4, 56), seam, [0, CY, 0]); ring.rotation.y = (m / 6) * Math.PI; ring.castShadow = false; }
      for (const lat of [-0.7, 0, 0.7]) { const ring = s.mesh(new THREE.TorusGeometry(Math.cos(lat) * (R + 0.02), 0.07, 4, 56), seam, [0, CY + Math.sin(lat) * R, 0]); ring.rotation.x = Math.PI / 2; ring.castShadow = false; }
    }
    if (a.skin === 'peeling') {
      const foam = s.material('#c58a3c', { roughness: 1 }), steel = s.material('#4a4f55', { roughness: 0.6, metalness: 0.4 });
      const gone = Math.round(mix(5, 13, wear));
      for (let i = 0; i < gone; i++) {
        const ang = Math.floor(random() * 12) * (Math.PI / 6), band = Math.floor(random() * 3), latTop = [0.7, 0, -0.7][band] + (band === 0 ? 0.55 : 0), latLength = band === 0 ? 0.55 : 0.7;
        patch(ang, Math.PI / 6, latTop, latLength, random() < 0.6 ? foam : steel);
        // The sheet that came away hangs from the lower seam.
        const low = latTop - latLength, mid = ang + Math.PI / 12, hang = 1.5 + random() * 3;
        const p = on(low, mid, R + 0.3);
        b.box([Math.cos(low) * R * 0.45, hang, 0.12], [p[0], p[1] - hang / 2, p[2]], '#e9e8e0', [0.15 + random() * 0.3, mid, (random() - 0.5) * 0.3]);
      }
    }
    const streak = s.material(rust.clone().lerp(new THREE.Color('#3c2416'), 0.2), { roughness: 0.9 });
    for (let i = 0; i < Math.round(wear * 16); i++) patch(random() * 6.28, 0.04 + random() * 0.07, 0.9 - random() * 0.8, 0.3 + random() * 0.8, streak, 0.04);

    // Frost: a cap creeping up from the south pole to the liquid level, with icicles and a rimed ground.
    const level = a.fill < 0.08 ? 0 : mix(0.5, 2.5, a.fill);
    const frostMat = s.material('#dff0f8', { roughness: 1 });
    if (level > 0) {
      patch(0, Math.PI * 2, -Math.PI / 2 + level, level, frostMat, 0.09);
      for (let i = 0; i < 40; i++) { const ang = random() * 6.28, lat = -Math.PI / 2 + level * mix(0.15, 1.05, random()); const p = on(lat, ang, R + 0.05); b.rod(p, [p[0], p[1] - 0.6 - random() * 2.4, p[2]], 0.22, '#e9f6fb', 0.02, 5); }
      for (let i = 0; i < legs; i++) { const t = (i / legs) * Math.PI * 2; b.cyl(0.62, 0.62, CY * 0.3 * a.fill + 0.5, [Math.sin(t) * R * 0.96, CY - R * 0.3 - CY * 0.15 * a.fill, Math.cos(t) * R * 0.96], '#e3f1f7', 10); }
      b.cyl(R * 0.75 * a.fill + 1, R * 0.75 * a.fill + 1.3, 0.08, [0, 0.05, 0], '#e6f2f6', 24);
    }
    if (a.skin === 'rimed') for (let i = 0; i < 60; i++) { const p = on(Math.asin(random() * 2 - 1), random() * 6.28, R - 0.1); b.ball(0.5 + random() * 0.7, p, '#f6fbfd', [1, 1, 1], 6); }

    // Crown: platform, rail, relief valves and the vent stack.
    const topY = CY + R;
    b.cyl(2.8, 2.8, 0.25, [0, topY + 0.2, 0], paint('#55595a', 0.5), 16);
    for (let k = 0; k < 12; k++) { const t0 = (k / 12) * 6.283, t1 = ((k + 1) / 12) * 6.283; b.rod([Math.sin(t0) * 2.7, topY + 0.3, Math.cos(t0) * 2.7], [Math.sin(t0) * 2.7, topY + 1.5, Math.cos(t0) * 2.7], 0.07, '#e5bd27', 0.07, 4); b.rod([Math.sin(t0) * 2.7, topY + 1.5, Math.cos(t0) * 2.7], [Math.sin(t1) * 2.7, topY + 1.5, Math.cos(t1) * 2.7], 0.07, '#e5bd27', 0.07, 4); }
    b.cyl(0.9, 0.9, 0.8, [0, topY + 0.7, 0], paint('#d8d8d2'), 12);
    const stackH = mix(5, 8, random()), sx = 1.1;
    b.cyl(0.32, 0.32, stackH, [sx, topY + stackH / 2, 0], paint('#d8d8d2'), 10);
    b.cyl(0.55, 0.32, 0.8, [sx, topY + stackH + 0.4, 0], paint('#8f9596'), 10);
    for (const z of [-1, 1]) { b.cyl(0.18, 0.18, 1.4, [-0.8, topY + 1, z * 0.9], '#c9311f', 8); b.ball(0.3, [-0.8, topY + 1.8, z * 0.9], '#c9311f', [1, 1, 1], 8); }
    const tip = new THREE.Vector3(sx, topY + stackH + 0.9, 0);

    // Access.
    const grate = '#6b7072', railHex = '#e5bd27';
    if (a.access === 'spiral') {
      const steps = 46, turn = Math.PI * 1.35, startAng = -0.5;
      let lastRail: P | null = null;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, lat = mix(-0.35, 1.33, t), ang = startAng + t * turn;
        const p = on(lat, ang, R + 0.75);
        b.box([1.5, 0.14, 0.75], p, grate, [0, ang, 0]);
        const rail = on(lat, ang, R + 1.5); rail[1] += 1.1;
        if (lastRail) b.rod(lastRail, rail, 0.07, railHex, 0.07, 4);
        if (k % 3 === 0) b.rod([on(lat, ang, R + 1.5)[0], p[1], on(lat, ang, R + 1.5)[2]], rail, 0.06, railHex, 0.06, 4);
        if (k % 6 === 0) b.rod(on(lat, ang, R), p, 0.09, '#55595a', 0.09, 4);
        lastRail = rail;
      }
      const foot = on(-0.35, startAng, R + 0.75), ground: P = [foot[0] + Math.sin(startAng - 1.3) * foot[1] * 1.1, 0, foot[2] + Math.cos(startAng - 1.3) * foot[1] * 1.1];
      for (let k = 0; k <= 16; k++) { const t = k / 16; b.box([1.5, 0.14, 0.75], [mix(ground[0], foot[0], t), mix(0.1, foot[1], t), mix(ground[2], foot[2], t)], grate, [0, startAng - 1.3, 0]); }
      for (const off of [-0.7, 0.7]) b.rod([ground[0] + off * Math.cos(startAng - 1.3), 1.1, ground[2] - off * Math.sin(startAng - 1.3)], [foot[0] + off * Math.cos(startAng - 1.3), foot[1] + 1.1, foot[2] - off * Math.sin(startAng - 1.3)], 0.07, railHex, 0.07, 4);
    } else if (a.access === 'ladder') {
      const ang = 0.9;
      let last: P = [Math.sin(ang) * (R + 0.6), 0, Math.cos(ang) * (R + 0.6)];
      for (let k = 0; k <= 22; k++) {
        const lat = mix(0, 1.4, k / 22), p = k === 0 ? [last[0], CY, last[2]] as P : on(lat, ang, R + 0.6);
        for (const off of [-0.35, 0.35]) b.rod([last[0] + off * Math.cos(ang), last[1], last[2] - off * Math.sin(ang)], [p[0] + off * Math.cos(ang), p[1], p[2] - off * Math.sin(ang)], 0.07, '#55595a', 0.07, 4);
        if (k > 0) { const hoop = s.ring(0.55, 0.05, on(lat, ang, R + 1.05), s.material(railHex)); hoop.lookAt(0, CY + Math.sin(lat) * R * 3, 0); hoop.rotation.set(Math.PI / 2 - lat * 0.9, ang, 0, 'YXZ'); }
        last = p;
      }
      for (let k = 0; k < 8; k++) { const hoop = s.ring(0.55, 0.05, [Math.sin(ang) * (R + 1.05), 2.5 + k * (CY - 2.5) / 8, Math.cos(ang) * (R + 1.05)], s.material(railHex)); hoop.rotation.x = Math.PI / 2; }
    } else {
      const tx = -(R + 4.5), tz = 0, TW = 4;
      b.within([tx, 0, tz], [0, 0, 0], () => {
        b.lattice(TW, 0, topY + 0.2, Math.round(topY / 4.5), 0.16, () => paint('#d8d8d2'));
        const flights = Math.round(topY / 4.5);
        for (let f = 0; f < flights; f++) { const y0 = (f * topY) / flights, y1 = ((f + 1) * topY) / flights, dir = f % 2 ? 1 : -1; b.box([TW - 0.4, 0.12, TW - 0.4], [0, y1 + 0.1, 0], grate); for (let st = 0; st < 6; st++) b.box([1.1, 0.1, 0.5], [0.9 * dir * (f % 2 ? 1 : 1) * 0 + (f % 2 ? 0.9 : -0.9), mix(y0, y1, (st + 0.5) / 6), dir * mix(-1.4, 1.4, (st + 0.5) / 6)], railHex); }
      });
      b.box([R + 2.5, 0.16, 1.4], [tx / 2 - 0.6, topY + 0.28, 0], grate);
      for (const z of [-0.7, 0.7]) b.rod([tx + TW / 2, topY + 1.4, z], [-2.6, topY + 1.4, z], 0.07, railHex, 0.07, 4);
    }

    // Fill line: from the south pole down and out to a valve skid.
    const pipe = s.material(new THREE.Color('#ecece6').lerp(rust, wear * 0.25), { roughness: 0.5 });
    const out = R + 9;
    s.tube([[0, CY - R + 0.3, 0], [0, 3.2, 0], [2.5, 1.4, 1], [out * 0.6, 1.2, 2.2], [out, 1.2, 2.2]], 0.7, pipe);
    s.tube([[sx, topY + 1, 0], [R * 0.75, CY + R * 0.72, -R * 0.2], [R * 1.02, CY, -R * 0.3], [R * 0.99, 2, -R * 0.3], [out * 0.8, 0.8, -1.5], [out, 0.8, -1.5]], 0.3, pipe);
    for (const x of [out * 0.45, out * 0.75]) { b.cyl(1, 1, 0.4, [x, 1.2, 2.2 * (x > out * 0.5 ? 1 : 0.83)], paint('#8f9596'), 12, [0, 0, Math.PI / 2]); b.box([0.5, 1.2, 1.8], [x + 0.9, 0.6, 2.2], '#aeaba0'); }
    const wheel = s.ring(0.7, 0.12, [out * 0.6, 3.1, 2.2], s.material('#c9311f'));
    wheel.rotation.x = Math.PI / 2;
    b.rod([out * 0.6, 1.8, 2.2], [out * 0.6, 3.1, 2.2], 0.12, '#55595a', 0.12, 5);
    if (level > 0) for (let k = 0; k < 10; k++) b.rod([mix(3, out, random()), 0.7, 2.2], [mix(3, out, random()), 0.7 - 0.2 - random() * 0.4, 2.2], 0.16, '#e9f6fb', 0.02, 4);

    // Surroundings.
    if (a.surround === 'berm') {
      const br = R + 13;
      const grass = new THREE.Color('#7d9650').lerp(new THREE.Color('#a39a62'), wear * 0.7);
      const ring = s.lathe([[br - 4, 0], [br - 1, 2.4], [br + 1, 2.4], [br + 4.5, 0]], s.material(grass, { roughness: 1, side: THREE.DoubleSide }));
      ring.castShadow = false;
      for (let i = 0; i < 40; i++) { const t = random() * 6.28, r = br + (random() - 0.5) * 5; b.rod([Math.sin(t) * r, 1.4, Math.cos(t) * r], [Math.sin(t) * r + (random() - 0.5), 2.6 + random() * 1.2, Math.cos(t) * r], 0.12, ['#6f8a45', '#8b9a52', '#a39b5a'][i % 3], 0.02, 4); }
    } else if (a.surround === 'dike') {
      const d = R + 11;
      for (const side of [-1, 1]) { b.box([d * 2 + 0.8, 2, 0.8], [0, 1, side * d], paint('#b3afa2', 0.3)); b.box([0.8, 2, d * 2 + 0.8], [side * d, 1, 0], paint('#b3afa2', 0.3)); }
      b.box([d * 2, 0.12, d * 2], [0, 0.06, 0], '#c2beb1');
      for (let k = 0; k < 5; k++) b.box([3, 0.05, 0.4], [d + 0.45, 1.9 - k * 0.001, -d + 3 + k * 2.2], k % 2 ? '#1c1d1f' : '#e5bd27', [0, Math.PI / 2, Math.PI / 2]);
      b.box([2.6, 0.12, 4], [out + 1, 2.2, 2], grate);
      for (let st = 0; st < 6; st++) b.box([2.2, 0.1, 0.5], [out + 1, 0.3 + st * 0.33, 4.2 + (6 - st) * 0.45], grate);
    } else {
      b.cyl(R + 12, R + 12, 0.14, [0, 0.07, 0], '#c2beb1', 32);
      b.box([4.5, 3.2, 3.6], [out + 2.5, 1.6, 0.4], paint('#d8d8d2', 0.5));
      b.box([4.9, 0.3, 4], [out + 2.5, 3.3, 0.4], paint('#2f5d8c', 0.5));
      for (let k = 0; k < 3; k++) b.cyl(0.4, 0.4, 2.4, [out - 2.5 + k * 1.3, 1.2, -4], ['#c9311f', '#e5bd27', '#d8d8d2'][k], 10);
      if (a.surround === 'tanker') {
        b.within([out - 2, 0, 9], [0, Math.PI / 2 + (random() - 0.5) * 0.3, 0], () => {
          b.cyl(1.4, 1.4, 11, [0, 2.6, -2], paint('#f1f1ec', 0.4), 16, [Math.PI / 2, 0, 0]);
          for (const z of [-7.5, 3.5]) b.ball(1.4, [0, 2.6, z], '#f1f1ec', [1, 1, 0.5], 12);
          b.box([2.6, 0.4, 12], [0, 1.1, -2], '#3a3d3e');
          b.box([2.6, 2.8, 2.6], [0, 2.2, 6.2], paint('#2f5d8c', 0.5));
          b.box([2.4, 1, 0.1], [0, 2.9, 7.52], '#22303a');
          for (const z of [-6.5, -5, 4.5, 6.6]) for (const x of [-1.25, 1.25]) b.cyl(0.6, 0.6, 0.45, [x, 0.6, z], '#1e2022', 12, [0, 0, Math.PI / 2]);
          b.box([1.6, 1.2, 0.06], [0, 2.6, -8.25], '#e5bd27');
        });
        s.tube([[out - 8, 1.8, 9.4], [out - 6, 0.4, 6], [out - 2, 0.3, 4.5], [out, 1.2, 2.4]], 0.22, s.material('#2b2d2e'));
      }
    }
    s.root.add(b.mesh({ metalness: 0.08 }));

    // Stencil and hazard diamond on the front of the sphere.
    const text = { lox: 'LOX', lh2: 'LH2', ln2: 'LN2', methane: 'CH4', empty: 'EMPTY', blank: '' }[a.contents];
    if (text) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#' + shell.color.getHexString();
      ctx.fillRect(0, 0, 512, 256);
      const hand = a.contents === 'empty';
      ctx.fillStyle = hand ? '#b3261a' : a.contents === 'methane' ? '#1b4f8f' : '#1c2a36';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${hand ? 'italic ' : ''}bold ${hand ? 120 : 150}px ${hand ? 'sans-serif' : 'monospace'}`;
      ctx.fillText(text, hand ? 256 : 190, 130, hand ? 480 : 330);
      if (!hand) {
        const hue = { lox: '#f2c81e', lh2: '#d8322a', ln2: '#3f9a4d', methane: '#d8322a' }[a.contents as 'lox' | 'lh2' | 'ln2' | 'methane'];
        ctx.save(); ctx.translate(430, 128); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#16181a'; ctx.fillRect(-56, -56, 112, 112);
        ctx.fillStyle = hue; ctx.fillRect(-48, -48, 96, 96);
        ctx.restore();
        ctx.fillStyle = '#16181a'; ctx.font = 'bold 54px monospace'; ctx.fillText(a.contents === 'lox' ? 'O' : a.contents === 'ln2' ? 'N' : '!', 430, 132);
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      patch(0.55 - 0.75, 1.5, 0.48, 0.75, new THREE.MeshStandardMaterial({ map, roughness: 0.55 }), 0.11);
    }

    // Vapour.
    const puffs: THREE.Mesh[] = [];
    const vapour = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.42, depthWrite: false, roughness: 1 });
    const drift = new THREE.Vector3(random() - 0.5, 0, random() - 0.5).normalize();
    const puff = (at: THREE.Vector3, size: P) => { const m = s.ball(size, at.toArray() as P, vapour, 10); m.castShadow = false; m.userData.home = at.clone(); m.userData.phase = random() * 6; puffs.push(m); };
    if (a.venting === 'wisp') for (let k = 0; k < 4; k++) puff(tip.clone().addScaledVector(drift, k * 1.3).add(new THREE.Vector3(0, k * 1.2, 0)), [0.5 + k * 0.35, 0.6 + k * 0.4, 0.5 + k * 0.35]);
    if (a.venting === 'plume') for (let k = 0; k < 9; k++) puff(tip.clone().addScaledVector(drift, k * 2.6).add(new THREE.Vector3(0, Math.sqrt(k) * 2.2, 0)), [1 + k * 0.75, 0.9 + k * 0.55, 1 + k * 0.75]);
    if (a.venting === 'fog') {
      for (let k = 0; k < 14; k++) { const t = random() * 6.28, r = R * mix(0.3, 1.5, random()); puff(new THREE.Vector3(Math.sin(t) * r, 1 + random() * 1.5, Math.cos(t) * r), [3 + random() * 3.5, 1 + random() * 1.2, 3 + random() * 3.5]); }
      for (let k = 0; k < 6; k++) { const t = random() * 6.28; puff(new THREE.Vector3(...on(-0.5 - random() * 0.7, t, R + 0.6)), [2.2, 2.8, 2.2]); }
    }
    let flame: THREE.Mesh | null = null;
    if (a.venting === 'flare') {
      flame = s.mesh(new THREE.ConeGeometry(0.9, 4.2, 10), new THREE.MeshBasicMaterial({ color: '#ff9a1f', transparent: true, opacity: 0.95, depthWrite: false }), [tip.x, tip.y + 2, tip.z]);
      flame.castShadow = false;
      const core = s.mesh(new THREE.ConeGeometry(0.45, 2.6, 8), new THREE.MeshBasicMaterial({ color: '#fff0a8', transparent: true, opacity: 0.95, depthWrite: false }), [tip.x, tip.y + 1.3, tip.z]);
      core.castShadow = false;
    }

    const energy = mix(0.3, 1.6, mood.energy);
    return s.finish({
      footprint: R + 6,
      update: (_dt, time) => {
        for (const m of puffs) { const home = m.userData.home as THREE.Vector3; m.position.y = home.y + Math.sin(time * 0.7 * energy + m.userData.phase) * 0.5; m.position.x = home.x + Math.cos(time * 0.5 * energy + m.userData.phase) * 0.5; }
        if (flame) { flame.scale.y = 1 + Math.sin(time * 11 * energy) * 0.18; flame.rotation.z = Math.sin(time * 7 * energy) * 0.12; }
      },
    });
  },
});
