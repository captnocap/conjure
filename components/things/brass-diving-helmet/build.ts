import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';
import { encrust, painted, stained } from './sea';

export default defineThing({
  questions: {
    pattern: choice('Which era and pattern of helmet is it?', {
      twelve: 'A British twelve-bolt of the 1900s: round bonnet, three round windows, a ring of small bolts round the shoulders. The classic.',
      navy: 'A US Navy Mark V of the 1940s: four windows including one on the crown, heavy bars over every one, military and purposeful.',
      three: 'A Soviet three-bolt: a wide flange clamped by three huge bolts, small plain windows, blunt and heavy.',
      pioneer: 'An 1840s pioneer helmet: a tall riveted dome with big plain windows and no bars, primitive and frightening.',
    }),
    finish: choice('What state is the metal in?', {
      mirror: 'Polished to a mirror for a collector, copper pink and brass gold.',
      tarnished: 'Dull brown tarnish, handled and working, never polished.',
      streaked: 'Verdigris running in green streaks from every seam and bolt.',
      verdigris: 'Almost wholly turned sea-green, the copper showing only in patches.',
      encrusted: 'Green and crusted with barnacles and growth, long on the bottom.',
    }),
    faceplate: choice('What state is the front window in?', {
      closed: 'Screwed shut, dark glass intact.',
      open: 'Unscrewed and swung aside on its hinge.',
      missing: 'Gone entirely, a round black hole.',
      cracked: 'Shut, but the glass is starred with cracks.',
    }),
    inside: choice('What is inside the helmet?', {
      nothing: 'Nothing but darkness.',
      skull: 'A skull, still looking out of the window.',
      eel: 'An eel that has made it a home.',
      light: 'A warm light burning, glowing amber through every window.',
      sand: 'Packed with sand and shells that spill from the opening.',
      flowers: 'Flowers, put there by someone in memory.',
    }),
    rest: choice('What is it resting on?', {
      bare: 'Nothing: it sits on its own shoulder plate.',
      stand: 'A turned wooden display stand.',
      sand: 'Sunk askew in a mound of sand.',
      crate: 'A rope-handled wooden equipment crate.',
    }),
    beside: choice('What lies beside it?', {
      nothing: 'Nothing.',
      hose: 'Its air hose, coiled.',
      boots: 'A pair of lead-soled diving boots.',
      weights: 'The lead chest weights and a loop of lifeline.',
    }),
    bars: noul('Do protective bars cover the side windows?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const h = new Sculpture(context);
    s.root.add(h.root);
    const { mood, random } = context;
    const base = { mirror: 0, tarnished: 0.55, streaked: 0.42, verdigris: 0.85, encrusted: 0.75 }[a.finish];
    const amount = clamp01(base + (mood.wear - 0.5) * 0.3 * (a.finish === 'mirror' ? 0.3 : 1));
    const stain = a.finish === 'tarnished' ? '#3f2c1e' : '#5fb39c';
    const copper = stained(random, '#bd6a3b', stain, amount, { drips: false, side: THREE.DoubleSide });
    const copperDrip = stained(random, '#b9673a', stain, amount);
    const brass = stained(random, '#cfa748', stain, amount * 0.7);
    const dark = new THREE.MeshStandardMaterial({ color: '#0b0f12', roughness: 0.9 });
    const lit = a.inside === 'light';
    const glow = mix(0.9, 2.2, mood.cheer);
    const glass = new THREE.MeshStandardMaterial({
      color: lit ? '#ffb347' : '#16262b', roughness: 0.12, metalness: 0.2,
      emissive: lit ? '#ff9a2e' : '#000000', emissiveIntensity: lit ? glow : 0,
    });
    const clear = new THREE.MeshStandardMaterial({ color: '#9fc4c0', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false });

    const P = {
      twelve: { rx: 0.155, ry: 0.165, port: 0.062, side: 0.046, studs: 12, flange: 0 },
      navy: { rx: 0.16, ry: 0.16, port: 0.058, side: 0.05, studs: 12, flange: 0 },
      three: { rx: 0.15, ry: 0.158, port: 0.05, side: 0.036, studs: 0, flange: 1 },
      pioneer: { rx: 0.15, ry: 0.205, port: 0.072, side: 0.06, studs: 0, flange: 0 },
    }[a.pattern];

    // Corselet: a lathed shoulder plate pulled down into a bib at front and back.
    const shape = (v: THREE.Vector3) => {
      const w = (1 - clamp01(v.y / 0.17)) ** 2;
      const c2 = (v.z * v.z) / (v.x * v.x + v.z * v.z + 1e-9);
      v.y -= 0.1 * w * c2;
      v.x *= 1.2;
      v.z *= 0.98;
      return v;
    };
    const corselet = new THREE.LatheGeometry(
      [[0.2, 0], [0.204, 0.012], [0.196, 0.04], [0.172, 0.085], [0.142, 0.125], [0.128, 0.15], [0.126, 0.17]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
    const position = corselet.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) position.setXYZ(i, ...shape(v.fromBufferAttribute(position, i)).toArray());
    corselet.computeVertexNormals();
    const plate = h.mesh(corselet, copperDrip);
    (plate.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    const rim = (angle: number, r = 0.202, y = 0.02) => shape(new THREE.Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r)).toArray() as [number, number, number];
    h.tube(Array.from({ length: 28 }, (_u, i) => rim((i / 28) * Math.PI * 2, 0.203, 0.006)), 0.008, brass, true);
    if (P.studs) {
      h.tube(Array.from({ length: 28 }, (_u, i) => rim((i / 28) * Math.PI * 2, 0.197, 0.04)), 0.012, brass, true);
      h.scatter(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 6), brass,
        Array.from({ length: P.studs }, (_u, i) => ({ at: rim(((i + 0.5) / P.studs) * Math.PI * 2, 0.2, 0.046), size: 0.011 })));
    } else if (a.pattern === 'pioneer') {
      h.scatter(new THREE.SphereGeometry(1, 8, 6), brass,
        Array.from({ length: 30 }, (_u, i) => ({ at: rim((i / 30) * Math.PI * 2, 0.199, 0.036), size: 0.007 })));
    }
    // Weight studs on the breast.
    for (const x of [-1, 1]) {
      h.cylinder(0.014, 0.018, 0.03, [x * 0.11, 0.085, 0.142], brass, 10).rotation.x = 0.9;
      h.ball([0.018, 0.018, 0.018], [x * 0.11, 0.095, 0.158], brass, 10);
    }

    // Neck ring, or the wide three-bolt flange.
    const neckY = 0.17;
    h.cylinder(0.134, 0.134, 0.034, [0, neckY + 0.012, 0], brass, 40);
    if (P.flange) {
      h.cylinder(0.178, 0.178, 0.016, [0, neckY + 0.02, 0], brass, 40);
      h.cylinder(0.178, 0.178, 0.012, [0, neckY + 0.002, 0], brass, 40);
      for (let i = 0; i < 3; i++) {
        const angle = i * 2.094 + 0.52;
        const at: [number, number, number] = [Math.sin(angle) * 0.158, neckY + 0.04, Math.cos(angle) * 0.158];
        h.cylinder(0.011, 0.011, 0.075, at, brass, 8);
        h.cylinder(0.022, 0.022, 0.018, [at[0], at[1] + 0.006, at[2]], brass, 6);
      }
    } else {
      h.scatter(new THREE.BoxGeometry(1.6, 1, 1), brass,
        Array.from({ length: 8 }, (_u, i) => ({ at: [Math.sin(i * 0.785) * 0.137, neckY + 0.012, Math.cos(i * 0.785) * 0.137] as [number, number, number], size: 0.012 })));
    }

    // Bonnet: a sphere lathed about the front-back axis so the front window is a real hole.
    const cy = neckY + 0.02 + P.ry * 0.8;
    const centre = new THREE.Vector3(0, cy, 0);
    const phi0 = Math.asin((P.port * 0.98) / P.rx);
    const profile = Array.from({ length: 26 }, (_u, i) => {
      const phi = phi0 + ((Math.PI - phi0) * i) / 25;
      return new THREE.Vector2(Math.max(Math.sin(phi), 0.0001), Math.cos(phi));
    });
    const dome = new THREE.LatheGeometry(profile, 40);
    dome.rotateX(Math.PI / 2);
    const bonnet = h.mesh(dome, copper, [0, cy, 0]);
    bonnet.scale.set(P.rx, P.ry, P.rx);
    copper.map!.repeat.set(2, 1);
    if (a.pattern === 'pioneer') {
      // Riveted seams of a hand-built dome.
      const rivets: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 26; i++) {
        const t = (i / 26) * Math.PI * 2;
        rivets.push({ at: [Math.sin(t) * P.rx * 0.985, cy + P.ry * 0.18, Math.cos(t) * P.rx * 0.985], size: 0.006 });
      }
      for (let i = 1; i < 12; i++) {
        const t = (i / 12) * Math.PI;
        rivets.push({ at: [Math.cos(t) * P.rx * 0.99, cy + Math.sin(t) * P.ry * 0.99, -0.012], size: 0.006 });
      }
      h.scatter(new THREE.SphereGeometry(1, 8, 6), brass, rivets);
    }
    if (lit) {
      const lining = new THREE.Mesh(new THREE.SphereGeometry(0.93, 20, 12), new THREE.MeshStandardMaterial({ color: '#ff9a2e', emissive: '#ff8a1e', emissiveIntensity: glow, side: THREE.BackSide }));
      lining.position.copy(centre);
      lining.scale.set(P.rx, P.ry, P.rx);
      h.root.add(lining);
    }

    // Windows.
    const onDome = (dir: THREE.Vector3, sink = 0.985) => centre.clone().add(new THREE.Vector3(dir.x * P.rx, dir.y * P.ry, dir.z * P.rx).multiplyScalar(sink));
    const grille = (group: THREE.Group, r: number, z: number, dense: boolean) => {
      const n = dense ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const o = ((i + 0.5) / n - 0.5) * r * 1.5, len = Math.sqrt(Math.max(r * r * 1.25 - o * o, 0.0001)) * 2;
        for (const flip of [0, 1]) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.07, len, 6), brass);
          if (flip) { bar.rotation.z = Math.PI / 2; bar.position.set(0, o, z); } else bar.position.set(o, 0, z + r * 0.1);
          bar.castShadow = true;
          group.add(bar);
        }
      }
    };
    const frame = (r: number, depth: number) => {
      const group = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.16, r * 1.24, depth, 28, 1, true), brass);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = depth / 2;
      const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 1.1, r * 0.16, 8, 28), brass);
      lip.position.z = depth;
      barrel.castShadow = lip.castShadow = true;
      group.add(barrel, lip);
      return group;
    };
    const sidePort = (dir: THREE.Vector3, r: number, bars: boolean) => {
      dir.normalize();
      const group = frame(r, 0.03);
      const pane = new THREE.Mesh(new THREE.CircleGeometry(r * 1.05, 24), glass);
      pane.position.z = 0.022;
      group.add(pane);
      if (bars) grille(group, r, 0.036, a.pattern === 'navy');
      group.position.copy(onDome(dir, 0.95));
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      h.root.add(group);
    };
    const sideBars = a.bars || a.pattern === 'navy';
    for (const x of [-1, 1]) sidePort(new THREE.Vector3(x * 0.93, 0.12, 0.32), P.side, sideBars && a.pattern !== 'pioneer');
    if (a.pattern === 'navy') sidePort(new THREE.Vector3(0, 0.74, 0.62), P.side * 0.9, true);

    // Front window: a threaded frame on the hole, and a door that may be shut, open, cracked or gone.
    const front = frame(P.port, 0.034);
    front.position.set(0, cy, P.rx * Math.cos(phi0) - 0.006);
    h.root.add(front);
    const open = a.faceplate === 'open' || a.faceplate === 'missing';
    if (a.faceplate !== 'missing') {
      const door = new THREE.Group();
      const r = P.port;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.2, 8, 28), brass);
      ring.position.set(r * 1.3, 0, 0);
      ring.castShadow = true;
      const pane = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 28), a.faceplate === 'open' ? glass : clear);
      pane.position.set(r * 1.3, 0, 0);
      (a.faceplate === 'open' ? glass : clear).side = THREE.DoubleSide;
      door.add(ring, pane);
      if (a.faceplate === 'cracked') {
        const cracks = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 28), new THREE.MeshStandardMaterial({
          transparent: true, depthWrite: false, roughness: 0.3,
          map: painted(128, 128, (g) => {
            g.strokeStyle = '#eef6f2';
            const cx = 40 + random() * 48, cyy = 40 + random() * 48;
            for (let i = 0; i < 9; i++) {
              let angle = (i / 9) * 6.283 + random() * 0.5, x = cx, y = cyy;
              g.lineWidth = 1.2 + random() * 1.6;
              g.beginPath();
              g.moveTo(x, y);
              for (let step = 0; step < 6; step++) { angle += (random() - 0.5) * 0.7; x += Math.cos(angle) * 16; y += Math.sin(angle) * 16; g.lineTo(x, y); }
              g.stroke();
            }
            for (const ringR of [10, 22]) { g.lineWidth = 1; g.beginPath(); g.arc(cx, cyy, ringR, random() * 3, 3 + random() * 3); g.stroke(); }
          }),
        }));
        cracks.position.set(r * 1.3, 0, 0.002);
        door.add(cracks);
      }
      if (a.pattern === 'navy' && a.faceplate !== 'open') { const bars = new THREE.Group(); bars.position.x = r * 1.3; grille(bars, r, 0.012, true); door.add(bars); }
      // Hinge lug and knuckle.
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, r * 0.7, 8), brass);
      door.add(hinge);
      door.position.set(-r * 1.3, cy, front.position.z + 0.04);
      if (a.faceplate === 'open') door.rotation.y = -mix(1.7, 2.5, random());
      h.root.add(door);
    }
    if (!lit) {
      // A dark lining so the hole reads as depth, not as the far wall of the dome.
      const lining = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 10), new THREE.MeshStandardMaterial({ color: '#0d1214', roughness: 1, side: THREE.BackSide }));
      lining.position.copy(centre);
      lining.scale.set(P.rx, P.ry, P.rx);
      h.root.add(lining);
    }

    // Fittings: air inlet gooseneck at the back, exhaust valve on the right, spitcock on the left.
    h.tube([[0.03, cy + 0.03, -P.rx * 0.93], [0.03, cy + 0.045, -P.rx - 0.05], [0.03, cy - 0.02, -P.rx - 0.075], [0.03, cy - 0.08, -P.rx - 0.07]], 0.016, brass);
    h.cylinder(0.022, 0.022, 0.026, [0.03, cy - 0.085, -P.rx - 0.07], brass, 10);
    const valveDir = new THREE.Vector3(0.72, -0.1, -0.68).normalize();
    const valveAt = onDome(valveDir, 1.04);
    const valve = h.cylinder(0.034, 0.038, 0.05, valveAt.toArray() as [number, number, number], brass, 14);
    valve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), valveDir);
    const cap = h.cylinder(0.02, 0.02, 0.03, valveAt.clone().addScaledVector(valveDir, 0.038).toArray() as [number, number, number], brass, 8);
    cap.quaternion.copy(valve.quaternion);
    if (a.pattern !== 'pioneer') {
      const spitDir = new THREE.Vector3(-0.55, -0.42, 0.72).normalize();
      const spitAt = onDome(spitDir, 1.02);
      const spit = h.cylinder(0.012, 0.014, 0.04, spitAt.toArray() as [number, number, number], brass, 8);
      spit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spitDir);
      h.rod(spitAt.clone().addScaledVector(spitDir, 0.02).toArray() as [number, number, number], spitAt.clone().addScaledVector(spitDir, 0.02).add(new THREE.Vector3(-0.03, 0.02, 0)).toArray() as [number, number, number], 0.005, brass);
    }
    // Crown: a lifting ring, except where a window sits.
    h.ring(0.022, 0.006, [0, cy + P.ry + 0.014, -0.03], brass).rotation.y = Math.PI / 2;

    // What is inside.
    let eel: THREE.Object3D | null = null;
    let flame: THREE.Mesh | null = null;
    const bone = h.material('#e6dcc2', { roughness: 0.8 });
    if (a.inside === 'skull') {
      const z = P.rx * 0.42;
      h.ball([0.074, 0.084, 0.078], [0, cy + 0.008, z - 0.02], bone, 18);
      h.box([0.07, 0.04, 0.04], [0, cy - 0.055, z + 0.03], bone);
      for (const x of [-1, 1]) h.ball([0.02, 0.022, 0.012], [x * 0.028, cy + 0.006, z + 0.05], dark, 10);
      h.ball([0.009, 0.014, 0.008], [0, cy - 0.022, z + 0.058], dark, 8);
      for (let i = 0; i < 6; i++) h.box([0.008, 0.012, 0.004], [(i - 2.5) * 0.0105, cy - 0.046, z + 0.051], h.material('#f4eedd'));
    } else if (a.inside === 'eel') {
      const skin = h.material('#5d6b3a', { roughness: 0.5 });
      const group = new THREE.Group();
      const zf = P.rx * Math.cos(phi0);
      const points = open
        ? [[0.03, cy - 0.03, 0], [0, cy - 0.01, zf * 0.7], [-0.005, cy + 0.005, zf + 0.05], [0.02, cy + 0.03, zf + 0.11], [0.05, cy + 0.02, zf + 0.15]]
        : [[0.05, cy - 0.04, zf * 0.3], [-0.04, cy - 0.03, zf * 0.55], [-0.03, cy + 0.02, zf * 0.7], [0.02, cy + 0.01, zf * 0.86]];
      const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      const body = new THREE.Mesh(new THREE.TubeGeometry(path, 24, 0.02, 8), skin);
      const tip = points[points.length - 1];
      const head = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
      head.scale.set(0.024, 0.021, 0.034);
      head.position.set(tip[0], tip[1], tip[2]);
      const tangent = path.getTangent(1);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      body.castShadow = head.castShadow = true;
      group.add(body, head);
      for (const x of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshStandardMaterial({ color: '#f2e9a0', emissive: '#f2e9a0', emissiveIntensity: 0.4 }));
        eye.position.set(tip[0], tip[1], tip[2]).addScaledVector(tangent, 0.014).add(new THREE.Vector3(x * 0.017, 0.012, 0));
        group.add(eye);
      }
      h.root.add(group);
      eel = group;
    } else if (lit) {
      flame = h.ball([0.03, 0.045, 0.03], [0, cy - 0.02, 0.02], new THREE.MeshStandardMaterial({ color: '#fff1b8', emissive: '#ffd27a', emissiveIntensity: 3 }), 12);
      flame.castShadow = false;
    } else if (a.inside === 'sand') {
      const sand = h.material('#d8c79a', { roughness: 1 });
      const zf = P.rx * Math.cos(phi0);
      h.ball([P.port * 1.1, P.port * 0.95, 0.03], [0, cy - P.port * 0.25, zf - 0.02], sand, 14);
      if (open) {
        h.ball([0.07, 0.03, 0.06], [0, cy - P.port - 0.02, zf + 0.04], sand, 12);
        h.ball([0.1, 0.04, 0.07], [0, 0.11, 0.17], sand, 12);
        h.scatter(new THREE.SphereGeometry(1, 7, 5), h.material('#f1e8d8'), Array.from({ length: 7 }, () => ({ at: [(random() - 0.5) * 0.14, 0.125 + random() * 0.02, 0.17 + random() * 0.05] as [number, number, number], size: 0.008 + random() * 0.008 })));
      }
    } else if (a.inside === 'flowers') {
      const zf = P.rx * Math.cos(phi0);
      const petals = ['#f3e7ef', '#e8b53a', '#d7483f', '#f0f0e4', '#b26fd1'];
      const out = open ? 0.09 : -0.02;
      const blooms: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 9; i++) {
        const angle = random() * 6.283, r = random() * P.port * 0.75;
        const at: [number, number, number] = [Math.cos(angle) * r, cy + Math.sin(angle) * r + (open ? 0.02 : 0), zf + out * (0.4 + random() * 0.6)];
        if (open) h.rod([0, cy - 0.03, zf - 0.05], at, 0.003, h.material('#4e7a3a'));
        blooms.push({ at, size: 0.016 + random() * 0.01, color: petals[Math.floor(random() * petals.length)] });
      }
      h.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: true }), blooms);
    }

    // What it rests on.
    const wood = s.material('#7a5636', { roughness: 0.85 });
    if (a.rest === 'stand') {
      s.cylinder(0.17, 0.2, 0.035, [0, 0.0175, 0], wood, 28);
      s.lathe([[0.05, 0.035], [0.03, 0.08], [0.045, 0.16], [0.028, 0.24], [0.07, 0.3], [0.11, 0.33], [0.11, 0.345]], wood);
      h.root.position.y = 0.345 - 0.12;
    } else if (a.rest === 'crate') {
      s.box([0.62, 0.3, 0.46], [0, 0.15, 0], wood);
      const slat = s.material('#5e4128', { roughness: 0.9 });
      for (const y of [0.05, 0.25]) for (const z of [-1, 1]) s.box([0.64, 0.045, 0.012], [0, y, z * 0.232], slat);
      for (const x of [-1, 1]) {
        s.box([0.012, 0.3, 0.48], [x * 0.312, 0.15, 0], slat);
        s.tube([[x * 0.32, 0.2, -0.08], [x * 0.37, 0.13, 0], [x * 0.32, 0.2, 0.08]], 0.009, s.material('#c9b88a'));
      }
      h.root.position.y = 0.3 + 0.098;
    } else if (a.rest === 'sand') {
      const sand = s.material('#d8c79a', { roughness: 1 });
      s.ball([0.36, 0.1, 0.34], [0.02, 0, 0], sand, 24);
      s.ball([0.15, 0.05, 0.14], [-0.24, 0, 0.18], sand, 16);
      h.root.rotation.set(mix(-0.1, 0.1, random()), 0, mix(0.16, 0.3, random()) * (random() < 0.5 ? -1 : 1));
      h.root.position.y = 0.1;
    } else h.root.position.y = 0.1;

    // What lies beside it.
    const lead = s.material('#6f7478', { roughness: 0.7, metalness: 0.3 });
    const floorY = a.rest === 'sand' ? 0.03 : 0;
    if (a.beside === 'hose') {
      const rubber = s.material('#2b2a27', { roughness: 0.8 });
      const points: [number, number, number][] = [];
      const turns = 3 + Math.floor(random() * 2);
      for (let i = 0; i <= turns * 14; i++) {
        const t = (i / 14) * Math.PI * 2, r = 0.17 - (i / (turns * 14)) * 0.07;
        points.push([0.44 + Math.cos(t) * r, floorY + 0.022 + (i / (turns * 14)) * 0.07, 0.05 + Math.sin(t) * r]);
      }
      s.tube(points, 0.02, rubber);
      s.cylinder(0.026, 0.026, 0.05, points[points.length - 1], brass, 10).rotation.x = Math.PI / 2;
    } else if (a.beside === 'boots') {
      const leather = s.material('#8a6a45', { roughness: 0.85 });
      const strap = s.material('#3a2a1c');
      for (const [i, x] of [0.36, 0.5].entries()) {
        const boot = new Sculpture(context);
        boot.box([0.12, 0.03, 0.3], [0, 0.015, 0], lead);
        boot.ball([0.058, 0.05, 0.15], [0, 0.05, 0.005], leather, 14);
        boot.lathe([[0.052, 0.04], [0.05, 0.12], [0.056, 0.2], [0.06, 0.215], [0.05, 0.215]], leather, [0, 0, -0.07]);
        boot.ball([0.062, 0.045, 0.06], [0, 0.048, 0.1], brass, 12);
        for (const z of [-0.02, 0.045]) boot.box([0.122, 0.014, 0.02], [0, 0.085, z], strap);
        boot.ring(0.054, 0.006, [0, 0.15, -0.07], strap).rotation.x = Math.PI / 2;
        boot.root.position.set(x, floorY, 0.08 + i * 0.04);
        boot.root.rotation.y = (random() - 0.5) * 0.6;
        if (i === 1 && random() < 0.5) { boot.root.rotation.z = -Math.PI / 2; boot.root.position.y += 0.06; boot.root.position.x += 0.1; }
        s.root.add(boot.root);
      }
    } else if (a.beside === 'weights') {
      for (const [i, x] of [0.36, 0.5].entries()) {
        const slab = s.box([0.14, 0.045, 0.19], [x + i * 0.02, floorY + 0.022 + i * 0.03, 0.04 - i * 0.07], lead);
        slab.rotation.set(0, (random() - 0.5) * 0.8, i * 0.35);
        s.ring(0.022, 0.006, [x + i * 0.02, floorY + 0.06 + i * 0.04, -0.05 - i * 0.07], brass);
      }
      const rope = s.material('#c9b88a', { roughness: 1 });
      for (let i = 0; i < 4; i++) s.ring(0.1 - i * 0.008, 0.011, [0.44, floorY + 0.012 + i * 0.019, 0.25], rope).rotation.x = Math.PI / 2;
    }

    if (a.finish === 'encrusted') {
      const hosts = [plate, bonnet];
      encrust(s, hosts, mix(110, 260, mood.wear) * mix(0.7, 1.2, mood.density), 0.013);
      encrust(s, hosts, 26, 0.03, ['#c2573a', '#d98a3a', '#8a6fb0', '#6f9a58'], 'blob');
    }

    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        if (eel) { eel.rotation.y = Math.sin(time * mix(0.4, 2.4, energy)) * 0.07; eel.position.y = Math.sin(time * mix(0.3, 1.7, energy)) * 0.006; }
        if (flame) flame.scale.setScalar(1 + Math.sin(time * mix(4, 19, energy)) * 0.12 + Math.sin(time * 7.3) * 0.05).multiply(new THREE.Vector3(0.03, 0.045, 0.03));
      },
    });
  },
});
