import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PLATES = {
  vault: 'VAULT',
  deposit: 'SAFE DEPOSIT',
  timelock: 'TIME LOCK',
  keepout: 'NO ADMITTANCE',
  number: 'A stencilled vault number.',
  none: 'No lettering at all.',
} as const;

export default defineThing({
  questions: {
    open: score('How far open does the door stand?', ['Cracked a hand-width', 'Ajar enough to slip through', 'Swung wide', 'Thrown flat back against the wall']),
    inside: choice('What shows inside the vault?', {
      bars: 'Stacked gold bars glowing dully on the floor.',
      cash: 'Shelves of banded banknote bricks.',
      empty: 'Bare steel shelves, cleaned out.',
      darkness: 'Nothing but blackness.',
      light: 'A flood of pale light pouring out of the opening.',
      ledgers: 'Shelves of ledgers and document boxes, paper not treasure.',
      sacks: 'Slumped canvas money sacks, a few spilled open.',
    }),
    finish: choice('How is the door finished?', {
      steel: 'Mirror-polished bare steel, a showpiece for customers.',
      brass: 'Steel with warm brass wheel, collar and trim.',
      enamel: 'Deep green enamel with gilt pinstripe, 1900s pride.',
      black: 'Gunmetal black, matte and military.',
    }),
    attack: choice('Has anyone tried to get in the hard way?', {
      none: 'No: untouched.',
      drilled: 'Drilled: a cluster of bright holes beside the dial, swarf on the floor.',
      torched: 'Torched: a blackened cut arc scorched into the face.',
      blown: 'Blown: soot starburst, rubble, the door hanging crooked on its hinge.',
    }),
    wheel: choice('What kind of wheel works the bolts?', {
      ship: 'An eight-spoke wheel with handles like a ship\'s helm.',
      tri: 'A heavy three-armed capstan with ball ends.',
      ring: 'A five-spoke hand wheel with a smooth rim.',
    }),
    wall: choice('What is the door set in?', {
      concrete: 'A raw concrete bunker wall.',
      marble: 'White marble with a bronze surround, part of the banking hall.',
      plate: 'Riveted steel plate.',
      brick: 'An old brick cellar wall.',
    }),
    gate: noul('Is there a barred day gate across the opening behind the door?'),
    plate: choice('What does the plate above the door say?', PLATES),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rust = new THREE.Color('#7a4a2c');
    const tone = (hex: string, amount = 0.45) => new THREE.Color(hex).lerp(rust, mood.wear * amount);
    const bodyHex = { steel: '#c3cace', brass: '#aeb5b8', enamel: '#27503f', black: '#3a3f44' }[a.finish];
    const trimHex = { steel: '#dfe4e6', brass: '#d6a640', enamel: '#d9b45a', black: '#8d949a' }[a.finish];
    const rough = mix(a.finish === 'steel' ? 0.18 : 0.35, 0.8, mood.wear);
    const body = new THREE.MeshStandardMaterial({ color: tone(bodyHex), metalness: 0.55, roughness: rough, side: THREE.DoubleSide });
    const trim = new THREE.MeshStandardMaterial({ color: tone(trimHex, 0.3), metalness: 0.6, roughness: rough });
    const steel = new THREE.MeshStandardMaterial({ color: tone('#d4d9dc', 0.3), metalness: 0.6, roughness: 0.3 });
    const dark = s.material('#1c1d20');
    const soot = new THREE.MeshStandardMaterial({ color: '#17140f', roughness: 1 });

    const R = 1.08, CY = 1.5, WW = 3.4, WH = 3.1, WD = 0.5;
    // Wall with a round hole.
    const wallHex = { concrete: '#a9a79e', marble: '#e7e3da', plate: '#6f777c', brick: '#9a5a44' }[a.wall];
    const wallMat = s.material(wallHex, { roughness: a.wall === 'marble' ? 0.35 : 0.9, metalness: a.wall === 'plate' ? 0.4 : 0 });
    const shape = new THREE.Shape();
    shape.moveTo(-WW / 2, 0); shape.lineTo(WW / 2, 0); shape.lineTo(WW / 2, WH); shape.lineTo(-WW / 2, WH); shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, CY, R, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    s.mesh(new THREE.ExtrudeGeometry(shape, { depth: WD, bevelEnabled: false, curveSegments: 40 }), wallMat, [0, 0, -WD / 2]);
    const front = WD / 2;
    if (a.wall === 'brick') {
      const mortar = s.material('#c9bfae');
      for (let i = 1; i < 12; i++) {
        const y = (WH * i) / 12;
        const half = Math.abs(y - CY) < R ? Math.sqrt(R * R - (y - CY) ** 2) + 0.14 : 0;
        for (const side of [-1, 1]) {
          const x0 = half, x1 = WW / 2;
          s.box([x1 - x0, 0.02, 0.01], [side * (x0 + x1) / 2, y, front + 0.003], mortar);
        }
      }
    } else if (a.wall === 'plate') {
      const points = [] as { at: [number, number, number]; size: number }[];
      for (let i = 0; i < 15; i++) for (const y of [0.12, WH - 0.12]) points.push({ at: [-WW / 2 + 0.12 + i * ((WW - 0.24) / 14), y, front], size: 1 });
      for (let j = 1; j < 12; j++) for (const x of [-WW / 2 + 0.12, WW / 2 - 0.12]) points.push({ at: [x, 0.12 + j * ((WH - 0.24) / 12), front], size: 1 });
      s.scatter(new THREE.SphereGeometry(0.035, 8, 6), wallMat, points);
    } else if (a.wall === 'marble') {
      s.box([WW + 0.1, 0.28, WD + 0.12], [0, 0.14, 0], s.material('#3b3d40', { roughness: 0.4 }));
      s.box([WW + 0.12, 0.16, WD + 0.14], [0, WH - 0.02, 0], s.material('#c4a55a', { metalness: 0.5, roughness: 0.4 }));
    } else {
      for (const y of [1.0, 2.05]) s.box([WW, 0.012, 0.006], [0, y + (y > 1.5 ? 0.7 : -0.7), front + 0.002], s.material('#8b8a82'));
    }
    // Collar round the opening.
    const collar = s.ring(R + 0.07, 0.085, [0, CY, front], trim);
    collar.scale.z = 0.7;

    // Chamber behind the wall.
    const CD = 1.5, CWd = WW, floorY = CY - R + 0.08;
    const lit = a.inside === 'light';
    const black = a.inside === 'darkness';
    const innerHex = black ? '#060607' : lit ? '#fff6d8' : '#5c6266';
    const inner = new THREE.MeshStandardMaterial({ color: innerHex, roughness: 0.8, side: THREE.DoubleSide, emissive: lit ? '#fff0c0' : '#000000', emissiveIntensity: lit ? mix(0.8, 1.5, mood.cheer) : 0 });
    const cz = -WD / 2 - CD / 2;
    s.box([CWd, 0.1, CD], [0, WH - 0.05, cz], wallMat);
    s.box([CWd, floorY, CD], [0, floorY / 2, cz], wallMat);
    s.box([0.1, WH, CD], [-CWd / 2 + 0.05, WH / 2, cz], wallMat);
    s.box([0.1, WH, CD], [CWd / 2 - 0.05, WH / 2, cz], wallMat);
    s.box([CWd, WH, 0.1], [0, WH / 2, -WD / 2 - CD + 0.05], wallMat);
    // Inner lining so the opening reads as a lit or dark room rather than the wall colour.
    const lining = (w: number, h: number, at: [number, number, number], ry: number, rx = 0) => {
      const m = s.mesh(new THREE.PlaneGeometry(w, h), inner, at);
      m.rotation.set(rx, ry, 0);
      m.castShadow = false;
      return m;
    };
    lining(CWd - 0.22, WH - 0.5, [0, (WH - 0.5) / 2 + 0.05, -WD / 2 - CD + 0.11], 0);
    lining(CD, WH - 0.5, [-CWd / 2 + 0.11, (WH - 0.5) / 2 + 0.05, cz], Math.PI / 2);
    lining(CD, WH - 0.5, [CWd / 2 - 0.11, (WH - 0.5) / 2 + 0.05, cz], -Math.PI / 2);
    lining(CWd - 0.22, CD, [0, floorY + 0.004, cz], 0, -Math.PI / 2);
    if (lit) {
      const glow = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.55, depthWrite: false }));
      glow.position.set(0, CY, -WD / 2 + 0.02);
      s.root.add(glow);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.5, R, 2.2, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
      beam.rotation.x = Math.PI / 2;
      beam.position.set(0, CY, front + 1.1);
      s.root.add(beam);
    }
    // Contents.
    const shelfMat = new THREE.MeshStandardMaterial({ color: '#8f979b', metalness: 0.4, roughness: 0.5 });
    const shelves = a.inside === 'cash' || a.inside === 'empty' || a.inside === 'ledgers';
    if (shelves) {
      const sz = -WD / 2 - CD + 0.3;
      for (let j = 0; j < 4; j++) {
        const y = floorY + 0.25 + j * 0.42;
        s.box([CWd - 0.4, 0.03, 0.38], [0, y, sz], shelfMat);
        if (a.inside === 'empty') continue;
        let x = -CWd / 2 + 0.35;
        while (x < CWd / 2 - 0.45) {
          if (a.inside === 'cash') {
            const n = 1 + Math.floor(random() * mix(2, 4.9, mood.density));
            for (let k = 0; k < n; k++) {
              s.box([0.24, 0.075, 0.3], [x + 0.12, y + 0.055 + k * 0.078, sz], s.material(k % 2 ? '#7fa377' : '#8fb387'));
              s.box([0.05, 0.078, 0.305], [x + 0.12, y + 0.055 + k * 0.078, sz], s.material('#efe6c8'));
            }
            x += 0.3;
          } else {
            const w = 0.05 + random() * 0.07, h = 0.24 + random() * 0.12;
            s.box([w, h, 0.28], [x + w / 2, y + 0.015 + h / 2, sz], s.material(['#6d2b27', '#2c4a3a', '#3a3f5c', '#a08a5a', '#c9c0a8'][Math.floor(random() * 5)]));
            x += w + 0.008 + (random() < 0.12 ? 0.12 : 0);
          }
          if (random() > mix(0.55, 0.98, mood.density)) x += 0.3;
        }
      }
      for (const x of [-CWd / 2 + 0.2, CWd / 2 - 0.2]) s.box([0.04, 1.9, 0.38], [x, floorY + 0.95, sz], shelfMat);
      if (a.inside === 'empty') {
        s.box([0.15, 0.004, 0.07], [0.3, floorY + 0.006, -0.8], s.material('#8fb387')).rotation.y = 0.6;
        s.box([0.24, 0.02, 0.3], [-0.4, floorY + 0.012, -0.9], s.material('#b9a37a')).rotation.y = -0.3;
      }
    } else if (a.inside === 'bars') {
      const gold = new THREE.MeshStandardMaterial({ color: '#e7b53a', metalness: 0.65, roughness: 0.28, emissive: '#7a5200', emissiveIntensity: mix(0.25, 0.7, mood.cheer) });
      const layers = 2 + Math.round(mix(1, 5, mood.density));
      const barGeo = new THREE.BoxGeometry(0.26, 0.085, 0.12);
      const points: { at: [number, number, number]; size: number }[] = [];
      for (let l = 0; l < layers; l++) {
        const cols = Math.max(1, 6 - l), rows = 4;
        for (let i = 0; i < cols; i++) for (let k = 0; k < rows; k++)
          points.push({ at: [(i - (cols - 1) / 2) * 0.29 + (random() - 0.5) * 0.015, floorY + 0.048 + l * 0.09, -0.75 - k * 0.14 - (l % 2) * 0.03], size: 1 });
      }
      s.scatter(barGeo, gold, points);
      const stray = s.box([0.26, 0.085, 0.12], [0.75 + random() * 0.2, floorY + 0.046, -0.6], gold);
      stray.rotation.y = random() * 2;
    } else if (a.inside === 'sacks') {
      const cloth = s.material('#c9b98c', { roughness: 1 });
      const n = 3 + Math.round(mix(1, 7, mood.density));
      for (let i = 0; i < n; i++) {
        const x = (random() - 0.5) * 1.7, z = -0.65 - random() * 0.8, r = 0.2 + random() * 0.08;
        s.ball([r, r * 0.85, r * 0.9], [x, floorY + r * 0.8, z], cloth, 14);
        s.cylinder(0.07, 0.04, 0.1, [x, floorY + r * 1.7, z], cloth, 10);
      }
      const coins = Array.from({ length: 40 }, () => ({ at: [0.2 + random() * 0.7, floorY + 0.01, -0.45 - random() * 0.4] as [number, number, number], size: 0.8 + random() * 0.5 }));
      s.scatter(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 10), new THREE.MeshStandardMaterial({ color: '#e0b440', metalness: 0.6, roughness: 0.3 }), coins);
    }
    if (a.gate) {
      const gz = -WD / 2 - 0.02;
      for (let i = -5; i <= 5; i++) {
        const x = i * 0.19, half = Math.sqrt(Math.max(R * R - x * x, 0));
        s.rod([x, CY - half, gz], [x, CY + half, gz], 0.018, steel);
      }
      for (const y of [-0.45, 0.45]) {
        const half = Math.sqrt(R * R - y * y);
        s.box([half * 2, 0.05, 0.03], [0, CY + y, gz], steel);
      }
      s.box([0.12, 0.16, 0.06], [0.75, CY, gz + 0.02], trim);
    }
    // Step plate.
    s.box([1.5, floorY - 0.02, 0.5], [0, (floorY - 0.02) / 2, front + 0.25], s.material('#555b5f', { metalness: 0.4, roughness: 0.6 }));
    for (let i = 0; i < 5; i++) s.box([1.4, 0.012, 0.02], [0, floorY - 0.014, front + 0.08 + i * 0.09], steel);

    // The door, swung on a crane hinge at the left.
    const HX = -(R + 0.34);
    const angle = mix(0.2, 2.0, a.open);
    const pivot = new THREE.Group();
    pivot.position.set(HX, CY, front + 0.06);
    pivot.rotation.y = -angle;
    if (a.attack === 'blown') pivot.rotation.z = -0.07;
    s.root.add(pivot);
    const disc = new THREE.Group();
    disc.position.set(-HX, 0, 0);
    disc.rotation.x = Math.PI / 2;
    pivot.add(disc);
    const add = (mesh: THREE.Object3D, parent: THREE.Object3D = disc) => { parent.add(mesh); return mesh; };
    // In disc space +y points out of the door's public face.
    const profile: [number, number][] = [[0, -0.34], [R - 0.07, -0.34], [R - 0.05, -0.06], [R + 0.1, -0.06], [R + 0.1, 0.1], [R, 0.18], [R * 0.55, 0.2], [0, 0.2]];
    add(s.lathe(profile, body));
    (disc.children[0] as THREE.Mesh).geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 56);
    const flat = (radius: number, tube: number, y: number, material: THREE.Material) => {
      const ring = s.ring(radius, tube, [0, y, 0], material);
      ring.rotation.x = Math.PI / 2;
      return add(ring);
    };
    flat(R * 0.86, 0.022, 0.19, trim);
    if (a.finish === 'enamel') flat(R * 0.7, 0.008, 0.2, trim);
    // Wheel on the public face.
    const wheel = new THREE.Group();
    wheel.position.set(0, 0.3, 0);
    disc.add(wheel);
    const hub = s.cylinder(0.1, 0.13, 0.22, [0, -0.02, 0], trim, 20);
    wheel.add(hub);
    const spokes = { ship: 8, tri: 3, ring: 5 }[a.wheel];
    const reach = a.wheel === 'tri' ? 0.5 : 0.42;
    for (let i = 0; i < spokes; i++) {
      const t = (i / spokes) * Math.PI * 2;
      const tip: [number, number, number] = [Math.cos(t) * reach, 0.03, Math.sin(t) * reach];
      wheel.add(s.rod([0, 0.03, 0], tip, a.wheel === 'tri' ? 0.035 : 0.02, trim));
      if (a.wheel === 'ship') wheel.add(s.rod(tip, [Math.cos(t) * (reach + 0.13), 0.03, Math.sin(t) * (reach + 0.13)], 0.026, trim, 0.018));
      if (a.wheel === 'tri') wheel.add(s.ball([0.07, 0.07, 0.07], tip, trim, 12));
    }
    if (a.wheel !== 'tri') {
      const rim = s.ring(reach, 0.026, [0, 0.03, 0], trim);
      rim.rotation.x = Math.PI / 2;
      wheel.add(rim);
    }
    // Combination dials.
    for (const x of [-0.55, 0.55]) {
      add(s.cylinder(0.1, 0.11, 0.06, [x, 0.22, -0.45], dark, 20));
      add(s.cylinder(0.07, 0.07, 0.03, [x, 0.265, -0.45], steel, 16));
    }
    // Bolts round the plug and the boltwork on the inner face.
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * Math.PI * 2;
      add(s.rod([Math.cos(t) * (R - 0.25), -0.2, Math.sin(t) * (R - 0.25)], [Math.cos(t) * (R + 0.015), -0.2, Math.sin(t) * (R + 0.015)], 0.042, steel));
    }
    flat(R * 0.62, 0.03, -0.36, steel);
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2 + 0.4;
      add(s.rod([Math.cos(t) * 0.2, -0.36, Math.sin(t) * 0.2], [Math.cos(t) * (R - 0.2), -0.36, Math.sin(t) * (R - 0.2)], 0.022, steel));
    }
    add(s.box([0.52, 0.1, 0.34], [0, -0.38, 0], trim));
    add(s.box([0.46, 0.012, 0.28], [0, -0.436, 0], s.material('#1e2a2c', { roughness: 0.15 })));
    const dials: THREE.Mesh[] = [];
    for (const x of [-0.15, 0, 0.15]) {
      add(s.cylinder(0.06, 0.06, 0.012, [x, -0.446, 0], s.material('#f1ecd9'), 16));
      const hand = s.box([0.008, 0.006, 0.05], [x, -0.455, 0], dark);
      hand.rotation.y = random() * 6;
      dials.push(add(hand) as THREE.Mesh);
    }
    // Hinge.
    const hingeMat = body;
    add(s.cylinder(0.11, 0.11, 1.5, [0, 0, 0], hingeMat, 16), pivot);
    for (const y of [-0.5, 0.5]) {
      add(s.box([-HX * 0.75, 0.16, 0.12], [-HX * 0.4, y, 0.2], hingeMat), pivot);
      add(s.cylinder(0.06, 0.06, 0.14, [-HX * 0.72, y, 0.2], trim, 12), pivot).rotation.x = Math.PI / 2;
    }
    for (const y of [-0.66, 0.66]) s.box([0.34, 0.2, 0.2], [HX, CY + y, front + 0.06], hingeMat);

    // Attacks.
    if (a.attack === 'drilled') {
      for (let i = 0; i < 6; i++) {
        const x = -0.55 + (random() - 0.5) * 0.32, z = -0.45 + (random() - 0.5) * 0.32;
        add(s.cylinder(0.035, 0.035, 0.01, [x, 0.205, z], steel, 12));
        add(s.cylinder(0.02, 0.02, 0.012, [x, 0.206, z], dark, 10));
      }
      const swarf = Array.from({ length: 30 }, () => ({ at: [(random() - 0.5) * 1.2, 0.01, front + 0.6 + random() * 0.5] as [number, number, number], size: 0.5 + random() }));
      s.scatter(new THREE.TorusGeometry(0.03, 0.006, 4, 8, 4), steel, swarf);
      // The drill rig left clamped to the floor.
      s.box([0.3, 0.2, 0.2], [0.7, 0.1, front + 1.0], s.material('#b3342a'));
      s.rod([0.7, 0.12, front + 0.9], [0.7, 0.12, front + 0.55], 0.02, steel, 0.006);
    }
    if (a.attack === 'torched') {
      const cut = s.ring(0.34, 0.02, [0.5, 0.2, 0.3], new THREE.MeshStandardMaterial({ color: '#2a1206', emissive: '#ff5a10', emissiveIntensity: mix(0.2, 1.6, mood.energy), roughness: 1 }), Math.PI * 1.3);
      cut.rotation.x = Math.PI / 2;
      add(cut);
      const blot = s.cylinder(0.5, 0.5, 0.006, [0.5, 0.199, 0.3], soot, 20);
      add(blot);
      s.cylinder(0.11, 0.11, 0.9, [0.9, 0.45, front + 1.0], s.material('#3f6fa0'), 14);
      s.cylinder(0.1, 0.1, 0.8, [1.14, 0.4, front + 1.0], s.material('#a8322a'), 14);
    }
    if (a.attack === 'blown') {
      for (let i = 0; i < 9; i++) {
        const t = (i / 9) * Math.PI * 2 + random() * 0.4;
        const ray = s.mesh(new THREE.ConeGeometry(0.16, 0.5 + random() * 0.6, 3), soot, [Math.cos(t) * (R + 0.35), CY + Math.sin(t) * (R + 0.35), front + 0.004]);
        ray.rotation.z = t - Math.PI / 2;
        ray.scale.z = 0.02;
      }
      const rubble = s.material(wallHex, { roughness: 1 });
      for (let i = 0; i < 16; i++) {
        const size = 0.05 + random() * 0.14;
        const rock = s.mesh(new THREE.DodecahedronGeometry(size, 0), rubble, [(random() - 0.5) * 2.6, size * 0.6, front + 0.6 + random() * 0.9]);
        rock.rotation.set(random() * 3, random() * 3, 0);
      }
      add(s.cylinder(0.6, 0.6, 0.006, [0.2, 0.199, 0.2], soot, 20));
    }
    if (mood.wear > 0.55) {
      for (let i = 0; i < 6; i++) {
        const streak = s.box([0.05 + random() * 0.06, 0.5 + random() * 0.8, 0.004], [(random() - 0.5) * (WW - 0.4), 0, front + 0.003], s.material('#6b4a30', { roughness: 1 }));
        streak.position.y = WH - 0.2 - (streak.geometry as THREE.BoxGeometry).parameters.height / 2;
        if (Math.hypot(streak.position.x, streak.position.y - CY) < R + 0.5) streak.visible = false;
      }
    }

    // Lettering above the door.
    if (a.plate !== 'none') {
      const text = a.plate === 'number' ? `VAULT ${1 + Math.floor(random() * 9)}` : PLATES[a.plate];
      s.box([1.3, 0.24, 0.03], [0, WH - 0.26, front + 0.012], trim);
      s.label(text, 1.22, 0.18, [0, WH - 0.26, front + 0.03], '#f0e2b0', '#22251f');
    }

    const spin = mix(0, 0.9, mood.energy);
    return s.finish({
      update: (dt) => {
        wheel.rotation.y += dt * spin * 0.5;
        dials.forEach((dial, index) => { dial.rotation.y += dt * (0.05 + index * 0.02); });
      },
    });
  },
});
