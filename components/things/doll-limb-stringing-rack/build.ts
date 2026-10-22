import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Kind = 'arm' | 'leg' | 'torso';

/** Paint a geometry with one flat vertex colour so merged parts can carry dark sockets. */
function tinted(geometry: THREE.BufferGeometry, shade: number, matrix?: THREE.Matrix4) {
  const g = geometry.toNonIndexed();
  if (matrix) g.applyMatrix4(matrix);
  const count = g.getAttribute('position').count;
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(shade), 3));
  g.deleteAttribute('uv');
  return g;
}
const at = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz));
function segment(from: [number, number, number], to: [number, number, number], r0: number, r1: number) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const m = new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), new THREE.Vector3(1, 1, 1));
  return tinted(new THREE.CylinderGeometry(r1, r0, d.length(), 12), 1, m);
}
/** Unit parts: the stringing loop is at the origin and the part hangs down one unit. */
function partGeometry(kind: Kind) {
  const ball = () => new THREE.SphereGeometry(1, 14, 10);
  if (kind === 'arm') {
    return mergeGeometries([
      tinted(ball(), 1, at(0, -0.13, 0, 0.14, 0.14, 0.14)),
      segment([0, -0.13, 0], [0, -0.52, 0.01], 0.125, 0.11),
      tinted(ball(), 1, at(0, -0.52, 0.01, 0.11, 0.11, 0.11)),
      segment([0, -0.52, 0.01], [0, -0.85, 0.14], 0.105, 0.08),
      tinted(ball(), 1, at(0, -0.92, 0.17, 0.085, 0.11, 0.075, 0.4)),
      tinted(ball(), 1, at(0.06, -0.9, 0.19, 0.03, 0.05, 0.03, 0.4)),
      tinted(new THREE.TorusGeometry(0.05, 0.015, 5, 10), 0.35, at(0, -0.02, 0)),
    ])!;
  }
  if (kind === 'leg') {
    return mergeGeometries([
      tinted(ball(), 1, at(0, -0.16, 0, 0.17, 0.17, 0.17)),
      segment([0, -0.16, 0], [0, -0.55, 0.02], 0.165, 0.13),
      tinted(ball(), 1, at(0, -0.55, 0.02, 0.13, 0.13, 0.13)),
      segment([0, -0.55, 0.02], [0, -0.9, 0], 0.125, 0.09),
      tinted(ball(), 1, at(0, -0.95, 0.07, 0.095, 0.07, 0.17)),
      tinted(new THREE.TorusGeometry(0.05, 0.015, 5, 10), 0.35, at(0, -0.02, 0)),
    ])!;
  }
  const profile = [[0.001, 0], [0.14, -0.01], [0.16, -0.06], [0.31, -0.14], [0.34, -0.3], [0.29, -0.52], [0.31, -0.68], [0.34, -0.82], [0.26, -0.95], [0.001, -1]].map(([x, y]) => new THREE.Vector2(x, y)).reverse();
  const disc = () => new THREE.SphereGeometry(1, 12, 8);
  return mergeGeometries([
    tinted(new THREE.LatheGeometry(profile, 20), 1, at(0, 0, 0, 1, 1, 0.72)),
    tinted(disc(), 0.12, at(0, -0.005, 0, 0.1, 0.02, 0.08)),
    tinted(disc(), 0.12, at(0.31, -0.2, 0, 0.03, 0.09, 0.09)),
    tinted(disc(), 0.12, at(-0.31, -0.2, 0, 0.03, 0.09, 0.09)),
    tinted(disc(), 0.12, at(0.16, -0.95, 0.02, 0.11, 0.04, 0.11)),
    tinted(disc(), 0.12, at(-0.16, -0.95, 0.02, 0.11, 0.04, 0.11)),
  ])!;
}

const TONES = {
  pale: ['#f3dccd', '#f1d2c0', '#f6e2d6'],
  mixed: ['#f3dccd', '#d9a67e', '#8a5a3c', '#5e3d2a', '#eac4a6', '#b97f5c'],
  brown: ['#8a5a3c', '#6b4430', '#a8734e', '#5e3d2a'],
} as const;

