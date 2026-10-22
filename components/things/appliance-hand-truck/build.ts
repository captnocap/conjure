import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    load: choice('What is on the hand truck?', {
      empty: 'Nothing: it stands empty, the job done or not yet begun.',
      boxes: 'A strapped stack of cardboard moving boxes.',
      fridge: 'A small white fridge with a few magnets still on the door.',
      washer: 'A washing machine with its porthole door and a hose taped to the top.',
      plant: 'A big potted rubber plant, the awkward living thing that travels last.',
      speaker: 'A battered black amplifier cabinet: a musician is moving.',
    }),
    paint: choice('What colour is its frame?', {
      orange: 'Rental-van orange, the hire company colour.',
      red: 'Old chipped fire-engine red.',
      blue: 'Workshop blue.',
      bare: 'Bare dull aluminium, a lightweight modern one.',
      green: 'Dark removal-firm green.',
    }),
    stance: choice('How has it been left?', {
      parked: 'Parked upright on its toe plate.',
      tilted: 'Tipped back on its wheels, mid-haul, as if someone just let go.',
      down: 'Laid flat on its back on the ground, whatever it carried stood beside it: unloaded.',
    }),
    handle: choice('What kind of handle does it have?', {
      loop: 'A single continuous hoop across the top.',
      horns: 'Two separate curved grips with rubber sleeves.',
      pistol: 'A tall P-shaped one-handed loop set to one side.',
    }),
    strap: choice('What secures the load?', {
      ratchet: 'A ratchet strap pulled tight with a steel buckle.',
      bungee: 'A pair of hooked bungee cords, crossed.',
      rope: 'Frayed old rope, knotted.',
      none: 'Nothing: a loose strap is just looped over the handle.',
    }),
    owner: choice('Whose hand truck is it?', {
      hire: 'Hired with the van: a HIRE sticker and an asset number.',
      friend: "Borrowed from a friend: a name in marker on a strip of tape.",
      work: 'Quietly borrowed from work: PROPERTY OF stencilled on it.',
      own: 'Their own, unmarked.',
    }),
    wheels: choice('What are its wheels like?', {
      pneumatic: 'Fat grey pneumatic tyres on red hubs.',
      solid: 'Small hard black rubber wheels.',
      stair: 'Three-wheeled stair-climbing clusters.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rig = new THREE.Group();
    let target: THREE.Object3D = rig;
    const add = <T extends THREE.Object3D>(o: T) => { target.add(o); o.traverse((n) => { if ((n as THREE.Mesh).isMesh) n.castShadow = n.receiveShadow = true; }); return o; };
    const paintHex = { orange: '#e8641b', red: '#b3261e', blue: '#2a5ea8', bare: '#b4b8ba', green: '#1f4b3a' }[a.paint];
    const paint = s.material(new THREE.Color(paintHex).lerp(new THREE.Color('#6b4a35'), mood.wear * 0.3), { metalness: a.paint === 'bare' ? 0.8 : 0.3, roughness: a.paint === 'bare' ? 0.4 : 0.5 });
    const steel = s.material('#9a9fa2', { metalness: 0.8, roughness: 0.4 });
    const rubber = s.material('#1d1d1f', { roughness: 0.9 });
    const tubeOf = (pts: [number, number, number][], r: number, mat: THREE.Material, tension = 0.25) =>
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', tension), 48, r, 8), mat));
    const box = (size: [number, number, number], at: [number, number, number], mat: THREE.Material | THREE.Material[]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...at); return add(m); };

    // --- frame
    const H = 1.22, half = 0.19, R = 0.016;
    const wheelR = a.wheels === 'pneumatic' ? 0.13 : a.wheels === 'solid' ? 0.085 : 0.075;
    const axleY = a.wheels === 'stair' ? 0.16 : wheelR, axleZ = -0.1;
    for (const sx of [-1, 1]) {
      const top: [number, number, number][] = a.handle === 'horns'
        ? [[sx * half, H, 0], [sx * half, H + 0.1, -0.04], [sx * half, H + 0.16, -0.14]]
        : [[sx * half, H, 0]];
      tubeOf([[sx * half, 0.02, 0], [sx * half, 0.5, 0], ...top], R, paint, 0.1);
      // brace from axle to rail
      tubeOf([[sx * half, 0.42, 0], [sx * half, axleY + 0.05, axleZ + 0.02], [sx * half, axleY, axleZ]], 0.012, paint, 0.1);
      if (a.handle === 'horns') { const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 10), rubber); grip.position.set(sx * half, H + 0.14, -0.105); grip.rotation.x = -1.0; add(grip); }
    }
    if (a.handle === 'loop') tubeOf([[-half, H - 0.02, 0], [-half, H + 0.12, -0.03], [-half * 0.6, H + 0.2, -0.06], [half * 0.6, H + 0.2, -0.06], [half, H + 0.12, -0.03], [half, H - 0.02, 0]], R, paint, 0.5);
    if (a.handle === 'pistol') {
      box([half * 2, 0.03, 0.03], [0, H, 0], paint);
      tubeOf([[half * 0.2, H, 0], [half * 0.2, H + 0.26, -0.06], [half * 0.5, H + 0.34, -0.08], [half * 0.9, H + 0.26, -0.06], [half * 0.9, H, 0]], R, paint, 0.5);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10), rubber); grip.position.set(half * 0.9, H + 0.14, -0.03); grip.rotation.x = -0.22; add(grip);
    }
    for (const y of [0.16, 0.5, 0.84, 1.14]) box([half * 2, 0.035, 0.012], [0, y, 0.006], paint);
    box([0.04, 0.98, 0.01], [0, 0.65, 0.008], paint);
    // toe plate, scuffed bright where loads slide on
    const pc = document.createElement('canvas'); pc.width = pc.height = 128; const pctx = pc.getContext('2d')!;
    pctx.fillStyle = paintHex; pctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 14 + mood.wear * 50; i++) { pctx.strokeStyle = `rgba(${random() < 0.7 ? '200,204,206' : '70,60,50'},${0.2 + random() * 0.3})`; pctx.lineWidth = 0.5 + random() * 1.4; const x = random() * 128, y = random() * 128; pctx.beginPath(); pctx.moveTo(x, y); pctx.lineTo(x + (random() - 0.5) * 16, y + 10 + random() * 50); pctx.stroke(); }
    pctx.fillStyle = 'rgba(200,204,206,0.75)'; pctx.fillRect(0, 108, 128, 20);
    const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
    const plateMat = new THREE.MeshStandardMaterial({ map: ptex, metalness: 0.5, roughness: 0.45 });
    const plateD = 0.24;
    box([half * 2 + 0.06, 0.008, plateD], [0, 0.012, plateD / 2 - 0.01], plateMat);
    box([half * 2 + 0.06, 0.05, 0.008], [0, 0.035, -0.012], paint);
    // axle and wheels
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, half * 2 + 0.2, 8), steel); axle.rotation.z = Math.PI / 2; axle.position.set(0, axleY, axleZ); add(axle);
    const spinners: THREE.Object3D[] = [];
    const wheel = (r: number, w: number) => {
      const g = new THREE.Group();
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(r - w * 0.42, w * 0.42, 10, 24), a.wheels === 'pneumatic' ? s.material('#4a4c4f', { roughness: 0.95 }) : rubber); tyre.rotation.y = Math.PI / 2; g.add(tyre);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r - w * 0.7, r - w * 0.7, w * 0.5, 16), a.wheels === 'pneumatic' ? s.material('#b3261e', { metalness: 0.3 }) : steel); hub.rotation.z = Math.PI / 2; g.add(hub);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, w * 0.62, 10), steel); cap.rotation.z = Math.PI / 2; g.add(cap);
      return g;
    };
    for (const sx of [-1, 1]) {
      const x = sx * (half + 0.075);
      if (a.wheels === 'stair') {
        const cluster = new THREE.Group(); cluster.position.set(x, axleY, axleZ);
        for (let k = 0; k < 3; k++) { const an = k * 2.094 + Math.PI / 6; const w = wheel(wheelR, 0.04); w.position.set(0, -Math.cos(an) * 0.098, Math.sin(an) * 0.098); cluster.add(w); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.03), steel); arm.position.set(-sx * 0.022, -Math.cos(an) * 0.05, Math.sin(an) * 0.05); arm.rotation.x = -an; cluster.add(arm); }
        cluster.rotation.x = Math.PI; add(cluster);
      } else { const w = wheel(wheelR, a.wheels === 'pneumatic' ? 0.075 : 0.045); w.position.set(x, axleY, axleZ); w.rotation.x = random() * 6; add(w); spinners.push(w); }
    }
    // owner's mark
    if (a.owner !== 'own') {
      const text = { hire: 'HIRE 0' + Math.floor(10 + random() * 89), friend: ['DAVE', 'SAL', 'MO', 'JEN', 'KIT'][Math.floor(random() * 5)], work: 'PROPERTY OF' }[a.owner];
      const mark = s.label(text, a.owner === 'friend' ? 0.2 : 0.34, 0.07, [0, 0, 0], a.owner === 'hire' ? '#ffffff' : '#1a1a1a', a.owner === 'hire' ? '#1d3f8f' : a.owner === 'friend' ? '#d9cfae' : '#e9e44a');
      mark.position.set(0, a.load === 'empty' || a.stance === 'down' ? 0.84 : 1.14, a.load === 'empty' || a.stance === 'down' ? 0.016 : -0.012); if (a.load !== 'empty' && a.stance !== 'down') mark.rotation.y = Math.PI; mark.rotation.z = a.owner === 'friend' ? 0.05 : 0; rig.add(mark);
      if (a.load !== 'empty' && a.stance !== 'down') { const twin = mark.clone(); twin.rotation.y = 0; twin.position.z = 0.016; rig.add(twin); }
    }

    // --- load: stands on the plate against the frame; returns its bounding size
    let lw = 0, lh = 0, ld = 0;
    const cargo = new THREE.Group(); rig.add(cargo); target = cargo;
    const unloaded = a.stance === 'down';
    const z0 = 0.016;
    const white = s.material(new THREE.Color('#f2f1ec').lerp(new THREE.Color('#d9cfa8'), mood.wear * 0.6), { roughness: 0.35 });
    if (a.load === 'boxes') {
      const board = s.material('#b98d5c', { roughness: 0.92 }), tape = s.material('#8a5a2b', { roughness: 0.5 });
      const n = 2 + Math.round(mood.density * 2);
      const names = ['KITCHEN', 'BOOKS', 'FRAGILE', 'MISC', 'BEDROOM', 'PHOTOS', 'RECORDS'];
      let y = 0.018; lw = 0.5; ld = 0.42;
      for (let i = 0; i < n; i++) {
        const w = 0.5 - i * 0.03 - random() * 0.03, h = mix(0.26, 0.36, random()), d = 0.42 - i * 0.02;
        const bx = box([w, h, d], [(random() - 0.5) * 0.03, y + h / 2, z0 + d / 2], board); bx.rotation.y = (random() - 0.5) * 0.06;
        box([0.05, 0.004, d + 0.004], [bx.position.x, y + h + 0.001, z0 + d / 2], tape);
        const text = s.label(names[Math.floor(random() * names.length)], w * 0.8, h * 0.42, [0, 0, 0], '#161616', '#b98d5c');
        text.position.set(bx.position.x, y + h * 0.5, z0 + d + 0.003); text.rotation.z = (random() - 0.5) * 0.12; cargo.add(text);
        y += h + 0.006;
      }
      lh = y;
    } else if (a.load === 'fridge') {
      lw = 0.5; lh = 0.86; ld = 0.5;
      box([lw, lh - 0.03, ld - 0.04], [0, 0.018 + 0.03 + (lh - 0.03) / 2, z0 + (ld - 0.04) / 2], white);
      box([lw, lh * 0.7, 0.04], [0, 0.05 + lh * 0.35, z0 + ld - 0.02], white);
      box([lw, lh * 0.25, 0.04], [0, 0.058 + lh * 0.7 + lh * 0.125, z0 + ld - 0.02], white);
      for (const y of [0.4, 0.78]) box([0.025, 0.14, 0.025], [-lw / 2 + 0.05, y, z0 + ld + 0.012], steel);
      for (let i = 0; i < 2 + Math.round(mood.density * 5); i++) box([0.03 + random() * 0.03, 0.03 + random() * 0.03, 0.006], [(random() - 0.3) * lw * 0.6, 0.2 + random() * 0.4, z0 + ld + 0.003], s.material(['#d8362f', '#f6d23c', '#2c9a57', '#1f77c9', '#f2f2f2'][i % 5]));
      const note = box([0.1, 0.12, 0.003], [0.08, 0.72, z0 + ld + 0.002], s.material('#f8f4e4')); note.rotation.z = 0.08;
      for (const sx of [-1, 1]) for (const sz of [0.06, ld - 0.08]) box([0.04, 0.03, 0.04], [sx * (lw / 2 - 0.05), 0.033, z0 + sz], rubber);
    } else if (a.load === 'washer') {
      lw = 0.6; lh = 0.85; ld = 0.52;
      box([lw, lh, ld], [0, 0.018 + lh / 2, z0 + ld / 2], white);
      box([lw - 0.02, 0.11, 0.006], [0, 0.018 + lh - 0.075, z0 + ld + 0.003], s.material('#d5d8da', { roughness: 0.3 }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 10, 32), s.material('#c3c7c9', { metalness: 0.6, roughness: 0.3 })); ring.position.set(0, 0.42, z0 + ld + 0.01); add(ring);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 10, 0, Math.PI * 2, 0, 1.1), s.material('#27323a', { roughness: 0.1, metalness: 0.4 })); glass.rotation.x = Math.PI / 2; glass.position.set(0, 0.42, z0 + ld - 0.07); add(glass);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 14), steel); dial.rotation.x = Math.PI / 2; dial.position.set(0.19, 0.018 + lh - 0.075, z0 + ld + 0.014); add(dial);
      box([0.16, 0.06, 0.006], [-0.18, 0.018 + lh - 0.075, z0 + ld + 0.008], white);
      tubeOf([[0.2, lh - 0.1, z0 - 0.0], [0.24, lh + 0.05, z0 + 0.05], [0.12, lh + 0.035, z0 + 0.2], [-0.1, lh + 0.035, z0 + 0.14], [-0.16, lh + 0.035, z0 + 0.3], [0.02, lh + 0.035, z0 + 0.36]], 0.014, s.material('#8c9094'), 0.5);
      box([0.09, 0.004, 0.05], [0.0, lh + 0.05, z0 + 0.22], s.material('#b99a63')).rotation.y = 0.6;
    } else if (a.load === 'plant') {
      lw = 0.44; lh = 0.4; ld = 0.44;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.38, 22), s.material('#b5613f', { roughness: 0.85 })); pot.position.set(0, 0.018 + 0.19, z0 + 0.22); add(pot);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 8, 24), pot.material); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.39, z0 + 0.22); add(rim);
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 18), s.material('#3b2a1f')); soil.position.set(0, 0.385, z0 + 0.22); add(soil);
      const leafMat = s.material(new THREE.Color('#2f6b3a').lerp(new THREE.Color('#8a8440'), mood.wear * 0.7), { roughness: 0.45, side: THREE.DoubleSide });
      const stems = 2 + Math.round(random() * 2);
      for (let k = 0; k < stems; k++) {
        const lean = (random() - 0.5) * 0.3, top = 0.75 + random() * 0.45, sxp = (random() - 0.5) * 0.14, szp = z0 + 0.22 + (random() - 0.2) * 0.12;
        tubeOf([[sxp, 0.38, szp], [sxp + lean * 0.3, 0.38 + top / 2, szp + 0.03], [sxp + lean, 0.38 + top, szp + 0.08]], 0.012, s.material('#5a4a32'));
        const leaves = 5 + Math.round(mood.density * 4);
        for (let i = 0; i < leaves; i++) {
          const f = (i + 1) / leaves, an = i * 2.4 + k, len = 0.2 + random() * 0.1;
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), leafMat); leaf.scale.set(0.07, 0.008, len / 2); leaf.position.set(0, 0, len / 2 + 0.01);
          const droop = new THREE.Group(); droop.rotation.x = mix(-0.5, 0.5, mood.wear) + random() * 0.4; droop.add(leaf);
          const turn = new THREE.Group(); turn.rotation.y = an; turn.position.set(sxp + lean * f, 0.42 + top * f, szp + 0.08 * f); turn.add(droop); add(turn);
        }
      }
    } else if (a.load === 'speaker') {
      lw = 0.58; lh = 0.78; ld = 0.36;
      box([lw, lh, ld], [0, 0.018 + lh / 2, z0 + ld / 2], s.material('#1b1b1d', { roughness: 0.95 }));
      box([lw - 0.06, lh * 0.66, 0.008], [0, 0.018 + lh * 0.37, z0 + ld + 0.004], s.material('#3a3632', { roughness: 1 }));
      for (const [x, y, r] of [[-0.13, 0.2, 0.11], [0.13, 0.2, 0.11], [-0.13, 0.44, 0.11], [0.13, 0.44, 0.11]]) { const cone = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 22), s.material('#151515')); cone.position.set(x, y, z0 + ld + 0.01); add(cone); }
      box([lw - 0.06, 0.1, 0.01], [0, 0.018 + lh - 0.09, z0 + ld + 0.005], s.material('#c9b25a', { metalness: 0.7, roughness: 0.35 }));
      for (let i = 0; i < 6; i++) { const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 10), rubber); knob.rotation.x = Math.PI / 2; knob.position.set(-0.2 + i * 0.08, 0.018 + lh - 0.09, z0 + ld + 0.018); add(knob); }
      for (const sx of [-1, 1]) for (const sy of [0.03, lh]) for (const sz of [0, ld]) box([0.05, 0.05, 0.05], [sx * (lw / 2 - 0.02), sy + 0.005, z0 + sz + (sz ? -0.02 : 0.02)], steel);
      tubeOf([[-0.1, lh + 0.02, z0 + ld / 2], [0, lh + 0.07, z0 + ld / 2], [0.1, lh + 0.02, z0 + ld / 2]], 0.012, rubber, 0.5);
    }

    target = rig;
    if (unloaded) { s.root.add(cargo); cargo.position.set(-(0.55 + lw / 2), -0.018, 0.25); cargo.rotation.y = 0.5 + random() * 0.4; }
    // --- strap
    const strapHex = mood.cheer > 0.6 ? '#f2c318' : mood.cheer > 0.3 ? '#e2661d' : '#2c4f9e';
    const strapMat = s.material(strapHex, { roughness: 0.8 });
    let tail: THREE.Object3D | null = null;
    const loaded = a.load !== 'empty';
    if (loaded && !unloaded && a.strap !== 'none') {
      const band = (y: number, mat: THREE.Material, hgt: number, slant = 0) => {
        const zf = z0 + ld + 0.012, zb = -0.022, hw = Math.max(lw / 2, half) + 0.012;
        const g = new THREE.Group();
        const f = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, hgt, 0.004), mat); f.position.set(0, y, zf); f.rotation.z = slant; g.add(f);
        const bk = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.04, hgt, 0.004), mat); bk.position.set(0, y, zb); g.add(bk);
        for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.004, hgt, zf - zb), mat); side.position.set(sx * hw, y + sx * slant * hw, (zf + zb) / 2); g.add(side); }
        add(g); return zf;
      };
      const y = Math.min(lh * 0.62, 0.95) + 0.02;
      if (a.strap === 'ratchet') {
        const zf = band(y, strapMat, 0.045);
        box([0.09, 0.07, 0.03], [lw * 0.18, y, zf + 0.016], steel);
        const lever = box([0.07, 0.02, 0.09], [lw * 0.18, y + 0.03, zf + 0.05], s.material('#2a2a2c', { metalness: 0.6 })); lever.rotation.x = 0.5;
        const t = new THREE.Group(); t.position.set(lw * 0.18 - 0.05, y - 0.02, zf + 0.008);
        const piece = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.004), strapMat); piece.position.y = -0.15; t.add(piece); add(t); tail = t;
      } else if (a.strap === 'bungee') {
        const cord = s.material(mood.cheer > 0.5 ? '#2c9a57' : '#b3262b', { roughness: 0.7 });
        band(y, cord, 0.016, 0.35); band(y, s.material('#1d1d1f'), 0.016, -0.35);
        for (const sx of [-1, 1]) tubeOf([[sx * (half + 0.02), y + 0.05, -0.02], [sx * (half + 0.03), y + 0.08, -0.05], [sx * (half + 0.02), y + 0.1, -0.02]], 0.004, steel, 0.5);
      } else {
        const rope = s.material('#c9b07a', { roughness: 1 });
        band(y, rope, 0.018, 0.06); band(y - 0.2, rope, 0.018, -0.05);
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), rope); knot.position.set(0.05, y, z0 + ld + 0.03); add(knot);
        const t = new THREE.Group(); t.position.copy(knot.position); const piece = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.2, 6), rope); piece.position.y = -0.1; t.add(piece); add(t); tail = t;
      }
    } else {
      // a spare strap looped over a cross bar, its end hanging
      const t = new THREE.Group(); t.position.set(half * 0.5, 1.14, 0.02);
      const piece = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.5, 0.004), strapMat); piece.position.y = -0.25; t.add(piece);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12, 4.4), steel); hook.position.y = -0.52; t.add(hook);
      add(t); tail = t;
      box([0.05, 0.05, 0.035], [half * 0.5, 1.14, 0], strapMat);
      if (a.strap === 'ratchet') box([0.08, 0.06, 0.03], [half * 0.5, 0.95, 0.03], steel);
    }

    // --- stance
    const pivot = new THREE.Group(); rig.position.set(0, -axleY, -axleZ); pivot.add(rig); pivot.position.set(0, axleY, axleZ); s.root.add(pivot);
    const tilt = a.stance === 'tilted' ? mix(0.45, 0.7, random()) : a.stance === 'down' ? Math.PI / 2 - 0.12 : 0;
    pivot.rotation.x = -tilt; pivot.rotation.y = (random() - 0.5) * 0.3;
    if (a.stance === 'down') { pivot.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(pivot); pivot.position.y -= b.min.y; }
    if (tail) tail.rotation.x = tilt; // hangs plumb whatever the tilt

    const sway = mood.energy * 0.12, phase = random() * 6;
    const hang = tail as THREE.Object3D | null;
    return s.finish({ update: (_dt, time) => { if (hang && a.stance !== 'down') hang.rotation.z = Math.sin(time * 2.1 + phase) * sway; } });
  },
});
