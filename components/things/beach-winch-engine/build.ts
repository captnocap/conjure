import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    engine: choice('What drives the winch?', {
      flywheel: 'An ancient single-cylinder diesel, green, with two great flywheels and a water hopper.',
      truck: 'The engine and radiator of a dead truck, still under half its painted bonnet.',
      marine: 'A long grey six-cylinder generator engine taken off a ship.',
    }),
    cable: choice('What is the cable doing?', {
      taut: 'Bar taut: straining out toward the hulk, humming.',
      slack: 'Slack, lying in lazy curves on the ground.',
      snapped: 'Snapped: a frayed end whipped back and curled beside the drum.',
      wound: 'All wound in, the hook and shackle hanging at the drum.',
    }),
    smoke: score('Is the engine smoking?', ['Cold and silent', 'A thin idle haze', 'Steady grey puffs', 'Belching black under full load']),
    shade: choice('What shades the operator?', {
      tarp: 'A blue tarpaulin sagging on four bamboo poles.',
      tin: 'A sloping roof of rusty corrugated sheets on angle iron.',
      umbrella: 'A faded striped beach umbrella lashed to the frame.',
      patchwork: 'Old saris and sacking stitched into a bright patchwork awning.',
      none: 'Nothing: a bare seat in the sun.',
    }),
    charm: choice('What charm or flag hangs on it?', {
      garland: 'A marigold garland looped across the engine.',
      lemon: 'A lemon and green chillies on a thread, against the evil eye.',
      pennant: 'A red triangular pennant on a tall bamboo.',
      crescent: 'A small green flag with a white crescent and star.',
      tinsel: 'Tinsel and old compact discs that flash in the sun.',
      none: 'None at all.',
    }),
    operator: noul('Is the operator at the levers?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <X,>(list: readonly X[]) => list[Math.floor(random() * list.length)];
    const frame = s.material('#5a4a40', { metalness: 0.4, roughness: 0.75 });
    const iron = s.material('#2f2c2a', { metalness: 0.45, roughness: 0.6 });
    const rust = s.material('#7a4a32', { roughness: 0.95 });
    const wire = s.material('#4a4744', { metalness: 0.6, roughness: 0.5 });
    const bamboo = s.material('#c9a85c');
    const timber = s.material('#7a5a3c', { roughness: 0.95 });

    // Skid frame.
    for (const x of [-0.95, 0.95]) {
      s.box([0.2, 0.26, 4.6], [x, 0.13, 0], frame);
      s.box([0.3, 0.03, 4.6], [x, 0.27, 0], frame);
    }
    for (const z of [-2.1, -1.0, 0.2, 1.9]) s.box([2.1, 0.2, 0.18], [0, 0.14, z], frame);
    for (const x of [-1.1, 1.1]) s.box([0.3, 0.2, 5.2], [x * 1.05, -0.02, 0], timber);

    // Drum and its cable.
    const dz = 1.05, dy = 1.15, coreR = 0.4, flangeR = 0.92, width = 1.5;
    const fill = { taut: 0.45, slack: 0.4, snapped: 0.6, wound: 1 }[a.cable];
    const woundR = mix(coreR + 0.04, flangeR - 0.08, fill);
    const drum = new THREE.Group();
    drum.position.set(0, dy, dz);
    s.root.add(drum);
    const onDrum = (mesh: THREE.Mesh, x = 0) => { drum.add(mesh); mesh.position.set(x, 0, 0); mesh.rotation.z = Math.PI / 2; return mesh; };
    onDrum(s.cylinder(coreR, coreR, width, [0, 0, 0], iron, 20));
    for (const x of [-width / 2, width / 2]) {
      onDrum(s.cylinder(flangeR, flangeR, 0.06, [0, 0, 0], frame, 28), x);
      for (let i = 0; i < 6; i++) { const rib = s.box([0.07, 0.05, flangeR * 1.9], [0, 0, 0], iron); drum.add(rib); rib.position.set(x + Math.sign(x) * 0.04, 0, 0); rib.rotation.x = (i * Math.PI) / 6; }
    }
    const wraps = 16;
    for (let i = 0; i < wraps; i++) {
      const wrap = s.cylinder(woundR + (i % 2) * 0.012, woundR + (i % 2) * 0.012, (width - 0.08) / wraps, [0, 0, 0], i % 3 ? wire : s.material('#5a4a3c', { metalness: 0.4 }), 20);
      onDrum(wrap, -width / 2 + 0.04 + (i + 0.5) * ((width - 0.08) / wraps));
    }
    for (const x of [-1.0, 1.0]) {
      s.rod([x, 0.28, dz - 0.75], [x, dy + 0.1, dz], 0.07, frame);
      s.rod([x, 0.28, dz + 0.75], [x, dy + 0.1, dz], 0.07, frame);
      s.box([0.14, 0.3, 0.3], [x, dy, dz], iron);
    }
    s.rod([-1.1, dy, dz], [1.1, dy, dz], 0.08, iron);
    // Big gear, pinion and brake.
    const gear = s.cylinder(0.78, 0.78, 0.1, [-1.2, dy, dz], rust, 30);
    gear.rotation.z = Math.PI / 2;
    for (let i = 0; i < 24; i++) { const tooth = s.box([0.1, 0.07, 0.07], [-1.2, dy + Math.sin(i * 0.2618) * 0.8, dz + Math.cos(i * 0.2618) * 0.8], iron); tooth.rotation.x = -i * 0.2618; }
    s.cylinder(0.2, 0.2, 0.14, [-1.2, 0.62, dz - 0.86], iron, 14).rotation.z = Math.PI / 2;
    s.rod([-1.2, 0.62, dz - 0.86], [-0.6, 0.62, -0.4], 0.05, iron);
    s.ring(0.6, 0.035, [0.86, dy, dz], rust).rotation.y = Math.PI / 2;

    // Engine.
    const ez = -1.25;
    let exhaust: P3 = [0.3, 2.4, ez];
    const spinners: THREE.Object3D[] = [];
    if (a.engine === 'flywheel') {
      const green = s.material('#3f6b4a', { roughness: 0.6 });
      s.box([0.7, 0.75, 0.9], [0, 0.72, ez], green);
      s.cylinder(0.26, 0.3, 0.7, [0, 1.42, ez + 0.1], green, 14);
      s.box([0.5, 0.5, 0.45], [0, 1.4, ez - 0.5], green);
      s.box([0.42, 0.04, 0.38], [0, 1.66, ez - 0.5], s.material('#1c2a33', { roughness: 0.2 }));
      for (const x of [-0.6, 0.6]) {
        const wheel = new THREE.Group();
        wheel.position.set(x, 0.95, ez);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.08, 8, 28), iron);
        rim.rotation.y = Math.PI / 2; rim.castShadow = true;
        wheel.add(rim);
        for (let i = 0; i < 3; i++) { const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.16, 0.07), iron); spoke.rotation.x = (i * Math.PI) / 3; spoke.castShadow = true; wheel.add(spoke); }
        s.root.add(wheel);
        spinners.push(wheel);
      }
      s.rod([0, 1.75, ez + 0.1], [0, 2.1, ez + 0.1], 0.06, rust);
      s.rod([0, 2.1, ez + 0.1], [0.3, 2.55, ez - 0.1], 0.06, rust);
      exhaust = [0.3, 2.6, ez - 0.1];
    } else if (a.engine === 'truck') {
      const paint = s.material(pick(['#2f5d8a', '#c8642a', '#3d7a5a', '#a8322a']), { roughness: 0.55 });
      s.box([0.62, 0.7, 1.2], [0, 0.75, ez], iron);
      s.box([0.5, 0.2, 1.0], [0, 1.2, ez], s.material('#6b6e70', { metalness: 0.5 }));
      s.box([0.95, 0.85, 0.14], [0, 0.85, ez - 0.85], s.material('#1b1b1c'));
      for (let i = 0; i < 7; i++) s.box([0.8, 0.03, 0.02], [0, 0.55 + i * 0.1, ez - 0.93], s.material('#8f9296', { metalness: 0.6 }));
      const hood = s.box([1.0, 0.04, 1.25], [0.02, 1.42, ez - 0.2], paint);
      hood.rotation.z = -0.04;
      s.box([0.04, 0.6, 1.25], [-0.5, 1.1, ez - 0.2], paint);
      s.label(pick(['HORN OK PLEASE', 'GOODS CARRIER', 'TATA', 'BLOW HORN']), 0.9, 0.2, [-0.522, 1.15, ez - 0.2], '#f6e27a', '#a8322a').rotation.y = -Math.PI / 2;
      for (const x of [-0.42, 0.42]) s.cylinder(0.09, 0.09, 0.05, [x, 1.0, ez - 0.95], s.material('#f1eee2', { emissive: '#fff2c0', emissiveIntensity: mood.daylight > 0.75 || mood.daylight < 0.2 ? 0.9 : 0 }), 12).rotation.x = Math.PI / 2;
      s.rod([0.36, 0.9, ez + 0.2], [0.55, 1.3, ez + 0.3], 0.05, rust);
      s.rod([0.55, 1.3, ez + 0.3], [0.55, 2.5, ez + 0.3], 0.05, rust);
      exhaust = [0.55, 2.55, ez + 0.3];
      s.box([0.3, 0.22, 0.2], [-0.6, 0.42, ez + 0.5], s.material('#1b1b1c'));
    } else {
      const grey = s.material('#8a968c', { roughness: 0.6 });
      s.box([0.7, 0.8, 2.0], [0, 0.72, ez], grey);
      for (let i = 0; i < 6; i++) { s.box([0.5, 0.26, 0.26], [0, 1.25, ez - 0.8 + i * 0.32], grey); s.cylinder(0.05, 0.05, 0.1, [0, 1.42, ez - 0.8 + i * 0.32], iron, 8); }
      s.rod([0.38, 1.2, ez - 0.85], [0.38, 1.2, ez + 0.85], 0.1, s.material('#d8d2c0', { roughness: 1 }));
      s.ball([0.2, 0.2, 0.22], [0.38, 1.28, ez + 0.95], iron, 12);
      s.rod([0.38, 1.3, ez + 0.95], [0.38, 2.6, ez + 0.95], 0.09, s.material('#d8d2c0', { roughness: 1 }));
      exhaust = [0.38, 2.65, ez + 0.95];
      s.box([0.5, 0.6, 0.12], [0, 0.95, ez - 1.05], s.material('#c9c2a8'));
      s.label('No.2 D/G', 0.42, 0.14, [-0.352, 0.9, ez], '#1c1d20', '#d8d2c0').rotation.y = -Math.PI / 2;
    }
    // Drive belt and a fuel drum.
    s.rod([-0.62, 0.95, ez], [-1.2, 0.62, dz - 0.86], 0.03, s.material('#1b1b1c', { roughness: 1 }));
    s.cylinder(0.29, 0.29, 0.88, [-0.55, 0.72, -2.0 + (a.engine === 'marine' ? -0.4 : 0)], s.material(pick(['#2f5d8a', '#a8452f', '#3d7a5a']), { metalness: 0.3 }), 18);

    // Chains back to buried anchors.
    const linkPoints: THREE.Matrix4[] = [];
    const chain = (from: P3, to: P3) => {
      const p0 = new THREE.Vector3(...from), p1 = new THREE.Vector3(...to), n = Math.ceil(p0.distanceTo(p1) / 0.17);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), p1.clone().sub(p0).normalize());
      for (let i = 0; i <= n; i++) linkPoints.push(new THREE.Matrix4().compose(p0.clone().lerp(p1, i / n), q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (i % 2) * Math.PI / 2)), new THREE.Vector3(1, 1, 1)));
    };
    for (const x of [-0.95, 0.95]) {
      const ax = x * (1.6 + random() * 0.5), az = -3.9 - random() * 0.5;
      chain([x, 0.3, -2.25], [ax, 0.06, az]);
      const stake = s.box([0.5, 0.7, 0.07], [ax, 0.12, az - 0.08], rust);
      stake.rotation.set(0.55, x * 0.3, 0.1);
      s.ball([0.5, 0.09, 0.42], [ax, 0.02, az - 0.1], s.material('#b7a488', { roughness: 1 }), 10);
    }
    const links = new THREE.InstancedMesh(new THREE.TorusGeometry(0.075, 0.024, 6, 10), iron, linkPoints.length);
    linkPoints.forEach((m, i) => links.setMatrixAt(i, m));
    links.castShadow = true;
    s.root.add(links);

    // The cable out front.
    const out: P3 = [(random() - 0.5) * 0.3, dy - woundR * 0.98, dz + 0.1];
    let taut: THREE.Mesh | null = null;
    if (a.cable === 'taut') {
      taut = s.rod(out, [out[0] + 0.2, 0.95, 5.6], 0.03, wire);
      s.cylinder(0.14, 0.14, 0.08, [out[0] + 0.1, 0.5, 2.5], iron, 14).rotation.z = Math.PI / 2;
      s.rod([out[0] - 0.2, 0, 2.5], [out[0] + 0.1, 0.42, 2.5], 0.035, frame);
      s.rod([out[0] + 0.4, 0, 2.5], [out[0] + 0.1, 0.42, 2.5], 0.035, frame);
    } else if (a.cable === 'slack') {
      s.tube([out, [out[0], 0.2, dz + 1.1], [0.5, 0.04, 2.6], [-0.4, 0.04, 3.5], [0.3, 0.04, 4.5], [0.1, 0.04, 5.6]], 0.03, wire);
    } else if (a.cable === 'snapped') {
      const end: P3[] = [out, [out[0] + 0.2, 0.5, dz + 1.0], [1.3, 0.05, 2.4], [2.2, 0.05, 1.6], [2.0, 0.3, 0.9], [1.5, 0.05, 1.5]];
      s.tube(end, 0.03, wire);
      for (let i = 0; i < 6; i++) s.rod([1.5, 0.05, 1.5], [1.5 - 0.1 - random() * 0.25, 0.03 + random() * 0.2, 1.5 + (random() - 0.3) * 0.4], 0.008, wire);
      s.box([0.5, 0.06, 0.2], [0.9, 0.03, 3.2], rust).rotation.y = 0.7;
    } else {
      s.rod(out, [out[0], 0.75, dz + 0.55], 0.03, wire);
      s.ring(0.09, 0.03, [out[0], 0.66, dz + 0.55], iron);
      s.tube([[out[0], 0.58, dz + 0.55], [out[0], 0.36, dz + 0.55], [out[0] + 0.12, 0.3, dz + 0.55], [out[0] + 0.13, 0.42, dz + 0.55]], 0.03, iron);
    }

    // Operator's station on the right-hand side.
    const sx = 1.75, sz = 0.2;
    s.box([0.1, 0.55, 0.1], [sx, 0.28, sz - 0.5], frame);
    s.box([0.46, 0.06, 0.42], [sx, 0.58, sz - 0.5], timber);
    const levers: [number, string][] = [[-0.2, '#c8281f'], [0.05, '#e0b81e']];
    levers.forEach(([dx, c], i) => {
      const lean = a.cable === 'taut' && i === 0 ? 0.35 : -0.15 + random() * 0.2;
      s.rod([sx + dx, 0.2, sz + 0.25], [sx + dx, 1.1, sz + 0.25 + lean], 0.022, iron);
      s.ball([0.05, 0.05, 0.05], [sx + dx, 1.12, sz + 0.25 + lean], s.material(c), 10);
    });
    s.box([0.9, 0.06, 1.3], [sx - 0.05, 0.05, sz - 0.1], timber);
    if (a.operator) {
      const skin = s.material('#7a5038'), cloth = s.material(pick(['#3d6fa3', '#b8452f', '#e8e2d0', '#5a8f6b']));
      s.box([0.3, 0.16, 0.5], [sx, 0.7, sz - 0.3], s.material('#6b5a4a'));
      s.box([0.26, 0.5, 0.14], [sx, 0.38, sz - 0.02], s.material('#6b5a4a'));
      s.box([0.4, 0.56, 0.24], [sx, 1.02, sz - 0.5], cloth);
      s.ball([0.11, 0.125, 0.115], [sx, 1.45, sz - 0.48], skin, 10);
      s.rod([sx - 0.2, 1.2, sz - 0.42], [sx - 0.2, 1.1, sz + 0.25 + (a.cable === 'taut' ? 0.3 : -0.1)], 0.045, skin);
      if (mood.cheer < 0.5) s.box([0.3, 0.12, 0.28], [sx, 1.57, sz - 0.48], s.material('#d8cfae', { roughness: 1 }));
    } else s.cylinder(0.04, 0.035, 0.09, [sx + 0.3, 0.125, sz + 0.3], new THREE.MeshStandardMaterial({ color: '#c98a4a', roughness: 0.2 }), 8);

    // Shade.
    const px = [sx - 0.85, sx + 0.85], pz = [sz - 1.2, sz + 0.7], roofY = 2.25;
    const poles = () => { for (const x of px) for (const z of pz) s.rod([x, 0, z], [x + (random() - 0.5) * 0.08, roofY + (z < sz ? 0.25 : 0) + 0.08, z], 0.035, bamboo); };
    const sheet = (colour: string, sag: number, at: P3, size: [number, number]) => {
      const geometry = new THREE.PlaneGeometry(size[0], size[1], 6, 6);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) / size[0], v = pos.getY(i) / size[1]; pos.setZ(i, -sag * (1 - 4 * u * u) * (1 - 4 * v * v)); }
      geometry.computeVertexNormals();
      const mesh = s.mesh(geometry, s.material(colour, { side: THREE.DoubleSide, roughness: 0.95 }), at);
      mesh.rotation.x = -Math.PI / 2 + 0.13;
      return mesh;
    };
    if (a.shade === 'tarp') { poles(); sheet('#2f6fc0', 0.22, [sx, roofY + 0.12, sz - 0.25], [1.9, 2.1]); }
    else if (a.shade === 'patchwork') {
      poles();
      const colours = ['#c2452f', '#d8b23a', '#3f8a5a', '#8a4a8f', '#e58aa4', '#b9a06a', '#3d6fa3'];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) sheet(pick(colours), 0.03, [sx - 0.62 + i * 0.62, roofY + 0.2 - j * 0.085 - Math.abs(i - 1) * 0.02, sz - 0.9 + j * 0.66], [0.66, 0.7]);
    } else if (a.shade === 'tin') {
      for (const x of px) for (const z of pz) s.box([0.05, roofY + (z < sz ? 0.3 : 0), 0.05], [x, (roofY + (z < sz ? 0.3 : 0)) / 2, z], frame);
      for (let i = 0; i < 3; i++) {
        const panel = s.box([0.66, 0.03, 2.2], [sx - 0.64 + i * 0.64, roofY + 0.17 + (i % 2) * 0.02, sz - 0.25], s.material(i === 1 ? '#8f9296' : '#8a5a40', { metalness: 0.4, roughness: 0.7 }));
        panel.rotation.x = 0.155;
        for (let k = 0; k < 5; k++) { const rib = s.box([0.03, 0.035, 2.2], [sx - 0.9 + i * 0.64 + k * 0.13, roofY + 0.185 + (i % 2) * 0.02, sz - 0.25], rust); rib.rotation.x = 0.155; }
      }
    } else if (a.shade === 'umbrella') {
      s.rod([sx + 0.3, 0.3, sz - 0.75], [sx + 0.1, roofY + 0.2, sz - 0.4], 0.03, s.material('#d8d4c6', { metalness: 0.5 }));
      const geometry = new THREE.ConeGeometry(1.25, 0.42, 8, 1, true);
      const colours: number[] = [], c1 = new THREE.Color(pick(['#c2452f', '#3d6fa3', '#3f8a5a'])).lerp(new THREE.Color('#e8e2d0'), mood.wear * 0.5), c2 = new THREE.Color('#f0ead6');
      for (let i = 0; i < geometry.attributes.position.count; i++) { const c = Math.floor((i % 9) / 1) % 2 ? c1 : c2; colours.push(c.r, c.g, c.b); }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      const canopy = s.mesh(geometry.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, flatShading: true }), [sx + 0.08, roofY + 0.32, sz - 0.38]);
      canopy.rotation.set(0.12, 0, 0.1);
    }

    // Charm or flag.
    const hang: P3 = a.shade === 'none' || a.shade === 'umbrella' ? [0.9, dy + 0.55, dz] : [sx, roofY + 0.05, pz[1]];
    if (a.charm === 'garland') {
      const beads: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i <= 30; i++) { const f = i / 30; beads.push({ at: [mix(-0.55, 0.55, f), 1.55 - Math.sin(f * Math.PI) * 0.35 + (a.engine === 'flywheel' ? 0.2 : 0), ez - (a.engine === 'marine' ? 1.13 : a.engine === 'truck' ? 0.96 : 0.78)], size: 0.05, color: i % 4 ? '#f2a01e' : '#f6c62a' }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), beads);
    } else if (a.charm === 'lemon') {
      s.rod(hang, [hang[0], hang[1] - 0.5, hang[2]], 0.004, iron);
      s.ball([0.05, 0.06, 0.05], [hang[0], hang[1] - 0.26, hang[2]], s.material('#f1d93a'), 10);
      for (let i = 0; i < 5; i++) { const chilli = s.cylinder(0.012, 0.002, 0.13, [hang[0] + (i - 2) * 0.014, hang[1] - 0.38 - (i % 2) * 0.05, hang[2]], s.material('#3f8a3a'), 6); chilli.rotation.z = (i - 2) * 0.2; }
    } else if (a.charm === 'pennant' || a.charm === 'crescent') {
      const fx = -1.0, fz = -2.2;
      s.rod([fx, 0.3, fz], [fx + 0.1, 3.7, fz], 0.03, bamboo);
      if (a.charm === 'pennant') {
        const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.95, 0.24), new THREE.Vector2(0, 0.48)]);
        s.mesh(new THREE.ShapeGeometry(shape), s.material(mood.warmth > 0.5 ? '#e8621c' : '#c8281f', { side: THREE.DoubleSide }), [fx + 0.1, 3.18, fz]);
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = 192; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#1f7a4a'; ctx.fillRect(0, 0, 192, 128);
        ctx.fillStyle = '#f6f3e6'; ctx.beginPath(); ctx.arc(88, 64, 34, 0, 7); ctx.fill();
        ctx.fillStyle = '#1f7a4a'; ctx.beginPath(); ctx.arc(100, 64, 29, 0, 7); ctx.fill();
        ctx.fillStyle = '#f6f3e6'; ctx.beginPath();
        for (let k = 0; k < 10; k++) { const r = k % 2 ? 6 : 15, t = (k * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(118 + Math.cos(t) * r, 64 + Math.sin(t) * r); }
        ctx.fill();
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        s.mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.9 }), [fx + 0.56, 3.38, fz]);
      }
    } else if (a.charm === 'tinsel') {
      const shiny = new THREE.MeshStandardMaterial({ color: '#dfe6ee', metalness: 0.9, roughness: 0.15, emissive: '#8fb0d0', emissiveIntensity: 0.35, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) {
        const x = hang[0] - 0.6 + i * 0.4, drop = 0.25 + random() * 0.3;
        s.rod([x, hang[1], hang[2]], [x, hang[1] - drop, hang[2]], 0.003, iron);
        s.cylinder(0.06, 0.06, 0.004, [x, hang[1] - drop - 0.06, hang[2]], shiny, 16).rotation.set(Math.PI / 2, 0, random() * 2);
      }
      s.tube([[hang[0] - 0.8, hang[1], hang[2]], [hang[0] - 0.3, hang[1] - 0.12, hang[2]], [hang[0] + 0.3, hang[1] - 0.1, hang[2]], [hang[0] + 0.8, hang[1], hang[2]]], 0.025, s.material(pick(['#c8281f', '#d8b23a', '#3f8a5a']), { metalness: 0.6, roughness: 0.3 }));
    }

    // Smoke.
    const puffs: THREE.Mesh[] = [];
    const count = Math.round(a.smoke * 9);
    const smokeMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b9b6ad').lerp(new THREE.Color('#2a2826'), a.smoke * a.smoke), transparent: true, opacity: mix(0.25, 0.6, a.smoke), depthWrite: false, roughness: 1 });
    for (let i = 0; i < count; i++) {
      const puff = s.ball([1, 1, 1], exhaust, smokeMaterial, 10);
      puff.castShadow = puff.receiveShadow = false;
      puffs.push(puff);
    }
    const drift = (random() - 0.5) * 0.8, speed = mix(0.15, 0.6, mood.energy) * (0.4 + a.smoke);
    const pose = (time: number) => puffs.forEach((puff, i) => {
      const age = (i / Math.max(1, count) + time * speed * 0.25) % 1;
      puff.position.set(exhaust[0] + drift * age * 2 + Math.sin(i * 2.3) * 0.15 * age, exhaust[1] + 0.1 + age * 2.2, exhaust[2] - age * 0.9 + Math.cos(i * 1.7) * 0.15 * age);
      puff.scale.setScalar(0.12 + age * mix(0.3, 0.75, a.smoke));
    });
    pose(0);
    const turning = a.cable === 'taut' ? 1 : 0, running = a.smoke > 0.12 ? 1 : 0;
    return s.finish({
      footprint: 2.8,
      update: (dt, time) => {
        pose(time);
        drum.rotation.x += dt * 0.25 * turning * mix(0.4, 1.4, mood.energy);
        for (const wheel of spinners) wheel.rotation.x += dt * running * mix(3, 9, mood.energy);
        if (taut) taut.position.y += Math.sin(time * 40) * 0.0006 * mood.energy;
      },
    });
  },
});
