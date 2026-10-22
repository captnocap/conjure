import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const FINISH = {
  chrome: { say: 'Chrome with fire-engine red fins and grip.', body: '#cfd5da', trim: '#c92a22', grip: '#7a1d18', glow: '#ff5a2a', metal: 0.4 },
  brass: { say: 'Brass and copper with a green glass glow, a Victorian scientist\'s pistol.', body: '#c69a48', trim: '#8a5a2c', grip: '#4a2f1c', glow: '#5dff8a', metal: 0.4 },
  gunmetal: { say: 'Blue-black gunmetal with a cold blue glow, a soldier\'s sidearm.', body: '#4a5560', trim: '#2b3138', grip: '#1c1f24', glow: '#4fc8ff', metal: 0.35 },
  gold: { say: 'Gold with an ivory grip and a violet glow, a princess\'s or an emperor\'s.', body: '#dcb648', trim: '#efe6cf', grip: '#efe6cf', glow: '#c06bff', metal: 0.45 },
  toy: { say: 'Tin-toy red, yellow and blue, loud as a cereal box.', body: '#d8322a', trim: '#f2c21b', grip: '#2456b8', glow: '#ffe23a', metal: 0.1 },
  bone: { say: 'Pale alien ceramic with teal veins, not made by human hands.', body: '#e4dccb', trim: '#2f9d95', grip: '#3b6f6a', glow: '#3affd8', metal: 0.05 },
} as const;

