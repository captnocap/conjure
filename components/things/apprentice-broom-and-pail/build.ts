import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];

export default defineThing({
  questions: {
    broom: choice('What is the broom doing?', {
      ordinary: 'Nothing: an ordinary broom leaned on the pail where someone left it.',
      sweeping: 'Enchanted mid-sweep: standing up by itself, rocking, pushing a line of dust, sparks around the handle.',
      carrying: 'It has grown twig arms and is carrying two small pails of water by itself.',
      multiplying: 'Multiplying: a file of brooms of shrinking sizes, each with arms and pails, marching round the pail.',
      snapped: 'Chopped in two with a hatchet that lies beside it, splinters everywhere.',
      hovering: 'Hovering level at knee height, ready to be ridden, trailing sparks.',
    }),
    pail: choice('What state is the pail in?', {
      full: 'Full of clean water to the brim.',
      sudsy: 'Overflowing with soap suds that slide down the side.',
      tipped: 'Knocked over on its side, the water running out across the floor.',
      empty: 'Dry and empty with a rag over the rim.',
      glowing: 'Full of something that glows and steams and is not water.',
    }),
    puddle: score('How much water is on the floor?', ['Bone dry', 'A few drips', 'A spreading puddle', 'A flood across the whole floor']),
    hat: choice('Where is the pointed hat?', {
      floor: 'Sitting upright on the floor where it was put down and forgotten.',
      broom: 'Hooked on the top of the broom handle.',
      soaked: 'Lying on its side in the wet, sodden.',
      crushed: 'Trodden flat, the point folded over.',
    }),
    hatColour: choice('What is the hat like?', {
      midnight: 'Midnight blue with gold stars.',
      crimson: 'Crimson with a gold band, a little grand for an apprentice.',
      moss: 'Moss green, patched and homely.',
      grey: 'Plain dusty grey, a hand-me-down.',
      violet: 'Violet with silver stars.',
    }),
    bristles: choice('What is the broom head made of?', {
      twig: 'A round besom of dark birch twigs.',
      straw: 'A flat fan of yellow straw stitched with red cord.',
      heather: 'A bundle of heather still sprouting green.',
    }),
    left: choice('What else was left on the floor?', {
      nothing: 'Nothing else.',
      brush: 'A scrubbing brush and a cake of soap.',
      footprints: 'Wet footprints leading away.',
      book: 'A small spellbook lying open face-down, glowing underneath: the cause of it all.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root;
    const jit = (amount: number) => (random() - 0.5) * 2 * amount;

    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const instanced = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[]) => {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const UP = new THREE.Vector3(0, 1, 0);
    const between = (from: THREE.Vector3, to: THREE.Vector3, thick = 1) => {
      const direction = to.clone().sub(from);
      const length = direction.length();
      return new THREE.Matrix4().compose(
        from.clone().add(to).multiplyScalar(0.5),
        new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()),
        new THREE.Vector3(thick, length, thick),
      );
    };
    const tubeOf = (points: P3[], radius: number) =>
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), points.length * 6, radius, 7);

    // Materials.
    const stickWood = s.material('#8a6a42');
    const paleWood = s.material('#b08a58');
    const staveWood = s.material(mood.wear > 0.6 ? '#7d6a52' : '#a77c4a', { side: THREE.DoubleSide });
    const darkWood = s.material('#4a3524');
    const iron = s.material('#34343a', { metalness: 0.6, roughness: 0.5 });
    const cord = s.material('#c9ad74');
    const twigHex = { twig: '#4b3423', straw: '#d8b450', heather: '#6a4a36' }[a.bristles];
    const twigMat = s.material(twigHex);
    const coreMat = s.material(new THREE.Color(twigHex).multiplyScalar(0.7).getStyle());
    const leafMat = s.material('#6f9a4a');
    const glowing = a.pail === 'glowing';
    const brew = new THREE.Color().setHSL(mix(0.42, 0.86, mood.warmth), 0.85, 0.55);
    const waterHex = glowing ? `#${brew.getHexString()}` : '#6f97ad';
    const water = new THREE.MeshStandardMaterial({
      color: waterHex, roughness: 0.08, metalness: glowing ? 0 : 0.25,
      emissive: glowing ? waterHex : '#000000', emissiveIntensity: glowing ? 0.9 : 0,
    });
    const sudMat = new THREE.MeshStandardMaterial({ color: '#f6f8fb', roughness: 0.3 });
    const sparkHex = mood.cheer > 0.45 ? '#ffd45a' : '#9be86a';
    const sparkMat = new THREE.MeshStandardMaterial({ color: sparkHex, emissive: sparkHex, emissiveIntensity: 1.6, transparent: true, opacity: 0.95, depthWrite: false });

    // ---- A pail of staves and hoops. Origin at the centre of its base.
    const makePail = (r: number, h: number, detailed: boolean, level: number) => {
      const g = new THREE.Group();
      const rb = r * 0.82;
      add(g, new THREE.LatheGeometry([[0, 0], [rb, 0], [r, h], [r * 0.92, h], [rb * 0.92, h * 0.1], [0, h * 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 26), staveWood);
      const at = (t: number) => mix(rb, r, t);
      const hoops: THREE.Mesh[] = [];
      for (const t of [0.2, 0.74]) {
        const hoop = add(g, new THREE.TorusGeometry(at(t) + r * 0.012, r * 0.045, 6, 28), iron, [0, h * t, 0]);
        hoop.rotation.x = Math.PI / 2;
        hoop.scale.z = 1.8;
        hoops.push(hoop);
      }
      if (detailed) {
        const lines: THREE.Matrix4[] = [];
        const staves = 13;
        for (let i = 0; i < staves; i++) {
          const t = (i / staves) * Math.PI * 2 + 0.2;
          lines.push(between(new THREE.Vector3(Math.cos(t) * (rb + 0.002), 0.004, Math.sin(t) * (rb + 0.002)), new THREE.Vector3(Math.cos(t) * (r + 0.002), h + 0.002, Math.sin(t) * (r + 0.002))));
        }
        instanced(g, new THREE.CylinderGeometry(0.0035, 0.0035, 1, 5), darkWood, lines);
        if (mood.wear > 0.55) { hoops[0].rotation.y = 0.16; hoops[0].position.y -= h * 0.07; }
        for (const side of [-1, 1]) add(g, new THREE.BoxGeometry(r * 0.1, h * 0.28, r * 0.26), staveWood, [side * r * 0.98, h * 1.02, 0]);
      }
      // A rope or iron bail, either standing or fallen forward onto the rim.
      const bail = add(g, new THREE.TorusGeometry(r * 0.98, r * 0.05, 6, 22, Math.PI), detailed ? cord : iron, [0, h * (detailed ? 1.08 : 1.0), 0]);
      bail.rotation.x = detailed ? (random() < 0.5 ? 1.25 : -1.2) + jit(0.1) : jit(0.25);
      if (level > 0) add(g, new THREE.CylinderGeometry(at(level) * 0.93, at(level) * 0.93, 0.008, 24), water, [0, h * level, 0]);
      return g;
    };

    // ---- A broom. Origin under the bristles, handle up +y, 1.4 m long.
    const makeBroom = (size: number, options: { arms?: boolean; stickTop?: number; sweep?: number } = {}) => {
      const g = new THREE.Group();
      const top = options.stickTop ?? 1.4;
      const sweep = options.sweep ?? 0;
      const points: P3[] = [[0, 0.36, 0]];
      for (let y = 0.7; y < top - 0.05; y += 0.33) points.push([jit(0.022), y, jit(0.022)]);
      points.push([jit(0.02), top, jit(0.02)]);
      add(g, tubeOf(points, 0.017), stickWood);
      const head = new THREE.Group();
      g.add(head);
      add(head, new THREE.LatheGeometry([[0, 0.03], [0.07, 0.035], [0.085, 0.13], [0.06, 0.32], [0.03, 0.46], [0, 0.47]].map(([x, y]) => new THREE.Vector2(x, y)), 14), coreMat);
      const twigs: THREE.Matrix4[] = [];
      const tips: THREE.Vector3[] = [];
      const count = a.bristles === 'straw' ? 64 : 44;
      for (let i = 0; i < count; i++) {
        const t = random() * Math.PI * 2, r = mix(0.05, 0.155, Math.sqrt(random()));
        const split = options.arms ? Math.sign(Math.cos(t)) * 0.035 : 0;
        const tip = new THREE.Vector3(Math.cos(t) * r + sweep * mix(0.5, 1, random()) + split, random() * 0.05, Math.sin(t) * r);
        tips.push(tip);
        twigs.push(between(tip, new THREE.Vector3(Math.cos(t) * 0.022, 0.45 + jit(0.02), Math.sin(t) * 0.022), mix(0.8, 1.3, random())));
      }
      instanced(head, new THREE.CylinderGeometry(0.008, 0.003, 1, 5), twigMat, twigs);
      if (a.bristles === 'heather')
        instanced(head, new THREE.IcosahedronGeometry(0.02, 0), leafMat, tips.filter((_tip, index) => index % 2 === 0).map((tip) =>
          new THREE.Matrix4().makeScale(1, 0.6, 1).setPosition(tip.x * 1.05, tip.y + 0.03 + random() * 0.2, tip.z * 1.05)));
      if (a.bristles === 'straw') {
        head.scale.set(1.45, 1, 0.42);
        const red = s.material('#b03a2c');
        for (const y of [0.2, 0.29]) add(g, new THREE.BoxGeometry(mix(0.3, 0.12, (y - 0.1) / 0.3), 0.014, 0.075), red, [sweep * (1 - y / 0.45) * 0.8, y, 0]);
      }
      add(g, new THREE.CylinderGeometry(0.036, 0.046, 0.075, 12), cord, [0, 0.43, 0]);
      add(g, new THREE.TorusGeometry(0.044, 0.008, 5, 14), cord, [0, 0.4, 0]).rotation.x = Math.PI / 2;
      if (options.arms) {
        for (const side of [-1, 1]) {
          const hand: P3 = [side * 0.27, 0.66 + jit(0.03), 0.07];
          add(g, tubeOf([[side * 0.012, 0.9, 0], [side * 0.14, 0.93, 0.03], [side * 0.25, 0.84, 0.06], hand], 0.011), twigMat);
          for (let f = 0; f < 3; f++) add(g, new THREE.CylinderGeometry(0.004, 0.002, 0.07, 4), twigMat, [hand[0] + (f - 1) * 0.02, hand[1] - 0.02, hand[2] + (f - 1) * 0.012]).rotation.z = (f - 1) * 0.5;
          const bucket = makePail(0.085, 0.15, false, mix(0.55, 0.92, random()));
          bucket.position.set(hand[0], hand[1] - 0.26, hand[2]);
          bucket.rotation.z = jit(0.18);
          g.add(bucket);
        }
      }
      g.scale.setScalar(size);
      return g;
    };

    // ---- The pointed hat. Origin at the centre of the brim.
    const makeHat = (crushed: boolean) => {
      const g = new THREE.Group();
      const hex = { midnight: '#27306e', crimson: '#8e2430', moss: '#4d6b3a', grey: '#7b7780', violet: '#6a3f96' }[a.hatColour];
      const felt = s.material(hex, { roughness: 0.9, side: THREE.DoubleSide });
      const starHex = a.hatColour === 'violet' ? '#e6ecf5' : '#ffd24a';
      const starMat = s.material(starHex, { emissive: starHex, emissiveIntensity: 0.6 });
      const bandMat = s.material({ midnight: '#c9a23c', crimson: '#d4ae45', moss: '#7a5a34', grey: '#45424a', violet: '#cfd5e0' }[a.hatColour], { metalness: 0.3 });
      const brim = add(g, new THREE.LatheGeometry([[0.1, 0.03], [0.14, 0.018], [0.2, 0.0], [0.215, 0.01], [0.15, 0.03], [0.1, 0.045]].map(([x, y]) => new THREE.Vector2(x, y)), 22), felt);
      brim.rotation.x = jit(0.05);
      const radii = [0.105, 0.078, 0.05, 0.026, 0.005], heights = [0.11, 0.11, 0.1, 0.1];
      const bends = crushed ? [1.25, 0.3, 0.25, 0.2] : [0.05 + random() * 0.1, 0.25 + random() * 0.25, 0.45 + random() * 0.4, 0];
      let parent: THREE.Object3D = g;
      let y = 0.03;
      const turn = random() * Math.PI * 2;
      for (let i = 0; i < 4; i++) {
        const joint = new THREE.Group();
        joint.position.y = y;
        joint.rotation.set(Math.cos(turn) * bends[i === 0 ? 0 : i], 0, Math.sin(turn) * bends[i === 0 ? 0 : i]);
        if (i === 0 && !crushed) joint.rotation.set(0, 0, 0);
        parent.add(joint);
        add(joint, new THREE.CylinderGeometry(radii[i + 1], radii[i], heights[i], 16, 1, true), felt, [0, heights[i] / 2, 0]);
        add(joint, new THREE.SphereGeometry(radii[i + 1], 10, 6), felt, [0, heights[i], 0]);
        if (i < 2 && (a.hatColour === 'midnight' || a.hatColour === 'violet')) {
          const stars: THREE.Matrix4[] = [];
          for (let k = 0; k < 5 - i * 2; k++) {
            const t = random() * Math.PI * 2, f = mix(0.25, 0.9, random()), r = mix(radii[i], radii[i + 1], f) + 0.003;
            stars.push(new THREE.Matrix4().makeScale(1, 1, 1).setPosition(Math.cos(t) * r, heights[i] * f, Math.sin(t) * r));
          }
          instanced(joint, new THREE.OctahedronGeometry(0.016, 0), starMat, stars);
        }
        if (i === 0) {
          add(joint, new THREE.CylinderGeometry(0.1, 0.109, 0.03, 16, 1, true), bandMat, [0, 0.02, 0]);
          if (a.hatColour === 'crimson' || a.hatColour === 'grey') add(joint, new THREE.BoxGeometry(0.04, 0.04, 0.01), starMat, [0, 0.02, 0.108]);
          if (a.hatColour === 'moss') add(joint, new THREE.BoxGeometry(0.05, 0.05, 0.006), s.material('#a58a52'), [0.05, 0.075, 0.075]).rotation.set(-0.2, 0.6, 0.3);
        }
        parent = joint;
        y = heights[i];
      }
      return g;
    };

    const blob = (radius: number, x: number, z: number, y: number, material: THREE.Material) => {
      const shape = new THREE.Shape();
      const p1 = random() * 6.3, p2 = random() * 6.3, p3 = random() * 6.3;
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        const r = radius * (0.8 + 0.13 * Math.sin(t * 2 + p1) + 0.09 * Math.sin(t * 3 + p2) + 0.06 * Math.sin(t * 5 + p3));
        if (i === 0) shape.moveTo(Math.cos(t) * r, Math.sin(t) * r); else shape.lineTo(Math.cos(t) * r, Math.sin(t) * r);
      }
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(-Math.PI / 2);
      const mesh = add(root, geometry, material, [x, y, z]);
      mesh.castShadow = false;
      return mesh;
    };

    // ---- The pail itself.
    const R = 0.17, H = 0.3;
    const tipped = a.pail === 'tipped';
    const pail = makePail(R, H, true, tipped || a.pail === 'empty' ? 0 : mix(0.86, 0.96, random()));
    const pailX = a.broom === 'ordinary' ? -0.02 : 0.08;
    if (tipped) {
      pail.rotation.set(0, mix(0.3, 0.9, random()), -Math.PI / 2 - 0.09);
      pail.position.set(pailX - 0.1, R * 0.95, 0);
    } else pail.position.set(pailX, 0, 0);
    root.add(pail);
    if (a.pail === 'empty') {
      const rag = s.material(mood.cheer > 0.5 ? '#c9b99a' : '#8f8a7c', { side: THREE.DoubleSide });
      const drape = add(root, new THREE.BoxGeometry(0.14, 0.012, 0.2, 4, 1, 4), rag, [pailX + R * 0.6, H + 0.006, R * 0.6]);
      drape.rotation.set(0.5, 0.8, -0.5);
      add(root, new THREE.BoxGeometry(0.13, 0.17, 0.012), rag, [pailX + R * 0.76, H - 0.075, R * 0.76]).rotation.y = Math.PI / 4;
    }
    if (a.pail === 'sudsy') {
      const suds: THREE.Matrix4[] = [];
      const n = Math.round(mix(34, 80, mood.density));
      const side = random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const size = mix(0.022, 0.055, random());
        const u = random();
        let p: THREE.Vector3;
        if (u < 0.5) { const t = random() * 6.3, r = Math.sqrt(random()) * R; p = new THREE.Vector3(Math.cos(t) * r, H + (1 - r / R) * 0.09 + random() * 0.03, Math.sin(t) * r); }
        else if (u < 0.8) { const t = side + jit(0.6), f = random(); p = new THREE.Vector3(Math.cos(t) * (R + 0.02), H * (1 - f), Math.sin(t) * (R + 0.02)); }
        else { const t = side + jit(0.9), r = R + random() * 0.18; p = new THREE.Vector3(Math.cos(t) * r, size * 0.5, Math.sin(t) * r); }
        suds.push(new THREE.Matrix4().makeScale(size, size * 0.85, size).setPosition(p.x + pailX, p.y, p.z));
      }
      instanced(root, new THREE.SphereGeometry(1, 10, 7), sudMat, suds);
    }
    const wisps: THREE.Mesh[] = [];
    if (glowing) {
      const steam = new THREE.MeshStandardMaterial({ color: waterHex, emissive: waterHex, emissiveIntensity: 0.5, transparent: true, opacity: 0.3, depthWrite: false });
      for (let i = 0; i < 4; i++) {
        const x = jit(0.06), z = jit(0.06);
        wisps.push(add(root, tubeOf([[x, 0, z], [x + jit(0.06), 0.12, z + jit(0.05)], [x + jit(0.09), 0.25, z + jit(0.07)], [x + jit(0.1), 0.38, z + jit(0.08)]], 0.014), steam, [pailX, H, 0]));
        wisps[i].castShadow = false;
      }
    }

    // ---- Water on the floor.
    let wet = a.puddle;
    if (tipped) wet = Math.max(wet, 0.5);
    if (a.broom === 'multiplying') wet = Math.max(wet, 0.35);
    const puddleX = tipped ? pailX + 0.32 : pailX - 0.05, puddleZ = 0.14;
    if (wet > 0.07) {
      const radius = mix(0.12, 0.74, wet);
      blob(radius, puddleX + jit(0.05), puddleZ + jit(0.05), 0.004, water);
      for (let i = 0; i < 2 + Math.floor(wet * 7); i++) {
        const t = random() * 6.3, d = radius * mix(0.85, 1.25, random());
        blob(mix(0.02, 0.07, random()), puddleX + Math.cos(t) * d, puddleZ + Math.sin(t) * d * 0.9, 0.004, water);
      }
    } else if (wet > 0.02) for (let i = 0; i < 4; i++) blob(0.025, pailX + jit(0.3), 0.2 + jit(0.12), 0.004, water);

    // ---- The broom, by what it is doing.
    const live: { group: THREE.Object3D; phase: number; kind: 'rock' | 'march' | 'bob'; base: THREE.Euler; y: number }[] = [];
    const sparkGroups: THREE.Object3D[] = [];
    const sparks = (parent: THREE.Object3D, count: number, place: (i: number) => P3) => {
      const matrices: THREE.Matrix4[] = [];
      for (let i = 0; i < count; i++) { const size = mix(0.012, 0.03, random()); matrices.push(new THREE.Matrix4().makeScale(size, size * 1.6, size).setPosition(...place(i))); }
      const holder = new THREE.Group();
      parent.add(holder);
      const mesh = instanced(holder, new THREE.OctahedronGeometry(1, 0), sparkMat, matrices);
      mesh.castShadow = false;
      sparkGroups.push(holder);
    };
    const track = (group: THREE.Object3D, kind: 'rock' | 'march' | 'bob') => live.push({ group, phase: random() * 6.3, kind, base: group.rotation.clone(), y: group.position.y });
    let hatBroom: THREE.Group | null = null;
    let hatFloor: P3 = [0.44, 0, 0.36];

    if (a.broom === 'ordinary') {
      const broom = makeBroom(1);
      broom.position.set(-0.36, 0.05, -0.02);
      broom.rotation.set(jit(0.04), jit(0.5), -0.44);
      root.add(broom);
      hatBroom = broom;
    } else if (a.broom === 'sweeping') {
      const broom = makeBroom(1, { sweep: 0.09 });
      broom.position.set(-0.5, 0, 0.16);
      broom.rotation.set(0.1, 0.3, 0.2);
      root.add(broom);
      track(broom, 'rock');
      hatBroom = broom;
      sparks(broom, Math.round(mix(8, 20, mood.energy)), (i) => { const t = i * 1.3; return [Math.cos(t) * 0.12, 0.55 + i * 0.045, Math.sin(t) * 0.12]; });
      const dust: THREE.Matrix4[] = [];
      const dustMat = s.material('#9b9488', { roughness: 1 });
      for (let i = 0; i < 46; i++) {
        const t = mix(-0.9, 0.6, random()), r = 0.36 + jit(0.035), size = mix(0.012, 0.034, random());
        dust.push(new THREE.Matrix4().makeScale(size, size * 0.7, size).setPosition(-0.5 + Math.cos(t) * r, size * 0.5, 0.16 + Math.sin(t) * r));
      }
      instanced(root, new THREE.IcosahedronGeometry(1, 0), dustMat, dust);
    } else if (a.broom === 'carrying') {
      const broom = makeBroom(1, { arms: true });
      broom.position.set(-0.52, 0, 0.1);
      broom.rotation.set(0.1, 0.45, 0.07);
      root.add(broom);
      track(broom, 'march');
      hatBroom = broom;
      sparks(broom, 7, (i) => [jit(0.2), 1.0 + i * 0.07, jit(0.15)]);
    } else if (a.broom === 'multiplying') {
      const n = 3 + Math.round(mood.density * 2) + (random() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const phi = mix(2.75, 0.2, n === 1 ? 0 : i / (n - 1));
        const broom = makeBroom(mix(1, 0.5, i / n), { arms: true });
        broom.position.set(pailX + Math.cos(phi) * 0.66, 0, -Math.sin(phi) * 0.55 + 0.2);
        broom.rotation.set(0.08, -phi + Math.PI / 2 + 0.5, jit(0.1));
        root.add(broom);
        track(broom, 'march');
        if (i === 0) hatBroom = broom;
      }
      const chips: THREE.Matrix4[] = [];
      for (let i = 0; i < 16; i++) chips.push(new THREE.Matrix4().compose(new THREE.Vector3(pailX + jit(0.6), 0.008, 0.45 + jit(0.2)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 6.3, 0)), new THREE.Vector3(mix(0.03, 0.09, random()), 0.012, 0.014)));
      instanced(root, new THREE.BoxGeometry(1, 1, 1), paleWood, chips);
      hatFloor = [0.3, 0, 0.5];
    } else if (a.broom === 'snapped') {
      const head = makeBroom(1, { stickTop: 0.82 });
      head.position.set(0.02, 0.13, 0.42);
      head.rotation.set(0, 0.25, Math.PI / 2 - 0.02);
      root.add(head);
      const upper = new THREE.Group();
      add(upper, tubeOf([[0, 0, 0], [jit(0.02), 0.3, jit(0.02)], [0, 0.58, 0]], 0.017), stickWood);
      upper.position.set(-0.52, 0.02, 0.02);
      upper.rotation.set(Math.PI / 2 - 0.02, 0, -0.5);
      root.add(upper);
      const splinters: THREE.Matrix4[] = [];
      for (let i = 0; i < 18; i++) {
        const from = new THREE.Vector3(-0.72 + jit(0.16), 0.006, 0.4 + jit(0.14));
        splinters.push(between(from, from.clone().add(new THREE.Vector3(jit(0.07), random() * 0.012, jit(0.07))), mix(0.6, 1.5, random())));
      }
      instanced(root, new THREE.CylinderGeometry(0.004, 0.001, 1, 4), paleWood, splinters);
      // The hatchet that did it.
      const axe = new THREE.Group();
      add(axe, new THREE.CylinderGeometry(0.014, 0.017, 0.42, 8), darkWood, [0, 0.21, 0]);
      const blade = new THREE.Shape();
      blade.moveTo(-0.02, -0.035); blade.lineTo(0.09, -0.07); blade.lineTo(0.1, 0.07); blade.lineTo(-0.02, 0.035); blade.closePath();
      add(axe, new THREE.ExtrudeGeometry(blade, { depth: 0.024, bevelEnabled: false }), s.material('#8d9298', { metalness: 0.75, roughness: 0.35 }), [0, 0.37, -0.012]);
      axe.position.set(-0.78, 0.02, 0.2);
      axe.rotation.set(Math.PI / 2, 0, 0.9 + jit(0.3));
      root.add(axe);
      hatFloor = [0.5, 0, 0.1];
    } else {
      const broom = makeBroom(1, { sweep: -0.03 });
      broom.position.set(-0.6, 0.52, -0.2);
      broom.rotation.set(0, 0.05, -Math.PI / 2 + 0.14);
      root.add(broom);
      track(broom, 'bob');
      hatBroom = broom;
      sparks(broom, Math.round(mix(10, 22, mood.energy)), () => [jit(0.14), -0.02 - random() * 0.4, jit(0.14)]);
    }

    // ---- The hat.
    const hat = makeHat(a.hat === 'crushed');
    if (a.hat === 'broom' && hatBroom) {
      hat.position.set(0, 1.33, 0);
      hat.rotation.set(0.22, random() * 6.3, 0.12);
      hat.scale.setScalar(1 / hatBroom.scale.x);
      hatBroom.add(hat);
    } else if (a.hat === 'soaked') {
      const lean = 1.25;
      hat.position.set(puddleX + 0.22, 0.2 * Math.sin(lean) - 0.01, puddleZ + 0.3);
      hat.rotation.set(0, mix(-0.6, 0.6, random()), -lean);
      root.add(hat);
    } else {
      hat.position.set(hatFloor[0], 0.001, hatFloor[2]);
      hat.rotation.y = random() * 6.3;
      root.add(hat);
    }

    // ---- What else was left.
    if (a.left === 'brush') {
      const brush = new THREE.Group();
      add(brush, new THREE.BoxGeometry(0.17, 0.028, 0.065), paleWood, [0, 0.056, 0]);
      add(brush, new THREE.BoxGeometry(0.16, 0.042, 0.058), s.material('#e2d5a8'), [0, 0.021, 0]);
      brush.position.set(-0.3, 0, 0.52);
      brush.rotation.y = jit(0.8);
      root.add(brush);
      const soap = add(root, new THREE.SphereGeometry(1, 12, 8), s.material(mood.cheer > 0.5 ? '#f0b8c6' : '#d8d2a4', { roughness: 0.35 }), [-0.08, 0.022, 0.6]);
      soap.scale.set(0.06, 0.022, 0.04);
      soap.rotation.y = jit(1);
      const bubbles: THREE.Matrix4[] = [];
      for (let i = 0; i < 6; i++) { const size = mix(0.012, 0.026, random()); bubbles.push(new THREE.Matrix4().makeScale(size, size, size).setPosition(-0.08 + jit(0.08), size, 0.6 + jit(0.06))); }
      instanced(root, new THREE.SphereGeometry(1, 8, 6), sudMat, bubbles);
    } else if (a.left === 'footprints') {
      const print = new THREE.MeshStandardMaterial({ color: glowing ? waterHex : '#557688', roughness: 0.15, emissive: glowing ? waterHex : '#000000', emissiveIntensity: glowing ? 0.6 : 0 });
      const soles: THREE.Matrix4[] = [];
      const heading = mix(0.15, 0.6, random());
      for (let i = 0; i < 6; i++) {
        const along = 0.2 + i * 0.13, side = (i % 2 ? 1 : -1) * 0.06;
        const x = puddleX + 0.1 + Math.cos(heading) * along - Math.sin(heading) * side, z = puddleZ + 0.2 + Math.sin(heading) * along + Math.cos(heading) * side;
        const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -heading + (i % 2 ? -0.15 : 0.15), 0));
        const fade = 1 - i * 0.08;
        soles.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.005, z), turn, new THREE.Vector3(0.065 * fade, 0.003, 0.036 * fade)));
        soles.push(new THREE.Matrix4().compose(new THREE.Vector3(x - Math.cos(heading) * 0.065, 0.005, z - Math.sin(heading) * 0.065), turn, new THREE.Vector3(0.028 * fade, 0.003, 0.026 * fade)));
      }
      instanced(root, new THREE.SphereGeometry(1, 12, 6), print, soles).castShadow = false;
    } else if (a.left === 'book') {
      const book = new THREE.Group();
      const cover = s.material(mood.cheer > 0.5 ? '#7a3f2a' : '#3a2f4a');
      const page = s.material('#eadfc2');
      for (const side of [-1, 1]) {
        const leaf = new THREE.Group();
        add(leaf, new THREE.BoxGeometry(0.15, 0.012, 0.2), cover, [side * 0.075, 0, 0]);
        add(leaf, new THREE.BoxGeometry(0.14, 0.02, 0.19), page, [side * 0.073, -0.014, 0]);
        leaf.position.y = 0.075;
        leaf.rotation.z = -side * 0.42;
        book.add(leaf);
      }
      add(book, new THREE.BoxGeometry(0.2, 0.02, 0.17), sparkMat, [0, 0.012, 0]).castShadow = false;
      add(book, new THREE.OctahedronGeometry(0.022, 0), s.material(sparkHex, { emissive: sparkHex, emissiveIntensity: 1 }), [0.07, 0.058, 0]).rotation.z = -0.42;
      book.position.set(a.broom === 'snapped' ? 0.3 : -0.24, 0, a.broom === 'snapped' ? 0.72 : 0.56);
      book.rotation.y = mix(0.3, 1.2, random());
      root.add(book);
    }

    const speed = mix(0.4, 2.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        const t = time * speed;
        for (const item of live) {
          const w = t * 2.4 + item.phase;
          if (item.kind === 'rock') { item.group.rotation.z = item.base.z + Math.sin(w) * 0.2; item.group.rotation.x = item.base.x + Math.cos(w) * 0.06; }
          else if (item.kind === 'march') { item.group.rotation.z = item.base.z + Math.sin(w) * 0.09; item.group.position.y = item.y + Math.abs(Math.sin(w)) * 0.025 * item.group.scale.x; }
          else { item.group.position.y = item.y + Math.sin(w * 0.6) * 0.035; item.group.rotation.z = item.base.z + Math.sin(w * 0.45) * 0.04; }
        }
        for (const holder of sparkGroups) holder.rotation.y = t * 1.3;
        wisps.forEach((wisp, index) => { wisp.rotation.y = Math.sin(t * 0.8 + index) * 0.5; });
      },
    });
  },
});
