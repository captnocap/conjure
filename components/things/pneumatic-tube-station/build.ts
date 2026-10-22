import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const PLAQUES = {
  cashier: 'CASHIER', accounts: 'ACCOUNTS', pharmacy: 'PHARMACY', mailroom: 'MAIL ROOM', vault: 'VAULT', send: 'SEND', lab: 'LAB',
} as const;

export default defineThing({
  questions: {
    tubes: choice('How many tubes does the station serve?', {
      one: 'A single tube.',
      two: 'A pair: one sends, one receives.',
      three: 'Three, each to a different department.',
      five: 'A whole organ-pipe bank of five.',
    }),
    era: choice('What era is the station?', {
      victorian: 'Victorian: polished brass pipes and glass on a mahogany cabinet.',
      department: 'A 1930s department-store cash office: cream enamel and nickel.',
      driveup: 'A 1960s drive-through teller kiosk in beige and aqua plastic with a clear tube.',
      hospital: 'A modern hospital station: stainless panel, keypad and a small screen.',
    }),
    capsule: choice('Where is the carrier capsule right now?', {
      landed: 'Just landed in the catch basket.',
      flight: 'In flight, visible shooting down the glass section.',
      jammed: 'Jammed halfway down the glass, a red lamp lit.',
      pile: 'Several carriers have piled up unanswered.',
      opened: 'Opened on the counter, its contents taken out beside it.',
    }),
    contents: choice('What is in the carrier?', {
      cash: 'A tight roll of banknotes.',
      coins: 'A stack of coins.',
      note: 'A rolled paper message.',
      vial: 'An amber medicine bottle.',
      flower: 'A single red flower, sent to someone upstairs.',
      key: 'A brass key.',
      empty: 'Nothing: it arrived empty.',
    }),
    route: choice('Where do the tubes go?', {
      up: 'Straight up into the ceiling.',
      over: 'Up and then bending overhead toward the back.',
      side: 'Up and then sweeping off sideways at staggered heights.',
    }),
    plaque: choice('What does the plaque on the cabinet say?', PLAQUES),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { one: 1, two: 2, three: 3, five: 5 }[a.tubes];
    const palette = {
      victorian: { pipe: '#d6a640', body: '#5a2f1e', top: '#e6e2d8', accent: '#d6a640', felt: '#7a1f24' },
      department: { pipe: '#cfd3d2', body: '#e9e0c6', top: '#3d4a44', accent: '#cfd3d2', felt: '#2a2a2e' },
      driveup: { pipe: '#d9d2bd', body: '#d9cfb4', top: '#49b3a8', accent: '#49b3a8', felt: '#e2742a' },
      hospital: { pipe: '#c9cfd2', body: '#dfe3e4', top: '#9aa3a7', accent: '#2f7fd0', felt: '#2f7fd0' },
    }[a.era];
    const metal = (hex: string, rough = 0.3) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#6f6a55'), mood.wear * 0.45), metalness: 0.6, roughness: mix(rough, 0.75, mood.wear) });
    const pipe = a.era === 'driveup' ? s.material(palette.pipe, { roughness: 0.5 }) : metal(palette.pipe);
    const accent = a.era === 'victorian' || a.era === 'department' ? metal(palette.accent) : s.material(palette.accent, { roughness: 0.45 });
    const body = s.material(palette.body, { roughness: a.era === 'victorian' ? 0.5 : 0.6 });
    const dark = s.material('#1e1f22');
    const glass = new THREE.MeshStandardMaterial({ color: '#c9ebe6', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });

    const pitch = 0.42, R = 0.078;
    const W = Math.max(0.9, count * pitch + 0.4), CH = 0.92, CD = 0.62;
    // Cabinet.
    if (a.era === 'driveup') {
      s.box([W + 0.5, 0.16, CD + 0.5], [0, 0.08, 0], s.material('#b5b2a8', { roughness: 0.95 }));
      s.box([W * 0.7, CH - 0.16, CD * 0.7], [0, 0.16 + (CH - 0.16) / 2, 0], body);
      s.box([W, 0.2, CD], [0, CH - 0.1, 0], s.material(palette.top));
      for (let i = 0; i < 6; i++) s.box([0.16, 0.008, 0.01], [-W * 0.18, 0.5 + i * 0.028, CD * 0.35 + 0.004], dark);
      s.cylinder(0.05, 0.05, 0.03, [W * 0.18, 0.56, CD * 0.35 + 0.01], s.material('#d8322a', { emissive: '#d8322a', emissiveIntensity: 0.5 }), 16).rotation.x = Math.PI / 2;
    } else {
      s.box([W + 0.04, 0.1, CD + 0.02], [0, 0.05, 0], dark);
      s.box([W, CH - 0.1, CD], [0, 0.1 + (CH - 0.1) / 2, 0], body);
      const panels = Math.max(2, Math.round(W / 0.45));
      for (let i = 0; i < panels; i++) {
        const pw = (W - 0.08) / panels;
        const x = -W / 2 + 0.04 + (i + 0.5) * pw;
        s.box([pw - 0.05, CH - 0.34, 0.015], [x, 0.1 + (CH - 0.24) / 2, CD / 2 + 0.006], a.era === 'victorian' ? s.material('#6d3a26') : s.material(new THREE.Color(palette.body).multiplyScalar(0.92)));
        if (a.era !== 'hospital') s.ball([0.02, 0.02, 0.02], [x + pw * 0.3, 0.5, CD / 2 + 0.025], accent, 8);
      }
    }
    s.box([W + 0.08, 0.04, CD + 0.08], [0, CH + 0.02, 0], a.era === 'driveup' ? body : s.material(palette.top, { roughness: 0.35 }));
    const T = CH + 0.04;
    const text = PLAQUES[a.plaque];
    s.box([Math.min(W * 0.7, 0.62), 0.12, 0.012], [0, CH - 0.12, CD / 2 + 0.02], accent);
    s.label(text, Math.min(W * 0.7, 0.62) - 0.04, 0.09, [0, CH - 0.12, CD / 2 + 0.028], a.era === 'hospital' ? '#ffffff' : '#201c12', a.era === 'hospital' ? '#2f7fd0' : '#e9d9a0');

    // Back board the heads mount on.
    const backZ = -CD / 2 + 0.08;
    s.box([W - 0.06, 0.9, 0.06], [0, T + 0.45, backZ - 0.07], body);
    if (a.era === 'hospital') {
      s.box([0.2, 0.26, 0.02], [W / 2 - 0.2, T + 0.5, backZ - 0.03], dark);
      s.box([0.16, 0.1, 0.004], [W / 2 - 0.2, T + 0.56, backZ - 0.018], new THREE.MeshStandardMaterial({ color: '#0d2a3a', emissive: '#39c0e8', emissiveIntensity: mix(0.5, 1.4, mood.cheer) }));
      for (let i = 0; i < 9; i++) s.box([0.03, 0.03, 0.006], [W / 2 - 0.24 + (i % 3) * 0.04, T + 0.46 - Math.floor(i / 3) * 0.04, backZ - 0.018], s.material('#c9cfd2'));
    }

    // Capsule builder.
    const feltMat = s.material(palette.felt, { roughness: 1 });
    const makeCapsule = (withContents: boolean) => {
      const g = new THREE.Group();
      const add = (m: THREE.Object3D) => { g.add(m); return m; };
      const L = 0.34, r = 0.064;
      add(s.mesh(new THREE.CylinderGeometry(r, r, L * 0.62, 16, 1, true), glass));
      for (const e of [-1, 1]) {
        add(s.cylinder(r + 0.004, r + 0.004, L * 0.16, [0, e * L * 0.39, 0], accent, 16));
        add(s.cylinder(r + 0.011, r + 0.011, 0.03, [0, e * L * 0.47, 0], feltMat, 16));
      }
      if (withContents) g.add(makeContents(1.05));
      return g;
    };
    const makeContents = (scale: number) => {
      const g = new THREE.Group();
      const add = (m: THREE.Object3D) => { g.add(m); return m; };
      if (a.contents === 'cash') { add(s.cylinder(0.034, 0.034, 0.15, [0, 0, 0], s.material('#7fa377'), 14)); add(s.cylinder(0.036, 0.036, 0.03, [0, 0, 0], s.material('#c9482e'), 14)); }
      else if (a.contents === 'coins') { for (let i = 0; i < 9; i++) add(s.cylinder(0.032, 0.032, 0.012, [(random() - 0.5) * 0.006, -0.065 + i * 0.016, (random() - 0.5) * 0.006], new THREE.MeshStandardMaterial({ color: i % 3 ? '#e0b440' : '#c9cdd0', metalness: 0.6, roughness: 0.3 }), 12)); }
      else if (a.contents === 'note') { add(s.cylinder(0.026, 0.03, 0.15, [0, 0, 0], s.material('#f3ecd6', { roughness: 1 }), 12)); add(s.cylinder(0.031, 0.031, 0.012, [0, 0.01, 0], s.material('#a31f2c'), 12)); }
      else if (a.contents === 'vial') { add(s.cylinder(0.03, 0.03, 0.1, [0, -0.02, 0], s.material('#c9781e', { roughness: 0.2, emissive: '#7a3a00', emissiveIntensity: 0.4 }), 12)); add(s.cylinder(0.024, 0.024, 0.035, [0, 0.045, 0], s.material('#f4f4f0'), 12)); add(s.cylinder(0.031, 0.031, 0.05, [0, -0.02, 0], s.material('#f4f4f0'), 12)); }
      else if (a.contents === 'flower') { add(s.rod([0, -0.08, 0], [0, 0.04, 0], 0.005, s.material('#2f7a3a'))); for (let i = 0; i < 6; i++) add(s.ball([0.02, 0.014, 0.02], [Math.cos(i) * 0.016, 0.05 + (i % 2) * 0.01, Math.sin(i) * 0.016], s.material('#d8243a', { emissive: '#6a0010', emissiveIntensity: 0.5 }), 8)); add(s.ball([0.02, 0.006, 0.01], [0.02, -0.02, 0], s.material('#2f7a3a'), 8)); }
      else if (a.contents === 'key') { const brassKey = metal('#d6a640'); add(s.ring(0.022, 0.007, [0, 0.045, 0], brassKey)); add(s.rod([0, 0.025, 0], [0, -0.07, 0], 0.007, brassKey)); add(s.box([0.022, 0.012, 0.006], [0.012, -0.05, 0], brassKey)); add(s.box([0.016, 0.012, 0.006], [0.01, -0.03, 0], brassKey)); }
      g.scale.setScalar(scale);
      return g;
    };

    // Tubes.
    const lamps: THREE.MeshStandardMaterial[] = [];
    const active = Math.floor(random() * count);
    let flyer: THREE.Group | null = null;
    const glassBottom = T + 0.78, glassTop = T + 1.45, tz = backZ + 0.02;
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * pitch;
      // Outlet bend down into the basket.
      const mouth: P3 = [x, T + 0.36, tz + 0.2];
      s.tube([mouth, [x, T + 0.44, tz + 0.17], [x, T + 0.6, tz + 0.03], [x, glassBottom, tz]], R, pipe);
      const bell = s.mesh(new THREE.CylinderGeometry(R + 0.005, R + 0.035, 0.07, 20, 1, true), accent, [x, T + 0.335, tz + 0.21]);
      bell.rotation.x = 0.35;
      (bell.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      // Glass sight section with collars and guard rods.
      s.mesh(new THREE.CylinderGeometry(R, R, glassTop - glassBottom, 18, 1, true), glass, [x, (glassTop + glassBottom) / 2, tz]);
      for (const y of [glassBottom, glassTop]) s.cylinder(R + 0.018, R + 0.018, 0.05, [x, y, tz], accent, 18);
      for (let k = 0; k < 3; k++) { const t = k * 2.1 + 0.5; s.rod([x + Math.cos(t) * (R + 0.008), glassBottom, tz + Math.sin(t) * (R + 0.008)], [x + Math.cos(t) * (R + 0.008), glassTop, tz + Math.sin(t) * (R + 0.008)], 0.006, accent); }
      // Upper run.
      const topY = T + 2.0 + (a.route === 'up' ? random() * 0.1 : 0);
      let run: P3[];
      if (a.route === 'up') run = [[x, glassTop, tz], [x, topY, tz]];
      else if (a.route === 'over') run = [[x, glassTop, tz], [x, topY - 0.3, tz], [x, topY - 0.06, tz - 0.14], [x, topY, tz - 0.4], [x, topY, tz - 0.85]];
      else { const yy = T + 1.62 + i * 0.16; run = [[x, glassTop, tz], [x, yy - 0.2, tz], [x + 0.07, yy - 0.04, tz], [x + 0.25, yy, tz], [W / 2 + 0.5, yy, tz]]; }
      s.tube(run, R, pipe);
      const end = run[run.length - 1];
      s.cylinder(R + 0.02, R + 0.02, 0.05, end, accent, 18).rotation.set(a.route === 'over' ? Math.PI / 2 : 0, 0, a.route === 'side' ? Math.PI / 2 : 0);
      s.cylinder(R + 0.014, R + 0.014, 0.04, [x, T + 1.7 > end[1] ? glassTop + 0.12 : T + 1.7, tz], accent, 18);
      // Head clamp, lamp and a send lever.
      s.box([0.2, 0.1, 0.12], [x, T + 0.68, tz - 0.01], a.era === 'victorian' ? accent : body);
      const jam = a.capsule === 'jammed' && i === active;
      const lampHex = jam ? '#ff2a1a' : '#39d86a';
      const lamp = new THREE.MeshStandardMaterial({ color: lampHex, emissive: lampHex, emissiveIntensity: jam ? 2 : mix(0.3, 1.2, mood.cheer) });
      lamps.push(lamp);
      s.ball([0.022, 0.022, 0.022], [x - 0.06, T + 0.68, tz + 0.06], lamp, 10);
      s.rod([x + 0.06, T + 0.68, tz + 0.05], [x + 0.08, T + 0.74, tz + 0.12], 0.007, accent);
      s.ball([0.016, 0.016, 0.016], [x + 0.08, T + 0.74, tz + 0.12], dark, 8);
      // Catch basket.
      const bx = x, bz = tz + 0.27, by = T;
      if (a.era === 'victorian' || a.era === 'department') {
        s.ring(0.17, 0.008, [bx, by + 0.2, bz], accent).rotation.x = Math.PI / 2;
        s.ring(0.09, 0.008, [bx, by + 0.02, bz], accent).rotation.x = Math.PI / 2;
        for (let k = 0; k < 10; k++) { const t = (k / 10) * Math.PI * 2; s.rod([bx + Math.cos(t) * 0.09, by + 0.02, bz + Math.sin(t) * 0.09], [bx + Math.cos(t) * 0.17, by + 0.2, bz + Math.sin(t) * 0.17], 0.004, accent); }
        s.cylinder(0.09, 0.09, 0.02, [bx, by + 0.012, bz], feltMat, 16);
      } else {
        const bin = s.mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.18, 18, 1, true), new THREE.MeshStandardMaterial({ color: palette.top, roughness: 0.5, side: THREE.DoubleSide }), [bx, by + 0.09, bz]);
        bin.name = 'bin';
        s.cylinder(0.11, 0.11, 0.015, [bx, by + 0.008, bz], dark, 16);
      }
      if (i !== active) {
        if (a.capsule === 'pile' && random() < 0.8) { const c = makeCapsule(true); c.position.set(bx, by + 0.14, bz); c.rotation.set(0.5 + random() * 0.5, random() * 3, 0); s.root.add(c); }
        continue;
      }
      const cap = makeCapsule(a.capsule !== 'opened');
      s.root.add(cap);
      if (a.capsule === 'landed' || a.capsule === 'pile') { cap.position.set(bx, by + 0.2, bz); cap.rotation.set(0.75, random() * 0.6 - 0.3, 0.15); }
      else if (a.capsule === 'flight') { cap.position.set(x, (glassTop + glassBottom) / 2, tz); flyer = cap; }
      else if (a.capsule === 'jammed') { cap.position.set(x, mix(glassBottom, glassTop, 0.55), tz); cap.rotation.z = 0.12; }
      else {
        cap.position.set(bx - 0.02, T + 0.075, CD / 2 - 0.12); cap.rotation.set(0, 0.3, Math.PI / 2);
        const out = makeContents(1.5);
        out.position.set(bx + 0.24 > W / 2 ? bx - 0.26 : bx + 0.24, T + (a.contents === 'coins' || a.contents === 'vial' ? 0.1 : 0.045), CD / 2 - 0.1);
        if (a.contents !== 'coins' && a.contents !== 'vial') out.rotation.set(0, 0.4, Math.PI / 2);
        s.root.add(out);
        s.cylinder(0.058, 0.058, 0.03, [bx - 0.2, T + 0.015, CD / 2 - 0.08], feltMat, 16);
      }
    }
    if (a.capsule === 'pile') {
      for (let i = 0; i < 2 + Math.round(mood.density * 4); i++) {
        const c = makeCapsule(random() < 0.6);
        c.position.set((random() - 0.5) * (W - 0.2), T + 0.075, CD / 2 - 0.08 - random() * 0.06);
        c.rotation.set(0, random() * 3, Math.PI / 2);
        s.root.add(c);
      }
    }
    if (a.era === 'driveup') {
      // Clear bubble canopy over the heads.
      const dome = new THREE.Mesh(new THREE.SphereGeometry(W * 0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
      dome.position.set(0, T + 0.5, 0);
      dome.scale.set(1, 0.8, 0.7);
      s.root.add(dome);
    }
    if (mood.wear > 0.6) for (let i = 0; i < 4; i++) s.box([0.14, 0.003, 0.1], [(random() - 0.5) * W, T + 0.003, CD / 2 - 0.1 - random() * 0.1], s.material('#d8d2c0', { roughness: 1 })).rotation.y = random() * 3;

    const energy = mood.energy;
    const moving = flyer as THREE.Group | null;
    const span = glassTop - glassBottom - 0.3;
    return s.finish({
      update: (_dt, time) => {
        if (moving) moving.position.y = glassTop - 0.15 - ((time * mix(0.25, 2.4, energy)) % 1) * span;
        if (a.capsule === 'jammed') lamps[active].emissiveIntensity = Math.sin(time * mix(3, 10, energy)) > 0 ? 2.2 : 0.2;
      },
    });
  },
});