export default defineThing({
  questions: {
    style: choice('What kind of raygun is it?', {
      atomic: 'The classic: a bulbous body, a barrel stacked with shrinking rings, a ball tip and tail fins.',
      needle: 'Slender and long, a needle barrel ending in a small dish.',
      blunderbuss: 'Fat and short with a flared bell muzzle, a space pirate\'s.',
      blaster: 'Chunky and boxy with cooling vanes and a stubby barrel.',
      bulb: 'A glass globe at the back holding the coil, focusing rings in front.',
    }),
    finish: choice('What is it made of?', Object.fromEntries(Object.entries(FINISH).map(([k, f]) => [k, f.say])) as Record<keyof typeof FINISH, string>),
    charge: choice('What state is its charge in?', {
      charged: 'Fully charged: the coil glows steady and bright.',
      overload: 'Overloading: white-hot and throwing sparks, about to go off.',
      low: 'Nearly drained: a dim, guttering glow.',
      spent: 'Spent and dark, a wisp of smoke at the muzzle.',
      broken: 'Broken open, the coil sprung out and dead.',
    }),
    marks: choice('What marks has it left nearby?', {
      none: 'None: it was set down carefully.',
      streak: 'A black scorch streak burned across the stone.',
      crater: 'A neat glassy hole melted into the rock, still glowing at the rim.',
      ash: 'A pile of ash and a pair of empty smoking boots beside the stone.',
      slag: 'One end of the rock melted and run like wax.',
    }),
    rock: choice('What kind of stone is it lying on?', {
      slab: 'A flat grey slab, like an altar.',
      mossy: 'A rounded boulder furred with moss.',
      violet: 'Violet moon rock, pitted.',
      sandstone: 'Layered orange sandstone.',
      crystal: 'Black basalt studded with glowing crystals.',
    }),
    left: choice('What else was left with it?', {
      nothing: 'Nothing else.',
      holster: 'A gun belt and empty holster draped over the stone.',
      cells: 'A few spare power cells, some rolled away.',
      glove: 'A single gauntlet, palm up.',
      goggles: 'A pair of round goggles.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const f = FINISH[a.finish];
    const body = s.material(f.body, { metalness: f.metal, roughness: 0.3 });
    const trim = s.material(f.trim, { metalness: f.metal * 0.6, roughness: 0.4, side: THREE.DoubleSide });
    const gripMat = s.material(f.grip, { roughness: 0.6 });
    const dark = s.material('#1f2126', { roughness: 0.7 });
    const live = a.charge === 'charged' || a.charge === 'overload' || a.charge === 'low';
    const power = { charged: 1.6, overload: 2.8, low: 0.5, spent: 0, broken: 0 }[a.charge] * mix(0.75, 1.15, mood.energy);
    const glowColour = a.charge === 'overload' ? new THREE.Color(f.glow).lerp(new THREE.Color('#ffffff'), 0.55) : new THREE.Color(f.glow);
    const coilMat = new THREE.MeshStandardMaterial({ color: live ? glowColour : '#4a3f3a', emissive: live ? glowColour : '#000000', emissiveIntensity: power, roughness: 0.4 });

    // ---- Rock ----
    const rockHue = { slab: '#8b8a88', mossy: '#7b7a72', violet: '#7d5f9a', sandstone: '#c98248', crystal: '#35323a' }[a.rock];
    const rockMat = s.material(rockHue, { roughness: 1, flatShading: true, vertexColors: a.rock === 'sandstone' || a.rock === 'mossy' });
    const rw = mix(0.44, 0.5, random()), rd = mix(0.31, 0.36, random()), top = a.rock === 'mossy' ? 0.2 : 0.17;
    const geometry = new THREE.IcosahedronGeometry(1, a.rock === 'slab' ? 2 : 3);
    const p = geometry.attributes.position, colours: number[] = [];
    const n1 = random() * 10, n2 = random() * 10;
    const paint = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const bump = 1 + 0.13 * Math.sin(x * 5 + n1) * Math.cos(z * 4 + n2) + 0.08 * Math.sin(y * 9 + x * 3 + n1);
      x *= rw * bump; z *= rd * bump; y *= (a.rock === 'mossy' ? 0.3 : 0.34) * bump;
      if (a.marks === 'slag' && x > 0.2) { const k = (x - 0.2) / 0.4; y -= k * k * 0.16; z *= 1 + k * 0.25; }
      y = Math.max(-0.16, Math.min(top + (a.rock === 'mossy' ? Math.sin(x * 9) * 0.012 : 0), y));
      if (a.rock === 'slab') { x = Math.sign(x) * Math.min(Math.abs(x), rw * 0.86); z = Math.sign(z) * Math.min(Math.abs(z), rd * 0.86); }
      p.setXYZ(i, x, y, z);
      if (a.rock === 'sandstone') paint.set(Math.floor((y + 0.2) * 22) % 2 ? '#d99558' : '#b56c3a');
      else if (a.rock === 'mossy') paint.set(y > 0.1 || Math.sin(x * 14 + z * 9) > 0.55 ? '#5f8f3c' : '#8a8880');
      else paint.set('#ffffff');
      colours.push(paint.r, paint.g, paint.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    if (a.rock === 'sandstone' || a.rock === 'mossy') rockMat.color.set('#ffffff');
    geometry.computeVertexNormals();
    const pebbleMat = s.material(rockHue, { roughness: 1, flatShading: true });
    const slab = new THREE.Group();
    slab.position.y = 0.16; slab.rotation.x = 0.24; slab.rotation.z = (random() - 0.5) * 0.08;
    s.root.add(slab);
    const onSlab = <T extends THREE.Object3D>(o: T) => { slab.add(o); return o; };
    onSlab(s.mesh(geometry, rockMat));
    const crystalMats: THREE.MeshStandardMaterial[] = [];
    if (a.rock === 'crystal') for (let i = 0; i < 9; i++) {
      const hue = new THREE.Color().setHSL(mix(0.5, 0.85, random()), 0.8, 0.6), mat = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 0.9, roughness: 0.2, flatShading: true });
      crystalMats.push(mat);
      const t = random() * Math.PI * 2, h = 0.16 + random() * 0.2;
      const shard = onSlab(s.mesh(new THREE.ConeGeometry(0.045 + random() * 0.03, h, 5), mat, [Math.sin(t) * rw * 0.9, 0.04 + h / 3, Math.cos(t) * rd * 0.9]));
      shard.rotation.set(Math.cos(t) * 0.7, 0, -Math.sin(t) * 0.7);
    }
    if (a.rock === 'violet') for (let i = 0; i < 12; i++) {
      const pit = onSlab(s.mesh(new THREE.CircleGeometry(0.015 + random() * 0.03, 8), s.material('#4f3a66', { roughness: 1 }), [(random() - 0.5) * rw * 1.3, top + 0.002, (random() - 0.5) * rd * 1.2])); pit.rotation.x = -Math.PI / 2; pit.castShadow = false;
    }
    for (let i = 0; i < 5; i++) { const t = random() * Math.PI * 2, size = 0.03 + random() * 0.05; s.mesh(new THREE.DodecahedronGeometry(size, 0), pebbleMat, [Math.sin(t) * (rw + 0.12 + random() * 0.15), size * 0.5, Math.cos(t) * (rd + 0.12 + random() * 0.15)]).rotation.set(random() * 3, random() * 3, 0); }

    // ---- The gun: barrel along +x, built upright, then laid on its side ----
    const gun = new THREE.Group();
    const g = <T extends THREE.Object3D>(o: T) => { gun.add(o); return o; };
    const turned = (profile: [number, number][], material: THREE.Material) => {
      const geo = new THREE.LatheGeometry(profile.map(([x, r]) => new THREE.Vector2(Math.max(r, 0.0005), x)), 24); geo.rotateZ(-Math.PI / 2);
      return g(s.mesh(geo, material));
    };
    const disc = (x: number, r: number, thick: number, material: THREE.Material) => { const m = g(s.cylinder(r, r, thick, [x, 0, 0], material, 20)); m.rotation.z = Math.PI / 2; return m; };
    const hoop = (x: number, r: number, tube: number, material: THREE.Material) => { const m = g(s.ring(r, tube, [x, 0, 0], material)); m.rotation.y = Math.PI / 2; return m; };
    const coil = (x0: number, x1: number, r: number, turns: number, material: THREE.Material, wire = 0.008) => {
      const pts = Array.from({ length: turns * 10 + 1 }, (_u, i) => { const t = i / (turns * 10); return new THREE.Vector3(mix(x0, x1, t), Math.cos(t * turns * Math.PI * 2) * r, Math.sin(t * turns * Math.PI * 2) * r); });
      return g(s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 14, wire, 5), material));
    };
    const fin = (points: [number, number][], angle: number) => {
      const geo = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.008, bevelEnabled: false }); geo.translate(0, 0, -0.004);
      const m = g(s.mesh(geo, trim)); m.rotation.x = angle; return m;
    };
    let muzzle = 0.4, sprung = 0.2;
    if (a.style === 'atomic') {
      turned([[-0.13, 0], [-0.12, 0.03], [-0.06, 0.066], [0.02, 0.075], [0.09, 0.06], [0.14, 0.03], [0.15, 0.022]], body);
      g(s.rod([0.14, 0, 0], [0.4, 0, 0], 0.02, body, 0.012));
      [0.055, 0.047, 0.039, 0.031].forEach((r, i) => disc(0.2 + i * 0.05, r, 0.012, trim));
      coil(0.165, 0.365, 0.024, 9, coilMat);
      g(s.ball([0.03, 0.03, 0.03], [0.41, 0, 0], coilMat, 12));
      for (const angle of [0, 2.2, -2.2]) fin([[-0.02, 0.05], [-0.2, 0.15], [-0.17, 0.05], [-0.12, 0.02]], angle);
      hoop(0.02, 0.078, 0.008, trim); muzzle = 0.42;
    } else if (a.style === 'needle') {
      turned([[-0.12, 0], [-0.1, 0.035], [0, 0.045], [0.12, 0.03], [0.2, 0.015]], body);
      g(s.rod([0.18, 0, 0], [0.52, 0, 0], 0.012, body, 0.005));
      turned([[0.4, 0.008], [0.42, 0.02], [0.45, 0.06], [0.455, 0.062]], trim);
      for (let i = 0; i < 3; i++) hoop(0.24 + i * 0.05, 0.022, 0.006, trim);
      const tube = g(s.cylinder(0.022, 0.022, 0.2, [0.02, 0.066, 0], new THREE.MeshStandardMaterial({ color: '#dff6ff', transparent: true, opacity: 0.3, depthWrite: false }), 12)); tube.rotation.z = Math.PI / 2;
      const inner = coil(-0.07, 0.11, 0.012, 8, coilMat, 0.006); inner.position.y = 0.066;
      for (const x of [-0.085, 0.125]) { const cap = g(s.cylinder(0.026, 0.026, 0.015, [x, 0.066, 0], trim, 12)); cap.rotation.z = Math.PI / 2; }
      fin([[-0.04, 0.03], [-0.16, 0.1], [-0.12, 0.02]], Math.PI); muzzle = 0.53; sprung = 0.02;
    } else if (a.style === 'blunderbuss') {
      turned([[-0.14, 0], [-0.13, 0.05], [-0.04, 0.08], [0.05, 0.075], [0.1, 0.05]], body);
      turned([[0.08, 0.04], [0.22, 0.036], [0.29, 0.05], [0.34, 0.085], [0.36, 0.11], [0.365, 0.112]], body);
      const mouth = g(s.cylinder(0.105, 0.105, 0.004, [0.358, 0, 0], live ? coilMat : dark, 20)); mouth.rotation.z = Math.PI / 2;
      coil(0.1, 0.27, 0.046, 7, coilMat, 0.01);
      hoop(-0.04, 0.083, 0.01, trim); hoop(0.345, 0.1, 0.009, trim);
      for (const angle of [0.9, -0.9]) fin([[-0.06, 0.06], [-0.2, 0.12], [-0.16, 0.03]], angle); muzzle = 0.38;
    } else if (a.style === 'blaster') {
      g(s.box([0.24, 0.11, 0.07], [0, 0, 0], body));
      g(s.box([0.1, 0.05, 0.075], [-0.05, 0.075, 0], trim));
      for (let i = 0; i < 6; i++) g(s.box([0.012, 0.15, 0.1], [0.14 + i * 0.028, 0, 0], trim));
      const barrel = g(s.cylinder(0.03, 0.03, 0.24, [0.24, 0, 0], body, 14)); barrel.rotation.z = Math.PI / 2;
      turned([[0.33, 0.03], [0.36, 0.05], [0.4, 0.05], [0.4, 0.03]], dark);
      const win = g(s.box([0.12, 0.04, 0.076], [-0.02, 0.0, 0], coilMat)); win.position.y = -0.005;
      coil(0.305, 0.335, 0.036, 3, coilMat, 0.008);
      g(s.box([0.03, 0.03, 0.03], [-0.13, 0.03, 0], dark)); muzzle = 0.4; sprung = 0.0;
    } else {
      const globe = g(s.ball([0.085, 0.085, 0.085], [-0.06, 0.02, 0], new THREE.MeshStandardMaterial({ color: '#e2f7ff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), 20)); globe.castShadow = false;
      const shine = g(new THREE.Mesh(new THREE.SphereGeometry(0.087, 8, 6, 0.6, 0.6, 0.6, 0.7), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }))); shine.position.set(-0.06, 0.02, 0);
      const inner = coil(-0.105, -0.015, 0.04, 5, coilMat, 0.009); inner.position.y = 0.02;
      g(s.ball([0.022, 0.022, 0.022], [-0.06, 0.02, 0], coilMat, 10));
      hoop(-0.06, 0.088, 0.008, trim).position.y = 0.02; const band = g(s.ring(0.088, 0.008, [-0.06, 0.02, 0], trim)); band.rotation.x = Math.PI / 2;
      turned([[0.0, 0.05], [0.04, 0.055], [0.1, 0.035], [0.3, 0.024], [0.32, 0.03]], body);
      [0.06, 0.05, 0.042].forEach((r, i) => hoop(0.15 + i * 0.055, r, 0.007, trim));
      for (let i = 0; i < 3; i++) g(s.rod([0.1, Math.cos(i * 2.1) * 0.035, Math.sin(i * 2.1) * 0.035], [0.26, Math.cos(i * 2.1) * 0.04, Math.sin(i * 2.1) * 0.04], 0.004, trim));
      g(s.ball([0.02, 0.02, 0.02], [0.33, 0, 0], coilMat, 10)); muzzle = 0.34; sprung = -0.06;
    }
    // Grip, trigger and guard are common to all of them.
    const grip = g(s.box([0.062, 0.17, 0.048], [-0.055, -0.125, 0], gripMat)); grip.rotation.z = 0.32;
    for (let i = 0; i < 4; i++) { const groove = g(s.box([0.064, 0.008, 0.05], [-0.062 - i * 0.011, -0.085 - i * 0.032, 0], dark)); groove.rotation.z = 0.32; }
    g(s.ball([0.036, 0.022, 0.03], [-0.083, -0.21, 0], trim, 10));
    const guard = g(s.ring(0.035, 0.006, [0.012, -0.075, 0], body, Math.PI)); guard.rotation.z = Math.PI;
    g(s.rod([0.0, -0.045, 0], [0.012, -0.09, 0], 0.006, dark));
    if (a.charge === 'broken') {
      // The coil has burst out through a split casing.
      const pts = Array.from({ length: 50 }, (_u, i) => { const t = i / 49; return new THREE.Vector3(sprung + t * 0.1 + Math.sin(t * 5) * 0.03, 0.03 + t * 0.2 + Math.cos(t * 30) * 0.03 * (0.4 + t), 0.03 + Math.sin(t * 30) * 0.03 * (0.4 + t) + t * 0.08); });
      g(s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 100, 0.008, 5), s.material('#b9763f', { metalness: 0.4 })));
      const plate = g(s.box([0.1, 0.004, 0.06], [sprung + 0.02, 0.07, 0.02], body)); plate.rotation.set(0.5, 0.2, 0.6);
      g(s.box([0.07, 0.012, 0.02], [sprung, 0.02, 0.04], dark));
    }
    const yawGun = 0.3 + (random() - 0.5) * 0.7;
    const cradle = new THREE.Group();
    cradle.position.set(-0.2 * Math.cos(yawGun), top + 0.045, 0.2 * Math.sin(yawGun) - 0.02);
    cradle.rotation.y = yawGun;
    gun.rotation.x = -Math.PI / 2 + 0.3;
    gun.position.y = 0.05; gun.scale.setScalar(1.5);
    cradle.add(gun); slab.add(cradle);

    // ---- Marks ----
    const burnt = new THREE.MeshStandardMaterial({ color: '#17140f', roughness: 1 });
    const flatOn = (geo: THREE.BufferGeometry, material: THREE.Material, x: number, z: number, turn = 0) => { const m = onSlab(s.mesh(geo, material, [x, top + 0.004, z])); m.rotation.set(-Math.PI / 2, 0, turn); m.castShadow = false; return m; };
    let rimMat: THREE.MeshStandardMaterial | null = null;
    if (a.marks === 'streak') {
      const dir = yawGun, mx = cradle.position.x + Math.cos(dir) * (muzzle + 0.02), mz = cradle.position.z - Math.sin(dir) * (muzzle + 0.02);
      for (let i = 0; i < 6; i++) flatOn(new THREE.CircleGeometry(0.035 + i * 0.006, 10), burnt, mx + Math.cos(dir) * i * 0.035 - 0.12, mz - Math.sin(dir) * i * 0.035 + 0.1, 0).scale.set(1.6, 0.7, 1);
      flatOn(new THREE.PlaneGeometry(0.5, 0.045), burnt, -0.05, 0.12, dir * 0.6);
    }
    if (a.marks === 'crater' || a.marks === 'slag') {
      rimMat = new THREE.MeshStandardMaterial({ color: '#ff9a3a', emissive: '#ff5a1a', emissiveIntensity: 1.6 });
      if (a.marks === 'crater') {
        const cx = rw * 0.45, cz = -rd * 0.25;
        flatOn(new THREE.CircleGeometry(0.085, 20), burnt, cx, cz);
        const lip = onSlab(s.ring(0.085, 0.012, [cx, top + 0.006, cz], rimMat)); lip.rotation.x = Math.PI / 2;
        flatOn(new THREE.RingGeometry(0.095, 0.14, 20), s.material('#2f2a2a', { roughness: 0.2 }), cx, cz);
      } else for (let i = 0; i < 6; i++) {
        const z = (i / 5 - 0.5) * rd * 1.2, len = 0.08 + random() * 0.12;
        onSlab(s.rod([rw * 0.55, top - 0.1, z], [rw * 0.6 + random() * 0.03, top - 0.1 - len, z], 0.02, rimMat, 0.008));
        if (i % 2) s.cylinder(0.05 + random() * 0.04, 0.06 + random() * 0.04, 0.012, [rw * 0.62 + 0.06 + random() * 0.05, 0.006, z + 0.15], rimMat, 12);
      }
    }
    const wisps: THREE.Mesh[] = [];
    const smokeMat = new THREE.MeshStandardMaterial({ color: '#7a7672', transparent: true, opacity: 0.45, depthWrite: false, roughness: 1 });
    const smokeAt: THREE.Vector3[] = [];
    if (a.marks === 'ash') {
      const ash = s.material('#8d8983', { roughness: 1, flatShading: true });
      const ax = -rw - 0.22, az = rd * 0.55;
      const heap = s.mesh(new THREE.ConeGeometry(0.2, 0.11, 9), ash, [ax, 0.055, az]); heap.rotation.y = random();
      s.mesh(new THREE.CircleGeometry(0.3, 14), new THREE.MeshStandardMaterial({ color: '#57534f', roughness: 1 }), [ax, 0.004, az]).rotation.x = -Math.PI / 2;
      const leather = s.material('#3a2a22', { roughness: 0.6 });
      for (const side of [-1, 1]) {
        const bx = ax + side * 0.085, lean = side < 0 ? 0 : 0.25;
        const shaft = s.cylinder(0.05, 0.045, 0.2, [bx + lean * 0.1, 0.13, az + 0.05], leather, 12); shaft.rotation.z = -lean;
        s.ball([0.05, 0.035, 0.09], [bx, 0.04, az + 0.1], leather, 10);
        s.ring(0.05, 0.012, [bx + lean * 0.2, 0.23, az + 0.05], gripMat).rotation.set(Math.PI / 2, 0, 0);
        smokeAt.push(new THREE.Vector3(bx + lean * 0.2, 0.26, az + 0.05));
      }
    }
    if (a.charge === 'spent' || a.charge === 'overload') {
      slab.updateMatrixWorld(true); s.root.updateMatrixWorld(true);
      smokeAt.push(gun.localToWorld(new THREE.Vector3(muzzle, 0, 0)));
    }
    smokeAt.forEach((at) => { for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), smokeMat); w.userData = { at, phase: i / 5 + random() * 0.1, drift: random() * 6 }; s.root.add(w); wisps.push(w); } });
    const sparks: THREE.Mesh[] = [];
    if (a.charge === 'overload') {
      const at = gun.localToWorld(new THREE.Vector3(0.1, 0, 0));
      for (let i = 0; i < 12; i++) { const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.012), new THREE.MeshBasicMaterial({ color: '#fff6c0' })); spark.userData = { at, dir: new THREE.Vector3(random() - 0.5, random() * 0.9 + 0.2, random() - 0.5).normalize(), phase: random() }; s.root.add(spark); sparks.push(spark); }
    }

    // ---- Left behind ----
    if (a.left === 'holster') {
      const leather = s.material('#6b3f24', { roughness: 0.7 });
      onSlab(s.tube([[-rw * 0.95, top - 0.12, rd * 0.2], [-rw * 0.7, top + 0.02, rd * 0.35], [-rw * 0.2, top + 0.015, rd * 0.62], [rw * 0.3, top + 0.02, rd * 0.55], [rw * 0.6, top - 0.06, rd * 0.78]], 0.018, leather)).scale.y = 1;
      const pouch = onSlab(s.box([0.1, 0.03, 0.16], [-rw * 0.45, top + 0.03, rd * 0.5], leather)); pouch.rotation.y = 0.5;
      onSlab(s.box([0.05, 0.012, 0.04], [rw * 0.1, top + 0.03, rd * 0.6], s.material('#d9b44a', { metalness: 0.4 })));
    }
    if (a.left === 'cells') for (let i = 0; i < 4; i++) {
      const lying = i > 1, x = lying ? rw + 0.1 + random() * 0.2 : rw * 0.25 + i * 0.07, z = lying ? rd * 0.6 + random() * 0.2 : rd * 0.45;
      const cellMat = i % 2 ? coilMat : dark;
      const cell = lying ? s.cylinder(0.02, 0.02, 0.09, [x, 0.02, z], cellMat, 10) : onSlab(s.cylinder(0.02, 0.02, 0.09, [x, top + 0.047, z], cellMat, 10));
      if (lying) cell.rotation.set(Math.PI / 2, 0, random() * 3);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.014, 10), trim); cap.position.y = 0.042; cell.add(cap);
    }
    if (a.left === 'glove') {
      const hide = s.material('#8a4a2a', { roughness: 0.7 }), gx = -rw * 0.5, gz = rd * 0.42;
      onSlab(s.ball([0.06, 0.022, 0.075], [gx, top + 0.022, gz], hide, 12));
      const cuff = onSlab(s.cylinder(0.05, 0.065, 0.1, [gx - 0.02, top + 0.03, gz + 0.11], hide, 12)); cuff.rotation.set(Math.PI / 2 - 0.15, 0, 0.2);
      for (let i = 0; i < 4; i++) onSlab(s.rod([gx - 0.04 + i * 0.027, top + 0.02, gz - 0.05], [gx - 0.05 + i * 0.033, top + 0.04, gz - 0.12], 0.012, hide));
      onSlab(s.rod([gx + 0.05, top + 0.02, gz], [gx + 0.1, top + 0.03, gz - 0.04], 0.013, hide));
    }
    if (a.left === 'goggles') {
      const gx = -rw * 0.45, gz = rd * 0.5;
      for (const side of [-1, 1]) {
        const cup = onSlab(s.cylinder(0.04, 0.045, 0.035, [gx + side * 0.047, top + 0.03, gz], dark, 14)); cup.rotation.x = 1.0;
        const lens = onSlab(s.cylinder(0.034, 0.034, 0.006, [gx + side * 0.047, top + 0.042, gz + 0.016], new THREE.MeshStandardMaterial({ color: '#7fd0e8', emissive: '#2f7f9a', emissiveIntensity: 0.4, roughness: 0.1 }), 14)); lens.rotation.x = 1.0;
      }
      onSlab(s.tube([[gx - 0.09, top + 0.03, gz], [gx - 0.16, top + 0.012, gz - 0.12], [gx, top + 0.01, gz - 0.2], [gx + 0.16, top + 0.012, gz - 0.1], [gx + 0.09, top + 0.03, gz]], 0.007, gripMat));
    }
    if (a.rock === 'mossy' || mood.wear > 0.7) {
      const moss = s.material('#5f8f3c', { roughness: 1 });
      for (let i = 0; i < 10; i++) { const t = random() * Math.PI * 2; s.ball([0.05 + random() * 0.05, 0.02, 0.05 + random() * 0.05], [Math.sin(t) * (rw + 0.05), 0.012, Math.cos(t) * (rd + 0.05)], moss, 8); }
    }

    const animate = (time: number) => {
      const speed = mix(0.5, 2.5, mood.energy);
      if (a.charge === 'overload') coilMat.emissiveIntensity = power * (0.6 + 0.4 * Math.abs(Math.sin(time * speed * 6)));
      else if (a.charge === 'low') coilMat.emissiveIntensity = power * (Math.sin(time * speed * 9) > 0.5 ? 0.25 : 1);
      else if (a.charge === 'charged') coilMat.emissiveIntensity = power * (0.88 + 0.12 * Math.sin(time * speed * 2));
      if (rimMat) rimMat.emissiveIntensity = 1.3 + Math.sin(time * 2) * 0.3;
      crystalMats.forEach((m, i) => { m.emissiveIntensity = 0.7 + Math.sin(time * speed + i) * 0.3; });
      for (const w of wisps) {
        const d = w.userData as { at: THREE.Vector3; phase: number; drift: number }, t = (d.phase + time * 0.12 * speed) % 1;
        w.position.set(d.at.x + Math.sin(d.drift + t * 4) * 0.04 * (1 + t * 2), d.at.y + t * 0.5, d.at.z + Math.cos(d.drift + t * 3) * 0.04);
        w.scale.setScalar(0.02 + t * 0.07);
      }
      for (const spark of sparks) {
        const d = spark.userData as { at: THREE.Vector3; dir: THREE.Vector3; phase: number }, t = (d.phase + time * speed * 0.9) % 1;
        spark.position.copy(d.at).addScaledVector(d.dir, t * 0.3); spark.position.y -= t * t * 0.12; spark.scale.setScalar(1.4 - t);
      }
    };
    animate(0);
    return s.finish({ footprint: rw + 0.12, update: (_dt, time) => animate(time) });
  },
});