export default defineThing({
  questions: {
    parts: choice('Which parts dominate the rack?', {
      arms: 'Mostly arms, bent at the elbow, small hands dangling.',
      legs: 'Mostly chubby legs with pointed feet.',
      torsos: 'Mostly limbless torsos with dark empty sockets.',
      everything: 'An even mix of arms, legs and torsos.',
    }),
    material: choice('What are the parts made of?', {
      bisque: 'Matte bisque porcelain.',
      composition: 'Yellowed composition, chipped and crazed.',
      celluloid: 'Glossy thin celluloid.',
      salvage: 'Whatever turned up: every material and finish together.',
    }),
    tones: choice('What skin tones are they?', {
      pale: 'All pale pink-white.',
      mixed: 'Every tone from pale pink to deep brown.',
      brown: 'All warm browns.',
    }),
    order: choice('How are they arranged?', {
      sorted: 'Sorted by kind and graded by size, largest to smallest, evenly spaced.',
      bunched: 'Hung in bunches of two and three per hook, roughly by kind.',
      tangled: 'Tangled: cords of every length crossing, parts twisted round each other.',
    }),
    rack: choice('What kind of rack is it?', {
      board: 'A wooden backboard on feet with rows of brass cup hooks.',
      rail: 'An open frame of two uprights and three rails, the parts hanging free in the air.',
      tree: 'A standing pole with tiers of radiating arms, like a hat stand hung with limbs.',
    }),
    feeling: choice('What is the feeling of it?', {
      orderly: 'Orderly spares: clean, labelled rows, a stockroom.',
      grisly: 'A slightly grisly thicket: crowded, dark-stained, long cords, a few limbs fallen in a heap below.',
      treasured: 'Treasured salvage: each piece tagged with a paper label, kept with care.',
    }),
    body: noul('Is a complete small body being strung together among them?'),
    tool: choice('Where is the restringing hook?', {
      hanging: 'Hanging from its own nail at the side.',
      floor: 'Lying at the foot of the rack beside a spool of elastic.',
      'in-use': 'Left hooked through a hanging torso, mid-job.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const grisly = a.feeling === 'grisly';
    const woodColour = grisly ? '#4a3626' : '#a67b4d';
    const wood = s.material(woodColour, { roughness: 0.8 });
    const brass = s.material('#c9a23a', { metalness: 0.85, roughness: 0.3 });
    const steel = s.material('#b9bdc0', { metalness: 0.85, roughness: 0.3 });

    // Hooks: where things hang, and which way is "out" from the rack.
    type Hook = { p: THREE.Vector3; yaw: number; row: number; t: number };
    const hooks: Hook[] = [];
    const perRow = Math.round(mix(4, 7, mood.density) * (grisly ? 1.25 : 1));
    const rows = [1.14, 0.8, 0.46];
    const W = 0.95;
    if (a.rack === 'tree') {
      s.cylinder(0.018, 0.022, 1.28, [0, 0.64, 0], wood, 14);
      s.cylinder(0.2, 0.24, 0.03, [0, 0.015, 0], wood, 24);
      s.ball([0.035, 0.035, 0.035], [0, 1.29, 0], brass, 14);
      rows.forEach((y, row) => {
        const radius = 0.2 + row * 0.07, n = Math.max(5, perRow - 1);
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * Math.PI * 2 + row * 0.5;
          const tip: [number, number, number] = [Math.sin(angle) * radius, y + 0.04, Math.cos(angle) * radius];
          s.rod([0, y + 0.01, 0], tip, 0.007, wood, 0.005);
          hooks.push({ p: new THREE.Vector3(tip[0], y + 0.03, tip[2]), yaw: angle, row, t: i / n });
        }
      });
    } else {
      if (a.rack === 'board') {
        s.box([W, 1.06, 0.02], [0, 0.72, -0.02], wood);
        for (const side of [-1, 1]) {
          s.box([0.05, 1.26, 0.03], [side * (W / 2 - 0.05), 0.63, -0.045], wood);
          s.box([0.05, 0.03, 0.3], [side * (W / 2 - 0.05), 0.015, 0.02], wood);
        }
      } else {
        for (const side of [-1, 1]) {
          s.cylinder(0.014, 0.014, 1.26, [side * W / 2, 0.63, 0], wood, 10);
          s.box([0.04, 0.03, 0.34], [side * W / 2, 0.015, 0], wood);
        }
        for (const y of rows) s.rod([-W / 2, y + 0.04, 0], [W / 2, y + 0.04, 0], 0.009, wood);
      }
      rows.forEach((y, row) => {
        for (let i = 0; i < perRow; i++) {
          const t = perRow > 1 ? i / (perRow - 1) : 0.5;
          const x = mix(-W / 2 + 0.09, W / 2 - 0.09, t) + (a.order === 'tangled' ? (random() - 0.5) * 0.06 : 0);
          hooks.push({ p: new THREE.Vector3(x, y + 0.02, a.rack === 'board' ? 0.025 : 0), yaw: 0, row, t });
        }
      });
      if (a.rack === 'board') {
        const hookGeometry = new THREE.TorusGeometry(0.012, 0.0028, 6, 12, Math.PI * 1.3);
        const mesh = new THREE.InstancedMesh(hookGeometry, brass, hooks.length);
        const m = new THREE.Matrix4();
        hooks.forEach((hook, i) => {
          m.compose(new THREE.Vector3(hook.p.x, hook.p.y + 0.01, 0.006), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.PI)), new THREE.Vector3(1, 1, 1));
          mesh.setMatrixAt(i, m);
        });
        mesh.castShadow = true;
        s.root.add(mesh);
        if (a.feeling === 'orderly') {
          const names = { arms: ['ARMS', 'ARMS', 'ODDS'], legs: ['LEGS', 'LEGS', 'ODDS'], torsos: ['BODIES', 'BODIES', 'ODDS'], everything: ['ARMS', 'LEGS', 'BODIES'] }[a.parts];
          rows.forEach((y, row) => s.label(names[row], 0.13, 0.035, [-W / 2 + 0.085, y + 0.062, -0.008], '#3b2c20', '#f0e4c4'));
        }
      }
    }

    // Decide what hangs from each hook.
    type Hung = { kind: Kind; hook: Hook; size: number; cord: number; yaw: number; swing: number; tilt: number; phase: number; colour: THREE.Color; z: number };
    const hung: Hung[] = [];
    const tones = TONES[a.tones];
    const grime = new THREE.Color(grisly ? '#3a2a20' : '#6a5a48');
    const base: Record<Kind, number> = { arm: 0.2, leg: 0.24, torso: 0.21 };
    const kindFor = (row: number): Kind => {
      const order: Kind[] = { arms: ['arm', 'arm', 'leg'], legs: ['leg', 'leg', 'arm'], torsos: ['torso', 'torso', 'leg'], everything: ['arm', 'leg', 'torso'] }[a.parts] as Kind[];
      if (a.order === 'tangled') return random() < 0.6 ? order[0] : (['arm', 'leg', 'torso'] as Kind[])[Math.floor(random() * 3)];
      return a.order === 'bunched' && random() < 0.15 ? order[(row + 1) % 3] : order[row];
    };
    const bodyHook = a.body ? hooks.filter((hook) => hook.row === 1)[Math.floor(perRow / 2)] ?? hooks[0] : null;
    for (const hook of hooks) {
      if (hook === bodyHook) continue;
      if (bodyHook && hook.row === 1 && Math.abs(hook.p.x - bodyHook.p.x) < 0.2 && a.rack !== 'tree') continue;
      if (bodyHook && hook.row === 2 && Math.abs(hook.p.x - bodyHook.p.x) < 0.1 && a.rack !== 'tree') continue;
      if (a.order !== 'sorted' && random() < 0.12) continue;
      const bunch = a.order === 'sorted' ? 1 : a.order === 'bunched' ? 2 + Math.floor(random() * 2) : 1 + Math.floor(random() * 2.4);
      const kind0 = kindFor(hook.row);
      for (let b = 0; b < bunch; b++) {
        const kind = a.order === 'tangled' && b > 0 ? kindFor(hook.row) : kind0;
        const graded = mix(1.12, 0.55, hook.t);
        const size = base[kind] * (a.order === 'sorted' ? graded : mix(0.6, 1.12, random())) * (kind === 'torso' && bunch > 1 ? 0.8 : 1);
        const colour = new THREE.Color(tones[Math.floor(random() * tones.length)]);
        const material = a.material === 'salvage' ? ['bisque', 'composition', 'celluloid'][Math.floor(random() * 3)] : a.material;
        if (material === 'composition') colour.lerp(new THREE.Color('#c9a56a'), 0.3);
        if (material === 'celluloid') colour.lerp(new THREE.Color('#ffb9a8'), 0.25);
        if (random() < wear * 0.7 + (grisly ? 0.25 : 0)) colour.lerp(grime, 0.2 + random() * 0.35);
        hung.push({
          kind, hook, size, colour, phase: random() * 6,
          cord: a.order === 'tangled' || grisly ? 0.02 + random() * 0.11 : 0.025 + b * 0.03,
          yaw: a.order === 'sorted' ? (random() - 0.5) * 0.3 : (random() - 0.5) * (a.order === 'tangled' ? 6 : 1.6),
          swing: a.order === 'tangled' ? (random() - 0.5) * 0.5 : (b - (bunch - 1) / 2) * 0.22 + (random() - 0.5) * 0.06,
          tilt: a.order === 'tangled' ? (random() - 0.5) * 0.9 : (random() - 0.5) * 0.1,
          z: b * 0.022,
        });
      }
    }

    const gloss = { bisque: 0.75, composition: 0.6, celluloid: 0.15, salvage: 0.45 }[a.material];
    const flesh = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: gloss });
    const elastic = new THREE.MeshStandardMaterial({ color: grisly ? '#8a2f2a' : '#e9e2d0', roughness: 0.9 });
    const geometries: Record<Kind, THREE.BufferGeometry> = { arm: partGeometry('arm'), leg: partGeometry('leg'), torso: partGeometry('torso') };
    const meshes = {} as Record<Kind, THREE.InstancedMesh>;
    const byKind: Record<Kind, Hung[]> = { arm: [], leg: [], torso: [] };
    for (const item of hung) byKind[item.kind].push(item);
    for (const kind of ['arm', 'leg', 'torso'] as Kind[]) {
      const mesh = new THREE.InstancedMesh(geometries[kind], flesh, Math.max(1, byKind[kind].length));
      mesh.count = byKind[kind].length;
      byKind[kind].forEach((item, i) => mesh.setColorAt(i, item.colour));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      meshes[kind] = mesh;
      s.root.add(mesh);
    }
    const cordGeometry = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 5);
    cordGeometry.translate(0, -0.5, 0);
    const cords = new THREE.InstancedMesh(cordGeometry, elastic, Math.max(1, hung.length));
    cords.count = hung.length;
    cords.frustumCulled = false;
    s.root.add(cords);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();
    const pose = (sway: number, time: number) => {
      const index: Record<Kind, number> = { arm: 0, leg: 0, torso: 0 };
      hung.forEach((item, i) => {
        const swing = item.swing + Math.sin(time * 1.3 + item.phase) * sway;
        // Swing about the hook, in the plane across the rack face.
        q.setFromEuler(e.set(item.tilt * 0.4, item.hook.yaw, 0)).multiply(q2.setFromEuler(e.set(0, 0, swing)));
        v.set(0, 0, item.z).applyQuaternion(q).add(item.hook.p);
        m.compose(v, q, sc.set(1, item.cord, 1));
        cords.setMatrixAt(i, m);
        const end = new THREE.Vector3(0, -item.cord, 0).applyQuaternion(q).add(v);
        q2.setFromEuler(e.set(item.tilt, item.yaw, 0));
        m.compose(end, q.clone().multiply(q2), sc.setScalar(item.size));
        meshes[item.kind].setMatrixAt(index[item.kind]++, m);
      });
      cords.instanceMatrix.needsUpdate = true;
      for (const kind of ['arm', 'leg', 'torso'] as Kind[]) meshes[kind].instanceMatrix.needsUpdate = true;
    };
    pose(0, 0);
    void one;

    const solid = (kind: Kind, colour: THREE.Color) => {
      const material = new THREE.MeshStandardMaterial({ color: colour, vertexColors: true, roughness: gloss });
      const mesh = new THREE.Mesh(geometries[kind], material);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    // The body under assembly: a torso with limbs loosely strung on.
    let bodyGroup: THREE.Group | null = null;
    if (bodyHook) {
      const colour = new THREE.Color(tones[Math.floor(random() * tones.length)]);
      const size = 0.25;
      bodyGroup = new THREE.Group();
      bodyGroup.position.copy(bodyHook.p);
      bodyGroup.rotation.y = bodyHook.yaw + (random() - 0.5) * 0.3;
      s.root.add(bodyGroup);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.05, 5), elastic);
      cord.position.y = -0.025;
      bodyGroup.add(cord);
      const torso = solid('torso', colour);
      torso.scale.setScalar(size);
      torso.position.y = -0.05;
      bodyGroup.add(torso);
      const armLength = 0.19, legLength = 0.24;
      for (const side of [-1, 1]) {
        const arm = solid('arm', a.tones === 'mixed' && side > 0 ? new THREE.Color(tones[Math.floor(random() * tones.length)]) : colour);
        arm.scale.setScalar(armLength);
        arm.position.set(side * size * 0.36, -0.05 - size * 0.12, 0);
        arm.rotation.set(-0.2 - random() * 0.5, 0, side * (0.25 + random() * 0.5));
        bodyGroup.add(arm);
        const attached = side < 0 || random() < 0.5;
        const leg = solid('leg', colour);
        leg.scale.setScalar(legLength);
        if (attached) {
          leg.position.set(side * size * 0.17, -0.05 - size * 0.9, 0.004);
          leg.rotation.set(-0.15 - random() * 0.3, 0, side * 0.12);
        } else {
          // Still dangling on a length of elastic, not yet pulled home.
          leg.position.set(side * size * 0.2, -0.05 - size * 0.92 - 0.07, 0.004);
          leg.rotation.set(0, 0, side * 0.3);
          const slack = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.08, 5), elastic);
          slack.position.set(side * size * 0.185, -0.05 - size * 0.92 - 0.03, 0.004);
          bodyGroup.add(slack);
        }
        bodyGroup.add(leg);
      }
    }

    // Fallen limbs for the thicket; paper tags for salvage.
    if (grisly) {
      for (let i = 0; i < 7; i++) {
        const kind: Kind = random() < 0.5 ? 'arm' : 'leg';
        const part = solid(kind, new THREE.Color(tones[Math.floor(random() * tones.length)]).lerp(grime, random() * 0.4));
        part.scale.setScalar(base[kind] * mix(0.7, 1.2, random()));
        part.position.set((random() - 0.5) * 0.5, 0.025 + random() * 0.03, 0.1 + random() * 0.16);
        part.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.4, random() * 6, (random() - 0.5) * 0.6);
        s.root.add(part);
      }
    }
    if (a.feeling === 'treasured') {
      const tagGeometry = new THREE.BoxGeometry(0.03, 0.045, 0.001);
      const tagMesh = new THREE.InstancedMesh(tagGeometry, s.material('#f0e2bc', { roughness: 0.9 }), hung.length);
      let n = 0;
      for (const item of hung) {
        if (random() < 0.45) continue;
        const out = new THREE.Vector3(Math.sin(item.hook.yaw), 0, Math.cos(item.hook.yaw));
        v.copy(item.hook.p).addScaledVector(out, 0.03 + item.z).add(new THREE.Vector3((random() - 0.5) * 0.03, -item.cord - item.size * 0.25, 0));
        m.compose(v, q.setFromEuler(e.set(0, item.hook.yaw, (random() - 0.5) * 0.9)), one);
        tagMesh.setMatrixAt(n++, m);
      }
      tagMesh.count = n;
      tagMesh.castShadow = true;
      s.root.add(tagMesh);
    }

    // Restringing hook: wooden handle, long wire, small crook.
    const tool = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.09, 12), s.material('#7a2f22', { roughness: 0.5 }));
    handle.position.y = -0.045;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.24, 6), steel);
    shaft.position.y = -0.21;
    const crook = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.002, 6, 12, Math.PI * 1.2), steel);
    crook.position.set(0.01, -0.33, 0);
    crook.rotation.z = Math.PI;
    for (const part of [handle, shaft, crook]) { part.castShadow = true; tool.add(part); }
    const edge = a.rack === 'tree' ? 0.3 : W / 2;
    if (a.tool === 'floor' || (a.tool === 'in-use' && !bodyGroup && !byKind.torso.length)) {
      tool.position.set(edge * 0.5, 0.013, 0.26);
      tool.rotation.set(0, 0.4 + random() * 0.6, Math.PI / 2);
      const spool = s.cylinder(0.03, 0.03, 0.05, [edge * 0.5 - 0.22, 0.03, 0.25], elastic, 16);
      spool.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) s.cylinder(0.04, 0.04, 0.005, [edge * 0.5 - 0.22 + side * 0.027, 0.04, 0.25], wood, 16).rotation.z = Math.PI / 2;
      spool.position.y = 0.04;
    } else if (a.tool === 'in-use') {
      const target = bodyGroup ? bodyGroup.position.clone().add(new THREE.Vector3(0, -0.02, 0.02)) : byKind.torso[0].hook.p.clone().add(new THREE.Vector3(0, -byKind.torso[0].cord, 0.02));
      tool.position.copy(target).add(new THREE.Vector3(0.05, 0.36, 0.06));
      tool.rotation.set(0.15, 0, 0.14);
    } else {
      tool.position.set(edge + (a.rack === 'tree' ? -0.3 : 0.035), a.rack === 'tree' ? 1.2 : 1.05, a.rack === 'tree' ? 0.03 : 0.01);
      tool.rotation.z = (random() - 0.5) * 0.15;
    }
    s.root.add(tool);

    const sway = mix(0, 0.16, mood.energy);
    return s.finish({
      footprint: a.rack === 'tree' ? 0.4 : 0.52,
      update: (_dt, time) => {
        if (sway < 0.01) return;
        pose(sway, time);
        if (bodyGroup) bodyGroup.rotation.z = Math.sin(time * 1.1) * sway * 0.6;
      },
    });
  },
});
