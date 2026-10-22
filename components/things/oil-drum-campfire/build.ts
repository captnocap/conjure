import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const PAINT = { blue: '#2f5f8f', red: '#a63a2c', yellow: '#c9a227', green: '#55663a', bare: '#7a4a2e' } as const;

export default defineThing({
  questions: {
    presence: choice('Is someone still here?', {
      burning: 'Flames are up and the kettle is steaming: someone is here right now, just out of frame.',
      'just-left': 'No flame, but the embers glow orange and a thread of smoke rises: they left minutes ago.',
      'last-night': 'Grey ash with one or two dull coals under it: last night\'s fire, nobody in sight.',
      'years-cold': 'The ash is years cold and rained flat, weeds grow out of the drum and the kettle has fallen over.',
    }),
    drum: choice('What colour was the drum painted?', {
      blue: 'Chipped industrial blue.',
      red: 'Scorched fuel-company red.',
      yellow: 'Hazard yellow with a black band.',
      green: 'Drab military green.',
      bare: 'No paint left at all, only brown rust.',
    }),
    cut: score('How much of the drum is left?', ['Cut down to a shallow knee-high pan', 'Cut in half', 'A full-height drum with air holes punched low down']),
    cooking: choice('What is on the grate?', {
      kettle: 'A blackened kettle with a bent wire handle.',
      pot: 'A dented stew pot with a ladle standing in it.',
      skewers: 'Small fish or meat on sticks laid across the bars.',
      cans: 'Opened tin cans heating directly on the bars.',
      nothing: 'Nothing: a bare grate.',
    }),
    seats: choice('What do people sit on?', {
      'two-crates': 'Two upturned plastic crates facing each other.',
      'one-crate': 'A single upturned crate: one person, alone.',
      'crate-and-tyre': 'A crate and an old car tyre laid flat.',
      'car-seat': 'A crate and a seat pulled out of a car.',
      'three-crates': 'Three crates pulled up close, a small company.',
    }),
    left: choice('What was left beside a seat?', {
      mug: 'An enamel mug.',
      book: 'A paperback, face down to keep the page.',
      boots: 'A pair of boots set to dry.',
      radio: 'A hand-crank radio with its aerial up.',
      nothing: 'Nothing at all.',
    }),
    fuel: choice('What do they burn?', {
      pallet: 'Broken pallet boards stacked beside the drum.',
      furniture: 'Chair legs and bits of varnished furniture.',
      books: 'A stack of books, some already torn in half.',
      branches: 'Gathered branches and brushwood.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const heat = { burning: 1, 'just-left': 0.6, 'last-night': 0.15, 'years-cold': 0 }[a.presence];
    const dead = a.presence === 'years-cold';
    const wear = Math.max(mood.wear, dead ? 0.8 : 0.35);
    const R = 0.29;
    const H = mix(0.34, 0.86, a.cut);

    const paint = new THREE.Color(PAINT[a.drum]).lerp(new THREE.Color('#6b3f27'), wear * 0.6);
    const drumMat = new THREE.MeshStandardMaterial({ color: paint, roughness: 0.85, metalness: 0.25, side: THREE.DoubleSide });
    const soot = s.material('#1c1a18', { roughness: 0.95, side: THREE.DoubleSide });
    const rust = s.material('#5e3622', { roughness: 0.95 });
    const iron = s.material('#2b2a29', { roughness: 0.7, metalness: 0.5 });
    const ashMat = s.material(dead ? '#8d8a80' : '#6f6a63', { roughness: 1 });
    const glow = mix(0.6, 2.6, mood.warmth) * heat;
    const ember = new THREE.MeshStandardMaterial({ color: '#ff7a1c', emissive: '#ff5a10', emissiveIntensity: 0.4 + glow, roughness: 0.8 });

    // Drum: open shell, sooty lining, rolled ribs, a scorched lip.
    const shell = s.mesh(new THREE.CylinderGeometry(R, R, H, 32, 1, true), drumMat, [0, H / 2, 0]);
    s.mesh(new THREE.CylinderGeometry(R - 0.006, R - 0.006, H, 32, 1, true), soot, [0, H / 2, 0]);
    s.cylinder(R, R, 0.02, [0, 0.01, 0], rust, 32);
    const ribs = a.cut > 0.7 ? [0.33, 0.66] : a.cut > 0.3 ? [0.55] : [];
    for (const f of [...ribs, 0.02]) s.ring(R + 0.004, 0.014, [0, H * f, 0], drumMat).rotation.x = Math.PI / 2;
    const lip = s.ring(R, 0.012, [0, H, 0], soot);
    lip.rotation.x = Math.PI / 2;
    // The cut edge is ragged: a few teeth left by the cold chisel.
    for (let i = 0; i < 9; i++) {
      const t = random() * Math.PI * 2;
      const tooth = s.box([0.05, 0.02 + random() * 0.035, 0.008], [Math.sin(t) * R, H + 0.012, Math.cos(t) * R], soot);
      tooth.rotation.y = t;
    }
    if (a.drum === 'yellow') s.mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, H * 0.16, 32, 1, true), s.material('#1b1b1b', { side: THREE.DoubleSide }), [0, H * 0.3, 0]);
    // Scorch climbing down from the rim.
    s.mesh(new THREE.CylinderGeometry(R + 0.002, R + 0.002, H * mix(0.12, 0.3, wear), 32, 1, true), s.material('#2a211c', { side: THREE.DoubleSide, roughness: 1 }), [0, H * (1 - mix(0.06, 0.15, wear)), 0]);
    // Air holes punched low down, glowing when there is fire behind them.
    const holeMat = heat > 0.3 ? ember : soot;
    const holes = a.cut > 0.45 ? 9 : 6;
    for (let i = 0; i < holes; i++) {
      const t = (i / holes) * Math.PI * 2 + 0.3;
      for (const y of a.cut > 0.7 ? [0.12, 0.22] : [0.1]) {
        const hole = s.cylinder(0.022, 0.022, 0.012, [Math.sin(t) * R, y, Math.cos(t) * R], holeMat, 10);
        hole.rotation.x = Math.PI / 2;
        hole.rotation.z = -t;
      }
    }
    void shell;

    // Fire bed.
    const bed = H - 0.13;
    s.cylinder(R - 0.02, R - 0.02, 0.03, [0, bed, 0], ashMat, 24);
    const coals: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let i = 0; i < 46; i++) {
      const r = Math.sqrt(random()) * (R - 0.06), t = random() * Math.PI * 2;
      const hot = random() < heat * 0.9;
      coals.push({ at: [Math.sin(t) * r, bed + 0.02 + random() * 0.035, Math.cos(t) * r], size: 0.02 + random() * 0.03, color: hot ? (random() < 0.4 ? '#ffd24a' : '#ff6a1a') : random() < 0.5 ? '#1a1817' : '#8a867d' });
    }
    const coalMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff4a08', emissiveIntensity: glow * 0.55, roughness: 0.9 });
    s.scatter(new THREE.DodecahedronGeometry(1, 0), coalMat, coals);
    if (heat > 0.5) s.cylinder(R - 0.07, R - 0.07, 0.012, [0, bed + 0.018, 0], ember, 20);
    // Charred log ends poking out of the bed.
    if (!dead) for (let i = 0; i < 3; i++) {
      const t = random() * Math.PI * 2;
      s.rod([Math.sin(t) * 0.05, bed + 0.03, Math.cos(t) * 0.05], [Math.sin(t) * (R - 0.03), bed + 0.1 + random() * 0.05, Math.cos(t) * (R - 0.03)], 0.022, s.material('#231d19', { roughness: 1 }));
    }

    const flames: THREE.Mesh[] = [];
    if (a.presence === 'burning') {
      for (let i = 0; i < 7; i++) {
        const r = random() * 0.14, t = random() * Math.PI * 2, h = mix(0.16, 0.34, random()) * mix(0.8, 1.3, mood.energy);
        const mat = new THREE.MeshStandardMaterial({ color: i % 2 ? '#ffb02e' : '#ff6418', emissive: i % 2 ? '#ffb02e' : '#ff5a10', emissiveIntensity: 1.6 + glow * 0.5, transparent: true, opacity: 0.86, depthWrite: false });
        const flame = s.mesh(new THREE.ConeGeometry(0.045 + random() * 0.035, h, 7), mat, [Math.sin(t) * r, bed + 0.03 + h / 2, Math.cos(t) * r]);
        flame.castShadow = false;
        flame.userData.h = h; flame.userData.p = random() * 6;
        flames.push(flame);
      }
    }
    const smoke: THREE.Mesh[] = [];
    if (heat > 0.4) {
      const puffMat = new THREE.MeshStandardMaterial({ color: '#b9b4ab', transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const puff = s.ball([0.06 + i * 0.022, 0.07 + i * 0.02, 0.06 + i * 0.022], [0.03 * i * (random() - 0.3), H + 0.3 + i * 0.2, 0.02 * i], puffMat, 10);
        puff.castShadow = false;
        smoke.push(puff);
      }
    }

    // Grill grate: a salvaged oven shelf laid across the rim, a little askew.
    const grate = new THREE.Group();
    const gw = R * 2 + 0.1, gy = H + 0.022;
    const bar = (from: [number, number, number], to: [number, number, number], r: number) => {
      const m = s.rod(from, to, r, iron);
      grate.add(m);
    };
    bar([-gw / 2, 0, -0.2], [gw / 2, 0, -0.2], 0.008); bar([-gw / 2, 0, 0.2], [gw / 2, 0, 0.2], 0.008);
    bar([-gw / 2, 0, -0.2], [-gw / 2, 0, 0.2], 0.008); bar([gw / 2, 0, -0.2], [gw / 2, 0, 0.2], 0.008);
    for (let i = 1; i < 11; i++) bar([-gw / 2 + (gw * i) / 11, 0, -0.2], [-gw / 2 + (gw * i) / 11, 0, 0.2], 0.005);
    grate.position.y = gy;
    grate.rotation.y = (random() - 0.5) * 0.5;
    if (dead) { grate.rotation.z = 0.2; grate.position.set(0.06, gy - 0.03, 0); }
    s.root.add(grate);

    const top = gy + 0.008;
    const black = s.material('#1f1d1c', { roughness: 0.75, metalness: 0.35 });
    if (a.cooking === 'kettle') {
      const k = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.095, 0], [0.11, 0.03], [0.105, 0.1], [0.07, 0.15], [0.045, 0.16], [0, 0.16]].map(([x, y]) => new THREE.Vector2(x, y)), 20), black);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), black); knob.position.y = 0.172;
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.13, 8), black); spout.position.set(0.12, 0.1, 0); spout.rotation.z = -0.9;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 6, 20, Math.PI), iron); handle.position.y = 0.14; handle.rotation.y = 0;
      k.add(body, knob, spout, handle);
      k.traverse((n) => { n.castShadow = true; });
      if (dead) { k.position.set(R + 0.2, 0.1, 0.16); k.rotation.set(Math.PI / 2 - 0.15, 0, 0.4); } else { k.position.set(-0.03, top, 0.02); k.rotation.y = random() * 6; }
      s.root.add(k);
      if (a.presence === 'burning') {
        const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false });
        for (let i = 0; i < 3; i++) { const p = s.ball([0.03 + i * 0.012, 0.035 + i * 0.012, 0.03 + i * 0.012], [0.1, top + 0.22 + i * 0.08, 0.02], steam, 8); p.castShadow = false; smoke.push(p); }
      }
    } else if (a.cooking === 'pot') {
      s.mesh(new THREE.CylinderGeometry(0.13, 0.115, 0.15, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#2a2928', roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide }), [0, top + 0.075, 0]);
      s.cylinder(0.115, 0.115, 0.01, [0, top + 0.005, 0], black, 20);
      s.cylinder(0.122, 0.122, 0.01, [0, top + 0.11, 0], s.material(dead ? '#3d4a2c' : '#8a5a2b', { roughness: 0.5 }), 20);
      for (const x of [-1, 1]) s.ring(0.025, 0.006, [x * 0.14, top + 0.12, 0], iron).rotation.x = Math.PI / 2;
      s.rod([0.03, top + 0.1, 0], [0.13, top + 0.3, 0.05], 0.007, iron);
    } else if (a.cooking === 'skewers') {
      for (let i = 0; i < 4; i++) {
        const z = -0.13 + i * 0.085 + (random() - 0.5) * 0.02;
        s.rod([-0.3, top + 0.008, z], [0.34, top + 0.008, z + 0.03], 0.004, s.material('#a88a5a'));
        const fish = s.ball([0.075, 0.016, 0.026], [(random() - 0.5) * 0.1, top + 0.02, z + 0.015], s.material(dead ? '#3a332c' : '#b08a5e', { roughness: 0.6 }), 10);
        fish.rotation.y = -0.05;
        s.mesh(new THREE.ConeGeometry(0.024, 0.04, 4), s.material('#8a6a48'), [fish.position.x + 0.09, top + 0.02, z + 0.02]).rotation.z = Math.PI / 2;
      }
    } else if (a.cooking === 'cans') {
      const tin = s.material('#a9aaa6', { metalness: 0.7, roughness: 0.4 });
      for (let i = 0; i < 3; i++) {
        const x = -0.13 + i * 0.13 + (random() - 0.5) * 0.03, z = (random() - 0.5) * 0.16, h = 0.09 + random() * 0.03;
        s.mesh(new THREE.CylinderGeometry(0.038, 0.038, h, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#a9aaa6', metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }), [x, top + h / 2, z]);
        s.cylinder(0.039, 0.039, h * 0.5, [x, top + h * 0.4, z], s.material(['#b3372c', '#3f6a8a', '#d0b23c'][i]), 14);
        s.cylinder(0.036, 0.036, 0.006, [x, top + h * 0.8, z], s.material('#7a3d1e', { roughness: 0.4 }), 12);
        const lid = s.cylinder(0.036, 0.036, 0.003, [x + 0.03, top + h + 0.02, z], tin, 12); lid.rotation.z = 1.0;
      }
    }

    // Seats, set around the front and sides.
    const crate = (x: number, z: number, colour: string, turn: number) => {
      const g = new THREE.Group();
      const m = s.material(colour, { roughness: 0.7 });
      const add = (size: [number, number, number], at: [number, number, number]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(...size), m); b.position.set(...at); b.castShadow = b.receiveShadow = true; g.add(b); };
      const w = 0.4, d = 0.32, h = 0.3;
      add([w, 0.025, d], [0, h - 0.0125, 0]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add([0.03, h, 0.03], [sx * (w / 2 - 0.015), h / 2, sz * (d / 2 - 0.015)]);
      for (const y of [0.03, 0.115, 0.2]) { for (const sz of [-1, 1]) add([w, 0.045, 0.012], [0, y + 0.02, sz * (d / 2 - 0.006)]); for (const sx of [-1, 1]) add([0.012, 0.045, d], [sx * (w / 2 - 0.006), y + 0.02, 0]); }
      g.position.set(x, 0, z); g.rotation.y = turn;
      s.root.add(g);
    };
    const crateColours = ['#b8482e', '#2f6d9a', '#c7a02a', '#3f7a4a', '#6d6f6a'];
    const pick = () => crateColours[Math.floor(random() * crateColours.length)];
    const D = R + 0.5;
    const spots: [number, number][] = [[-D * 0.8, D * 0.62], [D * 0.85, D * 0.5], [0.05, -D * 0.95]];
    const face = ([x, z]: [number, number]) => Math.atan2(x, z) + (random() - 0.5) * 0.4;
    crate(...spots[0], pick(), face(spots[0]));
    if (a.seats === 'two-crates' || a.seats === 'three-crates') crate(...spots[1], pick(), face(spots[1]));
    if (a.seats === 'three-crates') crate(...spots[2], pick(), face(spots[2]));
    if (a.seats === 'crate-and-tyre') {
      const rubber = s.material('#1d1d1e', { roughness: 0.95 });
      const tyre = s.mesh(new THREE.TorusGeometry(0.22, 0.1, 10, 24), rubber, [spots[1][0], 0.1, spots[1][1]]);
      tyre.rotation.x = Math.PI / 2; tyre.scale.z = 1.0;
    }
    if (a.seats === 'car-seat') {
      const cloth = s.material('#6a5a4c', { roughness: 0.95 });
      const g = new THREE.Group();
      const part = (size: [number, number, number], at: [number, number, number], rx = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(...size), cloth); b.position.set(...at); b.rotation.x = rx; b.castShadow = true; g.add(b); };
      part([0.48, 0.14, 0.48], [0, 0.1, 0]); part([0.46, 0.62, 0.12], [0, 0.44, -0.27], -0.28); part([0.24, 0.16, 0.09], [0, 0.82, -0.38], -0.28);
      g.position.set(spots[1][0] + 0.05, 0, spots[1][1]); g.rotation.y = Math.atan2(-spots[1][0], -spots[1][1]);
      s.root.add(g);
    }

    // Something left beside the first seat.
    const lx = spots[0][0] + 0.02, lz = spots[0][1] + 0.34;
    if (a.left === 'mug') {
      s.mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.08, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#e9e6da', roughness: 0.4, side: THREE.DoubleSide }), [spots[0][0], 0.34, spots[0][1]]);
      s.ring(0.022, 0.006, [spots[0][0] + 0.05, 0.34, spots[0][1]], s.material('#27406b'));
      s.ring(0.04, 0.004, [spots[0][0], 0.38, spots[0][1]], s.material('#27406b')).rotation.x = Math.PI / 2;
    } else if (a.left === 'book') {
      for (const sgn of [-1, 1]) { const half = s.box([0.1, 0.012, 0.16], [spots[0][0] + sgn * 0.045, 0.325, spots[0][1]], s.material('#b23f34')); half.rotation.z = -sgn * 0.5; }
      s.box([0.17, 0.02, 0.15], [spots[0][0], 0.305, spots[0][1]], s.material('#efe8d2'));
    } else if (a.left === 'boots') {
      const leather = s.material('#4a3424', { roughness: 0.9 });
      for (const i of [0, 1]) { const x = lx + i * 0.14, z = lz - i * 0.03; s.box([0.1, 0.07, 0.27], [x, 0.035, z], leather); s.cylinder(0.05, 0.055, 0.2, [x, 0.16, z - 0.08], leather, 10); s.box([0.105, 0.02, 0.28], [x, 0.01, z], s.material('#1a1a1a')); }
    } else if (a.left === 'radio') {
      s.box([0.22, 0.14, 0.08], [lx, 0.07, lz], s.material('#4f6b4a'));
      s.cylinder(0.04, 0.04, 0.005, [lx - 0.05, 0.075, lz + 0.042], iron, 14).rotation.x = Math.PI / 2;
      s.rod([lx + 0.09, 0.14, lz], [lx + 0.2, 0.52, lz - 0.03], 0.004, s.material('#c9cdd0', { metalness: 0.8 }));
      s.rod([lx + 0.11, 0.08, lz], [lx + 0.17, 0.08, lz], 0.006, iron);
    }

    // Fuel stacked on the far side.
    const fx = R + 0.34, fz = -0.32;
    if (a.fuel === 'pallet') {
      const wood = ['#9a7b52', '#8a6c46', '#a98a60'];
      for (let i = 0; i < 6 + Math.round(mood.density * 5); i++) { const b = s.box([0.55 + random() * 0.2, 0.022, 0.09], [fx + (random() - 0.5) * 0.08, 0.012 + Math.floor(i / 2) * 0.024, fz + (i % 2 ? 0.06 : -0.06) + (random() - 0.5) * 0.04], s.material(wood[i % 3], { roughness: 1 })); b.rotation.y = 0.5 + (random() - 0.5) * 0.3; }
    } else if (a.fuel === 'furniture') {
      const var_ = s.material('#6b3d22', { roughness: 0.45 });
      for (let i = 0; i < 4 + Math.round(mood.density * 3); i++) { const t = random() * 3; const leg = s.cylinder(0.018, 0.028, 0.42 + random() * 0.1, [fx + (random() - 0.5) * 0.2, 0.03 + i * 0.012, fz + (random() - 0.5) * 0.24], var_, 8); leg.rotation.set(Math.PI / 2, 0, t); }
      const back = s.box([0.4, 0.03, 0.34], [fx, 0.1, fz], var_); back.rotation.set(0.25, 0.4, 0.1);
    } else if (a.fuel === 'books') {
      const covers = ['#8a2f2a', '#2f4f6f', '#3f6a45', '#b08a3a', '#5a3a5f'];
      const n = 5 + Math.round(mood.density * 5);
      for (let i = 0; i < n; i++) { const b = s.box([0.15, 0.03 + random() * 0.02, 0.21], [fx + (random() - 0.5) * 0.03, 0.02 + i * 0.042, fz], s.material(covers[i % 5])); b.rotation.y = (random() - 0.5) * 0.7; s.box([0.14, 0.024, 0.2], [b.position.x + 0.008, b.position.y, fz + 0.004], s.material('#e8e0c8')).rotation.y = b.rotation.y; }
      const torn = s.box([0.15, 0.015, 0.21], [fx - 0.25, 0.01, fz + 0.2], s.material('#e8e0c8')); torn.rotation.y = 0.8;
    } else {
      const bark = s.material('#5a4633', { roughness: 1 });
      for (let i = 0; i < 9 + Math.round(mood.density * 8); i++) { const len = 0.5 + random() * 0.4; const br = s.cylinder(0.008 + random() * 0.012, 0.016 + random() * 0.014, len, [fx + (random() - 0.5) * 0.16, 0.025 + random() * 0.1, fz + (random() - 0.5) * 0.2], bark, 6); br.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.3, 0, 0.5 + (random() - 0.5) * 0.7); }
    }

    // Ash spilled around the foot, and weeds once the place has been forgotten.
    const spill: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let i = 0; i < 26; i++) { const r = R + 0.03 + random() * 0.3, t = random() * Math.PI * 2; spill.push({ at: [Math.sin(t) * r, 0.006, Math.cos(t) * r], size: 0.012 + random() * 0.025, color: random() < 0.5 ? '#2a2725' : '#8a867d' }); }
    s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#ffffff', { roughness: 1 }), spill);
    if (dead || mood.wear > 0.75) {
      const green = s.material('#5f8a3c', { roughness: 0.9 });
      const blade = new THREE.ConeGeometry(0.012, 0.3, 4); blade.translate(0, 0.15, 0);
      const tufts = new THREE.InstancedMesh(blade, green, 70);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 70; i++) {
        const inside = dead && i < 30;
        const r = inside ? Math.sqrt(random()) * (R - 0.05) : R + 0.02 + random() * 0.12, t = random() * Math.PI * 2;
        e.set((random() - 0.5) * 0.7, random() * 6, (random() - 0.5) * 0.7);
        const k = 0.6 + random() * 1.1;
        m.compose(new THREE.Vector3(Math.sin(t) * r, inside ? bed : 0, Math.cos(t) * r), q.setFromEuler(e), new THREE.Vector3(k, k * (inside ? 1.3 : 0.8), k));
        tufts.setMatrixAt(i, m);
      }
      tufts.castShadow = true;
      s.root.add(tufts);
      if (dead) for (let i = 0; i < 5; i++) { const t = random() * 6, r = random() * 0.15; s.ball([0.02, 0.02, 0.02], [Math.sin(t) * r, bed + 0.36 + random() * 0.12, Math.cos(t) * r], s.material('#e8d24a'), 8); }
    }

    const speed = mix(4, 13, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const f of flames) { const k = 0.8 + 0.3 * Math.sin(time * speed + f.userData.p) + 0.12 * Math.sin(time * speed * 2.3 + f.userData.p * 2); f.scale.set(1, k, 1); }
        ember.emissiveIntensity = (0.4 + glow) * (0.85 + 0.15 * Math.sin(time * 2.1));
        smoke.forEach((p, i) => { p.position.x += Math.sin(time * 0.7 + i) * 0.0004; });
      },
    });
  },
});
