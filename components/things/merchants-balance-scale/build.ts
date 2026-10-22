import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    goods: choice('What is being weighed in the pan?', {
      gold: 'Gold coins, heaped and glinting.',
      silver: 'Clipped silver dirhams, a soldier\'s pay.',
      gems: 'A scatter of cut gems: ruby, emerald, sapphire.',
      musk: 'Dark pods of musk, worth more than the gold that buys them.',
      saffron: 'A small red heap of saffron threads.',
      pearls: 'A pool of pearls.',
      empty: 'Nothing: the pan waits empty.',
    }),
    verdict: choice('How does the balance sit?', {
      fair: 'Dead level, the pointer upright: an honest deal.',
      generous: 'The goods pan well down: the buyer is getting good measure.',
      short: 'The weights pan down: the goods fall short and someone is about to argue.',
      rigged: 'Tilted by a cheat: a lump of dark wax is stuck under one pan.',
    }),
    weights: choice('What are the weights?', {
      cups: 'A nest of turned brass cup weights, stacked like a little tower.',
      beasts: 'Cast bronze animal weights, ducks and lions in a row.',
      stones: 'Smooth river pebbles, scratched with marks, a poor trader\'s set.',
      glass: 'Stamped discs of green and amber glass.',
    }),
    stand: choice('What holds the beam up?', {
      column: 'A turned brass column on a little drawer box.',
      gallows: 'A dark wooden gallows frame, plain and sturdy.',
      tripod: 'Three iron rods lashed into a travelling tripod.',
    }),
    surface: choice('What is it set on?', {
      cloth: 'A square of red patterned cloth, the trader\'s whole shop.',
      board: 'A scarred wooden counter board.',
      tray: 'A wide round brass tray.',
      bare: 'Nothing.',
    }),
    beside: choice('What lies beside the scale?', {
      nothing: 'Nothing.',
      purse: 'A leather purse spilling coins.',
      ledger: 'An open ledger and a reed pen.',
      dagger: 'A dagger laid on the table, a quiet warning.',
      candle: 'A stub of candle in a dish, for trading after dark.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const patina = new THREE.Color('#6f9a82');
    const brassColour = new THREE.Color('#d9aa3c').lerp(patina, mood.wear * 0.45);
    const brass = new THREE.MeshStandardMaterial({ color: brassColour, metalness: 0.55, roughness: mix(0.25, 0.6, mood.wear), emissive: '#5a3d0c', emissiveIntensity: mix(0.2, 0.45, mood.cheer), side: THREE.DoubleSide });
    const gold = new THREE.MeshStandardMaterial({ color: '#f0c23a', metalness: 0.6, roughness: 0.25, emissive: '#7a5208', emissiveIntensity: 0.45 });
    const silver = new THREE.MeshStandardMaterial({ color: '#cfd3d6', metalness: 0.6, roughness: 0.3, emissive: '#3a4046', emissiveIntensity: 0.3 });
    const iron = s.material('#3a3632', { metalness: 0.5, roughness: 0.55 });
    const wood = s.material('#5c3d28');
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const lathe = (points: [number, number][], seg = 20) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    const rodIn = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) => {
      const d = to.clone().sub(from);
      const mesh = put(parent, new THREE.CylinderGeometry(radius, radius, d.length(), 6), material);
      mesh.position.copy(from).addScaledVector(d, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    /** A loose heap of many small pieces in one draw call. */
    const pile = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, count: number, spread: number, height: number, y: number, colours?: string[], flat = false) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, d = Math.sqrt(random()) * spread;
        q.setFromEuler(flat ? new THREE.Euler((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7) : new THREE.Euler(random() * 3, random() * 3, random() * 3));
        matrix.compose(new THREE.Vector3(Math.cos(angle) * d, y + (1 - d / spread) * height * random() ** 0.6, Math.sin(angle) * d), q, one);
        mesh.setMatrixAt(i, matrix);
        if (colours) mesh.setColorAt(i, new THREE.Color(colours[Math.floor(random() * colours.length)]));
      }
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const coinGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.004, 10);

    // Surface.
    const baseY = a.surface === 'bare' ? 0 : a.surface === 'board' ? 0.04 : 0.012;
    if (a.surface === 'cloth') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#8c2a26'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#e3cf9c'; ctx.lineWidth = 8; ctx.strokeRect(12, 12, 232, 232);
      ctx.strokeStyle = '#1f2a4a'; ctx.lineWidth = 5; ctx.strokeRect(26, 26, 204, 204);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? '#e3cf9c' : '#1f2a4a'; ctx.beginPath(); ctx.arc(56 + i * 48, 56 + j * 48, 9, 0, 7); ctx.fill(); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      s.box([0.84, 0.012, 0.62], [0, 0.006, 0.07], new THREE.MeshStandardMaterial({ map, roughness: 1 })).rotation.y = (random() - 0.5) * 0.1;
    } else if (a.surface === 'board') {
      s.box([0.88, 0.04, 0.56], [0, 0.02, 0.08], s.material('#7d5a3a'));
      for (let i = 0; i < 3; i++) s.box([0.88, 0.002, 0.004], [0, 0.041, -0.1 + i * 0.16], wood);
    } else if (a.surface === 'tray') {
      s.lathe([[0, 0], [0.44, 0], [0.47, 0.012], [0.46, 0.014], [0.43, 0.008], [0, 0.008]], brass, [0, 0, 0.05]);
    }

    // Stand.
    const pivotY = baseY + 0.58;
    if (a.stand === 'column') {
      s.box([0.34, 0.07, 0.2], [0, baseY + 0.035, 0], wood);
      s.box([0.2, 0.04, 0.005], [0, baseY + 0.035, 0.101], s.material('#7a5236'));
      s.ball([0.012, 0.012, 0.012], [0, baseY + 0.035, 0.108], brass, 8);
      s.lathe([[0.07, 0], [0.075, 0.012], [0.03, 0.03], [0.018, 0.06], [0.026, 0.1], [0.014, 0.14], [0.012, 0.4], [0.022, 0.43], [0.012, 0.46], [0.01, 0.56], [0.024, 0.585], [0.008, 0.61], [0, 0.63]], brass, [0, baseY + 0.07, 0]);
    } else if (a.stand === 'gallows') {
      s.box([0.62, 0.035, 0.2], [0, baseY + 0.0175, 0], wood);
      for (const x of [-0.29, 0.29]) s.box([0.035, 0.74, 0.04], [x, baseY + 0.39, 0], wood);
      s.box([0.66, 0.04, 0.05], [0, baseY + 0.76, 0], wood);
      s.rod([0, baseY + 0.74, 0], [0, pivotY + 0.02, 0], 0.004, iron);
    } else {
      const top: [number, number, number] = [0, baseY + 0.8, 0];
      for (let i = 0; i < 3; i++) { const angle = Math.PI / 2 + (i * Math.PI * 2) / 3; s.rod([Math.cos(angle) * 0.3, baseY, Math.sin(angle) * 0.26 - 0.03], [top[0] - Math.cos(angle) * 0.02, top[1] + 0.05, -Math.sin(angle) * 0.02], 0.009, iron); }
      s.ring(0.02, 0.008, [0, top[1] - 0.005, 0], s.material('#b89a62')).rotation.x = Math.PI / 2;
      s.rod([0, top[1], 0], [0, pivotY + 0.02, 0], 0.004, iron);
    }

    // Beam, pointer and pans.
    const arm = 0.27, drop = 0.3;
    const beam = new THREE.Group();
    beam.position.set(0, pivotY, 0.012);
    const bar = put(beam, new THREE.CylinderGeometry(0.011, 0.011, arm * 2, 8), brass);
    bar.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) put(beam, new THREE.SphereGeometry(0.014, 8, 6), brass, side * arm, 0, 0);
    put(beam, new THREE.ConeGeometry(0.008, 0.11, 6), iron, 0, 0.055, 0);
    put(beam, new THREE.SphereGeometry(0.018, 10, 8), brass);
    s.root.add(beam);
    if (a.stand !== 'column') { const gauge = s.ring(0.11, 0.004, [0, pivotY, 0.004], brass, Math.PI * 0.5); gauge.rotation.z = Math.PI * 0.25; }

    const pans = [-1, 1].map((side) => {
      const g = new THREE.Group();
      put(g, new THREE.TorusGeometry(0.012, 0.003, 5, 10), brass, 0, -0.012, 0);
      for (let i = 0; i < 3; i++) { const angle = (i / 3) * Math.PI * 2 + 0.5; rodIn(g, new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(Math.cos(angle) * 0.105, -drop + 0.022, Math.sin(angle) * 0.105), 0.0036, brass); }
      put(g, lathe([[0, 0], [0.05, 0.002], [0.09, 0.012], [0.108, 0.024], [0.112, 0.024]]), brass, 0, -drop, 0);
      s.root.add(g);
      return g;
    });
    const [goodsPan, weightPan] = pans;

    const count = Math.round(mix(10, 34, mood.density));
    const py = -drop + 0.006;
    if (a.goods === 'gold' || a.goods === 'silver') pile(goodsPan, coinGeo, a.goods === 'gold' ? gold : silver, count, 0.07, 0.045, py, undefined, true);
    else if (a.goods === 'gems') pile(goodsPan, new THREE.OctahedronGeometry(0.014, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 0.2, emissive: '#402030', emissiveIntensity: 0.5 }), Math.round(count * 0.6), 0.07, 0.02, py + 0.01, ['#d81e3c', '#1fa35c', '#2a55d8', '#e8b21e', '#8a3fd0']);
    else if (a.goods === 'musk') pile(goodsPan, new THREE.DodecahedronGeometry(0.024, 0), s.material('#3a2618'), Math.round(mix(4, 9, mood.density)), 0.055, 0.03, py + 0.018);
    else if (a.goods === 'saffron') put(goodsPan, lathe([[0.075, 0], [0.05, 0.03], [0.02, 0.055], [0, 0.062]], 12), new THREE.MeshStandardMaterial({ color: '#d2401a', roughness: 0.9, emissive: '#d2401a', emissiveIntensity: 0.2 }), 0, py, 0);
    else if (a.goods === 'pearls') pile(goodsPan, new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.2, emissive: '#8a8478', emissiveIntensity: 0.35 }), count, 0.07, 0.02, py + 0.008);

    // Weights: a few in the far pan, the rest of the set lined up on the table.
    const glassTints = ['#4f9a6a', '#c98a2e', '#6fb3a0'];
    const weight = (parent: THREE.Object3D, size: number, x: number, y: number, z: number, index: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      if (a.weights === 'cups') {
        put(g, lathe([[0, 0], [0.75 * size, 0], [size, size * 1.1], [0.9 * size, size * 1.1], [0.7 * size, size * 0.2]], 12), brass);
      } else if (a.weights === 'beasts') {
        const bronze = s.material('#8a6a3a', { metalness: 0.5, roughness: 0.45 });
        put(g, new THREE.SphereGeometry(size, 10, 8), bronze, 0, size * 0.7, 0).scale.set(1.3, 0.75, 0.85);
        put(g, new THREE.SphereGeometry(size * 0.42, 8, 6), bronze, size * 1.05, size * 1.35, 0);
        put(g, new THREE.ConeGeometry(size * 0.16, size * 0.5, 5), bronze, size * 1.5, size * 1.3, 0).rotation.z = -Math.PI / 2;
        put(g, new THREE.BoxGeometry(size * 2, size * 0.2, size * 1.3), bronze, 0, size * 0.1, 0);
        g.rotation.y = (random() - 0.5) * 0.6;
      } else if (a.weights === 'stones') {
        const pebble = put(g, new THREE.SphereGeometry(size, 10, 8), s.material(['#8f8a82', '#6f6a66', '#a89c8a'][index % 3], { roughness: 0.6 }), 0, size * 0.55, 0);
        pebble.scale.set(1.2 + random() * 0.3, 0.55, 0.9 + random() * 0.3);
        pebble.rotation.y = random() * 3;
      } else {
        put(g, new THREE.CylinderGeometry(size * 1.1, size * 1.1, size * 0.45, 14), new THREE.MeshStandardMaterial({ color: glassTints[index % 3], roughness: 0.15, emissive: glassTints[index % 3], emissiveIntensity: 0.3 }), 0, size * 0.225, 0);
      }
      parent.add(g);
      return g;
    };
    const stackable = a.weights === 'cups' || a.weights === 'glass';
    const inPan = a.goods === 'empty' ? 0 : 2 + Math.floor(random() * 2);
    let lift = py;
    for (let i = 0; i < inPan; i++) {
      const size = 0.04 - i * 0.008;
      if (stackable) { weight(weightPan, size, (random() - 0.5) * 0.01, lift, 0, i); lift += a.weights === 'cups' ? size * 1.02 : size * 0.45; }
      else weight(weightPan, size * 0.85, (i - (inPan - 1) / 2) * 0.062, py, (random() - 0.5) * 0.04, i);
    }
    const spare = Math.round(mix(3, 6, mood.density));
    for (let i = 0; i < spare; i++) weight(s.root, 0.046 - i * 0.0055, 0.2 + i * 0.075 - (spare - 1) * 0.02, baseY, 0.26 + (random() - 0.5) * 0.03 + i * 0.008, i + 1);

    if (a.verdict === 'rigged') put(weightPan, new THREE.SphereGeometry(0.03, 10, 8), s.material('#2a1f1a', { roughness: 0.4 }), 0.03, -drop - 0.012, 0.02).scale.set(1.2, 0.6, 1);

    // Beside.
    const bx = -0.28, bz = 0.27;
    if (a.beside === 'purse') {
      const hide = s.material('#6b4630', { roughness: 0.75 });
      s.ball([0.075, 0.055, 0.065], [bx, baseY + 0.05, bz], hide, 12);
      s.cylinder(0.035, 0.02, 0.04, [bx + 0.06, baseY + 0.075, bz + 0.01], hide, 10).rotation.z = -1.1;
      const spill = pile(s.root, coinGeo, a.goods === 'silver' ? silver : gold, 9, 0.07, 0.006, baseY + 0.003, undefined, true);
      spill.position.set(bx + 0.16, 0, bz + 0.02);
    } else if (a.beside === 'ledger') {
      for (const side of [-1, 1]) { const page = s.box([0.13, 0.012, 0.19], [bx + side * 0.066, baseY + 0.012, bz - 0.02], s.material('#efe6cc')); page.rotation.z = side * -0.08; for (let i = 0; i < 6; i++) s.box([0.09, 0.001, 0.004], [bx + side * 0.066, baseY + 0.02, bz - 0.09 + i * 0.026], s.material('#3a2e26')).rotation.z = side * -0.08; }
      s.box([0.28, 0.008, 0.2], [bx, baseY + 0.004, bz - 0.02], s.material('#5a2a22'));
      s.rod([bx + 0.17, baseY + 0.006, bz + 0.06], [bx + 0.26, baseY + 0.012, bz - 0.08], 0.004, s.material('#c9a86a'));
    } else if (a.beside === 'dagger') {
      const blade = s.box([0.2, 0.004, 0.026], [bx + 0.06, baseY + 0.006, bz], silver);
      blade.rotation.y = 0.35;
      s.box([0.012, 0.012, 0.07], [bx - 0.035, baseY + 0.008, bz + 0.035], brass).rotation.y = 0.35;
      s.rod([bx - 0.04, baseY + 0.01, bz + 0.037], [bx - 0.125, baseY + 0.01, bz + 0.068], 0.011, s.material('#2a1c18'));
      s.ball([0.016, 0.016, 0.016], [bx - 0.133, baseY + 0.01, bz + 0.071], brass, 8);
    } else if (a.beside === 'candle') {
      s.lathe([[0, 0], [0.04, 0], [0.06, 0.012], [0.058, 0.016], [0.03, 0.008]], brass, [bx, baseY, bz]);
      const h = mix(0.09, 0.03, mood.wear);
      s.cylinder(0.014, 0.017, h, [bx, baseY + 0.008 + h / 2, bz], s.material('#efe3c2'), 10);
      s.ball([0.008, 0.018, 0.008], [bx, baseY + 0.03 + h, bz], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb030', emissiveIntensity: 2 }), 8);
    }

    const rest = { fair: 0, generous: 0.2, short: -0.2, rigged: -0.13 }[a.verdict] + (random() - 0.5) * 0.02;
    const pose = (tilt: number) => {
      beam.rotation.z = tilt;
      goodsPan.position.set(-Math.cos(tilt) * arm, pivotY - Math.sin(tilt) * arm, 0.012);
      weightPan.position.set(Math.cos(tilt) * arm, pivotY + Math.sin(tilt) * arm, 0.012);
    };
    pose(rest);
    const rock = mix(0.004, 0.05, mood.energy), phase = random() * 6;
    return s.finish({ update: (_dt, time) => pose(rest + Math.sin(time * 2.2 + phase) * rock) });
  },
});
