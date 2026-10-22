import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const WHEELS = {
  red: 'Every handwheel fire-engine red.',
  coded: 'Colour coded: red master valves, yellow wings, blue on top.',
  yellow: 'Safety yellow wheels on a dark tree.',
  green: 'Green wheels, an operator with a house style.',
  bare: 'Bare steel wheels polished by gloves.',
} as const;
const BODIES = {
  oxide: 'Red-oxide primer brown.',
  green: 'Deep machinery green.',
  silver: 'Aluminium silver.',
  black: 'Black enamel.',
  yellow: 'Equipment yellow.',
  blue: 'Sun-faded blue.',
} as const;
const BODY_HEX: Record<keyof typeof BODIES, string> = { oxide: '#8a4031', green: '#2f5d43', silver: '#aeb4b6', black: '#26282a', yellow: '#d9a821', blue: '#58799c' };

export default defineThing({
  questions: {
    stack: score('How tall is the valve stack?', ['One valve and a tee on a tired stripper well', 'A standard tree with a master valve, a wing and a swab valve', 'A towering high-pressure tree with double master valves and two wings']),
    state: choice('What is the well doing?', {
      flowing: 'Flowing: valves open, the flowline carrying it away.',
      shutin: 'Shut in: wheels chained and padlocked, a red tag hanging.',
      leaking: 'Leaking: crude weeps from a flange, runs down the tree and pools at its foot.',
      plugged: 'Plugged and abandoned: the tree is gone, only a capped stub and a steel marker post with a welded plate remain.',
    }),
    wheels: choice('What colour are the handwheels?', WHEELS),
    body: choice('What colour is the tree painted?', BODIES),
    gauge: score('What does the pressure gauge read?', ['Zero, the needle on its pin', 'A modest steady pressure', 'High but in the green', 'Pegged deep in the red']),
    fence: choice('What kind of fence surrounds it?', {
      white: 'A square of white-painted pipe rail.',
      drillpipe: 'Rusty old drill pipe posts with sucker-rod rails.',
      bollards: 'Four fat yellow bollards and a chain.',
      panel: 'Galvanised wire cattle panels wired to T-posts.',
    }),
    sign: choice('What does the sign on the fence say?', {
      h2s: 'DANGER POISON GAS, red and white.',
      lease: 'The lease name and well number.',
      nosmoking: 'NO SMOKING.',
      keepout: 'KEEP OUT.',
      none: 'There is no sign.',
    }),
    left: choice('What has been left here?', {
      nothing: 'Nothing.',
      wrench: 'A big pipe wrench leaning against the tree.',
      gloves: 'A pair of work gloves draped over a handwheel.',
      nest: 'A bird has nested on top of the tree.',
      tumbleweed: 'A tumbleweed caught in the fence.',
      flowers: 'Wildflowers growing thick inside the fence where the cattle cannot reach.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const metal = (hex: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#74442b'), wear * 0.32), roughness: 0.5 + wear * 0.35, metalness: 0.3, ...options });
    const body = metal(BODY_HEX[a.body]), flange = metal(new THREE.Color(BODY_HEX[a.body]).offsetHSL(0, 0, -0.06)), steel = metal('#9da3a5', { metalness: 0.8, roughness: 0.3 }), dark = metal('#232527');
    const oil = new THREE.MeshStandardMaterial({ color: '#110d0a', roughness: 0.18, metalness: 0.4 });
    const wheelHex = (role: 'master' | 'wing' | 'top') => ({ red: '#c9291f', coded: { master: '#c9291f', wing: '#e3b81f', top: '#2b62b4' }[role], yellow: '#e3b81f', green: '#2f8a4a', bare: '#a9afb1' }[a.wheels]);
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, node: T) => { group.add(node); return node; };
    const tier = a.stack < 0.34 ? 0 : a.stack < 0.67 ? 1 : 2;
    const wheels: THREE.Group[] = [];

    const bolts: THREE.Matrix4[] = [];
    /** A flanged joint: two discs and a ring of studs. `axis` is 'y' or 'x'. */
    const joint = (x: number, y: number, radius: number, axis: 'x' | 'y' = 'y') => {
      const disc = s.cylinder(radius, radius, 0.11, [x, y, 0], flange, 20);
      if (axis === 'x') disc.rotation.z = Math.PI / 2;
      for (let i = 0; i < 10; i++) {
        const angle = i / 10 * Math.PI * 2, u = Math.cos(angle) * radius * 0.8, v = Math.sin(angle) * radius * 0.8;
        const matrix = new THREE.Matrix4();
        if (axis === 'y') matrix.makeTranslation(x + u, y, v);
        else matrix.makeRotationZ(Math.PI / 2).setPosition(x, y + u, v);
        bolts.push(matrix);
      }
    };
    const handwheel = (role: 'master' | 'wing' | 'top', radius: number) => {
      const group = new THREE.Group(), paint = metal(wheelHex(role), { metalness: a.wheels === 'bare' ? 0.8 : 0.2 });
      into(group, s.mesh(new THREE.TorusGeometry(radius, radius * 0.11, 8, 28), paint));
      for (let i = 0; i < 3; i++) into(group, s.box([radius * 2, radius * 0.12, radius * 0.1], [0, 0, 0], paint)).rotation.z = i * Math.PI / 3;
      into(group, s.cylinder(radius * 0.22, radius * 0.22, radius * 0.3, [0, 0, 0], steel, 10)).rotation.x = Math.PI / 2;
      group.rotation.z = random() * 3;
      wheels.push(group);
      return group;
    };
    /** A gate valve centred at (x, y) with its wheel toward +z. */
    const valve = (x: number, y: number, role: 'master' | 'wing' | 'top', along: 'x' | 'y', big = 1) => {
      s.box(along === 'y' ? [0.36 * big, 0.44 * big, 0.36 * big] : [0.44 * big, 0.36 * big, 0.36 * big], [x, y, 0], body);
      s.cylinder(0.13 * big, 0.16 * big, 0.3 * big, [x, y, 0.3 * big], body, 14).rotation.x = Math.PI / 2;
      s.cylinder(0.03 * big, 0.03 * big, 0.3 * big, [x, y, 0.55 * big], steel, 8).rotation.x = Math.PI / 2;
      const wheel = handwheel(role, 0.2 * big);
      wheel.position.set(x, y, 0.66 * big);
      s.root.add(wheel);
      return wheel;
    };

    // Pad, cellar ring and casing head: these stay even when the tree is gone.
    s.box([3.0, 0.08, 3.0], [0, 0.04, 0], s.material('#c2b9a2', { roughness: 1 }));
    s.cylinder(0.72, 0.72, 0.16, [0, 0.14, 0], metal('#8b8f8c', { metalness: 0.5 }), 26);
    s.cylinder(0.62, 0.62, 0.17, [0, 0.14, 0], s.material('#6e6252', { roughness: 1 }), 26);
    let y = 0.2;
    s.cylinder(0.26, 0.3, 0.42, [0, y + 0.21, 0], body, 20); y += 0.42;

    let top = y, gaugeAt: [number, number, number] | null = null;
    const leakAt: [number, number][] = [];
    if (a.state === 'plugged') {
      s.cylinder(0.34, 0.34, 0.05, [0, y + 0.025, 0], metal('#7c4a30'), 20);
      const post = s.cylinder(0.07, 0.07, 1.5, [0.02, y + 0.75, 0], metal('#7c4a30'), 10);
      post.rotation.z = (random() - 0.5) * 0.12;
      s.label(`P&A ${1958 + Math.floor(random() * 55)}`, 0.62, 0.3, [0.02, y + 1.2, 0.09], '#e9e1cc', '#5f3a27');
      s.box([0.66, 0.34, 0.02], [0.02, y + 1.2, 0.075], metal('#7c4a30'));
      top = y + 1.5;
    } else {
      // Casing-head side outlets with small valves.
      for (const d of [-1, 1]) {
        s.rod([d * 0.2, y - 0.2, 0], [d * 0.62, y - 0.2, 0], 0.06, body);
        s.box([0.16, 0.16, 0.16], [d * 0.5, y - 0.2, 0], body);
        const small = handwheel('wing', 0.085);
        small.position.set(d * 0.5, y - 0.2, 0.2);
        s.root.add(small);
        s.rod([d * 0.5, y - 0.2, 0.05], [d * 0.5, y - 0.2, 0.2], 0.015, steel);
      }
      joint(0, y, 0.34); leakAt.push([0, y]); y += 0.06;
      s.cylinder(0.2, 0.22, 0.32, [0, y + 0.16, 0], body, 18); y += 0.32;
      joint(0, y, 0.29); y += 0.06;
      for (let i = 0; i < (tier === 2 ? 2 : 1); i++) {
        valve(0, y + 0.22, 'master', 'y');
        y += 0.44; joint(0, y, 0.27); leakAt.push([0, y]); y += 0.06;
      }
      // Flow cross and wings.
      const crossY = y + 0.2;
      s.box([0.4, 0.4, 0.36], [0, crossY, 0], body);
      const sides = tier === 2 ? [-1, 1] : [1];
      for (const d of sides) {
        joint(d * 0.26, crossY, 0.22, 'x');
        valve(d * 0.54, crossY, 'wing', 'x', 0.85);
        joint(d * 0.82, crossY, 0.2, 'x');
        // Choke body, then the flowline turning down into the ground.
        s.rod([d * 0.85, crossY, 0], [d * 1.2, crossY, 0], 0.085, body);
        s.cylinder(0.07, 0.11, 0.3, [d * 1.2, crossY + 0.12, 0], body, 12);
        const knob = handwheel('wing', 0.07);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(d * 1.2, crossY + 0.3, 0);
        s.root.add(knob);
        const line = a.state === 'flowing' && mood.warmth < 0.35 ? metal('#e4ecee', { roughness: 0.9 }) : dark;
        s.tube([[d * 1.2, crossY - 0.02, 0], [d * 1.24, crossY - 0.4, -0.05], [d * 1.28, 0.25, -0.4], [d * 1.25, 0.1, -1.1], [d * 1.25, 0.04, -1.45]], 0.07, line);
      }
      if (tier < 2) { joint(-0.26, crossY, 0.22, 'x'); s.cylinder(0.2, 0.2, 0.05, [-0.33, crossY, 0], dark, 16).rotation.z = Math.PI / 2; }
      y += 0.4; joint(0, y, 0.25); leakAt.push([0, y]); y += 0.06;
      if (tier > 0) { valve(0, y + 0.2, 'top', 'y', 0.9); y += 0.4; joint(0, y, 0.23); y += 0.06; }
      // Tree cap, needle valve and the gauge.
      s.cylinder(0.12, 0.16, 0.16, [0, y + 0.08, 0], body, 14); y += 0.16;
      s.cylinder(0.025, 0.025, 0.2, [0, y + 0.1, 0], steel, 8);
      s.box([0.07, 0.07, 0.07], [0, y + 0.1, 0], steel);
      y += 0.2;
      gaugeAt = [0, y + 0.15, 0];
      top = y + 0.32;
    }
    {
      const stud = new THREE.CylinderGeometry(0.022, 0.022, 0.2, 6);
      const mesh = new THREE.InstancedMesh(stud, steel, Math.max(bolts.length, 1));
      bolts.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.visible = bolts.length > 0;
      mesh.castShadow = true;
      s.root.add(mesh);
    }

    // Gauge: a painted face and a live needle.
    let needle: THREE.Mesh | null = null;
    const reading = a.state === 'plugged' ? 0 : a.gauge;
    const needleAngle = (value: number) => mix(Math.PI * 0.75, -Math.PI * 0.75, value);
    if (gaugeAt) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f5f2e6'; ctx.beginPath(); ctx.arc(128, 128, 126, 0, 7); ctx.fill();
      ctx.lineWidth = 22; ctx.strokeStyle = '#3c9a52'; ctx.beginPath(); ctx.arc(128, 128, 96, Math.PI * 0.75, Math.PI * 1.85); ctx.stroke();
      ctx.strokeStyle = '#d32a22'; ctx.beginPath(); ctx.arc(128, 128, 96, Math.PI * 1.85, Math.PI * 2.25); ctx.stroke();
      ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 7;
      for (let i = 0; i <= 10; i++) { const angle = Math.PI * 0.75 + i / 10 * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(128 + Math.cos(angle) * 84, 128 + Math.sin(angle) * 84); ctx.lineTo(128 + Math.cos(angle) * 116, 128 + Math.sin(angle) * 116); ctx.stroke(); }
      ctx.fillStyle = '#1b1b1b'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PSI', 128, 205);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const [gx, gy] = gaugeAt;
      s.cylinder(0.175, 0.175, 0.09, [gx, gy, 0], dark, 24).rotation.x = Math.PI / 2;
      s.mesh(new THREE.CircleGeometry(0.16, 28), new THREE.MeshStandardMaterial({ map, roughness: 0.4 }), [gx, gy, 0.047]);
      const back = s.mesh(new THREE.CircleGeometry(0.16, 28), new THREE.MeshStandardMaterial({ map, roughness: 0.4 }), [gx, gy, -0.047]);
      back.rotation.y = Math.PI;
      const hand = new THREE.BoxGeometry(0.018, 0.14, 0.006);
      hand.translate(0, 0.055, 0);
      needle = s.mesh(hand, new THREE.MeshStandardMaterial({ color: '#c8201a', roughness: 0.5 }), [gx, gy, 0.053]);
      needle.rotation.z = needleAngle(reading);
      needle.castShadow = false;
    }

    // State dressing.
    if (a.state === 'leaking' && leakAt.length) {
      const [, ly] = leakAt[Math.min(leakAt.length - 1, 1 + Math.floor(random() * (leakAt.length - 1)))];
      const run = s.cylinder(0.3, 0.33, ly - 0.15, [0, 0.15 + (ly - 0.15) / 2, 0], oil, 16);
      run.scale.set(0.82, 1, 1.28); run.position.z = 0.03;
      for (let i = 0; i < 6; i++) { const angle = -0.6 + random() * 1.9; s.rod([Math.cos(angle) * 0.27, ly, Math.sin(angle) * 0.27], [Math.cos(angle) * 0.3, ly - 0.3 - random() * 0.5, Math.sin(angle) * 0.3], 0.03, oil, 0.012); }
      const pool = s.cylinder(0.95, 0.95, 0.016, [0.1, 0.09, 0.25], oil, 24); pool.scale.z = 0.8; pool.castShadow = false;
      const pool2 = s.cylinder(0.4, 0.4, 0.016, [0.8, 0.091, 0.85], oil, 16); pool2.castShadow = false;
    }
    if (a.state === 'shutin') {
      const chain = metal('#5d6062', { metalness: 0.7 });
      const masters = wheels.filter((wheel) => Math.abs(wheel.position.x) < 0.01 && wheel.position.z > 0.5);
      for (const wheel of masters) {
        const { x, y: wy, z } = wheel.position;
        s.tube([[x - 0.17, wy, z], [x - 0.24, wy - 0.05, z - 0.3], [x - 0.2, wy - 0.02, z - 0.62], [x + 0.2, wy + 0.02, z - 0.62], [x + 0.24, wy - 0.06, z - 0.3], [x + 0.17, wy, z]], 0.02, chain, true);
        s.box([0.09, 0.11, 0.04], [x + 0.18, wy - 0.14, z + 0.02], metal('#c9a13a', { metalness: 0.7 }));
        const tag = s.box([0.13, 0.2, 0.01], [x - 0.14, wy - 0.2, z + 0.03], metal('#d3261e', { metalness: 0 })); tag.rotation.z = 0.2;
      }
    }

    // Fence.
    const half = 1.3, railHeight = a.fence === 'bollards' ? 0.75 : 1.15;
    const corners: [number, number][] = [[-half, half], [half, half], [half, -half], [-half, -half]];
    const fencePaint = { white: metal('#eeece4', { metalness: 0 }), drillpipe: metal('#7a4a30'), bollards: metal('#e3b81f', { metalness: 0 }), panel: metal('#b4bab8', { metalness: 0.6 }) }[a.fence];
    corners.forEach(([ax, az], index) => {
      const [bx, bz] = corners[(index + 1) % 4];
      if (a.fence === 'bollards') {
        s.cylinder(0.13, 0.13, 0.95, [ax, 0.47, az], fencePaint, 14);
        s.ball([0.13, 0.06, 0.13], [ax, 0.95, az], fencePaint, 12);
        s.tube([[ax, 0.8, az], [mix(ax, bx, 0.5), 0.5, mix(az, bz, 0.5)], [bx, 0.8, bz]], 0.022, steel);
        return;
      }
      const gate = index === 3;
      for (let i = 0; i < 2; i++) { const t = i / 2; s.cylinder(a.fence === 'drillpipe' ? 0.065 : a.fence === 'panel' ? 0.03 : 0.05, a.fence === 'drillpipe' ? 0.065 : a.fence === 'panel' ? 0.03 : 0.05, railHeight + (a.fence === 'panel' ? 0.3 : 0.05), [mix(ax, bx, t), (railHeight + 0.05) / 2, mix(az, bz, t)], a.fence === 'panel' ? metal('#3f6b4b') : fencePaint, 8); }
      const rails = a.fence === 'panel' ? [0.2, 0.42, 0.62, 0.82, 1.0, 1.15] : a.fence === 'drillpipe' ? [0.45, 0.8, 1.1] : [0.6, 1.12];
      const swing = gate ? 0.5 * (a.state === 'plugged' ? 1 : 0.25 + random() * 0.6) : 0;
      const ex = gate ? ax - Math.sin(swing) * 2 * half : bx, ez = gate ? az + Math.cos(swing) * 2 * half : bz;
      for (const height of rails) s.rod([ax, height, az], [ex, height, ez], a.fence === 'panel' ? 0.012 : a.fence === 'drillpipe' ? 0.022 : 0.04, fencePaint);
      if (a.fence === 'panel') for (let i = 1; i < 9; i++) s.rod([mix(ax, ex, i / 9), 0.2, mix(az, ez, i / 9)], [mix(ax, ex, i / 9), 1.15, mix(az, ez, i / 9)], 0.012, fencePaint);
    });
    if (a.sign !== 'none') {
      const text = { h2s: 'DANGER POISON GAS', lease: `${['MABEE', 'YATES', 'HOLT', 'SPRABERRY', 'WADDELL'][Math.floor(random() * 5)]} ${1 + Math.floor(random() * 60)}`, nosmoking: 'NO SMOKING', keepout: 'KEEP OUT' }[a.sign];
      const [ink, paper] = { h2s: ['#ffffff', '#c22b23'], lease: ['#1f2a24', '#efe9d6'], nosmoking: ['#c22b23', '#f4f0e2'], keepout: ['#1b1b1b', '#e6c42a'] }[a.sign];
      const sy = a.fence === 'bollards' ? 0.62 : 0.86;
      const plate = s.label(text, 0.95, 0.38, [-0.7, sy, half + 0.07], ink, paper);
      plate.rotation.z = (random() - 0.5) * (0.05 + wear * 0.25);
      if (a.fence === 'bollards') for (const d of [-0.4, 0.4]) s.cylinder(0.025, 0.025, sy + 0.2, [-0.7 + d, (sy + 0.2) / 2, half + 0.04], steel, 6);
      if (wear > 0.55) for (let i = 0; i < 3; i++) { const hole = s.mesh(new THREE.CircleGeometry(0.025, 8), new THREE.MeshBasicMaterial({ color: '#1a1410' }), [-0.7 + (random() - 0.5) * 0.7, sy + (random() - 0.5) * 0.25, half + 0.075]); hole.castShadow = false; }
    }

    // Weeds along the fence line, more with neglect.
    const tuft = new THREE.ConeGeometry(0.1, 0.5, 5);
    tuft.translate(0, 0.25, 0);
    const weedCount = Math.round(4 + mood.density * 14 + wear * 12 + (a.state === 'plugged' ? 22 : 0));
    s.scatter(tuft, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), Array.from({ length: weedCount }, () => {
      const edge = a.state !== 'plugged' || random() < 0.5, side = Math.floor(random() * 4), t = (random() - 0.5) * 2.7, d = edge ? half + (random() - 0.5) * 0.3 : random() * half;
      const [x, z] = side === 0 ? [t, d] : side === 1 ? [d, t] : side === 2 ? [t, -d] : [-d, t];
      return { at: [x, 0.07, z] as [number, number, number], size: 0.6 + random() * 1.2, color: new THREE.Color().setHSL(0.14 + random() * 0.08, 0.55, 0.12 + random() * 0.1) };
    }));

    if (a.left === 'wrench') {
      const red = metal('#b8271f');
      const lean = new THREE.Group();
      into(lean, s.box([0.06, 0.95, 0.035], [0, 0.48, 0], red));
      into(lean, s.box([0.2, 0.09, 0.05], [0.05, 0.99, 0], steel));
      into(lean, s.box([0.08, 0.2, 0.05], [0.13, 0.9, 0], steel));
      lean.position.set(0.42, 0.08, 0.38);
      lean.rotation.z = 0.28; lean.rotation.y = -0.5;
      s.root.add(lean);
    }
    if (a.left === 'gloves' && wheels.length) {
      const leather = s.material('#c79a4e');
      const wheel = wheels.find((candidate) => Math.abs(candidate.position.x) < 0.01 && candidate.position.z > 0.5) ?? wheels[0];
      for (const d of [-0.07, 0.08]) { s.box([0.11, 0.26, 0.05], [wheel.position.x + d, wheel.position.y + 0.14, wheel.position.z + 0.03], leather).rotation.z = d * 3; s.box([0.11, 0.05, 0.12], [wheel.position.x + d, wheel.position.y + 0.26, wheel.position.z - 0.02], leather); }
    }
    if (a.left === 'nest') {
      const twig = s.material('#7b6040');
      const ny = a.state === 'plugged' ? top : (gaugeAt ? gaugeAt[1] - 0.42 : top);
      const nz = a.state === 'plugged' ? 0 : -0.02;
      s.ring(0.15, 0.06, [0.02, ny + 0.03, nz], twig).rotation.x = Math.PI / 2;
      s.cylinder(0.14, 0.1, 0.05, [0.02, ny, nz], twig, 10);
      for (let i = 0; i < 3; i++) s.ball([0.035, 0.045, 0.035], [0.02 + Math.cos(i * 2.1) * 0.05, ny + 0.06, nz + Math.sin(i * 2.1) * 0.05], s.material('#cfe3e6'), 8);
      for (let i = 0; i < 8; i++) { const angle = random() * 6.28; s.rod([0.02 + Math.cos(angle) * 0.1, ny + 0.03, nz + Math.sin(angle) * 0.1], [0.02 + Math.cos(angle + 0.8) * 0.3, ny + 0.02 + random() * 0.08, nz + Math.sin(angle + 0.8) * 0.3], 0.008, twig); }
    }
    if (a.left === 'tumbleweed') {
      const size = 0.42 + random() * 0.15;
      s.mesh(new THREE.IcosahedronGeometry(size, 2), new THREE.MeshStandardMaterial({ color: '#b39a63', roughness: 1, wireframe: true }), [0.7, size + 0.05, half + size * 0.8]);
      s.mesh(new THREE.IcosahedronGeometry(size * 0.7, 1), new THREE.MeshStandardMaterial({ color: '#9c8250', roughness: 1, flatShading: true }), [0.7, size + 0.05, half + size * 0.8]);
    }
    if (a.left === 'flowers') {
      const stem = new THREE.ConeGeometry(0.05, 0.36, 5);
      stem.translate(0, 0.18, 0);
      const patch = Array.from({ length: 70 }, () => { const x = (random() - 0.5) * 2.4, z = (random() - 0.5) * 2.4; return { x, z }; }).filter(({ x, z }) => Math.hypot(x, z) > 0.75);
      s.scatter(stem, new THREE.MeshStandardMaterial({ roughness: 1 }), patch.map(({ x, z }) => ({ at: [x, 0.07, z] as [number, number, number], size: 0.7 + random() * 0.6, color: '#4c7a3a' })));
      s.scatter(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), patch.map(({ x, z }) => ({ at: [x, 0.33 + random() * 0.14, z] as [number, number, number], size: 0.8 + random() * 0.6, color: random() < 0.7 ? '#3d55c4' : random() < 0.5 ? '#e8b92c' : '#d8452e' })));
    }

    const tremble = mix(0.004, 0.06, mood.energy) * (a.state === 'flowing' || a.state === 'leaking' ? 1 : 0.15);
    return s.finish({
      update: (_dt, time) => { if (needle) needle.rotation.z = needleAngle(reading) + Math.sin(time * 17) * tremble + Math.sin(time * 3.1) * tremble; },
    });
  },
});
