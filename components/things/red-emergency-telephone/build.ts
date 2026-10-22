import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const SIGNS = { none: '', hotline: 'HOTLINE', emergency: 'EMERGENCY ONLY', direct: 'DIRECT LINE', lift: 'LIFT TO TALK', never: 'DO NOT ANSWER' } as const;

export default defineThing({
  questions: {
    state: choice('What is the telephone doing?', {
      waiting: 'Waiting: handset square on its cradle, silent, as it has been for years.',
      ringing: 'Ringing: the lamp blazing, the handset shivering on the cradle.',
      offhook: 'Off the hook: the handset dangling at the end of its coiled cord, swinging.',
      laid: 'Laid down mid-call beside the phone, the line still open, someone gone to fetch someone.',
      dead: 'Dead: the cord cut, the handset lying on the floor.',
    }),
    mount: choice('Where does it sit?', {
      pedestal: 'Alone on a slim steel pedestal, like an exhibit.',
      table: 'On a small bare steel table with a notepad.',
      niche: 'In an open steel wall box on a slab of wall, at chest height.',
    }),
    lamp: choice('What kind of lamp is over it?', {
      beacon: 'A red signal dome on a short stalk.',
      gooseneck: 'A gooseneck desk lamp bent low over the phone, pooling light on it.',
      cage: 'A bulkhead lamp in a wire cage, bunker style.',
      sign: 'A small illuminated sign box.',
    }),
    cover: choice('How is the phone protected?', {
      none: 'Not at all: anyone could lift it.',
      dome: 'Under a clear glass dome, like a cake or a relic.',
      chained: 'The handset is chained and padlocked to the body.',
      seal: 'A paper seal and a ribbon lie across the handset, to show if it has been lifted.',
    }),
    style: choice('What style is the telephone?', {
      bakelite: 'A rounded 1950s bakelite desk set, heavy and glossy.',
      modern: 'A square-edged 1970s plastic set.',
    }),
    face: choice('What is where the dial should be?', {
      blank: 'A blank smooth disc.',
      star: 'A gold star emblem.',
      button: 'One white push button.',
      keyhole: 'A small brass keyhole.',
    }),
    sign: choice('What does the sign with it say?', {
      none: 'There is no sign.',
      hotline: 'HOTLINE',
      emergency: 'EMERGENCY ONLY',
      direct: 'DIRECT LINE',
      lift: 'LIFT TO TALK',
      never: 'DO NOT ANSWER',
    }),
    red: choice('What red is it?', {
      signal: 'Bright signal red.',
      oxblood: 'Dark oxblood, almost brown in shadow.',
      orange: 'Orange-red plastic, a little faded.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const redHex = { signal: '#d21f17', oxblood: '#8a1a16', orange: '#e2482a' }[a.red];
    const red = s.material(redHex, { roughness: a.style === 'bakelite' ? 0.22 : 0.4 });
    const steel = s.material('#8d9698', { roughness: 0.45, metalness: 0.4 });
    const dark = s.material('#1d2022', { roughness: 0.6 });
    const chrome = s.material('#d2d6d7', { metalness: 0.85, roughness: 0.25 });
    const k = 1.35;
    const T = { pedestal: 0.95, table: 0.74, niche: 1.02 }[a.mount];
    const live = a.state !== 'dead';
    const ringing = a.state === 'ringing';
    const onCradle = a.state === 'waiting' || ringing;

    // The stand.
    let half = 0.3;
    if (a.mount === 'pedestal') {
      s.cylinder(0.05, 0.06, T - 0.04, [0, (T - 0.04) / 2, 0], steel, 20);
      s.lathe([[0.3, 0], [0.3, 0.025], [0.12, 0.06], [0.07, 0.16], [0.06, 0.16]], steel);
      s.box([0.66, 0.04, 0.46], [0, T - 0.02, 0], steel);
      s.box([0.6, 0.006, 0.4], [0, T + 0.002, 0], s.material('#3a3d40', { roughness: 0.9 }));
      half = 0.33;
    } else if (a.mount === 'table') {
      s.box([0.9, 0.035, 0.58], [0, T - 0.0175, 0], steel);
      s.box([0.84, 0.08, 0.52], [0, T - 0.075, 0], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, T - 0.035, 0.035], [x * 0.41, (T - 0.035) / 2, z * 0.25], steel);
      s.rod([-0.41, 0.16, -0.25], [0.41, 0.16, -0.25], 0.012, steel);
      const pad = s.box([0.15, 0.012, 0.21], [-0.3, T + 0.006, 0.12], s.material('#f1ecdc', { roughness: 0.9 }));
      pad.rotation.y = (random() - 0.5) * 0.5;
      s.rod([-0.2, T + 0.006, 0.05], [-0.16, T + 0.006, 0.2], 0.005, s.material('#d9a514'));
      half = 0.45;
    } else {
      const wall = s.material(mood.wear > 0.6 ? '#b3b09c' : '#d5d8c8', { roughness: 0.9 });
      s.box([0.98, 1.98, 0.14], [0, 0.99, -0.3], wall);
      s.box([0.98, 0.9, 0.145], [0, 0.45, -0.3], s.material('#9fb3a2', { roughness: 0.85 }));
      // Open-fronted steel box.
      const bw = 0.62, bh = 0.5, bd = 0.42;
      s.box([bw, 0.025, bd], [0, T - 0.0125, -0.02], steel);
      s.box([bw, 0.025, bd], [0, T + bh, -0.02], steel);
      for (const x of [-1, 1]) s.box([0.025, bh, bd], [x * (bw / 2 - 0.0125), T + bh / 2, -0.02], steel);
      s.box([bw, bh, 0.02], [0, T + bh / 2, -0.22], s.material('#5d6567', { roughness: 0.7 }));
      const door = s.box([0.02, bh + 0.02, bw * 0.9], [-bw / 2 - 0.01, T + bh / 2, 0.19 + bw * 0.45 - 0.02], steel);
      door.rotation.y = -0.35; door.position.x -= 0.1;
      s.rod([0.2, T + bh, -0.2], [0.2, 1.98, -0.2], 0.014, chrome);
      half = bw / 2;
    }

    // The telephone body.
    const phone = new THREE.Group();
    phone.position.set(0, T + 0.004, 0);
    phone.scale.setScalar(k);
    s.root.add(phone);
    const on = <T2 extends THREE.Object3D>(child: T2) => { phone.add(child); return child; };
    const round = a.style === 'bakelite';
    const shape = new THREE.Shape();
    ([[-0.11, 0], [0.115, 0], [0.115, 0.03], [0.035, 0.1], [-0.09, 0.1], [-0.11, 0.065]] as const).forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
    const bodyGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.19, bevelEnabled: true, bevelSize: round ? 0.014 : 0.003, bevelThickness: round ? 0.014 : 0.003, bevelSegments: round ? 4 : 1 });
    bodyGeometry.rotateY(-Math.PI / 2); bodyGeometry.translate(0.095, 0, 0);
    on(s.mesh(bodyGeometry, red));
    for (const x of [-1, 1]) {
      on(s.box([0.034, 0.04, 0.085], [x * 0.072, 0.115, -0.03], red));
      on(s.box([0.012, 0.012, 0.03], [x * 0.045, 0.108, -0.03], chrome));
    }
    // The place where the dial should be.
    const facePlate = new THREE.Group();
    facePlate.position.set(0, 0.066, 0.078);
    facePlate.rotation.x = -Math.atan2(0.08, 0.07);
    on(facePlate);
    const disc = s.cylinder(0.052, 0.052, 0.008, [0, 0, 0.005], a.face === 'blank' ? s.material(redHex, { roughness: 0.15 }) : dark, 28);
    disc.rotation.x = Math.PI / 2; facePlate.add(disc);
    facePlate.add(s.ring(0.054, 0.005, [0, 0, 0.008], chrome));
    if (a.face === 'star') {
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.016 : 0.04, q = i * Math.PI / 5 + Math.PI / 2; if (i) star.lineTo(Math.cos(q) * r, Math.sin(q) * r); else star.moveTo(Math.cos(q) * r, Math.sin(q) * r); }
      facePlate.add(s.mesh(new THREE.ExtrudeGeometry(star, { depth: 0.004, bevelEnabled: false }), s.material('#d9b03c', { metalness: 0.8, roughness: 0.3 }), [0, 0, 0.009]));
    } else if (a.face === 'button') {
      const button = s.cylinder(0.022, 0.024, 0.016, [0, 0, 0.016], new THREE.MeshStandardMaterial({ color: '#f4f1e6', emissive: '#fff1c0', emissiveIntensity: ringing ? 0.9 : 0.1, roughness: 0.4 }), 16);
      button.rotation.x = Math.PI / 2; facePlate.add(button);
    } else if (a.face === 'keyhole') {
      const lock = s.cylinder(0.018, 0.018, 0.01, [0, 0, 0.012], s.material('#b8913f', { metalness: 0.85, roughness: 0.3 }), 16);
      lock.rotation.x = Math.PI / 2; facePlate.add(lock);
      facePlate.add(s.box([0.005, 0.018, 0.004], [0, -0.002, 0.018], dark));
    }

    // The handset.
    const handset = new THREE.Group();
    handset.scale.setScalar(k);
    s.root.add(handset);
    if (round) {
      handset.add(s.box([0.15, 0.03, 0.036], [0, 0.012, 0], red));
      for (const x of [-1, 1]) { handset.add(s.cylinder(0.036, 0.03, 0.045, [x * 0.092, -0.008, 0], red, 20), s.ball([0.036, 0.016, 0.036], [x * 0.092, 0.014, 0], red, 16)); }
    } else {
      handset.add(s.box([0.2, 0.028, 0.042], [0, 0.012, 0], red));
      for (const x of [-1, 1]) handset.add(s.box([0.062, 0.05, 0.05], [x * 0.092, -0.008, 0], red));
    }
    const cradle = new THREE.Vector3(0, T + (0.135 + 0.022) * k, -0.03 * k);
    const cordStart = new THREE.Vector3(-0.1 * k, T + 0.03, -0.02);
    let cordEnd: THREE.Vector3;
    const midpoints: THREE.Vector3[] = [];
    if (onCradle) {
      handset.position.copy(cradle);
      cordEnd = new THREE.Vector3(-0.092 * k, cradle.y - 0.035 * k, cradle.z);
      midpoints.push(new THREE.Vector3(-0.2 * k, T + 0.02, 0.06), new THREE.Vector3(-0.17 * k, T + 0.06, 0.02));
    } else if (a.state === 'offhook') {
      const drop = Math.min(T - 0.25, 0.5 + random() * 0.15);
      handset.position.set(-half - 0.07, T - drop, 0.1);
      handset.rotation.set(0, 0.4, Math.PI / 2 + (random() - 0.5) * 0.3);
      cordEnd = new THREE.Vector3(-half - 0.07, T - drop + 0.13 * k, 0.1);
      midpoints.push(new THREE.Vector3(-half * 0.7, T + 0.03, 0.05), new THREE.Vector3(-half - 0.05, T - 0.02, 0.09));
    } else if (a.state === 'laid') {
      const lx = Math.min(half - 0.14, 0.3);
      handset.position.set(lx, T + 0.036 * k, 0.03);
      handset.rotation.y = 1.25 + (random() - 0.5) * 0.4;
      cordEnd = new THREE.Vector3(lx - 0.03, T + 0.03, 0.03 + 0.1 * k);
      midpoints.push(new THREE.Vector3(-0.16 * k, T + 0.02, 0.12), new THREE.Vector3(0, T + 0.02, 0.2));
    } else {
      handset.position.set(0.25 + random() * 0.2, 0.03 * k, 0.4 + random() * 0.15);
      handset.rotation.set(Math.PI / 2, 0, random() * 6);
      cordEnd = new THREE.Vector3(-half - 0.03, T - 0.3, 0.08);
      midpoints.push(new THREE.Vector3(-half * 0.7, T + 0.03, 0.04), new THREE.Vector3(-half - 0.03, T - 0.05, 0.07));
    }
    const coil = (points: THREE.Vector3[], turns: number) => {
      const path = new THREE.CatmullRomCurve3(points);
      const samples = Math.round(turns * 10);
      const helix: THREE.Vector3[] = [];
      for (let i = 0; i <= samples; i++) {
        const t = i / samples, p = path.getPoint(t), tangent = path.getTangent(t);
        const side = new THREE.Vector3().crossVectors(tangent, Math.abs(tangent.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(tangent, side);
        const ease = Math.min(1, t * 8, (1 - t) * 8), q = t * turns * 6.283;
        helix.push(p.addScaledVector(side, Math.cos(q) * 0.012 * ease).addScaledVector(up, Math.sin(q) * 0.012 * ease));
      }
      return s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), samples * 2, 0.0042, 5), s.material(redHex, { roughness: 0.4 }));
    };
    coil([cordStart, ...midpoints, cordEnd], a.state === 'offhook' ? 34 : 22);
    if (a.state === 'dead') {
      const stub = handset.position.clone().add(new THREE.Vector3(0.1, 0.02, 0.05));
      coil([handset.position.clone().add(new THREE.Vector3(-0.05, 0.01, -0.1)), handset.position.clone().add(new THREE.Vector3(-0.2, 0.012, -0.16)), stub.add(new THREE.Vector3(-0.36, -0.012, -0.05))], 9);
    }
    // Wall cable from the body.
    s.tube([[0.08 * k, T + 0.02, -0.11 * k], [0.14, T + 0.01, -0.2], a.mount === 'niche' ? [0.2, T + 0.04, -0.2] : [0.12, T - 0.2, -0.16], a.mount === 'niche' ? [0.2, T + 0.3, -0.2] : [0.1, 0.02, -0.2]], 0.006, dark);

    // Protection.
    const lifted = !onCradle;
    if (a.cover === 'dome' && a.mount !== 'niche') {
      const glass = new THREE.MeshStandardMaterial({ color: '#dff1f4', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      const dome = new THREE.Group();
      const shellMesh = s.mesh(new THREE.SphereGeometry(0.25, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), glass); shellMesh.scale.y = 1.15; shellMesh.castShadow = false;
      dome.add(shellMesh, s.ring(0.25, 0.008, [0, 0.004, 0], chrome), s.ball([0.025, 0.025, 0.025], [0, 0.3, 0], chrome, 12));
      (dome.children[1] as THREE.Mesh).rotation.x = Math.PI / 2;
      if (lifted) { dome.position.set(half + 0.3, 0, 0.25); } else dome.position.set(0, T + 0.004, 0);
      s.root.add(dome);
    } else if (a.cover === 'dome') {
      const glass = new THREE.MeshStandardMaterial({ color: '#dff1f4', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      const pane = s.box([0.56, 0.44, 0.008], lifted ? [0.6, 0.24, 0.1] : [0, T + 0.25, 0.185], glass); pane.castShadow = false;
      if (lifted) pane.rotation.set(-0.25, 0.5, 0);
      const frame = s.box([0.58, 0.02, 0.014], lifted ? [0.6, 0.03, 0.16] : [0, T + 0.02, 0.187], chrome);
      if (lifted) frame.rotation.y = 0.5;
    } else if (a.cover === 'chained' && onCradle) {
      const links: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i <= 14; i++) { const q = i / 14 * Math.PI; links.push({ at: [Math.cos(q) * 0.105 * k, T + (0.03 + Math.sin(q) * 0.185) * k, -0.03 * k + (i % 2 ? 0.004 : -0.004)], size: 1 }); }
      const chain = s.scatter(new THREE.TorusGeometry(0.013, 0.004, 5, 10), chrome, links);
      chain.frustumCulled = false;
      s.box([0.045, 0.04, 0.018], [0.11 * k, T + 0.035 * k, -0.03 * k + 0.03], s.material('#b8913f', { metalness: 0.8, roughness: 0.35 }));
      s.ring(0.014, 0.004, [0.11 * k, T + 0.062 * k, -0.03 * k + 0.03], chrome, Math.PI);
    } else if (a.cover === 'chained') {
      // The chain has been cut: it hangs loose with the padlock open.
      const links: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i <= 10; i++) links.push({ at: [0.12 * k + i * 0.004, T + 0.06 - i * 0.002 * (i > 3 ? 0 : 1), 0.02 + i * 0.022], size: 1 });
      s.scatter(new THREE.TorusGeometry(0.013, 0.004, 5, 10), chrome, links);
    } else if (a.cover === 'seal') {
      const ribbon = s.material('#e9dfc2', { roughness: 0.9, side: THREE.DoubleSide });
      if (onCradle) {
        s.box([0.03, 0.004, 0.2 * k], [0, cradle.y + 0.03 * k, cradle.z + 0.01], ribbon).rotation.x = 0.25;
        s.cylinder(0.03, 0.03, 0.006, [0, cradle.y + 0.034 * k, cradle.z], s.material('#9c1c16', { roughness: 0.5 }), 14);
      } else {
        const torn = s.box([0.03, 0.004, 0.14], [0.03, T + 0.004, 0.2 * k], ribbon); torn.rotation.y = 0.7;
        s.cylinder(0.03, 0.03, 0.006, [0.08, T + 0.006, 0.22 * k], s.material('#9c1c16', { roughness: 0.5 }), 14);
      }
    }

    // Lamp.
    const glowHex = a.lamp === 'gooseneck' || a.lamp === 'cage' ? '#ffe9a8' : '#ff2a12';
    const bright = !live ? 0 : ringing ? 1.6 : a.state === 'waiting' ? mix(0.15, 0.5, mood.cheer) : 0.9;
    const glow = new THREE.MeshStandardMaterial({ color: live ? glowHex : '#6d6a60', emissive: glowHex, emissiveIntensity: bright, roughness: 0.3 });
    const niche = a.mount === 'niche';
    const lx = niche ? 0 : half - 0.08, lz = niche ? -0.2 : -0.14, ly = niche ? T + 0.525 : T;
    if (a.lamp === 'beacon') {
      if (!niche) s.cylinder(0.014, 0.014, 0.42, [lx, ly + 0.21, lz], chrome, 10);
      const by = niche ? ly : ly + 0.42;
      s.cylinder(0.06, 0.065, 0.035, [lx, by + 0.017, lz + (niche ? 0.14 : 0)], dark, 20);
      s.lathe([[0.052, 0], [0.052, 0.06], [0.04, 0.095], [0.02, 0.11], [0, 0.113]], glow, [lx, by + 0.035, lz + (niche ? 0.14 : 0)]);
    } else if (a.lamp === 'gooseneck') {
      const baseY = niche ? T + 0.5 : ly;
      const head: [number, number, number] = niche ? [0, T + 0.4, 0.1] : [0.05, T + 0.5, 0.02];
      if (niche) s.tube([[0.2, baseY, -0.1], [0.2, baseY - 0.02, 0], [0.1, T + 0.47, 0.08], head], 0.011, chrome);
      else { s.cylinder(0.07, 0.08, 0.025, [lx, ly + 0.0125, lz], dark, 20); s.tube([[lx, ly + 0.02, lz], [lx + 0.04, ly + 0.36, lz - 0.03], [lx - 0.06, ly + 0.58, lz + 0.03], [head[0] + 0.06, head[1] + 0.05, head[2] - 0.03], head], 0.011, chrome); }
      const shade = s.lathe([[0.03, 0.1], [0.05, 0.07], [0.095, 0], [0.1, 0]], s.material('#2f6b4a', { roughness: 0.35, side: THREE.DoubleSide }), [head[0], head[1] - 0.08, head[2]]);
      shade.rotation.z = niche ? 0 : 0.25;
      s.ball([0.04, 0.03, 0.04], [head[0] - (niche ? 0 : 0.01), head[1] - 0.07, head[2]], glow, 12);
    } else if (a.lamp === 'cage') {
      const cy = niche ? T + 0.66 : ly + 0.62, cz = niche ? -0.16 : lz;
      if (!niche) { s.cylinder(0.018, 0.018, 0.56, [lx, ly + 0.28, lz], steel, 10); s.cylinder(0.06, 0.07, 0.02, [lx, ly + 0.01, lz], steel, 16); }
      const cx = niche ? -0.3 : lx;
      s.cylinder(0.06, 0.06, 0.04, [cx, cy - 0.06, cz], steel, 16);
      s.ball([0.05, 0.075, 0.05], [cx, cy + 0.02, cz], glow, 14);
      for (let i = 0; i < 6; i++) { const q = i * Math.PI / 3; s.tube([[cx + Math.cos(q) * 0.06, cy - 0.04, cz + Math.sin(q) * 0.06], [cx + Math.cos(q) * 0.068, cy + 0.03, cz + Math.sin(q) * 0.068], [cx + Math.cos(q) * 0.04, cy + 0.1, cz + Math.sin(q) * 0.04], [cx, cy + 0.115, cz]], 0.004, steel); }
      s.ring(0.066, 0.004, [cx, cy + 0.02, cz], steel).rotation.x = Math.PI / 2;
    } else {
      const sy = niche ? T + 0.64 : ly + 0.5, sz = niche ? -0.16 : lz, sxx = niche ? 0 : 0;
      if (!niche) for (const x of [-1, 1]) s.cylinder(0.012, 0.012, 0.44, [x * 0.16, ly + 0.22, sz], chrome, 8);
      s.box([0.44, 0.13, 0.08], [sxx, sy, sz], dark);
      const text = a.sign === 'none' ? 'LINE' : SIGNS[a.sign];
      const plate = s.label(text, 0.4, 0.095, [sxx, sy, sz + 0.042], '#ffffff', live ? '#c8261c' : '#5a3a36');
      plate.castShadow = false;
      const material = plate.material as THREE.MeshStandardMaterial;
      material.emissive = new THREE.Color('#ff3a22'); material.emissiveMap = material.map; material.emissiveIntensity = bright * 0.6;
      glow.emissiveIntensity = 0;
      Object.assign(glow.userData, { sign: material });
    }
    if (a.sign !== 'none' && a.lamp !== 'sign') {
      if (a.mount === 'niche') s.label(SIGNS[a.sign], 0.56, 0.1, [0, T + 0.63 + (a.lamp === 'beacon' ? 0.22 : 0.16), -0.228], '#c8261c', '#f1ecdc');
      else if (a.mount === 'table') s.label(SIGNS[a.sign], 0.6, 0.09, [0, T - 0.075, 0.262], '#c8261c', '#f1ecdc');
      else {
        const card = s.label(SIGNS[a.sign], 0.34, 0.07, [0, T + 0.045, 0.2], '#c8261c', '#f1ecdc');
        card.rotation.x = -0.5;
        s.box([0.34, 0.01, 0.06], [0, T + 0.008, 0.19], dark);
      }
    }

    // Ring marks beside the handset.
    const rings: THREE.Mesh[] = [];
    if (ringing) {
      const wave = new THREE.MeshBasicMaterial({ color: '#c8261c', transparent: true, opacity: 0.8, depthWrite: false });
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
        const arc = s.mesh(new THREE.TorusGeometry(0.07 + i * 0.05, 0.007, 5, 20, 1.2), wave, [side * 0.15 * k, cradle.y + 0.02, cradle.z]);
        arc.rotation.z = side > 0 ? -0.6 : Math.PI - 0.6;
        arc.castShadow = arc.receiveShadow = false;
        rings.push(arc);
      }
    }

    const rate = mix(3, 12, mood.energy);
    const home = handset.position.clone(), tilt = handset.rotation.z;
    const signMaterial = glow.userData.sign as THREE.MeshStandardMaterial | undefined;
    return s.finish({
      update: (_dt, time) => {
        if (ringing) {
          const burst = Math.sin(time * 2.2) > -0.2;
          handset.position.y = home.y + (burst ? Math.abs(Math.sin(time * rate * 3)) * 0.006 : 0);
          handset.rotation.z = burst ? Math.sin(time * rate * 3) * 0.03 : 0;
          const level = burst ? 1.7 : 0.25;
          if (signMaterial) signMaterial.emissiveIntensity = level * 0.6; else glow.emissiveIntensity = level;
          rings.forEach((ring, i) => { ring.visible = burst; const pulse = 1 + 0.1 * Math.sin(time * rate * 2 - (i % 3)); ring.scale.setScalar(pulse); });
        } else if (a.state === 'offhook') {
          handset.rotation.z = tilt + Math.sin(time * mix(0.8, 2.4, mood.energy)) * 0.05 * (0.3 + mood.energy);
        }
      },
    });
  },
});
