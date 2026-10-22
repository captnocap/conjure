import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    pose: choice('How is the wheelchair standing?', {
      open: 'Open and square, footplates down, waiting for someone.',
      folded: 'Folded flat side to side, the seat sling peaked up, footplates flipped vertical.',
      transfer: 'Set for a transfer: footplates swung out to the sides, brakes on, turned slightly.',
    }),
    left: choice('If it is open, what has been left on it?', {
      nothing: 'Nothing: bare vinyl.',
      blanket: 'A blanket folded on the seat and trailing over the front edge.',
      visitor: 'A blanket with a visitor’s tote bag standing on it.',
      slippers: 'A seat cushion, and a pair of slippers on the footplates.',
      discharge: 'A wrapped bunch of flowers and a folder of papers: someone is going home.',
    }),
    vinyl: choice('What colour is the vinyl seat and back?', {
      black: 'Black, anonymous.',
      navy: 'Navy blue.',
      green: 'Institutional green.',
      burgundy: 'Burgundy, slightly glossy.',
      tan: 'Seventies orange-tan.',
    }),
    frame: choice('What is the frame like?', {
      chrome: 'Chrome tube, the classic.',
      black: 'Black powder-coat, newer.',
      blue: 'Chipped blue enamel, hospital fleet paint.',
      red: 'Red enamel, a porters’ chair meant to be spotted from a distance.',
    }),
    wheels: choice('What are the big wheels like?', {
      spoked: 'Wire-spoked wheels with grey tyres and chrome push rims.',
      mag: 'Moulded plastic five-spoke wheels with push rims.',
      transit: 'Small rear wheels with no push rims: an attendant chair that must be pushed.',
    }),
    stencil: choice('What is stencilled on the backrest?', {
      none: 'Nothing.',
      ward: 'WARD 7',
      xray: 'X-RAY',
      ae: 'A&E',
      property: 'DO NOT REMOVE',
      porters: 'PORTERS',
    }),
    extra: choice('What is mounted on the back?', {
      none: 'Nothing.',
      drip: 'A thin drip pole with a hanging bag.',
      oxygen: 'An oxygen cylinder in a rear holder.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const folded = a.pose === 'folded';
    const hw = folded ? 0.085 : 0.235;
    const frameColour = { chrome: '#d8dde0', black: '#26292c', blue: '#2f5f9c', red: '#b8342c' }[a.frame];
    const frame = s.material(frameColour, { metalness: a.frame === 'chrome' ? 0.9 : 0.25, roughness: a.frame === 'chrome' ? 0.22 : 0.5 });
    const chrome = s.material('#d8dde0', { metalness: 0.9, roughness: 0.22 });
    const vinylColour = { black: '#232528', navy: '#27365f', green: '#3d6b55', burgundy: '#6b2531', tan: '#b06a34' }[a.vinyl];
    const vinyl = s.material(vinylColour, { roughness: 0.42, side: THREE.DoubleSide });
    const rubber = s.material('#8c9094', { roughness: 0.9 });
    const black = s.material('#222426', { roughness: 0.8 });
    const SEAT = 0.5, AXZ = -0.17, FRONT = 0.2;
    const big = a.wheels !== 'transit';
    const R = big ? 0.3 : 0.16;

    // ---- Rear wheels.
    for (const side of [-1, 1]) {
      const w = new Sculpture(context);
      w.ring(R - 0.018, 0.018, [0, 0, 0], a.wheels === 'spoked' ? rubber : black);
      w.ring(R - 0.04, 0.008, [0, 0, 0], a.wheels === 'spoked' ? chrome : s.material('#3a3d40'));
      const hub = w.cylinder(0.03, 0.03, 0.07, [0, 0, 0], chrome, 12); hub.rotation.x = Math.PI / 2;
      if (a.wheels === 'spoked') {
        const spokes = 18, list = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0022, 0.0022, R - 0.05, 4), chrome, spokes);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let i = 0; i < spokes; i++) {
          const t = i / spokes * Math.PI * 2;
          q.setFromEuler(e.set((i % 2 ? 1 : -1) * 0.07, 0, t + (i % 2 ? 0.12 : -0.12)));
          m.compose(new THREE.Vector3(-Math.sin(t) * (R - 0.05) / 2, Math.cos(t) * (R - 0.05) / 2, 0), q, new THREE.Vector3(1, 1, 1));
          list.setMatrixAt(i, m);
        }
        list.castShadow = true; w.root.add(list);
      } else {
        const n = a.wheels === 'mag' ? 5 : 3;
        for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; const sp = w.box([0.035, R - 0.045, 0.016], [-Math.sin(t) * (R - 0.045) / 2, Math.cos(t) * (R - 0.045) / 2, 0], s.material('#3a3d40')); sp.rotation.z = t; }
      }
      if (big) {
        w.ring(R - 0.05, 0.007, [0, 0, side * 0.032], chrome);
        for (let i = 0; i < 4; i++) { const t = i / 4 * Math.PI * 2 + 0.4; w.rod([Math.cos(t) * (R - 0.04), Math.sin(t) * (R - 0.04), 0], [Math.cos(t) * (R - 0.05), Math.sin(t) * (R - 0.05), side * 0.032], 0.004, chrome); }
      }
      w.root.rotation.y = Math.PI / 2;
      w.root.rotation.z = random() * 6.3;
      w.root.rotation.order = 'YXZ';
      w.root.position.set(side * (hw + 0.045), R, AXZ);
      s.root.add(w.root);
      s.rod([side * hw, R, AXZ], [side * (hw + 0.05), R, AXZ], 0.012, chrome);

      // ---- Side frame.
      const x = side * hw;
      s.tube([[x, big ? 0.3 : R, AXZ], [x, SEAT, AXZ - 0.02], [x, 0.9, AXZ - 0.05], [x, 0.935, AXZ - 0.08], [x, 0.94, AXZ - 0.19]], 0.012, frame);
      s.rod([x, 0.94, AXZ - 0.13], [x, 0.94, AXZ - 0.21], 0.017, black);
      s.rod([x, SEAT, AXZ - 0.02], [x, SEAT, FRONT], 0.012, frame);
      s.rod([x, 0.3, AXZ], [x, 0.3, FRONT + 0.01], 0.011, frame);
      s.tube([[x, SEAT, FRONT], [x, 0.3, FRONT + 0.015], [x, 0.2, FRONT + 0.03]], 0.012, frame);
      // Armrest loop with pad and skirt guard.
      s.tube([[x, SEAT, AXZ + 0.0], [x, 0.71, AXZ - 0.03], [x, 0.725, AXZ + 0.02], [x, 0.725, 0.1], [x, 0.7, 0.14], [x, SEAT, 0.15]], 0.011, frame);
      s.box([0.045, 0.028, 0.25], [x, 0.745, AXZ + 0.15], black);
      s.box([0.005, 0.17, 0.27], [x, 0.6, AXZ + 0.15], s.material('#3a3d40', { roughness: 0.6 }));
      // Brake lever against the tyre.
      if (big) {
        const on = a.pose === 'transfer' ? 0.06 : 0;
        s.rod([side * (hw + 0.03), SEAT - 0.04, 0.09], [side * (hw + 0.035), SEAT + 0.1, 0.15 - on], 0.006, chrome);
        s.ball([0.014, 0.014, 0.014], [side * (hw + 0.035), SEAT + 0.105, 0.15 - on], a.pose === 'transfer' ? s.material('#c8362c') : black, 8);
        s.box([0.02, 0.03, 0.05], [side * (hw + 0.03), SEAT - 0.05, 0.1], chrome);
      }
      // Front castor.
      const c = new Sculpture(context);
      const cw = c.cylinder(0.07, 0.07, 0.028, [0, 0.07, -0.03], rubber, 18); cw.rotation.z = Math.PI / 2;
      const ch = c.cylinder(0.03, 0.03, 0.032, [0, 0.07, -0.03], s.material('#e6e6e0'), 10); ch.rotation.z = Math.PI / 2;
      for (const f of [-1, 1]) c.box([0.005, 0.1, 0.03], [f * 0.019, 0.12, -0.02], chrome);
      c.box([0.045, 0.012, 0.04], [0, 0.17, -0.01], chrome);
      c.cylinder(0.011, 0.011, 0.05, [0, 0.19, 0], chrome, 8);
      c.root.position.set(x, 0, FRONT + 0.03);
      c.root.rotation.y = (random() - 0.5) * mix(0.4, 3.2, mood.energy);
      s.root.add(c.root);

      // ---- Footrest: hanger and plate, hinged on the front post.
      const f = new Sculpture(context);
      f.tube([[0, 0, 0], [0, -0.05, 0.07], [0, -0.3, 0.2], [0, -0.345, 0.21]], 0.011, frame);
      const plate = new Sculpture(context);
      plate.box([0.15, 0.014, 0.13], [-side * 0.075, 0, 0.02], s.material('#3a3d40', { roughness: 0.6 }));
      plate.tube([[-side * 0.02, 0.005, -0.04], [-side * 0.075, 0.03, -0.09], [-side * 0.13, 0.005, -0.04]], 0.006, black);
      plate.root.position.set(0, -0.35, 0.21);
      if (folded) plate.root.rotation.z = side * 1.45;
      f.root.add(plate.root);
      f.root.position.set(x, SEAT - 0.03, FRONT);
      if (a.pose === 'transfer') f.root.rotation.y = side * mix(1.2, 1.9, random());
      s.root.add(f.root);
    }
    // Cross brace under the seat.
    for (const dir of [-1, 1]) s.rod([dir * hw, 0.3, dir * 0.03], [-dir * hw, SEAT - 0.02, dir * 0.03], 0.011, frame);
    s.cylinder(0.014, 0.014, 0.08, [0, (0.3 + SEAT - 0.02) / 2, 0], chrome, 8).rotation.x = Math.PI / 2;

    // ---- Slings.
    const sling = (width: number, length: number, shape: (u: number, v: number) => P3) => {
      const g = new THREE.PlaneGeometry(1, 1, 12, 6);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, ...shape(p.getX(i) * 2, p.getY(i) + 0.5));
      g.computeVertexNormals();
      void width; void length;
      return s.mesh(g, vinyl);
    };
    const z0 = AXZ + 0.0, z1 = FRONT - 0.01;
    sling(0, 0, (u, v) => [u * hw, SEAT + 0.008 + (folded ? (1 - Math.abs(u)) * 0.2 : -(1 - u * u) * 0.025), mix(z0, z1, v)]);
    sling(0, 0, (u, v) => [u * hw, mix(SEAT + 0.12, 0.9, v), AXZ - 0.03 - v * 0.03 - (folded ? (1 - Math.abs(u)) * 0.14 : (1 - u * u) * 0.03)]);
    const stencil = { none: '', ward: 'WARD 7', xray: 'X-RAY', ae: 'A&E', property: 'DO NOT REMOVE', porters: 'PORTERS' }[a.stencil];
    if (stencil && !folded) {
      const paint = '#' + new THREE.Color('#f2efe2').lerp(new THREE.Color(vinylColour), mood.wear * 0.45).getHexString();
      for (const face of [1, -1]) {
        const tag = s.label(stencil, 0.3, 0.085, [0, 0.74, face > 0 ? AXZ - 0.047 : AXZ - 0.092], paint, vinylColour);
        if (face < 0) tag.rotation.y = Math.PI;
        tag.castShadow = false;
      }
    }
    if (mood.wear > 0.55 && !folded) {
      const tape = s.box([0.12, 0.004, 0.05], [mix(-0.1, 0.1, random()), SEAT - 0.005, FRONT - 0.04], s.material('#aeb4b6', { metalness: 0.5, roughness: 0.4 }));
      tape.rotation.y = (random() - 0.5) * 0.8;
    }

    // ---- What was left on it.
    const left = folded ? 'nothing' : a.left;
    const seatY = SEAT - 0.012;
    const cloths = ['#8fb4d6', '#d9c6a0', '#c98a8a', '#8fb89a', '#a99bc4', '#d8d4c8'];
    if (left === 'blanket' || left === 'visitor') {
      const colour = new THREE.Color(cloths[Math.floor(random() * cloths.length)]).lerp(new THREE.Color('#9a9c9c'), (1 - mood.cheer) * 0.3);
      const wool = s.material(colour, { roughness: 1, side: THREE.DoubleSide });
      for (let i = 0; i < 2; i++) s.box([0.4 - i * 0.02, 0.03, 0.3 - i * 0.02], [(random() - 0.5) * 0.02, seatY + 0.02 + i * 0.03, 0.0 + i * 0.01], wool).rotation.y = (random() - 0.5) * 0.1;
      // The loose end spilling over the front edge.
      const g = new THREE.PlaneGeometry(0.36, 0.5, 10, 12);
      const p = g.attributes.position, ph = random() * 6, drop = mix(0.18, 0.36, random());
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), t = p.getY(i) / 0.5 + 0.5; // 0 front hem .. 1 back on the seat
        const over = Math.max(0, 0.55 - t) / 0.55;
        p.setXYZ(i, x * (1 - over * 0.2) + Math.sin(t * 5 + ph) * 0.01, seatY + 0.085 - over * drop + Math.sin(x * 25 + ph) * 0.012 * over, 0.05 + (1 - t) * 0.2 - over * over * 0.03 + Math.sin(x * 18 + ph) * 0.015 * over);
      }
      g.computeVertexNormals();
      s.mesh(g, wool).position.x = (random() - 0.5) * 0.06;
      if (a.left === 'blanket' && mood.cheer > 0.5) for (let i = 0; i < 4; i++) s.box([0.36, 0.004, 0.012], [0, seatY + 0.082, -0.1 + i * 0.05], s.material('#f2efe2'));
    }
    if (left === 'visitor') {
      const tote = s.material(['#c9a24a', '#d8d2c0', '#3f6f8f', '#b5485a', '#4f7a55'][Math.floor(random() * 5)], { roughness: 0.9 });
      const bx = (random() - 0.5) * 0.12, bz = -0.06, by = seatY + 0.08;
      const body = s.mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.24, 4, 1), tote, [bx, by + 0.12, bz]);
      body.rotation.y = Math.PI / 4 + (random() - 0.5) * 0.3; body.scale.z = 0.5;
      for (const dz of [-0.035, 0.035]) s.tube([[bx - 0.06, by + 0.24, bz + dz], [bx - 0.04, by + 0.36, bz + dz * 1.5], [bx + 0.04, by + 0.36, bz + dz * 1.5], [bx + 0.06, by + 0.24, bz + dz]], 0.006, tote);
      // Things poking out: a thermos, a magazine, a scarf.
      s.cylinder(0.022, 0.022, 0.12, [bx - 0.05, by + 0.27, bz], s.material('#b7bcc0', { metalness: 0.7, roughness: 0.3 }), 10);
      s.box([0.12, 0.1, 0.008], [bx + 0.03, by + 0.27, bz], s.material('#e2574c')).rotation.z = 0.15;
    }
    if (left === 'slippers') {
      const cushion = s.material(['#6a8fb0', '#b56b5a', '#7d9a6a', '#c9b178'][Math.floor(random() * 4)], { roughness: 1 });
      const pad = s.ball([0.2, 0.045, 0.19], [0, seatY + 0.045, 0.01], cushion, 18); pad.rotation.y = (random() - 0.5) * 0.3;
      s.ball([0.012, 0.012, 0.012], [0, seatY + 0.085, 0.01], s.material('#f2efe2'), 8);
      const felt = s.material(mood.cheer > 0.5 ? '#c8563c' : '#6f5a4a', { roughness: 1 });
      for (const side of [-1, 1]) {
        const g = new Sculpture(context);
        g.ball([0.045, 0.02, 0.11], [0, 0.02, 0], felt, 12);
        g.ball([0.047, 0.035, 0.06], [0, 0.035, 0.05], felt, 12);
        g.root.position.set(side * (hw - 0.075) + (random() - 0.5) * 0.02, a.pose === 'transfer' ? 0 : 0.127, FRONT + 0.22);
        g.root.rotation.y = (random() - 0.5) * 0.5;
        s.root.add(g.root);
      }
    }
    if (left === 'discharge') {
      const b = new Sculpture(context);
      const wrap = s.material(mood.cheer > 0.5 ? '#f0e2b8' : '#d6d9d2', { roughness: 0.8, side: THREE.DoubleSide });
      b.mesh(new THREE.ConeGeometry(0.09, 0.34, 14, 1, true), wrap, [0, 0.17, 0]).rotation.z = Math.PI;
      const petals = ['#e2574c', '#f0b03a', '#e98aa8', '#f4f1e6', '#a06fc0'];
      for (let i = 0; i < 11; i++) { const t = random() * 6.3, r = random() * 0.065; b.ball([0.03, 0.028, 0.03], [Math.cos(t) * r, 0.34 + random() * 0.03, Math.sin(t) * r], s.material(petals[Math.floor(random() * petals.length)], { roughness: 0.8 }), 8); }
      for (let i = 0; i < 5; i++) { const t = random() * 6.3; b.ball([0.035, 0.008, 0.018], [Math.cos(t) * 0.08, 0.33, Math.sin(t) * 0.08], s.material('#4f8a52'), 6).rotation.y = -t; }
      b.ring(0.03, 0.006, [0, 0.1, 0], s.material('#c8362c')).rotation.x = Math.PI / 2;
      b.root.rotation.set(0, (random() - 0.5) * 0.6, -1.25);
      b.root.position.set(-0.16, seatY + 0.08, 0.02);
      s.root.add(b.root);
      const folder = s.box([0.23, 0.012, 0.31], [0.08, seatY + 0.012, 0.0], s.material('#d9b36a')); folder.rotation.y = (random() - 0.5) * 0.5;
      const sheet = s.box([0.2, 0.004, 0.28], [0.085, seatY + 0.021, 0.01], s.material('#f6f4ec')); sheet.rotation.y = folder.rotation.y + 0.08;
    }

    // ---- Rear mounts.
    if (a.extra === 'drip') {
      const px = hw + 0.0, pz = AXZ - 0.07;
      s.rod([px, 0.5, pz], [px, 1.75, pz], 0.008, chrome);
      for (const d of [-1, 1]) s.tube([[px, 1.75, pz], [px + d * 0.06, 1.78, pz], [px + d * 0.09, 1.73, pz]], 0.005, chrome);
      const bag = s.mesh(new THREE.CapsuleGeometry(0.05, 0.11, 4, 12), new THREE.MeshStandardMaterial({ color: '#cfe6ee', roughness: 0.15, transparent: true, opacity: 0.8 }), [px - 0.09, 1.61, pz]);
      bag.scale.z = 0.4;
      s.tube([[px - 0.09, 1.5, pz], [px - 0.1, 1.2, pz + 0.04], [px - 0.16, 0.9, pz + 0.16], [px - 0.2, 0.74, 0.02]], 0.004, new THREE.MeshStandardMaterial({ color: '#eef4f4', roughness: 0.3 }));
    }
    if (a.extra === 'oxygen') {
      const t = new Sculpture(context);
      t.lathe([[0, 0], [0.05, 0.005], [0.055, 0.03], [0.055, 0.42], [0.04, 0.49], [0.018, 0.52], [0.018, 0.56]], s.material('#3a8f5f', { metalness: 0.3, roughness: 0.4 }));
      t.cylinder(0.057, 0.057, 0.08, [0, 0.4, 0], s.material('#eef0ee'), 18);
      t.box([0.045, 0.045, 0.045], [0, 0.58, 0], s.material('#b89a4a', { metalness: 0.8, roughness: 0.3 }));
      t.root.position.set(0, 0.36, AXZ - 0.14);
      t.root.rotation.x = -0.12;
      s.root.add(t.root);
      s.ring(0.062, 0.006, [0, 0.52, AXZ - 0.15], black).rotation.x = Math.PI / 2;
      s.box([Math.max(0.05, hw * 2), 0.015, 0.02], [0, 0.52, AXZ - 0.08], black);
      s.box([0.13, 0.012, 0.13], [0, 0.355, AXZ - 0.14], black);
    }

    s.root.rotation.y = a.pose === 'transfer' ? (random() - 0.5) * 0.5 : 0;
    return s.finish();
  },
});
