import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

const FINISHES = {
  tar: 'Pine tar, dark brown and sticky-bright, the old way.',
  oiled: 'Oiled golden pine, new and proud.',
  white: 'Painted white with a green top strake, a Sunday boat.',
  red: 'Painted barn red inside and out.',
  blue: 'Pale chipped sky blue, repainted many summers.',
  grey: 'Bare wood gone silver-grey, nobody has touched it in years.',
} as const;
const FINISH: Record<keyof typeof FINISHES, { plank: string; top: string; inside: string }> = {
  tar: { plank: '#4a3020', top: '#3a2418', inside: '#5a3c28' },
  oiled: { plank: '#c2924e', top: '#a97a3c', inside: '#cfa15e' },
  white: { plank: '#eeeade', top: '#2f6b46', inside: '#c9b48a' },
  red: { plank: '#9c2f22', top: '#7a2119', inside: '#a23a2a' },
  blue: { plank: '#8fb2c4', top: '#f1ede0', inside: '#a9c2cc' },
  grey: { plank: '#9a968d', top: '#8a867d', inside: '#a39f96' },
};

export default defineThing({
  questions: {
    finish: choice('How is the boat finished?', FINISHES),
    rest: choice('Where does it lie?', {
      beach: 'Drawn half up a shingle beach, heeled on its bilge, stern still in the water.',
      ring: 'Afloat in the shallows, tied by its painter to an iron ring in a rock.',
      turned: 'Turned keel-up on trestles above the tide line, put away for winter.',
      adrift: 'Floating free on still water, the painter trailing: nobody tied it.',
    }),
    size: score('How big a boat is it?', ['A stubby one-person skiff', 'A two-thwart family boat', 'A long four-oared faering']),
    oars: choice('Where are the oars?', {
      shipped: 'Shipped: laid inside along the thwarts, blades aft.',
      out: 'Left out in the tholes, blades trailing, as if the rower just stepped ashore.',
      one: 'Only one oar remains.',
      none: 'No oars at all.',
    }),
    inside: choice('If it is upright, what has been left in the boat?', {
      empty: 'Nothing but a wooden bailer.',
      catch: 'A morning\'s catch: a few cod and a hand line on its frame.',
      net: 'A heap of net with cork floats.',
      morning: 'A thermos, a folded jacket and a fishing rod: someone\'s quiet morning.',
      rain: 'Rainwater to the thwarts and a few dead leaves; long neglected.',
      flowers: 'Soil and flowers: it has retired as a planter.',
    }),
    lantern: noul('Is a lit lantern standing in the boat or beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const L = mix(3.1, 5.8, a.size) * mix(0.95, 1.05, random());
    const B = L * mix(0.34, 0.27, a.size);
    const D = 0.26 + L * 0.045;
    const sheerRise = L * 0.085, rocker = L * 0.03;
    const strakes = a.size < 0.25 ? 3 : 4;
    const lap = 0.022;
    const tone = FINISH[a.finish];
    const boat = new THREE.Group();
    const upright = a.rest !== 'turned';

    const half = (u: number) => (B / 2) * (1 - Math.abs(u) ** 2.3) ** 0.72;
    const keelY = (u: number) => rocker * u * u + L * 0.035 * Math.abs(u) ** 5;
    const sheerY = (u: number) => D + sheerRise * Math.abs(u) ** 2.6;
    const profile = (u: number, t: number): [number, number] => {
      const k = keelY(u);
      return [half(u) * Math.sin(t * Math.PI / 2) ** 0.72, k + (sheerY(u) - k) * (0.25 * t + 0.75 * t ** 1.7)];
    };

    // Planking: one strip per strake per side, each stepped out over the one below.
    const N = 28;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const plankColour = new THREE.Color(tone.plank), topColour = new THREE.Color(tone.top);
    for (const side of [-1, 1])
      for (let k = 0; k < strakes; k++) {
        const base = positions.length / 3;
        const shade = (k === strakes - 1 ? topColour : plankColour).clone().offsetHSL(0, 0, (random() - 0.5) * 0.05 + (k % 2 ? 0.015 : -0.015));
        if (random() < wear * 0.5) shade.lerp(new THREE.Color('#8c887f'), 0.45);
        for (let i = 0; i <= N; i++) {
          const u = -1 + (2 * i) / N;
          const fade = clamp01(half(u) / (B / 2) * 3);
          const [x0, y0] = profile(u, k / strakes);
          const [x1, y1] = profile(u, (k + 1) / strakes);
          positions.push(side * (x0 + (k ? lap * fade : 0)), y0 - (k ? 0.02 * fade : 0), u * L / 2, side * x1, y1, u * L / 2);
          colours.push(shade.r, shade.g, shade.b, shade.r, shade.g, shade.b);
          if (i < N) {
            const p = base + i * 2;
            if (side > 0) index.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
            else index.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
          }
        }
      }
    const hullGeometry = new THREE.BufferGeometry();
    hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    hullGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    hullGeometry.setIndex(index);
    hullGeometry.computeVertexNormals();
    const hull = new THREE.Mesh(hullGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: a.finish === 'tar' || a.finish === 'oiled' ? 0.45 : 0.8 }));
    boat.add(hull);

    const wood = s.material(tone.inside, { roughness: 0.8 });
    const trim = s.material(tone.top, { roughness: 0.7 });
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D = boat) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const tubeOf = (points: [number, number, number][], radius: number, material: THREE.Material, parent: THREE.Object3D = boat) =>
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), points.length * 4, radius, 6), material), parent);
    const boxOf = (size: [number, number, number], at: [number, number, number], material: THREE.Material, parent: THREE.Object3D = boat) => {
      const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(...size), material), parent);
      mesh.position.set(...at);
      return mesh;
    };
    // Gunwales, keel and the two high stems.
    for (const side of [-1, 1]) tubeOf(Array.from({ length: 15 }, (_unused, i) => { const u = -1 + (2 * i) / 14; return [side * (half(u) + 0.008), sheerY(u) + 0.01, u * L / 2] as [number, number, number]; }), 0.024, trim);
    tubeOf(Array.from({ length: 9 }, (_unused, i) => { const u = -0.98 + (1.96 * i) / 8; return [0, keelY(u) - 0.03, u * L / 2] as [number, number, number]; }), 0.028, trim);
    for (const end of [-1, 1]) tubeOf([[0, keelY(0.9) - 0.03, end * L * 0.45], [0, keelY(1) + 0.02, end * L * 0.495], [0, sheerY(1) * 0.6, end * (L / 2 + 0.02)], [0, sheerY(1) + 0.16, end * (L / 2 + 0.05)]], 0.03, trim);
    // Ribs, thwarts, tholes and bottom boards.
    for (const u of strakes === 3 ? [-0.4, 0.4] : [-0.62, -0.2, 0.2, 0.62]) tubeOf([1, 0.75, 0.5, 0.25].map((t) => { const [x, y] = profile(u, t); return [-x + 0.02, y + 0.01, u * L / 2] as [number, number, number]; }).concat([[0, keelY(u) + 0.03, u * L / 2]], [0.25, 0.5, 0.75, 1].map((t) => { const [x, y] = profile(u, t); return [x - 0.02, y + 0.01, u * L / 2] as [number, number, number]; })), 0.02, wood);
    const thwarts = a.size < 0.25 ? [-0.3, 0.32] : a.size > 0.7 ? [-0.55, -0.12, 0.3, 0.68] : [-0.45, 0, 0.5];
    const seatY = D * 0.66;
    for (const u of thwarts) {
      const w = profile(u, 0.8)[0] * 2;
      boxOf([w, 0.03, 0.2], [0, Math.max(seatY, keelY(u) + 0.2), u * L / 2], wood);
    }
    const rowing = thwarts.slice(0, -1).filter((u) => Math.abs(u) < 0.5);
    for (const u of rowing) for (const side of [-1, 1]) boxOf([0.05, 0.1, 0.2], [side * (half(u + 0.09) + 0.005), sheerY(u + 0.09) + 0.06, (u + 0.09) * L / 2], trim).rotation.x = -0.2;
    boxOf([B * 0.34, 0.02, L * 0.5], [0, 0.085 + rocker * 0.1, 0], wood);

    // Oars.
    const oarWood = s.material('#c9ad7e', { roughness: 0.8 });
    const oarLength = Math.min(L * 0.62, 2.9);
    const oar = (parent: THREE.Object3D) => {
      const group = new THREE.Group();
      const shaft = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, oarLength, 7), oarWood), group);
      shaft.rotation.x = Math.PI / 2;
      const blade = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, oarLength * 0.3), oarWood), group);
      blade.position.z = -oarLength * 0.38;
      parent.add(group);
      return group;
    };
    const oarCount = a.oars === 'none' ? 0 : a.oars === 'one' ? 1 : 2;

    // Contents.
    let glow: THREE.Mesh | null = null;
    const lanternAt = (parent: THREE.Object3D, at: [number, number, number]) => {
      const dusk = clamp01(Math.abs(mood.daylight - 0.5) * 2);
      const dark = s.material('#22282b', { metalness: 0.4 });
      const group = new THREE.Group();
      group.position.set(...at);
      const base = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 8), dark), group);
      base.position.y = 0.02;
      glow = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.13, 8), s.material('#ffe2a0', { emissive: '#ffb347', emissiveIntensity: mix(1.5, 3.5, dusk) })), group);
      glow.position.y = 0.105;
      const cap = add(new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.06, 8), dark), group);
      cap.position.y = 0.2;
      const handle = add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 5, 12), dark), group);
      handle.position.y = 0.26;
      parent.add(group);
    };
    if (upright) {
      const floorY = 0.1 + rocker * 0.1;
      if (a.oars !== 'out') for (let i = 0; i < oarCount; i++) {
        const o = oar(boat);
        o.position.set((i ? 1 : -1) * B * 0.2, seatY + 0.045, -L * 0.03);
        o.rotation.y = (i ? -1 : 1) * 0.07 + (random() - 0.5) * 0.06;
      } else for (let i = 0; i < oarCount; i++) {
        const side = i ? 1 : -1, u = (rowing[0] ?? 0) + 0.09;
        const o = oar(boat);
        o.rotation.set(0.33, side * (Math.PI / 2 + 0.5 + random() * 0.4), 0, 'YXZ');
        o.position.set(side * (half(u) + oarLength * 0.2), sheerY(u) + 0.02, u * L / 2 - 0.25);
      }
      if (a.inside === 'empty' || a.inside === 'catch') {
        const bailer = boxOf([0.14, 0.07, 0.22], [B * 0.1, floorY + 0.04, -L * 0.28], oarWood);
        bailer.rotation.y = random() * 2;
      }
      if (a.inside === 'catch') {
        const fishMat = s.material('#aab3b2', { roughness: 0.3, metalness: 0.3 });
        const count = 2 + Math.round(mood.density * 5);
        for (let i = 0; i < count; i++) {
          const fish = add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), fishMat));
          fish.scale.set(0.05, 0.035, 0.24 + random() * 0.1);
          fish.position.set((random() - 0.5) * B * 0.28, floorY + 0.04 + i * 0.012, L * 0.14 + (random() - 0.5) * 0.3);
          fish.rotation.y = (random() - 0.5) * 1.4;
        }
        boxOf([0.2, 0.03, 0.28], [-B * 0.12, seatY + 0.04, thwarts[thwarts.length - 1] * L / 2], s.material('#7a5a3a'));
      } else if (a.inside === 'net') {
        const net = add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#3f6f66', roughness: 1, flatShading: true })));
        net.scale.set(B * 0.26, 0.2, L * 0.16);
        net.position.set(0, floorY + 0.12, L * 0.17);
        for (let i = 0; i < 9; i++) {
          const float = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), s.material(i % 2 ? '#e8742a' : '#d9c8a4')));
          float.position.set((random() - 0.5) * B * 0.4, floorY + 0.26 + random() * 0.08, L * 0.17 + (random() - 0.5) * L * 0.26);
        }
      } else if (a.inside === 'morning') {
        const z = thwarts[thwarts.length - 1] * L / 2, y = Math.max(seatY, keelY(thwarts[thwarts.length - 1]) + 0.2) + 0.02;
        const flask = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 10), s.material('#b3261e', { metalness: 0.4, roughness: 0.35 })));
        flask.position.set(-0.12, y + 0.13, z);
        const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.06, 10), s.material('#e9e7df')));
        cup.position.set(0.0, y + 0.03, z + 0.03);
        boxOf([0.3, 0.07, 0.24], [0.12, y + 0.04, thwarts[0] * L / 2], s.material('#d9a21c'));
        const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.014, L * 0.55, 6), s.material('#2b2b2b')));
        rod.rotation.x = Math.PI / 2 - 0.22;
        rod.position.set(B * 0.22, seatY + 0.2, -L * 0.05);
      } else if (a.inside === 'rain') {
        const pool = new THREE.Shape(Array.from({ length: 24 }, (_unused, i) => { const u = -0.8 + (1.6 * i) / 23; return new THREE.Vector2(profile(u, 0.58)[0], u * L / 2); }).concat(Array.from({ length: 24 }, (_unused, i) => { const u = 0.8 - (1.6 * i) / 23; return new THREE.Vector2(-profile(u, 0.58)[0], u * L / 2); })));
        const water = add(new THREE.Mesh(new THREE.ShapeGeometry(pool), new THREE.MeshStandardMaterial({ color: '#3d4f52', roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide })));
        water.rotation.x = Math.PI / 2;
        water.position.y = D * 0.55;
        for (let i = 0; i < 8; i++) boxOf([0.07, 0.004, 0.05], [(random() - 0.5) * B * 0.4, D * 0.55 + 0.004, (random() - 0.5) * L * 0.5], s.material(['#b9772a', '#8a5a22', '#c9a23a'][i % 3])).rotation.y = random() * 3;
      } else if (a.inside === 'flowers') {
        const soil = add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#3a2c22', roughness: 1 })));
        soil.scale.set(B * 0.36, D * 0.5, L * 0.36);
        soil.position.y = D * 0.42;
        const blooms: { at: [number, number, number]; size: number; color: string }[] = [];
        const petals = mood.cheer > 0.4 ? ['#e8412f', '#f2c230', '#f4f1e6', '#d95a9a', '#7a4fd0'] : ['#a9a27c', '#8f8a6a', '#c2b78f'];
        for (let i = 0; i < 40 + mood.density * 50; i++) {
          const u = (random() - 0.5) * 1.3, x = (random() - 0.5) * B * 0.6 * (1 - u * u * 0.6);
          blooms.push({ at: [x, D * 0.88 + random() * 0.22, u * L / 2 * 0.7], size: 0.05 + random() * 0.05, color: random() < 0.4 ? '#4f7a35' : petals[Math.floor(random() * petals.length)] });
        }
        const bloom = new THREE.IcosahedronGeometry(1, 0);
        const flowerMesh = new THREE.InstancedMesh(bloom, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), blooms.length);
        const m = new THREE.Matrix4();
        blooms.forEach((b, i) => { m.makeScale(b.size, b.size, b.size).setPosition(...b.at); flowerMesh.setMatrixAt(i, m); flowerMesh.setColorAt(i, new THREE.Color(b.color)); });
        flowerMesh.castShadow = true;
        boat.add(flowerMesh);
      }
      if (a.lantern) lanternAt(boat, [0, Math.max(seatY, keelY(thwarts[0]) + 0.2) + 0.015, thwarts[0] * L / 2]);
    }
    boat.traverse((node) => { node.castShadow = node.receiveShadow = true; });
    s.root.add(boat);

    // Where it lies.
    const stones = (count: number, spreadX: number, spreadZ: number, cz: number, yOf: (x: number, z: number) => number, big = 1) => {
      const pebbles: { at: [number, number, number]; size: number; color: string }[] = [];
      const greys = ['#8e8e89', '#a09f98', '#77797a', '#8a8378', '#b3aea2', '#6c6f6e'];
      for (let i = 0; i < count; i++) {
        const x = (random() - 0.5) * 2 * spreadX, z = cz + (random() - 0.5) * 2 * spreadZ;
        if ((x / spreadX) ** 2 + ((z - cz) / spreadZ) ** 2 > 1) continue;
        pebbles.push({ at: [x, yOf(x, z), z], size: (0.04 + random() * 0.07) * big, color: greys[Math.floor(random() * greys.length)] });
      }
      const pebble = new THREE.IcosahedronGeometry(1, 1);
      pebble.scale(1, 0.6, 1);
      s.scatter(pebble, new THREE.MeshStandardMaterial({ roughness: 0.9 }), pebbles);
    };
    const waterMat = s.material('#2b4854', { roughness: 0.2, metalness: 0.2 });
    const rope = s.material('#c8b98f', { roughness: 1 });
    let floats = false;
    if (a.rest === 'beach') {
      const padX = B * 0.85 + 0.45, padZ = L * 0.6;
      const slope = 0.07;
      const pad = s.cylinder(1, 1, 0.12, [0, 0, -L * 0.1], s.material('#9a968b', { roughness: 1 }), 28);
      pad.scale.set(padX, 1, padZ);
      const yOf = (_x: number, _z: number) => 0.07;
      stones(420, padX * 0.98, padZ * 0.98, -L * 0.1, yOf);
      stones(40, padX * 0.9, padZ * 0.9, -L * 0.1, yOf, 2.6);
      // The sea laps the lower end.
      const sea = s.cylinder(1, 1, 0.07, [0, -0.005, L * 0.24], waterMat, 28);
      sea.scale.set(padX * 1.25, 1, padZ * 0.8);
      const foam = s.ring(1, 0.035, [0, 0.035, -L * 0.1], s.material('#eef4f5'), Math.PI);
      foam.rotation.x = Math.PI / 2;
      foam.scale.set(padX * 1.03, padZ * 1.03, 0.6);
      const heel = mix(0.22, 0.34, random()) * (random() < 0.5 ? -1 : 1);
      boat.rotation.set(slope, Math.PI + (random() - 0.5) * 0.3, heel, 'YXZ');
      boat.position.set(0, B * 0.5 * Math.abs(Math.sin(heel)) * 0.55 + 0.1, -L * 0.04);
      for (const z of [-L * 0.3, -L * 0.02]) s.rod([-B * 0.7, yOf(0, z - L * 0.08) + 0.06, z - L * 0.08], [B * 0.7, yOf(0, z - L * 0.08) + 0.06, z - L * 0.08 + 0.1], 0.06, s.material('#6d5a48'));
      if (a.lantern && !glow) lanternAt(s.root, [B * 0.9, yOf(0, 0) + 0.03, 0]);
    } else if (a.rest === 'turned') {
      boat.rotation.z = Math.PI;
      boat.rotation.y = (random() - 0.5) * 0.2;
      boat.position.y = 0.62 + sheerY(1) + 0.16 - 0.25;
      const trestleWood = s.material('#8a7a66', { roughness: 1 });
      for (const z of [-L * 0.27, L * 0.27]) {
        const y = boat.position.y - D - 0.02;
        s.box([B * 1.15, 0.09, 0.12], [0, y, z], trestleWood);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.rod([sx * B * 0.62, 0, z + sz * 0.3], [sx * B * 0.45, y, z], 0.035, trestleWood);
      }
      const yOf = () => 0.02;
      s.cylinder(1, 1, 0.06, [0, -0.03, 0], s.material(mood.warmth < 0.25 ? '#eef2f4' : '#7c8a56', { roughness: 1 }), 24).scale.set(B * 0.9 + 0.5, 1, L * 0.6);
      stones(50, B * 0.85 + 0.4, L * 0.56, 0, yOf, 1.6);
      for (let i = 0; i < oarCount; i++) {
        const o = oar(s.root);
        o.position.set(B * 0.75 + i * 0.14, 0.06, (random() - 0.5) * 0.3);
        o.rotation.y = (random() - 0.5) * 0.12;
      }
      if (mood.warmth < 0.25) {
        const snow = s.ball([B * 0.3, 0.07, L * 0.36], [0, boat.position.y - keelY(0) + 0.0, 0], s.material('#f3f5f7'), 12);
        void snow;
      }
      if (a.lantern) lanternAt(s.root, [-B * 0.85, 0.02, L * 0.2]);
    } else {
      floats = true;
      const water = s.cylinder(1, 1, 0.06, [0, -0.03, 0], waterMat, 40);
      water.scale.set(B * 0.95 + 0.7, 1, L * 0.62 + 0.3);
      boat.position.y = -D * 0.3;
      boat.rotation.y = (random() - 0.5) * 0.5;
      if (a.rest === 'ring') {
        const rx = -B * 0.7 - 0.45, rz = L * 0.42;
        const rockGeometry = new THREE.IcosahedronGeometry(1, 1);
        const rock = s.mesh(rockGeometry, new THREE.MeshStandardMaterial({ color: '#7b7f80', roughness: 1, flatShading: true }), [rx, 0.1, rz]);
        rock.scale.set(0.75, 0.5, 0.6);
        rock.rotation.y = random() * 3;
        const ring = s.ring(0.09, 0.018, [rx + 0.35, 0.5, rz - 0.2], s.material('#5a3a26', { metalness: 0.4 }));
        ring.rotation.y = 0.8;
        const bow = new THREE.Vector3(0, sheerY(1) + 0.1, L / 2 + 0.03).applyEuler(boat.rotation).add(boat.position);
        s.tube([[bow.x, bow.y, bow.z], [(bow.x + rx) / 2, 0.12, (bow.z + rz) / 2 + 0.2], [rx + 0.38, 0.42, rz - 0.2]], 0.014, rope);
        for (let i = 0; i < 10; i++) s.ball([0.12, 0.05, 0.1], [rx + Math.cos(i * 0.7) * 0.72, 0.03, rz + Math.sin(i * 0.7) * 0.58], s.material('#5a5a22'), 6);
      } else {
        const bow = new THREE.Vector3(0, sheerY(1) + 0.1, L / 2 + 0.03).applyEuler(boat.rotation).add(boat.position);
        s.tube([[bow.x, bow.y, bow.z], [bow.x + 0.3, 0.03, bow.z + 0.5], [bow.x - 0.1, 0.012, bow.z + 1.0], [bow.x + 0.35, 0.012, bow.z + 1.35]], 0.012, rope);
      }
      // Ripples.
      for (let i = 1; i <= 2; i++) {
        const ripple = s.ring(1, 0.012, [boat.position.x, 0.008, 0], s.material('#5d7a85'));
        ripple.rotation.x = Math.PI / 2;
        ripple.scale.set(B * (0.56 + i * 0.14), L * (0.5 + i * 0.05), 1);
      }
    }

    const restY = boat.position.y, restZ = boat.rotation.z;
    const flicker = () => (glow!.material as THREE.MeshStandardMaterial);
    const lit = glow ? flicker().emissiveIntensity : 0;
    return s.finish({
      update: (_dt, time) => {
        if (floats) {
          boat.position.y = restY + Math.sin(time * 1.1) * 0.025 * mix(0.3, 2, mood.energy);
          boat.rotation.z = restZ + Math.sin(time * 0.8) * 0.04 * mix(0.3, 2, mood.energy);
        }
        if (glow) flicker().emissiveIntensity = lit * (0.85 + Math.sin(time * 11) * 0.08 + Math.sin(time * 23) * 0.06);
      },
    });
  },
});
